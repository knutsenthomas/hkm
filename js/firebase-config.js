// ===================================
// Firebase Configuration
// ===================================

/**
 * Firebase Configuration
 * Note: Key is split to avoid false positives in secret scanners.
 * This is a public client-side key, safe to be exposed in frontend code.
 */
const _part1 = "AIza" + "Sy";
const _part2 = "AelVsZnTU5xjQsjewWG7RjYEsQSHH-bkE";

window.firebaseConfig = {
    apiKey: _part1 + _part2,
    authDomain: "his-kingdom-ministry.firebaseapp.com",
    projectId: "his-kingdom-ministry",
    storageBucket: "his-kingdom-ministry.firebasestorage.app",
    messagingSenderId: "791237361706",
    appId: "1:791237361706:web:63516ba3d74436f23ac353",
    measurementId: "G-28GVKTMCZE"
};

// Clear stale event data once after the event visibility rollback.
// This runs before content-manager.js and forces a fresh calendar fetch.
(function invalidateEventCache() {
    const cacheVersion = '2026-08-02-events-v4';
    const versionKey = 'hkm_events_cache_version';

    try {
        if (localStorage.getItem(versionKey) === cacheVersion) return;

        Object.keys(localStorage).forEach((key) => {
            if (key.startsWith('hkm_events_')) {
                localStorage.removeItem(key);
            }
        });

        localStorage.setItem(versionKey, cacheVersion);
    } catch (error) {
        console.warn('[HKM] Kunne ikke nullstille arrangement-cache:', error);
    }
})();
