const assert = require('node:assert/strict');
const { translateNewsletter } = require('../functions/newsletter-translation.cjs');
const fs = require('node:fs'), vm = require('node:vm');
const { JSDOM } = require('jsdom');
(async () => {
    const input = ['Hei', 'Bli med'];
    let googleCalls = 0;
    const googleTranslate = async () => { googleCalls++; return ['Hello', 'Join us']; };
    const fallback = await translateNewsletter({ texts: input, openai: async () => { throw new Error('timeout'); }, googleTranslate });
    assert.equal(fallback.provider, 'google');
    assert.equal(googleCalls, 1);
    await translateNewsletter({ texts: input, provider: 'google', openai: () => { throw new Error('Must not call'); }, googleTranslate });
    await assert.rejects(translateNewsletter({ texts: input, openai: async () => ['Incomplete'] }), /ufullstendig/);
    const dom = new JSDOM('<button id="editor-lang-btn-en">Engelsk</button><p id="newsletter-translation-status" hidden></p><button id="newsletter-translation-retry" hidden></button>', { url: 'https://example.com' });
    let fail = false, saves = 0;
    const context = { window: dom.window, document: dom.window.document, NodeFilter: dom.window.NodeFilter, console: { error() {}, warn() {} }, setTimeout, clearTimeout, showToast() {} };
    context.window.firebase = { functions: () => ({ httpsCallable: (name, options) => {
        assert.equal(options.timeout, 170000);
        return async request => { if (fail) throw new Error('timeout'); return { data: { texts: request.texts.map(text => 'English ' + text) } }; };
    } }) };
    vm.createContext(context);
    const source = fs.readFileSync('admin/js/newsletter-builder.js', 'utf8');
    vm.runInContext(source.slice(source.indexOf('function escapeHtml'), source.indexOf('if (!window.builder)')) + ';globalThis.Builder=NewsletterBuilder;', context);
    const editor = Object.create(context.Builder.prototype);
    const html = '<p class="copy" style="color:red">Hei <a href="https://example.com/no">Bli med</a></p><img src="https://example.com/photo.jpg" alt="Original">';
    Object.assign(editor, { blocks: [{id:'unified_content',type:'text',content:{text:html}}],subjectNo:'Emne',currentEditorLang:'no',syncUnifiedBlocks(){},saveEnglishPayloadToLocalStorage(){},triggerAutosave(){saves++;} });
    assert.equal(await editor.translateCurrentNewsletterToEnglish(), true);
    const translated = new JSDOM(editor.englishPayload.blocksEn[0].content.text).window.document;
    assert.equal(translated.querySelector('a').getAttribute('href'), 'https://example.com/no');
    assert.equal(translated.querySelector('img').getAttribute('src'), 'https://example.com/photo.jpg');
    assert.equal(translated.querySelector('img').alt, 'Original');
    assert.equal(translated.querySelector('p').getAttribute('style'), 'color:red');
    assert.equal(editor.blocks[0].content.text, html);
    // A custom English image survives retranslation while the Norwegian image remains intact.
    editor.englishPayload.blocksEn[0].content.text = editor.englishPayload.blocksEn[0].content.text.replace(
        'src="https://example.com/photo.jpg"',
        'src="https://example.com/english.jpg" data-newsletter-original-src="https://example.com/photo.jpg" data-newsletter-image-variant="en"');
    assert.equal(await editor.translateCurrentNewsletterToEnglish(), true);
    assert.match(editor.englishPayload.blocksEn[0].content.text, /src="https:\/\/example.com\/english.jpg"/);
    assert.equal(editor.blocks[0].content.text, html);
    const prior = JSON.stringify(editor.englishPayload);
    fail = true;
    assert.equal(await editor.translateCurrentNewsletterToEnglish(), false);
    assert.equal(JSON.stringify(editor.englishPayload), prior);
    assert.equal(context.document.getElementById('editor-lang-btn-en').disabled, false);
    assert.equal(context.document.getElementById('newsletter-translation-retry').hidden, false);
    assert.equal(saves, 2);
    console.log('Passed: Google fallback, complete-response validation, original layout/links/images preserved, failed retranslation preserves prior version and re-enables retry.');
})().catch(error => { console.error(error); process.exitCode = 1; });
