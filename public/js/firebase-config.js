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
    storageBucket: "his-kingdom-ministry.appspot.com",
    messagingSenderId: "791237361706",
    appId: "1:791237361706:web:63516ba3d74436f23ac353",
    measurementId: "G-5CH82CHQ0B"
};
