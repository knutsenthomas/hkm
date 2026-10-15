import { HKD_PRODUCT_TEMPLATE } from './newsletter-product-template.js';

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
    let sent = 0, unknown = 0, issues = 0, completed = 0, opens = 0, clicks = 0, trackedSent = 0;
    rows.forEach(c => {
        const amount = count(c.sentCount); sent += amount || 0; unknown += amount === null ? 1 : 0;
        if (c.trackingEnabled === true) { trackedSent += amount || 0; opens += count(c.engagement?.uniqueOpens) || 0; clicks += count(c.engagement?.uniqueClicks) || 0; }
        const state = campaignState(c, now);
        if (['Avvik', 'Feil', 'Uavklart'].includes(state)) issues++;
        if (state === 'Fullført') completed++;
        const timestamp = campaignTime(c.queuedAt || c.sentAt || c.createdAt);
        const key = timestamp ? new Date(timestamp).toLocaleDateString('sv-SE', { year:'numeric', month:'2-digit' }) : 'Ukjent dato';
        const month = months.get(key) || { campaigns:0, sent:0, unknown:0 };
        month.campaigns++; month.sent += amount || 0; month.unknown += amount === null ? 1 : 0; months.set(key, month);
    });
    return { rows, sent, unknown, issues, completed, opens, clicks, trackedSent, months: [...months].sort((a,b) => a[0].localeCompare(b[0])) };
}
const root = document.getElementById('newsletter-workspace');
if (root) {
    const isNewsletterArea = new URLSearchParams(location.search).get('section') === 'newsletter';
    const syncArea = () => {
        const active = new URLSearchParams(location.search).get('section') === 'newsletter';
        root.hidden = !active;
        document.body.classList.toggle('newsletter-area-active', active);
    };
    syncArea();
    window.addEventListener('hkm:newsletter-modechange', syncArea);
    window.addEventListener('hkm:newsletter-overview', event => {
        syncArea();
        root.querySelector('[data-resume-editor]').hidden = !event.detail?.resumeEditor;
        root.querySelector('[data-workspace-refresh]').click();
    });
    root.querySelector('[data-resume-editor]')?.addEventListener('click', () => {
        window.builder?.toggleMode('builder');
        window.builder?.switchSidebarView('builder');
    });
    root.querySelector('[data-open-subscribers]')?.addEventListener('click', () => {
        if (!window.builder) return;
        window.builder.toggleMode('builder');
        window.builder.switchSidebarView('subscribers');
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
    const renderAnalytics = () => {
        const summary = summarizeCampaigns(campaigns, root.querySelector('[data-analytics-period]').value);
        const metrics = root.querySelector('[data-analytics-metrics]'); metrics.replaceChildren();
        for (const [label, value] of [['Utsendelser', summary.rows.length], ['Registrert sendt', summary.sent], ['Fullført uten avvik', summary.completed], ['Avvik, feil eller uavklart', summary.issues], ['Mangler sendetall', summary.unknown], ['Antatte unike åpninger', summary.opens], ['Unike mottakereksemplar med klikk', summary.clicks], ['Antatt åpningsrate', summary.trackedSent ? (100 * summary.opens / summary.trackedSent).toFixed(1) + ' %' : '–'], ['Klikkrate', summary.trackedSent ? (100 * summary.clicks / summary.trackedSent).toFixed(1) + ' %' : '–']]) {
            const card = el('div', ''); card.append(el('span', label), el('strong', value)); metrics.append(card);
        }
        const months = root.querySelector('[data-analytics-months]'); months.replaceChildren();
        summary.months.forEach(([month, data]) => {
            const row = el('tr', ''); [month, data.campaigns, data.sent + (data.unknown ? ` (${data.unknown} ukjent)` : '')].forEach(value => row.append(el('td', value))); months.append(row);
        });
        const details = root.querySelector('[data-analytics-campaigns]'); details.replaceChildren();
        summary.rows.forEach(campaign => {
            const row = el('tr', ''); [campaign.subject || 'Uten emne', campaignState(campaign), `${campaign.sentCount ?? 'Ukjent'} / ${campaign.recipientCount ?? 'Ukjent'}`, campaign.trackingEnabled ? campaign.engagement?.uniqueOpens || 0 : 'Ikke målt', campaign.trackingEnabled ? campaign.engagement?.uniqueClicks || 0 : 'Ikke målt'].forEach(value => row.append(el('td', value)));
            const cell = el('td', ''); const button = el('button', 'Se logg'); button.type = 'button'; button.onclick = () => showLogs(campaign); cell.append(button); if (campaign.trackingEnabled) { const activity = el('button', 'Se klikk'); activity.type = 'button'; activity.onclick = () => showEngagement(campaign); cell.append(activity); } row.append(cell); details.append(row);
        });
        for (const [body, columns] of [[months, 3], [details, 6]]) if (!body.children.length) { const row = el('tr', ''); const cell = el('td', 'Ingen kampanjer i perioden.'); cell.colSpan = columns; row.append(cell); body.append(row); }
    };
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
            const logCell = document.createElement('td'); const logButton = el('button', 'Se logg'); logButton.type = 'button'; logButton.addEventListener('click', () => showLogs(campaign)); logCell.append(logButton); row.append(logCell);
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
    root.querySelector('[data-workspace-refresh]').addEventListener('click', async event => {
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
        finally { root.querySelector('[data-workspace-refresh]').disabled=false; }
    });
    search.addEventListener('input',render); filter.addEventListener('change',render);
    if (isNewsletterArea) {
        let attempts = 0;
        const readyTimer = setInterval(() => {
            if (window.firebaseService?.db && window.firebase?.auth().currentUser) {
                clearInterval(readyTimer);
                root.querySelector('[data-workspace-refresh]').click();
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
