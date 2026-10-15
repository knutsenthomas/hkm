import firebaseService from './firebase-service.js';
export function activeDonationCauses(data) {
    const items = Array.isArray(data?.items) ? data.items : Object.values(data?.items || {});
    return items.filter(item => item && /^[a-z0-9][a-z0-9_-]{0,119}$/i.test(item.id || '') && item.active !== false && !['draft','archived','completed','cancelled'].includes(item.status));
}
const form = document.getElementById('donor-gift-form');
if (form) {
    const requested = new URLSearchParams(location.search).get('aksjon') || new URLSearchParams(location.search).get('fund');
    const element = (tag, text, className) => { const node = document.createElement(tag); if (text) node.textContent = text; if (className) node.className = className; return node; };
    const money = value => Math.max(0, Number(value) || 0).toLocaleString('nb-NO') + ' kr';
    const details = cause => {
        const group = element('div', '', 'donor-cause-progress');
        const amount = Math.max(0, Number(cause.collected ?? cause.raised) || 0), goal = Math.max(0, Number(cause.goal) || 0);
        group.append(element('strong', `${money(amount)} samlet inn`));
        if (goal) { const meter = element('progress'); meter.max = goal; meter.value = Math.min(amount, goal); meter.setAttribute('aria-label', `Innsamlet ${money(amount)} av ${money(goal)}`); group.append(meter, element('span', `Mål: ${money(goal)}`)); }
        return group;
    };
    const load = async () => {
        const causes = activeDonationCauses(await firebaseService.getPageContent('collection_causes'));
        const selects = [form.elements.fund, document.getElementById('donation-purpose')].filter(select => select?.options);
        causes.forEach(cause => selects.forEach(select => { if (![...select.options].some(option => option.value === cause.id)) { const option = element('option', cause.title || 'Innsamling'); option.value = cause.id; select.append(option); } }));
        const selected = causes.find(cause => cause.id === requested);
        if (selected) {
            form.elements.fund.value = selected.id; form.elements.fund.dispatchEvent(new Event('change'));
            document.title = `${selected.title} | His Kingdom Ministry`;
            document.getElementById('donor-welcome-title').textContent = selected.title;
            document.querySelector('.donor-photo-hero-copy > p').textContent = selected.description || 'Vær med og støtt denne innsamlingen.';
            document.getElementById('donor-intro-title').textContent = selected.title;
            document.querySelector('.donor-welcome-lead').textContent = selected.description || 'Velg beløp og betalingsmåte for å støtte innsamlingen.';
            document.querySelector('.donor-welcome-copy').append(details(selected));
            if (/^https?:\/\//i.test(selected.image || selected.imageUrl || '')) {
                const image = element('img'); image.src = selected.image || selected.imageUrl; image.alt = selected.title; image.className = 'donor-cause-image'; document.querySelector('.donor-welcome-copy').prepend(image);
            }
            form.querySelector('h2').textContent = 'Støtt innsamlingen';
        } else if (requested && !['general','misjon','basar'].includes(requested)) {
            const notice = element('p', 'Denne innsamlingen er ikke tilgjengelig. Du kan velge et annet formål nedenfor.', 'donor-cause-notice');
            notice.setAttribute('role','status'); form.prepend(notice);
        }
        if (!causes.length || selected) return;
        const section = element('section', '', 'donor-campaigns section');
        const container = element('div', '', 'container'); container.append(element('h2', 'Aktuelle innsamlinger'), element('p', 'Velg hjertesaken du vil støtte.'));
        const grid = element('div', '', 'donor-campaign-grid');
        causes.forEach(cause => {
            const card = element('article', '', 'donor-campaign-card');
            if (/^https?:\/\//i.test(cause.image || cause.imageUrl || '')) { const image = element('img'); image.src = cause.image || cause.imageUrl; image.alt = ''; image.loading = 'lazy'; card.append(image); }
            const content = element('div'); content.append(element('h3', cause.title || 'Innsamling'), element('p', cause.description || ''), details(cause));
            const link = element('a', 'Se innsamlingen', 'btn btn-primary'); link.href = '/donasjoner?aksjon=' + encodeURIComponent(cause.id); content.append(link); card.append(content); grid.append(card);
        });
        container.append(grid); section.append(container); document.querySelector('.donor-welcome').after(section);
    };
    load().catch(error => { console.warn('Kunne ikke hente innsamlinger:', error); if (requested) { const notice = element('p', 'Kunne ikke hente innsamlingen. Last siden på nytt før du gir til aksjonen.', 'donor-cause-notice'); notice.setAttribute('role','status'); form.prepend(notice); } });
}
