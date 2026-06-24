// Firebase Service Worker for Push Notifications

// Import and initialize the Firebase SDK
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// This config is public and safe to be in a service worker
const firebaseConfig = {
    apiKey: "AIzaSyAelVsZnTU5xjQsjewWG7RjYEsQSHH-bkE",
    authDomain: "his-kingdom-ministry.firebaseapp.com",
    projectId: "his-kingdom-ministry",
    storageBucket: "his-kingdom-ministry.firebasestorage.app",
    messagingSenderId: "791237361706",
    appId: "1:791237361706:web:63516ba3d74436f23ac353",
    measurementId: "G-28GVKTMCZE"
};

firebase.initializeApp(firebaseConfig);

let messaging = null;
try {
    if (firebase.messaging.isSupported()) {
        messaging = firebase.messaging();
        // Handler for background messages
        messaging.onBackgroundMessage((payload) => {
            console.log('[firebase-messaging-sw.js] Received background message ', payload);

            const notificationTitle = payload.notification.title;
            const notificationOptions = {
                body: payload.notification.body,
                icon: payload.notification.image || '/img/logo-hkm.png'
            };

            self.registration.showNotification(notificationTitle, notificationOptions);
        });
    } else {
        console.warn('[firebase-messaging-sw.js] Firebase Messaging er ikke støttet i denne nettleseren.');
    }
} catch (e) {
    console.warn('[firebase-messaging-sw.js] Kunne ikke initialisere Firebase Messaging i Service Worker:', e);
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

