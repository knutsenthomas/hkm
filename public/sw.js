const CACHE_NAME = 'hkm-admin-v66';
const STATIC_ASSETS = [
    '/css/notifications.css',
    '/img/logo-hkm.png',
    '/img/logo_circular.png',
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
        // Force bypass HTTP cache to get fresh static assets from server
        const requests = STATIC_ASSETS.map(url => new Request(url, { cache: 'reload' }));
        await cache.addAll(requests);
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

    // Bible API Caching (Cache-First strategy)
    if (url.pathname.startsWith('/api/bible/')) {
        event.respondWith((async () => {
            const bibleCache = await caches.open('hkm-bible-api-cache-v1');
            const cachedResponse = await bibleCache.match(request);
            if (cachedResponse) {
                return cachedResponse;
            }
            try {
                const freshResponse = await fetch(request);
                if (freshResponse && freshResponse.ok) {
                    bibleCache.put(request, freshResponse.clone()).catch(() => {});
                }
                return freshResponse;
            } catch (error) {
                console.error('[sw.js] Bible API offline request failed:', error);
                throw error;
            }
        })());
        return;
    }

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
    // Caches successfully fetched pages so they can be viewed offline.
    if (isHtmlRequest(request)) {
        event.respondWith((async () => {
            const cache = await caches.open(CACHE_NAME);
            try {
                const fresh = await fetch(request);
                if (fresh && fresh.ok) {
                    cache.put(request, fresh.clone()).catch(() => { });
                }
                return fresh;
            } catch (error) {
                const cached = await cache.match(request);
                if (cached) return cached;
                throw error;
            }
        })());
        return;
    }

    if (!shouldCacheStatic(request, url)) {
        return;
    }

    // Scripts/styles should be network-first to avoid stale i18n/menu logic.
    if (request.destination === 'script' || request.destination === 'style') {
        event.respondWith((async () => {
            const cache = await caches.open(CACHE_NAME);
            try {
                const fresh = await fetch(request, { cache: 'no-store' });
                if (fresh && fresh.ok) {
                    cache.put(request, fresh.clone()).catch(() => { });
                }
                return fresh;
            } catch (error) {
                const cached = await cache.match(request);
                if (cached) return cached;
                throw error;
            }
        })());
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
        // Handle background push messages
        messaging.onBackgroundMessage((payload) => {
            console.log('[sw.js] Bakgrunnsmelding mottatt:', payload);
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
        console.warn('[sw.js] Firebase Messaging er ikke støttet i denne nettleseren.');
    }
} catch (e) {
    console.warn('[sw.js] Kunne ikke initialisere Firebase Messaging i Service Worker:', e);
}

// Handle notification click and redirect
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    let clickUrl = '/';
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


