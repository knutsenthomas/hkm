/**
 * HKM i18n Manager
 * Handles language detection, switching, and persisting preferences.
 */

const i18nManager = {
    languages: ['no', 'en', 'es'],
    defaultLang: 'no',
    storageKey: 'hkm_preferred_lang',
    knownFiles: {
        en: new Set([
            'about.html', 'accessibility.html', 'blog-post-1.html', 'blog-post-2.html',
            'blog-post-3.html', 'blog-post-4.html', 'blog-post-5.html', 'blog-post.html',
            'blog.html', 'bnn.html', 'calendar.html', 'contact.html', 'donations.html',
            'event-details.html', 'events.html', 'for-businesses.html', 'for-churches.html',
            'index.html', 'media.html', 'podcast.html', 'privacy.html',
            'regular-donors.html', 'teaching.html', 'youtube.html'
        ]),
        es: new Set([
            'accesibilidad.html', 'blog-post-1.html', 'blog-post-2.html',
            'blog-post-3.html', 'blog-post-4.html', 'blog-post-5.html', 'blog-post.html',
            'blog.html', 'bnn.html', 'calendario.html', 'contacto.html',
            'detalles-evento.html', 'donaciones.html', 'donantes-regulares.html',
            'ensenanza.html', 'eventos.html', 'index.html', 'media.html',
            'para-empresas.html', 'para-iglesias.html', 'podcast.html',
            'privacidad.html', 'sobre-nosotros.html', 'youtube.html'
        ])
    },

    init() {
        this.detectLanguage();
        this.bindEvents();
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

        if (redirect) {
            this.redirectToLanguage(lang);
        }
    },

    /**
     * Navigates to the corresponding page in the target language.
     */
    redirectToLanguage(lang) {
        const currentPath = window.location.pathname;
        const currentFile = currentPath.split('/').pop() || 'index.html';
        const mappedFile = this.mapFileName(currentFile, lang);
        const insideLangFolder = currentPath.includes('/en/') || currentPath.includes('/es/');
        let newPath = '';

        if (lang === 'no') {
            newPath = insideLangFolder ? `../${mappedFile}` : mappedFile;
        } else {
            const safeTargetFile = this.knownFiles[lang].has(mappedFile) ? mappedFile : 'index.html';
            newPath = insideLangFolder ? `../${lang}/${safeTargetFile}` : `${lang}/${safeTargetFile}`;
        }

        window.location.href = newPath;
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
                'undervisning.html': 'teaching.html',
                'bibelstudier.html': 'teaching.html',
                'seminarer.html': 'teaching.html',
                'kurs.html': 'teaching.html',
                'reisevirksomhet.html': 'events.html',
                'bli-fast-giver.html': 'regular-donors.html',
                'personvern.html': 'privacy.html',
                'tilgjengelighet.html': 'accessibility.html',
                'podcast.html': 'podcast.html',
                'youtube.html': 'youtube.html',
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
                'undervisning.html': 'ensenanza.html',
                'bibelstudier.html': 'ensenanza.html',
                'seminarer.html': 'ensenanza.html',
                'kurs.html': 'ensenanza.html',
                'reisevirksomhet.html': 'eventos.html',
                'bli-fast-giver.html': 'donantes-regulares.html',
                'personvern.html': 'privacidad.html',
                'tilgjengelighet.html': 'accesibilidad.html',
                'podcast.html': 'podcast.html',
                'youtube.html': 'youtube.html',
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
                if (String(path).endsWith(no)) {
                    result = String(path).replace(no, translated);
                    break;
                }
            }
        } else if (targetLang === 'no') {
            // Reverse mapping
            const allMappings = { ...mappings.en, ...mappings.es };
            for (const [no, translated] of Object.entries(allMappings)) {
                if (String(path).endsWith(translated)) {
                    result = String(path).replace(translated, no);
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
