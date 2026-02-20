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

        if (addBtn) addBtn.onclick = () => this.toggleModal(true);
        closeBtns.forEach(btn => btn.onclick = () => this.toggleModal(false));

        // Manage Segments
        const manageSegmentsBtn = document.getElementById('manage-segments-btn');
        if (manageSegmentsBtn) manageSegmentsBtn.onclick = () => this.openSegmentsModal();

        const closeSegmentsBtns = document.querySelectorAll('.close-segments-modal');
        closeSegmentsBtns.forEach(btn => btn.onclick = () => this.closeSegmentsModal());

        // Create Segment Buttons (inside modal)
        const createSegmentBtns = document.querySelectorAll('.btn-create-segment');
        createSegmentBtns.forEach(btn => btn.onclick = () => this.createSegment());

        // Search
        const searchInput = document.getElementById('contact-search');
        if (searchInput) {
            searchInput.oninput = (e) => this.handleSearch(e.target.value);
        }

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

            this.filteredContacts = [...this.contacts];
            this.renderTable();
            this.updateViewSelector();
        } catch (error) {
            console.error("Error loading contacts:", error);
            tableBody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:red;">Feil ved lasting av kontakter.</td></tr>`;
        }
    }

    updateViewSelector() {
        const selector = document.querySelector('.view-selector');
        if (selector && selector.options.length > 0) {
            selector.options[0].textContent = `Alle kontakter (${this.contacts.length})`;
        }
    }

    renderTable() {
        const tableBody = document.getElementById('contacts-table-body');
        if (!tableBody) return;

        if (this.filteredContacts.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 40px;">Ingen kontakter funnet.</td></tr>`;
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

            return `
                <tr data-id="${contact.id}">
                    <td class="col-check">
                        <input type="checkbox" class="contact-checkbox" data-id="${contact.id}" ${this.selectedContactIds.has(contact.id) ? 'checked' : ''}>
                    </td>
                    <td>
                        <div class="contact-user">
                            <div class="avatar">${initials}</div>
                            <div class="name-wrap">
                                <span class="name">${fullName}</span>
                                <span class="sub">${contact.role || 'Bruker'}</span>
                            </div>
                        </div>
                    </td>
                    <td>${contact.email || '-'}</td>
                    <td>${contact.phone || '-'}</td>
                    <td><span class="badge ${statusClass}">${contact.status || 'INGEN'}</span></td>
                    <td>
                        <div class="labels-list">
                            ${this.renderLabels(contact.labels || [contact.label || 'Ny'])}
                        </div>
                    </td>
                    <td>${lastActivity}</td>
                    <td class="col-actions">
                        <button class="btn-icon">
                            <span class="material-symbols-outlined">more_horiz</span>
                        </button>
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
    }

    getStatusClass(status) {
        switch (status) {
            case 'NETTSTEDSMEDLEM': return 'status-member';
            case 'BLOKKERT': return 'status-blocked';
            default: return 'status-guest';
        }
    }

    renderLabels(labels) {
        if (!labels || labels.length === 0) return '';
        return labels.map(l => `<span class="label-pill">${l}</span>`).join('');
    }

    handleSearch(query) {
        const q = query.toLowerCase();
        this.filteredContacts = this.contacts.filter(c =>
            (c.firstName || '').toLowerCase().includes(q) ||
            (c.lastName || '').toLowerCase().includes(q) ||
            (c.email || '').toLowerCase().includes(q) ||
            (c.phone || '').toLowerCase().includes(q)
        );
        this.renderTable();
    }

    toggleModal(show) {
        const modal = document.getElementById('contact-modal');
        if (modal) modal.style.display = show ? 'flex' : 'none';
        this.isModalOpen = show;
    }

    async saveContact(event) {
        event.preventDefault();
        const formData = new FormData(event.target);
        const contactData = {
            firstName: formData.get('firstName'),
            lastName: formData.get('lastName'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            label: formData.get('label'),
            labels: [formData.get('label')],
            status: formData.get('status'),
            createdAt: new Date().toISOString(),
            createdBy: 'admin'
        };

        try {
            await window.firebaseService.db.collection('users').add(contactData);
            this.toggleModal(false);
            event.target.reset();
            this.loadContacts();
            showToast("Kontakt lagret!");
        } catch (error) {
            console.error("Error saving contact:", error);
            showToast("Kunne ikke lagre: " + error.message);
        }
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

    // New method to handle segment creation (Placeholders)
    createSegment() {
        // For now, just a placeholder alert as requested by "cannot set up or create segment yet"
        // In a real app, this would open another modal or input form
        const segmentName = prompt("Navn på nytt segment:");
        if (segmentName && segmentName.trim() !== "") {
            // Mock saving
            showToast(`Segmentet "${segmentName}" er opprettet (simulert).`);
            // Here we would call renderSegmentsList() to update the UI
        }
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
