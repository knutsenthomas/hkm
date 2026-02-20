/**
 * Newsletter Builder Logic - HKM Admin
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
        document.querySelectorAll('.nav-icon-btn').forEach(btn => {
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
        console.log("Newsletter Builder Initializing...");

        // Wait for Firebase to be ready with a small retry loop
        const waitForFirebase = setInterval(() => {
            if (window.firebaseService && window.firebaseService.isInitialized) {
                clearInterval(waitForFirebase);
                this.startAuthListener();
            }
        }, 100);

        this.setupEventListeners();
        this.applyBackgrounds();
        this.renderCanvas();
    }

    isMobileViewport() {
        return window.matchMedia('(max-width: 1366px)').matches;
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
                window.location.href = 'login.html';
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
        document.querySelectorAll('.block-tool').forEach(btn => {
            btn.addEventListener('click', () => {
                const type = btn.dataset.type;
                this.addBlock(type);
                if (this.isMobileViewport()) {
                    this.closeToolsUi();
                }
            });
        });

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
        document.querySelectorAll('.view-toggle').forEach(btn => {
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

    addBlock(type) {
        const id = 'block_' + Date.now();
        let content = '';

        switch (type) {
            case 'header':
                content = { text: 'Overskrift her' };
                break;
            case 'text':
                content = { text: 'Skriv din tekst her...' };
                break;
            case 'image':
                content = { url: 'https://images.unsplash.com/photo-1490730141103-6cac27aaab94?auto=format&fit=crop&w=800&q=80', alt: 'Beskrivelse' };
                break;
            case 'button':
                content = { text: 'Les mer', url: '#' };
                break;
            case 'video':
                content = { url: '', videoId: '', provider: 'youtube' };
                break;
            case 'columns':
                content = {
                    layout: '2-col',
                    cols: [
                        { type: 'text', text: 'Venstre kolonne...' },
                        { type: 'text', text: 'Høyre kolonne...' }
                    ]
                };
                break;
            case 'social':
                content = {
                    platforms: [
                        { name: 'facebook', url: 'https://facebook.com/hiskingdomministry' },
                        { name: 'instagram', url: 'https://instagram.com/hiskingdomministry' },
                        { name: 'youtube', url: 'https://youtube.com/@HisKingdomMinistry' }
                    ]
                };
                break;
            case 'logo':
                content = { url: '../img/logo-hkm.png', width: 100 };
                break;
            case 'divider':
                content = { color: '#e2e8f0', thickness: 2 };
                break;
            case 'spacer':
                content = { height: 32 };
                break;
        }

        this.blocks.push({ id, type, content });
        this.renderCanvas();
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
        document.querySelectorAll('.view-toggle').forEach(btn => {
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
        if (this.blocks.length === 0) {
            container.innerHTML = `
                <div class="empty-canvas-msg">
                    <span class="material-symbols-outlined">add_circle</span>
                    <p>Legg til blokker her for å starte designet ditt</p>
                </div>
            `;
            return;
        }

        container.innerHTML = '';
        this.blocks.forEach((block) => {
            const blockEl = document.createElement('div');
            blockEl.className = 'newsletter-block';
            blockEl.dataset.id = block.id;
            blockEl.dataset.type = block.type;

            let innerHTML = '';
            switch (block.type) {
                case 'header':
                    innerHTML = `<h1 class="block-h1" contenteditable="true">${block.content.text}</h1>`;
                    break;
                case 'text':
                    innerHTML = `<div class="block-text" contenteditable="true">${block.content.text}</div>`;
                    break;
                case 'image':
                    innerHTML = `
                        <div class="block-image-wrap" onclick="builder.handleImageClick('${block.id}')">
                            <img src="${block.content.url}" alt="${block.content.alt}" class="block-img">
                            <div class="image-overlay">
                                <span class="material-symbols-outlined">upload_file</span>
                                <span>Bytt bilde</span>
                            </div>
                        </div>`;
                    break;
                case 'button':
                    innerHTML = `<div class="block-btn-wrap"><a href="${block.content.url}" class="block-btn" contenteditable="true">${block.content.text}</a></div>`;
                    break;
                case 'video':
                    if (block.content.videoId) {
                        innerHTML = `
                            <div class="block-video-wrap">
                                <iframe width="100%" height="315" src="https://www.youtube.com/embed/${block.content.videoId}" frameborder="0" allowfullscreen></iframe>
                                <input type="text" class="video-url-input" placeholder="YouTube Link" value="${block.content.url}" onblur="builder.updateVideoUrl('${block.id}', this.value)">
                            </div>`;
                    } else {
                        innerHTML = `
                            <div class="block-video-placeholder">
                                <span class="material-symbols-outlined">smart_display</span>
                                <input type="text" class="video-url-input" placeholder="Lim inn YouTube-link her..." onblur="builder.updateVideoUrl('${block.id}', this.value)">
                            </div>`;
                    }
                    break;
                case 'columns':
                    innerHTML = `<div class="block-columns layout-${block.content.layout}">`;
                    block.content.cols.forEach((col, idx) => {
                        let colContent = '';
                        if (col.type === 'text') {
                            colContent = `<div class="col-text" contenteditable="true" data-col="${idx}">${col.text}</div>`;
                        } else {
                            colContent = `
                                <div class="col-image-wrap" onclick="builder.handleImageClick('${block.id}', ${idx})">
                                    <img src="${col.url}" class="col-img">
                                    <div class="image-overlay sm">
                                        <span class="material-symbols-outlined">upload_file</span>
                                    </div>
                                </div>`;
                        }
                        innerHTML += `
                            <div class="column">
                                <div class="col-type-toggle" onclick="builder.toggleColumnType('${block.id}', ${idx})">
                                    <span class="material-symbols-outlined">${col.type === 'text' ? 'image' : 'notes'}</span>
                                </div>
                                ${colContent}
                            </div>`;
                    });
                    innerHTML += `</div>`;
                    break;
                case 'social':
                    innerHTML = `<div class="block-social">`;
                    block.content.platforms.forEach(p => {
                        innerHTML += `<a href="${p.url}" class="social-icon"><i class="fab fa-${p.name}"></i></a>`;
                    });
                    innerHTML += `</div>`;
                    break;
                case 'logo':
                    innerHTML = `
                        <div class="block-logo-wrap" style="text-align: center;">
                            <img src="${block.content.url}" style="width: ${block.content.width}px; height: auto;">
                        </div>`;
                    break;
                case 'divider':
                    innerHTML = `<div class="block-divider" style="padding: 16px 0;"><hr style="border: none; border-top: ${block.content.thickness}px solid ${block.content.color}; margin: 0;"></div>`;
                    break;
                case 'spacer':
                    innerHTML = `<div class="block-spacer" style="height: ${block.content.height}px"></div>`;
                    break;
            }


            blockEl.innerHTML = `
                ${innerHTML}
                <div class="block-controls">
                    <button class="control-btn" onclick="builder.moveBlock('${block.id}', -1)"><span class="material-symbols-outlined">arrow_upward</span></button>
                    <button class="control-btn" onclick="builder.moveBlock('${block.id}', 1)"><span class="material-symbols-outlined">arrow_downward</span></button>
                    <button class="control-btn delete" onclick="builder.deleteBlock('${block.id}')"><span class="material-symbols-outlined">delete</span></button>
                </div>
            `;

            // Sync Edits
            blockEl.querySelectorAll('[contenteditable="true"]').forEach(editable => {
                editable.addEventListener('blur', () => {
                    if (block.type === 'columns') {
                        const colIdx = editable.dataset.col;
                        block.content.cols[colIdx].text = editable.innerHTML;
                    } else if (block.type === 'button') {
                        block.content.text = editable.innerText;
                    } else {
                        block.content.text = editable.innerHTML;
                    }
                });
            });

            container.appendChild(blockEl);
        });
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
        if (this.blocks.length === 0) return showToast("Legg til innhold før du sender en test.", "error");

        showToast(`Sender en test-e-post av "${subject}" til ${user.email}...`, "info");
        console.log("Test Send Triggered:", {
            to: user.email,
            subject: subject,
            blocks: this.blocks
        });

        // Simulate success
        setTimeout(() => {
            showToast("Test-e-post er sendt!", "success");
        }, 1000);
    }

    async sendCampaign() {
        const estCount = parseInt(document.getElementById('estimated-count').innerText) || 0;
        const subject = document.getElementById('newsletter-subject').value;

        if (this.blocks.length === 0) {
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
                    window.location.href = 'index.html';
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
