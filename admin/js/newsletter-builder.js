/**
 * Nyhetsbrevbygger Logic - HKM Admin
 * Handles block-based email design, previews, and integrations.
 */

class NewsletterBuilder {
    constructor() {
        this.blocks = [];
        this.currentView = 'desktop';
        this.activeTab = 'add';
        this.activeTheme = 'default';
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
        this.activeTab = tab;
        document.querySelectorAll('.rail-item').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });
        document.querySelectorAll('.tab-pane').forEach(pane => {
            pane.classList.toggle('active', pane.id === `tab-${tab}`);
        });
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

        // Hide builder and show dashboard at the start
        this.toggleMode('dashboard');

        // Wait for Firebase to be ready with a small retry loop
        const waitForFirebase = setInterval(() => {
            if (window.firebaseService && window.firebaseService.isInitialized) {
                clearInterval(waitForFirebase);
                this.startAuthListener();
            }
        }, 100);

        this.setupEventListeners();
        this.setupRichTextToolbar();
        this.applyBackgrounds();
        this.renderCanvas();
    }

    isMobileViewport() {
        return window.matchMedia('(max-width: 991px)').matches;
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
        window.firebaseService.onAuthChange((user) => {
            if (!user) {
                window.location.href = '/admin/login.html';
            } else {
                console.log("[newsletter-builder] User is authenticated. Loading data...");
                this.loadTemplates();
                this.loadDrafts();
                this.loadAiSuggestions();
                this.loadDashboardData();
            }
        });
    }

    setupEventListeners() {
        this.setupToolsFab();

        // Sidebar Tab Switching
        document.querySelectorAll('.nav-icon-btn').forEach(btn => {
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

        // Block Tool Clicks
        document.querySelectorAll('.element-card').forEach(btn => {
            btn.addEventListener('mousedown', () => {
                this.saveSelection();
            });
            btn.addEventListener('click', () => {
                const type = btn.dataset.type;
                if (type === 'ai_text') {
                    this.showAiTextPrompt();
                } else if (type === 'ai_image') {
                    this.showAiImagePrompt();
                } else {
                    this.addBlock(type);
                }
                if (this.isMobileViewport()) {
                    this.closeToolsUi();
                }
            });
        });

        // Unified Editor Reactivity
        const container = document.getElementById('blocks-container');
        if (container) {
            container.addEventListener('input', () => this.syncUnifiedBlocks());
            container.addEventListener('blur', () => this.syncUnifiedBlocks());
            container.addEventListener('click', (e) => {
                const img = e.target.closest('img');
                if (img) {
                    e.preventDefault();
                    e.stopPropagation();
                    this.activateImageResizer(img);
                }
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
            innerBtn.addEventListener('click', () => {
                const color = prompt("Velg farge for indre bakgrunn (hex):", this.backgrounds.inner.color);
                if (color) {
                    this.updateBackground('inner', 'color', color);
                }
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
        document.getElementById('preview-btn').addEventListener('click', () => this.showPreview());
        
        const saveDraftBtn = document.getElementById('save-draft-btn');
        if (saveDraftBtn) {
            saveDraftBtn.addEventListener('click', () => this.saveDraft());
        }
        
        document.getElementById('save-template-btn').addEventListener('click', () => this.saveTemplate());
        document.getElementById('continue-btn').addEventListener('click', () => this.toggleRecipientsDrawer());
        document.getElementById('send-test-btn').addEventListener('click', () => this.sendTestEmail());

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

    exec(command, value = null) {
        this.restoreSelection();
        document.execCommand(command, false, value);
        this.syncUnifiedBlocks();
    }

    syncUnifiedBlocks() {
        const container = document.getElementById('blocks-container');
        if (!container) return;
        this.blocks = [{
            id: 'unified_content',
            type: 'text',
            content: { text: container.innerHTML }
        }];
        this.triggerAutosave();
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
                    const url = prompt('Skriv inn URL:', 'https://');
                    if (url) {
                        this.exec('createLink', url);
                    }
                    break;
                case 'textColor':
                    const textInput = toolbar.querySelector('[data-color-input="text"]');
                    if (textInput) textInput.click();
                    break;
                case 'highlightColor':
                    const hlInput = toolbar.querySelector('[data-color-input="highlight"]');
                    if (hlInput) hlInput.click();
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

    openImageInsertionFlow() {
        this.saveSelection();
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
                    showToast("Laster opp bilde...", "info");
                    const uploadPath = `newsletter/images/${Date.now()}_${file.name}`;
                    const url = await window.firebaseService.uploadImage(file, uploadPath);
                    const imgHtml = `<p><img src="${url}" alt="" class="block-img" style="max-width:100%; height:auto; border-radius:8px; margin: 16px 0; display: block;"></p>`;
                    this.exec('insertHTML', imgHtml);
                    showToast("Bilde lastet opp!", "success");
                } catch (err) {
                    console.error("Upload failed:", err);
                    showToast("Opplasting feilet.", "error");
                }
            });
            newFileInput.click();
    }

    addBlock(type) {
        let html = '';
        switch (type) {
            case 'header':
                html = `<h1>Overskrift her</h1>`;
                break;
            case 'text':
                html = `<p>Skriv din tekst her...</p>`;
                break;
            case 'divider':
                html = `<hr style="border: none; border-top: 2px solid #e2e8f0; margin: 24px 0;">`;
                break;
            case 'spacer':
                html = `<div style="height: 24px;"></div>`;
                break;
            case 'button':
                const label = prompt("Knapptekst:", "Les mer");
                if (!label) return;
                const url = prompt("Knapp-URL (f.eks. nettside eller e-post):", "https://");
                if (!url) return;
                html = `
                    <div style="text-align: center; margin: 24px 0;">
                        <a href="${url}" class="block-btn" style="display: inline-block; background-color: #d17d39; color: white; padding: 12px 30px; border-radius: 999px; text-decoration: none; font-weight: 700; font-family: 'Inter', sans-serif;">${label}</a>
                    </div><p><br></p>`;
                break;
            case 'columns':
                html = `
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin: 24px 0;">
                        <div style="min-height: 50px;">Venstre kolonne...</div>
                        <div style="min-height: 50px;">Høyre kolonne...</div>
                    </div><p><br></p>`;
                break;
            case 'image':
            case 'logo':
                this.openImageInsertionFlow();
                return;
            case 'social':
                html = `
                    <div style="text-align: center; margin: 24px 0; display: flex; justify-content: center; gap: 16px;">
                        <a href="https://facebook.com/hiskingdomministry" style="color: #1B4965; text-decoration: none; font-family: 'Inter', sans-serif; font-weight: 600;">Facebook</a>
                        <a href="https://instagram.com/hiskingdomministry" style="color: #1B4965; text-decoration: none; font-family: 'Inter', sans-serif; font-weight: 600;">Instagram</a>
                        <a href="https://youtube.com/@HisKingdomMinistry" style="color: #1B4965; text-decoration: none; font-family: 'Inter', sans-serif; font-weight: 600;">YouTube</a>
                    </div><p><br></p>`;
                break;
            default:
                return;
        }

        if (html) {
            this.exec('insertHTML', html);
        }
    }

    showConfirm(title, message, confirmText = 'Bekreft', cancelText = 'Avbryt') {
        return new Promise((resolve) => {
            const modal = document.getElementById('hkm-confirm-modal');
            if (!modal) {
                resolve(confirm(message));
                return;
            }

            const titleEl = document.getElementById('confirm-modal-title');
            const messageEl = document.getElementById('confirm-modal-message');
            const confirmBtn = document.getElementById('confirm-modal-confirm');
            const cancelBtn = document.getElementById('confirm-modal-cancel');
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
                modal.style.display = 'none';
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

            modal.style.display = 'flex';
        });
    }

    showPromptModal(label, placeholder, confirmCallback, defaultValue = '', warningMsg = "Vennligst oppgi en beskrivelse.") {
        const modal = document.getElementById('custom-prompt-modal');
        const labelEl = document.getElementById('custom-prompt-label');
        const inputEl = document.getElementById('custom-prompt-input');
        const cancelBtn = document.getElementById('custom-prompt-cancel');
        const closeBtn = document.getElementById('custom-prompt-close');
        const confirmBtn = document.getElementById('custom-prompt-confirm');

        if (!modal || !labelEl || !inputEl) return;

        labelEl.innerText = label;
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
                showToast(warningMsg, "warning");
            }
        });

        // Trigger on Cmd+Enter / Ctrl+Enter
        inputEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                newConfirmBtn.click();
            }
        });
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
                                            <a href="${block.content.url || '#'}" class="block-btn" style="display: inline-block; background-color: #d17d39; color: white; padding: 12px 30px; border-radius: 999px; text-decoration: none; font-weight: 700; font-family: 'Inter', sans-serif;">${block.content.text || 'Les mer'}</a>
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
        document.querySelectorAll('.device-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });

        const scaler = document.getElementById('canvas-scaler');
        scaler.classList.toggle('mobile', view === 'mobile');
    }

    toggleRecipientsDrawer() {
        this.isRecipientsDrawerOpen = !this.isRecipientsDrawerOpen;
        const drawer = document.getElementById('recipients-drawer');
        drawer.classList.toggle('open', this.isRecipientsDrawerOpen);
        document.body.classList.toggle('builder-recipients-open', this.isRecipientsDrawerOpen);

        if (this.isRecipientsDrawerOpen) {
            this.closeToolsUi();
        }

        const continueBtn = document.getElementById('continue-btn');
        if (this.isRecipientsDrawerOpen) {
            continueBtn.innerHTML = '<span class="btn-label">Tilbake til design</span><span class="material-symbols-outlined">arrow_back</span>';
            this.updateRecipientSummary();
        } else {
            continueBtn.innerHTML = '<span class="btn-label">Velg mottakere</span><span class="material-symbols-outlined">arrow_forward</span>';
        }
    }

    async updateRecipientSummary() {
        if (!window.firebaseService || !window.firebaseService.isInitialized) return;

        try {
            const usersSnap = await this.safeGet(window.firebaseService.db.collection('contacts'), 8000);
            const totalCount = usersSnap.size;

            // For now, assume a fraction are "subscribers" (simulate real data)
            const subCount = Math.floor(totalCount * 0.8);

            const allLabel = document.querySelector('input[value="all"]').nextElementSibling.querySelector('.opt-title');
            if (allLabel) allLabel.innerText = `Alle kontakter (${totalCount})`;

            const subCheckLabel = document.getElementById('select-subscribers');
            if (subCheckLabel) subCheckLabel.nextElementSibling.innerText = `Legg til abonnenter (${subCount})`;

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
        const subSelected = document.getElementById('select-subscribers').checked;

        let count = 0;
        if (sendToAll) {
            count = this.totalUsers || 0;
        } else {
            if (subSelected) {
                count += this.subscribersCount || 0;
            }
            // Add manual selections if "group" choice is active or if we're just summing up
            count += this.selectedUserEmails.size;

            // For segments and labels, since we don't know the exact overlap without a query, 
            // we'll show a "+" indicator or a rough estimate if we had the data.
            // For now, let's just count them as at least 1 per selection if they are the only things picked.
            if (this.selectedSegments.size > 0 || this.selectedLabels.size > 0) {
                // Mocking: Just showing that we are targeting them
            }
        }

        const estEl = document.getElementById('estimated-count');
        if (estEl) estEl.innerText = count;
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

        // Auto-initialize with a placeholder paragraph if empty
        if (this.blocks.length === 0) {
            container.innerHTML = '<p><br></p>';
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
                                <a href="${block.content.url}" class="block-btn" style="display: inline-block; background-color: #d17d39; color: white; padding: 12px 30px; border-radius: 999px; text-decoration: none; font-weight: 700; font-family: 'Inter', sans-serif;">${block.content.text}</a>
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
    }

    showPreview() {
        const modal = document.getElementById('preview-modal');
        const frame = document.getElementById('preview-frame');
        const canvas = document.getElementById('newsletter-canvas').cloneNode(true);
        canvas.querySelectorAll('.block-controls, input, .col-type-toggle').forEach(c => c.remove());
        canvas.querySelectorAll('[contenteditable]').forEach(e => e.removeAttribute('contenteditable'));
        canvas.querySelectorAll('.image-overlay').forEach(o => o.remove());

        frame.innerHTML = '';
        frame.appendChild(canvas);
        frame.className = `preview-frame ${this.currentView}`;
        modal.style.display = 'flex';
    }

    async saveTemplate() {
        if (!window.firebaseService || !window.firebaseService.isInitialized) return;
        const name = prompt("Navn på malen:", "Nyhetsbrev Mal");
        if (!name) return;
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
    }

    async loadTemplates() {
        if (!window.firebaseService || !window.firebaseService.isInitialized) return;
        try {
            const container = document.getElementById('templates-list');
            const snap = await this.safeGet(window.firebaseService.db.collection('newsletter_templates').orderBy('createdAt', 'desc'), 8000);
            
            let count = 0;
            container.innerHTML = '';
            snap.forEach(doc => {
                const data = doc.data();
                if (data.isDraft === true) return; // Skip drafts!
                count++;
                
                const div = document.createElement('div');
                div.className = 'template-item card';
                div.style.padding = '12px'; div.style.marginBottom = '8px'; div.style.cursor = 'pointer';
                div.innerHTML = `<div style="font-weight:600; font-size:14px;">${data.name}</div>
                                 <div style="font-size:11px; color:#64748b;">${new Date(data.createdAt).toLocaleDateString()}</div>`;
                div.onclick = async () => {
                    const confirmed = await this.showConfirm('Last inn mal', `Last inn "${data.name}"?`, 'Last inn');
                    if (confirmed) {
                        this.blocks = data.blocks;
                        document.getElementById('newsletter-subject').value = data.subject || '';
                        this.renderCanvas();
                    }
                };
                container.appendChild(div);
            });
            
            if (count === 0) {
                container.innerHTML = '<p class="empty-msg">Ingen maler lagret ennå</p>';
            }
        } catch (e) { }
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

                try {
                    // Get user ID Token for verification
                    const idToken = await user.getIdToken();

                    // Clone and clean the canvas
                    const canvasClone = document.getElementById('newsletter-canvas').cloneNode(true);
                    canvasClone.querySelectorAll('.block-controls, input, .col-type-toggle, .image-overlay, .add-block-btn-canvas, .block-actions-overlay').forEach(c => c.remove());
                    canvasClone.querySelectorAll('[contenteditable]').forEach(e => e.removeAttribute('contenteditable'));
                    
                    // Convert all relative image src paths to absolute production URLs for email client compatibility
                    canvasClone.querySelectorAll('img').forEach(img => {
                        const src = img.getAttribute('src') || '';
                        if (src && !src.startsWith('http://') && !src.startsWith('https://') && !src.startsWith('data:')) {
                            const cleanSrc = src.replace(/^\.\.\//, '').replace(/^\//, '');
                            img.src = `https://hkm-dusky.vercel.app/${cleanSrc}`;
                        }
                    });
                    
                    // Build style block for structural elements inside the email
                    const styleBlock = `
<style>
  .newsletter-canvas {
    max-width: 600px;
    margin: 0 auto;
    background: #ffffff;
    border: 1px solid #cbd5e1;
    overflow: hidden;
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
  }
  .canvas-header {
    padding: 48px 32px;
    text-align: center;
    border-bottom: 1px solid #f1f5f9;
  }
  .newsletter-logo {
    height: 56px;
    margin-bottom: 16px;
    display: inline-block;
  }
  .canvas-brand-name {
    margin: 0;
    font-size: 20px;
    font-weight: 800;
    color: #1e293b;
    letter-spacing: -0.02em;
    font-family: sans-serif;
  }
  .blocks-container {
    padding: 32px 40px;
    color: #1e293b;
    line-height: 1.6;
  }
  .canvas-footer {
    padding: 48px 32px;
    text-align: center;
    border-top: 1px solid #f1f5f9;
    background: #f8fafc;
    font-size: 13px;
    color: #64748b;
  }
  .canvas-footer p {
    margin: 0 0 8px 0;
  }
  .canvas-footer a {
    color: #d17d39;
    text-decoration: none;
    font-weight: 600;
  }
  
  /* --- Premium Mobile Email Client Responsive Guard --- */
  @media only screen and (max-width: 600px) {
    .newsletter-canvas {
      border: none !important;
      width: 100% !important;
      max-width: 100% !important;
    }
    .canvas-header {
      padding: 32px 16px !important;
    }
    .blocks-container {
      padding: 24px 16px !important; /* Reduces large horizontal padding from 40px to 16px */
    }
    .canvas-footer {
      padding: 32px 16px !important;
    }
    .email-preview-card {
      border-radius: 16px !important;
    }
    .email-preview-card-body {
      padding: 20px !important; /* Reduces large horizontal padding from 32px to 20px */
    }
    .email-headline {
      font-size: 24px !important; /* Fits much better on small screens */
    }
  }
</style>
                    `;

                    const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8">${styleBlock}</head><body>${canvasClone.outerHTML}</body></html>`;

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
                        
                        // Update checklist item in sidebar
                        const testIcon = document.getElementById('chk-test-icon');
                        const testText = document.getElementById('chk-test-text');
                        if (testIcon && testText) {
                            testIcon.innerText = 'check_circle';
                            testIcon.className = 'material-symbols-outlined chk-success';
                            testText.innerText = 'Test-epost bekreftet sendt';
                        }

                        // Vis en tydelig og lekker bekreftelsesmelding til brukeren i systemet
                        await this.showConfirm(
                            "E-post sendt!",
                            `Test-e-posten ble sendt til ${recipientEmail}. Sjekk innboksen din (og søppelpost hvis den ikke dukker opp).`,
                            "OK",
                            ""
                        );
                    } else {
                        throw new Error(result.error || 'Serveren returnerte en feil.');
                    }
                } catch (error) {
                    console.error('Feil ved sending av test-e-post:', error);
                    showToast('Kunne ikke sende: ' + error.message, 'error');
                } finally {
                    if (testBtn) {
                        testBtn.disabled = false;
                        testBtn.innerHTML = originalHtml;
                    }
                }
            },
            user.email,
            "Vennligst oppgi en e-postadresse."
        );
    }

    async sendCampaign() {
        const estCount = parseInt(document.getElementById('estimated-count').innerText) || 0;
        const subject = document.getElementById('newsletter-subject').value;
        this.syncUnifiedBlocks();

        const textContent = this.blocks[0]?.content?.text || '';
        const plainText = textContent.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, '').trim();
        if (this.blocks.length === 0 || !textContent || plainText === '' || textContent === '<p><br></p>' || textContent === '<p>Skriv nyhetsbrevet ditt her...</p>') {
            return showToast("Du kan ikke sende et tomt nyhetsbrev.", "error");
        }

        if (estCount === 0) { // Changed from `if (!mottakere || mottakere.length === 0)` to match original logic
            return showToast("Du må velge minst én mottaker eller målgruppe.", "warning");
        }

        const confirmSend = await this.showConfirm('Send kampanje', `Er du sikker på at du vil sende "${subject}" til ca. ${estCount} mottakere?`, 'Send');
        if (!confirmSend) return;

        try {
            // Show sending state
            const finalBtn = document.getElementById('final-send-btn');
            const originalText = finalBtn.innerHTML;
            finalBtn.disabled = true;
            finalBtn.innerHTML = '<span class="material-symbols-outlined rotating">sync</span> Sender...';

            // Simulate server delay and save record
            const campaignData = {
                subject: subject,
                recipientCount: estCount,
                blockCount: this.blocks.length,
                status: 'sent',
                sentAt: new Date().toISOString(),
                sentBy: window.firebaseService.auth.currentUser.email
            };

            await window.firebaseService.db.collection('newsletter_campaigns').add(campaignData);

            // Success feedback
            setTimeout(async () => {
                showToast(`Suksess! Nyhetsbrevet er nå lagt i kø for utsendelse til ${estCount} mottakere.`, "success");
                finalBtn.disabled = false;
                finalBtn.innerHTML = originalText;

                // Vis en lekker bekreftelse og spør om de vil gå tilbake til dashbordet
                const confirmedBack = await this.showConfirm(
                    'Nyhetsbrev sendt!',
                    `Suksess! Nyhetsbrevet er nå lagt i kø for utsendelse til ca. ${estCount} mottakere.\n\nVil du gå tilbake til dashbordet?`,
                    'Ja, gå til dashbordet',
                    'Nei, bli her'
                );
                if (confirmedBack) {
                    window.location.href = '/admin/index.html';
                }
            }, 1500);

        } catch (e) {
            console.error("Campaign send failed:", e);
            showToast("Det oppstod en feil under utsendelsen. Vennligst prøv igjen.");
            const finalBtn = document.getElementById('final-send-btn');
            finalBtn.disabled = false;
            finalBtn.innerHTML = 'Gå til utsendelse';
        }
    }

    activateImageResizer(img, onComplete, onOpenSettings, onDelete) {
        const existing = document.getElementById('hkm-img-resizer');
        if (existing) existing.remove();

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

        const settingsBtn = document.createElement('button');
        settingsBtn.type = 'button';
        settingsBtn.style.cssText = 'background:none; border:none; color:#fb923c; cursor:pointer; font-size:11px; font-weight:700; display:flex; align-items:center; gap:3px; padding:0; font-family:inherit;';
        settingsBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size:14px;">tune</span> Innstillinger';
        settingsBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
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
            } else {
                if (confirm('Slette dette bildet?')) img.remove();
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
                overlay.remove();
                window.removeEventListener('resize', scrollResizeHandler);
                window.removeEventListener('scroll', scrollResizeHandler, true);
                document.removeEventListener('mousedown', outsideClickListener);
            }
        };
        setTimeout(() => document.addEventListener('mousedown', outsideClickListener), 50);
    }

    showImageOptions(imgElement) {
        let overlay = document.getElementById('image-options-modal');
        if (!overlay) {
            overlay = document.createElement('div');
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
        }

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
                    <button id="img-opt-delete" class="prompt-btn secondary" style="background: #ef4444 !important; border: none; color: white !important; padding: 10px; border-radius: 12px; display: flex; align-items: center; justify-content: center; gap: 6px; cursor: pointer; font-weight: 600; font-size: 13px;">
                        <span class="material-symbols-outlined" style="font-size: 18px;">delete</span>
                        <span>Slett bilde</span>
                    </button>
                </div>
            </div>
        `;

        overlay.style.display = 'flex';

        const closeOverlay = () => {
            overlay.style.display = 'none';
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

    async saveDraft() {
        if (!window.firebaseService || !window.firebaseService.isInitialized) return;
        const name = prompt("Navn på kladden (f.eks: Ukeavis, Invitasjon...):", "Min Kladd");
        if (!name) return;
        try {
            this.syncUnifiedBlocks();
            const data = {
                name,
                blocks: this.blocks,
                subject: document.getElementById('newsletter-subject').value,
                createdAt: new Date().toISOString(),
                isDraft: true // Marked as draft!
            };
            await window.firebaseService.db.collection('newsletter_templates').add(data);
            showToast("Kladd lagret!", "success");
            this.loadDrafts();
        } catch (e) {
            console.error("Save draft failed:", e);
            showToast("Kunne ikke lagre kladd.");
        }
    }

    async loadDrafts() {
        if (!window.firebaseService || !window.firebaseService.isInitialized) return;
        try {
            const container = document.getElementById('drafts-list');
            if (!container) return;
            const snap = await this.safeGet(window.firebaseService.db.collection('newsletter_templates').orderBy('createdAt', 'desc'), 8000);
            
            let count = 0;
            container.innerHTML = '';
            snap.forEach(doc => {
                const data = doc.data();
                if (data.isDraft !== true) return; // Only load drafts!
                count++;
                
                const div = document.createElement('div');
                div.className = 'template-item card';
                div.style.padding = '12px'; div.style.marginBottom = '8px'; div.style.cursor = 'pointer';
                div.innerHTML = `<div style="display:flex; justify-content:space-between; align-items:center;">
                                     <div>
                                         <div style="font-weight:600; font-size:14px; color:#1e293b;">${data.name}</div>
                                         <div style="font-size:11px; color:#64748b;">${new Date(data.createdAt).toLocaleDateString()}</div>
                                     </div>
                                     <span class="material-symbols-outlined" style="font-size:18px; color:#94a3b8;">edit</span>
                                 </div>`;
                div.onclick = async () => {
                    const confirmed = await this.showConfirm('Last inn kladd', `Last inn kladden "${data.name}"? Dette vil overskrive gjeldende innhold.`, 'Last inn');
                    if (confirmed) {
                        this.blocks = data.blocks;
                        document.getElementById('newsletter-subject').value = data.subject || '';
                        this.renderCanvas();
                        showToast(`Kladden "${data.name}" er lastet inn.`, "info");
                    }
                };
                container.appendChild(div);
            });
            
        } catch (e) {
            console.error("Load drafts failed:", e);
        }
    }

    toggleMode(mode) {
        this.currentMode = mode;
        const dashboard = document.getElementById('newsletter-dashboard-wrapper') || document.getElementById('newsletter-dashboard-layout');
        const builder = document.getElementById('newsletter-builder-layout');
        const mainHeader = document.getElementById('dashboard-main-header');
        
        if (mode === 'builder') {
            if (dashboard) dashboard.style.display = 'none';
            if (builder) builder.style.display = 'block';
            if (mainHeader) mainHeader.style.setProperty('display', 'none', 'important');
            document.body.className = 'builder-active';
        } else {
            if (dashboard) dashboard.style.display = 'block';
            if (builder) builder.style.display = 'none';
            if (mainHeader) {
                mainHeader.style.removeProperty('display');
            }
            document.body.className = 'admin-body main-dashboard';
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

            // Load saved newsletter drafts
            let draftItems = [];
            try {
                const draftSnap = await this.safeGet(window.firebaseService.db.collection('newsletter_templates').where('isDraft', '==', true), 8000);
                draftSnap.forEach(doc => {
                    const data = doc.data();
                    draftItems.push({
                        id: doc.id,
                        title: data.name || 'Uten navn (Kladd)',
                        date: data.createdAt || '',
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
            try {
                // Get fresh state
                const container = document.getElementById('blocks-container');
                if (!container) return;
                const freshBlocks = [{
                    id: 'unified_content',
                    type: 'text',
                    content: { text: container.innerHTML }
                }];
                const subject = document.getElementById('newsletter-subject').value;
                
                const data = {
                    name: this.currentDraftName || `Autolagret kladd (${new Date().toLocaleDateString('no')})`,
                    blocks: freshBlocks,
                    subject: subject,
                    createdAt: new Date().toISOString(),
                    isDraft: true
                };

                if (this.currentDraftId) {
                    await window.firebaseService.db.collection('newsletter_templates').doc(this.currentDraftId).set(data, { merge: true });
                } else {
                    const docRef = await window.firebaseService.db.collection('newsletter_templates').add(data);
                    this.currentDraftId = docRef.id;
                    this.currentDraftName = data.name;
                }

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
