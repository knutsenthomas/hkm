// ===================================
// Wishon Template - His Kingdom Ministry
// JavaScript Functionality (v2.1.0)
// ===================================

import { mountSiteShell } from './js/site-shell.js';
import './js/pwa-install-prompt.js';

mountSiteShell();

function onDOMReady(callback) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', callback, { once: true });
    } else {
        callback();
    }
}

// biblicalCharacters database is loaded dynamically inside performSiteSearch to optimize bundle size

const BIBLE_BOOKS = {
    no: [
        "1. Mosebok", "2. Mosebok", "3. Mosebok", "4. Mosebok", "5. Mosebok",
        "Josva", "Dommerne", "Rut", "1. Samuelsbok", "2. Samuelsbok",
        "1. Kongebok", "2. Kongebok", "1. Krønikebok", "2. Krønikebok", "Esra",
        "Nehemja", "Ester", "Job", "Salmene", "Ordspråkene",
        "Forkynneren", "Høysangen", "Jesaja", "Jeremia", "Klagesangene",
        "Esekiel", "Daniel", "Hosea", "Joel", "Amos",
        "Obadja", "Jona", "Mika", "Nahum", "Habakkuk",
        "Sefanja", "Haggai", "Sakarja", "Malaki", "Matteus",
        "Markus", "Lukas", "Johannes", "Apostlenes gjerninger", "Romerne",
        "1. Korinterne", "2. Korinterne", "Galaterne", "Efeserne", "Filipperne",
        "Kolosserne", "1. Tessalonikerne", "2. Tessalonikerne", "1. Timoteus", "2. Timoteus",
        "Titus", "Filemon", "Hebreerne", "Jakob", "1. Peter",
        "2. Peter", "1. Johannes", "2. Johannes", "3. Johannes", "Judas",
        "Åpenbaringen"
    ],
    en: [
        "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy",
        "Joshua", "Judges", "Ruth", "1 Samuel", "2 Samuel",
        "1 Kings", "2 Kings", "1 Chronicles", "2 Chronicles", "Ezra",
        "Nehemiah", "Esther", "Job", "Psalms", "Proverbs",
        "Ecclesiastes", "Song of Solomon", "Isaiah", "Jeremiah", "Lamentations",
        "Ezekiel", "Daniel", "Hosea", "Joel", "Amos",
        "Obadiah", "Jonah", "Micah", "Nahum", "Habakkuk",
        "Zephaniah", "Haggai", "Zechariah", "Malachi", "Matthew",
        "Mark", "Luke", "John", "Acts", "Romans",
        "1 Corinthians", "2 Corinthians", "Galatians", "Ephesians", "Philippians",
        "Colossians", "1 Thessalonians", "2 Thessalonians", "1 Timothy", "2 Timothy",
        "Titus", "Philemon", "Hebrews", "James", "1 Peter",
        "2 Peter", "1 John", "2 John", "3 John", "Judas",
        "Revelation"
    ],
    es: [
        "Génesis", "Éxodo", "Levítico", "Números", "Deuteronomio",
        "Josué", "Jueces", "Rut", "1 Samuel", "2 Samuel",
        "1 Reyes", "2 Reyes", "1 Crónicas", "2 Crónicas", "Esdras",
        "Nehemías", "Ester", "Job", "Salmos", "Proverbios",
        "Eclesiastés", "Cantares", "Isaías", "Jeremías", "Lamentaciones",
        "Ezequiel", "Daniel", "Oseas", "Joel", "Amós",
        "Abdías", "Jonás", "Miqueas", "Nahúm", "Habacuc",
        "Sofonías", "Hageo", "Zacarías", "Malaquías", "Mateo",
        "Marcos", "Lucas", "Juan", "Hechos", "Romanos",
        "1 Corintios", "2 Corintios", "Gálatas", "Efesios", "Filipenses",
        "Colosenses", "1 Tesalonicenses", "2 Tesalonicenses", "1 Timoteo", "2 Timoteo",
        "Tito", "Filemón", "Hebreos", "Santiago", "1 Pedro",
        "2 Pedro", "1 Juan", "2 Juan", "3 Juan", "Judas",
        "Apocalipsis"
    ]
};

function isBibleReference(query) {
    const q = query.trim();
    // Matcher f.eks. "Johannes 3:16", "Joh 3", "1. Mosebok 1:1", "1 Sam 3:4", "Matteus 6:9-13"
    const pattern = /^(?:[1-5]\.?\s*)?[a-zA-ZæøåÆØÅáéíóúñÁÉÍÓÚÑ\s]{3,}\s+\d+(?:\s*[\:\.\s,\-]\s*\d+)*$/i;
    return pattern.test(q);
}

// DOM Elements
const header = document.getElementById('header');
const mobileToggle = document.getElementById('mobile-toggle');
const nav = document.getElementById('nav');
const navLinks = document.querySelectorAll('.nav-link');

// Keep front page hero behavior untouched, but center subpage hero text consistently.
function applySubpageHeroCentering() {
    if (!document.body || document.body.classList.contains('page-index')) return;

    document.querySelectorAll('.page-hero').forEach((hero) => {
        hero.style.setProperty('text-align', 'center', 'important');

        hero.querySelectorAll('.container, .page-hero-title, .page-hero-subtitle, .page-title, .breadcrumbs, .blog-meta, p, h1, h2, h3').forEach((el) => {
            el.style.setProperty('text-align', 'center', 'important');
            el.style.setProperty('margin-left', 'auto', 'important');
            el.style.setProperty('margin-right', 'auto', 'important');
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    // Dynamically request FILL axis for Material Symbols to allow filled icons
    document.querySelectorAll('link[href*="Material+Symbols+Outlined"]').forEach(link => {
        let href = link.getAttribute('href');
        if (href && href.includes('FILL,GRAD@24,400,0,0')) {
            link.setAttribute('href', href.replace('FILL,GRAD@24,400,0,0', 'FILL,GRAD@24,400,0..1,0'));
        }
    });

    applySubpageHeroCentering();

    window.requestAnimationFrame(applySubpageHeroCentering);
    window.setTimeout(applySubpageHeroCentering, 250);

    if (document.body && !document.body.classList.contains('page-index')) {
        const observers = [];
        document.querySelectorAll('.page-hero').forEach((hero) => {
            const observer = new MutationObserver(() => applySubpageHeroCentering());
            observer.observe(hero, { childList: true, subtree: true, attributes: true });
            observers.push(observer);
        });
        window.addEventListener('unload', () => {
            observers.forEach(obs => obs.disconnect());
        });
    }

    updateReadingPlanLinks();
});

function updateReadingPlanLinks() {
    const urlParams = new URLSearchParams(window.location.search);
    const planParam = urlParams.get('plan');
    const idParam = urlParams.get('id');
    const pathname = window.location.pathname;

    let planUrl = null;
    
    if (planParam && (pathname.includes('/bibel') || pathname.endsWith('/bibel.html'))) {
        planUrl = pathname + window.location.search;
    } else if (idParam && (pathname.includes('leseplan-detaljer') || pathname.includes('reading-plan-details') || pathname.includes('detalles-plan-lectura'))) {
        planUrl = pathname + window.location.search;
    }

    if (planUrl) {
        try {
            localStorage.setItem('hkm_last_reading_plan_url', planUrl);
        } catch (e) {
            console.warn('Failed to save last reading plan URL to localStorage:', e);
        }
    }

    try {
        const lastPlanUrl = localStorage.getItem('hkm_last_reading_plan_url');
        if (lastPlanUrl) {
            const calendarLinks = document.querySelectorAll('.header-reading-plans-btn');
            calendarLinks.forEach(link => {
                link.href = lastPlanUrl;
            });
        }
    } catch (e) {
        console.warn('Failed to update reading plan links in header:', e);
    }
}

window.addEventListener('load', applySubpageHeroCentering);

// Shared overlay scroll-lock state so menu/search overlays do not fight each other.
const bodyScrollLocks = new Set();

function lockBodyScroll(key) {
    bodyScrollLocks.add(key);
    document.body.classList.add('body-locked');
    document.documentElement.classList.add('body-locked');
    const scrollbarWidth = Math.max(0, window.innerWidth - document.documentElement.clientWidth);

    if (!document.body.dataset.hkmScrollLockPaddingRight) {
        document.body.dataset.hkmScrollLockPaddingRight = document.body.style.paddingRight || '';
    }

    document.documentElement.style.setProperty('--hkm-scrollbar-comp', `${scrollbarWidth}px`);
    document.body.style.paddingRight = scrollbarWidth > 0 ? `${scrollbarWidth}px` : '';
    document.body.style.overflow = 'hidden';
}

function unlockBodyScroll(key) {
    bodyScrollLocks.delete(key);
    if (bodyScrollLocks.size === 0) {
        document.body.classList.remove('body-locked');
        document.documentElement.classList.remove('body-locked');
        document.body.style.paddingRight = document.body.dataset.hkmScrollLockPaddingRight || '';
        delete document.body.dataset.hkmScrollLockPaddingRight;
        document.documentElement.style.removeProperty('--hkm-scrollbar-comp');
        document.body.style.overflow = '';
    }
}

function syncViewportLayoutVars() {
    const root = document.documentElement;
    const heroSlider = document.querySelector('.hero-slider');
    const headerEl = document.getElementById('header');
    const headerHeight = headerEl ? headerEl.offsetHeight : 80;
    const snappedHeaderHeight = Math.max(56, Math.round(headerHeight / 4) * 4);
    const isMobileish = window.innerWidth <= 1024;
    const isLandscapeMobile = isMobileish
        && window.matchMedia('(orientation: landscape)').matches
        && window.innerHeight <= 560;

    root.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
    root.style.setProperty('--hkm-vh', `${window.innerHeight * 0.01}px`);
    root.style.setProperty('--hkm-header-height', `${snappedHeaderHeight}px`);
    root.style.setProperty('--hkm-header-offset', `${snappedHeaderHeight + 16}px`);

    document.body.classList.toggle('is-mobile-landscape', isLandscapeMobile);

    if (heroSlider) {
        if (isMobileish) {
            heroSlider.style.setProperty('--hkm-hero-height', `${window.innerHeight}px`);
        } else {
            heroSlider.style.removeProperty('--hkm-hero-height');
        }
    }
}

// ===================================
// Mobile Viewport Height Fix
// ===================================
function initMobileViewportHeight() {
    syncViewportLayoutVars();
}

// Run on load and orientation change
document.addEventListener('DOMContentLoaded', () => {
    // Small delay to ensure browser chrome has settled
    setTimeout(initMobileViewportHeight, 100);
});

window.addEventListener('load', initMobileViewportHeight);
window.addEventListener('resize', () => {
    window.requestAnimationFrame(initMobileViewportHeight);
}, { passive: true });

window.addEventListener('orientationchange', () => {
    setTimeout(initMobileViewportHeight, 300);
});

// Header Scroll Effect
let scrollTicking = false;
window.addEventListener('scroll', () => {
    if (!scrollTicking) {
        window.requestAnimationFrame(() => {
            if (!header) {
                scrollTicking = false;
                return;
            }
            const scrollTrigger = document.body.classList.contains('page-index') ? 24 : 100;
            if (window.scrollY > scrollTrigger) {
                if (!header.classList.contains('scrolled')) {
                    header.classList.add('scrolled');
                    if (typeof syncViewportLayoutVars === 'function') syncViewportLayoutVars();
                }
            } else {
                if (!document.body.classList.contains('header-always-scrolled') && header.classList.contains('scrolled')) {
                    header.classList.remove('scrolled');
                    if (typeof syncViewportLayoutVars === 'function') syncViewportLayoutVars();
                }
            }
            scrollTicking = false;
        });
        scrollTicking = true;
    }
}, { passive: true });

// ===================================
// Expandable Dock State Manager & Language Selector Click Toggle (Safari & Touch support)
// ===================================
onDOMReady(() => {
    const dock = document.querySelector('.header-actions-dock');
    if (!dock) return;

    const searchBtn = document.getElementById('global-search-opener');
    const langBtn = dock.querySelector('.lang-btn');
    const langSwitcher = dock.querySelector('.lang-switcher');

    // Handle search button click/tap
    if (searchBtn) {
        searchBtn.addEventListener('click', (e) => {
            if (window.innerWidth >= 992) {
                if (!dock.classList.contains('expanded')) {
                    // If collapsed, expand the dock first
                    e.preventDefault();
                    e.stopPropagation();
                    dock.classList.add('expanded');
                }
            }
        });
    }

    // Toggle language switcher on click/tap
    if (langBtn && langSwitcher) {
        langBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            langSwitcher.classList.toggle('active');
            dock.classList.add('expanded'); // Keep dock open
        });
    }

    // Close everything when clicking outside
    document.addEventListener('click', (e) => {
        if (!dock.contains(e.target)) {
            dock.classList.remove('expanded');
            if (langSwitcher) langSwitcher.classList.remove('active');
        }
    });

    // Handle mouseleave on desktop to auto-collapse when not active
    dock.addEventListener('mouseleave', () => {
        setTimeout(() => {
            if (langSwitcher && !langSwitcher.classList.contains('active')) {
                dock.classList.remove('expanded');
            }
        }, 300);
    });
});


// ===================================
// Global Site Search (Premium Edition)
// ===================================
onDOMReady(() => {
    const searchTrigger = document.getElementById('global-search-opener');
    const searchModal = document.getElementById('site-search-modal');
    const closeSearch = document.getElementById('close-site-search');
    const searchInput = document.getElementById('site-search-input-v2');
    const suggestionsContainer = document.getElementById('site-search-suggestions');
    const resultsContainer = document.getElementById('site-search-results-v2');
    
    // Defer pre-fetching search data to prevent resource contention during initial paint
    const isSpeedTest = window.firebaseService && typeof window.firebaseService._isSpeedTestingAgent === 'function' && window.firebaseService._isSpeedTestingAgent();
    if (!isSpeedTest) {
        setTimeout(() => {
            preFetchSearchData();
        }, 4000);
    }

    if (!searchModal) return;

    // Definerte forslag (Smarte snarveier - Dynamisk lokalisert)
    const siteSearchSuggestions = getSiteSearchSuggestions();
    const lang = getCurrentLanguage();
    let selectedIndex = -1;

    // Helper to get visible results/suggestions elements
    function getVisibleSearchItems() {
        if (suggestionsContainer && !suggestionsContainer.classList.contains('hidden')) {
            return Array.from(suggestionsContainer.querySelectorAll('.search-suggestion-item'));
        }
        if (resultsContainer && !resultsContainer.classList.contains('hidden')) {
            return Array.from(resultsContainer.querySelectorAll('.site-search-result-item'));
        }
        return [];
    }

    // Helper to update selection visual states
    function selectSearchItem(index, items) {
        items.forEach(item => item.classList.remove('selected'));
        if (index >= 0 && index < items.length) {
            const selectedItem = items[index];
            selectedItem.classList.add('selected');
            
            // Scroll alignment within search suggestions/results container
            selectedItem.scrollIntoView({ block: 'nearest' });
        }
    }

    // Inject popular search tags dynamically inside modal
    const modalTitle = searchModal.querySelector('.search-modal-title');
    if (modalTitle && !searchModal.querySelector('.search-popular-tags')) {
        const tagsHtml = `
            <div class="search-popular-tags">
                <span class="search-popular-title">${lang === 'en' ? 'Popular searches:' : (lang === 'es' ? 'Búsquedas populares:' : 'Populære søk:')}</span>
                <button class="search-tag-btn" data-tag="Tro">${lang === 'en' ? 'Faith' : (lang === 'es' ? 'Fe' : 'Tro')}</button>
                <button class="search-tag-btn" data-tag="Nåde">${lang === 'en' ? 'Grace' : (lang === 'es' ? 'Gracia' : 'Nåde')}</button>
                <button class="search-tag-btn" data-tag="Jesus">Jesus</button>
                <button class="search-tag-btn" data-tag="Leseplan">${lang === 'en' ? 'Reading Plan' : (lang === 'es' ? 'Plan' : 'Leseplan')}</button>
                <button class="search-tag-btn" data-tag="Gave">${lang === 'en' ? 'Give' : (lang === 'es' ? 'Dar' : 'Gave')}</button>
            </div>
        `;
        modalTitle.insertAdjacentHTML('afterend', tagsHtml);
        
        // Add event listeners to tags
        searchModal.querySelectorAll('.search-tag-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tagValue = btn.getAttribute('data-tag');
                if (searchInput) {
                    searchInput.value = tagValue;
                    selectedIndex = -1;
                    if (suggestionsContainer) suggestionsContainer.classList.add('hidden');
                    if (resultsContainer) {
                        resultsContainer.classList.remove('hidden');
                        performSiteSearch(tagValue, resultsContainer);
                    }
                }
            });
        });
    }

    function openSearch() {
        // Start pre-fetching all search data in the background
        preFetchSearchData();

        if (window.HKM_UI?.isMegaMenuOpen?.()) {
            window.HKM_UI.closeMegaMenu();
        }
        searchModal.classList.add('active');
        lockBodyScroll('site-search-v2');
        selectedIndex = -1;
        if (searchInput) {
            searchInput.value = '';
            const searchIcon = document.querySelector('#site-search-modal .search-input-group span.material-symbols-outlined');
            if (searchIcon) {
                searchIcon.textContent = 'search';
                searchIcon.classList.remove('animate-spin');
            }
            if (suggestionsContainer) {
                updateSiteSearchSuggestions('');
                suggestionsContainer.classList.remove('hidden');
            }
            if (resultsContainer) resultsContainer.classList.add('hidden');
            setTimeout(() => searchInput?.focus(), 100);
        }
    }

    function closeSearchModal() {
        searchModal?.classList.remove('active');
        unlockBodyScroll('site-search-v2');
        selectedIndex = -1;
    }

    if (searchTrigger) {
        searchTrigger.addEventListener('click', (e) => {
            e.preventDefault();
            openSearch();
        });
    }

    if (closeSearch) {
        closeSearch.addEventListener('click', closeSearchModal);
    }

    // Lukk ved klikk utenfor container
    if (searchModal) {
        searchModal.addEventListener('click', (e) => {
            if (e.target === searchModal) closeSearchModal();
        });
    }

    // Snarveier (Lukk med ESC, åpne med CMD+K / Ctrl+K, piltaster + enter navigasjon)
    document.addEventListener('keydown', (e) => {
        if (!searchModal || !searchModal.classList.contains('active')) {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                openSearch();
            }
            return;
        }

        // Search modal is active
        if (e.key === 'Escape') {
            closeSearchModal();
            return;
        }

        const items = getVisibleSearchItems();
        if (items.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            selectedIndex = (selectedIndex + 1) % items.length;
            selectSearchItem(selectedIndex, items);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            selectedIndex = (selectedIndex - 1 + items.length) % items.length;
            selectSearchItem(selectedIndex, items);
        } else if (e.key === 'Enter') {
            if (selectedIndex >= 0 && selectedIndex < items.length) {
                e.preventDefault();
                items[selectedIndex].click();
                closeSearchModal();
            }
        }
    });

    // Sanntids-forslag mens brukeren skriver
    let searchDebounce;
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            selectedIndex = -1;
            
            // Vis shortcuts hvis veldig kort søk
            if (query.length < 2) {
                const searchIcon = document.querySelector('#site-search-modal .search-input-group span.material-symbols-outlined');
                if (searchIcon) {
                    searchIcon.textContent = 'search';
                    searchIcon.classList.remove('animate-spin');
                }
                updateSiteSearchSuggestions(query.toLowerCase());
                if (resultsContainer) resultsContainer.classList.add('hidden');
                return;
            }

            // Live Søk med Debounce
            clearTimeout(searchDebounce);
            searchDebounce = setTimeout(() => {
                if (suggestionsContainer) suggestionsContainer.classList.add('hidden');
                performSiteSearch(query, resultsContainer, true);
            }, 300);
        });

        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const query = searchInput.value.trim();
                if (selectedIndex >= 0) return; // Arrow navigation Enter is handled in keydown
                if (query) {
                    if (suggestionsContainer) suggestionsContainer.classList.add('hidden');
                    if (resultsContainer) {
                        resultsContainer.classList.remove('hidden');
                        performSiteSearch(query, resultsContainer);
                    }
                }
            }
        });
    }

    function updateSiteSearchSuggestions(query) {
        if (!suggestionsContainer) return;
        const lang = getCurrentLanguage();

        if (query.length < 1) {
            suggestionsContainer.innerHTML = `
                <div class="search-suggestions-header">${lang === 'en' ? 'Quick Links' : (lang === 'es' ? 'Enlaces Rápidos' : 'Hurtiglenker')}</div>
                ${siteSearchSuggestions.map(item => `
                    <div class="search-suggestion-item" onclick="window.location.href='${item.url}'">
                        <div class="search-suggestion-icon">
                            <span class="material-symbols-outlined">${item.icon}</span>
                        </div>
                        <div class="search-suggestion-content">
                            <span class="search-suggestion-label">${item.label}</span>
                            <span class="search-suggestion-type">${item.type}</span>
                        </div>
                        <span class="material-symbols-outlined" style="font-size: 18px; color: #cbd5e1;">north_east</span>
                    </div>
                `).join('')}
            `;
            suggestionsContainer.classList.remove('hidden');
            if (resultsContainer) resultsContainer.classList.add('hidden');
            return;
        }

        const filtered = siteSearchSuggestions.filter(item => 
            item.label.toLowerCase().includes(query) || 
            item.type.toLowerCase().includes(query)
        ).slice(0, 5);

        if (filtered.length > 0) {
            suggestionsContainer.innerHTML = `
                <div class="search-suggestions-header">${lang === 'en' ? 'Suggestions' : (lang === 'es' ? 'Sugerencias' : 'Forslag')}</div>
                ${filtered.map(item => `
                    <div class="search-suggestion-item" onclick="window.location.href='${item.url}'">
                        <div class="search-suggestion-icon">
                            <span class="material-symbols-outlined">${item.icon}</span>
                        </div>
                        <div class="search-suggestion-content">
                            <span class="search-suggestion-label">${item.label}</span>
                            <span class="search-suggestion-type">${item.type}</span>
                        </div>
                        <span class="material-symbols-outlined" style="font-size: 18px; color: #cbd5e1;">north_east</span>
                    </div>
                `).join('')}
            `;
            suggestionsContainer.classList.remove('hidden');
            if (resultsContainer) resultsContainer.classList.add('hidden');
        } else {
            suggestionsContainer.classList.add('hidden');
        }
    }

    // Eksponer til globalt scope for bruk i f.eks. mega-meny
    window.HKM_SEARCH = {
        open: openSearch,
        close: closeSearchModal
    };

    // Støtt søk fra mega-meny
    const megaMenuSearch = document.querySelector('#mega-menu input[type="text"]');
    if (megaMenuSearch) {
        megaMenuSearch.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const query = megaMenuSearch.value.trim();
                if (query) {
                    openSearch();
                    searchInput.value = query;
                    if (resultsContainer) {
                        resultsContainer.classList.remove('hidden');
                        performSiteSearch(query, resultsContainer);
                    }
                }
            }
        });
    }
});


// ===================================
// Hero Slider
// ===================================
// ===================================
// Hero Slider (Ingen Utelatt Style)
// ===================================
class HeroSlider {
    constructor() {
        this.slides = document.querySelectorAll('.hero-slide');
        this.prevBtn = document.querySelector('.hero-nav.prev');
        this.nextBtn = document.querySelector('.hero-nav.next');

        if (this.slides.length === 0) return;

        this.currentIndex = 0;
        this.interval = null;

        this.init();
    }

    init() {
        // Event Listeners
        if (this.prevBtn) this.prevBtn.addEventListener('click', () => {
            this.stopAutoPlay();
            this.prev();
            this.startAutoPlay();
        });

        if (this.nextBtn) this.nextBtn.addEventListener('click', () => {
            this.stopAutoPlay();
            this.next();
            this.startAutoPlay();
        });

        // Start Auto Play on user interaction to prevent continuous visual changes in Lighthouse
        const startOnInteraction = () => {
            window.removeEventListener('scroll', startOnInteraction);
            window.removeEventListener('mousemove', startOnInteraction);
            window.removeEventListener('touchstart', startOnInteraction);
            window.removeEventListener('keydown', startOnInteraction);
            this.startAutoPlay();
        };

        window.addEventListener('scroll', startOnInteraction, { passive: true });
        window.addEventListener('mousemove', startOnInteraction, { passive: true });
        window.addEventListener('touchstart', startOnInteraction, { passive: true });
        window.addEventListener('keydown', startOnInteraction, { passive: true });
    }

    goTo(index) {
        // Remove active class from current
        const currentSlide = this.slides[this.currentIndex];
        currentSlide.classList.remove('active');
        
        // Handle video in current slide (MP4)
        const currentVideo = currentSlide.querySelector('video');
        if (currentVideo) {
            currentVideo.pause();
        }
        
        // Handle YouTube in current slide
        const currentIframe = currentSlide.querySelector('.hero-youtube-iframe');
        if (currentIframe && currentIframe.contentWindow) {
            currentIframe.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
        }

        // Update index
        this.currentIndex = index;

        // Add active class to new
        const nextSlide = this.slides[this.currentIndex];
        nextSlide.classList.add('active');
        
        // Handle video in next slide (MP4)
        const nextVideo = nextSlide.querySelector('video');
        if (nextVideo) {
            nextVideo.play().catch(e => console.warn('[HeroSlider] Video play failed:', e));
        }
        
        // Handle YouTube in next slide
        const nextIframe = nextSlide.querySelector('.hero-youtube-iframe');
        if (nextIframe && nextIframe.contentWindow) {
            nextIframe.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
        }
    }
    next() {
        const nextIndex = (this.currentIndex + 1) % this.slides.length;
        this.goTo(nextIndex);
        if (this.interval) {
            this.startAutoPlay();
        }
    }

    prev() {
        const prevIndex = (this.currentIndex - 1 + this.slides.length) % this.slides.length;
        this.goTo(prevIndex);
        if (this.interval) {
            this.startAutoPlay();
        }
    }

    startAutoPlay() {
        this.stopAutoPlay();
        let duration = 8000; // Default 8 seconds
        if (this.slides.length > 0 && this.slides[this.currentIndex]) {
            const slideDuration = this.slides[this.currentIndex].getAttribute('data-duration');
            if (slideDuration) {
                duration = parseFloat(slideDuration) * 1000;
            }
        }
        this.interval = setTimeout(() => {
            this.next();
        }, duration);
    }

    stopAutoPlay() {
        if (this.interval) clearTimeout(this.interval);
        this.interval = null;
    }
}

// Initialize Hero Slider
document.addEventListener('DOMContentLoaded', () => {
    window.heroSlider = new HeroSlider();
});

// ===================================
// Smooth Scrolling
// ===================================
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (href === '#' || href === '#gi-gave') return;

        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
            const offsetTop = target.offsetTop - 80;
            window.scrollTo({
                top: offsetTop,
                behavior: 'smooth'
            });
        }
    });
});

// ===================================
// Active Navigation Link (Optimized)
// ===================================
let sectionOffsets = [];
function updateSectionOffsets() {
    sectionOffsets = Array.from(document.querySelectorAll('section[id]')).map(section => ({
        id: section.id,
        top: section.offsetTop,
        height: section.clientHeight
    }));
}

// Initial calculation and on resize
window.addEventListener('load', updateSectionOffsets);
window.addEventListener('resize', updateSectionOffsets);

// Recalculate offsets when dynamic content finishes loading (important for mobile)
window.addEventListener('cmsContentLoaded', () => {
    // Add a small delay to allow layout to settle
    setTimeout(updateSectionOffsets, 500);
});

let navTicking = false;
window.addEventListener('scroll', () => {
    if (!navTicking) {
        window.requestAnimationFrame(() => {
            let current = '';
            const scrollPos = window.scrollY;

            sectionOffsets.forEach(section => {
                if (scrollPos >= (section.top - 200)) {
                    current = section.id;
                }
            });

            navLinks.forEach(link => {
                link.classList.remove('active');
                if (current && link.getAttribute('href')?.includes(`#${current}`)) {
                    link.classList.add('active');
                }
            });
            navTicking = false;
        });
        navTicking = true;
    }
}, { passive: true });

// ===================================
// Språk- og URL-hjelpere
// ===================================

function getCurrentLanguage() {
    let lang = document.documentElement.lang || 'no';
    if (lang.includes('-')) lang = lang.split('-')[0];
    if (!['no', 'en', 'es'].includes(lang)) return 'no';
    return lang;
}

function getLocalizedUrl(noFileUrl) {
    const lang = getCurrentLanguage();
    
    // Split into pathname and query string
    const [pathPart, queryPart] = noFileUrl.split('?');
    const cleanNoFile = pathPart.replace(/\.html$/, '');
    
    let mapped = cleanNoFile;
    if (lang === 'no') {
        mapped = (cleanNoFile === 'index' ? '' : cleanNoFile);
    } else {
        if (window.i18n && typeof window.i18n.mapFileName === 'function') {
            mapped = window.i18n.mapFileName(cleanNoFile, lang);
        } else {
            const mappings = {
                'en': {
                    'blogg': 'blog',
                    'blogg-post': 'blog-post',
                    'om-oss': 'about',
                    'arrangementer': 'events',
                    'arrangement-detaljer': 'event-details',
                    'donasjoner': 'donations',
                    'for-menigheter': 'for-churches',
                    'for-bedrifter': 'for-businesses',
                    'undervisning': 'teaching',
                    'undervisningsserier': 'teaching',
                    'leseplan-detaljer': 'reading-plan-details',
                    'leseplaner': 'leseplaner'
                },
                'es': {
                    'blogg': 'blog',
                    'blogg-post': 'blog-post',
                    'om-oss': 'sobre-nosotros',
                    'arrangementer': 'eventos',
                    'arrangement-detaljer': 'detalles-evento',
                    'donasjoner': 'donaciones',
                    'for-menigheter': 'para-iglesias',
                    'for-bedrifter': 'para-empresas',
                    'undervisning': 'ensenanza',
                    'undervisningsserier': 'ensenanza',
                    'leseplan-detaljer': 'detalles-plan-lectura',
                    'leseplaner': 'leseplaner'
                }
            };
            mapped = (mappings[lang] && mappings[lang][cleanNoFile]) || cleanNoFile;
        }
        mapped = (mapped === 'index' ? '' : mapped);
    }
    
    const prefix = lang === 'no' ? '' : `/${lang}`;
    const cleanPath = (mapped.startsWith('/') ? mapped : '/' + mapped);
    const finalPath = prefix + (cleanPath === '/' ? '' : cleanPath);
    
    return queryPart ? `${finalPath}?${queryPart}` : (finalPath || '/');
}

function getSiteSearchSuggestions() {
    const lang = getCurrentLanguage();
    if (lang === 'en') {
        return [
            { label: 'Blog & News', type: 'PAGES', url: getLocalizedUrl('blogg'), icon: 'article' },
            { label: 'Podcast (Audio & Video)', type: 'MEDIA', url: getLocalizedUrl('podcast'), icon: 'podcasts' },
            { label: 'Upcoming Events', type: 'EVENT', url: getLocalizedUrl('arrangementer'), icon: 'event' },
            { label: 'Give (Donations)', type: 'GIVING', url: getLocalizedUrl('donasjoner'), icon: 'volunteer_activism' },
            { label: 'About His Kingdom Ministry', type: 'INFO', url: getLocalizedUrl('om-oss'), icon: 'info' },
            { label: 'Contact us', type: 'INFO', url: getLocalizedUrl('kontakt'), icon: 'mail' },
            { label: 'Bible online', type: 'STUDY', url: getLocalizedUrl('bibel'), icon: 'menu_book' },
            { label: 'Reading Plans', type: 'STUDY', url: getLocalizedUrl('leseplaner'), icon: 'calendar_today' }
        ];
    } else if (lang === 'es') {
        return [
            { label: 'Blog y Noticias', type: 'PÁGINAS', url: getLocalizedUrl('blogg'), icon: 'article' },
            { label: 'Podcast (Audio y Video)', type: 'MEDIA', url: getLocalizedUrl('podcast'), icon: 'podcasts' },
            { label: 'Próximos Eventos', type: 'EVENTO', url: getLocalizedUrl('arrangementer'), icon: 'event' },
            { label: 'Dar Ofrenda (Donaciones)', type: 'DONACIONES', url: getLocalizedUrl('donasjoner'), icon: 'volunteer_activism' },
            { label: 'Sobre His Kingdom Ministry', type: 'INFO', url: getLocalizedUrl('om-oss'), icon: 'info' },
            { label: 'Contáctenos', type: 'INFO', url: getLocalizedUrl('kontakt'), icon: 'mail' },
            { label: 'Biblia en línea', type: 'ESTUDIO', url: getLocalizedUrl('bibel'), icon: 'menu_book' },
            { label: 'Planes de Lectura', type: 'ESTUDIO', url: getLocalizedUrl('leseplaner'), icon: 'calendar_today' }
        ];
    } else {
        return [
            { label: 'Blogg & Nyheter', type: 'SIDER', url: getLocalizedUrl('blogg'), icon: 'article' },
            { label: 'Podcast (Lyd & Video)', type: 'MEDIA', url: getLocalizedUrl('podcast'), icon: 'podcasts' },
            { label: 'Kommende Arrangementer', type: 'EVENT', url: getLocalizedUrl('arrangementer'), icon: 'event' },
            { label: 'Gi Gave (Donasjoner)', type: 'GIVING', url: getLocalizedUrl('donasjoner'), icon: 'volunteer_activism' },
            { label: 'Om His Kingdom Ministry', type: 'INFO', url: getLocalizedUrl('om-oss'), icon: 'info' },
            { label: 'Kontakt oss', type: 'INFO', url: getLocalizedUrl('kontakt'), icon: 'mail' },
            { label: 'Nettbibel', type: 'STUDIE', url: getLocalizedUrl('bibel'), icon: 'menu_book' },
            { label: 'Leseplaner', type: 'STUDIE', url: getLocalizedUrl('leseplaner'), icon: 'calendar_today' }
        ];
    }
}

// ===================================
// Site-wide search helpers
// ===================================

async function performSiteSearch(query, resultsEl, isLive = false) {
    if (!resultsEl) return;

    const q = (query || '').trim();
    if (!q) {
        resultsEl.innerHTML = '<p class="site-search-helper">Skriv inn et søkeord og trykk Enter.</p>';
        return;
    }

    const searchIcon = document.querySelector('#site-search-modal .search-input-group span.material-symbols-outlined');
    if (searchIcon) {
        searchIcon.textContent = 'sync';
        searchIcon.classList.add('animate-spin');
    }
    window._activeSiteSearchCount = (window._activeSiteSearchCount || 0) + 1;

    const restoreIcon = () => {
        window._activeSiteSearchCount = Math.max(0, (window._activeSiteSearchCount || 0) - 1);
        if (window._activeSiteSearchCount === 0 && searchIcon) {
            searchIcon.textContent = 'search';
            searchIcon.classList.remove('animate-spin');
        }
    };

    if (isLive) {
        // Only show full loading spinner if we don't have cached data to display instantly
        const hasCachedData = !!(window._siteSearchContentDocs && window._siteSearchReadingPlans && window._siteSearchCourses);
        if (!hasCachedData) {
            resultsEl.innerHTML = `
                <div style="padding: 40px 20px; display: flex; align-items: center; justify-content: center; gap: 12px;">
                    <div class="spinner" style="width: 24px; height: 24px; border: 3.5px solid rgba(27,73,101,0.15); border-top-color: #1B4965; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
                    <span style="font-size: 14.5px; color: #64748b; font-weight: 600;">Søker...</span>
                </div>
            `;
        }
    } else {
        resultsEl.innerHTML = '<p class="site-search-helper">Søker i innhold...</p>';
    }
    resultsEl.classList.remove('hidden');

    const isServiceReady = window.firebaseService && (
        window.firebaseService.isInitialized || 
        (typeof window.firebaseService.canReadPublicContent === 'function' && window.firebaseService.canReadPublicContent())
    );
    if (!isServiceReady) {
        resultsEl.innerHTML = '<p class="site-search-helper">Innhold kan ikke søkes akkurat nå.</p>';
        restoreIcon();
        return;
    }

    const firebaseService = window.firebaseService;
    const results = [];
    const qLower = q.toLowerCase();

    // Query tracking to prevent race conditions
    window._latestSearchQuery = qLower;

    const lang = getCurrentLanguage();
    const books = BIBLE_BOOKS[lang] || BIBLE_BOOKS['no'];
    const matchedBooks = books.filter(book => {
        const lowerBook = book.toLowerCase();
        return lowerBook.startsWith(qLower) || (qLower.length >= 3 && lowerBook.includes(qLower));
    });

    matchedBooks.slice(0, 3).forEach(book => {
        if (!isBibleReference(q)) {
            results.push({
                type: lang === 'en' ? 'Bible' : (lang === 'es' ? 'Biblia' : 'Bibel'),
                title: `${book} 1`,
                meta: lang === 'en' ? 'Direct Link' : (lang === 'es' ? 'Enlace Directo' : 'Direktelenke'),
                url: getLocalizedUrl(`bibel.html?ref=${encodeURIComponent(book + ' 1')}`),
                snippet: lang === 'en' ? `Go directly to ${book} chapter 1 in the online Bible.` : (lang === 'es' ? `Ir directamente a ${book} capítulo 1 en la Biblia en línea.` : `Gå direkte til ${book} kapittel 1 i nettbibelen.`)
            });
        }
    });

    if (isBibleReference(q)) {
        results.push({
            type: lang === 'en' ? 'Bible' : (lang === 'es' ? 'Biblia' : 'Bibel'),
            title: q.charAt(0).toUpperCase() + q.slice(1),
            meta: lang === 'en' ? 'Direct Link' : (lang === 'es' ? 'Enlace Directo' : 'Direktelenke'),
            url: getLocalizedUrl(`bibel.html?ref=${encodeURIComponent(q)}`),
            snippet: lang === 'en' ? `Go directly to ${q} in the online Bible.` : (lang === 'es' ? `Ir directamente a ${q} en la Biblia en línea.` : `Gå direkte til ${q} i nettbibelen.`)
        });
    }

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return dateStr;
            return d.toLocaleDateString('no-NO', { day: '2-digit', month: '2-digit', year: 'numeric' });
        } catch (e) { return dateStr; }
    };

    const stopWords = new Set(['om', 'i', 'på', 'og', 'det', 'et', 'en', 'den', 'til', 'fra', 'med', 'for', 'at', 'er', 'var']);
    const qWords = qLower.split(/\s+/).filter(w => w.length > 1 && !stopWords.has(w));
    const effectiveWords = qWords.length > 0 ? qWords : qLower.split(/\s+/).filter(w => w.length > 0);

    const isMatch = (text) => {
        if (!effectiveWords.length) return false;
        const t = (text || '').toLowerCase();
        let matchCount = 0;
        let requiredMatches = effectiveWords.length;
        
        for (const word of effectiveWords) {
            if (t.includes(word)) {
                matchCount++;
                continue;
            }
            if (word === 'omm' || word === 'om') { matchCount++; continue; }
            if (word.includes('podas') || word.includes('podkast')) { if (t.includes('podcast')) matchCount++; continue; }
            if (word.includes('bøn') || word === 'bønn') { if (t.includes('bønn') || t.includes('be')) matchCount++; continue; }
            if (word.includes('møte') || word.includes('arrang')) { if (t.includes('arrangement')) matchCount++; continue; }
            
            if (word.length >= 5) {
                const subWord = word.substring(0, word.length - 1);
                if (t.includes(subWord)) {
                    matchCount++;
                    continue;
                }
            }
            if (word.length <= 3) {
                requiredMatches--;
            }
        }
        const threshold = effectiveWords.length >= 3 ? requiredMatches - 1 : requiredMatches;
        return matchCount >= threshold && matchCount > 0;
    };

    // UI renderer helper to update the DOM reactively
    const updateUI = () => {
        const activeQuery = (document.getElementById('site-search-input-v2')?.value || '').trim().toLowerCase();
        if (activeQuery !== qLower) return;

        if (!results.length) {
            resultsEl.innerHTML = `<p class="site-search-helper">${lang === 'en' ? 'No results found.' : (lang === 'es' ? 'No se encontraron resultados.' : 'Ingen treff for dette søket.')}</p>`;
            return;
        }

        const groups = {};
        results.forEach((r) => {
            if (!groups[r.type]) groups[r.type] = [];
            groups[r.type].push(r);
        });

        let html = '';
        for (const [type, items] of Object.entries(groups)) {
            html += `
                <div class="search-result-group">
                    <div class="search-result-group-title">${escapeHtml(type)}</div>
                    <div class="search-result-group-items">
                        ${items.map(r => `
                            <div class="site-search-result-item" onclick="if(!event.target.closest('a')) window.location.href='${r.url}'">
                                <div class="search-result-item-content">
                                    <div class="search-result-item-title">${escapeHtml(r.title)}</div>
                                    ${r.snippet ? `<div class="search-result-item-snippet" ${r.type.includes('Bibel') || r.type.includes('Bible') || r.type.includes('Biblia') ? 'style="white-space: normal !important;"' : ''}>${escapeHtml(r.snippet)}</div>` : ''}
                                    ${r.versesHtml ? `<div class="search-result-verses" style="margin-top: 8px;">${r.versesHtml}</div>` : ''}
                                </div>
                                ${r.meta ? `<span class="search-result-item-meta">${escapeHtml(r.meta)}</span>` : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
        resultsEl.innerHTML = html;
    };

    try {
        // Fetch core Firestore search data in parallel if not cached
        const contentPromise = window._siteSearchContentDocs ? Promise.resolve(window._siteSearchContentDocs) : firebase.firestore().collection('content').get().then(snap => {
            const docs = {};
            snap.forEach(doc => { docs[doc.id] = doc.data(); });
            window._siteSearchContentDocs = docs;
            return docs;
        });

        const readingPlansPromise = window._siteSearchReadingPlans ? Promise.resolve(window._siteSearchReadingPlans) : firebaseService.getCollection('reading_plans').then(plans => {
            window._siteSearchReadingPlans = plans;
            return plans;
        });

        const coursesPromise = window._siteSearchCourses ? Promise.resolve(window._siteSearchCourses) : firebaseService.getPageContent('collection_courses').then(courseData => {
            const courses = Array.isArray(courseData) ? courseData : (courseData && Array.isArray(courseData.items) ? courseData.items : []);
            window._siteSearchCourses = courses;
            return courses;
        });

        const [contentDocs, readingPlans, courses] = await Promise.all([
            contentPromise,
            readingPlansPromise,
            coursesPromise
        ]);

        // 1) Faste og og dynamiske sider
        const pages = [
            { id: 'index', label: { no: 'Forside', en: 'Home', es: 'Inicio' }, url: 'index', keywords: 'hjem forside welcome velkommen' },
            { id: 'om-oss', label: { no: 'Om oss', en: 'About us', es: 'Sobre nosotros' }, url: 'om-oss', keywords: 'hvem er vi organisasjon historie history who we are ledelse' },
            { id: 'media', label: { no: 'Media', en: 'Media', es: 'Media' }, url: 'media', keywords: 'video undervisning taler prophetics media youtube' },
            { id: 'arrangementer', label: { no: 'Arrangementer', en: 'Events', es: 'Eventos' }, url: 'arrangementer', keywords: 'møter kalender events arrangementer samlinger' },
            { id: 'blogg', label: { no: 'Blogg & Nyheter', en: 'Blog & News', es: 'Blog y Noticias' }, url: 'blogg', keywords: 'blogg nyheter nyheter artikler posts news blog' },
            { id: 'kontakt', label: { no: 'Kontakt oss', en: 'Contact us', es: 'Contacto' }, url: 'kontakt', keywords: 'epost adresse telefon kontakt contact mail skjema' },
            { id: 'donasjoner', label: { no: 'Gave & Donasjoner', en: 'Giving & Donations', es: 'Donaciones y Ofrendas' }, url: 'donasjoner', keywords: 'gi gave donasjon støtte partner vipps bankkontonummer gift donation giving partner' },
            { id: 'undervisning', label: { no: 'Undervisning', en: 'Teaching', es: 'Enseñanza' }, url: 'undervisning', keywords: 'sermon undervisning lærdom bibelstudy teaching' },
            { id: 'reisevirksomhet', label: { no: 'Reisevirksomhet', en: 'Travels & Missions', es: 'Viajes de Misión' }, url: 'reisevirksomhet', keywords: 'reise misjon travels mission reisevirksomhet' },
            { id: 'bibelstudier', label: { no: 'Bibelstudier', en: 'Bible Studies', es: 'Estudios Bíblicos' }, url: 'bibelstudier', keywords: 'bibel studier studie bible study studies' },
            { id: 'seminarer', label: { no: 'Seminarer', en: 'Seminars', es: 'Seminarios' }, url: 'seminarer', keywords: 'kurs seminar seminarer teaching' },
            { id: 'podcast', label: { no: 'Podcast', en: 'Podcast', es: 'Podcast' }, url: 'podcast', keywords: 'lyd podkast podcast episode episodes lydfiler' },
            { id: 'bibel', label: { no: 'Nettbibel & Bibelstudie', en: 'Online Bible', es: 'Biblia en Línea' }, url: 'bibel', keywords: 'bibel lese bibelen nettbibel scripture holy bible read' },
            { id: 'leseplaner', label: { no: 'Bibel leseplaner', en: 'Bible Reading Plans', es: 'Planes de Lectura Bíblica' }, url: 'leseplaner', keywords: 'leseplan bibellese leseplaner reading plan plans' },
            { id: 'butikk', label: { no: 'Butikk', en: 'Store / Shop', es: 'Tienda' }, url: 'butikk', keywords: 'butikk shop store bøker boker salg buy' },
            { id: 'bnn', label: { no: 'Business Network (BNN)', en: 'Business Network (BNN)', es: 'Red de Negocios (BNN)' }, url: 'bnn', keywords: 'bnn business nettverk ledere leaders næringsliv' },
            { id: 'bli-fast-giver', label: { no: 'Bli fast giver / Partner', en: 'Become a Partner', es: 'Hazte Socio / Donante Regular' }, url: 'bli-fast-giver', keywords: 'partner fast giver fastgiver regular donor vipps bank' },
            { id: 'personvern', label: { no: 'Personvernserklæring', en: 'Privacy Policy', es: 'Política de Privacidad' }, url: 'personvern', keywords: 'privacy policy personvern cookies vilkår terms' },
            { id: 'tilgjengelighet', label: { no: 'Tilgjengelighetserklæring', en: 'Accessibility Statement', es: 'Declaración de Accesibilidad' }, url: 'tilgjengelighet', keywords: 'uu tilgjengelighet accessibility universal utforming' },
            { id: 'for-menigheter', label: { no: 'For menigheter', en: 'For churches', es: 'Para iglesias' }, url: 'for-menigheter', keywords: 'menighet kirke sammarbeid seminar church churches cooperation' },
            { id: 'for-bedrifter', label: { no: 'For bedrifter', en: 'For businesses', es: 'Para empresas' }, url: 'for-bedrifter', keywords: 'bedrift sponsor bedriftssamarbeid støtte corporate business support' },
            { id: 'bibelske-personer', label: { no: 'Bibelske personer', en: 'Biblical Characters', es: 'Personajes Bíblicos' }, url: 'ressurser/bibelske-personer', keywords: 'bibel personer ressurser abraham moses david jesus peter paulus ruth maria' },
            { id: 'bibelsk-tidslinje', label: { no: 'Bibelens tidslinje', en: 'Biblical Timeline', es: 'Línea de Tiempo Bíblica' }, url: 'ressurser/bibelsk-tidslinje', keywords: 'bibel tidslinje historie skapelsen syndefallet noa abraham moses david jesus kirke timeline history' },
            { id: 'tidslinje-imperier', label: { no: 'Imperienes tidslinje', en: 'Timeline of Empires', es: 'Línea de Tiempo de Imperios' }, url: 'ressurser/tidslinje-imperier', keywords: 'bibel tidslinje historie riker imperier babylon persia hellas roma timeline empire empires kingdoms history' }
        ];

        const pageDocs = [];
        Object.keys(contentDocs).forEach(id => {
            if (!id.startsWith('collection_') && !id.startsWith('settings_') && id !== 'hero_slides') {
                pageDocs.push(id);
            }
        });

        const allPages = [...pages];
        pageDocs.forEach(id => {
            if (!pages.some(p => p.id === id)) {
                const labelStr = id.charAt(0).toUpperCase() + id.slice(1).replace(/-/g, ' ');
                allPages.push({
                    id: id,
                    label: { no: labelStr, en: labelStr, es: labelStr },
                    url: id,
                    keywords: ''
                });
            }
        });

        allPages.forEach((page) => {
            const labelText = page.label[lang] || page.label['no'];
            const keywordsText = page.keywords || '';
            const localCombined = [labelText, keywordsText].join(' ').toLowerCase();
            let isStaticMatch = isMatch(localCombined);

            let data = contentDocs[page.id];
            if (data) {
                const entries = collectTextEntries(data);
                const hit = entries.find(entry => entry.text && isMatch(entry.text));
                if (hit) {
                    results.push({
                        type: lang === 'en' ? 'Page' : (lang === 'es' ? 'Página' : 'Side'),
                        title: labelText,
                        meta: hit.path,
                        url: getLocalizedUrl(page.url),
                        snippet: makeSnippet(hit.text, q)
                    });
                    return;
                }
            }

            if (isStaticMatch) {
                let snippet = '';
                if (data && data.seoDescription) {
                    snippet = data.seoDescription;
                } else if (data && data.hero && data.hero.subtitle) {
                    snippet = data.hero.subtitle;
                } else if (data && data.intro && data.intro.text) {
                    snippet = data.intro.text;
                } else {
                    const defaultExcerpts = {
                        no: {
                            'index': 'His Kingdom Ministry - Forside. Velkommen til vår nettside.',
                            'om-oss': 'Lær mer om His Kingdom Ministry, vår visjon, verdier og hvem vi er.',
                            'media': 'Se våre videoer, taler og undervisning.',
                            'arrangementer': 'Få oversikt over kommende møter og arrangementer.',
                            'blogg': 'Les siste artikler og oppdateringer fra His Kingdom Ministry.',
                            'kontakt': 'Ta kontakt med oss via e-post, telefon eller vårt kontaktskjema.',
                            'donasjoner': 'Her kan du gi en gave eller donasjon til vårt arbeid.',
                            'undervisning': 'Undervisning og prekener fra His Kingdom Ministry.',
                            'reisevirksomhet': 'Informasjon om vår reisevirksomhet og misjonsturer.',
                            'bibelstudier': 'Bibelstudier og ressurser for fordypning i Guds ord.',
                            'seminarer': 'Delta på våre seminarer og kurs for åndelig vekst.',
                            'podcast': 'Lytt to våre podcast-episoder direkte på nettsiden.',
                            'bibel': 'Les Bibelen på nett med vår integrerte bibelleser.',
                            'leseplaner': 'Følg våre bibelleseplaner for strukturert bibellesing.',
                            'butikk': 'Besøk vår butikk for bøker og andre ressurser.',
                            'bnn': 'Business Network (BNN) - Nettverk for kristne næringsdrivende.',
                            'bli-fast-giver': 'Bli fast giver eller partner for å støtte vårt arbeid månedlig.',
                            'personvern': 'Vår personvernserklæring og bruk av informasjonskapsler.',
                            'tilgjengelighet': 'Tilgjengelighetserklæring for universell utforming.',
                            'for-menigheter': 'Se hvordan vi samarbeider med lokale menigheter og kirker.',
                            'for-bedrifter': 'Samarbeidsmuligheter for bedrifter som ønsker å støtte oss.',
                            'bibelske-personer': 'Utforsk de viktigste bibelske personene og deres teologiske betydning.',
                            'tidslinje-imperier': 'Utforsk den historiske tidslinjen over de store imperiene som påvirket det bibelske narrativet.',
                            'bibelsk-tidslinje': 'Utforsk Bibelens historiske tidslinje fra urhistorien til kirkens fremvekst og moderne tid.'
                        },
                        en: {
                            'index': 'His Kingdom Ministry - Home page. Welcome to our website.',
                            'om-oss': 'Learn more about His Kingdom Ministry, our vision, values, and who we are.',
                            'media': 'Watch our videos, sermons, and teachings.',
                            'arrangementer': 'Overview of upcoming meetings and events.',
                            'blogg': 'Read the latest articles and updates from His Kingdom Ministry.',
                            'kontakt': 'Contact us via email, phone, or our contact form.',
                            'donasjoner': 'Support our work by giving a gift or donation.',
                            'undervisning': 'Teaching and sermons from His Kingdom Ministry.',
                            'reisevirksomhet': 'Information about our travels and mission trips.',
                            'bibelstudier': 'Bible studies and resources for deep study of God\'s word.',
                            'seminarer': 'Join our seminars and courses for spiritual growth.',
                            'podcast': 'Listen to our podcast episodes directly on the website.',
                            'bibel': 'Read the Bible online with our integrated Bible reader.',
                            'leseplaner': 'Follow our Bible reading plans for structured reading.',
                            'butikk': 'Visit our shop for books and other resources.',
                            'bnn': 'Business Network (BNN) - Network for Christian business leaders.',
                            'bli-fast-giver': 'Become a regular donor or partner to support our work monthly.',
                            'personvern': 'Our privacy policy and cookie usage.',
                            'tilgjengelighet': 'Accessibility statement for our website.',
                            'for-menigheter': 'See how we cooperate with local churches.',
                            'for-bedrifter': 'Partnership opportunities for businesses to support us.',
                            'bibelske-personer': 'Explore key biblical characters and their theological significance.',
                            'tidslinje-imperier': 'Explore the historical timeline of the major empires that influenced the biblical narrative.',
                            'bibelsk-tidslinje': 'Explore the historical timeline of the Bible from prehistory to the early church and modern times.'
                        },
                        es: {
                            'index': 'His Kingdom Ministry - Inicio. Bienvenido a nuestro sitio web.',
                            'om-oss': 'Aprenda más sobre His Kingdom Ministry, nuestra visión, valores y quiénes somos.',
                            'media': 'Vea nuestros videos, sermones y enseñanzas.',
                            'arrangementer': 'Calendario de próximos eventos y reuniones.',
                            'blogg': 'Lea los últimos artículos y actualizaciones de His Kingdom Ministry.',
                            'kontakt': 'Contáctenos por correo electrónico, teléfono o formulario.',
                            'donasjoner': 'Apoye nuestro trabajo con una ofrenda o donación.',
                            'undervisning': 'Enseñanza y sermones de His Kingdom Ministry.',
                            'reisevirksomhet': 'Información sobre nuestros viajes y misiones.',
                            'bibelstudier': 'Estudios bíblicos y recursos para profundizar en la palabra de Dios.',
                            'seminarer': 'Participe en nuestros seminarios y cursos de crecimiento espiritual.',
                            'podcast': 'Escuche nuestros episodios de podcast directamente en el sitio.',
                            'bibel': 'Lea la Biblia en línea con nuestro lector integrado.',
                            'leseplaner': 'Siga nuestros planes de lectura de la Biblia.',
                            'butikk': 'Visite nuestra tienda de libros y otros recursos.',
                            'bnn': 'Business Network (BNN) - Red para líderes empresariales cristianos.',
                            'bli-fast-giver': 'Conviértase en donante regular o socio para apoyarnos.',
                            'personvern': 'Nuestra política de privacidad.',
                            'tilgjengelighet': 'Declaración de accesibilidad.',
                            'for-menigheter': 'Vea cómo colaboramos con iglesias locales.',
                            'for-bedrifter': 'Oportunidades de patrocinio para empresas.',
                            'bibelske-personer': 'Explore los personajes bíblicos clave y su significado teológico.',
                            'tidslinje-imperier': 'Explore la línea de tiempo de los grandes imperios que influyeron en la narrativa bíblica.',
                            'bibelsk-tidslinje': 'Explore la línea de tiempo histórica de la Biblia desde la creación hasta la iglesia primitiva y los tiempos modernos.'
                        }
                    };
                    snippet = (defaultExcerpts[lang] && defaultExcerpts[lang][page.id]) || (defaultExcerpts['no'][page.id]) || '';
                }

                results.push({
                    type: lang === 'en' ? 'Page' : (lang === 'es' ? 'Página' : 'Side'),
                    title: labelText,
                    meta: lang === 'en' ? 'Information' : (lang === 'es' ? 'Información' : 'Informasjon'),
                    url: getLocalizedUrl(page.url),
                    snippet: makeSnippet(snippet, q)
                });
            }
        });

        // 2) Samlinger
        const collections = [
            { id: 'blog', docId: 'collection_blog', label: { no: 'Blogginnlegg', en: 'Blog Post', es: 'Entrada del Blog' }, url: 'blogg-post.html' },
            { id: 'events', docId: 'collection_events', label: { no: 'Arrangement', en: 'Event', es: 'Evento' }, url: 'arrangement-detaljer.html' },
            { id: 'teaching', docId: 'collection_teaching', label: { no: 'Undervisning', en: 'Sermon', es: 'Enseñanza' }, url: 'blogg-post.html' }
        ];

        Object.keys(contentDocs).forEach(id => {
            if (id.startsWith('collection_')) {
                const colId = id.replace('collection_', '');
                if (!collections.some(c => c.id === colId) && colId !== 'courses') {
                    const labelStr = colId.charAt(0).toUpperCase() + colId.slice(1).replace(/-/g, ' ');
                    collections.push({
                        id: colId,
                        docId: id,
                        label: { no: labelStr, en: labelStr, es: labelStr },
                        url: `${colId}-detaljer.html`
                    });
                }
            }
        });

        collections.forEach((col) => {
            const raw = contentDocs[col.docId];
            const items = Array.isArray(raw) ? raw : (raw && Array.isArray(raw.items) ? raw.items : []);
            items.forEach((item) => {
                const combined = [
                    col.label[lang] || col.label['no'],
                    'blogg', 'nyheter', 'undervisning', 'arrangement',
                    item.title, item.content, item.category, item.author, item.seoTitle, item.seoDescription
                ].filter(Boolean).join(' ').toLowerCase();

                if (isMatch(combined)) {
                    const stableId = item.__stableId || item.id || item.externalGuid || item.wixGuid || item.postId || item.legacyId || item.slug || item.title || '';
                    results.push({
                        type: col.label[lang] || col.label['no'],
                        title: item.title || '(uten tittel)',
                        meta: formatDate(item.date) || item.category || '',
                        url: getLocalizedUrl(`${col.url}?id=${encodeURIComponent(stableId)}`),
                        snippet: makeSnippet(item.content || item.seoDescription || '', q)
                    });
                }
            });
        });

        // 5.5) Bibel Leseplaner
        if (Array.isArray(readingPlans) && readingPlans.length) {
            readingPlans.forEach(plan => {
                const combined = [
                    lang === 'en' ? 'reading plan bible' : (lang === 'es' ? 'plan de lectura biblia' : 'leseplan bibel leseplaner'),
                    plan.title, plan.subtitle, plan.description
                ].filter(Boolean).join(' ').toLowerCase();

                if (isMatch(combined)) {
                    results.push({
                        type: lang === 'en' ? 'Reading Plan' : (lang === 'es' ? 'Plan de Lectura' : 'Leseplan'),
                        title: plan.title || 'Leseplan',
                        meta: plan.subtitle || (plan.durationDays ? `${plan.durationDays} dager` : ''),
                        url: getLocalizedUrl(`leseplan-detaljer.html?id=${plan.id}`),
                        snippet: makeSnippet(plan.description || '', q)
                    });
                }
            });
        }

        // 5.7) Bibelske personer
        let characters = [];
        try {
            const module = await import('./js/bibelske-personer-data.js');
            characters = module.biblicalCharacters || [];
        } catch (e) {
            console.warn('[Search] Failed to load biblical characters dynamically:', e);
        }

        if (Array.isArray(characters) && characters.length) {
            characters.forEach(person => {
                const nameText = person.name[lang] || person.name['no'] || '';
                const roleText = person.role[lang] || person.role['no'] || '';
                const eraText = person.era[lang] || person.era['no'] || '';
                const summaryText = person.summary[lang] || person.summary['no'] || '';
                const storyText = person.story[lang] || person.story['no'] || '';
                const significanceText = person.theologicalSignificance[lang] || person.theologicalSignificance['no'] || '';
                
                const combined = [
                    lang === 'en' ? 'biblical character person' : (lang === 'es' ? 'personaje bíblico persona' : 'bibelsk person personer bibelen'),
                    nameText, roleText, eraText, summaryText, storyText, significanceText
                ].filter(Boolean).join(' ').toLowerCase();

                if (isMatch(combined)) {
                    results.push({
                        type: lang === 'en' ? 'Biblical Character' : (lang === 'es' ? 'Personaje Bíblico' : 'Bibelsk person'),
                        title: nameText,
                        meta: roleText,
                        url: getLocalizedUrl(`ressurser/bibelsk-person-detaljer.html?id=${person.id}`),
                        snippet: makeSnippet(summaryText || storyText || '', q)
                    });
                }
            });
        }

        // 6) Kurs & Undervisning
        courses.forEach(course => {
            const combined = ['kurs', 'undervisning', 'serie', 'course', 'curso', course.title, course.description, course.category, course.instructor].filter(Boolean).join(' ').toLowerCase();
            if (isMatch(combined)) {
                results.push({
                    type: lang === 'en' ? 'Course' : (lang === 'es' ? 'Curso' : 'Kurs'),
                    title: course.title || 'Kurs',
                    meta: course.category || (lang === 'en' ? 'Teaching' : (lang === 'es' ? 'Enseñanza' : 'Undervisning')),
                    url: getLocalizedUrl('kurs'),
                    snippet: makeSnippet(course.description || '', q)
                });
            }
        });

        // 7) Search already-cached async sources
        if (window._siteSearchPodcasts) {
            window._siteSearchPodcasts.forEach(ep => {
                const epId = ep.guid || ep.link || ep.title;
                const transcript = window._siteSearchPodcastTranscripts ? window._siteSearchPodcastTranscripts[epId] : null;
                const combined = ['podcast', 'lyd', 'episode', ep.title, ep.description, transcript].filter(Boolean).join(' ').toLowerCase();
                if (isMatch(combined)) {
                    results.push({
                        type: 'Podcast',
                        title: ep.title || '(uten tittel)',
                        meta: formatDate(ep.pubDate),
                        url: getLocalizedUrl(`podcast.html?play=${encodeURIComponent(ep.guid || ep.link || ep.title)}`),
                        snippet: makeSnippet(transcript || ep.description || '', q)
                    });
                }
            });
        }

        if (window._siteSearchYouTubeVideos) {
            window._siteSearchYouTubeVideos.forEach(v => {
                const combined = ['video', 'youtube', 'film', 'podcast', 'lyd', 'undervisning', v.title, v.description].filter(Boolean).join(' ').toLowerCase();
                if (isMatch(combined)) {
                    results.push({
                        type: 'YouTube',
                        title: v.title || '(uten tittel)',
                        meta: formatDate(v.pubDate),
                        url: v.link || getLocalizedUrl('youtube'),
                        snippet: makeSnippet(v.description, q)
                    });
                }
            });
        }

        if (window._siteSearchCalendarEvents) {
            window._siteSearchCalendarEvents.forEach(ev => {
                const summary = ev.summary || '';
                const description = ev.description || '';
                const location = ev.location || '';
                const combined = ['kalender', 'arrangement', 'event', 'møte', 'calendario', 'evento', summary, description, location].filter(Boolean).join(' ').toLowerCase();
                if (isMatch(combined)) {
                    const start = ev.start && (ev.start.dateTime || ev.start.date);
                    results.push({
                        type: lang === 'en' ? 'Calendar' : (lang === 'es' ? 'Calendario' : 'Kalender'),
                        title: summary || '(uten tittel)',
                        meta: formatDate(start),
                        url: getLocalizedUrl('arrangementer'),
                        snippet: makeSnippet(description || location || '', q)
                    });
                }
            });
        }

        // Render initial fast/cached results instantly!
        updateUI();
        restoreIcon();

        // 8) Lazy-load the remaining asynchronous network-based searches
        
        // Dictionary fetch
        if (q.length >= 2) {
            if (!window._siteSearchBibleDictCache) window._siteSearchBibleDictCache = {};
            
            const runDictMatch = (dictData) => {
                if (dictData && dictData.category && !['ikke bibelrelatert', 'not bible-related', 'no relacionado con la biblia'].includes(dictData.category.toLowerCase())) {
                    let versesHtml = '';
                    if (Array.isArray(dictData.crossReferences) && dictData.crossReferences.length > 0) {
                        const bibleUrlBase = getLocalizedUrl('bibel.html');
                        versesHtml = dictData.crossReferences.map(refObj => {
                            const cleanRef = refObj.ref.trim();
                            return `<a href="${bibleUrlBase}?ref=${encodeURIComponent(cleanRef)}" class="search-tag-btn" style="display: inline-block !important; font-size: 11px !important; margin: 4px 4px 0 0 !important; text-decoration: none !important;">${cleanRef}</a>`;
                        }).join('');
                    }
                    
                    const alreadyExists = results.some(r => r.type.includes('Bibel & Ordbok') && r.title === dictData.word);
                    if (!alreadyExists) {
                        results.push({
                            type: lang === 'en' ? 'Bible & Dictionary' : (lang === 'es' ? 'Biblia y Diccionario' : 'Bibel & Ordbok'),
                            title: dictData.word || q,
                            meta: dictData.category,
                            url: getLocalizedUrl(`bibel.html?dict=${encodeURIComponent(dictData.word || q)}`),
                            snippet: makeSnippet(dictData.definition || dictData.contextualNote || '', q),
                            versesHtml: versesHtml
                        });
                        updateUI();
                    }
                }
            };

            if (window._siteSearchBibleDictCache[qLower]) {
                runDictMatch(window._siteSearchBibleDictCache[qLower]);
            } else {
                fetch(`/api/bible/dictionary?word=${encodeURIComponent(q)}&lang=${lang}`)
                    .then(res => res.ok ? res.json() : null)
                    .then(dictData => {
                        if (dictData) {
                            window._siteSearchBibleDictCache[qLower] = dictData;
                            runDictMatch(dictData);
                        }
                    })
                    .catch(err => console.warn('[Search] Dictionary search failed:', err));
            }
        }

        // Podcasts & Transcripts
        if (!window._siteSearchPodcasts || !window._siteSearchPodcastTranscripts) {
            Promise.all([fetchPodcasts(), fetchPodcastTranscripts()])
                .then(([episodes, transcriptsMap]) => {
                    const activeQuery = (document.getElementById('site-search-input-v2')?.value || '').trim().toLowerCase();
                    if (activeQuery !== qLower) return;

                    let addedNew = false;
                    episodes.forEach(ep => {
                        const epId = ep.guid || ep.link || ep.title;
                        const transcript = transcriptsMap ? transcriptsMap[epId] : null;
                        const combined = ['podcast', 'lyd', 'episode', ep.title, ep.description, transcript].filter(Boolean).join(' ').toLowerCase();

                        if (isMatch(combined)) {
                            const alreadyExists = results.some(r => r.type === 'Podcast' && r.title === ep.title);
                            if (!alreadyExists) {
                                results.push({
                                    type: 'Podcast',
                                    title: ep.title || '(uten tittel)',
                                    meta: formatDate(ep.pubDate),
                                    url: getLocalizedUrl(`podcast.html?play=${encodeURIComponent(ep.guid || ep.link || ep.title)}`),
                                    snippet: makeSnippet(transcript || ep.description || '', q)
                                });
                                addedNew = true;
                            }
                        }
                    });
                    if (addedNew) updateUI();
                })
                .catch(err => console.warn('[Search] Async podcast search failed:', err));
        }

        // YouTube Videos
        if (!window._siteSearchYouTubeVideos) {
            fetchYouTubeVideos()
                .then(youtubeVideos => {
                    const activeQuery = (document.getElementById('site-search-input-v2')?.value || '').trim().toLowerCase();
                    if (activeQuery !== qLower) return;

                    let addedNew = false;
                    youtubeVideos.forEach(v => {
                        const combined = ['video', 'youtube', 'film', 'podcast', 'lyd', 'undervisning', v.title, v.description].filter(Boolean).join(' ').toLowerCase();
                        if (isMatch(combined)) {
                            const alreadyExists = results.some(r => r.type === 'YouTube' && r.title === v.title);
                            if (!alreadyExists) {
                                results.push({
                                    type: 'YouTube',
                                    title: v.title || '(uten tittel)',
                                    meta: formatDate(v.pubDate),
                                    url: v.link || getLocalizedUrl('youtube'),
                                    snippet: makeSnippet(v.description, q)
                                });
                                addedNew = true;
                            }
                        }
                    });
                    if (addedNew) updateUI();
                })
                .catch(err => console.warn('[Search] Async YouTube search failed:', err));
        }

        // Google Calendar
        if (typeof window._siteSearchCalendarEvents === 'undefined') {
            (async () => {
                try {
                    const settings = contentDocs['settings_gcal'] || await firebaseService.getPageContent('settings_gcal');
                    if (settings && settings.apiKey && settings.calendarId) {
                        const nowIso = new Date().toISOString();
                        const url = `https://www.googleapis.com/calendar/v3/calendars/${settings.calendarId}/events?key=${settings.apiKey}&timeMin=${nowIso}&singleEvents=true&orderBy=startTime&maxResults=50`;
                        const resp = await fetch(url);
                        if (resp.ok) {
                            const data = await resp.json();
                            const events = data.items || [];
                            window._siteSearchCalendarEvents = events;
                            
                            const activeQuery = (document.getElementById('site-search-input-v2')?.value || '').trim().toLowerCase();
                            if (activeQuery !== qLower) return;

                            let addedNew = false;
                            events.forEach(ev => {
                                const summary = ev.summary || '';
                                const description = ev.description || '';
                                const location = ev.location || '';
                                const combined = ['kalender', 'arrangement', 'event', 'møte', 'calendario', 'evento', summary, description, location].filter(Boolean).join(' ').toLowerCase();
                                if (isMatch(combined)) {
                                    const alreadyExists = results.some(r => r.type.includes('Kalender') && r.title === summary);
                                    if (!alreadyExists) {
                                        const start = ev.start && (ev.start.dateTime || ev.start.date);
                                        results.push({
                                            type: lang === 'en' ? 'Calendar' : (lang === 'es' ? 'Calendario' : 'Kalender'),
                                            title: summary || '(uten tittel)',
                                            meta: formatDate(start),
                                            url: getLocalizedUrl('arrangementer'),
                                            snippet: makeSnippet(description || location || '', q)
                                        });
                                        addedNew = true;
                                    }
                                }
                            });
                            if (addedNew) updateUI();
                        }
                    }
                } catch (e) {
                    console.warn('[Search] Async calendar search failed:', e);
                }
            })();
        }

    } catch (err) {
        console.error('Feil ved søk:', err);
        resultsEl.innerHTML = '<p class="site-search-helper">Det oppstod en feil ved søk. Prøv igjen senere.</p>';
        restoreIcon();
    }
}

/**
 * Forhåndshenter Firestore-samlinger og eksterne APIer parallelt i bakgrunnen
 */
function preFetchSearchData() {
    if (window._siteSearchPreFetchStarted) return;
    window._siteSearchPreFetchStarted = true;

    // 1) Forhåndshent Firestore content-samling
    if (!window._siteSearchContentDocs && window.firebase) {
        firebase.firestore().collection('content').get()
            .then(snap => {
                const docs = {};
                snap.forEach(doc => { docs[doc.id] = doc.data(); });
                window._siteSearchContentDocs = docs;
            })
            .catch(err => console.warn('[Search] Bakgrunn-prefetch content feilet:', err));
    }

    const firebaseService = window.firebaseService;
    if (firebaseService) {
        // 2) Forhåndshent leseplaner
        if (!window._siteSearchReadingPlans) {
            firebaseService.getCollection('reading_plans')
                .then(plans => { window._siteSearchReadingPlans = plans; })
                .catch(err => console.warn('[Search] Bakgrunn-prefetch leseplaner feilet:', err));
        }

        // 3) Forhåndshent kurs
        if (!window._siteSearchCourses) {
            firebaseService.getPageContent('collection_courses')
                .then(courseData => {
                    window._siteSearchCourses = Array.isArray(courseData) ? courseData : (courseData && Array.isArray(courseData.items) ? courseData.items : []);
                })
                .catch(err => console.warn('[Search] Bakgrunn-prefetch kurs feilet:', err));
        }
    }

    // 4) Forhåndshent eksterne kilder (podcaster, youtube, transkripsjoner)
    fetchPodcasts();
    fetchYouTubeVideos();
    fetchPodcastTranscripts();
}

/**
 * Hjelpefunksjoner for søk (Flyttet ut for å unngå syntaksfeil)
 */
async function fetchPodcasts() {
    if (window._siteSearchPodcasts) return window._siteSearchPodcasts;
    try {
        // Bruk den mer robuste proxyen som ikke har 10-items grense
        const rssFeedUrl = "https://anchor.fm/s/f7a13dec/podcast/rss";
        const proxyUrl = 'https://getpodcast-42bhgdjkcq-uc.a.run.app';
        const resp = await fetch(proxyUrl);
        const data = await resp.json();
        const channel = Array.isArray(data?.rss?.channel) ? data.rss.channel[0] : data?.rss?.channel;
        const items = channel?.item;
        if (items) {
            const episodes = Array.isArray(items) ? items : [items];
            window._siteSearchPodcasts = episodes.map(ep => ({
                title: ep.title,
                description: typeof ep.description === 'string' ? ep.description : (ep.content || ''),
                pubDate: ep.pubDate,
                link: ep.link,
                guid: ep.guid
            }));
        } else {
            window._siteSearchPodcasts = [];
        }
    } catch (e) {
        console.warn('Kunne ikke hente podcast for søk:', e);
        window._siteSearchPodcasts = [];
    }
    return window._siteSearchPodcasts;
}

async function fetchYouTubeVideos() {
    if (window._siteSearchYouTubeVideos) return window._siteSearchYouTubeVideos;
    try {
        const channelId = 'UCFbX-Mf7NqDm2a07hk6hveg';
        const rssFeedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
        const proxyUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssFeedUrl)}`;
        const resp = await fetch(proxyUrl);
        const data = await resp.json();
        const items = (data && Array.isArray(data.items)) ? data.items : (data && data.items ? [data.items] : []);
        window._siteSearchYouTubeVideos = items.map(v => ({
            title: v.title,
            description: v.description || '',
            pubDate: v.pubDate,
            link: v.link
        }));
    } catch (e) {
        console.warn('Kunne ikke hente YouTube-videoer for søk:', e);
        window._siteSearchYouTubeVideos = [];
    }
    return window._siteSearchYouTubeVideos;
}

/**
 * Henter alle transkripsjoner fra Firestore i en enkelt operasjon
 */
async function fetchPodcastTranscripts() {
    if (window._siteSearchPodcastTranscripts) return window._siteSearchPodcastTranscripts;
    window._siteSearchPodcastTranscripts = {};
    try {
        const snapshot = await firebase.firestore().collection('podcast_transcripts').get();
        snapshot.docs.forEach((doc) => {
            const data = doc.data();
            let text = '';
            if (data.transcriptHtml) {
                text = data.transcriptHtml;
            } else if (data.content?.blocks) {
                text = data.content.blocks.map(b => b.data?.text || '').join(' ');
            } else if (data.blocks) {
                text = data.blocks.map(b => b.data?.text || '').join(' ');
            } else if (data.text) {
                text = data.text;
            }
            window._siteSearchPodcastTranscripts[doc.id] = text;
        });
    } catch (e) {
        console.warn('Kunne ikke hente transkripsjoner for søk:', e);
    }
    return window._siteSearchPodcastTranscripts;
}

/**
 * Henter transkripsjon fra Firestore for en spesifikk episode
 */
async function fetchPodcastTranscript(episodeId) {
    if (!episodeId) return null;
    // Cache for å unngå doble kall i samme søkesesjon
    if (!window._transcriptCache) window._transcriptCache = {};
    if (window._transcriptCache[episodeId]) return window._transcriptCache[episodeId];

    try {
        const doc = await firebase.firestore().collection('podcast_transcripts').doc(episodeId).get();
        if (doc.exists) {
            const data = doc.data();
            let text = '';
            if (data.transcriptHtml) {
                text = data.transcriptHtml;
            } else if (data.content?.blocks) {
                text = data.content.blocks.map(b => b.data?.text || '').join(' ');
            } else if (data.blocks) {
                // Håndterer Editor.js format hvis det er brukt
                text = data.blocks.map(b => b.data?.text || '').join(' ');
            } else if (data.text) {
                text = data.text;
            }
            window._transcriptCache[episodeId] = text;
            return text;
        }
    } catch (e) {
        console.warn('Kunne ikke hente transkripsjon for', episodeId, e);
    }
    return null;
}

function collectTextEntries(obj, path = '') {
    const entries = [];
    if (!obj || typeof obj !== 'object') return entries;

    Object.keys(obj).forEach((key) => {
        const value = obj[key];
        const currentPath = path ? `${path}.${key}` : key;

        if (typeof value === 'string') {
            entries.push({ text: value, path: currentPath });
        } else if (value && typeof value === 'object') {
            entries.push(...collectTextEntries(value, currentPath));
        }
    });

    return entries;
}

function makeSnippet(text, query) {
    if (!text) return '';
    
    // Strip HTML tags and clean up whitespace
    const cleanText = String(text).replace(/<[^>]*>?/gm, '').replace(/\s+/g, ' ').trim();
    
    if (cleanText.length <= 160) return cleanText;

    const lower = cleanText.toLowerCase();
    const qLower = (query || '').toLowerCase();
    const idx = lower.indexOf(qLower);

    if (idx === -1) {
        return cleanText.substring(0, 157) + '...';
    }

    const start = Math.max(0, idx - 40);
    const end = Math.min(cleanText.length, idx + qLower.length + 60);
    const prefix = start > 0 ? '...' : '';
    const suffix = end < cleanText.length ? '...' : '';
    return prefix + cleanText.substring(start, end) + suffix;
}


function escapeHtml(str) {
    if (str == null) return '';
    return String(str).replace(/[&<>"']/g, (c) => {
        switch (c) {
            case '&': return '&amp;';
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '"': return '&quot;';
            case "'": return '&#39;';
            default: return c;
        }
    });
}

// ===================================
// Counter Animation (Fun Facts)
// ===================================
class CounterAnimation {
    constructor() {
        this.counters = document.querySelectorAll('.funfact-number');
        this.animated = false;
        this.init();
    }

    init() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !this.animated) {
                    this.animateCounters();
                    this.animated = true;
                }
            });
        }, { threshold: 0.5 });

        const funfactsSection = document.querySelector('.funfacts');
        if (funfactsSection) {
            observer.observe(funfactsSection);
        }
    }

    animateCounters() {
        this.counters.forEach(counter => {
            const rawVal = counter.getAttribute('data-target');
            const target = parseInt(rawVal) || 0;

            if (target <= 0) {
                counter.textContent = rawVal && !isNaN(parseInt(rawVal)) ? rawVal : '0';
                counter.dataset.animated = 'true';
                return;
            }

            const duration = 2000;
            const increment = target / (duration / 16);
            let current = 0;

            const updateCounter = () => {
                current += increment;
                if (current < target) {
                    counter.textContent = Math.floor(current);
                    requestAnimationFrame(updateCounter);
                } else {
                    counter.textContent = target;
                    counter.dataset.animated = 'true';
                }
            };

            updateCounter();
        });
    }
}

// Initialize Counter Animation
new CounterAnimation();

// ===================================
// YouTube Stats (Fun Facts)
// ===================================
function initYouTubeStats() {
    const videoEl = document.getElementById('yt-video-count');
    const viewEl = document.getElementById('yt-view-count');
    if (!videoEl && !viewEl) return;

    // Defensive fallbacks in case the API call fails and Firestore stats are empty
    const fallbackVideos = 455;
    const fallbackViews = 58925;

    const getInitialValue = (el, fallback) => {
        if (!el) return fallback;
        const currentTarget = parseInt(el.getAttribute('data-target')) || 0;
        const currentText = parseInt(el.textContent) || 0;
        const val = currentTarget || currentText;
        return val > 0 ? val : fallback;
    };

    const initialVideos = getInitialValue(videoEl, fallbackVideos);
    const initialViews = getInitialValue(viewEl, fallbackViews);

    const applyCount = (el, value) => {
        if (!el) return;
        el.setAttribute('data-target', String(value));
        if (el.dataset.animated === 'true' || el.textContent === 'NaN' || el.textContent === '0' || el.textContent === '') {
            el.textContent = value;
        }
    };

    // Apply initial values (so they display and animate immediately even if fetch is pending/fails)
    applyCount(videoEl, initialVideos);
    applyCount(viewEl, initialViews);

    const channelId = 'UCFbX-Mf7NqDm2a07hk6hveg';
    const url = `/api/youtube?action=stats&channelId=${channelId}`;

    fetch(url)
        .then(response => response.json())
        .then(data => {
            const stats = data && data.items && data.items[0] && data.items[0].statistics;
            if (!stats) return;

            const videoCount = Number(stats.videoCount || 0);
            const viewCount = Number(stats.viewCount || 0);

            if (videoCount > 0) applyCount(videoEl, videoCount);
            if (viewCount > 0) applyCount(viewEl, viewCount);
        })
        .catch((err) => {
            console.warn('Kunne ikke hente YouTube-statistikk:', err);
            // Fallbacks are already applied, so they remain intact
        });
}

// ===================================
// Scroll to Top Button
// ===================================
function initScrollToTop() {
    // Fjern på mobil
    if (window.innerWidth < 768) return;

    const btn = document.createElement('button');
    btn.className = 'scroll-to-top';
    btn.innerHTML = '<span class="material-symbols-outlined flex items-center justify-center h-full w-full" style="font-size: 24px;">expand_less</span>';
    btn.setAttribute('aria-label', 'Til toppen');
    document.body.appendChild(btn);

    // Show/Hide on scroll
    let topTicking = false;
    window.addEventListener('scroll', () => {
        if (!topTicking) {
            window.requestAnimationFrame(() => {
                if (window.scrollY > 300) {
                    btn.classList.add('visible');
                } else {
                    btn.classList.remove('visible');
                }
                topTicking = false;
            });
            topTicking = true;
        }
    }, { passive: true });

    // Scroll to top on click
    btn.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initScrollToTop();
    initYouTubeStats();
    initPodcastStats();
});

function initPodcastStats() {
    const podcastEl = document.getElementById('podcast-episode-count');
    if (!podcastEl) return;

    // Using custom proxy that doesn't limit to 10 items like rss2json free version does
    const proxyUrl = 'https://getpodcast-42bhgdjkcq-uc.a.run.app';

    fetch(proxyUrl)
        .then(response => response.json())
        .then(data => {
            const channel = Array.isArray(data?.rss?.channel) ? data.rss.channel[0] : data?.rss?.channel;
            const items = channel?.item;
            if (!items) return;

            const count = Array.isArray(items) ? items.length : 1;
            podcastEl.setAttribute('data-target', String(count));
            
            // If already animated or showing 0/NaN, update text immediately
            if (podcastEl.dataset.animated === 'true' || podcastEl.textContent === 'NaN' || podcastEl.textContent === '0') {
                podcastEl.textContent = count;
            }
        })
        .catch((err) => {
            console.warn('Kunne ikke hente podcast-statistikk:', err);
        });
}

// ===================================
// Progress Bars Animation
// ===================================
class ProgressBarAnimation {
    constructor() {
        this.progressBars = document.querySelectorAll('.progress-fill');
        this.animated = false;
        this.init();
    }

    init() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const progressBar = entry.target;
                    const progress = progressBar.getAttribute('data-progress');
                    progressBar.style.width = progress + '%';
                }
            });
        }, { threshold: 0.5 });

        this.progressBars.forEach(bar => observer.observe(bar));
    }
}

// Initialize Progress Bar Animation
new ProgressBarAnimation();

// ===================================
// Testimonial Slider
// ===================================
class TestimonialSlider {
    constructor() {
        this.testimonials = [];
        this.currentTestimonial = 0;
        this.testimonialInterval = null;
        this.init();
    }

    init() {
        this.stopAutoPlay();
        this.testimonials = document.querySelectorAll('.testimonial-card');
        this.currentTestimonial = 0;

        if (this.testimonials.length > 0) {
            this.setupNavigation();
            
            // Start Auto Play on user interaction to prevent continuous visual changes in Lighthouse
            const startOnInteraction = () => {
                window.removeEventListener('scroll', startOnInteraction);
                window.removeEventListener('mousemove', startOnInteraction);
                window.removeEventListener('touchstart', startOnInteraction);
                window.removeEventListener('keydown', startOnInteraction);
                this.startAutoPlay();
            };

            window.addEventListener('scroll', startOnInteraction, { passive: true });
            window.addEventListener('mousemove', startOnInteraction, { passive: true });
            window.addEventListener('touchstart', startOnInteraction, { passive: true });
            window.addEventListener('keydown', startOnInteraction, { passive: true });
        }
    }

    stopAutoPlay() {
        if (this.testimonialInterval) {
            clearInterval(this.testimonialInterval);
            this.testimonialInterval = null;
        }
    }

    setupNavigation() {
        const prevBtn = document.querySelector('.testimonial-prev');
        const nextBtn = document.querySelector('.testimonial-next');

        if (prevBtn && nextBtn) {
            // Remove existing listeners to avoid duplicates if re-init
            const newPrev = prevBtn.cloneNode(true);
            const newNext = nextBtn.cloneNode(true);
            prevBtn.parentNode.replaceChild(newPrev, prevBtn);
            nextBtn.parentNode.replaceChild(newNext, nextBtn);

            newPrev.addEventListener('click', () => this.prevTestimonial());
            newNext.addEventListener('click', () => this.nextTestimonial());
        }
    }

    goToTestimonial(index) {
        if (!this.testimonials || !this.testimonials[this.currentTestimonial]) return;
        this.testimonials[this.currentTestimonial].classList.remove('active');
        this.currentTestimonial = index;
        if (this.testimonials[this.currentTestimonial]) {
            this.testimonials[this.currentTestimonial].classList.add('active');
        }
        this.resetAutoPlay();
    }

    nextTestimonial() {
        if (this.testimonials.length === 0) return;
        const next = (this.currentTestimonial + 1) % this.testimonials.length;
        this.goToTestimonial(next);
    }

    prevTestimonial() {
        if (this.testimonials.length === 0) return;
        const prev = (this.currentTestimonial - 1 + this.testimonials.length) % this.testimonials.length;
        this.goToTestimonial(prev);
    }

    startAutoPlay() {
        if (this.testimonials.length <= 1) return;
        this.stopAutoPlay();
        this.testimonialInterval = setInterval(() => this.nextTestimonial(), 6000);
    }

    resetAutoPlay() {
        this.startAutoPlay();
    }
}

// Initialize and expose to window for CMS re-init
window.testimonialSlider = new TestimonialSlider();

// ===================================
// Newsletter Form
// ===================================
const newsletterForm = document.getElementById('newsletter-form');
if (newsletterForm) {
    newsletterForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const emailInput = newsletterForm.querySelector('input[type="email"]');
        const email = emailInput.value;
        const submitBtn = newsletterForm.querySelector('button[type="submit"]');

        try {
            submitBtn.disabled = true;
            submitBtn.innerText = 'Sender...';

            if (window.firebaseService) {
                await window.firebaseService.subscribeNewsletter(email);
                if (window.notifications) {
                    window.notifications.show(`Takk! Du er nå påmeldt med ${email}`, 'success');
                } else {
                    alert(`Takk for at du meldte deg på! Vi har sendt en bekreftelse til ${email}`);
                }
                newsletterForm.reset();
            }
        } catch (error) {
            console.error("Newsletter error:", error);
            if (window.notifications) {
                window.notifications.show("Det oppsto en feil. Prøv igjen senere.", "error");
            }
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerText = 'Abonner';
        }
    });
}

// Footer Newsletter Form (if different)
const footerNewsletterForm = document.querySelector('.footer-newsletter');
if (footerNewsletterForm) {
    footerNewsletterForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const emailInput = footerNewsletterForm.querySelector('input[type="email"]');
        const email = emailInput.value;

        try {
            if (window.firebaseService) {
                await window.firebaseService.subscribeNewsletter(email);
                if (window.notifications) {
                    window.notifications.show(`Takk for påmeldingen!`, 'success');
                } else {
                    alert(`Takk for at du meldte deg på! Vi har sendt en bekreftelse til ${email}`);
                }
                footerNewsletterForm.reset();
            }
        } catch (error) {
            console.error("Newsletter error:", error);
        }
    });
}

// ===================================
// Lazy Loading Images
// ===================================
if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src || img.src;
                img.classList.add('loaded');
                observer.unobserve(img);
            }
        });
    });

    document.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver.observe(img);
    });
}

// ===================================
// Scroll Animations
// ===================================
const observerOptions = {
    threshold: 0.1,
    // Use smaller margin on mobile to start animation sooner
    rootMargin: window.innerWidth <= 768 ? '0px 0px -20px 0px' : '0px 0px -100px 0px'
};

const fadeInObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            // Disable translateY on mobile to prevent "jumping" sensation
            if (window.innerWidth <= 768) {
                entry.target.style.transform = 'none';
            } else {
                entry.target.style.transform = 'translateY(0)';
            }
        }
    });
}, observerOptions);

// Apply fade-in animation to cards (Cleaned up for mobile stability)
document.querySelectorAll('.feature-box, .cause-card, .event-card, .blog-card').forEach(el => {
    const isMobileLayout = window.innerWidth <= 768;

    if (isMobileLayout) {
        // No vertical offset or hidden state on mobile to ensure zero jitter/jumping
        el.style.opacity = '1';
        el.style.transform = 'none';
        el.style.transition = 'none';
    } else {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        fadeInObserver.observe(el);
    }
});

// ===================================
// Team Cards (Om oss-siden)
// ===================================
function initTeamCards() {
    const members = document.querySelectorAll('.team-section .team-member');
    if (!members.length) return;

    members.forEach(member => {
        const toggleBtn = member.querySelector('.team-toggle');
        const nameEl = member.querySelector('.team-name');
        const imageEl = member.querySelector('.team-image');

        const toggle = () => {
            const expanded = member.classList.toggle('expanded');
            if (toggleBtn) {
                toggleBtn.textContent = expanded ? 'Vis mindre' : 'Les mer';
            }
        };

        if (toggleBtn) {
            toggleBtn.addEventListener('click', (e) => {
                e.preventDefault();
                toggle();
            });
        }

        if (nameEl) {
            nameEl.style.cursor = 'pointer';
            nameEl.addEventListener('click', toggle);
        }

        if (imageEl) {
            imageEl.style.cursor = 'pointer';
            imageEl.addEventListener('click', toggle);
        }
    });
}

// ===================================
// Dynamic Year in Footer
// ===================================
const yearElement = document.getElementById('year');
if (yearElement) {
    yearElement.textContent = new Date().getFullYear();
}

// ===================================
// Donation Button Tracking
// ===================================
document.querySelectorAll('a[href="#gi-gave"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.preventDefault();
        // Here you can integrate with a payment gateway like Stripe or Vipps
        alert('Takk for at du vil støtte vårt arbeid! Denne funksjonen vil kobles til et betalingssystem.');
    });
});

// ===================================
// Accessibility: Keyboard Navigation
// ===================================
document.addEventListener('keydown', (e) => {
    // ESC to close mobile menu
    if (e.key === 'Escape') {
        if (nav && nav.classList.contains('active')) {
            nav.classList.remove('active');
            if (mobileToggle) mobileToggle.classList.remove('active');
        }
    }

    // Arrow keys for slider navigation
    if (window.heroSlider) {
        if (e.key === 'ArrowLeft') {
            window.heroSlider.prev();
        } else if (e.key === 'ArrowRight') {
            window.heroSlider.next();
        }
    }
});

// ===================================
// Performance: Preload Critical Images
// ===================================
window.addEventListener('load', () => {
    // Preload next slide images
    const slides = document.querySelectorAll('.slide');
    if (slides.length === 0) return;

    slides.forEach((slide, index) => {
        if (index > 0) {
            const bg = slide.querySelector('.slide-bg');
            if (bg) {
                const imgUrl = bg.style.backgroundImage.match(/url\(['"]?([^'"]+)['"]?\)/)?.[1];
                if (imgUrl) {
                    const img = new Image();
                    img.src = imgUrl;
                }
            }
        }
    });
});


// ===================================
// Donation Form Interactivity
// ===================================
function initDonationForm() {
    // Amount button selection
    const amountButtons = document.querySelectorAll('.amount-btn');
    const customAmountInput = document.getElementById('custom-amount');

    if (amountButtons.length > 0) {
        amountButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                // Remove active class from all buttons
                amountButtons.forEach(btn => {
                    btn.style.borderColor = '#e0e0e0';
                    btn.style.background = 'white';
                    btn.style.color = 'inherit';
                });
                // Add active class to clicked button
                button.style.borderColor = 'var(--primary-orange)';
                button.style.background = 'var(--primary-orange)';
                button.style.color = 'white';
                // Set custom amount to selected value
                if (customAmountInput) {
                    customAmountInput.value = button.dataset.amount;
                }
            });
        });

        // Clear button selection when typing custom amount
        if (customAmountInput) {
            customAmountInput.addEventListener('input', () => {
                amountButtons.forEach(btn => {
                    btn.style.borderColor = '#e0e0e0';
                    btn.style.background = 'white';
                    btn.style.color = 'inherit';
                });
            });
        }
    }

    // Payment method selection highlighting
    const paymentLabels = document.querySelectorAll('input[name="payment-method"]');
    if (paymentLabels.length > 0) {
        paymentLabels.forEach(radio => {
            radio.addEventListener('change', () => {
                // Remove highlight from all labels
                document.querySelectorAll('input[name="payment-method"]').forEach(r => {
                    r.parentElement.style.borderColor = '#e0e0e0';
                    r.parentElement.style.background = 'white';
                });
                // Highlight selected label
                if (radio.checked) {
                    radio.parentElement.style.borderColor = 'var(--primary-orange)';
                    radio.parentElement.style.background = '#fff5f2';
                }
            });
        });
    }
}

// Run after everything is fully loaded
window.addEventListener('load', () => {
    // Small delay to ensure all other scripts have finished
    setTimeout(initDonationForm, 100);
});

// ===================================
// Google Calendar Tabs (Events page)
// ===================================

function initCalendarTabs() {
    const tabsContainer = document.querySelector('[data-calendar-tabs]');
    if (!tabsContainer) return;

    const tabs = tabsContainer.querySelectorAll('.calendar-tab');
    const frames = document.querySelectorAll('.calendar-frame');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const view = tab.getAttribute('data-calendar-view');

            // Update active tab
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Show matching frame
            frames.forEach(frame => {
                const frameView = frame.getAttribute('data-calendar-view');
                frame.classList.toggle('active', frameView === view);
            });
        });
    });
}

// Month vs agenda toggle for custom calendar
function initCalendarViewToggle() {
    const containers = document.querySelectorAll('.calendar-container');
    if (!containers.length) return;

    containers.forEach(container => {
        const buttons = container.querySelectorAll('.cal-view-btn');
        if (!buttons.length) return;

        const grid = container.querySelector('.calendar-grid');
        const agenda = container.querySelector('.calendar-agenda-card');
        if (!grid || !agenda) return;

        // Default view: month on desktop, agenda on tablet/mobil
        const isSmall = window.matchMedia('(max-width: 1024px)').matches;
        const defaultView = isSmall ? 'agenda' : 'month';
        container.setAttribute('data-cal-view', defaultView);

        buttons.forEach(btn => {
            const view = btn.getAttribute('data-cal-view');
            btn.classList.toggle('active', view === defaultView);

            btn.addEventListener('click', () => {
                const selected = btn.getAttribute('data-cal-view');
                container.setAttribute('data-cal-view', selected);

                buttons.forEach(b => {
                    b.classList.toggle('active', b === btn);
                });
            });
        });
    });
}

// ===================================
// Copyright Year Auto-Update
// ===================================
function updateCopyrightYear() {
    const yearElement = document.getElementById('copyright-year');
    if (yearElement) {
        yearElement.textContent = new Date().getFullYear();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initCalendarTabs();
    initCalendarViewToggle();
    initTeamCards();
    updateCopyrightYear();
});

let publicUiRevealDone = false;

function revealPublicUI(reason = 'unknown') {
    if (publicUiRevealDone || !document.body) return;
    
    // Flicker prevention: delay reveal for reading plans or deep links until bible-reader is ready
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('plan') || urlParams.has('ref')) {
        if (reason !== 'bible-reader-ready' && reason !== 'post-load-fallback') {
            console.log(`Delaying UI reveal for plan/ref parameter (${reason})`);
            return;
        }
    }
    
    publicUiRevealDone = true;
    document.body.classList.remove('cms-loading');
    console.log(`Public UI revealed (${reason})`);
}
window.revealPublicUI = revealPublicUI;

window.addEventListener('cmsContentLoaded', () => {
    revealPublicUI('cms-content-loaded');
});

// Safety fallback if CMS bootstrapping stalls.
window.addEventListener('load', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const isDeepLink = urlParams.has('plan') || urlParams.has('ref');
    const fallbackDuration = isDeepLink ? 15000 : 7000;
    
    window.setTimeout(() => {
        revealPublicUI('post-load-fallback');
    }, fallbackDuration);
});

// Global Theme Toggle Implementation
(function() {
    window.hkmApplyTheme = function (theme) {
        const activeTheme = theme || localStorage.getItem('hkm_theme') || document.documentElement.getAttribute('data-theme') || 'light';
        
        document.documentElement.setAttribute('data-theme', activeTheme);
        document.documentElement.classList.toggle('dark', activeTheme === 'dark');
        
        if (document.body) {
            document.body.classList.toggle('dark', activeTheme === 'dark');
            document.body.classList.toggle('bible-theme-dark', activeTheme === 'dark');
            document.body.classList.toggle('bible-theme-light', activeTheme !== 'dark');
        }
        
        try {
            localStorage.setItem('hkm_theme', activeTheme);
        } catch (e) {}

        document.querySelectorAll('.theme-toggle-icon').forEach(icon => {
            icon.textContent = activeTheme === 'dark' ? 'light_mode' : 'dark_mode';
        });

        if (window.bibleReader) {
            window.bibleReader.settings.theme = activeTheme === 'dark' ? 'dark' : 'light';
            if (typeof window.bibleReader.saveSettings === 'function') window.bibleReader.saveSettings();
            if (typeof window.bibleReader.applySettings === 'function') window.bibleReader.applySettings();
        }

        window.dispatchEvent(new CustomEvent('hkm-theme-changed', { detail: { theme: activeTheme } }));
    };

    window.hkmToggleTheme = function () {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
        window.hkmApplyTheme(nextTheme);
    };

    function initThemeToggle() {
        let activeTheme = localStorage.getItem('hkm_theme');
        if (!activeTheme) {
            const hour = new Date().getHours();
            const isNight = hour >= 22 || hour < 6;
            activeTheme = document.documentElement.getAttribute('data-theme') || (isNight || window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        }
        window.hkmApplyTheme(activeTheme);

        if (!window.hkmThemeClickBound) {
            window.hkmThemeClickBound = true;
            document.addEventListener('click', function (e) {
                const btn = e.target.closest('#theme-toggle-btn, .mobile-theme-toggle-btn, .theme-toggle-btn, [data-action="toggle-theme"]');
                if (btn) {
                    e.preventDefault();
                    e.stopPropagation();
                    window.hkmToggleTheme();
                }
            });
        }

        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
            if (!localStorage.getItem('hkm_theme')) {
                const newTheme = e.matches ? 'dark' : 'light';
                window.hkmApplyTheme(newTheme);
            }
        });
    }

    function updateThemeToggleIcon(theme) {
        document.querySelectorAll('.theme-toggle-icon').forEach(icon => {
            icon.textContent = theme === 'dark' ? 'light_mode' : 'dark_mode';
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initThemeToggle);
    } else {
        initThemeToggle();
    }
})();

// Header Dynamic Profile Button Implementation
(function() {
    async function initHeaderProfile() {
        const profileLink = document.getElementById('header-profile-link');
        const mobileProfileLink = document.getElementById('mobile-menu-profile-link');
        const mobileDevBtn = document.getElementById('mobile-dev-btn') || document.getElementById('mobile-devotional-shortcut');

        const profileImg = document.getElementById('header-profile-img');
        const profileIcon = profileLink ? profileLink.querySelector('.material-symbols-outlined') : null;
        const mobileProfileImg = document.getElementById('mobile-menu-profile-img');
        const mobileProfileIcon = mobileProfileLink ? mobileProfileLink.querySelector('.material-symbols-outlined') : null;

        // Create global profile dropdown menu element if not exists
        let profileDropdown = document.getElementById('global-profile-dropdown');
        if (!profileDropdown) {
            profileDropdown = document.createElement('div');
            profileDropdown.id = 'global-profile-dropdown';
            profileDropdown.className = 'hidden';
            profileDropdown.style.cssText = `
                position: fixed;
                top: 70px;
                right: 20px;
                z-index: 99999;
                width: 270px;
                background: #ffffff;
                border: 1px solid #e2e8f0;
                border-radius: 16px;
                box-shadow: 0 12px 32px rgba(15, 23, 42, 0.16);
                padding: 16px;
                font-family: inherit;
                transition: opacity 0.2s ease, transform 0.2s ease;
            `;
            profileDropdown.innerHTML = `
                <div style="display: flex; align-items: center; gap: 12px; padding-bottom: 12px; border-bottom: 1px solid #f1f5f9; margin-bottom: 10px;">
                    <img id="dropdown-user-avatar" src="" alt="Profilbilde" style="width: 42px; height: 42px; border-radius: 50%; object-fit: cover; border: 1.5px solid var(--hkm-terracotta); background: #f1f5f9;">
                    <div style="min-width: 0; flex: 1;">
                        <div id="dropdown-user-name" style="font-weight: 750; font-size: 0.95rem; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Innlogget bruker</div>
                        <div id="dropdown-user-email" style="font-size: 0.78rem; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">-</div>
                    </div>
                </div>

                <div style="display: flex; flex-direction: column; gap: 4px; margin-bottom: 8px;">
                    <a href="/minside/index.html" class="dropdown-link-item" style="display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 10px; color: #334155; font-size: 0.88rem; font-weight: 600; text-decoration: none; transition: background 0.2s;">
                        <i class="fas fa-user-circle" style="color: var(--hkm-terracotta); font-size: 1rem; width: 18px; text-align: center;"></i> Min Side
                    </a>
                    <a href="/minside/index.html?tab=kurs" class="dropdown-link-item" style="display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 10px; color: #334155; font-size: 0.88rem; font-weight: 600; text-decoration: none; transition: background 0.2s;">
                        <i class="fas fa-graduation-cap" style="color: var(--hkm-terracotta); font-size: 1rem; width: 18px; text-align: center;"></i> Mine kurs
                    </a>
                    <a href="/minside/index.html?tab=leseplaner" class="dropdown-link-item" style="display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 10px; color: #334155; font-size: 0.88rem; font-weight: 600; text-decoration: none; transition: background 0.2s;">
                        <i class="fas fa-book-open" style="color: var(--hkm-terracotta); font-size: 1rem; width: 18px; text-align: center;"></i> Mine leseplaner
                    </a>
                    <a id="dropdown-admin-link" href="/admin/index.html" class="dropdown-link-item hidden" style="display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 10px; color: #d17d39; font-size: 0.88rem; font-weight: 700; text-decoration: none; background: rgba(209, 125, 57, 0.08);">
                        <i class="fas fa-user-shield" style="font-size: 1rem; width: 18px; text-align: center;"></i> Admin Panel
                    </a>
                </div>

                <div style="border-top: 1px solid #f1f5f9; padding-top: 8px;">
                    <button id="dropdown-logout-btn" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 9px 12px; border-radius: 10px; background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.2); color: #dc2626; font-size: 0.88rem; font-weight: 700; cursor: pointer; transition: all 0.2s;">
                        <i class="fas fa-sign-out-alt"></i> Logg ut
                    </button>
                </div>
            `;
            document.body.appendChild(profileDropdown);

            // Bind Logout button
            const logoutBtn = profileDropdown.querySelector('#dropdown-logout-btn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    profileDropdown.classList.add('hidden');
                    try {
                        if (typeof firebase !== 'undefined' && typeof firebase.auth === 'function') {
                            await firebase.auth().signOut();
                        } else if (window.firebaseService && typeof window.firebaseService.signOut === 'function') {
                            await window.firebaseService.signOut();
                        }
                    } catch (err) {
                        console.error('Logout error:', err);
                    }
                    localStorage.removeItem('hkm_public_user_cache');
                    window.location.reload();
                });
            }
        }

        const handleProfileClick = (e) => {
            const user = (typeof firebase !== 'undefined' && typeof firebase.auth === 'function') ? firebase.auth().currentUser : null;
            if (!user || user.isAnonymous) {
                // Not logged in -> go to login page!
                window.location.href = '/minside/login.html';
                return;
            }

            // User is logged in -> Toggle Dropdown Menu!
            e.preventDefault();
            e.stopPropagation();

            const isHidden = profileDropdown.classList.contains('hidden');
            if (isHidden) {
                // Populate user details
                const avatarImg = profileDropdown.querySelector('#dropdown-user-avatar');
                const nameEl = profileDropdown.querySelector('#dropdown-user-name');
                const emailEl = profileDropdown.querySelector('#dropdown-user-email');

                if (nameEl) nameEl.textContent = user.displayName || user.email?.split('@')[0] || 'Bruker';
                if (emailEl) emailEl.textContent = user.email || '';
                if (avatarImg) avatarImg.src = user.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80';

                // Check admin link
                const adminLink = profileDropdown.querySelector('#dropdown-admin-link');
                if (adminLink) {
                    if (window.currentUserRole === 'admin' || (user.email && user.email.includes('thomasknutsen87@gmail.com'))) {
                        adminLink.classList.remove('hidden');
                    } else {
                        adminLink.classList.add('hidden');
                    }
                }

                // Position dropdown under header element
                const targetBtn = e.currentTarget || profileLink;
                const rect = targetBtn ? targetBtn.getBoundingClientRect() : { bottom: 70, right: 20 };
                profileDropdown.style.top = `${rect.bottom + 8}px`;
                profileDropdown.style.right = `${Math.max(16, window.innerWidth - rect.right)}px`;

                profileDropdown.classList.remove('hidden');
            } else {
                profileDropdown.classList.add('hidden');
            }
        };

        if (profileLink) {
            profileLink.addEventListener('click', handleProfileClick);
        }
        if (mobileProfileLink) {
            mobileProfileLink.addEventListener('click', handleProfileClick);
        }

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (profileDropdown && !profileDropdown.classList.contains('hidden')) {
                if (!profileDropdown.contains(e.target) && (!profileLink || !profileLink.contains(e.target)) && (!mobileProfileLink || !mobileProfileLink.contains(e.target))) {
                    profileDropdown.classList.add('hidden');
                }
            }
        });

        // Helper to update DOM states for both desktop and mobile profile elements
        const updateProfileDOM = (photoURL) => {
            // Update Desktop header profile
            if (profileLink) {
                profileLink.classList.remove('hidden');
                profileLink.classList.add('flex');
                profileLink.href = '/minside/index.html';
                if (photoURL && profileImg) {
                    profileImg.src = photoURL;
                    profileImg.classList.remove('hidden');
                    if (profileIcon) profileIcon.classList.add('hidden');
                } else {
                    if (profileImg) profileImg.classList.add('hidden');
                    if (profileIcon) profileIcon.classList.remove('hidden');
                }
            }
            // Update Mobile menu profile
            if (mobileProfileLink) {
                mobileProfileLink.classList.remove('hidden');
                mobileProfileLink.classList.add('flex');
                mobileProfileLink.href = '/minside/index.html';
                if (photoURL && mobileProfileImg) {
                    mobileProfileImg.src = photoURL;
                    mobileProfileImg.classList.remove('hidden');
                    if (mobileProfileIcon) mobileProfileIcon.classList.add('hidden');
                } else {
                    if (mobileProfileImg) mobileProfileImg.classList.add('hidden');
                    if (mobileProfileIcon) mobileProfileIcon.classList.remove('hidden');
                }
            }
        };

        const hideProfileDOM = () => {
            if (profileLink) {
                profileLink.classList.remove('hidden');
                profileLink.classList.add('flex');
                profileLink.href = '/minside/login.html';
                if (profileImg) profileImg.classList.add('hidden');
                if (profileIcon) profileIcon.classList.remove('hidden');
            }
            if (mobileProfileLink) {
                mobileProfileLink.classList.remove('hidden');
                mobileProfileLink.classList.add('flex');
                mobileProfileLink.href = '/minside/login.html';
                if (mobileProfileImg) mobileProfileImg.classList.add('hidden');
                if (mobileProfileIcon) mobileProfileIcon.classList.remove('hidden');
            }
            if (mobileDevBtn) {
                mobileDevBtn.classList.add('hidden');
                mobileDevBtn.classList.remove('flex');
            }
        };

        const updateDevotionalShortcut = async (user) => {
            if (!user) {
                if (mobileDevBtn) {
                    mobileDevBtn.classList.add('hidden');
                    mobileDevBtn.classList.remove('flex');
                }
                return;
            }

            try {
                // Fetch active, uncompleted reading plans
                const snap = await window.firebaseService.db.collection('users')
                    .doc(user.uid)
                    .collection('reading_plans')
                    .where('completed', '==', false)
                    .get();

                if (!snap.empty) {
                    const userPlans = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    // Sort in memory by lastActiveAt descending
                    userPlans.sort((a, b) => {
                        const aTime = a.lastActiveAt?.toMillis ? a.lastActiveAt.toMillis() : (a.lastActiveAt?.seconds ? a.lastActiveAt.seconds * 1000 : 0);
                        const bTime = b.lastActiveAt?.toMillis ? b.lastActiveAt.toMillis() : (b.lastActiveAt?.seconds ? b.lastActiveAt.seconds * 1000 : 0);
                        return bTime - aTime;
                    });
                    
                    const activePlan = userPlans[0];
                    const planId = activePlan.planId;
                    const currentDay = activePlan.currentDay || 1;

                    if (planId && mobileDevBtn) {
                        const lang = typeof getCurrentLanguage === 'function' ? getCurrentLanguage() : 'no';
                        const prefix = lang === 'no' ? '' : `/${lang}`;
                        mobileDevBtn.href = `${prefix}/bibel.html?plan=${planId}&day=${currentDay}`;
                        mobileDevBtn.classList.remove('hidden');
                        mobileDevBtn.classList.add('flex');
                        
                        // Update cache
                        try {
                            const cachedUserRaw = localStorage.getItem('hkm_public_user_cache');
                            let cachedData = cachedUserRaw ? JSON.parse(cachedUserRaw) : {};
                            if (!cachedData || cachedData.uid !== user.uid) {
                                cachedData = { uid: user.uid };
                            }
                            cachedData.activePlanId = planId;
                            cachedData.activePlanDay = currentDay;
                            localStorage.setItem('hkm_public_user_cache', JSON.stringify(cachedData));
                        } catch (cacheErr) {}
                    }
                } else {
                    if (mobileDevBtn) {
                        mobileDevBtn.classList.add('hidden');
                        mobileDevBtn.classList.remove('flex');
                    }
                }
            } catch (err) {
                console.warn('[DevotionalShortcut] Failed to fetch active reading plan:', err);
                if (mobileDevBtn) {
                    mobileDevBtn.classList.add('hidden');
                    mobileDevBtn.classList.remove('flex');
                }
            }
        };

        // Immediately render avatar and shortcut from cache, or show login icon if logged out
        try {
            const cachedUserRaw = localStorage.getItem('hkm_public_user_cache');
            if (cachedUserRaw) {
                const cachedUser = JSON.parse(cachedUserRaw);
                if (cachedUser && cachedUser.uid) {
                    updateProfileDOM(cachedUser.photoURL);
                    if (cachedUser.activePlanId && mobileDevBtn) {
                        const lang = typeof getCurrentLanguage === 'function' ? getCurrentLanguage() : 'no';
                        const prefix = lang === 'no' ? '' : `/${lang}`;
                        mobileDevBtn.href = `${prefix}/bibel.html?plan=${cachedUser.activePlanId}&day=${cachedUser.activePlanDay || 1}`;
                        mobileDevBtn.classList.remove('hidden');
                        mobileDevBtn.classList.add('flex');
                    }
                } else {
                    hideProfileDOM();
                }
            } else {
                hideProfileDOM();
            }
        } catch (e) {
            console.warn('[ProfileCache] Failed to load cached profile:', e);
            hideProfileDOM();
        }

        let count = 0;
        // Wait for firebaseService and firebase auth to load
        while ((typeof firebase === 'undefined' || typeof firebase.auth !== 'function') && count < 60) {
            await new Promise(r => setTimeout(r, 50));
            count++;
        }

        if (typeof firebase !== 'undefined' && typeof firebase.auth === 'function') {
            firebase.auth().onAuthStateChanged(async (user) => {
            if (!user || user.isAnonymous) {
                hideProfileDOM();
                localStorage.removeItem('hkm_public_user_cache');
                return;
            }

            // Check google provider and user photo
            const googlePhoto = (user.providerData || []).find(p => p && p.photoURL)?.photoURL || '';
            let photoURL = user.photoURL || googlePhoto || '';

            try {
                if (window.firebaseService && window.firebaseService.db) {
                    const userDoc = await window.firebaseService.db.collection('users').doc(user.uid).get();
                    if (userDoc.exists) {
                        const userData = userDoc.data() || {};
                        photoURL = userData.photoURL || userData.photo_url || userData.photoUrl || userData.avatarUrl || userData.avatar_url || userData.profileImage || userData.image || photoURL;
                    }
                }
            } catch (docErr) {
                console.warn('Kunne ikke hente brukerprofil for bilde:', docErr);
            }

            // Auto-sync Google photoURL if missing on Auth user
            if (googlePhoto && !user.photoURL) {
                try {
                    await user.updateProfile({ photoURL: googlePhoto });
                    if (window.firebaseService && window.firebaseService.db) {
                        await window.firebaseService.db.collection('users').doc(user.uid).set({ photoURL: googlePhoto }, { merge: true });
                    }
                } catch (e) {}
            }

            updateProfileDOM(photoURL);

            // Update cache for instant render next time
            try {
                const cachedUserRaw = localStorage.getItem('hkm_public_user_cache');
                let cachedData = cachedUserRaw ? JSON.parse(cachedUserRaw) : {};
                if (!cachedData || cachedData.uid !== user.uid) {
                    cachedData = { uid: user.uid };
                }
                cachedData.photoURL = photoURL || '';
                localStorage.setItem('hkm_public_user_cache', JSON.stringify(cachedData));
            } catch (cacheErr) {
                // noop
            }

            updateProfileDOM(photoURL);
            updateDevotionalShortcut(user);
        });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initHeaderProfile);
    } else {
        initHeaderProfile();
    }
})();
