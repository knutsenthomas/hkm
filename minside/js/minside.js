/* ═══════════════════════════════════════════════════════
   MIN SIDE — PCO-inspired Member Profile
   ═══════════════════════════════════════════════════════ */

class MinSideManager {
    constructor() {
        this.currentUser = null;
        this.profileData = {};

        this.views = {
            overview: this.renderOverview,
            profile: this.renderProfile,
            activity: this.renderActivity,
            notifications: this.renderNotifications,
            giving: this.renderGiving,
            courses: this.renderCourses,
            notes: this.renderNotes,
        };

        this.init();
    }

    // ──────────────────────────────────────────────────────────
    // INIT
    // ──────────────────────────────────────────────────────────
    async init() {
        this.setupNavigation();

        // Wait for Firebase to be ready with a small timeout
        let count = 0;
        while ((!window.firebaseService || !window.firebaseService.isInitialized) && count < 100) {
            await new Promise(r => setTimeout(r, 50));
            count++;
        }

        firebase.auth().onAuthStateChanged(async (user) => {
            try {
                if (user) {
                    this.currentUser = user;
                    await this.syncUserProfile(user);
                    await this.syncProfileFromGoogleProvider();
                    this.profileData = await this.getMergedProfile(user);
                    await this.refreshProfileSubCollections(user.uid);
                    this.updateHeader();
                    this.initNotificationBadge();
                    this.showPendingFlashNotice();

                    const startView = window.location.hash.replace('#', '') || 'overview';
                    this.loadView(startView);
                } else {
                    window.location.href = '/minside/login.html';
                }
            } catch (error) {
                console.error('Init Error:', error);
                const area = document.getElementById('view-container') || document.getElementById('content-area');
                if (area) {
                    area.innerHTML = `<div class="empty-state"><span class="material-symbols-outlined">error</span><h3>Feil ved oppstart</h3><p>${error.message}</p></div>`;
                }
            }
        });
    }

    // ──────────────────────────────────────────────────────────
    // NAVIGATION
    // ──────────────────────────────────────────────────────────
    setupNavigation() {
        document.querySelectorAll('.nav-link[data-view]').forEach(link => {
            link.addEventListener('click', e => {
                e.preventDefault();
                this.loadView(link.dataset.view);
                if (window.innerWidth <= 768) this.toggleSidebar(false);
            });
        });

        document.getElementById('mobile-toggle')?.addEventListener('click', () => this.toggleSidebar(true));
        document.getElementById('sidebar-overlay')?.addEventListener('click', () => this.toggleSidebar(false));

        document.getElementById('logout-btn')?.addEventListener('click', () => {
            firebase.auth().signOut().then(() => window.location.href = '/');
        });
        document.getElementById('sidebar-logout-btn')?.addEventListener('click', () => {
            firebase.auth().signOut().then(() => window.location.href = '/');
        });

        // Actions dropdown
        const actionsBtn = document.getElementById('actions-btn');
        const actionsMenu = document.getElementById('actions-menu');
        actionsBtn?.addEventListener('click', e => {
            e.stopPropagation();
            actionsMenu.classList.toggle('open');
        });
        document.addEventListener('click', () => actionsMenu?.classList.remove('open'));

        // Profile photo upload
        document.getElementById('ph-upload')?.addEventListener('change', e => this.handlePhotoUpload(e));
    }

    toggleSidebar(show) {
        document.getElementById('sidebar')?.classList.toggle('active', show);
        document.getElementById('sidebar-overlay')?.classList.toggle('active', show);
    }

    loadView(viewId) {
        if (!this.views[viewId]) viewId = 'overview';
        window.location.hash = viewId;

        // View info mapping for header
        const viewInfo = {
            overview: { title: 'Oversikt', icon: 'grid_view' },
            profile: { title: 'Min Profil', icon: 'person' },
            activity: { title: 'Aktivitet', icon: 'history' },
            notifications: { title: 'Varslinger', icon: 'notifications' },
            giving: { title: 'Gaver & Betalinger', icon: 'volunteer_activism' },
            courses: { title: 'Kurs & Undervisning', icon: 'school' },
            notes: { title: 'Notater', icon: 'notes' },
        };

        // Update Header Title and Icon (Admin Style)
        const info = viewInfo[viewId] || { title: 'Min Side', icon: 'person' };
        const titleEl = document.getElementById('dashboard-main-header-title');
        const iconEl = document.getElementById('dashboard-main-header-icon');
        
        if (titleEl) titleEl.textContent = info.title;
        if (iconEl) iconEl.textContent = info.icon;

        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        document.querySelector(`.nav-link[data-view="${viewId}"]`)?.classList.add('active');

        const container = document.getElementById('view-container') || document.getElementById('content-area');
        container.innerHTML = `<div class="loading-state"><div class="spinner"></div><p>Laster...</p></div>`;

        setTimeout(async () => {
            try {
                await this.views[viewId].call(this, container);
            } catch (err) {
                console.error(`View "${viewId}" error:`, err);
                container.innerHTML = `<div class="empty-state"><span class="material-symbols-outlined">error</span><h3>Noe gikk galt</h3><p>${err.message}</p></div>`;
            }
        }, 80);
    }

    _notify(message, type = 'warning', duration = 4500) {
        if (!message) return;
        if (typeof window.showToast === 'function') {
            window.showToast(message, type, duration);
            return;
        }

        let host = document.getElementById('minside-inline-notice');
        if (!host) {
            host = document.createElement('div');
            host.id = 'minside-inline-notice';
            host.style.cssText = 'position:fixed;top:16px;right:16px;z-index:9999;max-width:360px;padding:12px 14px;border-radius:12px;font:500 14px/1.35 Inter,system-ui,sans-serif;box-shadow:0 8px 24px rgba(15,23,42,.1);';
            document.body.appendChild(host);
        }
        const palette = type === 'success'
            ? { bg: '#ecfdf5', fg: '#166534' }
            : type === 'error'
                ? { bg: '#fef2f2', fg: '#991b1b' }
                : { bg: '#fffbeb', fg: '#92400e' };
        host.style.background = palette.bg;
        host.style.color = palette.fg;
        host.style.border = '1px solid rgba(15,23,42,.08)';
        host.textContent = String(message);
        clearTimeout(this._inlineNoticeTimer);
        this._inlineNoticeTimer = setTimeout(() => {
            if (host && host.parentNode) host.parentNode.removeChild(host);
        }, Math.max(1500, duration));
    }

    showPendingFlashNotice() {
        try {
            const raw = sessionStorage.getItem('hkm_flash_notice');
            if (!raw) return;
            sessionStorage.removeItem('hkm_flash_notice');
            const notice = JSON.parse(raw);
            if (!notice || !notice.message) return;
            if (notice.createdAt && (Date.now() - notice.createdAt > 30000)) return;
            this._notify(notice.message, notice.type || 'warning', notice.duration || 5000);
        } catch (e) {
            // noop
        }
    }

    // ──────────────────────────────────────────────────────────
    // HEADER
    // ──────────────────────────────────────────────────────────
    updateHeader() {
        const p = this.profileData;
        const name = p.displayName || this.currentUser?.email || 'Bruker';

        // Name
        const nameEl = document.getElementById('ph-name');
        if (nameEl) nameEl.textContent = name;

        // Avatar
        this._setAvatarEl(document.getElementById('ph-avatar'), p.photoURL, name);

        // Role
        const roleEl = document.getElementById('ph-role');
        if (roleEl) roleEl.textContent = this._roleLabel(p.role);

        // Admin link visibility
        const normalizedRole = String(p.role || '').trim().toLowerCase();
        const canAccessAdmin = normalizedRole === 'admin' || normalizedRole === 'superadmin';

        document.getElementById('ph-admin-link')?.classList.toggle('is-hidden', !canAccessAdmin);
        document.getElementById('sidebar-admin-link')?.classList.toggle('is-hidden', !canAccessAdmin);
    }

    _setAvatarEl(el, photoURL, name) {
        if (!el) return;
        
        // Match Admin Dashboard behavior: Always show initials, ignore photoURL in header
        const initials = (name || '?')
            .split(' ')
            .filter(n => n.length > 0)
            .map(n => n[0].toUpperCase())
            .slice(0, 2)
            .join('');
        
        el.innerHTML = `<span style="color: white !important; font-weight: 900 !important; visibility: visible !important; opacity: 1 !important; display: block !important;">${initials || '?'}</span>`;
        
        // Store photoURL in dataset for parity, though not currently used for rendering
        if (photoURL) el.dataset.photoUrl = photoURL;
    }

    _roleLabel(role) {
        const map = {
            superadmin: 'Administrator',
            admin: 'Administrator',
            pastor: 'Pastor',
            leder: 'Leder',
            frivillig: 'Frivillig',
            giver: 'Fast Giver'
        };
        return map[role] || 'Medlem';
    }

    // ──────────────────────────────────────────────────────────
    // FIREBASE SYNC
    // ──────────────────────────────────────────────────────────
    _emptyProfileSubCollections() {
        return {
            communication: { items: [], count: 0 },
            activity: { items: [], count: 0 },
            notes: { personal: [], shared: [], count: 0 }
        };
    }

    _normalizeNotificationDoc(docLike) {
        const raw = typeof docLike?.data === 'function' ? (docLike.data() || {}) : (docLike || {});
        return {
            id: docLike?.id || raw.id || '',
            title: typeof raw.title === 'string' && raw.title.trim() ? raw.title.trim() : 'Varsling',
            body: typeof raw.body === 'string' ? raw.body : '',
            type: typeof raw.type === 'string' && raw.type.trim() ? raw.type.trim().toLowerCase() : 'default',
            link: typeof raw.link === 'string' ? raw.link : '',
            read: raw.read === true,
            createdAt: raw.createdAt || null,
        };
    }

    _normalizeNoteDoc(docLike, fallbackSource = 'personal') {
        const raw = typeof docLike?.data === 'function' ? (docLike.data() || {}) : (docLike || {});
        return {
            id: docLike?.id || raw.id || '',
            title: typeof raw.title === 'string' && raw.title.trim() ? raw.title.trim() : 'Uten tittel',
            text: typeof raw.text === 'string' ? raw.text : '',
            authorName: typeof raw.authorName === 'string' && raw.authorName.trim() ? raw.authorName.trim() : 'HKM-teamet',
            createdAt: raw.createdAt || null,
            updatedAt: raw.updatedAt || null,
            source: raw.source || fallbackSource,
            userId: raw.userId || this.currentUser?.uid || '',
        };
    }

    async refreshProfileSubCollections(uid) {
        if (!uid) {
            this.profileData.subCollections = this._emptyProfileSubCollections();
            return this.profileData.subCollections;
        }

        const empty = this._emptyProfileSubCollections();

        try {
            const [notifications, personalNotes, sharedNotes] = await Promise.all([
                window.firebaseService.getCachedCollection('user_notifications', `notifs:${uid}`,
                    ref => ref.where('userId', '==', uid).orderBy('createdAt', 'desc').limit(30)),
                window.firebaseService.getCachedCollection('personal_notes', `personal_notes:${uid}`,
                    ref => ref.where('userId', '==', uid).orderBy('createdAt', 'desc').limit(30)),
                window.firebaseService.getCachedCollection('user_notes', `shared_notes:${uid}`,
                    ref => ref.where('userId', '==', uid).orderBy('createdAt', 'desc').limit(30)),
            ]);

            const normalizedNotifs = (notifications || []).map(d => this._normalizeNotificationDoc(d));
            const communicationItems = normalizedNotifs.filter(item =>
                ['push', 'message', 'email', 'announcement'].includes(item.type) || !!item.body
            );

            const normalizedPersonal = (personalNotes || []).map(d => this._normalizeNoteDoc(d, 'personal'));
            const normalizedShared = (sharedNotes || []).map(d => this._normalizeNoteDoc(d, 'shared'));

            const mapped = {
                communication: {
                    items: communicationItems,
                    count: communicationItems.length
                },
                activity: {
                    items: normalizedNotifs,
                    count: normalizedNotifs.length
                },
                notes: {
                    personal: normalizedPersonal,
                    shared: normalizedShared,
                    count: normalizedPersonal.length + normalizedShared.length
                }
            };

            this.profileData = {
                ...this.profileData,
                subCollections: mapped
            };

            return mapped;
        } catch (e) {
            console.warn('refreshProfileSubCollections:', e);
            this.profileData = {
                ...this.profileData,
                subCollections: empty
            };
            return empty;
        }
    }

    async getMergedProfile(user) {
        if (!user) return {};
        let data = {};
        try {
            const doc = await firebase.firestore().collection('users').doc(user.uid).get();
            if (doc.exists) data = doc.data() || {};
        } catch (e) { console.warn('getMergedProfile:', e); }

        const google = (user.providerData || []).find(p => p.providerId === 'google.com') || {};
        const role = await window.firebaseService.getUserRole(user.uid);

        return {
            ...data,
            displayName: data.displayName || user.displayName || google.displayName || user.email || '',
            photoURL: data.photoURL || user.photoURL || google.photoURL || '',
            role: role || data.role || 'medlem',
            subCollections: this.profileData?.subCollections || data.subCollections || this._emptyProfileSubCollections(),
        };
    }

    async syncUserProfile(user) {
        if (!user) return;
        try {
            const ref = firebase.firestore().collection('users').doc(user.uid);
            const doc = await ref.get();
            if (!doc.exists) {
                await ref.set({
                    email: user.email || '',
                    displayName: user.displayName || '',
                    photoURL: user.photoURL || '',
                    role: 'medlem',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                });
                await this.createAdminNotification({
                    type: 'NEW_USER_REGISTRATION',
                    userId: user.uid,
                    userEmail: user.email,
                    userName: user.displayName || user.email,
                    message: `Ny bruker: ${user.displayName || user.email}`,
                });
            }
        } catch (e) { console.warn('syncUserProfile:', e); }
    }

    async syncProfileFromGoogleProvider() {
        const user = this.currentUser;
        if (!user) return;
        const google = (user.providerData || []).find(p => p.providerId === 'google.com');
        if (!google) return;
        try {
            const updates = {};
            if (!user.displayName && google.displayName) updates.displayName = google.displayName;
            if (!user.photoURL && google.photoURL) updates.photoURL = google.photoURL;
            if (Object.keys(updates).length) await user.updateProfile(updates);
            await firebase.firestore().collection('users').doc(user.uid).set({
                displayName: user.displayName || google.displayName || '',
                photoURL: user.photoURL || google.photoURL || '',
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            }, { merge: true });
        } catch (e) { console.warn('syncGoogleProvider:', e); }
    }

    async createAdminNotification(data) {
        try {
            await firebase.firestore().collection('admin_notifications').add({
                ...data,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                read: false,
            });
        } catch (e) { console.warn('createAdminNotification:', e); }
    }

    // ──────────────────────────────────────────────────────────
    // NOTIFICATION BADGE
    // ──────────────────────────────────────────────────────────
    initNotificationBadge() {
        const uid = this.currentUser?.uid;
        if (!uid) return;
        try {
            firebase.firestore()
                .collection('user_notifications')
                .where('userId', '==', uid)
                .where('read', '==', false)
                .onSnapshot(snap => this._setBadge(snap.size));
        } catch (e) { console.warn('badge listener:', e); }
    }

    _setBadge(count) {
        const el = document.getElementById('notif-badge');
        const headerDot = document.getElementById('notif-badge-header');
        
        if (el) {
            el.textContent = count > 9 ? '9+' : count;
            el.style.display = count > 0 ? 'inline-block' : 'none';
        }
        
        if (headerDot) {
            headerDot.style.display = count > 0 ? 'block' : 'none';
        }
    }

    _timeAgo(dateVal) {
        const date = (dateVal instanceof Date) ? dateVal : (dateVal?.toDate ? dateVal.toDate() : new Date(dateVal));
        if (isNaN(date.getTime())) return '';
        const s = Math.floor((Date.now() - date.getTime()) / 1000);
        if (s < 0) return 'Akkurat nå';
        if (s < 60) return 'Akkurat nå';
        if (s < 3600) return `${Math.floor(s / 60)} min siden`;
        if (s < 86400) return `${Math.floor(s / 3600)} t siden`;
        if (s < 604800) return `${Math.floor(s / 86400)} d siden`;
        return date.toLocaleDateString('no-NO', { day: 'numeric', month: 'short', year: 'numeric' });
    }

    // ══════════════════════════════════════════════════════════
    // VIEW: OVERSIKT (Dashboard forside)
    // ══════════════════════════════════════════════════════════
    async renderOverview(container) {
        const p = this.profileData;
        const user = this.currentUser;
        const name = (p.displayName || user?.displayName || user?.email || 'Venn').split(' ')[0];
        const year = new Date().getFullYear();
        const hour = new Date().getHours();
        const greeting = hour < 12 ? 'God morgen' : hour < 17 ? 'Hei' : 'God kveld';

        container.innerHTML = `
        <div class="ms-overview-wrap">

            <!-- Welcome banner -->
            <div class="ms-overview-banner">
                <div>
                    <h2 class="ms-overview-banner-title">
                        ${greeting}, ${name}! 👋
                    </h2>
                    <p class="ms-overview-banner-quote">
                        "For jeg vet hvilke tanker jeg har med dere, sier Herren..." — Jer 29:11
                    </p>
                </div>
                <div class="ms-overview-banner-chip">
                    <div class="ms-overview-banner-chip-label">Medlem siden</div>
                    <div class="ms-overview-banner-chip-value" id="ov-member-since">—</div>
                </div>
            </div>

            <!-- Stats row -->
            <div class="ms-overview-stats">
                <div class="stat-chip">
                    <div class="stat-chip-label">Uleste varslinger</div>
                    <div class="stat-chip-value" id="ov-notif-count">—</div>
                    <div class="stat-chip-sub">Trykk for å se alle</div>
                </div>
                <div class="stat-chip">
                    <div class="stat-chip-label">Gitt totalt i ${year}</div>
                    <div class="stat-chip-value" id="ov-year-total">—</div>
                    <div class="stat-chip-sub" id="ov-year-sub">Se gavehistorikk</div>
                </div>
                <div class="stat-chip">
                    <div class="stat-chip-label">Tilgjengelige kurs</div>
                    <div class="stat-chip-value" id="ov-courses-count">—</div>
                    <div class="stat-chip-sub">Undervisning fra HKM</div>
                </div>
            </div>

            <!-- Quick actions -->
            <div class="info-card ms-overview-card-gap">
                <div class="info-card-header"><h3>Hurtiglenker</h3></div>
                <div class="ms-overview-actions-grid">
                    ${[
                { view: 'profile', icon: 'person', label: 'Min profil', sub: 'Kontakt & personlig info' },
                { view: 'giving', icon: 'volunteer_activism', label: 'Gaver', sub: 'Gavehistorikk' },
                { view: 'courses', icon: 'school', label: 'Kurs', sub: 'Undervisning fra HKM' },
                { view: 'notifications', icon: 'notifications', label: 'Varslinger', sub: 'Meldinger fra HKM' },
            ].map(a => `
                    <button class="ov-action-btn" data-view="${a.view}">
                        <div class="ms-overview-action-icon-wrap">
                            <span class="material-symbols-outlined ms-overview-action-icon">${a.icon}</span>
                        </div>
                        <div class="ms-overview-action-label">${a.label}</div>
                        <div class="ms-overview-action-sub">${a.sub}</div>
                    </button>`).join('')}
                </div>
            </div>

            <!-- Recent notifications -->
            <div class="info-card">
                <div class="info-card-header">
                    <h3>Siste varslinger</h3>
                    <button class="btn btn-ghost btn-sm" onclick="window.minSideManager.loadView('notifications')">
                        Se alle
                    </button>
                </div>
                <div id="ov-recent-notifs">
                    <div class="loading-state ms-loading-min-80"><div class="spinner"></div></div>
                </div>
            </div>

        </div>`;

        // Quick action clicks
        container.querySelectorAll('.ov-action-btn').forEach(btn => {
            btn.addEventListener('click', () => this.loadView(btn.dataset.view));
        });

        // Stat: member since
        if (p.createdAt?.toDate) {
            document.getElementById('ov-member-since').textContent =
                p.createdAt.toDate().getFullYear();
        } else {
            document.getElementById('ov-member-since').textContent = new Date().getFullYear();
        }

        // Parallel fetches
        const uid = user?.uid;
        try {
            const [notifSnap, donationsSnap, coursesSnap, recentSnap] = await Promise.all([
                firebase.firestore().collection('user_notifications')
                    .where('userId', '==', uid).where('read', '==', false).get(),
                firebase.firestore().collection('donations')
                    .where('userId', '==', uid).get(),
                firebase.firestore().collection('teaching').get(),
                firebase.firestore().collection('user_notifications')
                    .where('userId', '==', uid).orderBy('createdAt', 'desc').limit(4).get(),
            ]);

            // Notif count
            const notifEl = document.getElementById('ov-notif-count');
            if (notifEl) notifEl.textContent = notifSnap.size || '0';

            // Year total giving
            let yearTotal = 0;
            donationsSnap.forEach(d => {
                const donation = d.data();
                if (donation.timestamp?.toDate?.()?.getFullYear?.() === new Date().getFullYear()) {
                    yearTotal += (donation.amount || 0) / 100;
                }
            });
            const yearEl = document.getElementById('ov-year-total');
            if (yearEl) yearEl.textContent = yearTotal > 0
                ? `kr ${yearTotal.toLocaleString('no-NO', { minimumFractionDigits: 0 })}`
                : 'Ingen';

            // Courses count
            const coursesEl = document.getElementById('ov-courses-count');
            if (coursesEl) coursesEl.textContent = coursesSnap.size || '0';

            // Recent notifications list
            const recentEl = document.getElementById('ov-recent-notifs');
            if (recentEl) {
                if (recentSnap.empty) {
                    recentEl.innerHTML = `<div class="ms-overview-notifs-empty">Ingen varslinger ennå.</div>`;
                } else {
                    recentEl.innerHTML = recentSnap.docs.map(doc => {
                        const d = this._normalizeNotificationDoc(doc);
                        const date = d.createdAt?.toDate ? d.createdAt.toDate() : new Date(0);
                        return `<div class="ms-overview-notif-row">
                            <div class="ms-overview-notif-dot ${d.read ? 'is-read' : ''}"></div>
                            <div class="ms-overview-notif-main">
                                <div class="ms-overview-notif-title">${d.title}</div>
                                <div class="ms-overview-notif-body">${d.body || ''}</div>
                            </div>
                            <div class="ms-overview-notif-time">${this._timeAgo(date)}</div>
                        </div>`;
                    }).join('') + `<div class="ms-overview-notifs-footer">
                        <button class="btn btn-ghost btn-sm ms-btn-full"
                            onclick="window.minSideManager.loadView('notifications')">
                            Vis alle varslinger
                        </button></div>`;
                }
            }
        } catch (e) {
            console.warn('Overview fetch error:', e);
        }
    }

    // ══════════════════════════════════════════════════════════
    // VIEW: PROFIL (PCO style)
    // ══════════════════════════════════════════════════════════
    async renderProfile(container) {
        const uid = this.currentUser?.uid;
        if (!uid) return;

        // Fresh fetch
        let data = {};
        try {
            const doc = await firebase.firestore().collection('users').doc(uid).get();
            if (doc.exists) data = doc.data() || {};
        } catch (e) { }

        const p = { ...this.profileData, ...data };
        const val = v => v ? `<span class="info-row-value">${v}</span>` : `<span class="info-row-value empty">—</span>`;

        const joinYear = p.createdAt?.toDate
            ? p.createdAt.toDate().getFullYear()
            : new Date().getFullYear();

        container.innerHTML = `
        <div class="profile-grid">
            <!-- ── LEFT COLUMN ── -->
            <div class="profile-left">

                <!-- Contact information -->
                <div class="info-card">
                    <div class="info-card-header">
                        <h3>Kontaktinformasjon</h3>
                        <button class="edit-icon-btn" id="toggle-contact-edit" title="Rediger">
                            <span class="material-symbols-outlined">edit</span>
                        </button>
                    </div>
                    <div class="info-rows" id="contact-display">
                        <div class="info-row">
                            <span class="material-symbols-outlined info-row-icon">mail</span>
                            <div class="info-row-content">
                                <div class="info-row-label">E-post</div>
                                ${val(this.currentUser.email)}
                            </div>
                        </div>
                        <div class="info-row">
                            <span class="material-symbols-outlined info-row-icon">phone</span>
                            <div class="info-row-content">
                                <div class="info-row-label">Telefon</div>
                                ${val(p.phone)}
                            </div>
                        </div>
                        <div class="info-row">
                            <span class="material-symbols-outlined info-row-icon">location_on</span>
                            <div class="info-row-content">
                                <div class="info-row-label">Adresse</div>
                                ${p.address || p.zip || p.city
                ? `<span class="info-row-value">${[p.address, [p.zip, p.city].filter(Boolean).join(' ')].filter(Boolean).join('<br>')}</span>`
                : `<span class="info-row-value empty">—</span>`}
                            </div>
                        </div>
                    </div>
                    <!-- Inline edit form -->
                    <div class="edit-form is-hidden" id="contact-edit-form">
                        <div class="form-group">
                            <label>Fullt navn</label>
                            <input name="displayName" value="${p.displayName || ''}" autocomplete="name">
                        </div>
                        <div class="form-group">
                            <label>Telefon</label>
                            <input name="phone" type="tel" value="${p.phone || ''}">
                        </div>
                        <div class="form-group">
                            <label>Gateadresse</label>
                            <input name="address" value="${p.address || ''}">
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Postnr</label>
                                <input name="zip" value="${p.zip || ''}">
                            </div>
                            <div class="form-group">
                                <label>By</label>
                                <input name="city" value="${p.city || ''}">
                            </div>
                        </div>
                        <div class="edit-form-actions">
                            <button class="btn btn-ghost btn-sm" id="cancel-contact-edit">Avbryt</button>
                            <button class="btn btn-primary btn-sm" id="save-contact-btn">
                                <span class="material-symbols-outlined">save</span> Lagre
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Personal information -->
                <div class="info-card">
                    <div class="info-card-header">
                        <h3>Personlig informasjon</h3>
                        <button class="edit-icon-btn" id="toggle-personal-edit">
                            <span class="material-symbols-outlined">edit</span>
                        </button>
                    </div>
                    <div class="info-rows" id="personal-display">
                        <div class="info-row">
                            <span class="material-symbols-outlined info-row-icon">person</span>
                            <div class="info-row-content">
                                <div class="info-row-label">Kjønn</div>
                                ${val(p.gender)}
                            </div>
                        </div>
                        <div class="info-row">
                            <span class="material-symbols-outlined info-row-icon">cake</span>
                            <div class="info-row-content">
                                <div class="info-row-label">Fødselsdato</div>
                                ${val(p.birthday ? new Date(p.birthday).toLocaleDateString('no-NO', { day: 'numeric', month: 'long', year: 'numeric' }) : '')}
                            </div>
                        </div>
                        <div class="info-row">
                            <span class="material-symbols-outlined info-row-icon">favorite</span>
                            <div class="info-row-content">
                                <div class="info-row-label">Sivilstatus</div>
                                ${val(p.maritalStatus)}
                            </div>
                        </div>
                        <div class="info-row">
                            <span class="material-symbols-outlined info-row-icon">calendar_today</span>
                            <div class="info-row-content">
                                <div class="info-row-label">Medlem siden</div>
                                <span class="info-row-value">${joinYear}</span>
                            </div>
                        </div>
                    </div>
                    <div class="edit-form is-hidden" id="personal-edit-form">
                        <div class="form-row">
                            <div class="form-group">
                                <label>Kjønn</label>
                                <select name="gender">
                                    <option value="">Velg...</option>
                                    <option value="Mann" ${p.gender === 'Mann' ? 'selected' : ''}>Mann</option>
                                    <option value="Kvinne" ${p.gender === 'Kvinne' ? 'selected' : ''}>Kvinne</option>
                                    <option value="Annet" ${p.gender === 'Annet' ? 'selected' : ''}>Annet</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Sivilstatus</label>
                                <select name="maritalStatus">
                                    <option value="">Velg...</option>
                                    <option value="Ugift"     ${p.maritalStatus === 'Ugift' ? 'selected' : ''}>Ugift</option>
                                    <option value="Gift"      ${p.maritalStatus === 'Gift' ? 'selected' : ''}>Gift</option>
                                    <option value="Samboer"   ${p.maritalStatus === 'Samboer' ? 'selected' : ''}>Samboer</option>
                                    <option value="Skilt"     ${p.maritalStatus === 'Skilt' ? 'selected' : ''}>Skilt</option>
                                    <option value="Enke/Enkemann" ${p.maritalStatus === 'Enke/Enkemann' ? 'selected' : ''}>Enke/Enkemann</option>
                                </select>
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Fødselsdato</label>
                            <input type="date" name="birthday" value="${p.birthday || ''}">
                        </div>
                        <div class="edit-form-actions">
                            <button class="btn btn-ghost btn-sm" id="cancel-personal-edit">Avbryt</button>
                            <button class="btn btn-primary btn-sm" id="save-personal-btn">
                                <span class="material-symbols-outlined">save</span> Lagre
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Danger Zone -->
                <div class="info-card">
                    <div class="info-card-header">
                        <h3>Kontoadministrasjon</h3>
                    </div>
                    <div class="ms-card-body-pad">
                        <p class="ms-danger-copy">
                            Sletting av konto er permanent og kan ikke angres.
                        </p>
                        <button class="btn btn-danger" id="delete-account-btn">
                            <span class="material-symbols-outlined">delete_forever</span>
                            Slett konto
                        </button>
                    </div>
                </div>
            </div>

            <!-- ── RIGHT COLUMN ── -->
            <div class="profile-right">

                <!-- Household -->
                <div class="info-card">
                    <div class="info-card-header">
                        <h3>Familie</h3>
                    </div>
                    <div id="household-content">
                        ${p.familyMembers?.length ? `
                            <p class="household-name">${p.displayName?.split(' ').pop() || ''} Husstand</p>
                            <div class="household-members">
                                ${p.familyMembers.map(m => `
                                    <div class="member-row">
                                        <div class="member-avatar">${(m.name || '?').charAt(0).toUpperCase()}</div>
                                        <div class="member-info">
                                            <div class="member-info-name">${m.name}</div>
                                            <div class="member-info-sub">${m.role || ''}</div>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        ` : `
                            <div class="empty-state ms-empty-state-compact">
                                <span class="material-symbols-outlined ms-empty-state-icon-compact">group_off</span>
                                <p class="ms-empty-state-copy-compact">Ingen familiemedlemmer registrert.</p>
                            </div>
                        `}
                    </div>
                </div>

                <!-- Push Notifications Toggle -->
                <div class="info-card">
                    <div class="info-card-header">
                        <h3>Varslingspreferanser</h3>
                    </div>
                    <div class="setting-row">
                        <div>
                            <div class="setting-row-label">Push-varslinger</div>
                            <div class="setting-row-sub">Mottar varslinger når HKM sender meldinger</div>
                        </div>
                        <label class="toggle">
                            <input type="checkbox" id="push-toggle" ${p.pushEnabled ? 'checked' : ''}>
                            <span class="toggle-slider"></span>
                        </label>
                    </div>
                    <div class="setting-row">
                        <div>
                            <div class="setting-row-label">E-postvarslinger</div>
                            <div class="setting-row-sub">Mottar nyhetsbrev og oppdateringer</div>
                        </div>
                        <label class="toggle">
                            <input type="checkbox" id="email-toggle" ${p.emailConsent !== false ? 'checked' : ''}>
                            <span class="toggle-slider"></span>
                        </label>
                    </div>
                    <div class="ms-card-footer-pad">
                        <div class="edit-form-actions" style="justify-content:flex-start">
                            <button class="btn btn-primary" id="save-prefs-btn">
                                <span class="material-symbols-outlined">save</span> Lagre preferanser
                            </button>
                        </div>
                    </div>
                </div>

            </div>
        </div>`;

        // ── Wire up events ──
        // Contact edit toggle
        const toggleContact = document.getElementById('toggle-contact-edit');
        const contactForm = document.getElementById('contact-edit-form');
        const contactDisp = document.getElementById('contact-display');
        toggleContact?.addEventListener('click', () => {
            if (!contactForm) return;
            contactForm.classList.toggle('is-hidden');
        });
        document.getElementById('cancel-contact-edit')?.addEventListener('click', () => {
            contactForm?.classList.add('is-hidden');
        });
        document.getElementById('save-contact-btn')?.addEventListener('click', async () => {
            await this._saveProfileFields(contactForm, ['displayName', 'phone', 'address', 'zip', 'city']);
            this.profileData = await this.getMergedProfile(this.currentUser);
            this.updateHeader();
            this.loadView('profile');
        });

        // Personal edit toggle
        const togglePersonal = document.getElementById('toggle-personal-edit');
        const personalForm = document.getElementById('personal-edit-form');
        togglePersonal?.addEventListener('click', () => {
            personalForm?.classList.toggle('is-hidden');
        });
        document.getElementById('cancel-personal-edit')?.addEventListener('click', () => {
            personalForm?.classList.add('is-hidden');
        });
        document.getElementById('save-personal-btn')?.addEventListener('click', async () => {
            await this._saveProfileFields(personalForm, ['gender', 'maritalStatus', 'birthday']);
            this.loadView('profile');
        });

        // Push toggle
        document.getElementById('save-prefs-btn')?.addEventListener('click', async () => {
            const pushEnabled = document.getElementById('push-toggle')?.checked;
            const emailConsent = document.getElementById('email-toggle')?.checked;
            try {
                await firebase.firestore().collection('users').doc(this.currentUser.uid).set(
                    { pushEnabled, emailConsent, updatedAt: firebase.firestore.FieldValue.serverTimestamp() },
                    { merge: true }
                );
                if (pushEnabled) await this._requestPushPermission();
            } catch (e) { console.warn('save prefs:', e); }
        });

        // Delete account
        document.getElementById('delete-account-btn')?.addEventListener('click', () => this.showDeleteConfirmModal());
    }

    async _saveProfileFields(formEl, fields) {
        if (!this.currentUser) return;
        const btn = formEl.querySelector('button[id^="save-"]');
        if (btn) { btn.disabled = true; btn.textContent = 'Lagrer...'; }
        try {
            const updates = { updatedAt: firebase.firestore.FieldValue.serverTimestamp() };
            fields.forEach(f => {
                const input = formEl.querySelector(`[name="${f}"]`);
                if (input) updates[f] = input.value;
            });
            if (updates.displayName && updates.displayName !== this.currentUser.displayName) {
                await this.currentUser.updateProfile({ displayName: updates.displayName });
            }
            await firebase.firestore().collection('users').doc(this.currentUser.uid).set(updates, { merge: true });
        } catch (e) {
            console.error('saveProfileFields:', e);
            alert('Feil ved lagring: ' + e.message);
        } finally {
            if (btn) { btn.disabled = false; btn.textContent = 'Lagret ✓'; }
        }
    }

    async _requestPushPermission() {
        try {
            if (!firebase.messaging || !firebase.messaging.isSupported()) return;
            const perm = await Notification.requestPermission();
            if (perm !== 'granted') return;
            const msg = firebase.messaging();
            const token = await msg.getToken({ vapidKey: 'BI2k24dp-3eJWtLSPvGWQkD00A_duNRCIMY_2ozLFI0-anJDamFBALaTdtzGYQEkoFz8X0JxTcCX6tn3P_i0YrA' });
            if (token) {
                await firebase.firestore().collection('users').doc(this.currentUser.uid).update({
                    fcmTokens: firebase.firestore.FieldValue.arrayUnion(token)
                });
            }
        } catch (e) { console.warn('push permission:', e); }
    }

    async handlePhotoUpload(e) {
        const file = e.target.files?.[0];
        if (!file || !this.currentUser) return;
        try {
            const ref = firebase.storage().ref(`profilePictures/${this.currentUser.uid}`);
            await ref.put(file);
            const url = await ref.getDownloadURL();
            await this.currentUser.updateProfile({ photoURL: url });
            await firebase.firestore().collection('users').doc(this.currentUser.uid).set({ photoURL: url }, { merge: true });
            this.profileData.photoURL = url;
            this._setAvatarEl(document.getElementById('ph-avatar'), url, this.profileData.displayName);
        } catch (err) {
            console.error('Photo upload failed:', err);
            alert('Feil ved opplasting: ' + err.message);
        }
    }

    // ══════════════════════════════════════════════════════════
    // VIEW: AKTIVITET
    // ══════════════════════════════════════════════════════════
    async renderActivity(container) {
        const uid = this.currentUser?.uid;
        container.innerHTML = `<div class="ms-full-width" id="activity-inner"><div class="loading-state ms-loading-min-120"><div class="spinner"></div></div></div>`;
        const list = container.querySelector('#activity-inner');

        try {
            const snap = await firebase.firestore()
                .collection('user_notifications')
                .where('userId', '==', uid)
                .orderBy('createdAt', 'desc')
                .limit(50)
                .get();

            if (snap.empty) {
                list.innerHTML = `<div class="empty-state">
                    <span class="material-symbols-outlined">history</span>
                    <h3>Ingen aktivitet ennå</h3>
                    <p>Aktivitet som push-varslinger og meldinger du mottar vil vises her.</p>
                </div>`;
                return;
            }

            const iconMap = {
                push: { icon: 'campaign', toneClass: 'activity-icon-tone-push' },
                message: { icon: 'mail', toneClass: 'activity-icon-tone-message' },
                default: { icon: 'notifications', toneClass: 'activity-icon-tone-default' },
            };

            const items = snap.docs.map(doc => this._normalizeNotificationDoc(doc));

            list.innerHTML = items.map(d => {
                const date = d.createdAt?.toDate ? d.createdAt.toDate() : new Date(0);
                const m = iconMap[d.type] || iconMap.default;
                return `
                <div class="activity-item ${!d.read ? 'unread' : ''}" data-id="${d.id}" style="cursor: pointer;">
                    <div class="activity-icon ${m.toneClass}">
                        <span class="material-symbols-outlined">${m.icon}</span>
                    </div>
                    <div class="activity-content">
                        <div class="activity-title">${d.title}</div>
                        ${d.body ? `<div class="activity-body">${d.body}</div>` : ''}
                        <div class="activity-time">${this._timeAgo(date)}</div>
                    </div>
                </div>`;
            }).join('');

            list.querySelectorAll('.activity-item').forEach(el => {
                el.addEventListener('click', () => {
                    const notif = items.find(n => n.id === el.dataset.id);
                    if (notif) this.showNotificationModal(notif);
                    if (notif && !notif.read) el.classList.remove('unread');
                });
            });

        } catch (err) {
            console.error('renderActivity error:', err);
            this._notify('Kunne ikke laste aktivitet akkurat nå.', 'warning');
            list.innerHTML = `<div class="empty-state"><span class="material-symbols-outlined">error</span><p>Kunne ikke laste aktivitet.</p></div>`;
        }
    }

    // ══════════════════════════════════════════════════════════
    // VIEW: VARSLINGER (unread + mark-read)
    // ══════════════════════════════════════════════════════════
    async renderNotifications(container) {
        const uid = this.currentUser?.uid;
        container.innerHTML = `
        <div class="ms-full-width">
            <div class="ms-section-header-row">
                <h2 class="ms-section-title">Varslinger</h2>
                <button class="btn btn-ghost btn-sm" id="mark-all-read-btn">Merk alle lest</button>
            </div>
            <div id="notifs-inner"><div class="loading-state ms-loading-min-80"><div class="spinner"></div></div></div>
        </div>`;

        const inner = container.querySelector('#notifs-inner');
        try {
            const snap = await firebase.firestore()
                .collection('user_notifications')
                .where('userId', '==', uid)
                .orderBy('createdAt', 'desc')
                .limit(30)
                .get();

            if (snap.empty) {
                inner.innerHTML = `<div class="empty-state">
                    <span class="material-symbols-outlined">notifications_off</span>
                    <h3>Ingen varslinger</h3>
                    <p>Du har ingen varslinger ennå.</p>
                </div>`;
                return;
            }

            const items = snap.docs.map(d => this._normalizeNotificationDoc(d));
            inner.innerHTML = items.map(n => {
                const date = n.createdAt?.toDate ? n.createdAt.toDate() : new Date(0);
                return `<div class="activity-item ${!n.read ? 'unread' : ''}" data-id="${n.id}" style="cursor: pointer;">
                    <div class="activity-icon ${!n.read ? 'activity-icon-tone-notif-unread' : 'activity-icon-tone-notif-read'}">
                        <span class="material-symbols-outlined">campaign</span>
                    </div>
                    <div class="activity-content">
                        <div class="activity-title">${n.title}</div>
                        ${n.body ? `<div class="activity-body">${n.body}</div>` : ''}
                        <div class="activity-time">${this._timeAgo(date)}</div>
                    </div>
                    ${!n.read ? `<div class="ms-unread-dot"></div>` : ''}
                </div>`;
            }).join('');

            inner.querySelectorAll('.activity-item').forEach(el => {
                el.addEventListener('click', () => {
                    const notif = items.find(n => n.id === el.dataset.id);
                    if (notif) this.showNotificationModal(notif);
                    if (notif && !notif.read) {
                        el.classList.remove('unread');
                        el.querySelector('.ms-unread-dot')?.remove();
                        const icon = el.querySelector('.activity-icon');
                        if (icon) {
                            icon.classList.remove('activity-icon-tone-notif-unread');
                            icon.classList.add('activity-icon-tone-notif-read');
                        }
                    }
                });
            });

            // Mark all read
            const unread = items.filter(n => !n.read);
            if (unread.length) {
                const batch = firebase.firestore().batch();
                unread.forEach(n => batch.update(firebase.firestore().collection('user_notifications').doc(n.id), { read: true }));
                await batch.commit();
                this._setBadge(0);
            }

            document.getElementById('mark-all-read-btn')?.addEventListener('click', async () => {
                const b = firebase.firestore().batch();
                items.forEach(n => b.update(firebase.firestore().collection('user_notifications').doc(n.id), { read: true }));
                await b.commit();
                this._setBadge(0);
                this.renderNotifications(container);
            });

        } catch (err) {
            console.error('renderNotifications error:', err);
            this._notify('Kunne ikke laste varslinger akkurat nå.', 'warning');
            inner.innerHTML = `<div class="empty-state"><p>Kunne ikke laste varslinger.</p></div>`;
        }
    }

    // ══════════════════════════════════════════════════════════
    // VIEW: GAVER
    // ══════════════════════════════════════════════════════════
    async renderGiving(container) {
        const uid = this.currentUser?.uid;
        container.innerHTML = `<div class="loading-state"><div class="spinner"></div></div>`;

        let donations = [];
        try {
            const snap = await firebase.firestore()
                .collection('donations')
                .where('userId', '==', uid)
                .orderBy('timestamp', 'desc')
                .get();
            snap.forEach(d => donations.push({ id: d.id, ...d.data() }));
        } catch (e) { }

        const currentYear = new Date().getFullYear();
        const yearTotal = donations.filter(d => d.timestamp?.toDate?.()?.getFullYear?.() === currentYear)
            .reduce((s, d) => s + (d.amount || 0) / 100, 0);
        const lastGift = donations[0];

        container.innerHTML = `
        <div>
            <div class="giving-stats">
                <div class="stat-chip">
                    <div class="stat-chip-label">Gitt i ${currentYear}</div>
                    <div class="stat-chip-value">${yearTotal > 0 ? `kr ${yearTotal.toLocaleString('no-NO', { minimumFractionDigits: 0 })}` : '—'}</div>
                </div>
                <div class="stat-chip">
                    <div class="stat-chip-label">Siste gave</div>
                    <div class="stat-chip-value">${lastGift ? `kr ${(lastGift.amount / 100).toLocaleString('no-NO')}` : '—'}</div>
                    <div class="stat-chip-sub">${lastGift?.timestamp?.toDate ? lastGift.timestamp.toDate().toLocaleDateString('no-NO') : ''}</div>
                </div>
                <div class="stat-chip">
                    <div class="stat-chip-label">Totalt antall gaver</div>
                    <div class="stat-chip-value">${donations.length || '—'}</div>
                </div>
            </div>

            <div class="table-card">
                <div class="table-card-header">
                    <h3>Gavehistorikk</h3>
                </div>
                ${donations.length === 0 ? `
                    <div class="empty-state ms-empty-state-giving">
                        <span class="material-symbols-outlined">volunteer_activism</span>
                        <h3>Ingen gaver ennå</h3>
                        <p>Dine donasjoner til HKM vises her.</p>
                    </div>
                ` : `
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Dato</th>
                                <th>Type</th>
                                <th>Metode</th>
                                <th class="text-right">Beløp</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${donations.map(d => {
            const date = d.timestamp?.toDate ? d.timestamp.toDate() : new Date();
            return `<tr>
                                    <td>${date.toLocaleDateString('no-NO', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                    <td>${d.type || 'Gave'}</td>
                                    <td><span class="method-tag">${d.method || 'Kort'}</span></td>
                                    <td class="text-right"><strong>kr ${(d.amount / 100).toLocaleString('no-NO', { minimumFractionDigits: 2 })}</strong></td>
                                </tr>`;
        }).join('')}
                        </tbody>
                    </table>
                `}
            </div>

        </div>`;
    }

    // ══════════════════════════════════════════════════════════
    // VIEW: KURS
    // ══════════════════════════════════════════════════════════
    async renderCourses(container) {
        container.innerHTML = `<div class="ms-full-width"><div class="loading-state"><div class="spinner"></div></div></div>`;
        let courses = [];
        try {
            const snap = await firebase.firestore().collection('teaching').orderBy('createdAt', 'desc').get();
            snap.forEach(d => courses.push({ id: d.id, ...d.data() }));
        } catch (e) { }

        if (courses.length === 0) {
            container.innerHTML = `<div class="ms-full-width"><div class="empty-state">
                <span class="material-symbols-outlined">school</span>
                <h3>Ingen kurs ennå</h3>
                <p>Undervisnings- og kursinnhold fra HKM vil vises her.</p>
            </div></div>`;
            return;
        }

        container.innerHTML = `<div class="courses-grid">
            ${courses.map(c => `
            <div class="course-card">
                <div class="course-thumb">
                    ${c.imageUrl ? `<img src="${c.imageUrl}" alt="${c.title}" loading="lazy">` : `<div class="ms-course-thumb-empty"><span class="material-symbols-outlined ms-course-thumb-empty-icon">school</span></div>`}
                    ${c.category ? `<span class="course-badge">${c.category}</span>` : ''}
                </div>
                <div class="course-body">
                    <div class="course-title">${c.title || 'Uten tittel'}</div>
                    <div class="course-desc">${c.excerpt || c.intro || ''}</div>
                    ${c.videoUrl ? `<a href="${c.videoUrl}" target="_blank" class="btn btn-primary btn-sm">
                        <span class="material-symbols-outlined">play_circle</span> Se video
                    </a>` : ''}
                </div>
            </div>`).join('')}
        </div>`;
    }

    // ══════════════════════════════════════════════════════════
    // VIEW: NOTATER (med bruker-CRUD)
    // ══════════════════════════════════════════════════════════
    async renderNotes(container) {
        const uid = this.currentUser?.uid;
        container.innerHTML = `<div class="loading-state"><div class="spinner"></div></div>`;

        // Fetch both personal notes and HKM notes in parallel
        let personalNotes = [], hkmNotes = [];
        try {
            const [personalSnap, hkmSnap] = await Promise.all([
                firebase.firestore()
                    .collection('personal_notes')
                    .where('userId', '==', uid)
                    .get(),
                firebase.firestore()
                    .collection('user_notes')
                    .where('userId', '==', uid)
                    .get(),
            ]);
            personalSnap.forEach(d => personalNotes.push(this._normalizeNoteDoc(d, 'personal')));
            hkmSnap.forEach(d => hkmNotes.push(this._normalizeNoteDoc(d, 'shared')));
            // Sort client-side (avoids composite index requirement)
            const sortByDate = (a, b) => {
                const ta = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
                const tb = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
                return tb - ta;
            };
            personalNotes.sort(sortByDate);
            hkmNotes.sort(sortByDate);
        } catch (e) {
            console.warn('renderNotes fetch:', e);
            this._notify('Kunne ikke laste notater akkurat nå.', 'warning');
        }

        this._renderNotesUI(container, personalNotes, hkmNotes);
    }

    _renderNotesUI(container, personalNotes, hkmNotes) {
        const makePNote = (n) => `
        <div class="personal-note-card" data-id="${n.id}">
            <div class="personal-note-header">
                <div class="personal-note-title">${n.title || 'Uten tittel'}</div>
                <div class="personal-note-meta">${n.createdAt?.toDate ? this._timeAgo(n.createdAt.toDate()) : ''}</div>
                <div class="personal-note-actions">
                    <button class="note-btn-edit" data-id="${n.id}" title="Rediger">
                        <span class="material-symbols-outlined">edit</span>
                    </button>
                    <button class="note-btn-delete" data-id="${n.id}" title="Slett">
                        <span class="material-symbols-outlined">delete</span>
                    </button>
                </div>
            </div>
            <div class="personal-note-body rte-content">${n.text || ''}</div>
        </div>`;

        container.innerHTML = `
        <div class="ms-full-width">

            <!-- Header row -->
            <div class="ms-section-header-row ms-section-header-lg">
                <div>
                    <h2 class="ms-section-title ms-section-title-lg">Mine notater</h2>
                    <p class="ms-section-subtitle">
                        Personlige notater som bare du kan se
                    </p>
                </div>
                <button class="btn btn-primary" id="new-note-btn">
                    <span class="material-symbols-outlined">add</span>
                    Nytt notat
                </button>
            </div>

            <!-- New note form (hidden by default) -->
            <div class="new-note-form is-hidden" id="new-note-form">
                <div class="form-group">
                    <label>Tittel</label>
                    <input id="note-title-input" placeholder="Gi notatet en tittel..." autocomplete="off">
                </div>
                <div class="form-group ms-form-group-gap-10">
                    <label>Innhold</label>
                    <div class="rte-wrapper">
                        <div class="rte-toolbar" id="rte-toolbar-new">
                            <button type="button" class="rte-btn" data-cmd="bold" title="Fet"><span class="material-symbols-outlined">format_bold</span></button>
                            <button type="button" class="rte-btn" data-cmd="italic" title="Kursiv"><span class="material-symbols-outlined">format_italic</span></button>
                            <button type="button" class="rte-btn" data-cmd="underline" title="Understrek"><span class="material-symbols-outlined">format_underlined</span></button>
                            <div class="rte-divider"></div>
                            <button type="button" class="rte-btn" data-cmd="formatBlock" data-val="H2" title="Overskrift"><span class="material-symbols-outlined">title</span></button>
                            <button type="button" class="rte-btn" data-cmd="formatBlock" data-val="P" title="Avsnitt"><span class="material-symbols-outlined">format_paragraph</span></button>
                            <div class="rte-divider"></div>
                            <button type="button" class="rte-btn" data-cmd="insertUnorderedList" title="Punktliste"><span class="material-symbols-outlined">format_list_bulleted</span></button>
                            <button type="button" class="rte-btn" data-cmd="insertOrderedList" title="Numrert liste"><span class="material-symbols-outlined">format_list_numbered</span></button>
                            <div class="rte-divider"></div>
                            <button type="button" class="rte-btn" data-cmd="removeFormat" title="Fjern formatering"><span class="material-symbols-outlined">format_clear</span></button>
                        </div>
                        <div class="rte-editor" id="note-body-editor" contenteditable="true"
                            data-placeholder="Skriv notat her..."></div>
                    </div>
                </div>
                <div class="ms-actions-row-end">
                    <button class="btn btn-ghost btn-sm" id="cancel-note-btn">Avbryt</button>
                    <button class="btn btn-primary btn-sm" id="save-note-btn">
                        <span class="material-symbols-outlined">save</span>
                        Lagre notat
                    </button>
                </div>
            </div>

            <!-- Personal notes list -->
            <div id="personal-notes-list" class="notes-list">
                ${personalNotes.length === 0
                ? `<div class="note-empty-personal">
                        <span class="material-symbols-outlined">edit_note</span>
                        <p>Du har ingen egne notater ennå.<br>Trykk «Nytt notat» for å begynne.</p>
                       </div>`
                : personalNotes.map(makePNote).join('')}
            </div>

            <!-- HKM Notes (read-only) -->
            ${hkmNotes.length > 0 ? `
            <div class="ms-section-top-gap">
                <div class="ms-divider-row">
                    <div class="ms-divider-line"></div>
                    <span class="ms-divider-label">
                        Notater fra HKM
                    </span>
                    <div class="ms-divider-line"></div>
                </div>
                <div class="notes-list">
                    ${hkmNotes.map(n => `
                    <div class="note-card">
                        <div class="note-author">
                            <span class="material-symbols-outlined ms-note-author-icon">shield_person</span>
                            ${n.authorName || 'HKM-teamet'} · ${n.createdAt?.toDate ? this._timeAgo(n.createdAt.toDate()) : ''}
                        </div>
                        ${n.title ? `<div class="ms-note-title">${n.title}</div>` : ''}
                        <div class="note-text">${n.text || ''}</div>
                    </div>`).join('')}
                </div>
            </div>` : ''}

        </div>`;

        // ── Wire up events ──
        const uid = this.currentUser?.uid;

        // Wire RTE toolbar
        this._wireRteToolbar('rte-toolbar-new', 'note-body-editor');

        // Toggle new note form
        document.getElementById('new-note-btn')?.addEventListener('click', () => {
            const form = document.getElementById('new-note-form');
            if (!form) return;
            const willOpen = form.classList.contains('is-hidden');
            form.classList.toggle('is-hidden');
            if (willOpen) document.getElementById('note-title-input')?.focus();
        });

        document.getElementById('cancel-note-btn')?.addEventListener('click', () => {
            document.getElementById('new-note-form')?.classList.add('is-hidden');
            document.getElementById('note-title-input').value = '';
            document.getElementById('note-body-editor').innerHTML = '';
        });

        // Save new note
        document.getElementById('save-note-btn')?.addEventListener('click', async () => {
            const title = document.getElementById('note-title-input').value.trim();
            const editor = document.getElementById('note-body-editor');
            const text = editor?.innerHTML?.trim() || '';
            const plain = editor?.innerText?.trim() || '';
            if (!plain) { editor?.focus(); return; }

            const btn = document.getElementById('save-note-btn');
            btn.disabled = true; btn.textContent = 'Lagrer...';

            try {
                const ref = await firebase.firestore().collection('personal_notes').add({
                    userId: uid,
                    title: title || 'Uten tittel',
                    text,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                });
                // Prepend new note immediately
                personalNotes.unshift({ id: ref.id, title: title || 'Uten tittel', text, createdAt: null });
                this._renderNotesUI(container, personalNotes, hkmNotes);
            } catch (e) {
                console.error('Save note error:', e);
                alert('Feil ved lagring: ' + e.message);
                btn.disabled = false;
                btn.innerHTML = '<span class="material-symbols-outlined">save</span> Lagre notat';
            }
        });

        // Edit buttons
        container.querySelectorAll('.note-btn-edit').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.id;
                const note = personalNotes.find(n => n.id === id);
                if (!note) return;
                this._openNoteEditModal(note, async (newTitle, newText) => {
                    try {
                        await firebase.firestore().collection('personal_notes').doc(id).update({
                            title: newTitle,
                            text: newText,
                            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                        });
                        note.title = newTitle; note.text = newText;
                        this._renderNotesUI(container, personalNotes, hkmNotes);
                    } catch (e) { alert('Feil ved oppdatering: ' + e.message); }
                });
            });
        });

        // Delete buttons
        container.querySelectorAll('.note-btn-delete').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.id;
                if (!confirm('Er du sikker på at du vil slette dette notatet?')) return;
                firebase.firestore().collection('personal_notes').doc(id).delete()
                    .then(() => {
                        personalNotes = personalNotes.filter(n => n.id !== id);
                        this._renderNotesUI(container, personalNotes, hkmNotes);
                    })
                    .catch(e => alert('Feil: ' + e.message));
            });
        });
    }

    _openNoteEditModal(note, onSave) {
        const existing = document.getElementById('note-edit-modal');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.id = 'note-edit-modal';
        modal.className = 'hkm-modal-overlay';
        modal.innerHTML = `
        <div class="hkm-modal-container ms-note-modal-wide">
            <div class="ms-note-modal-header">
                <div class="hkm-modal-title ms-note-modal-title">Rediger notat</div>
                <button id="close-note-modal" class="ms-icon-button">
                    <span class="material-symbols-outlined ms-icon-button-icon">close</span>
                </button>
            </div>
            <div class="form-group">
                <label>Tittel</label>
                <input id="edit-note-title" value="${(note.title || '').replace(/"/g, '&quot;')}" autocomplete="off">
            </div>
            <div class="form-group ms-form-group-gap-12">
                <label>Innhold</label>
                <div class="rte-wrapper">
                    <div class="rte-toolbar" id="rte-toolbar-edit">
                        <button type="button" class="rte-btn" data-cmd="bold" title="Fet"><span class="material-symbols-outlined">format_bold</span></button>
                        <button type="button" class="rte-btn" data-cmd="italic" title="Kursiv"><span class="material-symbols-outlined">format_italic</span></button>
                        <button type="button" class="rte-btn" data-cmd="underline" title="Understrek"><span class="material-symbols-outlined">format_underlined</span></button>
                        <div class="rte-divider"></div>
                        <button type="button" class="rte-btn" data-cmd="formatBlock" data-val="H2" title="Overskrift"><span class="material-symbols-outlined">title</span></button>
                        <button type="button" class="rte-btn" data-cmd="formatBlock" data-val="P" title="Avsnitt"><span class="material-symbols-outlined">format_paragraph</span></button>
                        <div class="rte-divider"></div>
                        <button type="button" class="rte-btn" data-cmd="insertUnorderedList" title="Punktliste"><span class="material-symbols-outlined">format_list_bulleted</span></button>
                        <button type="button" class="rte-btn" data-cmd="insertOrderedList" title="Numrert liste"><span class="material-symbols-outlined">format_list_numbered</span></button>
                        <div class="rte-divider"></div>
                        <button type="button" class="rte-btn" data-cmd="removeFormat" title="Fjern formatering"><span class="material-symbols-outlined">format_clear</span></button>
                    </div>
                    <div class="rte-editor" id="edit-note-body" contenteditable="true"></div>
                </div>
            </div>
            <div class="hkm-modal-actions ms-modal-actions-top">
                <button class="btn btn-ghost hkm-modal-btn" id="cancel-note-modal">Avbryt</button>
                <button class="btn btn-primary hkm-modal-btn" id="save-note-modal">
                    <span class="material-symbols-outlined">save</span> Lagre
                </button>
            </div>
        </div>`;

        document.body.appendChild(modal);
        requestAnimationFrame(() => modal.classList.add('active'));

        // Set existing content into editor
        const editEditor = document.getElementById('edit-note-body');
        if (editEditor) editEditor.innerHTML = note.text || '';

        this._wireRteToolbar('rte-toolbar-edit', 'edit-note-body');
        document.getElementById('edit-note-title').focus();

        const close = () => { modal.classList.remove('active'); setTimeout(() => modal.remove(), 300); };

        document.getElementById('close-note-modal').addEventListener('click', close);
        document.getElementById('cancel-note-modal').addEventListener('click', close);
        modal.addEventListener('click', e => { if (e.target === modal) close(); });

        document.getElementById('save-note-modal').addEventListener('click', async () => {
            const btn = document.getElementById('save-note-modal');
            const title = document.getElementById('edit-note-title').value.trim();
            const editor = document.getElementById('edit-note-body');
            const text = editor?.innerHTML?.trim() || '';
            const plain = editor?.innerText?.trim() || '';
            if (!plain) { editor?.focus(); return; }
            btn.disabled = true; btn.textContent = 'Lagrer...';
            await onSave(title || 'Uten tittel', text);
            close();
        });
    }

    // ── Rich Text Editor helper ──────────────────────────────────
    _wireRteToolbar(toolbarId, editorId) {
        const toolbar = document.getElementById(toolbarId);
        const editor = document.getElementById(editorId);
        if (!toolbar || !editor) return;

        // Execute formatting commands
        toolbar.querySelectorAll('.rte-btn').forEach(btn => {
            btn.addEventListener('mousedown', e => {
                e.preventDefault(); // keep focus in editor
                const cmd = btn.dataset.cmd;
                const val = btn.dataset.val || null;
                document.execCommand(cmd, false, val);
                editor.focus();
                this._updateRteActiveStates(toolbar);
            });
        });

        // Update active states on selection change
        editor.addEventListener('keyup', () => this._updateRteActiveStates(toolbar));
        editor.addEventListener('mouseup', () => this._updateRteActiveStates(toolbar));
        editor.addEventListener('focus', () => toolbar.classList.add('rte-focused'));
        editor.addEventListener('blur', () => toolbar.classList.remove('rte-focused'));
    }

    _updateRteActiveStates(toolbar) {
        const cmds = ['bold', 'italic', 'underline', 'insertUnorderedList', 'insertOrderedList'];
        cmds.forEach(cmd => {
            const btn = toolbar.querySelector(`[data-cmd="${cmd}"]`);
            if (btn) btn.classList.toggle('active', document.queryCommandState(cmd));
        });
    }


    // ══════════════════════════════════════════════════════════
    // NOTIFICATION MODAL
    // ══════════════════════════════════════════════════════════
    showNotificationModal(notif) {
        const existing = document.getElementById('notif-modal');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.id = 'notif-modal';
        modal.className = 'hkm-modal-overlay';
        modal.innerHTML = `
        <div class="hkm-modal-container">
            <div class="ms-note-modal-header" style="margin-bottom: 16px;">
                <div class="hkm-modal-title" style="margin-bottom:0; padding-right: 32px;">${notif.title || 'Varsel'}</div>
                <button id="close-notif-modal" class="ms-icon-button">
                    <span class="material-symbols-outlined ms-icon-button-icon">close</span>
                </button>
            </div>
            ${notif.body ? `<div class="hkm-modal-message" style="text-align:left; white-space:pre-wrap; line-height:1.6; color:var(--text);">${notif.body}</div>` : ''}
            ${notif.link ? `<div style="margin-top: 24px;">
                <a href="${notif.link}" target="_blank" class="btn btn-primary" style="display:inline-flex; align-items:center; justify-content:center; gap:8px; width:100%;">
                    Åpne lenke <span class="material-symbols-outlined" style="font-size:20px;">open_in_new</span>
                </a>
            </div>` : ''}
            <div class="hkm-modal-actions ms-modal-actions-top" style="margin-top: 32px; border-top: 1px solid var(--border); padding-top: 16px;">
                <button class="btn btn-ghost hkm-modal-btn" id="delete-notif-modal" style="color: var(--danger); justify-content: center;">
                    <span class="material-symbols-outlined">delete</span> Slett varsel
                </button>
            </div>
        </div>`;

        document.body.appendChild(modal);
        requestAnimationFrame(() => modal.classList.add('active'));

        const close = () => { modal.classList.remove('active'); setTimeout(() => modal.remove(), 300); };
        modal.querySelector('#close-notif-modal').addEventListener('click', close);
        modal.addEventListener('click', e => { if (e.target === modal) close(); });

        // Delete action
        modal.querySelector('#delete-notif-modal').addEventListener('click', async () => {
            if (!confirm('Er du sikker på at du vil slette dette varselet?')) return;
            const btn = modal.querySelector('#delete-notif-modal');
            btn.disabled = true;
            btn.textContent = 'Sletter...';

            try {
                if (notif.id) {
                    await firebase.firestore().collection('user_notifications').doc(notif.id).delete();
                }
                // Remove from DOM
                document.querySelectorAll(`.activity-item[data-id="${notif.id}"]`).forEach(el => el.remove());
                close();
            } catch (err) {
                console.error('Error deleting notification:', err);
                alert('Kunne ikke slette varsel: ' + err.message);
                btn.disabled = false;
                btn.innerHTML = '<span class="material-symbols-outlined">delete</span> Slett varsel';
            }
        });

        // Mark as read in Firestore
        if (!notif.read && notif.id) {
            firebase.firestore().collection('user_notifications').doc(notif.id).set({ read: true }, { merge: true })
                .catch(e => console.warn('Could not mark notification as read.', e));
            notif.read = true;
            this._loadUnreadBadge(); // Update bell icon badge
        }
    }

    // ══════════════════════════════════════════════════════════
    // DELETE ACCOUNT MODAL
    // ══════════════════════════════════════════════════════════
    showDeleteConfirmModal() {
        const existing = document.getElementById('confirm-delete-modal');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.id = 'confirm-delete-modal';
        modal.className = 'hkm-modal-overlay';
        modal.innerHTML = `
                    < div class= "hkm-modal-container" >
            <div class="hkm-modal-icon">
                <span class="material-symbols-outlined">warning</span>
            </div>
            <div class="hkm-modal-title">Slett konto?</div>
            <p class="hkm-modal-message">
                Dette vil permanent slette kontoen din og all tilknyttet data. 
                Handlingen kan ikke angres. Du vil bli bedt om å bekrefte identiteten din.
            </p>
            <div class="hkm-modal-actions">
                <button class="btn btn-ghost hkm-modal-btn" id="cancel-delete-btn">Avbryt</button>
                <button class="btn btn-danger hkm-modal-btn" id="confirm-delete-btn">Slett konto</button>
            </div>
        </div > `;

        document.body.appendChild(modal);
        requestAnimationFrame(() => modal.classList.add('active'));

        modal.querySelector('#cancel-delete-btn').addEventListener('click', () => {
            modal.classList.remove('active');
            setTimeout(() => modal.remove(), 300);
        });

        modal.querySelector('#confirm-delete-btn').addEventListener('click', async () => {
            await this.performAccountDeletion();
            modal.remove();
        });

        modal.addEventListener('click', e => {
            if (e.target === modal) {
                modal.classList.remove('active');
                setTimeout(() => modal.remove(), 300);
            }
        });
    }

    async performAccountDeletion() {
        const user = firebase.auth().currentUser;
        if (!user) return;
        try {
            await firebase.firestore().collection('users').doc(user.uid).delete();
            await user.delete();
            window.location.href = '/';
        } catch (error) {
            if (error.code === 'auth/requires-recent-login') {
                alert('Vennligst logg inn på nytt for å bekrefte sletting.');
                await firebase.auth().signOut();
                window.location.href = '/minside/login.html';
            } else {
                alert('Feil: ' + error.message);
            }
        }
    }
}

// Boot
window.minSideManager = new MinSideManager();
