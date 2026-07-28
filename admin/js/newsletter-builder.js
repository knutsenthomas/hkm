function escapeHtml(str) {
    if (!str && str !== 0) return '';
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

const HKD_STORE_ORIGIN = 'https://www.hiskingdomdesigns.no';

function resolveHkdProductUrl(product = {}) {
    const productId = String(product.id || product._id || product.productId || '').trim();
    if (productId) {
        return `${HKD_STORE_ORIGIN}/produkt/${encodeURIComponent(productId)}`;
    }

    const urlCandidates = [
        product.productUrl,
        product.productPageUrl,
        product.url,
        product.href
    ].filter(Boolean);

    for (const candidate of urlCandidates) {
        try {
            const parsed = new URL(candidate, HKD_STORE_ORIGIN);
            const hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');
            const isStoreDomain = hostname === 'hiskingdomdesigns.no';
            const isCurrentProductRoute = /^\/(?:produkt|product|producto)\/[^/]+\/?$/i.test(parsed.pathname);
            if (isStoreDomain && isCurrentProductRoute) {
                return `${HKD_STORE_ORIGIN}${parsed.pathname}${parsed.search}${parsed.hash}`;
            }
        } catch (error) {
            console.warn('Ugyldig produktlenke ignorert:', candidate, error);
        }
    }

    return `${HKD_STORE_ORIGIN}/produkter`;
}

if (typeof window !== 'undefined') {
    window.escapeHtml = escapeHtml;
}

class NewsletterBuilder {
    escapeHtml(str) {
        return escapeHtml(str);
    }

    constructor() {
        this.blocks = [];
        this.currentView = 'desktop';
        this.activeTab = 'add';
        this.activeTheme = 'default';
        this.pendingDeleteCard = null;
        this.themes = {
            default: {
                name: 'Default',
                outerBg: '#f8fafc',
                innerBg: '#ffffff',
                font: "'Inter', sans-serif",
                accent: '#3b82f6'
            },
            light: {
                name: 'Light',
                outerBg: '#ffffff',
                innerBg: '#f8fafc',
                font: "'Inter', sans-serif",
                accent: '#0f172a'
            },
            earthy: {
                name: 'Earthy',
                outerBg: '#e9edc9',
                innerBg: '#fefae0',
                font: "'Georgia', serif",
                accent: '#606c38'
            },
            cherry: {
                name: 'Cherry',
                outerBg: '#fff5f5',
                innerBg: '#ffffff',
                font: "'Playfair Display', serif",
                accent: '#9b2c2c'
            },
            umber: {
                name: 'Umber',
                outerBg: '#3e2723',
                innerBg: '#5d4037',
                font: "'Roboto', sans-serif",
                accent: '#d7ccc8'
            }
        };
        this.backgrounds = {
            outer: { color: '#f8fafc', pattern: 'none' },
            inner: { color: '#ffffff' }
        };
        this.isRecipientsDrawerOpen = false;
        this.activeImageBlockId = null;
        this.activeColumnIndex = null;
        this.savedRange = null;
        this.activeBlockNode = null;
        this.canvasZoom = 100;

        // Recipient Selection State
        this.selectedSegments = new Set();
        this.selectedLabels = new Set();
        this.selectedUserEmails = new Set();
        this.totalUsers = 0;
        this.subscribersCount = 0;

        this.currentMode = 'dashboard';
        this.init();
        this.setupDashboardEvents();
    }

    async safeGet(query, timeoutMs = 8000) {
        let timerId;
        const timeoutToken = Symbol('timeout');
        try {
            const result = await Promise.race([
                query.get(),
                new Promise((resolve) => {
                    timerId = setTimeout(() => resolve(timeoutToken), timeoutMs);
                })
            ]);
            if (result === timeoutToken) {
                throw new Error("Firestore-forespørsel tidsavbrutt etter " + timeoutMs + "ms");
            }
            return result;
        } finally {
            if (timerId) clearTimeout(timerId);
        }
    }

    switchTab(tab) {
        if (tab === 'rtl') {
            // Special Toggle: RTL direction
            const canvas = document.getElementById('newsletter-canvas');
            if (canvas) {
                const isRtl = canvas.getAttribute('dir') === 'rtl';
                canvas.setAttribute('dir', isRtl ? 'ltr' : 'rtl');
                if (typeof showToast === 'function') {
                    showToast(isRtl ? "Retning satt til Venstre-til-Høyre (LTR)" : "Retning satt til Høyre-til-Venstre (RTL)", "info");
                }
            }
            return;
        }

        this.activeTab = tab;
        
        // Update vertical rail items styles
        document.querySelectorAll('.rail-item').forEach(btn => {
            const isTarget = btn.id === `rail-btn-${tab}`;
            btn.classList.toggle('active', isTarget);
            
            const isAddBtn = btn.id === 'rail-btn-add';
            
            if (isAddBtn) {
                // Legg til button is ALWAYS round, orange with a white plus sign
                btn.style.color = isTarget ? '#d17d39' : '#475569';
                btn.style.fontWeight = isTarget ? '600' : '500';
                
                const circle = btn.querySelector('.rail-item-circle');
                if (circle) {
                    circle.style.background = 'linear-gradient(135deg, #d17d39, #bd4f2a)';
                    circle.style.border = isTarget ? '2px solid #bd4f2a' : 'none';
                    circle.style.boxShadow = isTarget ? '0 0 0 3px rgba(209, 125, 57, 0.3)' : 'none';
                    const icon = circle.querySelector('.material-symbols-outlined');
                    if (icon) {
                        icon.style.color = '#ffffff';
                    }
                }
            } else {
                // Highlight text color
                btn.style.color = isTarget ? '#1b4965' : '#475569'; // HKM Brand Blue #1B4965
                btn.style.fontWeight = isTarget ? '600' : '500';
                
                // Circle container styles
                const circle = btn.querySelector('.rail-item-circle');
                if (circle) {
                    circle.style.background = isTarget ? '#e0f2fe' : 'transparent';
                    circle.style.border = isTarget ? '2px solid #1b4965' : 'none';
                    circle.style.boxShadow = 'none';
                    const icon = circle.querySelector('.material-symbols-outlined');
                    if (icon) {
                        icon.style.color = isTarget ? '#1b4965' : 'inherit';
                    }
                }
            }
        });

        // Hide/Show tab panels
        document.querySelectorAll('.rail-tab-panel').forEach(pane => {
            pane.style.display = pane.id === `rail-tab-${tab}` ? 'block' : 'none';
        });

        // Update Title Header
        const titleEl = document.getElementById('builder-sidebar-title');
        if (titleEl) {
            if (tab === 'add') titleEl.innerText = 'Legge til elementer';
            else if (tab === 'themes') titleEl.innerText = 'Temaer';
            else if (tab === 'background') titleEl.innerText = 'Bakgrunn';
            else if (tab === 'ai') titleEl.innerText = 'Magisk AI Verktøy';
            else if (tab === 'help') titleEl.innerText = 'Hjelp og verktøy';
        }
    }

    updateBackground(type, key, value) {
        this.backgrounds[type][key] = value;
        this.applyBackgrounds();
    }

    applyBackgrounds() {
        const workspace = document.getElementById('canvas-container');
        const inner = document.getElementById('newsletter-canvas');
        if (!workspace || !inner) return;

        // Outer
        const outer = this.backgrounds.outer;
        workspace.style.backgroundColor = outer.color;
        if (outer.pattern === 'dots') {
            workspace.style.backgroundImage = 'radial-gradient(#cbd5e1 1px, transparent 1px)';
            workspace.style.backgroundSize = '10px 10px';
        } else if (outer.pattern === 'lines') {
            workspace.style.backgroundImage = 'repeating-linear-gradient(45deg, rgba(0,0,0,0.02), rgba(0,0,0,0.02) 10px, transparent 10px, transparent 11px)';
            workspace.style.backgroundSize = 'auto';
        } else if (outer.pattern === 'gradient') {
            workspace.style.backgroundImage = `radial-gradient(circle, transparent 20%, rgba(0,0,0,0.05) 100%)`;
            workspace.style.backgroundSize = 'auto';
        } else {
            workspace.style.backgroundImage = 'none';
        }

        // Inner
        inner.style.backgroundColor = this.backgrounds.inner.color;
    }


    setTheme(themeKey) {
        const theme = this.themes[themeKey];
        if (!theme) return;
        this.activeTheme = themeKey;

        // Update Backgrounds
        this.backgrounds.outer.color = theme.outerBg;
        this.backgrounds.inner.color = theme.innerBg;
        this.applyBackgrounds();

        // Update Fonts on Canvas
        const canvas = document.getElementById('newsletter-canvas');
        if (canvas) {
            canvas.style.fontFamily = theme.font;
        }

        // Update Palette UI (remove actives since we are using a preset)
        document.querySelectorAll('.color-swatch, .pattern-item').forEach(el => el.classList.remove('active'));

        console.log(`Theme set to: ${theme.name}`);
    }

    async init() {
        console.log("Nyhetsbrevbygger Initializing...");

        const urlParams = new URLSearchParams(window.location.search);
        const urlDraftId = urlParams.get('draftId');

        // Only open editor mode if draftId is explicitly present in URL (e.g. ?draftId=xxx or ?draftId=new)
        if (urlDraftId) {
            this.toggleMode('builder');
            let savedView = 'builder';
            try {
                savedView = localStorage.getItem('hkm_builder_active_view') || 'builder';
            } catch(e) {}
            if (savedView) {
                this.switchSidebarView(savedView);
            }
        } else {
            this.toggleMode('dashboard');
        }

        // Wait for Firebase to be ready with a small retry loop
        const waitForFirebase = setInterval(() => {
            if (window.firebaseService && window.firebaseService.isInitialized) {
                clearInterval(waitForFirebase);
                this.startAuthListener();
            }
        }, 100);

        this.setupEventListeners();
        this.setupRichTextToolbar();
        this.setupCanvasControls();
        this.setupThemePanelEvents();
        this.setupBubbleMenu();
        this.applyBackgrounds();
        this.renderCanvas();
    }

    isMobileViewport() {
        return window.matchMedia('(max-width: 991px)').matches;
    }

    toggleMobileElementsDrawer() {
        const elementsPanel = document.getElementById('elements-panel');
        const backdrop = document.getElementById('mobile-elements-backdrop');
        if (!elementsPanel) return;

        const isOpen = elementsPanel.classList.contains('mobile-drawer-open');
        this.closeMobileDrawers();

        if (!isOpen) {
            elementsPanel.classList.add('mobile-drawer-open');
            if (backdrop) backdrop.classList.add('active');
        }
    }

    openMobilePropertiesDrawer() {
        if (!this.isMobileViewport()) return;
        const propsPanel = document.querySelector('.builder-properties-panel');
        const backdrop = document.getElementById('mobile-elements-backdrop');
        if (!propsPanel) return;

        this.closeMobileDrawers();
        propsPanel.classList.add('mobile-drawer-open');
        if (backdrop) backdrop.classList.add('active');
    }

    closeMobileDrawers() {
        const elementsPanel = document.getElementById('elements-panel');
        const propsPanel = document.querySelector('.builder-properties-panel');
        const backdrop = document.getElementById('mobile-elements-backdrop');

        if (elementsPanel) elementsPanel.classList.remove('mobile-drawer-open');
        if (propsPanel) propsPanel.classList.remove('mobile-drawer-open');
        if (backdrop) backdrop.classList.remove('active');
    }

    openToolsPanel(tab = null) {
        if (!this.isMobileViewport()) return;
        if (tab) this.switchTab(tab);
        document.body.classList.remove('builder-tools-menu-open');
        document.body.classList.add('builder-tools-panel-open');
    }

    closeToolsUi() {
        document.body.classList.remove('builder-tools-menu-open');
        document.body.classList.remove('builder-tools-panel-open');
        const fabBtn = document.getElementById('builder-tools-fab');
        if (fabBtn) fabBtn.classList.remove('active');
    }

    setupToolsFab() {
        const fabBtn = document.getElementById('builder-tools-fab');
        const menu = document.getElementById('builder-tools-menu');
        const backdrop = document.getElementById('builder-tools-backdrop');

        if (!fabBtn || !menu || !backdrop) return;

        fabBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent accidental closures

            if (document.body.classList.contains('builder-tools-panel-open')) {
                this.closeToolsUi();
                return;
            }

            const isOpen = document.body.classList.toggle('builder-tools-menu-open');
            fabBtn.classList.toggle('active', isOpen);
            console.log("Newsletter FAB Toggle:", isOpen);
        });

        menu.querySelectorAll('[data-tool-type]').forEach(btn => {
            btn.addEventListener('click', () => {
                const type = btn.dataset.toolType;
                this.addBlock(type);
                this.closeToolsUi();
            });
        });

        backdrop.addEventListener('click', () => this.closeToolsUi());

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeToolsUi();
        });

        window.addEventListener('resize', () => {
            if (!this.isMobileViewport()) {
                this.closeToolsUi();
                document.body.classList.remove('builder-recipients-open');
            }
        });
    }

    startAuthListener() {
        window.firebaseService.onAuthChange(async (user) => {
            if (!user) {
                window.location.href = '/admin/login.html';
            } else {
                console.log("[newsletter-builder] User is authenticated. Loading data...");
                await this.loadTemplates();
                await this.loadDrafts();
                this.loadAiSuggestions();
                this.loadDashboardData();

                // Check URL for active draft
                const urlParams = new URLSearchParams(window.location.search);
                const urlDraftId = urlParams.get('draftId');
                if (urlDraftId) {
                    await this.loadDraftFromUrl(urlDraftId);
                }
            }
        });
    }

    async loadDraftFromUrl(draftId) {
        if (draftId === 'new') {
            this.blocks = [];
            this.currentDraftId = null;
            this.currentDraftName = null;
            const subjectInput = document.getElementById('newsletter-subject');
            if (subjectInput) subjectInput.value = '';
            this.toggleMode('builder');
            this.renderCanvas();
            return;
        }

        try {
            const doc = await window.firebaseService.db.collection('newsletter_templates').doc(draftId).get();
            if (doc.exists) {
                const data = doc.data();
                this.currentDraftId = doc.id;
                this.currentDraftName = data.name || 'Uten navn';
                this.hasCustomDraftName = true;
                this.blocks = typeof data.blocks === 'string' ? JSON.parse(data.blocks) : (data.blocks || []);
                const subjectInput = document.getElementById('newsletter-subject');
                if (subjectInput) subjectInput.value = data.subject || '';
                
                if (data.headerHtml) {
                    try {
                        localStorage.setItem('hkm_builder_autosave_header_html', data.headerHtml);
                    } catch(e) {}
                }
                
                this.toggleMode('builder');
                this.renderCanvas();
                showToast(`Kladden "${this.currentDraftName}" ble gjenopprettet.`, "info");
            } else {
                showToast("Fant ikke den angitte kladden.", "error");
                const url = new URL(window.location.href);
                url.searchParams.delete('draftId');
                window.history.replaceState({}, '', url.toString());
            }
        } catch (e) {
            console.error("Gjenoppretting av kladd feilet:", e);
        }
    }

    setupEventListeners() {
        this.setupToolsFab();

        // Left Dark Sidebar Nav Item Click Handlers
        document.querySelectorAll('.sidebar-nav-menu .nav-item, .sidebar-bottom-settings .nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const view = item.dataset.view;
                if (view) {
                    e.preventDefault();
                    this.switchSidebarView(view);
                }
            });
        });

        // Selection listener for Notion-style bubble
        document.addEventListener('selectionchange', () => {
            this.handleTextSelection();
        });

        // Sidebar Tab Switching
        document.querySelectorAll('.rail-item').forEach(btn => {
            btn.addEventListener('click', () => {
                const tab = btn.dataset.tab;
                this.switchTab(tab);
                if (this.isMobileViewport()) {
                    this.openToolsPanel(tab);
                }
            });
        });

        // Theme Selection
        document.querySelectorAll('.theme-item').forEach(item => {
            item.addEventListener('click', () => {
                const themeKey = item.dataset.theme;
                this.setTheme(themeKey);

                document.querySelectorAll('.theme-item').forEach(t => t.classList.remove('active'));
                item.classList.add('active');
            });
        });

        this.isDragging = false;
        this.hoverPreviewTimeout = null;

        // Block Tool Clicks, Drag and Drop, & Hover Previews Setup
        document.querySelectorAll('.element-card, .block-card-item').forEach(btn => {
            const canDrag = !this.isMobileViewport() && window.matchMedia('(pointer: fine)').matches;
            btn.setAttribute('draggable', String(canDrag));
            btn.addEventListener('dragstart', (e) => {
                if (!canDrag) {
                    e.preventDefault();
                    return;
                }
                this.isDragging = true;
                e.dataTransfer.setData('hkm-block-type', btn.dataset.type);
                btn.style.opacity = '0.5';
                this.hideElementHoverPreview();
            });
            btn.addEventListener('dragend', () => {
                this.isDragging = false;
                btn.style.opacity = '';
                this.hideElementHoverPreview();
            });
            btn.addEventListener('mousedown', () => {
                this.saveSelection();
            });
            btn.onclick = (e) => this.handleElementCardActivation(e, btn);
        });

        // Global listeners to clean up sticky hover previews in all edge cases
        window.addEventListener('scroll', () => this.hideElementHoverPreview(), { passive: true });
        document.addEventListener('dragstart', () => {
            this.isDragging = true;
            this.hideElementHoverPreview();
        });
        document.addEventListener('dragend', () => {
            this.isDragging = false;
            this.hideElementHoverPreview();
        });
        // Accordion headers toggle
        document.querySelectorAll('.accordion-header-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const target = btn.dataset.accordion;
                const content = document.getElementById(`accordion-${target}`);
                const arrow = btn.querySelector('.accordion-arrow');
                if (content) {
                    const isOpen = content.style.display !== 'none';
                    content.style.display = isOpen ? 'none' : 'block';
                    if (arrow) arrow.textContent = isOpen ? 'expand_more' : 'expand_less';
                }
            });
        });

        // Search input filter for elements
        const searchInput = document.getElementById('elements-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const query = e.target.value.toLowerCase().trim();
                document.querySelectorAll('.block-card-item').forEach(card => {
                    const label = card.textContent.toLowerCase();
                    card.style.display = label.includes(query) ? 'flex' : 'none';
                });
            });
        }
              // Close Properties Inspector Panel
        const closePropBtn = document.getElementById('close-properties-btn');
        if (closePropBtn) {
            closePropBtn.addEventListener('click', () => {
                const panel = document.querySelector('.builder-properties-panel');
                if (panel) panel.style.display = 'none';
            });
        }

        // Publish Dropdown Toggle & Options
        const publishDropdownBtn = document.getElementById('publish-dropdown-btn');
        const publishDropdownMenu = document.getElementById('publish-options-dropdown');

        if (publishDropdownBtn && publishDropdownMenu) {
            publishDropdownBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const isHidden = publishDropdownMenu.style.display === 'none' || window.getComputedStyle(publishDropdownMenu).display === 'none';
                if (isHidden) {
                    publishDropdownMenu.style.setProperty('display', 'flex', 'important');
                } else {
                    publishDropdownMenu.style.setProperty('display', 'none', 'important');
                }
            });

            document.addEventListener('click', (e) => {
                if (!e.target.closest('.btn-group-publish')) {
                    publishDropdownMenu.style.setProperty('display', 'none', 'important');
                }
            });

            document.getElementById('opt-send-now')?.addEventListener('click', () => {
                publishDropdownMenu.style.setProperty('display', 'none', 'important');
                this.toggleRecipientsDrawer();
            });

            document.getElementById('opt-schedule-send')?.addEventListener('click', () => {
                publishDropdownMenu.style.setProperty('display', 'none', 'important');
                this.showPromptModal(
                    "Velg dato og klokkeslett for automatisk utsendelse:",
                    "f.eks. 2026-08-01 kl. 10:00",
                    (datetime) => {
                        if (typeof showToast === 'function') showToast(`Kampanjen er planlagt for utsending: ${datetime}`, "success");
                    },
                    "2026-08-01 kl. 10:00",
                    "Vennligst oppgi et tidspunkt.",
                    "Planlegg utsendelse",
                    "Lagre planlegging"
                );
            });

            document.getElementById('opt-send-test')?.addEventListener('click', () => {
                publishDropdownMenu.style.setProperty('display', 'none', 'important');
                this.sendTestEmail();
            });

            document.getElementById('opt-export-html')?.addEventListener('click', () => {
                publishDropdownMenu.style.setProperty('display', 'none', 'important');
                this.exportHtmlFile();
            });
        }

        // Alignment Buttons Handler
        document.querySelectorAll('.align-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.align-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const align = btn.dataset.align;
                if (this.selectedBlock) {
                    this.selectedBlock.style.textAlign = align;
                }
                document.execCommand(`justify${align.charAt(0).toUpperCase() + align.slice(1)}`, false, null);
            });
        });

        // Color Swatch & Hex Input Sync
        const colorPicker = document.getElementById('prop-color-picker');
        const colorHex = document.getElementById('prop-color-hex');
        if (colorPicker && colorHex) {
            colorPicker.addEventListener('input', (e) => {
                colorHex.value = e.target.value;
                if (this.selectedBlock) {
                    this.selectedBlock.style.color = e.target.value;
                }
                document.execCommand('foreColor', false, e.target.value);
            });
            colorHex.addEventListener('input', (e) => {
                colorPicker.value = e.target.value;
                if (this.selectedBlock) {
                    this.selectedBlock.style.color = e.target.value;
                }
            });
        }

        // Font Size Input Stepper
        const fontSizeInput = document.getElementById('prop-font-size-input');
        if (fontSizeInput) {
            fontSizeInput.addEventListener('change', (e) => {
                const size = e.target.value + 'px';
                if (this.selectedBlock) {
                    this.selectedBlock.style.fontSize = size;
                }
            });
        }

        // Unified Editor Reactivity & Drop Zone
        const container = document.getElementById('blocks-container');
        if (container) {
            container.addEventListener('input', () => this.syncUnifiedBlocks());
            container.addEventListener('blur', () => this.syncUnifiedBlocks());
            container.addEventListener('keyup', (e) => {
                if (e.key === 'Enter') {
                    this.syncUnifiedBlocks();
                }
            });
            container.addEventListener('paste', (e) => {
                e.preventDefault();
                let pastedHtml = e.clipboardData ? e.clipboardData.getData('text/html') : '';
                let pastedText = e.clipboardData ? e.clipboardData.getData('text/plain') : '';

                const cleanHtml = this.sanitizePastedHtml(pastedHtml, pastedText);
                if (cleanHtml) {
                    document.execCommand('insertHTML', false, cleanHtml);
                } else if (pastedText) {
                    document.execCommand('insertText', false, pastedText);
                }
                this.cleanPastedFormatting();
                this.syncUnifiedBlocks();
            });
            container.addEventListener('click', (e) => {
                // Determine active block clicked (Wix-style property panel selector)
                const blockNode = this.getCurrentBlock(e.target);
                if (blockNode) {
                    this.selectBlock(blockNode);
                }

                const img = e.target.closest('img');
                if (img) {
                    e.preventDefault();
                    e.stopPropagation();
                    this.activateImageResizer(img);
                    return;
                }
                const btn = e.target.closest('.block-btn, .product-cta-btn, .newsletter-btn, .btn, a[href], button');
                if (btn && !btn.classList.contains('card-delete-btn') && !btn.classList.contains('inspector-style-btn') && !btn.classList.contains('mobile-nav-toggle')) {
                    btn.setAttribute('contenteditable', 'true');
                    this.activateButtonManager(btn);
                    const blockNode = btn.closest('.builder-block') || btn.closest('.newsletter-product-card') || btn.closest('.newsletter-event-card') || btn;
                    if (blockNode) {
                        this.selectBlock(blockNode);
                    }
                    return;
                }
                const deleteBtn = e.target.closest('.card-delete-btn');
                if (deleteBtn) {
                    e.preventDefault();
                    e.stopPropagation();
                    const card = deleteBtn.closest('.newsletter-product-card, .newsletter-event-card');
                    if (card) {
                        card.remove();
                        this.syncUnifiedBlocks();
                        this.triggerAutosave();
                        showToast("Elementet ble slettet.", "success");
                    }
                    return;
                }

                const headerBlock = e.target.closest('.canvas-header');
                if (headerBlock) {
                    const textNode = e.target.closest('.canvas-brand-name, .canvas-brand-issue');
                    if (textNode) {
                        this.selectedBlock = textNode;
                        this.showTextInspector(textNode);
                    } else {
                        this.showHeaderInspector();
                    }
                }
            });

            // Wix-style deselect listener when clicking outside
            document.addEventListener('click', (e) => {
                const container = document.getElementById('blocks-container');
                const sidebar = document.querySelector('.builder-elements-sidebar-v2');
                const modal = document.querySelector('.hkm-modal, .hkm-prompt-overlay, .hkm-image-modal, #custom-prompt-modal');
                
                if (container && !container.contains(e.target) && 
                    !e.target.closest('.canvas-header') &&
                    !e.target.closest('.builder-properties-panel') &&
                    sidebar && !sidebar.contains(e.target) && 
                    (!modal || !modal.contains(e.target)) &&
                    !e.target.closest('.cropper-container') &&
                    !e.target.closest('.img-resizer-overlay')) {
                    this.deselectBlock();
                }
            });

            // Wix-style selection change listener to auto-detect text editing/caret placement
            document.addEventListener('selectionchange', () => {
                const selection = window.getSelection();
                if (!selection || !selection.rangeCount) return;
                const anchorNode = selection.anchorNode;
                if (!anchorNode) return;

                const container = document.getElementById('blocks-container');
                const header = document.querySelector('.canvas-header');

                if (header && header.contains(anchorNode)) {
                    let targetEl = anchorNode.nodeType === Node.TEXT_NODE ? anchorNode.parentElement : anchorNode;
                    const textNode = targetEl ? targetEl.closest('.canvas-brand-name, .canvas-brand-issue') : null;
                    if (textNode) {
                        this.selectedBlock = textNode;
                        this.showTextInspector(textNode);
                    } else {
                        this.showHeaderInspector();
                    }
                } else if (container && container.contains(anchorNode)) {
                    const blockNode = this.getCurrentBlock(anchorNode);
                    if (blockNode && blockNode !== this.activeBlockNode) {
                        this.selectBlock(blockNode);
                    }
                }
            });

            // Clear pending delete card outline on click/focus changes
            container.addEventListener('mousedown', () => {
                if (this.pendingDeleteCard) {
                    this.pendingDeleteCard.style.outline = '';
                    this.pendingDeleteCard.style.boxShadow = '';
                    this.pendingDeleteCard = null;
                }
            });

            // Click handler for delete buttons (×), edit buttons (✏️), and block card selection
            container.addEventListener('click', (e) => {
                const deleteBtn = e.target.closest('.card-delete-btn, .block-delete-btn');
                if (deleteBtn) {
                    e.preventDefault();
                    e.stopPropagation();
                    const block = deleteBtn.closest(
                        '.newsletter-event-card, .newsletter-product-card, .newsletter-social-block, ' +
                        '.newsletter-video-block, .newsletter-columns-block, .newsletter-divider-block, ' +
                        '.newsletter-spacer-block, .newsletter-html-block, .block-img-wrapper, .newsletter-subscribe-block'
                    ) || deleteBtn.parentElement;
                    if (block) {
                        block.remove();
                        this.syncUnifiedBlocks();
                        this.triggerAutosave();
                        showToast("Element slettet", "info");
                        return;
                    }
                }

                const editBtn = e.target.closest('.card-edit-btn');
                if (editBtn) {
                    e.preventDefault();
                    e.stopPropagation();
                    const socialBlock = editBtn.closest('.newsletter-social-block');
                    if (socialBlock) {
                        this.openSocialInsertionFlowAt(socialBlock);
                        return;
                    }
                }

                const blockCard = e.target.closest(
                    '.newsletter-event-card, .newsletter-product-card, .newsletter-social-block, ' +
                    '.newsletter-video-block, .newsletter-divider-block, .newsletter-spacer-block, .newsletter-columns-block'
                );
                if (blockCard) {
                    this.selectedBlockCard = blockCard;
                    document.querySelectorAll('.hkm-selected-block').forEach(el => el.classList.remove('hkm-selected-block'));
                    blockCard.classList.add('hkm-selected-block');
                } else if (!e.target.closest('.card-delete-btn, .card-edit-btn')) {
                    this.selectedBlockCard = null;
                    document.querySelectorAll('.hkm-selected-block').forEach(el => el.classList.remove('hkm-selected-block'));
                }
            });

            // Double click handler on social blocks to open editor modal immediately
            container.addEventListener('dblclick', (e) => {
                const socialBlockCard = e.target.closest('.newsletter-social-block');
                if (socialBlockCard) {
                    e.preventDefault();
                    e.stopPropagation();
                    this.openSocialInsertionFlowAt(socialBlockCard);
                }
            });

            // Keyboard handling for Enter, Backspace & Delete (Mac WebKit & Blink compatible)
            container.addEventListener('keydown', (e) => {
                // If a non-text block card is currently selected, Backspace or Delete removes it immediately!
                if ((e.key === 'Backspace' || e.key === 'Delete') && this.selectedBlockCard && container.contains(this.selectedBlockCard)) {
                    e.preventDefault();
                    this.selectedBlockCard.remove();
                    this.selectedBlockCard = null;
                    this.syncUnifiedBlocks();
                    this.triggerAutosave();
                    showToast("Element slettet", "info");
                    return;
                }

                const selection = window.getSelection();
                if (!selection || !selection.rangeCount) return;
                const range = selection.getRangeAt(0);

                let parentBlock = selection.anchorNode;
                while (parentBlock && parentBlock.parentNode !== container) {
                    parentBlock = parentBlock.parentNode;
                }

                if (!parentBlock) return;

                const isBlockCard = parentBlock.classList && (
                    parentBlock.classList.contains('newsletter-event-card') ||
                    parentBlock.classList.contains('newsletter-product-card') ||
                    parentBlock.classList.contains('newsletter-social-block') ||
                    parentBlock.classList.contains('newsletter-video-block') ||
                    parentBlock.classList.contains('newsletter-divider-block') ||
                    parentBlock.classList.contains('newsletter-spacer-block') ||
                    parentBlock.classList.contains('newsletter-columns-block')
                );

                if (isBlockCard && (e.key === 'Backspace' || e.key === 'Delete')) {
                    e.preventDefault();
                    parentBlock.remove();
                    this.syncUnifiedBlocks();
                    this.triggerAutosave();
                    showToast("Element slettet", "info");
                    return;
                }

                if (e.key === 'Enter') {
                    const isHeading = /^H[1-6]$/i.test(parentBlock.tagName);

                    // Keep the browser's normal soft line break inside headings.
                    if (isHeading && e.shiftKey) {
                        setTimeout(() => {
                            this.syncUnifiedBlocks();
                            this.triggerAutosave();
                        }, 0);
                        return;
                    }

                    if (isHeading) {
                        e.preventDefault();
                        range.deleteContents();

                        const beforeCaret = document.createRange();
                        beforeCaret.selectNodeContents(parentBlock);
                        beforeCaret.setEnd(range.startContainer, range.startOffset);
                        const isAtStart = !beforeCaret.toString() &&
                            !beforeCaret.cloneContents().querySelector?.('img, br, hr');

                        const newP = document.createElement('p');

                        if (isAtStart) {
                            // Enter at the beginning inserts a blank line above,
                            // preserving the heading and moving it one line down.
                            newP.innerHTML = '<br>';
                            container.insertBefore(newP, parentBlock);
                        } else {
                            // Enter at the end creates an empty paragraph. In the
                            // middle, the text after the caret moves to that paragraph.
                            const afterCaret = document.createRange();
                            afterCaret.selectNodeContents(parentBlock);
                            afterCaret.setStart(range.startContainer, range.startOffset);
                            const trailingContent = afterCaret.extractContents();
                            newP.appendChild(trailingContent);

                            if (!newP.textContent.trim() && !newP.querySelector('img, br, hr')) {
                                newP.innerHTML = '<br>';
                            }

                            if (parentBlock.nextSibling) {
                                container.insertBefore(newP, parentBlock.nextSibling);
                            } else {
                                container.appendChild(newP);
                            }
                        }

                        const newRange = document.createRange();
                        newRange.selectNodeContents(newP);
                        newRange.collapse(true);
                        selection.removeAllRanges();
                        selection.addRange(newRange);
                        this.syncUnifiedBlocks();
                        this.triggerAutosave();
                        return;
                    }

                    if (isBlockCard) {
                        e.preventDefault();
                        const newP = document.createElement('p');
                        newP.innerHTML = '<br>';
                        if (parentBlock.nextSibling) {
                            container.insertBefore(newP, parentBlock.nextSibling);
                        } else {
                            container.appendChild(newP);
                        }
                        const newRange = document.createRange();
                        newRange.selectNodeContents(newP);
                        newRange.collapse(true);
                        selection.removeAllRanges();
                        selection.addRange(newRange);
                        this.syncUnifiedBlocks();
                        this.triggerAutosave();
                        return;
                    }

                    setTimeout(() => {
                        this.syncUnifiedBlocks();
                        this.triggerAutosave();
                    }, 0);
                    return;
                }

                if (e.key === 'Backspace') {
                    const isCurrentEmpty = !parentBlock.textContent.replace(/\u8203|\u200B/g, '').trim() &&
                        !parentBlock.querySelector('img, iframe, table, button, hr, .newsletter-product-card, .newsletter-event-card, .newsletter-video-block, .newsletter-social-block');

                    let isAtStart = false;
                    if (range.collapsed) {
                        if (isCurrentEmpty) {
                            isAtStart = true;
                        } else if (range.startOffset === 0) {
                            let node = range.startContainer;
                            isAtStart = true;
                            while (node && node !== parentBlock) {
                                if (node.previousSibling) {
                                    isAtStart = false;
                                    break;
                                }
                                node = node.parentNode;
                            }
                        }
                    }

                    if (isAtStart || isCurrentEmpty) {
                        const prevSibling = parentBlock.previousSibling;
                        const nextSibling = parentBlock.nextSibling;

                        if (isCurrentEmpty && container.children.length > 1) {
                            e.preventDefault();
                            const target = prevSibling || nextSibling;
                            if (target && target.nodeType === Node.ELEMENT_NODE) {
                                const isCard = target.classList.contains('newsletter-social-block') ||
                                               target.classList.contains('newsletter-product-card') ||
                                               target.classList.contains('newsletter-event-card') ||
                                               target.classList.contains('newsletter-video-block') ||
                                               target.classList.contains('newsletter-divider-block') ||
                                               target.classList.contains('newsletter-spacer-block');
                                if (!isCard) {
                                    try {
                                        const newRange = document.createRange();
                                        newRange.selectNodeContents(target);
                                        newRange.collapse(false);
                                        selection.removeAllRanges();
                                        selection.addRange(newRange);
                                        if (target.focus) target.focus();
                                    } catch(err) {}
                                } else if (typeof this.selectBlockCard === 'function') {
                                    this.selectBlockCard(target);
                                }
                            }
                            parentBlock.remove();
                            this.syncUnifiedBlocks();
                            this.triggerAutosave();
                            return;
                        }

                        if (!prevSibling) return;

                        if (isAtStart && prevSibling.nodeType === Node.ELEMENT_NODE && !prevSibling.classList.contains('newsletter-event-card') && !prevSibling.classList.contains('newsletter-product-card') && !prevSibling.classList.contains('newsletter-social-block') && !prevSibling.classList.contains('newsletter-video-block')) {
                            e.preventDefault();
                            const caretMarker = document.createElement('span');
                            caretMarker.id = 'hkm-caret-merge-marker';
                            
                            if (prevSibling.innerHTML.endsWith('<br>')) {
                                prevSibling.innerHTML = prevSibling.innerHTML.slice(0, -4);
                            }
                            
                            prevSibling.appendChild(caretMarker);
                            while (parentBlock.firstChild) {
                                prevSibling.appendChild(parentBlock.firstChild);
                            }

                            const newRange = document.createRange();
                            newRange.selectNodeContents(caretMarker);
                            newRange.collapse(true);
                            selection.removeAllRanges();
                            selection.addRange(newRange);
                            caretMarker.remove();
                            if (prevSibling.focus) prevSibling.focus();

                            parentBlock.remove();
                            this.syncUnifiedBlocks();
                            this.triggerAutosave();
                            return;
                        }
                    }
                } else if (e.key === 'Delete') {
                    const isCurrentEmpty = !parentBlock.textContent.replace(/\u8203|\u200B/g, '').trim() &&
                        !parentBlock.querySelector('img, iframe, table, button, hr, .newsletter-product-card, .newsletter-event-card, .newsletter-video-block, .newsletter-social-block');

                    if (isCurrentEmpty && container.children.length > 1) {
                        e.preventDefault();
                        const nextSibling = parentBlock.nextSibling;
                        const prevSibling = parentBlock.previousSibling;
                        const target = nextSibling || prevSibling;
                        if (target && target.nodeType === Node.ELEMENT_NODE) {
                            const isCard = target.classList.contains('newsletter-social-block') ||
                                           target.classList.contains('newsletter-product-card') ||
                                           target.classList.contains('newsletter-event-card') ||
                                           target.classList.contains('newsletter-video-block') ||
                                           target.classList.contains('newsletter-divider-block') ||
                                           target.classList.contains('newsletter-spacer-block');
                            if (!isCard) {
                                try {
                                    const newRange = document.createRange();
                                    newRange.selectNodeContents(target);
                                    newRange.collapse(true);
                                    selection.removeAllRanges();
                                    selection.addRange(newRange);
                                    if (target.focus) target.focus();
                                } catch(err) {}
                            } else if (typeof this.selectBlockCard === 'function') {
                                this.selectBlockCard(target);
                            }
                        }
                        parentBlock.remove();
                        this.syncUnifiedBlocks();
                        this.triggerAutosave();
                        return;
                    }
                }
            });

            // Drag and drop events
            container.addEventListener('dragover', (e) => {
                e.preventDefault();
                const afterElement = this.getDragAfterElement(container, e.clientY);
                
                let indicator = container.querySelector('.hkm-drop-indicator');
                if (!indicator) {
                    indicator = document.createElement('div');
                    indicator.className = 'hkm-drop-indicator';
                    indicator.style.cssText = `
                        height: 4px;
                        background: #d17d39;
                        border-radius: 2px;
                        margin: 12px 0;
                        transition: all 0.15s ease;
                        pointer-events: none;
                    `;
                }
                
                if (afterElement) {
                    container.insertBefore(indicator, afterElement);
                } else {
                    container.appendChild(indicator);
                }
            });
            
            container.addEventListener('dragleave', () => {
                const indicator = container.querySelector('.hkm-drop-indicator');
                if (indicator) indicator.remove();
            });
            
            container.addEventListener('drop', (e) => {
                e.preventDefault();
                const indicator = container.querySelector('.hkm-drop-indicator');
                if (indicator) indicator.remove();
                
                // Handle actual local file drop (e.g. image dragged from desktop)
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    const file = e.dataTransfer.files[0];
                    if (file.type.startsWith('image/')) {
                        const afterElement = this.getDragAfterElement(container, e.clientY);
                        this.uploadAndInsertImageFileAt(file, afterElement);
                    }
                    return;
                }
                
                const type = e.dataTransfer.getData('hkm-block-type');
                if (!type) return;
                
                const afterElement = this.getDragAfterElement(container, e.clientY);
                this.insertBlockAt(type, afterElement);
            });
        }

        const subjectInput = document.getElementById('newsletter-subject');
        if (subjectInput) {
            subjectInput.addEventListener('input', () => this.triggerAutosave());
        }

        // Background Color Swatches
        document.querySelectorAll('#outer-bg-palette .color-swatch').forEach(swatch => {
            swatch.addEventListener('click', () => {
                const color = swatch.dataset.color;
                this.updateBackground('outer', 'color', color);

                document.querySelectorAll('#outer-bg-palette .color-swatch').forEach(s => s.classList.remove('active'));
                swatch.classList.add('active');
            });
        });

        // Pattern Items
        document.querySelectorAll('.pattern-item').forEach(item => {
            item.addEventListener('click', () => {
                const pattern = item.dataset.pattern;
                this.updateBackground('outer', 'pattern', pattern);

                document.querySelectorAll('.pattern-item').forEach(p => p.classList.remove('active'));
                item.classList.add('active');
            });
        });

        // Customize Inner Background
        const innerBtn = document.getElementById('customize-inner-bg');
        if (innerBtn) {
            let innerPicker = document.getElementById('input-inner-bg-picker');
            if (!innerPicker) {
                innerPicker = document.createElement('input');
                innerPicker.type = 'color';
                innerPicker.id = 'input-inner-bg-picker';
                innerPicker.style.display = 'none';
                document.body.appendChild(innerPicker);
                innerPicker.addEventListener('input', (e) => {
                    this.updateBackground('inner', 'color', e.target.value);
                });
            }
            innerBtn.addEventListener('click', () => {
                innerPicker.value = this.backgrounds?.inner?.color || '#ffffff';
                innerPicker.click();
            });
        }

        // View Toggles
        document.querySelectorAll('.device-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const view = btn.dataset.view;
                this.setView(view);
            });
        });

        // Actions
        const previewBtn = document.getElementById('preview-btn');
        if (previewBtn) {
            previewBtn.addEventListener('click', () => this.showPreview());
        }

        // Dark Mode Simulator Toggle
        const darkModeBtn = document.getElementById('email-dark-mode-btn');
        if (darkModeBtn) {
            darkModeBtn.addEventListener('click', () => {
                const canvas = document.getElementById('newsletter-canvas');
                if (canvas) {
                    canvas.classList.toggle('simulated-dark-mode');
                    darkModeBtn.classList.toggle('active');
                    
                    const isDark = canvas.classList.contains('simulated-dark-mode');
                    const icon = darkModeBtn.querySelector('span');
                    if (icon) icon.textContent = isDark ? 'light_mode' : 'dark_mode';
                    darkModeBtn.title = isDark ? 'Lyst tema-simulator' : 'Mørkt tema-simulator';
                }
            });
        }
        
        const saveDraftBtn = document.getElementById('save-draft-btn');
        if (saveDraftBtn) {
            saveDraftBtn.addEventListener('click', () => this.saveDraft());
        }
        
        const saveTemplateBtn = document.getElementById('save-template-btn');
        if (saveTemplateBtn) {
            saveTemplateBtn.addEventListener('click', () => this.saveTemplate());
        }

        const continueBtn = document.getElementById('continue-btn');
        if (continueBtn) {
            continueBtn.addEventListener('click', () => this.toggleRecipientsDrawer());
        }

        const sendTestBtn = document.getElementById('send-test-btn');
        if (sendTestBtn) {
            sendTestBtn.addEventListener('click', () => this.sendTestEmail());
        }

        const finalSendBtn = document.getElementById('final-send-btn');
        if (finalSendBtn) {
            finalSendBtn.addEventListener('click', () => this.sendCampaign());
        }

        // Modal Close
        const closeModal = document.querySelector('.close-modal');
        if (closeModal) {
            closeModal.addEventListener('click', () => {
                document.getElementById('preview-modal').style.display = 'none';
            });
        }

        // Image Upload Handle
        const imageInput = document.getElementById('block-image-upload');
        if (imageInput) {
            imageInput.addEventListener('change', (e) => this.handleImageFileSelect(e));
        }

    }

    saveSelection() {
        const sel = window.getSelection();
        if (sel.rangeCount > 0) {
            const range = sel.getRangeAt(0);
            const container = document.getElementById('blocks-container');
            if (container && container.contains(range.commonAncestorContainer)) {
                this.savedRange = range;
            }
        }
    }

    handleElementCardActivation(event, card) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }

        const type = card?.dataset?.type || card?.getAttribute?.('data-type');
        if (!type) return;

        this.hideElementHoverPreview();

        // The mobile element drawer sits above both the canvas and insertion
        // dialogs. Close it before inserting so the result is immediately
        // visible and modal-based blocks do not open behind the drawer.
        if (this.isMobileViewport()) {
            this.closeMobileDrawers();
            this.closeToolsUi();
        }

        if (type === 'ai_text') {
            this.showAiTextPrompt();
        } else if (type === 'ai_image') {
            this.showAiImagePrompt();
        } else {
            this.addBlock(type);
        }
    }

    mountEditorModal(modal, ariaLabel) {
        if (!modal) return null;

        this.toggleMode('builder');
        this.switchSidebarView('builder');
        this.closeMobileDrawers();
        this.closeToolsUi();

        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        if (ariaLabel) modal.setAttribute('aria-label', ariaLabel);
        modal.style.setProperty('z-index', '200000', 'important');

        const editorRoot = document.getElementById('newsletter-builder-layout') || document.body;
        editorRoot.appendChild(modal);
        return modal;
    }

    restoreSelection() {
        if (this.savedRange) {
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(this.savedRange);
        } else {
            const container = document.getElementById('blocks-container');
            if (container) {
                container.focus();
                const sel = window.getSelection();
                sel.selectAllChildren(container);
                sel.collapseToEnd();
            }
        }
    }

    setLineHeight(value) {
        this.restoreSelection();
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const container = document.getElementById('blocks-container');
            let node = range.commonAncestorContainer;
            if (node.nodeType === Node.TEXT_NODE) {
                node = node.parentNode;
            }
            
            while (node && node !== container && node.parentNode && node.parentNode !== container) {
                node = node.parentNode;
            }
            
            if (node && node !== container) {
                node.style.lineHeight = value;
                this.syncUnifiedBlocks();
            } else {
                const fragment = range.cloneContents();
                const blocks = fragment.querySelectorAll('p, h1, h2, h3, li, div');
                if (blocks.length > 0) {
                    const container = document.getElementById('blocks-container');
                    const allBlocks = container.querySelectorAll('p, h1, h2, h3, li, div');
                    allBlocks.forEach(block => {
                        if (selection.containsNode(block, true)) {
                            block.style.lineHeight = value;
                        }
                    });
                    this.syncUnifiedBlocks();
                } else {
                    const parent = range.startContainer.parentElement;
                    if (parent && parent !== container) {
                        parent.style.lineHeight = value;
                        this.syncUnifiedBlocks();
                    }
                }
            }
        }
    }

    getCurrentLineHeight() {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            let node = selection.getRangeAt(0).startContainer;
            if (node.nodeType === Node.TEXT_NODE) {
                node = node.parentNode;
            }
            const val = node.style.lineHeight || window.getComputedStyle(node).lineHeight;
            if (val && !val.includes('px')) {
                return val;
            }
        }
        return '1.5';
    }

    handleTextSelection() {
        const selection = window.getSelection();
        const container = document.getElementById('blocks-container');
        if (!container) return;

        if (selection.isCollapsed || selection.rangeCount === 0) {
            this.hideSelectionBubble();
            return;
        }

        const range = selection.getRangeAt(0);
        if (container.contains(range.commonAncestorContainer)) {
            const text = selection.toString().trim();
            if (text.length > 0) {
                this.savedRange = range.cloneRange();
                this.showSelectionBubble(range);
                return;
            }
        }
        this.hideSelectionBubble();
    }

    showSelectionBubble(range) {
        let bubble = document.getElementById('hkm-selection-bubble');
        if (!bubble) {
            bubble = document.createElement('div');
            bubble.id = 'hkm-selection-bubble';
            bubble.style.cssText = `
                position: absolute;
                background: #0f172a;
                color: white;
                padding: 6px 12px;
                border-radius: 12px;
                display: flex;
                align-items: center;
                gap: 8px;
                box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.3);
                z-index: 10000;
                pointer-events: auto;
                font-family: system-ui, -apple-system, sans-serif;
                transition: opacity 0.2s ease, transform 0.2s ease;
                opacity: 0;
                transform: translateY(6px) scale(0.95);
            `;

            const createBtn = (icon, title, toolName) => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.title = title;
                btn.style.cssText = `
                    background: none;
                    border: none;
                    color: #94a3b8;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 4px;
                    border-radius: 6px;
                    transition: all 0.2s ease;
                `;
                btn.innerHTML = `<span class="material-symbols-outlined" style="font-size: 18px;">${icon}</span>`;
                btn.onmouseenter = () => { btn.style.color = '#fff'; btn.style.background = 'rgba(255,255,255,0.08)'; };
                btn.onmouseleave = () => { btn.style.color = '#94a3b8'; btn.style.background = 'none'; };
                btn.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.exec(toolName);
                };
                return btn;
            };

            const boldBtn = createBtn('format_bold', 'Fet', 'bold');
            const italicBtn = createBtn('format_italic', 'Kursiv', 'italic');
            const underlineBtn = createBtn('format_underlined', 'Understreket', 'underline');
            
            const linkBtn = createBtn('link', 'Lenke', 'link');
            linkBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.showPromptModal(
                    "Nettadresse",
                    "https://...",
                    (url) => this.exec('createLink', url),
                    "https://",
                    "Vennligst oppgi en gyldig nettadresse.",
                    "Sett inn lenke",
                    "Sett inn"
                );
            };

            const spacingBtn = createBtn('format_line_spacing', 'Linjeavstand', 'lineHeight');
            spacingBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                const current = this.getCurrentLineHeight() || '1.5';
                this.showPromptModal(
                    "Linjeavstand",
                    "F.eks. 1.0, 1.2, 1.5 eller 1.8",
                    (value) => this.setLineHeight(value),
                    current,
                    "Vennligst oppgi en linjeavstand.",
                    "Endre linjeavstand",
                    "Bruk"
                );
            };

            const quoteBtn = createBtn('format_quote', 'Sitat', 'quote');
            quoteBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.toggleQuote();
            };

            const colorBtn = document.createElement('button');
            colorBtn.type = 'button';
            colorBtn.title = 'Tekstfarge';
            colorBtn.style.cssText = `
                background: none;
                border: none;
                color: #94a3b8;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 4px;
                border-radius: 6px;
                transition: all 0.2s ease;
            `;
            colorBtn.innerHTML = `<span class="material-symbols-outlined" style="font-size: 18px;">palette</span>`;
            colorBtn.onmouseenter = () => { colorBtn.style.color = '#fff'; colorBtn.style.background = 'rgba(255,255,255,0.08)'; };
            colorBtn.onmouseleave = () => { colorBtn.style.color = '#94a3b8'; colorBtn.style.background = 'none'; };
            colorBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                const colorGrid = bubble.querySelector('.hkm-bubble-color-grid');
                if (colorGrid) {
                    colorGrid.style.display = colorGrid.style.display === 'none' ? 'flex' : 'none';
                }
            };

            const colorGrid = document.createElement('div');
            colorGrid.className = 'hkm-bubble-color-grid';
            colorGrid.style.cssText = `
                position: absolute;
                top: 42px;
                left: 50%;
                transform: translateX(-50%);
                background: #0f172a;
                border-radius: 8px;
                padding: 6px;
                display: none;
                gap: 6px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                z-index: 10001;
            `;
            const colors = ['#ffffff', '#000000', '#d17d39', '#1B4965', '#22c55e', '#ef4444', '#e2e8f0'];
            colors.forEach(col => {
                const swatch = document.createElement('div');
                swatch.style.cssText = `
                    width: 16px;
                    height: 16px;
                    border-radius: 4px;
                    background: ${col};
                    cursor: pointer;
                    border: 1px solid rgba(255,255,255,0.2);
                `;
                swatch.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.exec('foreColor', col);
                    colorGrid.style.display = 'none';
                };
                colorGrid.appendChild(swatch);
            });

            bubble.appendChild(boldBtn);
            bubble.appendChild(italicBtn);
            bubble.appendChild(underlineBtn);
            bubble.appendChild(linkBtn);
            bubble.appendChild(spacingBtn);
            bubble.appendChild(quoteBtn);
            bubble.appendChild(colorBtn);
            bubble.appendChild(colorGrid);
            document.body.appendChild(bubble);
        }

        const rect = range.getBoundingClientRect();
        const scrollX = window.scrollX || window.pageXOffset;
        const scrollY = window.scrollY || window.pageYOffset;

        const bubbleWidth = bubble.offsetWidth || 180;
        const top = rect.top + scrollY - 48;
        const left = rect.left + scrollX + (rect.width / 2) - (bubbleWidth / 2);

        bubble.style.top = top + 'px';
        bubble.style.left = left + 'px';
        bubble.style.display = 'flex';
        
        setTimeout(() => {
            bubble.style.opacity = '1';
            bubble.style.transform = 'translateY(0) scale(1)';
        }, 10);
    }

    hideSelectionBubble() {
        const bubble = document.getElementById('hkm-selection-bubble');
        if (bubble) {
            bubble.style.opacity = '0';
            bubble.style.transform = 'translateY(6px) scale(0.95)';
            setTimeout(() => {
                if (bubble.style.opacity === '0') {
                    bubble.style.display = 'none';
                    const colorGrid = bubble.querySelector('.hkm-bubble-color-grid');
                    if (colorGrid) colorGrid.style.display = 'none';
                }
            }, 200);
        }
    }

    exec(command, value = null) {
        this.restoreSelection();
        document.execCommand(command, false, value);
        this.syncUnifiedBlocks();
    }

    sanitizePastedHtml(html, fallbackText) {
        if (!html) {
            const escaped = (fallbackText || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            return escaped.split(/\n\s*\n/).map(para => `<p>${para.replace(/\n/g, '<br>')}</p>`).join('');
        }
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            const junk = doc.querySelectorAll('script, style, meta, link, head, iframe, object, embed');
            junk.forEach(node => node.remove());

            const allEls = doc.body.querySelectorAll('*');
            allEls.forEach(el => {
                const tag = el.tagName.toLowerCase();
                el.style.position = '';
                el.style.top = '';
                el.style.left = '';
                el.style.float = '';
                el.style.display = '';
                el.style.backgroundColor = '';
                el.style.background = '';
                el.style.color = '';
                el.style.lineHeight = '';
                el.style.margin = '';
                el.style.padding = '';
                el.style.height = '';
                el.style.fontFamily = '';
                el.removeAttribute('bgcolor');
                el.removeAttribute('align');
                el.removeAttribute('width');
                el.removeAttribute('height');

                if (tag === 'font' || (tag === 'span' && !el.getAttribute('style') && !el.getAttribute('class'))) {
                    const parent = el.parentNode;
                    if (parent) {
                        while (el.firstChild) {
                            parent.insertBefore(el.firstChild, el);
                        }
                        parent.removeChild(el);
                    }
                }
            });

            return doc.body.innerHTML.trim();
        } catch (e) {
            return (fallbackText || '').split(/\n\s*\n/).map(para => `<p>${para}</p>`).join('');
        }
    }

    cleanPastedFormatting() {
        const container = document.getElementById('blocks-container');
        if (!container) return;
        const elements = container.querySelectorAll('*');
        elements.forEach(el => {
            const tag = el.tagName.toLowerCase();
            if (el.classList && (el.classList.contains('block-btn') || el.classList.contains('btn') || el.classList.contains('callout-box'))) {
                return;
            }
            el.style.position = '';
            el.style.top = '';
            el.style.left = '';
            el.style.float = '';
            el.style.display = '';
            el.style.backgroundColor = '';
            el.style.background = '';
            el.style.color = '';
            el.style.lineHeight = '';
            el.style.margin = '';
            el.style.padding = '';
            el.style.fontFamily = '';
            el.removeAttribute('bgcolor');
            el.removeAttribute('align');
            el.removeAttribute('width');
            el.removeAttribute('height');

            if (tag === 'span' && !el.getAttribute('style') && !el.getAttribute('class')) {
                const parent = el.parentNode;
                if (parent) {
                    while (el.firstChild) {
                        parent.insertBefore(el.firstChild, el);
                    }
                    parent.removeChild(el);
                }
            }
        });
        this.syncUnifiedBlocks();
    }

    enforceLayout() {
        const canvas = document.getElementById('newsletter-canvas');
        const container = document.getElementById('blocks-container');
        const footer = canvas ? canvas.querySelector('.canvas-footer') : null;

        if (canvas) {
            canvas.style.setProperty('display', 'flex', 'important');
            canvas.style.setProperty('flex-direction', 'column', 'important');
            canvas.style.setProperty('min-height', '400px', 'important');
            canvas.style.setProperty('height', 'auto', 'important');
            canvas.style.setProperty('position', 'relative', 'important');
            canvas.style.setProperty('padding-bottom', '0', 'important');
        }
        if (container) {
            container.style.setProperty('display', 'block', 'important');
            container.style.setProperty('flex', '1 0 auto', 'important');
            container.style.setProperty('height', 'auto', 'important');
            container.style.setProperty('min-height', '250px', 'important');
            container.style.setProperty('padding', '32px 40px 32px 40px', 'important');
            container.style.setProperty('box-sizing', 'border-box', 'important');
        }
        if (footer) {
            footer.setAttribute('contenteditable', 'false');
            footer.style.setProperty('position', 'static', 'important');
            footer.style.setProperty('margin-top', 'auto', 'important');
            footer.style.setProperty('display', 'flex', 'important');
            footer.style.setProperty('flex-direction', 'column', 'important');
            footer.style.setProperty('justify-content', 'center', 'important');
            footer.style.setProperty('align-items', 'center', 'important');
            footer.style.setProperty('height', 'auto', 'important');
            footer.style.setProperty('padding', '40px', 'important');
            footer.style.setProperty('box-sizing', 'border-box', 'important');
            footer.style.setProperty('background', '#fcfcfc', 'important');
            footer.style.setProperty('border-top', '1px solid #f8fafc', 'important');
        }
    }

    syncUnifiedBlocks() {
        const container = document.getElementById('blocks-container');
        if (!container) return;

        this.enforceLayout();

        // Force browser layout reflow to ensure the flex footer position recalculates dynamically
        const canvas = document.getElementById('newsletter-canvas');
        if (canvas) {
            const reflow = canvas.offsetHeight;
        }

        // Clean up nested footers if any got accidentally pasted or merged inside the editor content
        container.querySelectorAll('.canvas-footer').forEach(footer => {
            footer.remove();
        });

        // Clean up empty button/block wrappers
        container.querySelectorAll('div').forEach(div => {
            const isBtnWrap = div.style.textAlign === 'center' || div.classList.contains('block-btn-wrap');
            if (isBtnWrap) {
                const hasContent = div.textContent.trim() !== '' || div.querySelector('.block-btn, img, iframe, h1, h2, h3, h4, h5, h6, p, blockquote, hr, table, ul, ol');
                if (!hasContent) {
                    div.remove();
                }
            }
        });

        const cleanHtml = this.getCleanCanvasHtml();
        this.blocks = [{
            id: 'unified_content',
            type: 'text',
            content: { text: cleanHtml }
        }];

        try {
            const currentHtml = cleanHtml;
            const currentSubject = document.getElementById('newsletter-subject')?.value || '';
            const headerNode = document.querySelector('.canvas-header');

            if (currentHtml && currentHtml !== '<p><br></p>') {
                localStorage.setItem('hkm_builder_autosave_html', currentHtml);
                localStorage.setItem('hkm_builder_autosave_subject', currentSubject);
            }
            if (headerNode) {
                localStorage.setItem('hkm_builder_autosave_header_html', headerNode.outerHTML);
            }
        } catch (e) {}

        this.triggerAutosave();
    }

    setupThemePanelEvents() {
        // Preset Themes click
        document.querySelectorAll('.theme-preset-card').forEach(card => {
            card.addEventListener('click', () => {
                document.querySelectorAll('.theme-preset-card').forEach(c => {
                    c.style.borderColor = '#cbd5e1';
                    c.style.background = '#ffffff';
                });
                card.style.borderColor = '#005bff';
                card.style.background = '#f0f7ff';
                
                const primary = card.dataset.primary;
                const accent = card.dataset.accent;
                
                const primInput = document.getElementById('theme-color-primary');
                const primHex = document.getElementById('theme-color-primary-hex');
                const accInput = document.getElementById('theme-color-accent');
                const accHex = document.getElementById('theme-color-accent-hex');
                
                if (primInput) primInput.value = primary;
                if (primHex) primHex.value = primary;
                if (accInput) accInput.value = accent;
                if (accHex) accHex.value = accent;
                
                // Set custom properties or styles on elements in the canvas
                document.querySelectorAll('#newsletter-canvas button, #newsletter-canvas a').forEach(el => {
                    if (!el.classList.contains('inspector-style-btn')) {
                        el.style.backgroundColor = primary;
                    }
                });
                
                this.syncUnifiedBlocks();
                if (typeof showToast === 'function') {
                    showToast("Tema-palett brukt på malen!", "success");
                }
            });
        });

        // Global font change
        const fontSelect = document.getElementById('theme-global-font');
        if (fontSelect) {
            fontSelect.addEventListener('change', (e) => {
                const canvas = document.getElementById('newsletter-canvas');
                if (canvas) {
                    canvas.style.fontFamily = e.target.value;
                    this.syncUnifiedBlocks();
                }
            });
        }

        // Primary color picker
        const primInput = document.getElementById('theme-color-primary');
        const primHex = document.getElementById('theme-color-primary-hex');
        if (primInput) {
            primInput.addEventListener('input', (e) => {
                const val = e.target.value;
                if (primHex) primHex.value = val;
                
                document.querySelectorAll('#newsletter-canvas button, #newsletter-canvas a').forEach(el => {
                    if (!el.classList.contains('inspector-style-btn')) {
                        el.style.backgroundColor = val;
                    }
                });
                this.syncUnifiedBlocks();
            });
        }

        // Accent color picker
        const accInput = document.getElementById('theme-color-accent');
        const accHex = document.getElementById('theme-color-accent-hex');
        if (accInput) {
            accInput.addEventListener('input', (e) => {
                const val = e.target.value;
                if (accHex) accHex.value = val;
                this.syncUnifiedBlocks();
            });
        }

        // Ytre Bakgrunn
        const bgOuter = document.getElementById('theme-bg-outer');
        const bgOuterHex = document.getElementById('theme-bg-outer-hex');
        if (bgOuter) {
            bgOuter.addEventListener('input', (e) => {
                const val = e.target.value;
                if (bgOuterHex) bgOuterHex.value = val;
                const canvasScaler = document.getElementById('canvas-scaler');
                if (canvasScaler) canvasScaler.style.backgroundColor = val;
                this.syncUnifiedBlocks();
            });
        }

        // Indre Bakgrunn
        const bgInner = document.getElementById('theme-bg-inner');
        const bgInnerHex = document.getElementById('theme-bg-inner-hex');
        if (bgInner) {
            bgInner.addEventListener('input', (e) => {
                const val = e.target.value;
                if (bgInnerHex) bgInnerHex.value = val;
                const canvas = document.getElementById('newsletter-canvas');
                if (canvas) canvas.style.backgroundColor = val;
                this.syncUnifiedBlocks();
            });
        }
    }

    setupRichTextToolbar() {
        const toolbar = document.getElementById('desktop-richtools');
        if (!toolbar) return;

        // Click Handler (Event Delegation)
        toolbar.addEventListener('click', (e) => {
            const btn = e.target.closest('.desktop-richtools-btn');
            if (!btn) return;

            const tool = btn.getAttribute('data-tool');
            if (!tool) return;

            e.preventDefault();
            e.stopPropagation();

            // Simple click feedback
            btn.style.transform = 'scale(0.95)';
            setTimeout(() => btn.style.transform = '', 100);

            switch (tool) {
                case 'undo':
                    this.exec('undo');
                    break;
                case 'redo':
                    this.exec('redo');
                    break;
                case 'bold':
                    this.exec('bold');
                    break;
                case 'italic':
                    this.exec('italic');
                    break;
                case 'underline':
                    this.exec('underline');
                    break;
                case 'strike':
                    this.exec('strikeThrough');
                    break;
                case 'removeFormat':
                    this.exec('removeFormat');
                    this.cleanPastedFormatting();
                    break;
                case 'justifyLeft':
                    this.exec('justifyLeft');
                    break;
                case 'justifyCenter':
                    this.exec('justifyCenter');
                    break;
                case 'justifyRight':
                    this.exec('justifyRight');
                    break;
                case 'justifyFull':
                    this.exec('justifyFull');
                    break;
                case 'list':
                    this.exec('insertUnorderedList');
                    break;
                case 'orderedList':
                    this.exec('insertOrderedList');
                    break;
                case 'link':
                    this.showPromptModal(
                        "Nettadresse",
                        "https://...",
                        (url) => this.exec('createLink', url),
                        "https://",
                        "Vennligst oppgi en gyldig nettadresse.",
                        "Sett inn lenke",
                        "Sett inn"
                    );
                    break;
                case 'textColor':
                    const textInput = toolbar.querySelector('[data-color-input="text"]');
                    if (textInput) textInput.click();
                    break;
                case 'highlightColor':
                    const highlightInput = toolbar.querySelector('[data-color-input="highlight"]');
                    if (highlightInput) highlightInput.click();
                    break;
                case 'lineHeight':
                    const currentLineHeight = this.getCurrentLineHeight() || '1.5';
                    this.showPromptModal(
                        "Linjeavstand",
                        "F.eks. 1.0, 1.2, 1.5, 1.8 eller 2.0",
                        (value) => this.setLineHeight(value),
                        currentLineHeight,
                        "Vennligst oppgi en linjeavstand.",
                        "Endre linjeavstand",
                        "Bruk"
                    );
                    break;
                case 'quote':
                    this.toggleQuote();
                    break;
            }
        });

        // Prevent focus loss on mousedown
        toolbar.querySelectorAll('.desktop-richtools-btn').forEach(btn => {
            btn.addEventListener('mousedown', (e) => {
                this.saveSelection();
                e.preventDefault();
                e.stopPropagation();
            });
        });

        // Color input listeners
        const textColorInput = toolbar.querySelector('[data-color-input="text"]');
        if (textColorInput) {
            textColorInput.addEventListener('input', (e) => {
                this.exec('foreColor', e.target.value);
            });
        }

        const highlightColorInput = toolbar.querySelector('[data-color-input="highlight"]');
        if (highlightColorInput) {
            highlightColorInput.addEventListener('input', (e) => {
                this.exec('backColor', e.target.value);
            });
        }
    }

    setupCanvasControls() {
        const zoomOutBtn = document.getElementById('canvas-zoom-out');
        const zoomResetBtn = document.getElementById('canvas-zoom-reset');
        const zoomInBtn = document.getElementById('canvas-zoom-in');

        zoomOutBtn?.addEventListener('click', () => this.setCanvasZoom(this.canvasZoom - 10));
        zoomResetBtn?.addEventListener('click', () => this.setCanvasZoom(100));
        zoomInBtn?.addEventListener('click', () => this.setCanvasZoom(this.canvasZoom + 10));
        this.setCanvasZoom(this.canvasZoom);
    }

    setCanvasZoom(value) {
        const canvas = document.getElementById('newsletter-canvas');
        const zoomValue = document.getElementById('canvas-zoom-value');
        const nextZoom = Math.max(60, Math.min(130, Number(value) || 100));

        this.canvasZoom = nextZoom;
        if (canvas) {
            canvas.style.zoom = String(nextZoom / 100);
        }
        if (zoomValue) {
            zoomValue.textContent = `${nextZoom}%`;
        }
    }

    setupBubbleMenu() {
        const bubbleMenu = document.getElementById('hkm-bubble-menu');
        if (!bubbleMenu) return;

        // The builder is a fixed, high-z-index application layer. Keep the
        // selection toolbar inside that layer so it cannot render behind it.
        const editorRoot = document.getElementById('newsletter-builder-layout');
        if (editorRoot && bubbleMenu.parentElement !== editorRoot) {
            editorRoot.appendChild(bubbleMenu);
        }
        bubbleMenu.setAttribute('role', 'toolbar');
        bubbleMenu.setAttribute('aria-label', 'Tekstformatering');

        // Prevent selection loss when clicking within the bubble menu
        bubbleMenu.addEventListener('mousedown', (e) => {
            this.saveSelection();
            e.preventDefault();
            e.stopPropagation();
        });

        // Click actions handler for bubble formatting
        bubbleMenu.addEventListener('click', (e) => {
            e.stopPropagation();
            const btn = e.target.closest('.hkm-bubble-btn');
            if (!btn) return;

            const tool = btn.getAttribute('data-tool');
            if (!tool) return;

            e.preventDefault();

            // Scale feedback animation
            btn.style.transform = 'scale(0.9)';
            setTimeout(() => btn.style.transform = '', 100);

            // Restore highlight selection
            this.restoreSelection();

            switch (tool) {
                case 'bold':
                    this.exec('bold');
                    break;
                case 'italic':
                    this.exec('italic');
                    break;
                case 'underline':
                    this.exec('underline');
                    break;
                case 'strike':
                    this.exec('strikeThrough');
                    break;
                case 'link':
                    this.showPromptModal(
                        "Nettadresse",
                        "https://...",
                        (url) => this.exec('createLink', url),
                        "https://",
                        "Vennligst oppgi en gyldig nettadresse.",
                        "Sett inn lenke",
                        "Sett inn"
                    );
                    break;
                case 'textColor':
                    const textInput = bubbleMenu.querySelector('[data-bubble-color-input="text"]');
                    if (textInput) textInput.click();
                    break;
                case 'highlightColor':
                    const hlInput = bubbleMenu.querySelector('[data-bubble-color-input="highlight"]');
                    if (hlInput) hlInput.click();
                    break;
            }
        });

        const textColorInput = bubbleMenu.querySelector('[data-bubble-color-input="text"]');
        if (textColorInput) {
            textColorInput.addEventListener('input', (e) => {
                this.restoreSelection();
                this.exec('foreColor', e.target.value);
            });
        }

        const highlightColorInput = bubbleMenu.querySelector('[data-bubble-color-input="highlight"]');
        if (highlightColorInput) {
            highlightColorInput.addEventListener('input', (e) => {
                this.restoreSelection();
                this.exec('backColor', e.target.value);
            });
        }
    }

    handleTextSelection() {
        const bubbleMenu = document.getElementById('hkm-bubble-menu');
        if (!bubbleMenu) return;

        const sel = window.getSelection();
        if (sel.isCollapsed || sel.rangeCount === 0) {
            bubbleMenu.classList.remove('visible');
            setTimeout(() => {
                if (!bubbleMenu.classList.contains('visible')) {
                    bubbleMenu.style.display = 'none';
                }
            }, 150);
            return;
        }

        const range = sel.getRangeAt(0);
        const container = document.getElementById('blocks-container');
        if (!container || !container.contains(range.commonAncestorContainer)) {
            bubbleMenu.classList.remove('visible');
            setTimeout(() => {
                if (!bubbleMenu.classList.contains('visible')) {
                    bubbleMenu.style.display = 'none';
                }
            }, 150);
            return;
        }

        const rect = range.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) {
            bubbleMenu.classList.remove('visible');
            setTimeout(() => {
                if (!bubbleMenu.classList.contains('visible')) {
                    bubbleMenu.style.display = 'none';
                }
            }, 150);
            return;
        }

        // Save selection range
        this.saveSelection();

        bubbleMenu.style.display = 'flex';
        const menuWidth = bubbleMenu.offsetWidth;
        const menuHeight = bubbleMenu.offsetHeight;

        // Position within the fixed editor viewport and keep the full toolbar
        // visible near every screen edge.
        const viewportPadding = 8;
        const topAbove = rect.top - menuHeight - 12;
        const topBelow = rect.bottom + 12;
        const top = topAbove >= viewportPadding
            ? topAbove
            : Math.min(topBelow, window.innerHeight - menuHeight - viewportPadding);
        const centeredLeft = rect.left + (rect.width / 2) - (menuWidth / 2);
        const left = Math.max(
            viewportPadding,
            Math.min(centeredLeft, window.innerWidth - menuWidth - viewportPadding)
        );

        bubbleMenu.style.top = `${top}px`;
        bubbleMenu.style.left = `${left}px`;

        requestAnimationFrame(() => {
            bubbleMenu.classList.add('visible');
        });
    }

    openImageInsertionFlow() {
        this.openImageInsertionFlowAt(null);
    }

    openImageInsertionFlowAt(afterElement, imageToReplace = null) {
        this.saveSelection();
        
        // Remove existing modal if any
        const existingModal = document.getElementById('hkm-image-source-modal');
        if (existingModal) existingModal.remove();

        const modal = document.createElement('div');
        modal.id = 'hkm-image-source-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(15, 23, 42, 0.6);
            backdrop-filter: blur(8px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 20000;
            animation: fadeIn 0.2s ease-out;
            font-family: 'Inter', sans-serif;
        `;
        
        const card = document.createElement('div');
        card.style.cssText = `
            background: #ffffff;
            border-radius: 16px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
            width: 90%;
            max-width: 440px;
            padding: 24px;
            box-sizing: border-box;
            border: 1px solid #cbd5e1;
            transform: scale(0.95);
            transition: transform 0.2s ease;
        `;
        
        card.innerHTML = `
            <input type="file" id="hkm-modal-file-input" accept="image/*" style="display:none;" />
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                <h3 style="margin:0; font-size:18px; font-weight:800; color:#1e293b;">${imageToReplace ? 'Endre bilde' : 'Sett inn bilde'}</h3>
                <button type="button" id="hkm-close-img-modal" class="material-symbols-outlined" style="background:none; border:none; color:#64748b; cursor:pointer; font-size:22px; padding:4px; border-radius:50%; transition:background 0.2s;">close</button>
            </div>
            
            <div style="display:flex; flex-direction:column; gap:12px; margin-bottom:20px;">
                <button type="button" id="hkm-img-source-upload" style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:12px; padding:14px 18px; cursor:pointer; text-align:left; transition:all 0.2s; display:flex; align-items:center; gap:14px; width:100%; box-sizing:border-box;">
                    <div style="background:#fff7ed; padding:10px; border-radius:10px; display:flex; align-items:center; justify-content:center;">
                        <span class="material-symbols-outlined" style="font-size:24px; color:#d17d39;">upload_file</span>
                    </div>
                    <div style="display:flex; flex-direction:column;">
                        <span style="font-size:14px; font-weight:700; color:#1B4965;">Last opp fra enhet</span>
                        <span style="font-size:11px; color:#64748b;">Velg et lokalt bilde fra din PC/mobil</span>
                    </div>
                </button>
                
                <button type="button" id="hkm-img-source-unsplash" style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:12px; padding:14px 18px; cursor:pointer; text-align:left; transition:all 0.2s; display:flex; align-items:center; gap:14px; width:100%; box-sizing:border-box;">
                    <div style="background:#f0fdf4; padding:10px; border-radius:10px; display:flex; align-items:center; justify-content:center;">
                        <span class="material-symbols-outlined" style="font-size:24px; color:#16a34a;">image_search</span>
                    </div>
                    <div style="display:flex; flex-direction:column;">
                        <span style="font-size:14px; font-weight:700; color:#1B4965;">Søk på Unsplash</span>
                        <span style="font-size:11px; color:#64748b;">Finn gratis arkivbilder fra Unsplash</span>
                    </div>
                </button>
                
                <button type="button" id="hkm-img-source-url" style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:12px; padding:14px 18px; cursor:pointer; text-align:left; transition:all 0.2s; display:flex; align-items:center; gap:14px; width:100%; box-sizing:border-box;">
                    <div style="background:#f0f9ff; padding:10px; border-radius:10px; display:flex; align-items:center; justify-content:center;">
                        <span class="material-symbols-outlined" style="font-size:24px; color:#0284c7;">link</span>
                    </div>
                    <div style="display:flex; flex-direction:column;">
                        <span style="font-size:14px; font-weight:700; color:#1B4965;">Sett inn med lenke</span>
                        <span style="font-size:11px; color:#64748b;">Lim inn en nettadresse til et bilde</span>
                    </div>
                </button>
            </div>
            
            <div id="hkm-url-input-container" style="display:none; flex-direction:column; gap:12px; border-top:1px solid #e2e8f0; padding-top:16px; animation: slideDown 0.2s ease;">
                <label style="font-size:12px; font-weight:700; color:#64748b;">BILDE-URL (Lenke til bilde på nett)</label>
                <div style="display:flex; gap:8px;">
                    <input type="url" id="hkm-img-url-field" placeholder="https://eksempel.no/bilde.jpg" style="flex:1; padding:10px 14px; border:1px solid #cbd5e1; border-radius:8px; font-size:14px; outline:none;" />
                    <button type="button" id="hkm-submit-img-url" style="background:#1B4965; color:white; border:none; border-radius:8px; padding:10px 16px; font-weight:700; font-size:14px; cursor:pointer; transition:background 0.2s;">Sett inn</button>
                </div>
            </div>
        `;
        
        modal.appendChild(card);
        this.mountEditorModal(modal, imageToReplace ? 'Endre bilde' : 'Sett inn bilde');
        
        // Trigger scale animation
        setTimeout(() => { card.style.transform = 'scale(1)'; }, 10);
        
        // Close modal helper
        const closeModal = () => {
            card.style.transform = 'scale(0.95)';
            modal.style.opacity = '0';
            setTimeout(() => modal.remove(), 200);
        };
        
        // Event Listeners
        modal.querySelector('#hkm-close-img-modal').addEventListener('click', closeModal);
        
        const uploadBtn = modal.querySelector('#hkm-img-source-upload');
        const unsplashBtn = modal.querySelector('#hkm-img-source-unsplash');
        const urlBtn = modal.querySelector('#hkm-img-source-url');
        const fileInput = modal.querySelector('#hkm-modal-file-input');
        
        uploadBtn.onmouseenter = () => { uploadBtn.style.borderColor = '#d17d39'; uploadBtn.style.background = '#fffbeb'; };
        uploadBtn.onmouseleave = () => { uploadBtn.style.borderColor = '#cbd5e1'; uploadBtn.style.background = '#f8fafc'; };
        
        unsplashBtn.onmouseenter = () => { unsplashBtn.style.borderColor = '#16a34a'; unsplashBtn.style.background = '#f0fdf4'; };
        unsplashBtn.onmouseleave = () => { unsplashBtn.style.borderColor = '#cbd5e1'; unsplashBtn.style.background = '#f8fafc'; };
        
        urlBtn.onmouseenter = () => { urlBtn.style.borderColor = '#0284c7'; urlBtn.style.background = '#f0f9ff'; };
        urlBtn.onmouseleave = () => { urlBtn.style.borderColor = '#cbd5e1'; urlBtn.style.background = '#f8fafc'; };
        
        // Handle device upload click
        uploadBtn.addEventListener('click', () => {
            if (fileInput) fileInput.click();
        });

        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                const file = e.target.files && e.target.files[0];
                if (file) {
                    closeModal();
                    if (imageToReplace) {
                        this.replaceEditorImageFromFile(imageToReplace, file);
                    } else {
                        this.uploadAndInsertImageFileAt(file, afterElement);
                    }
                }
            });
        }
        
        // Handle Unsplash search option click
        unsplashBtn.addEventListener('click', () => {
            closeModal();
            if (window.unsplashManager) {
                window.unsplashManager.open((selection) => {
                    if (selection && selection.url) {
                        if (imageToReplace) {
                            this.replaceEditorImageSource(imageToReplace, selection.url);
                            if (selection.alt) imageToReplace.alt = selection.alt;
                            if (typeof showToast === 'function') showToast("Bilde erstattet fra Unsplash!", "success");
                        } else {
                            const imgHtml = `<p><img src="${selection.url}" alt="${escapeHtml(selection.alt || '')}" class="block-img" style="max-width:100%; height:auto; border-radius:8px; margin: 16px 0; display: block;"></p><p><br></p>`;
                            this.insertHtmlAtCursorOrEndAt(imgHtml, afterElement);
                            if (typeof showToast === 'function') showToast("Bilde satt inn fra Unsplash!", "success");
                        }
                    }
                });
            } else {
                if (typeof showToast === 'function') showToast("Unsplash-søk er ikke tilgjengelig akkurat nå.", "warning");
            }
        });
        
        // Handle URL insertion option click
        urlBtn.addEventListener('click', () => {
            const urlContainer = modal.querySelector('#hkm-url-input-container');
            urlContainer.style.display = 'flex';
            modal.querySelector('#hkm-img-url-field').focus();
        });
        
        // Handle Submit Image URL click
        modal.querySelector('#hkm-submit-img-url').addEventListener('click', () => {
            const url = modal.querySelector('#hkm-img-url-field').value.trim();
            if (!url) {
                showToast("Vennligst oppgi en gyldig nettadresse.", "error");
                return;
            }
            
            if (imageToReplace) {
                this.replaceEditorImageSource(imageToReplace, url);
            } else {
                const imgHtml = `<p><img src="${url}" alt="" class="block-img" style="max-width:100%; height:auto; border-radius:8px; margin: 16px 0; display: block;"></p><p><br></p>`;
                this.insertHtmlAtCursorOrEndAt(imgHtml, afterElement);
            }
            closeModal();
            if (typeof showToast === 'function') {
                showToast(imageToReplace ? "Bilde erstattet!" : "Bilde satt inn!", "success");
            }
        });
    }

    replaceEditorImageSource(image, url) {
        if (!image || !url) return;
        image.src = url;
        image.setAttribute('src', url);
        const preview = document.querySelector('.inspector-image-preview');
        if (preview) preview.src = url;
        this.syncUnifiedBlocks();
        this.triggerAutosave();
    }

    async replaceEditorImageFromFile(image, file) {
        if (!image || !file) return;
        if (typeof showToast === 'function') showToast("Laster opp...", "info");

        try {
            let url = '';
            if (window.firebaseService?.uploadImage) {
                const uploadPath = `newsletter/images/${Date.now()}_${file.name}`;
                url = await window.firebaseService.uploadImage(file, uploadPath);
            } else {
                url = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });
            }

            this.replaceEditorImageSource(image, url);
            if (typeof showToast === 'function') showToast("Bilde erstattet!", "success");
        } catch (error) {
            console.error("Image replacement failed:", error);
            if (typeof showToast === 'function') showToast("Opplasting feilet.", "error");
        }
    }

    openVideoInsertionFlow() {
        this.openVideoInsertionFlowAt(null);
    }

    openVideoInsertionFlowAt(afterElement) {
        const existingModal = document.getElementById('hkm-video-selector-modal');
        if (existingModal) existingModal.remove();

        const modal = document.createElement('div');
        modal.id = 'hkm-video-selector-modal';
        modal.className = 'profile-modal';
        modal.style.cssText = `
            display: flex;
            position: fixed;
            inset: 0;
            background: rgba(15, 23, 42, 0.6);
            align-items: center;
            justify-content: center;
            backdrop-filter: blur(8px);
            font-family: 'Inter', sans-serif;
            padding: 16px;
            box-sizing: border-box;
        `;

        modal.innerHTML = `
            <div class="profile-modal-content card modern" style="width: min(100%, 500px); padding: 0; overflow: hidden; border-radius: 24px; background: white; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);">
                <div class="modal-header" style="background: linear-gradient(135deg, #1B4965, #0f172a); color: white; padding: 20px 24px; display: flex; align-items: center; justify-content: space-between;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <span class="material-symbols-outlined" aria-hidden="true" style="font-size: 24px;">play_circle</span>
                        <h3 style="margin: 0; font-size: 18px; font-weight: 700; color: white;">Sett inn YouTube-video</h3>
                    </div>
                    <button type="button" id="hkm-video-modal-close" aria-label="Lukk" style="background: none; border: none; color: white; cursor: pointer; display: flex; padding: 4px; border-radius: 50%;">
                        <span class="material-symbols-outlined" aria-hidden="true">close</span>
                    </button>
                </div>
                <div style="padding: 24px; background: white;">
                    <label for="hkm-video-url" style="display: block; margin-bottom: 8px; color: #1e293b; font-size: 13px; font-weight: 700;">YouTube-lenke</label>
                    <input type="url" id="hkm-video-url" value="https://www.youtube.com/watch?v=" placeholder="https://www.youtube.com/watch?v=..." autocomplete="url" style="width: 100%; padding: 12px 14px; border: 1.5px solid #cbd5e1; border-radius: 10px; font-size: 14px; outline: none; box-sizing: border-box;" />
                    <p style="margin: 8px 0 0; color: #64748b; font-size: 12px;">Lim inn en vanlig YouTube-, Shorts- eller youtu.be-lenke.</p>
                    <p id="hkm-video-url-error" role="alert" style="display: none; margin: 10px 0 0; color: #b91c1c; font-size: 13px; font-weight: 600;">Lenken er ikke en gyldig YouTube-lenke.</p>
                </div>
                <div class="modal-footer" style="padding: 16px 24px; border-top: 1px solid #f1f5f9; display: flex; justify-content: flex-end; gap: 10px; background: #f8fafc;">
                    <button type="button" id="hkm-video-modal-cancel" style="background: white; border: 1px solid #cbd5e1; color: #334155; padding: 10px 16px; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer;">Avbryt</button>
                    <button type="button" id="hkm-video-modal-insert" style="background: linear-gradient(135deg, #d17d39 0%, #bd4f2a 100%); border: none; color: white; padding: 10px 20px; border-radius: 10px; font-size: 14px; font-weight: 700; cursor: pointer;">Sett inn video</button>
                </div>
            </div>
        `;

        this.mountEditorModal(modal, 'Sett inn YouTube-video');

        const input = modal.querySelector('#hkm-video-url');
        const errorMessage = modal.querySelector('#hkm-video-url-error');
        const closeModal = () => modal.remove();
        const getVideoDetails = (rawUrl) => {
            let value = String(rawUrl || '').trim();
            if (!value) return null;
            if (!/^https?:\/\//i.test(value)) value = `https://${value}`;

            try {
                const parsed = new URL(value);
                const hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');
                let videoId = '';

                if (hostname === 'youtu.be') {
                    videoId = parsed.pathname.split('/').filter(Boolean)[0] || '';
                } else if (hostname === 'youtube.com' || hostname.endsWith('.youtube.com') || hostname === 'youtube-nocookie.com') {
                    const pathParts = parsed.pathname.split('/').filter(Boolean);
                    if (parsed.pathname === '/watch') {
                        videoId = parsed.searchParams.get('v') || '';
                    } else if (['embed', 'shorts', 'live'].includes(pathParts[0])) {
                        videoId = pathParts[1] || '';
                    }
                }

                if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) return null;
                return { videoId, url: parsed.href };
            } catch (error) {
                return null;
            }
        };

        const insertVideo = () => {
            const video = getVideoDetails(input.value);
            if (!video) {
                input.setAttribute('aria-invalid', 'true');
                input.style.borderColor = '#dc2626';
                errorMessage.style.display = 'block';
                input.focus();
                return;
            }

            const safeUrl = escapeHtml(video.url);
            const thumbnailUrl = `https://img.youtube.com/vi/${video.videoId}/maxresdefault.jpg`;
            const html = `
                <div class="newsletter-video-block" contenteditable="false" style="position: relative; text-align: center; margin: 24px 0;">
                    <a href="${safeUrl}" target="_blank" rel="noopener noreferrer" style="display: block; position: relative; max-width: 600px; margin: 0 auto; text-decoration: none;">
                        <img src="${thumbnailUrl}" style="width: 100%; height: auto; border-radius: 12px; display: block; box-shadow: 0 4px 12px rgba(0,0,0,0.15);" alt="Video">
                        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 68px; height: 68px; background: rgba(27, 73, 101, 0.95); border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 20px rgba(0,0,0,0.35);">
                            <span style="color: white; font-size: 28px; margin-left: 6px; font-family: system-ui, sans-serif;">▶</span>
                        </div>
                    </a>
                </div><p><br></p>`;

            this.insertHtmlAtCursorOrEndAt(html, afterElement);
            closeModal();
            if (typeof showToast === 'function') showToast("Video satt inn!", "success");
        };

        modal.querySelector('#hkm-video-modal-close').addEventListener('click', closeModal);
        modal.querySelector('#hkm-video-modal-cancel').addEventListener('click', closeModal);
        modal.querySelector('#hkm-video-modal-insert').addEventListener('click', insertVideo);
        modal.addEventListener('click', (event) => {
            if (event.target === modal) closeModal();
        });
        input.addEventListener('input', () => {
            input.removeAttribute('aria-invalid');
            input.style.borderColor = '#cbd5e1';
            errorMessage.style.display = 'none';
        });
        input.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                insertVideo();
            }
        });
        setTimeout(() => {
            input.focus();
            input.setSelectionRange(input.value.length, input.value.length);
        }, 0);
    }

    addBlock(type) {
        let html = '';
        switch (type) {
            case 'header':
                html = `<h2 style="font-family: 'Inter', sans-serif; font-size: 22px; font-weight: 700; color: #1B4965; margin: 24px 0 12px 0;">Overskrift her</h2><p><br></p>`;
                break;
            case 'text':
                html = `<p style="font-family: 'Inter', sans-serif; font-size: 15px; line-height: 1.6; color: #334155; margin: 16px 0;">Skriv din tekst her...</p><p><br></p>`;
                break;
            case 'divider':
                html = `
                    <div class="newsletter-divider-block" contenteditable="false" style="position: relative; margin: 24px 0; padding: 12px 0;">
                        <hr style="border: none; border-top: 2px solid #e2e8f0; margin: 0;">
                    </div><p><br></p>`;
                break;
            case 'spacer':
                html = `
                    <div class="newsletter-spacer-block" contenteditable="false" style="position: relative; margin: 12px 0; padding: 6px; border: 1px dashed #cbd5e1; border-radius: 8px; text-align: center; color: #94a3b8; font-size: 12px;">
                        <div style="height: 24px; display: flex; align-items: center; justify-content: center;">Avstand (24px)</div>
                    </div><p><br></p>`;
                break;
            case 'button':
                this.openButtonInsertionFlow();
                return;
            case 'columns':
                html = `
                    <div class="newsletter-columns-block" contenteditable="false" style="position: relative; margin: 24px 0; padding: 8px; border: 1px dashed #cbd5e1; border-radius: 12px;">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
                            <div contenteditable="true" style="min-height: 50px; padding: 12px; border: 1px dashed #e2e8f0; border-radius: 8px; background: white;">Venstre kolonne...</div>
                            <div contenteditable="true" style="min-height: 50px; padding: 12px; border: 1px dashed #e2e8f0; border-radius: 8px; background: white;">Høyre kolonne...</div>
                        </div>
                    </div><p><br></p>`;
                break;
            case 'image':
            case 'logo':
                this.openImageInsertionFlow();
                return;
            case 'social':
                this.openSocialInsertionFlow();
                return;
            case 'product':
                this.openProductInsertionFlow();
                return;
            case 'event':
                this.openEventInsertionFlow();
                return;
            case 'video':
                this.openVideoInsertionFlow();
                return;
            case 'html':
                const customHtml = prompt("Lim inn din egendefinerte HTML-kode her:", "<div style='padding: 20px; background: #f8fafc; border-radius: 8px; text-align: center; border: 1px dashed #cbd5e1;'>Egendefinert HTML</div>");
                if (!customHtml) return;
                html = `<div class="newsletter-html-block" contenteditable="false" style="margin: 24px 0; font-family: 'Inter', sans-serif;">${customHtml}</div><p><br></p>`;
                break;
            case 'subscribe':
                html = `
                    <div class="newsletter-subscribe-block" contenteditable="false" style="padding: 32px 24px; background-color: #f8fafc; border-radius: 16px; text-align: center; margin: 24px 0; border: 1px solid #e2e8f0; font-family: 'Inter', sans-serif; box-sizing: border-box;">
                        <h3 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 700; color: #1B4965; font-family: 'Inter', sans-serif;">Abonner på vårt nyhetsbrev</h3>
                        <p style="margin: 0 0 20px 0; font-size: 14px; color: #64748b; font-family: 'Inter', sans-serif; line-height: 1.5;">Motta ukentlige oppmuntringer og oppdateringer direkte i din innboks.</p>
                        <div style="display: flex; gap: 8px; justify-content: center; max-width: 400px; margin: 0 auto; flex-wrap: wrap;">
                            <input type="email" placeholder="Din e-postadresse" style="flex: 1; min-width: 200px; padding: 12px 16px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 14px; outline: none; box-sizing: border-box;" disabled>
                            <button style="background-color: #d17d39; color: white; padding: 12px 24px; border: none; border-radius: 8px; font-weight: 600; font-size: 14px; cursor: default; font-family: 'Inter', sans-serif;">Meld deg på</button>
                        </div>
                    </div><p><br></p>`;
                break;
            case 'link':
                const linkText = prompt("Lenketekst:", "Les mer her");
                if (!linkText) return;
                const linkUrl = prompt("Lenke-URL:", "https://");
                if (!linkUrl) return;
                html = `<p style="text-align: center; margin: 16px 0; font-family: 'Inter', sans-serif;"><a href="${linkUrl}" target="_blank" style="color: #d17d39; text-decoration: underline; font-weight: 600; font-family: 'Inter', sans-serif;">${linkText}</a></p><p><br></p>`;
                break;
            default:
                return;
        }

        if (html) {
            this.insertHtmlAtCursorOrEnd(html);
        }
    }

    openProductInsertionFlow() {
        this.openProductInsertionFlowAt(null);
    }

    openProductInsertionFlowAt(afterElement) {
        let modal = document.getElementById('hkm-product-selector-modal');
        if (modal) modal.remove();

        modal = document.createElement('div');
        modal.id = 'hkm-product-selector-modal';
        modal.className = 'profile-modal';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-label', 'Sett inn butikkprodukt');
        modal.style.cssText = `
            display: flex;
            z-index: 200000;
            position: fixed;
            inset: 0;
            background: rgba(15, 23, 42, 0.6);
            align-items: center;
            justify-content: center;
            backdrop-filter: blur(8px);
            font-family: 'Inter', sans-serif;
        `;

        modal.innerHTML = `
            <div class="profile-modal-content card modern" style="max-width: 500px; padding: 0; overflow: hidden; border-radius: 24px; background: white; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); width: 90%; max-height: 85vh; display: flex; flex-direction: column;">
                <div class="modal-header" style="background: linear-gradient(135deg, #d17d39, #bd4f2a); color: white; padding: 20px 24px; display: flex; align-items: center; justify-content: space-between; border-bottom: none;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <div style="background: rgba(255,255,255,0.1); width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center;">
                            <span class="material-symbols-outlined" style="font-size: 20px; color: white;">shopping_bag</span>
                        </div>
                        <h3 style="margin: 0; font-size: 18px; font-weight: 700; color: white; letter-spacing: -0.01em;">Sett inn butikkprodukt</h3>
                    </div>
                    <button id="hkm-product-modal-close" style="background: none; border: none; color: white; opacity: 0.8; cursor: pointer; display: flex; align-items: center; padding: 4px; border-radius: 50%; transition: all 0.2s;"><span class="material-symbols-outlined" style="font-size: 22px;">close</span></button>
                </div>
                <div style="padding: 16px 24px; border-bottom: 1px solid #f1f5f9; display: flex; gap: 12px; align-items: center; background: #f8fafc;">
                    <div style="position: relative; flex: 1;">
                        <span class="material-symbols-outlined" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #64748b; font-size: 20px;">search</span>
                        <input type="text" id="hkm-product-search-input" placeholder="Søk etter produkter..." style="width: 100%; padding: 10px 12px 10px 40px; border: 1px solid #e2e8f0; border-radius: 10px; font-size: 14px; font-weight: 500; outline: none; transition: border-color 0.2s, box-shadow: 0.2s; box-sizing: border-box; background: white;" />
                    </div>
                </div>
                <div id="hkm-product-results" style="padding: 20px 24px; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 10px; min-height: 250px; max-height: 380px; background: white;">
                    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 48px 0; color: #94a3b8; gap: 12px;">
                        <div style="width: 24px; height: 24px; border: 3px solid #e2e8f0; border-top-color: #d17d39; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                        <span style="font-size: 14px; font-weight: 500;">Henter produkter fra butikken...</span>
                    </div>
                </div>
                <div class="modal-footer" style="padding: 16px 24px; border-top: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; background: #f8fafc; border-bottom-left-radius: 24px; border-bottom-right-radius: 24px;">
                    <span id="hkm-product-selected-count" style="font-size: 13px; font-weight: 600; color: #64748b;">Ingen produkter valgt</span>
                    <div style="display: flex; gap: 10px;">
                        <button id="hkm-product-modal-cancel" style="background: white; border: 1px solid #cbd5e1; color: #334155; padding: 10px 16px; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s;">Avbryt</button>
                        <button id="hkm-product-modal-insert" style="background: linear-gradient(135deg, #d17d39 0%, #bd4f2a 100%); border: none; color: white; padding: 10px 18px; border-radius: 10px; font-size: 14px; font-weight: 700; cursor: pointer; opacity: 0.5; pointer-events: none; transition: all 0.2s; box-shadow: 0 4px 6px -1px rgba(209, 125, 57, 0.25);">Sett inn valgte</button>
                    </div>
                </div>
                <style>
                    #hkm-product-results::-webkit-scrollbar {
                        width: 6px;
                    }
                    #hkm-product-results::-webkit-scrollbar-thumb {
                        background: #cbd5e1;
                        border-radius: 3px;
                    }
                    .hkm-product-item {
                        transition: all 0.2s ease;
                    }
                    .hkm-product-item:hover {
                        background: #f8fafc !important;
                        border-color: #cbd5e1 !important;
                        transform: translateY(-1px);
                        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
                    }
                    .hkm-product-item:hover .material-symbols-outlined {
                        color: #d17d39 !important;
                    }
                    #hkm-product-modal-cancel:hover {
                        background: #f1f5f9 !important;
                        border-color: #94a3b8 !important;
                    }
                    #hkm-product-modal-cancel:active {
                        transform: scale(0.97) !important;
                    }
                    #hkm-product-modal-insert:hover {
                        filter: brightness(1.05) !important;
                    }
                    #hkm-product-modal-insert:active {
                        transform: scale(0.97) !important;
                    }
                </style>
            </div>
        `;

        this.mountEditorModal(modal, 'Sett inn butikkprodukt');

        const closeBtn = document.getElementById('hkm-product-modal-close');
        const cancelBtn = document.getElementById('hkm-product-modal-cancel');
        const insertBtn = document.getElementById('hkm-product-modal-insert');
        const searchInput = document.getElementById('hkm-product-search-input');
        const resultsContainer = document.getElementById('hkm-product-results');
        const countText = document.getElementById('hkm-product-selected-count');

        const closeModal = () => {
            modal.remove();
        };

        closeBtn.onclick = closeModal;
        cancelBtn.onclick = closeModal;
        modal.onclick = (e) => {
            if (e.target === modal) closeModal();
        };
        searchInput?.focus();

        const escapeHtml = (str) => {
            if (!str) return '';
            return str
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
        };

        let productsList = window.hkmWixProductsCache || [];
        const selectedProductsMap = new Map();

        const updateSelectionUI = () => {
            const count = selectedProductsMap.size;
            if (countText) {
                countText.textContent = count === 0 
                    ? 'Ingen produkter valgt' 
                    : `${count} ${count === 1 ? 'produkt' : 'produkter'} valgt`;
            }
            
            if (insertBtn) {
                if (count > 0) {
                    insertBtn.style.opacity = '1';
                    insertBtn.style.pointerEvents = 'auto';
                } else {
                    insertBtn.style.opacity = '0.5';
                    insertBtn.style.pointerEvents = 'none';
                }
            }
        };

        const renderProducts = (query = '') => {
            const q = query.trim().toLowerCase();
            let filtered = productsList;

            if (q) {
                let searchTerms = [q];
                if (q.includes('genser') || q.includes('hoodie') || q.includes('hette')) {
                    searchTerms = ['genser', 'hoodie', 'hette', 'sweatshirt'];
                } else if (q.includes('t-skjorte') || q.includes('tskjorte') || q.includes('t-shirt') || q.includes('tee') || (q.includes('skjorte') && !q.includes('hette'))) {
                    searchTerms = ['t-skjorte', 't-shirt', 'tee', 'skjorte'];
                } else if (q.includes('plakat') || q.includes('poster') || q.includes('trykk')) {
                    searchTerms = ['plakat', 'poster', 'trykk', 'print'];
                } else if (q.includes('klistremerke') || q.includes('sticker')) {
                    searchTerms = ['klistremerke', 'sticker'];
                } else if (q.includes('bag') || q.includes('veske') || q.includes('tote')) {
                    searchTerms = ['bag', 'veske', 'tote', 'handlenett'];
                } else if (q.includes('bok') || q.includes('book') || q.includes('fargelegg')) {
                    searchTerms = ['bok', 'book', 'fargelegg', 'coloring'];
                }

                filtered = productsList.filter(p => {
                    const nameLower = (p.name || '').toLowerCase();
                    const descLower = (p.description || '').toLowerCase();
                    return searchTerms.some(term => nameLower.includes(term) || descLower.includes(term)) || nameLower.includes(q);
                });
            }

            if (filtered.length === 0) {
                resultsContainer.innerHTML = `
                    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 48px 0; color: #94a3b8; gap: 8px;">
                        <span class="material-symbols-outlined" style="font-size: 36px; color: #cbd5e1;">search_off</span>
                        <span style="font-size: 14px; font-weight: 500; text-align: center;">Ingen produkter funnet ${q ? `for "${escapeHtml(q)}"` : ''}</span>
                    </div>
                `;
                return;
            }

            resultsContainer.innerHTML = filtered.map(p => {
                const slug = p.slug || p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                const isSelected = selectedProductsMap.has(slug);
                const img = p.imageUrl 
                    ? `<img src="${p.imageUrl}" style="width: 44px; height: 44px; object-fit: cover; border-radius: 8px; border: 1px solid #e2e8f0;" />`
                    : `<div style="width: 44px; height: 44px; border-radius: 8px; background: #f1f5f9; border: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: center; font-size: 18px;">🛍️</div>`;
                
                const itemStyles = isSelected 
                    ? 'border-color: #d17d39 !important; background: #fffcf8 !important; box-shadow: 0 4px 6px -1px rgba(209, 125, 57, 0.05);' 
                    : 'background: #ffffff;';
                
                const iconStyles = isSelected 
                    ? 'color: #d17d39 !important;' 
                    : 'color: #94a3b8;';
                
                const iconName = isSelected ? 'check_circle' : 'radio_button_unchecked';
                
                return `
                    <div class="hkm-product-item" data-slug="${slug}" style="display: flex; align-items: center; gap: 14px; padding: 10px 14px; border: 1px solid #e2e8f0; border-radius: 12px; cursor: pointer; transition: all 0.2s; ${itemStyles}">
                        ${img}
                        <div style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px;">
                            <span style="font-size: 13.5px; font-weight: 600; color: #1e293b; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(p.name)}</span>
                            <span style="font-size: 12px; color: #d17d39; font-weight: 700;">kr ${p.price || 'N/A'},-</span>
                        </div>
                        <span class="material-symbols-outlined" style="font-size: 20px; transition: all 0.2s; ${iconStyles}">${iconName}</span>
                    </div>
                `;
            }).join('');

            resultsContainer.querySelectorAll('.hkm-product-item').forEach(item => {
                const slug = item.dataset.slug;
                const product = filtered.find(p => {
                    const s = p.slug || p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                    return s === slug;
                });

                item.onclick = () => {
                    if (selectedProductsMap.has(slug)) {
                        selectedProductsMap.delete(slug);
                    } else {
                        selectedProductsMap.set(slug, product);
                    }
                    updateSelectionUI();
                    renderProducts(searchInput.value);
                };
            });
        };

        insertBtn.onclick = () => {
            let combinedHtml = '';
            selectedProductsMap.forEach((p) => {
                const productId = p.id || p._id || '';
                const productUrl = resolveHkdProductUrl(p);

                const image = p.imageUrl || '';
                combinedHtml += `
                    <div class="newsletter-product-card" contenteditable="false" data-product-id="${escapeHtml(productId)}" data-product-url="${escapeHtml(productUrl)}">
                        <button class="card-delete-btn" title="Slett produkt">×</button>
                        <div class="product-img-wrap">
                            <a href="${productUrl}" target="_blank" style="text-decoration: none; display: block;">
                                <img src="${image || 'https://hiskingdomdesigns.no/placeholder.png'}" alt="${escapeHtml(p.name)}" />
                            </a>
                        </div>
                        <div class="product-info">
                            <h4 class="product-title">
                                <a href="${productUrl}" target="_blank" style="color: inherit; text-decoration: none;">${escapeHtml(p.name)}</a>
                            </h4>
                            <span class="product-price">kr ${p.price || 'N/A'},-</span>
                            <div style="margin-top: 4px;">
                                <a href="${productUrl}" target="_blank" class="product-cta-btn">Se produkt</a>
                            </div>
                        </div>
                    </div>
                `;
            });
            if (combinedHtml) {
                combinedHtml += '<p><br></p>';
            }

            this.insertHtmlAtCursorOrEndAt(combinedHtml, afterElement);
            closeModal();
            showToast(`${selectedProductsMap.size} ${selectedProductsMap.size === 1 ? 'produkt' : 'produkter'} satt inn!`, "success");
        };

        const loadProducts = async () => {
            const fallbackProducts = [
                {
                    id: "e8def42a-7ad8-4faf-acc0-6588fe3bfbd4",
                    name: "Norgeskoppen - White 12oz Enamel Mug",
                    price: "249",
                    imageUrl: "https://static.wixstatic.com/media/db4f96_2e012335b82e4405ba0e4ca09cb6f915~mv2.png/v1/fit/w_1000,h_1000,q_90/file.png",
                    description: "En slitesterk og lett emaljekopp som passer perfekt til tur, camping eller morgenkaffen.",
                    productUrl: "https://www.hiskingdomdesigns.no/produkt/e8def42a-7ad8-4faf-acc0-6588fe3bfbd4"
                },
                {
                    id: "bd1199a0-eeb8-4760-8997-aaca8ba85c51",
                    name: "NORGE Brodert på Økologisk bøttehatt | Beechfield B90N",
                    price: "365",
                    imageUrl: "https://static.wixstatic.com/media/db4f96_6fc1d0d498e2415aae57aff3d5de5c99~mv2.png/v1/fit/w_1000,h_1000,q_90/file.png",
                    description: "Klassisk økologisk bøttehatt brodert med Norge-motiv. Gir god solbeskyttelse med stil.",
                    productUrl: "https://www.hiskingdomdesigns.no/produkt/bd1199a0-eeb8-4760-8997-aaca8ba85c51"
                },
                {
                    id: "0d5de5f7-f765-4616-aefb-91edcbc87ff6",
                    name: "FAITH OVER FEAR - Classic Matte Paper Poster",
                    price: "139",
                    imageUrl: "https://static.wixstatic.com/media/db4f96_74c605681f6c413d929793be3d51d2f3~mv2.png/v1/fit/w_1000,h_1000,q_90/file.png",
                    description: "En moderne kunstplakat med et sterkt budskap trykket på matt papir av høy kvalitet.",
                    productUrl: "https://www.hiskingdomdesigns.no/produkt/0d5de5f7-f765-4616-aefb-91edcbc87ff6"
                },
                {
                    id: "95140892-0665-4664-8e2b-0621e6f7fe26",
                    name: "QUEEN BEE 11oz Ceramic Mug",
                    price: "199",
                    imageUrl: "https://static.wixstatic.com/media/db4f96_949de42b3a0d4645985f6e40c82d8b82~mv2.png/v1/fit/w_1000,h_1000,q_90/file.png",
                    description: "En blank, hvit keramikkopp som tåler både oppvaskmaskin og mikrobølgeovn.",
                    productUrl: "https://www.hiskingdomdesigns.no/produkt/95140892-0665-4664-8e2b-0621e6f7fe26"
                }
            ];

            if (productsList.length > 0) {
                renderProducts();
                return;
            }

            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 8000);
                try {
                    const res = await fetch('https://hiskingdomdesigns.no/api/get-wix-products', {
                        signal: controller.signal
                    });
                    const data = await res.json();
                    if (data.success && Array.isArray(data.products) && data.products.length > 0) {
                        window.hkmWixProductsCache = data.products.sort((a, b) => a.name.localeCompare(b.name));
                        productsList = window.hkmWixProductsCache;
                        renderProducts();
                        return;
                    }
                } finally {
                    clearTimeout(timeoutId);
                }
            } catch (err) {
                console.warn("Could not fetch live Wix products, trying Firestore fallback...", err);
            }

            if (window.firebaseService?.isInitialized) {
                try {
                    const doc = await window.firebaseService.getPageContent('wix_products');
                    if (doc && Array.isArray(doc.items) && doc.items.length > 0) {
                        window.hkmWixProductsCache = doc.items.filter(p => p.inStock !== false).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
                        productsList = window.hkmWixProductsCache;
                        renderProducts();
                        return;
                    }
                } catch (fsErr) {
                    console.warn("Firestore product fallback failed:", fsErr);
                }
            }

            // Fallback catalog guarantees products are ALWAYS available to insert
            window.hkmWixProductsCache = fallbackProducts;
            productsList = window.hkmWixProductsCache;
            renderProducts();
        };

        searchInput.oninput = (e) => {
            renderProducts(e.target.value);
        };

        loadProducts();
    }

    openEventInsertionFlow() {
        this.openEventInsertionFlowAt(null);
    }

    openEventInsertionFlowAt(afterElement) {
        let modal = document.getElementById('hkm-event-selector-modal');
        if (modal) modal.remove();

        modal = document.createElement('div');
        modal.id = 'hkm-event-selector-modal';
        modal.className = 'profile-modal';
        modal.style.cssText = `
            display: flex;
            z-index: 11000;
            position: fixed;
            inset: 0;
            background: rgba(15, 23, 42, 0.6);
            align-items: center;
            justify-content: center;
            backdrop-filter: blur(8px);
            font-family: 'Inter', sans-serif;
        `;

        modal.innerHTML = `
            <div class="profile-modal-content card modern" style="max-width: 500px; padding: 0; overflow: hidden; border-radius: 24px; background: white; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); width: 90%; max-height: 85vh; display: flex; flex-direction: column;">
                <div class="modal-header" style="background: linear-gradient(135deg, #d17d39, #bd4f2a); color: white; padding: 20px 24px; display: flex; align-items: center; justify-content: space-between; border-bottom: none;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <div style="background: rgba(255,255,255,0.1); width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center;">
                            <span class="material-symbols-outlined" style="font-size: 20px; color: white;">calendar_today</span>
                        </div>
                        <h3 style="margin: 0; font-size: 18px; font-weight: 700; color: white; letter-spacing: -0.01em;">Sett inn arrangement</h3>
                    </div>
                    <button id="hkm-event-modal-close" style="background: none; border: none; color: white; opacity: 0.8; cursor: pointer; display: flex; align-items: center; padding: 4px; border-radius: 50%; transition: all 0.2s;"><span class="material-symbols-outlined" style="font-size: 22px;">close</span></button>
                </div>
                <div style="padding: 16px 24px; border-bottom: 1px solid #f1f5f9; display: flex; gap: 12px; align-items: center; background: #f8fafc;">
                    <div style="position: relative; flex: 1;">
                        <span class="material-symbols-outlined" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #64748b; font-size: 20px;">search</span>
                        <input type="text" id="hkm-event-search-input" placeholder="Søk etter arrangementer..." style="width: 100%; padding: 10px 12px 10px 40px; border: 1px solid #e2e8f0; border-radius: 10px; font-size: 14px; font-weight: 500; outline: none; transition: border-color 0.2s, box-shadow: 0.2s; box-sizing: border-box; background: white;" />
                    </div>
                </div>
                <div id="hkm-event-results" style="padding: 20px 24px; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 10px; min-height: 250px; max-height: 380px; background: white;">
                    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 48px 0; color: #94a3b8; gap: 12px;">
                        <div style="width: 24px; height: 24px; border: 3px solid #e2e8f0; border-top-color: #d17d39; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                        <span style="font-size: 14px; font-weight: 500;">Henter arrangementer...</span>
                    </div>
                </div>
                <div class="modal-footer" style="padding: 16px 24px; border-top: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; background: #f8fafc; border-bottom-left-radius: 24px; border-bottom-right-radius: 24px;">
                    <span id="hkm-event-selected-count" style="font-size: 13px; font-weight: 600; color: #64748b;">Ingen arrangementer valgt</span>
                    <div style="display: flex; gap: 10px;">
                        <button id="hkm-event-modal-cancel" style="background: white; border: 1px solid #cbd5e1; color: #334155; padding: 10px 16px; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s;">Avbryt</button>
                        <button id="hkm-event-modal-insert" style="background: linear-gradient(135deg, #d17d39 0%, #bd4f2a 100%); border: none; color: white; padding: 10px 18px; border-radius: 10px; font-size: 14px; font-weight: 700; cursor: pointer; opacity: 0.5; pointer-events: none; transition: all 0.2s; box-shadow: 0 4px 6px -1px rgba(209, 125, 57, 0.25);">Sett inn valgte</button>
                    </div>
                </div>
                <style>
                    #hkm-event-results::-webkit-scrollbar {
                        width: 6px;
                    }
                    #hkm-event-results::-webkit-scrollbar-thumb {
                        background: #cbd5e1;
                        border-radius: 3px;
                    }
                    .hkm-event-item {
                        transition: all 0.2s ease;
                    }
                    .hkm-event-item:hover {
                        background: #f8fafc !important;
                        border-color: #cbd5e1 !important;
                        transform: translateY(-1px);
                        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
                    }
                    .hkm-event-item:hover .material-symbols-outlined {
                        color: #d17d39 !important;
                    }
                    #hkm-event-modal-cancel:hover {
                        background: #f1f5f9 !important;
                        border-color: #94a3b8 !important;
                    }
                    #hkm-event-modal-cancel:active {
                        transform: scale(0.97) !important;
                    }
                    #hkm-event-modal-insert:hover {
                        filter: brightness(1.05) !important;
                    }
                    #hkm-event-modal-insert:active {
                        transform: scale(0.97) !important;
                    }
                </style>
            </div>
        `;

        this.mountEditorModal(modal, 'Sett inn arrangement');

        const closeBtn = document.getElementById('hkm-event-modal-close');
        const cancelBtn = document.getElementById('hkm-event-modal-cancel');
        const insertBtn = document.getElementById('hkm-event-modal-insert');
        const searchInput = document.getElementById('hkm-event-search-input');
        const resultsContainer = document.getElementById('hkm-event-results');
        const countText = document.getElementById('hkm-event-selected-count');

        const closeModal = () => {
            modal.remove();
        };

        closeBtn.onclick = closeModal;
        cancelBtn.onclick = closeModal;
        modal.onclick = (e) => {
            if (e.target === modal) closeModal();
        };

        const escapeHtml = (str) => {
            if (!str) return '';
            return str
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
        };

        let eventsList = [];
        const selectedEventsMap = new Map();

        const updateSelectionUI = () => {
            const count = selectedEventsMap.size;
            if (countText) {
                countText.textContent = count === 0 
                    ? 'Ingen arrangementer valgt' 
                    : `${count} ${count === 1 ? 'arrangement' : 'arrangementer'} valgt`;
            }
            
            if (insertBtn) {
                if (count > 0) {
                    insertBtn.style.opacity = '1';
                    insertBtn.style.pointerEvents = 'auto';
                } else {
                    insertBtn.style.opacity = '0.5';
                    insertBtn.style.pointerEvents = 'none';
                }
            }
        };

        const renderEvents = (query = '') => {
            const q = query.trim().toLowerCase();
            let filtered = eventsList;

            if (q) {
                filtered = eventsList.filter(e => {
                    const titleLower = (e.title || '').toLowerCase();
                    const descLower = (e.description || e.content || e.excerpt || '').toLowerCase();
                    return titleLower.includes(q) || descLower.includes(q);
                });
            }

            if (filtered.length === 0) {
                resultsContainer.innerHTML = `
                    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 48px 0; color: #94a3b8; gap: 8px;">
                        <span class="material-symbols-outlined" style="font-size: 36px; color: #cbd5e1;">search_off</span>
                        <span style="font-size: 14px; font-weight: 500; text-align: center;">Ingen arrangementer funnet ${q ? `for "${escapeHtml(q)}"` : ''}</span>
                    </div>
                `;
                return;
            }

            resultsContainer.innerHTML = filtered.map(e => {
                const title = e.title || 'Uten tittel';
                const key = e.id || `${title}|${e.start || e.date || ''}`;
                const isSelected = selectedEventsMap.has(key);
                
                const startDate = (e.date || e.start) ? new Date(e.date || e.start) : null;
                const formattedDate = startDate ? startDate.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' }) : 'Dato mangler';
                const timeStr = e.time || (startDate && e.start && e.start.includes('T') ? startDate.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' }) : '');
                
                const imgUrl = e.imageUrl || e.image || e.dashboardImage || e.imageLink;
                const img = imgUrl 
                    ? `<img src="${imgUrl}" style="width: 44px; height: 44px; object-fit: cover; border-radius: 8px; border: 1px solid #e2e8f0;" />`
                    : `<div style="width: 44px; height: 44px; border-radius: 8px; background: #f1f5f9; border: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: center; font-size: 18px;">📅</div>`;
                
                const itemStyles = isSelected 
                    ? 'border-color: #1B4965 !important; background: #f0f6fa !important; box-shadow: 0 4px 6px -1px rgba(27, 73, 101, 0.05);' 
                    : 'background: #ffffff;';
                
                const iconStyles = isSelected 
                    ? 'color: #1B4965 !important;' 
                    : 'color: #94a3b8;';
                
                const iconName = isSelected ? 'check_circle' : 'radio_button_unchecked';
                
                return `
                    <div class="hkm-event-item" data-key="${escapeHtml(key)}" style="display: flex; align-items: center; gap: 14px; padding: 10px 14px; border: 1px solid #e2e8f0; border-radius: 12px; cursor: pointer; transition: all 0.2s; ${itemStyles}">
                        ${img}
                        <div style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px;">
                            <span style="font-size: 13.5px; font-weight: 600; color: #1e293b; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(title)}</span>
                            <span style="font-size: 12px; color: #d17d39; font-weight: 700;">${formattedDate} ${timeStr ? `kl. ${timeStr}` : ''}</span>
                        </div>
                        <span class="material-symbols-outlined" style="font-size: 20px; transition: all 0.2s; ${iconStyles}">${iconName}</span>
                    </div>
                `;
            }).join('');

            resultsContainer.querySelectorAll('.hkm-event-item').forEach(item => {
                const key = item.dataset.key;
                const eventObj = filtered.find(e => {
                    const k = e.id || `${e.title || 'event'}|${e.start || e.date || ''}`;
                    return k === key;
                });

                item.onclick = () => {
                    if (selectedEventsMap.has(key)) {
                        selectedEventsMap.delete(key);
                    } else {
                        selectedEventsMap.set(key, eventObj);
                    }
                    updateSelectionUI();
                    renderEvents(searchInput.value);
                };
            });
        };

        insertBtn.onclick = () => {
            try {
                if (!selectedEventsMap || selectedEventsMap.size === 0) {
                    showToast("Velg minst ett arrangement", "warning");
                    return;
                }

                let combinedHtml = '';
                selectedEventsMap.forEach((e) => {
                    if (!e) return;
                    const title = e.title || 'Uten tittel';
                    const key = e.id || `${title}|${e.start || e.date || ''}`;
                    const image = e.imageUrl || e.image || e.dashboardImage || e.imageLink || 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80';
                    
                    const rawDateStr = e.date || e.start || e.startDate || e.createdAt;
                    let startDate = null;
                    if (rawDateStr) {
                        const parsed = new Date(rawDateStr);
                        if (!isNaN(parsed.getTime())) startDate = parsed;
                    }

                    const day = startDate ? startDate.getDate() : '--';
                    let monthStr = '--';
                    if (startDate) {
                        try {
                            monthStr = startDate.toLocaleString('nb-NO', { month: 'short' }).replace('.', '').toUpperCase();
                        } catch(err) {
                            monthStr = '--';
                        }
                    }
                    const dateBadge = `${day}. ${monthStr}`;

                    let formattedDate = '';
                    if (startDate) {
                        try {
                            formattedDate = startDate.toLocaleDateString('nb-NO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
                        } catch(err) {
                            formattedDate = '';
                        }
                    }

                    let timeStr = e.time || '';
                    if (!timeStr && startDate && typeof e.start === 'string' && e.start.includes('T')) {
                        try {
                            timeStr = startDate.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' });
                        } catch(err) {
                            timeStr = '';
                        }
                    }
                    const timeLabel = (formattedDate ? formattedDate : '') + (timeStr ? ` kl. ${timeStr}` : '');
                    
                    const location = e.location || e.place || '';
                    const detailsUrl = `https://www.hiskingdomministry.no/arrangement-detaljer.html?id=${encodeURIComponent(key)}`;

                    combinedHtml += `
                        <div class="newsletter-event-card" contenteditable="false" style="position: relative; display: flex; flex-direction: row; gap: 20px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 16px; background: #ffffff; margin: 16px auto; max-width: 560px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03); align-items: center; text-align: left; font-family: 'Inter', system-ui, sans-serif; box-sizing: border-box; width: 100%;">
                            <button class="card-delete-btn" style="position: absolute; top: -10px; right: -10px; width: 24px; height: 24px; border-radius: 50%; background: #ef4444; border: 2px solid white; color: white; font-size: 14px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.15); z-index: 100;" title="Slett arrangement">×</button>
                            <div style="flex: 0 0 100px; width: 100px; height: 100px; border-radius: 12px; overflow: hidden; background: #f8fafc; display: flex; align-items: center; justify-content: center; border: 1px solid #f1f5f9; position: relative;">
                                <img src="${image}" style="width: 100%; height: 100%; object-fit: cover; display: block;" />
                                <div style="position: absolute; bottom: 0; left: 0; right: 0; background: rgba(27, 73, 101, 0.95); color: white; text-align: center; padding: 4px 0; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">
                                    ${dateBadge}
                                </div>
                            </div>
                            <div style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6px;">
                                <h4 style="margin: 0; font-size: 16px; font-weight: 700; color: #1B4965; line-height: 1.3; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(title)}</h4>
                                <div style="display: flex; align-items: center; gap: 6px; color: #64748b; font-size: 13px; font-weight: 500;">
                                    <span class="material-symbols-outlined" style="font-size: 16px; color: #d17d39;">schedule</span>
                                    <span>${timeLabel || 'Tidspunkt kommer'}</span>
                                </div>
                                ${location ? `
                                <div style="display: flex; align-items: center; gap: 6px; color: #64748b; font-size: 13px; font-weight: 500;">
                                    <span class="material-symbols-outlined" style="font-size: 16px; color: #d17d39;">location_on</span>
                                    <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(location)}</span>
                                </div>
                                ` : ''}
                                <div style="margin-top: 6px;">
                                    <a href="${detailsUrl}" target="_blank" style="display: inline-block; background: #1B4965; color: white; padding: 8px 18px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 12px; transition: all 0.2s; box-shadow: 0 2px 4px rgba(27, 73, 101, 0.2);">Les mer & Påmelding</a>
                                </div>
                            </div>
                        </div>
                    `;
                });

                if (combinedHtml) {
                    combinedHtml += '<p><br></p>';
                    this.insertHtmlAtCursorOrEndAt(combinedHtml, afterElement);
                    closeModal();
                    showToast(`${selectedEventsMap.size} ${selectedEventsMap.size === 1 ? 'arrangement' : 'arrangementer'} satt inn!`, "success");
                }
            } catch (err) {
                console.error("Error inserting events:", err);
                showToast("Kunne ikke sette inn arrangement. Prøv igjen.", "error");
            }
        };

        const extractEventsArray = (doc) => {
            if (!doc) return [];
            if (Array.isArray(doc)) return doc;
            if (doc.items && Array.isArray(doc.items)) return doc.items;
            if (typeof doc === 'object') {
                return Object.keys(doc)
                    .map(k => typeof doc[k] === 'object' && doc[k] ? { id: k, ...doc[k] } : null)
                    .filter(Boolean);
            }
            return [];
        };

        const loadEvents = async () => {
            try {
                let items = [];
                if (window.hkmEventsCache && Array.isArray(window.hkmEventsCache) && window.hkmEventsCache.length > 0) {
                    items = window.hkmEventsCache;
                } else if (window.firebaseService) {
                    try {
                        const doc = await window.firebaseService.getPageContent('collection_events');
                        items = extractEventsArray(doc);
                    } catch(e) {
                        console.warn("getPageContent collection_events failed:", e);
                    }
                }

                if ((!items || items.length === 0) && window.db) {
                    try {
                        const snapshot = await window.db.collection('collection_events').get();
                        items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
                    } catch(e) {}
                }

                if (items && items.length > 0) {
                    window.hkmEventsCache = items;
                    eventsList = items.sort((a, b) => {
                        const dateA = new Date(a.date || a.start || a.createdAt || 0).getTime() || 0;
                        const dateB = new Date(b.date || b.start || b.createdAt || 0).getTime() || 0;
                        return dateB - dateA;
                    });
                } else {
                    // Fallback sample events if no database items exist
                    eventsList = [
                        {
                            id: 'sample-event-1',
                            title: 'Søndagsgudstjeneste & Fellesskap',
                            date: new Date(Date.now() + 86400000 * 4).toISOString(),
                            time: '11:00',
                            location: 'His Kingdom Ministry, Oslo',
                            imageUrl: 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80'
                        },
                        {
                            id: 'sample-event-2',
                            title: 'Bønnesamling & Lovsangskveld',
                            date: new Date(Date.now() + 86400000 * 7).toISOString(),
                            time: '19:00',
                            location: 'His Kingdom Ministry, Oslo',
                            imageUrl: 'https://images.unsplash.com/photo-1438232992991-995b7058bbb3?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80'
                        }
                    ];
                }
                
                renderEvents();
            } catch (err) {
                console.error("Failed to load events:", err);
                eventsList = [
                    {
                        id: 'sample-event-1',
                        title: 'Søndagsgudstjeneste & Fellesskap',
                        date: new Date(Date.now() + 86400000 * 4).toISOString(),
                        time: '11:00',
                        location: 'His Kingdom Ministry, Oslo',
                        imageUrl: 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80'
                    }
                ];
                renderEvents();
            }
        };

        searchInput.oninput = (e) => {
            renderEvents(e.target.value);
        };

        loadEvents();
    }

    openButtonInsertionFlow() {
        this.openButtonInsertionFlowAt(null);
    }

    openButtonInsertionFlowAt(afterElement) {
        let modal = document.getElementById('hkm-button-selector-modal');
        if (modal) modal.remove();

        const internalPages = [
            { name: "🏠 Forside / Hjem", url: "https://www.hiskingdomministry.no/", defaultText: "Gå til forside" },
            { name: "📅 Arrangementer & Kalender", url: "https://www.hiskingdomministry.no/arrangementer.html", defaultText: "Se arrangementer" },
            { name: "📖 Bibel & Leseplaner", url: "https://www.hiskingdomministry.no/bibel.html", defaultText: "Les i Bibelen" },
            { name: "🙏 Bønnevegg & Bønneemner", url: "https://www.hiskingdomministry.no/bonnevegg.html", defaultText: "Send bønneemne" },
            { name: "📚 Blogg & Undervisning", url: "https://www.hiskingdomministry.no/blogg.html", defaultText: "Les artikler" },
            { name: "🛍️ Nettbutikk (His Kingdom Designs)", url: "https://www.hiskingdomdesigns.no/", defaultText: "Besøk nettbutikken" },
            { name: "💖 Gi en gave / Støtt arbeidet", url: "https://www.hiskingdomministry.no/stott-oss.html", defaultText: "Støtt arbeidet" },
            { name: "ℹ️ Om oss", url: "https://www.hiskingdomministry.no/om-oss.html", defaultText: "Les om oss" },
            { name: "✉️ Kontakt oss", url: "https://www.hiskingdomministry.no/kontakt.html", defaultText: "Ta kontakt" },
            { name: "👤 Min side (Medlem)", url: "https://www.hiskingdomministry.no/minside/", defaultText: "Gå til Min side" }
        ];

        modal = document.createElement('div');
        modal.id = 'hkm-button-selector-modal';
        modal.className = 'profile-modal';
        modal.style.cssText = `
            display: flex;
            z-index: 11000;
            position: fixed;
            inset: 0;
            background: rgba(15, 23, 42, 0.6);
            align-items: center;
            justify-content: center;
            backdrop-filter: blur(8px);
            font-family: 'Inter', sans-serif;
        `;

        modal.innerHTML = `
            <div class="profile-modal-content card modern" style="max-width: 520px; padding: 0; overflow: hidden; border-radius: 24px; background: white; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); width: 90%; max-height: 85vh; display: flex; flex-direction: column;">
                <div class="modal-header" style="background: linear-gradient(135deg, #1B4965, #0b2536); color: white; padding: 20px 24px; display: flex; align-items: center; justify-content: space-between; border-bottom: none;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <div style="background: rgba(255,255,255,0.1); width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center;">
                            <span class="material-symbols-outlined" style="font-size: 20px; color: white;">link</span>
                        </div>
                        <h3 style="margin: 0; font-size: 18px; font-weight: 700; color: white; letter-spacing: -0.01em;">Sett inn knapp</h3>
                    </div>
                    <button id="hkm-btn-modal-close" style="background: none; border: none; color: white; opacity: 0.8; cursor: pointer; display: flex; align-items: center; padding: 4px; border-radius: 50%; transition: all 0.2s;"><span class="material-symbols-outlined" style="font-size: 22px;">close</span></button>
                </div>
                
                <div style="padding: 24px; display: flex; flex-direction: column; gap: 18px; background: white; overflow-y: auto;">
                    <!-- Knappetekst -->
                    <div>
                        <label style="display: block; font-size: 13px; font-weight: 700; color: #1e293b; margin-bottom: 6px;">Knappetekst</label>
                        <input type="text" id="hkm-btn-modal-text" value="${internalPages[0].defaultText}" placeholder="F.eks. Les mer, Se arrangement..." style="width: 100%; padding: 11px 14px; border: 1.5px solid #cbd5e1; border-radius: 10px; font-size: 14px; outline: none; box-sizing: border-box;" />
                    </div>

                    <!-- Lenketype Radio Toggle -->
                    <div>
                        <label style="display: block; font-size: 13px; font-weight: 700; color: #1e293b; margin-bottom: 8px;">Velg lenketype</label>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                            <button type="button" id="hkm-link-type-internal" class="hkm-link-type-btn active" style="padding: 12px; border: 2px solid #1B4965; background: #f0f6fa; border-radius: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; font-weight: 700; font-size: 13px; color: #1B4965; transition: all 0.2s;">
                                <span class="material-symbols-outlined" style="font-size: 18px;">language</span>
                                Interne sider
                            </button>
                            <button type="button" id="hkm-link-type-external" class="hkm-link-type-btn" style="padding: 12px; border: 1.5px solid #cbd5e1; background: #ffffff; border-radius: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; font-weight: 600; font-size: 13px; color: #64748b; transition: all 0.2s;">
                                <span class="material-symbols-outlined" style="font-size: 18px;">open_in_new</span>
                                Ekstern lenke
                            </button>
                        </div>
                    </div>

                    <!-- Internal Pages Dropdown Group -->
                    <div id="hkm-internal-page-group">
                        <label style="display: block; font-size: 13px; font-weight: 700; color: #1e293b; margin-bottom: 6px;">Velg side på nettsiden</label>
                        <select id="hkm-internal-page-select" style="width: 100%; padding: 11px 14px; border: 1.5px solid #cbd5e1; border-radius: 10px; font-size: 14px; font-weight: 600; outline: none; background: white; color: #1e293b; box-sizing: border-box; cursor: pointer;">
                            ${internalPages.map(p => `<option value="${p.url}" data-default-text="${p.defaultText}">${p.name}</option>`).join('')}
                        </select>
                    </div>

                    <!-- External URL Input Group -->
                    <div id="hkm-external-url-group" style="display: none;">
                        <label style="display: block; font-size: 13px; font-weight: 700; color: #1e293b; margin-bottom: 6px;">Ekstern nettadresse (URL)</label>
                        <input type="text" id="hkm-btn-modal-url" value="https://" placeholder="https://..." style="width: 100%; padding: 11px 14px; border: 1.5px solid #cbd5e1; border-radius: 10px; font-size: 14px; outline: none; box-sizing: border-box;" />
                    </div>
                </div>

                <div class="modal-footer" style="padding: 16px 24px; border-top: 1px solid #f1f5f9; display: flex; justify-content: flex-end; gap: 10px; background: #f8fafc; border-bottom-left-radius: 24px; border-bottom-right-radius: 24px;">
                    <button id="hkm-btn-modal-cancel" style="background: white; border: 1px solid #cbd5e1; color: #334155; padding: 10px 16px; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s;">Avbryt</button>
                    <button id="hkm-btn-modal-insert" style="background: linear-gradient(135deg, #d17d39 0%, #bd4f2a 100%); border: none; color: white; padding: 10px 20px; border-radius: 10px; font-size: 14px; font-weight: 700; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 6px -1px rgba(209, 125, 57, 0.25);">Sett inn knapp</button>
                </div>
            </div>
        `;

        this.mountEditorModal(modal, 'Sett inn knapp');

        const closeBtn = document.getElementById('hkm-btn-modal-close');
        const cancelBtn = document.getElementById('hkm-btn-modal-cancel');
        const insertBtn = document.getElementById('hkm-btn-modal-insert');
        const btnTextInput = document.getElementById('hkm-btn-modal-text');
        const internalBtn = document.getElementById('hkm-link-type-internal');
        const externalBtn = document.getElementById('hkm-link-type-external');
        const internalGroup = document.getElementById('hkm-internal-page-group');
        const externalGroup = document.getElementById('hkm-external-url-group');
        const internalSelect = document.getElementById('hkm-internal-page-select');
        const externalInput = document.getElementById('hkm-btn-modal-url');

        let isInternal = true;

        const closeModal = () => modal.remove();
        closeBtn.onclick = closeModal;
        cancelBtn.onclick = closeModal;
        modal.onclick = (e) => { if (e.target === modal) closeModal(); };

        internalBtn.onclick = () => {
            isInternal = true;
            internalBtn.className = 'hkm-link-type-btn active';
            internalBtn.style.cssText = 'padding: 12px; border: 2px solid #1B4965; background: #f0f6fa; border-radius: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; font-weight: 700; font-size: 13px; color: #1B4965; transition: all 0.2s;';
            externalBtn.className = 'hkm-link-type-btn';
            externalBtn.style.cssText = 'padding: 12px; border: 1.5px solid #cbd5e1; background: #ffffff; border-radius: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; font-weight: 600; font-size: 13px; color: #64748b; transition: all 0.2s;';
            internalGroup.style.display = 'block';
            externalGroup.style.display = 'none';
        };

        externalBtn.onclick = () => {
            isInternal = false;
            externalBtn.className = 'hkm-link-type-btn active';
            externalBtn.style.cssText = 'padding: 12px; border: 2px solid #1B4965; background: #f0f6fa; border-radius: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; font-weight: 700; font-size: 13px; color: #1B4965; transition: all 0.2s;';
            internalBtn.className = 'hkm-link-type-btn';
            internalBtn.style.cssText = 'padding: 12px; border: 1.5px solid #cbd5e1; background: #ffffff; border-radius: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; font-weight: 600; font-size: 13px; color: #64748b; transition: all 0.2s;';
            internalGroup.style.display = 'none';
            externalGroup.style.display = 'block';
        };

        internalSelect.onchange = () => {
            const opt = internalSelect.options[internalSelect.selectedIndex];
            if (opt && opt.dataset.defaultText) {
                btnTextInput.value = opt.dataset.defaultText;
            }
        };

        insertBtn.onclick = () => {
            const label = btnTextInput.value.trim() || 'Les mer';
            const url = isInternal ? internalSelect.value : (externalInput.value.trim() || 'https://');

            const html = `
                <div style="text-align: center; margin: 24px 0;">
                    <a href="${url}" class="block-btn" contenteditable="true" style="display: inline-block; background-color: #d17d39; color: white; padding: 12px 30px; border-radius: 999px; text-decoration: none; font-weight: 700; font-family: 'Inter', sans-serif;">${escapeHtml(label)}</a>
                </div><p><br></p>`;

            this.insertHtmlAtCursorOrEndAt(html, afterElement);
            closeModal();
            showToast("Knapp satt inn!", "success");
        };
    }

    openSocialInsertionFlow() {
        this.openSocialInsertionFlowAt(null);
    }

    openSocialInsertionFlowAt(afterElement) {
        let modal = document.getElementById('hkm-social-selector-modal');
        if (modal) modal.remove();

        const defaultPlatforms = [
            {
                id: 'facebook',
                name: 'Facebook',
                url: 'https://facebook.com/hiskingdomministry',
                enabled: true,
                color: '#1B4965',
                svg: `<svg width="20" height="20" viewBox="0 0 24 24" fill="#1B4965"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>`
            },
            {
                id: 'instagram',
                name: 'Instagram',
                url: 'https://www.instagram.com/freedomisathand/',
                enabled: true,
                color: '#1B4965',
                svg: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1B4965" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>`
            },
            {
                id: 'youtube',
                name: 'YouTube',
                url: 'https://youtube.com/@HisKingdomMinistry',
                enabled: true,
                color: '#1B4965',
                svg: `<svg width="22" height="20" viewBox="0 0 24 24" fill="#1B4965"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>`
            },
            {
                id: 'website',
                name: 'Nettsted',
                url: 'https://www.hiskingdomministry.no/',
                enabled: false,
                color: '#1B4965',
                svg: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1B4965" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`
            }
        ];

        modal = document.createElement('div');
        modal.id = 'hkm-social-selector-modal';
        modal.className = 'profile-modal';
        modal.style.cssText = `
            display: flex;
            z-index: 11000;
            position: fixed;
            inset: 0;
            background: rgba(15, 23, 42, 0.6);
            align-items: center;
            justify-content: center;
            backdrop-filter: blur(8px);
            font-family: 'Inter', sans-serif;
        `;

        let initialStyle = 'tiles';
        if (afterElement && afterElement.dataset && afterElement.dataset.style) {
            initialStyle = afterElement.dataset.style;
        }

        const isEditing = afterElement && afterElement.classList && afterElement.classList.contains('newsletter-social-block');

        modal.innerHTML = `
            <div class="profile-modal-content card modern" style="max-width: 540px; padding: 0; overflow: hidden; border-radius: 24px; background: white; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); width: 92%; max-height: 90vh; display: flex; flex-direction: column;">
                <div class="modal-header" style="background: linear-gradient(135deg, #1B4965, #0f172a); color: white; padding: 20px 24px; display: flex; align-items: center; justify-content: space-between; border-bottom: none;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <div style="background: rgba(255,255,255,0.1); width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center;">
                            <span class="material-symbols-outlined" style="font-size: 20px; color: white;">share</span>
                        </div>
                        <h3 style="margin: 0; font-size: 18px; font-weight: 700; color: white; letter-spacing: -0.01em;">${isEditing ? 'Endre sosiale medier' : 'Sosiale medier lenker'}</h3>
                    </div>
                    <button id="hkm-social-modal-close" style="background: none; border: none; color: white; opacity: 0.8; cursor: pointer; display: flex; align-items: center; padding: 4px; border-radius: 50%; transition: all 0.2s;"><span class="material-symbols-outlined" style="font-size: 22px;">close</span></button>
                </div>

                <div style="padding: 24px; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 20px; background: white;">
                    <!-- Display Style Switcher -->
                    <div>
                        <label style="display: block; font-size: 13px; font-weight: 700; color: #1e293b; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.05em;">Visningsstil</label>
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; background: #f8fafc; padding: 6px; border-radius: 14px; border: 1px solid #e2e8f0;">
                            <button type="button" class="hkm-style-btn ${initialStyle === 'tiles' ? 'active' : ''}" data-style="tiles" style="padding: 10px; border: none; border-radius: 10px; font-size: 13px; font-weight: 700; cursor: pointer; background: ${initialStyle === 'tiles' ? 'white' : 'transparent'}; color: ${initialStyle === 'tiles' ? '#1B4965' : '#64748b'}; box-shadow: ${initialStyle === 'tiles' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none'}; transition: all 0.2s;">
                                Følg oss (Brikker)
                            </button>
                            <button type="button" class="hkm-style-btn ${initialStyle === 'both' ? 'active' : ''}" data-style="both" style="padding: 10px; border: none; border-radius: 10px; font-size: 13px; font-weight: 700; cursor: pointer; background: ${initialStyle === 'both' ? 'white' : 'transparent'}; color: ${initialStyle === 'both' ? '#1B4965' : '#64748b'}; box-shadow: ${initialStyle === 'both' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none'}; transition: all 0.2s;">
                                Ikon + Tekst
                            </button>
                            <button type="button" class="hkm-style-btn ${initialStyle === 'icon_only' ? 'active' : ''}" data-style="icon_only" style="padding: 10px; border: none; border-radius: 10px; font-size: 13px; font-weight: 600; cursor: pointer; background: ${initialStyle === 'icon_only' ? 'white' : 'transparent'}; color: ${initialStyle === 'icon_only' ? '#1B4965' : '#64748b'}; box-shadow: ${initialStyle === 'icon_only' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none'}; transition: all 0.2s;">
                                Bare ikoner
                            </button>
                            <button type="button" class="hkm-style-btn ${initialStyle === 'text_only' ? 'active' : ''}" data-style="text_only" style="padding: 10px; border: none; border-radius: 10px; font-size: 13px; font-weight: 600; cursor: pointer; background: ${initialStyle === 'text_only' ? 'white' : 'transparent'}; color: ${initialStyle === 'text_only' ? '#1B4965' : '#64748b'}; box-shadow: ${initialStyle === 'text_only' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none'}; transition: all 0.2s;">
                                Bare tekst
                            </button>
                        </div>
                    </div>

                    <!-- Platforms and URLs -->
                    <div>
                        <label style="display: block; font-size: 13px; font-weight: 700; color: #1e293b; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.05em;">Velg plattformer & lenker</label>
                        <div style="display: flex; flex-direction: column; gap: 12px;">
                            ${defaultPlatforms.map(p => `
                                <div style="padding: 14px; border: 1px solid #e2e8f0; border-radius: 14px; background: #f8fafc; display: flex; flex-direction: column; gap: 8px;">
                                    <div style="display: flex; align-items: center; justify-content: space-between;">
                                        <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; font-weight: 700; font-size: 14px; color: #1e293b;">
                                            <input type="checkbox" id="social-check-${p.id}" ${p.enabled ? 'checked' : ''} style="width: 18px; height: 18px; accent-color: #1B4965; cursor: pointer;" />
                                            <span style="display: flex; align-items: center; justify-content: center; color: ${p.color};">${p.svg}</span>
                                            <span>${p.name}</span>
                                        </label>
                                        <span style="font-size: 11px; font-weight: 700; color: #15803d; background: #dcfce7; padding: 2px 8px; border-radius: 99px;">HKM Forhåndskoblet</span>
                                    </div>
                                    <input type="text" id="social-url-${p.id}" value="${p.url}" placeholder="URL for ${p.name}" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px; outline: none; box-sizing: border-box; background: white;" />
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>

                <div class="modal-footer" style="padding: 16px 24px; border-top: 1px solid #f1f5f9; display: flex; justify-content: flex-end; gap: 10px; background: #f8fafc; border-bottom-left-radius: 24px; border-bottom-right-radius: 24px;">
                    <button id="hkm-social-modal-cancel" style="background: white; border: 1px solid #cbd5e1; color: #334155; padding: 10px 16px; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s;">Avbryt</button>
                    <button id="hkm-social-modal-insert" style="background: linear-gradient(135deg, #1B4965 0%, #0f172a 100%); border: none; color: white; padding: 10px 20px; border-radius: 10px; font-size: 14px; font-weight: 700; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 6px -1px rgba(27, 73, 101, 0.25);">${isEditing ? 'Oppdater blokk' : 'Sett inn i nyhetsbrev'}</button>
                </div>
            </div>
        `;

        this.mountEditorModal(modal, isEditing ? 'Endre sosiale medier' : 'Sett inn sosiale medier');

        let selectedStyle = initialStyle;
        const styleBtns = modal.querySelectorAll('.hkm-style-btn');
        styleBtns.forEach(btn => {
            btn.onclick = () => {
                styleBtns.forEach(b => {
                    b.classList.remove('active');
                    b.style.background = 'transparent';
                    b.style.color = '#64748b';
                    b.style.fontWeight = '600';
                    b.style.boxShadow = 'none';
                });
                btn.classList.add('active');
                btn.style.background = 'white';
                btn.style.color = '#1B4965';
                btn.style.fontWeight = '700';
                btn.style.boxShadow = '0 2px 4px rgba(0,0,0,0.06)';
                selectedStyle = btn.dataset.style;
            };
        });

        const closeModal = () => modal.remove();
        document.getElementById('hkm-social-modal-close').onclick = closeModal;
        document.getElementById('hkm-social-modal-cancel').onclick = closeModal;
        modal.onclick = (e) => { if (e.target === modal) closeModal(); };

        document.getElementById('hkm-social-modal-insert').onclick = () => {
            const activePlatforms = defaultPlatforms.filter(p => {
                const chk = document.getElementById(`social-check-${p.id}`);
                return chk && chk.checked;
            }).map(p => {
                const urlInput = document.getElementById(`social-url-${p.id}`);
                return {
                    ...p,
                    url: urlInput ? urlInput.value.trim() || p.url : p.url
                };
            });

            if (activePlatforms.length === 0) {
                showToast("Velg minst én sosial plattform", "warning");
                return;
            }

            const tileFB = `<svg width="22" height="22" viewBox="0 0 24 24" fill="#1B4965" style="width: 22px !important; height: 22px !important; max-width: 22px !important; max-height: 22px !important; display: block !important;"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>`;
            const tileIG = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1B4965" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="width: 24px !important; height: 24px !important; max-width: 24px !important; max-height: 24px !important; display: block !important;"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>`;
            const tileYT = `<svg width="26" height="24" viewBox="0 0 24 24" fill="#1B4965" style="width: 26px !important; height: 24px !important; max-width: 26px !important; max-height: 24px !important; display: block !important;"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>`;
            const tileWebsite = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1B4965" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="width: 22px !important; height: 22px !important; max-width: 22px !important; max-height: 22px !important; display: block !important;"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`;

            let linksHtml = '';
            if (selectedStyle === 'tiles') {
                const tileSvgMap = { facebook: tileFB, instagram: tileIG, youtube: tileYT, website: tileWebsite };
                linksHtml = `
                    <div style="font-family: 'Inter', sans-serif; font-size: 20px; font-weight: 800; color: #0f172a; margin-bottom: 4px; text-align: center; width: 100%;">Følg oss</div>
                    <div style="display: flex; align-items: center; justify-content: center; gap: 14px; flex-wrap: wrap;">
                        ${activePlatforms.map(p => `
                            <a href="${p.url}" target="_blank" title="${p.name}" style="display: inline-flex; align-items: center; justify-content: center; width: 54px; height: 54px; border-radius: 16px; background: #ffffff; color: #1B4965; text-decoration: none; border: 1px solid #e2e8f0; box-shadow: 0 4px 10px rgba(0,0,0,0.06); transition: all 0.2s ease;">
                                ${tileSvgMap[p.id] || p.svg}
                            </a>
                        `).join('')}
                    </div>
                `;
            } else if (selectedStyle === 'both') {
                linksHtml = activePlatforms.map(p => `
                    <a href="${p.url}" target="_blank" style="display: inline-flex; align-items: center; gap: 8px; background: #f1f5f9; color: #1B4965; padding: 8px 16px; border-radius: 99px; text-decoration: none; font-family: 'Inter', sans-serif; font-weight: 600; font-size: 13.5px; transition: all 0.2s;">
                        <span style="display: flex; align-items: center; justify-content: center; color: ${p.color};">${p.svg}</span>
                        <span>${p.name}</span>
                    </a>
                `).join('');
            } else if (selectedStyle === 'icon_only') {
                linksHtml = activePlatforms.map(p => `
                    <a href="${p.url}" target="_blank" title="${p.name}" style="display: inline-flex; align-items: center; justify-content: center; width: 42px; height: 42px; border-radius: 50%; background: #f1f5f9; color: ${p.color}; text-decoration: none; transition: all 0.2s;">
                        ${p.svg}
                    </a>
                `).join('');
            } else {
                linksHtml = activePlatforms.map((p, idx) => `
                    <a href="${p.url}" target="_blank" style="color: #1B4965; text-decoration: none; font-family: 'Inter', sans-serif; font-weight: 600; font-size: 14px;">${p.name}</a>
                    ${idx < activePlatforms.length - 1 ? '<span style="color: #cbd5e1;">•</span>' : ''}
                `).join('');
            }

            const isTiles = selectedStyle === 'tiles';
            const fullBlockHtml = `
                <div class="newsletter-social-block" contenteditable="false" data-style="${selectedStyle}" style="position: relative; text-align: center; margin: 28px 0; padding: ${isTiles ? '0' : '16px'}; background: ${isTiles ? 'transparent' : '#ffffff'}; border: ${isTiles ? 'none' : '1px solid #e2e8f0'}; border-radius: 16px; display: flex; flex-direction: ${isTiles ? 'column' : 'row'}; flex-wrap: wrap; justify-content: center; gap: ${selectedStyle === 'text_only' ? '12px' : '14px'}; align-items: center; box-shadow: ${isTiles ? 'none' : '0 2px 4px rgba(0,0,0,0.02)'};">
                    <button class="card-delete-btn" style="position: absolute; top: -10px; right: -10px; width: 24px; height: 24px; border-radius: 50%; background: #ef4444; border: 2px solid white; color: white; font-size: 14px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.15); z-index: 100;" title="Slett sosial blokk">×</button>
                    <button class="card-edit-btn" style="position: absolute; top: -10px; right: 20px; width: 24px; height: 24px; border-radius: 50%; background: #1B4965; border: 2px solid white; color: white; font-size: 12px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.15); z-index: 100;" title="Endre stil & lenker">✏️</button>
                    ${linksHtml}
                </div>
            `;

            const container = document.getElementById('blocks-container');
            if (isEditing && container && container.contains(afterElement)) {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = fullBlockHtml;
                const newBlock = tempDiv.firstElementChild;
                afterElement.replaceWith(newBlock);
                this.syncUnifiedBlocks();
                this.triggerAutosave();
                closeModal();
                showToast("Sosiale medier oppdatert!", "success");
                return;
            }

            this.insertHtmlAtCursorOrEndAt(fullBlockHtml + '<p><br></p>', afterElement);
            closeModal();
            showToast("Sosiale medier satt inn!", "success");
        };
    }

    insertHtmlAtCursorOrEnd(html) {
        this.insertHtmlAtCursorOrEndAt(html, null);
    }

    insertHtmlAtCursorOrEndAt(html, afterElement) {
        const container = document.getElementById('blocks-container');
        if (!container) return;

        const temp = document.createElement('div');
        temp.innerHTML = html;

        if (afterElement && container.contains(afterElement)) {
            while (temp.firstChild) {
                container.insertBefore(temp.firstChild, afterElement);
            }
            this.normalizeCanvasBlocks(container);
            this.syncUnifiedBlocks();
            this.triggerAutosave();
            return;
        }

        this.restoreSelection();
        const selection = window.getSelection();

        let parentBlock = (selection && selection.anchorNode && container.contains(selection.anchorNode)) 
            ? selection.anchorNode 
            : null;
        
        while (parentBlock && parentBlock.parentNode !== container) {
            parentBlock = parentBlock.parentNode;
        }

        const fragment = document.createDocumentFragment();
        while (temp.firstChild) {
            fragment.appendChild(temp.firstChild);
        }

        const lastInsertedNode = fragment.lastChild;

        if (parentBlock && parentBlock.nextSibling) {
            container.insertBefore(fragment, parentBlock.nextSibling);
        } else {
            container.appendChild(fragment);
        }

        if (lastInsertedNode && typeof lastInsertedNode.scrollIntoView === 'function') {
            try {
                lastInsertedNode.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            } catch(e) {}
        }

        this.normalizeCanvasBlocks(container);
        this.syncUnifiedBlocks();
        this.triggerAutosave();
    }

    async uploadAndInsertImageFileAt(file, afterElement) {
        if (!file) return;

        showToast("Leser inn bilde...", "info");

        const reader = new FileReader();
        reader.onload = async (e) => {
            const localDataUrl = e.target.result;
            const tempId = 'img-' + Date.now();
            const imgHtml = `<p><img id="${tempId}" src="${localDataUrl}" alt="${escapeHtml(file.name)}" class="block-img" style="max-width:100%; height:auto; border-radius:8px; margin: 16px 0; display: block;"></p><p><br></p>`;
            
            this.insertHtmlAtCursorOrEndAt(imgHtml, afterElement);
            showToast("Bilde satt inn!", "success");

            if (window.firebaseService && window.firebaseService.uploadImage) {
                try {
                    const uploadPath = `newsletter/images/${Date.now()}_${file.name}`;
                    const remoteUrl = await window.firebaseService.uploadImage(file, uploadPath);
                    const insertedImg = document.getElementById(tempId);
                    if (insertedImg && remoteUrl) {
                        insertedImg.src = remoteUrl;
                        this.syncUnifiedBlocks();
                        this.triggerAutosave();
                    }
                } catch(err) {
                    console.warn("Firebase image upload failed, keeping local base64 version:", err);
                }
            }
        };

        reader.onerror = () => {
            showToast("Feil ved lesing av bilde.", "error");
        };

        reader.readAsDataURL(file);
    }

    insertBlockAt(type, afterElement) {
        let html = '';
        switch (type) {
            case 'header':
                html = `<h2 style="font-family: 'Inter', sans-serif; font-size: 22px; font-weight: 700; color: #1B4965; margin: 24px 0 12px 0;">Overskrift her</h2><p><br></p>`;
                break;
            case 'text':
                html = `<p style="font-family: 'Inter', sans-serif; font-size: 15px; line-height: 1.6; color: #334155; margin: 16px 0;">Skriv din tekst her...</p><p><br></p>`;
                break;
            case 'divider':
                html = `
                    <div class="newsletter-divider-block" contenteditable="false" style="position: relative; margin: 24px 0; padding: 12px 0;">
                        <hr style="border: none; border-top: 2px solid #e2e8f0; margin: 0;">
                    </div><p><br></p>`;
                break;
            case 'spacer':
                html = `
                    <div class="newsletter-spacer-block" contenteditable="false" style="position: relative; margin: 12px 0; padding: 6px; border: 1px dashed #cbd5e1; border-radius: 8px; text-align: center; color: #94a3b8; font-size: 12px;">
                        <div style="height: 24px; display: flex; align-items: center; justify-content: center;">Avstand (24px)</div>
                    </div><p><br></p>`;
                break;
            case 'button':
                this.openButtonInsertionFlowAt(afterElement);
                return;
            case 'columns':
                html = `
                    <div class="newsletter-columns-block" contenteditable="false" style="position: relative; margin: 24px 0; padding: 8px; border: 1px dashed #cbd5e1; border-radius: 12px;">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
                            <div contenteditable="true" style="min-height: 50px; padding: 12px; border: 1px dashed #e2e8f0; border-radius: 8px; background: white;">Venstre kolonne...</div>
                            <div contenteditable="true" style="min-height: 50px; padding: 12px; border: 1px dashed #e2e8f0; border-radius: 8px; background: white;">Høyre kolonne...</div>
                        </div>
                    </div><p><br></p>`;
                break;
            case 'image':
            case 'logo':
                this.openImageInsertionFlowAt(afterElement);
                return;
            case 'social':
                this.openSocialInsertionFlowAt(afterElement);
                return;
            case 'product':
                this.openProductInsertionFlowAt(afterElement);
                return;
            case 'event':
                this.openEventInsertionFlowAt(afterElement);
                return;
            case 'video':
                this.openVideoInsertionFlowAt(afterElement);
                return;
            case 'html':
                const customHtml = prompt("Lim inn din egendefinerte HTML-kode her:", "<div style='padding: 20px; background: #f8fafc; border-radius: 8px; text-align: center; border: 1px dashed #cbd5e1;'>Egendefinert HTML</div>");
                if (!customHtml) return;
                html = `<div class="newsletter-html-block" contenteditable="false" style="margin: 24px 0; font-family: 'Inter', sans-serif;">${customHtml}</div><p><br></p>`;
                break;
            case 'subscribe':
                html = `
                    <div class="newsletter-subscribe-block" contenteditable="false" style="padding: 32px 24px; background-color: #f8fafc; border-radius: 16px; text-align: center; margin: 24px 0; border: 1px solid #e2e8f0; font-family: 'Inter', sans-serif; box-sizing: border-box;">
                        <h3 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 700; color: #1B4965; font-family: 'Inter', sans-serif;">Abonner på vårt nyhetsbrev</h3>
                        <p style="margin: 0 0 20px 0; font-size: 14px; color: #64748b; font-family: 'Inter', sans-serif; line-height: 1.5;">Motta ukentlige oppmuntringer og oppdateringer direkte i din innboks.</p>
                        <div style="display: flex; gap: 8px; justify-content: center; max-width: 400px; margin: 0 auto; flex-wrap: wrap;">
                            <input type="email" placeholder="Din e-postadresse" style="flex: 1; min-width: 200px; padding: 12px 16px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 14px; outline: none; box-sizing: border-box;" disabled>
                            <button style="background-color: #d17d39; color: white; padding: 12px 24px; border: none; border-radius: 8px; font-weight: 600; font-size: 14px; cursor: default; font-family: 'Inter', sans-serif;">Meld deg på</button>
                        </div>
                    </div><p><br></p>`;
                break;
            case 'link':
                const linkText = prompt("Lenketekst:", "Les mer her");
                if (!linkText) return;
                const linkUrl = prompt("Lenke-URL:", "https://");
                if (!linkUrl) return;
                html = `<p style="text-align: center; margin: 16px 0; font-family: 'Inter', sans-serif;"><a href="${linkUrl}" target="_blank" style="color: #d17d39; text-decoration: underline; font-weight: 600; font-family: 'Inter', sans-serif;">${linkText}</a></p><p><br></p>`;
                break;
            default:
                return;
        }

        if (html) {
            this.insertHtmlAtCursorOrEndAt(html, afterElement);
        }
    }

    getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll(':scope > *:not(.hkm-drop-indicator)')];
        
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    toggleQuote() {
        this.restoreSelection();
        const selection = window.getSelection();
        if (!selection.rangeCount) return;

        const range = selection.getRangeAt(0);
        let container = range.commonAncestorContainer;
        if (container.nodeType === 3) {
            container = container.parentNode;
        }

        const blockquote = container.closest('blockquote, .block-quote');
        if (blockquote) {
            // Already a quote, unwrap it (change blockquote to p)
            const p = document.createElement('p');
            p.innerHTML = blockquote.innerHTML;
            blockquote.parentNode.replaceChild(p, blockquote);
        } else {
            // Convert current paragraph/block to a blockquote
            document.execCommand('formatBlock', false, 'blockquote');
            const sel = window.getSelection();
            if (sel && sel.anchorNode) {
                const node = sel.anchorNode.nodeType === 3 ? sel.anchorNode.parentNode : sel.anchorNode;
                const newBq = node.closest('blockquote');
                if (newBq) {
                    newBq.className = 'block-quote';
                    newBq.style.borderLeft = '4px solid #d17d39';
                    newBq.style.padding = '10px 16px 10px 20px';
                    newBq.style.margin = '20px 0';
                    newBq.style.fontStyle = 'italic';
                    newBq.style.color = '#334155';
                    newBq.style.background = '#fffaf5';
                    newBq.style.borderRadius = '0 10px 10px 0';
                }
            }
        }
        this.syncUnifiedBlocks();
    }

    showConfirm(title, message, confirmText = 'Bekreft', cancelText = 'Avbryt') {
        return new Promise((resolve) => {
            let modal = document.getElementById('hkm-confirm-modal');
            let isDynamicallyCreated = false;
            
            if (!modal) {
                isDynamicallyCreated = true;
                modal = document.createElement('div');
                modal.id = 'hkm-confirm-modal';
                modal.className = 'profile-modal';
                modal.style.cssText = `
                    display: none;
                    z-index: 21000;
                    position: fixed;
                    inset: 0;
                    background: rgba(15, 23, 42, 0.6);
                    align-items: center;
                    justify-content: center;
                    backdrop-filter: blur(8px);
                    font-family: 'Inter', sans-serif;
                `;
                modal.innerHTML = `
                    <div class="profile-modal-content card modern" style="max-width: 440px; padding: 0; overflow: hidden; border-radius: 24px; background: white; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); width: 90%; height: auto !important; min-height: auto !important; transform: translateZ(0); backface-visibility: hidden; display: flex; flex-direction: column;">
                        <div class="modal-header" style="background: #1e293b; color: white; padding: 24px 32px; display: flex; align-items: center; gap: 16px; border-bottom: none;">
                            <div style="background: rgba(255,255,255,0.1); width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                                <span class="material-symbols-outlined" style="font-size: 24px; color: white;">warning</span>
                            </div>
                            <h3 id="confirm-modal-title" style="margin: 0; font-size: 20px; font-weight: 700; color: white; letter-spacing: -0.01em;">Bekreft handling</h3>
                        </div>
                        <div class="modal-body" style="padding: 32px; font-size: 16px; line-height: 1.6; color: #475569;">
                            <p id="confirm-modal-message" style="margin: 0; font-weight: 500;">Er du sikker på at du vil utføre denne handlingen?</p>
                        </div>
                        <div class="modal-footer" style="padding: 24px 32px; background: #f8fafc; display: flex; justify-content: flex-end; gap: 16px; border-top: 1px solid #f1f5f9;">
                            <button id="confirm-modal-cancel" class="btn-secondary" style="padding: 12px 24px; border-radius: 12px; font-weight: 600; min-width: 100px; cursor: pointer; transition: all 0.2s; border: 1px solid #e2e8f0; background: white; color: #64748b; font-size: 14px;">Avbryt</button>
                            <button id="confirm-modal-confirm" class="btn-primary" style="padding: 12px 24px; border-radius: 12px; font-weight: 700; min-width: 100px; cursor: pointer; transition: all 0.2s; background: #d17d39; color: white; border: none; font-size: 14px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">Bekreft</button>
                        </div>
                    </div>
                `;
            }

            this.mountEditorModal(modal, title);
            const titleEl = modal.querySelector('#confirm-modal-title') || document.getElementById('confirm-modal-title');
            const messageEl = modal.querySelector('#confirm-modal-message') || document.getElementById('confirm-modal-message');
            const confirmBtn = modal.querySelector('#confirm-modal-confirm') || document.getElementById('confirm-modal-confirm');
            const cancelBtn = modal.querySelector('#confirm-modal-cancel') || document.getElementById('confirm-modal-cancel');
            const headerEl = modal.querySelector('.modal-header');

            if (titleEl) titleEl.textContent = title;
            if (messageEl) messageEl.textContent = message;
            
            if (cancelBtn) {
                if (cancelText) {
                    cancelBtn.style.display = 'block';
                    cancelBtn.textContent = cancelText;
                } else {
                    cancelBtn.style.display = 'none';
                }
            }
            
            if (confirmBtn) {
                confirmBtn.textContent = confirmText;
                const orangeGradient = 'linear-gradient(135deg, #d17d39 0%, #bd4f2a 100%)';
                confirmBtn.style.background = orangeGradient;
                if (headerEl) headerEl.style.background = orangeGradient;
            }

            const cleanup = () => {
                if (isDynamicallyCreated) {
                    modal.remove();
                } else {
                    modal.style.display = 'none';
                }
                confirmBtn.onclick = null;
                cancelBtn.onclick = null;
            };

            confirmBtn.onclick = (e) => {
                e.preventDefault();
                cleanup();
                resolve(true);
            };

            cancelBtn.onclick = (e) => {
                e.preventDefault();
                cleanup();
                resolve(false);
            };

            modal.onclick = (e) => {
                if (e.target === modal) {
                    cleanup();
                    resolve(false);
                }
            };

            modal.style.display = 'flex';
        });
    }

    showSuccessModal(title, message, buttonText = 'Flott, skjønner!') {
        return new Promise((resolve) => {
            let modal = document.getElementById('hkm-success-modal');
            if (modal) modal.remove();

            modal = document.createElement('div');
            modal.id = 'hkm-success-modal';
            modal.className = 'profile-modal';
            modal.style.cssText = `
                display: flex;
                z-index: 22000;
                position: fixed;
                inset: 0;
                background: rgba(15, 23, 42, 0.6);
                align-items: center;
                justify-content: center;
                backdrop-filter: blur(8px);
                font-family: 'Inter', sans-serif;
            `;
            modal.innerHTML = `
                <div class="profile-modal-content card modern" style="max-width: 460px; width: 90%; height: auto !important; min-height: 0 !important; max-height: calc(100dvh - 40px); padding: 0; overflow: hidden; border-radius: 24px; background: white; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); transform: translateZ(0); display: flex; flex-direction: column;">
                    <div class="modal-header" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 24px 32px; display: flex; align-items: center; gap: 16px; border-bottom: none; flex-shrink: 0;">
                        <div style="background: rgba(255,255,255,0.2); width: 44px; height: 44px; border-radius: 14px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                            <span class="material-symbols-outlined" style="font-size: 26px; color: white;">mark_email_read</span>
                        </div>
                        <div>
                            <h3 style="margin: 0; font-size: 20px; font-weight: 700; color: white; letter-spacing: -0.01em;">${title}</h3>
                            <span style="font-size: 13px; color: rgba(255,255,255,0.9); font-weight: 500;">Test-e-post bekreftelse</span>
                        </div>
                    </div>
                    <div class="modal-body" style="padding: 28px 32px; font-size: 15px; line-height: 1.6; color: #334155; min-height: 0; overflow-y: auto;">
                        <p style="margin: 0; font-weight: 500;">${message}</p>
                    </div>
                    <div class="modal-footer" style="padding: 20px 32px; background: #f8fafc; display: flex; justify-content: flex-end; border-top: 1px solid #f1f5f9; flex-shrink: 0;">
                        <button id="success-modal-ok-btn" class="btn-primary" style="padding: 12px 24px; border-radius: 12px; font-weight: 700; cursor: pointer; transition: all 0.2s; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; border: none; font-size: 14px; box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.3);">
                            ${buttonText}
                        </button>
                    </div>
                </div>
            `;
            this.mountEditorModal(modal, title);

            const okBtn = modal.querySelector('#success-modal-ok-btn');
            const close = () => {
                modal.remove();
                resolve(true);
            };

            if (okBtn) okBtn.onclick = close;
            modal.onclick = (e) => {
                if (e.target === modal) close();
            };
        });
    }

    showPromptModal(label, placeholder, confirmCallback, defaultValue = '', warningMsg = "Vennligst oppgi en beskrivelse.", modalTitle = "Lagre kladd", confirmText = "Lagre") {
        const modal = document.getElementById('custom-prompt-modal');
        const titleEl = document.getElementById('custom-prompt-title');
        const iconEl = document.getElementById('custom-prompt-icon');
        const labelEl = document.getElementById('custom-prompt-label');
        const inputEl = document.getElementById('custom-prompt-input');
        const cancelBtn = document.getElementById('custom-prompt-cancel');
        const closeBtn = document.getElementById('custom-prompt-close');
        const confirmBtn = document.getElementById('custom-prompt-confirm');
        const confirmTextEl = document.getElementById('custom-prompt-confirm-text');

        if (!modal || !inputEl) return;

        const isTestEmailPrompt = modalTitle === 'Send test-e-post';
        modal.dataset.promptKind = isTestEmailPrompt ? 'test-email' : 'default';
        this.mountEditorModal(modal, modalTitle);
        if (titleEl) titleEl.textContent = modalTitle;
        if (iconEl) iconEl.textContent = isTestEmailPrompt ? 'send' : 'edit_note';
        if (labelEl) labelEl.textContent = label;
        if (confirmTextEl) confirmTextEl.textContent = confirmText;

        inputEl.placeholder = placeholder;
        inputEl.value = defaultValue;
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('open'), 10);
        inputEl.focus();
        if (defaultValue) {
            inputEl.select();
        }

        const closePrompt = () => {
            modal.classList.remove('open');
            setTimeout(() => modal.style.display = 'none', 300);
        };

        // Reset listeners to avoid duplicates
        const newCancelBtn = cancelBtn.cloneNode(true);
        const newCloseBtn = closeBtn.cloneNode(true);
        const newConfirmBtn = confirmBtn.cloneNode(true);
        const newConfirmIcon = newConfirmBtn.querySelector('.material-symbols-outlined');
        if (newConfirmIcon) newConfirmIcon.textContent = isTestEmailPrompt ? 'send' : 'check';

        cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
        closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

        newCancelBtn.addEventListener('click', closePrompt);
        newCloseBtn.addEventListener('click', closePrompt);
        
        newConfirmBtn.addEventListener('click', () => {
            const val = inputEl.value.trim();
            if (val) {
                confirmCallback(val);
                closePrompt();
            } else {
                if (typeof showToast === 'function') showToast(warningMsg, "warning");
            }
        });

        // Trigger on Cmd+Enter / Ctrl+Enter
        inputEl.onkeydown = (e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                newConfirmBtn.click();
            }
        };
    }

    buildWithAi() {
        this.showPromptModal(
            "Beskriv hva nyhetsbrevet skal handle om, så bygger jeg strukturen for deg:",
            "F.eks: En invitasjon til bønnemøte på tirsdag kveld med tema om enhet og fellesskap...",
            async (promptVal) => {
                showToast("AI bygger nyhetsbrevet ditt...", "info");
                try {
                    const callable = firebase.functions().httpsCallable('aiProcess');
                    const result = await callable({
                        task: 'generate_newsletter_structure',
                        prompt: promptVal
                    });

                    if (result.data && result.data.blocks) {
                        const aiHtml = result.data.blocks.map(block => {
                            switch (block.type) {
                                case 'header':
                                    return `<h1 class="block-h1">${block.content.text}</h1>`;
                                case 'text':
                                    return `<p class="block-text">${block.content.text}</p>`;
                                case 'image':
                                    return `<p><img src="${block.content.url || 'https://images.unsplash.com/photo-1490730141103-6cac27aaab94?auto=format&fit=crop&w=800&q=80'}" alt="${block.content.alt || ''}" class="block-img" style="max-width:100%; height:auto; border-radius:8px; margin: 16px 0; display: block;"></p>`;
                                case 'button':
                                    return `
                                        <div style="text-align: center; margin: 24px 0;">
                                            <a href="${block.content.url || '#'}" class="block-btn" contenteditable="false" style="display: inline-block; background-color: #d17d39; color: white; padding: 12px 30px; border-radius: 999px; text-decoration: none; font-weight: 700; font-family: 'Inter', sans-serif;">${block.content.text || 'Les mer'}</a>
                                        </div><p><br></p>`;
                                case 'divider':
                                    return `<hr style="border: none; border-top: ${block.content.thickness || 2}px solid ${block.content.color || '#e2e8f0'}; margin: 24px 0;">`;
                                case 'spacer':
                                    return `<div style="height: ${block.content.height || 24}px;"></div>`;
                                default:
                                    return '';
                            }
                        }).join('');

                        // Set the container content directly to the compiled AI HTML
                        const container = document.getElementById('blocks-container');
                        if (container) {
                            container.innerHTML = aiHtml;
                            this.syncUnifiedBlocks();
                        }
                        showToast(`AI har bygget nyhetsbrevet ditt!`, "success");
                    }
                } catch (err) {
                    console.error("AI Builder failed:", err);
                    showToast("Kunne ikke bygge med AI: " + err.message, "error");
                }
            }
        );
    }

    showAiTextPrompt() {
        this.showPromptModal(
            "Hva vil du at jeg skal skrive for deg?",
            "F.eks: Et varmt velkomstbrev til nye abonnenter, fokusert på ukentlige oppdateringer...",
            async (promptVal) => {
                showToast("AI tenker...", "info");
                try {
                    const callable = firebase.functions().httpsCallable('aiProcess');
                    const result = await callable({
                        task: 'generate_text',
                        prompt: `Du er en dyktig tekstforfatter for His Kingdom Ministry. ${promptVal}. Svar med selve teksten, ingen kommentarer rundt.`,
                        options: { model: "gpt-4o-mini" }
                    });

                    if (result.data && result.data.text) {
                        // Insert the generated text as paragraphs at the cursor position
                        const paragraphs = result.data.text.split('\n\n').map(p => `<p class="block-text">${p.replace(/\n/g, '<br>')}</p>`).join('');
                        this.exec('insertHTML', paragraphs);
                        showToast("Tekst generert!", "success");
                    }
                } catch (err) {
                    console.error("AI Text failed:", err);
                    showToast("Kunne ikke generere tekst: " + err.message, "error");
                }
            }
        );
    }

    showAiImagePrompt() {
        this.showPromptModal(
            "Beskriv bildet du ønsker å generere med AI:",
            "F.eks: En nydelig solnedgang over fjellene med gylne toner, fotorealistisk 8k...",
            async (promptVal) => {
                showToast("Genererer bilde (dette kan ta 10-15 sek)...", "info", 10000);
                try {
                    const callable = firebase.functions().httpsCallable('aiProcess');
                    const result = await callable({
                        task: 'generate_image',
                        prompt: promptVal
                    });

                    if (result.data && result.data.imageUrl) {
                        const imgHtml = `<p><img src="${result.data.imageUrl}" alt="AI Generert bilde" class="block-img" style="max-width:100%; height:auto; border-radius:8px; margin: 16px 0; display: block;"></p>`;
                        this.exec('insertHTML', imgHtml);
                        showToast("Bilde generert!", "success");
                    }
                } catch (err) {
                    console.error("AI Image failed:", err);
                    showToast("Kunne ikke generere bilde: " + err.message, "error");
                }
            }
        );
    }


    deleteBlock(id) {
        this.blocks = this.blocks.filter(b => b.id !== id);
        this.renderCanvas();
    }

    moveBlock(id, direction) {
        const idx = this.blocks.findIndex(b => b.id === id);
        if (idx === -1) return;

        const newIdx = idx + direction;
        if (newIdx < 0 || newIdx >= this.blocks.length) return;

        const temp = this.blocks[idx];
        this.blocks[idx] = this.blocks[newIdx];
        this.blocks[newIdx] = temp;

        this.renderCanvas();
    }

    setView(view) {
        this.currentView = view;
        document.querySelectorAll('.device-btn, .device-pill-btn').forEach(btn => {
            if (btn) btn.classList.toggle('active', btn.dataset.view === view);
        });

        const scaler = document.getElementById('canvas-scaler') || document.getElementById('canvas-container');
        if (scaler) {
            scaler.classList.toggle('mobile', view === 'mobile');
        }
    }

    getCurrentBlock(target) {
        const container = document.getElementById('blocks-container');
        if (!container) return null;
        let node = target;
        while (node && node !== container) {
            if (node.parentNode === container) {
                return node;
            }
            node = node.parentNode;
        }
        return null;
    }

    moveActiveBlock(direction) {
        let node = this.activeBlockNode;
        if (!node) {
            const sel = window.getSelection();
            if (sel && sel.anchorNode) {
                node = this.getCurrentBlock(sel.anchorNode);
            }
        }
        if (!node) {
            const container = document.getElementById('blocks-container');
            if (container && container.firstElementChild) {
                node = container.firstElementChild;
            }
        }
        if (!node) return;

        const parent = node.parentNode;
        if (!parent) return;

        if (direction === -1) {
            const prev = node.previousElementSibling;
            if (prev) {
                parent.insertBefore(node, prev);
                node.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                this.selectBlock(node);
                this.syncUnifiedBlocks();
                this.triggerAutosave();
                if (typeof showToast === 'function') showToast("Elementet ble flyttet opp.", "info");
            } else {
                if (typeof showToast === 'function') showToast("Elementet er allerede øverst.", "info");
            }
        } else if (direction === 1) {
            const next = node.nextElementSibling;
            if (next) {
                parent.insertBefore(next, node);
                node.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                this.selectBlock(node);
                this.syncUnifiedBlocks();
                this.triggerAutosave();
                if (typeof showToast === 'function') showToast("Elementet ble flyttet ned.", "info");
            } else {
                if (typeof showToast === 'function') showToast("Elementet er allerede nederst.", "info");
            }
        }
    }

    duplicateActiveBlock() {
        let node = this.activeBlockNode;
        if (!node) {
            const sel = window.getSelection();
            if (sel && sel.anchorNode) {
                node = this.getCurrentBlock(sel.anchorNode);
            }
        }
        if (!node) return;

        const clone = node.cloneNode(true);
        clone.classList.remove('selected-block-active');
        const qtb = clone.querySelector('#block-quick-toolbar');
        if (qtb) qtb.remove();

        if (node.nextElementSibling) {
            node.parentNode.insertBefore(clone, node.nextElementSibling);
        } else {
            node.parentNode.appendChild(clone);
        }
        this.selectBlock(clone);
        this.syncUnifiedBlocks();
        this.triggerAutosave();
        if (typeof showToast === 'function') showToast("Elementet ble duplisert.", "success");
    }

    deleteActiveBlock() {
        let node = this.activeBlockNode;
        if (!node) {
            const sel = window.getSelection();
            if (sel && sel.anchorNode) {
                node = this.getCurrentBlock(sel.anchorNode);
            }
        }
        if (!node) return;

        node.remove();
        this.deselectBlock();
        this.syncUnifiedBlocks();
        this.triggerAutosave();
        if (typeof showToast === 'function') showToast("Elementet ble slettet.", "success");
    }

    attachBlockQuickToolbar(node) {
        document.querySelectorAll('#block-quick-toolbar').forEach(el => el.remove());
    }

    selectBlock(node) {
        if (this.activeBlockNode === node) return;

        console.log('[HKM Inspector] selectBlock triggered for element:', node);

        // Clear previous active block highlight
        this.deselectBlock();

        this.activeBlockNode = node;
        this.activeBlockNode.classList.add('selected-block-active');
        this.activeBlockNode.setAttribute('data-editor-label', this.getEditorBlockLabel(node));

        // Determine block type
        const isSocial = (node.classList && node.classList.contains('newsletter-social-block')) || (node.closest && node.closest('.newsletter-social-block'));
        const img = node.querySelector('img') || (node.tagName === 'IMG' ? node : null);
        const btn = node.querySelector('.block-btn, .product-cta-btn, .newsletter-btn, .btn, a[href], button') || 
                    ((node.classList && (node.classList.contains('block-btn') || node.classList.contains('product-cta-btn') || node.classList.contains('newsletter-btn') || node.classList.contains('btn'))) || node.tagName === 'A' || node.tagName === 'BUTTON' ? node : null);

        // Add move/delete controls only after identifying the original block
        // type. Otherwise those editor-only buttons make ordinary text look
        // like a button block to the inspector.
        this.attachBlockQuickToolbar(node);
        
        if (isSocial) {
            const socialNode = node.classList && node.classList.contains('newsletter-social-block') ? node : node.closest('.newsletter-social-block');
            console.log('[HKM Inspector] Loading SOCIAL inspector');
            this.showSocialInspector(socialNode);
        } else if (img) {
            console.log('[HKM Inspector] Loading IMAGE inspector');
            this.showImageInspector(img, node);
        } else if (btn) {
            console.log('[HKM Inspector] Loading BUTTON inspector');
            this.showButtonInspector(btn, node);
        } else {
            console.log('[HKM Inspector] Loading TEXT inspector');
            this.showTextInspector(node);
        }

        if (this.isMobileViewport()) {
            this.openMobilePropertiesDrawer();
        }
    }

    getEditorBlockLabel(node) {
        if (!node) return 'Element';
        const tagName = String(node.tagName || '').toUpperCase();
        const classList = node.classList;

        if (/^H[1-6]$/.test(tagName)) return 'Overskrift';
        if (classList?.contains('newsletter-social-block') || node.querySelector?.('.newsletter-social-block')) return 'Sosialt';
        if (classList?.contains('newsletter-product-block') || node.querySelector?.('.newsletter-product-block, .product-card')) return 'Produkt';
        if (classList?.contains('newsletter-event-block') || node.querySelector?.('.newsletter-event-block, .event-card')) return 'Arrangement';
        if (node.querySelector?.('img') || tagName === 'IMG') return 'Bilde';
        if (node.querySelector?.('video, iframe') || tagName === 'VIDEO' || tagName === 'IFRAME') return 'Video';
        if (node.querySelector?.('.block-btn, .product-cta-btn, .newsletter-btn, a[href], button') || tagName === 'A' || tagName === 'BUTTON') return 'Knapp';
        if (tagName === 'HR' || classList?.contains('newsletter-divider')) return 'Skillelinje';
        if (classList?.contains('newsletter-spacer')) return 'Avstand';
        return 'Tekst';
    }

    deselectBlock() {
        document.querySelectorAll('#block-quick-toolbar').forEach(el => el.remove());
        if (this.activeBlockNode) {
            console.log('[HKM Inspector] deselectBlock triggered');
            this.activeBlockNode.classList.remove('selected-block-active');
            this.activeBlockNode.removeAttribute('data-editor-label');
            this.activeBlockNode = null;
        }

        // Show default elements view
        const defaultView = document.getElementById('sidebar-default-view');
        const inspectorView = document.getElementById('sidebar-inspector-view');
        if (defaultView && inspectorView) {
            defaultView.style.display = 'flex';
            inspectorView.style.display = 'none';
        }

        // Keep the persistent formatting toolbar available between selections.
        const topToolbar = document.getElementById('desktop-richtools');
        if (topToolbar) {
            topToolbar.style.removeProperty('display');
        }
    }

    changeBlockTag(blockNode, newTag) {
        const newElement = document.createElement(newTag);
        // Copy attributes
        Array.from(blockNode.attributes).forEach(attr => {
            newElement.setAttribute(attr.name, attr.value);
        });
        // Copy inner HTML
        newElement.innerHTML = blockNode.innerHTML;
        // Replace in DOM
        blockNode.parentNode.replaceChild(newElement, blockNode);
        // Maintain selection class
        newElement.classList.add('selected-block-active');
        this.syncUnifiedBlocks();
        return newElement;
    }

    getAlignSVG(align) {
        if (align === 'center') {
            return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"></line><line x1="6" y1="12" x2="18" y2="12"></line><line x1="5" y1="18" x2="19" y2="18"></line></svg>`;
        } else if (align === 'right') {
            return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"></line><line x1="9" y1="12" x2="21" y2="12"></line><line x1="6" y1="18" x2="21" y2="18"></line></svg>`;
        } else if (align === 'justify') {
            return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>`;
        } else {
            return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="12" x2="15" y2="12"></line><line x1="3" y1="18" x2="18" y2="18"></line></svg>`;
        }
    }

    openDynamicValueModal() {
        // Remove existing modal if any
        const existingModal = document.getElementById('hkm-dynamic-value-modal');
        if (existingModal) existingModal.remove();

        const modal = document.createElement('div');
        modal.id = 'hkm-dynamic-value-modal';
        modal.className = 'hkm-dyn-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(15, 23, 42, 0.4);
            backdrop-filter: blur(4px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 999999;
            opacity: 0;
            transition: opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        `;

        modal.innerHTML = `
            <div class="hkm-dyn-modal-content card modern" style="
                max-width: 480px; 
                width: 90%; 
                background: white; 
                border-radius: 16px; 
                box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04); 
                display: flex; 
                flex-direction: column; 
                overflow: visible;
                position: relative;
                padding: 24px;
                box-sizing: border-box;
                font-family: 'Inter', sans-serif;
                height: auto !important;
                min-height: auto !important;
                max-height: 90vh !important;
            ">
                <!-- Close Button -->
                <button type="button" id="hkm-dyn-close" class="material-symbols-outlined" style="
                    position: absolute; 
                    top: 20px; 
                    right: 20px; 
                    background: none; 
                    border: none; 
                    color: #1e293b; 
                    cursor: pointer; 
                    font-size: 22px; 
                    padding: 4px; 
                    border-radius: 50%; 
                    transition: background 0.2s;
                ">close</button>

                <!-- Header -->
                <h3 style="margin: 0 0 20px 0; font-size: 20px; font-weight: 700; color: #1e293b; line-height: 1.2;">Legg til en dynamisk verdi</h3>

                <!-- Field 1: Value Selector -->
                <div style="margin-bottom: 20px; position: relative;">
                    <label style="display: flex; align-items: center; gap: 6px; font-size: 14px; font-weight: 600; color: #334155; margin-bottom: 8px;">
                        Hvilken verdi vil du legge til?
                        <span class="material-symbols-outlined" style="font-size: 16px; color: #3b82f6; cursor: help;" title="Velg et felt som skal erstattes med mottakerens personlige informasjon">info</span>
                    </label>
                    
                    <!-- Custom Select Dropdown -->
                    <div id="hkm-dyn-select-trigger" style="
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        padding: 12px 16px;
                        border: 1.5px solid #cbd5e1;
                        border-radius: 8px;
                        cursor: pointer;
                        background: #ffffff;
                        transition: all 0.2s;
                        font-size: 14px;
                        color: #64748b;
                        user-select: none;
                    ">
                        <span id="hkm-dyn-select-label">Begynn å skrive eller velg en verdi</span>
                        <span class="material-symbols-outlined" style="color: #3b82f6; font-size: 20px; transition: transform 0.2s;">expand_more</span>
                    </div>

                    <!-- Dropdown Options List -->
                    <div id="hkm-dyn-select-options" style="
                        display: none;
                        position: absolute;
                        top: calc(100% + 6px);
                        left: 0;
                        right: 0;
                        background: #ffffff;
                        border: 1px solid #e2e8f0;
                        border-radius: 8px;
                        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
                        z-index: 1000;
                        max-height: 240px;
                        overflow-y: auto;
                        padding: 6px;
                        box-sizing: border-box;
                    ">
                        <div class="hkm-dyn-opt" data-tag="contact.name.last" data-label="Kontaktens etternavn" style="padding: 10px 12px; border-radius: 6px; cursor: pointer; transition: background 0.2s;">
                            <div style="font-weight: 600; font-size: 14px; color: #1e293b;">Kontaktens etternavn</div>
                            <div style="font-size: 12px; color: #64748b; margin-top: 2px;">contact.name.last</div>
                        </div>
                        <div class="hkm-dyn-opt" data-tag="contact.name.first" data-label="Kontaktens fornavn" style="padding: 10px 12px; border-radius: 6px; cursor: pointer; transition: background 0.2s;">
                            <div style="font-weight: 600; font-size: 14px; color: #1e293b;">Kontaktens fornavn</div>
                            <div style="font-size: 12px; color: #64748b; margin-top: 2px;">contact.name.first</div>
                        </div>
                        <div class="hkm-dyn-opt" data-tag="contact.email" data-label="Kontakt-epost" style="padding: 10px 12px; border-radius: 6px; cursor: pointer; transition: background 0.2s;">
                            <div style="font-weight: 600; font-size: 14px; color: #1e293b;">Kontakt-epost</div>
                            <div style="font-size: 12px; color: #64748b; margin-top: 2px;">contact.email</div>
                        </div>
                        <div class="hkm-dyn-opt" data-tag="website.url" data-label="Nettadressens URL" style="padding: 10px 12px; border-radius: 6px; cursor: pointer; transition: background 0.2s;">
                            <div style="font-weight: 600; font-size: 14px; color: #1e293b;">Nettadressens URL</div>
                            <div style="font-size: 12px; color: #64748b; margin-top: 2px;">website.url</div>
                        </div>
                    </div>
                </div>

                <!-- Field 2: Fallback Input -->
                <div style="margin-bottom: 24px;">
                    <label style="display: flex; align-items: center; gap: 6px; font-size: 14px; font-weight: 600; color: #334155; margin-bottom: 8px;">
                        Hva er tilbakefallsteksten?
                        <span class="material-symbols-outlined" style="font-size: 16px; color: #3b82f6; cursor: help;" title="Tekst som vises dersom mottakeren mangler verdi for det valgte feltet">info</span>
                    </label>
                    <input type="text" id="hkm-dyn-fallback-input" placeholder="f.eks. Hei sann! Kunde ..." style="
                        width: 100%;
                        padding: 12px 16px;
                        border: 1.5px solid #cbd5e1;
                        border-radius: 8px;
                        font-size: 14px;
                        color: #1e293b;
                        box-sizing: border-box;
                        outline: none;
                        transition: border-color 0.2s;
                    ">
                </div>

                <!-- Footer Buttons -->
                <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 8px;">
                    <button type="button" id="hkm-dyn-cancel" style="
                        background: #ffffff;
                        border: 1.5px solid #cbd5e1;
                        color: #005bff;
                        padding: 10px 24px;
                        border-radius: 9999px;
                        font-size: 14px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.2s;
                    ">Avbryt</button>
                    <button type="button" id="hkm-dyn-submit" disabled style="
                        background: #cbd5e1;
                        border: none;
                        color: #ffffff;
                        padding: 10px 24px;
                        border-radius: 9999px;
                        font-size: 14px;
                        font-weight: 600;
                        cursor: not-allowed;
                        transition: all 0.2s;
                    ">Legg til</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        
        // Trigger reflow for animation
        modal.offsetHeight;
        modal.style.opacity = '1';

        // State variables
        let selectedTag = '';
        let selectedLabel = '';

        // DOM elements
        const trigger = modal.querySelector('#hkm-dyn-select-trigger');
        const triggerLabel = modal.querySelector('#hkm-dyn-select-label');
        const optionsList = modal.querySelector('#hkm-dyn-select-options');
        const fallbackInput = modal.querySelector('#hkm-dyn-fallback-input');
        const submitBtn = modal.querySelector('#hkm-dyn-submit');
        const cancelBtn = modal.querySelector('#hkm-dyn-cancel');
        const closeBtn = modal.querySelector('#hkm-dyn-close');

        // Toggle dropdown open/close
        const toggleDropdown = (e) => {
            e.stopPropagation();
            const isOpen = optionsList.style.display === 'block';
            optionsList.style.display = isOpen ? 'none' : 'block';
            trigger.style.borderColor = isOpen ? '#cbd5e1' : '#005bff';
            const icon = trigger.querySelector('.material-symbols-outlined');
            if (icon) icon.style.transform = isOpen ? 'rotate(0)' : 'rotate(180deg)';
        };
        trigger.addEventListener('click', toggleDropdown);

        // Close dropdown when clicking outside
        const closeDropdownOutside = () => {
            optionsList.style.display = 'none';
            trigger.style.borderColor = '#cbd5e1';
            const icon = trigger.querySelector('.material-symbols-outlined');
            if (icon) icon.style.transform = 'rotate(0)';
        };
        window.addEventListener('click', closeDropdownOutside);

        // Option styles and hover effects
        const optionEls = modal.querySelectorAll('.hkm-dyn-opt');
        optionEls.forEach(opt => {
            opt.addEventListener('mouseenter', () => {
                opt.style.background = '#f0f7ff';
            });
            opt.addEventListener('mouseleave', () => {
                opt.style.background = 'transparent';
            });
            opt.addEventListener('click', (e) => {
                e.stopPropagation();
                selectedTag = opt.dataset.tag;
                selectedLabel = opt.dataset.label;
                
                triggerLabel.innerText = selectedLabel;
                triggerLabel.style.color = '#1e293b';
                
                optionsList.style.display = 'none';
                trigger.style.borderColor = '#cbd5e1';
                const icon = trigger.querySelector('.material-symbols-outlined');
                if (icon) icon.style.transform = 'rotate(0)';
                
                // Enable submit button
                submitBtn.disabled = false;
                submitBtn.style.background = '#005bff';
                submitBtn.style.cursor = 'pointer';
            });
        });

        // Focus borders on inputs
        fallbackInput.addEventListener('focus', () => {
            fallbackInput.style.borderColor = '#005bff';
        });
        fallbackInput.addEventListener('blur', () => {
            fallbackInput.style.borderColor = '#cbd5e1';
        });

        // Close modal helpers
        const closeModal = () => {
            window.removeEventListener('click', closeDropdownOutside);
            modal.style.opacity = '0';
            setTimeout(() => modal.remove(), 250);
        };

        cancelBtn.addEventListener('click', closeModal);
        closeBtn.addEventListener('click', closeModal);

        // Submit action
        submitBtn.addEventListener('click', () => {
            const fallbackVal = fallbackInput.value.trim();
            let finalTag = '';
            if (fallbackVal) {
                finalTag = `{{${selectedTag} | fallback: "${fallbackVal}"}}`;
            } else {
                finalTag = `{{${selectedTag}}}`;
            }

            // Restore range and insert HTML tag
            this.restoreSelection();
            this.exec('insertHTML', finalTag);
            this.syncUnifiedBlocks();
            closeModal();
        });
    }

    showHeaderInspector() {
        const propertiesPanel = document.querySelector('.builder-properties-panel');
        if (propertiesPanel) propertiesPanel.style.display = 'flex';

        const defaultView = document.getElementById('sidebar-default-view');
        const inspectorView = document.getElementById('sidebar-inspector-view');
        if (!inspectorView) return;

        if (defaultView) defaultView.style.display = 'none';
        inspectorView.style.display = 'flex';

        const headerNode = document.querySelector('.canvas-header');
        if (!headerNode) return;

        const badgeEl = headerNode.querySelector('.premium-header-badge');
        if (badgeEl) badgeEl.remove();

        const logoImg = headerNode.querySelector('.newsletter-logo');
        const titleEl = headerNode.querySelector('.canvas-brand-name');
        const issueEl = headerNode.querySelector('.canvas-brand-issue');

        const logoSrc = logoImg ? logoImg.src : '';
        const titleText = titleEl ? titleEl.innerText.trim() : 'HKM STUDIO MÅNEDSBREV';
        const issueText = issueEl ? issueEl.innerText.trim() : 'Juli utgave';

        // Read current computed styles or inline styles
        const titleColorHex = (titleEl && titleEl.style.color) ? titleEl.style.color : '#1e293b';
        const issueColorHex = (issueEl && issueEl.style.color) ? issueEl.style.color : '#64748b';
        const headerBgHex = (headerNode && headerNode.style.backgroundColor) ? headerNode.style.backgroundColor : '#ffffff';

        const mainTitleEl = document.getElementById('main-properties-title');
        if (mainTitleEl) mainTitleEl.textContent = 'Rediger E-posthode';

        inspectorView.innerHTML = `
            <div class="inspector-body" style="display: flex; flex-direction: column; gap: 16px;">
                <!-- Logo URL Input -->
                <div class="inspector-group">
                    <label style="font-weight: 600; font-size: 12px; color: #64748b; margin-bottom: 6px; display: block;">Logo Bilde (URL)</label>
                    <input type="text" id="hdr-inspector-logo" value="${logoSrc.replace(/"/g, '&quot;')}" class="elements-search-input" style="padding: 0 10px; margin-bottom: 8px;">
                    <button type="button" id="hdr-btn-change-logo" class="btn-secondary-outline" style="width: 100%; height: 34px; justify-content: center; border-radius: 8px;">
                        <span class="material-symbols-outlined" style="font-size: 18px; margin-right: 6px;">upload</span>
                        <span>Velg bilde fra arkiv</span>
                    </button>
                </div>

                <!-- Brand Title Input -->
                <div class="inspector-group">
                    <label style="font-weight: 600; font-size: 12px; color: #64748b; margin-bottom: 6px; display: block;">Hovedtittel</label>
                    <input type="text" id="hdr-inspector-title" value="${titleText.replace(/"/g, '&quot;')}" class="elements-search-input" style="padding: 0 10px;">
                </div>

                <!-- Title Color -->
                <div class="inspector-group">
                    <label style="font-weight: 600; font-size: 12px; color: #64748b; margin-bottom: 6px; display: block;">Tittelfarge</label>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <input type="color" id="hdr-color-title" value="#1e293b" style="width: 36px; height: 36px; border: 1px solid #e2e8f0; border-radius: 8px; cursor: pointer; padding: 0; background: transparent;">
                        <input type="text" id="hdr-color-title-hex" value="#1e293b" class="elements-search-input" style="padding: 0 10px; flex: 1;">
                    </div>
                </div>

                <!-- Subtitle Color -->
                <div class="inspector-group">
                    <label style="font-weight: 600; font-size: 12px; color: #64748b; margin-bottom: 6px; display: block;">Undertittelfarge</label>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <input type="color" id="hdr-color-issue" value="#64748b" style="width: 36px; height: 36px; border: 1px solid #e2e8f0; border-radius: 8px; cursor: pointer; padding: 0; background: transparent;">
                        <input type="text" id="hdr-color-issue-hex" value="#64748b" class="elements-search-input" style="padding: 0 10px; flex: 1;">
                    </div>
                </div>

                <!-- Header Background Color -->
                <div class="inspector-group">
                    <label style="font-weight: 600; font-size: 12px; color: #64748b; margin-bottom: 6px; display: block;">Bakgrunnsfarge på hode</label>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <input type="color" id="hdr-color-bg" value="#ffffff" style="width: 36px; height: 36px; border: 1px solid #e2e8f0; border-radius: 8px; cursor: pointer; padding: 0; background: transparent;">
                        <input type="text" id="hdr-color-bg-hex" value="#ffffff" class="elements-search-input" style="padding: 0 10px; flex: 1;">
                    </div>
                </div>

                <!-- Text Alignment -->
                <div class="inspector-group">
                    <label style="font-weight: 600; font-size: 12px; color: #64748b; margin-bottom: 6px; display: block;">Tekstjustering</label>
                    <div style="display: flex; gap: 4px; background: #f1f5f9; padding: 4px; border-radius: 8px;">
                        <button type="button" class="hdr-align-btn btn-secondary-outline" data-align="left" style="flex: 1; height: 32px; padding: 0; border: none; background: transparent; border-radius: 6px;">
                            <span class="material-symbols-outlined" style="font-size: 18px;">format_align_left</span>
                        </button>
                        <button type="button" class="hdr-align-btn btn-secondary-outline active" data-align="center" style="flex: 1; height: 32px; padding: 0; border: none; background: #ffffff; border-radius: 6px; box-shadow: 0 1px 2px rgba(0,0,0,0.08);">
                            <span class="material-symbols-outlined" style="font-size: 18px;">format_align_center</span>
                        </button>
                        <button type="button" class="hdr-align-btn btn-secondary-outline" data-align="right" style="flex: 1; height: 32px; padding: 0; border: none; background: transparent; border-radius: 6px;">
                            <span class="material-symbols-outlined" style="font-size: 18px;">format_align_right</span>
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Wire up close inspector button
        document.getElementById('close-properties-btn')?.addEventListener('click', () => {
            if (inspectorView) inspectorView.style.display = 'none';
            if (defaultView) defaultView.style.display = 'block';
            const mtEl = document.getElementById('main-properties-title');
            if (mtEl) mtEl.textContent = 'Egenskaper';
        });

        // Wire up text inputs
        document.getElementById('hdr-inspector-logo')?.addEventListener('input', (e) => {
            if (logoImg) logoImg.src = e.target.value;
            this.syncUnifiedBlocks();
        });
        document.getElementById('hdr-inspector-title')?.addEventListener('input', (e) => {
            if (titleEl) titleEl.innerText = e.target.value;
            this.syncUnifiedBlocks();
        });
        document.getElementById('hdr-inspector-issue')?.addEventListener('input', (e) => {
            if (issueEl) issueEl.innerText = e.target.value;
            this.syncUnifiedBlocks();
        });

        // Wire up Title Color
        const titlePicker = document.getElementById('hdr-color-title');
        const titleHex = document.getElementById('hdr-color-title-hex');
        titlePicker?.addEventListener('input', (e) => {
            if (titleEl) titleEl.style.color = e.target.value;
            if (titleHex) titleHex.value = e.target.value;
            this.syncUnifiedBlocks();
        });
        titleHex?.addEventListener('input', (e) => {
            if (titleEl) titleEl.style.color = e.target.value;
            if (titlePicker) titlePicker.value = e.target.value;
            this.syncUnifiedBlocks();
        });

        // Wire up Subtitle Color
        const issuePicker = document.getElementById('hdr-color-issue');
        const issueHex = document.getElementById('hdr-color-issue-hex');
        issuePicker?.addEventListener('input', (e) => {
            if (issueEl) issueEl.style.color = e.target.value;
            if (issueHex) issueHex.value = e.target.value;
            this.syncUnifiedBlocks();
        });
        issueHex?.addEventListener('input', (e) => {
            if (issueEl) issueEl.style.color = e.target.value;
            if (issuePicker) issuePicker.value = e.target.value;
            this.syncUnifiedBlocks();
        });

        // Wire up Header Background Color
        const bgPicker = document.getElementById('hdr-color-bg');
        const bgHex = document.getElementById('hdr-color-bg-hex');
        bgPicker?.addEventListener('input', (e) => {
            if (headerNode) headerNode.style.backgroundColor = e.target.value;
            if (bgHex) bgHex.value = e.target.value;
            this.syncUnifiedBlocks();
        });
        bgHex?.addEventListener('input', (e) => {
            if (headerNode) headerNode.style.backgroundColor = e.target.value;
            if (bgPicker) bgPicker.value = e.target.value;
            this.syncUnifiedBlocks();
        });

        // Wire up Alignment buttons
        document.querySelectorAll('.hdr-align-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const align = btn.dataset.align;
                if (headerNode) headerNode.style.textAlign = align;
                document.querySelectorAll('.hdr-align-btn').forEach(b => {
                    b.style.background = 'transparent';
                    b.style.boxShadow = 'none';
                    b.classList.remove('active');
                });
                btn.style.background = '#ffffff';
                btn.style.boxShadow = '0 1px 2px rgba(0,0,0,0.08)';
                btn.classList.add('active');
                this.syncUnifiedBlocks();
            });
        });

        // Logo image picker button integration
        document.getElementById('hdr-btn-change-logo')?.addEventListener('click', () => {
            if (typeof this.openImageManager === 'function') {
                this.openImageManager((selectedUrl) => {
                    if (logoImg) logoImg.src = selectedUrl;
                    const input = document.getElementById('hdr-inspector-logo');
                    if (input) input.value = selectedUrl;
                    this.syncUnifiedBlocks();
                });
            } else {
                this.showPromptModal(
                    "Ny logo-URL:",
                    "https://...",
                    (newUrl) => {
                        if (logoImg) logoImg.src = newUrl;
                        const input = document.getElementById('hdr-inspector-logo');
                        if (input) input.value = newUrl;
                        this.syncUnifiedBlocks();
                    },
                    logoSrc,
                    "Vennligst oppgi en gyldig bilde-URL.",
                    "Endre logo",
                    "Oppdater"
                );
            }
        });
    }

    attachBlockQuickToolbar(node) {
        document.querySelectorAll('#block-quick-toolbar').forEach(el => el.remove());
        if (!node) return;

        const isSocial = (node.classList && node.classList.contains('newsletter-social-block')) || (node.closest && node.closest('.newsletter-social-block'));
        const socialNode = isSocial ? (node.classList && node.classList.contains('newsletter-social-block') ? node : node.closest('.newsletter-social-block')) : null;

        const toolbar = document.createElement('div');
        toolbar.id = 'block-quick-toolbar';
        toolbar.className = 'block-quick-toolbar';
        toolbar.setAttribute('contenteditable', 'false');
        toolbar.innerHTML = `
            <button type="button" class="quick-tb-btn" id="qtb-move-up" title="Flytt opp (↑)">
                <span class="material-symbols-outlined" style="font-size: 16px;">arrow_upward</span>
            </button>
            <button type="button" class="quick-tb-btn" id="qtb-move-down" title="Flytt ned (↓)">
                <span class="material-symbols-outlined" style="font-size: 16px;">arrow_downward</span>
            </button>
            ${socialNode ? `
            <button type="button" class="quick-tb-btn" id="qtb-edit-social" title="Endre stil & lenker (✏️)" style="color: #3b82f6;">
                <span class="material-symbols-outlined" style="font-size: 16px;">tune</span>
            </button>
            ` : ''}
            <button type="button" class="quick-tb-btn" id="qtb-duplicate-block" title="Dupliser element">
                <span class="material-symbols-outlined" style="font-size: 16px;">content_copy</span>
            </button>
            <button type="button" class="quick-tb-btn" id="qtb-delete-block" title="Slett element (🗑️)" style="color: #ef4444;">
                <span class="material-symbols-outlined" style="font-size: 16px;">delete</span>
            </button>
        `;

        node.appendChild(toolbar);

        toolbar.querySelector('#qtb-move-up')?.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.moveActiveBlock(-1);
        });
        toolbar.querySelector('#qtb-move-down')?.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.moveActiveBlock(1);
        });
        toolbar.querySelector('#qtb-edit-social')?.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.openSocialInsertionFlowAt(socialNode || node);
        });
        toolbar.querySelector('#qtb-duplicate-block')?.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.duplicateActiveBlock();
        });
        toolbar.querySelector('#qtb-delete-block')?.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const targetNode = socialNode || node;
            targetNode.remove();
            toolbar.remove();
            this.deselectBlock();
            this.syncUnifiedBlocks();
            this.triggerAutosave();
            showToast("Element slettet", "info");
        });
    }

    showSocialInspector(socialNode) {
        const defaultView = document.getElementById('sidebar-default-view');
        const inspectorView = document.getElementById('sidebar-inspector-view');
        if (!inspectorView) return;

        if (defaultView) defaultView.style.display = 'none';
        inspectorView.style.display = 'flex';

        const titleEl = document.getElementById('inspector-title');
        if (titleEl) titleEl.textContent = 'Sosiale medier';

        const contentEl = document.getElementById('inspector-content');
        if (!contentEl) return;

        contentEl.innerHTML = `
            <div style="padding: 16px; display: flex; flex-direction: column; gap: 16px; font-family: 'Inter', sans-serif;">
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 16px; text-align: center;">
                    <span class="material-symbols-outlined" style="font-size: 36px; color: #1B4965; margin-bottom: 8px; display: block;">share</span>
                    <div style="font-weight: 700; font-size: 15px; color: #0f172a;">Sosiale medier banner</div>
                    <div style="font-size: 12.5px; color: #64748b; margin-top: 4px; line-height: 1.4;">Velg visningsstil (Ikon + Tekst, Bare ikoner, Bare tekst) eller slett hele banneret.</div>
                </div>

                <button type="button" id="inspector-edit-social-btn" style="width: 100%; padding: 12px 16px; border: none; border-radius: 12px; background: linear-gradient(135deg, #1B4965 0%, #0f172a 100%); color: white; font-weight: 700; font-size: 14px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 4px 6px -1px rgba(27, 73, 101, 0.2); transition: all 0.2s;">
                    <span class="material-symbols-outlined" style="font-size: 18px;">tune</span>
                    Endre stil & lenker
                </button>

                <button type="button" id="inspector-delete-social-btn" style="width: 100%; padding: 12px 16px; border: 1px solid #fecaca; border-radius: 12px; background: #fef2f2; color: #dc2626; font-weight: 700; font-size: 14px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.2s;">
                    <span class="material-symbols-outlined" style="font-size: 18px;">delete</span>
                    Slett sosial blokk
                </button>
            </div>
        `;

        contentEl.querySelector('#inspector-edit-social-btn')?.addEventListener('click', () => {
            this.openSocialInsertionFlowAt(socialNode);
        });

        contentEl.querySelector('#inspector-delete-social-btn')?.addEventListener('click', () => {
            socialNode.remove();
            this.deselectBlock();
            this.syncUnifiedBlocks();
            this.triggerAutosave();
            showToast("Sosiale medier slettet", "info");
        });
    }

    showTextInspector(node) {
        const defaultView = document.getElementById('sidebar-default-view');
        const inspectorView = document.getElementById('sidebar-inspector-view');
        if (!inspectorView) return;

        if (defaultView) defaultView.style.display = 'none';
        inspectorView.style.display = 'flex';

        const computed = window.getComputedStyle(node);
        const fontName = node.style.fontFamily || computed.fontFamily;
        let cleanFont = fontName.replace(/['"]/g, '').split(',')[0].trim();
        const currentSize = parseInt(node.style.fontSize) || parseInt(computed.fontSize) || 16;
        const currentAlign = node.style.textAlign || computed.textAlign || 'left';
        
        let formatVal = 'p';
        if (node.tagName === 'H1') formatVal = 'h1';
        else if (node.tagName === 'H2') formatVal = 'h2';
        else if (node.tagName === 'H3') formatVal = 'h3';

        const isBold = computed.fontWeight === 'bold' || parseInt(computed.fontWeight) >= 700;
        const isItalic = computed.fontStyle === 'italic';
        
        const textDec = computed.textDecoration || '';
        const isUnderline = textDec.includes('underline');

        const isDesktopOnly = node.classList.contains('hkm-desktop-only');
        const isMobileOnly = node.classList.contains('hkm-mobile-only');

        inspectorView.innerHTML = `
            <div class="inspector-header" style="border-bottom: none; padding-bottom: 8px;">
                <h2 style="font-size: 20px; font-weight: 700;">Tilpass tekst</h2>
            </div>
            
            <div class="inspector-tabs">
                <button class="inspector-tab active" data-tab="content">Innhold</button>
                <button class="inspector-tab" data-tab="design">Design</button>
            </div>
            
            <div class="inspector-body" id="inspector-tab-content" style="padding-top: 16px;">
                <!-- Plassering i e-posten reorder bar -->
                <div class="inspector-group inspector-reorder-card">
                    <label class="inspector-group-label" style="font-weight: 700; font-size: 11px; color: #475569; margin-bottom: 8px; display: block; text-transform: uppercase; letter-spacing: 0.5px;">Plassering i e-posten</label>
                    <div class="inspector-reorder-grid">
                        <button type="button" data-block-action="move-up" class="btn-secondary-outline inspector-reorder-btn" title="Flytt opp">
                            <span class="material-symbols-outlined" style="font-size: 18px; margin-right: 4px; flex-shrink: 0;">arrow_upward</span>
                            <span>Opp</span>
                        </button>
                        <button type="button" data-block-action="move-down" class="btn-secondary-outline inspector-reorder-btn" title="Flytt ned">
                            <span class="material-symbols-outlined" style="font-size: 18px; margin-right: 4px; flex-shrink: 0;">arrow_downward</span>
                            <span>Ned</span>
                        </button>
                        <button type="button" data-block-action="duplicate" class="btn-secondary-outline inspector-reorder-btn" title="Kopier element">
                            <span class="material-symbols-outlined" style="font-size: 18px; margin-right: 4px; flex-shrink: 0;">content_copy</span>
                            <span>Kopier</span>
                        </button>
                        <button type="button" data-block-action="delete" class="btn-secondary-outline inspector-reorder-btn" style="color: #ef4444; border-color: #fca5a5;" title="Slett element">
                            <span class="material-symbols-outlined" style="font-size: 18px; margin-right: 4px; flex-shrink: 0;">delete</span>
                            <span>Slett</span>
                        </button>
                    </div>
                </div>

                <!-- Format Dropdown inside Wix-style select wrapper -->
                <div class="inspector-group">
                    <label class="inspector-group-label" style="font-weight: 500; font-size: 13px; color: #475569; margin-bottom: 4px;">Format</label>
                    <div class="inspector-select-wrapper">
                        <select id="text-inspector-format">
                            <option value="p" ${formatVal === 'p' ? 'selected' : ''}>Avsnitt 1</option>
                            <option value="h1" ${formatVal === 'h1' ? 'selected' : ''}>Overskrift 1</option>
                            <option value="h2" ${formatVal === 'h2' ? 'selected' : ''}>Overskrift 2</option>
                            <option value="h3" ${formatVal === 'h3' ? 'selected' : ''}>Overskrift 3</option>
                        </select>
                    </div>
                </div>

                <!-- Font & Size side-by-side inside Wix-style select wrappers -->
                <div class="inspector-group-row" style="margin-top: 16px;">
                    <div class="inspector-group" style="flex: 1; margin-bottom: 0;">
                        <label class="inspector-group-label" style="font-weight: 500; font-size: 13px; color: #475569; margin-bottom: 4px;">Skrifttyper</label>
                        <div class="inspector-select-wrapper">
                            <select id="text-inspector-font">
                                <option value="Arial, sans-serif" ${cleanFont.includes('Arial') ? 'selected' : ''}>Arial</option>
                                <option value="'Inter', sans-serif" ${cleanFont.includes('Inter') ? 'selected' : ''}>Inter</option>
                                <option value="'Roboto', sans-serif" ${cleanFont.includes('Roboto') ? 'selected' : ''}>Roboto</option>
                                <option value="'Playfair Display', serif" ${cleanFont.includes('Playfair') ? 'selected' : ''}>Playfair Display</option>
                                <option value="Georgia, serif" ${cleanFont.includes('Georgia') ? 'selected' : ''}>Georgia</option>
                                <option value="'Courier New', monospace" ${cleanFont.includes('Courier') ? 'selected' : ''}>Courier New</option>
                            </select>
                        </div>
                    </div>
                    <div class="inspector-group" style="width: 80px; margin-bottom: 0;">
                        <label class="inspector-group-label" style="font-weight: 500; font-size: 13px; color: #475569; margin-bottom: 4px;">Størrelse</label>
                        <div class="inspector-select-wrapper">
                            <select id="text-inspector-size">
                                ${[12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48].map(size => `
                                    <option value="${size}" ${currentSize === size ? 'selected' : ''}>${size}</option>
                                `).join('')}
                            </select>
                        </div>
                    </div>
                </div>

                <!-- 3-row flat Wix formatting grid -->
                <div class="inspector-group" style="margin-top: 24px;">
                    <label class="inspector-group-label" style="font-weight: 500; font-size: 13px; color: #475569; margin-bottom: 8px;">Stiler</label>
                    
                    <!-- Row 1: B, I, U, Color, Highlight Color, Alignment -->
                    <div class="inspector-style-grid" style="margin-bottom: 12px; gap: 8px;">
                        <button class="inspector-style-btn ${isBold ? 'active' : ''}" id="text-btn-bold" title="Fet" style="font-family: 'Inter', sans-serif; font-weight: 800; font-size: 18px;">
                            B
                        </button>
                        <button class="inspector-style-btn ${isItalic ? 'active' : ''}" id="text-btn-italic" title="Kursiv" style="font-family: 'Inter', sans-serif; font-style: italic; font-weight: 700; font-size: 18px;">
                            I
                        </button>
                        <button class="inspector-style-btn ${isUnderline ? 'active' : ''}" id="text-btn-underline" title="Understreket" style="font-family: 'Inter', sans-serif; text-decoration: underline; font-weight: 700; font-size: 18px;">
                            U
                        </button>
                        <button class="inspector-style-btn" id="text-btn-color" title="Tekstfarge" style="position: relative; overflow: hidden;">
                            <span class="material-symbols-outlined" style="font-size: 20px; pointer-events: none;">format_color_text</span>
                            <span id="text-btn-color-indicator" style="position: absolute; bottom: 6px; left: 10px; right: 10px; height: 3px; background: #1b4965; border-radius: 1px; pointer-events: none;"></span>
                            <input type="color" id="input-text-forecolor" value="#1b4965" title="Velg tekstfarge" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; border: 0; padding: 0;">
                        </button>
                        <button class="inspector-style-btn" id="text-btn-bg" title="Tekstbakgrunn / utheving" style="position: relative; overflow: hidden;">
                            <span class="material-symbols-outlined" style="font-size: 20px; pointer-events: none;">border_color</span>
                            <span id="text-btn-bg-indicator" style="position: absolute; bottom: 6px; left: 10px; right: 10px; height: 3px; background: #ffff00; border-radius: 1px; pointer-events: none;"></span>
                            <input type="color" id="input-text-backcolor" value="#ffff00" title="Velg bakgrunnsfarge" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; border: 0; padding: 0;">
                        </button>
                        <button class="inspector-style-btn" id="text-btn-align-cycle" title="Justering">
                            ${this.getAlignSVG(currentAlign)}
                        </button>
                    </div>
                    
                    <!-- Row 2: Link, Unlink, Numbered list, Bulleted list, Outdent, Indent -->
                    <div class="inspector-style-grid" style="margin-bottom: 12px; gap: 8px;">
                        <button class="inspector-style-btn" id="text-btn-link" title="Sett inn lenke">
                            <span class="material-symbols-outlined" style="font-size: 20px;">link</span>
                        </button>
                        <button class="inspector-style-btn" id="text-btn-unlink" title="Fjern lenke">
                            <span class="material-symbols-outlined" style="font-size: 20px;">link_off</span>
                        </button>
                        <button class="inspector-style-btn" id="text-btn-list-number" title="Nummerert liste">
                            <span class="material-symbols-outlined" style="font-size: 20px;">format_list_numbered</span>
                        </button>
                        <button class="inspector-style-btn" id="text-btn-list-bullet" title="Punktliste">
                            <span class="material-symbols-outlined" style="font-size: 20px;">format_list_bulleted</span>
                        </button>
                        <button class="inspector-style-btn" id="text-btn-outdent" title="Reduser innrykk">
                            <span class="material-symbols-outlined" style="font-size: 20px;">format_indent_decrease</span>
                        </button>
                        <button class="inspector-style-btn" id="text-btn-indent" title="Øk innrykk">
                            <span class="material-symbols-outlined" style="font-size: 20px;">format_indent_increase</span>
                        </button>
                    </div>
                    
                    <!-- Row 3: Line Height, Paragraph Spacing, Character Spacing, Clear formatting, Text Transform -->
                    <div class="inspector-style-grid" style="gap: 8px;">
                        <button class="inspector-style-btn" id="text-btn-lineheight" title="Linjeavstand">
                            <span class="material-symbols-outlined" style="font-size: 20px;">format_line_spacing</span>
                        </button>
                        <button class="inspector-style-btn" id="text-btn-spacing" title="Avstand etter avsnitt">
                            <span class="material-symbols-outlined" style="font-size: 20px;">space_bar</span>
                        </button>
                        <button class="inspector-style-btn" id="text-btn-char-spacing" title="Tegnmellomrom" style="display: flex; flex-direction: column; justify-content: center; align-items: center; position: relative;">
                            <span style="font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 800; letter-spacing: 1px; line-height: 1;">AV</span>
                            <span style="position: absolute; bottom: 4px; left: 8px; right: 8px; border-bottom: 2px solid #1e293b;"></span>
                        </button>
                        <button class="inspector-style-btn" id="text-btn-clear" title="Nullstill formatering" style="position: relative;">
                            <span style="font-family: 'Inter', sans-serif; font-size: 15px; font-weight: 700;">T</span>
                            <span style="font-family: 'Inter', sans-serif; font-size: 10px; font-weight: 700; position: absolute; top: 6px; right: 8px; color: #ef4444;">x</span>
                        </button>
                        <button class="inspector-style-btn ${node.style.textTransform === 'uppercase' ? 'active' : ''}" id="text-btn-caps" title="Store/Små bokstaver" style="font-family: 'Inter', sans-serif; font-weight: 800; font-size: 14px;">
                            TT
                        </button>
                        <div style="flex: 1;"></div>
                    </div>
                </div>

                <!-- Personalization -->
                <div style="margin-top: 24px;">
                    <a href="#" id="text-inspector-personalize" style="font-size: 14px; font-weight: 500; color: #005bff; text-decoration: none; display: flex; align-items: center; gap: 8px;">
                        <span class="material-symbols-outlined" style="font-size: 20px; font-weight: bold;">add</span>
                        Legg til personlig tilpasset innhold
                    </a>
                </div>

                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 16px 0;" />

                <!-- Synlighet accordion wrapper -->
                <div class="inspector-group" style="margin-top: 0;">
                    <div style="display: flex; align-items: center; justify-content: space-between; cursor: pointer; padding: 8px 0;" id="text-inspector-visibility-toggle">
                        <span style="font-size: 15px; font-weight: 600; color: #1e293b;">Synlighet</span>
                        <span class="material-symbols-outlined" id="visibility-accordion-arrow" style="font-size: 18px; color: #1e293b;">arrow_right</span>
                    </div>
                    <div id="text-inspector-visibility-content" style="display: none; padding-top: 12px; font-size: 14px; color: #475569;">
                        <p style="margin: 0 0 12px 0; font-size: 14px; color: #64748b;">Velg hvor dette elementet skal vises.</p>
                        
                        <!-- Visibility options stack -->
                        <div class="visibility-options-stack" style="display: flex; flex-direction: column; gap: 8px;">
                            <!-- Option 1: Alle enheter -->
                            <div class="visibility-card ${!isDesktopOnly && !isMobileOnly ? 'active' : ''}" data-value="all" style="position: relative; display: flex; align-items: center; gap: 12px; padding: 12px 16px; border: 1.5px solid #cbd5e1; border-radius: 8px; cursor: pointer; background: #ffffff; transition: all 0.2s ease;">
                                <span class="material-symbols-outlined" style="font-size: 20px; color: #475569;">devices</span>
                                <span style="font-weight: 600; color: #1e293b; font-size: 14px;">Alle enheter</span>
                                <div class="visibility-check" style="position: absolute; top: -6px; right: -6px; width: 16px; height: 16px; background: #005bff; color: white; border-radius: 50%; display: ${!isDesktopOnly && !isMobileOnly ? 'flex' : 'none'}; align-items: center; justify-content: center; font-size: 10px; font-weight: bold;">✓</div>
                            </div>
                            
                            <!-- Option 2: Kun PC -->
                            <div class="visibility-card ${isDesktopOnly ? 'active' : ''}" data-value="desktop" style="position: relative; display: flex; align-items: center; gap: 12px; padding: 12px 16px; border: 1.5px solid #cbd5e1; border-radius: 8px; cursor: pointer; background: #ffffff; transition: all 0.2s ease;">
                                <span class="material-symbols-outlined" style="font-size: 20px; color: #475569;">computer</span>
                                <span style="font-weight: 600; color: #1e293b; font-size: 14px;">Kun PC</span>
                                <div class="visibility-check" style="position: absolute; top: -6px; right: -6px; width: 16px; height: 16px; background: #005bff; color: white; border-radius: 50%; display: ${isDesktopOnly ? 'flex' : 'none'}; align-items: center; justify-content: center; font-size: 10px; font-weight: bold;">✓</div>
                            </div>
                            
                            <!-- Option 3: Kun mobil -->
                            <div class="visibility-card ${isMobileOnly ? 'active' : ''}" data-value="mobile" style="position: relative; display: flex; align-items: center; gap: 12px; padding: 12px 16px; border: 1.5px solid #cbd5e1; border-radius: 8px; cursor: pointer; background: #ffffff; transition: all 0.2s ease;">
                                <span class="material-symbols-outlined" style="font-size: 20px; color: #475569;">smartphone</span>
                                <span style="font-weight: 600; color: #1e293b; font-size: 14px;">Kun mobil</span>
                                <div class="visibility-check" style="position: absolute; top: -6px; right: -6px; width: 16px; height: 16px; background: #005bff; color: white; border-radius: 50%; display: ${isMobileOnly ? 'flex' : 'none'}; align-items: center; justify-content: center; font-size: 10px; font-weight: bold;">✓</div>
                            </div>
                        </div>
                        
                        <!-- Info box -->
                        <div style="margin-top: 16px; padding: 12px 16px; background: #f1f5f9; border-radius: 8px; font-size: 13px; color: #475569; line-height: 1.5;">
                            Bruk Forhåndsvisning og test for å se hvordan e-posten din vises på hver enhet.
                        </div>
                    </div>
                </div>
            </div>

            <div class="inspector-body" id="inspector-tab-design" style="display: none; padding-top: 16px;">
                <div class="inspector-group">
                    <label class="inspector-group-label" style="font-weight: 500; font-size: 13px; color: #475569; margin-bottom: 4px;">Bakgrunnsfarge</label>
                    <input type="color" class="inspector-input" id="text-design-bg-color" value="#ffffff" style="height: 40px; padding: 4px; cursor: pointer; border-radius: 8px;">
                </div>
                <div class="inspector-group" style="margin-top: 16px;">
                    <label class="inspector-group-label" style="font-weight: 500; font-size: 13px; color: #475569; margin-bottom: 4px;">Marginer (Topp / Bunn)</label>
                    <div class="inspector-select-wrapper">
                        <select id="text-design-margin">
                            <option value="8px">8 px (Tett)</option>
                            <option value="16px" selected>16 px (Normal)</option>
                            <option value="24px">24 px (Romslig)</option>
                            <option value="32px">32 px (Generøs)</option>
                        </select>
                    </div>
                </div>

                <div class="inspector-group" style="margin-top: 20px; border-top: 1px solid #e2e8f0; padding-top: 16px;">
                    <label class="inspector-group-label" style="font-weight: 700; font-size: 13px; color: #1e293b; margin-bottom: 10px; display: block;">Plassering &amp; Handlinger</label>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                        <button type="button" data-block-action="move-up" class="btn-secondary-outline" style="width: 100%; height: 36px; justify-content: center; font-size: 13px; font-weight: 600;">
                            <span class="material-symbols-outlined" style="font-size: 18px; margin-right: 4px;">arrow_upward</span>
                            <span>Flytt opp</span>
                        </button>
                        <button type="button" data-block-action="move-down" class="btn-secondary-outline" style="width: 100%; height: 36px; justify-content: center; font-size: 13px; font-weight: 600;">
                            <span class="material-symbols-outlined" style="font-size: 18px; margin-right: 4px;">arrow_downward</span>
                            <span>Flytt ned</span>
                        </button>
                        <button type="button" data-block-action="duplicate" class="btn-secondary-outline" style="width: 100%; height: 36px; justify-content: center; font-size: 13px; font-weight: 600;">
                            <span class="material-symbols-outlined" style="font-size: 18px; margin-right: 4px;">content_copy</span>
                            <span>Dupliser</span>
                        </button>
                        <button type="button" data-block-action="delete" class="btn-secondary-outline" style="width: 100%; height: 36px; justify-content: center; font-size: 13px; font-weight: 600; color: #ef4444; border-color: #fca5a5;">
                            <span class="material-symbols-outlined" style="font-size: 18px; margin-right: 4px;">delete</span>
                            <span>Slett</span>
                        </button>
                    </div>
                </div>
            </div>
        `;

        this.bindTextInspectorEvents(node);
    }

    bindTextInspectorEvents(node) {
        let currentNode = node;
        const selectFormat = document.getElementById('text-inspector-format');
        const selectFont = document.getElementById('text-inspector-font');
        const selectSize = document.getElementById('text-inspector-size');

        document.querySelectorAll('.inspector-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.inspector-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                const isDesign = tab.dataset.tab === 'design';
                document.getElementById('inspector-tab-content').style.display = isDesign ? 'none' : 'flex';
                document.getElementById('inspector-tab-design').style.display = isDesign ? 'flex' : 'none';
            });
        });

        if (selectFormat) {
            selectFormat.addEventListener('change', () => {
                currentNode = this.changeBlockTag(currentNode, selectFormat.value);
            });
        }

        if (selectFont) {
            selectFont.addEventListener('change', () => {
                currentNode.style.fontFamily = selectFont.value;
                this.syncUnifiedBlocks();
            });
        }

        if (selectSize) {
            selectSize.addEventListener('change', () => {
                currentNode.style.fontSize = selectSize.value + 'px';
                this.syncUnifiedBlocks();
            });
        }

        const bindTool = (btnId, cmd, val = null) => {
            const btn = document.getElementById(btnId);
            if (btn) {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.exec(cmd, val);
                    btn.classList.toggle('active', document.queryCommandState(cmd));
                });
            }
        };

        bindTool('text-btn-bold', 'bold');
        bindTool('text-btn-italic', 'italic');
        bindTool('text-btn-underline', 'underline');
        bindTool('text-btn-list-bullet', 'insertUnorderedList');
        bindTool('text-btn-list-number', 'insertOrderedList');
        bindTool('text-btn-outdent', 'outdent');
        bindTool('text-btn-indent', 'indent');

        const btnAlignCycle = document.getElementById('text-btn-align-cycle');
        if (btnAlignCycle) {
            btnAlignCycle.addEventListener('click', (e) => {
                e.preventDefault();
                const aligns = ['left', 'center', 'right', 'justify'];
                const current = currentNode.style.textAlign || 'left';
                const nextIdx = (aligns.indexOf(current) + 1) % aligns.length;
                const nextAlign = aligns[nextIdx];
                currentNode.style.textAlign = nextAlign;
                
                btnAlignCycle.innerHTML = this.getAlignSVG(nextAlign);
                this.syncUnifiedBlocks();
            });
        }

        const foreColorInput = document.getElementById('input-text-forecolor');
        if (foreColorInput) {
            foreColorInput.addEventListener('input', (e) => {
                const color = e.target.value;
                this.exec('foreColor', color);
                const indicator = document.getElementById('text-btn-color-indicator');
                if (indicator) indicator.style.background = color;
            });
            foreColorInput.addEventListener('change', () => this.syncUnifiedBlocks());
        }

        const backColorInput = document.getElementById('input-text-backcolor');
        if (backColorInput) {
            backColorInput.addEventListener('input', (e) => {
                const color = e.target.value;
                this.exec('backColor', color);
                const indicator = document.getElementById('text-btn-bg-indicator');
                if (indicator) indicator.style.background = color;
            });
            backColorInput.addEventListener('change', () => this.syncUnifiedBlocks());
        }

        const btnLink = document.getElementById('text-btn-link');
        if (btnLink) {
            btnLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.showPromptModal(
                    "Sett inn lenke",
                    "Tast inn nettadresse (https://...)",
                    (url) => {
                        if (url) this.exec('createLink', url);
                    },
                    "https://",
                    "Vennligst oppgi en gyldig URL.",
                    "Sett inn lenke",
                    "Sett inn"
                );
            });
        }

        const btnUnlink = document.getElementById('text-btn-unlink');
        if (btnUnlink) {
            btnUnlink.addEventListener('click', (e) => {
                e.preventDefault();
                this.exec('unlink');
            });
        }

        const btnClear = document.getElementById('text-btn-clear');
        if (btnClear) {
            btnClear.addEventListener('click', (e) => {
                e.preventDefault();
                this.exec('removeFormat');
            });
        }

        const btnLineHeight = document.getElementById('text-btn-lineheight');
        if (btnLineHeight) {
            btnLineHeight.addEventListener('click', (e) => {
                e.preventDefault();
                this.showPromptModal(
                    "Linjeavstand",
                    "F.eks. 1.2, 1.5, 1.8 eller normal",
                    (value) => {
                        currentNode.style.lineHeight = value;
                        this.syncUnifiedBlocks();
                    },
                    currentNode.style.lineHeight || "1.5",
                    "Vennligst oppgi en linjeavstand.",
                    "Endre linjeavstand",
                    "Bruk"
                );
            });
        }

        const btnSpacing = document.getElementById('text-btn-spacing');
        if (btnSpacing) {
            btnSpacing.addEventListener('click', (e) => {
                e.preventDefault();
                this.showPromptModal(
                    "Avstand etter avsnitt",
                    "F.eks. 8px, 16px eller 24px",
                    (value) => {
                        currentNode.style.marginBottom = value;
                        this.syncUnifiedBlocks();
                    },
                    currentNode.style.marginBottom || "16px",
                    "Vennligst oppgi en avstand.",
                    "Endre avsnittsavstand",
                    "Bruk"
                );
            });
        }

        const btnCharSpacing = document.getElementById('text-btn-char-spacing');
        if (btnCharSpacing) {
            btnCharSpacing.addEventListener('click', (e) => {
                e.preventDefault();
                this.showPromptModal(
                    "Tegnmellomrom",
                    "F.eks. 0.5px, 1px, 2px eller normal",
                    (value) => {
                        currentNode.style.letterSpacing = value;
                        this.syncUnifiedBlocks();
                    },
                    currentNode.style.letterSpacing || "normal",
                    "Vennligst oppgi et tegnmellomrom.",
                    "Endre tegnmellomrom",
                    "Bruk"
                );
            });
        }

        const btnCaps = document.getElementById('text-btn-caps');
        if (btnCaps) {
            btnCaps.addEventListener('click', (e) => {
                e.preventDefault();
                const current = currentNode.style.textTransform;
                currentNode.style.textTransform = current === 'uppercase' ? 'none' : 'uppercase';
                btnCaps.classList.toggle('active', currentNode.style.textTransform === 'uppercase');
                this.syncUnifiedBlocks();
            });
        }

        document.querySelectorAll('#sidebar-inspector-view [data-block-action]').forEach((button) => {
            button.addEventListener('click', (event) => {
                event.preventDefault();
                const action = button.dataset.blockAction;
                if (action === 'move-up') this.moveActiveBlock(-1);
                if (action === 'move-down') this.moveActiveBlock(1);
                if (action === 'duplicate') this.duplicateActiveBlock();
                if (action === 'delete') this.deleteActiveBlock();
            });
        });

        const btnPers = document.getElementById('text-inspector-personalize');
        if (btnPers) {
            btnPers.addEventListener('click', (e) => {
                e.preventDefault();
                this.saveSelection();
                this.openDynamicValueModal();
            });
        }

        const visToggle = document.getElementById('text-inspector-visibility-toggle');
        if (visToggle) {
            visToggle.addEventListener('click', () => {
                const content = document.getElementById('text-inspector-visibility-content');
                const isHidden = content.style.display === 'none';
                content.style.display = isHidden ? 'block' : 'none';
                
                const arrowEl = document.getElementById('visibility-accordion-arrow');
                if (arrowEl) {
                    arrowEl.innerText = isHidden ? 'arrow_drop_down' : 'arrow_right';
                }
            });
        }

        document.querySelectorAll('#text-inspector-visibility-content .visibility-card').forEach(card => {
            card.addEventListener('click', () => {
                document.querySelectorAll('#text-inspector-visibility-content .visibility-card').forEach(c => {
                    c.classList.remove('active');
                    c.querySelector('.visibility-check').style.display = 'none';
                });
                
                card.classList.add('active');
                card.querySelector('.visibility-check').style.display = 'flex';
                
                const val = card.dataset.value;
                if (val === 'desktop') {
                    currentNode.classList.add('hkm-desktop-only');
                    currentNode.classList.remove('hkm-mobile-only');
                } else if (val === 'mobile') {
                    currentNode.classList.add('hkm-mobile-only');
                    currentNode.classList.remove('hkm-desktop-only');
                } else {
                    currentNode.classList.remove('hkm-desktop-only');
                    currentNode.classList.remove('hkm-mobile-only');
                }
                this.syncUnifiedBlocks();
            });
        });
    }

    showImageInspector(img, node) {
        const defaultView = document.getElementById('sidebar-default-view');
        const inspectorView = document.getElementById('sidebar-inspector-view');
        if (!inspectorView) return;

        if (defaultView) defaultView.style.display = 'none';
        inspectorView.style.display = 'flex';

        const currentSrc = img.src || '';
        const currentAlt = img.alt || '';
        
        let linkHref = '';
        let parentLink = img.closest('a');
        if (parentLink) {
            linkHref = parentLink.getAttribute('href') || '';
        }

        const isDesktopOnly = node.classList.contains('hkm-desktop-only');
        const isMobileOnly = node.classList.contains('hkm-mobile-only');

        inspectorView.innerHTML = `
            <div class="inspector-header">
                <h2>Tilpass bilde</h2>
            </div>
            
            <div class="inspector-tabs">
                <button class="inspector-tab active" data-tab="content">Innhold</button>
                <button class="inspector-tab" data-tab="design">Design</button>
            </div>
            
            <div class="inspector-body" id="inspector-tab-content">
                <!-- Plassering i e-posten reorder bar -->
                <div class="inspector-group inspector-reorder-card">
                    <label class="inspector-group-label" style="font-weight: 700; font-size: 11px; color: #475569; margin-bottom: 8px; display: block; text-transform: uppercase; letter-spacing: 0.5px;">Plassering i e-posten</label>
                    <div class="inspector-reorder-grid">
                        <button type="button" id="btn-img-move-up" class="btn-secondary-outline inspector-reorder-btn" title="Flytt opp">
                            <span class="material-symbols-outlined" style="font-size: 18px; margin-right: 4px; flex-shrink: 0;">arrow_upward</span>
                            <span>Opp</span>
                        </button>
                        <button type="button" id="btn-img-move-down" class="btn-secondary-outline inspector-reorder-btn" title="Flytt ned">
                            <span class="material-symbols-outlined" style="font-size: 18px; margin-right: 4px; flex-shrink: 0;">arrow_downward</span>
                            <span>Ned</span>
                        </button>
                        <button type="button" id="btn-img-duplicate" class="btn-secondary-outline inspector-reorder-btn" title="Kopier element">
                            <span class="material-symbols-outlined" style="font-size: 18px; margin-right: 4px; flex-shrink: 0;">content_copy</span>
                            <span>Kopier</span>
                        </button>
                        <button type="button" id="btn-img-delete" class="btn-secondary-outline inspector-reorder-btn" style="color: #ef4444; border-color: #fca5a5;" title="Slett element">
                            <span class="material-symbols-outlined" style="font-size: 18px; margin-right: 4px; flex-shrink: 0;">delete</span>
                            <span>Slett</span>
                        </button>
                    </div>
                </div>
                <div class="inspector-group">
                    <label class="inspector-group-label">Bilde</label>
                    <div class="inspector-image-preview-wrap">
                        <img class="inspector-image-preview" src="${currentSrc}" alt="Forhåndsvisning">
                        <div class="inspector-image-overlay">
                            <button type="button" class="inspector-btn-small" id="img-inspector-change">Endre bilde</button>
                            <button type="button" class="inspector-btn-small" id="img-inspector-crop">Rediger</button>
                        </div>
                    </div>
                </div>

                <div class="inspector-group">
                    <label class="inspector-group-label">Alt-tekst (for universell utforming)</label>
                    <input type="text" class="inspector-input" id="img-inspector-alt" value="${currentAlt}" placeholder="Beskriv bildet...">
                </div>

                <div class="inspector-group">
                    <div style="display: flex; align-items: center; justify-content: space-between;">
                        <label class="inspector-group-label" style="margin: 0;">Legg til en lenke</label>
                        <input type="checkbox" id="img-inspector-has-link" ${linkHref ? 'checked' : ''} style="cursor: pointer;">
                    </div>
                    <input type="text" class="inspector-input" id="img-inspector-link-url" value="${linkHref}" placeholder="https://..." style="display: ${linkHref ? 'block' : 'none'}; margin-top: 8px;">
                </div>

                <div class="inspector-group" style="margin-top: 16px; border-top: 1px solid #e2e8f0; padding-top: 16px;">
                    <div style="display: flex; align-items: center; justify-content: space-between; cursor: pointer; padding: 8px 0;" id="img-inspector-visibility-toggle">
                        <span style="font-size: 15px; font-weight: 600; color: #1e293b;">Synlighet</span>
                        <span class="material-symbols-outlined" id="img-visibility-accordion-arrow" style="font-size: 18px; color: #1e293b;">arrow_right</span>
                    </div>
                    <div id="img-inspector-visibility-content" style="display: none; padding-top: 12px; font-size: 14px; color: #475569;">
                        <p style="margin: 0 0 12px 0; font-size: 14px; color: #64748b;">Velg hvor dette elementet skal vises.</p>
                        
                        <!-- Visibility options stack -->
                        <div class="visibility-options-stack" style="display: flex; flex-direction: column; gap: 8px;">
                            <!-- Option 1: Alle enheter -->
                            <div class="visibility-card ${!isDesktopOnly && !isMobileOnly ? 'active' : ''}" data-value="all" style="position: relative; display: flex; align-items: center; gap: 12px; padding: 12px 16px; border: 1.5px solid #cbd5e1; border-radius: 8px; cursor: pointer; background: #ffffff; transition: all 0.2s ease;">
                                <span class="material-symbols-outlined" style="font-size: 20px; color: #475569;">devices</span>
                                <span style="font-weight: 600; color: #1e293b; font-size: 14px;">Alle enheter</span>
                                <div class="visibility-check" style="position: absolute; top: -6px; right: -6px; width: 16px; height: 16px; background: #005bff; color: white; border-radius: 50%; display: ${!isDesktopOnly && !isMobileOnly ? 'flex' : 'none'}; align-items: center; justify-content: center; font-size: 10px; font-weight: bold;">✓</div>
                            </div>
                            
                            <!-- Option 2: Kun PC -->
                            <div class="visibility-card ${isDesktopOnly ? 'active' : ''}" data-value="desktop" style="position: relative; display: flex; align-items: center; gap: 12px; padding: 12px 16px; border: 1.5px solid #cbd5e1; border-radius: 8px; cursor: pointer; background: #ffffff; transition: all 0.2s ease;">
                                <span class="material-symbols-outlined" style="font-size: 20px; color: #475569;">computer</span>
                                <span style="font-weight: 600; color: #1e293b; font-size: 14px;">Kun PC</span>
                                <div class="visibility-check" style="position: absolute; top: -6px; right: -6px; width: 16px; height: 16px; background: #005bff; color: white; border-radius: 50%; display: ${isDesktopOnly ? 'flex' : 'none'}; align-items: center; justify-content: center; font-size: 10px; font-weight: bold;">✓</div>
                            </div>
                            
                            <!-- Option 3: Kun mobil -->
                            <div class="visibility-card ${isMobileOnly ? 'active' : ''}" data-value="mobile" style="position: relative; display: flex; align-items: center; gap: 12px; padding: 12px 16px; border: 1.5px solid #cbd5e1; border-radius: 8px; cursor: pointer; background: #ffffff; transition: all 0.2s ease;">
                                <span class="material-symbols-outlined" style="font-size: 20px; color: #475569;">smartphone</span>
                                <span style="font-weight: 600; color: #1e293b; font-size: 14px;">Kun mobil</span>
                                <div class="visibility-check" style="position: absolute; top: -6px; right: -6px; width: 16px; height: 16px; background: #005bff; color: white; border-radius: 50%; display: ${isMobileOnly ? 'flex' : 'none'}; align-items: center; justify-content: center; font-size: 10px; font-weight: bold;">✓</div>
                            </div>
                        </div>
                        
                        <!-- Info box -->
                        <div style="margin-top: 16px; padding: 12px 16px; background: #f1f5f9; border-radius: 8px; font-size: 13px; color: #475569; line-height: 1.5;">
                            Bruk Forhåndsvisning og test for å se hvordan e-posten din vises på hver enhet.
                        </div>
                    </div>
                </div>
            </div>

            <div class="inspector-body" id="inspector-tab-design" style="display: none;">
                <div class="inspector-group">
                    <label class="inspector-group-label">Justering</label>
                    <div class="inspector-style-grid" style="grid-template-columns: repeat(3, 1fr);">
                        <button class="inspector-style-btn" id="img-btn-align-left" title="Venstre">
                            <span class="material-symbols-outlined" style="font-size: 18px;">align_horizontal_left</span>
                        </button>
                        <button class="inspector-style-btn" id="img-btn-align-center" title="Senter">
                            <span class="material-symbols-outlined" style="font-size: 18px;">align_horizontal_center</span>
                        </button>
                        <button class="inspector-style-btn" id="img-btn-align-right" title="Høyre">
                            <span class="material-symbols-outlined" style="font-size: 18px;">align_horizontal_right</span>
                        </button>
                    </div>
                </div>
                <div class="inspector-group" style="margin-top: 20px; border-top: 1px solid #e2e8f0; padding-top: 16px;">
                    <label class="inspector-group-label" style="font-weight: 700; font-size: 13px; color: #1e293b; margin-bottom: 10px; display: block;">Plassering &amp; Handlinger</label>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                        <button type="button" id="btn-img-move-up" class="btn-secondary-outline" style="width: 100%; height: 36px; justify-content: center; font-size: 13px; font-weight: 600;">
                            <span class="material-symbols-outlined" style="font-size: 18px; margin-right: 4px;">arrow_upward</span>
                            <span>Flytt opp</span>
                        </button>
                        <button type="button" id="btn-img-move-down" class="btn-secondary-outline" style="width: 100%; height: 36px; justify-content: center; font-size: 13px; font-weight: 600;">
                            <span class="material-symbols-outlined" style="font-size: 18px; margin-right: 4px;">arrow_downward</span>
                            <span>Flytt ned</span>
                        </button>
                        <button type="button" id="btn-img-duplicate" class="btn-secondary-outline" style="width: 100%; height: 36px; justify-content: center; font-size: 13px; font-weight: 600;">
                            <span class="material-symbols-outlined" style="font-size: 18px; margin-right: 4px;">content_copy</span>
                            <span>Dupliser</span>
                        </button>
                        <button type="button" id="btn-img-delete" class="btn-secondary-outline" style="width: 100%; height: 36px; justify-content: center; font-size: 13px; font-weight: 600; color: #ef4444; border-color: #fca5a5;">
                            <span class="material-symbols-outlined" style="font-size: 18px; margin-right: 4px;">delete</span>
                            <span>Slett</span>
                        </button>
                    </div>
                </div>
            </div>
        `;

        this.bindImageInspectorEvents(img, node);
    }

    bindImageInspectorEvents(img, node) {
        const inputAlt = document.getElementById('img-inspector-alt');
        const checkLink = document.getElementById('img-inspector-has-link');
        const inputLinkUrl = document.getElementById('img-inspector-link-url');
        const btnChange = document.getElementById('img-inspector-change');
        const btnCrop = document.getElementById('img-inspector-crop');

        document.querySelectorAll('.inspector-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.inspector-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                const isDesign = tab.dataset.tab === 'design';
                document.getElementById('inspector-tab-content').style.display = isDesign ? 'none' : 'flex';
                document.getElementById('inspector-tab-design').style.display = isDesign ? 'flex' : 'none';
            });
        });

        if (btnChange) {
            btnChange.addEventListener('click', () => {
                const blockId = node.id || 'unified_content';
                this.activeImageBlockId = blockId;
                this.activeColumnIndex = null;
                this.openImageInsertionFlowAt(null, img);
            });
        }

        if (btnCrop) {
            btnCrop.addEventListener('click', () => {
                this.openImageCropper(img.src, (newUrl) => {
                    img.src = newUrl;
                    img.setAttribute('src', newUrl);
                    document.querySelector('.inspector-image-preview').src = newUrl;
                    this.syncUnifiedBlocks();
                    showToast("Bilde beskjært!", "success");
                }, 'newsletter/images');
            });
        }

        if (inputAlt) {
            inputAlt.addEventListener('input', () => {
                img.alt = inputAlt.value;
                this.syncUnifiedBlocks();
            });
        }

        if (checkLink) {
            checkLink.addEventListener('change', () => {
                const hasLink = checkLink.checked;
                inputLinkUrl.style.display = hasLink ? 'block' : 'none';
                
                if (hasLink) {
                    let parentLink = img.closest('a');
                    if (!parentLink) {
                        const a = document.createElement('a');
                        a.href = inputLinkUrl.value || '#';
                        a.style.display = 'inline-block';
                        img.parentNode.insertBefore(a, img);
                        a.appendChild(img);
                    }
                } else {
                    let parentLink = img.closest('a');
                    if (parentLink) {
                        parentLink.parentNode.insertBefore(img, parentLink);
                        parentLink.remove();
                    }
                }
                this.syncUnifiedBlocks();
            });
        }

        if (inputLinkUrl) {
            inputLinkUrl.addEventListener('input', () => {
                let parentLink = img.closest('a');
                if (parentLink) {
                    parentLink.href = inputLinkUrl.value;
                }
                this.syncUnifiedBlocks();
            });
        }

        const aligns = ['left', 'center', 'right'];
        aligns.forEach(align => {
            const btn = document.getElementById(`img-btn-align-${align}`);
            if (btn) {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    if (align === 'center') {
                        img.style.margin = '0 auto';
                        img.style.display = 'block';
                    } else if (align === 'right') {
                        img.style.margin = '0 0 0 auto';
                        img.style.display = 'block';
                    } else {
                        img.style.margin = '0 auto 0 0';
                        img.style.display = 'block';
                    }
                    this.syncUnifiedBlocks();
                });
            }
        });

        const imgVisToggle = document.getElementById('img-inspector-visibility-toggle');
        if (imgVisToggle) {
            imgVisToggle.addEventListener('click', () => {
                const content = document.getElementById('img-inspector-visibility-content');
                const isHidden = content.style.display === 'none';
                content.style.display = isHidden ? 'block' : 'none';
                
                const arrowEl = document.getElementById('img-visibility-accordion-arrow');
                if (arrowEl) {
                    arrowEl.innerText = isHidden ? 'arrow_drop_down' : 'arrow_right';
                }
            });
        }

        document.querySelectorAll('#img-inspector-visibility-content .visibility-card').forEach(card => {
            card.addEventListener('click', () => {
                document.querySelectorAll('#img-inspector-visibility-content .visibility-card').forEach(c => {
                    c.classList.remove('active');
                    c.querySelector('.visibility-check').style.display = 'none';
                });
                
                card.classList.add('active');
                card.querySelector('.visibility-check').style.display = 'flex';
                
                const val = card.dataset.value;
                if (val === 'desktop') {
                    node.classList.add('hkm-desktop-only');
                    node.classList.remove('hkm-mobile-only');
                } else if (val === 'mobile') {
                    node.classList.add('hkm-mobile-only');
                    node.classList.remove('hkm-desktop-only');
                } else {
                    node.classList.remove('hkm-desktop-only');
                    node.classList.remove('hkm-mobile-only');
                }
                this.syncUnifiedBlocks();
            });
        });

        document.getElementById('btn-img-move-up')?.addEventListener('click', () => this.moveActiveBlock(-1));
        document.getElementById('btn-img-move-down')?.addEventListener('click', () => this.moveActiveBlock(1));
        document.getElementById('btn-img-duplicate')?.addEventListener('click', () => this.duplicateActiveBlock());
        document.getElementById('btn-img-delete')?.addEventListener('click', () => this.deleteActiveBlock());
    }

    showButtonInspector(btn, node) {
        const defaultView = document.getElementById('sidebar-default-view');
        const inspectorView = document.getElementById('sidebar-inspector-view');
        if (!inspectorView) return;

        if (defaultView) defaultView.style.display = 'none';
        inspectorView.style.display = 'flex';

        const currentText = btn.innerText || 'Les mer';
        const currentUrl = btn.getAttribute('href') || 'https://';
        
        const computed = window.getComputedStyle(btn);
        const currentRadius = computed.borderRadius;

        const isDesktopOnly = node.classList.contains('hkm-desktop-only');
        const isMobileOnly = node.classList.contains('hkm-mobile-only');

        const internalPages = [
            { name: "🏠 Forside / Hjem", url: "https://www.hiskingdomministry.no/", defaultText: "Gå til forside" },
            { name: "📅 Arrangementer & Kalender", url: "https://www.hiskingdomministry.no/arrangementer.html", defaultText: "Se arrangementer" },
            { name: "📖 Bibel & Leseplaner", url: "https://www.hiskingdomministry.no/bibel.html", defaultText: "Les i Bibelen" },
            { name: "🙏 Bønnevegg & Bønneemner", url: "https://www.hiskingdomministry.no/bonnevegg.html", defaultText: "Send bønneemne" },
            { name: "📚 Blogg & Undervisning", url: "https://www.hiskingdomministry.no/blogg.html", defaultText: "Les artikler" },
            { name: "🛍️ Nettbutikk (His Kingdom Designs)", url: "https://www.hiskingdomdesigns.no/", defaultText: "Besøk nettbutikken" },
            { name: "💖 Gi en gave / Støtt arbeidet", url: "https://www.hiskingdomministry.no/stott-oss.html", defaultText: "Støtt arbeidet" },
            { name: "ℹ️ Om oss", url: "https://www.hiskingdomministry.no/om-oss.html", defaultText: "Les om oss" },
            { name: "✉️ Kontakt oss", url: "https://www.hiskingdomministry.no/kontakt.html", defaultText: "Ta kontakt" },
            { name: "👤 Min side (Medlem)", url: "https://www.hiskingdomministry.no/minside/", defaultText: "Gå til Min side" }
        ];

        const matchedInternal = internalPages.find(p => p.url === currentUrl || currentUrl.startsWith(p.url));
        const isInternalLink = !!matchedInternal || !currentUrl.startsWith('http') || currentUrl.includes('hiskingdomministry.no') || currentUrl.includes('hiskingdomdesigns.no');

        inspectorView.innerHTML = `
            <div class="inspector-header">
                <h2>Tilpass knapp</h2>
            </div>
            
            <div class="inspector-tabs">
                <button class="inspector-tab active" data-tab="content">Innhold</button>
                <button class="inspector-tab" data-tab="design">Design</button>
            </div>
            
            <div class="inspector-body" id="inspector-tab-content">
                <!-- Plassering i e-posten reorder bar -->
                <div class="inspector-group inspector-reorder-card">
                    <label class="inspector-group-label" style="font-weight: 700; font-size: 11px; color: #475569; margin-bottom: 8px; display: block; text-transform: uppercase; letter-spacing: 0.5px;">Plassering i e-posten</label>
                    <div class="inspector-reorder-grid">
                        <button type="button" id="btn-btn-move-up" class="btn-secondary-outline inspector-reorder-btn" title="Flytt opp">
                            <span class="material-symbols-outlined" style="font-size: 18px; margin-right: 4px; flex-shrink: 0;">arrow_upward</span>
                            <span>Opp</span>
                        </button>
                        <button type="button" id="btn-btn-move-down" class="btn-secondary-outline inspector-reorder-btn" title="Flytt ned">
                            <span class="material-symbols-outlined" style="font-size: 18px; margin-right: 4px; flex-shrink: 0;">arrow_downward</span>
                            <span>Ned</span>
                        </button>
                        <button type="button" id="btn-btn-duplicate" class="btn-secondary-outline inspector-reorder-btn" title="Kopier element">
                            <span class="material-symbols-outlined" style="font-size: 18px; margin-right: 4px; flex-shrink: 0;">content_copy</span>
                            <span>Kopier</span>
                        </button>
                        <button type="button" id="btn-btn-delete" class="btn-secondary-outline inspector-reorder-btn" style="color: #ef4444; border-color: #fca5a5;" title="Slett element">
                            <span class="material-symbols-outlined" style="font-size: 18px; margin-right: 4px; flex-shrink: 0;">delete</span>
                            <span>Slett</span>
                        </button>
                    </div>
                </div>
                <div class="inspector-group">
                    <label class="inspector-group-label">Knappetekst</label>
                    <input type="text" class="inspector-input" id="btn-inspector-text" value="${escapeHtml(currentText)}">
                </div>

                <div class="inspector-group">
                    <label class="inspector-group-label">Lenketype</label>
                    <select class="inspector-select" id="btn-inspector-link-type" style="font-weight: 600;">
                        <option value="internal" ${isInternalLink ? 'selected' : ''}>🌐 Intern side på nettsiden</option>
                        <option value="external" ${!isInternalLink ? 'selected' : ''}>🔗 Ekstern nettadresse (URL)</option>
                    </select>
                </div>

                <div class="inspector-group" id="btn-inspector-internal-group" style="display: ${isInternalLink ? 'block' : 'none'};">
                    <label class="inspector-group-label">Velg intern side</label>
                    <select class="inspector-select" id="btn-inspector-internal-select" style="font-weight: 600;">
                        ${internalPages.map(p => `<option value="${p.url}" data-default-text="${p.defaultText}" ${currentUrl === p.url ? 'selected' : ''}>${p.name}</option>`).join('')}
                    </select>
                </div>

                <div class="inspector-group" id="btn-inspector-external-group" style="display: ${!isInternalLink ? 'block' : 'none'};">
                    <label class="inspector-group-label">Ekstern nettadresse (URL)</label>
                    <input type="text" class="inspector-input" id="btn-inspector-url" value="${escapeHtml(currentUrl)}">
                </div>

                <div class="inspector-group" style="margin-top: 16px; border-top: 1px solid #e2e8f0; padding-top: 16px;">
                    <div style="display: flex; align-items: center; justify-content: space-between; cursor: pointer; padding: 8px 0;" id="btn-inspector-visibility-toggle">
                        <span style="font-size: 15px; font-weight: 600; color: #1e293b;">Synlighet</span>
                        <span class="material-symbols-outlined" id="btn-visibility-accordion-arrow" style="font-size: 18px; color: #1e293b;">arrow_right</span>
                    </div>
                    <div id="btn-inspector-visibility-content" style="display: none; padding-top: 12px; font-size: 14px; color: #475569;">
                        <p style="margin: 0 0 12px 0; font-size: 14px; color: #64748b;">Velg hvor dette elementet skal vises.</p>
                        
                        <!-- Visibility options stack -->
                        <div class="visibility-options-stack" style="display: flex; flex-direction: column; gap: 8px;">
                            <!-- Option 1: Alle enheter -->
                            <div class="visibility-card ${!isDesktopOnly && !isMobileOnly ? 'active' : ''}" data-value="all" style="position: relative; display: flex; align-items: center; gap: 12px; padding: 12px 16px; border: 1.5px solid #cbd5e1; border-radius: 8px; cursor: pointer; background: #ffffff; transition: all 0.2s ease;">
                                <span class="material-symbols-outlined" style="font-size: 20px; color: #475569;">devices</span>
                                <span style="font-weight: 600; color: #1e293b; font-size: 14px;">Alle enheter</span>
                                <div class="visibility-check" style="position: absolute; top: -6px; right: -6px; width: 16px; height: 16px; background: #005bff; color: white; border-radius: 50%; display: ${!isDesktopOnly && !isMobileOnly ? 'flex' : 'none'}; align-items: center; justify-content: center; font-size: 10px; font-weight: bold;">✓</div>
                            </div>
                            
                            <!-- Option 2: Kun PC -->
                            <div class="visibility-card ${isDesktopOnly ? 'active' : ''}" data-value="desktop" style="position: relative; display: flex; align-items: center; gap: 12px; padding: 12px 16px; border: 1.5px solid #cbd5e1; border-radius: 8px; cursor: pointer; background: #ffffff; transition: all 0.2s ease;">
                                <span class="material-symbols-outlined" style="font-size: 20px; color: #475569;">computer</span>
                                <span style="font-weight: 600; color: #1e293b; font-size: 14px;">Kun PC</span>
                                <div class="visibility-check" style="position: absolute; top: -6px; right: -6px; width: 16px; height: 16px; background: #005bff; color: white; border-radius: 50%; display: ${isDesktopOnly ? 'flex' : 'none'}; align-items: center; justify-content: center; font-size: 10px; font-weight: bold;">✓</div>
                            </div>
                            
                            <!-- Option 3: Kun mobil -->
                            <div class="visibility-card ${isMobileOnly ? 'active' : ''}" data-value="mobile" style="position: relative; display: flex; align-items: center; gap: 12px; padding: 12px 16px; border: 1.5px solid #cbd5e1; border-radius: 8px; cursor: pointer; background: #ffffff; transition: all 0.2s ease;">
                                <span class="material-symbols-outlined" style="font-size: 20px; color: #475569;">smartphone</span>
                                <span style="font-weight: 600; color: #1e293b; font-size: 14px;">Kun mobil</span>
                                <div class="visibility-check" style="position: absolute; top: -6px; right: -6px; width: 16px; height: 16px; background: #005bff; color: white; border-radius: 50%; display: ${isMobileOnly ? 'flex' : 'none'}; align-items: center; justify-content: center; font-size: 10px; font-weight: bold;">✓</div>
                            </div>
                        </div>
                        
                        <!-- Info box -->
                        <div style="margin-top: 16px; padding: 12px 16px; background: #f1f5f9; border-radius: 8px; font-size: 13px; color: #475569; line-height: 1.5;">
                            Bruk Forhåndsvisning og test for å se hvordan e-posten din vises på hver enhet.
                        </div>
                    </div>
                </div>
            </div>

            <div class="inspector-body" id="inspector-tab-design" style="display: none;">
                <div class="inspector-group">
                    <label class="inspector-group-label">Knappefarge</label>
                    <input type="color" class="inspector-input" id="btn-design-color" value="#d17d39" style="height: 40px; padding: 4px; cursor: pointer;">
                </div>
                <div class="inspector-group">
                    <label class="inspector-group-label">Rundede kanter</label>
                    <select class="inspector-select" id="btn-design-radius">
                        <option value="0px" ${currentRadius === '0px' ? 'selected' : ''}>Skarpe (0px)</option>
                        <option value="8px" ${currentRadius === '8px' ? 'selected' : ''}>Myke (8px)</option>
                        <option value="999px" ${currentRadius === '999px' || currentRadius.includes('px') && parseInt(currentRadius) > 20 ? 'selected' : ''}>Runde (999px)</option>
                    </select>
                </div>
                <div class="inspector-group" style="margin-top: 20px; border-top: 1px solid #e2e8f0; padding-top: 16px;">
                    <label class="inspector-group-label" style="font-weight: 700; font-size: 13px; color: #1e293b; margin-bottom: 10px; display: block;">Plassering &amp; Handlinger</label>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                        <button type="button" id="btn-btn-move-up" class="btn-secondary-outline" style="width: 100%; height: 36px; justify-content: center; font-size: 13px; font-weight: 600;">
                            <span class="material-symbols-outlined" style="font-size: 18px; margin-right: 4px;">arrow_upward</span>
                            <span>Flytt opp</span>
                        </button>
                        <button type="button" id="btn-btn-move-down" class="btn-secondary-outline" style="width: 100%; height: 36px; justify-content: center; font-size: 13px; font-weight: 600;">
                            <span class="material-symbols-outlined" style="font-size: 18px; margin-right: 4px;">arrow_downward</span>
                            <span>Flytt ned</span>
                        </button>
                        <button type="button" id="btn-btn-duplicate" class="btn-secondary-outline" style="width: 100%; height: 36px; justify-content: center; font-size: 13px; font-weight: 600;">
                            <span class="material-symbols-outlined" style="font-size: 18px; margin-right: 4px;">content_copy</span>
                            <span>Dupliser</span>
                        </button>
                        <button type="button" id="btn-btn-delete" class="btn-secondary-outline" style="width: 100%; height: 36px; justify-content: center; font-size: 13px; font-weight: 600; color: #ef4444; border-color: #fca5a5;">
                            <span class="material-symbols-outlined" style="font-size: 18px; margin-right: 4px;">delete</span>
                            <span>Slett</span>
                        </button>
                    </div>
                </div>
            </div>
        `;

        this.bindButtonInspectorEvents(btn, node);
    }

    bindButtonInspectorEvents(btn, node) {
        const inputText = document.getElementById('btn-inspector-text');
        const inputUrl = document.getElementById('btn-inspector-url');
        const designColor = document.getElementById('btn-design-color');
        const designRadius = document.getElementById('btn-design-radius');

        document.querySelectorAll('.inspector-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.inspector-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                const isDesign = tab.dataset.tab === 'design';
                document.getElementById('inspector-tab-content').style.display = isDesign ? 'none' : 'flex';
                document.getElementById('inspector-tab-design').style.display = isDesign ? 'flex' : 'none';
            });
        });

        btn.setAttribute('contenteditable', 'true');
        const handleCanvasBtnInput = () => {
            if (inputText && document.activeElement === btn) {
                inputText.value = btn.innerText || btn.textContent || '';
            }
            this.syncUnifiedBlocks();
        };
        btn.addEventListener('input', handleCanvasBtnInput);
        btn.addEventListener('keyup', handleCanvasBtnInput);
        btn.addEventListener('blur', handleCanvasBtnInput);

        const linkTypeSelect = document.getElementById('btn-inspector-link-type');
        const internalGroup = document.getElementById('btn-inspector-internal-group');
        const externalGroup = document.getElementById('btn-inspector-external-group');
        const internalSelect = document.getElementById('btn-inspector-internal-select');

        if (linkTypeSelect) {
            linkTypeSelect.addEventListener('change', () => {
                const isInternal = linkTypeSelect.value === 'internal';
                if (internalGroup) internalGroup.style.display = isInternal ? 'block' : 'none';
                if (externalGroup) externalGroup.style.display = isInternal ? 'none' : 'block';

                if (isInternal && internalSelect) {
                    btn.setAttribute('href', internalSelect.value);
                } else if (inputUrl) {
                    btn.setAttribute('href', inputUrl.value);
                }
                this.syncUnifiedBlocks();
            });
        }

        if (internalSelect) {
            internalSelect.addEventListener('change', () => {
                btn.setAttribute('href', internalSelect.value);
                const opt = internalSelect.options[internalSelect.selectedIndex];
                if (opt && opt.dataset.defaultText && inputText && (inputText.value === 'Les mer' || !inputText.value)) {
                    inputText.value = opt.dataset.defaultText;
                    btn.innerText = opt.dataset.defaultText;
                }
                this.syncUnifiedBlocks();
            });
        }

        if (inputText) {
            inputText.addEventListener('input', () => {
                btn.innerText = inputText.value;
                this.syncUnifiedBlocks();
            });
        }

        if (inputUrl) {
            inputUrl.addEventListener('input', () => {
                btn.setAttribute('href', inputUrl.value);
                this.syncUnifiedBlocks();
            });
        }

        if (designColor) {
            designColor.addEventListener('input', () => {
                btn.style.backgroundColor = designColor.value;
                this.syncUnifiedBlocks();
            });
        }

        if (designRadius) {
            designRadius.addEventListener('change', () => {
                btn.style.borderRadius = designRadius.value;
                this.syncUnifiedBlocks();
            });
        }

        const btnVisToggle = document.getElementById('btn-inspector-visibility-toggle');
        if (btnVisToggle) {
            btnVisToggle.addEventListener('click', () => {
                const content = document.getElementById('btn-inspector-visibility-content');
                const isHidden = content.style.display === 'none';
                content.style.display = isHidden ? 'block' : 'none';
                
                const arrowEl = document.getElementById('btn-visibility-accordion-arrow');
                if (arrowEl) {
                    arrowEl.innerText = isHidden ? 'arrow_drop_down' : 'arrow_right';
                }
            });
        }

        document.querySelectorAll('#btn-inspector-visibility-content .visibility-card').forEach(card => {
            card.addEventListener('click', () => {
                document.querySelectorAll('#btn-inspector-visibility-content .visibility-card').forEach(c => {
                    c.classList.remove('active');
                    c.querySelector('.visibility-check').style.display = 'none';
                });
                
                card.classList.add('active');
                card.querySelector('.visibility-check').style.display = 'flex';
                
                const val = card.dataset.value;
                if (val === 'desktop') {
                    node.classList.add('hkm-desktop-only');
                    node.classList.remove('hkm-mobile-only');
                } else if (val === 'mobile') {
                    node.classList.add('hkm-mobile-only');
                    node.classList.remove('hkm-desktop-only');
                } else {
                    node.classList.remove('hkm-desktop-only');
                    node.classList.remove('hkm-mobile-only');
                }
                this.syncUnifiedBlocks();
            });
        });

        document.getElementById('btn-btn-move-up')?.addEventListener('click', () => this.moveActiveBlock(-1));
        document.getElementById('btn-btn-move-down')?.addEventListener('click', () => this.moveActiveBlock(1));
        document.getElementById('btn-btn-duplicate')?.addEventListener('click', () => this.duplicateActiveBlock());
        document.getElementById('btn-btn-delete')?.addEventListener('click', () => this.deleteActiveBlock());
    }

    toggleRecipientsDrawer() {
        this.isRecipientsDrawerOpen = !this.isRecipientsDrawerOpen;
        const drawer = document.getElementById('recipients-drawer');
        const canvasContainer = document.getElementById('canvas-container');
        const leftSidebar = document.getElementById('elements-panel') || document.querySelector('.builder-elements-panel');
        const darkSidebar = document.querySelector('.builder-dark-sidebar');
        const rightInspector = document.querySelector('.builder-properties-panel');
        const leftToolbarTitle = document.getElementById('sidebar-title');
        const centerToolbarCell = document.querySelector('.toolbar-center-cell');
        const rightToolbarCell = document.querySelector('.toolbar-right-cell');
        const saveDraftBtn = document.getElementById('save-draft-btn');
        const previewBtn = document.getElementById('preview-btn');

        if (!drawer) return;

        if (this.isRecipientsDrawerOpen) {
            // Show the drawer — it is position:absolute and lays itself out via HTML inline styles.
            // No workspace layout overrides needed.
            drawer.style.setProperty('display', 'block', 'important');
            drawer.classList.add('open');

            if (canvasContainer) canvasContainer.style.setProperty('display', 'none', 'important');
            if (leftSidebar) leftSidebar.style.setProperty('display', 'none', 'important');
            if (darkSidebar) darkSidebar.style.setProperty('display', 'flex', 'important');
            if (rightInspector) rightInspector.style.setProperty('display', 'none', 'important');
            if (centerToolbarCell) centerToolbarCell.style.setProperty('display', 'none', 'important');
            if (saveDraftBtn) saveDraftBtn.style.setProperty('display', 'none', 'important');
            if (previewBtn) previewBtn.style.setProperty('display', 'none', 'important');
            if (leftToolbarTitle) leftToolbarTitle.textContent = 'Mottakere & Utsendelse';

            if (rightToolbarCell) {
                rightToolbarCell.style.setProperty('display', 'flex', 'important');
                rightToolbarCell.style.setProperty('visibility', 'visible', 'important');
                rightToolbarCell.style.setProperty('opacity', '1', 'important');
            }

            this.closeToolsUi();
            this.setupRecipientsV2Listeners();
            this.updateRecipientSummary();
        } else {
            // Hide the drawer and restore editor UI
            drawer.style.setProperty('display', 'none', 'important');
            drawer.classList.remove('open');

            if (canvasContainer) canvasContainer.style.setProperty('display', 'block', 'important');
            if (leftSidebar) leftSidebar.style.setProperty('display', 'flex', 'important');
            if (darkSidebar) darkSidebar.style.setProperty('display', 'flex', 'important');
            if (rightInspector) rightInspector.style.setProperty('display', 'block', 'important');
            if (centerToolbarCell) centerToolbarCell.style.setProperty('display', 'flex', 'important');
            if (saveDraftBtn) saveDraftBtn.style.removeProperty('display');
            if (previewBtn) previewBtn.style.removeProperty('display');
            if (leftToolbarTitle) leftToolbarTitle.textContent = 'Elementer';
        }
        document.body.classList.toggle('builder-recipients-open', this.isRecipientsDrawerOpen);

        const continueBtn = document.getElementById('continue-btn');
        if (continueBtn) {
            if (this.isRecipientsDrawerOpen) {
                continueBtn.innerHTML = '<span class="material-symbols-outlined" style="margin-right: 6px;">arrow_back</span><span class="btn-label" style="white-space: nowrap !important;">Tilbake til design</span>';
            } else {
                continueBtn.innerHTML = '<span class="btn-label" style="white-space: nowrap !important;">Velg mottakere</span><span class="material-symbols-outlined" style="margin-left: 6px;">arrow_forward</span>';
            }
        }
    }

    setupRecipientsV2Listeners() {
        if (this._recipientsV2Bound) return;
        this._recipientsV2Bound = true;

        const subjectInput = document.getElementById('newsletter-subject');
        const preheaderInput = document.getElementById('newsletter-preheader');
        const liveSubject = document.getElementById('live-preview-subject');
        const livePreheader = document.getElementById('live-preview-preheader');
        const subjectCount = document.getElementById('subject-char-count');
        const preheaderCount = document.getElementById('preheader-char-count');

        const updateSubjectPreview = () => {
            if (!subjectInput) return;
            const val = subjectInput.value.trim();
            if (liveSubject) liveSubject.textContent = val || 'Finn hvilen som ruster deg for hverdagen';
            if (subjectCount) subjectCount.textContent = `${subjectInput.value.length} / 80 tegn`;
        };

        const updatePreheaderPreview = () => {
            if (!preheaderInput) return;
            const val = preheaderInput.value.trim();
            if (livePreheader) livePreheader.textContent = val || 'Les siste utgave av månedens inspirasjonsbrev...';
            if (preheaderCount) preheaderCount.textContent = `${preheaderInput.value.length} / 120 tegn`;
        };

        if (subjectInput) {
            subjectInput.addEventListener('input', updateSubjectPreview);
            updateSubjectPreview();
        }

        if (preheaderInput) {
            preheaderInput.addEventListener('input', updatePreheaderPreview);
            updatePreheaderPreview();
        }

        // Choice Cards Radio Toggles
        const radios = document.querySelectorAll('input[name="send-to"]');
        radios.forEach(radio => {
            radio.addEventListener('change', () => {
                document.querySelectorAll('.choice-card-v2').forEach(card => card.classList.remove('active'));
                const parent = radio.closest('.choice-card-v2');
                if (parent) parent.classList.add('active');

                const targetGroupsSection = document.getElementById('target-groups-section');
                if (targetGroupsSection) {
                    targetGroupsSection.style.display = radio.value === 'segments' ? 'block' : 'none';
                }
                this.calculateEstimated();
            });
        });

        const subCheckbox = document.getElementById('select-subscribers');
        if (subCheckbox) {
            subCheckbox.addEventListener('change', () => this.calculateEstimated());
        }
    }

    async updateRecipientSummary() {
        if (!window.firebaseService || !window.firebaseService.isInitialized) return;

        try {
            const usersSnap = await this.safeGet(window.firebaseService.db.collection('contacts'), 8000);
            const totalCount = usersSnap.size || 60;
            const subCount = Math.floor(totalCount * 0.8) || 48;

            const choiceAllBadge = document.getElementById('choice-all-count');
            if (choiceAllBadge) choiceAllBadge.innerText = totalCount;

            const choiceSegmentsBadge = document.getElementById('choice-segments-count');
            if (choiceSegmentsBadge) choiceSegmentsBadge.innerText = subCount;

            const subBadge = document.getElementById('subscribers-count-badge');
            if (subBadge) subBadge.innerText = `${subCount} abonnenter inkludert`;

            const statSub = document.getElementById('stat-subscribers-val');
            if (statSub) statSub.innerText = subCount;

            this.totalUsers = totalCount;
            this.subscribersCount = subCount;
            this.calculateEstimated();
        } catch (e) {
            console.error("Summary update failed:", e);
        }
    }

    calculateEstimated() {
        const checkedOpt = document.querySelector('input[name="send-to"]:checked');
        if (!checkedOpt) return;

        const sendToAll = checkedOpt.value === 'all';
        const subElem = document.getElementById('select-subscribers');
        const subSelected = subElem ? subElem.checked : true;

        let count = 0;
        let subVal = 0;
        if (sendToAll) {
            count = this.totalUsers || 60;
            subVal = this.subscribersCount || 48;
        } else {
            if (subSelected) {
                count += this.subscribersCount || 48;
                subVal = this.subscribersCount || 48;
            }
            count += (this.selectedUserEmails ? this.selectedUserEmails.size : 0);
        }

        const estEl = document.getElementById('estimated-count');
        if (estEl) estEl.innerText = count;

        const statSub = document.getElementById('stat-subscribers-val');
        if (statSub) statSub.innerText = subVal;

        const progressFill = document.getElementById('estimated-progress-fill');
        if (progressFill) {
            const maxVal = Math.max(this.totalUsers || 60, 1);
            const pct = Math.min(Math.round((count / maxVal) * 100), 100);
            progressFill.style.width = `${pct}%`;
        }
    }

    async toggleUserSelectionList() {
        const list = document.getElementById('user-selection-list');
        if (!list) return;
        const isHidden = list.style.display === 'none';

        if (isHidden) {
            list.style.display = 'block';
            await this.loadUserSelection();
        } else {
            list.style.display = 'none';
        }
    }

    async loadUserSelection() {
        const container = document.getElementById('user-selection-list');
        if (!container) return;
        container.innerHTML = '<div style="padding: 20px; text-align: center;"><span class="material-symbols-outlined rotating" style="animation: spin 1s linear infinite;">sync</span></div>';

        try {
            const snap = await this.safeGet(window.firebaseService.db.collection('contacts').limit(50), 8000);
            container.innerHTML = '';
            snap.forEach(doc => {
                const user = doc.data();
                const div = document.createElement('div');
                div.className = 'manual-user-item';
                div.style.display = 'flex'; div.style.alignItems = 'center'; div.style.gap = '12px'; div.style.padding = '10px'; div.style.borderBottom = '1px solid #f1f5f9';

                const isChecked = this.selectedUserEmails.has(user.email);

                div.innerHTML = `
                    <input type="checkbox" value="${user.email}" ${isChecked ? 'checked' : ''}>
                    <div style="font-size: 13px;">
                        <div style="font-weight: 700;">${user.firstName ? user.firstName + ' ' + (user.lastName || '') : (user.displayName || 'Navn ikke satt')}</div>
                        <div style="color: var(--text-muted);">${user.email}</div>
                    </div>
                `;

                const cb = div.querySelector('input');
                cb.addEventListener('change', (e) => {
                    if (e.target.checked) this.selectedUserEmails.add(user.email);
                    else this.selectedUserEmails.delete(user.email);
                    this.calculateEstimated();
                });

                container.appendChild(div);
            });
        } catch (e) {
            container.innerHTML = '<p class="error">Kunne ikke hente kontakter.</p>';
        }
    }

    async toggleSegmentsList() {
        const list = document.getElementById('segments-list');
        if (!list) return;
        const isHidden = list.style.display === 'none';
        if (isHidden) {
            list.style.display = 'block';
            this.loadSegments();
        } else {
            list.style.display = 'none';
        }
    }

    loadSegments() {
        const container = document.getElementById('segments-list');
        if (!container) return;

        // Hardcoded segments for now (Role based) + any custom ones
        const segments = [
            { id: 'admin', name: 'Administratorer' },
            { id: 'editor', name: 'Redaktører' },
            { id: 'medlem', name: 'Medlemmer' },
            ...(this.customSegments || [])
        ];

        let html = `
            <div style="padding: 10px; border-bottom: 1px solid #f1f5f9; display: flex; gap: 8px;">
                <input type="text" id="new-segment-name" placeholder="Nytt segment..." style="flex: 1; padding: 6px; border: 1px solid #ddd; border-radius: 4px; font-size: 13px;">
                <button onclick="builder.addNewSegment()" style="padding: 6px 10px; background: var(--accent-orange); color: white; border: none; border-radius: 4px; cursor: pointer;">+</button>
            </div>
        `;

        html += segments.map(seg => `
            <div class="manual-user-item" style="display: flex; align-items: center; gap: 12px; padding: 10px; border-bottom: 1px solid #f1f5f9;">
                <input type="checkbox" value="${seg.id}" ${this.selectedSegments.has(seg.id) ? 'checked' : ''} onchange="builder.handleSegmentToggle('${seg.id}', this.checked)">
                <div style="font-size: 13px; font-weight: 700;">${seg.name}</div>
            </div>
        `).join('');

        container.innerHTML = html;
    }

    addNewSegment() {
        const input = document.getElementById('new-segment-name');
        if (!input || !input.value.trim()) return;

        if (!this.customSegments) this.customSegments = [];
        const name = input.value.trim();
        this.customSegments.push({ id: name.toLowerCase().replace(/\s+/g, '-'), name });
        input.value = '';
        this.loadSegments();
    }

    handleSegmentToggle(id, checked) {
        if (checked) this.selectedSegments.add(id);
        else this.selectedSegments.delete(id);
        this.calculateEstimated();
    }

    async toggleLabelsList() {
        const list = document.getElementById('labels-list');
        if (!list) return;
        const isHidden = list.style.display === 'none';
        if (isHidden) {
            list.style.display = 'block';
            this.loadLabels();
        } else {
            list.style.display = 'none';
        }
    }

    loadLabels() {
        const container = document.getElementById('labels-list');
        if (!container) return;

        const baseLabels = ['Medlem', 'Frivillig', 'Lovsang', 'Giver', 'Abonnent', 'Leder', 'Ny'];
        const labels = [...baseLabels, ...(this.customLabels || [])];

        let html = `
            <div style="padding: 10px; border-bottom: 1px solid #f1f5f9; display: flex; gap: 8px;">
                <input type="text" id="new-label-name" placeholder="Ny etikett..." style="flex: 1; padding: 6px; border: 1px solid #ddd; border-radius: 4px; font-size: 13px;">
                <button onclick="builder.addNewLabel()" style="padding: 6px 10px; background: var(--accent-orange); color: white; border: none; border-radius: 4px; cursor: pointer;">+</button>
            </div>
        `;

        html += labels.map(label => `
            <div class="manual-user-item" style="display: flex; align-items: center; gap: 12px; padding: 10px; border-bottom: 1px solid #f1f5f9;">
                <input type="checkbox" value="${label}" ${this.selectedLabels.has(label) ? 'checked' : ''} onchange="builder.handleLabelToggle('${label}', this.checked)">
                <div style="font-size: 13px; font-weight: 700;">${label}</div>
            </div>
        `).join('');

        container.innerHTML = html;
    }

    addNewLabel() {
        const input = document.getElementById('new-label-name');
        if (!input || !input.value.trim()) return;

        if (!this.customLabels) this.customLabels = [];
        this.customLabels.push(input.value.trim());
        input.value = '';
        this.loadLabels();
    }

    handleLabelToggle(label, checked) {
        if (checked) this.selectedLabels.add(label);
        else this.selectedLabels.delete(label);
        this.calculateEstimated();
    }


    handleImageClick(blockId, colIndex = null) {
        this.activeImageBlockId = blockId;
        this.activeColumnIndex = colIndex;
        document.getElementById('block-image-upload').click();
    }

    async handleImageFileSelect(e) {
        const file = e.target.files[0];
        if (!file || !this.activeImageBlockId) return;

        const block = this.blocks.find(b => b.id === this.activeImageBlockId);
        if (!block) return;

        try {
            const uploadPath = `newsletter/images/${Date.now()}_${file.name}`;
            const url = await window.firebaseService.uploadImage(file, uploadPath);

            if (this.activeColumnIndex !== null && block.type === 'columns') {
                block.content.cols[this.activeColumnIndex].url = url;
                block.content.cols[this.activeColumnIndex].type = 'image';
            } else {
                block.content.url = url;
            }
            this.renderCanvas();
        } catch (err) {
            console.error("Upload failed:", err);
            showToast("Kunne ikke laste opp bilde.", "error");
        } finally {
            e.target.value = '';
            this.activeColumnIndex = null;
        }
    }

    updateVideoUrl(blockId, url) {
        const block = this.blocks.find(b => b.id === blockId);
        if (!block) return;

        const ytRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
        const match = url.match(ytRegex);

        block.content.url = url;
        if (match && match[1]) {
            block.content.videoId = match[1];
        }
        this.renderCanvas();
    }

    toggleColumnType(blockId, colIndex) {
        const block = this.blocks.find(b => b.id === blockId);
        if (!block) return;

        const col = block.content.cols[colIndex];
        if (col.type === 'text') {
            col.type = 'image';
            col.url = 'https://images.unsplash.com/photo-1490730141103-6cac27aaab94?auto=format&fit=crop&w=800&q=80';
        } else {
            col.type = 'text';
            col.text = 'Skriv tekst her...';
        }
        this.renderCanvas();
    }

    renderCanvas() {
        const container = document.getElementById('blocks-container');
        if (!container) return;

        // Restore header from localStorage if available
        try {
            const autosavedHeader = localStorage.getItem('hkm_builder_autosave_header_html');
            if (autosavedHeader && autosavedHeader.trim().length > 10) {
                const headerNode = document.querySelector('.canvas-header');
                if (headerNode) {
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = autosavedHeader;
                    const newHeader = tempDiv.querySelector('.canvas-header');
                    if (newHeader) {
                        headerNode.parentNode.replaceChild(newHeader, headerNode);
                    }
                }
            }
        } catch(e) {}

        // Auto-initialize from localStorage or default HKM template if empty
        if (this.blocks.length === 0) {
            const autosavedHtml = localStorage.getItem('hkm_builder_autosave_html');
            const autosavedSubject = localStorage.getItem('hkm_builder_autosave_subject');

            if (autosavedHtml && autosavedHtml.trim().length > 15) {
                container.innerHTML = autosavedHtml;
                if (autosavedSubject) {
                    const subjectInput = document.getElementById('newsletter-subject');
                    if (subjectInput && !subjectInput.value) subjectInput.value = autosavedSubject;
                }
            } else {
                container.innerHTML = `
                    <p><img src="https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1200&q=80" alt="HKM Månedsbrev" class="block-img" style="max-width: 100%; height: auto; border-radius: 12px; margin: 16px 0; display: block;"></p>
                    <h2 class="block-h2" style="font-family: 'Inter', sans-serif; font-weight: 700; color: #1e293b; margin-top: 20px;">Kjære venn av His Kingdom Ministry</h2>
                    <p class="block-text" style="font-family: 'Inter', sans-serif; font-size: 15px; line-height: 1.6; color: #334155;">Vi er så takknemlige for å dele månedens oppdateringer og inspirerende ord med deg. Gud gjør store ting i vår midte, og vi ønsker å oppmuntre deg i din vandring.</p>
                    <div style="text-align: center; margin: 24px 0;">
                        <a href="https://www.hiskingdomministry.no" class="block-btn" contenteditable="false" style="display: inline-block; background-color: #d17d39; color: white; padding: 12px 30px; border-radius: 999px; text-decoration: none; font-weight: 700; font-family: 'Inter', sans-serif;">Les mer på nettsiden</a>
                    </div>
                `;
            }
            this.normalizeCanvasBlocks(container);
            this.syncUnifiedBlocks();
            return;
        }

        // Backward compatibility: load discrete blocks if present and compile them to continuous HTML
        let unifiedHtml = '';
        const isUnified = this.blocks.length === 1 && this.blocks[0].id === 'unified_content';
        
        if (isUnified) {
            let rawText = this.blocks[0].content.text || '';
            // If it is the old legacy hardcoded placeholder, clean it up
            if (rawText === '<p>Skriv nyhetsbrevet ditt her...</p>') {
                rawText = '<p><br></p>';
            }
            unifiedHtml = rawText || '<p><br></p>';
        } else {
            // Retro-compile legacy blocks
            unifiedHtml = this.blocks.map(block => {
                switch (block.type) {
                    case 'header':
                        return `<h1 class="block-h1">${block.content.text}</h1>`;
                    case 'text':
                        return `<p class="block-text">${block.content.text}</p>`;
                    case 'image':
                        return `<p><img src="${block.content.url}" alt="${block.content.alt || ''}" class="block-img" style="max-width:100%; height:auto; border-radius:8px; margin: 16px 0; display: block;"></p>`;
                    case 'button':
                        return `
                            <div style="text-align: center; margin: 24px 0;">
                                <a href="${block.content.url}" class="block-btn" contenteditable="false" style="display: inline-block; background-color: #d17d39; color: white; padding: 12px 30px; border-radius: 999px; text-decoration: none; font-weight: 700; font-family: 'Inter', sans-serif;">${block.content.text}</a>
                            </div><p><br></p>`;
                    case 'divider':
                        return `<hr style="border: none; border-top: ${block.content.thickness || 2}px solid ${block.content.color || '#e2e8f0'}; margin: 24px 0;">`;
                    case 'spacer':
                        return `<div style="height: ${block.content.height || 20}px;"></div>`;
                    case 'columns':
                        let colsMarkup = `<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin: 24px 0;">`;
                        (block.content.cols || []).forEach(col => {
                            if (col.type === 'text') {
                                colsMarkup += `<div style="min-height: 50px;">${col.text}</div>`;
                            } else {
                                colsMarkup += `<div><img src="${col.url}" style="max-width:100%; height:auto; border-radius:6px; display:block;"></div>`;
                            }
                        });
                        colsMarkup += `</div><p><br></p>`;
                        return colsMarkup;
                    default:
                        return '';
                }
            }).join('');

            // Overwrite with unified representation for future saving
            this.blocks = [{
                id: 'unified_content',
                type: 'text',
                content: { text: unifiedHtml }
            }];
        }

        container.innerHTML = unifiedHtml;

        // Clean up nested footers if any got accidentally loaded from the database content
        const nestedFooters = container.querySelectorAll('.canvas-footer');
        if (nestedFooters.length > 0) {
            nestedFooters.forEach(footer => footer.remove());
        }

        this.normalizeCanvasBlocks(container);
        this.syncUnifiedBlocks();
    }

    getCleanCanvasHtml() {
        const container = document.getElementById('blocks-container');
        if (!container) return '';
        const clone = container.cloneNode(true);
        clone.querySelectorAll('.card-delete-btn, .card-edit-btn, #block-quick-toolbar, .block-quick-toolbar, .quick-tb-btn, button.quick-tb-btn').forEach(el => el.remove());
        clone.querySelectorAll('.selected-block-active, [data-editor-label]').forEach(el => {
            el.classList.remove('selected-block-active');
            el.removeAttribute('data-editor-label');
        });
        return clone.innerHTML;
    }

    normalizeCanvasBlocks(container) {
        if (!container) return;

        // 1. Remove all pre-existing edit/delete buttons AND quick toolbar controls to prevent duplicates or leaked editor UI
        container.querySelectorAll('.card-delete-btn, .card-edit-btn, #block-quick-toolbar, .block-quick-toolbar, .quick-tb-btn').forEach(b => b.remove());
        container.querySelectorAll('.selected-block-active, [data-editor-label]').forEach(el => {
            el.classList.remove('selected-block-active');
            el.removeAttribute('data-editor-label');
        });

        const tileFB = `<svg width="22" height="22" viewBox="0 0 24 24" fill="#1B4965" style="width: 22px !important; height: 22px !important; max-width: 22px !important; max-height: 22px !important; display: block !important;"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>`;
        const tileIG = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1B4965" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="width: 24px !important; height: 24px !important; max-width: 24px !important; max-height: 24px !important; display: block !important;"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>`;
        const tileYT = `<svg width="26" height="24" viewBox="0 0 24 24" fill="#1B4965" style="width: 26px !important; height: 24px !important; max-width: 26px !important; max-height: 24px !important; display: block !important;"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>`;

        // Enforce monochromatic #1B4965 color on all social blocks in canvas
        container.querySelectorAll('.newsletter-social-block').forEach(block => {
            block.querySelectorAll('a').forEach(a => {
                a.style.color = '#1B4965';
                a.querySelectorAll('svg').forEach(svg => {
                    const fill = svg.getAttribute('fill');
                    if (fill && fill !== 'none') svg.setAttribute('fill', '#1B4965');
                    const stroke = svg.getAttribute('stroke');
                    if (stroke && stroke !== 'none') svg.setAttribute('stroke', '#1B4965');
                });
            });
            block.querySelectorAll('svg').forEach(svg => {
                svg.style.setProperty('width', '24px', 'important');
                svg.style.setProperty('height', '24px', 'important');
                svg.style.setProperty('max-width', '24px', 'important');
                svg.style.setProperty('max-height', '24px', 'important');
                svg.style.setProperty('display', 'block', 'important');
            });
        });

        // 2. Smart Converter: convert any text element or paragraph containing Facebook/Instagram/YouTube into a proper .newsletter-social-block
        container.querySelectorAll('p, div, font, span').forEach(el => {
            if (el.classList && el.classList.contains('newsletter-social-block')) return;
            const textContent = (el.textContent || '').trim();
            const hasFB = textContent.includes('Facebook') || !!el.querySelector('a[href*="facebook"]');
            const hasIG = textContent.includes('Instagram') || !!el.querySelector('a[href*="instagram"]');
            const hasYT = textContent.includes('YouTube') || !!el.querySelector('a[href*="youtube"]');

            if (hasFB && hasIG && hasYT) {
                const block = document.createElement('div');
                block.className = 'newsletter-social-block';
                block.setAttribute('contenteditable', 'false');
                block.setAttribute('data-style', 'tiles');
                block.style.cssText = "position: relative; text-align: center; margin: 28px 0; padding: 0; background: transparent; border: none; box-shadow: none; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px;";
                block.innerHTML = `
                    <div style="font-family: 'Inter', sans-serif; font-size: 20px; font-weight: 800; color: #0f172a; margin-bottom: 4px; text-align: center; width: 100%;">Følg oss</div>
                    <div style="display: flex; align-items: center; justify-content: center; gap: 14px; flex-wrap: wrap;">
                        <a href="https://facebook.com/hiskingdomministry" target="_blank" title="Facebook" style="display: inline-flex; align-items: center; justify-content: center; width: 54px; height: 54px; border-radius: 16px; background: #ffffff; color: #1B4965; text-decoration: none; border: 1px solid #e2e8f0; box-shadow: 0 4px 10px rgba(0,0,0,0.06); transition: all 0.2s ease;">
                            ${tileFB}
                        </a>
                        <a href="https://www.instagram.com/freedomisathand/" target="_blank" title="Instagram" style="display: inline-flex; align-items: center; justify-content: center; width: 54px; height: 54px; border-radius: 16px; background: #ffffff; color: #1B4965; text-decoration: none; border: 1px solid #e2e8f0; box-shadow: 0 4px 10px rgba(0,0,0,0.06); transition: all 0.2s ease;">
                            ${tileIG}
                        </a>
                        <a href="https://youtube.com/@HisKingdomMinistry" target="_blank" title="YouTube" style="display: inline-flex; align-items: center; justify-content: center; width: 54px; height: 54px; border-radius: 16px; background: #ffffff; color: #1B4965; text-decoration: none; border: 1px solid #e2e8f0; box-shadow: 0 4px 10px rgba(0,0,0,0.06); transition: all 0.2s ease;">
                            ${tileYT}
                        </a>
                    </div>
                `;
                el.replaceWith(block);
            }
        });

        // 3. Deduplicate multiple adjacent .newsletter-social-block elements
        const socialBlocks = Array.from(container.querySelectorAll('.newsletter-social-block'));
        if (socialBlocks.length > 1) {
            // Keep only the first valid one and remove duplicates
            for (let i = 1; i < socialBlocks.length; i++) {
                socialBlocks[i].remove();
            }
        }

        // 4. Upgrade legacy text-only social blocks to "Følg oss" + white brikker layout automatically
        container.querySelectorAll('.newsletter-social-block').forEach(socialBlock => {
            if (!socialBlock.querySelector('svg')) {
                socialBlock.setAttribute('data-style', 'tiles');
                socialBlock.style.cssText = "position: relative; text-align: center; margin: 28px 0; padding: 0; background: transparent; border: none; box-shadow: none; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px;";
                socialBlock.innerHTML = `
                    <div style="font-family: 'Inter', sans-serif; font-size: 20px; font-weight: 800; color: #0f172a; margin-bottom: 4px; text-align: center; width: 100%;">Følg oss</div>
                    <div style="display: flex; align-items: center; justify-content: center; gap: 14px; flex-wrap: wrap;">
                        <a href="https://facebook.com/hiskingdomministry" target="_blank" title="Facebook" style="display: inline-flex; align-items: center; justify-content: center; width: 54px; height: 54px; border-radius: 16px; background: #ffffff; color: #1B4965; text-decoration: none; border: 1px solid #e2e8f0; box-shadow: 0 4px 10px rgba(0,0,0,0.06); transition: all 0.2s ease;">
                            ${tileFB}
                        </a>
                        <a href="https://www.instagram.com/freedomisathand/" target="_blank" title="Instagram" style="display: inline-flex; align-items: center; justify-content: center; width: 54px; height: 54px; border-radius: 16px; background: #ffffff; color: #1B4965; text-decoration: none; border: 1px solid #e2e8f0; box-shadow: 0 4px 10px rgba(0,0,0,0.06); transition: all 0.2s ease;">
                            ${tileIG}
                        </a>
                        <a href="https://youtube.com/@HisKingdomMinistry" target="_blank" title="YouTube" style="display: inline-flex; align-items: center; justify-content: center; width: 54px; height: 54px; border-radius: 16px; background: #ffffff; color: #1B4965; text-decoration: none; border: 1px solid #e2e8f0; box-shadow: 0 4px 10px rgba(0,0,0,0.06); transition: all 0.2s ease;">
                            ${tileYT}
                        </a>
                    </div>
                `;
            }
        });

        // 5. Keep product cards on the store's real ID-based product routes.
        container.querySelectorAll('.newsletter-product-card').forEach(card => {
            let productId = card.dataset.productId || '';
            const titleEl = card.querySelector('.product-title, h4');
            const titleText = titleEl ? titleEl.textContent.trim() : '';

            if (!productId && titleText) {
                const cachedProduct = (window.hkmWixProductsCache || []).find(
                    p => (p.name || '').trim().toLowerCase() === titleText.toLowerCase()
                );
                productId = cachedProduct?.id || cachedProduct?._id || '';
                if (productId) {
                    card.setAttribute('data-product-id', productId);
                }
            }

            const existingUrl = card.dataset.productUrl || card.querySelector('a[href]')?.getAttribute('href') || '';
            const targetUrl = resolveHkdProductUrl({ id: productId, productUrl: existingUrl });
            card.setAttribute('data-product-url', targetUrl);
            card.querySelectorAll('a[href]').forEach(a => {
                a.setAttribute('href', targetUrl);
                a.setAttribute('target', '_blank');
            });
        });

        // 6. Ensure all non-text block cards in the container have exactly ONE delete button and edit control positioned cleanly
        container.querySelectorAll(
            '.newsletter-product-card, .newsletter-event-card, .newsletter-social-block, ' +
            '.newsletter-video-block, .newsletter-divider-block, .newsletter-spacer-block, .newsletter-columns-block'
        ).forEach(card => {
            if (card.style.position !== 'relative') {
                card.style.position = 'relative';
            }
            if (!card.querySelector('.card-delete-btn')) {
                const btn = document.createElement('button');
                btn.className = 'card-delete-btn';
                btn.setAttribute('style', 'position: absolute; top: -10px; right: 0; width: 24px; height: 24px; border-radius: 50%; background: #ef4444; border: 2px solid white; color: white; font-size: 14px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.15); z-index: 100;');
                btn.title = 'Slett element';
                btn.innerHTML = '×';
                card.appendChild(btn);
            }
            if (card.classList.contains('newsletter-social-block') && !card.querySelector('.card-edit-btn')) {
                const editBtn = document.createElement('button');
                editBtn.className = 'card-edit-btn';
                editBtn.setAttribute('style', 'position: absolute; top: -10px; right: 30px; width: 24px; height: 24px; border-radius: 50%; background: #1B4965; border: 2px solid white; color: white; font-size: 12px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.15); z-index: 100;');
                editBtn.title = 'Endre stil & lenker';
                editBtn.innerHTML = '✏️';
                card.appendChild(editBtn);
            }
        });
    }

    showPreview() {
        const modal = document.getElementById('preview-modal');
        const frame = document.getElementById('preview-frame');
        const canvas = document.getElementById('newsletter-canvas').cloneNode(true);
        canvas.querySelectorAll('.block-controls, input, .col-type-toggle, .card-delete-btn, .card-edit-btn, #block-quick-toolbar, .block-quick-toolbar, .quick-tb-btn').forEach(c => c.remove());
        canvas.querySelectorAll('[contenteditable]').forEach(e => e.removeAttribute('contenteditable'));
        canvas.querySelectorAll('.image-overlay').forEach(o => o.remove());

        // Override modal container width/height constraints from dashboard.css
        const content = modal.querySelector('.preview-content');
        if (content) {
            content.style.maxWidth = '90vw';
            content.style.maxHeight = '90vh';
            content.style.width = '1000px';
            content.style.height = '800px';
        }

        // Style the cloned canvas to match standard email client widths (600px)
        if (this.currentView === 'desktop') {
            canvas.style.maxWidth = '600px';
            canvas.style.width = '100%';
            canvas.style.margin = '0 auto';
            canvas.style.boxShadow = 'none';
            canvas.style.border = 'none';
        } else {
            canvas.style.width = '100%';
            canvas.style.maxWidth = '100%';
            canvas.style.margin = '0';
            canvas.style.boxShadow = 'none';
            canvas.style.border = 'none';
        }

        frame.innerHTML = '';
        frame.appendChild(canvas);
        frame.className = `preview-frame ${this.currentView}`;
        modal.style.display = 'flex';
    }

    showElementHoverPreview(btn) {
        if (this.isDragging) return;
        const type = btn.dataset.type;
        if (!type || type.startsWith('ai_')) return;

        let preview = document.getElementById('hkm-element-hover-preview');
        if (this.hoverPreviewTimeout) {
            clearTimeout(this.hoverPreviewTimeout);
        }
        if (!preview) {
            preview = document.createElement('div');
            preview.id = 'hkm-element-hover-preview';
            preview.style.cssText = `
                position: absolute;
                background: #ffffff;
                border: 1px solid #cbd5e1;
                border-radius: 12px;
                box-shadow: 0 10px 30px rgba(15, 23, 42, 0.15);
                z-index: 10000;
                pointer-events: none;
                padding: 16px;
                width: 280px;
                opacity: 0;
                transform: translateX(10px);
                transition: opacity 0.2s ease, transform 0.2s ease;
                font-family: 'Inter', sans-serif;
            `;
            document.body.appendChild(preview);
        }

        let previewHtml = '';
        switch (type) {
            case 'header':
                previewHtml = `
                    <div style="font-size:11px; font-weight:700; color:#94a3b8; margin-bottom:8px; text-transform:uppercase;">Forhåndsvisning: Overskrift</div>
                    <h2 style="font-family:'Inter', sans-serif; margin:0; font-size:20px; font-weight:800; color:#1e293b;">Overskrift her</h2>
                `;
                break;
            case 'text':
                previewHtml = `
                    <div style="font-size:11px; font-weight:700; color:#94a3b8; margin-bottom:8px; text-transform:uppercase;">Forhåndsvisning: Tekstfelt</div>
                    <p style="font-family:'Inter', sans-serif; margin:0; font-size:13px; color:#475569; line-height:1.5;">Skriv din nyhet, beskrivelse eller en lengre tekstblokk her...</p>
                `;
                break;
            case 'divider':
                previewHtml = `
                    <div style="font-size:11px; font-weight:700; color:#94a3b8; margin-bottom:8px; text-transform:uppercase;">Forhåndsvisning: Skillelinje</div>
                    <hr style="border:none; border-top:2px solid #e2e8f0; margin:12px 0;">
                `;
                break;
            case 'spacer':
                previewHtml = `
                    <div style="font-size:11px; font-weight:700; color:#94a3b8; margin-bottom:8px; text-transform:uppercase;">Forhåndsvisning: Avstand</div>
                    <div style="height:32px; border:1px dashed #cbd5e1; border-radius:6px; background:#f8fafc; display:flex; align-items:center; justify-content:center; font-size:11px; color:#94a3b8;">Tomrom (32px)</div>
                `;
                break;
            case 'button':
                previewHtml = `
                    <div style="font-size:11px; font-weight:700; color:#94a3b8; margin-bottom:8px; text-transform:uppercase;">Forhåndsvisning: Knapp</div>
                    <div style="text-align:center;">
                        <span style="display:inline-block; background:#d17d39; color:white; padding:8px 20px; border-radius:999px; font-weight:700; font-size:12px; font-family:'Inter', sans-serif;">Les mer</span>
                    </div>
                `;
                break;
            case 'columns':
                previewHtml = `
                    <div style="font-size:11px; font-weight:700; color:#94a3b8; margin-bottom:8px; text-transform:uppercase;">Forhåndsvisning: Kolonner</div>
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
                        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; height:32px; display:flex; align-items:center; justify-content:center; font-size:10px; color:#94a3b8;">Kolonne 1</div>
                        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; height:32px; display:flex; align-items:center; justify-content:center; font-size:10px; color:#94a3b8;">Kolonne 2</div>
                    </div>
                `;
                break;
            case 'image':
                previewHtml = `
                    <div style="font-size:11px; font-weight:700; color:#94a3b8; margin-bottom:8px; text-transform:uppercase;">Forhåndsvisning: Bilde</div>
                    <div style="width:100%; height:80px; background:#f1f5f9; border-radius:6px; display:flex; align-items:center; justify-content:center;">
                        <span class="material-symbols-outlined" style="font-size:32px; color:#94a3b8;">image</span>
                    </div>
                `;
                break;
            case 'logo':
                previewHtml = `
                    <div style="font-size:11px; font-weight:700; color:#94a3b8; margin-bottom:8px; text-transform:uppercase;">Forhåndsvisning: Logo</div>
                    <div style="width:100%; height:50px; background:#f8fafc; border:1px dashed #cbd5e1; border-radius:6px; display:flex; align-items:center; justify-content:center; gap:8px;">
                        <span class="material-symbols-outlined" style="font-size:20px; color:#d17d39;">featured_seasonal_and_gifts</span>
                        <span style="font-size:12px; font-weight:700; color:#1B4965; font-family:'Inter', sans-serif;">HKM Logo</span>
                    </div>
                `;
                break;
            case 'social':
                previewHtml = `
                    <div style="font-size:11px; font-weight:700; color:#94a3b8; margin-bottom:8px; text-transform:uppercase;">Forhåndsvisning: Sosiale lenker</div>
                    <div style="display:flex; justify-content:center; gap:8px; font-size:11px; font-weight:600; color:#1B4965;">
                        <span>Facebook</span> • <span>Instagram</span> • <span>YouTube</span>
                    </div>
                `;
                break;
            default:
                return;
        }

        preview.innerHTML = previewHtml;

        const rect = btn.getBoundingClientRect();
        const scrollX = window.scrollX || window.pageXOffset;
        const scrollY = window.scrollY || window.pageYOffset;

        preview.style.top = (rect.top + scrollY + (rect.height / 2) - 60) + 'px';
        preview.style.left = (rect.right + scrollX + 16) + 'px';
        preview.style.display = 'block';

        setTimeout(() => {
            preview.style.opacity = '1';
            preview.style.transform = 'translateX(0)';
        }, 10);
    }

    hideElementHoverPreview() {
        const preview = document.getElementById('hkm-element-hover-preview');
        if (preview) {
            if (this.hoverPreviewTimeout) {
                clearTimeout(this.hoverPreviewTimeout);
            }
            preview.style.opacity = '0';
            preview.style.transform = 'translateX(10px)';
            this.hoverPreviewTimeout = setTimeout(() => {
                if (preview.style.opacity === '0') {
                    preview.style.display = 'none';
                }
            }, 200);
        }
    }

    async saveTemplate() {
        if (!window.firebaseService || !window.firebaseService.isInitialized) return;
        this.showPromptModal(
            "Navn på malen",
            "F.eks. Månedlig nyhetsbrev",
            async (name) => {
                try {
                    this.syncUnifiedBlocks();
                    const data = {
                        name,
                        blocks: this.blocks,
                        subject: document.getElementById('newsletter-subject').value,
                        createdAt: new Date().toISOString(),
                        isDraft: false
                    };
                    await window.firebaseService.db.collection('newsletter_templates').add(data);
                    showToast("Mal lagret!", "success");
                    this.loadTemplates();
                } catch (e) {
                    showToast("Kunne ikke lagre mal.");
                }
            },
            "Nyhetsbrev Mal",
            "Vennligst oppgi et navn.",
            "Lagre mal",
            "Lagre"
        );
    }

    async loadTemplates() {
        if (!window.firebaseService || !window.firebaseService.isInitialized) return;
        try {
            const container = document.getElementById('templates-list');
            if (!container) return;
            const snap = await this.safeGet(window.firebaseService.db.collection('newsletter_templates').orderBy('createdAt', 'desc'), 8000);
            
            let count = 0;
            container.innerHTML = '';
            snap.forEach(doc => {
                const data = doc.data();
                if (data.isDraft === true) return; // Skip drafts!
                count++;
                
                const div = document.createElement('div');
                div.className = 'sidebar-item-card';
                div.innerHTML = `
                    <div class="card-icon-container">
                        <span class="material-symbols-outlined">article</span>
                    </div>
                    <div class="card-content">
                        <div class="card-title">${data.name}</div>
                        <div class="card-subtitle">${new Date(data.createdAt).toLocaleDateString()}</div>
                    </div>
                    <div class="card-action">
                        <span class="material-symbols-outlined">arrow_forward</span>
                    </div>
                `;
                div.onclick = async () => {
                    const confirmed = await this.showConfirm('Last inn mal', `Last inn malen "${data.name}"? Dette vil erstatte innholdet i editoren.`, 'Last inn');
                    if (confirmed) {
                        this.blocks = data.blocks;
                        document.getElementById('newsletter-subject').value = data.subject || '';
                        this.renderCanvas();
                        showToast(`Malen "${data.name}" er lastet inn.`, "info");
                    }
                };
                container.appendChild(div);
            });
            
            if (count === 0) {
                container.innerHTML = `
                    <div class="sidebar-empty-state">
                        <span class="material-symbols-outlined empty-icon">article</span>
                        <span>Ingen maler lagret ennå</span>
                    </div>
                `;
            }
        } catch (e) {
            console.error("Load templates failed:", e);
        }
    }


    compileSocialBlockForEmail(block) {
        const socialLinks = Array.from(block.querySelectorAll('a[href]'));
        if (!socialLinks.length) return '';

        const platformDefinitions = {
            facebook: {
                label: 'Facebook',
                color: '#1877f2',
                image: 'https://www.hiskingdomministry.no/img/social-facebook-email.png'
            },
            instagram: {
                label: 'Instagram',
                color: '#e4405f',
                image: 'https://www.hiskingdomministry.no/img/social-instagram-email.png'
            },
            youtube: {
                label: 'YouTube',
                color: '#ff0000',
                image: 'https://www.hiskingdomministry.no/img/social-youtube-email.png'
            },
            website: {
                label: 'Nettsted',
                color: '#1B4965',
                image: 'https://www.hiskingdomministry.no/img/social-website-email.png'
            }
        };

        const platforms = socialLinks.map((link, index) => {
            const href = link.getAttribute('href') || '#';
            const hint = `${href} ${link.getAttribute('title') || ''} ${link.textContent || ''}`.toLowerCase();
            let id = 'website';
            if (hint.includes('facebook')) id = 'facebook';
            else if (hint.includes('instagram')) id = 'instagram';
            else if (hint.includes('youtube') || hint.includes('youtu.be')) id = 'youtube';

            const definition = platformDefinitions[id] || platformDefinitions.website;
            return {
                ...definition,
                id,
                href: escapeHtml(href),
                label: escapeHtml((link.textContent || '').trim() || definition.label || `Lenke ${index + 1}`)
            };
        });

        const selectedStyle = block.dataset.style || 'tiles';
        let linksMarkup = '';

        if (selectedStyle === 'text_only') {
            linksMarkup = platforms.map((platform, index) => `
                <td align="center" style="padding: 4px 8px; font-family: Arial, Helvetica, sans-serif; font-size: 14px; font-weight: 700;">
                    <a href="${platform.href}" target="_blank" style="color: #1B4965; text-decoration: none;">${platform.label}</a>
                </td>
                ${index < platforms.length - 1 ? '<td aria-hidden="true" style="color: #cbd5e1; font-size: 14px;">&#8226;</td>' : ''}
            `).join('');
        } else if (selectedStyle === 'both') {
            linksMarkup = platforms.map(platform => `
                <td align="center" style="padding: 4px;">
                    <a href="${platform.href}" target="_blank" title="${platform.label}" style="display: inline-block; padding: 9px 14px; border: 1px solid #e2e8f0; border-radius: 999px; background-color: #f8fafc; color: #1B4965; text-decoration: none; font-family: Arial, Helvetica, sans-serif; font-size: 13px; font-weight: 700; white-space: nowrap;">
                        <img src="${platform.image}" width="18" height="18" alt="" style="display: inline-block; width: 18px; height: 18px; border: 0; vertical-align: middle;">
                        <span style="padding-left: 6px; vertical-align: middle;">${platform.label}</span>
                    </a>
                </td>
            `).join('');
        } else {
            const tileFB = `<svg width="22" height="22" viewBox="0 0 24 24" fill="#1B4965" style="width: 22px !important; height: 22px !important; max-width: 22px !important; max-height: 22px !important; display: block !important; margin: 0 auto;"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>`;
            const tileIG = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1B4965" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="width: 24px !important; height: 24px !important; max-width: 24px !important; max-height: 24px !important; display: block !important; margin: 0 auto;"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>`;
            const tileYT = `<svg width="26" height="24" viewBox="0 0 24 24" fill="#1B4965" style="width: 26px !important; height: 24px !important; max-width: 26px !important; max-height: 24px !important; display: block !important; margin: 0 auto;"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>`;
            const tileWebsite = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1B4965" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="width: 22px !important; height: 22px !important; max-width: 22px !important; max-height: 22px !important; display: block !important; margin: 0 auto;"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`;
            const tileSvgMap = { facebook: tileFB, instagram: tileIG, youtube: tileYT, website: tileWebsite };

            linksMarkup = platforms.map(platform => `
                <td align="center" valign="middle" style="padding: 4px 7px;">
                    <a href="${platform.href}" target="_blank" title="${platform.label}" aria-label="${platform.label}" style="display: inline-flex; align-items: center; justify-content: center; width: 54px; height: 54px; border: 1px solid #e2e8f0; border-radius: ${selectedStyle === 'icon_only' ? '50%' : '16px'}; background-color: #ffffff; color: #1B4965; text-align: center; text-decoration: none; box-shadow: 0 4px 10px rgba(0,0,0,0.06);">
                        ${tileSvgMap[platform.id] || `<img src="${platform.image}" width="24" height="24" alt="${platform.label}" style="display: inline-block; width: 24px; height: 24px; border: 0; vertical-align: middle;">`}
                    </a>
                </td>
            `).join('');
        }

        const headingMarkup = selectedStyle === 'tiles'
            ? '<p style="margin: 0 0 14px 0; color: #0f172a; font-family: Arial, Helvetica, sans-serif; font-size: 20px; line-height: 1.3; font-weight: 800; text-align: center;">Følg oss</p>'
            : '';

        return `
            <table class="email-social-block" role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="width: 100%; margin: 24px 0;">
                <tr>
                    <td align="center" style="padding: ${selectedStyle === 'tiles' ? '8px 0 12px 0' : '12px 0'}; text-align: center;">
                        ${headingMarkup}
                        <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto;">
                            <tr>${linksMarkup}</tr>
                        </table>
                    </td>
                </tr>
            </table>
        `;
    }

    compileEmailHtml() {
        const blocksContainer = document.getElementById('blocks-container');
        if (!blocksContainer) return '';

        const contentClone = blocksContainer.cloneNode(true);

        // Remove editor UI controls, quick toolbars, buttons, overlays, and drag handles
        contentClone.querySelectorAll(`
            .block-quick-toolbar,
            #block-quick-toolbar,
            .quick-tb-btn,
            .quick-tb-group,
            .block-controls,
            .col-type-toggle,
            .image-overlay,
            .add-block-btn-canvas,
            .block-actions-overlay,
            .card-delete-btn,
            .block-toolbar,
            .btn-block-action,
            .editor-only,
            [data-tool],
            button
        `).forEach(c => c.remove());

        // Remove editor-specific attributes and active selection styles
        contentClone.querySelectorAll('[contenteditable]').forEach(e => e.removeAttribute('contenteditable'));
        contentClone.querySelectorAll('*').forEach(el => {
            el.classList.remove('selected', 'active', 'focused', 'editing');
            if (el.style.outline) el.style.outline = '';
            if (el.style.boxShadow) el.style.boxShadow = '';
        });

        // Convert relative image URLs to production domain HTTPS
        contentClone.querySelectorAll('img').forEach(img => {
            let src = img.getAttribute('src') || '';
            if (src) {
                if (!src.startsWith('http://') && !src.startsWith('https://') && !src.startsWith('data:')) {
                    const cleanSrc = src.replace(/^\.\.\//, '').replace(/^\//, '');
                    src = `https://www.hiskingdomministry.no/${cleanSrc}`;
                    img.setAttribute('src', src);
                }
            }
            img.setAttribute('style', 'max-width: 100% !important; height: auto !important; border: 0 !important; display: block !important;');
        });

        // Convert blockquotes and quote blocks to bulletproof email tables with inline styles for Gmail, Outlook, and Apple Mail
        contentClone.querySelectorAll('blockquote, .block-quote, .quote-block, [data-type="quote"], .sitat').forEach(bq => {
            const innerContent = bq.innerHTML;
            const tableQuote = `
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 24px 0; width: 100%;">
              <tr>
                <td style="border-left: 4px solid #d17d39; padding: 12px 18px 12px 22px; background-color: #fffaf5; border-radius: 0 8px 8px 0; font-style: italic; color: #334155; font-family: Georgia, 'Times New Roman', serif, Arial; font-size: 16px; line-height: 1.6;">
                  ${innerContent}
                </td>
              </tr>
            </table>`;
            bq.outerHTML = tableQuote;
        });

        // Convert product cards to bulletproof email tables
        contentClone.querySelectorAll('.newsletter-product-card').forEach(card => {
            const img = card.querySelector('img');
            const imgSrc = img ? img.getAttribute('src') : '';
            const titleEl = card.querySelector('.product-title');
            const title = titleEl ? titleEl.innerText.trim() : '';
            const priceEl = card.querySelector('.product-price');
            const price = priceEl ? priceEl.innerText.trim() : '';
            let productId = card.dataset.productId || '';
            const linkEl = card.querySelector('.product-cta-btn') || card.querySelector('a');
            const existingUrl = card.dataset.productUrl || (linkEl ? linkEl.getAttribute('href') : '');

            if (!productId && title) {
                const cachedProduct = (window.hkmWixProductsCache || []).find(
                    p => (p.name || '').trim().toLowerCase() === title.toLowerCase()
                );
                if (cachedProduct) {
                    productId = cachedProduct.id || cachedProduct._id || '';
                }
            }
            const linkHref = resolveHkdProductUrl({ id: productId, productUrl: existingUrl });

            const tableHtml = `
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 20px 0; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; width: 100%;">
              <tr>
                <td style="padding: 16px;">
                  <table border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      ${imgSrc ? `<td width="90" style="vertical-align: top; padding-right: 16px;"><a href="${linkHref}" target="_blank" style="text-decoration: none;"><img src="${imgSrc}" width="90" height="90" style="width: 90px; height: 90px; object-fit: cover; border-radius: 8px; display: block; border: 0;" alt="${title}" /></a></td>` : ''}
                      <td style="vertical-align: top;">
                        <h4 style="margin: 0 0 6px 0; font-size: 16px; font-weight: 700; color: #1B4965; line-height: 1.3; font-family: Arial, sans-serif;"><a href="${linkHref}" target="_blank" style="color: #1B4965; text-decoration: none;">${title}</a></h4>
                        <p style="margin: 0 0 12px 0; font-size: 15px; font-weight: 700; color: #d17d39; font-family: Arial, sans-serif;">${price}</p>
                        <a href="${linkHref}" target="_blank" style="display: inline-block; background-color: #d17d39; color: #ffffff !important; padding: 8px 18px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 13px; font-family: Arial, sans-serif;">Se produkt</a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>`;
            card.outerHTML = tableHtml;
        });

        // Inline SVG and flexbox are removed or rearranged by several email
        // clients. Convert social banners to table-based, text-icon markup.
        contentClone.querySelectorAll('.newsletter-social-block').forEach(block => {
            block.outerHTML = this.compileSocialBlockForEmail(block);
        });

        const bodyHtml = contentClone.innerHTML;

        return `<!DOCTYPE html>
<html lang="no" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body, html { margin: 0 !important; padding: 0 !important; width: 100% !important; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; background-color: #f8fafc; font-family: Arial, Helvetica, sans-serif; }
    img { border: 0; outline: none; text-decoration: none; max-width: 100%; height: auto; }
    table { border-collapse: collapse !important; }
    p { margin: 0 0 16px 0; line-height: 1.6; color: #1e293b; font-family: Arial, Helvetica, sans-serif; font-size: 16px; }
    h1, h2, h3, h4 { color: #1e293b; margin: 0 0 16px 0; font-family: Arial, Helvetica, sans-serif; }
    a { color: #d17d39; text-decoration: none; }
    
    @media only screen and (max-width: 600px) {
      .email-wrapper { width: 100% !important; padding: 10px !important; }
      .email-body { padding: 24px 16px !important; }
      .email-header { padding: 24px 16px !important; }
      .email-footer { padding: 24px 16px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed; background-color: #f8fafc;">
    <tr>
      <td align="center" style="padding: 20px 10px;">
        <table class="email-wrapper" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.04);">
          <!-- Header -->
          <tr>
            <td class="email-header" align="center" style="padding: 28px 24px 20px 24px; border-bottom: 1px solid #f1f5f9; text-align: center;">
              <img src="https://www.hiskingdomministry.no/img/logo-hkm.png" alt="His Kingdom Ministry Logo" width="68" style="width: 68px; max-width: 68px; height: auto; display: block; margin: 0 auto 10px auto; border: 0;" />
              <h2 style="margin: 0; font-size: 19px; font-weight: 800; color: #1e293b; letter-spacing: -0.02em; font-family: Arial, sans-serif;">His Kingdom Ministry</h2>
            </td>
          </tr>
          <!-- Main Content Body -->
          <tr>
            <td class="email-body" style="padding: 32px 32px; color: #1e293b; font-size: 16px; line-height: 1.6; font-family: Arial, Helvetica, sans-serif;">
              ${bodyHtml}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td class="email-footer" align="center" style="padding: 32px 24px; background-color: #fcfcfc; border-top: 1px solid #f1f5f9; text-align: center; font-size: 13px; color: #64748b; font-family: Arial, sans-serif;">
              <p style="margin: 0 0 8px 0; color: #64748b; font-size: 13px; font-family: Arial, sans-serif;">© 2026 His Kingdom Ministry. Alle rettigheter reservert.</p>
              <p style="margin: 0; color: #64748b; font-size: 13px; font-family: Arial, sans-serif;"><a href="https://www.hiskingdomministry.no/avmeld" style="color: #d17d39; text-decoration: none; font-weight: 600;">Meld deg av nyhetsbrev</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
    }

    async sendTestEmail() {
        const user = window.firebaseService?.auth?.currentUser;
        if (!user) return showToast("Logg inn først", "warning");

        const subject = document.getElementById('newsletter-subject').value || 'Test-e-post';
        this.syncUnifiedBlocks();
        
        const textContent = this.blocks[0]?.content?.text || '';
        const plainText = textContent.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, '').trim();
        if (this.blocks.length === 0 || !textContent || plainText === '' || textContent === '<p><br></p>' || textContent === '<p>Skriv nyhetsbrevet ditt her...</p>') {
            return showToast("Legg til innhold før du sender en test.", "error");
        }

        this.showPromptModal(
            "Hvem vil du sende test-e-posten til?",
            "Skriv inn e-postadresse...",
            async (recipientEmail) => {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(recipientEmail)) {
                    return showToast("Vennligst oppgi en gyldig e-postadresse.", "error");
                }

                const testBtn = document.getElementById('send-test-btn');
                const originalHtml = testBtn ? testBtn.innerHTML : '';
                if (testBtn) {
                    testBtn.disabled = true;
                    testBtn.innerHTML = '<span class="material-symbols-outlined rotating" style="font-size: 20px;">sync</span> Sender...';
                }

                showToast(`Sender test-e-post til ${recipientEmail}...`, "info");

                let sendSuccess = false;
                try {
                    // Get user ID Token for verification
                    const idToken = await user.getIdToken();

                    const fullHtml = this.compileEmailHtml();

                    const response = await fetch('https://sendmanualemail-42bhgdjkcq-uc.a.run.app', {
                        method: 'POST',
                        headers: { 
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${idToken}`
                        },
                        body: JSON.stringify({
                            to: recipientEmail,
                            subject: `[TEST] ${subject}`,
                            html: fullHtml,
                            message: plainText.substring(0, 500),
                            fromName: 'His Kingdom Ministry'
                        })
                    });

                    const result = await response.json();
                    if (result.success) {
                        showToast("Test-e-post er sendt!", "success");
                        sendSuccess = true;
                        
                        // Update checklist item in sidebar
                        const testIcon = document.getElementById('chk-test-icon');
                        const testText = document.getElementById('chk-test-text');
                        if (testIcon && testText) {
                            testIcon.innerText = 'check_circle';
                            testIcon.className = 'material-symbols-outlined chk-success';
                            testText.innerText = 'Test-epost bekreftet sendt';
                        }
                    } else {
                        throw new Error(result.error || 'Serveren returnerte en feil.');
                    }
                } catch (error) {
                    console.error('Feil ved sending av test-e-post:', error);
                    showToast('Kunne ikke sende: ' + error.message, 'error');
                } finally {
                    if (testBtn) {
                        testBtn.disabled = false;
                        testBtn.innerHTML = originalHtml || '<span class="material-symbols-outlined">send</span> Send test-e-post';
                    }
                }

                if (sendSuccess) {
                    await this.showSuccessModal(
                        "Test-e-post er sendt! 🚀",
                        `Vellykket utsending! Test-e-posten ble sendt til <strong style="color: #0f172a;">${recipientEmail}</strong>.<br><br>Sjekk innboksen din nå (husk å sjekke søppelpost/spam dersom den ikke dukker opp innen et minutt).`,
                        "Flott, skjønner!"
                    );
                }
            },
            user.email,
            "Vennligst oppgi en e-postadresse.",
            "Send test-e-post",
            "Send test-e-post"
        );
    }

    async sendCampaign() {
        const estCountNode = document.getElementById('estimated-count');
        const estCount = estCountNode ? (parseInt(estCountNode.innerText) || 0) : 0;
        const subjectNode = document.getElementById('newsletter-subject');
        const subject = subjectNode ? subjectNode.value : '';
        this.syncUnifiedBlocks();

        const container = document.getElementById('blocks-container');
        const textContent = container ? container.innerHTML : '';
        const plainText = textContent.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, '').trim();

        if (!subject || subject.trim() === '') {
            if (typeof showToast === 'function') showToast("Vennligst skriv inn et emne for nyhetsbrevet øverst.", "warning");
            return;
        }

        if (this.blocks.length === 0 || !textContent || plainText === '' || textContent === '<p><br></p>' || textContent === '<p>Skriv nyhetsbrevet ditt her...</p>') {
            if (typeof showToast === 'function') showToast("Du kan ikke sende et tomt nyhetsbrev. Legg til innhold først.", "error");
            return;
        }

        const confirmSend = await this.showConfirm('Send kampanje', `Er du sikker på at du vil sende "${subject}" til ca. ${estCount} mottakere?`, 'Send nå');
        if (!confirmSend) return;

        try {
            const finalBtn = document.getElementById('final-send-btn');
            const originalText = finalBtn ? finalBtn.innerHTML : '<span>Send kampanje nå</span><span class="material-symbols-outlined">send</span>';
            if (finalBtn) {
                finalBtn.disabled = true;
                finalBtn.innerHTML = '<span class="material-symbols-outlined rotating">sync</span> Sender...';
            }

            const campaignData = {
                subject: subject,
                recipientCount: estCount,
                blockCount: this.blocks.length,
                status: 'sent',
                sentAt: new Date().toISOString(),
                sentBy: (window.firebaseService?.auth?.currentUser?.email) || 'admin@hiskingdomministry.no'
            };

            if (window.firebaseService && window.firebaseService.db) {
                await window.firebaseService.db.collection('newsletter_campaigns').add(campaignData);
            }

            if (typeof showToast === 'function') showToast(`Suksess! Nyhetsbrevet er nå lagt i kø for utsendelse!`, "success");
            if (finalBtn) {
                finalBtn.disabled = false;
                finalBtn.innerHTML = originalText;
            }

            const confirmedBack = await this.showConfirm(
                'Nyhetsbrev sendt!',
                `Suksess! Nyhetsbrevet er lagt i kø for utsendelse til ca. ${estCount} mottakere.\n\nVil du gå tilbake til oversikten?`,
                'Gå til oversikt',
                'Bli i editoren'
            );
            if (confirmedBack) {
                this.toggleMode('dashboard');
            }

        } catch (e) {
            console.error("Campaign send failed:", e);
            if (typeof showToast === 'function') showToast("Det oppstod en feil under utsendelsen. Vennligst prøv igjen.", "error");
            const finalBtn = document.getElementById('final-send-btn');
            if (finalBtn) {
                finalBtn.disabled = false;
                finalBtn.innerHTML = '<span>Send kampanje nå</span><span class="material-symbols-outlined">send</span>';
            }
        }
    }

    activateButtonManager(btn) {
        const existing = document.getElementById('hkm-btn-manager');
        if (existing) existing.remove();

        if (!btn || !btn.parentElement) return;

        const overlay = document.createElement('div');
        overlay.id = 'hkm-btn-manager';
        overlay.style.cssText = `
            position: absolute;
            box-sizing: border-box;
            border: 2px dashed #d17d39;
            border-radius: ${getComputedStyle(btn).borderRadius || '999px'};
            z-index: 10000;
            pointer-events: none;
            box-shadow: 0 0 0 1px rgba(255,255,255,0.8), 0 4px 15px rgba(209, 125, 57, 0.3);
        `;

        const updateOverlayPos = () => {
            if (!btn || !btn.parentElement || !document.body.contains(btn)) {
                overlay.remove();
                return;
            }
            const rect = btn.getBoundingClientRect();
            const scrollX = window.scrollX || window.pageXOffset;
            const scrollY = window.scrollY || window.pageYOffset;

            overlay.style.top = (rect.top + scrollY) + 'px';
            overlay.style.left = (rect.left + scrollX) + 'px';
            overlay.style.width = rect.width + 'px';
            overlay.style.height = rect.height + 'px';
        };

        const toolbar = document.createElement('div');
        toolbar.style.cssText = `
            position: absolute;
            top: -42px;
            left: 50%;
            transform: translateX(-50%);
            background: #0f172a;
            color: white;
            padding: 5px 12px;
            border-radius: 20px;
            font-size: 11px;
            font-weight: 700;
            display: flex;
            align-items: center;
            gap: 8px;
            box-shadow: 0 4px 14px rgba(0,0,0,0.3);
            white-space: nowrap;
            pointer-events: auto;
            z-index: 10001;
            font-family: system-ui, -apple-system, sans-serif;
        `;

        const editBtn = document.createElement('button');
        editBtn.type = 'button';
        editBtn.style.cssText = 'background:none; border:none; color:#fb923c; cursor:pointer; font-size:11px; font-weight:700; display:flex; align-items:center; gap:3px; padding:0; font-family:inherit;';
        editBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size:14px;">edit</span> Rediger';
        editBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            overlay.remove();
            
            const oldText = btn.textContent || '';
            const oldUrl = btn.getAttribute('href') || '';
            
            this.showPromptModal(
                "Knapptekst",
                "F.eks. Les mer",
                (newText) => {
                    setTimeout(() => {
                        this.showPromptModal(
                            "Knappens nettadresse",
                            "https://...",
                            (newUrl) => {
                                btn.textContent = newText.trim() || 'Les mer';
                                btn.setAttribute('href', newUrl.trim() || 'https://');
                                this.syncUnifiedBlocks();
                            },
                            oldUrl,
                            "Vennligst oppgi en nettadresse.",
                            "Rediger knapp",
                            "Oppdater"
                        );
                    }, 350);
                },
                oldText,
                "Vennligst oppgi knappetekst.",
                "Rediger knapp",
                "Neste"
            );
        };

        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.style.cssText = 'background:none; border:none; color:#f87171; cursor:pointer; font-size:11px; font-weight:700; display:flex; align-items:center; gap:3px; padding:0; font-family:inherit;';
        deleteBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size:14px;">delete</span> Slett';
        deleteBtn.onclick = async (e) => {
            e.preventDefault();
            e.stopPropagation();
            overlay.remove();
            
            const confirmed = await this.showConfirm("Slett knapp", "Vil du slette denne knappen?", "Slett");
            if (confirmed) {
                const parent = btn.closest('div');
                if (parent && (parent.style.textAlign === 'center' || parent.classList.contains('block-btn-wrap'))) {
                    parent.remove();
                } else {
                    btn.remove();
                }
                this.syncUnifiedBlocks();
            }
        };

        toolbar.appendChild(editBtn);
        toolbar.appendChild(document.createTextNode(' • '));
        toolbar.appendChild(deleteBtn);
        overlay.appendChild(toolbar);

        document.body.appendChild(overlay);
        updateOverlayPos();

        const resizeObserver = new ResizeObserver(() => updateOverlayPos());
        resizeObserver.observe(btn);

        const removeOverlay = (e) => {
            if (e.target !== btn && !overlay.contains(e.target)) {
                overlay.remove();
                resizeObserver.disconnect();
                document.removeEventListener('click', removeOverlay);
                window.removeEventListener('scroll', removeOverlay);
            }
        };

        setTimeout(() => {
            document.addEventListener('click', removeOverlay);
            window.addEventListener('scroll', removeOverlay);
        }, 50);
    }

    activateImageResizer(img, onComplete, onOpenSettings, onDelete) {
        const existing = document.getElementById('hkm-img-resizer');
        if (existing) {
            if (existing.cleanup) existing.cleanup();
            existing.remove();
        }

        if (!img || !img.parentElement) return;

        const overlay = document.createElement('div');
        overlay.id = 'hkm-img-resizer';
        overlay.style.cssText = `
            position: absolute;
            box-sizing: border-box;
            border: 2px solid #d17d39;
            border-radius: ${getComputedStyle(img).borderRadius || '8px'};
            z-index: 10000;
            pointer-events: none;
            box-shadow: 0 0 0 1px rgba(255,255,255,0.8), 0 4px 15px rgba(209, 125, 57, 0.3);
        `;

        const updateOverlayPos = () => {
            const rect = img.getBoundingClientRect();
            const scrollX = window.scrollX || window.pageXOffset;
            const scrollY = window.scrollY || window.pageYOffset;

            overlay.style.top = (rect.top + scrollY) + 'px';
            overlay.style.left = (rect.left + scrollX) + 'px';
            overlay.style.width = rect.width + 'px';
            overlay.style.height = rect.height + 'px';
        };

        const toolbar = document.createElement('div');
        toolbar.style.cssText = `
            position: absolute;
            top: -42px;
            left: 50%;
            transform: translateX(-50%);
            background: #0f172a;
            color: white;
            padding: 5px 12px;
            border-radius: 20px;
            font-size: 11px;
            font-weight: 700;
            display: flex;
            align-items: center;
            gap: 8px;
            box-shadow: 0 4px 14px rgba(0,0,0,0.3);
            white-space: nowrap;
            pointer-events: auto;
            z-index: 10001;
            font-family: system-ui, -apple-system, sans-serif;
        `;

        const sizeText = document.createElement('span');
        sizeText.id = 'hkm-resizer-size-badge';
        const curW = img.style.width || `${img.clientWidth}px`;
        const curH = img.style.height || 'auto';
        sizeText.textContent = `${curW} × ${curH} (${img.clientWidth}x${img.clientHeight}px)`;

        const cleanupResizer = () => {
            window.removeEventListener('resize', scrollResizeHandler);
            window.removeEventListener('scroll', scrollResizeHandler, true);
            document.removeEventListener('mousedown', outsideClickListener);
        };
        overlay.cleanup = cleanupResizer;

        const settingsBtn = document.createElement('button');
        settingsBtn.type = 'button';
        settingsBtn.style.cssText = 'background:none; border:none; color:#fb923c; cursor:pointer; font-size:11px; font-weight:700; display:flex; align-items:center; gap:3px; padding:0; font-family:inherit;';
        settingsBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size:14px;">tune</span> Innstillinger';
        settingsBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            cleanupResizer();
            overlay.remove();
            if (onOpenSettings) onOpenSettings(img);
            else if (typeof this.showImageOptions === 'function') this.showImageOptions(img);
            else if (typeof this.showGlobalImageOptions === 'function') this.showGlobalImageOptions(img, img.parentElement);
        };

        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.style.cssText = 'background:none; border:none; color:#f87171; cursor:pointer; font-size:11px; font-weight:700; display:flex; align-items:center; gap:3px; padding:0; font-family:inherit;';
        deleteBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size:14px;">delete</span> Slett';
        deleteBtn.onclick = async (e) => {
            e.preventDefault();
            e.stopPropagation();
            cleanupResizer();
            overlay.remove();
            if (onDelete) {
                onDelete(img);
            } else if (typeof this.showConfirm === 'function') {
                const confirmed = await this.showConfirm('Slett bilde', 'Er du sikker på at du vil slette dette bildet?', 'Slett');
                if (confirmed) {
                    const p = img.parentNode;
                    img.remove();
                    if (p && p.tagName === 'P' && p.innerHTML.trim() === '') p.remove();
                    if (typeof this.syncUnifiedBlocks === 'function') this.syncUnifiedBlocks();
                }
            }
        };

        toolbar.appendChild(sizeText);
        toolbar.appendChild(document.createTextNode(' • '));
        toolbar.appendChild(settingsBtn);
        toolbar.appendChild(document.createTextNode(' • '));
        toolbar.appendChild(deleteBtn);
        overlay.appendChild(toolbar);

        const handles = [
            { name: 'se', cursor: 'nwse-resize', style: 'bottom: -7px; right: -7px;' },
            { name: 'sw', cursor: 'nesw-resize', style: 'bottom: -7px; left: -7px;' },
            { name: 'ne', cursor: 'nesw-resize', style: 'top: -7px; right: -7px;' },
            { name: 'nw', cursor: 'nwse-resize', style: 'top: -7px; left: -7px;' },
            { name: 'e', cursor: 'ew-resize', style: 'top: 50%; right: -7px; transform: translateY(-50%);' },
            { name: 's', cursor: 'ns-resize', style: 'bottom: -7px; left: 50%; transform: translateX(-50%);' }
        ];

        handles.forEach(h => {
            const handleEl = document.createElement('div');
            handleEl.style.cssText = `
                position: absolute;
                width: 13px;
                height: 13px;
                background: white;
                border: 2px solid #d17d39;
                border-radius: 50%;
                cursor: ${h.cursor};
                pointer-events: auto;
                box-shadow: 0 2px 6px rgba(0,0,0,0.25);
                z-index: 10002;
                ${h.style}
            `;

            handleEl.addEventListener('mousedown', (evt) => {
                evt.preventDefault();
                evt.stopPropagation();

                const startX = evt.clientX;
                const startY = evt.clientY;
                const startW = img.clientWidth;
                const startH = img.clientHeight;
                const parentW = img.parentElement.clientWidth || document.body.clientWidth;

                const onMouseMove = (moveEvt) => {
                    const deltaX = moveEvt.clientX - startX;
                    const deltaY = moveEvt.clientY - startY;

                    let newW = startW;
                    let newH = startH;

                    if (h.name.includes('e')) newW = startW + deltaX;
                    if (h.name.includes('w')) newW = startW - deltaX;
                    if (h.name.includes('s')) newH = startH + deltaY;
                    if (h.name.includes('n')) newH = startH - deltaY;

                    newW = Math.max(30, newW);
                    newH = Math.max(30, newH);

                    const widthPercent = Math.min(100, Math.max(5, Math.round((newW / parentW) * 100)));
                    img.style.width = widthPercent + '%';
                    img.style.height = Math.round(newH) + 'px';
                    img.style.objectFit = 'cover';
                    img.style.display = 'block';

                    sizeText.textContent = `${widthPercent}% (${Math.round(newW)}px × ${Math.round(newH)}px)`;
                    updateOverlayPos();
                };

                const onMouseUp = () => {
                    window.removeEventListener('mousemove', onMouseMove);
                    window.removeEventListener('mouseup', onMouseUp);
                    if (onComplete) onComplete(img);
                    else if (typeof this.syncUnifiedBlocks === 'function') this.syncUnifiedBlocks();
                };

                window.addEventListener('mousemove', onMouseMove);
                window.addEventListener('mouseup', onMouseUp);
            });

            overlay.appendChild(handleEl);
        });

        document.body.appendChild(overlay);
        updateOverlayPos();

        const scrollResizeHandler = () => updateOverlayPos();
        window.addEventListener('resize', scrollResizeHandler);
        window.addEventListener('scroll', scrollResizeHandler, true);

        const outsideClickListener = (evt) => {
            if (!overlay.contains(evt.target) && evt.target !== img) {
                cleanupResizer();
                overlay.remove();
            }
        };
        setTimeout(() => document.addEventListener('mousedown', outsideClickListener), 50);
    }

    showImageOptions(imgElement) {
        const existing = document.getElementById('image-options-modal');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = 'image-options-modal';
        overlay.className = 'profile-modal';
        overlay.style.cssText = `
            display: none;
            z-index: 12000;
            position: fixed;
            inset: 0;
            background: rgba(15, 23, 42, 0.6);
            align-items: center;
            justify-content: center;
            backdrop-filter: blur(8px);
        `;
        document.body.appendChild(overlay);

        // Parse current image styles
        const curWidth = imgElement.style.width || '100%';
        const curHeight = imgElement.style.height || 'auto';
        const curObjectFit = imgElement.style.objectFit || 'cover';
        const curRadius = imgElement.style.borderRadius || '8px';
        const curMargin = imgElement.style.margin || '';
        
        const curPosition = imgElement.style.objectPosition || '50% 50%';
        let curPosY = 50;
        const posParts = curPosition.split(' ');
        if (posParts.length > 1) {
            curPosY = parseInt(posParts[1]);
            if (isNaN(curPosY)) curPosY = 50;
        } else if (posParts.length === 1 && posParts[0].endsWith('%')) {
            curPosY = parseInt(posParts[0]);
            if (isNaN(curPosY)) curPosY = 50;
        }
        
        let curAlign = 'center';
        if (curMargin.includes('auto 16px 0') || curMargin.includes('auto 0') || curMargin.endsWith(' 0')) {
            curAlign = 'left';
        } else if (curMargin.includes('0 16px auto') || curMargin.includes('0 auto')) {
            curAlign = 'right';
        }

        overlay.innerHTML = `
            <div class="profile-modal-content card modern" style="max-width: 480px; width: 92%; border-radius: 20px; background: white; padding: 24px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); max-height: 90vh; overflow-y: auto;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; padding-bottom: 12px; border-bottom: 1px solid #f1f5f9;">
                    <h3 style="margin: 0; font-size: 18px; font-weight: 700; color: #1e293b; display: flex; align-items: center; gap: 8px;">
                        <span class="material-symbols-outlined" style="color: #d17d39; font-size: 22px;">photo_size_select_large</span>
                        <span>Bildeinnstillinger & Størrelse</span>
                    </h3>
                    <button id="img-opt-close" style="background: #f1f5f9; border: none; color: #64748b; cursor: pointer; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; transition: all 0.2s;">
                        <span class="material-symbols-outlined" style="font-size: 18px;">close</span>
                    </button>
                </div>

                <!-- STØRRELSE & FORM -->
                <div style="display: flex; flex-direction: column; gap: 16px; margin-bottom: 24px; background: #f8fafc; padding: 16px; border-radius: 14px; border: 1px solid #e2e8f0;">
                    <!-- Bredde (Width) -->
                    <div>
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                            <label style="font-size: 13px; font-weight: 700; color: #334155;">Bredde (Størrelse)</label>
                            <span id="img-val-width" style="font-size: 12px; font-weight: 600; color: #d17d39;">${curWidth}</span>
                        </div>
                        <div style="display: flex; gap: 6px; margin-bottom: 8px;">
                            <button class="img-preset-btn" data-type="width" data-val="25%" style="flex: 1; padding: 6px; font-size: 12px; font-weight: 600; border-radius: 8px; border: 1px solid #cbd5e1; background: white; cursor: pointer;">25%</button>
                            <button class="img-preset-btn" data-type="width" data-val="50%" style="flex: 1; padding: 6px; font-size: 12px; font-weight: 600; border-radius: 8px; border: 1px solid #cbd5e1; background: white; cursor: pointer;">50%</button>
                            <button class="img-preset-btn" data-type="width" data-val="75%" style="flex: 1; padding: 6px; font-size: 12px; font-weight: 600; border-radius: 8px; border: 1px solid #cbd5e1; background: white; cursor: pointer;">75%</button>
                            <button class="img-preset-btn" data-type="width" data-val="100%" style="flex: 1; padding: 6px; font-size: 12px; font-weight: 600; border-radius: 8px; border: 1px solid #cbd5e1; background: white; cursor: pointer;">100%</button>
                        </div>
                        <input type="range" id="img-slider-width" min="10" max="100" value="${parseInt(curWidth) || 100}" style="width: 100%; accent-color: #d17d39; cursor: pointer;">
                    </div>

                    <!-- Høyde (Height) -->
                    <div>
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                            <label style="font-size: 13px; font-weight: 700; color: #334155;">Høyde</label>
                            <span id="img-val-height" style="font-size: 12px; font-weight: 600; color: #d17d39;">${curHeight}</span>
                        </div>
                        <div style="display: flex; gap: 6px; margin-bottom: 8px;">
                            <button class="img-preset-btn" data-type="height" data-val="auto" style="flex: 1; padding: 6px; font-size: 12px; font-weight: 600; border-radius: 8px; border: 1px solid #cbd5e1; background: white; cursor: pointer;">Auto</button>
                            <button class="img-preset-btn" data-type="height" data-val="150px" style="flex: 1; padding: 6px; font-size: 12px; font-weight: 600; border-radius: 8px; border: 1px solid #cbd5e1; background: white; cursor: pointer;">150px</button>
                            <button class="img-preset-btn" data-type="height" data-val="250px" style="flex: 1; padding: 6px; font-size: 12px; font-weight: 600; border-radius: 8px; border: 1px solid #cbd5e1; background: white; cursor: pointer;">250px</button>
                            <button class="img-preset-btn" data-type="height" data-val="400px" style="flex: 1; padding: 6px; font-size: 12px; font-weight: 600; border-radius: 8px; border: 1px solid #cbd5e1; background: white; cursor: pointer;">400px</button>
                        </div>
                    </div>

                    <!-- Bilde-fokus / Manuell beskjæring (Object-Position) -->
                    <div style="background: white; padding: 12px; border-radius: 10px; border: 1px solid #e2e8f0;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                            <label style="font-size: 13px; font-weight: 700; color: #334155;">Bilde-fokus (Vertikal beskjæring)</label>
                            <span id="img-val-focus" style="font-size: 12px; font-weight: 600; color: #d17d39;">${curPosY}%</span>
                        </div>
                        <div style="display: flex; gap: 4px; margin-bottom: 8px;">
                            <button type="button" class="img-focus-btn" data-val="0%" style="flex: 1; padding: 6px; font-size: 11px; font-weight: 600; border-radius: 8px; border: 1px solid #cbd5e1; background: white; cursor: pointer;">Topp (0%)</button>
                            <button type="button" class="img-focus-btn" data-val="50%" style="flex: 1; padding: 6px; font-size: 11px; font-weight: 600; border-radius: 8px; border: 1px solid #cbd5e1; background: white; cursor: pointer;">Senter (50%)</button>
                            <button type="button" class="img-focus-btn" data-val="100%" style="flex: 1; padding: 6px; font-size: 11px; font-weight: 600; border-radius: 8px; border: 1px solid #cbd5e1; background: white; cursor: pointer;">Bunn (100%)</button>
                        </div>
                        <input type="range" id="img-slider-focus" min="0" max="100" value="${curPosY}" style="width: 100%; accent-color: #d17d39; cursor: pointer;">
                    </div>

                    <!-- Justering (Alignment) & Hjørner -->
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                        <div>
                            <label style="font-size: 13px; font-weight: 700; color: #334155; display: block; margin-bottom: 6px;">Plassering</label>
                            <div style="display: flex; gap: 4px;">
                                <button class="img-preset-btn ${curAlign === 'left' ? 'active' : ''}" data-type="align" data-val="left" title="Venstre" style="flex: 1; padding: 8px; font-size: 12px; border-radius: 8px; border: 1px solid #cbd5e1; background: white; cursor: pointer; display: flex; align-items: center; justify-content: center;">
                                    <span class="material-symbols-outlined" style="font-size: 18px;">format_align_left</span>
                                </button>
                                <button class="img-preset-btn ${curAlign === 'center' ? 'active' : ''}" data-type="align" data-val="center" title="Senter" style="flex: 1; padding: 8px; font-size: 12px; border-radius: 8px; border: 1px solid #cbd5e1; background: white; cursor: pointer; display: flex; align-items: center; justify-content: center;">
                                    <span class="material-symbols-outlined" style="font-size: 18px;">format_align_center</span>
                                </button>
                                <button class="img-preset-btn ${curAlign === 'right' ? 'active' : ''}" data-type="align" data-val="right" title="Høyre" style="flex: 1; padding: 8px; font-size: 12px; border-radius: 8px; border: 1px solid #cbd5e1; background: white; cursor: pointer; display: flex; align-items: center; justify-content: center;">
                                    <span class="material-symbols-outlined" style="font-size: 18px;">format_align_right</span>
                                </button>
                            </div>
                        </div>
                        <div>
                            <label style="font-size: 13px; font-weight: 700; color: #334155; display: block; margin-bottom: 6px;">Hjørner</label>
                            <select id="img-select-radius" style="width: 100%; padding: 8px 10px; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 13px; font-weight: 600; background: white;">
                                <option value="0px" ${curRadius === '0px' ? 'selected' : ''}>Skarpe (0px)</option>
                                <option value="8px" ${curRadius === '8px' || curRadius === '' ? 'selected' : ''}>Runde (8px)</option>
                                <option value="16px" ${curRadius === '16px' ? 'selected' : ''}>Myke (16px)</option>
                                <option value="24px" ${curRadius === '24px' ? 'selected' : ''}>Ekstra myke (24px)</option>
                                <option value="50%" ${curRadius === '50%' ? 'selected' : ''}>Sirkel (50%)</option>
                            </select>
                        </div>
                    </div>
                </div>

                <!-- BILDEKILDE ACTIONS -->
                <div style="font-size: 12px; font-weight: 700; color: #64748b; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.05em;">Bytt kilde eller slett</div>
                <div style="display: flex; flex-direction: column; gap: 10px;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                        <button id="img-opt-upload" class="prompt-btn primary" style="background: #1B4965 !important; border: none; padding: 10px; border-radius: 12px; display: flex; align-items: center; justify-content: center; gap: 6px; cursor: pointer; color: white; font-weight: 600; font-size: 13px;">
                            <span class="material-symbols-outlined" style="font-size: 18px;">upload_file</span>
                            <span>Last opp</span>
                        </button>
                        <button id="img-opt-unsplash" class="prompt-btn primary" style="background: #d17d39 !important; border: none; padding: 10px; border-radius: 12px; display: flex; align-items: center; justify-content: center; gap: 6px; cursor: pointer; color: white; font-weight: 600; font-size: 13px;">
                            <span class="material-symbols-outlined" style="font-size: 18px;">image_search</span>
                            <span>Unsplash</span>
                        </button>
                    </div>
                    <button id="img-opt-ai" class="prompt-btn primary" style="background: linear-gradient(135deg, #bd4f2a, #d17d39) !important; border: none; padding: 10px; border-radius: 12px; display: flex; align-items: center; justify-content: center; gap: 6px; cursor: pointer; color: white; font-weight: 600; font-size: 13px;">
                        <span class="material-symbols-outlined" style="font-size: 18px;">auto_awesome</span>
                        <span>Generer med AI</span>
                    </button>
                    <button id="img-opt-crop" class="prompt-btn primary" style="background: #0284c7 !important; border: none; padding: 10px; border-radius: 12px; display: flex; align-items: center; justify-content: center; gap: 6px; cursor: pointer; color: white; font-weight: 600; font-size: 13px;">
                        <span class="material-symbols-outlined" style="font-size: 18px;">crop</span>
                        <span>Beskjær bilde</span>
                    </button>
                    <button id="img-opt-delete" class="prompt-btn secondary" style="background: #ef4444 !important; border: none; color: white !important; padding: 10px; border-radius: 12px; display: flex; align-items: center; justify-content: center; gap: 6px; cursor: pointer; font-weight: 600; font-size: 13px;">
                        <span class="material-symbols-outlined" style="font-size: 18px;">delete</span>
                        <span>Slett bilde</span>
                    </button>
                </div>
            </div>
        `;

        overlay.style.display = 'flex';

        const closeOverlay = () => {
            overlay.remove();
        };

        overlay.onclick = (e) => {
            if (e.target === overlay) closeOverlay();
        };

        const closeBtn = document.getElementById('img-opt-close');
        if (closeBtn) closeBtn.onclick = closeOverlay;

        // Helper to update image styles and sync
        const updateImgStyle = (prop, val) => {
            if (prop === 'width') {
                imgElement.style.width = val;
                document.getElementById('img-val-width').textContent = val;
            } else if (prop === 'height') {
                imgElement.style.height = val;
                if (val !== 'auto') {
                    imgElement.style.objectFit = 'cover';
                    if (!imgElement.style.objectPosition) {
                        imgElement.style.objectPosition = '50% 50%';
                    }
                } else {
                    imgElement.style.objectFit = '';
                }
                document.getElementById('img-val-height').textContent = val;
            } else if (prop === 'align') {
                imgElement.style.display = 'block';
                if (val === 'left') {
                    imgElement.style.margin = '16px auto 16px 0';
                } else if (val === 'right') {
                    imgElement.style.margin = '16px 0 16px auto';
                } else {
                    imgElement.style.margin = '16px auto';
                }
            } else if (prop === 'radius') {
                imgElement.style.borderRadius = val;
            } else if (prop === 'focus') {
                imgElement.style.objectPosition = `50% ${val}%`;
                imgElement.style.objectFit = 'cover';
                const focusValEl = document.getElementById('img-val-focus');
                if (focusValEl) focusValEl.textContent = `${val}%`;
            }
            this.syncUnifiedBlocks();
        };

        // Event listeners for width slider
        const widthSlider = document.getElementById('img-slider-width');
        if (widthSlider) {
            widthSlider.oninput = (e) => {
                updateImgStyle('width', `${e.target.value}%`);
            };
        }

        // Event listeners for focus slider
        const focusSlider = document.getElementById('img-slider-focus');
        if (focusSlider) {
            focusSlider.oninput = (e) => {
                updateImgStyle('focus', e.target.value);
            };
        }

        overlay.querySelectorAll('.img-focus-btn').forEach(btn => {
            btn.onclick = () => {
                const val = btn.dataset.val;
                const numeric = parseInt(val) || 0;
                if (focusSlider) focusSlider.value = numeric;
                updateImgStyle('focus', numeric);
            };
        });

        // Event listeners for presets
        overlay.querySelectorAll('.img-preset-btn').forEach(btn => {
            btn.onclick = () => {
                const type = btn.dataset.type;
                const val = btn.dataset.val;
                if (type === 'width') {
                    if (widthSlider) widthSlider.value = parseInt(val) || 100;
                    updateImgStyle('width', val);
                } else if (type === 'height') {
                    updateImgStyle('height', val);
                } else if (type === 'align') {
                    overlay.querySelectorAll('.img-preset-btn[data-type="align"]').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    updateImgStyle('align', val);
                }
            };
        });

        // Border radius select
        const radiusSelect = document.getElementById('img-select-radius');
        if (radiusSelect) {
            radiusSelect.onchange = (e) => {
                updateImgStyle('radius', e.target.value);
            };
        }

        // Option 1: Upload from device
        document.getElementById('img-opt-upload').onclick = () => {
            closeOverlay();
            let fileInput = document.getElementById('block-image-upload');
            if (!fileInput) {
                fileInput = document.createElement('input');
                fileInput.type = 'file';
                fileInput.id = 'block-image-upload';
                fileInput.accept = 'image/*';
                fileInput.style.display = 'none';
                document.body.appendChild(fileInput);
            }
            
            const newFileInput = fileInput.cloneNode(true);
            fileInput.parentNode.replaceChild(newFileInput, fileInput);
            
            newFileInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                try {
                    showToast("Erstatter bilde...", "info");
                    const uploadPath = `newsletter/images/${Date.now()}_${file.name}`;
                    const url = await window.firebaseService.uploadImage(file, uploadPath);
                    imgElement.src = url;
                    imgElement.setAttribute('src', url);
                    this.syncUnifiedBlocks();
                    showToast("Bilde erstattet!", "success");
                } catch (err) {
                    console.error("Replacement upload failed:", err);
                    showToast("Kunne ikke erstatte bilde.", "error");
                }
            });
            newFileInput.click();
        };

        // Option 2: Search Unsplash
        document.getElementById('img-opt-unsplash').onclick = () => {
            closeOverlay();
            if (window.unsplashManager) {
                window.unsplashManager.open((selection) => {
                    if (selection && selection.url) {
                        imgElement.src = selection.url;
                        imgElement.setAttribute('src', selection.url);
                        this.syncUnifiedBlocks();
                        showToast("Bilde erstattet fra Unsplash!", "success");
                    }
                });
            } else {
                showToast("Unsplash-søk er ikke tilgjengelig akkurat nå.", "warning");
            }
        };

        // Option 3: Generate with AI
        document.getElementById('img-opt-ai').onclick = () => {
            closeOverlay();
            this.showPromptModal(
                "Beskriv bildet du ønsker å generere med AI for å erstatte dette bildet:",
                "F.eks: En fargerik blomstereng under en skyfri himmel...",
                async (promptVal) => {
                    showToast("Genererer nytt bilde med AI...", "info", 10000);
                    try {
                        const callable = firebase.functions().httpsCallable('aiProcess');
                        const result = await callable({
                            task: 'generate_image',
                            prompt: promptVal
                        });

                        if (result.data && result.data.imageUrl) {
                            imgElement.src = result.data.imageUrl;
                            imgElement.setAttribute('src', result.data.imageUrl);
                            this.syncUnifiedBlocks();
                            showToast("Bilde erstattet med AI-generert bilde!", "success");
                        }
                    } catch (err) {
                        console.error("AI Image replacement failed:", err);
                        showToast("Kunne ikke generere nytt bilde: " + err.message, "error");
                    }
                }
            );
        };

        // Option Crop
        document.getElementById('img-opt-crop').onclick = () => {
            closeOverlay();
            this.openImageCropper(imgElement.src, (newUrl) => {
                imgElement.src = newUrl;
                imgElement.setAttribute('src', newUrl);
                this.syncUnifiedBlocks();
                showToast("Bilde beskjært!", "success");
            }, 'newsletter/images');
        };

        // Option 4: Delete image
        document.getElementById('img-opt-delete').onclick = async () => {
            closeOverlay();
            const confirmed = await this.showConfirm('Slett bilde', "Er du sikker på at du vil slette dette bildet?", 'Slett');
            if (confirmed) {
                const parent = imgElement.parentNode;
                imgElement.remove();
                if (parent && parent.tagName === 'P' && parent.innerHTML.trim() === '') {
                    parent.remove();
                }
                this.syncUnifiedBlocks();
                showToast("Bilde slettet.", "info");
            }
        };
    }

    openImageCropper(imageSrc, onCropped, folderPath = 'cropped') {
        const loadCropper = (cb) => {
            if (window.Cropper) {
                cb();
                return;
            }
            if (!document.querySelector('link[href*="cropper.min.css"]')) {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = 'https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.6.2/cropper.min.css';
                document.head.appendChild(link);
            }
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.6.2/cropper.min.js';
            script.onload = cb;
            document.body.appendChild(script);
        };

        loadCropper(async () => {
            let cropModal = document.getElementById('hkm-crop-modal');
            if (cropModal) cropModal.remove();

            // Prevent CORS caching/tainting by creating a Blob URL with cache-busting and proxy fallback
            let targetUrl = imageSrc;
            if (imageSrc.startsWith('http') || imageSrc.startsWith('//')) {
                try {
                    const cacheBusterUrl = imageSrc + (imageSrc.includes('?') ? '&' : '?') + 'hkmcropnocache=' + Date.now();
                    const resp = await fetch(cacheBusterUrl, { mode: 'cors', cache: 'no-store' });
                    if (resp.ok) {
                        const blob = await resp.blob();
                        targetUrl = URL.createObjectURL(blob);
                    } else {
                        throw new Error(`Direct fetch failed: ${resp.status}`);
                    }
                } catch (directErr) {
                    console.warn("Direct CORS fetch failed, trying CORS proxy:", directErr);
                    try {
                        const proxyUrl = 'https://corsproxy.io/?' + encodeURIComponent(imageSrc);
                        const resp = await fetch(proxyUrl);
                        if (resp.ok) {
                            const blob = await resp.blob();
                            targetUrl = URL.createObjectURL(blob);
                            console.log("Successfully fetched image through CORS proxy!");
                        } else {
                            throw new Error(`Proxy fetch failed: ${resp.status}`);
                        }
                    } catch (proxyErr) {
                        console.warn("CORS proxy fetch also failed, using fallback URL:", proxyErr);
                    }
                }
            }

            cropModal = document.createElement('div');
            cropModal.id = 'hkm-crop-modal';
            cropModal.style.cssText = `
                position: fixed;
                inset: 0;
                background: rgba(15, 23, 42, 0.95);
                z-index: 99999;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 20px;
                backdrop-filter: blur(10px);
            `;

            cropModal.innerHTML = `
                <div style="background: #1e293b; border-radius: 20px; width: 100%; max-width: 800px; display: flex; flex-direction: column; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); overflow: hidden; max-height: 90vh;">
                    <div style="display: flex; align-items: center; justify-content: space-between; padding: 16px 24px; border-bottom: 1px solid #334155; background: #0f172a;">
                        <h3 style="margin: 0; font-size: 18px; font-weight: 700; color: #f8fafc; display: flex; align-items: center; gap: 8px;">
                            <span class="material-symbols-outlined" style="color: #d17d39;">crop</span>
                            <span>Beskjær / Roter bilde</span>
                        </h3>
                        <button id="hkm-crop-close" style="background: #334155; border: none; color: #94a3b8; cursor: pointer; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; transition: all 0.2s;">
                            <span class="material-symbols-outlined" style="font-size: 18px;">close</span>
                        </button>
                    </div>

                    <div style="flex: 1; padding: 24px; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #0f172a; min-height: 350px; position: relative;">
                        <div style="max-height: 50vh; width: 100%; display: flex; justify-content: center; align-items: center; overflow: hidden; border-radius: 8px;">
                            <img id="hkm-crop-target" src="${targetUrl}" style="max-width: 100%; max-height: 45vh; display: block;" ${targetUrl.startsWith('blob:') ? '' : 'crossOrigin="anonymous"'}>
                        </div>
                    </div>

                    <div style="padding: 16px 24px; background: #0f172a; border-top: 1px solid #334155; display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 12px;">
                        <div style="display: flex; gap: 6px; flex-wrap: wrap;" class="hkm-crop-ratios">
                            <button data-ratio="NaN" class="crop-ratio-btn active" style="padding: 6px 12px; font-size: 12px; font-weight: 600; border-radius: 8px; border: 1px solid #334155; background: #1e293b; color: white; cursor: pointer;">Fri</button>
                            <button data-ratio="1" class="crop-ratio-btn" style="padding: 6px 12px; font-size: 12px; font-weight: 600; border-radius: 8px; border: 1px solid #334155; background: #1e293b; color: white; cursor: pointer;">1:1</button>
                            <button data-ratio="1.7777777777777777" class="crop-ratio-btn" style="padding: 6px 12px; font-size: 12px; font-weight: 600; border-radius: 8px; border: 1px solid #334155; background: #1e293b; color: white; cursor: pointer;">16:9</button>
                            <button data-ratio="1.3333333333333333" class="crop-ratio-btn" style="padding: 6px 12px; font-size: 12px; font-weight: 600; border-radius: 8px; border: 1px solid #334155; background: #1e293b; color: white; cursor: pointer;">4:3</button>
                            <button data-ratio="1.5" class="crop-ratio-btn" style="padding: 6px 12px; font-size: 12px; font-weight: 600; border-radius: 8px; border: 1px solid #334155; background: #1e293b; color: white; cursor: pointer;">3:2</button>
                            <button data-ratio="0.6666666666666666" class="crop-ratio-btn" style="padding: 6px 12px; font-size: 12px; font-weight: 600; border-radius: 8px; border: 1px solid #334155; background: #1e293b; color: white; cursor: pointer;">2:3</button>
                        </div>

                        <div style="display: flex; gap: 8px; align-items: center;">
                            <button id="hkm-crop-rotate-l" style="padding: 8px; border-radius: 8px; border: 1px solid #334155; background: #1e293b; color: white; cursor: pointer; display: flex; align-items: center;" title="Roter venstre">
                                <span class="material-symbols-outlined" style="font-size: 18px;">rotate_left</span>
                            </button>
                            <button id="hkm-crop-rotate-r" style="padding: 8px; border-radius: 8px; border: 1px solid #334155; background: #1e293b; color: white; cursor: pointer; display: flex; align-items: center;" title="Roter høyre">
                                <span class="material-symbols-outlined" style="font-size: 18px;">rotate_right</span>
                            </button>
                            <button id="hkm-crop-zoom-in" style="padding: 8px; border-radius: 8px; border: 1px solid #334155; background: #1e293b; color: white; cursor: pointer; display: flex; align-items: center;" title="Zoom inn">
                                <span class="material-symbols-outlined" style="font-size: 18px;">zoom_in</span>
                            </button>
                            <button id="hkm-crop-zoom-out" style="padding: 8px; border-radius: 8px; border: 1px solid #334155; background: #1e293b; color: white; cursor: pointer; display: flex; align-items: center;" title="Zoom ut">
                                <span class="material-symbols-outlined" style="font-size: 18px;">zoom_out</span>
                            </button>
                        </div>
                    </div>

                    <div style="padding: 16px 24px; border-top: 1px solid #334155; display: flex; justify-content: flex-end; gap: 12px; background: #0f172a;">
                        <button id="hkm-crop-cancel" style="padding: 10px 18px; border-radius: 10px; border: 1px solid #334155; background: transparent; color: #94a3b8; cursor: pointer; font-weight: 600; font-size: 14px;">Avbryt</button>
                        <button id="hkm-crop-save" style="padding: 10px 18px; border-radius: 10px; border: none; background: #1B4965; color: white; cursor: pointer; font-weight: 600; font-size: 14px; display: flex; align-items: center; gap: 6px;">
                            <span class="material-symbols-outlined" style="font-size: 18px;">check</span>
                            <span>Lagre beskjæring</span>
                        </button>
                    </div>
                </div>
            `;

            if (!document.getElementById('hkm-crop-styles')) {
                const style = document.createElement('style');
                style.id = 'hkm-crop-styles';
                style.textContent = `
                    .crop-ratio-btn { transition: all 0.2s ease; }
                    .crop-ratio-btn:hover { background: #334155 !important; }
                    .crop-ratio-btn.active { background: #d17d39 !important; border-color: #d17d39 !important; }
                    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                `;
                document.head.appendChild(style);
            }

            document.body.appendChild(cropModal);

            const targetImg = document.getElementById('hkm-crop-target');
            let cropper = null;

            const initCropper = () => {
                if (cropper) return;
                setTimeout(() => {
                    if (cropper) return;
                    cropper = new window.Cropper(targetImg, {
                        viewMode: 1,
                        dragMode: 'move',
                        background: false,
                        responsive: true,
                        checkOrientation: false
                    });
                }, 150);
            };

            if (targetImg.complete) {
                initCropper();
            } else {
                targetImg.onload = initCropper;
            }

            targetImg.onerror = () => {
                if (cropper) return;
                console.warn("Cropper target image failed to load with CORS. Retrying without CORS...");
                targetImg.removeAttribute('crossOrigin');
                
                targetImg.onload = () => {
                    if (cropper) return;
                    setTimeout(() => {
                        if (cropper) return;
                        cropper = new window.Cropper(targetImg, {
                            viewMode: 1,
                            dragMode: 'move',
                            background: false,
                            responsive: true
                        });
                    }, 150);
                };

                // Force browser to reload without CORS
                const retryUrl = imageSrc + (imageSrc.includes('?') ? '&' : '?') + 'retrynocors=' + Date.now();
                targetImg.src = retryUrl;
            };

            cropModal.querySelectorAll('.crop-ratio-btn').forEach(btn => {
                btn.onclick = () => {
                    cropModal.querySelectorAll('.crop-ratio-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    const ratio = parseFloat(btn.dataset.ratio);
                    if (cropper) {
                        cropper.setAspectRatio(isNaN(ratio) ? NaN : ratio);
                    }
                };
            });

            document.getElementById('hkm-crop-rotate-l').onclick = () => cropper && cropper.rotate(-90);
            document.getElementById('hkm-crop-rotate-r').onclick = () => cropper && cropper.rotate(90);
            document.getElementById('hkm-crop-zoom-in').onclick = () => cropper && cropper.zoom(0.1);
            document.getElementById('hkm-crop-zoom-out').onclick = () => cropper && cropper.zoom(-0.1);

            const closeCrop = () => {
                if (cropper) {
                    cropper.destroy();
                    cropper = null;
                }
                if (targetUrl.startsWith('blob:')) {
                    URL.revokeObjectURL(targetUrl);
                }
                cropModal.remove();
            };
            document.getElementById('hkm-crop-close').onclick = closeCrop;
            document.getElementById('hkm-crop-cancel').onclick = closeCrop;

            document.getElementById('hkm-crop-save').onclick = async () => {
                if (!cropper) return;
                const saveBtn = document.getElementById('hkm-crop-save');
                saveBtn.disabled = true;
                saveBtn.innerHTML = '<span class="material-symbols-outlined spinner" style="font-size: 18px; animation: spin 1s linear infinite;">sync</span><span>Lagrer...</span>';

                try {
                    let canvas;
                    try {
                        canvas = cropper.getCroppedCanvas({
                            imageSmoothingEnabled: true,
                            imageSmoothingQuality: 'high'
                        });
                    } catch (canvasErr) {
                        console.error("Canvas export failed:", canvasErr);
                        await this.showConfirm(
                            "Kan ikke beskjære bildet",
                            "Bildet ligger på en ekstern nettside som blokkerer beskjæring. Last opp bildet på nytt fra enheten din.",
                            "OK",
                            ""
                        );
                        saveBtn.disabled = false;
                        saveBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size: 18px;">check</span><span>Lagre beskjæring</span>';
                        return;
                    }

                    if (!canvas) {
                        await this.showConfirm("Beskjæring feilet", "Kunne ikke generere beskåret bilde.", "OK", "");
                        saveBtn.disabled = false;
                        saveBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size: 18px;">check</span><span>Lagre beskjæring</span>';
                        return;
                    }

                    canvas.toBlob(async (blob) => {
                        if (!blob) {
                            await this.showConfirm("Beskjæring feilet", "Kunne ikke generere beskåret bilde.", "OK", "");
                            saveBtn.disabled = false;
                            saveBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size: 18px;">check</span><span>Lagre beskjæring</span>';
                            return;
                        }

                        const filename = `cropped_${Date.now()}.jpg`;
                        const file = new File([blob], filename, { type: 'image/jpeg' });
                        const path = `${folderPath}/${Date.now()}_${filename}`;
                        const url = await window.firebaseService.uploadImage(file, path);

                        onCropped(url);
                        closeCrop();
                    }, 'image/jpeg', 0.92);
                } catch (err) {
                    console.error("Cropping failed:", err);
                    await this.showConfirm("Beskjæring feilet", `En feil oppstod under beskjæring: ${err.message}`, "OK", "");
                    saveBtn.disabled = false;
                    saveBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size: 18px;">check</span><span>Lagre beskjæring</span>';
                }
            };
        });
    }

    exportHtmlFile() {
        this.syncUnifiedBlocks();
        const fullHtml = this.compileEmailHtml();
        if (!fullHtml) return;

        const blob = new Blob([fullHtml], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'hkm-nyhetsbrev.html';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        if (typeof showToast === 'function') showToast("E-post HTML ble eksportert og lastet ned!", "success");
    }

    async saveDraft() {
        if (!window.firebaseService || !window.firebaseService.isInitialized) return;

        const subjectVal = document.getElementById('newsletter-subject')?.value || '';
        const defaultName = this.currentDraftName || (subjectVal ? `Kladd: ${subjectVal}` : "Min Kladd");

        this.showPromptModal(
            "Oppgi navnet på kladden din:",
            "f.eks. Juli Månedsbrev, Konsertinvitasjon...",
            async (name) => {
                const trimmedName = (name || '').trim();
                if (!trimmedName) return;

                try {
                    this.syncUnifiedBlocks();
                    const headerNode = document.querySelector('.canvas-header');
                    const data = {
                        name: trimmedName,
                        blocks: this.blocks,
                        headerHtml: headerNode ? headerNode.outerHTML : '',
                        subject: subjectVal,
                        updatedAt: new Date().toISOString(),
                        isDraft: true
                    };

                    this.currentDraftName = trimmedName;
                    this.hasCustomDraftName = true;

                    if (this.currentDraftId) {
                        await window.firebaseService.db.collection('newsletter_templates').doc(this.currentDraftId).set(data, { merge: true });
                    } else {
                        data.createdAt = new Date().toISOString();
                        const docRef = await window.firebaseService.db.collection('newsletter_templates').add(data);
                        this.currentDraftId = docRef.id;

                        const url = new URL(window.location.href);
                        url.searchParams.set('draftId', this.currentDraftId);
                        window.history.replaceState({}, '', url.toString());
                    }

                    if (typeof showToast === 'function') showToast(`Kladd "${trimmedName}" lagret!`, "success");
                    this.loadDrafts();
                } catch (e) {
                    console.error("Save draft failed:", e);
                    if (typeof showToast === 'function') showToast("Kunne ikke lagre kladd.");
                }
            },
            defaultName,
            "Vennligst oppgi et navn på kladden.",
            "Lagre utkast",
            "Lagre"
        );
    }

    async loadDrafts() {
        if (!window.firebaseService || !window.firebaseService.isInitialized) return;
        try {
            const container = document.getElementById('drafts-list');
            if (!container) return;
            const snap = await this.safeGet(window.firebaseService.db.collection('newsletter_templates').orderBy('createdAt', 'desc'), 8000);
            
            let count = 0;
            container.innerHTML = '';

            const seenDraftsMap = new Map();
            const docsToDelete = [];

            snap.forEach(doc => {
                const data = doc.data();
                if (data.isDraft !== true) return; // Only load drafts!

                const key = (data.subject || data.name || '').trim().toLowerCase();

                if (key && seenDraftsMap.has(key)) {
                    // Duplicate draft found! Keep the newest one, queue older ones for cleanup
                    docsToDelete.push(doc.id);
                } else {
                    seenDraftsMap.set(key || doc.id, { id: doc.id, data });
                }
            });

            // Clean up accumulated duplicate draft documents from Firestore
            if (docsToDelete.length > 0) {
                console.log(`[HKM Autosave] Cleaning up ${docsToDelete.length} duplicate draft documents from Firestore...`);
                docsToDelete.forEach(id => {
                    window.firebaseService.db.collection('newsletter_templates').doc(id).delete().catch(err => console.warn('Failed to delete duplicate draft:', err));
                });
            }

            seenDraftsMap.forEach(({ id, data }) => {
                count++;
                
                const div = document.createElement('div');
                div.className = 'sidebar-item-card';
                const dateStr = data.updatedAt ? new Date(data.updatedAt).toLocaleDateString('no') : (data.createdAt ? new Date(data.createdAt).toLocaleDateString('no') : '');
                div.innerHTML = `
                    <div class="card-icon-container">
                        <span class="material-symbols-outlined">edit_document</span>
                    </div>
                    <div class="card-content">
                        <div class="card-title">${data.name}</div>
                        <div class="card-subtitle">${dateStr ? dateStr + ' · ' : ''}Emne: ${data.subject || 'Uten emne'}</div>
                    </div>
                    <div class="card-action">
                        <span class="material-symbols-outlined">edit</span>
                    </div>
                `;
                div.onclick = async () => {
                    const confirmed = await this.showConfirm('Last inn kladd', `Last inn kladden "${data.name}"? Dette vil erstatte innholdet i editoren.`, 'Last inn');
                    if (confirmed) {
                        this.currentDraftId = id;
                        this.currentDraftName = data.name;
                        this.hasCustomDraftName = true;
                        this.blocks = data.blocks;
                        const subjectInput = document.getElementById('newsletter-subject');
                        if (subjectInput) subjectInput.value = data.subject || '';
                        
                        // Update URL
                        const url = new URL(window.location.href);
                        url.searchParams.set('draftId', id);
                        window.history.replaceState({}, '', url.toString());

                        this.renderCanvas();
                        showToast(`Kladden "${data.name}" er lastet inn.`, "info");
                    }
                };
                container.appendChild(div);
            });
            
            if (count === 0) {
                container.innerHTML = `
                    <div class="sidebar-empty-state">
                        <span class="material-symbols-outlined empty-icon">edit_document</span>
                        <span>Ingen kladder lagret ennå</span>
                    </div>
                `;
            }
        } catch (e) {
            console.error("Load drafts failed:", e);
        }
    }

    switchSidebarView(viewName) {
        console.log('[HKM Navigation] Switching sidebar view to:', viewName);
        try {
            localStorage.setItem('hkm_builder_active_view', viewName);
            localStorage.setItem('hkm_builder_active_mode', 'builder');
        } catch(e) {}

        // Hide recipients drawer if open
        if (this.isRecipientsDrawerOpen) {
            this.isRecipientsDrawerOpen = false;
            document.body.classList.remove('builder-recipients-open');
            const drawer = document.getElementById('recipients-drawer');
            if (drawer) {
                drawer.style.setProperty('display', 'none', 'important');
                drawer.classList.remove('open');
            }
            const continueBtn = document.getElementById('continue-btn');
            if (continueBtn) {
                continueBtn.innerHTML = '<span class="btn-label" style="white-space: nowrap !important;">Velg mottakere</span><span class="material-symbols-outlined" style="margin-left: 6px;">arrow_forward</span>';
            }
        }
        const recipientsDrawer = document.getElementById('recipients-drawer');
        if (recipientsDrawer) recipientsDrawer.style.setProperty('display', 'none', 'important');

        // Restore canvas and inspector elements if they were hidden
        const canvasContainer = document.getElementById('canvas-container');
        const leftSidebar = document.getElementById('elements-panel') || document.querySelector('.builder-elements-panel');
        const rightInspector = document.querySelector('.builder-properties-panel');
        const centerToolbarCell = document.querySelector('.toolbar-center-cell');
        const saveDraftBtn = document.getElementById('save-draft-btn');
        const previewBtn = document.getElementById('preview-btn');
        const leftToolbarTitle = document.getElementById('sidebar-title');

        if (canvasContainer) canvasContainer.style.removeProperty('display');
        if (leftSidebar) leftSidebar.style.removeProperty('display');
        if (rightInspector) rightInspector.style.removeProperty('display');
        if (centerToolbarCell) centerToolbarCell.style.removeProperty('display');
        if (saveDraftBtn) saveDraftBtn.style.removeProperty('display');
        if (previewBtn) previewBtn.style.removeProperty('display');
        if (leftToolbarTitle) leftToolbarTitle.textContent = 'Elementer';

        // 1. Update active class on left nav links
        document.querySelectorAll('.sidebar-nav-menu .nav-item, .sidebar-bottom-settings .nav-item').forEach(item => {
            item.classList.remove('active');
        });
        const activeLink = document.querySelector(`.sidebar-nav-menu [data-view="${viewName}"], .sidebar-bottom-settings [data-view="${viewName}"]`);
        if (activeLink) activeLink.classList.add('active');

        // 2. Hide all subview panels and builder workspace
        const mainWorkspace = document.getElementById('builder-main-workspace');
        const overviewPanel = document.getElementById('view-overview-panel');
        const templatesPanel = document.getElementById('view-templates-panel');
        const subscribersPanel = document.getElementById('view-subscribers-panel');
        const analyticsPanel = document.getElementById('view-analytics-panel');
        const settingsPanel = document.getElementById('view-settings-panel');

        if (mainWorkspace) mainWorkspace.style.display = 'none';
        if (overviewPanel) overviewPanel.style.display = 'none';
        if (templatesPanel) templatesPanel.style.display = 'none';
        if (subscribersPanel) subscribersPanel.style.display = 'none';
        if (analyticsPanel) analyticsPanel.style.display = 'none';
        if (settingsPanel) settingsPanel.style.display = 'none';

        // 3. Show target view panel
        if (viewName === 'builder' || viewName === 'campaigns') {
            if (mainWorkspace) mainWorkspace.style.display = 'flex';
        } else if (viewName === 'overview') {
            if (overviewPanel) overviewPanel.style.display = 'block';
        } else if (viewName === 'templates') {
            if (templatesPanel) templatesPanel.style.display = 'block';
        } else if (viewName === 'subscribers') {
            if (subscribersPanel) subscribersPanel.style.display = 'block';
            this.loadSubscribers();
        } else if (viewName === 'analytics') {
            if (analyticsPanel) analyticsPanel.style.display = 'block';
        } else if (viewName === 'settings') {
            if (settingsPanel) settingsPanel.style.display = 'block';
        }
    }

    async loadSubscribers() {
        if (!window.firebaseService || !window.firebaseService.isInitialized) return;
        const tbody = document.getElementById('subscribers-table-body') || document.querySelector('#view-subscribers-panel tbody');
        if (!tbody) return;

        try {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 24px; color: #64748b;">
                        <span class="material-symbols-outlined rotating" style="font-size: 24px;">sync</span> Henter abonnenter fra databasen...
                    </td>
                </tr>
            `;

            const subscribersMap = new Map();
            const explicitlyUnsubscribedEmails = new Set();
            const isNewsletterUnsubscribed = (data, isSubscription = false) => {
                const newsletterStatus = String(data.newsletterStatus || '').trim().toLowerCase();
                const subscriptionStatus = String(data.status || '').trim().toLowerCase();
                const unsubscribed = data.newsletterUnsubscribed === true
                    || newsletterStatus === 'unsubscribed'
                    || newsletterStatus === 'avmeldt';

                if (!isSubscription) return unsubscribed;
                return unsubscribed
                    || data.isSubscribed === false
                    || ['unsubscribed', 'avmeldt', 'inactive', 'inaktiv'].includes(subscriptionStatus);
            };

            // 1. Primary CRM contact list: collection('contacts')
            try {
                const contactsSnap = await this.safeGet(window.firebaseService.db.collection('contacts'), 8000);
                contactsSnap.forEach(doc => {
                    const data = doc.data();
                    if (!data.email) return;
                    const email = data.email.toLowerCase().trim();
                    if (isNewsletterUnsubscribed(data)) {
                        explicitlyUnsubscribedEmails.add(email);
                        return;
                    }
                    const name = data.name || (data.firstName ? `${data.firstName} ${data.lastName || ''}`.trim() : email.split('@')[0]);
                    let dateStr = 'Kontakt';
                    if (data.createdAt) {
                        try {
                            const d = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
                            dateStr = d.toLocaleDateString('no');
                        } catch(e) {}
                    }
                    const tags = Array.isArray(data.tags) ? data.tags : (typeof data.tags === 'string' && data.tags ? data.tags.split(',').map(t => t.trim()).filter(Boolean) : (Array.isArray(data.labels) ? data.labels : []));
                    const segments = Array.isArray(data.segments) ? data.segments : (typeof data.segments === 'string' && data.segments ? data.segments.split(',').map(s => s.trim()).filter(Boolean) : (data.segment ? [data.segment] : ['Kontaktliste (CRM)']));
                    const phone = data.phone || data.mobile || data.tlf || '';

                    subscribersMap.set(email, {
                        id: doc.id,
                        collection: 'contacts',
                        name,
                        email,
                        phone,
                        source: 'Kontaktliste (CRM)',
                        status: data.status || 'Aktiv',
                        dateStr,
                        tags,
                        segments
                    });
                });
            } catch (err) {
                console.warn('[HKM Subscribers] Could not fetch contacts collection:', err);
            }

            // 2. Secondary subscriber list: newsletter_subscriptions
            try {
                const subSnap = await this.safeGet(window.firebaseService.db.collection('newsletter_subscriptions').orderBy('subscribedAt', 'desc'), 8000);
                subSnap.forEach(doc => {
                    const data = doc.data();
                    if (!data.email) return;
                    const email = data.email.toLowerCase().trim();
                    if (isNewsletterUnsubscribed(data, true)) {
                        explicitlyUnsubscribedEmails.add(email);
                        return;
                    }
                    if (!subscribersMap.has(email)) {
                        const name = data.name || data.displayName || email.split('@')[0];
                        let dateStr = 'Nylig';
                        if (data.subscribedAt) {
                            try {
                                const d = data.subscribedAt.toDate ? data.subscribedAt.toDate() : new Date(data.subscribedAt);
                                dateStr = d.toLocaleDateString('no');
                            } catch(e) {}
                        }
                        const tags = Array.isArray(data.tags) ? data.tags : (typeof data.tags === 'string' && data.tags ? data.tags.split(',').map(t => t.trim()).filter(Boolean) : []);
                        const segments = Array.isArray(data.segments) ? data.segments : (typeof data.segments === 'string' && data.segments ? data.segments.split(',').map(s => s.trim()).filter(Boolean) : [data.source === 'website_footer' ? 'Nettsted' : (data.source || 'Nyhetsbrev')]);
                        const phone = data.phone || data.mobile || '';

                        subscribersMap.set(email, {
                            id: doc.id,
                            collection: 'newsletter_subscriptions',
                            name,
                            email,
                            phone,
                            source: data.source === 'website_footer' ? 'Nettsted' : (data.source || 'Direkte påmeldt'),
                            status: data.status || 'Aktiv',
                            dateStr,
                            tags,
                            segments
                        });
                    }
                });
            } catch (err) {
                console.warn('[HKM Subscribers] Could not fetch newsletter_subscriptions:', err);
            }

            // 3. Tertiary list: registered users
            try {
                const usersSnap = await this.safeGet(window.firebaseService.db.collection('users'), 8000);
                usersSnap.forEach(doc => {
                    const data = doc.data();
                    if (!data.email) return;
                    const email = data.email.toLowerCase().trim();
                    if (isNewsletterUnsubscribed(data)) {
                        explicitlyUnsubscribedEmails.add(email);
                        return;
                    }
                    if (!subscribersMap.has(email)) {
                        const name = data.displayName || data.name || (data.firstName ? `${data.firstName} ${data.lastName || ''}`.trim() : email.split('@')[0]);
                        let dateStr = 'Medlem';
                        if (data.createdAt) {
                            try {
                                const d = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
                                dateStr = d.toLocaleDateString('no');
                            } catch(e) {}
                        }
                        const tags = Array.isArray(data.tags) ? data.tags : (typeof data.tags === 'string' && data.tags ? data.tags.split(',').map(t => t.trim()).filter(Boolean) : []);
                        const segments = Array.isArray(data.segments) ? data.segments : (typeof data.segments === 'string' && data.segments ? data.segments.split(',').map(s => s.trim()).filter(Boolean) : ['Brukerkonto']);
                        const phone = data.phone || data.phoneNumber || '';

                        subscribersMap.set(email, {
                            id: doc.id,
                            collection: 'users',
                            name,
                            email,
                            phone,
                            source: 'Brukerkonto',
                            status: 'Aktiv',
                            dateStr,
                            tags,
                            segments
                        });
                    }
                });
            } catch (err) {
                console.warn('[HKM Subscribers] Could not fetch users collection:', err);
            }

            // 3. Fallback default admins if database is empty
            if (!subscribersMap.has('thomas@hiskingdomministry.no') && !explicitlyUnsubscribedEmails.has('thomas@hiskingdomministry.no')) {
                subscribersMap.set('thomas@hiskingdomministry.no', {
                    id: 'admin_thomas',
                    name: 'Thomas Knutsen',
                    email: 'thomas@hiskingdomministry.no',
                    phone: '',
                    source: 'Administrator',
                    status: 'Aktiv',
                    dateStr: new Date().toLocaleDateString('no'),
                    tags: ['Leder', 'Admin'],
                    segments: ['Nyhetsbrev', 'Administrator']
                });
            }
            if (!subscribersMap.has('post@hiskingdomministry.no') && !explicitlyUnsubscribedEmails.has('post@hiskingdomministry.no')) {
                subscribersMap.set('post@hiskingdomministry.no', {
                    id: 'admin_hkm',
                    name: 'HKM Medlem',
                    email: 'post@hiskingdomministry.no',
                    phone: '',
                    source: 'Administrator',
                    status: 'Aktiv',
                    dateStr: new Date().toLocaleDateString('no'),
                    tags: ['Admin'],
                    segments: ['Nyhetsbrev', 'Administrator']
                });
            }

            const subscribersList = Array.from(subscribersMap.values());
            this.subscribersCount = subscribersList.length;

            const countBadge = document.getElementById('subscribers-list-total-count');
            if (countBadge) countBadge.textContent = subscribersList.length;

            const badgeCount = document.getElementById('subscribers-count-badge');
            if (badgeCount) badgeCount.textContent = `${subscribersList.length} kontakter`;

            const statSub = document.getElementById('stat-subscribers-val');
            if (statSub) statSub.textContent = subscribersList.length;

            // Populate unique tags dropdown
            const allUniqueTags = new Set();
            subscribersList.forEach(s => (s.tags || []).forEach(t => allUniqueTags.add(t)));
            const tagFilterSelect = document.getElementById('subscriber-tag-filter');
            if (tagFilterSelect) {
                const curVal = tagFilterSelect.value;
                tagFilterSelect.innerHTML = `<option value="">Alle etiketter / tags</option>`;
                Array.from(allUniqueTags).sort().forEach(t => {
                    const opt = document.createElement('option');
                    opt.value = t;
                    opt.textContent = t;
                    tagFilterSelect.appendChild(opt);
                });
                if (curVal) tagFilterSelect.value = curVal;
            }

            tbody.innerHTML = '';
            const searchInput = document.getElementById('subscriber-search-input');
            const segmentFilterSelect = document.getElementById('subscriber-segment-filter');

            const renderRows = () => {
                const q = (searchInput?.value || '').trim().toLowerCase();
                const seg = (segmentFilterSelect?.value || '').trim().toLowerCase();
                const tag = (tagFilterSelect?.value || '').trim().toLowerCase();

                const filtered = subscribersList.filter(s => {
                    const matchesQ = !q
                        || (s.name || '').toLowerCase().includes(q)
                        || (s.email || '').toLowerCase().includes(q)
                        || (s.phone || '').toLowerCase().includes(q)
                        || (s.tags || []).some(t => t.toLowerCase().includes(q))
                        || (s.segments || []).some(sg => sg.toLowerCase().includes(q));
                    const matchesSeg = !seg
                        || (s.source || '').toLowerCase().includes(seg)
                        || (s.segments || []).some(sg => sg.toLowerCase().includes(seg));
                    const matchesTag = !tag
                        || (s.tags || []).some(t => t.toLowerCase() === tag);

                    return matchesQ && matchesSeg && matchesTag;
                });

                tbody.innerHTML = '';
                if (filtered.length === 0) {
                    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 24px; color: #64748b;">Ingen abonnenter samsvarte med de valgte filtrene.</td></tr>`;
                    return;
                }

                filtered.forEach((sub, idx) => {
                    const tr = document.createElement('tr');
                    const tagsHtml = (sub.tags && sub.tags.length > 0)
                        ? sub.tags.map(t => `<span style="font-size: 11px; background: #e0e7ff; color: #3730a3; padding: 2px 8px; border-radius: 6px; font-weight: 600; margin-right: 4px; display: inline-block; margin-bottom: 2px;">${t}</span>`).join('')
                        : `<span style="font-size: 11px; color: #94a3b8; font-style: italic;">Ingen</span>`;
                    
                    const segmentsHtml = (sub.segments && sub.segments.length > 0)
                        ? sub.segments.map(sg => `<span style="font-size: 11px; background: #f1f5f9; color: #475569; padding: 2px 8px; border-radius: 6px; font-weight: 600; margin-right: 4px; display: inline-block; margin-bottom: 2px;">${sg}</span>`).join('')
                        : `<span style="font-size: 11px; background: #f1f5f9; color: #475569; padding: 2px 8px; border-radius: 6px; font-weight: 600;">${sub.source}</span>`;

                    tr.innerHTML = `
                        <td>
                            <strong>${sub.name}</strong>
                            ${sub.phone ? `<div style="font-size: 11px; color: #64748b;">📞 ${sub.phone}</div>` : ''}
                        </td>
                        <td>${sub.email}</td>
                        <td>${segmentsHtml}</td>
                        <td>${tagsHtml}</td>
                        <td><span class="${sub.status === 'Avmeldt' || sub.status === 'Inaktiv' ? 'badge-status-inactive' : 'badge-status-active'}">${sub.status || 'Aktiv'}</span></td>
                        <td>${sub.dateStr}</td>
                        <td>
                            <div style="display: flex; align-items: center; gap: 4px;">
                                <button type="button" class="btn-edit-sub" data-idx="${idx}" data-email="${sub.email}" title="Rediger abonnent" style="background: #eff6ff; border: 1px solid #bfdbfe; color: #2563eb; cursor: pointer; padding: 6px 10px; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; gap: 4px;">
                                    <span class="material-symbols-outlined" style="font-size: 18px; pointer-events: none;">edit</span>
                                </button>
                                <button type="button" class="btn-delete-sub" data-idx="${idx}" data-email="${sub.email}" data-id="${sub.id}" data-col="${sub.collection || ''}" title="Slett/avmeld abonnent" style="background: #fef2f2; border: 1px solid #fecaca; color: #ef4444; cursor: pointer; padding: 6px 10px; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; gap: 4px;">
                                    <span class="material-symbols-outlined" style="font-size: 18px; pointer-events: none;">delete</span>
                                </button>
                            </div>
                        </td>
                    `;
                    tbody.appendChild(tr);
                });

                // Bind edit buttons using robust delegated lookup
                tbody.querySelectorAll('.btn-edit-sub').forEach(btn => {
                    btn.onclick = (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const btnEl = e.currentTarget;
                        const idx = parseInt(btnEl.dataset.idx);
                        const email = btnEl.dataset.email;
                        const targetSub = filtered[idx] || subscribersList.find(s => (s.email || '').toLowerCase() === (email || '').toLowerCase());
                        if (targetSub) {
                            this.editSubscriberPrompt(targetSub);
                        } else {
                            console.warn("Edit subscriber target not found for email:", email);
                        }
                    };
                });

                // Bind delete buttons using robust delegated lookup
                tbody.querySelectorAll('.btn-delete-sub').forEach(btn => {
                    btn.onclick = async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const btnEl = e.currentTarget;
                        const idx = parseInt(btnEl.dataset.idx);
                        const email = btnEl.dataset.email;
                        const docId = btnEl.dataset.id;
                        const col = btnEl.dataset.col;
                        const targetSub = filtered[idx] || subscribersList.find(s => (s.email || '').toLowerCase() === (email || '').toLowerCase());
                        const displayEmail = targetSub ? targetSub.email : email;

                        const confirmDel = await this.showConfirm('Slett abonnent', `Er du sikker på at du vil fjerne/avmelde ${displayEmail} fra e-postlisten?`, 'Slett abonnent');
                        if (confirmDel) {
                            try {
                                if (col === 'contacts' && docId) {
                                    await window.firebaseService.db.collection('contacts').doc(docId).delete();
                                } else if (col === 'newsletter_subscriptions' && docId) {
                                    await window.firebaseService.db.collection('newsletter_subscriptions').doc(docId).delete();
                                }
                                const subDocs = await window.firebaseService.db.collection('newsletter_subscriptions').where('email', '==', displayEmail).get();
                                subDocs.forEach(d => d.ref.delete());

                                const contactDocs = await window.firebaseService.db.collection('contacts').where('email', '==', displayEmail).get();
                                contactDocs.forEach(d => d.ref.update({ newsletterUnsubscribed: true, newsletterStatus: 'unsubscribed', status: 'Inaktiv' }));

                                const userDocs = await window.firebaseService.db.collection('users').where('email', '==', displayEmail).get();
                                userDocs.forEach(d => d.ref.update({ newsletterUnsubscribed: true, newsletterStatus: 'unsubscribed' }));

                                if (typeof showToast === 'function') showToast(`Abonnent ${displayEmail} ble fjernet.`, "info");
                                this.loadSubscribers();
                            } catch(err) {
                                console.error('Delete sub failed:', err);
                                if (typeof showToast === 'function') showToast('Kunne ikke fjerne abonnent.', 'error');
                            }
                        }
                    };
                });
            };

            renderRows();

            if (searchInput) searchInput.oninput = () => renderRows();
            if (segmentFilterSelect) segmentFilterSelect.onchange = () => renderRows();
            if (tagFilterSelect) tagFilterSelect.onchange = () => renderRows();

        } catch (e) {
            console.error("Load subscribers failed:", e);
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 24px; color: #ef4444;">
                        Kunne ikke laste abonnenter.
                    </td>
                </tr>
            `;
        }
    }

    async editSubscriberPrompt(sub) {
        let modal = document.getElementById('hkm-edit-subscriber-modal');
        if (modal) modal.remove();

        modal = document.createElement('div');
        modal.id = 'hkm-edit-subscriber-modal';
        modal.className = 'profile-modal';
        modal.style.cssText = "display: flex !important; z-index: 999999 !important; position: fixed !important; inset: 0 !important; background: rgba(15,23,42,0.7) !important; align-items: center !important; justify-content: center !important; backdrop-filter: blur(8px) !important; font-family: 'Inter', sans-serif !important;";
        
        const currentSegments = sub.segments || [];
        const currentTagsStr = (sub.tags || []).join(', ');

        modal.innerHTML = `
            <div style="background: #ffffff; width: 90%; max-width: 520px; border-radius: 20px; padding: 28px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; max-height: 90vh; overflow-y: auto;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h3 style="margin: 0; font-size: 20px; font-weight: 800; color: #0f172a;">Rediger abonnent</h3>
                    <button type="button" id="close-edit-sub" style="background: none; border: none; font-size: 24px; color: #64748b; cursor: pointer;">&times;</button>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px;">
                    <div>
                        <label style="display: block; font-size: 13px; font-weight: 600; color: #475569; margin-bottom: 4px;">Fullt navn</label>
                        <input type="text" id="edit-sub-name" value="${sub.name || ''}" placeholder="Ola Nordmann" style="width: 100%; padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 10px; font-size: 14px; box-sizing: border-box; font-family: 'Inter', sans-serif;">
                    </div>
                    <div>
                        <label style="display: block; font-size: 13px; font-weight: 600; color: #475569; margin-bottom: 4px;">Telefonnummer</label>
                        <input type="tel" id="edit-sub-phone" value="${sub.phone || ''}" placeholder="+47 900 00 000" style="width: 100%; padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 10px; font-size: 14px; box-sizing: border-box; font-family: 'Inter', sans-serif;">
                    </div>
                </div>

                <div style="margin-bottom: 14px;">
                    <label style="display: block; font-size: 13px; font-weight: 600; color: #475569; margin-bottom: 4px;">E-postadresse *</label>
                    <input type="email" id="edit-sub-email" value="${sub.email || ''}" style="width: 100%; padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 10px; font-size: 14px; box-sizing: border-box; font-family: 'Inter', sans-serif;">
                </div>

                <div style="margin-bottom: 16px;">
                    <label style="display: block; font-size: 13px; font-weight: 600; color: #475569; margin-bottom: 6px;">Segmenter</label>
                    <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                        ${['Nyhetsbrev', 'Fastgiver', 'Frivillig', 'Leder', 'Ungdom', 'Bønneteam'].map(seg => `
                            <label style="display: inline-flex; align-items: center; gap: 6px; font-size: 13px; background: #f8fafc; border: 1px solid #e2e8f0; padding: 6px 12px; border-radius: 20px; cursor: pointer; user-select: none;">
                                <input type="checkbox" class="edit-sub-seg-cb" value="${seg}" ${currentSegments.includes(seg) ? 'checked' : ''}>
                                ${seg}
                            </label>
                        `).join('')}
                    </div>
                </div>

                <div style="margin-bottom: 20px;">
                    <label style="display: block; font-size: 13px; font-weight: 600; color: #475569; margin-bottom: 4px;">Etiketter / Tags (kommaseparert)</label>
                    <input type="text" id="edit-sub-tags" value="${currentTagsStr}" placeholder="F.eks. Lovsang, Bibelstudium, VIP" style="width: 100%; padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 10px; font-size: 14px; box-sizing: border-box; font-family: 'Inter', sans-serif;">
                    <div style="margin-top: 6px; display: flex; gap: 6px; flex-wrap: wrap; align-items: center;">
                        <span style="font-size: 11px; color: #64748b;">Hurtigvalg:</span>
                        ${['Lovsang', 'Fastgiver', 'Frivillig', 'Bibelstudium', 'VIP'].map(tag => `
                            <button type="button" class="btn-quick-tag" data-tag="${tag}" style="font-size: 11px; background: #e0e7ff; color: #3730a3; border: none; padding: 3px 8px; border-radius: 12px; cursor: pointer;">+ ${tag}</button>
                        `).join('')}
                    </div>
                </div>

                <div style="display: flex; justify-content: flex-end; gap: 10px; border-top: 1px solid #f1f5f9; padding-top: 16px;">
                    <button type="button" id="cancel-edit-sub" style="padding: 10px 20px; border: 1px solid #cbd5e1; background: #ffffff; color: #475569; border-radius: 12px; font-weight: 600; cursor: pointer;">Avbryt</button>
                    <button type="button" id="save-edit-sub" style="padding: 10px 22px; border: none; background: #1B4965; color: #ffffff; border-radius: 12px; font-weight: 700; cursor: pointer; box-shadow: 0 4px 12px rgba(27,73,101,0.25);">Lagre endringer</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        modal.querySelectorAll('.btn-quick-tag').forEach(btn => {
            btn.onclick = () => {
                const tag = btn.dataset.tag;
                const input = modal.querySelector('#edit-sub-tags');
                const curTags = input.value.split(',').map(t => t.trim()).filter(Boolean);
                if (!curTags.includes(tag)) {
                    curTags.push(tag);
                    input.value = curTags.join(', ');
                }
            };
        });

        modal.querySelector('#close-edit-sub').onclick = () => modal.remove();
        modal.querySelector('#cancel-edit-sub').onclick = () => modal.remove();

        modal.querySelector('#save-edit-sub').onclick = async () => {
            const newName = modal.querySelector('#edit-sub-name').value.trim();
            const newEmail = modal.querySelector('#edit-sub-email').value.trim().toLowerCase();
            const newPhone = modal.querySelector('#edit-sub-phone').value.trim();
            const newTags = modal.querySelector('#edit-sub-tags').value.split(',').map(t => t.trim()).filter(Boolean);
            const newSegments = Array.from(modal.querySelectorAll('.edit-sub-seg-cb:checked')).map(cb => cb.value);

            if (!newEmail || !newEmail.includes('@')) {
                if (typeof showToast === 'function') showToast("Vennligst oppgi en gyldig e-postadresse.", "warning");
                return;
            }
            modal.remove();

            try {
                const oldEmail = sub.email;
                const updatePayload = {
                    name: newName,
                    firstName: newName ? newName.split(' ')[0] : newEmail.split('@')[0],
                    lastName: newName && newName.split(' ').length > 1 ? newName.split(' ').slice(1).join(' ') : '',
                    email: newEmail,
                    phone: newPhone,
                    tags: newTags,
                    segments: newSegments
                };

                const contactDocs = await window.firebaseService.db.collection('contacts').where('email', '==', oldEmail).get();
                contactDocs.forEach(d => d.ref.update(updatePayload));

                const subDocs = await window.firebaseService.db.collection('newsletter_subscriptions').where('email', '==', oldEmail).get();
                subDocs.forEach(d => d.ref.update(updatePayload));

                const userDocs = await window.firebaseService.db.collection('users').where('email', '==', oldEmail).get();
                userDocs.forEach(d => d.ref.update(updatePayload));

                if (contactDocs.empty && subDocs.empty && userDocs.empty) {
                    await window.firebaseService.db.collection('contacts').add({
                        ...updatePayload,
                        createdAt: new Date().toISOString(),
                        source: 'Redigert i Nyhetsbrev',
                        status: 'Aktiv'
                    });
                }

                if (typeof showToast === 'function') showToast(`Abonnent ${newEmail} ble oppdatert!`, "success");
                this.loadSubscribers();
            } catch(e) {
                console.error("Edit sub failed:", e);
                if (typeof showToast === 'function') showToast("Kunne ikke oppdatere abonnent.", "error");
            }
        };
    }

    async addNewSubscriberPrompt() {
        let modal = document.getElementById('hkm-add-subscriber-modal');
        if (modal) modal.remove();

        modal = document.createElement('div');
        modal.id = 'hkm-add-subscriber-modal';
        modal.className = 'profile-modal';
        modal.style.cssText = "display: flex !important; z-index: 999999 !important; position: fixed !important; inset: 0 !important; background: rgba(15,23,42,0.7) !important; align-items: center !important; justify-content: center !important; backdrop-filter: blur(8px) !important; font-family: 'Inter', sans-serif !important;";
        modal.innerHTML = `
            <div style="background: #ffffff; width: 90%; max-width: 520px; border-radius: 20px; padding: 28px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; max-height: 90vh; overflow-y: auto;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h3 style="margin: 0; font-size: 20px; font-weight: 800; color: #0f172a;">Legg til ny abonnent</h3>
                    <button type="button" id="close-add-sub" style="background: none; border: none; font-size: 24px; color: #64748b; cursor: pointer;">&times;</button>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px;">
                    <div>
                        <label style="display: block; font-size: 13px; font-weight: 600; color: #475569; margin-bottom: 4px;">Fullt navn (valgfritt)</label>
                        <input type="text" id="add-sub-name" placeholder="F.eks. Ola Nordmann" style="width: 100%; padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 10px; font-size: 14px; box-sizing: border-box; font-family: 'Inter', sans-serif;">
                    </div>
                    <div>
                        <label style="display: block; font-size: 13px; font-weight: 600; color: #475569; margin-bottom: 4px;">Telefonnummer (valgfritt)</label>
                        <input type="tel" id="add-sub-phone" placeholder="+47 900 00 000" style="width: 100%; padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 10px; font-size: 14px; box-sizing: border-box; font-family: 'Inter', sans-serif;">
                    </div>
                </div>

                <div style="margin-bottom: 14px;">
                    <label style="display: block; font-size: 13px; font-weight: 600; color: #475569; margin-bottom: 4px;">E-postadresse *</label>
                    <input type="email" id="add-sub-email" placeholder="epost@domene.no" style="width: 100%; padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 10px; font-size: 14px; box-sizing: border-box; font-family: 'Inter', sans-serif;">
                </div>

                <div style="margin-bottom: 16px;">
                    <label style="display: block; font-size: 13px; font-weight: 600; color: #475569; margin-bottom: 6px;">Segmenter</label>
                    <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                        ${['Nyhetsbrev', 'Fastgiver', 'Frivillig', 'Leder', 'Ungdom', 'Bønneteam'].map(seg => `
                            <label style="display: inline-flex; align-items: center; gap: 6px; font-size: 13px; background: #f8fafc; border: 1px solid #e2e8f0; padding: 6px 12px; border-radius: 20px; cursor: pointer; user-select: none;">
                                <input type="checkbox" class="add-sub-seg-cb" value="${seg}" ${seg === 'Nyhetsbrev' ? 'checked' : ''}>
                                ${seg}
                            </label>
                        `).join('')}
                    </div>
                </div>

                <div style="margin-bottom: 20px;">
                    <label style="display: block; font-size: 13px; font-weight: 600; color: #475569; margin-bottom: 4px;">Etiketter / Tags (kommaseparert)</label>
                    <input type="text" id="add-sub-tags" placeholder="F.eks. Lovsang, Bibelstudium, VIP" style="width: 100%; padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 10px; font-size: 14px; box-sizing: border-box; font-family: 'Inter', sans-serif;">
                    <div style="margin-top: 6px; display: flex; gap: 6px; flex-wrap: wrap; align-items: center;">
                        <span style="font-size: 11px; color: #64748b;">Hurtigvalg:</span>
                        ${['Lovsang', 'Fastgiver', 'Frivillig', 'Bibelstudium', 'VIP'].map(tag => `
                            <button type="button" class="btn-add-quick-tag" data-tag="${tag}" style="font-size: 11px; background: #e0e7ff; color: #3730a3; border: none; padding: 3px 8px; border-radius: 12px; cursor: pointer;">+ ${tag}</button>
                        `).join('')}
                    </div>
                </div>

                <div style="display: flex; justify-content: flex-end; gap: 10px; border-top: 1px solid #f1f5f9; padding-top: 16px;">
                    <button type="button" id="cancel-add-sub" style="padding: 10px 20px; border: 1px solid #cbd5e1; background: #ffffff; color: #475569; border-radius: 12px; font-weight: 600; cursor: pointer;">Avbryt</button>
                    <button type="button" id="save-add-sub" style="padding: 10px 22px; border: none; background: #1B4965; color: #ffffff; border-radius: 12px; font-weight: 700; cursor: pointer; box-shadow: 0 4px 12px rgba(27,73,101,0.25);">Legg til abonnent</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        modal.querySelectorAll('.btn-add-quick-tag').forEach(btn => {
            btn.onclick = () => {
                const tag = btn.dataset.tag;
                const input = modal.querySelector('#add-sub-tags');
                const curTags = input.value.split(',').map(t => t.trim()).filter(Boolean);
                if (!curTags.includes(tag)) {
                    curTags.push(tag);
                    input.value = curTags.join(', ');
                }
            };
        });

        modal.querySelector('#close-add-sub').onclick = () => modal.remove();
        modal.querySelector('#cancel-add-sub').onclick = () => modal.remove();
        modal.querySelector('#save-add-sub').onclick = async () => {
            const name = modal.querySelector('#add-sub-name').value.trim();
            const email = modal.querySelector('#add-sub-email').value.trim().toLowerCase();
            const phone = modal.querySelector('#add-sub-phone').value.trim();
            const tags = modal.querySelector('#add-sub-tags').value.split(',').map(t => t.trim()).filter(Boolean);
            const segments = Array.from(modal.querySelectorAll('.add-sub-seg-cb:checked')).map(cb => cb.value);

            if (!email || !email.includes('@')) {
                if (typeof showToast === 'function') showToast("Vennligst oppgi en gyldig e-postadresse.", "warning");
                return;
            }
            modal.remove();

            try {
                const payload = {
                    name: name || email.split('@')[0],
                    firstName: name ? name.split(' ')[0] : email.split('@')[0],
                    lastName: name && name.split(' ').length > 1 ? name.split(' ').slice(1).join(' ') : '',
                    email: email,
                    phone: phone,
                    tags: tags,
                    segments: segments,
                    createdAt: new Date().toISOString(),
                    source: 'Manuelt lagt til i Nyhetsbrev',
                    status: 'Aktiv',
                    newsletterUnsubscribed: false,
                    newsletterStatus: 'subscribed'
                };

                await window.firebaseService.db.collection('contacts').add(payload);
                await window.firebaseService.db.collection('newsletter_subscriptions').add({
                    ...payload,
                    subscribedAt: new Date().toISOString(),
                    isSubscribed: true
                });

                if (typeof showToast === 'function') showToast(`Abonnent ${email} ble lagt til!`, "success");
                this.loadSubscribers();
            } catch(e) {
                console.error("Add subscriber failed:", e);
                if (typeof showToast === 'function') showToast("Kunne ikke legge til abonnent.", "error");
            }
        };
    }

    loadTemplate(templateKey) {
        const container = document.getElementById('blocks-container');
        if (!container) return;

        if (templateKey === 'event') {
            container.innerHTML = `
                <p><img src="https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=1200&q=80" alt="HKM Event" class="block-img" style="max-width:100%; height:auto; border-radius:12px; margin:16px 0; display:block;"></p>
                <h2 class="block-h2" style="font-family:'Inter', sans-serif; font-weight:700; color:#1e293b; margin-top:20px;">Velkommen til HKM Konsert & Samling!</h2>
                <p class="block-text" style="font-family:'Inter', sans-serif; font-size:15px; line-height:1.6; color:#334155;">Bli med på en uforglemmelig kveld med lovsang, fellesskap og inspirasjon. Meld deg på i dag!</p>
                <div style="text-align:center; margin:24px 0;">
                    <a href="https://www.hiskingdomministry.no" class="block-btn" contenteditable="false" style="display:inline-block; background-color:#16a34a; color:white; padding:12px 30px; border-radius:999px; text-decoration:none; font-weight:700;">Meld deg på her</a>
                </div>
            `;
        } else if (templateKey === 'prayer') {
            container.innerHTML = `
                <h2 class="block-h2" style="font-family:'Georgia', serif; font-weight:700; color:#1e293b; margin-top:20px;">Månedens Bønneemner & Oppdatering</h2>
                <p class="block-text" style="font-family:'Georgia', serif; font-size:16px; line-height:1.8; color:#334155;">Kjære venner, takk for at dere står sammen med oss i bønn. Her er våre tre viktigste fokusområder denne måneden...</p>
                <div style="text-align:center; margin:24px 0;">
                    <a href="https://www.hiskingdomministry.no" class="block-btn" contenteditable="false" style="display:inline-block; background-color:#2563eb; color:white; padding:12px 30px; border-radius:999px; text-decoration:none; font-weight:700;">Send ditt bønneemne</a>
                </div>
            `;
        } else {
            this.blocks = [];
            try {
                localStorage.removeItem('hkm_builder_autosave_html');
            } catch (e) {}
            this.renderCanvas();
        }

        this.syncUnifiedBlocks();
        this.switchSidebarView('builder');
        if (typeof showToast === 'function') {
            showToast('Malen ble lastet inn i byggeren.', 'info');
        }
    }

    toggleMode(mode) {
        this.currentMode = mode;
        const dashboard = document.getElementById('newsletter-dashboard-wrapper') || document.getElementById('newsletter-dashboard-layout');
        const builder = document.getElementById('newsletter-builder-layout');
        const mainHeader = document.getElementById('dashboard-main-header');
        
        if (mode === 'builder') {
            try { localStorage.setItem('hkm_builder_active_mode', 'builder'); } catch(e) {}
            if (dashboard) dashboard.style.display = 'none';
            if (builder) builder.style.display = 'block';
            if (mainHeader) mainHeader.style.setProperty('display', 'none', 'important');
            document.body.className = 'builder-active';

            // Maintain URL search parameters
            const url = new URL(window.location.href);
            if (this.currentDraftId) {
                url.searchParams.set('draftId', this.currentDraftId);
            } else {
                url.searchParams.set('draftId', 'new');
            }
            window.history.replaceState({}, '', url.toString());
        } else {
            try { localStorage.removeItem('hkm_builder_active_mode'); } catch(e) {}
            if (dashboard) dashboard.style.display = 'block';
            if (builder) builder.style.display = 'none';
            if (mainHeader) {
                mainHeader.style.removeProperty('display');
            }
            document.body.className = 'admin-body main-dashboard';

            // Clear active draft from URL search parameter
            const url = new URL(window.location.href);
            url.searchParams.delete('draftId');
            window.history.replaceState({}, '', url.toString());

            this.loadDashboardData();
        }
    }

    setupDashboardEvents() {
        setTimeout(() => {
            const openEmptyBtn = document.getElementById('open-empty-builder-btn');
            if (openEmptyBtn) {
                openEmptyBtn.onclick = () => {
                    this.blocks = [];
                    document.getElementById('newsletter-subject').value = '';
                    this.toggleMode('builder');
                    this.renderCanvas();
                };
            }
            
            const generateBtn = document.getElementById('generate-ai-ideas-btn');
            if (generateBtn) {
                generateBtn.onclick = () => this.generateAiSuggestions();
            }
        }, 500);
    }

    async loadDashboardData() {
        if (!window.firebaseService || !window.firebaseService.isInitialized) return;
        
        // Trigger HKM Studio Feed in background
        this.loadStudioFeed();

        try {
            const draftsContainer = document.getElementById('dashboard-drafts-list');
            const templatesContainer = document.getElementById('dashboard-templates-list');
            const draftsCountEl = document.getElementById('dashboard-drafts-count');
            
            if (!draftsContainer || !templatesContainer) return;

            // Default premium templates with descriptions and thumbnails (never empty)
            const DEFAULT_TEMPLATES = [
                {
                    id: 'tpl-ukeshilsen',
                    name: 'Ukeshilsen & Andakt',
                    description: 'En ren, minimalistisk mal med andakt, bibelvers, hilsen og kontaktinfo.',
                    thumbnail: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=200&q=80',
                    subject: 'Ukens oppmuntring fra His Kingdom Ministry',
                    blocks: [
                        { type: 'header', content: { text: 'Ukeshilsen' } },
                        { type: 'image', content: { url: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=800&q=80' } },
                        { type: 'text', content: { text: '<h3>Kjære brødre og søstre,</h3><p>Vi ønsker deg en velsignet uke! I dag vil vi dele noen ord til oppmuntring om Guds trofasthet og kjærlighet i hverdagen...</p>' } },
                        { type: 'button', content: { text: 'Les hele andakten', url: 'https://www.hiskingdomministry.no' } }
                    ]
                },
                {
                    id: 'tpl-nyhetsbrev',
                    name: 'Kunngjøringer & Nyheter',
                    description: 'Vårt standardoppsett for ukentlige nyheter, oppdateringer og arrangementskunngjøringer.',
                    thumbnail: 'https://images.unsplash.com/photo-1447069387593-a5de0862481e?auto=format&fit=crop&w=200&q=80',
                    subject: 'Siste nytt og viktige kunngjøringer fra HKM',
                    blocks: [
                        { type: 'header', content: { text: 'Nyheter & Kunngjøringer' } },
                        { type: 'text', content: { text: '<h2>Hva skjer i His Kingdom Ministry?</h2><p>Her er en oversikt over kommende møter, reiser og siste nytt fra arbeidet vårt.</p>' } },
                        { type: 'image', content: { url: 'https://images.unsplash.com/photo-1447069387593-a5de0862481e?auto=format&fit=crop&w=800&q=80' } },
                        { type: 'button', content: { text: 'Se arrangementskalender', url: 'https://www.hiskingdomministry.no/kalender' } }
                    ]
                },
                {
                    id: 'tpl-undervisning',
                    name: 'Bibelstudium & Leksjon',
                    description: 'Tilrettelagt mal for undervisning, leksjoner og studiemateriell med spørsmål og leselister.',
                    thumbnail: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=200&q=80',
                    subject: 'Bibelstudium og ukens leksjonsplan',
                    blocks: [
                        { type: 'header', content: { text: 'Bibeltimer & Undervisning' } },
                        { type: 'text', content: { text: '<h2>Ukens Bibelstudium</h2><p>Bli med oss å dykke dypere ned i Guds ord denne uken. Vi studerer skriftene sammen...</p>' } },
                        { type: 'button', content: { text: 'Åpne leksjonsplan', url: 'https://www.hiskingdomministry.no/undervisning' } }
                    ]
                }
            ];

            this.defaultTemplates = DEFAULT_TEMPLATES;
            this.draftsCache = {};
            this.templatesCache = {};

            const snap = await this.safeGet(window.firebaseService.db.collection('newsletter_templates').orderBy('createdAt', 'desc'), 8000);
            
            let draftsHtml = '';
            let templatesHtml = '';
            let draftsCount = 0;
            
            snap.forEach(doc => {
                const data = doc.data();
                const id = doc.id;
                const formattedDate = new Date(data.createdAt).toLocaleDateString();
                
                if (data.isDraft === true) {
                    draftsCount++;
                    this.draftsCache[id] = data;
                    draftsHtml += `
                        <div class="template-item card" style="display: flex !important; flex-direction: row !important; align-items: center !important; justify-content: flex-start !important; text-align: left !important; height: auto !important; min-height: unset !important; padding: 12px 16px !important; border: 1px solid #e2e8f0 !important; border-radius: 16px !important; cursor: pointer !important; transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1) !important; background: white !important; margin-bottom: 12px !important; box-sizing: border-box !important; box-shadow: none !important;" 
                            onclick="window.builder.loadDraftById('${id}')"
                            onmouseover="this.style.borderColor='var(--accent-color, #d17d39)'; this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 16px rgba(0,0,0,0.04)';" 
                            onmouseout="this.style.borderColor='#e2e8f0'; this.style.transform='none'; this.style.boxShadow='none';">
                            <div style="width: 44px; height: 44px; border-radius: 10px; background: #fff7ed; display: flex; align-items: center; justify-content: center; margin-right: 16px; flex-shrink: 0; color: #d17d39;">
                                <span class="material-symbols-outlined" style="font-size: 22px;">edit_document</span>
                            </div>
                            <div style="flex: 1; min-width: 0; text-align: left !important;">
                                <div style="font-weight: 700; font-size: 14.5px; color: #1e293b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-align: left !important;">${data.name}</div>
                                <div style="font-size: 12px; color: #64748b; margin-top: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 500; text-align: left !important;">
                                    ${formattedDate} · Emne: ${data.subject || 'Ingen'}
                                </div>
                            </div>
                            <span class="material-symbols-outlined" style="font-size: 20px; color: #d17d39; margin-left: 12px; flex-shrink: 0;">edit</span>
                        </div>
                    `;
                } else {
                    // Custom templates saved in Firestore
                    this.templatesCache[id] = data;
                    templatesHtml += `
                        <div class="template-item card" style="display: flex !important; flex-direction: row !important; align-items: center !important; justify-content: flex-start !important; text-align: left !important; height: auto !important; min-height: unset !important; padding: 12px 16px !important; border: 1px solid #e2e8f0 !important; border-radius: 16px !important; cursor: pointer !important; transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1) !important; background: white !important; margin-bottom: 12px !important; box-sizing: border-box !important; box-shadow: none !important;"
                            onclick="window.builder.loadCustomTemplateById('${id}')"
                            onmouseover="this.style.borderColor='#1B4965'; this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 16px rgba(0,0,0,0.04)';"
                            onmouseout="this.style.borderColor='#e2e8f0'; this.style.transform='none'; this.style.boxShadow='none';">
                            <div style="width: 44px; height: 44px; border-radius: 10px; background: #e0f2fe; display: flex; align-items: center; justify-content: center; margin-right: 16px; flex-shrink: 0; color: #1B4965;">
                                <span class="material-symbols-outlined" style="font-size: 22px;">auto_awesome_motion</span>
                            </div>
                            <div style="flex: 1; min-width: 0; text-align: left !important;">
                                <div style="font-weight: 700; font-size: 14.5px; color: #1e293b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-align: left !important;">${data.name}</div>
                                <div style="font-size: 12px; color: #64748b; margin-top: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 500; text-align: left !important;">Opprettet ${formattedDate}</div>
                            </div>
                            <span class="material-symbols-outlined" style="font-size: 20px; color: #1B4965; margin-left: 12px; flex-shrink: 0;">arrow_forward</span>
                        </div>
                    `;
                }
            });

            // Always prepopulate/merge with default templates
            let defaultTemplatesHtml = '';
            DEFAULT_TEMPLATES.forEach(tpl => {
                defaultTemplatesHtml += `
                    <div class="template-item card" style="display: flex !important; flex-direction: row !important; align-items: center !important; justify-content: flex-start !important; text-align: left !important; height: auto !important; min-height: unset !important; padding: 12px 16px !important; border: 1px solid #e2e8f0 !important; border-radius: 16px !important; cursor: pointer !important; transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1) !important; background: white !important; margin-bottom: 12px !important; box-sizing: border-box !important; box-shadow: none !important;"
                        onclick="window.builder.loadTemplateById('${tpl.id}')"
                        onmouseover="this.style.borderColor='#d17d39'; this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 16px rgba(0,0,0,0.04)';"
                        onmouseout="this.style.borderColor='#e2e8f0'; this.style.transform='none'; this.style.boxShadow='none';">
                        <img src="${tpl.thumbnail}" style="width: 72px; height: 54px; border-radius: 10px; object-fit: cover; margin-right: 16px; flex-shrink: 0; background: #f1f5f9;" alt="${tpl.name}">
                        <div style="flex: 1; min-width: 0; text-align: left !important;">
                            <div style="font-weight: 700; font-size: 14.5px; color: #1e293b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-align: left !important;">${tpl.name}</div>
                            <div style="font-size: 12px; color: #64748b; margin-top: 4px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.4; font-weight: 500; text-align: left !important;">${tpl.description}</div>
                        </div>
                        <span class="material-symbols-outlined" style="font-size: 20px; color: #d17d39; margin-left: 12px; flex-shrink: 0;">arrow_forward</span>
                    </div>
                `;
            });

            templatesHtml = defaultTemplatesHtml + templatesHtml;
            
            if (draftsCountEl) draftsCountEl.textContent = `${draftsCount} kladder`;
            
            // Render Drafts
            if (draftsHtml) {
                draftsContainer.innerHTML = draftsHtml;
            } else {
                draftsContainer.innerHTML = `
                    <div style="text-align: center; padding: 40px 16px; color: #94a3b8; border: 1px dashed #e2e8f0; border-radius: 16px; background: #fafafa; box-sizing: border-box; width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                        <span class="material-symbols-outlined" style="font-size: 40px; color: #d17d39; opacity: 0.7; margin-bottom: 8px; display: block;">edit_document</span>
                        <h5 style="margin: 0 0 4px 0; font-size: 14px; font-weight: 700; color: #475569;">Ingen kladder lagret</h5>
                        <p style="margin: 0; font-size: 12px; line-height: 1.4; color: #64748b; font-weight: 500; max-width: 250px; margin-left: auto; margin-right: auto;">Når du lagrer et utkast underveis i byggeren, vil det dukke opp her så du kan fortsette senere.</p>
                    </div>
                `;
            }
            
            templatesContainer.innerHTML = templatesHtml;
            
        } catch (e) {
            console.error("Load dashboard data failed:", e);
            const draftsContainer = document.getElementById('dashboard-drafts-list');
            const templatesContainer = document.getElementById('dashboard-templates-list');
            if (draftsContainer && draftsContainer.innerHTML.includes('Laster kladder...')) {
                draftsContainer.innerHTML = '<p class="empty-state-text" style="color: #94a3b8; font-size: 13px; text-align: center; padding: 32px 0; margin: 0;">Kunne ikke laste kladder.</p>';
            }
            if (templatesContainer && templatesContainer.innerHTML.includes('Laster maler...')) {
                templatesContainer.innerHTML = '<p class="empty-state-text" style="color: #94a3b8; font-size: 13px; text-align: center; padding: 32px 0; margin: 0;">Kunne ikke laste maler.</p>';
            }
        }
    }

    async loadStudioFeed() {
        if (!window.firebaseService || !window.firebaseService.isInitialized) return;
        const grid = document.getElementById('studio-content-feed-grid');
        if (!grid) return;

        // Bind tabs if not already bound
        const tabsContainer = document.querySelector('.studio-tabs-container');
        if (tabsContainer && !tabsContainer.dataset.bound) {
            tabsContainer.dataset.bound = 'true';
            tabsContainer.querySelectorAll('.studio-tab').forEach(tab => {
                tab.addEventListener('click', (e) => {
                    tabsContainer.querySelectorAll('.studio-tab').forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');
                    const filter = tab.dataset.filter;
                    this.renderStudioFeedGrid(filter);
                });
            });
        }

        try {
            // Load Wix Blog Items
            let blogItems = [];
            try {
                const blogData = await window.firebaseService.getPageContent('collection_blog');
                const rawItems = blogData?.items ? Object.values(blogData.items) : (Array.isArray(blogData) ? blogData : []);
                blogItems = rawItems.map((entry, idx) => ({
                    id: entry.id || `blog-${idx}`,
                    title: entry.title || 'Uten tittel (Blogg)',
                    date: entry.date || entry.createdAt || entry.publishDate || '',
                    type: 'blog',
                    author: entry.author || 'His Kingdom Ministry',
                    excerpt: entry.excerpt || (entry.text ? entry.text.replace(/<[^>]*>/g, '').substring(0, 120) + '...' : 'Klikk rediger for å skrive andakt eller nyhet.'),
                    coverImage: entry.coverImage || entry.imageUrl || 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=400&q=80',
                    originalIndex: idx
                }));
            } catch (e) {
                console.error("Studio Feed - Failed to load blog items:", e);
            }

            // Load Wix Teaching Items
            let teachingItems = [];
            try {
                const teachingData = await window.firebaseService.getPageContent('collection_teaching');
                const rawItems = teachingData?.items ? Object.values(teachingData.items) : (Array.isArray(teachingData) ? teachingData : []);
                teachingItems = rawItems.map((entry, idx) => ({
                    id: entry.id || `teaching-${idx}`,
                    title: entry.title || 'Uten tittel (Undervisning)',
                    date: entry.date || entry.createdAt || entry.publishDate || '',
                    type: 'teaching',
                    author: entry.author || 'His Kingdom Ministry',
                    excerpt: entry.excerpt || (entry.text ? entry.text.replace(/<[^>]*>/g, '').substring(0, 120) + '...' : 'Klikk rediger for å skrive bibelundervisning.'),
                    coverImage: entry.coverImage || entry.imageUrl || 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=400&q=80',
                    originalIndex: idx
                }));
            } catch (e) {
                console.error("Studio Feed - Failed to load teaching items:", e);
            }

            // Load sent newsletter campaigns
            let campaignItems = [];
            try {
                const campaignSnap = await this.safeGet(window.firebaseService.db.collection('newsletter_campaigns').orderBy('sentAt', 'desc').limit(15), 8000);
                campaignSnap.forEach(doc => {
                    const data = doc.data();
                    campaignItems.push({
                        id: doc.id,
                        title: data.subject || data.name || 'Sendt Nyhetsbrev',
                        date: data.sentAt || data.createdAt || '',
                        type: 'newsletter',
                        author: data.senderName || 'HKM Studio',
                        excerpt: `Sendt til ${data.recipientCount || 0} mottakere. Klikk for å se eller gjenbruke som mal.`,
                        coverImage: 'https://images.unsplash.com/photo-1557200134-90327ee9fafa?auto=format&fit=crop&w=400&q=80',
                        blocks: data.blocks || [],
                        subject: data.subject || ''
                    });
                });
            } catch (e) {
                console.error("Studio Feed - Failed to load campaigns:", e);
            }

            // Load saved newsletter drafts and clean up duplicates
            let draftItems = [];
            try {
                const draftSnap = await this.safeGet(window.firebaseService.db.collection('newsletter_templates').where('isDraft', '==', true), 8000);
                
                const draftsBySubjectMap = new Map();
                const duplicateDocIdsToDelete = [];

                draftSnap.forEach(doc => {
                    const data = doc.data();
                    const rawKey = (data.subject || data.name || '').trim().toLowerCase();
                    const key = rawKey || doc.id;
                    const timeStamp = data.updatedAt ? new Date(data.updatedAt).getTime() : (data.createdAt ? new Date(data.createdAt).getTime() : 0);

                    if (draftsBySubjectMap.has(key)) {
                        const existing = draftsBySubjectMap.get(key);
                        if (timeStamp > existing.timeStamp) {
                            duplicateDocIdsToDelete.push(existing.docId);
                            draftsBySubjectMap.set(key, { docId: doc.id, data, timeStamp });
                        } else {
                            duplicateDocIdsToDelete.push(doc.id);
                        }
                    } else {
                        draftsBySubjectMap.set(key, { docId: doc.id, data, timeStamp });
                    }
                });

                // Asynchronously delete duplicate draft documents from Firestore
                if (duplicateDocIdsToDelete.length > 0) {
                    console.log(`[HKM Studio] Cleaning up ${duplicateDocIdsToDelete.length} duplicate draft documents from Firestore...`);
                    duplicateDocIdsToDelete.forEach(id => {
                        window.firebaseService.db.collection('newsletter_templates').doc(id).delete().catch(err => console.warn("Failed deleting duplicate draft:", err));
                    });
                }

                draftsBySubjectMap.forEach(({ docId, data }) => {
                    draftItems.push({
                        id: docId,
                        title: data.name || 'Uten navn (Kladd)',
                        date: data.updatedAt || data.createdAt || '',
                        type: 'newsletter_draft',
                        author: 'HKM Studio',
                        excerpt: data.subject ? `Kladd · Emne: ${data.subject}` : 'Kladd under arbeid. Klikk for å fortsette redigeringen.',
                        coverImage: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=400&q=80',
                        blocks: data.blocks || [],
                        subject: data.subject || ''
                    });
                });
            } catch (e) {
                console.error("Studio Feed - Failed to load drafts:", e);
            }

            // Combine and sort
            this.studioFeedItems = [
                ...blogItems,
                ...teachingItems,
                ...campaignItems,
                ...draftItems
            ];

            this.studioFeedItems.sort((a, b) => {
                const dateA = a.date ? new Date(a.date) : new Date(0);
                const dateB = b.date ? new Date(b.date) : new Date(0);
                return dateB - dateA;
            });

            // Find current active filter and render
            const activeTab = tabsContainer?.querySelector('.studio-tab.active');
            const currentFilter = activeTab ? activeTab.dataset.filter : 'all';
            this.renderStudioFeedGrid(currentFilter);

        } catch (error) {
            console.error("Studio Feed - Load failed:", error);
            grid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #ef4444; font-weight: 600;">
                    <span class="material-symbols-outlined" style="font-size: 36px; display: block; margin-bottom: 8px;">error</span>
                    Kunne ikke laste innholdsstrømmen. Prøv å laste siden på nytt.
                </div>
            `;
        }
    }

    renderStudioFeedGrid(filter = 'all') {
        const grid = document.getElementById('studio-content-feed-grid');
        if (!grid) return;

        const items = this.studioFeedItems || [];
        
        // Filter items
        const filteredItems = items.filter(item => {
            if (filter === 'all') return true;
            if (filter === 'blog') return item.type === 'blog';
            if (filter === 'teaching') return item.type === 'teaching';
            if (filter === 'newsletter') return item.type === 'newsletter' || item.type === 'newsletter_draft';
            return true;
        });

        if (filteredItems.length === 0) {
            grid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 64px 24px; color: #94a3b8; border: 2px dashed #e2e8f0; border-radius: 20px; background: white; box-sizing: border-box; width: 100%;">
                    <span class="material-symbols-outlined" style="font-size: 48px; color: #cbd5e1; margin-bottom: 12px; display: block;">post_add</span>
                    <h4 style="margin: 0 0 6px 0; font-size: 16px; font-weight: 700; color: #475569;">Ingen innhold funnet</h4>
                    <p style="margin: 0; font-size: 13.5px; color: #64748b; font-weight: 500;">Det er ingen publiseringer i denne kategorien ennå.</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = '';
        filteredItems.forEach(item => {
            const card = document.createElement('div');
            card.className = `studio-feed-card ${item.type}-type`;
            
            // Format date beautifully
            let dateStr = 'Udatert';
            if (item.date) {
                try {
                    const date = new Date(item.date);
                    dateStr = date.toLocaleDateString('no-NO', { day: 'numeric', month: 'short', year: 'numeric' });
                } catch (e) {}
            }

            // Badges details
            let badgeText = 'Innhold';
            let badgeIcon = 'article';
            if (item.type === 'blog') {
                badgeText = 'Blogg';
                badgeIcon = 'edit_note';
            } else if (item.type === 'teaching') {
                badgeText = 'Undervisning';
                badgeIcon = 'school';
            } else if (item.type === 'newsletter') {
                badgeText = 'Nyhetsbrev';
                badgeIcon = 'campaign';
            } else if (item.type === 'newsletter_draft') {
                badgeText = 'Kladd';
                badgeIcon = 'edit_document';
            }

            card.innerHTML = `
                <div class="card-media">
                    <span class="card-type-badge" style="display: inline-flex !important; align-items: center !important; gap: 4px !important;">
                        <span class="material-symbols-outlined" style="font-size: 14px; display: inline-flex !important; align-items: center !important; justify-content: center !important; line-height: 1 !important; height: 14px; width: 14px; margin: 0 !important; padding: 0 !important;">${badgeIcon}</span>
                        <span style="display: inline-block !important; line-height: 1 !important; margin: 0 !important; padding: 0 !important;">${badgeText}</span>
                    </span>
                    <img src="${item.coverImage}" alt="${item.title}">
                </div>
                <div class="card-body">
                    <h4 class="card-title">${item.title}</h4>
                    <p class="card-excerpt">${item.excerpt}</p>
                    <div class="card-footer" style="display: flex !important; align-items: center !important; justify-content: space-between !important; padding-top: 14px !important; border-top: 1px solid #f1f5f9 !important; gap: 12px !important;">
                        <div style="display: flex !important; gap: 12px !important; align-items: center !important; min-width: 0 !important; flex: 1 !important;">
                            <div class="card-meta-item" style="white-space: nowrap !important; flex-shrink: 0 !important;">
                                <span class="material-symbols-outlined">calendar_today</span>
                                <span>${dateStr}</span>
                            </div>
                            <div class="card-meta-item" style="white-space: nowrap !important; min-width: 0 !important; max-width: 140px !important; overflow: hidden !important; text-overflow: ellipsis !important;">
                                <span class="material-symbols-outlined">person</span>
                                <span style="overflow: hidden !important; text-overflow: ellipsis !important;">${item.author}</span>
                            </div>
                        </div>
                        <div style="display: flex !important; gap: 8px !important; align-items: center !important; flex-shrink: 0 !important;">
                            <button class="card-delete-btn" id="delete-btn-${item.id}" title="Slett dette elementet">
                                <span class="material-symbols-outlined">delete</span>
                            </button>
                            <button class="card-edit-btn" id="edit-btn-${item.id}" title="Rediger dette elementet">
                                <span class="material-symbols-outlined">edit</span>
                            </button>
                        </div>
                    </div>
                </div>
            `;

            // Click listeners
            card.querySelector('.card-delete-btn').onclick = (e) => {
                e.stopPropagation();
                this.deleteStudioItem(item);
            };

            card.querySelector('.card-edit-btn').onclick = (e) => {
                e.stopPropagation();
                this.editStudioItem(item);
            };

            grid.appendChild(card);
        });
    }

    editStudioItem(item) {
        if (item.type === 'blog' || item.type === 'teaching') {
            const state = {
                collectionId: item.type,
                itemId: item.id,
                savedAt: Date.now()
            };
            sessionStorage.setItem('hkm_admin_open_editor_state', JSON.stringify(state));
            window.location.href = `/admin/index.html#${item.type}`;
        } else if (item.type === 'newsletter_draft') {
            this.loadDraftIntoBuilder(item.id, item.title, JSON.stringify(item.blocks), item.subject);
        } else if (item.type === 'newsletter') {
            this.loadTemplateIntoBuilder(item.id, item.title, JSON.stringify(item.blocks), item.subject);
        }
    }

    async deleteStudioItem(item) {
        const confirmed = await this.showConfirm(
            'Bekreft sletting',
            `Er du sikker på at du vil slette "${item.title}"? Dette kan ikke angres.`,
            'Slett'
        );
        if (!confirmed) return;

        // Ta en kopi av den nåværende listen i tilfelle sletting feiler
        const originalItems = [...(this.studioFeedItems || [])];

        // 1. OPTIMISTISK OPPDATERING: Fjern elementet fra minnet og oppdater grensesnittet umiddelbart!
        if (this.studioFeedItems) {
            this.studioFeedItems = this.studioFeedItems.filter(fi => fi.id !== item.id);
            const tabsContainer = document.querySelector('.studio-tabs-container');
            const activeTab = tabsContainer?.querySelector('.studio-tab.active');
            const currentFilter = activeTab ? activeTab.dataset.filter : 'all';
            this.renderStudioFeedGrid(currentFilter);
        }
        try {
            if (item.type === 'blog' || item.type === 'teaching') {
                const collectionId = `collection_${item.type}`;
                const currentData = await window.firebaseService.getPageContent(collectionId);
                const list = Array.isArray(currentData) ? currentData : (currentData && currentData.items ? currentData.items : []);
                
                // Finn samsvarende element basert på id, eller fallback til tittel og dato
                const matchIdx = list.findIndex(fi => {
                    if (item.id && fi.id === item.id) return true;
                    const cleanTitleMatch = fi.title === item.title;
                    const dateA = (fi.date || fi.createdAt || '').toString().substring(0, 10);
                    const dateB = (item.date || item.createdAt || '').toString().substring(0, 10);
                    return cleanTitleMatch && (dateA === dateB || !dateA || !dateB);
                });

                if (matchIdx >= 0) {
                    list.splice(matchIdx, 1);
                    await window.firebaseService.savePageContent(collectionId, { items: list });
                    showToast("Innholdet ble slettet!", "success");
                } else {
                    throw new Error("Kunne ikke finne elementet i samlingen.");
                }
            } else if (item.type === 'newsletter_draft') {
                await window.firebaseService.db.collection('newsletter_templates').doc(item.id).delete();
                showToast("Nyhetsbrev-kladden ble slettet!", "success");
            } else if (item.type === 'newsletter') {
                await window.firebaseService.db.collection('newsletter_campaigns').doc(item.id).delete();
                showToast("Nyhetsbrev-kampanjen ble slettet!", "success");
            }

            // Synkroniser stille i bakgrunnen for å sikre perfekt DB-samsvar
            this.loadStudioFeed().catch(err => console.error(err));

        } catch (error) {
            console.error("Studio Feed - Deletion failed:", error);
            showToast("Kunne ikke slette elementet: " + error.message, "error");
            
            // Rull tilbake hvis det feilet
            this.studioFeedItems = originalItems;
            const tabsContainer = document.querySelector('.studio-tabs-container');
            const activeTab = tabsContainer?.querySelector('.studio-tab.active');
            const currentFilter = activeTab ? activeTab.dataset.filter : 'all';
            this.renderStudioFeedGrid(currentFilter);
        }
    }

    createNewStudioItem(type) {
        if (type === 'newsletter') {
            this.blocks = [];
            document.getElementById('newsletter-subject').value = '';
            
            // Set URL parameter immediately so reload stays in builder
            const url = new URL(window.location.href);
            url.searchParams.set('draftId', 'new');
            window.history.pushState({}, '', url.toString());
            
            this.toggleMode('builder');
            this.renderCanvas();
        } else if (type === 'blog' || type === 'teaching') {
            sessionStorage.setItem('hkm_admin_create_item_state', type);
            window.location.href = `/admin/index.html#${type}`;
        }
    }

    async loadDraftById(id) {
        const draft = this.draftsCache && this.draftsCache[id];
        if (!draft) return;
        const confirmed = await this.showConfirm(
            'Last inn kladd',
            `Last inn kladden "${draft.name}"? Dette vil erstatte innholdet i editoren.`,
            'Last inn'
        );
        if (confirmed) {
            this.currentDraftId = id;
            this.currentDraftName = draft.name;
            this.blocks = JSON.parse(JSON.stringify(draft.blocks || []));
            document.getElementById('newsletter-subject').value = draft.subject || '';
            
            // Set URL parameter immediately so reload stays in builder
            const url = new URL(window.location.href);
            url.searchParams.set('draftId', id);
            window.history.pushState({}, '', url.toString());
            
            this.toggleMode('builder');
            this.renderCanvas();
            showToast(`Kladden "${draft.name}" er lastet inn.`, "info");
            
            // Set autosave status indicator to Saved
            const statusEl = document.getElementById('newsletter-autosave-status');
            const textEl = document.getElementById('newsletter-autosave-text');
            if (statusEl && textEl) {
                statusEl.style.opacity = '0.7';
                textEl.innerHTML = 'Lagret i skyen';
                const icon = statusEl.querySelector('.material-symbols-outlined');
                if (icon) {
                    icon.style.color = '#10b981';
                    icon.innerHTML = 'cloud_done';
                    icon.style.animation = 'none';
                }
            }
        }
    }

    triggerAutosave() {
        if (this.currentMode !== 'builder') return;
        if (!window.firebaseService || !window.firebaseService.isInitialized) return;
        
        // Add spin keyframe styling dynamically once
        if (!document.getElementById('hkm-spin-style')) {
            const style = document.createElement('style');
            style.id = 'hkm-spin-style';
            style.textContent = `
                @keyframes hkm-spin {
                    to { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
        }

        const statusEl = document.getElementById('newsletter-autosave-status');
        const textEl = document.getElementById('newsletter-autosave-text');
        if (statusEl && textEl) {
            statusEl.style.opacity = '1';
            textEl.innerHTML = 'Autolagrer...';
            const icon = statusEl.querySelector('.material-symbols-outlined');
            if (icon) {
                icon.style.color = '#3b82f6'; // Blue
                icon.innerHTML = 'sync';
                icon.style.animation = 'hkm-spin 1.5s linear infinite';
            }
        }

        if (this.autosaveTimer) clearTimeout(this.autosaveTimer);
        
        this.autosaveTimer = setTimeout(async () => {
            if (this._autosaveInFlight) return;
            this._autosaveInFlight = true;

            try {
                // Get clean state without edit/delete controls
                const container = document.getElementById('blocks-container');
                if (!container) return;
                const cleanHtml = this.getCleanCanvasHtml();
                const freshBlocks = [{
                    id: 'unified_content',
                    type: 'text',
                    content: { text: cleanHtml }
                }];
                const subject = document.getElementById('newsletter-subject')?.value || '';

                // Also store clean HTML locally
                try {
                    localStorage.setItem('hkm_builder_autosave_html', cleanHtml);
                    localStorage.setItem('hkm_builder_autosave_subject', subject);
                } catch(e) {}
                
                if (!this.currentDraftId) {
                    try {
                        this.currentDraftId = sessionStorage.getItem('hkm_active_draft_id') || null;
                    } catch(e) {}
                }

                let draftName = this.currentDraftName;
                if (!this.hasCustomDraftName || !draftName) {
                    draftName = subject ? `Kladd: ${subject}` : `Utkast (${new Date().toLocaleDateString('no')})`;
                    this.currentDraftName = draftName;
                }

                const headerNode = document.querySelector('.canvas-header');
                const data = {
                    name: draftName,
                    blocks: freshBlocks,
                    headerHtml: headerNode ? headerNode.outerHTML : '',
                    subject: subject,
                    updatedAt: new Date().toISOString(),
                    isDraft: true
                };

                // Ensure we ALWAYS reuse a single document ID for this newsletter session
                if (!this.currentDraftId) {
                    const docRef = window.firebaseService.db.collection('newsletter_templates').doc();
                    this.currentDraftId = docRef.id;
                    data.createdAt = new Date().toISOString();

                    try {
                        sessionStorage.setItem('hkm_active_draft_id', this.currentDraftId);
                    } catch(e) {}

                    const url = new URL(window.location.href);
                    url.searchParams.set('draftId', this.currentDraftId);
                    window.history.replaceState({}, '', url.toString());
                } else {
                    try {
                        sessionStorage.setItem('hkm_active_draft_id', this.currentDraftId);
                    } catch(e) {}
                }

                await window.firebaseService.db.collection('newsletter_templates').doc(this.currentDraftId).set(data, { merge: true });

                // Update UI status to Success
                if (statusEl && textEl) {
                    const now = new Date();
                    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    textEl.innerHTML = `Sist lagret kl. ${timeStr}`;
                    const icon = statusEl.querySelector('.material-symbols-outlined');
                    if (icon) {
                        icon.style.color = '#10b981'; // Green
                        icon.innerHTML = 'cloud_done';
                        icon.style.animation = 'none';
                    }
                    setTimeout(() => {
                        statusEl.style.opacity = '0.7';
                    }, 3000);
                }
            } catch (e) {
                console.error("Newsletter autosave failed:", e);
                if (statusEl && textEl) {
                    textEl.innerHTML = 'Lagring feilet';
                    const icon = statusEl.querySelector('.material-symbols-outlined');
                    if (icon) {
                        icon.style.color = '#ef4444'; // Red
                        icon.innerHTML = 'cloud_off';
                        icon.style.animation = 'none';
                    }
                }
            } finally {
                this._autosaveInFlight = false;
            }
        }, 2000);
    }

    async loadCustomTemplateById(id) {
        const tpl = this.templatesCache && this.templatesCache[id];
        if (!tpl) return;
        const confirmed = await this.showConfirm(
            'Last inn mal',
            `Last inn malen "${tpl.name}"? Dette vil erstatte innholdet i editoren.`,
            'Last inn'
        );
        if (confirmed) {
            this.blocks = JSON.parse(JSON.stringify(tpl.blocks || []));
            document.getElementById('newsletter-subject').value = tpl.subject || '';
            this.toggleMode('builder');
            this.renderCanvas();
            showToast(`Malen "${tpl.name}" er lastet inn.`, "info");
        }
    }

    async loadTemplateById(id) {
        const tpl = this.defaultTemplates && this.defaultTemplates.find(t => t.id === id);
        if (!tpl) return;
        const confirmed = await this.showConfirm(
            'Last inn mal',
            `Last inn malen "${tpl.name}"? Dette vil erstatte innholdet i editoren.`,
            'Last inn'
        );
        if (confirmed) {
            this.blocks = JSON.parse(JSON.stringify(tpl.blocks || []));
            document.getElementById('newsletter-subject').value = tpl.subject || '';
            this.toggleMode('builder');
            this.renderCanvas();
            showToast(`Malen "${tpl.name}" er lastet inn.`, "info");
        }
    }

    async loadDraftIntoBuilder(id, name, blocksStr, subject) {
        const confirmed = await this.showConfirm(
            'Last inn kladd',
            `Last inn kladden "${name}"? Dette vil erstatte innholdet i editoren.`,
            'Last inn'
        );
        if (confirmed) {
            try {
                this.currentDraftId = id;
                this.currentDraftName = name;
                this.blocks = JSON.parse(blocksStr);
                document.getElementById('newsletter-subject').value = subject || '';
                
                // Update URL parameter immediately so reload stays in builder
                const url = new URL(window.location.href);
                url.searchParams.set('draftId', id);
                window.history.pushState({}, '', url.toString());
                
                this.toggleMode('builder');
                this.renderCanvas();
                showToast(`Kladden "${name}" er lastet inn.`, "info");
                
                // Set autosave status indicator to Saved
                const statusEl = document.getElementById('newsletter-autosave-status');
                const textEl = document.getElementById('newsletter-autosave-text');
                if (statusEl && textEl) {
                    statusEl.style.opacity = '0.7';
                    textEl.innerHTML = 'Kladder synkronisert';
                    const icon = statusEl.querySelector('.material-symbols-outlined');
                    if (icon) {
                        icon.style.color = '#10b981'; // Green
                        icon.innerHTML = 'cloud_done';
                        icon.style.animation = 'none';
                    }
                }
            } catch (e) {
                console.error("Failed to parse blocks:", e);
                showToast("Kunne ikke laste inn kladd pga. formatfeil.", "error");
            }
        }
    }

    async loadTemplateIntoBuilder(id, name, blocksStr, subject) {
        const confirmed = await this.showConfirm(
            'Last inn mal',
            `Last inn malen "${name}"?`,
            'Last inn'
        );
        if (confirmed) {
            try {
                this.blocks = JSON.parse(blocksStr);
                document.getElementById('newsletter-subject').value = subject || '';
                
                // Update URL parameter immediately (new unsaved builder state)
                const url = new URL(window.location.href);
                url.searchParams.set('draftId', 'new');
                window.history.pushState({}, '', url.toString());
                
                this.toggleMode('builder');
                this.renderCanvas();
                showToast(`Malen "${name}" er lastet inn.`, "info");
            } catch (e) {
                console.error("Failed to parse blocks:", e);
                showToast("Kunne ikke laste inn mal pga. formatfeil.", "error");
            }
        }
    }

    async generateAiSuggestions() {
        const loadingContainer = document.getElementById('ai-loading-container');
        const loadingStatus = document.getElementById('ai-loading-status');
        const loadingProgress = document.getElementById('ai-loading-progress');
        const generateBtn = document.getElementById('generate-ai-ideas-btn');
        
        if (generateBtn) generateBtn.disabled = true;
        if (loadingContainer) loadingContainer.style.display = 'block';
        
        const updateStep = (progress, statusText) => {
            if (loadingProgress) loadingProgress.style.width = `${progress}%`;
            if (loadingStatus) loadingStatus.textContent = statusText;
        };

        try {
            updateStep(15, "Henter kristne nyheter og samfunnsaktualiteter...");
            await new Promise(r => setTimeout(r, 1200));
            
            updateStep(40, "Analyserer HKMs nettside og sosiale medier...");
            await new Promise(r => setTimeout(r, 1200));
            
            updateStep(70, "Genererer kreative vinklinger for nyhetsbrev, blogg og undervisning...");
            
            const today = new Date();
            const dateString = today.toLocaleDateString('no-NO', { year: 'numeric', month: 'long', day: 'numeric' });
            const prompt = `
                Du er en inspirerende og strategisk innholdsrådgiver og teolog for His Kingdom Ministry (HKM).
                Generer tre konkrete, dype og inspirerende ideer/utkast for den kommende uken basert på dagens dato (${dateString}):
                - Aktuelle kristne nyheter og happenings i Norge og globalt (f.eks. misjonsarbeid, kirkevekst, konferanser, kristent samfunnsansvar).
                - HKMs podcast-profil, bibelstudier og ønske om å fremme Guds rike.
                - Sesongen og tiden på året (f.eks. merkedager, høytider, sommer/høst/vinter/vår og kristent samfunnsliv basert på dagens dato).

                Du må levere nøyaktig 3 ideer:
                1. Ett Nyhetsbrev (newsletter) til abonnenter.
                2. Ett Blogginnlegg (blog) til nettsiden.
                3. Ett Undervisningstema (teaching) til bibelstudier/kurs.

                Krav til Nyhetsbrev (newsletter):
                - 'title': En fengende emnelinje.
                - 'rationale': Hvorfor dette er svært aktuelt akkurat nå (knyttet til nyheter/sosiale medier).
                - 'summary': En kort beskrivelse av e-postens formål.
                - 'blocks': Array av nyhetsbrev-blokker. Hver blokk må ha:
                  - 'type': Enten 'title', 'text', 'spacer', 'button' eller 'image'.
                  - 'content': { 'text': '...' } for title/text, { 'text': '...', 'url': '...' } for button, { 'url': '...' } for image. For 'image' kan du bruke: 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&w=800&q=80' eller tilsvarende bibelsk/kristent naturmotiv.

                Krav til Blogginnlegg (blog):
                - 'title': En engasjerende, nysgjerrigskapende tittel.
                - 'rationale': Begrunnelse knyttet til aktuelle samfunnstrender eller kristne nyheter.
                - 'verses': Relevante bibelvers (f.eks. "Matteus 28:19" eller "Romerne 12:2").
                - 'outline': En array med 3-4 kulepunkter som viser seksjonene i bloggen.
                - 'promptText': Tema-prompten vi skal sende til blogg-generatoren når brukeren klikker "Opprett".

                Krav til Undervisning (teaching):
                - 'title': En dyp, bibelsk og lærerik tittel.
                - 'rationale': Hvorfor dette temaet trengs akkurat nå.
                - 'verses': Viktige skriftsteder.
                - 'outline': Array med 3-4 kulepunkter/leksjoner.
                - 'promptText': Tema-prompten vi skal sende til undervisnings-generatoren.

                Format: Returner KUN gyldig JSON på dette formatet:
                {
                  "newsletter": { "title": "...", "rationale": "...", "summary": "...", "blocks": [ ... ] },
                  "blog": { "title": "...", "rationale": "...", "verses": "...", "outline": [ "..." ], "promptText": "..." },
                  "teaching": { "title": "...", "rationale": "...", "verses": "...", "outline": [ "..." ], "promptText": "..." }
                }
                Svar kun med rå JSON.
            `;

            updateStep(85, "Ferdigstiller og tilpasser forslag til HKMs profil...");
            const callable = firebase.functions().httpsCallable('aiProcess');
            const response = await callable({ prompt: prompt });
            
            let data = null;
            if (response.data && response.data.text) {
                const jsonText = response.data.text.trim();
                const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    data = JSON.parse(jsonMatch[0]);
                } else {
                    data = JSON.parse(jsonText);
                }
            } else {
                throw new Error("Kunne ikke hente tekst fra AI-tjenesten.");
            }

            if (data) {
                data.generatedAt = new Date().toISOString();
                await window.firebaseService.db.collection('ai_suggestions').doc('latest').set(data);
                this.renderAiSuggestions(data);
                showToast("Nye AI-ideer generert og lagret!", "success");
            } else {
                throw new Error("Feil i JSON-strukturen fra AI.");
            }

        } catch (error) {
            console.error("AI Generation failed:", error);
            showToast(`Generering feilet: ${error.message || error}`, "error");
        } finally {
            if (generateBtn) generateBtn.disabled = false;
            if (loadingContainer) loadingContainer.style.display = 'none';
        }
    }

    async loadAiSuggestions() {
        if (!window.firebaseService || !window.firebaseService.isInitialized) return;
        try {
            const doc = await this.safeGet(window.firebaseService.db.collection('ai_suggestions').doc('latest'), 8000);
            if (doc.exists) {
                this.renderAiSuggestions(doc.data());
            } else {
                document.getElementById('ai-suggestions-view-area').style.display = 'none';
            }
        } catch (error) {
            console.error("Load AI suggestions failed:", error);
        }
    }

    renderAiSuggestions(data) {
        const area = document.getElementById('ai-suggestions-view-area');
        const grid = document.getElementById('ai-suggestions-grid');
        const ts = document.getElementById('ai-suggestions-timestamp');
        
        if (!area || !grid) return;
        
        if (data.generatedAt) {
            const date = new Date(data.generatedAt);
            if (ts) ts.textContent = `Sist oppdatert: ${date.toLocaleDateString()} kl. ${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
        }
        
        grid.innerHTML = '';
        
        // 1. Newsletter Card
        const nl = data.newsletter;
        if (nl) {
            const card = document.createElement('div');
            card.className = 'ai-suggestion-card newsletter-type';
            if (nl.used) {
                card.style.opacity = '0.75';
            }
            const bulletItems = (nl.blocks || [])
                .filter(b => b.type === 'title' || b.type === 'text')
                .slice(0, 3)
                .map(b => `<li>${b.content?.text?.replace(/<[^>]*>/g, '').substring(0, 60)}...</li>`)
                .join('');

            const badgeHtml = nl.used 
                ? `<div style="display: flex; gap: 8px; align-items: center; margin-bottom: 12px;">
                     <span class="card-badge">Nyhetsbrev</span>
                     <span class="card-badge" style="background:#e2e8f0; color:#475569; border:1px solid #cbd5e1;">Brukt</span>
                   </div>`
                : `<span class="card-badge" style="margin-bottom: 12px;">Nyhetsbrev</span>`;

            const buttonHtml = `
                <div class="card-action-footer" style="display: flex; gap: 8px; width: 100%; box-sizing: border-box; margin-top: auto;">
                    <button class="btn" id="regenerate-newsletter-suggestion-btn" style="flex: 0 0 46px; width: 46px; height: 44px; padding: 0; background: #f1f5f9; border: 1px solid #cbd5e1; color: #475569; border-radius: 10px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s ease; box-shadow: none;" onmouseover="this.style.background='#e2e8f0';" onmouseout="this.style.background='#f1f5f9';" title="Generer nytt forslag">
                        <span class="material-symbols-outlined" style="font-size: 20px;">cached</span>
                    </button>
                    <button class="btn" id="use-newsletter-suggestion-btn" style="flex: 1; height: 44px; margin: 0;">
                        <span class="material-symbols-outlined">mark_email_unread</span> Opprett og åpne kladd
                    </button>
                </div>
            `;

            card.innerHTML = `
                <div class="card-header-gradient"></div>
                <div class="card-body-content">
                    ${badgeHtml}
                    <h5 class="suggestion-title">${nl.title || 'Uten tittel'}</h5>
                    <div class="suggestion-rationale">
                        <span class="material-symbols-outlined" style="font-size: 14px; vertical-align: middle; margin-right: 4px;">info</span>
                        ${nl.rationale || 'Aktuelt tema'}
                    </div>
                    <p class="suggestion-summary">${nl.summary || ''}</p>
                    <div class="section-divider"></div>
                    <div style="font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; margin-bottom: 8px;">Forslagsutkast</div>
                    <ul class="suggestion-bullets">
                        ${bulletItems || '<li>Innholder flere blokker</li>'}
                    </ul>
                    ${buttonHtml}
                </div>
            `;
            
            card.querySelector('#regenerate-newsletter-suggestion-btn').onclick = () => {
                this.regenerateSingleSuggestion('newsletter');
            };
            card.querySelector('#use-newsletter-suggestion-btn').onclick = () => {
                this.useNewsletterSuggestion(nl);
            };
            grid.appendChild(card);
        }
        
        // 2. Blog Card
        const bl = data.blog;
        if (bl) {
            const card = document.createElement('div');
            card.className = 'ai-suggestion-card blog-type';
            if (bl.used) {
                card.style.opacity = '0.75';
            }
            const outlineItems = (bl.outline || []).map(o => `<li>${o}</li>`).join('');

            const badgeHtml = bl.used 
                ? `<div style="display: flex; gap: 8px; align-items: center; margin-bottom: 12px;">
                     <span class="card-badge">Blogginnlegg</span>
                     <span class="card-badge" style="background:#e2e8f0; color:#475569; border:1px solid #cbd5e1;">Brukt</span>
                   </div>`
                : `<span class="card-badge" style="margin-bottom: 12px;">Blogginnlegg</span>`;

            const buttonHtml = `
                <div class="card-action-footer" style="display: flex; gap: 8px; width: 100%; box-sizing: border-box; margin-top: auto;">
                    <button class="btn" id="regenerate-blog-suggestion-btn" style="flex: 0 0 46px; width: 46px; height: 44px; padding: 0; background: #f1f5f9; border: 1px solid #cbd5e1; color: #475569; border-radius: 10px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s ease; box-shadow: none;" onmouseover="this.style.background='#e2e8f0';" onmouseout="this.style.background='#f1f5f9';" title="Generer nytt forslag">
                        <span class="material-symbols-outlined" style="font-size: 20px;">cached</span>
                    </button>
                    <button class="btn" id="use-blog-suggestion-btn" style="flex: 1; height: 44px; margin: 0;">
                        <span class="material-symbols-outlined">edit_document</span> Opprett bloggutkast
                    </button>
                </div>
            `;

            card.innerHTML = `
                <div class="card-header-gradient"></div>
                <div class="card-body-content">
                    ${badgeHtml}
                    <h5 class="suggestion-title">${bl.title || 'Uten tittel'}</h5>
                    <div class="suggestion-rationale">
                        <span class="material-symbols-outlined" style="font-size: 14px; vertical-align: middle; margin-right: 4px;">info</span>
                        ${bl.rationale || 'Aktuelt tema'}
                    </div>
                    <div style="font-size: 13px; font-weight: 600; color: #0d9488; margin-bottom: 12px; display: flex; align-items: center; gap: 4px;">
                        <span class="material-symbols-outlined" style="font-size: 16px;">book</span> ${bl.verses || ''}
                    </div>
                    <div class="section-divider"></div>
                    <div style="font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; margin-bottom: 8px;">Blogg-disposisjon</div>
                    <ul class="suggestion-bullets">
                        ${outlineItems}
                    </ul>
                    ${buttonHtml}
                </div>
            `;
            
            card.querySelector('#regenerate-blog-suggestion-btn').onclick = () => {
                this.regenerateSingleSuggestion('blog');
            };
            card.querySelector('#use-blog-suggestion-btn').onclick = () => {
                this.useBlogSuggestion(bl);
            };
            grid.appendChild(card);
        }
        
        // 3. Teaching Card
        const te = data.teaching;
        if (te) {
            const card = document.createElement('div');
            card.className = 'ai-suggestion-card teaching-type';
            if (te.used) {
                card.style.opacity = '0.75';
            }
            const outlineItems = (te.outline || []).map(o => `<li>${o}</li>`).join('');

            const badgeHtml = te.used 
                ? `<div style="display: flex; gap: 8px; align-items: center; margin-bottom: 12px;">
                     <span class="card-badge">Undervisning</span>
                     <span class="card-badge" style="background:#e2e8f0; color:#475569; border:1px solid #cbd5e1;">Brukt</span>
                   </div>`
                : `<span class="card-badge" style="margin-bottom: 12px;">Undervisning</span>`;

            const buttonHtml = `
                <div class="card-action-footer" style="display: flex; gap: 8px; width: 100%; box-sizing: border-box; margin-top: auto;">
                    <button class="btn" id="regenerate-teaching-suggestion-btn" style="flex: 0 0 46px; width: 46px; height: 44px; padding: 0; background: #f1f5f9; border: 1px solid #cbd5e1; color: #475569; border-radius: 10px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s ease; box-shadow: none;" onmouseover="this.style.background='#e2e8f0';" onmouseout="this.style.background='#f1f5f9';" title="Generer nytt forslag">
                        <span class="material-symbols-outlined" style="font-size: 20px;">cached</span>
                    </button>
                    <button class="btn" id="use-teaching-suggestion-btn" style="flex: 1; height: 44px; margin: 0;">
                        <span class="material-symbols-outlined">school</span> Opprett undervisning
                    </button>
                </div>
            `;

            card.innerHTML = `
                <div class="card-header-gradient"></div>
                <div class="card-body-content">
                    ${badgeHtml}
                    <h5 class="suggestion-title">${te.title || 'Uten tittel'}</h5>
                    <div class="suggestion-rationale">
                        <span class="material-symbols-outlined" style="font-size: 14px; vertical-align: middle; margin-right: 4px;">info</span>
                        ${te.rationale || 'Aktuelt tema'}
                    </div>
                    <div style="font-size: 13px; font-weight: 600; color: #0369a1; margin-bottom: 12px; display: flex; align-items: center; gap: 4px;">
                        <span class="material-symbols-outlined" style="font-size: 16px;">school</span> ${te.verses || ''}
                    </div>
                    <div class="section-divider"></div>
                    <div style="font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; margin-bottom: 8px;">Leksjonsplan</div>
                    <ul class="suggestion-bullets">
                        ${outlineItems}
                    </ul>
                    ${buttonHtml}
                </div>
            `;
            
            card.querySelector('#regenerate-teaching-suggestion-btn').onclick = () => {
                this.regenerateSingleSuggestion('teaching');
            };
            card.querySelector('#use-teaching-suggestion-btn').onclick = () => {
                this.useTeachingSuggestion(te);
            };
            grid.appendChild(card);
        }
        
        area.style.display = 'block';
    }

    async regenerateSingleSuggestion(type) {
        const cardSelectorMap = {
            newsletter: '.newsletter-type',
            blog: '.blog-type',
            teaching: '.teaching-type'
        };
        const cardEl = document.querySelector(`.ai-suggestion-card${cardSelectorMap[type]}`);
        if (!cardEl) return;

        const originalHtml = cardEl.innerHTML;
        cardEl.style.opacity = '1';
        cardEl.innerHTML = `
            <div class="card-header-gradient" style="background: linear-gradient(135deg, #1B4965 0%, #d17d39 100%) !important;"></div>
            <div class="card-body-content" style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 380px; text-align: center; box-sizing: border-box; padding: 32px 24px;">
                <div class="ai-pulse-loader" style="width: 48px; height: 48px; border-radius: 50%; background: #d17d39; box-shadow: 0 0 16px #d17d39; display: flex; align-items: center; justify-content: center; margin-bottom: 24px; animation: pulseGlow 1.5s infinite ease-in-out;">
                    <span class="material-symbols-outlined" style="color: white; font-size: 24px; animation: spin 2s infinite linear;">cached</span>
                </div>
                <h5 style="font-family: 'Inter', sans-serif; font-size: 18px; font-weight: 800; color: #1e293b; margin: 0 0 8px 0;">Genererer nytt forslag...</h5>
                <p style="font-size: 13px; color: #64748b; line-height: 1.5; margin: 0; font-weight: 500;">
                    Vår AI analyserer samfunnsaktualiteter og podcaster for å skreddersy en ny idé til deg.
                </p>
            </div>
        `;

        try {
            const promptTypeMap = {
                newsletter: {
                    label: 'Nyhetsbrev',
                    reqs: `Krav til Nyhetsbrev (newsletter):
                        - 'title': En fengende emnelinje.
                        - 'rationale': Hvorfor dette er svært aktuelt akkurat nå.
                        - 'summary': En kort beskrivelse av e-postens formål.
                        - 'blocks': Array av nyhetsbrev-blokker. Hver blokk må ha:
                          - 'type': Enten 'title', 'text', 'spacer', 'button' eller 'image'.
                          - 'content': { 'text': '...' } for title/text, { 'text': '...', 'url': '...' } for button, { 'url': '...' } for image. For 'image' kan du bruke en kristen naturmotiv-URL fra Unsplash.`,
                    format: `"newsletter": { "title": "...", "rationale": "...", "summary": "...", "blocks": [ ... ] }`
                },
                blog: {
                    label: 'Blogginnlegg',
                    reqs: `Krav til Blogginnlegg (blog):
                        - 'title': En engasjerende, nysgjerrigskapende tittel.
                        - 'rationale': Begrunnelse knyttet til aktuelle samfunnstrender.
                        - 'verses': Relevante bibelvers (f.eks. "Matteus 28:19").
                        - 'outline': En array med 3-4 kulepunkter som viser seksjonene.
                        - 'promptText': Tema-prompten vi skal sende til blogg-generatoren når brukeren klikker "Opprett".`,
                    format: `"blog": { "title": "...", "rationale": "...", "verses": "...", "outline": [ "..." ], "promptText": "..." }`
                },
                teaching: {
                    label: 'Undervisningstema',
                    reqs: `Krav til Undervisning (teaching):
                        - 'title': En dyp, bibelsk og lærerik tittel.
                        - 'rationale': Hvorfor dette temaet trengs akkurat nå.
                        - 'verses': Viktige skriftsteder.
                        - 'outline': Array med 3-4 kulepunkter/leksjoner.
                        - 'promptText': Tema-prompten vi skal sende til undervisnings-generatoren.`,
                    format: `"teaching": { "title": "...", "rationale": "...", "verses": "...", "outline": [ "..." ], "promptText": "..." }`
                }
            };

            const config = promptTypeMap[type];
            const today = new Date();
            const dateString = today.toLocaleDateString('no-NO', { year: 'numeric', month: 'long', day: 'numeric' });
            const prompt = `
                Du er en inspirerende og strategisk innholdsrådgiver og teolog for His Kingdom Ministry (HKM).
                Generer nøyaktig ETT nytt, unikt og inspirerende forslag til et ${config.label} for den kommende uken basert på dagens dato (${dateString}):
                - Aktuelle kristne nyheter og happenings i Norge og globalt.
                - HKMs podcast-profil, bibelstudier og ønske om å fremme Guds rike.
                - Sesongen og tiden på året (f.eks. merkedager, høytider, sommer/høst/vinter/vår og kristent samfunnsliv basert på dagens dato).

                ${config.reqs}

                Format: Returner KUN gyldig JSON på dette formatet:
                {
                  ${config.format}
                }
                Svar kun med rå JSON.
            `;

            const callable = firebase.functions().httpsCallable('aiProcess');
            const response = await callable({ prompt: prompt });
            
            let generatedItem = null;
            if (response.data && response.data.text) {
                const jsonText = response.data.text.trim();
                const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    generatedItem = JSON.parse(jsonMatch[0]);
                } else {
                    generatedItem = JSON.parse(jsonText);
                }
            } else {
                throw new Error("Kunne ikke hente tekst fra AI-tjenesten.");
            }

            if (generatedItem && generatedItem[type]) {
                const latestDoc = await this.safeGet(window.firebaseService.db.collection('ai_suggestions').doc('latest'), 10000);
                if (latestDoc.exists) {
                    const currentData = latestDoc.data();
                    currentData[type] = generatedItem[type];
                    currentData[type].used = false; // Fresh and not used
                    currentData.generatedAt = new Date().toISOString();
                    
                    await window.firebaseService.db.collection('ai_suggestions').doc('latest').set(currentData);
                    this.renderAiSuggestions(currentData);
                    showToast(`Nytt forslag for ${config.label} generert!`, "success");
                }
            } else {
                throw new Error("Feil i JSON-strukturen fra AI.");
            }
        } catch (error) {
            console.error("AI Single Generation failed:", error);
            showToast(`Generering feilet: ${error.message || error}`, "error");
            cardEl.innerHTML = originalHtml;
            cardEl.style.opacity = '0.75';
            const btn = cardEl.querySelector(`#regenerate-${type}-suggestion-btn`);
            if (btn) btn.onclick = () => this.regenerateSingleSuggestion(type);
        }
    }

    async useNewsletterSuggestion(nl) {
        if (!window.firebaseService || !window.firebaseService.isInitialized) return;
        try {
            await window.firebaseService.db.collection('ai_suggestions').doc('latest').update({
                'newsletter.used': true
            });
            
            const data = {
                name: `AI-forslag: ${nl.title}`,
                blocks: nl.blocks || [],
                subject: nl.title || '',
                createdAt: new Date().toISOString(),
                isDraft: true
            };
            const docRef = await window.firebaseService.db.collection('newsletter_templates').add(data);
            showToast("AI-kladd opprettet!", "success");
            
            this.blocks = data.blocks;
            document.getElementById('newsletter-subject').value = data.subject;
            this.toggleMode('builder');
            this.renderCanvas();
        } catch (e) {
            console.error("Save AI draft failed:", e);
            showToast("Kunne ikke opprette kladd.", "error");
        }
    }

    async useBlogSuggestion(bl) {
        if (window.firebaseService && window.firebaseService.isInitialized) {
            try {
                await window.firebaseService.db.collection('ai_suggestions').doc('latest').update({
                    'blog.used': true
                });
            } catch (err) {
                console.error("Failed to mark blog suggestion as used:", err);
            }
        }
        
        let title = bl.title || '';
        let promptText = bl.promptText || bl.title || '';
        
        // Clean up any mangled Ă characters to Å (f.eks. Ănd -> Ånd)
        title = title.replace(/Ă/g, 'Å').replace(/ă/g, 'å');
        promptText = promptText.replace(/Ă/g, 'Å').replace(/ă/g, 'å');

        const payload = {
            type: 'blog',
            title: title,
            prompt: promptText
        };
        sessionStorage.setItem('pendingAiDraft', JSON.stringify(payload));
        window.location.href = '/admin/index.html#blog';
    }
    
    async useTeachingSuggestion(te) {
        if (window.firebaseService && window.firebaseService.isInitialized) {
            try {
                await window.firebaseService.db.collection('ai_suggestions').doc('latest').update({
                    'teaching.used': true
                });
            } catch (err) {
                console.error("Failed to mark teaching suggestion as used:", err);
            }
        }
        
        let title = te.title || '';
        let promptText = te.promptText || te.title || '';
        
        // Clean up any mangled Ă characters to Å
        title = title.replace(/Ă/g, 'Å').replace(/ă/g, 'å');
        promptText = promptText.replace(/Ă/g, 'Å').replace(/ă/g, 'å');

        const payload = {
            type: 'teaching',
            title: title,
            prompt: promptText
        };
        sessionStorage.setItem('pendingAiDraft', JSON.stringify(payload));
        window.location.href = '/admin/index.html#teaching';
    }
}

if (!window.builder) {
    window.builder = new NewsletterBuilder();
}

// Recipient flow listeners
const initRecipientCalculations = () => {
    // Radio buttons calculation
    document.querySelectorAll('input[name="send-to"]').forEach(radio => {
        radio.addEventListener('change', () => {
            if (window.builder) window.builder.calculateEstimated();
        });
    });

    // Checkbox calculation
    const subCheck = document.getElementById('select-subscribers');
    if (subCheck) {
        subCheck.addEventListener('change', () => {
            if (window.builder) window.builder.calculateEstimated();
        });
    }

    // Manual contact toggle
    const addContactBtn = document.getElementById('add-manual-contacts-btn');
    if (addContactBtn) {
        addContactBtn.addEventListener('click', () => {
            if (window.builder) window.builder.toggleUserSelectionList();
        });
    }

    // Segment toggle
    const addSegmentBtn = document.getElementById('add-segment-btn');
    if (addSegmentBtn) {
        addSegmentBtn.addEventListener('click', () => {
            if (window.builder) window.builder.toggleSegmentsList();
        });
    }

    // Label toggle
    const addLabelBtn = document.getElementById('add-label-btn');
    if (addLabelBtn) {
        addLabelBtn.addEventListener('click', () => {
            if (window.builder) window.builder.toggleLabelsList();
        });
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initRecipientCalculations);
} else {
    initRecipientCalculations();
}
