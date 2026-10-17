// Load public configuration before requesting the campaign collection.
import './firebase-config.js';
import firebaseService from './firebase-service.js';
const language = document.documentElement.lang?.slice(0,2) || 'no';
const copy = {
 en: {activity:'Activity',donors:'identified donors',more:'Read more',collected:'raised',goal:'Goal',campaign:'Fundraiser',support:'Support this fundraiser',fallback:'Help support this fundraiser.',choose:'Choose an amount and payment method to support this fundraiser.',unavailable:'This fundraiser is unavailable. Please choose another purpose below.',heading:'Current fundraisers',intro:'Choose a cause to support.',view:'View fundraiser',error:'Unable to load this fundraiser. Reload the page before donating.'},
 es: {activity:'Actividad',donors:'donantes identificados',more:'Más información',collected:'recaudados',goal:'Meta',campaign:'Recaudación',support:'Apoya esta recaudación',fallback:'Ayuda a apoyar esta recaudación.',choose:'Elige el importe y el método de pago para apoyar esta recaudación.',unavailable:'Esta recaudación no está disponible. Elige otro destino abajo.',heading:'Recaudaciones actuales',intro:'Elige la causa que deseas apoyar.',view:'Ver recaudación',error:'No se pudo cargar esta recaudación. Recarga la página antes de donar.'},
 no: {activity:'Aktivitet',donors:'registrerte givere',more:'Les mer',collected:'samlet inn',goal:'Mål',campaign:'Innsamling',support:'Støtt innsamlingen',fallback:'Vær med og støtt denne innsamlingen.',choose:'Velg beløp og betalingsmåte for å støtte innsamlingen.',unavailable:'Denne innsamlingen er ikke tilgjengelig. Du kan velge et annet formål nedenfor.',heading:'Aktuelle innsamlinger',intro:'Velg hjertesaken du vil støtte.',view:'Se innsamlingen',error:'Kunne ikke hente innsamlingen. Last siden på nytt før du gir til aksjonen.'}
};
const text = copy[language] || copy.no;
const campaignPath = language === 'en' ? '/en/donations' : language === 'es' ? '/es/donaciones' : '/donasjoner';
export function localizeCause(cause, lang = language) {
    const translated = cause.translations?.[lang];
    return {...cause, title: translated?.title || cause.title, description: translated?.description || cause.description, heroIntro: translated?.heroIntro ?? cause.heroIntro};
}
export function activeDonationCauses(data) {
    const items = Array.isArray(data?.items) ? data.items : Object.values(data?.items || {});
    return items.filter(item => item && /^[a-z0-9][a-z0-9_-]{0,119}$/i.test(item.id || '') && item.active !== false && !['draft','archived','completed','cancelled'].includes(item.status));
}
export function applyCauseGiving(form, cause) {
    const document = form.ownerDocument;
    const giving = cause?.giving || {};
    const mode = ['fixed','presets'].includes(giving.amountMode) ? giving.amountMode : 'open';
    const amounts = (giving.amounts || []).filter(amount => Number.isSafeInteger(amount) && amount > 0 && amount <= 100000);
    const choices = mode === 'fixed' ? amounts.slice(0,1) : mode === 'presets' ? amounts.slice(0,8) : [100,250,500];
    const grid = form.querySelector('.donor-amount-presets'); grid.replaceChildren();
    choices.forEach(amount => { const button = document.createElement('button'); button.type = 'button'; button.dataset.donorAmount = amount; button.textContent = amount.toLocaleString('nb-NO') + ' kr'; button.setAttribute('aria-pressed','false'); grid.append(button); });
    grid.hidden = mode === 'fixed';
    const amount = form.elements.amount;
    amount.readOnly = mode === 'fixed' || (mode === 'presets' && giving.allowCustom === false);
    if (choices.length && mode !== 'open') amount.value = choices[0];
    if (mode === 'open' && !amount.value) amount.value = 250;
    form.querySelectorAll('[name="frequency"]').forEach(input => {
        const allowed = !['once','monthly'].includes(giving.frequency) || input.value === giving.frequency;
        input.disabled = !allowed; input.closest('label').hidden = !allowed;
        if (allowed && ['once','monthly'].includes(giving.frequency)) input.checked = true;
    });
    amount.dispatchEvent(new Event('input', {bubbles:true}));
    form.querySelector('[name="frequency"]:checked')?.dispatchEvent(new Event('change', {bubbles:true}));
    grid.querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed',String(button.dataset.donorAmount === amount.value)));
}
const form = document.getElementById('donor-gift-form');
if (form) {
    const requested = new URLSearchParams(location.search).get('aksjon') || new URLSearchParams(location.search).get('fund');
    const element = (tag, text, className) => { const node = document.createElement(tag); if (text) node.textContent = text; if (className) node.className = className; return node; };
    const money = value => Math.max(0, Number(value) || 0).toLocaleString('nb-NO') + ' kr';
    const details = cause => {
        const group = element('div', '', 'donor-cause-progress');
        const amount = Math.max(0, Number(cause.collected ?? cause.raised) || 0), goal = Math.max(0, Number(cause.goal) || 0);
        if (cause.activity) {
            group.classList.add('donor-activity');
            group.append(element('h3', text.activity, 'donor-activity-heading'));
            const metrics = element('div', '', 'donor-activity-metrics');
            const raised = element('div'); raised.append(element('strong', money(amount)), element('span', text.collected));
            const donors = element('div'); donors.append(element('strong', String(cause.activity.donorCount)), element('span', text.donors));
            metrics.append(raised, donors); group.append(metrics);
        } else group.append(element('strong', `${money(amount)} ${text.collected}`));
        if (goal) { const meter = element('progress'); meter.max = goal; meter.value = Math.min(amount, goal); meter.setAttribute('aria-label', `${money(amount)} / ${money(goal)}`); group.append(meter, element('span', `${text.goal}: ${money(goal)}`)); }
        return group;
    };
    const moreInfo = cause => {
        try {
            const url = new URL(cause.infoUrl);
            if (!['https:', 'http:'].includes(url.protocol)) return null;
            const link = element('a', text.more, 'btn btn-outline donor-cause-more');
            link.href = url.href; link.target = '_blank'; link.rel = 'noopener noreferrer';
            const icon = element('i', '', 'fas fa-arrow-right');
            icon.setAttribute('aria-hidden', 'true');
            link.append(icon);
            return link;
        } catch { return null; }
    };
    const load = async () => {
        // Other page modules may have requested this collection before configuration was ready.
        firebaseService.invalidatePageContentCache('collection_causes');
        const [data, activity] = await Promise.all([
            firebaseService.getPageContent('collection_causes'),
            firebaseService.getPageContent('cause_activity', {silent:true}).catch(() => null)
        ]);
        const causes = activeDonationCauses(data).map(cause => {
            const stats = activity?.campaigns?.[cause.id];
            return localizeCause(stats && Number.isFinite(stats.collected) && Number.isSafeInteger(stats.donorCount)
                ? {...cause, collected:stats.collected, activity:stats} : cause);
        });
        const selects = [form.elements.fund, document.getElementById('donation-purpose')].filter(select => select?.options);
        causes.forEach(cause => selects.forEach(select => { if (![...select.options].some(option => option.value === cause.id)) { const option = element('option', cause.title || text.campaign); option.value = cause.id; select.append(option); } }));
        form.elements.fund.addEventListener('change', () => applyCauseGiving(form, causes.find(cause => cause.id === form.elements.fund.value)));
        const selected = causes.find(cause => cause.id === requested);
        if (selected) {
            form.elements.fund.value = selected.id; form.elements.fund.dispatchEvent(new Event('change'));
            document.title = `${selected.title} | His Kingdom Ministry`;
            document.getElementById('donor-welcome-title').textContent = selected.title;
            const heroIntro = document.querySelector('.donor-photo-hero-copy > p');
            heroIntro.textContent = selected.heroIntro || '';
            heroIntro.hidden = !selected.heroIntro;
            document.getElementById('donor-intro-title').textContent = selected.title;
            document.getElementById('donor-intro-title').hidden = true;
            document.querySelector('.donor-welcome-lead').textContent = selected.description || text.choose;
            const copy = document.querySelector('.donor-welcome-copy');
            copy.classList.add('donor-cause-detail');
            const progress = details(selected);
            document.querySelector('.donor-welcome-lead').before(progress);
            const info = moreInfo(selected); if (info) document.querySelector('.donor-welcome-copy').append(info);
            if (/^https?:\/\//i.test(selected.image || selected.imageUrl || '')) {
                const image = element('img'); image.src = selected.image || selected.imageUrl; image.alt = selected.title; image.className = 'donor-cause-image'; copy.prepend(image); image.before(progress);
            }
            form.querySelector('h2').textContent = text.support;
        } else if (requested && !['general','misjon','basar'].includes(requested)) {
            const notice = element('p', text.unavailable, 'donor-cause-notice');
            notice.setAttribute('role','status'); form.prepend(notice);
        }
        if (!selected) applyCauseGiving(form, null);
        if (!causes.length || selected) return;
        const section = element('section', '', 'donor-campaigns section');
        const container = element('div', '', 'container'); container.append(element('h2', text.heading), element('p', text.intro));
        const grid = element('div', '', 'donor-campaign-grid');
        causes.forEach(cause => {
            const card = element('article', '', 'donor-campaign-card');
            if (/^https?:\/\//i.test(cause.image || cause.imageUrl || '')) { const image = element('img'); image.src = cause.image || cause.imageUrl; image.alt = ''; image.loading = 'lazy'; card.append(image); }
            const content = element('div'); content.append(element('h3', cause.title || text.campaign), element('p', cause.description || ''), details(cause));
            const actions = element('div', '', 'donor-campaign-actions');
            const info = moreInfo(cause); if (info) actions.append(info);
            const link = element('a', text.view, 'btn btn-primary'); link.href = campaignPath + '?aksjon=' + encodeURIComponent(cause.id); actions.append(link); content.append(actions); card.append(content); grid.append(card);
        });
        container.append(grid); section.append(container); document.querySelector('.donor-welcome').after(section);
    };
    load().catch(error => { console.warn('Kunne ikke hente innsamlinger:', error); if (requested) { const notice = element('p', text.error, 'donor-cause-notice'); notice.setAttribute('role','status'); form.prepend(notice); } });
}
