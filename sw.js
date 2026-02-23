const CACHE_NAME = 'hkm-admin-v1';
const ASSETS = [
    '/admin/index.html',
    '/admin/css/dashboard.css',
    '/admin/css/admin-unified.css',
    '/admin/img/logo_circular.png',
    '/css/notifications.css'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});
