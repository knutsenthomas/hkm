// Language support for the small Min side pages (payment status, course player, Community).
// Reads the visitor's chosen site language, sets <html lang>, and translates text from a
// page dictionary – also text the page adds later.
(function () {
    var lang = 'no';
    try {
        var saved = localStorage.getItem('hkm_preferred_lang');
        if (saved === 'en' || saved === 'es') lang = saved;
    } catch (e) { /* storage not available */ }

    document.documentElement.lang = lang;
    window.hkmPageLang = lang;
    window.tx = function (no, en, es) {
        if (lang === 'en') return en;
        if (lang === 'es') return es == null ? en : es;
        return no;
    };

    // dict: { 'Norsk tekst': ['English', 'Español'] }, patterns: [[/regex/, 'en $1', 'es $1']]
    window.hkmTranslatePage = function (dict, patterns) {
        if (lang === 'no') return;
        var idx = lang === 'en' ? 0 : 1;
        patterns = patterns || [];
        var ATTRS = ['title', 'placeholder', 'aria-label', 'data-placeholder'];

        function tr(text) {
            var trimmed = text.trim();
            if (!trimmed) return null;
            if (Object.prototype.hasOwnProperty.call(dict, trimmed)) {
                return text.replace(trimmed, dict[trimmed][idx]);
            }
            for (var i = 0; i < patterns.length; i++) {
                var p = patterns[i];
                if (p[0].test(trimmed)) return text.replace(trimmed, trimmed.replace(p[0], p[1 + idx]));
            }
            return null;
        }
        function apply(root) {
            if (!root) return;
            if (root.nodeType === 3) {
                var t = tr(root.nodeValue);
                if (t !== null && t !== root.nodeValue) root.nodeValue = t;
                return;
            }
            if (root.nodeType !== 1) return;
            if (root.closest && root.closest('script, style, .material-symbols-outlined')) return;
            ATTRS.forEach(function (a) {
                if (root.hasAttribute && root.hasAttribute(a)) {
                    var v = tr(root.getAttribute(a));
                    if (v !== null) root.setAttribute(a, v);
                }
            });
            var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
            var n;
            while ((n = walker.nextNode())) {
                if (n.nodeType === 1) {
                    if (n.matches('script, style')) continue;
                    ATTRS.forEach(function (a) {
                        if (n.hasAttribute(a)) {
                            var v = tr(n.getAttribute(a));
                            if (v !== null) n.setAttribute(a, v);
                        }
                    });
                } else if (n.parentElement && !n.parentElement.closest('script, style, .material-symbols-outlined')) {
                    var t2 = tr(n.nodeValue);
                    if (t2 !== null && t2 !== n.nodeValue) n.nodeValue = t2;
                }
            }
        }
        var t3 = tr(document.title);
        if (t3 !== null) document.title = t3;
        apply(document.body);
        new MutationObserver(function (list) {
            list.forEach(function (m) {
                if (m.type === 'characterData') apply(m.target);
                else if (m.type === 'attributes') apply(m.target);
                else m.addedNodes.forEach(apply);
            });
        }).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
    };
})();
