import { newsletterHtmlRequest, setupHtmlFrameWidths, showHtmlFrame, warningMessages } from './newsletter-html-import.js';

export function setupNewsletterAiReview() {
    const dialog = document.getElementById('newsletter-ai-dialog');
    if (!dialog) return null;
    const title = document.getElementById('newsletter-ai-title');
    const url = document.getElementById('newsletter-ai-url');
    const token = document.getElementById('newsletter-ai-token');
    const accessPanel = dialog.querySelector('[data-ai-access]');
    const reviewPanel = dialog.querySelector('[data-ai-review]');
    const consentPanel = dialog.querySelector('[data-ai-consent]');
    const connection = dialog.querySelector('[data-ai-connection]');
    const revoke = dialog.querySelector('[data-ai-revoke]');
    const allow = dialog.querySelector('[data-ai-allow]');
    const deny = dialog.querySelector('[data-ai-deny]');
    const frame = dialog.querySelector('iframe');
    const status = dialog.querySelector('[role=status]');
    const key = dialog.querySelector('[data-ai-key]');
    const copy = dialog.querySelector('[data-ai-copy]');
    const schema = dialog.querySelector('[data-ai-schema]');
    const approve = dialog.querySelector('[data-ai-approve]');
    const summary = dialog.querySelector('[data-ai-summary]');
    const warnings = dialog.querySelector('[data-ai-warnings]');
    const languages = dialog.querySelector('[data-ai-languages]');
    const languageButtons = [...languages.querySelectorAll('[data-ai-language]')];
    const testPanel = dialog.querySelector('[data-ai-test]');
    const testForm = dialog.querySelector('[data-ai-test-form]');
    const testEmail = document.getElementById('newsletter-ai-test-email');
    const testSend = dialog.querySelector('[data-ai-test-send]');
    const testStatus = dialog.querySelector('[data-ai-test-status]');
    let generation = 0;

    function open(panel) {
        generation++;
        accessPanel.hidden = panel !== 'access';
        reviewPanel.hidden = panel !== 'review';
        consentPanel.hidden = panel !== 'consent';
        status.textContent = '';
        if (!dialog.open) dialog.showModal();
        return generation;
    }

    async function loadConnection(request, action = 'aiOAuthConnection') {
        revoke.hidden = true;
        connection.textContent = 'Sjekker Claude-tilkoblingen …';
        try {
            const result = await newsletterHtmlRequest({ action });
            if (request !== generation) return;
            connection.textContent = result.connected ? 'Claude er koblet til.' : 'Claude er frakoblet.';
            revoke.hidden = !result.connected;
        } catch (error) {
            if (request === generation) connection.textContent = error.message;
        }
    }

    document.getElementById('newsletter-ai-connect').onclick = () => {
        title.textContent = 'Koble AI til nyhetsbrev';
        key.disabled = false;
        void loadConnection(open('access'));
    };
    revoke.onclick = () => loadConnection(generation, 'aiOAuthRevoke');
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
    async function review(reviewId) {
        const request = open('review');
        title.textContent = 'Kontroller nyhetsbrev fra AI';
        approve.disabled = true;
        summary.textContent = '';
        languages.hidden = true;
        testPanel.hidden = true;
        testPanel.open = false;
        testForm.reset();
        testStatus.textContent = '';
        warnings.replaceChildren();
        status.textContent = 'Henter forhåndsvisning og mottakerantall …';
        try {
            const result = await newsletterHtmlRequest({ action: 'aiReview', reviewId });
            if (request !== generation) return;
            let selectedLanguage = 'no';
            const showLanguage = language => {
                const english = language === 'en' && Boolean(result.previewHtmlEn);
                selectedLanguage = english ? 'en' : 'no';
                testSend.textContent = english ? 'Send engelsk test' : 'Send norsk test';
                title.textContent = english ? result.subjectEn : result.subject;
                languageButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.aiLanguage === (english ? 'en' : 'no'))));
                showHtmlFrame(frame, { ...result, previewHtml: english ? result.previewHtmlEn : result.previewHtml });
            };
            languages.hidden = !result.previewHtmlEn;
            languageButtons.forEach(button => { button.onclick = () => showLanguage(button.dataset.aiLanguage); });
            summary.textContent = `${result.group} · ${result.count} mottakere · Norsk: ${result.norwegianCount} · Engelsk: ${result.englishCount}`;
            for (const warning of result.warnings) {
                const item = document.createElement('li');
                item.textContent = warningMessages[warning];
                warnings.append(item);
            }
            showLanguage('no');
            testPanel.hidden = false;
            testSend.disabled = false;
            testForm.onsubmit = async event => {
                event.preventDefault();
                if (testSend.disabled) return;
                testSend.disabled = true;
                testStatus.textContent = 'Sender test …';
                try {
                    const sent = await newsletterHtmlRequest({
                        action: 'aiReviewTest', reviewId, email: testEmail.value.trim(), language: selectedLanguage
                    });
                    if (request === generation) {
                        const language = sent.language === 'en' ? 'Engelsk' : 'Norsk';
                        testStatus.textContent = `${language} test sendt til ${sent.email}.`;
                    }
                } catch (error) {
                    if (request === generation) testStatus.textContent = error.message;
                } finally {
                    if (request === generation) testSend.disabled = false;
                }
            };
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
    }

    async function consent(requestId) {
        const request = open('consent');
        const account = dialog.querySelector('[data-ai-consent-account]');
        title.textContent = 'Koble Claude til nyhetsbrev';
        account.textContent = '';
        allow.disabled = true;
        deny.disabled = true;
        status.textContent = 'Sjekker tilkoblingen …';
        try {
            const result = await newsletterHtmlRequest({ action: 'aiOAuthConsent', requestId });
            if (request !== generation) return;
            account.textContent = `Du er logget inn som ${result.email}.`;
            status.textContent = '';
            allow.disabled = false;
            deny.disabled = false;
        } catch (error) {
            if (request === generation) status.textContent = error.message;
            return;
        }
        for (const [button, decision] of [[allow, 'allow'], [deny, 'deny']]) {
            button.onclick = async () => {
                allow.disabled = true;
                deny.disabled = true;
                try {
                    const result = await newsletterHtmlRequest({ action: 'aiOAuthConsent', requestId, decision });
                    if (request === generation) window.location.assign(result.redirect);
                } catch (error) {
                    if (request === generation) {
                        status.textContent = error.message;
                        allow.disabled = false;
                        deny.disabled = false;
                    }
                }
            };
        }
    }

    return { review, consent };
}
