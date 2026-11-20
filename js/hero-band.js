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
            el.classList.add('hb-band');
            strip(el);
            const CHILD = ['color', 'text-align', 'text-shadow', 'background', 'background-color', 'background-image', 'box-shadow', 'border', 'border-radius',
                'padding', 'padding-left', 'padding-right', 'padding-top', 'padding-bottom', 'margin', 'margin-left', 'margin-right', 'margin-top', 'margin-bottom',
                'width', 'max-width', 'font-size', 'letter-spacing', 'text-transform', 'justify-content', 'align-items', 'backdrop-filter', '-webkit-backdrop-filter', 'line-height', 'font-weight'];
            el.querySelectorAll('[style]').forEach((c) => {
                CHILD.forEach((p) => c.style.removeProperty(p));
            });
            new MutationObserver(() => strip(el)).observe(el, { attributes: true, attributeFilter: ['style'] });
        });
        heroes.forEach((el) => {
            const n = el.nextElementSibling;
            if (n && !n.dataset.hbPad && parseFloat(getComputedStyle(n).paddingTop) > 64) { n.dataset.hbPad = '1'; n.style.setProperty('padding-top', '36px', 'important'); }
        });
        setTop();
    }

    // ---------- Søk på siden (filtrerer kortene) ----------
    const CARD_SEL = '.media-card, .event-card, .podcast-card, .video-card, .hm-card, .hm-post, .teaching-card, .resource-card, .calendar-agenda-card';
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
        box.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input type="search" autocomplete="off">';
        const input = box.querySelector('input');
        input.placeholder = L.ph; input.setAttribute('aria-label', L.ph);
        host.classList.add('hb-host');
        if (host.closest('.hb-band') && !host.querySelector('.hb-eye, .hero-badge, .section-label')) {
            const eye = document.createElement('p'); eye.className = 'hb-eye'; eye.textContent = 'His Kingdom Ministry';
            host.insertBefore(eye, host.firstChild);
        }
        host.appendChild(box);
        // Filterknapper
        const CAT_SEL = '.blog-category, .media-category, .event-category, .card-category, .category-badge, .podcast-category, .video-category';
        const catOf = (c) => { const e = c.querySelector(CAT_SEL); return e ? e.textContent.trim() : ''; };
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
            const cats = [...new Set(cards().map(catOf).filter(Boolean))].sort((x, y) => x.localeCompare(y));
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
        let mt;
        new MutationObserver(() => { clearTimeout(mt); mt = setTimeout(() => { buildCats(); if (input.value.trim() || activeCat) run(); }, 120); }).observe(document.body, { childList: true, subtree: true });
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
