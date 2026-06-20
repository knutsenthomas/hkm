// js/bible-reader.js
import { firebaseService } from './firebase-service.js';

class BibleReader {
    constructor() {
        this.bibles = [];
        this.books = [];
        this.chapters = [];
        this.selectedBibleId = localStorage.getItem('hkm_bible_translation') || 'OPENBIBLE_NB';
        this.selectedBookId = '';
        this.selectedChapterId = '';
        this.activeChapterData = null;
        this.bookmarks = JSON.parse(localStorage.getItem('hkm_bible_bookmarks')) || [];
        this.history = JSON.parse(localStorage.getItem('hkm_bible_history')) || [];

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

        this.init();
    }

    async init() {
        this.setupDOMElements();
        this.applySettings();
        this.bindEvents();
        this.setupSwipeGestures();
        
        // Listen to Firebase auth state for synchronizing notes
        if (window.firebase) {
            firebase.auth().onAuthStateChanged(user => {
                this.currentUser = user;
                this.loadNotes();
            });
        } else {
            this.currentUser = null;
            this.loadNotes();
        }
        
        await this.loadTranslations();
        
        // Handle deep-linking from URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const refParam = urlParams.get('ref'); // e.g. "Joh_3" or "Sal_23_1"
        const transParam = urlParams.get('trans'); // e.g. "DNB"

        if (transParam) {
            this.selectedBibleId = transParam;
            if (this.dom.translationSelect) this.dom.translationSelect.value = transParam;
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

            // Verse Context Toolbar & Chapter Lookup
            verseToolbar: document.getElementById('verse-context-toolbar'),
            toolbarBtnBookmark: document.getElementById('toolbar-btn-bookmark'),
            toolbarBtnLookup: document.getElementById('toolbar-btn-lookup'),
            toolbarBookmarkText: document.getElementById('toolbar-bookmark-text'),
            btnLookupChapter: document.getElementById('btn-lookup-chapter'),

            // Cross references
            dictCrossRefsSection: document.getElementById('dict-cross-refs-section'),
            dictCrossRefsList: document.getElementById('dict-cross-references'),
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

        // Prev/Next Chapter Navigation
        if (this.dom.prevChapterBtn) {
            this.dom.prevChapterBtn.addEventListener('click', () => this.navigateChapter(-1));
        }
        if (this.dom.nextChapterBtn) {
            this.dom.nextChapterBtn.addEventListener('click', () => this.navigateChapter(1));
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
                if (this.activeContextVerse) {
                    this.toggleVerseHighlight(this.activeContextVerse.paragraph, this.activeContextVerse.verseNum);
                    if (this.dom.verseToolbar) this.dom.verseToolbar.style.display = 'none';
                }
            });
        }

        if (this.dom.toolbarBtnLookup) {
            this.dom.toolbarBtnLookup.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.activeContextVerse) {
                    const ref = this.getCurrentReferenceText();
                    const fullRef = `${ref}:${this.activeContextVerse.verseNum}`;
                    // Strip HTML and leading verse numbers to get clean verse text
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = this.activeContextVerse.paragraph.innerHTML;
                    // Remove <sup> tags
                    const sups = tempDiv.querySelectorAll('sup');
                    sups.forEach(s => s.remove());
                    const verseText = tempDiv.innerText || tempDiv.textContent || '';
                    
                    this.lookupWord(fullRef, verseText.trim(), fullRef);
                    if (this.dom.verseToolbar) this.dom.verseToolbar.style.display = 'none';
                }
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
                    this.dom.verseToolbar.style.display = 'none';
                }
            }
        });

        // Reading pane click events (double-click word definition, or select verse)
        if (this.dom.readingPane) {
            this.dom.readingPane.addEventListener('dblclick', (e) => {
                const selection = window.getSelection().toString().trim();
                if (selection && selection.length > 1 && selection.length < 30) {
                    this.lookupWord(selection, e.target.innerText, this.getCurrentReferenceText());
                }
            });

            // Highlight / Select verse click: show floating toolbar
            this.dom.readingPane.addEventListener('click', (e) => {
                const paragraph = e.target.closest('p');
                if (paragraph) {
                    const verseSup = paragraph.querySelector('sup.v');
                    if (verseSup) {
                        e.stopPropagation();
                        const verseNum = verseSup.innerText.trim();
                        this.activeContextVerse = { paragraph, verseNum };
                        
                        // Check if already bookmarked
                        const ref = this.getCurrentReferenceText();
                        const fullRef = `${ref}:${verseNum}`;
                        const isBookmarked = this.bookmarks.some(b => b.ref === fullRef && b.bibleId === this.selectedBibleId);
                        
                        if (this.dom.toolbarBookmarkText) {
                            this.dom.toolbarBookmarkText.innerText = isBookmarked ? 'Fjern bokmerke' : 'Bokmerk';
                        }
                        const bookmarkIcon = this.dom.toolbarBtnBookmark ? this.dom.toolbarBtnBookmark.querySelector('.material-symbols-outlined') : null;
                        if (bookmarkIcon) {
                            bookmarkIcon.innerText = isBookmarked ? 'bookmark_remove' : 'bookmark';
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
                
                // Clicked outside a verse paragraph, hide toolbar
                if (this.dom.verseToolbar) {
                    this.dom.verseToolbar.style.display = 'none';
                }
            });
        }
    }

    applySettings() {
        localStorage.setItem('hkm_bible_settings', JSON.stringify(this.settings));
        
        // Font Size
        if (this.dom.fontSizeDisplay) this.dom.fontSizeDisplay.innerText = `${this.settings.fontSize}px`;
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
            
            if (this.dom.translationSelect) {
                this.dom.translationSelect.innerHTML = this.bibles.map(t => 
                    `<option value="${t.id}">${t.name} (${t.abbreviation})</option>`
                ).join('');
                this.dom.translationSelect.value = this.selectedBibleId;
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
                scriptureRef: refText || ''
            });

            // Parallel load AI definition and relevant site resources
            const [dictRes, resources] = await Promise.all([
                fetch(`/api/bible/dictionary?${params.toString()}`).then(r => r.json()),
                this.searchLocalResources(word)
            ]);

            this.dom.dictSpinner.style.display = 'none';
            this.dom.dictContentWrap.style.display = 'block';

            this.dom.dictWordTitle.innerText = dictRes.word || word;
            this.dom.dictCategory.innerText = dictRes.category || 'Ordbok';
            this.dom.dictDefinition.innerText = dictRes.definition || '';
            this.dom.dictContextualNote.innerText = dictRes.contextualNote || '';

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
            this.dom.dictSpinner.style.display = 'none';
            this.dom.dictContentWrap.style.display = 'block';
            this.dom.dictCategory.innerText = 'Feil';
            this.dom.dictDefinition.innerText = 'Kunne ikke kontakte ordbok-tjenesten. Kontroller nettforbindelsen din.';
            this.dom.dictContextualNote.innerText = '';
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
            this.dom.bookmarksList.innerHTML = `<p class="empty-state">Ingen lagrede vers ennå. Klikk på et vers i teksten for å lagre det.</p>`;
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
            this.dom.historyList.innerHTML = `<p class="empty-state">Ingen historikk ennå.</p>`;
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
        if (!this.dom.readingPane) return;

        let touchstartX = 0;
        let touchstartY = 0;
        let touchendX = 0;
        let touchendY = 0;

        const checkDirection = () => {
            const diffX = touchendX - touchstartX;
            const diffY = touchendY - touchstartY;

            // Ensure horizontal swipe is dominant and above threshold of 60px
            if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 60) {
                if (diffX > 0) {
                    // Swipe right -> Previous chapter
                    this.navigateChapter(-1);
                } else {
                    // Swipe left -> Next chapter
                    this.navigateChapter(1);
                }
            }
        };

        this.dom.readingPane.addEventListener('touchstart', (e) => {
            touchstartX = e.changedTouches[0].screenX;
            touchstartY = e.changedTouches[0].screenY;
        }, { passive: true });

        this.dom.readingPane.addEventListener('touchend', (e) => {
            touchendX = e.changedTouches[0].screenX;
            touchendY = e.changedTouches[0].screenY;
            checkDirection();
        }, { passive: true });
    }

    async loadNotes() {
        if (!this.dom.notesList) return;
        
        if (this.currentUser) {
            this.dom.notesList.innerHTML = `<div class="loading-state" style="padding: 20px; text-align: center;"><div class="spinner" style="margin: 0 auto 10px auto;"></div>Laster notater...</div>`;
            try {
                const snap = await firebase.firestore()
                    .collection('personal_notes')
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
                <span class="material-symbols-outlined" style="font-size: 18px; margin-right: 6px;">add</span>Nytt notat
            </button>
        `;

        if (this.notes.length === 0) {
            this.dom.notesList.innerHTML = `
                ${syncBadge}
                ${newNoteBtnHtml}
                <p class="empty-state" style="padding: 20px 0; text-align: center; color: #94a3b8; font-size: 13px;">Ingen notater ennå. Skriv dine refleksjoner her!</p>
            `;
        } else {
            const listHtml = this.notes.map(n => {
                const dateStr = n.createdAt.toLocaleDateString('no-NO', { day: '2-digit', month: '2-digit', year: 'numeric' });
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

            if (this.currentUser) {
                try {
                    if (isEdit) {
                        await firebase.firestore().collection('personal_notes').doc(note.id).update({
                            title: title,
                            text: htmlText,
                            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                        });
                    } else {
                        await firebase.firestore().collection('personal_notes').add({
                            userId: this.currentUser.uid,
                            title: title,
                            text: htmlText,
                            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
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

        if (this.currentUser) {
            try {
                await firebase.firestore().collection('personal_notes').doc(noteId).delete();
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
                <p style="font-size: 13px;">Henter relaterte ressurser...</p>
            </div>
        `;

        const currentBook = this.books.find(b => b.id === this.selectedBookId);
        if (!currentBook) {
            relatedList.innerHTML = '<div class="empty-state">Ingen bok valgt.</div>';
            return;
        }

        const query = currentBook.name; // e.g. "Matteus"
        const resources = await this.searchLocalResources(query);

        if (resources.length === 0) {
            relatedList.innerHTML = '<div class="empty-state">Ingen relaterte ressurser funnet for denne boken enda.</div>';
            return;
        }

        relatedList.innerHTML = resources.map(res => this.renderResourceCard(res)).join('');
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
