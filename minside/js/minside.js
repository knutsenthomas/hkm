class MinSideManager {
    constructor() {
        this.currentUser = null;
        this.views = {
            overview: this.renderOverview,
            courses: this.renderCourses,
            resources: this.renderResources,
            giving: this.renderGiving,
            profile: this.renderProfile
        };

        this.init();
    }

    async init() {
        console.log("Min Side Manager Initializing...");

        // 1. Setup Navigation
        this.setupNavigation();

        // 2. Setup Auth Listener
        firebase.auth().onAuthStateChanged(user => {
            if (user) {
                this.currentUser = user;
                this.updateUserProfile(user);
                this.updateRoleLinks(user);
                this.loadView(this.getCurrentViewFromHash() || 'overview');
            } else {
                // Redirect to login if not authenticated
                console.log("No user logged in. Redirecting to login...");
                window.location.href = 'login.html';
            }
        });
    }

    setupNavigation() {
        // Sidebar Links
        document.querySelectorAll('.nav-link[data-view]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const view = link.getAttribute('data-view');
                this.navigateTo(view);

                // Mobile: Close sidebar
                if (window.innerWidth <= 768) {
                    this.toggleSidebar(false);
                }
            });
        });

        // Mobile Toggle
        const toggleBtn = document.getElementById('mobile-toggle');
        const overlay = document.getElementById('sidebar-overlay');

        toggleBtn.addEventListener('click', () => this.toggleSidebar(true));
        overlay.addEventListener('click', () => this.toggleSidebar(false));

        // Logout
        document.getElementById('logout-btn').addEventListener('click', () => {
            firebase.auth().signOut().then(() => {
                window.location.href = '../index.html';
            });
        });
    }

    toggleSidebar(show) {
        const sidebar = document.querySelector('.sidebar');
        const overlay = document.getElementById('sidebar-overlay');

        if (show) {
            sidebar.classList.add('active');
            overlay.classList.add('active');
        } else {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
        }
    }

    navigateTo(viewId) {
        // Update URL hash
        window.location.hash = viewId;
        this.loadView(viewId);
    }

    getCurrentViewFromHash() {
        return window.location.hash.replace('#', '');
    }

    updateUserProfile(user) {
        document.getElementById('user-name').textContent = user.displayName || user.email;
        const avatarEl = document.getElementById('user-avatar');
        if (user.photoURL) {
            avatarEl.innerHTML = `<img src="${user.photoURL}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
        } else {
            const initials = (user.displayName || user.email || '?').charAt(0).toUpperCase();
            avatarEl.textContent = initials;
        }
    }

    async updateRoleLinks(user) {
        const firebaseService = window.firebaseService;
        if (!firebaseService || !window.HKM_PERMISSIONS) return;

        let role = 'medlem';
        try {
            role = await firebaseService.getUserRole(user.uid);
        } catch (err) {
            console.warn('Kunne ikke hente rolle for menylenke:', err);
        }

        const canAccessAdmin = Array.isArray(window.HKM_PERMISSIONS.ACCESS_ADMIN)
            && window.HKM_PERMISSIONS.ACCESS_ADMIN.includes(role);
        const footer = document.querySelector('.sidebar-footer');
        if (!footer) return;

        const existing = document.getElementById('admin-link');
        if (canAccessAdmin) {
            if (!existing) {
                const link = document.createElement('a');
                link.id = 'admin-link';
                link.href = '../admin/index.html';
                link.className = 'nav-link';
                link.innerHTML = '<span class="material-symbols-outlined">admin_panel_settings</span><span>Admin</span>';
                footer.insertBefore(link, footer.firstChild);
            }
        } else if (existing) {
            existing.remove();
        }
    }

    loadView(viewId) {
        const container = document.getElementById('content-area');
        const renderer = this.views[viewId];

        // Update Active Link
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        const activeLink = document.querySelector(`.nav-link[data-view="${viewId}"]`);
        if (activeLink) activeLink.classList.add('active');

        // Update Header Title
        const names = {
            overview: 'Oversikt',
            courses: 'Mine Kurs',
            resources: 'Ressurser',
            giving: 'Gaver & Betalinger',
            profile: 'Min Profil'
        };
        document.getElementById('page-title').textContent = names[viewId] || 'Min Side';

        if (renderer) {
            container.innerHTML = '<div class="loader">Laster...</div>';
            setTimeout(() => { // Simulate delay
                renderer.call(this, container);
            }, 300);
        } else {
            container.innerHTML = '<p>Visning ikke funnet.</p>';
        }
    }

    // --- Render Methods ---

    renderOverview(container) {
        container.innerHTML = `
            <div class="welcome-banner card" style="background: linear-gradient(135deg, var(--primary-orange), var(--primary-red)); color: white;">
                <h2>Hei, ${this.currentUser.displayName || 'Venn'}! 👋</h2>
                <p style="opacity: 0.9; margin-top: 5px;">"For jeg vet hvilke tanker jeg har med dere, sier Herren..." - Jeremia 29:11</p>
            </div>

            <div class="stats-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px;">
                <div class="card">
                    <h3 style="font-size: 1rem; color: var(--text-muted); display: flex; align-items: center; gap: 8px;">
                        <span class="material-symbols-outlined" style="font-size: 1.2rem;">school</span>
                        Aktive Kurs
                    </h3>
                    <p style="font-size: 2rem; font-weight: 700; color: var(--primary-orange); margin-top: 8px;">2</p>
                </div>
                <div class="card">
                    <h3 style="font-size: 1rem; color: var(--text-muted); display: flex; align-items: center; gap: 8px;">
                        <span class="material-symbols-outlined" style="font-size: 1.2rem;">task_alt</span>
                        Fullførte Leksjoner
                    </h3>
                    <p style="font-size: 2rem; font-weight: 700; color: var(--accent-blue); margin-top: 8px;">12</p>
                </div>
                <div class="card">
                    <h3 style="font-size: 1rem; color: var(--text-muted); display: flex; align-items: center; gap: 8px;">
                        <span class="material-symbols-outlined" style="font-size: 1.2rem;">favorite</span>
                        Gaver denne måneden
                    </h3>
                    <p style="font-size: 2rem; font-weight: 700; color: #e91e63; margin-top: 8px;">kr 500,-</p>
                    <div style="font-size: 0.8rem; color: #64748b; margin-top: 4px;">Takk for ditt bidrag!</div>
                </div>
                <div class="card">
                    <h3 style="font-size: 1rem; color: var(--text-muted); display: flex; align-items: center; gap: 8px;">
                        <span class="material-symbols-outlined" style="font-size: 1.2rem;">military_tech</span>
                        Total gitt i 2026
                    </h3>
                    <p style="font-size: 2rem; font-weight: 700; color: #10b981; margin-top: 8px;">kr 5 500,-</p>
                    <div style="font-size: 0.8rem; color: #64748b; margin-top: 4px;">Din støtte utgjør en forskjell</div>
                </div>
            </div>

            <div class="card">
                <h3>Nyheter fra HKM</h3>
                <ul style="list-style: none; margin-top: 15px;">
                    <li style="padding: 10px 0; border-bottom: 1px solid var(--border-color);">
                        <span class="badge" style="background: #e0f2fe; color: #0284c7;">Nyhet</span>
                        <strong>Nyt webinar tilgjengelig:</strong> Helbredelse i dag.
                    </li>
                    <li style="padding: 10px 0;">
                        <span class="badge" style="background: #fef3c7; color: #d97706;">Oppdatering</span>
                        Nye ressurser lagt til i "Identitet i Kristus".
                    </li>
                </ul>
            </div>
        `;
    }

    renderCourses(container) {
        container.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 24px;">
                <!-- Course Card 1 -->
                <div class="card" style="padding: 0; overflow: hidden;">
                    <div style="height: 160px; background: #e2e8f0; display: flex; align-items: center; justify-content: center; color: #94a3b8;">
                        <span class="material-symbols-outlined" style="font-size: 48px;">school</span>
                    </div>
                    <div style="padding: 20px;">
                        <h4>Identitet i Kristus</h4>
                        <p style="color: var(--text-muted); font-size: 0.9rem; margin: 8px 0 16px;">Lær hvem du er skapt til å være.</p>
                        <div style="background: #f1f5f9; height: 6px; border-radius: 99px; overflow: hidden; margin-bottom: 16px;">
                            <div style="width: 45%; height: 100%; background: var(--primary-orange);"></div>
                        </div>
                        <button class="btn btn-primary" style="width: 100%; justify-content: center;">Fortsett</button>
                    </div>
                </div>

                <!-- Course Card 2 -->
                <div class="card" style="padding: 0; overflow: hidden;">
                    <div style="height: 160px; background: #e2e8f0; display: flex; align-items: center; justify-content: center; color: #94a3b8;">
                         <span class="material-symbols-outlined" style="font-size: 48px;">play_circle</span>
                    </div>
                    <div style="padding: 20px;">
                        <h4>Helbredelsesskolen</h4>
                        <p style="color: var(--text-muted); font-size: 0.9rem; margin: 8px 0 16px;">Praktisk undervisning om helbredelse.</p>
                         <div style="background: #f1f5f9; height: 6px; border-radius: 99px; overflow: hidden; margin-bottom: 16px;">
                            <div style="width: 10%; height: 100%; background: var(--primary-orange);"></div>
                        </div>
                        <button class="btn btn-primary" style="width: 100%; justify-content: center;">Start</button>
                    </div>
                </div>
            </div>
        `;
    }

    renderResources(container) {
        container.innerHTML = `
            <div class="card">
                <h3>Tilgjengelige Ressurser</h3>
                <p>Her kan du laste ned PDF-er og arbeidsbøker.</p>
                <div style="margin-top: 20px; display: flex; flex-direction: column; gap: 10px;">
                    <a href="#" style="display: flex; align-items: center; gap: 10px; padding: 15px; border: 1px solid var(--border-color); border-radius: 8px; text-decoration: none; color: inherit;">
                        <span class="material-symbols-outlined" style="color: #ef4444;">picture_as_pdf</span>
                         <div>
                            <strong>Arbeidsbok: Identitet</strong>
                            <div style="font-size: 0.8rem; color: var(--text-muted);">PDF • 2.4 MB</div>
                         </div>
                    </a>
                </div>
            </div>
        `;
    }

    async renderGiving(container) {
        container.innerHTML = `
            <div class="giving-container">
                <div class="stats-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 20px; margin-bottom: 30px;">
                    <div class="card summary-card orange">
                        <h4>Gitt i år</h4>
                        <p class="amount" id="this-year-total">kr 0,00</p>
                    </div>
                    <div class="card summary-card blue">
                        <h4>Siste gave</h4>
                        <p class="amount" id="last-gift-amount">—</p>
                        <p class="sub-text" id="last-gift-date"></p>
                    </div>
                </div>

                <div class="card">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                        <h3>Gavehistorikk</h3>
                        <div class="filter-controls">
                            <select id="year-filter" class="select-field" style="padding: 5px 10px; border-radius: 6px; border: 1px solid var(--border-color);">
                                <option value="2024">2024</option>
                                <option value="2023">2023</option>
                            </select>
                        </div>
                    </div>
                    <div class="table-responsive">
                        <table class="data-table" id="donations-table">
                            <thead>
                                <tr>
                                    <th>Dato</th>
                                    <th>Kategori</th>
                                    <th>Metode</th>
                                    <th class="text-right">Beløp</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td colspan="4" class="text-center">Henter data...</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <div class="card" style="background: #f8fafc; border: 1px dashed var(--border-color);">
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <span class="material-symbols-outlined" style="font-size: 32px; color: var(--primary-orange);">info</span>
                        <div>
                            <h4>Skattefradrag</h4>
                            <p style="font-size: 0.9rem; color: var(--text-muted);">Dine gaver til His Kingdom Ministry gir rett til skattefradrag. Sørg for at ditt fødselsnummer er registrert på profilen.</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Fetch Donations
        try {
            const userId = this.currentUser.uid;
            const userEmail = this.currentUser.email;

            // Simple query for now: donations matching UID or Email
            // Note: In a real app, you might need composite indices if filtering/sorting complexly
            const donationsQuery = firebase.firestore().collection("donations")
                .where("status", "==", "succeeded")
                .orderBy("timestamp", "desc");

            const snapshot = await donationsQuery.get();

            // Client-side filtering as fallback if Firestore security rules or indices are tight
            const donations = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(d => d.uid === userId || d.email === userEmail);

            this.updateDonationsUI(donations);
        } catch (error) {
            console.error("Failed to load donations:", error);
            document.getElementById('donations-table').querySelector('tbody').innerHTML = `
                <tr><td colspan="4" class="text-center">Kunne ikke laste historikk.</td></tr>
            `;
        }
    }

    updateDonationsUI(donations) {
        const tbody = document.querySelector('#donations-table tbody');
        const totalYearEl = document.getElementById('this-year-total');
        const lastGiftAmountEl = document.getElementById('last-gift-amount');
        const lastGiftDateEl = document.getElementById('last-gift-date');

        if (!donations || donations.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center">Ingen gaver funnet.</td></tr>';
            return;
        }

        let yearTotal = 0;
        const currentYear = new Date().getFullYear();
        let html = '';

        donations.forEach((d, index) => {
            const date = d.timestamp ? d.timestamp.toDate() : new Date();
            const formattedDate = date.toLocaleDateString('no-NO', { day: '2-digit', month: 'short', year: 'numeric' });
            const amount = d.amount / 100; // Convert from cents

            if (date.getFullYear() === currentYear) {
                yearTotal += amount;
            }

            if (index === 0) {
                lastGiftAmountEl.textContent = `kr ${amount.toLocaleString('no-NO', { minimumFractionDigits: 2 })}`;
                lastGiftDateEl.textContent = formattedDate;
            }

            html += `
                <tr>
                    <td>${formattedDate}</td>
                    <td>${d.type || 'Gave'}</td>
                    <td><span class="method-badge">${d.method || 'Kort'}</span></td>
                    <td class="text-right"><strong>kr ${amount.toLocaleString('no-NO', { minimumFractionDigits: 2 })}</strong></td>
                </tr>
            `;
        });

        totalYearEl.textContent = `kr ${yearTotal.toLocaleString('no-NO', { minimumFractionDigits: 2 })}`;
        tbody.innerHTML = html;
    }

    renderProfile(container) {
        container.innerHTML = `
            <div style="max-width: 800px; margin: 0 auto;">
                <div class="card">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                        <h3>Min Profil</h3>
                        <span class="badge" style="font-size: 0.9rem; padding: 6px 12px;">Medlem siden 2024</span>
                    </div>
                    
                    <div style="background: white; border-bottom: 1px solid var(--border-color); padding-bottom: 30px; margin-bottom: 30px; display: flex; align-items: center; gap: 24px;">
                        <div id="profile-picture-container" style="position: relative; width: 100px; height: 100px; border-radius: 50%; background: var(--primary-orange); display: flex; align-items: center; justify-content: center; color: white; font-size: 2.5rem; font-weight: 700; overflow: hidden; border: 4px solid white; box-shadow: var(--shadow);">
                            ${this.currentUser.photoURL ? `<img src="${this.currentUser.photoURL}" style="width: 100%; height: 100%; object-fit: cover;">` : (this.currentUser.displayName || this.currentUser.email || '?').charAt(0).toUpperCase()}
                            <label for="profile-upload" style="position: absolute; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; color: white; opacity: 0; transition: opacity 0.3s ease; cursor: pointer;">
                                <span class="material-symbols-outlined">photo_camera</span>
                            </label>
                            <input type="file" id="profile-upload" style="display: none;" accept="image/*" onchange="window.minSideManager.handleProfilePictureUpload(this)">
                        </div>
                        <div>
                            <h4 style="margin-bottom: 4px;">Profilbilde</h4>
                            <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 12px;">Last opp et bilde fra din enhet eller bruk bildet fra Google.</p>
                            <div style="display: flex; gap: 10px;">
                                <button type="button" class="btn" onclick="document.getElementById('profile-upload').click()" style="padding: 6px 12px; font-size: 0.85rem; border: 1px solid var(--border-color); background: white;">Last opp nytt</button>
                                ${this.currentUser.providerData.some(p => p.providerId === 'google.com') ?
                `<button type="button" class="btn" onclick="window.minSideManager.syncGooglePhoto()" style="padding: 6px 12px; font-size: 0.85rem; border: 1px solid var(--border-color); background: white;">Hent fra Google</button>` : ''}
                            </div>
                        </div>
                    </div>

                    <form onsubmit="event.preventDefault(); alert('Lagret (Simulert)');">
                        <!-- Personal Info -->
                        <h4 style="margin-bottom: 16px; color: var(--primary-orange); border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">Personalia</h4>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                            <div>
                                <label style="display: block; margin-bottom: 8px; font-weight: 500;">Navn</label>
                                <input type="text" value="${this.currentUser.displayName || ''}" style="width: 100%; padding: 12px; border: 1px solid var(--border-color); border-radius: 8px;">
                            </div>
                            <div>
                                <label style="display: block; margin-bottom: 8px; font-weight: 500;">Telefon</label>
                                <input type="tel" placeholder="+47 000 00 000" style="width: 100%; padding: 12px; border: 1px solid var(--border-color); border-radius: 8px;">
                            </div>
                            <div style="grid-column: span 2;">
                                <label style="display: block; margin-bottom: 8px; font-weight: 500;">E-post</label>
                                <input type="email" value="${this.currentUser.email || ''}" disabled style="width: 100%; padding: 12px; border: 1px solid var(--border-color); border-radius: 8px; background: #f8fafc; color: #64748b;">
                                <div style="font-size: 0.8rem; color: #64748b; margin-top: 4px;">E-post kan ikke endres direkte. Kontakt support.</div>
                            </div>
                        </div>

                        <!-- Address -->
                        <h4 style="margin-bottom: 16px; color: var(--primary-orange); border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">Adresse</h4>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                            <div style="grid-column: span 2;">
                                <label style="display: block; margin-bottom: 8px; font-weight: 500;">Gateadresse</label>
                                <input type="text" placeholder="Eksempelveien 12" style="width: 100%; padding: 12px; border: 1px solid var(--border-color); border-radius: 8px;">
                            </div>
                            <div>
                                <label style="display: block; margin-bottom: 8px; font-weight: 500;">Postnummer</label>
                                <input type="text" placeholder="0000" style="width: 100%; padding: 12px; border: 1px solid var(--border-color); border-radius: 8px;">
                            </div>
                            <div>
                                <label style="display: block; margin-bottom: 8px; font-weight: 500;">Sted</label>
                                <input type="text" placeholder="Oslo" style="width: 100%; padding: 12px; border: 1px solid var(--border-color); border-radius: 8px;">
                            </div>
                        </div>

                        <!-- Notifications -->
                        <h4 style="margin-bottom: 16px; color: var(--primary-orange); border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">Kommunikasjon</h4>
                        <div style="margin-bottom: 30px;">
                            <label style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px; cursor: pointer;">
                                <input type="checkbox" checked style="width: 18px; height: 18px; accent-color: var(--primary-orange);">
                                <span>Motta nyhetsbrev på e-post</span>
                            </label>
                            </label>
                        </div>

                        <!-- Privacy Settings (Consent) -->
                        <h4 style="margin-bottom: 16px; color: var(--primary-orange); border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">Personvern & Samtykke</h4>
                        <div id="consent-status-display" style="padding: 15px; background: #f1f5f9; border-radius: 8px; margin-bottom: 30px;">
                            <div class="loader">Henter samtykkestatus...</div>
                        </div>

                        <!-- Actions -->
                        <div style="display: flex; gap: 16px; align-items: center; border-top: 1px solid var(--border-color); padding-top: 24px;">
                            <button class="btn btn-primary">Lagre endringer</button>
                            <button type="button" class="btn" style="color: var(--text-muted); margin-left: auto;">Endre passord</button>
                        </div>
                    </form>
                </div>

                <div class="card" style="background-color: #fef2f2; border: 1px solid #fee2e2;">
                    <h4 style="color: #991b1b; margin-bottom: 8px;">Slett konto</h4>
                    <p style="font-size: 0.9rem; color: #7f1d1d; margin-bottom: 16px;">Ønsker du å slette kontoen din og alle data? Dette kan ikke angres.</p>
                    <button class="btn" style="color: #dc2626; border: 1px solid #dc2626; background: white;">Slett min konto</button>
                </div>
            </div>
        `;

        // Fetch and display consent status
        this.updateConsentStatusDisplay();
    }

    async updateConsentStatusDisplay() {
        const statusDiv = document.getElementById('consent-status-display');
        if (!statusDiv || !this.currentUser) return;

        try {
            const userDoc = await firebase.firestore().collection("users").doc(this.currentUser.uid).get();
            if (userDoc.exists && userDoc.data().privacySettings) {
                const settings = userDoc.data().privacySettings;
                const choices = settings.choices;

                let statusText = "<strong>Aktivt samtykke:</strong><br>";
                statusText += `Nødvendige: <span style="color: green;">Ja</span><br>`;
                statusText += `Statistikk: ${choices.analytics ? '<span style="color: green;">Ja</span>' : '<span style="color: red;">Nei</span>'}<br>`;
                statusText += `Markedsføring: ${choices.marketing ? '<span style="color: green;">Ja</span>' : '<span style="color: red;">Nei</span>'}`;

                statusDiv.innerHTML = `
                    <p style="font-size: 0.95rem; line-height: 1.5;">${statusText}</p>
                    <button type="button" class="btn btn-outline" style="margin-top: 12px; font-size: 0.85rem; padding: 6px 12px;" 
                            onclick="localStorage.removeItem('hkm_cookie_consent'); location.reload();">
                        Endre innstillinger
                    </button>
                `;
            } else {
                statusDiv.innerHTML = `
                    <p style="font-size: 0.95rem;">Ingen lagret status funnet på profil.</p>
                    <button type="button" class="btn btn-outline" style="margin-top: 12px; font-size: 0.85rem; padding: 6px 12px;" 
                            onclick="localStorage.removeItem('hkm_cookie_consent'); location.reload();">
                        Sett innstillinger nå
                    </button>
                `;
            }
        } catch (error) {
            console.error("Feil ved henting av samtykke:", error);
            statusDiv.innerHTML = "Kunne ikke hente samtykkestatus.";
        }
    }

    async handleProfilePictureUpload(input) {
        const file = input.files[0];
        if (!file) return;

        // Show loading state
        const container = document.getElementById('profile-picture-container');
        const originalContent = container.innerHTML;
        container.innerHTML = `<div class="loader" style="transform: scale(0.5);"></div>`;

        try {
            const path = `profiles/${this.currentUser.uid}/avatar.jpg`;
            const url = await window.firebaseService.uploadImage(file, path);

            // Update User Profile in Firebase Auth
            await this.currentUser.updateProfile({
                photoURL: url
            });

            // Update UI
            container.innerHTML = `<img src="${url}" style="width:100%;height:100%;object-fit:cover;">`;
            this.updateUserProfile(this.currentUser);
            alert('Profilbilde er oppdatert!');
        } catch (error) {
            console.error("Opplasting feilet:", error);
            container.innerHTML = originalContent;
            alert('Kunne ikke laste opp bilde: ' + error.message);
        }
    }

    async syncGooglePhoto() {
        const googleProvider = this.currentUser.providerData.find(p => p.providerId === 'google.com');
        if (googleProvider && googleProvider.photoURL) {
            try {
                await this.currentUser.updateProfile({
                    photoURL: googleProvider.photoURL
                });
                this.loadView('profile'); // Refresh view
                this.updateUserProfile(this.currentUser);
                alert('Profilbilde hentet fra Google!');
            } catch (error) {
                console.error("Google sync feilet:", error);
                alert('Kunne ikke hente bilde fra Google.');
            }
        }
    }
}

// Initialize on Load (simulated user data for dev if no auth)
window.addEventListener('load', () => {
    // Check for Firebase Config
    if (typeof firebaseConfig !== 'undefined' && !firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }

    // Config needs to be loaded from somewhere, or we inject it here.
    // Assuming firebase-service.js or inline config exists in index.html, 
    // but index.html currently only loads the SDKs.
    // Let's inject a basic config here for safety if separate file isn't loaded:
    if (!firebase.apps.length) {
        const config = {
            apiKey: "AIzaSyAelVsZnTU5xjQsjewWG7RjYEsQSHH-bkE",
            authDomain: "his-kingdom-ministry.firebaseapp.com",
            projectId: "his-kingdom-ministry",
            storageBucket: "his-kingdom-ministry.appspot.com",
            messagingSenderId: "791237361706",
            appId: "1:791237361706:web:63516ba3d74436f23ac353"
        };
        firebase.initializeApp(config);
    }

    window.minSideManager = new MinSideManager();
});
