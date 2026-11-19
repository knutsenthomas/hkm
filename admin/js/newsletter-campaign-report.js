import { newsletterHtmlRequest } from './newsletter-html-import.js';
import { mountCampaignEmail } from './newsletter-campaign-preview.js';

const el = (tag, text, className) => {
    const element = document.createElement(tag);
    if (text != null) element.textContent = text;
    if (className) element.className = className;
    return element;
};
const number = value => Number(value).toLocaleString('nb-NO');
const percent = (part, whole) => whole ? (100 * part / whole).toLocaleString('nb-NO', { maximumFractionDigits: 1 }) + ' %' : '–';

const TABS = [
    { id: 'overview', label: 'Oversikt' },
    { id: 'email', label: 'E-post' },
    { id: 'delivery', label: 'Levering' },
    { id: 'clicks', label: 'Klikk' }
];

function stat(label, value, note) {
    const box = el('div', null, 'report-stat');
    box.append(el('span', label), el('strong', value));
    if (note) box.append(el('small', note));
    return box;
}

function renderOverview(panel, campaign, { state, dateText }) {
    const sent = Number(campaign.sentCount) || 0;
    const tracked = campaign.trackingEnabled === true;
    const grid = el('div', null, 'report-stats');
    grid.append(
        stat('Sendt', `${campaign.sentCount ?? '–'} / ${campaign.recipientCount ?? '–'}`, sent && campaign.recipientCount ? percent(sent, campaign.recipientCount) + ' av mottakerne' : null),
        stat('Klikkrate', tracked ? percent(campaign.engagement?.uniqueClicks || 0, sent) : 'Ikke målt', tracked ? `${number(campaign.engagement?.uniqueClicks || 0)} mottakere klikket` : null),
        stat('Åpningsrate', tracked ? percent(campaign.engagement?.uniqueOpens || 0, sent) : 'Ikke målt', tracked ? 'Anslag – ofte for høy' : null),
        stat('Status', state, dateText)
    );
    panel.append(grid);
    if (!tracked) panel.append(el('p', 'Måling av åpninger og klikk var slått av da denne kampanjen ble sendt. Tallene kan ikke hentes i ettertid.', 'report-note'));
}

async function renderDelivery(panel, campaign, isActive) {
    const status = el('p', 'Henter leveringslogg …', 'report-note');
    status.setAttribute('role', 'status');
    panel.append(status);
    try {
        const result = await newsletterHtmlRequest({ action: 'campaignDelivery', campaignId: campaign.id });
        if (!isActive()) return;
        status.remove();
        const grid = el('div', null, 'report-stats');
        grid.append(
            stat('Mottakere', number(result.recipientCount)),
            stat('Registrert sendt', number(result.sentCount ?? result.sent)),
            stat('Feilet', number(result.failed.length)),
            stat('Uten logg', number(result.missing.length))
        );
        panel.append(grid);
        if (result.matchedBy === 'subject') {
            panel.append(el('p', 'Denne kampanjen ble sendt før loggen lagret kampanje-ID, så loggene er koblet via emnet. Flere utsendinger med samme emne kan ikke skilles sikkert.', 'report-note'));
        }
        if (result.truncated) panel.append(el('p', 'Bare de første 2 000 loggene er tatt med.', 'report-note'));
        const list = (heading, rows, render) => {
            if (!rows.length) return;
            panel.append(el('h4', heading));
            const table = el('table', null, 'report-table');
            const body = el('tbody');
            rows.forEach(row => body.append(render(row)));
            table.append(body);
            const wrap = el('div', null, 'report-table-wrap');
            wrap.append(table);
            panel.append(wrap);
        };
        list('Feilet', result.failed, row => {
            const tr = el('tr');
            const who = el('td', row.email, 'report-email');
            const why = el('td', row.error, 'report-error');
            tr.append(who, why);
            return tr;
        });
        list('Uten registrert sending', result.missing, address => {
            const tr = el('tr');
            tr.append(el('td', address, 'report-email'));
            return tr;
        });
        if (!result.failed.length && !result.missing.length) {
            panel.append(el('p', 'Alle mottakere er registrert som sendt. Det bekrefter ikke at e-posten havnet i innboksen.', 'report-note'));
        }
    } catch (error) {
        if (isActive()) status.textContent = error?.message || 'Kunne ikke hente leveringsloggen. Kontroller administratortilgangen og prøv igjen.';
    }
}

function renderClicks(panel, campaign) {
    if (campaign.trackingEnabled !== true) {
        panel.append(el('p', 'Klikk ble ikke målt for denne kampanjen.', 'report-note'));
        return;
    }
    const sent = Number(campaign.sentCount) || 0;
    const links = Object.values(campaign.engagement?.links || {}).sort((a, b) => Number(b.uniqueClicks || 0) - Number(a.uniqueClicks || 0));
    if (!links.length) {
        panel.append(el('p', 'Ingen lenkeklikk registrert ennå. Målingen varer i 180 dager etter sending.', 'report-note'));
        return;
    }
    const table = el('table', null, 'report-table');
    const head = el('thead');
    const headRow = el('tr');
    headRow.append(el('th', 'Lenke'), el('th', 'Unike klikk', 'is-number'), el('th', 'Andel', 'is-number'));
    head.append(headRow);
    const body = el('tbody');
    links.forEach(link => {
        const row = el('tr');
        const url = el('td', link.url, 'report-url');
        row.append(url, el('td', number(link.uniqueClicks || 0), 'is-number'), el('td', percent(link.uniqueClicks || 0, sent), 'is-number'));
        body.append(row);
    });
    table.append(head, body);
    const wrap = el('div', null, 'report-table-wrap');
    wrap.append(table);
    panel.append(wrap, el('p', 'Antatt aktivitet per mottaker. Sikkerhetsfiltre kan klikke lenker automatisk.', 'report-note'));
}

export function showCampaignReport(campaign, { state = '', dateText = '' } = {}) {
    const dialog = el('dialog', null, 'newsletter-html-dialog campaign-report');
    dialog.setAttribute('aria-labelledby', 'campaign-report-title');
    const header = el('header', null, 'newsletter-ai-header');
    const title = el('h2', campaign.subject || 'Uten emne');
    title.id = 'campaign-report-title';
    const close = el('button', null, 'newsletter-ai-close');
    close.type = 'button';
    close.setAttribute('aria-label', 'Lukk');
    close.innerHTML = '<span class="material-symbols-outlined" aria-hidden="true">close</span>';
    close.onclick = () => dialog.close();
    header.append(title, close);

    const tabs = el('div', null, 'report-tabs');
    tabs.setAttribute('role', 'tablist');
    tabs.setAttribute('aria-label', 'Kampanjerapport');
    const panels = {};
    let emailView = null;
    let open = true;
    const loaded = new Set();
    const select = id => {
        tabs.querySelectorAll('[role=tab]').forEach(tab => {
            const on = tab.dataset.tab === id;
            tab.setAttribute('aria-selected', String(on));
            tab.tabIndex = on ? 0 : -1;
        });
        Object.entries(panels).forEach(([key, panel]) => { panel.hidden = key !== id; });
        if (loaded.has(id)) return;
        loaded.add(id);
        const panel = panels[id];
        if (id === 'overview') renderOverview(panel, campaign, { state, dateText });
        if (id === 'email') emailView = mountCampaignEmail(panel, campaign);
        if (id === 'delivery') renderDelivery(panel, campaign, () => open);
        if (id === 'clicks') renderClicks(panel, campaign);
    };
    TABS.forEach(({ id, label }, index) => {
        const tab = el('button', label);
        tab.type = 'button';
        tab.dataset.tab = id;
        tab.id = 'campaign-report-tab-' + id;
        tab.setAttribute('role', 'tab');
        tab.setAttribute('aria-controls', 'campaign-report-panel-' + id);
        tab.onclick = () => select(id);
        tab.onkeydown = event => {
            if (!['ArrowRight', 'ArrowLeft'].includes(event.key)) return;
            const next = TABS[(index + (event.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length].id;
            select(next);
            tabs.querySelector(`[data-tab="${next}"]`).focus();
        };
        tabs.append(tab);
        const panel = el('div', null, 'report-panel');
        panel.id = 'campaign-report-panel-' + id;
        panel.setAttribute('role', 'tabpanel');
        panel.setAttribute('aria-labelledby', tab.id);
        panels[id] = panel;
    });

    dialog.append(header, tabs, ...Object.values(panels));
    dialog.addEventListener('close', () => { open = false; emailView?.destroy(); dialog.remove(); }, { once: true });
    document.body.append(dialog);
    dialog.showModal();
    select('overview');
}
