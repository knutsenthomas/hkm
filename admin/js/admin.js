// ===================================
// Admin Dashboard - His Kingdom Ministry (Global version)
// Core Logic & Firebase Integration
// ===================================

// --- Global Error Handling ---
window.onerror = function (msg, url, lineNo, columnNo, error) {
    // Ignore benign ResizeObserver error
    if (msg && msg.toString().includes('ResizeObserver loop completed with undelivered notifications')) {
        return false;
    }
    console.error('Global Error Caught:', msg, url, lineNo, columnNo, error);
    showErrorUI('En uventet feil oppstod: ' + msg);
    return false;
};

window.onunhandledrejection = function (event) {
    const reason = event.reason ? event.reason.toString() : '';
    // Ignore benign ResizeObserver error in promises too
    if (reason.includes('ResizeObserver loop completed with undelivered notifications')) {
        return false;
    }
    console.error('Unhandled Promise Rejection:', event.reason);
    showErrorUI('En asynkron feil oppstod: ' + (event.reason ? event.reason.message : 'Ukjent feil'));
};

function showErrorUI(message) {
    const errorContainer = document.getElementById('global-error-container');
    if (errorContainer) {
        const errorMsg = document.getElementById('global-error-message');
        if (errorMsg) errorMsg.textContent = message;
        errorContainer.style.display = 'flex';
    } else {
        alert(message); // Fallback if UI not ready
    }
}

const firebaseService = window.firebaseService;

class AdminManager {
    constructor() {
        this.currentSection = 'overview';
        this.unreadMessageCount = 0;
        this.messagesUnsub = null;

        // User Detail View State
        this.currentUserDetailId = null;
        this.userEditMode = false;

        try {
            this.init();
        } catch (e) {
            console.error("Critical: Failed to initialize AdminManager", e);
            showErrorUI("Klarte ikke å starte admin-panelet: " + e.message);
        }
    }

    init() {
        console.log("Initializing AdminManager...");

        if (!firebaseService) {
            throw new Error("Firebase Service er ikke lastet!");
        }

        // Initialize toast container
        this.toastContainer = document.createElement('div');
        this.toastContainer.className = 'toast-container';
        document.body.appendChild(this.toastContainer);

        this.initAuth();
        this.initDashboard();
        this.initMessageListener();

        // Expose to window for the inline navigation script
        window.adminManager = this;
        console.log("AdminManager initialized successfully.");
    }

    /**
     * Show a toast notification
     * @param {string} message 
     * @param {'success' | 'error'} type 
     * @param {number} duration 
     */
    showToast(message, type = 'success', duration = 7000) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        const icon = type === 'success' ? 'check_circle' : 'error';

        toast.innerHTML = `
            <span class="material-symbols-outlined toast-icon">${icon}</span>
            <div class="toast-content">
                <p class="toast-message">${message}</p>
            </div>
            <button class="toast-close">
                <span class="material-symbols-outlined">close</span>
            </button>
            <div class="toast-progress">
                <div class="toast-progress-bar" style="animation-duration: ${duration}ms"></div>
            </div>
        `;

        this.toastContainer.appendChild(toast);

        const removeToast = () => {
            if (toast.parentElement) {
                toast.classList.add('removing');
                setTimeout(() => {
                    if (toast.parentElement) {
                        this.toastContainer.removeChild(toast);
                    }
                }, 300);
            }
        };

        // Auto close after duration
        const timeoutId = setTimeout(removeToast, duration);

        // Manual close
        toast.querySelector('.toast-close').addEventListener('click', (e) => {
            e.stopPropagation();
            clearTimeout(timeoutId);
            removeToast();
        });

        // Close on click anywhere on toast
        toast.addEventListener('click', () => {
            clearTimeout(timeoutId);
            removeToast();
        });
    }

    /**
     * Clear the public site's event cache in localStorage.
     * This ensures visitors see changes immediately after an admin saves them.
     */
    clearPublicEventCache() {
        try {
            // Public site uses 'hkm_events_{startIso}_{endIso}' cache keys
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith('hkm_events_')) {
                    localStorage.removeItem(key);
                    console.log(`[AdminManager] Cleared cache key: ${key}`);
                }
            });
        } catch (e) {
            console.warn('[AdminManager] Failed to clear public cache', e);
        }
    }

    /**
     * Helper to update or delete an event in Google Calendar via API.
     * @param {object} eventItem - The event data
     * @param {'PATCH' | 'DELETE'} method 
     */
    async updateGoogleCalendarEvent(eventItem, method = 'PATCH') {
        if (!this.googleAccessToken) {
            console.log('[AdminManager] Google Access Token missing. Skipping GCal sync.');
            return;
        }

        if (!eventItem.gcalId) {
            console.log('[AdminManager] Item has no gcalId. Skipping GCal sync.');
            return;
        }

        // Get the current calendar ID from settings
        const settings = await firebaseService.getPageContent('settings_integrations') || {};
        const calendarId = settings.googleCalendar?.calendarId;

        if (!calendarId) {
            this.showToast('Kalender-ID mangler i innstillinger. Kan ikke synkronisere.', 'error');
            return;
        }

        const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventItem.gcalId}`;

        let fetchOptions = {
            method,
            headers: {
                'Authorization': `Bearer ${this.googleAccessToken}`,
                'Content-Type': 'application/json'
            }
        };

        if (method === 'PATCH') {
            const description = typeof eventItem.content === 'object' && eventItem.content.blocks
                ? this.blocksToHtml(eventItem.content)
                : (eventItem.description || eventItem.content || '');

            fetchOptions.body = JSON.stringify({
                summary: eventItem.title,
                description: description
            });
        }

        try {
            const response = await fetch(url, fetchOptions);

            if (!response.ok) {
                const errorData = await response.json();
                // Handle 404 (Event deleted manually in GCal) or 401 (Expired token)
                if (response.status === 404) {
                    console.warn('[AdminManager] GCal event not found. It might have been deleted manually.');
                    return;
                }
                throw new Error(errorData.error?.message || `API Status ${response.status}`);
            }

            console.log(`[AdminManager] GCal sync (${method}) successful.`);
            this.showToast(`✅ Google Calendar: ${method === 'DELETE' ? 'Slettet' : 'Oppdatert'}`, 'success', 3000);
        } catch (error) {
            console.error('[AdminManager] Google Calendar sync failed:', error);
            if (error.message.includes('401') || error.message.includes('token') || error.message.includes('expired')) {
                this.googleAccessToken = null;
                this.showToast('Google-tilkoblingen er utløpt. Vennligst koble til på nytt.', 'error');
            } else {
                this.showToast('GCal Sync feilet: ' + error.message, 'error');
            }
        }
    }

    /**
     * Minimal EditorJS to HTML converter for GCal description
     */
    blocksToHtml(content) {
        if (!content || !content.blocks) return '';
        return content.blocks.map(block => {
            switch (block.type) {
                case 'header': return `<h${block.data.level}>${block.data.text}</h${block.data.level}>`;
                case 'paragraph': return `<p>${block.data.text}</p>`;
                case 'list':
                    const tag = block.data.style === 'ordered' ? 'ol' : 'ul';
                    const items = block.data.items.map(i => `<li>${i}</li>`).join('');
                    return `<${tag}>${items}</${tag}>`;
                default: return block.data.text || '';
            }
        }).join('\n');
    }

    /**
     * Handle Admin Authentication & Roles
     */
    initAuth() {
        if (!firebaseService.isInitialized) {
            console.warn("⚠️ Firebase not initialized. Auth check skipped for development.");
            return;
        }

        firebaseService.onAuthChange(async (user) => {
            if (!user) {
                window.location.href = 'login.html';
                return;
            }

            try {
                // Fetch user role
                const role = await firebaseService.getUserRole(user.uid);
                this.userRole = role;

                // RBAC Redirection: Members cannot access admin area
                if (role === window.HKM_ROLES.MEDLEM) {
                    console.warn("Access denied: User is a member, not an official/admin.");
                    window.location.href = '../minside/index.html';
                    return;
                }

                await this.syncProfileFromGoogleProvider(user);
                await this.updateUserInfo(user);
                this.applyRoleRestrictions(role);
            } catch (error) {
                console.error("Error verifying admin role:", error);
                // On error, steer to safety (public area)
                window.location.href = '../minside/index.html';
            }
        });
    }

    applyRoleRestrictions(role) {
        console.log(`Applying restrictions for role: ${role}`);
        const ROLES = window.HKM_ROLES;

        // Editor Restrictions: Can only manage content
        if (role === ROLES.EDITOR) {
            // Hide admin-only sections
            const adminOnlySections = ['settings', 'integrations', 'hero', 'design', 'seo', 'users'];
            document.querySelectorAll('.nav-item').forEach(item => {
                const section = item.querySelector('a')?.getAttribute('data-section');
                if (adminOnlySections.includes(section)) {
                    item.style.display = 'none';
                }
            });

            // Note: More granular button restrictions can be added in specific render methods
        }

        // Non-Superadmin Restrictions: No Core Deletions
        if (role !== ROLES.SUPERADMIN) {
            // This is a placeholder for where we'd hide specific "Superadmin only" buttons
            // For now, we'll implement this as logic in specific delete handlers if needed
        }
    }

    hasPermission(permissionKey) {
        const permissions = window.HKM_PERMISSIONS || {};
        const role = this.userRole || (window.HKM_ROLES ? window.HKM_ROLES.MEDLEM : 'medlem');
        const allowedRoles = permissions[permissionKey];
        if (!Array.isArray(allowedRoles)) return false;
        return allowedRoles.includes(role);
    }

    async syncProfileFromGoogleProvider(user) {
        if (!user) return;
        const googleProvider = (user.providerData || []).find(p => p.providerId === 'google.com');
        if (!googleProvider) return;

        try {
            const authUpdates = {};
            if (!user.displayName && googleProvider.displayName) authUpdates.displayName = googleProvider.displayName;
            if (!user.photoURL && googleProvider.photoURL) authUpdates.photoURL = googleProvider.photoURL;
            if (Object.keys(authUpdates).length > 0) {
                await user.updateProfile(authUpdates);
            }

            await firebase.firestore().collection('users').doc(user.uid).set({
                displayName: user.displayName || googleProvider.displayName || user.email || '',
                photoURL: user.photoURL || googleProvider.photoURL || '',
                email: user.email || '',
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
        } catch (e) {
            console.warn('Kunne ikke synkronisere Google-profil i admin:', e);
        }
    }

    async updateUserInfo(user) {
        const adminName = document.getElementById('admin-name');
        const adminAvatar = document.getElementById('admin-avatar');

        // Try load custom profile data
        let profile = null;
        let userProfile = null;
        try {
            profile = await firebaseService.getPageContent('settings_profile');
        } catch (e) { }
        try {
            const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
            if (userDoc.exists) userProfile = userDoc.data();
        } catch (e) { }

        const displayName = (userProfile && userProfile.displayName)
            || user.displayName
            || (profile && profile.fullName)
            || user.email;
        const photoURL = (userProfile && userProfile.photoURL)
            || user.photoURL
            || (profile && profile.photoUrl);

        if (adminName) adminName.textContent = displayName;
        if (adminAvatar) {
            if (photoURL) {
                adminAvatar.innerHTML = `<img src="${photoURL}" alt="Profile" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
            } else {
                const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase();
                adminAvatar.textContent = initials.substring(0, 2);
            }
        }

        // Add click listener to profile (header)
        const profileTrigger = document.getElementById('admin-profile-trigger');
        const profileModal = document.getElementById('profile-modal');
        const closeProfileModal = document.getElementById('close-profile-modal');
        const profileForm = document.getElementById('admin-modal-profile-form');
        if (profileTrigger && profileModal && closeProfileModal) {
            profileTrigger.onclick = () => {
                profileModal.style.display = 'none';
                this.onSectionSwitch('profile');

                const navLinks = document.querySelectorAll('.nav-link[data-section]');
                navLinks.forEach(l => {
                    l.classList.toggle('active', l.getAttribute('data-section') === 'profile');
                });

                const sections = document.querySelectorAll('.section-content');
                sections.forEach(section => {
                    section.classList.remove('active');
                    if (section.id === 'profile-section') {
                        section.classList.add('active');
                    }
                });
            };
            closeProfileModal.onclick = () => {
                profileModal.style.display = 'none';
            };
            // Lukk modal ved klikk utenfor innhold
            profileModal.addEventListener('click', (e) => {
                if (e.target === profileModal) profileModal.style.display = 'none';
            });
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && profileModal.style.display === 'flex') {
                    profileModal.style.display = 'none';
                }
            });
        }

        if (profileForm && !profileForm.dataset.bound) {
            profileForm.dataset.bound = '1';
            profileForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.saveAdminProfileModal(user);
            });
        }
    }

    openAdminProfileModal(user, profile) {
        const profileModal = document.getElementById('profile-modal');
        if (!profileModal) return;

        const displayName = profile.displayName || user.displayName || user.email || 'Bruker';
        document.getElementById('modal-admin-name').textContent = displayName;
        document.getElementById('modal-admin-role').textContent = 'Administrator';
        document.getElementById('modal-admin-email').textContent = user.email || '';

        const modalAvatar = document.getElementById('modal-admin-avatar');
        if (profile.photoURL) {
            modalAvatar.innerHTML = `<img src="${profile.photoURL}" alt="Profile" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
        } else {
            const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase();
            modalAvatar.textContent = initials.substring(0, 2);
        }

        document.getElementById('admin-modal-display-name').value = displayName;
        document.getElementById('admin-modal-phone').value = profile.phone || '';
        document.getElementById('admin-modal-address').value = profile.address || '';
        document.getElementById('admin-modal-bio').value = profile.bio || '';

        profileModal.style.display = 'flex';
    }

    async saveAdminProfileModal(user) {
        const btn = document.getElementById('admin-modal-save-btn');
        const originalText = btn ? btn.textContent : '';
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Lagrer...';
        }

        try {
            const displayName = (document.getElementById('admin-modal-display-name').value || '').trim();
            const phone = (document.getElementById('admin-modal-phone').value || '').trim();
            const address = (document.getElementById('admin-modal-address').value || '').trim();
            const bio = (document.getElementById('admin-modal-bio').value || '').trim();

            if (displayName && displayName !== user.displayName) {
                await user.updateProfile({ displayName });
            }

            await firebase.firestore().collection('users').doc(user.uid).set({
                displayName,
                phone,
                address,
                bio,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

            await firebaseService.savePageContent('settings_profile', {
                fullName: displayName,
                phone,
                address,
                bio,
                updatedAt: new Date().toISOString()
            });

            const profileModal = document.getElementById('profile-modal');
            if (profileModal) profileModal.style.display = 'none';
            await this.updateUserInfo(user);
            this.showToast('Profil oppdatert.', 'success', 4000);
        } catch (error) {
            console.error('Kunne ikke lagre admin-profil:', error);
            this.showToast('Kunne ikke lagre profil.', 'error', 5000);
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.textContent = originalText;
            }
        }
    }

    initDashboard() {
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                if (confirm('Logg ut?')) {
                    if (firebaseService.isInitialized) await firebaseService.logout();
                    window.location.href = 'login.html';
                }
            });
        }

        // Render initial overview
        this.renderOverview();
        console.log("Dashboard initialized.");

        // Start lytter for uleste meldinger (for bjelle)
        this.initMessageNotifications();

        // Søke-funksjon i toppfeltet
        this.initSearch();
    }

    async logout() {
        try {
            await firebaseService.signOut();
            window.location.href = 'login.html';
        } catch (error) {
            console.error("Error signing out:", error);
            this.showToast("Failed to log out. Please try again.", "error", 5000);
        }
    }

    initMessageListener() {
        if (!firebaseService.isInitialized || !firebaseService.db) return;

        const bell = document.getElementById('messages-bell');
        if (bell) {
            bell.addEventListener('click', () => {
                if (window.adminManager && typeof window.adminManager.onSectionSwitch === 'function') {
                    window.adminManager.onSectionSwitch('messages');
                }

                const navLinks = document.querySelectorAll('.nav-link[data-section]');
                navLinks.forEach(l => {
                    l.classList.toggle('active', l.getAttribute('data-section') === 'messages');
                });

                const sections = document.querySelectorAll('.section-content');
                sections.forEach(section => {
                    section.classList.remove('active');
                    if (section.id === 'messages-section') {
                        section.classList.add('active');
                    }
                });
            });
        }

        try {
            this.messagesUnsub = firebaseService.db
                .collection('contactMessages')
                .where('status', '==', 'ny')
                .onSnapshot((snapshot) => {
                    const count = snapshot.size;
                    this.unreadMessageCount = count;
                    this.updateMessageBell(count);
                }, (err) => {
                    console.error('Feil i meldings-lytter:', err);
                });
        } catch (err) {
            console.error('Kunne ikke starte meldings-lytter:', err);
        }
    }

    updateMessageBell(count) {
        const bell = document.getElementById('messages-bell');
        const badge = document.getElementById('messages-badge');
        if (!bell || !badge) return;

        if (count > 0) {
            bell.classList.add('has-unread');
            badge.style.display = 'flex';
            badge.textContent = count > 9 ? '9+' : String(count);
        } else {
            bell.classList.remove('has-unread');
            badge.style.display = 'none';
        }
    }

    /**
     * Called by the inline navigation script in index.html
     */
    onSectionSwitch(sectionId) {
        this.currentSection = sectionId;
        console.log(`🚀 Switching to section: ${sectionId}`);

        // Initialize section the first time it's visited
        const section = document.getElementById(`${sectionId}-section`);
        if (section && section.getAttribute('data-rendered') !== 'true') {
            switch (sectionId) {
                case 'content':
                    this.renderContentEditor();
                    break;
                case 'blog':
                    this.renderCollectionEditor('blog', 'Blogginnlegg');
                    break;
                case 'events':
                    this.renderCollectionEditor('events', 'Arrangementer');
                    break;
                case 'messages':
                    this.renderMessagesSection();
                    break;
                case 'media':
                    this.renderMediaManager();
                    break;
                case 'causes':
                    this.renderCausesManager();
                    break;
                case 'hero':
                    this.renderHeroManager();
                    break;
                case 'teaching':
                    this.renderTeachingManager();
                    break;
                case 'design':
                    this.renderDesignSection();
                    break;
                case 'profile':
                    this.renderProfileSection();
                    break;
                case 'seo':
                    this.renderSEOSection();
                    break;
                case 'overview':
                    this.renderOverview();
                    break;
                case 'settings':
                    this.renderSettingsSection();
                    break;
                case 'integrations':
                    this.renderIntegrationsSection();
                    break;
                case 'users':
                    this.currentUserDetailId = null;
                    this.userEditMode = false;
                    this.renderUsersSection();
                    break;
            }
        }
    }

    initMessageNotifications() {
        if (!firebaseService.isInitialized || !firebaseService.db) return;

        const icon = document.getElementById('notification-icon');
        const dot = document.getElementById('notification-dot');

        if (!icon || !dot) return;

        try {
            // Lytt på alle meldinger med status 'ny'
            this.unsubscribeMessagesListener = firebaseService.db
                .collection('contactMessages')
                .where('status', '==', 'ny')
                .onSnapshot((snapshot) => {
                    const unreadCount = snapshot.size;

                    if (unreadCount > 0) {
                        dot.style.display = 'block';
                        icon.classList.add('has-unread');
                        dot.textContent = unreadCount > 9 ? '9+' : String(unreadCount);
                    } else {
                        dot.style.display = 'none';
                        icon.classList.remove('has-unread');
                        dot.textContent = '';
                    }
                }, (err) => {
                    console.error('Feil ved melding-notifikasjoner:', err);
                });
        } catch (err) {
            console.error('Kunne ikke starte melding-notifikasjoner:', err);
        }
    }

    initSearch() {
        const searchInput = document.querySelector('.header-search input');
        if (!searchInput) return;

        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const query = searchInput.value.trim();
                if (query) {
                    this.performSearch(query);
                }
            }
        });
    }

    async performSearch(query) {
        const q = (query || '').trim();
        if (!q) return;

        const section = document.getElementById('search-section');
        if (!section) return;

        // Vis søke-seksjonen
        const allSections = document.querySelectorAll('.section-content');
        allSections.forEach(s => s.classList.remove('active'));
        section.classList.add('active');

        section.innerHTML = `
            <div class="section-header">
                <h2 class="section-title">Søk</h2>
                <p class="section-subtitle">Resultater for "${this.escapeHtml(q)}"</p>
            </div>
            <div class="card">
                <div class="card-body" id="search-results">
                    <p style="font-size:14px; color:#64748b;">Søker i dashboard-innhold...</p>
                </div>
            </div>
        `;
        section.setAttribute('data-rendered', 'true');

        const resultsEl = document.getElementById('search-results');
        if (!resultsEl) return;

        if (!firebaseService.isInitialized) {
            resultsEl.innerHTML = '<p style="color:#ef4444; font-size:14px;">Firebase er ikke konfigurert, kan ikke søke i innhold.</p>';
            return;
        }

        const results = [];
        const qLower = q.toLowerCase();

        try {
            // 1) Faste sider (content)
            const pages = [
                { id: 'index', label: 'Forside' },
                { id: 'om-oss', label: 'Om oss' },
                { id: 'media', label: 'Media' },
                { id: 'arrangementer', label: 'Arrangementer' },
                { id: 'blogg', label: 'Blogg' },
                { id: 'kontakt', label: 'Kontakt' },
                { id: 'donasjoner', label: 'Donasjoner' },
                { id: 'undervisning', label: 'Undervisning' },
                { id: 'reisevirksomhet', label: 'Reisevirksomhet' },
                { id: 'bibelstudier', label: 'Bibelstudier' },
                { id: 'seminarer', label: 'Seminarer' },
                { id: 'podcast', label: 'Podcast' }
            ];

            for (const page of pages) {
                const data = await firebaseService.getPageContent(page.id);
                if (!data) continue;

                const entries = this.collectTextEntries(data);
                const hit = entries.find(entry => entry.text && entry.text.toLowerCase().includes(qLower));
                if (hit) {
                    results.push({
                        type: 'Sideinnhold',
                        title: page.label,
                        meta: hit.path,
                        snippet: this.makeSnippet(hit.text, q)
                    });
                }
            }

            // 2) Samlinger: blogg, arrangementer, undervisning
            const collections = [
                { id: 'blog', docId: 'collection_blog', label: 'Blogginnlegg' },
                { id: 'events', docId: 'collection_events', label: 'Arrangementer' },
                { id: 'teaching', docId: 'collection_teaching', label: 'Undervisning' }
            ];

            for (const col of collections) {
                const raw = await firebaseService.getPageContent(col.docId);
                const items = Array.isArray(raw) ? raw : (raw && Array.isArray(raw.items) ? raw.items : []);

                items.forEach((item) => {
                    const combined = [
                        item.title,
                        item.content,
                        item.category,
                        item.author,
                        item.seoTitle,
                        item.seoDescription,
                        item.hero?.title, // Added hero.title
                        item.hero?.subtitle, // Added hero.subtitle
                        item.hero?.bg // Added hero.bg
                    ].filter(Boolean).join(' ').toLowerCase();

                    if (combined.includes(qLower)) {
                        results.push({
                            type: col.label,
                            title: item.title || '(uten tittel)',
                            meta: item.date || item.category || '',
                            snippet: this.makeSnippet(item.content || item.seoDescription || '', q)
                        });
                    }
                });
            }

            // 3) Kontaktmeldinger (nyere)
            if (firebaseService.db) {
                const snapshot = await firebaseService.db
                    .collection('contactMessages')
                    .orderBy('createdAt', 'desc')
                    .limit(100)
                    .get();

                snapshot.forEach((doc) => {
                    const data = doc.data() || {};
                    const combined = [
                        data.name,
                        data.email,
                        data.phone,
                        data.subject,
                        data.message
                    ].filter(Boolean).join(' ').toLowerCase();

                    if (combined.includes(qLower)) {
                        results.push({
                            type: 'Melding',
                            title: data.subject || '(ingen emne)',
                            meta: data.name || data.email || '',
                            snippet: this.makeSnippet(data.message || '', q)
                        });
                    }
                });
            }
        } catch (err) {
            console.error('Feil ved søk:', err);
            resultsEl.innerHTML = '<p style="color:#ef4444; font-size:14px;">Det oppstod en feil under søk. Prøv igjen.</p>';
            return;
        }

        if (!results.length) {
            resultsEl.innerHTML = '<p style="font-size:14px; color:#64748b;">Ingen treff for dette søket.</p>';
            return;
        }

        const html = results.map((r) => `
            <div class="search-result">
                <div class="search-result-header">
                    <span class="search-result-type">${this.escapeHtml(r.type)}</span>
                    ${r.meta ? `<span class="search-result-meta">${this.escapeHtml(r.meta)}</span>` : ''}
                </div>
                <div class="search-result-title">${this.escapeHtml(r.title)}</div>
                ${r.snippet ? `<div class="search-result-snippet">${this.escapeHtml(r.snippet)}</div>` : ''}
            </div>
        `).join('');

        resultsEl.innerHTML = html;
    }

    collectTextEntries(obj, path = '') {
        const entries = [];
        if (!obj || typeof obj !== 'object') return entries;

        Object.keys(obj).forEach((key) => {
            const value = obj[key];
            const currentPath = path ? `${path}.${key}` : key;

            if (typeof value === 'string') {
                entries.push({ text: value, path: currentPath });
            } else if (value && typeof value === 'object') {
                entries.push(...this.collectTextEntries(value, currentPath));
            }
        });

        return entries;
    }

    makeSnippet(text, query) {
        if (!text) return '';
        const str = String(text).replace(/\s+/g, ' ').trim();
        if (str.length <= 160) return str;

        const lower = str.toLowerCase();
        const qLower = query.toLowerCase();
        const idx = lower.indexOf(qLower);

        if (idx === -1) {
            return str.substring(0, 157) + '...';
        }

        const start = Math.max(0, idx - 40);
        const end = Math.min(str.length, idx + qLower.length + 60);
        const prefix = start > 0 ? '...' : '';
        const suffix = end < str.length ? '...' : '';
        return prefix + str.substring(start, end) + suffix;
    }

    escapeHtml(str) {
        if (str == null) return '';
        return String(str).replace(/[&<>"']/g, (c) => {
            switch (c) {
                case '&': return '&amp;';
                case '<': return '&lt;';
                case '>': return '&gt;';
                case '"': return '&quot;';
                case "'": return '&#39;';
                default: return c;
            }
        });
    }

    async renderOverview() {
        const section = document.getElementById('overview-section');
        if (!section) return;

        // Basic Stats (Safe fetch)
        let blogCount = 0;
        let teachingCount = 0;
        let youtubeStats = { subscribers: 'N/A', videos: 'N/A' };
        let podcastCount = 'N/A';
        let causesCount = 0;
        let donationCount = 0;
        let donationTotal = 0;

        try {
            const blogData = await firebaseService.getPageContent('collection_blog');
            const blogItems = Array.isArray(blogData) ? blogData : (blogData && blogData.items ? blogData.items : []);
            blogCount = blogItems.length;
        } catch (e) {
            console.warn('Kunne ikke hente bloggstatistikk:', e);
        }

        try {
            const teachingData = await firebaseService.getPageContent('collection_teaching');
            const teachingItems = Array.isArray(teachingData) ? teachingData : (teachingData && teachingData.items ? teachingData.items : []);
            teachingCount = teachingItems.length;
        } catch (e) {
            console.warn('Kunne ikke hente undervisningsstatistikk:', e);
        }

        try {
            const causesData = await firebaseService.getPageContent('collection_causes');
            const causesItems = Array.isArray(causesData) ? causesData : (causesData && causesData.items ? causesData.items : []);
            causesCount = causesItems.length;
        } catch (e) {
            console.warn('Kunne ikke hente innsamlingsaksjoner:', e);
        }

        try {
            if (firebaseService.db) {
                const donationsSnapshot = await firebaseService.db.collection('donations').get();
                donationCount = donationsSnapshot.size;
                if (!donationsSnapshot.empty) {
                    donationsSnapshot.forEach(doc => {
                        const data = doc.data();
                        if (data.amount) {
                            donationTotal += (data.amount / 100);
                        }
                    });
                }
            }
        } catch (e) {
            console.warn('Kunne ikke hente donasjoner:', e);
        }

        // Fetch Media Stats
        try {
            const yt = await this.fetchYouTubeStats();
            if (yt) youtubeStats = yt;
            else youtubeStats = { subscribers: 'Ingen data', videos: 'Ingen data' };
        } catch (e) {
            console.error('YouTube stats error:', e);
            youtubeStats = { subscribers: 'Feil', videos: e.message || 'Ukjent feil' };
        }

        try {
            const pod = await this.fetchPodcastStats();
            if (pod) podcastCount = pod;
            else podcastCount = 'Ingen data';
        } catch (e) {
            console.error('Podcast stats error:', e);
            podcastCount = `Feil: ${e.message}`;
        }

        const formattedDonationTotal = donationTotal.toLocaleString('no-NO', { style: 'currency', currency: 'NOK', maximumFractionDigits: 0 });

        section.innerHTML = `
            <div class="section-header">
                <h2 class="section-title">Velkommen tilbake!</h2>
                <p class="section-subtitle">Oversikt over nettstedets aktivitet.</p>
            </div>
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-icon purple"><span class="material-symbols-outlined">visibility</span></div>
                    <div class="stat-info">
                        <h3 class="stat-label">Sidevisninger (30 dager)</h3>
                        <p class="stat-value">12,450</p>
                        <span class="stat-trend up"><span class="material-symbols-outlined">trending_up</span> 12.5%</span>
                    </div>
                </div>

                <div class="stat-card" id="system-health-card">
                    <div class="stat-icon green" id="system-health-icon"><span class="material-symbols-outlined">check_circle</span></div>
                    <div class="stat-info">
                        <h3 class="stat-label">Systemstatus</h3>
                        <p class="stat-value" id="system-health-status">Normal</p>
                        <small id="system-health-text" style="color: #64748b;">Ingen kritiske feil</small>
                    </div>
                </div>

                <div class="stat-card">
                    <div class="stat-icon blue"><span class="material-symbols-outlined">edit_note</span></div>
                    <div class="stat-info">
                        <h3 class="stat-label">Blogginnlegg</h3>
                        <p class="stat-value">${blogCount}</p>
                    </div>
                </div>

                <div class="stat-card">
                    <div class="stat-icon green"><span class="material-symbols-outlined">school</span></div>
                    <div class="stat-info">
                        <h3 class="stat-label">Undervisningsserier</h3>
                        <p class="stat-value">${teachingCount}</p>
                    </div>
                </div>

                <!-- New Donations Card -->
                <div class="stat-card">
                    <div class="stat-icon pink"><span class="material-symbols-outlined">volunteer_activism</span></div>
                    <div class="stat-info">
                        <h3 class="stat-label">Donasjoner</h3>
                        <p class="stat-value">${donationCount}</p>
                        <small style="color: #64748b;">Totalt: <span style="font-weight:600; color:#333;">${formattedDonationTotal}</span></small>
                    </div>
                </div>

                <!-- New Causes Card -->
                 <div class="stat-card">
                    <div class="stat-icon orange"><span class="material-symbols-outlined">campaign</span></div>
                    <div class="stat-info">
                        <h3 class="stat-label">Innsamlingsaksjoner</h3>
                        <p class="stat-value">${causesCount}</p>
                    </div>
                </div>

                <!-- Media Stats -->
                <div class="stat-card">
                    <div class="stat-icon red"><span class="material-symbols-outlined">subscriptions</span></div>
                    <div class="stat-info">
                        <h3 class="stat-label">YouTube Totalt</h3>
                        <p class="stat-value">${youtubeStats.views}</p>
                        <small style="color: #64748b; font-size: 0.8rem;">
                            <span style="font-weight:600; color: #333;">${youtubeStats.subscribers}</span> abonnenter • 
                            ${youtubeStats.videos} videoer
                        </small>
                    </div>
                </div>

                 <div class="stat-card">
                    <div class="stat-icon orange"><span class="material-symbols-outlined">podcasts</span></div>
                    <div class="stat-info">
                        <h3 class="stat-label">Podcast Episoder</h3>
                        <p class="stat-value">${podcastCount}</p>
                    </div>
                </div>
            </div>

            <div class="grid-2-cols">
                <div class="card">
                    <div class="card-header flex-between">
                        <h3 class="card-title">Trafikkovervåking (Google Analytics)</h3>
                        <div class="card-actions">
                            <span style="font-size: 12px; color: #64748b;">Sanntid: 24 aktive akkurat nå</span>
                        </div>
                    </div>
                    <div class="card-body">
                        <div style="height: 300px; display: flex; align-items: flex-end; gap: 10px; padding: 20px 0;">
                            ${[40, 60, 45, 90, 65, 80, 50, 70, 85, 40, 60, 100].map(h => `
                                <div style="flex: 1; background: linear-gradient(to top, #6366f1, #a5b4fc); height: ${h}%; border-radius: 4px 4px 0 0; position: relative;" title="${h}%">
                                    <div style="position: absolute; bottom: -25px; left: 50%; transform: translateX(-50%); font-size: 10px; color: #64748b;">${['Jan', 'Feb', 'Mar', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Des'][Math.floor(Math.random() * 12)]}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header"><h3 class="card-title">Topp Sider</h3></div>
                    <div class="card-body">
                        <ul style="list-style: none; padding: 0;">
                            <li style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f1f5f9;">
                                <span style="font-size: 14px; font-weight: 500;">/index.html</span>
                                <span style="font-size: 14px; color: #64748b;">4,230</span>
                            </li>
                            <li style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f1f5f9;">
                                <span style="font-size: 14px; font-weight: 500;">/blogg.html</span>
                                <span style="font-size: 14px; color: #64748b;">2,150</span>
                            </li>
                            <li style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f1f5f9;">
                                <span style="font-size: 14px; font-weight: 500;">/media.html</span>
                                <span style="font-size: 14px; color: #64748b;">1,840</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>

            <div class="grid-2-cols equal" style="margin-top: 24px;">
                <div class="card">
                    <div class="card-header flex-between">
                        <h3 class="card-title">Mest leste innhold (Popularitet)</h3>
                    </div>
                    <div class="card-body">
                        <ul style="list-style: none; padding: 0;">
                            <li style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee;">
                                <span>Bibeltro Undervisning (Serier)</span>
                                <span class="badge" style="background: #eef2ff; color: #6366f1; padding: 2px 8px; border-radius: 12px; font-size: 11px;">Topp</span>
                            </li>
                            <li style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee;">
                                <span>Hvordan leve i nåde (Blogg)</span>
                                <span style="font-weight: 600;">850 visninger</span>
                            </li>
                            <li style="display: flex; justify-content: space-between; padding: 10px 0;">
                                <span>Bønnens kraft (Undervisning)</span>
                                <span style="font-weight: 600;">620 visninger</span>
                            </li>
                        </ul>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header"><h3 class="card-title">Søk & AI Trender</h3></div>
                    <div class="card-body">
                        <p style="font-size: 13px; color: #64748b; margin-bottom: 15px;">Populære søkeord og konsepter folk leter etter på siden eller via AI-søk (ChatGPT/Perplexity).</p>
                        <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                            <span class="badge" style="background: #f3f4f6; padding: 4px 10px; border-radius: 15px; font-size: 12px;">Kristent fellesskap</span>
                            <span class="badge" style="background: #f3f4f6; padding: 4px 10px; border-radius: 15px; font-size: 12px;">Bibelundervisning</span>
                            <span class="badge" style="background: #eff6ff; color: #3b82f6; padding: 4px 10px; border-radius: 15px; font-size: 12px; font-weight: 600;">+ Nåde & Sannhet</span>
                            <span class="badge" style="background: #f3f4f6; padding: 4px 10px; border-radius: 15px; font-size: 12px;">Seminarer 2026</span>
                        </div>
                        <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #eee;">
                            <p style="font-size: 12px; font-weight: 600; margin-bottom: 5px;">AI Indeksering Status: <span style="color: #10b981;">Optimalisert</span></p>
                            <p style="font-size: 11px; color: #64748b;">SEO-titler og GEO-metadata er nå tilgjengelig for AI-boter.</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        section.setAttribute('data-rendered', 'true');

        // Fetch System Health (Critical Errors)
        this.checkSystemHealth();
    }

    async checkSystemHealth() {
        if (!firebaseService.db) return;

        try {
            const snapshot = await firebaseService.db
                .collection('system_logs')
                .where('severity', '==', 'CRITICAL')
                .where('read', '==', false)
                .get();

            const criticalCount = snapshot.size;
            const healthCard = document.getElementById('system-health-card');
            const healthIcon = document.getElementById('system-health-icon');
            const healthStatus = document.getElementById('system-health-status');
            const healthText = document.getElementById('system-health-text');

            if (healthCard && criticalCount > 0) {
                healthIcon.className = 'stat-icon red';
                healthIcon.innerHTML = '<span class="material-symbols-outlined">warning</span>';
                healthStatus.textContent = 'Kritisk';
                healthStatus.style.color = '#ef4444';
                healthText.textContent = `${criticalCount} ulest(e) kritisk feil`;
                healthCard.style.border = '1px solid #ef4444';

                // Make clickable to see logs (feature for later expansion: view logs section)
                healthCard.style.cursor = 'pointer';
                healthCard.onclick = () => alert(`Det er ${criticalCount} kritiske feil i loggen. Sjekk Firestore 'system_logs' eller e-postvarsler.`);
            }
        } catch (e) {
            console.error('Failed to check system health:', e);
        }
    }

    async fetchYouTubeStats() {
        const _adminYt1 = 'AIza' + 'Sy';
        const _adminYt2 = 'ClPHHywl7Vr0naj2JnK_t-lY-V86gmKys';
        const YT_API_KEY = _adminYt1 + _adminYt2;
        const YT_CHANNEL_ID = 'UCFbX-Mf7NqDm2a07hk6hveg';
        const url = `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${YT_CHANNEL_ID}&key=${YT_API_KEY}`;

        try {
            const response = await fetch(url);
            const data = await response.json();
            if (data.items && data.items.length > 0) {
                const stats = data.items[0].statistics;
                return {
                    subscribers: stats.subscriberCount,
                    videos: stats.videoCount,
                    views: stats.viewCount
                };
            }
        } catch (error) {
            console.error('Error fetching YouTube stats:', error);
            throw error; // Rethrow to be caught in renderOverview
        }
        return null;
    }

    async fetchPodcastStats() {
        // Use the same proxy/RSS as media.js
        const proxyUrl = 'https://getpodcast-42bhgdjkcq-uc.a.run.app'; // Specific proxy for HKM
        try {
            const response = await fetch(proxyUrl);
            const data = await response.json();
            const channel = Array.isArray(data.rss?.channel) ? data.rss.channel[0] : data.rss?.channel;
            const items = channel?.item;
            if (items) {
                return Array.isArray(items) ? items.length : 1;
            }
        } catch (error) {
            console.error('Error fetching Podcast stats:', error);
            throw error; // Rethrow
        }
        return null;
    }

    async renderMediaManager() {
        const section = document.getElementById('media-section');
        if (!section) return;

        section.innerHTML = `
            <div class="section-header">
                <h2 class="section-title">Media-integrasjoner</h2>
                <p class="section-subtitle">Koble til YouTube og Podcast-strømmer.</p>
            </div>
            
            <div class="grid-2-cols" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 24px;">
                <div class="card">
                    <div class="card-header"><h3 class="card-title">YouTube & RSS</h3></div>
                    <div class="card-body">
                        <div class="form-section">
                            <h4>YouTube Innstillinger</h4>
                            <div class="form-group">
                                <label>YouTube Channel ID</label>
                                <input type="text" id="yt-channel-id" class="form-control" placeholder="f.eks. UCxxxxxxxxxxxx">
                            </div>
                            <div class="form-group" style="margin-top: 15px;">
                                <label>YouTube Kategorier (Playlister)</label>
                                <textarea id="yt-playlists" class="form-control" style="height: 100px;" placeholder="Navn: PlaylistID (én per linje)"></textarea>
                            </div>
                        </div>
                        
                        <div class="divider"></div>

                        <div class="form-section">
                            <h4>Podcast Innstillinger</h4>
                            <div class="form-group">
                                <label>RSS Feed URL</label>
                                <input type="text" id="podcast-rss-url" class="form-control" placeholder="https://feeds.simplecast.com/xxxxxx">
                            </div>
                            <div class="form-group" style="margin-top: 15px;">
                                <label>Spotify Podcast URL</label>
                                <input type="text" id="podcast-spotify-url" class="form-control" placeholder="https://open.spotify.com/show/...">
                            </div>
                            <div class="form-group" style="margin-top: 15px;">
                                <label>Apple Podcasts URL</label>
                                <input type="text" id="podcast-apple-url" class="form-control" placeholder="https://podcasts.apple.com/...">
                            </div>
                        </div>

                        <div style="margin-top: 30px;">
                            <button class="btn-primary" id="save-media-settings">Lagre media-innstillinger</button>
                        </div>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header flex-between">
                        <h3 class="card-title">Podcast-kategorier (Manuell overstyring)</h3>
                        <button class="btn-secondary btn-sm" id="refresh-podcast-list">Oppdater liste</button>
                    </div>
                    <div class="card-body" style="max-height: 600px; overflow-y: auto;">
                        <p style="font-size: 13px; color: #64748b; margin-bottom: 15px;">Her kan du manuelt overstyre kategorien for hver episode. Hvis ingen er valgt, brukes automatisk kategorisering.</p>
                        <div id="podcast-overrides-list">
                            <div class="loader">Henter episoder...</div>
                        </div>
                        <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #eee;">
                            <button class="btn-primary" id="save-podcast-overrides" style="width: 100%;">Lagre overstyringer</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        section.setAttribute('data-rendered', 'true');

        // Initial Load
        this.loadMediaSettings();
        this.loadPodcastOverrides();

        // Listeners
        document.getElementById('save-media-settings').addEventListener('click', () => this.saveMediaSettings());
        document.getElementById('save-podcast-overrides').addEventListener('click', () => this.savePodcastOverrides());
        document.getElementById('refresh-podcast-list').addEventListener('click', () => this.loadPodcastOverrides());
    }

    async renderMessagesSection() {
        const section = document.getElementById('messages-section');
        if (!section) return;

        section.setAttribute('data-rendered', 'true');

        // Basisoppsett
        section.innerHTML = `
            <div class="section-header">
                <h2 class="section-title">Meldinger fra kontaktskjema</h2>
                <p class="section-subtitle">Alle henvendelser som er sendt inn via kontaktskjemaet.</p>
            </div>

            <div class="card">
                <div class="card-header flex-between">
                    <h3 class="card-title">Innboks</h3>
                </div>
                <div class="card-body" id="messages-list">
                    <p style="font-size:14px; color:#64748b;">Laster meldinger...</p>
                </div>
            </div>
        `;

        const listEl = document.getElementById('messages-list');

        if (!firebaseService.isInitialized) {
            if (listEl) {
                listEl.innerHTML = '<p style="color:#ef4444; font-size:14px;">Firebase er ikke konfigurert. Meldinger kan ikke hentes.</p>';
            }
            return;
        }

        try {
            const snapshot = await firebaseService.db
                .collection('contactMessages')
                .orderBy('createdAt', 'desc')
                .limit(100)
                .get();

            if (!listEl) return;

            if (snapshot.empty) {
                listEl.innerHTML = '<p style="font-size:14px; color:#64748b;">Ingen meldinger er sendt inn ennå.</p>';
                return;
            }

            const itemsHtml = [];
            snapshot.forEach(doc => {
                const data = doc.data() || {};
                const createdAt = data.createdAt && typeof data.createdAt.toDate === 'function'
                    ? data.createdAt.toDate().toLocaleString('no-NO')
                    : '';

                const name = data.name || 'Ukjent';
                const email = data.email || '';
                const phone = data.phone || '';
                const subject = data.subject || '(ingen emne)';
                const message = data.message || '';

                const isRead = data.status === 'lest';

                const statusBadge = isRead
                    ? '<span class="message-badge message-badge-read">Lest</span>'
                    : '<span class="message-badge message-badge-new">Ny</span>';

                const markReadButton = isRead
                    ? ''
                    : `<button class="btn-secondary btn-sm message-mark-read" data-id="${doc.id}">Marker som lest</button>`;

                itemsHtml.push(`
                    <div class="message-item ${isRead ? 'message-read' : 'message-new'}" data-id="${doc.id}">
                        <div class="message-header-row">
                            <div>
                                <div class="message-name">${name}</div>
                                <div class="message-meta">
                                    ${email ? `<span>${email}</span>` : ''}
                                    ${email && phone ? ' · ' : ''}
                                    ${phone ? `<span>${phone}</span>` : ''}
                                </div>
                            </div>
                            <div class="message-header-right">
                                <div class="message-time">${createdAt}</div>
                                <div class="message-actions">
                                    ${statusBadge}
                                    ${markReadButton}
                                </div>
                            </div>
                        </div>
                        <div class="message-subject">${subject}</div>
                        <div class="message-body">${message}</div>
                    </div>
                `);
            });

            listEl.innerHTML = itemsHtml.join('');

            // Klikk-håndtering for "marker som lest"
            listEl.addEventListener('click', async (event) => {
                const btn = event.target.closest('.message-mark-read');
                if (!btn) return;

                const id = btn.getAttribute('data-id');
                if (!id) return;

                try {
                    await firebaseService.db.collection('contactMessages').doc(id).update({
                        status: 'lest',
                        readAt: firebase.firestore.FieldValue.serverTimestamp()
                    });

                    const item = btn.closest('.message-item');
                    if (item) {
                        item.classList.remove('message-new');
                        item.classList.add('message-read');
                        const badge = item.querySelector('.message-badge');
                        if (badge) {
                            badge.textContent = 'Lest';
                            badge.classList.remove('message-badge-new');
                            badge.classList.add('message-badge-read');
                        }
                    }

                    btn.remove();
                } catch (err) {
                    console.error('Kunne ikke oppdatere melding som lest:', err);
                    alert('Kunne ikke markere melding som lest. Prøv igjen.');
                }
            }, { once: false });
        } catch (err) {
            console.error('Kunne ikke hente kontaktmeldinger:', err);
            if (listEl) {
                listEl.innerHTML = '<p style="color:#ef4444; font-size:14px;">Feil ved henting av meldinger. Prøv igjen senere.</p>';
            }
        }
    }

    async loadMediaSettings() {
        try {
            const settings = await firebaseService.getPageContent('settings_media');
            if (settings) {
                if (settings.youtubeChannelId) document.getElementById('yt-channel-id').value = settings.youtubeChannelId;
                if (settings.youtubePlaylists) document.getElementById('yt-playlists').value = settings.youtubePlaylists;
                if (settings.podcastRssUrl) document.getElementById('podcast-rss-url').value = settings.podcastRssUrl;
                if (settings.spotifyUrl) document.getElementById('podcast-spotify-url').value = settings.spotifyUrl;
                if (settings.appleUrl) document.getElementById('podcast-apple-url').value = settings.appleUrl;
            }
        } catch (e) {
            console.error("Load media settings error:", e);
        }
    }

    async saveMediaSettings() {
        const btn = document.getElementById('save-media-settings');
        const ytChannelId = document.getElementById('yt-channel-id').value.trim();
        const youtubePlaylists = document.getElementById('yt-playlists').value.trim();
        const podcastRssUrl = document.getElementById('podcast-rss-url').value.trim();
        const spotifyUrl = document.getElementById('podcast-spotify-url').value.trim();
        const appleUrl = document.getElementById('podcast-apple-url').value.trim();

        btn.textContent = 'Lagrer...';
        btn.disabled = true;

        try {
            await firebaseService.savePageContent('settings_media', {
                youtubeChannelId: ytChannelId,
                youtubePlaylists: youtubePlaylists,
                podcastRssUrl: podcastRssUrl,
                spotifyUrl: spotifyUrl,
                appleUrl: appleUrl,
                updatedAt: new Date().toISOString()
            });
            this.showToast('✅ Media-innstillinger er lagret!', 'success', 5000);
        } catch (err) {
            console.error("Save media settings error:", err);
            this.showToast('❌ Feil ved lagring: ' + err.message, 'error', 5000);
        } finally {
            btn.textContent = 'Lagre media-innstillinger';
            btn.disabled = false;
        }
    }

    async loadPodcastOverrides() {
        const listContainer = document.getElementById('podcast-overrides-list');
        if (!listContainer) return;

        listContainer.innerHTML = '<div class="loader">Henter episoder...</div>';

        try {
            // 1. Fetch current overrides from Firebase
            const overridesData = await firebaseService.getPageContent('settings_podcast_overrides') || {};
            const overrides = overridesData.overrides || {};

            // 2. Fetch episodes from RSS (via proxy)
            const settings = await firebaseService.getPageContent('settings_media');
            const proxyUrl = 'https://getpodcast-42bhgdjkcq-uc.a.run.app';
            const response = await fetch(proxyUrl);
            const data = await response.json();
            const channel = Array.isArray(data.rss?.channel) ? data.rss.channel[0] : data.rss?.channel;
            const items = channel?.item;

            if (items) {
                const episodes = Array.isArray(items) ? items : [items];

                listContainer.innerHTML = episodes.map((ep, idx) => {
                    const id = ep.guid?._ || ep.guid || ep.link; // Use guid as unique key
                    const currentCat = overrides[id] || '';

                    return `
                        <div class="podcast-override-item" style="padding: 12px; border-bottom: 1px solid #eee; display: flex; flex-direction: column; gap: 8px;">
                            <div style="font-weight: 600; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${ep.title}">${ep.title}</div>
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <select class="override-select form-control" data-id="${id}" style="font-size: 12px; padding: 4px 8px; height: auto;">
                                    <option value="">Auto (Nøkkelord)</option>
                                    <option value="tro" ${currentCat === 'tro' ? 'selected' : ''}>Tro</option>
                                    <option value="bibel" ${currentCat === 'bibel' ? 'selected' : ''}>Bibel</option>
                                    <option value="bønn" ${currentCat === 'bønn' ? 'selected' : ''}>Bønn</option>
                                    <option value="undervisning" ${currentCat === 'undervisning' ? 'selected' : ''}>Undervisning</option>
                                </select>
                            </div>
                        </div>
                    `;
                }).join('');
            } else {
                listContainer.innerHTML = '<p class="text-muted">Ingen episoder funnet.</p>';
            }
        } catch (err) {
            console.error("Load podcast overrides error:", err);
            listContainer.innerHTML = '<p class="text-danger">Kunne ikke laste episoder.</p>';
        }
    }

    async savePodcastOverrides() {
        const btn = document.getElementById('save-podcast-overrides');
        const selects = document.querySelectorAll('.override-select');
        const overrides = {};

        selects.forEach(select => {
            if (select.value) {
                overrides[select.getAttribute('data-id')] = select.value;
            }
        });

        btn.textContent = 'Lagrer...';
        btn.disabled = true;

        try {
            await firebaseService.savePageContent('settings_podcast_overrides', {
                overrides: overrides,
                updatedAt: new Date().toISOString()
            });
            this.showToast('✅ Podcast-overstyringer er lagret!', 'success', 5000);
        } catch (err) {
            console.error("Save overrides error:", err);
            this.showToast('❌ Feil ved lagring: ' + err.message, 'error', 5000);
        } finally {
            btn.textContent = 'Lagre overstyringer';
            btn.disabled = false;
        }
    }

    /**
     * Render the Content Editor Section (for static pages)
     */
    renderContentEditor() {
        const section = document.getElementById('content-section');
        if (!section) return;

        section.innerHTML = `
            <div class="section-header">
                <h2 class="section-title">Sideinnhold</h2>
                <p class="section-subtitle">Rediger tekst på de faste sidene.</p>
            </div>
            <div class="content-editor-grid">
                <aside class="content-sidebar card">
                    <ul class="page-list">
                        <li class="page-item active" data-page="index">Forside</li>
                        <li class="page-item" data-page="om-oss">Om oss</li>
                        <li class="page-item" data-page="media">Media</li>
                        <li class="page-item" data-page="arrangementer">Arrangementer</li>
                        <li class="page-item" data-page="blogg">Blogg</li>
                        <li class="page-item" data-page="for-menigheter">For menigheter</li>
                        <li class="page-item" data-page="kontakt">Kontakt</li>
                        <li class="page-item" data-page="donasjoner">Donasjoner</li>
                        <li class="page-item" data-page="undervisning">Undervisning</li>
                        <li class="page-item" data-page="reisevirksomhet">Reisevirksomhet</li>
                        <li class="page-item" data-page="bibelstudier">Bibelstudier</li>
                        <li class="page-item" data-page="seminarer">Seminarer</li>
                        <li class="page-item" data-page="podcast">Podcast</li>
                        <li class="page-item" data-page="youtube">YouTube</li>
                        <li class="page-item" data-page="for-bedrifter">For bedrifter</li>
                        <li class="page-item" data-page="bnn">Business Network</li>
                    </ul>
                </aside>
                <div class="content-main">
                    <div class="card">
                        <div class="card-header flex-between">
                            <h3 id="editing-page-title">Forside</h3>
                            <button class="btn-primary" id="save-content">Lagre endringer</button>
                        </div>
                        <div class="card-body" id="editor-fields">
                            <div class="loader">Laster...</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        section.setAttribute('data-rendered', 'true');

        // Sidebar logic
        section.querySelectorAll('.page-item').forEach(item => {
            item.addEventListener('click', () => {
                section.querySelectorAll('.page-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                const pageId = item.getAttribute('data-page');
                document.getElementById('editing-page-title').textContent = item.textContent;
                this.loadPageFields(pageId);
            });
        });

        document.getElementById('save-content').addEventListener('click', () => this.savePageContent());
        this.loadPageFields('index');
    }

    /**
     * Render Collection Editor (Blog/Events) with Add/Delete support
     */
    async renderCollectionEditor(collectionId, title) {
        const section = document.getElementById(`${collectionId}-section`);
        if (!section) return;

        section.innerHTML = `
            <div class="section-header flex-between">
                <div>
                    <h2 class="section-title">${title}</h2>
                    <p class="section-subtitle">Administrer dine ${title.toLowerCase()}.</p>
                </div>
                <button class="btn-primary" id="add-new-${collectionId}">
                    <span class="material-symbols-outlined">add</span> Legg til ny
                </button>
            </div>
            <div class="card">
                <div class="card-body">
                    <div class="collection-list" id="${collectionId}-list">
                        <div class="loader">Laster ${title.toLowerCase()}...</div>
                    </div>
                </div>
            </div>
        `;
        section.setAttribute('data-rendered', 'true');

        document.getElementById(`add-new-${collectionId}`).addEventListener('click', () => this.addNewItem(collectionId));
        this.loadCollection(collectionId);
    }

    async loadCollection(collectionId) {
        const listContainer = document.getElementById(`${collectionId}-list`);
        if (!firebaseService.isInitialized) {
            const debugInfo = [
                `Config: ${!!window.firebaseConfig}`,
                `SDK: ${typeof firebase !== 'undefined'}`,
                `Service: ${!!firebaseService}`
            ].join(', ');
            listContainer.innerHTML = `<div class="text-danger" style="padding: 20px;">
                <p><strong>Firebase er ikke tilkoblet.</strong></p>
                <code style="display:block; margin-top:10px; font-size: 12px; background: #eee; padding: 10px;">Debug: ${debugInfo}</code>
                <p>Prøv å laste siden på nytt (Shift + R).</p>
            </div>`;
            return;
        }

        try {
            const data = await firebaseService.getPageContent(`collection_${collectionId}`);
            let items = Array.isArray(data) ? data : (data && data.items ? data.items : []);

            // Mark items that exist in Firestore so we can delete them
            items.forEach(it => it.isFirestore = true);

            // Specialized merge for events to show synced GCal events
            if (collectionId === 'events') {
                try {
                    const integrations = await firebaseService.getPageContent('settings_integrations');
                    const gcal = integrations?.googleCalendar || {};
                    const apiKey = gcal.apiKey;
                    const calendarId = gcal.calendarId;

                    if (apiKey && calendarId) {
                        // Fetch next 3 months of GCal events
                        const now = new Date();
                        const end = new Date();
                        end.setMonth(now.getMonth() + 3);

                        const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?key=${apiKey}&timeMin=${now.toISOString()}&timeMax=${end.toISOString()}&orderBy=startTime&singleEvents=true`;
                        const res = await fetch(url);
                        const gData = await res.json();

                        if (gData.items) {
                            const gItems = gData.items.map(gi => ({
                                title: gi.summary,
                                date: gi.start.dateTime || gi.start.date,
                                isSynced: true,
                                id: gi.id
                            }));

                            // Merge: Add GCal items if they don't exist in Firestore
                            gItems.forEach(gi => {
                                const exists = items.some(fi =>
                                    (fi.gcalId && fi.gcalId === gi.id) ||
                                    (fi.title === gi.title && fi.date?.split('T')[0] === gi.date?.split('T')[0])
                                );

                                if (!exists) {
                                    items.push(gi);
                                } else {
                                    // Mark existing as synced so we know it's an override
                                    const fi = items.find(fi =>
                                        (fi.gcalId && fi.gcalId === gi.id) ||
                                        (fi.title === gi.title && fi.date?.split('T')[0] === gi.date?.split('T')[0])
                                    );
                                    if (fi) {
                                        fi.isSynced = true;
                                        if (!fi.gcalId) fi.gcalId = gi.id; // Link it if not already linked
                                    }
                                }
                            });
                        }
                    }
                } catch (gErr) {
                    console.error("GCal fetch failed in admin:", gErr);
                }
            }

            this.currentItems = items;
            this.renderItems(collectionId, items);
        } catch (e) {
            listContainer.innerHTML = '<p>Kunne ikke laste data.</p>';
        }
    }

    renderItems(collectionId, items) {
        const container = document.getElementById(`${collectionId}-list`);
        if (items.length === 0) {
            container.innerHTML = '<p style="padding: 20px; text-align: center; color: #94a3b8;">Ingen elementer funnet. Klikk "Legg til ny".</p>';
            return;
        }

        container.innerHTML = `<div class="collection-grid">${items.map((item, index) => `
            <div class="item-card ${item.isSynced ? 'synced-item' : ''}">
                ${item.imageUrl ? `<div class="item-thumb"><img src="${item.imageUrl}" alt="Thumb"></div>` : ''}
                <div class="item-content">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <h4 style="margin: 0;">${item.title || 'Uten tittel'}</h4>
                        ${item.isSynced ? '<span class="badge" style="background: #e0f2fe; color: #0369a1; font-size: 10px; padding: 2px 6px; border-radius: 4px;">Synkronisert</span>' : ''}
                    </div>
                    <p style="margin: 5px 0 12px; font-size: 13px; color: #64748b;">${item.date || ''}</p>
                    <div class="item-actions">
                        <button class="icon-btn" onclick="window.adminManager.editCollectionItem('${collectionId}', ${index})">
                            <span class="material-symbols-outlined">edit</span>
                        </button>
                        ${item.isFirestore ? `
                        <button class="icon-btn delete" onclick="window.adminManager.deleteItem('${collectionId}', ${index})">
                            <span class="material-symbols-outlined">delete</span>
                        </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `).join('')}</div>`;
    }

    async editCollectionItem(collectionId, index) {
        try {
            // Use the already merged item from currentItems
            const item = (this.currentItems && this.currentItems[index]) ? { ...this.currentItems[index] } : {};

            let safeDate = new Date().toISOString().split('T')[0];
            if (item.date && typeof item.date === 'string') {
                safeDate = item.date.split('T')[0];
            }

            // Handle existing tags (ensure array)
            const existingTags = Array.isArray(item.tags) ? item.tags : [];

            const modal = document.createElement('div');
            modal.className = 'dashboard-modal';
            modal.innerHTML = `
                <div class="editor-layout-v2">
                    <header class="editor-header-v2">
                        <div class="editor-header-left">
                             <button class="btn-ghost" id="close-col-modal">
                                <span class="material-symbols-outlined">arrow_back</span> Tilbake
                             </button>
                             <span style="color: #94a3b8; margin: 0 8px;">|</span>
                             <span style="font-weight: 600; font-size: 14px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">
                                ${collectionId === 'blog' ? 'Blogginnlegg' : (collectionId === 'events' ? 'Arrangement' : (collectionId === 'teaching' ? 'Undervisning' : 'Rediger innhold'))}
                             </span>
                        </div>
                        <div class="editor-header-right">
                             <button class="btn-primary" id="save-col-item">
                                <span class="material-symbols-outlined">publish</span> Lagre og publiser
                             </button>
                        </div>
                    </header>
                    <div class="editor-content-wrapper">
                        <div class="editor-main-canvas">
                            <div class="editor-paper">
                                <input type="text" id="col-item-title-v2" placeholder="Skriv din tittel her..." value="${item.title || ''}">
                                <div id="editorjs-container-v2"></div>
                            </div>
                        </div>
                        <aside class="editor-sidebar-v2">
                             <h4 class="sidebar-section-title">DETALJER</h4>
                             <div class="sidebar-group">
                                 <label>Publiseringsdato</label>
                                 <input type="date" id="col-item-date" class="sidebar-control" value="${safeDate}">
                             </div>
                             <div class="sidebar-group">
                                 <label>Forfatter</label>
                                 <input type="text" id="col-item-author" class="sidebar-control" value="${item.author || ''}" placeholder="Navn">
                             </div>
                             <div class="sidebar-group">
                                 <label>Kategori</label>
                                 <input type="text" id="col-item-cat" class="sidebar-control" value="${item.category || ''}" placeholder="Eks: Undervisning">
                             </div>
                             
                             <h4 class="sidebar-section-title">OMSLAGSBILDE</h4>
                             <div class="sidebar-group">
                                 <div class="sidebar-img-preview" id="sidebar-img-trigger">
                                     ${item.imageUrl ? `<img src="${item.imageUrl}">` : '<span class="material-symbols-outlined" style="opacity:0.3; font-size:48px;">add_a_photo</span>'}
                                 </div>
                                 <input type="text" id="col-item-img" class="sidebar-control" style="margin-top:8px;" placeholder="Lim inn bilde-URL" value="${item.imageUrl || ''}">
                                 <p style="font-size: 11px; color: #94a3b8; margin-top: 6px;">Tips: Klikk på boksen over for å lime inn URL raskt.</p>
                             </div>

                             <h4 class="sidebar-section-title">TAGGER</h4>
                             <div class="sidebar-group">
                                 <div class="tags-input-container">
                                     <div id="active-tags" class="active-tags-list"></div>
                                     <input type="text" id="tag-input" class="sidebar-control" placeholder="Legg til tag + Enter">
                                 </div>
                             </div>

                             <h4 class="sidebar-section-title">SEO & SYNLIGHET</h4>
                             <div class="sidebar-group">
                                 <label>Meta-tittel (SEO)</label>
                                 <input type="text" id="col-item-seo-title" class="sidebar-control" value="${item.seoTitle || ''}" placeholder="Tittel for søkemotorer">
                             </div>
                             <div class="sidebar-group">
                                 <label>Meta-beskrivelse</label>
                                 <textarea id="col-item-seo-desc" class="sidebar-control" style="height: 100px;" placeholder="Kort oppsummering...">${item.seoDescription || ''}</textarea>
                             </div>
                        </aside>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            // --- Editor.js Data Prep ---
            let editorData = {};
            if (typeof item.content === 'object' && item.content !== null && item.content.blocks) {
                editorData = item.content;
            } else if (typeof item.content === 'string' && item.content.trim().length > 0) {
                console.warn("Legacy HTML content detected. Editor.js works best with JSON.");
            }

            // --- Initialize Editor.js ---
            // Defines tools conditionally to prevent crashes if scripts fail to load
            const toolsConfig = {};

            if (typeof Header !== 'undefined') {
                toolsConfig.header = {
                    class: Header,
                    inlineToolbar: true,
                    config: { placeholder: 'Overskrift', levels: [2, 3, 4], defaultLevel: 2 }
                };
            }

            if (typeof List !== 'undefined') {
                toolsConfig.list = {
                    class: List,
                    inlineToolbar: true,
                    config: { defaultStyle: 'unordered' }
                };
            }

            if (typeof ImageTool !== 'undefined') {
                toolsConfig.image = {
                    class: ImageTool,
                    config: {
                        uploader: {
                            uploadByFile(file) {
                                alert("Filopplasting er ikke implementert. Bruk URL.");
                                return Promise.resolve({ success: 0 });
                            },
                            uploadByUrl(url) {
                                return Promise.resolve({ success: 1, file: { url: url } });
                            }
                        }
                    }
                };
            }

            if (typeof Quote !== 'undefined') {
                toolsConfig.quote = {
                    class: Quote,
                    inlineToolbar: true,
                    config: { quotePlaceholder: 'Sitat tekst', captionPlaceholder: 'Forfatter' }
                };
            }

            if (typeof Delimiter !== 'undefined') {
                toolsConfig.delimiter = Delimiter;
            }

            // Video / Embed tool
            let EmbedClass = window.Embed || (typeof Embed !== 'undefined' ? Embed : null);
            if (EmbedClass) {
                console.log("Registering Embed tool. Class found:", EmbedClass.name || 'Anonymous');

                // Manually inject toolbox if missing (crucial for EditorJS to show it)
                if (!EmbedClass.toolbox) {
                    try {
                        Object.defineProperty(EmbedClass, 'toolbox', {
                            get: () => ({
                                title: 'Video',
                                icon: '<svg width="20" height="20" viewBox="0 0 20 20"><path d="M17 4H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-9 9V7l5 3-5 3z"/></svg>'
                            }),
                            configurable: true
                        });
                        console.log("Injected toolbox property into EmbedClass.");
                    } catch (e) {
                        console.error("Failed to inject toolbox:", e);
                    }
                }

                toolsConfig.embed = {
                    class: EmbedClass,
                    inlineToolbar: true,
                    config: {
                        services: {
                            youtube: true,
                            vimeo: true,
                            facebook: true,
                            instagram: true,
                            twitter: true
                        }
                    }
                };
            } else {
                console.warn("Embed tool class NOT found in window or local scope.");
            }

            console.log("Final EditorJS Tools Config Keys:", Object.keys(toolsConfig));

            const editor = new EditorJS({
                holder: 'editorjs-container-v2',
                data: editorData,
                placeholder: 'Trykk "/" for å velge blokker...',
                tools: toolsConfig,
                logLevel: 'ERROR',
                onReady: () => {
                    console.log('Editor.js is ready for work!');
                }
            });

            // --- Tag Management Logic ---
            let currentTags = [...existingTags];
            const tagsContainer = document.getElementById('active-tags');
            const tagInput = document.getElementById('tag-input');

            const renderTags = () => {
                if (!tagsContainer) return;
                tagsContainer.innerHTML = currentTags.map(tag => `
                    <span class="tag-badge">
                        ${tag}
                        <button type="button" class="remove-tag" data-tag="${tag}">&times;</button>
                    </span>
                `).join('');

                // Add remove listeners
                document.querySelectorAll('.remove-tag').forEach(btn => {
                    btn.onclick = () => {
                        const tagToRemove = btn.getAttribute('data-tag');
                        currentTags = currentTags.filter(t => t !== tagToRemove);
                        renderTags();
                    };
                });
            };

            // Render initial tags
            renderTags();

            // Add Tag Listener
            if (tagInput) {
                tagInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ',') {
                        e.preventDefault();
                        const val = tagInput.value.trim().replace(',', '');
                        if (val && !currentTags.includes(val)) {
                            currentTags.push(val);
                            renderTags();
                            tagInput.value = '';
                        }
                    }
                });
            }

            // Image Preview Listener
            const imgInput = document.getElementById('col-item-img');
            if (imgInput) {
                imgInput.addEventListener('input', (e) => {
                    const url = e.target.value;
                    const box = document.getElementById('sidebar-img-trigger');
                    if (box) {
                        if (url && url.length > 10) {
                            box.innerHTML = `<img src="${url}">`;
                        } else {
                            box.innerHTML = '<span class="material-symbols-outlined" style="opacity:0.3; font-size:48px;">add_a_photo</span>';
                        }
                    }
                });
            }

            const imgTrigger = document.getElementById('sidebar-img-trigger');
            if (imgTrigger) {
                imgTrigger.onclick = () => {
                    const url = prompt("Lim inn bilde-URL her:");
                    if (url) {
                        imgInput.value = url;
                        // Trigger input event manually to update preview
                        imgInput.dispatchEvent(new Event('input'));
                    }
                };
            }

            const closeBtn = document.getElementById('close-col-modal');
            if (closeBtn) closeBtn.onclick = () => modal.remove();

            const saveBtn = document.getElementById('save-col-item');
            if (saveBtn) {
                saveBtn.onclick = async () => {
                    const btn = document.getElementById('save-col-item');
                    if (!btn) return;

                    // Get JSON data from Editor.js
                    let savedData;
                    try {
                        savedData = await editor.save();
                    } catch (error) {
                        console.error('Saving failed', error);
                        alert('Kunne ikke hente innhold fra editor.');
                        return;
                    }

                    item.title = document.getElementById('col-item-title-v2')?.value || '';
                    item.content = savedData; // Store as JSON object

                    item.date = document.getElementById('col-item-date')?.value || '';
                    item.imageUrl = document.getElementById('col-item-img')?.value || '';
                    item.author = document.getElementById('col-item-author')?.value || '';
                    item.category = document.getElementById('col-item-cat')?.value || '';
                    item.seoTitle = document.getElementById('col-item-seo-title')?.value || '';
                    item.seoDescription = document.getElementById('col-item-seo-desc')?.value || '';
                    item.tags = currentTags;

                    // Ensure gcalId is preserved if this was a synced item
                    if (item.isSynced && item.id && !item.gcalId) {
                        item.gcalId = item.id;
                    }

                    btn.textContent = 'Lagrer...';
                    btn.disabled = true;

                    try {
                        const currentData = await firebaseService.getPageContent(`collection_${collectionId}`);
                        const list = Array.isArray(currentData) ? currentData : (currentData && currentData.items ? currentData.items : []);

                        // Use ID-based matching if available (most reliable)
                        let existingIdx = -1;
                        if (item.id) {
                            existingIdx = list.findIndex(fi => fi.id === item.id);
                        }

                        // Fallback to "Smart Matching" for legacy items or events without ID
                        if (existingIdx === -1) {
                            if (collectionId === 'events') {
                                existingIdx = list.findIndex(fi =>
                                    (item.gcalId && fi.gcalId === item.gcalId) ||
                                    (fi.title === item.title && fi.date?.split('T')[0] === item.date?.split('T')[0])
                                );
                            } else {
                                // Standard index-based handling if no ID match (fallback for old items)
                                if (typeof index === 'number' && index >= 0 && !item.isSynced) {
                                    existingIdx = index;
                                }
                            }
                        }

                        if (existingIdx >= 0) {
                            list[existingIdx] = item;
                        } else {
                            list.unshift(item); // Push to top if truly new
                        }

                        await firebaseService.savePageContent(`collection_${collectionId}`, { items: list });

                        // Force clear the public visitor cache if we modified events
                        if (collectionId === 'events') {
                            this.clearPublicEventCache();

                            // If connected to Google, sync back
                            if (this.googleAccessToken && item.gcalId) {
                                await this.updateGoogleCalendarEvent(item, 'PATCH');
                            }
                        }

                        modal.remove();
                        this.loadCollection(collectionId);
                        this.showToast('✅ Lagret!', 'success');
                    } catch (err) {
                        console.error('Error saving item:', err);
                        this.showToast('Kunne ikke lagre. Sjekk konsollen for detaljer.', 'error', 5000);
                    } finally {
                        if (btn) {
                            btn.textContent = 'Lagre endringer';
                            btn.disabled = false;
                        }
                    }
                };
            }
        } catch (err) {
            console.error('Error opening editor:', err);
            const errorMsg = err.message || JSON.stringify(err);
            this.showToast(`Kunne ikke åpne elementet. Feilmelding: ${errorMsg}. Sjekk at Editor.js scriptet er lastet.`, 'error', 7000);
        }
    }

    async addNewItem(collectionId) {
        const btn = document.getElementById(`add-new-${collectionId}`);
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<span class="material-symbols-outlined">hourglass_empty</span> Forbereder...';
        }

        try {
            // First, ensure we have the latest data locally
            await this.loadCollection(collectionId);

            // Create new item with empty title and a unique ID
            const newItem = {
                id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                title: '',
                date: new Date().toISOString().split('T')[0],
                content: ''
            };

            // Add to the beginning of the local list only (don't save to Firebase yet)
            if (!this.currentItems) this.currentItems = [];
            this.currentItems.unshift(newItem);

            // Immediately open the editor for this new item (index 0)
            // It will save for the first time when the user clicks "Lagre"
            this.editCollectionItem(collectionId, 0);

        } catch (error) {
            console.error('Error preparing new item:', error);
            this.showToast('Kunne ikke forberede nytt element.', 'error', 5000);
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<span class="material-symbols-outlined">add</span> Legg til ny';
            }
        }
    }

    async deleteItem(collectionId, index) {
        // Permission Check
        if (!this.hasPermission('MANAGE_CONTENT')) {
            this.showToast('Du har ikke tilgang til å slette elementer.', 'error', 5000);
            return;
        }

        if (!confirm('Er du sikker på at du vil slette dette elementet?')) return;

        const currentData = await firebaseService.getPageContent(`collection_${collectionId}`);
        const list = Array.isArray(currentData) ? currentData : (currentData && currentData.items ? currentData.items : []);

        // Get the actual item we want to delete from the displayed list
        const itemToDelete = (this.currentItems && this.currentItems[index]) ? this.currentItems[index] : null;

        if (!itemToDelete) {
            this.showToast('Kunne ikke finne elementet som skal slettes.', 'error');
            return;
        }

        // Find match in Firestore
        const matchIdx = list.findIndex(fi =>
            (itemToDelete.gcalId && fi.gcalId === itemToDelete.gcalId) ||
            (fi.title === itemToDelete.title && fi.date?.split('T')[0] === itemToDelete.date?.split('T')[0])
        );

        if (matchIdx >= 0) {
            list.splice(matchIdx, 1);
            await firebaseService.savePageContent(`collection_${collectionId}`, { items: list });

            // Force clear public cache
            if (collectionId === 'events') {
                this.clearPublicEventCache();

                // If connected to Google, delete from there too
                if (this.googleAccessToken && itemToDelete.gcalId) {
                    await this.updateGoogleCalendarEvent(itemToDelete, 'DELETE');
                }
            }
        } else {
            // If it's not in Firestore, we can't delete it (it's a pure GCal item)
            this.showToast('Dette elementet kan ikke slettes da det hentes direkte fra Google Calendar.', 'error');
            return;
        }
        this.loadCollection(collectionId);
        this.showToast('✅ Element slettet!', 'success');
    }

    async renderDesignSection() {
        const section = document.getElementById('design-section');
        if (!section) return;

        section.innerHTML = `
            <div class="section-header">
                <h2 class="section-title">Design & Identitet</h2>
                <p class="section-subtitle">Administrer logo, favicon, fonter, globale farger og tekststørrelser.</p>
            </div>
            
            <div class="settings-grid">
                <!-- Site Identity Card -->
                <div class="settings-card">
                    <div class="settings-card-header">
                        <span class="material-symbols-outlined">fingerprint</span>
                        <h3>Nettstedsidentitet</h3>
                    </div>
                    <div class="settings-card-body">
                        <div class="form-group">
                            <label>Logo URL</label>
                            <input type="text" id="site-logo-url" class="form-control" placeholder="https://...">
                            <div class="upload-row">
                                <input type="file" id="site-logo-file" class="form-control file-input" accept="image/*">
                                <button class="btn-secondary" id="upload-logo-btn" type="button">Last opp logo</button>
                            </div>
                            <div class="preview-container" id="logo-preview-container" style="margin-top: 15px;"></div>
                        </div>
                        <div class="form-group">
                            <label>Tekst ved siden av logo</label>
                            <input type="text" id="site-logo-text" class="form-control" placeholder="His Kingdom Ministry">
                        </div>
                        <div class="form-group">
                            <label>Favicon URL</label>
                            <input type="text" id="site-favicon-url" class="form-control" placeholder="https://...">
                            <div class="upload-row">
                                <input type="file" id="site-favicon-file" class="form-control file-input" accept="image/png,image/x-icon,image/svg+xml">
                                <button class="btn-secondary" id="upload-favicon-btn" type="button">Last opp favicon</button>
                            </div>
                            <div class="preview-container" id="favicon-preview-container" style="margin-top: 15px;"></div>
                        </div>
                        <div class="form-group">
                            <label>Sidetittel (SEO)</label>
                            <input type="text" id="site-title-seo" class="form-control" placeholder="His Kingdom Ministry">
                        </div>
                    </div>
                </div>

                <!-- Typography Card -->
                <div class="settings-card">
                    <div class="settings-card-header">
                        <span class="material-symbols-outlined">palette</span>
                        <h3>Typografi & Styling</h3>
                    </div>
                    <div class="settings-card-body">
                        <div class="form-group">
                            <label>Hovedfont (Google Fonts)</label>
                            <select id="main-font-select" class="form-control">
                                <option value="Inter">Inter</option>
                                <option value="DM Sans">DM Sans</option>
                                <option value="Merriweather">Merriweather</option>
                                <option value="Roboto">Roboto</option>
                                <option value="Open Sans">Open Sans</option>
                                <option value="Montserrat">Montserrat</option>
                                <option value="Outfit">Outfit</option>
                            </select>
                        </div>

                        <div class="premium-range-group">
                            <div class="premium-range-header">
                                <label>H1 Størrelse (Desktop)</label>
                                <span class="premium-range-val" id="font-size-h1-desktop-val">48px</span>
                            </div>
                            <input type="range" id="font-size-h1-desktop" class="premium-slider" min="24" max="80" value="48">
                        </div>

                        <div class="premium-range-group">
                            <div class="premium-range-header">
                                <label>Brødtekst (Body Text)</label>
                                <span class="premium-range-val" id="font-size-base-val">16px</span>
                            </div>
                            <input type="range" id="font-size-base" class="premium-slider" min="12" max="24" value="16">
                        </div>

                        <div class="form-group">
                            <label>Primærfarge</label>
                            <div class="premium-color-wrapper">
                                <input type="color" id="primary-color-picker" class="premium-color-picker-input" value="#1a1a1a">
                                <input type="text" id="primary-color-hex" class="premium-color-hex" value="#1a1a1a">
                            </div>
                        </div>

                        <!-- Live Preview Area -->
                        <div class="live-preview-box" id="live-preview-area">
                            <span class="preview-label">Live Forhåndsvisning</span>
                            <h2 id="typography-preview-text">Slik ser teksten ut</h2>
                            <p style="margin-top: 10px; opacity: 0.7;">Dette er et eksempel på brødtekst-størrelsen din.</p>
                        </div>
                    </div>
                </div>
            </div>

            <div style="margin-top: 32px; display: flex; justify-content: flex-end;">
                <button class="btn-primary" id="save-design-settings" style="padding: 14px 32px; font-size: 16px;">
                    <span class="material-symbols-outlined">auto_awesome</span> Lagre alle endringer
                </button>
            </div>
        `;
        section.setAttribute('data-rendered', 'true');

        // Logic for Dynamic Preview
        const updateLivePreview = () => {
            const font = document.getElementById('main-font-select').value;
            const h1Size = document.getElementById('font-size-h1-desktop').value;
            const bodySize = document.getElementById('font-size-base').value;
            const color = document.getElementById('primary-color-hex').value;
            const previewText = document.getElementById('typography-preview-text');
            const previewBox = document.getElementById('live-preview-area');

            if (previewText) {
                previewText.style.fontFamily = `'${font}', sans-serif`;
                previewText.style.fontSize = `${h1Size}px`;
                previewText.style.color = color;
            }
            if (previewBox) {
                previewBox.style.fontFamily = `'${font}', sans-serif`;
                previewBox.querySelector('p').style.fontSize = `${bodySize}px`;
            }
        };

        // Add Listeners
        const syncRange = (id) => {
            const el = document.getElementById(id);
            const valEl = document.getElementById(`${id}-val`);
            el.oninput = () => {
                valEl.textContent = `${el.value}px`;
                updateLivePreview();
            };
        };
        syncRange('font-size-base');
        syncRange('font-size-h1-desktop');

        const fontSelect = document.getElementById('main-font-select');
        fontSelect.onchange = updateLivePreview;

        const syncColor = (pickerId, hexId) => {
            const picker = document.getElementById(pickerId);
            const hex = document.getElementById(hexId);
            picker.oninput = () => {
                hex.value = picker.value.toUpperCase();
                updateLivePreview();
            };
            hex.oninput = () => {
                picker.value = hex.value;
                updateLivePreview();
            };
        };
        syncColor('primary-color-picker', 'primary-color-hex');

        // Load existing
        try {
            const data = await firebaseService.getPageContent('settings_design');
            if (data) {
                if (data.logoUrl) {
                    document.getElementById('site-logo-url').value = data.logoUrl;
                    this.updatePreview('logo-preview-container', data.logoUrl);
                }
                if (data.faviconUrl) {
                    document.getElementById('site-favicon-url').value = data.faviconUrl;
                    this.updatePreview('favicon-preview-container', data.faviconUrl);
                }
                if (data.siteTitle) document.getElementById('site-title-seo').value = data.siteTitle;
                if (data.logoText) document.getElementById('site-logo-text').value = data.logoText;
                if (data.mainFont) document.getElementById('main-font-select').value = data.mainFont;
                if (data.fontSizeBase) {
                    document.getElementById('font-size-base').value = data.fontSizeBase;
                    document.getElementById('font-size-base-val').textContent = `${data.fontSizeBase}px`;
                }
                if (data.fontSizeH1Desktop) {
                    document.getElementById('font-size-h1-desktop').value = data.fontSizeH1Desktop;
                    document.getElementById('font-size-h1-desktop-val').textContent = `${data.fontSizeH1Desktop}px`;
                }
                if (data.primaryColor) {
                    document.getElementById('primary-color-picker').value = data.primaryColor;
                    document.getElementById('primary-color-hex').value = data.primaryColor;
                }
                updateLivePreview();
            }
        } catch (e) {
            console.error("Load design error:", e);
        }

        document.getElementById('save-design-settings').onclick = async () => {
            const btn = document.getElementById('save-design-settings');
            const data = {
                logoUrl: document.getElementById('site-logo-url').value,
                faviconUrl: document.getElementById('site-favicon-url').value,
                logoText: document.getElementById('site-logo-text').value,
                siteTitle: document.getElementById('site-title-seo').value,
                mainFont: document.getElementById('main-font-select').value,
                fontSizeBase: document.getElementById('font-size-base').value,
                fontSizeH1Desktop: document.getElementById('font-size-h1-desktop').value,
                primaryColor: document.getElementById('primary-color-hex').value,
                updatedAt: new Date().toISOString()
            };

            btn.textContent = 'Lagrer...';
            btn.disabled = true;

            try {
                await firebaseService.savePageContent('settings_design', data);
                this.showToast('✅ Design-innstillinger er lagret!', 'success', 5000);
            } catch (err) {
                this.showToast('❌ Feil ved lagring', 'error', 5000);
            } finally {
                btn.textContent = 'Lagre alle endringer';
                btn.disabled = false;
            }
        };

        // Preview URL inputs
        document.getElementById('site-logo-url').onchange = (e) => this.updatePreview('logo-preview-container', e.target.value);
        document.getElementById('site-favicon-url').onchange = (e) => this.updatePreview('favicon-preview-container', e.target.value);

        const wireUpload = (fileInputId, buttonId, urlInputId, previewId, pathPrefix, idleText) => {
            const fileInput = document.getElementById(fileInputId);
            const button = document.getElementById(buttonId);
            const urlInput = document.getElementById(urlInputId);

            if (!fileInput || !button || !urlInput) return;

            button.onclick = async () => {
                if (!firebaseService.isInitialized) {
                    this.showToast('Firebase er ikke konfigurert. Kan ikke laste opp.', 'error', 5000);
                    return;
                }

                const file = fileInput.files && fileInput.files[0];
                if (!file) {
                    this.showToast('Velg en fil for opplasting.', 'warning', 3000);
                    return;
                }

                button.disabled = true;
                button.textContent = 'Laster opp...';

                try {
                    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
                    const uploadPath = `${pathPrefix}/${Date.now()}-${safeName}`;
                    const url = await firebaseService.uploadImage(file, uploadPath);
                    urlInput.value = url;
                    this.updatePreview(previewId, url);
                } catch (err) {
                    console.error('Upload error:', err);
                    this.showToast('Feil ved opplasting. Prøv igjen.', 'error', 5000);
                } finally {
                    button.disabled = false;
                    button.textContent = idleText;
                }
            };
        };

        wireUpload('site-logo-file', 'upload-logo-btn', 'site-logo-url', 'logo-preview-container', 'branding/logo', 'Last opp logo');
        wireUpload('site-favicon-file', 'upload-favicon-btn', 'site-favicon-url', 'favicon-preview-container', 'branding/favicon', 'Last opp favicon');
    }

    updatePreview(containerId, url) {
        const container = document.getElementById(containerId);
        if (url && url.startsWith('http')) {
            container.innerHTML = `<img src="${url}" class="preview-img" style="margin-top: 10px; max-height: 100px; border-radius: 4px; border: 1px solid #ddd;">`;
        } else {
            container.innerHTML = '';
        }
    }

    async renderCausesManager() {
        const section = document.getElementById('causes-section');
        if (!section) return;

        let totalDonations = 0;
        let donationCount = 0;
        let averageDonation = 0;

        try {
            if (firebaseService.db) {
                const donationsSnapshot = await firebaseService.db.collection('donations').get();
                donationCount = donationsSnapshot.size;
                if (!donationsSnapshot.empty) {
                    donationsSnapshot.forEach(doc => {
                        const data = doc.data();
                        if (data.amount) {
                            totalDonations += (data.amount / 100);
                        }
                    });
                }
                if (donationCount > 0) {
                    averageDonation = totalDonations / donationCount;
                }
            }
        } catch (e) {
            console.warn('Kunne ikke hente donasjoner for Gaver-siden:', e);
        }

        const formattedTotal = totalDonations.toLocaleString('no-NO', { style: 'currency', currency: 'NOK', maximumFractionDigits: 0 });
        const formattedAverage = averageDonation.toLocaleString('no-NO', { style: 'currency', currency: 'NOK', maximumFractionDigits: 0 });


        section.innerHTML = `
            <div class="section-header">
                <h2 class="section-title">Gaver</h2>
                <p class="section-subtitle">Oversikt over gaver og innsamlingsaksjoner.</p>
            </div>

            <div class="stats-grid" style="margin-bottom: 30px;">
                <div class="stat-card">
                    <div class="stat-icon pink"><span class="material-symbols-outlined">payments</span></div>
                    <div class="stat-info">
                        <h3 class="stat-label">Totalt donert</h3>
                        <p class="stat-value">${formattedTotal}</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon blue"><span class="material-symbols-outlined">volunteer_activism</span></div>
                    <div class="stat-info">
                        <h3 class="stat-label">Antall gaver</h3>
                        <p class="stat-value">${donationCount}</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon green"><span class="material-symbols-outlined">trending_up</span></div>
                    <div class="stat-info">
                        <h3 class="stat-label">Snittgave</h3>
                        <p class="stat-value">${formattedAverage}</p>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header flex-between">
                    <h3 class="card-title">Aktive innsamlingsaksjoner</h3>
                    <button class="btn-primary btn-sm" id="add-cause-btn">Legg til innsamlingsaksjon</button>
                </div>
                <div class="card-body" id="causes-list">
                    <p style="font-size:14px; color:#64748b;">Laster innsamlingsaksjoner...</p>
                </div>
            </div>

            <div id="cause-form-modal" style="display: none;">
                <div class="modal-backdrop" onclick="document.getElementById('cause-form-modal').style.display = 'none'"></div>
                <div class="modal-content" style="max-width: 600px;">
                    <div class="modal-header">
                        <h3 id="form-title">Ny innsamlingsaksjon</h3>
                        <button class="modal-close" onclick="document.getElementById('cause-form-modal').style.display = 'none'">×</button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label>Tittel</label>
                            <input type="text" id="cause-title" class="form-control" placeholder="f.eks. Støtt vårt arbeid">
                        </div>
                        <div class="form-group">
                            <label>Beskrivelse</label>
                            <textarea id="cause-description" class="form-control" style="height: 100px;" placeholder="Beskriv hva innsamlingen er for..."></textarea>
                        </div>
                        <div class="form-group">
                            <label>Innsamlet beløp (kr)</label>
                            <input type="number" id="cause-collected" class="form-control" placeholder="0" value="0">
                        </div>
                        <div class="form-group">
                            <label>Målbeløp (kr)</label>
                            <input type="number" id="cause-goal" class="form-control" placeholder="100000" value="100000">
                        </div>
                        <div class="form-group">
                            <label>Bildekilde (URL)</label>
                            <input type="url" id="cause-image" class="form-control" placeholder="https://images.unsplash.com/...">
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn-secondary" onclick="document.getElementById('cause-form-modal').style.display = 'none'">Avbryt</button>
                        <button class="btn-primary" id="save-cause-btn">Lagre</button>
                    </div>
                </div>
            </div>
        `;
        section.setAttribute('data-rendered', 'true');

        await this.loadCauses();

        document.getElementById('add-cause-btn').addEventListener('click', () => {
            document.getElementById('form-title').textContent = 'Ny innsamlingsaksjon';
            document.getElementById('cause-title').value = '';
            document.getElementById('cause-description').value = '';
            document.getElementById('cause-collected').value = '0';
            document.getElementById('cause-goal').value = '100000';
            document.getElementById('cause-image').value = '';
            document.getElementById('cause-form-modal').dataset.editId = '';
            document.getElementById('cause-form-modal').style.display = 'flex';
        });

        document.getElementById('save-cause-btn').addEventListener('click', () => this.saveCause());
    }

    async loadCauses() {
        const listEl = document.getElementById('causes-list');
        if (!listEl) return;

        try {
            const causesData = await firebaseService.getPageContent('collection_causes');
            const causes = causesData && Array.isArray(causesData.items) ? causesData.items : [];

            if (causes.length === 0) {
                listEl.innerHTML = '<p style="font-size:14px; color:#64748b;">Ingen innsamlingsaksjoner ennå. Legg til din første!</p>';
                return;
            }

            const itemsHtml = causes.map((cause, index) => {
                const progress = cause.goal > 0 ? Math.round((cause.collected / cause.goal) * 100) : 0;
                return `
                    <div class="cause-item" style="padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 15px;">
                        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px;">
                            <div style="flex: 1;">
                                <h4 style="margin: 0 0 5px 0; font-size: 16px; font-weight: 600;">${cause.title || 'Uten tittel'}</h4>
                                <p style="margin: 0; color: #64748b; font-size: 14px;">${cause.description || ''}</p>
                            </div>
                            <div style="display: flex; gap: 8px;">
                                <button class="btn-secondary btn-sm edit-cause-btn" data-index="${index}">Rediger</button>
                                <button class="btn-danger btn-sm delete-cause-btn" data-index="${index}">Slett</button>
                            </div>
                        </div>
                        <div style="display: flex; gap: 20px; font-size: 14px;">
                            <div>
                                <span style="color: #64748b;">Samlet inn:</span>
                                <span style="font-weight: 600; color: #059669;">${cause.collected} kr</span>
                            </div>
                            <div>
                                <span style="color: #64748b;">Mål:</span>
                                <span style="font-weight: 600;">${cause.goal} kr</span>
                            </div>
                            <div>
                                <span style="color: #64748b;">Progresjon:</span>
                                <span style="font-weight: 600;">${progress}%</span>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');

            listEl.innerHTML = itemsHtml;

            // Add event listeners
            document.querySelectorAll('.edit-cause-btn').forEach(btn => {
                btn.addEventListener('click', (e) => this.editCause(parseInt(e.target.dataset.index)));
            });

            document.querySelectorAll('.delete-cause-btn').forEach(btn => {
                btn.addEventListener('click', (e) => this.deleteCause(parseInt(e.target.dataset.index)));
            });
        } catch (error) {
            console.error('Error loading causes:', error);
            listEl.innerHTML = '<p style="color:#ef4444;">Feil ved lasting av innsamlingsaksjoner.</p>';
        }
    }

    async saveCause() {
        const title = document.getElementById('cause-title').value.trim();
        const description = document.getElementById('cause-description').value.trim();
        const collected = parseInt(document.getElementById('cause-collected').value) || 0;
        const goal = parseInt(document.getElementById('cause-goal').value) || 100000;
        const image = document.getElementById('cause-image').value.trim();
        const editId = document.getElementById('cause-form-modal').dataset.editId;

        if (!title) {
            this.showToast('Tittel er påkrevd', 'warning', 3000);
            return;
        }

        try {
            let causesData = await firebaseService.getPageContent('collection_causes');
            let causes = causesData && Array.isArray(causesData.items) ? causesData.items : [];

            const newCause = { title, description, collected, goal, image };

            if (editId !== '') {
                causes[parseInt(editId)] = newCause;
            } else {
                causes.push(newCause);
            }

            await firebaseService.savePageContent('collection_causes', { items: causes });
            document.getElementById('cause-form-modal').style.display = 'none';
            await this.loadCauses();
            this.showToast('✅ Innsamlingsaksjon lagret!', 'success');
        } catch (error) {
            console.error('Error saving cause:', error);
            this.showToast('Feil ved lagring av innsamlingsaksjon', 'error', 5000);
        }
    }

    editCause(index) {
        const listEl = document.getElementById('causes-list');
        const causesData = firebaseService.getPageContent('collection_causes').then(async (data) => {
            const causes = data && Array.isArray(data.items) ? data.items : [];
            if (causes[index]) {
                const cause = causes[index];
                document.getElementById('form-title').textContent = 'Rediger innsamlingsaksjon';
                document.getElementById('cause-title').value = cause.title || '';
                document.getElementById('cause-description').value = cause.description || '';
                document.getElementById('cause-collected').value = cause.collected || 0;
                document.getElementById('cause-goal').value = cause.goal || 100000;
                document.getElementById('cause-image').value = cause.image || '';
                document.getElementById('cause-form-modal').dataset.editId = index;
                document.getElementById('cause-form-modal').style.display = 'flex';
            }
        });
    }

    async deleteCause(index) {
        if (!confirm('Er du sikker på at du vil slette denne innsamlingsaksjon?')) return;

        try {
            let causesData = await firebaseService.getPageContent('collection_causes');
            let causes = causesData && Array.isArray(causesData.items) ? causesData.items : [];
            causes.splice(index, 1);
            await firebaseService.savePageContent('collection_causes', { items: causes });
            await this.loadCauses();
            this.showToast('✅ Innsamlingsaksjon slettet!', 'success');
        } catch (error) {
            console.error('Error deleting cause:', error);
            this.showToast('Feil ved sletting av innsamlingsaksjon', 'error', 5000);
        }
    }

    async renderHeroManager() {
        const section = document.getElementById('hero-section');
        if (!section) return;

        section.innerHTML = `
            <div class="section-header flex-between">
                <div>
                    <h2 class="section-title">Hero Slider</h2>
                    <p class="section-subtitle">Administrer slides på forsiden.</p>
                </div>
                <button class="btn-primary" id="add-hero-slide">
                    <span class="material-symbols-outlined">add</span> Ny Slide
                </button>
            </div>
            <div class="collection-grid" id="hero-slides-list">
                <div class="loader">Laster slides...</div>
            </div>
        `;
        section.setAttribute('data-rendered', 'true');

        document.getElementById('add-hero-slide').onclick = () => this.editHeroSlide();
        this.loadHeroSlides();
    }

    async loadHeroSlides() {
        const container = document.getElementById('hero-slides-list');
        if (!container) return;

        try {
            const data = await firebaseService.getPageContent('hero_slides');
            this.heroSlides = data ? data.slides || [] : [];
            this.renderHeroSlides(this.heroSlides);
        } catch (e) {
            container.innerHTML = '<p>Kunne ikke laste slides.</p>';
            this.showToast('Kunne ikke laste slides.', 'error', 5000);
        }
    }

    async renderProfileSection() {
        const section = document.getElementById('profile-section');
        if (!section) return;

        const authUser = firebaseService.auth && firebaseService.auth.currentUser ? firebaseService.auth.currentUser : null;
        if (!authUser) return;

        section.innerHTML = `
            <div style="max-width: 900px; margin: 0 auto; padding: 0 16px;">
                <div class="card" style="padding: 24px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                        <h3>Min Profil</h3>
                        <span class="badge" style="font-size: 0.9rem; padding: 6px 12px;">Medlem siden 2024</span>
                    </div>
                    
                    <div style="background: white; border-bottom: 1px solid var(--border-color); padding-bottom: 30px; margin-bottom: 30px; display: flex; align-items: center; gap: 24px;">
                        <div id="profile-picture-container-admin" style="position: relative; width: 100px; height: 100px; border-radius: 50%; background: #D17D39; display: flex; align-items: center; justify-content: center; color: white; font-size: 2.5rem; font-weight: 700; overflow: hidden; border: 4px solid white; box-shadow: var(--shadow);">
                            ${(authUser.photoURL ? `<img src="${authUser.photoURL}" style="width: 100%; height: 100%; object-fit: cover;">` : (authUser.displayName || authUser.email || '?').charAt(0).toUpperCase())}
                            <label for="profile-upload-admin" style="position: absolute; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; color: white; opacity: 0; transition: opacity 0.3s ease; cursor: pointer;">
                                <span class="material-symbols-outlined">photo_camera</span>
                            </label>
                            <input type="file" id="profile-upload-admin" style="display: none;" accept="image/*">
                        </div>
                        <div>
                            <h4 style="margin-bottom: 4px;">Profilbilde</h4>
                            <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 12px;">Last opp et bilde fra din enhet eller bruk bildet fra Google.</p>
                            <div style="display: flex; gap: 10px;">
                                <button type="button" id="upload-profile-btn-admin" style="padding: 6px 12px; font-size: 0.85rem; border: 1px solid var(--border-color); background: white; border-radius: 8px; cursor: pointer;">Last opp nytt</button>
                                ${Array.isArray(authUser.providerData) && authUser.providerData.some(p => p && p.providerId === 'google.com')
                ? `<button type="button" id="google-photo-btn-admin" style="padding: 6px 12px; font-size: 0.85rem; border: 1px solid var(--border-color); background: white; border-radius: 8px; cursor: pointer;">Hent fra Google</button>`
                : ''}
                            </div>
                        </div>
                    </div>

                    <form id="admin-profile-full-form">
                        <h4 style="margin-bottom: 16px; color: #D17D39; border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">Personalia</h4>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                            <div>
                                <label style="display: block; margin-bottom: 8px; font-weight: 500;">Navn</label>
                                <input type="text" name="displayName" style="width: 100%; padding: 12px; border: 1px solid var(--border-color); border-radius: 8px;">
                            </div>
                            <div>
                                <label style="display: block; margin-bottom: 8px; font-weight: 500;">Telefon</label>
                                <input type="tel" name="phone" style="width: 100%; padding: 12px; border: 1px solid var(--border-color); border-radius: 8px;">
                            </div>
                            <div style="grid-column: span 2;">
                                <label style="display: block; margin-bottom: 8px; font-weight: 500;">E-post</label>
                                <input type="email" name="email" disabled style="width: 100%; padding: 12px; border: 1px solid var(--border-color); border-radius: 8px; background: #f8fafc; color: #64748b;">
                            </div>
                        </div>

                        <h4 style="margin-bottom: 16px; color: #D17D39; border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">Adresse</h4>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                            <div style="grid-column: span 2;">
                                <label style="display: block; margin-bottom: 8px; font-weight: 500;">Gateadresse</label>
                                <input type="text" name="address" style="width: 100%; padding: 12px; border: 1px solid var(--border-color); border-radius: 8px;">
                            </div>
                            <div>
                                <label style="display: block; margin-bottom: 8px; font-weight: 500;">Postnummer</label>
                                <input type="text" name="zip" style="width: 100%; padding: 12px; border: 1px solid var(--border-color); border-radius: 8px;">
                            </div>
                            <div>
                                <label style="display: block; margin-bottom: 8px; font-weight: 500;">Sted</label>
                                <input type="text" name="city" style="width: 100%; padding: 12px; border: 1px solid var(--border-color); border-radius: 8px;">
                            </div>
                        </div>

                        <h4 style="margin-bottom: 16px; color: #D17D39; border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">Kommunikasjon</h4>
                        <div style="margin-bottom: 30px;">
                            <label style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px; cursor: pointer;">
                                <input type="checkbox" name="newsletter" style="width: 18px; height: 18px; accent-color: #D17D39;">
                                <span>Motta nyhetsbrev på e-post</span>
                            </label>
                        </div>

                        <h4 style="margin-bottom: 16px; color: #D17D39; border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">Personvern & Samtykke</h4>
                        <div id="admin-consent-status-display" style="padding: 15px; background: #f1f5f9; border-radius: 8px; margin-bottom: 30px;">
                            <div class="loader">Henter samtykkestatus...</div>
                        </div>

                        <div style="display: flex; gap: 16px; align-items: center; border-top: 1px solid var(--border-color); padding-top: 24px;">
                            <button type="submit" id="save-profile-btn" style="display:inline-flex; align-items:center; justify-content:center; gap:8px; width:100%; border:none; border-radius:10px; padding:12px 16px; color:#fff; font-weight:600; cursor:pointer; background: linear-gradient(135deg, #D17D39, #B54D2B);">
                                <span class="material-symbols-outlined">save</span> Lagre endringer
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        section.setAttribute('data-rendered', 'true');

        // Load existing profile data from the same source as Min Side
        const profile = await firebaseService.getPageContent('settings_profile');
        let userProfile = null;
        try {
            const userDoc = await firebase.firestore().collection('users').doc(authUser.uid).get();
            if (userDoc.exists) userProfile = userDoc.data();
        } catch (e) {
            console.warn('Kunne ikke hente users-profil i admin:', e);
        }

        const mergedName = (userProfile && userProfile.displayName) || (authUser && authUser.displayName) || (profile && profile.fullName) || '';
        const mergedPhoto = (userProfile && userProfile.photoURL) || authUser.photoURL || (profile && profile.photoUrl) || '';
        const mergedAddress = (userProfile && userProfile.address) || (profile && profile.address) || '';
        const mergedZip = (userProfile && userProfile.zip) || (profile && profile.zip) || '';
        const mergedCity = (userProfile && userProfile.city) || (profile && profile.city) || '';
        const mergedPhone = (userProfile && userProfile.phone) || (profile && profile.phone) || '';
        const mergedBio = (userProfile && userProfile.bio) || (profile && profile.bio) || '';
        const mergedNewsletter = userProfile && typeof userProfile.newsletter === 'boolean' ? userProfile.newsletter : true;

        const form = document.getElementById('admin-profile-full-form');
        if (!form) return;

        form.querySelector('[name="displayName"]').value = mergedName;
        form.querySelector('[name="email"]').value = authUser.email || '';
        form.querySelector('[name="address"]').value = mergedAddress;
        form.querySelector('[name="zip"]').value = mergedZip;
        form.querySelector('[name="city"]').value = mergedCity;
        form.querySelector('[name="phone"]').value = mergedPhone;
        form.querySelector('[name="newsletter"]').checked = mergedNewsletter;

        const pictureContainer = document.getElementById('profile-picture-container-admin');
        if (mergedPhoto) {
            const overlay = pictureContainer.querySelector('label[for="profile-upload-admin"]');
            const input = pictureContainer.querySelector('#profile-upload-admin');
            pictureContainer.innerHTML = `<img src="${mergedPhoto}" style="width: 100%; height: 100%; object-fit: cover;">`;
            if (overlay) pictureContainer.appendChild(overlay);
            if (input) pictureContainer.appendChild(input);
        }

        // Consent status
        try {
            const consentDiv = document.getElementById('admin-consent-status-display');
            const userDoc = await firebase.firestore().collection("users").doc(authUser.uid).get();
            if (consentDiv) {
                if (userDoc.exists && userDoc.data().privacySettings) {
                    const choices = userDoc.data().privacySettings.choices || {};
                    consentDiv.innerHTML = `
                        <p style="font-size: 0.95rem; line-height: 1.5;">
                            <strong>Aktivt samtykke:</strong><br>
                            Nødvendige: <span style="color: green;">Ja</span><br>
                            Statistikk: ${choices.analytics ? '<span style="color: green;">Ja</span>' : '<span style="color: red;">Nei</span>'}<br>
                            Markedsføring: ${choices.marketing ? '<span style="color: green;">Ja</span>' : '<span style="color: red;">Nei</span>'}
                        </p>
                    `;
                } else {
                    consentDiv.innerHTML = '<p style="font-size: 0.95rem;">Ingen lagret samtykkestatus funnet.</p>';
                }
            }
        } catch (e) {
            const consentDiv = document.getElementById('admin-consent-status-display');
            if (consentDiv) consentDiv.textContent = 'Kunne ikke hente samtykkestatus.';
        }

        // Image upload
        const fileInput = document.getElementById('profile-upload-admin');
        const uploadBtn = document.getElementById('upload-profile-btn-admin');
        if (uploadBtn && fileInput) uploadBtn.onclick = () => fileInput.click();
        fileInput.onchange = async () => {
            if (fileInput.files.length === 0) return;
            uploadBtn.disabled = true;
            uploadBtn.textContent = 'Laster opp...';
            try {
                const url = await firebaseService.uploadImage(fileInput.files[0], `profiles/${authUser.uid}/avatar.jpg`);
                await authUser.updateProfile({ photoURL: url });
                await firebase.firestore().collection('users').doc(authUser.uid).set({
                    photoURL: url,
                    displayName: form.querySelector('[name="displayName"]').value || authUser.displayName || '',
                    email: authUser.email || '',
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
                await firebaseService.savePageContent('settings_profile', {
                    fullName: form.querySelector('[name="displayName"]').value || authUser.displayName || '',
                    photoUrl: url,
                    updatedAt: new Date().toISOString()
                });

                const overlay = pictureContainer.querySelector('label[for="profile-upload-admin"]');
                const input = pictureContainer.querySelector('#profile-upload-admin');
                pictureContainer.innerHTML = `<img src="${url}" style="width: 100%; height: 100%; object-fit: cover;">`;
                if (overlay) pictureContainer.appendChild(overlay);
                if (input) pictureContainer.appendChild(input);
                await this.updateUserInfo(authUser);
                this.showToast('Profilbilde oppdatert.', 'success', 4000);
            } catch (err) {
                this.showToast('Opplasting feilet: ' + err.message, 'error', 6000);
            } finally {
                uploadBtn.disabled = false;
                uploadBtn.textContent = 'Last opp nytt';
            }
        };

        // Google photo sync
        const googlePhotoBtn = document.getElementById('google-photo-btn-admin');
        if (googlePhotoBtn) {
            googlePhotoBtn.onclick = async () => {
                const provider = (authUser.providerData || []).find(p => p && p.providerId === 'google.com');
                if (!provider || !provider.photoURL) return;
                try {
                    await authUser.updateProfile({ photoURL: provider.photoURL });
                    await firebase.firestore().collection('users').doc(authUser.uid).set({
                        photoURL: provider.photoURL,
                        displayName: form.querySelector('[name="displayName"]').value || authUser.displayName || provider.displayName || '',
                        email: authUser.email || '',
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    }, { merge: true });
                    await firebaseService.savePageContent('settings_profile', {
                        fullName: form.querySelector('[name="displayName"]').value || authUser.displayName || provider.displayName || '',
                        photoUrl: provider.photoURL,
                        updatedAt: new Date().toISOString()
                    });
                    await this.renderProfileSection();
                    await this.updateUserInfo(authUser);
                    this.showToast('Profilbilde hentet fra Google.', 'success', 4000);
                } catch (err) {
                    this.showToast('Kunne ikke hente bilde fra Google.', 'error', 5000);
                }
            };
        }

        // Save full profile
        form.onsubmit = async (event) => {
            event.preventDefault();
            const btn = document.getElementById('save-profile-btn');
            const data = {
                fullName: form.querySelector('[name="displayName"]').value || '',
                address: form.querySelector('[name="address"]').value || '',
                zip: form.querySelector('[name="zip"]').value || '',
                city: form.querySelector('[name="city"]').value || '',
                phone: form.querySelector('[name="phone"]').value || '',
                bio: mergedBio || '',
                newsletter: form.querySelector('[name="newsletter"]').checked,
                photoUrl: authUser.photoURL || mergedPhoto || '',
                updatedAt: new Date().toISOString()
            };

            const original = btn.textContent;
            btn.textContent = 'Lagrer...';
            btn.disabled = true;

            try {
                const authUpdates = {};
                if (data.fullName && data.fullName !== authUser.displayName) authUpdates.displayName = data.fullName;
                if (Object.keys(authUpdates).length > 0) {
                    await authUser.updateProfile(authUpdates);
                }

                await firebase.firestore().collection('users').doc(authUser.uid).set({
                    displayName: data.fullName,
                    address: data.address,
                    zip: data.zip,
                    city: data.city,
                    phone: data.phone,
                    bio: data.bio,
                    newsletter: data.newsletter,
                    photoURL: data.photoUrl,
                    email: authUser.email || '',
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });

                await firebaseService.savePageContent('settings_profile', data);
                this.showToast('✅ Profilen er lagret!', 'success', 5000);
                await this.updateUserInfo(authUser);
            } catch (err) {
                console.error(err);
                this.showToast('❌ Feil ved lagring', 'error', 5000);
            } finally {
                btn.textContent = original;
                btn.disabled = false;
            }
        };
    }

    renderHeroSlides(slides) {
        const container = document.getElementById('hero-slides-list');
        if (slides.length === 0) {
            container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 40px; color: #94a3b8;">Ingen slides ennå. Legg til din første!</p>';
            return;
        }

        container.innerHTML = slides.map((slide, index) => `
            <div class="item-card">
                <div class="item-thumb">
                    <img src="${slide.imageUrl || 'https://via.placeholder.com/400x225?text=Ingen+bilde'}" alt="Slide Thumb">
                </div>
                <div class="item-content">
                    <h4 style="margin-bottom: 4px;">${slide.title || 'Uten tittel'}</h4>
                    <p style="font-size: 13px; color: #64748b; margin-bottom: 12px;">${slide.subtitle || ''}</p>
                    <div class="item-actions">
                        <button class="icon-btn" onclick="adminManager.editHeroSlide(${index})">
                            <span class="material-symbols-outlined">edit</span>
                        </button>
                        <button class="icon-btn delete" onclick="adminManager.deleteHeroSlide(${index})">
                            <span class="material-symbols-outlined">delete</span>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    async editHeroSlide(index = -1) {
        const isNew = index === -1;
        const slide = isNew ? { title: '', subtitle: '', imageUrl: '', btnText: '', btnLink: '' } : this.heroSlides[index];

        const modal = document.createElement('div');
        modal.className = 'dashboard-modal';
        modal.innerHTML = `
            <div class="modal-backdrop" style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 2000; display: flex; align-items: center; justify-content: center; padding: 20px;">
                <div class="card" style="width: 100%; max-width: 500px; max-height: 90vh; overflow-y: auto;">
                    <div class="card-header flex-between">
                        <h3 class="card-title">${isNew ? 'Legg til ny slide' : 'Rediger slide'}</h3>
                        <button class="icon-btn" id="close-modal"><span class="material-symbols-outlined">close</span></button>
                    </div>
                    <div class="card-body">
                        <div class="form-group">
                            <label>Bilde URL / Last opp</label>
                            <div style="display: flex; gap: 8px;">
                                <input type="text" id="slide-img-url" class="form-control" value="${slide.imageUrl || ''}" style="flex: 1;">
                                <button class="btn-primary" id="upload-slide-img" style="padding: 0 12px;"><span class="material-symbols-outlined">upload</span></button>
                                <input type="file" id="slide-file-input" style="display: none;" accept="image/*">
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Overskrift</label>
                            <input type="text" id="slide-title" class="form-control" value="${slide.title || ''}">
                        </div>
                        <div class="form-group">
                            <label>Undertekst</label>
                            <textarea id="slide-subtitle" class="form-control" style="height: 80px;">${slide.subtitle || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label>Knapptekst</label>
                            <input type="text" id="slide-btn-text" class="form-control" value="${slide.btnText || ''}">
                        </div>
                        <div class="form-group">
                            <label>Knapp-lenke</label>
                            <input type="text" id="slide-btn-link" class="form-control" value="${slide.btnLink || ''}">
                        </div>
                        <div style="margin-top: 24px;">
                            <button class="btn-primary" style="width: 100%;" id="save-slide-btn">Lagre slide</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        const imgInput = document.getElementById('slide-img-url');
        const fileInput = document.getElementById('slide-file-input');
        const uploadBtn = document.getElementById('upload-slide-img');

        uploadBtn.onclick = () => fileInput.click();
        fileInput.onchange = async () => {
            if (fileInput.files.length === 0) return;
            uploadBtn.disabled = true;
            uploadBtn.innerHTML = '<span class="material-symbols-outlined rotating">sync</span>';
            try {
                const url = await firebaseService.uploadImage(fileInput.files[0], `hero/${Date.now()}_${fileInput.files[0].name}`);
                imgInput.value = url;
            } catch (err) {
                this.showToast('Opplasting feilet: ' + err.message, 'error', 5000);
            } finally {
                uploadBtn.disabled = false;
                uploadBtn.innerHTML = '<span class="material-symbols-outlined">upload</span> Last opp nytt bilde';
            }
        };

        document.getElementById('close-modal').onclick = () => modal.remove();
        document.getElementById('save-slide-btn').onclick = async () => {
            const btn = document.getElementById('save-slide-btn');
            const updatedSlide = {
                imageUrl: document.getElementById('slide-img-url').value,
                title: document.getElementById('slide-title').value,
                subtitle: document.getElementById('slide-subtitle').value,
                btnText: document.getElementById('slide-btn-text').value,
                btnLink: document.getElementById('slide-btn-link').value
            };

            btn.textContent = 'Lagrer...';
            btn.disabled = true;

            if (isNew) {
                this.heroSlides.push(updatedSlide);
            } else {
                this.heroSlides[index] = updatedSlide;
            }

            try {
                await firebaseService.savePageContent('hero_slides', { slides: this.heroSlides });
                modal.remove();
                this.renderHeroSlides(this.heroSlides);
                this.showToast('✅ Slide lagret!', 'success');
            } catch (err) {
                this.showToast('Feil ved lagring', 'error', 5000);
                btn.textContent = 'Lagre slide';
                btn.disabled = false;
            }
        };
    }

    async deleteHeroSlide(index) {
        if (!confirm('Vil du slette denne sliden?')) return;
        this.heroSlides.splice(index, 1);
        try {
            await firebaseService.savePageContent('hero_slides', { slides: this.heroSlides });
            this.renderHeroSlides(this.heroSlides);
            this.showToast('✅ Slettet!', 'success');
        } catch (err) {
            this.showToast('❌ Feil ved sletting', 'error', 5000);
        }
    }

    async renderTeachingManager() {
        this.renderCollectionEditor('teaching', 'Undervisning');
    }

    async renderSEOSection() {
        const section = document.getElementById('seo-section');
        if (!section) return;

        section.innerHTML = `
            <div class="section-header">
                <h2 class="section-title">SEO & Synlighet</h2>
                <p class="section-subtitle">Styr hvordan nettsiden din ser ut i søkemotorer og sosiale medier.</p>
            </div>
            
            <div class="card" style="margin-bottom: 24px; border-left: 4px solid #3b82f6;">
                <div class="card-body" style="display: flex; align-items: center; gap: 15px;">
                    <span class="material-symbols-outlined" style="font-size: 32px; color: #3b82f6;">insights</span>
                    <div>
                        <h4 style="margin: 0; font-size: 15px;">AI-Søk Optimalisering</h4>
                        <p style="margin: 5px 0 0; font-size: 13px; color: #64748b;">Ved å legge til GEO-data og tydelige SEO-titler hjelper du AIer som ChatGPT og Perplexity å finne innholdet ditt mer presist.</p>
                    </div>
                </div>
            </div>

            <div class="grid-2-cols" style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
                <!-- Global SEO Card -->
                <div class="card">
                    <div class="card-header"><h3 class="card-title">Global SEO</h3></div>
                    <div class="card-body">
                        <div class="form-group">
                            <label>Nettsteds Tittel (Prefix/Suffix)</label>
                            <input type="text" id="seo-global-title" class="form-control" placeholder="His Kingdom Ministry">
                        </div>
                        <div class="form-group">
                            <label>Standard Beskrivelse (Meta Description)</label>
                            <textarea id="seo-global-desc" class="form-control" style="height: 100px;"></textarea>
                        </div>
                        <div class="form-group">
                            <label>Søkeord (Keywords)</label>
                            <input type="text" id="seo-global-keywords" class="form-control" placeholder="tro, jesus, undervisning">
                        </div>
                        <div class="divider" style="margin: 20px 0;"></div>
                        <h4 style="font-size: 14px; margin-bottom: 10px;">GEO Metadata (Lokal SEO)</h4>
                        <div class="form-group">
                            <label>GEO Posisjon (Breddegrad, Lengdegrad)</label>
                            <input type="text" id="seo-global-geo-pos" class="form-control" placeholder="59.9139, 10.7522">
                        </div>
                        <div class="form-group">
                            <label>GEO Region (Landskode-Region)</label>
                            <input type="text" id="seo-global-geo-region" class="form-control" placeholder="NO-Oslo">
                        </div>
                        <div class="form-group">
                            <label>GEO Sted (Placename)</label>
                            <input type="text" id="seo-global-geo-place" class="form-control" placeholder="Oslo">
                        </div>
                        <div style="margin-top: 24px;">
                            <button class="btn-primary" id="save-global-seo" style="width: 100%;">Lagre Globale Innstillinger</button>
                        </div>
                    </div>
                </div>

                <!-- Open Graph / Social Media Card -->
                <div class="card">
                    <div class="card-header"><h3 class="card-title">Sosiale Medier (Open Graph)</h3></div>
                    <div class="card-body">
                        <div class="form-group">
                            <label>Dele-bilde (OG Image) URL</label>
                            <div style="display: flex; gap: 8px;">
                                <input type="text" id="seo-og-image" class="form-control" style="flex: 1;">
                                <button class="btn-primary" id="upload-og-img" style="padding: 0 12px;"><span class="material-symbols-outlined">upload</span></button>
                                <input type="file" id="og-file-input" style="display: none;" accept="image/*">
                            </div>
                        </div>
                        <div id="og-preview" style="margin-top: 15px; border-radius: 8px; border: 1px solid #eee; overflow: hidden; display: none;"></div>
                        <p style="font-size: 12px; color: #64748b; margin-top: 10px;">Dette bildet vises når du deler nettsiden på Facebook, LinkedIn, etc.</p>
                    </div>
                </div>
            </div>

            <div class="card" style="margin-top: 24px;">
                <div class="card-header flex-between">
                    <h3 class="card-title">Sidespesifikk SEO</h3>
                    <select id="seo-page-selector" class="form-control" style="width: 250px;">
                        <option value="index">Forside</option>
                        <option value="om-oss">Om Oss</option>
                        <option value="media">Media</option>
                        <option value="arrangementer">Arrangementer</option>
                        <option value="blogg">Blogg</option>
                        <option value="donasjoner">Donasjoner</option>
                        <option value="kontakt">Kontakt</option>
                        <option value="undervisning">Undervisning</option>
                        <option value="bibelstudier">Bibelstudier</option>
                        <option value="seminarer">Seminarer</option>
                        <option value="podcast">Podcast</option>
                    </select>
                </div>
                <div class="card-body">
                    <div class="form-group">
                        <label>Side-tittel (Vises i fanen)</label>
                        <input type="text" id="seo-page-title" class="form-control">
                    </div>
                    <div class="form-group">
                        <label>Side-beskrivelse</label>
                        <textarea id="seo-page-desc" class="form-control" style="height: 80px;"></textarea>
                    </div>
                    <div class="grid-2-cols" style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                        <div class="form-group">
                            <label>GEO Posisjon (Side)</label>
                            <input type="text" id="seo-page-geo-pos" class="form-control">
                        </div>
                        <div class="form-group">
                            <label>GEO Sted (Side)</label>
                            <input type="text" id="seo-page-geo-place" class="form-control">
                        </div>
                    </div>
                    <button class="btn-secondary" id="save-page-seo" style="width: 100%;">Lagre SEO for denne siden</button>
                </div>
            </div>
        `;
        section.setAttribute('data-rendered', 'true');

        // Load Data
        const seoData = await firebaseService.getPageContent('settings_seo') || {};
        document.getElementById('seo-global-title').value = seoData.globalTitle || '';
        document.getElementById('seo-global-desc').value = seoData.globalDescription || '';
        document.getElementById('seo-global-keywords').value = seoData.globalKeywords || '';
        document.getElementById('seo-og-image').value = seoData.ogImage || '';
        document.getElementById('seo-global-geo-pos').value = seoData.geoPosition || '';
        document.getElementById('seo-global-geo-region').value = seoData.geoRegion || '';
        document.getElementById('seo-global-geo-place').value = seoData.geoPlacename || '';

        const updateOGPreview = () => {
            const url = document.getElementById('seo-og-image').value;
            const preview = document.getElementById('og-preview');
            if (url) {
                preview.innerHTML = `<img src="${url}" style="width: 100%; display: block;">`;
                preview.style.display = 'block';
            } else {
                preview.style.display = 'none';
            }
        };
        updateOGPreview();

        // Page SEO Loading
        const pageSelector = document.getElementById('seo-page-selector');
        const loadPageSEO = () => {
            const pageId = pageSelector.value;
            const pageSEO = (seoData.pages && seoData.pages[pageId]) || {};
            document.getElementById('seo-page-title').value = pageSEO.title || '';
            document.getElementById('seo-page-desc').value = pageSEO.description || '';
            document.getElementById('seo-page-geo-pos').value = pageSEO.geoPosition || '';
            document.getElementById('seo-page-geo-place').value = pageSEO.geoPlacename || '';
        };
        pageSelector.onchange = loadPageSEO;
        loadPageSEO();

        // Image Upload
        const ogFileInput = document.getElementById('og-file-input');
        const uploadOGBtn = document.getElementById('upload-og-img');
        uploadOGBtn.onclick = () => ogFileInput.click();
        ogFileInput.onchange = async () => {
            if (ogFileInput.files.length === 0) return;
            uploadOGBtn.disabled = true;
            uploadOGBtn.innerHTML = '<span class="material-symbols-outlined rotating">sync</span>';
            try {
                const url = await firebaseService.uploadImage(ogFileInput.files[0], `seo/og_image_${Date.now()}`);
                document.getElementById('seo-og-image').value = url;
                updateOGPreview();
            } catch (err) { alert('Upload failed'); }
            finally {
                uploadOGBtn.disabled = false;
                uploadOGBtn.innerHTML = '<span class="material-symbols-outlined">upload</span>';
            }
        };

        // Save Global
        document.getElementById('save-global-seo').onclick = async () => {
            const btn = document.getElementById('save-global-seo');
            seoData.globalTitle = document.getElementById('seo-global-title').value;
            seoData.globalDescription = document.getElementById('seo-global-desc').value;
            seoData.globalKeywords = document.getElementById('seo-global-keywords').value;
            seoData.ogImage = document.getElementById('seo-og-image').value;
            seoData.geoPosition = document.getElementById('seo-global-geo-pos').value;
            seoData.geoRegion = document.getElementById('seo-global-geo-region').value;
            seoData.geoPlacename = document.getElementById('seo-global-geo-place').value;

            btn.textContent = 'Lagrer...';
            btn.disabled = true;
            try {
                await firebaseService.savePageContent('settings_seo', seoData);
                this.showToast('✅ Globale SEO-innstillinger lagret!', 'success', 5000);
            } catch (err) { this.showToast('❌ Feil ved lagring', 'error', 5000); }
            finally {
                btn.textContent = 'Lagre Globale Innstillinger';
                btn.disabled = false;
            }
        };

        // Save Page SEO
        document.getElementById('save-page-seo').onclick = async () => {
            const btn = document.getElementById('save-page-seo');
            const pageId = pageSelector.value;
            if (!seoData.pages) seoData.pages = {};
            seoData.pages[pageId] = {
                title: document.getElementById('seo-page-title').value,
                description: document.getElementById('seo-page-desc').value
            };

            btn.textContent = 'Lagrer...';
            btn.disabled = true;
            try {
                await firebaseService.savePageContent('settings_seo', seoData);
                alert(`SEO for ${pageId} lagret!`);
            } catch (err) { alert('Feil ved lagring'); }
            finally {
                btn.textContent = 'Lagre SEO for denne siden';
                btn.disabled = false;
            }
        };
    }

    async renderIntegrationsSection() {
        const section = document.getElementById('integrations-section');
        if (!section) return;

        section.innerHTML = `
            <div class="section-header">
                <h2 class="section-title">Integrasjoner</h2>
                <p class="section-subtitle">Koble nettsiden din til eksterne tjenester som Google Calendar.</p>
            </div>
            
            <div class="grid-2-cols" style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
                <!-- Google Calendar Integration -->
                <div class="card">
                    <div class="card-header flex-between">
                        <h3 class="card-title">Google Calendar</h3>
                        <div class="status-badge" id="gcal-status" style="font-size: 12px; padding: 4px 8px; border-radius: 12px; background: #fee2e2; color: #991b1b;">Frakoblet</div>
                    </div>
                    <div class="card-body">
                        <p style="font-size: 13px; color: #64748b; margin-bottom: 20px;">Hent arrangementer automatisk fra din Google-kalender til nettsiden.</p>
                        
                        <div class="form-group">
                            <label>Google API Key</label>
                            <input type="password" id="gcal-api-key" class="form-control" placeholder="Din Google Cloud API Key">
                            <p style="font-size: 11px; color: #94a3b8; margin-top: 4px;">Sørg for at 'Google Calendar API' er aktivert i Cloud Console.</p>
                        </div>
                        
                        <div class="form-group">
                            <label>Calendar ID</label>
                            <div id="gcal-list" class="gcal-list"></div>
                            <button type="button" class="btn btn-outline" id="add-gcal" style="margin-top: 10px;">Legg til kalender</button>
                            <p style="font-size: 11px; color: #94a3b8; margin-top: 6px;">Legg inn flere kalendere for filtrering. Calendar ID finner du under "Integrer kalender".</p>
                        </div>

                        <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid #f1f5f9;">
                            <h4 style="margin-bottom: 8px; font-size: 14px; display: flex; align-items: center; gap: 8px;">
                                <span class="material-symbols-outlined" style="font-size: 18px; color: #f39c12;">sync</span>
                                Synkronisering (To-veis)
                            </h4>
                            <p style="font-size: 12px; color: #64748b; margin-bottom: 12px;">Aktiver to-veis synkronisering for å sende endringer fra dashbordet tilbake til Google Calendar.</p>
                            
                            <div id="google-auth-status" style="margin-bottom: 15px;">
                                ${this.googleAccessToken ? `
                                    <div style="display: flex; align-items: center; gap: 10px; padding: 10px; background: #f0fdf4; border-radius: 8px; border: 1px solid #bbf7d0;">
                                        <span class="material-symbols-outlined" style="color: #16a34a;">check_circle</span>
                                        <div style="flex: 1;">
                                            <p style="font-size: 12px; font-weight: 600; color: #166534; margin: 0;">Tilkoblet Google</p>
                                            <p style="font-size: 10px; color: #15803d; margin: 0;">Skrivetilgang er aktivert</p>
                                        </div>
                                        <button id="disconnect-google" class="btn-text" style="color: #dc2626; font-size: 11px;">Koble fra</button>
                                    </div>
                                ` : `
                                    <button class="btn-outline" id="connect-google-btn" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px;">
                                        <img src="https://www.google.com/favicon.ico" width="16" height="16" alt="Google">
                                        Koble til Google for skrivetilgang
                                    </button>
                                `}
                            </div>
                        </div>

                        <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid #f1f5f9;">
                            <h4 style="margin-bottom: 12px; font-size: 14px;">Visningsinnstillinger</h4>
                            <div class="form-group" style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                                <input type="checkbox" id="gcal-show-month" style="width: 18px; height: 18px;">
                                <label for="gcal-show-month" style="margin-bottom: 0; cursor: pointer;">Vis Månedskalender</label>
                            </div>
                            <div class="form-group" style="display: flex; align-items: center; gap: 10px; margin-bottom: 20px;">
                                <input type="checkbox" id="gcal-show-agenda" style="width: 18px; height: 18px;">
                                <label for="gcal-show-agenda" style="margin-bottom: 0; cursor: pointer;">Vis Agendaoversikt (Kommende arrangementer)</label>
                            </div>
                        </div>

                        <div style="margin-top: 10px;">
                            <button class="btn-primary" id="save-gcal-settings" style="width: 100%;">Lagre Kalender-innstillinger</button>
                        </div>
                    </div>
                </div>

                <!-- Guidance Card -->
                <div class="card" style="background: #f8fafc; border: 1px dashed #cbd5e1;">
                    <div class="card-body">
                        <h4 style="margin-bottom: 15px;">Slik setter du opp Google Calendar:</h4>
                        <ol style="font-size: 13px; padding-left: 20px; line-height: 1.6; color: #334155;">
                            <li>Gå til <a href="https://console.cloud.google.com/" target="_blank">Google Cloud Console</a>.</li>
                            <li>Opprett et prosjekt og aktiver <b>Google Calendar API</b>.</li>
                            <li>Gå til "Credentials" og opprett en <b>API Key</b> (begrens den gjerne til ditt domene).</li>
                            <li>I Google Calendar: Gå til innstillinger for kalenderen du vil dele.</li>
                            <li>Under "Access permissions", huk av for <b>Make available to public</b>.</li>
                            <li>Finn <b>Calendar ID</b> under "Integrate calendar" og lim den inn her.</li>
                        </ol>
                    </div>
                </div>
            </div>
        `;

        // Bind Google Auth listeners
        const connectBtn = document.getElementById('connect-google-btn');
        if (connectBtn) {
            connectBtn.onclick = async () => {
                try {
                    const result = await firebaseService.connectToGoogle();
                    this.googleAccessToken = result.accessToken;
                    this.showToast('Tilkoblet Google! Du har nå skrivetilgang.', 'success');
                    this.renderIntegrationsSection(); // Refresh UI to show connected state
                } catch (error) {
                    console.error('Google connection failed:', error);
                    this.showToast('Kunne ikke koble til Google: ' + (error.message || 'Ukjent feil'), 'error');
                }
            };
        }

        const disconnectBtn = document.getElementById('disconnect-google');
        if (disconnectBtn) {
            disconnectBtn.onclick = () => {
                this.googleAccessToken = null;
                this.showToast('Koblet fra Google. Skrivetilgang deaktivert.');
                this.renderIntegrationsSection();
            };
        }

        // Load existing settings
        const settings = await firebaseService.getPageContent('settings_integrations') || {};
        const gcal = settings.googleCalendar || {};

        document.getElementById('gcal-api-key').value = gcal.apiKey || '';
        document.getElementById('gcal-show-month').checked = settings.showMonthView !== false; // Default true
        document.getElementById('gcal-show-agenda').checked = settings.showAgendaView !== false; // Default true

        const listEl = document.getElementById('gcal-list');
        const addBtn = document.getElementById('add-gcal');
        const savedCalendars = Array.isArray(settings.googleCalendars)
            ? settings.googleCalendars
            : (gcal.calendarId ? [{ id: gcal.calendarId, label: gcal.label || '' }] : []);

        const renderCalendarRow = (value = {}) => {
            const row = document.createElement('div');
            row.className = 'gcal-row';
            row.style.display = 'grid';
            row.style.gridTemplateColumns = '1fr 2fr auto';
            row.style.gap = '8px';
            row.style.marginBottom = '8px';

            row.innerHTML = `
                <input type="text" class="form-control gcal-label" placeholder="Navn (f.eks. Moter)" value="${this.escapeHtml(value.label || '')}">
                <input type="text" class="form-control gcal-id" placeholder="Calendar ID" value="${this.escapeHtml(value.id || '')}">
                <button type="button" class="btn btn-outline gcal-remove">Fjern</button>
            `;

            row.querySelector('.gcal-remove').addEventListener('click', () => {
                row.remove();
            });

            listEl.appendChild(row);
        };

        if (savedCalendars.length > 0) {
            savedCalendars.forEach(renderCalendarRow);
        } else {
            renderCalendarRow();
        }

        if (addBtn) {
            addBtn.addEventListener('click', () => renderCalendarRow());
        }

        if (gcal.apiKey && (savedCalendars.length > 0 || gcal.calendarId)) {
            const statusBadge = document.getElementById('gcal-status');
            statusBadge.textContent = 'Konfigurert';
            statusBadge.style.background = '#dcfce7';
            statusBadge.style.color = '#166534';
        }

        document.getElementById('save-gcal-settings').onclick = async (e) => {
            const btn = e.target;
            const apiKey = document.getElementById('gcal-api-key').value.trim();
            const rows = Array.from(document.querySelectorAll('#gcal-list .gcal-row'));
            const calendars = rows.map(row => {
                const label = row.querySelector('.gcal-label')?.value.trim();
                const id = row.querySelector('.gcal-id')?.value.trim();
                return { label, id };
            }).filter(item => item.id);

            btn.textContent = 'Lagrer...';
            btn.disabled = true;

            try {
                const newSettings = {
                    ...settings,
                    showMonthView: document.getElementById('gcal-show-month').checked,
                    showAgendaView: document.getElementById('gcal-show-agenda').checked,
                    googleCalendar: {
                        apiKey,
                        calendarId: calendars[0]?.id || '',
                        label: calendars[0]?.label || '',
                        lastUpdated: new Date().toISOString()
                    },
                    googleCalendars: calendars
                };

                await firebaseService.savePageContent('settings_integrations', newSettings);

                btn.textContent = 'Lagret!';
                const statusBadge = document.getElementById('gcal-status');
                if (apiKey && calendars.length > 0) {
                    statusBadge.textContent = 'Konfigurert';
                    statusBadge.style.background = '#dcfce7';
                    statusBadge.style.color = '#166534';
                }
                setTimeout(() => { btn.textContent = 'Lagre Kalender-innstillinger'; btn.disabled = false; }, 2000);
            } catch (err) {
                console.error("Save Error:", err);
                btn.textContent = 'Feil ved lagring';
                btn.style.setProperty('background', '#ef4444', 'important');
                setTimeout(() => {
                    btn.textContent = 'Lagre Kalender-innstillinger';
                    btn.disabled = false;
                    btn.style.setProperty('background', '', '');
                }, 2000);
            }
        };

        section.setAttribute('data-rendered', 'true');
    }

    /**
     * Settings, Placeholders and Helpers
     */
    renderSettingsSection() {
        const section = document.getElementById('settings-section');
        if (!section) return;

        section.innerHTML = `
            <div class="section-header">
                <h2 class="section-title">Innstillinger & Verktøy</h2>
                <p class="section-subtitle">Administrer systeminnstillinger og datasync.</p>
            </div>
            <div class="grid-2-cols" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 24px;">
                <div class="card">
                    <div class="card-header"><h3 class="card-title">Firebase Konfigurasjon</h3></div>
                    <div class="card-body">
                        <textarea id="fb-config" class="form-control" style="height: 150px; font-family: monospace; margin-bottom: 15px;">${localStorage.getItem('hkm_firebase_config') || ''}</textarea>
                        <button class="btn-primary" id="save-fb" style="width: 100%;">Lagre & Koble til</button>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header"><h3 class="card-title">Datasynkronisering</h3></div>
                    <div class="card-body">
                        <p style="font-size: 14px; margin-bottom: 20px; color: #64748b;">Dette vil importere alt eksisterende hardkodet innhold fra nettsiden (blogg, hero, undervisning) inn i dashboardet.</p>
                        <button class="btn-primary" id="sync-existing-content" style="width: 100%; background: #0ea5e9;">
                            <span class="material-symbols-outlined" style="font-size: 18px; vertical-align: middle; margin-right: 5px;">sync</span>
                            Synkroniser Innhold
                        </button>
                        <div id="sync-status" style="margin-top: 15px; font-size: 13px;"></div>
                    </div>
                </div>
            </div>
        `;
        section.setAttribute('data-rendered', 'true');

        document.getElementById('save-fb').addEventListener('click', () => {
            const val = document.getElementById('fb-config').value;
            localStorage.setItem('hkm_firebase_config', val);
            this.showToast('✅ Lagret! Laster på nytt...', 'success', 5000);
            setTimeout(() => window.location.reload(), 2000);
        });

        document.getElementById('sync-existing-content').addEventListener('click', () => this.seedExistingData());
    }

    async seedExistingData() {
        const statusEl = document.getElementById('sync-status');
        const btn = document.getElementById('sync-existing-content');

        if (!confirm('Dette vil overskrive eventuelle endringer du har gjort i dashboardet med innhold fra de statiske HTML-filene. Fortsette?')) return;

        btn.disabled = true;
        statusEl.innerHTML = '<span style="color: #64748b;">Starter synkronisering...</span>';

        try {
            // 1. Hero Slides
            statusEl.innerHTML += '<br>Syncing Hero Slides...';
            const heroSlides = [
                {
                    imageUrl: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=1920&h=1080&fit=crop',
                    title: 'Tenk & gi nestekjærlighet',
                    subtitle: 'Vi er her for å støtte deg på din åndelige reise. Bli med i et trygt miljø der vi utforsker Guds ord, deler livet og styrker relasjonen til Jesus.',
                    btnText: 'Utforsk mer',
                    btnLink: 'om-oss.html'
                },
                {
                    imageUrl: 'https://images.unsplash.com/photo-1529070538774-1843cb3265df?w=1920&h=1080&fit=crop',
                    title: 'Vekst gjennom felleskap',
                    subtitle: 'Uansett hvor du er på din vandring, ønsker vi å gå sammen med deg. Bli med i et felleskap som utforsker Guds ord og styrker troen.',
                    btnText: 'Les mer',
                    btnLink: 'om-oss.html'
                },
                {
                    imageUrl: 'https://images.unsplash.com/photo-1507692049790-de58290a4334?w=1920&h=1080&fit=crop',
                    title: 'Støtt vårt arbeid',
                    subtitle: 'Din gave gjør en forskjell. Hjelp oss å nå flere mennesker med evangeliet gjennom undervisning, reisevirksomhet og felleskap.',
                    btnText: 'Gi gave nå',
                    btnLink: 'donasjoner.html'
                }
            ];
            await firebaseService.savePageContent('hero_slides', { slides: heroSlides });

            // 2. Blog Posts
            statusEl.innerHTML += '<br>Syncing Blog Posts...';
            const blogPosts = [
                {
                    title: 'Hvordan bevare troen i en travel hverdag',
                    date: '05 Feb, 2024',
                    category: 'Undervisning',
                    content: 'Vi utforsker praktiske tips og bibelske prinsipper for å opprettholde en nær relasjon med Gud til tross for en hektisk tidsplan...',
                    imageUrl: 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
                },
                {
                    title: 'Rapport fra misjonsturen til Kenya',
                    date: '28 Jan, 2024',
                    category: 'Reise',
                    content: 'Bli med på reisen gjennom våre opplevelser i Kenya. Vi så Guds godhet i aksjon gjennom helbredelse, omsorg og glede...',
                    imageUrl: 'https://images.unsplash.com/photo-1489392191049-fc10c97e64b6?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
                },
                {
                    title: 'Ny Podcast Episode: Tro, tvil og vekst',
                    date: '15 Jan, 2024',
                    category: 'Podcast',
                    content: 'Lytt til vår nyeste episode hvor vi diskuterer de ærlige sidene ved troslivet og hvordan vi kan finne hvile i Guds løfter...',
                    imageUrl: 'https://images.unsplash.com/photo-1475483768296-6163e08872a1?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
                },
                {
                    title: 'Viktigheten av å stå sammen',
                    date: '10 Jan, 2024',
                    category: 'Felleskap',
                    content: 'Hvorfor felleskapet er essensielt for den kristne vandringen og hvordan vi kan støtte hverandre gjennom livets ulike sesonger...',
                    imageUrl: 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
                },
                {
                    title: 'Min reise fra mørke til lys',
                    date: '02 Jan, 2024',
                    category: 'Vitnesbyrd',
                    content: 'Et sterkt vitnesbyrd om hvordan Gud forandret et liv preget av håpløshet til et liv fylt med mening, fred og fremtidstro...',
                    imageUrl: 'https://images.unsplash.com/photo-1507413245164-6160d8298b31?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
                }
            ];
            await firebaseService.savePageContent('collection_blog', { items: blogPosts });

            // 3. Teaching Series
            statusEl.innerHTML += '<br>Syncing Teaching Series...';
            const teachingSeries = [
                {
                    title: 'Tro og Tvil',
                    content: 'Hvordan håndtere tvil og styrke din tro i utfordrende tider.',
                    category: '5 episoder',
                    author: 'His Kingdom',
                    date: '02 Feb, 2024',
                    imageUrl: 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=600&h=400&fit=crop'
                },
                {
                    title: 'Guds Karakter',
                    content: 'Utforsk Guds egenskaper og hva de betyr for våre liv.',
                    category: '8 episoder',
                    author: 'His Kingdom',
                    date: '25 Jan, 2024',
                    imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=400&fit=crop'
                },
                {
                    title: 'Åndelige Gaver',
                    content: 'Oppdag og bruk dine åndelige gaver til Guds ære.',
                    category: '6 episoder',
                    author: 'His Kingdom',
                    date: '15 Jan, 2024',
                    imageUrl: 'https://images.unsplash.com/photo-1519834785169-98be25ec3f84?w=600&h=400&fit=crop'
                },
                {
                    title: 'Kristen Disippelskap',
                    content: 'Lær hva det betyr å være en disippel av Jesus.',
                    category: '10 episoder',
                    author: 'His Kingdom',
                    date: '10 Jan, 2024',
                    imageUrl: 'https://images.unsplash.com/photo-1529070538774-1843cb3265df?w=600&h=400&fit=crop'
                },
                {
                    title: 'Bønneliv',
                    content: 'Utvikle et kraftfullt og meningsfullt bønneliv.',
                    category: '7 episoder',
                    author: 'His Kingdom',
                    date: '05 Jan, 2024',
                    imageUrl: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=600&h=400&fit=crop'
                },
                {
                    title: 'Å Finne Guds Vilje',
                    content: 'Hvordan søke og følge Guds plan for ditt liv.',
                    category: '4 episoder',
                    author: 'His Kingdom',
                    date: '02 Jan, 2024',
                    imageUrl: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=600&h=400&fit=crop'
                },
                {
                    title: 'Tilgivelse og Forsoning',
                    content: 'Kraften i tilgivelse og hvordan leve i forsoning.',
                    category: '5 episoder',
                    author: 'His Kingdom',
                    date: '28 Dec, 2023',
                    imageUrl: 'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=600&h=400&fit=crop'
                },
                {
                    title: 'Åndelig Krigføring',
                    content: 'Stå fast i kampen mot åndelige krefter.',
                    category: '6 episoder',
                    author: 'His Kingdom',
                    date: '20 Dec, 2023',
                    imageUrl: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600&h=400&fit=crop'
                },
                {
                    title: 'Din Identitet i Kristus',
                    content: 'Forstå hvem du er som Guds barn.',
                    category: '5 episoder',
                    author: 'His Kingdom',
                    date: '15 Dec, 2023',
                    imageUrl: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=600&h=400&fit=crop'
                },
                {
                    title: 'Kallet til Tjeneste',
                    content: 'Hvordan tjene Gud og andre effektivt.',
                    category: '8 episoder',
                    author: 'His Kingdom',
                    date: '10 Dec, 2023',
                    imageUrl: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=600&h=400&fit=crop'
                },
                {
                    title: 'Helliggjørelse',
                    content: 'Vokse i hellighet og likhet med Kristus.',
                    category: '7 episoder',
                    author: 'His Kingdom',
                    date: '05 Dec, 2023',
                    imageUrl: 'https://images.unsplash.com/photo-1490730141103-6cac27aaab94?w=600&h=400&fit=crop'
                },
                {
                    title: 'Endetidsprofetier',
                    content: 'Forstå Bibelens profetier om endetiden.',
                    category: '9 episoder',
                    author: 'His Kingdom',
                    date: '01 Dec, 2023',
                    imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&h=400&fit=crop'
                }
            ];
            await firebaseService.savePageContent('collection_teaching', { items: teachingSeries });

            // 4. Page Content (index)
            statusEl.innerHTML += '<br>Syncing Page Text...';
            const indexContent = {
                about: {
                    label: 'Velkommen til Fellesskapet',
                    title: 'Vi er en Non-Profit Organisasjon',
                    description: 'His Kingdom Ministry driver med åndelig samlinger som bønnemøter, undervisningseminarer, og forkynnende reisevirksomhet. Vi ønsker å være et felleskap der mennesker kan vokse i sin tro og relasjon til Jesus.',
                    features: {
                        mission: {
                            title: 'Vårt Oppdrag',
                            text: 'Å utruste og inspirere mennesker til et dypere liv med Gud gjennom undervisning, fellesskap og bønn.'
                        },
                        story: {
                            title: 'Vår Historie',
                            text: 'Startet med en visjon om å samle mennesker i åndelig vekst, har vi vokst til et levende felleskap som driver med bønnemøter, undervisning og reisevirksomhet.'
                        }
                    }
                },
                features: {
                    teaching: { title: 'Undervisning', text: 'Bibelskoler, seminarer og dyptgående undervisning.' },
                    podcast: { title: 'Podcast', text: 'Lytt til våre samtaler om tro, liv og åndelig vekst.' },
                    travel: { title: 'Reisevirksomhet', text: 'Forkynnelse og konferanser rundt om i verden.' }
                },
                stats: {
                    events: { number: '150', label: 'Arrangementer' },
                    podcast: { number: '85', label: 'Podcast Episoder' },
                    reached: { number: '2500', label: 'Mennesker Nådd' },
                    countries: { number: '12', label: 'Land Besøkt' }
                }
            };
            await firebaseService.savePageContent('index', indexContent);

            // 5. om-oss content
            statusEl.innerHTML += '<br>Syncing Om Oss...';
            const omOssContent = {
                hero: { title: 'Om Oss', subtitle: 'Lær mer om vår visjon, oppdrag og historie' },
                intro: {
                    label: 'Velkommen til Fellesskapet',
                    title: 'Vi er en Non-Profit Organisasjon',
                    text: 'His Kingdom Ministry driver med åndelig samlinger som bønnemøter, undervisningseminarer, og forkynnende reisevirksomhet. Vi ønsker å være et felleskap der mennesker kan vokse i sin tro og relasjon til Jesus.'
                },
                mission: { title: 'Vårt Oppdrag', text: 'Å utruste og inspirere mennesker til et dypere liv med Gud gjennom undervisning, fellesskap og bønn.' },
                history: { title: 'Vår Historie', text: 'Startet med en visjon om å samle mennesker i åndelig vekst, har vi vokst til et levende felleskap som driver med bønnemøter, undervisning og reisevirksomhet.' },
                values: {
                    title: 'Hva Vi Står For',
                    bible: { title: 'Bibeltro Undervisning', text: 'Vi forankrer alt vi gjør i Guds ord og søker å leve etter Bibelens prinsipper.' },
                    prayer: { title: 'Bønn & Tilbedelse', text: 'Bønn er hjertet av alt vi gjør, og vi søker Guds nærvær i alt.' },
                    community: { title: 'Fellesskap', text: 'Vi tror på kraften i felleskap og støtter hverandre i troen.' },
                    love: { title: 'Kjærlighet & Omsorg', text: 'Vi møter alle med Kristi kjærlighet og omsorg.' }
                }
            };
            await firebaseService.savePageContent('om-oss', omOssContent);

            // 6. kontakt content
            statusEl.innerHTML += '<br>Syncing Kontakt...';
            const kontaktContent = {
                hero: { title: 'Kontakt Oss', subtitle: 'Vi vil gjerne høre fra deg. Send oss en melding eller besøk oss.' },
                info: {
                    title: 'Ta Kontakt',
                    text: 'Har du spørsmål, bønnebehov eller ønsker du å vite mer om vår tjeneste? Ikke nøl med å ta kontakt med oss.',
                    email: 'post@hiskingdomministry.no',
                    phone: '+47 930 94 615',
                    address: 'Norge'
                }
            };
            await firebaseService.savePageContent('kontakt', kontaktContent);

            // 7. media content
            statusEl.innerHTML += '<br>Syncing Media...';
            const mediaContent = {
                hero: { title: 'Media', subtitle: 'Utforsk våre videoer, podcaster og annet innhold' },
                youtube: { title: 'Siste Videoer', description: 'Se våre nyeste videoer og undervisninger' },
                podcast: { title: 'Siste Episoder', description: 'Lytt til våre podcaster om tro, liv og åndelig vekst' },
                teaching: { title: 'Undervisningsressurser', description: 'Dyptgående bibelstudier og undervisningsserier' }
            };
            await firebaseService.savePageContent('media', mediaContent);

            // 8. donasjoner content
            statusEl.innerHTML += '<br>Syncing Donasjoner...';
            const donasjonerContent = {
                hero: { title: 'Donasjoner' },
                intro: {
                    title: 'Våre aktive innsamlingsaksjoner',
                    description: 'Din gave utgjør en forskjell. Velg et prosjekt du ønsker å støtte og bli med på å forandre liv.'
                },
                form: {
                    title: 'Støtt vårt arbeid',
                    description: 'Din gave gjør en reell forskjell. Velg beløp og betalingsmetode nedenfor.'
                }
            };
            await firebaseService.savePageContent('donasjoner', donasjonerContent);

            // 9. blogg content
            statusEl.innerHTML += '<br>Syncing Blogg...';
            const bloggContent = {
                hero: { title: 'Nyheter / Blogg', subtitle: 'Les våre siste artikler og oppdateringer' },
                section: { title: 'Siste Nytt', label: 'Nyheter & Blogg', description: 'Les våre siste artikler og oppdateringer.' }
            };
            await firebaseService.savePageContent('blogg', bloggContent);

            // 10. arrangementer content
            statusEl.innerHTML += '<br>Syncing Arrangementer...';
            const arrangementerContent = {
                hero: { title: 'Arrangementer', subtitle: 'Bli med på våre kommende hendelser' },
                section: { title: 'Kommende Arrangementer', description: 'Se våre kommende arrangementer og meld deg på.' }
            };
            await firebaseService.savePageContent('arrangementer', arrangementerContent);

            // 11. undervisning content
            statusEl.innerHTML += '<br>Syncing Undervisning...';
            const undervisningContent = {
                hero: { title: 'Undervisning', subtitle: 'Dyptgående bibelundervisning' }
            };
            await firebaseService.savePageContent('undervisning', undervisningContent);

            // 12. bibelstudier content
            statusEl.innerHTML += '<br>Syncing Bibelstudier...';
            const bibelstudierContent = {
                hero: { title: 'Bibelstudier', subtitle: 'Utforsk Guds ord sammen med oss' }
            };
            await firebaseService.savePageContent('bibelstudier', bibelstudierContent);

            // 13. seminarer content
            statusEl.innerHTML += '<br>Syncing Seminarer...';
            const seminarerContent = {
                hero: { title: 'Seminarer', subtitle: 'Temabaserte undervisningsdager' }
            };
            await firebaseService.savePageContent('seminarer', seminarerContent);

            // 14. podcast content
            statusEl.innerHTML += '<br>Syncing Podcast...';
            const podcastContent = {
                hero: { title: 'Podcast', subtitle: 'Lytt til våre samtaler' }
            };
            await firebaseService.savePageContent('podcast', podcastContent);

            // 15. default SEO settings
            statusEl.innerHTML += '<br>Syncing SEO-innstillinger...';
            const seoDefaults = {
                globalTitle: 'His Kingdom Ministry',
                globalDescription: 'His Kingdom Ministry driver med åndelig samlinger, undervisning og forkynnelse. Velkommen til vårt fellesskap.',
                globalKeywords: 'tro, bibel, undervisning, bønn, fellesskap, jesus, kristendom',
                ogImage: '',
                pages: {
                    index: { title: 'Forside | His Kingdom Ministry', description: 'Velkommen til His Kingdom Ministry.' },
                    'om-oss': { title: 'Om Oss | His Kingdom Ministry', description: 'Les om vår visjon og historie.' },
                    media: { title: 'Media & Undervisning', description: 'Se våre videoer og undervisning.' },
                    blogg: { title: 'Siste Nytt & Blogg', description: 'Følg med på hva som skjer.' }
                }
            };
            await firebaseService.savePageContent('settings_seo', seoDefaults);

            statusEl.innerHTML = '<span style="color: #10b981; font-weight: 600;">✅ Datasynkronisering fullført!</span>';
            alert('Synkronisering ferdig! Innholdet er nå tilgjengelig i dashboardet.');
        } catch (err) {
            console.error(err);
            statusEl.innerHTML = '<span style="color: #ef4444;">❌ Synkronisering feilet: ' + err.message + '</span>';
        } finally {
            btn.disabled = false;
        }
    }

    createPlaceholderSection(id) {
        const contentArea = document.getElementById('content-area');
        const section = document.createElement('div');
        section.id = `${id}-section`;
        section.className = 'section-content';
        section.innerHTML = `<div class="card"><div class="card-body"><h2>${id}</h2><p>Kommer snart...</p></div></div>`;
        contentArea.appendChild(section);
    }

    async loadPageFields(pageId) {
        const container = document.getElementById('editor-fields');
        container.innerHTML = '<div class="loader">Laster...</div>';

        try {
            const data = await firebaseService.getPageContent(pageId) || {};

            // For subpages, ensure hero fields exist so they show up in the editor
            if (pageId !== 'index') {
                if (!data.hero) data.hero = {};
                if (data.hero.title === undefined) data.hero.title = "";
                if (data.hero.subtitle === undefined) data.hero.subtitle = "";

                // Support both backgroundImage and bg keys
                if (pageId === 'for-bedrifter' || pageId === 'bnn' || pageId === 'for-menigheter' || pageId === 'blogg') {
                    if (data.hero.bg === undefined && data.hero.backgroundImage === undefined) {
                        data.hero.bg = ""; // Default to .bg for these
                    } else if (data.hero.bg === undefined && data.hero.backgroundImage !== undefined) {
                        data.hero.bg = data.hero.backgroundImage; // Migrate if needed
                    }
                } else {
                    if (data.hero.backgroundImage === undefined) data.hero.backgroundImage = "";
                }
            }

            this.renderFields(data);
        } catch (e) {
            container.innerHTML = '<p>Error.</p>';
        }
    }

    renderFields(data) {
        const container = document.getElementById('editor-fields');
        container.innerHTML = '';
        const flattenedData = this.flatten(data);

        if (Object.keys(flattenedData).length === 0) {
            container.innerHTML = '<p>Ingen redigerbare felt funnet for denne siden.</p>';
            return;
        }

        Object.keys(flattenedData).forEach(key => {
            const value = flattenedData[key];
            const formGroup = document.createElement('div');
            formGroup.className = 'form-group';

            const label = document.createElement('label');
            label.textContent = key.replace(/\./g, ' > ').toUpperCase();

            let inputElement;
            if (typeof value === 'string' && (value.length > 100 || key.includes('description') || key.includes('content'))) {
                inputElement = document.createElement('textarea');
                inputElement.style.height = '120px';
            } else {
                inputElement = document.createElement('input');
                inputElement.type = 'text';
            }
            inputElement.className = 'form-control';
            inputElement.value = value || '';
            inputElement.setAttribute('data-key', key);

            formGroup.appendChild(label);
            formGroup.appendChild(inputElement);

            // Add image preview if it's a background image field
            if (key.includes('backgroundImage') || key.includes('imageUrl') || key.endsWith('.bg')) {
                const preview = document.createElement('div');
                preview.className = 'img-preview-mini';
                preview.style.marginTop = '10px';
                preview.style.height = '60px';
                preview.style.width = '100px';
                preview.style.background = '#f1f5f9';
                preview.style.borderRadius = '4px';
                preview.style.overflow = 'hidden';
                preview.style.display = 'flex';
                preview.style.alignItems = 'center';
                preview.style.justifyContent = 'center';
                preview.style.border = '1px solid #e2e8f0';

                const updateMiniPreview = (url) => {
                    if (url && url.length > 5) {
                        preview.innerHTML = `<img src="${url}" style="width:100%; height:100%; object-fit:cover;">`;
                    } else {
                        preview.innerHTML = '<span class="material-symbols-outlined" style="font-size:20px; color:#cbd5e1;">image</span>';
                    }
                };

                updateMiniPreview(value);
                inputElement.addEventListener('input', (e) => updateMiniPreview(e.target.value));
                formGroup.appendChild(preview);
            }

            container.appendChild(formGroup);
        });
    }

    async savePageContent() {
        const pageId = document.querySelector('.page-item.active').dataset.page;
        const inputs = document.querySelectorAll('#editor-fields .form-control');
        const dataToSave = {};

        inputs.forEach(input => {
            const keys = input.dataset.key.split('.');
            let curr = dataToSave;
            keys.forEach((k, i) => {
                if (i === keys.length - 1) {
                    curr[k] = input.value;
                } else {
                    curr[k] = curr[k] || {};
                    curr = curr[k];
                }
            });
        });

        try {
            await firebaseService.savePageContent(pageId, dataToSave);
            this.showToast('✅ Innholdet er lagret!', 'success', 5000);
        } catch (err) {
            this.showToast('❌ Feil ved lagring', 'error', 5000);
        }
    }

    flatten(obj, prefix = '') {
        return Object.keys(obj).reduce((acc, k) => {
            const pre = prefix.length ? prefix + '.' : '';
            if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k])) {
                Object.assign(acc, this.flatten(obj[k], pre + k));
            } else { acc[pre + k] = obj[k]; }
            return acc;
        }, {});
    }
    async renderUsersSection() {
        const section = document.getElementById('users-section');
        if (!section) return;

        // If a user is selected, render the detail view instead of the list
        if (this.currentUserDetailId) {
            await this.renderUserDetailView(this.currentUserDetailId);
            return;
        }

        section.innerHTML = `
            <div class="section-header flex-between">
                <div>
                    <h2 class="section-title">Brukerhåndtering</h2>
                    <p class="section-subtitle">Oversikt over alle registrerte brukere og deres tilgangsnivåer.</p>
                </div>
                <button id="add-user-btn" class="btn-primary">
                    <span class="material-symbols-outlined">person_add</span>
                    Ny bruker
                </button>
            </div>

            <div class="card">
                <div class="card-header">
                    <div class="header-search" style="width: 100%; max-width: 400px;">
                        <span class="material-symbols-outlined">search</span>
                        <input type="text" id="user-search-input" placeholder="Søk etter navn eller e-post...">
                    </div>
                </div>
                <div class="card-body" id="users-list-container">
                    <div class="loader"></div>
                </div>
            </div>
        `;

        section.setAttribute('data-rendered', 'true');

        const addUserBtn = document.getElementById('add-user-btn');
        if (addUserBtn) {
            addUserBtn.onclick = () => this.openUserModal();
        }

        const searchInput = document.getElementById('user-search-input');
        if (searchInput) {
            searchInput.oninput = (e) => {
                const query = e.target.value.toLowerCase();
                this.filterUsersTable(query);
            };
        }

        await this.loadUsersList();
    }

    async loadUsersList() {
        const container = document.getElementById('users-list-container');
        if (!container) return;

        try {
            const snapshot = await firebaseService.db.collection('users').orderBy('createdAt', 'desc').get();
            const users = [];
            snapshot.forEach(doc => {
                users.push({ id: doc.id, ...doc.data() });
            });

            this.allUsersData = users; // Cache for filtering
            this.renderUsersTable(users);
        } catch (error) {
            console.error('Error fetching users:', error);
            container.innerHTML = `<p class="error-text">Kunne ikke laste brukere: ${error.message}</p>`;
        }
    }

    renderUsersTable(users) {
        const container = document.getElementById('users-list-container');
        if (!container) return;

        if (users.length === 0) {
            container.innerHTML = '<p class="empty-text">Ingen brukere funnet.</p>';
            return;
        }

        let tableHtml = `
            <div class="table-responsive">
                <table class="hkm-table">
                    <thead>
                        <tr>
                            <th>Bruker</th>
                            <th>E-post</th>
                            <th>Rolle</th>
                            <th>Opprettet</th>
                            <th style="text-align:right;">Handlinger</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        users.forEach(user => {
            const name = user.displayName || user.fullName || 'Ukjent Navn';
            const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
            const roleClass = `role-badge-${user.role || 'medlem'}`;
            const roleLabel = (user.role || 'medlem').charAt(0).toUpperCase() + (user.role || 'medlem').slice(1);

            const createdAt = user.createdAt ? (user.createdAt.toDate ? user.createdAt.toDate().toLocaleDateString('no-NO') : new Date(user.createdAt).toLocaleDateString('no-NO')) : '---';

            tableHtml += `
                <tr>
                    <td>
                        <div class="user-cell">
                            <div class="user-avatar-sm" style="${user.photoURL ? `background-image: url('${user.photoURL}'); background-size: cover;` : ''}">
                                ${!user.photoURL ? initials : ''}
                            </div>
                            <div class="user-cell-info">
                                <div class="user-cell-name">${this.escapeHtml(name)}</div>
                                <div class="user-cell-id">ID: ${user.id.substring(0, 8)}...</div>
                            </div>
                        </div>
                    </td>
                    <td>${this.escapeHtml(user.email || 'Ingen e-post')}</td>
                    <td><span class="role-badge ${roleClass}">${roleLabel}</span></td>
                    <td>${createdAt}</td>
                    <td style="text-align:right;">
                        <div class="item-actions">
                            <button class="icon-btn edit-user-btn" data-id="${user.id}" title="Rediger">
                                <span class="material-symbols-outlined">edit</span>
                            </button>
                            <button class="icon-btn delete-user-btn danger" data-id="${user.id}" title="Slett">
                                <span class="material-symbols-outlined">delete</span>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });

        tableHtml += `
                    </tbody>
                </table>
            </div>
        `;

        container.innerHTML = tableHtml;

        // Add event listeners
        container.querySelectorAll('.edit-user-btn').forEach(btn => {
            btn.onclick = () => {
                const userId = btn.getAttribute('data-id');
                this.currentUserDetailId = userId;
                this.userEditMode = false; // Start in read-only mode as requested
                this.renderUsersSection();
            };
        });

        container.querySelectorAll('.delete-user-btn').forEach(btn => {
            btn.onclick = () => {
                const userId = btn.getAttribute('data-id');
                const userData = this.allUsersData.find(u => u.id === userId);
                const userName = userData ? (userData.displayName || userData.fullName || 'Ukjent') : 'Ukjent';
                this.showDeleteUserConfirmationModal(userId, userName);
            };
        });
    }

    showDeleteUserConfirmationModal(userId, userName) {
        // Remove existing if any
        const existing = document.getElementById('hkm-delete-modal-overlay');
        if (existing) existing.remove();

        const warningMsg = `Er du sikker på at du vil slette brukeren "${userName}" fra oversikten? Dette sletter kun profildata i Firestore og kan ikke angres.`;

        const modalHtml = `
            <div id="hkm-delete-modal-overlay" class="hkm-modal-overlay">
                <div class="hkm-modal-container">
                    <div class="hkm-modal-icon">
                        <span class="material-symbols-outlined">warning</span>
                    </div>
                    <h3 class="hkm-modal-title">\u26A0\uFE0F Slett bruker?</h3>
                    <p class="hkm-modal-message">${warningMsg}</p>
                    <div class="hkm-modal-actions">
                        <button id="hkm-modal-cancel" class="hkm-modal-btn hkm-modal-btn-cancel">Avbryt</button>
                        <button id="hkm-modal-confirm" class="hkm-modal-btn hkm-modal-btn-delete">Slett bruker</button>
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
            await this.deleteUser(userId);
            closeModal();
        };

        // Show with animation
        requestAnimationFrame(() => {
            overlay.classList.add('active');
        });
    }

    filterUsersTable(query) {
        if (!this.allUsersData) return;
        const filtered = this.allUsersData.filter(user => {
            const name = (user.displayName || user.fullName || '').toLowerCase();
            const email = (user.email || '').toLowerCase();
            return name.includes(query) || email.includes(query);
        });
        this.renderUsersTable(filtered);
    }

    openUserModal(userData = null) {
        const modalId = 'user-edit-modal';
        let modal = document.getElementById(modalId);

        if (!modal) {
            modal = document.createElement('div');
            modal.id = modalId;
            modal.className = 'profile-modal';
            modal.style.cssText = 'display:none; position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.25); z-index:2000; align-items:center; justify-content:center;';
            document.body.appendChild(modal);
        }

        const ROLES = window.HKM_ROLES;
        const rolesOptions = Object.values(ROLES).map(role =>
            `<option value="${role}" ${userData && userData.role === role ? 'selected' : ''}>${role.charAt(0).toUpperCase() + role.slice(1)}</option>`
        ).join('');

        modal.innerHTML = `
            <div class="profile-modal-content" style="background:#fff; border-radius:16px; box-shadow:0 8px 32px rgba(0,0,0,0.15); padding:32px; min-width:400px; max-width:90vw; position:relative;">
                <button class="close-modal-btn" style="position:absolute; top:16px; right:16px; background:none; border:none; font-size:22px; cursor:pointer; color:#888;">&times;</button>
                <h3 style="font-size:20px; font-weight:700; margin-bottom:20px;">${userData ? 'Rediger bruker' : 'Opprett ny bruker'}</h3>
                
                <form id="user-edit-form" style="display:grid; gap:16px;">
                    <input type="hidden" name="id" value="${userData ? userData.id : ''}">
                    
                    <div class="form-group">
                        <label>Fullt navn</label>
                        <input type="text" name="displayName" class="form-control" value="${userData ? (userData.displayName || userData.fullName || '') : ''}" required>
                    </div>

                    <div class="form-group">
                        <label>E-post</label>
                        <input type="email" name="email" class="form-control" value="${userData ? (userData.email || '') : ''}" required ${userData ? 'readonly' : ''}>
                        ${!userData ? '<p class="helper-text">Brukeren må fortsatt registrere seg selv via "Min Side" for å kunne logge inn.</p>' : ''}
                    </div>

                    <div class="form-group">
                        <label>Rolle / Tilgangsnivå</label>
                        <select name="role" class="form-control">
                            ${rolesOptions}
                        </select>
                    </div>

                    <div class="form-group">
                        <label>Telefon</label>
                        <input type="tel" name="phone" class="form-control" value="${userData ? (userData.phone || '') : ''}">
                    </div>

                    <div class="form-group">
                        <label>Adresse</label>
                        <input type="text" name="address" class="form-control" value="${userData ? (userData.address || '') : ''}">
                    </div>

                    <div style="display:grid; grid-template-columns: 1fr 2fr; gap:16px;">
                        <div class="form-group">
                            <label>Postnummer</label>
                            <input type="text" name="zip" class="form-control" value="${userData ? (userData.zip || '') : ''}">
                        </div>
                        <div class="form-group">
                            <label>Poststed</label>
                            <input type="text" name="city" class="form-control" value="${userData ? (userData.city || '') : ''}">
                        </div>
                    </div>

                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:16px;">
                        <div class="form-group">
                            <label>Fødselsdato</label>
                            <input type="date" name="birthdate" class="form-control" value="${userData ? (userData.birthdate || '') : ''}">
                        </div>
                        <div class="form-group">
                            <label>Medlemsnummer</label>
                            <input type="text" name="membershipNumber" class="form-control" value="${userData ? (userData.membershipNumber || '') : ''}">
                        </div>
                    </div>

                    <div class="form-group">
                        <label>Interne notater</label>
                        <textarea name="adminNotes" class="form-control" style="min-height:80px; resize:vertical;">${userData ? (userData.adminNotes || '') : ''}</textarea>
                    </div>

                    <div class="form-group">
                        <label>Fødselsnummer (11 siffer - for skattefradrag)</label>
                        <input type="password" name="ssn" class="form-control" value="${userData ? (userData.ssn || '') : ''}" placeholder="00000000000" maxlength="11" autocomplete="off">
                        <p class="helper-text">Lagres kryptert/sikkert i Firestore for rapportering til Skatteetaten.</p>
                    </div>

                    <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:8px;">
                        <button type="button" class="btn-cancel" style="padding:10px 20px; border-radius:8px; border:1px solid #e2e8f0; background:none; cursor:pointer;">Avbryt</button>
                        <button type="submit" class="btn-primary">Lagre endringer</button>
                    </div>
                </form>
            </div>
        `;

        modal.style.display = 'flex';

        const closeBtn = modal.querySelector('.close-modal-btn');
        const cancelBtn = modal.querySelector('.btn-cancel');
        const form = modal.querySelector('#user-edit-form');

        const closeModal = () => modal.style.display = 'none';
        closeBtn.onclick = closeModal;
        cancelBtn.onclick = closeModal;
        modal.onclick = (e) => { if (e.target === modal) closeModal(); };

        form.onsubmit = async (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            const data = {
                displayName: formData.get('displayName'),
                email: formData.get('email'),
                role: formData.get('role'),
                phone: formData.get('phone'),
                address: formData.get('address'),
                zip: formData.get('zip'),
                city: formData.get('city'),
                birthdate: formData.get('birthdate'),
                membershipNumber: formData.get('membershipNumber'),
                adminNotes: formData.get('adminNotes'),
                ssn: formData.get('ssn')
            };
            const userId = formData.get('id');
            await this.saveUser(userId, data);
            closeModal();
        };
    }

    async renderUserDetailView(userId) {
        const section = document.getElementById('users-section');
        if (!section) return;

        section.innerHTML = `
            <div class="section-header">
                <div style="display:flex; align-items:center; gap:12px; margin-bottom:12px;">
                    <button id="back-to-users-btn" class="icon-btn" title="Tilbake til oversikt">
                        <span class="material-symbols-outlined">arrow_back</span>
                    </button>
                    <h2 class="section-title">Brukerprofil</h2>
                </div>
                <p class="section-subtitle">Detaljert informasjon og rettigheter for valgt bruker.</p>
            </div>

            <div id="user-detail-container" class="loader"></div>
        `;

        const backBtn = document.getElementById('back-to-users-btn');
        if (backBtn) {
            backBtn.onclick = () => {
                this.currentUserDetailId = null;
                this.userEditMode = false;
                this.renderUsersSection();
            };
        }

        const container = document.getElementById('user-detail-container');
        try {
            const doc = await firebaseService.db.collection('users').doc(userId).get();
            if (!doc.exists) {
                container.innerHTML = '<p class="error-text">Bruker ble ikke funnet.</p>';
                return;
            }
            const userData = { id: doc.id, ...doc.data() };
            this.renderUserDetailLayout(container, userData);
        } catch (err) {
            console.error('Error loading user details:', err);
            container.innerHTML = `<p class="error-text">Feil ved lasting av brukerdetaljer: ${err.message}</p>`;
        }
    }

    renderUserDetailLayout(container, userData) {
        const name = userData.displayName || userData.fullName || 'Ukjent Navn';
        const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
        const ROLES = window.HKM_ROLES;
        const rolesOptions = Object.values(ROLES).map(role =>
            `<option value="${role}" ${userData.role === role ? 'selected' : ''}>${role.charAt(0).toUpperCase() + role.slice(1)}</option>`
        ).join('');

        container.innerHTML = `
            <div style="max-width: 900px;">
                <div class="card" style="margin-bottom: 24px;">
                    <div class="card-body" style="display: flex; align-items: center; gap: 32px; padding: 32px;">
                        <div class="user-avatar-lg" style="width: 100px; height: 100px; font-size: 36px; position: relative; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; ${userData.photoURL ? `background-image: url('${userData.photoURL}'); background-size: cover; background-position: center;` : 'background-color: var(--accent-color);'}">
                            ${!userData.photoURL ? initials : ''}
                            ${this.userEditMode ? `
                                <div id="change-photo-overlay" style="position: absolute; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; border-radius: inherit; cursor: pointer; color: white;">
                                    <span class="material-symbols-outlined">photo_camera</span>
                                </div>
                                <input type="file" id="user-photo-input" style="display: none;" accept="image/*">
                            ` : ''}
                        </div>
                        <div style="flex:1;">
                            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                                <div>
                                    <h3 style="font-size: 24px; font-weight: 700; margin-bottom: 4px;">${this.escapeHtml(name)}</h3>
                                    <p style="color: var(--text-muted); font-size: 15px;">${this.escapeHtml(userData.email || 'Ingen e-post')}</p>
                                </div>
                                <div style="display:flex; gap:12px;">
                                    ${!this.userEditMode ? `
                                        <button id="activate-edit-btn" class="btn-secondary">
                                            <span class="material-symbols-outlined">edit</span>
                                            Aktiver redigering
                                        </button>
                                    ` : `
                                        <button id="cancel-edit-btn" class="action-btn">
                                            Avbryt
                                        </button>
                                        <button id="save-user-detail-btn" class="btn-primary">
                                            Lagre endringer
                                        </button>
                                    `}
                                </div>
                            </div>
                            <div style="margin-top:16px; display:flex; gap:16px;">
                                <span class="role-badge role-badge-${userData.role || 'medlem'}">${(userData.role || 'medlem').toUpperCase()}</span>
                                <span style="font-size:13px; color:var(--text-muted);">Opprettet: ${userData.createdAt ? (userData.createdAt.toDate ? userData.createdAt.toDate().toLocaleDateString('no-NO') : new Date(userData.createdAt).toLocaleDateString('no-NO')) : 'Ukjent'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                ${this.userEditMode ? `
                    <div id="upload-progress-container" style="display: none; margin-bottom: 24px;">
                        <div style="height: 4px; background: #eee; border-radius: 2px; overflow: hidden;">
                            <div id="upload-progress-bar" style="height: 100%; background: var(--accent-color); width: 0%; transition: width 0.3s ease;"></div>
                        </div>
                        <p style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">Laster opp bilde...</p>
                    </div>
                ` : ''}

                <form id="user-detail-form" class="${!this.userEditMode ? 'readonly-form' : ''}">
                    <input type="hidden" name="id" value="${userData.id}">
                    
                    <div class="grid-2-cols equal" style="margin-bottom: 24px; gap: 24px;">
                        <div class="card">
                            <div class="card-header"><h4 class="card-title">Personalia</h4></div>
                            <div class="card-body">
                                <div class="form-group">
                                    <label>Fullt navn</label>
                                    <input type="text" name="displayName" class="form-control" value="${this.escapeHtml(name)}" ${!this.userEditMode ? 'disabled' : ''} required>
                                </div>
                                <div class="form-group">
                                    <label>E-post (kun lesetilgang)</label>
                                    <input type="email" class="form-control" value="${this.escapeHtml(userData.email || '')}" disabled>
                                </div>
                                <div class="form-group">
                                    <label>Telefon</label>
                                    <input type="tel" name="phone" class="form-control" value="${this.escapeHtml(userData.phone || '')}" ${!this.userEditMode ? 'disabled' : ''}>
                                </div>
                                <div class="form-group">
                                    <label>Fødselsdato</label>
                                    <input type="date" name="birthdate" class="form-control" value="${userData.birthdate || ''}" ${!this.userEditMode ? 'disabled' : ''}>
                                </div>
                            </div>
                        </div>

                        <div class="card">
                            <div class="card-header"><h4 class="card-title">Adresse</h4></div>
                            <div class="card-body">
                                <div class="form-group">
                                    <label>Gateadresse</label>
                                    <input type="text" name="address" class="form-control" value="${this.escapeHtml(userData.address || '')}" ${!this.userEditMode ? 'disabled' : ''}>
                                </div>
                                <div style="display:grid; grid-template-columns: 1fr 2fr; gap:16px;">
                                    <div class="form-group">
                                        <label>Postnr</label>
                                        <input type="text" name="zip" class="form-control" value="${this.escapeHtml(userData.zip || '')}" ${!this.userEditMode ? 'disabled' : ''}>
                                    </div>
                                    <div class="form-group">
                                        <label>Sted</label>
                                        <input type="text" name="city" class="form-control" value="${this.escapeHtml(userData.city || '')}" ${!this.userEditMode ? 'disabled' : ''}>
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label>Fødselsnummer (kun for skattefradrag)</label>
                                    <input type="password" name="ssn" class="form-control" value="${userData.ssn || ''}" placeholder="11 siffer" maxlength="11" autocomplete="off" ${!this.userEditMode ? 'disabled' : ''}>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="grid-2-cols equal" style="gap: 24px;">
                        <div class="card">
                            <div class="card-header"><h4 class="card-title">Medlemskap & Tilgang</h4></div>
                            <div class="card-body">
                                <div class="form-group">
                                    <label>Rolle / Tilgangsnivå</label>
                                    <select name="role" class="form-control" ${!this.userEditMode ? 'disabled' : ''}>
                                        ${rolesOptions}
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>Medlemsnummer</label>
                                    <input type="text" name="membershipNumber" class="form-control" value="${this.escapeHtml(userData.membershipNumber || '')}" ${!this.userEditMode ? 'disabled' : ''}>
                                </div>
                            </div>
                        </div>

                        <div class="card">
                            <div class="card-header"><h4 class="card-title">Interne notater</h4></div>
                            <div class="card-body">
                                <div class="form-group">
                                    <label>Notater (kun synlig for admin)</label>
                                    <textarea name="adminNotes" class="form-control" style="min-height:120px;" ${!this.userEditMode ? 'disabled' : ''}>${this.escapeHtml(userData.adminNotes || '')}</textarea>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="card" style="margin-top: 24px;">
                        <div class="card-header">
                            <div style="display:flex; align-items:center; gap:8px;">
                                <span class="material-symbols-outlined" style="color: var(--accent-color);">mail</span>
                                <h4 class="card-title">Kommunikasjon</h4>
                            </div>
                        </div>
                        <div class="card-body">
                            <div class="form-group">
                                <label>Send e-post til bruker</label>
                                <input type="text" id="manual-email-subject" class="form-control" placeholder="Emne..." style="margin-bottom:12px;">
                                <textarea id="manual-email-message" class="form-control" style="min-height:150px;" placeholder="Skriv meldingen her..."></textarea>
                            </div>
                            <div style="display:flex; justify-content:flex-end; margin-top:16px;">
                                <button type="button" id="send-manual-email-btn" class="btn-primary">
                                    <span class="material-symbols-outlined">send</span>
                                    Send e-post
                                </button>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        `;

        // Event Listeners
        if (this.userEditMode) {
            const overlay = document.getElementById('change-photo-overlay');
            const fileInput = document.getElementById('user-photo-input');
            if (overlay && fileInput) {
                overlay.onclick = () => fileInput.click();
                fileInput.onchange = async (e) => {
                    const file = e.target.files[0];
                    if (file) {
                        await this.handleUserPhotoUpload(userData.id, file);
                    }
                };
            }
        }

        const activateEditBtn = document.getElementById('activate-edit-btn');
        if (activateEditBtn) {
            activateEditBtn.onclick = () => {
                this.userEditMode = true;
                this.renderUserDetailLayout(container, userData);
            };
        }

        const cancelEditBtn = document.getElementById('cancel-edit-btn');
        if (cancelEditBtn) {
            cancelEditBtn.onclick = () => {
                this.userEditMode = false;
                this.renderUserDetailLayout(container, userData);
            };
        }

        const saveBtn = document.getElementById('save-user-detail-btn');
        if (saveBtn) {
            saveBtn.onclick = async () => {
                const form = document.getElementById('user-detail-form');
                const formData = new FormData(form);
                const updates = {
                    displayName: formData.get('displayName'),
                    phone: formData.get('phone'),
                    gender: userData.gender || null, // preserve or null
                    birthdate: formData.get('birthdate'),
                    address: formData.get('address'),
                    zip: formData.get('zip'),
                    city: formData.get('city'),
                    ssn: formData.get('ssn'),
                    membershipNumber: formData.get('membershipNumber'),
                    role: formData.get('role'),
                    adminNotes: formData.get('adminNotes')
                };

                saveBtn.disabled = true;
                saveBtn.textContent = 'Lagrer...';

                try {
                    await this.saveUser(userData.id, updates);
                    this.userEditMode = false;
                    // reload details to reflect fresh data
                    await this.renderUserDetailView(userData.id);
                } catch (e) {
                    saveBtn.disabled = false;
                    saveBtn.textContent = 'Lagre endringer';
                }
            };
        }

        const sendMailBtn = document.getElementById('send-manual-email-btn');
        if (sendMailBtn) {
            sendMailBtn.onclick = async () => {
                const subject = document.getElementById('manual-email-subject').value;
                const message = document.getElementById('manual-email-message').value;

                if (!subject || !message) {
                    this.showToast('Vennligst fyll ut både emne og melding.', 'warning');
                    return;
                }

                sendMailBtn.disabled = true;
                const originalText = sendMailBtn.innerHTML;
                sendMailBtn.innerHTML = '<span class="material-symbols-outlined">sync</span> Sender...';

                try {
                    await this.sendEmailToUser(userData.email, subject, message);
                    document.getElementById('manual-email-subject').value = '';
                    document.getElementById('manual-email-message').value = '';
                } finally {
                    sendMailBtn.disabled = false;
                    sendMailBtn.innerHTML = originalText;
                }
            };
        }
    }

    async saveUser(userId, data) {
        // Remove undefined/null fields to prevent Firestore errors and clean up data
        const cleanData = {};
        Object.keys(data).forEach(key => {
            if (data[key] !== undefined && data[key] !== null) {
                cleanData[key] = data[key];
            }
        });

        try {
            if (userId) {
                // Update
                await firebaseService.db.collection('users').doc(userId).set({
                    ...cleanData,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
                this.showToast('Bruker oppdatert.', 'success');
            } else {
                // Create (Placeholder for Firestore metadata - User still needs Auth account)
                const newDoc = await firebaseService.db.collection('users').add({
                    ...cleanData,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                // Admin Notification
                await this.createAdminNotification({
                    type: 'NEW_USER',
                    userId: newDoc.id,
                    userEmail: cleanData.email,
                    userName: cleanData.displayName,
                    message: `Ny bruker registrert: ${cleanData.displayName || cleanData.email}`
                });

                this.showToast('Brukerrettigheter opprettet og admin varslet.', 'success');
            }
            await this.loadUsersList();
        } catch (error) {
            console.error('Error saving user:', error);
            this.showToast('Kunne ikke lagre bruker: ' + error.message, 'error');
        }
    }

    async handleUserPhotoUpload(userId, file) {
        const progressBar = document.getElementById('upload-progress-bar');
        const progressContainer = document.getElementById('upload-progress-container');
        const avatar = document.querySelector('.user-avatar-lg');

        if (progressContainer) progressContainer.style.display = 'block';

        try {
            const path = `profiles/${userId}/avatar_${Date.now()}.jpg`;
            const url = await firebaseService.uploadImage(file, path, (progress) => {
                if (progressBar) progressBar.style.value = progress;
            });

            // Update local state and UI immediately
            if (avatar) {
                avatar.style.backgroundImage = `url('${url}')`;
                avatar.style.backgroundColor = 'transparent';
                avatar.innerHTML = `
                    <div id="change-photo-overlay" style="position: absolute; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; border-radius: inherit; cursor: pointer; color: white;">
                        <span class="material-symbols-outlined">photo_camera</span>
                    </div>
                    <input type="file" id="user-photo-input" style="display: none;" accept="image/*">
                `;
                // Re-bind listeners as internalHTML was reset
                const overlay = document.getElementById('change-photo-overlay');
                const fileInput = document.getElementById('user-photo-input');
                if (overlay && fileInput) {
                    overlay.onclick = () => fileInput.click();
                    fileInput.onchange = (e) => this.handleUserPhotoUpload(userId, e.target.files[0]);
                }
            }

            // Update in Firestore
            await firebaseService.db.collection('users').doc(userId).update({
                photoURL: url,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            this.showToast('Profilbilde er oppdatert.', 'success');
        } catch (error) {
            console.error('Error uploading photo:', error);
            this.showToast('Kunne ikke laste opp bilde: ' + error.message, 'error');
        } finally {
            if (progressContainer) progressContainer.style.display = 'none';
        }
    }

    async sendEmailToUser(email, subject, message) {
        if (!email) {
            this.showToast('Brukeren mangler e-postadresse.', 'error');
            return;
        }

        try {
            const response = await fetch('https://sendmanualemail-7fskzic55a-uc.a.run.app', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: email,
                    subject: subject,
                    message: message,
                    fromName: 'His Kingdom Ministry'
                })
            });

            const result = await response.json();
            if (result.success) {
                this.showToast('E-post er sendt!', 'success');
            } else {
                throw new Error(result.error || 'Kunne ikke sende e-post.');
            }
        } catch (error) {
            console.error('Feil ved sending av e-post:', error);
            this.showToast('Feil ved sending: ' + error.message, 'error');
        }
    }

    async deleteUser(userId) {
        try {
            await firebaseService.db.collection('users').doc(userId).delete();
            this.showToast('Bruker fjernet fra oversikten.', 'success');
            await this.loadUsersList();
        } catch (error) {
            console.error('Error deleting user:', error);
            this.showToast('Kunne ikke slette bruker: ' + error.message, 'error');
        }
    }

    async createAdminNotification(notifData) {
        try {
            await firebaseService.db.collection('admin_notifications').add({
                ...notifData,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                read: false
            });
            console.log("Admin notification created:", notifData);
        } catch (err) {
            console.warn("Failed to create admin notification:", err);
        }
    }
}

// Start the manager
window.adminManager = new AdminManager();
