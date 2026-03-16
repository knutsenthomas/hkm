const CACHE_NAME = 'hkm-admin-v4';
const STATIC_ASSETS = [
    '/admin/css/dashboard.css',
    '/admin/css/admin-unified.css',
    '/admin/img/logo_circular.png',
    '/css/notifications.css',
    '/manifest.json'
];

function isSameOrigin(url) {
    return url.origin === self.location.origin;
}

function isAdminRequest(url) {
    return url.pathname.startsWith('/admin/');
}

function isHtmlRequest(request) {
    const accept = request.headers.get('accept') || '';
    return request.mode === 'navigate' || accept.includes('text/html');
}

function shouldCacheStatic(request, url) {
    if (!isSameOrigin(url)) return false;
    if (isAdminRequest(url)) return false;

    const cacheableDestinations = new Set(['style', 'script', 'image', 'font', 'manifest']);
    if (cacheableDestinations.has(request.destination)) return true;

    return /\.(?:css|js|png|jpe?g|webp|svg|ico|woff2?|ttf|json)$/i.test(url.pathname);
}

self.addEventListener('install', (event) => {
    event.waitUntil((async () => {
        const cache = await caches.open(CACHE_NAME);
        await cache.addAll(STATIC_ASSETS);
        await self.skipWaiting();
    })());
});

self.addEventListener('activate', (event) => {
    event.waitUntil((async () => {
        const cacheNames = await caches.keys();
        await Promise.all(
            cacheNames
                .filter((name) => name !== CACHE_NAME)
                .map((name) => caches.delete(name))
        );
        await self.clients.claim();
    })());
});

self.addEventListener('fetch', (event) => {
    const request = event.request;
    if (request.method !== 'GET') return;

    const url = new URL(request.url);
    if (!isSameOrigin(url)) return;

    // Never serve admin pages/assets from cache. This prevents stale dashboard JS/CSS and stuck loaders.
    if (isAdminRequest(url)) {
        event.respondWith((async () => {
            try {
                return await fetch(request, isHtmlRequest(request) ? { cache: 'no-store' } : undefined);
            } catch (error) {
                const cached = await caches.match(request);
                if (cached) return cached;
                throw error;
            }
        })());
        return;
    }

    // HTML documents should be network-first to avoid stale app shells and auth flows.
    if (isHtmlRequest(request)) {
        event.respondWith((async () => {
            try {
                return await fetch(request);
            } catch (error) {
                const cached = await caches.match(request);
                if (cached) return cached;
                throw error;
            }
        })());
        return;
    }

    if (!shouldCacheStatic(request, url)) {
        return;
    }

    event.respondWith((async () => {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(request);

        const networkPromise = fetch(request)
            .then((response) => {
                if (response && response.ok) {
                    cache.put(request, response.clone()).catch(() => { });
                }
                return response;
            })
            .catch(() => null);

        if (cached) {
            networkPromise.catch(() => { });
            return cached;
        }

        const networkResponse = await networkPromise;
        if (networkResponse) return networkResponse;

        return fetch(request);
    })());
});
