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
        const path = window.location.pathname;
        let lang = null;

        // Priority 1: URL path (e.g., /en/ or /es/)
        if (path.includes('/en/')) lang = 'en';
        else if (path.includes('/es/')) lang = 'es';

        // Priority 2: localStorage
        if (!lang) {
            lang = localStorage.getItem(this.storageKey);
        }

        // Priority 3: default
        if (!lang) {
            lang = this.defaultLang;
        }

        this.setLanguage(lang, false);
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

        let newPath = '';

        // Remove existing lang folders from path
        let cleanPath = currentFile;
        // If we are deep in a subdirectory, this logic might need adjustment, 
        // but for HKM, most files are at root or one level deep.

        if (lang === 'no') {
            newPath = `../${currentFile}`; // Moving up from /en/ or /es/
            // If already at root, just currentFile
            if (!currentPath.includes('/en/') && !currentPath.includes('/es/')) {
                newPath = currentFile;
            }
        } else {
            // Targetting EN or ES
            if (currentPath.includes('/en/') || currentPath.includes('/es/')) {
                // Switching between EN/ES
                newPath = `../${lang}/${currentFile}`;
            } else {
                // Moving from root to lang folder
                newPath = `${lang}/${currentFile}`;
            }
        }

        // Special mappings (e.g., om-oss.html -> about.html)
        newPath = this.mapFileName(newPath, lang);

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
