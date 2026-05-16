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
    firebase.auth().onAuthStateChanged(user => {
        if (user && user.email && user.email.endsWith('@hiskingdomministry.no')) {
            // Kjør admin-funksjonalitet
            window.podcastAdmin.renderPodcastSection();
        }
    });
}

// Kall denne funksjonen fra podcast.html hvis admin
