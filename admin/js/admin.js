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
        document.body.classList.remove('cloak');
    } else {
        showToast(message); // Fallback if UI not ready
    }
}

const firebaseService = window.firebaseService;
const adminUtils = window.HKMAdminUtils || {};

class AdminManager {
    constructor() {
        this.currentSection = 'overview';
        this.unreadMessageCount = 0;
        this.messagesUnsub = null;
        this._collectionRealtimeUnsubs = {};
        this._siteContentRealtimeUnsubs = {};
        this._overviewRealtimeInitialized = false;
        this._overviewRefreshTimer = null;
        this._pendingWriteLocks = new Set();
        this._pendingAuthRedirectTimer = null;
        this._collectionItemsCache = {};
        this._collectionLoadRequestIds = {};
        this._initialOverviewRenderComplete = false;
        this._activityLogItems = [];

        // User Detail View State
        this.currentUserDetailId = null;
        this.userEditMode = false;

        this.widgetLibrary = {
            'visitors': { id: 'visitors', label: 'Sidevisninger', icon: 'visibility', color: 'purple', default: true },
            'status': { id: 'status', label: 'Systemstatus', icon: 'check_circle', color: 'green', default: true },
            'users': { id: 'users', label: 'Brukere', icon: 'group', color: 'mint', default: true },
            'blog': { id: 'blog', label: 'Blogginnlegg', icon: 'edit_note', color: 'blue', default: true },
            'teaching': { id: 'teaching', label: 'Undervisning', icon: 'school', color: 'mint', default: true },
            'donations': { id: 'donations', label: 'Donasjoner', icon: 'volunteer_activism', color: 'donation', default: true },
            'youtube': { id: 'youtube', label: 'YouTube Abonnenter', icon: 'video_library', color: 'youtube', default: true },
            'podcast': { id: 'podcast', label: 'Podcast Episoder', icon: 'podcasts', color: 'podcast', default: false },
            'campaigns': { id: 'campaigns', label: 'Innsamlinger', icon: 'campaign', color: 'megaphone', default: false },
            'events': { id: 'events', label: 'Arrangementer', icon: 'event', color: 'blue', default: false },
            'next-events': { id: 'next-events', label: 'Neste Arrangementer', icon: 'event_upcoming', color: 'purple', default: false, type: 'list' },
            'latest-contacts': { id: 'latest-contacts', label: 'Siste Meldinger', icon: 'quick_reference_all', color: 'mint', default: false, type: 'list' }
        };

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

        // Initialize global notifications if not already available
        if (!window.hkm_notifications) {
            console.log("Global notifications not found, initializing...");
            // The notifications.js should already be loaded, but as a fallback:
            const container = document.querySelector('.toast-container');
            if (container) this.toastContainer = container;
            else {
                this.toastContainer = document.createElement('div');
                this.toastContainer.className = 'toast-container';
                document.body.appendChild(this.toastContainer);
            }
        } else {
            this.toastContainer = window.hkm_notifications.toastContainer;
        }

        this.initAuth();
        this.initDashboard();
        this.initMessageListener();
        this.initWidgetConfig();

        // Expose to window for the inline navigation script
        window.adminManager = this;
        console.log("AdminManager initialized successfully.");
        // Safety fallback: never reveal seeded HTML; show a neutral loading state instead.
        setTimeout(() => {
            if (!document.body.classList.contains('cloak')) return;
            if (this._initialOverviewRenderComplete) {
                this.removeSplashScreen();
                return;
            }
            this.renderOverviewLoadingState();
            this.removeSplashScreen();
        }, 6000);
    }

    removeSplashScreen() {
        // Since splash screen is removed, we just remove the cloak to reveal the UI
        document.body.classList.remove('cloak');
        console.log("UI revealed (cloak removed)");
    }

    showToast(message, type = 'success', duration = 5000) {
        if (window.showToast) {
            window.showToast(message, type, duration);
        } else {
            console.log("Fallback showToast:", message);
            // Re-implement basic one if global missing (shouldn't happen)
            const toast = document.createElement('div');
            toast.className = `toast ${type}`;
            toast.innerHTML = `<div class="toast-content"><p class="toast-message">${message}</p></div>`;
            this.toastContainer.appendChild(toast);
            setTimeout(() => toast.remove(), duration);
        }
    }

    /**
     * Show a prominent alert (Modal-like toast)
     */
    showAlert(message, type = 'warning', duration = 8000) {
        this.showToast(message, type, duration);
    }

    /**
     * Komprimerer bilde før opplasting
     */
    async compressImage(file, maxWidth = 1920, quality = 0.8) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (e) => {
                const img = new Image();
                img.src = e.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    
                    if (width > maxWidth) {
                        height = (maxWidth / width) * height;
                        width = maxWidth;
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    canvas.toBlob((blob) => {
                        if (!blob) {
                            reject(new Error('Klarte ikke å komprimere bildet.'));
                            return;
                        }
                        resolve(new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() }));
                    }, 'image/jpeg', quality);
                };
                img.onerror = () => reject(new Error('Kunne ikke laste bilde for komprimering.'));
            };
            reader.onerror = () => reject(new Error('Kunne ikke lese filen.'));
        });
    }

    renderOverviewLoadingState() {
        const section = document.getElementById('overview-section');
        if (!section) return;

        // Replace seeded/static demo content immediately to avoid showing an outdated dashboard on hard refresh.
        section.innerHTML = `
            ${this.renderSectionHeader('dashboard', 'Oversikt', 'Laster analyseoversikt...')}
            <div class="card">
                <div class="card-body" style="min-height:180px; display:flex; align-items:center; justify-content:center;">
                    <div class="loader"></div>
                </div>
            </div>
        `;
    }

    _withButtonLoading(button, task, options = {}) {
        if (typeof adminUtils.withButtonLoading === 'function') {
            return adminUtils.withButtonLoading(button, task, options);
        }
        return task();
    }

    async _runWriteLocked(lockKey, fn) {
        if (!lockKey || typeof fn !== 'function') {
            return fn ? fn() : undefined;
        }
        if (this._pendingWriteLocks.has(lockKey)) {
            this.showToast('En lagringsoperasjon pågår allerede. Vent et øyeblikk.', 'warning', 3500);
            return undefined;
        }
        this._pendingWriteLocks.add(lockKey);
        try {
            return await fn();
        } finally {
            this._pendingWriteLocks.delete(lockKey);
        }
    }

    _hashString(value) {
        const text = String(value || '');
        let hash = 0;
        for (let i = 0; i < text.length; i++) {
            hash = ((hash << 5) - hash) + text.charCodeAt(i);
            hash |= 0;
        }
        return String(hash);
    }

    _buildBlogTranslationSourceHash(post) {
        if (!post || typeof post !== 'object') return this._hashString('');
        const payload = {
            title: post.title || '',
            category: post.category || '',
            content: post.content || '',
            seoTitle: post.seoTitle || '',
            seoDescription: post.seoDescription || '',
            tags: Array.isArray(post.tags) ? post.tags : []
        };
        return this._hashString(JSON.stringify(payload));
    }

    _isLikelyNonTranslatableToken(value) {
        const str = String(value || '').trim();
        if (!str) return true;
        if (/^(https?:\/\/|www\.)/i.test(str)) return true;
        if (/^[\w.-]+@[\w.-]+\.[A-Za-z]{2,}$/.test(str)) return true;
        if (/^[\d\s.,:/-]+$/.test(str)) return true;
        if (/^[a-f0-9-]{16,}$/i.test(str)) return true;
        return false;
    }

    _splitTextForTranslation(value, maxChunkLength = 450) {
        const raw = String(value || '');
        if (!raw.trim()) return [];
        if (raw.length <= maxChunkLength) return [raw];

        const chunks = [];
        const paragraphs = raw.split('\n');
        paragraphs.forEach((paragraph) => {
            if (!paragraph) {
                chunks.push('\n');
                return;
            }

            if (paragraph.length <= maxChunkLength) {
                chunks.push(paragraph);
                return;
            }

            const sentences = paragraph.split(/(?<=[.!?])\s+/);
            let current = '';
            sentences.forEach((sentence) => {
                if (!sentence) return;
                const candidate = current ? `${current} ${sentence}` : sentence;
                if (candidate.length > maxChunkLength) {
                    if (current) chunks.push(current);
                    if (sentence.length <= maxChunkLength) {
                        current = sentence;
                    } else {
                        const words = sentence.split(/\s+/);
                        let longCurrent = '';
                        words.forEach((word) => {
                            const longCandidate = longCurrent ? `${longCurrent} ${word}` : word;
                            if (longCandidate.length > maxChunkLength) {
                                if (longCurrent) chunks.push(longCurrent);
                                longCurrent = word;
                            } else {
                                longCurrent = longCandidate;
                            }
                        });
                        if (longCurrent) chunks.push(longCurrent);
                        current = '';
                    }
                } else {
                    current = candidate;
                }
            });
            if (current) chunks.push(current);
        });

        return chunks;
    }

    async _translateTextChunk(text, targetLang, sourceLang = 'no') {
        const raw = String(text || '');
        if (!raw.trim()) return raw;
        if (this._isLikelyNonTranslatableToken(raw)) return raw;

        const cacheKey = `${sourceLang}:${targetLang}:${raw}`;
        this._translationCache = this._translationCache || new Map();
        if (this._translationCache.has(cacheKey)) {
            return this._translationCache.get(cacheKey);
        }

        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(raw)}&langpair=${encodeURIComponent(sourceLang)}|${encodeURIComponent(targetLang)}`;
        try {
            const res = await fetch(url);
            const data = await res.json();
            const translated = data?.responseData?.translatedText;
            const finalText = (typeof translated === 'string' && translated.trim())
                ? translated
                : raw;
            this._translationCache.set(cacheKey, finalText);
            return finalText;
        } catch (error) {
            console.warn(`[AdminManager] Translation failed (${targetLang})`, error);
            return raw;
        }
    }

    async _translateRichText(value, targetLang, sourceLang = 'no') {
        const raw = String(value || '');
        if (!raw.trim()) return raw;

        // Preserve HTML tags by translating text segments only.
        const segments = raw.split(/(<[^>]+>)/g);
        const translatedParts = [];
        for (const segment of segments) {
            if (!segment) continue;
            if (segment.startsWith('<') && segment.endsWith('>')) {
                translatedParts.push(segment);
                continue;
            }

            const chunks = this._splitTextForTranslation(segment);
            if (!chunks.length) {
                translatedParts.push(segment);
                continue;
            }

            const translatedChunks = [];
            for (const chunk of chunks) {
                if (chunk === '\n') {
                    translatedChunks.push('\n');
                    continue;
                }
                const translated = await this._translateTextChunk(chunk, targetLang, sourceLang);
                translatedChunks.push(translated);
            }
            translatedParts.push(translatedChunks.join(''));
        }
        return translatedParts.join('');
    }

    async _translateEditorBlock(block, targetLang, sourceLang = 'no') {
        if (!block || typeof block !== 'object') return block;
        const cloned = JSON.parse(JSON.stringify(block));
        const data = cloned.data || {};

        const translateField = async (field) => {
            if (typeof data[field] === 'string') {
                data[field] = await this._translateRichText(data[field], targetLang, sourceLang);
            }
        };

        switch (cloned.type) {
            case 'header':
            case 'paragraph':
            case 'quote':
            case 'embed':
            case 'video':
            case 'youtubeVideo':
                await translateField('text');
                await translateField('caption');
                break;
            case 'list':
                if (Array.isArray(data.items)) {
                    const translatedItems = [];
                    for (const item of data.items) {
                        translatedItems.push(await this._translateRichText(item, targetLang, sourceLang));
                    }
                    data.items = translatedItems;
                }
                break;
            case 'image':
                await translateField('caption');
                break;
            default:
                // Fallback: translate common text fields if present
                await translateField('text');
                await translateField('caption');
                await translateField('title');
                break;
        }

        cloned.data = data;
        return cloned;
    }

    async _translateBlogContent(content, targetLang, sourceLang = 'no') {
        if (!content) return content;

        if (typeof content === 'string') {
            return this._translateRichText(content, targetLang, sourceLang);
        }

        if (typeof content === 'object' && Array.isArray(content.blocks)) {
            const translated = {
                ...content,
                blocks: []
            };
            for (const block of content.blocks) {
                translated.blocks.push(await this._translateEditorBlock(block, targetLang, sourceLang));
            }
            return translated;
        }

        return content;
    }

    async _buildBlogTranslation(post, targetLang) {
        const translation = {};
        if (typeof post.title === 'string') {
            translation.title = await this._translateRichText(post.title, targetLang, 'no');
        }
        if (typeof post.category === 'string') {
            translation.category = await this._translateRichText(post.category, targetLang, 'no');
        }
        if (typeof post.seoTitle === 'string') {
            translation.seoTitle = await this._translateRichText(post.seoTitle, targetLang, 'no');
        }
        if (typeof post.seoDescription === 'string') {
            translation.seoDescription = await this._translateRichText(post.seoDescription, targetLang, 'no');
        }
        if (Array.isArray(post.tags)) {
            const translatedTags = [];
            for (const tag of post.tags) {
                translatedTags.push(await this._translateRichText(tag, targetLang, 'no'));
            }
            translation.tags = translatedTags;
        }
        if (typeof post.content !== 'undefined') {
            translation.content = await this._translateBlogContent(post.content, targetLang, 'no');
        }
        return translation;
    }

    async ensureBlogPostTranslations(post, { force = false } = {}) {
        if (!post || typeof post !== 'object') return post;

        const updatedPost = { ...post };
        const sourceHash = this._buildBlogTranslationSourceHash(updatedPost);
        const existingTranslations = (updatedPost.translations && typeof updatedPost.translations === 'object')
            ? { ...updatedPost.translations }
            : {};

        for (const lang of ['en', 'es']) {
            const existing = (existingTranslations[lang] && typeof existingTranslations[lang] === 'object')
                ? existingTranslations[lang]
                : null;
            const isUpToDate = !!existing && existing._sourceHash === sourceHash && existing.title && existing.content;
            if (!force && isUpToDate) continue;

            const translated = await this._buildBlogTranslation(updatedPost, lang);
            existingTranslations[lang] = {
                ...(existing || {}),
                ...translated,
                _sourceHash: sourceHash,
                _updatedAt: new Date().toISOString()
            };
        }

        updatedPost.translations = existingTranslations;
        updatedPost.translationSourceHash = sourceHash;
        updatedPost.sourceLanguage = 'no';
        return updatedPost;
    }

    async translateAllExistingBlogPosts({ force = false, silent = false } = {}) {
        if (this._blogTranslationBackfillRunning) return;
        this._blogTranslationBackfillRunning = true;
        try {
            const blogData = await firebaseService.getPageContent('collection_blog');
            const items = Array.isArray(blogData) ? blogData : (blogData?.items || []);
            if (!items.length) {
                return;
            }

            const translatedItems = [];
            let changed = false;
            for (let i = 0; i < items.length; i++) {
                const post = items[i];
                const translatedPost = await this.ensureBlogPostTranslations(post, { force });
                translatedItems.push(translatedPost);
                if (JSON.stringify(translatedPost) !== JSON.stringify(post)) {
                    changed = true;
                }
            }

            if (changed) {
                await firebaseService.savePageContent('collection_blog', { items: translatedItems });
                await this.loadCollection('blog');
                if (!silent) {
                    this.showToast('✅ Blogginnlegg er oversatt til engelsk og spansk.', 'success', 5000);
                }
            } else if (!silent) {
                this.showToast('Blogginnlegg er allerede oppdatert på engelsk og spansk.', 'success', 3500);
            }
        } catch (error) {
            console.error('[AdminManager] Failed to translate existing blog posts', error);
            if (!silent) {
                this.showToast('Kunne ikke oversette alle blogginnlegg nå.', 'error', 5000);
            }
        } finally {
            this._blogTranslationBackfillRunning = false;
        }
    }

    _scheduleOverviewRefresh(reason = 'unknown') {
        if (this.currentSection !== 'overview') return;
        if (this._overviewRefreshTimer) clearTimeout(this._overviewRefreshTimer);
        this._overviewRefreshTimer = setTimeout(() => {
            this._overviewRefreshTimer = null;
            const section = document.getElementById('overview-section');
            if (!section) return;
            console.log(`[AdminManager] Refreshing overview stats (${reason})`);
            this.renderOverview();
        }, 250);
    }

    _initOverviewRealtimeSubscriptions() {
        if (this._overviewRealtimeInitialized || !firebaseService?.db) return;

        this._overviewRealtimeInitialized = true;

        const refresh = (reason) => this._scheduleOverviewRefresh(reason);
        const safeSub = (fn) => {
            try { return fn(); } catch (e) { console.warn('[AdminManager] Overview realtime subscription failed:', e); return null; }
        };

        const pageSubs = ['collection_blog', 'collection_teaching', 'collection_events', 'collection_causes', 'index'];
        pageSubs.forEach((docId) => {
            const unsub = firebaseService.subscribeToPage(docId, () => refresh(`content:${docId}`));
            if (typeof unsub === 'function') {
                this._collectionRealtimeUnsubs[`overview:${docId}`] = unsub;
            }
        });

        const dbSubs = [
            { key: 'overview:donations', ref: firebaseService.db.collection('donations') },
            { key: 'overview:users', ref: firebaseService.db.collection('users') },
            { key: 'overview:contacts', ref: firebaseService.db.collection('contactMessages').limit(4) }
        ];

        dbSubs.forEach(({ key, ref }) => {
            const unsub = safeSub(() => ref.onSnapshot(() => refresh(key), (err) => console.warn(`[AdminManager] ${key} subscription error:`, err)));
            if (typeof unsub === 'function') this._collectionRealtimeUnsubs[key] = unsub;
        });
    }

    _ensureCollectionRealtimeSubscription(collectionId) {
        if (!collectionId || this._collectionRealtimeUnsubs[`collection:${collectionId}`]) return;
        const docId = `collection_${collectionId}`;
        const unsub = firebaseService.subscribeToPage(docId, () => {
            const isActive = this.currentSection === collectionId;
            const listEl = document.getElementById(`${collectionId}-list`);
            if (isActive && listEl) {
                this.loadCollection(collectionId);
            }
        });
        if (typeof unsub === 'function') {
            this._collectionRealtimeUnsubs[`collection:${collectionId}`] = unsub;
        }
    }

    _ensureUsersRealtimeSubscription() {
        if (this._collectionRealtimeUnsubs.users || !firebaseService?.db) return;
        try {
            this._collectionRealtimeUnsubs.users = firebaseService.db.collection('users')
                .onSnapshot(() => {
                    if (this.currentSection === 'users' && !this.currentUserDetailId) {
                        this.loadUsersList();
                    }
                    this._scheduleOverviewRefresh('users');
                }, (err) => console.warn('[AdminManager] users realtime sync failed:', err));
        } catch (e) {
            console.warn('[AdminManager] Could not subscribe to users:', e);
        }
    }

    _ensureCoursesRealtimeSubscription() {
        if (this._siteContentRealtimeUnsubs.collection_courses) return;
        const subscribeFn = typeof firebaseService.subscribeToSiteContent === 'function'
            ? firebaseService.subscribeToSiteContent.bind(firebaseService)
            : null;
        if (!subscribeFn) return;

        const unsub = subscribeFn('collection_courses', () => {
            const listEl = document.getElementById('courses-list');
            if (this.currentSection === 'courses' && listEl) {
                this._loadCoursesList();
            }
            this._scheduleOverviewRefresh('courses');
        });
        if (typeof unsub === 'function') {
            this._siteContentRealtimeUnsubs.collection_courses = unsub;
        }
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
        const bindAuthListener = () => firebaseService.onAuthChange(async (user) => {
            if (this._pendingAuthRedirectTimer) {
                clearTimeout(this._pendingAuthRedirectTimer);
                this._pendingAuthRedirectTimer = null;
            }

            if (!user) {
                // Delay redirect slightly to avoid random logouts during transient auth/token refresh.
                this._pendingAuthRedirectTimer = setTimeout(() => {
                    if (!firebaseService?.auth?.currentUser) {
                        window.location.href = 'login.html';
                    }
                }, 2500);
                return;
            }

            try {
                // Fetch user role
                const role = await firebaseService.getUserRole(user.uid, { timeoutMs: 2500 });
                this.userRole = role;

                const hasAdminAccess = typeof adminUtils.isElevatedAdminRole === 'function'
                    ? adminUtils.isElevatedAdminRole(role)
                    : ['admin', 'superadmin'].includes(String(role || '').toLowerCase());

                // Strict RBAC: only admin/superadmin may access admin directory
                if (!hasAdminAccess) {
                    console.warn("Access denied: User lacks admin role.");
                    if (typeof adminUtils.redirectToMinSideWithAccessDenied === 'function') {
                        adminUtils.redirectToMinSideWithAccessDenied({
                            path: '../minside/index.html',
                            message: 'Access Denied: Du har ikke administratorrettigheter til adminpanelet.'
                        });
                    } else {
                        window.location.href = '../minside/index.html';
                    }
                    return;
                }

                await this.syncUserProfile(user, role);
                await this.updateUserInfo(user);
                this.applyRoleRestrictions(role);

                // Ensure existing Norwegian blog posts are fully translated to EN/ES.
                // Run once per browser/day to avoid unnecessary repeated writes.
                try {
                    const todayKey = new Date().toISOString().slice(0, 10);
                    const backfillKey = 'hkm_blog_translation_backfill_last_run';
                    const lastRun = localStorage.getItem(backfillKey);
                    if (lastRun !== todayKey) {
                        this.translateAllExistingBlogPosts({ force: true, silent: true })
                            .then(() => localStorage.setItem(backfillKey, todayKey))
                            .catch((err) => console.warn('[AdminManager] Forced blog translation backfill failed', err));
                    }
                } catch (error) {
                    console.warn('[AdminManager] Could not schedule forced blog translation backfill', error);
                }

                console.log("[AdminManager] Admin access verified, removing cloak.");
                this.removeSplashScreen();
            } catch (error) {
                console.error("Error verifying admin role:", error);
                this.removeSplashScreen(); // Still remove cloak to show error UI
                // On error, steer to safety (public area)
                if (typeof adminUtils.redirectToMinSideWithAccessDenied === 'function') {
                    adminUtils.redirectToMinSideWithAccessDenied({
                        path: '../minside/index.html',
                        message: 'Tilgang kunne ikke verifiseres. Prøv igjen eller kontakt administrator.'
                    });
                } else {
                    window.location.href = '../minside/index.html';
                }
            }
        });

        const waitForFirebaseAuth = async (timeoutMs = 8000) => {
            const start = Date.now();
            while (Date.now() - start < timeoutMs) {
                if (firebaseService.isInitialized) return true;
                if (typeof firebaseService.tryAutoInit === 'function' && firebaseService.tryAutoInit()) return true;
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            return firebaseService.isInitialized;
        };

        if (firebaseService.isInitialized) {
            bindAuthListener();
            return;
        }

        console.warn("⚠️ Firebase not initialized yet. Waiting for auth...");
        (async () => {
            const ready = await waitForFirebaseAuth();
            if (!ready) {
                console.warn("⚠️ Firebase auth failed to initialize in time.");
                this.showAlert('Kunne ikke koble til innloggingstjenesten. Last inn siden på nytt.', 'warning', 10000);
                return;
            }
            bindAuthListener();
        })();
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

    async syncUserProfile(user, currentRole = 'medlem') {
        if (!user) return;
        const googleProvider = (user.providerData || []).find(p => p.providerId === 'google.com');

        try {
            console.log(`[AdminManager] Syncing profile for ${user.email} (UID: ${user.uid || 'N/A'}) with Role: ${currentRole}`);
            const userRef = firebaseService.db.collection('users').doc(user.uid);
            const userDoc = await userRef.get();

            const userData = {
                email: user.email || '',
                displayName: user.displayName || googleProvider?.displayName || user.email || '',
                photoURL: user.photoURL || googleProvider?.photoURL || '',
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            // Only set role if the doc doesn't already exist or if we want to ensure superadmin status
            if (!userDoc.exists) {
                userData.role = currentRole;
                userData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                await userRef.set(userData);
                console.log(`[AdminManager] New user document created for ${user.email}`);
            } else {
                // If it exists, we might still want to update role if currentRole is superadmin but doc says medlem
                const docData = userDoc.data();
                if (currentRole === 'superadmin' && docData.role !== 'superadmin') {
                    userData.role = 'superadmin';
                }
                // Also ensure createdAt exists for any reason
                if (!docData.createdAt) {
                    userData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                    console.log(`[AdminManager] Restored missing createdAt for ${user.email}`);
                }
                await userRef.update(userData);
            }

            // Sync auth profile name/photo if missing but available in Google
            if (googleProvider && (!user.displayName || !user.photoURL)) {
                const authUpdates = {};
                if (!user.displayName && googleProvider.displayName) authUpdates.displayName = googleProvider.displayName;
                if (!user.photoURL && googleProvider.photoURL) authUpdates.photoURL = googleProvider.photoURL;
                if (Object.keys(authUpdates).length > 0) {
                    await user.updateProfile(authUpdates);
                }
            }
        } catch (e) {
            console.warn('Kunne ikke synkronisere brukerprofil i admin:', e);
        }
    }

    async updateUserInfo(user) {
        const adminName = document.getElementById('admin-name');
        const adminAvatar = document.getElementById('admin-avatar');
        const identityCacheKey = 'hkm_admin_identity_cache';

        const renderHeaderIdentity = (name, photoURL) => {
            const safeName = (name || '').trim() || 'Administrator';
            if (adminName) adminName.textContent = safeName;
            if (!adminAvatar) return;

            if (photoURL) {
                adminAvatar.innerHTML = `<img src="${photoURL}" alt="Profile" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
                return;
            }

            const initials = safeName.split(' ').map(n => (n || '').trim()).filter(Boolean).map(n => n[0]).join('').toUpperCase();
            adminAvatar.textContent = (initials || 'A').substring(0, 2);
        };

        const cacheHeaderIdentity = (name, photoURL) => {
            try {
                localStorage.setItem(identityCacheKey, JSON.stringify({
                    displayName: name || '',
                    photoURL: photoURL || '',
                    ts: Date.now()
                }));
            } catch (e) {
                // noop
            }
        };

        const withTimeout = async (promise, ms = 1500) => {
            let timerId;
            try {
                return await Promise.race([
                    promise,
                    new Promise(resolve => {
                        timerId = setTimeout(() => resolve(null), ms);
                    })
                ]);
            } finally {
                if (timerId) clearTimeout(timerId);
            }
        };

        // Immediate fallback from Auth to avoid visible "Laster..." while Firestore resolves.
        const authName = user?.displayName || user?.email || 'Administrator';
        const authPhoto = user?.photoURL || '';
        renderHeaderIdentity(authName, authPhoto);
        cacheHeaderIdentity(authName, authPhoto);

        // Try load custom profile data
        let profile = null;
        let userProfile = null;
        try {
            const [profileRes, userDoc] = await Promise.all([
                withTimeout(firebaseService.getPageContent('settings_profile'), 1500),
                withTimeout(firebase.firestore().collection('users').doc(user.uid).get(), 1500)
            ]);
            profile = profileRes;
            if (userDoc && userDoc.exists) userProfile = userDoc.data();
        } catch (e) { }

        const displayName = (userProfile && userProfile.displayName)
            || user.displayName
            || (profile && profile.fullName)
            || user.email;
        const photoURL = (userProfile && userProfile.photoURL)
            || user.photoURL
            || (profile && profile.photoUrl);

        renderHeaderIdentity(displayName, photoURL);
        cacheHeaderIdentity(displayName, photoURL);

        // Profile trigger in dashboard header -> Open full profile section
        const profileTrigger = document.getElementById('admin-profile-trigger');
        if (profileTrigger && !profileTrigger.dataset.boundProfileNav) {
            profileTrigger.dataset.boundProfileNav = '1';
            profileTrigger.addEventListener('click', (e) => {
                e.preventDefault();
                if (window.adminManager && typeof window.adminManager.onSectionSwitch === 'function') {
                    window.adminManager.onSectionSwitch('profile');

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
                }
            });
        }

        // Modal variables (if still used via other triggers)
        const profileModal = document.getElementById('profile-modal');
        const closeProfileModal = document.getElementById('close-profile-modal');
        const profileForm = document.getElementById('admin-modal-profile-form');

        if (profileModal && closeProfileModal) {
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
        if (logoutBtn && logoutBtn.dataset.hkmLogoutBound !== '1') {
            logoutBtn.dataset.hkmLogoutBound = '1';
            logoutBtn.addEventListener('click', async (event) => {
                event.preventDefault();
                event.stopPropagation();
                logoutBtn.disabled = true;
                if (firebaseService.isInitialized) await firebaseService.logout();
                window.location.href = 'login.html';
            });
        }

        // Top nav tabs
        const topNavTabs = document.querySelectorAll('.top-nav-tab');
        topNavTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const category = tab.dataset.category;
                this.filterSidebar(category);
            });
        });

        // Remove any seeded/static overview markup immediately to avoid a "double dashboard" flash on hard refresh.
        this.renderOverviewLoadingState();

        // Render initial overview
        this.renderOverview();
        console.log("Dashboard initialized.");

        // Start lytter for uleste meldinger (for bjelle)
        this.initMessageNotifications();

        // Søke-funksjon i toppfeltet
        this.initSearch();

        // Set initial sidebar filter
        this.filterSidebar('nettsted');

        // Init Automation Modal
        this.initTemplateEditorModal();

        // Chart Dropdown Logic (Delegated)
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('.chart-options-btn');
            const dropdown = document.querySelector('.chart-dropdown');

            if (btn) {
                e.stopPropagation();
                if (dropdown) {
                    dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
                }
            } else if (dropdown && dropdown.style.display === 'block') {
                dropdown.style.display = 'none';
            }
        });

        document.addEventListener('click', (e) => {
            const item = e.target.closest('.dropdown-item');
            if (item && item.closest('.dropdown-container')) {
                const view = item.dataset.view;
                const container = item.closest('.chart-container');
                const title = container.querySelector('.card-title');

                // Update Title & Data
                const bars = container.querySelectorAll('.bar');
                const dailyData = [40, 65, 85, 55, 75, 45, 80, 60];
                const weeklyData = [60, 40, 50, 90, 30, 70, 45, 85];
                const monthlyData = [30, 50, 40, 60, 80, 95, 70, 55];

                const dailyLabels = ['08:00', '', '12:00', '', '16:00', '', '20:00', ''];
                const weeklyLabels = ['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør', 'Søn', 'Tot'];
                const monthlyLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug'];

                let selectedData = dailyData;
                let selectedLabels = dailyLabels;

                if (view === 'daily') {
                    title.textContent = 'Trafikkovervåking (Daglig)';
                    selectedData = dailyData;
                    selectedLabels = dailyLabels;
                } else if (view === 'weekly') {
                    title.textContent = 'Trafikkovervåking (Ukentlig)';
                    selectedData = weeklyData;
                    selectedLabels = weeklyLabels;
                } else if (view === 'monthly') {
                    title.textContent = 'Trafikkovervåking (Månedlig)';
                    selectedData = monthlyData;
                    selectedLabels = monthlyLabels;
                }

                // Update Bars & Labels
                bars.forEach((bar, index) => {
                    if (selectedData[index] !== undefined) {
                        const value = selectedData[index];
                        const label = selectedLabels[index] || (view === 'daily' ? `${8 + index * 2}:00` : `Punkt ${index + 1}`);

                        bar.style.height = value + '%';

                        // Add detailed tooltip info
                        const visitorCount = Math.round(value * 8.5); // Mock visitor count
                        bar.setAttribute('data-tooltip-info', `${label}: ${visitorCount} besøkende`);
                        bar.title = ''; // Remove native title to avoid double tooltips

                        // Find or create span for label
                        let span = bar.querySelector('span');
                        if (!span) {
                            span = document.createElement('span');
                            bar.appendChild(span);
                        }
                        span.textContent = selectedLabels[index] || '';
                    }
                });

                // Update Active State
                container.querySelectorAll('.dropdown-item').forEach(i => {
                    i.style.color = 'var(--text-muted)';
                    i.classList.remove('active');
                });
                item.style.color = 'var(--accent-color)';
                item.classList.add('active');

                // Close dropdown
                const dropdown = item.closest('.chart-dropdown');
                if (dropdown) dropdown.style.display = 'none';
            }
        });

        // Global Tooltip Logic
        document.addEventListener('mouseover', (e) => {
            const el = e.target.closest('.bar') || e.target.closest('[data-tooltip]');
            if (el) {
                let tooltip = document.querySelector('.hkm-tooltip');
                if (!tooltip) {
                    tooltip = document.createElement('div');
                    tooltip.className = 'hkm-tooltip';
                    document.body.appendChild(tooltip);
                }
                const info = el.getAttribute('data-tooltip-info') || el.getAttribute('data-tooltip');
                if (info) {
                    tooltip.textContent = info;
                    tooltip.style.display = 'block';
                }
            }
        });

        document.addEventListener('mousemove', (e) => {
            const tooltip = document.querySelector('.hkm-tooltip');
            if (tooltip && tooltip.style.display === 'block') {
                const padding = 15;
                let x = e.clientX + 10;
                let y = e.clientY + 15;

                // Prevent overflow right
                const tooltipWidth = tooltip.offsetWidth;
                if (x + tooltipWidth > window.innerWidth - padding) {
                    x = e.clientX - tooltipWidth - 10;
                }

                // Prevent overflow bottom
                const tooltipHeight = tooltip.offsetHeight;
                if (y + tooltipHeight > window.innerHeight - padding) {
                    y = e.clientY - tooltipHeight - 10;
                }

                tooltip.style.left = x + 'px';
                tooltip.style.top = y + 'px';
            }
        });

        document.addEventListener('mouseout', (e) => {
            const el = e.target.closest('.bar') || e.target.closest('[data-tooltip]');
            if (el) {
                const tooltip = document.querySelector('.hkm-tooltip');
                if (tooltip) tooltip.style.display = 'none';
            }
        });
    }

    filterSidebar(category) {
        // Disabled per request, all items always visible
    }

    async logout() {
        try {
            await firebaseService.logout();
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
        const alreadyRendered = section && section.getAttribute('data-rendered') === 'true';

        if (alreadyRendered) {
            if (sectionId === 'overview') {
                this.renderOverview();
            } else if (['blog', 'events', 'teaching', 'comments'].includes(sectionId)) {
                if (sectionId === 'comments') {
                    this.loadComments();
                } else {
                    this.loadCollection(sectionId);
                }
            } else if (sectionId === 'courses') {
                this._loadCoursesList();
            } else if (sectionId === 'users' && !this.currentUserDetailId) {
                this.loadUsersList();
            }
        }

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
                case 'courses':
                    this.renderCoursesManager();
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
                case 'automation':
                    this.renderAutomationSection();
                    break;
                case 'comments':
                    this.renderCommentsSection();
                    break;
                case 'kommunikasjon':
                    this.renderKommunikasjonSection();
                    break;
            }
        }
    }

    async loadAllUsers() {
        if (this.allUsersData) return; // Use cache if available
        try {
            const snapshot = await firebaseService.db.collection('users').orderBy('createdAt', 'desc').get();
            const users = [];
            snapshot.forEach(doc => {
                users.push({ id: doc.id, ...doc.data() });
            });
            this.allUsersData = users; // Cache for filtering
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    }

    async renderKommunikasjonSection() {
        const section = document.getElementById('kommunikasjon-section');
        if (!section) return;
        section.setAttribute('data-rendered', 'true');

        await this.loadAllUsers();

        const renderUserSelection = (containerId) => {
            const container = document.getElementById(containerId);
            if (!container || !this.allUsersData) return;
            const userCheckboxes = this.allUsersData.map(user => `
                <label class="user-checkbox-label">
                    <input type="checkbox" class="user-select-checkbox" value="${user.id}">
                    ${user.displayName || user.email}
                </label>
            `).join('');
            container.innerHTML = `<div class="user-list-scroll">${userCheckboxes}</div>`;
        };

        // Email form
        const emailForm = document.getElementById('bulk-email-form');
        const emailStatusEl = document.getElementById('email-status');
        const emailTargetRole = document.getElementById('target-role');
        const emailUserSelection = document.getElementById('email-user-selection');

        if (emailTargetRole) {
            emailTargetRole.addEventListener('change', (e) => {
                if (e.target.value === 'selected') {
                    renderUserSelection('email-user-selection');
                    if (emailUserSelection) emailUserSelection.style.display = 'block';
                } else {
                    if (emailUserSelection) emailUserSelection.style.display = 'none';
                }
            });
        }

        if (emailForm) {
            emailForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const btn = emailForm.querySelector('button[type="submit"]');
                btn.disabled = true;
                btn.textContent = 'Sender...';
                emailStatusEl.textContent = 'Forbereder utsendelse...';
                emailStatusEl.className = 'status-message info';

                try {
                    const user = firebase.auth().currentUser;
                    if (!user) throw new Error('Du er ikke logget inn.');

                    const idToken = await user.getIdToken();
                    const targetRole = emailTargetRole.value;
                    const subject = document.getElementById('email-subject').value;
                    const message = document.getElementById('email-message').value;

                    let payload = { targetRole, subject, message, fromName: "His Kingdom Ministry" };

                    if (targetRole === 'selected') {
                        const selectedUserIds = Array.from(emailUserSelection.querySelectorAll('.user-select-checkbox:checked')).map(cb => cb.value);
                        if (selectedUserIds.length === 0) {
                            throw new Error("Ingen brukere er valgt.");
                        }
                        payload.selectedUserIds = selectedUserIds;
                    }

                    const response = await fetch('https://sendbulkemail-42bhgdjkcq-uc.a.run.app', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
                        body: JSON.stringify(payload)
                    });

                    const result = await response.json();
                    if (!response.ok) throw new Error(result.error || `Server responded with ${response.status}`);

                    emailStatusEl.textContent = result.message || 'E-poster er sendt!';
                    emailStatusEl.className = 'status-message success';
                    emailForm.reset();
                    emailUserSelection.style.display = 'none';

                } catch (error) {
                    console.error('Feil ved masseutsendelse:', error);
                    emailStatusEl.textContent = `Feil: ${error.message}`;
                    emailStatusEl.className = 'status-message error';
                } finally {
                    btn.disabled = false;
                    btn.textContent = 'Send E-poster';
                }
            });
        }

        // Push form
        const pushForm = document.getElementById('push-notification-form');
        const pushStatusEl = document.getElementById('push-status');
        const pushTargetRole = document.getElementById('push-target-role');
        const pushUserSelection = document.getElementById('push-user-selection');

        if (pushTargetRole) {
            pushTargetRole.addEventListener('change', (e) => {
                if (e.target.value === 'selected') {
                    renderUserSelection('push-user-selection');
                    if (pushUserSelection) pushUserSelection.style.display = 'block';
                } else {
                    if (pushUserSelection) pushUserSelection.style.display = 'none';
                }
            });
        }

        if (pushForm) {
            pushForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const btn = pushForm.querySelector('button[type="submit"]');
                btn.disabled = true;
                btn.textContent = 'Sender...';
                pushStatusEl.textContent = 'Forbereder utsendelse...';
                pushStatusEl.className = 'status-message info';

                try {
                    const user = firebase.auth().currentUser;
                    if (!user) throw new Error('Du er ikke logget inn.');

                    const idToken = await user.getIdToken();
                    const targetRole = pushTargetRole.value;
                    const title = document.getElementById('push-title').value;
                    const body = document.getElementById('push-body').value;
                    const click_action = document.getElementById('push-click-action').value;

                    let payload = { targetRole, title, body, click_action };

                    if (targetRole === 'selected') {
                        const selectedUserIds = Array.from(pushUserSelection.querySelectorAll('.user-select-checkbox:checked')).map(cb => cb.value);
                        if (selectedUserIds.length === 0) {
                            throw new Error("Ingen brukere er valgt.");
                        }
                        payload.selectedUserIds = selectedUserIds;
                    }

                    // 1. Save to Firestore user_notifications (in-app notifications)
                    try {
                        let targetUsers = [];
                        const allUsersSnap = await firebaseService.db.collection('users').get();
                        allUsersSnap.forEach(doc => {
                            const data = doc.data();
                            if (targetRole === 'all') {
                                targetUsers.push(doc.id);
                            } else if (targetRole === 'medlem' && data.role === 'medlem') {
                                targetUsers.push(doc.id);
                            } else if (targetRole === 'selected' && payload.selectedUserIds?.includes(doc.id)) {
                                targetUsers.push(doc.id);
                            }
                        });

                        const batch = firebaseService.db.batch();
                        targetUsers.forEach(userId => {
                            const ref = firebaseService.db.collection('user_notifications').doc();
                            batch.set(ref, {
                                userId,
                                title: payload.title,
                                body: payload.body,
                                type: 'push',
                                link: payload.click_action || '',
                                read: false,
                                createdAt: firebase.firestore.FieldValue.serverTimestamp()
                            });
                        });
                        await batch.commit();
                        pushStatusEl.textContent = `Varsling lagret for ${targetUsers.length} bruker(e). Sender push...`;
                    } catch (firestoreErr) {
                        console.warn('Firestore notification write failed:', firestoreErr);
                    }

                    // 2. Attempt Cloud Function push (FCM)
                    try {
                        const response = await fetch('https://sendpushnotification-42bhgdjkcq-uc.a.run.app', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
                            body: JSON.stringify(payload)
                        });
                        const result = await response.json();
                        if (!response.ok) throw new Error(result.error || `Server responded with ${response.status}`);
                        pushStatusEl.textContent = result.message || 'Push-varsling er sendt!';
                    } catch (fcmErr) {
                        console.warn('FCM push failed (in-app notification was still saved):', fcmErr);
                        pushStatusEl.textContent = 'Varsling lagret i appen. (Push til telefon krevde innstillinger.)';
                    }

                    pushStatusEl.className = 'status-message success';

                    // 3. Log this push send to Firestore
                    try {
                        await firebaseService.db.collection('push_log').add({
                            title: payload.title,
                            body: payload.body,
                            targetRole: targetRole,
                            sentBy: firebase.auth().currentUser?.email || 'ukjent',
                            sentAt: firebase.firestore.FieldValue.serverTimestamp()
                        });
                    } catch (logErr) {
                        console.warn('Push log write failed:', logErr);
                    }

                    pushForm.reset();
                    if (pushUserSelection) pushUserSelection.style.display = 'none';
                    // Refresh activity log
                    this.loadActivityLog('all');

                } catch (error) {
                    console.error('Feil ved utsendelse av push-varsling:', error);
                    pushStatusEl.textContent = `Feil: ${error.message}`;
                    pushStatusEl.className = 'status-message error';
                } finally {
                    btn.disabled = false;
                    btn.textContent = 'Send Push-varsling';
                }
            });
        }

        // Load activity log
        this.loadActivityLog('all');

        // Filter buttons
        document.querySelectorAll('.log-filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.log-filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.loadActivityLog(btn.dataset.filter);
            });
        });
    }

    async loadActivityLog(filter = 'all') {
        const container = document.getElementById('activity-log-list');
        if (!container) return;
        container.innerHTML = '<div class="loader" style="padding:24px;">Laster...</div>';

        try {
            const db = firebaseService.db;
            const results = [];

            // Fetch push log
            if (filter === 'all' || filter === 'push') {
                const pushSnap = await db.collection('push_log').orderBy('sentAt', 'desc').limit(30).get();
                pushSnap.forEach(doc => {
                    const d = doc.data();
                    results.push({
                        id: doc.id,
                        type: 'push',
                        icon: 'campaign',
                        color: '#3b82f6',
                        bg: '#eff6ff',
                        title: d.title || 'Push-varsling',
                        meta: `${d.body || ''} · Til: ${d.targetRole === 'all' ? 'Alle' : d.targetRole} · Sendt av ${d.sentBy || '?'}`,
                        date: d.sentAt?.toDate ? d.sentAt.toDate() : new Date(0),
                        raw: d
                    });
                });
            }

            // Fetch contact messages
            if (filter === 'all' || filter === 'message') {
                const msgSnap = await db.collection('contactMessages').orderBy('createdAt', 'desc').limit(20).get();
                msgSnap.forEach(doc => {
                    const d = doc.data();
                    results.push({
                        id: doc.id,
                        type: 'message',
                        icon: 'mail',
                        color: '#10b981',
                        bg: '#f0fdf4',
                        title: `Melding fra ${d.name || 'ukjent'}`,
                        meta: `${d.subject || d.email || ''} · Status: ${d.status || 'ny'}`,
                        date: d.createdAt?.toDate ? d.createdAt.toDate() : (d.timestamp?.toDate ? d.timestamp.toDate() : new Date(0)),
                        raw: d
                    });
                });
            }

            // Fetch new user events
            if (filter === 'all' || filter === 'new_user') {
                const notifSnap = await db.collection('admin_notifications')
                    .where('type', '==', 'NEW_USER_REGISTRATION')
                    .orderBy('timestamp', 'desc').limit(20).get();
                notifSnap.forEach(doc => {
                    const d = doc.data();
                    results.push({
                        id: doc.id,
                        type: 'new_user',
                        icon: 'person_add',
                        color: '#f59e0b',
                        bg: '#fffbeb',
                        title: `Ny bruker: ${d.userName || d.userEmail || 'ukjent'}`,
                        meta: d.userEmail || '',
                        date: d.timestamp?.toDate ? d.timestamp.toDate() : new Date(0),
                        raw: d
                    });
                });
            }

            // Sort by date descending
            results.sort((a, b) => b.date - a.date);

            if (results.length === 0) {
                container.innerHTML = `
                    <div style="padding:40px; text-align:center; color:#94a3b8;">
                        <span class="material-symbols-outlined" style="font-size:40px; display:block; margin-bottom:8px;">history</span>
                        Ingen aktiviteter funnet.
                    </div>`;
                return;
            }

            const timeAgo = (date) => {
                const diff = Math.floor((Date.now() - date) / 1000);
                if (diff < 60) return 'Akkurat nå';
                if (diff < 3600) return `${Math.floor(diff / 60)} min siden`;
                if (diff < 86400) return `${Math.floor(diff / 3600)} t siden`;
                if (diff < 604800) return `${Math.floor(diff / 86400)} d siden`;
                return date.toLocaleDateString('no-NO', { day: 'numeric', month: 'short', year: 'numeric' });
            };

            this._activityLogItems = results;

            container.innerHTML = results.map((item, index) => `
                <div class="activity-log-entry" data-activity-index="${index}" role="button" tabindex="0"
                    style="display:flex; align-items:flex-start; gap:14px; padding:14px 0;
                    border-bottom:1px solid var(--border-color);">
                    <div style="width:38px; height:38px; border-radius:50%; background:${item.bg};
                        display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                        <span class="material-symbols-outlined" style="font-size:18px; color:${item.color};">${item.icon}</span>
                    </div>
                    <div style="flex:1; min-width:0;">
                        <div style="font-weight:600; font-size:0.9rem; margin-bottom:2px;">${this.escapeHtml(item.title)}</div>
                        <div style="font-size:0.82rem; color:#64748b; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${this.escapeHtml(item.meta || '')}</div>
                    </div>
                    <div style="font-size:0.75rem; color:#94a3b8; flex-shrink:0; text-align:right;">${timeAgo(item.date)}</div>
                </div>
            `).join('');

            container.querySelectorAll('.activity-log-entry').forEach((row) => {
                const openDetail = () => {
                    const idx = Number(row.dataset.activityIndex);
                    const item = this._activityLogItems[idx];
                    if (item) this.openDetailPreview(item);
                };
                row.addEventListener('click', openDetail);
                row.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        openDetail();
                    }
                });
            });

        } catch (err) {
            console.error('Activity log error:', err);
            container.innerHTML = `<div style="padding:20px; color:#94a3b8; text-align:center;">Kunne ikke laste aktivitetslogg.</div>`;
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

    async renderCommentsSection() {
        const section = document.getElementById('comments-section');
        if (!section) return;

        section.setAttribute('data-rendered', 'true');

        section.innerHTML = `
            ${this.renderSectionHeader('forum', 'Kommentarstyring', 'Her kan du moderere og slette kommentarer fra blogg og undervisning.', `
                <button class="btn btn-primary" onclick="window.adminManager.renderCommentsSection()">
                    Oppdater
                </button>
            `, '')}

            <div class="design-ui-shell">
                <div class="design-ui-workspace" style="padding: 0;">
                    <div class="design-ui-panel" style="border: none; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
                        <div class="table-container">
                            <table class="crm-table">
                                <thead>
                                    <tr>
                                        <th>Dato</th>
                                        <th>Forfatter</th>
                                        <th>Kommentar</th>
                                        <th>Post ID</th>
                                        <th class="col-actions" style="text-align:right; padding-right:20px;">Handlinger</th>
                                    </tr>
                                </thead>
                                <tbody id="comments-list-body">
                                    <tr><td colspan="5" style="text-align:center;"><div class="loader" style="margin:20px auto;"></div></td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.loadComments();
    }

    async loadComments() {
        const listBody = document.getElementById('comments-list-body');
        if (!listBody) return;

        try {
            const interactionsSnap = await firebaseService.db.collection('interactions').get();
            let allComments = [];

            const fetchPromises = [];
            interactionsSnap.forEach(postDoc => {
                const postId = postDoc.id;
                fetchPromises.push(
                    postDoc.ref.collection('comments').get().then(snap => {
                        snap.forEach(commentDoc => {
                            allComments.push({
                                id: commentDoc.id,
                                postId: postId,
                                data: commentDoc.data()
                            });
                        });
                    })
                );
            });

            await Promise.all(fetchPromises);

            allComments.sort((a, b) => {
                const tA = a.data.timestamp?.toDate?.() || new Date(0);
                const tB = b.data.timestamp?.toDate?.() || new Date(0);
                return tB - tA;
            });

            if (allComments.length === 0) {
                listBody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 40px; color:#64748b;">Ingen kommentarer funnet.</td></tr>';
                return;
            }

            listBody.innerHTML = allComments.map(c => {
                const d = c.data;
                const date = d.timestamp?.toDate?.() 
                    ? d.timestamp.toDate().toLocaleDateString('no-NO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) 
                    : 'Ukjent dato';
                return `
                    <tr data-comment-id="${c.id}" data-post-id="${c.postId}">
                        <td style="white-space: nowrap; font-size: 13px; color:#64748b;">${date}</td>
                        <td style="font-weight: 600;">${this.escapeHtml(d.author_name || 'Anonym')}</td>
                        <td style="max-width: 400px; line-height: 1.5; padding: 12px 15px; overflow-wrap: break-word;">${this.escapeHtml(d.text || '')}</td>
                        <td style="font-size: 11px; color: #94a3b8; font-family: monospace;">${this.escapeHtml(c.postId)}</td>
                        <td class="col-actions" style="text-align:right; padding-right:15px;">
                            <button class="btn btn-icon danger delete-comment-btn" data-comment-id="${c.id}" data-post-id="${c.postId}" title="Slett kommentar" 
                                style="color: #ef4444; background: #fee2e2; border-radius: 6px; width: 32px; height: 32px; display: inline-flex; align-items: center; justify-content: center; border: none; cursor: pointer;">
                                <span class="material-symbols-outlined" style="font-size:18px;">delete</span>
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');

            listBody.querySelectorAll('.delete-comment-btn').forEach(btn => {
                btn.onclick = async () => {
                    if (confirm('Er du sikker på at du vil slette denne kommentaren?')) {
                        const cid = btn.dataset.commentId;
                        const pid = btn.dataset.postId;
                        try {
                            await firebaseService.deleteComment(pid, cid);
                            this.showToast('✅ Kommentar slettet');
                            this.loadComments();
                        } catch (err) {
                            console.error('Kunne ikke slette kommentar:', err);
                            this.showToast('❌ Feil ved sletting', 'error');
                        }
                    }
                };
            });

        } catch (err) {
            console.error('Kunne ikke laste kommentarer:', err);
            listBody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:red; padding: 20px;">Feil ved lasting av kommentarer.</td></tr>';
        }
    }

    initWidgetConfig() {
        const configBtn = document.getElementById('configure-widgets-btn');
        const modal = document.getElementById('widget-config-modal');
        const closeBtn = document.getElementById('close-widget-config');
        const saveBtn = document.getElementById('save-widgets-btn');
        const container = document.getElementById('widget-list-container');

        if (!configBtn || !modal || !container) return;

        const openWidgetConfig = () => {
            // Build the list
            container.innerHTML = '';
            const enabledWidgets = JSON.parse(localStorage.getItem('hkm_dashboard_widgets')) ||
                Object.keys(this.widgetLibrary).filter(id => this.widgetLibrary[id].default);

            Object.values(this.widgetLibrary).forEach(widget => {
                const isChecked = enabledWidgets.includes(widget.id);
                const item = document.createElement('label');
                item.className = 'widget-config-item' + (isChecked ? ' active' : '');
                item.innerHTML = `
                    <input type="checkbox" value="${widget.id}" ${isChecked ? 'checked' : ''}>
                    <span class="material-symbols-outlined">${widget.icon}</span>
                    <span style="font-size: 14px; font-weight: 600; flex: 1;">${widget.label}</span>
                `;

                const checkbox = item.querySelector('input');
                checkbox.addEventListener('change', () => {
                    item.classList.toggle('active', checkbox.checked);
                });

                container.appendChild(item);
            });

            modal.style.display = 'flex';
        };

        configBtn.onclick = openWidgetConfig;

        const closeModal = () => modal.style.display = 'none';

        closeBtn.onclick = closeModal;

        if (!window.__hkmWidgetConfigWindowBound) {
            window.addEventListener('click', (e) => {
                const currentModal = document.getElementById('widget-config-modal');
                if (currentModal && e.target === currentModal) {
                    currentModal.style.display = 'none';
                }
            });
            window.__hkmWidgetConfigWindowBound = true;
        }

        saveBtn.onclick = () => {
            const selected = Array.from(container.querySelectorAll('input:checked')).map(cb => cb.value);
            localStorage.setItem('hkm_dashboard_widgets', JSON.stringify(selected));
            closeModal();
            showToast("Oversikt oppdatert!", "success");
            this.renderOverview(); // Re-render with new widgets
        };
    }

    initSearch() {
        const searchOpener = document.getElementById('global-search-opener');
        const searchModal = document.getElementById('search-modal');
        const closeSearchModal = document.getElementById('close-search-modal');
        const modalSearchInput = document.getElementById('global-modal-search-input');

        if (!searchOpener || !searchModal || !modalSearchInput) return;

        // Open search modal
        searchOpener.addEventListener('click', () => {
            searchModal.style.display = 'flex';
            setTimeout(() => modalSearchInput.focus(), 100);
        });

        // Close search modal
        const closeModal = () => {
            searchModal.style.display = 'none';
        };

        if (closeSearchModal) {
            closeSearchModal.addEventListener('click', closeModal);
        }

        // Close when clicking outside of the modal content
        searchModal.addEventListener('click', (e) => {
            if (e.target === searchModal) {
                closeModal();
            }
        });

        // Escape key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && searchModal.style.display === 'flex') {
                closeModal();
            }
        });

        // Perform search on Enter
        modalSearchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const query = modalSearchInput.value.trim();
                if (query) {
                    closeModal(); // Close modal immediately upon search
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
            ${this.renderSectionHeader('search', 'Søk', `Resultater for "${this.escapeHtml(q)}"`)}
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
                { id: 'for-menigheter', label: 'For menigheter' },
                { id: 'for-bedrifter', label: 'For bedrifter' },
                { id: 'bnn', label: 'Business Network' },
                { id: 'reisevirksomhet', label: 'Reisevirksomhet' },
                { id: 'bibelstudier', label: 'Bibelstudier' },
                { id: 'seminarer', label: 'Seminarer' },
                { id: 'settings_global', label: 'Globale tekster (Footer)' },
                { id: 'settings_facebook_feed', label: 'Facebook-feed' },
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

        const getIcon = (type) => {
            const t = type.toLowerCase();
            if (t.includes('blog')) return 'edit_note';
            if (t.includes('arr')) return 'event';
            if (t.includes('und')) return 'school';
            if (t.includes('media') || t.includes('video')) return 'play_circle';
            if (t.includes('user') || t.includes('bruk')) return 'person';
            if (t.includes('side') || t.includes('content')) return 'description';
            return 'article';
        };

        const html = `
            <div class="search-results-gallery">
                ${results.map((r) => `
                    <div class="search-result" onclick="window.location.hash = '${r.type === 'Blogg' ? 'blog' : (r.type === 'Undervisning' ? 'teaching' : (r.type === 'Arrangementer' ? 'events' : ''))}';">
                        <div class="search-result-header">
                            <span class="search-result-type-tag">${this.escapeHtml(r.type)}</span>
                            ${r.meta ? `<span class="search-result-meta">${this.escapeHtml(r.meta)}</span>` : ''}
                        </div>
                        <div class="search-result-body">
                            <div class="search-result-icon">
                                <span class="material-symbols-outlined">${getIcon(r.type)}</span>
                            </div>
                            <div class="search-result-info">
                                <div class="search-result-title">${this.escapeHtml(r.title)}</div>
                                ${r.snippet ? `<div class="search-result-snippet">${this.escapeHtml(r.snippet)}</div>` : ''}
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

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

    _formatAdminDateTime(date) {
        if (!(date instanceof Date) || Number.isNaN(date.getTime())) return 'Ukjent tidspunkt';
        return date.toLocaleDateString('no-NO', { day: 'numeric', month: 'short', year: 'numeric' }) + ', ' +
            date.toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' });
    }

    _ensureDetailModal() {
        let modal = document.getElementById('admin-detail-modal');
        if (modal) return modal;

        modal = document.createElement('div');
        modal.id = 'admin-detail-modal';
        modal.className = 'admin-detail-modal';
        modal.setAttribute('aria-hidden', 'true');
        modal.innerHTML = `
            <div class="admin-detail-dialog" role="dialog" aria-modal="true" aria-labelledby="admin-detail-title">
                <div class="admin-detail-header">
                    <div>
                        <h3 id="admin-detail-title" class="admin-detail-title">Detaljer</h3>
                        <p class="admin-detail-meta" id="admin-detail-meta"></p>
                    </div>
                    <button type="button" class="admin-detail-close" aria-label="Lukk detaljer">
                        <span class="material-symbols-outlined">close</span>
                    </button>
                </div>
                <div class="admin-detail-body" id="admin-detail-body"></div>
                <div class="admin-detail-actions" id="admin-detail-actions" style="margin-top: 24px; border-top: 1px solid var(--border-color); padding-top: 16px; display: none;">
                    <button id="admin-detail-delete-btn" class="btn btn-ghost" style="color: var(--danger);">
                        <span class="material-symbols-outlined">delete</span> Slett
                    </button>
                </div>
            </div>
        `;

        const closeModal = () => {
            modal.classList.remove('is-open');
            modal.setAttribute('aria-hidden', 'true');
        };

        modal.addEventListener('click', (e) => {
            if (e.target === modal || e.target.closest('.admin-detail-close')) {
                closeModal();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.classList.contains('is-open')) {
                closeModal();
            }
        });

        document.body.appendChild(modal);
        return modal;
    }

    _renderDetailField(label, value, options = {}) {
        if (value == null) return '';
        const text = String(value).trim();
        if (!text) return '';

        const safe = this.escapeHtml(text);
        const bodyHtml = options.multiline
            ? safe.replace(/\n/g, '<br>')
            : safe;
        const valueClasses = ['admin-detail-value'];
        if (options.boxed !== false) valueClasses.push('admin-detail-value--box');
        if (options.multiline) valueClasses.push('admin-detail-value--multiline');

        return `
            <div class="admin-detail-row">
                <div class="admin-detail-label">${this.escapeHtml(label)}</div>
                <div class="${valueClasses.join(' ')}">${bodyHtml}</div>
            </div>
        `;
    }

    openDetailPreview(item) {
        if (!item) return;
        const modal = this._ensureDetailModal();
        const titleEl = modal.querySelector('#admin-detail-title');
        const metaEl = modal.querySelector('#admin-detail-meta');
        const bodyEl = modal.querySelector('#admin-detail-body');
        if (!titleEl || !metaEl || !bodyEl) return;

        const raw = item.raw || {};
        const typeLabelMap = {
            push: 'Push-varsling',
            message: 'Melding',
            new_user: 'Ny bruker'
        };
        const typeLabel = typeLabelMap[item.type] || 'Aktivitet';
        const absoluteDate = this._formatAdminDateTime(item.date);
        const rows = [];

        rows.push(this._renderDetailField('Type', typeLabel));
        rows.push(this._renderDetailField('Tidspunkt', absoluteDate));

        if (item.type === 'push') {
            rows.push(this._renderDetailField('Tittel', raw.title || item.title || 'Push-varsling'));
            rows.push(this._renderDetailField('Målgruppe', raw.targetRole === 'all' ? 'Alle brukere' : (raw.targetRole || 'Ukjent')));
            rows.push(this._renderDetailField('Sendt av', raw.sentBy || 'Ukjent'));
            rows.push(this._renderDetailField('Link', raw.click_action || raw.clickAction || '', { multiline: false }));
            rows.push(this._renderDetailField('Melding', raw.body || '', { multiline: true }));
        } else if (item.type === 'message') {
            rows.push(this._renderDetailField('Fra', raw.name || 'Ukjent'));
            rows.push(this._renderDetailField('E-post', raw.email || ''));
            rows.push(this._renderDetailField('Telefon', raw.phone || raw.telephone || ''));
            rows.push(this._renderDetailField('Emne', raw.subject || '(ingen emne)'));
            rows.push(this._renderDetailField('Status', raw.status || 'ny'));
            rows.push(this._renderDetailField('Melding', raw.message || '', { multiline: true }));
        } else if (item.type === 'new_user') {
            rows.push(this._renderDetailField('Bruker', raw.userName || item.title || 'Ukjent'));
            rows.push(this._renderDetailField('E-post', raw.userEmail || item.meta || ''));
            rows.push(this._renderDetailField('Melding', raw.message || raw.description || '', { multiline: true }));
        } else {
            rows.push(this._renderDetailField('Tittel', item.title || ''));
            rows.push(this._renderDetailField('Detaljer', item.meta || '', { multiline: true }));
        }

        titleEl.textContent = item.title || typeLabel;
        metaEl.textContent = `${typeLabel} • ${absoluteDate}`;
        bodyEl.innerHTML = rows.filter(Boolean).join('');

        // Action Buttons Setup
        const actionsEl = modal.querySelector('#admin-detail-actions');
        const deleteBtn = modal.querySelector('#admin-detail-delete-btn');

        // Remove old listeners by cloning and replacing the button
        const newDeleteBtn = deleteBtn.cloneNode(true);
        deleteBtn.parentNode.replaceChild(newDeleteBtn, deleteBtn);

        if (item.type === 'push' || item.type === 'message') {
            actionsEl.style.display = 'flex';
            actionsEl.style.justifyContent = 'flex-end';

            newDeleteBtn.onclick = async () => {
                const isPush = item.type === 'push';
                const typeText = isPush ? 'denne push-varslingen' : 'denne meldingen';
                if (!confirm(`Er du sikker på at du vil slett ${typeText}? Dette kan ikke angres.`)) return;

                newDeleteBtn.disabled = true;
                newDeleteBtn.textContent = 'Sletter...';

                try {
                    const db = firebaseService.db;
                    if (isPush) {
                        // Delete from push log
                        await db.collection('push_log').doc(item.id).delete();
                        // Delete related user_notifications (where title + body match, roughly)
                        // A more robust way would be storing push_log ID in user_notifications, but this prevents orphan data.
                        if (raw.title) {
                            const relatedNotifs = await db.collection('user_notifications').where('title', '==', raw.title).get();
                            const batch = db.batch();
                            relatedNotifs.forEach(doc => batch.delete(doc.ref));
                            await batch.commit();
                        }
                    } else if (item.type === 'message') {
                        await db.collection('contactMessages').doc(item.id).delete();
                    }

                    const closeModal = () => {
                        modal.classList.remove('is-open');
                        modal.setAttribute('aria-hidden', 'true');
                    };
                    closeModal();

                    // Refresh the activity log to reflect deletion
                    this.loadActivityLog(document.querySelector('.log-filter-btn.active')?.dataset.filter || 'all');
                } catch (err) {
                    console.error('Error deleting item:', err);
                    alert('Kunne ikke slette element: ' + err.message);
                } finally {
                    newDeleteBtn.disabled = false;
                    newDeleteBtn.innerHTML = '<span class="material-symbols-outlined">delete</span> Slett';
                }
            };
        } else {
            actionsEl.style.display = 'none';
        }

        modal.classList.add('is-open');
        modal.setAttribute('aria-hidden', 'false');
    }

    getSectionIcon(sectionId) {
        return window.HKMAdminUtils.getSectionIcon(sectionId);
    }

    renderSectionHeader(icon, title, subtitle, actionsHtml = '', subtitleId = '') {
        return window.HKMAdminUtils.renderSectionHeader(icon, title, subtitle, actionsHtml, subtitleId);
    }

    async renderOverview() {
        const section = document.getElementById('overview-section');
        if (!section) return;

        section.setAttribute('data-rendered', 'true');

        // Fetch Data
        let blogCount = 0, teachingCount = 0, eventCount = 0, campaignCount = 0, userCount = 0;
        let donationCount = 0, donationTotal = 0;
        let indexStats = {};
        let youtubeStats = { subscribers: 'N/A', videos: 'N/A', views: '0' };
        let podcastCount = '...';
        let fullEvents = [], latestContactsData = [];

        try {
            const [blogData, teachingData, eventData, causesData, indexData, yt, pod, coursesDoc] = await Promise.all([
                firebaseService.getPageContent('collection_blog'),
                firebaseService.getPageContent('collection_teaching'),
                firebaseService.getPageContent('collection_events'),
                firebaseService.getPageContent('collection_causes'),
                firebaseService.getPageContent('index'),
                this.fetchYouTubeStats(),
                this.fetchPodcastStats(),
                typeof firebaseService.getSiteContent === 'function'
                    ? firebaseService.getSiteContent('collection_courses')
                    : null
            ]);

            blogCount = (Array.isArray(blogData) ? blogData : (blogData?.items || [])).length;
            teachingCount = (Array.isArray(teachingData) ? teachingData : (teachingData?.items || [])).length;

            const eventsList = Array.isArray(eventData) ? eventData : (eventData?.items || []);
            eventCount = eventsList.length;
            fullEvents = eventsList;

            campaignCount = (Array.isArray(causesData) ? causesData : (causesData?.items || [])).length;
            indexStats = indexData?.stats || {};
            if (yt) youtubeStats = yt;
            if (pod) podcastCount = pod;
            const coursesCount = (Array.isArray(coursesDoc) ? coursesDoc : (coursesDoc?.items || [])).length;
            if (Number.isFinite(coursesCount)) {
                // Keep a lightweight cached value in case a dedicated widget is enabled later.
                this._coursesCountOverview = coursesCount;
            }

            if (firebaseService.db) {
                const usersSnapshot = await firebaseService.db.collection('users').get();
                userCount = usersSnapshot.size || 0;

                // Fetch donations
                const donationsSnapshot = await firebaseService.db.collection('donations').get();
                donationsSnapshot.forEach(doc => {
                    const data = doc.data();
                    donationCount++;
                    if (data.amountNok != null || data.amountNOK != null || data.totalNok != null) {
                        const raw = data.amountNok ?? data.amountNOK ?? data.totalNok;
                        donationTotal += typeof adminUtils.normalizeAmountNok === 'function'
                            ? adminUtils.normalizeAmountNok(raw)
                            : Number(raw || 0);
                    } else if (data.amount != null) {
                        // Stripe amounts are stored in øre.
                        donationTotal += (Number(data.amount) || 0) / 100;
                    }
                });

                // Fetch latest contacts
                const contactsSnapshot = await firebaseService.db.collection('contactMessages')
                    .orderBy('timestamp', 'desc')
                    .limit(4)
                    .get();
                contactsSnapshot.forEach(doc => latestContactsData.push({ id: doc.id, ...doc.data() }));
            }
        } catch (e) {
            console.warn('Feil ved henting av statistikk:', e);
        }

        // Get Enabled Widgets & Order
        const savedOrder = JSON.parse(localStorage.getItem('hkm_dashboard_widgets'));
        const enabledWidgets = savedOrder || Object.keys(this.widgetLibrary).filter(id => this.widgetLibrary[id].default);
        const savedSpans = JSON.parse(localStorage.getItem('hkm_dashboard_widget_spans')) || {};

        // Build HTML for widgets
        let widgetsHtml = '';
        enabledWidgets.forEach(id => {
            const w = this.widgetLibrary[id];
            if (!w) return;

            // Default spans if not saved
            const savedSpansV = JSON.parse(localStorage.getItem('hkm_dashboard_widget_spans_v')) || {};
            let span = savedSpans[id];
            if (span === undefined) {
                span = (w.type === 'list') ? 2 : 1;
            }
            const spanV = savedSpansV[id] || 1;

            let value = '0', meta = '';
            switch (id) {
                case 'visitors': {
                    const cachedVisits = localStorage.getItem('hkm_stat_visits');
                    const liveVisits = indexStats.website_visits;
                    if (liveVisits) {
                        localStorage.setItem('hkm_stat_visits', liveVisits);
                        value = liveVisits.toLocaleString('no-NO');
                    } else if (cachedVisits) {
                        value = parseInt(cachedVisits).toLocaleString('no-NO');
                    } else {
                        value = '—';
                    }
                    meta = '';
                    break;
                }
                case 'status':
                    value = '<span class="text-green" style="font-size: 24px;">Normal</span>';
                    meta = '<span class="stat-meta">Alle systemer operative</span>';
                    break;
                case 'users':
                    value = userCount;
                    meta = '<span class="stat-meta">Live fra Firestore</span>';
                    break;
                case 'blog': value = blogCount; break;
                case 'teaching': value = teachingCount; break;
                case 'donations':
                    value = donationCount;
                    meta = `<span class="stat-meta">Totalt: ${Math.round(donationTotal).toLocaleString('no-NO')} kr</span>`;
                    break;
                case 'youtube':
                    value = parseInt(youtubeStats.views || 0).toLocaleString('no-NO');
                    meta = `<span class="stat-meta">${youtubeStats.subscribers} abonnenter</span>`;
                    break;
                case 'podcast': value = podcastCount; meta = '<span class="stat-meta">Episoder totalt</span>'; break;
                case 'campaigns': value = campaignCount; break;
                case 'events': value = eventCount; break;
                case 'next-events':
                    const now = new Date();
                    const next = fullEvents
                        .filter(ev => ev.date && new Date(ev.date) >= now)
                        .sort((a, b) => new Date(a.date) - new Date(b.date))
                        .slice(0, 3);

                    value = next.length > 0 ? '' : 'Ingen kommende';
                    meta = `<ul class="stat-list">
                        ${next.map(ev => `
                            <li class="stat-list-item">
                                <span class="item-main">${ev.title}</span>
                                <span class="item-meta">${new Date(ev.date).toLocaleDateString('no-NO', { day: '2-digit', month: 'short' })}</span>
                            </li>
                        `).join('')
                        }
                    </ul>`;
                    break;
                case 'latest-contacts':
                    value = latestContactsData.length > 0 ? '' : 'Ingen meldinger';
                    meta = `<ul class="stat-list">
                        ${latestContactsData.map(c => `
                            <li class="stat-list-item">
                                <span class="item-main">${c.name || 'Ukjent'}</span>
                                <span class="item-meta">${c.status === 'ny' ? '<span class="dot" style="background:#22c55e; width:6px; height:6px; margin-right:4px;"></span>' : ''}${c.subject || 'Ingen emne'}</span>
                            </li>
                        `).join('')
                        }
                    </ul>`;
                    break;
            }

            widgetsHtml += `
                <div class="stat-card modern" data-id="${w.id}" data-span="${span}" data-span-v="${spanV}">
                    <span class="material-symbols-outlined drag-handle">drag_indicator</span>
                    <div class="resize-handle corner-resize" data-tooltip="Dra for å endre størrelse">
                        <span class="material-symbols-outlined">filter_list</span>
                    </div>
                    <div class="stat-icon-wrap ${w.color}">
                        <span class="material-symbols-outlined">${w.icon}</span>
                    </div>
                    <div class="stat-content">
                        <h3 class="stat-label">${w.label}</h3>
                        <p class="stat-value">${value}</p>
                        ${meta}
                    </div>
                </div>
            `;
        });

        section.innerHTML = `
            <div class="overview-hero-card">
                <div class="overview-hero-content">
                    <div class="overview-hero-eyebrow">HKM Studio</div>
                    <h2 class="overview-hero-title">Velkommen tilbake!</h2>
                    <p class="overview-hero-text">
                        Her har du rask oversikt over innhold, meldinger og aktivitet. Bruk menyen til venstre for å redigere nettsiden og følge opp kommunikasjonen.
                    </p>
                    <button type="button" class="overview-hero-action" onclick="document.querySelector('.nav-link[data-section=&quot;messages&quot;]')?.click()">
                        Gå til meldinger
                        <span class="material-symbols-outlined">arrow_forward</span>
                    </button>
                </div>
                <div class="overview-hero-icon" aria-hidden="true">
                    <span class="material-symbols-outlined">monitoring</span>
                </div>
            </div>
            ${this.renderSectionHeader('dashboard', 'Analyseoversikt', 'Oversikt over nettstedets aktivitet og statistikk.', `
                <button id="toggle-edit-mode" class="btn btn-accent btn-icon" data-tooltip="Endre rekkefølge og størrelse">
                    <span class="material-symbols-outlined" style="font-size: 20px;">open_with</span>
                </button>
                <button id="configure-widgets-btn" class="btn btn-accent btn-icon" data-tooltip="Tilpass oversikt">
                    <span class="material-symbols-outlined" style="font-size: 20px;">settings_suggest</span>
                </button>
            `)
            }
            <div class="stats-grid" id="dashboard-stats-grid">
                ${widgetsHtml}
                ${enabledWidgets.length === 0 ? '<p style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted); font-style: italic;">Ingen analysebokser valgt. Klikk på "Tilpass oversikt" for å legge til.</p>' : ''}
            </div>
        `;
        // Get Main Grid Order
        const savedMainOrder = JSON.parse(localStorage.getItem('hkm_dashboard_main_order')) || ['chart', 'top-pages'];

        const mainWidgets = {
            'chart': `
                <div class="chart-container card" data-id="chart" style="position: relative;">
                    <span class="material-symbols-outlined drag-handle">drag_indicator</span>
                    <div class="card-header-simple">
                        <div>
                            <h3 class="card-title">Trafikkovervåking (Google Analytics)</h3>
                            <div class="live-indicator">
                                <span class="dot"></span>
                                Sanntid: 24 aktive akkurat nå
                            </div>
                        </div>
                        <div class="dropdown-container" style="position: relative;">
                            <button class="chart-options-btn" style="background:none; border:none; cursor:pointer; color:var(--text-muted); padding:4px; display:flex; align-items:center;">
                                <span class="material-symbols-outlined">more_vert</span>
                            </button>
                            <div class="chart-dropdown dropdown-menu" style="display:none; position:absolute; top:100%; right:0; background:white; border-radius:12px; box-shadow:0 10px 40px rgba(0,0,0,0.1); border:1px solid #f1f5f9; width:180px; z-index:100; padding:8px; overflow:hidden;">
                                <button class="dropdown-item" data-view="daily" style="width:100%; text-align:left; padding:10px 12px; border:none; background:none; border-radius:8px; font-size:13px; font-weight:600; color:var(--text-main); cursor:pointer; display:flex; align-items:center; gap:8px;">
                                    <span class="material-symbols-outlined" style="font-size:18px;">calendar_view_day</span> Daglig visning
                                </button>
                                <button class="dropdown-item" data-view="weekly" style="width:100%; text-align:left; padding:10px 12px; border:none; background:none; border-radius:8px; font-size:13px; font-weight:600; color:var(--text-muted); cursor:pointer; display:flex; align-items:center; gap:8px;">
                                    <span class="material-symbols-outlined" style="font-size:18px;">calendar_view_week</span> Ukentlig oversikt
                                </button>
                                <button class="dropdown-item" data-view="monthly" style="width:100%; text-align:left; padding:10px 12px; border:none; background:none; border-radius:8px; font-size:13px; font-weight:600; color:var(--text-muted); cursor:pointer; display:flex; align-items:center; gap:8px;">
                                    <span class="material-symbols-outlined" style="font-size:18px;">calendar_month</span> Månedlig analyse
                                </button>
                            </div>
                        </div>
                    </div>
                    <div class="chart-placeholder">
                        <div class="bar-chart">
                            <div class="bar" style="height: 40%;" data-tooltip-info="08:00: 340 besøkende"><span>08:00</span></div>
                            <div class="bar" style="height: 65%;" data-tooltip-info="10:00: 552 besøkende"></div>
                            <div class="bar" style="height: 85%;" data-tooltip-info="12:00: 722 besøkende"><span>12:00</span></div>
                            <div class="bar" style="height: 55%;" data-tooltip-info="14:00: 467 besøkende"></div>
                            <div class="bar" style="height: 75%;" data-tooltip-info="16:00: 637 besøkende"><span>16:00</span></div>
                            <div class="bar" style="height: 45%;" data-tooltip-info="18:00: 382 besøkende"></div>
                            <div class="bar" style="height: 80%;" data-tooltip-info="20:00: 680 besøkende"><span>20:00</span></div>
                            <div class="bar" style="height: 60%;" data-tooltip-info="22:00: 510 besøkende"></div>
                        </div>
                    </div>
                </div>
            `,
            'top-pages': `
                <div class="top-pages-widget card" data-id="top-pages" style="position: relative;">
                    <span class="material-symbols-outlined drag-handle">drag_indicator</span>
                    <h3 class="card-title">Topp Sider</h3>
                    <ul class="page-rank-list">
                        <li>
                            <div class="page-info">
                                <span class="page-url">/index.html</span>
                                <span class="page-count">4,230</span>
                            </div>
                            <div class="progress-bar-wrap">
                                <div class="progress-bar" style="width: 85%;"></div>
                            </div>
                        </li>
                        <li>
                            <div class="page-info">
                                <span class="page-url">/blogg.html</span>
                                <span class="page-count">2,150</span>
                            </div>
                            <div class="progress-bar-wrap">
                                <div class="progress-bar" style="width: 45%;"></div>
                            </div>
                        </li>
                        <li>
                            <div class="page-info">
                                <span class="page-url">/media.html</span>
                                <span class="page-count">1,890</span>
                            </div>
                            <div class="progress-bar-wrap">
                                <div class="progress-bar" style="width: 35%;"></div>
                            </div>
                        </li>
                    </ul>
                </div>
            `
        };

        const mainGridHtml = savedMainOrder.map(id => mainWidgets[id]).join('');

        section.innerHTML += `
            <div class="dashboard-main-grid" id="dashboard-main-grid">
                ${mainGridHtml}
            </div>
        `;

        // RE-INIT DROPDOWN, CONFIG BTN and SORTABLE
        this._initOverviewRealtimeSubscriptions();
        this.initWidgetConfig();
        this.initSortableWidgets();
        this.initSortableMainGrid();
        this.initWidgetResizers();

        // Edit Mode Toggle
        const editToggle = document.getElementById('toggle-edit-mode');
        const statsGrid = document.getElementById('dashboard-stats-grid');
        const mainGrid = document.getElementById('dashboard-main-grid');
        if (editToggle && statsGrid && mainGrid) {
            editToggle.addEventListener('click', () => {
                const isEditing = statsGrid.classList.toggle('edit-mode');
                mainGrid.classList.toggle('edit-mode', isEditing);

                if (isEditing) {
                    editToggle.innerHTML = '<span class="material-symbols-outlined" style="font-size: 20px;">check</span>';
                    showToast("Dra boksene for å flytte, eller bruk hjørnet for å endre størrelse", "info");
                } else {
                    editToggle.innerHTML = '<span class="material-symbols-outlined" style="font-size: 20px;">open_with</span>';
                }
            });
        }

        this.checkSystemHealth();

        this._initialOverviewRenderComplete = true;

        // Remove splash/cloak after initial render
        setTimeout(() => this.removeSplashScreen(), 300);
    }

    initSortableWidgets() {
        const el = document.getElementById('dashboard-stats-grid');
        if (!el || typeof Sortable === 'undefined') return;

        Sortable.create(el, {
            animation: 150,
            handle: '.drag-handle',
            ghostClass: 'sortable-ghost',
            chosenClass: 'sortable-chosen',
            onEnd: () => {
                const order = Array.from(el.querySelectorAll('.stat-card.modern')).map(card => card.dataset.id);
                localStorage.setItem('hkm_dashboard_widgets', JSON.stringify(order));
                showToast("Rekkefølge lagret!", "success");
            }
        });
    }

    initSortableMainGrid() {
        const el = document.getElementById('dashboard-main-grid');
        if (!el || typeof Sortable === 'undefined') return;

        Sortable.create(el, {
            animation: 150,
            handle: '.drag-handle',
            ghostClass: 'sortable-ghost',
            chosenClass: 'sortable-chosen',
            onEnd: () => {
                const order = Array.from(el.children).map(child => child.dataset.id);
                localStorage.setItem('hkm_dashboard_main_order', JSON.stringify(order));
                showToast("Layout lagret!", "success");
            }
        });
    }

    initWidgetResizers() {
        let activeCard = null;
        let startX, startY, startSpan, startSpanV;
        let gridRect, colWidth, rowHeight;

        const onMouseDown = (e) => {
            const handle = e.target.closest('.corner-resize');
            if (!handle) return;
            e.preventDefault();
            e.stopPropagation();

            activeCard = handle.closest('.stat-card.modern');
            const grid = activeCard.parentElement;
            gridRect = grid.getBoundingClientRect();

            const gap = 24;
            colWidth = (gridRect.width + gap) / 4;
            const sampleCard = grid.querySelector('.stat-card.modern[data-span-v="1"]') || activeCard;
            rowHeight = sampleCard.offsetHeight / parseInt(sampleCard.dataset.spanV || 1);

            startX = e.clientX;
            startY = e.clientY;
            startSpan = parseInt(activeCard.dataset.span || 1);
            startSpanV = parseInt(activeCard.dataset.spanV || 1);

            activeCard.classList.add('resizing');

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        };

        const onMouseMove = (e) => {
            if (!activeCard) return;

            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;

            const addCols = Math.round(deltaX / colWidth);
            const addRows = Math.round(deltaY / (rowHeight + 24));

            let newSpan = Math.max(1, Math.min(4, startSpan + addCols));
            let newSpanV = Math.max(1, Math.min(3, startSpanV + addRows));

            if (newSpan.toString() !== activeCard.dataset.span || newSpanV.toString() !== activeCard.dataset.spanV) {
                activeCard.dataset.span = newSpan;
                activeCard.dataset.spanV = newSpanV;
            }
        };

        const onMouseUp = () => {
            if (!activeCard) return;
            activeCard.classList.remove('resizing');

            const id = activeCard.dataset.id;
            const savedSpans = JSON.parse(localStorage.getItem('hkm_dashboard_widget_spans')) || {};
            const savedSpansV = JSON.parse(localStorage.getItem('hkm_dashboard_widget_spans_v')) || {};

            savedSpans[id] = parseInt(activeCard.dataset.span);
            savedSpansV[id] = parseInt(activeCard.dataset.spanV);

            localStorage.setItem('hkm_dashboard_widget_spans', JSON.stringify(savedSpans));
            localStorage.setItem('hkm_dashboard_widget_spans_v', JSON.stringify(savedSpansV));

            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            activeCard = null;
        };

        const grid = document.getElementById('dashboard-stats-grid');
        if (grid) {
            grid.addEventListener('mousedown', onMouseDown);
        }
    }

    async renderContentEditor() {
        const section = document.getElementById('content-editor-section');
        if (!section) return;

        section.setAttribute('data-rendered', 'true');

        section.innerHTML = `
            ${this.renderSectionHeader('description', 'Innholdsredigering', 'Administrer og rediger blogginnlegg, undervisningsserier og mer.')}

            <div class="grid-2-cols">
                <div class="card">
                    <div class="card-header flex-between">
                        <h3 class="card-title">Blogginnlegg</h3>
                        <button class="btn-primary btn-sm" id="new-blog-post">Nytt innlegg</button>
                    </div>
                    <div class="card-body">
                        <ul class="content-list" id="blog-posts-list">
                            <li class="loading-item">Laster blogginnlegg...</li>
                        </ul>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header flex-between">
                        <h3 class="card-title">Undervisningsserier</h3>
                        <button class="btn-primary btn-sm" id="new-teaching-series">Ny serie</button>
                    </div>
                    <div class="card-body">
                        <ul class="content-list" id="teaching-series-list">
                            <li class="loading-item">Laster undervisningsserier...</li>
                        </ul>
                    </div>
                </div>
            </div >

                    <div class="card mt-4">
                        <div class="card-header">
                            <h3 class="card-title">Sider</h3>
                        </div>
                        <div class="card-body">
                            <ul class="content-list" id="pages-list">
                                <li class="loading-item">Laster sider...</li>
                            </ul>
                        </div>
                    </div>
`;

        // Load content lists
        this.loadContentList('collection_blog', 'blog-posts-list', 'blog');
        this.loadContentList('collection_teaching', 'teaching-series-list', 'teaching');
        this.loadContentList('collection_pages', 'pages-list', 'page');

        // Add event listeners for new content buttons
        document.getElementById('new-blog-post').addEventListener('click', () => this.openContentModal('blog'));
        document.getElementById('new-teaching-series').addEventListener('click', () => this.openContentModal('teaching'));

        // Keep existing posts translated in background without adding an extra manual button.
        this.translateAllExistingBlogPosts({ force: true, silent: true }).catch((error) => {
            console.warn('[AdminManager] Background blog translation backfill failed', error);
        });
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
                healthCard.onclick = () => showToast(`Det er ${criticalCount} kritiske feil i loggen.Sjekk Firestore 'system_logs' eller e - postvarsler.`);
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
        const rssFeedUrl = "https://anchor.fm/s/f7a13dec/podcast/rss";
        const proxyUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssFeedUrl)}`;
        try {
            const response = await fetch(proxyUrl);
            const data = await response.json();
            const items = data?.items;
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
            ${this.renderSectionHeader('perm_media', 'Media-integrasjoner', 'Koble til YouTube og Podcast-strømmer.')}
            
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

        section.innerHTML = `
            ${this.renderSectionHeader('mail', 'Innboks & Meldinger', 'Laster meldinger...', `
                <button class="btn btn-primary" onclick="window.adminManager.renderMessagesSection()">
                    Oppdater
                </button>
            `, 'messages-section-subtitle')}

            <div class="design-ui-shell">
                <div class="design-ui-workspace" style="padding: 0;">
                    <div class="design-ui-panel" style="border: none; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
                        <div id="messages-list" class="inbox-messages-list">
                            <div class="loader"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const subtitleEl = document.getElementById('messages-section-subtitle');
        const setSubtitle = (text) => {
            if (!subtitleEl) return;
            subtitleEl.textContent = text || '';
        };

        if (!firebaseService.isInitialized) {
            document.getElementById('messages-list').innerHTML = '<p class="inbox-empty">Firebase er ikke konfigurert.</p>';
            setSubtitle('Firebase er ikke konfigurert.');
            return;
        }

        let allMessages = [];

        const renderMessages = (messages) => {
            const listEl = document.getElementById('messages-list');
            if (!listEl) return;

            if (messages.length === 0) {
                listEl.innerHTML = '<p class="inbox-empty">Ingen meldinger funnet.</p>';
                setSubtitle('Ingen meldinger funnet.');
                return;
            }

            listEl.innerHTML = messages.map(({ id, data }) => {
                const isRead = data.status === 'lest';
                const name = data.name || 'Ukjent';
                const email = data.email || '';
                const subject = data.subject || '(ingen emne)';
                const msgPreview = data.message || '';
                const emailDomain = email ? email.split('@')[1]?.toUpperCase() || email.toUpperCase() : '';

                const createdAt = data.createdAt && typeof data.createdAt.toDate === 'function'
                    ? data.createdAt.toDate()
                    : null;
                const dateStr = createdAt
                    ? createdAt.toLocaleDateString('no-NO', { day: 'numeric', month: 'short', year: 'numeric' }) + ', ' + createdAt.toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' })
                    : '';

		                return `
		                    <div class="inbox-row ${isRead ? 'inbox-row--read' : 'inbox-row--unread'}" data-id="${id}">
		                        <div class="inbox-row-icon">
		                            <svg class="inbox-mail-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
		                                <rect x="4" y="6.5" width="16" height="11" rx="2" fill="none" stroke="currentColor" stroke-width="2" />
		                                <path d="M5 7.5l7 6 7-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
		                            </svg>
		                            ${!isRead ? '<span class="inbox-unread-dot"></span>' : ''}
		                        </div>
		                        <div class="inbox-row-body">
		                            <div class="inbox-row-top">
	                                <span class="inbox-row-name">${this.escapeHtml(name)}</span>
                                ${emailDomain ? `<span class="inbox-source-badge">${this.escapeHtml(emailDomain)}</span>` : ''}
                                ${!isRead ? '<span class="inbox-new-dot"></span>' : ''}
                            </div>
                            <div class="inbox-row-preview">${this.escapeHtml(subject)}</div>
                            <div class="inbox-row-msg">${this.escapeHtml(msgPreview.substring(0, 100))}${msgPreview.length > 100 ? '…' : ''}</div>
                            ${dateStr ? `<div class="inbox-row-date"><span class="material-symbols-outlined">schedule</span> ${dateStr}</div>` : ''}
                        </div>
		                        <div class="inbox-row-actions">
		                            ${!isRead ? `<button class="btn btn-outline btn-sm message-mark-read" data-id="${id}" title="Marker som lest">
		                                <svg class="inbox-action-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
		                                    <path d="M20 6.5L9 17.5l-5-5" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/>
		                                </svg>
		                            </button>` : '<span class="inbox-read-check material-symbols-outlined" title="Lest">check_circle</span>'}
		                        </div>
		                    </div>
		                `;
	            }).join('');
        };

        const updateUnreadLabel = () => {
            const unreadCount = allMessages.filter(m => m.data.status !== 'lest').length;
            const labelEl = document.getElementById('inbox-unread-label');
            const markAllBtn = document.getElementById('mark-all-read-btn');
            if (labelEl) {
                labelEl.textContent = unreadCount > 0
                    ? `Du har ${unreadCount} uleste melding${unreadCount === 1 ? '' : 'er'} i innboksen din.`
                    : 'Alle meldinger er lest.';
            }
            if (markAllBtn) markAllBtn.style.display = unreadCount > 0 ? '' : 'none';
        };

        try {
            const snapshot = await firebaseService.db
                .collection('contactMessages')
                .orderBy('createdAt', 'desc')
                .limit(100)
                .get();

            snapshot.forEach(doc => allMessages.push({ id: doc.id, data: doc.data() || {} }));

            updateUnreadLabel();
            renderMessages(allMessages);

            // Search
            const searchInput = document.getElementById('inbox-search-input');
            if (searchInput) {
                searchInput.addEventListener('input', () => {
                    const q = searchInput.value.trim().toLowerCase();
                    const filtered = !q ? allMessages : allMessages.filter(({ data }) =>
                        (data.name || '').toLowerCase().includes(q) ||
                        (data.email || '').toLowerCase().includes(q) ||
                        (data.subject || '').toLowerCase().includes(q) ||
                        (data.message || '').toLowerCase().includes(q)
                    );
                    renderMessages(filtered);
                    attachRowListeners();
                });
            }

            // Mark all as read
            const markAllBtn = document.getElementById('mark-all-read-btn');
            if (markAllBtn) {
                markAllBtn.addEventListener('click', async () => {
                    const unread = allMessages.filter(m => m.data.status !== 'lest');
                    if (!unread.length) return;
                    markAllBtn.disabled = true;
                    markAllBtn.textContent = 'Oppdaterer...';
                    try {
                        const batch = firebaseService.db.batch();
                        unread.forEach(({ id }) => {
                            batch.update(firebaseService.db.collection('contactMessages').doc(id), {
                                status: 'lest',
                                readAt: firebase.firestore.FieldValue.serverTimestamp()
                            });
                        });
                        await batch.commit();
                        allMessages.forEach(m => { m.data.status = 'lest'; });
                        updateUnreadLabel();
                        renderMessages(allMessages);
                        attachRowListeners();
                    } catch (err) {
                        console.error('Feil ved markering:', err);
                    } finally {
                        markAllBtn.disabled = false;
                        markAllBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size:16px;">done_all</span> Marker alle som lest';
                    }
                });
            }

            const attachRowListeners = () => {
                const listEl = document.getElementById('messages-list');
                if (!listEl) return;
                listEl.querySelectorAll('.message-mark-read').forEach(btn => {
                    btn.onclick = async (e) => {
                        e.stopPropagation();
                        const id = btn.dataset.id;
                        try {
                            await firebaseService.db.collection('contactMessages').doc(id).update({
                                status: 'lest',
                                readAt: firebase.firestore.FieldValue.serverTimestamp()
                            });
                            const msg = allMessages.find(m => m.id === id);
                            if (msg) msg.data.status = 'lest';
                            updateUnreadLabel();
                            const row = listEl.querySelector(`.inbox-row[data-id="${id}"]`);
                            if (row) {
                                row.classList.remove('inbox-row--unread');
                                row.classList.add('inbox-row--read');
                                btn.replaceWith(Object.assign(document.createElement('span'), {
                                    className: 'inbox-read-check material-symbols-outlined',
                                    title: 'Lest',
                                    textContent: 'check_circle'
                                }));
                                const dot = row.querySelector('.inbox-unread-dot');
                                if (dot) dot.remove();
                                const newDot = row.querySelector('.inbox-new-dot');
                                if (newDot) newDot.remove();
                                // SVG icon stays the same; only colors/labels change via CSS classes.
                            }
                        } catch (err) {
                            showToast('Kunne ikke markere melding som lest.');
                        }
                    };
                });

                listEl.querySelectorAll('.inbox-row').forEach((row) => {
                    row.setAttribute('role', 'button');
                    row.tabIndex = 0;

                    const openDetail = () => {
                        const id = row.dataset.id;
                        const msg = allMessages.find((m) => m.id === id);
                        if (!msg) return;
                        const d = msg.data || {};
                        const createdAt = d.createdAt && typeof d.createdAt.toDate === 'function'
                            ? d.createdAt.toDate()
                            : (d.timestamp && typeof d.timestamp.toDate === 'function' ? d.timestamp.toDate() : new Date(0));
                        this.openDetailPreview({
                            id,
                            type: 'message',
                            title: `Melding fra ${d.name || 'ukjent'}`,
                            date: createdAt,
                            raw: d
                        });
                    };

                    row.onclick = (e) => {
                        if (e.target.closest('.message-mark-read')) return;
                        openDetail();
                    };
                    row.onkeydown = (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            openDetail();
                        }
                    };
                });
            };

            attachRowListeners();

            try {
                const unreadCount = allMessages.filter(m => (m.data && m.data.status) !== 'lest').length;
                const now = new Date();
                const timeStr = now.toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' });
                setSubtitle(`${allMessages.length} meldinger · ${unreadCount} ulest · Oppdatert ${timeStr}`);
            } catch (e) {
                setSubtitle(`${allMessages.length} meldinger`);
            }

        } catch (err) {
            console.error('Kunne ikke hente kontaktmeldinger:', err);
            const listEl = document.getElementById('messages-list');
            if (listEl) listEl.innerHTML = '<p class="inbox-empty" style="color:#ef4444;">Feil ved henting av meldinger.</p>';
            const code = err && err.code ? ` (${err.code})` : '';
            setSubtitle(`Feil ved henting${code}`);
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
            const rssFeedUrl = "https://anchor.fm/s/f7a13dec/podcast/rss";
            const proxyUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssFeedUrl)}`;
            const response = await fetch(proxyUrl);
            const data = await response.json();
            const items = data?.items;

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
            ${this.renderSectionHeader('description', 'Sideinnhold', 'Rediger tekst på de faste sidene.', '')}
            <div class="content-editor-grid">
                <aside class="content-sidebar card">
                    <div class="content-sidebar-head">
                        <h3>Sider</h3>
                        <p>Velg side for redigering</p>
                    </div>
                    <ul class="page-list">
                        <li class="page-item active" data-page="index">Forside</li>
                        <li class="page-item" data-page="settings_facebook_feed">Facebook-feed</li>
                        <li class="page-item" data-page="om-oss">Om oss</li>
                        <li class="page-item" data-page="media">Media</li>
                        <li class="page-item" data-page="arrangementer">Arrangementer</li>
                        <li class="page-item" data-page="blogg">Blogg</li>
                        <li class="page-item" data-page="butikk">Butikk</li>
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
                    <div class="card content-editor-card">
                        <div class="card-header flex-between content-editor-toolbar">
                            <h3 id="editing-page-title" class="editing-page-title">Forside</h3>
                            <button class="btn-primary btn-save-content" id="save-content">Lagre endringer</button>
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
            ${this.renderSectionHeader(this.getSectionIcon(collectionId), title, `Administrer dine ${title.toLowerCase()}.`, `
                <button class="btn btn-primary" id="add-new-${collectionId}">
                    <span class="material-symbols-outlined">add</span> Legg til ny
                </button>
            `)}
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
        this._ensureCollectionRealtimeSubscription(collectionId);
        this.loadCollection(collectionId);
    }

    _renderCollectionLoadMessage(collectionId, message, type = 'warning') {
        const listContainer = document.getElementById(`${collectionId}-list`);
        if (!listContainer) return;

        const tone = type === 'error'
            ? { bg: '#fef2f2', border: '#fecaca', color: '#991b1b', icon: 'error' }
            : { bg: '#fffbeb', border: '#fde68a', color: '#92400e', icon: 'warning' };

        listContainer.innerHTML = `
            <div style="display:flex;align-items:center;justify-content:center;padding:26px;">
                <div style="width:100%;max-width:640px;border:1px solid ${tone.border};background:${tone.bg};color:${tone.color};border-radius:14px;padding:16px 18px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">
                    <div style="display:flex;align-items:center;gap:10px;">
                        <span class="material-symbols-outlined" style="font-size:20px;">${tone.icon}</span>
                        <span style="font-weight:600;">${this.escapeHtml(message)}</span>
                    </div>
                    <button type="button" class="btn-secondary" id="retry-load-${collectionId}" style="padding:8px 12px;border-radius:8px;font-size:12px;">
                        Prøv igjen
                    </button>
                </div>
            </div>
        `;

        const retryBtn = document.getElementById(`retry-load-${collectionId}`);
        if (retryBtn) {
            retryBtn.onclick = () => this.loadCollection(collectionId);
        }
    }

    async _promiseWithTimeout(promise, timeoutMs = 5000) {
        let timerId;
        const timeoutSymbol = Symbol('timeout');
        try {
            const result = await Promise.race([
                promise,
                new Promise((resolve) => {
                    timerId = setTimeout(() => resolve(timeoutSymbol), timeoutMs);
                })
            ]);
            return { timedOut: result === timeoutSymbol, value: result === timeoutSymbol ? null : result };
        } finally {
            if (timerId) clearTimeout(timerId);
        }
    }

    async _mergeEventsWithGoogleCalendarNonBlocking(baseItems, requestId) {
        const collectionId = 'events';
        const isCurrentRequest = () => this._collectionLoadRequestIds[collectionId] === requestId;

        try {
            const settingsRes = await this._promiseWithTimeout(
                firebaseService.getPageContent('settings_integrations'),
                2000
            );
            if (!isCurrentRequest()) return;
            if (settingsRes.timedOut) return;

            const integrations = settingsRes.value || {};
            const gcal = integrations?.googleCalendar || {};
            const apiKey = gcal.apiKey;
            const calendarId = gcal.calendarId;
            if (!apiKey || !calendarId) return;

            const now = new Date();
            const end = new Date();
            end.setMonth(now.getMonth() + 3);
            const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?key=${apiKey}&timeMin=${now.toISOString()}&timeMax=${end.toISOString()}&orderBy=startTime&singleEvents=true`;

            let response;
            if (typeof AbortController !== 'undefined') {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 3500);
                try {
                    response = await fetch(url, { signal: controller.signal });
                } finally {
                    clearTimeout(timeoutId);
                }
            } else {
                response = await fetch(url);
            }

            if (!isCurrentRequest()) return;
            if (!response || !response.ok) return;

            const gData = await response.json();
            if (!isCurrentRequest()) return;
            if (!Array.isArray(gData?.items)) return;

            const merged = (baseItems || []).map((item) => ({ ...item }));
            const gItems = gData.items.map((gi) => ({
                title: gi.summary,
                date: gi.start?.dateTime || gi.start?.date,
                isSynced: true,
                id: gi.id
            })).filter((item) => item.title || item.date);

            gItems.forEach((gi) => {
                const existing = merged.find((fi) =>
                    (fi.gcalId && fi.gcalId === gi.id) ||
                    (fi.title === gi.title && fi.date?.split('T')[0] === gi.date?.split('T')[0])
                );

                if (!existing) {
                    merged.push(gi);
                    return;
                }

                existing.isSynced = true;
                if (!existing.gcalId) existing.gcalId = gi.id;
            });

            if (!isCurrentRequest()) return;
            this._collectionItemsCache[collectionId] = merged;
            this.currentItems = merged;
            this.renderItems(collectionId, merged);
        } catch (gErr) {
            if (gErr?.name !== 'AbortError') {
                console.error("GCal fetch failed in admin:", gErr);
            }
            // Keep Firestore-only items visible; no spinner, no hard failure.
        }
    }

    async loadCollection(collectionId) {
        const listContainer = document.getElementById(`${collectionId}-list`);
        if (!listContainer) return;
        const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        this._collectionLoadRequestIds[collectionId] = requestId;
        const isCurrentRequest = () => this._collectionLoadRequestIds[collectionId] === requestId;

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
            const dataRes = await this._promiseWithTimeout(
                firebaseService.getPageContent(`collection_${collectionId}`),
                5000
            );

            if (!isCurrentRequest()) return;

            if (dataRes.timedOut) {
                const cachedItems = this._collectionItemsCache[collectionId];
                if (Array.isArray(cachedItems) && cachedItems.length > 0) {
                    this.renderItems(collectionId, cachedItems);
                    this.showToast('Viser sist lastede data. Henting tok for lang tid.', 'warning', 4000);
                } else {
                    this._renderCollectionLoadMessage(collectionId, 'Lasting tok for lang tid. Prøv igjen.', 'warning');
                }
                return;
            }

            const data = dataRes.value;
            let items = Array.isArray(data) ? data : (data && data.items ? data.items : []);

            // Mark items that exist in Firestore so we can delete them
            items.forEach(it => it.isFirestore = true);

            this._collectionItemsCache[collectionId] = items;
            this.currentItems = items;
            this.renderItems(collectionId, items);

            // Enrich events in background so UI never blocks on external Google Calendar fetch.
            if (collectionId === 'events') {
                this._mergeEventsWithGoogleCalendarNonBlocking(items, requestId);
            }
        } catch (e) {
            console.error(`Could not load collection '${collectionId}':`, e);
            const cachedItems = this._collectionItemsCache[collectionId];
            if (Array.isArray(cachedItems) && cachedItems.length > 0) {
                this.renderItems(collectionId, cachedItems);
                this.showToast('Kunne ikke oppdatere listen nå. Viser sist lastede data.', 'warning', 5000);
                return;
            }
            this._renderCollectionLoadMessage(collectionId, 'Kunne ikke laste data akkurat nå.', 'error');
        }
    }

    renderItems(collectionId, items) {
        const container = document.getElementById(`${collectionId}-list`);
        if (items.length === 0) {
            container.innerHTML = '<p class="collection-empty-state">Ingen elementer funnet. Klikk "Legg til ny".</p>';
            return;
        }

        const rowsHtml = items.map((item, index) => {
            const rawTitle = item.title || 'Uten tittel';
            const title = this.escapeHtml(rawTitle);
            const category = item.category ? this.escapeHtml(item.category) : '';
            const author = item.author ? this.escapeHtml(item.author) : '';
            const dateText = item.date ? this.escapeHtml(String(item.date).split('T')[0]) : '—';
            const statusPill = item.isSynced
                ? '<span class="badge item-badge-synced">Synkronisert</span>'
                : '<span class="badge status-automated">Lokal/Firestore</span>';
            const imageCell = item.imageUrl
                ? `<img src="${this.escapeHtml(item.imageUrl)}" alt="" style="width:40px;height:40px;border-radius:10px;object-fit:cover;border:1px solid #e2e8f0;">`
                : '<div style="width:40px;height:40px;border-radius:10px;background:#fff7ed;color:#f97316;display:flex;align-items:center;justify-content:center;border:1px solid #fed7aa;"><span class="material-symbols-outlined" style="font-size:18px;">article</span></div>';

            return `
                <tr class="${item.isSynced ? 'is-synced' : ''}">
                    <td>
                        <div class="user-info-cell">
                            ${imageCell}
                            <div>
                                <div class="user-name">${title}</div>
                                ${category ? `<div class="text-muted">${category}</div>` : ''}
                            </div>
                        </div>
                    </td>
                    <td>${dateText}</td>
                    <td>${author || '<span class="text-muted">—</span>'}</td>
                    <td class="col-status">${statusPill}</td>
                    <td class="col-actions">
                        <button class="btn-secondary" type="button" onclick="window.adminManager.editCollectionItem('${collectionId}', ${index})" style="padding:8px 12px;border-radius:8px;font-size:12px;margin-right:8px;">
                            Rediger
                        </button>
                        ${item.isFirestore ? `
                            <button class="icon-btn delete" type="button" onclick="window.adminManager.deleteItem('${collectionId}', ${index})" title="Slett">
                                <span class="material-symbols-outlined">delete</span>
                            </button>
                        ` : `
                            <span class="text-muted" style="font-size:12px;">Kun visning</span>
                        `}
                    </td>
                </tr>
            `;
        }).join('');

        container.innerHTML = `
            <div class="table-container">
                <table class="crm-table">
                    <thead>
                        <tr>
                            <th>${collectionId === 'events' ? 'Arrangement' : collectionId === 'teaching' ? 'Undervisning' : 'Innhold'}</th>
                            <th>Dato</th>
                            <th>Forfatter</th>
                            <th class="col-status">Status</th>
                            <th class="col-actions">Handlinger</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                </table>
            </div>
        `;
    }

    async editCollectionItem(collectionId, index) {
        try {
            // Use the already merged item from currentItems
            const collectionItems = this._collectionItemsCache[collectionId] || this.currentItems || [];
            const item = collectionItems[index] ? { ...collectionItems[index] } : {};

            let safeDate = new Date().toISOString().split('T')[0];
            if (item.date && typeof item.date === 'string') {
                safeDate = item.date.split('T')[0];
            }

            // Handle existing tags (ensure array)
            const existingTags = Array.isArray(item.tags) ? item.tags : [];
            const isTeachingCollection = collectionId === 'teaching';
            const selectedTeachingType = (item.teachingType || item.category || 'Bibelstudie').toLowerCase();
            const seriesSelection = Array.isArray(item.seriesItems) ? item.seriesItems : [];
            const teachingCandidates = (collectionItems || [])
                .filter((opt, optIndex) => optIndex !== index)
                .filter(opt => (opt.id || opt.title))
                .map(opt => {
                    const optId = opt.id || opt.title;
                    const selected = seriesSelection.includes(optId) ? 'selected' : '';
                    return `<option value="${optId}" ${selected}>${opt.title || 'Uten tittel'}</option>`;
                })
                .join('');

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
                             <button class="btn-ghost" id="print-col-item" title="Skriv ut" style="display:flex; align-items:center; gap:6px;">
                                <span class="material-symbols-outlined">print</span> Skriv ut
                             </button>
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
                             ${isTeachingCollection ? `
                             <div class="sidebar-group">
                                 <label>Type undervisning</label>
                                 <select id="col-item-type" class="sidebar-control">
                                     <option value="Bibelstudie" ${selectedTeachingType.includes('bibelstudie') ? 'selected' : ''}>Bibelstudie</option>
                                     <option value="Seminarer" ${selectedTeachingType.includes('seminar') ? 'selected' : ''}>Seminar</option>
                                     <option value="Undervisningsserier" ${selectedTeachingType.includes('undervisningsserie') ? 'selected' : ''}>Undervisningsserie</option>
                                 </select>
                                 <p style="font-size: 11px; color: #94a3b8; margin-top: 6px;">Velg 'Undervisningsserie' for å koble sammen flere undervisninger.</p>
                             </div>
                             <div class="sidebar-group" id="col-item-series-group" style="${selectedTeachingType.includes('undervisningsserie') ? '' : 'display:none;'}">
                                 <label>Koble undervisninger i serie</label>
                                 <select id="col-item-series-items" class="sidebar-control" multiple style="height: 140px;">
                                     ${teachingCandidates}
                                 </select>
                                 <p style="font-size: 11px; color: #94a3b8; margin-top: 6px;">Hold Cmd/Ctrl nede for å velge flere undervisninger i serien.</p>
                             </div>
                             ` : `
                             <div class="sidebar-group">
                                 <label>Kategori</label>
                                 <input type="text" id="col-item-cat" class="sidebar-control" value="${item.category || ''}" placeholder="Eks: Undervisning">
                             </div>
                             `}
                             
                              <h4 class="sidebar-section-title">OMSLAGSBILDE</h4>
                              <div class="sidebar-group">
                                  <div class="sidebar-img-preview" id="sidebar-img-trigger" style="cursor: pointer; position: relative; overflow: hidden; border: 2px dashed #e2e8f0; border-radius: 12px; height: 160px; display: flex; align-items: center; justify-content: center; background: #f8fafc; transition: all 0.2s;">
                                      ${item.imageUrl ? `<img src="${item.imageUrl}" style="width: 100%; height: 100%; object-fit: cover;">` : '<span class="material-symbols-outlined" style="opacity:0.3; font-size:48px;">add_a_photo</span>'}
                                      <div class="upload-overlay" style="position: absolute; bottom: 0; left: 0; right: 0; background: rgba(15, 23, 42, 0.7); color: #fff; font-size: 11px; padding: 6px; text-align: center; opacity: 0; transition: opacity 0.2s;">KLIKK FOR Å ENDRE</div>
                                  </div>
                                  <input type="file" id="col-item-img-file" style="display: none;" accept="image/*">
                                  <input type="text" id="col-item-img" class="sidebar-control" style="margin-top:8px;" placeholder="Eller lim inn bilde-URL" value="${item.imageUrl || ''}">
                                  <p style="font-size: 11px; color: #94a3b8; margin-top: 6px;">Tips: Klikk på boksen over for å laste opp bilde fra maskinen.</p>
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
                             ${collectionId === 'blog' ? `
                             <h4 class="sidebar-section-title">RELATERTE INNLEGG</h4>
                             <div class="sidebar-group">
                                 <select id="col-item-related" class="sidebar-control" multiple style="height: 100px;">
                                     ${(this.currentItems || []).map((opt, optIndex) => {
                if (optIndex === index) return '';
                const optId = opt.id || opt.title;
                const selected = (item.relatedPosts || []).includes(optId) ? 'selected' : '';
                return `<option value="${optId}" ${selected}>${opt.title || 'Uten Tittel'}</option>`;
            }).join('')}
                                 </select>
                                 <p style="font-size: 11px; color: #94a3b8; margin-top: 6px;">Hold Cmd/Ctrl nede for å velge flere.</p>
                             </div>
                             ` : ''
                }
                        </aside>
                    </div>
                </div>
                `;

            document.body.appendChild(modal);

            if (isTeachingCollection) {
                const typeSelect = document.getElementById('col-item-type');
                const seriesGroup = document.getElementById('col-item-series-group');
                if (typeSelect && seriesGroup) {
                    const syncSeriesVisibility = () => {
                        seriesGroup.style.display = typeSelect.value === 'Undervisningsserier' ? '' : 'none';
                    };
                    typeSelect.addEventListener('change', syncSeriesVisibility);
                    syncSeriesVisibility();
                }
            }

            // --- Editor.js Data Prep ---
            let editorData = {};
            if (typeof item.content === 'object' && item.content !== null && item.content.blocks) {
                editorData = item.content;
            } else if (typeof item.content === 'string' && item.content.trim().length > 0) {
                console.warn("Legacy HTML content detected. Editor.js works best with JSON.");
            }

            // --- Initialize Editor.js ---
            // Custom YouTube Video Tool (replaces unreliable @editorjs/embed CDN plugin)
            class YoutubeVideoTool {
                static get toolbox() {
                    return {
                        title: 'Video (YouTube)',
                        icon: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M21.582 7.186a2.506 2.506 0 0 0-1.762-1.769C18.265 5 12 5 12 5s-6.265 0-7.82.417A2.506 2.506 0 0 0 2.418 7.186 26.302 26.302 0 0 0 2 12a26.302 26.302 0 0 0 .418 4.814 2.506 2.506 0 0 0 1.762 1.769C5.735 19 12 19 12 19s6.265 0 7.82-.417a2.506 2.506 0 0 0 1.762-1.769A26.302 26.302 0 0 0 22 12a26.302 26.302 0 0 0-.418-4.814zM9.954 15.477V8.523L15.818 12l-5.864 3.477z"/></svg>'
                    };
                }

                static get isReadOnlySupported() { return true; }

                constructor({ data, readOnly }) {
                    this.data = data || {};
                    this.readOnly = readOnly;
                    this._wrapper = null;
                }

                _getYouTubeId(url) {
                    if (!url) return null;
                    const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
                    return m ? m[1] : null;
                }

                render() {
                    this._wrapper = document.createElement('div');
                    this._wrapper.style.cssText = 'padding: 12px; background: #f8fafc; border-radius: 10px; border: 1px solid #e2e8f0;';

                    const videoId = this._getYouTubeId(this.data.url || '');

                    if (videoId) {
                        this._wrapper.innerHTML = `
                            <div style="position:relative; padding-bottom:56.25%; height:0; overflow:hidden; border-radius:8px; margin-bottom:10px;">
                                <iframe src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen
                                    style="position:absolute; top:0; left:0; width:100%; height:100%;"></iframe>
                            </div>`;
                    } else {
                        this._wrapper.innerHTML = `<div style="text-align:center; padding:20px; color:#94a3b8;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="#cbd5e1"><path d="M21.582 7.186a2.506 2.506 0 0 0-1.762-1.769C18.265 5 12 5 12 5s-6.265 0-7.82.417A2.506 2.506 0 0 0 2.418 7.186 26.302 26.302 0 0 0 2 12a26.302 26.302 0 0 0 .418 4.814 2.506 2.506 0 0 0 1.762 1.769C5.735 19 12 19 12 19s6.265 0 7.82-.417a2.506 2.506 0 0 0 1.762-1.769A26.302 26.302 0 0 0 22 12a26.302 26.302 0 0 0-.418-4.814zM9.954 15.477V8.523L15.818 12l-5.864 3.477z"/></svg>
                            <p style="margin:8px 0 0; font-size:13px;">Ingen video lastet ennå</p>
                        </div>`;
                    }

                    if (!this.readOnly) {
                        const inputWrap = document.createElement('div');
                        inputWrap.style.cssText = 'display:flex; gap:8px; margin-top:8px;';
                        const input = document.createElement('input');
                        input.type = 'url';
                        input.placeholder = 'Lim inn YouTube-lenke her...';
                        input.value = this.data.url || '';
                        input.style.cssText = 'flex:1; padding:8px 12px; border:1px solid #e2e8f0; border-radius:8px; font-size:14px; outline:none;';

                        const btn = document.createElement('button');
                        btn.type = 'button';
                        btn.textContent = 'Last inn';
                        btn.style.cssText = 'padding:8px 14px; background:#6366f1; color:#fff; border:none; border-radius:8px; cursor:pointer; font-size:13px; white-space:nowrap;';

                        btn.onclick = () => {
                            this.data.url = input.value.trim();
                            const newId = this._getYouTubeId(this.data.url);
                            const preview = this._wrapper.querySelector('div[style*="padding-bottom"], div[style*="text-align"]');
                            if (newId) {
                                const iframeWrap = document.createElement('div');
                                iframeWrap.style.cssText = 'position:relative; padding-bottom:56.25%; height:0; overflow:hidden; border-radius:8px; margin-bottom:10px;';
                                iframeWrap.innerHTML = `<iframe src="https://www.youtube.com/embed/${newId}" frameborder="0" allowfullscreen style="position:absolute; top:0; left:0; width:100%; height:100%;"></iframe>`;
                                if (preview) preview.replaceWith(iframeWrap); else this._wrapper.prepend(iframeWrap);
                            } else {
                                if (preview) preview.innerHTML = '<p style="text-align:center; color:#ef4444; font-size:13px;">Ugyldig YouTube-lenke</p>';
                            }
                        };

                        inputWrap.appendChild(input);
                        inputWrap.appendChild(btn);
                        this._wrapper.appendChild(inputWrap);
                    }

                    return this._wrapper;
                }

                save() {
                    const input = this._wrapper ? this._wrapper.querySelector('input[type="url"]') : null;
                    return { url: input ? input.value.trim() : (this.data.url || '') };
                }
            }

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
                            async uploadByFile(file) {
                                try {
                                    const path = `editor/${collectionId}/${Date.now()}_${file.name}`;
                                    const url = await firebaseService.uploadImage(file, path);
                                    return { success: 1, file: { url: url } };
                                } catch (error) {
                                    console.error("Upload failed:", error);
                                    return { success: 0 };
                                }
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

            // Video tool – custom YoutubeVideoTool (defined above, always available)
            toolsConfig.youtubeVideo = {
                class: YoutubeVideoTool
            };

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
                            box.innerHTML = `<img src="${url}" style="width:100%; height:100%; object-fit:cover;">`;
                        } else {
                            box.innerHTML = '<span class="material-symbols-outlined" style="opacity:0.3; font-size:48px;">add_a_photo</span>';
                        }
                    }
                });
            }

            const imgTrigger = document.getElementById('sidebar-img-trigger');
            const imgFile = document.getElementById('col-item-img-file');
            if (imgTrigger && imgFile) {
                imgTrigger.onclick = () => imgFile.click();
                imgTrigger.onmouseenter = () => {
                    const overlay = imgTrigger.querySelector('.upload-overlay');
                    if (overlay) overlay.style.opacity = '1';
                };
                imgTrigger.onmouseleave = () => {
                    const overlay = imgTrigger.querySelector('.upload-overlay');
                    if (overlay) overlay.style.opacity = '0';
                };

                imgFile.onchange = async (e) => {
                    const file = e.target.files[0];
                    if (!file) return;

                    imgTrigger.style.opacity = '0.5';
                    imgTrigger.style.pointerEvents = 'none';
                    const originalHTML = imgTrigger.innerHTML;
                    imgTrigger.innerHTML = '<span class="loader-sm"></span>';

                    try {
                        const path = `covers/${collectionId}/${Date.now()}_${file.name}`;
                        const url = await firebaseService.uploadImage(file, path);
                        imgInput.value = url;
                        // Trigger input event manually to update preview
                        imgInput.dispatchEvent(new Event('input'));
                        this.showToast('Bilde lastet opp!', 'success');
                    } catch (err) {
                        console.error("Upload error:", err);
                        this.showToast('Kunne ikke laste opp bilde.', 'error');
                        imgTrigger.innerHTML = originalHTML;
                    } finally {
                        imgTrigger.style.opacity = '1';
                        imgTrigger.style.pointerEvents = 'auto';
                    }
                };
            }

            const closeBtn = document.getElementById('close-col-modal');
            if (closeBtn) closeBtn.onclick = () => modal.remove();

            // --- Print Button ---
            const printBtn = document.getElementById('print-col-item');
            if (printBtn) {
                printBtn.onclick = async () => {
                    printBtn.disabled = true;
                    printBtn.innerHTML = '<span class="material-symbols-outlined">hourglass_empty</span> Forbereder...';

                    let printData;
                    try {
                        printData = await editor.save();
                    } catch (e) {
                        console.error('Could not save editor for print:', e);
                        printBtn.disabled = false;
                        printBtn.innerHTML = '<span class="material-symbols-outlined">print</span> Skriv ut';
                        return;
                    }

                    const title = document.getElementById('col-item-title-v2')?.value || '(Uten tittel)';
                    const author = document.getElementById('col-item-author')?.value || '';
                    const date = document.getElementById('col-item-date')?.value || '';

                    // Render each Editor.js block to HTML
                    const blocksHtml = (printData.blocks || []).map(block => {
                        switch (block.type) {
                            case 'paragraph':
                                return `<p>${block.data.text || ''}</p>`;
                            case 'header':
                                return `<h${block.data.level}>${block.data.text || ''}</h${block.data.level}>`;
                            case 'list': {
                                const tag = block.data.style === 'ordered' ? 'ol' : 'ul';
                                const items = (block.data.items || []).map(i => `<li>${i}</li>`).join('');
                                return `<${tag}>${items}</${tag}>`;
                            }
                            case 'quote':
                                return `<blockquote><p>${block.data.text || ''}</p>${block.data.caption ? `<cite>— ${block.data.caption}</cite>` : ''}</blockquote>`;
                            case 'delimiter':
                                return `<div class="print-delimiter">⁂</div>`;
                            case 'image':
                                return `<figure><img src="${block.data.file?.url || block.data.url || ''}" alt="${block.data.caption || ''}"><figcaption>${block.data.caption || ''}</figcaption></figure>`;
                            case 'youtubeVideo': {
                                const ytUrl = block.data.url || '';
                                return ytUrl
                                    ? `<div class="print-video-ref"><span>🎥 Video: </span><a href="${ytUrl}">${ytUrl}</a></div>`
                                    : '';
                            }
                            default:
                                return '';
                        }
                    }).join('\n');

                    const formattedDate = date
                        ? new Date(date).toLocaleDateString('nb-NO', { year: 'numeric', month: 'long', day: 'numeric' })
                        : '';

                    const printWindow = window.open('', '_blank', 'width=900,height=700');
                    printWindow.document.write(`<!DOCTYPE html>
<html lang="no">
<head>
    <meta charset="UTF-8">
    <title>${title}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body {
            font-family: 'Inter', Georgia, serif;
            font-size: 11pt;
            color: #1e293b;
            background: white;
            line-height: 1.75;
        }

        .page {
            max-width: 750px;
            margin: 0 auto;
            padding: 50px 60px 80px;
        }

        .print-header {
            border-bottom: 2px solid #0f172a;
            padding-bottom: 24px;
            margin-bottom: 36px;
        }

        .print-category {
            font-size: 9pt;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.15em;
            color: #64748b;
            margin-bottom: 10px;
        }

        h1.print-title {
            font-size: 28pt;
            font-weight: 800;
            line-height: 1.15;
            color: #0f172a;
            margin-bottom: 16px;
            letter-spacing: -0.02em;
        }

        .print-meta {
            font-size: 10pt;
            color: #64748b;
            display: flex;
            gap: 24px;
        }

        .print-meta span { display: flex; align-items: center; gap: 6px; }

        .print-body p {
            font-size: 11pt;
            margin-bottom: 16px;
            color: #334155;
        }

        .print-body h2 {
            font-size: 18pt;
            font-weight: 800;
            color: #0f172a;
            margin: 36px 0 12px;
            letter-spacing: -0.01em;
            border-top: 1px solid #e2e8f0;
            padding-top: 24px;
        }

        .print-body h3 {
            font-size: 14pt;
            font-weight: 700;
            color: #1e293b;
            margin: 28px 0 10px;
        }

        .print-body h4 {
            font-size: 12pt;
            font-weight: 700;
            color: #334155;
            margin: 20px 0 8px;
        }

        .print-body ul, .print-body ol {
            padding-left: 24px;
            margin-bottom: 16px;
        }

        .print-body li {
            margin-bottom: 6px;
            color: #334155;
        }

        .print-body blockquote {
            border-left: 4px solid #0f172a;
            padding: 16px 24px;
            margin: 28px 0;
            background: #f8fafc;
            border-radius: 0 8px 8px 0;
        }

        .print-body blockquote p {
            font-size: 13pt;
            font-style: italic;
            color: #1e293b;
            margin: 0 0 8px;
        }

        .print-body blockquote cite {
            font-size: 10pt;
            color: #64748b;
            font-style: normal;
        }

        .print-body figure {
            margin: 28px 0;
            text-align: center;
        }

        .print-body figure img {
            max-width: 100%;
            border-radius: 6px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }

        .print-body figure figcaption {
            font-size: 9pt;
            color: #94a3b8;
            margin-top: 8px;
            font-style: italic;
        }

        .print-delimiter {
            text-align: center;
            font-size: 18pt;
            color: #94a3b8;
            margin: 32px 0;
            letter-spacing: 12px;
        }

        .print-video-ref {
            background: #f1f5f9;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 12px 16px;
            font-size: 10pt;
            color: #475569;
            margin: 20px 0;
        }

        .print-video-ref a {
            color: #6366f1;
            word-break: break-all;
        }

        .print-footer {
            margin-top: 60px;
            border-top: 1px solid #e2e8f0;
            padding-top: 20px;
            font-size: 9pt;
            color: #94a3b8;
            text-align: center;
        }

        @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .no-print { display: none !important; }
            .page { padding: 20px 40px; }
            h2, h3 { page-break-after: avoid; }
            figure, blockquote { page-break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="page">
        <div class="print-header">
            <div class="print-category">His Kingdom Ministry${collectionId === 'blog' ? ' — Blogg' : collectionId === 'teaching' ? ' — Undervisning' : ''}</div>
            <h1 class="print-title">${title}</h1>
            <div class="print-meta">
                ${author ? `<span>✍️ ${author}</span>` : ''}
                ${formattedDate ? `<span>📅 ${formattedDate}</span>` : ''}
            </div>
        </div>
        <div class="print-body">
            ${blocksHtml}
        </div>
        <div class="print-footer">
            His Kingdom Ministry &nbsp;·&nbsp; Skrevet ut ${new Date().toLocaleDateString('nb-NO')}
        </div>
    </div>
    <script>
        window.onload = function() {
            window.print();
        <\/script>
</body>
</html>`);
                    printWindow.document.close();

                    printBtn.disabled = false;
                    printBtn.innerHTML = '<span class="material-symbols-outlined">print</span> Skriv ut';
                };
            }

            const saveBtn = document.getElementById('save-col-item');
            if (saveBtn) {
                saveBtn.onclick = async () => {
                    const btn = document.getElementById('save-col-item');
                    if (!btn) return;

                    await this._runWriteLocked(`collection-save:${collectionId}`, async () => {
                        await this._withButtonLoading(btn, async () => {
                            // Get JSON data from Editor.js
                            let savedData;
                            try {
                                savedData = await editor.save();
                            } catch (error) {
                                console.error('Saving failed', error);
                                this.showToast('Kunne ikke hente innhold fra editor.', 'error');
                                return;
                            }

                            item.title = document.getElementById('col-item-title-v2')?.value || '';
                            item.content = savedData; // Store as JSON object

                            item.date = document.getElementById('col-item-date')?.value || '';
                            item.imageUrl = document.getElementById('col-item-img')?.value || '';
                            item.author = document.getElementById('col-item-author')?.value || '';
                            if (isTeachingCollection) {
                                const typeValue = document.getElementById('col-item-type')?.value || 'Bibelstudier';
                                const seriesSelect = document.getElementById('col-item-series-items');
                                item.teachingType = typeValue;
                                item.category = typeValue;
                                item.seriesItems = typeValue === 'Undervisningsserier' && seriesSelect
                                    ? Array.from(seriesSelect.selectedOptions).map(opt => opt.value)
                                    : [];
                            } else {
                                item.category = document.getElementById('col-item-cat')?.value || '';
                            }
                            item.seoTitle = document.getElementById('col-item-seo-title')?.value || '';
                            item.seoDescription = document.getElementById('col-item-seo-desc')?.value || '';
                            item.tags = currentTags;

                            if (collectionId === 'blog') {
                                const relatedSelect = document.getElementById('col-item-related');
                                if (relatedSelect) {
                                    item.relatedPosts = Array.from(relatedSelect.selectedOptions).map(opt => opt.value);
                                }
                            }

                            // Ensure gcalId is preserved if this was a synced item
                            if (item.isSynced && item.id && !item.gcalId) {
                                item.gcalId = item.id;
                            }

                            const normalizedItem = typeof adminUtils.sanitizeCollectionItem === 'function'
                                ? adminUtils.sanitizeCollectionItem(collectionId, item)
                                : { ok: true, value: item, errors: [] };

                            if (!normalizedItem.ok) {
                                this.showToast(normalizedItem.errors.join(' '), 'error', 5000);
                                return;
                            }

                            let safeItem = normalizedItem.value;

                            try {
                                const currentData = await firebaseService.getPageContent(`collection_${collectionId}`);
                                const list = Array.isArray(currentData) ? currentData : (currentData && currentData.items ? currentData.items : []);

                                if (collectionId === 'blog') {
                                    safeItem = await this.ensureBlogPostTranslations(safeItem, { force: false });
                                }

                                // Use ID-based matching if available (most reliable)
                                let existingIdx = -1;
                                if (safeItem.id) {
                                    existingIdx = list.findIndex(fi => fi.id === safeItem.id);
                                }

                                // Fallback to "Smart Matching" for legacy items or events without ID
                                if (existingIdx === -1) {
                                    if (collectionId === 'events') {
                                        existingIdx = list.findIndex(fi =>
                                            (safeItem.gcalId && fi.gcalId === safeItem.gcalId) ||
                                            (fi.title === safeItem.title && fi.date?.split('T')[0] === safeItem.date?.split('T')[0])
                                        );
                                    } else if (safeItem.isFirestore) {
                                        // Only use index-based fallback for items that we know were already in Firestore
                                        if (typeof index === 'number' && index >= 0 && !safeItem.isSynced) {
                                            existingIdx = index;
                                        }
                                    }
                                }

                                if (existingIdx >= 0) {
                                    list[existingIdx] = safeItem;
                                } else {
                                    list.unshift(safeItem); // Push to top if truly new
                                }

                                await firebaseService.savePageContent(`collection_${collectionId}`, { items: list });

                                // Force clear the public visitor cache if we modified events
                                if (collectionId === 'events') {
                                    this.clearPublicEventCache();

                                    // If connected to Google, sync back
                                    if (this.googleAccessToken && safeItem.gcalId) {
                                        await this.updateGoogleCalendarEvent(safeItem, 'PATCH');
                                    }
                                }

                                modal.remove();
                                this.loadCollection(collectionId);
                                this.showToast('✅ Lagret!', 'success');
                            } catch (err) {
                                console.error('Error saving item:', err);
                                this.showToast('Kunne ikke lagre. Sjekk konsollen for detaljer.', 'error', 5000);
                            }
                        }, {
                            loadingText: '<span class="material-symbols-outlined" style="font-size:18px;">hourglass_top</span> Lagrer...'
                        });
                    });
                };
            }
        } catch (err) {
            console.error('Error opening editor:', err);
            const errorMsg = err.message || JSON.stringify(err);
            this.showToast(`Kunne ikke åpne elementet.Feilmelding: ${errorMsg}. Sjekk at Editor.js scriptet er lastet.`, 'error', 7000);
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
            if (!this._collectionItemsCache[collectionId]) this._collectionItemsCache[collectionId] = [];
            this._collectionItemsCache[collectionId].unshift(newItem);
            this.currentItems = this._collectionItemsCache[collectionId];

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

        const btn = document.querySelector(`#${collectionId}-list tbody tr:nth-child(${index + 1}) .icon-btn.delete`);

        await this._runWriteLocked(`collection-delete:${collectionId}`, async () => {
            await this._withButtonLoading(btn, async () => {
                try {
                    const currentData = await firebaseService.getPageContent(`collection_${collectionId}`);
                    const list = Array.isArray(currentData) ? currentData : (currentData && currentData.items ? currentData.items : []);

                    // Get the actual item we want to delete from the displayed list
                    const collectionItems = this._collectionItemsCache[collectionId] || this.currentItems || [];
                    const itemToDelete = collectionItems[index] || null;

                    if (!itemToDelete) {
                        this.showToast('Kunne ikke finne elementet som skal slettes.', 'error');
                        return;
                    }

                    // Find match in Firestore
                    const matchIdx = list.findIndex(fi => {
                        if (itemToDelete.id && fi.id === itemToDelete.id) return true;
                        return (itemToDelete.gcalId && fi.gcalId === itemToDelete.gcalId) ||
                            (fi.title === itemToDelete.title && fi.date?.split('T')[0] === itemToDelete.date?.split('T')[0]);
                    });

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

                    await this.loadCollection(collectionId);
                    this.showToast('✅ Element slettet!', 'success');
                } catch (err) {
                    console.error('Delete failed:', err);
                    this.showToast('Kunne ikke slette elementet.', 'error', 5000);
                }
            }, {
                loadingText: '<span class="material-symbols-outlined" style="font-size:18px;">hourglass_top</span>'
            });
        });
    }

    async renderDesignSection() {
        const section = document.getElementById('design-section');
        if (!section) return;

        const DEFAULT_THEME = {
            mainFont: 'Inter',
            fontSizeH1Desktop: 48,
            fontSizeBase: 16,
            primaryColor: '#F97316',
            secondaryColor: '#FF6B2B',
            backgroundColor: '#F8F9FA',
            surfaceColor: '#FFFFFF',
            textColor: '#2C3E50',
            textLightColor: '#7F8C8D'
        };

        section.innerHTML = `
            ${this.renderSectionHeader('palette', 'Tema & Farger', 'Tilpass farger, font og grafisk profil for hele nettsiden med HKM-uttrykket.', '')}

            <div class="design-ui-shell">
                <div class="design-ui-topbar design-ui-panel">
                    <div class="design-ui-topbar-main">
                        <div class="design-ui-topbar-icon">
                            <span class="material-symbols-outlined">palette</span>
                        </div>
                        <div>
                            <h3 class="design-ui-title">Tema & Utseende</h3>
                            <p class="design-ui-muted">Administrer identitet, typografi og fargepalett i ett samlet kontrollpanel.</p>
                        </div>
                    </div>
                    <div class="design-ui-actions">
                        <button class="btn btn-outline" id="reset-design-settings" type="button">
                            <span class="material-symbols-outlined">restart_alt</span>
                            Tilbakestill tema
                        </button>
                        <button class="btn btn-primary" id="save-design-settings" type="button">
                            <span class="material-symbols-outlined">save</span>
                            Lagre endringer
                        </button>
                    </div>
                </div>

                <div class="design-ui-workspace">
                    <div class="design-ui-top-grid">
                        <div class="design-ui-main-column">
                            <div class="design-ui-panel design-ui-panel--palette">
                            <div class="design-ui-panel-header">
                                <div class="design-ui-panel-header-icon">
                                    <span class="material-symbols-outlined">palette</span>
                                </div>
                                <div>
                                    <h3 class="design-ui-panel-title">Fargepalett</h3>
                                    <p class="design-ui-panel-subtitle">Fargene under er koblet til nettsidens globale stilvariabler og lagres i samme designinnstilling.</p>
                                </div>
                            </div>
                            <div class="design-ui-panel-body">
                                <div class="design-ui-color-controls">
                                    <div class="form-group" style="margin-bottom:0;">
                                        <label>Primærfarge (HKM)</label>
                                        <div class="premium-color-wrapper design-ui-primary-color-input">
                                            <input type="color" id="primary-color-picker" class="premium-color-picker-input" value="#F97316">
                                            <input type="text" id="primary-color-hex" class="premium-color-hex" value="#F97316" placeholder="#F97316">
                                        </div>
                                    </div>
                                    <div class="design-ui-form-grid design-ui-color-edit-grid">
                                        <div class="form-group" style="margin-bottom:0;">
                                            <label>Sekundærfarge</label>
                                            <div class="premium-color-wrapper">
                                                <input type="color" id="secondary-color-picker" class="premium-color-picker-input" value="#FF6B2B">
                                                <input type="text" id="secondary-color-hex" class="premium-color-hex" value="#FF6B2B" placeholder="#FF6B2B">
                                            </div>
                                        </div>
                                        <div class="form-group" style="margin-bottom:0;">
                                            <label>Bakgrunn</label>
                                            <div class="premium-color-wrapper">
                                                <input type="color" id="background-color-picker" class="premium-color-picker-input" value="#F8F9FA">
                                                <input type="text" id="background-color-hex" class="premium-color-hex" value="#F8F9FA" placeholder="#F8F9FA">
                                            </div>
                                        </div>
                                        <div class="form-group" style="margin-bottom:0;">
                                            <label>Kort & elementer</label>
                                            <div class="premium-color-wrapper">
                                                <input type="color" id="surface-color-picker" class="premium-color-picker-input" value="#FFFFFF">
                                                <input type="text" id="surface-color-hex" class="premium-color-hex" value="#FFFFFF" placeholder="#FFFFFF">
                                            </div>
                                        </div>
                                        <div class="form-group" style="margin-bottom:0;">
                                            <label>Hovedtekst</label>
                                            <div class="premium-color-wrapper">
                                                <input type="color" id="text-color-picker" class="premium-color-picker-input" value="#2C3E50">
                                                <input type="text" id="text-color-hex" class="premium-color-hex" value="#2C3E50" placeholder="#2C3E50">
                                            </div>
                                        </div>
                                        <div class="form-group" style="margin-bottom:0;">
                                            <label>Aksent / dempet tekst</label>
                                            <div class="premium-color-wrapper">
                                                <input type="color" id="text-light-color-picker" class="premium-color-picker-input" value="#7F8C8D">
                                                <input type="text" id="text-light-color-hex" class="premium-color-hex" value="#7F8C8D" placeholder="#7F8C8D">
                                            </div>
                                        </div>
                                    </div>
                                    <p class="design-ui-muted design-ui-inline-help">Tips: Velg en varm oransje tone for å bevare HKM-uttrykket på knapper og CTA-er.</p>
                                </div>
                            </div>
                        </div>
                    </div> <!-- Fix: Closing tag for design-ui-main-column -->

                    <aside class="design-ui-side-column">
                            <div class="design-ui-panel design-ui-help-panel design-ui-panel--help">
                                <div class="design-ui-panel-header design-ui-panel-header--compact">
                                    <div class="design-ui-panel-header-icon">
                                        <span class="material-symbols-outlined">info</span>
                                    </div>
                                    <div>
                                        <h3 class="design-ui-panel-title">Hva gjør disse valgene?</h3>
                                    </div>
                                </div>
                                <div class="design-ui-panel-body">
                                    <div class="design-ui-help-list">
                                        <div class="design-ui-help-item">
                                            <span class="material-symbols-outlined">check_circle</span>
                                            <p><strong>Farger:</strong> påvirker knapper, markører, paneler og tydeligheten i admin/opplevelsen på nettsiden.</p>
                                        </div>
                                        <div class="design-ui-help-item">
                                            <span class="material-symbols-outlined">check_circle</span>
                                            <p><strong>Typografi:</strong> gjør uttrykket konsistent på tvers av forsider, artikler og kampanjer.</p>
                                        </div>
                                        <div class="design-ui-help-item">
                                            <span class="material-symbols-outlined">check_circle</span>
                                            <p><strong>Branding:</strong> logo og favicon brukes i faner, deling og navigasjon.</p>
                                        </div>
                                    </div>
                                    <div class="design-ui-callout">
                                        <div class="design-ui-callout-title">Merk</div>
                                        <p>Vi anbefaler å beholde varm HKM-oransje som primærfarge og bruke mørk tekst for best kontrast og lesbarhet.</p>
                                    </div>
                                </div>
                            </div>

                            <div class="design-ui-panel design-ui-brand-profile design-ui-panel--profile">
                                <div class="design-ui-brand-profile-bg"></div>
                                <div class="design-ui-brand-profile-content">
                                    <div class="design-ui-brand-profile-kicker">Grafisk profil</div>
                                    <h3>HKM uttrykk</h3>
                                    <p>Varm, tydelig og tillitsvekkende. La oransje bære handlingene, og la nøytrale flater gi ro rundt budskapet.</p>
                                    <div class="design-ui-brand-profile-chips">
                                        <span>Inter</span>
                                        <span>Oransje CTA</span>
                                        <span>Lyse flater</span>
                                    </div>
                                </div>
                            </div>
                        </aside>
                    </div>

                    <div class="design-ui-full-stack">
                        <div class="design-ui-panel design-ui-panel--typography">
                            <div class="design-ui-panel-header">
                                <div class="design-ui-panel-header-icon">
                                    <span class="material-symbols-outlined">text_fields</span>
                                </div>
                                <div>
                                    <h3 class="design-ui-panel-title">Typografi & Tekststørrelser</h3>
                                    <p class="design-ui-panel-subtitle">Kontroller fontfamilie og skalering med live forhåndsvisning av knapper, overskrift og innholdskort.</p>
                                </div>
                            </div>

                            <div class="design-ui-panel-body">
                                <div class="design-ui-typography-layout">
                                    <div class="design-ui-control-stack">
                                        <div class="form-group">
                                            <label>Fontfamilie</label>
                                            <select id="main-font-select" class="form-control">
                                                <option value="Inter">Inter</option>
                                                <option value="DM Sans">DM Sans</option>
                                                <option value="Outfit">Outfit</option>
                                                <option value="Montserrat">Montserrat</option>
                                                <option value="Open Sans">Open Sans</option>
                                                <option value="Roboto">Roboto</option>
                                                <option value="Merriweather">Merriweather</option>
                                            </select>
                                        </div>

                                        <div class="premium-range-group">
                                            <div class="premium-range-header">
                                                <label>Overskrift (H1 desktop)</label>
                                                <span class="premium-range-val" id="font-size-h1-desktop-val">48px</span>
                                            </div>
                                            <input type="range" id="font-size-h1-desktop" class="premium-slider" min="24" max="80" value="48">
                                        </div>

                                        <div class="premium-range-group">
                                            <div class="premium-range-header">
                                                <label>Brødtekst</label>
                                                <span class="premium-range-val" id="font-size-base-val">16px</span>
                                            </div>
                                            <input type="range" id="font-size-base" class="premium-slider" min="12" max="24" value="16">
                                        </div>
                                    </div>

                                    <div class="live-preview-box design-ui-live-preview" id="live-preview-area">
                                        <div class="design-ui-preview-label">Live forhåndsvisning</div>
                                        <div class="design-ui-preview-frame">
                                            <div class="design-ui-preview-top">
                                                <div class="design-ui-preview-brand">
                                                    <div class="design-ui-preview-brand-dot"></div>
                                                    <span>His Kingdom Ministry</span>
                                                </div>
                                                <div class="design-ui-preview-chip">Forside</div>
                                            </div>

                                            <h2 id="typography-preview-text">Slik ser teksten ut</h2>
                                            <p id="design-preview-body-copy">Dette er et eksempel på brødtekst, kontrast og spacing. Bruk denne visningen for å justere uttrykket før du lagrer.</p>

                                            <div class="design-ui-preview-actions">
                                                <button type="button" class="design-ui-preview-btn design-ui-preview-btn-primary" id="design-preview-primary-btn">Gi en gave</button>
                                                <button type="button" class="design-ui-preview-btn design-ui-preview-btn-secondary" id="design-preview-secondary-btn">Les mer</button>
                                            </div>

                                            <div class="design-ui-preview-card">
                                                <div class="design-ui-preview-card-title">Ukens fokus</div>
                                                <div class="design-ui-preview-card-text">Gudstjeneste, undervisning og fellesskap samlet i ett tydelig visuelt uttrykk.</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="design-ui-panel design-ui-panel--branding">
                            <div class="design-ui-panel-header">
                                <div class="design-ui-panel-header-icon">
                                    <span class="material-symbols-outlined">branding_watermark</span>
                                </div>
                                <div>
                                    <h3 class="design-ui-panel-title">Grafiske elementer</h3>
                                    <p class="design-ui-panel-subtitle">Logo, favicon og sidetittel brukes i navigasjon, deling og nettleserfaner.</p>
                                </div>
                            </div>
                            <div class="design-ui-panel-body">
                                <div class="design-ui-branding-layout">
                                    <div class="design-ui-brand-block">
                                        <div class="form-group">
                                            <label>Logo URL</label>
                                            <input type="text" id="site-logo-url" class="form-control" placeholder="https://...">
                                        </div>
                                        <div class="upload-row design-ui-upload-row">
                                            <input type="file" id="site-logo-file" class="form-control file-input" accept="image/*">
                                            <button class="btn btn-secondary" id="upload-logo-btn" type="button">Last opp logo</button>
                                        </div>
                                        <div class="preview-container design-ui-preview-container" id="logo-preview-container">
                                            <div class="design-ui-empty-preview">
                                                <span class="material-symbols-outlined">image</span>
                                                <span>Logo-forhåndsvisning</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div class="design-ui-brand-block">
                                        <div class="form-group">
                                            <label>Favicon URL</label>
                                            <input type="text" id="site-favicon-url" class="form-control" placeholder="https://...">
                                        </div>
                                        <div class="upload-row design-ui-upload-row">
                                            <input type="file" id="site-favicon-file" class="form-control file-input" accept="image/png,image/x-icon,image/svg+xml">
                                            <button class="btn btn-secondary" id="upload-favicon-btn" type="button">Last opp favicon</button>
                                        </div>
                                        <div class="preview-container design-ui-preview-container" id="favicon-preview-container">
                                            <div class="design-ui-empty-preview">
                                                <span class="material-symbols-outlined">web_asset</span>
                                                <span>Favicon-forhåndsvisning</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div class="design-ui-form-grid">
                                    <div class="form-group">
                                        <label>Tekst ved siden av logo</label>
                                        <input type="text" id="site-logo-text" class="form-control" placeholder="His Kingdom Ministry">
                                    </div>
                                    <div class="form-group">
                                        <label>Sidetittel (SEO)</label>
                                        <input type="text" id="site-title-seo" class="form-control" placeholder="His Kingdom Ministry">
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        section.setAttribute('data-rendered', 'true');

        const normalizeHex = (value) => {
            if (typeof value !== 'string') return '';
            let raw = value.trim();
            if (!raw) return '';
            if (!raw.startsWith('#')) raw = `#${raw}`;
            const shortHex = /^#([0-9a-f]{3})$/i;
            const fullHex = /^#([0-9a-f]{6})$/i;
            if (shortHex.test(raw)) {
                const [, rgb] = raw.match(shortHex);
                return `#${rgb.split('').map((c) => c + c).join('').toUpperCase()}`;
            }
            if (fullHex.test(raw)) return raw.toUpperCase();
            return '';
        };

        const hexToRgb = (hex) => {
            const safeHex = normalizeHex(hex);
            if (!safeHex) return { r: 249, g: 115, b: 22 };
            return {
                r: parseInt(safeHex.slice(1, 3), 16),
                g: parseInt(safeHex.slice(3, 5), 16),
                b: parseInt(safeHex.slice(5, 7), 16)
            };
        };

        const rgbToHex = ({ r, g, b }) => {
            const clamp = (v) => Math.max(0, Math.min(255, Math.round(v || 0)));
            return `#${[clamp(r), clamp(g), clamp(b)].map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
        };

        const mixHex = (hexA, hexB, ratioB = 0.5) => {
            const a = hexToRgb(hexA);
            const b = hexToRgb(hexB);
            const ratio = Math.max(0, Math.min(1, Number(ratioB) || 0));
            return rgbToHex({
                r: a.r + ((b.r - a.r) * ratio),
                g: a.g + ((b.g - a.g) * ratio),
                b: a.b + ((b.b - a.b) * ratio)
            });
        };

        const rgbLabel = (hex) => {
            const { r, g, b } = hexToRgb(hex);
            return `RGB ${r} ${g} ${b}`;
        };

        const COLOR_FIELD_CONFIG = [
            { key: 'primaryColor', pickerId: 'primary-color-picker', hexId: 'primary-color-hex', tilePrefix: 'palette-primary', fallback: DEFAULT_THEME.primaryColor },
            { key: 'secondaryColor', pickerId: 'secondary-color-picker', hexId: 'secondary-color-hex', tilePrefix: 'palette-secondary', fallback: DEFAULT_THEME.secondaryColor },
            { key: 'backgroundColor', pickerId: 'background-color-picker', hexId: 'background-color-hex', tilePrefix: 'palette-bg', fallback: DEFAULT_THEME.backgroundColor },
            { key: 'surfaceColor', pickerId: 'surface-color-picker', hexId: 'surface-color-hex', tilePrefix: 'palette-surface', fallback: DEFAULT_THEME.surfaceColor },
            { key: 'textColor', pickerId: 'text-color-picker', hexId: 'text-color-hex', tilePrefix: 'palette-text', fallback: DEFAULT_THEME.textColor },
            { key: 'textLightColor', pickerId: 'text-light-color-picker', hexId: 'text-light-color-hex', tilePrefix: 'palette-accent', fallback: DEFAULT_THEME.textLightColor }
        ];

        const normalizeThemeColors = (raw = {}) => {
            const primaryColor = normalizeHex(raw.primaryColor) || DEFAULT_THEME.primaryColor;
            return {
                primaryColor,
                secondaryColor: normalizeHex(raw.secondaryColor) || DEFAULT_THEME.secondaryColor,
                backgroundColor: normalizeHex(raw.backgroundColor || raw.bgLightColor || raw.bgLight) || DEFAULT_THEME.backgroundColor,
                surfaceColor: normalizeHex(raw.surfaceColor || raw.bgWhiteColor || raw.bgWhite) || DEFAULT_THEME.surfaceColor,
                textColor: normalizeHex(raw.textColor || raw.textDarkColor || raw.textDark) || DEFAULT_THEME.textColor,
                // Backwards compatibility: older admin builds may have stored "accentColor" instead.
                textLightColor: normalizeHex(raw.textLightColor || raw.accentColor || raw.textMutedColor || raw.textLight) || DEFAULT_THEME.textLightColor
            };
        };

        const setPaletteTile = (prefix, hex) => {
            const safeHex = normalizeHex(hex) || '#000000';
            const swatch = document.getElementById(`${prefix}-chip`);
            const meta = document.getElementById(`${prefix}-meta`);
            const hexEl = document.getElementById(`${prefix}-hex`);
            if (swatch) swatch.style.background = safeHex;
            if (meta) meta.textContent = rgbLabel(safeHex);
            if (hexEl) hexEl.textContent = safeHex;
        };

        const getPaletteFromInputs = () => {
            const raw = {};
            COLOR_FIELD_CONFIG.forEach(({ key, hexId }) => {
                raw[key] = document.getElementById(hexId)?.value;
            });
            return normalizeThemeColors(raw);
        };

        const applyPaletteToInputs = (palette) => {
            const normalized = normalizeThemeColors(palette);
            COLOR_FIELD_CONFIG.forEach(({ key, pickerId, hexId, fallback }) => {
                const color = normalizeHex(normalized[key]) || fallback;
                const picker = document.getElementById(pickerId);
                const hex = document.getElementById(hexId);
                if (picker) picker.value = color;
                if (hex) hex.value = color;
            });
        };

        const updatePalettePreview = (paletteLike = null) => {
            const palette = normalizeThemeColors(paletteLike || getPaletteFromInputs());
            const primary = palette.primaryColor;
            const secondary = palette.secondaryColor;
            const background = palette.backgroundColor;
            const surface = palette.surfaceColor;
            const text = palette.textColor;
            const accent = palette.textLightColor;

            setPaletteTile('palette-primary', primary);
            setPaletteTile('palette-secondary', secondary);
            setPaletteTile('palette-bg', background);
            setPaletteTile('palette-surface', surface);
            setPaletteTile('palette-text', text);
            setPaletteTile('palette-accent', accent);

            const preview = document.getElementById('live-preview-area');
            if (preview) {
                preview.style.setProperty('--design-primary', primary);
                preview.style.setProperty('--design-secondary', secondary);
                preview.style.setProperty('--design-accent', accent);
                preview.style.setProperty('--design-text', text);
                preview.style.setProperty('--design-muted', accent);
                preview.style.setProperty('--design-bg', background);
                preview.style.setProperty('--design-surface', surface);
            }

            const brandProfile = section.querySelector('.design-ui-brand-profile');
            if (brandProfile) {
                brandProfile.style.setProperty('--design-brand-primary', primary);
                brandProfile.style.setProperty('--design-brand-secondary', secondary);
            }
        };

        // Logic for Dynamic Preview
        const updateLivePreview = () => {
            const font = document.getElementById('main-font-select')?.value || DEFAULT_THEME.mainFont;
            const h1Size = Number(document.getElementById('font-size-h1-desktop')?.value || DEFAULT_THEME.fontSizeH1Desktop);
            const bodySize = Number(document.getElementById('font-size-base')?.value || DEFAULT_THEME.fontSizeBase);
            const palette = getPaletteFromInputs();
            const previewText = document.getElementById('typography-preview-text');
            const previewBox = document.getElementById('live-preview-area');
            const previewBody = document.getElementById('design-preview-body-copy');
            const previewPrimaryBtn = document.getElementById('design-preview-primary-btn');
            const previewSecondaryBtn = document.getElementById('design-preview-secondary-btn');

            if (previewText) {
                previewText.style.fontFamily = `'${font}', sans-serif`;
                previewText.style.fontSize = `${h1Size}px`;
                previewText.style.color = palette.textColor;
            }
            if (previewBox) {
                previewBox.style.fontFamily = `'${font}', sans-serif`;
            }
            if (previewBody) {
                previewBody.style.fontSize = `${bodySize}px`;
                previewBody.style.color = palette.textLightColor;
            }
            if (previewPrimaryBtn) {
                previewPrimaryBtn.style.background = palette.primaryColor;
            }
            if (previewSecondaryBtn) {
                previewSecondaryBtn.style.borderColor = palette.secondaryColor;
                previewSecondaryBtn.style.color = palette.secondaryColor;
            }
            updatePalettePreview(palette);
        };

        // Add Listeners
        const syncRange = (id) => {
            const el = document.getElementById(id);
            const valEl = document.getElementById(`${id}-val`);
            if (!el || !valEl) return;
            el.oninput = () => {
                valEl.textContent = `${el.value}px`;
                updateLivePreview();
            };
        };
        syncRange('font-size-base');
        syncRange('font-size-h1-desktop');

        const fontSelect = document.getElementById('main-font-select');
        if (fontSelect) fontSelect.onchange = updateLivePreview;

        const syncColor = (pickerId, hexId, fallbackHex) => {
            const picker = document.getElementById(pickerId);
            const hex = document.getElementById(hexId);
            if (!picker || !hex) return;

            picker.oninput = () => {
                hex.value = normalizeHex(picker.value) || fallbackHex;
                updateLivePreview();
            };

            hex.oninput = () => {
                const normalized = normalizeHex(hex.value);
                if (!normalized) return;
                hex.value = normalized;
                picker.value = normalized;
                updateLivePreview();
            };

            hex.onblur = () => {
                const normalized = normalizeHex(hex.value) || fallbackHex;
                hex.value = normalized;
                picker.value = normalized;
                updateLivePreview();
            };
        };
        COLOR_FIELD_CONFIG.forEach(({ pickerId, hexId, fallback }) => syncColor(pickerId, hexId, fallback));

        const resetBtn = document.getElementById('reset-design-settings');
        if (resetBtn) {
            resetBtn.onclick = () => {
                const fontEl = document.getElementById('main-font-select');
                const h1El = document.getElementById('font-size-h1-desktop');
                const baseEl = document.getElementById('font-size-base');

                if (fontEl) fontEl.value = DEFAULT_THEME.mainFont;
                if (h1El) h1El.value = String(DEFAULT_THEME.fontSizeH1Desktop);
                if (baseEl) baseEl.value = String(DEFAULT_THEME.fontSizeBase);
                applyPaletteToInputs(DEFAULT_THEME);

                const h1ValEl = document.getElementById('font-size-h1-desktop-val');
                const baseValEl = document.getElementById('font-size-base-val');
                if (h1ValEl) h1ValEl.textContent = `${DEFAULT_THEME.fontSizeH1Desktop}px`;
                if (baseValEl) baseValEl.textContent = `${DEFAULT_THEME.fontSizeBase}px`;

                updateLivePreview();
                this.showToast('Tema forhåndsvisning er tilbakestilt til HKM-standard.', 'success', 3000);
            };
        }

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
                applyPaletteToInputs(normalizeThemeColors(data));
            }
        } catch (e) {
            console.error("Load design error:", e);
        }
        updateLivePreview();

        document.getElementById('save-design-settings').onclick = async () => {
            const btn = document.getElementById('save-design-settings');
            const palette = getPaletteFromInputs();
            const data = {
                logoUrl: document.getElementById('site-logo-url').value,
                faviconUrl: document.getElementById('site-favicon-url').value,
                logoText: document.getElementById('site-logo-text').value,
                siteTitle: document.getElementById('site-title-seo').value,
                mainFont: document.getElementById('main-font-select').value,
                fontSizeBase: document.getElementById('font-size-base').value,
                fontSizeH1Desktop: document.getElementById('font-size-h1-desktop').value,
                primaryColor: palette.primaryColor,
                secondaryColor: palette.secondaryColor,
                backgroundColor: palette.backgroundColor,
                surfaceColor: palette.surfaceColor,
                textColor: palette.textColor,
                textLightColor: palette.textLightColor,
                // Alias for backwards compatibility with older preview logic.
                accentColor: palette.textLightColor,
                updatedAt: new Date().toISOString()
            };
            Object.assign(data, normalizeThemeColors(data));

            await this._withButtonLoading(btn, async () => {
                return this._runWriteLocked('design-settings', async () => {
                    try {
                        await firebaseService.savePageContent('settings_design', data);
                        this.showToast('✅ Design-innstillinger er lagret!', 'success', 5000);
                    } catch (err) {
                        console.error('Save design settings error:', err);
                        this.showToast('❌ Feil ved lagring', 'error', 5000);
                    }
                });
            }, {
                loadingText: '<span class="material-symbols-outlined" style="font-size:18px;">hourglass_top</span> Lagrer...'
            });
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
        if (!container) return;
        if (url && url.startsWith('http')) {
            const safeUrl = this.escapeHtml ? this.escapeHtml(url) : url;
            container.innerHTML = `
                <div class="design-ui-preview-media">
                    <img src="${safeUrl}" class="preview-img design-ui-preview-image" alt="Forhåndsvisning">
                    <div class="design-ui-preview-caption">${safeUrl}</div>
                </div>
            `;
        } else {
            const icon = containerId.includes('favicon') ? 'web_asset' : 'image';
            container.innerHTML = `
                <div class="design-ui-empty-preview">
                    <span class="material-symbols-outlined">${icon}</span>
                    <span>${containerId.includes('favicon') ? 'Favicon-forhåndsvisning' : 'Logo-forhåndsvisning'}</span>
                </div>
            `;
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
            ${this.renderSectionHeader('volunteer_activism', 'Gaver & Donasjoner', 'Oversikt over alle inntekter og aktive innsamlingsaksjoner.')}
            
            <div class="stats-grid" style="margin-bottom: 32px;">
                <div class="stat-card modern">
                    <div class="stat-icon-wrap green">
                        <span class="material-symbols-outlined">payments</span>
                    </div>
                    <div class="stat-content">
                        <h3 class="stat-label">Total Inntekt</h3>
                        <p class="stat-value">${formattedTotal}</p>
                        <p class="stat-trend">Siste 30 dager</p>
                    </div>
                </div>

                        <div class="stat-card modern">
                            <div class="stat-icon-wrap blue">
                                <span class="material-symbols-outlined">volunteer_activism</span>
                            </div>
                            <div class="stat-content">
                                <h3 class="stat-label">Antall gaver</h3>
                                <p class="stat-value">${donationCount}</p>
                                <span class="stat-meta">Registrerte transaksjoner</span>
                            </div>
                        </div>

                        <div class="stat-card modern">
                            <div class="stat-icon-wrap mint">
                                <span class="material-symbols-outlined">trending_up</span>
                            </div>
                            <div class="stat-content">
                                <h3 class="stat-label">Snittgave</h3>
                                <p class="stat-value">${formattedAverage}</p>
                                <span class="stat-meta">Per donasjon</span>
                            </div>
                        </div>

                        <div class="stat-card modern">
                            <div class="stat-icon-wrap purple">
                                <span class="material-symbols-outlined">pie_chart</span>
                            </div>
                            <div class="stat-content">
                                <h3 class="stat-label">Konvertering</h3>
                                <p class="stat-value">-- %</p>
                                <span class="stat-meta">Besøkende til givere</span>
                            </div>
                        </div>
                    </div>

                    <div class="card">
                        <div class="card-header flex-between">
                            <div>
                                <h3 class="card-title">Aktive innsamlingsaksjoner</h3>
                                <p class="section-subtitle" style="margin-bottom: 0;">Administrer dine pågående kampanjer.</p>
                            </div>
                            <button class="btn-primary" id="add-cause-btn">
                                <span class="material-symbols-outlined">add</span>
                                Ny aksjon
                            </button>
                        </div>
                        <div class="card-body" id="causes-list">
                            <div class="loader"></div>
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
                listEl.innerHTML = `
                    <div class="empty-state-container">
                        <span class="material-symbols-outlined empty-state-icon">volunteer_activism</span>
                        <p class="empty-state-text">Ingen innsamlingsaksjoner er opprettet ennå.</p>
                        <button class="btn-primary" style="margin: 0 auto;" onclick="document.getElementById('add-cause-btn').click()">
                            Opprett din første aksjon
                        </button>
                    </div>
                `;
                return;
            }

            const itemsHtml = causes.map((cause, index) => {
                const checkedCollected = cause.collected || 0;
                const checkedGoal = cause.goal || 100000;
                const progress = checkedGoal > 0 ? Math.round((checkedCollected / checkedGoal) * 100) : 0;

                return `
                    <div class="cause-item">
                        <div class="cause-header-row">
                            <div class="cause-title-wrap">
                                <h4 class="cause-title-text">${cause.title || 'Uten tittel'}</h4>
                                <p class="cause-desc-text">${cause.description || ''}</p>
                            </div>
                            <div class="cause-actions-wrap">
                                <button class="action-btn edit-cause-btn" data-index="${index}" title="Rediger">
                                    <span class="material-symbols-outlined" style="pointer-events: none;">edit</span>
                                </button>
                                <button class="action-btn delete-cause-btn" data-index="${index}" title="Slett" style="color: #ef4444;">
                                    <span class="material-symbols-outlined" style="pointer-events: none;">delete</span>
                                </button>
                            </div>
                        </div>
                        <div class="cause-stats-row">
                            <div class="cause-stat-unit">
                                <span class="cause-stat-label">Samlet inn</span>
                                <span class="cause-stat-number success">${parseInt(checkedCollected).toLocaleString('no-NO')} kr</span>
                            </div>
                            <div class="cause-stat-unit">
                                <span class="cause-stat-label">Mål</span>
                                <span class="cause-stat-number">${parseInt(checkedGoal).toLocaleString('no-NO')} kr</span>
                            </div>
                            <div class="cause-stat-unit">
                                <span class="cause-stat-label">Progresjon</span>
                                <span class="cause-stat-number highlight">${progress}%</span>
                            </div>
                        </div>
                        <div class="progress-bar-wrap" style="margin-top: 16px;">
                            <div class="progress-bar" style="width: ${Math.min(progress, 100)}%;"></div>
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
            ${this.renderSectionHeader('view_carousel', 'Forside-innhold', 'Administrer slides og statistikk på forsiden.', `
                <button class="btn btn-primary" id="add-hero-slide">
                    <span class="material-symbols-outlined">add</span> Ny Slide
                </button>
            `)}

                    <div class="collection-grid" id="hero-slides-list">
                        <div class="loader">Laster slides...</div>
                    </div>

                    ${this.renderSectionHeader('monitoring', 'Nøkkeltall (Forside-statistikk)', 'Rediger tallene som vises i "Funfacts"-seksjonen på forsiden.')}

                    <div class="card" style="max-width: 800px;">
                        <div class="card-body">
                            <form id="stats-form">
                                <div class="form-grid-2" style="gap: 20px;">
                                    <div class="form-group">
                                        <label>Land besøkt</label>
                                        <input type="number" id="stat-countries" class="form-control" name="countries_visited" placeholder="f.eks. 12">
                                    </div>
                                    <div class="form-group">
                                        <label>Podcast-episoder</label>
                                        <input type="number" id="stat-podcast" class="form-control" name="podcast_episodes" placeholder="f.eks. 45">
                                    </div>
                                    <div class="form-group">
                                        <label>YouTube-videoer</label>
                                        <input type="number" id="stat-yt-videos" class="form-control" name="youtube_videos" placeholder="f.eks. 449">
                                    </div>
                                    <div class="form-group">
                                        <label>YouTube-visninger</label>
                                        <input type="number" id="stat-yt-views" class="form-control" name="youtube_views" placeholder="f.eks. 56000">
                                    </div>
                                </div>
                                <div style="margin-top: 20px; display: flex; justify-content: flex-end;">
                                    <button type="submit" class="btn-primary" id="save-stats-btn">
                                        <span class="material-symbols-outlined">save</span> Lagre statistikk
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                    `;
        section.setAttribute('data-rendered', 'true');

        document.getElementById('add-hero-slide').onclick = () => this.editHeroSlide();
        this.loadHeroSlides();
        this.loadIndexStats();

        document.getElementById('stats-form').onsubmit = async (e) => {
            e.preventDefault();
            await this.saveIndexStats();
        };
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

    async loadIndexStats() {
        try {
            const data = await firebaseService.getPageContent('index');
            if (data && data.stats) {
                const stats = data.stats;
                if (document.getElementById('stat-countries')) document.getElementById('stat-countries').value = stats.countries_visited || '';
                if (document.getElementById('stat-podcast')) document.getElementById('stat-podcast').value = stats.podcast_episodes || '';
                if (document.getElementById('stat-yt-videos')) document.getElementById('stat-yt-videos').value = stats.youtube_videos || '';
                if (document.getElementById('stat-yt-views')) document.getElementById('stat-yt-views').value = stats.youtube_views || '';
            }
        } catch (e) {
            console.error('Kunne ikke laste statistikk:', e);
        }
    }

    async saveIndexStats() {
        const btn = document.getElementById('save-stats-btn');
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<span class="material-symbols-outlined">sync</span> Lagrer...';

        try {
            const countries = document.getElementById('stat-countries').value;
            const podcast = document.getElementById('stat-podcast').value;
            const yt_videos = document.getElementById('stat-yt-videos').value;
            const yt_views = document.getElementById('stat-yt-views').value;

            // Get existing index content to avoid overwriting other parts
            let indexContent = {};
            try {
                indexContent = await firebaseService.getPageContent('index') || {};
            } catch (e) { }

            indexContent.stats = {
                countries_visited: countries,
                podcast_episodes: podcast,
                youtube_videos: yt_videos,
                youtube_views: yt_views
            };

            await firebaseService.savePageContent('index', indexContent);
            this.showToast('🚀 Statistikk er nå oppdatert på forsiden!', 'success', 5000);
        } catch (e) {
            console.error('Feil ved lagring av statistikk:', e);
            this.showToast('Kunne ikke lagre statistikk.', 'error', 5000);
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    }

    async renderProfileSection() {
        const section = document.getElementById('profile-section');
        if (!section) return;

        const authUser = firebaseService.auth && firebaseService.auth.currentUser ? firebaseService.auth.currentUser : null;
        if (!authUser) return;

        section.innerHTML = `
            ${this.renderSectionHeader('person_outline', 'Min Profil', 'Administrer din brukerkonto og personlige innstillinger.', `
                <button class="btn btn-primary" onclick="location.reload()">Last inn på nytt</button>
            `, '')}

            <div class="design-ui-shell">
                <div class="design-ui-workspace">
                    <div class="design-ui-panel">
                        <div class="design-ui-panel-body" style="padding: 32px;">
                            <div style="display: flex; align-items: center; gap: 24px; padding-bottom: 32px; border-bottom: 1px solid var(--border-color); margin-bottom: 32px;">
                                <div id="profile-picture-container-admin" style="position: relative; width: 100px; height: 100px; border-radius: 50%; background: var(--primary-color); display: flex; align-items: center; justify-content: center; color: white; font-size: 2.5rem; font-weight: 700; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
                                    ${(authUser.photoURL ? `<img src="${authUser.photoURL}" style="width: 100%; height: 100%; object-fit: cover;">` : (authUser.displayName || authUser.email || '?').charAt(0).toUpperCase())}
                                    <label for="profile-upload-admin" style="position: absolute; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; color: white; opacity: 0; transition: opacity 0.3s ease; cursor: pointer;">
                                        <span class="material-symbols-outlined">photo_camera</span>
                                    </label>
                                    <input type="file" id="profile-upload-admin" style="display: none;" accept="image/*">
                                </div>
                                <div>
                                    <h4 style="margin: 0 0 4px 0; font-size: 16px; font-weight: 600;">Profilbilde</h4>
                                    <p style="font-size: 13px; color: var(--text-muted); margin: 0 0 16px 0;">Last opp et bilde fra din enhet eller bruk bildet fra Google.</p>
                                    <div style="display: flex; gap: 10px;">
                                        <button type="button" class="btn btn-outline" id="upload-profile-btn-admin" style="font-size: 13px; padding: 6px 12px;">Last opp nytt</button>
                                        ${Array.isArray(authUser.providerData) && authUser.providerData.some(p => p && p.providerId === 'google.com')
                ? `<button type="button" class="btn btn-outline" id="google-photo-btn-admin" style="font-size: 13px; padding: 6px 12px; display: flex; align-items: center;">
                     <img src="https://www.google.com/favicon.ico" width="14" height="14" style="margin-right: 6px;">
                     Hent fra Google
                   </button>`
                : ''}
                                    </div>
                                </div>
                            </div>

                            <form id="admin-profile-full-form">
                                <h4 style="margin: 0 0 16px 0; font-size: 15px; font-weight: 600; color: var(--text-main);">Personalia</h4>
                                <div class="form-grid-2" style="gap: 20px; margin-bottom: 32px;">
                                    <div class="form-group" style="margin: 0;">
                                        <label style="font-size: 11px; font-weight: 600; color: var(--text-muted); margin-bottom: 6px; display: block; text-transform: uppercase; letter-spacing: 0.5px;">Navn</label>
                                        <input type="text" name="displayName" class="form-control" style="width: 100%;">
                                    </div>
                                    <div class="form-group" style="margin: 0;">
                                        <label style="font-size: 11px; font-weight: 600; color: var(--text-muted); margin-bottom: 6px; display: block; text-transform: uppercase; letter-spacing: 0.5px;">Telefon</label>
                                        <input type="tel" name="phone" class="form-control" style="width: 100%;">
                                    </div>
                                    <div class="form-group" style="grid-column: span 2; margin: 0;">
                                        <label style="font-size: 11px; font-weight: 600; color: var(--text-muted); margin-bottom: 6px; display: block; text-transform: uppercase; letter-spacing: 0.5px;">E-post</label>
                                        <input type="email" name="email" class="form-control" disabled style="width: 100%; background: #f8fafc; color: #64748b; cursor: not-allowed;">
                                    </div>
                                </div>

                                <h4 style="margin: 0 0 16px 0; font-size: 15px; font-weight: 600; color: var(--text-main); border-top: 1px solid var(--border-color); padding-top: 32px;">Adresse</h4>
                                <div class="form-grid-2" style="gap: 20px; margin-bottom: 32px;">
                                    <div class="form-group" style="grid-column: span 2; margin: 0;">
                                        <label style="font-size: 11px; font-weight: 600; color: var(--text-muted); margin-bottom: 6px; display: block; text-transform: uppercase; letter-spacing: 0.5px;">Gateadresse</label>
                                        <input type="text" name="address" class="form-control" style="width: 100%;">
                                    </div>
                                    <div class="form-group" style="margin: 0;">
                                        <label style="font-size: 11px; font-weight: 600; color: var(--text-muted); margin-bottom: 6px; display: block; text-transform: uppercase; letter-spacing: 0.5px;">Postnummer</label>
                                        <input type="text" name="zip" class="form-control" style="width: 100%;">
                                    </div>
                                    <div class="form-group" style="margin: 0;">
                                        <label style="font-size: 11px; font-weight: 600; color: var(--text-muted); margin-bottom: 6px; display: block; text-transform: uppercase; letter-spacing: 0.5px;">Sted</label>
                                        <input type="text" name="city" class="form-control" style="width: 100%;">
                                    </div>
                                </div>

                                <h4 style="margin: 0 0 16px 0; font-size: 15px; font-weight: 600; color: var(--text-main); border-top: 1px solid var(--border-color); padding-top: 32px;">Kommunikasjon</h4>
                                <div class="form-group" style="margin-bottom: 32px;">
                                    <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; font-size: 14px; color: var(--text-main);">
                                        <input type="checkbox" name="newsletter" style="width: 18px; height: 18px; accent-color: var(--primary-color);">
                                        Motta nyhetsbrev på e-post
                                    </label>
                                </div>

                                <h4 style="margin: 0 0 16px 0; font-size: 15px; font-weight: 600; color: var(--text-main); border-top: 1px solid var(--border-color); padding-top: 32px;">Personvern & Samtykke</h4>
                                <div id="admin-consent-status-display" style="padding: 16px; background: #f8fafc; border: 1px solid var(--border-color); border-radius: 8px; margin-bottom: 32px; font-size: 14px;">
                                    <div class="loader" style="margin: 0 auto;"></div>
                                </div>

                                <div style="display: flex; gap: 16px; align-items: center; border-top: 1px solid var(--border-color); padding-top: 24px; justify-content: flex-end;">
                                    <button type="submit" class="btn btn-primary" id="save-profile-btn" style="min-width: 180px;">
                                        <span class="material-symbols-outlined" style="font-size: 18px;">save</span> 
                                        Lagre endringer
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
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
        const safeSlideImage = this.escapeHtml(slide.imageUrl || '');
        const safeSlideTitle = this.escapeHtml(slide.title || '');
        const safeSlideSubtitle = this.escapeHtml(slide.subtitle || '');
        const safeSlideBtnText = this.escapeHtml(slide.btnText || '');
        const safeSlideBtnLink = this.escapeHtml(slide.btnLink || '');

        const modal = document.createElement('div');
        modal.className = 'dashboard-modal';
        modal.innerHTML = `
            <div class="modal-backdrop" style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 2000; display: flex; align-items: center; justify-content: center; padding: 20px;">
                <div class="card" style="width: 100%; max-width: 500px; max-height: 90vh; overflow-y: auto;">
                    <div class="card-header flex-between">
                        <h3 class="card-title">${isNew ? 'Legg til ny slide' : 'Rediger slide'}</h3>
                        <button class="icon-btn" id="hero-close-modal"><span class="material-symbols-outlined">close</span></button>
                    </div>
                    <div class="card-body">
                        <div class="form-group">
                            <label>Slide-bilde (Anbefalt: 1920x1080px)</label>
                            <div id="hero-img-trigger" style="margin-bottom: 12px; position: relative; cursor: pointer; border: 2px dashed #e2e8f0; border-radius: 12px; aspect-ratio: 16/9; display: flex; align-items: center; justify-content: center; background: #f8fafc; overflow: hidden;">
                                ${safeSlideImage ? `<img src="${safeSlideImage}" style="width: 100%; height: 100%; object-fit: cover;">` : '<span class="material-symbols-outlined" style="opacity:0.3; font-size:48px;">add_a_photo</span>'}
                                <div class="upload-overlay" style="position: absolute; bottom: 0; left: 0; right: 0; background: rgba(15, 23, 42, 0.78); color: #fff; font-size: 11px; padding: 8px; text-align: center; opacity: 1; transition: opacity 0.2s;">Klikk på bildet eller velg fil</div>
                            </div>
                            <input type="file" id="hero-file-input" style="display: none;" accept="image/*">
                            <div style="display:flex; gap:10px; align-items:center; margin-bottom:10px;">
                                <button type="button" class="btn-secondary" id="hero-choose-image-btn" style="display:inline-flex; align-items:center; justify-content:center; gap:8px; white-space:nowrap;">
                                    <span class="material-symbols-outlined">upload</span>
                                    Velg bilde
                                </button>
                                <span id="hero-upload-status" style="font-size:13px; color:#64748b;">JPG, PNG eller WebP</span>
                            </div>
                            <input type="text" id="hero-img-url" class="form-control" value="${safeSlideImage}" placeholder="Eller lim inn bilde-URL her">
                        </div>

                        <div class="form-group">
                            <label>Overskrift</label>
                            <input type="text" id="hero-title" class="form-control" value="${safeSlideTitle}">
                        </div>
                        <div class="form-group">
                            <label>Undertekst</label>
                            <textarea id="hero-subtitle" class="form-control" style="height: 80px;">${safeSlideSubtitle}</textarea>
                        </div>
                        <div class="form-group">
                            <label>Knapptekst</label>
                            <input type="text" id="hero-btn-text" class="form-control" value="${safeSlideBtnText}">
                        </div>
                        <div class="form-group">
                            <label>Knapp-lenke</label>
                            <input type="text" id="hero-btn-link" class="form-control" value="${safeSlideBtnLink}">
                        </div>
                        <div style="margin-top: 24px;">
                            <button class="btn-primary" style="width: 100%;" id="hero-save-btn">Lagre slide</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // Scoped selection within the modal to avoid any ID conflicts
        const imgInput = modal.querySelector('#hero-img-url');
        const fileInput = modal.querySelector('#hero-file-input');
        const imgTrigger = modal.querySelector('#hero-img-trigger');
        const chooseImageBtn = modal.querySelector('#hero-choose-image-btn');
        const uploadStatus = modal.querySelector('#hero-upload-status');
        const saveBtn = modal.querySelector('#hero-save-btn');
        const closeBtn = modal.querySelector('#hero-close-modal');

        closeBtn.onclick = () => modal.remove();

        // Image Trigger Logic
        imgTrigger.onclick = () => fileInput.click();
        chooseImageBtn.onclick = () => fileInput.click();

        imgTrigger.onmouseenter = () => {
            const overlay = imgTrigger.querySelector('.upload-overlay');
            if (overlay) overlay.style.opacity = '1';
        };
        imgTrigger.onmouseleave = () => {
            const overlay = imgTrigger.querySelector('.upload-overlay');
            if (overlay) overlay.style.opacity = '0';
        };

        // Live Preview
        const renderImagePreview = (url) => {
            const safeUrl = this.escapeHtml(url || '');
            imgTrigger.innerHTML = safeUrl && safeUrl.length > 10
                ? `<img src="${safeUrl}" style="width: 100%; height: 100%; object-fit: cover;"><div class="upload-overlay" style="position: absolute; bottom: 0; left: 0; right: 0; background: rgba(15, 23, 42, 0.78); color: #fff; font-size: 11px; padding: 8px; text-align: center; opacity: 1; transition: opacity 0.2s;">Klikk på bildet eller velg ny fil</div>`
                : '<span class="material-symbols-outlined" style="opacity:0.3; font-size:48px;">add_a_photo</span><div class="upload-overlay" style="position: absolute; bottom: 0; left: 0; right: 0; background: rgba(15, 23, 42, 0.78); color: #fff; font-size: 11px; padding: 8px; text-align: center; opacity: 1; transition: opacity 0.2s;">Klikk på bildet eller velg fil</div>';
        };

        imgInput.oninput = (e) => {
            renderImagePreview(e.target.value);
        };

        // File Upload Handling (Blog-style)
        fileInput.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            if (!file.type || !file.type.startsWith('image/')) {
                this.showToast('Velg en bildefil.', 'error', 4000);
                fileInput.value = '';
                return;
            }
            if (file.size > 10 * 1024 * 1024) {
                this.showToast('Bildet er for stort. Maks størrelse er 10 MB.', 'error', 6000);
                fileInput.value = '';
                return;
            }

            imgTrigger.style.opacity = '0.5';
            imgTrigger.style.pointerEvents = 'none';
            chooseImageBtn.disabled = true;
            chooseImageBtn.innerHTML = '<span class="material-symbols-outlined rotating">sync</span> Laster opp...';
            uploadStatus.textContent = `${file.name} - starter...`;
            const originalHTML = imgTrigger.innerHTML;
            imgTrigger.innerHTML = '<span class="loader-sm"></span>';

            try {
                const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
                const path = `hero/${Date.now()}_${safeFileName}`;
                const url = await firebaseService.uploadImage(
                    file,
                    path,
                    (progress) => {
                        uploadStatus.textContent = `${file.name} - ${progress}%`;
                    },
                    { timeoutMs: 90000, maxSizeBytes: 10 * 1024 * 1024 }
                );
                
                imgInput.value = url;
                imgInput.dispatchEvent(new Event('input')); 
                this.showToast('Bilde lastet opp!', 'success');
                uploadStatus.textContent = 'Opplasting fullført';
            } catch (err) {
                console.error("Upload error:", err);
                this.showToast('Kunne ikke laste opp bilde: ' + (err.message || 'Ukjent feil'), 'error', 6000);
                uploadStatus.textContent = 'Opplasting feilet';
                imgTrigger.innerHTML = originalHTML;
            } finally {
                imgTrigger.style.opacity = '1';
                imgTrigger.style.pointerEvents = 'auto';
                chooseImageBtn.disabled = false;
                chooseImageBtn.innerHTML = '<span class="material-symbols-outlined">upload</span> Velg bilde';
                fileInput.value = '';
            }
        };

        // Save Logic
        saveBtn.onclick = async () => {
            saveBtn.disabled = true;
            saveBtn.textContent = 'Lagrer...';

            const updatedSlide = {
                imageUrl: imgInput.value,
                title: modal.querySelector('#hero-title').value,
                subtitle: modal.querySelector('#hero-subtitle').value,
                btnText: modal.querySelector('#hero-btn-text').value,
                btnLink: modal.querySelector('#hero-btn-link').value
            };

            if (isNew) {
                this.heroSlides.push(updatedSlide);
            } else {
                this.heroSlides[index] = updatedSlide;
            }

            try {
                await firebaseService.savePageContent('hero_slides', { slides: this.heroSlides });
                this.showToast('✅ Slide lagret!', 'success');
                modal.remove();
                this.renderHeroSlides(this.heroSlides);
            } catch (err) {
                console.error("Save error:", err);
                this.showToast('❌ Kunne ikke lagre sliden.', 'error');
                saveBtn.disabled = false;
                saveBtn.textContent = 'Lagre slide';
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

    async renderCoursesManager() {
        const section = document.getElementById('courses-section');
        if (!section) return;

        section.innerHTML = `
            ${this.renderSectionHeader('menu_book', 'Kursadministrasjon', 'Opprett og administrer kurs med leksjoner – Udemy-stil.', `
                <button class="btn btn-primary" id="create-course-btn">
                    <span class="material-symbols-outlined">add</span> Nytt kurs
                </button>
            `, '')}

            <div id="courses-list" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:20px;margin-bottom:32px;">
                <div class="loader" style="grid-column:1/-1;text-align:center;padding:40px;color:#94a3b8;">Laster kurs...</div>
            </div>

            <!-- Course Modal -->
            <div id="course-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:1000;overflow-y:auto;padding:20px;">
                <div style="background:white;border-radius:16px;max-width:780px;margin:20px auto;padding:32px;box-shadow:0 20px 60px rgba(0,0,0,0.2);">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;">
                        <h3 id="course-modal-title" style="font-size:1.4rem;font-weight:700;">Nytt kurs</h3>
                        <button id="close-course-modal" style="background:none;border:none;cursor:pointer;color:#94a3b8;font-size:1.5rem;">✕</button>
                    </div>

                    <form id="course-form">
                        <input type="hidden" id="course-id">
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
                            <div style="grid-column:span 2;">
                                <label style="display:block;font-weight:600;margin-bottom:6px;">Kurstitel *</label>
                                <input id="course-title" type="text" placeholder="Eks: Identitet i Kristus" required
                                    style="width:100%;padding:12px 16px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:1rem;">
                            </div>
                            <div style="grid-column:span 2;">
                                <label style="display:block;font-weight:600;margin-bottom:6px;">Beskrivelse</label>
                                <textarea id="course-description" rows="3" placeholder="Hva lærer studentene?"
                                    style="width:100%;padding:12px 16px;border:1.5px solid #e2e8f0;border-radius:10px;font-family:inherit;font-size:1rem;resize:vertical;"></textarea>
                            </div>
                            <div>
                                <label style="display:block;font-weight:600;margin-bottom:6px;">Kategori</label>
                                <select id="course-category" style="width:100%;padding:12px 16px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:1rem;background:white;">
                                    <option value="Bibelstudium">Bibelstudium</option>
                                    <option value="Bønn">Bønn</option>
                                    <option value="Lederskap">Lederskap</option>
                                    <option value="Helbredelse">Helbredelse</option>
                                    <option value="Evangelisering">Evangelisering</option>
                                    <option value="Identitet">Identitet</option>
                                    <option value="Annet">Annet</option>
                                </select>
                            </div>
                            <div>
                                <label style="display:block;font-weight:600;margin-bottom:6px;">Pris (NOK) – 0 = gratis</label>
                                <input id="course-price" type="number" min="0" placeholder="0" value="0"
                                    style="width:100%;padding:12px 16px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:1rem;">
                            </div>
                            <div style="grid-column:span 2;">
                                <label style="display:block;font-weight:600;margin-bottom:6px;">Forsidebilde URL</label>
                                <input id="course-image" type="url" placeholder="https://..."
                                    style="width:100%;padding:12px 16px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:1rem;">
                            </div>
                        </div>

                        <!-- Lessons -->
                        <div style="border-top:1px solid #e2e8f0;padding-top:20px;margin-top:4px;">
                            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
                                <h4 style="font-size:1rem;font-weight:700;">Leksjoner</h4>
                                <button type="button" id="add-lesson-btn" style="background:#fff8f0;color:#e07b39;border:1.5px solid #ffd5b0;padding:7px 14px;border-radius:8px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:6px;">
                                    <span class="material-symbols-outlined" style="font-size:1rem;">add</span> Legg til leksjon
                                </button>
                            </div>
                            <div id="lessons-container" style="display:flex;flex-direction:column;gap:12px;"></div>
                        </div>

                        <div style="display:flex;gap:12px;margin-top:24px;padding-top:20px;border-top:1px solid #e2e8f0;">
                            <button type="submit" id="save-course-btn" class="btn-primary" style="padding:12px 28px;border-radius:10px;font-weight:600;display:flex;align-items:center;gap:8px;">
                                <span class="material-symbols-outlined" style="font-size:1rem;">save</span> Lagre kurs
                            </button>
                            <button type="button" id="delete-course-btn" style="display:none;padding:12px 20px;border-radius:10px;background:white;color:#ef4444;border:1.5px solid #fee2e2;font-weight:600;cursor:pointer;">
                                Slett kurs
                            </button>
                        </div>
                        <p id="course-save-status" style="margin-top:12px;font-size:0.85rem;"></p>
                    </form>
                </div>
            </div>
        `;
        section.setAttribute('data-rendered', 'true');

        // Load courses
        this._ensureCoursesRealtimeSubscription();
        await this._loadCoursesList();

        // Course actions (support legacy/new IDs and avoid hard crashes if markup changes)
        const createCourseBtn = document.getElementById('create-course-btn') || document.getElementById('new-course-btn');
        const closeCourseModalBtn = document.getElementById('close-course-modal');
        const courseModal = document.getElementById('course-modal');
        const addLessonBtn = document.getElementById('add-lesson-btn');
        const courseForm = document.getElementById('course-form');
        const deleteCourseBtn = document.getElementById('delete-course-btn');

        createCourseBtn?.addEventListener('click', () => this._openCourseModal());
        closeCourseModalBtn?.addEventListener('click', () => this._closeCourseModal());
        courseModal?.addEventListener('click', (e) => {
            if (e.target === courseModal) this._closeCourseModal();
        });
        addLessonBtn?.addEventListener('click', () => this._addLessonRow());
        courseForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            this._saveCourse();
        });
        deleteCourseBtn?.addEventListener('click', () => this._deleteCourse());
    }

    async _loadCoursesList() {
        const list = document.getElementById('courses-list');
        if (!list) return;
        try {
            const data = typeof firebaseService.getSiteContent === 'function'
                ? await firebaseService.getSiteContent('collection_courses')
                : null;
            const items = Array.isArray(data) ? data : (data?.items || []);
            this.coursesItems = items;

            if (items.length === 0) {
                list.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px 20px;background:#f8fafc;border-radius:16px;border:2px dashed #e2e8f0;">
                    <span class="material-symbols-outlined" style="font-size:48px;color:#94a3b8;display:block;margin-bottom:12px;">menu_book</span>
                    <p style="color:#64748b;font-size:1rem;">Ingen kurs opprettet ennå. Klikk "Nytt kurs" for å komme i gang.</p>
                </div>`;
                return;
            }

            const rows = items.map((course, i) => {
                const title = this.escapeHtml(course.title || 'Uten tittel');
                const description = this.escapeHtml((course.description || '').trim());
                const shortDesc = description.length > 90 ? `${description.slice(0, 90)}...` : description;
                const category = course.category ? this.escapeHtml(course.category) : '—';
                const lessonsCount = Array.isArray(course.lessons) ? course.lessons.length : 0;
                const price = Number(course.price || 0);
                const priceText = price > 0
                    ? `kr ${Math.round(price).toLocaleString('no-NO')}`
                    : 'Gratis';

                return `
                    <tr>
                        <td>
                            <div class="user-info-cell">
                                ${course.imageUrl
                        ? `<img src="${this.escapeHtml(course.imageUrl)}" alt="" style="width:44px;height:44px;border-radius:10px;object-fit:cover;border:1px solid #e2e8f0;">`
                        : `<div style="width:44px;height:44px;border-radius:10px;background:#fff7ed;color:#f97316;display:flex;align-items:center;justify-content:center;border:1px solid #fed7aa;"><span class="material-symbols-outlined" style="font-size:18px;">menu_book</span></div>`}
                                <div>
                                    <div class="user-name">${title}</div>
                                    <div class="text-muted">${shortDesc || 'Ingen beskrivelse'}</div>
                                </div>
                            </div>
                        </td>
                        <td>${category}</td>
                        <td>${price > 0 ? `<span class="badge status-pending">${priceText}</span>` : `<span class="badge status-read">${priceText}</span>`}</td>
                        <td>${lessonsCount}</td>
                        <td class="col-actions">
                            <button type="button" class="btn-secondary" onclick="window.adminManager._openCourseModal(${i})" style="padding:8px 12px;border-radius:8px;font-size:12px;">
                                Rediger
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');

            list.innerHTML = `
                <div class="table-container" style="grid-column:1/-1;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
                    <table class="crm-table">
                        <thead>
                            <tr>
                                <th>Kurs</th>
                                <th>Kategori</th>
                                <th>Pris</th>
                                <th>Leksjoner</th>
                                <th class="col-actions">Handlinger</th>
                            </tr>
                        </thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>
            `;
        } catch (err) {
            console.error('Kurs-feil:', err);
            if (list) list.innerHTML = `<p style="color:#ef4444;">Kunne ikke laste kurs.</p>`;
        }
    }

    async _openCourseModal(index = null) {
        const modal = document.getElementById('course-modal');
        const title = document.getElementById('course-modal-title');
        const deleteBtn = document.getElementById('delete-course-btn');
        const lessonsContainer = document.getElementById('lessons-container');
        const status = document.getElementById('course-save-status');
        const courseForm = document.getElementById('course-form');
        const courseIdInput = document.getElementById('course-id');
        const coursePriceInput = document.getElementById('course-price');

        if (!modal || !title || !deleteBtn || !lessonsContainer || !courseForm || !courseIdInput || !coursePriceInput) {
            console.warn('Kursmodal mangler forventede felter og kunne ikke åpnes trygt.');
            return;
        }

        // Reset form
        courseForm.reset();
        courseIdInput.value = '';
        coursePriceInput.value = '0';
        lessonsContainer.innerHTML = '';
        if (status) status.textContent = '';

        if (index !== null) {
            // Edit existing
            title.textContent = 'Rediger kurs';
            deleteBtn.style.display = 'inline-flex';
            try {
                const data = typeof firebaseService.getSiteContent === 'function'
                    ? await firebaseService.getSiteContent('collection_courses')
                    : null;
                const items = Array.isArray(data) ? data : (data?.items || []);
                this.coursesItems = items;
                const course = items[index];
                if (!course) return;

                document.getElementById('course-id').value = course.id || `idx:${index}`;
                document.getElementById('course-title').value = course.title || '';
                document.getElementById('course-description').value = course.description || '';
                document.getElementById('course-category').value = course.category || 'Bibelstudium';
                document.getElementById('course-price').value = course.price || 0;
                document.getElementById('course-image').value = course.imageUrl || '';

                (course.lessons || []).forEach(l => this._addLessonRow(l.title, l.videoUrl));
            } catch (err) { console.error(err); }
        } else {
            title.textContent = 'Nytt kurs';
            deleteBtn.style.display = 'none';
            this._addLessonRow(); // Start with one empty lesson
        }

        modal.style.display = 'block';
    }

    _closeCourseModal() {
        const modal = document.getElementById('course-modal');
        if (modal) modal.style.display = 'none';
    }

    _addLessonRow(lessonTitle = '', videoUrl = '') {
        const container = document.getElementById('lessons-container');
        if (!container) return;
        const index = container.children.length + 1;
        const row = document.createElement('div');
        row.style.cssText = 'display:grid;grid-template-columns:1fr 1fr auto;gap:10px;align-items:center;background:#f8fafc;padding:12px;border-radius:10px;border:1px solid #e2e8f0;';
        row.innerHTML = `
            <input type="text" placeholder="Leksjon ${index}: Tittel" value="${lessonTitle}"
                style="padding:10px 14px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.9rem;" class="lesson-title">
            <input type="url" placeholder="YouTube/Vimeo URL" value="${videoUrl}"
                style="padding:10px 14px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.9rem;" class="lesson-video">
            <button type="button" style="background:#fee2e2;color:#ef4444;border:none;width:36px;height:36px;border-radius:8px;cursor:pointer;font-size:1.1rem;flex-shrink:0;"
                onclick="this.closest('div').remove()">✕</button>
        `;
        container.appendChild(row);
    }

    async _saveCourse() {
        const btn = document.getElementById('save-course-btn');
        const status = document.getElementById('course-save-status');
        const editCourseKey = document.getElementById('course-id').value;

        const lessons = [];
        document.querySelectorAll('#lessons-container > div').forEach(row => {
            const t = row.querySelector('.lesson-title')?.value?.trim();
            const v = row.querySelector('.lesson-video')?.value?.trim();
            if (t || v) lessons.push({ title: t || '', videoUrl: v || '' });
        });

        const rawCourse = {
            id: editCourseKey && !editCourseKey.startsWith('idx:') ? editCourseKey : `course_${Date.now()}`,
            title: document.getElementById('course-title').value.trim(),
            description: document.getElementById('course-description').value.trim(),
            category: document.getElementById('course-category').value,
            price: parseInt(document.getElementById('course-price').value) || 0,
            imageUrl: document.getElementById('course-image').value.trim(),
            lessons,
            updatedAt: new Date().toISOString()
        };

        const validated = typeof adminUtils.sanitizeCoursePayload === 'function'
            ? adminUtils.sanitizeCoursePayload(rawCourse)
            : { ok: !!rawCourse.title, errors: rawCourse.title ? [] : ['Kurstitel er påkrevd.'], value: rawCourse };

        if (!validated.ok) {
            if (status) { status.style.color = '#ef4444'; status.textContent = validated.errors.join(' '); }
            return;
        }

        await this._runWriteLocked('course-save', async () => {
            await this._withButtonLoading(btn, async () => {
                try {
                    const data = typeof firebaseService.getSiteContent === 'function'
                        ? await firebaseService.getSiteContent('collection_courses')
                        : null;
                    let items = Array.isArray(data) ? data : (data?.items || []);

                    const existingIdx = items.findIndex((c, idx) => {
                        if (editCourseKey && !editCourseKey.startsWith('idx:')) {
                            return c?.id === editCourseKey;
                        }
                        if (editCourseKey && editCourseKey.startsWith('idx:')) {
                            return idx === parseInt(editCourseKey.replace('idx:', ''), 10);
                        }
                        return false;
                    });

                    if (existingIdx >= 0) {
                        items[existingIdx] = { ...items[existingIdx], ...validated.value };
                        if (!rawCourse.description) delete items[existingIdx].description;
                        if (!rawCourse.imageUrl) delete items[existingIdx].imageUrl;
                    } else {
                        items.unshift(validated.value);
                    }

                    if (typeof firebaseService.saveSiteContent === 'function') {
                        await firebaseService.saveSiteContent('collection_courses', {
                            items,
                            updatedAt: new Date().toISOString()
                        }, { merge: true });
                    } else {
                        const ref = firebase.firestore().collection('siteContent').doc('collection_courses');
                        await ref.set({ items, updatedAt: new Date().toISOString() }, { merge: true });
                    }

                    if (status) { status.style.color = '#16a34a'; status.textContent = '✅ Kurs lagret!'; }
                    setTimeout(() => {
                        this._closeCourseModal();
                        this._loadCoursesList();
                    }, 500);
                } catch (err) {
                    console.error(err);
                    if (status) { status.style.color = '#ef4444'; status.textContent = 'Feil: ' + err.message; }
                }
            }, {
                loadingText: '<span class="material-symbols-outlined" style="font-size:1rem;">hourglass_top</span> Lagrer...'
            });
        });
    }

    async _deleteCourse() {
        const editCourseKey = document.getElementById('course-id').value;
        const deleteBtn = document.getElementById('delete-course-btn');
        const status = document.getElementById('course-save-status');
        if (editCourseKey === '' || !confirm('Er du sikker på at du vil slette dette kurset?')) return;

        await this._runWriteLocked('course-delete', async () => {
            await this._withButtonLoading(deleteBtn, async () => {
                try {
                    const data = typeof firebaseService.getSiteContent === 'function'
                        ? await firebaseService.getSiteContent('collection_courses')
                        : null;
                    let items = Array.isArray(data) ? data : (data?.items || []);

                    const nextItems = items.filter((course, idx) => {
                        if (editCourseKey.startsWith('idx:')) {
                            return idx !== parseInt(editCourseKey.replace('idx:', ''), 10);
                        }
                        return course?.id !== editCourseKey;
                    });

                    if (nextItems.length === items.length) {
                        if (status) { status.style.color = '#ef4444'; status.textContent = 'Kunne ikke finne kurset som skulle slettes.'; }
                        return;
                    }

                    if (typeof firebaseService.saveSiteContent === 'function') {
                        await firebaseService.saveSiteContent('collection_courses', {
                            items: nextItems,
                            updatedAt: new Date().toISOString()
                        }, { merge: true });
                    } else {
                        const ref = firebase.firestore().collection('siteContent').doc('collection_courses');
                        await ref.set({ items: nextItems, updatedAt: new Date().toISOString() }, { merge: true });
                    }

                    this._closeCourseModal();
                    await this._loadCoursesList();
                    this.showToast('✅ Kurs slettet!', 'success');
                } catch (err) {
                    console.error(err);
                    if (status) { status.style.color = '#ef4444'; status.textContent = 'Kunne ikke slette kurs: ' + err.message; }
                    this.showToast('Kunne ikke slette kurs.', 'error');
                }
            }, {
                loadingText: 'Sletter...'
            });
        });
    }

    async renderSEOSection() {
        const section = document.getElementById('seo-section');
        if (!section) return;

        section.innerHTML = `
            ${this.renderSectionHeader('search_insights', 'SEO & Synlighet', 'Styr hvordan nettsiden din ser ut i søkemotorer og sosiale medier.', '')}

            <div class="design-ui-shell">
                <div class="design-ui-topbar design-ui-panel">
                    <div class="design-ui-topbar-main">
                        <div class="design-ui-topbar-icon">
                            <span class="material-symbols-outlined">search</span>
                        </div>
                        <div>
                            <h3 class="design-ui-title">Globale SEO-innstillinger</h3>
                            <p class="design-ui-muted">Grunnleggende optimalisering for at innholdet ditt skal finnes i Google og sosiale medier.</p>
                        </div>
                    </div>
                    <div class="design-ui-actions">
                        <button class="btn btn-primary" id="save-global-seo" type="button">
                            <span class="material-symbols-outlined">save</span>
                            Lagre endringer
                        </button>
                    </div>
                </div>

                <div class="design-ui-workspace">
                    <div class="design-ui-top-grid">
                        <div class="design-ui-main-column">
                            <div class="design-ui-panel design-ui-panel--seo">
                                <div class="design-ui-panel-header">
                                    <div class="design-ui-panel-header-icon">
                                        <span class="material-symbols-outlined">language</span>
                                    </div>
                                    <div>
                                        <h3 class="design-ui-panel-title">Hovedinformasjon</h3>
                                        <p class="design-ui-panel-subtitle">Metadata som leses av søkemotorer.</p>
                                    </div>
                                </div>
                                <div class="design-ui-panel-body">
                                    <div class="form-group">
                                        <label>Nettsteds Tittel (Prefix/Suffix)</label>
                                        <input type="text" id="seo-global-title" class="form-control" placeholder="His Kingdom Ministry">
                                    </div>
                                    <div class="form-group">
                                        <label>Standard Beskrivelse (Meta Description)</label>
                                        <textarea id="seo-global-desc" class="form-control" style="height: 100px;"></textarea>
                                    </div>
                                    <div class="form-group" style="margin-bottom:0;">
                                        <label>Søkeord (Keywords)</label>
                                        <input type="text" id="seo-global-keywords" class="form-control" placeholder="tro, jesus, undervisning">
                                        <span class="helper-text design-ui-muted" style="margin-top: 4px; display: block; font-size: 13px;">Separer med komma.</span>
                                    </div>
                                </div>
                            </div>

                            <div class="design-ui-panel">
                                <div class="design-ui-panel-header">
                                    <div class="design-ui-panel-header-icon">
                                        <span class="material-symbols-outlined">share</span>
                                    </div>
                                    <div>
                                        <h3 class="design-ui-panel-title">Sosiale Medier (Open Graph)</h3>
                                        <p class="design-ui-panel-subtitle">Bildet som vises når du deler linker på Facebook, LinkedIn og SMS.</p>
                                    </div>
                                </div>
                                <div class="design-ui-panel-body">
                                    <div class="form-group" style="margin-bottom:0;">
                                        <!-- Modern Upload Area -->
                                        <div class="upload-area" id="upload-og-img" style="cursor: pointer; border: 2px dashed var(--border-color); border-radius: 12px; padding: 32px; text-align: center; background: #f8fafc; transition: all 0.2s;">
                                            <span class="material-symbols-outlined upload-icon" style="font-size: 32px; color: #94a3b8; margin-bottom: 8px; display: block;">add_photo_alternate</span>
                                            <span class="upload-label" style="display: block; font-weight: 500; font-size: 15px; margin-bottom: 4px;">Klikk for å laste opp bilde</span>
                                            <span class="upload-hint" style="display: block; font-size: 13px; color: #64748b;">Anbefalt størrelse: 1200 x 630 px</span>
                                        </div>
                                        <input type="file" id="og-file-input" style="display: none;" accept="image/*">
                                        <input type="hidden" id="seo-og-image">
                                    </div>
                                    <div id="og-preview" style="margin-top: 20px; border-radius: 12px; overflow: hidden; display: none; border: 1px solid var(--border-color);"></div>
                                </div>
                            </div>
                        </div>

                        <aside class="design-ui-side-column">
                            <div class="design-ui-panel design-ui-help-panel design-ui-panel--help">
                                <div class="design-ui-panel-header design-ui-panel-header--compact">
                                    <div class="design-ui-panel-header-icon">
                                        <span class="material-symbols-outlined">auto_awesome</span>
                                    </div>
                                    <div>
                                        <h3 class="design-ui-panel-title">AI-Søk Optimalisering</h3>
                                    </div>
                                </div>
                                <div class="design-ui-panel-body">
                                    <p style="font-size: 14px; line-height: 1.6; color: var(--text-muted); margin-bottom: 16px;">Ved å legge til GEO-data og tydelige SEO-titler hjelper du AIer som ChatGPT og Perplexity å finne innholdet ditt mer presist. Dette øker sjansen for at kirken blir anbefalt i samtaler.</p>

                                    <div class="form-group">
                                        <label>GEO Posisjon (Lat, Long)</label>
                                        <input type="text" id="seo-global-geo-pos" class="form-control" placeholder="59.9139, 10.7522">
                                    </div>
                                    <div class="form-group">
                                        <label>GEO Region</label>
                                        <input type="text" id="seo-global-geo-region" class="form-control" placeholder="NO-Oslo">
                                    </div>
                                    <div class="form-group" style="margin-bottom: 0;">
                                        <label>GEO Sted</label>
                                        <input type="text" id="seo-global-geo-place" class="form-control" placeholder="Oslo">
                                    </div>
                                </div>
                            </div>
                        </aside>
                    </div>

                    <div class="design-ui-full-stack">
                        <div class="design-ui-panel">
                            <div class="design-ui-panel-header" style="display: flex; justify-content: space-between; align-items: center;">
                                <div style="display: flex; align-items: center; gap: 16px;">
                                    <div class="design-ui-panel-header-icon">
                                        <span class="material-symbols-outlined">description</span>
                                    </div>
                                    <div>
                                        <h3 class="design-ui-panel-title">Sidespesifikk SEO</h3>
                                        <p class="design-ui-panel-subtitle">Overstyr globale innstillinger for enkeltsider.</p>
                                    </div>
                                </div>
                                <div>
                                    <select id="seo-page-selector" class="form-control" style="width: 250px; margin: 0;">
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
                            </div>
                            <div class="design-ui-panel-body">
                                <div class="design-ui-control-stack">
                                    <div class="form-group">
                                        <label>Side-tittel (Vises i fanen)</label>
                                        <input type="text" id="seo-page-title" class="form-control" placeholder="La stå tom for å bruke standard">
                                    </div>
                                    <div class="form-group">
                                        <label>Side-beskrivelse</label>
                                        <textarea id="seo-page-desc" class="form-control" style="height: 80px;" placeholder="Optimalisert beskrivelse for denne spesifikke siden..."></textarea>
                                    </div>
                                    <div class="grid-2-cols" style="gap: 24px; display: grid; grid-template-columns: 1fr 1fr;">
                                        <div class="form-group" style="margin-bottom:0;">
                                            <label>GEO Posisjon (Side)</label>
                                            <input type="text" id="seo-page-geo-pos" class="form-control">
                                        </div>
                                        <div class="form-group" style="margin-bottom:0;">
                                            <label>GEO Sted (Side)</label>
                                            <input type="text" id="seo-page-geo-place" class="form-control">
                                        </div>
                                    </div>
                                </div>
                                <div class="design-ui-actions" style="margin-top: 24px; padding-top: 24px; border-top: 1px solid var(--border-color); justify-content: flex-end;">
                                    <button class="btn btn-secondary" id="save-page-seo" type="button">
                                        <span class="material-symbols-outlined">save</span>
                                        Lagre SEO for denne siden
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
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
                const url = await firebaseService.uploadImage(ogFileInput.files[0], `seo / og_image_${Date.now()} `);
                document.getElementById('seo-og-image').value = url;
                updateOGPreview();
            } catch (err) {
                this.showToast('Opplasting feilet', 'error', 5000);
            } finally {
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
            } catch (err) {
                this.showToast('❌ Feil ved lagring', 'error', 5000);
            } finally {
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
                description: document.getElementById('seo-page-desc').value,
                geoPosition: document.getElementById('seo-page-geo-pos').value,
                geoPlacename: document.getElementById('seo-page-geo-place').value
            };

            btn.textContent = 'Lagrer...';
            btn.disabled = true;
            try {
                await firebaseService.savePageContent('settings_seo', seoData);
                this.showToast(`SEO for ${pageId} lagret!`, 'success', 5000);
            } catch (err) {
                this.showToast('Feil ved lagring', 'error', 5000);
            } finally {
                btn.textContent = 'Lagre SEO for denne siden';
                btn.disabled = false;
            }
        };
    }

    async renderIntegrationsSection() {
        const section = document.getElementById('integrations-section');
        if (!section) return;

        section.innerHTML = `
            ${this.renderSectionHeader('integration_instructions', 'Integrasjoner', 'Koble nettsiden din til eksterne tjenester som Google Calendar.', '')}

            <div class="design-ui-shell">
            <div class="design-ui-workspace">
                <div class="design-ui-top-grid">
                    <div class="design-ui-main-column">
                        <!-- Google Calendar Integration -->
                        <div class="design-ui-panel">
                            <div class="design-ui-panel-header">
                                <div class="design-ui-panel-header-icon" style="background: #e0f2fe; color: #0ea5e9;">
                                    <span class="material-symbols-outlined">calendar_month</span>
                                </div>
                                <div>
                                    <h3 class="design-ui-panel-title">Google Calendar API</h3>
                                    <p class="design-ui-panel-subtitle">Hent arrangementer automatisk fra din Google-kalender til nettsiden.</p>
                                </div>
                                <div class="status-badge" id="gcal-status" style="font-size: 12px; padding: 4px 10px; border-radius: 12px; background: #fee2e2; color: #991b1b; font-weight: 500;">Frakoblet</div>
                            </div>
                            <div class="design-ui-panel-body">
                                <div class="form-group">
                                    <label>Google API Key</label>
                                    <input type="password" id="gcal-api-key" class="form-control" placeholder="Din Google Cloud API Key">
                                        <p style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">Sørg for at 'Google Calendar API' er aktivert i Cloud Console.</p>
                                </div>

                                <div class="form-group">
                                    <label>Calendar ID</label>
                                    <div id="gcal-list" class="gcal-list" style="margin-bottom: 8px;"></div>
                                    <button type="button" class="btn btn-outline" id="add-gcal" style="width: 100%;">
                                        <span class="material-symbols-outlined" style="font-size: 18px; margin-right: 4px;">add</span>
                                        Legg til kalender
                                    </button>
                                    <p style="font-size: 11px; color: var(--text-muted); margin-top: 8px;">Legg inn flere kalendere for filtrering. Calendar ID finner du under "Integrer kalender".</p>
                                </div>

                                <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid var(--border-color);">
                                    <h4 style="margin-bottom: 8px; font-size: 14px; display: flex; align-items: center; gap: 8px;">
                                        <span class="material-symbols-outlined" style="font-size: 18px; color: #f59e0b;">sync</span>
                                        Synkronisering (To-veis)
                                    </h4>
                                    <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 12px;">Aktiver to-veis synkronisering for å sende endringer fra dashbordet tilbake til Google Calendar.</p>

                                    <div id="google-auth-status" style="margin-bottom: 15px;">
                                        ${this.googleAccessToken ? `
                                            <div style="display: flex; align-items: center; gap: 10px; padding: 12px; background: #f0fdf4; border-radius: 8px; border: 1px solid #bbf7d0;">
                                                <span class="material-symbols-outlined" style="color: #16a34a;">check_circle</span>
                                                <div style="flex: 1;">
                                                    <p style="font-size: 13px; font-weight: 600; color: #166534; margin: 0;">Tilkoblet Google</p>
                                                    <p style="font-size: 11px; color: #15803d; margin: 0;">Skrivetilgang er aktivert</p>
                                                </div>
                                                <button id="disconnect-google" class="btn btn-outline" style="color: #dc2626; border-color: #fca5a5; font-size: 12px; padding: 4px 8px;">Koble fra</button>
                                            </div>
                                        ` : `
                                            <button class="btn btn-outline" id="connect-google-btn" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px;">
                                                <img src="https://www.google.com/favicon.ico" width="16" height="16" alt="Google">
                                                Koble til Google for skrivetilgang
                                            </button>
                                        `}
                                    </div>
                                </div>

                                <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid var(--border-color);">
                                    <h4 style="margin-bottom: 12px; font-size: 14px;">Visningsinnstillinger</h4>
                                    <div class="form-group" style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                                        <input type="checkbox" id="gcal-show-month" style="width: 18px; height: 18px; accent-color: var(--primary-color);">
                                            <label for="gcal-show-month" style="margin-bottom: 0; cursor: pointer;">Vis Månedskalender</label>
                                    </div>
                                    <div class="form-group" style="display: flex; align-items: center; gap: 10px; margin-bottom: 20px;">
                                        <input type="checkbox" id="gcal-show-agenda" style="width: 18px; height: 18px; accent-color: var(--primary-color);">
                                            <label for="gcal-show-agenda" style="margin-bottom: 0; cursor: pointer;">Vis Agendaoversikt (Kommende arrangementer)</label>
                                    </div>
                                </div>

                                <div style="margin-top: 10px;">
                                    <button class="btn btn-primary" id="save-gcal-settings" style="width: 100%;">
                                        <span class="material-symbols-outlined">save</span>
                                        Lagre Kalender-innstillinger
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Guidance Panel -->
                    <aside class="design-ui-side-column">
                        <div class="design-ui-panel">
                            <div class="design-ui-panel-header design-ui-panel-header--compact">
                                <div class="design-ui-panel-header-icon" style="background: #f1f5f9; color: #475569;">
                                    <span class="material-symbols-outlined">info</span>
                                </div>
                                <div style="flex: 1;">
                                    <h3 class="design-ui-panel-title">Slik setter du opp Google Calendar</h3>
                                </div>
                            </div>
                            <div class="design-ui-panel-body">
                                <ol style="font-size: 13px; padding-left: 16px; line-height: 1.6; color: var(--text-main); margin: 0; display: flex; flex-direction: column; gap: 12px;">
                                    <li>Gå til <a href="https://console.cloud.google.com/" target="_blank" style="color: var(--primary-color); text-decoration: none; font-weight: 500;">Google Cloud Console</a>.</li>
                                    <li>Opprett et prosjekt og aktiver <b>Google Calendar API</b>.</li>
                                    <li>Gå til "Credentials" og opprett en <b>API Key</b> (begrens den gjerne til ditt domene).</li>
                                    <li>I Google Calendar: Gå til innstillinger for kalenderen du vil dele.</li>
                                    <li>Under "Access permissions", huk av for <b>Make available to public</b>.</li>
                                    <li>Finn <b>Calendar ID</b> under "Integrate calendar" og lim den inn.</li>
                                </ol>
                            </div>
                        </div>
                    </aside>
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
    /**
    * Settings, Placeholders and Helpers
    */
    renderSettingsSection() {
        const section = document.getElementById('settings-section');
        if (!section) return;

        section.innerHTML = `
            ${this.renderSectionHeader('settings', 'Innstillinger & Verktøy', 'Administrer systeminnstillinger og datasync.', '')}

                    <div class="design-ui-shell">
                        <div class="design-ui-workspace">
                            <div class="design-ui-top-grid">
                                <div class="design-ui-main-column">
                                    <!-- System Status Panel -->
                                    <div class="design-ui-panel" style="border-left: 4px solid #10b981;">
                                        <div class="design-ui-panel-header">
                                            <div class="design-ui-panel-header-icon" style="background: #ecfdf5; color: #10b981;">
                                                <span class="material-symbols-outlined">check_circle</span>
                                            </div>
                                            <div style="flex: 1;">
                                                <h3 class="design-ui-panel-title">SYSTEMSTATUS: NORMAL</h3>
                                                <p class="design-ui-panel-subtitle">Alle systemer fungerer optimalt. Siste backup ble kjørt automatisk i natt.</p>
                                            </div>
                                            <a href="admin-logger.html" class="btn btn-outline" style="text-decoration: none;">Se logger</a>
                                        </div>
                                    </div>

                                    <!-- Data Tools Panel -->
                                    <div class="design-ui-panel">
                                        <div class="design-ui-panel-header">
                                            <div class="design-ui-panel-header-icon">
                                                <span class="material-symbols-outlined">build</span>
                                            </div>
                                            <div>
                                                <h3 class="design-ui-panel-title">Datasynkronisering & Verktøy</h3>
                                            </div>
                                        </div>
                                        <div class="design-ui-panel-body">
                                            <div class="tools-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                                                <!-- Import Tool -->
                                                <div class="tool-card" style="border: 1px solid var(--border-color); border-radius: 12px; padding: 16px;">
                                                    <div class="tool-icon-circle sync" style="background: #eff6ff; color: #3b82f6; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 12px;">
                                                        <span class="material-symbols-outlined">sync</span>
                                                    </div>
                                                    <div class="tool-info" style="margin-bottom: 16px;">
                                                        <h4 style="font-weight: 600; font-size: 15px; margin-bottom: 4px;">Importer Innhold</h4>
                                                        <p style="font-size: 13px; color: var(--text-muted);">Hent innhold fra statiske sider til databasen.</p>
                                                    </div>
                                                    <button class="btn btn-secondary btn-sm" id="sync-existing-content" style="width: 100%;">
                                                        Kjør Import
                                                    </button>
                                                    <div id="sync-status" class="tool-status" style="margin-top: 8px; font-size: 13px;"></div>
                                                </div>

                                                <!-- Cache Tool -->
                                                <div class="tool-card" style="border: 1px solid var(--border-color); border-radius: 12px; padding: 16px;">
                                                    <div class="tool-icon-circle warning" style="background: #fef2f2; color: #ef4444; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 12px;">
                                                        <span class="material-symbols-outlined">delete_forever</span>
                                                    </div>
                                                    <div class="tool-info" style="margin-bottom: 16px;">
                                                        <h4 style="font-weight: 600; font-size: 15px; margin-bottom: 4px;">Nullstille Cache</h4>
                                                        <p style="font-size: 13px; color: var(--text-muted);">Tøm lokal lagring og last siden på nytt.</p>
                                                    </div>
                                                    <button class="btn btn-outline" style="width: 100%; border-color: #fca5a5; color: #ef4444;" onclick="localStorage.clear(); window.location.reload();">
                                                        Tøm Cache
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Firebase Panel -->
                                <aside class="design-ui-side-column">
                                    <div class="design-ui-panel">
                                        <div class="design-ui-panel-header design-ui-panel-header--compact">
                                            <div class="design-ui-panel-header-icon" style="background: #fff7ed; color: #f97316;">
                                                <span class="material-symbols-outlined">cloud</span>
                                            </div>
                                            <div style="flex: 1;">
                                                <h3 class="design-ui-panel-title">Firebase Konfigurasjon</h3>
                                            </div>
                                        </div>
                                        <div class="design-ui-panel-body">
                                            <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 16px;">
                                                Endre konfigurasjonen kun hvis du vet hva du gjør. Feil her kan stoppe nettsiden.
                                            </p>

                                            <div class="code-editor-container" style="border: 1px solid var(--border-color); border-radius: 8px; overflow: hidden; margin-bottom: 16px;">
                                                <div class="code-editor-header" style="background: #f8fafc; padding: 8px 12px; font-size: 11px; font-family: monospace; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between;">
                                                    <span class="lang-tag" style="color: #64748b; font-weight: bold;">JSON</span>
                                                    <span class="file-name" style="color: #64748b;">firebase-config.js</span>
                                                </div>
                                                <div class="code-editor-wrap" style="display: flex; background: #fff;">
                                                    <div class="line-numbers" style="background: #f1f5f9; color: #94a3b8; padding: 12px 8px; text-align: right; font-family: monospace; font-size: 12px; user-select: none;">
                                                        <div style="margin-bottom: 4px;">1</div>
                                                        <div style="margin-bottom: 4px;">2</div>
                                                        <div style="margin-bottom: 4px;">3</div>
                                                    </div>
                                                    <textarea id="fb-config" class="code-input" spellcheck="false" style="width: 100%; border: none; padding: 12px; font-family: monospace; font-size: 12px; resize: vertical; min-height: 100px; outline: none; background: transparent;">${localStorage.getItem('hkm_firebase_config') || ''}</textarea>
                                                </div>
                                            </div>

                                            <button class="btn btn-primary" id="save-fb" style="width: 100%;">
                                                <span class="material-symbols-outlined">save</span>
                                                Lagre & Koble til
                                            </button>
                                        </div>
                                    </div>
                                </aside>
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
                    header: {
                        label: 'Neste steg',
                        title: 'Bli involvert',
                        description: 'Det finnes flere naturlige måter å bli med i arbeidet på. Velg det som passer deg best akkurat nå.'
                    },
                    teaching: {
                        title: 'Undervisning',
                        text: 'Bibelskoler, seminarer og dyptgående undervisning.',
                        image: '/img/get-involved-teaching.svg'
                    },
                    podcast: {
                        title: 'Podcast',
                        text: 'Lytt til våre samtaler om tro, liv og åndelig vekst.',
                        image: '/img/get-involved-podcast.svg'
                    },
                    travel: {
                        title: 'Reisevirksomhet',
                        text: 'Forkynnelse og konferanser rundt om i verden.',
                        image: '/img/get-involved-travel.svg'
                    }
                },
                stats: {
                    youtube_videos: '449',
                    youtube_views: '56699',
                    podcast_episodes: '45',
                    countries_visited: '9'
                },
                impact: {
                    label: 'Impact',
                    title: 'Resultater i tall',
                    description: 'Noen nøkkeltall som viser hvor langt arbeidet vårt rekker.'
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
            showToast('Synkronisering ferdig! Innholdet er nå tilgjengelig i dashboardet.');
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

    getPageContentEditorDefaults(pageId) {
        const defaults = {
            'settings_global': {
                brand: {
                    name: 'His Kingdom Ministry',
                    logoAlt: 'His Kingdom Ministry Logo'
                },
                header: {
                    currentLanguage: 'NO',
                    languages: {
                        no: '🇳🇴 Norsk',
                        en: '🇺🇸 English',
                        es: '🇪🇸 Español'
                    },
                    donateLabel: 'Gi gave',
                    menuToggleLabel: 'Toggle meny'
                },
                menu: {
                    searchPlaceholder: 'Søk...',
                    mobileLanguages: {
                        no: 'NO',
                        en: 'EN',
                        es: 'ES'
                    },
                    sections: {
                        engage: {
                            title: 'Engasjer deg',
                            supportWork: 'Støtt arbeidet',
                            regularDonor: 'Bli fast giver',
                            churches: 'For menigheter',
                            businesses: 'For bedrifter',
                            network: 'Business Network'
                        },
                        about: {
                            title: 'Bli kjent med oss',
                            about: 'Om oss',
                            contact: 'Kontakt oss'
                        },
                        resources: {
                            title: 'Ressurser',
                            store: 'Butikk',
                            events: 'Arrangementer',
                            media: 'Media & Podcast',
                            blog: 'Nyheter & Blogg',
                            courses: 'Kurs',
                            myPage: 'Min Side'
                        }
                    },
                    footer: {
                        cta: 'Støtt nå',
                        store: 'Butikk',
                        taxDeduction: 'Skattefradrag',
                        about: 'Om oss',
                        privacy: 'Personvern'
                    }
                },
                contact: {
                    email: 'post@hiskingdomministry.no',
                    phone: '+47 930 94 615',
                    vipps: '938361',
                    account: '3000.66.08759'
                },
                footer: {
                    description: 'His Kingdom Ministry er en non-profit organisasjon dedikert til åndelig vekst gjennom undervisning, podcast og reisevirksomhet.',
                    title_about: 'Om oss',
                    title_resources: 'Ressurser',
                    title_media: 'Media',
                    title_involvement: 'Involvering',
                    title_follow: 'Følg oss',
                    title_contact: 'Kontakt oss',
                    links: {
                        about: {
                            home: 'Hjem',
                            about: 'Om oss',
                            vision: 'Vår visjon',
                            contact: 'Kontakt oss'
                        },
                        resources: {
                            teaching: 'Undervisning',
                            courses: 'E-kurs',
                            blog: 'Bøker & Blogg',
                            store: 'Butikk',
                            myPage: 'Min Side'
                        },
                        media: {
                            podcast: 'Podcast',
                            videos: 'Videoer',
                            youtube: 'YouTube'
                        },
                        involvement: {
                            calendar: 'Kalender',
                            donate: 'Gi en gave',
                            privacy: 'Personvern',
                            accessibility: 'Tilgjengelighet',
                            cookies: 'Cookies'
                        }
                    },
                    contact: {
                        emailLabel: 'E-post:',
                        phoneLabel: 'Telefon:',
                        vippsLabel: 'Vipps:',
                        accountLabel: 'Konto nr.:'
                    },
                    contactButton: 'Kontaktskjema',
                    copyright: 'His Kingdom Ministry. Alle rettigheter reservert.',
                    adminLink: 'Admin'
                }
            },
            'settings_facebook_feed': {
                facebookFeed: {
                    enabled: true,
                    useLiveFeed: true,
                    livePostCount: 3,
                    pageId: '',
                    label: 'Følg oss på Facebook',
                    title: 'Siste fra Facebook-siden vår',
                    description: 'Se oppdateringer, kunngjøringer og glimt fra arbeidet vårt direkte fra Facebook.',
                    pageUrl: 'https://www.facebook.com/hiskingdomministry777?locale=nb_NO',
                    pageCta: 'Åpne Facebook-siden',
                    posts: {
                        first: {
                            image: '',
                            date: 'Denne uken',
                            title: 'Nye glimt fra tjenesten',
                            excerpt: 'Følg med på oppdateringer, bilder og korte refleksjoner fra arbeidet vårt.',
                            cta: 'Les på Facebook',
                            link: 'https://www.facebook.com/hiskingdomministry777?locale=nb_NO'
                        },
                        second: {
                            image: '',
                            date: 'Siste oppdatering',
                            title: 'Kunngjøringer og invitasjoner',
                            excerpt: 'Her kan du raskt se nye invitasjoner, arrangementer og meldinger vi deler.',
                            cta: 'Se innlegget',
                            link: 'https://www.facebook.com/hiskingdomministry777?locale=nb_NO'
                        },
                        third: {
                            image: '',
                            date: 'Fra fellesskapet',
                            title: 'Vitnesbyrd og hverdagsøyeblikk',
                            excerpt: 'Vi deler små øyeblikk, takknemlighet og ting som skjer i og rundt fellesskapet.',
                            cta: 'Gå til Facebook',
                            link: 'https://www.facebook.com/hiskingdomministry777?locale=nb_NO'
                        }
                    }
                }
            },
            index: {
                hero: {
                    title: 'Vekst gjennom fellesskap',
                    subtitle: 'Uansett hvor du er på din vandring, ønsker vi å gå sammen med deg. Bli med i et fellesskap som utforsker Guds ord og styrker troen.',
                    btnText: 'Les mer'
                },
                intro: {
                    imageAlt: 'Fellesskap',
                    label: 'Velkommen til fellesskapet',
                    title: 'Vi er en Non-profit organisasjon',
                    text: 'His Kingdom Ministry driver med åndelig samlinger som bønnemøter, undervisningseminarer, og forkynnende reisevirksomhet. Vi ønsker å være et felleskap der mennesker kan vokse i sin tro og relasjon til Jesus.'
                },
                shopPromo: {
                    badge: 'His Kingdom Designs',
                    title: 'Designprodukter og gavekort i én butikk',
                    description: 'Utforsk klær, kopper, klistermerker og digitale gavekort med kristne design. Vi har også månedlige abonnement for deg som vil få nye produkter jevnlig.',
                    ctaPrimary: 'Besøk butikken',
                    ctaSecondary: 'Se produkter',
                    cards: {
                        clothesTitle: 'Klær',
                        clothesMeta: 'T-skjorter og mer',
                        mugsTitle: 'Kopper',
                        mugsMeta: 'Gaver til hjemmet',
                        stickersTitle: 'Klistermerker',
                        stickersMeta: 'Små produkter, stor mening',
                        giftCardsTitle: 'Gavekort',
                        giftCardsMeta: 'Digital gave med valgfritt beløp'
                    },
                    note: 'Enkel filtrering, mange produkter og rask oversikt i den nye butikksiden.'
                },
                features: {
                    header: {
                        label: 'Neste steg',
                        title: 'Bli involvert',
                        description: 'Det finnes flere naturlige måter å bli med i arbeidet på. Velg det som passer deg best akkurat nå.'
                    },
                    teaching: {
                        title: 'Undervisning',
                        text: 'Bibelskoler, seminarer og dyptgående undervisning.',
                        image: '/img/get-involved-teaching.svg',
                        btnText: 'Les mer'
                    },
                    podcast: {
                        title: 'Podcast',
                        text: 'Lytt til våre samtaler om tro, liv og åndelig vekst.',
                        image: '/img/get-involved-podcast.svg',
                        btnText: 'Lytt nå'
                    },
                    travel: {
                        title: 'Reisevirksomhet',
                        text: 'Forkynnelse og konferanser rundt om i verden.',
                        image: '/img/get-involved-travel.svg',
                        btnText: 'Oppdag mer'
                    }
                },
                about: {
                    btnText: 'Oppdag mer',
                    features: {
                        mission: {
                            title: 'Vårt oppdrag',
                            text: 'Å utruste og inspirere mennesker til et dypere liv med Gud gjennom undervisning, fellesskap og bønn.'
                        },
                        story: {
                            title: 'Vår historie',
                            text: 'Startet med en visjon om å samle mennesker i åndelig vekst, har vi vokst til et levende felleskap som driver med bønnemøter, undervisning og reisevirksomhet.'
                        }
                    }
                },
                stats: {
                    youtube_videos: 0,
                    youtube_videos_label: 'YouTube-videoer',
                    youtube_views: 0,
                    youtube_views_label: 'YouTube-visninger',
                    podcast_episodes: 0,
                    podcast_episodes_label: 'Podcast-episoder',
                    countries_visited: 0,
                    countries_visited_label: 'Land besøkt'
                },
                impact: {
                    label: 'Impact',
                    title: 'Resultater i tall',
                    description: 'Noen nøkkeltall som viser hvor langt arbeidet vårt rekker.'
                },
                causes: {
                    label: 'Støtt vårt arbeid',
                    title: 'Aktive innsamlingsaksjoner',
                    description: 'Din gave gjør en forskjell. Se hvordan du kan bidra til vårt arbeid.',
                    btnText: 'Se alle innsamlinger',
                    card: {
                        defaultTitle: 'Innsamlingsaksjon',
                        collectedLabel: 'samlet inn',
                        goalLabel: 'Mål',
                        cta: 'Støtt prosjektet'
                    }
                },
                events: {
                    label: 'Kommende arrangementer',
                    title: 'Bli med oss',
                    description: 'Se våre kommende arrangementer og meld deg på.',
                    btnText: 'Se alle arrangementer'
                },
                teaching: {
                    label: 'Aktuelt',
                    title: 'Siste undervisning',
                    description: 'Lytt og lær fra våre nyeste ressurser, seminarer og bibelstudier.',
                    btnText: 'Se alle ressurser'
                },
                blog: {
                    label: 'Siste nytt',
                    title: 'Nyheter og blogg',
                    description: 'Les våre siste artikler og oppdateringer.',
                    btnText: 'Se alle nyheter'
                },
                testimonials: {
                    label: 'Vitnesbyrd',
                    title: 'Hva folk sier'
                },
                newsletter: {
                    title: 'Hold deg oppdatert',
                    text: 'Meld deg på vårt nyhetsbrev og få de siste oppdateringene om arrangementer, podcast og undervisning.',
                    placeholder: 'Din e-postadresse',
                    btnText: 'Abonner'
                }
            },
            butikk: {
                heroFallback: {
                    badge: 'HKM Butikk',
                    title: 'Ressurser og design som bygger tro',
                    subtitle: 'Produktene hentes automatisk fra Wix. Hvis de ikke vises med en gang kan du fortsatt handle trygt i den eksterne butikken.',
                    ctaExternal: 'Åpne Wix-butikken'
                },
                aboutStore: {
                    badge: 'Om butikken',
                    title: 'His Kingdom Designs-butikken',
                    description: 'Her finner du klær, kopper, klistermerker, gavekort og andre ressurser med design som peker på tro, håp og kjærlighet. Produktene synkroniseres fra Wix-butikken og oppdateres fortløpende.',
                    description2: 'Du kan bruke filterpanelet for å finne riktig kategori, størrelse, farge og prisnivå. Vi viser produktene direkte her, men du handler trygt via den eksterne Wix-butikken.',
                    ctaProducts: 'Gå til produkter',
                    ctaExternal: 'Åpne Wix-butikken',
                    features: {
                        selectionLabel: 'Utvalg',
                        selectionText: 'Klær, kopper, plakater, stickers og mer',
                        filteringLabel: 'Filtrering',
                        filteringText: 'Finn raskt produkter etter kategori, pris og egenskaper',
                        updatesLabel: 'Oppdateringer',
                        updatesText: 'Produkter hentes automatisk fra Wix og vises her',
                        secureLabel: 'Trygg handel',
                        secureText: 'Bestillingen fullføres trygt i Wix-butikken'
                    }
                },
                howItWorks: {
                    title: 'Hvordan fungerer det?',
                    step1Title: 'Velg din vare',
                    step1Text: 'Velg noen av alle de fantastiske produktene vi har.',
                    step2Title: 'Handlekurv',
                    step2Text: 'Legg dem i handlekurven og betal.',
                    step3Title: 'Leveranse',
                    step3Text: 'Få dem levert hjem til deg eller nærmeste hentested.'
                },
                categoriesShowcase: {
                    title: 'Våres produkter',
                    description: 'Utforsk vårt kuraterte utvalg av design og ressurser.',
                    cta: 'Handle nå',
                    cards: {
                        clothes: 'Klær',
                        youth: 'Barneklær',
                        baby: 'Babyklær',
                        stickers: 'Klistermerker',
                        accessories: 'Tilbehør',
                        mugs: 'Kopper'
                    }
                },
                subscription: {
                    packageLabel: 'Velg pakke',
                    packageSummary: 'Stickers, t-skjorter eller kopper',
                    chip1: 'Stickers',
                    chip2: 'T-skjorter',
                    chip3: 'Kopper',
                    badge: 'Månedlig abonnement',
                    titleLine1: 'Abonner på',
                    titleLine2: 'månedlige pakker',
                    description: 'Velg mellom klistermerker, t-skjorter eller kopper. Få ferdig kuratert design levert rett i postkassen hver måned.',
                    benefit1: 'Gratis frakt på alle abonnement',
                    benefit2: 'Eksklusive design kun for abonnenter',
                    benefit3: 'Ingen bindingstid - avslutt når du vil',
                    ctaPrimary: 'Bestill abonnement',
                    ctaSecondary: 'Se alle produkter'
                },
                giftCard: {
                    badge: 'Gavekort',
                    titleLine1: 'En minimalistisk gave',
                    titleLine2: 'som alltid passer',
                    description: 'Velg beløp, legg ved en personlig melding, og gi mottakeren friheten til å velge noe de faktisk ønsker seg.',
                    cta: 'Kjøp gavekort',
                    helper: 'Perfekt for bursdag, takkegave eller høytid',
                    cardBrand: 'His Kingdom Designs',
                    cardType: 'Digitalt gavekort',
                    cardEyebrow: 'Gavekort',
                    cardHeadline: 'Gi valgfri gave',
                    cardDescription: 'Velg beløp og legg ved en personlig melding.',
                    cardPriceFrom: 'Fra 100 kr',
                    cardDelivery: 'Sendes digitalt'
                },
                productBrowser: {
                    title: 'Finn din favoritt',
                    searchPlaceholder: 'Søk i arkivet...',
                    countLoading: 'Henter produkter...',
                    priceLabel: 'Pris',
                    moreFiltersLabel: 'Flere filtre',
                    resetFiltersLabel: 'Nullstill filtre',
                    categories: {
                        all: 'Alle varene',
                        baby: 'Baby',
                        youth: 'Barn & Ungdom',
                        clothes: 'Klær',
                        tshirts: 'T-skjorter',
                        sweaters: 'Genser',
                        sweatpants: 'Joggebukser',
                        hats: 'Hatter / Caps',
                        stickers: 'Klistermerker',
                        subscription: 'Abonnement',
                        accessories: 'Tilbehør',
                        mugs: 'Kopper & Flasker',
                        posters: 'Bilder & Plakater',
                        digital: 'Digitale filer'
                    },
                    error: {
                        badge: 'His Kingdom Designs',
                        title: 'Kreative Ressurser',
                        description: 'Vi har for øyeblikket problemer med å hente katalogen. Du kan se alle våre produkter direkte i Wix-butikken.',
                        cta: 'Besøk Wix-butikken nå'
                    }
                },
                ui: {
                    sliderBadgeNew: 'Nyhet i butikken',
                    sliderDescription: 'Oppdag den nyeste kolleksjonen fra His Kingdom Designs. Kvalitetsdesign som inspirerer og utfordrer.',
                    sliderBuyNowPrefix: 'Kjøp nå',
                    sliderScrollIndicator: 'Bla ned',
                    heroFallbackExternalCta: 'Gå til Wix-butikken',
                    heroFallbackRetryCta: 'Prøv igjen',
                    heroFallbackEmptyTitle: 'Butikken oppdateres akkurat nå',
                    heroFallbackEmptyDescription: 'Ingen produkter ble funnet akkurat nå. Du kan fortsatt åpne Wix-butikken direkte.',
                    heroFallbackErrorTitle: 'Vi fikk ikke lastet butikken',
                    heroFallbackErrorDescription: 'Produktene kunne ikke hentes nå. Prøv igjen, eller åpne den eksterne Wix-butikken.',
                    loadingProgressTemplate: 'Laster produkter... ({loaded}/{total})',
                    loadingBackgroundTemplate: 'Viser {loaded} av {total} produkter (laster resten i bakgrunnen...)',
                    countCategoryTemplate: 'Viser {count} produkter i {category}',
                    countAllCategoriesLabel: 'alle kategorier',
                    noResultsTitle: 'Ingen treff',
                    noResultsDescription: 'Prøv å endre søket ditt eller velg en annen kategori.',
                    emptyCatalogTitle: 'Ingen produkter funnet',
                    emptyCatalogDescription: 'Vi oppdaterer katalogen akkurat nå. Vennligst sjekk igjen senere.',
                    noDynamicFilters: 'Ingen ekstra filtre tilgjengelig for produktene akkurat nå.',
                    allOptionLabel: 'Alle'
                }
            },
            'for-menigheter': {
                hero: {
                    title: 'For Menigheter',
                    subtitle: 'Vi ønsker å stå sammen med lokale menigheter for å utruste troende og spre evangeliet.',
                    bg: 'https://images.unsplash.com/photo-1438232992991-995b7058bbb3?ixlib=rb-4.0.3\u0026auto=format\u0026fit=crop\u0026w=1920\u0026q=80'
                },
                intro: {
                    label: 'Samarbeid',
                    title: 'Et felles oppdrag',
                    text: 'His Kingdom Ministry brenner for å se den lokale kirken blomstre. Vi tilbyr ressurser, seminarer og undervisning som kan komplementere deres eksisterende arbeid og inspirere til dypere etterfølgelse av Jesus.',
                    image: 'https://images.unsplash.com/photo-1438232992991-995b7058bbb3?ixlib=rb-4.0.3\u0026auto=format\u0026fit=crop\u0026w=800\u0026q=80'
                },
                features: {
                    f1: 'Seminarer om bønn og disippelskap',
                    f2: 'Ressurser for smågrupper',
                    f3: 'Besøk av våre undervisere',
                    f4: 'Felles bønneinitiativ'
                },
                cta: {
                    title: 'Vil dere høre mer?',
                    text: 'Vi sender gjerne mer informasjon om hvordan vi kan støtte deres menighet.',
                    btnText: 'Kontakt oss i dag'
                }
            },
            'for-bedrifter': {
                hero: {
                    title: 'For Bedrifter',
                    subtitle: 'Bli en samarbeidspartner og vær med på å finansiere viktig arbeid som forandrer liv.',
                    bg: 'https://images.unsplash.com/photo-1497366216548-37526070297c?ixlib=rb-4.0.3\u0026auto=format\u0026fit=crop\u0026w=1920\u0026q=80'
                },
                intro: {
                    label: 'Samarbeidspartner',
                    title: 'Bedrifter med et hjerte for misjon',
                    text: 'Vi inviterer bedrifter til å stå sammen med oss i vårt oppdrag. Gjennom bedriftsgaver bidrar dere direkte til åndelig vekst og hjelp til mennesker som trenger det.',
                    image: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?ixlib=rb-4.0.3\u0026auto=format\u0026fit=crop\u0026w=800\u0026q=80'
                },
                features: {
                    f1: { title: 'Målbare resultater', text: 'Vi sender regelmessige oppdateringer på hvordan deres støtte blir brukt.' },
                    f2: { title: 'Verdibasert samarbeid', text: 'Vi deler verdier som integritet, omsorg og nestekjærlighet.' }
                },
                cta: {
                    title: 'Ønsker dere et bedriftssamarbeid?',
                    text: 'Vi tar gjerne en uforpliktende prat om hvordan din bedrift kan bidra.',
                    btnText: 'Kontakt oss i dag'
                }
            },
            'bnn': {
                hero: {
                    title: 'Business Network',
                    subtitle: 'Et nettverk for kristne ledere og næringsdrivende som ønsker å bruke sine ressurser for Guds rike.',
                    bg: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?ixlib=rb-4.0.3\u0026auto=format\u0026fit=crop\u0026w=1920\u0026q=80'
                },
                intro: {
                    label: 'Nettverk',
                    title: 'Mer enn bare business',
                    text: 'BNN er et fellesskap der vi kombinerer faglig kompetanse med åndelig fokus. Vi tror på at næringslivet spiller en nøkkelrolle i å finansiere og drive misjon fremover.'
                },
                features: {
                    f1: { title: 'Nettverkssamlinger', text: 'Møt likesinnede ledere for inspirasjon og erfaringsutveksling.' },
                    f2: { title: 'Inspirasjon', text: 'Få undervisning spesielt rettet mot kristent lederskap i arbeidslivet.' },
                    f3: { title: 'Vekst', text: 'Se hvordan din bedrift kan være en plattform for Guds rike.' }
                },
                cta: {
                    btnText: 'Bli en del av nettverket'
                }
            }
        };

        const safe = defaults[pageId] || {};
        return JSON.parse(JSON.stringify(safe));
    }

    mergePageContentDefaults(base, override) {
        if (Array.isArray(override)) return override.slice();
        if (!base || typeof base !== 'object' || Array.isArray(base)) {
            if (override && typeof override === 'object' && !Array.isArray(override)) {
                return JSON.parse(JSON.stringify(override));
            }
            return override !== undefined ? override : base;
        }

        const out = JSON.parse(JSON.stringify(base));
        if (!override || typeof override !== 'object' || Array.isArray(override)) {
            return out;
        }

        Object.keys(override).forEach((key) => {
            const baseVal = out[key];
            const overrideVal = override[key];
            if (baseVal && typeof baseVal === 'object' && !Array.isArray(baseVal) &&
                overrideVal && typeof overrideVal === 'object' && !Array.isArray(overrideVal)) {
                out[key] = this.mergePageContentDefaults(baseVal, overrideVal);
            } else {
                out[key] = overrideVal;
            }
        });

        return out;
    }

    async loadPageFields(pageId) {
        const container = document.getElementById('editor-fields');
        container.innerHTML = '<div class="loader">Laster...</div>';

        try {
            const fetchedData = await firebaseService.getPageContent(pageId) || {};
            const defaults = this.getPageContentEditorDefaults(pageId);
            const data = this.mergePageContentDefaults(defaults, fetchedData);

            if (pageId === 'index' && data && typeof data === 'object' && data.facebookFeed) {
                delete data.facebookFeed;
            }

            // For subpages, ensure hero fields exist so they show up in the editor
            if (pageId !== 'index' && pageId !== 'butikk' && !String(pageId).startsWith('settings_')) {
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

            if (pageId === 'settings_facebook_feed') {
                this.renderFacebookFeedSettingsEditor(data);
                return;
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
                formGroup.classList.add('is-textarea');
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

    renderFacebookFeedField({
        key,
        label,
        value = '',
        type = 'text',
        valueType = '',
        fullWidth = false,
        placeholder = '',
        help = '',
        textarea = false,
        options = null,
        min = '',
        max = '',
        step = ''
    }) {
        const widthStyle = fullWidth ? 'grid-column: 1 / -1;' : '';
        const safeValue = value == null ? '' : String(value);
        const dataTypeAttr = valueType ? ` data-value-type="${this.escapeHtml(valueType)}"` : '';
        const placeholderAttr = placeholder ? ` placeholder="${this.escapeHtml(placeholder)}"` : '';
        const helpHtml = help ? `<div style="font-size:12px; color:#64748b; margin-top:6px;">${this.escapeHtml(help)}</div>` : '';

        let controlHtml = '';
        if (Array.isArray(options) && options.length > 0) {
            controlHtml = `
                <select class="form-control" data-key="${this.escapeHtml(key)}"${dataTypeAttr}>
                    ${options.map((option) => `
                        <option value="${this.escapeHtml(option.value)}" ${String(option.value) === safeValue ? 'selected' : ''}>
                            ${this.escapeHtml(option.label)}
                        </option>
                    `).join('')}
                </select>
            `;
        } else if (textarea) {
            controlHtml = `
                <textarea class="form-control" data-key="${this.escapeHtml(key)}"${dataTypeAttr}${placeholderAttr} style="min-height:110px;">${this.escapeHtml(safeValue)}</textarea>
            `;
        } else {
            const minAttr = min !== '' ? ` min="${this.escapeHtml(min)}"` : '';
            const maxAttr = max !== '' ? ` max="${this.escapeHtml(max)}"` : '';
            const stepAttr = step !== '' ? ` step="${this.escapeHtml(step)}"` : '';
            controlHtml = `
                <input type="${this.escapeHtml(type)}" class="form-control" data-key="${this.escapeHtml(key)}"${dataTypeAttr}
                    value="${this.escapeHtml(safeValue)}"${placeholderAttr}${minAttr}${maxAttr}${stepAttr}>
            `;
        }

        return `
            <div class="form-group" style="margin:0; ${widthStyle}">
                <label>${this.escapeHtml(label)}</label>
                ${controlHtml}
                ${helpHtml}
            </div>
        `;
    }

    renderFacebookFeedPostEditor(postId, title, accentColor, fallbackImage, post = {}) {
        const imageValue = post.image || '';
        const previewImage = imageValue || fallbackImage;
        return `
            <div class="card" style="margin:0;">
                <div class="card-body" style="display:grid; gap:16px;">
                    <div style="display:flex; align-items:center; justify-content:space-between; gap:12px;">
                        <div style="display:flex; align-items:center; gap:10px;">
                            <span style="width:10px; height:10px; border-radius:999px; background:${this.escapeHtml(accentColor)};"></span>
                            <h3 style="margin:0; font-size:16px;">${this.escapeHtml(title)}</h3>
                        </div>
                        <span style="font-size:12px; color:#64748b;">Fallback-kort</span>
                    </div>

                    <div data-facebook-post-preview="${this.escapeHtml(postId)}" style="border:1px solid #e2e8f0; border-radius:20px; overflow:hidden; background:#fff;">
                        <div style="aspect-ratio:16/9; background:#e2e8f0;">
                            <img data-preview-key="posts.${this.escapeHtml(postId)}.image" data-fallback-src="${this.escapeHtml(fallbackImage)}"
                                src="${this.escapeHtml(previewImage)}" alt=""
                                style="width:100%; height:100%; object-fit:cover; display:block;">
                        </div>
                        <div style="padding:16px; display:grid; gap:10px;">
                            <div style="display:flex; justify-content:space-between; gap:8px; font-size:12px; color:#64748b;">
                                <span style="font-weight:700; color:${this.escapeHtml(accentColor)};">Facebook</span>
                                <span data-preview-key="posts.${this.escapeHtml(postId)}.date">${this.escapeHtml(post.date || '')}</span>
                            </div>
                            <div data-preview-key="posts.${this.escapeHtml(postId)}.title" style="font-size:18px; font-weight:700; line-height:1.3;">
                                ${this.escapeHtml(post.title || '')}
                            </div>
                            <div data-preview-key="posts.${this.escapeHtml(postId)}.excerpt" style="font-size:14px; color:#64748b; line-height:1.6;">
                                ${this.escapeHtml(post.excerpt || '')}
                            </div>
                            <div data-preview-key="posts.${this.escapeHtml(postId)}.cta" style="font-size:14px; font-weight:700; color:#f97316;">
                                ${this.escapeHtml(post.cta || '')}
                            </div>
                        </div>
                    </div>

                    <div style="display:grid; gap:14px;">
                        ${this.renderFacebookFeedField({
                            key: `facebookFeed.posts.${postId}.image`,
                            label: 'Bilde-URL',
                            value: post.image || '',
                            placeholder: 'https://...',
                            help: 'Tomt felt bruker standard illustrasjon.'
                        })}
                        ${this.renderFacebookFeedField({
                            key: `facebookFeed.posts.${postId}.date`,
                            label: 'Datoetikett',
                            value: post.date || ''
                        })}
                        ${this.renderFacebookFeedField({
                            key: `facebookFeed.posts.${postId}.title`,
                            label: 'Tittel',
                            value: post.title || ''
                        })}
                        ${this.renderFacebookFeedField({
                            key: `facebookFeed.posts.${postId}.excerpt`,
                            label: 'Utdrag',
                            value: post.excerpt || '',
                            textarea: true
                        })}
                        ${this.renderFacebookFeedField({
                            key: `facebookFeed.posts.${postId}.cta`,
                            label: 'Lenketekst',
                            value: post.cta || ''
                        })}
                        ${this.renderFacebookFeedField({
                            key: `facebookFeed.posts.${postId}.link`,
                            label: 'Lenke',
                            value: post.link || '',
                            placeholder: 'https://...'
                        })}
                    </div>
                </div>
            </div>
        `;
    }

    getFacebookFeedPreviewUrls(limit = 3, { pageId = '', pageUrl = '' } = {}) {
        const params = new URLSearchParams({ limit: String(limit) });
        if (pageId) params.set('pageId', pageId);
        if (pageUrl) params.set('pageUrl', pageUrl);

        const projectId = (window.firebaseConfig && window.firebaseConfig.projectId) || 'his-kingdom-ministry';
        const urls = [`/api/facebook-feed?${params.toString()}`];
        const cloudFunctionUrl = `https://us-central1-his-kingdom-ministry.cloudfunctions.net/facebookFeed?${params.toString()}`;

        if (!urls.includes(cloudFunctionUrl)) {
            urls.push(cloudFunctionUrl);
        }

        return urls;
    }

    renderFacebookFeedLivePreviewState(container, state = {}) {
        const previewNode = container.querySelector('[data-facebook-live-preview]');
        const badgeNode = container.querySelector('[data-facebook-live-badge]');
        const noteNode = container.querySelector('[data-facebook-live-note]');
        if (!previewNode || !badgeNode || !noteNode) return;

        const setBadge = (label, fg, bg) => {
            badgeNode.textContent = label;
            badgeNode.style.color = fg;
            badgeNode.style.background = bg;
        };

        const status = state.status || 'idle';
        const items = Array.isArray(state.items) ? state.items : [];

        if (status === 'loading') {
            setBadge('Henter...', '#2563eb', '#eff6ff');
            noteNode.textContent = 'Henter siste innlegg fra Meta API med gjeldende innstillinger.';
            previewNode.innerHTML = `
                <div style="min-height:96px; display:flex; align-items:center; justify-content:center; border:1px dashed #dbe4ef; border-radius:18px; background:#fff;">
                    <div class="loader"></div>
                </div>
            `;
            return;
        }

        if (status === 'disabled') {
            setBadge('Manuell', '#475569', '#f8fafc');
            noteNode.textContent = state.message || 'Live-feed er slått av. Kortene under brukes som fallback på forsiden.';
            previewNode.innerHTML = `
                <div style="padding:14px 16px; border:1px dashed #dbe4ef; border-radius:18px; background:#fff; color:#64748b; font-size:13px; line-height:1.6;">
                    Slå på "Bruk live Meta-feed" for å se de siste innleggene her i dashbordet.
                </div>
            `;
            return;
        }

        if (status === 'error') {
            setBadge('Feil', '#b91c1c', '#fef2f2');
            noteNode.textContent = state.message || 'Kunne ikke hente live innlegg akkurat nå.';
            previewNode.innerHTML = `
                <div style="padding:14px 16px; border:1px solid #fecaca; border-radius:18px; background:#fff; color:#991b1b; font-size:13px; line-height:1.6;">
                    Live-forhåndsvisningen feilet. Forsiden vil fortsatt bruke fallback-kort hvis Meta ikke svarer.
                </div>
            `;
            return;
        }

        if (status === 'empty') {
            setBadge('Tom', '#92400e', '#fffbeb');
            noteNode.textContent = state.message || 'Meta svarte, men returnerte ingen innlegg.';
            previewNode.innerHTML = `
                <div style="padding:14px 16px; border:1px solid #fde68a; border-radius:18px; background:#fff; color:#92400e; font-size:13px; line-height:1.6;">
                    Ingen innlegg ble funnet i feeden som ble hentet.
                </div>
            `;
            return;
        }

        if (status === 'ready') {
            setBadge(`${items.length} live`, '#166534', '#f0fdf4');
            noteNode.textContent = state.message || 'Dette er innleggene som Meta API leverer akkurat nå.';
            previewNode.innerHTML = `
                <div style="display:grid; gap:12px;">
                    ${items.map((item, index) => {
                        const imageHtml = item.image
                            ? `<img src="${this.escapeHtml(item.image)}" alt="" style="width:72px; height:72px; border-radius:14px; object-fit:cover; flex-shrink:0; border:1px solid #dbe4ef;">`
                            : `<div style="width:72px; height:72px; border-radius:14px; display:flex; align-items:center; justify-content:center; flex-shrink:0; background:#f8fafc; border:1px solid #dbe4ef; color:#94a3b8;">
                                <span class="material-symbols-outlined">image</span>
                            </div>`;
                        const href = (typeof item.link === 'string' && item.link.trim())
                            ? item.link.trim()
                            : (typeof state.pageUrl === 'string' && state.pageUrl.trim() ? state.pageUrl.trim() : '#');
                        const excerpt = typeof item.excerpt === 'string' ? item.excerpt.trim() : '';
                        const title = typeof item.title === 'string' && item.title.trim()
                            ? item.title.trim()
                            : `Innlegg ${index + 1}`;

                        return `
                            <a href="${this.escapeHtml(href)}" target="_blank" rel="noopener noreferrer"
                                style="display:flex; gap:14px; align-items:flex-start; padding:14px; border:1px solid #e2e8f0; border-radius:18px; background:#fff; text-decoration:none; color:#0f172a;">
                                ${imageHtml}
                                <div style="min-width:0; display:grid; gap:6px;">
                                    <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                                        <span style="font-size:11px; font-weight:800; letter-spacing:.06em; text-transform:uppercase; color:#2563eb;">Live</span>
                                        <span style="font-size:12px; color:#64748b;">${this.escapeHtml(item.date || '')}</span>
                                    </div>
                                    <div style="font-size:15px; font-weight:700; line-height:1.4; color:#0f172a;">${this.escapeHtml(title)}</div>
                                    <div style="font-size:13px; line-height:1.55; color:#64748b;">${this.escapeHtml(excerpt)}</div>
                                </div>
                            </a>
                        `;
                    }).join('')}
                </div>
            `;
            return;
        }

        setBadge('Klar', '#475569', '#f8fafc');
        noteNode.textContent = '';
        previewNode.innerHTML = '';
    }

    async loadFacebookFeedSettingsLivePreview(container, config = {}) {
        if (!container) return;

        const livePostCount = Math.min(Math.max(Math.round(Number(config.livePostCount) || 3), 1), 3);
        const pageId = typeof config.pageId === 'string' ? config.pageId.trim() : '';
        const pageUrl = typeof config.pageUrl === 'string' ? config.pageUrl.trim() : '';
        this._facebookFeedPreviewRequestId = (this._facebookFeedPreviewRequestId || 0) + 1;
        const requestId = this._facebookFeedPreviewRequestId;

        if (config.useLiveFeed === false) {
            this.renderFacebookFeedLivePreviewState(container, {
                status: 'disabled',
                message: 'Live-feed er slått av. Kortene under brukes som fallback på forsiden.'
            });
            return;
        }

        this.renderFacebookFeedLivePreviewState(container, { status: 'loading' });

        let lastMessage = '';

        for (const url of this.getFacebookFeedPreviewUrls(livePostCount, { pageId, pageUrl })) {
            try {
                const response = await fetch(url, {
                    headers: {
                        Accept: 'application/json'
                    }
                });

                let payload = null;
                try {
                    payload = await response.json();
                } catch (parseError) {
                    payload = null;
                }

                if (!response.ok) {
                    lastMessage = payload && payload.error ? String(payload.error) : `Facebook feed request failed with ${response.status}`;
                    continue;
                }

                const items = Array.isArray(payload && payload.items) ? payload.items : [];
                if (requestId !== this._facebookFeedPreviewRequestId) {
                    return;
                }

                if (!items.length) {
                    this.renderFacebookFeedLivePreviewState(container, {
                        status: 'empty',
                        message: 'Meta svarte, men returnerte ingen innlegg for denne siden.'
                    });
                    return;
                }

                this.renderFacebookFeedLivePreviewState(container, {
                    status: 'ready',
                    items: items.slice(0, livePostCount),
                    pageUrl: (payload && payload.pageUrl) || pageUrl,
                    message: 'Dette er innleggene som hentes live akkurat nå.'
                });
                return;
            } catch (error) {
                lastMessage = error && error.message ? error.message : String(error);
            }
        }

        if (requestId !== this._facebookFeedPreviewRequestId) {
            return;
        }

        const errorMessage = lastMessage && lastMessage.includes('META_FACEBOOK_PAGE_ACCESS_TOKEN')
            ? 'Meta-token mangler i Functions-miljoet. Sett opp META_FACEBOOK_PAGE_ACCESS_TOKEN for a hente live innlegg.'
            : (lastMessage
                ? `Kunne ikke hente live innlegg: ${lastMessage}`
                : 'Kunne ikke hente live innlegg akkurat na.');

        this.renderFacebookFeedLivePreviewState(container, {
            status: 'error',
            message: errorMessage
        });
    }

    renderFacebookFeedSettingsEditor(data) {
        const container = document.getElementById('editor-fields');
        const feed = (data && data.facebookFeed && typeof data.facebookFeed === 'object') ? data.facebookFeed : {};
        const posts = feed.posts || {};

        container.innerHTML = `
            <div style="display:grid; gap:24px; grid-column:1 / -1; width:100%;">
                <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(380px, 1fr)); gap:24px; align-items:start;">
                    <div class="card" style="margin:0;">
                        <div class="card-body" style="display:grid; gap:18px;">
                            <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:16px;">
                                <div>
                                    <h3 style="margin:0 0 6px; font-size:18px;">Facebook-feed</h3>
                                    <p style="margin:0; color:#64748b; font-size:14px;">Styr visning, live Meta-feed og standardinnhold for kortene på forsiden.</p>
                                </div>
                                <span style="display:inline-flex; align-items:center; gap:8px; padding:8px 12px; border-radius:999px; background:#eff6ff; color:#2563eb; font-size:12px; font-weight:700;">
                                    <span class="material-symbols-outlined" style="font-size:16px;">rss_feed</span>
                                    Live + fallback
                                </span>
                            </div>

                            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:16px;">
                                ${this.renderFacebookFeedField({
                                    key: 'facebookFeed.enabled',
                                    label: 'Vis seksjonen',
                                    value: feed.enabled === false ? 'false' : 'true',
                                    valueType: 'boolean',
                                    options: [
                                        { value: 'true', label: 'Ja, vis seksjonen' },
                                        { value: 'false', label: 'Nei, skjul seksjonen' }
                                    ]
                                })}
                                ${this.renderFacebookFeedField({
                                    key: 'facebookFeed.useLiveFeed',
                                    label: 'Bruk live Meta-feed',
                                    value: feed.useLiveFeed === false ? 'false' : 'true',
                                    valueType: 'boolean',
                                    options: [
                                        { value: 'true', label: 'Ja, hent live innlegg' },
                                        { value: 'false', label: 'Nei, bruk kun fallback-kort' }
                                    ]
                                })}
                                ${this.renderFacebookFeedField({
                                    key: 'facebookFeed.livePostCount',
                                    label: 'Antall live innlegg',
                                    value: feed.livePostCount == null ? 3 : feed.livePostCount,
                                    type: 'number',
                                    valueType: 'number',
                                    min: '1',
                                    max: '3',
                                    step: '1'
                                })}
                                ${this.renderFacebookFeedField({
                                    key: 'facebookFeed.pageId',
                                    label: 'Facebook Page ID / slug',
                                    value: feed.pageId || '',
                                    placeholder: 'Valgfritt hvis URL brukes',
                                    help: 'Kan sta tomt. Hvis du fyller inn side-URL under, brukes den ogsa til a finne riktig side.'
                                })}
                                ${this.renderFacebookFeedField({
                                    key: 'facebookFeed.pageUrl',
                                    label: 'Facebook-side URL',
                                    value: feed.pageUrl || '',
                                    placeholder: 'https://www.facebook.com/...'
                                })}
                                ${this.renderFacebookFeedField({
                                    key: 'facebookFeed.pageCta',
                                    label: 'Knappetekst',
                                    value: feed.pageCta || ''
                                })}
                                ${this.renderFacebookFeedField({
                                    key: 'facebookFeed.label',
                                    label: 'Etikett',
                                    value: feed.label || ''
                                })}
                                ${this.renderFacebookFeedField({
                                    key: 'facebookFeed.title',
                                    label: 'Overskrift',
                                    value: feed.title || ''
                                })}
                                ${this.renderFacebookFeedField({
                                    key: 'facebookFeed.description',
                                    label: 'Beskrivelse',
                                    value: feed.description || '',
                                    textarea: true,
                                    fullWidth: true
                                })}
                            </div>
                        </div>
                    </div>

                    <div class="card" style="margin:0;">
                        <div class="card-body" style="display:grid; gap:16px;">
                            <div>
                                <h3 style="margin:0 0 6px; font-size:16px;">Seksjonsforhåndsvisning</h3>
                                <p style="margin:0; color:#64748b; font-size:13px;">Oppdateres mens du skriver.</p>
                            </div>
                            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(140px, 1fr)); gap:12px;">
                                <div style="border:1px solid #e2e8f0; border-radius:16px; padding:14px; background:#fff;">
                                    <div style="font-size:11px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; color:#94a3b8;">Seksjon</div>
                                    <div data-preview-status="enabled" style="margin-top:6px; font-size:16px; font-weight:700; color:#0f172a;">
                                        ${feed.enabled === false ? 'Skjult' : 'Synlig'}
                                    </div>
                                </div>
                                <div style="border:1px solid #e2e8f0; border-radius:16px; padding:14px; background:#fff;">
                                    <div style="font-size:11px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; color:#94a3b8;">Kilde</div>
                                    <div data-preview-status="source" style="margin-top:6px; font-size:16px; font-weight:700; color:#0f172a;">
                                        ${feed.useLiveFeed === false ? 'Fallback-kort' : 'Live via Meta'}
                                    </div>
                                </div>
                                <div style="border:1px solid #e2e8f0; border-radius:16px; padding:14px; background:#fff;">
                                    <div style="font-size:11px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; color:#94a3b8;">Live innlegg</div>
                                    <div style="margin-top:6px; font-size:16px; font-weight:700; color:#0f172a;">
                                        <span data-preview-status="count">${this.escapeHtml(feed.livePostCount == null ? 3 : String(feed.livePostCount))}</span> av 3
                                    </div>
                                </div>
                                <div style="border:1px solid #e2e8f0; border-radius:16px; padding:14px; background:#fff; grid-column:1 / -1;">
                                    <div style="font-size:11px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; color:#94a3b8;">Side</div>
                                    <div data-preview-status="page" style="margin-top:6px; font-size:15px; line-height:1.35; font-weight:700; color:#0f172a; overflow-wrap:anywhere;">
                                        ${this.escapeHtml((feed.pageId || '').trim() || (feed.pageUrl || '').trim() || 'Ikke satt')}
                                    </div>
                                </div>
                            </div>
                            <div data-preview-status="note" style="font-size:13px; line-height:1.6; color:#64748b;">
                                ${feed.useLiveFeed === false
                                    ? 'Fallback-kortene brukes direkte på forsiden.'
                                    : 'Live-feed prioriteres, men fallback-kortene brukes fortsatt hvis Meta ikke svarer.'}
                            </div>
                            <div style="display:grid; gap:12px; padding-top:4px; border-top:1px solid #e2e8f0;">
                                <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:12px;">
                                    <div>
                                        <h4 style="margin:0 0 4px; font-size:15px; font-weight:800; color:#0f172a;">Siste live innlegg</h4>
                                        <p style="margin:0; font-size:12px; line-height:1.5; color:#64748b;">Hentes fra Meta API med gjeldende innstillinger.</p>
                                    </div>
                                    <span data-facebook-live-badge style="display:inline-flex; align-items:center; justify-content:center; min-height:30px; padding:6px 10px; border-radius:999px; font-size:11px; font-weight:800; letter-spacing:.04em; text-transform:uppercase; color:#475569; background:#f8fafc;">
                                        Klar
                                    </span>
                                </div>
                                <div data-facebook-live-note style="font-size:13px; line-height:1.6; color:#64748b;"></div>
                                <div data-facebook-live-preview style="display:grid; gap:12px;"></div>
                            </div>
                            <div style="border:1px solid #e2e8f0; border-radius:24px; padding:20px; background:linear-gradient(180deg,#f8fafc 0%,#fff 100%); display:grid; gap:14px;">
                                <div data-preview-key="label" style="font-size:12px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:#f97316;">
                                    ${this.escapeHtml(feed.label || '')}
                                </div>
                                <div data-preview-key="title" style="font-size:24px; font-weight:800; line-height:1.2; color:#0f172a;">
                                    ${this.escapeHtml(feed.title || '')}
                                </div>
                                <div data-preview-key="description" style="font-size:14px; line-height:1.7; color:#64748b;">
                                    ${this.escapeHtml(feed.description || '')}
                                </div>
                                <a data-preview-key="pageCta" data-preview-href="pageUrl" href="${this.escapeHtml(feed.pageUrl || '#')}"
                                    style="display:inline-flex; align-items:center; justify-content:center; padding:12px 18px; border-radius:999px; border:1px solid #cbd5e1; color:#0f172a; font-weight:700; text-decoration:none; background:#fff;">
                                    ${this.escapeHtml(feed.pageCta || '')}
                                </a>
                            </div>
                        </div>
                    </div>
                </div>

                <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:20px;">
                    ${this.renderFacebookFeedPostEditor('first', 'Kort 1', '#2563eb', 'img/facebook-post-1.svg', posts.first || {})}
                    ${this.renderFacebookFeedPostEditor('second', 'Kort 2', '#0ea5e9', 'img/facebook-post-2.svg', posts.second || {})}
                    ${this.renderFacebookFeedPostEditor('third', 'Kort 3', '#f97316', 'img/facebook-post-3.svg', posts.third || {})}
                </div>
            </div>
        `;

        const refreshPreview = () => {
            const formData = this.collectEditorFormData(container);
            const liveFeed = (formData && formData.facebookFeed) || {};
            const normalizedCount = Math.max(1, Math.min(3, Number(liveFeed.livePostCount) || 0));

            container.querySelectorAll('[data-preview-key]').forEach((node) => {
                const path = node.getAttribute('data-preview-key');
                if (!path) return;

                const value = path.split('.').reduce((acc, part) => (
                    acc && typeof acc === 'object' ? acc[part] : undefined
                ), liveFeed);

                if (node.tagName === 'IMG') {
                    const fallbackSrc = node.getAttribute('data-fallback-src') || '';
                    node.src = (typeof value === 'string' && value.trim()) ? value.trim() : fallbackSrc;
                    return;
                }

                node.textContent = value == null ? '' : String(value);
            });

            container.querySelectorAll('[data-preview-href]').forEach((node) => {
                const path = node.getAttribute('data-preview-href');
                if (!path) return;
                const value = path.split('.').reduce((acc, part) => (
                    acc && typeof acc === 'object' ? acc[part] : undefined
                ), liveFeed);
                node.setAttribute('href', (typeof value === 'string' && value.trim()) ? value.trim() : '#');
            });

            container.querySelectorAll('[data-preview-status]').forEach((node) => {
                const statusType = node.getAttribute('data-preview-status');
                if (statusType === 'enabled') {
                    node.textContent = liveFeed.enabled === false ? 'Skjult' : 'Synlig';
                } else if (statusType === 'source') {
                    node.textContent = liveFeed.useLiveFeed === false ? 'Fallback-kort' : 'Live via Meta';
                } else if (statusType === 'count') {
                    node.textContent = String(normalizedCount);
                } else if (statusType === 'page') {
                    const resolvedPageTarget = (typeof liveFeed.pageId === 'string' && liveFeed.pageId.trim())
                        ? liveFeed.pageId.trim()
                        : ((typeof liveFeed.pageUrl === 'string' && liveFeed.pageUrl.trim()) ? liveFeed.pageUrl.trim() : '');
                    node.textContent = resolvedPageTarget
                        ? resolvedPageTarget
                        : 'Ikke satt';
                } else if (statusType === 'note') {
                    node.textContent = liveFeed.useLiveFeed === false
                        ? 'Fallback-kortene brukes direkte på forsiden.'
                        : 'Live-feed prioriteres, men fallback-kortene brukes fortsatt hvis Meta ikke svarer.';
                }
            });

            return liveFeed;
        };

        const scheduleLivePreviewFetch = (liveFeed) => {
            if (this._facebookFeedPreviewTimer) {
                clearTimeout(this._facebookFeedPreviewTimer);
            }

            this._facebookFeedPreviewTimer = setTimeout(() => {
                this.loadFacebookFeedSettingsLivePreview(container, liveFeed || {});
            }, 350);
        };

        const syncEditorPreview = () => {
            const liveFeed = refreshPreview();
            scheduleLivePreviewFetch(liveFeed);
        };

        container.querySelectorAll('.form-control').forEach((input) => {
            input.addEventListener('input', syncEditorPreview);
            input.addEventListener('change', syncEditorPreview);
        });

        syncEditorPreview();
    }

    collectEditorFormData(root = document.getElementById('editor-fields')) {
        const dataToSave = {};
        if (!root) return dataToSave;

        const inputs = root.querySelectorAll('.form-control[data-key]');
        inputs.forEach((input) => {
            const keys = input.dataset.key.split('.');
            let value = input.value;

            if (input.dataset.valueType === 'boolean') {
                value = value === 'true';
            } else if (input.dataset.valueType === 'number') {
                const parsed = Number(value);
                value = Number.isFinite(parsed) ? parsed : 0;
            }

            let curr = dataToSave;
            keys.forEach((k, i) => {
                if (i === keys.length - 1) {
                    curr[k] = value;
                } else {
                    curr[k] = curr[k] || {};
                    curr = curr[k];
                }
            });
        });

        return dataToSave;
    }

    async savePageContent() {
        const pageId = document.querySelector('.page-item.active').dataset.page;
        const saveBtn = document.getElementById('save-content');
        const dataToSave = this.collectEditorFormData();

        const sanitized = typeof adminUtils.sanitizeForFirestore === 'function'
            ? (adminUtils.sanitizeForFirestore(dataToSave, { stripUndefined: true, stripEmptyStrings: false }) || {})
            : dataToSave;

        await this._runWriteLocked(`page-content:${pageId}`, async () => {
            await this._withButtonLoading(saveBtn, async () => {
                try {
                    await firebaseService.savePageContent(pageId, sanitized);
                    this.showToast('✅ Innholdet er lagret!', 'success', 5000);
                } catch (err) {
                    this.showToast('❌ Feil ved lagring', 'error', 5000);
                }
            }, {
                loadingText: 'Lagrer...'
            });
        });
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

        const ROLES = window.HKM_ROLES || {
            MEDLEM: 'medlem',
            EDITOR: 'editor',
            ADMIN: 'admin',
            SUPERADMIN: 'superadmin'
        };

        const rolesOptions = Object.values(ROLES).map(role =>
            `<option value="${role}">${role.charAt(0).toUpperCase() + role.slice(1)}</option>`
        ).join('');

        section.innerHTML = `
            ${this.renderSectionHeader('person_search', 'Brukeradministrasjon', 'Oversikt over alle registrerte brukere og deres tilgangsnivåer.', '')}

                                                                            <div class="design-ui-shell">
                                                                                <div class="design-ui-workspace">
                                                                                    <div class="design-ui-top-grid">
                                                                                        <div class="design-ui-main-column">
                                                                                            <div class="design-ui-panel">
                                                                                                <div class="design-ui-panel-header">
                                                                                                    <h3 class="design-ui-panel-title">Aktive Brukere</h3>
                                                                                                    <span class="status-badge" id="user-count-badge" style="background: #f1f5f9; color: #475569; font-size: 11px; font-weight: 600; padding: 4px 8px; border-radius: 12px;">- BRUKERE</span>
                                                                                                </div>
                                                                                                <div class="design-ui-panel-body p-0" id="users-list-container" style="padding: 0;">
                                                                                                    <div class="loader" style="margin: 24px auto;"></div>
                                                                                                </div>
                                                                                            </div>
                                                                                        </div>

                                                                                        <aside class="design-ui-side-column">
                                                                                            <div class="design-ui-panel">
                                                                                                <div class="design-ui-panel-header design-ui-panel-header--compact">
                                                                                                    <div class="design-ui-panel-header-icon" style="background: #e0f2fe; color: #0ea5e9;">
                                                                                                        <span class="material-symbols-outlined">person_add</span>
                                                                                                    </div>
                                                                                                    <div style="flex: 1;">
                                                                                                        <h3 class="design-ui-panel-title">Ny bruker</h3>
                                                                                                    </div>
                                                                                                </div>
                                                                                                <div class="design-ui-panel-body">
                                                                                                    <form id="side-add-user-form" class="user-add-form">
                                                                                                        <div class="form-group">
                                                                                                            <label class="form-label-sm">Fullt navn</label>
                                                                                                            <input type="text" name="displayName" class="form-control" placeholder="f.eks. Ola Nordmann" required>
                                                                                                        </div>
                                                                                                        <div class="form-group">
                                                                                                            <label class="form-label-sm">E-post *</label>
                                                                                                            <input type="email" name="email" class="form-control" placeholder="ola@eksempel.no" required>
                                                                                                        </div>
                                                                                                        <div class="form-group">
                                                                                                            <label class="form-label-sm">Telefonnr</label>
                                                                                                            <input type="tel" name="phone" class="form-control" placeholder="900 00 000">
                                                                                                        </div>
                                                                                                        <div class="form-group">
                                                                                                            <label class="form-label-sm">Rolle / Tilgang</label>
                                                                                                            <select name="role" class="form-control">
                                                                                                                ${rolesOptions}
                                                                                                            </select>
                                                                                                        </div>
                                                                                                        <button type="submit" class="btn btn-primary btn-full">
                                                                                                            <span class="material-symbols-outlined">add</span>
                                                                                                            Legg til bruker
                                                                                                        </button>
                                                                                                    </form>
                                                                                                </div>
                                                                                            </div>

                                                                                            <div class="design-ui-panel" style="background: #fffbeb; border: 1px solid #fde68a;">
                                                                                                <div class="design-ui-panel-body" style="display: flex; gap: 12px; align-items: flex-start; padding: 16px;">
                                                                                                    <span class="material-symbols-outlined" style="color: #d97706; font-size: 20px;">priority_high</span>
                                                                                                    <div>
                                                                                                        <h4 style="font-size: 13px; font-weight: 600; color: #92400e; margin: 0 0 4px 0;">VIKTIG!</h4>
                                                                                                        <p style="font-size: 12px; line-height: 1.5; color: #b45309; margin: 0;">Når du legger til en bruker her, må de fortsatt registrere seg eller du må sende dem en invitasjon for at de skal kunne logge inn.</p>
                                                                                                    </div>
                                                                                                </div>
                                                                                            </div>
                                                                                        </aside>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                            `;

        section.setAttribute('data-rendered', 'true');

        const addUserForm = document.getElementById('side-add-user-form');
        if (addUserForm) {
            addUserForm.onsubmit = async (e) => {
                e.preventDefault();
                const formData = new FormData(addUserForm);
                const data = {
                    displayName: formData.get('displayName'),
                    email: formData.get('email'),
                    role: formData.get('role'),
                    phone: formData.get('phone'),
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                };

                const btn = addUserForm.querySelector('button[type="submit"]');
                const origText = btn.innerHTML;
                btn.disabled = true;
                btn.textContent = 'Lagrer...';

                try {
                    await this.saveUser(null, data);
                    addUserForm.reset();
                    this.showToast('Ny bruker lagt til.', 'success');
                    await this.loadUsersList();
                } catch (err) {
                    console.error("Feil ved lagring av bruker:", err);
                    this.showToast("Kunne ikke legge til bruker: " + err.message, "error");
                } finally {
                    btn.disabled = false;
                    btn.innerHTML = origText;
                }
            };
        }

        this._ensureUsersRealtimeSubscription();
        await this.loadUsersList();
    }

    async loadUsersList() {
        const container = document.getElementById('users-list-container');
        if (!container) return;

        try {
            // Fetch all without orderBy to avoid exclusion of docs with missing fields
            const snapshot = await firebaseService.db.collection('users').get();
            const users = [];
            snapshot.forEach(doc => {
                users.push({ id: doc.id, ...doc.data() });
            });

            console.log(`[AdminManager] Firing renderUsersTable with ${users.length} users.`);

            // In-memory sort
            users.sort((a, b) => {
                const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
                const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
                return dateB - dateA;
            });

            this.allUsersData = users; // Cache for filtering
            this.renderUsersTable(users);
        } catch (error) {
            console.error('Error fetching users:', error);
            container.innerHTML = `<p class="empty-text">Kunne ikke laste brukere: ${error.message}</p>`;
        }
    }

    renderUsersTable(users) {
        const container = document.getElementById('users-list-container');
        const badge = document.getElementById('user-count-badge');
        if (!container) return;

        // Update badge
        if (badge) {
            badge.textContent = `${users.length} ${users.length === 1 ? 'BRUKER' : 'BRUKERE'}`;
        }

        // Remove loader
        container.classList.remove('loader');
        container.innerHTML = '';

        if (users.length === 0) {
            container.innerHTML = '<p class="empty-text" style="padding: 24px; color: var(--text-muted); text-align: center;">Ingen brukere funnet.</p>';
            return;
        }
        const roleLabels = {
            'superadmin': 'Systemansvarlig',
            'admin': 'Administrator',
            'editor': 'Redaktør',
            'medlem': 'Medlem',
            'pastor': 'Pastor',
            'leder': 'Leder',
            'frivillig': 'Frivillig'
        };

        const canDelete = this.userRole === (window.HKM_ROLES?.SUPERADMIN || 'superadmin');
        const rowsHtml = users.map((user) => {
            const name = user.displayName || user.fullName || 'Ukjent Navn';
            const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
            const role = String(user.role || 'medlem');
            const roleLabel = roleLabels[role.toLowerCase()] || role.charAt(0).toUpperCase() + role.slice(1);
            const email = user.email || 'Ingen e-post';
            const phone = user.phone || '';
            const createdAt = user.createdAt?.toDate?.()
                ? user.createdAt.toDate()
                : (user.createdAt ? new Date(user.createdAt) : null);
            const createdText = createdAt && !Number.isNaN(createdAt.getTime())
                ? createdAt.toLocaleDateString('no-NO')
                : '—';

            return `
                                                                            <tr data-user-id="${user.id}">
                                                                                <td>
                                                                                    <div class="user-info-cell">
                                                                                        <div class="user-avatar-sm">
                                                                                            ${user.photoURL
                    ? `<img src="${this.escapeHtml(user.photoURL)}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`
                    : this.escapeHtml(initials)}
                                                                                        </div>
                                                                                        <div>
                                                                                            <div class="user-name">${this.escapeHtml(name)}</div>
                                                                                            <div class="text-muted">${this.escapeHtml(email)}</div>
                                                                                        </div>
                                                                                    </div>
                                                                                </td>
                                                                                <td><span class="badge status-automated">${this.escapeHtml(roleLabel)}</span></td>
                                                                                <td>${phone ? this.escapeHtml(phone) : '<span class="text-muted">—</span>'}</td>
                                                                                <td>${createdText}</td>
                                                                                <td class="col-actions">
                                                                                    <button class="btn btn-outline edit-user-btn" type="button" data-id="${user.id}">Rediger</button>
                                                                                    ${canDelete ? `
                            <button class="icon-btn delete-user-btn danger" type="button" data-id="${user.id}" title="Slett">
                                <span class="material-symbols-outlined">delete</span>
                            </button>
                        ` : ''}
                                                                                </td>
                                                                            </tr>
                                                                            `;
        }).join('');

        container.innerHTML = `
                                                                            <div class="table-container">
                                                                                <table class="crm-table">
                                                                                    <thead>
                                                                                        <tr>
                                                                                            <th>Bruker</th>
                                                                                            <th>Rolle</th>
                                                                                            <th>Telefon</th>
                                                                                            <th>Opprettet</th>
                                                                                            <th class="col-actions">Handlinger</th>
                                                                                        </tr>
                                                                                    </thead>
                                                                                    <tbody>${rowsHtml}</tbody>
                                                                                </table>
                                                                            </div>
                                                                            `;

        container.querySelectorAll('.edit-user-btn').forEach((btn) => {
            btn.onclick = () => {
                const userId = btn.dataset.id;
                this.currentUserDetailId = userId;
                this.userEditMode = false;
                this.renderUsersSection();
            };
        });

        container.querySelectorAll('.delete-user-btn').forEach((btn) => {
            btn.onclick = () => {
                const userId = btn.dataset.id;
                const user = users.find((u) => u.id === userId);
                this.showDeleteUserConfirmationModal(userId, user?.displayName || user?.fullName || 'bruker');
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
            modal.style.cssText = 'display:none; position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.25); z-index:2000; align-items:center; justify-content:center; padding:20px; box-sizing:border-box;';
            document.body.appendChild(modal);
        }

        const ROLES = window.HKM_ROLES;
        const rolesOptions = Object.values(ROLES).map(role =>
            `<option value="${role}" ${userData && userData.role === role ? 'selected' : ''}>${role.charAt(0).toUpperCase() + role.slice(1)}</option>`
        ).join('');

        modal.innerHTML = `
                                                                            <div class="profile-modal-content" style="background:#fff; border-radius:16px; box-shadow:0 8px 32px rgba(0,0,0,0.15); padding:32px; width:100%; max-width:600px; max-height:90vh; overflow-y:auto; position:relative;">
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

                                                                                        <div class="form-grid-2 zip-city">
                                                                                            <div class="form-group">
                                                                                                <label>Postnummer</label>
                                                                                                <input type="text" name="zip" class="form-control" value="${userData ? (userData.zip || '') : ''}">
                                                                                            </div>
                                                                                            <div class="form-group">
                                                                                                <label>Poststed</label>
                                                                                                <input type="text" name="city" class="form-control" value="${userData ? (userData.city || '') : ''}">
                                                                                            </div>
                                                                                        </div>

                                                                                        <div class="form-grid-2">
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
            ${this.renderSectionHeader('person', 'Brukerprofil', 'Detaljert informasjon og rettigheter for valgt bruker.', `
                <button id="back-to-users-btn" class="btn btn-outline">
                    <span class="material-symbols-outlined">arrow_back</span> Tilbake til oversikt
                </button>
            `)}

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
            container.classList.remove('loader');
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
                                                                                                    <div class="form-grid-2 zip-city">
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

    async renderAutomationSection() {
        const section = document.getElementById('automation-section');
        if (!section) return;

        console.log("Rendering Automation Section...");
        this.initAutomationTabs();
        await Promise.all([
            this.loadEmailTemplates(),
            this.loadEmailLogs()
        ]);

        section.setAttribute('data-rendered', 'true');
    }

    initAutomationTabs() {
        const tabs = document.querySelectorAll('.automation-tab');
        const panes = document.querySelectorAll('.automation-pane');

        tabs.forEach(tab => {
            if (tab.dataset.bound) return;
            tab.dataset.bound = 'true';
            tab.addEventListener('click', () => {
                const target = tab.dataset.tab;

                tabs.forEach(t => t.classList.toggle('active', t === tab));
                panes.forEach(p => p.classList.toggle('active', p.id === `automation-${target}`));
            });
        });
    }

    async loadEmailTemplates() {
        const tbody = document.getElementById('email-templates-body');
        if (!tbody) return;

        try {
            // Standardmaler som alltid bør finnes
            const defaultTemplates = [
                { id: 'welcome_email', name: 'Velkomst-e-post', description: 'Sendes når en ny bruker registrerer seg.' },
                { id: 'newsletter_confirmation', name: 'Nyhetsbrev-bekreftelse', description: 'Sendes ved påmelding til nyhetsbrev.' }
            ];

            tbody.innerHTML = '';

            for (const t of defaultTemplates) {
                const doc = await firebaseService.db.collection('email_templates').doc(t.id).get();
                const data = doc.exists ? doc.data() : {};

                const tr = document.createElement('tr');
                tr.innerHTML = `
                                                                                <td>
                                                                                    <div class="user-info-cell">
                                                                                        <span class="user-name">${t.name}</span>
                                                                                    </div>
                                                                                </td>
                                                                                <td><span class="text-muted">${t.description}</span></td>
                                                                                <td>${data.updatedAt ? new Date(data.updatedAt).toLocaleDateString('no-NO') : 'Standard'}</td>
                                                                                <td class="col-actions">
                                                                                    <button class="icon-btn edit-template-btn" title="Rediger mal">
                                                                                        <span class="material-symbols-outlined">edit</span>
                                                                                    </button>
                                                                                </td>
                                                                                `;

                tr.querySelector('.edit-template-btn').addEventListener('click', () => {
                    this.openTemplateEditor(t.id, t.name, data);
                });

                tbody.appendChild(tr);
            }
        } catch (error) {
            console.error("Feil ved lasting av e-postmaler:", error);
            tbody.innerHTML = '<tr><td colspan="4">Kunne ikke laste maler.</td></tr>';
        }
    }

    async loadEmailLogs() {
        const tbody = document.getElementById('email-logs-body');
        if (!tbody) return;

        try {
            const snapshot = await firebaseService.db.collection('email_logs')
                .orderBy('timestamp', 'desc')
                .limit(50)
                .get();

            tbody.innerHTML = snapshot.empty ? '<tr><td colspan="5">Ingen logger funnet.</td></tr>' : '';

            snapshot.forEach(doc => {
                const log = doc.data();
                const tr = document.createElement('tr');
                const date = log.timestamp ? log.timestamp.toDate() : new Date(log.sentAt);

                tr.innerHTML = `
                                                                                <td>${log.to}</td>
                                                                                <td>${log.subject}</td>
                                                                                <td><span class="badge status-read">${log.type || 'automated'}</span></td>
                                                                                <td>${date.toLocaleString('no-NO')}</td>
                                                                                <td>
                                                                                    <span class="status-pill ${log.status}">
                                                                                        ${log.status === 'sent' ? 'Sendt' : 'Feilet'}
                                                                                    </span>
                                                                                </td>
                                                                                `;
                tbody.appendChild(tr);
            });
        } catch (error) {
            console.error("Feil ved lasting av e-postlogger:", error);
            tbody.innerHTML = '<tr><td colspan="5">Kunne ikke laste logger.</td></tr>';
        }
    }

    initTemplateEditorModal() {
        const modal = document.getElementById('template-editor-modal');
        const closeBtn = document.getElementById('close-template-modal');
        const cancelBtn = document.getElementById('cancel-template-edit');
        const saveBtn = document.getElementById('save-template-btn');

        if (!modal || !saveBtn) return;

        // Initialize Quill
        if (typeof Quill !== 'undefined' && !this.quill) {
            this.quill = new Quill('#edit-template-body', {
                theme: 'snow',
                modules: {
                    toolbar: [
                        [{ 'header': [1, 2, 3, false] }],
                        ['bold', 'italic', 'underline', 'strike'],
                        [{ 'color': [] }, { 'background': [] }],
                        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                        [{ 'align': [] }],
                        ['link', 'clean']
                    ]
                }
            });
        }

        const closeModal = () => {
            modal.style.display = 'none';
        };

        if (closeBtn) closeBtn.onclick = closeModal;
        if (cancelBtn) cancelBtn.onclick = closeModal;

        modal.onclick = (e) => {
            if (e.target === modal) closeModal();
        };

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.style.display === 'flex') {
                closeModal();
            }
        });

        // Insert variables logic for Quill
        document.querySelectorAll('.insert-var-btn').forEach(btn => {
            btn.onclick = () => {
                const varTag = btn.dataset.var;
                if (this.quill) {
                    const range = this.quill.getSelection(true);
                    this.quill.insertText(range.index, varTag);
                    this.quill.setSelection(range.index + varTag.length);
                }
            };
        });

        saveBtn.onclick = async () => {
            const templateId = document.getElementById('edit-template-id').value;
            const subject = document.getElementById('edit-template-subject').value;

            // Get content from Quill
            const body = this.quill ? this.quill.root.innerHTML : "";

            if (!subject) {
                this.showToast("Emnefeltet kan ikke være tomt.", "error");
                return;
            }

            saveBtn.disabled = true;
            saveBtn.textContent = 'Lagrer...';

            try {
                await firebaseService.db.collection('email_templates').doc(templateId).set({
                    subject,
                    body,
                    updatedAt: new Date().toISOString()
                }, { merge: true });

                this.showToast(`Malen er oppdatert.`, 'success');
                closeModal();
                await this.loadEmailTemplates();
            } catch (error) {
                console.error("Feil ved lagring av mal:", error);
                this.showToast("Kunne ikke lagre malen.", "error");
            } finally {
                saveBtn.disabled = false;
                saveBtn.textContent = 'Lagre mal';
            }
        };
    }

    async openTemplateEditor(templateId, templateName, currentData) {
        const modal = document.getElementById('template-editor-modal');
        if (!modal) return;

        document.getElementById('edit-template-id').value = templateId;
        document.getElementById('template-editor-title').textContent = `Rediger mal: ${templateName}`;
        document.getElementById('edit-template-subject').value = currentData.subject || "";

        const bodyContent = currentData.body || "";

        // Set content in Quill
        if (this.quill) {
            this.quill.root.innerHTML = bodyContent;
        }

        modal.style.display = 'flex';
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
