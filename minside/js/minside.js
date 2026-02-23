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

        firebase.auth().onAuthStateChanged(async (user) => {
            if (user) {
                this.currentUser = user;
                await this.syncUserProfile(user);
                await this.syncProfileFromGoogleProvider();
                this.profileData = await this.getMergedProfile(user);
                this.updateHeader();
                this.initNotificationBadge();
                const startView = window.location.hash.replace('#', '') || 'overview';
                this.loadView(startView);
            } else {
                window.location.href = 'login.html';
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
            firebase.auth().signOut().then(() => window.location.href = '../index.html');
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

        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        document.querySelector(`.nav-link[data-view="${viewId}"]`)?.classList.add('active');

        const container = document.getElementById('content-area');
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

        // Email
        const emailText = document.getElementById('ph-email-text');
        if (emailText) emailText.textContent = this.currentUser?.email || '—';

        // Phone
        const phoneText = document.getElementById('ph-phone-text');
        const phoneEl = document.getElementById('ph-phone');
        if (p.phone) {
            if (phoneText) phoneText.textContent = p.phone;
        } else {
            if (phoneEl) phoneEl.style.display = 'none';
        }

        // Role
        const roleEl = document.getElementById('ph-role');
        if (roleEl) roleEl.textContent = this._roleLabel(p.role);
    }

    _setAvatarEl(el, photoURL, name) {
        if (!el) return;
        if (photoURL) {
            el.innerHTML = `<img src="${photoURL}" alt="${name}">`;
        } else {
            el.textContent = (name || '?').charAt(0).toUpperCase();
        }
    }

    _roleLabel(role) {
        const map = { admin: 'Administrator', pastor: 'Pastor', leder: 'Leder', frivillig: 'Frivillig', giver: 'Fast Giver' };
        return map[role] || 'Medlem';
    }

    // ──────────────────────────────────────────────────────────
    // FIREBASE SYNC
    // ──────────────────────────────────────────────────────────
    async getMergedProfile(user) {
        if (!user) return {};
        let data = {};
        try {
            const doc = await firebase.firestore().collection('users').doc(user.uid).get();
            if (doc.exists) data = doc.data() || {};
        } catch (e) { console.warn('getMergedProfile:', e); }

        const google = (user.providerData || []).find(p => p.providerId === 'google.com') || {};
        return {
            ...data,
            displayName: data.displayName || user.displayName || google.displayName || user.email || '',
            photoURL: data.photoURL || user.photoURL || google.photoURL || '',
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
        if (!el) return;
        el.textContent = count > 9 ? '9+' : count;
        el.style.display = count > 0 ? 'inline-block' : 'none';
    }

    _timeAgo(date) {
        const s = Math.floor((Date.now() - date) / 1000);
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
        <div style="padding-bottom:32px">

            <!-- Welcome banner -->
            <div style="background:var(--accent-gradient); border-radius:var(--radius-lg); padding:28px 32px;
                margin-bottom:24px; box-shadow:0 8px 30px var(--accent-glow); display:flex;
                align-items:center; justify-content:space-between; gap:16px; flex-wrap:wrap;">
                <div>
                    <h2 style="font-size:1.5rem; font-weight:800; color:#fff; letter-spacing:-0.02em; margin-bottom:6px;">
                        ${greeting}, ${name}! 👋
                    </h2>
                    <p style="color:rgba(255,255,255,0.85); font-size:0.9rem; font-weight:500;">
                        "For jeg vet hvilke tanker jeg har med dere, sier Herren..." — Jer 29:11
                    </p>
                </div>
                <div style="background:rgba(255,255,255,0.15); border-radius:var(--radius-sm);
                    padding:12px 18px; backdrop-filter:blur(4px);">
                    <div style="color:rgba(255,255,255,0.8); font-size:0.7rem; font-weight:700;
                        text-transform:uppercase; letter-spacing:0.08em; margin-bottom:3px;">Medlem siden</div>
                    <div style="color:#fff; font-size:1.1rem; font-weight:800;" id="ov-member-since">—</div>
                </div>
            </div>

            <!-- Stats row -->
            <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(170px,1fr)); gap:14px; margin-bottom:24px;">
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
            <div class="info-card" style="margin-bottom:20px">
                <div class="info-card-header"><h3>Hurtiglenker</h3></div>
                <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(160px,1fr)); gap:1px;
                    background:var(--border-color);">
                    ${[
                { view: 'profile', icon: 'person', label: 'Min profil', sub: 'Kontakt & personlig info' },
                { view: 'giving', icon: 'volunteer_activism', label: 'Gaver', sub: 'Gavehistorikk & skattefradrag' },
                { view: 'courses', icon: 'school', label: 'Kurs', sub: 'Undervisning fra HKM' },
                { view: 'notifications', icon: 'notifications', label: 'Varslinger', sub: 'Meldinger fra HKM' },
            ].map(a => `
                    <button class="ov-action-btn" data-view="${a.view}">
                        <div style="width:40px;height:40px;border-radius:12px;background:var(--accent-light);
                            display:flex;align-items:center;justify-content:center;margin-bottom:10px;">
                            <span class="material-symbols-outlined" style="font-size:20px;color:var(--accent-color);">${a.icon}</span>
                        </div>
                        <div style="font-size:0.88rem;font-weight:800;color:var(--text-main);margin-bottom:2px;">${a.label}</div>
                        <div style="font-size:0.75rem;color:var(--text-muted);">${a.sub}</div>
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
                    <div class="loading-state" style="min-height:80px"><div class="spinner"></div></div>
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
                    recentEl.innerHTML = `<div style="padding:24px 22px; color:var(--text-muted); font-size:0.87rem;">Ingen varslinger ennå.</div>`;
                } else {
                    recentEl.innerHTML = recentSnap.docs.map(doc => {
                        const d = doc.data();
                        const date = d.createdAt?.toDate ? d.createdAt.toDate() : new Date(0);
                        return `<div style="display:flex;align-items:center;gap:14px;padding:13px 22px;
                            border-bottom:1px solid var(--border-color);transition:background 0.15s;"
                            onmouseover="this.style.background='var(--main-bg)'"
                            onmouseout="this.style.background=''">
                            <div style="width:8px;height:8px;border-radius:50%;flex-shrink:0;
                                background:${!d.read ? 'var(--accent-color)' : '#e2e8f0'};"></div>
                            <div style="flex:1;min-width:0;">
                                <div style="font-size:0.88rem;font-weight:700;color:var(--text-main);
                                    margin-bottom:2px;">${d.title || 'Varsling'}</div>
                                <div style="font-size:0.78rem;color:var(--text-muted);
                                    white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${d.body || ''}</div>
                            </div>
                            <div style="font-size:0.73rem;color:#94a3b8;white-space:nowrap;">${this._timeAgo(date)}</div>
                        </div>`;
                    }).join('') + `<div style="padding:12px 22px;">
                        <button class="btn btn-ghost btn-sm" style="width:100%"
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
                    <div class="edit-form" id="contact-edit-form" style="display:none">
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
                    <div class="edit-form" id="personal-edit-form" style="display:none">
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
                        <div class="form-group">
                            <label>Personnummer (kryptert)</label>
                            <input type="password" name="ssn" placeholder="Bare for skattefradrag" value="${p.ssn || ''}">
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
                    <div style="padding: 16px 20px;">
                        <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:14px;">
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
                            <div class="empty-state" style="padding:32px 20px;">
                                <span class="material-symbols-outlined" style="font-size:36px;">group_off</span>
                                <p style="font-size:0.82rem;">Ingen familiemedlemmer registrert.</p>
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
                    <div style="padding:12px 20px;">
                        <button class="btn btn-primary btn-sm" id="save-prefs-btn" style="width:100%">Lagre preferanser</button>
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
            const open = contactForm.style.display === 'none';
            contactForm.style.display = open ? 'grid' : 'none';
        });
        document.getElementById('cancel-contact-edit')?.addEventListener('click', () => {
            contactForm.style.display = 'none';
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
            personalForm.style.display = personalForm.style.display === 'none' ? 'grid' : 'none';
        });
        document.getElementById('cancel-personal-edit')?.addEventListener('click', () => {
            personalForm.style.display = 'none';
        });
        document.getElementById('save-personal-btn')?.addEventListener('click', async () => {
            await this._saveProfileFields(personalForm, ['gender', 'maritalStatus', 'birthday', 'ssn']);
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
        container.innerHTML = `<div style="width:100%;display:block" id="activity-inner"><div class="loading-state" style="min-height:120px"><div class="spinner"></div></div></div>`;
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
                push: { icon: 'campaign', bg: 'var(--accent-light)', color: 'var(--accent-color)' },
                message: { icon: 'mail', bg: '#f0fdf4', color: '#16a34a' },
                default: { icon: 'notifications', bg: '#faf5ff', color: '#9333ea' },
            };

            list.innerHTML = snap.docs.map(doc => {
                const d = doc.data();
                const date = d.createdAt?.toDate ? d.createdAt.toDate() : new Date(0);
                const m = iconMap[d.type] || iconMap.default;
                return `
                <div class="activity-item ${!d.read ? 'unread' : ''}">
                    <div class="activity-icon" style="background:${m.bg}">
                        <span class="material-symbols-outlined" style="color:${m.color}">${m.icon}</span>
                    </div>
                    <div class="activity-content">
                        <div class="activity-title">${d.title || 'Varsling'}</div>
                        ${d.body ? `<div class="activity-body">${d.body}</div>` : ''}
                        ${d.link ? `<a href="${d.link}" target="_blank" style="font-size:0.78rem; color:var(--accent);">Åpne lenke →</a>` : ''}
                        <div class="activity-time">${this._timeAgo(date)}</div>
                    </div>
                </div>`;
            }).join('');

        } catch (err) {
            list.innerHTML = `<div class="empty-state"><span class="material-symbols-outlined">error</span><p>Kunne ikke laste aktivitet.</p></div>`;
        }
    }

    // ══════════════════════════════════════════════════════════
    // VIEW: VARSLINGER (unread + mark-read)
    // ══════════════════════════════════════════════════════════
    async renderNotifications(container) {
        const uid = this.currentUser?.uid;
        container.innerHTML = `
        <div style="width:100%">
            <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:16px;">
                <h2 style="font-size:1.05rem; font-weight:700;">Varslinger</h2>
                <button class="btn btn-ghost btn-sm" id="mark-all-read-btn">Merk alle lest</button>
            </div>
            <div id="notifs-inner"><div class="loading-state" style="min-height:80px"><div class="spinner"></div></div></div>
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

            const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            inner.innerHTML = items.map(n => {
                const date = n.createdAt?.toDate ? n.createdAt.toDate() : new Date(0);
                return `<div class="activity-item ${!n.read ? 'unread' : ''}">
                    <div class="activity-icon" style="background:${!n.read ? 'var(--accent-light)' : 'var(--main-bg)'}">
                        <span class="material-symbols-outlined" style="color:${!n.read ? '#60a5fa' : '#475569'}">campaign</span>
                    </div>
                    <div class="activity-content">
                        <div class="activity-title">${n.title || 'Varsling'}</div>
                        ${n.body ? `<div class="activity-body">${n.body}</div>` : ''}
                        <div class="activity-time">${this._timeAgo(date)}</div>
                    </div>
                    ${!n.read ? `<div style="width:8px;height:8px;border-radius:50%;background:var(--accent);flex-shrink:0;margin-top:6px"></div>` : ''}
                </div>`;
            }).join('');

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
                    <div class="empty-state" style="padding:48px 24px">
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

            ${yearTotal >= 500 ? `
            <div class="info-card" style="margin-top:16px">
                <div class="info-card-header">
                    <h3>Skattefradrag</h3>
                </div>
                <div class="info-row">
                    <span class="material-symbols-outlined info-row-icon">receipt_long</span>
                    <div class="info-row-content">
                        <div class="info-row-label">Fradragsberettiget ${currentYear}</div>
                        <span class="info-row-value">kr ${yearTotal.toLocaleString('no-NO', { minimumFractionDigits: 2 })}</span>
                    </div>
                </div>
                <div style="padding:12px 20px; font-size:0.8rem; color:var(--text-muted);">
                    Gaver over kr 500 er skattefradragsberettiget. Kontakt HKM for bekreftelse.
                </div>
            </div>` : ''}
        </div>`;
    }

    // ══════════════════════════════════════════════════════════
    // VIEW: KURS
    // ══════════════════════════════════════════════════════════
    async renderCourses(container) {
        container.innerHTML = `<div style="width:100%"><div class="loading-state"><div class="spinner"></div></div></div>`;
        let courses = [];
        try {
            const snap = await firebase.firestore().collection('teaching').orderBy('createdAt', 'desc').get();
            snap.forEach(d => courses.push({ id: d.id, ...d.data() }));
        } catch (e) { }

        if (courses.length === 0) {
            container.innerHTML = `<div style="width:100%"><div class="empty-state">
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
                    ${c.imageUrl ? `<img src="${c.imageUrl}" alt="${c.title}" loading="lazy">` : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;"><span class="material-symbols-outlined" style="font-size:40px;color:var(--border-light)">school</span></div>`}
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
                    .orderBy('createdAt', 'desc')
                    .get(),
                firebase.firestore()
                    .collection('user_notes')
                    .where('userId', '==', uid)
                    .orderBy('createdAt', 'desc')
                    .get(),
            ]);
            personalSnap.forEach(d => personalNotes.push({ id: d.id, ...d.data() }));
            hkmSnap.forEach(d => hkmNotes.push({ id: d.id, ...d.data() }));
        } catch (e) { console.warn('renderNotes fetch:', e); }

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
        <div style="width:100%">

            <!-- Header row -->
            <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:20px;">
                <div>
                    <h2 style="font-size:1.1rem; font-weight:800; letter-spacing:-0.01em;">Mine notater</h2>
                    <p style="font-size:0.8rem; color:var(--text-muted); margin-top:3px;">
                        Personlige notater som bare du kan se
                    </p>
                </div>
                <button class="btn btn-primary" id="new-note-btn">
                    <span class="material-symbols-outlined">add</span>
                    Nytt notat
                </button>
            </div>

            <!-- New note form (hidden by default) -->
            <div class="new-note-form" id="new-note-form" style="display:none;">
                <div class="form-group">
                    <label>Tittel</label>
                    <input id="note-title-input" placeholder="Gi notatet en tittel..." autocomplete="off">
                </div>
                <div class="form-group" style="margin-top:10px;">
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
                <div style="display:flex; gap:8px; justify-content:flex-end; margin-top:12px;">
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
            <div style="margin-top:32px;">
                <div style="display:flex; align-items:center; gap:8px; margin-bottom:14px;">
                    <div style="flex:1; height:1px; background:var(--border-color);"></div>
                    <span style="font-size:0.7rem; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:0.08em; white-space:nowrap;">
                        Notater fra HKM
                    </span>
                    <div style="flex:1; height:1px; background:var(--border-color);"></div>
                </div>
                <div class="notes-list">
                    ${hkmNotes.map(n => `
                    <div class="note-card">
                        <div class="note-author">
                            <span class="material-symbols-outlined" style="font-size:14px; vertical-align:middle; margin-right:4px;">shield_person</span>
                            ${n.authorName || 'HKM-teamet'} · ${n.createdAt?.toDate ? this._timeAgo(n.createdAt.toDate()) : ''}
                        </div>
                        ${n.title ? `<div style="font-size:0.9rem; font-weight:700; margin-bottom:4px;">${n.title}</div>` : ''}
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
            const isOpen = form.style.display !== 'none';
            form.style.display = isOpen ? 'none' : 'block';
            if (!isOpen) document.getElementById('note-title-input')?.focus();
        });

        document.getElementById('cancel-note-btn')?.addEventListener('click', () => {
            document.getElementById('new-note-form').style.display = 'none';
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
        <div class="hkm-modal-container" style="max-width:640px; width:95vw">
            <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:18px;">
                <div class="hkm-modal-title" style="margin-bottom:0">Rediger notat</div>
                <button id="close-note-modal" style="background:none;border:none;cursor:pointer;padding:4px;">
                    <span class="material-symbols-outlined" style="font-size:20px;color:var(--text-muted);">close</span>
                </button>
            </div>
            <div class="form-group">
                <label>Tittel</label>
                <input id="edit-note-title" value="${(note.title || '').replace(/"/g, '&quot;')}" autocomplete="off">
            </div>
            <div class="form-group" style="margin-top:12px;">
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
            <div class="hkm-modal-actions" style="margin-top:20px;">
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
    // DELETE ACCOUNT MODAL
    // ══════════════════════════════════════════════════════════
    showDeleteConfirmModal() {
        const existing = document.getElementById('confirm-delete-modal');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.id = 'confirm-delete-modal';
        modal.className = 'hkm-modal-overlay';
        modal.innerHTML = `
        <div class="hkm-modal-container">
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
        </div>`;

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
            window.location.href = '../index.html';
        } catch (error) {
            if (error.code === 'auth/requires-recent-login') {
                alert('Vennligst logg inn på nytt for å bekrefte sletting.');
                await firebase.auth().signOut();
                window.location.href = 'login.html';
            } else {
                alert('Feil: ' + error.message);
            }
        }
    }
}

// Boot
window.minSideManager = new MinSideManager();
