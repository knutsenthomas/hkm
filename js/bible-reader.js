// js/bible-reader.js
import { firebaseService } from './firebase-service.js';
import { biblicalCharacters } from './bibelske-personer-data.js';
import { getBibleBookIntroduction } from './bible-book-introductions.js';

const BIBLE_PROJECT_VIDEOS = {
    // Law/Pentateuch
    '1': { no: { title: 'Genesis 1-11', id: 'gGOI1KNVHUU' }, en: { title: 'Genesis 1-11', id: 'GQI72THyO5I' } },
    'GEN': { no: { title: 'Genesis 1-11', id: 'gGOI1KNVHUU' }, en: { title: 'Genesis 1-11', id: 'GQI72THyO5I' } },
    
    '2': { no: { title: 'Andre Mosebok 1-18', id: 'gT1Ea209tK8' }, en: { title: 'Exodus 1-18', id: '0zf-G4v4n9M' } },
    'EXO': { no: { title: 'Andre Mosebok 1-18', id: 'gT1Ea209tK8' }, en: { title: 'Exodus 1-18', id: '0zf-G4v4n9M' } },
    
    '3': { no: { title: 'Tredje Mosebok', id: 'd_xVzZ9e7hI' }, en: { title: 'Leviticus', id: 'WmvyrLXoQDM' } },
    'LEV': { no: { title: 'Tredje Mosebok', id: 'd_xVzZ9e7hI' }, en: { title: 'Leviticus', id: 'WmvyrLXoQDM' } },
    
    '4': { en: { title: 'Numbers', id: 'tp5MI_1PK2E' } },
    'NUM': { en: { title: 'Numbers', id: 'tp5MI_1PK2E' } },
    
    '5': { en: { title: 'Deuteronomy', id: 'q5QEJ6p4gqA' } },
    'DEU': { en: { title: 'Deuteronomy', id: 'q5QEJ6p4gqA' } },

    // History
    '6': { en: { title: 'Joshua', id: 'JqOqUAQIyeQ' } },
    'JOS': { en: { title: 'Joshua', id: 'JqOqUAQIyeQ' } },
    
    '7': { en: { title: 'Judges', id: 'kOYy8iCfI40' } },
    'JDG': { en: { title: 'Judges', id: 'kOYy8iCfI40' } },
    
    '8': { no: { title: 'Rut', id: '134KT08Xtx0' }, en: { title: 'Ruth', id: '0h1eoBeR4Jk' } },
    'RUT': { no: { title: 'Rut', id: '134KT08Xtx0' }, en: { title: 'Ruth', id: '0h1eoBeR4Jk' } },
    
    '9': { en: { title: '1 Samuel', id: 'QGOqiZcjF7o' } },
    '1SA': { en: { title: '1 Samuel', id: 'QGOqiZcjF7o' } },
    
    '10': { en: { title: '2 Samuel', id: 'YvoWDXcUMdU' } },
    '2SA': { en: { title: '2 Samuel', id: 'YvoWDXcUMdU' } },
    
    '11': { en: { title: 'Kings', id: 'bVFW3w19574' } },
    '1KI': { en: { title: 'Kings', id: 'bVFW3w19574' } },
    '12': { en: { title: 'Kings', id: 'bVFW3w19574' } },
    '2KI': { en: { title: 'Kings', id: 'bVFW3w19574' } },
    
    '13': { en: { title: 'Chronicles', id: 'HR7xEgR1ToU' } },
    '1CH': { en: { title: 'Chronicles', id: 'HR7xEgR1ToU' } },
    '14': { en: { title: 'Chronicles', id: 'HR7xEgR1ToU' } },
    '2CH': { en: { title: 'Chronicles', id: 'HR7xEgR1ToU' } },
    
    '15': { en: { title: 'Ezra-Nehemiah', id: 'm5qcDYyG1zc' } },
    'EZR': { en: { title: 'Ezra-Nehemiah', id: 'm5qcDYyG1zc' } },
    '16': { en: { title: 'Ezra-Nehemiah', id: 'm5qcDYyG1zc' } },
    'NEH': { en: { title: 'Ezra-Nehemiah', id: 'm5qcDYyG1zc' } },
    
    '17': { no: { title: 'Ester', id: 'VUZbtPnTLes' }, en: { title: 'Esther', id: 'oJJg6Z-8p4c' } },
    'EST': { no: { title: 'Ester', id: 'VUZbtPnTLes' }, en: { title: 'Esther', id: 'oJJg6Z-8p4c' } },

    // Wisdom/Poetry
    '18': { en: { title: 'Job', id: 'xQ5WvT2sDM' } },
    'JOB': { en: { title: 'Job', id: 'xQ5WvT2sDM' } },
    
    '19': { en: { title: 'Psalms', id: 'dpny224vms0' } },
    'PSA': { en: { title: 'Psalms', id: 'dpny224vms0' } },
    
    '20': { no: { title: 'Salomos ordspråk', id: 'mCx1Z_r-INQ' }, en: { title: 'Proverbs Overview', id: 'AzmYV8G2w8A' } },
    'PRO': { no: { title: 'Salomos ordspråk', id: 'mCx1Z_r-INQ' }, en: { title: 'Proverbs Overview', id: 'AzmYV8G2w8A' } },
    
    '21': { en: { title: 'Ecclesiastes', id: 'lrsQ1tc-2wk' } },
    'ECC': { en: { title: 'Ecclesiastes', id: 'lrsQ1tc-2wk' } },
    
    '22': { en: { title: 'Song of Songs', id: '4KC7YE3DuOw' } },
    'SNG': { en: { title: 'Song of Songs', id: '4KC7YE3DuOw' } },

    // Major Prophets
    '23': { en: { title: 'Isaiah Part 1', id: 'd0A6Uchb1F8' } },
    'ISA': { en: { title: 'Isaiah Part 1', id: 'd0A6Uchb1F8' } },
    
    '24': { en: { title: 'Jeremiah', id: 'RSK36cHbrk0' } },
    'JER': { en: { title: 'Jeremiah', id: 'RSK36cHbrk0' } },
    
    '25': { en: { title: 'Lamentations', id: 'p8GDFPd373E' } },
    'LAM': { en: { title: 'Lamentations', id: 'p8GDFPd373E' } },
    
    '26': { en: { title: 'Ezekiel Part 1', id: 'sDePx156Vd0' } },
    'EZK': { en: { title: 'Ezekiel Part 1', id: 'sDePx156Vd0' } },
    
    '27': { en: { title: 'Daniel', id: '9cSC9uobtPM' } },
    'DAN': { en: { title: 'Daniel', id: '9cSC9uobtPM' } },

    // Minor Prophets
    '28': { en: { title: 'Hosea', id: 'kE6SZ1ogqUo' } },
    'HOS': { en: { title: 'Hosea', id: 'kE6SZ1ogqUo' } },
    
    '29': { en: { title: 'Joel', id: 'mGgWaPGpGz4' } },
    'JOL': { en: { title: 'Joel', id: 'mGgWaPGpGz4' } },
    
    '30': { en: { title: 'Amos', id: 'e_y1eCqO03U' } },
    'AMO': { en: { title: 'Amos', id: 'e_y1eCqO03U' } },
    
    '31': { en: { title: 'Obadiah', id: 'i4ogCrEqG5s' } },
    'OBD': { en: { title: 'Obadiah', id: 'i4ogCrEqG5s' } },
    
    '32': { no: { title: 'Jona', id: 'W0-5F1nko8E' }, en: { title: 'Jonah', id: 'dLIasUb_YpU' } },
    'JON': { no: { title: 'Jona', id: 'W0-5F1nko8E' }, en: { title: 'Jonah', id: 'dLIasUb_YpU' } },
    
    '33': { en: { title: 'Micah', id: 'MFEUMcrZQDw' } },
    'MIC': { en: { title: 'Micah', id: 'MFEUMcrZQDw' } },
    
    '34': { en: { title: 'Nahum', id: 'Y30DanA5EhU' } },
    'NAM': { en: { title: 'Nahum', id: 'Y30DanA5EhU' } },
    
    '35': { en: { title: 'Habakkuk', id: '2KqK6aG2w8A' } },
    'HAB': { en: { title: 'Habakkuk', id: '2KqK6aG2w8A' } },
    
    '36': { en: { title: 'Zephaniah', id: 'oJJg6Z-8p4c' } },
    'ZEP': { en: { title: 'Zephaniah', id: 'oJJg6Z-8p4c' } },
    
    '37': { en: { title: 'Haggai', id: 'hHe9Mhfyv0w' } },
    'HAG': { en: { title: 'Haggai', id: 'hHe9Mhfyv0w' } },
    
    '38': { en: { title: 'Zechariah', id: '1r_1Mhfyv0w' } },
    'ZEC': { en: { title: 'Zechariah', id: '1r_1Mhfyv0w' } },
    
    '39': { en: { title: 'Malachi', id: 'oG9-ctfnX6o' } },
    'MAL': { en: { title: 'Malachi', id: 'oG9-ctfnX6o' } },

    // Gospels
    '40': { en: { title: 'Matthew Part 1', id: 'qO7OnQDdxwc' } },
    'MAT': { en: { title: 'Matthew Part 1', id: 'qO7OnQDdxwc' } },
    
    '41': { en: { title: 'Mark', id: 'HGHqu9-RaCg' } },
    'MRK': { en: { title: 'Mark', id: 'HGHqu9-RaCg' } },
    
    '42': { en: { title: 'Luke Part 1', id: 'XIb_dCIxzr0' } },
    'LUK': { en: { title: 'Luke Part 1', id: 'XIb_dCIxzr0' } },
    
    '43': { no: { title: 'Johannesevangeliet 1-12', id: 'q1jzIc_o_DA' }, en: { title: 'John Part 1', id: 'G-2e9mMf7E8' } },
    'JHN': { no: { title: 'Johannesevangeliet 1-12', id: 'q1jzIc_o_DA' }, en: { title: 'John Part 1', id: 'G-2e9mMf7E8' } },

    // History NT
    '44': { no: { title: 'Apostlenes gjerninger 1-12', id: 'ITkcNnWj3Qc' }, en: { title: 'Acts Part 1', id: 'CGbGw8oFCe4' } },
    'ACT': { no: { title: 'Apostlenes gjerninger 1-12', id: 'ITkcNnWj3Qc' }, en: { title: 'Acts Part 1', id: 'CGbGw8oFCe4' } },

    // Epistles
    '45': { no: { title: 'Romerne 1-4', id: 'YacjnTUJfvU' }, en: { title: 'Romans Part 1', id: 'ej2mF4d90PI' } },
    'ROM': { no: { title: 'Romerne 1-4', id: 'YacjnTUJfvU' }, en: { title: 'Romans Part 1', id: 'ej2mF4d90PI' } },
    
    '46': { en: { title: '1 Corinthians', id: 'vUR1c3c9JmY' } },
    '1CO': { en: { title: '1 Corinthians', id: 'vUR1c3c9JmY' } },
    
    '47': { en: { title: '2 Corinthians', id: 'c7GpPgZZ_QQ' } },
    '2CO': { en: { title: '2 Corinthians', id: 'c7GpPgZZ_QQ' } },
    
    '48': { en: { title: 'Galatians', id: 'vmx4sf97MhY' } },
    'GAL': { en: { title: 'Galatians', id: 'vmx4sf97MhY' } },
    
    '49': { en: { title: 'Ephesians', id: 'Y7oWDXcUMdU' } },
    'EPH': { en: { title: 'Ephesians', id: 'Y7oWDXcUMdU' } },
    
    '50': { en: { title: 'Philippians', id: 'oG9-ctfnX6o' } },
    'PHP': { en: { title: 'Philippians', id: 'oG9-ctfnX6o' } },
    
    '51': { en: { title: 'Colossians', id: 'pYh_wBPy0aE' } },
    'COL': { en: { title: 'Colossians', id: 'pYh_wBPy0aE' } },
    
    '52': { en: { title: '1 Thessalonians', id: 'kE6SZ1ogqUo' } },
    '1TH': { en: { title: '1 Thessalonians', id: 'kE6SZ1ogqUo' } },
    
    '53': { en: { title: '2 Thessalonians', id: 'oJJg6Z-8p4c' } },
    '2TH': { en: { title: '2 Thessalonians', id: 'oJJg6Z-8p4c' } },
    
    '54': { en: { title: '1 Timothy', id: 'oG9-ctfnX6o' } },
    '1TI': { en: { title: '1 Timothy', id: 'oG9-ctfnX6o' } },
    
    '55': { en: { title: '2 Timothy', id: '1r_1Mhfyv0w' } },
    '2TI': { en: { title: '2 Timothy', id: '1r_1Mhfyv0w' } },
    
    '56': { en: { title: 'Titus', id: 'P8H122k' } },
    'TIT': { en: { title: 'Titus', id: 'P8H122k' } },
    
    '57': { en: { title: 'Philemon', id: 'aW983lG1zc' } },
    'PHM': { en: { title: 'Philemon', id: 'aW983lG1zc' } },
    
    '58': { en: { title: 'Hebrews', id: '1r_1Mhfyv0w' } },
    'HEB': { en: { title: 'Hebrews', id: '1r_1Mhfyv0w' } },
    
    '59': { en: { title: 'James', id: '1r_1Mhfyv0w' } },
    'JAS': { en: { title: 'James', id: '1r_1Mhfyv0w' } }
};

class BibleReader {
    getFirestore() {
        if (firebaseService) {
            if (!firebaseService.isInitialized) {
                firebaseService.tryAutoInit();
            }
            if (firebaseService.isInitialized && firebaseService.db) {
                return firebaseService.db;
            }
        }
        if (window.firebase && typeof firebase.firestore === 'function') {
            try {
                if (!firebase.apps.length && window.firebaseConfig) {
                    firebase.initializeApp(window.firebaseConfig);
                }
                return firebase.firestore();
            } catch (e) {
                console.warn("[BibleReader] firebase.firestore() threw:", e);
            }
        }
        return null;
    }

    async getFirestoreAsync(timeoutMs = 10000) {
        let db = this.getFirestore();
        if (db) return db;
        const start = Date.now();
        while (Date.now() - start < timeoutMs) {
            await new Promise(r => setTimeout(r, 100));
            db = this.getFirestore();
            if (db) return db;
        }
        return null;
    }

    getServerTimestamp() {
        if (window.firebase && typeof firebase.firestore === 'function' && firebase.firestore.FieldValue) {
            try {
                return firebase.firestore.FieldValue.serverTimestamp();
            } catch (e) {
                console.warn("[BibleReader] serverTimestamp failed, using local Date:", e);
            }
        }
        return new Date();
    }

    safeSetLocalStorage(key, value) {
        try {
            localStorage.setItem(key, value);
            return true;
        } catch (e) {
            console.warn(`[BibleReader] Failed to set localStorage for "${key}":`, e);
            return false;
        }
    }

    safeGetLocalStorage(key) {
        try {
            return localStorage.getItem(key);
        } catch (e) {
            console.warn(`[BibleReader] Failed to get localStorage for "${key}":`, e);
            return null;
        }
    }

    safeRemoveLocalStorage(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (e) {
            console.warn(`[BibleReader] Failed to remove localStorage for "${key}":`, e);
            return false;
        }
    }

    constructor() {
        this.bibles = [];
        this.books = [];
        this.chapters = [];
        const activeLang = document.documentElement.lang || 'no';
        let defaultBible = 'OPENBIBLE_NB';
        if (activeLang === 'en') defaultBible = 'WEB';
        else if (activeLang === 'es') defaultBible = 'RV1960';
        this.selectedBibleId = this.safeGetLocalStorage(`hkm_bible_translation_${activeLang}`) || defaultBible;
        this.selectedBookId = '';
        this.selectedChapterId = '';
        this.activeChapterData = null;
        
        let bookmarks = [];
        try {
            const rawBookmarks = this.safeGetLocalStorage('hkm_bible_bookmarks');
            if (rawBookmarks) bookmarks = JSON.parse(rawBookmarks) || [];
        } catch (e) {
            console.warn("[BibleReader] Failed to parse bookmarks:", e);
        }
        this.bookmarks = bookmarks;

        let history = [];
        try {
            const rawHistory = this.safeGetLocalStorage('hkm_bible_history');
            if (rawHistory) history = JSON.parse(rawHistory) || [];
        } catch (e) {
            console.warn("[BibleReader] Failed to parse history:", e);
        }
        this.history = history;

        this.selectedVerses = [];
        this.dictCache = {};

        // UI Settings
        let settings = {
            fontSize: 18,
            fontFamily: 'serif', // 'serif' | 'sans'
            lineHeight: 1.8,
            theme: 'cream', // 'light' | 'cream' | 'dark'
            layout: 'verse' // 'verse' | 'paragraph' (Verse-by-verse is standard default)
        };
        try {
            const rawSettings = this.safeGetLocalStorage('hkm_bible_settings');
            if (rawSettings) {
                const parsed = JSON.parse(rawSettings);
                settings = { ...settings, ...parsed };
            }
        } catch (e) {
            console.warn("[BibleReader] Failed to parse settings:", e);
        }
        this.settings = settings;

        // Migration: Force verse layout by default once for all users
        try {
            const migrated = this.safeGetLocalStorage('hkm_layout_migrated_v3');
            if (!migrated) {
                this.settings.layout = 'verse';
                this.safeSetLocalStorage('hkm_bible_settings', JSON.stringify(this.settings));
                this.safeSetLocalStorage('hkm_layout_migrated_v3', 'true');
            }
        } catch (e) {
            console.warn("[BibleReader] Migration failed:", e);
        }

        // Sync with global dark mode theme
        const activeGlobalTheme = this.safeGetLocalStorage('hkm_theme') || document.documentElement.getAttribute('data-theme') || 'light';
        if (activeGlobalTheme === 'dark') {
            this.settings.theme = 'dark';
        } else if (this.settings.theme === 'dark') {
            this.settings.theme = 'cream';
        }

        // Audio Player State
        this.audioIsPlaying = false;
        this.audioIsPaused = false;
        this.audioVerses = [];
        this.currentAudioIndex = 0;
        this.audioSpeed = 1.0;
        this.audioVoice = this.safeGetLocalStorage('hkm_bible_audio_voice') || 'onyx';
        this.activeUtterance = null;

        // Cache for loaded books/chapters
        this.cache = {
            books: {},
            chapters: {}
        };

        // Touch gesture tracking for scrolling/swipe jitter prevention
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.touchMoved = false;

        this.init();
    }

    t(key) {
        const lang = document.documentElement.lang || 'no';
        const translations = {
            'no': {
                'empty_bookmarks': 'Ingen lagrede vers ennå. Klikk på et vers i teksten for å lagre det.',
                'empty_history': 'Ingen historikk ennå.',
                'empty_notes': 'Ingen notater ennå. Skriv dine refleksjoner her!',
                'no_book_selected': 'Ingen bok valgt.',
                'no_resources_found': 'Ingen relaterte ressurser funnet for denne boken enda.',
                'new_note': 'Nytt notat',
                'fetching_resources': 'Henter relaterte ressurser...',
                'dictionary': 'Ordbok',
                'play_audio': 'Lytt til kapittelet',
                'stop_audio': 'Stopp',
                'pause_audio': 'Pause',
                'playing_verse': 'Leser vers',
                'paused': 'Pauset',
                'extended_btn': 'Vis dypere teologisk analyse',
                'extended_loading': 'Analyserer dypere...',
                'extended_header': 'Dypere analyse',
                'cross_references': 'Kryssreferanser'
            },
            'en': {
                'empty_bookmarks': 'No saved verses yet. Click on a verse in the text to save it.',
                'empty_history': 'No history yet.',
                'empty_notes': 'No notes yet. Write your reflections here!',
                'no_book_selected': 'No book selected.',
                'no_resources_found': 'No related resources found for this book yet.',
                'new_note': 'New Note',
                'fetching_resources': 'Fetching related resources...',
                'dictionary': 'Lexicon',
                'play_audio': 'Listen to chapter',
                'stop_audio': 'Stop',
                'pause_audio': 'Pause',
                'playing_verse': 'Reading verse',
                'paused': 'Paused',
                'extended_btn': 'Show deeper theological analysis',
                'extended_loading': 'Analyzing deeper...',
                'extended_header': 'Deeper analysis',
                'cross_references': 'Cross references'
            },
            'es': {
                'empty_bookmarks': 'Aún no hay versículos guardados. Haz clic en un versículo en el texto para guardarlo.',
                'empty_history': 'Aún no hay historial.',
                'empty_notes': 'Aún no hay notas. ¡Escribe tus reflexiones aquí!',
                'no_book_selected': 'Ningún libro seleccionado.',
                'no_resources_found': 'Aún no se han encontrado recursos relacionados para este libro.',
                'new_note': 'Nueva Nota',
                'fetching_resources': 'Obteniendo recursos relacionados...',
                'dictionary': 'Diccionario',
                'play_audio': 'Escuchar el capítulo',
                'stop_audio': 'Detener',
                'pause_audio': 'Pausar',
                'playing_verse': 'Leyendo versículo',
                'paused': 'Pausado',
                'extended_btn': 'Ver análisis teológico profundo',
                'extended_loading': 'Analizando en detalle...',
                'extended_header': 'Análisis profundo',
                'cross_references': 'Referencias cruzadas'
            }
        };
        return (translations[lang] || translations['no'])[key] || key;
    }

    async init() {
        if (firebaseService) {
            firebaseService.tryAutoInit();
        }
        this.setupDOMElements();
        this.applySettings();
        this.bindEvents();
        this.setupSwipeGestures();
        this.setupModalHistoryNavigation();
        
        // Immediately activate reading plan workspace if plan URL param is present to prevent Bible view flash
        const earlyParams = new URLSearchParams(window.location.search);
        const earlyPlan = earlyParams.get('plan');
        if (earlyPlan) {
            this.activePlanMode = true;
            this.activePlanId = earlyPlan;
            this.activePlanDay = parseInt(earlyParams.get('day'), 10) || null;
            this.injectReadingPlanStyles();

            // Clear static "Johannes 1" headers and reading pane so default Bible text never flashes
            const badge = document.getElementById('current-book-badge');
            const chNum = document.getElementById('current-chapter-number');
            const pane = document.getElementById('bible-reading-pane');
            if (badge) badge.innerText = '';
            if (chNum) chNum.innerText = '';
            if (pane) pane.innerHTML = '';

            if (this.dom.sidebar) {
                this.dom.sidebar.classList.add('reading-plan-active');

                // Instantly hide static Bible book list and headers so "Bibelbøker" never flashes
                const booksListWrapper = this.dom.sidebar.querySelector('.books-list-wrapper');
                if (booksListWrapper) booksListWrapper.style.display = 'none';

                const sidebarHeader = this.dom.sidebar.querySelector('.sidebar-header');
                if (sidebarHeader) sidebarHeader.style.display = 'none';

                const mobileControls = document.getElementById('sidebar-mobile-controls');
                if (mobileControls) mobileControls.style.display = 'none';

                let planSidebar = document.getElementById('reading-plan-sidebar-content');
                if (!planSidebar) {
                    planSidebar = document.createElement('div');
                    planSidebar.id = 'reading-plan-sidebar-content';
                    planSidebar.style.cssText = 'padding: 0; overflow: hidden; height: calc(100% - 60px);';
                    this.dom.sidebar.appendChild(planSidebar);
                }
                planSidebar.style.display = 'block';
                planSidebar.innerHTML = `
                    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; padding: 40px 20px; color: var(--text-muted);">
                        <div class="spinner" style="margin-bottom: 16px; width: 28px; height: 28px; border: 3px solid var(--border-color); border-top-color: var(--bible-primary); border-radius: 50%; animation: spin 1s linear infinite;"></div>
                        <p style="font-size: 14px; font-weight: 600; margin: 0;">Laster leseplan...</p>
                    </div>
                `;
            }
        }
        
        // Listen to Firebase auth state for synchronizing notes (supports lazy-loaded Firebase SDK)
        const setupAuthObserver = () => {
            if (window.firebase && typeof firebase.auth === 'function') {
                try {
                    if (!firebase.apps.length && window.firebaseConfig) {
                        firebase.initializeApp(window.firebaseConfig);
                    }
                    firebase.auth().onAuthStateChanged(async user => {
                        this.currentUser = user;
                        this.loadNotes();
                        await this.loadReadingPlan();
                        if (this.activePlanMode && this.activePlanId) {
                            if (!this._isInitializingPlan && (!this.activePlanData || !this.activePlanData.id)) {
                                this.initReadingPlanMode(this.activePlanId, this.activePlanDay);
                            } else if (this.activePlanMode) {
                                this.renderLeftSidebarReadingPlan();
                            }
                        }
                    });
                    return true;
                } catch (e) {
                    console.warn("[BibleReader] firebase.auth setup failed:", e);
                }
            }
            return false;
        };

        let authObserverSet = setupAuthObserver();
        
        if (!authObserverSet) {
            this.currentUser = null;
            this.loadNotes();
            this.loadReadingPlan();
            
            // Wait for lazy-loaded Firebase to initialize and set up listener
            if (window.firebaseService) {
                window.firebaseService.waitForInitialization(30000).then(initialized => {
                    if (initialized) {
                        setupAuthObserver();
                        const urlParams = new URLSearchParams(window.location.search);
                        const planParam = urlParams.get('plan');
                        const dayParam = urlParams.get('day');
                        if (planParam && (!this.activePlanData || !this.activePlanData.id) && !this._isInitializingPlan) {
                            this.initReadingPlanMode(planParam, dayParam);
                        }
                    }
                });
            }
        }
        
        await this.loadTranslations();
        
        // Handle deep-linking from URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const refParam = urlParams.get('ref'); // e.g. "Joh_3" or "Sal_23_1"
        const bookParam = urlParams.get('book') || urlParams.get('b'); // e.g. "ISA", "GEN", "JOB", "MAT"
        const chapterParam = urlParams.get('chapter') || urlParams.get('c') || '1';
        const genreParam = urlParams.get('genre') || urlParams.get('g');
        const transParam = urlParams.get('trans'); // e.g. "DNB"
        const lexParam = urlParams.get('lex') || urlParams.get('dict'); // e.g. "nåde"
        const planParam = urlParams.get('plan');
        const dayParam = urlParams.get('day');

        if (transParam) {
            this.selectedBibleId = transParam;
            if (this.dom.translationSelect) this.dom.translationSelect.value = transParam;
            const mobileTransSelect = document.getElementById('bible-translation-select-mobile');
            if (mobileTransSelect) mobileTransSelect.value = transParam;
        }

        await this.loadBooks();

        if (planParam) {
            await this.initReadingPlanMode(planParam, dayParam);
        } else {
            // Hide Leseplan tab button by default
            const rpTabBtn = document.getElementById('tab-btn-reading-plan');
            if (rpTabBtn) {
                rpTabBtn.style.display = 'none';
            }

            let targetBook = bookParam;
            if (genreParam) {
                const cleanGenre = genreParam.toLowerCase().trim();
                if (cleanGenre.includes('mose') || cleanGenre.includes('pentateuch')) targetBook = 'GEN';
                else if (cleanGenre.includes('hist')) targetBook = 'JOS';
                else if (cleanGenre.includes('visdom') || cleanGenre.includes('wisdom') || cleanGenre.includes('poesi')) targetBook = 'JOB';
                else if (cleanGenre.includes('profet') || cleanGenre.includes('prophet')) targetBook = 'ISA';
                else if (cleanGenre.includes('evangel') || cleanGenre.includes('gospel')) targetBook = 'MAT';
                else if (cleanGenre.includes('brev') || cleanGenre.includes('epistle')) targetBook = 'ROM';
                else if (cleanGenre.includes('åpenbaring') || cleanGenre.includes('revelation') || cleanGenre.includes('apokalyptisk')) targetBook = 'REV';
            }

            if (refParam) {
                await this.parseAndNavigateToReference(refParam);
            } else if (targetBook) {
                const targetRef = `${targetBook}_${chapterParam}`;
                await this.parseAndNavigateToReference(targetRef);
            } else {
                // Restore last read book and chapter from localStorage if available
                const lastBook = this.safeGetLocalStorage('hkm_bible_last_book');
                const lastChapter = this.safeGetLocalStorage('hkm_bible_last_chapter');
                if (lastBook && lastChapter) {
                    await this.selectBook(lastBook);
                    await this.selectChapter(lastChapter);
                } else {
                    // Load default (John 1 or first book)
                    const defaultBook = this.books.find(b => b.id === '43') || this.books[0]; // John
                    if (defaultBook) {
                        await this.selectBook(defaultBook.id);
                        await this.selectChapter(`${defaultBook.id}_1`);
                    }
                }
            }
        }

        if (lexParam) {
            setTimeout(() => {
                this.lookupWord(lexParam);
            }, 500);
        }
        
        // Remove loading state once reader initialization (including deep-link / reading plan setup) is complete
        if (planParam && (!this.activePlanData || !this.activePlanData.id)) {
            console.log("[BibleReader] Delaying UI reveal because reading plan data is still loading...");
        } else {
            if (typeof window.revealPublicUI === 'function') {
                window.revealPublicUI('bible-reader-ready');
            } else {
                document.body.classList.remove('cms-loading');
            }
        }
    }

    setupDOMElements() {
        this.dom = {
            translationSelect: document.getElementById('bible-translation-select'),
            bookSearchInput: document.getElementById('book-search'),
            booksListGt: document.getElementById('books-list-gt'),
            booksListNt: document.getElementById('books-list-nt'),
            chapterSelectorContainer: document.getElementById('chapter-selector-container'),
            chapterGrid: document.getElementById('chapter-grid'),
            readingPane: document.getElementById('bible-reading-pane'),
            currentReferenceTitle: document.getElementById('current-reference-title'),
            currentTranslationAbbr: document.getElementById('current-translation-abbr'),
            currentBookBadge: document.getElementById('current-book-badge'),
            currentChapterNumber: document.getElementById('current-chapter-number'),
            prevChapterBtn: document.getElementById('prev-chapter-btn'),
            nextChapterBtn: document.getElementById('next-chapter-btn'),
            
            // Settings controls
            fontSizeDisplay: document.getElementById('font-size-display'),
            decreaseFontBtn: document.getElementById('btn-decrease-font'),
            increaseFontBtn: document.getElementById('btn-increase-font'),
            fontFamilySelect: document.getElementById('settings-font-family'),
            layoutSelect: document.getElementById('settings-layout'),
            themeSelectors: document.querySelectorAll('.theme-option'),
            
            // Navigation trigger/mobile
            mobileSidebarToggle: document.getElementById('mobile-sidebar-toggle'),
            sidebar: document.getElementById('bible-sidebar'),
            navRight: document.getElementById('bible-nav-right'),
            mobileNavRightToggle: document.getElementById('mobile-nav-right-toggle'),
            
            // Search / Jump reference
            quickSearchInput: document.getElementById('bible-quick-search'),
            quickSearchForm: document.getElementById('bible-quick-search-form'),
            
            // Dictionary / Definition Panel
            dictDrawer: document.getElementById('dictionary-drawer'),
            dictWordTitle: document.getElementById('dict-word-title'),
            dictCategory: document.getElementById('dict-category'),
            dictDefinition: document.getElementById('dict-definition'),
            dictContextualNote: document.getElementById('dict-contextual-note'),
            closeDictBtn: document.getElementById('close-dict-btn'),
            toggleExpandDictBtn: document.getElementById('toggle-expand-dict-btn'),
            dictSpinner: document.getElementById('dict-spinner'),
            dictContentWrap: document.getElementById('dict-content-wrap'),
            dictManualTrigger: document.getElementById('dict-manual-trigger'),
            dictSearchInput: document.getElementById('dict-search-input'),
            dictSearchSubmitBtn: document.getElementById('dict-search-submit-btn'),
            dictWelcomeState: document.getElementById('dict-welcome-state'),
            dictExtendedBtn: document.getElementById('dict-extended-btn'),
            dictExtendedBtnText: document.getElementById('dict-extended-btn-text'),
            dictExtendedSection: document.getElementById('dict-extended-section'),
            dictExtendedText: document.getElementById('dict-extended-text'),
            dictExtendedTriggerWrap: document.getElementById('dict-extended-trigger-wrap'),
            dictHistoricalSection: document.getElementById('dict-historical-section'),
            dictHistoricalList: document.getElementById('dict-historical-list'),
            
            // Bookmarks / History sidebar
            bookmarksList: document.getElementById('bookmarks-list'),
            historyList: document.getElementById('history-list'),
            notesList: document.getElementById('notes-list'),
            readingPlanContent: document.getElementById('tab-reading-plan-content'),

            // Verse Context Toolbar & Chapter Lookup
            verseToolbar: document.getElementById('verse-context-toolbar'),
            toolbarBtnBookmark: document.getElementById('toolbar-btn-bookmark'),
            toolbarBtnRange: document.getElementById('toolbar-btn-range'),
            toolbarBtnLookup: document.getElementById('toolbar-btn-lookup'),
            toolbarBtnShare: document.getElementById('toolbar-btn-share'),
            toolbarBtnImage: document.getElementById('toolbar-btn-image'),
            toolbarBtnDownload: document.getElementById('toolbar-btn-download'),
            toolbarBtnSaveUser: document.getElementById('toolbar-btn-save-user'),
            toolbarBtnClear: document.getElementById('toolbar-btn-clear'),
            toolbarBookmarkText: document.getElementById('toolbar-bookmark-text'),
            btnLookupChapter: document.getElementById('btn-lookup-chapter'),

            // Cross references
            dictCrossRefsSection: document.getElementById('dict-cross-refs-section'),
            dictCrossRefsList: document.getElementById('dict-cross-references'),
            dictOriginalWordsSection: document.getElementById('dict-original-words-section'),
            dictOriginalWordsList: document.getElementById('dict-original-words-list'),
            chapterCrossRefsSection: document.getElementById('chapter-cross-references-section'),
            chapterCrossRefsList: document.getElementById('chapter-cross-references')
        };

        // Restructure Bible reader tools into bottom floating settings popover dynamically
        const popover = document.getElementById('floating-settings-popover');
        if (popover) {
            // 1. Move translation select to its own row
            const translationSelect = document.getElementById('bible-translation-select');
            if (translationSelect) {
                const row = document.createElement('div');
                row.className = 'settings-row';
                const wrapper = translationSelect.closest('.select-wrapper') || translationSelect;
                row.appendChild(wrapper);
                popover.appendChild(row);
            }
            
            // 2. Move quick search form to its own row
            const searchForm = document.getElementById('bible-quick-search-form');
            if (searchForm) {
                const row = document.createElement('div');
                row.className = 'settings-row';
                row.appendChild(searchForm);
                popover.appendChild(row);
            }
            
            // 2. Move dictionary trigger, reading mode, bookmarks into an icon button strip
            const dictBtn = document.getElementById('dict-manual-trigger');
            const readBtn = document.getElementById('btn-toggle-reading-mode');
            const bookmarkBtn = document.getElementById('mobile-nav-right-toggle');
            
            if (dictBtn || readBtn || bookmarkBtn) {
                const strip = document.createElement('div');
                strip.className = 'popover-icon-strip';

                const docLang = document.documentElement.lang || 'no';
                const labels = {
                    no: { dict: 'Leksikon', read: 'Lesemodus', user: 'Min side' },
                    en: { dict: 'Lexicon', read: 'Reader', user: 'My Page' },
                    es: { dict: 'Léxico', read: 'Lectura', user: 'Mi página' }
                };
                const langLbl = labels[docLang] || labels.no;
                
                if (dictBtn) {
                    dictBtn.className = 'popover-icon-btn';
                    if (!dictBtn.querySelector('.btn-label')) {
                        const span = document.createElement('span');
                        span.className = 'btn-label';
                        span.textContent = langLbl.dict;
                        dictBtn.appendChild(span);
                    }
                    strip.appendChild(dictBtn);
                }
                if (readBtn) {
                    readBtn.className = 'popover-icon-btn';
                    if (!readBtn.querySelector('.btn-label')) {
                        const span = document.createElement('span');
                        span.className = 'btn-label';
                        span.textContent = langLbl.read;
                        readBtn.appendChild(span);
                    }
                    strip.appendChild(readBtn);
                }
                if (bookmarkBtn) {
                    bookmarkBtn.className = 'popover-icon-btn';
                    if (!bookmarkBtn.querySelector('.btn-label')) {
                        const span = document.createElement('span');
                        span.className = 'btn-label';
                        span.textContent = langLbl.user;
                        bookmarkBtn.appendChild(span);
                    }
                    strip.appendChild(bookmarkBtn);
                }
                popover.appendChild(strip);
            }
            
            // 3. Move settings dropdown rows
            const settingsDropdown = document.getElementById('settings-dropdown');
            if (settingsDropdown) {
                const rows = Array.from(settingsDropdown.querySelectorAll('.settings-row'));
                rows.forEach(r => popover.appendChild(r));
                settingsDropdown.remove();
            }
            
            const toggleBackdrop = (show) => {
                const backdrop = document.getElementById('hkm-sheet-backdrop-overlay');
                if (backdrop) {
                    if (show) backdrop.classList.add('active');
                    else backdrop.classList.remove('active');
                }
                const mainFooter = document.querySelector('footer.footer');
                if (mainFooter) {
                    if (show) mainFooter.style.setProperty('display', 'none', 'important');
                    else mainFooter.style.removeProperty('display');
                }
            };

            // 4. Set up click listener for the floating settings button to toggle popover
            const settingsBtn = document.getElementById('floating-settings-btn');
            if (settingsBtn) {
                settingsBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const chapPopover = document.getElementById('floating-chapter-popover');
                    if (chapPopover) chapPopover.classList.remove('active');
                    const isActive = popover.classList.toggle('active');
                    toggleBackdrop(isActive);
                    if (isActive) {
                        this.pushModalHistoryState('floating-settings-popover');
                    } else if (window.history.state && window.history.state.hkmModalActive) {
                        window.history.back();
                    }
                });
                
                // Prevent closing when clicking inside popover
                popover.addEventListener('click', (e) => {
                    e.stopPropagation();
                });
            }
            
            // 5. Set up click listener for the book/chapter pill
            const pill = document.getElementById('floating-nav-info-pill');
            if (pill) {
                pill.addEventListener('click', (e) => {
                    e.stopPropagation();
                    popover.classList.remove('active');
                    const chapPopover = document.getElementById('floating-chapter-popover');
                    if (chapPopover) {
                        // Reset view to chapters on open
                        if (!chapPopover.classList.contains('active')) {
                            const headerChapters = document.getElementById('floating-popover-header-chapters');
                            const headerBooks = document.getElementById('floating-popover-header-books');
                            const chapGrid = document.getElementById('floating-chapter-grid');
                            const booksCont = document.getElementById('floating-books-container');

                            if (headerChapters) headerChapters.style.display = 'flex';
                            if (headerBooks) headerBooks.style.display = 'none';
                            if (chapGrid) chapGrid.style.display = 'grid';
                            if (booksCont) booksCont.style.display = 'none';
                        }
                        const isActive = chapPopover.classList.toggle('active');
                        toggleBackdrop(isActive);
                        if (isActive) {
                            this.pushModalHistoryState('floating-chapter-popover');
                        } else if (window.history.state && window.history.state.hkmModalActive) {
                            window.history.back();
                        }
                    }
                });
                
                const chapPopover = document.getElementById('floating-chapter-popover');
                if (chapPopover) {
                    chapPopover.addEventListener('click', (e) => {
                        e.stopPropagation();
                    });
                }
            }

            // Set up show books view trigger inside popover
            const btnShowBooks = document.getElementById('btn-show-books-view');
            if (btnShowBooks) {
                btnShowBooks.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const headerChapters = document.getElementById('floating-popover-header-chapters');
                    const headerBooks = document.getElementById('floating-popover-header-books');
                    const chapGrid = document.getElementById('floating-chapter-grid');
                    const booksCont = document.getElementById('floating-books-container');

                    if (headerChapters) headerChapters.style.display = 'none';
                    if (headerBooks) headerBooks.style.display = 'flex';
                    if (chapGrid) chapGrid.style.display = 'none';
                    if (booksCont) {
                        booksCont.style.display = 'flex';
                        await this.renderFloatingBooks();
                    }
                });
            }

            // Set up back to chapters view trigger inside popover
            const btnShowChapters = document.getElementById('btn-show-chapters-view');
            if (btnShowChapters) {
                btnShowChapters.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const headerChapters = document.getElementById('floating-popover-header-chapters');
                    const headerBooks = document.getElementById('floating-popover-header-books');
                    const chapGrid = document.getElementById('floating-chapter-grid');
                    const booksCont = document.getElementById('floating-books-container');

                    if (headerChapters) headerChapters.style.display = 'flex';
                    if (headerBooks) headerBooks.style.display = 'none';
                    if (chapGrid) chapGrid.style.display = 'grid';
                    if (booksCont) booksCont.style.display = 'none';
                });
            }

            // Close all floating popovers when clicking anywhere else
            document.addEventListener('click', () => {
                popover?.classList.remove('active');
                document.getElementById('floating-chapter-popover')?.classList.remove('active');
                toggleBackdrop(false);
            });
        }
    }

    bindEvents() {
        const openTransModalHandler = (e) => {
            if (e) {
                e.preventDefault();
                e.stopPropagation();
            }
            this.openTranslationModal();
        };

        if (this.dom.translationSelect) {
            this.dom.translationSelect.addEventListener('mousedown', openTransModalHandler);
            this.dom.translationSelect.addEventListener('touchstart', openTransModalHandler);
            this.dom.translationSelect.addEventListener('click', openTransModalHandler);
        }

        const mobileTransSelect = document.getElementById('bible-translation-select-mobile');
        if (mobileTransSelect) {
            mobileTransSelect.addEventListener('mousedown', openTransModalHandler);
            mobileTransSelect.addEventListener('touchstart', openTransModalHandler);
            mobileTransSelect.addEventListener('click', openTransModalHandler);
        }

        const translationModalCard = document.querySelector('#translation-selection-modal .translation-modal-card');
        if (translationModalCard) {
            const translationModal = document.getElementById('translation-selection-modal');
            this.setupBottomSheetSwipeDown(translationModalCard, () => {
                if (translationModal) {
                    translationModal.classList.remove('active');
                    translationModal.style.display = 'none';
                }
            });
        }

        // Book search
        if (this.dom.bookSearchInput) {
            this.dom.bookSearchInput.addEventListener('input', (e) => {
                this.filterBooks(e.target.value);
            });
        }

        // Mobile settings collapsible toggle
        const settingsHeader = document.getElementById('mobile-settings-header');
        const settingsCard = document.getElementById('mobile-settings-card');
        const settingsChevron = document.getElementById('mobile-settings-chevron');
        if (settingsHeader && settingsCard) {
            settingsHeader.addEventListener('click', () => {
                const isCollapsed = settingsCard.style.display === 'none';
                if (isCollapsed) {
                    settingsCard.style.display = 'flex';
                    if (settingsChevron) settingsChevron.innerText = 'expand_less';
                } else {
                    settingsCard.style.display = 'none';
                    if (settingsChevron) settingsChevron.innerText = 'expand_more';
                }
            });
        }

        // Font settings
        if (this.dom.decreaseFontBtn) {
            this.dom.decreaseFontBtn.addEventListener('click', () => {
                if (this.settings.fontSize > 12) {
                    this.settings.fontSize -= 2;
                    this.applySettings();
                }
            });
        }
        if (this.dom.increaseFontBtn) {
            this.dom.increaseFontBtn.addEventListener('click', () => {
                if (this.settings.fontSize < 32) {
                    this.settings.fontSize += 2;
                    this.applySettings();
                }
            });
        }
        if (this.dom.fontFamilySelect) {
            this.dom.fontFamilySelect.addEventListener('change', (e) => {
                this.settings.fontFamily = e.target.value;
                this.applySettings();
            });
        }
        if (this.dom.layoutSelect) {
            this.dom.layoutSelect.addEventListener('change', (e) => {
                this.settings.layout = e.target.value;
                this.applySettings();
            });
        }

        // Theme selection
        this.dom.themeSelectors.forEach(btn => {
            btn.addEventListener('click', () => {
                this.settings.theme = btn.dataset.theme;
                this.applySettings();

                // Sync to global theme
                const globalTheme = btn.dataset.theme === 'dark' ? 'dark' : 'light';
                this.safeSetLocalStorage('hkm_theme', globalTheme);
                document.documentElement.setAttribute('data-theme', globalTheme);

                // Sync toggle button icon
                const icons = document.querySelectorAll('.theme-toggle-icon');
                icons.forEach(icon => {
                    icon.textContent = globalTheme === 'dark' ? 'light_mode' : 'dark_mode';
                });
            });
        });

        // Mobile sidebar toggle (Left)
        if (this.dom.mobileSidebarToggle) {
            this.dom.mobileSidebarToggle.addEventListener('click', () => {
                this.dom.sidebar.classList.toggle('active');
            });
        }

        // Mobile sidebar toggle (Right)
        if (this.dom.mobileNavRightToggle) {
            this.dom.mobileNavRightToggle.addEventListener('click', () => {
                this.dom.navRight.classList.toggle('active');
            });
        }

        // Close sidebars when clicking outside on mobile
        document.addEventListener('click', (e) => {
            if (this.dom.sidebar && this.dom.sidebar.classList.contains('active')) {
                if (!this.dom.sidebar.contains(e.target) && e.target !== this.dom.mobileSidebarToggle && !e.target.closest('#mobile-sidebar-toggle')) {
                    this.dom.sidebar.classList.remove('active');
                }
            }
            if (this.dom.navRight && this.dom.navRight.classList.contains('active')) {
                if (!this.dom.navRight.contains(e.target) && e.target !== this.dom.mobileNavRightToggle && !e.target.closest('#mobile-nav-right-toggle')) {
                    this.dom.navRight.classList.remove('active');
                }
            }
        });

        // Reading Mode Sync Helper
        const syncReadingModeButtons = (isActive) => {
            const btns = [
                document.getElementById('btn-toggle-reading-mode'),
                document.getElementById('mobile-reading-mode-btn'),
                document.getElementById('floating-reading-mode-btn')
            ];
            btns.forEach(btn => {
                if (btn) {
                    const icon = btn.querySelector('.material-symbols-outlined');
                    if (icon) {
                        icon.innerText = isActive ? 'close_fullscreen' : 'chrome_reader_mode';
                    }
                    const text = isActive ? 'Avslutt lesemodus' : 'Aktiver lesemodus';
                    if (btn.tagName.toLowerCase() === 'div' || btn.tagName.toLowerCase() === 'button') {
                        btn.title = text;
                    }
                    btn.classList.toggle('active', isActive);
                    const textSpan = btn.querySelector('.btn-text');
                    if (textSpan) {
                        textSpan.innerText = text;
                    }
                }
            });
        };

        // Reading Mode Toggle
        const toggleReadingModeBtn = document.getElementById('btn-toggle-reading-mode');
        if (toggleReadingModeBtn) {
            toggleReadingModeBtn.addEventListener('click', () => {
                const isActive = document.body.classList.toggle('reading-mode-active');
                syncReadingModeButtons(isActive);
            });
        }

        // Floating Nav Reading Mode Toggle
        const floatingReadingModeBtn = document.getElementById('floating-reading-mode-btn');
        if (floatingReadingModeBtn) {
            floatingReadingModeBtn.addEventListener('click', () => {
                const isActive = document.body.classList.toggle('reading-mode-active');
                syncReadingModeButtons(isActive);
            });
        }

        // Mobile-only Quick Search
        const mobileSearchForm = document.getElementById('bible-quick-search-form-mobile');
        const mobileSearchInput = document.getElementById('bible-quick-search-mobile');
        if (mobileSearchForm && mobileSearchInput) {
            mobileSearchForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const refStr = mobileSearchInput.value.trim();
                if (refStr) {
                    await this.parseAndNavigateToReference(refStr);
                    // Close the left sidebar on mobile after navigating
                    if (this.dom.sidebar) this.dom.sidebar.classList.remove('active');
                }
            });
        }

        // Mobile Text Settings Collapsible Panel Toggle
        const mobileTextSettingsBtn = document.getElementById('mobile-text-settings-btn');
        const mobileSettingsPanel = document.getElementById('mobile-settings-panel');
        if (mobileTextSettingsBtn && mobileSettingsPanel) {
            mobileTextSettingsBtn.addEventListener('click', () => {
                const isHidden = mobileSettingsPanel.style.display === 'none' || mobileSettingsPanel.style.display === '';
                mobileSettingsPanel.style.display = isHidden ? 'flex' : 'none';
                mobileTextSettingsBtn.classList.toggle('active', isHidden);
            });
        }

        // Mobile dictionary manual trigger
        const mobileDictBtn = document.getElementById('mobile-dict-btn');
        if (mobileDictBtn) {
            mobileDictBtn.addEventListener('click', () => {
                if (this.dom.dictDrawer) {
                    this.dom.dictDrawer.classList.add('active');
                }
                // Close sidebar on mobile
                if (this.dom.sidebar) {
                    this.dom.sidebar.classList.remove('active');
                }
            });
        }

        // Mobile Reading Mode Toggle
        const mobileReadingModeBtn = document.getElementById('mobile-reading-mode-btn');
        if (mobileReadingModeBtn) {
            mobileReadingModeBtn.addEventListener('click', () => {
                const isActive = document.body.classList.toggle('reading-mode-active');
                syncReadingModeButtons(isActive);
                // Close sidebar on mobile
                if (this.dom.sidebar) {
                    this.dom.sidebar.classList.remove('active');
                }
            });
        }

        // Mobile Font settings
        const decFontMobile = document.getElementById('btn-decrease-font-mobile');
        if (decFontMobile) {
            decFontMobile.addEventListener('click', () => {
                if (this.settings.fontSize > 12) {
                    this.settings.fontSize -= 2;
                    this.applySettings();
                }
            });
        }
        const incFontMobile = document.getElementById('btn-increase-font-mobile');
        if (incFontMobile) {
            incFontMobile.addEventListener('click', () => {
                if (this.settings.fontSize < 32) {
                    this.settings.fontSize += 2;
                    this.applySettings();
                }
            });
        }
        // Segmented Control Event Handlers (Font & Layout)
        document.querySelectorAll('.hkm-segmented-control').forEach(ctrl => {
            const settingName = ctrl.getAttribute('data-setting');
            if (!settingName) return;
            ctrl.querySelectorAll('.segment-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const val = btn.getAttribute('data-value');
                    if (val) {
                        this.settings[settingName] = val;
                        this.applySettings();
                    }
                });
            });
        });

        // Prev/Next Chapter Navigation
        if (this.dom.prevChapterBtn) {
            this.dom.prevChapterBtn.addEventListener('click', () => this.navigateChapter(-1));
        }
        if (this.dom.nextChapterBtn) {
            this.dom.nextChapterBtn.addEventListener('click', () => this.navigateChapter(1));
        }

        // Floating Prev/Next Chapter Navigation
        const floatPrevBtn = document.getElementById('floating-prev-btn');
        if (floatPrevBtn) {
            floatPrevBtn.addEventListener('click', () => this.navigateChapter(-1));
        }
        const floatNextBtn = document.getElementById('floating-next-btn');
        if (floatNextBtn) {
            floatNextBtn.addEventListener('click', () => this.navigateChapter(1));
        }

        // Touch Swipe Gestures to navigate chapters on mobile/tablet
        let touchstartX = 0;
        let touchstartY = 0;
        let touchendX = 0;
        let touchendY = 0;

        const pane = this.dom.readingPane ? this.dom.readingPane.closest('.bible-content-pane') : null;
        if (pane) {
            pane.addEventListener('touchstart', (e) => {
                if (this.dom.verseToolbar && this.dom.verseToolbar.contains(e.target)) return;
                touchstartX = e.changedTouches[0].screenX;
                touchstartY = e.changedTouches[0].screenY;
            }, { passive: true });

            pane.addEventListener('touchend', (e) => {
                if (this.dom.verseToolbar && this.dom.verseToolbar.contains(e.target)) return;
                touchendX = e.changedTouches[0].screenX;
                touchendY = e.changedTouches[0].screenY;
                
                const diffX = touchendX - touchstartX;
                const diffY = touchendY - touchstartY;

                // Trigger swipe navigation if horizontal swipe is significant
                // and vertical movement is minor (ensuring it was not a vertical scroll)
                if (Math.abs(diffX) > 80 && Math.abs(diffY) < 60) {
                    if (diffX < 0) {
                        this.navigateChapter(1); // Swipe left -> Next chapter
                    } else {
                        this.navigateChapter(-1); // Swipe right -> Prev chapter
                    }
                }
            }, { passive: true });
        }

        // Keyboard navigation for study accessibility
        window.addEventListener('keydown', (e) => {
            // Ignore key events if the user is typing in form fields or editable regions
            const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
            if (activeTag === 'input' || activeTag === 'textarea' || document.activeElement.isContentEditable) {
                return;
            }

            if (e.key === 'ArrowLeft') {
                this.navigateChapter(-1);
            } else if (e.key === 'ArrowRight') {
                this.navigateChapter(1);
            } else if (e.key.toLowerCase() === 'b') {
                // Toggle bookmark if verses are selected
                if (this.selectedVerses && this.selectedVerses.length > 0 && this.dom.toolbarBtnBookmark) {
                    e.preventDefault();
                    this.dom.toolbarBtnBookmark.click();
                }
            } else if (e.key === 'Escape') {
                // Clear selection if active
                if (this.selectedVerses && this.selectedVerses.length > 0) {
                    e.preventDefault();
                    this.clearSelection();
                }
            }
        });

        // Quick Search Form
        if (this.dom.quickSearchForm) {
            this.dom.quickSearchForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const query = this.dom.quickSearchInput.value.trim();
                if (query) {
                    this.parseAndNavigateToReference(query);
                }
            });
        }

        // Close Dictionary
        if (this.dom.closeDictBtn) {
            const closeDictHandler = (e) => {
                if (e) {
                    e.preventDefault();
                    e.stopPropagation();
                }
                if (this.dom.dictDrawer) {
                    this.dom.dictDrawer.classList.remove('active');
                    this.dom.dictDrawer.classList.remove('expanded');
                }
                const backdrop = document.getElementById('hkm-sheet-backdrop-overlay');
                if (backdrop) backdrop.classList.remove('active');
                const expandBtnIcon = this.dom.toggleExpandDictBtn ? this.dom.toggleExpandDictBtn.querySelector('span') : null;
                if (expandBtnIcon) expandBtnIcon.textContent = 'open_in_full';
            };
            this.dom.closeDictBtn.addEventListener('click', closeDictHandler);
            this.dom.closeDictBtn.addEventListener('pointerdown', closeDictHandler);
        }

        // Toggle Expand/Shrink Dictionary Drawer
        if (this.dom.toggleExpandDictBtn) {
            this.dom.toggleExpandDictBtn.addEventListener('click', () => {
                const isExpanded = this.dom.dictDrawer.classList.toggle('expanded');
                const expandBtnIcon = this.dom.toggleExpandDictBtn.querySelector('span');
                if (expandBtnIcon) {
                    expandBtnIcon.textContent = isExpanded ? 'close_fullscreen' : 'open_in_full';
                }
            });
        }

        // Dictionary Manual Trigger
        if (this.dom.dictManualTrigger) {
            this.dom.dictManualTrigger.addEventListener('click', () => {
                this.dom.dictDrawer.classList.add('active');
                this.pushModalHistoryState('dictionary-drawer');
                const backdrop = document.getElementById('hkm-sheet-backdrop-overlay');
                if (backdrop) backdrop.classList.add('active');
                if (this.dom.dictContentWrap.style.display === 'none' && this.dom.dictSpinner.style.display === 'none') {
                    if (this.dom.dictWelcomeState) this.dom.dictWelcomeState.style.display = 'flex';
                }
            });
        }

        // Dictionary direct search input and button
        if (this.dom.dictSearchInput) {
            this.dom.dictSearchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const query = this.dom.dictSearchInput.value.trim();
                    if (query) {
                        this.lookupWord(query);
                    }
                }
            });
        }
        if (this.dom.dictSearchSubmitBtn) {
            this.dom.dictSearchSubmitBtn.addEventListener('click', () => {
                const query = this.dom.dictSearchInput.value.trim();
                if (query) {
                    this.lookupWord(query);
                }
            });
        }

        // Extended Theological Analysis trigger
        if (this.dom.dictExtendedBtn) {
            this.dom.dictExtendedBtn.addEventListener('click', async () => {
                const word = this.dom.dictWordTitle.innerText.trim();
                if (!word) return;

                this.dom.dictExtendedBtn.disabled = true;
                const originalText = this.dom.dictExtendedBtnText.textContent;
                this.dom.dictExtendedBtnText.textContent = this.t('extended_loading');
                
                const icon = this.dom.dictExtendedBtn.querySelector('.material-symbols-outlined');
                if (icon) {
                    icon.textContent = 'sync';
                    icon.classList.add('spin-animation');
                }

                try {
                    const params = new URLSearchParams({
                        word: word,
                        extended: 'true',
                        lang: document.documentElement.lang || 'no'
                    });
                    
                    const res = await fetch(`/api/bible/dictionary?${params.toString()}`);
                    if (!res.ok) {
                        throw new Error(`Failed to load extended analysis: ${res.status}`);
                    }
                    const data = await res.json();
                    
                    // Cache the extended data client-side for instant re-loads
                    const cacheKey = `${word.toLowerCase()}_${document.documentElement.lang || 'no'}`;
                    if (this.dictCache) {
                        this.dictCache[cacheKey] = { dictRes: data, resources: this.dictCache[cacheKey]?.resources || [] };
                    }
                    
                    if (this.dom.dictExtendedText) {
                        this.dom.dictExtendedText.innerHTML = this.parseMarkdown(data.extendedAnalysis);
                    }
                    
                    if (this.dom.dictExtendedSection) {
                        this.dom.dictExtendedSection.style.display = 'block';
                        this.dom.dictExtendedSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }
                    
                    if (this.dom.dictExtendedTriggerWrap) {
                        this.dom.dictExtendedTriggerWrap.style.display = 'none';
                    }
                } catch (err) {
                    console.error("Error fetching extended analysis:", err);
                    this.dom.dictExtendedBtnText.textContent = originalText;
                    this.dom.dictExtendedBtn.disabled = false;
                } finally {
                    if (icon) {
                        icon.textContent = 'psychology';
                        icon.classList.remove('spin-animation');
                    }
                }
            });
        }

        // Chapter lookup in Bibeleksikon
        if (this.dom.btnLookupChapter) {
            this.dom.btnLookupChapter.addEventListener('click', () => {
                const ref = this.getCurrentReferenceText();
                this.lookupWord(ref, "", ref);
            });
        }

        // Verse Context Toolbar actions
        if (this.dom.toolbarBtnBookmark) {
            this.dom.toolbarBtnBookmark.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.selectedVerses && this.selectedVerses.length > 0) {
                    const ref = this.getCurrentReferenceText();
                    
                    // Parse all currently bookmarked verse numbers for the current chapter and translation
                    const activeBookmarks = this.bookmarks.filter(b => b.chapterId === this.selectedChapterId && b.bibleId === this.selectedBibleId);
                    const currentBookmarked = new Set();
                    activeBookmarks.forEach(b => {
                        const verses = this.parseVersesFromRef(b.ref);
                        verses.forEach(v => currentBookmarked.add(v));
                    });

                    // Check if there are any selected verses that are NOT currently bookmarked
                    const hasUnbookmarked = this.selectedVerses.some(v => !currentBookmarked.has(parseInt(v.verseNum, 10)));
                    const selectedNumbers = this.selectedVerses.map(v => parseInt(v.verseNum, 10));

                    // Remove any existing overlapping bookmarks in the current chapter/translation
                    this.bookmarks = this.bookmarks.filter(b => {
                        if (b.chapterId !== this.selectedChapterId || b.bibleId !== this.selectedBibleId) {
                            return true;
                        }
                        const verses = this.parseVersesFromRef(b.ref);
                        const overlaps = verses.some(v => selectedNumbers.includes(v));
                        return !overlaps;
                    });

                    if (hasUnbookmarked) {
                        // Create a single combined bookmark representing all selected verses
                        const sorted = [...this.selectedVerses].sort((a, b) => parseInt(a.verseNum, 10) - parseInt(b.verseNum, 10));
                        const numbers = sorted.map(v => parseInt(v.verseNum, 10));
                        const ranges = [];
                        let start = numbers[0];
                        let prev = numbers[0];
                        
                        for (let i = 1; i <= numbers.length; i++) {
                            const current = numbers[i];
                            if (current === prev + 1) {
                                prev = current;
                            } else {
                                if (start === prev) {
                                    ranges.push(String(start));
                                } else {
                                    ranges.push(`${start}-${prev}`);
                                }
                                start = current;
                                prev = current;
                            }
                        }
                        const verseRange = ranges.join(', ');
                        const combinedRef = `${ref}:${verseRange}`;

                        this.bookmarks.push({
                            id: Date.now().toString() + '_' + Math.random().toString(36).substr(2, 5),
                            ref: combinedRef,
                            bookId: this.selectedBookId,
                            chapterId: this.selectedChapterId,
                            verse: verseRange,
                            bibleId: this.selectedBibleId,
                            createdAt: new Date().toISOString()
                        });
                    }

                    this.safeSetLocalStorage('hkm_bible_bookmarks', JSON.stringify(this.bookmarks));
                    this.renderBookmarksList();
                    this.restoreHighlights();
                    this.clearSelection();
                }
            });
        }
        if (this.dom.toolbarBtnRange) {
            this.dom.toolbarBtnRange.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.selectedVerses && this.selectedVerses.length > 0) {
                    this.rangeSelectionMode = true;
                    this.rangeStartVerse = this.selectedVerses[this.selectedVerses.length - 1];
                    
                    const path = window.location.pathname;
                    let msg = "Klikk på det siste verset du vil markere";
                    if (path.includes('/en/')) {
                        msg = "Click on the last verse you want to select";
                    } else if (path.includes('/es/')) {
                        msg = "Haz clic en el último versículo que quieras seleccionar";
                    }
                    
                    this.showToast(msg, 0);
                    if (this.dom.verseToolbar) this.dom.verseToolbar.style.display = 'none';
                }
            });
        }

        if (this.dom.toolbarBtnLookup) {
            this.dom.toolbarBtnLookup.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.selectedVerses && this.selectedVerses.length > 0) {
                    const sorted = [...this.selectedVerses].sort((a, b) => parseInt(a.verseNum, 10) - parseInt(b.verseNum, 10));
                    const combinedText = sorted.map(v => {
                        const tempDiv = document.createElement('div');
                        tempDiv.innerHTML = v.paragraph.innerHTML;
                        tempDiv.querySelectorAll('sup').forEach(s => s.remove());
                        return `[v. ${v.verseNum}] ${tempDiv.innerText.trim()}`;
                    }).join(' ');

                    const refRange = this.getSelectedVersesReference();
                    this.lookupWord(refRange, combinedText, refRange);
                    this.clearSelection();
                }
            });
        }

        if (this.dom.toolbarBtnImage) {
            this.dom.toolbarBtnImage.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.selectedVerses && this.selectedVerses.length > 0) {
                    this.openVerseImageModal();
                }
            });
        }

        if (this.dom.toolbarBtnShare) {
            this.dom.toolbarBtnShare.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.selectedVerses && this.selectedVerses.length > 0) {
                    this.openVerseShareChoiceModal();
                }
            });
        }

        if (this.dom.toolbarBtnDownload) {
            this.dom.toolbarBtnDownload.addEventListener('click', async (e) => {
                e.stopPropagation();
                if (this.selectedVerses && this.selectedVerses.length > 0) {
                    const sorted = [...this.selectedVerses].sort((a, b) => parseInt(a.verseNum, 10) - parseInt(b.verseNum, 10));
                    const refRange = this.getSelectedVersesReference();
                    
                    const combinedText = sorted.map(v => {
                        const tempDiv = document.createElement('div');
                        tempDiv.innerHTML = v.paragraph.innerHTML;
                        tempDiv.querySelectorAll('sup').forEach(s => s.remove());
                        return `${v.verseNum}. ${tempDiv.innerText.trim()}`;
                    }).join('\n');

                    const textToCopy = `${refRange}\n\n${combinedText}\n\n— His Kingdom Ministry`;

                    try {
                        await navigator.clipboard.writeText(textToCopy);
                        const isEn = window.location.pathname.includes('/en/');
                        const isEs = window.location.pathname.includes('/es/');
                        const toastMsg = isEn ? 'Copied to clipboard!' : (isEs ? '¡Copiado al portapapeles!' : 'Kopiert til utklippstavlen!');
                        this.showToast(toastMsg);
                    } catch(err) {
                        console.error('Clipboard copy error:', err);
                    }
                    this.clearSelection();
                }
            });
        }

        if (this.dom.toolbarBtnSaveUser) {
            this.dom.toolbarBtnSaveUser.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.selectedVerses && this.selectedVerses.length > 0) {
                    const sorted = [...this.selectedVerses].sort((a, b) => parseInt(a.verseNum, 10) - parseInt(b.verseNum, 10));
                    const refRange = this.getSelectedVersesReference();
                    
                    const combinedText = sorted.map(v => {
                        const tempDiv = document.createElement('div');
                        tempDiv.innerHTML = v.paragraph.innerHTML;
                        tempDiv.querySelectorAll('sup').forEach(s => s.remove());
                        return `v.${v.verseNum}: "${tempDiv.innerText.trim()}"`;
                    }).join(' ');

                    const noteModal = document.getElementById('verse-note-modal');
                    const noteTitle = document.getElementById('verse-note-title');
                    const notePreview = document.getElementById('verse-note-quote-preview');
                    const noteInput = document.getElementById('verse-note-input');
                    const noteSaveBtn = document.getElementById('verse-note-save-btn');
                    const noteDeleteBtn = document.getElementById('verse-note-delete-btn');

                    if (!noteModal) return;

                    const path = window.location.pathname;
                    const isEn = path.includes('/en/');
                    const isEs = path.includes('/es/');

                    if (noteTitle) {
                        noteTitle.textContent = isEn ? `Note: ${refRange}` : (isEs ? `Nota: ${refRange}` : `Notat: ${refRange}`);
                    }
                    if (notePreview) {
                        notePreview.textContent = combinedText;
                    }

                    // Check existing note in localStorage
                    const noteKey = `hkm_note_${refRange}`;
                    const existingNote = localStorage.getItem(noteKey) || '';
                    if (noteInput) {
                        noteInput.value = existingNote;
                    }

                    if (noteDeleteBtn) {
                        noteDeleteBtn.style.display = existingNote ? 'block' : 'none';
                        noteDeleteBtn.onclick = () => {
                            localStorage.removeItem(noteKey);
                            if (noteInput) noteInput.value = '';
                            noteModal.classList.remove('active');
                            noteModal.style.display = 'none';
                            const toastMsg = isEn ? 'Note deleted' : (isEs ? 'Nota eliminada' : 'Notat slettet');
                            this.showToast(toastMsg);
                            this.clearSelection();
                        };
                    }

                    if (noteSaveBtn) {
                        noteSaveBtn.onclick = async () => {
                            const val = noteInput ? noteInput.value.trim() : '';
                            if (val) {
                                localStorage.setItem(noteKey, val);
                                
                                // Sync to Firestore if user is logged in
                                if (this.currentUser) {
                                    try {
                                        const db = this.getFirestore();
                                        if (db) {
                                            await db.collection('personal_notes').add({
                                                userId: this.currentUser.uid,
                                                title: refRange,
                                                text: `<p>${val}</p><blockquote>${combinedText}</blockquote>`,
                                                createdAt: this.getServerTimestamp(),
                                                updatedAt: this.getServerTimestamp()
                                            });
                                        }
                                    } catch (err) {
                                        console.warn("Firestore note save warning:", err);
                                    }
                                }

                                const toastMsg = isEn ? 'Note saved!' : (isEs ? '¡Nota guardada!' : 'Notatet ditt ble lagret!');
                                this.showToast(toastMsg);
                            } else {
                                localStorage.removeItem(noteKey);
                            }
                            noteModal.classList.remove('active');
                            noteModal.style.display = 'none';
                            this.clearSelection();
                        };
                    }

                    noteModal.classList.add('active');
                    noteModal.style.display = 'flex';
                    this.pushModalHistoryState('verse-note-modal');
                    if (noteInput) noteInput.focus();
                }
            });
        }

        if (this.dom.toolbarBtnClear) {
            this.dom.toolbarBtnClear.addEventListener('click', (e) => {
                e.stopPropagation();
                this.clearSelection();
            });
        }

        // Interactive Canvas Color Wheel Modal Controller
        const colorWheelModal = document.getElementById('color-wheel-modal');
        const colorWheelCanvas = document.getElementById('color-wheel-canvas');
        const colorWheelHandle = document.getElementById('color-wheel-picker-handle');
        const colorWheelPreview = document.getElementById('color-wheel-preview');
        const colorWheelHex = document.getElementById('color-wheel-hex');
        const colorWheelClose = document.getElementById('color-wheel-close');
        const colorWheelApply = document.getElementById('color-wheel-apply-btn');
        const customSwatchBtn = document.getElementById('custom-color-swatch-btn');
        
        let currentColorHex = localStorage.getItem('hkm_custom_verse_color') || '#d17d39';

        const updateCustomBtnStyle = (hexColor) => {
            if (customSwatchBtn && hexColor) {
                customSwatchBtn.style.background = hexColor;
                customSwatchBtn.style.boxShadow = `0 0 0 2px #fff, 0 0 0 4px ${hexColor}, 0 2px 8px rgba(0,0,0,0.25)`;
            }
        };

        if (currentColorHex) {
            updateCustomBtnStyle(currentColorHex);
        }

        // Draw 360-degree Radial HSL Color Wheel on Canvas
        const drawColorWheel = () => {
            if (!colorWheelCanvas) return;
            const ctx = colorWheelCanvas.getContext('2d');
            const width = colorWheelCanvas.width || 200;
            const height = colorWheelCanvas.height || 200;
            const radius = width / 2;
            const toRad = Math.PI / 180;
            
            ctx.clearRect(0, 0, width, height);

            for (let angle = 0; angle < 360; angle += 1) {
                const startAngle = (angle - 1) * toRad;
                const endAngle = (angle + 1) * toRad;
                
                ctx.beginPath();
                ctx.moveTo(radius, radius);
                ctx.arc(radius, radius, radius, startAngle, endAngle);
                ctx.closePath();

                const grad = ctx.createRadialGradient(radius, radius, 0, radius, radius, radius);
                grad.addColorStop(0, '#ffffff');
                grad.addColorStop(1, `hsl(${angle}, 100%, 50%)`);
                
                ctx.fillStyle = grad;
                ctx.fill();
            }
        };

        const pickColorFromCanvas = (x, y) => {
            if (!colorWheelCanvas) return;
            const ctx = colorWheelCanvas.getContext('2d', { willReadFrequently: true });
            const rect = colorWheelCanvas.getBoundingClientRect();
            
            let canvasX = x - rect.left;
            let canvasY = y - rect.top;
            
            const radius = (colorWheelCanvas.width || 200) / 2;
            const dx = canvasX - radius;
            const dy = canvasY - radius;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > radius) {
                const angle = Math.atan2(dy, dx);
                canvasX = radius + Math.cos(angle) * (radius - 1);
                canvasY = radius + Math.sin(angle) * (radius - 1);
            }

            try {
                const pixel = ctx.getImageData(Math.floor(canvasX), Math.floor(canvasY), 1, 1).data;
                if (pixel[3] > 0) {
                    const hex = `#${((1 << 24) + (pixel[0] << 16) + (pixel[1] << 8) + pixel[2]).toString(16).slice(1).toUpperCase()}`;
                    currentColorHex = hex;
                    if (colorWheelPreview) colorWheelPreview.style.background = hex;
                    if (colorWheelHex) colorWheelHex.textContent = hex;
                    if (colorWheelHandle) {
                        colorWheelHandle.style.left = `${canvasX}px`;
                        colorWheelHandle.style.top = `${canvasY}px`;
                        colorWheelHandle.style.display = 'block';
                    }
                }
            } catch (err) {
                console.warn("Color wheel sample error:", err);
            }
        };

        window.closeColorWheelModal = (e) => {
            if (e && e.stopPropagation) e.stopPropagation();
            if (colorWheelModal) {
                colorWheelModal.classList.remove('active');
                colorWheelModal.style.display = 'none';
            }
        };

        const openColorWheelModal = () => {
            if (!colorWheelModal) return;
            colorWheelModal.classList.add('active');
            colorWheelModal.style.display = 'flex';
            requestAnimationFrame(() => {
                drawColorWheel();
            });
            if (colorWheelPreview) colorWheelPreview.style.background = currentColorHex;
            if (colorWheelHex) colorWheelHex.textContent = currentColorHex.toUpperCase();
        };

        if (colorWheelCanvas) {
            let isDragging = false;
            const startDrag = (e) => {
                isDragging = true;
                const clientX = e.touches ? e.touches[0].clientX : e.clientX;
                const clientY = e.touches ? e.touches[0].clientY : e.clientY;
                pickColorFromCanvas(clientX, clientY);
            };
            const moveDrag = (e) => {
                if (!isDragging) return;
                const clientX = e.touches ? e.touches[0].clientX : e.clientX;
                const clientY = e.touches ? e.touches[0].clientY : e.clientY;
                pickColorFromCanvas(clientX, clientY);
            };
            const endDrag = () => { isDragging = false; };

            colorWheelCanvas.addEventListener('mousedown', startDrag);
            colorWheelCanvas.addEventListener('mousemove', moveDrag);
            window.addEventListener('mouseup', endDrag);

            colorWheelCanvas.addEventListener('touchstart', startDrag, { passive: true });
            colorWheelCanvas.addEventListener('touchmove', moveDrag, { passive: true });
            window.addEventListener('touchend', endDrag);
        }

        // Quick Swatches inside Color Wheel
        document.querySelectorAll('.cw-quick-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const hex = btn.getAttribute('data-hex');
                if (hex) {
                    currentColorHex = hex;
                    if (colorWheelPreview) colorWheelPreview.style.background = hex;
                    if (colorWheelHex) colorWheelHex.textContent = hex.toUpperCase();
                }
            });
        });

        if (colorWheelClose) {
            colorWheelClose.addEventListener('click', (e) => window.closeColorWheelModal(e));
        }

        if (colorWheelModal) {
            colorWheelModal.addEventListener('click', (e) => {
                if (e.target === colorWheelModal) window.closeColorWheelModal(e);
            });
        }

        const hexToRgba = (hex, opacity = 0.35) => {
            if (!hex) return `rgba(209, 125, 57, ${opacity})`;
            let c = hex.replace('#', '');
            if (c.length === 3) c = c.split('').map(x => x + x).join('');
            const num = parseInt(c, 16);
            return `rgba(${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}, ${opacity})`;
        };

        if (colorWheelApply) {
            colorWheelApply.addEventListener('click', (e) => {
                if (e && e.stopPropagation) e.stopPropagation();
                localStorage.setItem('hkm_custom_verse_color', currentColorHex);
                updateCustomBtnStyle(currentColorHex);
                if (this.selectedVerses && this.selectedVerses.length > 0) {
                    this.selectedVerses.forEach(v => {
                        v.paragraph.setAttribute('data-highlight-color', 'custom');
                        v.paragraph.style.setProperty('--custom-highlight-bg', hexToRgba(currentColorHex, 0.35));
                        this.saveVerseHighlight(v.verseNum, 'custom', currentColorHex);
                    });
                }
                window.closeColorWheelModal(e);
            });
        }

        // Color swatch listeners for bottom action sheet
        document.querySelectorAll('#verse-context-toolbar .color-swatch-circle').forEach(swatch => {
            const applySwatchColor = (e) => {
                if (e) {
                    if (e.stopPropagation) e.stopPropagation();
                    if (e.preventDefault && e.cancelable) e.preventDefault();
                }
                const color = swatch.getAttribute('data-color');
                if (color === 'custom' || color === 'multi') {
                    openColorWheelModal();
                    if (this.selectedVerses && this.selectedVerses.length > 0) {
                        this.selectedVerses.forEach(v => {
                            v.paragraph.setAttribute('data-highlight-color', 'custom');
                            v.paragraph.style.setProperty('--custom-highlight-bg', hexToRgba(currentColorHex, 0.35));
                            this.saveVerseHighlight(v.verseNum, 'custom', currentColorHex);
                        });
                    }
                    return;
                }
                if (this.selectedVerses && this.selectedVerses.length > 0) {
                    this.selectedVerses.forEach(v => {
                        if (color === 'none') {
                            v.paragraph.removeAttribute('data-highlight-color');
                            v.paragraph.style.removeProperty('--custom-highlight-bg');
                            this.saveVerseHighlight(v.verseNum, 'none');
                        } else {
                            v.paragraph.setAttribute('data-highlight-color', color);
                            if (color === 'custom') {
                                v.paragraph.style.setProperty('--custom-highlight-bg', hexToRgba(currentColorHex, 0.35));
                                this.saveVerseHighlight(v.verseNum, 'custom', currentColorHex);
                            } else {
                                this.saveVerseHighlight(v.verseNum, color);
                            }
                        }
                    });
                }
            };

            swatch.addEventListener('click', applySwatchColor);
            swatch.addEventListener('touchend', applySwatchColor);
        });

        // Toolbar Cross-References button listener
        const btnCrossref = document.getElementById('toolbar-btn-crossref');
        if (btnCrossref) {
            btnCrossref.addEventListener('click', () => {
                if (this.selectedVerses && this.selectedVerses.length > 0) {
                    const first = this.selectedVerses[0];
                    const clone = first.paragraph.cloneNode(true);
                    const btn = clone.querySelector('.verse-crossref-icon-btn');
                    if (btn) btn.remove();
                    this.openVerseCrossReferenceModal(first.verseNum, clone.innerText.trim());
                }
            });
        }

        // Swipe down to dismiss for bottom action sheet
        if (this.dom.verseToolbar) {
            this.setupBottomSheetSwipeDown(this.dom.verseToolbar, () => {
                this.clearSelection();
            });
        }

        // Swipe down to dismiss for color wheel modal
        const colorWheelCard = document.querySelector('#color-wheel-modal .color-wheel-card');
        if (colorWheelCard) {
            const colorWheelModal = document.getElementById('color-wheel-modal');
            this.setupBottomSheetSwipeDown(colorWheelCard, () => {
                if (colorWheelModal) {
                    colorWheelModal.classList.remove('active');
                    setTimeout(() => {
                        colorWheelModal.style.display = 'none';
                    }, 250);
                }
            });
        }

        // Swipe down to dismiss for verse note modal
        const verseNoteCard = document.querySelector('#verse-note-modal .color-wheel-card');
        if (verseNoteCard) {
            const verseNoteModal = document.getElementById('verse-note-modal');
            this.setupBottomSheetSwipeDown(verseNoteCard, () => {
                if (verseNoteModal) {
                    verseNoteModal.classList.remove('active');
                    verseNoteModal.style.display = 'none';
                }
            });
        }

        // Swipe down to dismiss for verse crossref modal
        const verseCrossrefCard = document.querySelector('#verse-crossref-modal .verse-crossref-sheet-card, #verse-crossref-modal .color-wheel-card');
        if (verseCrossrefCard) {
            const verseCrossrefModal = document.getElementById('verse-crossref-modal');
            this.setupBottomSheetSwipeDown(verseCrossrefCard, () => {
                if (verseCrossrefModal) {
                    verseCrossrefModal.classList.remove('active');
                    setTimeout(() => {
                        verseCrossrefModal.style.display = 'none';
                    }, 250);
                }
            });
        }

        // Swipe down to dismiss for floating settings popover
        const settingsPopoverCard = document.getElementById('floating-settings-popover');
        if (settingsPopoverCard) {
            this.setupBottomSheetSwipeDown(settingsPopoverCard, () => {
                settingsPopoverCard.classList.remove('active');
                const backdrop = document.getElementById('hkm-sheet-backdrop-overlay');
                if (backdrop) backdrop.classList.remove('active');
            });
        }

        // Swipe down to dismiss for floating chapter popover
        const chapterPopoverCard = document.getElementById('floating-chapter-popover');
        if (chapterPopoverCard) {
            this.setupBottomSheetSwipeDown(chapterPopoverCard, () => {
                chapterPopoverCard.classList.remove('active');
                const backdrop = document.getElementById('hkm-sheet-backdrop-overlay');
                if (backdrop) backdrop.classList.remove('active');
            });
        }

        // Hide toolbar, clear highlight, and show/hide floating nav on scroll in content pane
        const mainContentPane = document.querySelector('.bible-content-pane');
        const floatingNav = document.getElementById('floating-bible-nav');
        let lastScrollTop = mainContentPane ? mainContentPane.scrollTop : 0;
        
        if (mainContentPane) {
            mainContentPane.addEventListener('scroll', () => {
                const scrollTop = mainContentPane.scrollTop;
                const scrollDiff = Math.abs(scrollTop - lastScrollTop);
                
                if (scrollDiff > 10) {
                    // Clear highlighted search verse if the user scrolls manually
                    if (this.highlightedVerseElement && !this.isProgrammaticScrolling) {
                        this.highlightedVerseElement.classList.remove('verse-temp-highlight');
                        this.highlightedVerseElement = null;
                    }
                }
                
                // Hide/show floating book selector on scroll
                if (floatingNav) {
                    // Only hide if we scrolled down past 50px
                    if (scrollTop > lastScrollTop && scrollTop > 50) {
                        floatingNav.classList.add('hidden-nav');
                    } else {
                        floatingNav.classList.remove('hidden-nav');
                    }
                }
                lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
            });
        }

        // Hide toolbar when clicking outside
        document.addEventListener('click', (e) => {
            if (this.dom.verseToolbar && this.dom.verseToolbar.style.display === 'flex') {
                if (!this.dom.verseToolbar.contains(e.target) && (!this.dom.readingPane || !this.dom.readingPane.contains(e.target))) {
                    this.clearSelection();
                }
            }
        });

        // Reading pane click events (double-click word definition, or select verse)
        if (this.dom.readingPane) {
            // Touch jitter prevention for vertical scroll / swipe
            this.dom.readingPane.addEventListener('touchstart', (e) => {
                if (e.touches && e.touches[0]) {
                    this.touchStartX = e.touches[0].clientX;
                    this.touchStartY = e.touches[0].clientY;
                    this.touchMoved = false;
                }
            }, { passive: true });

            this.dom.readingPane.addEventListener('touchmove', (e) => {
                if (e.touches && e.touches[0]) {
                    const diffX = Math.abs(e.touches[0].clientX - this.touchStartX);
                    const diffY = Math.abs(e.touches[0].clientY - this.touchStartY);
                    if (diffX > 10 || diffY > 10) {
                        this.touchMoved = true;
                    }
                }
            }, { passive: true });

            this.dom.readingPane.addEventListener('dblclick', (e) => {
                const selection = window.getSelection().toString().trim();
                if (selection && selection.length > 1 && selection.length < 30) {
                    this.lookupWord(selection, e.target.innerText, this.getCurrentReferenceText());
                }
            });

            // Highlight / Select verse click: show floating toolbar
            this.dom.readingPane.addEventListener('click', (e) => {
                if (this.touchMoved) {
                    this.touchMoved = false;
                    return;
                }
                const paragraph = e.target.closest('p');
                if (paragraph) {
                    const verseSup = paragraph.querySelector('sup.v');
                    if (verseSup) {
                        e.stopPropagation();
                        const verseNum = verseSup.innerText.trim();
                        
                        // Range selection modes
                        if (this.rangeSelectionMode && this.rangeStartVerse) {
                            const paragraphs = Array.from(this.dom.readingPane.querySelectorAll('p'));
                            const idx1 = paragraphs.indexOf(this.rangeStartVerse.paragraph);
                            const idx2 = paragraphs.indexOf(paragraph);
                            
                            if (idx1 >= 0 && idx2 >= 0) {
                                const startIdx = Math.min(idx1, idx2);
                                const endIdx = Math.max(idx1, idx2);
                                
                                for (let i = startIdx; i <= endIdx; i++) {
                                    const p = paragraphs[i];
                                    const vSup = p.querySelector('sup.v');
                                    if (vSup) {
                                        const vNum = vSup.innerText.trim();
                                        const exists = this.selectedVerses.some(v => v.paragraph === p);
                                        if (!exists) {
                                            this.selectedVerses.push({ paragraph: p, verseNum: vNum });
                                            p.classList.add('selected-verse');
                                        }
                                    }
                                }
                            }
                            this.rangeSelectionMode = false;
                            this.dismissToast();
                        } else if (e.shiftKey && this.lastSelectedVerse && this.lastSelectedVerse.paragraph !== paragraph) {
                            const paragraphs = Array.from(this.dom.readingPane.querySelectorAll('p'));
                            const idx1 = paragraphs.indexOf(this.lastSelectedVerse.paragraph);
                            const idx2 = paragraphs.indexOf(paragraph);
                            
                            if (idx1 >= 0 && idx2 >= 0) {
                                const startIdx = Math.min(idx1, idx2);
                                const endIdx = Math.max(idx1, idx2);
                                
                                for (let i = startIdx; i <= endIdx; i++) {
                                    const p = paragraphs[i];
                                    const vSup = p.querySelector('sup.v');
                                    if (vSup) {
                                        const vNum = vSup.innerText.trim();
                                        const exists = this.selectedVerses.some(v => v.paragraph === p);
                                        if (!exists) {
                                            this.selectedVerses.push({ paragraph: p, verseNum: vNum });
                                            p.classList.add('selected-verse');
                                        }
                                    }
                                }
                            }
                        } else {
                            // Toggle selected state
                            const existingIdx = this.selectedVerses.findIndex(v => v.verseNum === verseNum && v.paragraph === paragraph);
                            if (existingIdx >= 0) {
                                this.selectedVerses.splice(existingIdx, 1);
                                paragraph.classList.remove('selected-verse');
                                if (this.lastSelectedVerse && this.lastSelectedVerse.paragraph === paragraph) {
                                    this.lastSelectedVerse = this.selectedVerses[this.selectedVerses.length - 1] || null;
                                }
                            } else {
                                const newSelection = { paragraph, verseNum };
                                this.selectedVerses.push(newSelection);
                                paragraph.classList.add('selected-verse');
                                this.lastSelectedVerse = newSelection;
                            }
                        }

                        if (this.selectedVerses.length === 0) {
                            if (this.dom.verseToolbar) this.dom.verseToolbar.style.display = 'none';
                            return;
                        }

                        this.activeContextVerse = { paragraph, verseNum };
                        
                        // Check if all selected are already bookmarked
                        const ref = this.getCurrentReferenceText();
                        const allBookmarked = this.selectedVerses.every(v => {
                            const fullRef = `${ref}:${v.verseNum}`;
                            return this.bookmarks.some(b => b.ref === fullRef && b.bibleId === this.selectedBibleId);
                        });
                        
                        if (this.dom.toolbarBtnBookmark) {
                            const path = window.location.pathname;
                            let activeText = 'Fjern bokmerke';
                            let inactiveText = 'Bokmerk';
                            if (path.includes('/en/')) {
                                activeText = 'Remove bookmark';
                                inactiveText = 'Bookmark';
                            } else if (path.includes('/es/')) {
                                activeText = 'Quitar favorito';
                                inactiveText = 'Favorito';
                            }
                            this.dom.toolbarBtnBookmark.setAttribute('data-tooltip', allBookmarked ? activeText : inactiveText);
                        }
                        const bookmarkIcon = this.dom.toolbarBtnBookmark ? this.dom.toolbarBtnBookmark.querySelector('.material-symbols-outlined') : null;
                        if (bookmarkIcon) {
                            bookmarkIcon.innerText = allBookmarked ? 'bookmark_remove' : 'bookmark';
                        }

                        // Show bottom action sheet toolbar & update reference header
                        if (this.dom.verseToolbar) {
                            this.dom.verseToolbar.style.display = 'flex';
                            const sheetRefEl = document.getElementById('sheet-verse-reference');
                            if (sheetRefEl) {
                                sheetRefEl.textContent = this.getSelectedVersesReference() || 'Velg vers';
                            }
                        }
                        return;
                    }
                }
                
                // Clicked outside a verse paragraph, hide toolbar & clear selection
                this.clearSelection();
            });
        }
    }

    clearSelection() {
        if (this.selectedVerses) {
            this.selectedVerses.forEach(v => v.paragraph.classList.remove('selected-verse'));
            this.selectedVerses = [];
        }
        if (this.dom.verseToolbar) this.dom.verseToolbar.style.display = 'none';
        if (this.highlightedVerseElement) {
            this.highlightedVerseElement.classList.remove('verse-temp-highlight');
            this.highlightedVerseElement = null;
        }
        this.rangeSelectionMode = false;
        this.dismissToast();
    }

    showToast(message, duration = 3000) {
        this.dismissToast();

        const toast = document.createElement('div');
        toast.id = 'bible-toast';
        toast.style.cssText = `
            position: fixed;
            top: 110px;
            left: 50%;
            transform: translateX(-50%) translateY(-20px);
            background: linear-gradient(135deg, #d17d39, #bd4f2a);
            color: #ffffff;
            padding: 12px 24px;
            border-radius: 30px;
            font-size: 14px;
            font-weight: 500;
            box-shadow: 0 10px 25px rgba(209, 125, 57, 0.25), 0 4px 10px rgba(0, 0, 0, 0.12);
            z-index: 10001;
            opacity: 0;
            transition: transform 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28), opacity 0.3s ease;
            pointer-events: none;
            display: flex;
            align-items: center;
            gap: 8px;
        `;
        
        toast.innerHTML = `
            <span class="material-symbols-outlined" style="font-size: 18px; color: #ffffff;">info</span>
            <span>${message}</span>
        `;
        
        document.body.appendChild(toast);
        
        toast.offsetHeight; // trigger reflow
        toast.style.transform = 'translateX(-50%) translateY(0)';
        toast.style.opacity = '1';
        
        if (duration > 0) {
            this.toastTimeout = setTimeout(() => {
                this.dismissToast();
            }, duration);
        }
    }

    dismissToast() {
        const existing = document.getElementById('bible-toast');
        if (existing) {
            existing.style.transform = 'translateX(-50%) translateY(-20px)';
            existing.style.opacity = '0';
            setTimeout(() => existing.remove(), 300);
        }
        if (this.toastTimeout) {
            clearTimeout(this.toastTimeout);
            this.toastTimeout = null;
        }
    }

    getSelectedVersesReference() {
        if (!this.selectedVerses || this.selectedVerses.length === 0) return '';
        const ref = this.getCurrentReferenceText();
        
        // Sort selected verses numerically
        const sorted = [...this.selectedVerses].sort((a, b) => parseInt(a.verseNum, 10) - parseInt(b.verseNum, 10));
        
        // Group consecutive verses, e.g. "Johannes 3:16-18" or "Johannes 3:16, 18"
        const numbers = sorted.map(v => parseInt(v.verseNum, 10));
        const ranges = [];
        let start = numbers[0];
        let prev = numbers[0];
        
        for (let i = 1; i <= numbers.length; i++) {
            const current = numbers[i];
            if (current === prev + 1) {
                prev = current;
            } else {
                if (start === prev) {
                    ranges.push(String(start));
                } else {
                    ranges.push(`${start}-${prev}`);
                }
                start = current;
                prev = current;
            }
        }
        
        return `${ref}:${ranges.join(', ')}`;
    }

    applySettings() {
        this.safeSetLocalStorage('hkm_bible_settings', JSON.stringify(this.settings));
        
        // Font Size
        if (this.dom.fontSizeDisplay) this.dom.fontSizeDisplay.innerText = `${this.settings.fontSize}px`;
        const fontSizeDispMobile = document.getElementById('font-size-display-mobile');
        if (fontSizeDispMobile) fontSizeDispMobile.innerText = `${this.settings.fontSize}px`;

        if (this.dom.readingPane) {
            this.dom.readingPane.style.setProperty('--bible-font-size', `${this.settings.fontSize}px`);
            this.dom.readingPane.style.fontSize = `${this.settings.fontSize}px`;
            this.dom.readingPane.style.lineHeight = this.settings.lineHeight;
            
            // Font Family
            if (this.settings.fontFamily === 'serif') {
                this.dom.readingPane.style.fontFamily = 'Georgia, Cambria, "Times New Roman", Times, serif';
            } else {
                this.dom.readingPane.style.fontFamily = 'Inter, system-ui, -apple-system, sans-serif';
            }

            // Layout
            if (this.settings.layout === 'paragraph') {
                this.dom.readingPane.classList.add('layout-paragraph');
                this.dom.readingPane.classList.remove('layout-verse');
            } else {
                this.dom.readingPane.classList.add('layout-verse');
                this.dom.readingPane.classList.remove('layout-paragraph');
            }
        }

        // Update segmented control active states
        document.querySelectorAll('.hkm-segmented-control[data-setting="fontFamily"] .segment-btn').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-value') === this.settings.fontFamily);
        });
        document.querySelectorAll('.hkm-segmented-control[data-setting="layout"] .segment-btn').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-value') === this.settings.layout);
        });
        if (this.dom.fontFamilySelect) this.dom.fontFamilySelect.value = this.settings.fontFamily;
        if (this.dom.layoutSelect) this.dom.layoutSelect.value = this.settings.layout;

        // Theme classes
        document.body.classList.remove('bible-theme-light', 'bible-theme-cream', 'bible-theme-dark');
        document.body.classList.add(`bible-theme-${this.settings.theme}`);

        this.dom.themeSelectors.forEach(btn => {
            if (btn.dataset.theme === this.settings.theme) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    openTranslationModal() {
        const modal = document.getElementById('translation-selection-modal');
        const container = document.getElementById('translation-modal-options-list');
        if (!modal || !container) return;

        container.innerHTML = (this.bibles || []).map(t => {
            const isSelected = t.id === this.selectedBibleId;
            return `
                <button type="button" class="translation-option-btn ${isSelected ? 'active' : ''}" data-id="${t.id}">
                    <div style="display: flex; flex-direction: column; gap: 2px;">
                        <span style="font-weight: 700; font-size: 14.5px; color: var(--text-base);">${t.name}</span>
                        <span style="font-size: 11.5px; color: var(--text-muted); font-weight: 500;">${t.abbreviation || ''} ${t.languageName ? '• ' + t.languageName : ''}</span>
                    </div>
                    <div class="radio-indicator">
                        ${isSelected ? '<span class="material-symbols-outlined" style="font-size: 14px; color: white; font-weight: bold;">check</span>' : ''}
                    </div>
                </button>
            `;
        }).join('');

        container.querySelectorAll('.translation-option-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const bibleId = btn.getAttribute('data-id');
                if (bibleId && bibleId !== this.selectedBibleId) {
                    this.selectedBibleId = bibleId;
                    const activeLang = window.HKM_CURRENT_LANG || 'no';
                    this.safeSetLocalStorage(`hkm_bible_translation_${activeLang}`, this.selectedBibleId);
                    
                    const selectedBible = (this.bibles || []).find(t => t.id === this.selectedBibleId);
                    const activeName = selectedBible ? (selectedBible.abbreviation ? `${selectedBible.name} (${selectedBible.abbreviation})` : selectedBible.name) : 'Bibeloversettelse';

                    const updateTrigger = (el) => {
                        if (!el) return;
                        if (el.tagName === 'SELECT') el.value = this.selectedBibleId;
                        const textSpan = el.querySelector('.selected-translation-name');
                        if (textSpan) textSpan.textContent = activeName;
                    };

                    updateTrigger(this.dom.translationSelect);
                    updateTrigger(document.getElementById('bible-translation-select-mobile'));

                    await this.loadBooks();
                    await this.loadChapterText();
                    this.updateUrl();
                }
                modal.classList.remove('active');
                modal.style.display = 'none';
            });
        });

        modal.style.display = 'flex';
        requestAnimationFrame(() => modal.classList.add('active'));
    }

    async loadTranslations() {
        try {
            const res = await fetch('/api/bible/bibles');
            const payload = await res.json();
            this.bibles = payload.data || [];
            
            const selectedBible = this.bibles.find(t => t.id === this.selectedBibleId) || this.bibles[0];
            const activeName = selectedBible ? (selectedBible.abbreviation ? `${selectedBible.name} (${selectedBible.abbreviation})` : selectedBible.name) : 'Bibeloversettelse';

            const updateElement = (el) => {
                if (!el) return;
                if (el.tagName === 'SELECT') {
                    el.innerHTML = this.bibles.map(t => `<option value="${t.id}">${t.name} (${t.abbreviation})</option>`).join('');
                    el.value = this.selectedBibleId;
                }
                const textSpan = el.querySelector('.selected-translation-name');
                if (textSpan) textSpan.textContent = activeName;
            };

            updateElement(this.dom.translationSelect);
            updateElement(document.getElementById('bible-translation-select-mobile'));
        } catch (e) {
            console.error("Error loading translations:", e);
        }
    }

    async loadBooks() {
        const cacheKey = this.selectedBibleId;
        if (this.cache.books[cacheKey]) {
            this.books = this.cache.books[cacheKey];
        } else {
            try {
                const res = await fetch(`/api/bible/bibles/${this.selectedBibleId}/books`);
                const payload = await res.json();
                this.books = payload.data || [];
                this.cache.books[cacheKey] = this.books;
            } catch (e) {
                console.error("Error loading books:", e);
                return;
            }
        }
        
        this.renderBooks();
    }

    renderBooks() {
        if (!this.dom.booksListGt || !this.dom.booksListNt) return;

        const isNewTestament = (bookId, index) => {
            if (this.books.length === 66) {
                return index >= 39;
            }
            const bookIdNum = parseInt(bookId, 10);
            return bookIdNum >= 40 || ['MAT', 'MRK', 'LUK', 'JHN', 'ACT', 'ROM', '1CO', '2CO', 'GAL', 'EPH', 'PHP', 'COL', '1TH', '2TH', '1TI', '2TI', 'TIT', 'PHM', 'HEB', 'JAS', '1PE', '2PE', '1JO', '2JO', '3JO', 'JUD', 'REV'].includes(bookId);
        };

        const genres = this.getGenreLabels();
        const genreMap = {};
        genres.forEach(g => { genreMap[g.key] = g.label; });

        const renderBookItem = (b, index) => {
            const isActive = b.id === this.selectedBookId ? 'active' : '';
            const genreKey = this.getBookGenreKey(b, index);
            const genreLabel = genreMap[genreKey] || '';
            return `
                <div class="book-item ${isActive}" data-id="${b.id}" data-genre="${genreKey}" data-name="${b.name.toLowerCase()}">
                    <span class="book-name" style="display: flex; align-items: center; justify-content: space-between; width: 100%; padding-right: 8px;">
                        <span>${b.name}</span>
                        ${genreLabel ? `<span class="sidebar-genre-badge" style="font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 4px; background: rgba(0,0,0,0.06); opacity: 0.75;">${genreLabel}</span>` : ''}
                    </span>
                    <span class="material-symbols-outlined icon">chevron_right</span>
                </div>
            `;
        };

        const gtBooks = [];
        const ntBooks = [];

        this.books.forEach((b, index) => {
            if (isNewTestament(b.id, index)) {
                ntBooks.push(renderBookItem(b, index));
            } else {
                gtBooks.push(renderBookItem(b, index));
            }
        });

        this.dom.booksListGt.innerHTML = gtBooks.join('');
        this.dom.booksListNt.innerHTML = ntBooks.join('');

        // Bind clicks on book items
        const bindBookClicks = (container) => {
            container.querySelectorAll('.book-item').forEach(item => {
                item.addEventListener('click', async () => {
                    container.querySelectorAll('.book-item').forEach(el => el.classList.remove('active'));
                    item.classList.add('active');
                    await this.selectBook(item.dataset.id);
                    await this.selectChapter(`${item.dataset.id}_intro`);
                });
            });
        };

        bindBookClicks(this.dom.booksListGt);
        bindBookClicks(this.dom.booksListNt);
    }

    filterBooks(query) {
        const cleanQuery = query.toLowerCase().trim();
        const bookItems = document.querySelectorAll('.book-item');
        
        bookItems.forEach(item => {
            const bookName = (item.dataset.name || item.querySelector('.book-name').innerText).toLowerCase();
            const bookGenre = (item.dataset.genre || '').toLowerCase();
            if (bookName.includes(cleanQuery) || bookGenre.includes(cleanQuery)) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });

        // Hide headers if no books match
        const gtHeader = document.getElementById('header-gt');
        const ntHeader = document.getElementById('header-nt');
        
        const hasVisibleGt = Array.from(this.dom.booksListGt.children).some(child => child.style.display !== 'none');
        const hasVisibleNt = Array.from(this.dom.booksListNt.children).some(child => child.style.display !== 'none');

        if (gtHeader) gtHeader.style.display = hasVisibleGt ? 'block' : 'none';
        if (ntHeader) ntHeader.style.display = hasVisibleNt ? 'block' : 'none';
    }

    async selectBook(bookId) {
        this.selectedBookId = bookId;
        
        // Highlights active book in sidebar
        document.querySelectorAll('.book-item').forEach(el => {
            if (el.dataset.id === bookId) el.classList.add('active');
            else el.classList.remove('active');
        });

        const cacheKey = `${this.selectedBibleId}_${bookId}`;
        if (this.cache.chapters[cacheKey]) {
            this.chapters = this.cache.chapters[cacheKey];
        } else {
            try {
                const res = await fetch(`/api/bible/bibles/${this.selectedBibleId}/books/${bookId}/chapters`);
                const payload = await res.json();
                if (this.selectedBookId !== bookId) return;
                this.chapters = payload.data || [];
                this.cache.chapters[cacheKey] = this.chapters;
            } catch (e) {
                console.error("Error loading chapters:", e);
                return;
            }
        }

        this.renderChapters();
    }

    renderChapters() {
        const isIntroActive = this.selectedChapterId === `${this.selectedBookId}_intro` ? 'active' : '';
        const introItemHtml = `<div class="chapter-item ${isIntroActive}" data-id="${this.selectedBookId}_intro" style="font-weight: 700; background: rgba(27,73,101,0.08); color: #1B4965;">Intro</div>`;

        const gridHtml = introItemHtml + this.chapters.map(c => {
            const isActive = c.id === this.selectedChapterId ? 'active' : '';
            return `<div class="chapter-item ${isActive}" data-id="${c.id}">${c.number}</div>`;
        }).join('');

        const onChapterClick = async (item) => {
            document.querySelectorAll('.chapter-grid .chapter-item').forEach(el => el.classList.remove('active'));
            document.querySelectorAll('#floating-chapter-grid .chapter-item').forEach(el => el.classList.remove('active'));
            
            // Highlight this chapter in all grids
            const targetChapterId = item.dataset.id;
            document.querySelectorAll(`.chapter-item[data-id="${targetChapterId}"]`).forEach(el => el.classList.add('active'));

            await this.selectChapter(targetChapterId);
            
            // Hide chapter selector overlay
            const overlay = document.getElementById('chapter-selector-overlay');
            if (overlay) {
                overlay.classList.remove('active');
            }
            
            // Hide floating chapter popover
            document.getElementById('floating-chapter-popover')?.classList.remove('active');
            
            // Hide mobile/reading-mode sidebar if active
            if (this.dom.sidebar && this.dom.sidebar.classList.contains('active')) {
                this.dom.sidebar.classList.remove('active');
            }
        };

        if (this.dom.chapterGrid) {
            this.dom.chapterGrid.innerHTML = gridHtml;
            this.dom.chapterGrid.querySelectorAll('.chapter-item').forEach(item => {
                item.addEventListener('click', () => onChapterClick(item));
            });
        }
        const floatGrid = document.getElementById('floating-chapter-grid');
        if (floatGrid) {
            floatGrid.innerHTML = gridHtml;
            floatGrid.querySelectorAll('.chapter-item').forEach(item => {
                item.addEventListener('click', () => onChapterClick(item));
            });
        }
    }

    getBookGenreKey(b, index) {
        if (this.books && this.books.length === 66) {
            if (index >= 0 && index <= 4) return 'mosebøkene';
            if (index >= 5 && index <= 16) return 'historiske';
            if (index >= 17 && index <= 21) return 'visdom';
            if (index >= 22 && index <= 38) return 'profetene';
            if (index >= 39 && index <= 42) return 'evangeliene';
            if (index === 43) return 'historiske';
            if (index >= 44 && index <= 64) return 'brevene';
            if (index === 65) return 'apokalyptisk';
        }
        const id = String(b.id || '').toUpperCase();
        if (['GEN', 'EXO', 'EXOD', 'LEV', 'NUM', 'DEU', 'DEUT', '1', '2', '3', '4', '5'].includes(id)) return 'mosebøkene';
        if (['JOS', 'JOSH', 'JDG', 'JUDG', 'RUT', 'RUTH', '1SA', '1SAM', '2SA', '2SAM', '1KI', '1KNG', '2KI', '2KNG', '1CH', '1CHR', '2CH', '2CHR', 'EZR', 'EZRA', 'NEH', 'EST', 'ESTH'].includes(id)) return 'historiske';
        if (['JOB', 'PSA', 'PSALM', 'PRO', 'PROV', 'ECC', 'ECCL', 'SNG', 'SONG'].includes(id)) return 'visdom';
        if (['ISA', 'JER', 'LAM', 'EZK', 'EZEK', 'DAN', 'HOS', 'JOL', 'JOEL', 'AMO', 'AMOS', 'OBA', 'OBAD', 'JON', 'JONAH', 'MIC', 'NAH', 'HAB', 'ZEP', 'ZEPH', 'HAG', 'ZCH', 'ZECH', 'MAL'].includes(id)) return 'profetene';
        if (['MAT', 'MRK', 'MARK', 'LUK', 'LUKE', 'JHN', 'JOHN'].includes(id)) return 'evangeliene';
        if (['ACT', 'ACTS'].includes(id)) return 'historiske';
        if (['ROM', '1CO', '1COR', '2CO', '2COR', 'GAL', 'EPH', 'PHP', 'PHIL', 'COL', '1TH', '1THES', '2TH', '2THES', '1TI', '1TIM', '2TI', '2TIM', 'TIT', 'TITUS', 'PHM', 'PHILEM', 'HEB', 'JAS', '1PE', '1PET', '2PE', '2PET', '1JO', '1JOHN', '2JO', '2JOHN', '3JO', '3JOHN', 'JUD', 'JUDE'].includes(id)) return 'brevene';
        if (['REV'].includes(id)) return 'apokalyptisk';
        return 'andre';
    }

    getGenreLabels() {
        const lang = document.documentElement.lang || 'no';
        if (lang === 'en') {
            return [
                { key: 'all', label: 'All' },
                { key: 'mosebøkene', label: 'Pentateuch' },
                { key: 'historiske', label: 'History' },
                { key: 'visdom', label: 'Wisdom' },
                { key: 'profetene', label: 'Prophets' },
                { key: 'evangeliene', label: 'Gospels' },
                { key: 'brevene', label: 'Epistles' },
                { key: 'apokalyptisk', label: 'Revelation' }
            ];
        } else if (lang === 'es') {
            return [
                { key: 'all', label: 'Todos' },
                { key: 'mosebøkene', label: 'Pentateuco' },
                { key: 'historiske', label: 'Históricos' },
                { key: 'visdom', label: 'Sabiduría' },
                { key: 'profetene', label: 'Profetas' },
                { key: 'evangeliene', label: 'Evangelios' },
                { key: 'brevene', label: 'Epístolas' },
                { key: 'apokalyptisk', label: 'Apocalipsis' }
            ];
        }
        return [
            { key: 'all', label: 'Alle' },
            { key: 'mosebøkene', label: 'Mosebøkene' },
            { key: 'historiske', label: 'Historiske' },
            { key: 'visdom', label: 'Visdom' },
            { key: 'profetene', label: 'Profetene' },
            { key: 'evangeliene', label: 'Evangeliene' },
            { key: 'brevene', label: 'Brevene' },
            { key: 'apokalyptisk', label: 'Åpenbaringen' }
        ];
    }

    async renderFloatingBooks() {
        const container = document.getElementById('floating-books-container');
        if (!container) return;

        if (!this.books || !this.books.length) {
            await this.loadBooks();
        }

        if (!this.books || !this.books.length) {
            container.innerHTML = `<div style="padding: 16px; text-align: center; color: var(--text-muted); font-size: 13px;">Laster bøker...</div>`;
            return;
        }

        const isEn = document.documentElement.lang === 'en' || window.location.pathname.includes('/en/');
        const isEs = document.documentElement.lang === 'es' || window.location.pathname.includes('/es/');
        
        const otTitle = isEn ? 'Old Testament' : (isEs ? 'Antiguo Testamento' : 'Det Gamle Testamente');
        const ntTitle = isEn ? 'New Testament' : (isEs ? 'Nuevo Testamento' : 'Det Nye Testamente');
        const searchPlaceholder = isEn ? 'Search books or genres...' : (isEs ? 'Buscar libros o géneros...' : 'Søk bok eller sjanger...');

        const genres = this.getGenreLabels();
        const genreMap = {};
        genres.forEach(g => { genreMap[g.key] = g.label; });

        const isNewTestament = (bookId, index) => {
            if (this.books.length === 66) return index >= 39;
            const bookIdNum = parseInt(bookId, 10);
            return bookIdNum >= 40 || ['MAT', 'MRK', 'LUK', 'JHN', 'ACT', 'ROM', '1CO', '2CO', 'GAL', 'EPH', 'PHP', 'COL', '1TH', '2TH', '1TI', '2TI', 'TIT', 'PHM', 'HEB', 'JAS', '1PE', '2PE', '1JO', '2JO', '3JO', 'JUD', 'REV'].includes(bookId);
        };

        // Render Sticky Genre Filter & Search Controls
        let html = `
            <div class="book-genre-filter-container" style="position: sticky; top: 0; background: var(--bg-card, #ffffff); z-index: 20; padding: 4px 0 12px 0; margin-bottom: 12px; border-bottom: 1px solid var(--border-color, rgba(0,0,0,0.08));">
                <div style="position: relative; margin-bottom: 10px;">
                    <input type="text" id="floating-book-search-input" placeholder="${searchPlaceholder}" style="width: 100%; padding: 9px 14px 9px 36px; font-size: 13px; font-weight: 500; border-radius: 12px; border: 1px solid var(--border-color, rgba(0,0,0,0.15)); background: var(--bg-body, #faf9f6); color: var(--text-base, #1e293b); outline: none;">
                    <span class="material-symbols-outlined" style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); font-size: 18px; color: var(--text-muted, #94a3b8); pointer-events: none;">search</span>
                </div>
                <div class="genre-pills-bar" style="display: flex; gap: 8px; overflow-x: auto; padding: 6px 2px 8px 2px; scrollbar-width: none; -webkit-overflow-scrolling: touch;">
                    ${genres.map(g => `
                        <button type="button" class="genre-pill-btn ${g.key === 'all' ? 'active' : ''}" data-genre="${g.key}" style="padding: 7px 16px; font-size: 12px; font-weight: 700; border-radius: 99px; white-space: nowrap; cursor: pointer; border: 1px solid ${g.key === 'all' ? 'var(--bible-primary, #d17d39)' : 'var(--border-color, rgba(0,0,0,0.12))'}; background: ${g.key === 'all' ? 'var(--bible-primary, #d17d39)' : 'rgba(0,0,0,0.04)'}; color: ${g.key === 'all' ? '#ffffff' : 'var(--text-base, #334155)'}; transition: all 0.2s ease;">
                            ${g.label}
                        </button>
                    `).join('')}
                </div>
            </div>
            <div id="floating-books-items-list" style="display: flex; flex-direction: column; gap: 4px;">
        `;

        let hasAddedOT = false;
        let hasAddedNT = false;

        this.books.forEach((b, index) => {
            const isNT = isNewTestament(b.id, index);
            const genreKey = this.getBookGenreKey(b, index);
            const genreLabel = genreMap[genreKey] || '';

            if (!isNT && !hasAddedOT) {
                html += `<div class="testament-header-pill ot-header-pill" style="padding: 6px 12px; margin: 4px 0 8px 0; font-size: 11px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; color: var(--bible-primary, #d17d39); background: rgba(209, 125, 57, 0.08); border-radius: 8px; border-left: 3px solid var(--bible-primary, #d17d39);">${otTitle}</div>`;
                hasAddedOT = true;
            } else if (isNT && !hasAddedNT) {
                html += `<div class="testament-header-pill nt-header-pill" style="padding: 6px 12px; margin: 16px 0 8px 0; font-size: 11px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; color: var(--bible-primary, #d17d39); background: rgba(209, 125, 57, 0.08); border-radius: 8px; border-left: 3px solid var(--bible-primary, #d17d39);">${ntTitle}</div>`;
                hasAddedNT = true;
            }

            const isActive = b.id === this.selectedBookId ? 'active' : '';
            html += `
                <div class="floating-book-item ${isActive}" data-id="${b.id}" data-genre="${genreKey}" data-name="${b.name.toLowerCase()}" data-testament="${isNT ? 'nt' : 'ot'}">
                    <span style="display: flex; align-items: center; gap: 8px;">
                        ${isActive ? '<span class="material-symbols-outlined" style="font-size: 18px; color: #ffffff;">check_circle</span>' : ''}
                        <span>${b.name}</span>
                        ${genreLabel ? `<span class="genre-badge" style="font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 4px; background: rgba(0,0,0,0.06); opacity: 0.75; margin-left: 4px;">${genreLabel}</span>` : ''}
                    </span>
                    <span class="material-symbols-outlined" style="font-size: 16px; opacity: ${isActive ? '1' : '0.5'};">${isActive ? 'check' : 'chevron_right'}</span>
                </div>
            `;
        });

        html += `</div>`;
        container.innerHTML = html;

        // Bind clicks on book items
        container.querySelectorAll('.floating-book-item').forEach(item => {
            item.addEventListener('click', async () => {
                const bookId = item.dataset.id;
                
                container.querySelectorAll('.floating-book-item').forEach(el => el.classList.remove('active'));
                item.classList.add('active');

                await this.selectBook(bookId);

                const headerChapters = document.getElementById('floating-popover-header-chapters');
                const headerBooks = document.getElementById('floating-popover-header-books');
                const chapGrid = document.getElementById('floating-chapter-grid');
                const booksCont = document.getElementById('floating-books-container');
                if (headerChapters) headerChapters.style.display = 'flex';
                if (headerBooks) headerBooks.style.display = 'none';
                if (chapGrid) chapGrid.style.display = 'grid';
                if (booksCont) booksCont.style.display = 'none';
            });
        });

        // Filter Logic for Genre Pills & Search Input
        const filterBookList = (selectedGenre, searchVal) => {
            const cleanSearch = (searchVal || '').toLowerCase().trim();
            const items = container.querySelectorAll('.floating-book-item');
            
            let visibleOTCount = 0;
            let visibleNTCount = 0;

            items.forEach(item => {
                const itemGenre = item.dataset.genre;
                const itemName = item.dataset.name;
                const itemTestament = item.dataset.testament;

                const matchesGenre = (selectedGenre === 'all' || itemGenre === selectedGenre);
                const matchesSearch = (!cleanSearch || itemName.includes(cleanSearch) || itemGenre.includes(cleanSearch));

                if (matchesGenre && matchesSearch) {
                    item.style.display = 'flex';
                    if (itemTestament === 'ot') visibleOTCount++;
                    if (itemTestament === 'nt') visibleNTCount++;
                } else {
                    item.style.display = 'none';
                }
            });

            // Toggle testament headers based on visible books
            const otHeader = container.querySelector('.ot-header-pill');
            const ntHeader = container.querySelector('.nt-header-pill');
            if (otHeader) otHeader.style.display = visibleOTCount > 0 ? 'block' : 'none';
            if (ntHeader) ntHeader.style.display = visibleNTCount > 0 ? 'block' : 'none';
        };

        // Bind Genre Pills
        let currentSelectedGenre = 'all';
        const searchInput = container.querySelector('#floating-book-search-input');

        container.querySelectorAll('.genre-pill-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                container.querySelectorAll('.genre-pill-btn').forEach(b => {
                    b.classList.remove('active');
                    b.style.background = 'rgba(0,0,0,0.04)';
                    b.style.color = 'var(--text-base, #334155)';
                    b.style.borderColor = 'var(--border-color, rgba(0,0,0,0.12))';
                });
                btn.classList.add('active');
                btn.style.background = 'var(--bible-primary, #d17d39)';
                btn.style.color = '#ffffff';
                btn.style.borderColor = 'var(--bible-primary, #d17d39)';

                currentSelectedGenre = btn.dataset.genre;
                filterBookList(currentSelectedGenre, searchInput ? searchInput.value : '');
            });
        });

        // Bind Search Input
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                filterBookList(currentSelectedGenre, e.target.value);
            });
        }

        // Scroll active book into view smoothly
        const activeItem = container.querySelector('.floating-book-item.active');
        if (activeItem) {
            setTimeout(() => {
                activeItem.scrollIntoView({ block: 'center', behavior: 'smooth' });
            }, 50);
        }
    }

    async selectChapter(chapterId) {
        // Stop audio playback when changing chapter
        this.stopAudioPlayback();

        this.clearSelection();
        this.selectedChapterId = chapterId;

        // Synchronize selectedBookId if chapterId contains BOOKID_CHAPTERNUM or BOOKID_intro
        const [bookPartId, chapNumPart] = chapterId.includes('_') ? chapterId.split('_') : [null, chapterId];
        if (bookPartId && this.selectedBookId !== bookPartId) {
            this.selectedBookId = bookPartId;
        }

        // Save last read position to localStorage
        this.safeSetLocalStorage('hkm_bible_last_chapter', chapterId);
        if (this.selectedBookId) {
            this.safeSetLocalStorage('hkm_bible_last_book', this.selectedBookId);
        }

        // Highlight in grid
        document.querySelectorAll('.chapter-grid .chapter-item, #floating-chapter-grid .chapter-item').forEach(el => {
            if (el.dataset.id === chapterId) el.classList.add('active');
            else el.classList.remove('active');
        });

        // Handle Intro page route: loads chapter 1 in main pane and opens Book Intro Modal Dialog Box
        if (chapNumPart === 'intro' || chapterId === 'intro') {
            const targetBookId = bookPartId || this.selectedBookId;
            this.selectedBookId = targetBookId;
            await this.selectChapter(`${targetBookId}_1`);
            this.openBookIntroModal(targetBookId);
            return;
        }

        // Show loading spinner
        this.dom.readingPane = this.dom.readingPane || document.getElementById('bible-reading-pane');
        if (this.dom.readingPane) {
            this.dom.readingPane.innerHTML = `
                <div style="text-align: center; padding: 100px 0; color: #64748b;">
                    <div class="spinner" style="margin: 0 auto 16px;"></div>
                    <p style="font-size: 15px;">Henter bibeltekst...</p>
                </div>
            `;
        }

        try {
            const res = await fetch(`/api/bible/bibles/${this.selectedBibleId}/chapters/${chapterId}`);
            if (!res.ok) throw new Error(`HTTP error ${res.status}`);
            const payload = await res.json();
            this.activeChapterData = payload.data;

            if (this.activeChapterData) {
                this.renderActiveChapter();
                this.updateNavigationButtons();
                this.addToHistory();
                this.updateRelatedResources();
                this.loadChapterCrossReferences();
            } else {
                throw new Error("Empty chapter data");
            }
        } catch (e) {
            console.error("Error loading chapter content:", e);
            if (this.dom.readingPane) {
                this.dom.readingPane.innerHTML = `
                    <div style="text-align: center; padding: 80px 20px; color: #ef4444;">
                        <span class="material-symbols-outlined" style="font-size: 48px;">error</span>
                        <p style="margin-top: 12px; font-weight: 600;">Kunne ikke hente bibelteksten</p>
                        <p style="font-size: 13px; color: #64748b; margin-top: 4px;">Sjekk nettforbindelsen din og prøv igjen.</p>
                        <button class="btn btn-outline btn-sm" style="margin-top: 16px;" onclick="location.reload()">Last på nytt</button>
                    </div>
                `;
            }
        }
    }

    async loadChapterCrossReferences() {
        if (this.dom.chapterCrossRefsSection) {
            this.dom.chapterCrossRefsSection.style.display = 'none';
        }
    }

    async loadChapterVerseCrossReferences() {
        const currentBook = this.books ? this.books.find(b => b.id === this.selectedBookId) : null;
        const bookName = currentBook ? currentBook.name : '';
        const chapterNum = this.selectedChapterId ? this.selectedChapterId.split('_')[1] : '1';
        const fullRef = `${bookName} ${chapterNum}`;

        try {
            const res = await fetch(`/api/bible/chapter-crossrefs?chapterName=${encodeURIComponent(fullRef)}`);
            if (!res.ok) throw new Error("Failed to load chapter crossrefs");
            const map = await res.json();
            this.attachVerseCrossReferenceButtons(map);
        } catch (e) {
            console.warn("Using default key verses for cross references:", e);
            this.attachVerseCrossReferenceButtons({ "1": true, "4": true, "14": true });
        }
    }

    attachVerseCrossReferenceButtons() {
        if (!this.dom.readingPane) return;
        
        // Remove any verse icons from reading pane so text flow remains 100% clean
        this.dom.readingPane.querySelectorAll('.verse-crossref-icon-btn').forEach(b => b.remove());
        this.dom.readingPane.style.paddingRight = '0px';
    }

    async openVerseCrossReferenceModal(verseNum, verseText) {
        const modal = document.getElementById('verse-crossref-modal');
        const titleEl = document.getElementById('verse-crossref-title');
        const previewEl = document.getElementById('verse-crossref-quote-preview');
        const listEl = document.getElementById('verse-crossref-list');

        if (!modal || !listEl) return;

        this.crossrefCache = this.crossrefCache || {};

        const currentBook = this.books ? this.books.find(b => b.id === this.selectedBookId) : null;
        const bookName = currentBook ? currentBook.name : '';
        const chapterNum = this.selectedChapterId ? this.selectedChapterId.split('_')[1] : '1';
        const fullRef = `${bookName} ${chapterNum}:${verseNum}`;

        if (titleEl) titleEl.textContent = fullRef;
        if (previewEl) previewEl.textContent = verseText;

        const renderList = (crossRefs) => {
            if (!crossRefs || crossRefs.length === 0) {
                listEl.innerHTML = `
                    <div style="text-align: center; padding: 24px 0; color: var(--text-muted); font-size: 13.5px;">
                        Ingen kryssreferanser funnet.
                    </div>
                `;
                return;
            }
            const letters = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
            listEl.innerHTML = crossRefs.map((item, idx) => {
                const letter = letters[idx % letters.length];
                return `
                    <div class="verse-crossref-row-item" data-idx="${idx}" style="display: flex; align-items: baseline; gap: 14px; padding: 12px 6px; border-bottom: 1px solid var(--border-subtle, rgba(0,0,0,0.06)); cursor: pointer; transition: background 0.15s ease;">
                        <span style="font-weight: 700; font-size: 13px; color: var(--text-muted, #64748b); width: 14px; flex-shrink: 0; text-align: center;">${letter}</span>
                        <div style="flex: 1; display: flex; flex-wrap: wrap; align-items: baseline; gap: 8px;">
                            <span class="crossref-ref-link" style="color: var(--hkm-terracotta, #d17d39); font-weight: 700; font-size: 14.5px; text-decoration: none; cursor: pointer;">${item.ref}</span>
                            <span style="font-size: 13.5px; color: var(--text-base, #334155); line-height: 1.45;">${item.explanation}</span>
                        </div>
                    </div>
                `;
            }).join('');

            const rows = listEl.querySelectorAll('.verse-crossref-row-item');
            rows.forEach((row, idx) => {
                row.addEventListener('mouseenter', () => {
                    row.style.background = 'rgba(37, 99, 235, 0.04)';
                });
                row.addEventListener('mouseleave', () => {
                    row.style.background = 'transparent';
                });
                row.addEventListener('click', () => {
                    const targetRef = crossRefs[idx].ref;
                    modal.classList.remove('active');
                    modal.style.display = 'none';
                    this.clearSelection();
                    this.touchMoved = false;
                    this.parseAndNavigateToReference(targetRef);
                });
            });
        };

        // Open modal instantly with zero animation delay
        modal.style.display = 'flex';
        requestAnimationFrame(() => modal.classList.add('active'));
        this.pushModalHistoryState('verse-crossref-modal');

        // Instant Cache Hit!
        if (this.crossrefCache[fullRef]) {
            renderList(this.crossrefCache[fullRef]);
            return;
        }

        // Fast placeholder while fetching
        listEl.innerHTML = `
            <div style="text-align: center; padding: 24px 0; color: var(--text-muted);">
                <div class="spinner" style="margin: 0 auto 10px;"></div>
                <p style="font-size: 13px;">Henter kryssreferanser...</p>
            </div>
        `;

        try {
            const res = await fetch(`/api/bible/cross-references?chapterName=${encodeURIComponent(fullRef)}`);
            if (!res.ok) throw new Error("Failed to fetch cross references");
            const crossRefs = await res.json();
            this.crossrefCache[fullRef] = crossRefs;
            renderList(crossRefs);
        } catch (e) {
            console.error("Error fetching verse cross references:", e);
            listEl.innerHTML = `
                <div style="text-align: center; padding: 20px; color: #ef4444; font-size: 13px;">
                    Kunne ikke laste kryssreferanser. Sjekk tilkoblingen din.
                </div>
            `;
        }
    }

    openBookIntroModal(bookId) {
        bookId = bookId || this.selectedBookId;
        const intro = typeof getBibleBookIntroduction === 'function' 
            ? getBibleBookIntroduction(bookId) 
            : (window.getBibleBookIntroduction ? window.getBibleBookIntroduction(bookId) : null);
        
        const currentBook = this.books ? this.books.find(b => b.id === bookId) : null;
        const bookName = currentBook ? currentBook.name : (intro ? intro.title : bookId);

        const lang = document.documentElement.lang || 'no';
        const labelIntro = lang === 'en' ? 'Book Introduction' : (lang === 'es' ? 'Introducción al libro' : 'Bokintroduksjon');
        const labelAuthor = lang === 'en' ? 'Author' : (lang === 'es' ? 'Autor' : 'Forfatter');
        const labelDate = lang === 'en' ? 'Date' : (lang === 'es' ? 'Fecha' : 'Datering');
        const labelGenre = lang === 'en' ? 'Genre' : (lang === 'es' ? 'Género' : 'Sjanger');
        const labelTheme = lang === 'en' ? 'Main Theme' : (lang === 'es' ? 'Tema principal' : 'Hovedtema');
        const labelHowToRead = lang === 'en' ? 'How to Read This Book' : (lang === 'es' ? 'Cómo leer este libro' : 'Hvordan lese boken best');
        const labelKeyVerses = lang === 'en' ? 'Key Verses' : (lang === 'es' ? 'Versículos clave' : 'Sentrale vers');
        const labelClose = lang === 'en' ? 'Close & Read' : (lang === 'es' ? 'Cerrar y leer' : 'Lukk og les');

        let modal = document.getElementById('hkm-book-intro-modal');
        if (modal) modal.remove();

        modal = document.createElement('div');
        modal.className = 'hkm-modal-overlay hkm-book-intro-overlay';
        const isMobileScreen = window.innerWidth <= 768;
        modal.style.cssText = `
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            height: 100dvh !important;
            background: rgba(15, 23, 42, 0.55) !important;
            backdrop-filter: blur(6px) !important;
            -webkit-backdrop-filter: blur(6px) !important;
            z-index: 35000 !important;
            display: flex !important;
            align-items: flex-end !important;
            justify-content: center !important;
            padding: 0 !important;
            box-sizing: border-box !important;
        `;

        const closeModal = () => {
            document.body.style.overflow = '';
            const card = modal.querySelector('.hkm-book-intro-sheet-card');
            if (card) {
                if (isMobileScreen) {
                    card.style.transition = 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)';
                    card.style.transform = 'translateY(100%)';
                } else {
                    card.style.transition = 'transform 0.2s ease, opacity 0.2s ease';
                    card.style.transform = 'scale(0.94)';
                    card.style.opacity = '0';
                }
                modal.style.transition = 'opacity 0.2s ease';
                modal.style.opacity = '0';
                setTimeout(() => {
                    modal.remove();
                }, 220);
            } else {
                modal.remove();
            }
        };
        document.body.style.overflow = 'hidden';

        if (!intro) {
            modal.innerHTML = `
                <div class="hkm-book-intro-sheet-card" onclick="event.stopPropagation();" style="background: var(--bg-card, #ffffff); border: 1px solid var(--border-color, rgba(0,0,0,0.08)); border-radius: 24px; width: 100%; max-width: 480px; padding: 24px; text-align: center; box-shadow: 0 24px 60px -12px rgba(0,0,0,0.35); margin: auto;">
                    <div class="sheet-handle-bar" style="width: 44px; height: 5px; background: var(--border-color, rgba(0,0,0,0.18)); border-radius: 99px; margin: 0 auto 16px; cursor: pointer;"></div>
                    <div style="width: 56px; height: 56px; border-radius: 16px; background: rgba(27, 73, 101, 0.08); color: #1B4965; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
                        <span class="material-symbols-outlined" style="font-size: 28px;">auto_stories</span>
                    </div>
                    <h2 style="font-size: 22px; font-weight: 800; margin: 0 0 8px 0; color: var(--text-base);">${bookName}</h2>
                    <p style="color: var(--text-muted, #64748b); margin: 0 0 24px 0; font-size: 14.5px; line-height: 1.5;">Det er ingen skriftlig introduksjon for denne boken ennå.</p>
                    <button id="btn-close-empty-intro" style="min-height: 44px; padding: 10px 24px; font-size: 14px; font-weight: 700; border-radius: 9999px; background: #1B4965; color: #ffffff; border: none; cursor: pointer;">
                        ${labelClose}
                    </button>
                </div>
            `;
            document.body.appendChild(modal);
            const closeBtn = modal.querySelector('#btn-close-empty-intro');
            if (closeBtn) closeBtn.onclick = () => closeModal();
            modal.onclick = (e) => { if (e.target === modal) closeModal(); };
            const card = modal.querySelector('.hkm-book-intro-sheet-card');
            if (card) {
                card.style.transform = 'translateY(100%)';
                card.style.transition = 'transform 0.28s cubic-bezier(0.16, 1, 0.3, 1)';
                modal.style.transition = 'background-color 0.28s ease';
                requestAnimationFrame(() => {
                    card.style.transform = 'translateY(0)';
                });
                this.setupBottomSheetSwipeDown(card, () => {
                    document.body.style.overflow = '';
                    modal.remove();
                });
            }
            return;
        }

        const keyVersesHtml = (intro.keyVerses || []).map(v => `
            <div style="border-left: 4px solid #D17D39; padding: 14px 18px; margin-top: 12px; background: rgba(209,125,57,0.05); border-radius: 0 12px 12px 0;">
                <p style="margin: 0; font-size: 15px; font-style: italic; color: var(--text-base); line-height: 1.6; font-family: var(--font-serif, Georgia, serif);">"${v.text}"</p>
                <span style="font-size: 13px; font-weight: 700; color: #D17D39; font-style: normal; display: inline-block; margin-top: 6px;">— ${v.ref}</span>
            </div>
        `).join('');

        const summaryParagraphsHtml = (intro.summary || []).map(p => `
            <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.7; color: var(--text-base); font-family: var(--font-serif, Georgia, serif);">${p}</p>
        `).join('');

        const howToReadHtml = intro.howToRead ? `
            <div style="margin: 20px 0 10px 0; background: rgba(209,125,57,0.06); border-radius: 16px; padding: 18px 20px; border: 1px solid rgba(209,125,57,0.2);">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                    <span class="material-symbols-outlined" style="font-size: 20px; color: #D17D39;">tips_and_updates</span>
                    <span style="font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: #D17D39;">${labelHowToRead}</span>
                </div>
                <p style="margin: 0; font-size: 14.5px; line-height: 1.65; color: var(--text-base); font-weight: 500;">${intro.howToRead}</p>
            </div>
        ` : '';

        const cardStyles = isMobileScreen ? `
            background: var(--bg-card, #ffffff);
            border: 1px solid var(--border-color, rgba(0,0,0,0.1));
            border-bottom: none;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            box-sizing: border-box;
            width: 100% !important;
            max-width: 100% !important;
            border-radius: 28px 28px 0 0 !important;
            padding-top: 16px !important;
            max-height: 85vh !important;
            max-height: 85dvh !important;
            margin-top: auto !important;
            box-shadow: 0 -12px 48px rgba(0, 0, 0, 0.25) !important;
            animation: slideUpSheet 0.28s cubic-bezier(0.16, 1, 0.3, 1) !important;
        ` : `
            background: var(--bg-card, #ffffff);
            border: 1px solid var(--border-color, rgba(0,0,0,0.12));
            border-bottom: none;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            box-sizing: border-box;
            width: 100% !important;
            max-width: 580px !important;
            border-radius: 24px 24px 0 0 !important;
            padding-top: 20px !important;
            max-height: 82vh !important;
            max-height: 82dvh !important;
            margin: 0 auto !important;
            margin-top: auto !important;
            margin-bottom: 0 !important;
            box-shadow: 0 -16px 48px rgba(0, 0, 0, 0.35) !important;
            animation: slideUpSheet 0.28s cubic-bezier(0.16, 1, 0.3, 1) !important;
        `;

        modal.innerHTML = `
            <div class="hkm-book-intro-sheet-card" onclick="event.stopPropagation();" style="${cardStyles}">
                
                <!-- Drag Handle Bar (Top of sheet) -->
                <div class="sheet-handle-bar" style="width: 44px; height: 5px; background: var(--border-color, rgba(0,0,0,0.22)); border-radius: 99px; margin: 0 auto 12px !important; cursor: pointer; flex-shrink: 0;"></div>

                <!-- Header Bar (Left title, right circular close button, clean flex layout) -->
                <div class="hkm-book-intro-header" style="padding: 4px 20px 14px 20px; display: flex; align-items: center; justify-content: space-between; position: relative; flex-shrink: 0; background: var(--bg-card, #ffffff); gap: 12px;">
                    <h3 style="margin: 0; font-size: 22px; font-weight: 800; color: var(--text-base); line-height: 1.25; font-family: var(--font-heading, inherit); text-align: left; flex: 1;">${intro.title}</h3>
                    <button id="btn-close-book-intro-x" title="Lukk" style="background: var(--bg-surface, #f1f5f9); border: none; color: var(--text-base, #334155); cursor: pointer; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; outline: none; transition: background 0.2s ease; flex-shrink: 0;">
                        <span class="material-symbols-outlined" style="font-size: 20px;">close</span>
                    </button>
                </div>

                <!-- Scrollable Body Content -->
                <div class="hkm-book-intro-scroll-body sheet-scroll-body" style="padding: 20px; overflow-y: auto; flex: 1; -webkit-overflow-scrolling: touch; background: var(--bg-card, #ffffff);">
                    
                    <!-- Metadata Rows -->
                    <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px;">
                        <!-- Author Row -->
                        <div style="display: flex; align-items: center; gap: 10px; background: rgba(27,73,101,0.04); border: 1px solid rgba(27,73,101,0.08); border-radius: 12px; padding: 10px 14px; font-size: 13.5px;">
                            <span class="material-symbols-outlined" style="font-size: 18px; color: #1B4965; flex-shrink: 0;">edit_note</span>
                            <span style="color: var(--text-muted, #64748b); font-weight: 600; white-space: nowrap; flex-shrink: 0;">${labelAuthor}:</span>
                            <strong style="color: var(--text-base); font-weight: 700;">${intro.author}</strong>
                        </div>

                        <!-- Date Row -->
                        <div style="display: flex; align-items: center; gap: 10px; background: rgba(209,125,57,0.04); border: 1px solid rgba(209,125,57,0.1); border-radius: 12px; padding: 10px 14px; font-size: 13.5px;">
                            <span class="material-symbols-outlined" style="font-size: 18px; color: #D17D39; flex-shrink: 0;">event</span>
                            <span style="color: var(--text-muted, #64748b); font-weight: 600; white-space: nowrap; flex-shrink: 0;">${labelDate}:</span>
                            <strong style="color: var(--text-base); font-weight: 700;">${intro.date}</strong>
                        </div>

                        <!-- Genre Row -->
                        <div style="display: flex; align-items: center; gap: 10px; background: rgba(5,150,105,0.04); border: 1px solid rgba(5,150,105,0.1); border-radius: 12px; padding: 10px 14px; font-size: 13.5px;">
                            <span class="material-symbols-outlined" style="font-size: 18px; color: #059669; flex-shrink: 0;">category</span>
                            <span style="color: var(--text-muted, #64748b); font-weight: 600; white-space: nowrap; flex-shrink: 0;">${labelGenre}:</span>
                            <strong style="color: var(--text-base); font-weight: 700;">${intro.genre}</strong>
                        </div>
                    </div>

                    <!-- Sleek Hovedtema Card -->
                    <div style="margin-bottom: 20px; background: rgba(27,73,101,0.04); border-radius: 14px; padding: 16px 18px; border-left: 4px solid #1B4965;">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                            <span class="material-symbols-outlined" style="font-size: 18px; color: #1B4965;">lightbulb</span>
                            <span style="font-size: 11.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: #1B4965;">${labelTheme}</span>
                        </div>
                        <div style="font-size: 15px; font-weight: 700; color: var(--text-base); line-height: 1.45;">${intro.theme}</div>
                    </div>

                    <!-- Detailed Summary Paragraphs -->
                    <div class="hkm-book-intro-body" style="margin-bottom: 20px;">
                        ${summaryParagraphsHtml}
                    </div>

                    ${howToReadHtml}
                </div>

                <!-- Floating Bottom Action Button (Pill style like reference screenshot) -->
                <div style="padding: 14px 20px; padding-bottom: max(14px, env(safe-area-inset-bottom, 14px)); border-top: 1px solid var(--border-color, rgba(0,0,0,0.08)); display: flex; justify-content: center; align-items: center; flex-shrink: 0; background: var(--bg-card, #ffffff);">
                    <button id="btn-close-book-intro-footer" style="background: var(--bg-surface, #f8fafc); border: 1px solid var(--border-color, #e2e8f0); color: var(--text-base, #334155); border-radius: 9999px; padding: 10px 24px; font-weight: 700; font-size: 13.5px; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; box-shadow: 0 4px 14px rgba(0,0,0,0.06); transition: all 0.2s ease;">
                        <span class="material-symbols-outlined" style="font-size: 18px; color: #D17D39;">auto_stories</span>
                        <span>${labelClose}</span>
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const closeBtnX = modal.querySelector('#btn-close-book-intro-x');
        const closeBtnFooter = modal.querySelector('#btn-close-book-intro-footer');
        if (closeBtnX) closeBtnX.onclick = () => closeModal();
        if (closeBtnFooter) closeBtnFooter.onclick = () => closeModal();
        modal.onclick = (e) => {
            if (e.target === modal) closeModal();
        };

        const card = modal.querySelector('.hkm-book-intro-sheet-card');
        if (card) {
            if (isMobileScreen) {
                card.style.transform = 'translateY(100%)';
                card.style.transition = 'transform 0.28s cubic-bezier(0.16, 1, 0.3, 1)';
                requestAnimationFrame(() => {
                    card.style.transform = 'translateY(0)';
                });
                this.setupBottomSheetSwipeDown(card, () => {
                    document.body.style.overflow = '';
                    modal.remove();
                });
            } else {
                card.style.transform = 'scale(0.94)';
                card.style.opacity = '0';
                card.style.transition = 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.22s ease';
                requestAnimationFrame(() => {
                    card.style.transform = 'scale(1)';
                    card.style.opacity = '1';
                });
            }
        }
    }

    renderBookIntroPage(bookId) {
        this.openBookIntroModal(bookId);
    }

    renderBookIntroCard(bookId) {
        const intro = typeof getBibleBookIntroduction === 'function' 
            ? getBibleBookIntroduction(bookId) 
            : (window.getBibleBookIntroduction ? window.getBibleBookIntroduction(bookId) : null);
        if (!intro) return '';

        const lang = document.documentElement.lang || 'no';
        const labelIntro = lang === 'en' ? 'Book Introduction' : (lang === 'es' ? 'Introducción al libro' : 'Bokintroduksjon');
        const labelAuthor = lang === 'en' ? 'Author' : (lang === 'es' ? 'Autor' : 'Forfatter');
        const labelDate = lang === 'en' ? 'Date' : (lang === 'es' ? 'Fecha' : 'Datering');
        const labelGenre = lang === 'en' ? 'Genre' : (lang === 'es' ? 'Género' : 'Sjanger');
        const labelTheme = lang === 'en' ? 'Main Theme' : (lang === 'es' ? 'Tema principal' : 'Hovedtema');
        const labelHowToRead = lang === 'en' ? 'How to Read This Book' : (lang === 'es' ? 'Cómo leer este libro' : 'Hvordan lese boken best');
        const labelKeyVerses = lang === 'en' ? 'Key Verses' : (lang === 'es' ? 'Versículos clave' : 'Sentrale vers');
        const labelCollapse = lang === 'en' ? 'Hide introduction' : (lang === 'es' ? 'Ocultar introducción' : 'Skjul introduksjon');

        const keyVersesHtml = (intro.keyVerses || []).map(v => `
            <div style="border-left: 3px solid #d17d39; padding-left: 12px; margin-top: 8px;">
                <p style="margin: 0; font-size: 13.5px; font-style: italic; color: var(--text-base); line-height: 1.5;">"${v.text}"</p>
                <span style="font-size: 11.5px; font-weight: 700; color: #d17d39; font-style: normal; display: inline-block; margin-top: 2px;">— ${v.ref}</span>
            </div>
        `).join('');

        const summaryParagraphsHtml = (intro.summary || []).map(p => `
            <p style="margin: 0 0 10px 0; font-size: 14px; line-height: 1.6; color: var(--text-base);">${p}</p>
        `).join('');

        const howToReadHtml = intro.howToRead ? `
            <div style="margin-top: 16px; margin-bottom: 16px; background: linear-gradient(135deg, rgba(209,125,57,0.08) 0%, rgba(27,73,101,0.06) 100%); border-radius: 12px; padding: 14px 16px; border: 1px solid rgba(209,125,57,0.25);">
                <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #d17d39; display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
                    <span class="material-symbols-outlined" style="font-size: 18px; color: #d17d39;">tips_and_updates</span>
                    <span>${labelHowToRead}</span>
                </span>
                <p style="margin: 0; font-size: 13.5px; line-height: 1.55; color: var(--text-base); font-weight: 500;">${intro.howToRead}</p>
            </div>
        ` : '';

        return `
            <div id="hkm-book-intro-card" style="margin-bottom: 24px; border-radius: 16px; background: var(--bg-card, #ffffff); border: 1px solid var(--border-color, rgba(0,0,0,0.08)); box-shadow: 0 4px 16px rgba(0,0,0,0.04); overflow: hidden; transition: all 0.3s ease;">
                <div style="background: linear-gradient(135deg, rgba(27,73,101,0.06) 0%, rgba(209,125,57,0.06) 100%); padding: 16px 20px; border-bottom: 1px solid var(--border-color, rgba(0,0,0,0.06)); display: flex; align-items: center; justify-content: space-between; gap: 12px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div style="width: 36px; height: 36px; border-radius: 10px; background: #1B4965; color: #ffffff; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                            <span class="material-symbols-outlined" style="font-size: 20px;">auto_stories</span>
                        </div>
                        <div>
                            <span style="font-size: 10.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: #d17d39;">${labelIntro}</span>
                            <h2 style="margin: 0; font-size: 17px; font-weight: 800; color: var(--text-base);">${intro.title}</h2>
                        </div>
                    </div>
                    <button id="hkm-book-intro-toggle-btn" style="background: var(--bg-body, #f8fafc); border: 1px solid var(--border-color, #e2e8f0); color: var(--text-base); font-size: 12px; font-weight: 600; padding: 6px 12px; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; transition: all 0.2s ease;">
                        <span class="toggle-text">${labelCollapse}</span>
                        <span class="material-symbols-outlined toggle-icon" style="font-size: 16px; transition: transform 0.3s ease;">expand_less</span>
                    </button>
                </div>
                
                <div id="hkm-book-intro-content" style="padding: 20px; display: block;">
                    <!-- Metadata Rows -->
                    <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px;">
                        <div style="display: flex; align-items: center; gap: 8px; background: rgba(27, 73, 101, 0.06); color: #1B4965; padding: 8px 12px; border-radius: 8px; font-size: 12.5px;">
                            <span style="color: var(--text-muted, #64748b); font-weight: 600; white-space: nowrap; flex-shrink: 0;">${labelAuthor}:</span>
                            <strong style="color: var(--text-base); font-weight: 700;">${intro.author}</strong>
                        </div>
                        <div style="display: flex; align-items: center; gap: 8px; background: rgba(209, 125, 57, 0.06); color: #d17d39; padding: 8px 12px; border-radius: 8px; font-size: 12.5px;">
                            <span style="color: var(--text-muted, #64748b); font-weight: 600; white-space: nowrap; flex-shrink: 0;">${labelDate}:</span>
                            <strong style="color: var(--text-base); font-weight: 700;">${intro.date}</strong>
                        </div>
                        <div style="display: flex; align-items: center; gap: 8px; background: rgba(5, 150, 105, 0.06); color: #059669; padding: 8px 12px; border-radius: 8px; font-size: 12.5px;">
                            <span style="color: var(--text-muted, #64748b); font-weight: 600; white-space: nowrap; flex-shrink: 0;">${labelGenre}:</span>
                            <strong style="color: var(--text-base); font-weight: 700;">${intro.genre}</strong>
                        </div>
                    </div>

                    <div style="margin-bottom: 16px; background: rgba(27, 73, 101, 0.04); border-radius: 10px; padding: 12px 14px; border-left: 4px solid #1B4965;">
                        <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #1B4965; display: block; margin-bottom: 2px;">${labelTheme}</span>
                        <span style="font-size: 13.5px; font-weight: 700; color: var(--text-base); line-height: 1.4;">${intro.theme}</span>
                    </div>

                    <div class="hkm-book-intro-body" style="margin-bottom: 16px;">
                        ${summaryParagraphsHtml}
                    </div>

                    ${howToReadHtml}

                    ${keyVersesHtml ? `
                        <div style="border-top: 1px solid var(--border-color, rgba(0,0,0,0.06)); padding-top: 14px; margin-top: 14px;">
                            <span style="font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); display: block; margin-bottom: 6px;">${labelKeyVerses}</span>
                            ${keyVersesHtml}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    attachBookIntroToggleListener() {
        const toggleBtn = document.getElementById('hkm-book-intro-toggle-btn');
        const content = document.getElementById('hkm-book-intro-content');
        if (!toggleBtn || !content) return;

        toggleBtn.addEventListener('click', () => {
            const isHidden = content.style.display === 'none';
            const lang = document.documentElement.lang || 'no';
            const labelCollapse = lang === 'en' ? 'Hide introduction' : (lang === 'es' ? 'Ocultar introducción' : 'Skjul introduksjon');
            const labelExpand = lang === 'en' ? 'Read full book introduction' : (lang === 'es' ? 'Leer introducción completa' : 'Les bokintroduksjon');
            
            content.style.display = isHidden ? 'block' : 'none';
            const textSpan = toggleBtn.querySelector('.toggle-text');
            const iconSpan = toggleBtn.querySelector('.toggle-icon');
            if (textSpan) textSpan.textContent = isHidden ? labelCollapse : labelExpand;
            if (iconSpan) iconSpan.style.transform = isHidden ? 'rotate(0deg)' : 'rotate(180deg)';
        });
    }



    renderActiveChapter() {
        if (!this.activeChapterData) return;
        this.dom.readingPane = this.dom.readingPane || document.getElementById('bible-reading-pane');
        if (!this.dom.readingPane) return;

        // Render reference title
        try {
            const currentBook = (this.books || []).find(b => b.id === this.selectedBookId);
            const chapterNum = this.selectedChapterId ? this.selectedChapterId.split('_')[1] : '1';
            
            this.dom.currentBookBadge = this.dom.currentBookBadge || document.getElementById('current-book-badge');
            this.dom.currentChapterNumber = this.dom.currentChapterNumber || document.getElementById('current-chapter-number');
            this.dom.currentReferenceTitle = this.dom.currentReferenceTitle || document.getElementById('current-reference-title');
            this.dom.currentTranslationAbbr = this.dom.currentTranslationAbbr || document.getElementById('current-translation-abbr');

            if (this.dom.currentBookBadge) {
                this.dom.currentBookBadge.innerText = currentBook ? currentBook.name.toUpperCase() : '';
            }
            if (this.dom.currentChapterNumber) {
                this.dom.currentChapterNumber.innerText = chapterNum;
                this.dom.currentChapterNumber.style.fontSize = '';
                this.dom.currentChapterNumber.style.fontFamily = '';
                this.dom.currentChapterNumber.style.fontWeight = '';
                this.dom.currentChapterNumber.style.margin = '';
            }
            if (this.dom.currentReferenceTitle) {
                this.dom.currentReferenceTitle.innerText = `${currentBook ? currentBook.name : ''} ${chapterNum}`;
            }
            
            const currentBible = (this.bibles || []).find(t => t.id === this.selectedBibleId);
            if (this.dom.currentTranslationAbbr) {
                this.dom.currentTranslationAbbr.innerText = currentBible ? currentBible.abbreviation : '';
            }
        } catch (titleErr) {
            console.warn("[BibleReader] Error rendering title header:", titleErr);
        }

        // Render pure verses HTML without prepended intro card
        this.dom.readingPane.innerHTML = this.activeChapterData.content || '';

        // Safe secondary steps
        try { this.loadChapterVerseCrossReferences(); } catch (e) { console.warn(e); }
        try { this.restoreHighlights(); } catch (e) { console.warn(e); }
        try { this.applyReadingPlanHighlights(); } catch (e) { console.warn(e); }

        // Inject Audio Play Button, Cross References & Book Intro Button dynamically in side-by-side bar
        try {
            this.dom.btnLookupChapter = this.dom.btnLookupChapter || document.getElementById('btn-lookup-chapter');
            if (this.dom.btnLookupChapter) {
                let actionBar = document.getElementById('chapter-header-action-bar');
                if (!actionBar) {
                    actionBar = document.createElement('div');
                    actionBar.id = 'chapter-header-action-bar';
                    actionBar.style.cssText = 'display: flex; flex-direction: row; align-items: center; justify-content: center; gap: 8px; margin-top: 8px; flex-wrap: wrap; width: 100%;';
                    this.dom.btnLookupChapter.parentNode.insertBefore(actionBar, this.dom.btnLookupChapter.nextSibling);
                }

                let playAudioBtn = document.getElementById('btn-play-audio-dynamic');
                if (!playAudioBtn) {
                    playAudioBtn = document.createElement('button');
                    playAudioBtn.id = 'btn-play-audio-dynamic';
                    playAudioBtn.className = 'nav-btn';
                    playAudioBtn.style.cssText = 'font-size: 12px; padding: 6px 14px; border-radius: 20px; display: inline-flex; align-items: center; gap: 6px; cursor: pointer; background: var(--bg-card, #ffffff); border: 1px solid var(--border-color, #e2e8f0); color: var(--text-base); font-weight: 600; box-shadow: 0 2px 6px rgba(0,0,0,0.04); transition: all 0.2s ease; margin: 0;';
                    playAudioBtn.innerHTML = `
                        <span class="material-symbols-outlined" style="font-size: 16px;">play_circle</span>
                        <span>${this.t('play_audio')}</span>
                    `;
                    playAudioBtn.addEventListener('click', () => this.toggleAudioPlayback());
                    actionBar.appendChild(playAudioBtn);
                } else {
                    const labelSpan = playAudioBtn.querySelector('span:not(.material-symbols-outlined)');
                    if (labelSpan) labelSpan.textContent = this.t('play_audio');
                }

                let bookIntroBtn = document.getElementById('btn-book-intro-dynamic');
                if (!bookIntroBtn) {
                    bookIntroBtn = document.createElement('button');
                    bookIntroBtn.id = 'btn-book-intro-dynamic';
                    bookIntroBtn.className = 'nav-btn';
                    bookIntroBtn.style.cssText = 'font-size: 12px; padding: 6px 14px; border-radius: 20px; display: inline-flex; align-items: center; gap: 6px; cursor: pointer; background: var(--bg-card, #ffffff); border: 1px solid var(--border-color, #e2e8f0); color: var(--text-base); font-weight: 600; box-shadow: 0 2px 6px rgba(0,0,0,0.04); transition: all 0.2s ease; margin: 0;';
                    const lang = document.documentElement.lang || 'no';
                    const labelIntroBtn = lang === 'en' ? 'Book Intro' : (lang === 'es' ? 'Intro Libro' : 'Bokintroduksjon');
                    bookIntroBtn.innerHTML = `
                        <span class="material-symbols-outlined" style="font-size: 16px; color: #1B4965;">auto_stories</span>
                        <span>${labelIntroBtn}</span>
                    `;
                    bookIntroBtn.addEventListener('click', () => {
                        this.selectChapter(`${this.selectedBookId}_intro`);
                    });
                    actionBar.appendChild(bookIntroBtn);
                }

                let crossrefBtn = document.getElementById('btn-crossref-chapter-dynamic');
                if (!crossrefBtn) {
                    crossrefBtn = document.createElement('button');
                    crossrefBtn.id = 'btn-crossref-chapter-dynamic';
                    crossrefBtn.className = 'nav-btn';
                    crossrefBtn.style.cssText = 'font-size: 12px; padding: 6px 14px; border-radius: 20px; display: inline-flex; align-items: center; gap: 6px; cursor: pointer; background: var(--bg-card, #ffffff); border: 1px solid var(--border-color, #e2e8f0); color: var(--text-base); font-weight: 600; box-shadow: 0 2px 6px rgba(0,0,0,0.04); transition: all 0.2s ease; margin: 0;';
                    crossrefBtn.innerHTML = `
                        <span class="material-symbols-outlined" style="font-size: 16px; color: var(--hkm-terracotta, #d17d39);">article</span>
                        <span class="crossref-btn-label">${this.t('cross_references')}</span>
                    `;

                    crossrefBtn.addEventListener('click', () => {
                        const currentBook = this.books ? this.books.find(b => b.id === this.selectedBookId) : null;
                        const bookName = currentBook ? currentBook.name : '';
                        const chapterNum = this.selectedChapterId ? this.selectedChapterId.split('_')[1] : '1';
                        this.openVerseCrossReferenceModal('1', `${bookName} ${chapterNum}`);
                    });

                    actionBar.appendChild(crossrefBtn);
                } else {
                    const labelSpan = crossrefBtn.querySelector('.crossref-btn-label');
                    if (labelSpan) labelSpan.textContent = this.t('cross_references');
                }
            }
        } catch (btnErr) {
            console.warn("[BibleReader] Error injecting header action bar:", btnErr);
        }

        // Scroll reading pane to top
        const mainContent = document.querySelector('.bible-content-pane');
        if (mainContent) {
            mainContent.scrollTop = 0;
        }
    }

    updateNavigationButtons() {
        const currentBookIndex = this.books.findIndex(b => b.id === this.selectedBookId);
        const chapterNum = parseInt(this.selectedChapterId.split('_')[1], 10);
        
        const hasPrev = chapterNum > 1 || currentBookIndex > 0;
        const hasNext = chapterNum < this.chapters.length || currentBookIndex < this.books.length - 1;

        if (this.dom.prevChapterBtn) this.dom.prevChapterBtn.disabled = !hasPrev;
        if (this.dom.nextChapterBtn) this.dom.nextChapterBtn.disabled = !hasNext;

        // Floating nav updates
        const floatPrevBtn = document.getElementById('floating-prev-btn');
        const floatNextBtn = document.getElementById('floating-next-btn');
        if (floatPrevBtn) floatPrevBtn.disabled = !hasPrev;
        if (floatNextBtn) floatNextBtn.disabled = !hasNext;

        const floatBookSpan = document.getElementById('floating-nav-book');
        const floatChapSpan = document.getElementById('floating-nav-chapter');
        const currentBook = this.books.find(b => b.id === this.selectedBookId);
        if (floatBookSpan && currentBook) {
            floatBookSpan.innerText = currentBook.name;
        }
        if (floatChapSpan) floatChapSpan.innerText = chapterNum;
    }

    getBookAbbreviation(bookName) {
        if (!bookName) return '';
        const name = bookName.toLowerCase().trim();
        
        // Gamle testamentet
        if (name === '1. mosebok' || name === '1 mosebok') return '1. Mos';
        if (name === '2. mosebok' || name === '2 mosebok') return '2. Mos';
        if (name === '3. mosebok' || name === '3 mosebok') return '3. Mos';
        if (name === '4. mosebok' || name === '4 mosebok') return '4. Mos';
        if (name === '5. mosebok' || name === '5 mosebok') return '5. Mos';
        if (name === 'josva') return 'Jos';
        if (name === 'dommerne') return 'Dom';
        if (name === 'rut') return 'Rut';
        if (name === '1. samuelsbok' || name === '1 samuelsbok') return '1. Sam';
        if (name === '2. samuelsbok' || name === '2 samuelsbok') return '2. Sam';
        if (name === '1. kongebok' || name === '1 kongebok') return '1. Kong';
        if (name === '2. kongebok' || name === '2 kongebok') return '2. Kong';
        if (name === '1. krønikebok' || name === '1 krønikebok') return '1. Krøn';
        if (name === '2. krønikebok' || name === '2 krønikebok') return '2. Krøn';
        if (name === 'esra') return 'Esr';
        if (name === 'nehemja') return 'Neh';
        if (name === 'ester') return 'Est';
        if (name === 'job') return 'Job';
        if (name === 'salmene') return 'Sal';
        if (name === 'salomos ordspråk' || name === 'ordspråkene') return 'Ord';
        if (name === 'forkynneren') return 'Fork';
        if (name === 'høysangen') return 'Høys';
        if (name === 'jesaja') return 'Jes';
        if (name === 'jeremia') return 'Jer';
        if (name === 'klagesangene') return 'Klag';
        if (name === 'esekiel') return 'Esek';
        if (name === 'daniel') return 'Dan';
        if (name === 'hosea') return 'Hos';
        if (name === 'joel') return 'Joel';
        if (name === 'amos') return 'Am';
        if (name === 'obadja') return 'Ob';
        if (name === 'jona') return 'Jon';
        if (name === 'mika') return 'Mik';
        if (name === 'nahum') return 'Nah';
        if (name === 'habakkuk') return 'Hab';
        if (name === 'sefanja') return 'Sef';
        if (name === 'haggai') return 'Hag';
        if (name === 'sakarja') return 'Sak';
        if (name === 'malaki') return 'Mal';
        
        // Nye testamentet
        if (name === 'matteus') return 'Matt';
        if (name === 'markus') return 'Mark';
        if (name === 'lukas') return 'Luk';
        if (name === 'johannes') return 'Joh';
        if (name === 'apostlenes gjerninger' || name.includes('gjerninger') || name.includes('acts')) return 'Apg';
        if (name === 'romerne') return 'Rom';
        if (name === '1. korinter' || name === '1. korinterbrev' || name === '1 korinter') return '1. Kor';
        if (name === '2. korinter' || name === '2. korinterbrev' || name === '2 korinter') return '2. Kor';
        if (name === 'galaterne') return 'Gal';
        if (name === 'efeserne') return 'Efe';
        if (name === 'filipperne') return 'Fil';
        if (name === 'kolosserne') return 'Kol';
        if (name === '1. tessaloniker' || name === '1. tessalonikerbrev' || name === '1 tessaloniker') return '1. Tess';
        if (name === '2. tessaloniker' || name === '2. tessalonikerbrev' || name === '2 tessaloniker') return '2. Tess';
        if (name === '1. timoteus' || name === '1. timoteusbrev' || name === '1 timoteus') return '1. Tim';
        if (name === '2. timoteus' || name === '2. timoteusbrev' || name === '2 timoteus') return '2. Tim';
        if (name === 'titus') return 'Tit';
        if (name === 'filemon') return 'Filem';
        if (name === 'hebreerne') return 'Hebr';
        if (name === 'jakob') return 'Jak';
        if (name === '1. peter' || name === '1 peter') return '1. Pet';
        if (name === '2. peter' || name === '2 peter') return '2. Pet';
        if (name === '1. johannes' || name === '1 johannes') return '1. Joh';
        if (name === '2. johannes' || name === '2 johannes') return '2. Joh';
        if (name === '3. johannes' || name === '3 johannes') return '3. Joh';
        if (name === 'judas') return 'Jud';
        if (name === 'åpenbaringen') return 'Åp';
        
        return bookName.length > 5 ? bookName.substring(0, 4) + '.' : bookName;
    }

    async navigateChapter(direction) {
        if (this.selectedChapterId && this.selectedChapterId.endsWith('_intro')) {
            if (direction === 1) {
                // Moving forward from Intro -> Chapter 1 of current book
                await this.selectChapter(`${this.selectedBookId}_1`);
                return;
            } else {
                // Moving backward from Intro -> Go to previous book's last chapter
                const currentBookIndex = this.books.findIndex(b => b.id === this.selectedBookId);
                if (currentBookIndex > 0) {
                    const prevBook = this.books[currentBookIndex - 1];
                    await this.selectBook(prevBook.id);
                    const lastChapNum = this.chapters ? this.chapters.length : '1';
                    await this.selectChapter(`${prevBook.id}_${lastChapNum}`);
                }
                return;
            }
        }

        const chapterNum = parseInt(this.selectedChapterId.split('_')[1], 10);
        
        if (direction === -1 && chapterNum === 1) {
            // Moving backward from Chapter 1 -> Go to current book's intro page
            await this.selectChapter(`${this.selectedBookId}_intro`);
            return;
        }

        const nextChapterNum = chapterNum + direction;

        if (nextChapterNum >= 1 && nextChapterNum <= this.chapters.length) {
            // Navigate within current book
            const nextChapterId = `${this.selectedBookId}_${nextChapterNum}`;
            await this.selectChapter(nextChapterId);
        } else {
            // Navigate to adjacent book
            const currentBookIndex = this.books.findIndex(b => b.id === this.selectedBookId);
            const nextBookIndex = currentBookIndex + direction;

            if (nextBookIndex >= 0 && nextBookIndex < this.books.length) {
                const nextBook = this.books[nextBookIndex];
                await this.selectBook(nextBook.id);
                
                if (direction === 1) {
                    // Moving forward to next book -> Open next book's intro page!
                    await this.selectChapter(`${nextBook.id}_intro`);
                } else {
                    const targetChapNum = String(this.chapters.length);
                    const nextChapterId = `${nextBook.id}_${targetChapNum}`;
                    await this.selectChapter(nextChapterId);
                }
            }
        }
    }

    async nextChapter() {
        return this.navigateChapter(1);
    }

    async parseAndNavigateToReference(query) {
        if (!query) return;

        // Dismiss all active modals and backdrops immediately
        const crossrefModal = document.getElementById('verse-crossref-modal');
        if (crossrefModal) {
            crossrefModal.classList.remove('active');
            crossrefModal.style.display = 'none';
        }
        const dictDrawer = document.getElementById('dictionary-drawer');
        if (dictDrawer) dictDrawer.classList.remove('active');
        const backdrop = document.getElementById('hkm-sheet-backdrop-overlay');
        if (backdrop) backdrop.classList.remove('active');
        
        this.clearSelection();
        this.touchMoved = false;

        try {
            if (!this.books || !this.books.length) {
                await this.loadBooks();
            }

            // Split by conjunctions to get the first reference (e.g. "Salomos ordspråk 5-8 & Filipperne 4" -> "Salomos ordspråk 5-8")
            const parts = query.split(/\s+&\s+|\s+og\s+|\s+and\s+|\s+y\s+|,/i);
            let firstRef = parts[0].trim();

            // Strip ranges (e.g. "1. Mosebok 1-2" -> "1. Mosebok 1", "Johannes 3:16-18" -> "Johannes 3:16")
            if (firstRef.match(/-|–/)) {
                firstRef = firstRef.split(/-|–/)[0].trim();
            }

            const input = firstRef.toLowerCase().trim();
            
            // Parse reference: extract optional leading number, book name, optional chapter, and optional verse
            // Match trailing chapter and verse, e.g. "Johannes 3:16", "Johannes 3", "1. Mosebok 12"
            const numPattern = /\s+(\d+)(?:\s*[\:\.\s,]\s*(\d+))?$/i;
            const numMatch = input.match(numPattern);

            let prefixNum = '';
            let bookNameQuery = input;
            let chapterNum = '1';
            let verseNum = undefined;

            if (numMatch) {
                chapterNum = numMatch[1];
                verseNum = numMatch[2];
                // The book name query is everything before the numbers match
                const bookPart = input.substring(0, numMatch.index).trim();
                // Extract optional leading number from book part, e.g. "1. mosebok" -> "1" and "mosebok"
                const prefixMatch = bookPart.match(/^(\d+)\s*\.?\s*(.+)$/);
                if (prefixMatch) {
                    prefixNum = prefixMatch[1];
                    bookNameQuery = prefixMatch[2].trim();
                } else {
                    bookNameQuery = bookPart;
                }
            } else {
                // Book name only (no chapter number), e.g. "Salmene", "Ruths bok", "1. Mosebok"
                const prefixMatch = input.match(/^(\d+)\s*\.?\s*(.+)$/);
                if (prefixMatch) {
                    prefixNum = prefixMatch[1];
                    bookNameQuery = prefixMatch[2].trim();
                } else {
                    bookNameQuery = input;
                }
            }

            let fullBookSearchName = prefixNum ? `${prefixNum} ${bookNameQuery}` : bookNameQuery;
            const lookupName = fullBookSearchName.toLowerCase().trim();

            // Norwegian book name/abbreviation translation table to numeric book IDs (1-66)
            const norwegianBookToId = {
                // Gamle testamentet
                "1 mosebok": 1, "1. mosebok": 1, "1mos": 1, "1. mos": 1, "1 mose": 1, "1. mose": 1,
                "2 mosebok": 2, "2. mosebok": 2, "2mos": 2, "2. mos": 2, "2 mose": 2, "2. mose": 2,
                "3 mosebok": 3, "3. mosebok": 3, "3mos": 3, "3. mos": 3, "3 mose": 3, "3. mose": 3,
                "4 mosebok": 4, "4. mosebok": 4, "4mos": 4, "4. mos": 4, "4 mose": 4, "4. mose": 4,
                "5 mosebok": 5, "5. mosebok": 5, "5mos": 5, "5. mos": 5, "5 mose": 5, "5. mose": 5,
                "josva": 6, "jos": 6,
                "dommerne": 7, "dom": 7,
                "rut": 8, "ru": 8, "ruth": 8, "ruts bok": 8, "ruths bok": 8, "ruts": 8, "ruths": 8,
                "1 samuelsbok": 9, "1. samuelsbok": 9, "1sam": 9, "1. sam": 9, "1 samuel": 9, "1. samuel": 9, "samuels bok": 9, "samuelsbok": 9,
                "2 samuelsbok": 10, "2. samuelsbok": 10, "2sam": 10, "2. sam": 10, "2 samuel": 10, "2. samuel": 10,
                "1 kongebok": 11, "1. kongebok": 11, "1kong": 11, "1. kong": 11, "1 konge": 11, "1. konge": 11, "kongebok": 11,
                "2 kongebok": 12, "2. kongebok": 12, "2kong": 12, "2. kong": 12, "2 konge": 12, "2. konge": 12,
                "1 krønikebok": 13, "1. krønikebok": 13, "1krøn": 13, "1. krøn": 13, "krønikebok": 13,
                "2 krønikebok": 14, "2. krønikebok": 14, "2krøn": 14, "2. krøn": 14,
                "esra": 15, "esr": 15,
                "nehemja": 16, "neh": 16, "nehe": 16,
                "ester": 17, "est": 17, "esters bok": 17, "esters": 17,
                "job": 18, "jobs bok": 18, "jobs": 18,
                "salmene": 19, "sal": 19, "salme": 19, "salmenes bok": 19, "salmenes": 19,
                "salomos ordspråk": 20, "ordspråkene": 20, "ordspr": 20, "ords": 20, "ordspråk": 20,
                "forkynneren": 21, "fork": 21,
                "høysangen": 22, "høys": 22, "salomos høysang": 22, "høysang": 22,
                "jesaja": 23, "jes": 23, "jesajas bok": 23, "jesajas": 23,
                "jeremia": 24, "jer": 24, "jeremias bok": 24, "jeremias": 24, "jeremias klagesanger": 25,
                "klagesangene": 25, "klag": 25,
                "esekiel": 26, "ese": 26, "esek": 26, "esekiels bok": 26, "esekiels": 26,
                "daniel": 27, "dan": 27, "daniels bok": 27, "daniels": 27,
                "hosea": 28, "hos": 28, "hoseas bok": 28, "hoseas": 28,
                "joel": 29, "joe": 29, "joels bok": 29, "joels": 29,
                "amos": 30, "am": 30, "amos bok": 30, "amos": 30,
                "obadja": 31, "oba": 31, "obadjas bok": 31, "obadjas": 31,
                "jona": 32, "jon": 32, "jonas bok": 32, "jonas": 32,
                "mika": 33, "mik": 33, "mikas bok": 33, "mikas": 33,
                "nahum": 34, "nah": 34, "nahums bok": 34, "nahums": 34,
                "habakkuk": 35, "hab": 35, "habakkuks bok": 35, "habakkuks": 35,
                "sefanja": 36, "sef": 36, "sefanjas bok": 36, "sefanjas": 36,
                "haggai": 37, "hag": 37, "haggais bok": 37, "haggais": 37,
                "sakarja": 38, "sak": 38, "sakarjas bok": 38, "sakarjas": 38,
                "malaki": 39, "mal": 39, "malakis bok": 39, "malakis": 39,
                // Samlinger/grupper og spesialnavn
                "2. til 5. mosebok": 2, "2 til 5 mosebok": 2,
                "1. og 2. petersbrev": 60, "1 og 2 petersbrev": 60,
                "brevene i det nye testamente": 45,
                "evangeliene": 40, "evangeliene (matteus, markus, lukas, johannes)": 40,
                // Nye testamentet
                "matteus": 40, "matt": 40, "mat": 40,
                "markus": 41, "mark": 41, "mar": 41,
                "lukas": 42, "luk": 42,
                "johannes": 43, "joh": 43,
                "apostlenes gjerninger": 44, "apg": 44, "apostlenes": 44,
                "romerne": 45, "rom": 45,
                "1 korinter": 46, "1. korinter": 46, "1kor": 46, "1. kor": 46, "1 kor": 46,
                "2 korinter": 47, "2. korinter": 47, "2kor": 47, "2. kor": 47, "2 kor": 47,
                "galaterne": 48, "gal": 48,
                "efeserne": 49, "ef": 49,
                "filipperne": 50, "fil": 50,
                "kolosserne": 51, "kol": 51,
                "1 tessaloniker": 52, "1. tessaloniker": 52, "1tess": 52, "1. tess": 52, "1 tess": 52,
                "2 tessaloniker": 53, "2. tessaloniker": 53, "2tess": 53, "2. tess": 53, "2 tess": 53,
                "1 timoteus": 54, "1. timoteus": 54, "1tim": 54, "1. tim": 54, "1 tim": 54,
                "2 timoteus": 55, "2. timoteus": 55, "2tim": 55, "2. tim": 55, "2 tim": 55,
                "titus": 56, "tit": 56,
                "filemon": 57, "filem": 57, "phm": 57,
                "hebreerne": 58, "heb": 58,
                "jakob": 59, "jak": 59, "jakobs brev": 59, "jakobs": 59,
                "1 peter": 60, "1. peter": 60, "1pet": 60, "1. pet": 60, "1 pet": 60, "1 peters brev": 60, "1 peters": 60,
                "2 peter": 61, "2. peter": 61, "2pet": 61, "2. pet": 61, "2 pet": 61, "2 peters brev": 61, "2 peters": 61,
                "1 johannes": 62, "1. johannes": 62, "1joh": 62, "1. joh": 62, "1 joh": 62, "1 johannes brev": 62, "1 johannes": 62,
                "2 johannes": 63, "2. johannes": 63, "2joh": 63, "2. joh": 63, "2 joh": 63, "2 johannes brev": 63, "2 johannes": 63,
                "3 johannes": 64, "3. johannes": 64, "3joh": 64, "3. joh": 64, "3 joh": 64, "3 johannes brev": 64, "3 johannes": 64,
                "judas": 65, "jud": 65, "judas brev": 65, "judas": 65,
                "åpenbaringen": 66, "åp": 66, "johannes åpenbaring": 66, "åpenbaring": 66,
                // USFM English / Standard codes
                "gen": 1, "exod": 2, "exo": 2, "lev": 3, "num": 4, "deut": 5, "deu": 5,
                "jos": 6, "josh": 6, "jdg": 7, "judg": 7, "rut": 8, "ruth": 8,
                "1sa": 9, "1sam": 9, "2sa": 10, "2sam": 10, "1ki": 11, "1kng": 11, "2ki": 12, "2kng": 12,
                "1ch": 13, "1chr": 13, "2ch": 14, "2chr": 14, "ezr": 15, "ezra": 15, "neh": 16, "est": 17, "esth": 17,
                "job": 18, "psa": 19, "psalm": 19, "pro": 20, "prov": 20, "ecc": 21, "eccl": 21, "sng": 22, "song": 22,
                "isa": 23, "jer": 24, "lam": 25, "ezk": 26, "ezek": 26, "dan": 27, "hos": 28, "jol": 29, "joel": 29,
                "amo": 30, "amos": 30, "oba": 31, "obad": 31, "jon": 32, "jonah": 32, "mic": 33, "nah": 34, "hab": 35,
                "zep": 36, "zeph": 36, "hag": 37, "zch": 38, "zech": 38, "mal": 39,
                "mat": 40, "matt": 40, "mrk": 41, "mark": 41, "luk": 42, "luke": 42, "jhn": 43, "john": 43,
                "act": 44, "acts": 44, "rom": 45, "1co": 46, "1cor": 46, "2co": 47, "2cor": 47,
                "gal": 48, "eph": 49, "php": 50, "phil": 50, "col": 51, "1th": 52, "1thes": 52, "2th": 53, "2thes": 53,
                "1ti": 54, "1tim": 54, "2ti": 55, "2tim": 55, "tit": 56, "titus": 56, "phm": 57, "philem": 57,
                "heb": 58, "jas": 59, "1pe": 60, "1pet": 60, "2pe": 61, "2pet": 61,
                "1jo": 62, "1john": 62, "2jo": 63, "2john": 63, "3jo": 64, "3john": 64, "jud": 65, "jude": 65, "rev": 66
            };

            // Check direct mapping and normalized lookup match
            const normalizedLookup = lookupName.replace(/[\.\s]/g, '');
            let bookIdFromLookup = norwegianBookToId[lookupName];
            if (!bookIdFromLookup) {
                for (const [key, id] of Object.entries(norwegianBookToId)) {
                    if (key.replace(/[\.\s]/g, '') === normalizedLookup) {
                        bookIdFromLookup = id;
                        break;
                    }
                }
            }
            
            let matchedBook = null;
            if (bookIdFromLookup) {
                matchedBook = this.books.find(b => String(b.id) === String(bookIdFromLookup));
            }

            // Fallback: search by name in this.books
            if (!matchedBook) {
                matchedBook = this.books.find(b => {
                    const bName = b.name.toLowerCase();
                    const normalizedBName = bName.replace(/[\.\s]/g, '');
                    return normalizedBName === normalizedLookup || 
                           normalizedBName.startsWith(normalizedLookup) || 
                           normalizedBName.includes(normalizedLookup) ||
                           normalizedLookup.startsWith(normalizedBName) ||
                           normalizedLookup.includes(normalizedBName);
                });
            }

            if (!matchedBook) {
                console.warn("[BibleReader] Book not found:", lookupName);
                alert(`Kunne ikke finne boken "${fullBookSearchName}". Sjekk stavemåte.`);
                return;
            }

            await this.selectBook(matchedBook.id);
            
            const targetChapterId = `${matchedBook.id}_${chapterNum}`;
            const chapExists = this.chapters.some(c => c.id === targetChapterId);

            if (!chapExists) {
                alert(`Fant boken ${matchedBook.name}, men kapittel ${chapterNum} finnes ikke.`);
                return;
            }

            await this.selectChapter(targetChapterId);

            if (verseNum) {
                this.scrollToVerse(verseNum);
            }
        } catch (error) {
            console.error("[BibleReader] Error in parseAndNavigateToReference:", error);
            alert("Det oppstod en feil under navigering til referansen.");
        }
    }

    scrollToVerse(verseNum) {
        if (this.highlightedVerseElement) {
            this.highlightedVerseElement.classList.remove('verse-temp-highlight');
            this.highlightedVerseElement = null;
        }
        
        // Extract the first verse from range/list formats (e.g. "1-7" or "3, 5" -> "1" or "3")
        let targetVerse = String(verseNum).trim();
        if (targetVerse.includes('-')) {
            targetVerse = targetVerse.split('-')[0].trim();
        }
        if (targetVerse.includes(',')) {
            targetVerse = targetVerse.split(',')[0].trim();
        }

        setTimeout(() => {
            const paragraphs = this.dom.readingPane.querySelectorAll('p');
            for (const p of paragraphs) {
                const sup = p.querySelector('sup.v');
                if (sup && sup.innerText.trim() === targetVerse) {
                    this.isProgrammaticScrolling = true;
                    
                    // Scroll container programmatically to avoid scrolling the main window/viewport
                    this.scrollToVerseElement(p);
                    
                    p.classList.add('verse-temp-highlight');
                    this.highlightedVerseElement = p;
                    
                    if (this.scrollTimeout) clearTimeout(this.scrollTimeout);
                    this.scrollTimeout = setTimeout(() => {
                        this.isProgrammaticScrolling = false;
                    }, 1000);
                    break;
                }
            }
        }, 300);
    }

    scrollToVerseElement(el) {
        if (!el) return;
        const pane = el.closest('.bible-content-pane') || (this.dom && this.dom.readingPane ? this.dom.readingPane.closest('.bible-content-pane') : null);
        if (pane) {
            const paneRect = pane.getBoundingClientRect();
            const elRect = el.getBoundingClientRect();
            const targetScrollTop = pane.scrollTop + (elRect.top - paneRect.top) - (paneRect.height / 2) + (elRect.height / 2);
            pane.scrollTo({
                top: Math.max(0, targetScrollTop),
                behavior: 'smooth'
            });
        } else {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        // Force window scrollY to 0 so the document body never scrolls down to expose the footer
        if (window.scrollY !== 0) {
            window.scrollTo({ top: 0, behavior: 'instant' });
        }
    }

    getCurrentReferenceText() {
        const book = this.books ? this.books.find(b => b.id === this.selectedBookId) : null;
        const chapterNum = (this.selectedChapterId && this.selectedChapterId.includes('_'))
            ? this.selectedChapterId.split('_')[1]
            : '1';
        return `${book ? book.name : ''} ${chapterNum}`.trim();
    }

    async lookupWord(word, contextText, refText) {
        if (this.dom.dictDrawer) this.dom.dictDrawer.classList.add('active');
        this.pushModalHistoryState('dictionary-drawer');
        const backdrop = document.getElementById('hkm-sheet-backdrop-overlay');
        if (backdrop) backdrop.classList.add('active');
        const dictBody = this.dom.dictDrawer ? this.dom.dictDrawer.querySelector('.dict-body') : null;
        if (dictBody) dictBody.scrollTop = 0;
        if (this.dom.dictWelcomeState) this.dom.dictWelcomeState.style.display = 'none';
        this.dom.dictSpinner.style.display = 'flex';
        this.dom.dictContentWrap.style.display = 'none';
        
        if (this.dom.dictSearchInput) this.dom.dictSearchInput.value = word;
        this.dom.dictWordTitle.innerText = word;

        // Reset extended analysis sections and button states
        if (this.dom.dictExtendedSection) this.dom.dictExtendedSection.style.display = 'none';
        if (this.dom.dictExtendedTriggerWrap) this.dom.dictExtendedTriggerWrap.style.display = 'none';
        if (this.dom.dictExtendedText) this.dom.dictExtendedText.innerHTML = '';
        if (this.dom.dictExtendedBtn) this.dom.dictExtendedBtn.disabled = false;
        if (this.dom.dictExtendedBtnText) this.dom.dictExtendedBtnText.textContent = this.t('extended_btn');
        if (this.dom.dictHistoricalSection) this.dom.dictHistoricalSection.style.display = 'none';
        if (this.dom.dictHistoricalList) this.dom.dictHistoricalList.innerHTML = '';

        const dictRelatedBox = document.getElementById('dict-related-resources');
        if (dictRelatedBox) dictRelatedBox.innerHTML = '';

        let dictRes = null;
        let resources = null;

        const cacheKey = `${word.trim().toLowerCase()}_${document.documentElement.lang || 'no'}`;
        if (this.dictCache && this.dictCache[cacheKey]) {
            const cachedData = this.dictCache[cacheKey];
            dictRes = cachedData.dictRes;
            resources = cachedData.resources;
        }

        try {
            if (!dictRes) {
                const params = new URLSearchParams({
                    word: word,
                    context: contextText || '',
                    scriptureRef: refText || '',
                    lang: document.documentElement.lang || 'no'
                });

                // Parallel load AI definition and relevant site resources
                const [fetchedDictRes, fetchedResources] = await Promise.all([
                    fetch(`/api/bible/dictionary?${params.toString()}`).then(r => r.json()),
                    this.searchLocalResources(word)
                ]);

                dictRes = fetchedDictRes;
                resources = fetchedResources;

                // Save to client-side memory cache
                if (this.dictCache) {
                    this.dictCache[cacheKey] = { dictRes, resources };
                }
            }

            this.dom.dictSpinner.style.display = 'none';
            this.dom.dictContentWrap.style.display = 'block';

            this.dom.dictWordTitle.innerText = dictRes.word || word;
            this.dom.dictCategory.innerText = dictRes.category || this.t('dictionary');
            this.dom.dictDefinition.innerHTML = this.parseMarkdown(dictRes.definition) || '';
            this.dom.dictContextualNote.innerHTML = this.parseMarkdown(dictRes.contextualNote) || '';

            // Show/hide the extended analysis trigger based on biblical relevance
            const isRejected = dictRes.category === 'Ikke bibelrelatert' || 
                               dictRes.category === 'Not Bible-related' || 
                               dictRes.category === 'No relacionado con la Biblia';
            
            if (this.dom.dictExtendedTriggerWrap) {
                if (dictRes.extendedAnalysis) {
                    this.dom.dictExtendedTriggerWrap.style.display = 'none';
                    if (this.dom.dictExtendedText) {
                        this.dom.dictExtendedText.innerHTML = this.parseMarkdown(dictRes.extendedAnalysis);
                    }
                    if (this.dom.dictExtendedSection) {
                        this.dom.dictExtendedSection.style.display = 'block';
                    }
                } else if (!isRejected && dictRes.definition && !dictRes.definition.includes('Ingen forhåndsdefinert forklaring')) {
                    this.dom.dictExtendedTriggerWrap.style.display = 'block';
                } else {
                    this.dom.dictExtendedTriggerWrap.style.display = 'none';
                }
            }

            // Render original words (grunntekst) in dictionary drawer
            if (this.dom.dictOriginalWordsSection && this.dom.dictOriginalWordsList) {
                if (dictRes.originalWords && dictRes.originalWords.length > 0) {
                    this.dom.dictOriginalWordsList.innerHTML = dictRes.originalWords.map(w => `
                        <div class="dict-original-term-card">
                            <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                                <span class="language-badge ${w.language.toLowerCase() === 'hebraisk' ? 'hebrew' : ''}">${w.language}</span>
                                <span class="${w.language.toLowerCase() === 'hebraisk' ? 'hebrew-word' : 'greek-word'}">${w.word}</span>
                            </div>
                            <div style="font-size: 14px; color: var(--text-base); line-height: 1.4; display: flex; flex-direction: column; gap: 2px;">
                                <div><strong>Translitterasjon:</strong> <em>${w.transliteration}</em></div>
                                <div><strong>Uttale:</strong> <span>${w.pronunciation}</span></div>
                                <div style="margin-top: 4px; padding-top: 4px; border-top: 1px dashed var(--border-color); font-size: 13px; color: var(--text-muted);">
                                    <strong>Betydning:</strong> ${w.meaning}
                                </div>
                            </div>
                        </div>
                    `).join('');
                    this.dom.dictOriginalWordsSection.style.display = 'block';
                } else {
                    this.dom.dictOriginalWordsSection.style.display = 'none';
                }
            }

            // Render cross references in dictionary drawer
            if (this.dom.dictCrossRefsSection && this.dom.dictCrossRefsList) {
                if (dictRes.crossReferences && dictRes.crossReferences.length > 0) {
                    this.dom.dictCrossRefsList.innerHTML = dictRes.crossReferences.map(c => `
                        <div class="dict-cross-ref-item" style="padding: 10px 14px; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 8px; font-size: 13px; cursor: pointer; display: flex; flex-direction: column; gap: 4px; transition: all 0.2s; box-sizing: border-box; width: 100%;">
                            <div style="font-weight: 700; color: var(--bible-primary); display: flex; align-items: center; justify-content: space-between; font-size: 13px;">
                                <span>${c.ref}</span>
                                <span class="material-symbols-outlined" style="font-size: 14px;">open_in_new</span>
                            </div>
                            <div style="font-size: 12px; color: var(--text-base); line-height: 1.4;">${c.text}</div>
                        </div>
                    `).join('');

                    const cItems = this.dom.dictCrossRefsList.querySelectorAll('.dict-cross-ref-item');
                    cItems.forEach((element, index) => {
                        element.addEventListener('click', () => {
                            this.parseAndNavigateToReference(dictRes.crossReferences[index].ref);
                        });
                        
                        element.addEventListener('mouseenter', () => {
                            element.style.borderColor = 'var(--bible-primary)';
                            element.style.transform = 'translateY(-1px)';
                            element.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)';
                        });
                        element.addEventListener('mouseleave', () => {
                            element.style.borderColor = 'var(--border-color)';
                            element.style.transform = 'none';
                            element.style.boxShadow = 'none';
                        });
                    });

                    this.dom.dictCrossRefsSection.style.display = 'block';
                } else {
                    this.dom.dictCrossRefsSection.style.display = 'none';
                }
            }

            // Render historical commentaries
            if (this.dom.dictHistoricalSection && this.dom.dictHistoricalList) {
                if (dictRes.historicalCommentaries && dictRes.historicalCommentaries.length > 0) {
                    const lang = document.documentElement.lang || 'no';
                    const labelShowMore = lang === 'en' ? 'Show more' : (lang === 'es' ? 'Mostrar más' : 'Vis mer');
                    const labelShowLess = lang === 'en' ? 'Show less' : (lang === 'es' ? 'Mostrar menos' : 'Vis mindre');
                    const labelReadSource = lang === 'en' ? 'Read source' : (lang === 'es' ? 'Leer fuente' : 'Les kilde');

                    this.dom.dictHistoricalList.innerHTML = dictRes.historicalCommentaries.map((c, idx) => {
                        const isLong = c.quote.length > 180;
                        const displayQuote = isLong ? c.quote.slice(0, 175) + '...' : c.quote;
                        const escapedFullQuote = c.quote.replace(/"/g, '&quot;');
                        const escapedShortQuote = displayQuote.replace(/"/g, '&quot;');

                        return `
                        <div class="dict-commentary-card" style="padding: 14px; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 8px; font-size: 13px; line-height: 1.6; color: var(--text-base); transition: all 0.2s; box-sizing: border-box; width: 100%;">
                            <div style="font-weight: 700; color: var(--bible-primary); margin-bottom: 6px; display: flex; justify-content: space-between; align-items: center; font-size: 12.5px;">
                                <span>${c.author}</span>
                                <span style="font-size: 10.5px; color: var(--text-muted); font-weight: 400;">${c.sourceTitle}</span>
                            </div>
                            <div class="commentary-quote-container">
                                <div class="commentary-quote-text" style="font-style: italic; color: var(--text-base); font-size: 12.5px;" data-full-quote="${escapedFullQuote}" data-short-quote="${escapedShortQuote}">
                                    "${displayQuote}"
                                </div>
                                ${isLong ? `
                                <button type="button" class="btn-toggle-quote" style="background: none; border: none; color: var(--bible-primary); font-size: 11.5px; font-weight: 700; cursor: pointer; padding: 4px 0 0 0; display: inline-flex; align-items: center; gap: 2px;">
                                    <span>${labelShowMore}</span> <span class="material-symbols-outlined" style="font-size: 14px;">expand_more</span>
                                </button>
                                ` : ''}
                            </div>
                            ${c.sourceUrl ? `
                            <div style="margin-top: 8px; text-align: right;">
                                <a href="${c.sourceUrl}" target="_blank" style="font-size: 11px; color: var(--bible-primary); text-decoration: none; display: inline-flex; align-items: center; gap: 2px;">
                                    ${labelReadSource} <span class="material-symbols-outlined" style="font-size: 12px;">open_in_new</span>
                                </a>
                            </div>
                            ` : ''}
                        </div>
                        `;
                    }).join('');

                    // Add premium micro-interactions and toggle logic
                    const cards = this.dom.dictHistoricalList.querySelectorAll('.dict-commentary-card');
                    cards.forEach(card => {
                        const toggleBtn = card.querySelector('.btn-toggle-quote');
                        if (toggleBtn) {
                            toggleBtn.addEventListener('click', () => {
                                const quoteTextEl = card.querySelector('.commentary-quote-text');
                                const btnSpan = toggleBtn.querySelector('span');
                                const btnIcon = toggleBtn.querySelector('.material-symbols-outlined');
                                const isExpanded = toggleBtn.classList.toggle('expanded');
                                
                                if (isExpanded) {
                                    quoteTextEl.innerText = `"${quoteTextEl.dataset.fullQuote}"`;
                                    btnSpan.innerText = labelShowLess;
                                    btnIcon.innerText = 'expand_less';
                                } else {
                                    quoteTextEl.innerText = `"${quoteTextEl.dataset.shortQuote}"`;
                                    btnSpan.innerText = labelShowMore;
                                    btnIcon.innerText = 'expand_more';
                                }
                            });
                        }

                        card.addEventListener('mouseenter', () => {
                            card.style.borderColor = 'var(--bible-primary)';
                            card.style.transform = 'translateY(-1px)';
                            card.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)';
                        });
                        card.addEventListener('mouseleave', () => {
                            card.style.borderColor = 'var(--border-color)';
                            card.style.transform = 'none';
                            card.style.boxShadow = 'none';
                        });
                    });

                    this.dom.dictHistoricalSection.style.display = 'block';
                } else {
                    this.dom.dictHistoricalSection.style.display = 'none';
                }
            }

            // Render related resources
            if (dictRelatedBox) {
                if (resources.length === 0) {
                    dictRelatedBox.innerHTML = '<div style="font-size: 12px; color: var(--text-muted); padding: 8px 0;">Ingen direkte treff på nettstedets blogger eller videoer for dette ordet.</div>';
                } else {
                    dictRelatedBox.innerHTML = resources.slice(0, 4).map(res => this.renderResourceCard(res)).join('');
                }
            }
        } catch (e) {
            console.error("Error looking up word:", e);
            if (this.dom.dictCrossRefsSection) {
                this.dom.dictCrossRefsSection.style.display = 'none';
            }
            if (this.dom.dictOriginalWordsSection) {
                this.dom.dictOriginalWordsSection.style.display = 'none';
            }
            if (this.dom.dictHistoricalSection) {
                this.dom.dictHistoricalSection.style.display = 'none';
            }
            this.dom.dictSpinner.style.display = 'none';
            this.dom.dictContentWrap.style.display = 'block';
            this.dom.dictCategory.innerText = 'Feil';
            this.dom.dictDefinition.innerHTML = 'Kunne ikke kontakte ordbok-tjenesten. Kontroller nettforbindelsen din.';
            this.dom.dictContextualNote.innerHTML = '';
        }
    }

    parseMarkdown(text) {
        if (!text) return '';
        
        // Clean up any literal '\n' string representations and replace with real newlines
        let html = text.trim()
            .replace(/\\n/g, '\n')
            .replace(/\r/g, '');

        // Convert short lines wrapped entirely in **Text** (under 70 chars) to ### headings if no # prefix
        const rawLines = html.split('\n');
        const cleanedLines = rawLines.map(line => {
            const trimmed = line.trim();
            if (/^\*\*[^*]{3,70}\*\*$/.test(trimmed)) {
                return '### ' + trimmed.replace(/^\*\*|\*\*$/g, '');
            }
            return line;
        });
        html = cleanedLines.join('\n');

        // Preprocessing: Fix missing spacing/newlines before and after header tags (e.g. "word.### Heading" -> "word.\n\n### Heading")
        html = html.replace(/([^#\n])(#{1,3}\s+)/g, '$1\n\n$2');

        // Headers (using multiline anchors to match line-by-line accurately)
        html = html.replace(/^### (.*?)$/gm, '<h5 style="font-weight:700; font-size:14.5px; margin-top:18px; margin-bottom:8px; color:var(--text-base, #1e293b);">$1</h5>');
        html = html.replace(/^## (.*?)$/gm, '<h4 style="font-weight:700; font-size:15.5px; margin-top:20px; margin-bottom:10px; color:var(--text-base, #1e293b);">$1</h4>');
        html = html.replace(/^# (.*?)$/gm, '<h3 style="font-weight:700; font-size:16.5px; margin-top:24px; margin-bottom:12px; color:var(--text-base, #1e293b);">$1</h3>');

        // Bold & Italic
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

        // List items
        const lines = html.split('\n');
        let inList = false;
        const processedLines = [];

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].trim();
            if (line.startsWith('- ') || line.startsWith('* ')) {
                const content = line.substring(2);
                if (!inList) {
                    processedLines.push('<ul style="margin-top:8px; margin-bottom:12px; padding-left:20px; list-style-type:disc;">');
                    inList = true;
                }
                processedLines.push(`<li style="font-size:13.5px; line-height:1.5; color:var(--text-base); margin-bottom:4px; font-weight:400;">${content}</li>`);
            } else {
                if (inList) {
                    processedLines.push('</ul>');
                    inList = false;
                }
                processedLines.push(lines[i]);
            }
        }
        if (inList) {
            processedLines.push('</ul>');
        }

        html = processedLines.join('\n');

        // Paragraphs: Split on single newlines so any text lines get wrapped as paragraphs
        const blocks = html.split('\n');
        const processedBlocks = [];
        for (let block of blocks) {
            let trimmed = block.trim();
            if (!trimmed) continue;
            if (trimmed.startsWith('<h') || trimmed.startsWith('<ul') || trimmed.startsWith('<li') || trimmed.startsWith('</ul')) {
                processedBlocks.push(trimmed);
            } else {
                // If a paragraph is wrapped entirely in <strong>...</strong> and has more than 60 chars, strip full-paragraph bolding
                if (/^<strong>.*<\/strong>$/s.test(trimmed) && trimmed.length > 60) {
                    trimmed = trimmed.replace(/^<strong>(.*)<\/strong>$/s, '$1');
                }
                processedBlocks.push(`<p style="margin-bottom:14px; line-height:1.65; font-size:13.5px; font-weight:400; color:var(--text-base);">${trimmed}</p>`);
            }
        }
        html = processedBlocks.join('\n');

        return html;
    }

    toggleVerseHighlight(paragraphElement, verseNumber) {
        const ref = this.getCurrentReferenceText();
        const fullRef = `${ref}:${verseNumber}`;
        
        // Find if this verse is part of any existing bookmarks in this chapter
        const activeBookmarks = this.bookmarks.filter(b => b.chapterId === this.selectedChapterId && b.bibleId === this.selectedBibleId);
        const overlappingBookmark = activeBookmarks.find(b => {
            const verses = this.parseVersesFromRef(b.ref);
            return verses.includes(parseInt(verseNumber, 10));
        });

        if (overlappingBookmark) {
            // Remove highlight by deleting the overlapping bookmark
            this.bookmarks = this.bookmarks.filter(b => b.id !== overlappingBookmark.id);
        } else {
            this.bookmarks.push({
                id: Date.now().toString(),
                ref: fullRef,
                bookId: this.selectedBookId,
                chapterId: this.selectedChapterId,
                verse: String(verseNumber),
                bibleId: this.selectedBibleId,
                createdAt: new Date().toISOString()
            });
        }

        this.safeSetLocalStorage('hkm_bible_bookmarks', JSON.stringify(this.bookmarks));
        this.renderBookmarksList();
        this.restoreHighlights();
    }

    setupBottomSheetSwipeDown(element, closeCallback) {
        if (!element) return;
        let startY = 0;
        let currentDeltaY = 0;
        let isDragging = false;

        const getBackdrop = () => {
            return element.closest('.color-wheel-modal-overlay, .hkm-book-intro-overlay, .hkm-modal-overlay, .hkm-devotional-overlay') || document.getElementById('hkm-sheet-backdrop-overlay');
        };

        const onStart = (clientY, target) => {
            const isHeader = target && target.closest('.sheet-handle-bar, .popover-sheet-header, .color-wheel-header, #floating-popover-header-chapters, #floating-popover-header-books, .hkm-book-intro-header, .hkm-devotional-header');
            const isScrollBody = target && target.closest('#floating-books-container, #floating-chapter-grid, .verse-crossref-sheet-body, .sheet-scroll-body, .color-wheel-body, .dict-body, .hkm-book-intro-scroll-body');

            // If touched inside a scrollable list body and NOT on the top handle bar/header:
            if (isScrollBody && !isHeader) {
                // If container is scrolled down, let touch handle list scrolling exclusively
                if (isScrollBody.scrollTop > 0) {
                    isDragging = false;
                    return false;
                }
            }

            if (!isHeader && target && target.closest('.color-swatch-circle, button, a, input, textarea, select')) {
                isDragging = false;
                return false;
            }

            startY = clientY;
            currentDeltaY = 0;
            isDragging = true;
            element.style.transition = 'none';
            const backdrop = getBackdrop();
            if (backdrop) backdrop.style.transition = 'none';
            return true;
        };

        const onMove = (clientY, e) => {
            if (!isDragging) return;
            const deltaY = clientY - startY;
            if (deltaY > 0) {
                if (e && e.cancelable) e.preventDefault();
                currentDeltaY = deltaY;
                element.style.transform = `translateY(${deltaY}px)`;
                element.style.opacity = '1';
                const backdrop = getBackdrop();
                if (backdrop) {
                    const fadeRatio = Math.max(0, 1 - deltaY / 300);
                    if (backdrop === element.parentElement || backdrop.contains(element)) {
                        backdrop.style.backgroundColor = `rgba(15, 23, 42, ${0.5 * fadeRatio})`;
                    } else {
                        backdrop.style.opacity = `${fadeRatio}`;
                    }
                }
            } else if (deltaY < -10 && element.style.transform) {
                element.style.transform = 'translateY(0)';
                element.style.opacity = '1';
                const backdrop = getBackdrop();
                if (backdrop) {
                    if (backdrop === element.parentElement || backdrop.contains(element)) {
                        backdrop.style.backgroundColor = 'rgba(15, 23, 42, 0.5)';
                    } else {
                        backdrop.style.opacity = '1';
                    }
                }
            }
        };

        const onEnd = () => {
            if (!isDragging) return;
            isDragging = false;
            element.style.transition = 'transform 0.28s cubic-bezier(0.16, 1, 0.3, 1)';
            const backdrop = getBackdrop();
            if (backdrop) backdrop.style.transition = 'background-color 0.28s ease, opacity 0.28s ease';

            if (currentDeltaY > 55) {
                element.style.transform = 'translateY(100%)';
                element.style.opacity = '1';
                if (backdrop) {
                    if (backdrop === element.parentElement || backdrop.contains(element)) {
                        backdrop.style.backgroundColor = 'rgba(15, 23, 42, 0)';
                    } else {
                        backdrop.style.opacity = '0';
                    }
                }
                setTimeout(() => {
                    element.style.transform = '';
                    element.style.opacity = '';
                    element.style.transition = '';
                    if (backdrop) {
                        backdrop.style.backgroundColor = '';
                        backdrop.style.opacity = '';
                        backdrop.style.transition = '';
                    }
                    if (typeof closeCallback === 'function') closeCallback();
                }, 260);
            } else {
                element.style.transform = 'translateY(0)';
                element.style.opacity = '1';
                if (backdrop) {
                    if (backdrop === element.parentElement || backdrop.contains(element)) {
                        backdrop.style.backgroundColor = 'rgba(15, 23, 42, 0.5)';
                    } else {
                        backdrop.style.opacity = '1';
                    }
                }
                setTimeout(() => {
                    element.style.transition = '';
                    if (backdrop) backdrop.style.transition = '';
                }, 260);
            }
            currentDeltaY = 0;
        };

        // Touch Listeners
        element.addEventListener('touchstart', (e) => {
            onStart(e.touches[0].clientY, e.target);
        }, { passive: false });

        element.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            const scrollable = e.target.closest('.verse-crossref-sheet-body, .sheet-scroll-body, .color-wheel-body, #floating-chapter-grid, #floating-books-container, .floating-book-item, #verse-crossref-list, .dict-body') || (element.scrollHeight > element.clientHeight ? element : null);
            if (scrollable) {
                // If user is swiping UP to scroll down through the list, or container is already scrolled down, let internal container scroll naturally
                if (e.touches[0].clientY < startY || scrollable.scrollTop > 0) {
                    return;
                }
            }
            onMove(e.touches[0].clientY, e);
        }, { passive: false });

        element.addEventListener('touchend', onEnd);

        // Pointer/Mouse Listeners (for dragging handle bar on PC)
        const handleBar = element.querySelector('.sheet-handle-bar') || element;
        handleBar.addEventListener('pointerdown', (e) => {
            if (onStart(e.clientY, e.target)) {
                try { handleBar.setPointerCapture(e.pointerId); } catch(err){}
            }
        });
        handleBar.addEventListener('pointermove', (e) => {
            if (isDragging) onMove(e.clientY, e);
        });
        handleBar.addEventListener('pointerup', onEnd);
        handleBar.addEventListener('pointercancel', onEnd);
    }

    setupModalHistoryNavigation() {
        if (this._hasSetupModalHistoryNav) return;
        this._hasSetupModalHistoryNav = true;

        window.addEventListener('popstate', (e) => {
            const activeModals = document.querySelectorAll(`
                .floating-settings-popover.active,
                .floating-chapter-popover.active,
                .dictionary-drawer.active,
                #verse-crossref-modal.active,
                .verse-crossref-sheet-overlay.active,
                .verse-note-modal.active,
                #color-wheel-modal.active,
                .bible-nav-right.active
            `);

            if (activeModals.length > 0) {
                activeModals.forEach(el => {
                    el.classList.remove('active');
                    if (el.id === 'verse-crossref-modal' || el.classList.contains('verse-crossref-sheet-overlay')) {
                        el.style.display = 'none';
                    }
                });
                const backdrop = document.getElementById('hkm-sheet-backdrop-overlay');
                if (backdrop) backdrop.classList.remove('active');
            }
        });

        // BFCache safety guard - reload cleanly if pageshow restored from BFcache
        window.addEventListener('pageshow', (e) => {
            if (e.persisted) {
                window.location.reload();
            }
        });
    }

    pushModalHistoryState(modalId) {
        this.setupModalHistoryNavigation();
        try {
            if (!window.history.state || !window.history.state.hkmModalActive) {
                window.history.pushState({ hkmModalActive: true, modalId: modalId }, '');
            }
        } catch (e) {
            console.warn('[BibleReader] Could not push modal history state:', e);
        }
    }

    closeActiveModalsWithHistory() {
        const activeModals = document.querySelectorAll(`
            .floating-settings-popover.active,
            .floating-chapter-popover.active,
            .dictionary-drawer.active,
            #verse-crossref-modal.active,
            .verse-crossref-sheet-overlay.active,
            .verse-note-modal.active,
            #color-wheel-modal.active,
            .bible-nav-right.active
        `);

        if (activeModals.length > 0) {
            activeModals.forEach(el => {
                el.classList.remove('active');
                if (el.id === 'verse-crossref-modal' || el.classList.contains('verse-crossref-sheet-overlay')) {
                    el.style.display = 'none';
                }
            });
            const backdrop = document.getElementById('hkm-sheet-backdrop-overlay');
            if (backdrop) backdrop.classList.remove('active');

            if (window.history.state && window.history.state.hkmModalActive) {
                window.history.back();
            }
        }
    }

    saveVerseHighlight(verseNum, color, customHex = null) {
        if (!this.verseHighlights) {
            try {
                this.verseHighlights = JSON.parse(localStorage.getItem('hkm_verse_highlights') || '{}');
            } catch(e) {
                this.verseHighlights = {};
            }
        }
        const key = `${this.selectedBibleId}_${this.selectedBookId}_${this.selectedChapterId}_v${verseNum}`;
        if (color === 'none' || !color) {
            delete this.verseHighlights[key];
        } else {
            this.verseHighlights[key] = { color, hex: customHex };
        }
        this.safeSetLocalStorage('hkm_verse_highlights', JSON.stringify(this.verseHighlights));
    }

    restoreHighlights() {
        if (!this.verseHighlights) {
            try {
                this.verseHighlights = JSON.parse(localStorage.getItem('hkm_verse_highlights') || '{}');
            } catch(e) {
                this.verseHighlights = {};
            }
        }

        const hexToRgba = (hex, opacity = 0.35) => {
            if (!hex) return `rgba(209, 125, 57, ${opacity})`;
            let c = hex.replace('#', '');
            if (c.length === 3) c = c.split('').map(x => x + x).join('');
            const num = parseInt(c, 16);
            return `rgba(${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}, ${opacity})`;
        };

        const activeBookmarks = this.bookmarks.filter(b => b.chapterId === this.selectedChapterId && b.bibleId === this.selectedBibleId);
        
        // Build a Set of all bookmarked verse numbers in this chapter
        const bookmarkedVerses = new Set();
        activeBookmarks.forEach(b => {
            const verses = this.parseVersesFromRef(b.ref);
            verses.forEach(v => bookmarkedVerses.add(v));
        });
        
        const paragraphs = this.dom.readingPane.querySelectorAll('p');
        paragraphs.forEach(p => {
            const sup = p.querySelector('sup.v');
            if (sup) {
                const verseStr = sup.innerText.trim();
                const verseNum = parseInt(verseStr, 10);
                if (bookmarkedVerses.has(verseNum)) {
                    p.classList.add('highlighted');
                } else {
                    p.classList.remove('highlighted');
                }

                // Restore saved color highlights
                const key = `${this.selectedBibleId}_${this.selectedBookId}_${this.selectedChapterId}_v${verseStr}`;
                const hl = this.verseHighlights[key];
                if (hl) {
                    p.setAttribute('data-highlight-color', hl.color);
                    if (hl.hex) {
                        p.style.setProperty('--custom-highlight-bg', hexToRgba(hl.hex, 0.35));
                    }
                } else {
                    p.removeAttribute('data-highlight-color');
                    p.style.removeProperty('--custom-highlight-bg');
                }
            }
        });
    }

    parseVersesFromRef(refString) {
        if (!refString) return [];
        const parts = refString.split(':');
        if (parts.length < 2) return []; // No verses specified (whole chapter)
        
        const versePart = parts[1].trim();
        const verses = [];
        
        // Split by comma
        const subparts = versePart.split(',');
        for (const sub of subparts) {
            const rangeMatch = sub.match(/(\d+)\s*[-–]\s*(\d+)/);
            if (rangeMatch) {
                const start = parseInt(rangeMatch[1], 10);
                const end = parseInt(rangeMatch[2], 10);
                for (let i = start; i <= end; i++) {
                    verses.push(i);
                }
            } else {
                const singleMatch = sub.match(/(\d+)/);
                if (singleMatch) {
                    verses.push(parseInt(singleMatch[1], 10));
                }
            }
        }
        return verses;
    }

    applyReadingPlanHighlights() {
        if (!this.dom.readingPane) return;
        
        // Always clear previous plan highlights first
        this.dom.readingPane.querySelectorAll('.plan-highlighted').forEach(el => {
            el.classList.remove('plan-highlighted');
        });

        if (!this.activePlanMode || !this.activePlanData || !this.activePlanDay) return;

        const dayConfig = this.activePlanData.days.find(d => d.dayNumber === this.activePlanDay);
        if (!dayConfig || !dayConfig.verses) return;

        // Parse book name and chapter number of the current day Config to make sure it matches the current view
        const currentRef = this.getCurrentReferenceText().toLowerCase().replace(/[\.\s]/g, '');
        const targetRef = dayConfig.verses.split(':')[0].toLowerCase().replace(/[\.\s]/g, '');
        
        if (currentRef !== targetRef) return; // Not the same book/chapter

        const versesToHighlight = this.parseVersesFromRef(dayConfig.verses);
        if (versesToHighlight.length === 0) return;

        const paragraphs = this.dom.readingPane.querySelectorAll('p');
        for (const p of paragraphs) {
            const sup = p.querySelector('sup.v');
            if (sup) {
                const verseNum = parseInt(sup.innerText.trim(), 10);
                if (versesToHighlight.includes(verseNum)) {
                    p.classList.add('plan-highlighted');
                }
            }
        }
    }

    addToHistory() {
        const ref = this.getCurrentReferenceText();
        const item = {
            ref,
            chapterId: this.selectedChapterId,
            bookId: this.selectedBookId,
            bibleId: this.selectedBibleId,
            timestamp: Date.now()
        };

        // Filter duplicates
        this.history = this.history.filter(h => h.ref !== ref || h.bibleId !== this.selectedBibleId);
        this.history.unshift(item);
        
        // Max history 20 items
        if (this.history.length > 20) this.history.pop();

        this.safeSetLocalStorage('hkm_bible_history', JSON.stringify(this.history));
        this.renderHistoryList();
    }

    renderBookmarksList() {
        if (!this.dom.bookmarksList) return;
        if (this.bookmarks.length === 0) {
            this.dom.bookmarksList.innerHTML = `<p class="empty-state">${this.t('empty_bookmarks')}</p>`;
            return;
        }

        this.dom.bookmarksList.innerHTML = this.bookmarks.map(b => `
            <div class="nav-sidebar-item" data-chapter-id="${b.chapterId}" data-book-id="${b.bookId}" data-verse="${b.verse}" data-bible-id="${b.bibleId}">
                <div>
                    <strong>${b.ref}</strong>
                    <span style="font-size: 11px; color: #64748b; display: block; margin-top: 2px;">${b.bibleId.replace('OPENBIBLE_', 'OTB-')}</span>
                </div>
                <span class="material-symbols-outlined remove-btn" data-id="${b.id}" style="font-size: 18px; color: #94a3b8; cursor: pointer;">delete</span>
            </div>
        `).join('');

        this.dom.bookmarksList.querySelectorAll('.nav-sidebar-item').forEach(item => {
            // Click to navigate
            item.addEventListener('click', async (e) => {
                if (e.target.classList.contains('remove-btn')) {
                    e.stopPropagation();
                    const bId = e.target.dataset.id;
                    this.bookmarks = this.bookmarks.filter(b => b.id !== bId);
                    this.safeSetLocalStorage('hkm_bible_bookmarks', JSON.stringify(this.bookmarks));
                    this.restoreHighlights();
                    this.renderBookmarksList();
                    return;
                }

                const trans = item.dataset.bibleId;
                if (trans !== this.selectedBibleId) {
                    this.selectedBibleId = trans;
                    if (this.dom.translationSelect) this.dom.translationSelect.value = trans;
                    const mobileTransSelect = document.getElementById('bible-translation-select-mobile');
                    if (mobileTransSelect) mobileTransSelect.value = trans;
                    await this.loadBooks();
                }
                
                await this.selectBook(item.dataset.bookId);
                await this.selectChapter(item.dataset.chapterId);
                this.scrollToVerse(item.dataset.verse);

                if (this.dom.navRight && this.dom.navRight.classList.contains('active')) {
                    this.dom.navRight.classList.remove('active');
                }
            });
        });
    }

    renderHistoryList() {
        if (!this.dom.historyList) return;
        if (this.history.length === 0) {
            this.dom.historyList.innerHTML = `<p class="empty-state">${this.t('empty_history')}</p>`;
            return;
        }

        this.dom.historyList.innerHTML = this.history.map(h => `
            <div class="nav-sidebar-item" data-chapter-id="${h.chapterId}" data-book-id="${h.bookId}" data-bible-id="${h.bibleId}">
                <div>
                    <strong>${h.ref}</strong>
                    <span style="font-size: 11px; color: #64748b; display: block; margin-top: 2px;">${h.bibleId.replace('OPENBIBLE_', 'OTB-')}</span>
                </div>
                <span class="material-symbols-outlined" style="font-size: 16px; color: #cbd5e1;">history</span>
            </div>
        `).join('');

        this.dom.historyList.querySelectorAll('.nav-sidebar-item').forEach(item => {
            item.addEventListener('click', async () => {
                const trans = item.dataset.bibleId;
                if (trans !== this.selectedBibleId) {
                    this.selectedBibleId = trans;
                    if (this.dom.translationSelect) this.dom.translationSelect.value = trans;
                    const mobileTransSelect = document.getElementById('bible-translation-select-mobile');
                    if (mobileTransSelect) mobileTransSelect.value = trans;
                    await this.loadBooks();
                }
                await this.selectBook(item.dataset.bookId);
                await this.selectChapter(item.dataset.chapterId);

                if (this.dom.navRight && this.dom.navRight.classList.contains('active')) {
                    this.dom.navRight.classList.remove('active');
                }
            });
        });
    }

    setupSwipeGestures() {
        // Swipe gestures disabled to prevent accidental chapter navigation or toolbar triggers
    }

    async loadNotes() {
        if (!this.dom.notesList) return;
        
        const db = this.getFirestore();
        if (this.currentUser && db) {
            this.dom.notesList.innerHTML = `<div class="loading-state" style="padding: 20px; text-align: center;"><div class="spinner" style="margin: 0 auto 10px auto;"></div>Laster notater...</div>`;
            try {
                const snap = await db.collection('personal_notes')
                    .where('userId', '==', this.currentUser.uid)
                    .get();
                
                this.notes = [];
                snap.forEach(doc => {
                    const data = doc.data();
                    this.notes.push({
                        id: doc.id,
                        title: data.title || 'Uten tittel',
                        text: data.text || '',
                        createdAt: data.createdAt ? data.createdAt.toDate() : new Date()
                    });
                });
                
                // Sort by date desc
                this.notes.sort((a, b) => b.createdAt - a.createdAt);
            } catch (e) {
                console.error('Error fetching notes:', e);
                this.notes = [];
            }
        } else {
            // Load from localStorage
            let localNotesRaw = null;
            try {
                localNotesRaw = this.safeGetLocalStorage('hkm_bible_notes');
            } catch (e) {
                console.warn("[BibleReader] Failed to read local notes:", e);
            }
            this.notes = localNotesRaw ? (JSON.parse(localNotesRaw) || []) : [];
            // Parse dates
            this.notes = this.notes.map(n => ({
                ...n,
                createdAt: new Date(n.createdAt)
            }));
            this.notes.sort((a, b) => b.createdAt - a.createdAt);
        }
        
        this.renderNotesList();
    }

    renderNotesList() {
        if (!this.dom.notesList) return;

        let syncBadge = '';
        if (!this.currentUser) {
            syncBadge = `
                <div style="background: rgba(209, 125, 57, 0.1); border: 1px solid rgba(209, 125, 57, 0.2); border-radius: 8px; padding: 10px; margin-bottom: 12px; font-size: 12px; color: #7f8c8d;">
                    ⚠️ Lagres kun lokalt. <a href="/minside/login.html" style="color: var(--bible-primary); text-decoration: underline; font-weight: 600;">Logg inn</a> for å synkronisere med Min Side.
                </div>
            `;
        }

        const newNoteBtnHtml = `
            <button id="btn-new-note" style="width: 100% !important; margin-bottom: 16px !important; border-radius: 8px !important; padding: 10px 16px !important; font-size: 14px !important; background: var(--bible-primary) !important; color: #fff !important; font-weight: 600 !important; border: none !important; cursor: pointer !important; display: flex !important; align-items: center !important; justify-content: center !important; transition: all 0.2s !important; box-sizing: border-box !important; height: 40px !important; line-height: 1.2 !important; text-transform: none !important; box-shadow: none !important;">
                <span class="material-symbols-outlined" style="font-size: 18px; margin-right: 6px;">add</span>${this.t('new_note')}
            </button>
        `;

        if (this.notes.length === 0) {
            this.dom.notesList.innerHTML = `
                ${syncBadge}
                ${newNoteBtnHtml}
                <p class="empty-state" style="padding: 20px 0; text-align: center; color: #94a3b8; font-size: 13px;">${this.t('empty_notes')}</p>
            `;
        } else {
            const listHtml = this.notes.map(n => {
                const activeLang = document.documentElement.lang || 'no';
                const locale = activeLang === 'no' ? 'no-NO' : activeLang === 'es' ? 'es-ES' : 'en-US';
                const dateStr = n.createdAt.toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = n.text;
                const plainText = tempDiv.innerText || tempDiv.textContent || '';
                const preview = plainText.length > 60 ? plainText.substring(0, 60) + '...' : plainText;

                return `
                    <div class="note-sidebar-item" data-id="${n.id}" style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 8px; padding: 12px; margin-bottom: 10px; cursor: pointer; transition: all 0.2s; position: relative; box-sizing: border-box; text-align: left;">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px; gap: 8px;">
                            <strong class="note-title" style="font-size: 14px; font-weight: 600; color: var(--text-base); display: block; max-width: calc(100% - 24px); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${n.title}</strong>
                            <span class="material-symbols-outlined delete-note-btn" data-id="${n.id}" style="font-size: 18px; color: #cbd5e1; cursor: pointer; transition: color 0.2s; flex-shrink: 0;">delete</span>
                        </div>
                        <p style="font-size: 12px; color: var(--text-muted); margin: 0 0 6px 0; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; white-space: normal;">${preview || '<i>Ingen tekst</i>'}</p>
                        <span style="font-size: 10px; color: #94a3b8;">${dateStr}</span>
                    </div>
                `;
            }).join('');

            this.dom.notesList.innerHTML = `
                ${syncBadge}
                ${newNoteBtnHtml}
                <div class="notes-items-container" style="max-height: calc(100vh - 280px); overflow-y: auto; padding-right: 4px;">
                    ${listHtml}
                </div>
            `;
        }

        // Bind events
        const newBtn = this.dom.notesList.querySelector('#btn-new-note');
        if (newBtn) {
            newBtn.addEventListener('click', () => this.showNoteForm());
        }

        this.dom.notesList.querySelectorAll('.note-sidebar-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.classList.contains('delete-note-btn')) {
                    e.stopPropagation();
                    const noteId = e.target.dataset.id;
                    this.deleteNote(noteId);
                    return;
                }
                const noteId = item.dataset.id;
                const note = this.notes.find(n => n.id === noteId);
                if (note) this.showNoteForm(note);
            });

            // Hover delete button effect
            const delBtn = item.querySelector('.delete-note-btn');
            if (delBtn) {
                delBtn.addEventListener('mouseover', () => delBtn.style.color = '#ef4444');
                delBtn.addEventListener('mouseout', () => delBtn.style.color = '#cbd5e1');
            }
        });
    }

    showNoteForm(note = null) {
        if (!this.dom.notesList) return;

        const isEdit = !!note;
        const currentRef = this.getCurrentReferenceText();
        const defaultTitle = isEdit ? note.title : currentRef;
        const bodyText = isEdit ? note.text.replace(/<br>/g, '\n') : '';

        this.dom.notesList.innerHTML = `
            <div class="note-form" style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 8px; padding: 16px; box-sizing: border-box; text-align: left;">
                <h4 style="font-size: 14px; font-weight: 600; margin-bottom: 12px; color: var(--text-base);">${isEdit ? 'Rediger notat' : 'Nytt notat'}</h4>
                
                <div style="margin-bottom: 12px;">
                    <label style="display: block; font-size: 11px; font-weight: 600; text-transform: uppercase; color: var(--text-muted); margin-bottom: 4px;">Tittel</label>
                    <input type="text" id="note-form-title" class="bible-control-input" value="${defaultTitle}" style="width: 100% !important; height: 36px !important;" placeholder="Tittel på notatet..." />
                </div>
                
                <div style="margin-bottom: 16px;">
                    <label style="display: block; font-size: 11px; font-weight: 600; text-transform: uppercase; color: var(--text-muted); margin-bottom: 4px;">Tekst</label>
                    <textarea id="note-form-body" style="width: 100%; height: 160px; padding: 10px; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-base); color: var(--text-base); font-size: 13px; font-family: inherit; line-height: 1.4; resize: vertical; outline: none; box-sizing: border-box;" placeholder="Skriv dine tanker, bønner eller refleksjoner her...">${bodyText}</textarea>
                </div>
                
                <div style="display: flex; gap: 8px;">
                    <button id="btn-save-note" style="flex: 1 !important; border-radius: 8px !important; padding: 8px 12px !important; font-size: 13px !important; background: var(--bible-primary) !important; color: #fff !important; font-weight: 600 !important; border: none !important; cursor: pointer !important; height: 38px !important; line-height: 1.2 !important; text-transform: none !important; box-shadow: none !important;">Lagre</button>
                    <button id="btn-cancel-note" style="flex: 1 !important; border-radius: 8px !important; padding: 8px 12px !important; font-size: 13px !important; background: var(--bg-base) !important; color: var(--text-base) !important; border: 1px solid var(--border-color) !important; font-weight: 600 !important; cursor: pointer !important; height: 38px !important; line-height: 1.2 !important; text-transform: none !important; box-shadow: none !important;">Avbryt</button>
                </div>
            </div>
        `;

        // Focus body input if creating new
        if (!isEdit) {
            document.getElementById('note-form-body').focus();
        }

        // Cancel
        document.getElementById('btn-cancel-note').addEventListener('click', () => {
            this.renderNotesList();
        });

        // Save
        document.getElementById('btn-save-note').addEventListener('click', async () => {
            const titleInput = document.getElementById('note-form-title');
            const bodyInput = document.getElementById('note-form-body');
            
            const title = titleInput.value.trim() || 'Uten tittel';
            const rawBody = bodyInput.value.trim();
            if (!rawBody) {
                bodyInput.focus();
                return;
            }
            
            const htmlText = rawBody.replace(/\n/g, '<br>');
            const saveBtn = document.getElementById('btn-save-note');
            saveBtn.disabled = true;
            saveBtn.innerText = 'Lagrer...';

            const db = this.getFirestore();
            if (this.currentUser && db) {
                try {
                    if (isEdit) {
                        await db.collection('personal_notes').doc(note.id).update({
                            title: title,
                            text: htmlText,
                            updatedAt: this.getServerTimestamp()
                        });
                    } else {
                        await db.collection('personal_notes').add({
                            userId: this.currentUser.uid,
                            title: title,
                            text: htmlText,
                            createdAt: this.getServerTimestamp(),
                            updatedAt: this.getServerTimestamp()
                        });
                    }
                } catch (e) {
                    console.error('Error saving note:', e);
                    alert('Feil ved lagring: ' + e.message);
                }
            } else {
                // Save to localStorage
                let localNotes = [];
                try {
                    const rawNotes = this.safeGetLocalStorage('hkm_bible_notes');
                    if (rawNotes) localNotes = JSON.parse(rawNotes) || [];
                } catch (e) {
                    console.warn("[BibleReader] Failed to parse local notes:", e);
                }
                if (isEdit) {
                    const existingIdx = localNotes.findIndex(n => n.id === note.id);
                    if (existingIdx !== -1) {
                        localNotes[existingIdx].title = title;
                        localNotes[existingIdx].text = htmlText;
                        localNotes[existingIdx].createdAt = new Date().toISOString();
                    }
                } else {
                    const newNote = {
                        id: 'local_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                        title: title,
                        text: htmlText,
                        createdAt: new Date().toISOString()
                    };
                    localNotes.push(newNote);
                }
                this.safeSetLocalStorage('hkm_bible_notes', JSON.stringify(localNotes));
            }

            this.loadNotes();
        });
    }

    async deleteNote(noteId) {
        if (!confirm('Vil du slette dette notatet?')) return;

        const db = this.getFirestore();
        if (this.currentUser && db) {
            try {
                await db.collection('personal_notes').doc(noteId).delete();
            } catch (e) {
                console.error('Error deleting note:', e);
                alert('Feil ved sletting: ' + e.message);
            }
        } else {
            let localNotes = [];
            try {
                const rawNotes = this.safeGetLocalStorage('hkm_bible_notes');
                if (rawNotes) localNotes = JSON.parse(rawNotes) || [];
            } catch (e) {
                console.warn("[BibleReader] Failed to parse local notes for deletion:", e);
            }
            localNotes = localNotes.filter(n => n.id !== noteId);
            this.safeSetLocalStorage('hkm_bible_notes', JSON.stringify(localNotes));
        }

        this.loadNotes();
    }

    renderResourceCard(res) {
        return `
            <a href="${res.link}" target="${res.isYoutube ? '_blank' : '_self'}" class="related-resource-item">
                ${res.thumbnail ? `
                    <div class="related-resource-thumbnail">
                        <img src="${res.thumbnail}" alt="${res.title}">
                        ${res.isYoutube ? `
                            <div class="related-resource-play-overlay">
                                <span class="material-symbols-outlined">play_arrow</span>
                            </div>
                        ` : ''}
                    </div>
                ` : `
                    <div class="related-resource-icon ${res.isYoutube ? 'youtube' : ''}">
                        <span class="material-symbols-outlined" style="font-size: 20px;">${res.icon}</span>
                    </div>
                `}
                <div class="related-resource-info">
                    <span class="related-resource-type ${res.isYoutube ? 'youtube' : ''}">${res.type}</span>
                    <h4 class="related-resource-title" title="${res.title}">${res.title}</h4>
                </div>
            </a>
        `;
    }

    async searchLocalResources(query) {
        if (!query) return [];
        const term = query.toLowerCase().trim();
        const results = [];

        try {
            // Fetch blogs
            const blogData = await firebaseService.getPageContent('collection_blog');
            if (blogData && blogData.items) {
                const blogItems = Object.values(blogData.items);
                blogItems.forEach(item => {
                    const title = (item.title || '').toLowerCase();
                    const content = (item.content || '').toLowerCase();
                    const category = (item.category || '').toLowerCase();
                    if (title.includes(term) || content.includes(term) || category.includes(term)) {
                        results.push({
                            title: item.title,
                            type: 'Blogg',
                            icon: 'article',
                            link: `/blogg-post.html?id=${encodeURIComponent(item.__stableId || item.id || '')}`,
                            thumbnail: item.imageUrl || item.image || 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80'
                        });
                    }
                });
            }

            // Fetch teachings
            const teachingData = await firebaseService.getPageContent('collection_teaching');
            if (teachingData && teachingData.items) {
                const teachingItems = Object.values(teachingData.items);
                teachingItems.forEach(item => {
                    const title = (item.title || '').toLowerCase();
                    const desc = (item.description || '').toLowerCase();
                    const content = (item.content || '').toLowerCase();
                    if (title.includes(term) || desc.includes(term) || content.includes(term)) {
                        results.push({
                            title: item.title,
                            type: 'Undervisning',
                            icon: 'school',
                            link: `/media.html?id=${encodeURIComponent(item.__stableId || item.id || '')}`,
                            thumbnail: item.imageUrl || item.image || 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80'
                        });
                    }
                });
            }
        } catch (e) {
            console.error("Error searching local resources:", e);
        }

        // Search YouTube
        try {
            const YT_CHANNEL_ID = 'UCFbX-Mf7NqDm2a07hk6hveg';
            const ytUrl = `/api/youtube?action=channel&channelId=${YT_CHANNEL_ID}&q=${encodeURIComponent(term)}&maxResults=5`;
            const resp = await fetch(ytUrl);
            const data = await resp.json();
            if (data.items) {
                data.items.forEach(item => {
                    results.push({
                        title: item.snippet.title,
                        type: 'YouTube',
                        icon: 'play_circle',
                        link: `https://www.youtube.com/watch?v=${item.id.videoId}`,
                        isYoutube: true,
                        thumbnail: item.snippet.thumbnails?.default?.url || item.snippet.thumbnails?.medium?.url || ''
                    });
                });
            }
        } catch (e) {
            console.error("Error searching YouTube:", e);
        }

        // Match biblical characters
        if (biblicalCharacters && Array.isArray(biblicalCharacters)) {
            const lang = document.documentElement.lang || 'no';
            biblicalCharacters.forEach(char => {
                const name = (char.name[lang] || char.name.no || '').toLowerCase();
                const role = (char.role[lang] || char.role.no || '').toLowerCase();
                const era = (char.era[lang] || char.era.no || '').toLowerCase();
                const meaning = (char.meaning[lang] || char.meaning.no || '').toLowerCase();
                const summary = (char.summary[lang] || char.summary.no || '').toLowerCase();
                const story = (char.story[lang] || char.story.no || '').toLowerCase();
                const theology = (char.theologicalSignificance[lang] || char.theologicalSignificance.no || '').toLowerCase();

                if (name.includes(term) || role.includes(term) || era.includes(term) || meaning.includes(term) || summary.includes(term) || story.includes(term) || theology.includes(term)) {
                    const charName = char.name[lang] || char.name.no;
                    const resPath = lang === 'no' ? '/ressurser' : `/${lang}/ressurser`;
                    results.push({
                        title: charName,
                        type: lang === 'en' ? 'Biblical Character' : (lang === 'es' ? 'Personaje Bíblico' : 'Bibelsk person'),
                        icon: 'person',
                        link: `${resPath}/bibelsk-person-detaljer.html?id=${char.id}`,
                        thumbnail: char.image || 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80'
                    });
                }
            });
        }

        // Match timelines
        try {
            const lang = document.documentElement.lang || 'no';
            const timelines = [
                {
                    id: 'bibelsk-tidslinje',
                    title: {
                        no: 'Bibelens tidslinje',
                        en: 'Biblical Timeline',
                        es: 'Línea de Tiempo Bíblica'
                    },
                    keywords: {
                        no: 'bibel tidslinje historie skapelsen syndefallet noa abraham moses david jesus kirke',
                        en: 'bible timeline history creation fall noah abraham moses david jesus church',
                        es: 'biblia línea de tiempo historia creación caída noé abrahán moisés david jesús iglesia'
                    },
                    link: lang === 'no' ? '/ressurser/bibelsk-tidslinje.html' : `/${lang}/ressurser/bibelsk-tidslinje.html`,
                    thumbnail: '/img/bible-timeline-hero.webp'
                },
                {
                    id: 'tidslinje-imperier',
                    title: {
                        no: 'Imperienes tidslinje',
                        en: 'Timeline of Empires',
                        es: 'Línea de Tiempo de Imperios'
                    },
                    keywords: {
                        no: 'imperie tidslinje historie riker babylon persia hellas roma',
                        en: 'empire timeline history kingdoms babylon persia greece rome',
                        es: 'imperio línea de tiempo historia reinos babilonia persia grecia roma'
                    },
                    link: lang === 'no' ? '/ressurser/tidslinje-imperier.html' : `/${lang}/ressurser/tidslinje-imperier.html`,
                    thumbnail: '/img/empires-hero.webp'
                }
            ];

            timelines.forEach(tl => {
                const title = (tl.title[lang] || tl.title.no || '').toLowerCase();
                const keywords = (tl.keywords[lang] || tl.keywords.no || '').toLowerCase();
                if (title.includes(term) || keywords.includes(term)) {
                    results.push({
                        title: tl.title[lang] || tl.title.no,
                        type: lang === 'en' ? 'Timeline' : (lang === 'es' ? 'Línea de Tiempo' : 'Tidslinje'),
                        icon: 'timeline',
                        link: tl.link,
                        thumbnail: tl.thumbnail || 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80'
                    });
                }
            });
        } catch (e) {
            console.error("Error matching timelines in searchLocalResources:", e);
        }
        // Match Bible Structure guide
        try {
            const bibleStructureKeywords = ['bibel', 'testament', 'oppbygning', 'sjanger', 'lese', 'leseguide', 'mosebok', 'evangelie', 'profet', 'brev', 'structure', 'genre', 'books'];
            if (bibleStructureKeywords.some(k => term.includes(k))) {
                const lang = document.documentElement.lang || 'no';
                const link = lang === 'en' ? '/en/ressurser/bibeloppbygning' : (lang === 'es' ? '/es/ressurser/bibeloppbygning' : '/ressurser/bibeloppbygning');
                const title = lang === 'en' ? 'Structure of the Bible & Genres' : (lang === 'es' ? 'Estructura de la Biblia y Géneros' : 'Bibelens oppbygning og sjangre');
                results.push({
                    title: title,
                    type: 'Ressurs / Guide',
                    icon: 'auto_stories',
                    link: link,
                    thumbnail: 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80'
                });
            }
        } catch (e) {
            console.error("Error matching bible structure resource:", e);
        }

        return results;
    }

    getBibleProjectVideo(bookId, lang) {
        const key = String(bookId).toUpperCase().trim();
        const entry = BIBLE_PROJECT_VIDEOS[key];
        if (!entry) return null;
        const video = entry[lang] || entry['en'] || null;
        if (video && video.id && /^[a-zA-Z0-9_-]{11}$/.test(video.id) && video.id !== 'open_in_new') {
            return video;
        }
        return null;
    }

    async updateRelatedResources() {
        const relatedList = document.getElementById('related-list');
        if (!relatedList) return;

        relatedList.innerHTML = `
            <div style="text-align: center; padding: 30px 0; color: var(--text-muted);">
                <div class="spinner" style="margin: 0 auto 12px; width: 24px; height: 24px;"></div>
                <p style="font-size: 13px;">${this.t('fetching_resources')}</p>
            </div>
        `;

        const currentBook = this.books.find(b => b.id === this.selectedBookId);
        if (!currentBook) {
            relatedList.innerHTML = `<div class="empty-state">${this.t('no_book_selected')}</div>`;
            return;
        }

        const lang = document.documentElement.lang || 'no';

        // 0. BibleProject Intro Video
        let bpVideoHtml = '';
        const bpVideo = this.getBibleProjectVideo(this.selectedBookId, lang);
        if (bpVideo) {
            const label = lang === 'no' ? 'Introduksjonsvideo fra BibleProject' : lang === 'es' ? 'Video de introducción de BibleProject' : 'BibleProject Introduction Video';
            bpVideoHtml = `
                <div class="hkm-resources-section" style="margin-bottom: 24px;">
                    <h3 style="font-size: 11px; font-weight: 700; color: var(--text-muted); margin-bottom: 12px; display: flex; align-items: center; gap: 6px; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid var(--border-color); padding-bottom: 8px; margin-top: 0;">
                        <span class="material-symbols-outlined" style="font-size: 18px; color: #ff0000;">play_circle</span>
                        <span>${label}</span>
                    </h3>
                    <div class="hkm-rp-sidebar-card no-stripe" style="margin: 0; padding: 0; box-shadow: none; border: none; overflow: hidden; border-radius: 12px; background: var(--bg-card); border: 1px solid var(--border-color); margin-bottom: 16px;">
                        <div class="relative h-36 overflow-hidden group cursor-pointer" onclick="window.open('https://www.youtube.com/watch?v=${bpVideo.id}', '_blank')">
                            <img src="https://img.youtube.com/vi/${bpVideo.id}/0.jpg" style="width: 100%; height: 100%; object-fit: cover; transition: transform 0.5s ease; display: block;" class="group-hover:scale-105" />
                            <div style="position: absolute; inset: 0; background: rgba(0,0,0,0.25); display: flex; align-items: center; justify-content: center; transition: all 0.3s;" class="group-hover:bg-black/40">
                                <div style="width: 40px; height: 40px; background: #ffffff; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.15); transition: transform 0.2s;" class="group-hover:scale-110">
                                    <span class="material-symbols-outlined" style="color: #d17d39; font-variation-settings: 'FILL' 1; font-size: 24px;">play_arrow</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
        const isPrayer = this.activePlanData && this.activePlanData.title && (
            this.activePlanData.title.toLowerCase().includes('bønn') ||
            this.activePlanData.title.toLowerCase().includes('prayer') ||
            this.activePlanData.title.toLowerCase().includes('oración')
        );
        const sectionTitles = {
            no: {
                planResources: isPrayer ? 'Dagens bønneressurser' : 'Dagens leseplan-ressurser',
                prayerFocus: 'Bønnefokus',
                defaultPrayer: 'Be over skriftstedene du leser i dag.',
                noPlanResources: 'Ingen ekstra ressurser tilknyttet denne dagen.',
                crossRefs: 'Kryssreferanser',
                generalResources: `Generelle ressurser for ${currentBook.name}`,
                noGeneralResources: 'Ingen relaterte ressurser funnet.',
                planResTag: isPrayer ? 'BØNNEAPP RESSURS' : 'LESEPLAN RESSURS'
            },
            en: {
                planResources: isPrayer ? "Today's Prayer Resources" : "Today's Reading Plan Resources",
                prayerFocus: 'Prayer Focus',
                defaultPrayer: 'Pray over the scriptures you read today.',
                noPlanResources: 'No extra resources connected to this day.',
                crossRefs: 'Cross References',
                generalResources: `General Resources for ${currentBook.name}`,
                noGeneralResources: 'No related resources found.',
                planResTag: isPrayer ? 'PRAYER APP RESOURCE' : 'READING PLAN RESOURCE'
            },
            es: {
                planResources: isPrayer ? 'Recursos de oración de hoy' : 'Recursos del Plan de Lectura de Hoy',
                prayerFocus: 'Enfoque de Oración',
                defaultPrayer: 'Ora sobre las escrituras que leas hoy.',
                noPlanResources: 'No hay recursos adicionales relacionados con este día.',
                crossRefs: 'Referencias Cruzadas',
                generalResources: `Recursos Generales para ${currentBook.name}`,
                noGeneralResources: 'No se encontraron recursos relacionados.',
                planResTag: isPrayer ? 'RECURSO DE ORACIÓN' : 'RECURSO DEL PLAN'
            }
        };

        const tSec = sectionTitles[lang] || sectionTitles.no;

        // 1. Reading Plan resources
        let planResourcesHtml = '';
        if (this.activePlanMode && this.activePlanData) {
            const currentDayNum = this.activePlanDay;
            const dayConfig = this.activePlanData.days.find(d => d.dayNumber === currentDayNum) || this.activePlanData.days[0];
            if (dayConfig) {
                let dayResourcesHtml = '';
                if (dayConfig.resources && dayConfig.resources.length > 0) {
                    dayConfig.resources.forEach(res => {
                        let iconName = 'article';
                        if (res.type === 'video') iconName = 'play_circle';
                        else if (res.type === 'podcast') iconName = 'podcasts';

                        dayResourcesHtml += `
                            <a href="${res.url || '#'}" target="_blank" class="related-resource-item" style="margin-bottom: 8px;">
                                <div class="related-resource-icon">
                                    <span class="material-symbols-outlined" style="font-size: 20px;">${iconName}</span>
                                </div>
                                <div class="related-resource-info">
                                    <span class="related-resource-type">${tSec.planResTag}</span>
                                    <h4 class="related-resource-title" title="${res.title}">${res.title}</h4>
                                </div>
                            </a>
                        `;
                    });
                } else {
                    dayResourcesHtml = `<div style="font-size: 13px; color: var(--text-muted); padding: 4px 8px;">${tSec.noPlanResources}</div>`;
                }

                planResourcesHtml = `
                    <div class="hkm-resources-section" style="margin-bottom: 24px;">
                        <h3 style="font-size: 11px; font-weight: 700; color: var(--text-muted); margin-bottom: 12px; display: flex; align-items: center; gap: 6px; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid var(--border-color); padding-bottom: 8px; margin-top: 0;">
                            <span class="material-symbols-outlined" style="font-size: 18px; color: var(--bible-primary);">menu_book</span>
                            <span>${tSec.planResources}</span>
                        </h3>
                        <div class="day-resources-list" style="display: flex; flex-direction: column; gap: 4px;">
                            ${dayResourcesHtml}
                        </div>
                    </div>
                `;
            }
        }

        // 2. Cross references
        let crossRefsHtml = '';
        let crossRefs = [];
        try {
            const currentRef = this.getCurrentReferenceText();
            const res = await fetch(`/api/bible/cross-references?chapterName=${encodeURIComponent(currentRef)}`);
            if (res.ok) {
                crossRefs = await res.json();
                if (crossRefs && crossRefs.length > 0) {
                    let crossRefsItemsHtml = crossRefs.map((item, idx) => `
                        <div class="cross-ref-item-sidebar" data-idx="${idx}" style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px; padding: 12px; display: flex; flex-direction: column; gap: 4px; transition: all 0.25s ease; cursor: pointer; box-sizing: border-box; width: 100%; margin-bottom: 8px;">
                            <div style="display: flex; align-items: center; justify-content: space-between; font-weight: 700; color: var(--bible-primary); font-size: 13px;">
                                <span>${item.ref}</span>
                                <span class="material-symbols-outlined" style="font-size: 16px;">open_in_new</span>
                            </div>
                            <div style="font-size: 12px; color: var(--text-base); line-height: 1.4;">${item.explanation}</div>
                        </div>
                    `).join('');

                    crossRefsHtml = `
                        <div class="hkm-resources-section" style="margin-bottom: 24px;">
                            <h3 style="font-size: 11px; font-weight: 700; color: var(--text-muted); margin-bottom: 12px; display: flex; align-items: center; gap: 6px; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid var(--border-color); padding-bottom: 8px; margin-top: 24px;">
                                <span class="material-symbols-outlined" style="font-size: 18px; color: var(--bible-primary);">link</span>
                                <span>${tSec.crossRefs}</span>
                            </h3>
                            <div class="sidebar-cross-refs-list" style="display: flex; flex-direction: column; gap: 4px;">
                                ${crossRefsItemsHtml}
                            </div>
                        </div>
                    `;
                }
            }
        } catch (e) {
            console.error("Error fetching cross references for sidebar:", e);
        }

        // 3. General Book resources
        let generalResourcesHtml = '';
        try {
            const query = currentBook.name;
            const resources = await this.searchLocalResources(query);
            
            let resourcesListHtml = '';
            if (resources && resources.length > 0) {
                resourcesListHtml = resources.map(res => this.renderResourceCard(res)).join('');
            } else {
                resourcesListHtml = `<div style="font-size: 13px; color: var(--text-muted); padding: 4px 8px;">${tSec.noGeneralResources}</div>`;
            }

            generalResourcesHtml = `
                <div class="hkm-resources-section" style="margin-bottom: 12px;">
                    <h3 style="font-size: 11px; font-weight: 700; color: var(--text-muted); margin-bottom: 12px; display: flex; align-items: center; gap: 6px; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid var(--border-color); padding-bottom: 8px; margin-top: 24px;">
                        <span class="material-symbols-outlined" style="font-size: 18px; color: var(--bible-primary);">explore</span>
                        <span>${tSec.generalResources}</span>
                    </h3>
                    <div class="general-resources-list" style="display: flex; flex-direction: column; gap: 4px;">
                        ${resourcesListHtml}
                    </div>
                </div>
            `;
        } catch (e) {
            console.error("Error fetching general resources:", e);
        }

        let bookIntroSidebarCardHtml = '';
        const bookIntroObj = typeof getBibleBookIntroduction === 'function' ? getBibleBookIntroduction(this.selectedBookId) : null;
        if (bookIntroObj) {
            const labelIntroHeader = lang === 'en' ? 'Book Introduction' : (lang === 'es' ? 'Introducción al libro' : 'Bokintroduksjon');
            const labelReadIntro = lang === 'en' ? 'Read full introduction' : (lang === 'es' ? 'Leer introducción completa' : 'Les bokintroduksjon');
            bookIntroSidebarCardHtml = `
                <div class="hkm-resources-section" style="margin-bottom: 24px;">
                    <h3 style="font-size: 11px; font-weight: 700; color: var(--text-muted); margin-bottom: 12px; display: flex; align-items: center; gap: 6px; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid var(--border-color); padding-bottom: 8px; margin-top: 0;">
                        <span class="material-symbols-outlined" style="font-size: 18px; color: #1B4965;">auto_stories</span>
                        <span>${labelIntroHeader}</span>
                    </h3>
                    <div class="hkm-rp-sidebar-card no-stripe" style="margin: 0; padding: 16px; box-shadow: none; border-radius: 12px; background: var(--bg-card); border: 1px solid var(--border-color); margin-bottom: 16px;">
                        <h4 style="margin: 0 0 6px 0; font-size: 14.5px; font-weight: 800; color: var(--text-base);">${bookIntroObj.title}</h4>
                        <p style="margin: 0 0 12px 0; font-size: 12.5px; color: var(--text-muted); line-height: 1.4;">${bookIntroObj.theme}</p>
                        <button class="hkm-btn-secondary" id="btn-sidebar-read-book-intro" style="width: 100%; height: 36px !important; font-size: 12px !important; display: inline-flex; align-items: center; justify-content: center; gap: 6px; border-color: #1B4965 !important; color: #1B4965 !important; border-radius: 8px !important;">
                            <span class="material-symbols-outlined" style="font-size: 16px;">menu_book</span>
                            <span>${labelReadIntro}</span>
                        </button>
                    </div>
                </div>
            `;
        }

        // Combine everything
        relatedList.innerHTML = `
            <div class="hkm-resources-tab-container" style="padding: 4px 0;">
                ${bookIntroSidebarCardHtml}
                ${bpVideoHtml}
                ${planResourcesHtml}
                ${crossRefsHtml}
                ${generalResourcesHtml}
            </div>
        `;

        document.getElementById('btn-sidebar-read-book-intro')?.addEventListener('click', () => {
            this.openBookIntroModal(this.selectedBookId);
        });

        // Bind events to cross references in sidebar
        const sidebarCrossRefItems = relatedList.querySelectorAll('.cross-ref-item-sidebar');
        sidebarCrossRefItems.forEach(el => {
            const idx = parseInt(el.getAttribute('data-idx'), 10);
            el.addEventListener('click', () => {
                const ref = crossRefs[idx].ref;
                this.parseAndNavigateToReference(ref);
            });
            // Hover styling
            el.addEventListener('mouseenter', () => {
                el.style.borderColor = 'var(--bible-primary)';
                el.style.transform = 'translateY(-1px)';
                el.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)';
            });
            el.addEventListener('mouseleave', () => {
                el.style.borderColor = 'var(--border-color)';
                el.style.transform = 'none';
                el.style.boxShadow = 'none';
            });
        });
    }

    // ──────────────────────────────────────────────────────────
    // READING PLAN INTEGRATION
    // ──────────────────────────────────────────────────────────

    getTranslation(key, fallback) {
        const lang = document.documentElement.lang || 'no';
        const isPrayer = this.activePlanData && this.activePlanData.title && (
            this.activePlanData.title.toLowerCase().includes('bønn') ||
            this.activePlanData.title.toLowerCase().includes('prayer') ||
            this.activePlanData.title.toLowerCase().includes('oración')
        );
        const dict = {
            no: {
                loading_plan: isPrayer ? 'Laster bønneapp...' : 'Laster leseplan...',
                active_plan: isPrayer ? 'Aktiv bønneapp' : 'Aktiv leseplan',
                progress: 'Fremgang',
                day: 'Dag',
                show_verses: 'Vis dagens vers',
                open_devotional: isPrayer ? 'Åpne dagens bønn' : 'Åpne dagens andakt',
                days_outline: 'Oversikt over dager',
                completed: 'Fullført',
                all_plans: isPrayer ? 'Tilgjengelige bønneapper' : 'Tilgjengelige leseplaner',
                start_plan_btn: isPrayer ? 'Start denne bønneappen' : 'Start denne planen',
                continue_plan_btn: isPrayer ? 'Fortsett bønneapp' : 'Fortsett leseplan',
                log_in_to_save: 'Logg inn på Min Side for å lagre din fremgang.',
                login_btn: 'Logg inn',
                days: 'dager',
                sync_devotion: isPrayer ? 'Oppdater til dagens bønn' : 'Oppdater til dagens andakt'
            },
            en: {
                loading_plan: isPrayer ? 'Loading prayer app...' : 'Loading reading plan...',
                active_plan: isPrayer ? 'Active Prayer App' : 'Active Reading Plan',
                progress: 'Progress',
                day: 'Day',
                show_verses: "Show today's verses",
                open_devotional: isPrayer ? "Open today's prayer" : "Open today's devotional",
                days_outline: 'Days Outline',
                completed: 'Completed',
                all_plans: isPrayer ? 'Available Prayer Apps' : 'Available Reading Plans',
                start_plan_btn: isPrayer ? 'Start this prayer app' : 'Start this plan',
                continue_plan_btn: isPrayer ? 'Continue prayer app' : 'Continue reading plan',
                log_in_to_save: 'Log in to save your progress.',
                login_btn: 'Log in',
                days: 'days',
                sync_devotion: isPrayer ? "Update to today's prayer" : "Update to today's devotion"
            },
            es: {
                loading_plan: isPrayer ? 'Cargando aplicación de oración...' : 'Cargando plan de lectura...',
                active_plan: isPrayer ? 'Aplicación de Oración Activa' : 'Plan de Lectura Activo',
                progress: 'Progreso',
                day: 'Día',
                show_verses: 'Ver versículos de hoy',
                open_devotional: isPrayer ? 'Abrir oración de hoy' : 'Abrir devocional de hoy',
                days_outline: 'Resumen de los días',
                completed: 'Completado',
                all_plans: isPrayer ? 'Aplicaciones de Oración Disponibles' : 'Planes de Lectura Disponibles',
                start_plan_btn: isPrayer ? 'Comenzar esta aplicación de oración' : 'Comenzar este plan',
                continue_plan_btn: isPrayer ? 'Continuar aplicación de oración' : 'Continuar plan de lectura',
                log_in_to_save: 'Inicia sesión para guardar tu progreso.',
                login_btn: 'Iniciar sesión',
                days: 'días',
                sync_devotion: isPrayer ? 'Actualizar a la oración de hoy' : 'Actualizar al devocional de hoy'
            }
        };
        return dict[lang]?.[key] || dict['no']?.[key] || fallback;
    }

    async loadReadingPlan(openSidebarOnMobile = false) {
        const container = this.dom.readingPlanContent;
        if (!container) return;

        // Display spinner
        container.innerHTML = `
            <div style="text-align: center; padding: 40px 20px; color: var(--text-muted);">
                <div class="spinner" style="margin: 0 auto 12px; width: 24px; height: 24px;"></div>
                <p style="font-size: 13px;">${this.getTranslation('loading_plan', 'Laster leseplan...')}</p>
            </div>
        `;

        // Inject Styles dynamically if not already injected
        if (!document.getElementById('hkm-reading-plan-styles')) {
            const style = document.createElement('style');
            style.id = 'hkm-reading-plan-styles';
            style.innerHTML = `
                .hkm-rp-title { font-size: 16px; font-weight: 700; color: #1B4965; margin-bottom: 8px; }
                .hkm-rp-subtitle { font-size: 13px; color: #64748b; margin-bottom: 16px; line-height: 1.5; }
                .hkm-rp-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 16px; transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s ease; transform: translateZ(0) !important; backface-visibility: hidden !important; }
                .hkm-rp-card:hover { transform: translateY(-2px) translateZ(0) !important; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05); }
                .hkm-btn-primary { background: linear-gradient(135deg, #d17d39 0%, #bd4f2a 100%) !important; color: #ffffff !important; padding: 10px 16px !important; border-radius: 8px !important; font-size: 13px !important; font-weight: 600 !important; border: none !important; cursor: pointer !important; display: inline-flex !important; align-items: center !important; justify-content: center !important; gap: 8px !important; transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), filter 0.2s ease, opacity 0.2s ease !important; height: 40px !important; text-decoration: none !important; transform: translateZ(0) !important; backface-visibility: hidden !important; will-change: transform, filter; }
                .hkm-btn-primary:hover { filter: brightness(1.08) !important; }
                .hkm-btn-primary:active { transform: scale(0.97) translateZ(0) !important; }
                .hkm-btn-secondary { background: transparent !important; border: 1px solid #d17d39 !important; color: #d17d39 !important; padding: 10px 16px !important; border-radius: 8px !important; font-size: 13px !important; font-weight: 600 !important; cursor: pointer !important; display: inline-flex !important; align-items: center !important; justify-content: center !important; transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease !important; height: 40px !important; text-decoration: none !important; transform: translateZ(0) !important; backface-visibility: hidden !important; will-change: transform, background-color; }
                .hkm-btn-secondary:hover { background: rgba(209, 125, 57, 0.05) !important; border-color: #bd4f2a !important; color: #bd4f2a !important; }
                .hkm-btn-secondary:active { transform: scale(0.97) translateZ(0) !important; }
                .hkm-rp-progress-bar { height: 6px; background: #e2e8f0; border-radius: 99px; overflow: hidden; margin: 12px 0 16px 0; }
                .hkm-rp-progress-fill { height: 100%; background: linear-gradient(135deg, #d17d39 0%, #bd4f2a 100%); border-radius: 99px; transition: width 0.4s ease; }
                .hkm-rp-day-item { display: flex; align-items: center; justify-content: space-between; padding: 12px; border-radius: 8px; cursor: pointer; transition: all 0.2s; border: 1px solid transparent; margin-bottom: 8px; }
                .hkm-rp-day-item:hover { background: #f8fafc; border-color: #e2e8f0; }
                .hkm-rp-day-item.active { background: rgba(209, 125, 57, 0.08); border-color: rgba(209, 125, 57, 0.2); }
                .hkm-rp-day-checkbox { width: 20px; height: 20px; border-radius: 50%; border: 2px solid #cbd5e1; display: flex; align-items: center; justify-content: center; color: transparent; transition: all 0.2s; flex-shrink: 0; }
                .hkm-rp-day-checkbox.completed { background: #10b981; border-color: #10b981; color: #ffffff; }
                .hkm-rp-day-checkbox.completed .material-symbols-outlined { font-size: 14px; font-weight: bold; }
                .hkm-devotional-overlay { position: fixed !important; top: 0 !important; left: 0 !important; width: 100vw !important; height: 100vh !important; height: 100dvh !important; background: #ffffff !important; z-index: 9999999 !important; display: flex !important; align-items: center !important; justify-content: center !important; transform: translateZ(0) !important; backface-visibility: hidden !important; }
                .hkm-devotional-content { background: #ffffff !important; width: 100% !important; max-width: 100% !important; height: 100% !important; height: 100dvh !important; border-radius: 0 !important; padding: 0 !important; box-shadow: none !important; display: flex !important; flex-direction: column !important; position: relative !important; transform: translateZ(0) !important; backface-visibility: hidden !important; overflow: hidden !important; }
                .hkm-devotional-step-title { font-size: 22px !important; font-weight: 700 !important; color: #1B4965 !important; margin-bottom: 16px !important; line-height: 1.3 !important; }
                .hkm-devotional-text-serif { font-family: 'Merriweather', 'Georgia', serif !important; font-size: 18px !important; line-height: 1.8 !important; color: #1e293b !important; margin-bottom: 24px !important; text-align: left !important; }
                .hkm-devotional-text-serif p { display: block !important; position: relative !important; margin-bottom: 16px !important; font-size: 18px !important; line-height: 1.8 !important; font-family: 'Merriweather', 'Georgia', serif !important; }
                .hkm-devotional-text-serif sup.v { font-size: 0.65em !important; font-weight: 700 !important; color: #d17d39 !important; margin-right: 6px !important; vertical-align: baseline !important; position: relative !important; top: -0.3em !important; line-height: 0 !important; user-select: none !important; }
                .hkm-devotional-prayer-box { background: #f8fafc !important; border-left: 4px solid #d17d39 !important; padding: 20px !important; border-radius: 0 12px 12px 0 !important; font-style: italic !important; font-size: 16px !important; line-height: 1.6 !important; color: #334155 !important; margin-bottom: 24px !important; }
                .hkm-devotional-reflection-textarea { display: block !important; width: 100% !important; min-height: 150px !important; padding: 16px !important; border-radius: 12px !important; border: 1px solid #cbd5e1 !important; outline: none !important; font-size: 15px !important; line-height: 1.5 !important; margin-bottom: 24px !important; resize: vertical !important; }
                .hkm-celebration-title { font-size: 24px !important; font-weight: 700 !important; color: #1B4965 !important; text-align: center !important; margin-top: 16px !important; margin-bottom: 8px !important; }
                .hkm-celebration-desc { font-size: 15px !important; color: #64748b !important; text-align: center !important; margin-bottom: 24px !important; }
                
                /* YouVersion-specific classes */
                .hkm-yv-wrapper { display: flex !important; flex-direction: column !important; height: 100% !important; width: 100% !important; background: #ffffff !important; box-sizing: border-box !important; position: relative !important; overflow: hidden !important; }
                .hkm-yv-header { display: flex !important; align-items: center !important; justify-content: space-between !important; padding: 16px 20px !important; border-bottom: 1px solid #f1f5f9 !important; background: #ffffff !important; flex-shrink: 0 !important; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02) !important; }
                .hkm-yv-header-btn-close { width: 36px !important; height: 36px !important; aspect-ratio: 1 / 1 !important; background: none !important; border: none !important; padding: 0 !important; cursor: pointer !important; color: #475569 !important; display: flex !important; align-items: center !important; justify-content: center !important; border-radius: 50% !important; transition: background-color 0.2s !important; flex-shrink: 0 !important; box-sizing: border-box !important; }
                .hkm-yv-header-btn-close:hover { background: #f1f5f9 !important; }
                .hkm-yv-header-title { display: flex !important; align-items: center !important; gap: 10px !important; flex: 1 !important; margin: 0 16px !important; min-width: 0 !important; }
                .hkm-yv-header-avatar { width: 28px !important; height: 28px !important; aspect-ratio: 1 / 1 !important; border-radius: 50% !important; background: linear-gradient(135deg, #d17d39 0%, #bd4f2a 100%) !important; color: white !important; display: flex !important; align-items: center !important; justify-content: center !important; font-weight: 700 !important; font-size: 13px !important; flex-shrink: 0 !important; box-sizing: border-box !important; box-shadow: 0 2px 4px rgba(209, 125, 57, 0.2) !important; }
                .hkm-yv-header-text { font-size: 15px !important; font-weight: 700 !important; color: #1B4965 !important; white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important; }
                .hkm-yv-header-text-full { display: inline-block !important; max-width: 600px !important; }
                .hkm-yv-header-text-short { display: none !important; }
                @media (max-width: 1024px) {
                    .hkm-yv-header-text-full { display: none !important; }
                    .hkm-yv-header-text-short { display: inline-block !important; max-width: 220px !important; }
                }
                .hkm-yv-header-actions { display: flex !important; align-items: center !important; gap: 4px !important; }
                .hkm-yv-action-btn { background: none !important; border: none !important; padding: 8px !important; cursor: pointer !important; color: #64748b !important; display: flex !important; align-items: center !important; justify-content: center !important; border-radius: 8px !important; transition: all 0.2s !important; }
                .hkm-yv-action-btn:hover { background: #f1f5f9 !important; color: #1e293b !important; }
                .hkm-yv-action-btn.speaking { color: #d17d39 !important; background: rgba(209, 125, 57, 0.08) !important; }
                
                .hkm-yv-body { flex: 1 !important; overflow-y: auto !important; padding: 24px 20px !important; background: #ffffff !important; display: flex !important; flex-direction: column !important; }
                .hkm-yv-body-inner { max-width: 600px !important; margin: 0 auto !important; width: 100% !important; }
                
                .hkm-yv-body.font-size-large .hkm-devotional-text-serif { font-size: 21px !important; }
                .hkm-yv-body.font-size-large .hkm-devotional-text-serif p { font-size: 21px !important; }
                .hkm-yv-body.font-size-xlarge .hkm-devotional-text-serif { font-size: 24px !important; }
                .hkm-yv-body.font-size-xlarge .hkm-devotional-text-serif p { font-size: 24px !important; }
                
                .hkm-yv-footer { display: flex !important; align-items: center !important; justify-content: space-between !important; padding: 16px 24px !important; border-top: 1px solid #f1f5f9 !important; background: #ffffff !important; flex-shrink: 0 !important; box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.02) !important; }
                .hkm-yv-nav-circle-btn { width: 44px !important; height: 44px !important; aspect-ratio: 1 / 1 !important; border-radius: 50% !important; background: #f1f5f9 !important; border: none !important; color: #475569 !important; display: flex !important; align-items: center !important; justify-content: center !important; cursor: pointer !important; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important; flex-shrink: 0 !important; box-sizing: border-box !important; padding: 0 !important; }
                .hkm-yv-nav-circle-btn:hover { background: #e2e8f0 !important; color: #0f172a !important; }
                .hkm-yv-nav-circle-btn.active { background: linear-gradient(135deg, #d17d39 0%, #bd4f2a 100%) !important; color: #ffffff !important; box-shadow: 0 4px 10px rgba(209, 125, 57, 0.25) !important; }
                .hkm-yv-nav-circle-btn.active:hover { filter: brightness(1.08) !important; }
                .hkm-yv-nav-circle-btn.active:active { transform: scale(0.95) !important; }
                .hkm-yv-footer-pill { background: #f8fafc !important; border: 1px solid #e2e8f0 !important; padding: 8px 16px !important; border-radius: 99px !important; font-size: 12px !important; font-weight: 800 !important; color: #64748b !important; letter-spacing: 0.08em !important; text-transform: uppercase !important; }
                
                /* Dark Mode theme for Devotional Wizard */
                .bible-theme-dark .hkm-devotional-overlay { background: #0f172a !important; }
                .bible-theme-dark .hkm-devotional-content { background: #0f172a !important; }
                .bible-theme-dark .hkm-devotional-step-title { color: #f8fafc !important; }
                .bible-theme-dark .hkm-devotional-text-serif { color: #cbd5e1 !important; }
                .bible-theme-dark .hkm-devotional-text-serif p { color: #cbd5e1 !important; }
                .bible-theme-dark .hkm-devotional-text-serif h2,
                .bible-theme-dark .hkm-devotional-text-serif h3,
                .bible-theme-dark .hkm-devotional-text-serif h4 { color: #f8fafc !important; }
                .bible-theme-dark .hkm-devotional-text-serif blockquote { color: #94a3b8 !important; background: rgba(255, 255, 255, 0.03) !important; border-left-color: #d17d39 !important; }
                .bible-theme-dark .hkm-devotional-prayer-box { background: #1e293b !important; color: #cbd5e1 !important; border-left-color: #d17d39 !important; }
                .bible-theme-dark .hkm-devotional-prayer-box div { color: #cbd5e1 !important; }
                .bible-theme-dark .hkm-devotional-reflection-textarea { background: #1e293b !important; border-color: #475569 !important; color: #f1f5f9 !important; }
                .bible-theme-dark .hkm-celebration-title { color: #f8fafc !important; }
                .bible-theme-dark .hkm-celebration-desc { color: #cbd5e1 !important; }
                .bible-theme-dark .hkm-yv-wrapper { background: #0f172a !important; }
                .bible-theme-dark .hkm-yv-header { background: #0f172a !important; border-bottom-color: #1e293b !important; }
                .bible-theme-dark .hkm-yv-header-btn-close { color: #cbd5e1 !important; }
                .bible-theme-dark .hkm-yv-header-btn-close:hover { background: #1e293b !important; }
                .bible-theme-dark .hkm-yv-header-text { color: #f8fafc !important; }
                .bible-theme-dark .hkm-yv-action-btn { color: #cbd5e1 !important; }
                .bible-theme-dark .hkm-yv-action-btn:hover { background: #1e293b !important; color: #f8fafc !important; }
                .bible-theme-dark .hkm-yv-action-btn.speaking { color: #d17d39 !important; background: rgba(209, 125, 57, 0.15) !important; }
                .bible-theme-dark .hkm-yv-body { background: #0f172a !important; }
                .bible-theme-dark .hkm-yv-footer { background: #0f172a !important; border-top-color: #1e293b !important; }
                .bible-theme-dark .hkm-yv-nav-circle-btn:not(.active) { background: #1e293b !important; color: #cbd5e1 !important; }
                .bible-theme-dark .hkm-yv-nav-circle-btn:hover { background: #334155 !important; color: #f8fafc !important; }
                .bible-theme-dark .hkm-yv-footer-pill { background: #1e293b !important; border-color: #334155 !important; color: #94a3b8 !important; }
                
                /* Cream Mode theme for Devotional Wizard */
                .bible-theme-cream .hkm-devotional-overlay { background: #ffffff !important; }
                .bible-theme-cream .hkm-devotional-content { background: #ffffff !important; }
                .bible-theme-cream .hkm-devotional-step-title { color: #1B4965 !important; }
                .bible-theme-cream .hkm-devotional-text-serif { color: #2d3748 !important; }
                .bible-theme-cream .hkm-devotional-text-serif p { color: #2d3748 !important; }
                .bible-theme-cream .hkm-devotional-text-serif h2,
                .bible-theme-cream .hkm-devotional-text-serif h3,
                .bible-theme-cream .hkm-devotional-text-serif h4 { color: #1B4965 !important; }
                .bible-theme-cream .hkm-devotional-text-serif blockquote { color: #4a5568 !important; background: rgba(27, 73, 101, 0.03) !important; border-left-color: #1B4965 !important; }
                .bible-theme-cream .hkm-devotional-prayer-box { background: #faf7f0 !important; color: #4a5568 !important; border-left-color: #d17d39 !important; }
                .bible-theme-cream .hkm-devotional-prayer-box div { color: #4a5568 !important; }
                .bible-theme-cream .hkm-devotional-reflection-textarea { background: #ffffff !important; border-color: #cbd5e1 !important; color: #2d3748 !important; }
                .bible-theme-cream .hkm-celebration-title { color: #1B4965 !important; }
                .bible-theme-cream .hkm-celebration-desc { color: #4a5568 !important; }
                .bible-theme-cream .hkm-yv-wrapper { background: #ffffff !important; }
                .bible-theme-cream .hkm-yv-header { background: #ffffff !important; border-bottom-color: #e2e8f0 !important; }
                .bible-theme-cream .hkm-yv-header-btn-close { color: #4a5568 !important; }
                .bible-theme-cream .hkm-yv-header-btn-close:hover { background: #f1f5f9 !important; }
                .bible-theme-cream .hkm-yv-header-text { color: #1B4965 !important; }
                .bible-theme-cream .hkm-yv-action-btn { color: #4a5568 !important; }
                .bible-theme-cream .hkm-yv-action-btn:hover { background: #f1f5f9 !important; color: #1B4965 !important; }
                .bible-theme-cream .hkm-yv-action-btn.speaking { color: #d17d39 !important; background: rgba(209, 125, 57, 0.1) !important; }
                .bible-theme-cream .hkm-yv-body { background: #ffffff !important; }
                .bible-theme-cream .hkm-yv-footer { background: #ffffff !important; border-top-color: #e2e8f0 !important; }
                .bible-theme-cream .hkm-yv-nav-circle-btn:not(.active) { background: #f1f5f9 !important; color: #4a5568 !important; }
                .bible-theme-cream .hkm-yv-nav-circle-btn:hover { background: #e2e8f0 !important; color: #1B4965 !important; }
                .bible-theme-cream .hkm-yv-footer-pill { background: #f8fafc !important; border-color: #e2e8f0 !important; color: #718096 !important; }
                /* Dark Mode theme for Reading Plan Dashboard */
                .bible-theme-dark .hkm-rp-title { color: #f8fafc !important; }
                .bible-theme-dark .hkm-rp-subtitle { color: #94a3b8 !important; }
                .bible-theme-dark .hkm-rp-card { background: #1e1e1e !important; border-color: #2d2d2d !important; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2) !important; }
                .bible-theme-dark .hkm-rp-progress-bar { background: #2d2d2d !important; }
                .bible-theme-dark .hkm-rp-day-item { color: #cbd5e1 !important; }
                .bible-theme-dark .hkm-rp-day-item:hover { background: #27272a !important; border-color: #3f3f46 !important; }
                .bible-theme-dark .hkm-rp-day-item.active { background: rgba(209, 125, 57, 0.15) !important; border-color: rgba(209, 125, 57, 0.3) !important; }
                .bible-theme-dark .hkm-rp-day-checkbox { border-color: #475569 !important; }

                /* Cream Mode theme for Reading Plan Dashboard */
                .bible-theme-cream .hkm-rp-title { color: #1B4965 !important; }
                .bible-theme-cream .hkm-rp-subtitle { color: #70675a !important; }
                .bible-theme-cream .hkm-rp-card { background: #ffffff !important; border-color: #e6dfd3 !important; box-shadow: 0 4px 12px rgba(44, 39, 32, 0.03) !important; }
                .bible-theme-cream .hkm-rp-progress-bar { background: #e6dfd3 !important; }
                .bible-theme-cream .hkm-rp-day-item { color: #2c2720 !important; }
                .bible-theme-cream .hkm-rp-day-item:hover { background: #f7f4ec !important; border-color: #ecdcb9 !important; }
                .bible-theme-cream .hkm-rp-day-item.active { background: rgba(209, 125, 57, 0.08) !important; border-color: rgba(209, 125, 57, 0.2) !important; }
                .bible-theme-cream .hkm-rp-day-checkbox { border-color: #d2c4a9 !important; }

                @keyframes hkmFadeIn {
                    from { opacity: 0; transform: translateY(8px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `;
            document.head.appendChild(style);
        }

        // Load active plan from Firestore if user is logged in
        const db = this.getFirestore();
        if (this.currentUser && db) {
            try {
                const snap = await db.collection('users')
                    .doc(this.currentUser.uid)
                    .collection('reading_plans')
                    .where('completed', '==', false)
                    .orderBy('lastActiveAt', 'desc')
                    .limit(1)
                    .get();

                if (!snap.empty) {
                    const userPlanDoc = snap.docs[0];
                    const userPlan = userPlanDoc.data();
                    
                    // Fetch matching global plan
                    const globalPlanSnap = await db.collection('reading_plans')
                        .doc(userPlan.planId)
                        .get();

                    if (globalPlanSnap.exists) {
                        const globalPlan = globalPlanSnap.data();
                        this.renderUserActivePlan(userPlan, globalPlan);
                        return;
                    }
                }
            } catch (err) {
                console.error("Error checking user reading plans:", err);
            }
        }

        // Fetch available global plans
        if (db) {
            try {
                const snap = await db.collection('reading_plans')
                    .orderBy('createdAt', 'desc')
                    .get();

                const plans = [];
                snap.forEach(d => plans.push({ id: d.id, ...d.data() }));

                const startedData = await this.getStartedPlansData();
                this.renderAvailablePlansList(plans, startedData.startedPlanIds, startedData.planProgressData);
            } catch (err) {
                console.error("Error fetching available plans:", err);
                container.innerHTML = `
                    <div style="padding: 20px; text-align: center; color: #ef4444;">
                        <span class="material-symbols-outlined" style="font-size: 32px;">error</span>
                        <p style="margin-top: 8px; font-weight: 600;">Kunne ikke hente leseplaner.</p>
                    </div>
                `;
            }
        } else {
            container.innerHTML = `
                <div style="padding: 20px; text-align: center; color: #64748b;">
                    <span class="material-symbols-outlined" style="font-size: 32px; margin-bottom: 8px;">cloud_off</span>
                    <p style="margin: 0;">Leseplaner er midlertidig utilgjengelig (frakoblet modus).</p>
                </div>
            `;
        }
    }

    renderUserActivePlan(userPlan, globalPlan) {
        const container = this.dom.readingPlanContent;
        if (!container) return;

        const currentDayNum = this.activePlanMode ? this.activePlanDay : (userPlan.currentDay || 1);
        const totalDays = globalPlan.durationDays || globalPlan.days.length;
        
        const currentDayConfig = globalPlan.days.find(d => d.dayNumber === currentDayNum) || globalPlan.days[0];
        
        const completedDaysCount = userPlan.completedDays ? userPlan.completedDays.length : 0;
        const progressPct = Math.round((completedDaysCount / totalDays) * 100);

        const startedAt = userPlan.startedAt;
        let expectedDay = currentDayNum;
        if (startedAt) {
            const startedAtDate = startedAt.toDate ? startedAt.toDate() : new Date(startedAt);
            const startMidnight = new Date(startedAtDate.getFullYear(), startedAtDate.getMonth(), startedAtDate.getDate());
            const todayMidnight = new Date();
            todayMidnight.setHours(0, 0, 0, 0);
            const diffDays = Math.max(0, Math.round((todayMidnight.getTime() - startMidnight.getTime()) / (1000 * 60 * 60 * 24)));
            expectedDay = Math.min(diffDays + 1, totalDays);
        }

        const t_activePlan = this.getTranslation('active_plan', 'Aktiv leseplan');
        const t_progress = this.getTranslation('progress', 'Fremgang');
        const t_day = this.getTranslation('day', 'Dag');
        const t_showVerses = this.getTranslation('show_verses', 'Vis dagens vers');
        const t_openDevotional = this.getTranslation('open_devotional', 'Åpne dagens andakt');
        const t_daysOutline = this.getTranslation('days_outline', 'Oversikt over dager');
        const t_syncDevotion = this.getTranslation('sync_devotion', 'Oppdater til dagens andakt');
        
        if (this.activePlanMode) {
            const isPrayerApp = globalPlan.title && (
                globalPlan.title.toLowerCase().includes('bønn') ||
                globalPlan.title.toLowerCase().includes('prayer') ||
                globalPlan.title.toLowerCase().includes('oración')
            );
            const daysTitle = isPrayerApp
                ? (lang === 'en' ? 'Prayer App: Days' : (lang === 'es' ? 'Aplicación de oración: Días' : 'Bønneapp: Dager'))
                : (lang === 'en' ? 'Reading Plan: Days' : (lang === 'es' ? 'Plan de lectura: Días' : 'Leseplan: Dager'));
            const switchPlanLabel = isPrayerApp 
                ? (lang === 'en' ? 'Switch app' : (lang === 'es' ? 'Cambiar aplicación' : 'Bytt bønneapp'))
                : (lang === 'en' ? 'Switch plan' : (lang === 'es' ? 'Cambiar plan' : 'Bytt plan'));

            // Render only checklist of days for clean 3rd column
            container.innerHTML = `
                <div style="padding: 16px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; border-bottom: 1px solid var(--border-color, #e2e8f0); padding-bottom: 8px;">
                        <span style="font-size: 13px; font-weight: 700; color: #1B4965; text-transform: uppercase; letter-spacing: 0.05em;">${daysTitle}</span>
                        <button class="hkm-btn-secondary" style="height: 26px !important; padding: 2px 10px !important; font-size: 11px !important; border-radius: 6px !important;" onclick="window.location.href='/leseplaner.html'">${switchPlanLabel}</button>
                    </div>
                    
                    <div style="display: flex; flex-direction: column;">
                        ${globalPlan.days.map(d => {
                            const isCompleted = userPlan.completedDays && userPlan.completedDays.includes(d.dayNumber);
                            const isActive = d.dayNumber === currentDayNum;
                            const subtitleText = isPrayerApp ? (d.prayerFocus || d.verses || '') : (d.verses || d.prayerFocus || '');
                            return `
                            <div class="hkm-rp-day-item ${isActive ? 'active' : ''}" onclick="window.bibleReader.selectReadingPlanDay(${d.dayNumber})">
                                <div style="flex: 1; min-width: 0; padding-right: 8px;">
                                    <div style="font-size: 12px; font-weight: 700; color: ${isActive ? '#bd4f2a' : '#475569'};">Dag ${d.dayNumber}</div>
                                    <div style="font-size: 13px; color: ${isActive ? '#d17d39' : '#0f172a'}; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${subtitleText}</div>
                                </div>
                                <div class="hkm-rp-day-checkbox ${isCompleted ? 'completed' : ''}">
                                    ${isCompleted ? '<span class="material-symbols-outlined">check</span>' : ''}
                                </div>
                            </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
            return;
        }

        // Default layout (if not in active workspace mode, e.g. normal Bible sidebar mode)
        container.innerHTML = `
            <div style="padding: 16px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                    <span style="font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em;">${t_activePlan}</span>
                    <button class="hkm-btn-secondary" style="height: 26px !important; padding: 2px 10px !important; font-size: 11px !important; border-radius: 6px !important;" onclick="window.bibleReader.showAvailablePlans()">Bytt plan</button>
                </div>
                <h3 class="hkm-rp-title">${globalPlan.title}</h3>
                <p class="hkm-rp-subtitle">${globalPlan.description || ''}</p>

                <!-- Progress -->
                <div style="margin-bottom: 24px;">
                    <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: 600; color: #475569;">
                        <span>${t_progress}</span>
                        <span>${progressPct}% (${completedDaysCount}/${totalDays})</span>
                    </div>
                    <div class="hkm-rp-progress-bar">
                        <div class="hkm-rp-progress-fill" style="width: ${progressPct}%;"></div>
                    </div>
                </div>

                <!-- Current Day Panel -->
                ${currentDayConfig ? `
                <div class="hkm-rp-card" style="border-left: 4px solid #d17d39;">
                    <div style="font-size: 12px; font-weight: 700; color: #d17d39; text-transform: uppercase; margin-bottom: 4px;">
                        ${t_day} ${currentDayNum}
                    </div>
                    <div style="font-size: 15px; font-weight: 600; color: #0f172a; margin-bottom: 12px;">
                        ${currentDayConfig.verses}
                    </div>
                    
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        <button class="hkm-btn-primary" onclick="window.bibleReader.showDayVerses('${currentDayConfig.verses.replace(/'/g, "\\'")}')">
                            <span class="material-symbols-outlined" style="font-size: 18px;">menu_book</span>
                            ${t_showVerses}
                        </button>
                        <button class="hkm-btn-secondary" onclick="window.bibleReader.openDevotionalWizard('${globalPlan.id}', ${currentDayNum})">
                            <span class="material-symbols-outlined" style="font-size: 18px;">auto_stories</span>
                            ${t_openDevotional}
                        </button>
                        ${currentDayNum < expectedDay ? `
                        <button class="hkm-btn-secondary" style="border: 1px dashed #d17d39; color: #d17d39; margin-top: 4px; display: flex; align-items: center; justify-content: center; gap: 8px;" onclick="window.bibleReader.syncToExpectedDay('${globalPlan.id}', ${expectedDay})">
                            <span class="material-symbols-outlined" style="font-size: 18px;">sync</span>
                            ${t_syncDevotion} (Dag ${expectedDay})
                        </button>
                        ` : ''}
                    </div>
                </div>
                ` : ''}

                <!-- Days Outline List -->
                <h4 style="font-size: 13px; font-weight: 700; color: #475569; margin: 24px 0 12px 0;">${t_daysOutline}</h4>
                <div style="display: flex; flex-direction: column;">
                    ${globalPlan.days.map(d => {
                        const isCompleted = userPlan.completedDays && userPlan.completedDays.includes(d.dayNumber);
                        const isActive = d.dayNumber === currentDayNum;
                        return `
                        <div class="hkm-rp-day-item ${isActive ? 'active' : ''}" onclick="window.bibleReader.showDayVerses('${d.verses.replace(/'/g, "\\'")}')">
                            <div>
                                <div style="font-size: 12px; font-weight: 700; color: #475569;">${t_day} ${d.dayNumber}</div>
                                <div style="font-size: 13px; color: #0f172a; font-weight: 500;">${d.verses}</div>
                            </div>
                            <div class="hkm-rp-day-checkbox ${isCompleted ? 'completed' : ''}">
                                ${isCompleted ? '<span class="material-symbols-outlined">check</span>' : ''}
                            </div>
                        </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }

    selectReadingPlanDay(dayNumber) {
        this.activePlanDay = dayNumber;
        this.updateUrlParams();
        this.setupReadingPlanUI(true);
    }

    async syncToExpectedDay(planId, expectedDay) {
        const db = this.getFirestore();
        if (this.currentUser && db) {
            try {
                // Update Firestore
                await db.collection('users')
                    .doc(this.currentUser.uid)
                    .collection('reading_plans')
                    .doc(planId)
                    .update({
                        currentDay: expectedDay,
                        lastActiveAt: firebase.firestore.FieldValue.serverTimestamp()
                    });

                // Update Local progress object
                if (this.userPlanProgress && this.userPlanProgress.planId === planId) {
                    this.userPlanProgress.currentDay = expectedDay;
                }
                
                // Update localStorage cache
                const pwaKey = `hkm_reading_plan_progress_${planId}`;
                try {
                    const pwaData = this.safeGetLocalStorage(pwaKey);
                    let parsed = pwaData ? JSON.parse(pwaData) : null;
                    if (!parsed) {
                        parsed = {
                            planId: planId,
                            currentDay: expectedDay,
                            completedDays: this.userPlanProgress?.completedDays || [],
                            reflections: {}
                        };
                    } else {
                        parsed.currentDay = expectedDay;
                    }
                    this.safeSetLocalStorage(pwaKey, JSON.stringify(parsed));
                } catch (localErr) {
                    console.warn("Failed to update PWA progress localstorage:", localErr);
                }

                // Switch and render
                this.activePlanDay = expectedDay;
                this.updateUrlParams();
                this.setupReadingPlanUI(true);
            } catch (err) {
                console.error("Failed to sync reading plan day:", err);
            }
        }
    }

    async shiftPlanDates(planId, currentDay) {
        const db = this.getFirestore();
        if (this.currentUser && db) {
            try {
                const today = new Date();
                const daysToSubtract = currentDay - 1;
                const newStartedAt = new Date(today.getFullYear(), today.getMonth(), today.getDate() - daysToSubtract, 12, 0, 0);

                // Update Firestore
                await db.collection('users')
                    .doc(this.currentUser.uid)
                    .collection('reading_plans')
                    .doc(planId)
                    .update({
                        currentDay: currentDay,
                        startedAt: firebase.firestore.Timestamp.fromDate(newStartedAt),
                        lastActiveAt: firebase.firestore.FieldValue.serverTimestamp()
                    });

                // Update Local progress object
                if (this.userPlanProgress && this.userPlanProgress.planId === planId) {
                    this.userPlanProgress.currentDay = currentDay;
                    this.userPlanProgress.startedAt = newStartedAt;
                }

                // Refresh UI
                this.setupReadingPlanUI(true);
            } catch (err) {
                console.error("Failed to shift plan dates:", err);
            }
        }
    }

    async jumpToToday(planId, expectedDay) {
        await this.syncToExpectedDay(planId, expectedDay);
    }

    openAdjustPlanDatesModal(planId, currentDay) {
        const lang = document.documentElement.lang || 'no';
        const t_title = {
            no: 'Tilpass leseplanen',
            en: 'Adjust Reading Plan',
            es: 'Ajustar Plan de Lectura'
        }[lang] || 'Tilpass leseplanen';
        
        const t_desc = {
            no: `Vil du forskyve leseplanens kalender? Dette setter <strong>Dag ${currentDay}</strong> til å være i dag. Planens tidsplan justeres fremover slik at du blir "i rute", uten at du mister fremdriften din.`,
            en: `Do you want to shift the reading plan's calendar? This sets <strong>Day ${currentDay}</strong> to today. The plan schedule will be adjusted forward so you are on track, without losing your progress.`,
            es: `¿Quieres ajustar el calendario del plan? Esto establece el <strong>Día ${currentDay}</strong> como hoy. El calendario del plan se ajustará hacia adelante para que estés al día, sin perder tu progreso.`
        }[lang] || `Vil du forskyve leseplanens kalender? Dette setter <strong>Dag ${currentDay}</strong> til å være i dag. Planens tidsplan justeres fremover slik at du blir "i rute", uten at du mister fremdriften din.`;

        const t_cancel = { no: 'Avbryt', en: 'Cancel', es: 'Cancelar' }[lang] || 'Avbryt';
        const t_adjust = { no: 'Juster datoer', en: 'Adjust dates', es: 'Ajustar fechas' }[lang] || 'Juster datoer';

        const modal = document.createElement('div');
        modal.className = 'modal modal-open';
        modal.style.cssText = 'position:fixed; inset:0; background:rgba(15,23,42,0.4); display:flex; align-items:center; justify-content:center; z-index:9999; padding:16px;';
        
        modal.innerHTML = `
            <div style="background:#ffffff; border-radius:20px; max-width:450px; width:100%; padding:24px; box-shadow:0 10px 25px rgba(0,0,0,0.1); border:1px solid #e2e8f0; text-align:left;">
                <div style="display:flex; align-items:center; gap:12px; margin-bottom:16px;">
                    <div style="background:#fffbeb; border-radius:50%; width:40px; height:40px; display:flex; align-items:center; justify-content:center;">
                        <span class="material-symbols-outlined" style="color:#d97706; font-size:24px;">restore</span>
                    </div>
                    <h3 style="font-size:18px; font-weight:700; color:#1b4965; margin:0;">${t_title}</h3>
                </div>
                <p style="font-size:14px; color:#475569; line-height:1.5; margin:0 0 20px 0;">
                    ${t_desc}
                </p>
                <div style="display:flex; justify-content:flex-end; gap:12px;">
                    <button class="hkm-btn-secondary" onclick="this.closest('.modal').remove()" style="height:36px !important; padding:0 16px !important; font-size:13px !important; border-radius:8px !important; margin: 0 !important;">${t_cancel}</button>
                    <button class="hkm-btn-primary" onclick="window.bibleReader.shiftPlanDates('${planId}', ${currentDay}); this.closest('.modal').remove()" style="background:#d97706 !important; border-color:#d97706 !important; color:#ffffff !important; height:36px !important; padding:0 16px !important; font-size:13px !important; border-radius:8px !important; margin: 0 !important;">${t_adjust}</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    async getStartedPlanIds() {
        const startedPlanIds = new Set();
        const db = this.getFirestore();
        if (this.currentUser && db) {
            try {
                const snap = await db.collection('users')
                    .doc(this.currentUser.uid)
                    .collection('reading_plans')
                    .get();
                snap.forEach(doc => {
                    startedPlanIds.add(doc.id);
                });
            } catch (err) {
                console.warn("[BibleReader] Failed to get started plans from Firestore:", err);
            }
        }
        
        // Check localStorage for guest progress
        let localKeys = [];
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (k) localKeys.push(k);
            }
        } catch (e) {
            console.warn("[BibleReader] Failed to list localStorage keys:", e);
        }
        for (const key of localKeys) {
            if (key && key.startsWith('hkm_reading_plan_progress_')) {
                const planId = key.substring('hkm_reading_plan_progress_'.length);
                startedPlanIds.add(planId);
            }
        }
        return startedPlanIds;
    }

    async getStartedPlansData() {
        const startedPlanIds = new Set();
        const planProgressData = new Map();
        const db = this.getFirestore();
        if (this.currentUser && db) {
            try {
                const snap = await db.collection('users')
                    .doc(this.currentUser.uid)
                    .collection('reading_plans')
                    .get();
                snap.forEach(doc => {
                    const data = doc.data();
                    const completedDays = data.completedDays || [];
                    startedPlanIds.add(doc.id);
                    planProgressData.set(doc.id, {
                        completedDaysCount: completedDays.length
                    });
                });
            } catch (err) {
                console.warn("[BibleReader] Failed to get started plans from Firestore:", err);
            }
        }
        
        // Check localStorage for guest progress
        let localKeys = [];
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (k) localKeys.push(k);
            }
        } catch (e) {
            console.warn("[BibleReader] Failed to list localStorage keys:", e);
        }
        for (const key of localKeys) {
            if (key && key.startsWith('hkm_reading_plan_progress_')) {
                const planId = key.substring('hkm_reading_plan_progress_'.length);
                startedPlanIds.add(planId);
                
                try {
                    const progressStr = localStorage.getItem(key);
                    if (progressStr) {
                        const progressObj = JSON.parse(progressStr);
                        const completedDays = progressObj.completedDays || [];
                        planProgressData.set(planId, {
                            completedDaysCount: completedDays.length
                        });
                    }
                } catch (e) {
                    console.warn("[BibleReader] Failed to parse guest progress:", e);
                }
            }
        }
        return { startedPlanIds, planProgressData };
    }

    renderAvailablePlansList(plans, startedPlanIds = new Set(), startedProgress = new Map()) {
        const container = this.dom.readingPlanContent;
        if (!container) return;

        // Sort plans: started plans first
        plans.sort((a, b) => {
            const aStarted = startedPlanIds.has(a.id);
            const bStarted = startedPlanIds.has(b.id);
            if (aStarted && !bStarted) return -1;
            if (!aStarted && bStarted) return 1;
            return 0;
        });

        const t_browsePlans = this.getTranslation('all_plans', 'Leseplaner');
        const t_startPlan = this.getTranslation('start_plan_btn', 'Start leseplan');
        const t_logInToSave = this.getTranslation('log_in_to_save', 'Logg inn på Min Side for å lagre din fremgang.');
        const t_loginBtn = this.getTranslation('login_btn', 'Logg inn');

        let loginNotice = '';
         if (!this.currentUser) {
             loginNotice = `
                 <div style="background: var(--highlight-bg); border: 1px solid var(--border-color); border-radius: 12px; padding: 12px; margin-bottom: 20px; font-size: 13px; color: var(--text-muted); line-height: 1.4;">
                     <p style="margin-bottom: 8px;">${t_logInToSave}</p>
                     <a href="/minside/login.html" class="hkm-btn-primary" style="height: 30px !important; padding: 0 12px !important; font-size: 12px !important; border-radius: 6px !important;">${t_loginBtn}</a>
                 </div>
             `;
         }

        if (plans.length === 0) {
            container.innerHTML = `
                <div style="padding: 16px;">
                    ${loginNotice}
                    <div style="text-align: center; padding: 40px 20px; color: var(--text-muted);">
                        <span class="material-symbols-outlined" style="font-size: 32px; margin-bottom: 8px;">auto_stories</span>
                        <p style="font-size: 14px;">Ingen leseplaner er opprettet ennå.</p>
                    </div>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div style="padding: 16px;">
                ${loginNotice}
                <h3 style="font-size: 15px; font-weight: 700; color: var(--text-base); margin-bottom: 16px;">${t_browsePlans}</h3>
                
                <div style="display: flex; flex-direction: column; gap: 16px;">
                    ${plans.map(p => {
                        const totalDays = p.durationDays || p.days.length;
                        const isStarted = startedPlanIds.has(p.id);
                        const progressInfo = startedProgress.get(p.id);
                        const completedCount = progressInfo ? progressInfo.completedDaysCount : 0;
                        const progressPct = isStarted ? Math.round((completedCount / totalDays) * 100) : 0;
                        const t_startPlanText = isStarted 
                            ? this.getTranslation('continue_plan_btn', 'Fortsett leseplan')
                            : t_startPlan;
                        
                        return `
                        <div class="hkm-rp-card" id="plan-card-${p.id}" style="${isStarted ? 'border: 2px solid #d17d39 !important; box-shadow: 0 4px 12px rgba(209, 125, 57, 0.08); position: relative;' : ''}">
                            ${isStarted ? `
                            <div style="position: absolute; top: -10px; right: 16px; background: linear-gradient(135deg, #d17d39 0%, #bd4f2a 100%); color: #ffffff; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 4px; text-transform: uppercase; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
                                Påbegynt
                            </div>
                            ` : ''}
                            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                                <h4 style="font-size: 14px; font-weight: 700; color: var(--text-base); margin: 0; flex-grow: 1;">${p.title}</h4>
                                <span style="font-size: 11px; font-weight: 700; background: rgba(209, 125, 57, 0.1); color: #d17d39; padding: 4px 10px; border-radius: 20px; white-space: nowrap; flex-shrink: 0; margin-left: 8px;">${totalDays} ${this.getTranslation('days', 'dager')}</span>
                            </div>
                            <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 12px; line-height: 1.4;">${p.description || ''}</p>
                            
                            ${isStarted ? `
                            <div style="margin-bottom: 12px;">
                                <div style="display: flex; justify-content: space-between; font-size: 11px; font-weight: 700; color: #475569; margin-bottom: 4px;">
                                    <span>Fremgang</span>
                                    <span>${progressPct}% (${completedCount}/${totalDays} dager)</span>
                                </div>
                                <div class="hkm-rp-progress-bar" style="margin: 4px 0 8px 0; height: 5px;">
                                    <div class="hkm-rp-progress-fill" style="width: ${progressPct}%;"></div>
                                </div>
                            </div>
                            ` : ''}

                            <div style="display: flex; flex-direction: column; gap: 8px;">
                                <button class="hkm-btn-secondary" style="height: 32px !important; padding: 0 12px !important; font-size: 12px !important; border-radius: 6px !important;" onclick="window.bibleReader.togglePlanPreview('${p.id}')">
                                    Vis dager
                                </button>
                                ${isStarted ? `
                                <button class="hkm-btn-primary" style="height: 32px !important; padding: 0 12px !important; font-size: 12px !important; border-radius: 6px !important;" onclick="window.location.href = window.location.pathname + '?plan=${p.id}'">
                                    ${t_startPlanText}
                                </button>
                                ` : (this.currentUser ? `
                                <button class="hkm-btn-primary" style="height: 32px !important; padding: 0 12px !important; font-size: 12px !important; border-radius: 6px !important;" onclick="window.bibleReader.enrollInPlan('${p.id}')">
                                    ${t_startPlanText}
                                </button>
                                ` : `
                                <button class="hkm-btn-primary" style="height: 32px !important; padding: 0 12px !important; font-size: 12px !important; border-radius: 6px !important;" onclick="window.location.href = window.location.pathname + '?plan=${p.id}'">
                                    ${t_startPlanText}
                                </button>
                                `)}
                            </div>
                            
                            <!-- Plan Preview Days -->
                            <div id="plan-preview-${p.id}" style="display: none; margin-top: 16px; border-top: 1px solid var(--border-color); padding-top: 12px; max-height: 200px; overflow-y: auto;">
                                ${p.days.map(d => `
                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; font-size: 12px; cursor: pointer;" onclick="window.bibleReader.showDayVerses('${d.verses.replace(/'/g, "\\'")}')">
                                    <span style="font-weight: 600; color: var(--text-base);">Dag ${d.dayNumber}:</span>
                                    <span style="color: #d17d39; text-decoration: underline;">${d.verses}</span>
                                </div>
                                `).join('')}
                            </div>
                        </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }

    togglePlanPreview(planId) {
        const preview = document.getElementById(`plan-preview-${planId}`);
        if (preview) {
            preview.style.display = preview.style.display === 'none' ? 'block' : 'none';
        }
    }

    async showAvailablePlans() {
        const container = this.dom.readingPlanContent;
        if (!container) return;
        
        container.innerHTML = `
            <div style="text-align: center; padding: 40px 20px; color: var(--text-muted);">
                <div class="spinner" style="margin: 0 auto 12px; width: 24px; height: 24px;"></div>
                <p style="font-size: 13px;">${this.getTranslation('loading_plan', 'Laster leseplan...')}</p>
            </div>
        `;
        
        const db = this.getFirestore();
        if (!db) {
            container.innerHTML = `
                <div style="padding: 20px; text-align: center; color: #64748b;">
                    <span class="material-symbols-outlined" style="font-size: 32px; margin-bottom: 8px;">cloud_off</span>
                    <p style="margin: 0;">Leseplaner er midlertidig utilgjengelig (frakoblet modus).</p>
                </div>
            `;
            return;
        }

        try {
            const snap = await db.collection('reading_plans')
                .orderBy('createdAt', 'desc')
                .get();

            const plans = [];
            snap.forEach(d => plans.push({ id: d.id, ...d.data() }));

            const startedData = await this.getStartedPlansData();
            this.renderAvailablePlansList(plans, startedData.startedPlanIds, startedData.planProgressData);
        } catch (err) {
            console.error("Error loading plans:", err);
        }
    }

    async enrollInPlan(planId) {
        if (!this.currentUser) return;
        
        const loader = document.getElementById(`plan-card-${planId}`);
        if (loader) {
            loader.style.opacity = '0.5';
            loader.style.pointerEvents = 'none';
        }
        
        const db = this.getFirestore();
        if (!db) {
            alert("Database utilgjengelig. Prøv igjen senere.");
            return;
        }

        try {
            const ref = db.collection('users')
                .doc(this.currentUser.uid)
                .collection('reading_plans')
                .doc(planId);
                
            await ref.set({
                planId: planId,
                currentDay: 1,
                completedDays: [],
                startedAt: this.getServerTimestamp(),
                lastActiveAt: this.getServerTimestamp(),
                completed: false,
                reflections: {}
            }, { merge: true });
            
            window.location.href = window.location.pathname + '?plan=' + planId;
        } catch (err) {
            console.error("Enrollment failed:", err);
            alert("Feil under påmelding: " + err.message);
            if (loader) {
                loader.style.opacity = '1';
                loader.style.pointerEvents = 'auto';
            }
        }
    }
    async showDayVerses(verses, keepSidebarOpen = false) {
        if (!verses) return;
        await this.parseAndNavigateToReference(verses);
        if (window.innerWidth <= 1024) {
            const sidebar = document.getElementById('bible-sidebar');
            if (sidebar) {
                if (keepSidebarOpen) {
                    sidebar.classList.add('active');
                } else {
                    sidebar.classList.remove('active');
                }
            }
            const navRight = document.getElementById('bible-nav-right');
            if (navRight) navRight.classList.remove('active');
        }
    }

    async initReadingPlanMode(planId, dayNumFromUrl) {
        if (this._isInitializingPlan) {
            console.log("[BibleReader] Already initializing plan mode for", planId);
            return;
        }
        this._isInitializingPlan = true;
        this.activePlanMode = true;
        this.activePlanId = planId;
        this.activePlanDay = parseInt(dayNumFromUrl, 10) || this.activePlanDay || null;
        
        // Force running text layout (paragraph) for reading plans / prayer apps
        this.settings.layout = 'paragraph';
        this.applySettings();
        
        // Inject styles dynamically
        this.injectReadingPlanStyles();

        const db = await this.getFirestoreAsync(10000);
        if (!db) {
            console.warn("[BibleReader] Firestore is not available, unable to load plan in detail.");
            return;
        }

        try {
            // Fetch global plan data
            let rawPlan = null;
            try {
                const planDoc = await db.collection('reading_plans').doc(planId).get();
                if (planDoc.exists) {
                    rawPlan = { id: planDoc.id, ...planDoc.data() };
                }
            } catch (docErr) {
                console.warn("[BibleReader] Direct planDoc fetch error:", docErr);
            }

            if (!rawPlan) {
                // Fallback search by slug, case-insensitive ID or title match
                try {
                    const snap = await db.collection('reading_plans').get();
                    const target = planId.toLowerCase().trim();
                    snap.forEach(d => {
                        const data = d.data();
                        if (d.id.toLowerCase() === target || (data.slug && data.slug.toLowerCase() === target) || (data.title && data.title.toLowerCase().includes(target))) {
                            rawPlan = { id: d.id, ...data };
                        }
                    });
                } catch (snapErr) {
                    console.warn("[BibleReader] Fallback plan search failed:", snapErr);
                }
            }

            if (!rawPlan) {
                console.error("[BibleReader] Plan does not exist:", planId);
                return;
            }

            if (window.contentManager && typeof window.contentManager.getLocalizedContentItem === 'function') {
                this.activePlanData = window.contentManager.getLocalizedContentItem(rawPlan);
            } else {
                this.activePlanData = rawPlan;
            }
            this.activePlanId = this.activePlanData.id;

            // Determine active day
            let activeDayNum = this.activePlanDay;
            
            // Check user progress if logged in
            if (this.currentUser) {
                const userPlanDoc = await db.collection('users')
                    .doc(this.currentUser.uid)
                    .collection('reading_plans')
                    .doc(planId)
                    .get();

                if (userPlanDoc.exists) {
                    this.userPlanProgress = userPlanDoc.data();
                    
                    // Merge local guest progress if exists
                    const localProgress = this.safeGetLocalStorage('hkm_reading_plan_progress_' + planId);
                    if (localProgress) {
                        try {
                            const localData = JSON.parse(localProgress);
                            let needsUpdate = false;
                            
                            if (localData.completedDays && Array.isArray(localData.completedDays)) {
                                this.userPlanProgress.completedDays = this.userPlanProgress.completedDays || [];
                                for (const day of localData.completedDays) {
                                    if (!this.userPlanProgress.completedDays.includes(day)) {
                                        this.userPlanProgress.completedDays.push(day);
                                        needsUpdate = true;
                                    }
                                }
                            }
                            
                            if (localData.reflections && typeof localData.reflections === 'object') {
                                this.userPlanProgress.reflections = this.userPlanProgress.reflections || {};
                                for (const day of Object.keys(localData.reflections)) {
                                    if (!this.userPlanProgress.reflections[day]) {
                                        this.userPlanProgress.reflections[day] = localData.reflections[day];
                                        needsUpdate = true;
                                    }
                                }
                            }
                            
                            if (localData.currentDay > (this.userPlanProgress.currentDay || 1)) {
                                this.userPlanProgress.currentDay = localData.currentDay;
                                needsUpdate = true;
                            }
                            
                            if (needsUpdate) {
                                console.log("[BibleReader] Merging local guest progress into Firestore:", this.userPlanProgress);
                                await db.collection('users')
                                    .doc(this.currentUser.uid)
                                    .collection('reading_plans')
                                    .doc(planId)
                                    .set(this.userPlanProgress, { merge: true });
                            }
                            this.safeRemoveLocalStorage('hkm_reading_plan_progress_' + planId);
                        } catch (err) {
                            console.warn("[BibleReader] Failed to merge local progress:", err);
                        }
                    }

                    if (!activeDayNum) {
                        activeDayNum = this.userPlanProgress.currentDay || 1;
                    }
                } else {
                    // Migrate local progress if it exists
                    const localProgress = this.safeGetLocalStorage('hkm_reading_plan_progress_' + planId);
                    if (localProgress) {
                        try {
                            this.userPlanProgress = JSON.parse(localProgress);
                            console.log("[BibleReader] Migrating local guest progress to Firestore:", this.userPlanProgress);
                            await db.collection('users')
                                .doc(this.currentUser.uid)
                                .collection('reading_plans')
                                .doc(planId)
                                .set(this.userPlanProgress, { merge: true });
                            this.safeRemoveLocalStorage('hkm_reading_plan_progress_' + planId);
                        } catch (err) {
                            console.warn("[BibleReader] Failed to migrate local progress:", err);
                        }
                    }
                    
                    if (!this.userPlanProgress) {
                        this.userPlanProgress = {
                            planId: planId,
                            currentDay: 1,
                            completedDays: [],
                            reflections: {}
                        };
                    }
                    if (!activeDayNum) activeDayNum = this.userPlanProgress.currentDay || 1;
                }
            } else {
                // Guest progress from localStorage
                const localProgress = this.safeGetLocalStorage('hkm_reading_plan_progress_' + planId);
                if (localProgress) {
                    try {
                        this.userPlanProgress = JSON.parse(localProgress);
                    } catch (e) {
                        console.warn("[BibleReader] Failed to parse guest progress:", e);
                    }
                } else {
                    this.userPlanProgress = {
                        planId: planId,
                        currentDay: 1,
                        completedDays: [],
                        reflections: {}
                    };
                }
                if (!activeDayNum) {
                    activeDayNum = this.userPlanProgress.currentDay || 1;
                }
            }
            this.activePlanDay = activeDayNum;
            
            // Render reading plan UI
            await this.setupReadingPlanUI(true);
            this.updateUrlParams();
            // Auto-open devotional wizard on mobile
            if (window.innerWidth <= 1024) {
                await this.openDevotionalWizard(this.activePlanId, this.activePlanDay);
            }
        } catch (e) {
            console.error("[BibleReader] Error in initReadingPlanMode:", e);
        } finally {
            this._isInitializingPlan = false;
            document.documentElement.classList.remove('hkm-rp-loading');
            const placeholder = document.getElementById('reading-plan-loading-placeholder');
            if (placeholder) placeholder.style.display = 'none';
            // Reveal UI now that the reading plan loading attempt is complete
            if (typeof window.revealPublicUI === 'function') {
                window.revealPublicUI('bible-reader-ready');
            } else {
                document.body.classList.remove('cms-loading');
            }
        }
    }

    injectReadingPlanStyles() {
        let style = document.getElementById('hkm-rp-workspace-styles');
        if (!style) {
            style = document.createElement('style');
            style.id = 'hkm-rp-workspace-styles';
            document.head.appendChild(style);
        }
        style.innerHTML = `
            /* Hide page footer when reading plan is active or book intro overlay is open to prevent page scrolling */
            body:has(#bible-sidebar.reading-plan-active) footer.footer,
            body:has(.hkm-book-intro-overlay) footer.footer,
            body:has(.hkm-modal-overlay) footer.footer,
            body:has(.verse-crossref-sheet-overlay.active) footer.footer {
                display: none !important;
            }

            @keyframes slideUpSheet {
                from {
                    transform: translateY(100%);
                    opacity: 0;
                }
                to {
                    transform: translateY(0);
                    opacity: 1;
                }
            }

            @keyframes modalScaleIn {
                from {
                    transform: scale(0.94);
                    opacity: 0;
                }
                to {
                    transform: scale(1);
                    opacity: 1;
                }
            }

            .hkm-modal-overlay,
            .verse-crossref-sheet-overlay,
            .color-wheel-modal-overlay,
            #verse-crossref-modal,
            #hkm-book-intro-modal {
                background: rgba(15, 23, 42, 0.55) !important;
                backdrop-filter: blur(6px) !important;
                -webkit-backdrop-filter: blur(6px) !important;
                display: flex !important;
                align-items: flex-end !important;
                justify-content: center !important;
                padding: 0 !important;
                margin: 0 !important;
                z-index: 35000 !important;
            }

            @media (max-width: 768px) {
                .hkm-modal-overlay,
                .verse-crossref-sheet-overlay,
                .color-wheel-modal-overlay,
                #verse-crossref-modal,
                #hkm-book-intro-modal {
                    align-items: flex-end !important;
                    justify-content: center !important;
                    padding: 0 !important;
                }
                .hkm-book-intro-sheet-card,
                .verse-crossref-sheet-card,
                .translation-modal-card,
                .color-wheel-card {
                    border-radius: 28px 28px 0 0 !important;
                    padding-top: 16px !important;
                    padding-bottom: max(20px, env(safe-area-inset-bottom)) !important;
                    max-height: 85vh !important;
                    max-height: 85dvh !important;
                    width: 100% !important;
                    max-width: 100% !important;
                    margin: 0 !important;
                    margin-top: auto !important;
                    margin-bottom: 0 !important;
                    box-shadow: 0 -12px 48px rgba(0, 0, 0, 0.25) !important;
                    border-bottom: none !important;
                    animation: slideUpSheet 0.28s cubic-bezier(0.16, 1, 0.3, 1) !important;
                }
            }

            @media (min-width: 769px) {
                .hkm-modal-overlay,
                .verse-crossref-sheet-overlay,
                .color-wheel-modal-overlay,
                #verse-crossref-modal,
                #hkm-book-intro-modal {
                    align-items: flex-end !important;
                    justify-content: center !important;
                    padding: 0 !important;
                }
                .hkm-book-intro-sheet-card,
                .verse-crossref-sheet-card,
                .translation-modal-card {
                    border-radius: 24px 24px 0 0 !important;
                    padding: 20px 24px !important;
                    padding-bottom: max(24px, env(safe-area-inset-bottom)) !important;
                    width: 100% !important;
                    max-width: 580px !important;
                    max-height: 82vh !important;
                    max-height: 82dvh !important;
                    margin: 0 auto !important;
                    margin-top: auto !important;
                    margin-bottom: 0 !important;
                    box-shadow: 0 -16px 48px rgba(0, 0, 0, 0.35) !important;
                    border: 1px solid var(--border-color, rgba(0, 0, 0, 0.12)) !important;
                    border-bottom: none !important;
                    animation: slideUpSheet 0.28s cubic-bezier(0.16, 1, 0.3, 1) !important;
                }
                .color-wheel-card {
                    border-radius: 24px 24px 0 0 !important;
                    width: 100% !important;
                    max-width: 360px !important;
                    margin: 0 auto !important;
                    margin-top: auto !important;
                    margin-bottom: 0 !important;
                    box-shadow: 0 -16px 48px rgba(0, 0, 0, 0.35) !important;
                    border: 1px solid var(--border-color, rgba(0, 0, 0, 0.12)) !important;
                    border-bottom: none !important;
                    animation: slideUpSheet 0.28s cubic-bezier(0.16, 1, 0.3, 1) !important;
                }
                .sheet-handle-bar {
                    display: block !important;
                }
            }

            /* Desktop/Tablet landscape: Full screen reading plan */
            @media (min-width: 1025px) {
                #bible-sidebar.reading-plan-active {
                    width: 100% !important;
                    max-width: 100% !important;
                    left: 0 !important;
                    position: relative !important;
                    flex: 1 !important;
                    border-right: none !important;
                }
                #bible-sidebar.reading-plan-active + .bible-reading-area {
                    display: none !important;
                }
                #bible-sidebar.reading-plan-active ~ #bible-nav-right {
                    display: none !important;
                }
                .hkm-rp-sidebar-title {
                    max-width: 600px !important;
                }
            }

            /* Mobile/Tablet portrait: Full screen reading plan when active drawer is open */
            @media (max-width: 1024px) {
                .hkm-rp-sidebar-title {
                    max-width: 220px !important;
                }
                #bible-sidebar {
                    position: fixed !important;
                    top: 0 !important;
                    left: -100% !important;
                    width: 100% !important;
                    height: 100% !important;
                    height: 100dvh !important;
                    z-index: 999999 !important;
                    transition: left 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
                }
                #bible-sidebar.active {
                    left: 0 !important;
                }
                #bible-sidebar.reading-plan-active {
                    left: -100% !important;
                }
                #bible-sidebar.reading-plan-active.active {
                    left: 0 !important;
                }
                #bible-sidebar.reading-plan-active.active + .bible-reading-area {
                    display: none !important;
                }
                .reading-plan-active #sidebar-mobile-controls {
                    display: none !important;
                }
            }
            .hkm-rp-day-strip-v3 {
                display: flex !important;
                gap: 10px !important;
                overflow-x: auto !important;
                padding: 4px 4px 16px 4px !important;
                margin-bottom: 24px !important;
                scroll-behavior: smooth !important;
                -webkit-overflow-scrolling: touch !important;
                scrollbar-width: none !important;
            }
            .hkm-rp-day-strip-v3::-webkit-scrollbar {
                display: none !important;
            }
            .hkm-rp-day-strip-bubble-v3 {
                display: flex !important;
                flex-direction: column !important;
                align-items: center !important;
                justify-content: center !important;
                width: 64px !important;
                height: 64px !important;
                min-width: 64px !important;
                border-radius: 14px !important;
                background: var(--bg-card) !important;
                border: 1px solid var(--border-color) !important;
                position: relative !important;
                cursor: pointer !important;
                transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important;
                padding: 0 !important;
                outline: none !important;
            }
            .hkm-rp-day-strip-bubble-v3 .day-num {
                font-size: 16px !important;
                font-weight: 800 !important;
                color: var(--text-base) !important;
                line-height: 1.1 !important;
            }
            .hkm-rp-day-strip-bubble-v3 .day-date {
                font-size: 9px !important;
                font-weight: 700 !important;
                color: var(--text-muted) !important;
                margin-top: 4px !important;
                text-transform: uppercase !important;
            }
            .hkm-rp-day-strip-bubble-v3.active {
                background: var(--bg-card) !important;
                border: 2.5px solid #1B4965 !important;
                box-shadow: none !important;
            }
            .hkm-rp-day-strip-bubble-v3.active .day-num {
                color: #1B4965 !important;
            }

            .hkm-rp-day-strip-bubble-v3.completed {
                background: #f1f5f9 !important;
                border-color: transparent !important;
            }
            .bible-theme-dark .hkm-rp-day-strip-bubble-v3.completed {
                background: #27272a !important;
                border-color: transparent !important;
            }
            .hkm-rp-day-strip-bubble-v3 .check-badge {
                display: none !important;
            }
            
            .hkm-rp-checklist-item {
                transition: background-color 0.2s !important;
            }
            .hkm-rp-start-btn-black {
                transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important;
            }
            .hkm-rp-start-btn-black:hover {
                background: #1e293b !important;
                transform: translateY(-1px) !important;
            }
            .hkm-rp-start-btn-black:active {
                transform: scale(0.98) !important;
            }
            .hkm-rp-close-btn-mobile {
                display: none !important;
                background: none !important;
                border: none !important;
                padding: 8px !important;
                cursor: pointer !important;
                color: var(--text-base) !important;
                align-items: center !important;
                justify-content: center !important;
                border-radius: 50% !important;
                width: 36px !important;
                height: 36px !important;
                box-sizing: border-box !important;
                transition: all 0.2s ease !important;
            }
            .hkm-rp-close-btn-mobile:hover {
                background: var(--highlight-bg) !important;
            }
            .hkm-rp-close-btn-mobile:active {
                transform: scale(0.95) !important;
            }
            @media (max-width: 1024px) {
                .hkm-rp-close-btn-mobile {
                    display: flex !important;
                }
            }

            .hkm-rp-header-wrapper {
                width: 100%;
                max-width: 680px;
                display: flex;
                flex-direction: column;
                margin-bottom: 20px;
                flex-shrink: 0;
                box-sizing: border-box;
            }
            
            /* YouVersion style Day Strip */
            .hkm-rp-day-strip-v2 {
                display: flex;
                gap: 8px;
                overflow-x: auto;
                padding: 8px 4px;
                scrollbar-width: none; /* Hide scrollbar for Firefox */
                -ms-overflow-style: none;  /* Hide scrollbar for IE/Edge */
                -webkit-overflow-scrolling: touch;
                border-bottom: 1.5px solid var(--border-color, #e2e8f0);
                padding-bottom: 12px;
                margin-bottom: 8px;
            }
            .hkm-rp-day-strip-v2::-webkit-scrollbar {
                display: none; /* Hide scrollbar for Chrome/Safari */
            }
            
            .hkm-rp-day-strip-item-v2 {
                position: relative;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                width: 44px;
                height: 50px;
                border-radius: 10px;
                border: 1.5px solid var(--border-color, #e2e8f0);
                background: #ffffff;
                cursor: pointer;
                flex-shrink: 0;
                transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
            }
            .hkm-rp-day-strip-item-v2 .day-num {
                font-size: 13.5px;
                font-weight: 600;
                color: #475569;
            }
            .hkm-rp-day-strip-item-v2 .check-tick {
                font-size: 11px;
                font-weight: 800;
                color: #10b981;
                margin-top: 1px;
                line-height: 1;
            }
            .hkm-rp-day-strip-item-v2 .day-dot {
                font-size: 8px;
                color: #cbd5e1;
                margin-top: 1px;
                line-height: 1;
            }
            
            .hkm-rp-day-strip-item-v2.active {
                border: 2.5px solid #d17d39 !important;
                background: #ffffff !important;
                transform: scale(1.02);
            }
            .hkm-rp-day-strip-item-v2.active .day-num {
                color: #d17d39 !important;
                font-weight: 800 !important;
            }
            
            .bible-theme-dark .hkm-rp-day-strip-item-v2 {
                background: #1e1e1e;
                border-color: #333333;
            }
            .bible-theme-dark .hkm-rp-day-strip-item-v2 .day-num {
                color: #cbd5e1;
            }
            .bible-theme-dark .hkm-rp-day-strip-item-v2.active {
                border-color: #cbd5e1 !important;
            }
            .bible-theme-dark .hkm-rp-day-strip-item-v2.active .day-num {
                color: #ffffff !important;
            }
            
            /* Info Bar */
            .hkm-rp-info-bar-v2 {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-top: 12px;
                margin-bottom: 12px;
                padding: 0 4px;
                font-family: 'Inter', sans-serif;
            }
            .hkm-rp-info-bar-v2 .day-count {
                font-size: 14.5px;
                font-weight: 700;
                color: #1B4965;
            }
            .bible-theme-dark .hkm-rp-info-bar-v2 .day-count {
                color: #e2e8f0;
            }
            .hkm-rp-info-bar-v2 .behind-badge {
                background: #fffbeb;
                color: #d97706;
                font-size: 10px;
                font-weight: 700;
                padding: 3px 8px;
                border-radius: 99px;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                border: 1px solid #fef3c7;
            }
            .hkm-rp-info-bar-v2 .on-track-badge {
                background: #ecfdf5;
                color: #047857;
                font-size: 10px;
                font-weight: 700;
                padding: 3px 8px;
                border-radius: 99px;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                border: 1px solid #d1fae5;
            }
            
            /* Minimal Buttons Control Row */
            .hkm-rp-buttons-row-minimal {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 10px;
                margin-bottom: 16px;
                width: 100%;
            }
            
            .hkm-rp-btn-nav-minimal {
                background: #ffffff;
                border: 1.5px solid var(--border-color, #e2e8f0);
                color: #475569;
                width: 38px !important;
                height: 38px !important;
                aspect-ratio: 1 / 1 !important;
                border-radius: 50% !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                cursor: pointer;
                transition: all 0.2s ease;
                flex-shrink: 0 !important;
                box-sizing: border-box !important;
                padding: 0 !important;
            }
            .bible-theme-dark .hkm-rp-btn-nav-minimal {
                background: #1e1e1e;
                border-color: #333333;
                color: #cbd5e1;
            }
            .hkm-rp-btn-nav-minimal:hover:not(:disabled) {
                border-color: #d17d39;
                color: #d17d39;
            }
            .hkm-rp-btn-nav-minimal:disabled {
                opacity: 0.3;
                cursor: not-allowed;
            }
            
            .hkm-btn-devotional-trigger-minimal {
                flex: 1.2;
                height: 40px !important;
                border-radius: 99px !important;
                background: linear-gradient(135deg, #d17d39 0%, #bd4f2a 100%);
                color: #ffffff;
                font-weight: 700;
                font-size: 13px !important;
                border: none !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                gap: 8px !important;
                cursor: pointer;
                box-shadow: 0 4px 12px rgba(209, 125, 57, 0.15);
                transition: all 0.2s ease;
                padding: 0 16px !important;
                box-sizing: border-box !important;
            }
            .hkm-btn-devotional-trigger-minimal:hover {
                filter: brightness(1.1);
                box-shadow: 0 6px 16px rgba(209, 125, 57, 0.25);
            }
            body.prayer-app-mode .hkm-btn-devotional-trigger-minimal {
                background: linear-gradient(135deg, #d17d39 0%, #bd4f2a 100%) !important;
                box-shadow: 0 4px 12px rgba(189, 79, 42, 0.15) !important;
            }
            
            .hkm-btn-complete-minimal {
                flex: 1;
                height: 40px !important;
                border-radius: 99px !important;
                background: #f1f5f9;
                color: #475569;
                font-weight: 700;
                font-size: 13px !important;
                border: 1px solid #cbd5e1 !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                gap: 8px !important;
                cursor: pointer;
                transition: all 0.2s ease;
                padding: 0 16px !important;
                box-sizing: border-box !important;
            }
            .hkm-btn-complete-minimal:hover {
                background: #e2e8f0;
            }
            .hkm-btn-complete-minimal.completed {
                background: #10b981 !important;
                border-color: #10b981 !important;
                color: #ffffff !important;
                box-shadow: 0 4px 12px rgba(16, 185, 129, 0.15) !important;
            }
            body.prayer-app-mode .hkm-btn-complete-minimal {
                background: rgba(189, 79, 42, 0.08) !important;
                border-color: rgba(189, 79, 42, 0.2) !important;
                color: #bd4f2a !important;
            }
            body.prayer-app-mode .hkm-btn-complete-minimal.completed {
                background: #10b981 !important;
                border-color: #10b981 !important;
                color: #ffffff !important;
            }
            
            .hkm-btn-complete-v2 {
                background: #f1f5f9;
                color: #475569;
                font-weight: 700;
                font-size: 13px !important;
                border: 1px solid #cbd5e1 !important;
                cursor: pointer;
                transition: all 0.2s ease;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                gap: 8px !important;
                height: 40px !important;
                border-radius: 99px !important;
                padding: 0 16px !important;
                box-sizing: border-box !important;
            }
            .hkm-btn-complete-v2:hover {
                background: #e2e8f0;
            }
            .hkm-btn-complete-v2.completed {
                background: #10b981 !important;
                border-color: #10b981 !important;
                color: #ffffff !important;
                box-shadow: 0 4px 12px rgba(16, 185, 129, 0.15) !important;
            }
            body.prayer-app-mode .hkm-btn-complete-v2 {
                background: rgba(189, 79, 42, 0.08) !important;
                border-color: rgba(189, 79, 42, 0.2) !important;
                color: #bd4f2a !important;
            }
            body.prayer-app-mode .hkm-btn-complete-v2.completed {
                background: #10b981 !important;
                border-color: #10b981 !important;
                color: #ffffff !important;
            }
            
            #rp-sidebar-devotional-btn,
            #rp-sidebar-complete-btn {
                height: 44px !important;
                min-height: 44px !important;
                max-height: 44px !important;
                border-radius: 99px !important;
                box-sizing: border-box !important;
                padding: 0 16px !important;
                font-size: 13.5px !important;
                font-weight: 700 !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                gap: 8px !important;
            }
            
            /* Sidebar widgets */
            .hkm-rp-sidebar-wrapper {
                display: flex;
                flex-direction: column;
                gap: 16px;
            }
            .hkm-rp-sidebar-card {
                background: #ffffff;
                border: 1px solid var(--border-color, #e2e8f0);
                border-radius: 16px;
                padding: 16px;
            }
            .bible-theme-dark .hkm-rp-sidebar-card {
                background: #242424;
                border-color: #333333;
            }
            .hkm-rp-sidebar-card .card-header {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 12px;
                border-bottom: 1px solid var(--border-color, #e2e8f0);
                padding-bottom: 8px;
            }
            .bible-theme-dark .hkm-rp-sidebar-card .card-header {
                border-color: #333333;
            }
            .hkm-rp-sidebar-card .card-header .icon {
                color: #d17d39;
                font-size: 20px;
            }
            .hkm-rp-sidebar-card .card-header h3 {
                font-size: 14px;
                font-weight: 700;
                color: #1B4965;
                margin: 0;
            }
            .bible-theme-dark .hkm-rp-sidebar-card .card-header h3 {
                color: #e2e8f0;
            }
            
            .hkm-rp-resource-item {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 10px;
                background: #f8fafc;
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                font-size: 13px;
                font-weight: 600;
                color: #1B4965;
                text-decoration: none;
                transition: all 0.2s ease;
            }
            .bible-theme-dark .hkm-rp-resource-item {
                background: #1e1e1e;
                border-color: #333333;
                color: #cbd5e1;
            }
            .hkm-rp-resource-item:hover {
                background: rgba(27, 73, 101, 0.05);
                border-color: #1B4965;
                transform: translateX(2px);
            }
            
            .hkm-rp-sidebar-card textarea {
                display: block !important;
                width: 100% !important;
                min-height: 80px !important;
                padding: 10px !important;
                border-radius: 8px !important;
                border: 1px solid #cbd5e1 !important;
                outline: none !important;
                font-size: 12.5px !important;
                line-height: 1.4 !important;
                margin-bottom: 10px !important;
                resize: vertical !important;
                background: #ffffff !important;
                color: #1e293b !important;
                transform: translateZ(0) !important;
                backface-visibility: hidden !important;
            }
            .bible-theme-dark .hkm-rp-sidebar-card textarea {
                background: #1e1e1e !important;
                border-color: #333333 !important;
                color: #e2e8f0 !important;
            }
            .hkm-rp-sidebar-card textarea:focus {
                border-color: #d17d39 !important;
            }
            }
            
            /* Premium layout 3-column elements */
            .hkm-rp-hero-card-v2 {
                position: relative;
                width: 100%;
                height: 220px;
                border-radius: 20px;
                overflow: hidden;
                box-shadow: 0 10px 25px rgba(30,58,76,0.08);
                margin-bottom: 20px;
            }
            .hkm-rp-hero-bg-v2 {
                position: absolute;
                inset: 0;
                background-size: cover;
                background-position: center;
                transition: transform 10s ease;
            }
            .hkm-rp-hero-card-v2:hover .hkm-rp-hero-bg-v2 {
                transform: scale(1.05);
            }
            .hkm-rp-hero-overlay-v2 {
                position: absolute;
                inset: 0;
                background: linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 60%, transparent 100%);
            }
            .hkm-rp-hero-content-v2 {
                position: absolute;
                bottom: 20px;
                left: 24px;
                right: 24px;
                color: #ffffff;
                text-shadow: 0 2px 4px rgba(0,0,0,0.4);
            }
            .hkm-rp-hero-badge-v2 {
                background: linear-gradient(135deg, #d17d39 0%, #bd4f2a 100%);
                color: #ffffff;
                font-size: 10px;
                font-weight: 700;
                padding: 4px 12px;
                border-radius: 99px;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                display: inline-block;
                margin-bottom: 8px;
                box-shadow: 0 4px 10px rgba(0,0,0,0.15);
            }
            .hkm-rp-hero-title-v2 {
                font-size: 28px;
                font-weight: 800;
                margin: 0 0 4px 0;
                line-height: 1.2;
            }
            .hkm-rp-hero-subtitle-v2 {
                font-size: 13px;
                opacity: 0.9;
                margin: 0;
            }
            
            .hkm-rp-desktop-nav-v2 {
                display: flex;
                align-items: center;
                justify-content: space-between;
                background: #ffffff;
                border: 1px solid var(--border-color, #e2e8f0);
                border-radius: 12px;
                padding: 8px 16px;
                width: 100%;
                box-sizing: border-box;
                margin-bottom: 20px;
            }
            .bible-theme-dark .hkm-rp-desktop-nav-v2 {
                background: #242424;
                border-color: #333333;
            }
            .hkm-rp-nav-btn-v2 {
                background: none;
                border: none;
                color: #1B4965;
                font-size: 13px;
                font-weight: 700;
                cursor: pointer;
                display: inline-flex;
                align-items: center;
                gap: 4px;
                transition: all 0.2s ease;
                padding: 6px 12px;
                border-radius: 8px;
            }
            .bible-theme-dark .hkm-rp-nav-btn-v2 {
                color: #38bdf8;
            }
            .hkm-rp-nav-btn-v2:hover {
                background: rgba(27, 73, 101, 0.05);
            }
            .bible-theme-dark .hkm-rp-nav-btn-v2:hover {
                background: rgba(255, 255, 255, 0.05);
            }
            .hkm-rp-nav-tools-v2 {
                display: flex;
                align-items: center;
                gap: 16px;
            }
            .hkm-rp-tool-icon-btn-v2 {
                background: none;
                border: none;
                color: #466275;
                cursor: pointer;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 36px;
                height: 36px;
                border-radius: 8px;
                transition: all 0.2s ease;
            }
            .bible-theme-dark .hkm-rp-tool-icon-btn-v2 {
                color: #94a3b8;
            }
            .hkm-rp-tool-icon-btn-v2:hover {
                background: rgba(27, 73, 101, 0.05);
                color: #bd4f2a;
            }
            .bible-theme-dark .hkm-rp-tool-icon-btn-v2:hover {
                background: rgba(255, 255, 255, 0.05);
                color: #f97316;
            }
            .hkm-rp-days-grid-v2 {
                display: grid;
                grid-template-columns: repeat(7, 1fr);
                gap: 4px;
                margin-bottom: 16px;
                justify-items: center;
            }
            .hkm-rp-day-bubble {
                width: 26px;
                height: 26px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 11px;
                font-weight: 700;
                border-radius: 50%;
                border: 1px solid var(--border-color, #e2e8f0);
                background: #ffffff;
                color: #466275;
                cursor: pointer;
                transition: all 0.2s ease;
                padding: 0;
            }
            .bible-theme-dark .hkm-rp-day-bubble {
                background: #242424;
                border-color: #333333;
                color: #cbd5e1;
            }
            .hkm-rp-day-bubble.completed {
                background: #d17d39;
                border-color: #d17d39;
                color: #ffffff !important;
            }
            .hkm-rp-day-bubble.active {
                border-color: #bd4f2a;
                box-shadow: 0 0 0 2px rgba(189, 79, 42, 0.25);
                font-weight: 800;
            }
            .hkm-rp-day-bubble:hover {
                transform: scale(1.15);
                border-color: #d17d39;
            }
            
            /* Prayer app overrides */
            body.prayer-app-mode .hkm-rp-badge {
                color: #bd4f2a !important;
                background: linear-gradient(135deg, rgba(209, 125, 57, 0.15), rgba(189, 79, 42, 0.15)) !important;
                padding: 4px 12px !important;
                border-radius: 20px !important;
                border: 1px solid rgba(209, 125, 57, 0.25) !important;
            }
            body.prayer-app-mode .hkm-btn-complete {
                background: linear-gradient(135deg, #d17d39, #bd4f2a) !important;
                box-shadow: 0 4px 12px rgba(189, 79, 42, 0.2) !important;
            }
            body.prayer-app-mode .hkm-btn-complete.completed {
                background: #10b981 !important;
                box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2) !important;
            }
            body.prayer-app-mode .hkm-rp-day-item.active {
                border-color: #bd4f2a !important;
                background: rgba(189, 79, 42, 0.03) !important;
            }
            body.prayer-app-mode .hkm-rp-day-item.active .hkm-rp-day-checkbox {
                border-color: #bd4f2a !important;
            }
            body.prayer-app-mode .hkm-rp-day-checkbox.completed {
                background: #bd4f2a !important;
                border-color: #bd4f2a !important;
            }
            body.prayer-app-mode .hkm-rp-progress-fill {
                background: linear-gradient(135deg, #d17d39 0%, #bd4f2a 100%) !important;
            }
            body.prayer-app-mode .hkm-rp-sidebar-card .card-header .icon {
                color: #bd4f2a !important;
            }

            /* ==========================================================================
               HKM Reading Plan - Dynamic Theme Overrides (Dark & Cream Mode)
               ========================================================================== */

            /* 1. Dark Mode Theme Overrides */
            .bible-theme-dark #bible-sidebar.reading-plan-active {
                background: #121212 !important;
                color: #e2e8f0 !important;
                border-left-color: #2d2d2d !important;
            }
            .bible-theme-dark .hkm-rp-sidebar-wrapper {
                background: #121212 !important;
            }
            .bible-theme-dark .hkm-rp-sidebar-header-row {
                background: #1e1e1e !important;
                border-bottom-color: #2d2d2d !important;
            }
            .bible-theme-dark .hkm-rp-sidebar-title {
                color: #f8fafc !important;
            }
            .bible-theme-dark .hkm-rp-back-btn {
                color: #cbd5e1 !important;
            }
            .bible-theme-dark .hkm-rp-action-btn {
                color: #cbd5e1 !important;
            }
            .bible-theme-dark .hkm-rp-close-btn-mobile {
                color: #cbd5e1 !important;
            }
            .bible-theme-dark .hkm-rp-days-count-title {
                color: #e2e8f0 !important;
            }
            .bible-theme-dark .hkm-rp-checklist-item {
                background: #1e1e1e !important;
                border-bottom-color: #2d2d2d !important;
            }
            .bible-theme-dark .hkm-rp-checklist-item:hover {
                background: #27272a !important;
            }
            .bible-theme-dark .hkm-rp-checklist-item span {
                color: #e2e8f0 !important;
            }
            .bible-theme-dark .hkm-rp-day-strip-bubble-v3 {
                background: #1e1e1e !important;
                border-color: #2d2d2d !important;
            }
            .bible-theme-dark .hkm-rp-day-strip-bubble-v3 .day-num {
                color: #cbd5e1 !important;
            }
            .bible-theme-dark .hkm-rp-day-strip-bubble-v3.active {
                background: #1e1e1e !important;
                border-color: #cbd5e1 !important;
            }
            .bible-theme-dark .hkm-rp-day-strip-bubble-v3.active .day-num {
                color: #ffffff !important;
            }
            .bible-theme-dark .hkm-rp-day-strip-bubble-v3.completed {
                background: #27272a !important;
            }
            .bible-theme-dark .hkm-rp-day-strip-bubble-v3 .day-date {
                color: #94a3b8 !important;
            }
            .bible-theme-dark .hkm-rp-login-reminder {
                background: rgba(209, 125, 57, 0.1) !important;
                border-color: #d17d39 !important;
            }
            .bible-theme-dark .hkm-rp-login-reminder h4.hkm-rp-login-title {
                color: #f8fafc !important;
            }
            .bible-theme-dark .hkm-rp-login-reminder p {
                color: #cbd5e1 !important;
            }
            .bible-theme-dark .hkm-rp-card,
            .bible-theme-dark .hkm-rp-sidebar-card {
                background: #1e1e1e !important;
                border-color: #2d2d2d !important;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25) !important;
            }
            .bible-theme-dark .hkm-rp-card h4,
            .bible-theme-dark .hkm-rp-sidebar-card h4,
            .bible-theme-dark .hkm-rp-sidebar-card h3 {
                color: #e2e8f0 !important;
            }
            .bible-theme-dark .hkm-rp-card p,
            .bible-theme-dark .hkm-rp-sidebar-card p {
                color: #94a3b8 !important;
            }
            .bible-theme-dark .hkm-rp-card span,
            .bible-theme-dark .hkm-rp-sidebar-card span {
                color: #cbd5e1 !important;
            }
            .bible-theme-dark .hkm-rp-sidebar-card .card-header {
                border-color: #2d2d2d !important;
            }
            .bible-theme-dark .hkm-rp-resource-item {
                background: #27272a !important;
                border-color: #2d2d2d !important;
                color: #cbd5e1 !important;
            }
            .bible-theme-dark .hkm-rp-resource-item:hover {
                background: #3f3f46 !important;
                border-color: #cbd5e1 !important;
                color: #ffffff !important;
            }
            .bible-theme-dark .hkm-rp-sidebar-card textarea {
                background: #121212 !important;
                border-color: #2d2d2d !important;
                color: #e2e8f0 !important;
            }
            .bible-theme-dark .hkm-rp-card .hkm-btn-secondary {
                border-color: #d17d39 !important;
                color: #d17d39 !important;
            }
            .bible-theme-dark .hkm-rp-card .hkm-btn-secondary:hover {
                background: rgba(209, 125, 57, 0.1) !important;
            }
            .bible-theme-dark #rp-save-status {
                color: #cbd5e1 !important;
            }
            .bible-theme-dark .hkm-rp-progress-badge {
                color: #cbd5e1 !important;
                background: rgba(255, 255, 255, 0.08) !important;
            }

            /* 2. Cream Mode Theme Overrides */
            .bible-theme-cream #bible-sidebar.reading-plan-active {
                background: #fdfbf7 !important;
                color: #2c2720 !important;
                border-left-color: #e6dfd3 !important;
            }
            .bible-theme-cream .hkm-rp-sidebar-wrapper {
                background: #fdfbf7 !important;
            }
            .bible-theme-cream .hkm-rp-sidebar-header-row {
                background: #f7f4ec !important;
                border-bottom-color: #e6dfd3 !important;
            }
            .bible-theme-cream .hkm-rp-sidebar-title {
                color: #1B4965 !important;
            }
            .bible-theme-cream .hkm-rp-back-btn {
                color: #2c2720 !important;
            }
            .bible-theme-cream .hkm-rp-action-btn {
                color: #70675a !important;
            }
            .bible-theme-cream .hkm-rp-close-btn-mobile {
                color: #2c2720 !important;
            }
            .bible-theme-cream .hkm-rp-days-count-title {
                color: #2c2720 !important;
            }
            .bible-theme-cream .hkm-rp-checklist-item {
                background: #ffffff !important;
                border-bottom-color: #e6dfd3 !important;
            }
            .bible-theme-cream .hkm-rp-checklist-item:hover {
                background: #f7f4ec !important;
            }
            .bible-theme-cream .hkm-rp-checklist-item span {
                color: #2c2720 !important;
            }
            .bible-theme-cream .hkm-rp-day-strip-bubble-v3 {
                background: #ffffff !important;
                border-color: #e6dfd3 !important;
            }
            .bible-theme-cream .hkm-rp-day-strip-bubble-v3 .day-num {
                color: #70675a !important;
            }
            .bible-theme-cream .hkm-rp-day-strip-bubble-v3.active {
                background: #ffffff !important;
                border-color: #1B4965 !important;
            }
            .bible-theme-cream .hkm-rp-day-strip-bubble-v3.active .day-num {
                color: #1B4965 !important;
            }
            .bible-theme-cream .hkm-rp-day-strip-bubble-v3.completed {
                background: #f7f4ec !important;
            }
            .bible-theme-cream .hkm-rp-day-strip-bubble-v3 .day-date {
                color: #968c7f !important;
            }
            .bible-theme-cream .hkm-rp-login-reminder {
                background: rgba(209, 125, 57, 0.04) !important;
                border-color: #d17d39 !important;
            }
            .bible-theme-cream .hkm-rp-login-reminder h4.hkm-rp-login-title {
                color: #1B4965 !important;
            }
            .bible-theme-cream .hkm-rp-login-reminder p {
                color: #70675a !important;
            }
            .bible-theme-cream .hkm-rp-card,
            .bible-theme-cream .hkm-rp-sidebar-card {
                background: #ffffff !important;
                border-color: #e6dfd3 !important;
                box-shadow: 0 4px 12px rgba(44, 39, 32, 0.04) !important;
            }
            .bible-theme-cream .hkm-rp-card h4,
            .bible-theme-cream .hkm-rp-sidebar-card h4,
            .bible-theme-cream .hkm-rp-sidebar-card h3 {
                color: #2c2720 !important;
            }
            .bible-theme-cream .hkm-rp-card p,
            .bible-theme-cream .hkm-rp-sidebar-card p {
                color: #70675a !important;
            }
            .bible-theme-cream .hkm-rp-card span,
            .bible-theme-cream .hkm-rp-sidebar-card span {
                color: #968c7f !important;
            }
            .bible-theme-cream .hkm-rp-sidebar-card .card-header {
                border-color: #e6dfd3 !important;
            }
            .bible-theme-cream .hkm-rp-resource-item {
                background: #f7f4ec !important;
                border-color: #e6dfd3 !important;
                color: #1B4965 !important;
            }
            .bible-theme-cream .hkm-rp-resource-item:hover {
                background: #ffffff !important;
                border-color: #1B4965 !important;
                color: #1B4965 !important;
            }
            .bible-theme-cream .hkm-rp-sidebar-card textarea {
                background: #fdfbf7 !important;
                border-color: #e6dfd3 !important;
                color: #2c2720 !important;
            }
            .bible-theme-cream .hkm-rp-card .hkm-btn-secondary {
                border-color: #d17d39 !important;
                color: #d17d39 !important;
            }
            .bible-theme-cream .hkm-rp-card .hkm-btn-secondary:hover {
                background: rgba(209, 125, 57, 0.04) !important;
            }
            .bible-theme-cream #rp-save-status {
                color: #70675a !important;
            }
            .bible-theme-cream .hkm-rp-progress-badge {
                color: #1B4965 !important;
                background: rgba(27, 73, 101, 0.08) !important;
            }
        `;
        document.head.appendChild(style);
    }
    async setupReadingPlanUI(openSidebarOnMobile = false) {
        const globalPlan = this.activePlanData;        const userPlan = this.userPlanProgress;
        const currentDayNum = this.activePlanDay;
        const dayConfig = (globalPlan.days || []).find(d => parseInt(d.dayNumber, 10) === parseInt(currentDayNum, 10)) || (globalPlan.days ? globalPlan.days[0] : null);

        const isPrayerApp = globalPlan.title && (
            globalPlan.title.toLowerCase().includes('bønn') ||
            globalPlan.title.toLowerCase().includes('prayer') ||
            globalPlan.title.toLowerCase().includes('oración')
        );
        const lang = document.documentElement.lang || 'no';
        
        if (isPrayerApp) {
            document.body.classList.add('prayer-app-mode');
        } else {
            document.body.classList.remove('prayer-app-mode');
        }
        if (this.dom.sidebar) {
            this.dom.sidebar.classList.add('reading-plan-active');
            if (openSidebarOnMobile && window.innerWidth <= 1024) {
                this.dom.sidebar.classList.add('active');
            }
        }

        // 1. Hide books list and search in left sidebar
        const booksListWrapper = document.querySelector('.books-list-wrapper');
        if (booksListWrapper) booksListWrapper.style.display = 'none';

        const sidebarHeader = this.dom.sidebar ? this.dom.sidebar.querySelector('.sidebar-header') : null;
        if (sidebarHeader) sidebarHeader.style.display = 'none';

        const searchContainer = document.querySelector('.sidebar-header .search-container');
        if (searchContainer) searchContainer.style.display = 'none';

        const mobileControls = document.getElementById('sidebar-mobile-controls');
        if (mobileControls) mobileControls.style.display = 'none';

        // Modify Left Sidebar Header title and add toggle
        const titleRow = document.querySelector('.sidebar-mobile-title-row');
        let rpToggleBtn = document.getElementById('rp-sidebar-toggle-mode');
        if (!rpToggleBtn) {
            rpToggleBtn = document.createElement('button');
            rpToggleBtn.id = 'rp-sidebar-toggle-mode';
            rpToggleBtn.className = 'hkm-btn-secondary';
            rpToggleBtn.style.cssText = 'height: 28px !important; padding: 2px 8px !important; font-size: 11px !important; border-radius: 6px !important; margin-left: auto; margin-right: 8px !important; border: 1px solid var(--bible-primary) !important; color: var(--bible-primary) !important; display: inline-flex; align-items: center; justify-content: center;';
            rpToggleBtn.innerText = 'Vis bøker';
            rpToggleBtn.onclick = () => this.toggleLeftSidebarMode();

            if (titleRow) {
                const closeBtn = titleRow.querySelector('.close-sidebar-mobile-btn');
                if (closeBtn) {
                    titleRow.insertBefore(rpToggleBtn, closeBtn);
                } else {
                    titleRow.appendChild(rpToggleBtn);
                }
            }
        }
        rpToggleBtn.style.display = 'inline-flex';

        const titleSpan = titleRow ? titleRow.querySelector('span') : null;
        if (titleSpan) {
            const isPrayerApp = globalPlan.title && (
                globalPlan.title.toLowerCase().includes('bønn') ||
                globalPlan.title.toLowerCase().includes('prayer') ||
                globalPlan.title.toLowerCase().includes('oración')
            );
            const lang = document.documentElement.lang || 'no';
            titleSpan.innerText = isPrayerApp 
                ? (lang === 'en' ? 'Daily prayer' : (lang === 'es' ? 'Oración diaria' : 'Dagens bønn'))
                : (lang === 'en' ? 'Daily devotion' : (lang === 'es' ? 'Devocional diario' : 'Dagens andakt'));
        }

        // 2. Render left sidebar content (progress grid & devotional)
        let planSidebar = document.getElementById('reading-plan-sidebar-content');
        if (!planSidebar) {
            planSidebar = document.createElement('div');
            planSidebar.id = 'reading-plan-sidebar-content';
            planSidebar.style.cssText = 'padding: 0; overflow: hidden; height: calc(100% - 60px);';
            this.dom.sidebar.appendChild(planSidebar);
        }
        planSidebar.style.display = 'block';

        this.renderLeftSidebarReadingPlan(planSidebar, globalPlan, userPlan, currentDayNum, dayConfig);

        // 3. Render right sidebar content inside existing "Leseplan" tab content
        if (this.dom.navRight) {
            // Restore visibility of standard tabs in reading plan mode
            const rightTabsHeader = this.dom.navRight.querySelector('.tabs-header');
            if (rightTabsHeader) rightTabsHeader.style.display = '';
            const rightTabsContent = this.dom.navRight.querySelector('.tabs-content');
            if (rightTabsContent) rightTabsContent.style.display = '';
            
            // Hide custom sidebar container if it was left from previous versions
            const oldRightPlanSidebar = document.getElementById('reading-plan-right-sidebar-content');
            if (oldRightPlanSidebar) oldRightPlanSidebar.style.display = 'none';

            const rpTabBtn = document.getElementById('tab-btn-reading-plan');
            const rpTabContent = document.getElementById('tab-reading-plan-content');
            
            if (rpTabBtn && rpTabContent) {
                rpTabBtn.style.display = 'block';
                
                // Render our custom widgets directly into the standard Leseplan tab content div
                this.renderRightSidebarReadingPlan(rpTabContent, dayConfig);
                
                // Click Leseplan tab to activate it
                rpTabBtn.click();
            }
            
            // Force open right sidebar on desktop for side-by-side
            if (window.innerWidth > 1024) {
                this.dom.navRight.classList.add('active');
            }
        }
        // Hide old top header panel in central column (Deprecated/Removed)
        const planHeader = document.getElementById('reading-plan-header-panel');
        if (planHeader) {
            planHeader.style.display = 'none';
        }

        // 5. Load day's verses in the center reading pane
        if (dayConfig && dayConfig.verses) {
            await this.showDayVerses(dayConfig.verses, openSidebarOnMobile);
            this.applyReadingPlanHighlights();
        }
    }

    exitReadingPlanMode() {
        this.activePlanMode = false;
        this.activePlanId = null;
        this.activePlanData = null;
        this.activePlanDay = null;

        if (this.dom.sidebar) {
            this.dom.sidebar.classList.remove('reading-plan-active');
        }

        // Restore normal left sidebar elements
        const booksListWrapper = document.querySelector('.books-list-wrapper');
        if (booksListWrapper) booksListWrapper.style.display = 'block';

        const sidebarHeader = this.dom.sidebar ? this.dom.sidebar.querySelector('.sidebar-header') : null;
        if (sidebarHeader) sidebarHeader.style.display = '';

        const searchContainer = document.querySelector('.sidebar-header .search-container');
        if (searchContainer) searchContainer.style.display = 'flex';

        const mobileControls = document.getElementById('sidebar-mobile-controls');
        if (mobileControls) mobileControls.style.display = 'flex';

        const planSidebar = document.getElementById('reading-plan-sidebar-content');
        if (planSidebar) planSidebar.style.display = 'none';

        const planHeader = document.getElementById('reading-plan-header-panel');
        if (planHeader) planHeader.style.display = 'none';

        const titleRow = document.querySelector('.sidebar-mobile-title-row');
        const titleSpan = titleRow ? titleRow.querySelector('span') : null;
        if (titleSpan) {
            titleSpan.innerText = 'Bibelbøker';
        }

        const rpToggleBtn = document.getElementById('rp-sidebar-toggle-mode');
        if (rpToggleBtn) rpToggleBtn.style.display = 'none';

        // Hide the standard Leseplan tab on the right sidebar if not active
        const rpTabBtn = document.getElementById('tab-btn-reading-plan');
        if (rpTabBtn) rpTabBtn.style.display = 'none';

        // Reload the bible view normally
        this.loadBibleBook(this.currentBookId || 1, this.currentChapterNum || 1);
    }

    toggleLeftSidebarMode() {
        const booksListWrapper = document.querySelector('.books-list-wrapper');
        const searchContainer = document.querySelector('.sidebar-header .search-container');
        const planSidebar = document.getElementById('reading-plan-sidebar-content');
        const rpToggleBtn = document.getElementById('rp-sidebar-toggle-mode');
        const titleRow = document.querySelector('.sidebar-mobile-title-row');
        const titleSpan = titleRow ? titleRow.querySelector('span') : null;
        const sidebarHeader = this.dom.sidebar ? this.dom.sidebar.querySelector('.sidebar-header') : null;

        if (booksListWrapper && booksListWrapper.style.display === 'none') {
            booksListWrapper.style.display = 'block';
            if (searchContainer) searchContainer.style.display = 'flex';
            if (planSidebar) planSidebar.style.display = 'none';
            if (rpToggleBtn) rpToggleBtn.innerText = 'Vis andakt';
            if (titleSpan) titleSpan.innerText = 'Bibelbøker';
            if (sidebarHeader) sidebarHeader.style.display = '';
        } else {
            if (booksListWrapper) booksListWrapper.style.display = 'none';
            if (searchContainer) searchContainer.style.display = 'none';
            if (planSidebar) planSidebar.style.display = 'block';
            if (rpToggleBtn) rpToggleBtn.innerText = 'Vis bøker';
            if (titleSpan) titleSpan.innerText = 'Dagens andakt';
            if (sidebarHeader) sidebarHeader.style.display = 'none';
        }
    }

    renderLeftSidebarReadingPlan(container, globalPlan, userPlan, currentDayNum, dayConfig) {
        const lang = document.documentElement.lang || 'no';
        const isPrayerApp = globalPlan.title && (
            globalPlan.title.toLowerCase().includes('bønn') ||
            globalPlan.title.toLowerCase().includes('prayer') ||
            globalPlan.title.toLowerCase().includes('oración')
        );

        const displayTitle = globalPlan.title || '';

        const totalDays = globalPlan.durationDays || globalPlan.days.length;
        const isCurrentDayCompleted = userPlan.completedDays && userPlan.completedDays.includes(currentDayNum);

        // Parse started date to calculate calendar date tags
        const startedAt = userPlan.startedAt;
        const startedAtDate = startedAt ? (startedAt.toDate ? startedAt.toDate() : new Date(startedAt)) : new Date();

        // 1. Generate Days Horizontal Selector Strip
        let dayItemsHtml = '';
        for (let d = 1; d <= totalDays; d++) {
            const isCompleted = userPlan.completedDays && userPlan.completedDays.includes(d);
            const isActive = d === currentDayNum;
            const completedClass = isCompleted ? 'completed' : '';
            const activeClass = isActive ? 'active' : '';

            // Calculate date label: JUL 10, JUL 11 etc.
            const dateObj = new Date(startedAtDate);
            dateObj.setDate(startedAtDate.getDate() + (d - 1));
            const monthName = dateObj.toLocaleDateString(lang, { month: 'short' }).replace('.', '').toUpperCase();
            const dateLabel = `${monthName} ${dateObj.getDate()}`;

            dayItemsHtml += `
                <button class="hkm-rp-day-strip-bubble-v3 ${completedClass} ${activeClass}" 
                        onclick="window.bibleReader.selectReadingPlanDay(${d})"
                        style="box-sizing: border-box;">
                    <div style="display: flex; align-items: center; justify-content: center; gap: 3px;">
                        <span class="day-num">${d}</span>
                        ${isCompleted ? '<span class="material-symbols-outlined" style="font-size: 11px; font-weight: 900; color: #10b981; line-height: 1;">check</span>' : ''}
                    </div>
                    <span class="day-date">${dateLabel}</span>
                </button>
            `;
        }

        // Calculate progress percentage
        const progressPct = Math.round((userPlan.completedDays?.length || 0) / totalDays * 100);

        // 2. Generate Checkboxes
        const uncompletedCircle = `<div style="width: 24px; height: 24px; aspect-ratio: 1 / 1; border-radius: 50%; border: 2px solid var(--border-color); flex-shrink: 0; box-sizing: border-box; background: transparent;"></div>`;
        const completedCircle = `
            <div style="width: 24px; height: 24px; aspect-ratio: 1 / 1; border-radius: 50%; border: 2px solid #10b981; background: #10b981; display: flex; align-items: center; justify-content: center; color: #ffffff; flex-shrink: 0; box-sizing: border-box;">
                <span class="material-symbols-outlined" style="font-size: 14px; font-weight: 900; line-height: 1; display: block;">check</span>
            </div>
        `;
        const checkCircleHtml = isCurrentDayCompleted ? completedCircle : uncompletedCircle;

        // Parse verses into individual passages if separated by comma/semicolon
        const rawVerses = dayConfig ? dayConfig.verses : '';
        let passages = [];
        if (rawVerses) {
            passages = rawVerses.split(/[,;]/).map(p => p.trim()).filter(Boolean);
        }
        if (passages.length === 0) {
            passages = ['Bibeltekst'];
        }

        let checklistItemsHtml = '';
        
        // Task 1: Devotional (Andakt)
        checklistItemsHtml += `
            <div class="hkm-rp-checklist-item" onclick="window.bibleReader.openDevotionalWizard('${globalPlan.id}', ${currentDayNum}, 1)" style="display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; cursor: pointer; border-bottom: 1px solid var(--border-color); background: var(--bg-card); transition: all 0.2s;" onmouseover="this.style.backgroundColor='var(--bg-sidebar)'" onmouseout="this.style.backgroundColor='var(--bg-card)'">
                <div style="display: flex; align-items: center; gap: 16px;">
                    ${checkCircleHtml}
                    <span style="font-size: 15px; font-weight: 600; color: var(--text-base);">${lang === 'en' ? 'Devotional' : (lang === 'es' ? 'Devocional' : 'Andakt')}</span>
                </div>
                <span class="material-symbols-outlined" style="color: var(--text-light); font-size: 20px;">chevron_right</span>
            </div>
        `;

        // Task 2+: Scripture chapters (one row per passage)
        passages.forEach((passage) => {
            checklistItemsHtml += `
                <div class="hkm-rp-checklist-item" onclick="window.bibleReader.openDevotionalWizard('${globalPlan.id}', ${currentDayNum}, 2)" style="display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; cursor: pointer; border-bottom: 1px solid var(--border-color); background: var(--bg-card); transition: all 0.2s;" onmouseover="this.style.backgroundColor='var(--bg-sidebar)'" onmouseout="this.style.backgroundColor='var(--bg-card)'">
                    <div style="display: flex; align-items: center; gap: 16px;">
                        ${checkCircleHtml}
                        <span style="font-size: 15px; font-weight: 600; color: var(--text-base);">${passage}</span>
                    </div>
                    <span class="material-symbols-outlined" style="color: var(--text-light); font-size: 20px;">chevron_right</span>
                </div>
            `;
        });

        // 3. Render HTML
        container.innerHTML = `
            <div class="hkm-rp-sidebar-wrapper" style="background: var(--bg-base); min-height: 100%; box-sizing: border-box; display: flex; flex-direction: column; height: 100%; position: relative;">
                
                <!-- 1. Top Header Bar -->
                <div class="hkm-rp-sidebar-header-row" style="display: flex; align-items: center; justify-content: center; padding: 14px 16px; border-bottom: 1px solid var(--border-color); background: var(--bg-card); flex-shrink: 0; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
                    <div style="display: flex; align-items: center; justify-content: space-between; width: 100%; max-width: 800px; box-sizing: border-box;">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <button class="hkm-rp-back-btn" onclick="window.bibleReader.exitReadingPlanMode()" style="background: none; border: none; padding: 8px; cursor: pointer; color: var(--text-base); display: flex; align-items: center; justify-content: center; border-radius: 50%; transition: background-color 0.2s;" onmouseover="this.style.backgroundColor='var(--highlight-bg)'" onmouseout="this.style.backgroundColor='transparent'">
                                <span class="material-symbols-outlined" style="font-size: 24px; font-weight: 700;">arrow_back</span>
                            </button>
                            <h2 class="hkm-rp-sidebar-title" style="margin: 0; font-size: 15px; font-weight: 800; color: var(--text-base); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${displayTitle}</h2>
                        </div>
                        <div style="display: flex; align-items: center; gap: 4px;">
                            <button class="hkm-rp-action-btn" style="background: none; border: none; padding: 8px; cursor: pointer; color: var(--text-muted); display: flex; align-items: center; justify-content: center; border-radius: 50%; transition: background-color 0.2s;" onmouseover="this.style.backgroundColor='var(--highlight-bg)'" onmouseout="this.style.backgroundColor='transparent'" onclick="window.bibleReader.toggleLeftSidebarMode()">
                                <span class="material-symbols-outlined" style="font-size: 20px;">more_vert</span>
                            </button>
                            <button class="hkm-rp-close-btn-mobile" onclick="document.getElementById('bible-sidebar').classList.remove('active')">
                                <span class="material-symbols-outlined" style="font-size: 20px;">close</span>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Scrollable Body Content -->
                <div style="flex: 1; overflow-y: auto; display: flex; flex-direction: column; padding: 0 16px;">
                    <div style="max-width: 800px; margin: 0 auto; width: 100%; box-sizing: border-box; display: flex; flex-direction: column;">
                        
                        <!-- 2. Banner Card -->
                        <div class="hkm-rp-banner-card" style="margin: 16px 0; padding: 24px; border-radius: 16px; min-height: 140px; display: flex; flex-direction: column; justify-content: space-between; position: relative; overflow: hidden; ${globalPlan.imageUrl || globalPlan.image ? `background-image: linear-gradient(rgba(27, 73, 101, 0.55), rgba(15, 23, 42, 0.85)), url(${globalPlan.imageUrl || globalPlan.image}); background-size: cover; background-position: center;` : 'background: linear-gradient(135deg, #1B4965 0%, #0f172a 100%);'} color: #ffffff; box-shadow: 0 8px 24px rgba(27, 73, 101, 0.12);">
                            <h1 style="margin: 0; font-size: 20px; font-weight: 800; line-height: 1.25; color: #ffffff; text-shadow: 0 1px 3px rgba(0,0,0,0.15); max-width: 85%; font-family: 'Inter', sans-serif;">${globalPlan.title}</h1>
                            <div style="display: flex; align-items: center; gap: 8px; z-index: 2;">
                                <span class="material-symbols-outlined" style="font-size: 20px; color: rgba(255,255,255,0.95);">book_2</span>
                            </div>
                        </div>

                        ${!this.currentUser ? `
                        <!-- Premium Sign-in Reminder -->
                        <div class="hkm-rp-login-reminder" style="background: rgba(209, 125, 57, 0.06); border: 1px dashed #d17d39; border-radius: 12px; padding: 16px; margin: 0 0 16px 0; box-sizing: border-box; display: flex; flex-direction: column; gap: 10px;">
                            <div style="display: flex; align-items: flex-start; gap: 12px;">
                                <span class="material-symbols-outlined" style="color: #d17d39; font-size: 22px; flex-shrink: 0; margin-top: 2px;">info</span>
                                <div style="display: flex; flex-direction: column; gap: 2px;">
                                    <h4 class="hkm-rp-login-title" style="margin: 0; font-size: 14px; font-weight: 700; color: #1B4965;">
                                        ${lang === 'en' ? 'Not Logged In' : (lang === 'es' ? 'Sesión no iniciada' : 'Ikke logget inn')}
                                    </h4>
                                    <p style="margin: 0; font-size: 13px; line-height: 1.4; color: var(--text-light);">
                                        ${lang === 'en' 
                                            ? 'Progress is not saved. Log in to sync your completed days and notes.' 
                                            : (lang === 'es' 
                                                ? 'Tu progreso no se guardará. Inicia sesión para sincronizar tus días y notas.' 
                                                : 'Fremdriften din lagres ikke. Logg inn for å synkronisere fullførte dager og lagre svar.')}
                                    </p>
                                </div>
                            </div>
                            <a href="/minside/login.html?redirect=${encodeURIComponent(window.location.href)}" class="hkm-btn-secondary" style="height: 34px !important; font-size: 12px !important; padding: 0 16px !important; align-self: flex-start; text-decoration: none !important; border-radius: 6px !important; border-color: #d17d39 !important; color: #d17d39 !important; display: inline-flex; align-items: center; justify-content: center;">
                                ${lang === 'en' ? 'Log In' : (lang === 'es' ? 'Iniciar sesión' : 'Logg inn her')}
                            </a>
                        </div>
                        ` : ''}
 
                        <!-- 3. Horizontal day selector strip -->
                        <div class="hkm-rp-day-strip-v3" style="display: flex; gap: 10px; overflow-x: auto; padding: 4px 0 16px 0; scroll-behavior: smooth; -webkit-overflow-scrolling: touch;">
                            ${dayItemsHtml}
                        </div>
 
                        <!-- 4. Active Day title & progress row -->
                        <div style="display: flex; align-items: center; justify-content: space-between; padding: 0 4px; margin-bottom: 16px; margin-top: 8px;">
                            <h3 class="hkm-rp-days-count-title" style="font-size: 16px; font-weight: 800; color: var(--text-base); margin: 0;">
                                ${lang === 'en' ? 'Day' : (lang === 'es' ? 'Día' : 'Dag')} ${currentDayNum} av ${totalDays}
                            </h3>
                            <span class="hkm-rp-progress-badge" style="font-size: 12px; font-weight: 700; color: #1B4965; background: rgba(27, 73, 101, 0.08); padding: 4px 10px; border-radius: 99px; font-family: 'Inter', sans-serif;">
                                ${progressPct}% ${lang === 'en' ? 'completed' : (lang === 'es' ? 'completado' : 'fullført')}
                            </span>
                        </div>
 
                        <!-- 5. Checklist Items -->
                        <div style="display: flex; flex-direction: column; border-top: 1px solid var(--border-color); margin-bottom: 24px;">
                            ${checklistItemsHtml}
                        </div>
                        
                    </div>
                </div>
 
                <!-- 6. Sticky Bottom Action Button -->
                <div style="padding: 16px; background: var(--bg-base); border-top: 1px solid var(--border-color); box-sizing: border-box; z-index: 10; flex-shrink: 0; width: 100%; display: flex; justify-content: center;">
                    <div style="max-width: 800px; width: 100%; box-sizing: border-box;">
                        <button class="hkm-rp-start-btn" onclick="window.bibleReader.openDevotionalWizard('${globalPlan.id}', ${currentDayNum}, 1)" 
                                style="width: 100% !important; background: var(--text-base) !important; color: var(--bg-base) !important; border: none !important; border-radius: 99px !important; height: 50px !important; font-size: 14px !important; font-weight: 700; display: flex !important; align-items: center !important; justify-content: center !important; gap: 8px !important; cursor: pointer !important; transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;"
                                onmouseover="this.style.filter='brightness(1.15)'; this.style.transform='translateY(-1px)';" 
                                onmouseout="this.style.filter='none'; this.style.transform='none';"
                                onmousedown="this.style.transform='scale(0.98)';"
                                onmouseup="this.style.transform='translateY(-1px)';"
                                onmouseleave="this.style.filter='none'; this.style.transform='none';">
                            <span>${isCurrentDayCompleted 
                                ? (lang === 'en' ? 'Read again' : (lang === 'es' ? 'Leer de nuevo' : 'Les på nytt')) 
                                : (lang === 'en' ? 'Start Reading' : (lang === 'es' ? 'Comenzar lesing' : 'Start lesing'))
                            }</span>
                        </button>
                    </div>
                </div>
 
            </div>
        `;

        // 3. Auto-scroll active day strip bubble into center view
        setTimeout(() => {
            const activeBubble = container.querySelector('.hkm-rp-day-strip-bubble-v3.active');
            const dayStrip = container.querySelector('.hkm-rp-day-strip-v3');
            if (activeBubble && dayStrip) {
                const scrollLeft = activeBubble.offsetLeft - (dayStrip.offsetWidth / 2) + (activeBubble.offsetWidth / 2);
                dayStrip.scrollTo({ left: scrollLeft, behavior: 'smooth' });
            }
        }, 100);
    }

    renderRightSidebarReadingPlan(container, dayConfig) {
        const lang = document.documentElement.lang || 'no';
        const isPrayer = this.activePlanData && this.activePlanData.title && (
            this.activePlanData.title.toLowerCase().includes('bønn') ||
            this.activePlanData.title.toLowerCase().includes('prayer') ||
            this.activePlanData.title.toLowerCase().includes('oración')
        );

        const titles = {
            no: {
                resources: 'Ressurser',
                reflections: 'Dine refleksjoner',
                placeholder: 'Skriv ned hva Gud talte til deg i dag...',
                saveBtn: 'Lagre refleksjoner'
            },
            en: {
                resources: 'Resources',
                reflections: 'Your Reflections',
                placeholder: 'Write down what God spoke to you today...',
                saveBtn: 'Save reflections'
            },
            es: {
                resources: 'Recursos',
                reflections: 'Tus reflexiones',
                placeholder: 'Escribe lo que Dios te habló hoy...',
                saveBtn: 'Guardar reflexiones'
            }
        };
        const t = titles[lang] || titles['en'];

        container.innerHTML = `
            <div class="hkm-rp-sidebar-wrapper">
                <!-- Reflection Notepad Card -->
                <div class="hkm-rp-sidebar-card">
                    <div class="card-header">
                        <span class="material-symbols-outlined icon">edit_note</span>
                        <h3>${t.reflections}</h3>
                    </div>
                    <textarea id="rp-reflection-input" placeholder="${t.placeholder}"></textarea>
                    <button id="rp-save-reflection-btn" class="hkm-btn-complete-v2" style="width: 100%; display: flex; justify-content: center; height: 38px !important; padding: 0 !important; font-size: 13px !important; border-radius: 8px !important;">
                        <span>${t.saveBtn}</span>
                    </button>
                    <div id="rp-save-status" class="save-status" style="font-size: 11px; margin-top: 4px; text-align: center; color: var(--text-muted);"></div>
                </div>
                
                <!-- Related Verses (Kryssreferanser) -->
                <div class="hkm-rp-sidebar-card" id="rp-sidebar-cross-refs" style="display: none;">
                    <div class="card-header">
                        <span class="material-symbols-outlined icon">link</span>
                        <h3>${lang === 'en' ? 'Cross References' : (lang === 'es' ? 'Referencias cruzadas' : 'Kryssreferanser')}</h3>
                    </div>
                    <div class="cross-refs-list" style="display: flex; flex-direction: column; gap: 8px;">
                        <!-- Loaded dynamically -->
                    </div>
                </div>
                
                <!-- Video / Resources Card -->
                <div class="hkm-rp-sidebar-card" id="rp-sidebar-resources" style="display: none;">
                    <div class="card-header">
                        <span class="material-symbols-outlined icon">video_library</span>
                        <h3>${t.resources}</h3>
                    </div>
                    <div class="resources-list" style="display: flex; flex-direction: column; gap: 8px;">
                        <!-- Loaded dynamically -->
                    </div>
                </div>
            </div>
        `;

        // 1. Populate textarea and setup save logic
        const textarea = container.querySelector('#rp-reflection-input');
        const saveBtn = container.querySelector('#rp-save-reflection-btn');
        const saveStatus = container.querySelector('#rp-save-status');

        const currentReflection = (this.userPlanProgress.reflections && this.userPlanProgress.reflections[this.activePlanDay]) || '';
        if (textarea) textarea.value = currentReflection;

        if (!this.currentUser) {
            if (textarea) {
                textarea.placeholder = lang === 'no' 
                    ? "Logg inn på Min Side for å skrive og lagre refleksjoner permanent."
                    : lang === 'es'
                        ? "Inicia sesión en Mi cuenta para escribir y guardar reflexiones de forma permanente."
                        : "Log in to My Account to write and save reflections permanently.";
                textarea.disabled = true;
            }
            if (saveBtn) {
                saveBtn.disabled = true;
                saveBtn.style.opacity = '0.5';
            }
            if (saveStatus) {
                saveStatus.innerText = lang === 'no'
                    ? "Gjestemodus - Refleksjoner er deaktivert."
                    : lang === 'es'
                        ? "Modo invitado - Las reflexiones están desactivadas."
                        : "Guest mode - Reflections are disabled.";
            }
        } else {
            if (saveBtn) {
                saveBtn.onclick = async () => {
                    saveBtn.disabled = true;
                    saveStatus.innerText = lang === 'no' ? "Lagrer..." : lang === 'es' ? "Guardando..." : "Saving...";
                    
                    try {
                        const text = textarea.value.trim();
                        this.userPlanProgress.reflections = this.userPlanProgress.reflections || {};
                        this.userPlanProgress.reflections[this.activePlanDay] = text;
                        
                        await this.saveProgress();

                        // Also save/update in generic personal notes
                        const db = this.getFirestore();
                        if (db) {
                            const snap = await db.collection('personal_notes')
                                .where('userId', '==', this.currentUser.uid)
                                .where('readingPlanId', '==', this.activePlanId)
                                .where('dayNumber', '==', this.activePlanDay)
                                .get();

                            if (!snap.empty) {
                                const docId = snap.docs[0].id;
                                await db.collection('personal_notes').doc(docId).update({
                                    text: text,
                                    createdAt: this.getServerTimestamp()
                                });
                            } else {
                                await db.collection('personal_notes').add({
                                    userId: this.currentUser.uid,
                                    title: lang === 'no' 
                                        ? `Leseplan: ${this.activePlanData.title} - Dag ${this.activePlanDay}`
                                        : lang === 'es'
                                            ? `Plan de lectura: ${this.activePlanData.title} - Día ${this.activePlanDay}`
                                            : `Reading Plan: ${this.activePlanData.title} - Day ${this.activePlanDay}`,
                                    text: text,
                                    readingPlanId: this.activePlanId,
                                    dayNumber: this.activePlanDay,
                                    createdAt: this.getServerTimestamp()
                                });
                            }
                        }
                        
                        saveStatus.innerText = lang === 'no' ? "Lagret!" : lang === 'es' ? "¡Guardado!" : "Saved!";
                        setTimeout(() => { saveStatus.innerText = ''; }, 3000);
                    } catch (err) {
                        console.error("Error saving reflections:", err);
                        saveStatus.innerText = lang === 'no' ? "Feil ved lagring" : "Error saving";
                    } finally {
                        saveBtn.disabled = false;
                    }
                };
            }
        }

        // 2. Populate cross references
        const crossRefsContainer = container.querySelector('#rp-sidebar-cross-refs');
        if (crossRefsContainer) {
            let crossRefsHtml = '';
            
            if (dayConfig.crossReferences && dayConfig.crossReferences.length > 0) {
                dayConfig.crossReferences.forEach(ref => {
                    crossRefsHtml += `
                        <a href="#" class="hkm-rp-resource-item hover:scale-[1.02] transition-all" onclick="window.bibleReader.showScriptureRef('${ref.reference || ref}'); return false;" style="display: block; padding: 8px 12px; border-radius: 8px; background: rgba(27,73,101,0.03); border: 1px solid var(--border-color); text-decoration: none; color: inherit; margin-bottom: 8px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
                                <span style="font-size: 12px; font-weight: 700; color: var(--bible-primary);">${ref.reference || ref}</span>
                                <span class="material-symbols-outlined" style="font-size: 14px; color: var(--text-muted);">open_in_new</span>
                            </div>
                            ${ref.text ? `<p style="margin: 0; font-size: 11px; color: var(--text-muted); line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${ref.text}</p>` : ''}
                        </a>
                    `;
                });
            }
            
            if (crossRefsHtml) {
                crossRefsContainer.querySelector('.cross-refs-list').innerHTML = crossRefsHtml;
                crossRefsContainer.style.display = 'block';
            } else {
                crossRefsContainer.style.display = 'none';
            }
        }

        // 3. Populate resources (video & extra links)
        const resourcesContainer = container.querySelector('#rp-sidebar-resources');
        if (resourcesContainer) {
            let resourcesHtml = '';
            
            const bpVideo = this.getBibleProjectVideo(this.selectedBookId, lang);
            if (bpVideo) {
                const activeBook = this.books ? this.books.find(b => String(b.id) === String(this.selectedBookId)) : null;
                const bookName = activeBook ? activeBook.name : this.selectedBookId;
                const label = lang === 'no' ? 'Introduksjon til ' + bookName : (lang === 'es' ? 'Introducción a ' + bookName : 'Introduction to ' + bookName);
                resourcesHtml += `
                    <div class="hkm-rp-sidebar-card no-stripe" style="margin: 0; padding: 0; box-shadow: none; border: none; overflow: hidden; border-radius: 12px; background: var(--bg-card); border: 1px solid var(--border-color); margin-bottom: 8px;">
                        <div class="relative h-28 overflow-hidden group cursor-pointer" onclick="window.open('https://www.youtube.com/watch?v=${bpVideo.id}', '_blank')">
                            <img src="https://img.youtube.com/vi/${bpVideo.id}/0.jpg" style="width: 100%; height: 100%; object-fit: cover; transition: transform 0.5s ease; display: block;" class="group-hover:scale-105" />
                            <div style="position: absolute; inset: 0; background: rgba(0,0,0,0.25); display: flex; align-items: center; justify-content: center; transition: all 0.3s;" class="group-hover:bg-black/40">
                                <div style="width: 32px; height: 32px; background: #ffffff; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.1); transition: transform 0.2s;" class="group-hover:scale-110">
                                    <span class="material-symbols-outlined" style="color: #d17d39; font-variation-settings: 'FILL' 1; font-size: 18px;">play_arrow</span>
                                </div>
                            </div>
                        </div>
                        <div style="padding: 8px 10px;">
                            <span style="font-size: 8px; font-weight: 700; color: #d17d39; text-transform: uppercase; tracking: 0.05em; display: block; margin-bottom: 2px;">BIBLEPROJECT</span>
                            <h4 style="margin: 0; font-size: 11px; font-weight: 700; color: var(--text-base);">${label}</h4>
                        </div>
                    </div>
                `;
            }
            
            if (dayConfig.resources && dayConfig.resources.length > 0) {
                dayConfig.resources.forEach(res => {
                    let iconName = 'article';
                    if (res.type === 'video') iconName = 'play_circle';
                    else if (res.type === 'podcast') iconName = 'podcasts';
                    
                    resourcesHtml += `
                        <a href="${res.url || '#'}" target="_blank" class="hkm-rp-resource-item hover:scale-[1.02] transition-all" style="display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-radius: 8px; background: rgba(27,73,101,0.03); border: 1px solid var(--border-color); text-decoration: none; color: inherit; margin-bottom: 4px;">
                            <span class="material-symbols-outlined" style="font-size: 16px; color: #d17d39;">${iconName}</span>
                            <span style="font-size: 11px; font-weight: 600; color: var(--text-base);">${res.title}</span>
                        </a>
                    `;
                });
            }
            
            if (resourcesHtml) {
                resourcesContainer.querySelector('.resources-list').innerHTML = resourcesHtml;
                resourcesContainer.style.display = 'block';
            } else {
                resourcesContainer.style.display = 'none';
            }
        }
    }

    async selectReadingPlanDay(dayNum) {
        this.activePlanDay = dayNum;
        
        // Update URL search param
        const url = new URL(window.location.href);
        url.searchParams.set('day', dayNum);
        window.history.pushState({}, '', url.toString());

        await this.setupReadingPlanUI(true);

        // Auto-open devotional wizard on mobile
        if (window.innerWidth <= 1024) {
            this.openDevotionalWizard(this.activePlanId, dayNum);
        }
    }

    async toggleActivePlanDayCompletion(btnElement) {
        const globalPlan = this.activePlanData;
        const userPlan = this.userPlanProgress;
        const currentDayNum = this.activePlanDay;
        const totalDays = globalPlan.durationDays || globalPlan.days.length;
        const isCurrentDayCompleted = userPlan.completedDays && userPlan.completedDays.includes(currentDayNum);
        const lang = document.documentElement.lang || 'no';

        userPlan.completedDays = userPlan.completedDays || [];
        if (isCurrentDayCompleted) {
            userPlan.completedDays = userPlan.completedDays.filter(d => d !== currentDayNum);
            
            userPlan.lastActiveAt = this.getServerTimestamp();
            await this.saveProgress();
            
            this.setupReadingPlanUI(true);
            this.loadReadingPlan();
        } else {
            if (!userPlan.completedDays.includes(currentDayNum)) {
                userPlan.completedDays.push(currentDayNum);
            }
            
            // Celebration particles from the button coordinates
            if (btnElement) {
                this.createCelebrationParticles(btnElement);
            }
            
            // Visual feedback on the buttons (if present)
            const sidebarBtn = document.getElementById('rp-sidebar-complete-btn');
            const mobileBtn = document.getElementById('rp-complete-day-btn');
            
            [sidebarBtn, mobileBtn].forEach(btn => {
                if (!btn) return;
                btn.classList.add('completed');
                const textSpan = btn.querySelector('#btn-text') || btn.querySelector('span:not(.material-symbols-outlined)');
                const iconSpan = btn.querySelector('#btn-icon') || btn.querySelector('.material-symbols-outlined');
                if (textSpan) textSpan.innerText = lang === 'en' ? 'Completed!' : (lang === 'es' ? '¡Completado!' : 'Fullført!');
                if (iconSpan) {
                    iconSpan.innerText = 'check_circle';
                    iconSpan.style.transform = 'scale(1.2) rotate(360deg)';
                }
            });

            const progressCircle = document.getElementById('progress-circle');
            const progressText = document.getElementById('progress-text');
            const progressStatus = document.getElementById('progress-status');
            
            const completedDaysCount = userPlan.completedDays.length;
            const progressPct = totalDays > 0 ? Math.round((completedDaysCount / totalDays) * 100) : 0;
            
            if (progressCircle) {
                const circ = parseFloat(progressCircle.getAttribute('stroke-dasharray') || '175.92');
                progressCircle.style.strokeDashoffset = circ * (1 - progressPct / 100);
            }
            if (progressText) {
                progressText.innerText = progressPct + "%";
            }
            if (progressStatus) {
                progressStatus.innerText = lang === 'en' ? 'Goal reached!' : (lang === 'es' ? '¡Objetivo alcanzado!' : 'Dagens mål nådd!');
                progressStatus.classList.add('completed-status');
            }
            
            if (currentDayNum < totalDays) {
                let nextDay = currentDayNum + 1;
                while (nextDay <= totalDays && userPlan.completedDays.includes(nextDay)) {
                    nextDay++;
                }
                if (nextDay <= totalDays) {
                    userPlan.currentDay = nextDay;
                }
            } else {
                userPlan.completed = true;
            }
            
            userPlan.lastActiveAt = this.getServerTimestamp();
            await this.saveProgress();
                        setTimeout(() => {
                this.setupReadingPlanUI(true);
                this.loadReadingPlan(true);
            }, 1200);
        }
    }
    async showScriptureRef(ref) {
        await this.showDayVerses(ref);
        this.applyReadingPlanHighlights();
    }

    createCelebrationParticles(button) {
        let container = document.getElementById('particle-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'particle-container';
            container.style.cssText = 'position: fixed; inset: 0; pointer-events: none; z-index: 9999;';
            document.body.appendChild(container);
        }

        const rect = button.getBoundingClientRect();
        const colors = ['#ffffff', '#ffdbce', '#d17d39', '#ffd700', '#1B4965'];
        const count = 40;
        
        for (let i = 0; i < count; i++) {
            const particle = document.createElement('div');
            const size = Math.random() * 6 + 4;
            
            particle.style.cssText = `
                position: fixed;
                background: ${colors[Math.floor(Math.random() * colors.length)]};
                width: ${size}px;
                height: ${size}px;
                border-radius: 50%;
                pointer-events: none;
                z-index: 9999;
                left: ${rect.left + rect.width / 2}px;
                top: ${rect.top + rect.height / 2}px;
                opacity: 1;
                transform: translate(0, 0) scale(1);
                transition: transform 0.8s cubic-bezier(0.1, 0.8, 0.3, 1), opacity 0.8s ease-out;
            `;
            
            container.appendChild(particle);
            
            // Random destination
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * 150 + 50;
            const tx = Math.cos(angle) * distance;
            const ty = Math.sin(angle) * distance;
            
            // Trigger transition on next frame
            requestAnimationFrame(() => {
                particle.style.transform = `translate(${tx}px, ${ty}px) scale(0)`;
                particle.style.opacity = '0';
            });
            
            // Clean up
            setTimeout(() => {
                particle.remove();
            }, 800);
        }
    }

    renderProgressTicks(totalDays, currentDayNum) {
        let ticks = [];
        let step = 1;
        if (totalDays > 30) {
            step = 5;
        } else if (totalDays > 10) {
            step = 2; // Show odd days
        }
        
        for (let i = 1; i <= totalDays; i += step) {
            ticks.push(i);
        }
        if (!ticks.includes(totalDays)) {
            ticks.push(totalDays);
        }
        if (!ticks.includes(currentDayNum)) {
            ticks.push(currentDayNum);
            ticks.sort((a, b) => a - b);
        }
        return '';
    }

    renderTopHeaderPanel(container, globalPlan, userPlan, currentDayNum, dayConfig) {
        const totalDays = globalPlan.durationDays || globalPlan.days.length;
        const completedDaysCount = userPlan.completedDays ? userPlan.completedDays.length : 0;
        const progressPct = totalDays > 0 ? Math.round((completedDaysCount / totalDays) * 100) : 0;
        const isCurrentDayCompleted = userPlan.completedDays && userPlan.completedDays.includes(currentDayNum);

        const isPrayerApp = globalPlan.title && (
            globalPlan.title.toLowerCase().includes('bønn') ||
            globalPlan.title.toLowerCase().includes('prayer') ||
            globalPlan.title.toLowerCase().includes('oración')
        );
        const lang = document.documentElement.lang || 'no';

        const completeLabel = isCurrentDayCompleted 
            ? (isPrayerApp ? (lang === 'en' ? 'Completed!' : (lang === 'es' ? '¡Orado!' : 'Bedt!')) : (lang === 'en' ? 'Completed!' : (lang === 'es' ? '¡Completado!' : 'Fullført!')))
            : (isPrayerApp ? (lang === 'en' ? 'Mark as prayed' : (lang === 'es' ? 'Marcar como orado' : 'Marker som bedt')) : (lang === 'en' ? 'Complete' : (lang === 'es' ? 'Completar' : 'Fullfør')));

        const db = this.getFirestore();
        if (db && !userPlan.isPreview) {
            if (!userPlan.startedAt) {
                const fallbackDate = userPlan.lastActiveAt ? (userPlan.lastActiveAt.toDate ? userPlan.lastActiveAt.toDate() : new Date(userPlan.lastActiveAt)) : new Date();
                userPlan.startedAt = fallbackDate;
                
                if (this.currentUser) {
                    db.collection('users')
                        .doc(this.currentUser.uid)
                        .collection('reading_plans')
                        .doc(globalPlan.id)
                        .set({
                            startedAt: firebase.firestore.Timestamp.fromDate(fallbackDate)
                        }, { merge: true }).catch(err => console.warn("Failed to set fallback startedAt in bible-reader:", err));
                }
            }
        }

        const startedAt = userPlan.startedAt;
        let expectedDay = currentDayNum;
        if (startedAt) {
            const startedAtDate = startedAt.toDate ? startedAt.toDate() : new Date(startedAt);
            const startMidnight = new Date(startedAtDate.getFullYear(), startedAtDate.getMonth(), startedAtDate.getDate());
            const todayMidnight = new Date();
            todayMidnight.setHours(0, 0, 0, 0);
            const diffDays = Math.max(0, Math.round((todayMidnight.getTime() - startMidnight.getTime()) / (1000 * 60 * 60 * 24)));
            expectedDay = Math.min(diffDays + 1, totalDays);
        }

        const isBehind = currentDayNum < expectedDay;

        const t_daysBehind = {
            no: `Du ligger ${expectedDay - currentDayNum} dager bak planen (Skulle vært på Dag ${expectedDay}).`,
            en: `You are ${expectedDay - currentDayNum} days behind schedule (Should be on Day ${expectedDay}).`,
            es: `Estás ${expectedDay - currentDayNum} días atrasado (Deberías estar en el Día ${expectedDay}).`
        }[lang] || `Du ligger ${expectedDay - currentDayNum} dager bak planen (Skulle vært på Dag ${expectedDay}).`;

        const t_shiftDates = {
            no: 'Skyv datoer',
            en: 'Shift dates',
            es: 'Mover fechas'
        }[lang] || 'Skyv datoer';

        const t_jumpToToday = {
            no: 'Hopp til i dag',
            en: 'Jump to today',
            es: 'Ir a hoy'
        }[lang] || 'Hopp til i dag';

        const syncBannerHtml = isBehind ? `
            <div class="hkm-rp-sync-banner-bible" style="background: #fffbeb; border: 1.5px solid #fef3c7; border-radius: 16px; padding: 16px; margin-top: 12px; display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; box-shadow: 0 2px 10px rgba(245, 158, 11, 0.05); text-align: left; width: 100%; box-sizing: border-box;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span class="material-symbols-outlined" style="color: #d97706; font-size: 20px;">info</span>
                    <span style="font-size: 13px; color: #b45309; font-weight: 600;">
                        ${t_daysBehind}
                    </span>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button class="hkm-btn-secondary" onclick="window.bibleReader.shiftPlanDates('${globalPlan.id}', ${currentDayNum})" style="height: 32px !important; padding: 0 12px !important; font-size: 11.5px !important; border-radius: 8px !important; border-color: #d97706 !important; color: #d97706 !important; background: #ffffff !important; display: inline-flex; align-items: center; gap: 4px; box-shadow: none !important; cursor: pointer;">
                        <span class="material-symbols-outlined" style="font-size: 14px;">restore</span>
                        ${t_shiftDates}
                    </button>
                    <button class="hkm-btn-primary" onclick="window.bibleReader.jumpToToday('${globalPlan.id}', ${expectedDay})" style="height: 32px !important; padding: 0 12px !important; font-size: 11.5px !important; border-radius: 8px !important; background: #d97706 !important; border-color: #d97706 !important; color: #ffffff !important; display: inline-flex; align-items: center; gap: 4px; box-shadow: none !important; cursor: pointer;">
                        <span class="material-symbols-outlined" style="font-size: 14px;">fast_forward</span>
                        ${t_jumpToToday}
                    </button>
                </div>
            </div>
        ` : '';

        // Generate YouVersion calendar strip HTML
        let dayItemsHtml = '';
        for (let d = 1; d <= totalDays; d++) {
            const isCompleted = userPlan.completedDays && userPlan.completedDays.includes(d);
            const isActive = d === currentDayNum;
            dayItemsHtml += `
                <div class="hkm-rp-day-strip-item-v2 ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}" 
                     onclick="window.bibleReader.selectReadingPlanDay(${d})" 
                     title="Dag ${d}">
                    <span class="day-num">${d}</span>
                    ${isCompleted ? '<span class="check-tick">✓</span>' : '<span class="day-dot">•</span>'}
                </div>
            `;
        }

        container.className = 'hkm-rp-header-wrapper';

        container.innerHTML = `
            <!-- 1. Day Selector Strip (YouVersion style) -->
            <div class="hkm-rp-day-strip-v2">
                ${dayItemsHtml}
            </div>

            <!-- 2. Info status row -->
            <div class="hkm-rp-info-bar-v2">
                <span class="day-count">${lang === 'en' ? 'Day' : (lang === 'es' ? 'Día' : 'Dag')} ${currentDayNum} av ${totalDays}</span>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <button onclick="window.bibleReader.openAdjustPlanDatesModal('${globalPlan.id}', ${currentDayNum})" style="background: none; border: none; color: #d17d39; font-size: 11.5px; font-weight: 700; cursor: pointer; text-decoration: underline; padding: 0;">
                        ${lang === 'en' ? 'Adjust dates' : (lang === 'es' ? 'Ajustar fechas' : 'Tilpass datoer')}
                    </button>
                    ${isBehind 
                        ? `<span class="behind-badge">${expectedDay - currentDayNum} ${lang === 'en' ? 'days behind' : (lang === 'es' ? 'días atr.' : 'dg bak')}</span>` 
                        : `<span class="on-track-badge">${lang === 'en' ? 'On track' : (lang === 'es' ? 'En marcha' : 'I rute')}</span>`
                    }
                </div>
            </div>

            <!-- 3. Minimal navigation and completion controls -->
            <div class="hkm-rp-buttons-row-minimal">
                <button class="hkm-rp-btn-nav-minimal" onclick="window.bibleReader.selectReadingPlanDay(${currentDayNum - 1})" ${currentDayNum <= 1 ? 'disabled' : ''}>
                    <span class="material-symbols-outlined" style="font-size: 18px;">chevron_left</span>
                </button>
                
                <button class="hkm-btn-devotional-trigger-minimal" onclick="window.bibleReader.openDevotionalWizard('${globalPlan.id}', ${currentDayNum})">
                    <span class="material-symbols-outlined" style="font-size: 18px;">auto_stories</span>
                    <span>${isPrayerApp ? (lang === 'en' ? 'Start prayer' : (lang === 'es' ? 'Comenzar' : 'Start bønn')) : (lang === 'en' ? 'Read devotion' : (lang === 'es' ? 'Leer' : 'Vis andakt'))}</span>
                </button>

                <button class="hkm-btn-complete-minimal ${isCurrentDayCompleted ? 'completed' : ''}" id="rp-complete-day-btn">
                    <span class="material-symbols-outlined" id="btn-icon" style="font-variation-settings: 'FILL' 1; font-size: 18px;">${isCurrentDayCompleted ? 'check_circle' : 'favorite'}</span>
                    <span id="btn-text">${completeLabel}</span>
                </button>
                
                <button class="hkm-rp-btn-nav-minimal" onclick="window.bibleReader.selectReadingPlanDay(${currentDayNum + 1})" ${currentDayNum >= totalDays ? 'disabled' : ''}>
                    <span class="material-symbols-outlined" style="font-size: 18px;">chevron_right</span>
                </button>
            </div>

            ${syncBannerHtml}
        `;

        // Wire up mobile complete day button
        const mobileCompleteBtn = container.querySelector('#rp-complete-day-btn');
        if (mobileCompleteBtn) {
            mobileCompleteBtn.onclick = () => {
                this.toggleActivePlanDayCompletion(mobileCompleteBtn);
            };
        }
    }

    updateUrlParams() {
        const url = new URL(window.location.href);
        url.searchParams.set('plan', this.activePlanId);
        url.searchParams.set('day', this.activePlanDay);
        window.history.pushState({}, '', url.toString());

        const relativeUrl = url.pathname + url.search;
        this.safeSetLocalStorage('hkm_last_reading_plan_url', relativeUrl);

        const calendarLinks = document.querySelectorAll('.header-reading-plans-btn');
        calendarLinks.forEach(link => {
            link.href = relativeUrl;
        });
    }

    async saveProgress() {
        if (this.currentUser) {
            const db = this.getFirestore();
            if (db) {
                const ref = db.collection('users')
                    .doc(this.currentUser.uid)
                    .collection('reading_plans')
                    .doc(this.activePlanId);
                await ref.set(this.userPlanProgress, { merge: true });
            }
        } else {
            this.safeSetLocalStorage('hkm_reading_plan_progress_' + this.activePlanId, JSON.stringify(this.userPlanProgress));
        }
    }

    async openDevotionalWizard(planId, dayNumber, startStep = 1) {
        const targetDay = parseInt(dayNumber, 10) || 1;
        let globalPlan = this.activePlanData;
        let dayConfig = null;

        if (globalPlan) {
            if (window.contentManager && typeof window.contentManager.getLocalizedContentItem === 'function') {
                globalPlan = window.contentManager.getLocalizedContentItem(globalPlan);
            }
            if (globalPlan.days) {
                dayConfig = globalPlan.days.find(d => parseInt(d.dayNumber, 10) === targetDay) || globalPlan.days[0];
            }
        }

        if (!dayConfig) {
            const db = await this.getFirestoreAsync(10000);
            if (db) {
                let globalPlanSnap = await db.collection('reading_plans').doc(planId).get();
                if (!globalPlanSnap.exists) {
                    try {
                        const snap = await db.collection('reading_plans').get();
                        const target = planId.toLowerCase().trim();
                        snap.forEach(d => {
                            const data = d.data();
                            if (d.id.toLowerCase() === target || (data.slug && data.slug.toLowerCase() === target) || (data.title && data.title.toLowerCase().includes(target))) {
                                globalPlanSnap = { exists: true, id: d.id, data: () => data };
                            }
                        });
                    } catch (err) {
                        console.warn("[BibleReader] Fallback global plan snap search failed:", err);
                    }
                }
                if (globalPlanSnap && globalPlanSnap.exists) {
                    const raw = { id: globalPlanSnap.id, ...globalPlanSnap.data() };
                    if (window.contentManager && typeof window.contentManager.getLocalizedContentItem === 'function') {
                        globalPlan = window.contentManager.getLocalizedContentItem(raw);
                    } else {
                        globalPlan = raw;
                    }
                    if (globalPlan.days) {
                        dayConfig = globalPlan.days.find(d => parseInt(d.dayNumber, 10) === targetDay) || globalPlan.days[0];
                    }
                }
            }
        }

        if (!dayConfig) {
            alert("Dagens andakt er ikke konfigurert.");
            return;
        }

        let modal = document.getElementById('hkm-devotional-modal');
        if (modal) modal.remove();

        modal = document.createElement('div');
        modal.id = 'hkm-devotional-modal';
        modal.className = 'hkm-devotional-overlay';
        
        document.body.appendChild(modal);

        let scriptureHtml = '<p style="text-align: center; color: #64748b;">Henter bibeltekst...</p>';
        try {
            scriptureHtml = await this.fetchAndFilterVersesText(dayConfig.verses);
        } catch (e) {
            console.error("Failed to fetch scripture text for devotional:", e);
            scriptureHtml = `<p style="text-align: center; color: #ef4444;">Kunne ikke hente bibelteksten for: <strong>${dayConfig.verses}</strong></p>`;
        }

        this.renderDevotionalStep(modal, globalPlan, dayNumber, dayConfig, startStep, scriptureHtml);
    }

    async fetchAndFilterVersesText(versesText) {
        if (!versesText || typeof versesText !== 'string') {
            throw new Error("No verses specified");
        }
        const input = versesText.trim();

        // Helper to parse single passage
        const parseSinglePassage = (passageStr) => {
            let clean = passageStr.replace(/\(.*?\)/g, '').trim();

            // Cross-book range e.g. "1. Mosebok 40 til 2. Mosebok 2"
            const tilMatch = clean.match(/^(.+?)\s+(?:til|to|a)\s+(.+)$/i);
            if (tilMatch) {
                return {
                    type: 'cross_book_range',
                    startRef: parseSinglePassage(tilMatch[1]),
                    endRef: parseSinglePassage(tilMatch[2]),
                    raw: passageStr
                };
            }

            // Format 1: Chapter range: "Ester 1-3", "Ester 4-7", "1. Mosebok 1-3"
            const chapRangeRegex = /^(\d+)?\s*\.?\s*([a-zæøå\s]+)\s*(\d+)\s*-\s*(\d+)$/i;
            let match = clean.match(chapRangeRegex);
            if (match) {
                const prefix = match[1] || '';
                const name = match[2].trim();
                return {
                    type: 'chap_range',
                    bookQuery: prefix ? `${prefix} ${name}` : name,
                    startChap: parseInt(match[3], 10),
                    endChap: parseInt(match[4], 10),
                    raw: passageStr
                };
            }

            // Format 2: Verse range: "Rut 2:1-10", "Johannes 3:16-21"
            const verseRangeRegex = /^(\d+)?\s*\.?\s*([a-zæøå\s]+)\s*(\d+)[\:\.]\s*(\d+)(?:\s*-\s*(\d+))?$/i;
            match = clean.match(verseRangeRegex);
            if (match) {
                const prefix = match[1] || '';
                const name = match[2].trim();
                return {
                    type: 'verse_range',
                    bookQuery: prefix ? `${prefix} ${name}` : name,
                    startChap: parseInt(match[3], 10),
                    endChap: parseInt(match[3], 10),
                    startVerse: parseInt(match[4], 10),
                    endVerse: match[5] ? parseInt(match[5], 10) : parseInt(match[4], 10),
                    raw: passageStr
                };
            }

            // Format 3: Single chapter: "Rut 1", "Ester 4"
            const singleChapRegex = /^(\d+)?\s*\.?\s*([a-zæøå\s]+)\s*(\d+)$/i;
            match = clean.match(singleChapRegex);
            if (match) {
                const prefix = match[1] || '';
                const name = match[2].trim();
                return {
                    type: 'single_chap',
                    bookQuery: prefix ? `${prefix} ${name}` : name,
                    startChap: parseInt(match[3], 10),
                    endChap: parseInt(match[3], 10),
                    raw: passageStr
                };
            }

            return { type: 'unknown', bookQuery: clean, raw: passageStr };
        };

        // Split multi-passage references e.g. "Hosea 10-13 & Åpenbaringen 7"
        const parts = input.split(/\s+&\s+|\s+og\s+|\s+and\s+|\s+y\s+/i);

        const fetchPassageHtml = async (parsed) => {
            if (parsed.type === 'cross_book_range') {
                const html1 = await fetchPassageHtml(parsed.startRef);
                const html2 = await fetchPassageHtml(parsed.endRef);
                return html1 + html2;
            }

            const q = (parsed.bookQuery || '').toLowerCase().trim();
            let matchedBook = null;

            if (this.books && Array.isArray(this.books)) {
                matchedBook = this.books.find(b => {
                    const bName = b.name.toLowerCase();
                    const bId = String(b.id).toLowerCase();
                    return bName === q || bName.startsWith(q) || bName.includes(q) || bId === q;
                });
            }

            if (!matchedBook && typeof norwegianBookToId !== 'undefined') {
                const id = norwegianBookToId[q];
                if (id && this.books) {
                    matchedBook = this.books.find(b => String(b.id) === String(id));
                }
            }

            if (!matchedBook) {
                // Fallback: try search by first word
                const firstWord = q.split(' ')[0];
                if (this.books) {
                    matchedBook = this.books.find(b => b.name.toLowerCase().startsWith(firstWord));
                }
            }

            if (!matchedBook) {
                return `<p style="color: #94a3b8; font-style: italic;">${parsed.raw || input}</p>`;
            }

            if (parsed.type === 'chap_range') {
                let combinedHtml = '';
                for (let c = parsed.startChap; c <= parsed.endChap; c++) {
                    const chapterId = `${matchedBook.id}_${c}`;
                    try {
                        const res = await fetch(`/api/bible/bibles/${this.selectedBibleId}/chapters/${chapterId}`);
                        const payload = await res.json();
                        if (payload.data && payload.data.content) {
                            combinedHtml += `<h4 style="font-size: 1.15em; font-weight: 700; color: #1B4965; margin-top: ${c === parsed.startChap ? '0' : '24px'}; margin-bottom: 12px; font-family: system-ui, -apple-system, sans-serif;">${matchedBook.name} ${c}</h4>`;
                            combinedHtml += payload.data.content;
                        }
                    } catch (err) {
                        console.warn(`Failed to load chapter ${chapterId}:`, err);
                    }
                }
                return combinedHtml || `<p style="color: #94a3b8;">${matchedBook.name} ${parsed.startChap}-${parsed.endChap}</p>`;
            }

            const chapNum = parsed.startChap || 1;
            const chapterId = `${matchedBook.id}_${chapNum}`;
            const res = await fetch(`/api/bible/bibles/${this.selectedBibleId}/chapters/${chapterId}`);
            const payload = await res.json();

            if (!payload.data || !payload.data.content) {
                return `<p style="color: #94a3b8;">${matchedBook.name} ${chapNum}</p>`;
            }

            if (parsed.type === 'verse_range' && parsed.startVerse) {
                const parser = new DOMParser();
                const doc = parser.parseFromString(payload.data.content, 'text/html');
                const paragraphs = doc.querySelectorAll('p');

                let filteredHtml = '';
                let foundAny = false;

                for (const p of paragraphs) {
                    const sups = p.querySelectorAll('sup.v');
                    if (sups.length > 0) {
                        let keepParagraph = false;
                        for (const sup of sups) {
                            const vNum = parseInt(sup.innerText.trim(), 10);
                            if (vNum >= parsed.startVerse && vNum <= parsed.endVerse) {
                                keepParagraph = true;
                                foundAny = true;
                            }
                        }
                        if (keepParagraph) {
                            filteredHtml += p.outerHTML;
                        }
                    }
                }

                if (foundAny) return filteredHtml;
            }

            return payload.data.content;
        };

        let resultHtml = '';
        for (const part of parts) {
            const parsed = parseSinglePassage(part);
            const passageHtml = await fetchPassageHtml(parsed);
            resultHtml += passageHtml;
        }

        return resultHtml || `<p style="text-align: center; color: #64748b;">${input}</p>`;
    }

    formatMarkdownText(text) {
        if (!text) return '';
        
        const cleanText = text.replace(/\r\n/g, '\n');
        const paragraphs = cleanText.split(/\n\s*\n/);
        
        return paragraphs.map((p, idx) => {
            const trimmed = p.trim();
            if (!trimmed) return '';
            
            // Check for Markdown headings
            if (trimmed.startsWith('###')) {
                const marginTop = idx === 0 ? '0' : '16px';
                return `<h4 style="font-size: 1.15em; font-weight: 700; color: #1B4965; margin-top: ${marginTop}; margin-bottom: 8px; font-family: system-ui, -apple-system, sans-serif; line-height: 1.3;">${trimmed.replace(/^###\s*/, '')}</h4>`;
            }
            if (trimmed.startsWith('##')) {
                const marginTop = idx === 0 ? '0' : '20px';
                return `<h3 style="font-size: 1.3em; font-weight: 700; color: #1B4965; margin-top: ${marginTop}; margin-bottom: 10px; font-family: system-ui, -apple-system, sans-serif; line-height: 1.3;">${trimmed.replace(/^##\s*/, '')}</h3>`;
            }
            if (trimmed.startsWith('#')) {
                const marginTop = idx === 0 ? '0' : '24px';
                return `<h2 style="font-size: 1.5em; font-weight: 700; color: #1B4965; margin-top: ${marginTop}; margin-bottom: 12px; font-family: system-ui, -apple-system, sans-serif; line-height: 1.3;">${trimmed.replace(/^#\s*/, '')}</h2>`;
            }
            
            // Strip any asterisks/formatting from text to do a clean prefix search
            const cleanForSearch = trimmed.replace(/\*/g, '').trim().toLowerCase();
            
            const prefixes = [
                // Norwegian
                { key: 'be/reflekter:', label: 'Be / Reflekter' },
                { key: 'bønn / refleksjon:', label: 'Bønn & Refleksjon' },
                { key: 'bønn:', label: 'Bønn' },
                { key: 'reflekter:', label: 'Refleksjon' },
                { key: 'be:', label: 'Bønn' },
                // English
                { key: 'pray/reflect:', label: 'Pray / Reflect' },
                { key: 'prayer / reflection:', label: 'Prayer & Reflection' },
                { key: 'prayer:', label: 'Prayer' },
                { key: 'reflect:', label: 'Reflection' },
                { key: 'pray:', label: 'Prayer' },
                // Spanish
                { key: 'orar/reflexionar:', label: 'Orar / Reflexionar' },
                { key: 'oración / reflexión:', label: 'Oración y Reflexión' },
                { key: 'oración:', label: 'Oración' },
                { key: 'reflexionar:', label: 'Reflexión' },
                { key: 'orar:', label: 'Oración' }
            ];
            
            let isPrayerOrReflection = false;
            let matchPrefix = '';
            let remainingText = trimmed;
            
            for (const pref of prefixes) {
                if (cleanForSearch.startsWith(pref.key)) {
                    isPrayerOrReflection = true;
                    matchPrefix = pref.label;
                    const colonIndex = trimmed.indexOf(':');
                    if (colonIndex !== -1) {
                        remainingText = trimmed.substring(colonIndex + 1).trim();
                        remainingText = remainingText.replace(/^[\s\*]+|[\s\*]+$/g, '').trim();
                    }
                    break;
                }
            }
            
            if (isPrayerOrReflection) {
                let formatted = remainingText;
                formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
                formatted = formatted.replace(/\n/g, '<br>');
                
                return `
                    <div class="hkm-devotional-prayer-box" style="margin-top: 16px; margin-bottom: 16px; background: rgba(209, 125, 57, 0.05); border-left: 4px solid #d17d39; padding: 20px 24px; border-radius: 8px; box-shadow: none; border-top: none; border-right: none; border-bottom: none; display: block !important;">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; color: #d17d39; font-weight: 700; font-family: system-ui, -apple-system, sans-serif; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; line-height: 1;">
                            <span class="material-symbols-outlined" style="font-size: 16px;">auto_awesome</span>
                            <span>${matchPrefix}</span>
                        </div>
                        <div style="font-family: 'Merriweather', 'Georgia', serif; font-style: italic; font-size: 17px; line-height: 1.7; color: inherit;">
                            ${formatted}
                        </div>
                    </div>
                `;
            }
            
            // Check for blockquote or special focus paragraph
            if (trimmed.startsWith('>')) {
                let quoteText = trimmed.replace(/^>\s*/, '').trim();
                let formatted = quoteText;
                formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
                formatted = formatted.replace(/\n/g, '<br>');
                return `
                    <blockquote style="margin: 16px 0; padding: 16px 24px; border-left: 4px solid var(--bible-primary, #1B4965); background: rgba(27, 73, 101, 0.03); font-family: 'Merriweather', 'Georgia', serif; font-style: italic; font-size: 17px; line-height: 1.7; color: var(--text-muted, #475569); border-radius: 0 8px 8px 0; border-top: none; border-right: none; border-bottom: none;">
                        ${formatted}
                    </blockquote>
                `;
            }
            
            // Format inline bold/italic
            let formatted = trimmed;
            formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
            
            // Replace single newlines within the paragraph with `<br>` to preserve line breaks
            formatted = formatted.replace(/\n/g, '<br>');
            
            return `<p style="margin-bottom: 16px; line-height: 1.8; font-family: 'Merriweather', 'Georgia', serif; font-size: 17px; color: var(--text-base, #334155);">${formatted}</p>`;
        }).join('');
    }

    formatDevotionalText(text) {
        if (!text) return '';
        
        // If the text is not HTML, fallback to markdown parser
        const hasHtml = /<[a-z][\s\S]*>/i.test(text);
        if (!hasHtml) {
            return this.formatMarkdownText(text);
        }
        
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(`<div>${text}</div>`, 'text/html');
            const container = doc.body.firstChild;
            
            if (!container) return text;
            
            // Process child nodes
            const processedNodes = Array.from(container.childNodes).map((node, idx) => {
                if (node.nodeType === 3) { // Node.TEXT_NODE
                    const trimmed = node.textContent.trim();
                    if (!trimmed) return '';
                    return `<p style="margin-bottom: 16px; line-height: 1.8; font-family: 'Merriweather', 'Georgia', serif; font-size: 17px; color: var(--text-base, #334155);">${trimmed}</p>`;
                }
                
                if (node.nodeType === 1) { // Node.ELEMENT_NODE
                    const tagName = node.tagName.toLowerCase();
                    const innerHtml = node.innerHTML.trim();
                    const textContent = node.textContent.trim();
                    
                    // 1. Check if it's a heading (e.g. h1/h2/h3 or <p><strong>Heading</strong></p>)
                    const isHeading = tagName === 'h1' || tagName === 'h2' || tagName === 'h3' || tagName === 'h4' ||
                                      (tagName === 'p' && node.children.length === 1 && node.firstElementChild && node.firstElementChild.tagName.toLowerCase() === 'strong');
                    
                    if (isHeading) {
                        const marginTop = idx === 0 ? '0' : '20px';
                        return `<h3 style="font-size: 1.3em; font-weight: 700; color: var(--text-base, #1B4965); margin-top: ${marginTop}; margin-bottom: 10px; font-family: system-ui, -apple-system, sans-serif; line-height: 1.3;">${textContent}</h3>`;
                    }
                    
                    // 2. Check if the text matches any prayer/reflection prefixes
                    const prefixes = [
                        { key: 'be/reflekter:', label: 'Be / Reflekter' },
                        { key: 'bønn / refleksjon:', label: 'Bønn & Refleksjon' },
                        { key: 'bønn:', label: 'Bønn' },
                        { key: 'reflekter:', label: 'Refleksjon' },
                        { key: 'be:', label: 'Bønn' },
                        { key: 'pray/reflect:', label: 'Pray / Reflect' },
                        { key: 'prayer / reflection:', label: 'Prayer & Reflection' },
                        { key: 'prayer:', label: 'Prayer' },
                        { key: 'reflect:', label: 'Reflection' },
                        { key: 'pray:', label: 'Prayer' },
                        { key: 'orar/reflexionar:', label: 'Orar / Reflexionar' },
                        { key: 'oración / reflexión:', label: 'Oración y Reflexión' },
                        { key: 'oración:', label: 'Oración' },
                        { key: 'reflexionar:', label: 'Reflexión' },
                        { key: 'orar:', label: 'Oración' }
                    ];
                    
                    const cleanTextForSearch = textContent.replace(/\*/g, '').trim().toLowerCase();
                    let matchedPrefix = null;
                    for (const pref of prefixes) {
                        if (cleanTextForSearch.startsWith(pref.key)) {
                            matchedPrefix = pref;
                            break;
                        }
                    }
                    
                    if (matchedPrefix) {
                        let prayerContent = textContent;
                        const colonIndex = prayerContent.indexOf(':');
                        if (colonIndex !== -1) {
                            prayerContent = prayerContent.substring(colonIndex + 1).trim();
                            prayerContent = prayerContent.replace(/^[\s\*]+|[\s\*]+$/g, '').trim();
                        }
                        
                        return `
                            <div class="hkm-devotional-prayer-box" style="margin-top: 16px; margin-bottom: 16px; background: rgba(209, 125, 57, 0.05); border-left: 4px solid #d17d39; padding: 20px 24px; border-radius: 8px; box-shadow: none; border-top: none; border-right: none; border-bottom: none; display: block !important;">
                                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; color: #d17d39; font-weight: 700; font-family: system-ui, -apple-system, sans-serif; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; line-height: 1;">
                                    <span class="material-symbols-outlined" style="font-size: 16px;">auto_awesome</span>
                                    <span>${matchedPrefix.label}</span>
                                </div>
                                <div style="font-family: 'Merriweather', 'Georgia', serif; font-style: italic; font-size: 17px; line-height: 1.7; color: inherit;">
                                    ${prayerContent}
                                </div>
                            </div>
                        `;
                    }
                    
                    // 3. Blockquotes
                    if (tagName === 'blockquote') {
                        return `
                            <blockquote style="margin: 16px 0; padding: 16px 24px; border-left: 4px solid var(--bible-primary, #1B4965); background: rgba(27, 73, 101, 0.03); font-family: 'Merriweather', 'Georgia', serif; font-style: italic; font-size: 17px; line-height: 1.7; color: var(--text-muted, #475569); border-radius: 0 8px 8px 0; border-top: none; border-right: none; border-bottom: none;">
                                ${innerHtml}
                            </blockquote>
                        `;
                    }
                    
                    // 4. Default paragraph or element, preserve original style
                    return `<p style="margin-bottom: 16px; line-height: 1.8; font-family: 'Merriweather', 'Georgia', serif; font-size: 17px; color: var(--text-base, #334155);">${innerHtml}</p>`;
                }
                
                return '';
            });
            
            return processedNodes.join('');
        } catch (e) {
            console.error("DOMParser error formatting devotional HTML:", e);
            return this.formatMarkdownText(text);
        }
    }

    renderDevotionalStep(modal, plan, dayNumber, dayConfig, step, scriptureHtml) {
        modal.innerHTML = '';
        
        const stepContainer = document.createElement('div');
        stepContainer.className = 'hkm-devotional-content';
        modal.appendChild(stepContainer);
        const lang = document.documentElement.lang || 'no';
        const isPrayerApp = plan.title && (
            plan.title.toLowerCase().includes('bønn') ||
            plan.title.toLowerCase().includes('prayer') ||
            plan.title.toLowerCase().includes('oración')
        );

        const fullTitleText = plan.title || '';
        let shortTitleText = fullTitleText;
        if (shortTitleText.includes(':')) {
            shortTitleText = shortTitleText.split(':')[0].trim();
        }
        if (shortTitleText.includes('-')) {
            shortTitleText = shortTitleText.split('-')[0].trim();
        }
        if (shortTitleText.includes('–')) {
            shortTitleText = shortTitleText.split('–')[0].trim();
        }
        if (shortTitleText.includes('|')) {
            shortTitleText = shortTitleText.split('|')[0].trim();
        }

        // Abbreviate common long plan titles to fit nicely in mobile headers
        if (lang === 'en') {
            shortTitleText = shortTitleText
                .replace(/Gospel of John/gi, 'John')
                .replace(/Gospel of Matthew/gi, 'Matthew')
                .replace(/Gospel of Mark/gi, 'Mark')
                .replace(/Gospel of Luke/gi, 'Luke')
                .replace(/Acts of the Apostles/gi, 'Acts')
                .replace(/Revelation/gi, 'Rev.')
                .replace(/First/gi, '1st')
                .replace(/Second/gi, '2nd')
                .replace(/Third/gi, '3rd');
        } else if (lang === 'es') {
            shortTitleText = shortTitleText
                .replace(/Evangelio de Juan/gi, 'Juan')
                .replace(/Evangelio de Mateo/gi, 'Mateo')
                .replace(/Evangelio de Marcos/gi, 'Marcos')
                .replace(/Evangelio de Lucas/gi, 'Lucas')
                .replace(/Hechos de los Apóstoles/gi, 'Hechos')
                .replace(/Apocalipsis/gi, 'Apoc.')
                .replace(/Primero/gi, '1.º')
                .replace(/Segundo/gi, '2.º');
        } else {
            // Default: Norwegian
            shortTitleText = shortTitleText
                .replace(/Johannesevangeliet/gi, 'Johannesev.')
                .replace(/Matteusevangeliet/gi, 'Matteusev.')
                .replace(/Markusevangeliet/gi, 'Markusev.')
                .replace(/Lukasevangeliet/gi, 'Lukasev.')
                .replace(/Apostlenes gjerninger/gi, 'Apostlenes gj.')
                .replace(/Åpenbaringen/gi, 'Åpenb.')
                .replace(/Første/gi, '1.')
                .replace(/Andre/gi, '2.')
                .replace(/Tredje/gi, '3.')
                .replace(/Fjerde/gi, '4.')
                .replace(/Femte/gi, '5.');
        }

        // Truncate fallback for mobile if shortTitleText remains too long
        if (shortTitleText.length > 22) {
            shortTitleText = shortTitleText.substring(0, 19) + '...';
        }
        // Step Label mapping
        let stepLabel = 'ANDAKT';
        if (step === 1) stepLabel = isPrayerApp ? (lang === 'en' ? 'PRAYER' : (lang === 'es' ? 'ORACIÓN' : 'BØNN')) : (lang === 'en' ? 'DEVOTION' : (lang === 'es' ? 'DEVOCIONAL' : 'ANDAKT'));
        else if (step === 2) stepLabel = lang === 'en' ? 'BIBLE' : (lang === 'es' ? 'BIBLIA' : 'BIBEL');
        else if (step === 3) stepLabel = lang === 'en' ? 'RESOURCES' : (lang === 'es' ? 'RECURSOS' : 'RESSURSER');
        else if (step === 4) stepLabel = lang === 'en' ? 'NOTES' : (lang === 'es' ? 'NOTAS' : 'NOTAT');
        else if (step === 5) stepLabel = lang === 'en' ? 'COMPLETED' : (lang === 'es' ? 'COMPLETADO' : 'FULLFØRT');

        // Generate dynamic content HTML
        let stepContentHtml = '';
        if (step === 1) {
            const heading = isPrayerApp 
                ? (lang === 'en' ? 'Prayer Focus' : (lang === 'es' ? 'Enfoque de oración' : 'Bønnefokus'))
                : (lang === 'en' ? 'Daily Devotional' : (lang === 'es' ? 'Devocional' : 'Dagens Andakt'));
            const text = dayConfig.prayerFocus || (isPrayerApp ? 'Be over skriftstedene du leser i dag.' : 'Reflekter over ordene du har lest.');
            
            if (isPrayerApp) {
                stepContentHtml = `
                    <h3 class="hkm-devotional-step-title">${heading}</h3>
                    <div class="hkm-devotional-prayer-box">${text}</div>
                `;
            } else {
                const formattedText = this.formatDevotionalText(text);
                const startsWithHeading = formattedText.trim().startsWith('<h1') || 
                                          formattedText.trim().startsWith('<h2') || 
                                          formattedText.trim().startsWith('<h3') || 
                                          formattedText.trim().startsWith('<h4');
                
                if (startsWithHeading) {
                    stepContentHtml = `
                        <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #d17d39; margin-bottom: 8px; font-family: system-ui, -apple-system, sans-serif; line-height: 1.2;">${heading}</div>
                        <div class="hkm-devotional-text-serif" style="text-align: left; font-style: normal !important;">
                            ${formattedText}
                        </div>
                    `;
                } else {
                    stepContentHtml = `
                        <h3 class="hkm-devotional-step-title">${heading}</h3>
                        <div class="hkm-devotional-text-serif" style="text-align: left; font-style: normal !important;">
                            ${formattedText}
                        </div>
                    `;
                }
            }
        } else if (step === 2) {
            const heading = dayConfig.verses || 'BIBEL';
            stepContentHtml = `
                <h3 class="hkm-devotional-step-title">${heading}</h3>
                <div class="hkm-devotional-text-serif">${scriptureHtml}</div>
            `;
        } else if (step === 3) {
            const heading = lang === 'en' ? 'Resources' : (lang === 'es' ? 'Recursos' : 'Dypere Dykk');
            let resourcesListHtml = '';
            if (dayConfig.resources && dayConfig.resources.length > 0) {
                dayConfig.resources.forEach(res => {
                    resourcesListHtml += `
                        <a href="${res.url || '#'}" target="_blank" class="hkm-rp-card" style="text-decoration: none; display: block; margin: 0 0 12px 0;">
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <span class="material-symbols-outlined" style="color: #d17d39; font-size: 24px;">
                                    ${res.type === 'video' ? 'play_circle' : res.type === 'podcast' ? 'podcasts' : 'article'}
                                </span>
                                <div>
                                    <div style="font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 2px;">${res.title}</div>
                                    <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #94a3b8;">${res.type}</div>
                                </div>
                            </div>
                        </a>
                    `;
                });
            } else {
                resourcesListHtml = `
                    <p style="font-size: 13px; color: #94a3b8; font-style: italic; text-align: center; padding: 20px 0;">
                        ${lang === 'en' ? 'No extra resources for this day.' : (lang === 'es' ? 'No hay recursos adicionales.' : 'Ingen ekstra ressurser tilknyttet denne dagen.')}
                    </p>
                `;
            }
            stepContentHtml = `
                <h3 class="hkm-devotional-step-title">${heading}</h3>
                <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 24px;">
                    ${resourcesListHtml}
                </div>
            `;
        } else if (step === 4) {
            const heading = lang === 'en' ? 'Notes' : (lang === 'es' ? 'Reflexión' : 'Notat & Refleksjon');
            const desc = lang === 'en' 
                ? 'Write down what God spoke to you today, or write a prayer. Saved to your notes.'
                : (lang === 'es' ? 'Escribe lo que Dios te habló hoy o escribe una oración.' : 'Noter ned hva Gud talte til deg gjennom ordene du leste, eller skriv en bønn.');
            stepContentHtml = `
                <h3 class="hkm-devotional-step-title">${heading}</h3>
                <p style="font-size: 14px; color: #64748b; margin-bottom: 16px; line-height: 1.5;">${desc}</p>
                <textarea id="hkm-yv-reflection-input" class="hkm-devotional-reflection-textarea" placeholder="${lang === 'en' ? 'Write here...' : (lang === 'es' ? 'Escribe aquí...' : 'Skriv dine tanker her...')}" style="width: 100%; box-sizing: border-box;"></textarea>
            `;
        } else if (step === 5) {
            const planTypeWord = isPrayerApp 
                ? (lang === 'en' ? 'prayer app' : (lang === 'es' ? 'aplicación de oración' : 'bønneappen'))
                : (lang === 'en' ? 'reading plan' : (lang === 'es' ? 'plan de lectura' : 'leseplanen'));
            
            const celebrationTitle = isPrayerApp 
                ? (lang === 'en' ? 'Prayer completed!' : (lang === 'es' ? '¡Oración completada!' : 'Bønn fullført!'))
                : (lang === 'en' ? 'Devotional completed!' : (lang === 'es' ? '¡Devocional completado!' : 'Andakt fullført!'));
                
            const celebrationDesc = lang === 'en' 
                ? `Great job! You have completed day ${dayNumber} of the ${planTypeWord} "${plan.title}".`
                : (lang === 'es' 
                    ? `¡Buen trabajo! Has completado el día ${dayNumber} de la ${planTypeWord} "${plan.title}".`
                    : `Kjempebra jobbet! Du har fullført dag ${dayNumber} av ${planTypeWord} "${plan.title}".`);

            stepContentHtml = `
                <div style="font-size: 64px; text-align: center; margin-bottom: 16px;">🎉</div>
                <h3 class="hkm-celebration-title" style="text-align: center; color: #1B4965; font-size: 24px; font-weight: 700; margin-bottom: 8px;">${celebrationTitle}</h3>
                <p class="hkm-celebration-desc" style="text-align: center; color: #64748b; font-size: 15px; margin-bottom: 24px;">${celebrationDesc}</p>
            `;
        }

        // Render YouVersion Layout
        stepContainer.innerHTML = `
            <div class="hkm-yv-wrapper">
                <!-- 1. Top Header Bar -->
                <div class="hkm-yv-header">
                    <button class="hkm-yv-header-btn-close" id="hkm-yv-btn-close" title="Lukk">
                        <span class="material-symbols-outlined">arrow_back</span>
                    </button>
                    
                    <div class="hkm-yv-header-title">
                        <span class="hkm-yv-header-avatar">${fullTitleText.charAt(0)}</span>
                        <span class="hkm-yv-header-text hkm-yv-header-text-full">${fullTitleText}</span>
                        <span class="hkm-yv-header-text hkm-yv-header-text-short">${shortTitleText}</span>
                    </div>
                    
                    <div class="hkm-yv-header-actions">
                        <button class="hkm-yv-action-btn" id="hkm-yv-btn-audio" title="Les opp">
                            <span class="material-symbols-outlined">volume_up</span>
                        </button>
                        <button class="hkm-yv-action-btn" id="hkm-yv-btn-font" title="Tekststørrelse">
                            <span style="font-weight: 800; font-size: 14px;">AA</span>
                        </button>
                        <button class="hkm-yv-action-btn" id="hkm-yv-btn-share" title="Del">
                            <span class="material-symbols-outlined">share</span>
                        </button>
                    </div>
                </div>
                
                <!-- 2. Scrollable Body Content -->
                <div class="hkm-yv-body">
                    <div class="hkm-yv-body-inner">
                        ${stepContentHtml}
                    </div>
                </div>
                
                <!-- 3. Bottom Navigation Bar -->
                <div class="hkm-yv-footer">
                    <button class="hkm-yv-nav-circle-btn" id="btn-yv-back" ${step === 1 ? 'disabled style="opacity: 0.3; pointer-events: none;"' : ''}>
                        <span class="material-symbols-outlined">chevron_left</span>
                    </button>
                    
                    <div class="hkm-yv-footer-pill">
                        ${stepLabel}
                    </div>
                    
                    <button class="hkm-yv-nav-circle-btn active" id="btn-yv-next">
                        <span class="material-symbols-outlined">${step === 4 ? 'check' : step === 5 ? 'close' : 'chevron_right'}</span>
                    </button>
                </div>
            </div>
        `;
        const closeBtn = stepContainer.querySelector('#hkm-yv-btn-close');
        if (closeBtn) {
            closeBtn.onclick = () => {
                if (window.speechSynthesis) window.speechSynthesis.cancel();
                modal.remove();
                if (this.activePlanMode) {
                    this.setupReadingPlanUI(true);
                } else {
                    this.loadReadingPlan();
                }
            };
        }

        const fontBtn = stepContainer.querySelector('#hkm-yv-btn-font');
        if (fontBtn) {
            fontBtn.onclick = () => {
                const body = stepContainer.querySelector('.hkm-yv-body');
                if (body.classList.contains('font-size-large')) {
                    body.classList.remove('font-size-large');
                    body.classList.add('font-size-xlarge');
                } else if (body.classList.contains('font-size-xlarge')) {
                    body.classList.remove('font-size-xlarge');
                } else {
                    body.classList.add('font-size-large');
                }
            };
        }

        const audioBtn = stepContainer.querySelector('#hkm-yv-btn-audio');
        if (audioBtn) {
            audioBtn.onclick = () => {
                if (window.speechSynthesis) {
                    if (window.speechSynthesis.speaking) {
                        window.speechSynthesis.cancel();
                        audioBtn.querySelector('span').innerText = 'volume_up';
                        audioBtn.classList.remove('speaking');
                    } else {
                        // Extract speakable text from body inner
                        const speakText = stepContainer.querySelector('.hkm-yv-body-inner').innerText;
                        const utterance = new SpeechSynthesisUtterance(speakText);
                        utterance.lang = lang === 'en' ? 'en-US' : (lang === 'es' ? 'es-ES' : 'no-NO');
                        utterance.onend = () => {
                            audioBtn.querySelector('span').innerText = 'volume_up';
                            audioBtn.classList.remove('speaking');
                        };
                        audioBtn.querySelector('span').innerText = 'volume_off';
                        audioBtn.classList.add('speaking');
                        window.speechSynthesis.speak(utterance);
                    }
                }
            };
        }

        const shareBtn = stepContainer.querySelector('#hkm-yv-btn-share');
        if (shareBtn) {
            shareBtn.onclick = async () => {
                const shareData = {
                    title: plan.title,
                    text: `Leseplan: ${plan.title} - Dag ${dayNumber} (${dayConfig.verses})`,
                    url: window.location.href
                };
                try {
                    if (navigator.share) {
                        await navigator.share(shareData);
                    } else {
                        await navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`);
                        alert(lang === 'en' ? 'Link copied to clipboard!' : (lang === 'es' ? '¡Enlace copiado al portapapeles!' : 'Leseplan-lenke kopiert til utklippstavlen!'));
                    }
                } catch (err) {
                    console.log("Error sharing:", err);
                }
            };
        }

        // Wire up Footer Navigation listeners
        const backBtn = stepContainer.querySelector('#btn-yv-back');
        if (backBtn && step > 1) {
            backBtn.onclick = () => {
                if (window.speechSynthesis) window.speechSynthesis.cancel();
                let targetStep = step - 1;
                if (targetStep === 3 && (!dayConfig.resources || dayConfig.resources.length === 0)) {
                    targetStep = 2;
                }
                this.renderDevotionalStep(modal, plan, dayNumber, dayConfig, targetStep, scriptureHtml);
            };
        }

        const nextBtn = stepContainer.querySelector('#btn-yv-next');
        if (nextBtn) {
            nextBtn.onclick = async () => {
                if (window.speechSynthesis) window.speechSynthesis.cancel();
                
                if (step < 4) {
                    let targetStep = step + 1;
                    if (targetStep === 3 && (!dayConfig.resources || dayConfig.resources.length === 0)) {
                        targetStep = 4;
                    }
                    this.renderDevotionalStep(modal, plan, dayNumber, dayConfig, targetStep, scriptureHtml);
                } else if (step === 4) {
                    const textarea = stepContainer.querySelector('#hkm-yv-reflection-input');
                    const text = textarea ? textarea.value.trim() : '';
                    nextBtn.disabled = true;
                    
                    try {
                        await this.completeDevotionalDay(plan, dayNumber, text);
                        this.renderDevotionalStep(modal, plan, dayNumber, dayConfig, 5, scriptureHtml);
                    } catch (e) {
                        console.error("Failed to complete devotional day:", e);
                        alert("Kunne ikke lagre andakt: " + e.message);
                        nextBtn.disabled = false;
                    }
                } else if (step === 5) {
                    modal.remove();
                    this.setupReadingPlanUI(true);
                }
            };
        }
    }

    async completeDevotionalDay(plan, dayNumber, reflectionText) {
        const planId = plan.id;
        let userPlan = this.userPlanProgress;
        if (!userPlan) {
            userPlan = {
                planId: planId,
                currentDay: 1,
                completedDays: [],
                reflections: {}
            };
        }
        
        userPlan.reflections = userPlan.reflections || {};
        if (reflectionText) {
            userPlan.reflections[dayNumber] = reflectionText;
        }
        
        userPlan.completedDays = userPlan.completedDays || [];
        if (!userPlan.completedDays.includes(dayNumber)) {
            userPlan.completedDays.push(dayNumber);
        }
        
        const totalDays = plan.durationDays || plan.days.length;
        if (userPlan.completedDays.length >= totalDays) {
            userPlan.completed = true;
        } else {
            let nextDay = dayNumber + 1;
            while (nextDay <= totalDays && userPlan.completedDays.includes(nextDay)) {
                nextDay++;
            }
            if (nextDay <= totalDays) {
                userPlan.currentDay = nextDay;
            } else {
                userPlan.completed = true;
            }
        }
        
        userPlan.lastActiveAt = this.getServerTimestamp();
        this.userPlanProgress = userPlan;

        if (this.currentUser) {
            const db = this.getFirestore();
            if (db) {
                const uid = this.currentUser.uid;
                const ref = db.collection('users')
                    .doc(uid)
                    .collection('reading_plans')
                    .doc(planId);
                
                await ref.set(userPlan, { merge: true });

                if (reflectionText) {
                    await db.collection('personal_notes')
                        .add({
                            userId: uid,
                            title: `Leseplan: ${plan.title} - Dag ${dayNumber}`,
                            text: reflectionText,
                            createdAt: this.getServerTimestamp(),
                            isReadingPlanNote: true,
                            readingPlanId: planId,
                            dayNumber: dayNumber
                        });
                }
            }
        } else {
            this.safeSetLocalStorage('hkm_reading_plan_progress_' + planId, JSON.stringify(userPlan));
        }

        // Refresh UI
        await this.setupReadingPlanUI(true);
    }

    // ==========================================================================
    // Audio Player (Text-to-Speech) Functionality
    // ==========================================================================
    
    toggleAudioPlayback() {
        if (this.audioIsPlaying) {
            this.stopAudioPlayback();
        } else {
            this.startAudioPlayback();
        }
    }

    async ensureFirebaseSDK() {
        if (typeof window.firebase === 'undefined' || !window.firebase.functions) {
            if (!document.querySelector('script[src*="firebase-app-compat.js"]')) {
                const s1 = document.createElement('script');
                s1.src = "https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js";
                document.head.appendChild(s1);
                await new Promise(r => s1.onload = r);
            }
            if (!document.querySelector('script[src*="firebase-functions-compat.js"]')) {
                const s2 = document.createElement('script');
                s2.src = "https://www.gstatic.com/firebasejs/10.7.1/firebase-functions-compat.js";
                document.head.appendChild(s2);
                await new Promise(r => s2.onload = r);
            }
        }
        if (window.firebaseConfig && window.firebase && (!window.firebase.apps || !window.firebase.apps.length)) {
            window.firebase.initializeApp(window.firebaseConfig);
        }
    }

    async startAudioPlayback() {
        if (!this.dom.readingPane) return;
        
        // Find all paragraphs containing verses
        const paragraphs = Array.from(this.dom.readingPane.querySelectorAll('p'));
        if (paragraphs.length === 0) {
            alert('Kunne ikke finne tekst for opplesning i dette kapittelet.');
            return;
        }

        // Combine text of all paragraphs, stripping verse numbers for cleaner audio reading
        const textParts = paragraphs.map(p => {
            const pCopy = p.cloneNode(true);
            const sup = pCopy.querySelector('sup.v');
            if (sup) sup.remove();
            return pCopy.innerText.trim();
        }).filter(Boolean);

        const chapterText = textParts.join('\n\n');

        if (chapterText.length < 10) {
            alert('Kunne ikke finne nok tekst for opplesning.');
            return;
        }

        this.audioIsPlaying = true;
        this.audioIsPaused = false;
        this.showAudioPlayerBar();
        
        const infoDisplay = document.getElementById('audio-info-display');
        if (infoDisplay) {
            infoDisplay.textContent = 'Genererer ChatGPT AI-stemme...';
        }

        const lang = document.documentElement.lang || 'no';

        try {
            await this.ensureFirebaseSDK();
        } catch (e) {
            console.error("[BibleAudio] Failed to load Firebase SDK:", e);
        }

        // Call getBibleChapterAudio Cloud Function for ChatGPT OpenAI TTS
        if (typeof firebase !== 'undefined' && firebase.functions) {
            const callable = firebase.functions().httpsCallable('getBibleChapterAudio');
            callable({
                bookId: this.selectedBookId,
                chapterNum: this.selectedChapterId ? this.selectedChapterId.split('_')[1] : '1',
                lang: lang,
                text: chapterText,
                voice: this.audioVoice || 'onyx'
            })
            .then(result => {
                if (!this.audioIsPlaying) return;
                const audioUrl = result.data ? result.data.audioUrl : null;
                if (!audioUrl) throw new Error("Ingen lyd-URL mottatt fra serveren.");

                console.log("Playing ChatGPT AI audio:", audioUrl);
                this.bibleAudio = new Audio(audioUrl);
                this.bibleAudio.playbackRate = this.audioSpeed || 1.0;
                this.bibleAudio.onended = async () => {
                    console.log("[BibleAudio] Chapter finished. Auto-advancing to next chapter for continuous reading...");
                    try {
                        if (this.dom && this.dom.readingPane) {
                            this.dom.readingPane.querySelectorAll('.audio-playing-highlight').forEach(el => el.classList.remove('audio-playing-highlight'));
                        }
                        if (this.audioIsPlaying) {
                            await this.navigateChapter(1);
                            setTimeout(() => {
                                if (this.audioIsPlaying) {
                                    this.playAudioForCurrentChapter();
                                }
                            }, 300);
                        }
                    } catch (err) {
                        console.error("[BibleAudio] Error auto-advancing to next chapter:", err);
                    }
                };
                this.bibleAudio.onerror = (err) => {
                    console.error("[BibleAudio] Audio playback error:", err);
                    alert("Feil under avspilling av ChatGPT AI-lydfilen.");
                    this.stopAudioPlayback();
                };
                
                this.bibleAudio.play().then(() => {
                    if (infoDisplay) {
                        infoDisplay.textContent = 'Spiller av ChatGPT AI-stemme...';
                    }

                    // Set up dynamic text highlighting as audio plays
                    const paragraphLengths = paragraphs.map(p => p.innerText.trim().length);
                    const totalCharCount = paragraphLengths.reduce((a, b) => a + b, 0);

                    this.bibleAudio.ontimeupdate = () => {
                        if (!this.bibleAudio || !this.bibleAudio.duration || totalCharCount === 0) return;
                        const currentTime = this.bibleAudio.currentTime;
                        const duration = this.bibleAudio.duration;
                        const progress = currentTime / duration;
                        const targetCharIndex = progress * totalCharCount;

                        let accumulated = 0;
                        let activeIdx = 0;

                        for (let i = 0; i < paragraphLengths.length; i++) {
                            accumulated += paragraphLengths[i];
                            if (targetCharIndex <= accumulated) {
                                activeIdx = i;
                                break;
                            }
                        }

                        paragraphs.forEach((p, idx) => {
                            if (idx === activeIdx) {
                                if (!p.classList.contains('audio-playing-highlight')) {
                                    p.classList.add('audio-playing-highlight');
                                    this.scrollToVerseElement(p);
                                }
                            } else {
                                p.classList.remove('audio-playing-highlight');
                            }
                        });
                    };

                    this.updateAudioPlayerUI();
                }).catch(playErr => {
                    console.error("[BibleAudio] Audio play failed:", playErr);
                    alert("Kunne ikke starte avspilling av AI-lydfilen.");
                    this.stopAudioPlayback();
                });
            })
            .catch(err => {
                console.error("[BibleAudio] Error generating ChatGPT audio:", err);
                alert("Kunne ikke generere ChatGPT AI-lyd for dette kapittelet: " + (err.message || 'Prøv igjen om et øyeblikk'));
                this.stopAudioPlayback();
            });
        } else {
            alert('Lydtjenesten var utilgjengelig. Prøv å laste siden på nytt.');
            this.stopAudioPlayback();
        }
    }

    stopAudioPlayback() {
        if (!this.audioIsPlaying) return;
        
        this.audioIsPlaying = false;
        this.audioIsPaused = false;
        
        if (this.bibleAudio) {
            this.bibleAudio.pause();
            this.bibleAudio.onended = null;
            this.bibleAudio.onerror = null;
            this.bibleAudio.ontimeupdate = null;
            this.bibleAudio = null;
        }

        if (this.dom && this.dom.readingPane) {
            const highlights = this.dom.readingPane.querySelectorAll('.audio-playing-highlight');
            highlights.forEach(el => el.classList.remove('audio-playing-highlight'));
        }
        
        this.hideAudioPlayerBar();
    }

    toggleAudioPause() {
        if (!this.audioIsPlaying) return;
        
        const playPauseBtn = document.getElementById('audio-play-pause-toggle');
        
        if (this.audioIsPaused) {
            this.audioIsPaused = false;
            if (playPauseBtn) playPauseBtn.innerHTML = '<span class="material-symbols-outlined">pause</span>';
            this.resumeAudioPlayback();
        } else {
            this.audioIsPaused = true;
            if (playPauseBtn) playPauseBtn.innerHTML = '<span class="material-symbols-outlined">play_arrow</span>';
            this.pauseAudioPlayback();
        }
        this.updateAudioPlayerUI();
    }

    pauseAudioPlayback() {
        if (this.bibleAudio) {
            this.bibleAudio.pause();
        }
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            window.speechSynthesis.pause();
        }
    }

    resumeAudioPlayback() {
        if (this.bibleAudio) {
            this.bibleAudio.play().catch(err => {
                console.error("Error resuming audio playback:", err);
                this.stopAudioPlayback();
            });
        } else if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            window.speechSynthesis.resume();
        }
    }

    showAudioPlayerBar() {
        let playerBar = document.getElementById('hkm-audio-player-bar');
        if (!playerBar) {
            const activeLang = document.documentElement.lang || 'no';
            const labelVoice = activeLang === 'es' ? 'Voz AI' : (activeLang === 'en' ? 'AI Voice' : 'AI-stemme');

            playerBar = document.createElement('div');
            playerBar.id = 'hkm-audio-player-bar';
            playerBar.className = 'hkm-audio-player-bar';
            playerBar.innerHTML = `
                <div class="audio-controls-group">
                    <button class="audio-btn play-pause-btn" id="audio-play-pause-toggle" title="${this.t('pause_audio')}">
                        <span class="material-symbols-outlined">pause</span>
                    </button>
                    <button class="audio-btn" id="audio-stop-btn" title="${this.t('stop_audio')}">
                        <span class="material-symbols-outlined">stop</span>
                    </button>
                </div>
                <div class="audio-info-display" id="audio-info-display">
                    ${this.t('playing_verse')}...
                </div>
                <select class="audio-voice-select" id="audio-voice-select" title="${labelVoice}">
                    <option value="onyx">Onyx (Mann)</option>
                    <option value="nova">Nova (Kvinne)</option>
                    <option value="echo">Echo (Mann)</option>
                    <option value="alloy">Alloy (Nøytral)</option>
                    <option value="fable">Fable (Forteller)</option>
                    <option value="shimmer">Shimmer (Kvinne)</option>
                </select>
                <select class="audio-speed-select" id="audio-speed-select" title="Hastighet">
                    <option value="0.8">0.8x</option>
                    <option value="1" selected>1.0x</option>
                    <option value="1.2">1.2x</option>
                    <option value="1.5">1.5x</option>
                </select>
                <button class="audio-btn audio-close-btn" id="audio-close-btn" title="Lukk">
                    <span class="material-symbols-outlined" style="font-size: 18px;">close</span>
                </button>
            `;
            document.body.appendChild(playerBar);

            // Bind player bar events
            document.getElementById('audio-play-pause-toggle').addEventListener('click', () => this.toggleAudioPause());
            document.getElementById('audio-stop-btn').addEventListener('click', () => this.stopAudioPlayback());
            document.getElementById('audio-close-btn').addEventListener('click', () => this.stopAudioPlayback());
            document.getElementById('audio-speed-select').addEventListener('change', (e) => {
                this.audioSpeed = parseFloat(e.target.value);
                if (this.bibleAudio) {
                    this.bibleAudio.playbackRate = this.audioSpeed;
                }
            });
            document.getElementById('audio-voice-select').addEventListener('change', (e) => {
                const newVoice = e.target.value;
                if (newVoice !== this.audioVoice) {
                    this.audioVoice = newVoice;
                    this.safeSetLocalStorage('hkm_bible_audio_voice', newVoice);
                    if (this.audioIsPlaying) {
                        this.stopAudioPlayback();
                        this.startAudioPlayback();
                    }
                }
            });
        }
        
        const speedSelect = document.getElementById('audio-speed-select');
        if (speedSelect) speedSelect.value = String(this.audioSpeed || 1.0);

        const validVoices = ['onyx', 'nova', 'echo', 'alloy', 'fable', 'shimmer'];
        if (!validVoices.includes(this.audioVoice)) {
            this.audioVoice = 'onyx';
        }

        const voiceSelect = document.getElementById('audio-voice-select');
        if (voiceSelect) voiceSelect.value = this.audioVoice;
        
        setTimeout(() => playerBar.classList.add('active'), 50);
        
        const playPauseBtn = document.getElementById('audio-play-pause-toggle');
        if (playPauseBtn) {
            playPauseBtn.innerHTML = this.audioIsPaused 
                ? '<span class="material-symbols-outlined">play_arrow</span>'
                : '<span class="material-symbols-outlined">pause</span>';
        }
    }

    hideAudioPlayerBar() {
        const playerBar = document.getElementById('hkm-audio-player-bar');
        if (playerBar) {
            playerBar.classList.remove('active');
        }
    }

    updateAudioPlayerUI() {
        const infoDisplay = document.getElementById('audio-info-display');
        if (!infoDisplay) return;

        if (this.audioIsPaused) {
            infoDisplay.textContent = this.t('paused') || 'Pauset';
        } else {
            infoDisplay.textContent = (this.t('playing_verse') || 'Spiller av') + '...';
        }
    }
    // ==========================================
    // VERSE IMAGE GENERATOR & SHARING SYSTEM
    // ==========================================
    ensureVerseModalsInDOM() {
        const isEn = document.documentElement.lang === 'en';
        const isEs = document.documentElement.lang === 'es';

        let style = document.getElementById('hkm-verse-image-modal-styles');
        if (style) style.remove();

        style = document.createElement('style');
        style.id = 'hkm-verse-image-modal-styles';
        style.textContent = `
            #verse-image-modal.color-wheel-modal-overlay,
            #verse-share-choice-modal.color-wheel-modal-overlay {
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                right: 0 !important;
                bottom: 0 !important;
                background: rgba(15, 23, 42, 0.65) !important;
                backdrop-filter: blur(8px) !important;
                -webkit-backdrop-filter: blur(8px) !important;
                z-index: 45000 !important;
                display: none;
                align-items: center !important;
                justify-content: center !important;
                padding: 16px !important;
                box-sizing: border-box !important;
            }

            #verse-image-modal.color-wheel-modal-overlay.active,
            #verse-share-choice-modal.color-wheel-modal-overlay.active {
                display: flex !important;
            }

            .verse-image-card {
                background: var(--bg-card, #ffffff) !important;
                border: 1px solid rgba(0, 0, 0, 0.08) !important;
                border-radius: 24px !important;
                padding: 20px 24px !important;
                width: 100% !important;
                max-width: 540px !important;
                max-height: 88dvh !important;
                overflow-y: auto !important;
                -webkit-overflow-scrolling: touch !important;
                box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3) !important;
                box-sizing: border-box !important;
            }

            .verse-share-choice-card {
                background: var(--bg-card, #ffffff) !important;
                border: 1px solid rgba(0, 0, 0, 0.08) !important;
                border-radius: 24px !important;
                padding: 20px 24px !important;
                width: 100% !important;
                max-width: 420px !important;
                max-height: 88dvh !important;
                overflow-y: auto !important;
                -webkit-overflow-scrolling: touch !important;
                box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3) !important;
                box-sizing: border-box !important;
            }

            #verse-card-canvas {
                max-width: 100%;
                height: auto;
                max-height: 320px;
                border-radius: 12px;
                box-shadow: 0 12px 32px rgba(0,0,0,0.25);
                object-fit: contain;
            }

            .color-wheel-close-btn {
                width: 36px !important;
                height: 36px !important;
                min-width: 36px !important;
                max-width: 36px !important;
                min-height: 36px !important;
                max-height: 36px !important;
                border-radius: 50% !important;
                aspect-ratio: 1 / 1 !important;
                padding: 0 !important;
                display: inline-flex !important;
                align-items: center !important;
                justify-content: center !important;
                flex-shrink: 0 !important;
                box-sizing: border-box !important;
            }

            .verse-image-modal-actions {
                display: grid !important;
                grid-template-columns: repeat(3, 1fr) !important;
                gap: 8px !important;
                width: 100% !important;
                align-items: center !important;
                justify-content: center !important;
                box-sizing: border-box !important;
            }

            .verse-image-modal-actions button {
                width: 100% !important;
                min-width: 0 !important;
                max-width: 100% !important;
                padding: 10px 4px !important;
                font-size: 12px !important;
                display: inline-flex !important;
                align-items: center !important;
                justify-content: center !important;
                text-align: center !important;
                white-space: nowrap !important;
                box-sizing: border-box !important;
            }

            @media (max-width: 768px) {
                #verse-image-modal.color-wheel-modal-overlay,
                #verse-share-choice-modal.color-wheel-modal-overlay {
                    align-items: flex-end !important;
                    padding: 0 !important;
                }

                .verse-image-card,
                .verse-share-choice-card {
                    width: 100vw !important;
                    max-width: 100vw !important;
                    max-height: 88dvh !important;
                    border-radius: 24px 24px 0 0 !important;
                    padding: 16px 16px calc(24px + env(safe-area-inset-bottom, 12px)) 16px !important;
                    animation: slideUpSheet 0.28s cubic-bezier(0.16, 1, 0.3, 1) !important;
                }

                #verse-card-canvas {
                    max-height: 200px !important;
                }

                .verse-image-modal-actions {
                    display: grid !important;
                    grid-template-columns: repeat(3, 1fr) !important;
                    gap: 6px !important;
                    width: 100% !important;
                }

                .verse-image-modal-actions button {
                    padding: 8px 2px !important;
                    font-size: 11px !important;
                    min-height: 44px !important;
                    gap: 3px !important;
                }

                .verse-image-modal-actions button .material-symbols-outlined {
                    font-size: 15px !important;
                }
            }
        `;
        document.head.appendChild(style);

        // 1. Verse Image Generator Modal
        const oldModal = document.getElementById('verse-image-modal');
        if (oldModal) oldModal.remove();

        const modalHtml = `
        <div id="verse-image-modal" class="color-wheel-modal-overlay" style="display: none;" onclick="if(event.target===this){ this.classList.remove('active'); setTimeout(() => this.style.display='none', 250); }">
            <div class="verse-image-card" onclick="event.stopPropagation();">
                <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--border-subtle, rgba(0,0,0,0.06)); padding-bottom: 14px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span class="material-symbols-outlined" style="color: var(--hkm-terracotta, #d17d39); font-size: 26px;">image</span>
                        <h3 id="verse-image-modal-title" style="margin: 0; font-size: 18px; font-weight: 800; color: var(--text-base);">${isEn ? 'Create Verse Image' : (isEs ? 'Crear Imagen de Versículo' : 'Skap vers-bilde')}</h3>
                    </div>
                    <button class="color-wheel-close-btn" title="Lukk" onclick="const m=document.getElementById('verse-image-modal'); if(m){ m.classList.remove('active'); setTimeout(() => m.style.display='none', 250); }">
                        <span class="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div style="margin-top: 14px; display: flex; flex-direction: column; gap: 14px; align-items: center;">
                    <div style="width: 100%; display: flex; justify-content: center; background: rgba(0,0,0,0.04); border-radius: 16px; padding: 10px; box-sizing: border-box;">
                        <canvas id="verse-card-canvas"></canvas>
                    </div>

                    <div style="width: 100%;">
                        <label style="display: block; font-weight: 700; font-size: 11.5px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; color: var(--text-muted, #64748b);">${isEn ? 'Style & Background:' : (isEs ? 'Estilo y Fondo:' : 'Stil & Bakgrunn:')}</label>
                        <div class="verse-image-theme-chips" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px;">
                            <!-- Color Gradients -->
                            <button class="theme-chip-btn active" data-theme="emerald" style="background: linear-gradient(135deg, #022c22, #0f5132); color: #ffffff; border: 2px solid var(--hkm-terracotta, #d17d39); border-radius: 12px; padding: 8px; font-size: 12px; font-weight: 700; cursor: pointer;">🌿 ${isEn ? 'Emerald' : (isEs ? 'Esmeralda' : 'Smaragd')}</button>
                            <button class="theme-chip-btn" data-theme="royal" style="background: linear-gradient(135deg, #1e1b4b, #581c87); color: #fbbf24; border: 1px solid rgba(255,255,255,0.15); border-radius: 12px; padding: 8px; font-size: 12px; font-weight: 700; cursor: pointer;">👑 ${isEn ? 'Royal' : (isEs ? 'Real' : 'Kongelig')}</button>
                            <button class="theme-chip-btn" data-theme="midnight" style="background: linear-gradient(135deg, #0f172a, #1e293b); color: #38bdf8; border: 1px solid rgba(255,255,255,0.15); border-radius: 12px; padding: 8px; font-size: 12px; font-weight: 700; cursor: pointer;">🌌 ${isEn ? 'Midnight' : (isEs ? 'Medianoche' : 'Midnatt')}</button>
                            <button class="theme-chip-btn" data-theme="sunset" style="background: linear-gradient(135deg, #4c0519, #b45309); color: #fef08a; border: 1px solid rgba(255,255,255,0.15); border-radius: 12px; padding: 8px; font-size: 12px; font-weight: 700; cursor: pointer;">🌅 ${isEn ? 'Sunset' : (isEs ? 'Amanecer' : 'Solnedgang')}</button>
                            <button class="theme-chip-btn" data-theme="aurora" style="background: linear-gradient(135deg, #030712, #065f46); color: #6ee7b7; border: 1px solid rgba(255,255,255,0.15); border-radius: 12px; padding: 8px; font-size: 12px; font-weight: 700; cursor: pointer;">✨ ${isEn ? 'Aurora' : (isEs ? 'Aurora' : 'Aurora')}</button>
                            <button class="theme-chip-btn" data-theme="light" style="background: linear-gradient(135deg, #fdfbf7, #e2d9cc); color: #1e293b; border: 1px solid rgba(0,0,0,0.15); border-radius: 12px; padding: 8px; font-size: 12px; font-weight: 700; cursor: pointer;">🕊️ ${isEn ? 'Light Elegance' : (isEs ? 'Luz Elegante' : 'Lys Eleganse')}</button>
                            
                            <!-- Real Photo Backgrounds -->
                            <button class="theme-chip-btn" data-theme="photo_mountains" style="background: url('/img/verse_bg_mountains.jpg') center/cover; color: #ffffff; text-shadow: 0 1px 4px rgba(0,0,0,0.9); border: 1px solid rgba(255,255,255,0.25); border-radius: 12px; padding: 8px; font-size: 12px; font-weight: 700; cursor: pointer;">🏔️ ${isEn ? 'Mountains' : (isEs ? 'Montañas' : 'Fjell')}</button>
                            <button class="theme-chip-btn" data-theme="photo_stars" style="background: url('/img/verse_bg_starry_sky.jpg') center/cover; color: #ffffff; text-shadow: 0 1px 4px rgba(0,0,0,0.9); border: 1px solid rgba(255,255,255,0.25); border-radius: 12px; padding: 8px; font-size: 12px; font-weight: 700; cursor: pointer;">✨ ${isEn ? 'Starry Sky' : (isEs ? 'Cielo Estrellado' : 'Stjerner')}</button>
                            <button class="theme-chip-btn" data-theme="photo_ocean" style="background: url('/img/verse_bg_sunset_ocean.jpg') center/cover; color: #ffffff; text-shadow: 0 1px 4px rgba(0,0,0,0.9); border: 1px solid rgba(255,255,255,0.25); border-radius: 12px; padding: 8px; font-size: 12px; font-weight: 700; cursor: pointer;">🌊 ${isEn ? 'Ocean Sunset' : (isEs ? 'Atardecer Mar' : 'Hav')}</button>
                            <button class="theme-chip-btn" data-theme="photo_sunburst" style="background: url('/img/verse_bg_sunburst_rays.jpg') center/cover; color: #ffffff; text-shadow: 0 1px 4px rgba(0,0,0,0.9); border: 1px solid rgba(255,255,255,0.25); border-radius: 12px; padding: 8px; font-size: 12px; font-weight: 700; cursor: pointer;">🌤️ ${isEn ? 'Sunbeams' : (isEs ? 'Rayos de Sol' : 'Solstråler')}</button>
                        </div>
                    </div>

                    <div style="width: 100%; display: flex; align-items: center; justify-content: space-between;">
                        <label style="font-weight: 700; font-size: 11.5px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted, #64748b);">${isEn ? 'Format:' : (isEs ? 'Formato:' : 'Format:')}</label>
                        <div style="display: flex; gap: 8px;">
                            <button id="format-btn-square" class="format-chip-btn active" data-format="square" style="background: var(--hkm-terracotta, #d17d39); color: white; border: none; border-radius: 9999px; padding: 6px 14px; font-size: 12px; font-weight: 700; cursor: pointer;">${isEn ? 'Square (1:1)' : (isEs ? 'Cuadrado (1:1)' : 'Kvadrat (1:1)')}</button>
                            <button id="format-btn-story" class="format-chip-btn" data-format="story" style="background: var(--bg-surface, #f1f5f9); color: var(--text-base, #475569); border: none; border-radius: 9999px; padding: 6px 14px; font-size: 12px; font-weight: 700; cursor: pointer;">${isEn ? 'Story (9:16)' : (isEs ? 'Historia (9:16)' : 'Story (9:16)')}</button>
                        </div>
                    </div>
                </div>

                <div class="verse-image-modal-actions" style="margin-top: 18px; padding-top: 14px; border-top: 1px solid var(--border-subtle, rgba(0,0,0,0.06)); display: grid !important; grid-template-columns: repeat(3, 1fr) !important; gap: 6px !important; width: 100% !important; box-sizing: border-box !important;">
                    <button id="verse-image-copy-btn" style="background: var(--bg-surface, #f1f5f9); color: var(--text-base, #475569); border: none; border-radius: 9999px; padding: 10px 4px; font-weight: 600; font-size: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px; width: 100%; min-width: 0; box-sizing: border-box;">
                        <span class="material-symbols-outlined" style="font-size: 16px; flex-shrink: 0;">content_copy</span>
                        <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${isEn ? 'Copy' : (isEs ? 'Copiar' : 'Kopier')}</span>
                    </button>
                    <button id="verse-image-download-btn" style="background: var(--bg-surface, #f1f5f9); color: var(--text-base, #475569); border: 1px solid var(--border-color, rgba(0,0,0,0.15)); border-radius: 9999px; padding: 10px 4px; font-weight: 700; font-size: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px; width: 100%; min-width: 0; box-sizing: border-box;">
                        <span class="material-symbols-outlined" style="font-size: 16px; flex-shrink: 0;">download</span>
                        <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${isEn ? 'Download' : (isEs ? 'Descargar' : 'Last ned')}</span>
                    </button>
                    <button id="verse-image-share-btn" style="background: linear-gradient(135deg, var(--hkm-terracotta, #d17d39), #b45309); color: white; border: none; border-radius: 9999px; padding: 10px 4px; font-weight: 800; font-size: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px; box-shadow: 0 4px 14px rgba(209,125,57,0.35); width: 100%; min-width: 0; box-sizing: border-box;">
                        <span class="material-symbols-outlined" style="font-size: 16px; flex-shrink: 0;">share</span>
                        <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${isEn ? 'Share' : (isEs ? 'Compartir' : 'Del bilde')}</span>
                    </button>
                </div>
            </div>
        </div>`;
            document.body.insertAdjacentHTML('beforeend', modalHtml);

        // 2. Share Choice Modal
        if (!document.getElementById('verse-share-choice-modal')) {
            const choiceHtml = `
            <div id="verse-share-choice-modal" class="color-wheel-modal-overlay" style="display: none;" onclick="if(event.target===this){ this.classList.remove('active'); setTimeout(() => this.style.display='none', 250); }">
                <div class="verse-share-choice-card" onclick="event.stopPropagation();">
                    <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--border-subtle, rgba(0,0,0,0.06)); padding-bottom: 14px;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span class="material-symbols-outlined" style="color: var(--hkm-terracotta, #d17d39); font-size: 26px;">share</span>
                            <h3 style="margin: 0; font-size: 18px; font-weight: 800; color: var(--text-base);">${isEn ? 'Share Bible Verse' : (isEs ? 'Compartir Versículo' : 'Del bibelvers')}</h3>
                        </div>
                        <button class="color-wheel-close-btn" title="Lukk" onclick="const m=document.getElementById('verse-share-choice-modal'); if(m){ m.classList.remove('active'); setTimeout(() => m.style.display='none', 250); }">
                            <span class="material-symbols-outlined">close</span>
                        </button>
                    </div>

                    <div style="margin-top: 18px; display: flex; flex-direction: column; gap: 12px;">
                        <button id="share-choice-btn-image" style="background: linear-gradient(135deg, rgba(209,125,57,0.12), rgba(209,125,57,0.04)); border: 1.5px solid var(--hkm-terracotta, #d17d39); border-radius: 16px; padding: 16px; display: flex; align-items: center; gap: 16px; text-align: left; cursor: pointer; transition: transform 0.15s ease;">
                            <div style="width: 44px; height: 44px; border-radius: 12px; background: var(--hkm-terracotta, #d17d39); color: white; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                                <span class="material-symbols-outlined" style="font-size: 24px;">image</span>
                            </div>
                            <div>
                                <h4 style="margin: 0 0 4px; font-size: 14.5px; font-weight: 800; color: var(--text-base);">${isEn ? 'Share as Image' : (isEs ? 'Compartir como Imagen' : 'Del som Bilde')}</h4>
                                <p style="margin: 0; font-size: 12px; color: var(--text-muted, #64748b);">${isEn ? 'Generate a beautiful image card with verse' : (isEs ? 'Genera una hermosa tarjeta de imagen con el versículo' : 'Generer et vakkert bildekort med vers og bakgrunn')}</p>
                            </div>
                        </button>

                        <button id="share-choice-btn-text" style="background: var(--bg-surface, #f8fafc); border: 1px solid var(--border-color, rgba(0,0,0,0.12)); border-radius: 16px; padding: 16px; display: flex; align-items: center; gap: 16px; text-align: left; cursor: pointer; transition: transform 0.15s ease;">
                            <div style="width: 44px; height: 44px; border-radius: 12px; background: var(--bg-card, #e2e8f0); color: var(--text-base, #334155); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                                <span class="material-symbols-outlined" style="font-size: 24px;">notes</span>
                            </div>
                            <div>
                                <h4 style="margin: 0 0 4px; font-size: 14.5px; font-weight: 800; color: var(--text-base);">${isEn ? 'Share as Text' : (isEs ? 'Compartir como Texto' : 'Del som Tekst')}</h4>
                                <p style="margin: 0; font-size: 12px; color: var(--text-muted, #64748b);">${isEn ? 'Send plain text directly or copy to clipboard' : (isEs ? 'Enviar texto o copiar al portapapeles' : 'Send råtekst direkte eller kopier til utklippstavlen')}</p>
                            </div>
                        </button>
                    </div>
                </div>
            </div>`;
            document.body.insertAdjacentHTML('beforeend', choiceHtml);
        }
    }

    openVerseImageModal(customData = null) {
        this.ensureVerseModalsInDOM();

        let verseText = '';
        let reference = '';
        let translation = this.bibles.find(t => t.id === this.selectedBibleId)?.abbreviation || '';

        if (customData) {
            verseText = customData.text || '';
            reference = customData.reference || '';
            if (customData.translation) translation = customData.translation;
        } else if (this.selectedVerses && this.selectedVerses.length > 0) {
            const sorted = [...this.selectedVerses].sort((a, b) => parseInt(a.verseNum, 10) - parseInt(b.verseNum, 10));
            reference = this.getSelectedVersesReference();
            verseText = sorted.map(v => {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = v.paragraph.innerHTML;
                tempDiv.querySelectorAll('sup').forEach(s => s.remove());
                return tempDiv.innerText.trim();
            }).join(' ');
        } else {
            return;
        }

        const modal = document.getElementById('verse-image-modal');
        const canvas = document.getElementById('verse-card-canvas');
        if (!modal || !canvas) return;

        let activeTheme = 'emerald';
        let activeFormat = 'square';

        const updateCanvas = () => {
            this.renderVerseImageCanvas(canvas, {
                verseText,
                reference,
                translation,
                theme: activeTheme,
                format: activeFormat
            });
        };

        // Theme Chip Click Listeners
        const themeChips = modal.querySelectorAll('.theme-chip-btn');
        themeChips.forEach(btn => {
            btn.onclick = () => {
                themeChips.forEach(b => {
                    b.classList.remove('active');
                    b.style.border = '1px solid rgba(255,255,255,0.15)';
                });
                btn.classList.add('active');
                btn.style.border = '2px solid var(--hkm-terracotta, #d17d39)';
                activeTheme = btn.dataset.theme;
                updateCanvas();
            };
        });

        // Format Chip Click Listeners
        const formatBtnSquare = modal.querySelector('#format-btn-square');
        const formatBtnStory = modal.querySelector('#format-btn-story');
        if (formatBtnSquare && formatBtnStory) {
            formatBtnSquare.onclick = () => {
                formatBtnSquare.style.background = 'var(--hkm-terracotta, #d17d39)';
                formatBtnSquare.style.color = 'white';
                formatBtnStory.style.background = 'var(--bg-surface, #f1f5f9)';
                formatBtnStory.style.color = 'var(--text-base, #475569)';
                activeFormat = 'square';
                updateCanvas();
            };
            formatBtnStory.onclick = () => {
                formatBtnStory.style.background = 'var(--hkm-terracotta, #d17d39)';
                formatBtnStory.style.color = 'white';
                formatBtnSquare.style.background = 'var(--bg-surface, #f1f5f9)';
                formatBtnSquare.style.color = 'var(--text-base, #475569)';
                activeFormat = 'story';
                updateCanvas();
            };
        }

        // Action Buttons Wiring
        const shareBtn = modal.querySelector('#verse-image-share-btn');
        if (shareBtn) {
            shareBtn.onclick = () => {
                this.shareVerseImage(canvas, reference);
            };
        }

        const downloadBtn = modal.querySelector('#verse-image-download-btn');
        if (downloadBtn) {
            downloadBtn.onclick = () => {
                canvas.toBlob((blob) => {
                    if (!blob) return;
                    const fileName = `bibelvers-${reference.toLowerCase().replace(/[^a-z0-9]/g, '-')}.png`;
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(blob);
                    a.download = fileName;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    if (typeof this.showToast === 'function') {
                        this.showToast(window.location.pathname.includes('/en/') ? 'Image downloaded!' : 'Bilde lastet ned!');
                    }
                }, 'image/png');
            };
        }

        const copyBtn = modal.querySelector('#verse-image-copy-btn');
        if (copyBtn) {
            copyBtn.onclick = () => {
                const shareText = `«${verseText}»\n— ${reference} ${translation ? '(' + translation + ')' : ''}\n\nLest via Mandal Regnskapskontor / HKM`;
                navigator.clipboard.writeText(shareText).then(() => {
                    if (typeof this.showToast === 'function') {
                        this.showToast(window.location.pathname.includes('/en/') ? 'Verse text copied!' : 'Verstekst kopiert til utklippstavlen!');
                    }
                });
            };
        }

        // Initial Canvas Render
        updateCanvas();

        // Display Modal
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('active'), 10);
    }

    openVerseShareChoiceModal() {
        this.ensureVerseModalsInDOM();
        const choiceModal = document.getElementById('verse-share-choice-modal');
        if (!choiceModal) return;

        const btnImage = choiceModal.querySelector('#share-choice-btn-image');
        const btnText = choiceModal.querySelector('#share-choice-btn-text');

        if (btnImage) {
            btnImage.onclick = () => {
                choiceModal.classList.remove('active');
                setTimeout(() => choiceModal.style.display = 'none', 200);
                this.openVerseImageModal();
            };
        }

        if (btnText) {
            btnText.onclick = () => {
                choiceModal.classList.remove('active');
                setTimeout(() => choiceModal.style.display = 'none', 200);
                this.shareSelectedVersesAsText();
            };
        }

        choiceModal.style.display = 'flex';
        setTimeout(() => choiceModal.classList.add('active'), 10);
    }

    shareSelectedVersesAsText() {
        if (this.selectedVerses && this.selectedVerses.length > 0) {
            const sorted = [...this.selectedVerses].sort((a, b) => parseInt(a.verseNum, 10) - parseInt(b.verseNum, 10));
            const translation = this.bibles.find(t => t.id === this.selectedBibleId)?.abbreviation || '';
            const refRange = this.getSelectedVersesReference();
            
            const combinedText = sorted.map(v => {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = v.paragraph.innerHTML;
                tempDiv.querySelectorAll('sup').forEach(s => s.remove());
                return tempDiv.innerText.trim();
            }).join(' ');

            const shareText = `«${combinedText}»\n— ${refRange} ${translation ? `(${translation})` : ''}\n\nLest via Mandal Regnskapskontor / HKM`;

            if (navigator.share) {
                navigator.share({
                    title: 'Bibelvers fra HKM',
                    text: shareText
                }).catch(err => console.log(err));
            } else {
                navigator.clipboard.writeText(shareText).then(() => {
                    if (typeof this.showToast === 'function') {
                        this.showToast('Bibelversene er kopiert til utklippstavlen!');
                    }
                });
            }
            this.clearSelection();
        }
    }

    renderVerseImageCanvas(canvas, { verseText, reference, translation, theme = 'emerald', format = 'square' }) {
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const isStory = format === 'story';
        const width = 1080;
        const height = isStory ? 1920 : 1080;

        canvas.width = width;
        canvas.height = height;

        const themes = {
            emerald: {
                bgGradient: ['#022c22', '#064e3b', '#0f5132'],
                cardBg: 'rgba(255, 255, 255, 0.06)',
                cardBorder: 'rgba(250, 204, 21, 0.35)',
                quoteColor: 'rgba(250, 204, 21, 0.22)',
                textColor: '#ffffff',
                refColor: '#facc15',
                brandColor: 'rgba(255, 255, 255, 0.75)'
            },
            royal: {
                bgGradient: ['#1e1b4b', '#3b0764', '#581c87'],
                cardBg: 'rgba(255, 255, 255, 0.07)',
                cardBorder: 'rgba(251, 191, 36, 0.35)',
                quoteColor: 'rgba(251, 191, 36, 0.22)',
                textColor: '#ffffff',
                refColor: '#fbbf24',
                brandColor: 'rgba(255, 255, 255, 0.75)'
            },
            midnight: {
                bgGradient: ['#0f172a', '#1e293b', '#020617'],
                cardBg: 'rgba(255, 255, 255, 0.05)',
                cardBorder: 'rgba(56, 189, 248, 0.35)',
                quoteColor: 'rgba(56, 189, 248, 0.22)',
                textColor: '#f8fafc',
                refColor: '#38bdf8',
                brandColor: '#94a3b8'
            },
            sunset: {
                bgGradient: ['#4c0519', '#881337', '#b45309'],
                cardBg: 'rgba(255, 255, 255, 0.07)',
                cardBorder: 'rgba(254, 240, 138, 0.35)',
                quoteColor: 'rgba(254, 240, 138, 0.22)',
                textColor: '#fff1f2',
                refColor: '#fef08a',
                brandColor: 'rgba(255, 241, 242, 0.75)'
            },
            aurora: {
                bgGradient: ['#030712', '#065f46', '#1e1b4b'],
                cardBg: 'rgba(255, 255, 255, 0.06)',
                cardBorder: 'rgba(110, 231, 183, 0.35)',
                quoteColor: 'rgba(110, 231, 183, 0.22)',
                textColor: '#ecfdf5',
                refColor: '#6ee7b7',
                brandColor: 'rgba(236, 253, 245, 0.75)'
            },
            light: {
                bgGradient: ['#fdfbf7', '#f5f0e6', '#e2d9cc'],
                cardBg: 'rgba(255, 255, 255, 0.85)',
                cardBorder: 'rgba(209, 125, 57, 0.35)',
                quoteColor: 'rgba(209, 125, 57, 0.18)',
                textColor: '#1e293b',
                refColor: '#b45309',
                brandColor: '#64748b'
            },
            photo_mountains: {
                isPhoto: true,
                photoUrl: '/img/verse_bg_mountains.jpg',
                cardBg: 'rgba(15, 23, 42, 0.55)',
                cardBorder: 'rgba(250, 204, 21, 0.4)',
                quoteColor: 'rgba(250, 204, 21, 0.25)',
                textColor: '#ffffff',
                refColor: '#facc15',
                brandColor: 'rgba(255, 255, 255, 0.85)'
            },
            photo_stars: {
                isPhoto: true,
                photoUrl: '/img/verse_bg_starry_sky.jpg',
                cardBg: 'rgba(15, 23, 42, 0.55)',
                cardBorder: 'rgba(56, 189, 248, 0.4)',
                quoteColor: 'rgba(56, 189, 248, 0.25)',
                textColor: '#ffffff',
                refColor: '#38bdf8',
                brandColor: 'rgba(255, 255, 255, 0.85)'
            },
            photo_ocean: {
                isPhoto: true,
                photoUrl: '/img/verse_bg_sunset_ocean.jpg',
                cardBg: 'rgba(30, 10, 20, 0.55)',
                cardBorder: 'rgba(254, 240, 138, 0.4)',
                quoteColor: 'rgba(254, 240, 138, 0.25)',
                textColor: '#ffffff',
                refColor: '#fef08a',
                brandColor: 'rgba(255, 255, 255, 0.85)'
            },
            photo_sunburst: {
                isPhoto: true,
                photoUrl: '/img/verse_bg_sunburst_rays.jpg',
                cardBg: 'rgba(15, 23, 42, 0.55)',
                cardBorder: 'rgba(250, 204, 21, 0.4)',
                quoteColor: 'rgba(250, 204, 21, 0.25)',
                textColor: '#ffffff',
                refColor: '#facc15',
                brandColor: 'rgba(255, 255, 255, 0.85)'
            }
        };

        const t = themes[theme] || themes.emerald;

        const drawCardAndText = () => {
            // 2. Wrap text & Calculate sizes
            const marginX = 90;
            const cardWidth = width - (marginX * 2);
            
            const cleanText = verseText.trim();
            const textLen = cleanText.length;

            let fontSize = 44;
            let lineHeight = 66;

            if (textLen > 320) {
                fontSize = 30;
                lineHeight = 48;
            } else if (textLen > 180) {
                fontSize = 36;
                lineHeight = 56;
            } else if (textLen < 80) {
                fontSize = 52;
                lineHeight = 76;
            }

            ctx.font = `italic ${fontSize}px "Georgia", "Times New Roman", serif`;

            const maxTextWidth = cardWidth - 140;
            const words = cleanText.split(' ');
            let lines = [];
            let currentLine = '';

            for (let i = 0; i < words.length; i++) {
                let testLine = currentLine ? currentLine + ' ' + words[i] : words[i];
                let metrics = ctx.measureText(testLine);
                if (metrics.width > maxTextWidth && i > 0) {
                    lines.push(currentLine);
                    currentLine = words[i];
                } else {
                    currentLine = testLine;
                }
            }
            if (currentLine) lines.push(currentLine);

            const textContentHeight = lines.length * lineHeight;
            const cardHeight = Math.max(380, textContentHeight + 220);
            const cardY = (height - cardHeight) / 2;

            // 3. Draw Glass Card
            ctx.save();
            ctx.beginPath();
            const r = 36;
            ctx.moveTo(marginX + r, cardY);
            ctx.arcTo(marginX + cardWidth, cardY, marginX + cardWidth, cardY + cardHeight, r);
            ctx.arcTo(marginX + cardWidth, cardY + cardHeight, marginX, cardY + cardHeight, r);
            ctx.arcTo(marginX, cardY + cardHeight, marginX, cardY, r);
            ctx.arcTo(marginX, cardY, marginX + cardWidth, cardY, r);
            ctx.closePath();

            ctx.fillStyle = t.cardBg;
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = t.cardBorder;
            ctx.stroke();
            ctx.restore();

            // 4. Large Decorative Quote Mark
            ctx.save();
            ctx.font = 'bold 150px "Georgia", serif';
            ctx.fillStyle = t.quoteColor;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillText('«', marginX + 40, cardY + 20);
            ctx.restore();

            // 5. Draw Wrapped Verse Text
            ctx.save();
            ctx.font = `italic ${fontSize}px "Georgia", "Times New Roman", serif`;
            ctx.fillStyle = t.textColor;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';

            let textStartY = cardY + 80;
            for (let j = 0; j < lines.length; j++) {
                ctx.fillText(lines[j], width / 2, textStartY + (j * lineHeight));
            }
            ctx.restore();

            // 6. Draw Divider Line & Reference
            const dividerY = textStartY + (lines.length * lineHeight) + 26;
            ctx.save();
            ctx.strokeStyle = t.cardBorder;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(width / 2 - 50, dividerY);
            ctx.lineTo(width / 2 + 50, dividerY);
            ctx.stroke();
            ctx.restore();

            const fullRef = `${reference.toUpperCase()} ${translation ? '(' + translation + ')' : ''}`;
            ctx.save();
            ctx.font = 'bold 28px "Outfit", "Inter", sans-serif';
            ctx.fillStyle = t.refColor;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText(fullRef, width / 2, dividerY + 18);
            ctx.restore();

            // 7. Draw Footer Branding ("HIS KINGDOM MINISTRY  •  hkm.no")
            ctx.save();
            const footerY = isStory ? height - 120 : height - 60;
            ctx.font = '700 22px "Outfit", "Inter", sans-serif';
            ctx.fillStyle = t.brandColor;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('HIS KINGDOM MINISTRY  •  hkm.no', width / 2, footerY);
            ctx.restore();
        };

        // 1. Draw Background (Photo vs Gradient)
        if (t.isPhoto && t.photoUrl) {
            if (!this.verseImageCache) this.verseImageCache = {};
            const cachedImg = this.verseImageCache[t.photoUrl];

            const drawPhotoBackground = (img) => {
                const imgRatio = img.width / img.height;
                const canvasRatio = width / height;
                let dw = width, dh = height, dx = 0, dy = 0;

                if (imgRatio > canvasRatio) {
                    dh = height;
                    dw = height * imgRatio;
                    dx = (width - dw) / 2;
                } else {
                    dw = width;
                    dh = width / imgRatio;
                    dy = (height - dh) / 2;
                }

                ctx.drawImage(img, dx, dy, dw, dh);

                // Dark vignette overlay for optimal text contrast
                ctx.fillStyle = 'rgba(15, 23, 42, 0.35)';
                ctx.fillRect(0, 0, width, height);

                drawCardAndText();
            };

            if (cachedImg && cachedImg.complete) {
                drawPhotoBackground(cachedImg);
            } else {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.src = t.photoUrl;
                img.onload = () => {
                    this.verseImageCache[t.photoUrl] = img;
                    drawPhotoBackground(img);
                };
                // Fallback gradient while loading image
                const bgGrad = ctx.createLinearGradient(0, 0, width, height);
                bgGrad.addColorStop(0, '#0f172a');
                bgGrad.addColorStop(1, '#020617');
                ctx.fillStyle = bgGrad;
                ctx.fillRect(0, 0, width, height);
                drawCardAndText();
            }
        } else {
            const bgGrad = ctx.createLinearGradient(0, 0, width, height);
            bgGrad.addColorStop(0, t.bgGradient[0]);
            bgGrad.addColorStop(0.5, t.bgGradient[1]);
            bgGrad.addColorStop(1, t.bgGradient[2]);
            ctx.fillStyle = bgGrad;
            ctx.fillRect(0, 0, width, height);

            // Radial ambient glow
            const lightGrad = ctx.createRadialGradient(width/2, height/2, 40, width/2, height/2, width*0.65);
            lightGrad.addColorStop(0, 'rgba(255, 255, 255, 0.09)');
            lightGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = lightGrad;
            ctx.fillRect(0, 0, width, height);

            drawCardAndText();
        }
    }

    shareVerseImage(canvas, reference) {
        if (!canvas) return;
        canvas.toBlob(async (blob) => {
            if (!blob) return;
            const fileName = `bibelvers-${reference.toLowerCase().replace(/[^a-z0-9]/g, '-')}.png`;
            const file = new File([blob], fileName, { type: 'image/png' });

            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                try {
                    await navigator.share({
                        title: 'Bibelvers - HKM',
                        text: `${reference} — His Kingdom Ministry`,
                        files: [file]
                    });
                    return;
                } catch(e) {
                    console.log('Share canceled or error:', e);
                }
            }

            // Fallback download
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            if (typeof this.showToast === 'function') {
                this.showToast(window.location.pathname.includes('/en/') ? 'Image downloaded!' : 'Bilde lastet ned!');
            }
        }, 'image/png');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.bibleReader = new BibleReader();
    
    // Wire up bookmarks/history rendering
    setTimeout(() => {
        window.bibleReader.renderBookmarksList();
        window.bibleReader.renderHistoryList();
    }, 500);
});
