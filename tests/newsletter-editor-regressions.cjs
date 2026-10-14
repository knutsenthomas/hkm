const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');
const source = fs.readFileSync('admin/js/newsletter-builder.js', 'utf8');
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
const text = context.document.getElementById('newsletter-autosave-text');
const runSaveTimer = () => {
    const [id, timer] = [...timers].find(([, timer]) => timer.ms === 2000);
    timers.delete(id); return timer.fn();
};
(async () => {
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
    editor.positionDocumentTools = () => {};
    editor.updateDocumentTools(box.firstElementChild);
    editor.attachBlockQuickToolbar(box.firstElementChild);
    editor.updateDocumentTools(box.firstElementChild);
    assert.equal(box.querySelector('#block-quick-toolbar'), null);
    assert.equal(context.document.querySelector('[data-document-tool="insert"]').hidden, false);
    assert.equal(context.document.querySelector('[data-document-tool="menu"]').hidden, true);
    box.firstElementChild.textContent = 'Written text';
    editor.updateDocumentTools(box.firstElementChild);
    assert.equal(context.document.querySelector('[data-document-tool="insert"]').hidden, true);
    console.log('Passed: queued edits, truthful save status, failed save, undo/redo and paragraph-only spacing.');
})().catch(error => { console.error(error); process.exitCode = 1; });
