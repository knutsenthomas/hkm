/* First-party consent: optional scripts stay unloaded until an explicit choice. */
(function () {
  'use strict';
  if (window.SitePrivacy) return;
  var config = document.currentScript ? document.currentScript.dataset : {};
  var key = config.key || 'site-privacy-v1';
  // Site-specific presentation only. Consent keys, expiry and tracking rules stay shared.
  var palettes = {
    tk: { background: '#ffffff', text: '#162d3a', muted: '#4b5563', border: '#e3e8ed', accent: '#ff6a1b', button: '#fff2e9', buttonText: '#9a3a00', buttonBorder: '#b64b00', focus: '#9a3a00' },
    hkm: { background: '#ffffff', text: '#2c3e50', muted: '#4b5563', border: '#d8e2e9', accent: '#d17d39', button: '#eaf1f5', buttonText: '#1b4965', buttonBorder: '#1b4965', focus: '#1b4965' },
    hkd: { background: '#f5f5ed', text: '#151a21', muted: '#5a5f67', border: '#dbc2b3', accent: '#cc712b', button: '#f3e5d7', buttonText: '#723600', buttonBorder: '#934700', focus: '#934700' },
    mandal: { background: '#ffffff', text: '#162d3a', muted: '#4b5563', border: '#d8e2e9', accent: '#1d4359', button: '#1d4359', buttonText: '#ffffff', buttonBorder: '#1d4359', focus: '#1d4359' },
    stevner: { background: '#fafaf8', text: '#203e43', muted: '#476167', border: '#cfdad5', accent: '#426c5b', button: '#203e43', buttonText: '#ffffff', buttonBorder: '#203e43', focus: '#203e43' },
    'hkp-app': { background: '#faf7ff', text: '#2d183f', muted: '#655472', border: '#e3d8ef', accent: '#d4b56e', button: '#561291', buttonText: '#ffffff', buttonBorder: '#561291', focus: '#561291' }
  };
  var themeName = key.replace(/-privacy-v\d+$/, '');
  var palette = palettes[themeName] || palettes.hkm;

  var maxAge = 180 * 24 * 60 * 60 * 1000;
  var measurementId = validId(config.ga) ? config.ga : '';
  var loadedIds = [];
  var affiliateLoaded = false;
  var mediaEnabled = config.media === 'true';
  var consentVersion = mediaEnabled ? 2 : 1;
  var memory = read();
  var banner;
  var settings;
  var previouslyAllowed = false;
  var mediaWasAllowed = false;
  var lastPage = '';

  function validId(value) { return /^G-[A-Z0-9]+$/.test(value || ''); }
  function valid(value) {
    return value && value.version === consentVersion && typeof value.analytics === 'boolean' &&
      typeof value.marketing === 'boolean' && (!mediaEnabled || typeof value.media === 'boolean') && Number.isFinite(value.savedAt) &&
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
    return !!valid(memory) && memory[category] === true && (category === 'media' || navigator.globalPrivacyControl !== true) && (category === 'media' || publicPage());
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
    if ((!analytics && previouslyAllowed) || (!marketing && affiliateLoaded) || (mediaWasAllowed && !allows('media'))) {
      emit();
      location.reload();
      return;
    }
    previouslyAllowed = analytics;
    mediaWasAllowed = allows('media');
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
  function choose(analytics, marketing, media) {
    memory = { version: consentVersion, media: mediaEnabled && media === true, analytics: analytics === true && navigator.globalPrivacyControl !== true,
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
    banner.setAttribute('data-privacy-theme', palettes[themeName] ? themeName : 'hkm');
    banner.style.cssText = 'position:fixed;inset:auto 12px 12px 12px;max-width:720px;margin:auto;z-index:2147483646;background:' + palette.background + ';color:' + palette.text + ';border:1px solid ' + palette.border + ';border-top:4px solid ' + palette.accent + ';border-radius:16px;padding:22px;box-shadow:0 12px 48px #0003;font:15px/1.5 system-ui,sans-serif;max-height:80vh;overflow:auto;text-align:left';
    var title = document.createElement('h2'); title.textContent = words[0]; title.style.cssText = 'font:bold 21px/1.3 system-ui;margin:0 0 10px;color:' + palette.text; title.style.setProperty('color', palette.text, 'important'); banner.appendChild(title);
    var text = document.createElement('p'); text.textContent = words[1]; text.style.cssText = 'margin:0 0 12px;color:' + palette.text; banner.appendChild(text);
    var customizing = false;
    var choices = document.createElement('div'); choices.id = 'site-privacy-choices'; choices.hidden = true;
    words[2] += ' (Google Analytics' + (config.vercel === 'true' ? ', Vercel Analytics / Speed Insights' : '') + ')';
    if (config.affiliate) words[3] += ' (GoAffPro)';
    var toggles = {};
    ['analytics', 'marketing'].forEach(function (category, index) {
      if (category === 'marketing' && !config.affiliate) return;
      var label = document.createElement('label'); label.style.cssText = 'display:flex;align-items:center;gap:12px;margin:10px 0;cursor:pointer';
      var input = document.createElement('input'); input.type = 'checkbox'; input.checked = valid(memory) && memory[category] === true; input.disabled = navigator.globalPrivacyControl === true; input.style.cssText = 'width:20px;height:20px;accent-color:' + palette.focus;
      if (input.disabled) input.checked = false;
      toggles[category] = input; label.append(input, document.createTextNode(words[2 + index])); choices.appendChild(label);
    });
    if (mediaEnabled) {
      var necessary = document.createElement('p');
      necessary.textContent = spanish ? 'Funciones solicitadas: inicio de sesión (Firebase), chat al abrirlo (Wix Inbox), idioma, tema y progreso/notas bíblicas. No se usan para publicidad.' : english ? 'Requested features: sign-in (Firebase), chat when opened (Wix Inbox), language, theme and Bible progress/notes. These are not used for advertising.' : 'Funksjoner du ber om: innlogging (Firebase), chat når du åpner den (Wix Inbox), språk, tema og bibelprogresjon/notater. Disse brukes ikke til reklame.';
      necessary.style.cssText = 'font-size:13px;color:' + palette.muted; choices.appendChild(necessary);
      var mediaLabel = document.createElement('label'); mediaLabel.style.cssText = 'display:flex;align-items:center;gap:12px;margin:10px 0;cursor:pointer';
      var mediaInput = document.createElement('input'); mediaInput.type = 'checkbox'; mediaInput.checked = valid(memory) && memory.media === true;
      mediaInput.style.cssText = 'width:20px;height:20px;accent-color:' + palette.focus;
      toggles.media = mediaInput;
      mediaLabel.append(mediaInput, document.createTextNode(spanish ? 'Contenido externo (YouTube, Vimeo y otros proveedores)' : english ? 'External content (YouTube, Vimeo and other providers)' : 'Eksternt innhold (YouTube, Vimeo og andre leverandører)'));
      choices.appendChild(mediaLabel);
      var mediaNote = document.createElement('p'); mediaNote.textContent = spanish ? 'Al permitir contenido externo, el proveedor recibe datos técnicos y puede usar su propio almacenamiento.' : english ? 'When external content is allowed, the provider receives technical data and may use its own storage.' : 'Når du tillater eksternt innhold, mottar leverandøren tekniske opplysninger og kan bruke egen lagring.';
      mediaNote.style.cssText = 'font-size:13px;color:' + palette.muted; choices.appendChild(mediaNote);
    }
    if (navigator.globalPrivacyControl === true) {
      var gpc = document.createElement('p'); gpc.textContent = english ? 'Global Privacy Control is enabled. Optional tracking stays off.' : spanish ? 'Global Privacy Control está activado. El seguimiento opcional permanece desactivado.' : 'Global Privacy Control er aktivert. Valgfri sporing holdes avslått.'; choices.appendChild(gpc);
    }
    banner.appendChild(choices);
    var note = document.createElement('p'); note.textContent = words[8]; note.style.cssText = 'font-size:13px;margin:12px 0;color:' + palette.muted; banner.appendChild(note);
    if (config.privacy) { var link = document.createElement('a'); link.href = config.privacy; link.textContent = words[7]; link.style.cssText = 'color:' + palette.focus + ';text-decoration:underline'; banner.appendChild(link); }
    var buttons = document.createElement('div'); buttons.style.cssText = 'display:flex;flex-wrap:wrap;gap:10px;margin-top:16px';
    [function () { choose(false, false, false); }, function () { choose(true, !!config.affiliate, mediaEnabled); }, function () { choose(toggles.analytics.checked, !!toggles.marketing && toggles.marketing.checked, !!toggles.media && toggles.media.checked); }].forEach(function (action, index) {
      var button = document.createElement('button'); button.type = 'button'; button.textContent = words[4 + index];
      if (index === 2) { button.textContent = spanish ? 'Personalizar' : english ? 'Customize' : 'Tilpass'; button.setAttribute('aria-controls', choices.id); button.setAttribute('aria-expanded', 'false'); } button.style.cssText = 'flex:1 1 150px;min-height:44px;border:1px solid ' + palette.buttonBorder + ';border-radius:9px;padding:10px 14px;background:' + palette.button + ';color:' + palette.buttonText + ';font:600 14px system-ui;cursor:pointer'; button.onclick = function () {
        if (index === 2 && !customizing) {
          customizing = true; choices.hidden = false; button.textContent = words[6]; button.setAttribute('aria-expanded', 'true');
          var first = choices.querySelector('input:not(:disabled)'); if (first) first.focus();
          return;
        }
        action();
      }; buttons.appendChild(button);
    });
    if (!document.getElementById('site-privacy-theme')) {
      var themeStyle = document.createElement('style'); themeStyle.id = 'site-privacy-theme';
      themeStyle.textContent = '#site-privacy-banner button:focus-visible,#site-privacy-banner a:focus-visible,#site-privacy-banner input:focus-visible{outline:3px solid ' + palette.focus + ';outline-offset:3px}#site-privacy-banner button:hover{filter:brightness(.96)}';
      document.head.appendChild(themeStyle);
    }
    banner.appendChild(buttons); document.body.appendChild(banner);
  }
  function mount() {
    if (settings) return;
    settings = document.createElement('button'); settings.type = 'button'; settings.id = 'site-privacy-settings';
    settings.textContent = (document.documentElement.lang || '').startsWith('en') ? 'Cookie settings' : (document.documentElement.lang || '').startsWith('es') ? 'Cookies' : 'Informasjonskapsler';
    settings.style.cssText = 'position:static;display:inline;padding:0;border:0;background:transparent;color:inherit;font:inherit;text-align:inherit;cursor:pointer';
    settings.onclick = show;
    var fallback, listItem;
    function placeSettings() {
      // Mount beside the existing privacy link, inside the site's own footer navigation.
      var footer = document.querySelector('footer:not(#site-privacy-footer),[role="contentinfo"]:not(#site-privacy-footer)');
      if (footer && footer.querySelector('[data-cookie-settings-link]')) {
        if (settings.isConnected) settings.remove();
        if (listItem && listItem.isConnected) listItem.remove();
        if (fallback && fallback.isConnected) fallback.remove();
        return;
      }
      if (!footer) {
        if (!fallback) {
          fallback = document.createElement('footer'); fallback.id = 'site-privacy-footer';
          fallback.style.cssText = 'display:flex;flex-wrap:wrap;justify-content:center;gap:16px;padding:16px;font-size:13px';
        }
        if (!fallback.isConnected) document.body.appendChild(fallback);
        footer = fallback;
      }
      var privacy = Array.prototype.find.call(footer.querySelectorAll('a[href],button'), function (item) {
        if (item === settings) return false;
        return /(?:^|\/)(?:privacy(?:-policy)?|personvern)(?:[\/#?]|$)/i.test(item.getAttribute('href') || '') ||
          /^(?:personvern(?:erklæring)?|privacy(?: policy)?|privacidad)$/i.test(item.textContent.trim());
      });
      var target = footer.querySelector('[data-cookie-settings-slot]') || (privacy && privacy.parentElement) || footer;
      settings.className = privacy ? privacy.className : '';
      if (target.tagName === 'LI') {
        if (!listItem) listItem = document.createElement('li');
        if (settings.parentNode !== listItem) listItem.appendChild(settings);
        if (listItem.parentNode !== target.parentNode || target.nextElementSibling !== listItem) target.after(listItem);
      } else {
        if (settings.parentNode !== target) target.appendChild(settings);
        if (listItem && listItem.isConnected) listItem.remove();
        target.style.flexWrap = 'wrap';
      }
      if (fallback && footer !== fallback && fallback.isConnected) fallback.remove();
    }
    placeSettings();
    if (window.MutationObserver) new window.MutationObserver(placeSettings).observe(document.body, { childList: true, subtree: true });
    if (!valid(memory)) show();
  }
  var stripePromise;
  function loadStripeSdk() {
    if (window.Stripe) return Promise.resolve(window.Stripe);
    if (!stripePromise) stripePromise = new Promise(function (resolve, reject) {
      var script = document.createElement('script'); script.src = 'https://js.stripe.com/v3/'; script.async = true;
      script.onload = function () { if (window.Stripe) resolve(window.Stripe); else { stripePromise = null; reject(new Error('Stripe kunne ikke lastes. Prøv igjen.')); } };
      script.onerror = function () { stripePromise = null; script.remove(); reject(new Error('Stripe kunne ikke lastes. Prøv igjen.')); };
      document.head.appendChild(script);
    });
    return stripePromise;
  }
  function protectMediaHtml(html) {
    if (!mediaEnabled || typeof html !== 'string' || !/<iframe\b/i.test(html)) return html;
    var template = document.createElement('template'); template.innerHTML = html;
    template.content.querySelectorAll('iframe').forEach(function (frame) {
      var src = frame.getAttribute('src');
      if (src) { frame.setAttribute('data-privacy-src', src); frame.removeAttribute('src'); }
      var srcdoc = frame.getAttribute('srcdoc');
      if (srcdoc) { frame.setAttribute('data-privacy-srcdoc', srcdoc); frame.removeAttribute('srcdoc'); }
    });
    return template.innerHTML;
  }
  var mediaDisplay = new WeakMap();
  function updateMedia() {
    if (!mediaEnabled) return;
    document.querySelectorAll('iframe[data-privacy-src],iframe[data-privacy-srcdoc]').forEach(function (frame) {
      var placeholder = frame.previousElementSibling;
      if (!placeholder || !placeholder.hasAttribute('data-privacy-placeholder')) placeholder = null;
      var src = frame.getAttribute('data-privacy-src') || '';
      var srcdoc = frame.getAttribute('data-privacy-srcdoc');
      if (allows('media') && (src || srcdoc)) {
        if (src && frame.getAttribute('src') !== src) frame.setAttribute('src', src);
        if (srcdoc && frame.getAttribute('srcdoc') !== srcdoc) frame.setAttribute('srcdoc', srcdoc);
        frame.hidden = false;
        if (mediaDisplay.has(frame)) { var previousDisplay = mediaDisplay.get(frame); if (previousDisplay.value) frame.style.setProperty('display', previousDisplay.value, previousDisplay.priority); else frame.style.removeProperty('display'); mediaDisplay.delete(frame); }
        if (placeholder) placeholder.remove();
      } else {
        if (frame.hasAttribute('src')) frame.removeAttribute('src');
        if (frame.hasAttribute('srcdoc')) frame.removeAttribute('srcdoc');
        frame.hidden = true;
        if (!mediaDisplay.has(frame)) mediaDisplay.set(frame, { value: frame.style.getPropertyValue('display'), priority: frame.style.getPropertyPriority('display') });
        frame.style.setProperty('display', 'none', 'important');
        if (placeholder && !(src || srcdoc)) placeholder.remove();
        if (!placeholder && (src || srcdoc)) {
          placeholder = document.createElement('div'); placeholder.setAttribute('data-privacy-placeholder', '');
          placeholder.style.cssText = 'position:relative;z-index:5;pointer-events:auto;padding:24px;background:#eaf1f5;color:#1b4965;text-align:center;border-radius:12px';
          var en = (document.documentElement.lang || '').startsWith('en');
          var es = (document.documentElement.lang || '').startsWith('es');
          var explanation = document.createElement('p'); explanation.textContent = en ? 'External content is blocked until you allow it.' : es ? 'El contenido externo está bloqueado hasta que lo permitas.' : 'Eksternt innhold er blokkert til du tillater det.';
          var button = document.createElement('button'); button.type = 'button'; button.textContent = en ? 'Choose privacy settings' : es ? 'Elegir privacidad' : 'Velg personverninnstillinger';
          button.style.cssText = 'min-height:44px;padding:10px 14px;border:1px solid #1b4965;border-radius:9px;background:white;color:#1b4965;cursor:pointer'; button.onclick = show;
          placeholder.append(explanation, button); frame.before(placeholder);
        }
      }
    });
  }
  if (mediaEnabled) {
    window.addEventListener('siteprivacychange', updateMedia);
    new MutationObserver(updateMedia).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-privacy-src', 'data-privacy-srcdoc'] });
    // Remove obsolete public content caches and IDs that used to be created at page load.
    try { Object.keys(localStorage).forEach(function (name) { if (/^hkm_(?:cache_|events_)/.test(name)) localStorage.removeItem(name); }); } catch (_) {}
  }
  window.SitePrivacy = { loadStripe: loadStripeSdk, protectMediaHtml: protectMediaHtml, allows: allows, choose: choose, show: show, cleanEvent: cleanEvent, pageView: pageView,
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
