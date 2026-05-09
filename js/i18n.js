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
            'about', 'accessibility', 'blog-post-1', 'blog-post-2',
            'blog-post-3', 'blog-post-4', 'blog-post-5', 'blog-post',
            'blog', 'bnn', 'calendar', 'contact', 'donations',
            'event-details', 'events', 'for-businesses', 'for-churches',
            'index', 'media', 'podcast', 'privacy',
            'regular-donors', 'teaching', 'youtube'
        ]),
        es: new Set([
            'accesibilidad', 'blog-post-1', 'blog-post-2',
            'blog-post-3', 'blog-post-4', 'blog-post-5', 'blog-post',
            'blog', 'bnn', 'calendario', 'contacto',
            'detalles-evento', 'donaciones', 'donantes-regulares',
            'ensenanza', 'eventos', 'index', 'media',
            'para-empresas', 'para-iglesias', 'podcast',
            'privacidad', 'sobre-nosotros', 'youtube'
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
                const targetEl = m.target && m.target.nodeType === 1
                    ? m.target
                    : m.target?.parentElement;
                if (targetEl && targetEl.closest && targetEl.closest('.lang-switcher')) {
                    scheduleSync();
                    return;
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
        const inLangFolder = path.includes('/en/') || path.includes('/es/');
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
     * Detects language from localStorage, browser settings, or URL path.
     */
    detectLanguage() {
        const path = window.location.pathname;
        let currentLang = 'no';

        // Set language based strictly on the URL path
        if (path.includes('/en/')) currentLang = 'en';
        else if (path.includes('/es/')) currentLang = 'es';

        document.documentElement.lang = currentLang;
        return currentLang;
    },

    syncCurrentLanguageBadge(lang = null) {
        const activeLang = (lang || document.documentElement.lang || this.defaultLang).toLowerCase();
        const normalized = this.languages.includes(activeLang) ? activeLang : this.defaultLang;
        const label = normalized.toUpperCase();

        document.querySelectorAll('.lang-btn span').forEach((el) => {
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

        localStorage.setItem(this.storageKey, lang);
        document.documentElement.lang = lang;
        this.fixLocalizedLogoLinks(lang);
        this.syncCurrentLanguageBadge(lang);

        if (redirect) {
            this.redirectToLanguage(lang);
        }
    },

    /**
     * Navigates to the corresponding page in the target language.
     */
    redirectToLanguage(lang) {
        const currentPath = window.location.pathname;
        // Strip leading/trailing slashes and .html extension
        let currentFile = currentPath.split('/').pop().replace(/\.html$/, '') || 'index';
        if (!currentFile || currentFile === '/') currentFile = 'index';
        
        const mappedFile = this.mapFileName(currentFile, lang);
        let newPath = '';

        if (lang === 'no') {
            newPath = mappedFile === 'index' ? '/' : `/${mappedFile}`;
        } else {
            const safeTargetFile = this.knownFiles[lang].has(mappedFile) ? mappedFile : 'index';
            newPath = safeTargetFile === 'index' ? `/${lang}/` : `/${lang}/${safeTargetFile}`;
        }

        window.location.href = newPath;
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
                'kurs': 'teaching',
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
                'blogg-post-5': 'blog-post-5'
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
                'kurs': 'ensenanza',
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
                'blogg-post-5': 'blog-post-5'
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
            const langBtn = e.target.closest('.lang-switch-btn');
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
