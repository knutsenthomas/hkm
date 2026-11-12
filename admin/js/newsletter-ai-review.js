import { newsletterHtmlRequest, setupHtmlFrameWidths, showHtmlFrame, warningMessages } from './newsletter-html-import.js';

export function setupNewsletterAiReview() {
    const dialog = document.getElementById('newsletter-ai-dialog');
    if (!dialog) return null;
    const title = document.getElementById('newsletter-ai-title');
    const url = document.getElementById('newsletter-ai-url');
    const token = document.getElementById('newsletter-ai-token');
    const accessPanel = dialog.querySelector('[data-ai-access]');
    const reviewPanel = dialog.querySelector('[data-ai-review]');
    const frame = dialog.querySelector('iframe');
    const status = dialog.querySelector('[role=status]');
    const key = dialog.querySelector('[data-ai-key]');
    const copy = dialog.querySelector('[data-ai-copy]');
    const schema = dialog.querySelector('[data-ai-schema]');
    const approve = dialog.querySelector('[data-ai-approve]');
    const summary = dialog.querySelector('[data-ai-summary]');
    const warnings = dialog.querySelector('[data-ai-warnings]');
    let generation = 0;

    function open(access) {
        generation++;
        accessPanel.hidden = !access;
        reviewPanel.hidden = access;
        status.textContent = '';
        if (!dialog.open) dialog.showModal();
        return generation;
    }

    document.getElementById('newsletter-ai-connect').onclick = () => {
        title.textContent = 'Koble AI til nyhetsbrev';
        key.disabled = false;
        open(true);
    };
    dialog.querySelector('[data-ai-close]').onclick = () => dialog.close();
    dialog.addEventListener('close', () => {
        generation++;
        token.value = '';
        token.type = 'password';
        copy.disabled = true;
        frame.removeAttribute('srcdoc');
        frame.hidden = true;
    });

    key.onclick = async () => {
        const request = generation;
        key.disabled = true;
        try {
            const result = await newsletterHtmlRequest({ action: 'aiAccess' });
            if (request !== generation) return;
            token.value = result.token;
            url.value = result.url;
            schema.href = result.url + '/openapi.json';
            schema.hidden = false;
            copy.disabled = false;
            status.textContent = 'Tilgangsnøkkelen er klar. Kopier den til tilkoblingsinnstillingene.';
        } catch (error) {
            if (request === generation) status.textContent = error.message;
        } finally {
            if (request === generation) key.disabled = false;
        }
    };
    copy.onclick = async () => {
        try {
            await navigator.clipboard.writeText(token.value);
            status.textContent = 'Tilgangsnøkkelen er kopiert.';
        } catch {
            token.type = 'text';
            token.select();
            status.textContent = 'Kopier den markerte nøkkelen til tilkoblingsinnstillingene.';
        }
    };

    setupHtmlFrameWidths(dialog, frame);
    return async reviewId => {
        const request = open(false);
        title.textContent = 'Kontroller nyhetsbrev fra AI';
        approve.disabled = true;
        summary.textContent = '';
        warnings.replaceChildren();
        status.textContent = 'Henter forhåndsvisning og mottakerantall …';
        try {
            const result = await newsletterHtmlRequest({ action: 'aiReview', reviewId });
            if (request !== generation) return;
            title.textContent = result.subject;
            summary.textContent = `${result.group} · ${result.count} mottakere · Norsk: ${result.norwegianCount} · Engelsk: ${result.englishCount}`;
            for (const warning of result.warnings) {
                const item = document.createElement('li');
                item.textContent = warningMessages[warning];
                warnings.append(item);
            }
            showHtmlFrame(frame, result);
            status.textContent = result.queued ? 'Utsendingen er lagt i kø.' : result.approved
                ? 'Godkjent. Gå tilbake til AI-klienten for å starte utsendingen.'
                : 'Sjekk innholdet og målgruppen før du godkjenner.';
            approve.disabled = result.approved || result.queued;
            approve.onclick = async () => {
                approve.disabled = true;
                try {
                    await newsletterHtmlRequest({ action: 'aiApprove', reviewId });
                    if (request === generation) status.textContent = 'Godkjent. Gå tilbake til AI-klienten for å starte utsendingen.';
                } catch (error) {
                    if (request === generation) {
                        status.textContent = error.message;
                        approve.disabled = false;
                    }
                }
            };
        } catch (error) {
            if (request === generation) status.textContent = error.message;
        }
    };
}
