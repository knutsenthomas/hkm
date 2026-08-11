/**
 * HKM CRM & Kontaktmodul Logic
 * Handles contact management, search, and Wix-style UI interactions.
 */

class CRMManager {
    constructor() {
        this.contacts = [];
        this.filteredContacts = [];
        this.selectedContactIds = new Set();
        this.editingContactLabels = new Set();
        this.isModalOpen = false;
        this.editingContactId = null;
        this.openContactMenuId = null;
        this.searchQuery = '';
        this.statusFilter = 'ALL';
        this.tagFilter = 'ALL';
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

        const syncPcoBtn = document.getElementById('sync-pco-btn');
        if (syncPcoBtn) syncPcoBtn.onclick = () => this.syncAllContactsWithPlanningCenter();

        const contactTagFilter = document.getElementById('contact-tag-filter');
        if (contactTagFilter) {
            contactTagFilter.onchange = (e) => {
                this.tagFilter = e.target.value;
                this.applyCurrentFiltersAndSearch();
                this.updateViewSelector();
            };
        }

        const importExportBtn = document.getElementById('import-export-btn');
        if (importExportBtn) importExportBtn.onclick = () => this.openImportExportDialog();

        // Mobile PCO Header Bar handlers (matching Groups page pattern)
        const mobileBackBtn = document.getElementById('btn-crm-mobile-back');
        if (mobileBackBtn) {
            mobileBackBtn.onclick = () => {
                if (window.history.length > 1) {
                    window.history.back();
                } else {
                    window.location.href = '/admin/index.html';
                }
            };
        }

        const navDropdownBtn = document.getElementById('btn-crm-nav-dropdown');
        const navMenu = document.getElementById('crm-nav-menu');
        const contextDropdownBtn = document.getElementById('btn-crm-context-menu');
        const contextMenu = document.getElementById('crm-context-menu');

        if (navDropdownBtn && navMenu) {
            navDropdownBtn.onclick = (e) => {
                e.stopPropagation();
                const isVisible = navMenu.style.display === 'block';
                if (contextMenu) contextMenu.style.display = 'none';
                navMenu.style.display = isVisible ? 'none' : 'block';
            };
        }

        if (contextDropdownBtn && contextMenu) {
            contextDropdownBtn.onclick = (e) => {
                e.stopPropagation();
                const isVisible = contextMenu.style.display === 'block';
                if (navMenu) navMenu.style.display = 'none';
                contextMenu.style.display = isVisible ? 'none' : 'block';
            };
        }

        document.addEventListener('click', () => {
            if (navMenu) navMenu.style.display = 'none';
            if (contextMenu) contextMenu.style.display = 'none';
        });

        document.getElementById('ctx-crm-create')?.addEventListener('click', () => {
            this.openCreateContactModal();
        });

        document.getElementById('ctx-crm-sync-pco')?.addEventListener('click', () => {
            this.syncAllContactsWithPlanningCenter();
        });

        document.getElementById('ctx-crm-import-export')?.addEventListener('click', () => {
            this.openImportExportDialog();
        });

        document.getElementById('ctx-crm-manage-views')?.addEventListener('click', () => {
            this.openViewPresetDialog();
        });

        document.querySelectorAll('[data-crm-filter]').forEach(item => {
            item.onclick = () => {
                const filterVal = item.getAttribute('data-crm-filter');
                document.querySelectorAll('[data-crm-filter]').forEach(el => el.classList.remove('active'));
                item.classList.add('active');
                
                const titleSpan = document.getElementById('crm-header-current-view');
                if (titleSpan) titleSpan.textContent = item.querySelector('span:last-child')?.textContent || 'Kontakter';

                const viewSelector = document.querySelector('.view-selector');
                if (viewSelector) {
                    if (filterVal === 'NEW') viewSelector.selectedIndex = 1;
                    else if (filterVal === 'MEMBERS') viewSelector.selectedIndex = 2;
                    else viewSelector.selectedIndex = 0;
                    viewSelector.dispatchEvent(new Event('change'));
                }
            };
        });

        const importFileInput = document.getElementById('contacts-import-file');
        if (importFileInput) {
            importFileInput.onchange = (e) => this.handleCsvImport(e);
        }

        // Custom label creation listeners
        const labelSelect = document.getElementById('contact-label-select');
        const newLabelContainer = document.getElementById('new-label-input-container');
        const newLabelInput = document.getElementById('custom-new-label-input');
        const toggleNewLabelBtn = document.getElementById('btn-toggle-new-label');
        const addCustomLabelBtn = document.getElementById('btn-add-custom-label');

        const showNewLabelInput = () => {
            if (newLabelContainer) {
                newLabelContainer.style.display = 'block';
                if (newLabelInput) {
                    newLabelInput.value = '';
                    newLabelInput.focus();
                }
            }
        };

        if (labelSelect) {
            labelSelect.addEventListener('change', (e) => {
                const val = e.target.value;
                if (val === '__CREATE_NEW__') {
                    showNewLabelInput();
                } else if (val) {
                    if (!this.editingContactLabels) this.editingContactLabels = new Set();
                    this.editingContactLabels.add(val);
                    this.renderSelectedLabelPills();
                    labelSelect.value = '';
                    if (newLabelContainer) newLabelContainer.style.display = 'none';
                }
            });
        }

        if (toggleNewLabelBtn) {
            toggleNewLabelBtn.addEventListener('click', (e) => {
                e.preventDefault();
                showNewLabelInput();
            });
        }

        const handleAddNewLabel = () => {
            if (!newLabelInput) return;
            const val = newLabelInput.value.trim();
            if (!val) return;

            if (!this.editingContactLabels) this.editingContactLabels = new Set();
            this.editingContactLabels.add(val);
            this.populateLabelOptions();
            this.renderSelectedLabelPills();
            if (newLabelContainer) newLabelContainer.style.display = 'none';
            this.notify(`Etiketten "${val}" ble lagt til!`, 'success');
        };

        if (addCustomLabelBtn) {
            addCustomLabelBtn.addEventListener('click', (e) => {
                e.preventDefault();
                handleAddNewLabel();
            });
        }

        if (newLabelInput) {
            newLabelInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddNewLabel();
                }
            });
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

        const hkmBulkEmail = document.getElementById('hkm-bulk-email-btn');
        if (hkmBulkEmail) hkmBulkEmail.onclick = () => this.bulkSendEmail();

        const hkmBulkTag = document.getElementById('hkm-bulk-tag-btn');
        if (hkmBulkTag) hkmBulkTag.onclick = () => this.bulkEditLabels();

        const hkmBulkStatus = document.getElementById('hkm-bulk-status-btn');
        if (hkmBulkStatus) hkmBulkStatus.onclick = () => this.bulkEditStatus();

        const hkmBulkMerge = document.getElementById('hkm-bulk-merge-btn');
        if (hkmBulkMerge) hkmBulkMerge.onclick = () => this.bulkMergeContacts();

        const hkmBulkExport = document.getElementById('hkm-bulk-export-btn');
        if (hkmBulkExport) hkmBulkExport.onclick = () => this.bulkExportCsv();

        const hkmBulkExportGoogle = document.getElementById('hkm-bulk-export-google-btn');
        if (hkmBulkExportGoogle) hkmBulkExportGoogle.onclick = () => this.exportGoogleGroupsCsv(true);

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

            const urlParams = new URLSearchParams(window.location.search);
            const editId = urlParams.get('edit');
            if (editId) {
                window.history.replaceState({}, document.title, window.location.pathname);
                this.openEditContactModal(editId);
            } else if (urlParams.get('action') === 'add-contact' || sessionStorage.getItem('pendingFabAction') === 'add-contact-btn') {
                sessionStorage.removeItem('pendingFabAction');
                if (urlParams.get('action') === 'add-contact') {
                    window.history.replaceState({}, document.title, window.location.pathname);
                }
                this.openCreateContactModal();
            }
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
            let suffix = '';
            if (this.statusFilter && this.statusFilter !== 'ALL') {
                suffix += ` • Status: ${this.statusFilter.replaceAll('_', ' ')}`;
            }
            if (this.tagFilter && this.tagFilter !== 'ALL') {
                suffix += ` • Etikett: ${this.tagFilter === '__NO_TAGS__' ? 'Uten' : this.tagFilter}`;
            }
            selector.options[0].textContent = filtered === total
                ? `Alle kontakter (${total})`
                : `Alle kontakter (${filtered}/${total})${suffix}`;
        }

        const filterBtn = document.getElementById('filter-contacts-btn');
        if (filterBtn) {
            const isFiltered = (this.statusFilter && this.statusFilter !== 'ALL') || (this.tagFilter && this.tagFilter !== 'ALL');
            filterBtn.classList.toggle('active-filter', isFiltered);
            if (isFiltered) {
                filterBtn.style.borderColor = '#d17d39';
                filterBtn.style.color = '#d17d39';
                filterBtn.style.background = '#fff7ed';
                filterBtn.innerHTML = `<span class="material-symbols-outlined">filter_list</span>`;
                filterBtn.title = 'Filtrer (Aktiv)';
            } else {
                filterBtn.style.borderColor = '';
                filterBtn.style.color = '';
                filterBtn.style.background = '';
                filterBtn.innerHTML = `<span class="material-symbols-outlined">filter_list</span>`;
                filterBtn.title = 'Filtrer kontakter';
            }
        }

        this.populateTagFilterSelect();
    }

    populateTagFilterSelect() {
        const select = document.getElementById('contact-tag-filter');
        if (!select) return;

        const availableLabels = this.getAllAvailableLabels();
        const currentValue = this.tagFilter || 'ALL';

        const optionsHtml = `
            <option value="ALL" ${currentValue === 'ALL' ? 'selected' : ''}>Alle etiketter</option>
            <option value="__NO_TAGS__" ${currentValue === '__NO_TAGS__' ? 'selected' : ''}>Uten etikett</option>
            ${availableLabels.map(tag => `
                <option value="${this.escapeHtml(tag)}" ${tag === currentValue ? 'selected' : ''}>
                    ${this.escapeHtml(tag)}
                </option>
            `).join('')}
        `;

        if (select.innerHTML !== optionsHtml) {
            select.innerHTML = optionsHtml;
        }
        select.value = currentValue;
    }

    resetAllFilters() {
        this.statusFilter = 'ALL';
        this.tagFilter = 'ALL';
        this.searchQuery = '';
        const searchInput = document.getElementById('contact-search');
        if (searchInput) searchInput.value = '';
        this.applyCurrentFiltersAndSearch();
        this.updateViewSelector();
        this.notify('Alle filtre er nullstilt.');
    }

    renderTable() {
        const tableBody = document.getElementById('contacts-table-body');
        if (!tableBody) return;

        if (this.filteredContacts.length === 0) {
            const isFiltered = (this.statusFilter && this.statusFilter !== 'ALL') || (this.tagFilter && this.tagFilter !== 'ALL') || Boolean(this.searchQuery);
            let emptyMsg = 'Ingen kontakter funnet.';
            if (isFiltered) {
                emptyMsg = `Ingen kontakter matchet de valgte filtrene.<br><button type="button" class="btn btn-outline" style="margin-top: 12px; padding: 6px 14px; font-size: 13px; cursor: pointer;" onclick="if(window.crmSystem) window.crmSystem.resetAllFilters();">Nullstill alle filtre</button>`;
            }
            tableBody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 40px; color: #64748b;">${emptyMsg}</td></tr>`;
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
            const formatDate = (dateVal) => window.HKMUtils?.formatDate ? window.HKMUtils.formatDate(dateVal) : '-';

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
                                <button class="contact-row-menu-item" type="button" data-action="email" data-id="${safeId}">
                                    <span class="material-symbols-outlined">mail</span>
                                    Send e-post
                                </button>
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

                if (action === 'email') {
                    this.openSendEmailModalForId(id);
                    return;
                }
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

    getContactLabels(c) {
        if (!c) return [];
        const list = [];
        if (Array.isArray(c.labels)) {
            c.labels.forEach(l => l && list.push(String(l).trim()));
        } else if (c.labels) {
            list.push(String(c.labels).trim());
        }

        if (Array.isArray(c.tags)) {
            c.tags.forEach(t => t && list.push(String(t).trim()));
        } else if (c.tags) {
            list.push(String(c.tags).trim());
        }

        if (c.label && !list.includes(String(c.label).trim())) {
            list.push(String(c.label).trim());
        }
        if (c.tag && !list.includes(String(c.tag).trim())) {
            list.push(String(c.tag).trim());
        }

        return list.filter(Boolean);
    }

    getAllAvailableLabels() {
        const defaultSet = new Set(['Ny', 'Medlem', 'Frivillig', 'Lovsang', 'Giver', 'Fast giver', 'Abonnent', 'Leder', 'Ungdom', 'Styre']);
        (this.contacts || []).forEach((c) => {
            const labels = this.getContactLabels(c);
            labels.forEach((l) => {
                if (l && typeof l === 'string' && l.trim()) {
                    defaultSet.add(l.trim());
                }
            });
        });
        return Array.from(defaultSet).sort((a, b) => a.localeCompare(b, 'no'));
    }

    applyCurrentFiltersAndSearch() {
        const q = this.searchQuery.trim().toLowerCase();
        const normalizedFilter = this.normalizeStatusFilter(this.statusFilter);
        const selectedTag = (this.tagFilter || 'ALL').trim();

        this.filteredContacts = this.contacts.filter((c) => {
            const contactLabels = this.getContactLabels(c);
            const effectiveLabels = contactLabels.length > 0 ? contactLabels : ['Ny'];
            const labelStr = effectiveLabels.join(' ');

            const matchesSearch = !q || [
                c.firstName,
                c.lastName,
                c.displayName,
                c.email,
                c.phone,
                labelStr
            ].some((value) => String(value || '').toLowerCase().includes(q));

            if (!matchesSearch) return false;

            if (normalizedFilter !== 'ALL') {
                const contactStatus = this.normalizeStatusFilter(c.status || 'IKKE_MEDLEM');
                if (contactStatus !== normalizedFilter) return false;
            }

            if (selectedTag !== 'ALL') {
                if (selectedTag === '__NO_TAGS__') {
                    if (contactLabels.length > 0) return false;
                } else {
                    const targetTag = selectedTag.toLowerCase();
                    const hasMatchingTag = effectiveLabels.some(l => l.toLowerCase() === targetTag);
                    if (!hasMatchingTag) return false;
                }
            }

            return true;
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
                    icon.style.fontSize = '14px';
                    icon.style.lineHeight = '1';
                    icon.style.flexShrink = '0';
                    icon.style.display = 'inline-flex';
                    icon.style.alignItems = 'center';
                    icon.style.position = 'relative';
                    icon.style.top = '-1px';
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
            footerLeftHtml: config.footerLeftHtml || '',
            dialogClass: config.dialogClass || '',
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

        const modalContentEl = document.querySelector('.crm-tool-modal-content');
        if (modalContentEl) {
            if (state.dialogClass) {
                modalContentEl.className = 'modal-content crm-tool-modal-content ' + state.dialogClass;
            } else {
                modalContentEl.className = 'modal-content crm-tool-modal-content';
            }
        }

        titleEl.textContent = state.title || 'Verktøy';
        subtitleEl.textContent = state.subtitle || '';
        subtitleEl.style.display = state.subtitle ? '' : 'none';

        confirmBtn.textContent = state.confirmLabel || 'Bruk valg';
        confirmBtn.dataset.variant = state.confirmVariant === 'danger' ? 'danger' : 'primary';
        cancelBtn.textContent = state.cancelLabel || 'Avbryt';
        cancelBtn.style.display = state.showCancel === false ? 'none' : '';

        let leftNoteEl = footerEl.querySelector('.crm-tool-footer-left-note');
        if (!leftNoteEl) {
            leftNoteEl = document.createElement('div');
            leftNoteEl.className = 'crm-tool-footer-left-note';
            leftNoteEl.style.marginRight = 'auto';
            leftNoteEl.style.display = 'flex';
            leftNoteEl.style.alignItems = 'center';
            leftNoteEl.style.gap = '6px';
            leftNoteEl.style.fontSize = '13px';
            footerEl.insertBefore(leftNoteEl, footerEl.firstChild);
        }

        if (state.footerLeftHtml) {
            leftNoteEl.innerHTML = state.footerLeftHtml;
            leftNoteEl.style.display = 'flex';
        } else {
            leftNoteEl.innerHTML = '';
            leftNoteEl.style.display = 'none';
        }

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
        const availableLabels = this.getAllAvailableLabels();

        const statusOptions = [
            { value: 'ALL', label: 'Alle kontakter (Ingen statusfilter)' },
            { value: 'NETTSTEDSMEDLEM', label: 'Nettstedsmedlemmer' },
            { value: 'BLOKKERT', label: 'Blokkerte kontakter' },
            { value: 'IKKE_MEDLEM', label: 'Ikke medlem' }
        ];

        const currentStatus = this.statusFilter || 'ALL';
        const currentTag = this.tagFilter || 'ALL';

        const html = `
            <div class="crm-filter-modal-content" style="display: flex; flex-direction: column; gap: 20px; padding: 4px 0;">
                <div class="crm-filter-group" style="display: flex; flex-direction: column; gap: 8px;">
                    <label style="font-weight: 700; font-size: 13px; color: #334155; text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; gap: 6px;">
                        <span class="material-symbols-outlined" style="font-size: 18px; color: #64748b;">verified_user</span>
                        Medlemsstatus
                    </label>
                    <select id="crm-modal-status-select" class="form-control" style="width: 100%; padding: 10px 14px; border-radius: 12px; border: 1px solid #cbd5e1; font-size: 14px; background: #ffffff; color: #0f172a; outline: none; cursor: pointer;">
                        ${statusOptions.map(opt => `
                            <option value="${opt.value}" ${opt.value === currentStatus ? 'selected' : ''}>
                                ${opt.label}
                            </option>
                        `).join('')}
                    </select>
                </div>

                <div class="crm-filter-group" style="display: flex; flex-direction: column; gap: 8px;">
                    <label style="font-weight: 700; font-size: 13px; color: #334155; text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; gap: 6px;">
                        <span class="material-symbols-outlined" style="font-size: 18px; color: #64748b;">label</span>
                        Etikett / Tag
                    </label>
                    <select id="crm-modal-tag-select" class="form-control" style="width: 100%; padding: 10px 14px; border-radius: 12px; border: 1px solid #cbd5e1; font-size: 14px; background: #ffffff; color: #0f172a; outline: none; cursor: pointer;">
                        <option value="ALL" ${currentTag === 'ALL' ? 'selected' : ''}>Alle etiketter (Ingen etikettfilter)</option>
                        <option value="__NO_TAGS__" ${currentTag === '__NO_TAGS__' ? 'selected' : ''}>Uten etikett (Ingen koder/tags)</option>
                        ${availableLabels.map(tag => `
                            <option value="${this.escapeHtml(tag)}" ${tag === currentTag ? 'selected' : ''}>
                                Etikett: ${this.escapeHtml(tag)}
                            </option>
                        `).join('')}
                    </select>
                </div>

                ${(currentStatus !== 'ALL' || currentTag !== 'ALL') ? `
                    <div style="display: flex; justify-content: flex-end; margin-top: 4px;">
                        <button type="button" id="crm-reset-filters-btn" style="background: none; border: none; color: #ef4444; font-size: 13px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 4px; padding: 4px 0;">
                            <span class="material-symbols-outlined" style="font-size: 16px;">restart_alt</span>
                            Tilbakestill alle filtre
                        </button>
                    </div>
                ` : ''}
            </div>
        `;

        this.openCrmToolDialog({
            mode: 'custom-html',
            title: 'Filtrer kontakter',
            subtitle: 'Velg medlemsstatus og/eller etikett for å spisse listen.',
            html: html,
            confirmLabel: 'Bruk filter',
            onConfirm: async () => {
                const statusSelect = document.getElementById('crm-modal-status-select');
                const tagSelect = document.getElementById('crm-modal-tag-select');
                
                if (statusSelect) {
                    this.statusFilter = this.normalizeStatusFilter(statusSelect.value);
                }
                if (tagSelect) {
                    this.tagFilter = tagSelect.value;
                }

                this.applyCurrentFiltersAndSearch();
                this.updateViewSelector();

                const isFiltered = (this.statusFilter && this.statusFilter !== 'ALL') || (this.tagFilter && this.tagFilter !== 'ALL');
                if (isFiltered) {
                    this.notify('Filtrering påført kontaktene.');
                } else {
                    this.notify('Alle filtre ble tilbakestilt.');
                }
            }
        });

        setTimeout(() => {
            const resetBtn = document.getElementById('crm-reset-filters-btn');
            if (resetBtn) {
                resetBtn.addEventListener('click', () => {
                    const statusSelect = document.getElementById('crm-modal-status-select');
                    const tagSelect = document.getElementById('crm-modal-tag-select');
                    if (statusSelect) statusSelect.value = 'ALL';
                    if (tagSelect) tagSelect.value = 'ALL';
                });
            }
        }, 50);
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
                { value: 'skjul_etiketter', label: 'Skjul etikett-kolonnen', description: 'Skjuler kolonnen for etiketter i tabellen (påvirker kun tabelloppsett, ikke filtrering).' },
                { value: 'skjul_siste_aktivitet', label: 'Skjul siste aktivitet', description: 'Skjuler aktivitetskolonnen for bedre oversikt på smale skjermer.' },
                { value: 'fokus', label: 'Fokus', description: 'Skjuler både etiketter og siste aktivitet i tabelloppsettet.' }
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
                    id: 'export-google-groups',
                    icon: 'group_add',
                    title: 'Google Groups',
                    description: 'Eksportér i spesialformat for bulk-opplasting til Google Groups.',
                    onSelect: async () => this.exportGoogleGroupsCsv(false)
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
            return /[";\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
        };

        const lines = [
            headers.join(';'),
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
            ].map(escapeCsv).join(';'))
        ];

        const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
        const bom = '\uFEFF';
        this.downloadTextFile(`hkm-kontakter-${stamp}.csv`, bom + lines.join('\n'), 'text/csv;charset=utf-8;');
        this.notify(`Eksporterte ${rows.length} kontakter til CSV.`);
    }

    exportGoogleGroupsCsv(selectedOnly = false) {
        let rows = [];
        if (selectedOnly) {
            const selectedIds = this.selectedContactIds;
            if (selectedIds.size === 0) return;
            rows = this.contacts.filter(c => selectedIds.has(c.id));
        } else {
            rows = this.filteredContacts;
        }

        if (!rows.length) {
            this.notify('Ingen kontakter å eksportere.', 'error');
            return;
        }

        // Google Workspace Groups bulk upload requires comma separation and specific headers.
        const headers = ['Group Email [Required]', 'Member Email', 'Member Type', 'Member Role'];
        const escapeCsv = (val) => {
            const str = String(val ?? '');
            return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
        };

        const lines = [
            headers.join(','),
            ...rows.map((c) => [
                '', // User must fill this in Excel, or we leave it blank so they can paste the column easily.
                c.email || '',
                'USER', // Default Member Type
                'MEMBER' // Default Member Role
            ].map(escapeCsv).join(','))
        ];

        const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
        // Do not add BOM or use semicolon for Google Groups specific export, to ensure compatibility with Google parser.
        this.downloadTextFile(`hkm-google-groups-${stamp}.csv`, lines.join('\n'), 'text/csv;charset=utf-8;');
        this.notify(`Eksporterte ${rows.length} kontakter for Google Groups.`);
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
        this.closeDrawer();
        const contact = this.contacts.find(c => c.id === contactId);
        if (!contact) {
            this.notify('Fant ikke kontakten som skulle redigeres.', 'error');
            return;
        }

        this.editingContactId = contactId;
        this.applyContactFormState({ mode: 'edit', contact });
        this.toggleModal(true);
    }

    renderSelectedLabelPills() {
        const container = document.getElementById('contact-selected-labels-pills');
        if (!container) return;

        if (!this.editingContactLabels || this.editingContactLabels.size === 0) {
            container.innerHTML = `<span style="font-size: 12px; color: var(--text-muted, #94a3b8); font-style: italic;">Ingen etiketter valgt ennå</span>`;
            return;
        }

        let html = '';
        this.editingContactLabels.forEach(lbl => {
            const safeLbl = this.escapeHtml(lbl);
            html += `
                <div class="selected-label-pill">
                    <span>${safeLbl}</span>
                    <span class="remove-label-x" data-label="${safeLbl}" title="Fjern etikett">&times;</span>
                </div>
            `;
        });

        container.innerHTML = html;

        container.querySelectorAll('.remove-label-x').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                const labelToRemove = btn.getAttribute('data-label');
                if (labelToRemove && this.editingContactLabels) {
                    this.editingContactLabels.delete(labelToRemove);
                    this.renderSelectedLabelPills();
                }
            };
        });
    }

    populateLabelOptions(selectedLabel = '') {
        const labelSelect = document.getElementById('contact-label-select');
        if (!labelSelect) return;

        const availableLabels = this.getAllAvailableLabels();
        const uniqueLabels = new Set(availableLabels);

        if (selectedLabel && selectedLabel !== '__CREATE_NEW__') {
            uniqueLabels.add(selectedLabel);
        }

        let html = `<option value="" disabled selected>+ Velg etikett for å legge til...</option>`;
        uniqueLabels.forEach(lbl => {
            html += `<option value="${this.escapeHtml(lbl)}">${this.escapeHtml(lbl)}</option>`;
        });
        html += `<option value="__CREATE_NEW__">+ Opprett helt ny etikett...</option>`;

        labelSelect.innerHTML = html;
    }

    applyContactFormState({ mode, contact = null }) {
        const form = document.getElementById('contact-form');
        const titleEl = document.getElementById('contact-modal-title');
        const submitBtn = form?.querySelector('button[type="submit"]');
        const newLabelContainer = document.getElementById('new-label-input-container');
        if (newLabelContainer) newLabelContainer.style.display = 'none';

        if (!form) return;

        let labelsList = [];
        if (contact) {
            if (Array.isArray(contact.labels) && contact.labels.length > 0) {
                labelsList = contact.labels;
            } else if (contact.label) {
                labelsList = [contact.label];
            }
        }
        if (labelsList.length === 0 && mode === 'create') {
            labelsList = ['Ny'];
        }

        this.editingContactLabels = new Set(labelsList);
        this.populateLabelOptions();
        this.renderSelectedLabelPills();

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
            if (form.elements.nationalIdNumber) form.elements.nationalIdNumber.value = contact.nationalIdNumber || contact.ssn || contact.fnr || '';
            if (form.elements.address) form.elements.address.value = contact.address || '';
            if (form.elements.zip) form.elements.zip.value = contact.zip || '';
            if (form.elements.city) form.elements.city.value = contact.city || '';
            if (form.elements.country) form.elements.country.value = contact.country || 'Norge';
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
        const nationalIdNumber = String(formData.get('nationalIdNumber') || '').trim();
        const address = String(formData.get('address') || '').trim();
        const zip = String(formData.get('zip') || '').trim();
        const city = String(formData.get('city') || '').trim();
        const country = String(formData.get('country') || 'Norge').trim();
        const labelsArray = Array.from(this.editingContactLabels || []);
        if (labelsArray.length === 0) {
            labelsArray.push('Ny');
        }
        const primaryLabel = labelsArray[0] || 'Ny';
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
            nationalIdNumber,
            ssn: nationalIdNumber,
            address,
            zip,
            city,
            country,
            label: primaryLabel,
            labels: labelsArray,
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
                btn.title = text.textContent;
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

    openSendEmailModalForId(contactId) {
        const contact = this.contacts.find(c => String(c.id) === String(contactId));
        if (contact) {
            this.openSendEmailModal([contact]);
        }
    }

    bulkSendEmail() {
        if (!this.selectedContactIds || this.selectedContactIds.size === 0) {
            this.notify('Ingen kontakter valgt.', 'warning');
            return;
        }
        const selected = this.contacts.filter(c => this.selectedContactIds.has(c.id));
        this.openSendEmailModal(selected);
    }

        async openSendEmailModal(targetContacts = []) {
        const contactsWithEmail = targetContacts.filter(c => c.email && c.email.includes('@'));

        if (contactsWithEmail.length === 0) {
            this.notify('Ingen av de valgte kontaktene har en gyldig e-postadresse.', 'error');
            return;
        }

        const user = window.firebaseService?.auth?.currentUser || (window.firebase && window.firebase.auth().currentUser);
        const adminEmail = user?.email || 'post@hiskingdomministry.no';
        const adminName = user?.displayName || adminEmail.split('@')[0];

        const unsubscribedCount = targetContacts.filter(c => c.subscribed === false || c.status === 'unsubscribed').length;

        const recipientSummary = contactsWithEmail.length === 1
            ? `${contactsWithEmail[0].displayName || (contactsWithEmail[0].firstName + ' ' + (contactsWithEmail[0].lastName || '')).trim() || contactsWithEmail[0].email} (${contactsWithEmail[0].email})`
            : `${contactsWithEmail.length} kontakter (${contactsWithEmail.slice(0, 3).map(c => c.email).join(', ')}${contactsWithEmail.length > 3 ? '...' : ''})`;

        const attachments = [];

        const footerLeftHtml = unsubscribedCount > 0
            ? `<span class="material-symbols-outlined" style="font-size: 17px; color: #d97706;">warning</span> <span style="color: #d97706; font-weight: 600; font-size: 13px;">${unsubscribedCount} Blokkerte / avmeldte e-poster</span>`
            : `<span style="color: #64748b; font-size: 12.5px; font-weight: 500;">✓ Alle ${contactsWithEmail.length} mottakere er aktive</span>`;

        const html = `
            <div class="crm-send-email-modal" style="display: flex; flex-direction: column; gap: 16px; padding: 2px 0; width: 100%; max-width: 100%; min-width: 0; box-sizing: border-box; overflow: hidden;">
                <!-- Recipient Header Card -->
                <div style="background: linear-gradient(135deg, #f8fafc 0%, #edf2f7 100%); padding: 14px 18px; border-radius: 16px; border: 1px solid #e2e8f0; display: flex; align-items: center; gap: 14px; box-shadow: 0 2px 8px rgba(0,0,0,0.02); width: 100%; max-width: 100%; min-width: 0; box-sizing: border-box;">
                    <div style="width: 44px; height: 44px; border-radius: 12px; background: linear-gradient(135deg, #d17d39, #bd4f2a); color: white; display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 4px 12px rgba(209,125,57,0.25);">
                        <span class="material-symbols-outlined" style="font-size: 24px;">mark_email_read</span>
                    </div>
                    <div style="flex: 1; min-width: 0;">
                        <div style="font-size: 16px; font-weight: 800; color: #0f172a; letter-spacing: -0.01em;">
                            ${contactsWithEmail.length} ${contactsWithEmail.length === 1 ? 'mottaker' : 'mottakere'}
                        </div>
                        <div style="font-size: 12.5px; color: #64748b; margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                            ${contactsWithEmail.length === 1 
                                ? `Sendes til ${this.escapeHtml(recipientSummary)}` 
                                : `Sendes til alle ${contactsWithEmail.length} valgte kontakter.`}
                        </div>
                    </div>
                </div>

                <!-- 2-Column Meta Row: From & Template -->
                <div class="crm-email-meta-grid" style="display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 14px; width: 100%; max-width: 100%; min-width: 0; box-sizing: border-box;">
                    <div style="display: flex; flex-direction: column; gap: 6px; min-width: 0; max-width: 100%; box-sizing: border-box;">
                        <label style="font-weight: 700; font-size: 13px; color: #334155; display: flex; align-items: center; gap: 4px;">
                            <span>Fra:</span>
                            <span class="material-symbols-outlined" style="font-size: 15px; color: #94a3b8;" title="Avsenderadresse">info</span>
                        </label>
                        <select id="crm-email-from-mode" class="form-control" style="width: 100%; max-width: 100%; min-width: 0; height: 42px; padding: 0 12px; border-radius: 10px; border: 1px solid #cbd5e1; font-size: 13.5px; background: white; color: #0f172a; outline: none; cursor: pointer; font-weight: 500; box-sizing: border-box; text-overflow: ellipsis; overflow: hidden;">
                            <option value="post" selected>His Kingdom Ministry &lt;post@hiskingdomministry.no&gt;</option>
                            <option value="admin">${this.escapeHtml(adminName)} &lt;${this.escapeHtml(adminEmail)}&gt;</option>
                        </select>
                    </div>

                    <div style="display: flex; flex-direction: column; gap: 6px; min-width: 0; max-width: 100%; box-sizing: border-box;">
                        <label style="font-weight: 700; font-size: 13px; color: #334155;">Mal:</label>
                        <div style="position: relative; width: 100%; max-width: 100%; min-width: 0; box-sizing: border-box;">
                            <span class="material-symbols-outlined" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); font-size: 18px; color: #94a3b8; pointer-events: none;">search</span>
                            <select id="crm-email-template-select" class="form-control" style="width: 100%; max-width: 100%; min-width: 0; height: 42px; padding: 0 12px 0 36px !important; border-radius: 10px; border: 1px solid #cbd5e1; font-size: 13.5px; background: white; color: #0f172a; outline: none; cursor: pointer; font-weight: 500; box-sizing: border-box; text-overflow: ellipsis; overflow: hidden;">
                                <option value="">Velg e-postmal...</option>
                                <option value="summer_camp">Youth Summer Camp is coming!</option>
                                <option value="newsletter">Månedsoppdatering & Nyheter</option>
                                <option value="encouragement">Personlig Oppmuntring</option>
                                <option value="thank_you">Takk for Støtte / Gave</option>
                            </select>
                        </div>
                    </div>
                </div>

                <!-- Subject Input -->
                <div style="display: flex; flex-direction: column; gap: 6px; width: 100%; max-width: 100%; min-width: 0; box-sizing: border-box;">
                    <label for="crm-email-subject" style="font-weight: 700; font-size: 13px; color: #334155;">Emne / Tittel:</label>
                    <input type="text" id="crm-email-subject" class="form-control" placeholder="F.eks. Velkommen til Youth Summer Camp!..." style="width: 100%; max-width: 100%; min-width: 0; height: 42px; padding: 0 14px; border-radius: 10px; border: 1px solid #cbd5e1; font-size: 14px; outline: none; background: white; font-weight: 500; color: #0f172a; box-sizing: border-box;">
                </div>

                <!-- Rich Editor Section -->
                <div style="display: flex; flex-direction: column; gap: 6px; width: 100%; max-width: 100%; min-width: 0; box-sizing: border-box;">
                    <label style="font-weight: 700; font-size: 13px; color: #334155;">Innhold / Melding:</label>
                    <div style="border: 1px solid #cbd5e1; border-radius: 14px; overflow: hidden; background: #ffffff; box-shadow: 0 2px 8px rgba(0,0,0,0.02); width: 100%; max-width: 100%; min-width: 0; box-sizing: border-box;">
                        <!-- Formatting Toolbar -->
                        <div class="crm-editor-toolbar">
                            <button type="button" class="editor-btn" data-cmd="bold" title="Fet tekst (B)" style="font-weight: 800; font-size: 15px;">
                                B
                            </button>
                            <button type="button" class="editor-btn" data-cmd="italic" title="Kursiv (I)" style="font-style: italic; font-weight: 700; font-size: 15px;">
                                I
                            </button>
                            <button type="button" class="editor-btn" data-cmd="strikeThrough" title="Gjennomstreking" style="text-decoration: line-through; font-weight: 700; font-size: 14px;">
                                S
                            </button>
                            <button type="button" class="editor-btn" data-cmd="createLink" title="Sett inn lenke">
                                <span class="material-symbols-outlined" style="font-size: 19px;">link</span>
                            </button>
                            
                            <div class="crm-editor-divider" style="width: 1px; height: 18px; background: #cbd5e1; margin: 0 3px; flex-shrink: 0;"></div>

                            <!-- Format Selector -->
                            <select id="crm-editor-format-block" title="Tekststørrelse / Overskrift" style="height: 32px; border-radius: 6px; border: 1px solid #cbd5e1; background: white; padding: 0 8px; font-size: 12.5px; font-weight: 600; color: #334155; cursor: pointer; outline: none; flex-shrink: 0;">
                                <option value="p">Normal tekst</option>
                                <option value="h1">Stor overskrift (H1)</option>
                                <option value="h2">Overskrift (H2)</option>
                                <option value="h3">Underoverskrift (H3)</option>
                            </select>

                            <button type="button" class="editor-btn" data-cmd="blockquote" title="Sitat (Quote)">
                                <span class="material-symbols-outlined" style="font-size: 19px;">format_quote</span>
                            </button>

                            <div class="crm-editor-divider" style="width: 1px; height: 18px; background: #cbd5e1; margin: 0 3px; flex-shrink: 0;"></div>

                            <button type="button" class="editor-btn" data-cmd="insertUnorderedList" title="Kulepunkter">
                                <span class="material-symbols-outlined" style="font-size: 19px;">format_list_bulleted</span>
                            </button>
                            <button type="button" class="editor-btn" data-cmd="insertOrderedList" title="Nummerert liste">
                                <span class="material-symbols-outlined" style="font-size: 19px;">format_list_numbered</span>
                            </button>
                            <button type="button" class="editor-btn" data-cmd="outdent" title="Minsk innrykk">
                                <span class="material-symbols-outlined" style="font-size: 19px;">format_indent_decrease</span>
                            </button>
                            <button type="button" class="editor-btn" data-cmd="indent" title="Øk innrykk">
                                <span class="material-symbols-outlined" style="font-size: 19px;">format_indent_increase</span>
                            </button>

                            <div class="crm-editor-divider" style="width: 1px; height: 18px; background: #cbd5e1; margin: 0 3px; flex-shrink: 0;"></div>

                            <button type="button" id="crm-email-add-att-btn" title="Legg til vedlegg">
                                <span class="material-symbols-outlined" style="font-size: 19px;">attach_file</span>
                            </button>
                            <input type="file" id="crm-email-file-input" multiple style="display: none;">

                            <button type="button" class="editor-btn" data-cmd="undo" title="Angre">
                                <span class="material-symbols-outlined" style="font-size: 19px;">undo</span>
                            </button>
                            <button type="button" class="editor-btn" data-cmd="redo" title="Gjenta">
                                <span class="material-symbols-outlined" style="font-size: 19px;">redo</span>
                            </button>

                            <div class="crm-editor-divider" style="width: 1px; height: 18px; background: #cbd5e1; margin: 0 3px; flex-shrink: 0;"></div>

                            <!-- Variable Tag Selector -->
                            <select id="crm-email-merge-tag-select" title="Sett inn flettefelt ({{ tag }})" style="height: 32px; border-radius: 6px; border: 1px solid #cbd5e1; background: white; padding: 0 8px; font-size: 12.5px; font-weight: 700; color: #2563eb; cursor: pointer; outline: none; flex-shrink: 0;">
                                <option value="">{{ }}</option>
                                <option value="{{ to.first_name }}">Mottakers fornavn ({{ to.first_name }})</option>
                                <option value="{{ to.full_name }}">Mottakers fullt navn ({{ to.full_name }})</option>
                                <option value="{{ to.email }}">Mottakers e-post ({{ to.email }})</option>
                            </select>

                            <!-- Inline Image Button -->
                            <button type="button" id="crm-email-insert-img-btn" title="Sett inn inline bilde i e-posten" style="width: auto !important; min-width: 32px !important; padding: 0 10px !important; border-radius: 6px !important; border: 1px solid #cbd5e1 !important; background: #ffffff !important; flex: 0 0 auto !important;">
                                <span class="material-symbols-outlined" style="font-size: 18px; color: #2563eb;">image</span>
                                <span style="font-size: 12px; font-weight: 600; color: #334155; margin-left: 4px;">Bilde</span>
                            </button>

                            <!-- Inline YouTube Video Button -->
                            <button type="button" id="crm-email-insert-yt-btn" title="Sett inn YouTube-video med forhåndsvisning" style="width: auto !important; min-width: 32px !important; padding: 0 10px !important; border-radius: 6px !important; border: 1px solid #cbd5e1 !important; background: #ffffff !important; flex: 0 0 auto !important;">
                                <span class="material-symbols-outlined" style="font-size: 18px; color: #ef4444;">smart_display</span>
                                <span style="font-size: 12px; font-weight: 600; color: #334155; margin-left: 4px;">YouTube</span>
                            </button>
                        </div>

                        <!-- Editable Content Area -->
                        <div id="crm-email-body-editor" contenteditable="true" style="min-height: 220px; max-height: 380px; overflow-y: auto; padding: 16px; font-size: 14px; line-height: 1.6; color: #0f172a; outline: none; background: white; width: 100%; box-sizing: border-box;"></div>
                    </div>
                </div>

                <!-- Attachments List Container -->
                <div id="crm-email-attachments-list" style="display: flex; flex-wrap: wrap; gap: 6px; margin-top: -4px; width: 100%; box-sizing: border-box;"></div>

                <!-- Send Options Card -->
                <div style="display: flex; flex-direction: column; gap: 12px; margin-top: 4px; padding: 14px 16px; background: #f8fafc; border-radius: 14px; border: 1px solid #e2e8f0; width: 100%; max-width: 100%; box-sizing: border-box;">
                    <label style="display: flex; align-items: center; gap: 12px; font-size: 13.5px; font-weight: 600; color: #334155; cursor: pointer; user-select: none; margin: 0; width: 100%; box-sizing: border-box;">
                        <input type="checkbox" id="crm-email-send-copy" style="width: 18px !important; min-width: 18px !important; height: 18px !important; min-height: 18px !important; accent-color: #d17d39 !important; cursor: pointer; flex-shrink: 0;">
                        <span style="word-break: break-word; min-width: 0; flex: 1;">Send en kopi av denne e-posten til meg selv (${this.escapeHtml(adminEmail)})</span>
                    </label>
                    
                    <div style="display: flex; flex-direction: column; gap: 8px; width: 100%; box-sizing: border-box;">
                        <label style="display: flex; align-items: center; gap: 12px; font-size: 13.5px; font-weight: 600; color: #334155; cursor: pointer; user-select: none; margin: 0; width: 100%; box-sizing: border-box;">
                            <input type="checkbox" id="crm-email-schedule-delivery" style="width: 18px !important; min-width: 18px !important; height: 18px !important; min-height: 18px !important; accent-color: #d17d39 !important; cursor: pointer; flex-shrink: 0;">
                            <span style="word-break: break-word; min-width: 0; flex: 1;">Planlegg utsending til et senere tidspunkt</span>
                        </label>
                        <div id="crm-email-schedule-picker-container" style="display: none; padding-left: 30px; margin-top: 2px; width: 100%; box-sizing: border-box;">
                            <input type="datetime-local" id="crm-email-schedule-time" style="padding: 8px 12px; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 13px; color: #0f172a; outline: none; background: white; width: 100%; max-width: 100%; min-width: 0; box-sizing: border-box;">
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.openCrmToolDialog({
            mode: 'custom-html',
            title: 'Send e-post',
            subtitle: '',
            dialogClass: 'crm-send-email-modal-wrapper',
            footerLeftHtml: footerLeftHtml,
            html: html,
            confirmLabel: 'Send e-post',
            onConfirm: async () => {
                const fromModeEl = document.getElementById('crm-email-from-mode');
                const subjectEl = document.getElementById('crm-email-subject');
                const editorEl = document.getElementById('crm-email-body-editor');
                const sendCopyEl = document.getElementById('crm-email-send-copy');
                const scheduleEl = document.getElementById('crm-email-schedule-delivery');
                const scheduleTimeEl = document.getElementById('crm-email-schedule-time');

                const fromMode = fromModeEl ? fromModeEl.value : 'post';
                const subject = subjectEl ? subjectEl.value.trim() : '';
                const htmlContent = editorEl ? editorEl.innerHTML.trim() : '';
                const textContent = editorEl ? (editorEl.innerText || editorEl.textContent || '').trim() : '';

                if (!subject) {
                    this.notify('Vennligst oppgi et emne for e-posten.', 'error');
                    return false;
                }
                if (!htmlContent || htmlContent === '<br>') {
                    this.notify('Vennligst skriv inn meldingstekst.', 'error');
                    return false;
                }

                const sendCopy = sendCopyEl ? sendCopyEl.checked : false;
                const isScheduled = scheduleEl ? scheduleEl.checked : false;
                const scheduledTime = (isScheduled && scheduleTimeEl) ? scheduleTimeEl.value : null;

                if (isScheduled && !scheduledTime) {
                    this.notify('Vennligst velg dato og tidspunkt for planlagt utsending.', 'warning');
                    return false;
                }

                try {
                    const currentUser = window.firebaseService?.auth?.currentUser || (window.firebase && window.firebase.auth().currentUser);
                    const idToken = currentUser ? await currentUser.getIdToken() : '';

                    let finalRecipients = [...contactsWithEmail];
                    if (sendCopy && adminEmail && !finalRecipients.some(c => c.email === adminEmail)) {
                        finalRecipients.push({ email: adminEmail, displayName: adminName + ' (Kopi)' });
                    }

                    let sentCount = 0;
                    let failCount = 0;

                    this.notify(`Sender e-post til ${finalRecipients.length} ${finalRecipients.length === 1 ? 'mottaker' : 'mottakere'}...`);

                    for (const contact of finalRecipients) {
                        try {
                            const fromName = fromMode === 'admin'
                                ? (currentUser?.displayName || currentUser?.email || 'HKM Admin')
                                : 'His Kingdom Ministry';

                            const payload = {
                                to: contact.email,
                                subject: subject,
                                message: textContent,
                                html: htmlContent,
                                attachments: attachments,
                                fromMode: fromMode,
                                fromName: fromName,
                                scheduledTime: scheduledTime
                            };

                            const response = await fetch('https://sendmanualemail-42bhgdjkcq-uc.a.run.app', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    ...(idToken ? { 'Authorization': `Bearer ${idToken}` } : {})
                                },
                                body: JSON.stringify(payload)
                            });

                            const result = await response.json().catch(() => ({}));
                            if (response.ok && (result.success || result.messageId || result.id)) {
                                sentCount++;
                            } else {
                                console.warn(`Feil ved sending til ${contact.email}:`, result.error || response.statusText);
                                failCount++;
                            }
                        } catch (err) {
                            console.error(`E-postfeil for ${contact.email}:`, err);
                            failCount++;
                        }
                    }

                    if (sentCount > 0) {
                        this.notify(`Sendte ${sentCount} e-post${sentCount === 1 ? '' : 'er'}!${failCount > 0 ? ` (${failCount} feilet)` : ''}`);
                    } else {
                        this.notify('Kunne ikke sende e-post. Sjekk konsollen for detaljer.', 'error');
                    }
                    return true;
                } catch (e) {
                    console.error('Kunne ikke fullføre e-postsending:', e);
                    this.notify('Feil ved sending av e-post: ' + e.message, 'error');
                    return false;
                }
            }
        });

        // Attach editor toolbar, templates, image, youtube & attachment listeners
        setTimeout(async () => {
            const editor = document.getElementById('crm-email-body-editor');
            const toolbar = document.querySelector('.crm-editor-toolbar');
            const templateSelect = document.getElementById('crm-email-template-select');
            const subjectInput = document.getElementById('crm-email-subject');

            // Built-in email templates dictionary
            const builtInTemplates = {
                summer_camp: {
                    subject: 'Youth Summer Camp is coming!',
                    body: `<div style="text-align: center; margin-bottom: 20px;">
                        <img src="https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=800&auto=format&fit=crop&q=80" alt="Centerville Church Summer Camp" style="width: 100%; max-width: 600px; border-radius: 16px; box-shadow: 0 4px 16px rgba(0,0,0,0.1); display: block; margin: 0 auto;">
                    </div>
                    <p>Hi {{ to.first_name }},</p>
                    <p>Summer Camp is back! This July 20–25, your student will spend a week building friendships, growing in their faith, and having an absolute blast. We've got an incredible lineup of speakers, games, and activities planned — it's going to be a week they won't forget.</p>
                    <p>Space fills up fast, so sign up soon on <strong>Church Center</strong>.</p>
                    <p>Can't wait to see your student there!</p>`
                },
                newsletter: {
                    subject: 'Månedsoppdatering fra His Kingdom Ministry 📖',
                    body: `<div style="text-align: center; margin-bottom: 20px;">
                        <img src="https://images.unsplash.com/photo-1499209974431-9dac3cea004b?w=800&auto=format&fit=crop&q=80" alt="Bibel og Kaffe" style="width: 100%; max-width: 600px; border-radius: 16px; box-shadow: 0 4px 16px rgba(0,0,0,0.1); display: block; margin: 0 auto;">
                    </div>
                    <p>Kjære {{ to.first_name }},</p>
                    <p>Vi ønsker å dele noen fantastiske nyheter og oppdateringer med deg denne måneden!</p>
                    <p>Gud gjør utrolig mye igjennom fellesskapet vårt, og vi er så takknemlige for at du er en del av denne reisen.</p>
                    <div style="margin: 24px 0; text-align: center;">
                        <a href="https://www.hiskingdomministry.no/blogg.html" target="_blank" style="background: #2563eb; color: #ffffff; padding: 12px 24px; border-radius: 10px; text-decoration: none; font-weight: 700; display: inline-block;">Les siste artikler</a>
                    </div>`
                },
                encouragement: {
                    subject: 'En personlig hilsen og oppmuntring til deg 🙏',
                    body: `<p>Hei {{ to.first_name }},</p>
                    <p>Vi i His Kingdom Ministry ønsker å sende deg en liten oppmuntring i hverdagen.</p>
                    <blockquote style="border-left: 4px solid #2563eb; margin: 16px 0; padding: 12px 18px; background: #f8fafc; border-radius: 0 12px 12px 0; font-style: italic; color: #334155;">
                        "For jeg vet hvilke tanker jeg har med dere, sier Herren, fredstanker og ikke tanker til ulykke, til å gi dere fremtid og håp." — Jeremia 29:11
                    </blockquote>
                    <p>Må Guds fred og velsignelse fylle din uke!</p>`
                },
                thank_you: {
                    subject: 'Tusen takk for din støtte til Guds rike! 💖',
                    body: `<p>Kjære {{ to.first_name }},</p>
                    <p>Tusen takk for din trofaste støtte og engasjement for His Kingdom Ministry.</p>
                    <p>Takket være din støtte kan vi nå ut til ennå flere med evangeliet, undervisning og ressurser.</p>
                    <p>Med vennlig hilsen,<br><strong>His Kingdom Ministry</strong></p>`
                }
            };

            // Load custom templates from Firestore if available
            if (templateSelect && window.firebaseService?.db) {
                try {
                    const snap = await window.firebaseService.db.collection('email_templates').get();
                    if (snap && !snap.empty) {
                        snap.forEach(doc => {
                            const tData = doc.data();
                            const opt = document.createElement('option');
                            opt.value = 'fs_' + doc.id;
                            opt.textContent = tData.name || tData.subject || doc.id;
                            templateSelect.appendChild(opt);
                            builtInTemplates['fs_' + doc.id] = {
                                subject: tData.subject || '',
                                body: tData.body || ''
                            };
                        });
                    }
                } catch (err) {
                    console.warn('Kunne ikke laste e-postmaler fra Firestore:', err);
                }
            }

            // Template Change Handler
            if (templateSelect) {
                templateSelect.addEventListener('change', () => {
                    const val = templateSelect.value;
                    if (val && builtInTemplates[val]) {
                        const t = builtInTemplates[val];
                        if (subjectInput) subjectInput.value = t.subject;
                        if (editor) editor.innerHTML = t.body;
                    }
                });
            }

            // Schedule Delivery Toggle
            const scheduleCheckbox = document.getElementById('crm-email-schedule-delivery');
            const schedulePickerContainer = document.getElementById('crm-email-schedule-picker-container');
            if (scheduleCheckbox && schedulePickerContainer) {
                scheduleCheckbox.addEventListener('change', () => {
                    schedulePickerContainer.style.display = scheduleCheckbox.checked ? 'block' : 'none';
                });
            }

            // Format Block Selector (H1, H2, H3, P)
            const formatBlockSelect = document.getElementById('crm-editor-format-block');
            if (formatBlockSelect && editor) {
                formatBlockSelect.addEventListener('change', () => {
                    editor.focus();
                    const tag = formatBlockSelect.value;
                    document.execCommand('formatBlock', false, `<${tag}>`);
                });
            }

            // Merge Tag Selector ({{ to.first_name }}, etc.)
            const mergeTagSelect = document.getElementById('crm-email-merge-tag-select');
            if (mergeTagSelect && editor) {
                mergeTagSelect.addEventListener('change', () => {
                    const tag = mergeTagSelect.value;
                    if (tag) {
                        editor.focus();
                        document.execCommand('insertHTML', false, tag);
                        mergeTagSelect.value = '';
                    }
                });
            }

            // Insert Inline Image Handler
            const insertImgBtn = document.getElementById('crm-email-insert-img-btn');
            if (insertImgBtn && editor) {
                insertImgBtn.addEventListener('click', () => {
                    editor.focus();
                    const url = window.prompt('Lim inn bildelenke (URL):', 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=800');
                    if (url && url.trim()) {
                        const imgCardHtml = `<div style="text-align: center; margin: 18px 0;"><img src="${url.trim()}" alt="Bilde" style="max-width: 100%; height: auto; border-radius: 14px; box-shadow: 0 4px 16px rgba(0,0,0,0.08); display: block; margin: 0 auto;"></div><p><br></p>`;
                        document.execCommand('insertHTML', false, imgCardHtml);
                    }
                });
            }

            // Insert Inline YouTube Video Handler
            const insertYtBtn = document.getElementById('crm-email-insert-yt-btn');
            if (insertYtBtn && editor) {
                insertYtBtn.addEventListener('click', () => {
                    editor.focus();
                    const inputUrl = window.prompt('Lim inn YouTube-nettadresse (f.eks: https://www.youtube.com/watch?v=VIDEO_ID):');
                    if (inputUrl && inputUrl.trim()) {
                        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
                        const match = inputUrl.trim().match(regExp);
                        const videoId = (match && match[2].length === 11) ? match[2] : inputUrl.trim();

                        if (videoId) {
                            const ytCardHtml = `<div class="email-yt-card" style="margin: 20px 0; text-align: center;">
                                <a href="https://www.youtube.com/watch?v=${videoId}" target="_blank" rel="noopener noreferrer" style="display: inline-block; position: relative; text-decoration: none; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 24px rgba(0,0,0,0.15); max-width: 100%;">
                                    <img src="https://img.youtube.com/vi/${videoId}/hqdefault.jpg" alt="Se video på YouTube" style="width: 100%; max-width: 540px; display: block; border-radius: 16px; aspect-ratio: 16/9; object-fit: cover;">
                                    <div style="position: absolute; inset: 0; background: rgba(15, 23, 42, 0.35); display: flex; align-items: center; justify-content: center;">
                                        <div style="width: 64px; height: 64px; border-radius: 50%; background: #ff0000; display: flex; align-items: center; justify-content: center; box-shadow: 0 6px 20px rgba(255,0,0,0.4);">
                                            <div style="width: 0; height: 0; border-top: 10px solid transparent; border-bottom: 10px solid transparent; border-left: 18px solid #ffffff; margin-left: 4px;"></div>
                                        </div>
                                    </div>
                                </a>
                            </div><p><br></p>`;
                            document.execCommand('insertHTML', false, ytCardHtml);
                        } else {
                            this.notify('Ugyldig YouTube-nettadresse.', 'error');
                        }
                    }
                });
            }

            // Toolbar Button Click Handlers
            if (toolbar && editor) {
                toolbar.querySelectorAll('.editor-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        e.preventDefault();
                        editor.focus();
                        const cmd = btn.dataset.cmd;
                        if (!cmd) return;

                        if (cmd === 'createLink') {
                            const url = window.prompt('Lim inn URL/lenke:');
                            if (url) document.execCommand('createLink', false, url);
                        } else if (cmd === 'blockquote') {
                            document.execCommand('formatBlock', false, '<blockquote>');
                        } else {
                            document.execCommand(cmd, false, null);
                        }
                    });

                    btn.addEventListener('mouseover', () => btn.style.background = '#e2e8f0');
                    btn.addEventListener('mouseout', () => btn.style.background = 'transparent');
                });
            }

            // Attachment Handler
            const addAttBtn = document.getElementById('crm-email-add-att-btn');
            const fileInput = document.getElementById('crm-email-file-input');

            if (addAttBtn && fileInput) {
                addAttBtn.addEventListener('click', () => fileInput.click());

                fileInput.addEventListener('change', async (e) => {
                    const files = Array.from(e.target.files || []);
                    for (const file of files) {
                        try {
                            let fileUrl = '';
                            if (window.firebaseService?.storage) {
                                const storageRef = window.firebaseService.storage.ref(`email_attachments/${Date.now()}_${file.name}`);
                                const snap = await storageRef.put(file);
                                fileUrl = await snap.ref.getDownloadURL();
                            } else {
                                fileUrl = await new Promise((resolve) => {
                                    const reader = new FileReader();
                                    reader.onload = (ev) => resolve(ev.target.result);
                                    reader.readAsDataURL(file);
                                });
                            }

                            attachments.push({
                                name: file.name,
                                size: (file.size / 1024).toFixed(1) + ' KB',
                                url: fileUrl,
                                type: file.type.startsWith('image/') ? 'image' : 'file'
                            });
                            renderAttachmentsList();
                        } catch (err) {
                            console.error('Vedleggsfeil:', err);
                            this.notify('Kunne ikke laste opp vedlegget: ' + file.name, 'error');
                        }
                    }
                });
            }

            function renderAttachmentsList() {
                const container = document.getElementById('crm-email-attachments-list');
                if (!container) return;

                if (attachments.length === 0) {
                    container.innerHTML = '';
                    return;
                }

                container.innerHTML = attachments.map((att, idx) => `
                    <div style="display: inline-flex; align-items: center; gap: 6px; padding: 5px 10px; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 99px; font-size: 12px; font-weight: 600; color: #334155;">
                        <span class="material-symbols-outlined" style="font-size: 16px; color: #64748b;">
                            ${att.type === 'image' ? 'image' : 'description'}
                        </span>
                        <span style="max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${att.name}</span>
                        <span style="color: #94a3b8; font-size: 11px;">(${att.size})</span>
                        <button type="button" data-remove-att="${idx}" style="background: none; border: none; padding: 0; cursor: pointer; color: #ef4444; display: inline-flex; align-items: center; justify-content: center; margin-left: 2px;">
                            <span class="material-symbols-outlined" style="font-size: 15px;">close</span>
                        </button>
                    </div>
                `).join('');

                container.querySelectorAll('[data-remove-att]').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const idx = parseInt(btn.dataset.removeAtt, 10);
                        attachments.splice(idx, 1);
                        renderAttachmentsList();
                    });
                });
            }
        }, 80);
    }

    async bulkEditLabels() {
        const count = this.selectedContactIds.size;
        if (count === 0) return;

        const availableLabels = this.getAllAvailableLabels();

        const html = `
            <div class="crm-bulk-labels-modal" style="display: flex; flex-direction: column; gap: 14px; padding: 2px 0;">
                <div style="font-weight: 700; font-size: 13px; color: #334155;">Velg en etikett for de ${count} valgte kontaktene:</div>
                
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 8px; max-height: 240px; overflow-y: auto; padding: 2px;">
                    ${availableLabels.map((tag, idx) => `
                        <label style="display: flex; align-items: center; gap: 8px; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 10px; cursor: pointer; background: white; transition: all 0.2s; font-size: 13px; font-weight: 600; color: #0f172a;" class="crm-label-option">
                            <input type="radio" name="crm-bulk-label-radio" value="${this.escapeHtml(tag)}" ${idx === 0 ? 'checked' : ''} style="accent-color: #d17d39; cursor: pointer;">
                            <span>${this.escapeHtml(tag)}</span>
                        </label>
                    `).join('')}
                    <label style="display: flex; align-items: center; gap: 8px; padding: 10px 12px; border: 1px dashed #d17d39; border-radius: 10px; cursor: pointer; background: #fff7ed; transition: all 0.2s; font-size: 13px; font-weight: 700; color: #c05d2a;" class="crm-label-option">
                        <input type="radio" name="crm-bulk-label-radio" value="__CUSTOM__" id="crm-label-radio-custom" style="accent-color: #d17d39; cursor: pointer;">
                        <span>+ Ny etikett...</span>
                    </label>
                </div>

                <div id="crm-custom-label-wrapper" style="display: none; flex-direction: column; gap: 6px; margin-top: 4px;">
                    <label style="font-weight: 700; font-size: 13px; color: #334155;">Skriv inn navnet på ny etikett:</label>
                    <input type="text" id="crm-custom-label-input" class="form-control" placeholder="F.eks. Konfirmant, Sponsor, etc." style="width: 100%; padding: 10px 14px; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 14px; outline: none;">
                </div>
            </div>
        `;

        this.openCrmToolDialog({
            mode: 'custom-html',
            title: 'Endre etiketter (Massehandling)',
            subtitle: `Velg eller opprett ny etikett for kontaktene.`,
            html: html,
            confirmLabel: 'Oppdater etiketter',
            onConfirm: async () => {
                const selectedRadio = document.querySelector('input[name="crm-bulk-label-radio"]:checked');
                if (!selectedRadio) {
                    this.notify('Vennligst velg en etikett.', 'warning');
                    return false;
                }

                let finalLabel = selectedRadio.value;
                if (finalLabel === '__CUSTOM__') {
                    const customInput = document.getElementById('crm-custom-label-input');
                    finalLabel = customInput ? customInput.value.trim() : '';
                    if (!finalLabel) {
                        this.notify('Vennligst skriv inn navnet på den nye etiketten.', 'error');
                        return false;
                    }
                }

                try {
                    const db = window.firebaseService.db;
                    const batch = db.batch();
                    const ids = Array.from(this.selectedContactIds);

                    ids.forEach(id => {
                        batch.update(db.collection('contacts').doc(id), {
                            labels: [finalLabel],
                            updatedAt: new Date().toISOString()
                        });
                    });

                    await batch.commit();
                    
                    this.selectedContactIds.clear();
                    const selectAll = document.getElementById('select-all-contacts');
                    if (selectAll) selectAll.checked = false;
                    
                    this.updateBulkActionsVisibility();
                    await this.loadContacts();
                    this.populateTagFilterSelect();
                    this.notify(`Etiketter oppdatert til "${finalLabel}" for ${count} kontakter.`);
                    return true;
                } catch (error) {
                    console.error("Bulk label update error:", error);
                    this.notify("Kunne ikke oppdatere etiketter: " + error.message, 'error');
                    return false;
                }
            }
        });

        // Add toggle listener for custom label input
        setTimeout(() => {
            const radios = document.querySelectorAll('input[name="crm-bulk-label-radio"]');
            const customWrapper = document.getElementById('crm-custom-label-wrapper');
            const customInput = document.getElementById('crm-custom-label-input');

            radios.forEach(radio => {
                radio.addEventListener('change', () => {
                    if (radio.value === '__CUSTOM__') {
                        if (customWrapper) customWrapper.style.display = 'flex';
                        if (customInput) customInput.focus();
                    } else {
                        if (customWrapper) customWrapper.style.display = 'none';
                    }
                });
            });
        }, 50);
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
            return /[";\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
        };

        const lines = [
            headers.join(';'),
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
            ].map(escapeCsv).join(';'))
        ];

        const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
        const bom = '\uFEFF';
        this.downloadTextFile(`hkm-kontakter-valgte-${stamp}.csv`, bom + lines.join('\n'), 'text/csv;charset=utf-8;');
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
                    <button class="btn btn-primary btn-sm" onclick="window.crm.openSendEmailModalForId('${contact.id}')">
                        <span class="material-symbols-outlined" style="font-size: 18px;">mail</span>
                        Send e-post
                    </button>
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
                        <span style="color: var(--text-muted); font-size: 13px;">Fødselsnummer</span>
                        <span style="font-weight: 600; font-size: 13px;">${this.escapeHtml(contact.nationalIdNumber || contact.ssn || contact.fnr || '-')}</span>
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

    async syncAllContactsWithPlanningCenter() {
        const btn = document.getElementById('sync-pco-btn');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = `<span class="material-symbols-outlined spin" style="font-size: 18px;">sync</span> Synkroniserer...`;
        }

        try {
            // 1. Export local Firestore contacts to Planning Center
            const contactsToSync = (this.contacts || []).map(c => {
                const nameStr = (c.name || c.displayName || `${c.firstName || ''} ${c.lastName || ''}`).trim();
                const nameParts = nameStr.split(' ');
                return {
                    firstName: nameParts[0] || 'Medlem',
                    lastName: nameParts.slice(1).join(' ') || '',
                    email: c.email || '',
                    phone: c.phone || c.phoneNumber || ''
                };
            }).filter(c => c.firstName || c.email);

            if (contactsToSync.length === 0) {
                alert('Ingen kontakter funnet i HKM for synkronisering.');
                return;
            }

            let totalSynced = 0;
            const batchSize = 5;

            for (let i = 0; i < contactsToSync.length; i += batchSize) {
                const batch = contactsToSync.slice(i, i + batchSize);
                if (btn) {
                    btn.innerHTML = `<span class="material-symbols-outlined spin" style="font-size: 18px;">sync</span> Synk (${Math.min(i + batchSize, contactsToSync.length)}/${contactsToSync.length})...`;
                }

                try {
                    const syncRes = await fetch('/api/pco-people', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ contacts: batch })
                    });

                    const syncData = await syncRes.json();
                    if (syncRes.ok && syncData.success) {
                        totalSynced += (syncData.syncedCount || 0);
                    }
                } catch (e) {
                    console.warn('PCO batch sync warning:', e);
                }

                // Pause 1.2s between batches to stay well under Planning Center's 100 req / 20s rate limit
                if (i + batchSize < contactsToSync.length) {
                    await new Promise(resolve => setTimeout(resolve, 1200));
                }
            }

            // 2. Fetch total count of people in Planning Center People
            const getRes = await fetch('/api/pco-people', { method: 'GET' });
            const getData = await getRes.json();
            const pcoPeopleCount = getData.count || (getData.data ? getData.data.length : 0);

            alert(`✅ Synkronisering fullført!\n- ${totalSynced} av ${contactsToSync.length} HKM-kontakter ble overført/oppdatert i Planning Center People.\n- Det finnes totalt ${pcoPeopleCount} personer i din Planning Center-konto.`);

        } catch (err) {
            console.error('Planning Center sync error:', err);
            alert(`⚠️ Synkronisering feilet: ${err.message}`);
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = `<span class="material-symbols-outlined" style="font-size: 18px;">cloud_sync</span> <span>Planning Center Synk</span>`;
            }
        }
    }
}

// Initialize on load
window.crm = new CRMManager();
