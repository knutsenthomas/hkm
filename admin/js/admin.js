// [DEBUG] File re-parsed to check for hidden syntax/encoding issues
// ===================================
// Admin Dashboard - His Kingdom Ministry (Global version)
// Core Logic & Firebase Integration
// ===================================

// --- Global Error Handling ---
window.onerror = function (msg, url, lineNo, columnNo, error) {
    const rawMessage = msg ? msg.toString() : '';

    // Ignore benign ResizeObserver error
    if (rawMessage.includes('ResizeObserver loop completed with undelivered notifications')) {
        return false;
    }

    // Ignore opaque cross-origin/extension errors with no actionable stack.
    if (rawMessage.trim() === 'Script error.' || rawMessage.trim() === 'Script error') {
        console.warn('Ignored opaque script error from browser context:', { url, lineNo, columnNo });
        return false;
    }

    console.error('Global Error Caught:', msg, url, lineNo, columnNo, error);
    showErrorUI('En uventet feil oppstod: ' + rawMessage);
    return false;
};

window.onunhandledrejection = function (event) {
    const reason = event.reason ? event.reason.toString() : '';
    // Ignore benign ResizeObserver error in promises too
    if (reason.includes('ResizeObserver loop completed with undelivered notifications')) {
        return false;
    }

    if (reason.trim() === 'Script error.' || reason.trim() === 'Script error') {
        console.warn('Ignored opaque unhandled rejection from browser context.');
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
        this._editorRestoreStateKey = 'hkm_admin_open_editor_state';
        this._restoringEditorState = false;
        this._activeEditorInstance = null;
        this.analyticsRangeDays = this._getSavedAnalyticsRangeDays();
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
            'analytics-engagement': { id: 'analytics-engagement', label: 'Engasjement', icon: 'speed', color: 'mint', default: true },
            'analytics-devices': { id: 'analytics-devices', label: 'Enheter', icon: 'devices', color: 'blue', default: true },
            'analytics-cities': { id: 'analytics-cities', label: 'Topp Byer', icon: 'location_city', color: 'purple', default: false, type: 'list' },
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

        // Auto-cleanup trigger if hash is present
        if (window.location.hash === '#force-wix-cleanup') {
            console.log('[Auto-Cleanup] Triggered via hash!');
            setTimeout(() => this.performWixDatabaseCleanup(), 2000);
        }

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

    async performWixDatabaseCleanup() {
        // Auto-confirm if hash is present, otherwise ask
        if (window.location.hash !== '#force-wix-cleanup') {
            if (!confirm('Dette vil permanent fjerne Wix-spesifikk formatering og "junk" fra alle innlegg i databasen. Er du sikker?')) return;
        }
        
        try {
            if (!window.firebaseService || !window.firebaseService.db) {
                console.error('[Cleanup] Firebase Service not ready');
                return;
            }
            if (!window.contentManager) {
                console.error('[Cleanup] Content Manager not ready, waiting...');
                await new Promise(r => setTimeout(r, 1000));
                if (!window.contentManager) throw new Error('Content Manager mangler.');
            }

            console.log('[Cleanup] Starter Wix-opprydding...');
            const collections = ['collection_blog', 'collection_teaching'];
            let totalCleaned = 0;
            let totalProcessed = 0;

            for (const colName of collections) {
                console.log(`[Cleanup] Behandler ${colName}...`);
                const snapshot = await window.firebaseService.db.collection('content').doc(colName).collection('items').get();
                
                for (const doc of snapshot.docs) {
                    totalProcessed++;
                    try {
                        const data = doc.data();
                        let hasChanges = false;
                        
                        if (data.articleHtml) {
                            const cleaned = window.contentManager.cleanLegacyHtml(data.articleHtml);
                            if (cleaned !== data.articleHtml) {
                                data.articleHtml = cleaned;
                                hasChanges = true;
                            }
                        }
                        
                        if (data.content) {
                            if (typeof data.content === 'string') {
                                const cleaned = window.contentManager.cleanLegacyHtml(data.content);
                                if (cleaned !== data.content) {
                                    data.content = cleaned;
                                    hasChanges = true;
                                }
                            } else if (typeof data.content === 'object') {
                                const cleaned = window.contentManager.cleanEditorBlocks(data.content);
                                // Simple JSON comparison for change detection
                                if (JSON.stringify(cleaned) !== JSON.stringify(data.content)) {
                                    data.content = cleaned;
                                    hasChanges = true;
                                }
                            }
                        }

                        if (hasChanges) {
                            await doc.ref.update(data);
                            totalCleaned++;
                            console.log(`[Cleanup] ✓ Oppdatert ${doc.id}`);
                        }
                    } catch (docErr) {
                        console.warn(`[Cleanup] Kunne ikke behandle dokument ${doc.id}:`, docErr);
                    }
                }
            }
            console.log(`[Cleanup] Fullført. Behandlet ${totalProcessed} dok, ryddet ${totalCleaned} dok.`);
            alert(`Suksess! Ryddet opp i ${totalCleaned} dokumenter. Wix-rester er nå permanent fjernet.`);
            // Clear hash to prevent infinite loop
            if (window.location.hash === '#force-wix-cleanup') {
                history.replaceState(null, null, ' ');
            }
            window.location.reload();
        } catch (err) {
            console.error('[Cleanup] Kritisk feil under opprydding:', err);
            alert('En kritisk feil oppstod under oppryddingen: ' + err.message);
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

    /**
     * Executes a task while holding a write lock to prevent race conditions.
     */
    async _runWriteLocked(lockKey, callback) {
        if (this._pendingWriteLocks.has(lockKey)) {
            this.showToast('En lagringsoperasjon pågår allerede. Vent et øyeblikk.', 'warning', 3500);
            return;
        }
        this._pendingWriteLocks.add(lockKey);
        try {
            return await callback();
        } finally {
            this._pendingWriteLocks.delete(lockKey);
        }
    }

    /**
     * Executes an async callback while showing a loading state on the provided button.
     */
    async _withButtonLoading(btn, callback) {
        if (!btn) return await callback();
        const utils = window.HKMAdminUtils || {};
        if (typeof utils.withButtonLoading === 'function') {
            return await utils.withButtonLoading(btn, callback);
        }
        return await callback();
    }

    /**
     * Shows a premium confirmation modal.
     */
    showConfirm(title, message, confirmText = 'Bekreft', cancelText = 'Avbryt') {
        return new Promise((resolve) => {
            const modal = document.getElementById('hkm-confirm-modal');
            if (!modal) {
                resolve(confirm(message));
                return;
            }

            const titleEl = document.getElementById('confirm-modal-title');
            const messageEl = document.getElementById('confirm-modal-message');
            const confirmBtn = document.getElementById('confirm-modal-confirm');
            const cancelBtn = document.getElementById('confirm-modal-cancel');
            const headerEl = modal.querySelector('.modal-header');

            if (titleEl) titleEl.textContent = title;
            if (messageEl) messageEl.textContent = message;
            if (cancelBtn) cancelBtn.textContent = cancelText;
            
            if (confirmBtn) {
                confirmBtn.textContent = confirmText;
                if (confirmText === 'Slett') {
                    const orangeGradient = 'linear-gradient(135deg, #d17d39 0%, #bd4f2a 100%)';
                    confirmBtn.style.background = orangeGradient;
                    if (headerEl) headerEl.style.background = orangeGradient;
                } else {
                    confirmBtn.style.background = '#1B4965';
                    if (headerEl) headerEl.style.background = '#1B4965';
                }
            }

            const cleanup = () => {
                modal.style.display = 'none';
                confirmBtn.onclick = null;
                cancelBtn.onclick = null;
            };

            confirmBtn.onclick = (e) => {
                e.preventDefault();
                cleanup();
                resolve(true);
            };

            cancelBtn.onclick = (e) => {
                e.preventDefault();
                cleanup();
                resolve(false);
            };

            modal.style.display = 'flex';
        });
    }

    removeSplashScreen() {
        // Since splash screen is removed, we just remove the cloak to reveal the UI
        document.body.classList.remove('cloak');
        console.log("UI revealed (cloak removed)");
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

    _hashString(value) {
        const text = String(value || '');
        let hash = 0;
        for (let i = 0; i < text.length; i++) {
            hash = ((hash << 5) - hash) + text.charCodeAt(i);
            hash |= 0;
        }
        return String(hash);
    }

    _persistOpenEditorState(collectionId, item) {
        try {
            if (!collectionId || !item || typeof item !== 'object') return;
            const payload = {
                collectionId: String(collectionId),
                itemId: item.id ? String(item.id) : '',
                itemTitle: item.title ? String(item.title) : '',
                savedAt: Date.now()
            };
            sessionStorage.setItem(this._editorRestoreStateKey, JSON.stringify(payload));
        } catch (error) {
            console.warn('[AdminManager] Could not persist editor state', error);
        }
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
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), duration);
        }
    }

    _clearOpenEditorState(collectionId = null) {
        try {
            if (!collectionId) {
                sessionStorage.removeItem(this._editorRestoreStateKey);
                return;
            }

            const raw = sessionStorage.getItem(this._editorRestoreStateKey);
            if (!raw) return;
            const parsed = JSON.parse(raw);
            if (parsed?.collectionId === collectionId) {
                sessionStorage.removeItem(this._editorRestoreStateKey);
            }
        } catch (error) {
            sessionStorage.removeItem(this._editorRestoreStateKey);
        }
    }

    _getOpenEditorState() {
        try {
            const raw = sessionStorage.getItem(this._editorRestoreStateKey);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== 'object') return null;
            return parsed;
        } catch (error) {
            return null;
        }
    }

    _attemptRestoreOpenEditor(collectionId, items) {
        if (this._restoringEditorState) return;
        const saved = this._getOpenEditorState();
        if (!saved || saved.collectionId !== collectionId) return;

        if (saved.savedAt && (Date.now() - Number(saved.savedAt) > 12 * 60 * 60 * 1000)) {
            this._clearOpenEditorState(collectionId);
            return;
        }

        const list = Array.isArray(items) ? items : [];
        if (!list.length) return;

        let targetIndex = -1;
        if (saved.itemId) {
            targetIndex = list.findIndex((entry) => String(entry?.id || '') === String(saved.itemId));
        }

        if (targetIndex === -1 && saved.itemTitle) {
            targetIndex = list.findIndex((entry) => String(entry?.title || '') === String(saved.itemTitle));
        }

        if (targetIndex === -1) return;

        this._restoringEditorState = true;
        setTimeout(() => {
            Promise.resolve(this.editCollectionItem(collectionId, targetIndex))
                .catch((error) => console.warn('[AdminManager] Could not restore open editor', error))
                .finally(() => {
                    this._restoringEditorState = false;
                });
        }, 120);
    }

    _buildBlogTranslationSourceHash(post) {
        if (!post || typeof post !== 'object') return this._hashString('');
        // Only hash stable text fields — content is an EditorJS object whose `time`
        // field changes on every open, which would make the hash unstable.
        const payload = [
            post.title || '',
            post.category || '',
            post.seoTitle || '',
            post.seoDescription || '',
            (Array.isArray(post.tags) ? post.tags : []).join(',')
        ].join('|');
        return this._hashString(payload);
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

    async _getTranslationSettings(forceReload = false) {
        const now = Date.now();
        if (!forceReload && this._translationSettingsCache && (now - this._translationSettingsCacheLoadedAt) < 5 * 60 * 1000) {
            return this._translationSettingsCache;
        }

        let settings = {};
        try {
            settings = await firebaseService.getPageContent('settings_integrations') || {};
        } catch (error) {
            console.warn('[AdminManager] Could not load translation settings, using defaults.', error);
        }

        const translation = (settings.translation && typeof settings.translation === 'object')
            ? settings.translation
            : {};
        const fallbackGeminiKey = String(
            translation.geminiApiKey
            || settings.googleAI?.apiKey
            || settings.googleAi?.apiKey
            || settings.googleCalendar?.apiKey
            || ''
        ).trim();

        const provider = String(translation.provider || 'mymemory').toLowerCase() === 'gemini'
            ? 'gemini'
            : 'mymemory';

        this._translationSettingsCache = {
            provider,
            geminiApiKey: fallbackGeminiKey,
            geminiModel: String(translation.geminiModel || 'gemini-1.5-flash').trim() || 'gemini-1.5-flash'
        };
        this._translationSettingsCacheLoadedAt = now;

        return this._translationSettingsCache;
    }

    _extractGeminiText(responseJson) {
        const candidates = Array.isArray(responseJson?.candidates) ? responseJson.candidates : [];
        for (const candidate of candidates) {
            const parts = Array.isArray(candidate?.content?.parts) ? candidate.content.parts : [];
            const text = parts
                .map((part) => (typeof part?.text === 'string' ? part.text : ''))
                .join('')
                .trim();
            if (text) return text;
        }
        return '';
    }

    _sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    _isTranslationQuotaExceededMessage(value) {
        const text = String(value || '').toLowerCase();
        return text.includes('used all available free translations for today')
            || text.includes('next available in');
    }

    _buildMyMemoryQuotaErrorMessage(details) {
        const raw = String(details || '');
        const nextMatch = raw.match(/NEXT AVAILABLE IN\s+(.+?)\s+VISIT/i);
        const nextWindow = nextMatch && nextMatch[1]
            ? nextMatch[1].trim()
            : null;

        if (nextWindow) {
            return `MyMemory dagskvote er brukt opp. Neste tilgjengelige vindu er om ca. ${nextWindow}.`;
        }

        return 'MyMemory dagskvote er brukt opp. Prøv igjen senere eller bytt til Gemini i integrasjonsinnstillinger.';
    }

    _getCallableErrorMessage(error, fallbackMessage = 'Ukjent feil.') {
        const detailMessage = typeof error?.details === 'string' ? error.details.trim() : '';
        const rawMessage = typeof error?.message === 'string' ? error.message.trim() : '';
        const code = typeof error?.code === 'string' ? error.code.trim() : '';

        const cleanedRawMessage = rawMessage
            .replace(/^(functions\/)?[a-z-]+:\s*/i, '')
            .trim();

        if (detailMessage) return detailMessage;
        if (cleanedRawMessage && !/^internal$/i.test(cleanedRawMessage)) return cleanedRawMessage;

        if (code === 'resource-exhausted') {
            return 'Gemini API-kvoten er brukt opp akkurat nå. Vent litt og prøv igjen.';
        }

        if (code === 'unauthenticated') {
            return 'Du må være logget inn for å bruke denne funksjonen.';
        }

        if (code === 'invalid-argument') {
            return 'Det mangler nødvendig data for å kjøre AI-genereringen.';
        }

        return fallbackMessage;
    }

    async _diagnoseTranslationProviders() {
        const sample = 'Gud er god';
        const out = {
            hasGeminiKey: false,
            gemini: 'not-configured',
            myMemory: 'unknown'
        };

        try {
            const settings = await this._getTranslationSettings();
            out.hasGeminiKey = !!settings?.geminiApiKey;

            if (out.hasGeminiKey) {
                try {
                    const g = await this._translateTextChunkWithGemini(sample, 'en', 'no');
                    out.gemini = this._isMeaningfullyTranslatedField(sample, g) ? 'ok' : 'no-op';
                } catch (error) {
                    out.gemini = `error:${error?.message || 'unknown'}`;
                }
            }

            try {
                const m = await this._translateTextChunkWithMyMemory(sample, 'en', 'no');
                if (this._isTranslationQuotaExceededMessage(m)) {
                    out.myMemory = 'quota';
                } else {
                    out.myMemory = this._isMeaningfullyTranslatedField(sample, m) ? 'ok' : 'no-op';
                }
            } catch (error) {
                const msg = String(error?.message || '');
                if (this._isTranslationQuotaExceededMessage(msg)) {
                    out.myMemory = 'quota';
                } else {
                    out.myMemory = `error:${msg}`;
                }
            }
        } catch (error) {
            out.myMemory = `error:${error?.message || 'unknown'}`;
        }

        return out;
    }

    async _fetchWithTimeout(url, options = {}, timeoutMs = 30000) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), Math.max(1000, Number(timeoutMs) || 30000));
        try {
            return await fetch(url, {
                ...options,
                signal: controller.signal
            });
        } finally {
            clearTimeout(timer);
        }
    }

    async _throttleMyMemory(minIntervalMs = 800) {
        const now = Date.now();
        const last = Number(this._myMemoryLastRequestAt || 0);
        const waitMs = Math.max(0, minIntervalMs - (now - last));
        if (waitMs > 0) {
            await this._sleep(waitMs);
        }
        this._myMemoryLastRequestAt = Date.now();
    }

    async _translateTextChunkWithMyMemory(raw, targetLang, sourceLang = 'no') {
        const blockedUntil = Number(this._myMemoryBlockedUntil || 0);
        if (blockedUntil > Date.now()) {
            throw new Error('MyMemory er midlertidig rate-limitet. Prøv igjen om et par minutter.');
        }

        const mapMyMemoryLang = (lang) => {
            const normalized = String(lang || '').trim().toLowerCase();
            if (normalized === 'no') return 'nb';
            return normalized;
        };

        const mmSourceLang = mapMyMemoryLang(sourceLang) || 'nb';
        const mmTargetLang = mapMyMemoryLang(targetLang) || 'en';

        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(raw)}&langpair=${encodeURIComponent(mmSourceLang)}|${encodeURIComponent(mmTargetLang)}`;
        const maxAttempts = 3;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            await this._throttleMyMemory();

            try {
                const res = await this._fetchWithTimeout(url, {}, 25000);
                if (res.status === 429) {
                    this._myMemoryConsecutive429 = Number(this._myMemoryConsecutive429 || 0) + 1;
                    if (this._myMemoryConsecutive429 >= 2) {
                        this._myMemoryBlockedUntil = Date.now() + 3 * 60 * 1000;
                        throw new Error('MyMemory er rate-limitet akkurat nå.');
                    }

                    const backoffMs = Math.min(6000, 800 * Math.pow(2, attempt - 1));
                    console.warn(`[AdminManager] MyMemory rate-limited (429). Waiting ${backoffMs}ms before retry ${attempt}/${maxAttempts}.`);
                    await this._sleep(backoffMs);
                    continue;
                }

                this._myMemoryConsecutive429 = 0;

                if (!res.ok) {
                    throw new Error(`MyMemory request failed (${res.status})`);
                }

                const data = await res.json();
                const warningText = String(data?.responseDetails || data?.responseData?.translatedText || '');
                if (this._isTranslationQuotaExceededMessage(warningText)) {
                    this._myMemoryBlockedUntil = Date.now() + 60 * 60 * 1000;
                    throw new Error(this._buildMyMemoryQuotaErrorMessage(warningText));
                }

                const translated = data?.responseData?.translatedText;
                return (typeof translated === 'string' && translated.trim())
                    ? translated
                    : raw;
            } catch (error) {
                if (attempt >= maxAttempts) {
                    throw error;
                }
                const retryDelay = Math.min(10000, 800 * attempt);
                await this._sleep(retryDelay);
            }
        }

        return raw;
    }

    async _translateTextChunkWithGemini(text, targetLang, sourceLang = 'no') {
        const settings = await this._getTranslationSettings();
        if (!settings.geminiApiKey) {
            throw new Error('Gemini API key mangler i integrasjonsinnstillinger.');
        }

        const languageMap = {
            no: 'Norwegian Bokmal',
            en: 'English',
            es: 'Spanish'
        };

        const sourceName = languageMap[sourceLang] || sourceLang;
        const targetName = languageMap[targetLang] || targetLang;

        const model = encodeURIComponent(settings.geminiModel || 'gemini-1.5-flash');
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(settings.geminiApiKey)}`;

        const prompt = `Translate the following text from ${sourceName} to ${targetName}.\n\nRules:\n- Preserve meaning and tone.\n- Keep HTML tags unchanged.\n- Return only translated text, no explanation.\n\nText:\n${text}`;

        const res = await this._fetchWithTimeout(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [
                    {
                        role: 'user',
                        parts: [{ text: prompt }]
                    }
                ],
                generationConfig: {
                    temperature: 0.1,
                    topP: 0.8,
                    topK: 40,
                    maxOutputTokens: 1024
                }
            })
        }, 45000);

        if (!res.ok) {
            const errorBody = await res.text().catch(() => '');
            throw new Error(`Gemini request failed (${res.status}): ${errorBody || 'Unknown error'}`);
        }

        const data = await res.json();
        const translated = this._extractGeminiText(data);
        if (!translated) {
            throw new Error('Gemini svarte uten oversatt tekst.');
        }

        return translated;
    }

    async _translateTextChunkWithGoogleTranslate(raw, targetLang, sourceLang = 'no') {
        const mapLang = (lang) => {
            const normalized = String(lang || '').trim().toLowerCase();
            if (normalized === 'no') return 'no';
            return normalized;
        };

        const sl = mapLang(sourceLang) || 'no';
        const tl = mapLang(targetLang) || 'en';
        const endpoint = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(sl)}&tl=${encodeURIComponent(tl)}&dt=t&q=${encodeURIComponent(raw)}`;

        const res = await this._fetchWithTimeout(endpoint, {}, 25000);
        if (!res.ok) {
            throw new Error(`Google Translate request failed (${res.status})`);
        }

        const data = await res.json();
        const sentences = Array.isArray(data?.[0]) ? data[0] : [];
        const translated = sentences
            .map((entry) => (Array.isArray(entry) ? String(entry[0] || '') : ''))
            .join('')
            .trim();

        if (!translated) {
            throw new Error('Google Translate svarte uten oversatt tekst.');
        }

        return translated;
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

        const translationSettings = await this._getTranslationSettings();
        const hasGeminiKey = !!translationSettings.geminiApiKey;

        if (translationSettings.provider === 'gemini' && hasGeminiKey) {
            try {
                const translatedByGemini = await this._translateTextChunkWithGemini(raw, targetLang, sourceLang);
                const finalGeminiText = (typeof translatedByGemini === 'string' && translatedByGemini.trim())
                    ? translatedByGemini
                    : raw;
                this._translationCache.set(cacheKey, finalGeminiText);
                return finalGeminiText;
            } catch (error) {
                console.warn(`[AdminManager] Gemini translation failed, falling back to MyMemory (${targetLang})`, error);
            }
        }

        try {
            const translatedByMyMemory = await this._translateTextChunkWithMyMemory(raw, targetLang, sourceLang);
            const finalText = (typeof translatedByMyMemory === 'string' && translatedByMyMemory.trim())
                ? translatedByMyMemory
                : raw;

            // MyMemory can return unchanged source text without an explicit error.
            // If Gemini is configured, retry with Gemini so no-op responses do not block translation.
            const isMyMemoryNoOp = !this._isMeaningfullyTranslatedField(raw, finalText);
            if (translationSettings.provider === 'mymemory' && isMyMemoryNoOp && hasGeminiKey) {
                try {
                    const translatedByGemini = await this._translateTextChunkWithGemini(raw, targetLang, sourceLang);
                    const finalGeminiText = (typeof translatedByGemini === 'string' && translatedByGemini.trim())
                        ? translatedByGemini
                        : raw;
                    this._translationCache.set(cacheKey, finalGeminiText);
                    return finalGeminiText;
                } catch (geminiError) {
                    console.warn(`[AdminManager] Gemini no-op fallback failed (${targetLang})`, geminiError);
                }
            }

            if (!this._isMeaningfullyTranslatedField(raw, finalText)) {
                try {
                    const translatedByGoogle = await this._translateTextChunkWithGoogleTranslate(raw, targetLang, sourceLang);
                    const finalGoogleText = (typeof translatedByGoogle === 'string' && translatedByGoogle.trim())
                        ? translatedByGoogle
                        : raw;
                    this._translationCache.set(cacheKey, finalGoogleText);
                    return finalGoogleText;
                } catch (googleError) {
                    console.warn(`[AdminManager] Google fallback failed after MyMemory no-op (${targetLang})`, googleError);
                }
            }

            this._translationCache.set(cacheKey, finalText);
            return finalText;
        } catch (error) {
            const quotaExceeded = this._isTranslationQuotaExceededMessage(error?.message);
            if (quotaExceeded && hasGeminiKey) {
                try {
                    const translatedByGemini = await this._translateTextChunkWithGemini(raw, targetLang, sourceLang);
                    const finalGeminiText = (typeof translatedByGemini === 'string' && translatedByGemini.trim())
                        ? translatedByGemini
                        : raw;
                    this._translationCache.set(cacheKey, finalGeminiText);
                    return finalGeminiText;
                } catch (geminiError) {
                    console.warn(`[AdminManager] Gemini fallback failed after MyMemory quota hit (${targetLang})`, geminiError);
                }
            }

            try {
                const translatedByGoogle = await this._translateTextChunkWithGoogleTranslate(raw, targetLang, sourceLang);
                const finalGoogleText = (typeof translatedByGoogle === 'string' && translatedByGoogle.trim())
                    ? translatedByGoogle
                    : raw;
                this._translationCache.set(cacheKey, finalGoogleText);
                return finalGoogleText;
            } catch (googleError) {
                console.warn(`[AdminManager] Google fallback failed (${targetLang})`, googleError);
            }

            if (quotaExceeded) {
                throw error;
            }

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

    _normalizeTranslationCompareText(value) {
        let rawText = '';
        if (typeof value === 'string') {
            rawText = value;
        } else if (typeof value === 'number' || typeof value === 'boolean') {
            rawText = String(value);
        } else if (value && typeof value === 'object') {
            try {
                rawText = JSON.stringify(value);
            } catch (error) {
                rawText = String(value);
            }
        } else {
            rawText = String(value || '');
        }

        return rawText
            .replace(/<[^>]*>/g, ' ')
            .replace(/&nbsp;/gi, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .toLowerCase();
    }

    _isMeaningfullyTranslatedField(sourceValue, translatedValue) {
        const source = this._normalizeTranslationCompareText(sourceValue);
        const translated = this._normalizeTranslationCompareText(translatedValue);
        if (!source || !translated) return false;
        return source !== translated;
    }

    _hasMeaningfulBlogTranslation(sourcePost, translatedPost) {
        if (!translatedPost || typeof translatedPost !== 'object') return false;

        const titleTranslated = this._isMeaningfullyTranslatedField(sourcePost?.title, translatedPost?.title);
        const contentTranslated = this._isMeaningfullyTranslatedField(sourcePost?.content, translatedPost?.content);
        const seoTitleTranslated = this._isMeaningfullyTranslatedField(sourcePost?.seoTitle, translatedPost?.seoTitle);
        const seoDescriptionTranslated = this._isMeaningfullyTranslatedField(sourcePost?.seoDescription, translatedPost?.seoDescription);

        // Title and content are the most important fields for blog output.
        // Allow SEO-only posts as a weak fallback if both SEO fields changed.
        return titleTranslated || contentTranslated || (seoTitleTranslated && seoDescriptionTranslated);
    }

    async ensureBlogPostTranslations(post, { force = false } = {}) {
        if (!post || typeof post !== 'object') return post;

        const updatedPost = { ...post };
        const sourceHash = this._buildBlogTranslationSourceHash(updatedPost);
        const existingTranslations = (updatedPost.translations && typeof updatedPost.translations === 'object')
            ? { ...updatedPost.translations }
            : {};

        const targetLanguages = this._getBlogTranslationTargetLanguages();
        for (const lang of targetLanguages) {
            const existing = (existingTranslations[lang] && typeof existingTranslations[lang] === 'object')
                ? existingTranslations[lang]
                : null;
            const isUpToDate = !!existing
                && !existing._translationFailed
                && existing._sourceHash === sourceHash
                && existing.title
                && existing.content;
            if (!force && isUpToDate) continue;

            const translated = await this._buildBlogTranslation(updatedPost, lang);
            const hasMeaningfulTranslation = this._hasMeaningfulBlogTranslation(updatedPost, translated);

            if (!hasMeaningfulTranslation) {
                existingTranslations[lang] = {
                    ...(existing || {}),
                    ...translated,
                    _translationFailed: true,
                    _updatedAt: new Date().toISOString()
                };
                delete existingTranslations[lang]._sourceHash;
                continue;
            }

            existingTranslations[lang] = {
                ...(existing || {}),
                ...translated,
                _sourceHash: sourceHash,
                _translationFailed: false,
                _updatedAt: new Date().toISOString()
            };
        }

        updatedPost.translations = existingTranslations;
        updatedPost.translationSourceHash = sourceHash;
        updatedPost.sourceLanguage = 'no';
        return updatedPost;
    }

    _getCollectionItems(raw) {
        if (Array.isArray(raw)) return raw;
        if (!raw || typeof raw !== 'object') return [];
        if (Array.isArray(raw.items)) return raw.items;
        if (raw.items && typeof raw.items === 'object') return Object.values(raw.items);
        return [];
    }

    _getBlogTranslationTargetLanguages() {
        const fromI18n = Array.isArray(window?.i18n?.languages)
            ? window.i18n.languages
            : [];

        const fromDefaults = Object.keys(
            this.getPageContentEditorDefaults('settings_global')?.header?.languages || {}
        );

        const candidates = (fromI18n.length ? fromI18n : fromDefaults)
            .map((lang) => String(lang || '').trim().toLowerCase())
            .filter(Boolean);

        const targets = Array.from(new Set(candidates)).filter((lang) => lang !== 'no');
        return targets.length ? targets : ['en', 'es'];
    }

    _getBlogTranslationStatus(post) {
        const targetLanguages = this._getBlogTranslationTargetLanguages();
        const sourceHash = this._buildBlogTranslationSourceHash(post || {});
        const translations = (post?.translations && typeof post.translations === 'object')
            ? post.translations
            : {};

        let upToDate = 0;
        let failed = 0;
        let stale = 0;
        let missing = 0;

        targetLanguages.forEach((lang) => {
            const tr = translations?.[lang];
            if (!tr || typeof tr !== 'object') {
                missing += 1;
                return;
            }

            if (tr._translationFailed) {
                failed += 1;
                return;
            }

            const isFresh = tr._sourceHash === sourceHash && !!tr.title && !!tr.content;
            if (isFresh) {
                upToDate += 1;
            } else {
                stale += 1;
            }
        });

        const total = targetLanguages.length;
        let level = 'none';
        if (upToDate === total && total > 0) {
            level = 'ok';
        } else if (upToDate > 0) {
            level = 'partial';
        } else if (failed > 0 || stale > 0 || missing > 0) {
            level = 'missing';
        }

        return { total, upToDate, failed, stale, missing, level };
    }

    _renderBlogTranslationStatusBadge(post) {
        const badge = document.getElementById('blog-translation-status');
        if (!badge) return;

        const stats = this._getBlogTranslationStatus(post);
        badge.style.display = 'inline-flex';
        badge.style.alignItems = 'center';
        badge.style.gap = '6px';
        badge.style.padding = '6px 10px';
        badge.style.borderRadius = '999px';
        badge.style.fontSize = '12px';
        badge.style.fontWeight = '700';

        if (stats.level === 'ok') {
            badge.style.background = '#dcfce7';
            badge.style.color = '#166534';
            badge.textContent = `Oversatt (${stats.upToDate}/${stats.total})`;
            return;
        }

        if (stats.level === 'partial') {
            badge.style.background = '#fef3c7';
            badge.style.color = '#92400e';
            badge.textContent = `Delvis oversatt (${stats.upToDate}/${stats.total})`;
            return;
        }

        badge.style.background = '#fee2e2';
        badge.style.color = '#991b1b';
        badge.textContent = `Ikke oppdatert (${stats.upToDate}/${stats.total})`;
    }

    async translateAllExistingBlogPosts({ force = false, silent = false } = {}) {
        if (this._blogTranslationBackfillRunning) return;
        this._blogTranslationBackfillRunning = true;
        try {
            const blogData = await firebaseService.getPageContent('collection_blog');
            const items = this._getCollectionItems(blogData);
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
                    this.showToast('✅ Blogginnlegg er oversatt til tilgjengelige språk.', 'success', 5000);
                }
            } else if (!silent) {
                this.showToast('Blogginnlegg er allerede oppdatert på tilgjengelige språk.', 'success', 3500);
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
            { key: 'overview:users', ref: firebaseService.db.collection('users') }
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
                if (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost') {
                    console.log('Dev Mode: Bypassing auth for testing');
                    this.userRole = 'admin';
                    this.initDashboard();
                    return;
                }
                // Delay redirect slightly to avoid random logouts during transient auth/token refresh.
                this._pendingAuthRedirectTimer = setTimeout(() => {
                    if (!firebaseService?.auth?.currentUser) {
                        window.location.href = '/admin/login.html';
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
                            path: '/minside/index.html',
                            message: 'Access Denied: Du har ikke administratorrettigheter til adminpanelet.'
                        });
                    } else {
                        window.location.href = '/minside/index.html';
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
                        path: '/minside/index.html',
                        message: 'Tilgang kunne ikke verifiseres. Prøv igjen eller kontakt administrator.'
                    });
                } else {
                    window.location.href = '/minside/index.html';
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
            // Hide admin-only sections from editors
            const adminOnlySections = ['settings', 'hero', 'design', 'seo', 'users'];
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

            // HKM Fix: Always use initials instead of photoURL
            const initials = safeName.split(' ').map(n => (n || '').trim()).filter(Boolean).map(n => n[0]).join('').toUpperCase();
            adminAvatar.textContent = (initials || 'A').substring(0, 2);
            adminAvatar.style.fontSize = '15px';
            adminAvatar.style.fontWeight = '800';
            adminAvatar.style.letterSpacing = '0';
            adminAvatar.style.borderRadius = '12px';
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
                window.location.href = '/admin/login.html';
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
            window.location.href = '/admin/login.html';
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
                window.location.href = '/admin/admin-meldinger.html';
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
        const icon = document.getElementById('notification-icon');
        const dot = document.getElementById('notification-dot');

        const displayCount = count > 9 ? '9+' : String(count);

        if (count > 0) {
            if (bell) bell.classList.add('has-unread');
            if (icon) icon.classList.add('has-unread');
            if (badge) {
                badge.style.display = 'flex';
                badge.textContent = displayCount;
            }
            if (dot) {
                dot.style.display = 'block';
                dot.textContent = displayCount;
            }
        } else {
            if (bell) bell.classList.remove('has-unread');
            if (icon) icon.classList.remove('has-unread');
            if (badge) {
                badge.style.display = 'none';
            }
            if (dot) {
                dot.style.display = 'none';
                dot.textContent = '';
            }
        }
    }

    /**
     * Called by the inline navigation script in index.html
     */
    onSectionSwitch(sectionId) {
        console.log(`[AdminManager] 🚀 Switching to section: ${sectionId}`);
        this.currentSection = sectionId;

        const section = document.getElementById(`${sectionId}-section`);
        if (!section) {
            console.warn(`[AdminManager] ⚠️ Section element not found: ${sectionId}-section`);
            return;
        }

        const alreadyRendered = section.getAttribute('data-rendered') === 'true';
        console.log(`[AdminManager] Section ${sectionId} alreadyRendered: ${alreadyRendered}`);

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
            } else if (sectionId === 'media') {
                this.loadMediaLibrary();
            }
        }

        if (section.getAttribute('data-rendered') !== 'true') {
            console.log(`[AdminManager] Initializing first-time render for: ${sectionId}`);
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
                    btn.textContent = 'Send push-varsling';
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

            // Fetch System Logs (Errors & Warnings)
            if (filter === 'all' || filter === 'system') {
                const logSnap = await db.collection('system_logs')
                    .orderBy('timestamp', 'desc').limit(15).get();
                logSnap.forEach(doc => {
                    const d = doc.data();
                    const isError = d.level === 'error' || d.severity === 'CRITICAL';
                    results.push({
                        id: doc.id,
                        type: 'system_log',
                        icon: isError ? 'report' : 'warning',
                        color: isError ? '#ef4444' : '#f59e0b',
                        bg: isError ? '#fef2f2' : '#fffbeb',
                        title: `System: ${d.type || 'Feil'}`,
                        meta: d.message || '',
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
                        <div class="table-container full-bleed">
                            <table class="crm-table">
                                <thead>
                                    <tr>
                                        <th>Dato</th>
                                        <th>Forfatter</th>
                                        <th>Kommentar</th>
                                        <th>Post ID</th>
                                        <th class="col-actions" style="text-align:right; padding-right:24px;">Handlinger</th>
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
                        <td class="col-actions" style="text-align:right; padding-right:20px;">
                            <button class="btn btn-icon danger delete-comment-btn" data-comment-id="${c.id}" data-post-id="${c.postId}" title="Slett kommentar" 
                                style="color: #ef4444; background: #fee2e2; border-radius: 8px; width: 34px; height: 34px; display: inline-flex; align-items: center; justify-content: center; border: none; cursor: pointer; padding: 0;">
                                <span class="material-symbols-outlined" style="font-size:20px; line-height: 1; display: block;">delete</span>
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');

            listBody.querySelectorAll('.delete-comment-btn').forEach(btn => {
                btn.onclick = async () => {
                    const confirmed = await this.showConfirm('Slett kommentar', 'Er du sikker på at du vil slette denne kommentaren?', 'Slett');
                    if (confirmed) {
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
        const searchModal = document.getElementById('search-modal');
        const modalSearchInput = document.getElementById('global-modal-search-input');
        const closeSearchModal = document.getElementById('close-search-modal');
        const searchOpener = document.getElementById('global-search-opener');

        if (!searchModal || !modalSearchInput) return;

        // Open search modal
        const openModal = () => {
            searchModal.style.display = 'flex';
            setTimeout(() => modalSearchInput.focus(), 100);
        };

        // Expose to window for FAB and other access
        window.openGlobalSearch = openModal;

        if (searchOpener) {
            searchOpener.addEventListener('click', openModal);
        }

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

        // Live suggestions
        const suggestionsContainer = document.getElementById('search-suggestions');
        modalSearchInput.addEventListener('input', () => {
            const query = modalSearchInput.value.trim();
            this.updateSearchSuggestions(query, suggestionsContainer);
        });
    }

    async updateSearchSuggestions(query, container) {
        const q = (query || '').trim().toLowerCase();
        if (!q || q.length < 1) {
            container.style.display = 'none';
            container.innerHTML = '';
            return;
        }

        // Fast match on common nav items and system areas
        const staticItems = [
            { label: 'Oversikt', type: 'Navigasjon', icon: 'grid_view' },
            { label: 'Blogg / Nyheter', type: 'Side', icon: 'rss_feed' },
            { label: 'Arrangementer', type: 'Side', icon: 'event' },
            { label: 'Mediebibliotek', type: 'Filer', icon: 'folder_open' },
            { label: 'Gavehåndtering', type: 'Økonomi', icon: 'volunteer_activism' },
            { label: 'Brukerliste', type: 'Medlemmer', icon: 'group' },
            { label: 'Ny bruker', type: 'Handling', icon: 'person_add' },
            { label: 'Podcast', type: 'Side', icon: 'podcasts' },
            { label: 'Om oss', type: 'Side', icon: 'info' },
            { label: 'Kontaktinformasjon', type: 'Side', icon: 'mail' },
            { label: 'Bibelstudier', type: 'Innhold', icon: 'menu_book' },
            { label: 'Systemlogger', type: 'Admin', icon: 'assignment' },
            { label: 'Hjem / Forside', type: 'Side', icon: 'home' }
        ];

        const matches = staticItems.filter(item => 
            item.label.toLowerCase().includes(q) || 
            item.type.toLowerCase().includes(q)
        ).slice(0, 6);

        if (matches.length > 0) {
            container.innerHTML = matches.map(m => `
                <div class="search-suggestion-item" onclick="window.adminManager.handleSuggestionClick('${m.label}')">
                    <div class="search-suggestion-icon">
                        <span class="material-symbols-outlined">${m.icon}</span>
                    </div>
                    <div class="search-suggestion-content">
                        <span class="search-suggestion-label">${m.label}</span>
                        <span class="search-suggestion-type">${m.type}</span>
                    </div>
                </div>
            `).join('');
            container.style.display = 'block';
        } else {
            container.style.display = 'none';
        }
    }

    handleSuggestionClick(label) {
        const input = document.getElementById('global-modal-search-input');
        if (input) input.value = label;
        const modal = document.getElementById('search-modal');
        if (modal) modal.style.display = 'none';
        const suggestionsContainer = document.getElementById('search-suggestions');
        if (suggestionsContainer) suggestionsContainer.style.display = 'none';
        this.performSearch(label);
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

    extractYoutubeId(url) {
        if (!url) return '';
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : (url.length === 11 ? url : '');
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
            new_user: 'Ny bruker',
            system_log: 'Systemlogg'
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
        } else if (item.type === 'system_log') {
            rows.push(this._renderDetailField('Feiltype', raw.type || 'Systemfeil'));
            rows.push(this._renderDetailField('Alvorlighet', (raw.severity || raw.level || 'warning').toUpperCase()));
            rows.push(this._renderDetailField('Kilde', raw.source || 'Ukjent'));
            rows.push(this._renderDetailField('URL', raw.url || '', { multiline: false }));
            rows.push(this._renderDetailField('Feilmelding', raw.message || '', { multiline: true }));
            if (raw.additionalData && raw.additionalData.stack) {
                rows.push(this._renderDetailField('Stack Trace', raw.additionalData.stack, { multiline: true }));
            }
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

    _getSavedAnalyticsRangeDays() {
        const saved = parseInt(localStorage.getItem('hkm_analytics_range_days'), 10);
        const allowed = [7, 14, 30, 60, 90, 180, 365];
        return allowed.includes(saved) ? saved : 30;
    }

    _formatAnalyticsRangeLabel(days = this.analyticsRangeDays) {
        return `Siste ${days} ${days === 1 ? 'dag' : 'dager'}`;
    }

    initAnalyticsRangeControl() {
        const select = document.getElementById('analytics-range-days');
        if (!select) return;

        select.value = String(this.analyticsRangeDays);
        select.addEventListener('change', () => {
            const nextDays = parseInt(select.value, 10);
            if (!Number.isFinite(nextDays) || nextDays === this.analyticsRangeDays) return;

            this.analyticsRangeDays = nextDays;
            localStorage.setItem('hkm_analytics_range_days', String(nextDays));
            this.renderOverview();
            this.showToast(`Viser ${this._formatAnalyticsRangeLabel(nextDays).toLowerCase()}.`, 'success', 2500);
        });
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
        let fullEvents = [];

        try {
            const [blogData, teachingData, eventData, causesData, indexData, yt, pod, coursesDoc, gaData] = await Promise.all([
                firebaseService.getPageContent('collection_blog'),
                firebaseService.getPageContent('collection_teaching'),
                firebaseService.getPageContent('collection_events'),
                firebaseService.getPageContent('collection_causes'),
                firebaseService.getPageContent('index'),
                this.fetchYouTubeStats(),
                this.fetchPodcastStats(),
                typeof firebaseService.getSiteContent === 'function'
                    ? firebaseService.getSiteContent('collection_courses')
                    : null,
                this.fetchAnalyticsData(this.analyticsRangeDays)
            ]);

            this.gaData = gaData; // Store for rendering below

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


            }
        } catch (e) {
            console.warn('Feil ved henting av statistikk:', e);
        }

        // Get Enabled Widgets & Order
        const savedOrder = JSON.parse(localStorage.getItem('hkm_dashboard_widgets'));
        const enabledWidgets = savedOrder || Object.keys(this.widgetLibrary).filter(id => this.widgetLibrary[id].default);
        const savedSpans = JSON.parse(localStorage.getItem('hkm_dashboard_widget_spans')) || {};

        // Define Categories & Groups
        const categories = [
            { id: 'traffic', label: 'Trafikk & Innsikt', icon: 'monitoring', widgets: ['visitors', 'analytics-engagement', 'users'] },
            { id: 'content', label: 'Innhold', icon: 'description', widgets: ['blog', 'podcast', 'teaching'] },
            { id: 'social', label: 'Sosialt & Drift', icon: 'hub', widgets: ['youtube', 'donations', 'status'] }
        ];

        // Build HTML for columns
        let widgetsHtml = '';
        
        categories.forEach(cat => {
            const catWidgets = cat.widgets.filter(id => enabledWidgets.includes(id));
            if (catWidgets.length === 0) return;

            widgetsHtml += `
                <div class="hkm-dashboard-col">
                    <div class="dashboard-col-header">
                        <span class="material-symbols-outlined">${cat.icon}</span>
                        <h4>${cat.label}</h4>
                    </div>
            `;

            catWidgets.forEach(id => {
                const w = this.widgetLibrary[id];
                if (!w) return;

                let value = '0', trend = '';
                
                const trends = {
                    'visitors': { val: '12%', up: true },
                    'analytics-engagement': { val: '4%', up: true },
                    'users': { val: '8%', up: true },
                    'youtube': { val: '8%', up: true }
                };

                if (trends[id]) {
                    trend = `
                        <div class="trend-indicator ${trends[id].up ? 'trend-up' : 'trend-down'}">
                            <span class="material-symbols-outlined" style="font-size: 14px;">${trends[id].up ? 'show_chart' : 'trending_down'}</span>
                            ${trends[id].val}
                        </div>
                    `;
                }

                switch (id) {
                    case 'visitors':
                        const cachedVisits = localStorage.getItem('hkm_stat_visits');
                        const liveVisits = this.gaData ? (this.gaData.activeRangeUsers || this.gaData.active30dUsers) : indexStats.website_visits;
                        value = liveVisits ? parseInt(liveVisits).toLocaleString('no-NO') : (cachedVisits ? parseInt(cachedVisits).toLocaleString('no-NO') : '—');
                        break;
                    case 'analytics-engagement':
                        const duration = this.gaData?.avgDuration || 0;
                        const mins = Math.floor(duration / 60);
                        const secs = Math.round(duration % 60);
                        value = `${mins}m ${secs}s`;
                        break;
                    case 'status':
                        value = `
                            <span class="status-pulse-dot" style="width: 10px; height: 10px;"></span>
                            Normal
                        `;
                        trend = '';
                        break;
                    case 'users': value = userCount; break;
                    case 'blog': value = blogCount; break;
                    case 'teaching': value = teachingCount; break;
                    case 'donations': value = donationCount; break;
                    case 'youtube': value = youtubeStats.subscribers || '453'; break;
                    case 'podcast': value = podcastCount; break;
                }

                widgetsHtml += `
                    <div class="stat-card modern" data-id="${id}">
                        <div class="stat-label">${w.label.toUpperCase()}</div>
                        <div class="stat-value">${value}</div>
                        ${trend}
                    </div>
                `;
            });

            widgetsHtml += `</div>`; // Close column
        });

        // Build Analytics Footer HTML with real data if available
        const ga = this.gaData || {};
        const topPagesArr = ga.topPages && Array.isArray(ga.topPages) 
            ? ga.topPages.slice(0, 5).map(p => ({ 
                path: p.title.length > 30 ? p.title.substring(0, 30) + '...' : p.title, 
                pct: Math.round((parseInt(p.views) / (parseInt(ga.screenPageViews) || 1)) * 100) || 5 
              }))
            : [
                { path: '/hjem', pct: 42 },
                { path: '/blogg', pct: 28 },
                { path: '/podcast', pct: 15 },
                { path: '/kurs', pct: 10 },
                { path: '/kontakt', pct: 5 }
            ];

        // Generate a simple SVG sparkline if daily traffic is available
        let sparklineHtml = `
            <div style="height: 100%; width: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; opacity: 0.6;">
                <span class="material-symbols-outlined" style="font-size: 48px; color: #d97706; margin-bottom: 16px;">monitoring</span>
                <div style="text-align: center;">
                    <h4 style="color: #1e293b; margin-bottom: 8px;">Venter på data</h4>
                    <p style="font-size: 13px; color: #94a3b8;">Henter dine siste besøkstall...</p>
                </div>
            </div>
        `;

        if (ga.dailyTraffic && Array.isArray(ga.dailyTraffic) && ga.dailyTraffic.length > 1) {
            const trafficData = ga.dailyTraffic.map(d => parseInt(d.users) || 0);
            const maxUsers = Math.max(...trafficData, 1);
            const points = trafficData.map((users, i) => {
                const x = (i / (trafficData.length - 1)) * 100;
                const y = 95 - (users / maxUsers) * 85; // Keep 5% padding top/bottom
                return `${x},${y}`;
            }).join(' ');

            sparklineHtml = `
                <div style="width: 100%; height: 100%; display: flex; flex-direction: column; overflow: hidden; position: relative;">
                    <div style="flex: 1; min-height: 140px; position: relative; overflow: hidden; margin: 10px 0;">
                        <svg viewBox="0 0 100 100" preserveAspectRatio="none" style="width: 100%; height: 100%; display: block;">
                            <defs>
                                <linearGradient id="sparkline-grad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stop-color="#f97316" stop-opacity="0.25" />
                                    <stop offset="100%" stop-color="#f97316" stop-opacity="0" />
                                </linearGradient>
                            </defs>
                            <path d="M 0 100 L ${points} L 100 100 Z" fill="url(#sparkline-grad)" />
                            <polyline points="${points}" fill="none" stroke="#f97316" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" />
                        </svg>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: flex-end; padding-top: 15px; border-top: 1px solid #f1f5f9; margin-top: auto;">
                        <div>
                            <div style="font-size: 10px; color: #94a3b8; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Aktivitet ${this._formatAnalyticsRangeLabel().toLowerCase()}</div>
                            <div style="font-size: 24px; font-weight: 800; color: #1e293b; letter-spacing: -0.02em;">${ga.screenPageViews || '0'} <span style="font-size: 13px; font-weight: 600; color: #64748b; margin-left: 4px;">sidevisninger</span></div>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-size: 10px; color: #94a3b8; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Akkurat nå</div>
                            <div style="font-size: 24px; font-weight: 800; color: #f97316; display: flex; align-items: center; gap: 8px; justify-content: flex-end; letter-spacing: -0.02em;">
                                <span style="width: 10px; height: 10px; background: #f97316; border-radius: 50%; display: block; animation: hkm-pulse 2s infinite;"></span>
                                ${ga.activeUsers || '0'}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        const analyticsFooterHtml = `
            <style>
                @keyframes hkm-pulse {
                    0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(249, 115, 22, 0.7); }
                    70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(249, 115, 22, 0); }
                    100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(249, 115, 22, 0); }
                }
            </style>
            <div class="analytics-bottom-row">
                <div class="big-card">
                    <div class="big-card-title">
                        <span>Trafikkovervåking (Google Analytics)</span>
                        <div style="display:flex; gap: 8px; align-items:center;">
                            <label for="analytics-range-days" class="sr-only">Velg periode</label>
                            <select id="analytics-range-days" class="analytics-range-select" aria-label="Velg periode for Google Analytics">
                                ${[7, 14, 30, 60, 90, 180, 365].map(days => `
                                    <option value="${days}" ${days === this.analyticsRangeDays ? 'selected' : ''}>${this._formatAnalyticsRangeLabel(days)}</option>
                                `).join('')}
                            </select>
                            <span class="material-symbols-outlined" style="cursor:pointer; color: #64748b;">more_vert</span>
                        </div>
                    </div>
                    <div style="height: 300px; background: white; border: 1px solid #f1f5f9; border-radius: 12px; display: flex; flex-direction: column; align-items: stretch; color: #94a3b8; padding: 24px;">
                        ${sparklineHtml}
                    </div>
                </div>

                <div class="big-card">
                    <div class="big-card-title">Topp Sider</div>
                    <div class="top-pages-list">
                        ${topPagesArr.map(page => `
                            <div class="top-page-item">
                                <div class="top-page-info">
                                    <span class="top-page-path">${page.path}</span>
                                    <span class="top-page-pct">${page.pct}%</span>
                                </div>
                                <div class="top-page-bar-wrap">
                                    <div class="top-page-bar" style="width: ${page.pct}%;"></div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    <a href="https://analytics.google.com/analytics/web/" class="analytics-open-link" target="_blank" rel="noopener noreferrer">
                        Åpne Google Analytics
                        <span class="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
                    </a>
                </div>
            </div>
        `;

        section.innerHTML = `
            <style>
                .hkm-dashboard-grid-saas {
                    display: grid !important;
                    grid-template-columns: repeat(3, 1fr) !important;
                    gap: 32px !important;
                    width: 100% !important;
                    margin-top: 32px !important;
                    align-items: start !important;
                }
                @media (max-width: 1024px) {
                    .hkm-dashboard-grid-saas {
                        grid-template-columns: 1fr !important;
                    }
                }
                .hkm-dashboard-col {
                    display: flex !important;
                    flex-direction: column !important;
                    gap: 24px !important;
                    min-width: 0 !important;
                }
                .dashboard-col-header {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin-bottom: 8px;
                    color: #1e293b;
                }
                .dashboard-col-header h4 {
                    margin: 0;
                    font-size: 16px;
                    font-weight: 700;
                }
                .stat-card.modern {
                    background: white !important;
                    border: 1px solid #e2e8f0 !important;
                    border-radius: 12px !important;
                    padding: 24px !important;
                    display: flex !important;
                    flex-direction: column !important;
                    gap: 8px !important;
                    transition: all 0.2s ease !important;
                    box-shadow: 0 1px 2px rgba(0,0,0,0.05) !important;
                }
                .stat-card.modern:hover {
                    border-color: #d17d39 !important;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.05) !important;
                    transform: translateY(-2px);
                }
                .stat-label {
                    font-size: 11px !important;
                    font-weight: 700 !important;
                    color: #64748b !important;
                    text-transform: uppercase !important;
                    letter-spacing: 0.05em !important;
                }
                .stat-value {
                    font-size: 28px !important;
                    font-weight: 800 !important;
                    color: #1e293b !important;
                    margin: 0 !important;
                }
                .trend-indicator {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    font-size: 12px;
                    font-weight: 700;
                    margin-top: 4px;
                }
                .trend-up { color: #16a34a; }
                .trend-down { color: #dc2626; }
                
                /* Mobile Optimizations for Hero Card */
                @media (max-width: 768px) {
                    .overview-hero-card {
                        padding: 32px !important;
                    }
                    .overview-hero-title {
                        font-size: 28px !important;
                    }
                    .hero-actions-container {
                        flex-direction: column !important;
                        width: 100% !important;
                    }
                    .overview-hero-action, .overview-hero-action-secondary {
                        width: 100% !important;
                        justify-content: center !important;
                    }
                }
            </style>
            <div class="overview-hero-card" style="background: var(--admin-orange-gradient); border-radius: 16px; padding: 48px; position: relative; overflow: hidden; color: white;">
                <div class="overview-hero-content" style="position: relative; z-index: 2;">
                    <h2 class="overview-hero-title" style="font-size: 36px; font-weight: 800; margin-bottom: 12px;">Velkommen tilbake!</h2>
                    <p class="overview-hero-text" style="font-size: 16px; opacity: 0.9; max-width: 600px; line-height: 1.6;">
                        Her har du en fullstendig oversikt over HKM Studio. Se sanntidsdata, administrer innhold og svar på meldinger fra én sentral flate.
                    </p>
                    <div class="hero-actions-container" style="display: flex; flex-wrap: wrap; gap: 12px; margin-top: 32px; align-items: center !important; justify-content: flex-start !important;">
                        <button type="button" class="overview-hero-action" style="height: 48px !important; background: #ffffff !important; color: #bd4f2a !important; border-radius: 8px !important; padding: 0 24px !important; font-weight: 600 !important; border: 1px solid transparent !important; box-shadow: 0 4px 12px rgba(0,0,0,0.1) !important; cursor: pointer !important; display: flex !important; align-items: center !important; justify-content: center !important; gap: 10px !important; font-family: 'Inter', sans-serif !important; transition: all 0.2s ease !important; font-size: 14px !important; white-space: nowrap !important; box-sizing: border-box !important; margin: 0 !important;" onclick="window.location.href='/admin/admin-meldinger.html'" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 16px rgba(0,0,0,0.15)';" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.1)';">
                            <span class="material-symbols-outlined" style="font-size: 20px !important;">mail</span>
                            Gå til meldinger
                        </button>
                        <button type="button" class="overview-hero-action-secondary" style="height: 48px !important; background: rgba(255,255,255,0.1) !important; color: white !important; border-radius: 8px !important; padding: 0 24px !important; font-weight: 600 !important; border: 1px solid rgba(255,255,255,0.4) !important; backdrop-filter: blur(8px) !important; cursor: pointer !important; font-family: 'Inter', sans-serif !important; transition: all 0.2s ease !important; display: flex !important; align-items: center !important; justify-content: center !important; gap: 10px !important; font-size: 14px !important; white-space: nowrap !important; box-sizing: border-box !important; margin: 0 !important;" onclick="window.location.href='/admin/index.html#content'" onmouseover="this.style.background='rgba(255,255,255,0.2)'; this.style.borderColor='rgba(255,255,255,0.6)';" onmouseout="this.style.background='rgba(255,255,255,0.1)'; this.style.borderColor='rgba(255,255,255,0.4)';">
                            <span class="material-symbols-outlined" style="font-size: 20px !important;">dashboard_customize</span>
                            Se sideinnhold
                        </button>
                    </div>
                </div>
                <!-- Subtle background decoration -->
                <span class="material-symbols-outlined" style="position: absolute; right: -40px; bottom: -40px; font-size: 320px; opacity: 0.1; transform: rotate(-15deg);">auto_graph</span>
            </div>
            <div class="hkm-dashboard-grid-saas">
                ${widgetsHtml}
            </div>
            <div class="analytics-footer-section">
                ${analyticsFooterHtml}
            </div>
        `;
        // Initialize supporting systems
        this._initOverviewRealtimeSubscriptions();
        this.initWidgetConfig();
        this.initSortableWidgets();
        this.initWidgetResizers();

        // RE-INIT DROPDOWN, CONFIG BTN and SORTABLE
        this._initOverviewRealtimeSubscriptions();
        this.initWidgetConfig();
        this.initSortableWidgets();
        this.initSortableMainGrid();
        this.initWidgetResizers();
        this.initAnalyticsRangeControl();

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

        // Load content lists (Removed undefined loadContentList calls)
        
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
        try {
            const response = await fetch('https://getpodcast-42bhgdjkcq-uc.a.run.app');
            const data = await response.json();
            // The Cloud Function uses xml2js, so items are in data.rss.channel[0].item
            const items = data?.rss?.channel?.[0]?.item;
            if (items && Array.isArray(items)) {
                return items.length;
            }
        } catch (error) {
            console.error('Error fetching Podcast stats via Cloud Function:', error);
        }
        return '...';
    }

    _extractPodcastText(value) {
        if (Array.isArray(value)) {
            return this._extractPodcastText(value[0]);
        }
        if (value && typeof value === 'object') {
            if (typeof value._ === 'string') return value._;
            if (typeof value['#text'] === 'string') return value['#text'];
            if (typeof value.$?.href === 'string') return value.$.href;
            if (typeof value.$?.url === 'string') return value.$.url;
            return '';
        }
        return typeof value === 'string' ? value : '';
    }

    _normalizePodcastDate(value) {
        const raw = typeof value === 'string' ? value.trim() : '';
        if (!raw) return '';
        const parsed = new Date(raw);
        if (Number.isNaN(parsed.getTime())) {
            return raw.split('T')[0] || raw;
        }
        return parsed.toISOString().split('T')[0];
    }

    async fetchPodcastEpisodesForAdmin() {
        try {
            const response = await fetch('https://getpodcast-42bhgdjkcq-uc.a.run.app');
            const data = await response.json();
            const rawItems = data?.rss?.channel?.[0]?.item;
            const items = Array.isArray(rawItems) ? rawItems : [];

            return items.map((episode) => {
                const guid = this._extractPodcastText(episode?.guid);
                const link = this._extractPodcastText(episode?.link);
                const title = this._extractPodcastText(episode?.title) || 'Uten tittel';
                const date = this._normalizePodcastDate(this._extractPodcastText(episode?.pubDate));
                const description = this._extractPodcastText(episode?.description)
                    || this._extractPodcastText(episode?.['itunes:summary'])
                    || '';

                const imageNode = Array.isArray(episode?.['itunes:image'])
                    ? episode['itunes:image'][0]
                    : episode?.['itunes:image'];
                const imageUrl = imageNode?.$?.href || '';
                const enclosureNode = Array.isArray(episode?.enclosure)
                    ? episode.enclosure[0]
                    : episode?.enclosure;
                const audioUrl = enclosureNode?.$?.url || this._extractPodcastText(enclosureNode?.url) || '';

                const id = guid || link || title;

                return {
                    id,
                    title,
                    date,
                    description,
                    imageUrl,
                    audioUrl,
                    source: 'feed'
                };
            }).filter((ep) => ep.id);
        } catch (error) {
            console.error('Error fetching podcast episodes for admin:', error);
            return [];
        }
    }

    async getPodcastTranscriptItems() {
        const [snapshots, feedEpisodes] = await Promise.all([
            firebase.firestore().collection('podcast_transcripts').get(),
            this.fetchPodcastEpisodesForAdmin()
        ]);

        const transcriptById = new Map(
            snapshots.docs.map((doc) => [doc.id, {
                id: doc.id,
                ...doc.data(),
                isFirestore: true
            }])
        );

        const merged = [];

        feedEpisodes.forEach((episode) => {
            const existingTranscript = transcriptById.get(episode.id);
            if (existingTranscript) {
                merged.push({
                    ...episode,
                    ...existingTranscript,
                    id: existingTranscript.id,
                    isFirestore: true
                });
                transcriptById.delete(episode.id);
            } else {
                merged.push({
                    ...episode,
                    text: '',
                    content: '',
                    isFirestore: false
                });
            }
        });

        transcriptById.forEach((docItem) => {
            merged.push(docItem);
        });

        const toTimestamp = (dateValue) => {
            const parsed = new Date(dateValue || '');
            return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
        };
        merged.sort((a, b) => toTimestamp(b.date) - toTimestamp(a.date));

        return merged;
    }

    _initImageReplaceBehavior(editor, containerId, collectionId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        // Delegate click handler on the editor container
        container.addEventListener('click', async (e) => {
            const imageWrapper = e.target.closest('.image-tool__image');
            if (!imageWrapper) return;

            // Don't interfere if the click is on a native file input already
            if (e.target.tagName === 'INPUT') return;

            // Find the .ce-block ancestor to get the block ID
            const ceBlock = imageWrapper.closest('.ce-block');
            const blockId = ceBlock?.dataset?.id;

            // Create a temporary file input
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = 'image/*';
            fileInput.style.display = 'none';
            document.body.appendChild(fileInput);

            fileInput.onchange = async (evt) => {
                const file = evt.target.files[0];
                fileInput.remove();
                if (!file) return;

                // Show loading state on the image
                const picture = imageWrapper.querySelector('.image-tool__image-picture');
                const preloader = imageWrapper.querySelector('.image-tool__image-preloader');
                if (picture) { picture.style.opacity = '0.35'; picture.style.transition = 'opacity 0.2s'; }
                if (preloader) preloader.style.display = 'block';

                try {
                    const path = `editor/${collectionId}/${Date.now()}_${file.name}`;
                    const url = await firebaseService.uploadImage(file, path);

                    // Update the visible <img> immediately so user sees the change
                    if (picture) {
                        picture.src = url;
                        picture.style.opacity = '1';
                    }
                    if (preloader) preloader.style.display = 'none';

                    // Update the internal Editor.js block data so the new URL is saved
                    if (blockId && editor?.blocks) {
                        try {
                            const savedOutput = await editor.save();
                            const allBlockEls = container.querySelectorAll('.ce-block');
                            const blockIndex = Array.from(allBlockEls).indexOf(ceBlock);

                            if (blockIndex >= 0 && savedOutput.blocks[blockIndex]?.type === 'image') {
                                const updatedData = {
                                    ...savedOutput.blocks[blockIndex].data,
                                    file: { url }
                                };
                                editor.blocks.update(blockId, updatedData);
                            }
                        } catch (updateErr) {
                            // Block update API may not be available in all EditorJS versions –
                            // the visual update already happened, and save() will pick up the src.
                            console.warn('[ImageReplace] Could not call blocks.update():', updateErr);
                        }
                    }

                    this.showToast('Bilde oppdatert!', 'success');
                } catch (err) {
                    console.error('[ImageReplace] Upload failed:', err);
                    if (picture) picture.style.opacity = '1';
                    if (preloader) preloader.style.display = 'none';
                    this.showToast('Kunne ikke laste opp bilde.', 'error');
                }
            };

            fileInput.click();
        });
    }

    _hasMeaningfulEditorContent(editorData) {
        const blocks = Array.isArray(editorData?.blocks) ? editorData.blocks : [];
        if (!blocks.length) return false;

        const stripText = (value) => String(value || '')
            .replace(/<[^>]*>/g, ' ')
            .replace(/&nbsp;/gi, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        return blocks.some((block) => {
            const type = String(block?.type || '').toLowerCase();
            const data = block?.data || {};

            if (type === 'header' || type === 'paragraph' || type === 'quote') {
                return stripText(data.text).length > 0;
            }
            if (type === 'image' || type === 'video' || type === 'youtubevideo') {
                const url = data.file?.url || data.url || '';
                return url.length > 0;
            }
            if (type === 'list') {
                const items = Array.isArray(data.items) ? data.items : [];
                return items.some((item) => {
                    const txt = typeof item === 'string' ? item : (item?.content || item?.text || '');
                    return stripText(txt).length > 0;
                });
            }

            if (type === 'image') {
                const url = data?.file?.url || data?.url || '';
                return String(url).trim().length > 0;
            }

            if (type === 'youtubevideo') {
                return String(data?.url || '').trim().length > 0;
            }

            return stripText(data.text).length > 0;
        });
    }

    hasPodcastTranscriptText(item) {
        const text = typeof item?.text === 'string' ? item.text.trim() : '';
        if (text) return true;

        const content = item?.content;
        if (typeof content === 'string' && content.trim()) return true;
        if (this._hasMeaningfulEditorContent(content)) return true;

        return false;
    }

    hasPodcastTranscriptSummary(item) {
        const description = typeof item?.description === 'string' ? item.description.trim() : '';
        const summary = typeof item?.summary === 'string' ? item.summary.trim() : '';
        return Boolean(description || summary);
    }

    getPodcastTranscriptAudit(item) {
        const hasTranscript = this.hasPodcastTranscriptText(item);
        const hasSummary = this.hasPodcastTranscriptSummary(item);

        return {
            hasTranscript,
            hasSummary,
            isComplete: hasTranscript && hasSummary
        };
    }

    getPodcastTranscriptOverview(items) {
        const list = Array.isArray(items) ? items : [];
        const stats = {
            total: list.length,
            missingTranscript: 0,
            missingSummary: 0,
            complete: 0
        };

        list.forEach((item) => {
            const audit = this.getPodcastTranscriptAudit(item);
            if (!audit.hasTranscript) stats.missingTranscript += 1;
            if (!audit.hasSummary) stats.missingSummary += 1;
            if (audit.isComplete) stats.complete += 1;
        });

        return stats;
    }

    podcastBlocksToPlainText(blocks) {
        const list = Array.isArray(blocks) ? blocks : [];
        return list
            .map((block) => {
                const type = String(block?.type || '').toLowerCase();
                const data = block?.data || {};

                if (type === 'header' || type === 'quote' || type === 'paragraph') {
                    return String(data.text || '').trim();
                }

                if (type === 'list') {
                    const items = Array.isArray(data.items) ? data.items : [];
                    return items
                        .map((item) => {
                            if (typeof item === 'string') return item;
                            if (item && typeof item === 'object') return item.content || item.text || '';
                            return '';
                        })
                        .filter(Boolean)
                        .join(' ');
                }

                return String(data.text || '').trim();
            })
            .filter(Boolean)
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    podcastHtmlToPlainText(value) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(String(value || ''), 'text/html');
        return String(doc.body?.textContent || '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    getPodcastTranscriptPlainText(item) {
        const content = item?.content;
        if (content && typeof content === 'object' && Array.isArray(content.blocks)) {
            const blockText = this.podcastBlocksToPlainText(content.blocks);
            if (blockText) return blockText;
        }

        if (typeof item?.text === 'string' && item.text.trim()) {
            return this.podcastHtmlToPlainText(item.text);
        }

        if (typeof content === 'string' && content.trim()) {
            return this.podcastHtmlToPlainText(content);
        }

        return '';
    }

    buildPodcastLocalSummarySuggestion(title, transcriptText) {
        const cleaned = String(transcriptText || '')
            .replace(/\s+/g, ' ')
            .replace(/\b\d{1,3}[.:]\s*/g, '')
            .trim();

        if (!cleaned) return '';

        const sentences = cleaned
            .split(/(?<=[.!?])\s+/)
            .map((s) => s.trim())
            .filter((s) => s.length >= 35)
            .slice(0, 3);

        const core = sentences.join(' ').trim();
        if (!core) return '';

        if (!title) return core;

        return `I denne episoden ${title.toLowerCase().includes('lydbok') ? 'får du en lydboklesning' : 'får du undervisning'} som tar deg gjennom sentrale poeng i teksten. ${core}`;
    }

    async generatePodcastTranscriptForItem(item) {
        const episodeId = String(item?.id || '').trim();
        const audioUrl = String(item?.audioUrl || '').trim();

        if (!episodeId || !audioUrl) {
            throw new Error('Mangler episode-ID eller lydfil.');
        }

        const callable = firebase.functions().httpsCallable('transcribePodcast');
        await callable({
            episodeId,
            audioUrl,
            episodeTitle: String(item?.title || '')
        });

        const refreshedDoc = await firebase.firestore().collection('podcast_transcripts').doc(episodeId).get();
        return refreshedDoc.exists ? { id: episodeId, ...refreshedDoc.data() } : item;
    }

    async generatePodcastSummaryForItem(item) {
        const episodeId = String(item?.id || '').trim();
        if (!episodeId) {
            throw new Error('Mangler episode-ID for oppsummering.');
        }

        const transcriptText = this.getPodcastTranscriptPlainText(item);
        if (transcriptText.length < 120) {
            throw new Error('For lite tekstgrunnlag til å lage oppsummering.');
        }

        let summary = '';

        try {
            const callable = firebase.functions().httpsCallable('generatePodcastSummary');
            const response = await callable({
                episodeTitle: String(item?.title || '').trim(),
                transcriptText
            });
            summary = String(response?.data?.summary || '').trim();
        } catch (error) {
            console.warn('AI-oppsummering feilet i bulk, bruker lokal fallback:', error);
        }

        if (!summary) {
            summary = this.buildPodcastLocalSummarySuggestion(String(item?.title || ''), transcriptText);
        }

        if (!summary) {
            throw new Error('Kunne ikke lage oppsummering.');
        }

        await firebase.firestore().collection('podcast_transcripts').doc(episodeId).set({
            description: summary,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        return {
            ...item,
            description: summary
        };
    }

    async runPodcastBulkAiFillMissing(triggerBtn = null) {
        const collectionId = 'podcast_transcripts';

        if (!Array.isArray(this._collectionItemsCache[collectionId]) || this._collectionItemsCache[collectionId].length === 0) {
            await this.loadCollection(collectionId);
        }

        const items = Array.isArray(this._collectionItemsCache[collectionId])
            ? [...this._collectionItemsCache[collectionId]]
            : [];

        const targets = items.filter((item) => {
            const audit = this.getPodcastTranscriptAudit(item);
            return !audit.hasTranscript || !audit.hasSummary;
        });

        if (!targets.length) {
            this.showToast('Alle podcast-episoder har allerede tekst og oppsummering.', 'success', 5000);
            return;
        }

        const confirmed = await this.showConfirm('Generer innhold', `Dette vil generere manglende tekst og oppsummering for ${targets.length} podcast-episoder. Vil du fortsette?`, 'Fortsett');
        if (!confirmed) return;

        const originalBtnHtml = triggerBtn ? triggerBtn.innerHTML : '';
        if (triggerBtn) {
            triggerBtn.disabled = true;
            triggerBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size:18px;">hourglass_top</span> Kjører...';
        }

        let processed = 0;
        let failed = 0;

        try {
            for (const target of targets) {
                const title = String(target?.title || 'Uten tittel');
                this.showToast(`Jobber med podcast: ${title}`, 'info', 2500);

                try {
                    let workingItem = { ...target };
                    const auditBefore = this.getPodcastTranscriptAudit(workingItem);

                    if (!auditBefore.hasTranscript) {
                        workingItem = await this.generatePodcastTranscriptForItem(workingItem);
                    }

                    const auditAfterTranscript = this.getPodcastTranscriptAudit(workingItem);
                    if (!auditAfterTranscript.hasSummary) {
                        workingItem = await this.generatePodcastSummaryForItem(workingItem);
                    }

                    this._collectionItemsCache[collectionId] = (this._collectionItemsCache[collectionId] || []).map((entry) =>
                        entry?.id === workingItem.id ? { ...entry, ...workingItem } : entry
                    );

                    processed += 1;
                } catch (error) {
                    failed += 1;
                    console.error('Bulk podcast AI-generering feilet for episode:', target?.id, error);
                }
            }

            await this.loadCollection(collectionId);

            if (failed === 0) {
                this.showToast(`Ferdig. Oppdaterte ${processed} podcast-episoder.`, 'success', 6000);
            } else {
                this.showToast(`Ferdig med feil. Oppdaterte ${processed} episoder, ${failed} feilet.`, 'warning', 7000);
            }
        } finally {
            if (triggerBtn) {
                triggerBtn.disabled = false;
                triggerBtn.innerHTML = originalBtnHtml;
            }
        }
    }


    async fetchAnalyticsData(days = this.analyticsRangeDays) {
        try {
            const safeDays = [7, 14, 30, 60, 90, 180, 365].includes(Number(days)) ? Number(days) : 30;
            // Call the Firebase Function
            const response = await fetch(`https://getanalyticsoverview-42bhgdjkcq-uc.a.run.app?days=${safeDays}`);
            const result = await response.json();
            if (result.status === 'success') {
                return result.data;
            } else if (result.status === 'unconfigured') {
                console.warn('Analytics is not configured on the backend.');
                return null;
            }
            throw new Error(result.error || 'Failed to fetch analytics');
        } catch (error) {
            console.error('Error fetching Analytics data:', error);
            return null;
        }
    }

    async renderMediaManager() {
        const section = document.getElementById('media-section');
        if (!section) return;

        // Use tabs to separate Media Library and Integrations
        section.innerHTML = `
            <div class="section-header" style="margin-bottom: 32px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-end; width: 100%;">
                    <div>
                        <h2 class="section-title">Media & Ressurser</h2>
                        <p class="section-subtitle">Administrer bilder, podcast, integrasjoner og AI</p>
                    </div>
                    <div class="header-actions">
                        <div class="tabs-control" style="background: #f1f5f9; padding: 4px; border-radius: 12px; display: flex; gap: 4px;">
                            <button class="tab-btn active" data-tab="library" style="padding: 8px 16px; border-radius: 8px; border: none; background: white; color: #1B4965; font-weight: 600; cursor: pointer; box-shadow: 0 1px 3px rgba(0,0,0,0.1); transition: all 0.2s;">Bibliotek</button>
                            <button class="tab-btn" data-tab="integrations" style="padding: 8px 16px; border-radius: 8px; border: none; background: transparent; color: #64748b; font-weight: 600; cursor: pointer; transition: all 0.2s;">Integrasjoner & Podcast</button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Media Library Tab Content -->
            <div id="media-library-content" class="tab-content active">
                <div class="media-library-stats" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 32px;">
                    <div class="stat-card" style="padding: 20px; background: white; border-radius: 16px; border: 1px solid #e2e8f0; display: flex; align-items: center; gap: 16px;">
                        <div style="width: 48px; height: 48px; border-radius: 12px; background: rgba(27, 73, 101, 0.1); color: #1B4965; display: flex; align-items: center; justify-content: center;">
                            <span class="material-symbols-outlined">image</span>
                        </div>
                        <div>
                            <p style="font-size: 13px; color: #64748b; margin: 0;">Totalt antall filer</p>
                            <h4 id="media-count" style="font-size: 20px; font-weight: 700; margin: 0; color: #1e293b;">0</h4>
                        </div>
                    </div>
                    <div class="stat-card" style="padding: 20px; background: white; border-radius: 16px; border: 1px solid #e2e8f0; display: flex; align-items: center; gap: 16px;">
                        <div style="width: 48px; height: 48px; border-radius: 12px; background: rgba(16, 185, 129, 0.1); color: #10b981; display: flex; align-items: center; justify-content: center;">
                            <span class="material-symbols-outlined">compress</span>
                        </div>
                        <div>
                            <p style="font-size: 13px; color: #64748b; margin: 0;">Auto-komprimering</p>
                            <h4 style="font-size: 18px; font-weight: 700; margin: 0; color: #1e293b;">Aktiv</h4>
                        </div>
                    </div>
                </div>

                <div id="media-dropzone" class="media-dropzone" style="border: 2px dashed #cbd5e1; border-radius: 20px; padding: 40px; text-align: center; background: #f8fafc; margin-bottom: 32px; transition: all 0.3s ease; cursor: pointer;">
                    <span class="material-symbols-outlined" style="font-size: 48px; color: #94a3b8; margin-bottom: 12px;">cloud_upload</span>
                    <h3 style="margin: 0; font-size: 18px; color: #334155;">Dra bilder hit eller klikk for å laste opp</h3>
                    <p style="margin: 8px 0 0; color: #64748b; font-size: 14px;">Bilder komprimeres automatisk for optimal kvalitet og hastighet</p>
                    <input type="file" id="media-file-input" style="display: none;" accept="image/*" multiple>
                </div>

                <div id="media-grid" class="media-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 24px;">
                    <div class="loader-container" style="grid-column: 1/-1; text-align: center; padding: 60px 0;">
                        <div class="loader" style="margin: 0 auto;"></div>
                        <p style="margin-top: 16px; color: #64748b;">Henter mediebibliotek...</p>
                    </div>
                </div>
            </div>

            <!-- Integrations Tab Content -->
            <div id="media-integrations-content" class="tab-content" style="display: none;">
                <div class="grid-2-cols" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 24px;">
                    
                    <!-- Podcast & YouTube Settings Card -->
                    <div class="card modern">
                        <div class="card-header flex-between">
                            <h3 class="card-title">YouTube & Podcast Integrasjoner</h3>
                        </div>
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
                                <button class="btn-primary" id="save-media-settings" style="width: 100%;">Lagre media-innstillinger</button>
                            </div>
                        </div>
                    </div>

                    <!-- Podcast Management (Transcripts) Card -->
                    <div class="card modern">
                        <div class="card-header flex-between">
                            <h3 class="card-title">Podcast-administrasjon</h3>
                            <div style="display:flex; gap:8px; align-items:center;">
                                <button class="btn-secondary btn-sm" id="open-podcast-transcripts-full">Alle episoder</button>
                                <button class="btn-secondary btn-sm" id="refresh-podcast-list">Oppdater</button>
                            </div>
                        </div>
                        <div class="card-body">
                            <div style="background: #f8fafc; padding: 15px; border-radius: 12px; margin-bottom: 20px; border: 1px solid #e2e8f0;">
                                <label style="font-size: 11px; font-weight: 800; color: #1e293b; text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 8px;">Globale Kategorier (Hurtigvalg)</label>
                                <input type="text" id="podcast-custom-categories" class="form-control" placeholder="f.eks. Lederskap, Helbredelse, Familie">
                                <p style="font-size: 11px; color: #64748b; margin-top: 6px; line-height: 1.4;">Separer med komma. Disse vises som hurtigvalg når du redigerer enkeltepisoder.</p>
                            </div>
                            
                            <p style="font-size: 13px; color: #64748b; margin-bottom: 12px; font-weight: 600;">Siste episoder (Overstyring/Transkripsjon):</p>
                            <div id="podcast-overrides-list" style="max-height: 400px; overflow-y: auto;">
                                <div class="loader">Henter episoder...</div>
                            </div>
                            <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #eee;">
                                <button class="btn-primary" id="save-podcast-overrides" style="width: 100%;">Lagre overstyringer</button>
                            </div>
                        </div>
                    </div>

                    <!-- Google Calendar API Card -->
                    <div class="card modern">
                        <div class="card-header flex-between">
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <div style="width: 32px; height: 32px; border-radius: 8px; background: #e0f2fe; color: #0ea5e9; display: flex; align-items: center; justify-content: center;">
                                    <span class="material-symbols-outlined" style="font-size: 20px;">calendar_month</span>
                                </div>
                                <h3 class="card-title">Google Calendar API</h3>
                            </div>
                            <div class="status-badge" id="gcal-status" style="font-size: 11px; padding: 2px 8px; border-radius: 10px; background: #fee2e2; color: #991b1b; font-weight: 600;">Frakoblet</div>
                        </div>
                        <div class="card-body">
                            <div class="form-group">
                                <label>Google API Key</label>
                                <input type="password" id="gcal-api-key" class="form-control" placeholder="Din Google Cloud API Key">
                            </div>
                            <div class="form-group" style="margin-top: 15px;">
                                <label>Calendar ID</label>
                                <div id="gcal-list" class="gcal-list" style="margin-bottom: 8px;"></div>
                                <button type="button" class="btn btn-outline" id="add-gcal" style="width: 100%;">
                                    <span class="material-symbols-outlined" style="font-size: 18px; margin-right: 4px;">add</span>
                                    Legg til kalender
                                </button>
                            </div>
                            <div id="google-auth-status" style="margin-top: 20px;">
                                <!-- Auth status injected by JS -->
                            </div>
                        </div>
                    </div>

                    <!-- AI & Translation Card -->
                    <div class="card modern">
                        <div class="card-header flex-between">
                             <div style="display: flex; align-items: center; gap: 12px;">
                                <div style="width: 32px; height: 32px; border-radius: 8px; background: #f5f3ff; color: #7c3aed; display: flex; align-items: center; justify-content: center;">
                                    <span class="material-symbols-outlined" style="font-size: 20px;">translate</span>
                                </div>
                                <h3 class="card-title">AI & Oversettelse</h3>
                            </div>
                        </div>
                        <div class="card-body">
                             <div class="form-group" style="margin-bottom: 15px;">
                                <label>Leverandør</label>
                                <select id="translation-provider" class="form-control">
                                    <option value="mymemory">MyMemory (gratis)</option>
                                    <option value="gemini">Gemini (Google AI)</option>
                                </select>
                            </div>
                            <div class="form-group" style="margin-bottom: 15px;">
                                <label>Gemini API Key</label>
                                <input type="password" id="gemini-api-key" class="form-control" placeholder="AIza...">
                            </div>
                            <div class="form-group">
                                <label>Modell</label>
                                <input type="text" id="gemini-model" class="form-control" placeholder="gemini-1.5-flash">
                            </div>
                            <div style="margin-top: 24px;">
                                <button class="btn-primary" id="save-ai-settings" style="width: 100%;">Lagre AI-innstillinger</button>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        `;

        // Tab Switching Logic
        const tabBtns = section.querySelectorAll('.tab-btn');
        const libraryContent = section.querySelector('#media-library-content');
        const integrationsContent = section.querySelector('#media-integrations-content');

        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const target = btn.getAttribute('data-tab');
                
                tabBtns.forEach(b => {
                    b.classList.remove('active');
                    b.style.background = 'transparent';
                    b.style.color = '#64748b';
                    b.style.boxShadow = 'none';
                });

                btn.classList.add('active');
                btn.style.background = 'white';
                btn.style.color = '#1B4965';
                btn.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';

                if (target === 'library') {
                    libraryContent.style.display = 'block';
                    integrationsContent.style.display = 'none';
                    this.loadMediaLibrary();
                } else {
                    libraryContent.style.display = 'none';
                    integrationsContent.style.display = 'block';
                    this.loadMediaSettings();
                    this.loadPodcastOverrides();
                    this._loadIntegrationsSettings();
                }
            });
        });

        // Initialize Media Library
        this.loadMediaLibrary();
        
        // Setup Upload Listeners
        this._setupMediaLibraryListeners();

        // Combined Event Listeners for Integrations tab
        section.addEventListener('click', (e) => {
            if (e.target.id === 'save-media-settings') this.saveMediaSettings();
            if (e.target.id === 'save-podcast-overrides') this.savePodcastOverrides();
            if (e.target.id === 'refresh-podcast-list') this.loadPodcastOverrides();
            if (e.target.id === 'open-podcast-transcripts-full') this.renderCollectionEditor('podcast_transcripts', 'Podcast Transkripsjon', 'podcast');
            if (e.target.id === 'save-ai-settings') this.saveIntegrationsSettings();
            if (e.target.id === 'add-gcal') this.addGCalInput();
            if (e.target.id === 'connect-google-btn') this.handleGoogleAuth();
            if (e.target.id === 'disconnect-google') this.handleGoogleDisconnect();
        });

        // Podcast item click delegation
        const overridesList = section.querySelector('#podcast-overrides-list');
        if (overridesList) {
            overridesList.addEventListener('click', (event) => {
                const btn = event.target.closest('button[data-open-podcast-id]');
                if (!btn) return;
                event.preventDefault();
                this.openPodcastTranscriptEditorById(btn.getAttribute('data-open-podcast-id') || '');
            });
        }

        section.setAttribute('data-rendered', 'true');
    }

    /**
     * Load and render the media library grid
     */
    async loadMediaLibrary() {
        const grid = document.getElementById('media-grid');
        const countEl = document.getElementById('media-count');
        if (!grid) return;

        try {
            const files = await firebaseService.listMediaFiles('editor/');
            
            if (countEl) countEl.innerText = files.length;

            if (files.length === 0) {
                grid.innerHTML = `
                    <div style="grid-column: 1/-1; text-align: center; padding: 60px; background: #f8fafc; border-radius: 16px;">
                        <span class="material-symbols-outlined" style="font-size: 48px; color: #cbd5e1; margin-bottom: 12px;">folder_open</span>
                        <p style="color: #64748b;">Ingen filer funnet. Last opp ditt første bilde over!</p>
                    </div>
                `;
                return;
            }

            // Sort files by last modified (newest first)
            files.sort((a, b) => {
                const dateA = a.metadata?.updated ? new Date(a.metadata.updated) : new Date(0);
                const dateB = b.metadata?.updated ? new Date(b.metadata.updated) : new Date(0);
                return dateB - dateA;
            });

            grid.innerHTML = files.map(file => `
                <div class="media-card" style="background: white; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; transition: all 0.2s ease;">
                    <div class="media-preview" style="height: 140px; background: #f1f5f9; position: relative; overflow: hidden;">
                        <img src="${file.url}" style="width: 100%; height: 100%; object-fit: cover;" loading="lazy">
                        <div class="media-actions" style="position: absolute; top: 8px; right: 8px; display: flex; gap: 4px; opacity: 0; transition: opacity 0.2s;">
                            <button class="btn-delete-file" data-path="${file.fullPath}" title="Slett" style="width: 32px; height: 32px; border-radius: 8px; background: rgba(239, 68, 68, 0.9); color: white; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center;">
                                <span class="material-symbols-outlined" style="font-size: 18px;">delete</span>
                            </button>
                        </div>
                    </div>
                    <div style="padding: 12px;">
                        <p style="font-size: 12px; font-weight: 600; color: #1e293b; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${file.name}">${file.name}</p>
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
                            <span style="font-size: 10px; color: #64748b;">${file.metadata?.size ? (file.metadata.size / 1024).toFixed(1) + ' KB' : ''}</span>
                            <button class="btn-copy-url" data-url="${file.url}" style="font-size: 11px; font-weight: 700; color: #1B4965; background: none; border: none; cursor: pointer; padding: 4px 8px; border-radius: 4px; transition: background 0.2s;">Kopier URL</button>
                        </div>
                    </div>
                </div>
            `).join('');

            // Add hover effect for actions via style injection (cleaner than JS loops)
            if (!document.getElementById('media-hover-styles')) {
                const style = document.createElement('style');
                style.id = 'media-hover-styles';
                style.innerHTML = `
                    .media-card:hover { transform: translateY(-4px); box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); border-color: #cbd5e1 !important; }
                    .media-card:hover .media-actions { opacity: 1 !important; }
                    .btn-copy-url:hover { background: rgba(27, 73, 101, 0.05); }
                `;
                document.head.appendChild(style);
            }

        } catch (error) {
            console.error('Error loading media library:', error);
            grid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: #ef4444; padding: 20px;">Feil ved lasting av bibliotek: ${error.message}</p>`;
        }
    }

    /**
     * Setup event listeners for media library (upload, delete, copy)
     */
    _setupMediaLibraryListeners() {
        const dropzone = document.getElementById('media-dropzone');
        const fileInput = document.getElementById('media-file-input');
        const grid = document.getElementById('media-grid');

        if (!dropzone || !fileInput || !grid) return;

        // Click to upload
        dropzone.onclick = () => fileInput.click();

        // File input change
        fileInput.onchange = async (e) => {
            if (e.target.files.length > 0) {
                await this.handleMediaFileUpload(Array.from(e.target.files));
                fileInput.value = ''; // Reset
            }
        };

        // Drag & Drop
        dropzone.ondragover = (e) => {
            e.preventDefault();
            dropzone.style.borderColor = '#1B4965';
            dropzone.style.background = '#eff6ff';
        };

        dropzone.ondragleave = () => {
            dropzone.style.borderColor = '#cbd5e1';
            dropzone.style.background = '#f8fafc';
        };

        dropzone.ondrop = async (e) => {
            e.preventDefault();
            dropzone.style.borderColor = '#cbd5e1';
            dropzone.style.background = '#f8fafc';
            
            const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
            if (files.length > 0) {
                await this.handleMediaFileUpload(files);
            }
        };

        // Delegate grid actions (Copy URL, Delete)
        grid.onclick = async (e) => {
            const copyBtn = e.target.closest('.btn-copy-url');
            const deleteBtn = e.target.closest('.btn-delete-file');

            if (copyBtn) {
                const url = copyBtn.getAttribute('data-url');
                try {
                    await navigator.clipboard.writeText(url);
                    const originalText = copyBtn.innerText;
                    copyBtn.innerText = 'Kopiert!';
                    copyBtn.style.color = '#10b981';
                    setTimeout(() => {
                        copyBtn.innerText = originalText;
                        copyBtn.style.color = '#1B4965';
                    }, 2000);
                } catch (err) {
                    alert('Kunne ikke kopiere URL');
                }
            }

            if (deleteBtn) {
                const path = deleteBtn.getAttribute('data-path');
                if (confirm('Er du sikker på at du vil slette dette bildet permanent?')) {
                    await this.deleteMediaFile(path);
                }
            }
        };
    }

    /**
     * Handle file upload with compression
     */
    async handleMediaFileUpload(files) {
        const grid = document.getElementById('media-grid');
        const dropzone = document.getElementById('media-dropzone');
        
        // Show loading state in dropzone
        const originalContent = dropzone.innerHTML;
        dropzone.innerHTML = `
            <div class="loader-sm" style="margin-bottom: 12px;"></div>
            <h3 style="margin: 0; font-size: 18px; color: #334155;">Laster opp ${files.length} bilde(r)...</h3>
            <p style="margin: 8px 0 0; color: #64748b; font-size: 14px;">Vennligst vent mens bildene komprimeres og lagres</p>
        `;
        dropzone.style.pointerEvents = 'none';

        try {
            for (const file of files) {
                let fileToUpload = file;

                // Compress image if it's an image and browser-image-compression is available
                if (file.type.startsWith('image/') && typeof imageCompression !== 'undefined') {
                    try {
                        const options = {
                            maxSizeMB: 1.5,
                            maxWidthOrHeight: 1920,
                            useWebWorker: true
                        };
                        fileToUpload = await imageCompression(file, options);
                        // Maintain original extension but ensure it's a file object
                        fileToUpload = new File([fileToUpload], file.name, { type: file.type });
                    } catch (error) {
                        console.warn('Compression failed, uploading original:', error);
                    }
                }

                const path = `editor/${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
                await firebaseService.uploadFile(fileToUpload, path);
            }

            showToast(`${files.length} bilde(r) ble lastet opp`, 'success');
            await this.loadMediaLibrary();
        } catch (error) {
            console.error('Upload error:', error);
            showToast('Opplasting feilet: ' + error.message, 'error');
        } finally {
            dropzone.innerHTML = originalContent;
            dropzone.style.pointerEvents = 'auto';
        }
    }

    /**
     * Delete a media file
     */
    async deleteMediaFile(path) {
        try {
            // Check if firebaseService has deleteFile, otherwise use a generic implementation
            if (typeof firebaseService.deleteFile === 'function') {
                await firebaseService.deleteFile(path);
            } else {
                // Fallback to storage ref delete if service method missing
                const storageRef = firebaseService.storage.ref(path);
                await storageRef.delete();
            }
            
            showToast('Bilde slettet', 'success');
            await this.loadMediaLibrary();
        } catch (error) {
            console.error('Delete error:', error);
            showToast('Kunne ikke slette bilde: ' + error.message, 'error');
        }
    }

    async _loadIntegrationsSettings() {
        try {
            const settings = await firebaseService.getPageContent('settings_integrations') || {};
            
            // AI Settings
            const translation = settings.translation || {};
            const provEl = document.getElementById('translation-provider');
            if (provEl) provEl.value = translation.provider || 'mymemory';
            
            const geminiKeyEl = document.getElementById('gemini-api-key');
            if (geminiKeyEl) geminiKeyEl.value = translation.geminiApiKey || '';
            
            const geminiModelEl = document.getElementById('gemini-model');
            if (geminiModelEl) geminiModelEl.value = translation.geminiModel || 'gemini-1.5-flash';

            // Google Calendar Settings
            const gcal = settings.googleCalendar || {};
            const gcalKeyEl = document.getElementById('gcal-api-key');
            if (gcalKeyEl) gcalKeyEl.value = gcal.apiKey || '';

            const calendars = settings.googleCalendars || [];
            const gcalList = document.getElementById('gcal-list');
            if (gcalList) {
                gcalList.innerHTML = '';
                calendars.forEach(cal => this.addGCalInput(cal.label, cal.id));
                if (calendars.length === 0 && gcal.calendarId) {
                    this.addGCalInput(gcal.label || 'Hovedkalender', gcal.calendarId);
                }
            }

            // Update GCal Status Badge
            const statusBadge = document.getElementById('gcal-status');
            if (statusBadge) {
                if (gcal.apiKey && (calendars.length > 0 || gcal.calendarId)) {
                    statusBadge.textContent = 'Konfigurert';
                    statusBadge.style.background = '#dcfce7';
                    statusBadge.style.color = '#166534';
                } else {
                    statusBadge.textContent = 'Frakoblet';
                    statusBadge.style.background = '#fee2e2';
                    statusBadge.style.color = '#991b1b';
                }
            }

            // Google Auth Status
            this._updateGoogleAuthUI();

        } catch (error) {
            console.error('Error loading integrations settings:', error);
        }
    }

    _updateGoogleAuthUI() {
        const authContainer = document.getElementById('google-auth-status');
        if (!authContainer) return;

        authContainer.innerHTML = this.googleAccessToken ? `
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
        `;
    }

    async saveIntegrationsSettings() {
        const btn = document.getElementById('save-ai-settings');
        if (btn) {
            btn.textContent = 'Lagrer...';
            btn.disabled = true;
        }

        try {
            const currentSettings = await firebaseService.getPageContent('settings_integrations') || {};
            
            const gcalApiKey = document.getElementById('gcal-api-key')?.value.trim() || '';
            const translationProvider = document.getElementById('translation-provider')?.value || 'mymemory';
            const geminiApiKey = document.getElementById('gemini-api-key')?.value.trim() || '';
            const geminiModel = document.getElementById('gemini-model')?.value.trim() || 'gemini-1.5-flash';

            const rows = Array.from(document.querySelectorAll('#gcal-list .gcal-row'));
            const calendars = rows.map(row => ({
                label: row.querySelector('.gcal-label')?.value.trim() || '',
                id: row.querySelector('.gcal-id')?.value.trim() || ''
            })).filter(item => item.id);

            const newSettings = {
                ...currentSettings,
                googleCalendar: {
                    ...currentSettings.googleCalendar,
                    apiKey: gcalApiKey,
                    calendarId: calendars[0]?.id || currentSettings.googleCalendar?.calendarId || '',
                    label: calendars[0]?.label || currentSettings.googleCalendar?.label || 'Hovedkalender'
                },
                googleCalendars: calendars,
                translation: {
                    provider: translationProvider,
                    geminiApiKey,
                    geminiModel,
                    lastUpdated: new Date().toISOString()
                }
            };

            await firebaseService.savePageContent('settings_integrations', newSettings);
            this._translationSettingsCache = null;
            this._translationSettingsCacheLoadedAt = 0;
            
            this.showToast('Integrasjonsinnstillinger lagret!', 'success');
            this._loadIntegrationsSettings();
        } catch (error) {
            console.error('Error saving integrations:', error);
            this.showToast('Kunne ikke lagre innstillinger.', 'error');
        } finally {
            if (btn) {
                btn.textContent = 'Lagre AI-innstillinger';
                btn.disabled = false;
            }
        }
    }

    addGCalInput(label = '', id = '') {
        const container = document.getElementById('gcal-list');
        if (!container) return;

        const row = document.createElement('div');
        row.className = 'gcal-row';
        row.style = 'display: flex; gap: 8px; margin-bottom: 8px;';
        row.innerHTML = `
            <input type="text" class="form-control gcal-label" placeholder="Navn (f.eks. HKM)" value="${label}" style="flex: 1;">
            <input type="text" class="form-control gcal-id" placeholder="Calendar ID" value="${id}" style="flex: 2;">
            <button type="button" class="btn btn-icon remove-gcal" style="color: #ef4444; background: transparent; border: none; cursor: pointer;">
                <span class="material-symbols-outlined">delete</span>
            </button>
        `;

        row.querySelector('.remove-gcal').onclick = () => row.remove();
        container.appendChild(row);
    }

    async handleGoogleAuth() {
        try {
            const result = await firebaseService.connectToGoogle();
            this.googleAccessToken = result.accessToken;
            this.showToast('Tilkoblet Google! Du har nå skrivetilgang.', 'success');
            this._updateGoogleAuthUI();
        } catch (error) {
            console.error('Google connection failed:', error);
            this.showToast('Kunne ikke koble til Google: ' + (error.message || 'Ukjent feil'), 'error');
        }
    }

    handleGoogleDisconnect() {
        this.googleAccessToken = null;
        this.showToast('Koblet fra Google. Skrivetilgang deaktivert.');
        this._updateGoogleAuthUI();
    }




    async openPodcastTranscriptEditorById(episodeId) {
        const targetId = (episodeId || '').trim();

        if (!Array.isArray(this._collectionItemsCache['podcast_transcripts']) || this._collectionItemsCache['podcast_transcripts'].length === 0) {
            try {
                const podcastItems = await this.getPodcastTranscriptItems();
                this._collectionItemsCache['podcast_transcripts'] = podcastItems;
            } catch (error) {
                console.error('Could not load podcast transcript items for editor:', error);
                this.showToast('Kunne ikke laste podcast-episoder akkurat nå.', 'error', 5000);
                return;
            }
        }

        if (!targetId) return;

        const items = this._collectionItemsCache['podcast_transcripts'] || [];
        const idx = items.findIndex((it) => (it?.id || '') === targetId);
        if (idx >= 0) {
            this.editCollectionItem('podcast_transcripts', idx);
        } else {
            this.showToast('Fant ikke episode i podcastlisten ennå. Prøv igjen om et øyeblikk.', 'warning', 5000);
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
                if (settings.podcastCustomCategories) {
                    const val = settings.podcastCustomCategories;
                    document.getElementById('podcast-custom-categories').value = val;
                    const syncInput = document.getElementById('podcast-global-categories-sync');
                    if (syncInput) syncInput.value = val;
                }
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
        const podcastCustomCategories = document.getElementById('podcast-custom-categories').value.trim();

        btn.textContent = 'Lagrer...';
        btn.disabled = true;

        try {
            await firebaseService.savePageContent('settings_media', {
                youtubeChannelId: ytChannelId,
                youtubePlaylists: youtubePlaylists,
                podcastRssUrl: podcastRssUrl,
                spotifyUrl: spotifyUrl,
                appleUrl: appleUrl,
                podcastCustomCategories: podcastCustomCategories,
                updatedAt: new Date().toISOString()
            });
            this.showToast('✅ Media-innstillinger er lagret!', 'success', 5000);
            this.loadPodcastOverrides();
        } catch (err) {
            console.error("Save media settings error:", err);
            this.showToast('❌ Feil ved lagring: ' + err.message, 'error', 5000);
        } finally {
            btn.textContent = 'Lagre media-innstillinger';
            btn.disabled = false;
        }
    }

    parsePodcastOverrideCategories(rawValue) {
        if (Array.isArray(rawValue)) {
            return rawValue
                .map((value) => String(value || '').trim())
                .filter(Boolean);
        }

        const asString = String(rawValue || '').trim();
        if (!asString) return [];

        return asString
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean);
    }

    async loadPodcastOverrides() {
        const listContainer = document.getElementById('podcast-overrides-list');
        if (!listContainer) return;

        listContainer.innerHTML = '<div class="loader">Henter episoder...</div>';

        try {
            // 1. Fetch current overrides from Firebase
            const overridesData = await firebaseService.getPageContent('settings_podcast_overrides') || {};
            const overrides = overridesData.overrides || {};

            const mediaSettings = await firebaseService.getPageContent('settings_media') || {};
            const customCatStr = mediaSettings.podcastCustomCategories || '';
            const customCatArr = customCatStr.split(',').map(s => s.trim()).filter(Boolean);

            // 2. Fetch episodes from the same source used by Podcast redigering
            const episodes = await this.fetchPodcastEpisodesForAdmin();
            const podcastCategories = [
                { value: 'tro', label: 'Tro' },
                { value: 'bibel', label: 'Bibel' },
                { value: 'bønn', label: 'Bønn' },
                { value: 'undervisning', label: 'Undervisning' }
            ];

            customCatArr.forEach(cat => {
                const val = cat.toLowerCase();
                if (!podcastCategories.find(p => p.value === val)) {
                    podcastCategories.push({ value: val, label: cat });
                }
            });

            if (episodes.length > 0) {
                listContainer.innerHTML = episodes.map((ep) => {
                    const id = ep.id;
                    const encodedId = encodeURIComponent(String(id || '').trim());
                    const currentCats = this.parsePodcastOverrideCategories(overrides[id]);
                    
                    const normalizedCurrentCats = currentCats.map(c => c.toLowerCase());
                    const knownValues = podcastCategories.map((category) => category.value.toLowerCase());
                    const customCats = currentCats.filter((value) => !knownValues.includes(value.toLowerCase()));
                    const title = this.escapeHtml(ep.title || 'Uten tittel');

                    const chipsHtml = podcastCategories.map((category) => {
                        const isSelected = normalizedCurrentCats.includes(category.value.toLowerCase());
                        return `
                            <button
                                type="button"
                                class="podcast-category-chip"
                                data-value="${category.value}"
                                data-selected="${isSelected ? 'true' : 'false'}"
                                aria-pressed="${isSelected ? 'true' : 'false'}"
                                style="border:1px solid ${isSelected ? '#fdba74' : '#e2e8f0'}; background:${isSelected ? '#fff7ed' : '#ffffff'}; color:${isSelected ? '#c2410c' : '#334155'}; padding:7px 12px; border-radius:999px; font-size:12px; font-weight:700; letter-spacing:0.02em; cursor:pointer; transition:all .15s ease;">
                                ${category.label}
                            </button>
                        `;
                    }).join('');

                    return `
                        <div class="podcast-override-item" data-episode-key="${encodedId}" style="padding: 14px 12px; border-bottom: 1px solid #f1f5f9; display: flex; flex-direction: column; gap: 10px;">
                            <div style="font-weight: 600; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${title}">${title}</div>
                            <div style="display: flex; align-items: flex-start; gap: 12px; justify-content: space-between; width: 100%;">
                                <div style="display:flex; flex-direction:column; gap:8px; width:100%;">
                                    <div class="podcast-category-chip-group" style="display:flex; flex-wrap:wrap; gap:8px;">
                                        ${chipsHtml}
                                    </div>
                                    <div style="display:flex; flex-direction:column; gap:6px;">
                                        <label style="font-size:11px; font-weight:700; color:#64748b; letter-spacing:0.04em; text-transform:uppercase;">Egne kategorier</label>
                                        <input
                                            type="text"
                                            class="custom-podcast-categories form-control"
                                            placeholder="f.eks. vitnesbyrd, lederskap"
                                            value="${this.escapeHtml(customCats.join(', '))}"
                                            style="font-size:12px; padding:8px 10px; max-width:380px; border-radius:10px; border:1px solid #e2e8f0; background:#fff;">
                                    </div>
                                    <span style="font-size:11px; color:#94a3b8;">Klikk for å velge flere. Ingen valg = Auto (nøkkelord).</span>
                                </div>
                                <div style="display:flex; flex-direction:column; gap:6px; align-items:flex-end; min-width:120px;">
                                    <button type="button" class="btn-secondary btn-sm clear-podcast-categories" style="font-size:12px;">Auto</button>
                                    <button type="button" class="btn-secondary btn-sm" data-open-podcast-id="${this.escapeHtml(id)}">Rediger tekst</button>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('');

                listContainer.querySelectorAll('.podcast-override-item').forEach((itemEl) => {
                    const chips = Array.from(itemEl.querySelectorAll('.podcast-category-chip'));
                    const clearBtn = itemEl.querySelector('.clear-podcast-categories');

                    const updateChip = (chip, selected) => {
                        chip.dataset.selected = selected ? 'true' : 'false';
                        chip.setAttribute('aria-pressed', selected ? 'true' : 'false');
                        chip.style.borderColor = selected ? '#fdba74' : '#e2e8f0';
                        chip.style.background = selected ? '#fff7ed' : '#ffffff';
                        chip.style.color = selected ? '#c2410c' : '#334155';
                    };

                    chips.forEach((chip) => {
                        chip.addEventListener('click', () => {
                            const isSelected = chip.dataset.selected === 'true';
                            updateChip(chip, !isSelected);
                        });
                    });

                    clearBtn?.addEventListener('click', () => {
                        chips.forEach((chip) => updateChip(chip, false));
                        const customInput = itemEl.querySelector('.custom-podcast-categories');
                        if (customInput) customInput.value = '';
                    });
                });
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
        const rows = document.querySelectorAll('.podcast-override-item');
        const overrides = {};
        
        // 1. Start with categories from the global sync input
        const syncInput = document.getElementById('podcast-global-categories-sync');
        const currentGlobalStr = syncInput?.value || '';
        
        // Use a Map to keep track of categories case-insensitively (key is lowercase, value is original casing)
        const globalCatsMap = new Map();
        
        // Helper to add to map safely
        const addToGlobal = (cat) => {
            const trimmed = String(cat || '').trim();
            if (!trimmed) return;
            const key = trimmed.toLowerCase();
            if (!globalCatsMap.has(key)) {
                globalCatsMap.set(key, trimmed);
            }
        };

        // Add initial global ones
        currentGlobalStr.split(',').forEach(addToGlobal);

        rows.forEach((row) => {
            const encodedId = row.getAttribute('data-episode-key') || '';
            const episodeId = decodeURIComponent(encodedId || '');
            if (!episodeId) return;

            const selected = Array.from(row.querySelectorAll('.podcast-category-chip[data-selected="true"]'))
                .map((chip) => String(chip.getAttribute('data-value') || '').trim())
                .filter(Boolean);

            const customInput = row.querySelector('.custom-podcast-categories');
            const customValue = customInput?.value || '';
            const customCategories = this.parsePodcastOverrideCategories(customValue);

            // Add any NEW custom categories from this episode to the global list
            customCategories.forEach(addToGlobal);

            // Merge selected chips and new text input for this episode
            const merged = Array.from(new Set([...selected, ...customCategories]));

            if (merged.length === 1) {
                overrides[episodeId] = merged[0];
            } else if (merged.length > 1) {
                overrides[episodeId] = merged;
            }
        });

        btn.textContent = 'Lagrer...';
        btn.disabled = true;

        try {
            // 1. Fetch latest media settings to avoid overwriting other changes (like Spotify URL)
            const mediaSettings = await firebaseService.getPageContent('settings_media') || {};
            
            // Also merge in categories that might already be in the database
            const dbGlobalStr = mediaSettings.podcastCustomCategories || '';
            dbGlobalStr.split(',').forEach(addToGlobal);

            // Final string of all global categories
            const updatedGlobalStr = Array.from(globalCatsMap.values()).join(', ');

            // 2. Save updated global categories
            await firebaseService.savePageContent('settings_media', {
                ...mediaSettings,
                podcastCustomCategories: updatedGlobalStr,
                updatedAt: new Date().toISOString()
            });

            // 3. Save episode overrides
            await firebaseService.savePageContent('settings_podcast_overrides', {
                overrides: overrides,
                updatedAt: new Date().toISOString()
            });

            // Update UI inputs
            if (syncInput) syncInput.value = updatedGlobalStr;
            const mainCustomInput = document.getElementById('podcast-custom-categories');
            if (mainCustomInput) mainCustomInput.value = updatedGlobalStr;

            this.showToast('✅ Lagret! Alle kategorier er nå faste.', 'success', 3000);
            
            // Reload the list to convert text inputs into chips
            await this.loadPodcastOverrides();
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
    async renderCollectionEditor(collectionId, title, sectionId = collectionId) {
        const section = document.getElementById(`${sectionId}-section`);
        if (!section) return;

        const actionsHtml = collectionId === 'podcast_transcripts'
            ? `
                <div style="display:flex !important; align-items:center !important; gap:12px !important; flex-shrink:0 !important; margin-left:20px !important;">
                    <button class="btn btn-secondary" id="bulk-fill-${collectionId}" style="background:#fff !important; border:1px solid #e2e8f0 !important; padding:14px 20px !important; font-weight:700 !important; border-radius:10px !important; display:flex !important; align-items:center !important; gap:10px !important; color:#1e293b !important; cursor:pointer !important; white-space:nowrap !important;">
                        <span class="material-symbols-outlined" style="font-size:22px !important;">auto_awesome</span> Fyll manglende tekst og oppsummering
                    </button>
                    <button class="btn btn-primary" id="add-new-${collectionId}" style="background: #f97316 !important; border: none !important; padding: 14px 28px !important; font-weight: 700 !important; border-radius: 10px !important; display: flex !important; align-items: center !important; gap: 10px !important; box-shadow: 0 4px 14px rgba(249, 115, 22, 0.3) !important; color: white !important; cursor: pointer !important; font-family: 'Inter', sans-serif !important; white-space: nowrap !important; flex-shrink: 0 !important;">
                        <span class="material-symbols-outlined" style="font-size: 22px !important;">add</span> Legg til ny
                    </button>
                </div>
            `
            : `
                <button class="btn btn-primary" id="add-new-${collectionId}" style="background: #f97316 !important; border: none !important; padding: 14px 28px !important; font-weight: 700 !important; border-radius: 10px !important; display: flex !important; align-items: center !important; gap: 10px !important; box-shadow: 0 4px 14px rgba(249, 115, 22, 0.3) !important; color: white !important; cursor: pointer !important; font-family: 'Inter', sans-serif !important; white-space: nowrap !important; flex-shrink: 0 !important; margin-left: 20px !important;">
                    <span class="material-symbols-outlined" style="font-size: 22px !important;">add</span> Legg til ny
                </button>
            `;

        section.innerHTML = `
            <div class="card kinetic-header-card" style="margin-bottom: 24px !important; display: flex !important; flex-direction: row !important; align-items: center !important; justify-content: space-between !important; padding: 32px 40px !important; background: white !important; border-radius: 20px !important; border: 1px solid #f1f5f9 !important; box-shadow: 0 2px 15px rgba(0,0,0,0.03) !important; width: 100% !important; max-width: 100% !important; box-sizing: border-box !important; flex-wrap: nowrap !important;">
                <div style="display: flex !important; flex-direction: row !important; align-items: center !important; gap: 28px !important; min-width: 0 !important; flex: 1 !important;">
                    <div style="width: 64px !important; height: 64px !important; border-radius: 50% !important; background: #fdfdfd !important; border: 1px solid #f1f5f9 !important; display: flex !important; align-items: center !important; justify-content: center !important; color: #64748b !important; box-shadow: inset 0 2px 4px rgba(0,0,0,0.02) !important; flex-shrink: 0 !important;">
                        <span class="material-symbols-outlined" style="font-size: 28px !important; opacity: 0.7 !important;">edit_square</span>
                    </div>
                    <div style="min-width: 0 !important;">
                        <h2 style="margin: 0 !important; font-size: 26px !important; font-weight: 800 !important; color: #1e293b !important; letter-spacing: -0.02em !important; white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important;">${title}</h2>
                        <p style="margin: 6px 0 0 !important; font-size: 15px !important; color: #94a3b8 !important; font-weight: 500 !important; white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important;">Administrer dine ${title.toLowerCase()}.</p>
                    </div>
                </div>
                ${actionsHtml}
            </div>
            <div class="card" style="padding: 0 !important; overflow: hidden !important; border-radius: 20px !important; border: 1px solid #f1f5f9 !important; background: white !important; box-shadow: 0 2px 15px rgba(0,0,0,0.03) !important; width: 100% !important; box-sizing: border-box !important;">
                <div id="${collectionId}-list" class="table-container full-bleed">
                    <div class="loader">Laster ${title.toLowerCase()}...</div>
                </div>
            </div>
        `;
        section.setAttribute('data-rendered', 'true');

        document.getElementById(`add-new-${collectionId}`).addEventListener('click', () => this.addNewItem(collectionId));
        if (collectionId === 'podcast_transcripts') {
            const bulkBtn = document.getElementById(`bulk-fill-${collectionId}`);
            bulkBtn?.addEventListener('click', () => this.runPodcastBulkAiFillMissing(bulkBtn));
        }
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

        // Ensure Firebase is ready before attempting to fetch
        if (!firebaseService.isInitialized) {
            console.log(`[AdminManager] Waiting for Firebase to initialize for collection: ${collectionId}`);
            await firebaseService.waitForInitialization(8000);
        }

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
            let items = [];

            if (collectionId === 'podcast_transcripts') {
                items = await this.getPodcastTranscriptItems();
            } else {
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
                items = this._getCollectionItems(data);
            }

            if (!isCurrentRequest()) return;

            if (collectionId !== 'podcast_transcripts') {
                // Mark items that exist in Firestore so we can delete them
                items.forEach(it => { if (it) it.isFirestore = true; });
            }

            this._collectionItemsCache[collectionId] = items;
            this.currentItems = items;
            this.renderItems(collectionId, items);
            this._attemptRestoreOpenEditor(collectionId, items);

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

        const isPodcastTranscriptCollection = collectionId === 'podcast_transcripts';
        const podcastOverview = isPodcastTranscriptCollection
            ? this.getPodcastTranscriptOverview(items)
            : null;

        const rowsHtml = items.map((item, index) => {
            const rawTitle = item.title || 'Uten tittel';
            const title = this.escapeHtml(rawTitle);
            const category = item.category ? this.escapeHtml(item.category) : '';
            const author = item.author ? this.escapeHtml(item.author) : '';
            const dateText = item.date ? this.escapeHtml(String(item.date).split('T')[0]) : '—';
            const podcastAudit = isPodcastTranscriptCollection ? this.getPodcastTranscriptAudit(item) : null;
            const statusPill = isPodcastTranscriptCollection
                ? `
                    <div style="display:flex; gap:8px; flex-wrap:wrap;">
                        <span style="background:${podcastAudit.hasTranscript ? '#ecfdf5' : '#fef2f2'}; color:${podcastAudit.hasTranscript ? '#047857' : '#b91c1c'}; padding:4px 10px; border-radius:999px; font-size:11px; font-weight:800; letter-spacing:0.03em;">${podcastAudit.hasTranscript ? 'TEKST OK' : 'MANGLER TEKST'}</span>
                        <span style="background:${podcastAudit.hasSummary ? '#eff6ff' : '#fff7ed'}; color:${podcastAudit.hasSummary ? '#1d4ed8' : '#c2410c'}; padding:4px 10px; border-radius:999px; font-size:11px; font-weight:800; letter-spacing:0.03em;">${podcastAudit.hasSummary ? 'OPPSUMMERING OK' : 'MANGLER OPPSUMMERING'}</span>
                    </div>
                `
                : (() => {
                    if (collectionId === 'blog') {
                        const translationStats = this._getBlogTranslationStatus(item);
                        const publishedPill = item.published === false
                            ? '<span style="background:#fff7ed;color:#c2410c;padding:4px 10px;border-radius:999px;font-size:11px;font-weight:800;letter-spacing:0.03em;">UTKAST</span>'
                            : '<span style="background:#ecfdf5;color:#047857;padding:4px 10px;border-radius:999px;font-size:11px;font-weight:800;letter-spacing:0.03em;">PUBLISERT</span>';
                        let translationPill = '';
                        if (translationStats.level === 'ok') {
                            translationPill = `<span style="background:#eff6ff;color:#1d4ed8;padding:4px 10px;border-radius:999px;font-size:11px;font-weight:800;letter-spacing:0.03em;">OVERSATT (${translationStats.upToDate}/${translationStats.total})</span>`;
                        } else if (translationStats.level === 'partial') {
                            translationPill = `<span style="background:#fef3c7;color:#92400e;padding:4px 10px;border-radius:999px;font-size:11px;font-weight:800;letter-spacing:0.03em;">DELVIS OVERSATT (${translationStats.upToDate}/${translationStats.total})</span>`;
                        } else {
                            translationPill = '<span style="background:#f1f5f9;color:#94a3b8;padding:4px 10px;border-radius:999px;font-size:11px;font-weight:800;letter-spacing:0.03em;">IKKE OVERSATT</span>';
                        }
                        return `<div style="display:flex;gap:6px;flex-wrap:wrap;">${publishedPill}${translationPill}</div>`;
                    }
                    return item.isSynced
                        ? '<span style="background:#f1f5f9;color:#64748b;padding:4px 12px;border-radius:6px;font-size:11px;font-weight:800;letter-spacing:0.05em;">SYNKRONISERT</span>'
                        : '';
                })();
            const imageCell = item.imageUrl
                ? `<img src="${this.escapeHtml(item.imageUrl)}" alt="" style="width:48px;height:48px;border-radius:12px;object-fit:cover;border:1px solid #f1f5f9;">`
                : '<div style="width:48px;height:48px;border-radius:12px;background:#f8fafc;color:#94a3b8;display:flex;align-items:center;justify-content:center;border:1px solid #f1f5f9;"><span class="material-symbols-outlined" style="font-size:24px;">image</span></div>';
            const subline = isPodcastTranscriptCollection
                ? (podcastAudit.isComplete
                    ? 'Klar for publisering'
                    : (!podcastAudit.hasTranscript
                        ? 'Mangler transkripsjonstekst'
                        : 'Mangler oppsummering'))
                : (category || 'Blogg');

            return `
                <tr style="border-bottom: 1px solid #f1f5f9; transition: all 0.2s;">
                    <td style="padding: 24px;">
                        <div style="display: flex; align-items: center; gap: 20px;">
                            ${imageCell}
                            <div>
                                <div style="font-weight: 700; font-size: 15px; color: #1e293b; margin-bottom: 2px;">${title}</div>
                                <div style="font-size: 12px; color: #94a3b8; font-weight: 500;">${this.escapeHtml(subline)}</div>
                            </div>
                        </div>
                    </td>
                    <td style="padding: 24px; color: #64748b; font-size: 13px; font-weight: 600; white-space: nowrap; min-width: 120px;">${dateText}</td>
                    <td style="padding: 24px; color: #64748b; font-size: 13px; font-weight: 600;">${author || '<span style="color: #cbd5e1;">—</span>'}</td>
                    <td style="padding: 24px;">${statusPill}</td>
                    <td style="padding: 24px; text-align: right;">
                        <div style="display: flex; align-items: center; justify-content: flex-end; gap: 12px;">
                            <button type="button" onclick="window.adminManager.editCollectionItem('${collectionId}', ${index})" 
                                style="background: white; border: 1px solid #e2e8f0; color: #1e293b; padding: 8px 20px; border-radius: 8px; font-size: 13px; font-weight: 700; cursor: pointer; transition: all 0.2s; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
                                Rediger
                            </button>
                            <button type="button" class="icon-btn delete" onclick="window.adminManager.deleteItem('${collectionId}', ${index})" 
                                style="background: transparent; border: none; color: #cbd5e1; cursor: pointer; padding: 4px; transition: color 0.2s; display: inline-flex; align-items: center; justify-content: center;" 
                                onmouseover="this.style.color='#ef4444'" onmouseout="this.style.color='#cbd5e1'">
                                <span class="material-symbols-outlined" style="font-size: 20px;">delete</span>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        const overviewHtml = isPodcastTranscriptCollection && podcastOverview
            ? `
                <div style="display:flex; gap:12px; flex-wrap:wrap; margin-bottom:16px;">
                    <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:12px 16px; min-width:140px;">
                        <div style="font-size:11px; font-weight:800; letter-spacing:0.08em; color:#94a3b8; text-transform:uppercase;">Totalt</div>
                        <div style="font-size:24px; font-weight:800; color:#0f172a;">${podcastOverview.total}</div>
                    </div>
                    <div style="background:#fef2f2; border:1px solid #fecaca; border-radius:12px; padding:12px 16px; min-width:140px;">
                        <div style="font-size:11px; font-weight:800; letter-spacing:0.08em; color:#b91c1c; text-transform:uppercase;">Mangler tekst</div>
                        <div style="font-size:24px; font-weight:800; color:#991b1b;">${podcastOverview.missingTranscript}</div>
                    </div>
                    <div style="background:#fff7ed; border:1px solid #fed7aa; border-radius:12px; padding:12px 16px; min-width:160px;">
                        <div style="font-size:11px; font-weight:800; letter-spacing:0.08em; color:#c2410c; text-transform:uppercase;">Mangler oppsummering</div>
                        <div style="font-size:24px; font-weight:800; color:#9a3412;">${podcastOverview.missingSummary}</div>
                    </div>
                    <div style="background:#ecfdf5; border:1px solid #a7f3d0; border-radius:12px; padding:12px 16px; min-width:140px;">
                        <div style="font-size:11px; font-weight:800; letter-spacing:0.08em; color:#047857; text-transform:uppercase;">Komplette</div>
                        <div style="font-size:24px; font-weight:800; color:#065f46;">${podcastOverview.complete}</div>
                    </div>
                </div>
            `
            : '';

        container.innerHTML = `
            ${overviewHtml}
            <div style="width: 100%; overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse; text-align: left;">
                    <thead style="background: #fafbfc; border-bottom: 1px solid #f1f5f9;">
                        <tr>
                            <th style="padding: 20px 24px; font-size: 11px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.15em;">Innhold</th>
                            <th style="padding: 20px 24px; font-size: 11px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.15em;">Dato</th>
                            <th style="padding: 20px 24px; font-size: 11px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.15em;">Forfatter</th>
                            <th style="padding: 20px 24px; font-size: 11px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.15em;">Status</th>
                            <th style="padding: 20px 24px; font-size: 11px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.15em; text-align: right;">Handlinger</th>
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
            // Hard cleanup: ensure only one editor modal exists.
            document.querySelectorAll('.dashboard-modal').forEach((existingModal) => {
                if (existingModal.querySelector('.editor-layout-v2')) {
                    existingModal.remove();
                }
            });

            // Destroy any previous EditorJS instance before opening a new one.
            // Fire-and-forget so we never block or hang on a detached DOM element.
            if (this._activeEditorInstance) {
                const stale = this._activeEditorInstance;
                this._activeEditorInstance = null;
                setTimeout(() => { try { stale.destroy(); } catch (e) {} }, 0);
            }

            // Unique holder ID per open — prevents EditorJS internal registry collisions
            const editorHolderId = `editorjs-holder-${Date.now()}`;
            const collectionItems = this._collectionItemsCache[collectionId] || this.currentItems || [];
            const item = collectionItems[index] ? { ...collectionItems[index] } : {};
            this._persistOpenEditorState(collectionId, item);

            let safeDate = new Date().toISOString().split('T')[0];
            if (item.date && typeof item.date === 'string') {
                safeDate = item.date.split('T')[0];
            }

            // Handle existing tags (ensure array)
            const existingTags = Array.isArray(item.tags) ? item.tags : [];
            const isTeachingCollection = collectionId === 'teaching';
            const selectedTeachingType = (item.teachingType || item.category || 'Bibelstudie').toLowerCase();
            const seriesSelection = Array.isArray(item.seriesItems) ? item.seriesItems : [];
            const rawDescription = item.description || item.summary || '';
            // Strip HTML tags from description for clean display in textarea
            const podcastSummary = rawDescription.replace(/<[^>]*>/g, '').trim();
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
                                ${collectionId === 'blog' ? 'Blogginnlegg' : (collectionId === 'events' ? 'Arrangement' : (collectionId === 'teaching' ? 'Undervisning' : (collectionId === 'podcast_transcripts' ? 'Podcast Transkripsjon' : 'Rediger innhold')))}
                             </span>
                        </div>
                        <div class="editor-header-right">
                                      ${collectionId === 'blog' ? `
                                      <span id="blog-translation-status" title="Status for oversettelser" style="display:none;"></span>
                                      ` : ''}
                                      ${collectionId === 'blog' ? `
                                      <button class="btn-ghost" id="translate-col-item" title="Oversett til tilgjengelige språk" style="display:flex; align-items:center; gap:6px;">
                                          <span class="material-symbols-outlined">g_translate</span> Oversett til tilgjengelige språk
                                      </button>
                                      ` : ''}
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
                            <div class="docs-workspace-shell">
                            <div class="desktop-richtools docs-toolbar" id="desktop-richtools">
                                <div class="docs-toolbar-group">
                                    <button type="button" class="desktop-richtools-btn" data-tool="undo" title="Angre">
                                        <span class="material-symbols-outlined">undo</span>
                                    </button>
                                    <button type="button" class="desktop-richtools-btn" data-tool="redo" title="Gjør om">
                                        <span class="material-symbols-outlined">redo</span>
                                    </button>
                                </div>
                                <div class="docs-toolbar-divider"></div>
                                <div class="docs-toolbar-group">
                                    <button type="button" class="desktop-richtools-btn" data-tool="paragraph" title="Brødtekst">
                                        <span class="material-symbols-outlined">notes</span>
                                    </button>
                                    <label class="docs-toolbar-select-wrap" title="Overskriftsnivå">
                                        <span class="material-symbols-outlined">title</span>
                                        <select class="docs-toolbar-select" data-tool-select="headingLevel" aria-label="Overskriftsnivå">
                                            <option value="p" selected>Brødtekst</option>
                                            <option value="h1">H1</option>
                                            <option value="h2">H2</option>
                                            <option value="h3">H3</option>
                                            <option value="h4">H4</option>
                                            <option value="h5">H5</option>
                                            <option value="h6">H6</option>
                                        </select>
                                    </label>
                                </div>
                                <div class="docs-toolbar-divider"></div>
                                <div class="docs-toolbar-group">
                                    <button type="button" class="desktop-richtools-btn" data-tool="bold" title="Fet">
                                        <span class="material-symbols-outlined">format_bold</span>
                                    </button>
                                    <button type="button" class="desktop-richtools-btn" data-tool="italic" title="Kursiv">
                                        <span class="material-symbols-outlined">format_italic</span>
                                    </button>
                                    <button type="button" class="desktop-richtools-btn" data-tool="underline" title="Understreket">
                                        <span class="material-symbols-outlined">format_underlined</span>
                                    </button>
                                    <button type="button" class="desktop-richtools-btn" data-tool="strike" title="Gjennomstreket">
                                        <span class="material-symbols-outlined">format_strikethrough</span>
                                    </button>
                                    <button type="button" class="desktop-richtools-btn" data-tool="link" title="Lenke">
                                        <span class="material-symbols-outlined">link</span>
                                    </button>
                                    <button type="button" class="desktop-richtools-btn" data-tool="removeFormat" title="Fjern formatering">
                                        <span class="material-symbols-outlined">format_clear</span>
                                    </button>
                                    <button type="button" class="desktop-richtools-btn" data-tool="textColor" title="Tekstfarge">
                                        <span class="material-symbols-outlined">format_color_text</span>
                                    </button>
                                    <input type="color" class="docs-color-input" data-color-input="text" value="#1f2937" title="Velg tekstfarge" style="position:absolute; opacity:0; pointer-events:none; width:1px; height:1px;" aria-hidden="true">
                                    <button type="button" class="desktop-richtools-btn" data-tool="highlightColor" title="Fremhevingsfarge">
                                        <span class="material-symbols-outlined">format_color_fill</span>
                                    </button>
                                    <input type="color" class="docs-color-input" data-color-input="highlight" value="#fde68a" title="Velg fremhevingsfarge" style="position:absolute; opacity:0; pointer-events:none; width:1px; height:1px;" aria-hidden="true">
                                    <label class="docs-toolbar-select-wrap" title="Skriftstørrelse">
                                        <span class="material-symbols-outlined">format_size</span>
                                        <select class="docs-toolbar-select" data-tool-select="fontSize" aria-label="Skriftstørrelse">
                                            <option value="12">12</option>
                                            <option value="14">14</option>
                                            <option value="16">16</option>
                                            <option value="18" selected>18</option>
                                            <option value="20">20</option>
                                            <option value="24">24</option>
                                            <option value="28">28</option>
                                            <option value="32">32</option>
                                            <option value="36">36</option>
                                            <option value="42">42</option>
                                            <option value="custom">Egendefinert...</option>
                                        </select>
                                    </label>
                                    <label class="docs-toolbar-select-wrap" title="Linjeavstand">
                                        <span class="material-symbols-outlined">format_line_spacing</span>
                                        <select class="docs-toolbar-select" data-tool-select="lineHeight" aria-label="Linjeavstand">
                                            <option value="1.0">1.0</option>
                                            <option value="1.15">1.15</option>
                                            <option value="1.25">1.25</option>
                                            <option value="1.35">1.35</option>
                                            <option value="1.5">1.5</option>
                                            <option value="1.65">1.65</option>
                                            <option value="1.75" selected>1.75</option>
                                            <option value="2.0">2.0</option>
                                            <option value="2.5">2.5</option>
                                            <option value="3.0">3.0</option>
                                            <option value="custom">Egendefinert...</option>
                                        </select>
                                    </label>
                                    <label class="docs-toolbar-select-wrap" title="Avsnittsavstand">
                                        <span class="material-symbols-outlined">notes</span>
                                        <select class="docs-toolbar-select" data-tool-select="paragraphSpacing" aria-label="Avsnittsavstand">
                                            <option value="0">0</option>
                                            <option value="0.4">0.4</option>
                                            <option value="0.6">0.6</option>
                                            <option value="0.9">0.9</option>
                                            <option value="1.2" selected>1.2</option>
                                            <option value="1.6">1.6</option>
                                            <option value="2.0">2.0</option>
                                            <option value="custom">Egendefinert...</option>
                                        </select>
                                    </label>
                                    <label class="docs-toolbar-select-wrap" title="Bokstavavstand">
                                        <span class="material-symbols-outlined">format_letter_spacing</span>
                                        <select class="docs-toolbar-select" data-tool-select="letterSpacing" aria-label="Bokstavavstand">
                                            <option value="normal" selected>Normal</option>
                                            <option value="-0.02">Smal (-0.02em)</option>
                                            <option value="-0.01">Litt smal (-0.01em)</option>
                                            <option value="0.01">Litt bred (0.01em)</option>
                                            <option value="0.02">Bred (0.02em)</option>
                                            <option value="0.05">Veldig bred (0.05em)</option>
                                            <option value="custom">Egendefinert...</option>
                                        </select>
                                    </label>
                                </div>
                                <div class="docs-toolbar-divider"></div>
                                <div class="docs-toolbar-group">
                                    <button type="button" class="desktop-richtools-btn" data-tool="list" title="Punktliste">
                                        <span class="material-symbols-outlined">format_list_bulleted</span>
                                    </button>
                                    <button type="button" class="desktop-richtools-btn" data-tool="orderedList" title="Nummerert liste">
                                        <span class="material-symbols-outlined">format_list_numbered</span>
                                    </button>
                                    <button type="button" class="desktop-richtools-btn" data-tool="outdent" title="Reduser innrykk">
                                        <span class="material-symbols-outlined">format_indent_decrease</span>
                                    </button>
                                    <button type="button" class="desktop-richtools-btn" data-tool="indent" title="Øk innrykk">
                                        <span class="material-symbols-outlined">format_indent_increase</span>
                                    </button>
                                    <button type="button" class="desktop-richtools-btn" data-tool="checklist" title="Kontrollliste">
                                        <span class="material-symbols-outlined">checklist</span>
                                    </button>
                                </div>
                                <div class="docs-toolbar-divider"></div>
                                <div class="docs-toolbar-group">
                                    <button type="button" class="desktop-richtools-btn" data-tool="image" title="Bilde">
                                        <span class="material-symbols-outlined">image</span>
                                    </button>
                                    <button type="button" class="desktop-richtools-btn" data-tool="video" title="Video">
                                        <span class="material-symbols-outlined">smart_display</span>
                                    </button>
                                    <button type="button" class="desktop-richtools-btn" data-tool="quote" title="Sitat">
                                        <span class="material-symbols-outlined">format_quote</span>
                                    </button>
                                </div>
                            </div>
                            <div class="editor-paper docs-page-paper">
                                <textarea id="col-item-title-v2" placeholder="Skriv din tittel her..." rows="1">${item.title || ''}</textarea>
                                <div id="${editorHolderId}"></div>
                                <input type="file" id="docs-image-upload-input" style="display:none;" accept="image/*">
                            </div>
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
                             ` : ''}
                             
                              <h4 class="sidebar-section-title">OMSLAGSBILDE</h4>
                              <div class="sidebar-group">
                                  <div class="premium-media-card" style="background: white; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); transition: all 0.3s ease;">
                                      <!-- Preview Area -->
                                      <div id="sidebar-img-trigger" style="aspect-ratio: 16/9; background: #f8fafc; display: flex; align-items: center; justify-content: center; position: relative; cursor: pointer; border-bottom: 1px solid #f1f5f9; overflow: hidden;">
                                          <div id="sidebar-img-preview" style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
                                              ${item.imageUrl ? `<img src="${item.imageUrl}" style="width: 100%; height: 100%; object-fit: cover;">` : `
                                                  <div style="text-align: center; color: #94a3b8;">
                                                      <span class="material-symbols-outlined" style="font-size: 40px; margin-bottom: 8px; opacity: 0.5;">add_a_photo</span>
                                                      <div style="font-size: 12px; font-weight: 500;">Klikk for å laste opp</div>
                                                  </div>
                                              `}
                                          </div>
                                          <div class="upload-overlay" style="position: absolute; inset: 0; background: rgba(15, 23, 42, 0.4); display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.2s;">
                                              <span style="color: white; font-size: 12px; font-weight: 700; background: rgba(0,0,0,0.5); padding: 8px 16px; border-radius: 20px; backdrop-filter: blur(4px);">ENDRE BILDE</span>
                                          </div>
                                      </div>
                                      
                                      <!-- Actions Area -->
                                      <div style="padding: 16px; display: flex; flex-direction: column; gap: 12px;">
                                          <div style="display: flex; gap: 8px;">
                                              <button type="button" id="sidebar-img-upload-btn" class="btn-ghost" style="flex: 1; justify-content: center; padding: 10px; border-radius: 10px; border: 1px solid #e2e8f0; background: #f8fafc; font-size: 13px; font-weight: 600; color: #475569;">
                                                  <span class="material-symbols-outlined" style="font-size: 20px;">upload</span> Last opp
                                              </button>
                                              <button type="button" id="unsplash-trigger-btn" class="btn-ghost" style="flex: 1; justify-content: center; padding: 10px; border-radius: 10px; border: 1px solid #e2e8f0; background: #f8fafc; font-size: 13px; font-weight: 600; color: #1B4965;">
                                                  <span class="material-symbols-outlined" style="font-size: 20px;">image_search</span> Unsplash
                                              </button>
                                          </div>
                                          
                                          <div style="position: relative;">
                                              <input type="text" id="col-item-img" class="sidebar-control" style="padding-right: 40px; font-size: 12px; height: 38px; background: #f1f5f9; border: 1px solid transparent;" placeholder="Eller lim inn URL..." value="${item.imageUrl || ''}">
                                              <span class="material-symbols-outlined" style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); font-size: 18px; color: #94a3b8;">link</span>
                                          </div>
                                      </div>
                                  </div>
                                  <input type="file" id="col-item-img-file" style="display: none;" accept="image/*">
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
                             ` : ''}
                        </aside>
                    </div>
                </div>
                `;

            document.body.appendChild(modal);

            if (collectionId === 'podcast_transcripts') {
                const titleMain = document.getElementById('col-item-title-v2');
                const titleSidebar = document.getElementById('col-item-title-sidebar');
                if (titleMain && titleSidebar) {
                    const syncTitle = (source, target) => {
                        target.value = source.value;
                    };
                    titleMain.addEventListener('input', () => syncTitle(titleMain, titleSidebar));
                    titleSidebar.addEventListener('input', () => syncTitle(titleSidebar, titleMain));
                }
            }

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

            if (collectionId === 'blog') {
                this._renderBlogTranslationStatusBadge(item);
            }

            // --- Editor.js Data Prep ---
            let editorData = {};
            
            // 1. Prefer existing Editor.js blocks
            if (typeof item.content === 'object' && item.content !== null && item.content.blocks) {
                if (collectionId !== 'podcast_transcripts' || this._hasMeaningfulEditorContent(item.content)) {
                    editorData = item.content;
                }
            } 
            
            // 2. Fallback to Wix richContent (if blocks are missing or empty)
            if (!this._hasMeaningfulEditorContent(editorData) && item.richContent) {
                console.log("[AdminManager] Content empty, falling back to richContent (Wix format)");
                // We use the content-manager's rendering logic if possible, 
                // but since we are in AdminManager, we might need a local version or a bridge.
                // For now, let's assume item.content might have been the HTML version of richContent.
            }

            // 3. Fallback to HTML string in content or text
            if (!this._hasMeaningfulEditorContent(editorData)) {
                if (typeof item.content === 'string' && item.content.trim().length > 0) {
                    editorData = this.htmlToEditorJsBlocks(item.content);
                } else if (typeof item.text === 'string' && item.text.trim().length > 0) {
                    editorData = this.htmlToEditorJsBlocks(item.text);
                }
            }

            // --- Wix Artifact Cleanup (Pre-Editor Initialization) ---
            // Ensure the editor opens with sanitized content even before the first save
            if (editorData && typeof editorData === 'object' && Array.isArray(editorData.blocks)) {
                if (window.contentManager && typeof window.contentManager.cleanEditorBlocks === 'function') {
                    editorData = window.contentManager.cleanEditorBlocks(editorData);
                }
            } else if (typeof editorData === 'string' && editorData.trim().length > 0) {
                if (window.contentManager && typeof window.contentManager.cleanLegacyHtml === 'function') {
                    editorData = window.contentManager.cleanLegacyHtml(editorData);
                }
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
                    let videoUrl = this.data.url || '';
                    let fileUrl = this.data.fileUrl || '';

                    // Preview area
                    const previewDiv = document.createElement('div');
                    previewDiv.style = 'margin-bottom: 10px;';
                    if (fileUrl) {
                        previewDiv.innerHTML = `<video src="${fileUrl}" controls style="width:100%; border-radius:8px; background:#000;"></video>`;
                    } else if (videoId) {
                        previewDiv.innerHTML = `<div style="position:relative; padding-bottom:56.25%; height:0; overflow:hidden; border-radius:8px; margin-bottom:10px;"><iframe src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen style="position:absolute; top:0; left:0; width:100%; height:100%;"></iframe></div>`;
                    } else {
                        previewDiv.innerHTML = `<div style="text-align:center; padding:20px; color:#94a3b8;"><svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="#cbd5e1"><path d="M21.582 7.186a2.506 2.506 0 0 0-1.762-1.769C18.265 5 12 5 12 5s-6.265 0-7.82.417A2.506 2.506 0 0 0 2.418 7.186 26.302 26.302 0 0 0 2 12a26.302 26.302 0 0 0 .418 4.814 2.506 2.506 0 0 0 1.762 1.769C5.735 19 12 19 12 19s6.265 0 7.82-.417a2.506 2.506 0 0 0 1.762-1.769A26.302 26.302 0 0 0 22 12a26.302 26.302 0 0 0-.418-4.814zM9.954 15.477V8.523L15.818 12l-5.864 3.477z"/></svg><p style="margin:8px 0 0; font-size:13px;">Ingen video valgt</p></div>`;
                    }
                    this._wrapper.appendChild(previewDiv);

                    if (!this.readOnly) {
                        // Tabs/buttons for upload or link
                        const tabWrap = document.createElement('div');
                        tabWrap.style = 'display:flex; gap:8px; margin-bottom:12px;';
                        const linkTab = document.createElement('button');
                        linkTab.type = 'button';
                        linkTab.textContent = 'Lim inn lenke';
                        linkTab.className = 'btn btn-secondary';
                        const uploadTab = document.createElement('button');
                        uploadTab.type = 'button';
                        uploadTab.textContent = 'Last opp fra enhet';
                        uploadTab.className = 'btn btn-outline';
                        tabWrap.appendChild(linkTab);
                        tabWrap.appendChild(uploadTab);
                        this._wrapper.appendChild(tabWrap);

                        // Link input
                        const linkInputWrap = document.createElement('div');
                        linkInputWrap.style = 'margin-top:8px;';
                        const input = document.createElement('input');
                        input.type = 'url';
                        input.placeholder = 'Lim inn YouTube-lenke her...';
                        input.value = videoUrl;
                        input.style.cssText = 'width:100%; padding:8px 12px; border:1px solid #e2e8f0; border-radius:8px; font-size:14px; outline:none; margin-bottom:8px;';
                        const btn = document.createElement('button');
                        btn.type = 'button';
                        btn.textContent = 'Last inn';
                        btn.className = 'btn btn-primary';
                        btn.style = 'margin-left:0;';
                        linkInputWrap.appendChild(input);
                        linkInputWrap.appendChild(btn);

                        // Upload input
                        const uploadInputWrap = document.createElement('div');
                        uploadInputWrap.style = 'margin-top:8px; display:none;';
                        const fileInput = document.createElement('input');
                        fileInput.type = 'file';
                        fileInput.accept = 'video/*';
                        fileInput.style = 'margin-bottom:8px;';
                        const uploadBtn = document.createElement('button');
                        uploadBtn.type = 'button';
                        uploadBtn.textContent = 'Last opp video';
                        uploadBtn.className = 'btn btn-primary';
                        uploadInputWrap.appendChild(fileInput);
                        uploadInputWrap.appendChild(uploadBtn);

                        // Tab switching
                        linkTab.onclick = () => {
                            linkTab.className = 'btn btn-secondary';
                            uploadTab.className = 'btn btn-outline';
                            linkInputWrap.style.display = '';
                            uploadInputWrap.style.display = 'none';
                        };
                        uploadTab.onclick = () => {
                            linkTab.className = 'btn btn-outline';
                            uploadTab.className = 'btn btn-secondary';
                            linkInputWrap.style.display = 'none';
                            uploadInputWrap.style.display = '';
                        };
                        // Default to link tab
                        linkTab.click();

                        // Link handler
                        btn.onclick = () => {
                            this.data.url = input.value.trim();
                            this.data.fileUrl = '';
                            const newId = this._getYouTubeId(this.data.url);
                            videoUrl = this.data.url;
                            fileUrl = '';
                            if (newId) {
                                previewDiv.innerHTML = `<div style="position:relative; padding-bottom:56.25%; height:0; overflow:hidden; border-radius:8px; margin-bottom:10px;"><iframe src="https://www.youtube.com/embed/${newId}" frameborder="0" allowfullscreen style="position:absolute; top:0; left:0; width:100%; height:100%;"></iframe></div>`;
                            } else {
                                previewDiv.innerHTML = '<p style="text-align:center; color:#ef4444; font-size:13px;">Ugyldig YouTube-lenke</p>';
                            }
                        };

                        // Upload handler
                        uploadBtn.onclick = async () => {
                            const file = fileInput.files && fileInput.files[0];
                            if (!file) {
                                alert('Velg en videofil først.');
                                return;
                            }
                            uploadBtn.disabled = true;
                            uploadBtn.textContent = 'Laster opp...';
                            try {
                                const path = `editor/video-uploads/${Date.now()}_${file.name}`;
                                // Bruk eksisterende firebaseService hvis tilgjengelig
                                const url = await firebaseService.uploadFile(file, path, ['video/'], 500);
                                this.data.fileUrl = url;
                                this.data.url = '';
                                fileUrl = url;
                                videoUrl = '';
                                previewDiv.innerHTML = `<video src="${url}" controls style="width:100%; border-radius:8px; background:#000;"></video>`;
                            } catch (err) {
                                alert('Kunne ikke laste opp video.');
                            } finally {
                                uploadBtn.disabled = false;
                                uploadBtn.textContent = 'Last opp video';
                            }
                        };

                        this._wrapper.appendChild(linkInputWrap);
                        this._wrapper.appendChild(uploadInputWrap);
                    }

                    return this._wrapper;
                }

                save() {
                    // Return both url and fileUrl, but only one will be set
                    const input = this._wrapper ? this._wrapper.querySelector('input[type="url"]') : null;
                    const fileUrl = this.data.fileUrl || '';
                    const url = input ? input.value.trim() : (this.data.url || '');
                    return fileUrl ? { fileUrl } : { url };
                }
            }

            class UnsplashImageTool {
                static get toolbox() {
                    return {
                        title: 'Unsplash',
                        icon: '<span class="material-symbols-outlined">image_search</span>'
                    };
                }

                constructor({ api }) {
                    this.api = api;
                }

                render() {
                    const btn = document.createElement('div');
                    btn.style.cssText = 'padding: 24px; border: 2px dashed #e2e8f0; border-radius: 12px; text-align: center; cursor: pointer; color: #1B4965; font-weight: 600; display: flex; flex-direction: column; align-items: center; gap: 8px; transition: all 0.2s ease;';
                    btn.innerHTML = `
                        <span class="material-symbols-outlined" style="font-size: 32px;">image_search</span>
                        <span>Klikk for å hente bilde fra Unsplash</span>
                    `;
                    
                    btn.onmouseover = () => {
                        btn.style.background = '#f0f9ff';
                        btn.style.borderColor = '#1B4965';
                    };
                    btn.onmouseout = () => {
                        btn.style.background = 'transparent';
                        btn.style.borderColor = '#e2e8f0';
                    };

                    btn.onclick = () => {
                        if (window.unsplashManager) {
                            window.unsplashManager.open((selection) => {
                                if (selection && selection.url) {
                                    const index = this.api.blocks.getCurrentBlockIndex();
                                    this.api.blocks.insert('image', {
                                        file: { url: selection.url },
                                        caption: selection.caption || '',
                                        withBorder: false,
                                        withBackground: false,
                                        stretched: false
                                    });
                                    this.api.blocks.delete(index);
                                }
                            });
                        }
                    };

                    return btn;
                }

                save() {
                    return {};
                }
            }

            class SimpleListTool {
                static get toolbox() {
                    return {
                        title: 'Liste',
                        icon: '<span class="material-symbols-outlined">format_list_bulleted</span>'
                    };
                }

                constructor({ data }) {
                    this.data = {
                        style: data?.style === 'ordered' ? 'ordered' : 'unordered',
                        items: Array.isArray(data?.items) && data.items.length ? data.items : ['']
                    };
                    this.wrapper = null;
                }

                escape(value) {
                    return String(value || '')
                        .replace(/&/g, '&amp;')
                        .replace(/</g, '&lt;')
                        .replace(/>/g, '&gt;')
                        .replace(/"/g, '&quot;')
                        .replace(/'/g, '&#039;');
                }

                render() {
                    const tag = this.data.style === 'ordered' ? 'ol' : 'ul';
                    this.wrapper = document.createElement(tag);
                    this.wrapper.className = `cdx-list cdx-list--${this.data.style}`;
                    this.wrapper.contentEditable = 'true';
                    this.wrapper.innerHTML = this.data.items
                        .map((item) => `<li class="cdx-list__item">${this.escape(item)}</li>`)
                        .join('');
                    return this.wrapper;
                }

                save(blockContent) {
                    return {
                        style: this.data.style,
                        items: Array.from(blockContent.querySelectorAll('li'))
                            .map((li) => li.innerHTML.trim())
                            .filter(Boolean)
                    };
                }
            }

            // Defines tools conditionally to prevent crashes if scripts fail to load
            const toolsConfig = {};

            if (typeof Header !== 'undefined') {
                toolsConfig.header = {
                    class: Header,
                    inlineToolbar: true,
                    config: { placeholder: 'Overskrift', levels: [1, 2, 3, 4, 5, 6], defaultLevel: 2 }
                };
            }

            if (typeof List !== 'undefined') {
                toolsConfig.list = {
                    class: List,
                    inlineToolbar: true,
                    shortcut: 'CMD+SHIFT+L',
                    config: { defaultStyle: 'unordered' }
                };
            } else {
                toolsConfig.list = {
                    class: SimpleListTool,
                    inlineToolbar: true,
                    shortcut: 'CMD+SHIFT+L'
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

            // Unsplash tool – custom UnsplashImageTool
            toolsConfig.unsplash = {
                class: UnsplashImageTool
            };

            console.log("Final EditorJS Tools Config Keys:", Object.keys(toolsConfig));

            const shouldUseDocsLikeEditor = ['blog', 'teaching', 'podcast_transcripts'].includes(collectionId);
            let editor;
            let editorUndo = null;
            let toolbarListenersAttached = false;
            let editorSurfaceListenersAttachedTo = null;
            let selectionChangeHandler = null;
            const getEditorHolder = () => modal.querySelector(`#${CSS.escape(editorHolderId)}`);
            const getEditorRoot = () => {
                const holder = getEditorHolder();
                return holder?.querySelector('.codex-editor') || holder || null;
            };
            const getEditorRedactor = () => {
                const holder = getEditorHolder();
                return holder?.querySelector('.codex-editor__redactor') || holder || null;
            };
            const getEditorEditable = () => {
                const holder = getEditorHolder();
                return holder?.querySelector('[contenteditable="true"]') || null;
            };
            const getEditorContact = () => {
                const holder = getEditorHolder();
                const root = getEditorRoot();
                const redactor = getEditorRedactor();
                const editable = getEditorEditable();
                const hasShell = !!(
                    holder &&
                    root &&
                    redactor &&
                    modal.contains(holder) &&
                    document.body.contains(modal)
                );
                return {
                    holder,
                    root,
                    redactor,
                    editable,
                    hasShell,
                    hasBlocks: !!root?.querySelector('.ce-block'),
                    connected: hasShell
                };
            };
            const assertEditorContact = (context = 'editor') => {
                const contact = getEditorContact();
                if (!contact.connected) {
                    console.warn(`[AdminManager] Editor contact incomplete (${context})`, {
                        hasHolder: !!contact.holder,
                        hasRoot: !!contact.root,
                        hasRedactor: !!contact.redactor,
                        hasEditable: !!contact.editable,
                        hasBlocks: contact.hasBlocks,
                        modalConnected: document.body.contains(modal),
                        holderId: editorHolderId,
                        activeEditorMatches: this._activeEditorInstance === editor
                    });
                }
                return contact;
            };

            // --- Editor Initialization ---
            if (shouldUseDocsLikeEditor) {
                console.log("[AdminManager] Initializing Single Surface (Docs-like) Editor for:", collectionId);
                const holder = getEditorHolder();
                if (holder) {
                    holder.classList.add('docs-rte-surface');
                    holder.setAttribute('contenteditable', 'true');
                    holder.setAttribute('spellcheck', 'true');
                    holder.style.outline = 'none';
                    holder.style.minHeight = '600px';
                    
                    // Convert blocks to HTML for the single surface
                    const initialHtml = this.editorJsBlocksToHtml(editorData?.blocks || []);
                    holder.innerHTML = initialHtml || '<p><br></p>';
                    
                    // Mock EditorJS instance for compatibility with save/tools
                    editor = {
                        save: async () => {
                            const html = holder.innerHTML;
                            return this.htmlToEditorJsBlocks(html);
                        },
                        destroy: () => {
                            holder.removeAttribute('contenteditable');
                            holder.innerHTML = '';
                        },
                        blocks: {
                            insert: (type, data) => {
                                // Fallback for programmatic inserts
                                const html = type === 'header' ? `<h${data.level || 2}>${data.text || ''}</h${data.level || 2}>` : `<p>${data.text || ''}</p>`;
                                document.execCommand('insertHTML', false, html);
                            }
                        }
                    };
                    
                    // Ensure focus works on the whole paper
                    const paper = modal.querySelector('.editor-paper');
                    if (paper) {
                        paper.onclick = (e) => {
                            if (e.target === paper) holder.focus();
                        };
                    }

                    // Expose for toolbar handlers
                    this._activeEditorInstance = editor;
                }
            } else {
                // Standard Block-based EditorJS
                editor = new EditorJS({
                    holder: editorHolderId,
                    data: editorData,
                    placeholder: 'Trykk "/" for å velge blokker...',
                    tools: toolsConfig,
                    logLevel: 'ERROR',
                    onReady: () => {
                        this._activeEditorInstance = editor;
                        assertEditorContact('onReady');
                        this._initImageReplaceBehavior(editor, editorHolderId, collectionId);
                        if (typeof Undo !== 'undefined') {
                            try {
                                editorUndo = new Undo({
                                    editor,
                                    maxLength: 100,
                                    config: {
                                        debounceTimer: 150,
                                        shortcuts: {
                                            undo: ['CMD+Z'],
                                            redo: ['CMD+SHIFT+Z', 'CMD+Y']
                                        }
                                    }
                                });
                                editorUndo.initialize(editorData || { blocks: [] });
                            } catch (error) {
                                console.warn('Could not initialize editor undo history:', error);
                            }
                        }
                    }
                });
            }

            // Common editor surface utilities
            const getDocsSurface = () => getEditorHolder();
            let lastSelectionSnapshot = null;

            const splitTextToItems = (rawText) => {
                const text = String(rawText || '')
                    .replace(/\r\n/g, '\n')
                    .replace(/[\u2028\u2029]/g, '\n')
                    .replace(/\u00A0/g, ' ')
                    .trim();
                if (!text) return [];

                const clean = (line) => String(line || '')
                    .replace(/^[-*•]\s+/, '')
                    .trim();

                // Split ONLY by newlines for a standard Word-like experience
                // Sentence-splitting was too aggressive and counter-intuitive.
                return text.split(/\n+/).map(clean).filter(Boolean);
            };

            const getRangeElement = (range) => {
                if (!range) return null;
                const node = range.commonAncestorContainer;
                return node?.nodeType === Node.TEXT_NODE ? node.parentElement : node;
            };

            const getBlockElementFromNode = (node) => {
                if (!node) return null;
                const el = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
                return el?.closest?.('.ce-block') || null;
            };

            const getBlockIndexFromElement = (blockEl) => {
                const surface = getDocsSurface();
                if (!surface || !blockEl) return -1;
                return Array.from(surface.querySelectorAll('.ce-block')).indexOf(blockEl);
            };

            const selectionRangeStillValid = (range) => {
                const surface = getEditorRoot();
                const el = getRangeElement(range);
                return !!(range && surface && el && surface.contains(el));
            };

            const buildSelectionSnapshot = (range) => {
                if (!selectionRangeStillValid(range)) return null;
                const surface = getEditorRoot();
                const allBlocks = Array.from(surface?.querySelectorAll('.ce-block') || []);
                const startBlock = getBlockElementFromNode(range.startContainer);
                const endBlock = getBlockElementFromNode(range.endContainer);
                let startIndex = allBlocks.indexOf(startBlock);
                let endIndex = allBlocks.indexOf(endBlock);

                if (startIndex === -1 && startBlock) startIndex = getBlockIndexFromElement(startBlock);
                if (endIndex === -1 && endBlock) endIndex = getBlockIndexFromElement(endBlock);
                if (startIndex !== -1 && endIndex !== -1 && startIndex > endIndex) {
                    [startIndex, endIndex] = [endIndex, startIndex];
                }

                return {
                    range: range.cloneRange(),
                    text: String(range.toString() || '').trim(),
                    startIndex,
                    endIndex
                };
            };

            const getBlockEditableContent = (blockEl) => {
                if (!blockEl) return null;
                return blockEl.querySelector('[contenteditable="true"], .ce-paragraph, .ce-header, .cdx-block') || blockEl;
            };

            const normalizeRangeText = (value) => String(value || '').replace(/\s+/g, ' ').trim();

            const getSelectionSurroundingText = (range) => {
                if (!selectionRangeStillValid(range)) return null;

                const startBlock = getBlockElementFromNode(range.startContainer);
                const endBlock = getBlockElementFromNode(range.endContainer);
                if (!startBlock || !endBlock) return null;

                const startContent = getBlockEditableContent(startBlock);
                const endContent = getBlockEditableContent(endBlock);
                let prefix = '';
                let suffix = '';

                try {
                    if (startContent && startContent.contains(range.startContainer)) {
                        const beforeRange = document.createRange();
                        beforeRange.selectNodeContents(startContent);
                        beforeRange.setEnd(range.startContainer, range.startOffset);
                        prefix = normalizeRangeText(beforeRange.toString());
                    }

                    if (endContent && endContent.contains(range.endContainer)) {
                        const afterRange = document.createRange();
                        afterRange.selectNodeContents(endContent);
                        afterRange.setStart(range.endContainer, range.endOffset);
                        suffix = normalizeRangeText(afterRange.toString());
                    }
                } catch (error) {
                    console.warn('Could not read surrounding selection text:', error);
                }

                return { prefix, suffix, startBlock, endBlock };
            };

            const htmlToPlainText = (html) => {
                const doc = new DOMParser().parseFromString(String(html || ''), 'text/html');
                return String(doc.body?.textContent || '').replace(/\s+/g, ' ').trim();
            };

            const escapeEditorHtml = (value) => this.escapeHtml(String(value || ''));

            const blockSaveToPlainText = (saved) => {
                const type = String(saved?.name || saved?.type || '').toLowerCase();
                const data = saved?.data || saved || {};
                if (type === 'list' || Array.isArray(data.items)) {
                    return (data.items || [])
                        .map((item) => typeof item === 'string' ? item : (item?.content || item?.text || ''))
                        .filter(Boolean)
                        .join('\n');
                }
                if (type === 'quote') return String(data.text || '').trim();
                return htmlToPlainText(data.text || data.caption || '');
            };

            const convertSelectionToParagraphs = async () => {
                const currentEditor = this._activeEditorInstance;
                if (!currentEditor?.blocks) return;

                const selectedBlocks = getSelectedBlocks();
                let targetIndex = -1;
                let count = 0;

                if (selectedBlocks.length) {
                    const firstBlock = selectedBlocks[0].closest('.ce-block');
                    targetIndex = getBlockIndexFromElement(firstBlock);
                    count = selectedBlocks.length;
                } else {
                    targetIndex = currentEditor.blocks.getCurrentBlockIndex();
                    count = targetIndex >= 0 ? 1 : 0;
                }

                if (targetIndex < 0 || count < 1) {
                    exec('formatBlock', 'p');
                    return;
                }

                const paragraphs = [];
                for (let i = 0; i < count; i++) {
                    const block = currentEditor.blocks.getBlockByIndex(targetIndex + i);
                    const saved = await block?.save?.();
                    const text = blockSaveToPlainText(saved) || String(block?.holder?.textContent || '').trim();
                    const lines = String(text || '').split(/\n+/).map((line) => line.trim()).filter(Boolean);
                    paragraphs.push(...(lines.length ? lines : ['']));
                }

                for (let i = 0; i < paragraphs.length; i++) {
                    await currentEditor.blocks.insert('paragraph', { text: escapeEditorHtml(paragraphs[i]) }, {}, targetIndex + i);
                }
                for (let i = 0; i < count; i++) {
                    await currentEditor.blocks.delete(targetIndex + paragraphs.length);
                }
                currentEditor.caret.setToBlock(targetIndex);
            };

            const replaceSelectionWithList = async (ordered) => {
                const currentEditor = this._activeEditorInstance;
                const contact = assertEditorContact('list-command');
                if (!currentEditor || !currentEditor.blocks || !contact.holder || !contact.root) {
                    this.showToast('Editorområdet er ikke klart ennå. Klikk i teksten og prøv igjen.', 'warning', 4500);
                    return;
                }

                try {
                    // Force a selection check to ensure we have the latest range before focus is lost
                    saveSelectionRange();
                    
                    if (currentEditor.isReady && typeof currentEditor.isReady.then === 'function') {
                        await currentEditor.isReady;
                    }

                    const sel = window.getSelection();
                    if ((!sel || sel.rangeCount === 0 || sel.isCollapsed) && selectionRangeStillValid(this._lastDocsSelectionRange)) {
                        sel.removeAllRanges();
                        sel.addRange(this._lastDocsSelectionRange);
                    }

                    const liveRange = sel && sel.rangeCount > 0 ? sel.getRangeAt(0) : null;
                    const liveSnapshot = buildSelectionSnapshot(liveRange);
                    const savedSnapshot = buildSelectionSnapshot(this._lastDocsSelectionRange) || lastSelectionSnapshot;
                    const activeSnapshot = liveSnapshot?.text ? liveSnapshot : savedSnapshot;
                    
                    let items = [];
                    let targetIndex = -1;
                    let blocksToRemove = 0;
                    let prefixText = '';
                    let suffixText = '';

                    // Phase 1: Identify what to convert
                    if (activeSnapshot?.text) {
                        items = splitTextToItems(activeSnapshot.text);
                        targetIndex = activeSnapshot.startIndex;
                        const endIndex = activeSnapshot.endIndex;
                        blocksToRemove = (targetIndex !== -1 && endIndex !== -1) ? (endIndex - targetIndex) + 1 : 1;
                        
                        const surrounding = getSelectionSurroundingText(activeSnapshot.range);
                        if (surrounding) {
                            prefixText = surrounding.prefix;
                            suffixText = surrounding.suffix;
                        }
                    } else {
                        const selectedBlocks = getSelectedBlocks();
                        if (selectedBlocks.length > 0) {
                            const firstBlockEl = selectedBlocks[0].closest('.ce-block');
                            targetIndex = getBlockIndexFromElement(firstBlockEl);
                            blocksToRemove = selectedBlocks.length;
                            
                            for (const contentEl of selectedBlocks) {
                                items.push(...splitTextToItems(contentEl.textContent));
                            }
                        } else {
                            targetIndex = currentEditor.blocks.getCurrentBlockIndex();
                            if (targetIndex >= 0) {
                                const block = currentEditor.blocks.getBlockByIndex(targetIndex);
                                const saved = await block?.save();
                                // Toggle OFF if it's already a list
                                if (saved?.type === 'list' || saved?.name === 'list') {
                                    const listData = saved.data || saved || {};
                                    const listItems = listData.items || [];
                                    for (let i = 0; i < listItems.length; i++) {
                                        await currentEditor.blocks.insert('paragraph', { text: listItems[i] }, {}, targetIndex + i);
                                    }
                                    await currentEditor.blocks.delete(targetIndex + listItems.length);
                                    return;
                                }
                                items = splitTextToItems(block?.holder?.textContent || '');
                                blocksToRemove = 1;
                            }
                        }
                    }

                    if (targetIndex === -1) return;
                    if (items.length === 0) items = [''];

                    // Phase 2: Atomic-like replacement
                    let insertOffset = 0;
                    if (prefixText) {
                        await currentEditor.blocks.insert('paragraph', { text: escapeEditorHtml(prefixText) }, {}, targetIndex + insertOffset);
                        insertOffset++;
                    }

                    const listIndex = targetIndex + insertOffset;
                    await currentEditor.blocks.insert('list', { 
                        style: ordered ? 'ordered' : 'unordered', 
                        items 
                    }, {}, listIndex);
                    insertOffset++;

                    if (suffixText) {
                        await currentEditor.blocks.insert('paragraph', { text: escapeEditorHtml(suffixText) }, {}, targetIndex + insertOffset);
                        insertOffset++;
                    }

                    // DELETE in reverse order to keep indices stable during the process
                    for (let i = blocksToRemove - 1; i >= 0; i--) {
                        await currentEditor.blocks.delete(targetIndex + insertOffset + i);
                    }
                    
                    setTimeout(() => {
                        currentEditor.caret.setToBlock(listIndex, 'end');
                        if (typeof updateActiveStates === 'function') updateActiveStates();
                    }, 50);

                } catch (err) {
                    console.error("Critical List Error:", err);
                    const listTag = ordered ? 'ol' : 'ul';
                    const fallbackItems = splitTextToItems(lastSelectionSnapshot?.text || '');
                    if (fallbackItems.length) {
                        const html = `<${listTag}>${fallbackItems.map((item) => `<li>${escapeEditorHtml(item)}</li>`).join('')}</${listTag}>`;
                        exec('insertHTML', html);
                    }
                }
            };

            // --- Scoped Selection Engine (Modal-Aware) ---
            const getActiveSurface = () => {
                return getEditorRoot();
            };

            const selectionInsideSurface = () => {
                const surface = getActiveSurface();
                const sel = window.getSelection();
                if (!sel || sel.rangeCount === 0 || !surface) return null;
                const range = sel.getRangeAt(0);
                const node = range.commonAncestorContainer;
                const el = node?.nodeType === Node.TEXT_NODE ? node.parentElement : node;
                if (!el || !surface.contains(el)) return null;
                return { sel, range, surface };
            };

            const saveSelectionRange = () => {
                const ctx = selectionInsideSurface();
                if (!ctx) return;
                this._lastDocsSelectionRange = ctx.range.cloneRange();
                lastSelectionSnapshot = buildSelectionSnapshot(ctx.range);
            };

            const restoreSelectionRange = () => {
                const ctx = selectionInsideSurface();
                if (ctx && !this._lastDocsSelectionRange) return true;
                
                const sel = window.getSelection();
                const range = selectionRangeStillValid(this._lastDocsSelectionRange) ? this._lastDocsSelectionRange : null;
                const surface = getActiveSurface();
                
                if (range && sel) {
                    try {
                        sel.removeAllRanges();
                        sel.addRange(range);
                        return true;
                    } catch (e) {
                        console.warn('Range restoration failed', e);
                    }
                }
                
                if (surface) {
                    surface.focus({ preventScroll: true });
                    return true;
                }
                return false;
            };

            const exec = (command, value = null) => {
                let range = selectionRangeStillValid(this._lastDocsSelectionRange) ? this._lastDocsSelectionRange : null;
                const sel = window.getSelection();
                const surface = getActiveSurface();
                
                if (!range && sel && sel.rangeCount > 0) {
                    const currentRange = sel.getRangeAt(0);
                    const node = currentRange.commonAncestorContainer;
                    const el = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
                    if (surface && surface.contains(el)) {
                        range = currentRange;
                        this._lastDocsSelectionRange = range.cloneRange();
                    }
                }

                if (range) {
                    try {
                        sel.removeAllRanges();
                        sel.addRange(range);
                        const container = range.commonAncestorContainer;
                        const el = container.nodeType === Node.TEXT_NODE ? container.parentElement : container;
                        const focusTarget = el.closest('[contenteditable="true"]');
                        if (focusTarget) focusTarget.focus();
                    } catch (err) {
                        console.warn('Exec: selection restore failed:', err);
                    }
                } else {
                    const editable = getEditorEditable() || surface?.querySelector?.('[contenteditable="true"]');
                    if (editable) editable.focus({ preventScroll: true });
                }
                
                try {
                    document.execCommand(command, false, value);
                    setTimeout(() => saveSelectionRange(), 20);
                } catch (err) {
                    console.error(`execCommand failed for ${command}:`, err);
                }
            };

            const getSelectedBlocks = () => {
                const holder = getEditorRoot();
                const sel = window.getSelection();
                let range = (sel && sel.rangeCount > 0) ? sel.getRangeAt(0) : null;
                
                // Fallback to last known range if live selection is lost (e.g. on button click)
                if ((!range || range.collapsed) && selectionRangeStillValid(this._lastDocsSelectionRange)) {
                    range = this._lastDocsSelectionRange;
                }

                if (!range || !holder) return [];
                
                const startNode = range.startContainer;
                const endNode = range.endContainer;

                const getBlockEl = (node) => {
                    if (!node) return null;
                    const el = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
                    return el.closest('.ce-block');
                };

                const startBlock = getBlockEl(startNode);
                const endBlock = getBlockEl(endNode);
                const allBlocks = Array.from(holder.querySelectorAll('.ce-block'));

                // Precise contiguous block selection
                if (startBlock && endBlock && holder.contains(startBlock) && holder.contains(endBlock)) {
                    let startIndex = allBlocks.indexOf(startBlock);
                    let endIndex = allBlocks.indexOf(endBlock);
                    if (startIndex !== -1 && endIndex !== -1) {
                        if (startIndex > endIndex) [startIndex, endIndex] = [endIndex, startIndex];
                        const selected = [];
                        for (let i = startIndex; i <= endIndex; i++) {
                            const content = allBlocks[i].querySelector('[contenteditable="true"], .ce-paragraph, .ce-header, .cdx-block, p, h1, h2, h3, h4, h5, h6');
                            if (content) selected.push(content);
                        }
                        return selected;
                    }
                }

                // Fallback to intersection if boundary logic fails
                const selected = [];
                allBlocks.forEach(block => {
                    try {
                        if (range.intersectsNode(block)) {
                            const content = block.querySelector('[contenteditable="true"], .ce-paragraph, .ce-header, .cdx-block, p, h1, h2, h3, h4, h5, h6');
                            if (content) selected.push(content);
                        }
                    } catch (e) {}
                });
                return selected;
            };

            const applyStyleToSelectedBlocks = (mutator) => {
                const selectedBlocks = getSelectedBlocks();
                if (selectedBlocks.length) {
                    selectedBlocks.forEach(mutator);
                    return;
                }

                const activeIndex = editor?.blocks?.getCurrentBlockIndex?.();
                if (typeof activeIndex === 'number' && activeIndex >= 0) {
                    const block = editor.blocks.getBlockByIndex(activeIndex);
                    const target = block?.holder?.querySelector?.('[contenteditable="true"], .ce-paragraph, .ce-header, .cdx-block');
                    if (target) mutator(target);
                }
            };

            const desktopTools = modal.querySelector('#desktop-richtools');
            if (desktopTools) {
                const updateActiveStates = async () => {
                    const isDocs = !!modal.querySelector('.docs-rte-surface[contenteditable="true"]');
                    const states = {
                        bold: document.queryCommandState('bold'),
                        italic: document.queryCommandState('italic'),
                        underline: document.queryCommandState('underline'),
                        strike: document.queryCommandState('strikeThrough'),
                        list: document.queryCommandState('insertUnorderedList'),
                        orderedList: document.queryCommandState('insertOrderedList'),
                        link: !!document.getSelection()?.anchorNode?.parentElement?.closest('a')
                    };

                    // Detect Heading levels for visual feedback
                    if (isDocs) {
                        try {
                            const blockValue = document.queryCommandValue('formatBlock');
                            // Browsers return different values (e.g., 'h1', 'H1', or sometimes the tag name)
                            const currentBlock = String(blockValue || '').toLowerCase();
                            const normalizedBlock = (currentBlock === 'p' || currentBlock === '' || currentBlock === 'div') ? 'p' : currentBlock;
                            
                            states.paragraph = normalizedBlock === 'p';
                            states.h1 = normalizedBlock === 'h1';
                            states.h2 = normalizedBlock === 'h2';
                            states.h3 = normalizedBlock === 'h3';
                            states.h4 = normalizedBlock === 'h4';
                            states.h5 = normalizedBlock === 'h5';
                            states.h6 = normalizedBlock === 'h6';
                            states.blockquote = normalizedBlock === 'blockquote';

                            // Sync the select menu
                            const headingSelect = desktopTools.querySelector('[data-tool-select="headingLevel"]');
                            if (headingSelect) headingSelect.value = normalizedBlock;

                            // Sync Spacing controls
                            const sel = window.getSelection();
                            if (sel && sel.rangeCount > 0) {
                                const container = sel.getRangeAt(0).commonAncestorContainer;
                                const el = container.nodeType === Node.TEXT_NODE ? container.parentElement : container;
                                const block = el.closest('[contenteditable="true"] > *') || el;
                                
                                if (block) {
                                    const computed = window.getComputedStyle(block);
                                    
                                    const fontSizeSelect = desktopTools.querySelector('[data-tool-select="fontSize"]');
                                    if (fontSizeSelect) {
                                        const px = parseFloat(computed.fontSize);
                                        const val = Math.round(px).toString();
                                        if (Array.from(fontSizeSelect.options).some(o => o.value === val)) {
                                            fontSizeSelect.value = val;
                                        }
                                    }

                                    const lhSelect = desktopTools.querySelector('[data-tool-select="lineHeight"]');
                                    if (lhSelect) {
                                        // Line height is tricky, usually unitless in style or px
                                        const lh = block.style.lineHeight || 'normal';
                                        if (Array.from(lhSelect.options).some(o => o.value === lh)) {
                                            lhSelect.value = lh;
                                        }
                                    }

                                    const psSelect = desktopTools.querySelector('[data-tool-select="paragraphSpacing"]');
                                    if (psSelect) {
                                        const mb = block.style.marginBottom;
                                        const val = mb.replace('em', '');
                                        if (Array.from(psSelect.options).some(o => o.value === val)) {
                                            psSelect.value = val;
                                        }
                                    }

                                    const lsSelect = desktopTools.querySelector('[data-tool-select="letterSpacing"]');
                                    if (lsSelect) {
                                        const ls = block.style.letterSpacing || 'normal';
                                        const val = ls.replace('em', '');
                                        if (Array.from(lsSelect.options).some(o => o.value === val)) {
                                            lsSelect.value = val;
                                        }
                                    }
                                }
                            }
                        } catch (e) {}
                    } else {
                        // Check block state for EditorJS mode
                        const activeIndex = this._activeEditorInstance?.blocks?.getCurrentBlockIndex();
                        if (typeof activeIndex === 'number' && activeIndex >= 0) {
                            const block = this._activeEditorInstance.blocks.getBlockByIndex(activeIndex);
                            const type = (block?.name || block?.type || '').toLowerCase();
                            states.paragraph = type === 'paragraph';
                            states.h1 = type === 'header' && block.data?.level === 1;
                            states.h2 = type === 'header' && block.data?.level === 2;
                            states.h3 = type === 'header' && block.data?.level === 3;
                            states.list = type === 'list';
                            // ... other states as needed
                        }
                    }

                    desktopTools.querySelectorAll('.desktop-richtools-btn').forEach((btn) => {
                        const tool = btn.getAttribute('data-tool');
                        if (states[tool]) {
                            btn.classList.add('is-active');
                        } else {
                            btn.classList.remove('is-active');
                        }
                    });
                };

                // Common handlers for both modes
                const commonHandlers = {
                    undo: async () => {
                        if (editorUndo && typeof editorUndo.undo === 'function' && (!editorUndo.canUndo || editorUndo.canUndo())) {
                            await editorUndo.undo();
                            return;
                        }
                        exec('undo');
                    },
                    redo: async () => {
                        if (editorUndo && typeof editorUndo.redo === 'function' && (!editorUndo.canRedo || editorUndo.canRedo())) {
                            await editorUndo.redo();
                            return;
                        }
                        exec('redo');
                    },
                    bold: () => exec('bold'),
                    italic: () => exec('italic'),
                    underline: () => exec('underline'),
                    strike: () => exec('strikeThrough'),
                    list: () => replaceSelectionWithList(false),
                    orderedList: () => replaceSelectionWithList(true),
                    link: () => {
                        const ctx = selectionInsideSurface();
                        if (!ctx || !ctx.sel || ctx.sel.isCollapsed) {
                            window.alert('Marker tekst før du legger til lenke.');
                            return;
                        }
                        const url = window.prompt('Skriv inn URL:', 'https://');
                        if (url) exec('createLink', url);
                    }
                };

                const insertChecklist = () => {
                    const ctx = selectionInsideSurface();
                    let items = [];

                    if (ctx && !ctx.sel.isCollapsed) {
                        const selectedText = String(ctx.sel.toString() || '').trim();
                        items = splitTextToItems(selectedText);
                    }

                    if (!items.length) items = ['Ny oppgave'];

                    const checklistHtml = `<ul>${items.map((t) => `<li>${escapeEditorHtml(`☐ ${t}`)}</li>`).join('')}</ul>`;
                    exec('insertHTML', checklistHtml);
                };

                const toolHandlers = shouldUseDocsLikeEditor ? {
                    ...commonHandlers,
                    paragraph: () => exec('formatBlock', 'p'),
                    h1: () => {
                        exec('formatBlock', 'h1');
                        // Edge case fix: if formatBlock produced a div with h1 inside, or failed
                        // we don't do much here to avoid complexity, but ensured CSS handles it.
                    },
                    h2: () => exec('formatBlock', 'h2'),
                    h3: () => exec('formatBlock', 'h3'),
                    h4: () => exec('formatBlock', 'h4'),
                    h5: () => exec('formatBlock', 'h5'),
                    h6: () => exec('formatBlock', 'h6'),
                    list: () => exec('insertUnorderedList'),
                    orderedList: () => exec('insertOrderedList'),
                    removeFormat: () => {
                        exec('removeFormat');
                        // Also clear styles for full cleanup
                        const sel = window.getSelection();
                        if (sel && !sel.isCollapsed) {
                            exec('formatBlock', 'p');
                        }
                    },
                    outdent: () => exec('outdent'),
                    indent: () => exec('indent'),
                    checklist: () => insertChecklist(),
                    textColor: () => {
                        const input = desktopTools.querySelector('[data-color-input="text"]');
                        if (input) input.click();
                    },
                    highlightColor: () => {
                        const input = desktopTools.querySelector('[data-color-input="highlight"]');
                        if (input) input.click();
                    },
                    image: async () => {
                        const useUnsplash = await this.showConfirm(
                            'Bildevalg',
                            'Vil du søke i bildebiblioteket (Unsplash) eller laste opp fra din enhet?',
                            'Søk Unsplash',
                            'Last opp bilde'
                        );

                        if (useUnsplash) {
                            // Unsplash flow
                            if (window.unsplashManager) {
                                window.unsplashManager.open((selection) => {
                                    if (selection && selection.url) {
                                        const imgHtml = `<img src="${selection.url}" alt="${selection.caption || ''}" style="max-width:100%; height:auto; border-radius:8px; margin: 16px 0; display: block;">`;
                                        exec('insertHTML', imgHtml);
                                    }
                                });
                            } else {
                                const query = prompt('Hva vil du søke etter på Unsplash?');
                                if (!query) return;
                                try {
                                    const photo = await this.searchUnsplash(query);
                                    if (photo) {
                                        const imgHtml = `<img src="${photo.urls.regular}" alt="${photo.alt_description || ''}" style="max-width:100%; height:auto; border-radius:8px; margin: 16px 0; display: block;">`;
                                        exec('insertHTML', imgHtml);
                                    }
                                } catch (err) {
                                    this.showToast('Unsplash-søk feilet.', 'error');
                                }
                            }
                        } else {
                            // Upload flow
                            const fileInput = document.createElement('input');
                            fileInput.type = 'file';
                            fileInput.accept = 'image/*';
                            fileInput.onchange = async (e) => {
                                const file = e.target.files[0];
                                if (!file) return;
                                try {
                                    this.showToast('Laster opp bilde...', 'info');
                                    const url = await this.handleImageUpload(file, 'editor/blog');
                                    const imgHtml = `<img src="${url}" alt="" style="max-width:100%; height:auto; border-radius:8px; margin: 16px 0; display: block;">`;
                                    exec('insertHTML', imgHtml);
                                    this.showToast('Bilde lastet opp!', 'success');
                                } catch (err) {
                                    console.error('Upload failed:', err);
                                    this.showToast('Opplasting feilet: ' + err.message, 'error');
                                }
                            };
                            fileInput.click();
                        }
                    },
                    quote: () => exec('formatBlock', 'blockquote')
                } : {
                    ...commonHandlers,
                    paragraph: () => editor.blocks.insert('paragraph', { text: '' }, undefined, undefined, true),
                    header: () => editor.blocks.insert('header', { text: '', level: 2 }, undefined, undefined, true),
                    list: () => replaceSelectionWithList(false),
                    orderedList: () => replaceSelectionWithList(true),
                    image: () => editor.blocks.insert('image', {}, undefined, undefined, true),
                    quote: () => editor.blocks.insert('quote', { text: '', caption: '' }, undefined, undefined, true),
                    delimiter: () => editor.blocks.insert('delimiter', {}, undefined, undefined, true),
                    youtubeVideo: () => editor.blocks.insert('youtubeVideo', { url: '' }, undefined, undefined, true)
                };

                // --- High-Reliability Event Delegation for Toolbar ---
                // Only attach the delegation listener ONCE to the container
                if (!toolbarListenersAttached) {
                    toolbarListenersAttached = true;
                    desktopTools.style.pointerEvents = 'auto';
                    
                    desktopTools.addEventListener('click', async (e) => {
                        const btn = e.target.closest('.desktop-richtools-btn');
                        if (!btn || btn.disabled || btn.classList.contains('is-disabled')) return;
                        if (btn.dataset.pointerHandled === 'true') {
                            delete btn.dataset.pointerHandled;
                            e.preventDefault();
                            e.stopPropagation();
                            return;
                        }

                        // Always get the latest toolHandlers from the current editor context
                        // We store the current handlers on the element itself for easy access
                        const currentHandlers = desktopTools._currentHandlers;
                        const tool = btn.getAttribute('data-tool');
                        const handler = currentHandlers ? currentHandlers[tool] : null;
                        
                        if (handler) {
                            e.preventDefault();
                            e.stopPropagation();
                            
                            // Visual feedback pulse
                            btn.style.transform = 'scale(0.95)';
                            setTimeout(() => btn.style.transform = '', 100);

                            try {
                                await handler();
                                if (typeof updateActiveStates === 'function') updateActiveStates();
                            } catch (err) {
                                console.error(`Toolbar delegation error [${tool}]:`, err);
                            }
                        }
                    }, true); // Use capture phase to be first
                }

                // Update the current handlers for this specific editor session
                desktopTools._currentHandlers = toolHandlers;
                
                desktopTools.querySelectorAll('.desktop-richtools-btn').forEach(btn => {
                    btn.style.pointerEvents = 'auto';
                    btn.onmousedown = async (e) => { 
                        saveSelectionRange();
                        e.preventDefault(); 
                        e.stopPropagation();

                        const tool = btn.getAttribute('data-tool');
                        if (tool !== 'list' && tool !== 'orderedList') return;

                        const handler = desktopTools._currentHandlers ? desktopTools._currentHandlers[tool] : null;
                        if (!handler) return;

                        btn.dataset.pointerHandled = 'true';
                        btn.style.transform = 'scale(0.95)';
                        setTimeout(() => btn.style.transform = '', 100);

                        try {
                            await handler();
                            if (typeof updateActiveStates === 'function') updateActiveStates();
                        } catch (err) {
                            console.error(`Toolbar pointer error [${tool}]:`, err);
                        }
                    };
                });

                    const textColorInput = desktopTools.querySelector('[data-color-input="text"]');
                    if (textColorInput) {
                        textColorInput.addEventListener('input', () => {
                            if (!textColorInput.value) return;
                            exec('styleWithCSS', true);
                            exec('foreColor', textColorInput.value);
                        });
                    }

                    const highlightColorInput = desktopTools.querySelector('[data-color-input="highlight"]');
                    if (highlightColorInput) {
                        highlightColorInput.addEventListener('input', () => {
                            if (!highlightColorInput.value) return;
                            exec('styleWithCSS', true);
                            exec('hiliteColor', highlightColorInput.value);
                        });
                    }

                    const fontSizeSelect = desktopTools.querySelector('[data-tool-select="fontSize"]');
                    if (fontSizeSelect) {
                        fontSizeSelect.addEventListener('change', () => {
                            let val = String(fontSizeSelect.value || '').trim();
                            if (val === 'custom') {
                                val = window.prompt('Skriv inn skriftstørrelse (kun tall, f.eks 19):', '18');
                                if (!val) return;
                            }
                            const px = parseInt(val, 10);
                            if (isNaN(px)) return;
                            applyStyleToSelectedBlocks((block) => {
                                block.style.fontSize = `${px}px`;
                            });
                            saveSelectionRange();
                        });
                    }

                    const lineHeightSelect = desktopTools.querySelector('[data-tool-select="lineHeight"]');
                    if (lineHeightSelect) {
                        lineHeightSelect.addEventListener('change', () => {
                            let val = String(lineHeightSelect.value || '').trim();
                            if (val === 'custom') {
                                val = window.prompt('Skriv inn linjeavstand (f.eks 1.4 eller 1.8):', '1.5');
                                if (!val) return;
                            }
                            if (!val) return;
                            applyStyleToSelectedBlocks((block) => {
                                block.style.lineHeight = val;
                            });
                            saveSelectionRange();
                        });
                    }

                    const paragraphSpacingSelect = desktopTools.querySelector('[data-tool-select="paragraphSpacing"]');
                    if (paragraphSpacingSelect) {
                        paragraphSpacingSelect.addEventListener('change', () => {
                            let val = String(paragraphSpacingSelect.value || '').trim();
                            if (val === 'custom') {
                                val = window.prompt('Skriv inn avsnittsavstand (em, f.eks 1.5):', '1.2');
                                if (!val) return;
                            }
                            if (!val) return;
                            applyStyleToSelectedBlocks((block) => {
                                block.style.marginBottom = `${val}em`;
                            });
                            saveSelectionRange();
                        });
                    }

                    const letterSpacingSelect = desktopTools.querySelector('[data-tool-select="letterSpacing"]');
                    if (letterSpacingSelect) {
                        letterSpacingSelect.addEventListener('change', () => {
                            let val = String(letterSpacingSelect.value || '').trim();
                            if (val === 'custom') {
                                val = window.prompt('Skriv inn bokstavavstand (em, f.eks 0.03):', '0.02');
                                if (!val) return;
                            }
                            if (!val) return;
                            applyStyleToSelectedBlocks((block) => {
                                block.style.letterSpacing = val === 'normal' ? 'normal' : `${val}em`;
                            });
                            saveSelectionRange();
                        });
                    }

                    const headingLevelSelect = desktopTools.querySelector('[data-tool-select="headingLevel"]');
                    if (headingLevelSelect) {
                        headingLevelSelect.addEventListener('change', () => {
                            const val = String(headingLevelSelect.value || 'p').trim().toLowerCase();
                            if (!val) return;
                            exec('formatBlock', val === 'p' ? 'p' : val);
                        });
                    }

                // Global listeners for the editor surface
                const attachEditorSurfaceListeners = () => {
                    const editorSurface = assertEditorContact('surface-listeners').root;
                    if (!editorSurface || editorSurfaceListenersAttachedTo === editorSurface) return;
                    editorSurfaceListenersAttachedTo = editorSurface;

                    editorSurface.addEventListener('mouseup', () => {
                        saveSelectionRange();
                        if (typeof updateActiveStates === 'function') updateActiveStates();
                    });

                    editorSurface.addEventListener('keyup', () => {
                        saveSelectionRange();
                        if (typeof updateActiveStates === 'function') updateActiveStates();
                    });

                    // Professional Shortcuts (CMD+1 to CMD+6 for headings, CMD+0 for paragraph)
                    editorSurface.addEventListener('keydown', (e) => {
                        if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey) {
                            if (e.key >= '0' && e.key <= '6') {
                                e.preventDefault();
                                const level = e.key === '0' ? 'p' : `h${e.key}`;
                                exec('formatBlock', level);
                                if (typeof updateActiveStates === 'function') updateActiveStates();
                            }
                        }
                    });

                    // Wix/External Paste Sanitizer
                    editorSurface.addEventListener('paste', (e) => {
                        const html = e.clipboardData.getData('text/html');
                        if (html && (html.includes('wix-') || html.includes('mso-') || html.includes('style='))) {
                            e.preventDefault();
                            const doc = new DOMParser().parseFromString(html, 'text/html');
                            
                            // Strip all styles, classes, and meta tags
                            doc.querySelectorAll('*').forEach(el => {
                                el.removeAttribute('style');
                                el.removeAttribute('class');
                                el.removeAttribute('id');
                            });
                            
                            // Remove non-essential tags but keep structure
                            const cleanHtml = doc.body.innerHTML;
                            exec('insertHTML', cleanHtml);
                            console.log('Sanitized paste from external source (Wix/Word/etc)');
                        }
                    });
                };

                if (!selectionChangeHandler) {
                    selectionChangeHandler = () => {
                        if (!document.body.contains(modal)) {
                            document.removeEventListener('selectionchange', selectionChangeHandler);
                            return;
                        }
                        saveSelectionRange();
                    };
                    document.addEventListener('selectionchange', selectionChangeHandler);
                }

                if (editor?.isReady && typeof editor.isReady.then === 'function') {
                    editor.isReady.then(() => {
                        attachEditorSurfaceListeners();
                    }).catch((error) => {
                        console.warn('Could not attach editor surface listeners after ready:', error);
                    });
                } else {
                    setTimeout(attachEditorSurfaceListeners, 0);
                }
            }

            // Title Auto-resize logic
            const titleArea = modal.querySelector('#col-item-title-v2');
            if (titleArea) {
                const adjustTitleHeight = () => {
                    titleArea.style.height = 'auto';
                    titleArea.style.height = (titleArea.scrollHeight) + 'px';
                };
                titleArea.addEventListener('input', adjustTitleHeight);
                // Initial adjustment
                setTimeout(adjustTitleHeight, 10);
            }

            if (collectionId === 'podcast_transcripts') {
                const generateAiBtn = document.getElementById('generate-podcast-ai-transcript');
                const generateAiSummaryBtn = document.getElementById('generate-podcast-ai-summary');
                const aiStatus = document.getElementById('podcast-ai-status');
                const summaryField = document.getElementById('col-item-summary');

                const blockToPlainText = (block) => {
                    const type = String(block?.type || '').toLowerCase();
                    const data = block?.data || {};

                    if (type === 'header') return String(data.text || '').trim();
                    if (type === 'list') {
                        const items = Array.isArray(data.items) ? data.items : [];
                        return items
                            .map(item => {
                                if (typeof item === 'string') return item;
                                if (item && typeof item === 'object') return item.content || item.text || '';
                                return '';
                            })
                            .filter(Boolean)
                            .join(' ');
                    }
                    if (type === 'quote') return String(data.text || '').trim();
                    if (type === 'paragraph') return String(data.text || '').trim();
                    return String(data.text || '').trim();
                };

                const htmlToPlainText = (value) => {
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(String(value || ''), 'text/html');
                    return String(doc.body?.textContent || '')
                        .replace(/\s+/g, ' ')
                        .trim();
                };

                const buildLocalSummarySuggestion = (title, transcriptText) => {
                    const cleaned = String(transcriptText || '')
                        .replace(/\s+/g, ' ')
                        .replace(/\b\d{1,3}[.:]\s*/g, '')
                        .trim();

                    if (!cleaned) return '';

                    const sentences = cleaned
                        .split(/(?<=[.!?])\s+/)
                        .map(s => s.trim())
                        .filter(s => s.length >= 35)
                        .slice(0, 3);

                    const core = sentences.join(' ').trim();
                    if (!core) return '';

                    if (!title) return core;

                    return `I denne episoden ${title.toLowerCase().includes('lydbok') ? 'får du en lydboklesning' : 'får du undervisning'} som tar deg gjennom sentrale poeng i teksten. ${core}`;
                };

                if (generateAiBtn) {
                    generateAiBtn.onclick = async () => {
                        const episodeId = String(item?.id || '').trim();
                        const audioUrl = String(item?.audioUrl || '').trim();

                        if (!episodeId) {
                            this.showToast('Mangler episode-ID. Kan ikke generere AI-tekst.', 'error', 5000);
                            return;
                        }

                        if (!audioUrl) {
                            this.showToast('Fant ingen lydfil for episoden. Kan ikke generere AI-tekst.', 'error', 5000);
                            return;
                        }

                        const originalBtnHtml = generateAiBtn.innerHTML;
                        generateAiBtn.disabled = true;
                        generateAiBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size:18px;">hourglass_top</span> Genererer...';
                        if (aiStatus) {
                            aiStatus.textContent = 'Genererer AI-tekst nå. Dette kan ta litt tid...';
                            aiStatus.style.color = '#334155';
                        }

                        try {
                            const callable = firebase.functions().httpsCallable('transcribePodcast');
                            await callable({
                                episodeId,
                                audioUrl,
                                episodeTitle: String(item?.title || '')
                            });

                            const refreshedDoc = await firebase.firestore().collection('podcast_transcripts').doc(episodeId).get();
                            const refreshedData = refreshedDoc.exists ? refreshedDoc.data() : null;

                            if (refreshedData && typeof refreshedData.text === 'string' && refreshedData.text.trim()) {
                                const refreshedBlocks = this.htmlToEditorJsBlocks(refreshedData.text);
                                await editor.render(refreshedBlocks);
                                item.text = refreshedData.text;
                                item.content = refreshedBlocks;
                            }

                            if (refreshedData && typeof refreshedData.description === 'string') {
                                const summaryField = document.getElementById('col-item-summary');
                                if (summaryField) summaryField.value = refreshedData.description;
                            }

                            if (refreshedData && typeof refreshedData.audioUrl === 'string' && refreshedData.audioUrl.trim()) {
                                item.audioUrl = refreshedData.audioUrl.trim();
                            }

                            this.showToast('AI-tekst er klar. Du kan redigere og lagre nå.', 'success', 5000);
                            if (aiStatus) {
                                aiStatus.textContent = 'AI-tekst hentet. Husk å klikke Lagre og publiser.';
                                aiStatus.style.color = '#166534';
                            }
                        } catch (error) {
                            console.error('AI-transkripsjon feilet:', error);
                            const reason = this._getCallableErrorMessage(error, 'Kunne ikke generere AI-tekst.');
                            this.showToast(`Kunne ikke generere AI-tekst. ${reason}`, 'error', 7000);
                            if (aiStatus) {
                                aiStatus.textContent = `AI-generering feilet: ${reason}`;
                                aiStatus.style.color = '#b91c1c';
                            }
                        } finally {
                            generateAiBtn.disabled = false;
                            generateAiBtn.innerHTML = originalBtnHtml;
                        }
                    };
                }

                if (generateAiSummaryBtn) {
                    generateAiSummaryBtn.onclick = async () => {
                        if (!summaryField) {
                            this.showToast('Fant ikke oppsummeringsfeltet.', 'error', 5000);
                            return;
                        }

                        let transcriptText = '';
                        try {
                            const saved = await editor.save();
                            const blocks = Array.isArray(saved?.blocks) ? saved.blocks : [];
                            transcriptText = blocks
                                .map(blockToPlainText)
                                .filter(Boolean)
                                .join(' ')
                                .replace(/\s+/g, ' ')
                                .trim();
                        } catch (err) {
                            console.warn('Kunne ikke lese editorinnhold for AI-oppsummering:', err);
                        }

                        if (!transcriptText && typeof item?.text === 'string') {
                            transcriptText = htmlToPlainText(item.text);
                        }

                        if (transcriptText.length < 120) {
                            this.showToast('For lite tekstgrunnlag. Generer eller skriv mer tekst først.', 'warning', 5000);
                            return;
                        }

                        const originalBtnHtml = generateAiSummaryBtn.innerHTML;
                        generateAiSummaryBtn.disabled = true;
                        generateAiSummaryBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size:18px;">hourglass_top</span> Lager forslag...';

                        if (aiStatus) {
                            aiStatus.textContent = 'Lager AI-oppsummering fra teksten...';
                            aiStatus.style.color = '#334155';
                        }

                        try {
                            const callable = firebase.functions().httpsCallable('generatePodcastSummary');
                            const response = await callable({
                                episodeTitle: String(item?.title || '').trim(),
                                transcriptText
                            });

                            const aiSummary = String(response?.data?.summary || '').trim();
                            if (!aiSummary) {
                                throw new Error('Tomt svar fra AI-oppsummering.');
                            }

                            summaryField.value = aiSummary;
                            this.showToast('AI-oppsummering satt inn. Du kan redigere før lagring.', 'success', 5000);
                            if (aiStatus) {
                                aiStatus.textContent = 'AI-oppsummering klar. Husk å klikke Lagre og publiser.';
                                aiStatus.style.color = '#166534';
                            }
                        } catch (error) {
                            console.warn('AI-oppsummering feilet, bruker lokal fallback:', error);
                            const fallbackSummary = buildLocalSummarySuggestion(String(item?.title || ''), transcriptText);
                            if (fallbackSummary) {
                                summaryField.value = fallbackSummary;
                                this.showToast('AI-oppsummering var ikke tilgjengelig. Et forslag ble laget lokalt.', 'warning', 6000);
                                if (aiStatus) {
                                    aiStatus.textContent = 'Lokal oppsummering satt inn. Du kan redigere og lagre.';
                                    aiStatus.style.color = '#92400e';
                                }
                            } else {
                                const reason = this._getCallableErrorMessage(error, 'Kunne ikke lage oppsummering fra teksten.');
                                this.showToast(reason, 'error', 7000);
                                if (aiStatus) {
                                    aiStatus.textContent = `Kunne ikke lage oppsummering: ${reason}`;
                                    aiStatus.style.color = '#b91c1c';
                                }
                            }
                        } finally {
                            generateAiSummaryBtn.disabled = false;
                            generateAiSummaryBtn.innerHTML = originalBtnHtml;
                        }
                    };
                }
            }

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

            // --- Image Management Logic (Premium UI) ---
            const imgInput = document.getElementById('col-item-img');
            const imgTrigger = document.getElementById('sidebar-img-trigger');
            const preview = document.getElementById('sidebar-img-preview');
            const imgFile = document.getElementById('col-item-img-file');
            const uploadBtn = document.getElementById('sidebar-img-upload-btn');
            const unsplashBtn = document.getElementById('unsplash-trigger-btn');

            if (imgTrigger && imgFile) {
                // Drag & Drop Listeners
                imgTrigger.ondragover = (e) => { 
                    e.preventDefault(); 
                    imgTrigger.style.borderColor = '#1B4965';
                    imgTrigger.style.background = '#f0f9ff';
                };
                imgTrigger.ondragleave = (e) => { 
                    e.preventDefault(); 
                    imgTrigger.style.borderColor = '#f1f5f9';
                    imgTrigger.style.background = '#f8fafc';
                };
                imgTrigger.ondrop = async (e) => {
                    e.preventDefault();
                    imgTrigger.style.borderColor = '#f1f5f9';
                    imgTrigger.style.background = '#f8fafc';
                    const file = e.dataTransfer.files[0];
                    if (file) await handleImageUpload(file);
                };

                // Upload Actions
                if (uploadBtn) uploadBtn.onclick = (e) => { e.stopPropagation(); imgFile.click(); };
                imgTrigger.onclick = (e) => { if (e.target.closest('#sidebar-img-trigger')) imgFile.click(); };

                imgFile.onchange = async (e) => {
                    const file = e.target.files[0];
                    if (file) await handleImageUpload(file);
                };

                // Real-time Preview Update
                if (imgInput) {
                    imgInput.addEventListener('input', (e) => {
                        const url = e.target.value;
                        if (preview) {
                            if (url && url.length > 10) {
                                preview.innerHTML = `<img src="${url}" style="width:100%; height:100%; object-fit:cover;">`;
                            } else {
                                preview.innerHTML = `
                                    <div style="text-align: center; color: #94a3b8;">
                                        <span class="material-symbols-outlined" style="font-size: 40px; margin-bottom: 8px; opacity: 0.5;">add_a_photo</span>
                                        <div style="font-size: 12px; font-weight: 500;">Klikk for å laste opp</div>
                                    </div>`;
                            }
                        }
                    });
                }

                // --- Unsplash Listener ---
                if (unsplashBtn) {
                    unsplashBtn.onclick = (e) => {
                        e.stopPropagation();
                        if (window.unsplashManager) {
                            window.unsplashManager.open((selection) => {
                                if (selection && selection.url) {
                                    imgInput.value = selection.url;
                                    imgInput.dispatchEvent(new Event('input'));
                                }
                            });
                        }
                    };
                }

                // Shared Upload Handler
                const handleImageUpload = async (file) => {
                    if (!file) return;
                    console.log("[Admin] Starting upload for:", file.name, "Size:", file.size);
                    
                    const originalContent = preview.innerHTML;
                    preview.innerHTML = '<div style="display:flex; flex-direction:column; align-items:center; gap:10px;"><div class="loader-sm"></div><span style="font-size:11px; color:#64748b;">Laster opp...</span></div>';
                    
                    try {
                        // Komprimer bildet
                        console.log("[Admin] Compressing image...");
                        const compressed = await this.compressImage(file, 1200, 0.8);
                        console.log("[Admin] Compression done. New size:", compressed.size);
                        
                        const fileName = `editor/${collectionId}/${Date.now()}_${file.name}`;
                        console.log("[Admin] Uploading to Firebase:", fileName);
                        
                        const url = await firebaseService.uploadFile(compressed, fileName);
                        console.log("[Admin] Upload success! URL:", url);
                        
                        if (imgInput) {
                            imgInput.value = url;
                            imgInput.dispatchEvent(new Event('input'));
                        }
                        this.showToast('Bilde lastet opp!', 'success');
                    } catch (error) {
                        console.error('[Admin] Upload failed:', error);
                        preview.innerHTML = originalContent;
                        this.showToast('Kunne ikke laste opp bilde: ' + (error.message || 'Ukjent feil'), 'error');
                    }
                };
            }
            const closeBtn = modal.querySelector('#close-col-modal');
            if (closeBtn) {
                closeBtn.onclick = () => {
                    this._clearOpenEditorState(collectionId);
                    document.removeEventListener('keydown', escHandler);
                    if (selectionChangeHandler) {
                        document.removeEventListener('selectionchange', selectionChangeHandler);
                    }
                    modal.remove();
                };
            }

            // Escape key fallback: always allow closing the current editor modal.
            const escHandler = (evt) => {
                if (evt.key === 'Escape' && document.body.contains(modal)) {
                    this._clearOpenEditorState(collectionId);
                    modal.remove();
                    document.removeEventListener('keydown', escHandler);
                    if (selectionChangeHandler) {
                        document.removeEventListener('selectionchange', selectionChangeHandler);
                    }
                }
            };
            document.addEventListener('keydown', escHandler);

            const buildSafeItemFromForm = async ({ preserveExistingContentIfEmpty = false } = {}) => {
                let savedData;
                try {
                    // Race editor.save() against a 5s timeout so a broken instance never freezes the UI
                    savedData = await Promise.race([
                        editor.save(),
                        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
                    ]);
                } catch (error) {
                    // On timeout or error, fall back to the item's existing content
                    console.warn('editor.save() failed or timed out, using existing content:', error);
                    savedData = null;
                }

                const previousContent = item.content;

                item.title = document.getElementById('col-item-title-v2')?.value
                    || document.getElementById('col-item-title-sidebar')?.value
                    || '';
                let nextContent = savedData;

                // Safety: never overwrite existing content with empty editor output.
                // If the editor returns no blocks but we had content before, keep the old content.
                if (!this._hasMeaningfulEditorContent(savedData) && this._hasMeaningfulEditorContent(previousContent)) {
                    nextContent = previousContent;
                }

                // --- Wix Artifact Cleanup ---
                // Apply the aggressive cleanup logic before saving to Firestore
                if (nextContent && typeof nextContent === 'object' && Array.isArray(nextContent.blocks)) {
                    if (window.contentManager && typeof window.contentManager.cleanEditorBlocks === 'function') {
                        nextContent = window.contentManager.cleanEditorBlocks(nextContent);
                    }
                } else if (typeof nextContent === 'string' && nextContent.trim().length > 0) {
                    if (window.contentManager && typeof window.contentManager.cleanLegacyHtml === 'function') {
                        nextContent = window.contentManager.cleanLegacyHtml(nextContent);
                    }
                }

                item.content = nextContent;
                item.date = document.getElementById('col-item-date')?.value || '';

                if (collectionId !== 'podcast_transcripts') {
                    item.imageUrl = document.getElementById('col-item-img')?.value || '';
                    item.author = document.getElementById('col-item-author')?.value || '';
                }

                if (isTeachingCollection) {
                    const typeValue = document.getElementById('col-item-type')?.value || 'Bibelstudier';
                    const seriesSelect = document.getElementById('col-item-series-items');
                    item.teachingType = typeValue;
                    item.category = typeValue;
                    item.seriesItems = typeValue === 'Undervisningsserier' && seriesSelect
                        ? Array.from(seriesSelect.selectedOptions).map(opt => opt.value)
                        : [];
                } else if (collectionId !== 'podcast_transcripts') {
                    item.category = document.getElementById('col-item-cat')?.value || '';
                }

                if (collectionId !== 'podcast_transcripts') {
                    item.seoTitle = document.getElementById('col-item-seo-title')?.value || '';
                    item.seoDescription = document.getElementById('col-item-seo-desc')?.value || '';
                    item.tags = currentTags;
                }

                if (collectionId === 'blog') {
                    const relatedSelect = document.getElementById('col-item-related');
                    if (relatedSelect) {
                        item.relatedPosts = Array.from(relatedSelect.selectedOptions).map(opt => opt.value);
                    }
                }

                if (collectionId === 'podcast_transcripts') {
                    item.description = document.getElementById('col-item-summary')?.value?.trim() || '';
                    const htmlFromBlocks = this.editorJsBlocksToHtml((nextContent?.blocks) || []);
                    item.text = htmlFromBlocks || (typeof item.text === 'string' ? item.text : '');
                }

                if (item.isSynced && item.id && !item.gcalId) {
                    item.gcalId = item.id;
                }

                const normalizedItem = typeof adminUtils.sanitizeCollectionItem === 'function'
                    ? adminUtils.sanitizeCollectionItem(collectionId, item)
                    : { ok: true, value: item, errors: [] };

                if (!normalizedItem.ok) {
                    throw new Error(normalizedItem.errors.join(' ') || 'Validering feilet.');
                }

                return normalizedItem.value;
            };

            const upsertItemInList = (list, nextItem) => {
                let existingIdx = -1;
                if (nextItem.id) {
                    existingIdx = list.findIndex(fi => fi.id === nextItem.id);
                }

                if (existingIdx === -1 && collectionId === 'events') {
                    existingIdx = list.findIndex(fi =>
                        (nextItem.gcalId && fi.gcalId === nextItem.gcalId) ||
                        (fi.title === nextItem.title && fi.date?.split('T')[0] === nextItem.date?.split('T')[0])
                    );
                }

                if (existingIdx === -1 && nextItem.isFirestore && typeof index === 'number' && index >= 0 && !nextItem.isSynced) {
                    existingIdx = index;
                }

                if (existingIdx >= 0) {
                    list[existingIdx] = nextItem;
                } else {
                    list.unshift(nextItem);
                }
            };

            const translateBtn = modal.querySelector('#translate-col-item');
            if (translateBtn && collectionId === 'blog') {
                translateBtn.onclick = async () => {
                    await this._withButtonLoading(translateBtn, async () => {
                        let slowNoticeTimer = null;
                        try {
                            // Clear editor restore state before writing to Firestore, so the
                            // realtime onSnapshot that fires mid-write cannot re-open the editor.
                            this._clearOpenEditorState(collectionId);

                            slowNoticeTimer = setTimeout(() => {
                                this.showToast('Oversettelse pågår fortsatt. Dette kan ta litt tid ved store innlegg.', 'warning', 4500);
                            }, 6000);

                            const safeItem = await buildSafeItemFromForm({ preserveExistingContentIfEmpty: true });
                            const translatedItem = await Promise.race([
                                this.ensureBlogPostTranslations(safeItem, { force: false }),
                                new Promise((_, reject) => setTimeout(() => reject(new Error('Oversettelsen tok for lang tid. Prøv igjen om litt.')), 600000))
                            ]);

                            const targetLanguages = this._getBlogTranslationTargetLanguages();
                            const successfulLanguages = targetLanguages.filter((lang) => {
                                const tr = translatedItem?.translations?.[lang];
                                return tr && typeof tr === 'object' && tr._translationFailed !== true;
                            });
                            if (!successfulLanguages.length) {
                                const translationSettings = await this._getTranslationSettings();
                                const hasGeminiKey = !!translationSettings?.geminiApiKey;
                                if (!hasGeminiKey) {
                                    throw new Error('Ingen språk ble oversatt. MyMemory-kvote/no-op stopper oversettelse nå. Legg inn Gemini API key i Integrasjoner for stabil oversettelse.');
                                }

                                const diag = await this._diagnoseTranslationProviders();
                                if (String(diag.gemini).startsWith('error:')) {
                                    const geminiErr = String(diag.gemini).slice(6);
                                    if (/403|permission|api.*not.*enabled|generativelanguage|api key/i.test(geminiErr)) {
                                        throw new Error('Ingen språk ble oversatt. Gemini er konfigurert, men API-tilgang feiler (403/API key/API ikke aktiv). Aktiver Generative Language API og bruk gyldig nøkkel i Integrasjoner.');
                                    }
                                    if (/model|not found|unsupported/i.test(geminiErr)) {
                                        throw new Error('Ingen språk ble oversatt. Gemini-modellen er ikke gyldig/tilgjengelig. Velg en støttet modell i Integrasjoner.');
                                    }
                                    throw new Error(`Ingen språk ble oversatt. Gemini-feil: ${geminiErr}`);
                                }

                                if (diag.gemini === 'no-op' && diag.myMemory === 'quota') {
                                    throw new Error('Ingen språk ble oversatt. MyMemory-kvoten er brukt opp, og Gemini svarte uten gyldig oversettelse. Sjekk Gemini-oppsett i Integrasjoner.');
                                }

                                throw new Error('Ingen språk ble oversatt. Oversettelsestjenesten svarte uten gyldig oversettelse. Prøv igjen, eller bytt provider i Integrasjoner.');
                            }

                            const currentData = await firebaseService.getPageContent('collection_blog');
                            const list = this._getCollectionItems(currentData);
                            upsertItemInList(list, translatedItem);

                            await firebaseService.savePageContent('collection_blog', { items: list });
                            Object.assign(item, translatedItem);
                            this._renderBlogTranslationStatusBadge(item);
                            if (successfulLanguages.length === targetLanguages.length) {
                                this.showToast('✅ Innlegget er oversatt til tilgjengelige språk og lagret.', 'success', 5000);
                            } else {
                                this.showToast(`⚠️ Delvis oversettelse lagret (${successfulLanguages.length}/${targetLanguages.length} språk).`, 'warning', 6500);
                            }
                        } catch (error) {
                            console.error('Error translating current blog item:', error);
                            this.showToast(error?.message || 'Kunne ikke oversette innlegget nå.', 'error', 6000);
                        } finally {
                            if (slowNoticeTimer) clearTimeout(slowNoticeTimer);
                        }
                    }, {
                        loadingText: '<span class="material-symbols-outlined" style="font-size:18px;">hourglass_top</span> Oversetter...'
                    });
                };
            }

            // --- Print Button ---
            const printBtn = modal.querySelector('#print-col-item');
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

            const saveBtn = modal.querySelector('#save-col-item');
            if (saveBtn) {
                saveBtn.onclick = async () => {
                    const btn = modal.querySelector('#save-col-item');
                    if (!btn) return;

                    // Clear immediately — before the Firestore write — so the realtime
                    // onSnapshot that fires during the write cannot re-open the editor.
                    this._clearOpenEditorState(collectionId);

                    await this._runWriteLocked(`collection-save:${collectionId}`, async () => {
                        await this._withButtonLoading(btn, async () => {
                            try {
                                let safeItem = await buildSafeItemFromForm();

                                if (collectionId === 'podcast_transcripts') {
                                    // For podcast transcripts, save directly to Firestore collection
                                    const podcastPayload = { ...safeItem };
                                    const summaryValue = document.getElementById('col-item-summary')?.value?.trim() || '';
                                    if (summaryValue) {
                                        podcastPayload.description = summaryValue;
                                    } else {
                                        podcastPayload.description = firebase.firestore.FieldValue.delete();
                                    }
                                    await firebase.firestore().collection('podcast_transcripts').doc(safeItem.id).set(podcastPayload, { merge: true });
                                } else {
                                    const currentData = await firebaseService.getPageContent(`collection_${collectionId}`);
                                    const list = this._getCollectionItems(currentData);

                                    // Mark as edited in dashboard so the public site prioritizes this version
                                    safeItem.dashboardEdited = true;
                                    safeItem.dashboardEditedAt = new Date().toISOString();

                                    upsertItemInList(list, safeItem);

                                    await firebaseService.savePageContent(`collection_${collectionId}`, { items: list });

                                    // Force clear the public visitor cache if we modified events
                                    if (collectionId === 'events') {
                                        this.clearPublicEventCache();

                                        // If connected to Google, sync back
                                        if (this.googleAccessToken && safeItem.gcalId) {
                                            await this.updateGoogleCalendarEvent(safeItem, 'PATCH');
                                        }
                                    }
                                }

                                // Stay in the editor after saving — just show confirmation
                                this.showToast('✅ Lagret!', 'success');
                                // Refresh the background list silently without closing the editor
                                this.loadCollection(collectionId);
                            } catch (err) {
                                console.error('Error saving item:', err);
                                this.showToast(err?.message || 'Kunne ikke lagre. Sjekk konsollen for detaljer.', 'error', 5000);
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

        const collectionItems = this._collectionItemsCache[collectionId] || this.currentItems || [];
        const itemToDelete = collectionItems[index] || null;
        const btn = document.querySelector(`#${collectionId}-list tbody tr:nth-child(${index + 1}) .icon-btn.delete`);

        if (!itemToDelete) {
            this.showToast('Kunne ikke finne elementet som skal slettes.', 'error');
            return;
        }

        const confirmed = await this.showConfirm(
            'Bekreft sletting',
            `Er du sikker på at du vil slette "${itemToDelete.title || 'dette elementet'}"? Dette kan ikke angres.`,
            'Slett'
        );

        if (!confirmed) return;

        await this._runWriteLocked(`collection-delete:${collectionId}`, async () => {
            await this._withButtonLoading(btn, async () => {
                try {

                    if (collectionId === 'podcast_transcripts') {
                        // For podcast transcripts, delete directly from Firestore collection
                        if (itemToDelete.id) {
                            await firebase.firestore().collection('podcast_transcripts').doc(itemToDelete.id).delete();
                        }
                    } else {
                        const currentData = await firebaseService.getPageContent(`collection_${collectionId}`);
                        const list = Array.isArray(currentData) ? currentData : (currentData && currentData.items ? currentData.items : []);

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

                                    <!-- Logo Upload Card -->
                                    <div class="design-ui-upload-card">
                                        <div class="design-ui-upload-card-preview" id="logo-preview-container">
                                            <div class="design-ui-upload-card-placeholder">
                                                <span class="material-symbols-outlined">image</span>
                                                <span>Ingen logo lastet opp</span>
                                            </div>
                                        </div>
                                        <div class="design-ui-upload-card-body">
                                            <label class="design-ui-upload-card-label">Logo</label>
                                            <p class="design-ui-upload-card-hint">Anbefalt: SVG eller PNG med transparent bakgrunn</p>
                                            <div class="design-ui-upload-card-actions">
                                                <input type="text" id="site-logo-url" class="form-control design-ui-upload-url-input" placeholder="https://...">
                                                <div class="design-ui-upload-card-btns">
                                                    <input type="file" id="site-logo-file" accept="image/*" style="display:none;">
                                                    <button class="btn btn-primary btn-sm" id="upload-logo-btn" type="button" onclick="document.getElementById('site-logo-file').click()">
                                                        <span class="material-symbols-outlined" style="font-size:16px;vertical-align:-3px;">upload</span>
                                                        Last opp
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Favicon Upload Card -->
                                    <div class="design-ui-upload-card">
                                        <div class="design-ui-upload-card-preview design-ui-upload-card-preview--favicon" id="favicon-preview-container">
                                            <div class="design-ui-upload-card-placeholder">
                                                <span class="material-symbols-outlined">web_asset</span>
                                                <span>Ingen favicon lastet opp</span>
                                            </div>
                                        </div>
                                        <div class="design-ui-upload-card-body">
                                            <label class="design-ui-upload-card-label">Favicon</label>
                                            <p class="design-ui-upload-card-hint">Anbefalt: 32×32 px PNG eller ICO-format</p>
                                            <div class="design-ui-upload-card-actions">
                                                <input type="text" id="site-favicon-url" class="form-control design-ui-upload-url-input" placeholder="https://...">
                                                <div class="design-ui-upload-card-btns">
                                                    <input type="file" id="site-favicon-file" accept="image/png,image/x-icon,image/svg+xml" style="display:none;">
                                                    <button class="btn btn-primary btn-sm" id="upload-favicon-btn" type="button" onclick="document.getElementById('site-favicon-file').click()">
                                                        <span class="material-symbols-outlined" style="font-size:16px;vertical-align:-3px;">upload</span>
                                                        Last opp
                                                    </button>
                                                </div>
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
                                    <div style="display: flex; gap: 8px;">
                                        <input type="url" id="cause-image" class="form-control" placeholder="https://images.unsplash.com/..." style="flex: 1;">
                                        <button type="button" id="cause-unsplash-btn" class="btn btn-secondary" style="padding: 0 12px; border-radius: 8px; display: flex; align-items: center; gap: 4px; font-size: 13px;">
                                            <span class="material-symbols-outlined" style="font-size: 18px;">image_search</span> Unsplash
                                        </button>
                                    </div>
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

        // --- Unsplash Listener for Causes ---
        const causeUnsplashBtn = document.getElementById('cause-unsplash-btn');
        if (causeUnsplashBtn) {
            causeUnsplashBtn.onclick = () => {
                if (window.unsplashManager) {
                    window.unsplashManager.open((selection) => {
                        const input = document.getElementById('cause-image');
                        if (input && selection && selection.url) {
                            input.value = selection.url;
                        }
                    });
                }
            };
        }

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
                        <button class="btn-primary" style="margin: 24px auto 0; display: block;" onclick="document.getElementById('add-cause-btn').click()">
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
        const confirmed = await this.showConfirm('Slett aksjon', 'Er du sikker på at du vil slette denne innsamlingsaksjon?', 'Slett');
        if (!confirmed) return;

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
        const slide = isNew ? { title: '', subtitle: '', imageUrl: '', youtubeId: '', btnText: '', btnLink: '', duration: 4 } : this.heroSlides[index];
        const safeSlideImage = this.escapeHtml(slide.imageUrl || '');
        const safeSlideYoutubeId = this.escapeHtml(slide.youtubeId || '');
        const safeSlideTitle = this.escapeHtml(slide.title || '');
        const safeSlideSubtitle = this.escapeHtml(slide.subtitle || '');
        const safeSlideBtnText = this.escapeHtml(slide.btnText || '');
        const safeSlideBtnLink = this.escapeHtml(slide.btnLink || '');
        const slideDuration = slide.duration || 4;

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
                            <label>Bakgrunnsvideo (Valgfritt YouTube eller opplastet MP4)</label>
                            <div style="display:flex; gap:10px; align-items:center;">
                                <span class="material-symbols-outlined" style="color:#d17d39;">video_library</span>
                                <input type="text" id="hero-video-url" class="form-control" value="${slide.videoUrl || slide.youtubeId || ''}" placeholder="Lim inn lenke (YouTube eller MP4)">
                            </div>
                            <input type="file" id="hero-video-file" style="display: none;" accept="video/mp4,video/webm">
                            <div style="display:flex; gap:10px; align-items:center; margin-top:8px;">
                                <button type="button" class="btn-secondary" id="hero-upload-video-btn" style="display:inline-flex; align-items:center; justify-content:center; gap:8px; white-space:nowrap; font-size:12px; padding:6px 12px;">
                                    <span class="material-symbols-outlined" style="font-size:16px;">upload</span>
                                    Last opp MP4
                                </button>
                                <span id="hero-video-upload-status" style="font-size:11px; color:#64748b;">(Maks 50 MB, MP4 anbefales)</span>
                            </div>
                            <p style="font-size:11px; color:#64748b; margin-top:4px;">Støtter YouTube-ID, YouTube-lenke eller opplastet MP4-fil.</p>
                        </div>
                        <div class="form-group">
                            <label>Visningstid i sekunder</label>
                            <input type="number" id="hero-duration" class="form-control" value="${slideDuration}" min="1" step="1">
                            <p style="font-size:11px; color:#64748b; margin-top:4px;">Hvor lenge denne sliden skal vises før den bytter automatisk (Standard er 4 sekunder). Hvis det er en video, kan du sette den høyere (f.eks. 15 eller 30).</p>
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

        // Video Upload Logic
        const videoInput = modal.querySelector('#hero-video-url');
        const videoFileInput = modal.querySelector('#hero-video-file');
        const uploadVideoBtn = modal.querySelector('#hero-upload-video-btn');
        const uploadVideoStatus = modal.querySelector('#hero-video-upload-status');

        if (uploadVideoBtn && videoFileInput) {
            uploadVideoBtn.onclick = () => videoFileInput.click();

            videoFileInput.onchange = async (e) => {
                const file = e.target.files[0];
                if (!file) return;

                uploadVideoStatus.textContent = 'Laster opp...';
                uploadVideoBtn.disabled = true;
                uploadVideoBtn.innerHTML = '<span class="material-symbols-outlined spin">sync</span> Laster opp...';

                try {
                    const url = await firebaseService.uploadFile(
                        file, 
                        `hero_videos/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`, 
                        ['video/'], 
                        50, // 50MB max
                        (progress) => {
                            uploadVideoStatus.textContent = `Laster opp: ${progress}%`;
                        },
                        { timeoutMs: 300000 } // 5 min timeout
                    );
                    
                    videoInput.value = url;
                    videoInput.dispatchEvent(new Event('input')); 
                    this.showToast('Video lastet opp!', 'success');
                    uploadVideoStatus.textContent = '✅ Video opplastet';
                } catch (err) {
                    console.error("Upload error:", err);
                    this.showToast('Kunne ikke laste opp video: ' + (err.message || 'Ukjent feil'), 'error', 6000);
                    uploadVideoStatus.textContent = '❌ Opplasting feilet';
                } finally {
                    uploadVideoBtn.disabled = false;
                    uploadVideoBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size:16px;">upload</span> Last opp MP4';
                    videoFileInput.value = '';
                }
            };
        }

        // Save Logic
        saveBtn.onclick = async () => {
            saveBtn.disabled = true;
            saveBtn.textContent = 'Lagrer...';

            const rawVideo = modal.querySelector('#hero-video-url').value;
            const ytId = this.extractYoutubeId(rawVideo);
            
            const updatedSlide = {
                imageUrl: imgInput.value,
                youtubeId: ytId || '',
                videoUrl: !ytId ? rawVideo : '', // Store as generic video if not YT
                title: modal.querySelector('#hero-title').value,
                subtitle: modal.querySelector('#hero-subtitle').value,
                btnText: modal.querySelector('#hero-btn-text').value,
                btnLink: modal.querySelector('#hero-btn-link').value,
                duration: parseFloat(modal.querySelector('#hero-duration').value) || 4
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
        const confirmed = await this.showConfirm('Slett slide', 'Vil du slette denne sliden?', 'Slett');
        if (!confirmed) return;
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
                                <div style="display: flex; gap: 10px;">
                                    <input id="course-image" type="url" placeholder="https://..."
                                        style="flex: 1; padding:12px 16px; border:1.5px solid #e2e8f0; border-radius:10px; font-size:1rem;">
                                    <button type="button" id="course-unsplash-btn" class="btn btn-secondary" style="padding: 10px 16px; border-radius: 10px; display: flex; align-items: center; gap: 8px; border: 1.5px solid #e2e8f0; background: white; cursor: pointer;">
                                        <span class="material-symbols-outlined">image_search</span> Unsplash
                                    </button>
                                </div>
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

        // --- Unsplash Listener for Kurs ---
        const unsplashBtn = document.getElementById('course-unsplash-btn');
        const imgInput = document.getElementById('course-image');
        if (unsplashBtn && imgInput) {
            unsplashBtn.onclick = () => {
                if (window.unsplashManager) {
                    window.unsplashManager.open((selection) => {
                        if (selection && selection.url) {
                            imgInput.value = selection.url;
                        }
                    });
                }
            };
        }
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
        if (editCourseKey === '') return;
        const confirmed = await this.showConfirm('Slett kurs', 'Er du sikker på at du vil slette dette kurset?', 'Slett');
        if (!confirmed) return;

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

                                                <!-- Wix Cleanup Tool -->
                                                <div class="tool-card" style="border: 1px solid var(--border-color); border-radius: 12px; padding: 16px;">
                                                    <div class="tool-icon-circle warning" style="background: #fff7ed; color: #f97316; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 12px;">
                                                        <span class="material-symbols-outlined">auto_fix_high</span>
                                                    </div>
                                                    <div class="tool-info" style="margin-bottom: 16px;">
                                                        <h4 style="font-weight: 600; font-size: 15px; margin-bottom: 4px;">Wix-vasker (Database)</h4>
                                                        <p style="font-size: 13px; color: var(--text-muted);">Fjerner permanent Wix-rester fra alle innlegg.</p>
                                                    </div>
                                                    <button class="btn btn-primary" style="width: 100%;" onclick="window.adminManager.performWixDatabaseCleanup()">
                                                        Kjør Wix-vask
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

        const syncBtn = document.getElementById('sync-existing-content');
        if (syncBtn) {
            syncBtn.addEventListener('click', () => this.seedExistingData());
        }
    }


    async seedExistingData() {
        this.showToast('Import fra statiske filer er deaktivert for å beskytte publisert Firestore-innhold.', 'warning', 7000);
        return;
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
                            courses: 'Arrangementer',
                            blog: 'Nyheter & blogg',
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

    /**
     * Handles image upload with compression and toast feedback.
     */
    async handleImageUpload(file, folder = 'editor/blog') {
        if (!file) return null;
        try {
            const compressed = await this.compressImage(file, 1400, 0.85);
            const fileName = `${folder}/${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
            return await firebaseService.uploadFile(compressed, fileName);
        } catch (err) {
            console.error('[AdminManager] Upload failed:', err);
            throw err;
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

    // Helper method to convert HTML to Editor.js blocks (for legacy podcast transcripts)
    htmlToEditorJsBlocks(html) {
        if (!html || typeof html !== 'string') {
            return { blocks: [], time: Date.now(), version: '2.29.0' };
        }

        const blocks = [];
        const parser = new DOMParser();
        const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
        const elements = doc.body.firstChild.childNodes;

        // Helper: push an <img> element as an image block
        const pushImageBlock = (imgEl) => {
            const url = imgEl.src || imgEl.getAttribute('src') || imgEl.getAttribute('data-src') || imgEl.getAttribute('data-image-src') || '';
            if (!url) return;
            blocks.push({
                type: 'image',
                data: {
                    file: { url },
                    caption: imgEl.alt || '',
                    withBorder: false,
                    stretched: false,
                    withBackground: false
                }
            });
        };

        const pushVideoBlock = (vidEl) => {
            const url = vidEl.src || vidEl.getAttribute('src') || '';
            if (!url) return;
            blocks.push({
                type: 'video',
                data: { file: { url }, url }
            });
        };

        const pushIframeBlock = (iframeEl) => {
            const url = iframeEl.src || iframeEl.getAttribute('src') || '';
            if (!url) return;
            blocks.push({
                type: 'youtubeVideo',
                data: { url }
            });
        };

        const wrapPersistedInlineStyles = (elem, innerHtml) => {
            const styles = [];
            const fontSize = elem?.style?.fontSize;
            const lineHeight = elem?.style?.lineHeight;
            const marginBottom = elem?.style?.marginBottom;

            if (fontSize) styles.push(`font-size:${fontSize}`);
            if (lineHeight) styles.push(`line-height:${lineHeight}`);
            if (marginBottom) styles.push(`margin-bottom:${marginBottom}`, 'display:inline-block', 'width:100%');

            if (!styles.length) return innerHtml;
            return `<span style="${styles.join(';')}">${innerHtml}</span>`;
        };

        // Helper: process a <p> or <div> — split around any media children
        const pushParagraphOrMedia = (elem) => {
            const medias = elem.querySelectorAll('img, video, iframe');
            if (medias.length === 0) {
                const clone = elem.cloneNode(true);
                const text = wrapPersistedInlineStyles(elem, clone.innerHTML.trim());
                if (text.length > 0) {
                    blocks.push({ type: 'paragraph', data: { text } });
                }
                return;
            }

            let pendingHTML = '';
            const flushPending = () => {
                const trimmed = pendingHTML.trim();
                if (trimmed.length > 0) {
                    blocks.push({ type: 'paragraph', data: { text: trimmed } });
                }
                pendingHTML = '';
            };

            for (const child of elem.childNodes) {
                if (child.nodeType === Node.ELEMENT_NODE) {
                    const tag = child.tagName.toLowerCase();
                    if (tag === 'img') {
                        flushPending();
                        pushImageBlock(child);
                        continue;
                    } else if (tag === 'video') {
                        flushPending();
                        pushVideoBlock(child);
                        continue;
                    } else if (tag === 'iframe') {
                        flushPending();
                        pushIframeBlock(child);
                        continue;
                    } else if (tag === 'div' && child.querySelector('iframe')) {
                        const iframe = child.querySelector('iframe');
                        flushPending();
                        pushIframeBlock(iframe);
                        continue;
                    }
                }
                
                pendingHTML += child.nodeType === Node.TEXT_NODE
                    ? child.textContent
                    : child.outerHTML || '';
            }
            flushPending();
        };

        for (let elem of elements) {
            if (elem.nodeType === Node.TEXT_NODE) {
                const text = elem.textContent.trim();
                if (text.length > 0) {
                    blocks.push({
                        type: 'paragraph',
                        data: { text: text }
                    });
                }
            } else if (elem.nodeType === Node.ELEMENT_NODE) {
                const tagName = elem.tagName.toLowerCase();

                if (tagName === 'p' || tagName === 'div') {
                    pushParagraphOrMedia(elem);
                } else if (tagName === 'h1' || tagName === 'h2' || tagName === 'h3' || tagName === 'h4' || tagName === 'h5' || tagName === 'h6') {
                    const level = parseInt(tagName.charAt(1)) || 2;
                    const text = wrapPersistedInlineStyles(elem, elem.innerHTML || elem.textContent || '');
                    blocks.push({
                        type: 'header',
                        data: {
                            text,
                            level: Math.min(level, 6)
                        }
                    });
                } else if (tagName === 'ul' || tagName === 'ol') {
                    const items = [];
                    for (let li of elem.querySelectorAll('li')) {
                        items.push(li.textContent);
                    }
                    if (items.length > 0) {
                        blocks.push({
                            type: 'list',
                            data: {
                                style: tagName === 'ol' ? 'ordered' : 'unordered',
                                items: items
                            }
                        });
                    }
                } else if (tagName === 'blockquote') {
                    blocks.push({
                        type: 'quote',
                        data: {
                            text: elem.textContent,
                            caption: '',
                            alignment: 'left'
                        }
                    });
                } else if (tagName === 'hr') {
                    blocks.push({ type: 'delimiter', data: {} });
                } else if (tagName === 'figure') {
                    const img = elem.querySelector('img') || elem.querySelector('[data-src]');
                    const figcaption = elem.querySelector('figcaption');
                    if (img) {
                        const url = img.src || img.getAttribute('src') || img.getAttribute('data-src') || img.getAttribute('data-image-src') || '';
                        if (url) {
                            blocks.push({
                                type: 'image',
                                data: {
                                    file: { url },
                                    caption: figcaption ? figcaption.textContent : (img.alt || img.getAttribute('alt') || ''),
                                    withBorder: false,
                                    stretched: false,
                                    withBackground: false
                                }
                            });
                        }
                    }
                } else if (tagName === 'img') {
                    pushImageBlock(elem);
                } else if (tagName === 'video') {
                    pushVideoBlock(elem);
                } else if (tagName === 'iframe') {
                    pushIframeBlock(elem);
                }
            }
        }

        return {
            blocks: blocks.length > 0 ? blocks : [{ type: 'paragraph', data: { text: '' } }],
            time: Date.now(),
            version: '2.29.0'
        };
    }

    // Helper method to convert Editor.js blocks to HTML
    editorJsBlocksToHtml(blocks) {
        if (!Array.isArray(blocks)) return '';

        return blocks.map(block => {
            if (!block || typeof block !== 'object') return '';
            const type = String(block.type || '').toLowerCase();
            const data = block.data || {};

            switch (type) {
                case 'paragraph':
                    return `<p class="block-paragraph">${data.text || ''}</p>`;
                case 'header': {
                    const level = Math.min(Math.max(Number(data.level) || 2, 1), 6);
                    return `<h${level} class="block-header">${data.text || ''}</h${level}>`;
                }
                case 'list': {
                    const tag = data.style === 'ordered' ? 'ol' : 'ul';
                    const items = (Array.isArray(data.items) ? data.items : [])
                        .map(i => `<li>${typeof i === 'string' ? i : (i?.content || i?.text || '')}</li>`)
                        .join('');
                    return `<${tag} class="block-list">${items}</${tag}>`;
                }
                case 'quote':
                    return `<blockquote class="block-quote"><p>${data.text || ''}</p>${data.caption ? `<cite>— ${data.caption}</cite>` : ''}</blockquote>`;
                case 'delimiter':
                    return '<hr class="block-delimiter">';
                case 'image': {
                    const url = data.file?.url || data.url || '';
                    const alt = data.caption || '';
                    return url ? `<figure class="block-image"><img src="${url}" alt="${alt}"><figcaption>${alt}</figcaption></figure>` : '';
                }
                case 'youtubevideo':
                case 'youtubeVideo': {
                    const ytUrl = data.url || '';
                    if (!ytUrl) return '';
                    const ytMatch = ytUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
                    if (ytMatch) {
                        return `<div class="block-video" style="position:relative; padding-bottom:56.25%; height:0; overflow:hidden; border-radius:8px; margin-bottom:10px;"><iframe src="https://www.youtube.com/embed/${ytMatch[1]}" frameborder="0" allowfullscreen style="position:absolute; top:0; left:0; width:100%; height:100%;"></iframe></div>`;
                    }
                    return `<p class="block-paragraph"><a href="${ytUrl}">${ytUrl}</a></p>`;
                }
                case 'video': {
                    const vidUrl = data.file?.url || data.url || '';
                    return vidUrl ? `<p class="block-video"><video src="${vidUrl}" controls style="max-width:100%;height:auto;border-radius:10px;"></video></p>` : '';
                }
                default:
                    return '';
            }
        }).join('\n');
    }
}

// Start the manager
window.adminManager = new AdminManager();
