// ===================================
// Public Content Manager (Global version)
// ===================================
const firebaseService = window.firebaseService;

class ContentManager {
    constructor() {
        this.pageId = this.detectPageId();
        this.currentDate = new Date();

        // Tag body with page-specific class (e.g. page-index, page-om-oss)
        const body = document.body;
        if (body && this.pageId) {
            body.classList.add(`page-${this.pageId}`);
        }

        this.init();
        this.agendaMonthsToShow = 1;
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

    async init() {
        this.setLoading(true);
        if (!firebaseService.isInitialized) {
            // Wait briefly for firebase module if needed
            let count = 0;
            while (!firebaseService.isInitialized && count < 10) {
                await new Promise(r => setTimeout(r, 100));
                count++;
            }
        }

        try {
            if (!firebaseService.isInitialized) return;

            // 1. Initial Load
            const content = await firebaseService.getPageContent(this.pageId);
            const globalSettings = await firebaseService.getPageContent('settings_design');

            if (globalSettings) this.applyGlobalSettings(globalSettings);
            if (content) this.updateDOM(content);

            // 2. SEO & Meta
            const seoSettings = await firebaseService.getPageContent('settings_seo');
            if (seoSettings) await this.handleSEO(seoSettings);

            // 3. Specialized Loaders
            try {
                await this.loadSpecializedContent();
            } catch (e) {
                console.error("[ContentManager] Specialized Loader failed:", e);
            }

            // 4. (Valgfritt) sanntidsoppdatering
            // For den offentlige nettsiden ønsker vi stabil tekst uten at den endrer seg
            // etter at siden er lastet inn, derfor er sanntids-abonnement slått av her.
            // Hvis du senere vil ha «live preview», kan dette aktiveres igjen.
            // firebaseService.subscribeToPage(this.pageId, (updatedContent) => {
            //     this.updateDOM(updatedContent);
            // });
        } catch (error) {
            console.error("[ContentManager] Init error:", error);
        } finally {
            this.setLoading(false);
        }
    }

    async handleSEO(seoSettings) {
        let itemSEO = null;
        const urlParams = new URLSearchParams(window.location.search);
        const itemId = urlParams.get('id');

        if (itemId) {
            const blogData = await firebaseService.getPageContent('collection_blog');
            const teachingData = await firebaseService.getPageContent('collection_teaching');
            const allItems = [
                ...(Array.isArray(blogData) ? blogData : (blogData?.items || [])),
                ...(Array.isArray(teachingData) ? teachingData : (teachingData?.items || []))
            ];
            const item = allItems.find(i => i.title === itemId || i.id === itemId);
            if (item && (item.seoTitle || item.seoDescription || item.geoPosition)) {
                itemSEO = {
                    title: item.seoTitle,
                    description: item.seoDescription,
                    geoPosition: item.geoPosition
                };
            }
        }
        this.applySEO(seoSettings, itemSEO);
    }

    async loadSpecializedContent() {
        if (this.pageId === 'index') {
            const heroData = await firebaseService.getPageContent('hero_slides');
            if (heroData && heroData.slides) this.renderHeroSlides(heroData.slides);

            const events = await this.loadEvents();
            if (events && events.length > 0) this.renderEvents(events);

            const blogData = await firebaseService.getPageContent('collection_blog');
            const blogItems = Array.isArray(blogData) ? blogData : (blogData?.items || []);
            if (blogItems.length > 0) this.renderBlogPosts(blogItems, '#blogg .blog-grid');

            this.enableHeroAnimations();
        }

        if (this.pageId === 'blogg-post') {
            await this.renderSingleBlogPost();
        }

        if (this.pageId === 'arrangementer') {
            const events = await this.loadEvents();
            this.setupCalendarNavigation();
            this.setCalendarEvents(events || []);
            this.renderCalendarView();
            if (events && events.length > 0) this.renderEvents(events);
        }

        if (this.pageId === 'kalender') {
            const events = await this.loadEvents();
            this.setupCalendarNavigation();
            this.setCalendarEvents(events || []);
            this.renderCalendarView();
        }

        if (this.pageId === 'blogg') {
            const blogData = await firebaseService.getPageContent('collection_blog');
            const blogItems = Array.isArray(blogData) ? blogData : (blogData?.items || []);
            if (blogItems.length > 0) this.renderBlogPosts(blogItems, '.blog-page .blog-grid');
        }

        if (this.pageId === 'undervisningsserier') {
            const teachingData = await firebaseService.getPageContent('collection_teaching');
            const teachingItems = Array.isArray(teachingData) ? teachingData : (teachingData?.items || []);
            if (teachingItems.length > 0) this.renderTeachingSeries(teachingItems, '.media-grid');
        }
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

        const blogData = await firebaseService.getPageContent('collection_blog');
        const items = Array.isArray(blogData) ? blogData : (blogData?.items || []);
        const item = items.find(i => i.title === itemId || i.id === itemId);

        if (!item) {
            container.innerHTML = '<p>Innlegget ble ikke funnet.</p>';
            return;
        }

        if (titleEl) titleEl.textContent = item.title || 'Blogginnlegg';
        if (breadcrumbEl) breadcrumbEl.textContent = item.title || 'Blogginnlegg';

        if (dateEl) {
            const dateStr = item.date ? this.formatDate(item.date) : '';
            dateEl.innerHTML = `<i class="far fa-calendar"></i> ${dateStr}`;
        }

        if (categoryEl) {
            const cat = item.category || '';
            categoryEl.innerHTML = cat ? `<i class="fas fa-tag"></i> ${cat}` : '';
        }

        if (heroEl && item.imageUrl) {
            heroEl.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url('${item.imageUrl}')`;
        }

        container.innerHTML = item.content || '<p>Dette innlegget har foreløpig ikke noe innhold.</p>';
    }

    async loadEvents() {
        const { startIso, endIso } = this.getMonthRangeIso(this.currentDate);
        const currentYear = this.currentDate.getFullYear();
        const holidayEvents = this.getNorwegianHolidays(currentYear);
        const rangeStart = new Date(startIso);
        const rangeEnd = new Date(endIso);
        const monthHolidays = holidayEvents.filter(event => {
            const eventDate = this.parseEventDate(event.start || event.date);
            if (!eventDate) return false;
            return eventDate >= rangeStart && eventDate <= rangeEnd;
        });

        // 1. Prefer direct GCal fetch when configured
        const integrations = await firebaseService.getPageContent('settings_integrations');
        const gcal = integrations?.googleCalendar || {};
        const apiKey = gcal.apiKey || '';
        const calendarList = Array.isArray(integrations?.googleCalendars)
            ? integrations.googleCalendars
            : [];
        const calendars = calendarList.length > 0
            ? calendarList
            : (gcal.calendarId ? [{ id: gcal.calendarId, label: gcal.label || 'Arrangementer' }] : []);

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

            const events = results.flat();
            if (events.length > 0) {
                return [...events, ...monthHolidays];
            }
        }

        // 2. Fallback to cached events from Firestore (if any)
        const eventData = await firebaseService.getPageContent('collection_events');
        const firebaseItems = Array.isArray(eventData) ? eventData : (eventData?.items || []);

        if (firebaseItems.length > 0) {
            const tagged = firebaseItems.map(event => ({
                ...event,
                sourceId: 'manual',
                sourceLabel: 'Arrangementer'
            }));
            return [...tagged, ...monthHolidays];
        }

        // 3. Only holidays if nothing else finnes
        return monthHolidays;
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
                tag.innerText = e.title;
                const startValue = e.start || e.date;
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

    renderEvents(events) {
        const container = document.querySelector('.events-grid');
        if (!container) return;
        const visibleEvents = Array.isArray(events)
            ? events.filter(e => !e.isHoliday)
            : [];
        this.setEventCache(visibleEvents);

        container.innerHTML = visibleEvents.slice(0, 3).map(event => {
            const eventKey = this.getEventKey(event);
            const startValue = event.start || event.date;
            const startDate = this.parseEventDate(startValue);
            const hasTime = this.eventHasTime(startValue);
            const day = startDate ? startDate.getDate() : '--';
            const monthStr = startDate
                ? startDate.toLocaleString('no-NO', { month: 'short' }).replace('.', '')
                : '--';
            const monthUpper = monthStr.charAt(0).toUpperCase() + monthStr.slice(1);
            const timeStr = startDate && hasTime
                ? startDate.toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' })
                : 'Tid ikke satt';

            const rawDescription = event.description || event.content || '';
            const cleanDescription = this.stripHtml(rawDescription).trim();
            const shortDescription = cleanDescription ? cleanDescription.substring(0, 140) : 'Beskrivelse kommer.';
            const needsEllipsis = cleanDescription.length > 140;

            const imageUrl = event.imageUrl || event.image || event.imageLink;
            const imageSrc = imageUrl || this.generateEventImage(event.title);
            const imageAlt = event.title || 'Arrangement';

            const videoLink = this.extractVideoLink(event);
            const isOnline = !!videoLink;

            return `
                <div class="event-card">
                    <div class="event-image">
                        <div class="event-image-zoom">
                            <img src="${imageSrc}" alt="${imageAlt}">
                        </div>
                        <div class="event-date">
                            <span class="day">${day}</span>
                            <span class="month">${monthUpper}</span>
                        </div>
                    </div>
                    <div class="event-content">
                        <h3 class="event-title">${event.title}</h3>
                        <div class="event-meta">
                            <span><i class="far fa-clock"></i> ${timeStr}</span>
                            <span><i class="fas fa-map-marker-alt"></i> ${isOnline && !event.location ? 'Online' : (event.location || 'Stavanger')}</span>
                        </div>
                        <p class="event-text">${shortDescription}${needsEllipsis ? '...' : ''}</p>
                        <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-top: 15px;">
                            ${videoLink ? `<a href="${videoLink}" target="_blank" rel="noopener noreferrer" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 8px;"><i class="fas fa-video"></i> <span>Bli med online</span></a>` : ''}
                            <button type="button" class="btn btn-outline event-modal-trigger" data-event-key="${eventKey}" style="background: transparent; color: var(--primary-orange); border: 2px solid var(--primary-orange);">Les mer <i class="fas fa-arrow-right"></i></button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        this.bindEventModalTriggers(container);
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
            const dayNum = startDate
                ? startDate.toLocaleDateString('nb-NO', { day: '2-digit' })
                : '--';
            const monthStr = startDate
                ? startDate.toLocaleDateString('nb-NO', { month: 'short' }).replace('.', '')
                : '--';
            const weekdayStr = startDate
                ? startDate.toLocaleDateString('nb-NO', { weekday: 'short' }).replace('.', '')
                : '';
            const timeStr = startDate && hasTime
                ? startDate.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })
                : '';
            const timeLabel = timeStr ? timeStr : 'Tid ikke satt';
            const location = event.location || 'Sted ikke satt';

            return `
                <li class="calendar-agenda-item">
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
        events.forEach(event => {
            const key = this.getEventKey(event);
            if (key) this.eventCache.set(key, event);
        });
    }

    getEventKey(event) {
        if (!event) return '';
        return event.id || `${event.title || 'event'}|${event.start || event.date || ''}`;
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

        const dateLabel = startDate
            ? startDate.toLocaleDateString('nb-NO', { day: '2-digit', month: 'long', year: 'numeric' })
            : 'Dato ikke satt';
        const timeLabel = startDate && hasTime
            ? startDate.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })
            : 'Tid ikke satt';

        titleEl.textContent = event.title || 'Arrangement';
        dateEl.innerHTML = `<i class="far fa-calendar-alt"></i> ${dateLabel}`;
        timeEl.innerHTML = `<i class="far fa-clock"></i> ${timeLabel}`;
        locationEl.innerHTML = `<i class="fas fa-map-marker-alt"></i> ${event.location || 'Sted ikke satt'}`;
        const rawDescription = event.description || '';
        const safeHtml = this.sanitizeEventHtml(rawDescription);
        if (safeHtml) {
            descEl.innerHTML = safeHtml;
        } else {
            descEl.textContent = 'Beskrivelse kommer.';
        }

        const imageUrl = event.imageUrl || event.image || event.imageLink;
        if (imageUrl) {
            imageEl.src = imageUrl;
            imageEl.alt = event.title || 'Arrangement';
            imageWrap.style.display = 'block';
        } else {
            imageEl.src = this.generateEventImage(event.title);
            imageEl.alt = event.title || 'Arrangement';
            imageWrap.style.display = 'block';
        }

        const videoLink = this.extractVideoLink(event);
        const videoLinkEl = modal.querySelector('.event-modal-video-link');

        if (videoLink && videoLinkEl) {
            videoLinkEl.innerHTML = `<a href="${videoLink}" target="_blank" rel="noopener noreferrer" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 8px; margin-bottom: 12px;"><i class="fas fa-video"></i> Bli med på nettmøtet</a>`;
            videoLinkEl.style.display = 'block';
        } else if (videoLinkEl) {
            videoLinkEl.style.display = 'none';
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
                    <div class="event-modal-image-wrap" style="display: none;">
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
                            <div class="event-modal-video-link" style="display: none;"></div>
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
                    <div class="event-modal-video-link" style="display: none;"></div>
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
        if (value instanceof Date) {
            return Number.isNaN(value.getTime()) ? null : value;
        }

        if (typeof value === 'string') {
            const trimmed = value.trim();

            // Handle dd.mm.yyyy or dd/mm/yyyy (with optional time)
            const dmY = trimmed.match(/^(\d{2})[./](\d{2})[./](\d{4})(?:\s+(\d{2}):(\d{2}))?$/);
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
                id: `holiday-${isoDate}-${title}`,
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
     * Determine which page we are on based on filename
     */
    detectPageId() {
        const path = window.location.pathname;
        const page = path.split("/").pop().replace(".html", "") || "index";
        return page;
    }

    /**
     * Update DOM elements based on Firestore data
     * @param {object} data 
     */
    updateDOM(data) {
        if (!data) return;

        // Find all elements with data-content-key
        const elements = document.querySelectorAll("[data-content-key]");

        elements.forEach(el => {
            const key = el.getAttribute("data-content-key");
            const value = this.getValueByPath(data, key);

            if (value === undefined) return;

            // Images kan trygt oppdateres direkte
            if (el.tagName === "IMG") {
                if (el.src !== value) {
                    el.src = value;
                }
                return;
            }

            const newText = String(value).trim();
            const currentText = (el.textContent || "").trim();

            // Første gang vi rører elementet: unngå å overskrive ferdig, ikke-"placeholder" tekst
            const isFirstBind = !el.dataset.cmsBound;
            if (isFirstBind) {
                el.dataset.cmsBound = "true";

                const lower = currentText.toLowerCase();
                const isPlaceholder = !currentText ||
                    lower === "laster..." ||
                    lower.includes("kommer mer snart");

                // Hvis HTML allerede har ekte tekst som er ulik CMS-verdi, la HTML vinne ved første last
                if (!isPlaceholder && currentText && currentText !== newText) {
                    return;
                }
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
        if (data.fontSizeBase) {
            document.documentElement.style.fontSize = `${data.fontSizeBase}px`;
        }
        if (data.primaryColor) {
            document.documentElement.style.setProperty('--primary-color', data.primaryColor);
        }
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
        const sliderContainer = document.querySelector('.slider-container');
        if (!sliderContainer) return;

        if (slides.length > 0) {
            document.body.classList.remove('hero-animate');
            sliderContainer.innerHTML = slides.map((slide, index) => `
                <div class="slide ${index === 0 ? 'active' : ''}">
                    <div class="slide-bg" style="background-image: url('${slide.imageUrl}')"></div>
                    <div class="slide-content">
                        <div class="container">
                            <h1 class="slide-title">${slide.title}</h1>
                            <p class="slide-text">${slide.subtitle}</p>
                            ${slide.btnText ? `
                                <div class="slide-buttons">
                                    <a href="${slide.btnLink}" class="btn btn-primary">${slide.btnText}</a>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `).join('');

            // Re-init HeroSlider from script.js
            if (window.heroSlider) {
                window.heroSlider.slides = document.querySelectorAll('.slide');
                window.heroSlider.currentSlide = 0;
                window.heroSlider.init();
            }

            this.enableHeroAnimations();
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

        if (posts.length > 0) {
            container.innerHTML = posts.map(post => `
                <article class="blog-card">
                    <div class="blog-image">
                        <img src="${post.imageUrl || 'https://via.placeholder.com/600x400?text=Ingen+bilde'}" alt="${post.title}">
                        ${post.category ? `<span class="blog-category" style="position: absolute; top: 15px; left: 15px; background: var(--secondary-color, #ff6b2b); color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">${post.category}</span>` : ''}
                    </div>
                    <div class="blog-content" style="padding: 25px;">
                        <div class="blog-meta" style="display: flex; gap: 15px; font-size: 13px; color: #6c757d; margin-bottom: 15px;">
                            ${post.date ? `<span><i class="fas fa-calendar-alt"></i> ${this.formatDate(post.date)}</span>` : ''}
                            ${post.author ? `<span><i class="fas fa-user"></i> ${post.author}</span>` : '<span><i class="fas fa-user"></i> Admin</span>'}
                        </div>
                        <h3 class="blog-title" style="margin-bottom: 12px; font-size: 1.25rem;">${post.title}</h3>
                        <p class="blog-excerpt" style="color: #666; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">${this.stripHtml(post.content || '').substring(0, 120)}...</p>
                        <a href="blogg-post.html?id=${encodeURIComponent(post.title)}" class="blog-link" style="color: var(--primary-color); font-weight: 600; text-decoration: none;">Les mer <i class="fas fa-arrow-right" style="margin-left: 5px;"></i></a>
                    </div>
                </article>
            `).join('');
        }
    }

    /**
     * Dynamically render Teaching Series
     */
    renderTeachingSeries(series, selector) {
        const container = document.querySelector(selector);
        if (!container) return;

        if (series.length > 0) {
            container.innerHTML = series.map(item => `
                <div class="media-card">
                    <div class="media-thumbnail">
                        <img src="${item.imageUrl || 'https://via.placeholder.com/600x400?text=Ingen+bilde'}" alt="${item.title}">
                        <div class="media-play-button">
                            <i class="fas fa-chalkboard-teacher"></i>
                        </div>
                        ${item.category ? `<span class="media-duration" style="background: var(--primary-color); left: 10px; right: auto; padding: 3px 10px; border-radius: 4px;">${item.category}</span>` : ''}
                    </div>
                    <div class="media-content">
                        <h3 class="media-title">${item.title}</h3>
                        <p class="media-description">${this.stripHtml(item.content || '').substring(0, 100)}...</p>
                        <div class="media-meta" style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="font-size: 12px; color: #6c757d;"><i class="fas fa-user"></i> ${item.author || 'His Kingdom'}</span>
                            <span style="font-size: 12px; color: #6c757d;"><i class="fas fa-calendar"></i> ${item.date ? this.formatDate(item.date) : ''}</span>
                        </div>
                    </div>
                </div>
            `).join('');
        }
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
        const tmp = document.createElement("DIV");
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || "";
    }

    /**
     * Generate a relevant image URL from Unsplash based on event title
     * @param {string} title - Event title
     * @returns {string} - Unsplash image URL
     */
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

    formatDate(dateStr) {
        if (!dateStr) return '';
        try {
            const d = new Date(dateStr);
            return d.toLocaleDateString('no-NO', { day: 'numeric', month: 'long', year: 'numeric' });
        } catch (e) {
            return dateStr;
        }
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
