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

function build(active) {
    const wrap = document.createElement('div');
    wrap.className = 'comm-tabs';
    wrap.id = 'comm-tabs';
    wrap.dataset.active = active;
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
    const active = currentTab();
    document.documentElement.classList.toggle('comm-page', !!active);
    document.body.classList.toggle('comm-area', !!active);
    const existing = document.getElementById('comm-tabs');
    // Pages ship the tab bar in their HTML so it is there on first paint; keep it when it matches.
    if (existing && existing.dataset.active === active && active) {
        if (active === 'newsletter') {
            const row = newsletterActions();
            if (row && !existing.contains(row)) existing.append(row);
        }
        const title = document.querySelector('#dashboard-main-header .section-title');
        if (title) title.textContent = 'Kommunikasjon';
        syncBadge();
        return;
    }
    const keepActions = document.getElementById('comm-actions');
    if (keepActions) keepActions.remove();
    document.querySelectorAll('#comm-tabs, .comm-subnav').forEach(el => el.remove());
    if (!active) return;
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
