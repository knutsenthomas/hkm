const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<div id="recipient-language-review"></div><input id="newsletter-subject" value="Norsk brev"><button id="final-send-btn">Send</button>');
const source = fs.readFileSync('admin/js/newsletter-builder.js', 'utf8');
let writes = [], confirmations = 0, toasts = [];
const context = { window: dom.window, document: dom.window.document, Option: dom.window.Option, console,
    showToast: text => toasts.push(text), setTimeout, clearTimeout };
vm.createContext(context);
vm.runInContext(source.slice(source.indexOf('function escapeHtml'), source.indexOf('if (!window.builder)')) + '; globalThis.Builder = NewsletterBuilder;', context);
const editor = Object.create(context.Builder.prototype);
const recipients = [{ id: 'a', collection: 'contacts', name: 'Ola', email: 'ola@example.com', tags: [], segments: [] },
    { id: 'b', collection: 'contacts', name: 'Jane', email: 'jane@example.com', tags: [' English '], segments: [] }];
Object.assign(editor, { blocks: [{ content: { text: '<p>Hei</p>' } }], currentEditorLang: 'no',
    fetchSubscribersList: async () => recipients, getAuthUser: async () => ({}), syncUnifiedBlocks() {},
    getLanguageBlocksHtml: blocks => blocks.map(b => b.content.text).join(''),
    showConfirm: async () => { confirmations++; return false; } });
context.window.firebaseService = { db: { collection: collection => ({ doc: id => ({ update: async data => {
    writes.push({ collection, id, data }); Object.assign(recipients.find(rec => rec.id === id), data);
} }) }) } };
(async () => {
    await editor.calculateEstimated();
    const host = context.document.getElementById('recipient-language-review');
    assert.match(host.textContent, /Norsk: 1 · Engelsk: 1 · Totalt: 2/);
    const search = host.querySelector('input[type=search]');
    search.value = 'jane'; search.oninput();
    assert.equal(host.querySelectorAll('label')[0].parentElement.style.display, 'none');
    const checkbox = host.querySelector('input[type=checkbox]');
    checkbox.checked = false; checkbox.onchange();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(editor.filterRecipientsBySelection(recipients).length, 1);
    assert.equal(editor.filterRecipientsBySelection(recipients, true).length, 2);
    await editor.sendCampaign();
    assert.equal(confirmations, 0);
    assert.match(toasts.at(-1), /engelsk oversettelse/);
    assert.equal(context.document.getElementById('final-send-btn').disabled, false);
    const select = host.querySelectorAll('select')[1];
    select.value = 'no'; await select.onchange();
    assert.equal(writes[0].id, 'b');
    assert.equal(editor.isEnglishRecipient(recipients[1]), false);
    editor.englishPayload = { subjectEn: 'English letter', blocksEn: [{ content: { text: '<p>Hello</p>' } }] };
    recipients[1].tags = ['engelsk'];
    await editor.sendCampaign();
    assert.equal(confirmations, 1);
    console.log('Passed: language counts, search, campaign exclusions, persisted language and translation guard. No emails sent.');
})().catch(error => { console.error(error); process.exitCode = 1; });
