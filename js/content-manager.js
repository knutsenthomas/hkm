// ===================================
// Public Content Manager (Global version)
// ===================================

import { InteractionsManager } from './interactions.js';


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

        this.ensureResponsiveHeroTitleStyles();

        this.init();
        this.agendaMonthsToShow = 1;
    }

    ensureResponsiveHeroTitleStyles() {
        if (typeof document === 'undefined') return;
        if (document.getElementById('hkm-hero-title-responsive-style')) return;

        const styleEl = document.createElement('style');
        styleEl.id = 'hkm-hero-title-responsive-style';
        styleEl.textContent = `
            .page-hero .page-hero-title,
            .page-hero .hero-title {
                font-size: clamp(2rem, 4.6vw, 3rem) !important;
                line-height: 1.12 !important;
            }

            @media (max-width: 1024px) {
                .page-hero .page-hero-title,
                .page-hero .hero-title {
                    font-size: clamp(1.85rem, 5.6vw, 2.55rem) !important;
                }
            }

            @media (max-width: 768px) {
                .page-hero .page-hero-title,
                .page-hero .hero-title {
                    font-size: clamp(1.55rem, 7.3vw, 2.15rem) !important;
                    max-width: 92vw !important;
                    margin-left: auto !important;
                    margin-right: auto !important;
                }
            }
        `;

        document.head.appendChild(styleEl);
    }

    detectPageId() {
        // Strip .html for cleanUrls support (Vercel/Firebase cleanUrls removes extension from pathname)
        const path = window.location.pathname.replace(/\.html$/, '').replace(/\/$/, '');
        const p = (s) => new RegExp('(?:^|/)' + s + '(?:/|$)').test(path);
        if (path === '' || path === '/' || /^\/(en|es)$/.test(path) || path.endsWith('/') || p('index')) return 'index';
        if (p('arrangementer') || p('events') || p('eventos')) return 'arrangementer';
        if (p('kalender') || p('calendar') || p('calendario')) return 'kalender';
        if (p('arrangement-detaljer') || p('event-details') || p('detalles-evento')) return 'arrangement-detaljer';
        if (p('blogg-post') || p('blog-post') || p('post-blog')) return 'blogg-post';
        if (p('blogg') || p('blog')) return 'blogg';
        if (p('butikk') || p('shop')) return 'butikk';
        if (p('undervisningsserier') || p('teaching') || p('ensenanza')) return 'undervisningsserier';
        if (p('media')) return 'media';
        if (p('om-oss') || p('about') || p('sobre-nosotros')) return 'om-oss';
        if (p('kontakt') || p('contact') || p('contacto')) return 'kontakt';
        if (p('donasjoner') || p('donations') || p('donaciones')) return 'donasjoner';
        if (p('for-menigheter') || p('for-churches') || p('para-iglesias')) return 'for-menigheter';
        if (p('for-bedrifter') || p('for-businesses') || p('para-empresas')) return 'for-bedrifter';
        if (p('bnn')) return 'bnn';
        if (p('youtube')) return 'youtube';
        if (p('podcast')) return 'podcast';
        if (p('undervisning')) return 'undervisning';
        if (p('seminarer')) return 'seminarer';
        return '';
    }

    getLocalizedLink(noFile) {
        const lang = this.getCurrentLanguage();
        const cleanNoFile = noFile.replace(/\.html$/, '');

        if (lang === 'no') return '/' + (cleanNoFile === 'index' ? '' : cleanNoFile);

        let mapped = cleanNoFile;
        if (window.i18n && typeof window.i18n.mapFileName === 'function') {
            mapped = window.i18n.mapFileName(cleanNoFile, lang);
        } else {
            const mappings = {
                'en': { 'blogg': 'blog', 'blogg-post': 'blog-post', 'om-oss': 'about', 'arrangementer': 'events' },
                'es': { 'blogg': 'blog', 'blogg-post': 'blog-post', 'om-oss': 'sobre-nosotros', 'arrangementer': 'eventos' }
            };
            mapped = (mappings[lang] && mappings[lang][cleanNoFile]) || cleanNoFile;
        }

        const safeMapped = mapped === 'index' ? '' : mapped;
        return `/${lang}/${safeMapped}`;
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
        return item.id
            || item._id
            || item.externalGuid
            || item.wixGuid
            || item.postId
            || item.legacyId
            || item.slug
            || item.title
            || '';
    }

    getContentItemLookupIds(item) {
        if (!item || typeof item !== 'object') return [];

        const rawValues = [
            this.getContentItemStableId(item),
            item.id,
            item.title,
            item.postID,
            item.referenceId,
            item.commentResourceId,
            item.commentContextId,
            item.guid,
            item.legacyId,
            item.slug,
            item.url,
            item.link,
            item.title
        ];

        const ids = new Set();
        rawValues.forEach((value) => {
            if (value === null || value === undefined) return;
            const str = String(value).trim();
            if (!str) return;
            ids.add(str);
            ids.add(encodeURIComponent(str));
            try {
                ids.add(decodeURIComponent(str));
            } catch (error) {
                // Keep going for malformed URI fragments.
            }
        });

        return Array.from(ids);
    }

    normalizeLookupToken(value) {
        if (value === null || value === undefined) return '';
        return String(value)
            .trim()
            .toLowerCase()
            .replace(/^\/+|\/+$/g, '');
    }

    extractIdFromLinkValue(value) {
        if (typeof value !== 'string' || !value.trim()) return '';
        const raw = value.trim();

        const pickFromSearch = (searchParams) => {
            if (!searchParams || typeof searchParams.get !== 'function') return '';
            const keys = ['id', 'postId', 'postid', 'blogId', 'blogid'];
            for (const key of keys) {
                const found = searchParams.get(key);
                if (found && String(found).trim()) return String(found).trim();
            }
            return '';
        };

        try {
            const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://example.local${raw.startsWith('/') ? '' : '/'}${raw}`;
            const parsed = new URL(withScheme);
            const idFromQuery = pickFromSearch(parsed.searchParams);
            if (idFromQuery && idFromQuery.trim()) return idFromQuery.trim();

            const pathSegments = parsed.pathname.split('/').filter(Boolean);
            if (pathSegments.length > 0) {
                return pathSegments[pathSegments.length - 1].trim();
            }
        } catch (error) {
            // Fall through to regex parsing for non-standard strings.
        }

        const queryMatch = raw.match(/[?&](?:id|postId|postid|blogId|blogid)=([^&#]+)/i);
        if (queryMatch && queryMatch[1]) {
            return queryMatch[1].trim();
        }

        const pathMatch = raw.match(/\/([^/?#]+)(?:[?#]|$)/);
        if (pathMatch && pathMatch[1]) {
            return pathMatch[1].trim();
        }

        return '';
    }

    normalizeBlogKeyValue(value) {
        if (typeof value !== 'string') return '';
        return value
            .toLowerCase()
            .trim()
            .replace(/\s+/g, ' ');
    }

    getBlogUrlPath(value) {
        if (typeof value !== 'string' || !value.trim()) return '';

        try {
            const raw = value.trim();
            const normalizedUrl = /^https?:\/\//i.test(raw) ? raw : `https://${raw.replace(/^\/+/, '')}`;
            const urlObj = new URL(normalizedUrl);
            return (urlObj.pathname || '').replace(/\/+$/, '').toLowerCase();
        } catch (error) {
            return value
                .trim()
                .replace(/^https?:\/\/[^/]+/i, '')
                .replace(/[?#].*$/, '')
                .replace(/\/+$/, '')
                .toLowerCase();
        }
    }

    buildBlogCanonicalKey(item, index = 0) {
        if (!item || typeof item !== 'object') return `fallback:${index}`;

        const title = this.normalizeBlogKeyValue(item.title || '');
        
        // Fix for specific duplicate post and general safety for long titles
        if (title && (title.includes('hvordan leve et liv i tjeneste') || title.length > 15)) {
            return `title:${title}`;
        }

        return `id:${item.id || ''}`;

        const urlPath = this.getBlogUrlPath(item.url || item.link || '');
        if (urlPath) return `url:${urlPath}`;

        const slug = this.normalizeBlogKeyValue(item.slug || '');
        if (slug) return `slug:${slug}`;

        const date = typeof item.date === 'string' ? item.date.slice(0, 10) : '';
        if (title && date) return `title-date:${title}:${date}`;
        if (title) return `title:${title}`;

        const stableId = this.normalizeBlogKeyValue(this.getContentItemStableId(item));
        if (stableId) return `stable:${stableId}`;

        return `fallback:${index}`;
    }

    mergeDuplicateBlogItems(existingItem, nextItem) {
        if (!existingItem) return nextItem;
        if (!nextItem) return existingItem;

        // --- Priority Rule 1: Dashboard-edited content always wins over legacy/sync content ---
        if (nextItem.dashboardEdited && !existingItem.dashboardEdited) return nextItem;
        if (existingItem.dashboardEdited && !nextItem.dashboardEdited) return existingItem;

        // --- Priority Rule 2: Most recent dashboard edit wins ---
        if (nextItem.dashboardEdited && existingItem.dashboardEdited) {
            const nextTime = new Date(nextItem.dashboardEditedAt || 0).getTime();
            const existingTime = new Date(existingItem.dashboardEditedAt || 0).getTime();
            return nextTime >= existingTime ? nextItem : existingItem;
        }

        // --- Fallback: Score-based logic for legacy items ---
        const existingContent = typeof existingItem.content === 'string' ? existingItem.content.trim() : '';
        const nextContent = typeof nextItem.content === 'string' ? nextItem.content.trim() : '';
        const existingExcerpt = typeof existingItem.excerpt === 'string' ? existingItem.excerpt.trim() : '';
        const nextExcerpt = typeof nextItem.excerpt === 'string' ? nextItem.excerpt.trim() : '';

        const existingScore = existingContent.length + Math.min(existingExcerpt.length, 240) + (existingItem.imageUrl ? 80 : 0);
        const nextScore = nextContent.length + Math.min(nextExcerpt.length, 240) + (nextItem.imageUrl ? 80 : 0);

        const preferred = nextScore >= existingScore ? nextItem : existingItem;
        const fallback = preferred === nextItem ? existingItem : nextItem;

        return {
            ...fallback,
            ...preferred,
            content: preferred.content || fallback.content || '',
            excerpt: preferred.excerpt || fallback.excerpt || '',
            imageUrl: preferred.imageUrl || fallback.imageUrl || '',
        };
    }

    dedupeBlogItems(items) {
        const list = Array.isArray(items) ? items : [];
        const merged = new Map();

        list.forEach((item, index) => {
            const key = this.buildBlogCanonicalKey(item, index);
            const existing = merged.get(key);
            merged.set(key, this.mergeDuplicateBlogItems(existing, item));
        });

        return Array.from(merged.values());
    }

    getDedupedBlogItems(data) {
        return this.dedupeBlogItems(this.getCollectionItems(data));
    }

    extractContentText(value) {
        if (typeof value === 'string') return value;
        if (!value || typeof value !== 'object') return '';
        if (Array.isArray(value.blocks)) {
            return value.blocks.map((block) => {
                const data = block && typeof block === 'object' ? block.data : null;
                if (!data || typeof data !== 'object') return '';
                if (typeof data.text === 'string') return data.text;
                if (Array.isArray(data.items)) return data.items.join(' ');
                return '';
            }).join(' ');
        }
        if (typeof value.text === 'string') return value.text;
        if (typeof value.content === 'string') return value.content;
        return '';
    }

    hasTranslationServiceWarning(value) {
        const text = this.extractContentText(value).toUpperCase();
        if (!text) return false;
        return text.includes('MYMEMORY WARNING')
            || text.includes('YOU USED ALL AVAILABLE FREE TRANSLATIONS')
            || text.includes('TRANSLATED.NET/DOC/USAGELIMITS');
    }

    isUsableLocalizedString(value) {
        return typeof value === 'string'
            && value.trim()
            && !this.hasTranslationServiceWarning(value);
    }

    isUsableLocalizedContent(value) {
        if (typeof value === 'string') {
            return this.isUsableLocalizedString(value);
        }
        if (value && typeof value === 'object' && Array.isArray(value.blocks) && value.blocks.length > 0) {
            return !this.hasTranslationServiceWarning(value);
        }
        return false;
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
            title: this.isUsableLocalizedString(localized.title) ? localized.title : item.title,
            content: this.isUsableLocalizedContent(localized.content) ? localized.content : item.content,
            category: this.isUsableLocalizedString(localized.category) ? localized.category : item.category,
            seoTitle: this.isUsableLocalizedString(localized.seoTitle) ? localized.seoTitle : item.seoTitle,
            seoDescription: this.isUsableLocalizedString(localized.seoDescription) ? localized.seoDescription : item.seoDescription,
            tags: Array.isArray(localized.tags) && localized.tags.length ? localized.tags : item.tags,
            __stableId: this.getContentItemStableId(item)
        };
    }

    hasUsableLocalizedTranslation(item, lang = this.getCurrentLanguage()) {
        if (!item || typeof item !== 'object' || lang === 'no') return true;

        const translations = (item.translations && typeof item.translations === 'object')
            ? item.translations
            : null;
        const localized = (translations && translations[lang] && typeof translations[lang] === 'object')
            ? translations[lang]
            : null;

        if (!localized) return false;

        return this.isUsableLocalizedString(localized.title)
            || this.isUsableLocalizedContent(localized.content)
            || this.isUsableLocalizedString(localized.category)
            || this.isUsableLocalizedString(localized.seoTitle)
            || this.isUsableLocalizedString(localized.seoDescription);
    }

    localizeBlogItems(items) {
        const lang = this.getCurrentLanguage();
        try {
            const list = Array.isArray(items) ? items : [];
            const filtered = lang === 'no'
                ? list
                : list.filter((item) => this.hasUsableLocalizedTranslation(item, lang));
            return filtered.map((item) => this.getLocalizedContentItem(item, lang));
        } catch (error) {
            console.warn('[ContentManager] localizeBlogItems fallback to source language', error);
            return Array.isArray(items) ? items : [];
        }
    }

    findContentItemById(items, itemId) {
        if (!Array.isArray(items) || !itemId) return null;
        const targetRaw = String(itemId).trim();
        if (!targetRaw) return null;

        const targetIdFromLink = this.extractIdFromLinkValue(targetRaw);

        const targetVariants = new Set([
            targetRaw,
            encodeURIComponent(targetRaw),
            targetIdFromLink
        ].filter(Boolean));
        try {
            targetVariants.add(decodeURIComponent(targetRaw));
        } catch (error) {
            // Ignore invalid URI sequences.
        }
        if (targetIdFromLink) {
            try {
                targetVariants.add(decodeURIComponent(targetIdFromLink));
            } catch (error) {
                // Ignore invalid URI sequences.
            }
        }

        const normalizedTargets = Array.from(targetVariants)
            .map((value) => this.normalizeLookupToken(value))
            .filter(Boolean);

        return items.find((item) => {
            const candidates = this.getContentItemLookupIds(item);
            const linkIdCandidates = [item?.url, item?.link]
                .map((value) => this.extractIdFromLinkValue(value))
                .filter(Boolean);
            const allCandidates = [...candidates, ...linkIdCandidates];

            const hasExact = allCandidates.some((candidate) => targetVariants.has(candidate));
            if (hasExact) return true;

            const normalizedCandidates = allCandidates
                .map((candidate) => this.normalizeLookupToken(candidate))
                .filter(Boolean);

            return normalizedCandidates.some((candidate) =>
                normalizedTargets.some((target) =>
                    candidate === target
                    || (target.length >= 8 && candidate.includes(target))
                    || (candidate.length >= 8 && target.includes(candidate))
                )
            );
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
        const canReadPublicContent = service
            && typeof service.canReadPublicContent === 'function'
            && service.canReadPublicContent();

        if (!service || (!service.isInitialized && !canReadPublicContent) || typeof service.getPageContent !== 'function') {
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
        const canReadPublicContent = service
            && typeof service.canReadPublicContent === 'function'
            && service.canReadPublicContent();
        if (!service || (!service.isInitialized && !canReadPublicContent) || typeof service.getPageContent !== 'function') return {};

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
        const canReadPublicContent = () => Boolean(
            window.firebaseService
            && typeof window.firebaseService.canReadPublicContent === 'function'
            && window.firebaseService.canReadPublicContent()
        );
        if (!service || (!service.isInitialized && !canReadPublicContent())) {
            // Wait for firebase module (increased timeout to 4s total)
            let count = 0;
            while (
                (!window.firebaseService || (!window.firebaseService.isInitialized && !canReadPublicContent()))
                && count < 80
            ) {
                await new Promise(r => setTimeout(r, 50));
                count++;
            }
        }

        service = window.firebaseService;
        try {
            if (!service || (!service.isInitialized && !canReadPublicContent())) {
                console.warn("⚠️ Firebase failed to initialize in time (4s). Content may be limited.");
            }

            // 1. Parallel Initial Load (Firestore defaults to cache if enabled)
            const docIds = [this.pageId, 'settings_design', 'settings_seo', 'settings_global'];
            if (this.pageId === 'index') {
                docIds.push('settings_facebook_feed');
            }
            const docs = service && (service.isInitialized || canReadPublicContent())
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
                ...this.getDedupedBlogItems(blogData),
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

            const blogItems = this.getDedupedBlogItems(blogData);
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
                    const eventsLink = this.getLocalizedLink('arrangementer');
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

                const blogItems = this.getDedupedBlogItems(blogData);
                const localizedBlogItems = this.localizeBlogItems(blogItems);
                console.log("[ContentManager] Parsed blog items:", blogItems);
                const currentLang = this.getCurrentLanguage();
                const postsToRender = currentLang === 'no'
                    ? (localizedBlogItems.length > 0 ? localizedBlogItems : blogItems)
                    : localizedBlogItems;

                if (postsToRender.length > 0) {
                    this.renderBlogPosts(postsToRender, '.blog-page .blog-grid');
                } else {
                    console.warn("[ContentManager] No blog posts found in 'collection_blog'.");
                    const container = document.querySelector('.blog-page .blog-grid');
                    if (container) {
                        const msg = currentLang === 'en'
                            ? 'No translated blog posts are available in English yet.'
                            : (currentLang === 'es'
                                ? 'Todavia no hay entradas de blog traducidas al espanol.'
                                : 'Ingen blogginnlegg funnet. Kjor seed-scriptet.');
                        container.innerHTML = `<p class="cms-empty-copy">${msg}</p>`;
                    }
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
            const link = cause.link || this.getLocalizedLink('donasjoner');

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

        const revealPostContainer = () => {
            const skeleton = document.getElementById('post-skeleton');
            if (skeleton) skeleton.style.display = 'none';
            container.style.display = 'block';
            if (!container.style.transition) {
                requestAnimationFrame(() => {
                    container.style.opacity = '0';
                    container.style.transition = 'opacity 0.4s ease';
                    requestAnimationFrame(() => { container.style.opacity = '1'; });
                });
            }
        };

        try {

        const urlParams = new URLSearchParams(window.location.search);
        const itemId = urlParams.get('id');

        if (!itemId) {
            container.innerHTML = '<p>Fant ikke innlegget.</p>';
            revealPostContainer();
            return;
        }

        console.log(`[ContentManager] Fetching data for single post (ID: ${itemId})...`);
        const blogData = await window.firebaseService.getPageContent('collection_blog');
        const teachingData = await window.firebaseService.getPageContent('collection_teaching');
        
        console.log(`[ContentManager] Data received. Blog items: ${blogData?.items?.length || 0}, Teaching items: ${teachingData?.items?.length || 0}`);
        const blogItems = this.getDedupedBlogItems(blogData);
        const teachingItems = this.getCollectionItems(teachingData);
        let blogItem = this.findContentItemById(blogItems, itemId);
        let teachingItem = this.findContentItemById(teachingItems, itemId);
        
        // Fallback: If not found in deduped items, check raw items
        if (!blogItem && blogData && Array.isArray(blogData.items)) {
            blogItem = this.findContentItemById(blogData.items, itemId);
        }
        if (!teachingItem && teachingData && Array.isArray(teachingData.items)) {
            teachingItem = this.findContentItemById(teachingData.items, itemId);
        }
        
        const sourceItem = blogItem || teachingItem;
        const item = sourceItem ? this.getLocalizedContentItem(sourceItem) : null;
        const isTeaching = !!teachingItem;
        const postId = sourceItem ? (sourceItem.__stableId || this.getContentItemStableId(sourceItem)) : null;

        if (!item) {
            const lang = this.getCurrentLanguage();
            const msg = lang === 'en' ? 'The content could not be found.' : (lang === 'es' ? 'No se pudo encontrar el contenido.' : 'Innholdet ble ikke funnet.');
            container.innerHTML = `<p>${msg}</p>`;
            revealPostContainer();
            return;
        }

        if (titleEl) titleEl.textContent = item.title || 'Blogginnlegg';
        if (breadcrumbEl) breadcrumbEl.textContent = item.title || 'Blogginnlegg';

        const authorEl = document.getElementById('single-post-author');
        if (authorEl) {
            const auth = item.author || sourceItem?.author || 'Ukjent forfatter';
            authorEl.textContent = auth;
        }

        // Populate author avatar in hero
        const avatarEl = document.getElementById('single-post-author-avatar');
        if (avatarEl) {
            // HKM Fix: Use actual author photo or a professional icon fallback
            let avatarUrl = item.authorPhoto || sourceItem?.authorPhoto;
            const authorName = item.author || sourceItem?.author || '';
            
            const renderAvatar = (url) => {
                const el = document.getElementById('single-post-author-avatar');
                if (!el) return;
                
                if (url && url !== 'img/author-placeholder.png') {
                    if (el.tagName === 'DIV') {
                        const img = document.createElement('img');
                        img.id = 'single-post-author-avatar';
                        img.className = el.className;
                        img.style.cssText = el.style.cssText;
                        img.src = url;
                        img.alt = `Forfatterens bilde: ${authorName}`;
                        el.replaceWith(img);
                    } else {
                        el.src = url;
                        el.alt = `Forfatterens bilde: ${authorName}`;
                        el.style.display = 'inline-block';
                    }
                } else if (el.tagName === 'IMG') {
                    // Fallback: Show a nice FontAwesome icon instead of a broken/wrong image
                    const iconContainer = document.createElement('div');
                    iconContainer.id = 'single-post-author-avatar';
                    // Copy styles from the original img for layout consistency
                    iconContainer.style.width = '40px';
                    iconContainer.style.height = '40px';
                    iconContainer.style.borderRadius = '50%';
                    iconContainer.style.backgroundColor = 'rgba(255,255,255,0.2)';
                    iconContainer.style.display = 'inline-flex';
                    iconContainer.style.alignItems = 'center';
                    iconContainer.style.justifyContent = 'center';
                    iconContainer.style.border = '2px solid rgba(255,255,255,0.7)';
                    iconContainer.style.flexShrink = '0';
                    iconContainer.style.color = 'white';
                    iconContainer.style.fontSize = '18px';
                    
                    iconContainer.innerHTML = '<i class="fas fa-user"></i>';
                    el.replaceWith(iconContainer);
                }
            };

            // First render whatever we have locally
            renderAvatar(avatarUrl);

            // Then asynchronously ask the Users database for the freshest picture!
            if (authorName && window.firebaseService && window.firebaseService.db) {
                window.firebaseService.db.collection('users')
                    .where('displayName', '==', authorName)
                    .limit(1)
                    .get()
                    .then(snap => {
                        if (!snap.empty) {
                            const latestPhoto = snap.docs[0].data().photoURL;
                            if (latestPhoto && latestPhoto !== avatarUrl) {
                                renderAvatar(latestPhoto);
                            }
                        }
                    })
                    .catch(err => {
                        console.warn('[ContentManager] Kunne ikke hente ferskt brukerbilde:', err);
                    });
            }
        }

        if (dateEl) {
            const dateStr = item.date ? this.formatDate(item.date) : '';
            dateEl.textContent = dateStr;
        }

        if (categoryEl) {
            const cat = item.category || item.teachingType || (isTeaching ? 'Undervisning' : 'Ukategorisert');
            categoryEl.innerHTML = cat ? `<i class="fas fa-tag"></i> ${cat}` : '';
        }

        const articleHtml = this.resolveArticleHtml(item, sourceItem);
        const heroImage = this.getContentItemImage(item, sourceItem, articleHtml);
        if (heroEl && heroImage) {
            heroEl.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url('${heroImage}')`;
            heroEl.style.backgroundSize = 'cover';
            heroEl.style.backgroundPosition = 'center center';
            heroEl.style.backgroundRepeat = 'no-repeat';
        }

        // --- Calculate Reading Time ---
        let readingTime = Number(item?.minutesToRead ?? sourceItem?.minutesToRead ?? 0);
        if (!(Number.isFinite(readingTime) && readingTime > 0) && articleHtml) {
            const textContent = this.stripHtml(articleHtml);
            const wordCount = textContent.split(/\s+/).filter(word => word.length > 0).length;
            readingTime = Math.max(1, Math.ceil(wordCount / 225)); // 225 words per minute
        }
        if (!(Number.isFinite(readingTime) && readingTime > 0)) {
            readingTime = 5;
        }

        const readingTimeEl = document.getElementById('single-post-readingtime');
        if (readingTimeEl) {
            const timeLabel = this.getTranslation('reading_time') || 'min lesing';
            readingTimeEl.textContent = `${readingTime} ${timeLabel}`;
            readingTimeEl.style.display = 'inline-block';
        }

        let viewsEl = document.getElementById('single-post-views');
        if (!viewsEl && document.querySelector('.blog-meta')) {
            viewsEl = document.createElement('span');
            viewsEl.id = 'single-post-views';
            if (readingTimeEl && readingTimeEl.parentNode) {
                readingTimeEl.parentNode.appendChild(viewsEl);
            } else {
                document.querySelector('.blog-meta').appendChild(viewsEl);
            }
        }

        const updateViewsUI = (localViews) => {
            if (!viewsEl) return;
            const viewCount = localViews;
            const viewsLabel = this.getTranslation('views') || 'visninger';
            viewsEl.innerHTML = `<i class="far fa-eye"></i> ${viewCount} ${viewsLabel}`;
            viewsEl.style.display = 'inline-block';
        };

        // Render initial view count
        updateViewsUI(0);

        if (postId && window.firebaseService && window.firebaseService.db && window.firebase && window.firebase.firestore) {
            (async () => {
                try {
                    const docRef = window.firebaseService.db.collection('blog_stats').doc(postId);
                    const docSnap = await Promise.race([
                        docRef.get(),
                        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
                    ]);
                    if (docSnap.exists && typeof docSnap.data().views !== 'undefined') {
                        const existingLocalViews = Number(docSnap.data().views);
                        const finalViews = Number.isFinite(existingLocalViews) ? Math.max(0, Math.floor(existingLocalViews)) + 1 : 1;
                        updateViewsUI(finalViews);
                    }
                    docRef.set({
                        views: window.firebase.firestore.FieldValue.increment(1)
                    }, { merge: true }).catch(err => {
                        console.warn('[ContentManager] Kunne ikke oppdatere visninger:', err);
                    });
                } catch (err) {
                    console.warn('[ContentManager] Feil ved henting av visninger:', err);
                }
            })();
        }

        if (container) {
            try {
                const finalHtml = this.cleanLegacyHtml(articleHtml);
                container.innerHTML = finalHtml || '<p>Dette innlegget har foreløpig ikke noe innhold.</p>';
            } catch (err) {
                console.error('[ContentManager] Render error:', err);
            }
        }

        // Reveal content


        // Hide skeleton, reveal real content with fade-in
        revealPostContainer();
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
            let heading = this.getTranslation('related_posts');
            let ctaLabel = this.getTranslation('read_more');

            if (isTeaching) {
                heading = this.getTranslation('related_teaching');
                ctaLabel = this.getTranslation('read_teaching');
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
                                        <img src="${this.getContentItemImage(post) || 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'}" 
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

        // --- Interactions (Likes & Comments) ---
        if (postId) {
            if (this._currentInteractionsManager) {
                this._currentInteractionsManager.cleanup();
            }
            this._currentInteractionsManager = new InteractionsManager('blog-interactions', postId);
        }
        } catch (error) {
            console.error('[ContentManager] renderSingleBlogPost failed:', error);
            container.innerHTML = '<p>Kunne ikke laste innlegget akkurat nå.</p>';
            revealPostContainer();
        }
    }

    async loadEvents(forceRefresh = false) {
        try {
            const { startIso, endIso } = this.getMonthRangeIso(this.currentDate);
            const cacheKey = `hkm_events_v2_${startIso}_${endIso}`;
            const isLocalDev = ['localhost', '127.0.0.1'].includes(String(window.location.hostname || '').toLowerCase());
            const integrations = await this.getContentDoc('settings_integrations', { silent: true }) || {};
            let finalEvents = [];

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
            const eventData = await this.getContentDoc('collection_events', { silent: true });
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

        // Only show immediately if we are NOT using live feed (showing static/cached content)
        if (!config.useLiveFeed) {
            section.style.display = '';
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

        // Ensure section is visible once we have data to render
        section.style.display = '';

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
                    'personvern': "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80",
                    'betingelser': "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80",
                    'tilgjengelighet': "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80",
                    'for-menigheter': "https://images.unsplash.com/photo-1499750310159-5b600aaf0320?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=1080",
                    'for-bedrifter': "https://images.unsplash.com/photo-1499750310159-5b600aaf0320?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=1080"
                }[this.pageId] || "https://images.unsplash.com/photo-1499750310159-5b600aaf0320?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80";
                const rawBg = typeof value === 'string' ? value.trim() : '';
                const isValidBgUrl = /^https?:\/\//i.test(rawBg) || rawBg.startsWith('/') || rawBg.startsWith('//');
                const bgUrl = isValidBgUrl ? rawBg : defaultBg;
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
                videoUrl: (slide.videoUrl || '').trim(),
                youtubeId: (slide.youtubeId || '').trim(),
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
                videoUrl: s.querySelector('.hero-video source')?.getAttribute('src') || '',
                youtubeId: s.querySelector('.hero-youtube-iframe')?.getAttribute('data-youtube-id') || '',
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

                const currentVideo = (current.videoUrl || '').trim();
                const incomingVideo = (slide.videoUrl || '').trim();
                const currentYoutube = (current.youtubeId || '').trim();
                const incomingYoutube = (slide.youtubeId || '').trim();

                return title !== current.title ||
                    subtitle !== current.subtitle ||
                    currentImg !== incomingImg ||
                    currentVideo !== incomingVideo ||
                    currentYoutube !== incomingYoutube ||
                    btnText !== current.btnText ||
                    btnLink !== current.btnLink;
            });

            if (isDifferent) {
                console.log("[ContentManager] Hero content changed or updated from dashboard, re-rendering...");
                document.body.classList.remove('hero-animate');

                const heroMarkup = slides.map((slide, index) => {
                    const videoUrl = (slide.videoUrl || '').trim();
                    const youtubeId = (slide.youtubeId || '').trim();
                    const hasYoutube = !!youtubeId;
                    const hasVideo = !!videoUrl && !hasYoutube;

                    const duration = slide.duration || 4;

                    return `
                    <div class="hero-slide ${index === 0 ? 'active' : ''}" data-duration="${duration}">
                        ${hasYoutube ? `
                            <div class="hero-video-wrapper">
                                <iframe 
                                    class="hero-youtube-iframe"
                                    data-youtube-id="${youtubeId}"
                                    src="https://www.youtube.com/embed/${youtubeId}?autoplay=${index === 0 ? 1 : 0}&mute=1&controls=0&loop=1&playlist=${youtubeId}&rel=0&showinfo=0&iv_load_policy=3&modestbranding=1&enablejsapi=1" 
                                    frameborder="0" 
                                    allow="autoplay; encrypted-media" 
                                    allowfullscreen
                                    style="position: absolute; top: 50%; left: 50%; width: 100vw; height: 56.25vw; min-height: 100vh; min-width: 177.77vh; transform: translate(-50%, -50%); pointer-events: none;">
                                </iframe>
                                <div class="hero-video-overlay" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.2);"></div>
                            </div>
                        ` : (hasVideo ? `
                            <video class="hero-video" ${index === 0 ? 'autoplay' : ''} muted loop playsinline poster="${slide.imageUrl}">
                                <source src="${videoUrl}" type="video/mp4">
                            </video>
                        ` : `
                            <div class="hero-bg" style="background-image: url('${slide.imageUrl}')"></div>
                        `)}
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
                `}).join('');

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
        if (!renderPosts.length) {
            const lang = this.getCurrentLanguage();
            const emptyMsg = lang === 'en'
                ? 'No translated blog posts are available in English yet.'
                : (lang === 'es'
                    ? 'Todavia no hay entradas de blog traducidas al espanol.'
                    : 'Ingen blogginnlegg tilgjengelig enda.');
            this.setHTMLIfChanged(container, `<p class="cms-empty-copy">${emptyMsg}</p>`, `blog-empty:${selector}`);
            return;
        }

        if (renderPosts.length > 0) {
            const html = renderPosts.map(post => {
                const stableId = post.__stableId || this.getContentItemStableId(post);
                const postImage = this.getContentItemImage(post) || 'https://via.placeholder.com/600x400?text=Ingen+bilde';
                return `
                <article class="blog-card">
                    <div class="blog-image">
                        <img src="${postImage}" alt="${post.title}">
                        ${post.category ? `<span class="blog-category cms-blog-category-badge">${post.category}</span>` : ''}
                    </div>
                    <div class="blog-content cms-blog-content">
                        <div class="blog-meta cms-blog-meta">
                            ${post.date ? `<span><i class="fas fa-calendar-alt"></i> ${this.formatDate(post.date)}</span>` : ''}
                            ${post.author ? `<span><i class="fas fa-user"></i> ${post.author}</span>` : '<span><i class="fas fa-user"></i> Admin</span>'}
                        </div>
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
            const html = series.map(item => {
                const itemImage = this.getContentItemImage(item) || 'https://via.placeholder.com/600x400?text=Ingen+bilde';
                return `
                <a href="${this.getLocalizedLink('blogg-post.html')}?id=${encodeURIComponent(item.id || item.title)}" class="media-card cms-media-card-link">
                    <div class="media-thumbnail">
                        <img src="${itemImage}" alt="${item.title}">
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
            `;
            }).join('');

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
                'views': 'visninger',
                'related_posts': 'Relaterte innlegg',
                'related_teaching': 'Relatert undervisning',
                'read_teaching': 'Les undervisning'
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
                'views': 'views',
                'related_posts': 'Related posts',
                'related_teaching': 'Related teaching',
                'read_teaching': 'Read teaching'
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
                'views': 'vistas',
                'related_posts': 'Entradas relacionadas',
                'related_teaching': 'Enseñanza relacionada',
                'read_teaching': 'Leer enseñanza'
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

    formatDate(date) {
        if (!date) return '';
        try {
            // Handle Firebase Timestamp objects or standard Date strings/objects
            const d = (date && typeof date.toDate === 'function') ? date.toDate() : new Date(date);
            if (isNaN(d.getTime())) return String(date);
            
            const lang = document.documentElement.lang || 'no';
            const locales = { 'no': 'nb-NO', 'en': 'en-US', 'es': 'es-ES' };
            const locale = locales[lang] || 'nb-NO';
            
            return d.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
        } catch (e) {
            console.warn('[ContentManager] formatDate error:', e);
            return String(date || '');
        }
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

    formatEditorListItem(item) {
        if (item === null || item === undefined) return '';

        const raw = String(item).trim();
        if (!raw) return '';

        if (/<[^>]+>/.test(raw)) {
            return `<li>${raw}</li>`;
        }

        const compact = raw.replace(/\s+/g, ' ').trim();

        const splitJoinedListItem = (value) => {
            if (typeof value !== 'string' || value.length < 18) return null;

            for (let i = 2; i < value.length - 12; i += 1) {
                const prev = value[i - 1];
                const curr = value[i];
                if (!prev || !curr) continue;

                const isLowerToUpper = /[a-zæøå]/.test(prev) && /[A-ZÆØÅ]/.test(curr);
                if (!isLowerToUpper) continue;

                const lead = value.slice(0, i).trim();
                const tail = value.slice(i).trim();
                const leadWordCount = lead.split(/\s+/).filter(Boolean).length;

                if (lead.length < 4 || lead.length > 56) continue;
                if (leadWordCount < 2 || leadWordCount > 7) continue;
                if (tail.length < 12) continue;

                return { lead, tail };
            }

            return null;
        };

        const split = splitJoinedListItem(compact);
        if (split) {
            return `<li><strong>${this.escapeHtml(split.lead)}</strong> ${this.escapeHtml(split.tail)}</li>`;
        }

        return `<li>${this.escapeHtml(compact)}</li>`;
    }

    isMeaningfulHtml(html) {
        if (typeof html !== 'string') return false;

        const trimmed = html.trim();
        if (!trimmed) return false;

        const textLength = this.stripHtml(trimmed).replace(/\s+/g, ' ').trim().length;
        if (textLength >= 24) return true;

        return /<(p|h[1-6]|ul|ol|li|blockquote|figure|img|iframe|video)\b/i.test(trimmed);
    }


    getElementPlainText(el) {
        return (el && el.textContent ? el.textContent : '').replace(/\s+/g, ' ').trim();
    }

    isParagraphElement(el) {
        return el && el.nodeType === 1 && el.tagName && el.tagName.toLowerCase() === 'p';
    }

    isBoldLeadParagraph(el) {
        if (!this.isParagraphElement(el)) return false;
        const text = this.getElementPlainText(el);
        if (!text || text.length > 90) return false;
        const strong = el.querySelector('strong, b');
        if (!strong) return false;
        const strongText = this.getElementPlainText(strong);
        return strongText && text.startsWith(strongText);
    }



    resolveArticleHtml(item, sourceItem) {
        const candidates = [
            item?.content,
            sourceItem?.content,
            item?.contentHtml,
            sourceItem?.contentHtml,
            item?.html,
            sourceItem?.html,
            item?.body,
            sourceItem?.body,
            item?.contentText,
            sourceItem?.contentText
        ];

        for (const candidate of candidates) {
            const parsed = this.parseBlocks(candidate);
            if (this.isMeaningfulHtml(parsed)) return parsed;
        }

        return '';
    }

    firstString(...values) {
        for (const value of values) {
            if (typeof value === 'string' && value.trim()) return value.trim();
        }
        return '';
    }

    normalizePublicImageUrl(value) {
        if (typeof value !== 'string') return '';
        const url = value.trim();
        if (!url) return '';
        return url;
    }

    isRenderableImageUrl(value) {
        if (typeof value !== 'string') return false;
        const url = value.trim();
        if (!url) return false;
        const invalid = ['[object Object]', 'undefined', 'null', 'about:blank'];
        if (invalid.includes(url)) return false;
        return /^https?:\/\/|^\/|^data:image\//i.test(url);
    }

    getImageFromHtml(html) {
        if (typeof html !== 'string' || !html.trim()) return '';
        // Try src first, then data-src as fallback
        const srcMatch = html.match(/<img\b[^>]*\bsrc=["']([^"']+)["']/i);
        if (srcMatch && srcMatch[1]) return srcMatch[1].trim();
        
        const dataSrcMatch = html.match(/<img\b[^>]*\bdata-src=["']([^"']+)["']/i);
        if (dataSrcMatch && dataSrcMatch[1]) return dataSrcMatch[1].trim();
        
        return '';
    }

    getContentItemImage(item, fallbackItem = null, articleHtml = '') {
        const candidates = [item, fallbackItem].filter(Boolean);
        for (const current of candidates) {
            if (!current || typeof current !== 'object') continue;
            
            // Standard image fields
            const img = current.imageUrl || current.image || current.coverImage || current.featuredImage || current.thumbnail;
            const normalized = this.normalizePublicImageUrl(img);
            if (this.isRenderableImageUrl(normalized)) return normalized;
        }

        // Try to extract from content if not found in metadata
        const content = articleHtml || candidates[0]?.content || candidates[0]?.contentHtml || candidates[0]?.html || candidates[0]?.body || candidates[0]?.excerpt || '';
        const htmlImage = this.normalizePublicImageUrl(this.getImageFromHtml(content));
        if (this.isRenderableImageUrl(htmlImage)) return htmlImage;

        return '';
    }


    getRichMediaUrl(media) {
        if (!media) return '';
        if (typeof media === 'string') return media.trim();
        if (typeof media !== 'object') return '';

        const src = media.src && typeof media.src === 'object' ? media.src : {};
        return this.firstString(
            media.url,
            media.fileUrl,
            media.imageUrl,
            typeof media.src === 'string' ? media.src : '',
            src.url,
            src.fileUrl,
            src.imageUrl
        );
    }

    getRichLinkUrl(value) {
        if (!value || typeof value !== 'object') return '';
        const link = value.link && typeof value.link === 'object' ? value.link : value;
        return this.firstString(link.url, link.href, value.url, value.href);
    }

    getYoutubeEmbedUrl(url) {
        if (typeof url !== 'string') return '';
        const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
        return match ? `https://www.youtube.com/embed/${match[1]}` : '';
    }

    getVimeoEmbedUrl(url) {
        if (typeof url !== 'string') return '';
        const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
        return match ? `https://player.vimeo.com/video/${match[1]}` : '';
    }

    renderRichMediaLink(url, label = 'Åpne innhold') {
        if (!url) return '';
        return `<p><a href="${this.escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${this.escapeHtml(label)}</a></p>`;
    }

    renderRichIframe(url, title = 'Innebygd innhold') {
        const embedUrl = this.getYoutubeEmbedUrl(url) || this.getVimeoEmbedUrl(url);
        if (!embedUrl) return '';
        return `<div class="cms-embed"><iframe src="${this.escapeHtml(embedUrl)}" title="${this.escapeHtml(title)}" loading="lazy" allowfullscreen></iframe></div>`;
    }

    getRichTextStyleAttr(data = {}) {
        const textStyle = data.textStyle && typeof textStyle === 'object' ? data.textStyle : {};
        const styles = [];
        const align = this.firstString(textStyle.textAlignment).toUpperCase();
        const lineHeight = this.firstString(textStyle.lineHeight);
        const indentation = Number(data.indentation || 0);

        if (['LEFT', 'RIGHT', 'CENTER', 'JUSTIFY'].includes(align)) {
            styles.push(`text-align:${align.toLowerCase()}`);
        }
        if (/^\d+(\.\d+)?$/.test(lineHeight)) {
            styles.push(`line-height:${lineHeight}`);
        }
        if (Number.isFinite(indentation) && indentation > 0) {
            styles.push(`margin-left:${Math.min(4, indentation) * 1.5}rem`);
        }

        return styles.length ? ` style="${styles.join(';')}"` : '';
    }

    getRichNodeStyleAttr(node = {}) {
        const nodeStyle = node.style && typeof node.style === 'object' ? node.style : {};
        const styles = [];

        const paddingTop = this.firstString(nodeStyle.paddingTop);
        const paddingBottom = this.firstString(nodeStyle.paddingBottom);
        const backgroundColor = this.firstString(nodeStyle.backgroundColor);

        if (/^\d+(\.\d+)?(px|rem|em|%)?$/.test(paddingTop)) styles.push(`padding-top:${paddingTop}`);
        if (/^\d+(\.\d+)?(px|rem|em|%)?$/.test(paddingBottom)) styles.push(`padding-bottom:${paddingBottom}`);
        if (/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(backgroundColor)) styles.push(`background-color:${backgroundColor}`);

        return styles.length ? ` style="${styles.join(';')}"` : '';
    }

    applyRichTextDecorations(html, decorations) {
        if (!html || !Array.isArray(decorations)) return html;

        return decorations.reduce((acc, decoration) => {
            if (!decoration || typeof decoration !== 'object') return acc;
            const type = this.firstString(decoration.type).toUpperCase();

            if (type === 'BOLD') return `<strong>${acc}</strong>`;
            if (type === 'ITALIC') return `<em>${acc}</em>`;
            if (type === 'UNDERLINE') return `<u>${acc}</u>`;
            if (type === 'STRIKETHROUGH') return `<s>${acc}</s>`;
            if (type === 'SUPERSCRIPT') return `<sup>${acc}</sup>`;
            if (type === 'SUBSCRIPT') return `<sub>${acc}</sub>`;

            if (type === 'LINK' || type === 'EXTERNAL') {
                const href = this.getRichLinkUrl(decoration.linkData || decoration);
                return href ? `<a href="${this.escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${acc}</a>` : acc;
            }

            if (type === 'COLOR') {
                const colorData = decoration.colorData && typeof decoration.colorData === 'object' ? decoration.colorData : {};
                const styles = [];
                if (/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(colorData.foreground || '')) {
                    styles.push(`color:${colorData.foreground}`);
                }
                if (/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(colorData.background || '')) {
                    styles.push(`background-color:${colorData.background}`);
                }
                return styles.length ? `<span style="${styles.join(';')}">${acc}</span>` : acc;
            }

            if (type === 'FONT_SIZE') {
                const fontSizeData = decoration.fontSizeData && typeof decoration.fontSizeData === 'object' ? decoration.fontSizeData : {};
                const value = Number(fontSizeData.value);
                const unit = this.firstString(fontSizeData.unit).toLowerCase() || 'px';
                if (Number.isFinite(value) && value > 0 && value <= 96 && ['px', 'em', 'rem'].includes(unit)) {
                    return `<span style="font-size:${value}${unit}">${acc}</span>`;
                }
            }

            return acc;
        }, html);
    }

    stripOuterParagraph(html) {
        if (typeof html !== 'string') return '';
        const trimmed = html.trim();
        const match = trimmed.match(/^<p(?:\s[^>]*)?>([\s\S]*)<\/p>$/i);
        return match ? match[1].trim() : trimmed;
    }

    parseBlocks(content) {
        if (!content) return '';

        // Handle Legacy HTML (string)
        if (typeof content === 'string') {
            return content;
        }

        // Handle object payloads that already contain HTML/text fields
        if (typeof content === 'object' && content !== null) {
            const htmlLike = [
                content.html,
                content.content,
                content.contentHtml,
                content.body,
                content.contentText
            ].find((value) => typeof value === 'string' && value.trim());

            if (typeof htmlLike === 'string') {
                return htmlLike;
            }
        }

        // Handle Editor.js JSON
        if (typeof content === 'object' && content.blocks) {
            const isIgnorableParagraph = (block) => {
                if (!block || block.type !== 'paragraph') return false;
                const html = String(block?.data?.text || '')
                    .replace(/&nbsp;/gi, ' ')
                    .replace(/<br\s*\/?>/gi, ' ')
                    .replace(/<[^>]*>/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim();
                return html.length === 0;
            };

            const rawBlocks = Array.isArray(content.blocks) ? content.blocks : [];

            // Intelligent image filtering for leading hero images
            let startIndex = 0;
            while (startIndex < rawBlocks.length && (rawBlocks[startIndex]?.type === 'image' || isIgnorableParagraph(rawBlocks[startIndex]))) {
                startIndex += 1;
            }

            // Only strip leading images if there is actual content following them
            const hasTextAfterLeading = rawBlocks.slice(startIndex).some((b) => {
                if (!b) return false;
                const type = String(b.type || '').toLowerCase();
                return type === 'paragraph' || type === 'header' || type === 'list';
            });

            const blocksForRender = (startIndex > 0 && hasTextAfterLeading) ? rawBlocks.slice(startIndex) : rawBlocks;

            return blocksForRender.map((block) => {
                try {
                    if (!block || typeof block !== 'object') return '';

                    const type = String(block.type || '').toLowerCase();
                    const data = block.data || {};

                    switch (type) {
                        case 'header': {
                            const level = Math.min(Math.max(Number(data.level) || 2, 1), 6);
                            return `<h${level} class="block-header">${data.text || ''}</h${level}>`;
                        }
                        case 'paragraph':
                            if (isIgnorableParagraph(block)) return '';
                            return `<p class="block-paragraph">${data.text || ''}</p>`;
                        case 'list': {
                            const listTag = data.style === 'ordered' ? 'ol' : 'ul';
                            const items = (Array.isArray(data.items) ? data.items : [])
                                .map(item => `<li>${typeof item === 'string' ? item : (item?.content || item?.text || '')}</li>`)
                                .join('');
                            return `<${listTag} class="block-list">${items}</${listTag}>`;
                        }
                        case 'image': {
                            const imageUrl = data?.file?.url || data?.url || '';
                            if (!imageUrl) return '';
                            const caption = data.caption ? `<figcaption>${data.caption}</figcaption>` : '';
                            return `<figure class="block-image"><img src="${imageUrl}" alt="${data.caption || ''}">${caption}</figure>`;
                        }
                        case 'quote':
                            return `<blockquote class="block-quote"><p>${data.text || ''}</p>${data.caption ? `<cite>${data.caption}</cite>` : ''}</blockquote>`;
                        case 'delimiter':
                            return `<div class="block-delimiter">***</div>`;
                        case 'youtubevideo':
                        case 'video': {
                            const url = data?.url || data?.embed || '';
                            if (!url) return '';
                            const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
                            const embedUrl = ytMatch ? `https://www.youtube.com/embed/${ytMatch[1]}` : url;
                            return `<div class="block-embed"><iframe src="${embedUrl}" frameborder="0" allowfullscreen></iframe></div>`;
                        }
                        default:
                            return '';
                    }
                } catch (err) {
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


    isSameDay(d1, d2) {
        if (!d1 || !d2) return false;
        return d1.getFullYear() === d2.getFullYear() &&
            d1.getMonth() === d2.getMonth() &&
            d1.getDate() === d2.getDate();
    }

    /**
     * Cleans legacy HTML content from Wix/Wordpress artifacts
     * @param {string} html 
     */
    cleanLegacyHtml(html) {
        if (!html || typeof html !== 'string') return html;
        
        let cleaned = html;

        // 1. Initial cleanup: Remove Wix-specific IDs and known junk tags
        cleaned = cleaned.replace(/\bid=["']comp-[^"']*["']/gi, '');
        cleaned = cleaned.replace(/<(object|embed|iframe)\b[^>]*\bsrc=["'][^"']*wix\.com[^"']*["'][^>]*>.*?<\/\1>/gi, '');

        // 2. DOM-based structural cleanup (Image Clusters/Galleries)
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(cleaned, 'text/html');
            const body = doc.body;

            // Remove containers that act as image clusters (Galleries)
            // If a container has 3+ images and minimal text, it's a legacy gallery artifact
            const containers = body.querySelectorAll('div, figure, section, span');
            containers.forEach(el => {
                const imgs = el.querySelectorAll('img');
                const textContent = el.textContent.trim();
                
                // If it contains many images and very little actual content, it's a gallery residue
                if (imgs.length >= 2 && textContent.length < 50) {
                    const hasWixImg = Array.from(imgs).some(img => (img.src || '').includes('wixstatic.com') || (img.src || '').includes('wixmp.com'));
                    if (hasWixImg || imgs.length >= 3) {
                        console.log('[Cleanup] Removing legacy image gallery artifact (HTML)');
                        el.remove();
                    }
                }
            });

            // Remove sequences of siblings that are just images or empty paragraphs (another gallery format)
            const children = Array.from(body.children);
            for (let i = 0; i < children.length; i++) {
                let cluster = [];
                let j = i;
                
                while (j < children.length) {
                    const child = children[j];
                    const isImg = child.tagName === 'IMG';
                    const isImgWrapper = (child.tagName === 'DIV' || child.tagName === 'P' || child.tagName === 'FIGURE') && 
                                        child.querySelectorAll('img').length > 0 && 
                                        child.textContent.trim().length < 20;
                    const isEmptyPara = (child.tagName === 'P' || child.tagName === 'DIV') && 
                                       child.textContent.trim().length === 0 && 
                                       child.querySelectorAll('img').length === 0;

                    if (isImg || isImgWrapper) {
                        cluster.push(child);
                    } else if (isEmptyPara && cluster.length > 0) {
                        // Keep track of empty paras inside/between images to remove them too
                        cluster.push(child);
                    } else {
                        break;
                    }
                    j++;
                }
                
                const imgCount = cluster.filter(c => c.tagName === 'IMG' || c.querySelectorAll('img').length > 0).length;
                if (imgCount >= 2) {
                    console.log(`[Cleanup] Removing HTML image sequence of size ${imgCount}`);
                    cluster.forEach(item => item.remove());
                    i = j - 1;
                }
            }

            cleaned = body.innerHTML;
        } catch (e) {
            console.warn('[Cleanup] DOM parsing failed:', e);
        }

        // 3. Text style cleanup (Existing logic)
        cleaned = cleaned.replace(/<(p|span|h1|h2|h3|h4|h5|h6|li)\b[^>]*\bstyle=["'][^"']*["']/gi, (match) => {
            const alignMatch = match.match(/text-align\s*:\s*([^;"]+)/i);
            const tagMatch = match.match(/^<[a-z0-9]+/i);
            if (alignMatch && tagMatch) {
                return `${tagMatch[0]} style="text-align: ${alignMatch[1]}"`;
            }
            return tagMatch[0];
        });

        // 4. Final Wix class removal
        cleaned = cleaned.replace(/\bclass=["']([^"']*\b)?wix-[^"']*["']/gi, '');

        return cleaned;
    }

    /**
     * Cleans EditorJS blocks from legacy Wix artifacts (e.g. image clusters)
     * @param {object} content EditorJS data object
     */
    cleanEditorBlocks(content) {
        if (!content || !Array.isArray(content.blocks)) return content;
        
        const blocks = content.blocks;
        const newBlocks = [];
        let i = 0;
        
        while (i < blocks.length) {
            const block = blocks[i];
            
            // 1. Detect Wix image clusters (including empty paragraphs between them)
            let cluster = [];
            let j = i;
            let imagesInCluster = 0;
            
            while (j < blocks.length) {
                const b = blocks[j];
                const isImage = b.type === 'image' || b.type === 'imageGallery';
                const isEmpty = (b.type === 'paragraph' && (!b.data.text || b.data.text.trim() === ''));
                
                if (isImage) {
                    cluster.push(j);
                    imagesInCluster++;
                } else if (isEmpty && imagesInCluster > 0) {
                    cluster.push(j);
                } else {
                    break;
                }
                j++;
            }
            
            // If cluster has 2+ Wix images OR 3+ any images, it's likely a Wix artifact
            let shouldPrune = false;
            if (imagesInCluster >= 3) shouldPrune = true;
            if (imagesInCluster >= 2) {
                // Check for wix domains in the URLs
                const hasWixDomain = cluster.some(idx => {
                    const b = blocks[idx];
                    if (b.type !== 'image') return false;
                    const url = b.data?.file?.url || b.data?.url || '';
                    return url.includes('wixstatic.com') || url.includes('wixmp.com');
                });
                if (hasWixDomain) shouldPrune = true;
            }
            
            if (shouldPrune) {
                console.log(`[Cleanup] Pruning EditorJS cluster: ${imagesInCluster} images across ${cluster.length} blocks`);
                i = j; // Skip the entire cluster
                continue;
            }
            
            // 2. Individual Wix image removal (optional, but let's keep it safe for now)
            // If it's a single Wix image that is NOT the only image in the post, 
            // we could remove it, but let's stick to clusters for now to avoid false positives.

            newBlocks.push(blocks[i]);
            i++;
        }
        
        return {
            ...content,
            blocks: newBlocks
        };
    }

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
        console.log('[ContentManager] Initialized.');
    }
}

// Execute immediately
startContentManager();
