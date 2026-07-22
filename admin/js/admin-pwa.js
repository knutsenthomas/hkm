(function () {
    const ADMIN_CACHE_PREFIX = 'hkm-admin-';

    if (!('serviceWorker' in navigator)) return;

    async function clearAdminRegistrationsAndCaches() {
        console.log('[HKM Admin] Avregistrerer service workers og sletter cacher for å unngå omdirigeringsfeil...');
        
        try {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (const reg of registrations) {
                await reg.unregister();
                console.log('[HKM Admin] Avregistrert service worker:', reg.active?.scriptURL || 'ukjent');
            }
        } catch (e) {
            console.error('[HKM Admin] Feil ved avregistrering av service workers:', e);
        }

        try {
            if (window.caches && typeof caches.keys === 'function') {
                const keys = await caches.keys();
                for (const key of keys) {
                    await caches.delete(key);
                    console.log('[HKM Admin] Slettet cache-lager:', key);
                }
            }
        } catch (e) {
            console.error('[HKM Admin] Feil ved sletting av cache:', e);
        }
        
        console.log('[HKM Admin] Rydding fullført. Nettstedet lastes nå 100% direkte fra nettverket.');
    }

    // Kjør ryddingen umiddelbart på siden
    clearAdminRegistrationsAndCaches();
})();
