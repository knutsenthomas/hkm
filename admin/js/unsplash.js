/**
 * UnsplashManager - Håndterer søk og valg av bilder fra Unsplash
 * His Kingdom Ministry - Admin Dashboard
 */

class UnsplashManager {
    constructor() {
        // --- KONFIGURASJON ---
        // Du kan skaffe en gratis API-nøkkel på https://unsplash.com/developers
        this.ACCESS_KEY = 'W5CRu1Mp-4eJ7FV2PIdjVWPfHdkZV00F4I9fjIOEr60';

        this.modal = document.getElementById('unsplash-modal');
        this.input = document.getElementById('unsplash-search-input');
        this.trigger = document.getElementById('unsplash-search-trigger');
        this.resultsContainer = document.getElementById('unsplash-results');
        this.loader = document.getElementById('unsplash-loader');
        this.closeBtns = [
            document.getElementById('close-unsplash-modal'),
            document.getElementById('unsplash-cancel')
        ];

        this.onSelectCallback = null;
        this.init();
    }

    init() {
        if (!this.modal) return;

        this.trigger.addEventListener('click', () => this.performSearch());
        this.input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.performSearch();
        });

        this.closeBtns.forEach(btn => {
            if (btn) btn.addEventListener('click', () => this.close());
        });

        // Lukk ved klikk utenfor modal-innhold
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.close();
        });
    }

    open(callback) {
        this.onSelectCallback = callback;
        this.modal.style.display = 'flex';
        this.input.focus();

        // Hvis ingen nøkkel er satt, vis en advarsel
        if (!this.ACCESS_KEY) {
            this.resultsContainer.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 40px; background: #fff7ed; border: 1px solid #ffedd5; border-radius: 16px; color: #9a3412;">
                    <span class="material-symbols-outlined" style="font-size: 40px; margin-bottom: 12px;">key_off</span>
                    <h4 style="margin: 0 0 8px 0; font-weight: 700;">API-nøkkel mangler</h4>
                    <p style="margin: 0; font-size: 14px; opacity: 0.8;">Vennligst legg inn din Unsplash Access Key i <code>admin/js/unsplash.js</code> for å aktivere bildesøk.</p>
                </div>
            `;
        }
    }

    close() {
        this.modal.style.display = 'none';
        this.onSelectCallback = null;
    }

    async performSearch() {
        const query = this.input.value.trim();
        if (!query) return;

        if (!this.ACCESS_KEY) {
            alert('Vennligst legg inn din Unsplash API-nøkkel i admin/js/unsplash.js først.');
            return;
        }

        this.resultsContainer.style.display = 'none';
        this.loader.style.display = 'block';

        try {
            const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=20&client_id=${this.ACCESS_KEY}`;
            const response = await fetch(url);

            if (!response.ok) {
                if (response.status === 403) throw new Error('API-kvoten er brukt opp eller nøkkelen er ugyldig.');
                throw new Error('Kunne ikke hente bilder.');
            }

            const data = await response.json();
            this.renderResults(data.results);
        } catch (err) {
            this.resultsContainer.innerHTML = `<div style="grid-column: 1/-1; color: #ef4444; text-align: center; padding: 20px;">Feil: ${err.message}</div>`;
            this.resultsContainer.style.display = 'grid';
        } finally {
            this.loader.style.display = 'none';
        }
    }

    renderResults(images) {
        this.resultsContainer.innerHTML = '';
        this.resultsContainer.style.display = 'grid';

        if (images.length === 0) {
            this.resultsContainer.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #64748b;">Ingen bilder funnet for "${this.input.value}"</div>`;
            return;
        }

        images.forEach(img => {
            const card = document.createElement('div');
            card.style.cssText = `
                position: relative;
                aspect-ratio: 1;
                border-radius: 12px;
                overflow: hidden;
                cursor: pointer;
                background: #f1f5f9;
                transition: transform 0.2s, box-shadow 0.2s;
            `;

            card.innerHTML = `
                <img src="${img.urls.small}" alt="${img.alt_description || ''}" style="width: 100%; height: 100%; object-fit: cover;">
                <div style="position: absolute; inset: 0; background: rgba(0,0,0,0.3); opacity: 0; transition: opacity 0.2s; display: flex; align-items: center; justify-content: center;">
                    <span class="material-symbols-outlined" style="color: white; font-size: 32px;">check_circle</span>
                </div>
                <div style="position: absolute; bottom: 0; left: 0; right: 0; padding: 8px; background: linear-gradient(transparent, rgba(0,0,0,0.6)); color: white; font-size: 10px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                    av ${img.user.name}
                </div>
            `;

            card.onmouseenter = () => {
                card.style.transform = 'scale(1.02)';
                card.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                card.querySelector('div').style.opacity = '1';
            };
            card.onmouseleave = () => {
                card.style.transform = 'scale(1)';
                card.style.boxShadow = 'none';
                card.querySelector('div').style.opacity = '0';
            };

            card.onclick = () => {
                if (this.onSelectCallback) {
                    // Vi bruker 'regular' for god nok kvalitet uten å være for tung, 
                    // men inkluderer krediterings-informasjon i alt-teksten hvis ønskelig
                    this.onSelectCallback({
                        url: img.urls.regular,
                        attribution: `Foto av ${img.user.name} på Unsplash`,
                        downloadLocation: img.links.download_location
                    });

                    // Unsplash API krever at vi trigger 'download' endpoint når et bilde brukes
                    this.triggerDownload(img.links.download_location);
                    this.close();
                }
            };

            this.resultsContainer.appendChild(card);
        });
    }

    async triggerDownload(url) {
        if (!this.ACCESS_KEY || !url) return;
        try {
            await fetch(`${url}&client_id=${this.ACCESS_KEY}`);
        } catch (e) {
            console.warn('Kunne ikke trigge Unsplash download event', e);
        }
    }
}

// Eksponer til window så den kan brukes i admin.js
window.unsplashManager = new UnsplashManager();
