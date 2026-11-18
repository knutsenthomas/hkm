// Shared tab bar for the Kommunikasjon area: Innboks, Kontakter (with Segmenter) and Nyhetsbrev.
const TABS = [
    { id: 'inbox', label: 'Innboks', icon: 'inbox', href: '/admin/admin-meldinger.html' },
    { id: 'contacts', label: 'Kontakter', icon: 'group', href: '/admin/admin-kommunikasjon.html' },
    { id: 'newsletter', label: 'Nyhetsbrev', icon: 'mail', href: '/admin/admin-nyhetsbrev.html?section=newsletter' }
];
const ICONS = {"inbox": `<svg class="comm-tab-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"/></svg>`, "group": `<svg class="comm-tab-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>`, "mail": `<svg class="comm-tab-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 6l-10 7L2 6"/></svg>`};
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

// Tabs live in the page header, next to the title (static in each page's HTML; built here only as a fallback).
function buildNav(active) {
    const nav = document.createElement('nav');
    nav.className = 'comm-header-tabs';
    nav.setAttribute('aria-label', 'Kommunikasjon');
    TABS.forEach(tab => {
        const a = document.createElement('a');
        a.className = 'comm-tab';
        a.href = tab.href;
        if (tab.id === active) a.setAttribute('aria-current', 'page');
        // Inline SVG: visible at once, no wait for the icon font.
        a.insertAdjacentHTML('beforeend', ICONS[tab.icon] || '');
        a.append(document.createTextNode(tab.label));
        if (tab.id === 'inbox') {
            const badge = document.createElement('span');
            badge.className = 'comm-badge';
            badge.id = 'comm-inbox-badge';
            badge.hidden = true;
            a.append(badge);
        }
        nav.append(a);
    });
    return nav;
}

function ensureHeaderNav(active) {
    let nav = document.querySelector('#dashboard-main-header .comm-header-tabs');
    if (!nav) {
        const titles = document.querySelector('#dashboard-main-header .section-header-titles');
        if (!titles) return;
        nav = buildNav(active);
        titles.after(nav);
    }
    nav.querySelectorAll('a.comm-tab').forEach(a => {
        const tab = TABS.find(t => a.getAttribute('href') === t.href);
        if (tab && tab.id === active) a.setAttribute('aria-current', 'page');
        else a.removeAttribute('aria-current');
    });
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
    const labels = { 'data-count-campaigns': 'Kampanjer', 'data-count-drafts': 'Kladder', 'data-count-sent': 'E-poster sendt' };
    workspace.querySelectorAll('.workspace-metrics > div').forEach(item => {
        const strong = item.querySelector('strong');
        const label = item.querySelector('span');
        const key = strong && [...strong.attributes].map(a => a.name).find(name => labels[name]);
        if (key && label) label.textContent = labels[key];
    });
    return actions;
}

// Newsletter: view switcher and actions share one toolbar row, above the numbers (as in the sketch).
function newsletterToolbar() {
    const workspace = document.getElementById('newsletter-workspace');
    if (!workspace || workspace.querySelector('.comm-toolbar')) return;
    const nav = workspace.querySelector('.workspace-nav');
    const row = newsletterActions();
    if (!nav || !row) return;
    const bar = document.createElement('div');
    bar.className = 'comm-toolbar';
    const metrics = workspace.querySelector(':scope > .workspace-metrics');
    (metrics || nav).before(bar);
    bar.append(nav, row);
}

// Kontakter: view switcher left, the two main actions right (as in the sketch).
function contactsToolbar() {
    const sub = document.querySelector('.comm-subnav');
    if (!sub || sub.parentElement.classList.contains('comm-subnav-row')) return;
    const row = document.createElement('div');
    row.className = 'comm-subnav-row';
    sub.before(row);
    row.append(sub);
    const acts = document.createElement('div');
    acts.className = 'comm-actions';
    const label = (btn, text) => {
        if (!btn) return;
        btn.querySelectorAll('span:not(.material-symbols-outlined)').forEach(el => el.remove());
        const t = document.createElement('span');
        t.textContent = text;
        btn.append(t);
        btn.classList.add('comm-action-btn');
    };
    const importBtn = document.getElementById('import-export-btn');
    const addBtn = document.getElementById('add-contact-btn');
    const segBtn = document.querySelector('.btn-create-segment');
    if (importBtn) { label(importBtn, 'Importer / eksporter'); acts.append(importBtn); }
    if (addBtn) { label(addBtn, 'Ny kontakt'); addBtn.classList.add('comm-primary'); acts.append(addBtn); }
    if (segBtn && !addBtn) { segBtn.classList.add('comm-action-btn', 'comm-primary'); acts.append(segBtn); }
    if (acts.children.length) row.append(acts);
}

function mount() {
    const active = currentTab();
    document.documentElement.classList.toggle('comm-page', !!active);
    document.body.classList.toggle('comm-area', !!active);
    if (!active) return;
    ensureHeaderNav(active);
    if (active === 'newsletter') newsletterToolbar();
    if (active === 'contacts') contactsToolbar();
    const title = document.querySelector('#dashboard-main-header .section-title');
    if (title) title.textContent = 'Kommunikasjon';
    syncBadge();
}

mount();
window.addEventListener('popstate', mount);
window.addEventListener('hkm:newsletter-modechange', mount);
window.addEventListener('hkm:studio-sectionchange', mount);
setInterval(syncBadge, 3000);
