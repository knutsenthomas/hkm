// Firebase Service Worker for Push Notifications

// Import and initialize the Firebase SDK
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// This config is public and safe to be in a service worker
const firebaseConfig = {
    apiKey: "AIzaSyAelVsZnTU5xjQsjewWG7RjYEsQSHH-bkE",
    authDomain: "his-kingdom-ministry.firebaseapp.com",
    projectId: "his-kingdom-ministry",
    storageBucket: "his-kingdom-ministry.appspot.com",
    messagingSenderId: "791237361706",
    appId: "1:791237361706:web:63516ba3d74436f23ac353",
    measurementId: "G-5CH82CHQ0B"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

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
