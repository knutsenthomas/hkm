// podcast-rediger.js
// Henter episode-data og lagrer endringer
import { firebaseService } from '/js/firebase-service.js';

function getEpisodeIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id') || '';
}


async function loadEpisodeData(episodeId) {
    const infoDiv = document.getElementById('episode-info');
    if (!episodeId) {
        infoDiv.textContent = 'Ingen episode valgt.';
        return;
    }
    try {
        // Hent data fra Firestore
        const doc = await firebase.firestore().collection('podcast_transcripts').doc(episodeId).get();
        let data = doc.exists ? doc.data() : {};
        let title = data.title || '';
        let description = data.text || '';
        let categories = (data.categories || []).join(', ');

        // Hvis ikke data finnes, hent fra RSS-feed via adminManager hvis tilgjengelig
        if ((!title || !description) && window.adminManager && typeof window.adminManager.fetchPodcastEpisodesForAdmin === 'function') {
            try {
                const episodes = await window.adminManager.fetchPodcastEpisodesForAdmin();
                const ep = episodes.find(e => e.id === episodeId);
                if (ep) {
                    if (!title) title = ep.title || '';
                    if (!description) description = ep.description || '';
                }
            } catch (e) {
                // Ignorer feil her
            }
        }

        document.getElementById('episode-title').value = title;
        document.getElementById('episode-description').value = description;
        document.getElementById('episode-categories').value = categories;
        infoDiv.innerHTML = `<b>Episode-ID:</b> ${episodeId}`;
    } catch (e) {
        infoDiv.textContent = 'Kunne ikke laste episode-data.';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const episodeId = getEpisodeIdFromUrl();
    loadEpisodeData(episodeId);

    document.getElementById('edit-podcast-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('episode-title').value;
        const text = document.getElementById('episode-description').value;
        const categories = document.getElementById('episode-categories').value.split(',').map(s => s.trim()).filter(Boolean);
        try {
            await firebase.firestore().collection('podcast_transcripts').doc(episodeId).set({
                title,
                text,
                categories
            }, { merge: true });
            document.getElementById('save-status').textContent = 'Endringer lagret!';
        } catch (e) {
            document.getElementById('save-status').textContent = 'Kunne ikke lagre endringer.';
        }
    });
});
