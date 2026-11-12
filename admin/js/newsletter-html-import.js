export const warningMessages = {
    flex: 'Flexbox kan vises feil i enkelte e-postklienter.',
    grid: 'CSS Grid kan vises feil i enkelte e-postklienter.',
    externalCss: 'Eksterne stilark er fjernet. Legg stilene inn i HTML-en.',
    imageUrl: 'Bilder uten en absolutt HTTP- eller HTTPS-adresse er fjernet.',
    unsubscribe: 'En avmeldingslinje legges automatisk til nederst.',
    size: 'HTML-koden er rundt 100 kB eller mer. Gmail kan avkorte e-posten.'
};

export async function newsletterHtmlRequest(data) {
    const callable = window.firebase.app().functions('us-central1').httpsCallable('newsletterHtmlAdmin');
    return (await callable(data)).data;
}

export function showHtmlFrame(frame, result) {
    frame.srcdoc = result.previewHtml.replace('<!doctype html>', () =>
        `<!doctype html><meta http-equiv="Content-Security-Policy" content="${result.csp}"><meta name="referrer" content="no-referrer">`);
    frame.hidden = false;
}

export function setupHtmlFrameWidths(dialog, frame) {
    const devices = dialog.querySelectorAll('[data-html-width]');
    devices.forEach(button => {
        button.onclick = () => {
            frame.width = button.dataset.htmlWidth;
            devices.forEach(device => device.setAttribute('aria-pressed', String(device === button)));
        };
    });
}

export function setupNewsletterHtmlImport(builder) {
    const dialog = document.getElementById('newsletter-html-import');
    if (!dialog) return;
    const source = dialog.querySelector('textarea');
    const subject = document.getElementById('newsletter-html-subject');
    const editorSubject = document.getElementById('newsletter-subject');
    const file = dialog.querySelector('input[type=file]');
    const status = dialog.querySelector('[role=status]');
    const warnings = dialog.querySelector('ul');
    const frame = dialog.querySelector('iframe');
    const apply = dialog.querySelector('[data-html-apply]');
    const validate = dialog.querySelector('[data-html-validate]');
    const test = dialog.querySelector('[data-html-test]');
    const editor = document.getElementById('newsletter-html-editor-btn');
    let checked;
    let generation = 0;

    function clearPreview() {
        generation++;
        checked = null;
        apply.disabled = true;
        test.disabled = true;
        warnings.replaceChildren();
        frame.removeAttribute('srcdoc');
        frame.hidden = true;
        status.textContent = '';
    }

    async function check() {
        clearPreview();
        const request = generation;
        status.textContent = 'Kontrollerer HTML …';
        validate.disabled = true;
        try {
            const result = await newsletterHtmlRequest({ action: 'preview', html: source.value });
            if (request !== generation) return;
            checked = result;
            showHtmlFrame(frame, result);
            for (const warning of result.warnings) {
                const item = document.createElement('li');
                item.textContent = warningMessages[warning];
                warnings.append(item);
            }
            status.textContent = 'Forhåndsvisningen er klar.';
            apply.disabled = false;
            test.disabled = false;
        } catch (error) {
            if (request === generation) status.textContent = error.message;
        } finally {
            if (request === generation) validate.disabled = false;
        }
    }

    builder.openHtmlImport = (preview = false) => {
        if (dialog.open) return;
        source.value = builder.importedNewsletterHtml || '';
        subject.value = builder.currentEditorLang === 'en' ? builder.subjectNo || '' : editorSubject.value;
        file.value = '';
        clearPreview();
        validate.disabled = false;
        dialog.showModal();
        if (preview && source.value) void check();
    };
    document.getElementById('newsletter-html-import-btn').onclick = () => builder.openHtmlImport();
    document.getElementById('newsletter-html-edit-btn').onclick = () => builder.openHtmlImport(true);
    editor.onclick = async () => {
        if (await builder.showConfirm('Bruk visuell editor', 'Den importerte HTML-en fjernes fra dette utkastet. Innholdet i den visuelle editoren hentes fram igjen.', 'Bytt editor')) {
            builder.setImportedNewsletterHtml('', { edited: true });
        }
    };
    dialog.querySelector('[data-html-close]').onclick = () => dialog.close();
    dialog.addEventListener('close', clearPreview);
    source.addEventListener('input', () => {
        clearPreview();
        validate.disabled = false;
    });
    file.addEventListener('change', async () => {
        const selected = file.files[0];
        if (!selected) return;
        clearPreview();
        const request = generation;
        validate.disabled = false;
        if (!/\.html?$/i.test(selected.name) || selected.size > 400_000) {
            status.textContent = 'Velg en .html- eller .htm-fil på opptil 400 kB.';
            return;
        }
        try {
            const content = await selected.text();
            if (request !== generation) return;
            source.value = content;
            await check();
        } catch {
            if (request === generation) status.textContent = 'Kunne ikke lese HTML-filen.';
        }
    });
    validate.onclick = check;
    apply.onclick = async () => {
        if (!checked) return;
        const { html } = checked;
        if (builder.isSwitchingEditorLanguage) {
            status.textContent = 'Vent til språkbyttet er ferdig.';
            return;
        }
        if (builder.currentEditorLang === 'en') await builder.switchEditorLanguage('no');
        editorSubject.value = subject.value;
        editorSubject.dispatchEvent(new Event('input', { bubbles: true }));
        builder.setImportedNewsletterHtml(html, { edited: true });
        dialog.close();
    };
    test.onclick = async () => {
        if (!checked) return;
        const request = generation;
        test.disabled = true;
        status.textContent = 'Sender test til din e-postadresse …';
        try {
            const email = await builder.sendImportedNewsletterTest(source.value, subject.value.trim());
            if (request === generation) status.textContent = `Test sendt til ${email}.`;
        } catch (error) {
            if (request === generation) status.textContent = error.message;
        } finally {
            if (request === generation) test.disabled = false;
        }
    };
    setupHtmlFrameWidths(dialog, frame);
}
