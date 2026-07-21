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
        this.eventsBound = false;
        this.init();
    }

    ensureModal() {
        if (!document.getElementById('unsplash-modal')) {
            const modalDiv = document.createElement('div');
            modalDiv.id = 'unsplash-modal';
            modalDiv.className = 'profile-modal';
            modalDiv.style.cssText = 'display: none; z-index: 12000; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.7); align-items: center; justify-content: center; backdrop-filter: blur(10px);';
            modalDiv.innerHTML = `
        <div class="profile-modal-content card modern" style="max-width: 850px; width: 90%; height: 85vh; padding: 0; overflow: hidden; border-radius: 24px; background: white; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.4); display: flex; flex-direction: column;">
            <div class="modal-header" style="background: linear-gradient(135deg, #d17d39, #bd4f2a); color: white; padding: 20px 32px; display: flex; align-items: center; justify-content: space-between; flex-shrink: 0;">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <span class="material-symbols-outlined" style="font-size: 28px;">image_search</span>
                    <h3 style="margin: 0; font-size: 20px; font-weight: 700;">Hent bilde fra Unsplash</h3>
                </div>
                <button id="close-unsplash-modal" style="background: rgba(255,255,255,0.1); border: none; color: white; cursor: pointer; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; transition: all 0.2s;">
                    <span class="material-symbols-outlined">close</span>
                </button>
            </div>
            
            <div class="modal-body" style="padding: 24px 32px; flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 24px;">
                <div class="unsplash-search-bar" style="display: flex; gap: 12px;">
                    <div style="flex: 1; position: relative;">
                        <span class="material-symbols-outlined" style="position: absolute; left: 16px; top: 50%; transform: translateY(-50%); color: #94a3b8; font-size: 22px; pointer-events: none; z-index: 2;">search</span>
                        <input type="text" id="unsplash-search-input" placeholder="Søk etter bilder (f.eks: bibel, natur...)" 
                            style="width: 100% !important; padding: 14px 20px 14px 52px !important; border-radius: 14px !important; border: 2px solid #e2e8f0 !important; font-size: 16px !important; outline: none !important; transition: all 0.2s !important; box-sizing: border-box !important; background: white !important;">
                    </div>
                    <button id="unsplash-search-trigger" class="btn-primary" style="padding: 0 24px; border-radius: 14px; font-weight: 700; background: #d17d39; border: none; color: white; cursor: pointer;">Søk</button>
                </div>
                
                <div id="unsplash-results" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 16px;">
                    <div style="grid-column: 1/-1; text-align: center; padding: 60px 0; color: #94a3b8;">
                        <span class="material-symbols-outlined" style="font-size: 48px; display: block; margin-bottom: 12px; opacity: 0.5;">photo_library</span>
                        Søk etter bilder for å se resultater
                    </div>
                </div>
                
                <div id="unsplash-loader" style="display: none; text-align: center; padding: 40px 0;">
                    <div class="loader" style="margin: 0 auto;"></div>
                    <p style="margin-top: 12px; color: #64748b; font-weight: 500;">Henter bilder...</p>
                </div>
            </div>
            
            <div class="modal-footer" style="padding: 16px 32px; background: #f8fafc; border-top: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0;">
                <div style="font-size: 12px; color: #94a3b8;">
                    Drevet av <a href="https://unsplash.com" target="_blank" style="color: #64748b; font-weight: 600;">Unsplash</a>
                </div>
                <button id="unsplash-cancel" class="btn-secondary" style="padding: 10px 24px; border-radius: 12px; font-weight: 600; cursor: pointer; background: white; border: 1px solid #e2e8f0; color: #64748b;">Avbryt</button>
            </div>
        </div>
            `;
            document.body.appendChild(modalDiv);
        }

        this.modal = document.getElementById('unsplash-modal');
        this.input = document.getElementById('unsplash-search-input');
        this.trigger = document.getElementById('unsplash-search-trigger');
        this.resultsContainer = document.getElementById('unsplash-results');
        this.loader = document.getElementById('unsplash-loader');
        this.closeBtns = [
            document.getElementById('close-unsplash-modal'),
            document.getElementById('unsplash-cancel')
        ];
    }

    init() {
        this.ensureModal();
        if (!this.modal || this.eventsBound) return;

        if (this.trigger) {
            this.trigger.addEventListener('click', () => this.performSearch());
        }
        if (this.input) {
            this.input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.performSearch();
            });
        }

        this.closeBtns.forEach(btn => {
            if (btn) btn.addEventListener('click', () => this.close());
        });

        // Lukk ved klikk utenfor modal-innhold
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.close();
        });

        this.eventsBound = true;
    }

    open(callback) {
        this.ensureModal();
        this.init();
        this.onSelectCallback = callback;
        if (this.modal) {
            this.modal.style.display = 'flex';
        }
        if (this.input) {
            this.input.focus();
        }

        // Hvis ingen nøkkel er satt, vis en advarsel
        if (!this.ACCESS_KEY && this.resultsContainer) {
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
        if (this.modal) {
            this.modal.style.display = 'none';
        }
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
            // Translate search term to English using Google Translate API for better Unsplash results
            let searchQuery = query;
            try {
                const sl = 'no';
                const tl = 'en';
                const translateUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURIComponent(query)}`;
                const translateRes = await fetch(translateUrl);
                if (translateRes.ok) {
                    const translateData = await translateRes.json();
                    if (translateData && translateData[0]) {
                        const translatedText = translateData[0].map(s => s[0]).filter(Boolean).join('');
                        if (translatedText && translatedText.trim()) {
                            searchQuery = translatedText.trim();
                        }
                    }
                }
            } catch (transErr) {
                console.warn('[Unsplash] Translation error, using original query:', transErr);
            }

            const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(searchQuery)}&per_page=20&client_id=${this.ACCESS_KEY}`;
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
                        caption: `Foto av ${img.user.name} på Unsplash`,
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
