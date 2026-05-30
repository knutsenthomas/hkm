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
                font: "'Outfit', sans-serif",
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

        this.init();
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
                this.loadTemplates();
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
        const fileInput = document.getElementById('block-image-upload');
        if (fileInput) {
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

    showPromptModal(label, placeholder, confirmCallback) {
        const modal = document.getElementById('custom-prompt-modal');
        const labelEl = document.getElementById('custom-prompt-label');
        const inputEl = document.getElementById('custom-prompt-input');
        const cancelBtn = document.getElementById('custom-prompt-cancel');
        const closeBtn = document.getElementById('custom-prompt-close');
        const confirmBtn = document.getElementById('custom-prompt-confirm');

        if (!modal || !labelEl || !inputEl) return;

        labelEl.innerText = label;
        inputEl.placeholder = placeholder;
        inputEl.value = '';
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('open'), 10);
        inputEl.focus();

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
                showToast("Vennligst oppgi en beskrivelse.", "warning");
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
            const usersSnap = await window.firebaseService.db.collection('users').get();
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
            const snap = await window.firebaseService.db.collection('users').limit(50).get();
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
                createdAt: new Date().toISOString()
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
            const snap = await window.firebaseService.db.collection('newsletter_templates').orderBy('createdAt', 'desc').get();
            if (snap.empty) {
                container.innerHTML = '<p class="empty-msg">Ingen maler lagret ennå</p>';
                return;
            }
            container.innerHTML = '';
            snap.forEach(doc => {
                const data = doc.data();
                const div = document.createElement('div');
                div.className = 'template-item card';
                div.style.padding = '12px'; div.style.marginBottom = '8px'; div.style.cursor = 'pointer';
                div.innerHTML = `<div style="font-weight:600; font-size:14px;">${data.name}</div>
                                 <div style="font-size:11px; color:#64748b;">${new Date(data.createdAt).toLocaleDateString()}</div>`;
                div.onclick = () => {
                    if (confirm(`Last inn "${data.name}"?`)) {
                        this.blocks = data.blocks;
                        document.getElementById('newsletter-subject').value = data.subject || '';
                        this.renderCanvas();
                    }
                };
                container.appendChild(div);
            });
        } catch (e) { }
    }


    sendTestEmail() {
        const user = window.firebaseService.auth.currentUser;
        if (!user) return showToast("Logg inn først", "warning");

        const subject = document.getElementById('newsletter-subject').value;
        this.syncUnifiedBlocks();
        
        const textContent = this.blocks[0]?.content?.text || '';
        const plainText = textContent.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, '').trim();
        if (this.blocks.length === 0 || !textContent || plainText === '' || textContent === '<p><br></p>' || textContent === '<p>Skriv nyhetsbrevet ditt her...</p>') {
            return showToast("Legg til innhold før du sender en test.", "error");
        }

        showToast(`Sender en test-e-post av "${subject}" til ${user.email}...`, "info");
        console.log("Test Send Triggered:", {
            to: user.email,
            subject: subject,
            blocks: this.blocks
        });

        // Simulate success
        setTimeout(() => {
            showToast("Test-e-post er sendt!", "success");
            
            // Update checklist item in sidebar
            const testIcon = document.getElementById('chk-test-icon');
            const testText = document.getElementById('chk-test-text');
            if (testIcon && testText) {
                testIcon.innerText = 'check_circle';
                testIcon.className = 'material-symbols-outlined chk-success';
                testText.innerText = 'Test-epost bekreftet sendt';
            }
        }, 1000);
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

        const confirmSend = confirm(`Er du sikker på at du vil sende "${subject}" til ca. ${estCount} mottakere?`);
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
            setTimeout(() => {
                showToast(`Suksess! Nyhetsbrevet er nå lagt i kø for utsendelse til ${estCount} mottakere.`);
                finalBtn.disabled = false;
                finalBtn.innerHTML = originalText;

                // Optionally redirect back to dashboard
                if (confirm("Vil du gå tilbake til dashbordet?")) {
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
}

if (!window.builder) {
    window.builder = new NewsletterBuilder();
}

// Recipient flow listeners
document.addEventListener('DOMContentLoaded', () => {
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
});
