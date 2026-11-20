/* Bibelsiden i samme stil som leseplanene:
   ny kapitteltopp, knapperad, tekstfaner i verktøypanelet, forrige/neste nederst
   og en plan-stripe når man kommer fra en leseplan (?fra=planId&dag=n). */
(function () {
  'use strict';
  const LANG = (location.pathname.match(/^\/(en|es)\//) || [])[1] || 'no';
  const T = {
    no: { chOf: (n, m) => m ? `Kapittel ${n} av ${m}` : `Kapittel ${n}`, prev: 'Forrige', next: 'Neste', lookup: 'Bibelleksikon', crossref: 'Henvisninger', intro: 'Innledning',
      day: (d, t) => `Dag ${d}` + (t ? ` · ${t}` : ''), mark: d => `Merk dag ${d} som fullført`, marked: d => `Dag ${d} er fullført`, back: 'Tilbake til planen', planUrl: '/leseplan-detaljer' },
    en: { chOf: (n, m) => m ? `Chapter ${n} of ${m}` : `Chapter ${n}`, prev: 'Previous', next: 'Next', lookup: 'Bible dictionary', crossref: 'Cross references', intro: 'Introduction',
      day: (d, t) => `Day ${d}` + (t ? ` · ${t}` : ''), mark: d => `Mark day ${d} as done`, marked: d => `Day ${d} is done`, back: 'Back to the plan', planUrl: '/en/reading-plan-details' },
    es: { chOf: (n, m) => m ? `Capítulo ${n} de ${m}` : `Capítulo ${n}`, prev: 'Anterior', next: 'Siguiente', lookup: 'Diccionario bíblico', crossref: 'Referencias', intro: 'Introducción',
      day: (d, t) => `Día ${d}` + (t ? ` · ${t}` : ''), mark: d => `Marcar el día ${d} como hecho`, marked: d => `Día ${d} completado`, back: 'Volver al plan', planUrl: '/es/detalles-plan-lectura' }
  }[LANG];
  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const br = () => window.bibleReader || null;

  function state() {
    const r = br(); if (!r) return null;
    const book = (r.books || []).find(b => b.id === r.selectedBookId);
    const id = r.selectedChapterId || '';
    const ch = id.split('_')[1] || '';
    const nums = (r.chapters || []).map(c => +String(c.id).split('_')[1]).filter(n => n > 0);
    const max = nums.length ? Math.max(...nums) : 0;
    const trEl = document.querySelector('.selected-translation-name');
    const act = document.querySelector('.book-item.active .sidebar-genre-badge');
    return { genre: act ? act.textContent.trim() : '', name: book ? book.name : '', ch, max, intro: ch === 'intro', tr: trEl ? trEl.textContent.trim() : '' };
  }

  /* ---------- kapitteltopp ---------- */
  function head() {
    const rh = $('.reference-header'); if (!rh) return;
    let h = $('#hkr-head');
    if (!h) {
      h = document.createElement('div'); h.id = 'hkr-head';
      h.innerHTML = '<span class="hkr-eyebrow"></span><div class="hkr-title"><span class="hkr-num" aria-hidden="true"></span><div><h1 class="hkr-h1"></h1><span class="hkr-meta"></span></div></div>';
      rh.insertBefore(h, rh.firstChild);
    }
    const s = state(); if (!s || !s.name) { h.hidden = true; return; }
    h.hidden = false;
    h.querySelector('.hkr-eyebrow').textContent = s.genre || s.name;
    h.querySelector('.hkr-num').textContent = '';
    h.querySelector('.hkr-h1').innerHTML = s.intro ? esc(`${s.name} – ${T.intro}`) : `${esc(s.name)} <span class="hkr-ch">${esc(s.ch)}</span>`;
    h.querySelector('.hkr-meta').textContent = [s.intro ? '' : T.chOf(s.ch, s.max), s.tr].filter(Boolean).join(' · ');
    h.classList.toggle('intro', s.intro);
    buttons(); bottomNav(s);
  }

  /* ---------- knapperad ---------- */
  function buttons() {
    const bar = $('#chapter-header-action-bar'), look = $('#btn-lookup-chapter');
    if (bar && look && look.parentElement !== bar) bar.insertBefore(look, bar.firstChild);
    if (look) { const sp = look.querySelectorAll('span')[1]; if (sp && sp.textContent !== T.lookup) sp.textContent = T.lookup; }
    const cr = $('#btn-crossref-chapter-dynamic');
    const tc = document.querySelector('#toolbar-btn-crossref span:not(.material-symbols-outlined)');
    if (tc && tc.textContent !== T.crossref) tc.textContent = T.crossref;
    if (cr && !cr.querySelector('.hkr-lbl')) { const l = document.createElement('span'); l.className = 'hkr-lbl'; l.textContent = T.crossref; cr.appendChild(l); }
    document.querySelectorAll('#chapter-header-action-bar .nav-btn, #btn-lookup-chapter').forEach(b => {
      b.classList.add('hkr-pill');
      if (b.getAttribute('style')) b.removeAttribute('style');
      b.querySelectorAll('[style]').forEach(x => x.removeAttribute('style'));
    });
  }

  /* ---------- forrige / neste nederst ---------- */
  function bottomNav(s) {
    const pane = $('#bible-reading-pane'); if (!pane) return;
    let nav = $('#hkr-dnav');
    if (!nav) {
      nav = document.createElement('nav'); nav.id = 'hkr-dnav';
      nav.innerHTML = '<button type="button" class="hkr-pill big" data-dir="prev"></button><button type="button" class="hkr-pill big" data-dir="next"></button>';
      nav.addEventListener('click', e => {
        const b = e.target.closest('button'); if (!b) return;
        const t = $(b.dataset.dir === 'prev' ? '#floating-prev-btn' : '#floating-next-btn'); if (t) t.click();
      });
    }
    if (nav.previousElementSibling !== pane) pane.after(nav);
    const n = +s.ch;
    const arrowL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M19 12H5M11 18l-6-6 6-6"/></svg>';
    const arrowR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
    const p = nav.querySelector('[data-dir=prev]'), x = nav.querySelector('[data-dir=next]');
    p.innerHTML = arrowL + '<span>' + esc(n > 1 ? `${s.name} ${n - 1}` : T.prev) + '</span>';
    x.innerHTML = '<span>' + esc(s.intro ? `${s.name} 1` : (s.max && n < s.max ? `${s.name} ${n + 1}` : T.next)) + '</span>' + arrowR;
    p.hidden = s.intro;
  }

  /* ---------- verktøypanel: tekstfaner ---------- */
  function tabs() {
    document.querySelectorAll('.bible-nav-right .tab-btn').forEach(t => {
      if (t.querySelector('.hkr-tab')) return;
      const lbl = (t.getAttribute('title') || '').trim(); if (!lbl) return;
      const s = document.createElement('span'); s.className = 'hkr-tab'; s.textContent = lbl; t.appendChild(s);
    });
  }

  /* ---------- plan-stripe ---------- */
  const qs = new URLSearchParams(location.search);
  const planId = qs.get('fra'), planDay = parseInt(qs.get('dag'), 10);
  function doneSet() {
    let a = []; try { a = JSON.parse(localStorage.getItem(`hkm_plan_${planId}_completed`) || '[]'); } catch (e) { }
    return new Set(a.map(Number));
  }
  function saveDone(set) {
    const arr = [...set].sort((a, b) => a - b);
    try {
      localStorage.setItem(`hkm_plan_${planId}_completed`, JSON.stringify(arr.map(String)));
      const k = `hkm_reading_plan_progress_${planId}`; let p = null;
      try { p = JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { }
      p = p || { planId, currentDay: 1, completedDays: [], reflections: {} }; p.completedDays = arr;
      localStorage.setItem(k, JSON.stringify(p));
    } catch (e) { }
    try {
      const u = window.firebase && firebase.auth && firebase.auth().currentUser;
      if (u) firebase.firestore().collection('users').doc(u.uid).collection('reading_plans').doc(planId)
        .set({ planId, completedDays: arr, lastActiveAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
    } catch (e) { }
  }
  function stripe() {
    if (!planId || !(planDay > 0)) return;
    const rh = $('.reference-header'); if (!rh || $('#hkr-plan')) return;
    const title = (qs.get('t') || '').slice(0, 120);
    const el = document.createElement('div'); el.id = 'hkr-plan';
    const back = `${T.planUrl}?id=${encodeURIComponent(planId)}#dag-${planDay}`;
    el.innerHTML = `<a class="hkr-back" href="${esc(back)}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M19 12H5M11 18l-6-6 6-6"/></svg><span><b>${esc(T.day(planDay, title))}</b><small>${esc(T.back)}</small></span></a><button type="button" class="hkr-pill" id="hkr-mark"></button>`;
    rh.parentElement.insertBefore(el, rh);
    const btn = el.querySelector('#hkr-mark');
    const paint = () => { const on = doneSet().has(planDay); btn.classList.toggle('on', on); btn.innerHTML = (on ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L19 7"/></svg>' : '') + esc(on ? T.marked(planDay) : T.mark(planDay)); };
    btn.addEventListener('click', () => { const s = doneSet(); s.has(planDay) ? s.delete(planDay) : s.add(planDay); saveDone(s); paint(); });
    paint();
  }

  /* ---------- oppstart ---------- */
  let tm = null;
  const kick = () => { clearTimeout(tm); tm = setTimeout(() => { head(); tabs(); stripe(); }, 60); };
  function start() {
    document.documentElement.classList.add('hkr'); document.body.classList.add('hkr');
    const watch = ['#current-chapter-number', '#current-book-badge', '#chapter-header-action-bar', '.bible-nav-right .tabs-header', '.selected-translation-name'];
    const mo = new MutationObserver(kick);
    const attach = () => watch.forEach(s => { const e = $(s); if (e && !e.__hkr) { e.__hkr = 1; mo.observe(e, { childList: true, characterData: true, subtree: true }); } });
    attach();
    new MutationObserver(() => { attach(); kick(); }).observe($('.bible-text-container') || document.body, { childList: true });
    kick();
    let n = 0; const iv = setInterval(() => { attach(); kick(); if (++n > 20) clearInterval(iv); }, 500);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
