/**
 * HKM Auth & Identity Manager
 * Single Source of Truth for user profile, photoURL, and identity caching
 * across Admin, Min Side, and Public pages.
 */
(function (window) {
    'use strict';

    const ADMIN_CACHE_KEY = 'hkm_admin_identity_cache';
    const PUBLIC_CACHE_KEY = 'hkm_public_user_cache';

    const listeners = new Set();

    function cleanPhotoUrl(url) {
        if (!url || typeof url !== 'string') return '';
        let cleaned = url.trim().replace(/&amp;/g, '&');
        if (!cleaned || cleaned === 'null' || cleaned === 'undefined') return '';
        const lower = cleaned.toLowerCase();
        if (
            lower.includes('default-user') ||
            lower.includes('default_user') ||
            lower.includes('default_avatar') ||
            lower.includes('avatar-placeholder') ||
            lower.includes('silhouette') ||
            lower.includes('ssl.gstatic.com/accounts/ui/avatar') ||
            lower.includes('googleusercontent.com/a/default-user') ||
            lower.includes('gstatic.com/identity/images/components/profiles')
        ) {
            return '';
        }
        if (cleaned.startsWith('//')) cleaned = 'https:' + cleaned;
        return cleaned;
    }

    function getInitials(name) {
        if (!name || typeof name !== 'string') return '?';
        const parts = name.trim().split(/\s+/).filter(Boolean);
        if (!parts.length) return '?';
        if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }

    const HKMAuthManager = {
        getIdentity() {
            try {
                const admRaw = localStorage.getItem(ADMIN_CACHE_KEY);
                const pubRaw = localStorage.getItem(PUBLIC_CACHE_KEY);
                let admObj = {}, pubObj = {};
                if (admRaw) { try { admObj = JSON.parse(admRaw) || {}; } catch(e) {} }
                if (pubRaw) { try { pubObj = JSON.parse(pubRaw) || {}; } catch(e) {} }

                const displayName = admObj.displayName || pubObj.displayName || pubObj.fullName || '';
                const photoURL = cleanPhotoUrl(admObj.photoURL || admObj.photoUrl || pubObj.photoURL || pubObj.photoUrl || pubObj.avatarUrl);
                const uid = pubObj.uid || admObj.uid || '';
                const role = pubObj.role || admObj.role || '';

                return { displayName, photoURL, uid, role };
            } catch (e) {
                return { displayName: '', photoURL: '', uid: '', role: '' };
            }
        },

        writeIdentity(data) {
            if (!data || typeof data !== 'object') return;
            try {
                const current = this.getIdentity();
                const displayName = data.displayName || data.fullName || current.displayName || '';
                const photoURL = cleanPhotoUrl(data.photoURL || data.photo_url || data.photoUrl || data.avatarUrl || current.photoURL);
                const uid = data.uid || current.uid || '';
                const role = data.role || current.role || '';

                const cacheObj = {
                    uid,
                    displayName,
                    photoURL,
                    photoUrl: photoURL,
                    avatarUrl: photoURL,
                    role,
                    ts: Date.now()
                };

                localStorage.setItem(ADMIN_CACHE_KEY, JSON.stringify(cacheObj));
                localStorage.setItem(PUBLIC_CACHE_KEY, JSON.stringify(cacheObj));

                listeners.forEach(fn => {
                    try { fn(cacheObj); } catch(e) {}
                });
            } catch (e) {
                console.warn('[HKMAuthManager] Failed to write identity cache:', e);
            }
        },

        subscribe(listener) {
            if (typeof listener === 'function') {
                listeners.add(listener);
                return () => listeners.delete(listener);
            }
            return () => {};
        },

        renderAvatar(el, options = {}) {
            if (!el) return;
            const identity = this.getIdentity();
            const photoURL = cleanPhotoUrl(options.photoURL || identity.photoURL);
            const name = options.displayName || identity.displayName || 'Bruker';
            const initials = getInitials(name);

            if (photoURL && photoURL.length > 5) {
                el.classList.remove('has-initials');
                el.dataset.photoUrl = photoURL;
                el.innerHTML = `<img src="${photoURL}" alt="${name}" referrerpolicy="no-referrer" loading="eager" decoding="sync" style="width: 100%; height: 100%; border-radius: inherit; object-fit: cover; position: absolute; inset: 0; z-index: 2;" onerror="this.style.display='none'; this.parentElement.classList.add('has-initials');"><span class="avatar-initials-text" style="position: relative; z-index: 1; color: white !important; font-weight: 900 !important;">${initials}</span>`;
            } else {
                el.classList.add('has-initials');
                el.innerHTML = `<span class="avatar-initials-text" style="position: relative; z-index: 1; color: white !important; font-weight: 900 !important;">${initials}</span>`;
            }
        },

        cleanPhotoUrl,
        getInitials
    };

    window.HKMAuthManager = HKMAuthManager;
    window.HKMAuth = HKMAuthManager;
})(window);
