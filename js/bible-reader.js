// js/bible-reader.js
import { firebaseService } from './firebase-service.js';

class BibleReader {
    getFirestore() {
        if (window.firebase && typeof firebase.firestore === 'function') {
            try {
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

    constructor() {
        this.bibles = [];
        this.books = [];
        this.chapters = [];
        const activeLang = document.documentElement.lang || 'no';
        let defaultBible = 'OPENBIBLE_NB';
        if (activeLang === 'en') defaultBible = 'WEB';
        else if (activeLang === 'es') defaultBible = 'RVR1960';
        this.selectedBibleId = localStorage.getItem('hkm_bible_translation') || defaultBible;
        this.selectedBookId = '';
        this.selectedChapterId = '';
        this.activeChapterData = null;
        this.bookmarks = JSON.parse(localStorage.getItem('hkm_bible_bookmarks')) || [];
        this.history = JSON.parse(localStorage.getItem('hkm_bible_history')) || [];
        this.selectedVerses = [];

        // UI Settings
        this.settings = JSON.parse(localStorage.getItem('hkm_bible_settings')) || {
            fontSize: 18,
            fontFamily: 'serif', // 'serif' | 'sans'
            lineHeight: 1.6,
            theme: 'cream' // 'light' | 'cream' | 'dark'
        };

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
                'dictionary': 'Ordbok'
            },
            'en': {
                'empty_bookmarks': 'No saved verses yet. Click on a verse in the text to save it.',
                'empty_history': 'No history yet.',
                'empty_notes': 'No notes yet. Write your reflections here!',
                'no_book_selected': 'No book selected.',
                'no_resources_found': 'No related resources found for this book yet.',
                'new_note': 'New Note',
                'fetching_resources': 'Fetching related resources...',
                'dictionary': 'Lexicon'
            },
            'es': {
                'empty_bookmarks': 'Aún no hay versículos guardados. Haz clic en un versículo en el texto para guardarlo.',
                'empty_history': 'Aún no hay historial.',
                'empty_notes': 'Aún no hay notas. ¡Escribe tus reflexiones aquí!',
                'no_book_selected': 'Ningún libro seleccionado.',
                'no_resources_found': 'Aún no se han encontrado recursos relacionados para este libro.',
                'new_note': 'Nueva Nota',
                'fetching_resources': 'Obteniendo recursos relacionados...',
                'dictionary': 'Diccionario'
            }
        };
        return (translations[lang] || translations['no'])[key] || key;
    }

    async init() {
        this.setupDOMElements();
        this.applySettings();
        this.bindEvents();
        this.setupSwipeGestures();
        
        // Listen to Firebase auth state for synchronizing notes
        let authInitialized = false;
        if (window.firebase && typeof firebase.auth === 'function') {
            try {
                firebase.auth().onAuthStateChanged(user => {
                    this.currentUser = user;
                    this.loadNotes();
                    this.loadReadingPlan();
                });
                authInitialized = true;
            } catch (e) {
                console.warn("[BibleReader] firebase.auth setup failed:", e);
            }
        }
        
        if (!authInitialized) {
            this.currentUser = null;
            this.loadNotes();
            this.loadReadingPlan();
        }
        
        await this.loadTranslations();
        
        // Handle deep-linking from URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const refParam = urlParams.get('ref'); // e.g. "Joh_3" or "Sal_23_1"
        const transParam = urlParams.get('trans'); // e.g. "DNB"
        const lexParam = urlParams.get('lex') || urlParams.get('dict'); // e.g. "nåde"

        if (transParam) {
            this.selectedBibleId = transParam;
            if (this.dom.translationSelect) this.dom.translationSelect.value = transParam;
            const mobileTransSelect = document.getElementById('bible-translation-select-mobile');
            if (mobileTransSelect) mobileTransSelect.value = transParam;
        }

        await this.loadBooks();

        if (refParam) {
            await this.parseAndNavigateToReference(refParam);
        } else {
            // Load default (John 1 or first book)
            const defaultBook = this.books.find(b => b.id === '43') || this.books[0]; // John
            if (defaultBook) {
                await this.selectBook(defaultBook.id);
                await this.selectChapter(`${defaultBook.id}_1`);
            }
        }

        if (lexParam) {
            setTimeout(() => {
                this.lookupWord(lexParam);
            }, 500);
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
            dictSpinner: document.getElementById('dict-spinner'),
            dictContentWrap: document.getElementById('dict-content-wrap'),
            dictManualTrigger: document.getElementById('dict-manual-trigger'),
            dictSearchInput: document.getElementById('dict-search-input'),
            dictSearchSubmitBtn: document.getElementById('dict-search-submit-btn'),
            dictWelcomeState: document.getElementById('dict-welcome-state'),
            
            // Bookmarks / History sidebar
            bookmarksList: document.getElementById('bookmarks-list'),
            historyList: document.getElementById('history-list'),
            notesList: document.getElementById('notes-list'),
            readingPlanContent: document.getElementById('tab-reading-plan-content'),

            // Verse Context Toolbar & Chapter Lookup
            verseToolbar: document.getElementById('verse-context-toolbar'),
            toolbarBtnBookmark: document.getElementById('toolbar-btn-bookmark'),
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
    }

    bindEvents() {
        // Translation change
        if (this.dom.translationSelect) {
            this.dom.translationSelect.addEventListener('change', async (e) => {
                this.selectedBibleId = e.target.value;
                localStorage.setItem('hkm_bible_translation', this.selectedBibleId);
                const mobileTransSelect = document.getElementById('bible-translation-select-mobile');
                if (mobileTransSelect) mobileTransSelect.value = this.selectedBibleId;
                await this.loadBooks();
                // Re-navigate to current book/chapter if possible
                const activeBookId = this.selectedBookId;
                const activeChapterNum = this.selectedChapterId.split('_')[1] || '1';
                await this.selectBook(activeBookId);
                await this.selectChapter(`${activeBookId}_${activeChapterNum}`);
            });
        }

        // Mobile translation change
        const mobileTransSelect = document.getElementById('bible-translation-select-mobile');
        if (mobileTransSelect) {
            mobileTransSelect.addEventListener('change', async (e) => {
                this.selectedBibleId = e.target.value;
                localStorage.setItem('hkm_bible_translation', this.selectedBibleId);
                if (this.dom.translationSelect) this.dom.translationSelect.value = this.selectedBibleId;
                await this.loadBooks();
                // Re-navigate to current book/chapter if possible
                const activeBookId = this.selectedBookId;
                const activeChapterNum = this.selectedChapterId.split('_')[1] || '1';
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

        // Theme selection
        this.dom.themeSelectors.forEach(btn => {
            btn.addEventListener('click', () => {
                this.settings.theme = btn.dataset.theme;
                this.applySettings();
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

        // Reading Mode Toggle
        const toggleReadingModeBtn = document.getElementById('btn-toggle-reading-mode');
        if (toggleReadingModeBtn) {
            toggleReadingModeBtn.addEventListener('click', () => {
                const isActive = document.body.classList.toggle('reading-mode-active');
                
                // Update button icon & tooltip
                const icon = toggleReadingModeBtn.querySelector('.material-symbols-outlined');
                if (icon) {
                    icon.innerText = isActive ? 'close_fullscreen' : 'chrome_reader_mode';
                }
                toggleReadingModeBtn.title = isActive ? 'Avslutt lesemodus' : 'Aktiver lesemodus';
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
                    await this.jumpToReference(refStr);
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
                // Sync desktop reading mode button icon
                const icon = document.getElementById('btn-toggle-reading-mode')?.querySelector('.material-symbols-outlined');
                if (icon) {
                    icon.innerText = isActive ? 'close_fullscreen' : 'chrome_reader_mode';
                }
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
                    const unbookmarked = this.selectedVerses.filter(v => {
                        const fullRef = `${ref}:${v.verseNum}`;
                        return !this.bookmarks.some(b => b.ref === fullRef && b.bibleId === this.selectedBibleId);
                    });

                    if (unbookmarked.length > 0) {
                        // Bookmark all selected verses
                        unbookmarked.forEach(v => {
                            const fullRef = `${ref}:${v.verseNum}`;
                            this.bookmarks.push({
                                id: Date.now().toString() + '_' + Math.random().toString(36).substr(2, 5),
                                ref: fullRef,
                                bookId: this.selectedBookId,
                                chapterId: this.selectedChapterId,
                                verse: v.verseNum,
                                bibleId: this.selectedBibleId,
                                createdAt: new Date().toISOString()
                            });
                        });
                    } else {
                        // Unbookmark all selected verses
                        this.selectedVerses.forEach(v => {
                            const fullRef = `${ref}:${v.verseNum}`;
                            this.bookmarks = this.bookmarks.filter(b => !(b.ref === fullRef && b.bibleId === this.selectedBibleId));
                        });
                    }

                    localStorage.setItem('hkm_bible_bookmarks', JSON.stringify(this.bookmarks));
                    this.renderBookmarksList();
                    this.restoreHighlights();
                    this.clearSelection();
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

        // Hide toolbar on scroll in content pane
        const mainContentPane = document.querySelector('.bible-content-pane');
        if (mainContentPane) {
            mainContentPane.addEventListener('scroll', () => {
                if (this.dom.verseToolbar) {
                    this.dom.verseToolbar.style.display = 'none';
                }
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
                        
                        // Toggle selected state
                        const existingIdx = this.selectedVerses.findIndex(v => v.verseNum === verseNum && v.paragraph === paragraph);
                        if (existingIdx >= 0) {
                            this.selectedVerses.splice(existingIdx, 1);
                            paragraph.classList.remove('selected-verse');
                        } else {
                            this.selectedVerses.push({ paragraph, verseNum });
                            paragraph.classList.add('selected-verse');
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
                        
                        if (this.dom.toolbarBookmarkText) {
                            this.dom.toolbarBookmarkText.innerText = allBookmarked ? 'Fjern bokmerke' : 'Bokmerk';
                        }
                        const bookmarkIcon = this.dom.toolbarBtnBookmark ? this.dom.toolbarBtnBookmark.querySelector('.material-symbols-outlined') : null;
                        if (bookmarkIcon) {
                            bookmarkIcon.innerText = allBookmarked ? 'bookmark_remove' : 'bookmark';
                        }

                        // Position and show toolbar
                        if (this.dom.verseToolbar) {
                            this.dom.verseToolbar.style.display = 'flex';
                            
                            // Align at horizontal center of the paragraph and top of it
                            const x = paragraph.offsetLeft + (paragraph.offsetWidth / 2);
                            const y = paragraph.offsetTop;
                            
                            this.dom.verseToolbar.style.left = `${x}px`;
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
        localStorage.setItem('hkm_bible_settings', JSON.stringify(this.settings));
        
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
        }

        if (this.dom.fontFamilySelect) this.dom.fontFamilySelect.value = this.settings.fontFamily;
        const fontFamilySelectMobile = document.getElementById('settings-font-family-mobile');
        if (fontFamilySelectMobile) fontFamilySelectMobile.value = this.settings.fontFamily;

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
        if (!this.dom.chapterGrid) return;

        this.dom.chapterGrid.innerHTML = this.chapters.map(c => {
            const isActive = c.id === this.selectedChapterId ? 'active' : '';
            return `<div class="chapter-item ${isActive}" data-id="${c.id}">${c.number}</div>`;
        }).join('');

        this.dom.chapterGrid.querySelectorAll('.chapter-item').forEach(item => {
            item.addEventListener('click', async () => {
                this.dom.chapterGrid.querySelectorAll('.chapter-item').forEach(el => el.classList.remove('active'));
                item.classList.add('active');
                await this.selectChapter(item.dataset.id);
                
                // Hide chapter selector overlay
                const overlay = document.getElementById('chapter-selector-overlay');
                if (overlay) {
                    overlay.classList.remove('active');
                }
                
                // Hide mobile/reading-mode sidebar if active
                if (this.dom.sidebar && this.dom.sidebar.classList.contains('active')) {
                    this.dom.sidebar.classList.remove('active');
                }
            });
        });
    }

    async selectChapter(chapterId) {
        this.clearSelection();
        this.selectedChapterId = chapterId;
        
        // Highlight in grid
        if (this.dom.chapterGrid) {
            this.dom.chapterGrid.querySelectorAll('.chapter-item').forEach(el => {
                if (el.dataset.id === chapterId) el.classList.add('active');
                else el.classList.remove('active');
            });
        }

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
        if (floatBookSpan && currentBook) floatBookSpan.innerText = currentBook.name;
        if (floatChapSpan) floatChapSpan.innerText = chapterNum;
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
        const input = query.trim().toLowerCase();
        
        // Regex match, e.g. "1. Johannes 3:16", "Johannes 3:16", "Salmene 23"
        const regex = /^(\d+)?\s*\.?\s*([a-zæøå\s]+)\s*(\d+)(?:\s*[\:\.\s]\s*(\d+))?$/i;
        const match = input.match(regex);

        if (!match) {
            alert("Ugyldig bibelreferanse. Prøv f.eks. 'Johannes 3:16', '1 Mos 1:1' eller 'Salmene 23'.");
            return;
        }

        const prefixNum = match[1] || '';
        const bookNameQuery = match[2].trim();
        const chapterNum = match[3];
        const verseNum = match[4];

        // Format search query to match book name, e.g., "1 mosebok", "johannes"
        let fullBookSearchName = prefixNum ? `${prefixNum} ${bookNameQuery}` : bookNameQuery;

        // Translate Norwegian abbreviations
        if (fullBookSearchName === 'apg') {
            fullBookSearchName = 'apostlenes';
        }

        const matchedBook = this.books.find(b => {
            const bName = b.name.toLowerCase();
            return bName === fullBookSearchName || bName.startsWith(fullBookSearchName) || bName.includes(fullBookSearchName);
        });

        if (!matchedBook) {
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
    }

    scrollToVerse(verseNum) {
        setTimeout(() => {
            const paragraphs = this.dom.readingPane.querySelectorAll('p');
            for (const p of paragraphs) {
                const sup = p.querySelector('sup.v');
                if (sup && sup.innerText.trim() === String(verseNum)) {
                    p.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    p.classList.add('verse-temp-highlight');
                    setTimeout(() => p.classList.remove('verse-temp-highlight'), 3000);
                    break;
                }
            }
        }, 300);
    }

    getCurrentReferenceText() {
        const book = this.books.find(b => b.id === this.selectedBookId);
        const chapterNum = this.selectedChapterId.split('_')[1];
        return `${book ? book.name : ''} ${chapterNum}`;
    }

    async lookupWord(word, contextText, refText) {
        this.dom.dictDrawer.classList.add('active');
        if (this.dom.dictWelcomeState) this.dom.dictWelcomeState.style.display = 'none';
        this.dom.dictSpinner.style.display = 'flex';
        this.dom.dictContentWrap.style.display = 'none';
        
        if (this.dom.dictSearchInput) this.dom.dictSearchInput.value = word;
        this.dom.dictWordTitle.innerText = word;

        const dictRelatedBox = document.getElementById('dict-related-resources');
        if (dictRelatedBox) dictRelatedBox.innerHTML = '';

        try {
            const params = new URLSearchParams({
                word: word,
                context: contextText || '',
                scriptureRef: refText || '',
                lang: document.documentElement.lang || 'no'
            });

            // Parallel load AI definition and relevant site resources
            const [dictRes, resources] = await Promise.all([
                fetch(`/api/bible/dictionary?${params.toString()}`).then(r => r.json()),
                this.searchLocalResources(word)
            ]);

            this.dom.dictSpinner.style.display = 'none';
            this.dom.dictContentWrap.style.display = 'block';

            this.dom.dictWordTitle.innerText = dictRes.word || word;
            this.dom.dictCategory.innerText = dictRes.category || this.t('dictionary');
            this.dom.dictDefinition.innerHTML = dictRes.definition || '';
            this.dom.dictContextualNote.innerHTML = dictRes.contextualNote || '';

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
            this.dom.dictSpinner.style.display = 'none';
            this.dom.dictContentWrap.style.display = 'block';
            this.dom.dictCategory.innerText = 'Feil';
            this.dom.dictDefinition.innerHTML = 'Kunne ikke kontakte ordbok-tjenesten. Kontroller nettforbindelsen din.';
            this.dom.dictContextualNote.innerHTML = '';
        }
    }

    toggleVerseHighlight(paragraphElement, verseNumber) {
        const ref = this.getCurrentReferenceText();
        const fullRef = `${ref}:${verseNumber}`;
        
        const existingIdx = this.bookmarks.findIndex(b => b.ref === fullRef && b.bibleId === this.selectedBibleId);

        if (existingIdx >= 0) {
            // Remove highlight
            this.bookmarks.splice(existingIdx, 1);
            paragraphElement.classList.remove('highlighted');
        } else {
            // Add highlight
            this.bookmarks.push({
                id: Date.now().toString(),
                ref: fullRef,
                bookId: this.selectedBookId,
                chapterId: this.selectedChapterId,
                verse: verseNumber,
                bibleId: this.selectedBibleId,
                createdAt: new Date().toISOString()
            });
            paragraphElement.classList.add('highlighted');
        }

        localStorage.setItem('hkm_bible_bookmarks', JSON.stringify(this.bookmarks));
        this.renderBookmarksList();
    }

    restoreHighlights() {
        const ref = this.getCurrentReferenceText();
        const activeBookmarks = this.bookmarks.filter(b => b.chapterId === this.selectedChapterId && b.bibleId === this.selectedBibleId);
        
        const paragraphs = this.dom.readingPane.querySelectorAll('p');
        paragraphs.forEach(p => {
            const sup = p.querySelector('sup.v');
            if (sup) {
                const verseNum = sup.innerText.trim();
                const isBookmarked = activeBookmarks.some(b => String(b.verse) === verseNum);
                if (isBookmarked) {
                    p.classList.add('highlighted');
                } else {
                    p.classList.remove('highlighted');
                }
            }
        });
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

        localStorage.setItem('hkm_bible_history', JSON.stringify(this.history));
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
                    localStorage.setItem('hkm_bible_bookmarks', JSON.stringify(this.bookmarks));
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
            this.notes = JSON.parse(localStorage.getItem('hkm_bible_notes')) || [];
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
                const localNotes = JSON.parse(localStorage.getItem('hkm_bible_notes')) || [];
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
                localStorage.setItem('hkm_bible_notes', JSON.stringify(localNotes));
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
            let localNotes = JSON.parse(localStorage.getItem('hkm_bible_notes')) || [];
            localNotes = localNotes.filter(n => n.id !== noteId);
            localStorage.setItem('hkm_bible_notes', JSON.stringify(localNotes));
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
            const YT_API_KEY = 'AIza' + 'SyD622cBjPAsMir81Vpdx6yDtO638NAT1Ys';
            const YT_CHANNEL_ID = 'UCFbX-Mf7NqDm2a07hk6hveg';
            const ytUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${YT_CHANNEL_ID}&q=${encodeURIComponent(term)}&type=video&maxResults=5&key=${YT_API_KEY}`;
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

        return results;
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

        const query = currentBook.name; // e.g. "Matteus"
        const resources = await this.searchLocalResources(query);

        if (resources.length === 0) {
            relatedList.innerHTML = `<div class="empty-state">${this.t('no_resources_found')}</div>`;
            return;
        }

        relatedList.innerHTML = resources.map(res => this.renderResourceCard(res)).join('');
    }

    // ──────────────────────────────────────────────────────────
    // READING PLAN INTEGRATION
    // ──────────────────────────────────────────────────────────

    getTranslation(key, fallback) {
        const lang = document.documentElement.lang || 'no';
        const dict = {
            no: {
                loading_plan: 'Laster leseplan...',
                active_plan: 'Aktiv leseplan',
                progress: 'Fremgang',
                day: 'Dag',
                show_verses: 'Vis dagens vers',
                open_devotional: 'Åpne dagens andakt',
                days_outline: 'Oversikt over dager',
                completed: 'Fullført',
                all_plans: 'Tilgjengelige leseplaner',
                start_plan_btn: 'Start denne planen',
                log_in_to_save: 'Logg inn på Min Side for å lagre din fremgang.',
                login_btn: 'Logg inn'
            },
            en: {
                loading_plan: 'Loading reading plan...',
                active_plan: 'Active Reading Plan',
                progress: 'Progress',
                day: 'Day',
                show_verses: "Show today's verses",
                open_devotional: "Open today's devotional",
                days_outline: 'Days Outline',
                completed: 'Completed',
                all_plans: 'Available Reading Plans',
                start_plan_btn: 'Start this plan',
                log_in_to_save: 'Log in to save your progress.',
                login_btn: 'Log in'
            },
            es: {
                loading_plan: 'Cargando plan de lectura...',
                active_plan: 'Plan de Lectura Activo',
                progress: 'Progreso',
                day: 'Día',
                show_verses: 'Ver versículos de hoy',
                open_devotional: 'Abrir devocional de hoy',
                days_outline: 'Resumen de los días',
                completed: 'Completado',
                all_plans: 'Planes de Lectura Disponibles',
                start_plan_btn: 'Comenzar este plan',
                log_in_to_save: 'Inicia sesión para guardar tu progreso.',
                login_btn: 'Iniciar sesión'
            }
        };
        return dict[lang]?.[key] || dict['no']?.[key] || fallback;
    }

    async loadReadingPlan() {
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
                .hkm-rp-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 16px; transition: all 0.2s ease; }
                .hkm-rp-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05); }
                .hkm-btn-primary { background: #1B4965 !important; color: #ffffff !important; padding: 10px 16px !important; border-radius: 8px !important; font-size: 13px !important; font-weight: 600 !important; border: none !important; cursor: pointer !important; display: inline-flex !important; align-items: center !important; justify-content: center !important; gap: 8px !important; transition: all 0.3s ease !important; height: 40px !important; text-decoration: none !important; }
                .hkm-btn-primary:hover { background: #225c80 !important; }
                .hkm-btn-primary:active { transform: scale(0.98) !important; }
                .hkm-btn-secondary { background: transparent !important; border: 1px solid #1B4965 !important; color: #1B4965 !important; padding: 10px 16px !important; border-radius: 8px !important; font-size: 13px !important; font-weight: 600 !important; cursor: pointer !important; display: inline-flex !important; align-items: center !important; justify-content: center !important; transition: all 0.3s ease !important; height: 40px !important; text-decoration: none !important; }
                .hkm-btn-secondary:hover { background: rgba(27, 73, 101, 0.05) !important; }
                .hkm-btn-secondary:active { transform: scale(0.98) !important; }
                .hkm-rp-progress-bar { height: 6px; background: #e2e8f0; border-radius: 99px; overflow: hidden; margin: 12px 0 16px 0; }
                .hkm-rp-progress-fill { height: 100%; background: linear-gradient(135deg, #d17d39 0%, #bd4f2a 100%); border-radius: 99px; transition: width 0.4s ease; }
                .hkm-rp-day-item { display: flex; align-items: center; justify-content: space-between; padding: 12px; border-radius: 8px; cursor: pointer; transition: all 0.2s; border: 1px solid transparent; margin-bottom: 8px; }
                .hkm-rp-day-item:hover { background: #f8fafc; border-color: #e2e8f0; }
                .hkm-rp-day-item.active { background: rgba(27, 73, 101, 0.05); border-color: rgba(27, 73, 101, 0.1); }
                .hkm-rp-day-checkbox { width: 20px; height: 20px; border-radius: 50%; border: 2px solid #cbd5e1; display: flex; align-items: center; justify-content: center; color: transparent; transition: all 0.2s; flex-shrink: 0; }
                .hkm-rp-day-checkbox.completed { background: #10b981; border-color: #10b981; color: #ffffff; }
                .hkm-rp-day-checkbox.completed .material-symbols-outlined { font-size: 14px; font-weight: bold; }
                .hkm-devotional-overlay { position: fixed !important; top: 0 !important; left: 0 !important; width: 100vw !important; height: 100vh !important; background: rgba(15, 23, 42, 0.75) !important; backdrop-filter: blur(8px) !important; z-index: 99999 !important; display: flex !important; align-items: center !important; justify-content: center !important; transform: translateZ(0) !important; backface-visibility: hidden !important; }
                .hkm-devotional-content { background: #ffffff !important; width: 90% !important; max-width: 600px !important; border-radius: 24px !important; padding: 32px !important; box-shadow: 0 20px 50px rgba(15, 23, 42, 0.15) !important; display: block !important; position: relative !important; animation: hkmFadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards !important; transform: translateZ(0) !important; backface-visibility: hidden !important; }
                .hkm-devotional-step-title { font-size: 20px; font-weight: 700; color: #1B4965; margin-bottom: 16px; }
                .hkm-devotional-text-serif { font-family: 'Georgia', serif; font-size: 18px; line-height: 1.7; color: #1e293b; margin-bottom: 24px; overflow-y: auto; max-height: 40vh; padding-right: 8px; }
                .hkm-devotional-prayer-box { background: #f8fafc; border-left: 4px solid #d17d39; padding: 16px; border-radius: 0 12px 12px 0; font-style: italic; font-size: 15px; line-height: 1.6; color: #334155; margin-bottom: 24px; }
                .hkm-devotional-reflection-textarea { display: block !important; width: 100% !important; min-height: 120px !important; padding: 16px !important; border-radius: 12px !important; border: 1px solid #cbd5e1 !important; outline: none !important; font-size: 14px !important; line-height: 1.5 !important; margin-bottom: 24px !important; resize: vertical !important; transform: translateZ(0) !important; backface-visibility: hidden !important; }
                .hkm-celebration-title { font-size: 24px; font-weight: 700; color: #1B4965; text-align: center; margin-top: 16px; margin-bottom: 8px; }
                .hkm-celebration-desc { font-size: 15px; color: #64748b; text-align: center; margin-bottom: 24px; }
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

                this.renderAvailablePlansList(plans);
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

        const currentDayNum = userPlan.currentDay || 1;
        const totalDays = globalPlan.durationDays || globalPlan.days.length;
        
        const currentDayConfig = globalPlan.days.find(d => d.dayNumber === currentDayNum) || globalPlan.days[0];
        
        const completedDaysCount = userPlan.completedDays ? userPlan.completedDays.length : 0;
        const progressPct = Math.round((completedDaysCount / totalDays) * 100);

        const t_activePlan = this.getTranslation('active_plan', 'Aktiv leseplan');
        const t_progress = this.getTranslation('progress', 'Fremgang');
        const t_day = this.getTranslation('day', 'Dag');
        const t_showVerses = this.getTranslation('show_verses', 'Vis dagens vers');
        const t_openDevotional = this.getTranslation('open_devotional', 'Åpne dagens andakt');
        const t_daysOutline = this.getTranslation('days_outline', 'Oversikt over dager');
        
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
                <div class="hkm-rp-card" style="border-left: 4px solid #1B4965;">
                    <div style="font-size: 12px; font-weight: 700; color: #1B4965; text-transform: uppercase; margin-bottom: 4px;">
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

    renderAvailablePlansList(plans) {
        const container = this.dom.readingPlanContent;
        if (!container) return;

        const t_browsePlans = this.getTranslation('all_plans', 'Leseplaner');
        const t_startPlan = this.getTranslation('start_plan_btn', 'Start leseplan');
        const t_logInToSave = this.getTranslation('log_in_to_save', 'Logg inn på Min Side for å lagre din fremgang.');
        const t_loginBtn = this.getTranslation('login_btn', 'Logg inn');

        let loginNotice = '';
        if (!this.currentUser) {
            loginNotice = `
                <div style="background: rgba(209, 125, 57, 0.1); border: 1px solid rgba(209, 125, 57, 0.2); border-radius: 12px; padding: 12px; margin-bottom: 20px; font-size: 13px; color: #7f8c8d; line-height: 1.4;">
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
                <h3 style="font-size: 15px; font-weight: 700; color: #1B4965; margin-bottom: 16px;">${t_browsePlans}</h3>
                
                <div style="display: flex; flex-direction: column; gap: 16px;">
                    ${plans.map(p => {
                        const totalDays = p.durationDays || p.days.length;
                        return `
                        <div class="hkm-rp-card" id="plan-card-${p.id}">
                            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                                <h4 style="font-size: 14px; font-weight: 700; color: #0f172a; margin: 0;">${p.title}</h4>
                                <span style="font-size: 11px; font-weight: 700; background: rgba(27, 73, 101, 0.1); color: #1B4965; padding: 2px 8px; border-radius: 99px;">${totalDays} dager</span>
                            </div>
                            <p style="font-size: 12px; color: #64748b; margin-bottom: 12px; line-height: 1.4;">${p.description || ''}</p>
                            
                            <div style="display: flex; flex-direction: column; gap: 8px;">
                                <button class="hkm-btn-secondary" style="height: 32px !important; padding: 0 12px !important; font-size: 12px !important; border-radius: 6px !important;" onclick="window.bibleReader.togglePlanPreview('${p.id}')">
                                    Vis dager
                                </button>
                                ${this.currentUser ? `
                                <button class="hkm-btn-primary" style="height: 32px !important; padding: 0 12px !important; font-size: 12px !important; border-radius: 6px !important;" onclick="window.bibleReader.enrollInPlan('${p.id}')">
                                    ${t_startPlan}
                                </button>
                                ` : ''}
                            </div>
                            
                            <!-- Plan Preview Days -->
                            <div id="plan-preview-${p.id}" style="display: none; margin-top: 16px; border-top: 1px solid #f1f5f9; padding-top: 12px; max-height: 200px; overflow-y: auto;">
                                ${p.days.map(d => `
                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; font-size: 12px; cursor: pointer;" onclick="window.bibleReader.showDayVerses('${d.verses.replace(/'/g, "\\'")}')">
                                    <span style="font-weight: 600; color: #475569;">Dag ${d.dayNumber}:</span>
                                    <span style="color: #1B4965; text-decoration: underline;">${d.verses}</span>
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

            this.renderAvailablePlansList(plans);
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
            
            await this.loadReadingPlan();
        } catch (err) {
            console.error("Enrollment failed:", err);
            alert("Feil under påmelding: " + err.message);
            if (loader) {
                loader.style.opacity = '1';
                loader.style.pointerEvents = 'auto';
            }
        }
    }

    async showDayVerses(verses) {
        if (!verses) return;
        await this.parseAndNavigateToReference(verses);
        if (window.innerWidth <= 1024) {
            const sidebar = document.getElementById('bible-sidebar');
            if (sidebar) sidebar.classList.remove('active');
            const navRight = document.getElementById('bible-nav-right');
            if (navRight) navRight.classList.remove('active');
        }
    }

    async openDevotionalWizard(planId, dayNumber) {
        if (!this.currentUser) return;

        const db = this.getFirestore();
        if (!db) {
            alert("Database utilgjengelig. Prøv igjen senere.");
            return;
        }

        const globalPlanSnap = await db.collection('reading_plans')
            .doc(planId)
            .get();

        if (!globalPlanSnap.exists) {
            alert("Leseplanen finnes ikke.");
            return;
        }

        const globalPlan = globalPlanSnap.data();
        const dayConfig = globalPlan.days.find(d => d.dayNumber === dayNumber);
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

        this.renderDevotionalStep(modal, globalPlan, dayNumber, dayConfig, 1, scriptureHtml);
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

    renderDevotionalStep(modal, plan, dayNumber, dayConfig, step, scriptureHtml) {
        modal.innerHTML = '';
        
        const stepContainer = document.createElement('div');
        stepContainer.className = 'hkm-devotional-content';
        modal.appendChild(stepContainer);

        const header = document.createElement('div');
        header.style.display = 'flex';
        header.style.justify = 'space-between';
        header.style.alignItems = 'center';
        header.style.marginBottom = '20px';
        header.innerHTML = `
            <div style="font-size: 11px; font-weight: 700; color: #bd4f2a; text-transform: uppercase; letter-spacing: 0.05em;">
                ${plan.title} &bull; Steg ${step} av 5
            </div>
            <button style="background: none; border: none; cursor: pointer; color: #64748b; display: flex; align-items: center;" onclick="document.getElementById('hkm-devotional-modal').remove()">
                <span class="material-symbols-outlined">close</span>
            </button>
        `;
        stepContainer.appendChild(header);

        if (step === 1) {
            const title = document.createElement('h3');
            title.className = 'hkm-devotional-step-title';
            title.innerText = `1. Les skriftstedet (${dayConfig.verses})`;
            stepContainer.appendChild(title);

            const scriptureBox = document.createElement('div');
            scriptureBox.className = 'hkm-devotional-text-serif';
            scriptureBox.innerHTML = scriptureHtml;
            stepContainer.appendChild(scriptureBox);

            const actions = document.createElement('div');
            actions.style.display = 'flex';
            actions.style.justify = 'flex-end';
            actions.innerHTML = `
                <button class="hkm-btn-primary" id="btn-devotional-next">
                    Neste: Bønn
                    <span class="material-symbols-outlined">arrow_forward</span>
                </button>
            `;
            stepContainer.appendChild(actions);

            actions.querySelector('#btn-devotional-next').onclick = () => {
                this.renderDevotionalStep(modal, plan, dayNumber, dayConfig, 2, scriptureHtml);
            };

        } else if (step === 2) {
            const title = document.createElement('h3');
            title.className = 'hkm-devotional-step-title';
            title.innerText = '2. Dagens Bønnefokus';
            stepContainer.appendChild(title);

            const prayerBox = document.createElement('div');
            prayerBox.className = 'hkm-devotional-prayer-box';
            prayerBox.innerText = dayConfig.prayerFocus || 'Be i dag over ordene du har lest, og be om visdom og veiledning for dagen.';
            stepContainer.appendChild(prayerBox);

            const actions = document.createElement('div');
            actions.style.display = 'flex';
            actions.style.justify = 'space-between';
            actions.innerHTML = `
                <button class="hkm-btn-secondary" id="btn-devotional-back">
                    Tilbake
                </button>
                <button class="hkm-btn-primary" id="btn-devotional-next">
                    Neste: Ressurser
                    <span class="material-symbols-outlined">arrow_forward</span>
                </button>
            `;
            stepContainer.appendChild(actions);

            actions.querySelector('#btn-devotional-back').onclick = () => {
                this.renderDevotionalStep(modal, plan, dayNumber, dayConfig, 1, scriptureHtml);
            };
            actions.querySelector('#btn-devotional-next').onclick = () => {
                this.renderDevotionalStep(modal, plan, dayNumber, dayConfig, 3, scriptureHtml);
            };

        } else if (step === 3) {
            const title = document.createElement('h3');
            title.className = 'hkm-devotional-step-title';
            title.innerText = '3. Dypere Dykk & Ressurser';
            stepContainer.appendChild(title);

            const desc = document.createElement('p');
            desc.style.fontSize = '14px';
            desc.style.color = '#64748b';
            desc.style.marginBottom = '20px';
            desc.style.lineHeight = '1.5';
            desc.innerText = 'Bruk disse ressursene til å gå dypere i dagens tema:';
            stepContainer.appendChild(desc);

            const resourcesList = document.createElement('div');
            resourcesList.style.display = 'flex';
            resourcesList.style.flexDirection = 'column';
            resourcesList.style.gap = '12px';
            resourcesList.style.marginBottom = '24px';
            
            if (dayConfig.resources && dayConfig.resources.length > 0) {
                dayConfig.resources.forEach(res => {
                    const card = document.createElement('a');
                    card.href = res.url || '#';
                    card.target = '_blank';
                    card.className = 'hkm-rp-card';
                    card.style.textDecoration = 'none';
                    card.style.display = 'block';
                    card.style.margin = '0';
                    card.innerHTML = `
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <span class="material-symbols-outlined" style="color: #d17d39; font-size: 24px;">
                                ${res.type === 'video' ? 'play_circle' : res.type === 'podcast' ? 'podcasts' : 'article'}
                            </span>
                            <div>
                                <div style="font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 2px;">${res.title}</div>
                                <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #94a3b8;">${res.type}</div>
                            </div>
                        </div>
                    `;
                    resourcesList.appendChild(card);
                });
            } else {
                resourcesList.innerHTML = `
                    <p style="font-size: 13px; color: #94a3b8; font-style: italic; text-align: center; padding: 20px 0;">
                        Ingen ekstra ressurser tilknyttet denne dagen.
                    </p>
                `;
            }
            stepContainer.appendChild(resourcesList);

            const actions = document.createElement('div');
            actions.style.display = 'flex';
            actions.style.justify = 'space-between';
            actions.innerHTML = `
                <button class="hkm-btn-secondary" id="btn-devotional-back">
                    Tilbake
                </button>
                <button class="hkm-btn-primary" id="btn-devotional-next">
                    Neste: Refleksjon
                    <span class="material-symbols-outlined">arrow_forward</span>
                </button>
            `;
            stepContainer.appendChild(actions);

            actions.querySelector('#btn-devotional-back').onclick = () => {
                this.renderDevotionalStep(modal, plan, dayNumber, dayConfig, 2, scriptureHtml);
            };
            actions.querySelector('#btn-devotional-next').onclick = () => {
                this.renderDevotionalStep(modal, plan, dayNumber, dayConfig, 4, scriptureHtml);
            };

        } else if (step === 4) {
            const title = document.createElement('h3');
            title.className = 'hkm-devotional-step-title';
            title.innerText = '4. Skriv dine refleksjoner';
            stepContainer.appendChild(title);

            const desc = document.createElement('p');
            desc.style.fontSize = '14px';
            desc.style.color = '#64748b';
            desc.style.marginBottom = '16px';
            desc.style.lineHeight = '1.5';
            desc.innerText = 'Noter ned hva Gud talte til deg gjennom ordene du leste, eller skriv en bønn.';
            stepContainer.appendChild(desc);

            const textarea = document.createElement('textarea');
            textarea.className = 'hkm-devotional-reflection-textarea';
            textarea.placeholder = 'Skriv dine tanker her... (Dette lagres også i dine notater på Min Side)';
            stepContainer.appendChild(textarea);

            const actions = document.createElement('div');
            actions.style.display = 'flex';
            actions.style.justify = 'space-between';
            actions.innerHTML = `
                <button class="hkm-btn-secondary" id="btn-devotional-back">
                    Tilbake
                </button>
                <button class="hkm-btn-primary" id="btn-devotional-save">
                    Fullfør og Lagre
                    <span class="material-symbols-outlined">check</span>
                </button>
            `;
            stepContainer.appendChild(actions);

            actions.querySelector('#btn-devotional-back').onclick = () => {
                this.renderDevotionalStep(modal, plan, dayNumber, dayConfig, 3, scriptureHtml);
            };
            
            actions.querySelector('#btn-devotional-save').onclick = async () => {
                const text = textarea.value.trim();
                const saveBtn = actions.querySelector('#btn-devotional-save');
                saveBtn.disabled = true;
                saveBtn.innerText = 'Lagrer...';

                try {
                    await this.completeDevotionalDay(plan, dayNumber, text);
                    this.renderDevotionalStep(modal, plan, dayNumber, dayConfig, 5, scriptureHtml);
                } catch (e) {
                    console.error("Failed to complete devotional day:", e);
                    alert("Kunne ikke lagre andakt: " + e.message);
                    saveBtn.disabled = false;
                    saveBtn.innerHTML = `Fullfør og Lagre <span class="material-symbols-outlined">check</span>`;
                }
            };

        } else if (step === 5) {
            const confetti = document.createElement('div');
            confetti.style.fontSize = '64px';
            confetti.style.textAlign = 'center';
            confetti.style.marginBottom = '16px';
            confetti.innerHTML = '🎉';
            stepContainer.appendChild(confetti);

            const title = document.createElement('h3');
            title.className = 'hkm-celebration-title';
            title.innerText = 'Andakt fullført!';
            stepContainer.appendChild(title);

            const desc = document.createElement('p');
            desc.className = 'hkm-celebration-desc';
            desc.innerText = `Kjempebra jobbet! Du har fullført dag ${dayNumber} av leseplanen "${plan.title}".`;
            stepContainer.appendChild(desc);

            const actions = document.createElement('div');
            actions.style.display = 'flex';
            actions.style.justify = 'center';
            actions.innerHTML = `
                <button class="hkm-btn-primary" id="btn-devotional-close" style="min-width: 150px;">
                    Lukk
                </button>
            `;
            stepContainer.appendChild(actions);

            actions.querySelector('#btn-devotional-close').onclick = () => {
                modal.remove();
                this.loadReadingPlan();
            };
        }
    }

    async completeDevotionalDay(plan, dayNumber, reflectionText) {
        if (!this.currentUser) return;
        
        const db = this.getFirestore();
        if (!db) {
            throw new Error("Database utilgjengelig.");
        }

        const uid = this.currentUser.uid;
        const planId = plan.id;
        
        const ref = db.collection('users')
            .doc(uid)
            .collection('reading_plans')
            .doc(planId);
            
        const snap = await ref.get();
        let userPlan = snap.exists ? snap.data() : {
            planId: planId,
            currentDay: 1,
            completedDays: [],
            reflections: {}
        };
        
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
}

document.addEventListener('DOMContentLoaded', () => {
    window.bibleReader = new BibleReader();
    
    // Wire up bookmarks/history rendering
    setTimeout(() => {
        window.bibleReader.renderBookmarksList();
        window.bibleReader.renderHistoryList();
    }, 500);
});
