// podcast-admin.js
// Flyttet fra admin.js: Podcast administrasjon for bruk på podcast.html
// Vises kun for innloggede administratorer

import { firebaseService } from './firebase-service.js';

window.podcastAdmin = {
    // ... Her limes inn all relevant podcast admin-funksjonalitet fra admin.js ...
    // Dette inkluderer:
    // - renderPodcastSection
    // - loadPodcastEpisodes
    // - openPodcastSettingsModal
    // - osv.
};

// Funksjon for å vise admin-grensesnittet kun for admin
export function showPodcastAdminIfAdmin() {
    const setupAuth = () => {
        if (window.firebase && typeof firebase.auth === 'function') {
            firebase.auth().onAuthStateChanged(user => {
                if (user && user.email && (user.email.endsWith('@hiskingdomministry.no') || user.email === 'knutsenthomas@gmail.com')) {
                    // Kjør admin-funksjonalitet
                    window.podcastAdmin.renderPodcastSection();
                }
            });
            return true;
        }
        return false;
    };

    if (!setupAuth() && window.firebaseService) {
        window.firebaseService.waitForInitialization(30000).then(initialized => {
            if (initialized) {
                setupAuth();
            }
        });
    }
}

// Kall denne funksjonen fra podcast.html hvis admin
