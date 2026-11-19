import { HKD_PRODUCT_TEMPLATE } from './newsletter-product-template.js';
import { showCampaignEmail } from './newsletter-campaign-preview.js';
import { showCampaignReport } from './newsletter-campaign-report.js';

export function campaignTime(value) {
    if (!value) return 0;
    const result = value?.toDate ? value.toDate().getTime() : new Date(value).getTime();
    return Number.isFinite(result) ? result : 0;
}
export function campaignState(campaign, now = Date.now()) {
    if (campaign.status === 'completed') return Number(campaign.sentCount || 0) < Number(campaign.recipientCount || 0) ? 'Avvik' : 'Fullført';
    if (['failed', 'error'].includes(campaign.status)) return 'Feil';
    if (campaign.status === 'cancelled') return 'Avbrutt';
    const unfinished = !campaign.dispatchCompletedAt && (campaign.dispatchStartedAt || campaign.status === 'queued');
    if (unfinished) {
        const started = campaignTime(campaign.dispatchStartedAt || campaign.queuedAt || campaign.createdAt);
        if (!started || now - started > 24 * 60 * 60 * 1000) return 'Uavklart';
    }
    if (campaign.dispatchStartedAt && !campaign.dispatchCompletedAt) return 'Sender';
    return ({ queued: 'I kø', draft: 'Utkast', scheduled: 'Planlagt', cancelled: 'Avbrutt' })[campaign.status] || 'Ukjent';
}
export function inspectNewsletter(subject, blocks, html) {
    const findings = [];
    if (!subject.trim()) findings.push('Legg til emne før utsending.');
    if (!blocks.length) findings.push('Nyhetsbrevet mangler innhold.');
    if (/href=["'](?:#|javascript:|["'])/i.test(html)) findings.push('Kontroller knapper og lenker: minst én mangler en gyldig adresse.');
    if (/\b(?:Lorem ipsum|Sett inn tekst|Din tekst her)\b/i.test(html)) findings.push('Erstatt eksempelteksten før utsending.');
    return findings;
}
export function summarizeCampaigns(campaigns, days = 'all', now = Date.now()) {
    const count = value => value != null && value !== '' && Number.isFinite(Number(value)) && Number(value) >= 0 ? Number(value) : null;
    const rows = campaigns.filter(c => {
        const timestamp = campaignTime(c.queuedAt || c.sentAt || c.createdAt);
        return days === 'all' || (timestamp > 0 && timestamp >= now - Number(days) * 86400000 && timestamp <= now);
    });
    const months = new Map();
    let sent = 0, unknown = 0, issues = 0, completed = 0, opens = 0, clicks = 0, trackedSent = 0, recipients = 0, trackedCampaigns = 0;
    rows.forEach(c => {
        const amount = count(c.sentCount); sent += amount || 0; unknown += amount === null ? 1 : 0;
        recipients += count(c.recipientCount) || 0;
        if (c.trackingEnabled === true) { trackedCampaigns++; trackedSent += amount || 0; opens += count(c.engagement?.uniqueOpens) || 0; clicks += count(c.engagement?.uniqueClicks) || 0; }
        const state = campaignState(c, now);
        if (['Avvik', 'Feil', 'Uavklart'].includes(state)) issues++;
        if (state === 'Fullført') completed++;
        const timestamp = campaignTime(c.queuedAt || c.sentAt || c.createdAt);
        const key = timestamp ? new Date(timestamp).toLocaleDateString('sv-SE', { year:'numeric', month:'2-digit' }) : 'Ukjent dato';
        const month = months.get(key) || { campaigns:0, sent:0, unknown:0 };
        month.campaigns++; month.sent += amount || 0; month.unknown += amount === null ? 1 : 0; months.set(key, month);
    });
    return { rows, sent, unknown, issues, completed, opens, clicks, trackedSent, recipients, trackedCampaigns, months: [...months].sort((a,b) => a[0].localeCompare(b[0])) };
}
const root = document.getElementById('newsletter-workspace');
if (root) {
    const STUDIO_SECTIONS = ['content', 'newsletter', 'ideas'];
    const currentSection = () => {
        const value = new URLSearchParams(location.search).get('section');
        return STUDIO_SECTIONS.includes(value) ? value : 'content';
    };
    const isNewsletterArea = currentSection() === 'newsletter';
    let workspaceLoaded = false;
    const syncArea = () => {
        const section = currentSection();
        const active = section === 'newsletter';
        root.hidden = !active;
        document.body.classList.toggle('newsletter-area-active', active);
        STUDIO_SECTIONS.forEach(name => document.body.classList.toggle(`studio-section-${name}`, name === section));
        document.querySelectorAll('[data-studio-section]').forEach(link => {
            if (link.dataset.studioSection === section) link.setAttribute('aria-current', 'page');
            else link.removeAttribute('aria-current');
        });
        let signedIn = false;
        try { signedIn = !!(window.firebaseService?.db && window.firebase?.apps?.length && window.firebase.auth().currentUser); } catch (_) { signedIn = false; }
        if (active && !workspaceLoaded && signedIn) {
            workspaceLoaded = true;
            document.querySelector('[data-workspace-refresh]')?.click();
        }
    };
    document.querySelectorAll('[data-studio-section]').forEach(link => link.addEventListener('click', event => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
        event.preventDefault();
        const url = new URL(window.location.href);
        const section = link.dataset.studioSection;
        if (section === 'content') url.searchParams.delete('section'); else url.searchParams.set('section', section);
        url.searchParams.delete('draftId');
        window.history.pushState({}, '', url.toString());
        syncArea();
        window.dispatchEvent(new CustomEvent('hkm:studio-sectionchange'));
    }));
    window.addEventListener('popstate', syncArea);
    syncArea();
    window.addEventListener('hkm:newsletter-modechange', syncArea);
    window.addEventListener('hkm:newsletter-overview', event => {
        syncArea();
        document.querySelector('[data-resume-editor]').hidden = !event.detail?.resumeEditor;
        document.querySelector('[data-workspace-refresh]').click();
    });
    document.querySelector('[data-resume-editor]')?.addEventListener('click', () => {
        window.builder?.toggleMode('builder');
        window.builder?.switchSidebarView('builder');
    });
    // Mottakere er de samme personene som i Kontakter: vis dem der, i samme design.
    root.querySelector('[data-open-subscribers]')?.addEventListener('click', () => {
        location.href = '/admin/admin-kommunikasjon.html';
    });
    let campaigns = [];
    let drafts = [];
    let templates = [HKD_PRODUCT_TEMPLATE];
    const status = root.querySelector('[data-workspace-status]');
    const table = root.querySelector('tbody');
    const search = root.querySelector('[data-campaign-search]');
    const filter = root.querySelector('[data-campaign-filter]');
    const el = (tag, text) => { const element = document.createElement(tag); element.textContent = text; return element; };
    const date = data => data.queuedAt || data.sentAt || data.createdAt || '';
    const time = campaignTime;
    const showLogs = async campaign => {
        const dialog = document.createElement('dialog');
        dialog.className = 'newsletter-start-dialog';
        dialog.append(el('h2', 'Utsendingslogg'), el('p', campaign.subject || 'Uten emne'), el('p', 'Lagret status: ' + (campaign.status || 'Ukjent') + '. Kampanje: ' + campaign.id));
        dialog.append(el('p', 'Loggene kobles via emne. Flere forsøk med samme emne kan ikke skilles sikkert, og loggene bekrefter ikke levering til innboksen.'));
        const output = el('p', 'Henter logger …');
        const close = el('button', 'Lukk'); close.type = 'button'; close.addEventListener('click', () => dialog.close());
        dialog.append(output, close); document.body.append(dialog);
        dialog.addEventListener('close', () => dialog.remove(), { once: true }); dialog.showModal();
        try {
            if (!campaign.subject) { output.textContent = 'Kampanjen mangler emne; loggene kan ikke kobles.'; return; }
            const snapshot = await window.firebaseService.db.collection('email_logs').where('subject', '==', campaign.subject).limit(100).get();
            const logs = []; snapshot.forEach(doc => { const data = doc.data(); if (data.type === 'newsletter') logs.push(data); });
            const sent = logs.filter(log => log.status === 'sent').length;
            const failed = logs.filter(log => log.status === 'failed').length;
            output.textContent = logs.length ? `Fant ${sent} registrert som sendt og ${failed} registrert som feilet med dette emnet. Utvalget er begrenset til 100 logger og kan omfatte flere utsendinger.` : 'Ingen nyhetsbrevlogger med dette emnet ble funnet. Dette beviser ikke at utsendingen mislyktes.';
        } catch { output.textContent = 'Kunne ikke hente loggene. Kontroller administratortilgangen og prøv igjen.'; }
    };
    const showEngagement = campaign => {
        const dialog = document.createElement('dialog'); dialog.className = 'newsletter-start-dialog';
        dialog.append(el('h2', 'Åpninger og klikk'), el('p', campaign.subject || 'Uten emne'));
        dialog.append(el('p', 'Antatt aktivitet per mottakereksemplar. Automatiske sikkerhetssjekker og personvernfunksjoner kan påvirke tallene. Dette bekrefter ikke lesing. Måling varer i 180 dager etter sending.'));
        const links = Object.values(campaign.engagement?.links || {}).sort((a,b) => Number(b.uniqueClicks || 0) - Number(a.uniqueClicks || 0));
        links.forEach(link => { const row = el('p', `${link.uniqueClicks || 0} unike klikk · ${link.url}`); row.style.overflowWrap = 'anywhere'; dialog.append(row); });
        if (!links.length) dialog.append(el('p', 'Ingen lenkeklikk registrert ennå.'));
        const close = el('button', 'Lukk'); close.type = 'button'; close.onclick = () => dialog.close(); dialog.append(close);
        dialog.addEventListener('close', () => dialog.remove(), {once:true}); document.body.append(dialog); dialog.showModal();
    };
    let analyticsIssuesOnly = false;
    let analyticsSort = { key: 'date', dir: -1 };
    const issueStates = ['Avvik', 'Feil', 'Uavklart'];
    const stateTone = { Fullført: 'good', Avvik: 'warning', Uavklart: 'warning', Feil: 'critical', Sender: 'info', 'I kø': 'info', Planlagt: 'info' };
    const stateNotes = {
        Avvik: 'Færre registrert sendt enn mottakere. Åpne kampanjen og se Levering.',
        Feil: 'Utsendingen feilet.',
        Uavklart: 'Uavsluttet forsøk eldre enn 24 timer. Faktisk utsending er ikke bekreftet.'
    };
    const periodLabel = { 30: 'forrige 30 dager', 90: 'forrige 90 dager' };
    const number = value => Number(value).toLocaleString('nb-NO');
    const percent = (part, whole) => whole ? (100 * part / whole).toLocaleString('nb-NO', { maximumFractionDigits: 1 }) + ' %' : '–';
    const plural = (amount, one, many) => `${number(amount)} ${amount === 1 ? one : many}`;
    const rate = (part, whole) => whole ? part / whole : null;
    const metricCard = ({ label, value, note, delta, info, primary, muted }) => {
        const card = el('div', '');
        if (primary) card.classList.add('is-primary');
        if (muted) card.classList.add('is-muted');
        const head = el('span', label);
        if (info) {
            const button = el('button', 'i'); button.type = 'button'; button.className = 'metric-info';
            button.setAttribute('aria-label', 'Om ' + label.toLowerCase());
            button.setAttribute('aria-expanded', 'false');
            const text = el('p', info); text.className = 'metric-info-text'; text.hidden = true;
            button.onclick = event => { event.stopPropagation(); text.hidden = !text.hidden; button.setAttribute('aria-expanded', String(!text.hidden)); };
            head.append(button);
            card.append(head, el('strong', value));
            if (delta) card.append(delta);
            if (note) card.append(el('small', note));
            card.append(text);
            return card;
        }
        card.append(head, el('strong', value));
        if (delta) card.append(delta);
        if (note) card.append(el('small', note));
        return card;
    };
    // Change against the previous period of the same length. `points` shows percentage points.
    const deltaLine = (current, previous, { points = false, label }) => {
        const line = el('em', ''); line.className = 'metric-delta';
        if (current == null || previous == null) { line.textContent = `Ingen tall for ${label}`; line.classList.add('is-flat'); return line; }
        const diff = points ? (current - previous) * 100 : (previous ? (current - previous) / previous * 100 : null);
        if (diff == null) { line.textContent = `Ingen tall for ${label}`; line.classList.add('is-flat'); return line; }
        const rounded = Math.round(diff * 10) / 10;
        const arrow = rounded > 0 ? '▲' : rounded < 0 ? '▼' : '–';
        line.classList.add(rounded > 0 ? 'is-up' : rounded < 0 ? 'is-down' : 'is-flat');
        line.textContent = `${arrow} ${Math.abs(rounded).toLocaleString('nb-NO', { maximumFractionDigits: 1 })}${points ? ' poeng' : ' %'} mot ${label}`;
        return line;
    };
    const campaignRates = campaign => {
        const sent = Number(campaign.sentCount) || 0;
        const tracked = campaign.trackingEnabled === true;
        return {
            sent,
            tracked,
            clicks: tracked ? Number(campaign.engagement?.uniqueClicks || 0) : null,
            opens: tracked ? Number(campaign.engagement?.uniqueOpens || 0) : null,
            clickRate: tracked && sent ? Number(campaign.engagement?.uniqueClicks || 0) / sent : null,
            openRate: tracked && sent ? Number(campaign.engagement?.uniqueOpens || 0) / sent : null
        };
    };
    const renderChart = rows => {
        const section = root.querySelector('[data-analytics-chart]');
        const body = root.querySelector('[data-analytics-chart-body]'); body.replaceChildren();
        const points = rows.map(campaign => ({ campaign, stamp: time(date(campaign)), ...campaignRates(campaign) }))
            .filter(point => point.clickRate != null && point.stamp).sort((a, b) => a.stamp - b.stamp).slice(-12);
        section.hidden = points.length < 3;
        if (section.hidden) return;
        const max = Math.max(0.05, ...points.map(point => point.clickRate)) * 1.15;
        const width = 640, height = 200, left = 36, bottom = 28, top = 18, gap = 2;
        const plotW = width - left - 8, plotH = height - top - bottom;
        const slot = plotW / points.length, barW = Math.min(44, slot - gap * 2 - 8);
        const ns = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(ns, 'svg');
        svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
        svg.setAttribute('role', 'img');
        svg.setAttribute('aria-label', 'Klikkrate per utsending: ' + points.map(point => `${point.campaign.subject || 'Uten emne'} ${percent(point.clicks, point.sent)}`).join(', '));
        const add = (tag, attrs, text) => { const node = document.createElementNS(ns, tag); Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value)); if (text != null) node.textContent = text; svg.append(node); return node; };
        [0, 0.5, 1].forEach(step => {
            const y = top + plotH - step * plotH;
            add('line', { x1: left, x2: width - 8, y1: y, y2: y, class: 'chart-grid' });
            add('text', { x: left - 6, y: y + 4, 'text-anchor': 'end', class: 'chart-axis' }, (max * step * 100).toLocaleString('nb-NO', { maximumFractionDigits: 1 }) + ' %');
        });
        const best = points.reduce((a, b) => (b.clickRate > a.clickRate ? b : a));
        points.forEach((point, index) => {
            const h = Math.max(2, point.clickRate / max * plotH);
            const x = left + index * slot + (slot - barW) / 2, y = top + plotH - h;
            const r = Math.min(4, barW / 2, h);
            const bar = add('path', { d: `M${x},${top + plotH} V${y + r} Q${x},${y} ${x + r},${y} H${x + barW - r} Q${x + barW},${y} ${x + barW},${y + r} V${top + plotH} Z`, class: 'chart-bar', tabindex: 0 });
            const label = `${point.campaign.subject || 'Uten emne'}: ${percent(point.clicks, point.sent)} klikket (${number(point.clicks)} av ${number(point.sent)})`;
            const tip = document.createElementNS(ns, 'title'); tip.textContent = label; bar.append(tip);
            bar.addEventListener('click', () => openReport(point.campaign));
            bar.addEventListener('keydown', event => { if (event.key === 'Enter') openReport(point.campaign); });
            if (point === best || index === points.length - 1) add('text', { x: x + barW / 2, y: y - 5, 'text-anchor': 'middle', class: 'chart-value' }, percent(point.clicks, point.sent));
            add('text', { x: x + barW / 2, y: height - 9, 'text-anchor': 'middle', class: 'chart-axis' }, new Date(point.stamp).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' }));
        });
        body.append(svg);
    };
    const openReport = campaign => {
        const stamp = time(date(campaign));
        showCampaignReport(campaign, { state: campaignState(campaign), dateText: stamp ? 'Sendt ' + new Date(stamp).toLocaleDateString('nb-NO') : '' });
    };
    const renderAnalytics = () => {
        const period = root.querySelector('[data-analytics-period]').value;
        const summary = summarizeCampaigns(campaigns, period);
        const previous = period === 'all' ? null : summarizeCampaigns(campaigns, period, Date.now() - Number(period) * 86400000);
        const compare = previous && previous.rows.length ? previous : null;
        const label = periodLabel[period];
        if (!summary.issues) analyticsIssuesOnly = false;
        const metrics = root.querySelector('[data-analytics-metrics]'); metrics.replaceChildren();
        const total = summary.rows.length;
        const basis = summary.trackedCampaigns
            ? (summary.trackedCampaigns === total ? 'Alle kampanjene i perioden ble målt' : `Bare ${summary.trackedCampaigns} av ${plural(total, 'kampanje', 'kampanjer')} ble målt`)
            : 'Ingen kampanjer i perioden ble målt';
        const clickRate = rate(summary.clicks, summary.trackedSent);
        const openRate = rate(summary.opens, summary.trackedSent);
        metrics.append(
            metricCard({
                label: 'Klikkrate', value: percent(summary.clicks, summary.trackedSent), primary: true,
                delta: compare && summary.trackedSent ? deltaLine(clickRate, compare ? rate(compare.clicks, compare.trackedSent) : null, { points: true, label }) : null,
                note: summary.trackedCampaigns ? `${plural(summary.clicks, 'mottaker', 'mottakere')} klikket · ${basis.toLowerCase()}` : basis
            }),
            metricCard({
                label: 'Sendt', value: number(summary.sent),
                delta: compare && total ? deltaLine(summary.sent, compare ? compare.sent : null, { label }) : null,
                note: `${plural(total, 'utsendelse', 'utsendelser')} · ${plural(summary.recipients, 'mottaker', 'mottakere')}${summary.unknown ? ` · ${summary.unknown} uten sendetall` : ''}`
            }),
            metricCard({
                label: 'Åpningsrate', value: percent(summary.opens, summary.trackedSent), muted: true,
                delta: compare && summary.trackedSent ? deltaLine(openRate, compare ? rate(compare.opens, compare.trackedSent) : null, { points: true, label }) : null,
                note: summary.trackedCampaigns ? 'Anslag – ofte for høy' : basis,
                info: 'Åpninger registreres med et usynlig bilde. Apple Mail og mange sikkerhetsfiltre laster det inn automatisk, så åpningsraten blir ofte for høy. Klikkrate er det mest pålitelige tallet. Bare kampanjer sendt med måling på telles.'
            })
        );
        const followUp = metricCard({
            label: 'Trenger oppfølging', value: number(summary.issues),
            note: summary.issues ? (analyticsIssuesOnly ? 'Viser bare disse. Trykk for å vise alle.' : 'Avvik, feil eller uavklart. Trykk for å vise.') : 'Ingen avvik i perioden'
        });
        if (summary.issues) {
            followUp.classList.add('workspace-metric-filter');
            if (!analyticsIssuesOnly) followUp.classList.add('has-issues');
            followUp.tabIndex = 0;
            followUp.setAttribute('role', 'button');
            followUp.setAttribute('aria-pressed', String(analyticsIssuesOnly));
            const toggle = () => {
                analyticsIssuesOnly = !analyticsIssuesOnly;
                renderAnalytics();
                root.querySelector('[data-analytics-metrics] .workspace-metric-filter')?.focus();
            };
            followUp.onclick = toggle;
            followUp.onkeydown = event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggle(); } };
        }
        metrics.append(followUp);
        root.querySelector('[data-analytics-clear]').hidden = !analyticsIssuesOnly;

        renderChart(summary.rows);

        const sortValue = campaign => {
            const rates = campaignRates(campaign);
            if (analyticsSort.key === 'date') return time(date(campaign));
            if (analyticsSort.key === 'sent') return rates.sent;
            if (analyticsSort.key === 'clicks') return rates.clickRate ?? -1;
            return rates.openRate ?? -1;
        };
        root.querySelectorAll('.analytics-table th').forEach(th => {
            const button = th.querySelector('[data-sort]');
            if (!button) return;
            th.setAttribute('aria-sort', button.dataset.sort === analyticsSort.key ? (analyticsSort.dir < 0 ? 'descending' : 'ascending') : 'none');
        });
        const details = root.querySelector('[data-analytics-campaigns]'); details.replaceChildren();
        summary.rows
            .filter(campaign => !analyticsIssuesOnly || issueStates.includes(campaignState(campaign)))
            .sort((a, b) => (sortValue(a) - sortValue(b)) * analyticsSort.dir)
            .forEach(campaign => {
                const row = el('tr', ''); row.className = 'analytics-row'; row.tabIndex = 0;
                const state = campaignState(campaign);
                const rates = campaignRates(campaign);
                const stamp = time(date(campaign));
                const subject = el('td', campaign.subject || 'Uten emne'); subject.className = 'analytics-subject'; subject.dataset.label = 'Emne';
                const statusCell = el('td', ''); statusCell.dataset.label = 'Status';
                const badge = el('span', state); badge.className = 'status-badge is-' + (stateTone[state] || 'neutral');
                if (stateNotes[state]) badge.title = stateNotes[state];
                statusCell.append(badge);
                const dateCell = el('td', stamp ? new Date(stamp).toLocaleDateString('nb-NO') : '–'); dateCell.dataset.label = 'Dato';
                const figure = (main, sub, labelText, muted) => {
                    const cell = el('td', ''); cell.className = 'is-number' + (muted ? ' workspace-muted' : ''); cell.dataset.label = labelText;
                    cell.append(el('span', main)); if (sub) { const small = el('small', sub); cell.append(small); }
                    return cell;
                };
                const notTracked = 'Måling av åpninger og klikk var slått av da kampanjen ble sendt.';
                const sentCell = figure(`${campaign.sentCount ?? '–'} / ${campaign.recipientCount ?? '–'}`, rates.sent && campaign.recipientCount ? percent(rates.sent, campaign.recipientCount) : null, 'Sendt');
                const clickCell = rates.tracked ? figure(percent(rates.clicks, rates.sent), plural(rates.clicks, 'klikk', 'klikk'), 'Klikket') : figure('Ikke målt', null, 'Klikket', true);
                const openCell = rates.tracked ? figure(percent(rates.opens, rates.sent), plural(rates.opens, 'åpning', 'åpninger'), 'Åpnet') : figure('Ikke målt', null, 'Åpnet', true);
                if (!rates.tracked) { clickCell.title = notTracked; openCell.title = notTracked; }
                const more = el('td', ''); more.className = 'analytics-more';
                more.innerHTML = '<span aria-hidden="true">›</span>';
                row.setAttribute('aria-label', `${campaign.subject || 'Uten emne'}, ${state}. Åpne rapport.`);
                row.append(subject, statusCell, dateCell, sentCell, clickCell, openCell, more);
                row.addEventListener('click', () => openReport(campaign));
                row.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openReport(campaign); } });
                details.append(row);
            });
        if (!details.children.length) { const row = el('tr', ''); const cell = el('td', 'Ingen kampanjer i perioden.'); cell.colSpan = 7; row.append(cell); details.append(row); }
    };
    root.querySelectorAll('.analytics-table [data-sort]').forEach(button => button.addEventListener('click', () => {
        const key = button.dataset.sort;
        analyticsSort = analyticsSort.key === key ? { key, dir: -analyticsSort.dir } : { key, dir: -1 };
        renderAnalytics();
        root.querySelector(`.analytics-table [data-sort="${key}"]`)?.focus();
    }));
    root.querySelector('[data-analytics-clear]').addEventListener('click', () => { analyticsIssuesOnly = false; renderAnalytics(); });
    root.querySelector('[data-analytics-period]').addEventListener('change', renderAnalytics);
    const render = () => {
        renderAnalytics();
        table.replaceChildren();
        const term = search.value.trim().toLocaleLowerCase('nb');
        const rows = campaigns.filter(c => (!term || String(c.subject || '').toLocaleLowerCase('nb').includes(term)) && (!filter.value || campaignState(c) === filter.value));
        for (const campaign of rows) {
            const row = document.createElement('tr');
            const state = campaignState(campaign);
            const cells = [campaign.subject || 'Uten emne', state, Number(campaign.recipientCount || 0), campaign.sentCount ?? '–', time(date(campaign)) ? new Date(time(date(campaign))).toLocaleDateString('nb-NO') : '–'];
            cells.forEach((value, index) => { const cell = el('td', value); if (index === 1) { cell.className = 'workspace-status'; if (state === 'Uavklart') cell.title = 'Uavsluttet forsøk eldre enn 24 timer, eller manglende tidspunkt. Faktisk utsending er ikke bekreftet.'; } row.append(cell); });
            const logCell = document.createElement('td'); const logButton = el('button', 'Se logg'); logButton.type = 'button'; logButton.addEventListener('click', () => showLogs(campaign)); logCell.append(logButton);
            const emailButton = el('button', 'Se e-post'); emailButton.type = 'button'; emailButton.addEventListener('click', () => showCampaignEmail(campaign)); logCell.append(emailButton); row.append(logCell);
            table.append(row);
        }
        if (!rows.length) { const row = document.createElement('tr'); const cell = el('td', 'Ingen kampanjer passer søket.'); cell.colSpan = 6; row.append(cell); table.append(row); }
        for (const [kind, values] of [['drafts', drafts], ['templates', templates]]) {
            const box = root.querySelector(`[data-${kind}]`); box.replaceChildren();
            values.forEach(item => {
                const row = el('div', ''); row.className = 'workspace-saved-row';
                const name = item.name || item.subject || 'Uten navn';
                const details = el('div', ''); details.className = 'workspace-saved-details';
                const title = el('strong', name);
                const modified = time(item.updatedAt || item.createdAt);
                const meta = el('span', modified ? 'Sist endret ' + new Date(modified).toLocaleDateString('nb-NO') : (kind === 'drafts' ? 'Utkast' : 'Lagret mal'));
                details.append(title, meta);
                const actions = el('div', ''); actions.className = 'workspace-saved-actions';
                const link = el('a', 'Åpne'); link.setAttribute('aria-label', 'Åpne ' + name); link.href = '/admin/admin-nyhetsbrev.html?draftId=' + encodeURIComponent(item.id);
                const remove = el('button', 'Slett'); remove.type = 'button'; remove.className = 'workspace-delete';
                remove.setAttribute('aria-label', 'Slett ' + name);
                remove.addEventListener('click', async () => {
                    const builder = window.builder;
                    const confirmed = builder?.showConfirm
                        ? await builder.showConfirm('Slett ' + (kind === 'drafts' ? 'kladd' : 'mal'), `Vil du slette «${name}»? Dette kan ikke angres.`, 'Slett')
                        : window.confirm(`Vil du slette «${name}»? Dette kan ikke angres.`);
                    if (!confirmed) return;
                    // Do not let an open editor's autosave recreate a deleted document.
                    if (builder?.currentDraftId === item.id) {
                        status.textContent = 'Dette dokumentet er åpent i editoren. Lukk eller åpne et annet dokument før du sletter det.';
                        return;
                    }
                    remove.disabled = true;
                    try {
                        await window.firebaseService.db.collection('newsletter_templates').doc(item.id).delete();
                        if (kind === 'drafts') drafts = drafts.filter(saved => saved.id !== item.id);
                        else templates = templates.filter(saved => saved.id !== item.id);
                        try { if (sessionStorage.getItem('hkm_active_draft_id') === item.id) sessionStorage.removeItem('hkm_active_draft_id'); } catch (_) {}
                        root.querySelector('[data-count-drafts]').textContent = drafts.length;
                        status.textContent = (kind === 'drafts' ? 'Kladden' : 'Malen') + ' er slettet.';
                        render();
                    } catch { status.textContent = 'Kunne ikke slette. Kontroller tilgangen og prøv igjen.'; remove.disabled = false; }
                });
                actions.append(link, remove); row.append(details, actions); box.append(row);
            });
            if (!values.length) box.append(el('p', kind === 'drafts' ? 'Ingen lagrede kladder i dette utvalget.' : 'Ingen lagrede maler i dette utvalget.'));
        }
    };
    document.querySelector('[data-workspace-refresh]').addEventListener('click', async event => {
        const db = window.firebaseService?.db;
        if (!db || !window.firebase?.auth().currentUser) { status.textContent = 'Logg inn og vent til admin er klar.'; return; }
        event.currentTarget.disabled = true;
        status.textContent = 'Henter kampanjer og lagret innhold …';
        try {
            const snapshots = await Promise.all([
                db.collection('newsletter_campaigns').orderBy('queuedAt', 'desc').limit(25).get(),
                db.collection('newsletter_campaigns').orderBy('sentAt', 'desc').limit(25).get(),
                db.collection('newsletter_templates').get()
            ]);
            const map = new Map(); snapshots.slice(0,2).forEach(snapshot => snapshot.forEach(doc => map.set(doc.id, { ...doc.data(), id: doc.id })));
            campaigns = [...map.values()].sort((a,b)=>time(date(b))-time(date(a)));
            const saved=[];snapshots[2].forEach(doc=>saved.push({...doc.data(),id:doc.id}));
            drafts=saved.filter(item=>item.isDraft);templates=[HKD_PRODUCT_TEMPLATE, ...saved.filter(item=>!item.isDraft)];
            root.querySelector('[data-count-campaigns]').textContent=campaigns.length;
            root.querySelector('[data-count-drafts]').textContent=drafts.length;
            root.querySelector('[data-count-sent]').textContent=campaigns.reduce((sum,c)=>sum+Number(c.sentCount||0),0);
            status.textContent='Oversikten er oppdatert.';
            render();
        } catch { status.textContent='Kunne ikke hente oversikten. Kontroller tilgangen og prøv igjen.'; }
        finally { document.querySelector('[data-workspace-refresh]').disabled=false; }
    });
    search.addEventListener('input',render); filter.addEventListener('change',render);
    if (isNewsletterArea) {
        let attempts = 0;
        const readyTimer = setInterval(() => {
            if (window.firebaseService?.db && window.firebase?.auth().currentUser) {
                clearInterval(readyTimer);
                workspaceLoaded = true;
                document.querySelector('[data-workspace-refresh]').click();
            } else if (++attempts >= 100) {
                clearInterval(readyTimer);
                status.textContent = 'Trykk Oppdater når innloggingen er klar.';
            }
        }, 100);
        window.addEventListener('pagehide', () => clearInterval(readyTimer), { once: true });
    }
    render();
    root.querySelectorAll('[data-workspace-view]').forEach(button=>button.addEventListener('click',()=>{
        try { sessionStorage.setItem('hkm_newsletter_overview_tab', button.dataset.workspaceView); } catch (_) {}
        root.querySelectorAll('[data-workspace-view]').forEach(tab=>tab.setAttribute('aria-pressed',String(tab===button)));
        root.querySelectorAll('[data-workspace-panel]').forEach(panel=>panel.hidden=panel.dataset.workspacePanel!==button.dataset.workspaceView);
        root.querySelector('[data-campaign-note]').hidden = button.dataset.workspaceView !== 'campaigns';
        // The totals cover everything fetched; the analysis has its own period, so hide them there.
        root.querySelector('[data-workspace-totals]').hidden = button.dataset.workspaceView === 'analytics';
    }));
}
const check = document.getElementById('newsletter-content-check');
if (check) check.addEventListener('click', () => {
    const builder = window.builder;
    if (!builder?.compileEmailHtml) return;
    const subject = document.getElementById('newsletter-subject')?.value || '';
    const findings = inspectNewsletter(subject, builder.blocks || [], builder.compileEmailHtml('no'));
    const output = document.getElementById('newsletter-content-check-result');
    output.textContent = findings.length ? findings.join(' ') : 'Emne, innhold og lenker er kontrollert. Send en test-e-post og se over mobilvisningen før utsending.';
    output.hidden = false;
});

if (root) { try { const tab = sessionStorage.getItem('hkm_newsletter_overview_tab'); root.querySelector(`[data-workspace-view="${['campaigns','drafts','templates','analytics'].includes(tab) ? tab : 'campaigns'}"]`)?.click(); } catch (_) {} }
