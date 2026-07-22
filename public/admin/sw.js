const CACHE_NAME = 'hkm-admin-app-v37';
const SHELL_ASSETS = [
    '/admin/index.html',
    '/admin/login.html',
    '/admin/manifest.webmanifest',
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
        // Use { cache: 'reload' } to force bypass HTTP cache and get fresh copies from server
        const requests = SHELL_ASSETS.map(url => new Request(url, { cache: 'reload' }));
        await cache.addAll(requests);
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

// Firebase Cloud Messaging compat scripts
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Initialize Firebase App in service worker
firebase.initializeApp({
    apiKey: "AIzaSyAelVsZnTU5xjQsjewWG7RjYEsQSHH-bkE",
    authDomain: "his-kingdom-ministry.firebaseapp.com",
    projectId: "his-kingdom-ministry",
    messagingSenderId: "791237361706",
    appId: "1:791237361706:web:63516ba3d74436f23ac353"
});

let messaging = null;
try {
    if (firebase.messaging.isSupported()) {
        messaging = firebase.messaging();
        // Handle background push messages (admin scope)
        messaging.onBackgroundMessage((payload) => {
            console.log('[admin/sw.js] Bakgrunnsmelding mottatt:', payload);
            const title = payload.notification?.title || 'Ny oppdatering';
            const options = {
                body: payload.notification?.body || '',
                icon: payload.notification?.image || '/img/logo-hkm.png',
                badge: '/icons/icon-192.png',
                data: payload.data
            };
            self.registration.showNotification(title, options);
        });
    } else {
        console.warn('[admin/sw.js] Firebase Messaging er ikke støttet i denne nettleseren.');
    }
} catch (e) {
    console.warn('[admin/sw.js] Kunne ikke initialisere Firebase Messaging i Service Worker:', e);
}

// Handle notification click and redirect
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    let clickUrl = '/admin/index.html';
    if (event.notification.data) {
        if (event.notification.data.click_action) {
            clickUrl = event.notification.data.click_action;
        } else if (event.notification.data.url) {
            clickUrl = event.notification.data.url;
        }
    }
    
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            for (let client of windowClients) {
                const clientUrl = new URL(client.url, self.location.origin).pathname;
                const targetUrl = new URL(clickUrl, self.location.origin).pathname;
                if (clientUrl === targetUrl && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(clickUrl);
            }
        })
    );
});


