const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');
const source = fs.readFileSync('admin/js/newsletter-builder.js', 'utf8');
assert.doesNotMatch(source.slice(source.indexOf('    async sendTestEmail('), source.indexOf('    filterRecipientsBySelection(')), /\balert\s*\(/);
const builderCss = fs.readFileSync('admin/css/newsletter-builder.css', 'utf8');
const workspaceCss = fs.readFileSync('admin/css/newsletter-workspace.css', 'utf8');
assert.doesNotMatch(workspaceCss, /p\[data-editor-empty="true"\]::after/);
assert.match(workspaceCss, /p\[data-editor-empty="true"\]:only-child::after/);
assert.doesNotMatch(builderCss, /\.docs-rte-surface p\s*\{[^}]*margin:[^;]*!important/);
const dom = new JSDOM(`<div id="blocks-container"><p>First</p></div><input id="newsletter-subject" value="Subject"><div class="canvas-header">HKM</div><div id="newsletter-autosave-status"><span class="material-symbols-outlined"></span></div><span id="newsletter-autosave-text"></span><div id="desktop-richtools"><button data-tool="undo"></button><button data-tool="redo"></button></div>`, { url: 'https://example.com/admin?draftId=draft' });
let timers = new Map(), nextTimer = 0, writes = [], release, fail = false;
const db = { collection: () => ({ doc: () => ({ set: data => {
    writes.push(JSON.parse(JSON.stringify(data)));
    if (fail) return Promise.reject(new Error('simulated network failure'));
    return new Promise(resolve => { release = resolve; });
} }) }) };
const context = { window: dom.window, document: dom.window.document, Node: dom.window.Node, URL, Date,
    console: { log() {}, warn() {}, error() {} }, showToast() {},
    localStorage: dom.window.localStorage, sessionStorage: dom.window.sessionStorage,
    setTimeout(fn, ms) { const id = ++nextTimer; timers.set(id, { fn, ms }); return id; },
    clearTimeout(id) { timers.delete(id); }
};
context.window.firebaseService = { isInitialized: true, db };
vm.createContext(context);
vm.runInContext(source.slice(source.indexOf('function escapeHtml'), source.indexOf('if (!window.builder)')) + '; globalThis.Builder = NewsletterBuilder;', context);
const editor = Object.create(context.Builder.prototype);
Object.assign(editor, { currentMode: 'builder', currentDraftId: 'draft', currentDraftName: 'Name', hasCustomDraftName: true,
    editorDocumentKey: 'draft', blocks: [], recordNewsletterVersion: async () => {},
    normalizeCanvasBlocks() {}, isMobileViewport: () => false });
const box = context.document.getElementById('blocks-container');
// Bare editor text must select as a paragraph, never call classList on text.
{
    const selectionEditor = Object.create(context.Builder.prototype);
    Object.assign(selectionEditor, { updateDocumentTools() {}, deselectBlock() {},
        attachBlockQuickToolbar() {}, showTextInspector() {}, isMobileViewport: () => false });
    box.textContent = 'Bare draft text';
    const textNode = box.firstChild;
    assert.doesNotThrow(() => selectionEditor.selectBlock(textNode, textNode));
    assert.equal(box.firstElementChild.tagName, 'P');
    assert.equal(box.textContent, 'Bare draft text');
    assert.equal(selectionEditor.activeBlockNode, box.firstElementChild);
    assert.ok(box.firstElementChild.classList.contains('selected-block-active'));
    assert.doesNotThrow(() => selectionEditor.selectBlock(textNode, textNode));
    assert.equal(box.children.length, 1);
    box.append(context.document.createTextNode('  '));
    assert.equal(selectionEditor.getCurrentBlock(box.lastChild), null);
    assert.doesNotThrow(() => selectionEditor.selectBlock(null));
    box.innerHTML = '<p>First</p>';
}
// Collages preserve email-safe table layout, escape attributes and reject unsafe URLs.
{
    const collage = editor.buildCollageHtml([
        {url:'https://example.com/a.jpg',alt:'A "quoted" image'},
        {url:'https://example.com/b.jpg'},
        {url:'https://example.com/c.jpg'}
    ],2);
    const holder=context.document.createElement('div');holder.innerHTML=collage;
    assert.equal(holder.querySelectorAll('table[role="presentation"] tr').length,2);
    assert.equal(holder.querySelectorAll('img').length,3);
    assert.equal(holder.querySelector('img').alt,'A "quoted" image');
    assert.equal(editor.getEditorBlockLabel(holder.firstElementChild),'Bildekollasj');
    assert.throws(()=>editor.buildCollageHtml([{url:'javascript:alert(1)'},{url:'https://example.com/b.jpg'}]));
    assert.throws(()=>editor.buildCollageHtml([{url:'https://example.com/a.jpg'}]));
    const modalEditor=Object.create(context.Builder.prototype);
    let inserted='';
    modalEditor.mountEditorModal=modal=>context.document.body.append(modal);
    modalEditor.insertHtmlAtCursorOrEndAt=html=>{inserted=html;};
    modalEditor.openButtonInsertionFlowAt(null,{donation:true});
    assert.equal(context.document.getElementById('hkm-btn-modal-text').value,'Gi en gave');
    assert.equal(context.document.getElementById('hkm-internal-page-select').value,'https://www.hiskingdomministry.no/donasjoner.html');
    context.document.getElementById('hkm-btn-modal-insert').click();
    holder.innerHTML=inserted;
    assert.equal(holder.querySelector('a').textContent,'Gi en gave');
    assert.equal(holder.querySelector('a').getAttribute('href'),'https://www.hiskingdomministry.no/donasjoner.html');
    box.innerHTML=collage+inserted;
    const saved=editor.getCleanCanvasHtml();
    box.innerHTML=saved;
    assert.equal(box.querySelectorAll('.newsletter-collage-block img').length,3);
    const emailHtml=editor.compileEmailHtml();
    const email=context.document.createElement('div');email.innerHTML=emailHtml;
    assert.equal(email.querySelectorAll('.newsletter-collage-block img').length,3);
    assert.ok(email.querySelector('a[href="https://www.hiskingdomministry.no/donasjoner.html"]'));
    box.innerHTML='<p>First</p>';
    // Selecting a later image in a collage must inspect that image, not the first.
    const chooser=Object.create(context.Builder.prototype);
    let inspected;
    Object.assign(chooser,{updateDocumentTools(){},deselectBlock(){},attachBlockQuickToolbar(){},showImageInspector:img=>{inspected=img;},isMobileViewport:()=>false});
    holder.innerHTML=collage;
    chooser.selectBlock(holder.firstElementChild,holder.querySelectorAll('img')[1]);
    assert.equal(inspected,holder.querySelectorAll('img')[1]);
}
// Text formatting survives saved HTML and email compilation, including nested styles.
{
    box.innerHTML='<h2 style="font-size:30px;font-weight:600;text-align:center;margin-bottom:11px;">Heading</h2><p style="font-size:17px;line-height:1.8;margin-bottom:22px;text-align:right;color:rgb(27,73,101);">Paragraph <span style="font-weight:700;font-style:italic;">emphasis</span></p>';
    const saved=editor.getCleanCanvasHtml();
    box.innerHTML=saved;
    assert.equal(box.querySelector('h2').style.fontSize,'30px');
    const paragraph=box.querySelector('p');
    assert.equal(paragraph.style.fontSize,'17px');
    assert.equal(paragraph.style.lineHeight,'1.8');
    assert.equal(paragraph.style.marginBottom,'22px');
    assert.equal(paragraph.getAttribute('align'),'right');
    assert.equal(paragraph.querySelector('span').style.fontWeight,'700');
    const exported=context.document.createElement('div');exported.innerHTML=editor.compileEmailHtml();
    const outputParagraph=[...exported.querySelectorAll('p')].find(p=>p.textContent.startsWith('Paragraph'));
    assert.equal(outputParagraph.style.fontSize,'17px');
    assert.equal(outputParagraph.style.lineHeight,'1.8');
    assert.equal(outputParagraph.style.marginBottom,'22px');
    assert.equal(outputParagraph.style.textAlign,'right');
    assert.equal(outputParagraph.querySelector('span').style.fontStyle,'italic');
    box.innerHTML='<p>First</p>';
}
// Exercise the actual selection callback after clicking outside the document.
const selectionSection = source.slice(source.indexOf('// Inspector controls retain'), source.indexOf('// Clear pending delete'));
const selectionBody = selectionSection.slice(selectionSection.indexOf("() => {") + 7, selectionSection.lastIndexOf('});'));
assert.doesNotThrow(() => vm.runInContext('(function(){' + selectionBody + '}).call({blockSelectionCleared:true})', context));

const text = context.document.getElementById('newsletter-autosave-text');
const runSaveTimer = () => {
    const [id, timer] = [...timers].find(([, timer]) => timer.ms === 2000);
    timers.delete(id); return timer.fn();
};
(async () => {
    const collageEditor=Object.create(context.Builder.prototype);
    let collageInserted='';
    collageEditor.mountEditorModal=modal=>context.document.body.append(modal);
    collageEditor.insertHtmlAtCursorOrEndAt=html=>{collageInserted=html;};
    collageEditor.openCollageInsertionFlowAt(null);
    let collageModal=context.document.getElementById('hkm-collage-modal');
    collageModal.querySelector('#collage-urls').value='https://example.com/a.jpg';
    await collageModal.querySelector('form').onsubmit({preventDefault(){}});
    assert.match(collageModal.querySelector('[role="alert"]').textContent,/2.*6/);
    assert.equal(collageInserted,'');
    collageModal.querySelector('#collage-urls').value='https://example.com/a.jpg\nhttps://example.com/b.jpg';
    await collageModal.querySelector('form').onsubmit({preventDefault(){}});
    assert.match(collageInserted,/newsletter-collage-block/);
    assert.equal(context.document.getElementById('hkm-collage-modal'),null);
    editor.triggerAutosave(); const first = runSaveTimer();
    assert.equal(writes.length, 1);
    box.innerHTML = '<p>Latest edit</p>'; editor.triggerAutosave();
    await runSaveTimer(); assert.equal(writes.length, 1);
    release(); await first;
    assert.equal(editor.hasUnsavedChanges, true);
    assert.match(text.textContent, /Ulagrede|Autolagrer/);
    const second = runSaveTimer(); assert.equal(writes.length, 2);
    assert.match(writes[1].blocks[0].content.text, /Latest edit/);
    release(); await second; assert.equal(editor.hasUnsavedChanges, false);
    fail = true; box.innerHTML = '<p>Unsaved after failure</p>'; editor.triggerAutosave(); await runSaveTimer();
    assert.equal(editor.hasUnsavedChanges, true); assert.equal(text.textContent, 'Lagring feilet');
    editor.restoreEditorStep(-1); assert.equal(box.textContent, 'Latest edit');
    editor.restoreEditorStep(1); assert.equal(box.textContent, 'Unsaved after failure');
    box.innerHTML = '<div><p id="one">One</p><p id="two">Two</p></div>';
    const range = context.document.createRange(); range.selectNodeContents(context.document.getElementById('one'));
    dom.window.getSelection().removeAllRanges(); dom.window.getSelection().addRange(range);
    editor.saveSelection(); editor.setLineHeight('2');
    assert.equal(context.document.getElementById('one').style.lineHeight, '2');
    assert.equal(context.document.getElementById('two').style.lineHeight, '');
    box.innerHTML = '<p style="margin:16px 0">Text</p>';
    const original = box.firstElementChild;
    const caret = context.document.createRange(); caret.selectNodeContents(original); caret.collapse(false);
    dom.window.getSelection().removeAllRanges(); dom.window.getSelection().addRange(caret);
    const commands = [];
    context.document.execCommand = command => {
        commands.push(command);
        if (command === 'insertParagraph') {
            const next = original.cloneNode(false); next.innerHTML = '<br>'; original.after(next);
            const nextCaret = context.document.createRange(); nextCaret.selectNodeContents(next); nextCaret.collapse(true);
            dom.window.getSelection().removeAllRanges(); dom.window.getSelection().addRange(nextCaret);
        }
    };
    editor.selectBlock = () => {};
    editor.handleDocumentEnter({ key: 'Enter', preventDefault() {} });
    assert.equal(commands.filter(command => command === 'insertParagraph').length, 1);
    assert.equal(box.children.length, 2);
    assert.equal(original.style.marginBottom, '0px');
    assert.equal(box.lastElementChild.style.marginTop, '0px');
    assert.equal(box.lastElementChild.style.marginBottom, '0px');
    editor.handleDocumentEnter({ key: 'Enter', shiftKey: true, preventDefault() {} });
    assert.equal(commands.at(-1), 'insertLineBreak');
    assert.equal(box.children.length, 2);
    box.innerHTML = '<p><br></p>';
    context.document.body.classList.add('builder-active');
    const editorLayout = context.document.createElement('div'); editorLayout.id = 'newsletter-builder-layout';
    context.document.body.append(editorLayout); editorLayout.append(box);
    editor.positionDocumentTools = () => {};
    editor.updateDocumentTools(box.firstElementChild);
    editor.attachBlockQuickToolbar(box.firstElementChild);
    editor.updateDocumentTools(box.firstElementChild);
    assert.equal(box.querySelector('#block-quick-toolbar'), null);
    assert.equal(context.document.getElementById('hkm-document-tools').parentElement, editorLayout);
    assert.equal(context.document.querySelector('[data-document-tool="insert"]').hidden, false);
    assert.equal(context.document.querySelector('[data-document-tool="menu"]').hidden, true);
    box.firstElementChild.textContent = 'Written text';
    editor.updateDocumentTools(box.firstElementChild);
    assert.equal(context.document.querySelector('[data-document-tool="insert"]').hidden, true);
    editor.mountEditorModal = modal => context.document.body.append(modal);
    editor.openSocialInsertionFlowAt(null);
    const brand = context.document.getElementById('social-brand-select');
    brand.value = 'hkd'; brand.dispatchEvent(new dom.window.Event('change'));
    assert.equal(context.document.getElementById('social-url-facebook').value, 'https://www.facebook.com/HisKingdomDesigns?locale=nb_NO');
    assert.equal(context.document.getElementById('social-url-website').value, 'https://hiskingdomdesigns.no/');
    assert.equal(context.document.getElementById('social-check-instagram').checked, true);
    assert.equal(context.document.getElementById('social-url-instagram').value, 'https://www.instagram.com/hiskingdomdesigns/');
    assert.equal(context.document.getElementById('social-url-youtube').value, '');
    brand.value = 'hkm'; brand.dispatchEvent(new dom.window.Event('change'));
    assert.equal(context.document.getElementById('social-url-facebook').value, 'https://facebook.com/hiskingdomministry');
    const newsletterRecipients = Array.from({length:73}, (_, index) => ({name:'Person '+index, email:`person${index}@example.com`, source:index < 2 ? 'Nyhetsbrev' : 'Kontaktliste (CRM)', tags:[index % 2 ? 'Ny' : 'Nyhetsbrev'], segments:[]}));
    assert.equal(newsletterRecipients.filter(person => editor.matchesSubscriberFilters(person, '', 'Nyhetsbrev', 'Nyhetsbrev')).length, 73);
    assert.equal(editor.matchesSubscriberFilters({source:'Kontaktliste (CRM)', tags:[], segments:[]}, '', 'Nyhetsbrev'), false);
    assert.equal(editor.matchesSubscriberFilters(newsletterRecipients[4], 'missing@example.com', 'Nyhetsbrev'), false);
    assert.equal(newsletterRecipients.filter(person => editor.matchesSubscriberFilters(person, '', 'Kontaktliste (CRM)', 'Nyhetsbrev')).length, 71);
    console.log('Passed: queued edits, truthful save status, failed save, undo/redo and paragraph-only spacing.');
})().catch(error => { console.error(error); process.exitCode = 1; });
