/* First-party consent: optional scripts stay unloaded until an explicit choice. */
(function () {
  'use strict';
  if (window.SitePrivacy) return;
  var config = document.currentScript ? document.currentScript.dataset : {};
  var key = config.key || 'site-privacy-v1';
  var maxAge = 180 * 24 * 60 * 60 * 1000;
  var measurementId = validId(config.ga) ? config.ga : '';
  var loadedIds = [];
  var affiliateLoaded = false;
  var memory = read();
  var banner;
  var settings;
  var previouslyAllowed = false;
  var lastPage = '';

  function validId(value) { return /^G-[A-Z0-9]+$/.test(value || ''); }
  function valid(value) {
    return value && value.version === 1 && typeof value.analytics === 'boolean' &&
      typeof value.marketing === 'boolean' && Number.isFinite(value.savedAt) &&
      value.savedAt <= Date.now() && Date.now() - value.savedAt < maxAge;
  }
  function read() {
    try { var value = JSON.parse(localStorage.getItem(key)); return valid(value) ? value : null; }
    catch (_) { return null; }
  }
  function publicPage(pathname) {
    return !/(^|\/)(admin|login|logg-inn|minside|account|profile|profil|checkout|betaling|portal|auth|oauth-callback|set-password|reset-password)(\/|\.|$)/i.test(pathname || location.pathname);
  }
  function allows(category) {
    return valid(memory) && memory[category] === true && navigator.globalPrivacyControl !== true && publicPage();
  }
  function cleanEvent(event) {
    if (!allows('analytics')) return null;
    try {
      var url = new URL(event.url);
      if (!publicPage(url.pathname)) return null;
      return Object.assign({}, event, { url: url.origin + url.pathname });
    } catch (_) { return null; }
  }
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () {
    // Calls made by page features before consent must never be queued for later replay.
    if (arguments[0] === 'consent' || arguments[0] === 'set' || allows('analytics')) window.dataLayer.push(arguments);
  };
  function consentState() {
    return { analytics_storage: allows('analytics') ? 'granted' : 'denied',
      ad_storage: allows('marketing') ? 'granted' : 'denied',
      ad_user_data: allows('marketing') ? 'granted' : 'denied',
      ad_personalization: allows('marketing') ? 'granted' : 'denied' };
  }
  window.gtag('consent', 'default', { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
  window.gtag('set', 'ads_data_redaction', true);
  function clearOptionalCookies() {
    if (config.affiliate && !allows('marketing')) {
      try { localStorage.removeItem('hkm_referral_id'); } catch (_) { /* Storage can be blocked. */ }
    }
    var parts = location.hostname.split('.');
    var domains = [''];
    for (var i = 0; i < parts.length - 1; i++) {
      domains.push(parts.slice(i).join('.'), '.' + parts.slice(i).join('.'));
    }
    var segments = location.pathname.split('/');
    var paths = ['/'];
    for (var p = 1; p < segments.length; p++) paths.push(segments.slice(0, p + 1).join('/'));
    document.cookie.split(';').forEach(function (item) {
      var name = item.split('=')[0].trim();
      var analyticsCookie = /^(_ga(?:_|$)|_gid$|_gat)/i.test(name);
      var marketingCookie = /^(_gcl_|_fbp$|_fbc$|goaffpro|aff_ref$)/i.test(name);
      if (!(analyticsCookie && !allows('analytics')) && !(marketingCookie && !allows('marketing'))) return;
      domains.forEach(function (domain) { paths.forEach(function (path) {
        document.cookie = name + '=; Max-Age=0; path=' + path + ';' + (domain ? ' domain=' + domain + ';' : '');
      }); });
    });
  }
  function pageView() {
    if (!allows('analytics') || !measurementId || !loadedIds.includes(measurementId)) return;
    var page = measurementId + ':' + location.pathname;
    if (page === lastPage) return;
    lastPage = page;
    window.gtag('event', 'page_view', { send_to: measurementId, page_location: location.origin + location.pathname, page_referrer: '', page_title: config.title || location.hostname });
  }
  function apply() {
    var analytics = allows('analytics');
    var marketing = allows('marketing');
    loadedIds.concat(measurementId ? [measurementId] : []).forEach(function (id) { window['ga-disable-' + id] = !analytics || id !== measurementId; });
    window.gtag('consent', 'update', consentState());
    if (!analytics || !marketing) clearOptionalCookies();
    // Removing a script cannot stop an already running tracker. Reload after revocation.
    if ((!analytics && previouslyAllowed) || (!marketing && affiliateLoaded)) {
      emit();
      location.reload();
      return;
    }
    previouslyAllowed = analytics;
    if (analytics && measurementId && !loadedIds.includes(measurementId)) {
      loadedIds.push(measurementId);
      window['ga-disable-' + measurementId] = false;
      window.gtag('js', new Date());
      window.gtag('config', measurementId, { send_page_view: false, page_location: location.origin + location.pathname, page_referrer: '', page_title: config.title || location.hostname, allow_google_signals: false, allow_ad_personalization_signals: false, cookie_expires: 15552000, cookie_update: false });
      var script = document.createElement('script');
      script.async = true;
      script.src = 'https://www.googletagmanager.com/gtag/js?id=' + measurementId;
      document.head.appendChild(script);
      pageView();
    }
    if (marketing && config.affiliate && !affiliateLoaded) {
      affiliateLoaded = true;
      var affiliate = document.createElement('script');
      affiliate.async = true;
      affiliate.src = 'https://static.goaffpro.com/client_sdk.js';
      affiliate.onload = function () {
        if (allows('marketing') && window.Goaffpro) {
          window.Goaffpro('init', config.affiliate);
          window.Goaffpro('track-visit');
        }
      };
      document.head.appendChild(affiliate);
    }
    emit();
  }
  function emit() { window.dispatchEvent(new CustomEvent('siteprivacychange')); }
  function choose(analytics, marketing) {
    memory = { version: 1, analytics: analytics === true && navigator.globalPrivacyControl !== true,
      marketing: marketing === true && navigator.globalPrivacyControl !== true, savedAt: Date.now() };
    try { localStorage.setItem(key, JSON.stringify(memory)); } catch (_) { /* Choice lasts for this visit. */ }
    if (banner) banner.remove();
    banner = null;
    apply();
  }
  function show() {
    if (!document.body || banner) return;
    var english = (document.documentElement.lang || '').startsWith('en');
    var spanish = (document.documentElement.lang || '').startsWith('es');
    var words = spanish ? ['Tu privacidad', 'Usamos almacenamiento necesario para las funciones solicitadas. Las estadísticas opcionales solo se activan con tu permiso.', 'Estadísticas de visitas', 'Marketing y afiliados', 'Rechazar opcionales', 'Aceptar todas', 'Guardar selección', 'Privacidad', 'Tu elección se guarda durante 180 días y puedes cambiarla en cualquier momento.'] : english ? ['Your privacy', 'We use necessary storage for features you request. Optional visitor analytics only starts with your permission.', 'Visitor analytics', 'Marketing and affiliates', 'Reject optional', 'Accept all', 'Save choices', 'Privacy policy', 'Your choice is saved for 180 days. You can change it at any time.'] : ['Ditt personvern', 'Vi bruker nødvendig lagring for funksjoner du ber om. Valgfri besøksstatistikk starter først når du godtar.', 'Besøksstatistikk', 'Markedsføring og samarbeidspartnere', 'Avslå valgfrie', 'Godta alle', 'Lagre valg', 'Personvern', 'Valget lagres i 180 dager. Du kan endre det når som helst.'];
    banner = document.createElement('section');
    banner.id = 'site-privacy-banner';
    banner.setAttribute('aria-label', words[0]);
    banner.style.cssText = 'position:fixed;inset:auto 12px 12px 12px;max-width:720px;margin:auto;z-index:2147483646;background:#fff;color:#17212b;border:1px solid #aeb7bf;border-radius:16px;padding:22px;box-shadow:0 12px 48px #0003;font:15px/1.5 system-ui,sans-serif;max-height:80vh;overflow:auto;text-align:left';
    var title = document.createElement('h2'); title.textContent = words[0]; title.style.cssText = 'font:bold 21px/1.3 system-ui;margin:0 0 10px;color:#17212b'; banner.appendChild(title);
    var text = document.createElement('p'); text.textContent = words[1]; text.style.margin = '0 0 12px'; banner.appendChild(text);
    words[2] += ' (Google Analytics' + (config.vercel === 'true' ? ', Vercel Analytics / Speed Insights' : '') + ')';
    if (config.affiliate) words[3] += ' (GoAffPro)';
    var toggles = {};
    ['analytics', 'marketing'].forEach(function (category, index) {
      if (category === 'marketing' && !config.affiliate) return;
      var label = document.createElement('label'); label.style.cssText = 'display:flex;align-items:center;gap:12px;margin:10px 0;cursor:pointer';
      var input = document.createElement('input'); input.type = 'checkbox'; input.checked = valid(memory) && memory[category] === true; input.disabled = navigator.globalPrivacyControl === true; input.style.cssText = 'width:20px;height:20px;accent-color:#284a66';
      if (input.disabled) input.checked = false;
      toggles[category] = input; label.append(input, document.createTextNode(words[2 + index])); banner.appendChild(label);
    });
    if (navigator.globalPrivacyControl === true) {
      var gpc = document.createElement('p'); gpc.textContent = english ? 'Global Privacy Control is enabled. Optional tracking stays off.' : spanish ? 'Global Privacy Control está activado. El seguimiento opcional permanece desactivado.' : 'Global Privacy Control er aktivert. Valgfri sporing holdes avslått.'; banner.appendChild(gpc);
    }
    var note = document.createElement('p'); note.textContent = words[8]; note.style.cssText = 'font-size:13px;margin:12px 0'; banner.appendChild(note);
    if (config.privacy) { var link = document.createElement('a'); link.href = config.privacy; link.textContent = words[7]; link.style.cssText = 'color:#234e70;text-decoration:underline'; banner.appendChild(link); }
    var buttons = document.createElement('div'); buttons.style.cssText = 'display:flex;flex-wrap:wrap;gap:10px;margin-top:16px';
    [function () { choose(false, false); }, function () { choose(true, !!config.affiliate); }, function () { choose(toggles.analytics.checked, !!toggles.marketing && toggles.marketing.checked); }].forEach(function (action, index) {
      var button = document.createElement('button'); button.type = 'button'; button.textContent = words[4 + index]; button.style.cssText = 'flex:1 1 150px;min-height:44px;border:1px solid #284a66;border-radius:9px;padding:10px 14px;background:#fff;color:#17374f;font:600 14px system-ui;cursor:pointer'; button.onclick = action; buttons.appendChild(button);
    });
    banner.appendChild(buttons); document.body.appendChild(banner);
  }
  function mount() {
    if (settings) return;
    settings = document.createElement('button'); settings.type = 'button'; settings.id = 'site-privacy-settings';
    settings.textContent = (document.documentElement.lang || '').startsWith('en') ? 'Cookie settings' : (document.documentElement.lang || '').startsWith('es') ? 'Cookies' : 'Informasjonskapsler';
    settings.style.cssText = 'position:static;display:inline-flex;align-items:center;justify-content:center;padding:6px 0;border:0;background:transparent;color:inherit;font:inherit;font-size:13px;text-decoration:underline;cursor:pointer;min-height:44px';
    settings.onclick = show;
    var links = document.createElement('div'); links.id = 'site-privacy-links';
    links.style.cssText = 'width:100%;box-sizing:border-box;flex-basis:100%;padding:12px 20px;text-align:center';
    links.appendChild(settings);
    var fallback;
    function placeSettings() {
      // Shared shells and React routes can replace or mount their footer later.
      var footer = document.querySelector('footer:not(#site-privacy-footer),[role="contentinfo"]:not(#site-privacy-footer)');
      // Reuse the existing HKM footer control rather than adding another entry.
      if (footer && footer.querySelector('[data-cookie-settings-link]')) {
        if (links.isConnected) links.remove();
        if (fallback && fallback.isConnected) fallback.remove();
        return;
      }
      if (!footer) {
        if (!fallback) { fallback = document.createElement('footer'); fallback.id = 'site-privacy-footer'; }
        if (!fallback.isConnected) document.body.appendChild(fallback);
        footer = fallback;
      }
      if (links.parentNode !== footer) footer.appendChild(links);
      if (fallback && footer !== fallback && fallback.isConnected) fallback.remove();
    }
    placeSettings();
    if (window.MutationObserver) new window.MutationObserver(placeSettings).observe(document.body, { childList: true, subtree: true });
    if (!valid(memory)) show();
  }
  window.SitePrivacy = { allows: allows, choose: choose, show: show, cleanEvent: cleanEvent, pageView: pageView,
    setMeasurementId: function (id) { if (validId(id) && id !== measurementId) { measurementId = id; apply(); } } };
  window.addEventListener('storage', function (event) { if (event.key === key || event.key === null) { memory = read(); apply(); if (!memory) show(); } });
  setInterval(function () { if (memory && !valid(memory)) memory = null; apply(); if (!memory) show(); }, 60000);
  ['pushState', 'replaceState'].forEach(function (method) {
    var original = history[method];
    history[method] = function (state, unused, url) {
      var next = new URL(url || location.href, location.href);
      if (!publicPage(next.pathname)) loadedIds.forEach(function (id) { window['ga-disable-' + id] = true; });
      var result = original.apply(history, arguments);
      apply();
      return result;
    };
  });
  window.addEventListener('popstate', apply);
  apply();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();
