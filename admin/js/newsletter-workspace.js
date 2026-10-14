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
    const render = () => {
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
                const link = el('a', name); link.href = '/admin/admin-nyhetsbrev.html?draftId=' + encodeURIComponent(item.id);
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
                row.append(link, remove); box.append(row);
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
            status.textContent='Viser siste 25 kampanjer per datofelt og lagrede kladder/maler. «Sendt» betyr sendt fra serveren, ikke bekreftet levering. «Uavklart» betyr at forsøket mangler avslutning og er eldre enn 24 timer eller mangler tidspunkt. Ingen utsendinger startes på nytt.';
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
        root.querySelectorAll('[data-workspace-view]').forEach(tab=>tab.setAttribute('aria-pressed',String(tab===button)));
        root.querySelectorAll('[data-workspace-panel]').forEach(panel=>panel.hidden=panel.dataset.workspacePanel!==button.dataset.workspaceView);
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
