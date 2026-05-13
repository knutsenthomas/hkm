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
        const data = doc.exists ? doc.data() : {};
        document.getElementById('episode-title').value = data.title || '';
        document.getElementById('episode-description').value = data.text || '';
        document.getElementById('episode-categories').value = (data.categories || []).join(', ');
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
