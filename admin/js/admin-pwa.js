(function () {
    const ADMIN_CACHE_PREFIX = 'hkm-admin-';
    const LOCAL_DEV_CLEANUP_KEY = 'hkm_admin_pwa_local_cleanup_done';

    if (!('serviceWorker' in navigator)) return;

    const hostname = window.location.hostname;
    const isLocalDev = hostname === 'localhost' || hostname === '127.0.0.1';

    async function clearAdminRegistrationsAndCaches() {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.allSettled(
            registrations
                .filter((registration) => {
                    const scriptURL = registration.active?.scriptURL || registration.installing?.scriptURL || registration.waiting?.scriptURL || '';
                    return scriptURL.includes('/admin/sw.js') || scriptURL.endsWith('/sw.js');
                })
                .map((registration) => registration.unregister())
        );

        if (!window.caches || typeof caches.keys !== 'function') return;

        const keys = await caches.keys();
        await Promise.allSettled(
            keys
                .filter((key) => key.startsWith(ADMIN_CACHE_PREFIX))
                .map((key) => caches.delete(key))
        );
    }

    window.addEventListener('load', async () => {
        try {
            if (isLocalDev) {
                if (sessionStorage.getItem(LOCAL_DEV_CLEANUP_KEY) !== '1') {
                    await clearAdminRegistrationsAndCaches();
                    sessionStorage.setItem(LOCAL_DEV_CLEANUP_KEY, '1');
                    console.info('[HKM Admin] Gamle lokale PWA-cacher er ryddet');
                }
            }

            const registration = await navigator.serviceWorker.register('/admin/sw.js', { scope: '/admin/' });
            if (typeof registration.update === 'function') {
                registration.update().catch(() => { });
            }
            console.info('[HKM Admin] PWA service worker registrert', registration.scope);
        } catch (error) {
            console.warn('[HKM Admin] PWA service worker kunne ikke registreres:', error);
        }
    });
})();
