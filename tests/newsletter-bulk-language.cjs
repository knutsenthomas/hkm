const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<button id="origin">Endre språk</button>');
const source = fs.readFileSync('admin/js/newsletter-builder.js', 'utf8');
const context = { window: dom.window, document: dom.window.document, console, showToast() {}, setTimeout, clearTimeout };
vm.createContext(context);
vm.runInContext(source.slice(source.indexOf('function escapeHtml'), source.indexOf('if (!window.builder)')) + '; globalThis.Builder = NewsletterBuilder;', context);
const builder = Object.create(context.Builder.prototype);
const records = [
    { collection: 'contacts', email: 'a@example.com', tags: ['HKM prayer team', ' English '], segments: ['Frivillig', 'EN'] },
    { collection: 'newsletter_subscriptions', email: 'a@example.com', tags: 'VIP,engelsk', segments: ['Nyhetsbrev'], isSubscribed: false },
    { collection: 'users', email: 'b@example.com', tags: ['Leder'], segments: ['engelsk', 'Ungdom'] },
    { collection: 'contacts', email: 'other@example.com', tags: ['english'], segments: ['Fastgiver'] }
];
let fail = false, commits = 0;
context.window.firebaseService = { db: {
    collection: collection => ({ where: (field, op, email) => ({ get: async () => ({
        forEach: fn => records.filter(r => r.collection === collection && r.email === email).forEach(r => fn({ ref: r, data: () => r }))
    }) }) }),
    batch: () => { const pending = []; return { update: (ref, data) => pending.push({ref, data}), commit: async () => {
        if (fail) throw new Error('Network failed');
        commits++; pending.forEach(({ref, data}) => Object.assign(ref, data));
    } }; }
} };
(async () => {
    assert.equal(await builder.updateSubscriberLanguages(['a@example.com', 'b@example.com', 'a@example.com'], 'no'), 2);
    assert.deepEqual(Array.from(records[0].tags), ['HKM prayer team']);
    assert.deepEqual(Array.from(records[0].segments), ['Frivillig']);
    assert.equal(records[1].isSubscribed, false);
    assert.deepEqual(Array.from(records[1].tags), ['VIP']);
    assert.deepEqual(Array.from(records[2].segments), ['Ungdom']);
    assert.deepEqual(records[3].tags, ['english']);
    await builder.updateSubscriberLanguages(['a@example.com', 'b@example.com'], 'en');
    assert.equal(builder.isEnglishRecipient(records[0]), true);
    assert.equal(builder.isEnglishRecipient(records[1]), true);
    assert.equal(builder.isEnglishRecipient(records[2]), true);
    const before = commits;
    await assert.rejects(builder.updateSubscriberLanguages(['a@example.com', 'missing@example.com'], 'no'), /Fant ikke/);
    assert.equal(commits, before, 'Missing recipient must not cause partial writes');
    fail = true;
    await assert.rejects(builder.updateSubscriberLanguages(['a@example.com'], 'no'), /Network/);
    assert.equal(commits, before);
    builder.openBulkLanguageModal(['a@example.com', 'b@example.com']);
    const modal = context.document.getElementById('hkm-bulk-language-modal');
    await modal.querySelector('#save-bulk-language').onclick();
    assert.match(modal.querySelector('[role=status]').textContent, /Velg norsk/);
    modal.querySelector('select').value = 'no';
    await modal.querySelector('#save-bulk-language').onclick();
    assert.match(modal.querySelector('[role=status]').textContent, /Kunne ikke fullføre/);
    assert.equal(modal.querySelector('#save-bulk-language').disabled, false);
    modal.querySelector('#cancel-bulk-language').click();
    assert.equal(context.document.getElementById('hkm-bulk-language-modal'), null);
    console.log('Passed: bulk language across duplicate sources, preserved groups and subscription status, missing recipients, failed writes and modal validation.');
})().catch(error => { console.error(error); process.exitCode = 1; });
