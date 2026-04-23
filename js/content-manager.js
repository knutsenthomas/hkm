// ===================================
// Public Content Manager (Global version)
// ===================================


class ContentManager {
    constructor() {
        this.pageId = this.detectPageId();
        this.currentDate = new Date();
        this._renderHtmlSignatures = new Map();
        this._errorNoticeTimestamps = new Map();

        // Tag body with page-specific class (e.g. page-index, page-om-oss)
        const body = document.body;
        if (body && this.pageId) {
            body.classList.add(`page-${this.pageId}`);
        }

        this.init();
        this.agendaMonthsToShow = 1;
    }

    detectPageId() {
        const path = window.location.pathname;
        if (path === '/' || path.endsWith('/') || path.includes('index.html')) return 'index';
        if (path.includes('arrangementer.html') || path.includes('events.html') || path.includes('eventos.html')) return 'arrangementer';
        if (path.includes('kalender.html')) return 'kalender';
        if (path.includes('arrangement-detaljer.html') || path.includes('event-details.html') || path.includes('detalles-evento.html')) return 'arrangement-detaljer';
        if (path.includes('blogg.html') || path.includes('blog.html')) return 'blogg';
        if (path.includes('butikk.html') || path.includes('shop.html')) return 'butikk';
        if (path.includes('blogg-post.html') || path.includes('blog-post.html')) return 'blogg-post';
        if (path.includes('undervisningsserier.html') || path.includes('teaching.html')) return 'undervisningsserier';
        if (path.includes('media.html')) return 'media';
        if (path.includes('om-oss.html') || path.includes('about.html') || path.includes('sobre-nosotros.html')) return 'om-oss';
        if (path.includes('kontakt.html') || path.includes('contact.html') || path.includes('contacto.html')) return 'kontakt';
        if (path.includes('donasjoner.html') || path.includes('donations.html') || path.includes('donaciones.html')) return 'donasjoner';
        if (path.includes('for-menigheter.html') || path.includes('for-churches.html') || path.includes('para-iglesias.html')) return 'for-menigheter';
        if (path.includes('for-bedrifter.html') || path.includes('for-businesses.html') || path.includes('para-empresas.html')) return 'for-bedrifter';
        if (path.includes('bnn.html')) return 'bnn';
        if (path.includes('youtube.html')) return 'youtube';
        if (path.includes('podcast.html')) return 'podcast';
        if (path.includes('undervisning.html')) return 'undervisning';
        if (path.includes('seminarer.html')) return 'seminarer';
        return '';
    }

    getLocalizedLink(noFile) {
        let lang = document.documentElement.lang || 'no';
        if (lang.includes('-')) lang = lang.split('-')[0]; // Handle es-ES -> es

        if (lang === 'no') return noFile;
        if (window.i18n && typeof window.i18n.mapFileName === 'function') {
            return window.i18n.mapFileName(noFile, lang);
        }
        // Fallback logic if i18n not yet loaded
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
                'blogg-post.html': 'blog-post.html'
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
                'blogg-post.html': 'blog-post.html'
            }
        };
        return (mappings[lang] && mappings[lang][noFile]) || noFile;
    }

    getCurrentLanguage() {
        let lang = document.documentElement.lang || 'no';
        if (lang.includes('-')) lang = lang.split('-')[0];
        if (!['no', 'en', 'es'].includes(lang)) return 'no';
        return lang;
    }

    getCollectionItems(data) {
        if (Array.isArray(data)) return data;
        if (!data || typeof data !== 'object') return [];
        if (Array.isArray(data.items)) return data.items;
        if (data.items && typeof data.items === 'object') return Object.values(data.items);
        return [];
    }

    getContentItemStableId(item) {
        if (!item || typeof item !== 'object') return '';
        return item.id || item.slug || item.title || '';
    }

    getLocalizedContentItem(item, lang = this.getCurrentLanguage()) {
        if (!item || typeof item !== 'object') return item;
        if (lang === 'no') {
            return {
                ...item,
                __stableId: this.getContentItemStableId(item)
            };
        }

        const translations = (item.translations && typeof item.translations === 'object')
            ? item.translations
            : {};
        const localized = (translations[lang] && typeof translations[lang] === 'object')
            ? translations[lang]
            : null;

        if (!localized) {
            return {
                ...item,
                __stableId: this.getContentItemStableId(item)
            };
        }

        return {
            ...item,
            title: typeof localized.title === 'string' && localized.title.trim() ? localized.title : item.title,
            content: typeof localized.content !== 'undefined' ? localized.content : item.content,
            category: typeof localized.category === 'string' && localized.category.trim() ? localized.category : item.category,
            seoTitle: typeof localized.seoTitle === 'string' && localized.seoTitle.trim() ? localized.seoTitle : item.seoTitle,
            seoDescription: typeof localized.seoDescription === 'string' && localized.seoDescription.trim() ? localized.seoDescription : item.seoDescription,
            tags: Array.isArray(localized.tags) && localized.tags.length ? localized.tags : item.tags,
            __stableId: this.getContentItemStableId(item)
        };
    }

    localizeBlogItems(items) {
        const lang = this.getCurrentLanguage();
        try {
            const list = Array.isArray(items) ? items : [];
            return list.map((item) => this.getLocalizedContentItem(item, lang));
        } catch (error) {
            console.warn('[ContentManager] localizeBlogItems fallback to source language', error);
            return Array.isArray(items) ? items : [];
        }
    }

    findContentItemById(items, itemId) {
        if (!Array.isArray(items) || !itemId) return null;
        const target = String(itemId);
        return items.find((item) => {
            const stableId = this.getContentItemStableId(item);
            return stableId === target || encodeURIComponent(stableId) === target;
        }) || null;
    }

    setLoading(isLoading) {
        const body = document.body;
        if (!body) return;
        if (isLoading) {
            body.classList.add('cms-loading');
        } else {
            body.classList.remove('cms-loading');
        }
    }

    setContentReady(isReady) {
        const body = document.body;
        if (!body) return;
        if (isReady) {
            body.classList.add('cms-content-ready');
        } else {
            body.classList.remove('cms-content-ready');
        }
    }

    notifyUser(message, type = 'warning', duration = 5000) {
        if (!message) return;
        if (typeof window.showToast === 'function') {
            window.showToast(message, type, duration);
        }
    }

    reportError(scope, error, { notifyUser = false, userMessage = '' } = {}) {
        const err = error instanceof Error ? error : new Error(String(error || 'Unknown error'));
        const scopeKey = `${scope}:${err.message}`;
        const now = Date.now();
        const lastAt = this._errorNoticeTimestamps.get(scopeKey) || 0;

        console.error(`[ContentManager] ${scope}:`, err);
        if (window.hkmLogger) {
            window.hkmLogger.error(`[ContentManager:${scope}] ${err.message}`);
        }

        if (notifyUser && now - lastAt > 12000) {
            this._errorNoticeTimestamps.set(scopeKey, now);
            this.notifyUser(userMessage || 'Noe innhold kunne ikke lastes akkurat nå.', 'warning', 5000);
        }
    }

    async getContentDoc(pageId, { silent = false } = {}) {
        const service = window.firebaseService;
        if (!service || !service.isInitialized) {
            if (!silent) {
                this.reportError('firebase-unavailable', new Error(`Firebase not initialized for ${pageId}`), {
                    notifyUser: true,
                    userMessage: 'Tilkobling til innholdstjenesten er ikke klar ennå.'
                });
            }
            return null;
        }

        try {
            return await service.getPageContent(pageId, { silent });
        } catch (error) {
            if (!silent) {
                this.reportError(`getContentDoc:${pageId}`, error, {
                    notifyUser: true,
                    userMessage: 'Kunne ikke hente oppdatert innhold. Viser lagret innhold hvis tilgjengelig.'
                });
            }
            return null;
        }
    }

    async getContentDocs(pageIds, { silent = false } = {}) {
        const service = window.firebaseService;
        if (!service || !service.isInitialized) return {};

        try {
            if (typeof service.getManyPageContents === 'function') {
                return await service.getManyPageContents(pageIds, { silent });
            }

            const pairs = await Promise.all(
                (pageIds || []).map(async (id) => [id, await this.getContentDoc(id, { silent })])
            );
            return Object.fromEntries(pairs);
        } catch (error) {
            if (!silent) {
                this.reportError('getContentDocs', error, {
                    notifyUser: true,
                    userMessage: 'Noe innhold kunne ikke lastes akkurat nå.'
                });
            }
            return {};
        }
    }

    cacheLocalJson(key, value) {
        if (!key) return;
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
            console.warn(`[ContentManager] Failed local cache write for ${key}`, error);
        }
    }

    setHTMLIfChanged(container, html, signatureKey) {
        if (!container) return false;
        const signature = `${signatureKey}:${html}`;
        if (this._renderHtmlSignatures.get(signatureKey) === signature) {
            return false;
        }
        this._renderHtmlSignatures.set(signatureKey, signature);
        if (container.innerHTML !== html) {
            container.innerHTML = html;
        }
        return true;
    }

    async init() {
        let pageContentHydrated = false;
        const revealIfHydrated = () => {
            if (!pageContentHydrated) return;
            this.setContentReady(true);
            this.setLoading(false);
        };

        this.setContentReady(false);

        // 1. Try to apply cached global settings INSTANTLY (pre-Firebase)
        try {
            const cachedDesign = localStorage.getItem('hkm_cache_settings_design');
            if (cachedDesign) {
                const parsedDesign = JSON.parse(cachedDesign);
                if (parsedDesign && typeof parsedDesign === 'object') {
                    this.applyGlobalSettings(parsedDesign);
                }
            }
            const cachedSEO = localStorage.getItem('hkm_cache_settings_seo');
            if (cachedSEO) {
                const parsedSeo = JSON.parse(cachedSEO);
                if (parsedSeo && typeof parsedSeo === 'object') {
                    this.handleSEO(parsedSeo);
                }
            }
            // Do not hydrate text content from cache to avoid visible text switching.
            // We only apply fresh Firestore content below.

            const cachedHero = localStorage.getItem('hkm_cache_hero_slides');
            if (cachedHero) {
                const heroData = JSON.parse(cachedHero);
                if (heroData && heroData.slides) this.renderHeroSlides(heroData.slides);
            }

        } catch (e) {
            console.warn("[ContentManager] Early cache read failed", e);
        }

        let service = window.firebaseService;
        if (!service || !service.isInitialized) {
            // Wait for firebase module (reduced timeout to 1s total)
            let count = 0;
            while ((!window.firebaseService || !window.firebaseService.isInitialized) && count < 20) {
                await new Promise(r => setTimeout(r, 50));
                count++;
            }
        }

        service = window.firebaseService;
        try {
            if (!service || !service.isInitialized) {
                console.warn("⚠️ Firebase failed to initialize in time. Content may be limited.");
            }

            // 1. Parallel Initial Load (Firestore defaults to cache if enabled)
            const docIds = [this.pageId, 'settings_design', 'settings_seo', 'settings_global'];
            if (this.pageId === 'index') {
                docIds.push('settings_facebook_feed');
            }
            const docs = service && service.isInitialized
                ? await this.getContentDocs(docIds)
                : {};
            const content = docs[this.pageId] ?? null;
            const globalSettings = docs.settings_design ?? null;
            const seoSettings = docs.settings_seo ?? null;
            const globalContent = docs.settings_global ?? null;
            const facebookFeedSettings = docs.settings_facebook_feed ?? null;

            this.cacheLocalJson(`hkm_cache_page_${this.pageId}`, content);
            this.cacheLocalJson('hkm_cache_settings_design', globalSettings);
            this.cacheLocalJson('hkm_cache_settings_seo', seoSettings);
            this.cacheLocalJson('hkm_cache_settings_global', globalContent);
            if (this.pageId === 'index') {
                this.cacheLocalJson('hkm_cache_settings_facebook_feed', facebookFeedSettings);
            }

            if (globalSettings) this.applyGlobalSettings(globalSettings);
            if (globalContent) this.updateDOM(globalContent, { docId: 'settings_global' }); // Apply global text (footer, etc)
            if (content) {
                this.updateDOM(content, { docId: this.pageId });
                pageContentHydrated = true;
            }
            if (facebookFeedSettings) {
                this.updateDOM(facebookFeedSettings, { docId: 'settings_facebook_feed' });
            }

            revealIfHydrated();

            // 2. SEO & Meta (Non-blocking)
            if (seoSettings) this.handleSEO(seoSettings);

            // 3. Specialized Loaders (Non-blocking if we already hydrated from cache)
            if (pageContentHydrated) {
                this.loadSpecializedContent().catch(e => this.reportError('loadSpecializedContent:async', e));
            } else {
                await this.loadSpecializedContent();
            }

        } catch (error) {
            this.reportError('init', error, {
                notifyUser: true,
                userMessage: 'Noe innhold kunne ikke lastes. Siden kan være delvis oppdatert.'
            });
        } finally {
            if (pageContentHydrated) {
                this.setContentReady(true);
            }
            this.setLoading(false);
            window.dispatchEvent(new CustomEvent('cmsContentLoaded'));
        }
    }

    async handleSEO(seoSettings) {
        let itemSEO = null;
        const urlParams = new URLSearchParams(window.location.search);
        const itemId = urlParams.get('id');

        if (itemId) {
            const [blogData, teachingData] = await Promise.all([
                this.getContentDoc('collection_blog', { silent: true }),
                this.getContentDoc('collection_teaching', { silent: true })
            ]);
            const allItems = [
                ...this.getCollectionItems(blogData),
                ...this.getCollectionItems(teachingData)
            ];
            const item = this.findContentItemById(allItems, itemId);
            const localizedItem = item ? this.getLocalizedContentItem(item) : null;
            if (localizedItem && (localizedItem.seoTitle || localizedItem.seoDescription || localizedItem.geoPosition)) {
                itemSEO = {
                    title: localizedItem.seoTitle,
                    description: localizedItem.seoDescription,
                    geoPosition: localizedItem.geoPosition
                };
            }
        }
        this.applySEO(seoSettings, itemSEO);
    }

    async loadSpecializedContent() {
        if (this.pageId === 'index') {
            const [heroData, events, blogData, teachingData, causes] = await Promise.all([
                this.getContentDoc('hero_slides', { silent: true }),
                this.loadEvents(),
                this.getContentDoc('collection_blog', { silent: true }),
                this.getContentDoc('collection_teaching', { silent: true }),
                this.loadCauses()
            ]);

            if (heroData && heroData.slides) {
                this.cacheLocalJson('hkm_cache_hero_slides', heroData);
                this.renderHeroSlides(heroData.slides);
            }

            this.renderEvents(events || []);

            try {
                await this.loadFacebookFeed();
            } catch (error) {
                this.reportError('loadFacebookFeed:index', error, {
                    notifyUser: false
                });
            }

            // 4. Testimonials
            const testimonialsData = await this.getContentDoc('collection_testimonials', { silent: true });
            const testimonials = this.getCollectionItems(testimonialsData);
            this.renderTestimonials(testimonials);

            const blogItems = this.getCollectionItems(blogData);
            const localizedBlogItems = this.localizeBlogItems(blogItems);
            if (localizedBlogItems.length > 0) {
                // NO uses #blogg, EN/ES use #blog
                this.renderBlogPosts(localizedBlogItems.slice(0, 3), '#blogg .blog-grid, #blog .blog-grid');
            }

            const teachingItems = this.getCollectionItems(teachingData);
            const frontTeachingContainer = document.getElementById('siste-undervisning');
            if (teachingItems.length > 0 && frontTeachingContainer) {
                // Show up to 3 most recent teachings
                frontTeachingContainer.style.display = 'block';
                this.renderTeachingSeries(teachingItems.slice(0, 3), '#front-teaching-grid');
            }

            this.renderCauses(causes);

            this.enableHeroAnimations();
        }

        if (this.pageId === 'blogg-post') {
            await this.renderSingleBlogPost();
        }

        if (this.pageId === 'arrangementer') {
            const settings = await window.firebaseService.getPageContent('settings_integrations') || {};
            const events = await this.loadEvents();

            // 1. Month View
            const monthSection = document.getElementById('arrangement-kalender');
            if (settings.showMonthView === true) {
                this.setupCalendarNavigation();
                this.setCalendarEvents(events || []);
                this.renderCalendarView();
                if (monthSection) monthSection.style.display = 'block';
            } else {
                if (monthSection) monthSection.style.display = 'none';
            }

            // 2. Agenda View (Grid of events)
            const agendaSection = document.querySelector('.events-page');
            if (settings.showAgendaView !== false) {
                this.renderEvents(events || []);
                if (agendaSection) agendaSection.style.display = 'block';
            } else {
                if (agendaSection) agendaSection.style.display = 'none';
            }
        }

        if (this.pageId === 'kalender') {
            const settings = await window.firebaseService.getPageContent('settings_integrations') || {};
            if (settings.showMonthView !== false) {
                const events = await this.loadEvents();
                this.setupCalendarNavigation();
                this.setCalendarEvents(events || []);
                this.renderCalendarView();
            } else {
                const container = document.querySelector('.calendar-section') || document.querySelector('main');
                if (container) {
                    const lang = document.documentElement.lang || 'no';
                    const eventsLink = this.getLocalizedLink('arrangementer.html');
                    const title = lang === 'en' ? 'Calendar is temporarily disabled.' : (lang === 'es' ? 'El calendario está desactivado temporalmente.' : 'Kalenderen er midlertidig deaktivert.');
                    const p = lang === 'en' ? 'Please check our events in the list above.' : (lang === 'es' ? 'Consulte nuestros eventos en la lista de arriba.' : 'Vennligst sjekk våre arrangementer i listen over.');
                    const btn = lang === 'en' ? 'See events' : (lang === 'es' ? 'Ver eventos' : 'Se arrangementer');

                    container.innerHTML = `<div class="container cms-calendar-disabled-state"><h2>${title}</h2><p>${p}</p><a href="${eventsLink}" class="btn btn-primary cms-calendar-disabled-cta">${btn}</a></div>`;
                }
            }
        }

        if (this.pageId === 'arrangement-detaljer') {
            await this.renderEventDetailsPage();
        }

        if (this.pageId === 'blogg') {
            console.log("[ContentManager] Loading content for 'blogg' page...");
            try {
                const blogData = await window.firebaseService.getPageContent('collection_blog');
                console.log("[ContentManager] Blog data received:", blogData);

                const blogItems = this.getCollectionItems(blogData);
                const localizedBlogItems = this.localizeBlogItems(blogItems);
                console.log("[ContentManager] Parsed blog items:", blogItems);
                const postsToRender = localizedBlogItems.length > 0 ? localizedBlogItems : blogItems;

                if (postsToRender.length > 0) {
                    this.renderBlogPosts(postsToRender, '.blog-page .blog-grid');
                } else {
                    console.warn("[ContentManager] No blog posts found in 'collection_blog'.");
                    const container = document.querySelector('.blog-page .blog-grid');
                    if (container) container.innerHTML = '<p class="cms-empty-copy">Ingen blogginnlegg funnet. Kjør seed-scriptet.</p>';
                }
            } catch (err) {
                console.error("[ContentManager] Error loading blog posts:", err);
            }
        }



        if (this.pageId === 'donasjoner') {
            const causes = await this.loadCauses();
            this.renderCauses(causes);
        }
    }

    async loadCauses() {
        try {
            const data = await this.getContentDoc('collection_causes');
            return this.getCollectionItems(data);
        } catch (e) {
            this.reportError('loadCauses', e);
            return [];
        }
    }

    renderCauses(causes) {
        const container = document.querySelector('.causes-grid');
        const section = document.querySelector('.donations-page.section') || document.querySelector('.causes');

        if (!container || !section) return;

        if (!causes || causes.length === 0) {
            section.style.display = 'none';
            return;
        }

        section.style.display = 'block';

        const pageContent = (window.HKM_PAGE_CONTENT && this.pageId && window.HKM_PAGE_CONTENT[this.pageId]) || {};
        const fallbackTitle = this.getValueByPath(pageContent, 'causes.card.defaultTitle') || 'Innsamlingsaksjon';
        const collectedLabel = this.getValueByPath(pageContent, 'causes.card.collectedLabel') || 'samlet inn';
        const goalLabel = this.getValueByPath(pageContent, 'causes.card.goalLabel') || 'Mål';
        const ctaText = this.getValueByPath(pageContent, 'causes.card.cta') || 'Støtt prosjektet';

        container.innerHTML = causes.map(cause => {
            const imageUrl = cause.imageUrl || cause.image || 'img/placeholder-event.jpg';
            const title = cause.title || fallbackTitle;
            const description = cause.description || '';
            const raised = Number(cause.raised ?? cause.collected ?? 0) || 0;
            const goal = Number(cause.goal ?? 0) || 0;
            const progress = goal > 0 ? Math.min((raised / goal) * 100, 100) : 0;
            const link = cause.link || this.getLocalizedLink('donasjoner.html');

            return `
            <div class="cause-card">
                <div class="cause-image">
                    <img src="${imageUrl}" alt="${title}">
                    ${cause.tag ? `<span class="cause-tag">${cause.tag}</span>` : ''}
                </div>
                <div class="cause-content">
                    <h3 class="cause-title">${title}</h3>
                    <p class="cause-description">${description}</p>
                    
                    ${goal ? `
                    <div class="cause-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${progress}%"></div>
                        </div>
                        <div class="progress-stats">
                            <span>${raised.toLocaleString('no-NO')} kr ${collectedLabel}</span>
                            <span>${goalLabel}: ${goal.toLocaleString('no-NO')} kr</span>
                        </div>
                    </div>
                    ` : ''}
                    
                    <a href="${link}" class="btn btn-primary btn-block">${ctaText}</a>
                </div>
            </div>
        `;
        }).join('');
    }

    async renderSingleBlogPost() {
        const container = document.getElementById('single-post-content');
        const titleEl = document.getElementById('single-post-title');
        const breadcrumbEl = document.getElementById('single-post-breadcrumb');
        const dateEl = document.getElementById('single-post-date');
        const categoryEl = document.getElementById('single-post-category');
        const heroEl = document.getElementById('blog-hero');

        if (!container) return;

        const urlParams = new URLSearchParams(window.location.search);
        const itemId = urlParams.get('id');

        if (!itemId) {
            container.innerHTML = '<p>Fant ikke innlegget.</p>';
            return;
        }

        const blogData = await window.firebaseService.getPageContent('collection_blog');
        const teachingData = await window.firebaseService.getPageContent('collection_teaching');
        const blogItems = this.getCollectionItems(blogData);
        const teachingItems = this.getCollectionItems(teachingData);
        const blogItem = this.findContentItemById(blogItems, itemId);
        const teachingItem = this.findContentItemById(teachingItems, itemId);
        const sourceItem = blogItem || teachingItem;
        const item = sourceItem ? this.getLocalizedContentItem(sourceItem) : null;
        const isTeaching = !!teachingItem;

        if (!item) {
            container.innerHTML = '<p>Innholdet ble ikke funnet.</p>';
            return;
        }

        if (titleEl) titleEl.textContent = item.title || 'Blogginnlegg';
        if (breadcrumbEl) breadcrumbEl.textContent = item.title || 'Blogginnlegg';

        if (dateEl) {
            const dateStr = item.date ? this.formatDate(item.date) : '';
            dateEl.innerHTML = `<i class="far fa-calendar"></i> ${dateStr}`;
        }

        const authorEl = document.getElementById('single-post-author');
        if (authorEl) {
            const auth = item.author || 'Ukjent forfatter';
            authorEl.innerHTML = `<i class="fas fa-user"></i> ${auth}`;
        }

        if (categoryEl) {
            const cat = item.category || item.teachingType || (isTeaching ? 'Undervisning' : 'Ukategorisert');
            categoryEl.innerHTML = cat ? `<i class="fas fa-tag"></i> ${cat}` : '';
        }

        if (heroEl && item.imageUrl) {
            heroEl.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url('${item.imageUrl}')`;
        }

        // --- Calculate Reading Time ---
        let readingTime = 5; // default fallback
        if (item.content) {
            const textContent = this.stripHtml(this.parseBlocks(item.content));
            const wordCount = textContent.split(/\s+/).filter(word => word.length > 0).length;
            readingTime = Math.max(1, Math.ceil(wordCount / 225)); // 225 words per minute
        }

        const readingTimeEl = document.getElementById('single-post-readingtime');
        if (readingTimeEl) {
            const timeLabel = this.getTranslation('reading_time') || 'min lesing';
            readingTimeEl.innerHTML = `<i class="far fa-clock"></i> ${readingTime} ${timeLabel}`;
            readingTimeEl.style.display = 'inline-block';
        }

        // --- View Counter ---
        const postId = this.getContentItemStableId(sourceItem || item);
        let viewCount = 1;

        if (postId && window.firebaseService && window.firebaseService.db && window.firebase && window.firebase.firestore) {
            try {
                // Determine doc reference based on a secure collection pattern.
                // In an ideal world we don't spam get/set. If cache works, rely on it. Just trigger an increment.
                const docRef = window.firebaseService.db.collection('blog_stats').doc(postId);

                // Read current stats (if exists) before incrementing, allows immediate update while updating remote.
                const docSnap = await docRef.get();
                if (docSnap.exists && typeof docSnap.data().views !== 'undefined') {
                    viewCount = docSnap.data().views + 1;
                }

                // Increment view asynchronously
                docRef.set({
                    views: window.firebase.firestore.FieldValue.increment(1)
                }, { merge: true }).catch(err => {
                    console.warn('[ContentManager] Kunne ikke oppdatere visninger, kanskje manglende tilgang:', err);
                });
            } catch (err) {
                console.warn('[ContentManager] Feil ved henting av visninger:', err);
            }
        }

        let viewsEl = document.getElementById('single-post-views');
        if (!viewsEl && document.querySelector('.blog-meta')) {
            viewsEl = document.createElement('span');
            viewsEl.id = 'single-post-views';

            // Insert after readingTimeEl if we can, otherwise just append to meta box
            if (readingTimeEl && readingTimeEl.parentNode) {
                readingTimeEl.parentNode.appendChild(viewsEl);
            } else {
                document.querySelector('.blog-meta').appendChild(viewsEl);
            }
        }
        if (viewsEl) {
            const viewsLabel = this.getTranslation('views') || 'visninger';
            viewsEl.innerHTML = `<i class="far fa-eye"></i> ${viewCount} ${viewsLabel}`;
            viewsEl.style.display = 'inline-block';
        }

        container.innerHTML = this.parseBlocks(item.content) || '<p>Dette innlegget har foreløpig ikke noe innhold.</p>';

        // Hide skeleton, reveal real content with fade-in
        const skeleton = document.getElementById('post-skeleton');
        if (skeleton) skeleton.style.display = 'none';
        container.style.display = 'block';
        // Small rAF so display:block takes effect before opacity transition
        requestAnimationFrame(() => {
            container.style.opacity = '0';
            container.style.transition = 'opacity 0.4s ease';
            requestAnimationFrame(() => { container.style.opacity = '1'; });
        });
        // Fade in hero title and meta row
        const heroTitle = document.getElementById('single-post-title');
        const metaRow = document.getElementById('blog-meta-row');
        if (heroTitle) heroTitle.style.opacity = '1';
        if (metaRow) metaRow.style.opacity = '1';

        // Update back-button: teaching → undervisning, blog → blogg
        const backBtn = document.getElementById('back-btn');
        if (backBtn) {
            if (isTeaching) {
                backBtn.href = 'media.html#teaching-section';
                backBtn.innerHTML = '<i class="fas fa-arrow-left cms-inline-icon-gap"></i> Tilbake til undervisning';
            } else {
                backBtn.href = 'blogg.html';
                backBtn.innerHTML = '<i class="fas fa-arrow-left cms-inline-icon-gap"></i> Tilbake til blogg';
            }
        }

        // Populate Tags / Bottom Section
        const authorBox = document.getElementById('single-post-author-box');
        if (authorBox) {
            if (item.tags && Array.isArray(item.tags) && item.tags.length > 0) {
                // Change layout for tags only
                authorBox.style.display = 'block';
                authorBox.style.background = '#f8fafc';
                authorBox.style.padding = '20px';

                const tagsHtml = `<div class="cms-post-tags-wrap">
                    ${item.tags.map(t => `<span class="blog-tag">${t}</span>`).join('')}
                </div>`;

                authorBox.innerHTML = `
                    <h4 class="cms-post-tags-title">Emner</h4>
                    ${tagsHtml}
                `;
            } else {
                // Hide box if no tags
                authorBox.style.display = 'none';
            }
        }

        // --- Related Posts ---
        const relatedContainer = document.getElementById('single-post-related');
        if (relatedContainer) {
            let relatedItems = [];
            let heading = 'Relaterte innlegg';
            let ctaLabel = 'Les mer';

            if (isTeaching) {
                heading = 'Relatert undervisning';
                ctaLabel = 'Les undervisning';
                const seriesIds = Array.isArray(sourceItem?.seriesItems) ? sourceItem.seriesItems : [];
                if (seriesIds.length > 0) {
                    relatedItems = teachingItems.filter(i =>
                        (seriesIds.includes(i.id) || seriesIds.includes(i.title)) &&
                        this.getContentItemStableId(i) !== postId
                    );
                } else {
                    const teachingType = sourceItem?.teachingType || sourceItem?.category || item.teachingType || item.category;
                    relatedItems = teachingItems
                        .filter(i => this.getContentItemStableId(i) !== postId)
                        .filter(i => {
                            if (!teachingType) return true;
                            return (i.teachingType || i.category) === teachingType;
                        })
                        .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
                        .slice(0, 3);
                }
            } else if (sourceItem?.relatedPosts && Array.isArray(sourceItem.relatedPosts) && sourceItem.relatedPosts.length > 0) {
                // Fetch manually selected ones
                relatedItems = blogItems.filter(i =>
                    (sourceItem.relatedPosts.includes(i.id) || sourceItem.relatedPosts.includes(i.title)) &&
                    this.getContentItemStableId(i) !== postId
                );
            } else {
                // Fallback: 3 most recent posts excluding current one
                relatedItems = blogItems
                    .filter(i => this.getContentItemStableId(i) !== postId)
                    .sort((a, b) => new Date(b.date) - new Date(a.date))
                    .slice(0, 3);
            }

            if (relatedItems.length > 0) {
                const localizedRelatedItems = this.localizeBlogItems(relatedItems);
                relatedContainer.style.display = 'block';
                relatedContainer.innerHTML = `
                    <h3 class="cms-related-heading">
                        ${heading}
                    </h3>
                    <div class="blog-grid cms-related-grid">
                        ${localizedRelatedItems.map(post => `
                            <article class="blog-card cms-related-card">
                                <a href="${this.getLocalizedLink('blogg-post.html')}?id=${encodeURIComponent(post.__stableId || this.getContentItemStableId(post))}" class="cms-related-card-link">
                                    <div class="blog-image cms-related-image">
                                        <img src="${post.imageUrl || 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'}" 
                                             alt="${post.title}" 
                                             class="cms-related-image-el">
                                        ${post.category ? `<span class="cms-related-category">${post.category}</span>` : ''}
                                    </div>
                                    <div class="blog-content cms-related-content">
                                        <div class="blog-meta cms-related-meta">
                                            <span><i class="far fa-calendar"></i> ${post.date ? this.formatDate(post.date) : ''}</span>
                                            ${post.author ? `<span><i class="fas fa-user"></i> ${post.author}</span>` : ''}
                                        </div>
                                        <h4 class="cms-related-title">${post.title}</h4>
                                        <span class="cms-related-cta">
                                           ${ctaLabel} <i class="fas fa-arrow-right cms-related-cta-icon"></i>
                                        </span>
                                    </div>
                                </a>
                            </article>
                        `).join('')}
                    </div>
                `;
            } else {
                relatedContainer.style.display = 'none';
            }
        }
    }

    async loadEvents(forceRefresh = false) {
        try {
            const { startIso, endIso } = this.getMonthRangeIso(this.currentDate);
            const cacheKey = `hkm_events_v2_${startIso}_${endIso}`;
            const isLocalDev = ['localhost', '127.0.0.1'].includes(String(window.location.hostname || '').toLowerCase());

            // 1. Check Cache (Use localStorage for better persistence)
            if (!forceRefresh && !isLocalDev) {
                try {
                    const cached = localStorage.getItem(cacheKey);
                    if (cached) {
                        const { timestamp, events } = JSON.parse(cached);
                        // 15 minutes TTL
                        if (Date.now() - timestamp < 15 * 60 * 1000) {
                            return events;
                        }
                    }
                } catch (e) {
                    console.warn('[ContentManager] Cache parse failed', e);
                }
            }

            const currentYear = this.currentDate.getFullYear();
            const holidayEvents = this.getNorwegianHolidays(currentYear);
            const rangeStart = new Date(startIso);
            const rangeEnd = new Date(endIso);
            const monthHolidays = holidayEvents.filter(event => {
                const eventDate = this.parseEventDate(event.start || event.date);
                if (!eventDate) return false;
                return eventDate >= rangeStart && eventDate <= rangeEnd;
            });

            let finalEvents = [];

            // 2. Prefer direct GCal fetch when configured
            const integrations = await window.firebaseService.getPageContent('settings_integrations');
            const gcal = integrations?.googleCalendar || {};
            const apiKey = gcal.apiKey || '';
            const calendarListRaw = Array.isArray(integrations?.googleCalendars)
                ? integrations.googleCalendars
                : [];
            const calendarList = calendarListRaw
                .filter((item) => item && typeof item === 'object')
                .map((item) => ({
                    id: item.id || item.calendarId || '',
                    label: item.label || item.name || ''
                }))
                .filter((item) => item.id);

            const calendars = calendarList.length > 0
                ? calendarList
                : (gcal.calendarId ? [{ id: gcal.calendarId, label: gcal.label || 'Arrangementer' }] : []);

            let gcalEvents = [];
            if (apiKey && calendars.length > 0) {
                const results = await Promise.all(
                    calendars.map(async (calendar) => {
                        const items = await this.fetchGoogleCalendarEvents(apiKey, calendar.id, startIso, endIso);
                        return (items || []).map(event => ({
                            ...event,
                            sourceId: `gcal:${calendar.id}`,
                            sourceLabel: calendar.label || calendar.id
                        }));
                    })
                );
                gcalEvents = results.flat();
            }

            // 3. Fetch Firestore events (always, to allow overrides or manual events)
            const eventData = await window.firebaseService.getPageContent('collection_events');
            const firebaseItems = Array.isArray(eventData) ? eventData : (eventData?.items || []);
            const taggedFirebase = firebaseItems.map(event => ({
                ...event,
                sourceId: 'manual',
                sourceLabel: 'Interne arrangementer'
            }));

            // 4. Merge Logic
            if (gcalEvents.length > 0) {
                // Use GCal as base, but override with Firebase if ID or Title/Date matches
                finalEvents = gcalEvents.map(gEvent => {
                    return this._mergeEventWithFirestore(gEvent, taggedFirebase);
                });

                // Add Firebase events that DON'T match GCal
                const uniqueFirebase = taggedFirebase.filter(fEvent =>
                    !gcalEvents.some(gEvent =>
                        (fEvent.gcalId && fEvent.gcalId === gEvent.id) ||
                        (gEvent.title === fEvent.title && this.isSameDay(this.parseEventDate(fEvent.date), this.parseEventDate(gEvent.start)))
                    )
                );
                finalEvents = [...finalEvents, ...uniqueFirebase, ...monthHolidays];
            } else {
                finalEvents = [...taggedFirebase, ...monthHolidays];
            }

            if (isLocalDev) {
                try {
                    console.info('[ContentManager] loadEvents debug', {
                        forceRefresh: Boolean(forceRefresh),
                        apiKeyConfigured: Boolean(apiKey),
                        calendarsConfigured: calendars.length,
                        gcalEvents: gcalEvents.length,
                        firebaseManualEvents: taggedFirebase.length,
                        holidays: monthHolidays.length,
                        finalEvents: finalEvents.length,
                        nonHolidayEvents: finalEvents.filter(e => !e?.isHoliday).length,
                        firstNonHoliday: finalEvents.find(e => !e?.isHoliday) || null
                    });
                } catch (debugErr) {
                    // noop
                }
            }

            // If we only ended up with holidays while event sources are configured, a stale/partial state
            // may have slipped through. Retry once without cache before giving up.
            const nonHolidayCount = finalEvents.filter(e => !e?.isHoliday).length;
            const hasEventSourcesConfigured = Boolean((apiKey && calendars.length > 0) || taggedFirebase.length > 0);
            if (!forceRefresh && hasEventSourcesConfigured && nonHolidayCount === 0) {
                console.warn('[ContentManager] loadEvents returned only holidays/empty. Retrying once with forceRefresh...');
                return this.loadEvents(true);
            }

            // Save to Cache
            if (!isLocalDev) {
                try {
                    localStorage.setItem(cacheKey, JSON.stringify({
                        timestamp: Date.now(),
                        events: finalEvents
                    }));
                } catch (e) {
                    console.warn('[ContentManager] Failed to cache events', e);
                }
            }

            return finalEvents;

        } catch (err) {
            const isLocalFile = window.location.protocol === 'file:';
            this.reportError('loadEvents', err, {
                notifyUser: !isLocalFile, // Only notify if NOT a local file
                userMessage: 'Kunne ikke laste arrangementer akkurat nå.'
            });
            return [];
        }
    }


    setupCalendarNavigation() {
        const prevBtn = document.getElementById('prev-month');
        const nextBtn = document.getElementById('next-month');
        const todayBtn = document.getElementById('today-btn');

        if (prevBtn) prevBtn.onclick = async () => {
            this.currentDate.setMonth(this.currentDate.getMonth() - 1);
            this.agendaMonthsToShow = 1; // Reset
            await this.refreshCalendarView();
        };

        if (nextBtn) nextBtn.onclick = async () => {
            this.currentDate.setMonth(this.currentDate.getMonth() + 1);
            this.agendaMonthsToShow = 1; // Reset
            await this.refreshCalendarView();
        };

        if (todayBtn) todayBtn.onclick = async () => {
            this.currentDate = new Date();
            this.agendaMonthsToShow = 1; // Reset
            await this.refreshCalendarView();
        };
    }

    async refreshCalendarView() {
        const events = await this.loadEvents();
        this.setCalendarEvents(events || []);
        this.renderCalendarView();
    }

    setCalendarEvents(events) {
        this.calendarEvents = Array.isArray(events) ? events : [];
        const sources = this.collectCalendarSources(this.calendarEvents);
        if (!this.activeCalendarSources) {
            this.activeCalendarSources = new Set(sources.map(source => source.id));
        } else {
            sources.forEach(source => {
                if (!this.activeCalendarSources.has(source.id)) {
                    this.activeCalendarSources.add(source.id);
                }
            });
        }
        this.renderCalendarFilters(sources);
    }

    collectCalendarSources(events) {
        const sourceMap = new Map();
        (events || []).forEach(event => {
            const sourceId = event.sourceId || (event.isHoliday ? 'holiday' : 'unknown');
            const sourceLabel = event.sourceLabel || (event.isHoliday ? 'Helligdager' : 'Kalender');
            if (!sourceMap.has(sourceId)) {
                sourceMap.set(sourceId, { id: sourceId, label: sourceLabel });
            }
        });
        return Array.from(sourceMap.values());
    }

    renderCalendarFilters(sources) {
        const container = document.querySelector('.calendar-container');
        if (!container) return;

        const header = container.querySelector('.calendar-header');
        const agendaHeader = container.querySelector('.calendar-agenda-header');
        if (!header || !agendaHeader) return;

        const headerFilters = this.ensureFilterRow(header, 'calendar-header-filters', true);

        const renderRow = (row) => {
            if (!sources.length) {
                row.innerHTML = '';
                return;
            }

            row.innerHTML = sources.map(source => {
                const active = this.activeCalendarSources?.has(source.id) ? 'active' : '';
                const label = this.escapeHtml(source.label);
                return `<button type="button" class="cal-filter-btn ${active}" data-source-id="${source.id}">${label}</button>`;
            }).join('');

            const buttons = row.querySelectorAll('.cal-filter-btn');
            buttons.forEach(button => {
                button.addEventListener('click', () => {
                    const sourceId = button.getAttribute('data-source-id');
                    if (!sourceId) return;

                    if (this.activeCalendarSources?.has(sourceId)) {
                        this.activeCalendarSources.delete(sourceId);
                        button.classList.remove('active');
                    } else {
                        this.activeCalendarSources.add(sourceId);
                        button.classList.add('active');
                    }

                    this.renderCalendarView();
                });
            });
        };

        renderRow(headerFilters);

        const agendaFilters = agendaHeader.parentElement?.querySelector('.calendar-agenda-filters');
        if (agendaFilters) agendaFilters.remove();
    }

    ensureFilterRow(parent, className, afterParent = false) {
        const scope = afterParent ? parent.parentElement : parent;
        let row = scope?.querySelector(`.${className}`);
        if (!row) {
            row = document.createElement('div');
            row.className = `calendar-filters ${className}`;
            if (afterParent) {
                parent.insertAdjacentElement('afterend', row);
            } else {
                parent.appendChild(row);
            }
        }
        return row;
    }

    renderCalendarView() {
        const filtered = this.getFilteredEvents(this.calendarEvents || []);
        this.renderCalendar(filtered);
        this.renderAgenda(filtered, '#calendar-agenda-list');
    }

    getFilteredEvents(events) {
        if (!this.activeCalendarSources) return events || [];
        if (this.activeCalendarSources.size === 0) return [];
        return (events || []).filter(event => {
            const sourceId = event.sourceId || (event.isHoliday ? 'holiday' : 'unknown');
            return this.activeCalendarSources.has(sourceId);
        });
    }

    escapeHtml(value) {
        if (value === null || value === undefined) return '';
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    renderCalendar(events) {
        const grid = document.getElementById('calendar-grid');
        const monthTitle = document.getElementById('current-month-year');
        if (!grid || !monthTitle) return;

        // Set Month Title
        const monthNames = ["Januar", "Februar", "Mars", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Desember"];
        monthTitle.innerText = `${monthNames[this.currentDate.getMonth()]} ${this.currentDate.getFullYear()}`;

        // Clear previous cells (keeping headers)
        const headers = grid.querySelectorAll('.cal-day-header');
        grid.innerHTML = '';
        headers.forEach(h => grid.appendChild(h));

        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();

        // First day of month (Adjusted for Mon-Sun)
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const startOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1; // 0=Mon, 6=Sun

        // Days in month
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        // Days in previous month
        const prevMonthDays = new Date(year, month, 0).getDate();

        // Total cells needed (multiple of 7)
        const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;

        for (let i = 0; i < totalCells; i++) {
            const cell = document.createElement('div');
            cell.className = 'cal-cell';

            let displayDay;
            let currentCellDate;

            if (i < startOffset) {
                // Prev Month
                cell.classList.add('other-month');
                displayDay = prevMonthDays - startOffset + i + 1;
                currentCellDate = new Date(year, month - 1, displayDay);
            } else if (i < startOffset + daysInMonth) {
                // Current Month
                displayDay = i - startOffset + 1;
                currentCellDate = new Date(year, month, displayDay);

                const today = new Date();
                if (displayDay === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
                    cell.classList.add('today');
                }
            } else {
                // Next Month
                cell.classList.add('other-month');
                displayDay = i - (startOffset + daysInMonth) + 1;
                currentCellDate = new Date(year, month + 1, displayDay);
            }

            cell.innerHTML = `<div class="day-num">${displayDay}</div><div class="cal-events"></div>`;

            // Add Events to this cell
            const cellEvents = (events || []).filter(e => {
                const eDate = this.parseEventDate(e.start || e.date);
                if (!eDate) return false;
                return eDate.getDate() === currentCellDate.getDate() &&
                    eDate.getMonth() === currentCellDate.getMonth() &&
                    eDate.getFullYear() === currentCellDate.getFullYear();
            });

            const eventsContainer = cell.querySelector('.cal-events');
            cellEvents.forEach(e => {
                const tag = document.createElement('div');
                tag.className = 'cal-event-tag';

                // Add past event class if applicable
                if (this.isEventPast(e)) {
                    tag.classList.add('cms-past-event-tag');
                }

                tag.innerText = e.title;
                const eventTime = this.parseEventDate(startValue);
                const hasTime = this.eventHasTime(startValue);
                const timeLabel = eventTime && hasTime
                    ? eventTime.toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' })
                    : 'Tid ikke satt';
                tag.title = `${e.title}\nKl: ${timeLabel}\n${e.location || ''}`;

                const eventKey = this.getEventKey(e);
                tag.setAttribute('data-event-key', eventKey);
                tag.classList.add('event-modal-trigger');

                eventsContainer.appendChild(tag);
            });

            this.bindEventModalTriggers(eventsContainer);

            grid.appendChild(cell);
        }
        this.setEventCache(events || []);
    }

    async fetchGoogleCalendarEvents(apiKey, calendarId, timeMin, timeMax) {
        try {
            const minIso = timeMin || new Date().toISOString();
            const maxIso = timeMax || '';
            const maxParam = maxIso ? `&timeMax=${encodeURIComponent(maxIso)}` : '';
            const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?key=${apiKey}&timeMin=${encodeURIComponent(minIso)}${maxParam}&orderBy=startTime&singleEvents=true&maxResults=250`;

            const response = await fetch(url);
            const data = await response.json();

            if (data.error) {
                console.error("❌ GCal Error:", data.error.message);
                return [];
            }

            return data.items.map(item => ({
                id: item.id,
                title: item.summary,
                description: item.description || '',
                location: item.location || '',
                start: item.start.dateTime || item.start.date,
                end: item.end.dateTime || item.end.date,
                link: item.htmlLink,
                hangoutLink: item.hangoutLink || null,
                conferenceData: item.conferenceData || null
            }));
        } catch (err) {
            console.error("❌ Failed to fetch Google Calendar events:", err);
            return [];
        }
    }

    async fetchSingleGoogleCalendarEvent(apiKey, calendarId, eventId) {
        try {
            const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}?key=${apiKey}`;
            const response = await fetch(url);

            if (!response.ok) {
                if (response.status === 404) return null; // Not found
                throw new Error(`GCal API responded with ${response.status}`);
            }

            const item = await response.json();

            return {
                id: item.id,
                title: item.summary,
                description: item.description || '',
                location: item.location || '',
                start: item.start.dateTime || item.start.date,
                end: item.end.dateTime || item.end.date,
                link: item.htmlLink,
                hangoutLink: item.hangoutLink || null,
                conferenceData: item.conferenceData || null,
                sourceId: `gcal:${calendarId}`,
                sourceLabel: 'Google Calendar'
            };
        } catch (err) {
            console.warn(`[ContentManager] Failed to fetch single event ${eventId}:`, err);
            return null;
        }
    }

    renderEvents(events) {
        if (window.cmsLog) window.cmsLog(`Viser ${events ? events.length : 0} arrangementer...`);
        const container = document.querySelector('.events-grid');
        if (!container) {
            if (window.cmsLog) window.cmsLog('FEIL: Fant ikke .events-grid');
            return;
        }

        try {
            // Cache events for modal usage
            this.setEventCache(events);

            if (!events || events.length === 0) {
                container.innerHTML = `
                    <div class="events-empty-state cms-events-empty-state">
                        <h3 class="cms-events-empty-title">Ingen kommende arrangementer</h3>
                        <p>Vi har foreløpig ingen planlagte arrangementer i kalenderen.</p>
                    </div>
                `;
                return;
            }

            // Filter out holidays from the "boxes" (cards) view
            // AND filter out past events from boxes correctly
            const now = new Date();
            const filteredEvents = (events || []).filter(e => {
                if (e.isHoliday) return false;

                // For "boxes", we only want future events (or events currently happening)
                return !this.isEventPast(e);
            });

            const displayEvents = this.pageId === 'index' ? filteredEvents.slice(0, 3) : filteredEvents;

            if (['localhost', '127.0.0.1'].includes(String(window.location.hostname || '').toLowerCase())) {
                console.info('[ContentManager] renderEvents debug', {
                    pageId: this.pageId,
                    inputEvents: Array.isArray(events) ? events.length : 0,
                    nonHolidayEvents: filteredEvents.length,
                    displayEvents: displayEvents.length
                });
            }

            const html = displayEvents.map(event => {
                try {
                    const eventKey = this.getEventKey(event);
                    const startValue = event.start || event.date;
                    const startDate = this.parseEventDate(startValue);
                    const hasTime = this.eventHasTime(startValue);
                    const day = startDate ? startDate.getDate() : '--';
                    const lang = document.documentElement.lang || 'no';
                    const locale = lang === 'en' ? 'en-US' : (lang === 'es' ? 'es-ES' : 'nb-NO');

                    const monthStr = startDate
                        ? startDate.toLocaleString(locale, { month: 'short' }).replace('.', '')
                        : '--';
                    const monthUpper = monthStr.charAt(0).toUpperCase() + monthStr.slice(1);

                    const dateLabel = startDate
                        ? startDate.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })
                        : '';

                    const imageSrc = this._getEventImage(event);
                    const imageAlt = event.title || 'Arrangement';

                    const detailsUrl = this.getLocalizedLink('arrangement-detaljer.html') + '?id=' + encodeURIComponent(eventKey);

                    return `
                        <a href="${detailsUrl}" class="event-card">
                            <div class="event-image">
                                <div class="event-image-zoom">
                                    <img src="${imageSrc}" alt="${imageAlt}">
                                </div>
                                <div class="event-date">
                                    <span class="month">${monthUpper}</span>
                                    <span class="day">${day}</span>
                                </div>
                            </div>
                            <div class="event-content">
                                <h3 class="event-title">${event.title || 'Uten tittel'}</h3>
                                <div class="event-meta">
                                    ${dateLabel ? `<span>${dateLabel}</span>` : ''}
                                </div>
                            </div>
                        </a>
                    `;
                } catch (innerErr) {
                    console.error('Error rendering single event:', innerErr, event);
                    return ''; // Skip invalid event
                }
            }).join('');

            container.innerHTML = html;

        } catch (err) {
            if (window.cmsLog) window.cmsLog('CRASH i renderEvents: ' + err.message);
            console.error(err);
        }
    }

    renderAgenda(events, selector) {
        const container = document.querySelector(selector);
        if (!container) return;
        this.setEventCache(events || []);

        if (!events || events.length === 0) {
            container.innerHTML = '<li class="agenda-empty">Ingen kommende arrangementer er registrert.</li>';
            return;
        }

        const sorted = [...events].sort((a, b) => {
            const aDate = this.parseEventDate(a.start || a.date);
            const bDate = this.parseEventDate(b.start || b.date);
            const aTime = aDate ? aDate.getTime() : Number.POSITIVE_INFINITY;
            const bTime = bDate ? bDate.getTime() : Number.POSITIVE_INFINITY;
            return aTime - bTime;
        });

        // Calculate cutoff date based on agendaMonthsToShow
        const cutoffDate = new Date(this.currentDate);
        cutoffDate.setMonth(cutoffDate.getMonth() + this.agendaMonthsToShow);
        // Set to first day of next month after range
        cutoffDate.setDate(1);
        cutoffDate.setHours(0, 0, 0, 0);

        const visibleEvents = sorted.filter(e => {
            const d = this.parseEventDate(e.start || e.date);
            return d && d < cutoffDate;
        });

        const hasMore = visibleEvents.length < sorted.length;

        const listHtml = visibleEvents.map(event => {
            const eventKey = this.getEventKey(event);
            const startValue = event.start || event.date;
            const startDate = this.parseEventDate(startValue);
            const hasTime = this.eventHasTime(startValue);
            const lang = document.documentElement.lang || 'no';
            const locale = lang === 'en' ? 'en-US' : (lang === 'es' ? 'es-ES' : 'nb-NO');

            const dayNum = startDate
                ? startDate.toLocaleDateString(locale, { day: '2-digit' })
                : '--';
            const monthStr = startDate
                ? startDate.toLocaleDateString(locale, { month: 'short' }).replace('.', '')
                : '--';
            const weekdayStr = startDate
                ? startDate.toLocaleDateString(locale, { weekday: 'short' }).replace('.', '')
                : '';
            const timeStr = startDate && hasTime
                ? startDate.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
                : '';
            const timeLabel = timeStr ? timeStr : 'Tid ikke satt';
            const location = event.location || 'Sted ikke satt';

            // Check if event is in the past for graying out
            const isPast = this.isEventPast(event);
            const pastClass = isPast ? 'cms-past-event-agenda' : '';

            return `
                <li class="calendar-agenda-item ${pastClass}">
                    <div class="agenda-date-col">
                        <span class="agenda-day">${dayNum}</span>
                        <span class="agenda-month">${monthStr}</span>
                        <span class="agenda-weekday">${weekdayStr}</span>
                    </div>
                    <div class="agenda-time-col">
                        <span class="agenda-dot"></span>
                        <span class="agenda-time">${timeLabel}</span>
                    </div>
                    <div class="agenda-main">
                        <span class="agenda-title">${event.title}</span>
                        <span class="agenda-meta">${location}</span>
                    </div>
                    <button type="button" class="agenda-link event-modal-trigger" data-event-key="${eventKey}">Detaljer</button>
                </li>
                `;
        }).join('');

        container.innerHTML = listHtml;

        if (hasMore) {
            const btnContainer = document.createElement('li');
            btnContainer.style.textAlign = 'center';
            btnContainer.style.padding = '15px';
            btnContainer.style.listStyle = 'none';

            const loadMoreBtn = document.createElement('button');
            loadMoreBtn.className = 'btn btn-agenda-load'; // Specific class for visibility
            loadMoreBtn.innerText = 'Last flere arrangementer';
            loadMoreBtn.style.fontSize = '14px';

            loadMoreBtn.onclick = () => {
                this.agendaMonthsToShow++;
                this.renderAgenda(events, selector);
            };

            btnContainer.appendChild(loadMoreBtn);
            container.appendChild(btnContainer);
        }

        this.bindEventModalTriggers(container);
    }

    setEventCache(events) {
        this.eventCache = new Map();
        if (Array.isArray(events)) {
            events.forEach(event => {
                const key = this.getEventKey(event);
                if (key) this.eventCache.set(key, event);
            });
        }
    }

    getEventKey(event) {
        if (!event) return '';
        return event.id || `${event.title || 'event'}| ${event.start || event.date || ''} `;
    }

    /**
     * Dynamically render Testimonials or fallback to empty
     */
    renderTestimonials(testimonials) {
        const container = document.querySelector('.testimonial-track');
        const section = document.querySelector('.testimonials');
        if (!container) return;

        if (!testimonials || testimonials.length === 0) {
            container.innerHTML = '';
            if (section) section.style.display = 'none';
            return;
        }

        if (section) section.style.display = 'block';

        const testimonialsMarkup = testimonials.map((t, idx) => `
            <div class="testimonial-card ${idx === 0 ? 'active' : ''}">
                <div class="testimonial-image">
                    <img src="${t.imageUrl || 'https://via.placeholder.com/150'}" alt="${t.name}">
                </div>
                <p class="testimonial-text">"${t.text || ''}"</p>
                <h4 class="testimonial-name">${t.name || ''}</h4>
                <span class="testimonial-role">${t.role || 'Deltaker'}</span>
            </div>
        `).join('');

        this.setHTMLIfChanged(container, testimonialsMarkup, '__testimonials-html');

        // Re-initialize Testimonial Slider
        if (window.testimonialSlider) {
            window.testimonialSlider.init();
        }
    }

    extractFacebookPageIdentifier(value) {
        if (typeof value !== 'string') return '';
        const trimmed = value.trim();
        if (!trimmed) return '';

        if (!/^https?:\/\//i.test(trimmed)) {
            if (/facebook\.com\//i.test(trimmed)) {
                return this.extractFacebookPageIdentifier(`https://${trimmed.replace(/^\/+/, '')}`);
            }
            return trimmed.replace(/^@+/, '').trim();
        }

        try {
            const parsed = new URL(trimmed);
            const queryId = parsed.searchParams.get('id');
            if (queryId && queryId.trim()) {
                return queryId.trim();
            }

            const ignoredSegments = new Set([
                'pages',
                'pg',
                'profile.php',
                'posts',
                'events',
                'watch',
                'photos',
                'videos',
                'reel',
                'share'
            ]);
            const segments = parsed.pathname
                .split('/')
                .map((segment) => segment.trim())
                .filter(Boolean);

            for (const segment of segments) {
                if (!ignoredSegments.has(segment.toLowerCase())) {
                    return segment.replace(/^@+/, '').trim();
                }
            }
        } catch (error) {
            return trimmed
                .replace(/^https?:\/\//i, '')
                .replace(/^www\./i, '')
                .replace(/^facebook\.com\//i, '')
                .split(/[/?#]/)[0]
                .replace(/^@+/, '')
                .trim();
        }

        return '';
    }

    getFacebookFeedConfig() {
        const section = document.getElementById('facebook-feed');
        const pageContent = (window.HKM_PAGE_CONTENT && this.pageId && window.HKM_PAGE_CONTENT[this.pageId]) || {};
        const feedDoc = (window.HKM_CONTENT_DOCS && window.HKM_CONTENT_DOCS.settings_facebook_feed) || null;
        const sectionLink = section ? section.querySelector('.facebook-feed-cta') : null;
        const feedContent = this.getValueByPath(feedDoc || {}, 'facebookFeed')
            || this.getValueByPath(pageContent, 'facebookFeed')
            || {};
        const cardCount = section ? section.querySelectorAll('.facebook-post-card').length : 3;
        let livePostCount = Number(feedContent.livePostCount);

        if (!Number.isFinite(livePostCount)) {
            livePostCount = cardCount || 3;
        }

        livePostCount = Math.min(Math.max(Math.round(livePostCount), 1), Math.max(cardCount, 1));

        return {
            section,
            enabled: feedContent.enabled !== false,
            useLiveFeed: feedContent.useLiveFeed !== false,
            livePostCount,
            pageId: (typeof feedContent.pageId === 'string' ? feedContent.pageId.trim() : '')
                || this.extractFacebookPageIdentifier(typeof feedContent.pageUrl === 'string' ? feedContent.pageUrl : '')
                || this.extractFacebookPageIdentifier(sectionLink?.getAttribute('href') || ''),
            pageUrl: (typeof feedContent.pageUrl === 'string' ? feedContent.pageUrl.trim() : '')
                || (sectionLink?.getAttribute('href') || '').trim()
        };
    }

    getFacebookFeedUrls(limit = 3, { pageId = '', pageUrl = '' } = {}) {
        const params = new URLSearchParams({ limit: String(limit) });
        if (pageId) params.set('pageId', pageId);
        if (pageUrl) params.set('pageUrl', pageUrl);
        const projectId = (window.firebaseConfig && window.firebaseConfig.projectId) || 'his-kingdom-ministry';
        const urls = [`/api/facebook-feed?${params.toString()}`];
        const cloudFunctionUrl = `https://us-central1-his-kingdom-ministry.cloudfunctions.net/facebookFeed?${params.toString()}`;

        if (!urls.includes(cloudFunctionUrl)) {
            urls.push(cloudFunctionUrl);
        }

        return urls;
    }

    async loadFacebookFeed() {
        const config = this.getFacebookFeedConfig();
        const { section } = config;
        if (!section) return;

        if (!config.enabled) {
            section.style.display = 'none';
            return;
        }

        section.style.display = '';

        if (!config.useLiveFeed) {
            return;
        }

        let lastError = null;

        for (const url of this.getFacebookFeedUrls(config.livePostCount, {
            pageId: config.pageId,
            pageUrl: config.pageUrl
        })) {
            try {
                const response = await fetch(url, {
                    headers: {
                        'Accept': 'application/json'
                    }
                });

                if (!response.ok) {
                    lastError = new Error(`Facebook feed request failed with ${response.status}`);
                    continue;
                }

                const payload = await response.json();
                const items = Array.isArray(payload?.items) ? payload.items : [];

                if (!items.length) {
                    continue;
                }

                this.renderFacebookFeed(items, payload.pageUrl || config.pageUrl || '');
                return;
            } catch (error) {
                lastError = error;
            }
        }

        if (lastError) {
            console.warn('[ContentManager] Could not load live Facebook feed. Hiding section.', lastError);
            section.style.display = 'none'; // Hide if live feed fails and we have no fallback content
        }
    }

    renderFacebookFeed(posts, pageUrl = '') {
        const section = document.getElementById('facebook-feed');
        if (!section) return;

        const cards = Array.from(section.querySelectorAll('.facebook-post-card'));
        const pageLink = section.querySelector('.facebook-feed-cta');
        const normalizedPosts = Array.isArray(posts) ? posts.slice(0, cards.length) : [];

        if (!normalizedPosts.length) return;

        if (pageLink && pageUrl) {
            pageLink.href = pageUrl;
        }

        cards.forEach((card, index) => {
            const post = normalizedPosts[index];
            if (!post) {
                card.style.display = 'none';
                return;
            }

            card.style.display = '';

            if (post.link) {
                card.href = post.link;
            }

            const dateEl = card.querySelector('[data-content-key$=".date"]');
            const titleEl = card.querySelector('[data-content-key$=".title"]');
            const excerptEl = card.querySelector('[data-content-key$=".excerpt"]');
            const ctaEl = card.querySelector('[data-content-key$=".cta"]');
            const imageEl = card.querySelector('.facebook-post-image');
            const imageWrap = card.querySelector('.facebook-post-image-wrap');

            if (dateEl && post.date) dateEl.textContent = post.date;
            if (titleEl && post.title) titleEl.textContent = post.title;
            if (excerptEl && post.excerpt) excerptEl.textContent = post.excerpt;
            if (ctaEl && post.cta) ctaEl.textContent = post.cta;

            if (imageEl) {
                const fallbackSrc = imageEl.getAttribute('data-fallback-src') || '';
                const liveImage = typeof post.image === 'string' ? post.image.trim() : '';
                const effectiveImage = liveImage || fallbackSrc;

                if (effectiveImage) {
                    if (imageEl.getAttribute('src') !== effectiveImage) {
                        imageEl.setAttribute('src', effectiveImage);
                    }
                    imageWrap?.classList.remove('is-empty');
                } else {
                    imageEl.removeAttribute('src');
                    imageWrap?.classList.add('is-empty');
                }
            }
        });
    }

    bindEventModalTriggers(root) {
        const triggers = root.querySelectorAll('.event-modal-trigger');
        if (!triggers.length) return;

        triggers.forEach(trigger => {
            trigger.addEventListener('click', () => {
                const key = trigger.getAttribute('data-event-key');
                const event = this.eventCache?.get(key);
                if (event) {
                    this.openEventModal(event);
                }
            });
        });
    }

    openEventModal(event) {
        const modal = this.ensureEventModal();
        const titleEl = modal.querySelector('.event-modal-title');
        const dateEl = modal.querySelector('.event-modal-date');
        const timeEl = modal.querySelector('.event-modal-time');
        const locationEl = modal.querySelector('.event-modal-location');
        const descEl = modal.querySelector('.event-modal-description');
        const imageEl = modal.querySelector('.event-modal-image');
        const imageWrap = modal.querySelector('.event-modal-image-wrap');

        const startValue = event.start || event.date;
        const startDate = this.parseEventDate(startValue);
        const hasTime = this.eventHasTime(startValue);

        const lang = document.documentElement.lang || 'no';
        const locale = lang === 'en' ? 'en-US' : (lang === 'es' ? 'es-ES' : 'nb-NO');

        const dateLabel = startDate
            ? startDate.toLocaleDateString(locale, { day: '2-digit', month: 'long', year: 'numeric' })
            : this.getTranslation('loading');
        const timeLabel = startDate && hasTime
            ? startDate.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
            : this.getTranslation('location_not_set');

        titleEl.textContent = event.title || 'Arrangement';
        dateEl.innerHTML = `<i class="far fa-calendar-alt"></i> ${dateLabel}`;
        timeEl.innerHTML = `<i class="far fa-clock"></i> ${timeLabel}`;
        locationEl.innerHTML = `<i class="fas fa-map-marker-alt"></i> ${event.location || 'Sted ikke satt'}`;

        // Handle both Google Calendar 'description' and Firebase 'content'
        const contentData = event.content || event.description || '';
        let finalHtml = '';

        if (typeof contentData === 'object' && contentData.blocks) {
            finalHtml = this.parseBlocks(contentData);
        } else {
            finalHtml = this.sanitizeEventHtml(contentData);
        }

        if (finalHtml) {
            descEl.innerHTML = finalHtml;
        } else {
            descEl.textContent = 'Beskrivelse kommer.';
        }

        const imageSrc = this._getEventImage(event);
        imageEl.src = imageSrc;
        imageEl.alt = event.title || 'Arrangement';
        imageWrap.classList.remove('cms-hidden');

        const videoLink = this.extractVideoLink(event);
        const videoLinkEl = modal.querySelector('.event-modal-video-link');

        if (videoLink && videoLinkEl) {
            videoLinkEl.innerHTML = `
                <a href="${videoLink}" target="_blank" rel="noopener noreferrer" class="btn btn-primary event-modal-video-cta">
                    <i class="fas fa-video"></i>
                    Bli med på nettmøtet
                </a>
            `;
            videoLinkEl.classList.remove('cms-hidden');
        } else if (videoLinkEl) {
            videoLinkEl.innerHTML = '';
            videoLinkEl.classList.add('cms-hidden');
        }

        modal.classList.add('active');
    }

    ensureEventModal() {
        let overlay = document.querySelector('.event-modal-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'event-modal-overlay';
            overlay.innerHTML = `
                <div class="event-modal">
                    <div class="event-modal-image-wrap cms-hidden">
                        <img class="event-modal-image" alt="">
                    </div>
                    <div class="event-modal-header">
                        <h3 class="event-modal-title"></h3>
                        <button type="button" class="event-modal-close" aria-label="Lukk">&times;</button>
                    </div>
                    <div class="event-modal-body">
                        <div class="event-modal-left">
                            <div class="event-modal-meta">
                                <span class="event-modal-date"></span>
                                <span class="event-modal-time"></span>
                                <span class="event-modal-location"></span>
                            </div>
                            <div class="event-modal-video-link cms-hidden"></div>
                        </div>
                        <div class="event-modal-right">
                            <h4 class="event-modal-section-title">Mer om arrangement</h4>
                            <p class="event-modal-description"></p>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);

            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    overlay.classList.remove('active');
                }
            });

            const closeBtn = overlay.querySelector('.event-modal-close');
            closeBtn.addEventListener('click', () => {
                overlay.classList.remove('active');
            });
        }

        const body = overlay.querySelector('.event-modal-body');
        if (body && !body.querySelector('.event-modal-left')) {
            body.innerHTML = `
                <div class="event-modal-left">
                    <div class="event-modal-meta">
                        <span class="event-modal-date"></span>
                        <span class="event-modal-time"></span>
                        <span class="event-modal-location"></span>
                    </div>
                    <div class="event-modal-video-link cms-hidden"></div>
                </div>
                <div class="event-modal-right">
                    <h4 class="event-modal-section-title">Mer om arrangement</h4>
                    <p class="event-modal-description"></p>
                </div>
            `;
        }
        return overlay;
    }

    sanitizeEventHtml(value) {
        if (!value) return '';

        // Handle potential object values to prevent [object Object] rendering
        if (typeof value === 'object') {
            if (value.html) return this.sanitizeEventHtml(value.html);
            if (value.text) return this.sanitizeEventHtml(value.text);
            if (value.content && typeof value.content === 'string') return this.sanitizeEventHtml(value.content);
            return ''; // Hide objects that aren't strings or handled formats
        }

        let safe = String(value);
        safe = safe.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '');
        safe = safe.replace(/\son\w+="[^"]*"/gi, '');
        safe = safe.replace(/\son\w+='[^']*'/gi, '');

        const hasTags = /<[^>]+>/.test(safe);
        if (!hasTags) {
            safe = safe.replace(/\n/g, '<br>');
        }

        return safe.trim();
    }

    parseEventDate(value) {
        if (!value) return null;

        // Handle Firebase Timestamp objects
        if (value && typeof value === 'object' && typeof value.toDate === 'function') {
            return value.toDate();
        }

        // Handle Firestore-like timestamp objects {seconds, nanoseconds}
        if (value && typeof value === 'object' && typeof value.seconds === 'number') {
            return new Date(value.seconds * 1000);
        }

        if (value instanceof Date) {
            return Number.isNaN(value.getTime()) ? null : value;
        }

        if (typeof value === 'string') {
            const trimmed = value.trim();

            // Handle d.m.yyyy or dd.mm.yyyy (with optional time) - more flexible regex
            const dmY = trimmed.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})(?:\s+(\d{1,2}):(\d{1,2}))?$/);
            if (dmY) {
                const day = Number(dmY[1]);
                const month = Number(dmY[2]) - 1;
                const year = Number(dmY[3]);
                const hour = dmY[4] ? Number(dmY[4]) : 0;
                const minute = dmY[5] ? Number(dmY[5]) : 0;
                const safe = new Date(year, month, day, hour, minute);
                return Number.isNaN(safe.getTime()) ? null : safe;
            }

            // Handle ISO date (YYYY-MM-DD) with optional time
            const isoDate = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2}))?/);
            if (isoDate) {
                const year = Number(isoDate[1]);
                const month = Number(isoDate[2]) - 1;
                const day = Number(isoDate[3]);
                const hour = isoDate[4] ? Number(isoDate[4]) : 0;
                const minute = isoDate[5] ? Number(isoDate[5]) : 0;
                const safe = new Date(year, month, day, hour, minute);
                return Number.isNaN(safe.getTime()) ? null : safe;
            }
        }

        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    }

    isEventPast(event) {
        const startValue = event.end || event.start || event.date;
        const endDate = this.parseEventDate(startValue);
        if (!endDate) return false;

        const now = new Date();

        // If it's a date-only string (no time set), treat it as an all-day event
        // and only count it as "past" once the day is completely over.
        if (!this.eventHasTime(startValue)) {
            const endOfDay = new Date(endDate);
            endOfDay.setHours(23, 59, 59, 999);
            return endOfDay < now;
        }

        return endDate < now;
    }

    eventHasTime(value) {
        if (!value || typeof value !== 'string') return false;
        return /T\d{2}:\d{2}/.test(value) || /\d{2}:\d{2}/.test(value);
    }

    getMonthRangeIso(date) {
        const year = date.getFullYear();
        const month = date.getMonth();
        const start = new Date(year, month, 1, 0, 0, 0);
        // Fetch 12 months ahead to populate agenda with future events
        const end = new Date(year, month + 12, 0, 23, 59, 59, 999);
        return {
            startIso: start.toISOString(),
            endIso: end.toISOString()
        };
    }

    /**
     * Norwegian public holidays & key Christian holy days for a given year.
     * Returned as event-objekter som kalenderen kan vise direkte.
     */
    getNorwegianHolidays(year) {
        const holidays = [];
        if (!year || Number.isNaN(year)) return holidays;

        const formatLocalIsoDate = (dateValue) => {
            const year = dateValue.getFullYear();
            const month = String(dateValue.getMonth() + 1).padStart(2, '0');
            const day = String(dateValue.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        const addHoliday = (date, title) => {
            if (!(date instanceof Date) || Number.isNaN(date.getTime())) return;
            const dayOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
            const isoDate = formatLocalIsoDate(dayOnly);
            holidays.push({
                id: `holiday - ${isoDate} -${title} `,
                title,
                description: 'Helligdag / kristen høytid',
                start: isoDate,
                end: isoDate,
                location: 'Norge',
                isHoliday: true,
                sourceId: 'holiday',
                sourceLabel: 'Helligdager'
            });
        };

        // Fixed-date helligdager
        addHoliday(new Date(year, 0, 1), '1. nyttårsdag');
        addHoliday(new Date(year, 4, 1), 'Arbeidernes dag');
        addHoliday(new Date(year, 4, 17), 'Grunnlovsdagen');
        addHoliday(new Date(year, 11, 25), '1. juledag');
        addHoliday(new Date(year, 11, 26), '2. juledag');

        // Bevegelige kristne høytider basert på påskedag
        const easterSunday = this.calculateEasterSunday(year);
        if (easterSunday) {
            const offsetDays = (base, days) => {
                const d = new Date(base);
                d.setDate(d.getDate() + days);
                return d;
            };

            // Palmesøndag (-7), Skjærtorsdag (-3), Langfredag (-2), 1. og 2. påskedag
            addHoliday(offsetDays(easterSunday, -7), 'Palmesøndag');
            addHoliday(offsetDays(easterSunday, -3), 'Skjærtorsdag');
            addHoliday(offsetDays(easterSunday, -2), 'Langfredag');
            addHoliday(easterSunday, '1. påskedag');
            addHoliday(offsetDays(easterSunday, 1), '2. påskedag');

            // Kristi himmelfartsdag (39 dager etter påskedag)
            addHoliday(offsetDays(easterSunday, 39), 'Kristi himmelfartsdag');

            // 1. og 2. pinsedag (49 og 50 dager etter påskedag)
            addHoliday(offsetDays(easterSunday, 49), '1. pinsedag');
            addHoliday(offsetDays(easterSunday, 50), '2. pinsedag');
        }

        return holidays;
    }

    /**
     * Beregn dato for 1. påskedag (vestlig kirke) med gregoriansk algoritme.
     */
    calculateEasterSunday(year) {
        if (!year || Number.isNaN(year)) return null;
        const a = year % 19;
        const b = Math.floor(year / 100);
        const c = year % 100;
        const d = Math.floor(b / 4);
        const e = b % 4;
        const f = Math.floor((b + 8) / 25);
        const g = Math.floor((b - f + 1) / 3);
        const h = (19 * a + b - d - g + 15) % 30;
        const i = Math.floor(c / 4);
        const k = c % 4;
        const l = (32 + 2 * e + 2 * i - h - k) % 7;
        const m = Math.floor((a + 11 * h + 22 * l) / 451);
        const month = Math.floor((h + l - 7 * m + 114) / 31) - 1; // 0=Jan
        const day = ((h + l - 7 * m + 114) % 31) + 1;
        return new Date(year, month, day);
    }



    /**
     * Update DOM elements based on Firestore data
     * @param {object} data 
     */
    updateDOM(data, { docId = this.pageId } = {}) {
        if (!data) return;

        if (docId) {
            window.HKM_CONTENT_DOCS = window.HKM_CONTENT_DOCS || {};
            window.HKM_CONTENT_DOCS[docId] = data;
        }
        if (docId === this.pageId && this.pageId) {
            window.HKM_PAGE_CONTENT = window.HKM_PAGE_CONTENT || {};
            window.HKM_PAGE_CONTENT[this.pageId] = data;
        }
        if (docId === this.pageId && this.pageId === 'butikk') {
            window.HKM_STORE_CONTENT = data;
        }
        try {
            document.dispatchEvent(new CustomEvent('hkm:page-content-updated', {
                detail: { pageId: this.pageId, docId, data }
            }));
        } catch (_) { }

        // Skip updateDOM for translated pages (EN/ES) to preserve HTML translations
        const lang = document.documentElement.lang || 'no';
        if (lang !== 'no') {
            console.log('[ContentManager] Skipping updateDOM for translated page:', lang);
            return;
        }

        // Find all elements with data-content-key
        const elements = document.querySelectorAll("[data-content-key]");

        elements.forEach(el => {
            const targetDoc = el.getAttribute('data-content-doc');
            if (targetDoc && targetDoc !== docId) return;

            const key = el.getAttribute("data-content-key");
            const value = this.getValueByPath(data, key);
            if (value === undefined) return;

            const contentAttr = el.getAttribute('data-content-attr');
            if (contentAttr) {
                const visibilityTargetSelector = el.getAttribute('data-visibility-target');
                const visibilityTarget = visibilityTargetSelector ? el.closest(visibilityTargetSelector) : null;
                const fallbackSrc = el.getAttribute('data-fallback-src') || '';
                contentAttr
                    .split(',')
                    .map(attr => attr.trim())
                    .filter(Boolean)
                    .forEach(attr => {
                        if (attr === 'src' && el.tagName === 'IMG') {
                            const imageValue = typeof value === 'string' ? value.trim() : '';
                            const effectiveImage = imageValue || fallbackSrc;
                            el.onerror = () => {
                                const currentFallback = el.getAttribute('data-fallback-src') || '';
                                const currentSrc = el.getAttribute('src') || '';
                                if (currentFallback && currentSrc !== currentFallback) {
                                    el.setAttribute('src', currentFallback);
                                    if (visibilityTarget) visibilityTarget.classList.remove('is-empty');
                                    return;
                                }
                                el.removeAttribute('src');
                                if (visibilityTarget) visibilityTarget.classList.add('is-empty');
                            };
                            if (!effectiveImage) {
                                el.removeAttribute('src');
                                if (visibilityTarget) visibilityTarget.classList.add('is-empty');
                                return;
                            }
                            if (el.getAttribute('src') !== effectiveImage) {
                                el.setAttribute('src', effectiveImage);
                            }
                            if (visibilityTarget) visibilityTarget.classList.remove('is-empty');
                            return;
                        }
                        el.setAttribute(attr, String(value));
                    });
                return;
            }

            // Images kan trygt oppdateres direkte
            if (el.tagName === "IMG") {
                if (el.src !== value) {
                    el.src = value;
                }
                return;
            }

            // Inputs/textareaer brukes enkelte steder for placeholder-tekster
            if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
                if (el.hasAttribute("placeholder")) {
                    el.placeholder = String(value);
                } else if (typeof el.value === "string") {
                    el.value = String(value);
                }
                return;
            }

            // HERO IMAGE & TEXT SYNC (unified, strict separation)
            const isHeroSection = el.classList.contains('page-hero') || el.classList.contains('hero-section');
            const isBgKey = key === "hero.backgroundImage" || key === "hero.bg" || key.endsWith(".backgroundImage") || key.endsWith(".bg");
            const isHeroTitle = el.classList.contains('page-hero-title') || el.classList.contains('hero-title') || el.classList.contains('page-title');
            const isHeroSubtitle = el.classList.contains('page-hero-subtitle') || el.classList.contains('hero-subtitle');

            // Strict: Only set background image for hero section, never as text
            if (isHeroSection && isBgKey) {
                const defaultBg = {
                    'blogg': "https://images.unsplash.com/photo-1499750310159-5b600aaf0320?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80",
                    'bnn': "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80",
                    'om-oss': "https://images.unsplash.com/photo-1529070538774-1843cb3265df?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80",
                    'for-menigheter': "https://images.unsplash.com/photo-1499750310159-5b600aaf0320?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=1080",
                    'for-bedrifter': "https://images.unsplash.com/photo-1499750310159-5b600aaf0320?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=1080"
                }[this.pageId] || "https://images.unsplash.com/photo-1499750310159-5b600aaf0320?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80";
                const bgUrl = value || defaultBg;
                const heroEl = document.querySelector('.page-hero') || document.querySelector('.hero-section') || el;
                if (heroEl) {
                    heroEl.style.transition = 'background-image 0.7s cubic-bezier(0.4,0,0.2,1)';
                    heroEl.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url('${bgUrl}')`;
                }
                return;
            }
            // Strict: Only set hero title as text, never an image URL
            if (isHeroTitle) {
                if (typeof value === 'string' && value.startsWith('http')) {
                    // If value is a URL, fallback to default title
                    const fallbackTitle = {
                        'blogg': 'Blogg & nyheter',
                        'bnn': 'Business Network',
                        'om-oss': 'Om Oss',
                        'for-menigheter': 'For menigheter',
                        'for-bedrifter': 'For bedrifter'
                    }[this.pageId] || 'Tittel';
                    el.textContent = fallbackTitle;
                } else {
                    el.textContent = value || {
                        'blogg': 'Blogg & nyheter',
                        'bnn': 'Business Network',
                        'om-oss': 'Om Oss',
                        'for-menigheter': 'For menigheter',
                        'for-bedrifter': 'For bedrifter'
                    }[this.pageId] || 'Tittel';
                }
                return;
            }
            // Strict: Only set hero subtitle as text
            if (isHeroSubtitle) {
                el.textContent = value || '';
                return;
            }

            // Default text update (never allow image URL as text)
            if (typeof value === 'string' && value.startsWith('http')) return;

            const newText = String(value).trim();
            const currentText = (el.textContent || "").trim();

            // Specific handling for funfact counters
            if (el.classList.contains('funfact-number')) {
                const parsedNum = parseInt(newText) || 0;
                if (parsedNum > 0) {
                    el.setAttribute('data-target', String(parsedNum));
                    // If animation already happened, update text too
                    if (el.getAttribute('data-animated') === 'true' || currentText === '0' || currentText === 'NaN') {
                        el.textContent = parsedNum;
                    }
                }
                return;
            }

            if (currentText !== newText) {
                el.textContent = value;
            }
        });
    }

    /**
     * Apply global branding and typography
     */
    applyGlobalSettings(data) {
        if (!data || typeof data !== 'object') return;

        const normalizeHex = (value) => {
            if (typeof value !== 'string') return '';
            let raw = value.trim();
            if (!raw) return '';
            if (!raw.startsWith('#')) raw = `#${raw}`;
            if (/^#([0-9a-f]{3})$/i.test(raw)) {
                const short = raw.slice(1);
                return `#${short.split('').map((c) => c + c).join('').toUpperCase()}`;
            }
            if (/^#([0-9a-f]{6})$/i.test(raw)) return raw.toUpperCase();
            return '';
        };

        const setColorVar = (cssVar, value) => {
            const safeHex = normalizeHex(value);
            if (safeHex) {
                document.documentElement.style.setProperty(cssVar, safeHex);
            }
        };

        if (data.logoUrl) {
            const logos = document.querySelectorAll('.logo img');
            logos.forEach(img => img.src = data.logoUrl);
        }
        if (data.logoText) {
            const logoTextEls = document.querySelectorAll('.logo span');
            logoTextEls.forEach(span => {
                span.textContent = data.logoText;
            });
        }
        if (data.faviconUrl) {
            let favicon = document.querySelector('link[rel="icon"]');
            if (!favicon) {
                favicon = document.createElement('link');
                favicon.rel = 'icon';
                document.head.appendChild(favicon);
            }
            favicon.href = data.faviconUrl;
        }
        if (data.siteTitle && this.pageId === 'index') {
            document.title = data.siteTitle;
        }

        // Apply Typography
        if (data.mainFont) {
            document.body.style.fontFamily = `'${data.mainFont}', sans-serif`;
            if (!document.getElementById('google-font-injection')) {
                const link = document.createElement('link');
                link.id = 'google-font-injection';
                link.href = `https://fonts.googleapis.com/css2?family=${data.mainFont.replace(/ /g, '+')}:wght@300;400;500;600;700&display=swap`;
                link.rel = 'stylesheet';
                document.head.appendChild(link);
            }
        }
        // Font size variables for global CSS
        if (data.fontSizeBase) {
            document.documentElement.style.setProperty('--fs-body', `${data.fontSizeBase}px`);
        }
        if (data.fontSizeH1Desktop) {
            document.documentElement.style.setProperty('--fs-h1-desktop', `${data.fontSizeH1Desktop}px`);
        }
        if (data.fontSizeH1Mobile) {
            document.documentElement.style.setProperty('--fs-h1-mobile', `${data.fontSizeH1Mobile}px`);
        }
        if (data.fontSizeH2Desktop) {
            document.documentElement.style.setProperty('--fs-h2-desktop', `${data.fontSizeH2Desktop}px`);
        }
        if (data.fontSizeH2Mobile) {
            document.documentElement.style.setProperty('--fs-h2-mobile', `${data.fontSizeH2Mobile}px`);
        }
        setColorVar('--primary-color', data.primaryColor);
        setColorVar('--secondary-color', data.secondaryColor);
        setColorVar('--bg-light', data.backgroundColor || data.bgLightColor || data.bgLight);
        setColorVar('--bg-white', data.surfaceColor || data.bgWhiteColor || data.bgWhite);
        setColorVar('--text-dark', data.textColor || data.textDarkColor || data.textDark);
        setColorVar('--text-light', data.textLightColor || data.accentColor || data.textMutedColor || data.textLight);
        setColorVar('--accent-color', data.accentColor || data.textLightColor);
    }

    /**
     * Apply SEO settings to the page head
     */
    applySEO(data, itemOverride = null) {
        const pageId = this.pageId;
        const pageSEO = (data.pages && data.pages[pageId]) || {};

        // 1. Page Title
        let title = itemOverride?.title || pageSEO.title || data.globalTitle || document.title;
        document.title = title;

        // 2. Meta Tags (Description, Keywords)
        const desc = itemOverride?.description || pageSEO.description || data.globalDescription || '';
        this.updateMetaTag('description', desc);
        this.updateMetaTag('keywords', data.globalKeywords || '');

        // 3. GEO Tags
        const geoPos = itemOverride?.geoPosition || pageSEO.geoPosition || data.geoPosition || '';
        const geoPlace = pageSEO.geoPlacename || data.geoPlacename || '';
        const geoRegion = data.geoRegion || '';

        if (geoPos) this.updateMetaTag('geo.position', geoPos);
        if (geoPlace) this.updateMetaTag('geo.placename', geoPlace);
        if (geoRegion) this.updateMetaTag('geo.region', geoRegion);
        if (geoPos) this.updateMetaTag('ICBM', geoPos);

        // 4. Open Graph (og:title, og:description, og:image)
        this.updateMetaTag('og:title', title, 'property');
        this.updateMetaTag('og:description', desc, 'property');
        if (data.ogImage) {
            this.updateMetaTag('og:image', data.ogImage, 'property');
        }

        // 5. Twitter Card
        this.updateMetaTag('twitter:card', 'summary_large_image');
        this.updateMetaTag('twitter:title', title);
        this.updateMetaTag('twitter:description', desc);
        if (data.ogImage) {
            this.updateMetaTag('twitter:image', data.ogImage);
        }
    }

    updateMetaTag(name, content, attr = 'name') {
        if (!content) return;
        let tag = document.querySelector(`meta[${attr}="${name}"]`);
        if (!tag) {
            tag = document.createElement('meta');
            tag.setAttribute(attr, name);
            document.head.appendChild(tag);
        }
        tag.setAttribute('content', content);
    }

    /**
     * Dynamically render Hero Slides
     */
    renderHeroSlides(slides) {
        // Skip slider modifications for translated pages (EN/ES)
        const lang = document.documentElement.lang || 'no';
        if (lang !== 'no') {
            console.log('[ContentManager] Skipping renderHeroSlides for translated page:', lang);
            return;
        }

        const sliderContainer = document.querySelector('.slider-container');
        if (!sliderContainer) return;

        if (slides && slides.length > 0) {
            const normalizedIncomingSlides = slides.map(slide => ({
                title: (slide.title || '').trim(),
                subtitle: (slide.subtitle || '').trim(),
                imageUrl: (slide.imageUrl || '').trim(),
                btnText: (slide.btnText || '').trim(),
                btnLink: (slide.btnLink || '').trim()
            }));
            const incomingSignature = JSON.stringify(normalizedIncomingSlides);
            if (this._renderHtmlSignatures.get('__hero-slides-data') === incomingSignature) {
                return;
            }

            // Extract current data from DOM for comparison to avoid flicker if same
            const currentSlides = Array.from(sliderContainer.querySelectorAll('.hero-slide')).map(s => ({
                title: s.querySelector('.hero-title')?.textContent?.trim() || '',
                subtitle: s.querySelector('.hero-subtitle')?.textContent?.trim() || '',
                imageUrl: (s.querySelector('.hero-bg')?.style.backgroundImage || '').replace(/url\(["']?(.*?)["']?\)/, '$1') || '',
                btnText: s.querySelector('.btn')?.textContent?.trim() || '',
                btnLink: s.querySelector('.btn')?.getAttribute('href') || ''
            }));

            // Compare incoming slides data with what is currently in the DOM
            const isDifferent = slides.length !== currentSlides.length || slides.some((slide, i) => {
                const current = currentSlides[i];
                if (!current) return true;

                const title = (slide.title || '').trim();
                const subtitle = (slide.subtitle || '').trim();
                const btnText = (slide.btnText || '').trim();
                const btnLink = (slide.btnLink || '').trim();

                // Advanced URL comparison: strip quotes and normalize protocol
                const clean = (url) => (url || '').replace(/['"]/g, '').replace(/^https?:/, '').trim();
                const currentImg = clean(current.imageUrl);
                const incomingImg = clean(slide.imageUrl);

                return title !== current.title ||
                    subtitle !== current.subtitle ||
                    currentImg !== incomingImg ||
                    btnText !== current.btnText ||
                    btnLink !== current.btnLink;
            });

            if (isDifferent) {
                console.log("[ContentManager] Hero content changed or updated from dashboard, re-rendering...");
                document.body.classList.remove('hero-animate');

                const heroMarkup = slides.map((slide, index) => `
                    <div class="hero-slide ${index === 0 ? 'active' : ''}">
                        <div class="hero-bg" style="background-image: url('${slide.imageUrl}')"></div>
                        <div class="container hero-container">
                            <div class="hero-content">
                                <h1 class="hero-title">${slide.title}</h1>
                                <p class="hero-subtitle">${slide.subtitle}</p>
                                ${slide.btnText ? `
                                    <div class="slide-buttons">
                                        <a href="${slide.btnLink}" class="btn btn-primary">${slide.btnText}</a>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                `).join('');

                this.setHTMLIfChanged(sliderContainer, heroMarkup, '__hero-slides-html');
                this._renderHtmlSignatures.set('__hero-slides-data', incomingSignature);

                // Re-init HeroSlider from script.js
                if (window.heroSlider) {
                    window.heroSlider.stopAutoPlay();
                    window.heroSlider.slides = document.querySelectorAll('.hero-slide');
                    window.heroSlider.currentIndex = 0;
                    window.heroSlider.startAutoPlay();
                }

                this.enableHeroAnimations();
            } else {
                this._renderHtmlSignatures.set('__hero-slides-data', incomingSignature);
                console.log("[ContentManager] Hero content matches DOM, skipping re-render to prevent flicker.");
            }
        }
    }

    enableHeroAnimations() {
        if (this.pageId !== 'index') return;
        document.body.classList.add('hero-animate');
    }

    /**
     * Dynamically render Blog Posts
     */
    renderBlogPosts(posts, selector) {
        const container = document.querySelector(selector);
        if (!container) return;

        const localizedPosts = this.localizeBlogItems(posts);
        const renderPosts = localizedPosts.length > 0 ? localizedPosts : (Array.isArray(posts) ? posts : []);
        if (renderPosts.length > 0) {
            const html = renderPosts.map(post => {
                const stableId = post.__stableId || this.getContentItemStableId(post);
                return `
                <article class="blog-card">
                    <div class="blog-image">
                        <img src="${post.imageUrl || 'https://via.placeholder.com/600x400?text=Ingen+bilde'}" alt="${post.title}">
                        ${post.category ? `<span class="blog-category cms-blog-category-badge">${post.category}</span>` : ''}
                    </div>
                    <div class="blog-content cms-blog-content">
                        <div class="blog-meta cms-blog-meta">
                            ${post.date ? `<span><i class="fas fa-calendar-alt"></i> ${this.formatDate(post.date)}</span>` : ''}
                            ${post.author ? `<span><i class="fas fa-user"></i> ${post.author}</span>` : '<span><i class="fas fa-user"></i> Admin</span>'}
                        </div>
                        ${post.tags && Array.isArray(post.tags) && post.tags.length > 0 ? `
                        <div class="blog-tags cms-blog-tags">
                            ${post.tags.map(tag => `<span class="cms-blog-tag-pill">#${tag}</span>`).join('')}
                        </div>
                        ` : ''}
                        <h3 class="blog-title cms-blog-title">${post.title}</h3>
                        <p class="blog-excerpt cms-blog-excerpt">${this.generateExcerpt(post.content, post.title)}...</p>
                        <a href="${this.getLocalizedLink('blogg-post.html')}?id=${encodeURIComponent(stableId)}" class="blog-link cms-blog-link">${this.getTranslation('read_more')} <i class="fas fa-arrow-right cms-blog-link-icon"></i></a>
                    </div>
                </article>
            `;
            }).join('');

            this.setHTMLIfChanged(container, html, `blog:${selector}`);
        }
    }

    /**
     * Dynamically render Teaching Series
     */
    renderTeachingSeries(series, selector) {
        const container = document.querySelector(selector);
        if (!container) return;

        if (series.length > 0) {
            const html = series.map(item => `
                <a href="${this.getLocalizedLink('blogg-post.html')}?id=${encodeURIComponent(item.id || item.title)}" class="media-card cms-media-card-link">
                    <div class="media-thumbnail">
                        <img src="${item.imageUrl || 'https://via.placeholder.com/600x400?text=Ingen+bilde'}" alt="${item.title}">
                        <div class="media-play-button">
                            <i class="fas fa-chalkboard-teacher"></i>
                        </div>
                        ${item.category ? `<span class="media-duration cms-media-duration-badge">${item.category}</span>` : ''}
                    </div>
                    <div class="media-content">
                        <h3 class="media-title">${item.title}</h3>
                        <p class="media-description">${this.generateExcerpt(item.content, item.title)}...</p>
                        <div class="media-meta cms-media-meta">
                            <span class="cms-media-meta-item"><i class="fas fa-user"></i> ${item.author || 'His Kingdom'}</span>
                            <span class="cms-media-meta-item"><i class="fas fa-calendar"></i> ${item.date ? this.formatDate(item.date) : ''}</span>
                        </div>
                    </div>
                </a>
            `).join('');

            this.setHTMLIfChanged(container, html, `teaching:${selector}`);
        }
    }

    async renderEventDetailsPage() {
        const urlParams = new URLSearchParams(window.location.search);
        const eventKey = urlParams.get('id');

        if (!eventKey) {
            const container = document.querySelector('.event-main-content');
            if (container) container.innerHTML = '<p>Arrangementet ble ikke funnet.</p>';
            return;
        }

        // 1. Check localStorage CACHE first for instant render
        let event = null;
        try {
            // Try to find in ANY cached month range
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key.startsWith('hkm_events_')) {
                    const { events } = JSON.parse(localStorage.getItem(key));
                    const found = events.find(e => this.getEventKey(e) === eventKey || encodeURIComponent(this.getEventKey(e)) === eventKey);
                    if (found) {
                        event = found;
                        this.populateEventDetailsDOM(event);
                        break;
                    }
                }
            }
        } catch (e) { }

        // 2. Initial fetch (Cached if 15m TTL)
        const allEvents = await this.loadEvents();
        const foundInCurrent = allEvents.find(e => this.getEventKey(e) === eventKey || encodeURIComponent(this.getEventKey(e)) === eventKey);

        if (foundInCurrent) {
            event = foundInCurrent;
            this.populateEventDetailsDOM(event);
        }

        // 3. Background Sync for specific event (Google Calendar direct)
        // This ensures the page is always up to date even if cache is stale or event range is outside standard load
        const integrations = await window.firebaseService.getPageContent('settings_integrations');
        const gcal = integrations?.googleCalendar || {};
        const apiKey = gcal.apiKey;
        if (apiKey) {
            const calendarList = Array.isArray(integrations?.googleCalendars) ? integrations.googleCalendars : [];
            const calendars = calendarList.length > 0 ? calendarList : (gcal.calendarId ? [{ id: gcal.calendarId }] : []);

            // Try to find by ID specifically
            for (const calendar of calendars) {
                // If eventKey is a valid GCal ID (no pipe), fetch it directly
                if (!eventKey.includes('|')) {
                    const freshEvent = await this.fetchSingleGoogleCalendarEvent(apiKey, calendar.id, eventKey);
                    if (freshEvent) {
                        // Load Firestore items to ensure overrides (images and text from dashboard) are applied
                        const eventData = await window.firebaseService.getPageContent('collection_events');
                        const firebaseItems = Array.isArray(eventData) ? eventData : (eventData?.items || []);
                        event = this._mergeEventWithFirestore(freshEvent, firebaseItems);
                        this.populateEventDetailsDOM(event);
                        break;
                    }
                }
            }
        }

        if (!event) {
            const container = document.querySelector('.event-main-content');
            if (container) container.innerHTML = '<div class="alert alert-info">Fant ikke arrangementet eller det har passert datoen for visning.</div>';

            const titleEl = document.querySelector('.page-title');
            if (titleEl && titleEl.textContent === 'Laster...') titleEl.textContent = 'Fant ikke arrangement';

            const breadcrumbEl = document.querySelector('.breadcrumbs span:last-child');
            if (breadcrumbEl) breadcrumbEl.textContent = 'Ikke funnet';

            // Hide sidebar placeholders
            const sidebar = document.querySelector('.event-sidebar');
            if (sidebar) sidebar.style.display = 'none';
        }
    }

    /**
     * Helper to get translated strings based on current page language.
     */
    getTranslation(key) {
        const lang = document.documentElement.lang || 'no';
        const strings = {
            'no': {
                'loading': 'Laster...',
                'loading_recent': 'Laster nylige...',
                'no_events': 'Ingen andre arrangementer.',
                'not_found': 'Arrangementet ble ikke funnet.',
                'location_not_set': 'Sted ikke oppgitt',
                'no_description': 'Ingen beskrivelse tilgjengelig.',
                'read_more': 'Les mer',
                'reading_time': 'min lesing',
                'views': 'visninger'
            },
            'en': {
                'loading': 'Loading...',
                'loading_recent': 'Loading recent...',
                'no_events': 'No other events.',
                'not_found': 'Event not found.',
                'location_not_set': 'Location not specified',
                'no_description': 'No description available.',
                'read_more': 'Read more',
                'reading_time': 'min read',
                'views': 'views'
            },
            'es': {
                'loading': 'Cargando...',
                'loading_recent': 'Cargando recientes...',
                'no_events': 'No hay otros eventos.',
                'not_found': 'Evento no encontrado.',
                'location_not_set': 'Ubicación no especificada',
                'no_description': 'No hay descripción disponible.',
                'read_more': 'Leer más',
                'reading_time': 'min lectura',
                'views': 'vistas'
            }
        };
        return (strings[lang] && strings[lang][key]) || strings['no'][key] || key;
    }

    populateEventDetailsDOM(event) {
        if (!event) return;

        const lang = document.documentElement.lang || 'no';
        const locale = lang === 'en' ? 'en-US' : (lang === 'es' ? 'es-ES' : 'nb-NO');

        const heroTitleEl = document.getElementById('hero-title');
        const titleEl = document.getElementById('event-title');
        const breadcrumbEl = document.getElementById('breadcrumb-current');
        const imgEl = document.getElementById('event-hero-image');
        const descEl = document.getElementById('event-description');
        const timeEl = document.getElementById('event-time');
        const locEl = document.getElementById('event-location');

        const startValue = event.start || event.date;
        const startDate = this.parseEventDate(startValue);
        const hasTime = this.eventHasTime(startValue);

        if (heroTitleEl) heroTitleEl.textContent = event.title;
        if (titleEl) titleEl.textContent = event.title;
        if (breadcrumbEl) breadcrumbEl.textContent = event.title;

        const imageUrl = this._getEventImage(event);
        if (imgEl && imageUrl) {
            // Hide image until loaded
            imgEl.style.opacity = '0';
            imgEl.style.visibility = 'hidden';
            imgEl.classList.remove('fade-in');
            // Preload image
            const tempImg = new window.Image();
            tempImg.onload = function () {
                imgEl.src = imageUrl;
                imgEl.style.visibility = 'visible';
                imgEl.style.opacity = '1';
                imgEl.classList.add('fade-in');

                // Also update Hero Background when image is ready
                const pageHero = document.querySelector('.page-hero');
                if (pageHero) {
                    pageHero.style.backgroundImage = `linear-gradient(rgba(0, 0, 0, 0.45), rgba(0, 0, 0, 0.45)), url('${imageUrl}')`;
                }
            };
            tempImg.onerror = function () {
                imgEl.src = '../img/placeholder-event.jpg';
                imgEl.style.visibility = 'visible';
                imgEl.style.opacity = '1';
                imgEl.classList.add('fade-in');
            };
            tempImg.src = imageUrl;
        }

        // Description
        const rawDescription = event.description || event.content || '';
        if (descEl) {
            const html = this.sanitizeEventHtml(rawDescription) || `<p>${this.getTranslation('no_description')}</p>`;
            descEl.innerHTML = html;
        }

        // Meta Info (Date/Time)
        if (timeEl && startDate) {
            const dateStr = startDate.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
            let formattedTime = dateStr;

            if (hasTime) {
                const startTime = startDate.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
                const atPrefix = lang === 'en' ? 'at' : (lang === 'es' ? 'a las' : 'kl.');
                formattedTime += `, ${atPrefix} ${startTime}`;
            }
            timeEl.textContent = formattedTime;
        }

        // Location Info
        if (locEl) {
            locEl.textContent = event.location || this.getTranslation('location_not_set');
        }

        // Sidebar: Recent Events
        this.populateSidebarRecentEvents();
    }

    async populateSidebarRecentEvents() {
        const sidebarContainer = document.getElementById('recent-events-sidebar');
        if (!sidebarContainer) return;

        const lang = document.documentElement.lang || 'no';
        const locale = lang === 'en' ? 'en-US' : (lang === 'es' ? 'es-ES' : 'nb-NO');

        let detailsPage = 'arrangement-detaljer.html';
        if (lang === 'en') detailsPage = 'event-details.html';
        if (lang === 'es') detailsPage = 'detalles-evento.html';

        // Get a few upcoming events (excluding current)
        const allEvents = await this.loadEvents();
        const urlParams = new URLSearchParams(window.location.search);
        const currentId = urlParams.get('id');

        const others = allEvents
            .filter(e => this.getEventKey(e) !== currentId)
            .slice(0, 3);

        if (others.length === 0) {
            sidebarContainer.innerHTML = `<p>${this.getTranslation('no_events')}</p>`;
            return;
        }

        sidebarContainer.innerHTML = others.map(event => {
            const key = this.getEventKey(event);
            const img = this._getEventImage(event);
            const date = this.parseEventDate(event.start || event.date);
            const dateStr = date ? date.toLocaleDateString(locale, { day: 'numeric', month: 'short' }) : '';

            return `
                <div class="recent-event-item">
                    <img src="${img}" alt="${event.title}" class="recent-event-img">
                    <div class="recent-event-info">
                        <h4><a href="${this.getLocalizedLink('arrangement-detaljer.html')}?id=${key}">${event.title}</a></h4>
                        <span class="recent-event-date">${dateStr}</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * Extract video conference link from event
     * @param {object} event
     * @returns {string|null}
     */
    extractVideoLink(event) {
        // 1. Check for Google Meet hangoutLink
        if (event.hangoutLink) {
            return event.hangoutLink;
        }

        // 2. Check for conferenceData
        if (event.conferenceData && event.conferenceData.entryPoints) {
            const videoEntry = event.conferenceData.entryPoints.find(e => e.entryPointType === 'video');
            if (videoEntry && videoEntry.uri) {
                return videoEntry.uri;
            }
        }

        // 3. Parse description for common video links
        const description = event.description || event.content || '';
        const urlPatterns = [
            /https?:\/\/[\w-]*\.?zoom\.us\/j\/[\w?=-]+/gi,
            /https?:\/\/meet\.google\.com\/[\w-]+/gi,
            /https?:\/\/teams\.microsoft\.com\/l\/meetup-join\/[\w\/%?=.-]+/gi,
            /https?:\/\/[\w.-]*webex\.com\/[\w\/\?=-]+/gi,
            /https?:\/\/meet\.jit\.si\/[\w-]+/gi
        ];

        for (const pattern of urlPatterns) {
            const match = description.match(pattern);
            if (match) {
                return match[0];
            }
        }

        // 4. Check for explicit videoLink or meetingLink field
        if (event.videoLink) return event.videoLink;
        if (event.meetingLink) return event.meetingLink;

        return null;
    }

    stripHtml(html) {
        if (!html) return "";
        // Replace HTML tags with spaces to prevent word concatenation
        let text = String(html).replace(/<[^>]+>/g, ' ');
        // Clean up multiple spaces
        text = text.replace(/\s+/g, ' ').trim();
        return text;
    }

    /**
     * Generate a clean excerpt from blog content, excluding the title
     * @param {string|object} content - Blog content (HTML string or Editor.js JSON)
     * @param {string} title - Blog post title to exclude from excerpt
     * @returns {string} - Clean excerpt text (max 120 chars)
     */
    generateExcerpt(content, title) {
        if (!content) return "";

        let html = '';

        // Handle Legacy HTML (string)
        if (typeof content === 'string') {
            html = content;
        }
        // Handle Editor.js JSON - exclude header blocks to prevent title in excerpt
        else if (typeof content === 'object' && content.blocks) {
            html = content.blocks
                .filter(block => block.type !== 'header')
                .map(block => {
                    switch (block.type) {
                        case 'paragraph':
                            return `<p>${block.data.text}</p>`;
                        case 'list':
                            const listTag = block.data.style === 'ordered' ? 'ol' : 'ul';
                            const items = block.data.items.map(item => `<li>${item}</li>`).join('');
                            return `<${listTag}>${items}</${listTag}>`;
                        default:
                            return '';
                    }
                }).join('');
        } else {
            html = this.parseBlocks(content) || '';
        }

        // Strip HTML tags with proper spacing
        let text = this.stripHtml(html);

        // Additional safety: remove title from beginning if it still appears
        if (title) {
            const titleTrimmed = title.trim();
            const textTrimmed = text.trim();

            if (textTrimmed.toLowerCase().startsWith(titleTrimmed.toLowerCase())) {
                text = textTrimmed.substring(titleTrimmed.length).trim();
            } else {
                text = textTrimmed;
            }
        }

        // Truncate to 120 characters
        return text.substring(0, 120);
    }

    /**
     * Generate a relevant image URL from Unsplash based on event title
     * @param {string} title - Event title
     * @returns {string} - Unsplash image URL
     */
    // --- Editor.js Helper ---
    parseBlocks(content) {
        if (!content) return '';

        // Handle Legacy HTML (string)
        if (typeof content === 'string') {
            return content;
        }

        // Handle Editor.js JSON
        if (typeof content === 'object' && content.blocks) {
            return content.blocks.map(block => {
                switch (block.type) {
                    case 'header':
                        return `<h${block.data.level} class="block-header">${block.data.text}</h${block.data.level}>`;
                    case 'paragraph':
                        return `<p class="block-paragraph">${block.data.text}</p>`;
                    case 'list':
                        const listTag = block.data.style === 'ordered' ? 'ol' : 'ul';
                        const items = block.data.items.map(item => `<li>${item}</li>`).join('');
                        return `<${listTag} class="block-list">${items}</${listTag}>`;
                    case 'image':
                        const caption = block.data.caption ? `<figcaption>${block.data.caption}</figcaption>` : '';
                        const classes = [
                            'block-image',
                            block.data.withBorder ? 'with-border' : '',
                            block.data.withBackground ? 'with-background' : '',
                            block.data.stretched ? 'stretched' : ''
                        ].join(' ');
                        return `<figure class="${classes}"><img src="${block.data.file.url}" alt="${block.data.caption || ''}">${caption}</figure>`;
                    case 'quote':
                        return `<blockquote class="block-quote"><p>${block.data.text}</p><cite>${block.data.caption}</cite></blockquote>`;
                    case 'delimiter':
                        return `<div class="block-delimiter">***</div>`;
                    case 'youtubeVideo': {
                        const ytUrl = block.data?.url || '';
                        const ytMatch = ytUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
                        const ytId = ytMatch ? ytMatch[1] : null;
                        if (!ytId) return '';
                        return `
                            <div class="block-embed-wrapper cms-yt-embed-wrapper">
                                <div class="block-embed cms-yt-embed">
                                    <iframe
                                        src="https://www.youtube.com/embed/${ytId}"
                                        frameborder="0"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowfullscreen
                                        class="cms-yt-embed-frame">
                                    </iframe>
                                </div>
                            </div>
                        `;
                    }
                    case 'embed': // Keep for backward compatibility
                    case 'video': // Legacy key
                        return `
                            <div class="block-embed-wrapper">
                                <div class="block-embed">
                                    <iframe src="${block.data.embed}" width="${block.data.width}" height="${block.data.height}" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>
                                </div>
                                ${block.data.caption ? `<div class="block-embed-caption">${block.data.caption}</div>` : ''}
                            </div>
                        `;
                    default:
                        return '';
                }
            }).join('');
        }

        return '';
    }

    generateEventImage(title) {
        // High-quality curated images from Unsplash for different event types
        const imageLibrary = {
            'prayer': 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&h=600&fit=crop&q=80',
            'worship': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=600&fit=crop&q=80',
            'conference': 'https://images.unsplash.com/photo-1516738901171-8eb4fc13bd20?w=800&h=600&fit=crop&q=80',
            'teaching': 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800&h=600&fit=crop&q=80',
            'bible': 'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=800&h=600&fit=crop&q=80',
            'youth': 'https://images.unsplash.com/photo-1529070538774-1843cb3265df?w=800&h=600&fit=crop&q=80',
            'children': 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=800&h=600&fit=crop&q=80',
            'family': 'https://images.unsplash.com/photo-1511895426328-dc8714191300?w=800&h=600&fit=crop&q=80',
            'easter': 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=800&h=600&fit=crop&q=80',
            'christmas': 'https://images.unsplash.com/photo-1482517967863-00e15c9b44be?w=800&h=600&fit=crop&q=80',
            'concert': 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800&h=600&fit=crop&q=80',
            'meeting': 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=800&h=600&fit=crop&q=80',
            'gathering': 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=800&h=600&fit=crop&q=80',
            'community': 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=800&h=600&fit=crop&q=80',
            'default': 'https://images.unsplash.com/photo-1438232992991-995b7058bbb3?w=800&h=600&fit=crop&q=80'
        };

        if (!title) return imageLibrary.default;

        // Extract keywords from title (remove common Norwegian words)
        const commonWords = ['og', 'i', 'på', 'til', 'med', 'for', 'en', 'et', 'den', 'det', 'er', 'som', 'av', 'om', 'dette', 'var'];
        const titleLower = title.toLowerCase();

        // Map Norwegian keywords to image categories
        const keywordMap = {
            'bønn': 'prayer',
            'bønnemøte': 'prayer',
            'gudstjeneste': 'worship',
            'seminar': 'conference',
            'konferanse': 'conference',
            'undervisning': 'teaching',
            'bibel': 'bible',
            'bibelstudium': 'bible',
            'ung': 'youth',
            'ungdom': 'youth',
            'barn': 'children',
            'barnetreff': 'children',
            'familie': 'family',
            'påske': 'easter',
            'jul': 'christmas',
            'konsert': 'concert',
            'lovsang': 'worship',
            'tilbedelse': 'worship',
            'møte': 'meeting',
            'samling': 'gathering',
            'fellesskap': 'community',
            'test': 'meeting'
        };

        // Find matching keyword
        for (const [norwegianWord, category] of Object.entries(keywordMap)) {
            if (titleLower.includes(norwegianWord)) {
                return imageLibrary[category] || imageLibrary.default;
            }
        }

        return imageLibrary.default;
    }

    _getEventImage(event) {
        if (!event) return this.generateEventImage('default');
        return event.dashboardImage || event.imageUrl || event.image || event.imageLink || this.generateEventImage(event.title);
    }

    _mergeEventWithFirestore(gEvent, firebaseItems) {
        if (!firebaseItems || !Array.isArray(firebaseItems)) return gEvent;

        const override = firebaseItems.find(fEvent =>
            (fEvent.gcalId && fEvent.gcalId === gEvent.id) ||
            (fEvent.title === gEvent.title && this.isSameDay(this.parseEventDate(fEvent.date), this.parseEventDate(gEvent.start)))
        );

        if (override) {
            // Apply overrides while preserving GCal source identity where needed
            return {
                ...gEvent,
                ...override,
                // Specifically ensure these fields from Firestore are used if they exist
                title: override.title || gEvent.title,
                description: override.content || override.description || gEvent.description,
                imageUrl: override.dashboardImage || override.imageUrl || gEvent.imageUrl,
                sourceId: gEvent.sourceId || override.sourceId
            };
        }
        return gEvent;
    }

    formatDate(dateStr) {
        if (!dateStr) return '';
        try {
            const d = new Date(dateStr);
            return d.toLocaleDateString('no-NO', { day: 'numeric', month: 'long', year: 'numeric' });
        } catch (e) {
            return dateStr;
        }
    }

    isSameDay(d1, d2) {
        if (!d1 || !d2) return false;
        return d1.getFullYear() === d2.getFullYear() &&
            d1.getMonth() === d2.getMonth() &&
            d1.getDate() === d2.getDate();
    }

    /**
     * Helper to get nested object values
     * @param {object} obj 
     * @param {string} path - e.g. "hero.title"
     */
    getValueByPath(obj, path) {
        return path.split('.').reduce((prev, curr) => {
            return prev ? prev[curr] : undefined;
        }, obj);
    }
}

// Initialize on load
function startContentManager() {
    if (!window.contentManager) {
        window.contentManager = new ContentManager();
    }
}

if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', startContentManager);
} else {
    startContentManager();
}
