class MinSideManager {
    constructor() {
        this.currentUser = null;
        this.views = {
            overview: this.renderOverview,
            courses: this.renderCourses,
            resources: this.renderResources,
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
        if (user.photoURL) {
            document.getElementById('user-avatar').innerHTML = `<img src="${user.photoURL}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
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
                    <h3 style="font-size: 1rem; color: var(--text-muted);">Aktive Kurs</h3>
                    <p style="font-size: 2rem; font-weight: 700; color: var(--primary-orange);">2</p>
                </div>
                <div class="card">
                    <h3 style="font-size: 1rem; color: var(--text-muted);">Fullførte Leksjoner</h3>
                    <p style="font-size: 2rem; font-weight: 700; color: var(--accent-blue);">12</p>
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

    renderProfile(container) {
        container.innerHTML = `
            <div style="max-width: 800px; margin: 0 auto;">
                <div class="card">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                        <h3>Min Profil</h3>
                        <span class="badge" style="font-size: 0.9rem; padding: 6px 12px;">Medlem siden 2024</span>
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
                            <label style="display: flex; align-items: center; gap: 12px; cursor: pointer;">
                                <input type="checkbox" style="width: 18px; height: 18px; accent-color: var(--primary-orange);">
                                <span>Motta SMS-varsler om møter</span>
                            </label>
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
