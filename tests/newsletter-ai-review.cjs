const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { createServer } = require('node:http');
const { createNewsletterAiService } = require('../functions/newsletter-ai-mcp.cjs');
const { createNewsletterOAuth } = require('../functions/newsletter-oauth.cjs');

const token = 'a'.repeat(43);
const admin = { uid: 'administrator', email: 'admin@example.org' };
const timestamp = time => ({ toMillis: () => time, toDate: () => new Date(time) });
class HttpsError extends Error {
    constructor(code, message) {
        super(message);
        this.code = code;
    }
}

async function run() {
    const store = new Map([
        ['newsletter_ai_access', new Map([[admin.uid, {
            hash: createHash('sha256').update(token).digest('hex'),
            expiresAt: timestamp(Date.now() + 60_000)
        }]])],
        ['newsletter_subscriptions', new Map([
            ['a', { email: 'first@example.org', name: 'Første Person', tags: ['HKD'] }],
            ['b', { email: 'FIRST@EXAMPLE.ORG', tags: ['hkd'] }],
            ['c', { email: 'second@example.org', segments: ['HKD'], tags: ['engelsk'] }],
            ['d', { email: 'unsub@example.org', tags: ['HKD'] }],
            ['e', { email: 'other@example.org', tags: ['HKD ekstra'] }]
        ])],
        ['hkd_newsletter_subscriptions', new Map([
            ['a', { email: 'hkd@example.org', segments: ['HKD Nyhetsbrev'], tags: ['engelsk'] }],
            ['b', { email: 'unsub@example.org', segments: ['HKD Nyhetsbrev'] }],
            ['c', { email: 'inactive@example.org', segments: ['HKD Nyhetsbrev'], status: 'unsubscribed' }]
        ])],
        ['contacts', new Map([
            ['a', { email: 'UNSUB@example.org', newsletterStatus: 'Avmeldt' }],
            ['b', { email: 'crm-only@example.org', tags: ['HKD'] }]
        ])]
    ]);
    let nextId = 0;
    let transactionTail = Promise.resolve();
    const db = {
        collection(name) {
            if (!store.has(name)) store.set(name, new Map());
            const collection = store.get(name);
            const docs = rows => [...rows].map(([id, value]) => ({ id, data: () => value }));
            return {
                doc(id = String(++nextId).padStart(20, '0')) {
                    return {
                        id,
                        async get() { const value = collection.get(id); return { id, data: () => value }; },
                        async create(value) {
                            assert.ok(!collection.has(id));
                            collection.set(id, value);
                        },
                        async update(update) { collection.set(id, { ...collection.get(id), ...update }); },
                        async set(value) { collection.set(id, value); },
                        async delete() { collection.delete(id); }
                    };
                },
                select: () => ({ get: async () => ({ docs: docs(collection) }) }),
                where: (field, operator, value) => ({
                    limit: () => ({ get: async () => ({ docs: docs([...collection].filter(([, row]) => row[field] === value)) }) })
                })
            };
        },
        runTransaction(callback) {
            const result = transactionTail.then(() => callback({
                get: ref => ref.get(), update: (ref, value) => ref.update(value), create: (ref, value) => ref.create(value),
                set: (ref, value) => ref.set(value), delete: ref => ref.delete()
            }));
            transactionTail = result.catch(() => {});
            return result;
        }
    };
    const common = {
        db, HttpsError,
        Timestamp: { fromMillis: timestamp, now: () => timestamp(Date.now()) },
        endpoint: 'https://example.org/newsletterMcp',
        requireNewsletterAdmin: async uid => { assert.equal(uid, admin.uid); return admin; }
    };
    const oauth = createNewsletterOAuth(common);
    const service = createNewsletterAiService({
        ...common, oauth, unsubscribePage: 'https://example.org/avmeld',
        buildImportedNewsletterCampaign: (account, template, subject, { recipients }) => {
            if (!recipients.length) throw new HttpsError('invalid-argument', 'Ingen mottakere.');
            return { subject, html: template.html, recipientCount: recipients.length, recipients, status: 'queued' };
        }
    });
    const server = createServer(async (req, res) => {
        const chunks = [];
        for await (const chunk of req) chunks.push(chunk);
        if (chunks.length) req.body = JSON.parse(Buffer.concat(chunks));
        const requestUrl = new URL(req.url, 'http://localhost');
        req.path = requestUrl.pathname;
        req.query = Object.fromEntries(requestUrl.searchParams);
        req.get = name => req.headers[name.toLowerCase()];
        res.set = (name, value) => { res.setHeader(name, value); return res; };
        res.status = code => { res.statusCode = code; return res; };
        res.redirect = (code, target) => { res.statusCode = code; res.setHeader('Location', target); res.end(); };
        res.json = result => {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(result));
        };
        await service.handleMcp(req, res);
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const base = `http://127.0.0.1:${server.address().port}`;

    function post(path, payload, authenticate = true, access = token) {
        return fetch(base + path, {
            method: 'POST',
            headers: {
                Accept: 'application/json, text/event-stream',
                'Content-Type': 'application/json',
                ...(authenticate ? { Authorization: 'Bearer ' + access } : {})
            },
            body: JSON.stringify(payload)
        });
    }

    try {
        const openapi = await (await fetch(base + '/openapi.json')).json();
        assert.equal(openapi.paths['/actions/queue_newsletter'].post['x-openai-isConsequential'], true);
        assert.equal((await post('/actions/prepare_newsletter', {}, false)).status, 401);
        const handshake = await post('/', {
            jsonrpc: '2.0', id: 1, method: 'initialize',
            params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'test', version: '1' } }
        });
        assert.equal((await handshake.json()).result.serverInfo.name, 'HKM nyhetsbrev');
        const list = await post('/', { jsonrpc: '2.0', id: 2, method: 'tools/list' });
        assert.deepEqual((await list.json()).result.tools.map(tool => tool.name), ['prepare_newsletter', 'queue_newsletter', 'newsletter_status']);
        const prepared = await post('/', {
            jsonrpc: '2.0', id: 3, method: 'tools/call',
            params: { name: 'prepare_newsletter', arguments: { subject: 'Prøve', html: '<p>Hei {{fornavn}}</p>', group: 'HKD' } }
        });
        const result = (await prepared.json()).result.structuredContent;
        const hkd = await post('/actions/prepare_newsletter', {
            subject: 'HKD test', html: '<p>Hei</p>', group: 'HKD Nyhetsbrev'
        });
        const hkdReview = await hkd.json();
        assert.equal(hkdReview.count, 1);
        assert.equal(hkdReview.englishCount, 1);
        assert.equal(store.get('newsletter_campaigns')?.size || 0, 0);
        assert.equal(result.count, 2);
        assert.equal(result.englishCount, 1);
        assert.ok(result.warnings.includes('unsubscribe'));
        assert.doesNotMatch(JSON.stringify(result), /example\.org/);
        await assert.rejects(service.review({ uid: 'other' }, result.reviewId, true), { code: 'not-found' });
        const queue = expectedCount => post('/actions/queue_newsletter', { reviewId: result.reviewId, expectedCount });
        assert.equal((await queue(2)).status, 409);
        assert.equal((await service.review(admin, result.reviewId, false)).approved, false);
        assert.equal((await service.review(admin, result.reviewId, true)).approved, true);
        assert.equal((await queue(3)).status, 409);

        // A replacement with the same count still requires a new review.
        const subscriptions = store.get('newsletter_subscriptions');
        const original = subscriptions.get('c');
        subscriptions.set('c', { ...original, email: 'changed@example.org' });
        assert.equal((await queue(2)).status, 409);
        subscriptions.set('c', original);
        const simultaneous = await Promise.all([queue(2), queue(2)]);
        assert.ok(simultaneous.every(response => response.ok));
        const confirmations = await Promise.all(simultaneous.map(response => response.json()));
        assert.equal(confirmations[0].campaignId, confirmations[1].campaignId);
        assert.equal(store.get('newsletter_campaigns').size, 1);
        const status = await post('/actions/newsletter_status', { reviewId: result.reviewId });
        assert.equal((await status.json()).status, 'queued');

        const challenged = await post('/', {}, false);
        assert.match(challenged.headers.get('www-authenticate'), /resource_metadata/);
        const metadata = await (await fetch(base + '/oauth/metadata')).json();
        assert.deepEqual(metadata.code_challenge_methods_supported, ['S256']);
        const redirect = 'https://claude.ai/api/mcp/auth_callback';
        assert.equal((await post('/oauth/register', { redirect_uris: ['https://evil.example/callback'] }, false)).status, 400);
        const registration = await (await post('/oauth/register', { redirect_uris: [redirect], token_endpoint_auth_method: 'none' }, false)).json();
        const verifier = 'a'.repeat(43);
        const query = new URLSearchParams({
            response_type: 'code', client_id: registration.client_id, redirect_uri: redirect,
            code_challenge: createHash('sha256').update(verifier).digest('base64url'),
            code_challenge_method: 'S256', state: 'opaque-state', resource: common.endpoint
        });
        const authorize = await fetch(base + '/oauth/authorize?' + query, { redirect: 'manual' });
        assert.equal(authorize.status, 303);
        const requestId = new URL(authorize.headers.get('location')).searchParams.get('aiOAuth');
        assert.equal((await oauth.consent(admin, requestId)).email, admin.email);
        const approved = new URL((await oauth.consent(admin, requestId, 'allow')).redirect);
        assert.equal(approved.searchParams.get('state'), 'opaque-state');
        await assert.rejects(oauth.consent(admin, requestId, 'allow'), { code: 'failed-precondition' });
        const codeInput = {
            grant_type: 'authorization_code', client_id: registration.client_id, redirect_uri: redirect,
            code: approved.searchParams.get('code'), code_verifier: verifier, resource: common.endpoint
        };
        assert.equal((await post('/oauth/token', { ...codeInput, code_verifier: 'b'.repeat(43) }, false)).status, 400);
        assert.equal((await post('/oauth/token', { ...codeInput, resource: 'https://evil.example' }, false)).status, 400);
        const oauthTokens = await (await post('/oauth/token', codeInput, false)).json();
        assert.equal((await post('/oauth/token', codeInput, false)).status, 400);
        assert.equal((await oauth.connection(admin, false)).connected, true);
        const oauthList = await post('/', { jsonrpc: '2.0', id: 4, method: 'tools/list' }, true, oauthTokens.access_token);
        assert.equal((await oauthList.json()).result.tools.length, 3);
        assert.equal((await post('/actions/newsletter_status', { reviewId: result.reviewId }, true, oauthTokens.access_token)).status, 401);
        const refreshInput = {
            grant_type: 'refresh_token', client_id: registration.client_id,
            refresh_token: oauthTokens.refresh_token, resource: common.endpoint
        };
        const refreshed = await (await post('/oauth/token', refreshInput, false)).json();
        assert.notEqual(refreshed.refresh_token, oauthTokens.refresh_token);
        assert.equal((await post('/oauth/token', refreshInput, false)).status, 400);
        await oauth.connection(admin, true);
        assert.equal((await post('/', {}, true, refreshed.access_token)).status, 401);
        assert.equal((await post('/oauth/token', { ...refreshInput, refresh_token: refreshed.refresh_token }, false)).status, 400);

    } finally {
        await new Promise(resolve => server.close(resolve));
    }
}

run().then(() => console.log('Passed: MCP transport, GPT Actions, audience eligibility, approval, changed audience, idempotent queueing, OAuth PKCE, refresh rotation and revocation.'))
    .catch(error => { console.error(error); process.exitCode = 1; });
