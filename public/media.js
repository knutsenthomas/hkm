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
    if (document.getElementById('youtube-grid') || window.location.pathname.includes('youtube.html')) {
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
    if (mediaCards.length > 0 && currentPath === 'media.html') {
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
    if (window.location.pathname.includes('youtube.html') && categoriesDiv && playlists.length > 0) {
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

    // Hent alle (eller mange) videoer fra en kanal med YouTube Data API v3
    async function fetchAllChannelVideos(channelId) {
        let videos = [];
        let nextPageToken = '';
        do {
            let url = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&order=date&maxResults=50&type=video&key=${YT_API_KEY}`;
            if (nextPageToken) url += `&pageToken=${nextPageToken}`;
            const resp = await fetch(url);
            const data = await resp.json();

            if (data.error) {
                console.error("[YouTube API] Search Error:", data.error);
                console.log("[YouTube API] Full error object:", data);
                throw new Error(data.error.message);
            }

            if (data.items) {
                videos = videos.concat(data.items.map(item => ({
                    title: item.snippet.title,
                    pubDate: item.snippet.publishedAt,
                    link: `https://www.youtube.com/watch?v=${item.id.videoId}`,
                    thumbnail: item.snippet.thumbnails && item.snippet.thumbnails.high ? item.snippet.thumbnails.high.url : '',
                    description: item.snippet.description || ''
                })));
            }

            nextPageToken = data.nextPageToken;
        } while (nextPageToken);

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
            // Hent alle videoer fra kanal via YouTube RSS + rss2json (samme som opprinnelig oppsett)
            if (allVideosCache['all']) {
                videos = allVideosCache['all'];
            } else {
                const rssFeedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId || YT_CHANNEL_ID}`;
                const proxyUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssFeedUrl)}`;
                try {
                    console.log('Henter videoer fra kanal (ALL) via RSS2JSON');
                    const response = await fetch(proxyUrl);
                    const data = await response.json();
                    videos = data.items || [];
                    allVideosCache['all'] = videos;
                } catch (e) {
                    console.error('Feil ved henting av kanalvideoer (ALL/RSS):', e);
                    videos = [];
                }
            }
        }
        currentCategory = playlistId || 'all';
        // Vis alle videoer hvis vi er på youtube.html
        if (window.location.pathname.includes('youtube.html')) {
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

const PODCAST_KEYWORDS = {
    bibel: ["bibel", "skriften", "ordet", "testamente", "vers", "kapittel", "skriftsted"],
    tro: ["tro", "tillit", "håp", "tvil", "frelse", "nåde", "omvendelse"],
    bønn: ["bønn", "be", "forbønn", "stille", "faste", "bønnesvar"],
    undervisning: ["undervisning", "lære", "serie", "studie", "disippel", "lærling"]
};

function asText(value) {
    if (Array.isArray(value)) {
        return value[0] || '';
    }
    if (value && typeof value === 'object') {
        return value._ || '';
    }
    return value || '';
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

        if (items) {
            const episodes = Array.isArray(items) ? items : [items];

            allPodcastEpisodes = episodes.map((episode, index) => {
                const pubDateText = asText(episode.pubDate);
                return {
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
        }
    } catch (error) {
        console.error('[Podcast] Feil ved henting:', error);
        grid.innerHTML = `<p class="text-danger">${t('loadingPodcastError')}</p>`;
    }
}

function initPodcastControls() {
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

    const isFullPage = window.location.pathname.includes('podcast.html');
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
                toggleAudio(episode.audioUrl, episode.title, thumbnail, btn, queueIndex);
            }
        });
    });

    return card;
}

/**
 * Audio Player Logikk
 */
function toggleAudio(url, title, thumbnail, btn, episodeIndex) {
    let playerBar = document.getElementById('podcast-player-bar');
    if (!playerBar) createPlayerBar();

    const audio = document.getElementById('global-audio-element');
    const barTitle = document.querySelector('.player-info-title');
    const barImg = document.querySelector('.player-info-img');

    if (currentAudio === url) {
        if (audio.paused) { audio.play(); updatePlayIcons(true, btn); }
        else { audio.pause(); updatePlayIcons(false, btn); }
    } else {
        currentAudio = url;
        if (typeof episodeIndex === 'number' && episodeIndex >= 0) {
            currentEpisodeIndex = episodeIndex;
        }
        audio.src = url;
        barTitle.textContent = title;
        barImg.src = thumbnail;
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

function createPlayerBar() {
    const bar = document.createElement('div');
    bar.id = 'podcast-player-bar';
    bar.innerHTML = `
        <div class="player-container">
            <audio id="global-audio-element"></audio>
            <div class="player-info">
                <img src="" class="player-info-img">
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
                <button class="player-control-btn player-speed" title="${t('playbackSpeed')}">1x</button>
                <button class="player-control-btn player-close"><i class="fas fa-times"></i></button>
            </div>
        </div>
    `;
    document.body.appendChild(bar);

    const audio = document.getElementById('global-audio-element');
    const playBtn = bar.querySelector('.player-control-play');
    const progressFill = bar.querySelector('.player-progress-fill');
    const progressBar = bar.querySelector('.player-progress-bar');
    const prevBtn = bar.querySelector('.player-control-prev');
    const nextBtn = bar.querySelector('.player-control-next');
    const speedBtn = bar.querySelector('.player-speed');

    playBtn.addEventListener('click', () => {
        if (audio.paused) { audio.play(); updatePlayIcons(true); }
        else { audio.pause(); updatePlayIcons(false); }
    });

    // Klikkbar tidslinje (seek)
    if (progressBar) {
        progressBar.addEventListener('click', (e) => {
            if (!audio.duration) return;
            const rect = progressBar.getBoundingClientRect();
            const ratio = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
            audio.currentTime = ratio * audio.duration;
        });
    }

    // Forrige / neste episode i køen
    if (prevBtn) {
        prevBtn.addEventListener('click', () => playEpisodeRelative(-1));
    }
    if (nextBtn) {
        nextBtn.addEventListener('click', () => playEpisodeRelative(1));
    }

    // Hastighetskontroll (1x, 1.25x, 1.5x, 2x)
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

    bar.querySelector('.player-close').addEventListener('click', () => {
        audio.pause();
        bar.classList.remove('active');
        updatePlayIcons(false);
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
    toggleAudio(episode.audioUrl, episode.title, thumbnail, btn, index);
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