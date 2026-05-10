// ===================================
// Firebase Service Wrapper (Compat Version)
// ===================================

class FirebaseService {
    constructor() {
        this.app = null;
        this.db = null;
        this.auth = null;
        this.storage = null;
        this._activeConfig = null;
        this.isInitialized = false;
        this._authPersistencePromise = null;
        this._defaultReadTimeoutMs = 12000;
        this._retryReadTimeoutMs = 20000;
        this._memoCache = new Map(); // In-memory cache for repeated content requests
        this._inFlightContentRequests = new Map();
        this._memoCacheTimestamps = new Map();
        this._contentMemoTtlMs = 2 * 60 * 1000;
        this._collectionCacheTtlMs = 60 * 1000; // 1 min for collections
        this._fetchErrorNoticeTimestamps = new Map();
        this._userRoleCacheTtlMs = 10 * 60 * 1000; // 10 min fallback cache for auth/routing stability
        this._userRoleCacheKeyPrefix = 'hkm_user_role_cache:';
        this.tryAutoInit();
    }

    getStoredConfig() {
        const savedConfig = localStorage.getItem('hkm_firebase_config');
        if (!savedConfig) return null;

        try {
            return JSON.parse(savedConfig);
        } catch (e) {
            console.error("Local config error:", e);
            return null;
        }
    }

    _isValidFirebaseConfig(config) {
        if (!config || typeof config !== 'object') return false;
        const apiKey = typeof config.apiKey === 'string' ? config.apiKey.trim() : '';
        const projectId = typeof config.projectId === 'string' ? config.projectId.trim() : '';
        const appId = typeof config.appId === 'string' ? config.appId.trim() : '';
        return Boolean(apiKey && apiKey !== 'YOUR_API_KEY' && projectId && appId);
    }

    _normalizeFirebaseConfig(config) {
        if (!this._isValidFirebaseConfig(config)) return config;

        const normalized = { ...config };
        if (
            normalized.projectId === 'his-kingdom-ministry'
            && (
                !normalized.storageBucket
                || normalized.storageBucket === 'his-kingdom-ministry.appspot.com'
            )
        ) {
            normalized.storageBucket = 'his-kingdom-ministry.firebasestorage.app';
        }

        return normalized;
    }

    _isAdminLikeRoute() {
        const path = String(window?.location?.pathname || '').toLowerCase();
        return path.includes('/admin/') || path.includes('/minside/');
    }

    _isLocalDevHost() {
        const host = String(window?.location?.hostname || '').toLowerCase();
        return host === 'localhost' || host === '127.0.0.1';
    }

    _shouldPreferRestPublicReads() {
        // Public pages are read-heavy and must remain stable even when Firestore
        // WebChannel long-polling is flaky. Keep SDK reads for admin/minside.
        return !this._isAdminLikeRoute();
    }

    _getReadableConfig() {
        if (this._isValidFirebaseConfig(this._activeConfig)) return this._activeConfig;
        if (this._isValidFirebaseConfig(window.firebaseConfig)) return window.firebaseConfig;
        return null;
    }

    tryAutoInit() {
        if (this.isInitialized) return true;

        // Check if firebase is available globally (from script tag)
        if (typeof firebase === 'undefined') {
            return false;
        }

        const storedConfigRaw = this.getStoredConfig();
        const storedConfig = this._isValidFirebaseConfig(storedConfigRaw) ? this._normalizeFirebaseConfig(storedConfigRaw) : null;
        const bundledConfig = this._isValidFirebaseConfig(window.firebaseConfig) ? this._normalizeFirebaseConfig(window.firebaseConfig) : null;
        const isAdminRoute = this._isAdminLikeRoute();

        // Public pages should prefer bundled config so a stale admin override in localStorage
        // does not break content loading on the frontend.
        if (!isAdminRoute && bundledConfig) {
            if (storedConfig && storedConfig.projectId && bundledConfig.projectId &&
                storedConfig.projectId !== bundledConfig.projectId) {
                console.warn(
                    `[FirebaseService] Ignoring stored Firebase config on public page (projectId=${storedConfig.projectId}); using bundled config (${bundledConfig.projectId}).`
                );
            }
            this.init(bundledConfig);
            return this.isInitialized;
        }

        if (storedConfig) {
            this.init(storedConfig);
            if (this.isInitialized) return true;
        }

        if (bundledConfig) {
            this.init(bundledConfig);
        }

        return this.isInitialized;
    }

    init(config) {
        try {
            // Check if firebase is available globally (from script tag)
            if (typeof firebase === 'undefined') {
                console.error("❌ Firebase SDK not found. Make sure compat scripts are loaded.");
                return;
            }

            // In Compat mode, we check if app is already initialized
            if (!firebase.apps.length) {
                this.app = firebase.initializeApp(config);
            } else {
                this.app = firebase.app();
            }
            if (this._isValidFirebaseConfig(config)) {
                this._activeConfig = { ...config };
            }

            this.db = firebase.firestore();
            this.auth = firebase.auth();
            this.storage = firebase.storage();

            // Improve Firestore reliability in local/dev environments where WebChannel can hang.
            // Must be set before first Firestore operation.
            try {
                const localDev = this._isLocalDevHost();
                const primarySettings = localDev
                    ? {
                        experimentalForceLongPolling: true,
                        useFetchStreams: false,
                        merge: true
                    }
                    : {
                        experimentalAutoDetectLongPolling: true,
                        useFetchStreams: false,
                        merge: true
                    };
                this.db.settings(primarySettings);
            } catch (settingsError) {
                try {
                    // Fallback for SDK variants that reject one of the options above.
                    this.db.settings({ experimentalAutoDetectLongPolling: true, merge: true });
                } catch (fallbackSettingsError) {
                    console.warn("[FirebaseService] Could not apply Firestore transport settings:", fallbackSettingsError || settingsError);
                }
            }

            this.isInitialized = true;
            console.log("✅ Firebase initialized (Compat)");

            // Be explicit about local auth persistence for stable admin sessions.
            this.ensureAuthPersistence().catch(() => { });

            // Enable offline persistence for faster subsequent loads
            // Use synchronizeTabs: true to allow multiple tabs to share the same persistence layer
            this.db.enablePersistence({ synchronizeTabs: true }).catch((err) => {
                if (err.code === 'failed-precondition') {
                    console.warn("[FirebaseService] Persistence failed (multiple tabs open without sync)");
                } else if (err.code === 'unimplemented') {
                    console.warn("[FirebaseService] Persistence not supported by browser");
                }
            });
        } catch (error) {
            console.error("❌ Firebase initialization failed:", error);
        }
    async waitForInitialization(timeoutMs = 5000) {
        if (this.isInitialized) return true;
        
        let count = 0;
        const interval = 100;
        const maxCounts = timeoutMs / interval;
        
        while (!this.isInitialized && count < maxCounts) {
            await new Promise(r => setTimeout(r, interval));
            count++;
        }
        return this.isInitialized;
    }
}

    _decodeFirestoreRestFields(fields = {}) {
        const out = {};
        Object.keys(fields || {}).forEach((key) => {
            out[key] = this._decodeFirestoreRestValue(fields[key]);
        });
        return out;
    }

    _decodeFirestoreRestValue(value) {
        if (!value || typeof value !== 'object') return null;

        if (Object.prototype.hasOwnProperty.call(value, 'nullValue')) return null;
        if (Object.prototype.hasOwnProperty.call(value, 'stringValue')) return value.stringValue;
        if (Object.prototype.hasOwnProperty.call(value, 'booleanValue')) return Boolean(value.booleanValue);
        if (Object.prototype.hasOwnProperty.call(value, 'integerValue')) return Number(value.integerValue);
        if (Object.prototype.hasOwnProperty.call(value, 'doubleValue')) return Number(value.doubleValue);
        if (Object.prototype.hasOwnProperty.call(value, 'timestampValue')) return value.timestampValue;
        if (Object.prototype.hasOwnProperty.call(value, 'referenceValue')) return value.referenceValue;
        if (Object.prototype.hasOwnProperty.call(value, 'bytesValue')) return value.bytesValue;
        if (Object.prototype.hasOwnProperty.call(value, 'geoPointValue')) {
            const gp = value.geoPointValue || {};
            return {
                latitude: Number(gp.latitude),
                longitude: Number(gp.longitude)
            };
        }
        if (Object.prototype.hasOwnProperty.call(value, 'mapValue')) {
            return this._decodeFirestoreRestFields((value.mapValue && value.mapValue.fields) || {});
        }
        if (Object.prototype.hasOwnProperty.call(value, 'arrayValue')) {
            const values = (value.arrayValue && value.arrayValue.values) || [];
            return values.map((v) => this._decodeFirestoreRestValue(v));
        }

        // Unknown Firestore Value shape - return as-is to avoid data loss.
        return value;
    }

    async _fetchDocViaRest(collectionId, docId) {
        if (typeof fetch !== 'function') return undefined;

        const safeCollectionId = typeof collectionId === 'string' ? collectionId.trim() : '';
        const safeDocId = typeof docId === 'string' ? docId.trim() : '';
        if (!safeCollectionId || !safeDocId) return undefined;

        const cfg = this._getReadableConfig();
        if (!this._isValidFirebaseConfig(cfg)) return undefined;

        const projectId = encodeURIComponent(cfg.projectId);
        const encodedDocId = encodeURIComponent(safeDocId);
        const apiKey = encodeURIComponent(cfg.apiKey);
        const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${safeCollectionId}/${encodedDocId}?key=${apiKey}`;

        const responseRes = await this._withTimeout(fetch(url, {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
            cache: 'no-store'
        }), this._retryReadTimeoutMs);

        if (responseRes.timedOut) {
            throw new Error(`REST fetch timeout for ${safeCollectionId}/${safeDocId}`);
        }

        const response = responseRes.value;
        if (!response) return undefined;

        if (!response.ok) {
            if (response.status === 404) return null;
            const errorText = await response.text().catch(() => '');
            throw new Error(`REST fetch failed for ${safeCollectionId}/${safeDocId}: ${response.status}${errorText ? ` ${errorText}` : ''}`);
        }

        if (response.status === 204) return null; // No content

        const payload = await response.json();
        if (!payload || typeof payload !== 'object') return null;
        return this._decodeFirestoreRestFields(payload.fields || {});
    }

    async _tryRestDocFallback(collectionId, docId, originalError) {
        try {
            const restData = await this._fetchDocViaRest(collectionId, docId);
            if (typeof restData === 'undefined') return { used: false, data: null };

            console.warn(
                `[FirebaseService] Using REST fallback for ${collectionId}/${docId} after SDK read failure:`,
                originalError && originalError.message ? originalError.message : originalError
            );
            return { used: true, data: restData };
        } catch (restError) {
            console.error(`[FirebaseService] REST fallback failed for ${collectionId}/${docId}:`, restError);
            return { used: false, data: null };
        }
    }

    async ensureAuthPersistence() {
        if (!this.auth || typeof firebase === 'undefined') return false;
        if (this._authPersistencePromise) return this._authPersistencePromise;

        const localPersistence = firebase?.auth?.Auth?.Persistence?.LOCAL;
        if (!localPersistence) return false;

        this._authPersistencePromise = this.auth.setPersistence(localPersistence)
            .then(() => true)
            .catch((err) => {
                console.warn("[FirebaseService] Could not enforce LOCAL auth persistence:", err);
                return false;
            });

        return this._authPersistencePromise;
    }

    _sanitizeFirestorePayload(value, options = {}) {
        const utils = window.HKMAdminUtils;
        if (utils && typeof utils.sanitizeForFirestore === 'function') {
            return utils.sanitizeForFirestore(value, options);
        }

        const walk = (input) => {
            if (input === undefined) return undefined;
            if (input === null) return input;
            if (typeof input === 'number') return Number.isFinite(input) ? input : undefined;
            if (typeof input === 'string') return input;
            if (Array.isArray(input)) return input.map(walk).filter((v) => v !== undefined);
            if (typeof input === 'object') {
                const proto = Object.getPrototypeOf(input);
                if (proto && proto !== Object.prototype && proto !== null) return input;
                const out = {};
                Object.keys(input).forEach((key) => {
                    const sanitized = walk(input[key]);
                    if (sanitized !== undefined) out[key] = sanitized;
                });
                return out;
            }
            return input;
        };

        return walk(value);
    }

    /**
     * Get content for a specific page section
     * @param {string} pageId - e.g., 'index'
     */
    _getCachedContent(pageId) {
        if (!this._memoCache.has(pageId)) return undefined;
        const cachedAt = this._memoCacheTimestamps.get(pageId) || 0;
        if (Date.now() - cachedAt > this._contentMemoTtlMs) {
            this._memoCache.delete(pageId);
            this._memoCacheTimestamps.delete(pageId);
            return undefined;
        }
        return this._memoCache.get(pageId);
    }

    _setCachedContent(pageId, data) {
        this._memoCache.set(pageId, data);
        this._memoCacheTimestamps.set(pageId, Date.now());
    }

    invalidatePageContentCache(pageId) {
        if (!pageId) return;
        this._memoCache.delete(pageId);
        this._memoCacheTimestamps.delete(pageId);
        this._inFlightContentRequests.delete(pageId);
    }

    invalidateCollectionCache(cacheKey) {
        if (!cacheKey) return;
        this._memoCache.delete(cacheKey);
        this._memoCacheTimestamps.delete(cacheKey);
        this._inFlightContentRequests.delete(cacheKey);
    }

    _getCachedUserRole(uid) {
        const safeUid = typeof uid === 'string' ? uid.trim() : '';
        if (!safeUid) return '';

        try {
            const raw = localStorage.getItem(`${this._userRoleCacheKeyPrefix}${safeUid}`);
            if (!raw) return '';
            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== 'object') return '';
            const role = typeof parsed.role === 'string' ? parsed.role.trim().toLowerCase() : '';
            const cachedAt = Number(parsed.cachedAt || 0);
            if (!role) return '';
            if (!Number.isFinite(cachedAt) || (Date.now() - cachedAt > this._userRoleCacheTtlMs)) {
                localStorage.removeItem(`${this._userRoleCacheKeyPrefix}${safeUid}`);
                return '';
            }
            return role;
        } catch (e) {
            return '';
        }
    }

    _setCachedUserRole(uid, role) {
        const safeUid = typeof uid === 'string' ? uid.trim() : '';
        const normalizedRole = typeof role === 'string' ? role.trim().toLowerCase() : '';
        if (!safeUid || !normalizedRole) return;

        try {
            localStorage.setItem(`${this._userRoleCacheKeyPrefix}${safeUid}`, JSON.stringify({
                role: normalizedRole,
                cachedAt: Date.now()
            }));
        } catch (e) {
            // noop
        }
    }

    _notifyContentFetchFailure(pageId, error) {
        const isLocalFile = window.location.protocol === 'file:';
        if (isLocalFile && !this._isAdminLikeRoute()) {
            console.info(`[FirebaseService] Silencing notification for ${pageId} fetch failure (local file protocol).`);
            return;
        }

        const detail = {
            pageId,
            message: error?.message || 'Ukjent feil'
        };

        try {
            window.dispatchEvent(new CustomEvent('hkm:firebase-fetch-error', { detail }));
        } catch (e) {
            // noop
        }

        if (typeof window.showToast === 'function') {
            window.showToast('Kunne ikke laste oppdatert innhold. Viser lagret innhold hvis tilgjengelig.', 'warning', 5000);
        }
    }

    async _withTimeout(promise, timeoutMs = this._defaultReadTimeoutMs) {
        let timerId;
        const timeoutToken = Symbol('timeout');
        try {
            const result = await Promise.race([
                promise,
                new Promise((resolve) => {
                    timerId = setTimeout(() => resolve(timeoutToken), timeoutMs);
                })
            ]);
            return {
                timedOut: result === timeoutToken,
                value: result === timeoutToken ? null : result
            };
        } finally {
            if (timerId) clearTimeout(timerId);
        }
    }

    async _readWithRetry(readFactory, label) {
        let fetchRes = await this._withTimeout(readFactory(), this._defaultReadTimeoutMs);
        if (!fetchRes.timedOut) return fetchRes;

        console.warn(
            `[FirebaseService] ${label} timed out after ${this._defaultReadTimeoutMs}ms. Retrying once (${this._retryReadTimeoutMs}ms)...`
        );

        fetchRes = await this._withTimeout(readFactory(), this._retryReadTimeoutMs);
        return fetchRes;
    }

    async getPageContent(pageId, options = {}) {
        if (!this.isInitialized) {
            await this.waitForInitialization();
        }
        if (!this.isInitialized) return null;
        if (!pageId) return null;

        // Return memoized result if available to prevent redundant SDK processing
        const cached = this._getCachedContent(pageId);
        if (typeof cached !== 'undefined') {
            return cached;
        }

        if (this._inFlightContentRequests.has(pageId)) {
            return this._inFlightContentRequests.get(pageId);
        }

        const requestPromise = (async () => {
            try {
                if (this._shouldPreferRestPublicReads()) {
                    const restData = await this._fetchDocViaRest('content', pageId);
                    this._setCachedContent(pageId, restData ?? null);
                    return restData ?? null;
                }

                // Use cache-first intelligence
                const docRef = this.db.collection("content").doc(pageId);
                const fetchRes = await this._readWithRetry(() => docRef.get(), `content/${pageId}`);
                if (fetchRes.timedOut) {
                    throw new Error(`Fetch timeout for content/${pageId} (after retry)`);
                }
                const docSnap = fetchRes.value;
                if (docSnap.exists) {
                    const data = docSnap.data();
                    this._setCachedContent(pageId, data); // Memoize
                    return data;
                }
                this._setCachedContent(pageId, null);
                return null;
            } catch (error) {
                const restFallback = await this._tryRestDocFallback('content', pageId, error);
                if (restFallback.used) {
                    this._setCachedContent(pageId, restFallback.data ?? null);
                    return restFallback.data ?? null;
                }
                console.warn(`[FirebaseService] Content document '${pageId}' does not exist yet. This is normal if it hasn't been saved in the dashboard.`);
                if (window.hkmLogger) {
                    window.hkmLogger.warn(`Content Missing [${pageId}]: Document not found in Firestore.`);
                }
                if (!options.silent) {
                    this._notifyContentFetchFailure(pageId, error);
                }
                return null;
            } finally {
                this._inFlightContentRequests.delete(pageId);
            }
        })();

        this._inFlightContentRequests.set(pageId, requestPromise);
        return requestPromise;
    }

    async getManyPageContents(pageIds = [], options = {}) {
        if (!Array.isArray(pageIds) || pageIds.length === 0) return {};
        const uniqueIds = [...new Set(pageIds.filter(Boolean))];
        const pairs = await Promise.all(
            uniqueIds.map(async (id) => [id, await this.getPageContent(id, options)])
        );
        return Object.fromEntries(pairs);
    }

    /**
     * Optimized Collection Fetching with Cache
     * @param {string} colId - Collection name
     * @param {string} cacheKey - Unique key for the query (e.g. 'user_notifs:123')
     * @param {function} queryBuilder - Fn that takes collection ref and returns query
     */
    async getCachedCollection(colId, cacheKey, queryBuilder, options = {}) {
        if (!this.isInitialized) return [];

        const now = Date.now();
        const cached = this._memoCache.get(cacheKey);
        const cachedAt = this._memoCacheTimestamps.get(cacheKey) || 0;

        if (typeof cached !== 'undefined' && (now - cachedAt < this._collectionCacheTtlMs)) {
            return cached;
        }

        if (this._inFlightContentRequests.has(cacheKey)) {
            return this._inFlightContentRequests.get(cacheKey);
        }

        const fetchPromise = (async () => {
            try {
                const colRef = this.db.collection(colId);
                const query = queryBuilder ? queryBuilder(colRef) : colRef;
                const fetchRes = await this._readWithRetry(() => query.get(), `collection:${cacheKey}`);
                if (fetchRes.timedOut) {
                    throw new Error(`Fetch timeout for collection cache [${cacheKey}] (after retry)`);
                }
                const snap = fetchRes.value;
                const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                this._memoCache.set(cacheKey, data);
                this._memoCacheTimestamps.set(cacheKey, now);
                return data;
            } catch (error) {
                console.error(`❌ Collection Fetch failed [${cacheKey}]:`, error);
                if (window.hkmLogger) {
                    window.hkmLogger.error(`Collection Fetch Failed [${cacheKey}]: ${error.message}`);
                }
                return cached || []; // return stale cache on error if available
            } finally {
                this._inFlightContentRequests.delete(cacheKey);
            }
        })();

        this._inFlightContentRequests.set(cacheKey, fetchPromise);
        return fetchPromise;
    }

    /**
     * Save/Update page content
     * @param {string} pageId 
     * @param {object} data 
     */
    async updatePageContent(pageId, data) {
        if (!this.isInitialized) throw new Error("Firebase not initialized");
        const safePageId = typeof pageId === 'string' ? pageId.trim() : '';
        if (!safePageId) throw new Error("Invalid pageId");
        if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error("Invalid content payload");

        const sanitized = this._sanitizeFirestorePayload(data, {
            stripUndefined: true,
            stripEmptyStrings: false
        });

        if (!sanitized || typeof sanitized !== 'object') {
            throw new Error("Empty content payload");
        }

        await this.db.collection("content").doc(safePageId).set(sanitized, { merge: true });
        this.invalidatePageContentCache(safePageId);
    }

    async savePageContent(pageId, data) {
        return this.updatePageContent(pageId, data);
    }

    /**
     * Subscribe to real-time content updates
     * @param {string} pageId 
     * @param {function} callback 
     */
    subscribeToPage(pageId, callback) {
        if (!this.isInitialized) return null;

        try {
            return this.db.collection("content").doc(pageId).onSnapshot((doc) => {
                if (doc.exists) {
                    const data = doc.data();
                    this._setCachedContent(pageId, data);
                    callback(data);
                } else {
                    this._setCachedContent(pageId, null);
                }
            });
        } catch (error) {
            console.error(`❌ Failed to subscribe to page '${pageId}':`, error);
            return null;
        }
    }

    /**
     * Auth Methods
     */
    async login(email, password) {
        if (!this.isInitialized) throw new Error("Firebase not initialized");
        await this.ensureAuthPersistence();
        return this.auth.signInWithEmailAndPassword(email, password);
    }

    async loginWithGoogle() {
        if (!this.isInitialized) throw new Error("Firebase not initialized");
        await this.ensureAuthPersistence();
        const provider = new firebase.auth.GoogleAuthProvider();
        return this.auth.signInWithPopup(provider);
    }

    async logout() {
        if (!this.isInitialized) throw new Error("Firebase not initialized");
        try {
            await this.auth.signOut();
        } finally {
            this._clearLocalAuthCaches();
        }
    }

    async signOut() {
        return this.logout();
    }

    _clearLocalAuthCaches() {
        try {
            localStorage.removeItem('hkm_admin_identity_cache');
            localStorage.removeItem('hkm_user_data');
            Object.keys(localStorage)
                .filter((key) => key.startsWith(this._userRoleCacheKeyPrefix))
                .forEach((key) => localStorage.removeItem(key));
        } catch (e) {
            // Ignore storage cleanup failures; Firebase signOut is the important part.
        }
    }

    /**
     * User Roles & Profile
     */
    async register(email, password) {
        if (!this.isInitialized) throw new Error("Firebase not initialized");
        const userCredential = await this.auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;

        // Initialize user document with 'medlem' role
        await this.db.collection('users').doc(user.uid).set({
            email: user.email,
            role: 'medlem',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        return userCredential;
    }

    async subscribeNewsletter(email) {
        if (!this.isInitialized) throw new Error("Firebase not initialized");
        return this.db.collection('newsletter_subscriptions').add({
            email: email,
            subscribedAt: firebase.firestore.FieldValue.serverTimestamp(),
            source: 'website_footer'
        });
    }

    async connectToGoogle() {
        if (!this.isInitialized) throw new Error("Firebase not initialized");
        await this.ensureAuthPersistence();

        const provider = new firebase.auth.GoogleAuthProvider();
        // Request write access to calendar events
        provider.addScope('https://www.googleapis.com/auth/calendar.events');

        try {
            const result = await this.auth.signInWithPopup(provider);
            return {
                user: result.user,
                accessToken: result.credential.accessToken
            };
        } catch (error) {
            console.error("❌ Google Connection Failed:", error);
            throw error;
        }
    }

    async getUserRole(uid, options = {}) {
        if (!this.isInitialized) throw new Error("Firebase not initialized");
        const safeUid = typeof uid === 'string' ? uid.trim() : '';
        if (!safeUid) return 'medlem';
        const timeoutMs = Number.isFinite(options?.timeoutMs) && options.timeoutMs > 0
            ? Math.round(options.timeoutMs)
            : 2500;
        const cachedRole = this._getCachedUserRole(safeUid);
        const fallbackSuperadmins = ['thomas@hiskingdomministry.no'];
        const currentUser = this.auth && this.auth.currentUser ? this.auth.currentUser : null;
        if (currentUser && fallbackSuperadmins.includes((currentUser.email || '').toLowerCase())) {
            this._setCachedUserRole(safeUid, 'superadmin');
            return 'superadmin';
        }

        try {
            const fetchRes = await this._withTimeout(this.db.collection('users').doc(safeUid).get(), timeoutMs);
            if (fetchRes.timedOut) {
                throw new Error(`Fetch timeout for users/${safeUid}`);
            }

            const doc = fetchRes.value;
            if (doc && doc.exists) {
                const rawRole = doc.data()?.role;
                if (typeof rawRole === 'string' && rawRole.trim()) {
                    const role = rawRole.trim().toLowerCase();
                    this._setCachedUserRole(safeUid, role);
                    return role;
                }
                this._setCachedUserRole(safeUid, 'medlem');
                return 'medlem';
            }

            if (cachedRole) {
                console.warn(`[FirebaseService] users/${safeUid} missing, using cached role '${cachedRole}' temporarily.`);
                return cachedRole;
            }

            return 'medlem'; // Default fallback
        } catch (error) {
            if (cachedRole) {
                console.warn(`[FirebaseService] getUserRole fallback to cached role '${cachedRole}' for ${safeUid}:`, error);
                return cachedRole;
            }
            throw error;
        }
    }

    async sendEmailVerification() {
        if (!this.isInitialized) throw new Error("Firebase not initialized");
        const user = this.auth.currentUser;
        if (user) {
            return user.sendEmailVerification();
        }
        throw new Error("Ingen bruker er logget inn");
    }

    async updatePhoneNumber(phone) {
        if (!this.isInitialized) throw new Error("Firebase not initialized");
        const user = this.auth.currentUser;
        if (!user) throw new Error("Ingen bruker er logget inn");

        // Note: For actual phone auth, we need Recaptcha and verifyPhoneNumber
        // This method updates the phone number field in the users collection
        return this.db.collection('users').doc(user.uid).update({
            phone: phone,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    }

    /**
     * Storage Methods
     */
    async uploadImage(file, path, onProgress = null, options = {}) {
        return this.uploadFile(file, path, ['image/'], 10, onProgress, options);
    }

    async uploadFile(file, path, allowedTypes = ['image/'], maxSizeMB = 10, onProgress = null, options = {}) {
        if (!this.isInitialized) throw new Error("Firebase er ikke initialisert.");
        if (!this.storage) throw new Error("Firebase Storage er ikke initialisert.");
        if (!file) throw new Error("Ingen fil valgt.");
        if (!this.auth || !this.auth.currentUser) {
            throw new Error("Du er ikke logget inn. Logg inn på nytt før du laster opp filer.");
        }

        const maxSizeBytes = (options.maxSizeBytes || maxSizeMB * 1024 * 1024);
        const timeoutMs = options.timeoutMs || 120000;
        
        if (file.size > maxSizeBytes) {
            throw new Error(`Filen er for stor. Maks størrelse er ${maxSizeMB} MB.`);
        }
        
        const isAllowedType = allowedTypes.some(type => file.type && file.type.startsWith(type));
        if (!isAllowedType) {
            throw new Error("Ugyldig filtype.");
        }

        try {
            await this.auth.currentUser.getIdToken(true);
            const storageRef = this.storage.ref(path);
            const uploadTask = storageRef.put(file);

            const snapshot = await new Promise((resolve, reject) => {
                const timeoutId = window.setTimeout(() => {
                    uploadTask.cancel();
                    reject(new Error("Opplastingen tok for lang tid. Prøv igjen med en mindre fil."));
                }, timeoutMs);

                uploadTask.on(
                    'state_changed',
                    (snapshot) => {
                        if (typeof onProgress === 'function' && snapshot.totalBytes > 0) {
                            onProgress(Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100), snapshot);
                        }
                    },
                    (error) => {
                        window.clearTimeout(timeoutId);
                        reject(error);
                    },
                    () => {
                        window.clearTimeout(timeoutId);
                        resolve(uploadTask.snapshot);
                    }
                );
            });

            return await snapshot.ref.getDownloadURL();
        } catch (error) {
            console.error("[FirebaseService] Upload error:", error);

            throw error;
        }
    }

    async requestNotificationPermission() {
        if (!this.isInitialized || typeof firebase.messaging !== 'function' || !firebase.messaging.isSupported()) {
            console.warn("Firebase Messaging is not initialized or supported in this browser.");
            return null;
        }
        const messaging = firebase.messaging();
        try {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                console.log('Notification permission granted.');
                // TODO: Replace 'YOUR_VAPID_KEY' with your actual VAPID key from Firebase project settings.
                const token = await messaging.getToken({ vapidKey: 'BI2k24dp-3eJWtLSPvGWQkD00A_duNRCIMY_2ozLFI0-anJDamFBALaTdtzGYQEkoFz8X0JxTcCX6tn3P_i0YrA' });
                if (token) {
                    console.log('FCM Token:', token);
                    const user = this.auth.currentUser;
                    if (user) {
                        const userDocRef = this.db.collection('users').doc(user.uid);
                        await userDocRef.update({
                            fcmTokens: firebase.firestore.FieldValue.arrayUnion(token)
                        });
                        console.log('FCM token saved to user profile.');
                    }
                    return token;
                } else {
                    console.log('No registration token available. Request permission to generate one.');
                    return null;
                }
            } else {
                console.log('Unable to get permission to notify.');
                return null;
            }
        } catch (error) {
            console.error('An error occurred while requesting permission or getting token:', error);
            return null;
        }
    }

    onAuthChange(callback) {
        if (!this.isInitialized) {
            this.tryAutoInit();
        }
        if (!this.isInitialized) return false;
        const subscribe = () => {
            this.auth.onAuthStateChanged(callback);
        };

        // Let persistence settle first to reduce transient null auth events on slower browsers.
        if (typeof this.ensureAuthPersistence === 'function') {
            const persistencePromise = this.ensureAuthPersistence().catch(() => false);
            if (persistencePromise && typeof persistencePromise.finally === 'function') {
                persistencePromise.finally(subscribe);
                return true;
            }
        }

        subscribe();
        return true;
    }

    async getSiteContent(docId) {
        if (!this.isInitialized) return null;
        const safeDocId = typeof docId === 'string' ? docId.trim() : '';
        if (!safeDocId) return null;

        const cacheKey = `siteContent:${safeDocId}`;
        const cached = this._getCachedContent(cacheKey);
        if (typeof cached !== 'undefined') return cached;

        try {
            if (this._shouldPreferRestPublicReads()) {
                const restData = await this._fetchDocViaRest('siteContent', safeDocId);
                this._setCachedContent(cacheKey, restData ?? null);
                return restData ?? null;
            }

            const fetchRes = await this._readWithRetry(() => this.db.collection('siteContent').doc(safeDocId).get(), `siteContent/${safeDocId}`);
            if (fetchRes.timedOut) {
                throw new Error(`Fetch timeout for siteContent/${safeDocId} (after retry)`);
            }
            const snap = fetchRes.value;
            const data = snap.exists ? (snap.data() || null) : null;
            this._setCachedContent(cacheKey, data);
            return data;
        } catch (error) {
            const restFallback = await this._tryRestDocFallback('siteContent', safeDocId, error);
            if (restFallback.used) {
                this._setCachedContent(cacheKey, restFallback.data ?? null);
                return restFallback.data ?? null;
            }
            console.error(`❌ Failed to load siteContent '${safeDocId}':`, error);
            return null;
        }
    }

    async saveSiteContent(docId, data, options = { merge: true }) {
        if (!this.isInitialized) throw new Error("Firebase not initialized");
        const safeDocId = typeof docId === 'string' ? docId.trim() : '';
        if (!safeDocId) throw new Error("Invalid siteContent docId");
        if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error("Invalid siteContent payload");

        const sanitized = this._sanitizeFirestorePayload(data, {
            stripUndefined: true,
            stripEmptyStrings: false
        });

        if (!sanitized || typeof sanitized !== 'object') throw new Error("Empty siteContent payload");

        await this.db.collection('siteContent').doc(safeDocId).set(sanitized, options || { merge: true });
        this.invalidatePageContentCache(`siteContent:${safeDocId}`);
    }

    subscribeToSiteContent(docId, callback) {
        if (!this.isInitialized) return null;
        const safeDocId = typeof docId === 'string' ? docId.trim() : '';
        if (!safeDocId || typeof callback !== 'function') return null;

        try {
            return this.db.collection('siteContent').doc(safeDocId).onSnapshot((doc) => {
                const data = doc.exists ? (doc.data() || null) : null;
                this._setCachedContent(`siteContent:${safeDocId}`, data);
                callback(data, doc);
            });
        } catch (error) {
            console.error(`❌ Failed to subscribe to siteContent '${safeDocId}':`, error);
            return null;
        }
    }

    /**
     * Interactions (Likes & Comments)
     */
    async toggleLike(postId, userId) {
        if (!this.isInitialized) throw new Error("Firebase not initialized");
        const safePostId = (typeof postId === 'string' ? postId : String(postId || ''))
            .trim()
            .replace(/\//g, '_'); // Replace slashes to avoid path confusion
        const safeUserId = typeof userId === 'string' ? userId.trim() : '';
        if (!safePostId || !safeUserId) throw new Error("Invalid parameters");

        const docRef = this.db.collection('interactions').doc(safePostId);
        
        try {
            return await this.db.runTransaction(async (transaction) => {
                const doc = await transaction.get(docRef);
                if (!doc.exists) {
                    transaction.set(docRef, { likes_count: 1, liked_by: [safeUserId] });
                    return { liked: true, likes_count: 1 };
                }
                
                const data = doc.data();
                const likedBy = data.liked_by || [];
                let newCount = data.likes_count || 0;
                let liked = false;
                
                if (likedBy.includes(safeUserId)) {
                    likedBy.splice(likedBy.indexOf(safeUserId), 1);
                    newCount = Math.max(0, newCount - 1);
                } else {
                    likedBy.push(safeUserId);
                    newCount++;
                    liked = true;
                }
                
                transaction.update(docRef, { likes_count: newCount, liked_by: likedBy });
                return { liked, likes_count: newCount };
            });
        } catch (error) {
            console.error(`❌ Failed to toggle like for ${postId}:`, error);
            throw error;
        }
    }

    subscribeToLikes(postId, callback) {
        if (!this.isInitialized) return null;
        const safePostId = (typeof postId === 'string' ? postId : String(postId || ''))
            .trim()
            .replace(/\//g, '_');
        if (!safePostId || typeof callback !== 'function') return null;

        return this.db.collection('interactions').doc(safePostId).onSnapshot((doc) => {
            if (doc.exists) {
                callback(doc.data());
            } else {
                callback({ likes_count: 0, liked_by: [] });
            }
        });
    }

    async addComment(postId, commentData) {
        if (!this.isInitialized) throw new Error("Firebase not initialized");
        const safePostId = (typeof postId === 'string' ? postId : String(postId || ''))
            .trim()
            .replace(/\//g, '_');
        if (!safePostId || !commentData) throw new Error("Invalid parameters");

        const commentsRef = this.db.collection('interactions').doc(safePostId).collection('comments');
        return commentsRef.add({
            author_name: commentData.author_name || 'Anonym',
            text: commentData.text || '',
            user_id: commentData.user_id || 'anonymous',
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            status: 'approved'
        });
    }

    subscribeToComments(postId, callback) {
        if (!this.isInitialized) return null;
        const safePostId = (typeof postId === 'string' ? postId : String(postId || ''))
            .trim()
            .replace(/\//g, '_');
        if (!safePostId || typeof callback !== 'function') return null;

        const commentsRef = this.db.collection('interactions').doc(safePostId).collection('comments').orderBy('timestamp', 'desc');
        return commentsRef.onSnapshot((snapshot) => {
            const comments = [];
            snapshot.forEach((doc) => {
                comments.push({ id: doc.id, ...doc.data() });
            });
            callback(comments);
        });
    }

    async deleteComment(postId, commentId) {
        if (!this.isInitialized) throw new Error("Firebase not initialized");
        const safePostId = (typeof postId === 'string' ? postId : String(postId || ''))
            .trim()
            .replace(/\//g, '_');
        if (!safePostId || !commentId) throw new Error("Invalid parameters");

        return this.db.collection('interactions').doc(safePostId).collection('comments').doc(commentId).delete();
    }
}

// Global instance
window.firebaseService = new FirebaseService();

// ESM Export for Vite/Rollup bundling support
export const firebaseService = window.firebaseService;
