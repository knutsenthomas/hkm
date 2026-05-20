const CACHE_NAME = 'hkm-admin-app-v2';
const SHELL_ASSETS = [
    '/admin/index.html',
    '/admin/login.html',
    '/admin/manifest.webmanifest',
    '/admin/css/dashboard.css',
    '/admin/css/admin-unified.css',
    '/css/notifications.css',
    '/img/logo-hkm.png',
    '/icons/icon-192.png',
    '/icons/icon-512.png'
];

function isSameOrigin(url) {
    return url.origin === self.location.origin;
}

function isHtmlRequest(request) {
    const accept = request.headers.get('accept') || '';
    return request.mode === 'navigate' || accept.includes('text/html');
}

function isStaticAsset(request, url) {
    if (!isSameOrigin(url)) return false;

    const cacheableDestinations = new Set(['style', 'script', 'image', 'font', 'manifest']);
    if (cacheableDestinations.has(request.destination)) return true;

    return /\.(?:css|js|png|jpe?g|webp|svg|ico|woff2?|ttf|json|webmanifest)$/i.test(url.pathname);
}

self.addEventListener('install', (event) => {
    event.waitUntil((async () => {
        const cache = await caches.open(CACHE_NAME);
        await cache.addAll(SHELL_ASSETS);
        await self.skipWaiting();
    })());
});

self.addEventListener('activate', (event) => {
    event.waitUntil((async () => {
        const cacheNames = await caches.keys();
        await Promise.all(
            cacheNames
                .filter((name) => name.startsWith('hkm-admin-') && name !== CACHE_NAME)
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

    if (isHtmlRequest(request)) {
        event.respondWith((async () => {
            try {
                return await fetch(request, { cache: 'no-store' });
            } catch (error) {
                return await caches.match(request) || await caches.match('/admin/index.html') || Response.error();
            }
        })());
        return;
    }

    if (!isStaticAsset(request, url)) return;

    event.respondWith((async () => {
        const cache = await caches.open(CACHE_NAME);

        try {
            const fresh = await fetch(request, { cache: request.destination === 'style' || request.destination === 'script' ? 'no-store' : 'default' });
            if (fresh && fresh.ok) {
                cache.put(request, fresh.clone()).catch(() => { });
            }
            return fresh;
        } catch (error) {
            return await cache.match(request) || Response.error();
        }
    })());
});
