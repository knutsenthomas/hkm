/**
 * HKM i18n Manager
 * Handles language detection, switching, and persisting preferences.
 * Updated to support Clean URLs (no .html extensions).
 */

const i18nManager = {
    languages: ['no', 'en', 'es'],
    defaultLang: 'no',
    storageKey: 'hkm_preferred_lang',
    knownFiles: {
        en: new Set([
            'about', 'accessibility', 'bibel', 'blog-post-1', 'blog-post-2',
            'blog-post-3', 'blog-post-4', 'blog-post-5', 'blog-post',
            'blog', 'bnn', 'calendar', 'contact', 'donations',
            'event-details', 'events', 'for-businesses', 'for-churches',
            'index', 'media', 'podcast', 'privacy',
            'regular-donors', 'teaching', 'youtube', 'reading-plan-details',
            'tidslinje-imperier', 'leseplaner', 'bibelsk-tidslinje', 'courses'
        ]),
        es: new Set([
            'accesibilidad', 'bibel', 'blog-post-1', 'blog-post-2',
            'blog-post-3', 'blog-post-4', 'blog-post-5', 'blog-post',
            'blog', 'bnn', 'calendario', 'contacto',
            'detalles-evento', 'donaciones', 'donantes-regulares',
            'ensenanza', 'eventos', 'index', 'media',
            'para-empresas', 'para-iglesias', 'podcast',
            'privacidad', 'sobre-nosotros', 'youtube', 'detalles-plan-lectura',
            'tidslinje-imperier', 'leseplaner', 'bibelsk-tidslinje', 'cursos'
        ])
    },

    init() {
        const currentLang = this.detectLanguage();
        this.fixLocalizedHeaderLogoPath();
        this.fixLocalizedLogoLinks(currentLang);
        this.syncCurrentLanguageBadge(currentLang);
        this.bindEvents();
        this.startLanguageBadgeGuard();

        // Some pages hydrate header labels after i18n init; resync shortly after.
        setTimeout(() => this.syncCurrentLanguageBadge(), 300);
        setTimeout(() => this.syncCurrentLanguageBadge(), 1200);
    },

    fixLocalizedLogoLinks(lang = null) {
        const activeLang = (lang || document.documentElement.lang || this.defaultLang).toLowerCase();
        const isSupported = this.languages.includes(activeLang);
        const targetHref = (!isSupported || activeLang === 'no')
            ? '/'
            : `/${activeLang}/`;

        document.querySelectorAll('a.logo').forEach((anchor) => {
            anchor.setAttribute('href', targetHref);
        });
    },

    startLanguageBadgeGuard() {
        if (this._langBadgeGuardStarted) return;
        this._langBadgeGuardStarted = true;

        let queued = false;
        const scheduleSync = () => {
            if (queued) return;
            queued = true;
            requestAnimationFrame(() => {
                queued = false;
                this.syncCurrentLanguageBadge();
            });
        };

        const observer = new MutationObserver((mutations) => {
            for (const m of mutations) {
                if (m.type === 'childList' && m.addedNodes.length > 0) {
                    for (let i = 0; i < m.addedNodes.length; i++) {
                        const node = m.addedNodes[i];
                        if (node.nodeType === 1) { // Node.ELEMENT_NODE
                            if (node.classList.contains('lang-switcher') || node.querySelector('.lang-switcher')) {
                                scheduleSync();
                                return;
                            }
                        }
                    }
                }
            }
        });

        const startObserve = () => {
            if (!document.body) return;
            observer.observe(document.body, {
                subtree: true,
                childList: true,
                characterData: true
            });
            scheduleSync();
        };

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', startObserve, { once: true });
        } else {
            startObserve();
        }

        window.addEventListener('pageshow', () => this.syncCurrentLanguageBadge());
        window.addEventListener('focus', () => this.syncCurrentLanguageBadge());
    },

    fixLocalizedHeaderLogoPath() {
        const path = window.location.pathname || '';
        const inLangFolder = /^\/(en|es)(\/|$)/.test(path);
        if (!inLangFolder) return;

        const headerLogo = document.querySelector('.logo img');
        if (!headerLogo) return;

        const src = headerLogo.getAttribute('src') || '';
        if (src.startsWith('img/')) {
            headerLogo.setAttribute('src', `../${src}`);
        }
    },

    inferLanguageFromElement(el) {
        if (!el) return this.defaultLang;
        const text = String(el.textContent || '').trim().toLowerCase();

        if (text.includes('english') || text.includes('en') || text.includes('🇺🇸')) return 'en';
        if (text.includes('español') || text.includes('espanol') || text.includes('es') || text.includes('🇪🇸')) return 'es';
        if (text.includes('norsk') || text.includes('no') || text.includes('🇳🇴')) return 'no';

        return this.defaultLang;
    },

    /**
     * Helper to auto-detect browser language or timezone-based location.
     * Prioritizes supported browser language preferences (including Scandinavian languages and Spanish).
     * Falls back to checking if timezone matches Scandinavian countries or Spanish-speaking countries.
     * The fallback for all other locations is English ('en').
     * @returns {string} 'en', 'es', or 'no'
     */
    getBrowserOrGeoLanguage() {
        // 1. Detect via browser language preference list
        const languages = navigator.languages || [navigator.language || navigator.userLanguage];
        for (const lang of languages) {
            if (!lang) continue;
            const cleanLang = lang.toLowerCase();
            if (cleanLang.startsWith('es')) {
                return 'es';
            }
            if (cleanLang.startsWith('no') || cleanLang.startsWith('nb') || cleanLang.startsWith('nn') || cleanLang.startsWith('sv') || cleanLang.startsWith('da')) {
                return 'no';
            }
            if (cleanLang.startsWith('en')) {
                return 'en';
            }
        }

        // 2. Secondary check: Timezone geographic detection
        try {
            const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
            if (tz) {
                const lowerTz = tz.toLowerCase();
                
                // Scandinavia timezones (Norway, Sweden, Denmark)
                const isScandinavia = lowerTz.includes('europe/oslo') || 
                                     lowerTz.includes('europe/stockholm') || 
                                     lowerTz.includes('europe/copenhagen');
                if (isScandinavia) {
                    return 'no';
                }

                // Spanish-speaking country timezones (Spain & Spanish-speaking Americas)
                const isSpanishSpeaking = lowerTz.includes('madrid') || 
                                          lowerTz.includes('mexico') || 
                                          lowerTz.includes('buenos_aires') || 
                                          lowerTz.includes('santiago') || 
                                          lowerTz.includes('bogota') || 
                                          lowerTz.includes('caracas') || 
                                          lowerTz.includes('lima') || 
                                          lowerTz.includes('quito') || 
                                          lowerTz.includes('la_paz') || 
                                          lowerTz.includes('asuncion') || 
                                          lowerTz.includes('montevideo') || 
                                          lowerTz.includes('havana') || 
                                          lowerTz.includes('santo_domingo') || 
                                          lowerTz.includes('san_juan') || 
                                          lowerTz.includes('panama') || 
                                          lowerTz.includes('costa_rica') || 
                                          lowerTz.includes('el_salvador') || 
                                          lowerTz.includes('guatemala') || 
                                          lowerTz.includes('tegucigalpa') || 
                                          lowerTz.includes('managua');
                if (isSpanishSpeaking) {
                    return 'es';
                }
            }
        } catch (e) {
            console.warn("Timezone language detection failed:", e);
        }

        // 3. Fallback for the rest of the world is English
        return 'en';
    },

    /**
     * Detects language from localStorage, browser settings, or URL path.
     * Automatically redirects on first-time visit to the landing page if a non-Norwegian preference is detected.
     */
    detectLanguage() {
        const path = window.location.pathname;
        let currentLang = 'no';

        const hasExplicitLang = /^\/en(\/|$)/.test(path) ? 'en' : (/^\/es(\/|$)/.test(path) ? 'es' : null);

        if (hasExplicitLang) {
            currentLang = hasExplicitLang;
            localStorage.setItem(this.storageKey, currentLang);
        } else if (/\/minside(\/|$)/.test(path)) {
            currentLang = localStorage.getItem(this.storageKey) || 'no';
        } else {
            // We are on a Norwegian page (path does not start with /en or /es)
            const savedPref = localStorage.getItem(this.storageKey);
            if (savedPref) {
                currentLang = savedPref;
            } else {
                // First-time visit and no preference stored. Check if we're on the homepage.
                const isHomepage = path === '/' || path === '/index.html' || path === '/index';
                if (isHomepage) {
                    const autoLang = this.getBrowserOrGeoLanguage();
                    if (autoLang && autoLang !== 'no') {
                        currentLang = autoLang;
                        localStorage.setItem(this.storageKey, currentLang);
                        document.documentElement.lang = currentLang;
                        window.location.replace(currentLang === 'en' ? '/en/' : '/es/');
                        return currentLang;
                    }
                }
                currentLang = 'no';
            }
        }

        document.documentElement.lang = currentLang;
        return currentLang;
    },

    syncCurrentLanguageBadge(lang = null) {
        const activeLang = (lang || document.documentElement.lang || this.defaultLang).toLowerCase();
        const normalized = this.languages.includes(activeLang) ? activeLang : this.defaultLang;
        const label = normalized.toUpperCase();

        document.querySelectorAll('.lang-btn span:not(.material-symbols-outlined)').forEach((el) => {
            el.textContent = label;
        });

        document.querySelectorAll('.lang-switch-btn').forEach((link) => {
            const linkLang = (link.getAttribute('data-lang') || this.inferLanguageFromElement(link) || '').toLowerCase();
            const isActive = linkLang === normalized;
            link.classList.toggle('font-bold', isActive);
        });
    },

    /**
     * Updates the language state and handles redirection if necessary.
     * @param {string} lang - 'no', 'en', or 'es'
     * @param {boolean} redirect - Whether to navigate to the language-specific page
     */
    setLanguage(lang, redirect = true) {
        if (!this.languages.includes(lang)) lang = this.defaultLang;

        const currentLang = document.documentElement.lang || this.defaultLang;
        if (redirect && lang !== currentLang && !/\/minside(\/|$)/.test(window.location.pathname)) {
            if (!this.isTranslationAvailable(lang)) {
                // Show toast notification
                let msg = 'Denne siden er foreløpig kun tilgjengelig på norsk.';
                if (currentLang === 'en') {
                    msg = 'This page is currently only available in Norwegian.';
                } else if (currentLang === 'es') {
                    msg = 'Esta página actualmente solo está disponible en noruego.';
                }
                this.showNotification(msg, 'warning');
                return;
            }
        }

        localStorage.setItem(this.storageKey, lang);
        document.documentElement.lang = lang;
        this.fixLocalizedLogoLinks(lang);
        this.syncCurrentLanguageBadge(lang);

        if (redirect) {
            if (/\/minside(\/|$)/.test(window.location.pathname)) {
                // Trigger dynamic re-render/translation on Min Side pages
                if (window.minSideManager && typeof window.minSideManager.handleLanguageChange === 'function') {
                    window.minSideManager.handleLanguageChange(lang);
                } else if (typeof window.minsideAuthLanguageChange === 'function') {
                    window.minsideAuthLanguageChange(lang);
                }
            } else {
                this.redirectToLanguage(lang);
            }
        }
    },

    isTranslationAvailable(lang) {
        // 1. Check alternate tags first
        const alternateEl = document.querySelector(`link[rel="alternate"][hreflang="${lang}"]`);
        if (alternateEl) {
            return true;
        }

        // If target language is default, it's always available (all pages exist in Norwegian)
        if (lang === 'no') {
            return true;
        }

        // 2. Fallback to hardcoded knownFiles mapping
        const currentPath = window.location.pathname || '/';
        const pathParts = currentPath
            .split('/')
            .filter(Boolean)
            .map(part => part.replace(/\.html$/, ''));

        if (pathParts[0] === 'en' || pathParts[0] === 'es') {
            pathParts.shift();
        }

        let currentFile = pathParts[pathParts.length - 1] || 'index';
        if (currentFile === 'butikk' || currentFile === 'betingelser') {
            return true;
        }
        const mappedFile = this.mapFileName(currentFile, lang);

        if (this.knownFiles[lang] && this.knownFiles[lang].has(mappedFile)) {
            return true;
        }

        return false;
    },

    showNotification(msg, type = 'info') {
        if (window.showToast) {
            window.showToast(msg, type);
            return;
        }

        // Determine correct path prefix
        const path = window.location.pathname || '';
        const inLangFolder = /^\/(en|es)(\/|$)/.test(path);
        const inRessurserFolder = /^\/ressurser(\/|$)/.test(path);
        const inMinSideFolder = /^\/minside(\/|$)/.test(path);
        const prefix = (inLangFolder || inRessurserFolder || inMinSideFolder) ? '../' : '';

        // Inject stylesheet if missing
        if (!document.querySelector('link[href*="notifications.css"]')) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = `${prefix}css/notifications.css`;
            document.head.appendChild(link);
        }

        // Inject script if missing
        if (!document.querySelector('script[src*="notifications.js"]')) {
            const script = document.createElement('script');
            script.src = `${prefix}js/notifications.js`;
            document.body.appendChild(script);
        }

        // Poll for window.showToast to become available
        let attempts = 0;
        const checkAndShow = () => {
            if (window.showToast) {
                window.showToast(msg, type);
            } else if (attempts < 20) {
                attempts++;
                setTimeout(checkAndShow, 100);
            } else {
                alert(msg);
            }
        };
        checkAndShow();
    },

    /**
     * Navigates to the corresponding page in the target language.
     */
    redirectToLanguage(lang) {
        // Check if there is an alternate tag in head
        const alternateEl = document.querySelector(`link[rel="alternate"][hreflang="${lang}"]`);
        if (alternateEl) {
            let targetUrl = alternateEl.getAttribute('href');
            if (targetUrl.startsWith('https://www.hiskingdomministry.no')) {
                targetUrl = targetUrl.replace('https://www.hiskingdomministry.no', window.location.origin);
            }
            window.location.href = targetUrl + window.location.search;
            return;
        }

        const currentPath = window.location.pathname || '/';
        const pathParts = currentPath
            .split('/')
            .filter(Boolean)
            .map(part => part.replace(/\.html$/, ''));

        if (pathParts[0] === 'en' || pathParts[0] === 'es') {
            pathParts.shift();
        }

        let currentFile = pathParts[pathParts.length - 1] || 'index';
        
        if (currentFile === 'butikk' || currentFile === 'betingelser') {
            window.location.reload();
            return;
        }
        
        const mappedFile = this.mapFileName(currentFile, lang);
        let newPath = '';

        if (lang === 'no') {
            newPath = mappedFile === 'index' ? '/' : `/${mappedFile}`;
        } else {
            const safeTargetFile = this.knownFiles[lang].has(mappedFile) ? mappedFile : 'index';
            newPath = safeTargetFile === 'index' ? `/${lang}/` : `/${lang}/${safeTargetFile}`;
        }

        const search = window.location.search;
        window.location.href = newPath + search;
    },

    /**
     * Maps filenames to their translated equivalents.
     */
    mapFileName(path, targetLang) {
        const cleanPath = String(path).replace(/\.html$/, '');
        
        const mappings = {
            'en': {
                'index': 'index',
                'om-oss': 'about',
                'arrangementer': 'events',
                'kontakt': 'contact',
                'donasjoner': 'donations',
                'for-menigheter': 'for-churches',
                'for-bedrifter': 'for-businesses',
                'bnn': 'bnn',
                'arrangement-detaljer': 'event-details',
                'blogg': 'blog',
                'blogg-post': 'blog-post',
                'media': 'media',
                'kalender': 'calendar',
                'undervisningsserier': 'teaching',
                'undervisning': 'teaching',
                'bibelstudier': 'teaching',
                'seminarer': 'teaching',
                'kurs': 'courses',
                'reisevirksomhet': 'events',
                'bli-fast-giver': 'regular-donors',
                'personvern': 'privacy',
                'tilgjengelighet': 'accessibility',
                'podcast': 'podcast',
                'youtube': 'youtube',
                'blogg-post-1': 'blog-post-1',
                'blogg-post-2': 'blog-post-2',
                'blogg-post-3': 'blog-post-3',
                'blogg-post-4': 'blog-post-4',
                'blogg-post-5': 'blog-post-5',
                'leseplan-detaljer': 'reading-plan-details',
                'tidslinje-imperier': 'tidslinje-imperier',
                'bibelsk-tidslinje': 'bibelsk-tidslinje'
            },
            'es': {
                'index': 'index',
                'om-oss': 'sobre-nosotros',
                'arrangementer': 'eventos',
                'kontakt': 'contacto',
                'donasjoner': 'donaciones',
                'for-menigheter': 'para-iglesias',
                'for-bedrifter': 'para-empresas',
                'bnn': 'bnn',
                'arrangement-detaljer': 'detalles-evento',
                'blogg': 'blog',
                'blogg-post': 'blog-post',
                'media': 'media',
                'kalender': 'calendario',
                'undervisningsserier': 'ensenanza',
                'undervisning': 'ensenanza',
                'bibelstudier': 'ensenanza',
                'seminarer': 'ensenanza',
                'kurs': 'cursos',
                'reisevirksomhet': 'eventos',
                'bli-fast-giver': 'donantes-regulares',
                'personvern': 'privacidad',
                'tilgjengelighet': 'accesibilidad',
                'podcast': 'podcast',
                'youtube': 'youtube',
                'blogg-post-1': 'blog-post-1',
                'blogg-post-2': 'blog-post-2',
                'blogg-post-3': 'blog-post-3',
                'blogg-post-4': 'blog-post-4',
                'blogg-post-5': 'blog-post-5',
                'leseplan-detaljer': 'detalles-plan-lectura',
                'tidslinje-imperier': 'tidslinje-imperier',
                'bibelsk-tidslinje': 'bibelsk-tidslinje'
            }
        };

        let result = cleanPath;
        if (mappings[targetLang]) {
            for (const [no, translated] of Object.entries(mappings[targetLang])) {
                if (cleanPath === no) {
                    result = translated;
                    break;
                }
            }
        } else if (targetLang === 'no') {
            // Reverse mapping
            const allMappings = { ...mappings.en, ...mappings.es };
            for (const [no, translated] of Object.entries(allMappings)) {
                if (cleanPath === translated) {
                    result = no;
                    break;
                }
            }
        }

        return result;
    },

    bindEvents() {
        document.addEventListener('click', (e) => {
            const langBtn = e.target.closest('.lang-switch-btn, .mega-menu-lang [data-lang]');
            if (langBtn) {
                e.preventDefault();
                const lang = langBtn.getAttribute('data-lang') || this.inferLanguageFromElement(langBtn);
                this.setLanguage(lang);
                return;
            }

            // Toggle dropdown on globe click
            const toggleWrapper = e.target.closest('.lang-switcher');
            const globeIcon = e.target.closest('.lang-btn');

            if (globeIcon && toggleWrapper) {
                e.preventDefault();
                toggleWrapper.classList.toggle('active');
            } else if (!toggleWrapper) {
                // Close all dropdowns if clicking outside
                document.querySelectorAll('.lang-switcher.active').forEach(s => s.classList.remove('active'));
            }
        });
    }
};

// Initialized via script tag in head or footer
window.i18n = i18nManager;
i18nManager.init();
