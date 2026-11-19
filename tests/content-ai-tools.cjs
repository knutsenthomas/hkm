const assert = require('node:assert/strict');
const { createContentAiTools, markdownToBlocks, blocksToMarkdown } = require('../functions/content-ai-tools.cjs');
const { createAdminAiTools } = require('../functions/admin-ai-tools.cjs');

class HttpsError extends Error {
    constructor(code, message) { super(message); this.code = code; }
}
const ts = ms => ({ toDate: () => new Date(ms), toMillis: () => ms });
const Timestamp = { now: () => ts(Date.now()) };

function deepMerge(target, source) {
    const out = { ...(target || {}) };
    for (const [k, v] of Object.entries(source)) {
        out[k] = v && typeof v === 'object' && !Array.isArray(v) && !v.toDate ? deepMerge(out[k], v) : v;
    }
    return out;
}

const clone = v => (v && typeof v === 'object' && !v.toDate ? (Array.isArray(v) ? v.map(clone) : Object.fromEntries(Object.entries(v).map(([k, x]) => [k, clone(x)]))) : v);

// Minimal Firestore stand-in: paths like "content/collection_blog".
function fakeDb(initial) {
    const docs = new Map(Object.entries(initial));
    let nextId = 0;
    const write = (path, data, opts) => docs.set(path, opts?.merge ? deepMerge(docs.get(path), data) : data);
    const docRef = path => ({
        path, id: path.split('/').pop(),
        get: async () => ({ id: path.split('/').pop(), exists: docs.has(path), data: () => clone(docs.get(path)) }),
        set: async (data, opts) => write(path, data, opts),
        collection: name => collectionRef(`${path}/${name}`)
    });
    const collectionRef = (base, filters = [], order = null, max = Infinity) => ({
        doc: id => docRef(`${base}/${id || `auto${nextId++}`}`),
        where: (field, op, value) => collectionRef(base, [...filters, [field, op, value]], order, max),
        orderBy: (field, dir) => collectionRef(base, filters, [field, dir], max),
        limit: n => collectionRef(base, filters, order, n),
        listDocuments: async () => [...docs.keys()].filter(k => k.startsWith(`${base}/`) && k.split('/').length === base.split('/').length + 1).map(docRef),
        get: async () => {
            const val = v => (v && v.toDate ? v.toDate().getTime() : v instanceof Date ? v.getTime() : v);
            let rows = [...docs.entries()]
                .filter(([k]) => k.startsWith(`${base}/`) && k.split('/').length === base.split('/').length + 1)
                .map(([k, v]) => ({ id: k.split('/').pop(), exists: true, data: () => clone(v), raw: v }))
                .filter(r => filters.every(([f, op, v]) => op === '==' ? r.raw[f] === v : op === '>=' ? val(r.raw[f]) >= val(v) : val(r.raw[f]) <= val(v)));
            if (order) rows.sort((a, b) => (val(a.raw[order[0]]) > val(b.raw[order[0]]) ? 1 : -1) * (order[1] === 'desc' ? -1 : 1));
            rows = rows.slice(0, max);
            return { docs: rows, size: rows.length, empty: !rows.length };
        }
    });
    return {
        docs,
        collection: name => collectionRef(name),
        runTransaction: async fn => fn({ get: ref => ref.get(), set: (ref, data, opts) => write(ref.path, data, opts) }),
        batch: () => {
            const ops = [];
            return { set: (ref, data, opts) => ops.push([ref, data, opts]), commit: async () => { for (const [r, d, o] of ops) await r.set(d, o); } };
        }
    };
}

async function run() {
    // Markdown conversion
    const md = '## Tro i hverdagen\n\nDette er **viktig** og *sant*. Les [mer](https://example.org).\n\n- én\n- to\n\n1. a\n2. b\n\n> Herren er min hyrde\n> — Salme 23,1\n\n---\n\n![Kors](https://img.example.org/a.jpg)\n\nhttps://www.youtube.com/watch?v=dQw4w9WgXcQ\n\n<script>alert(1)</script>';
    const { blocks } = markdownToBlocks(md);
    assert.deepEqual(blocks.map(b => b.type), ['header', 'paragraph', 'list', 'list', 'quote', 'delimiter', 'image', 'youtubeVideo', 'paragraph']);
    assert.equal(blocks[1].data.text, 'Dette er <b>viktig</b> og <i>sant</i>. Les <a href="https://example.org">mer</a>.');
    assert.equal(blocks[3].data.style, 'ordered');
    assert.equal(blocks[4].data.caption, 'Salme 23,1');
    assert.ok(!blocks[8].data.text.includes('<script>'), 'HTML must be escaped');
    const back = blocksToMarkdown({ blocks });
    assert.ok(back.includes('## Tro i hverdagen') && back.includes('**viktig**') && back.includes('> — Salme 23,1'));

    const live = { id: 'item-live', title: 'Gammel', date: '2025-01-01', content: { blocks: [] }, published: true };
    const db = fakeDb({
        'content/collection_blog': { items: [live] },
        'content/om-oss': { hero: { title: 'Om oss' }, translations: { en: { hero: { title: 'About us' } } } },
        'content/collection_events': { items: [] },
        'siteContent/collection_courses': { items: [{ id: 'course_1', title: 'Profetisk skole', price: 1500, lessons: [{}, {}] }] },
        'reading_plans/old': { title: 'Johannes', published: true, durationDays: 3, days: [{ dayNumber: 1 }, { dayNumber: 2 }, { dayNumber: 3 }] },
        'contacts/c1': { firstName: 'Kari', lastName: 'Nordmann', email: 'Kari@Example.org', ssn: '01010112345', nationalIdNumber: '01010112345', labels: ['Giver', 'Nyhetsbrev'], status: 'MEDLEM' },
        'donations/d1': { timestamp: ts(Date.parse('2026-11-10T10:00:00Z')), donorName: 'Kari', amount: 500, amountNok: 500, currency: 'NOK', status: 'completed', type: 'Gave', method: 'vipps' },
        'donations/d2': { timestamp: ts(Date.parse('2026-11-12T10:00:00Z')), donorName: 'Ola', amount: 299, amountNok: 299, currency: 'NOK', status: 'completed', type: 'butikk', source: 'wix_store', productName: 'Bok' },
        'donations/d3': { timestamp: ts(Date.parse('2026-10-01T10:00:00Z')), donorName: 'Per', amount: 100, currency: 'NOK', status: 'completed', type: 'Gave' },
        'contactMessages/m1': { name: 'Lise', email: 'lise@example.org', subject: 'Forbønn', message: 'Kan dere be for meg?', status: 'ny', createdAt: ts(5) },
        'contactMessages/m2': { name: 'Ole', subject: 'Takk', message: 'Takk for møtet', status: 'besvart', createdAt: ts(4), replies: [{ text: 'Takk selv', by: 'Thomas' }] },
        'courseEnrollments/e1': { name: 'Ola', email: 'ola@example.org', courseTitle: 'Profetisk skole', status: 'paid', amount: 1500, enrolledAt: ts(1) }
    });
    const tools = { ...createContentAiTools({ db, Timestamp, HttpsError }), ...createAdminAiTools({ db, HttpsError }) };
    const account = { uid: 'u1', email: 'thomas@example.org', displayName: 'Thomas' };
    const call = async (name, input) => {
        const parsed = tools[name].schema.parse(input);
        return tools[name].handler(account, parsed);
    };

    // Blog
    const draft = await call('create_content_draft', { type: 'blog', title: 'Nytt innlegg', markdown: md, english: { title: 'New post', markdown: 'Hello' } });
    assert.equal(draft.status, 'draft');
    let saved = db.docs.get('content/collection_blog').items;
    assert.equal(saved.length, 2);
    assert.equal(saved[0].published, false);
    assert.equal(saved[0].author, 'Thomas');
    assert.ok(saved[0].description.startsWith('Dette er viktig'));
    assert.equal(saved[0].translations.en.title, 'New post');
    assert.ok([...db.docs.keys()].some(k => k.startsWith('version_history/') && k.includes('/versions/')));
    assert.equal((await call('list_content', { type: 'blog', status: 'draft' })).total, 1);
    assert.ok((await call('get_content', { type: 'blog', id: draft.id })).markdown.includes('Tro i hverdagen'));
    await assert.rejects(call('update_content', { type: 'blog', id: 'item-live', title: 'Ny' }), /publisert/);
    await call('update_content', { type: 'blog', id: 'item-live', title: 'Ny', confirmLiveEdit: true });
    assert.equal(db.docs.get('content/collection_blog').items[1].title, 'Ny');
    await call('set_content_published', { type: 'blog', id: draft.id, publish: true });
    assert.equal(db.docs.get('content/collection_blog').items[0].published, true);
    await assert.rejects(call('get_content', { type: 'blog', id: 'missing' }), /Fant ikke/);

    // Teaching and events
    await call('create_content_draft', { type: 'teaching', title: 'Bønn', markdown: 'Tekst', teachingType: 'Seminarer' });
    assert.equal(db.docs.get('content/collection_teaching').items[0].teachingType, 'Seminarer');
    const ev = await call('create_content_draft', { type: 'events', title: 'Bønnemøte', markdown: 'Velkommen', date: '2026-12-03T19:00', location: 'Sperrebotn', eventRecurring: 'Hver torsdag kl. 19:00' });
    assert.ok(ev.url.includes('arrangement-detaljer.html?id='));
    const savedEvent = db.docs.get('content/collection_events').items[0];
    assert.equal(savedEvent.location, 'Sperrebotn');
    assert.equal(savedEvent.date, '2026-12-03T19:00');

    // Courses
    assert.equal((await call('list_courses', {})).courses[0].lessonCount, 2);
    await assert.rejects(call('update_course', { id: 'course_1', title: 'X' }), /confirmLiveEdit/);
    await call('update_course', { id: 'course_1', description: 'Ny tekst', confirmLiveEdit: true });
    const course = db.docs.get('siteContent/collection_courses').items[0];
    assert.equal(course.description, 'Ny tekst');
    assert.equal(course.price, 1500);

    // Page texts
    assert.deepEqual((await call('list_pages', {})).pages, ['om-oss']);
    assert.equal((await call('get_page_texts', { pageId: 'om-oss' })).texts['hero.title'], 'Om oss');
    assert.equal((await call('get_page_texts', { pageId: 'om-oss', language: 'en' })).texts['hero.title'], 'About us');
    await assert.rejects(call('update_page_text', { pageId: 'om-oss', key: 'hero.title', value: 'Hei' }), /confirmLiveEdit/);
    await assert.rejects(call('update_page_text', { pageId: 'om-oss', key: 'hero.title', value: '<b>x</b>', confirmLiveEdit: true }), /HTML/);
    await assert.rejects(call('update_page_text', { pageId: 'collection_blog', key: 'x', value: 'y', confirmLiveEdit: true }));
    await call('update_page_text', { pageId: 'om-oss', key: 'hero.subtitle', value: 'Vi er HKM', language: 'en', confirmLiveEdit: true });
    const page = db.docs.get('content/om-oss');
    assert.equal(page.translations.en.hero.subtitle, 'Vi er HKM');
    assert.equal(page.translations.en.hero.title, 'About us');
    assert.equal(page.hero.title, 'Om oss');

    // Reading plans
    const plan = await call('create_reading_plan_draft', {
        title: 'Advent', days: [{ verses: 'Jesaja 9', prayerFocus: 'Lyset' }, { verses: 'Lukas 1', resources: [{ title: 'Video', url: 'https://youtu.be/x', type: 'video' }] }],
        introduction: { description: 'Gjennom advent', themes: [{ title: 'Håp', description: 'Om håp' }] },
        english: { title: 'Advent', days: [{ prayerFocus: 'The light' }] }
    });
    assert.equal(plan.status, 'draft');
    const savedPlan = db.docs.get(`reading_plans/${plan.id}`);
    assert.equal(savedPlan.published, false);
    assert.equal(savedPlan.durationDays, 2);
    assert.equal(savedPlan.days[1].dayNumber, 2);
    assert.equal(savedPlan.days[1].resources[0].type, 'video');
    assert.ok(savedPlan.createdAt);
    assert.equal(savedPlan.translations.en.days[0].prayerFocus, 'The light');
    assert.equal((await call('list_reading_plans', { status: 'draft' })).total, 1);
    assert.equal((await call('get_reading_plan', { id: plan.id })).days.length, 2);
    await assert.rejects(call('update_reading_plan', { id: 'old', title: 'Nytt' }), /publisert/);
    await assert.rejects(call('update_reading_plan', { id: 'old', days: [{ verses: 'Joh 1' }], confirmLiveEdit: true }), /confirmShorten/);
    await call('update_reading_plan', { id: plan.id, subtitle: 'Fire uker' });
    assert.equal(db.docs.get(`reading_plans/${plan.id}`).subtitle, 'Fire uker');
    await call('set_reading_plan_published', { id: plan.id, publish: true });
    assert.equal(db.docs.get(`reading_plans/${plan.id}`).published, true);

    // Contacts never expose national ID numbers
    const found = await call('search_contacts', { query: 'kari' });
    assert.equal(found.total, 1);
    assert.ok(!JSON.stringify(found).includes('01010112345'));
    assert.ok(!('ssn' in found.contacts[0]) && !('nationalIdNumber' in found.contacts[0]));
    assert.equal((await call('search_contacts', { label: 'giver' })).total, 1);
    assert.ok(!JSON.stringify(await call('get_contact', { id: 'c1' })).includes('01010112345'));
    assert.equal((await call('contact_labels', {})).labels.length, 2);
    const dup = await call('create_contact', { firstName: 'Kari', lastName: 'N', email: 'kari@example.org' });
    assert.equal(dup.duplicate, true);
    const created = await call('create_contact', { firstName: 'Per', lastName: 'Hansen', email: 'Per@Example.org', labels: ['Frivillig'] });
    assert.equal(created.contact.email, 'per@example.org');
    assert.equal(db.docs.get(`contacts/${created.contact.id}`).createdBy, 'claude');
    assert.equal(tools.create_contact.schema.parse({ firstName: 'A', lastName: 'B', email: 'a@b.no', ssn: '1' }).ssn, undefined);
    const updated = await call('update_contact', { id: 'c1', addLabels: ['Forbeder'], removeLabels: ['nyhetsbrev'], phone: '99999999' });
    assert.deepEqual(updated.labels, ['Giver', 'Forbeder']);
    assert.equal(db.docs.get('contacts/c1').ssn, '01010112345', 'ID number left untouched');
    assert.throws(() => tools.update_contact.schema.parse({ id: 'c1', status: 'NETTSTEDSMEDLEM' }));

    // Transactions and enrollments (read-only)
    const tx = await call('list_transactions', { from: '2026-11-01', to: '2026-11-30' });
    assert.equal(tx.count, 2);
    assert.deepEqual(tx.totalsNok, { gifts: 500, orders: 299 });
    assert.equal((await call('list_transactions', { kind: 'order' })).transactions[0].products, 'Bok');
    assert.equal((await call('list_course_enrollments', { course: 'profetisk' })).byStatus.paid, 1);

    // Contact form inbox
    const inbox = await call('list_messages', { status: 'ny' });
    assert.equal(inbox.unread, 1);
    assert.equal(inbox.messages[0].subject, 'Forbønn');
    assert.equal((await call('get_message', { id: 'm2' })).replies[0].text, 'Takk selv');
    await call('mark_message_read', { id: 'm1' });
    assert.equal(db.docs.get('contactMessages/m1').status, 'lest');
    await call('mark_message_read', { id: 'm2' });
    assert.equal(db.docs.get('contactMessages/m2').status, 'besvart');

    console.log(`content-ai-tools: ok (${Object.keys(tools).length} verktøy)`);
}

run().catch(error => { console.error(error); process.exit(1); });
