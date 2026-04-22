/**
 * HIS KINGDOM DESIGNS - Wix Store Integration
 * Theme: Bookle-style Product Display with Hero Slider
 * Integration: Wix Headless API via Firebase Functions Proxy
 */

// Step 1: Configuration & Auth Placeholder
// To use @wix/api-client directly, fill in the Client ID here.
// Current setup uses a safer backend proxy for handling Wix API secrets.
const WIX_CLIENT_ID = 'YOUR_CLIENT_ID_HERE';

const DEFAULT_CONFIG = {
    useProxy: true,
    proxyUrl: '/api/wix-products',
    externalStoreBaseUrl: 'https://www.hiskingdomministry.no/butikk',
    productUrlBase: 'https://www.hiskingdomministry.no',
    productPathPrefix: '/product-page/',
    limit: 100, // Batch size of 100 for better performance
    maxPages: 50, // Support catalogs up to 5000 products
    locale: 'no-NO',
    currency: 'NOK',
    timeoutMs: 15000
};

const config = {
    ...DEFAULT_CONFIG,
    ...(window.HKM_WIX_STORE_CONFIG || {})
};

function buildRequestUrl(baseUrl, params = {}) {
    const url = new URL(baseUrl, window.location.origin);
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            url.searchParams.set(key, String(value));
        }
    });
    return url.toString();
}

async function fetchJsonWithTimeout(url, timeoutMs = 15000) {
    if (typeof AbortController === 'undefined') {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Fetch failed (${res.status})`);
        return res.json();
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error(`Fetch failed (${res.status})`);
        return await res.json();
    } catch (err) {
        if (err && err.name === 'AbortError') {
            throw new Error(`Request timeout after ${timeoutMs}ms`);
        }
        throw err;
    } finally {
        clearTimeout(timeoutId);
    }
}

// UI Element selectors
const els = {
    grid: document.getElementById('butikk-grid'),
    loader: document.getElementById('butikk-loader'),
    error: document.getElementById('butikk-error'),
    count: document.getElementById('butikk-count'),
    sliderWrapper: document.getElementById('hero-slider-wrapper')
};

function getObjectValueByPath(obj, path) {
    if (!obj || !path) return undefined;
    return String(path)
        .split('.')
        .filter(Boolean)
        .reduce((acc, part) => (acc && typeof acc === 'object') ? acc[part] : undefined, obj);
}

function getStoreContent() {
    if (window.HKM_STORE_CONTENT && typeof window.HKM_STORE_CONTENT === 'object') {
        return window.HKM_STORE_CONTENT;
    }
    const fallback = window.HKM_PAGE_CONTENT && window.HKM_PAGE_CONTENT.butikk;
    return (fallback && typeof fallback === 'object') ? fallback : null;
}

function getStoreText(path, fallback) {
    const raw = getObjectValueByPath(getStoreContent(), path);
    if (typeof raw === 'string') {
        const trimmed = raw.trim();
        if (trimmed) return trimmed;
    }
    if (raw != null && typeof raw !== 'object') {
        return String(raw);
    }
    return fallback;
}

function formatStoreTemplate(template, vars = {}) {
    return String(template || '').replace(/\{(\w+)\}/g, (_, key) => (
        Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : `{${key}}`
    ));
}

function getActiveCategoryLabel() {
    if (currentCategory === 'all') {
        return getStoreText('ui.countAllCategoriesLabel', 'alle kategorier');
    }
    const safeCategory = (typeof CSS !== 'undefined' && typeof CSS.escape === 'function')
        ? CSS.escape(currentCategory)
        : currentCategory;
    const activeBtn = document.querySelector(`.category-btn[data-category="${safeCategory}"]`);
    if (activeBtn) {
        const label = (activeBtn.textContent || '').trim();
        if (label) return label;
    }
    return currentCategory;
}

/**
 * HELPER: Simple HTML Escaper
 */
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * HELPER: Safe Array check
 */
function getItemsFromPayload(data) {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (data.items && Array.isArray(data.items)) return data.items;
    if (data.products && Array.isArray(data.products)) return data.products;
    return [];
}

function getTotalFromPayload(data) {
    if (!data || Array.isArray(data)) return null;
    if (typeof data.total === 'number' && Number.isFinite(data.total)) return data.total;
    if (typeof data.totalCount === 'number' && Number.isFinite(data.totalCount)) return data.totalCount;
    if (typeof data.count === 'number' && Number.isFinite(data.count)) return data.count;
    return null;
}

function normalizeForCompare(value) {
    return String(value || '')
        .trim()
        .toLowerCase()
        .replace(/æ/g, 'ae')
        .replace(/ø/g, 'o')
        .replace(/å/g, 'a')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ');
}

function normalizeOptionName(name) {
    const raw = String(name || 'Annet')
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/[:\-–—]+$/g, '');

    const ascii = normalizeForCompare(raw);

    if (['color', 'colour', 'farge'].includes(ascii)) return 'Farge';
    if (['size', 'storrelse', 'str', 'str.', 'st'].includes(ascii)) return 'Størrelse';

    if (ascii.startsWith('size ')) return 'Størrelse';
    if (ascii.startsWith('color ') || ascii.startsWith('colour ') || ascii.startsWith('farge ')) return 'Farge';

    return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function normalizeOptionValue(value) {
    if (value == null) return '';
    return String(value).trim();
}

function normalizeOptionValueKey(value) {
    return normalizeForCompare(normalizeOptionValue(value));
}

function productMatchesCategory(product, category) {
    const cat = normalizeForCompare(category);
    if (!cat || cat === 'all') return true;

    const name = normalizeForCompare(product && product.name);
    const slug = normalizeForCompare(product && product.slug);
    const haystack = `${name} ${slug}`.trim();

    const includesAny = (terms) => terms.some((term) => haystack.includes(normalizeForCompare(term)));

    const categoryAliases = {
        'abonnement': ['abonnement', 'subscription'],
        'armband-smykker': ['armbånd', 'smykker', 'bracelet', 'jewelry'],
        'baby': ['baby', 'babyklaer', 'babyklær'],
        'barn-ungdom': ['barn', 'barne', 'ungdom', 'youth', 'kids'],
        'bilder-plakater': ['bilde', 'bilder', 'plakat', 'plakater', 'poster'],
        'christmas': ['christmas', 'jul', 'jule', 'julegave'],
        'dameklaer': ['dame', 'dameklaer', 'dameklær', 'women', 'womens'],
        'digitale-filer': ['digital', 'fil', 'filer', 'gavekort', 'gift card'],
        'english': ['english'],
        'espanol': ['espanol', 'español', 'spanish'],
        'genser': ['genser', 'hoodie', 'sweatshirt'],
        'handlenett': ['handlenett', 'totebag', 'veske', 'bag'],
        'hatter-caps': ['caps', 'cap', 'hatt', 'hatter'],
        'humor': ['humor', 'funny', 'morsom'],
        'israel': ['israel'],
        'jesus': ['jesus', 'christ'],
        'joggebukser': ['joggebukse', 'joggebukser', 'sweatpants', 'pants'],
        'klistermerker': ['klistermerke', 'klistermerker', 'sticker', 'stickers'],
        'klaer': ['klaer', 't-shirt', 't skjorte', 'tskjorte', 'genser', 'hoodie', 'joggebukse', 'caps', 'hatt', 'dameklaer'],
        'kopper-flasker': ['kopp', 'kopper', 'flaske', 'flasker', 'mug'],
        'kreative-boker': ['bok', 'boker', 'bøker', 'kreativ', 'book', 'books'],
        'mirakel-familie': ['mirakel', 'familie', 'miracle', 'family'],
        'mobildeksel': ['mobil', 'deksel', 'phone', 'case'],
        'norske': ['norsk', 'norske', 'norway', 'norwegian'],
        'paske': ['paske', 'påske', 'easter'],
        'russ': ['russ', 'russe'],
        'salg': ['salg', 'sale', 'tilbud'],
        'spiritual-battle': ['spiritual', 'battle', 'krig', 'åndelig'],
        'sport': ['sport', 'performance', 'trening'],
        't-shirts': ['t-shirt', 't skjorte', 'tskjorte', 'tee'],
        'tilbehor': ['tilbehor', 'kopp', 'kopper', 'flaske', 'flasker', 'plakat', 'plakater', 'bilde', 'bilder', 'sticker', 'klistermerke', 'mobildeksel', 'armband', 'smykker'],
        'undervisning': ['undervisning', 'teaching', 'lære'],
        'varna': ['varna', 'evangeliesenteret', 'evangeliesenter']
    };

    if (categoryAliases[cat]) {
        return includesAny(categoryAliases[cat]);
    }

    // Direct check if product has a collection/category array field that we can match exactly
    if (product && product.categories && Array.isArray(product.categories)) {
        const productCategories = product.categories.map(c => normalizeForCompare(c.name || c));
        if (productCategories.includes(cat)) return true;
    }

    return haystack.includes(cat);
}

/**
 * Creates a slide for the Hero Slider - Elegant overlay style (FULL SCREEN)
 */
function createSliderSlide(product) {
    const badgeText = getStoreText('ui.sliderBadgeNew', 'Nyhet i butikken');
    const sliderDescription = getStoreText(
        'ui.sliderDescription',
        'Oppdag den nyeste kolleksjonen fra His Kingdom Designs. Kvalitetsdesign som inspirerer og utfordrer.'
    );
    const buyNowPrefix = getStoreText('ui.sliderBuyNowPrefix', 'Kjøp nå');
    const scrollIndicator = getStoreText('ui.sliderScrollIndicator', 'Bla ned');

    return `
        <div class="swiper-slide relative h-screen flex items-center overflow-hidden">
            <!-- Background Image with Overlay -->
            <div class="absolute inset-0 z-0 h-full">
                <div class="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-slate-950/40 to-transparent z-10 hidden md:block"></div>
                <div class="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-slate-950/20 z-10 md:hidden"></div>
                <img src="${escapeHtml(product.imageUrl)}" alt="${escapeHtml(product.name)}" 
                     class="w-full h-full object-cover scale-105 transition-transform duration-[10000ms]">
            </div>
            
            <div class="container mx-auto px-6 md:px-12 relative z-20">
                <div class="max-w-2xl space-y-4 md:space-y-6 text-white flex flex-col items-center md:items-start text-center md:text-left">
                    <span class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/20 backdrop-blur-md text-primary text-[10px] font-black uppercase tracking-[0.2em] border border-primary/30">
                        ${escapeHtml(badgeText)}
                    </span>
                    <h2 class="text-3xl md:text-4xl lg:text-5xl font-black leading-tight tracking-tighter drop-shadow-2xl">
                        ${escapeHtml(product.name)}
                    </h2>
                    <div class="text-base md:text-xl text-slate-200 leading-relaxed max-w-lg drop-shadow-md line-clamp-3 prose-p:my-0">
                        ${product.description || sliderDescription}
                    </div>
                    <div class="flex flex-wrap justify-center md:justify-start gap-4 pt-4 md:pt-6">
                        <a href="${escapeHtml(product.productUrl)}" target="_blank" 
                           class="w-full md:w-auto px-8 md:px-10 py-4 md:py-5 rounded-full bg-white text-slate-900 font-black hover:bg-primary hover:text-white transition-all shadow-2xl hover:scale-105 active:scale-95 text-base md:text-lg">
                            ${escapeHtml(buyNowPrefix)} — ${escapeHtml(product.formattedPrice)}
                        </a>
                    </div>
                </div>
            </div>
            
            <!-- Scroll Indicator -->
            <div class="absolute bottom-12 left-1/2 -translate-x-1/2 z-30 animate-bounce cursor-pointer flex flex-col items-center gap-2 group" onclick="document.getElementById('shop-content').scrollIntoView({behavior: 'smooth'})">
                <span class="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 group-hover:text-white transition-colors">${escapeHtml(scrollIndicator)}</span>
                <i class="fas fa-chevron-down text-white/50 group-hover:text-white text-xl transition-colors"></i>
            </div>
        </div>
    `;
}

function renderHeroFallback(reason = 'ERROR') {
    if (!els.sliderWrapper) return;

    const title = reason === 'EMPTY'
        ? getStoreText('ui.heroFallbackEmptyTitle', 'Butikken oppdateres akkurat nå')
        : getStoreText('ui.heroFallbackErrorTitle', 'Vi fikk ikke lastet butikken');
    const message = reason === 'EMPTY'
        ? getStoreText('ui.heroFallbackEmptyDescription', 'Ingen produkter ble funnet akkurat nå. Du kan fortsatt åpne Wix-butikken direkte.')
        : getStoreText('ui.heroFallbackErrorDescription', 'Produktene kunne ikke hentes nå. Prøv igjen, eller åpne den eksterne Wix-butikken.');
    const badgeText = getStoreText('heroFallback.badge', 'HKM Butikk');
    const externalCta = getStoreText('ui.heroFallbackExternalCta', 'Gå til Wix-butikken');
    const retryCta = getStoreText('ui.heroFallbackRetryCta', 'Prøv igjen');

    els.sliderWrapper.innerHTML = `
        <div class="swiper-slide relative h-screen flex items-center overflow-hidden bg-slate-950">
            <div class="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(249,115,22,0.2),transparent_40%),radial-gradient(circle_at_80%_30%,rgba(59,130,246,0.14),transparent_35%),linear-gradient(135deg,#020617,#0f172a_60%,#111827)]"></div>
            <div class="container mx-auto px-6 md:px-12 relative z-20">
                <div class="max-w-2xl space-y-5 text-white flex flex-col items-center md:items-start text-center md:text-left">
                    <span class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur border border-white/15 text-[10px] font-black uppercase tracking-[0.2em]">
                        ${escapeHtml(badgeText)}
                    </span>
                    <h2 class="text-3xl md:text-5xl font-black leading-tight tracking-tight">${escapeHtml(title)}</h2>
                    <p class="text-base md:text-lg text-slate-200 leading-relaxed max-w-lg">${escapeHtml(message)}</p>
                    <div class="flex flex-wrap justify-center md:justify-start gap-4 pt-2">
                        <a href="${escapeHtml(config.externalStoreBaseUrl)}" target="_blank" rel="noopener noreferrer"
                           class="w-full md:w-auto px-8 py-4 rounded-full bg-primary text-white font-black hover:brightness-110 transition-all shadow-xl">
                            ${escapeHtml(externalCta)}
                        </a>
                        <button type="button" onclick="sessionStorage.removeItem('hkm_store_catalog_cache'); window.location.reload();"
                                class="w-full md:w-auto px-8 py-4 rounded-full border border-white/20 bg-white/10 text-white font-bold hover:bg-white/15 transition-all">
                            ${escapeHtml(retryCta)}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    if (typeof Swiper !== 'undefined') {
        try {
            if (window.__hkmHeroSwiper && typeof window.__hkmHeroSwiper.destroy === 'function') {
                window.__hkmHeroSwiper.destroy(true, true);
            }
            window.__hkmHeroSwiper = new Swiper('.product-hero-swiper', {
                loop: false,
                pagination: { el: '.swiper-pagination', clickable: true },
                navigation: { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' }
            });
        } catch (e) {
            console.warn('[HKM SHOP] Hero fallback swiper init skipped:', e);
        }
    }
}

function armHeroLoadingWatchdog() {
    if (heroLoadingWatchdogId) clearTimeout(heroLoadingWatchdogId);

    const watchdogDelay = Math.max(6000, Number(config.timeoutMs) || 15000);
    heroLoadingWatchdogId = setTimeout(() => {
        if (hasLoadedProducts) return;
        if (!els.sliderWrapper) return;

        const currentText = (els.sliderWrapper.textContent || '').toLowerCase();
        if (currentText.includes('designer butikken')) {
            renderHeroFallback('ERROR');
        }
    }, watchdogDelay);
}

/**
 * Renders a standard Bookle product card
 */
function createProductCard(product) {
    // Determine category / type label
    const category = product.slug ? product.slug.split('-')[0] : 'Design';

    return `
        <article class="group bg-white rounded-2xl border border-slate-100 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:border-orange-200 flex flex-col h-full overflow-hidden">
            <a href="${escapeHtml(product.productUrl)}" target="_blank" rel="noopener noreferrer" class="block relative aspect-[3/4] overflow-hidden bg-slate-50 group-hover:opacity-95 transition-opacity">
                <!-- Wix Badge -->
                <span class="absolute top-4 left-4 z-10 px-3 py-1 bg-white/90 backdrop-blur rounded-full text-[10px] font-extrabold uppercase tracking-tighter text-slate-900 shadow-sm border border-slate-100">
                    HK Designs
                </span>
                
                <img 
                    src="${escapeHtml(product.imageUrl)}" 
                    alt="${escapeHtml(product.name || 'Produkt')}"
                    class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    loading="lazy"
                >
            </a>

            <div class="p-4 flex flex-col flex-1">
                <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">${escapeHtml(category)}</p>
                <h3 class="shop-card-title text-base font-bold text-slate-900 leading-snug mb-3 group-hover:text-primary transition-colors">
                    ${escapeHtml(product.name)}
                </h3>
                
                <div class="mt-auto flex items-center justify-between gap-3 pt-3 border-t border-slate-50">
                    <p class="text-lg font-black text-slate-900 tracking-tight">
                        ${escapeHtml(product.formattedPrice)}
                    </p>
                    <a href="${escapeHtml(product.productUrl)}" target="_blank" rel="noopener noreferrer" 
                       class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-900 text-white hover:bg-primary transition-all shadow-md">
                        <i class="fas fa-shopping-cart text-[10px]"></i>
                    </a>
                </div>
            </div>
        </article>
    `;
}

let allProducts = [];
let filteredProducts = [];
let currentCategory = 'all';
let maxPrice = 5000;
let activeFilters = {}; // { 'Farge': 'Blå', 'Størrelse': 'M' }
let isLoadingProducts = false;
let hasLoadedProducts = false;
let productUiEventsBound = false;
let hasBootstrappedStore = false;
let heroLoadingWatchdogId = null;
let lastUiErrorType = null;

function setActiveCategoryButtons(category = 'all') {
    document.querySelectorAll('.category-btn').forEach((btn) => {
        const isActive = (btn.getAttribute('data-category') || 'all') === category;
        btn.classList.toggle('active', isActive);
    });
}

function showProductsGrid() {
    if (els.loader) els.loader.classList.add('hidden');
    if (els.grid) {
        els.grid.classList.remove('hidden');
        els.grid.classList.add('opacity-100');
    }
}

function bindProductUiEvents() {
    if (productUiEventsBound) return;

    const searchInput = document.getElementById('shop-search');
    if (searchInput) {
        searchInput.disabled = false;
        searchInput.addEventListener('input', applyFilters);
    }

    const priceFilter = document.getElementById('price-filter');
    if (priceFilter) {
        priceFilter.addEventListener('input', (e) => {
            const val = e.target.value;
            const priceValueDisplay = document.getElementById('price-value-display');
            if (priceValueDisplay) priceValueDisplay.textContent = `${val} kr`;
            applyFilters();
        });
    }

    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            currentCategory = btn.getAttribute('data-category') || 'all';
            setActiveCategoryButtons(currentCategory);
            applyFilters();

            if (window.innerWidth < 768) {
                const anchor = document.getElementById('shop-content');
                if (anchor) anchor.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });

    productUiEventsBound = true;
}

async function fetchAllProductsFromEndpoint(baseUrl, options = {}) {
    const onBatch = typeof options.onBatch === 'function' ? options.onBatch : null;
    const pageSize = Math.min(Math.max(Number(config.limit) || 100, 1), 100);
    const maxPages = Math.max(1, Number(config.maxPages) || 25);
    const timeoutMs = config.timeoutMs || 15000;

    let firstPayload = null;
    let expectedTotal = null;
    let offset = 0;
    let page = 0;
    const items = [];
    const seenKeys = new Set();
    let firstBatchNotified = false;

    while (page < maxPages) {
        const requestUrl = buildRequestUrl(baseUrl, { limit: pageSize, offset });
        const payload = await fetchJsonWithTimeout(requestUrl, timeoutMs);
        if (firstPayload == null) firstPayload = payload;

        const batch = getItemsFromPayload(payload);
        const payloadTotal = getTotalFromPayload(payload);
        if (expectedTotal == null && typeof payloadTotal === 'number') {
            expectedTotal = payloadTotal;
        }

        batch.forEach((item, index) => {
            const key = item && (item.id || item._id || item.productId || item.slug || `${offset}-${index}`);
            if (seenKeys.has(key)) return;
            seenKeys.add(key);
            items.push(item);
        });

        if (onBatch && items.length > 0) {
            try {
                onBatch({
                    items: [...items],
                    total: typeof expectedTotal === 'number' ? expectedTotal : null,
                    isFirst: !firstBatchNotified
                });
                firstBatchNotified = true;
            } catch (err) {
                console.warn('[HKM SHOP] onBatch callback failed:', err);
            }
        }

        page += 1;

        if (batch.length === 0) break;
        if (typeof expectedTotal === 'number' && items.length >= expectedTotal) break;
        if (batch.length < pageSize) break;

        offset += batch.length;
    }

    if (page >= maxPages && (expectedTotal == null || items.length < expectedTotal)) {
        console.warn(`[HKM SHOP] Reached maxPages (${maxPages}) before loading all products.`);
    }

    if (Array.isArray(firstPayload)) return items;

    return {
        ...(firstPayload && typeof firstPayload === 'object' ? firstPayload : {}),
        items,
        count: items.length,
        total: typeof expectedTotal === 'number' ? expectedTotal : items.length,
    };
}

/**
 * Renders the product grid with the given list of products
 */
function renderGrid(products) {
    if (!els.grid) return;

    if (products.length === 0) {
        const noResultsTitle = getStoreText('ui.noResultsTitle', 'Ingen treff');
        const noResultsDescription = getStoreText('ui.noResultsDescription', 'Prøv å endre søket ditt eller velg en annen kategori.');
        els.grid.innerHTML = `
            <div class="col-span-full py-20 text-center">
                <div class="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i class="fas fa-search text-xl"></i>
                </div>
                <h3 class="text-lg font-bold text-slate-900">${escapeHtml(noResultsTitle)}</h3>
                <p class="text-slate-500">${escapeHtml(noResultsDescription)}</p>
            </div>
        `;
    } else {
        els.grid.innerHTML = products.map(p => createProductCard(p)).join('');
    }

    if (els.count) {
        const categoryTemplate = getStoreText('ui.countCategoryTemplate', 'Viser {count} produkter i {category}');
        const categoryLabel = getActiveCategoryLabel();
        const categoryPhrase = currentCategory === 'all' ? categoryLabel : `kategorien ${categoryLabel}`;
        els.count.textContent = formatStoreTemplate(categoryTemplate, {
            count: products.length,
            category: categoryPhrase
        });
    }
}

/**
 * Filter products based on category, search, price and dynamic attribute filters
 */
function applyFilters() {
    const searchInput = document.getElementById('shop-search');
    const searchQuery = normalizeForCompare(searchInput ? searchInput.value : '');

    const priceInput = document.getElementById('price-filter');
    const priceLimit = priceInput ? parseInt(priceInput.value) : 10000;

    filteredProducts = allProducts.filter(p => {
        const matchesSearch = !searchQuery ||
            normalizeForCompare(p.name).includes(searchQuery) ||
            normalizeForCompare(p.slug).includes(searchQuery);

        const matchesCategory = productMatchesCategory(p, currentCategory);

        const matchesPrice = (typeof p.priceValue !== 'number' || Number.isNaN(p.priceValue))
            ? true
            : p.priceValue <= priceLimit;

        let matchesAttributes = true;
        for (const [attrName, attrVal] of Object.entries(activeFilters)) {
            if (attrVal === 'all') continue;

            const normalizedAttrName = normalizeOptionName(attrName);
            const normalizedAttrValue = normalizeOptionValueKey(attrVal);
            const matchingOptions = (p.productOptions || []).filter(
                (opt) => normalizeOptionName(opt.name) === normalizedAttrName
            );
            const hasChoice = matchingOptions.some((option) =>
                (option.choices || []).some((c) => normalizeOptionValueKey(c.value) === normalizedAttrValue)
            );
            if (!hasChoice) {
                matchesAttributes = false;
                break;
            }
        }

        return matchesSearch && matchesCategory && matchesPrice && matchesAttributes;
    });

    renderGrid(filteredProducts);
}

function renderHeroSlidesFromProducts(products = allProducts) {
    if (!els.sliderWrapper || !Array.isArray(products) || products.length === 0) return;

    const sliderItems = products.slice(0, 5);
    els.sliderWrapper.innerHTML = sliderItems.map((p) => createSliderSlide(p)).join('');

    if (typeof Swiper !== 'undefined') {
        if (window.__hkmHeroSwiper && typeof window.__hkmHeroSwiper.destroy === 'function') {
            window.__hkmHeroSwiper.destroy(true, true);
        }
        window.__hkmHeroSwiper = new Swiper('.product-hero-swiper', {
            loop: true,
            speed: 1000,
            autoplay: { delay: 6000, disableOnInteraction: false },
            pagination: { el: '.swiper-pagination', clickable: true },
            navigation: { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' },
            effect: 'fade',
            fadeEffect: { crossFade: true }
        });
    }
}

/**
 * Main Fetching Logic
 */
async function loadProducts() {
    if (!els.grid) return;
    if (isLoadingProducts || hasLoadedProducts) return;

    isLoadingProducts = true;
    armHeroLoadingWatchdog();

    // 1. Check for PRE-FETCHED data (from homepage pre-load)
    const CACHE_KEY = 'hkm_store_catalog_cache';
    const CACHE_EXPIRY = 30 * 60 * 1000; // 30 minutes
    try {
        if (typeof sessionStorage !== 'undefined' && sessionStorage) {
            const cachedDataString = sessionStorage.getItem(CACHE_KEY);
            if (cachedDataString) {
                const { timestamp, payload } = JSON.parse(cachedDataString);
                if (Date.now() - timestamp < CACHE_EXPIRY && payload) {
                    console.log('[HKM STORE] Found pre-fetched catalog. Loading instantly...');
                    allProducts = getItemsFromPayload(payload);
                    if (allProducts && allProducts.length > 0) {
                        // Success! We can skip the network proxy entirely
                        renderHeroSlidesFromProducts(allProducts);
                        renderFilters();
                        renderGrid(allProducts);
                        showProductsGrid();
                        bindProductUiEvents();
                        hasLoadedProducts = true;
                        if (heroLoadingWatchdogId) {
                            clearTimeout(heroLoadingWatchdogId);
                            heroLoadingWatchdogId = null;
                        }
                        isLoadingProducts = false;
                        return; // Pre-fetched data used successfully
                    }
                }
            }
        }
    } catch (e) {
        console.warn('[HKM STORE] Pre-fetch cache reading failed:', e);
    }

    // 2. Normal Fetch Flow (Fallback if no cache found)
    els.grid.classList.add('hidden');
    els.loader.classList.remove('hidden');
    if (els.error) els.error.classList.add('hidden');

    try {
        let data = null;
        let lastError = null;

        // Try Firestore Cache First
        if (window.firebaseService && window.firebaseService.isInitialized) {
            console.log('[HKM SHOP] Attempting fetch from Firestore cache (wix_products)...');
            try {
                const cachedContent = await window.firebaseService.getPageContent('wix_products');
                if (cachedContent && cachedContent.items && cachedContent.items.length > 0) {
                    data = cachedContent;
                    console.log('[HKM SHOP] Successfully loaded from Firestore cache.');
                }
            } catch(e) {
                console.warn('[HKM SHOP] Firestore cache fetch failed, falling back to proxy...', e);
            }
        }

        // Fallback to HTTP API
        if (!data) {
            const isLocalHost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
            const candidateBaseUrls = [];

            if (isLocalHost) {
                if (config.localProxyUrl) {
                    candidateBaseUrls.push(config.localProxyUrl);
                }
            } else {
                if (config.remoteProxyUrl) {
                    candidateBaseUrls.push(config.remoteProxyUrl);
                }
            }

            // As a fallback, add any other configured URLs.
            if (config.proxyUrl && !candidateBaseUrls.includes(config.proxyUrl)) {
                candidateBaseUrls.push(config.proxyUrl);
            }
            if (config.remoteProxyUrl && !candidateBaseUrls.includes(config.remoteProxyUrl)) {
                candidateBaseUrls.push(config.remoteProxyUrl);
            }

            const uniqueBaseUrls = [...new Set(candidateBaseUrls.filter(Boolean))];
            let previewRendered = false;

            for (const baseUrl of uniqueBaseUrls) {
                try {
                    console.log(`[HKM SHOP] Attempting fetch from HTTP proxy: ${baseUrl}`);
                    data = await fetchAllProductsFromEndpoint(baseUrl, {
                        onBatch: ({ items, total, isFirst }) => {
                            // Keep our global allProducts in sync with latest items
                            allProducts = items;

                            if (isFirst && !previewRendered) {
                                previewRendered = true;
                                renderHeroSlidesFromProducts(allProducts);
                                renderFilters();
                                showProductsGrid();
                                bindProductUiEvents();
                            }

                            // Always render the current list of products to the grid
                            renderGrid(allProducts);

                            // If still loading more, show a progress message instead of the final count
                            if (els.count && total && total > items.length) {
                                const loadingTemplate = getStoreText(
                                    'ui.loadingProgressTemplate',
                                    'Laster produkter... ({loaded}/{total})'
                                );
                                els.count.textContent = formatStoreTemplate(loadingTemplate, {
                                    loaded: items.length,
                                    total: total
                                });
                            }
                        }
                    });
                    console.log(`[HKM SHOP] Successfully loaded products from HTTP proxy: ${baseUrl}`);
                    break;
                } catch (err) {
                    lastError = err;
                    console.error(`[HKM SHOP] Request failed for ${baseUrl}:`, err);
                }
            }
        }

        if (!data) {
            throw (lastError || new Error('No shop proxy endpoints available'));
        }

        allProducts = getItemsFromPayload(data);

        if (!allProducts || allProducts.length === 0) {
            renderHeroFallback('EMPTY');
            handleError('EMPTY');
            return;
        }

        // 1. Populate Slider (Take the 5 latest products)
        renderHeroSlidesFromProducts(allProducts);

        // 2. Render Filters Sidebar
        renderFilters();

        // 3. Initial Render Grid
        renderGrid(allProducts);

        // Final UI Polish
        showProductsGrid();
        bindProductUiEvents();

        hasLoadedProducts = true;
        if (heroLoadingWatchdogId) {
            clearTimeout(heroLoadingWatchdogId);
            heroLoadingWatchdogId = null;
        }

    } catch (err) {
        console.error('[HKM SHOP] Error:', err);
        renderHeroFallback('ERROR');
        handleError('ERROR');
    } finally {
        isLoadingProducts = false;
    }
}

/**
 * UI State: Error/Empty handling
 */
function handleError(type) {
    lastUiErrorType = type;
    if (els.loader) els.loader.classList.add('hidden');
    if (els.grid) els.grid.classList.add('hidden');
    if (els.error) {
        els.error.classList.remove('hidden');
        const h1 = els.error.querySelector('h1') || els.error.querySelector('h3');
        const p = els.error.querySelector('p');

        if (type === 'EMPTY') {
            if (h1) h1.textContent = getStoreText('ui.emptyCatalogTitle', 'Ingen produkter funnet');
            if (p) p.textContent = getStoreText('ui.emptyCatalogDescription', 'Vi oppdaterer katalogen akkurat nå. Vennligst sjekk igjen senere.');
        } else {
            if (h1) h1.textContent = getStoreText('productBrowser.error.title', 'Kreative Ressurser');
            if (p) p.textContent = getStoreText(
                'productBrowser.error.description',
                'Vi har for øyeblikket problemer med å hente katalogen. Du kan se alle våre produkter direkte i Wix-butikken.'
            );
        }
    }
}

/**
 * Nullstiller alle filtre
 */
window.resetFilters = function () {
    activeFilters = {};
    currentCategory = 'all';
    setActiveCategoryButtons('all');

    const searchInput = document.getElementById('shop-search');
    if (searchInput) searchInput.value = '';

    const priceFilter = document.getElementById('price-filter');
    if (priceFilter) {
        priceFilter.value = 5000;
        document.getElementById('price-value-display').textContent = '5000 kr';
    }

    // Clear dynamic select values
    document.querySelectorAll('#dynamic-filters select').forEach(sel => sel.value = 'all');

    applyFilters();
};

/**
 * Toggles the visibility of an accordion content and updates its icon.
 */
window.toggleAccordion = function (id) {
    const content = document.getElementById(id);
    const icon = document.getElementById(`${id}-icon`);
    if (!content || !icon) return;

    if (content.classList.contains('hidden')) {
        content.classList.remove('hidden');
        content.classList.add('animate-fadeIn');
        icon.classList.remove('fa-plus');
        icon.classList.add('fa-minus');
    } else {
        content.classList.add('hidden');
        content.classList.remove('animate-fadeIn');
        icon.classList.remove('fa-minus');
        icon.classList.add('fa-plus');
    }
}

/**
 * Renders the filter sidebar based on available product options
 */
function renderFilters() {
    const container = document.getElementById('dynamic-filters');
    if (!container) return;

    // Detect all available options and their values
    const optionsMap = new Map();

    allProducts.forEach(p => {
        p.productOptions?.forEach(opt => {
            const name = normalizeOptionName(opt.name || 'Annet');
            if (!optionsMap.has(name)) optionsMap.set(name, new Map());
            opt.choices?.forEach(c => {
                const displayValue = normalizeOptionValue(c.value);
                const valueKey = normalizeOptionValueKey(c.value);
                if (!displayValue || !valueKey) return;
                const valuesForName = optionsMap.get(name);
                if (!valuesForName.has(valueKey)) {
                    valuesForName.set(valueKey, displayValue);
                }
            });
        });
    });

    const sortedEntries = Array.from(optionsMap.entries()).sort((a, b) => {
        const priority = (name) => {
            const normalized = String(name)
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '');
            if (normalized.includes('farge') || normalized.includes('color')) return 0;
            if (normalized.includes('stør') || normalized.includes('size')) return 1;
            return 2;
        };
        const diff = priority(a[0]) - priority(b[0]);
        if (diff !== 0) return diff;
        return String(a[0]).localeCompare(String(b[0]), 'no');
    });

    if (sortedEntries.length === 0) {
        const noFiltersText = getStoreText('ui.noDynamicFilters', 'Ingen ekstra filtre tilgjengelig for produktene akkurat nå.');
        container.innerHTML = `
            <div class="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-500">
                ${escapeHtml(noFiltersText)}
            </div>
        `;
        return;
    }

    const allOptionLabel = getStoreText('ui.allOptionLabel', 'Alle');
    container.innerHTML = `
        <div class="flex items-stretch gap-3 min-w-max">
            ${sortedEntries.map(([name, values]) => `
                <label class="min-w-[170px] max-w-[220px] rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                    <span class="block text-[10px] font-black uppercase tracking-[0.14em] text-slate-500 mb-1.5">${escapeHtml(name)}</span>
                    <span class="relative block">
                        <select onchange="window.updateFilter('${escapeHtml(name)}', this.value)" 
                                class="w-full h-9 pl-3 pr-8 bg-white border border-slate-200 rounded-lg text-sm font-semibold appearance-none focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-200 cursor-pointer text-slate-700">
                            <option value="all">${escapeHtml(allOptionLabel)}</option>
                            ${Array.from(values.entries())
            .sort((a, b) => String(a[1]).localeCompare(String(b[1]), 'no'))
            .map(([valueKey, displayValue]) => `<option value="${escapeHtml(valueKey)}">${escapeHtml(displayValue)}</option>`)
            .join('')}
                        </select>
                        <i class="fas fa-chevron-down absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] text-slate-400 pointer-events-none"></i>
                    </span>
                </label>
            `).join('')}
        </div>
    `;
}

window.updateFilter = function (name, value) {
    if (value === 'all') {
        delete activeFilters[name];
    } else {
        activeFilters[name] = value;
    }
    applyFilters();
};

document.addEventListener('hkm:page-content-updated', (event) => {
    const detail = event && event.detail ? event.detail : null;
    if (!detail || detail.pageId !== 'butikk') return;

    const searchInput = document.getElementById('shop-search');
    if (searchInput) {
        const placeholder = getStoreText('productBrowser.searchPlaceholder', searchInput.placeholder || 'Søk i arkivet...');
        if (placeholder) searchInput.placeholder = placeholder;
    }

    if (!hasLoadedProducts) {
        if (els.count) {
            els.count.textContent = getStoreText('productBrowser.countLoading', 'Henter produkter...');
        }
        if (els.error && !els.error.classList.contains('hidden')) {
            handleError(lastUiErrorType || 'ERROR');
        }
        return;
    }

    renderHeroSlidesFromProducts(allProducts);
    renderFilters();
    applyFilters();
    if (els.error && !els.error.classList.contains('hidden')) {
        handleError(lastUiErrorType || 'ERROR');
    }
});

// Helper to filter by category from outside (visual boxes)
window.filterByCategory = function (category) {
    currentCategory = category;
    setActiveCategoryButtons(category);

    applyFilters();

    // Smooth scroll to results
    const grid = document.getElementById('shop-content');
    if (grid) {
        const offset = 100;
        const bodyRect = document.body.getBoundingClientRect().top;
        const elementRect = grid.getBoundingClientRect().top;
        const elementPosition = elementRect - bodyRect;
        const offsetPosition = elementPosition - offset;

        window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
        });
    }
};

// Global scroll logic for header
window.addEventListener('scroll', () => {
    const header = document.getElementById('header');
    if (!header) return;

    const isScrolled = window.scrollY > 10;

    if (isScrolled) {
        header.classList.add('scrolled');
        header.style.background = 'rgba(255, 255, 255, 0.98)';
        header.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)';
        header.querySelectorAll('.logo, .lang-btn').forEach(el => {
            el.style.color = '#2c3e50';
        });
    } else {
        header.classList.remove('scrolled');
        header.style.background = 'transparent';
        header.style.boxShadow = 'none';
        header.querySelectorAll('.logo, .lang-btn').forEach(el => {
            el.style.color = '#ffffff';
        });
    }
});

// Initializer
function bootstrapStorePage() {
    if (hasBootstrappedStore) return;
    hasBootstrappedStore = true;
    loadProducts();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrapStorePage);
} else {
    bootstrapStorePage();
}
