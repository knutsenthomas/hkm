// Shared tab bar for the Kommunikasjon area: Innboks, Kontakter (with Segmenter) and Nyhetsbrev.
const TABS = [
    { id: 'inbox', label: 'Innboks', icon: 'inbox', href: '/admin/admin-meldinger.html' },
    { id: 'contacts', label: 'Kontakter', icon: 'group', href: '/admin/admin-kommunikasjon.html' },
    { id: 'newsletter', label: 'Nyhetsbrev', icon: 'mail', href: '/admin/admin-nyhetsbrev.html?section=newsletter' }
];
const CONTACT_VIEWS = [
    { id: 'people', label: 'Alle kontakter', href: '/admin/admin-kommunikasjon.html' },
    { id: 'segments', label: 'Segmenter', href: '/admin/admin-segmenter.html' }
];

function currentTab() {
    const path = location.pathname.toLowerCase();
    if (path.includes('admin-meldinger')) return 'inbox';
    if (path.includes('admin-kommunikasjon') || path.includes('admin-segmenter')) return 'contacts';
    if (path.includes('admin-nyhetsbrev') && new URLSearchParams(location.search).get('section') === 'newsletter') return 'newsletter';
    return null;
}

function injectStyles() {
    if (document.getElementById('comm-tabs-style')) return;
    const style = document.createElement('style');
    style.id = 'comm-tabs-style';
    style.textContent = `
.comm-tabs { display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:8px 16px; margin:0 0 24px; border-bottom:1px solid var(--admin-border,#e2e8f0); }
.comm-tabs nav { display:flex; gap:4px; overflow-x:auto; scrollbar-width:none; }
.comm-tabs nav::-webkit-scrollbar { display:none; }
.comm-tabs a.comm-tab { display:inline-flex; align-items:center; gap:8px; min-height:48px; padding:0 16px; margin-bottom:-1px; border-bottom:2px solid transparent; color:var(--admin-text-muted,#64748b); font-size:15px; font-weight:600; text-decoration:none; white-space:nowrap; }
.comm-tabs a.comm-tab .material-symbols-outlined { font-size:20px; }
.comm-tabs a.comm-tab:hover { color:var(--admin-text,#1e293b); }
.comm-tabs a.comm-tab[aria-current="page"] { color:var(--admin-text,#1e293b); border-bottom-color:#c56828; }
.comm-tabs a.comm-tab[aria-current="page"] .material-symbols-outlined { color:#c56828; }
.comm-tabs .comm-badge { min-width:20px; padding:1px 7px; border-radius:99px; background:#c56828; color:#fff; font-size:12px; font-weight:700; text-align:center; box-sizing:border-box; }
.comm-tabs .comm-badge[hidden] { display:none; }
.comm-subnav { display:inline-flex; gap:4px; padding:3px; margin:0 0 20px; border-radius:10px; background:var(--admin-surface-muted,#e9eef3); }
.comm-subnav a { display:inline-flex; align-items:center; min-height:38px; padding:0 16px; border-radius:8px; color:var(--admin-text-muted,#475569); font-size:14px; font-weight:600; text-decoration:none; }
.comm-subnav a[aria-current="page"] { background:var(--admin-surface,#fff); color:#1b4965; box-shadow:0 1px 2px rgba(15,23,42,.1); }
.comm-tabs a:focus-visible, .comm-subnav a:focus-visible { outline:3px solid #d17d39; outline-offset:-3px; border-radius:6px; }
html[data-theme="dark"] .comm-subnav { background:#1e293b; }
html[data-theme="dark"] .comm-subnav a[aria-current="page"] { background:#0f172a; color:#f8fafc; }
`;
    document.head.appendChild(style);
}

function build(active) {
    const wrap = document.createElement('div');
    wrap.className = 'comm-tabs';
    wrap.id = 'comm-tabs';
    const nav = document.createElement('nav');
    nav.setAttribute('aria-label', 'Kommunikasjon');
    TABS.forEach(tab => {
        const a = document.createElement('a');
        a.className = 'comm-tab';
        a.href = tab.href;
        if (tab.id === active) a.setAttribute('aria-current', 'page');
        const icon = document.createElement('span');
        icon.className = 'material-symbols-outlined';
        icon.setAttribute('aria-hidden', 'true');
        icon.textContent = tab.icon;
        a.append(icon, document.createTextNode(tab.label));
        if (tab.id === 'inbox') {
            const badge = document.createElement('span');
            badge.className = 'comm-badge';
            badge.id = 'comm-inbox-badge';
            badge.hidden = true;
            a.append(badge);
        }
        nav.append(a);
    });
    wrap.append(nav);
    const fragment = document.createDocumentFragment();
    fragment.append(wrap);
    if (active === 'contacts') {
        const sub = document.createElement('nav');
        sub.className = 'comm-subnav';
        sub.setAttribute('aria-label', 'Kontakter');
        const onSegments = location.pathname.toLowerCase().includes('admin-segmenter');
        CONTACT_VIEWS.forEach(view => {
            const a = document.createElement('a');
            a.href = view.href;
            a.textContent = view.label;
            if ((view.id === 'segments') === onSegments) a.setAttribute('aria-current', 'page');
            sub.append(a);
        });
        fragment.append(sub);
    }
    return fragment;
}

// Mirror the sidebar's unread count onto the Innboks tab.
function syncBadge() {
    const source = document.getElementById('messages-badge');
    const badge = document.getElementById('comm-inbox-badge');
    if (!badge) return;
    const text = (source?.textContent || '').trim();
    const visible = source && text && text !== '0' && getComputedStyle(source).display !== 'none';
    badge.hidden = !visible;
    badge.textContent = visible ? text : '';
}

function mount() {
    document.querySelectorAll('#comm-tabs, .comm-subnav').forEach(el => el.remove());
    const active = currentTab();
    if (!active) return;
    injectStyles();
    const content = build(active);
    if (active === 'newsletter') {
        const layout = document.getElementById('newsletter-dashboard-layout');
        if (!layout) return;
        layout.prepend(content);
    } else {
        const header = document.getElementById('dashboard-main-header');
        if (header) header.after(content);
        else document.querySelector('main')?.prepend(content);
    }
    syncBadge();
}

mount();
window.addEventListener('popstate', mount);
window.addEventListener('hkm:newsletter-modechange', mount);
window.addEventListener('hkm:studio-sectionchange', mount);
setInterval(syncBadge, 3000);
