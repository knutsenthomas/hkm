import { newsletterHtmlRequest, setupHtmlFrameWidths, showHtmlFrame } from './newsletter-html-import.js';

const escapeHtml = value => String(value).replace(/[&<>"']/g, char =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

// A standalone page that shows the e-mail in the same sandboxed iframe as the modal.
// It is opened as a blob URL, so the HTML never ends up in an address.
function previewPage(result) {
    const csp = escapeHtml(result.csp);
    const subject = escapeHtml(result.subject || 'Uten emne');
    const frame = escapeHtml(result.previewHtml.replace('<!doctype html>', () =>
        `<!doctype html><meta http-equiv="Content-Security-Policy" content="${result.csp}"><meta name="referrer" content="no-referrer">`));
    return `<!doctype html><html lang="no"><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${csp}">
<meta name="referrer" content="no-referrer">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>E-post: ${subject}</title>
<style>
body{margin:0;background:#f1f5f9;font:14px/1.4 Arial,sans-serif;color:#0f172a}
header{padding:12px 16px;background:#fff;border-bottom:1px solid #e2e8f0}
header span{display:block;color:#64748b;font-size:12px}
iframe{display:block;width:100%;max-width:600px;height:calc(100vh - 90px);margin:16px auto;border:0;background:#fff}
</style></head><body>
<header><strong>${subject}</strong><span>Forhåndsvisning med eksempelverdier i flettefeltene</span></header>
<iframe title="E-post slik mottakerne fikk den" sandbox="" referrerpolicy="no-referrer" srcdoc="${frame}"></iframe>
</body></html>`;
}

// Builds the e-mail view (language, width, sandboxed frame, open in new tab) inside `host`.
// Returns { destroy } so a surrounding dialog can stop pending requests when it closes.
export function mountCampaignEmail(host, campaign, { onSubject } = {}) {
    host.innerHTML = `
        <p role="status" aria-live="polite">Henter e-posten …</p>
        <div class="newsletter-html-actions" data-languages role="group" aria-label="Språk i visningen" hidden>
            <button type="button" class="btn-secondary-outline" data-language="no" aria-pressed="true">Norsk</button>
            <button type="button" class="btn-secondary-outline" data-language="en" aria-pressed="false">Engelsk</button>
        </div>
        <div class="newsletter-html-actions" role="group" aria-label="Bredde på visningen">
            <button type="button" class="btn-secondary-outline" data-html-width="600" aria-pressed="true">Skrivebord · 600 px</button>
            <button type="button" class="btn-secondary-outline" data-html-width="375" aria-pressed="false">Mobil · 375 px</button>
        </div>
        <div class="newsletter-html-frame-scroll">
            <iframe title="E-post slik mottakerne fikk den" sandbox="" referrerpolicy="no-referrer" width="600" height="500" hidden></iframe>
        </div>
        <div class="newsletter-html-actions">
            <button type="button" class="btn-secondary-outline" data-open-tab disabled>Åpne i ny fane</button>
        </div>`;
    const status = host.querySelector('[role=status]');
    const languages = host.querySelector('[data-languages]');
    const languageButtons = [...languages.querySelectorAll('[data-language]')];
    const frame = host.querySelector('iframe');
    const openTab = host.querySelector('[data-open-tab]');
    let generation = 0;
    let current = null;
    let active = true;
    setupHtmlFrameWidths(host, frame);

    const load = async language => {
        const request = ++generation;
        current = null;
        openTab.disabled = true;
        status.textContent = 'Henter e-posten …';
        try {
            const result = await newsletterHtmlRequest({ action: 'campaignPreview', campaignId: campaign.id, language });
            if (request !== generation || !active) return;
            current = result;
            onSubject?.(result.subject || 'Uten emne');
            languages.hidden = !result.hasEnglish;
            languageButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.language === result.language)));
            showHtmlFrame(frame, result);
            status.textContent = 'Flettefeltene vises med eksempelverdier. Lenker til avmelding og nettleserversjon er byttet ut med #.';
            openTab.disabled = false;
        } catch (error) {
            if (request !== generation || !active) return;
            frame.hidden = true;
            status.textContent = error?.message || 'Kunne ikke hente e-posten. Kontroller administratortilgangen og prøv igjen.';
        }
    };
    languageButtons.forEach(button => { button.onclick = () => load(button.dataset.language); });
    openTab.onclick = () => {
        if (!current) return;
        const url = URL.createObjectURL(new Blob([previewPage(current)], { type: 'text/html' }));
        window.open(url, '_blank', 'noopener');
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
    };
    load('no');
    return { destroy() { active = false; generation++; } };
}

export function showCampaignEmail(campaign) {
    const dialog = document.createElement('dialog');
    dialog.className = 'newsletter-html-dialog';
    dialog.setAttribute('aria-labelledby', 'newsletter-campaign-email-title');
    dialog.innerHTML = `
        <header class="newsletter-ai-header">
            <h2 id="newsletter-campaign-email-title"></h2>
            <button type="button" class="newsletter-ai-close" data-close aria-label="Lukk">
                <span class="material-symbols-outlined" aria-hidden="true">close</span>
            </button>
        </header>
        <div data-email></div>`;
    const title = dialog.querySelector('h2');
    title.textContent = campaign.subject || 'Uten emne';
    dialog.querySelector('[data-close]').onclick = () => dialog.close();
    document.body.append(dialog);
    dialog.showModal();
    const view = mountCampaignEmail(dialog.querySelector('[data-email]'), campaign, { onSubject: subject => { title.textContent = subject; } });
    dialog.addEventListener('close', () => { view.destroy(); dialog.remove(); }, { once: true });
}
