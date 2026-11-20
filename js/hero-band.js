// Gjør den mørke bildetoppen på undersider om til en lys toppflate (som Nyheter & Blogg).
// Forsiden og sider med egen ny topp er unntatt.
(function () {
    const path = location.pathname.replace(/\/+$/, '') || '/';
    if (/^\/(?:en|es)?\/?(?:index(?:\.html)?)?$/.test(path)) return;
    const SEL = '.page-hero, .subpage-hero, #kurs-hero-section';
    const STRIP = ['background', 'background-image', 'background-color', 'min-height', 'height', 'padding', 'padding-top', 'padding-bottom', 'color'];

    function setTop() {
        const h = document.getElementById('header') || document.querySelector('header.header');
        if (!h) return;
        const r = h.getBoundingClientRect();
        const b = Math.round(Math.max(r.bottom, r.height));
        document.documentElement.style.setProperty('--hb-top', (b > 40 ? b : 90) + 'px');
    }
    function strip(el) {
        STRIP.forEach((p) => { if (el.style.getPropertyValue(p)) el.style.removeProperty(p); });
    }
    function apply() {
        const heroes = document.querySelectorAll(SEL);
        if (!heroes.length) return;
        document.body.classList.remove('header-dark-start');
        document.body.classList.add('hb-has-band');
        heroes.forEach((el) => {
            if (el.dataset.hbDone) return;
            el.dataset.hbDone = '1';
            el.dataset.heroAlign = 'left';
            el.classList.add('hb-band');
            strip(el);
            const CHILD = ['color', 'text-align', 'text-shadow', 'background', 'background-color', 'background-image', 'box-shadow', 'border', 'border-radius',
                'padding', 'padding-left', 'padding-right', 'padding-top', 'padding-bottom', 'margin', 'margin-left', 'margin-right', 'margin-top', 'margin-bottom',
                'width', 'max-width', 'font-size', 'letter-spacing', 'text-transform', 'justify-content', 'align-items', 'backdrop-filter', '-webkit-backdrop-filter', 'line-height', 'font-weight'];
            const stripKids = () => el.querySelectorAll('[style]').forEach((c) => {
                if (c.closest('.hb-search, .hb-filters')) return;
                CHILD.forEach((p) => { if (c.style.getPropertyValue(p)) c.style.removeProperty(p); });
            });
            stripKids();
            let runs = 0, queued = false;
            const mo = new MutationObserver(() => {
                if (queued) return; queued = true;
                requestAnimationFrame(() => {
                    queued = false;
                    if (++runs > 30) { mo.disconnect(); return; }
                    mo.disconnect(); strip(el); stripKids();
                    mo.observe(el, { attributes: true, attributeFilter: ['style'], subtree: true });
                });
            });
            mo.observe(el, { attributes: true, attributeFilter: ['style'], subtree: true });
        });
        heroes.forEach((el) => {
            const n = el.nextElementSibling;
            if (n && !n.dataset.hbPad && parseFloat(getComputedStyle(n).paddingTop) > 64) { n.dataset.hbPad = '1'; n.style.setProperty('padding-top', '36px', 'important'); }
        });
        setTop();
    }

    // ---------- Søk på siden (filtrerer kortene) ----------
    const CARD_SEL = '.plan-card, .media-card, .event-card, .podcast-card, .video-card, .hm-card, .hm-post, .teaching-card, .resource-card, .calendar-agenda-card';
    const OWN_SEARCH = '#course-search, #plans-search, #podcast-search-input, #blog-search-input, .hb-search input';
    const L = (() => { const l = (document.documentElement.lang || 'no').slice(0, 2); return l === 'en' ? { ph: 'Search this page …', none: 'No results' } : l === 'es' ? { ph: 'Buscar en esta página …', none: 'Sin resultados' } : { ph: 'Søk på siden …', none: 'Ingen treff' }; })();
    function searchHost() {
        return document.querySelector('.hb-band > .container') || document.querySelector('#hkm-tl .tl-band .tl-wrap') || document.querySelector('#hkm-media .hm-band .hm-head');
    }
    function cards() { return [...document.querySelectorAll(CARD_SEL)].filter((c) => !c.closest('header, footer, #site-search-modal, .hb-band, .tl-band, .hm-band')); }
    function addSearch() {
        if (document.querySelector(OWN_SEARCH)) return true;
        const host = searchHost();
        if (!host || cards().length < 2) return false;
        const box = document.createElement('label');
        box.className = 'hb-search';
        box.innerHTML = '<span class="material-symbols-outlined" aria-hidden="true">search</span><input type="search" autocomplete="off">';
        const input = box.querySelector('input');
        input.placeholder = L.ph; input.setAttribute('aria-label', L.ph);
        host.classList.add('hb-host');
        if (!host.querySelector(':scope > .hb-text')) {
            const txt = document.createElement('div'); txt.className = 'hb-text';
            [...host.childNodes].forEach((n) => { if (!(n.nodeType === 1 && n.matches('.hm-jump'))) txt.appendChild(n); });
            host.insertBefore(txt, host.firstChild);
        }
        if (host.closest('.hb-band') && !host.querySelector('.hb-eye, .hero-badge, .section-label')) {
            const eye = document.createElement('p'); eye.className = 'hb-eye'; eye.textContent = 'His Kingdom Ministry';
            const t = host.querySelector(':scope > .hb-text'); t.insertBefore(eye, t.firstChild);
        }
        const tools = document.createElement('div');
        tools.className = 'hb-tools';
        tools.appendChild(box);
        const ensureToggle = () => {
        if (tools.querySelector('.hb-view')) return;
        if (cards().some((c) => c.querySelector('img, .media-thumbnail, .event-image, .plan-image-wrapper'))) {
            const tg = document.createElement('div');
            tg.className = 'hb-view';
            tg.innerHTML = '<button type="button" data-v="grid" aria-label="Rutenett"><span class="material-symbols-outlined">grid_view</span></button><button type="button" data-v="list" aria-label="Liste"><span class="material-symbols-outlined">view_list</span></button>';
            tools.appendChild(tg);
            let view = 'grid';
            try { view = localStorage.getItem('hkm_page_view') || 'grid'; } catch (e) {}
            const setView = (v) => {
                view = v;
                try { localStorage.setItem('hkm_page_view', v); } catch (e) {}
                tg.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x.dataset.v === v));
                new Set(cards().map((c) => c.parentElement)).forEach((p) => p && p.classList.toggle('hb-list', v === 'list'));
            };
            tg.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) setView(b.dataset.v); });
            setView(view);
            new MutationObserver(() => { if (view === 'list') new Set(cards().map((c) => c.parentElement)).forEach((p) => p && !p.classList.contains('hb-list') && p.classList.add('hb-list')); }).observe(document.body, { childList: true, subtree: true });
        }
        };
        ensureToggle();
        new MutationObserver(() => ensureToggle()).observe(document.body, { childList: true, subtree: true });
        host.appendChild(tools);
        const jump = host.querySelector(':scope > .hm-jump'); if (jump) { jump.classList.add('hb-filters'); host.appendChild(jump); }
        // Filterknapper
        const CAT_SEL = '.duration-badge, .blog-category, .media-category, .event-category, .card-category, .category-badge, .podcast-category, .video-category';
        const MONTHS = /(\d{1,2})\.?\s+(januar|februar|mars|april|mai|juni|juli|august|september|oktober|november|desember|january|february|march|may|june|july|october|december|enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+(\d{4})/i;
        let useMonths = false;
        const catOf = (c) => {
            if (useMonths) { const m = (c.textContent || '').match(MONTHS); return m ? (m[2].charAt(0).toUpperCase() + m[2].slice(1).toLowerCase() + ' ' + m[3]) : ''; }
            const e = c.querySelector(CAT_SEL); if (!e) return '';
            if (e.classList.contains('duration-badge')) {
                const d = parseInt(e.textContent, 10); if (!d) return '';
                const en = ALL === 'All', es = ALL === 'Todos';
                if (d < 14) return en ? 'Under 2 weeks' : es ? 'Menos de 2 semanas' : 'Under 2 uker';
                if (d <= 31) return en ? '2–4 weeks' : es ? '2–4 semanas' : '2–4 uker';
                if (d <= 92) return en ? '1–3 months' : es ? '1–3 meses' : '1–3 måneder';
                return en ? 'Longer' : es ? 'Más largos' : 'Lengre';
            }
            return e.textContent.trim();
        };
        const ALL = L.ph.startsWith('Search') ? 'All' : (L.ph.startsWith('Buscar') ? 'Todos' : 'Alle');
        let activeCat = '';
        const filters = document.createElement('div');
        filters.className = 'hb-filters';
        const TEACH = [['/bibelstudier', 'Bibelstudier'], ['/undervisningsserier', 'Undervisningsserier'], ['/seminarer', 'Seminarer']];
        const here = location.pathname.replace(/\.html$/, '').replace(/\/+$/, '');
        if (TEACH.some(([p]) => p === here)) {
            filters.innerHTML = TEACH.map(([p, t]) => `<a class="hb-pill${p === here ? ' on' : ''}" href="${p}">${t}</a>`).join('');
            host.appendChild(filters);
        }
        let catSig = '';
        const buildCats = () => {
            if (filters.querySelector('a')) return;
            useMonths = false;
            const ORDER = ['Under 2 uker', '2–4 uker', '1–3 måneder', 'Lengre', 'Under 2 weeks', '2–4 weeks', '1–3 months', 'Longer', 'Menos de 2 semanas', '2–4 semanas', '1–3 meses', 'Más largos'];
            let cats = [...new Set(cards().map(catOf).filter(Boolean))].sort((x, y) => { const a = ORDER.indexOf(x), b = ORDER.indexOf(y); return (a < 0 || b < 0) ? x.localeCompare(y) : a - b; });
            if (cats.length < 2) { useMonths = true; cats = [...new Set(cards().map(catOf).filter(Boolean))]; if (cats.length < 2) useMonths = false; }
            const sig = cats.join('|');
            if (sig === catSig) return; catSig = sig;
            if (cats.length < 2) { filters.remove(); return; }
            filters.innerHTML = [ALL, ...cats].map((c, i) => `<button type="button" class="hb-pill${(i === 0 && !activeCat) || c === activeCat ? ' on' : ''}" data-cat="${i === 0 ? '' : c.replace(/"/g, '&quot;')}">${c}</button>`).join('');
            if (!filters.parentNode) host.appendChild(filters);
            filters.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
                activeCat = b.dataset.cat; filters.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b)); run();
            }));
        };
        const norm = (t) => (t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const run = () => {
            const q = norm(input.value.trim());
            const list = cards();
            list.forEach((c) => { const okC = !activeCat || catOf(c) === activeCat; c.style.display = okC && (!q || norm(c.textContent).includes(q)) ? '' : 'none'; });
            document.querySelectorAll('.hm-sec').forEach((sec) => {
                const cs = [...sec.querySelectorAll(CARD_SEL)];
                if (cs.length) sec.style.display = q && cs.every((c) => c.style.display === 'none') ? 'none' : '';
            });
            let msg = document.getElementById('hb-none');
            const any = list.some((c) => c.style.display !== 'none');
            if ((q || activeCat) && !any) {
                if (!msg) { msg = document.createElement('p'); msg.id = 'hb-none'; msg.className = 'hb-none'; msg.textContent = L.none; (list[0] && list[0].parentElement || host).appendChild(msg); }
                msg.style.display = '';
            } else if (msg) msg.style.display = 'none';
        };
        input.addEventListener('input', run);
        buildCats();
        if (filters.parentNode === host) host.appendChild(filters);
        { const j = host.querySelector(':scope > .hm-jump'); if (j) host.appendChild(j); }
        let mt;
        new MutationObserver((recs) => { if (recs.every((r) => r.target.closest && r.target.closest('.hb-filters, .hb-search, #hb-none'))) return; clearTimeout(mt); mt = setTimeout(() => { buildCats(); if (input.value.trim() || activeCat) run(); }, 150); }).observe(document.body, { childList: true, subtree: true });
        return true;
    }
    let searchTries = 0;
    function trySearch() { if (addSearch() || ++searchTries > 40) return; setTimeout(trySearch, 250); }
    function init() {
        apply();
        setTop();
        trySearch();
        window.addEventListener('resize', setTop);
        window.addEventListener('load', () => { apply(); setTop(); });
        let n = 0; const iv = setInterval(() => { apply(); setTop(); if (++n > 20) clearInterval(iv); }, 250);
        const hd = document.getElementById('header');
        if (hd && window.ResizeObserver) new ResizeObserver(setTop).observe(hd);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
