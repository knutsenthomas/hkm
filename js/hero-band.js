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
            el.querySelectorAll('[style]').forEach((c) => {
                ['color', 'text-align', 'text-shadow'].forEach((p) => c.style.removeProperty(p));
            });
            new MutationObserver(() => strip(el)).observe(el, { attributes: true, attributeFilter: ['style'] });
        });
        setTop();
    }
    function init() {
        apply();
        setTop();
        window.addEventListener('resize', setTop);
        window.addEventListener('load', () => { apply(); setTop(); });
        let n = 0; const iv = setInterval(() => { apply(); setTop(); if (++n > 20) clearInterval(iv); }, 250);
        const hd = document.getElementById('header');
        if (hd && window.ResizeObserver) new ResizeObserver(setTop).observe(hd);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
