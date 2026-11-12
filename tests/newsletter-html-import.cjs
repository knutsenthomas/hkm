const assert = require('node:assert/strict');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');
const { JSDOM } = require('jsdom');
const {
    sanitizeImportedNewsletter, renderImportedNewsletter, plainNewsletterText, CSP
} = require('../functions/newsletter-html.cjs');

const source = `<!doctype html><html lang="no"><head>
    <meta http-equiv="refresh" content="0;url=https://example.org">
    <link rel="stylesheet" href="https://example.org/external.css">
    <style>@import "https://example.org/external.css"; @media(max-width:400px){p{display:grid}}</style>
    </head><body><script>alert(1)</script><iframe src="https://example.org"></iframe>
    <form><input><p>Skjema</p></form>
    <p onclick="alert(1)" style="display:flex;background:url(https://example.org/bad.png)">Hei {{fornavn}}.</p>
    <img src="relative.png"><img src="https://example.org/image.png" alt="Bilde">
    <a href="jav&#x09;ascript&#58;alert(1)">Utrygg lenke</a>
    <a href="{{nettleserlenke}}">Les i nettleser</a></body></html>`;

const result = sanitizeImportedNewsletter(source);
assert.deepEqual(new Set(result.warnings), new Set(['externalCss', 'flex', 'grid', 'imageUrl', 'unsubscribe']));
assert.doesNotMatch(result.html, /<script|<iframe|<form|<meta|<link|onclick|javascript:|relative\.png|bad\.png|Skjema/i);
assert.match(result.html, /@media.*display:grid/);
assert.match(result.html, /style="display:flex"/);
assert.match(result.html, /src="https:\/\/example.org\/image.png"/);
assert.throws(() => sanitizeImportedNewsletter('<script>no</script>'), /må inneholde/);
assert.throws(() => sanitizeImportedNewsletter('a'.repeat(400001)), /400 kB/);
assert.ok(sanitizeImportedNewsletter('<p>' + 'ø'.repeat(50000) + '</p>').warnings.includes('size'));
assert.equal(sanitizeImportedNewsletter(result.html).html, result.html);

const unsubscribeUrl = 'https://example.org/avmeld?email=ola%40example.org&token=signed';
const browserUrl = 'https://example.org/edition';
const firstName = '<img src=x onerror=alert(1)> & Åse';
const rendered = renderImportedNewsletter(result, { firstName, unsubscribeUrl, browserUrl });
const page = new JSDOM(rendered).window.document;
assert.equal(page.querySelector('body > p').textContent, `Hei ${firstName}.`);
assert.equal(page.querySelectorAll('img').length, 2);
assert.equal(page.querySelector('a[href*="avmeld"]').href, unsubscribeUrl);
assert.equal(page.querySelector('a[href*="edition"]').href, browserUrl);
assert.ok(plainNewsletterText(rendered).includes(unsubscribeUrl));
assert.ok(plainNewsletterText(rendered).includes(browserUrl));
assert.ok(plainNewsletterText(rendered).includes('Åse'));
assert.doesNotMatch(plainNewsletterText(rendered), /@media/);
assert.doesNotMatch(renderImportedNewsletter(result, { firstName, unsubscribeUrl, browserUrl, preview: true }), /href=/);
const existingFooter = sanitizeImportedNewsletter('<a href="{{avmeldingslenke}}">Meld av</a>');
assert.ok(!existingFooter.warnings.includes('unsubscribe'));
assert.equal(new JSDOM(renderImportedNewsletter(existingFooter, { unsubscribeUrl })).window.document.querySelectorAll('a').length, 1);

async function testEditor() {
    const path = pathToFileURL(process.cwd() + '/admin/js/newsletter-html-import.js');
    const { setupNewsletterHtmlImport } = await import(path);
    const dom = new JSDOM(fs.readFileSync('admin/admin-nyhetsbrev.html', 'utf8'));
    global.document = dom.window.document;
    global.window = dom.window;
    global.Event = dom.window.Event;
    const dialog = document.getElementById('newsletter-html-import');
    dialog.showModal = () => dialog.setAttribute('open', '');
    dialog.close = () => {
        dialog.removeAttribute('open');
        dialog.dispatchEvent(new Event('close'));
    };
    let draftHtml;
    let tested;
    const builder = {
        setImportedNewsletterHtml(html, options) {
            draftHtml = html;
            assert.equal(options.edited, true);
        },
        async sendImportedNewsletterTest(html, subject) {
            tested = { html, subject };
            return 'admin@example.org';
        }
    };
    window.firebase = { app: () => ({
        functions: region => ({
            httpsCallable: name => async data => {
                assert.equal(region, 'us-central1');
                assert.equal(name, 'newsletterHtmlAdmin');
                assert.equal(data.action, 'preview');
                assert.equal(data.html, source);
                return { data: {
                    html: result.html, warnings: result.warnings, csp: CSP,
                    previewHtml: renderImportedNewsletter(result, { firstName, unsubscribeUrl, browserUrl, preview: true })
                } };
            }
        })
    }) };
    setupNewsletterHtmlImport(builder);
    document.getElementById('newsletter-html-import-btn').click();
    const textarea = dialog.querySelector('textarea');
    textarea.value = source;
    document.getElementById('newsletter-html-subject').value = 'Prøve';
    await dialog.querySelector('[data-html-validate]').onclick();
    const iframe = dialog.querySelector('iframe');
    assert.equal(iframe.getAttribute('sandbox'), '');
    assert.equal(iframe.width, '600');
    assert.ok(iframe.srcdoc.includes('Content-Security-Policy'));
    dialog.querySelector('[data-html-width="375"]').click();
    assert.equal(iframe.width, '375');
    await dialog.querySelector('[data-html-test]').onclick();
    assert.deepEqual(tested, { html: source, subject: 'Prøve' });
    await dialog.querySelector('[data-html-apply]').onclick();
    assert.equal(draftHtml, result.html);
    assert.equal(document.getElementById('newsletter-subject').value, 'Prøve');
    assert.equal(dialog.open, false);
}

testEditor().then(() => {
    console.log('Passed: server sanitization, warnings, merge fields, plain text, sandbox, preview sizes and editor integration.');
}).catch(error => {
    console.error(error);
    process.exitCode = 1;
});
