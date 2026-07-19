// js/bible-reader.js
import { firebaseService } from './firebase-service.js';
import { biblicalCharacters } from './bibelske-personer-data.js';

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
                'extended_header': 'Dypere analyse'
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
                'extended_header': 'Deeper analysis'
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
                'extended_header': 'Análisis profundo'
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
        
        // Listen to Firebase auth state for synchronizing notes (supports lazy-loaded Firebase SDK)
        const setupAuthObserver = () => {
            if (window.firebase && typeof firebase.auth === 'function') {
                try {
                    if (!firebase.apps.length && window.firebaseConfig) {
                        firebase.initializeApp(window.firebaseConfig);
                    }
                    firebase.auth().onAuthStateChanged(user => {
                        this.currentUser = user;
                        this.loadNotes();
                        this.loadReadingPlan();
                        if (this.activePlanMode && this.activePlanId) {
                            this.initReadingPlanMode(this.activePlanId, this.activePlanDay);
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
                        if (planParam && (!this.activePlanData || !this.activePlanData.id)) {
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
            if (refParam) {
                await this.parseAndNavigateToReference(refParam);
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
        if (typeof window.revealPublicUI === 'function') {
            window.revealPublicUI('bible-reader-ready');
        } else {
            document.body.classList.remove('cms-loading');
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
                
                if (dictBtn) {
                    dictBtn.className = 'popover-icon-btn';
                    strip.appendChild(dictBtn);
                }
                if (readBtn) {
                    readBtn.className = 'popover-icon-btn';
                    strip.appendChild(readBtn);
                }
                if (bookmarkBtn) {
                    bookmarkBtn.className = 'popover-icon-btn';
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
            
            // 4. Set up click listener for the floating settings button to toggle popover
            const settingsBtn = document.getElementById('floating-settings-btn');
            if (settingsBtn) {
                settingsBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    document.getElementById('floating-chapter-popover')?.classList.remove('active');
                    popover.classList.toggle('active');
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
                    document.getElementById('floating-settings-popover')?.classList.remove('active');
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
                        chapPopover.classList.toggle('active');
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
                btnShowBooks.addEventListener('click', (e) => {
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
                        this.renderFloatingBooks();
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
            });
        }
    }

    bindEvents() {
        // Translation change
        if (this.dom.translationSelect) {
            this.dom.translationSelect.addEventListener('change', async (e) => {
                this.selectedBibleId = e.target.value;
                const currentLang = document.documentElement.lang || 'no';
                this.safeSetLocalStorage(`hkm_bible_translation_${currentLang}`, this.selectedBibleId);
                const mobileTransSelect = document.getElementById('bible-translation-select-mobile');
                if (mobileTransSelect) mobileTransSelect.value = this.selectedBibleId;
                await this.loadBooks();
                // Re-navigate to current book/chapter if possible
                const activeBookId = this.selectedBookId;
                const activeChapterNum = (this.selectedChapterId && this.selectedChapterId.includes('_')) ? this.selectedChapterId.split('_')[1] : '1';
                await this.selectBook(activeBookId);
                await this.selectChapter(`${activeBookId}_${activeChapterNum}`);
            });
        }

        // Mobile translation change
        const mobileTransSelect = document.getElementById('bible-translation-select-mobile');
        if (mobileTransSelect) {
            mobileTransSelect.addEventListener('change', async (e) => {
                this.selectedBibleId = e.target.value;
                const currentLang = document.documentElement.lang || 'no';
                this.safeSetLocalStorage(`hkm_bible_translation_${currentLang}`, this.selectedBibleId);
                if (this.dom.translationSelect) this.dom.translationSelect.value = this.selectedBibleId;
                await this.loadBooks();
                // Re-navigate to current book/chapter if possible
                const activeBookId = this.selectedBookId;
                const activeChapterNum = (this.selectedChapterId && this.selectedChapterId.includes('_')) ? this.selectedChapterId.split('_')[1] : '1';
                await this.selectBook(activeBookId);
                await this.selectChapter(`${activeBookId}_${activeChapterNum}`);
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
        const fontFamilySelectMobile = document.getElementById('settings-font-family-mobile');
        if (fontFamilySelectMobile) {
            fontFamilySelectMobile.addEventListener('change', (e) => {
                this.settings.fontFamily = e.target.value;
                this.applySettings();
            });
        }
        const layoutSelectMobile = document.getElementById('settings-layout-mobile');
        if (layoutSelectMobile) {
            layoutSelectMobile.addEventListener('change', (e) => {
                this.settings.layout = e.target.value;
                this.applySettings();
            });
        }

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
                touchstartX = e.changedTouches[0].screenX;
                touchstartY = e.changedTouches[0].screenY;
            }, { passive: true });

            pane.addEventListener('touchend', (e) => {
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
            this.dom.closeDictBtn.addEventListener('click', () => {
                this.dom.dictDrawer.classList.remove('active');
                this.dom.dictDrawer.classList.remove('expanded');
                const expandBtnIcon = this.dom.toggleExpandDictBtn ? this.dom.toggleExpandDictBtn.querySelector('span') : null;
                if (expandBtnIcon) expandBtnIcon.textContent = 'open_in_full';
            });
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

        if (this.dom.toolbarBtnShare) {
            this.dom.toolbarBtnShare.addEventListener('click', (e) => {
                e.stopPropagation();
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
                            if (typeof window.showToast === 'function') {
                                window.showToast('Bibelversene er kopiert til utklippstavlen!', 'success');
                            } else {
                                alert('Kopiert til utklippstavlen!');
                            }
                        });
                    }
                    this.clearSelection();
                }
            });
        }

        if (this.dom.toolbarBtnDownload) {
            this.dom.toolbarBtnDownload.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.selectedVerses && this.selectedVerses.length > 0) {
                    const sorted = [...this.selectedVerses].sort((a, b) => parseInt(a.verseNum, 10) - parseInt(b.verseNum, 10));
                    const translation = this.bibles.find(t => t.id === this.selectedBibleId)?.abbreviation || '';
                    const refRange = this.getSelectedVersesReference();
                    
                    const combinedText = sorted.map(v => {
                        const tempDiv = document.createElement('div');
                        tempDiv.innerHTML = v.paragraph.innerHTML;
                        tempDiv.querySelectorAll('sup').forEach(s => s.remove());
                        return `[Vers ${v.verseNum}] ${tempDiv.innerText.trim()}`;
                    }).join('\n');

                    const fileText = `Bibelvers fra His Kingdom Ministry\nReferanse: ${refRange}\nOversettelse: ${translation}\nDato: ${new Date().toLocaleDateString()}\n\n${combinedText}\n`;

                    const blob = new Blob([fileText], { type: 'text/plain;charset=utf-8' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `HKM_Bibel_${refRange.replace(/[\s:]/g, '_')}.txt`;
                    a.click();
                    URL.revokeObjectURL(url);
                    this.clearSelection();
                }
            });
        }

        if (this.dom.toolbarBtnSaveUser) {
            this.dom.toolbarBtnSaveUser.addEventListener('click', async (e) => {
                e.stopPropagation();
                if (!this.currentUser) {
                    alert('Du må være logget inn for å lagre notater på brukeren din. Du kan fortsatt laste ned som fil!');
                    return;
                }
                
                if (this.selectedVerses && this.selectedVerses.length > 0) {
                    const sorted = [...this.selectedVerses].sort((a, b) => parseInt(a.verseNum, 10) - parseInt(b.verseNum, 10));
                    const translation = this.bibles.find(t => t.id === this.selectedBibleId)?.abbreviation || '';
                    const refRange = this.getSelectedVersesReference();
                    
                    const combinedHtmlText = sorted.map(v => {
                        const tempDiv = document.createElement('div');
                        tempDiv.innerHTML = v.paragraph.innerHTML;
                        tempDiv.querySelectorAll('sup').forEach(s => s.remove());
                        return `<p><sup>${v.verseNum}</sup> ${tempDiv.innerText.trim()}</p>`;
                    }).join('');

                    const fullNoteHtml = `<blockquote>${combinedHtmlText}</blockquote><p><em>— Lagret vers fra ${refRange} (${translation})</em></p>`;

                    try {
                        const db = this.getFirestore();
                        if (db) {
                            await db.collection('personal_notes').add({
                                userId: this.currentUser.uid,
                                title: refRange,
                                text: fullNoteHtml,
                                createdAt: this.getServerTimestamp(),
                                updatedAt: this.getServerTimestamp()
                            });
                            
                            if (typeof window.showToast === 'function') {
                                window.showToast('Versene ble lagret i dine notater på Min Side!', 'success');
                            } else {
                                alert('Lagret på din bruker! Du finner det under notater på Min Side.');
                            }
                            this.loadNotes();
                        } else {
                            throw new Error("Database utilgjengelig");
                        }
                    } catch (err) {
                        console.error(err);
                        alert('Feil under lagring: ' + err.message);
                    }
                    
                    this.clearSelection();
                }
            });
        }

        if (this.dom.toolbarBtnClear) {
            this.dom.toolbarBtnClear.addEventListener('click', (e) => {
                e.stopPropagation();
                this.clearSelection();
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
                    if (this.dom.verseToolbar) {
                        this.dom.verseToolbar.style.display = 'none';
                    }
                    // Clear highlighted verse if the user scrolls manually
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

                        // Position and show toolbar
                        if (this.dom.verseToolbar) {
                            this.dom.verseToolbar.style.display = 'flex';
                            
                            // Calculate position relative to scrollable pane to handle inline layout correctly
                            const pane = this.dom.readingPane.closest('.bible-content-pane');
                            const paneRect = pane.getBoundingClientRect();
                            const clickRelativeY = e.clientY - paneRect.top;
                            const paneHeight = pane.clientHeight;
                            
                            // Estimate toolbar height as 380px for layout bounding
                            const toolbarHeight = 380;
                            
                            // Determine position (above or below clicked verse)
                            const showBelow = clickRelativeY < 350;
                            
                            let y;
                            if (showBelow) {
                                this.dom.verseToolbar.classList.add('position-below');
                                // Position below click
                                let topY = clickRelativeY + 15;
                                // Bound bottom edge to prevent cutoff/overlap with bottom elements
                                if (topY + toolbarHeight > paneHeight - 16) {
                                    topY = Math.max(16, paneHeight - toolbarHeight - 16);
                                }
                                y = topY + pane.scrollTop;
                            } else {
                                this.dom.verseToolbar.classList.remove('position-below');
                                // Position above click
                                let bottomY = clickRelativeY - 10;
                                // Bound top edge to prevent cutoff at the top
                                if (bottomY - toolbarHeight < 16) {
                                    bottomY = toolbarHeight + 16;
                                }
                                y = bottomY + pane.scrollTop;
                            }
                            
                            this.dom.verseToolbar.style.left = '50%';
                            this.dom.verseToolbar.style.top = `${y}px`;
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

        if (this.dom.fontFamilySelect) this.dom.fontFamilySelect.value = this.settings.fontFamily;
        const fontFamilySelectMobile = document.getElementById('settings-font-family-mobile');
        if (fontFamilySelectMobile) fontFamilySelectMobile.value = this.settings.fontFamily;

        if (this.dom.layoutSelect) this.dom.layoutSelect.value = this.settings.layout;
        const layoutSelectMobile = document.getElementById('settings-layout-mobile');
        if (layoutSelectMobile) layoutSelectMobile.value = this.settings.layout;

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

    async loadTranslations() {
        try {
            const res = await fetch('/api/bible/bibles');
            const payload = await res.json();
            this.bibles = payload.data || [];
            
            const optionsHtml = this.bibles.map(t => 
                `<option value="${t.id}">${t.name} (${t.abbreviation})</option>`
            ).join('');

            if (this.dom.translationSelect) {
                this.dom.translationSelect.innerHTML = optionsHtml;
                this.dom.translationSelect.value = this.selectedBibleId;
            }

            const mobileTransSelect = document.getElementById('bible-translation-select-mobile');
            if (mobileTransSelect) {
                mobileTransSelect.innerHTML = optionsHtml;
                mobileTransSelect.value = this.selectedBibleId;
            }
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
            // Group standard 66 books: GT (0-38), NT (39-65)
            if (this.books.length === 66) {
                return index >= 39;
            }
            // Fallback heuristics
            const bookIdNum = parseInt(bookId, 10);
            return bookIdNum >= 40 || ['MAT', 'MRK', 'LUK', 'JHN', 'ACT', 'ROM', '1CO', '2CO', 'GAL', 'EPH', 'PHP', 'COL', '1TH', '2TH', '1TI', '2TI', 'TIT', 'PHM', 'HEB', 'JAS', '1PE', '2PE', '1JO', '2JO', '3JO', 'JUD', 'REV'].includes(bookId);
        };

        const renderBookItem = (b, index) => {
            const isActive = b.id === this.selectedBookId ? 'active' : '';
            return `
                <div class="book-item ${isActive}" data-id="${b.id}">
                    <span class="book-name">${b.name}</span>
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
                    // Automatically load the first chapter of this book so the screen isn't blank
                    if (this.chapters && this.chapters.length > 0) {
                        await this.selectChapter(this.chapters[0].id);
                    }
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
            const bookName = item.querySelector('.book-name').innerText.toLowerCase();
            if (bookName.includes(cleanQuery)) {
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
        const gridHtml = this.chapters.map(c => {
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

    renderFloatingBooks() {
        const container = document.getElementById('floating-books-container');
        if (!container) return;

        container.innerHTML = this.books.map(b => {
            const isActive = b.id === this.selectedBookId ? 'active' : '';
            return `
                <div class="floating-book-item ${isActive}" data-id="${b.id}">
                    <span>${b.name}</span>
                    <span class="material-symbols-outlined" style="font-size: 16px; opacity: 0.6;">chevron_right</span>
                </div>
            `;
        }).join('');

        container.querySelectorAll('.floating-book-item').forEach(item => {
            item.addEventListener('click', async () => {
                const bookId = item.dataset.id;
                
                // Highlight the selected book
                container.querySelectorAll('.floating-book-item').forEach(el => el.classList.remove('active'));
                item.classList.add('active');

                // Load book chapters (which calls renderChapters dynamically)
                await this.selectBook(bookId);

                // Switch view back to chapters
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
    }

    async selectChapter(chapterId) {
        // Stop audio playback when changing chapter
        this.stopAudioPlayback();

        this.clearSelection();
        this.selectedChapterId = chapterId;

        // Save last read position to localStorage
        this.safeSetLocalStorage('hkm_bible_last_chapter', chapterId);
        if (this.selectedBookId) {
            this.safeSetLocalStorage('hkm_bible_last_book', this.selectedBookId);
        }

        // Update URL search parameters without reloading
        try {
            const url = new URL(window.location.href);
            const currentBook = this.books ? this.books.find(b => b.id === this.selectedBookId) : null;
            const chapterNum = chapterId.split('_')[1];
            if (currentBook && chapterNum && !url.searchParams.get('plan')) {
                url.searchParams.set('ref', `${currentBook.name} ${chapterNum}`);
                window.history.replaceState({}, '', url.toString());
            }
        } catch (urlErr) {
            console.warn("[BibleReader] Failed to update URL parameters:", urlErr);
        }
        
        // Highlight in grid
        document.querySelectorAll('.chapter-grid .chapter-item, #floating-chapter-grid .chapter-item').forEach(el => {
            if (el.dataset.id === chapterId) el.classList.add('active');
            else el.classList.remove('active');
        });

        // Show loading spinner
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
            const payload = await res.json();
            if (this.selectedChapterId !== chapterId) return;
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
        if (!this.dom.chapterCrossRefsSection || !this.dom.chapterCrossRefsList) return;

        this.dom.chapterCrossRefsSection.style.display = 'none';
        this.dom.chapterCrossRefsList.innerHTML = '';

        try {
            const currentRef = this.getCurrentReferenceText();
            const res = await fetch(`/api/bible/cross-references?chapterName=${encodeURIComponent(currentRef)}`);
            if (!res.ok) throw new Error("Failed to fetch cross references");
            const crossRefs = await res.json();

            if (crossRefs && crossRefs.length > 0) {
                this.dom.chapterCrossRefsList.innerHTML = crossRefs.map(item => `
                    <div class="cross-ref-item" style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 8px; padding: 12px 16px; display: flex; flex-direction: column; gap: 4px; transition: all 0.2s; cursor: pointer; box-sizing: border-box; width: 100%;">
                        <div style="display: flex; align-items: center; justify-content: space-between; font-weight: 700; color: var(--bible-primary); font-size: 14px;">
                            <span>${item.ref}</span>
                            <span class="material-symbols-outlined" style="font-size: 16px;">open_in_new</span>
                        </div>
                        <div style="font-size: 13px; color: var(--text-base); line-height: 1.4;">${item.explanation}</div>
                    </div>
                `).join('');

                const items = this.dom.chapterCrossRefsList.querySelectorAll('.cross-ref-item');
                items.forEach((element, index) => {
                    element.addEventListener('click', () => {
                        this.parseAndNavigateToReference(crossRefs[index].ref);
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

                this.dom.chapterCrossRefsSection.style.display = 'block';
            } else {
                this.dom.chapterCrossRefsSection.style.display = 'none';
            }
        } catch (e) {
            console.error("Error loading chapter cross references:", e);
            this.dom.chapterCrossRefsSection.style.display = 'none';
        }
    }

    renderActiveChapter() {
        if (!this.dom.readingPane || !this.activeChapterData) return;

        // Render reference title
        const currentBook = this.books.find(b => b.id === this.selectedBookId);
        const chapterNum = this.selectedChapterId.split('_')[1];
        
        if (this.dom.currentBookBadge) {
            this.dom.currentBookBadge.innerText = currentBook ? currentBook.name.toUpperCase() : '';
        }
        if (this.dom.currentChapterNumber) {
            this.dom.currentChapterNumber.innerText = chapterNum;
        }
        if (this.dom.currentReferenceTitle) {
            this.dom.currentReferenceTitle.innerText = `${currentBook ? currentBook.name : ''} ${chapterNum}`;
        }
        
        const currentBible = this.bibles.find(t => t.id === this.selectedBibleId);
        if (this.dom.currentTranslationAbbr) {
            this.dom.currentTranslationAbbr.innerText = currentBible ? currentBible.abbreviation : '';
        }

        // Render verses HTML
        this.dom.readingPane.innerHTML = this.activeChapterData.content || '';

        // Restore bookmarks highlight
        this.restoreHighlights();

        // Highlight reading plan verses if in plan mode
        this.applyReadingPlanHighlights();

        // Inject Audio Play Button dynamically next to Lookup Chapter button
        if (this.dom.btnLookupChapter) {
            let playAudioBtn = document.getElementById('btn-play-audio-dynamic');
            if (!playAudioBtn) {
                playAudioBtn = document.createElement('button');
                playAudioBtn.id = 'btn-play-audio-dynamic';
                playAudioBtn.className = 'nav-btn';
                playAudioBtn.style.cssText = 'margin-top: 4px; font-size: 12px; padding: 6px 12px; border-radius: 6px; display: inline-flex; align-items: center; gap: 6px; cursor: pointer; background: var(--bg-card); border: 1px solid var(--border-color); color: var(--text-base); transition: all 0.2s; font-weight: 600; box-shadow: none !important; text-transform: none !important; min-height: 0 !important; min-width: 0 !important; height: auto !important;';
                playAudioBtn.innerHTML = `
                    <span class="material-symbols-outlined" style="font-size: 16px;">play_circle</span>
                    <span>${this.t('play_audio')}</span>
                `;
                
                // Click listener
                playAudioBtn.addEventListener('click', () => this.toggleAudioPlayback());
                
                // Insert after lookup button
                this.dom.btnLookupChapter.parentNode.insertBefore(playAudioBtn, this.dom.btnLookupChapter.nextSibling);
            } else {
                // Update translation text if language changed
                const labelSpan = playAudioBtn.querySelector('span:not(.material-symbols-outlined)');
                if (labelSpan) labelSpan.textContent = this.t('play_audio');
            }
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
        const chapterNum = parseInt(this.selectedChapterId.split('_')[1], 10);
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
                
                const targetChapNum = direction === 1 ? '1' : String(this.chapters.length);
                const nextChapterId = `${nextBook.id}_${targetChapNum}`;
                await this.selectChapter(nextChapterId);
            }
        }
    }

    async parseAndNavigateToReference(query) {
        if (!query) return;

        try {
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
                "åpenbaringen": 66, "åp": 66, "johannes åpenbaring": 66, "åpenbaring": 66
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
                    const pane = this.dom.readingPane.closest('.bible-content-pane');
                    if (pane) {
                        const paneRect = pane.getBoundingClientRect();
                        const pRect = p.getBoundingClientRect();
                        const targetScrollTop = pane.scrollTop + (pRect.top - paneRect.top) - (paneRect.height / 2) + (pRect.height / 2);
                        pane.scrollTo({
                            top: targetScrollTop,
                            behavior: 'smooth'
                        });
                    } else {
                        p.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                    
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

    getCurrentReferenceText() {
        const book = this.books ? this.books.find(b => b.id === this.selectedBookId) : null;
        const chapterNum = (this.selectedChapterId && this.selectedChapterId.includes('_'))
            ? this.selectedChapterId.split('_')[1]
            : '1';
        return `${book ? book.name : ''} ${chapterNum}`.trim();
    }

    async lookupWord(word, contextText, refText) {
        this.dom.dictDrawer.classList.add('active');
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

        // Preprocessing: Fix missing spacing/newlines before and after header tags (e.g. "word.### Heading" -> "word.\n\n### Heading")
        html = html.replace(/([^#\n])(#{1,3}\s+)/g, '$1\n\n$2');

        // Preprocessing: Fix missing newlines at lowercase-to-uppercase boundaries (e.g. "kontekstI" -> "kontekst\n\nI")
        // This splits combined headers and paragraph text if newlines were stripped.
        html = html.replace(/([a-zæøå])([A-ZÆØÅ])/g, '$1\n\n$2');

        // Headers (using multiline anchors to match line-by-line accurately)
        html = html.replace(/^### (.*?)$/gm, '<h5 style="font-weight:700; font-size:14px; margin-top:16px; margin-bottom:8px; color:var(--text-base);">$1</h5>');
        html = html.replace(/^## (.*?)$/gm, '<h4 style="font-weight:700; font-size:15px; margin-top:20px; margin-bottom:10px; color:var(--text-base);">$1</h4>');
        html = html.replace(/^# (.*?)$/gm, '<h3 style="font-weight:700; font-size:16px; margin-top:24px; margin-bottom:12px; color:var(--text-base);">$1</h3>');

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
                processedLines.push(`<li style="font-size:13px; line-height:1.5; color:var(--text-base); margin-bottom:4px;">${content}</li>`);
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

        // Paragraphs: Split on single newlines so any text lines get wrapped as paragraphs for maximum readability.
        const blocks = html.split('\n');
        const processedBlocks = [];
        for (let block of blocks) {
            const trimmed = block.trim();
            if (!trimmed) continue;
            if (trimmed.startsWith('<h') || trimmed.startsWith('<ul') || trimmed.startsWith('<li') || trimmed.startsWith('</ul')) {
                processedBlocks.push(trimmed);
            } else {
                processedBlocks.push(`<p style="margin-bottom:16px; line-height:1.6; font-size:14px; color:var(--text-base);">${trimmed}</p>`);
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
            // Add highlight
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

    restoreHighlights() {
        const ref = this.getCurrentReferenceText();
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
                const verseNum = parseInt(sup.innerText.trim(), 10);
                if (bookmarkedVerses.has(verseNum)) {
                    p.classList.add('highlighted');
                } else {
                    p.classList.remove('highlighted');
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

        // Combine everything
        relatedList.innerHTML = `
            <div class="hkm-resources-tab-container" style="padding: 4px 0;">
                ${bpVideoHtml}
                ${planResourcesHtml}
                ${crossRefsHtml}
                ${generalResourcesHtml}
            </div>
        `;

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
                .hkm-yv-header-btn-close { background: none !important; border: none !important; padding: 8px !important; cursor: pointer !important; color: #475569 !important; display: flex !important; align-items: center !important; justify-content: center !important; border-radius: 50% !important; transition: background-color 0.2s !important; }
                .hkm-yv-header-btn-close:hover { background: #f1f5f9 !important; }
                .hkm-yv-header-title { display: flex !important; align-items: center !important; gap: 10px !important; flex: 1 !important; margin: 0 16px !important; min-width: 0 !important; }
                .hkm-yv-header-avatar { width: 28px !important; height: 28px !important; border-radius: 50% !important; background: linear-gradient(135deg, #d17d39 0%, #bd4f2a 100%) !important; color: white !important; display: flex !important; align-items: center !important; justify-content: center !important; font-weight: 700 !important; font-size: 13px !important; flex-shrink: 0 !important; box-shadow: 0 2px 4px rgba(209, 125, 57, 0.2) !important; }
                .hkm-yv-header-text { font-size: 15px !important; font-weight: 700 !important; color: #1B4965 !important; white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important; }
                .hkm-yv-header-text-full { display: inline-block !important; }
                .hkm-yv-header-text-short { display: none !important; }
                @media (max-width: 768px) {
                    .hkm-yv-header-text-full { display: none !important; }
                    .hkm-yv-header-text-short { display: inline-block !important; }
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
                .hkm-yv-nav-circle-btn { width: 44px !important; height: 44px !important; border-radius: 50% !important; background: #f1f5f9 !important; border: none !important; color: #475569 !important; display: flex !important; align-items: center !important; justify-content: center !important; cursor: pointer !important; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important; }
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
                .bible-theme-dark .hkm-devotional-prayer-box { background: #1e293b !important; color: #cbd5e1 !important; border-left-color: #d17d39 !important; }
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
                .bible-theme-cream .hkm-devotional-prayer-box { background: #faf7f0 !important; color: #4a5568 !important; border-left-color: #d17d39 !important; }
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
        modal.style.cssText = 'position:fixed; inset:0; background:rgba(15,23,42,0.3); backdrop-filter:blur(4px); display:flex; align-items:center; justify-content:center; z-index:9999; padding:16px;';
        
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
        this.activePlanMode = true;
        this.activePlanId = planId;
        this.activePlanDay = parseInt(dayNumFromUrl, 10) || this.activePlanDay || null;
        
        // Force running text layout (paragraph) for reading plans / prayer apps
        this.settings.layout = 'paragraph';
        this.applySettings();
        
        // Inject styles dynamically
        this.injectReadingPlanStyles();

        const db = this.getFirestore();
        if (!db) {
            console.warn("[BibleReader] Firestore is not available, unable to load plan in detail.");
            return;
        }

        try {
            // Fetch global plan data
            const planDoc = await db.collection('reading_plans').doc(planId).get();
            if (!planDoc.exists) {
                console.error("[BibleReader] Plan does not exist:", planId);
                return;
            }
            this.activePlanData = { id: planDoc.id, ...planDoc.data() };

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
            /* Hide page footer when reading plan is active to prevent page scrolling */
            body:has(#bible-sidebar.reading-plan-active) footer.footer {
                display: none !important;
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
            }

            /* Mobile/Tablet portrait: Full screen reading plan when active drawer is open */
            @media (max-width: 1024px) {
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
                width: 38px;
                height: 38px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: all 0.2s ease;
                flex-shrink: 0;
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
        const dayConfig = globalPlan.days.find(d => d.dayNumber === currentDayNum) || globalPlan.days[0];

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

        let displayTitle = globalPlan.title || '';
        const titleLower = displayTitle.toLowerCase();
        if (titleLower.includes('johannesevangeliet') || titleLower.includes('gospel of john') || titleLower.includes('evangelio de juan')) {
            displayTitle = lang === 'no' ? 'Johannes' : (lang === 'es' ? 'Juan' : 'John');
        } else if (titleLower.includes('matteusevangeliet') || titleLower.includes('gospel of matthew') || titleLower.includes('evangelio de mateo')) {
            displayTitle = lang === 'no' ? 'Matteus' : (lang === 'es' ? 'Mateo' : 'Matthew');
        } else if (titleLower.includes('markusevangeliet') || titleLower.includes('gospel of mark') || titleLower.includes('evangelio de marcos')) {
            displayTitle = lang === 'no' ? 'Markus' : (lang === 'es' ? 'Marcos' : 'Mark');
        } else if (titleLower.includes('lukasevangeliet') || titleLower.includes('gospel of luke') || titleLower.includes('evangelio de lucas')) {
            displayTitle = lang === 'no' ? 'Lukas' : (lang === 'es' ? 'Lucas' : 'Luke');
        }

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
        const uncompletedCircle = `<div style="width: 24px; height: 24px; border-radius: 50%; border: 2px solid var(--border-color); flex-shrink: 0; box-sizing: border-box; background: transparent;"></div>`;
        const completedCircle = `
            <div style="width: 24px; height: 24px; border-radius: 50%; border: 2px solid #10b981; background: #10b981; display: flex; align-items: center; justify-content: center; color: #ffffff; flex-shrink: 0; box-sizing: border-box;">
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
                            <h2 class="hkm-rp-sidebar-title" style="margin: 0; font-size: 15px; font-weight: 800; color: var(--text-base); max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${displayTitle}</h2>
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
                            <a href="/minside/login.html" class="hkm-btn-secondary" style="height: 34px !important; font-size: 12px !important; padding: 0 16px !important; align-self: flex-start; text-decoration: none !important; border-radius: 6px !important; border-color: #d17d39 !important; color: #d17d39 !important; display: inline-flex; align-items: center; justify-content: center;">
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
        let globalPlan = this.activePlanData;
        let dayConfig = null;

        if (globalPlan && globalPlan.id === planId) {
            dayConfig = globalPlan.days.find(d => d.dayNumber === dayNumber);
        }

        if (!dayConfig) {
            const db = this.getFirestore();
            if (db) {
                const globalPlanSnap = await db.collection('reading_plans')
                    .doc(planId)
                    .get();

                if (globalPlanSnap.exists) {
                    globalPlan = { id: globalPlanSnap.id, ...globalPlanSnap.data() };
                    dayConfig = globalPlan.days.find(d => d.dayNumber === dayNumber);
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
        const input = versesText.trim().toLowerCase();
        const regex = /^(\d+)?\s*\.?\s*([a-zæøå\s]+)\s*(\d+)(?:\s*[\:\.\s]\s*(\d+)(?:\-(\d+))?)?$/i;
        const match = input.match(regex);

        if (!match) {
            throw new Error("Invalid reference format");
        }

        const prefixNum = match[1] || '';
        const bookNameQuery = match[2].trim();
        const chapterNum = match[3];
        const startVerse = match[4] ? parseInt(match[4], 10) : null;
        const endVerse = match[5] ? parseInt(match[5], 10) : (startVerse || null);

        let fullBookSearchName = prefixNum ? `${prefixNum} ${bookNameQuery}` : bookNameQuery;
        if (fullBookSearchName === 'apg') {
            fullBookSearchName = 'apostlenes';
        }

        const matchedBook = this.books.find(b => {
            const bName = b.name.toLowerCase();
            return bName === fullBookSearchName || bName.startsWith(fullBookSearchName) || bName.includes(fullBookSearchName);
        });

        if (!matchedBook) {
            throw new Error(`Book not found: ${fullBookSearchName}`);
        }

        const chapterId = `${matchedBook.id}_${chapterNum}`;
        const res = await fetch(`/api/bible/bibles/${this.selectedBibleId}/chapters/${chapterId}`);
        const payload = await res.json();
        
        if (!payload.data || !payload.data.content) {
            throw new Error("Failed to load chapter content");
        }

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
                    if (!startVerse || (vNum >= startVerse && vNum <= endVerse)) {
                        keepParagraph = true;
                        foundAny = true;
                    }
                }
                if (keepParagraph) {
                    filteredHtml += p.outerHTML;
                }
            } else if (!startVerse) {
                filteredHtml += p.outerHTML;
            }
        }

        if (!foundAny && startVerse) {
            return payload.data.content;
        }

        return filteredHtml;
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
                        <div style="font-family: 'Merriweather', 'Georgia', serif; font-style: italic; font-size: 17px; line-height: 1.7; color: #334155;">
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
                    <blockquote style="margin: 16px 0; padding: 16px 24px; border-left: 4px solid var(--bible-primary, #1B4965); background: rgba(27, 73, 101, 0.03); font-family: 'Merriweather', 'Georgia', serif; font-style: italic; font-size: 17px; line-height: 1.7; color: #475569; border-radius: 0 8px 8px 0; border-top: none; border-right: none; border-bottom: none;">
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
            
            return `<p style="margin-bottom: 16px; line-height: 1.8; font-family: 'Merriweather', 'Georgia', serif; font-size: 17px; color: #334155;">${formatted}</p>`;
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
                    return `<p style="margin-bottom: 16px; line-height: 1.8; font-family: 'Merriweather', 'Georgia', serif; font-size: 17px; color: #334155;">${trimmed}</p>`;
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
                        return `<h3 style="font-size: 1.3em; font-weight: 700; color: #1B4965; margin-top: ${marginTop}; margin-bottom: 10px; font-family: system-ui, -apple-system, sans-serif; line-height: 1.3;">${textContent}</h3>`;
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
                                <div style="font-family: 'Merriweather', 'Georgia', serif; font-style: italic; font-size: 17px; line-height: 1.7; color: #334155;">
                                    ${prayerContent}
                                </div>
                            </div>
                        `;
                    }
                    
                    // 3. Blockquotes
                    if (tagName === 'blockquote') {
                        return `
                            <blockquote style="margin: 16px 0; padding: 16px 24px; border-left: 4px solid var(--bible-primary, #1B4965); background: rgba(27, 73, 101, 0.03); font-family: 'Merriweather', 'Georgia', serif; font-style: italic; font-size: 17px; line-height: 1.7; color: #475569; border-radius: 0 8px 8px 0; border-top: none; border-right: none; border-bottom: none;">
                                ${innerHtml}
                            </blockquote>
                        `;
                    }
                    
                    // 4. Default paragraph or element, preserve original style
                    return `<p style="margin-bottom: 16px; line-height: 1.8; font-family: 'Merriweather', 'Georgia', serif; font-size: 17px; color: #334155;">${innerHtml}</p>`;
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

        let fullTitleText = plan.title || '';
        if (fullTitleText.includes(':')) {
            fullTitleText = fullTitleText.split(':')[0].trim();
        }
        if (fullTitleText.includes('-')) {
            fullTitleText = fullTitleText.split('-')[0].trim();
        }
        if (fullTitleText.includes('–')) {
            fullTitleText = fullTitleText.split('–')[0].trim();
        }
        if (fullTitleText.includes('|')) {
            fullTitleText = fullTitleText.split('|')[0].trim();
        }

        // Abbreviate common long plan titles to fit nicely in mobile headers
        let shortTitleText = fullTitleText;
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

        // Truncate fallback if title remains too long
        if (shortTitleText.length > 20) {
            shortTitleText = shortTitleText.substring(0, 17) + '...';
        }
        if (fullTitleText.length > 40) {
            fullTitleText = fullTitleText.substring(0, 37) + '...';
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

    startAudioPlayback() {
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
            infoDisplay.textContent = 'Genererer lyd med AI...';
        }

        const lang = document.documentElement.lang || 'no';

        // Call getBibleChapterAudio Cloud Function
        const callable = firebase.functions().httpsCallable('getBibleChapterAudio');
        callable({
            bookId: this.selectedBookId,
            chapterNum: this.selectedChapterId.split('_')[1],
            lang: lang,
            text: chapterText,
            voice: this.audioVoice
        })
        .then(result => {
            if (!this.audioIsPlaying) {
                // User stopped playback while it was generating
                return;
            }

            const audioUrl = result.data.audioUrl;
            if (!audioUrl) {
                throw new Error("Mottok ingen lyd-URL fra serveren.");
            }

            console.log("Playing Bible audio:", audioUrl);
            
            // Create Audio object
            this.bibleAudio = new Audio(audioUrl);
            this.bibleAudio.playbackRate = this.audioSpeed || 1.0;
            
            // Bind audio events
            this.bibleAudio.onended = () => {
                this.stopAudioPlayback();
            };

            this.bibleAudio.onerror = (e) => {
                console.error("Audio playback error:", e);
                alert("Feil under avspilling av lydfilen.");
                this.stopAudioPlayback();
            };

            this.bibleAudio.play().then(() => {
                if (infoDisplay) {
                    infoDisplay.textContent = (this.t('playing_verse') || 'Spiller av') + '...';
                }
                this.updateAudioPlayerUI();
            }).catch(playErr => {
                console.error("Audio play failed:", playErr);
                alert("Kunne ikke starte avspilling av lydfilen.");
                this.stopAudioPlayback();
            });
        })
        .catch(error => {
            console.error("Error generating Bible audio:", error);
            alert("Kunne ikke generere lyd for kapittelet: " + error.message);
            this.stopAudioPlayback();
        });
    }

    stopAudioPlayback() {
        if (!this.audioIsPlaying) return;
        
        this.audioIsPlaying = false;
        this.audioIsPaused = false;
        
        if (this.bibleAudio) {
            this.bibleAudio.pause();
            this.bibleAudio.onended = null;
            this.bibleAudio.onerror = null;
            this.bibleAudio = null;
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
    }

    resumeAudioPlayback() {
        if (this.bibleAudio) {
            this.bibleAudio.play().catch(err => {
                console.error("Error resuming audio playback:", err);
                this.stopAudioPlayback();
            });
        }
    }

    showAudioPlayerBar() {
        let playerBar = document.getElementById('hkm-audio-player-bar');
        if (!playerBar) {
            const activeLang = document.documentElement.lang || 'no';
            const labelVoice = activeLang === 'es' ? 'Voz' : (activeLang === 'en' ? 'Voice' : 'Stemme');
            const labelMale = activeLang === 'es' ? 'Hombre' : (activeLang === 'en' ? 'Male' : 'Mann (Onyx)');
            const labelFemale = activeLang === 'es' ? 'Mujer' : (activeLang === 'en' ? 'Female' : 'Kvinne (Nova)');

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
                    <option value="onyx">${labelMale}</option>
                    <option value="nova">${labelFemale}</option>
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
        if (speedSelect) speedSelect.value = String(this.audioSpeed);

        const voiceSelect = document.getElementById('audio-voice-select');
        if (voiceSelect) voiceSelect.value = String(this.audioVoice);
        
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
}

document.addEventListener('DOMContentLoaded', () => {
    window.bibleReader = new BibleReader();
    
    // Wire up bookmarks/history rendering
    setTimeout(() => {
        window.bibleReader.renderBookmarksList();
        window.bibleReader.renderHistoryList();
    }, 500);
});
