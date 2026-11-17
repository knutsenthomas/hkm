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
.comm-subnav { display:inline-flex; align-self:flex-start; width:auto; gap:4px; padding:3px; margin:0 0 20px; border-radius:10px; background:var(--admin-surface-muted,#e9eef3); }
.comm-subnav a { display:inline-flex; align-items:center; min-height:38px; padding:0 16px; border-radius:8px; color:var(--admin-text-muted,#475569); font-size:14px; font-weight:600; text-decoration:none; }
.comm-subnav a[aria-current="page"] { background:var(--admin-surface,#fff); color:#1b4965; box-shadow:0 1px 2px rgba(15,23,42,.1); }
.comm-tabs a:focus-visible, .comm-subnav a:focus-visible { outline:3px solid #d17d39; outline-offset:-3px; border-radius:6px; }
html[data-theme="dark"] .comm-subnav { background:#1e293b; }
body:has(#comm-tabs) :is(.unified-inbox-container, .inbox-container) { border-radius:0 !important; }
/* Ryddig, flatt oppsett i Kommunikasjon */
body.comm-area #dashboard-main-header .section-header-icon { display:none !important; }
body.comm-area #dashboard-main-header :is(.notification-btn, .mobile-nav-toggle, .user-profile-link) { border-radius:6px !important; box-shadow:none !important; }
body.comm-area .comm-tabs { margin-bottom:16px; }
body.comm-area .comm-tabs a.comm-tab { min-height:46px; font-size:14px; padding:0 14px; }
body.comm-area main :is(.card, .stat-item, .crm-stats-bar, .contacts-grid, .table-container, .workspace-table, .newsletter-workspace, .unified-inbox-container, .inbox-container, .inbox-folders, .modal-content, table) { border-radius:0 !important; }
body.comm-area main :is(input:not([type=checkbox]):not([type=radio]), select, textarea, button:not(.avatar), .btn, a.workspace-primary, .crm-btn) { border-radius:4px !important; box-shadow:none !important; }
body.comm-area .comm-subnav { border-radius:6px; }
body.comm-area .comm-subnav a { border-radius:4px; }
.comm-actions { display:flex; align-items:center; gap:8px; padding:6px 0; }
.comm-actions .workspace-primary { display:inline-flex; align-items:center; min-height:40px; padding:0 16px; border-radius:4px; background:#c56828; color:#fff; font-size:14px; font-weight:650; text-decoration:none; }
.comm-actions [data-resume-editor]:not([hidden]) { min-height:40px; padding:0 14px; border:1px solid var(--admin-border,#e2e8f0); border-radius:4px; background:var(--admin-surface,#fff); color:inherit; font-size:14px; font-weight:600; cursor:pointer; }
.comm-more { position:relative; }
.comm-more summary { list-style:none; display:flex; align-items:center; justify-content:center; width:40px; height:40px; border:1px solid var(--admin-border,#e2e8f0); border-radius:4px; background:var(--admin-surface,#fff); color:var(--admin-text,#1e293b); cursor:pointer; font-size:20px; line-height:1; }
.comm-more summary::-webkit-details-marker { display:none; }
.comm-more[open] .comm-more-menu { display:flex; }
.comm-more-menu { display:none; position:absolute; right:0; top:44px; z-index:50; flex-direction:column; min-width:200px; padding:6px; border:1px solid var(--admin-border,#e2e8f0); background:var(--admin-surface,#fff); box-shadow:0 12px 32px rgba(15,23,42,.12); }
.comm-more-menu button { all:unset; box-sizing:border-box; padding:10px 12px; font-size:14px; color:var(--admin-text,#1e293b); cursor:pointer; }
.comm-more-menu button:hover, .comm-more-menu button:focus-visible { background:var(--admin-surface-muted,#f1f5f9); outline:none; }
/* Tall som én kort linje i stedet for store bokser */
body.comm-area .crm-stats-bar { display:flex !important; flex-wrap:wrap; gap:6px 24px !important; padding:0 !important; margin:0 0 14px !important; background:none !important; border:0 !important; box-shadow:none !important; grid-template-columns:none !important; }
body.comm-area .crm-stats-bar .stat-item { display:flex !important; align-items:baseline; padding:0 !important; background:none !important; border:0 !important; box-shadow:none !important; min-height:0 !important; }
body.comm-area .crm-stats-bar .stat-icon { display:none !important; }
body.comm-area .crm-stats-bar .stat-info { display:flex !important; flex-direction:row !important; align-items:baseline; gap:6px; }
body.comm-area .crm-stats-bar .stat-value { font-size:15px !important; font-weight:700 !important; line-height:1.4 !important; }
body.comm-area .crm-stats-bar .stat-label { font-size:14px !important; font-weight:500 !important; color:var(--admin-text-muted,#64748b) !important; text-transform:none !important; letter-spacing:0 !important; }
body.comm-area .newsletter-workspace > .workspace-heading { display:none !important; }
body.comm-area .newsletter-workspace .workspace-metrics { display:flex !important; flex-wrap:wrap; gap:6px 24px; margin:0 0 14px; }
body.comm-area .newsletter-workspace .workspace-metrics > div { flex-direction:row-reverse !important; justify-content:flex-end; align-items:baseline; gap:6px; padding:0 !important; border:0 !important; background:none !important; }
body.comm-area .newsletter-workspace .workspace-metrics span { font-size:14px; }
body.comm-area .newsletter-workspace .workspace-metrics strong { margin:0 !important; padding:0 !important; font-size:15px !important; font-weight:700 !important; }
body.comm-area .newsletter-workspace .workspace-nav { display:inline-flex !important; gap:4px; padding:3px; margin-bottom:14px; border:0 !important; border-radius:6px; background:var(--admin-surface-muted,#e9eef3); }
body.comm-area .newsletter-workspace .workspace-nav button { min-height:36px; padding:0 14px !important; border:0 !important; border-radius:4px !important; background:transparent !important; color:var(--admin-text-muted,#475569) !important; font-size:14px; font-weight:600; }
body.comm-area .newsletter-workspace .workspace-nav button[aria-pressed="true"] { background:var(--admin-surface,#fff) !important; color:#1b4965 !important; box-shadow:0 1px 2px rgba(15,23,42,.1) !important; }
html[data-theme="dark"] body.comm-area .newsletter-workspace .workspace-nav { background:#1e293b; }
html[data-theme="dark"] body.comm-area .newsletter-workspace .workspace-nav button[aria-pressed="true"] { background:#0f172a !important; color:#f8fafc !important; }

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

let actions = null;

// Newsletter actions sit in the tab row: the main button visible, rare actions in a "…" menu.
function newsletterActions() {
    if (actions) return actions;
    const workspace = document.getElementById('newsletter-workspace');
    const source = workspace?.querySelector('.workspace-actions');
    if (!source) return null;
    actions = document.createElement('div');
    actions.className = 'comm-actions';
    actions.id = 'comm-actions';
    const resume = source.querySelector('[data-resume-editor]');
    const primary = source.querySelector('.workspace-primary');
    const more = document.createElement('details');
    more.className = 'comm-more';
    const summary = document.createElement('summary');
    summary.setAttribute('aria-label', 'Flere valg');
    summary.textContent = '⋯';
    const menu = document.createElement('div');
    menu.className = 'comm-more-menu';
    const refresh = source.querySelector('[data-workspace-refresh]');
    const ai = source.querySelector('#newsletter-ai-connect');
    if (refresh) { refresh.textContent = 'Oppdater oversikten'; menu.append(refresh); }
    if (ai) { ai.textContent = 'Koble nyhetsbrev til AI'; menu.append(ai); }
    [...source.querySelectorAll('button, a')].forEach(el => { if (el !== resume && el !== primary) menu.append(el); });
    menu.addEventListener('click', () => { more.open = false; });
    more.append(summary, menu);
    if (resume) actions.append(resume);
    actions.append(more);
    if (primary) actions.append(primary);
    const labels = { 'data-count-campaigns': 'kampanjer', 'data-count-drafts': 'kladder', 'data-count-sent': 'e-poster sendt' };
    workspace.querySelectorAll('.workspace-metrics > div').forEach(item => {
        const strong = item.querySelector('strong');
        const label = item.querySelector('span');
        const key = strong && [...strong.attributes].map(a => a.name).find(name => labels[name]);
        if (key && label) label.textContent = labels[key];
    });
    return actions;
}

function mount() {
    const keepActions = document.getElementById('comm-actions');
    if (keepActions) keepActions.remove();
    document.querySelectorAll('#comm-tabs, .comm-subnav').forEach(el => el.remove());
    const active = currentTab();
    document.body.classList.toggle('comm-area', !!active);
    if (!active) return;
    injectStyles();
    const content = build(active);
    if (active === 'newsletter') {
        const layout = document.getElementById('newsletter-dashboard-layout');
        if (!layout) return;
        const row = newsletterActions();
        if (row) content.querySelector('#comm-tabs')?.append(row);
        layout.prepend(content);
    } else {
        const header = document.getElementById('dashboard-main-header');
        if (header) header.after(content);
        else document.querySelector('main')?.prepend(content);
    }
    const title = document.querySelector('#dashboard-main-header .section-title');
    if (title) title.textContent = 'Kommunikasjon';
    syncBadge();
}

mount();
window.addEventListener('popstate', mount);
window.addEventListener('hkm:newsletter-modechange', mount);
window.addEventListener('hkm:studio-sectionchange', mount);
setInterval(syncBadge, 3000);
