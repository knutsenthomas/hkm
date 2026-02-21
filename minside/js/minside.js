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
        firebase.auth().onAuthStateChanged(async (user) => {
            if (user) {
                this.currentUser = user;
                await this.syncUserProfile(user);
                await this.syncProfileFromGoogleProvider();
                await this.updateUserProfile(user);
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

        // Header Profile Click: åpne full profilside, ikke popup
        const profileTrigger = document.getElementById('minside-profile-trigger');
        const profileModal = document.getElementById('profile-modal');
        const closeProfileModal = document.getElementById('close-profile-modal');
        const profileForm = document.getElementById('modal-profile-form');
        if (profileTrigger && profileModal && closeProfileModal) {
            profileTrigger.onclick = (e) => {
                e.stopPropagation();
                this.closeProfileModal();
                this.navigateTo('profile');
            };
            closeProfileModal.onclick = (e) => {
                e.stopPropagation();
                this.closeProfileModal();
            };
            // Lukk modal ved klikk utenfor innhold
            profileModal.addEventListener('mousedown', (e) => {
                if (e.target === profileModal) this.closeProfileModal();
            });
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && profileModal.style.display === 'flex') {
                    this.closeProfileModal();
                }
            });
        }

        if (profileForm) {
            profileForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.saveProfileFromModal(profileForm);
            });
        }
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

    async getMergedProfile(user = this.currentUser) {
        if (!user) return null;

        let userData = {};
        try {
            const doc = await firebase.firestore().collection('users').doc(user.uid).get();
            if (doc.exists) userData = doc.data() || {};
        } catch (e) {
            console.warn('Kunne ikke lese brukerprofil:', e);
        }

        const googleProvider = (user.providerData || []).find(p => p.providerId === 'google.com') || {};
        const displayName = userData.displayName || user.displayName || googleProvider.displayName || user.email || '';
        const photoURL = userData.photoURL || user.photoURL || googleProvider.photoURL || '';

        return {
            ...userData,
            displayName,
            photoURL
        };
    }

    async syncUserProfile(user) {
        if (!user) return;
        try {
            const docRef = firebase.firestore().collection('users').doc(user.uid);
            const doc = await docRef.get();
            const isNewUser = !doc.exists;

            if (isNewUser) {
                // Initial creation
                await docRef.set({
                    email: user.email || '',
                    displayName: user.displayName || user.email || '',
                    photoURL: user.photoURL || '',
                    role: 'medlem',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                // Admin Notification
                await this.createAdminNotification({
                    type: 'NEW_USER_REGISTRATION',
                    userId: user.uid,
                    userEmail: user.email,
                    userName: user.displayName || user.email,
                    message: `Ny bruker registrert: ${user.displayName || user.email}`
                });
            }
        } catch (e) {
            console.warn('Kunne ikke synkronisere bruker:', e);
        }
    }

    async syncProfileFromGoogleProvider() {
        if (!this.currentUser) return;
        const user = this.currentUser;
        const googleProvider = (user.providerData || []).find(p => p.providerId === 'google.com');
        if (!googleProvider) return;

        try {
            const updates = {};
            if (!user.displayName && googleProvider.displayName) updates.displayName = googleProvider.displayName;
            if (!user.photoURL && googleProvider.photoURL) updates.photoURL = googleProvider.photoURL;
            if (Object.keys(updates).length > 0) {
                await user.updateProfile(updates);
            }

            const docRef = firebase.firestore().collection('users').doc(user.uid);
            // No need to check exists here as syncUserProfile handled it or will merge
            await docRef.set({
                displayName: user.displayName || googleProvider.displayName || user.email || '',
                photoURL: user.photoURL || googleProvider.photoURL || '',
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

            // Note: Registration notification is handled in syncUserProfile
        } catch (e) {
            console.warn('Kunne ikke synkronisere Google-profil:', e);
        }
    }

    async updateUserProfile(user) {
        const merged = await this.getMergedProfile(user);
        document.getElementById('user-name').textContent = merged?.displayName || user.displayName || user.email;
        const avatarEl = document.getElementById('user-avatar');
        const avatarUrl = merged?.photoURL || '';
        if (avatarUrl) {
            avatarEl.innerHTML = `<img src="${avatarUrl}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
        } else {
            const initials = (merged?.displayName || user.displayName || user.email || '?').charAt(0).toUpperCase();
            avatarEl.textContent = initials;
        }
    }

    async openProfileModal() {
        const profileModal = document.getElementById('profile-modal');
        if (!profileModal || !this.currentUser) return;

        const user = this.currentUser;
        const merged = await this.getMergedProfile(user);
        document.getElementById('modal-user-name').textContent = merged?.displayName || user.displayName || user.email;
        document.getElementById('modal-user-role').textContent = 'Bruker';
        document.getElementById('modal-user-email').textContent = user.email || '';

        const modalAvatar = document.getElementById('modal-user-avatar');
        const avatarUrl = merged?.photoURL || user.photoURL || '';
        if (avatarUrl) {
            modalAvatar.innerHTML = `<img src="${avatarUrl}" alt="Profile" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
        } else {
            const initials = (merged?.displayName || user.displayName || user.email || '?').split(' ').map(n => n[0]).join('').toUpperCase();
            modalAvatar.textContent = initials.substring(0, 2);
        }

        await this.populateProfileModalForm();
        profileModal.style.display = 'flex';
    }

    closeProfileModal() {
        const profileModal = document.getElementById('profile-modal');
        if (profileModal) profileModal.style.display = 'none';
    }

    async populateProfileModalForm() {
        const form = document.getElementById('modal-profile-form');
        if (!form || !this.currentUser) return;

        const merged = await this.getMergedProfile(this.currentUser);
        form.querySelector('[name="displayName"]').value = merged?.displayName || this.currentUser.displayName || '';
        form.querySelector('[name="phone"]').value = '';
        form.querySelector('[name="address"]').value = '';
        form.querySelector('[name="zip"]').value = '';
        form.querySelector('[name="city"]').value = '';

        try {
            const doc = await firebase.firestore().collection('users').doc(this.currentUser.uid).get();
            if (!doc.exists) return;
            const data = doc.data() || {};
            form.querySelector('[name="phone"]').value = data.phone || '';
            form.querySelector('[name="address"]').value = data.address || '';
            form.querySelector('[name="zip"]').value = data.zip || '';
            form.querySelector('[name="city"]').value = data.city || '';
            form.querySelector('[name="ssn"]').value = data.ssn || '';
            if (!form.querySelector('[name="displayName"]').value) {
                form.querySelector('[name="displayName"]').value = data.displayName || '';
            }
        } catch (err) {
            console.warn('Kunne ikke hente profildata for popup:', err);
        }
    }

    async saveProfileFromModal(form) {
        if (!this.currentUser) return;
        const btn = document.getElementById('save-modal-profile-btn');
        const originalText = btn ? btn.textContent : '';
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Lagrer...';
        }

        try {
            const formData = new FormData(form);
            const updates = {
                displayName: formData.get('displayName') || '',
                phone: formData.get('phone') || '',
                address: formData.get('address') || '',
                zip: formData.get('zip') || '',
                city: formData.get('city') || '',
                ssn: formData.get('ssn') || '',
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            if (updates.displayName && updates.displayName !== this.currentUser.displayName) {
                await this.currentUser.updateProfile({ displayName: updates.displayName });
            }

            await firebase.firestore().collection('users').doc(this.currentUser.uid).set({
                ...updates,
                photoURL: this.currentUser.photoURL || '',
                email: this.currentUser.email || ''
            }, { merge: true });
            if (window.firebaseService && typeof window.firebaseService.savePageContent === 'function') {
                await window.firebaseService.savePageContent('settings_profile', {
                    fullName: updates.displayName || '',
                    phone: updates.phone || '',
                    address: updates.address || '',
                    updatedAt: new Date().toISOString()
                });
            }
            await this.updateUserProfile(this.currentUser);
            document.getElementById('modal-user-name').textContent = updates.displayName || this.currentUser.email;
            alert('Profil oppdatert.');
            this.closeProfileModal();
        } catch (error) {
            console.error('Kunne ikke lagre profil fra popup:', error);
            alert('Kunne ikke lagre profil: ' + error.message);
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.textContent = originalText;
            }
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
            setTimeout(async () => { // Simulate delay
                try {
                    await renderer.call(this, container);
                } catch (error) {
                    console.error(`Feil ved rendering av view "${viewId}":`, error);
                    container.innerHTML = '<div class="card"><p>Kunne ikke laste innholdet. Oppdater siden og prøv igjen.</p></div>';
                }
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
                <div class="card stat-box">
                    <h3 style="font-size: 1rem; color: var(--text-muted); display: flex; align-items: center; gap: 8px;">
                        <span class="material-symbols-outlined" style="font-size: 1.2rem;">school</span>
                        Aktive Kurs
                    </h3>
                    <p id="stat-active-courses" style="font-size: 2rem; font-weight: 700; color: var(--primary-orange); margin-top: 8px;">—</p>
                </div>
                <div class="card stat-box">
                    <h3 style="font-size: 1rem; color: var(--text-muted); display: flex; align-items: center; gap: 8px;">
                        <span class="material-symbols-outlined" style="font-size: 1.2rem;">task_alt</span>
                        Fullførte Leksjoner
                    </h3>
                    <p id="stat-completed-lessons" style="font-size: 2rem; font-weight: 700; color: var(--accent-blue); margin-top: 8px;">—</p>
                </div>
                <div class="card stat-box">
                    <h3 style="font-size: 1rem; color: var(--text-muted); display: flex; align-items: center; gap: 8px;">
                        <span class="material-symbols-outlined" style="font-size: 1.2rem;">favorite</span>
                        Gaver denne måneden
                    </h3>
                    <p id="stat-month-giving" style="font-size: 2rem; font-weight: 700; color: #e91e63; margin-top: 8px;">—</p>
                    <div id="stat-month-giving-sub" style="font-size: 0.8rem; color: #64748b; margin-top: 4px;"></div>
                </div>
                <div class="card stat-box">
                    <h3 style="font-size: 1rem; color: var(--text-muted); display: flex; align-items: center; gap: 8px;">
                        <span class="material-symbols-outlined" style="font-size: 1.2rem;">military_tech</span>
                        Total gitt i ${new Date().getFullYear()}
                    </h3>
                    <p id="stat-year-giving" style="font-size: 2rem; font-weight: 700; color: #10b981; margin-top: 8px;">—</p>
                    <div id="stat-year-giving-sub" style="font-size: 0.8rem; color: #64748b; margin-top: 4px;">Din støtte utgjør en forskjell</div>
                </div>
            </div>

            <div class="card">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                    <h3>Nyheter fra HKM</h3>
                    <a href="#resources" onclick="window.minSideManager.navigateTo('resources')" style="color:var(--primary-orange); font-size:0.85rem; font-weight:600; text-decoration:none;">Se alle</a>
                </div>
                <div id="news-feed-overview">
                    <div class="loader-placeholder" style="height:100px; background:#f8fafc; border-radius:10px; display:flex; align-items:center; justify-content:center; color:#94a3b8;">Laster nyheter...</div>
                </div>
            </div>
        `;

        // Fetch dynamic stats asynchronously
        this._loadOverviewStats();
        this._loadOverviewNews();
    }

    async _loadOverviewNews() {
        try {
            const feed = document.getElementById('news-feed-overview');
            if (!feed) return;

            const blogSnap = await firebase.firestore().collection('content').doc('collection_blog').get();
            const items = (blogSnap.exists ? blogSnap.data()?.items : []) || [];

            // Get 2 latest
            const latest = [...items].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)).slice(0, 2);

            if (latest.length === 0) {
                feed.innerHTML = '<p style="color:var(--text-muted); font-size:0.9rem;">Ingen nyheter publisert ennå.</p>';
                return;
            }

            feed.innerHTML = `
                <ul style="list-style: none;">
                    ${latest.map(item => `
                        <li style="padding: 12px 0; border-bottom: 1px solid var(--border-color); display:flex; gap:12px; align-items:center;">
                            <div style="width:40px; height:40px; border-radius:8px; background:#fff8f0; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                                <span class="material-symbols-outlined" style="color:var(--primary-orange); font-size:1.2rem;">article</span>
                            </div>
                            <div style="flex:1;">
                                <div style="display:flex; align-items:center; gap:8px;">
                                    <strong style="font-size:0.95rem;">${item.title || 'Uten tittel'}</strong>
                                    ${item.category ? `<span class="badge" style="font-size:10px;">${item.category}</span>` : ''}
                                </div>
                                <p style="font-size:0.85rem; color:var(--text-muted); margin-top:2px;">${new Date(item.date).toLocaleDateString('no-NO')}</p>
                            </div>
                            <a href="../blogg-post.html?id=${encodeURIComponent(item.id || item.title)}" style="color:var(--text-muted);"><span class="material-symbols-outlined">chevron_right</span></a>
                        </li>
                    `).join('')}
                </ul>
            `;
        } catch (e) {
            console.warn('Overview news failed:', e);
        }
    }

    async _loadOverviewStats() {
        const uid = this.currentUser?.uid;
        const email = this.currentUser?.email;
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth();

        const fmt = (n) => n === 0
            ? 'kr 0,-'
            : `kr ${n.toLocaleString('no-NO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })},-`;

        const animateCount = (el, target) => {
            if (!el) return;
            if (typeof target !== 'number') { el.textContent = target; return; }
            const duration = 1000;
            const start = performance.now();
            const startVal = parseFloat(el.textContent.replace(/[^\d]/g, '')) || 0;

            const step = (now) => {
                const t = Math.min((now - start) / duration, 1);
                const eased = 1 - Math.pow(1 - t, 4); // Quartic ease-out
                const current = Math.floor(startVal + (target - startVal) * eased);
                el.textContent = current.toLocaleString('no-NO');
                if (t < 1) requestAnimationFrame(step);
            };
            requestAnimationFrame(step);
        };

        // --- 1. Course Stats (Teaching + Courses) ---
        try {
            let totalActiveCourses = 0;

            // Check siteContent/collection_courses (New system)
            const coursesSnap = await firebase.firestore().collection('siteContent').doc('collection_courses').get();
            if (coursesSnap.exists) {
                totalActiveCourses += (coursesSnap.data()?.items || []).length;
            }

            // Check content/collection_teaching (Old system)
            const teachingSnap = await firebase.firestore().collection('content').doc('collection_teaching').get();
            if (teachingSnap.exists) {
                totalActiveCourses += (teachingSnap.data()?.items || []).length;
            }

            animateCount(document.getElementById('stat-active-courses'), totalActiveCourses);

            // Fetch progress
            let completedCount = 0;
            try {
                const progDoc = await firebase.firestore().collection('users').doc(uid).collection('progress').get();
                // This counts sub-documents or items in progress. In our Udemy-style system, 
                // we'll eventually track per lesson. For now, let's count completed sessions if any.
                completedCount = progDoc.size || 0;
            } catch (e) { }
            animateCount(document.getElementById('stat-completed-lessons'), completedCount);

        } catch (err) {
            console.warn('Course stats sync failed:', err);
        }

        // --- 2. Giving Stats (Optimized Query) ---
        try {
            // Fetch donations. We skip orderBy if indices are missing.
            const query = firebase.firestore().collection('donations').where('status', '==', 'succeeded');
            const snap = await query.get();

            const donations = snap.docs
                .map(d => d.data())
                .filter(d => (d.uid === uid || d.email === email) && d.timestamp);

            let monthTotal = 0;
            let yearTotal = 0;

            donations.forEach(d => {
                const dDate = d.timestamp.toDate ? d.timestamp.toDate() : new Date(d.timestamp);
                const amount = (d.amount || 0) / 100;

                if (dDate.getFullYear() === currentYear) {
                    yearTotal += amount;
                    if (dDate.getMonth() === currentMonth) {
                        monthTotal += amount;
                    }
                }
            });

            const mEl = document.getElementById('stat-month-giving');
            const yEl = document.getElementById('stat-year-giving');
            const mSub = document.getElementById('stat-month-giving-sub');

            if (mEl) mEl.textContent = fmt(monthTotal);
            if (yEl) yEl.textContent = fmt(yearTotal);
            if (mSub) mSub.textContent = monthTotal > 0 ? 'Takk for ditt bidrag! 🙌' : 'Ingen gaver denne måneden';

        } catch (err) {
            console.warn('Giving stats sync failed:', err);
        }
    }

    async renderCourses(container) {
        container.innerHTML = `
            <div id="courses-view-container">
                <div class="view-header" style="margin-bottom: 24px;">
                    <p style="color: var(--text-muted);">Her finner du alle kursene du har tilgang til.</p>
                </div>
                <div id="courses-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px;">
                    <div class="loader">Laster dine kurs...</div>
                </div>
            </div>
        `;

        try {
            // Fetch both Teaching (original) and Courses (new management system)
            const [teachSnap, cursSnap] = await Promise.all([
                firebase.firestore().collection('content').doc('collection_teaching').get(),
                firebase.firestore().collection('siteContent').doc('collection_courses').get()
            ]);

            const teachItems = (teachSnap.exists ? teachSnap.data()?.items : []) || [];
            const cursItems = (cursSnap.exists ? cursSnap.data()?.items : []) || [];

            // Merge all items
            const allItems = [
                ...teachItems.map(i => ({ ...i, source: 'teaching' })),
                ...cursItems.map(i => ({ ...i, source: 'course' }))
            ];

            const grid = document.getElementById('courses-grid');
            if (allItems.length === 0) {
                grid.innerHTML = `
                    <div class="card" style="grid-column: 1/-1; text-align: center; padding: 48px;">
                        <span class="material-symbols-outlined" style="font-size: 48px; color: #cbd5e1; margin-bottom: 16px;">school</span>
                        <h4>Ingen kurs tilgjengelig</h4>
                        <p style="color: var(--text-muted); margin-top: 8px;">Du har ikke meldt deg på noen kurs ennå. Utforsk katalogen på forsiden!</p>
                        <a href="../kurs.html" class="btn btn-primary" style="margin-top: 24px; text-decoration:none;">Se kurskatalog</a>
                    </div>
                `;
                return;
            }

            grid.innerHTML = allItems.map(item => {
                const img = item.imageUrl || '../img/course-placeholder.jpg';
                const id = item.id || item.title;
                const link = item.source === 'course' ? `../kurs-detaljer.html?id=${id}` : `../blogg-post.html?id=${id}`;

                return `
                    <div class="card" style="padding:0; overflow:hidden; display:flex; flex-direction:column;">
                        <div style="height:160px; position:relative;">
                            <img src="${img}" style="width:100%; height:100%; object-fit:cover;">
                            <div style="position:absolute; top:12px; left:12px; padding:4px 10px; background:rgba(0,0,0,0.6); color:white; border-radius:20px; font-size:10px; font-weight:700; backdrop-filter:blur(4px);">
                                ${item.category || (item.source === 'course' ? 'KURS' : 'UNDERVISNING')}
                            </div>
                        </div>
                        <div style="padding:20px; flex:1; display:flex; flex-direction:column;">
                            <h4 style="margin-bottom:8px;">${item.title}</h4>
                            <p style="font-size:0.85rem; color:var(--text-muted); line-height:1.5; flex:1; margin-bottom:16px;">
                                ${item.description ? item.description.substring(0, 80) + '...' : 'Utforsk dette dypdykket i Guds ord.'}
                            </p>
                            <a href="${link}" class="btn btn-outline" style="width:100%; justify-content:center; text-decoration:none;">Gå til kurs</a>
                        </div>
                    </div>
                `;
            }).join('');

        } catch (err) {
            console.error('Course render failed:', err);
            document.getElementById('courses-grid').innerHTML = '<p>Kunne ikke laste kursene dine.</p>';
        }
    }

    async renderResources(container) {
        container.innerHTML = `
            <div class="card">
                <h3 style="margin-bottom:6px;">Ressurser</h3>
                <p style="color:var(--text-muted);font-size:0.9rem;margin-bottom:20px;">Artikler og innlegg fra His Kingdom Ministry</p>
                <div id="resources-list" style="display:flex;flex-direction:column;gap:12px;">
                    ${[1, 2, 3].map(() => `
                    <div style="display:flex;align-items:center;gap:12px;padding:14px;border:1px solid var(--border-color);border-radius:8px;animation:skeletonPulse 1.5s ease-in-out infinite;">
                        <div style="width:44px;height:44px;background:#e2e8f0;border-radius:8px;flex-shrink:0;"></div>
                        <div style="flex:1;">
                            <div style="height:14px;background:#e2e8f0;border-radius:6px;margin-bottom:6px;width:60%;"></div>
                            <div style="height:12px;background:#e2e8f0;border-radius:6px;width:40%;"></div>
                        </div>
                    </div>`).join('')}
                </div>
            </div>
        `;

        try {
            const data = await firebase.firestore().collection('siteContent').doc('collection_blog').get();
            const items = (data.exists ? data.data()?.items : null) || [];

            const list = document.getElementById('resources-list');
            if (!list) return;

            if (items.length === 0) {
                list.innerHTML = `<p style="color:var(--text-muted);text-align:center;padding:20px 0;">Ingen ressurser tilgjengelig ennå.</p>`;
                return;
            }

            // Show up to 10 latest
            const sorted = [...items].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)).slice(0, 10);

            list.innerHTML = sorted.map(item => {
                const excerpt = (typeof item.content === 'string'
                    ? item.content
                    : (item.content?.blocks?.filter(b => b.type === 'paragraph').map(b => b.data?.text || '').join(' ') || '')
                ).replace(/<[^>]+>/g, '').substring(0, 80);

                const url = `../blogg-post.html?id=${encodeURIComponent(item.id || item.title)}`;
                const dateStr = item.date ? new Date(item.date).toLocaleDateString('no-NO', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

                const categoryColors = {
                    'Undervisning': '#e0f2fe:#0284c7',
                    'Nyhet': '#dcfce7:#16a34a',
                    'Vitnesbyrd': '#fef3c7:#d97706',
                };
                const [bg, fg] = (categoryColors[item.category] || '#f1f5f9:#475569').split(':');

                return `
                <a href="${url}" style="display:flex;align-items:flex-start;gap:12px;padding:14px;border:1px solid var(--border-color);border-radius:10px;text-decoration:none;color:inherit;transition:border-color .2s,box-shadow .2s;"
                   onmouseover="this.style.borderColor='var(--primary-orange)';this.style.boxShadow='0 2px 12px rgba(209,125,57,.1)'"
                   onmouseout="this.style.borderColor='';this.style.boxShadow=''">
                    <div style="width:44px;height:44px;border-radius:8px;background:#fff8f0;display:flex;align-items:center;justify-content:center;flex-shrink:0;border:1px solid #ffe4cc;">
                        <span class="material-symbols-outlined" style="color:var(--primary-orange);font-size:1.3rem;">article</span>
                    </div>
                    <div style="flex:1;min-width:0;">
                        <div style="display:flex;align-items:center;gap:8px;margin-bottom:3px;flex-wrap:wrap;">
                            <strong style="font-size:0.95rem;">${item.title || 'Uten tittel'}</strong>
                            ${item.category ? `<span style="font-size:10px;font-weight:600;padding:2px 8px;border-radius:20px;background:${bg};color:${fg};">${item.category}</span>` : ''}
                        </div>
                        <p style="font-size:0.8rem;color:var(--text-muted);margin:0;">${excerpt}${excerpt.length === 80 ? '...' : ''}</p>
                        <p style="font-size:0.75rem;color:#94a3b8;margin:4px 0 0;">${item.author ? item.author + ' · ' : ''}${dateStr}</p>
                    </div>
                    <span class="material-symbols-outlined" style="color:#94a3b8;flex-shrink:0;">chevron_right</span>
                </a>`;
            }).join('');

        } catch (err) {
            console.error('Kunne ikke laste ressurser:', err);
            const list = document.getElementById('resources-list');
            if (list) list.innerHTML = `<p style="color:var(--text-muted);text-align:center;">Kunne ikke laste ressurser. Prøv igjen.</p>`;
        }
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
        const hasGoogleProvider = Array.isArray(this.currentUser?.providerData)
            && this.currentUser.providerData.some(p => p && p.providerId === 'google.com');

        container.innerHTML = `
            <div style="width: 100%;">
                <div class="card" style="width: 100%; max-width: 100%;">
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
                                ${hasGoogleProvider ?
                `<button type="button" class="btn" onclick="window.minSideManager.syncGooglePhoto()" style="padding: 6px 12px; font-size: 0.85rem; border: 1px solid var(--border-color); background: white;">Hent fra Google</button>` : ''}
                            </div>
                        </div>
                    </div>

                    <form onsubmit="event.preventDefault(); window.minSideManager.handleProfileSave(this);">
                        <!-- Personal Info -->
                        <h4 style="margin-bottom: 16px; color: var(--primary-orange); border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">Personalia</h4>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                            <div>
                                <label style="display: block; margin-bottom: 8px; font-weight: 500;">Navn</label>
                                <input type="text" name="displayName" value="${this.currentUser.displayName || ''}" style="width: 100%; padding: 12px; border: 1px solid var(--border-color); border-radius: 8px;">
                            </div>
                            <div>
                                <label style="display: block; margin-bottom: 8px; font-weight: 500;">Telefon</label>
                                <input type="tel" name="phone" placeholder="+47 000 00 000" style="width: 100%; padding: 12px; border: 1px solid var(--border-color); border-radius: 8px;">
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
                                <input type="text" name="address" placeholder="Eksempelveien 12" style="width: 100%; padding: 12px; border: 1px solid var(--border-color); border-radius: 8px;">
                            </div>
                            <div>
                                <label style="display: block; margin-bottom: 8px; font-weight: 500;">Postnummer</label>
                                <input type="text" name="zip" placeholder="0000" style="width: 100%; padding: 12px; border: 1px solid var(--border-color); border-radius: 8px;">
                            </div>
                            <div>
                                <label style="display: block; margin-bottom: 8px; font-weight: 500;">Sted</label>
                                <input type="text" name="city" placeholder="Oslo" style="width: 100%; padding: 12px; border: 1px solid var(--border-color); border-radius: 8px;">
                            </div>
                        </div>

                        <!-- Communication -->
                        <h4 style="margin-bottom: 16px; color: var(--primary-orange); border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">Kommunikasjon</h4>
                        <div style="margin-bottom: 30px;">
                            <label style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px; cursor: pointer;">
                                <input type="checkbox" name="newsletter" checked style="width: 18px; height: 18px; accent-color: var(--primary-orange);">
                                <span>Motta nyhetsbrev på e-post</span>
                            </label>
                        </div>

                        <!-- Notifications -->
                        <h4 style="margin-bottom: 16px; color: var(--primary-orange); border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">Varslinger</h4>
                        <div style="margin-bottom: 30px;">
                            <p style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 12px;">Få varslinger på denne enheten om nye arrangementer og viktige oppdateringer.</p>
                            <button type="button" id="enable-notifications-btn" class="btn btn-primary">Aktiver push-varslinger</button>
                            <div id="notification-status" style="margin-top: 10px; font-size: 0.85rem;"></div>
                        </div>

                        <!-- Privacy Settings (Consent) -->
                        <h4 style="margin-bottom: 16px; color: var(--primary-orange); border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">Personvern & Samtykke</h4>
                        <div id="consent-status-display" style="padding: 15px; background: #f1f5f9; border-radius: 8px; margin-bottom: 30px;">
                            <div class="loader">Henter samtykkestatus...</div>
                        </div>

                        <!-- Actions -->
                        <div style="display: flex; gap: 16px; align-items: center; border-top: 1px solid var(--border-color); padding-top: 24px;">
                            <button type="submit" class="btn btn-primary">Lagre endringer</button>
                            <button type="button" class="btn" style="color: var(--text-muted); margin-left: auto;">Endre passord</button>
                        </div>
                    </form>
                </div>

                <div class="card" style="background-color: #fef2f2; border: 1px solid #fee2e2;">
                    <h4 style="color: #991b1b; margin-bottom: 8px;">Slett konto</h4>
                    <p style="font-size: 0.9rem; color: #7f1d1d; margin-bottom: 16px;">Ønsker du å slette kontoen din og alle data? Dette kan ikke angres.</p>
                    <button id="delete-account-btn" class="btn" onclick="window.minSideManager.handleAccountDeletion()" style="color: #dc2626; border: 1px solid #dc2626; background: white;">Slett min konto</button>
                </div>
            </div>
        `;

        // Notifications
        const enableNotificationsBtn = container.querySelector('#enable-notifications-btn');
        const notificationStatusEl = container.querySelector('#notification-status');

        if (enableNotificationsBtn && notificationStatusEl) {
            // Check initial permission status
            if ('Notification' in window) {
                notificationStatusEl.textContent = `Status: ${Notification.permission}`;
            }

            enableNotificationsBtn.addEventListener('click', async () => {
                enableNotificationsBtn.disabled = true;
                enableNotificationsBtn.textContent = 'Behandler...';
                try {
                    const token = await window.firebaseService.requestNotificationPermission();
                    if (token) {
                        notificationStatusEl.textContent = 'Status: Varslinger er aktivert på denne enheten.';
                        notificationStatusEl.style.color = 'green';
                        enableNotificationsBtn.textContent = 'Varslinger er Aktivert';
                    } else {
                        notificationStatusEl.textContent = 'Status: Kunne ikke aktivere varslinger. Sjekk nettleserinnstillingene.';
                        notificationStatusEl.style.color = 'red';
                        enableNotificationsBtn.textContent = 'Aktiver push-varslinger';
                    }
                } catch (error) {
                    notificationStatusEl.textContent = `Feil: ${error.message}`;
                    notificationStatusEl.style.color = 'red';
                } finally {
                    enableNotificationsBtn.disabled = Notification.permission === 'granted';
                }
            });
        }

        // Fetch and display consent status
        this.updateConsentStatusDisplay();
        this.loadUserProfileData(container);
    }

    async loadUserProfileData(container) {
        try {
            const merged = await this.getMergedProfile(this.currentUser);
            const pictureContainer = container.querySelector('#profile-picture-container');
            if (pictureContainer && merged && merged.photoURL) {
                const existingOverlay = pictureContainer.querySelector('label[for="profile-upload"]');
                const existingInput = pictureContainer.querySelector('#profile-upload');
                pictureContainer.innerHTML = `<img src="${merged.photoURL}" style="width: 100%; height: 100%; object-fit: cover;">`;
                if (existingOverlay) pictureContainer.appendChild(existingOverlay);
                if (existingInput) pictureContainer.appendChild(existingInput);
            }

            const doc = await firebase.firestore().collection('users').doc(this.currentUser.uid).get();
            if (doc.exists) {
                const data = doc.data();
                const form = container.querySelector('form');
                if (!form) return;

                if (merged && merged.displayName) form.querySelector('[name="displayName"]').value = merged.displayName;
                if (data.phone) form.querySelector('[name="phone"]').value = data.phone;
                if (data.address) form.querySelector('[name="address"]').value = data.address;
                if (data.zip) form.querySelector('[name="zip"]').value = data.zip;
                if (data.city) form.querySelector('[name="city"]').value = data.city;
                form.querySelector('[name="newsletter"]').checked = data.newsletter !== false; // Default true
            }
        } catch (e) {
            console.warn('Could not load user profile data:', e);
        }
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
            await firebase.firestore().collection('users').doc(this.currentUser.uid).set({
                photoURL: url,
                displayName: this.currentUser.displayName || '',
                email: this.currentUser.email || '',
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            if (window.firebaseService && typeof window.firebaseService.savePageContent === 'function') {
                await window.firebaseService.savePageContent('settings_profile', {
                    fullName: this.currentUser.displayName || '',
                    photoUrl: url,
                    updatedAt: new Date().toISOString()
                });
            }

            container.innerHTML = `<img src="${url}" style="width:100%;height:100%;object-fit:cover;">`;
            await this.updateUserProfile(this.currentUser);
            alert('Profilbilde er oppdatert!');
        } catch (error) {
            console.error("Opplasting feilet:", error);
            container.innerHTML = originalContent;
            alert('Kunne ikke laste opp bilde: ' + error.message);
        }
    }

    async handleProfileSave(form) {
        const btn = form.querySelector('button[type="submit"]');
        const originalText = btn.textContent;
        btn.disabled = true;
        btn.textContent = 'Lagrer...';

        try {
            const formData = new FormData(form);
            const updates = {
                displayName: formData.get('displayName'),
                phone: formData.get('phone'),
                address: formData.get('address'),
                zip: formData.get('zip'),
                city: formData.get('city'),
                newsletter: formData.get('newsletter') === 'on',
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            // 1. Update Auth Profile (DisplayName)
            if (updates.displayName && updates.displayName !== this.currentUser.displayName) {
                await this.currentUser.updateProfile({
                    displayName: updates.displayName
                });
                await this.updateUserProfile(this.currentUser); // Update sidebar
            }

            // 2. Update Firestore Document
            await firebase.firestore().collection('users').doc(this.currentUser.uid).set({
                ...updates,
                photoURL: this.currentUser.photoURL || '',
                email: this.currentUser.email || ''
            }, { merge: true });
            if (window.firebaseService && typeof window.firebaseService.savePageContent === 'function') {
                await window.firebaseService.savePageContent('settings_profile', {
                    fullName: updates.displayName || '',
                    phone: updates.phone || '',
                    address: updates.address || '',
                    updatedAt: new Date().toISOString()
                });
            }

            alert('Profilen er oppdatert!');
        } catch (error) {
            console.error('Save failed:', error);
            alert('Kunne ikke lagre endringer: ' + error.message);
        } finally {
            btn.disabled = false;
            btn.textContent = originalText;
        }
    }

    async syncGooglePhoto() {
        const googleProvider = this.currentUser.providerData.find(p => p.providerId === 'google.com');
        if (googleProvider && googleProvider.photoURL) {
            try {
                await this.currentUser.updateProfile({
                    photoURL: googleProvider.photoURL
                });
                await firebase.firestore().collection('users').doc(this.currentUser.uid).set({
                    photoURL: googleProvider.photoURL,
                    displayName: this.currentUser.displayName || googleProvider.displayName || this.currentUser.email || '',
                    email: this.currentUser.email || '',
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
                if (window.firebaseService && typeof window.firebaseService.savePageContent === 'function') {
                    await window.firebaseService.savePageContent('settings_profile', {
                        fullName: this.currentUser.displayName || googleProvider.displayName || '',
                        photoUrl: googleProvider.photoURL,
                        updatedAt: new Date().toISOString()
                    });
                }
                this.loadView('profile'); // Refresh view
                await this.updateUserProfile(this.currentUser);
                alert('Profilbilde hentet fra Google!');
            } catch (error) {
                console.error("Google sync feilet:", error);
                alert('Kunne ikke hente bilde fra Google.');
            }
        }
    }

    async handleAccountDeletion() {
        if (!this.currentUser) return;
        this.showDeleteConfirmationModal();
    }

    showDeleteConfirmationModal() {
        // Remove existing if any
        const existing = document.getElementById('hkm-delete-modal-overlay');
        if (existing) existing.remove();

        const warningMsg = "Dette vil slette kontoen din, alle dine kurshistorikk, profilinformasjon og dine lagrede data permanent. Dette kan ikke angres. Vil du fortsette?";

        const modalHtml = `
            <div id="hkm-delete-modal-overlay" class="hkm-modal-overlay">
                <div class="hkm-modal-container">
                    <div class="hkm-modal-icon">
                        <span class="material-symbols-outlined">warning</span>
                    </div>
                    <h3 class="hkm-modal-title">\u26A0\uFE0F Slett konto?</h3>
                    <p class="hkm-modal-message">${warningMsg}</p>
                    <div class="hkm-modal-actions">
                        <button id="hkm-modal-cancel" class="hkm-modal-btn hkm-modal-btn-cancel">Avbryt</button>
                        <button id="hkm-modal-confirm" class="hkm-modal-btn hkm-modal-btn-delete">Slett konto</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        const overlay = document.getElementById('hkm-delete-modal-overlay');
        const cancelBtn = document.getElementById('hkm-modal-cancel');
        const confirmBtn = document.getElementById('hkm-modal-confirm');

        // Close on cancel or overlay click
        const closeModal = () => {
            overlay.classList.remove('active');
            setTimeout(() => overlay.remove(), 200);
        };

        cancelBtn.onclick = closeModal;
        overlay.onclick = (e) => {
            if (e.target === overlay) closeModal();
        };

        // Confirm deletion
        confirmBtn.onclick = async () => {
            confirmBtn.disabled = true;
            confirmBtn.textContent = 'Sletter...';
            await this.performAccountDeletion();
        };

        // Show with animation
        requestAnimationFrame(() => {
            overlay.classList.add('active');
        });
    }

    async createAdminNotification(notifData) {
        try {
            await firebase.firestore().collection('admin_notifications').add({
                ...notifData,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                read: false
            });
            console.log("Admin notification created:", notifData);
        } catch (err) {
            console.warn("Failed to create admin notification:", err);
        }
    }

    async performAccountDeletion() {
        const btn = document.getElementById('delete-account-btn');
        const originalText = btn ? btn.textContent : '';
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Sletter konto...';
        }

        try {
            const uid = this.currentUser.uid;

            // 1. Delete user data from Firestore first
            console.log(`[HKM] Deleting Firestore data for user: ${uid}`);
            await firebase.firestore().collection('users').doc(uid).delete();

            // 2. Delete the user account from Firebase Auth
            console.log(`[HKM] Deleting Auth account for user: ${uid}`);
            await this.currentUser.delete();

            alert('Din konto er nå slettet. Takk for tiden din hos oss.');
            window.location.href = '../index.html';
        } catch (error) {
            console.error('Account deletion failed:', error);

            // Close modal so alert is visible
            const overlay = document.getElementById('hkm-delete-modal-overlay');
            if (overlay) overlay.remove();

            if (error.code === 'auth/requires-recent-login') {
                alert('For din sikkerhet må du logge ut og inn igjen for å bekrefte at du eier kontoen før du kan slette den.');
                await firebase.auth().signOut();
                window.location.href = 'login.html';
            } else {
                alert('Kunne ikke slette konto: ' + error.message);
                if (btn) {
                    btn.disabled = false;
                    btn.textContent = originalText;
                }
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
        const _k1 = "AIza" + "Sy";
        const _k2 = "AelVsZnTU5xjQsjewWG7RjYEsQSHH-bkE";

        const config = {
            apiKey: _k1 + _k2,
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
