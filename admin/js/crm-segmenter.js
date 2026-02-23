/**
 * HKM CRM Segments Logic
 * Handles segment management, search, and UI interactions.
 */

class SegmentManager {
    constructor() {
        this.segments = [];
        this.filteredSegments = [];

        this.init();
    }

    async init() {
        console.log("Segment Manager Initializing...");

        // Setup UI Listeners
        this.setupEventListeners();

        // Wait for Firebase to be ready
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
                this.loadSegments();
            } else {
                window.location.href = 'login.html';
            }
        });
    }

    setupEventListeners() {
        const createSegmentBtn = document.getElementById('create-segment-btn');
        if (createSegmentBtn) {
            createSegmentBtn.onclick = () => this.createSegment();
        }

        const createSegmentBtns = document.querySelectorAll('.btn-create-segment');
        createSegmentBtns.forEach(btn => btn.onclick = () => this.createSegment());

        const searchInput = document.getElementById('segment-search');
        if (searchInput) {
            searchInput.oninput = (e) => this.handleSearch(e.target.value);
        }
    }

    async loadSegments() {
        const contentArea = document.getElementById('segments-content-area');
        if (!contentArea) return;

        try {
            const snapshot = await window.firebaseService.db.collection('segments').get();
            this.segments = [];
            snapshot.forEach(doc => {
                this.segments.push({ id: doc.id, ...doc.data() });
            });
            this.filteredSegments = [...this.segments];
            this.renderSegments();
        } catch (error) {
            console.error("Error loading segments:", error);
            contentArea.innerHTML = `<div style="padding: 40px; text-align: center; color: red;">Feil ved lasting av segmenter: ${error.message}</div>`;
        }
    }

    renderSegments() {
        const contentArea = document.getElementById('segments-content-area');
        const countBadge = document.getElementById('segment-count-badge');
        if (!contentArea) return;

        if (countBadge) {
            countBadge.textContent = this.segments.length;
        }

        if (this.filteredSegments.length === 0) {
            contentArea.innerHTML = `
                <div class="empty-state-placeholder segment-empty-state">
                    <h3 class="segment-empty-title">Nå ut til rett målgruppe til rett tid</h3>
                    <p class="segment-empty-text">
                        Segmenter kontaktene dine i dynamiske grupper som oppdateres daglig. Send målrettede e-postkampanjer og push-varsler for å øke salg og følge opp leads.
                    </p>
                    <button class="btn btn-primary btn-create-segment">
                        <span class="material-symbols-outlined">add</span>
                        Opprett segment
                    </button>
                </div>
            `;
            // Re-attach event listener to new button
            contentArea.querySelector('.btn-create-segment').onclick = () => this.createSegment();
            return;
        }

        const tableHtml = `
            <table class="crm-table">
                <thead>
                    <tr>
                        <th>Navn</th>
                        <th>Beskrivelse</th>
                        <th>Kontakter</th>
                        <th>Type</th>
                        <th>Sist oppdatert</th>
                        <th class="col-actions"></th>
                    </tr>
                </thead>
                <tbody>
                    ${this.filteredSegments.map(segment => `
                        <tr>
                            <td>
                                <div style="font-weight: 600; color: var(--text-main);">${segment.name}</div>
                            </td>
                            <td style="color: var(--text-muted); font-size: 0.9em;">${segment.description || 'Ingen beskrivelse'}</td>
                            <td>${segment.contactCount || 0}</td>
                            <td><span class="badge ${segment.type === 'dynamic' ? 'status-member' : 'status-guest'}">${segment.type === 'dynamic' ? 'Dynamisk' : 'Statisk'}</span></td>
                            <td>${segment.updatedAt ? new Date(segment.updatedAt).toLocaleDateString() : 'Aldri'}</td>
                            <td class="col-actions">
                                <button class="btn-icon">
                                    <span class="material-symbols-outlined">more_horiz</span>
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        contentArea.innerHTML = tableHtml;
    }

    handleSearch(query) {
        const q = query.toLowerCase();
        this.filteredSegments = this.segments.filter(s =>
            (s.name || '').toLowerCase().includes(q) ||
            (s.description || '').toLowerCase().includes(q)
        );
        this.renderSegments();
    }

    async createSegment() {
        const segmentName = prompt("Navn på nytt segment:");
        if (segmentName && segmentName.trim() !== "") {
            const description = prompt("Kort beskrivelse (valgfritt):") || "";

            try {
                const newSegment = {
                    name: segmentName,
                    description: description,
                    type: 'static',
                    contactCount: 0,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };

                await window.firebaseService.db.collection('segments').add(newSegment);
                showToast(`Segmentet "${segmentName}" er opprettet!`);
                this.loadSegments();
            } catch (error) {
                console.error("Error creating segment:", error);
                showToast("Feil ved opprettelse: " + error.message);
            }
        }
    }
}

// Initialize on load
window.segmentManager = new SegmentManager();
