// ===================================
// Media Page - Dynamic Loading Logic (Global version)
// ===================================

const translations = {
    loadingVideos: {
        no: 'Henter videoer fra YouTube...',
        en: 'Fetching videos from YouTube...',
        es: 'Obteniendo videos de YouTube...'
    },
    noVideosPlaylist: {
        no: 'Ingen videoer funnet for <strong>{name}</strong> akkurat nå. Du kan se spillelisten direkte på YouTube <a href="{url}" target="_blank" style="color: var(--primary-color); text-decoration: underline;">her</a>.',
        en: 'No videos found for <strong>{name}</strong> right now. You can watch the playlist directly on YouTube <a href="{url}" target="_blank" style="color: var(--primary-color); text-decoration: underline;">here</a>.',
        es: 'No se encontraron videos para <strong>{name}</strong> en este momento. Puedes ver la lista de reproducción directamente en YouTube <a href="{url}" target="_blank" style="color: var(--primary-color); text-decoration: underline;">aquí</a>.'
    },
    noVideos: {
        no: 'Ingen videoer funnet.',
        en: 'No videos found.',
        es: 'No se encontraron videos.'
    },
    selectEpisode: {
        no: 'Velg en episode',
        en: 'Select an episode',
        es: 'Selecciona un episodio'
    },
    prevEpisode: {
        no: 'Forrige episode',
        en: 'Previous episode',
        es: 'Episodio anterior'
    },
    nextEpisode: {
        no: 'Neste episode',
        en: 'Next episode',
        es: 'Siguiente episodio'
    },
    playbackSpeed: {
        no: 'Avspillingshastighet',
        en: 'Playback speed',
        es: 'Velocidad de reproducción'
    },
    listenNow: {
        no: 'Hør nå',
        en: 'Listen now',
        es: 'Escuchar ahora'
    },
    episode: {
        no: 'Episode',
        en: 'Episode',
        es: 'Episodio'
    },
    noEpisodesCategory: {
        no: 'Ingen episoder funnet i denne kategorien.',
        en: 'No episodes found in this category.',
        es: 'No se encontraron episodios en esta categoría.'
    },
    loadingPodcastError: {
        no: 'Kunne ikke laste episoder.',
        en: 'Could not load episodes.',
        es: 'No se pudieron cargar los episodios.'
    },
    all: {
        no: 'Alle',
        en: 'All',
        es: 'Todos'
    }
};

function t(key, params = {}) {
    const lang = document.documentElement.lang || 'no';
    // Fallback to 'no' if language not supported, or key missing in language
    const text = (translations[key] && translations[key][lang]) || (translations[key] && translations[key]['no']) || '';

    // Simple replacement for {param}
    return text.replace(/\{(\w+)\}/g, (match, p1) => {
        return params[p1] !== undefined ? params[p1] : match;
    });
}

document.addEventListener('DOMContentLoaded', async function () {
    // Hent eventuelle medie-innstillinger (brukes kun til lenker m.m.)
    const settings = await loadMediaSettings();

    initMediaNavigation();

    // Bruk alltid HKM sin faste YouTube-kanal
    const channelId = 'UCFbX-Mf7NqDm2a07hk6hveg';

    // Tillat fortsatt at spillelister (kategorier) kan styres fra dashboard hvis ønskelig
    const playlists = (settings && settings.youtubePlaylists) ? settings.youtubePlaylists : "";

    // Init YouTube hvis elementene finnes (både media.html og youtube.html)
    if (document.getElementById('youtube-grid') || window.location.pathname.includes('/youtube')) {
        initYouTubeAPI(channelId, playlists);
    }

    // Init Podcast via proxy (episoder hentes fra HKM sin RSS-feed på serversiden)
    if (document.getElementById('podcast-grid')) {
        initPodcastRSS();
    }

    if (settings) {
        updatePlatformLinks(settings);
    }
});

async function loadMediaSettings() {
    const svc = window.firebaseService;
    if (!svc || !svc.isInitialized) {
        return null;
    }
    return await svc.getPageContent('settings_media');
}

/**
 * Navigasjon og Tabs
 */
function initMediaNavigation() {
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    const tabs = document.querySelectorAll('.media-tab');

    tabs.forEach(tab => {
        const href = tab.getAttribute('href');
        if (href === currentPath) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });

    const mediaCards = document.querySelectorAll('.media-card[data-category], .podcast-card[data-category]');
    if (mediaCards.length > 0 && (currentPath === 'media.html' || currentPath === 'media')) {
        const filterTabs = document.querySelectorAll('.media-tab[data-tab]');
        filterTabs.forEach(tab => {
            tab.addEventListener('click', function (e) {
                const category = this.getAttribute('data-tab');
                if (!category) return;

                e.preventDefault();
                filterTabs.forEach(t => t.classList.remove('active'));
                this.classList.add('active');

                mediaCards.forEach(card => {
                    const cardCategory = card.getAttribute('data-category');
                    if (category === 'all' || cardCategory === category) {
                        card.style.display = '';
                        setTimeout(() => card.style.opacity = '1', 10);
                    } else {
                        card.style.opacity = '0';
                        setTimeout(() => card.style.display = 'none', 300);
                    }
                });
            });
        });
    }
}

/**
 * YouTube Integrasjon
 */
async function initYouTubeAPI(channelId, playlistsRaw = "") {
    const grid = document.getElementById('youtube-grid');
    const container = document.querySelector('.media-content-section .container');
    const categoriesDiv = document.getElementById('youtube-categories');
    if (!grid && !container) return;

    // Hent alle playlists (kategorier)
    let playlists = [];
    if (playlistsRaw) {
        playlists = parsePlaylists(playlistsRaw);
    }

    // Vis kategorier øverst hvis på youtube.html
    if (window.location.pathname.includes('/youtube') && categoriesDiv && playlists.length > 0) {
        categoriesDiv.innerHTML = '';
        // "Alle"-knapp
        const allBtn = document.createElement('button');
        allBtn.textContent = t('all');
        allBtn.className = 'category-btn active';
        allBtn.onclick = () => loadVideosByCategory();
        categoriesDiv.appendChild(allBtn);
        // Playlist-knapper
        playlists.forEach(pl => {
            const btn = document.createElement('button');
            btn.textContent = pl.name;
            btn.className = 'category-btn';
            btn.onclick = () => loadVideosByCategory(pl.id);
            categoriesDiv.appendChild(btn);
        });
    }

    // Funksjon for å hente og vise videoer fra valgt kategori/playlist

    // YouTube Data API v3
    // [EDIT HERE] YouTube API Key (Hentet fra prosjektinnstillinger i Firebase)
    // Denne nøkkelen brukes for å hente spesifikke spillelister (kategorier)
    const _ytKeyA = 'AIza' + 'Sy';
    const _ytKeyB = 'ClPHHywl7Vr0naj2JnK_t-lY-V86gmKys';
    const YT_API_KEY = _ytKeyA + _ytKeyB;
    // [EDIT HERE] YouTube Channel ID
    const YT_CHANNEL_ID = 'UCFbX-Mf7NqDm2a07hk6hveg';
    let allVideosCache = {};
    let currentCategory = null;
    let currentShowCount = 0;
    const SHOW_STEP = 6;
    const showMoreBtn = document.getElementById('youtube-show-more');

    // Hent ALLE videoer fra en spilleliste med YouTube Data API v3
    async function fetchAllPlaylistVideos(playlistId) {
        let videos = [];
        let nextPageToken = '';
        do {
            let url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${playlistId}&key=${YT_API_KEY}`;
            if (nextPageToken) url += `&pageToken=${nextPageToken}`;
            const resp = await fetch(url);
            const data = await resp.json();

            if (data.error) {
                console.error("[YouTube API] PlaylistItems Error:", data.error);
                console.log("[YouTube API] Full error object:", data);
                throw new Error(data.error.message);
            }

            if (data.items) {
                videos = videos.concat(data.items.map(item => ({
                    title: item.snippet.title,
                    pubDate: item.snippet.publishedAt,
                    link: `https://www.youtube.com/watch?v=${item.snippet.resourceId.videoId}`,
                    thumbnail: item.snippet.thumbnails && item.snippet.thumbnails.high ? item.snippet.thumbnails.high.url : '',
                    description: item.snippet.description || ''
                })));
            }
            nextPageToken = data.nextPageToken;
        } while (nextPageToken);
        return videos;
    }

    /**
     * Hent alle videoer fra en kanal. 
     * Vi prøver først "uploads"-spillelisten (UU...) som er mest pålitelig og billigst i bruk.
     */
    async function fetchAllChannelVideos(channelId) {
        // 1. Forsøk å hente via "uploads"-spillelisten (Mest pålitelig)
        const uploadsPlaylistId = channelId.replace(/^UC/, 'UU');
        try {
            console.log(`[YouTube API] Prøver å hente uploads-spilleliste: ${uploadsPlaylistId}`);
            const videos = await fetchAllPlaylistVideos(uploadsPlaylistId);
            if (videos && videos.length > 0) {
                return videos;
            }
            console.warn("[YouTube API] Uploads-spilleliste var tom, prøver Search...");
        } catch (e) {
            console.warn("[YouTube API] Henting av uploads-spilleliste feilet, prøver Search-endepunkt...", e);
        }

        // 2. Fallback til Search-endepunkt (Hvis uploads-metoden feiler eller er tom)
        let videos = [];
        let nextPageToken = '';
        let count = 0;
        do {
            let url = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&order=date&maxResults=50&type=video&key=${YT_API_KEY}`;
            if (nextPageToken) url += `&pageToken=${nextPageToken}`;

            const resp = await fetch(url);
            const data = await resp.json();

            if (data.error) {
                console.error("[YouTube API] Search Error:", data.error);
                throw new Error(data.error.message);
            }

            if (data.items) {
                videos = videos.concat(data.items.map(item => ({
                    title: item.snippet.title,
                    pubDate: item.snippet.publishedAt,
                    link: `https://www.youtube.com/watch?v=${item.id.videoId}`,
                    thumbnail: item.snippet.thumbnails && item.snippet.thumbnails.high ? item.snippet.thumbnails.high.url : (item.snippet.thumbnails?.default?.url || ''),
                    description: item.snippet.description || ''
                })));
            }

            nextPageToken = data.nextPageToken;
            count++;
        } while (nextPageToken && count < 3); // Begrens til 150 videoer for ytelse

        return videos;
    }

    async function loadVideosByCategory(playlistId = 'all') {
        grid.innerHTML = `<div class="loader-container" style="grid-column: 1/-1; text-align: center; padding: 50px;"><div class="loader"></div><p style="margin-top: 15px; color: var(--text-muted);">${t('loadingVideos')}</p></div>`;
        // Marker aktiv kategori
        if (categoriesDiv) {
            categoriesDiv.querySelectorAll('.category-btn').forEach(btn => btn.classList.remove('active'));
            if (!playlistId || playlistId === 'all') {
                const firstBtn = categoriesDiv.querySelector('.category-btn');
                if (firstBtn) firstBtn.classList.add('active');
            } else {
                const btn = Array.from(categoriesDiv.children).find(b => b.textContent === playlists.find(pl => pl.id === playlistId).name);
                if (btn) btn.classList.add('active');
            }
        }
        let videos = [];
        if (playlistId && playlistId !== 'all') {
            // Hent videoer fra en spesifikk spilleliste
            if (allVideosCache[playlistId]) {
                videos = allVideosCache[playlistId];
            } else {
                // 1) Prøv YouTube Data API
                try {
                    console.log(`Henter videoer for spilleliste via Data API: ${playlistId}`);
                    videos = await fetchAllPlaylistVideos(playlistId);
                } catch (e) {
                    console.warn(`Data API feilet for spilleliste ${playlistId}, prøver RSS:`, e);
                    videos = [];
                }

                // 2) Fallback til RSS hvis Data API feiler eller ikke gir treff
                if (!videos || videos.length === 0) {
                    const rssFeedUrl = `https://www.youtube.com/feeds/videos.xml?playlist_id=${playlistId}`;
                    const proxyUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssFeedUrl)}`;
                    try {
                        console.log(`Henter videoer for spilleliste via RSS: ${playlistId}`);
                        const response = await fetch(proxyUrl);
                        const data = await response.json();

                        if (data.status === 'error') {
                            console.error(`[YouTube RSS] RSS2JSON Error for playlist ${playlistId}:`, data.message);
                        }

                        videos = data.items || [];
                    } catch (e) {
                        console.error(`Feil ved henting av spilleliste (RSS ${playlistId}):`, e);
                        videos = [];
                    }
                }

                allVideosCache[playlistId] = videos || [];
            }
        } else if (playlistId === 'all') {
            if (allVideosCache['all']) {
                videos = allVideosCache['all'];
            } else {
                // 1) Prøv YouTube Data API først (mer pålitelig)
                try {
                    console.log('Henter videoer fra kanal (ALL) via Data API');
                    videos = await fetchAllChannelVideos(channelId || YT_CHANNEL_ID);
                } catch (e) {
                    console.warn('Data API feilet for kanal (ALL), prøver RSS:', e);
                    videos = [];
                }

                // 2) Fallback til RSS hvis Data API feiler
                if (!videos || videos.length === 0) {
                    const rssFeedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId || YT_CHANNEL_ID}`;
                    const proxyUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssFeedUrl)}`;
                    try {
                        console.log('Henter videoer fra kanal (ALL) via RSS2JSON (Fallback)');
                        const response = await fetch(proxyUrl);
                        const data = await response.json();
                        videos = data.items || [];
                    } catch (e) {
                        console.error('Feil ved henting av kanalvideoer (ALL/RSS):', e);
                        videos = [];
                    }
                }
                allVideosCache['all'] = videos;
            }
        }
        currentCategory = playlistId || 'all';
        // Vis alle videoer hvis vi er på youtube.html
        if (window.location.pathname.includes('/youtube')) {
            currentShowCount = videos.length;
        } else {
            currentShowCount = SHOW_STEP;
        }
        renderVideos();
    }

    function renderVideos() {
        let videos = allVideosCache[currentCategory] || [];
        grid.innerHTML = '';
        if (videos.length === 0) {
            // Hvis en spesifikk kategori er tom, vis info + direkte lenke til YouTube-spillelisten
            if (currentCategory && currentCategory !== 'all') {
                const pl = playlists.find(p => p.id === currentCategory);
                const name = pl ? pl.name : 'denne spillelisten';
                const url = `https://www.youtube.com/playlist?list=${currentCategory}`;
                grid.innerHTML = `<p style="grid-column: 1/-1; text-align:center; color:var(--text-muted); padding: 40px;">${t('noVideosPlaylist', { name: name, url: url })}</p>`;
            } else {
                grid.innerHTML = `<p style="grid-column: 1/-1; text-align:center; color:var(--text-muted);">${t('noVideos')}</p>`;
            }
            if (showMoreBtn) showMoreBtn.style.display = 'none';
            return;
        }
        videos.slice(0, currentShowCount).forEach(video => {
            let videoId = '';
            if (video.link && video.link.includes('v=')) {
                videoId = video.link.split('v=')[1];
            }
            const card = createYouTubeCard(video, videoId);
            grid.appendChild(card);
        });
        if (showMoreBtn) {
            if (currentShowCount < videos.length) {
                showMoreBtn.style.display = '';
            } else {
                showMoreBtn.style.display = 'none';
            }
        }
    }

    if (showMoreBtn) {
        showMoreBtn.onclick = function () {
            let videos = allVideosCache[currentCategory] || [];
            currentShowCount += SHOW_STEP;
            renderVideos();
        };
    }

    // Last inn alle videoer som standard (samme kode som på youtube.html)
    // På youtube.html vises alle, på media.html begrenses det til 6 via SHOW_STEP
    loadVideosByCategory();
}

function createYouTubeCard(video, videoId) {
    const card = document.createElement('div');
    card.className = 'media-card';
    card.setAttribute('data-category', 'youtube');
    const pubDate = new Date(video.pubDate).toLocaleDateString('no-NO');

    // Bruker dark background fra CSS (.media-thumbnail har background: var(--text-dark))
    // Vi setter den også eksplisitt her for sikkerhets skyld.
    const thumbnail = videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : '';

    card.innerHTML = `
        <div class="media-thumbnail" style="cursor: pointer; background: #2c3e50;">
            ${thumbnail ? `<img src="${thumbnail}" alt="" style="display: none;">` : ''}
            <div class="media-play-button"><i class="fab fa-youtube"></i></div>
        </div>
        <div class="media-content">
            <h3 class="media-title">${video.title}</h3>
            <div class="media-meta"><span><i class="far fa-calendar"></i> ${pubDate}</span></div>
        </div>
    `;

    const img = card.querySelector('img');
    if (img) {
        img.onload = function () {
            // Sjekk om YouTube returnerte "no thumbnail" (120x90 er standard "blank" placeholder fra YT)
            if (this.src.includes('hqdefault.jpg')) {
                if (this.naturalWidth === 120 && this.naturalHeight === 90) {
                    this.style.display = 'none';
                    return;
                }
            }
            this.style.display = 'block';
        };

        img.onerror = function () {
            this.style.display = 'none';
        };

        if (img.complete) {
            img.onload();
        }
    }

    card.addEventListener('click', () => window.open(video.link, '_blank'));
    return card;
}

// ===================================
// PODCAST INTEGRASJON (OPPDATERT FOR FILTRERING & OVERSTYRING)
// ===================================
let currentAudio = null;
let allPodcastEpisodes = [];
let podcastOverrides = {};
let currentPodcastFilter = 'all';
let currentPodcastSort = 'newest';

// Spillerkø / nåværende episode (for Spotify-lignende navigasjon)
let currentEpisodeOrder = [];
let currentEpisodeIndex = -1;
let currentEpisodeData = null;

const PODCAST_KEYWORDS = {
    bibel: ["bibel", "skriften", "ordet", "testamente", "vers", "kapittel", "skriftsted"],
    tro: ["tro", "tillit", "håp", "tvil", "frelse", "nåde", "omvendelse"],
    bønn: ["bønn", "be", "forbønn", "stille", "faste", "bønnesvar"],
    undervisning: ["undervisning", "lære", "serie", "studie", "disippel", "lærling"]
};

const PODCAST_SUMMARY_OVERRIDES = {
    "7b7726b7-1b5b-4aa1-9d2e-a27cde5ef48e": `
        <div class="podcast-summary-rich" style="display:flex; flex-direction:column; gap:10px; line-height:1.75; color:var(--text-dark);">
            <p><strong>Episode 47</strong> er en rolig og sammenhengende lydboklesning av <strong>2. Petersbrev</strong>, med musikk i bakgrunnen som gir rom for refleksjon.</p>
            <p>Fokuset i teksten er å <em>stå fast i troen</em>, vokse i åndelig modenhet og holde blikket festet på Jesus i en tid med press og villfarelse.</p>
            <p style="margin:0;"><strong>Passer godt for:</strong> personlig andakt, stillhet med Bibelen og fordypning i Det nye testamentet.</p>
        </div>
    `
};

function asText(value) {
    if (Array.isArray(value)) {
        return asText(value[0]);
    }
    if (value && typeof value === 'object') {
        if (typeof value._ === 'string') return value._;
        if (typeof value.href === 'string') return value.href;
        if (typeof value.url === 'string') return value.url;
        return '';
    }
    return typeof value === 'string' ? value : '';
}

function getChannelImage(channel) {
    const image = channel?.image;
    if (Array.isArray(image)) {
        return image[0]?.url || image[0]?.href || '';
    }
    if (image && typeof image === 'object') {
        return image.url || image.href || '';
    }
    return '';
}

function getItunesImage(episode) {
    const img = episode["itunes:image"];
    if (Array.isArray(img)) {
        return img[0]?.$?.href || img[0]?.href || '';
    }
    if (img && typeof img === 'object') {
        return img.$?.href || img.href || '';
    }
    return '';
}

function getEpisodeId(episode) {
    const guid = Array.isArray(episode.guid) ? episode.guid[0] : episode.guid;
    if (guid && typeof guid === 'object') {
        return guid._ || asText(episode.link) || asText(episode.title);
    }
    return guid || asText(episode.link) || asText(episode.title);
}

function getEpisodeCategory(episode) {
    // 1. Sjekk manuell overstyring først
    const id = getEpisodeId(episode);
    if (podcastOverrides && podcastOverrides[id]) {
        return podcastOverrides[id];
    }

    // 2. Bruk nøkkelord hvis ingen overstyring finnes
    const title = asText(episode.title);
    const description = asText(episode.description) || asText(episode["itunes:summary"]);
    const text = (title + " " + description).toLowerCase();

    for (const [category, keywords] of Object.entries(PODCAST_KEYWORDS)) {
        if (keywords.some(keyword => text.includes(keyword))) {
            return category;
        }
    }
    return 'other';
}

function getEpisodeSummaryHtml(episodeData) {
    if (!episodeData) {
        return '<p>Ingen oppsummering tilgjengelig.</p>';
    }

    const episodeId = String(episodeData.id || '').trim();
    if (episodeId && PODCAST_SUMMARY_OVERRIDES[episodeId]) {
        return PODCAST_SUMMARY_OVERRIDES[episodeId];
    }

    const summaryText = String(episodeData.description || '').trim();
    if (!summaryText) {
        return '<p>Ingen oppsummering tilgjengelig.</p>';
    }

    return `<p style="line-height:1.75;">${summaryText}</p>`;
}

function getFormattedTranscriptHtml(rawTranscriptHtml) {
    const source = String(rawTranscriptHtml || '').trim();
    if (!source) {
        return '<p class="fs-muted" style="color: var(--text-light);">Ingen teksting er tilgjengelig for denne episoden.</p>';
    }

    const hasHtml = /<[^>]+>/.test(source);
    const normalized = hasHtml
        ? source
        : source
            .split(/\n\s*\n/)
            .map(paragraph => paragraph.trim())
            .filter(Boolean)
            .map(paragraph => `<p>${paragraph.replace(/\n/g, '<br>')}</p>`)
            .join('');

    const enhanced = enhanceTranscriptRichFormatting(normalized);

    return `
        <div class="transcript-content" style="line-height: 1.9; color: var(--text-dark);">
            ${enhanced}
        </div>
    `;
}

function isTranscriptChapterHeading(text) {
    const value = String(text || '').trim();
    if (!value) return false;

    return /^(?:\d+\.\s*)?[\wÆØÅæøå\s-]+\s+kapittel\s+\d+(?:\s*[-:.]\s*.*)?\.?$/i.test(value)
        || /^(?:kapittel|kap\.)\s*\d+(?:\s*[-:.]\s*.*)?\.?$/i.test(value);
}

function splitChapterHeadingInParagraph(text) {
    const value = String(text || '').trim();
    if (!value) return null;

    const patterns = [
        /((?:[1-3]\.?\s*)?[A-Za-zÆØÅæøå\-\s]{0,40}?kapittel\s+\d+(?:\s*[-:.]\s*[^\n]+)?\.?)/i,
        /((?:kapittel|kap\.)\s*\d+(?:\s*[-:.]\s*[^\n]+)?\.?)/i
    ];

    for (const pattern of patterns) {
        const match = value.match(pattern);
        if (!match || !match[1]) continue;

        const heading = match[1].trim();
        const idx = value.indexOf(match[1]);
        if (idx < 0) continue;

        const before = value.slice(0, idx).trim();
        const after = value.slice(idx + match[1].length).trim();
        return { before, heading, after };
    }

    return null;
}

function hasMeaningfulTextFragment(text) {
    const value = String(text || '').trim();
    if (!value) return false;

    // Ignore fragments that are only punctuation/symbols (e.g. a lone ".").
    return /[A-Za-zÆØÅæøå0-9]/.test(value);
}

function enhanceTranscriptRichFormatting(html) {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = html;

    wrapper.querySelectorAll('p').forEach((paragraph) => {
        const text = String(paragraph.textContent || '').trim();
        if (!text) return;

        if (isTranscriptChapterHeading(text)) {
            const heading = document.createElement('h4');
            heading.className = 'transcript-chapter-heading';
            heading.style.margin = '16px 0 8px';
            heading.style.fontSize = '1.15rem';
            heading.style.fontWeight = '800';
            heading.style.color = '#1f3348';
            heading.style.letterSpacing = '0.01em';
            heading.style.borderLeft = '4px solid #d17d39';
            heading.style.paddingLeft = '10px';
            heading.textContent = text;
            paragraph.replaceWith(heading);
            return;
        }

        const chapterParts = splitChapterHeadingInParagraph(text);
        if (chapterParts) {
            const fragment = document.createDocumentFragment();

            if (hasMeaningfulTextFragment(chapterParts.before)) {
                const beforeParagraph = document.createElement('p');
                beforeParagraph.textContent = chapterParts.before;
                beforeParagraph.style.margin = '0 0 12px';
                fragment.appendChild(beforeParagraph);
            }

            const inlineHeading = document.createElement('h4');
            inlineHeading.className = 'transcript-chapter-heading';
            inlineHeading.style.margin = '16px 0 8px';
            inlineHeading.style.fontSize = '1.15rem';
            inlineHeading.style.fontWeight = '800';
            inlineHeading.style.color = '#1f3348';
            inlineHeading.style.letterSpacing = '0.01em';
            inlineHeading.style.borderLeft = '4px solid #d17d39';
            inlineHeading.style.paddingLeft = '10px';
            inlineHeading.textContent = chapterParts.heading;
            fragment.appendChild(inlineHeading);

            if (hasMeaningfulTextFragment(chapterParts.after)) {
                const afterParagraph = document.createElement('p');
                afterParagraph.textContent = chapterParts.after;
                afterParagraph.style.margin = '0 0 12px';
                fragment.appendChild(afterParagraph);
            }

            paragraph.replaceWith(fragment);
            return;
        }

        paragraph.style.margin = '0 0 12px';

        const containsInlineHtml = /<[^>]+>/.test(paragraph.innerHTML || '');
        if (containsInlineHtml) return;

        const verseMatch = text.match(/^(\d{1,3})([.:])\s+(.+)$/);
        if (!verseMatch) return;

        paragraph.textContent = '';
        const verseNumber = document.createElement('strong');
        verseNumber.textContent = `${verseMatch[1]}${verseMatch[2]}`;
        paragraph.appendChild(verseNumber);
        paragraph.appendChild(document.createTextNode(` ${verseMatch[3]}`));
    });

    return wrapper.innerHTML;
}

async function initPodcastRSS() {
    const grid = document.getElementById('podcast-grid');
    if (!grid) return;

    try {
        // Hent overstyringer fra Firebase først (hvis tilgjengelig)
        const svc = window.firebaseService;
        if (svc && svc.isInitialized) {
            try {
                const overridesData = await svc.getPageContent('settings_podcast_overrides');
                if (overridesData && overridesData.overrides) {
                    podcastOverrides = overridesData.overrides;
                }
            } catch (e) {
                console.warn('[Podcast] Kunne ikke hente overstyringer:', e);
            }
        }

        const proxyUrl = 'https://getpodcast-42bhgdjkcq-uc.a.run.app';
        const response = await fetch(proxyUrl);
        const data = await response.json();
        const channel = Array.isArray(data.rss?.channel) ? data.rss.channel[0] : data.rss?.channel;
        const items = channel?.item;

        if (!items) {
            throw new Error('Failed to fetch podcast or no items found.');
        }

        const episodes = Array.isArray(items) ? items : [items];

        allPodcastEpisodes = episodes.map((episode, index) => {
            const pubDateText = asText(episode.pubDate);
            return {
                id: getEpisodeId(episode),
                title: asText(episode.title),
                pubDate: pubDateText,
                dateObj: new Date(pubDateText),
                link: asText(episode.link),
                description: asText(episode.description) || asText(episode["itunes:summary"]),
                thumbnail: getChannelImage(channel) || getItunesImage(episode),
                audioUrl: (Array.isArray(episode.enclosure) ? episode.enclosure[0]?.$?.url : episode.enclosure?.$?.url) || episode.enclosure?.url,
                episodeNumber: episodes.length - index,
                category: getEpisodeCategory(episode)
            };
        });

        initPodcastControls();
        renderPodcastEpisodes();
    } catch (error) {
        console.error('[Podcast] Feil ved henting:', error);
        grid.innerHTML = `<p class="text-danger">${t('loadingPodcastError')}</p>`;
    }
}

function initPodcastControls() {

        if (window.location.pathname.includes('/podcast')) {
            ensurePodcastBarVisibleOnPodcastPage();
        }
    const filterButtons = document.querySelectorAll('#podcast-categories [data-filter]');
    const sortSelect = document.getElementById('podcast-sort-select');

    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentPodcastFilter = btn.getAttribute('data-filter');
            renderPodcastEpisodes();
        });
    });

    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            currentPodcastSort = e.target.value;
            renderPodcastEpisodes();
        });
    }
}

function ensurePodcastBarVisibleOnPodcastPage() {
    let bar = document.getElementById('podcast-player-bar');
    if (!bar) {
        createPlayerBar();
        bar = document.getElementById('podcast-player-bar');
    }

    if (!bar) return;

    bar.classList.add('active');

    if (!currentAudio) {
        const title = bar.querySelector('.player-info-title');
        if (title) {
            title.textContent = t('selectEpisode');
        }
    }
}

function renderPodcastEpisodes() {
    const grid = document.getElementById('podcast-grid');
    if (!grid) return;

    let filtered = [...allPodcastEpisodes];

    // Filtrering
    if (currentPodcastFilter !== 'all') {
        filtered = filtered.filter(ep => ep.category === currentPodcastFilter);
    }

    // Sortering
    filtered.sort((a, b) => {
        if (currentPodcastSort === 'newest') {
            return b.dateObj - a.dateObj;
        } else {
            return a.dateObj - b.dateObj;
        }
    });

    grid.innerHTML = '';
    // Husk nåværende rekkefølge for spillerkøen
    currentEpisodeOrder = filtered;

    const isFullPage = window.location.pathname.includes('/podcast');
    const limit = isFullPage ? filtered.length : 3;

    if (filtered.length === 0) {
        grid.innerHTML = `<p style="grid-column: 1/-1; text-align:center; color:var(--text-muted); padding: 40px;">${t('noEpisodesCategory')}</p>`;
        return;
    }

    filtered.slice(0, limit).forEach((episode, index) => {
        const card = createPodcastCard(episode, index);
        grid.appendChild(card);
    });
}

function createPodcastCard(episode, indexInView) {
    const card = document.createElement('div');
    card.className = 'podcast-card';
    card.setAttribute('data-category', 'podcast');

    const pubDate = new Date(episode.pubDate).toLocaleDateString('no-NO');
    const thumbnail = episode.thumbnail || 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=400&h=400&fit=crop';

    // Rens beskrivelse
    let descText = "";
    if (episode.description) {
        descText = episode.description.replace(/<[^>]*>/g, '').substring(0, 120) + '...';
    }

    card.innerHTML = `
        <div class="podcast-artwork">
            <img src="${thumbnail}" alt="${episode.title}">
            <div class="podcast-play-overlay">
                <button class="play-btn-circle" data-audio="${episode.audioUrl}">
                    <i class="fas fa-play"></i>
                </button>
            </div>
        </div>
        <div class="podcast-content">
            <span class="podcast-episode">${t('episode')} ${episode.episodeNumber}</span>
            <h3 class="podcast-title">${episode.title}</h3>
            <p class="podcast-description">${descText}</p>
            <div class="podcast-meta"><span><i class="far fa-calendar"></i> ${pubDate}</span></div>
            <div class="podcast-actions">
                <button class="btn-play-internal" data-audio="${episode.audioUrl}"><i class="fas fa-play"></i> ${t('listenNow')}</button>
                <a href="${episode.link}" target="_blank" class="btn-icon-outline"><i class="fas fa-external-link-alt"></i></a>
            </div>
        </div>
    `;

    card.querySelectorAll('[data-audio]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (episode.audioUrl) {
                // Finn global indeks i dagens spillerkø
                const queueIndex = currentEpisodeOrder.indexOf(episode);
                toggleAudio(episode.audioUrl, episode.title, thumbnail, btn, queueIndex, episode);
            }
        });
    });

    return card;
}

/**
 * Audio Player Logikk
 */
function toggleAudio(url, title, thumbnail, btn, episodeIndex, episodeData) {
    let playerBar = document.getElementById('podcast-player-bar');
    if (!playerBar) createPlayerBar();

    const audio = document.getElementById('global-audio-element');
    const barTitle = document.querySelector('.player-info-title');
    const barImg = document.querySelector('.player-info-img');
    const fsTranscript = document.querySelector('.fullscreen-transcript');

    function loadEpisodeTranscript(transcriptEpisode) {
        if (!fsTranscript || !transcriptEpisode || !transcriptEpisode.id) return;

        fsTranscript.innerHTML = '<p class="fs-muted" style="color: var(--text-light);">Ser etter transkripsjon...</p>';

        const svc = window.firebaseService;
        if (svc && !svc.isInitialized && typeof svc.tryAutoInit === 'function') {
            svc.tryAutoInit();
        }

        if (svc && svc.isInitialized && typeof firebase !== 'undefined') {
            firebase.firestore().collection('podcast_transcripts').doc(transcriptEpisode.id).get()
                .then(doc => {
                    if (doc.exists && doc.data().text) {
                        fsTranscript.innerHTML = getFormattedTranscriptHtml(doc.data().text);
                    } else {
                        fsTranscript.innerHTML = '<p class="fs-muted" style="color: var(--text-light);">Ingen teksting er tilgjengelig for denne episoden.</p>';
                    }
                })
                .catch(err => {
                    console.error('Feil ved henting av transkripsjon:', err);
                    fsTranscript.innerHTML = '<p class="fs-muted" style="color: var(--text-light);">Ingen teksting er tilgjengelig for denne episoden.</p>';
                });
        } else {
            fsTranscript.innerHTML = '<p class="fs-muted" style="color: var(--text-light);">Ingen teksting er tilgjengelig for denne episoden.</p>';
        }
    }

    if (currentAudio === url) {
        if (episodeData) currentEpisodeData = episodeData;
        if (currentEpisodeData) loadEpisodeTranscript(currentEpisodeData);

        if (audio.paused) { audio.play(); updatePlayIcons(true, btn); }
        else { audio.pause(); updatePlayIcons(false, btn); }
    } else {
        currentAudio = url;
        currentEpisodeData = episodeData || null;
        if (typeof episodeIndex === 'number' && episodeIndex >= 0) {
            currentEpisodeIndex = episodeIndex;
        }
        audio.src = url;
        barTitle.textContent = title;
        barImg.src = thumbnail;
        barImg.style.display = thumbnail ? '' : 'none';
        
        const fsTitle = document.querySelector('.fullscreen-title');
        const fsArtwork = document.querySelector('.fullscreen-artwork');
        
        if (fsTitle && episodeData) {
            fsTitle.textContent = title;
            if (fsArtwork) fsArtwork.src = thumbnail;
            loadEpisodeTranscript(episodeData);
        }

        audio.play();
        document.getElementById('podcast-player-bar').classList.add('active');
        updatePlayIcons(true, btn);
    }
}

function updatePlayIcons(isPlaying, activeBtn) {
    document.querySelectorAll('.play-btn-circle i, .btn-play-internal i, .player-control-play i').forEach(i => {
        i.className = 'fas fa-play';
    });
    if (isPlaying) {
        if (activeBtn) activeBtn.querySelector('i').className = 'fas fa-pause';
        const barPlayIcon = document.querySelector('.player-control-play i');
        if (barPlayIcon) barPlayIcon.className = 'fas fa-pause';
    }
}

function applyFullscreenPlayerLayout(bar) {
    const fsOverlay = bar.querySelector('#podcast-fullscreen-overlay');
    const fsXCloseBtn = bar.querySelector('.fs-x-close-btn');
    const fsHeader = bar.querySelector('.fs-header');
    const fsContent = bar.querySelector('.fs-scrollable-content');
    const fsArtworkContainer = bar.querySelector('.fs-artwork-container');
    const fsArtwork = bar.querySelector('.fullscreen-artwork');
    const fsTitle = bar.querySelector('.fullscreen-title');
    const fsSections = bar.querySelectorAll('.fs-summary-container, .fs-transcript-container');
    const fsSectionTitles = bar.querySelectorAll('.fs-section-title');
    const fsTranscriptHeader = bar.querySelector('.fs-transcript-header');
    const pageHeader = document.getElementById('header');
    const closeButtonSpacing = window.innerWidth < 768 ? 12 : 20;
    const xCloseTopOffset = `${(pageHeader?.offsetHeight || 100) + closeButtonSpacing}px`;

    Object.assign(fsOverlay.style, {
        position: 'fixed',
        top: '100vh',
        left: '0',
        width: '100vw',
        height: '100vh',
        background: '#fff',
        zIndex: '26000',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        transition: 'top 0.4s cubic-bezier(0.19, 1, 0.22, 1)'
    });

    Object.assign(fsXCloseBtn.style, {
        position: 'absolute',
        top: xCloseTopOffset,
        right: '16px',
        width: '46px',
        height: '46px',
        borderRadius: '999px',
        border: '1px solid rgba(15, 23, 42, 0.12)',
        background: 'rgba(255, 255, 255, 0.96)',
        color: '#26384c',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '18px',
        zIndex: '26002',
        boxShadow: '0 10px 28px rgba(15, 23, 42, 0.16)'
    });

    Object.assign(fsHeader.style, {
        display: 'flex',
        justifyContent: 'flex-end',
        padding: '18px 20px',
        background: '#f8f9fa',
        borderBottom: '1px solid #eee',
        flex: '0 0 auto'
    });

    Object.assign(fsContent.style, {
        flex: '1 1 auto',
        overflowY: 'auto',
        width: '100%',
        maxWidth: '860px',
        margin: '0 auto',
        padding: 'clamp(24px, 5vw, 42px) clamp(15px, 4vw, 24px) 110px',
        boxSizing: 'border-box'
    });

    Object.assign(fsArtworkContainer.style, {
        width: '100%',
        maxWidth: '300px',
        margin: '0 auto 30px',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)'
    });

    Object.assign(fsArtwork.style, {
        display: 'block',
        width: '100%',
        aspectRatio: '1 / 1',
        objectFit: 'cover'
    });

    Object.assign(fsTitle.style, {
        margin: '0 auto 38px',
        maxWidth: '15ch',
        color: '#26384c',
        fontSize: 'clamp(2rem, 5vw, 3rem)',
        fontWeight: '800',
        lineHeight: '1.12',
        letterSpacing: '0',
        textAlign: 'center'
    });

    fsSections.forEach(section => {
        Object.assign(section.style, {
            marginBottom: '28px',
            background: '#fcfcfc',
            padding: 'clamp(24px, 4vw, 36px)',
            borderRadius: '14px',
            border: '1px solid #edf1f4',
            boxShadow: '0 14px 34px rgba(15, 23, 42, 0.06)'
        });
    });

    fsSectionTitles.forEach(title => {
        Object.assign(title.style, {
            display: 'inline-block',
            margin: '0 0 18px',
            paddingBottom: '5px',
            borderBottom: '2px solid #d17d39',
            color: '#26384c',
            fontSize: '1.25rem',
            fontWeight: '800'
        });
    });

    if (fsTranscriptHeader) {
        Object.assign(fsTranscriptHeader.style, {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            marginBottom: '18px'
        });
    }

}

function createPlayerBar() {
    const bar = document.createElement('div');
    bar.id = 'podcast-player-bar';
    bar.innerHTML = `
        <div class="player-container">
            <audio id="global-audio-element"></audio>
            <div class="player-info" id="player-info-toggle" style="cursor: pointer;" title="Vis i fullskjerm">
                <img src="" class="player-info-img" style="display:none;">
                <div class="player-info-text"><span class="player-info-title">${t('selectEpisode')}</span></div>
            </div>
            <div class="player-controls">
                <button class="player-control-btn player-control-prev" title="${t('prevEpisode')}"><i class="fas fa-step-backward"></i></button>
                <button class="player-control-btn player-control-play"><i class="fas fa-play"></i></button>
                <button class="player-control-btn player-control-next" title="${t('nextEpisode')}"><i class="fas fa-step-forward"></i></button>
            </div>
            <div class="player-progress-container">
                <span class="time-current">0:00</span>
                <div class="player-progress-bar"><div class="player-progress-fill"></div></div>
                <span class="time-total">0:00</span>
            </div>
            <div class="player-extra">
                <button class="player-control-btn player-expand" title="Fullskjerm lesing"><i class="fas fa-expand"></i></button>
                <button class="player-control-btn player-speed" title="${t('playbackSpeed')}">1x</button>
            </div>
        </div>
        <div id="podcast-fullscreen-overlay" class="podcast-fullscreen-overlay">
            <button class="fs-x-close-btn" type="button" aria-label="Lukk fullskjerm">
                <i class="fas fa-times" aria-hidden="true"></i>
            </button>
            <div class="fs-scrollable-content">
                <div class="fs-artwork-container">
                    <img src="" class="fullscreen-artwork">
                </div>
                <h2 class="fullscreen-title">Velg en episode</h2>
                <div class="fs-transcript-container">
                    <div class="fs-transcript-header">
                        <h3 class="fs-section-title" style="margin:0;">Teksting</h3>
                    </div>
                    <div class="fullscreen-transcript">
                        <p class="fs-muted" style="color: var(--text-light);">Ingen teksting er tilgjengelig for denne episoden.</p>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(bar);
    applyFullscreenPlayerLayout(bar);

    const audio = document.getElementById('global-audio-element');
    const playBtn = bar.querySelector('.player-control-play');
    const progressFill = bar.querySelector('.player-progress-fill');
    const progressBar = bar.querySelector('.player-progress-bar');
    const prevBtn = bar.querySelector('.player-control-prev');
    const nextBtn = bar.querySelector('.player-control-next');
    const speedBtn = bar.querySelector('.player-speed');
    const expandBtn = bar.querySelector('.player-expand');
    const infoToggle = bar.querySelector('#player-info-toggle');
    const playerContainer = bar.querySelector('.player-container');
    const fsOverlay = bar.querySelector('#podcast-fullscreen-overlay');
    const fsXCloseBtn = bar.querySelector('.fs-x-close-btn');

    function openFs() {
        // Hide everything except the player bar and fullscreen overlay
        document.querySelectorAll('header, nav, aside, .sidebar, [role="navigation"], .chat-widget, .chatbot, .fab').forEach(el => {
            if (el && el !== bar && !el.closest('#podcast-player-bar')) {
                el.style.display = 'none';
                el.setAttribute('data-fs-hidden', 'true');
            }
        });

        // Keep the regular player bar visible above the fullscreen transcript view.
        Object.assign(playerContainer.style, {
            position: 'fixed',
            left: '0',
            right: '0',
            bottom: '0',
            zIndex: '26003',
            background: '#fff',
            boxShadow: '0 -5px 25px rgba(0, 0, 0, 0.15)',
            borderTop: '1px solid rgba(15, 23, 42, 0.08)',
            paddingTop: '10px',
            paddingBottom: 'calc(10px + env(safe-area-inset-bottom, 0px))'
        });
        bar.classList.add('active');
        fsOverlay.classList.add('active');
        fsOverlay.style.top = '0';
        fsOverlay.style.zIndex = '26002';
        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';
    }
    
    function closeFs() {
        // Restore hidden elements
        document.querySelectorAll('[data-fs-hidden="true"]').forEach(el => {
            el.style.display = '';
            el.removeAttribute('data-fs-hidden');
        });

        playerContainer.style.position = '';
        playerContainer.style.left = '';
        playerContainer.style.right = '';
        playerContainer.style.bottom = '';
        playerContainer.style.zIndex = '';
        playerContainer.style.background = '';
        playerContainer.style.boxShadow = '';
        playerContainer.style.borderTop = '';
        playerContainer.style.paddingTop = '';
        playerContainer.style.paddingBottom = '';
        fsOverlay.classList.remove('active');
        fsOverlay.style.top = '100vh';
        document.body.style.overflow = '';
        document.documentElement.style.overflow = '';
    }

    infoToggle.addEventListener('click', openFs);
    if(expandBtn) expandBtn.addEventListener('click', () => {
        if (fsOverlay.classList.contains('active')) closeFs();
        else openFs();
    });
    if (fsXCloseBtn) fsXCloseBtn.addEventListener('click', closeFs);

    // Keyboard escape to close fullscreen
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && fsOverlay.classList.contains('active')) {
            closeFs();
        }
    });

    playBtn.addEventListener('click', () => {
        if (audio.paused) { audio.play(); updatePlayIcons(true); }
        else { audio.pause(); updatePlayIcons(false); }
    });

    if (progressBar) {
        progressBar.addEventListener('click', (e) => {
            if (!audio.duration) return;
            const rect = progressBar.getBoundingClientRect();
            const ratio = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
            audio.currentTime = ratio * audio.duration;
        });
    }

    if (prevBtn) {
        prevBtn.addEventListener('click', () => playEpisodeRelative(-1));
    }
    if (nextBtn) {
        nextBtn.addEventListener('click', () => playEpisodeRelative(1));
    }

    if (speedBtn) {
        const speeds = [1, 1.25, 1.5, 2];
        let idx = 0;
        speedBtn.addEventListener('click', () => {
            idx = (idx + 1) % speeds.length;
            const rate = speeds[idx];
            audio.playbackRate = rate;
            speedBtn.textContent = rate + 'x';
        });
    }

    audio.addEventListener('timeupdate', () => {
        const percent = (audio.currentTime / audio.duration) * 100;
        progressFill.style.width = percent + '%';
        bar.querySelector('.time-current').textContent = formatTime(audio.currentTime);
    });

    audio.addEventListener('loadedmetadata', () => {
        bar.querySelector('.time-total').textContent = formatTime(audio.duration);
    });
}

function playEpisodeRelative(delta) {
    if (!currentEpisodeOrder || currentEpisodeOrder.length === 0) return;
    if (currentEpisodeIndex < 0) return;

    let newIndex = currentEpisodeIndex + delta;
    if (newIndex < 0 || newIndex >= currentEpisodeOrder.length) return;

    playEpisodeAtIndex(newIndex);
}

function playEpisodeAtIndex(index) {
    const episode = currentEpisodeOrder[index];
    if (!episode) return;
    currentEpisodeIndex = index;

    // Finn en tilhørende knapp for å oppdatere ikonene
    let btn = document.querySelector(`.btn-play-internal[data-audio="${episode.audioUrl}"]`);
    if (!btn) {
        btn = document.querySelector(`.play-btn-circle[data-audio="${episode.audioUrl}"]`);
    }

    const thumbnail = episode.thumbnail || '';
    toggleAudio(episode.audioUrl, episode.title, thumbnail, btn, index, episode);
}

function formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

// Hjelpefunksjoner for YouTube playlists
function parsePlaylists(raw) {
    if (!raw) return [];
    return raw.split('\n').map(line => {
        const parts = line.split(':');
        if (parts.length < 2) return null;

        const name = parts[0].trim();
        let idPart = parts.slice(1).join(':').trim();

        // Tillat at brukeren limer inn hele YouTube-playlist-URLer
        // Eksempler:
        //  - https://www.youtube.com/playlist?list=PLxxxx
        //  - https://youtube.com/playlist?list=PLxxxx&si=...
        if (idPart.includes('http')) {
            try {
                const urlObj = new URL(idPart);
                const listParam = urlObj.searchParams.get('list');
                if (listParam) {
                    idPart = listParam;
                }
            } catch (e) {
                const match = idPart.match(/[?&]list=([^&]+)/);
                if (match && match[1]) {
                    idPart = match[1];
                }
            }
        } else {
            const match = idPart.match(/[?&]list=([^&]+)/);
            if (match && match[1]) {
                idPart = match[1];
            }
        }

        if (!name || !idPart) return null;
        return { name, id: idPart };
    }).filter(pl => pl);
}

async function renderPlaylistSection(playlist, container) {
    const section = document.createElement('div');
    section.innerHTML = `<h3 style="margin-top:40px">${playlist.name}</h3><div class="media-grid" id="pl-${playlist.id}"></div>`;
    container.appendChild(section);
}
