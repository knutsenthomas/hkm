/**
 * HKM CRM & Kontaktmodul Logic
 * Handles contact management, search, and Wix-style UI interactions.
 */

class CRMManager {
    constructor() {
        this.contacts = [];
        this.filteredContacts = [];
        this.selectedContactIds = new Set();
        this.isModalOpen = false;
        this.editingContactId = null;
        this.openContactMenuId = null;
        this.searchQuery = '';
        this.statusFilter = 'ALL';
        this.viewPreset = localStorage.getItem('hkm_crm_view_preset') || 'standard';
        this.crmToolDialog = {
            open: false,
            mode: null,
            title: '',
            subtitle: '',
            selectedValue: null,
            confirmLabel: 'Bruk valg',
            confirmVariant: 'primary',
            options: [],
            actions: [],
            note: '',
            onConfirm: null,
            onCancel: null
        };
        this._crmToolDialogConfirmResolver = null;

        this.init();
    }

    async init() {
        console.log("CRM Manager Initializing...");

        // Setup UI Listeners
        this.setupEventListeners();

        // Wait for Firebase to be ready with a small retry loop
        const waitForFirebase = setInterval(() => {
            if (window.firebaseService && window.firebaseService.isInitialized) {
                clearInterval(waitForFirebase);
                this.startAuthListener();
            }
        }, 100);
    }

    startAuthListener() {
        window.firebaseService.onAuthChange((user) => {
            if (user) {
                this.loadContacts();
            } else {
                window.location.href = 'login.html';
            }
        });
    }

    setupEventListeners() {
        // Modal toggles
        const addBtn = document.getElementById('add-contact-btn');
        const closeBtns = document.querySelectorAll('.close-modal, .close-modal-btn');
        const modal = document.getElementById('contact-modal');

        if (addBtn) addBtn.onclick = () => this.openCreateContactModal();
        closeBtns.forEach(btn => btn.onclick = () => this.toggleModal(false));

        // Manage Segments
        const manageSegmentsBtn = document.getElementById('manage-segments-btn');
        if (manageSegmentsBtn) manageSegmentsBtn.onclick = () => this.openSegmentsModal();

        const closeSegmentsBtns = document.querySelectorAll('.close-segments-modal');
        closeSegmentsBtns.forEach(btn => btn.onclick = () => this.closeSegmentsModal());

        // Create Segment Buttons (inside modal)
        const createSegmentBtns = document.querySelectorAll('.btn-create-segment');
        createSegmentBtns.forEach(btn => btn.onclick = () => this.createSegment());

        // Search (there are two inputs with the same id in the page markup)
        document.querySelectorAll('#contact-search').forEach((searchInput) => {
            searchInput.oninput = (e) => this.handleSearch(e.target.value);
        });

        // Form submission
        const form = document.getElementById('contact-form');
        if (form) {
            form.onsubmit = (e) => this.saveContact(e);
        }

        // Bulk selection
        const selectAll = document.getElementById('select-all-contacts');
        if (selectAll) {
            selectAll.onchange = (e) => this.toggleSelectAll(e.target.checked);
        }

        const manageViewBtn = document.getElementById('manage-view-btn');
        if (manageViewBtn) manageViewBtn.onclick = () => this.openViewPresetDialog();

        const filterContactsBtn = document.getElementById('filter-contacts-btn');
        if (filterContactsBtn) filterContactsBtn.onclick = () => this.openFilterDialog();

        const importExportBtn = document.getElementById('import-export-btn');
        if (importExportBtn) importExportBtn.onclick = () => this.openImportExportDialog();

        const importFileInput = document.getElementById('contacts-import-file');
        if (importFileInput) {
            importFileInput.onchange = (e) => this.handleCsvImport(e);
        }

        const crmToolModal = document.getElementById('crm-tool-modal');
        if (crmToolModal) {
            crmToolModal.addEventListener('click', (e) => {
                if (e.target === crmToolModal) this.closeCrmToolDialog();
            });
        }
        document.querySelectorAll('[data-crm-tool-close]').forEach((btn) => {
            btn.addEventListener('click', () => this.closeCrmToolDialog());
        });
        const crmToolConfirm = document.getElementById('crm-tool-modal-confirm');
        if (crmToolConfirm) {
            crmToolConfirm.addEventListener('click', () => this.confirmCrmToolDialog());
        }

        document.addEventListener('click', (e) => {
            if (!this.openContactMenuId) return;
            const target = e.target;
            if (target && target.closest && target.closest('.contact-row-actions')) return;
            this.openContactMenuId = null;
            this.renderTable();
        });
    }

    async loadContacts() {
        const tableBody = document.getElementById('contacts-table-body');
        if (!tableBody) return;

        try {
            const snapshot = await window.firebaseService.db.collection('users').get();
            this.contacts = [];
            snapshot.forEach(doc => {
                this.contacts.push({ id: doc.id, ...doc.data() });
            });

            this.applyCurrentFiltersAndSearch();
            this.updateViewSelector();
        } catch (error) {
            console.error("Error loading contacts:", error);
            tableBody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:red;">Feil ved lasting av kontakter.</td></tr>`;
        }
    }

    updateViewSelector() {
        const selector = document.querySelector('.view-selector');
        if (selector && selector.options.length > 0) {
            const total = this.contacts.length;
            const filtered = this.filteredContacts.length;
            const suffix = this.statusFilter !== 'ALL' ? ` • ${this.statusFilter.replaceAll('_', ' ')}` : '';
            selector.options[0].textContent = filtered === total
                ? `Alle kontakter (${total})`
                : `Alle kontakter (${filtered}/${total})${suffix}`;
        }
    }

    renderTable() {
        const tableBody = document.getElementById('contacts-table-body');
        if (!tableBody) return;

        if (this.filteredContacts.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 40px;">Ingen kontakter funnet.</td></tr>`;
            this.applyViewPreset();
            return;
        }

        tableBody.innerHTML = this.filteredContacts.map(contact => {
            let firstName = contact.firstName || '';
            let lastName = contact.lastName || '';
            let fullName = `${firstName} ${lastName}`.trim();

            if (!fullName && contact.displayName) {
                fullName = contact.displayName;
                const parts = fullName.split(' ');
                firstName = parts[0] || '';
                lastName = parts.slice(1).join(' ') || '';
            }

            if (!fullName) {
                fullName = contact.email ? contact.email.split('@')[0] : 'Ukjent Navn';
                firstName = fullName;
            }

            const initials = firstName ? (firstName[0] + (lastName ? lastName[0] : '')).toUpperCase() : fullName[0].toUpperCase();
            const statusClass = this.getStatusClass(contact.status);
            const formatDate = (dateVal) => {
                if (!dateVal) return '-';
                // Handle Firestore Timestamps
                if (dateVal.toDate && typeof dateVal.toDate === 'function') {
                    return dateVal.toDate().toLocaleDateString('no-NO');
                }
                const d = new Date(dateVal);
                return isNaN(d) ? '-' : d.toLocaleDateString('no-NO');
            };

            const lastActivity = formatDate(contact.lastLogin || contact.updatedAt || contact.createdAt);
            const isMenuOpen = this.openContactMenuId === contact.id;
            const safeId = this.escapeHtml(contact.id);
            const safeInitials = this.escapeHtml(initials);
            const safeName = this.escapeHtml(fullName);
            const safeRole = this.escapeHtml(this._roleLabel(contact.role));
            const safeEmail = this.escapeHtml(contact.email || '-');
            const safePhone = this.escapeHtml(contact.phone || '-');
            const safeStatus = this.escapeHtml(contact.status || 'INGEN');
            const safeLastActivity = this.escapeHtml(lastActivity);

            return `
                <tr data-id="${safeId}">
                    <td class="col-check">
                        <input type="checkbox" class="contact-checkbox" data-id="${safeId}" ${this.selectedContactIds.has(contact.id) ? 'checked' : ''}>
                    </td>
                    <td>
                        <div class="contact-user">
                            <div class="avatar">${safeInitials}</div>
                            <div class="name-wrap">
                                <span class="name">${safeName}</span>
                                <span class="sub">${safeRole}</span>
                            </div>
                        </div>
                    </td>
                    <td>${safeEmail}</td>
                    <td>${safePhone}</td>
                    <td><span class="badge ${statusClass}">${safeStatus}</span></td>
                    <td>
                        <div class="labels-list">
                            ${this.renderLabels(contact.labels || [contact.label || 'Ny'])}
                        </div>
                    </td>
                    <td>${safeLastActivity}</td>
                    <td class="col-actions">
                        <div class="contact-row-actions ${isMenuOpen ? 'open' : ''}">
                            <button class="btn-icon contact-actions-btn" type="button" data-id="${safeId}" aria-haspopup="menu" aria-expanded="${isMenuOpen ? 'true' : 'false'}" title="Radhandlinger">
                                <span class="material-symbols-outlined">more_horiz</span>
                            </button>
                            <div class="contact-row-menu" role="menu" aria-label="Handlinger for kontakt">
                                <button class="contact-row-menu-item" type="button" data-action="edit" data-id="${safeId}">
                                    <span class="material-symbols-outlined">edit</span>
                                    Rediger
                                </button>
                                <button class="contact-row-menu-item danger" type="button" data-action="delete" data-id="${safeId}">
                                    <span class="material-symbols-outlined">delete</span>
                                    Slett
                                </button>
                            </div>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        // Re-attach checkbox listeners
        document.querySelectorAll('.contact-checkbox').forEach(cb => {
            cb.onchange = (e) => {
                const id = e.target.dataset.id;
                if (e.target.checked) this.selectedContactIds.add(id);
                else this.selectedContactIds.delete(id);
            };
        });

        document.querySelectorAll('.contact-actions-btn').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                this.openContactMenuId = this.openContactMenuId === id ? null : id;
                this.renderTable();
            };
        });

        document.querySelectorAll('.contact-row-menu-item').forEach(btn => {
            btn.onclick = async (e) => {
                e.stopPropagation();
                const action = btn.dataset.action;
                const id = btn.dataset.id;
                this.openContactMenuId = null;

                if (action === 'edit') {
                    this.openEditContactModal(id);
                    return;
                }
                if (action === 'delete') {
                    await this.deleteContact(id);
                }
            };
        });

        this.applyViewPreset();
    }

    getStatusClass(status) {
        switch (status) {
            case 'NETTSTEDSMEDLEM': return 'status-member';
            case 'BLOKKERT': return 'status-blocked';
            default: return 'status-guest';
        }
    }

    _roleLabel(role) {
        if (!role) return 'Medlem';
        const map = {
            superadmin: 'Administrator',
            admin: 'Administrator',
            pastor: 'Pastor',
            leder: 'Leder',
            frivillig: 'Frivillig',
            medlem: 'Medlem'
        };
        const safeRole = String(role);
        return map[safeRole.toLowerCase()] || safeRole;
    }

    renderLabels(labels) {
        if (!labels) return '';
        const arr = Array.isArray(labels) ? labels : [labels];
        if (arr.length === 0) return '';
        return arr.map(l => `<span class="label-pill">${this.escapeHtml(String(l))}</span>`).join('');
    }

    handleSearch(query) {
        this.searchQuery = String(query || '');
        this.applyCurrentFiltersAndSearch();
        this.updateViewSelector();
    }

    applyCurrentFiltersAndSearch() {
        const q = this.searchQuery.trim().toLowerCase();
        const normalizedFilter = this.normalizeStatusFilter(this.statusFilter);

        this.filteredContacts = this.contacts.filter((c) => {
            const matchesSearch = !q || [
                c.firstName,
                c.lastName,
                c.displayName,
                c.email,
                c.phone
            ].some((value) => String(value || '').toLowerCase().includes(q));

            if (!matchesSearch) return false;

            if (normalizedFilter === 'ALL') return true;
            return this.normalizeStatusFilter(c.status || 'IKKE_MEDLEM') === normalizedFilter;
        });

        this.renderTable();
    }

    normalizeStatusFilter(value) {
        const raw = String(value || '').trim().toUpperCase().replace(/\s+/g, '_');
        if (!raw || raw === 'ALL' || raw === 'ALLE') return 'ALL';
        if (raw === 'NETTSTEDSMEDLEM' || raw === 'NETTSTED_MEDLEM' || raw === 'MEDLEM') return 'NETTSTEDSMEDLEM';
        if (raw === 'BLOKKERT' || raw === 'BLOCKED') return 'BLOKKERT';
        if (raw === 'IKKE_MEDLEM' || raw === 'IKKEMEDLEM' || raw === 'NONE' || raw === 'INGEN') return 'IKKE_MEDLEM';
        return raw;
    }

    openCrmToolDialog(config = {}) {
        const modal = document.getElementById('crm-tool-modal');
        if (!modal) return;

        this.crmToolDialog = {
            ...this.crmToolDialog,
            open: true,
            mode: config.mode || 'choice',
            title: config.title || 'Verktøy',
            subtitle: config.subtitle || '',
            selectedValue: config.selectedValue ?? null,
            confirmLabel: config.confirmLabel || 'Bruk valg',
            confirmVariant: config.confirmVariant || 'primary',
            cancelLabel: config.cancelLabel || 'Avbryt',
            showCancel: config.showCancel !== false,
            options: Array.isArray(config.options) ? config.options : [],
            actions: Array.isArray(config.actions) ? config.actions : [],
            note: config.note || '',
            html: config.html || '',
            onConfirm: typeof config.onConfirm === 'function' ? config.onConfirm : null,
            onCancel: typeof config.onCancel === 'function' ? config.onCancel : null
        };

        if (this.crmToolDialog.mode === 'choice'
            && this.crmToolDialog.selectedValue == null
            && this.crmToolDialog.options.length) {
            this.crmToolDialog.selectedValue = this.crmToolDialog.options[0].value;
        }

        this.renderCrmToolDialog();
        modal.style.display = 'flex';
        modal.setAttribute('aria-hidden', 'false');
    }

    renderCrmToolDialog() {
        const state = this.crmToolDialog;
        const titleEl = document.getElementById('crm-tool-modal-title');
        const subtitleEl = document.getElementById('crm-tool-modal-subtitle');
        const contentEl = document.getElementById('crm-tool-modal-content');
        const footerEl = document.querySelector('.crm-tool-modal-footer');
        const confirmBtn = document.getElementById('crm-tool-modal-confirm');
        const cancelBtn = document.querySelector('.crm-tool-modal-footer [data-crm-tool-close]');
        if (!titleEl || !subtitleEl || !contentEl || !footerEl || !confirmBtn || !cancelBtn) return;

        titleEl.textContent = state.title || 'Verktøy';
        subtitleEl.textContent = state.subtitle || '';
        subtitleEl.style.display = state.subtitle ? '' : 'none';

        confirmBtn.textContent = state.confirmLabel || 'Bruk valg';
        confirmBtn.dataset.variant = state.confirmVariant === 'danger' ? 'danger' : 'primary';
        cancelBtn.textContent = state.cancelLabel || 'Avbryt';
        cancelBtn.style.display = state.showCancel === false ? 'none' : '';

        if (state.mode === 'actions') {
            footerEl.classList.add('is-hidden');
            contentEl.innerHTML = `
                <div class="crm-tool-action-grid">
                    ${state.actions.map((action) => `
                        <button type="button" class="crm-tool-action-btn" data-crm-tool-action="${this.escapeHtml(action.id || '')}">
                            <span class="material-symbols-outlined">${this.escapeHtml(action.icon || 'bolt')}</span>
                            <div>
                                <div class="crm-tool-action-title">${this.escapeHtml(action.title || '')}</div>
                                ${action.description ? `<div class="crm-tool-action-desc">${this.escapeHtml(action.description)}</div>` : ''}
                            </div>
                        </button>
                    `).join('')}
                </div>
                ${state.note ? `<div class="crm-tool-modal-note">${this.escapeHtml(state.note)}</div>` : ''}
            `;

            contentEl.querySelectorAll('[data-crm-tool-action]').forEach((btn) => {
                btn.addEventListener('click', async () => {
                    const actionId = btn.dataset.crmToolAction;
                    const action = state.actions.find((a) => String(a.id) === actionId);
                    if (!action || typeof action.onSelect !== 'function') return;
                    this.closeCrmToolDialog({ invokeCancel: false });
                    await action.onSelect();
                });
            });
            return;
        }

        footerEl.classList.remove('is-hidden');

        if (state.mode === 'choice') {
            contentEl.innerHTML = `
                <div class="crm-tool-option-list">
                    ${state.options.map((opt) => {
                const selected = String(opt.value) === String(state.selectedValue);
                return `
                            <button type="button" class="crm-tool-option ${selected ? 'is-selected' : ''}" data-crm-tool-option="${this.escapeHtml(opt.value)}">
                                <span class="crm-tool-option-indicator" aria-hidden="true"></span>
                                <span>
                                    <span class="crm-tool-option-title">${this.escapeHtml(opt.label)}</span>
                                    ${opt.description ? `<span class="crm-tool-option-desc">${this.escapeHtml(opt.description)}</span>` : ''}
                                </span>
                            </button>
                        `;
            }).join('')}
                </div>
                ${state.note ? `<div class="crm-tool-modal-note">${this.escapeHtml(state.note)}</div>` : ''}
            `;

            contentEl.querySelectorAll('[data-crm-tool-option]').forEach((btn) => {
                btn.addEventListener('click', () => {
                    this.crmToolDialog.selectedValue = btn.dataset.crmToolOption;
                    this.renderCrmToolDialog();
                });
            });
            return;
        }

        if (state.mode === 'confirm') {
            contentEl.innerHTML = `
                <div class="crm-tool-confirm-card">${this.escapeHtml(state.note || 'Bekreft handlingen.')}</div>
            `;
            return;
        }

        if (state.mode === 'custom-html') {
            contentEl.innerHTML = state.html || '';
            return;
        }

        contentEl.innerHTML = '';
    }

    async confirmCrmToolDialog() {
        const state = this.crmToolDialog;
        if (!state?.open) return;
        const confirmBtn = document.getElementById('crm-tool-modal-confirm');
        if (!confirmBtn) return;

        try {
            confirmBtn.disabled = true;
            const maybeResult = state.onConfirm ? await state.onConfirm(state.selectedValue, state) : true;
            if (maybeResult === false) return;
            this.closeCrmToolDialog({ invokeCancel: false });
        } catch (error) {
            console.error('CRM tool dialog confirm failed:', error);
            this.notify(error?.message || 'Kunne ikke fullføre handlingen.', 'error');
        } finally {
            confirmBtn.disabled = false;
        }
    }

    closeCrmToolDialog({ invokeCancel = true } = {}) {
        const modal = document.getElementById('crm-tool-modal');
        if (!modal) return;

        const wasOpen = this.crmToolDialog?.open;
        const onCancel = this.crmToolDialog?.onCancel;
        modal.style.display = 'none';
        modal.setAttribute('aria-hidden', 'true');

        this.crmToolDialog = {
            ...this.crmToolDialog,
            open: false,
            onConfirm: null,
            onCancel: null,
            actions: [],
            options: [],
            note: '',
            html: ''
        };

        if (invokeCancel && wasOpen && typeof onCancel === 'function') {
            onCancel();
        }
    }

    showCrmConfirmDialog({ title, subtitle = '', message, confirmLabel = 'Bekreft', confirmVariant = 'primary', cancelLabel = 'Avbryt' }) {
        return new Promise((resolve) => {
            this.openCrmToolDialog({
                mode: 'confirm',
                title,
                subtitle,
                note: message,
                confirmLabel,
                confirmVariant,
                cancelLabel,
                onConfirm: async () => {
                    resolve(true);
                    return true;
                },
                onCancel: () => resolve(false)
            });
        });
    }

    openFilterDialog() {
        const labels = {
            ALL: 'Alle kontakter',
            NETTSTEDSMEDLEM: 'Nettstedsmedlemmer',
            BLOKKERT: 'Blokkerte',
            IKKE_MEDLEM: 'Ikke medlem'
        };

        this.openCrmToolDialog({
            mode: 'choice',
            title: 'Filtrer kontakter',
            subtitle: 'Velg hvilke kontakter som skal vises i tabellen.',
            selectedValue: this.statusFilter,
            confirmLabel: 'Bruk filter',
            options: [
                { value: 'ALL', label: 'Alle kontakter', description: 'Vis hele listen uten statusfilter.' },
                { value: 'NETTSTEDSMEDLEM', label: 'Nettstedsmedlemmer', description: 'Kontakter med aktiv medlemsstatus.' },
                { value: 'BLOKKERT', label: 'Blokkerte', description: 'Kontakter som er markert som blokkert.' },
                { value: 'IKKE_MEDLEM', label: 'Ikke medlem', description: 'Kontakter uten medlemsstatus.' }
            ],
            onConfirm: async (selectedValue) => {
                this.statusFilter = this.normalizeStatusFilter(selectedValue);
                this.applyCurrentFiltersAndSearch();
                this.updateViewSelector();
                this.notify(`Filter aktivt: ${labels[this.statusFilter] || this.statusFilter}`);
            }
        });
    }

    openViewPresetDialog() {
        this.openCrmToolDialog({
            mode: 'choice',
            title: 'Administrer visning',
            subtitle: 'Velg hvordan tabellen skal presenteres på denne enheten.',
            selectedValue: this.viewPreset,
            confirmLabel: 'Bruk visning',
            options: [
                { value: 'standard', label: 'Standard', description: 'Vis alle kolonner med normal radavstand.' },
                { value: 'kompakt', label: 'Kompakt', description: 'Tettere rader for å se flere kontakter samtidig.' },
                { value: 'skjul_etiketter', label: 'Skjul etiketter', description: 'Skjuler etikett-kolonnen for mer plass.' },
                { value: 'skjul_siste_aktivitet', label: 'Skjul siste aktivitet', description: 'Skjuler aktivitetskolonnen for bedre oversikt på smale skjermer.' },
                { value: 'fokus', label: 'Fokus', description: 'Skjuler både etiketter og siste aktivitet.' }
            ],
            onConfirm: async (selectedValue) => {
                const normalized = String(selectedValue || 'standard').trim().toLowerCase().replace(/\s+/g, '_');
                const allowed = new Set(['standard', 'kompakt', 'skjul_etiketter', 'skjul_siste_aktivitet', 'fokus']);
                if (!allowed.has(normalized)) {
                    this.notify('Ukjent visning valgt.', 'error');
                    return false;
                }
                this.viewPreset = normalized;
                try {
                    localStorage.setItem('hkm_crm_view_preset', normalized);
                } catch (_) {
                    // ignore storage errors
                }
                this.applyViewPreset();
                this.notify(`Visning oppdatert: ${normalized.replaceAll('_', ' ')}`);
            }
        });
    }

    applyViewPreset() {
        const table = document.querySelector('.crm-table');
        if (table) {
            table.dataset.viewPreset = this.viewPreset || 'standard';
        }
    }

    openImportExportDialog() {
        this.openCrmToolDialog({
            mode: 'actions',
            title: 'Import / eksport',
            subtitle: 'Velg hva du vil gjøre med kontaktene i CRM-listen.',
            note: 'Eksport og kopiering bruker gjeldende søk og filter.',
            actions: [
                {
                    id: 'export-csv',
                    icon: 'download',
                    title: 'Eksporter CSV',
                    description: 'Laster ned filtrerte kontakter som CSV-fil.',
                    onSelect: async () => this.exportContactsCsv()
                },
                {
                    id: 'copy-emails',
                    icon: 'content_copy',
                    title: 'Kopier e-postliste',
                    description: 'Kopierer e-postadresser for filtrerte kontakter.',
                    onSelect: async () => this.copyFilteredEmails()
                },
                {
                    id: 'import-csv',
                    icon: 'upload_file',
                    title: 'Importer CSV',
                    description: 'Importer nye kontakter fra CSV-fil til brukerliste.',
                    onSelect: async () => this.triggerCsvImport()
                }
            ]
        });
    }

    exportContactsCsv() {
        const rows = this.filteredContacts;
        if (!rows.length) {
            this.notify('Ingen kontakter å eksportere.', 'error');
            return;
        }

        const headers = ['id', 'firstName', 'lastName', 'displayName', 'email', 'phone', 'role', 'status', 'labels'];
        const escapeCsv = (val) => {
            const str = String(val ?? '');
            return /[",;\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
        };

        const lines = [
            headers.join(','),
            ...rows.map((c) => [
                c.id,
                c.firstName || '',
                c.lastName || '',
                c.displayName || '',
                c.email || '',
                c.phone || '',
                c.role || '',
                c.status || '',
                Array.isArray(c.labels) ? c.labels.join('|') : (c.label || '')
            ].map(escapeCsv).join(','))
        ];

        const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
        this.downloadTextFile(`hkm-kontakter-${stamp}.csv`, lines.join('\n'), 'text/csv;charset=utf-8;');
        this.notify(`Eksporterte ${rows.length} kontakter til CSV.`);
    }

    async copyFilteredEmails() {
        const emails = Array.from(new Set(
            this.filteredContacts
                .map((c) => String(c.email || '').trim())
                .filter(Boolean)
        ));

        if (!emails.length) {
            this.notify('Ingen e-postadresser å kopiere.', 'error');
            return;
        }

        const text = emails.join('; ');
        try {
            await navigator.clipboard.writeText(text);
            this.notify(`Kopierte ${emails.length} e-postadresser.`);
        } catch (err) {
            console.warn('Clipboard copy failed:', err);
            this.openCrmToolDialog({
                mode: 'custom-html',
                title: 'Kopier e-postliste manuelt',
                subtitle: 'Nettleseren blokkerte automatisk kopiering. Marker teksten og kopier manuelt.',
                confirmLabel: 'Lukk',
                showCancel: false,
                html: `<textarea class="crm-tool-copy-box" readonly id="crm-tool-copy-box">${this.escapeHtml(text)}</textarea>`,
                onConfirm: async () => true
            });
            requestAnimationFrame(() => {
                const textarea = document.getElementById('crm-tool-copy-box');
                if (textarea) {
                    textarea.focus();
                    textarea.select();
                }
            });
        }
    }

    triggerCsvImport() {
        const input = document.getElementById('contacts-import-file');
        if (!input) {
            this.notify('Import er ikke tilgjengelig på denne siden.', 'error');
            return;
        }
        input.value = '';
        input.click();
    }

    async handleCsvImport(event) {
        const file = event?.target?.files?.[0];
        if (!file) return;

        try {
            const text = await file.text();
            const rows = this.parseCsv(text);
            if (!rows.length) {
                this.notify('Fant ingen rader i CSV-filen.', 'error');
                return;
            }

            const contacts = rows.map((row) => this.mapCsvRowToContact(row)).filter(Boolean);
            if (!contacts.length) {
                this.notify('Ingen gyldige kontakter i CSV. Krever minst e-post og navn.', 'error');
                return;
            }

            const ok = await this.showCrmConfirmDialog({
                title: 'Importer kontakter',
                subtitle: file.name ? `Fil: ${file.name}` : 'CSV-import',
                message: `Importer ${contacts.length} kontakter til brukerliste? Dette oppretter nye dokumenter i Firestore.`,
                confirmLabel: 'Importer',
                confirmVariant: 'primary',
                cancelLabel: 'Avbryt'
            });
            if (!ok) return;

            await this.importContactsBatch(contacts);
            await this.loadContacts();
            this.notify(`Importerte ${contacts.length} kontakter.`);
        } catch (error) {
            console.error('CSV import failed:', error);
            this.notify(`CSV-import feilet: ${error.message}`, 'error');
        } finally {
            event.target.value = '';
        }
    }

    parseCsv(text) {
        const lines = String(text || '')
            .replace(/^\uFEFF/, '')
            .split(/\r?\n/)
            .filter((line) => line.trim().length > 0);

        if (lines.length < 2) return [];

        const delimiter = (lines[0].split(';').length > lines[0].split(',').length) ? ';' : ',';
        const headers = this.parseCsvLine(lines[0], delimiter).map((h) => String(h || '').trim());
        const rows = [];

        for (let i = 1; i < lines.length; i++) {
            const values = this.parseCsvLine(lines[i], delimiter);
            if (!values.some((v) => String(v || '').trim())) continue;
            const row = {};
            headers.forEach((header, index) => {
                row[header] = values[index] ?? '';
            });
            rows.push(row);
        }

        return rows;
    }

    parseCsvLine(line, delimiter = ',') {
        const out = [];
        let cur = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (ch === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    cur += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
                continue;
            }
            if (ch === delimiter && !inQuotes) {
                out.push(cur);
                cur = '';
                continue;
            }
            cur += ch;
        }
        out.push(cur);
        return out;
    }

    mapCsvRowToContact(row) {
        const get = (...keys) => {
            const entry = Object.entries(row).find(([k]) => keys.includes(String(k || '').trim().toLowerCase()));
            return entry ? String(entry[1] ?? '').trim() : '';
        };

        const firstName = get('firstname', 'fornavn', 'first_name');
        const lastName = get('lastname', 'etternavn', 'last_name');
        const displayName = get('displayname', 'display_name', 'navn', 'name') || `${firstName} ${lastName}`.trim();
        const email = get('email', 'e-post', 'epost');
        const phone = get('phone', 'telefon', 'mobile', 'mobil');
        const role = get('role', 'rolle');
        const rawStatus = get('status', 'medlemsstatus');
        const label = get('label', 'etikett', 'tag') || 'Ny';

        const resolvedFirstName = firstName || (displayName ? displayName.split(/\s+/)[0] : '');
        const resolvedLastName = lastName || (displayName ? displayName.split(/\s+/).slice(1).join(' ') : '');

        if (!email || !resolvedFirstName) return null;

        return {
            firstName: resolvedFirstName,
            lastName: resolvedLastName,
            displayName: displayName || `${resolvedFirstName} ${resolvedLastName}`.trim(),
            email,
            phone,
            role: role || 'medlem',
            status: this.normalizeStatusFilter(rawStatus) === 'ALL' ? 'IKKE_MEDLEM' : this.normalizeStatusFilter(rawStatus),
            label,
            labels: [label]
        };
    }

    async importContactsBatch(contacts) {
        const db = window.firebaseService?.db;
        if (!db) throw new Error('Firebase er ikke klar');

        const chunkSize = 300;
        for (let i = 0; i < contacts.length; i += chunkSize) {
            const chunk = contacts.slice(i, i + chunkSize);
            const batch = db.batch();
            chunk.forEach((contact) => {
                const ref = db.collection('users').doc();
                batch.set(ref, {
                    ...contact,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    createdBy: 'admin-csv-import',
                    updatedBy: 'admin-csv-import'
                }, { merge: true });
            });
            await batch.commit();
        }
    }

    downloadTextFile(filename, content, mime = 'text/plain;charset=utf-8;') {
        const blob = new Blob([content], { type: mime });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    }

    toggleModal(show) {
        const modal = document.getElementById('contact-modal');
        if (modal) modal.style.display = show ? 'flex' : 'none';
        this.isModalOpen = show;
        if (!show) {
            this.resetContactModalState();
        }
    }

    openCreateContactModal() {
        this.editingContactId = null;
        this.openContactMenuId = null;
        this.applyContactFormState({ mode: 'create' });
        this.toggleModal(true);
    }

    openEditContactModal(contactId) {
        const contact = this.contacts.find(c => c.id === contactId);
        if (!contact) {
            this.notify('Fant ikke kontakten som skulle redigeres.', 'error');
            return;
        }

        this.editingContactId = contactId;
        this.applyContactFormState({ mode: 'edit', contact });
        this.toggleModal(true);
    }

    applyContactFormState({ mode, contact = null }) {
        const form = document.getElementById('contact-form');
        const titleEl = document.getElementById('contact-modal-title');
        const submitBtn = form?.querySelector('button[type="submit"]');
        if (!form) return;

        if (mode === 'edit' && contact) {
            let firstName = contact.firstName || '';
            let lastName = contact.lastName || '';
            if ((!firstName || !lastName) && contact.displayName) {
                const parts = String(contact.displayName).trim().split(/\s+/);
                firstName = firstName || parts[0] || '';
                lastName = lastName || parts.slice(1).join(' ');
            }

            form.elements.firstName.value = firstName || '';
            form.elements.lastName.value = lastName || '';
            form.elements.email.value = contact.email || '';
            form.elements.phone.value = contact.phone || '';
            form.elements.label.value = (contact.label || contact.labels?.[0] || 'Ny');
            form.elements.status.value = contact.status || 'IKKE_MEDLEM';

            if (titleEl) titleEl.textContent = 'Rediger kontakt';
            if (submitBtn) submitBtn.textContent = 'Oppdater kontakt';
            return;
        }

        form.reset();
        if (form.elements.status) form.elements.status.value = 'NETTSTEDSMEDLEM';
        if (form.elements.label) form.elements.label.value = 'Ny';
        if (titleEl) titleEl.textContent = 'Opprett ny kontakt';
        if (submitBtn) submitBtn.textContent = 'Lagre kontakt';
    }

    resetContactModalState() {
        this.editingContactId = null;
        const form = document.getElementById('contact-form');
        if (!form) return;
        const titleEl = document.getElementById('contact-modal-title');
        const submitBtn = form.querySelector('button[type="submit"]');
        if (titleEl) titleEl.textContent = 'Opprett ny kontakt';
        if (submitBtn) submitBtn.textContent = 'Lagre kontakt';
    }

    async saveContact(event) {
        event.preventDefault();
        const formData = new FormData(event.target);
        const firstName = String(formData.get('firstName') || '').trim();
        const lastName = String(formData.get('lastName') || '').trim();
        const email = String(formData.get('email') || '').trim();
        const phone = String(formData.get('phone') || '').trim();
        const label = String(formData.get('label') || 'Ny').trim() || 'Ny';
        const status = String(formData.get('status') || 'IKKE_MEDLEM').trim() || 'IKKE_MEDLEM';

        if (!firstName || !lastName || !email) {
            this.notify('Fornavn, etternavn og e-post er påkrevd.', 'error');
            return;
        }

        const contactData = {
            firstName,
            lastName,
            displayName: `${firstName} ${lastName}`.trim(),
            email,
            phone,
            label,
            labels: [label],
            status,
            updatedAt: new Date().toISOString(),
            updatedBy: 'admin'
        };

        try {
            if (this.editingContactId) {
                await window.firebaseService.db.collection('users').doc(this.editingContactId).set(contactData, { merge: true });
                this.notify("Kontakt oppdatert!");
            } else {
                await window.firebaseService.db.collection('users').add({
                    ...contactData,
                    createdAt: new Date().toISOString(),
                    createdBy: 'admin'
                });
                this.notify("Kontakt lagret!");
            }
            this.toggleModal(false);
            event.target.reset();
            await this.loadContacts();
        } catch (error) {
            console.error("Error saving contact:", error);
            this.notify("Kunne ikke lagre: " + error.message, 'error');
        }
    }

    async deleteContact(contactId) {
        const contact = this.contacts.find(c => c.id === contactId);
        const contactName = contact?.displayName || `${contact?.firstName || ''} ${contact?.lastName || ''}`.trim() || contact?.email || 'denne kontakten';
        const ok = await this.showCrmConfirmDialog({
            title: 'Slett kontakt',
            subtitle: 'Denne handlingen kan ikke angres.',
            message: `Er du sikker på at du vil slette ${contactName}?`,
            confirmLabel: 'Slett kontakt',
            confirmVariant: 'danger',
            cancelLabel: 'Avbryt'
        });
        if (!ok) return;

        try {
            await window.firebaseService.db.collection('users').doc(contactId).delete();
            this.selectedContactIds.delete(contactId);
            await this.loadContacts();
            this.notify('Kontakt slettet.');
        } catch (error) {
            console.error("Error deleting contact:", error);
            this.notify("Kunne ikke slette: " + error.message, 'error');
        }
    }

    notify(message, type = 'success') {
        if (window.showToast) {
            window.showToast(message, type, 4000);
            return;
        }
        if (typeof showToast === 'function') {
            showToast(message);
            return;
        }
        console.log(`[CRM ${type}] ${message}`);
    }

    escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    toggleSelectAll(checked) {
        document.querySelectorAll('.contact-checkbox').forEach(cb => {
            cb.checked = checked;
            const id = cb.dataset.id;
            if (checked) this.selectedContactIds.add(id);
            else this.selectedContactIds.delete(id);
        });
    }

    // --- Segment Management ---
    openSegmentsModal() {
        const modal = document.getElementById('segments-modal');
        if (modal) {
            modal.style.display = 'flex';
            this.renderSegmentsList();
        }
    }

    closeSegmentsModal() {
        const modal = document.getElementById('segments-modal');
        if (modal) modal.style.display = 'none';
    }

    // Placeholder until real segment backend is implemented
    createSegment() {
        this.openCrmToolDialog({
            mode: 'custom-html',
            title: 'Opprett segment',
            subtitle: 'Segmentmodulen er under oppsett. Du kan navngi segmentet for klargjøring.',
            confirmLabel: 'Lagre utkast',
            cancelLabel: 'Avbryt',
            html: `
                <div class="crm-tool-form-grid">
                    <label class="crm-tool-field">
                        <span class="crm-tool-field-label">Segmentnavn</span>
                        <input id="crm-segment-name-input" class="crm-tool-input" type="text" maxlength="80" placeholder="f.eks. Nye abonnenter">
                    </label>
                    <div class="crm-tool-modal-note">
                        Dette lagrer kun et lokalt utkast foreløpig. Segmentregler og automatisk synkronisering kommer i neste steg.
                    </div>
                </div>
            `,
            onConfirm: async () => {
                const input = document.getElementById('crm-segment-name-input');
                const segmentName = String(input?.value || '').trim();
                if (!segmentName) {
                    this.notify('Skriv inn et segmentnavn.', 'error');
                    input?.focus();
                    return false;
                }

                try {
                    const raw = localStorage.getItem('hkm_crm_segment_drafts');
                    let drafts = [];
                    try {
                        const parsed = JSON.parse(raw || '[]');
                        if (Array.isArray(parsed)) drafts = parsed;
                    } catch (_) {
                        drafts = [];
                    }
                    drafts.unshift({
                        id: `draft_${Date.now()}`,
                        name: segmentName,
                        createdAt: new Date().toISOString()
                    });
                    localStorage.setItem('hkm_crm_segment_drafts', JSON.stringify(drafts.slice(0, 20)));
                } catch (_) {
                    // ignore storage errors
                }

                this.notify(`Segmentutkast "${segmentName}" lagret.`);
                return true;
            }
        });

        requestAnimationFrame(() => {
            const input = document.getElementById('crm-segment-name-input');
            if (input) input.focus();
        });
    }

    renderSegmentsList() {
        // We are currently using the static "empty state" HTML in the modal 
        // as per the user request. This method is kept for future data binding
        // when we want to switch from empty state to list view.

        const countBadge = document.getElementById('segment-count-badge');
        if (countBadge) countBadge.textContent = '0';

        /* 
        const listContainer = document.getElementById('segments-content-area');
        // Example of how we would render list if we had segments:
        // if (segments.length > 0) { renderList() } else { showEmptyState() }
        */
    }
}

// Initialize on load
window.crm = new CRMManager();
