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

        this.sortField = 'name';
        this.sortDirection = 'asc';

        this.init();
    }

    async init() {
        console.log("CRM Manager Initializing...");

        // Setup UI Listeners
        this.setupEventListeners();
        this.setupDrawerListeners();

        // Show skeletons immediately
        this.renderSkeleton();

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
                window.location.href = '/admin/login.html';
            }
        });
    }

    setupEventListeners() {
        // Modal toggles
        const addBtn = document.getElementById('add-contact-btn');
        const closeBtns = document.querySelectorAll('.close-modal, .close-modal-btn, .cancel-modal-btn');
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

        document.querySelectorAll('.contact-actions-btn').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                this.openContactMenuId = this.openContactMenuId === id ? null : id;
                this.renderTable();
            };
        });

        // Bulk delete button
        const bulkDeleteBtn = document.getElementById('bulk-delete-btn');
        if (bulkDeleteBtn) {
            bulkDeleteBtn.onclick = () => this.deleteSelectedContacts();
        }

        // --- Premium Wix-style Floating Bulk Actions ---
        const hkmBulkDelete = document.getElementById('hkm-bulk-delete-btn');
        if (hkmBulkDelete) hkmBulkDelete.onclick = () => this.deleteSelectedContacts();

        const hkmBulkTag = document.getElementById('hkm-bulk-tag-btn');
        if (hkmBulkTag) hkmBulkTag.onclick = () => this.bulkEditLabels();

        const hkmBulkStatus = document.getElementById('hkm-bulk-status-btn');
        if (hkmBulkStatus) hkmBulkStatus.onclick = () => this.bulkEditStatus();

        const hkmBulkMerge = document.getElementById('hkm-bulk-merge-btn');
        if (hkmBulkMerge) hkmBulkMerge.onclick = () => this.bulkMergeContacts();

        const hkmBulkExport = document.getElementById('hkm-bulk-export-btn');
        if (hkmBulkExport) hkmBulkExport.onclick = () => this.bulkExportCsv();

        const hkmBulkClear = document.getElementById('hkm-bulk-clear-btn');
        if (hkmBulkClear) {
            hkmBulkClear.onclick = () => {
                this.selectedContactIds.clear();
                const selectAll = document.getElementById('select-all-contacts');
                if (selectAll) selectAll.checked = false;
                document.querySelectorAll('.contact-checkbox').forEach(cb => cb.checked = false);
                this.updateBulkActionsVisibility();
            };
        }
        document.addEventListener('click', (e) => {
            if (!this.openContactMenuId) return;
            const target = e.target;
            if (target && target.closest && target.closest('.contact-row-actions')) return;
            this.openContactMenuId = null;
            this.renderTable();
        });

        // Setup sortable headers dynamically
        const headers = document.querySelectorAll('.crm-table thead th');
        const sortFields = ['none', 'name', 'email', 'phone', 'status', 'labels', 'lastActivity'];
        headers.forEach((header, index) => {
            const field = sortFields[index];
            if (field && field !== 'none') {
                header.style.cursor = 'pointer';
                header.style.userSelect = 'none';
                header.style.position = 'relative';
                
                header.addEventListener('mouseover', () => {
                    header.style.backgroundColor = '#f1f5f9';
                    header.style.color = '#1b4965';
                });
                header.addEventListener('mouseout', () => {
                    header.style.backgroundColor = '';
                    header.style.color = '';
                });

                header.addEventListener('click', () => {
                    if (this.sortField === field) {
                        this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
                    } else {
                        this.sortField = field;
                        this.sortDirection = (field === 'name' || field === 'email' || field === 'status' || field === 'labels') ? 'asc' : 'desc';
                    }
                    this.applyCurrentFiltersAndSearch();
                });
            }
        });
    }

    async loadContacts() {
        const tableBody = document.getElementById('contacts-table-body');
        if (!tableBody) return;

        try {
            const snapshot = await window.firebaseService.db.collection('contacts').get();
            this.contacts = [];
            snapshot.forEach(doc => {
                this.contacts.push({ id: doc.id, ...doc.data() });
            });

            this.applyCurrentFiltersAndSearch();
            this.updateViewSelector();
            this.updateStats();
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
            const colorClass = this.getAvatarColorClass(fullName);
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
                <tr data-id="${safeId}" class="contact-row" style="cursor: pointer;">
                    <td class="col-check" onclick="event.stopPropagation()">
                        <input type="checkbox" class="contact-checkbox" data-id="${safeId}" ${this.selectedContactIds.has(contact.id) ? 'checked' : ''}>
                    </td>
                    <td class="open-drawer-trigger">
                        <div class="contact-user">
                            <div class="avatar ${colorClass}">${safeInitials}</div>
                            <div class="name-wrap">
                                <span class="name">${safeName}</span>
                                <span class="sub">${safeRole}</span>
                            </div>
                        </div>
                    </td>
                    <td class="open-drawer-trigger">${safeEmail}</td>
                    <td class="open-drawer-trigger">${safePhone}</td>
                    <td class="open-drawer-trigger"><span class="badge ${statusClass}">${safeStatus}</span></td>
                    <td class="open-drawer-trigger">
                        <div class="labels-list">
                            ${this.renderLabels(contact.labels || [contact.label || 'Ny'])}
                        </div>
                    </td>
                    <td class="open-drawer-trigger">${safeLastActivity}</td>
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

        // Re-attach listeners
        document.querySelectorAll('.open-drawer-trigger').forEach(el => {
            el.onclick = (e) => {
                const id = el.closest('tr').dataset.id;
                this.openDrawer(id);
            };
        });

        // Re-attach checkbox listeners
        document.querySelectorAll('.contact-checkbox').forEach(cb => {
            cb.onchange = (e) => {
                const id = e.target.dataset.id;
                if (e.target.checked) this.selectedContactIds.add(id);
                else this.selectedContactIds.delete(id);
                this.updateBulkActionsVisibility();
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
        this.updateSortHeaderUI();
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

        this.sortFilteredContacts();

        this.renderTable();
    }

    getContactFullName(c) {
        let firstName = c.firstName || '';
        let lastName = c.lastName || '';
        let fullName = `${firstName} ${lastName}`.trim();

        if (!fullName && c.displayName) {
            fullName = c.displayName;
        }

        if (!fullName) {
            fullName = c.email ? c.email.split('@')[0] : 'Ukjent Navn';
        }
        return fullName;
    }

    getContactTime(c) {
        const dateVal = c.lastLogin || c.updatedAt || c.createdAt;
        if (!dateVal) return 0;
        if (dateVal.toDate && typeof dateVal.toDate === 'function') {
            return dateVal.toDate().getTime();
        }
        const d = new Date(dateVal);
        return isNaN(d.getTime()) ? 0 : d.getTime();
    }

    sortFilteredContacts() {
        if (!this.sortField) return;

        this.filteredContacts.sort((a, b) => {
            let comp = 0;
            if (this.sortField === 'name') {
                const nameA = this.getContactFullName(a);
                const nameB = this.getContactFullName(b);
                comp = nameA.localeCompare(nameB, 'no');
            } else if (this.sortField === 'email') {
                comp = (a.email || '').localeCompare(b.email || '', 'no');
            } else if (this.sortField === 'phone') {
                comp = (a.phone || '').localeCompare(b.phone || '', 'no');
            } else if (this.sortField === 'status') {
                comp = (a.status || '').localeCompare(b.status || '', 'no');
            } else if (this.sortField === 'labels') {
                const labelsA = (a.labels || [a.label || 'Ny']).join(', ');
                const labelsB = (b.labels || [b.label || 'Ny']).join(', ');
                comp = labelsA.localeCompare(labelsB, 'no');
            } else if (this.sortField === 'lastActivity') {
                const timeA = this.getContactTime(a);
                const timeB = this.getContactTime(b);
                comp = timeA - timeB;
            }
            return this.sortDirection === 'asc' ? comp : -comp;
        });
    }

    updateSortHeaderUI() {
        const headers = document.querySelectorAll('.crm-table thead th');
        const sortFields = ['none', 'name', 'email', 'phone', 'status', 'labels', 'lastActivity'];
        headers.forEach((header, index) => {
            const field = sortFields[index];
            if (field && field !== 'none') {
                let wrapper = header.querySelector('.sort-header-wrapper');
                if (!wrapper) {
                    wrapper = document.createElement('div');
                    wrapper.className = 'sort-header-wrapper';
                    wrapper.style.display = 'inline-flex';
                    wrapper.style.alignItems = 'center';
                    wrapper.style.gap = '6px';
                    wrapper.style.verticalAlign = 'middle';
                    
                    if (header.style.textAlign === 'right' || header.classList.contains('text-right')) {
                        wrapper.style.width = '100%';
                        wrapper.style.justifyContent = 'flex-end';
                    }
                    
                    while (header.firstChild) {
                        wrapper.appendChild(header.firstChild);
                    }
                    header.appendChild(wrapper);
                }

                let icon = wrapper.querySelector('.sort-icon');
                if (!icon) {
                    icon = document.createElement('span');
                    icon.className = 'material-symbols-outlined sort-icon';
                    icon.style.fontSize = '16px';
                    icon.style.lineHeight = '1';
                    icon.style.flexShrink = '0';
                    wrapper.appendChild(icon);
                }
                
                if (field === this.sortField) {
                    icon.style.display = 'inline-flex';
                    icon.textContent = this.sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward';
                    icon.style.color = '#d17d39'; // Orange theme accent color
                } else {
                    icon.style.display = 'none';
                }
            }
        });
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
        console.log("CRM: handleCsvImport started");
        
        try {
            const file = event?.target?.files?.[0];
            if (!file) {
                console.log("CRM: No file in event target");
                return;
            }
            
            console.log(`CRM: File selected: Name="${file.name}", Size=${file.size} bytes, Type="${file.type}"`);
            this.notify(`Leser fil: ${file.name}...`, 'info');

            let text;
            try {
                text = await file.text();
                console.log(`CRM: Successfully read file text, length: ${text.length} chars`);
            } catch (readError) {
                console.error("CRM: Error reading file text via file.text():", readError);
                // Prøv FileReader som fallback hvis file.text() feiler
                text = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = (e) => resolve(e.target.result);
                    reader.onerror = (e) => reject(new Error("Kunne ikke lese filen med FileReader"));
                    reader.readAsText(file);
                });
            }

            const rows = this.parseCsv(text);
            console.log(`CRM: Parsed CSV rows: ${rows.length}`);
            
            if (!rows.length) {
                console.warn("CRM: No rows parsed from file");
                this.notify('Fant ingen rader i CSV-filen.', 'error');
                alert('Fant ingen rader i CSV-filen. Sjekk at filen ikke er tom.');
                return;
            }

            const contacts = rows.map((row) => this.mapCsvRowToContact(row)).filter(Boolean);
            console.log(`CRM: Mapped contacts count: ${contacts.length}`);
            
            if (!contacts.length) {
                console.warn("CRM: No contacts successfully mapped. Sample row:", rows[0]);
                this.notify('Ingen gyldige kontakter funnet. Krever e-post.', 'error');
                alert('Ingen gyldige kontakter funnet i CSV-filen.\n\nSjekk at filen har en kolonne for e-post (eller epost, e-postadresse, email).\n\nForste rad i filen din:\n' + JSON.stringify(rows[0]));
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
            console.log("CRM: Confirm dialog resolved with:", ok);
            if (!ok) return;

            // Åpne fremdriftsvisning i modalen
            this.openCrmToolDialog({
                mode: 'custom-html',
                title: 'Importerer kontakter',
                subtitle: `Vennligst vent mens kontaktene lagres i databasen.`,
                confirmLabel: 'Fullfør',
                showCancel: false,
                html: `
                    <div style="padding: 16px 0;">
                        <div style="display: flex; justify-content: space-between; font-size: 14px; color: #475569; margin-bottom: 8px; font-weight: 500;">
                            <span id="import-progress-status">Forbereder import...</span>
                            <span id="import-progress-percent">0%</span>
                        </div>
                        <div style="width: 100%; height: 12px; background: #e2e8f0; border-radius: 6px; overflow: hidden; margin-bottom: 12px; position: relative;">
                            <div id="import-progress-bar" style="width: 0%; height: 100%; background: linear-gradient(135deg, #1B4965 0%, #3b82f6 100%); transition: width 0.3s ease; border-radius: 6px;"></div>
                        </div>
                        <p id="import-progress-details" style="font-size: 12px; color: #64748b; margin: 0; line-height: 1.5;">
                            Importerer 0 av ${contacts.length} kontakter...
                        </p>
                    </div>
                `,
                onConfirm: async () => true
            });

            // Deaktiver modal lukk-knapper under import for å forhindre avbrudd
            const confirmBtn = document.getElementById('crm-tool-modal-confirm');
            if (confirmBtn) confirmBtn.style.display = 'none';
            const closeBtns = document.querySelectorAll('[data-crm-tool-close], .close-modal');
            closeBtns.forEach(btn => {
                if (btn instanceof HTMLButtonElement || btn instanceof HTMLSpanElement) {
                    btn.style.pointerEvents = 'none';
                    btn.style.opacity = '0.5';
                }
            });

            // Kjør batch-import med live oppdatering
            await this.importContactsBatch(contacts, (percentage, current, total) => {
                const bar = document.getElementById('import-progress-bar');
                const percent = document.getElementById('import-progress-percent');
                const status = document.getElementById('import-progress-status');
                const details = document.getElementById('import-progress-details');

                if (bar) bar.style.width = `${percentage}%`;
                if (percent) percent.textContent = `${percentage}%`;
                if (status) status.textContent = percentage === 100 ? 'Fullført!' : 'Importerer...';
                if (details) details.textContent = `Lagret ${current} av ${total} kontakter (${percentage}%).`;
            });

            await this.loadContacts();
            this.notify(`Importerte ${contacts.length} kontakter.`);

            // Reaktiver lukk-knapper slik at brukeren kan fullføre
            if (confirmBtn) {
                confirmBtn.style.display = 'inline-flex';
                confirmBtn.textContent = 'Fullfør';
            }
            closeBtns.forEach(btn => {
                if (btn instanceof HTMLButtonElement || btn instanceof HTMLSpanElement) {
                    btn.style.pointerEvents = 'auto';
                    btn.style.opacity = '1';
                }
            });
        } catch (error) {
            console.error('CSV import failed:', error);
            alert(`Det oppstod en feil under CSV-importen: ${error.message}`);
            this.notify(`CSV-import feilet: ${error.message}`, 'error');
            try {
                this.closeCrmToolDialog();
            } catch (_) {}
        } finally {
            if (event?.target) {
                event.target.value = '';
            }
        }
    }

    parseCsv(text) {
        const lines = String(text || '')
            .replace(/^\uFEFF/, '')
            .split(/\r?\n/)
            .filter((line) => line.trim().length > 0);

        if (lines.length < 2) return [];

        // Detekter skilletegn mer robust (støtter tabulator, semikolon og komma)
        const semicolons = lines[0].split(';').length;
        const commas = lines[0].split(',').length;
        const tabs = lines[0].split('\t').length;

        let delimiter = ',';
        if (semicolons > commas && semicolons > tabs) {
            delimiter = ';';
        } else if (tabs > commas && tabs > semicolons) {
            delimiter = '\t';
        }

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
            // Normaliser søkenøklene (lowercase, fjerner mellomrom, bindestreker og understreker)
            const normalizedKeys = keys.map(k => String(k || '').trim().toLowerCase().replace(/[\s\-_]/g, ''));
            const entry = Object.entries(row).find(([k]) => {
                const normalizedK = String(k || '').trim().toLowerCase().replace(/[\s\-_]/g, '');
                return normalizedKeys.some(nk => {
                    if (normalizedK === nk) return true;
                    // Håndter kolonner som slutter med tall (f.eks. "E-post 1" -> "epost1" matches av "epost")
                    if (normalizedK.startsWith(nk)) {
                        const remainder = normalizedK.slice(nk.length);
                        if (/^\d+$/.test(remainder)) return true;
                    }
                    return false;
                });
            });
            return entry ? String(entry[1] ?? '').trim() : '';
        };

        const firstName = get('firstname', 'fornavn', 'first');
        const lastName = get('lastname', 'etternavn', 'last');
        const displayName = get('displayname', 'name', 'navn', 'fullname', 'fulltnavn') || `${firstName} ${lastName}`.trim();
        
        // Nød-fallback for e-post hvis standard matching feiler (f.eks. om kolonnen heter "E-post 1" eller inneholder "mail")
        let email = get('email', 'epost', 'emailaddress', 'epostadresse', 'mail');
        if (!email) {
            const fallbackEntry = Object.entries(row).find(([k]) => {
                const normalizedK = String(k || '').trim().toLowerCase().replace(/[\s\-_]/g, '');
                return normalizedK.includes('email') || normalizedK.includes('epost') || normalizedK.includes('mail');
            });
            if (fallbackEntry) email = String(fallbackEntry[1] ?? '').trim();
        }

        // Nød-fallback for telefon
        let phone = get('phone', 'telefon', 'mobile', 'mobil', 'mobilnummer', 'telefonnummer', 'phonenumber');
        if (!phone) {
            const fallbackEntry = Object.entries(row).find(([k]) => {
                const normalizedK = String(k || '').trim().toLowerCase().replace(/[\s\-_]/g, '');
                return normalizedK.includes('phone') || normalizedK.includes('telef') || normalizedK.includes('mobil');
            });
            if (fallbackEntry) phone = String(fallbackEntry[1] ?? '').trim();
        }

        const role = get('role', 'rolle');
        const rawStatus = get('status', 'medlemsstatus', 'membershipstatus');
        const label = get('label', 'etikett', 'tag', 'tags') || 'Ny';

        const address = get('address', 'adresse', 'gateadresse', 'street', 'streetaddress');
        const zip = get('zip', 'postnummer', 'postnr', 'postalcode', 'zipcode');
        const city = get('city', 'poststed', 'sted', 'town', 'postalcity');
        const country = get('country', 'land') || 'Norge';

        let resolvedFirstName = firstName || (displayName ? displayName.split(/\s+/)[0] : '');
        const resolvedLastName = lastName || (displayName ? displayName.split(/\s+/).slice(1).join(' ') : '');

        // Hvis e-post finnes, men fornavn mangler, bruk e-posten (local part) som en hyggelig fallback
        if (email && !resolvedFirstName) {
            resolvedFirstName = email.split('@')[0];
        }

        // Defensiv sjekk: e-post må være tilstede og fornavn må være løst
        if (!email || !resolvedFirstName) return null;

        return {
            firstName: resolvedFirstName,
            lastName: resolvedLastName,
            displayName: displayName || `${resolvedFirstName} ${resolvedLastName}`.trim(),
            email,
            phone,
            address: address || '',
            zip: zip || '',
            city: city || '',
            country: country || 'Norge',
            role: role || 'medlem',
            status: 'IKKE_MEDLEM', // Alltid importer som kontakt (IKKE_MEDLEM) som standard
            label,
            labels: [label]
        };
    }

    async importContactsBatch(contacts, onProgress) {
        const db = window.firebaseService?.db;
        if (!db) throw new Error('Firebase er ikke klar');

        const chunkSize = 100; // Mindre chunkSize for hyppigere progresjonsoppdatering
        const total = contacts.length;

        for (let i = 0; i < total; i += chunkSize) {
            const chunk = contacts.slice(i, i + chunkSize);
            const batch = db.batch();
            chunk.forEach((contact) => {
                const ref = db.collection('contacts').doc();
                batch.set(ref, {
                    ...contact,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    createdBy: 'admin-csv-import',
                    updatedBy: 'admin-csv-import'
                }, { merge: true });
            });
            await batch.commit();

            const current = Math.min(i + chunk.length, total);
            const percentage = Math.round((current / total) * 100);
            if (typeof onProgress === 'function') {
                onProgress(percentage, current, total);
            }
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
            if (form.elements.address) form.elements.address.value = contact.address || '';
            if (form.elements.zip) form.elements.zip.value = contact.zip || '';
            if (form.elements.city) form.elements.city.value = contact.city || '';
            if (form.elements.country) form.elements.country.value = contact.country || 'Norge';
            form.elements.label.value = (contact.label || contact.labels?.[0] || 'Ny');
            form.elements.status.value = contact.status || 'IKKE_MEDLEM';

            if (titleEl) titleEl.textContent = 'Rediger kontakt';
            if (submitBtn) submitBtn.textContent = 'Oppdater kontakt';
            return;
        }

        form.reset();
        if (form.elements.country) form.elements.country.value = 'Norge';
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
        const address = String(formData.get('address') || '').trim();
        const zip = String(formData.get('zip') || '').trim();
        const city = String(formData.get('city') || '').trim();
        const country = String(formData.get('country') || 'Norge').trim();
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
            address,
            zip,
            city,
            country,
            label,
            labels: [label],
            status,
            updatedAt: new Date().toISOString(),
            updatedBy: 'admin'
        };

        try {
            if (this.editingContactId) {
                await window.firebaseService.db.collection('contacts').doc(this.editingContactId).set(contactData, { merge: true });
                this.notify("Kontakt oppdatert!");
            } else {
                await window.firebaseService.db.collection('contacts').add({
                    ...contactData,
                    createdAt: new Date().toISOString(),
                    createdBy: 'admin'
                });
                this.notify("Kontakt lagret!");
            }
            if (status === 'NETTSTEDSMEDLEM') {
                await this.syncContactToUserCollection(email, `${firstName} ${lastName}`.trim(), phone, address, zip, city, country);
            }
            this.toggleModal(false);
            event.target.reset();
            await this.loadContacts();
        } catch (error) {
            console.error("Error saving contact:", error);
            this.notify("Kunne ikke lagre: " + error.message, 'error');
        }
    }

    async syncContactToUserCollection(email, displayName, phone, address = '', zip = '', city = '', country = '') {
        if (!email) return;
        try {
            const db = window.firebaseService.db;
            const emailLower = email.toLowerCase().trim();
            const snap = await db.collection('users').where('email', '==', emailLower).get();
            
            const userData = {
                email: emailLower,
                displayName: displayName || '',
                phone: phone || '',
                address: address || '',
                zip: zip || '',
                city: city || '',
                country: country || 'Norge',
                syncedFromCrm: true
            };

            if (snap.empty) {
                const newDoc = await db.collection('users').add({
                    ...userData,
                    role: 'medlem',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                try {
                    await db.collection('admin_notifications').add({
                        type: 'NEW_USER_REGISTRATION',
                        userId: newDoc.id,
                        userEmail: emailLower,
                        userName: displayName || '',
                        message: `Brukerprofil automatisk opprettet fra CRM: ${displayName || emailLower}`,
                        read: false,
                        timestamp: firebase.firestore.FieldValue.serverTimestamp()
                    });
                } catch (err) {
                    console.warn('Kunne ikke opprette admin-varsel:', err);
                }
                
                this.notify(`Opprettet også brukerprofil for ${emailLower}!`);
            } else {
                // If user exists, update their details
                const userDoc = snap.docs[0];
                await userDoc.ref.update({
                    displayName: displayName || '',
                    phone: phone || '',
                    address: address || '',
                    zip: zip || '',
                    city: city || '',
                    country: country || 'Norge',
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
        } catch (e) {
            console.error('Error syncing contact to users collection:', e);
            this.notify('Feil ved synkronisering til brukerprofil: ' + e.message, 'error');
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
            await window.firebaseService.db.collection('contacts').doc(contactId).delete();
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

        // Robust fallback: Oppretter en nydelig, animert toast i grensesnittet
        let container = document.getElementById('crm-toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'crm-toast-container';
            container.style.cssText = `
                position: fixed;
                bottom: 24px;
                right: 24px;
                z-index: 9999;
                display: flex;
                flex-direction: column;
                gap: 8px;
                pointer-events: none;
            `;
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.style.cssText = `
            padding: 12px 20px;
            border-radius: 8px;
            background: ${type === 'error' ? '#ef4444' : type === 'warning' ? '#f97316' : '#10b981'};
            color: #ffffff;
            font-family: 'Inter', sans-serif;
            font-size: 14px;
            font-weight: 500;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            transform: translateY(20px);
            opacity: 0;
            transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            pointer-events: auto;
            display: flex;
            align-items: center;
            gap: 8px;
        `;
        
        const icon = type === 'error' ? 'error' : type === 'warning' ? 'warning' : 'check_circle';
        toast.innerHTML = `
            <span class="material-symbols-outlined" style="font-size: 18px;">${icon}</span>
            <span>${this.escapeHtml(message)}</span>
        `;

        container.appendChild(toast);

        // Trigger animasjon inn
        requestAnimationFrame(() => {
            toast.style.transform = 'translateY(0)';
            toast.style.opacity = '1';
        });

        // Fjern etter 4 sekunder
        setTimeout(() => {
            toast.style.transform = 'translateY(-20px)';
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
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
        this.updateBulkActionsVisibility();
    }

    updateBulkActionsVisibility() {
        const btn = document.getElementById('bulk-delete-btn');
        const text = document.getElementById('bulk-delete-text');
        
        const floatingBar = document.getElementById('hkm-bulk-actions-bar');
        const countText = document.getElementById('hkm-bulk-selected-count');
        const mergeBtn = document.getElementById('hkm-bulk-merge-btn');

        const count = this.selectedContactIds.size;
        
        if (mergeBtn) {
            mergeBtn.style.display = count === 2 ? 'inline-flex' : 'none';
        }

        if (count > 0) {
            if (btn && text) {
                btn.style.display = 'flex';
                text.textContent = `Slett ${count} ${count === 1 ? 'valgt' : 'valgte'}`;
            }
            if (floatingBar && countText) {
                floatingBar.style.display = 'block';
                requestAnimationFrame(() => {
                    floatingBar.classList.add('active');
                });
                countText.textContent = `${count} ${count === 1 ? 'kontakt' : 'kontakter'} valgt`;
            }
        } else {
            if (btn) btn.style.display = 'none';
            if (floatingBar) {
                floatingBar.classList.remove('active');
                setTimeout(() => {
                    if (this.selectedContactIds.size === 0) {
                        floatingBar.style.display = 'none';
                    }
                }, 400);
            }
        }
    }

    async deleteSelectedContacts() {
        const count = this.selectedContactIds.size;
        if (count === 0) return;

        const ok = await this.showCrmConfirmDialog({
            title: 'Masse-sletting',
            subtitle: 'Denne handlingen kan ikke angres.',
            message: `Er du sikker på at du vil slette ${count} ${count === 1 ? 'kontakt' : 'kontakter'} permanent?`,
            confirmLabel: `Slett ${count} ${count === 1 ? 'kontakt' : 'kontakter'}`,
            confirmVariant: 'danger',
            cancelLabel: 'Avbryt'
        });

        if (!ok) return;

        try {
            const db = window.firebaseService.db;
            const batch = db.batch();
            const ids = Array.from(this.selectedContactIds);
            
            ids.forEach(id => {
                batch.delete(db.collection('contacts').doc(id));
            });

            await batch.commit();
            
            this.selectedContactIds.clear();
            this.updateBulkActionsVisibility();
            
            // Reset select-all checkbox if it exists
            const selectAll = document.getElementById('select-all-contacts');
            if (selectAll) selectAll.checked = false;

            await this.loadContacts();
            this.notify(`${count} kontakter slettet.`);
        } catch (error) {
            console.error("Bulk delete error:", error);
            this.notify("Kunne ikke slette kontakter: " + error.message, 'error');
        }
    }

    async bulkEditLabels() {
        const count = this.selectedContactIds.size;
        if (count === 0) return;

        this.openCrmToolDialog({
            mode: 'choice',
            title: 'Endre etiketter (Massehandling)',
            subtitle: `Velg ny etikett for de ${count} valgte kontaktene.`,
            selectedValue: 'Medlem',
            confirmLabel: 'Oppdater etiketter',
            options: [
                { value: 'Ny', label: 'Ny' },
                { value: 'Medlem', label: 'Medlem' },
                { value: 'Frivillig', label: 'Frivillig' },
                { value: 'Lovsang', label: 'Lovsang' },
                { value: 'Giver', label: 'Giver' },
                { value: 'Abonnent', label: 'Abonnent' },
                { value: 'Leder', label: 'Leder' }
            ],
            onConfirm: async (selectedValue) => {
                const db = window.firebaseService.db;
                const batch = db.batch();
                const ids = Array.from(this.selectedContactIds);

                ids.forEach(id => {
                    batch.update(db.collection('contacts').doc(id), {
                        labels: [selectedValue],
                        updatedAt: new Date().toISOString()
                    });
                });

                await batch.commit();
                
                this.selectedContactIds.clear();
                const selectAll = document.getElementById('select-all-contacts');
                if (selectAll) selectAll.checked = false;
                
                this.updateBulkActionsVisibility();
                await this.loadContacts();
                this.notify(`Etiketter oppdatert til "${selectedValue}" for ${count} kontakter.`);
            }
        });
    }

    async bulkEditStatus() {
        const count = this.selectedContactIds.size;
        if (count === 0) return;

        this.openCrmToolDialog({
            mode: 'choice',
            title: 'Endre status (Massehandling)',
            subtitle: `Velg ny medlemsstatus for de ${count} valgte kontaktene.`,
            selectedValue: 'NETTSTEDSMEDLEM',
            confirmLabel: 'Oppdater status',
            options: [
                { value: 'NETTSTEDSMEDLEM', label: 'Nettstedsmedlem', description: 'Kontakter med aktiv medlemsstatus.' },
                { value: 'BLOKKERT', label: 'Blokkert', description: 'Markeres som blokkert (hindrer pålogging).' },
                { value: 'IKKE_MEDLEM', label: 'Ikke medlem', description: 'Fjern medlemsstatus (blir gjest).' }
            ],
            onConfirm: async (selectedValue) => {
                const db = window.firebaseService.db;
                const batch = db.batch();
                const ids = Array.from(this.selectedContactIds);

                ids.forEach(id => {
                    batch.update(db.collection('contacts').doc(id), {
                        status: selectedValue,
                        updatedAt: new Date().toISOString()
                    });
                });

                await batch.commit();

                // Sync to users collection if changed to NETTSTEDSMEDLEM
                if (selectedValue === 'NETTSTEDSMEDLEM') {
                    for (const id of ids) {
                        const contact = this.contacts.find(c => c.id === id);
                        if (contact && contact.email) {
                            const name = contact.displayName || `${contact.firstName || ''} ${contact.lastName || ''}`.trim();
                            await this.syncContactToUserCollection(
                                contact.email, 
                                name, 
                                contact.phone, 
                                contact.address, 
                                contact.zip, 
                                contact.city, 
                                contact.country
                            );
                        }
                    }
                }

                this.selectedContactIds.clear();
                const selectAll = document.getElementById('select-all-contacts');
                if (selectAll) selectAll.checked = false;

                this.updateBulkActionsVisibility();
                await this.loadContacts();
                this.notify(`Status oppdatert til "${selectedValue.replaceAll('_', ' ')}" for ${count} kontakter.`);
            }
        });
    }

    bulkMergeContacts() {
        const ids = Array.from(this.selectedContactIds);
        if (ids.length !== 2) {
            this.notify("Du må velge nøyaktig 2 kontakter for å slå dem sammen.", "error");
            return;
        }

        const contactA = this.contacts.find(c => c.id === ids[0]);
        const contactB = this.contacts.find(c => c.id === ids[1]);
        if (!contactA || !contactB) return;

        let modal = document.getElementById('crm-merge-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'crm-merge-modal';
            modal.style.cssText = 'display:none;position:fixed;inset:0;z-index:10000;align-items:center;justify-content:center;padding:24px;';
            document.body.appendChild(modal);
        }

        const labelA = contactA.displayName || `${contactA.firstName || ''} ${contactA.lastName || ''}`.trim() || contactA.email;
        const labelB = contactB.displayName || `${contactB.firstName || ''} ${contactB.lastName || ''}`.trim() || contactB.email;

        modal.innerHTML = `
            <div class="modal-backdrop" style="position:absolute;inset:0;background:rgba(15,23,42,.55);backdrop-filter:blur(8px);"></div>
            <div class="modal-content" style="max-width:640px;position:relative;background:#fff;border-radius:16px;box-shadow:0 20px 25px -5px rgba(0,0,0,0.1),0 10px 10px -5px rgba(0,0,0,0.04);width:100%;overflow:hidden;animation: modalAppear 0.3s cubic-bezier(0.16, 1, 0.3, 1);">
                <div class="modal-header" style="padding:20px 24px; border-bottom:1px solid #f1f5f9; display:flex; justify-content:space-between; align-items:center;">
                    <h3 style="margin:0; font-size:1.25rem; color:#0f172a; font-weight:700;">Slå sammen 2 kontakter</h3>
                    <button class="modal-close" type="button" style="background:transparent; border:none; color:#64748b; cursor:pointer; padding:4px; display:flex; align-items:center; justify-content:center;">
                        <span class="material-symbols-outlined" style="font-size:24px;">close</span>
                    </button>
                </div>
                <div class="modal-body" style="padding:24px; display:flex; flex-direction:column; gap:20px;">
                    <p style="margin:0; color:#475569; font-size:0.875rem; line-height:1.5;">
                        Velg hvilken kontakt du vil beholde som <strong>hovedkontakt</strong>. Data fra den andre kontakten (inkludert etiketter og manglende felt) vil bli flettet inn, og den sekundære kontakten vil deretter bli slettet.
                    </p>
                    
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
                        <!-- Alternativ A -->
                        <label style="border:2px solid #cbd5e1; border-radius:12px; padding:16px; cursor:pointer; display:flex; flex-direction:column; gap:8px; transition:all 0.2s;" class="merge-option" id="merge-opt-a">
                            <div style="display:flex; align-items:center; gap:8px;">
                                <input type="radio" name="primary-contact-select" value="A" checked style="accent-color:#1B4965;">
                                <strong style="color:#0f172a;">Behold denne (Hoved)</strong>
                            </div>
                            <div style="font-size:0.875rem; margin-top:8px;">
                                <div style="font-weight:700; color:#1e293b;">${this.escapeHtml(labelA)}</div>
                                <div style="color:#64748b; font-size:12px;">${this.escapeHtml(contactA.email)}</div>
                                <div style="color:#94a3b8; font-size:11px; margin-top:4px;">Status: ${this.escapeHtml(contactA.status || 'IKKE_MEDLEM')}</div>
                                <div style="color:#94a3b8; font-size:11px;">Tlf: ${this.escapeHtml(contactA.phone || 'Ingen tlf')}</div>
                            </div>
                        </label>

                        <!-- Alternativ B -->
                        <label style="border:2px solid #cbd5e1; border-radius:12px; padding:16px; cursor:pointer; display:flex; flex-direction:column; gap:8px; transition:all 0.2s;" class="merge-option" id="merge-opt-b">
                            <div style="display:flex; align-items:center; gap:8px;">
                                <input type="radio" name="primary-contact-select" value="B" style="accent-color:#1B4965;">
                                <strong style="color:#0f172a;">Behold denne (Hoved)</strong>
                            </div>
                            <div style="font-size:0.875rem; margin-top:8px;">
                                <div style="font-weight:700; color:#1e293b;">${this.escapeHtml(labelB)}</div>
                                <div style="color:#64748b; font-size:12px;">${this.escapeHtml(contactB.email)}</div>
                                <div style="color:#94a3b8; font-size:11px; margin-top:4px;">Status: ${this.escapeHtml(contactB.status || 'IKKE_MEDLEM')}</div>
                                <div style="color:#94a3b8; font-size:11px;">Tlf: ${this.escapeHtml(contactB.phone || 'Ingen tlf')}</div>
                            </div>
                        </label>
                    </div>
                </div>
                <div class="modal-footer" style="padding:16px 24px; background:#f8fafc; border-top:1px solid #f1f5f9; display:flex; justify-content:flex-end; gap:12px;">
                    <button class="btn-secondary modal-cancel" type="button" style="padding:8px 16px; border-radius:8px; border:1px solid #cbd5e1; background:#fff; cursor:pointer; font-weight:600;">Avbryt</button>
                    <button class="btn-primary modal-save" type="button" style="padding:8px 16px; border-radius:8px; background:#1B4965; color:#fff; border:none; cursor:pointer; font-weight:600;">Slå sammen</button>
                </div>
            </div>
        `;

        modal.style.display = 'flex';

        const updateBorders = () => {
            const optA = document.getElementById('merge-opt-a');
            const optB = document.getElementById('merge-opt-b');
            const radA = modal.querySelector('input[value="A"]');
            
            if (radA.checked) {
                optA.style.borderColor = '#1B4965';
                optA.style.background = '#f0f4f8';
                optB.style.borderColor = '#cbd5e1';
                optB.style.background = '#fff';
            } else {
                optB.style.borderColor = '#1B4965';
                optB.style.background = '#f0f4f8';
                optA.style.borderColor = '#cbd5e1';
                optA.style.background = '#fff';
            }
        };

        updateBorders();
        modal.querySelectorAll('input[name="primary-contact-select"]').forEach(input => {
            input.addEventListener('change', updateBorders);
        });

        const closeModal = () => {
            modal.style.display = 'none';
        };

        modal.querySelector('.modal-backdrop').addEventListener('click', closeModal);
        modal.querySelector('.modal-close').addEventListener('click', closeModal);
        modal.querySelector('.modal-cancel').addEventListener('click', closeModal);

        const saveBtn = modal.querySelector('.modal-save');
        saveBtn.addEventListener('click', async () => {
            const isA = modal.querySelector('input[value="A"]').checked;
            const primary = isA ? contactA : contactB;
            const secondary = isA ? contactB : contactA;

            closeModal();
            await this.executeMergeContacts(primary, secondary);
        });
    }

    async executeMergeContacts(primary, secondary) {
        this.notify('Slår sammen kontakter...');
        try {
            const db = window.firebaseService.db;

            // 1. Merge labels
            const labelsA = Array.isArray(primary.labels) ? primary.labels : (primary.label ? [primary.label] : []);
            const labelsB = Array.isArray(secondary.labels) ? secondary.labels : (secondary.label ? [secondary.label] : []);
            const mergedLabels = Array.from(new Set([...labelsA, ...labelsB])).filter(Boolean);

            // 2. Build merged contact data (avoiding duplicates or empty fields)
            const mergedData = {
                firstName: primary.firstName || secondary.firstName || '',
                lastName: primary.lastName || secondary.lastName || '',
                displayName: primary.displayName || secondary.displayName || '',
                email: primary.email || secondary.email || '',
                phone: primary.phone || secondary.phone || '',
                address: primary.address || secondary.address || '',
                zip: primary.zip || secondary.zip || '',
                city: primary.city || secondary.city || '',
                country: primary.country || secondary.country || 'Norge',
                label: mergedLabels[0] || 'Medlem',
                labels: mergedLabels,
                status: primary.status === 'NETTSTEDSMEDLEM' || secondary.status === 'NETTSTEDSMEDLEM' ? 'NETTSTEDSMEDLEM' : primary.status || 'IKKE_MEDLEM',
                updatedAt: new Date().toISOString(),
                updatedBy: 'admin-merge'
            };

            // 3. Write updates and delete in a batch
            const batch = db.batch();
            batch.update(db.collection('contacts').doc(primary.id), mergedData);
            batch.delete(db.collection('contacts').doc(secondary.id));
            
            await batch.commit();

            // 4. If status became NETTSTEDSMEDLEM, ensure user profile exists
            if (mergedData.status === 'NETTSTEDSMEDLEM') {
                await this.syncContactToUserCollection(
                    mergedData.email, 
                    mergedData.displayName, 
                    mergedData.phone,
                    mergedData.address,
                    mergedData.zip,
                    mergedData.city,
                    mergedData.country
                );
            }

            this.selectedContactIds.clear();
            const selectAll = document.getElementById('select-all-contacts');
            if (selectAll) selectAll.checked = false;

            this.updateBulkActionsVisibility();
            await this.loadContacts();
            this.notify('Kontaktene ble slått sammen!');
        } catch (error) {
            console.error('Feil ved sammenslåing:', error);
            this.notify('Kunne ikke slå sammen: ' + error.message, 'error');
        }
    }

    bulkExportCsv() {
        const selectedIds = this.selectedContactIds;
        if (selectedIds.size === 0) return;

        const rows = this.contacts.filter(c => selectedIds.has(c.id));
        
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
        this.downloadTextFile(`hkm-kontakter-valgte-${stamp}.csv`, lines.join('\n'), 'text/csv;charset=utf-8;');
        this.notify(`Eksporterte ${rows.length} valgte kontakter til CSV.`);
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

    // --- PRO: Skeleton Loading ---
    renderSkeleton() {
        const tableBody = document.getElementById('contacts-table-body');
        if (!tableBody) return;

        let skeletonHtml = '';
        for (let i = 0; i < 6; i++) {
            skeletonHtml += `
                <tr>
                    <td class="col-check"><div class="skeleton" style="width:18px; height:18px;"></div></td>
                    <td>
                        <div class="contact-user">
                            <div class="skeleton skeleton-avatar"></div>
                            <div class="name-wrap">
                                <div class="skeleton skeleton-text" style="width:120px;"></div>
                                <div class="skeleton skeleton-text" style="width:60px; margin-top:4px;"></div>
                            </div>
                        </div>
                    </td>
                    <td><div class="skeleton skeleton-text" style="width:140px;"></div></td>
                    <td><div class="skeleton skeleton-text" style="width:100px;"></div></td>
                    <td><div class="skeleton skeleton-badge"></div></td>
                    <td><div class="skeleton skeleton-badge" style="width:40px;"></div></td>
                    <td><div class="skeleton skeleton-text" style="width:80px;"></div></td>
                    <td></td>
                </tr>
            `;
        }
        tableBody.innerHTML = skeletonHtml;
    }

    // --- PRO: Smart Avatars ---
    getAvatarColorClass(name) {
        if (!name) return 'color-1';
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        const colorIndex = (Math.abs(hash) % 7) + 1;
        return `color-${colorIndex}`;
    }

    // --- PRO: Quick Stats ---
    updateStats() {
        const totalEl = document.getElementById('stat-total-contacts');
        const newEl = document.getElementById('stat-new-contacts');
        const activeEl = document.getElementById('stat-active-now');
        if (!totalEl || !newEl || !activeEl) return;

        const total = this.contacts.length;
        
        // Count new (created last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const newCount = this.contacts.filter(c => {
            const created = c.createdAt ? new Date(c.createdAt) : null;
            return created && created > thirtyDaysAgo;
        }).length;

        // Active estimation (logged in last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const activeCount = this.contacts.filter(c => {
            const login = c.lastLogin ? (c.lastLogin.toDate ? c.lastLogin.toDate() : new Date(c.lastLogin)) : null;
            return login && login > sevenDaysAgo;
        }).length;

        totalEl.textContent = total.toLocaleString('no-NO');
        newEl.textContent = `+${newCount}`;
        activeEl.textContent = activeCount.toLocaleString('no-NO');
    }

    // --- PRO: Drawer System ---
    setupDrawerListeners() {
        const overlay = document.getElementById('contact-drawer-overlay');
        const closeBtn = document.getElementById('close-drawer-btn');
        if (overlay) overlay.onclick = () => this.closeDrawer();
        if (closeBtn) closeBtn.onclick = () => this.closeDrawer();
    }

    async openDrawer(contactId) {
        const contact = this.contacts.find(c => c.id === contactId);
        if (!contact) return;

        const overlay = document.getElementById('contact-drawer-overlay');
        const drawer = document.getElementById('contact-drawer');
        const body = document.getElementById('drawer-body');
        if (!overlay || !drawer || !body) return;

        overlay.classList.add('is-open');
        drawer.classList.add('is-open');

        // Initial loading state in drawer
        body.innerHTML = `
            <div class="drawer-section">
                <div class="skeleton skeleton-avatar" style="width:80px; height:80px; margin-bottom:16px;"></div>
                <div class="skeleton skeleton-text" style="width:200px; height:24px; margin-bottom:8px;"></div>
                <div class="skeleton skeleton-text" style="width:150px;"></div>
            </div>
            <div class="drawer-section">
                <div class="drawer-section-title">Aktivitetslogg</div>
                <div class="loader"></div>
            </div>
        `;

        // Render real profile info
        const firstName = contact.firstName || '';
        const lastName = contact.lastName || '';
        const fullName = contact.displayName || `${firstName} ${lastName}`.trim() || contact.email;
        const initials = firstName ? (firstName[0] + (lastName ? lastName[0] : '')).toUpperCase() : fullName[0].toUpperCase();
        const colorClass = this.getAvatarColorClass(fullName);

        body.innerHTML = `
            <div class="drawer-profile-header" style="text-align: center; margin-bottom: 40px;">
                <div class="avatar ${colorClass}" style="width: 80px; height: 80px; font-size: 28px; margin: 0 auto 16px auto;">${initials}</div>
                <h3 style="font-size: 22px; font-weight: 800; margin-bottom: 4px;">${this.escapeHtml(fullName)}</h3>
                <p style="color: var(--text-muted); font-size: 14px;">${this.escapeHtml(contact.email)}</p>
                <div style="margin-top: 16px; display: flex; justify-content: center; gap: 10px;">
                    <button class="btn btn-secondary btn-sm" onclick="window.crm.openEditContactModal('${contact.id}')">
                        <span class="material-symbols-outlined" style="font-size: 18px;">edit</span>
                        Rediger
                    </button>
                    <a href="mailto:${contact.email}" class="btn btn-primary btn-sm">
                        <span class="material-symbols-outlined" style="font-size: 18px;">mail</span>
                        Send e-post
                    </a>
                </div>
            </div>

            <div class="drawer-section">
                <div class="drawer-section-title">
                    <span class="material-symbols-outlined">info</span>
                    Kontaktinformasjon
                </div>
                <div style="display: grid; gap: 12px;">
                    <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--border-color);">
                        <span style="color: var(--text-muted); font-size: 13px;">Telefon</span>
                        <span style="font-weight: 600; font-size: 13px;">${this.escapeHtml(contact.phone || '-')}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--border-color);">
                        <span style="color: var(--text-muted); font-size: 13px;">Adresse</span>
                        <span style="font-weight: 600; font-size: 13px; text-align: right;">${[contact.address, [contact.zip, contact.city].filter(Boolean).join(' '), contact.country].filter(Boolean).join(', ') || '-'}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--border-color);">
                        <span style="color: var(--text-muted); font-size: 13px;">Rolle</span>
                        <span style="font-weight: 600; font-size: 13px;">${this.escapeHtml(this._roleLabel(contact.role))}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--border-color);">
                        <span style="color: var(--text-muted); font-size: 13px;">Medlem siden</span>
                        <span style="font-weight: 600; font-size: 13px;">${contact.createdAt ? new Date(contact.createdAt).toLocaleDateString('no-NO') : '-'}</span>
                    </div>
                </div>
            </div>

            <div class="drawer-section">
                <div class="drawer-section-title">
                    <span class="material-symbols-outlined">history</span>
                    Aktivitetslogg
                </div>
                <div id="drawer-timeline" class="timeline">
                    <div class="loader"></div>
                </div>
            </div>
        `;

        this.renderTimeline(contact);
    }

    closeDrawer() {
        const overlay = document.getElementById('contact-drawer-overlay');
        const drawer = document.getElementById('contact-drawer');
        if (overlay) overlay.classList.remove('is-open');
        if (drawer) drawer.classList.remove('is-open');
    }

    async renderTimeline(contact) {
        const timelineEl = document.getElementById('drawer-timeline');
        if (!timelineEl) return;

        try {
            // Simplified timeline based on user data
            const events = [];
            
            if (contact.createdAt) {
                events.push({ title: 'Bruker registrert', time: new Date(contact.createdAt), icon: 'person_add' });
            }
            if (contact.lastLogin) {
                const loginDate = contact.lastLogin.toDate ? contact.lastLogin.toDate() : new Date(contact.lastLogin);
                events.push({ title: 'Siste pålogging', time: loginDate, icon: 'login' });
            }
            if (contact.updatedAt) {
                events.push({ title: 'Profil oppdatert', time: new Date(contact.updatedAt), icon: 'edit' });
            }

            // Sort events by time
            events.sort((a, b) => b.time - a.time);

            if (events.length === 0) {
                timelineEl.innerHTML = '<p style="font-size: 13px; color: var(--text-muted); font-style: italic;">Ingen nylig aktivitet funnet.</p>';
                return;
            }

            timelineEl.innerHTML = events.map(event => `
                <div class="timeline-item">
                    <div class="timeline-dot"></div>
                    <div class="timeline-content">
                        <span class="timeline-time">${event.time.toLocaleDateString('no-NO')} kl. ${event.time.getHours().toString().padStart(2, '0')}:${event.time.getMinutes().toString().padStart(2, '0')}</span>
                        <div class="timeline-title">${event.title}</div>
                    </div>
                </div>
            `).join('');

        } catch (error) {
            console.error("Timeline error:", error);
            timelineEl.innerHTML = '<p style="color: red; font-size: 12px;">Kunne ikke laste tidslinje.</p>';
        }
    }
}

// Initialize on load
window.crm = new CRMManager();
