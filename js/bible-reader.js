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
            
            // Bookmarks / History sidebar
            bookmarksList: document.getElementById('bookmarks-list'),
            historyList: document.getElementById('history-list')
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

        // Mobile sidebar toggle
        if (this.dom.mobileSidebarToggle) {
            this.dom.mobileSidebarToggle.addEventListener('click', () => {
                this.dom.sidebar.classList.toggle('active');
            });
        }

        // Close sidebar when clicking on a book on mobile
        document.addEventListener('click', (e) => {
            if (this.dom.sidebar && this.dom.sidebar.classList.contains('active')) {
                if (!this.dom.sidebar.contains(e.target) && e.target !== this.dom.mobileSidebarToggle) {
                    this.dom.sidebar.classList.remove('active');
                }
            }
        });

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

        // Reading pane click events (double-click word definition, or select verse)
        if (this.dom.readingPane) {
            this.dom.readingPane.addEventListener('dblclick', (e) => {
                const selection = window.getSelection().toString().trim();
                if (selection && selection.length > 1 && selection.length < 30) {
                    this.lookupWord(selection, e.target.innerText, this.getCurrentReferenceText());
                }
            });

            // Highlight / Select verse click
            this.dom.readingPane.addEventListener('click', (e) => {
                const paragraph = e.target.closest('p');
                if (paragraph) {
                    const verseSup = paragraph.querySelector('sup.v');
                    if (verseSup) {
                        const verseNum = verseSup.innerText.trim();
                        this.toggleVerseHighlight(paragraph, verseNum);
                    }
                }
            });
        }
    }

    applySettings() {
        localStorage.setItem('hkm_bible_settings', JSON.stringify(this.settings));
        
        // Font Size
        if (this.dom.fontSizeDisplay) this.dom.fontSizeDisplay.innerText = `${this.settings.fontSize}px`;
        if (this.dom.readingPane) {
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
                
                // Hide mobile sidebar if active
                if (this.dom.sidebar.classList.contains('active')) {
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

    renderActiveChapter() {
        if (!this.dom.readingPane || !this.activeChapterData) return;

        // Render reference title
        const currentBook = this.books.find(b => b.id === this.selectedBookId);
        const chapterNum = this.selectedChapterId.split('_')[1];
        
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
        const regex = /^(\d+)?\s*([a-zæøå\s]+)\s*(\d+)(?:\s*[\:\.\s]\s*(\d+))?$/i;
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
        const fullBookSearchName = prefixNum ? `${prefixNum} ${bookNameQuery}` : bookNameQuery;

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
        this.dom.dictSpinner.style.display = 'flex';
        this.dom.dictContentWrap.style.display = 'none';
        
        this.dom.dictWordTitle.innerText = word;

        try {
            const params = new URLSearchParams({
                word: word,
                context: contextText || '',
                scriptureRef: refText || ''
            });

            const res = await fetch(`/api/bible/dictionary?${params.toString()}`);
            const data = await res.json();

            this.dom.dictSpinner.style.display = 'none';
            this.dom.dictContentWrap.style.display = 'block';

            this.dom.dictWordTitle.innerText = data.word || word;
            this.dom.dictCategory.innerText = data.category || 'Ordbok';
            this.dom.dictDefinition.innerText = data.definition || '';
            this.dom.dictContextualNote.innerText = data.contextualNote || '';
        } catch (e) {
            console.error("Error looking up word:", e);
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
            });
        });
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
