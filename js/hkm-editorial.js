/* Innholdssider (bibelske personer, blogg, undervisning) i samme stil som leseplanene:
   hvit topp med oransje overlinje, stor tittel og ingress, og coverbildet som et avrundet kort under.
   Den gamle toppen blir liggende skjult, så sidens egne skript kan fortsette å oppdatere den. */
(function () {
  'use strict';
  const LANG = (location.pathname.match(/^\/(en|es)\//) || [])[1] || 'no';
  const P = location.pathname.replace(/^\/(en|es)\//, '/').replace(/\.html$/, '');
  const EYE = {
    no: { donate: 'Gi en gave', about: 'Om oss', contact: 'Kontakt', people: 'Ressurser', person: 'Bibelske personer', timeline: 'Ressurser', blog: 'Ressurser', post: 'Blogg', teach: 'Ressurser', series: 'Undervisning' },
    en: { donate: 'Give', about: 'About us', contact: 'Contact', people: 'Resources', person: 'Biblical people', timeline: 'Resources', blog: 'Resources', post: 'Blog', teach: 'Resources', series: 'Teaching' },
    es: { donate: 'Donar', about: 'Sobre nosotros', contact: 'Contacto', people: 'Recursos', person: 'Personajes bíblicos', timeline: 'Recursos', blog: 'Recursos', post: 'Blog', teach: 'Recursos', series: 'Enseñanza' }
  }[LANG];
  const kind = /donasjon|donation|donacion/.test(P) ? 'donate' : /om-oss|about|sobre-nosotros/.test(P) ? 'about' : /kontakt|contact|contacto/.test(P) ? 'contact' : /tidslinje/.test(P) ? 'timeline' : /bibelsk-person-detaljer/.test(P) ? 'person' : /bibelske-personer/.test(P) ? 'people'
    : /blogg-post|blog-post/.test(P) ? 'post' : /\/(blogg|blog)$/.test(P) ? 'blog'
    : /undervisningsserier/.test(P) ? 'series' : /undervisning|teaching|ensenanza/.test(P) ? 'teach' : 'page';

  const urlOf = el => {
    const bg = (el.getAttribute('style') || '') + ' ' + getComputedStyle(el).backgroundImage;
    const all = [...bg.matchAll(/url\((['"]?)(.*?)\1\)/g)].map(m => m[2]).filter(u => u && !/^data:/.test(u));
    return all.length ? all[all.length - 1] : '';
  };

  const txt = el => { const c = el.cloneNode(true); c.querySelectorAll('br').forEach(b => b.replaceWith(' ')); return c.textContent.replace(/\s+/g, ' ').trim(); };
  function build() {
    const hero = document.querySelector('.subpage-hero, .page-hero');
    if (!hero || hero.dataset.ed) return;
    hero.dataset.ed = '1';
    document.body.classList.add('ed', 'ed-' + kind, 'header-always-scrolled');
    document.body.classList.remove('header-dark-start', 'header-transparent');
    const hdr = document.getElementById('header'); if (hdr) hdr.classList.add('scrolled');
    const hd = document.getElementById('header');
    const setH = () => { const b = hd ? Math.round(hd.getBoundingClientRect().height) : 80; document.body.style.setProperty('--ed-headh', Math.max(56, Math.min(b, 120)) + 'px'); };
    setH(); addEventListener('resize', setH, { passive: true });
    const head = document.createElement('div');
    head.className = 'ed-head';
    head.innerHTML = '<div class="ed-wrap"><span class="ed-eyebrow"></span><h1 class="ed-h1"></h1><p class="ed-lead"></p><div class="ed-meta"></div><div class="ed-actions"></div></div><figure class="ed-cover" hidden><img alt="" decoding="async"></figure>';
    hero.parentNode.insertBefore(head, hero);
    hero.classList.add('ed-hidden');
    // flytt levende elementer (meta-rad og tilbake-knapp) inn i den nye toppen
    const meta = hero.querySelector('#blog-meta-row, .blog-meta');
    if (meta) head.querySelector('.ed-meta').appendChild(meta);
    hero.querySelectorAll('a.btn').forEach(a => head.querySelector('.ed-actions').appendChild(a));
    // overlinje fra brødsmulesti («Hjem / Arrangementer / …») eller tilbake-knappen («Tilbake til Media»)
    const bc = hero.querySelector('.breadcrumbs, .hero-breadcrumbs, nav');
    const crumbs = bc ? [...bc.querySelectorAll('a')].map(a => a.textContent.trim()).filter(Boolean) : [];
    const crumb = crumbs.length ? crumbs[crumbs.length - 1] : '';
    const bt = head.querySelector('.ed-actions a');
    const back = bt ? bt.textContent.trim().replace(/^(Tilbake til|Back to|Volver a)\s+/i, '').split('&')[0].trim() : '';
    const sync = () => {
      const h1 = hero.querySelector('h1'), p = hero.querySelector('p');
      head.querySelector('.ed-eyebrow').textContent = EYE[kind] || crumb || back || 'His Kingdom Ministry';
      head.querySelector('.ed-h1').textContent = h1 ? txt(h1) : document.title.split('|')[0].trim();
      const lead = p ? txt(p) : '';
      const lp = head.querySelector('.ed-lead'); lp.textContent = lead; lp.hidden = !lead;
      const src = urlOf(hero), fig = head.querySelector('.ed-cover'), img = fig.querySelector('img');
      // Unsplash+-bilder har vannmerke i full størrelse: bruk et fritt bilde i stedet
      const clean = /plus\.unsplash\.com\/premium/.test(src) ? 'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=1800&q=75' : src;
      const big = /images\.unsplash\.com/.test(clean) && clean !== src ? clean : /images\.unsplash\.com/.test(src) ? src.replace(/([?&])w=\d+/, '$1w=1800').replace(/([?&])q=\d+/, '$1q=75') : src;
      if (big && img.getAttribute('src') !== big) img.src = big;
      fig.hidden = !src;
      head.querySelector('.ed-actions').hidden = !head.querySelector('.ed-actions').children.length;
    };
    sync();
    new MutationObserver(sync).observe(hero, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['style', 'class'] });
    // tilbake-knapper i innholdet blir runde knapper
    document.querySelectorAll('.back-link-btn').forEach(a => a.classList.add('ed-pill'));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build); else build();
  setTimeout(build, 800);
})();
