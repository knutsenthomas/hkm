/**
 * HKM i18n Manager
 * Handles language detection, switching, and persisting preferences.
 */

const i18nManager = {
    languages: ['no', 'en', 'es'],
    defaultLang: 'no',
    storageKey: 'hkm_preferred_lang',

    init() {
        this.detectLanguage();
        this.bindEvents();
    },

    /**
     * Detects language from localStorage, browser settings, or URL path.
     */
    detectLanguage() {
        const path = window.location.pathname || '';
        const htmlLang = (document.documentElement.getAttribute('lang') || '').toLowerCase();
        let currentLang = 'no';

        // Set language based strictly on the URL path
        if (path.includes('/en/')) currentLang = 'en';
        else if (path.includes('/es/')) currentLang = 'es';
        else if (htmlLang.startsWith('en')) currentLang = 'en';
        else if (htmlLang.startsWith('es')) currentLang = 'es';

        document.documentElement.lang = currentLang;
    },

    /**
     * Updates the language state and handles redirection if necessary.
     * @param {string} lang - 'no', 'en', or 'es'
     * @param {boolean} redirect - Whether to navigate to the language-specific page
     */
    setLanguage(lang, redirect = true, targetUrl = '') {
        if (!this.languages.includes(lang)) lang = this.defaultLang;

        localStorage.setItem(this.storageKey, lang);
        document.documentElement.lang = lang;

        if (redirect) {
            this.redirectToLanguage(lang, targetUrl);
        }
    },

    /**
     * Navigates to the corresponding page in the target language.
     */
    redirectToLanguage(lang, targetUrl = '') {
        if (typeof targetUrl === 'string' && targetUrl.trim() && targetUrl !== '#') {
            window.location.href = targetUrl;
            return;
        }

        const currentUrl = new URL(window.location.href);
        let normalizedPath = currentUrl.pathname.replace(/^\/(en|es)(\/|$)/, '/');
        if (!normalizedPath.startsWith('/')) normalizedPath = `/${normalizedPath}`;

        let nextPath = normalizedPath;
        if (lang === 'en' || lang === 'es') {
            nextPath = `/${lang}${normalizedPath === '/' ? '' : normalizedPath}`;
        }

        const mappedPath = this.mapFileName(nextPath, lang);
        const finalPath = mappedPath.replace(/\/{2,}/g, '/');
        const finalUrl = `${currentUrl.origin}${finalPath}${currentUrl.search}${currentUrl.hash}`;
        window.location.assign(finalUrl);
    },

    /**
     * Maps filenames to their translated equivalents.
     */
    mapFileName(path, targetLang) {
        const mappings = {
            'en': {
                'index.html': 'index.html',
                'om-oss.html': 'about.html',
                'arrangementer.html': 'events.html',
                'kontakt.html': 'contact.html',
                'donasjoner.html': 'donations.html',
                'for-menigheter.html': 'for-churches.html',
                'for-bedrifter.html': 'for-businesses.html',
                'bnn.html': 'bnn.html',
                'arrangement-detaljer.html': 'event-details.html',
                'blogg.html': 'blog.html',
                'blogg-post.html': 'blog-post.html',
                'media.html': 'media.html',
                'kalender.html': 'calendar.html',
                'undervisningsserier.html': 'teaching.html',
                'personvern.html': 'privacy.html',
                'tilgjengelighet.html': 'accessibility.html',
                'blogg-post-1.html': 'blog-post-1.html',
                'blogg-post-2.html': 'blog-post-2.html',
                'blogg-post-3.html': 'blog-post-3.html',
                'blogg-post-4.html': 'blog-post-4.html',
                'blogg-post-5.html': 'blog-post-5.html'
            },
            'es': {
                'index.html': 'index.html',
                'om-oss.html': 'sobre-nosotros.html',
                'arrangementer.html': 'eventos.html',
                'kontakt.html': 'contacto.html',
                'donasjoner.html': 'donaciones.html',
                'for-menigheter.html': 'para-iglesias.html',
                'for-bedrifter.html': 'para-empresas.html',
                'bnn.html': 'bnn.html',
                'arrangement-detaljer.html': 'detalles-evento.html',
                'blogg.html': 'blog.html',
                'blogg-post.html': 'blog-post.html',
                'media.html': 'media.html',
                'kalender.html': 'calendario.html',
                'undervisningsserier.html': 'ensenanza.html',
                'personvern.html': 'privacidad.html',
                'tilgjengelighet.html': 'accesibilidad.html',
                'blogg-post-1.html': 'blog-post-1.html',
                'blogg-post-2.html': 'blog-post-2.html',
                'blogg-post-3.html': 'blog-post-3.html',
                'blogg-post-4.html': 'blog-post-4.html',
                'blogg-post-5.html': 'blog-post-5.html'
            }
        };

        let result = path;
        if (mappings[targetLang]) {
            for (const [no, translated] of Object.entries(mappings[targetLang])) {
                if (path.endsWith(no)) {
                    result = path.replace(no, translated);
                    break;
                }
            }
        } else if (targetLang === 'no') {
            // Reverse mapping
            const allMappings = { ...mappings.en, ...mappings.es };
            for (const [no, translated] of Object.entries(allMappings)) {
                if (path.endsWith(translated)) {
                    result = path.replace(translated, no);
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
                const lang = langBtn.getAttribute('data-lang');
                const href = langBtn.getAttribute('href') || '';
                this.setLanguage(lang, true, href);
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
