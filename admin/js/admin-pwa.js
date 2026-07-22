(function () {
    const ADMIN_CACHE_PREFIX = 'hkm-admin-';
    const LOCAL_DEV_CLEANUP_KEY = 'hkm_admin_pwa_local_cleanup_done';
    const PWA_VERSION = 'v47'; // Change this value to force-clear cache and reload production clients
    const VERSION_KEY = 'hkm_admin_pwa_version';

    if (!('serviceWorker' in navigator)) return;

    const hostname = window.location.hostname;
    const isLocalDev = hostname === 'localhost' || hostname === '127.0.0.1';

    async function clearAdminRegistrationsAndCaches() {
        console.log('[HKM Admin] Ryddes for service workers og cache...');
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
                .filter((key) => key.startsWith(ADMIN_CACHE_PREFIX) || key.startsWith('hkm-'))
                .map((key) => caches.delete(key))
        );
    }

    // Auto-reload when the new service worker takes over control
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
            refreshing = true;
            console.info('[HKM Admin] Service worker oppdatert. Laster inn på nytt...');
            window.location.reload();
        }
    });

    const initPWA = async () => {
        try {
            // Version check for cache busting on production/deployment updates
            const currentVersion = localStorage.getItem(VERSION_KEY);
            if (currentVersion !== PWA_VERSION) {
                console.info(`[HKM Admin] Ny versjon detektert (${PWA_VERSION}). Sletter gamle cacher...`);
                await clearAdminRegistrationsAndCaches();
                localStorage.setItem(VERSION_KEY, PWA_VERSION);
                window.location.reload();
                return;
            }

            if (isLocalDev) {
                if (sessionStorage.getItem(LOCAL_DEV_CLEANUP_KEY) !== '1') {
                    await clearAdminRegistrationsAndCaches();
                    sessionStorage.setItem(LOCAL_DEV_CLEANUP_KEY, '1');
                    localStorage.setItem(VERSION_KEY, PWA_VERSION);
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
    };

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        initPWA();
    } else {
        window.addEventListener('load', initPWA);
    }
})();
