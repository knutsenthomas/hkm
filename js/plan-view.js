/* HKM leseplan-visning – samme oppsett for alle leseplaner.
   Leser planen fra Firestore (reading_plans), viser uker/dager, bibeltekst på siden,
   dagens tekst, steg og bønneemner, og lagrer fremgang lokalt og på Min side. */
(async function () {
  const root = document.getElementById('plan-view');
  if (!root) return;
  const PATH_LANG = (location.pathname.match(/^\/(en|es)\//) || [])[1];
  const LANG = PATH_LANG || ((document.documentElement.lang || 'no').slice(0, 2) === 'en' ? 'en'
    : ((document.documentElement.lang || '').slice(0, 2) === 'es' ? 'es' : 'no'));

  const T = {
    no: {
      plan: 'Leseplan', prayerPlan: 'Bønneplan', days: n => n + ' dager', weeks: n => n === 1 ? '1 uke' : n + ' uker',
      perDay: m => 'Ca. ' + m + ' min om dagen', versesOnPage: 'Bibelversene står på siden', share: 'Del',
      progress: 'Din fremgang', soon: 'Snart i gang', starts: (wd, d) => 'Starter ' + wd + ' ' + d,
      tomorrow: 'I morgen begynner vi.', inDays: n => 'Om ' + n + ' dager. Du kan lese deg opp allerede nå.',
      over: 'Planen er fullført i kalenderen', doneOf: (a, b) => a + ' av ' + b + ' dager fullført',
      stillRead: 'Du kan fortsatt lese og fullføre dagene.', today: d => 'I dag · ' + d, dayT: (n, t) => 'Dag ' + n + ': ' + t,
      todayDone: 'Dagens dag er fullført. Godt jobbet!', tapDay: 'Trykk på dagen for å lese.', of: n => 'av ' + n,
      myStart: 'Min startdato', week: 'Uke', dayRange: (a, b) => 'Dag ' + a + '–' + b, selected: 'Valgt dag', todayL: 'I dag', doneL: 'Fullført',
      allDays: 'Alle dager', readOf: (a, b) => a + ' av ' + b + ' fullført', dayOf: (n, m) => 'Dag ' + n + ' av ' + m,
      verses: 'Dagens bibelvers', readAll: n => n === 2 ? 'Les begge' : 'Les alle ' + (['', '', '', 'tre', 'fire', 'fem', 'seks'][n] || n), copy: 'Kopier', nextV: 'Neste vers →', firstV: 'Første vers ↺',
      openBible: 'Les i Bibelen', showAll: 'Vis hele teksten', step: 'Dagens steg', prayFor: 'Be for', prayer: 'Bønn', notes: n => 'Mine notater for dag ' + n,
      notesPh: 'Hva viser Gud deg i dag?', markDone: n => 'Merk dag ' + n + ' som fullført', undo: '✓ Fullført – angre', prev: n => '← Dag ' + n, next: n => 'Dag ' + n + ' →',
      dayDone: n => 'Dag ' + n + ' er fullført', allDone: n => 'Alle ' + n + ' dager fullført!', celebrateT: n => 'Du har fullført alle ' + n + ' dagene!',
      celebrateP: 'Takk Gud for det han har gjort. Skriv ned forandringene du har sett, og del vitnesbyrdet ditt med noen.',
      copied: 'Verset er kopiert', noCopy: 'Kunne ikke kopiere her', linkCopied: 'Lenken er kopiert', noLink: 'Kunne ikke kopiere lenken her',
      startSaved: 'Startdato lagret', about: 'Om planen', bigIdea: 'Den store ideen', themes: 'Sentrale temaer', structure: 'Planens oppbygning',
      others: 'Flere leseplaner', othersP: 'Les mer', loading: 'Laster leseplanen …', notFound: 'Fant ikke leseplanen',
      notFoundP: 'Lenken kan være feil, eller planen er ikke publisert ennå.', back: 'Til alle leseplaner', excerpt: 'utdrag',
      loadingV: 'Henter bibelteksten …', noV: 'Bibelteksten kunne ikke hentes her. Åpne den i Bibelen.', moreCh: n => '+ ' + n + (n === 1 ? ' kapittel' : ' kapitler') + ' til – les videre i Bibelen',
      buy: 'Kjøp trykt versjon', print: 'Skriv ut', behind: n => 'Du ligger ' + n + (n === 1 ? ' dag' : ' dager') + ' bak planen.', jump: n => 'Gå til dag ' + n,
      resources: 'Ressurser', onlyNo: '', listUrl: '/leseplaner', bibleUrl: '/bibel.html', planUrl: '/leseplan-detaljer',
      MON: ['januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'desember'],
      MS: ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'],
      WD: ['søndag', 'mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag'], fmt: (d, M) => d.getDate() + '. ' + M[d.getMonth()]
    },
    en: {
      plan: 'Reading plan', prayerPlan: 'Prayer plan', days: n => n + ' days', weeks: n => n === 1 ? '1 week' : n + ' weeks',
      perDay: m => 'About ' + m + ' min a day', versesOnPage: 'Bible verses on the page', share: 'Share',
      progress: 'Your progress', soon: 'Starting soon', starts: (wd, d) => 'Starts ' + wd + ' ' + d,
      tomorrow: 'We begin tomorrow.', inDays: n => 'In ' + n + ' days. You can read ahead already.',
      over: 'The plan has ended in the calendar', doneOf: (a, b) => a + ' of ' + b + ' days completed',
      stillRead: 'You can still read and complete the days.', today: d => 'Today · ' + d, dayT: (n, t) => 'Day ' + n + ': ' + t,
      todayDone: "Today's day is completed. Well done!", tapDay: 'Tap the day to read.', of: n => 'of ' + n,
      myStart: 'My start date', week: 'Week', dayRange: (a, b) => 'Day ' + a + '–' + b, selected: 'Selected day', todayL: 'Today', doneL: 'Completed',
      allDays: 'All days', readOf: (a, b) => a + ' of ' + b + ' completed', dayOf: (n, m) => 'Day ' + n + ' of ' + m,
      verses: "Today's Bible verses", readAll: n => n === 2 ? 'Read both' : 'Read all ' + n, copy: 'Copy', nextV: 'Next verse →', firstV: 'First verse ↺',
      openBible: 'Read in the Bible', showAll: 'Show the whole passage', step: "Today's step", prayFor: 'Pray for', prayer: 'Prayer', notes: n => 'My notes for day ' + n,
      notesPh: 'What is God showing you today?', markDone: n => 'Mark day ' + n + ' as completed', undo: '✓ Completed – undo', prev: n => '← Day ' + n, next: n => 'Day ' + n + ' →',
      dayDone: n => 'Day ' + n + ' completed', allDone: n => 'All ' + n + ' days completed!', celebrateT: n => 'You have completed all ' + n + ' days!',
      celebrateP: 'Thank God for what he has done. Write down the changes you have seen, and share your testimony with someone.',
      copied: 'Verse copied', noCopy: 'Could not copy here', linkCopied: 'Link copied', noLink: 'Could not copy the link here',
      startSaved: 'Start date saved', about: 'About the plan', bigIdea: 'The big idea', themes: 'Key themes', structure: 'Structure of the plan',
      others: 'More reading plans', othersP: 'Read more', loading: 'Loading the reading plan …', notFound: 'Reading plan not found',
      notFoundP: 'The link may be wrong, or the plan is not published yet.', back: 'All reading plans', excerpt: 'excerpt',
      loadingV: 'Loading the Bible text …', noV: 'The Bible text could not be loaded here. Open it in the Bible.', moreCh: n => '+ ' + n + (n === 1 ? ' more chapter' : ' more chapters') + ' – continue in the Bible',
      buy: 'Buy the printed version', print: 'Print', behind: n => 'You are ' + n + (n === 1 ? ' day' : ' days') + ' behind the plan.', jump: n => 'Go to day ' + n,
      resources: 'Resources', onlyNo: 'This plan has not been translated yet, so the text is in Norwegian. The Bible verses are shown in English.', listUrl: '/en/leseplaner', bibleUrl: '/en/bibel.html', planUrl: '/en/reading-plan-details',
      MON: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
      MS: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      WD: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], fmt: (d, M) => M[d.getMonth()] + ' ' + d.getDate()
    },
    es: {
      plan: 'Plan de lectura', prayerPlan: 'Plan de oración', days: n => n + ' días', weeks: n => n === 1 ? '1 semana' : n + ' semanas',
      perDay: m => 'Unos ' + m + ' min al día', versesOnPage: 'Los versículos están en la página', share: 'Compartir',
      progress: 'Tu progreso', soon: 'Pronto empezamos', starts: (wd, d) => 'Empieza el ' + wd + ' ' + d,
      tomorrow: 'Empezamos mañana.', inDays: n => 'En ' + n + ' días. Ya puedes leer por adelantado.',
      over: 'El plan ya terminó en el calendario', doneOf: (a, b) => a + ' de ' + b + ' días completados',
      stillRead: 'Todavía puedes leer y completar los días.', today: d => 'Hoy · ' + d, dayT: (n, t) => 'Día ' + n + ': ' + t,
      todayDone: 'El día de hoy está completado. ¡Bien hecho!', tapDay: 'Toca el día para leer.', of: n => 'de ' + n,
      myStart: 'Mi fecha de inicio', week: 'Semana', dayRange: (a, b) => 'Día ' + a + '–' + b, selected: 'Día elegido', todayL: 'Hoy', doneL: 'Completado',
      allDays: 'Todos los días', readOf: (a, b) => a + ' de ' + b + ' completados', dayOf: (n, m) => 'Día ' + n + ' de ' + m,
      verses: 'Versículos del día', readAll: n => n === 2 ? 'Leer ambos' : 'Leer los ' + n, copy: 'Copiar', nextV: 'Siguiente →', firstV: 'Primero ↺',
      openBible: 'Leer en la Biblia', showAll: 'Mostrar todo el texto', step: 'Paso de hoy', prayFor: 'Ora por', prayer: 'Oración', notes: n => 'Mis notas del día ' + n,
      notesPh: '¿Qué te muestra Dios hoy?', markDone: n => 'Marcar el día ' + n + ' como completado', undo: '✓ Completado – deshacer', prev: n => '← Día ' + n, next: n => 'Día ' + n + ' →',
      dayDone: n => 'Día ' + n + ' completado', allDone: n => '¡Los ' + n + ' días completados!', celebrateT: n => '¡Has completado los ' + n + ' días!',
      celebrateP: 'Da gracias a Dios por lo que ha hecho. Escribe los cambios que has visto y comparte tu testimonio con alguien.',
      copied: 'Versículo copiado', noCopy: 'No se pudo copiar aquí', linkCopied: 'Enlace copiado', noLink: 'No se pudo copiar el enlace aquí',
      startSaved: 'Fecha de inicio guardada', about: 'Sobre el plan', bigIdea: 'La gran idea', themes: 'Temas centrales', structure: 'Estructura del plan',
      others: 'Más planes de lectura', othersP: 'Leer más', loading: 'Cargando el plan …', notFound: 'No se encontró el plan',
      notFoundP: 'Puede que el enlace sea incorrecto o que el plan aún no esté publicado.', back: 'Todos los planes', excerpt: 'extracto',
      loadingV: 'Cargando el texto bíblico …', noV: 'No se pudo cargar el texto aquí. Ábrelo en la Biblia.', moreCh: n => '+ ' + n + (n === 1 ? ' capítulo más' : ' capítulos más') + ' – sigue en la Biblia',
      buy: 'Comprar la versión impresa', print: 'Imprimir', behind: n => 'Vas ' + n + (n === 1 ? ' día' : ' días') + ' atrasado.', jump: n => 'Ir al día ' + n,
      resources: 'Recursos', onlyNo: 'Este plan aún no está traducido, así que el texto está en noruego. Los versículos se muestran en español.', listUrl: '/es/leseplaner', bibleUrl: '/es/bibel.html', planUrl: '/es/detalles-plan-lectura',
      MON: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
      MS: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'],
      WD: ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'], fmt: (d, M) => d.getDate() + ' de ' + M[d.getMonth()]
    }
  }[LANG];

  /* Planer som selges i butikken, og ekstra lenker per plan */
  const SHOP = { '21-dager-bonn-og-faste': 'https://hiskingdomdesigns.no/produkt/77f0ae24-0f07-fc56-99f6-fd8d15e6170a' };
  const EXTRA = {
    '21-dager-bonn-og-faste': {
      no: { url: '/blogg-post.html?id=item-1795125986813-h8n6uapai', t: 'Les undervisningen om faste', d: 'Hva bibelsk faste er, hvorfor vi faster og hvordan du kommer trygt i gang.' }
    }
  };
  const DEFAULT_START = { '21-dager-bonn-og-faste': '2027-01-04' };
  const BIBLE = { no: { id: 'OPENBIBLE_NB', name: 'Open Translation Bible (OTB)', lic: 'CC BY-SA 4.0', licUrl: 'https://creativecommons.org/licenses/by-sa/4.0/' },
    en: { id: 'WEB', name: 'World English Bible (WEB)', lic: 'Public domain', licUrl: '' },
    es: { id: 'RV1960', name: 'Reina-Valera 1960', lic: '', licUrl: '' } }[LANG];

  const ICON_BOOK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/></svg>';
  const $ = s => root.querySelector(s), $$ = s => [...root.querySelectorAll(s)];
  const esc = t => String(t == null ? '' : t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const toast = m => { const t = document.getElementById('pv-toast'); if (!t) return; t.textContent = m; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 1800); };
  const fmt = d => T.fmt(d, T.MON), fmtS = d => T.fmt(d, T.MS);
  const reduced = matchMedia('(prefers-reduced-motion:reduce)').matches;

  /* ---------- tilstand ---------- */
  function state(msg, loading) {
    root.innerHTML = `<div class="pvstate">${loading ? '<div class="pvspin"></div>' : ''}<b>${esc(msg[0])}</b>${msg[1] ? `<p>${esc(msg[1])}</p>` : ''}${msg[2] ? `<p><a class="pill" href="${T.listUrl}">${esc(T.back)}</a></p>` : ''}</div>`;
  }
  state([T.loading], true);
  const headEl = document.getElementById('header');
  const setHead = () => { const h = headEl ? Math.round(headEl.getBoundingClientRect().bottom) : 84; root.style.setProperty('--pv-head', Math.max(56, Math.min(h, 140)) + 'px'); };
  setHead(); addEventListener('resize', setHead, { passive: true });
  if (headEl && window.ResizeObserver) new ResizeObserver(setHead).observe(headEl);

  let service = window.firebaseService;
  for (let i = 0; !service && i < 100; i++) { await new Promise(r => setTimeout(r, 50)); service = window.firebaseService; }
  const params = new URLSearchParams(location.search);
  const planId = params.get('id');
  if (!planId || !service) { state([T.notFound, T.notFoundP, 1]); return; }

  let raw, realId = planId, all = null;
  try {
    raw = await service.getDoc('reading_plans', planId);
    if (!raw) {
      all = await service.getCollection('reading_plans');
      const f = all.find(p => (p.id || '').toLowerCase() === planId.toLowerCase() || p.slug === planId);
      if (f) { raw = f; realId = f.id; }
    }
  } catch (e) { console.error('Leseplan:', e); }
  if (!raw) { state([T.notFound, T.notFoundP, 1]); return; }
  let plan = { id: realId, ...raw };
  if (window.contentManager && window.contentManager.getLocalizedContentItem) {
    try { plan = window.contentManager.getLocalizedContentItem(plan, LANG); } catch (e) { }
  }
  // Oversatte dagtekster ligger i et eget dokument (store planer får ikke plass i plan-dokumentet).
  if (LANG !== 'no') {
    try {
      const ready = () => !!(window.firebase && firebase.apps && firebase.apps.length && typeof firebase.firestore === 'function');
      if (!ready() && typeof service.waitForInitialization === 'function') await service.waitForInitialization(8000);
      if (ready()) {
        const snap = await firebase.firestore().doc('siteContent/readingPlanTranslations/items/' + realId + '__' + LANG).get();
        const td = snap.exists ? (snap.data().days || []) : [];
        if (td.length) {
          plan.days = (plan.days || []).map(d => {
            const t = td.find(x => x.dayNumber === d.dayNumber);
            if (!t) return d;
            return { ...d, prayerFocus: t.prayerFocus || d.prayerFocus, resources: (d.resources || []).map((r, i) => ({ ...r, title: (t.resources && t.resources[i] && t.resources[i].title) || r.title })) };
          });
        }
      }
    } catch (e) { console.warn('Oversatte dagtekster:', e); }
  }


  /* ---------- tekstbehandling ---------- */
  function sanitize(html) {
    const allowed = new Set(['P', 'STRONG', 'B', 'EM', 'I', 'UL', 'OL', 'LI', 'BR', 'H3', 'H4', 'BLOCKQUOTE']);
    const doc = new DOMParser().parseFromString('<div>' + html + '</div>', 'text/html');
    const r = doc.body.firstChild;
    (function walk(n) {
      [...n.childNodes].forEach(ch => {
        if (ch.nodeType === 1) { walk(ch); if (!allowed.has(ch.tagName)) ch.replaceWith(...ch.childNodes); else [...ch.attributes].forEach(a => ch.removeAttribute(a.name)); }
        else if (ch.nodeType !== 3) ch.remove();
      });
    })(r);
    return r;
  }
  const RX_TITLE = /^\s*(?:dag|day|día|dia)\s*\d+\s*[:.\-–—]\s*(.+)$/i;
  const RX_STEP = /^\s*(?:dagens steg|today[’']?s step|paso de hoy)\s*:\s*/i;
  const RX_PRAY = /^\s*(?:be for|pray for|ora por|oremos por)\s*:?\s*$/i;
  const RX_PRAYER = /^\s*(?:be\s*\/\s*reflekter|bønn|be|pray\s*\/\s*reflect|prayer|pray|ora\s*\/\s*reflexiona|oración|ora)\s*:\s*/i;

  function parseDay(d) {
    const out = { n: d.dayNumber, verses: (d.verses || '').trim(), title: (d.title || '').trim(), body: '', step: '', pray: [], prayer: '', resources: Array.isArray(d.resources) ? d.resources : [] };
    let txt = d.prayerFocus || d.devotionalText || '';
    if (!/<\/?[a-z][^>]*>/i.test(txt)) {
      // ren tekst → avsnitt
      const paras = txt.split(/\n\s*\n/).map(s => s.trim()).filter(Boolean);
      txt = paras.map(p => {
        const lines = p.split('\n').map(s => s.trim());
        if (lines.length > 1 && lines.slice(1).every(l => /^[•\-*]/.test(l))) return `<p>${esc(lines[0])}</p><ul>${lines.slice(1).map(l => `<li>${esc(l.replace(/^[•\-*]\s*/, ''))}</li>`).join('')}</ul>`;
        return `<p>${esc(p).replace(/\n/g, '<br>')}</p>`;
      }).join('');
    }
    const r = sanitize(txt);
    const kids = [...r.children];
    const keep = [];
    for (let i = 0; i < kids.length; i++) {
      const el = kids[i], t = el.textContent.trim();
      if (el.tagName === 'P') {
        const strongOnly = el.children.length === 1 && /^(STRONG|B)$/.test(el.children[0].tagName) && el.children[0].textContent.trim() === t;
        if (!out.title && i === 0 && strongOnly && RX_TITLE.test(t)) { out.title = t.match(RX_TITLE)[1].trim(); continue; }
        if (i === 0 && strongOnly && RX_TITLE.test(t)) continue;
        if (RX_STEP.test(t)) { out.step = t.replace(RX_STEP, '').trim(); continue; }
        if (RX_PRAY.test(t) && kids[i + 1] && /^(UL|OL)$/.test(kids[i + 1].tagName)) { out.pray = [...kids[i + 1].children].map(li => li.textContent.trim()).filter(Boolean); i++; continue; }
        const emOnly = el.children.length === 1 && /^(EM|I)$/.test(el.children[0].tagName) && el.children[0].textContent.trim() === t;
        if (RX_PRAYER.test(t) && (emOnly || !out.prayer)) { out.prayer = t.replace(RX_PRAYER, '').trim(); continue; }
      }
      keep.push(el.outerHTML);
    }
    out.body = keep.join('');
    out.refs = parseRefs(out.verses);
    // «Møte med Guds Ord (1. Mosebok 1-3 & Matteus 1)»: avsnittene står allerede i fanene under.
    const tm = out.title.match(/^(.*\S)\s*\(([^()]*\d[^()]*)\)\s*$/);
    out.heading = out.title;
    if (tm && out.refs.length && parseRefs(tm[2]).some(r => r.book)) { out.heading = tm[1]; out.title = refsTitle(out.refs.filter(r => r.label)) || tm[1]; }
    if (!out.title || out.title === out.verses) out.title = refsTitle(out.refs.filter(r => r.label)) || out.verses || ('Dag ' + d.dayNumber);
    return out;
  }

  function buildSections() {
    const st = (plan.introduction && plan.introduction.structure) || [];
    const rx = /(?:dag|day|día|dia)s?\s*(\d+)\s*[-–—]\s*(\d+)/i;
    const secs = st.map(s => { const m = String(s.range || '').match(rx); return m ? { from: +m[1], to: +m[2], name: s.title || '' } : null; }).filter(Boolean);
    let ok = secs.length > 1 && secs[0].from === 1 && secs[secs.length - 1].to === N && secs.every((s, i) => s.to >= s.from && s.to - s.from < 31 && (i === 0 || s.from === secs[i - 1].to + 1));
    if (ok) return secs.map((s, i) => ({ ...s, label: (secs.length <= 8 && secs.every(x => x.to - x.from === 6) ? T.week + ' ' + (i + 1) + ' · ' : '') + T.dayRange(s.from, s.to) }));
    const out = [];
    for (let i = 0; i * 7 < N; i++) out.push({ from: i * 7 + 1, to: Math.min(N, i * 7 + 7), name: T.week + ' ' + (i + 1), label: T.dayRange(i * 7 + 1, Math.min(N, i * 7 + 7)) });
    return out;
  }
  const secOf = n => SECTIONS.findIndex(s => n >= s.from && n <= s.to);

  /* ---------- bibelreferanser ---------- */
  const BOOKS = {
    "1 mosebok": 1, "1mos": 1, "1 mos": 1, "1 mose": 1, "genesis": 1, "gen": 1, "génesis": 1,
    "2 mosebok": 2, "2mos": 2, "2 mos": 2, "2 mose": 2, "exodus": 2, "exod": 2, "exo": 2, "éxodo": 2,
    "3 mosebok": 3, "3mos": 3, "3 mos": 3, "3 mose": 3, "leviticus": 3, "lev": 3, "levítico": 3,
    "4 mosebok": 4, "4mos": 4, "4 mos": 4, "4 mose": 4, "numbers": 4, "num": 4, "números": 4,
    "5 mosebok": 5, "5mos": 5, "5 mos": 5, "5 mose": 5, "deuteronomy": 5, "deut": 5, "deuteronomio": 5,
    "josva": 6, "jos": 6, "joshua": 6, "josué": 6, "dommerne": 7, "dom": 7, "judges": 7, "jueces": 7,
    "rut": 8, "ruts bok": 8, "ruth": 8, "1 samuelsbok": 9, "1 sam": 9, "1sam": 9, "1 samuel": 9, "2 samuelsbok": 10, "2 sam": 10, "2sam": 10, "2 samuel": 10,
    "1 kongebok": 11, "1 kong": 11, "1kong": 11, "1 kings": 11, "1 reyes": 11, "2 kongebok": 12, "2 kong": 12, "2kong": 12, "2 kings": 12, "2 reyes": 12,
    "1 krønikebok": 13, "1 krøn": 13, "1krøn": 13, "1 chronicles": 13, "1 crónicas": 13, "2 krønikebok": 14, "2 krøn": 14, "2krøn": 14, "2 chronicles": 14, "2 crónicas": 14,
    "esra": 15, "ezra": 15, "esdras": 15, "nehemja": 16, "neh": 16, "nehemiah": 16, "nehemías": 16, "ester": 17, "est": 17, "esther": 17,
    "job": 18, "jobs bok": 18, "salmene": 19, "sal": 19, "salme": 19, "salmenes bok": 19, "psalms": 19, "psalm": 19, "ps": 19, "salmos": 19,
    "ordspråkene": 20, "ordspr": 20, "ords": 20, "ord": 20, "salomos ordspråk": 20, "proverbs": 20, "prov": 20, "proverbios": 20,
    "forkynneren": 21, "fork": 21, "ecclesiastes": 21, "eclesiastés": 21, "høysangen": 22, "høys": 22, "song of songs": 22, "song of solomon": 22, "cantares": 22,
    "jesaja": 23, "jes": 23, "isaiah": 23, "isa": 23, "isaías": 23, "jeremia": 24, "jer": 24, "jeremiah": 24, "jeremías": 24, "klagesangene": 25, "klag": 25, "lamentations": 25, "lamentaciones": 25,
    "esekiel": 26, "esek": 26, "ezekiel": 26, "ezequiel": 26, "daniel": 27, "dan": 27, "hosea": 28, "hos": 28, "oseas": 28, "joel": 29, "amos": 30, "amós": 30,
    "obadja": 31, "obadiah": 31, "abdías": 31, "jona": 32, "jonah": 32, "jonás": 32, "mika": 33, "micah": 33, "miqueas": 33, "nahum": 34, "nahúm": 34,
    "habakkuk": 35, "hab": 35, "habacuc": 35, "sefanja": 36, "zephaniah": 36, "sofonías": 36, "haggai": 37, "hag": 37, "hageo": 37,
    "sakarja": 38, "sak": 38, "zechariah": 38, "zacarías": 38, "malaki": 39, "mal": 39, "malachi": 39, "malaquías": 39,
    "matteus": 40, "matt": 40, "mat": 40, "matthew": 40, "mateo": 40, "markus": 41, "mark": 41, "mark.": 41, "marcos": 41, "lukas": 42, "luk": 42, "luke": 42, "lucas": 42,
    "johannes": 43, "joh": 43, "john": 43, "juan": 43, "apostlenes gjerninger": 44, "apg": 44, "acts": 44, "hechos": 44,
    "romerne": 45, "rom": 45, "romans": 45, "romanos": 45, "1 korinter": 46, "1 kor": 46, "1kor": 46, "1 corinthians": 46, "1 corintios": 46,
    "2 korinter": 47, "2 kor": 47, "2kor": 47, "2 corinthians": 47, "2 corintios": 47, "galaterne": 48, "gal": 48, "galatians": 48, "gálatas": 48,
    "efeserne": 49, "ef": 49, "ephesians": 49, "efesios": 49, "filipperne": 50, "fil": 50, "philippians": 50, "filipenses": 50,
    "kolosserne": 51, "kol": 51, "colossians": 51, "colosenses": 51, "1 tessaloniker": 52, "1 tess": 52, "1 thessalonians": 52, "1 tesalonicenses": 52,
    "2 tessaloniker": 53, "2 tess": 53, "2 thessalonians": 53, "2 tesalonicenses": 53, "1 timoteus": 54, "1 tim": 54, "1 timothy": 54, "1 timoteo": 54,
    "2 timoteus": 55, "2 tim": 55, "2 timothy": 55, "2 timoteo": 55, "titus": 56, "tit": 56, "tito": 56, "filemon": 57, "philemon": 57, "filemón": 57,
    "hebreerne": 58, "hebr": 58, "heb": 58, "hebrews": 58, "hebreos": 58, "jakob": 59, "jak": 59, "jakobs brev": 59, "james": 59, "santiago": 59,
    "1 peter": 60, "1 pet": 60, "1 peters brev": 60, "1 pedro": 60, "2 peter": 61, "2 pet": 61, "2 peters brev": 61, "2 pedro": 61,
    "1 johannes": 62, "1 joh": 62, "1 john": 62, "1 juan": 62, "2 johannes": 63, "2 joh": 63, "2 john": 63, "2 juan": 63, "3 johannes": 64, "3 joh": 64, "3 john": 64, "3 juan": 64,
    "judas": 65, "jud": 65, "jude": 65, "åpenbaringen": 66, "åp": 66, "johannes åpenbaring": 66, "revelation": 66, "rev": 66, "apocalipsis": 66
  };
  const bookId = name => {
    let k = name.toLowerCase().replace(/\./g, ' ').replace(/\s+/g, ' ').trim();
    k = k.replace(/^(\d)\s*/, '$1 ');
    return BOOKS[k] || BOOKS[k.replace(/ /g, '')] || null;
  };
  function parseRefs(str) {
    if (!str) return [];
    const parts = str.split(/\s*(?:&|;|\bog\b|\band\b|\by\b)\s*/i).flatMap(p => p.split(/,\s*(?=\d?\s*\.?\s*[A-Za-zÆØÅæøåÁÉÍÓÚÑáéíóúñ])/));
    const out = []; let lastBook = null, lastName = '';
    parts.map(p => p.trim()).filter(Boolean).forEach(p => {
      let m = p.match(/^((?:\d\s*\.?\s*)?[A-Za-zÆØÅæøåÁÉÍÓÚÑáéíóúñü][A-Za-zÆØÅæøåÁÉÍÓÚÑáéíóúñü\s.]*?)\s*(\d+)(.*)$/);
      let name, ch, rest;
      let inherited = false;
      if (m) { name = m[1].trim(); ch = +m[2]; rest = m[3].trim(); }
      else if (lastBook && (m = p.match(/^(\d+)(.*)$/))) { name = lastName; ch = +m[1]; rest = m[2].trim(); inherited = true; }
      else { out.push({ label: p, book: null }); return; }
      const b = bookId(name);
      lastBook = b; lastName = name;
      const r = { label: p.replace(/\s+/g, ' '), book: b, name, ch, chTo: ch, vFrom: null, vTo: null };
      let mm;
      if ((mm = rest.match(/^[:,.]\s*(\d+)\s*(?:[-–—]\s*(\d+))?/))) { r.vFrom = +mm[1]; r.vTo = mm[2] ? +mm[2] : +mm[1]; }
      else if ((mm = rest.match(/^[-–—]\s*(\d+)/))) { r.chTo = +mm[1]; }
      if (inherited) r.label = name + ' ' + p.replace(/\s+/g, ' ');
      out.push(r);
    });
    return out;
  }
  const BOOKNAMES = { en: 'Genesis|Exodus|Leviticus|Numbers|Deuteronomy|Joshua|Judges|Ruth|1 Samuel|2 Samuel|1 Kings|2 Kings|1 Chronicles|2 Chronicles|Ezra|Nehemiah|Esther|Job|Psalm|Proverbs|Ecclesiastes|Song of Songs|Isaiah|Jeremiah|Lamentations|Ezekiel|Daniel|Hosea|Joel|Amos|Obadiah|Jonah|Micah|Nahum|Habakkuk|Zephaniah|Haggai|Zechariah|Malachi|Matthew|Mark|Luke|John|Acts|Romans|1 Corinthians|2 Corinthians|Galatians|Ephesians|Philippians|Colossians|1 Thessalonians|2 Thessalonians|1 Timothy|2 Timothy|Titus|Philemon|Hebrews|James|1 Peter|2 Peter|1 John|2 John|3 John|Jude|Revelation'.split('|'), es: 'Génesis|Éxodo|Levítico|Números|Deuteronomio|Josué|Jueces|Rut|1 Samuel|2 Samuel|1 Reyes|2 Reyes|1 Crónicas|2 Crónicas|Esdras|Nehemías|Ester|Job|Salmos|Proverbios|Eclesiastés|Cantares|Isaías|Jeremías|Lamentaciones|Ezequiel|Daniel|Oseas|Joel|Amós|Abdías|Jonás|Miqueas|Nahúm|Habacuc|Sofonías|Hageo|Zacarías|Malaquías|Mateo|Marcos|Lucas|Juan|Hechos|Romanos|1 Corintios|2 Corintios|Gálatas|Efesios|Filipenses|Colosenses|1 Tesalonicenses|2 Tesalonicenses|1 Timoteo|2 Timoteo|Tito|Filemón|Hebreos|Santiago|1 Pedro|2 Pedro|1 Juan|2 Juan|3 Juan|Judas|Apocalipsis'.split('|') }[LANG] || null;
  const SEP = { no: ':', en: ':', es: ':' }[LANG];
  // Visningsnavn for et avsnitt på sidens språk (adressen til Bibelen bruker fortsatt originalteksten).
  function refShow(r) {
    if (!r.book || !BOOKNAMES) return r.label;
    const b = BOOKNAMES[r.book - 1];
    if (r.vFrom) return b + ' ' + r.ch + SEP + r.vFrom + (r.vTo > r.vFrom ? '–' + r.vTo : '');
    return b + ' ' + r.ch + (r.chTo > r.ch ? '–' + r.chTo : '');
  }
  // Kort tittel av avsnittene: «Matteus 1 & Matteus 2» blir «Matteus 1–2».
  function refsTitle(refs) {
    if (!refs.length) return '';
    const out = [];
    refs.forEach(r => {
      const last = out[out.length - 1];
      if (last && r.book && last.book === r.book && !r.vFrom && !last.vFrom && r.ch === last.chTo + 1) { last.chTo = r.chTo; return; }
      out.push({ ...r });
    });
    return out.map(r => {
      if (BOOKNAMES || !r.book) return refShow(r);
      if (r.vFrom) return r.name + ' ' + r.ch + ':' + r.vFrom + (r.vTo > r.vFrom ? '–' + r.vTo : '');
      return r.name + ' ' + r.ch + (r.chTo > r.ch ? '–' + r.chTo : '');
    }).join(' · ');
  }
  const bibleHref = r => T.bibleUrl + '?ref=' + encodeURIComponent(r.label);
  const chapCache = new Map();
  async function chapter(book, ch) {
    const key = BIBLE.id + ':' + book + ':' + ch;
    if (chapCache.has(key)) return chapCache.get(key);
    const p = (async () => {
      try { const c = sessionStorage.getItem('hkmpv:' + key); if (c) return JSON.parse(c); } catch (e) { }
      const res = await fetch(`/api/bible/bibles/${BIBLE.id}/chapters/${book}_${ch}`);
      if (!res.ok) throw new Error('bible ' + res.status);
      const j = await res.json();
      const vs = ((j.data && j.data.verses) || []).map(v => [Number(v.verse), String(v.text || '').replace(/<[^>]+>/g, '')]).filter(v => v[0] && v[1]);
      if (!vs.length) throw new Error('empty');
      try { sessionStorage.setItem('hkmpv:' + key, JSON.stringify(vs)); } catch (e) { }
      return vs;
    })();
    chapCache.set(key, p);
    p.catch(() => chapCache.delete(key));
    return p;
  }
  const MAXCH = 3;
  async function passage(r) {
    if (!r.book) return null;
    if (r.vFrom) { const vs = await chapter(r.book, r.ch); return { groups: [{ ch: null, v: vs.filter(v => v[0] >= r.vFrom && v[0] <= r.vTo) }], more: 0, num: r.vTo > r.vFrom }; }
    const last = Math.min(r.chTo, r.ch + MAXCH - 1), groups = [];
    for (let c = r.ch; c <= last; c++) groups.push({ ch: r.chTo > r.ch ? c : null, v: await chapter(r.book, c) });
    return { groups, more: r.chTo - last, num: true };
  }

  const DAYS = (plan.days || []).slice().sort((a, b) => (a.dayNumber || 0) - (b.dayNumber || 0)).map(parseDay);
  const N = DAYS.length;
  if (!N) { state([plan.title || T.notFound, '']); return; }
  const titleL = (plan.title || '').toLowerCase();
  const isPrayer = /bønn|faste|prayer|fasting|oración|ayuno/.test(titleL) || /bønn|prayer/.test((plan.category || '').toLowerCase());
  const SECTIONS = buildSections();

  /* ---------- fremgang ---------- */
  const PWA = 'hkm_reading_plan_progress_' + plan.id, OLD = 'hkm_plan_' + plan.id + '_completed', NS = 'hkmpv:' + plan.id + ':';
  const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) { } } };
  const S = { get: k => ls.get(NS + k), set: (k, v) => ls.set(NS + k, v) };
  function loadDone() {
    try { const p = JSON.parse(ls.get(PWA) || 'null'); if (p && Array.isArray(p.completedDays)) return p.completedDays.map(Number); } catch (e) { }
    try { const o = JSON.parse(ls.get(OLD) || 'null'); if (Array.isArray(o)) return o.map(Number); } catch (e) { }
    if (plan.id === '21-dager-bonn-og-faste') { try { const o = JSON.parse(ls.get('hkmplan21v2:done') || 'null'); if (Array.isArray(o)) return o.map(Number); } catch (e) { } }
    return [];
  }
  let done = new Set(loadDone().filter(n => n >= 1 && n <= N));
  const isoToday = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  let start = S.get('start') || DEFAULT_START[plan.id] || null;
  if (!start) { start = isoToday(); S.set('start', start); }
  function saveLocal() {
    const arr = [...done].sort((a, b) => a - b);
    ls.set(OLD, JSON.stringify(arr.map(String)));
    let p = null; try { p = JSON.parse(ls.get(PWA) || 'null'); } catch (e) { }
    p = p || { planId: plan.id, currentDay: 1, completedDays: [], reflections: {} };
    p.completedDays = arr; ls.set(PWA, JSON.stringify(p));
  }
  const fbReady = () => !!(window.firebase && firebase.apps && firebase.apps.length && typeof firebase.auth === 'function' && typeof firebase.firestore === 'function');
  let userRef = null, remote = null;
  async function saveRemote() {
    if (!userRef) return;
    try {
      const arr = [...done].sort((a, b) => a - b);
      const data = { planId: plan.id, completedDays: arr, lastActiveAt: firebase.firestore.FieldValue.serverTimestamp() };
      if (!remote) { data.currentDay = 1; data.reflections = {}; data.startedAt = new Date(start + 'T12:00:00'); }
      await userRef.set(data, { merge: true });
      remote = remote || data;
    } catch (e) { console.warn('Kunne ikke lagre fremgang på Min side:', e); }
  }
  function hookAuth() {
    const go = () => firebase.auth().onAuthStateChanged(async user => {
      if (!user) { userRef = null; return; }
      try {
        userRef = firebase.firestore().collection('users').doc(user.uid).collection('reading_plans').doc(plan.id);
        const snap = await userRef.get();
        if (snap.exists) {
          remote = snap.data() || {};
          if (Array.isArray(remote.completedDays)) { remote.completedDays.map(Number).forEach(n => n >= 1 && n <= N && done.add(n)); saveLocal(); }
          const sa = remote.startedAt && (remote.startedAt.toDate ? remote.startedAt.toDate() : new Date(remote.startedAt));
          if (sa && !isNaN(sa) && !S.get('startManual')) { start = sa.getFullYear() + '-' + String(sa.getMonth() + 1).padStart(2, '0') + '-' + String(sa.getDate()).padStart(2, '0'); S.set('start', start); const inp = $('#pv-start'); if (inp) inp.value = start; }
          const m = (location.hash || '').match(/^#dag-(\d+)$/);
          show(m ? cur : defaultDay(), false, true);
        }
      } catch (e) { console.warn('Fremgang fra Min side:', e); }
    });
    if (fbReady()) { try { go(); } catch (e) { } return; }
    if (service && typeof service.waitForInitialization === 'function') service.waitForInitialization(30000).then(ok => { if (ok && fbReady()) { try { go(); } catch (e) { } } }).catch(() => { });
  }

  const dayDate = n => { const d = new Date(start + 'T12:00:00'); d.setDate(d.getDate() + n - 1); return d; };
  function todayIdx() { const t = new Date(); t.setHours(12, 0, 0, 0); return Math.round((t - new Date(start + 'T12:00:00')) / 864e5) + 1; }
  const defaultDay = () => { const ti = todayIdx(); if (ti >= 1 && ti <= N) return ti; if (ti > N) { for (let i = 1; i <= N; i++) if (!done.has(i)) return i; return N; } return 1; };
  let cur = 1, sec = 0;

  /* ---------- sideoppsett ---------- */
  const intro = plan.introduction || null;
  const minutes = plan.estimatedMinutes || (/sprint/.test(titleL) ? '30–40' : (/historisk|kronologisk|balansert|chronolog|balanced/.test(titleL) ? '15–20' : '10'));
  const shopUrl = (typeof raw.shopUrl === 'string' && /^https:\/\//.test(raw.shopUrl) && raw.shopUrl) || SHOP[plan.id] || '';
  const pdfUrl = !shopUrl && raw.printPdf && (raw.printPdf[LANG] || raw.printPdf.no) || '';
  const extra = EXTRA[plan.id] && (EXTRA[plan.id][LANG] || null);
  const TR = LANG === 'no' ? null : ((raw.translations && raw.translations[LANG]) || (LANG === 'en' && raw.english) || null);
  const translated = LANG === 'no' || !!(TR && (TR.title || (Array.isArray(TR.days) && TR.days.length)));
  const category = LANG === 'no' ? plan.category : (TR && TR.category) || '';
  const eyebrow = (isPrayer ? T.prayerPlan : T.plan) + (category ? ' · ' + category : '');
  const lead = plan.description || plan.subtitle || '';
  const nWeeks = Math.ceil(N / 7);

  document.title = (plan.title || T.plan) + ' | His Kingdom Ministry';
  const md = document.querySelector('meta[name="description"]'); if (md && lead) md.setAttribute('content', lead.slice(0, 160));

  root.innerHTML = `
<div class="wrap" id="pv-top">
<div>
<header class="head">
<p class="eyebrow"><a href="${T.listUrl}">${esc(eyebrow)}</a></p>
<h1>${esc(plan.title || '')}</h1>
${lead ? `<p class="lead">${esc(lead)}</p>` : ''}
<ul class="meta">
<li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>${esc(T.days(N))}${N >= 7 && N % 7 === 0 && N <= 70 ? ' · ' + esc(T.weeks(nWeeks)) : ''}</li>
<li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>${esc(T.perDay(minutes))}</li>
<li>${ICON_BOOK}${esc(T.versesOnPage)}</li>
</ul>
${!translated && T.onlyNo ? `<p class="small trnote">${esc(T.onlyNo)}</p>` : ''}
<div class="headtools">
<button type="button" class="pill" data-share><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7"/><path d="M16 6l-4-4-4 4"/><path d="M12 2v13"/></svg>${esc(T.share)}</button>
${shopUrl ? `<a class="pill" href="${esc(shopUrl)}" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 7h12l-1 13H7z"/><path d="M9 7a3 3 0 0 1 6 0"/></svg>${esc(T.buy)}</a>` : ''}
${pdfUrl ? `<a class="pill" href="${esc(pdfUrl)}" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V3h12v6"/><rect x="4" y="9" width="16" height="8" rx="2"/><path d="M7 15h10v6H7z"/></svg>${esc(T.print)}</a>` : ''}
</div>
${intro && (intro.bigIdea || intro.description || (intro.themes || []).length) ? `<details class="about"><summary>${esc(T.about)}</summary><div class="ab">
${intro.bigIdea ? `<div class="bigidea"><span class="lbl">${esc(T.bigIdea)}</span><p>${esc(intro.bigIdea)}</p></div>` : ''}
${intro.description ? `<p>${esc(intro.description)}</p>` : ''}
${(intro.themes || []).length ? `<h3>${esc(T.themes)}</h3><ul>${intro.themes.map(t => `<li><b>${esc(t.title)}</b><span>${esc(t.description)}</span></li>`).join('')}</ul>` : ''}
${(intro.structure || []).length ? `<h3>${esc(T.structure)}</h3><ul>${intro.structure.map(s => `<li><b>${esc(s.range)}${s.title ? ' · ' + esc(s.title) : ''}</b>${s.description ? `<span>${esc(s.description)}</span>` : ''}</li>`).join('')}</ul>` : ''}
</div></details>` : ''}
</header>

<div class="hero plan rv" aria-live="polite">
<svg class="shape" viewBox="0 0 800 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><path d="M560 -80C720 -70 840 40 815 170 792 290 660 320 570 260 480 200 500 110 440 60 380 10 430 -90 560 -80Z" fill="#cc712b" fill-opacity=".85"/></svg>
<div class="htxt"><small id="hSmall">${esc(T.progress)}</small><b id="hTitle"></b><span id="hSub"></span></div>
<div class="ring"><svg viewBox="0 0 120 120"><circle class="bg" cx="60" cy="60" r="52"/><circle class="fg" id="ringfg" cx="60" cy="60" r="52"/></svg><span class="num"><span><b id="ringN">0</b><i>${esc(T.of(N))}</i></span></span></div>
</div>
<div class="startrow"><label for="pv-start">${esc(T.myStart)}</label><input type="date" id="pv-start" value="${esc(start)}"></div>
<div class="sync" id="pv-sync"></div>

<div class="weeks" role="tablist" aria-label="${esc(T.week)}" id="weeks"></div>
<div class="days" id="days"></div>
<div class="legend"><span><i style="background:#151a21"></i>${esc(T.selected)}</span><span><i style="box-shadow:inset 0 0 0 2px #cc712b"></i>${esc(T.todayL)}</span><span><i style="background:#f7f3ee"></i>${esc(T.doneL)}</span></div>

<section class="day" id="dag" aria-live="polite"><div class="daywrap" id="daywrap"></div></section>
<div class="celebrate" id="celebrate"><b>${esc(T.celebrateT(N))}</b><p>${esc(T.celebrateP)}</p></div>
${extra ? `<a class="teach rv" href="${esc(extra.url)}"><span class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2zM22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z"/></svg></span><span><b>${esc(extra.t)}</b><span>${esc(extra.d)}</span></span></a>` : ''}
<div style="height:48px"></div>
</div>

<aside class="toc" id="toc">
<div class="stick">
<button type="button" class="pill dark tocbtn" id="tocbtn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h10"/></svg>${esc(T.allDays)}</button>
<div class="tocpanel">
<h4>${esc(T.allDays)}</h4>
<div id="toclist"></div>
<div class="tocprog"><span id="readtxt"></span><div class="meter"><span id="readbar"></span></div></div>
</div>
</div>
</aside>
<section class="others" id="pv-others" hidden><h2>${esc(T.others)}</h2><div class="ogrid" id="pv-ogrid"></div></section>
</div>`;
  if (!document.getElementById('pv-toast')) { const t = document.createElement('div'); t.id = 'pv-toast'; t.setAttribute('aria-live', 'polite'); t.style.cssText = ''; document.body.appendChild(t); }
  if (!document.getElementById('pv-prog')) { const p = document.createElement('div'); p.id = 'pv-prog'; document.body.appendChild(p); }

  /* ---------- tegning ---------- */
  function hero() {
    const n = done.size, ti = todayIdx(), C = 2 * Math.PI * 52;
    const fg = $('#ringfg'); fg.style.strokeDasharray = C; fg.style.strokeDashoffset = C * (1 - n / N);
    $('#ringN').textContent = n;
    if (ti < 1) { const s = dayDate(1); $('#hSmall').textContent = T.soon; $('#hTitle').textContent = T.starts(T.WD[s.getDay()], fmt(s)); $('#hSub').textContent = (1 - ti) === 1 ? T.tomorrow : T.inDays(1 - ti); }
    else if (ti > N) { $('#hSmall').textContent = T.over; $('#hTitle').textContent = T.doneOf(n, N); $('#hSub').textContent = T.stillRead; }
    else { $('#hSmall').textContent = T.today(fmt(dayDate(ti))); $('#hTitle').textContent = T.dayT(ti, DAYS[ti - 1].title); $('#hSub').textContent = done.has(ti) ? T.todayDone : T.tapDay; }
    $('#readtxt').textContent = T.readOf(n, N); $('#readbar').style.width = (n / N * 100) + '%';
    $('#celebrate').classList.toggle('on', n === N);
    syncHint();
  }
  function syncHint() {
    const box = $('#pv-sync'), ti = Math.min(todayIdx(), N);
    let last = 0; for (let i = 1; i <= N; i++) if (done.has(i)) last = i;
    const behind = ti - 1 - last;
    if (ti > 1 && last > 0 && behind >= 2 && cur !== ti) {
      box.innerHTML = `<span>${esc(T.behind(behind))}</span><button type="button" class="pill" id="pv-jump">${esc(T.jump(ti))}</button>`;
      box.classList.add('on'); $('#pv-jump').addEventListener('click', () => show(ti, true));
    } else { box.classList.remove('on'); box.innerHTML = ''; }
  }
  function renderWeeks() {
    $('#weeks').innerHTML = SECTIONS.map((s, i) => `<button type="button" class="wk" role="tab" aria-selected="${i === sec}" data-w="${i}"><small>${esc(s.label)}</small><span>${esc(s.name)}</span></button>`).join('');
    $$('.wk').forEach(b => b.addEventListener('click', () => { sec = +b.dataset.w; renderWeeks(); renderDays(); }));
    const on = $('.wk[aria-selected=true]'); if (on && on.scrollIntoView) { const w = $('#weeks'); w.scrollLeft = on.offsetLeft - w.offsetLeft - 8; }
  }
  function renderDays() {
    const ti = todayIdx(), s = SECTIONS[sec];
    let h = '';
    for (let n = s.from; n <= s.to; n++) {
      const d = DAYS[n - 1];
      h += `<button type="button" class="dbtn${done.has(n) ? ' done' : ''}${n === ti ? ' today' : ''}" aria-current="${n === cur}" data-n="${n}" aria-label="${esc(T.dayT(n, d.title))}${done.has(n) ? ', ' + esc(T.doneL) : ''}"><b>${n}</b><span>${esc(fmtS(dayDate(n)))}</span></button>`;
    }
    $('#days').innerHTML = h;
    $$('.dbtn').forEach(b => b.addEventListener('click', () => show(+b.dataset.n, true)));
  }
  function renderToc() {
    $('#toclist').innerHTML = SECTIONS.map(s => `<p class="wkh">${esc(s.name)}</p><div class="grp">` + DAYS.slice(s.from - 1, s.to).map((d, i) => { const n = s.from + i; return `<button type="button" class="tl${n === cur ? ' on' : ''}${done.has(n) ? ' read' : ''}" data-n="${n}"><span class="tick" aria-hidden="true"></span>${n}. ${esc(d.title)}</button>`; }).join('') + '</div>').join('');
    $$('.tl').forEach(b => b.addEventListener('click', () => { show(+b.dataset.n, true); $('#toc').classList.remove('open'); }));
    const on = $('.tl.on'), panel = $('.tocpanel');
    if (on && panel && panel.scrollHeight > panel.clientHeight + 4) {
      const pr = panel.getBoundingClientRect(), or = on.getBoundingClientRect();
      if (or.top < pr.top + 40 || or.bottom > pr.bottom - 40) panel.scrollTop += (or.top - pr.top) - panel.clientHeight / 2;
    }
  }
  function dayHTML(n) {
    const d = DAYS[n - 1], s = SECTIONS[secOf(n)], dt = dayDate(n), k = 's' + n, isDone = done.has(n);
    const refs = d.refs.filter(r => r.label);
    const res = (d.resources || []).filter(r => r && r.url && /^(https?:\/\/|\/)/.test(r.url));
    return `<div class="dhead"><span class="dnum">${String(n).padStart(2, '0')}</span><div><span class="dmeta">${esc(T.dayOf(n, N))} · ${esc(s.name)} · ${esc(T.WD[dt.getDay()])} ${esc(fmt(dt))}</span><h2>${esc(d.heading || d.title)}</h2></div></div>
  ${refs.length ? `<section class="word" aria-label="${esc(T.verses)}">
   <div class="wtabs" role="tablist" style="--n:${Math.min(refs.length, 3)}"${refs.length < 2 ? ' hidden' : ''}>${refs.map((r, i) => `<button type="button" class="wtab" role="tab" aria-selected="${i === 0}" data-i="${i}">${ICON_BOOK}${esc(refShow(r))}</button>`).join('')}${refs.length > 1 ? `<button type="button" class="wtab all" data-i="all">${esc(T.readAll(refs.length))}</button>` : ''}</div>
   <div class="wbody" id="wbody"></div>
   <div class="wfoot"><span>${esc(BIBLE.name)}${BIBLE.lic ? ' · ' + (BIBLE.licUrl ? `<a href="${BIBLE.licUrl}" target="_blank" rel="noopener">${esc(BIBLE.lic)}</a>` : esc(BIBLE.lic)) : ''}</span><span class="wbtns"><button type="button" class="wbtn" id="wcopy"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>${esc(T.copy)}</button><a class="wbtn" id="wopen" href="${esc(bibleHref(refs[0]))}">${ICON_BOOK}${esc(T.openBible)}</a>${refs.length > 1 ? `<button type="button" class="wbtn" id="wnext">${esc(T.nextV)}</button>` : ''}</span></div>
  </section>` : ''}
  ${d.body ? `<div class="dtext">${d.body}</div>` : ''}
  ${d.step ? `<label class="stepcard"><input type="checkbox" id="stepcb" ${S.get(k) === '1' ? 'checked' : ''}><span><span class="lbl">${esc(T.step)}</span><p>${esc(d.step)}</p></span></label>` : ''}
  ${d.pray.length || d.prayer ? `<div class="pray">${d.pray.length ? `<span class="lbl">${esc(T.prayFor)}</span><ul>${d.pray.map(p => `<li>${esc(p)}</li>`).join('')}</ul>` : ''}${d.prayer ? `${d.pray.length ? '<div style="height:12px"></div>' : ''}<span class="lbl">${esc(T.prayer)}</span><p>${esc(d.prayer)}</p>` : ''}</div>` : ''}
  ${res.length ? `<div class="res">${res.map(r => `<a class="teach" href="${esc(r.url)}" ${/^https?:/.test(r.url) ? 'target="_blank" rel="noopener"' : ''}><span class="ic">${r.type === 'video' ? '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>' : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2zM22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z"/></svg>'}</span><span><b>${esc(r.title || T.resources)}</b>${r.description ? `<span>${esc(r.description)}</span>` : ''}</span></a>`).join('')}</div>` : ''}
  <label class="notes write"><span>${esc(T.notes(n))}</span><textarea id="note" placeholder="${esc(T.notesPh)}">${esc(S.get('n' + n) || '')}</textarea></label>
  <div class="dnav">
   <button type="button" class="pill" id="prev" ${n === 1 ? 'disabled style="opacity:.4"' : ''}>${esc(T.prev(Math.max(1, n - 1)))}</button>
   <button type="button" class="pill donebtn${isDone ? ' is' : ''}" id="donebtn">${esc(isDone ? T.undo : T.markDone(n))}</button>
   <button type="button" class="pill" id="next" ${n === N ? 'disabled style="opacity:.4"' : ''}>${esc(T.next(Math.min(N, n + 1)))}</button>
  </div>`;
  }
  async function passHTML(r) {
    let p;
    try { p = await passage(r); } catch (e) { p = null; }
    if (!p || !p.groups.some(g => g.v.length)) return `<div class="wpass"><div class="wref"><b>${esc(refShow(r))}</b></div><p class="wload">${esc(T.noV)}</p><a class="wmore" href="${esc(bibleHref(r))}">${esc(T.openBible)} →</a></div>`;
    const long = p.groups.reduce((a, g) => a + g.v.length, 0) > 6;
    return `<div class="wpass${long ? ' long' : ''}"><div class="wref"><b>${esc(refShow(r))}</b></div>${p.groups.map(g => `${g.ch ? `<span class="wchap">${esc(BOOKNAMES && r.book ? BOOKNAMES[r.book - 1] : r.name)} ${g.ch}</span>` : ''}<p class="wtext">${g.v.map(([n, t]) => (p.num || g.v.length > 1 ? `<sup>${n}</sup>` : '') + esc(t)).join(' ')}</p>`).join('')}${p.more > 0 ? `<a class="wmore" href="${esc(bibleHref(r))}">${esc(T.moreCh(p.more))} →</a>` : ''}</div>`;
  }
  function bindWord(n) {
    const d = DAYS[n - 1], refs = d.refs.filter(r => r.label), body = $('#wbody');
    if (!body) return;
    const tabs = $$('.wtab'); let sel = 0, token = 0;
    const paint = async (i, anim) => {
      sel = i; const my = ++token;
      tabs.forEach(t => t.setAttribute('aria-selected', String(t.dataset.i === String(i))));
      const open = $('#wopen'); if (open) open.href = bibleHref(i === 'all' ? refs[0] : refs[i]);
      const nb = $('#wnext'); if (nb) { nb.style.visibility = i === 'all' ? 'hidden' : 'visible'; nb.textContent = i !== 'all' && i < refs.length - 1 ? T.nextV : T.firstV; }
      if (!body.firstElementChild) body.innerHTML = `<p class="wload">${esc(T.loadingV)}</p>`;
      const htmlP = Promise.all((i === 'all' ? refs : [refs[i]]).map(passHTML)).then(a => a.join(''));
      if (anim) { const p = body.firstElementChild; if (p) p.classList.add('swap'); }
      const [html] = await Promise.all([htmlP, anim ? new Promise(r => setTimeout(r, 160)) : null]);
      if (my !== token) return;
      body.innerHTML = html;
      const isLong = !!body.querySelector('.wpass.long');
      body.classList.toggle('long', isLong);
      const nv = body.querySelectorAll('.wtext sup').length;
      body.classList.toggle('clamp', nv > 10);
      if (nv > 10) {
        const more = document.createElement('button');
        more.type = 'button'; more.className = 'wexpand'; more.textContent = T.showAll;
        more.addEventListener('click', () => { body.classList.remove('clamp'); more.remove(); });
        body.appendChild(more);
      }
    };
    tabs.forEach(t => t.addEventListener('click', () => paint(t.dataset.i === 'all' ? 'all' : +t.dataset.i, true)));
    const nb = $('#wnext'); if (nb) nb.addEventListener('click', () => paint(sel === 'all' ? 0 : (sel + 1) % refs.length, true));
    $('#wcopy').addEventListener('click', async () => {
      const txt = [...body.querySelectorAll('.wpass')].map(p => { const ref = p.querySelector('.wref b').textContent; const t = [...p.querySelectorAll('.wtext')].map(x => { const c = x.cloneNode(true); c.querySelectorAll('sup').forEach(s => s.remove()); return c.textContent.trim(); }).join(' '); return t ? t + ' (' + ref + ')' : ''; }).filter(Boolean).join('\n\n');
      try { if (!txt) throw 0; await navigator.clipboard.writeText(txt); toast(T.copied); } catch (e) { toast(T.noCopy); }
    });
    let x0 = null; body.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
    body.addEventListener('touchend', e => { if (x0 === null || sel === 'all' || refs.length < 2) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 50) paint((sel + (dx < 0 ? 1 : refs.length - 1)) % refs.length, true); x0 = null; });
    paint(0, false);
  }
  function bindDay(n) {
    bindWord(n);
    const sc = $('#stepcb'); if (sc) sc.addEventListener('change', e => S.set('s' + n, e.target.checked ? '1' : '0'));
    $('#note').addEventListener('input', e => S.set('n' + n, e.target.value));
    $('#prev').addEventListener('click', () => n > 1 && show(n - 1, true));
    $('#next').addEventListener('click', () => n < N && show(n + 1, true));
    $('#donebtn').addEventListener('click', () => {
      if (done.has(n)) done.delete(n); else { done.add(n); toast(done.size === N ? T.allDone(N) : T.dayDone(n)); }
      saveLocal(); saveRemote(); show(n, false, true);
    });
  }
  function show(n, scroll, quiet) {
    cur = n; sec = Math.max(0, secOf(n));
    const w = $('#daywrap');
    const paint = () => { w.innerHTML = dayHTML(n); bindDay(n); w.classList.remove('swap'); };
    if (quiet || reduced) paint(); else { w.classList.add('swap'); setTimeout(paint, 180); }
    renderWeeks(); renderDays(); renderToc(); hero();
    try { history.replaceState(null, '', location.pathname + location.search + '#dag-' + n); } catch (e) { }
    if (scroll) $('#dag').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
  }

  $('#pv-start').addEventListener('change', e => {
    if (!e.target.value) return; start = e.target.value; S.set('start', start); S.set('startManual', '1');
    if (userRef && remote) { try { userRef.set({ startedAt: new Date(start + 'T12:00:00') }, { merge: true }); } catch (err) { } }
    show(cur, false, true); toast(T.startSaved);
  });
  const hm = (location.hash || '').match(/^#dag-(\d+)$/);
  const pd = +params.get('day');
  show(hm ? Math.min(N, Math.max(1, +hm[1])) : (pd >= 1 && pd <= N ? pd : defaultDay()), !!(hm || pd), true);
  addEventListener('hashchange', () => { const h = (location.hash || '').match(/^#dag-(\d+)$/); if (h && +h[1] !== cur) show(Math.min(N, Math.max(1, +h[1])), true); });
  hookAuth();

  /* del, innholdsliste på mobil, fremdriftslinje, animasjon */
  $$('[data-share]').forEach(b => b.addEventListener('click', async () => {
    const url = location.origin + location.pathname + location.search;
    if (navigator.share && matchMedia('(pointer:coarse)').matches) { try { await navigator.share({ title: plan.title, url }); return; } catch (e) { if (e && e.name === 'AbortError') return; } }
    try { await navigator.clipboard.writeText(url); toast(T.linkCopied); } catch (e) { toast(T.noLink); }
  }));
  const toc = $('#toc'); $('#tocbtn').addEventListener('click', () => toc.classList.add('open'));
  document.addEventListener('click', e => { if (toc.classList.contains('open') && !e.target.closest('.tocpanel') && !e.target.closest('#tocbtn')) toc.classList.remove('open'); });
  const rv = $$('.rv');
  const chk = () => { const H = innerHeight; rv.forEach(el => { if (el.getBoundingClientRect().top < H * .95) el.classList.add('in'); }); };
  addEventListener('scroll', () => { const h = document.documentElement; const p = document.getElementById('pv-prog'); if (p) p.style.width = (h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight) * 100) + '%'; chk(); }, { passive: true });
  chk(); setTimeout(chk, 200);

  /* flere leseplaner */
  try {
    const list = all || await service.getCollection('reading_plans');
    const others = list.filter(p => p.id !== plan.id && p.published !== false && p.status !== 'draft')
      .map(p => window.contentManager && window.contentManager.getLocalizedContentItem ? window.contentManager.getLocalizedContentItem(p, LANG) : p).slice(0, 3);
    if (others.length) {
      $('#pv-ogrid').innerHTML = others.map(p => `<a class="ocard" href="${T.planUrl}?id=${encodeURIComponent(p.id)}"><small>${esc(T.days(p.durationDays || (p.days || []).length))}</small><b>${esc(p.title || '')}</b>${p.description ? `<span>${esc(p.description)}</span>` : ''}</a>`).join('');
      $('#pv-others').hidden = false;
    }
  } catch (e) { }
})();
