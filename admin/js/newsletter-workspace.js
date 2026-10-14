export function campaignState(campaign) {
    if (campaign.status === 'completed') return Number(campaign.sentCount || 0) < Number(campaign.recipientCount || 0) ? 'Avvik' : 'Fullført';
    if (['failed', 'error'].includes(campaign.status)) return 'Feil';
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
    let templates = [];
    const status = root.querySelector('[data-workspace-status]');
    const table = root.querySelector('tbody');
    const search = root.querySelector('[data-campaign-search]');
    const filter = root.querySelector('[data-campaign-filter]');
    const el = (tag, text) => { const element = document.createElement(tag); element.textContent = text; return element; };
    const date = data => data.queuedAt || data.sentAt || data.createdAt || '';
    const time = value => value?.toDate ? value.toDate().getTime() : new Date(value).getTime() || 0;
    const render = () => {
        table.replaceChildren();
        const term = search.value.trim().toLocaleLowerCase('nb');
        const rows = campaigns.filter(c => (!term || String(c.subject || '').toLocaleLowerCase('nb').includes(term)) && (!filter.value || campaignState(c) === filter.value));
        for (const campaign of rows) {
            const row = document.createElement('tr');
            const state = campaignState(campaign);
            const cells = [campaign.subject || 'Uten emne', state, Number(campaign.recipientCount || 0), campaign.sentCount ?? '–', time(date(campaign)) ? new Date(time(date(campaign))).toLocaleDateString('nb-NO') : '–'];
            cells.forEach((value, index) => { const cell = el('td', value); if (index === 1) cell.className = 'workspace-status'; row.append(cell); });
            table.append(row);
        }
        if (!rows.length) { const row = document.createElement('tr'); const cell = el('td', 'Ingen kampanjer passer søket.'); cell.colSpan = 5; row.append(cell); table.append(row); }
        for (const [kind, values] of [['drafts', drafts], ['templates', templates]]) {
            const box = root.querySelector(`[data-${kind}]`); box.replaceChildren();
            values.forEach(item => { const link = el('a', item.name || item.subject || 'Uten navn'); link.href = '/admin/admin-nyhetsbrev.html?draftId=' + encodeURIComponent(item.id); box.append(link); });
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
                db.collection('newsletter_templates').orderBy('createdAt', 'desc').limit(25).get()
            ]);
            const map = new Map(); snapshots.slice(0,2).forEach(snapshot => snapshot.forEach(doc => map.set(doc.id, { ...doc.data(), id: doc.id })));
            campaigns = [...map.values()].sort((a,b)=>time(date(b))-time(date(a)));
            const saved=[];snapshots[2].forEach(doc=>saved.push({...doc.data(),id:doc.id}));
            drafts=saved.filter(item=>item.isDraft);templates=saved.filter(item=>!item.isDraft);
            root.querySelector('[data-count-campaigns]').textContent=campaigns.length;
            root.querySelector('[data-count-drafts]').textContent=drafts.length;
            root.querySelector('[data-count-sent]').textContent=campaigns.reduce((sum,c)=>sum+Number(c.sentCount||0),0);
            status.textContent='Viser siste 25 kampanjer per datofelt og siste 25 kladder/maler. «Sendt» betyr sendt fra serveren, ikke bekreftet levering.';
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
