const { createHash } = require('node:crypto');
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StreamableHTTPServerTransport } = require('@modelcontextprotocol/sdk/server/streamableHttp.js');
const { z } = require('zod');
const { CSP, sanitizeImportedNewsletter, renderImportedNewsletter } = require('./newsletter-html.cjs');
const { isHkdNewsletterGroup, loadNewsletterAudience, audienceSummary, audienceFingerprint } = require('./newsletter-ai-review.cjs');

const reviewPage = 'https://www.hiskingdomministry.no/admin/admin-nyhetsbrev.html';
const reviewIdPattern = /^[A-Za-z0-9]{20}$/;

function createNewsletterAiService({ db, Timestamp, HttpsError, requireNewsletterAdmin, buildImportedNewsletterCampaign, unsubscribePage, endpoint, oauth }) {
  function reviewRef(id) {
    if (typeof id !== 'string' || !reviewIdPattern.test(id)) throw new HttpsError('invalid-argument', 'Ugyldig kontroll-ID.');
    return db.collection('newsletter_ai_reviews').doc(id);
  }

  function ownedReview(snapshot, account) {
    const review = snapshot.data();
    if (review?.owner !== account.uid) throw new HttpsError('not-found', 'Fant ikke utsendingskontrollen.');
    return review;
  }

  function checkExpiry(review) {
    if (review.expiresAt.toMillis() <= Date.now()) {
      throw new HttpsError('failed-precondition', 'Kontrollen har utløpt. Opprett en ny kontroll.');
    }
  }

  async function checkAudience(review) {
    const recipients = await loadNewsletterAudience(db, review.group);
    if (audienceFingerprint(recipients) !== review.fingerprint) {
      throw new HttpsError('failed-precondition', 'Mottakerlisten er endret. Opprett en ny kontroll før utsending.');
    }
    return recipients;
  }

  async function prepare(account, { subject, html, group }) {
    const template = sanitizeImportedNewsletter(html);
    const recipients = await loadNewsletterAudience(db, group);
    buildImportedNewsletterCampaign(account, template, subject, { recipients });
    const expiresAt = Timestamp.fromMillis(Date.now() + 30 * 60_000);
    const ref = db.collection('newsletter_ai_reviews').doc();
    const summary = audienceSummary(recipients);
    await ref.create({
      owner: account.uid, subject, group, html: template.html, warnings: template.warnings,
      fingerprint: audienceFingerprint(recipients), summary, expiresAt
    });
    return {
      reviewId: ref.id, subject, group, ...summary, warnings: template.warnings,
      previewUrl: `${reviewPage}?aiReview=${ref.id}`, expiresAt: expiresAt.toDate().toISOString(),
      status: 'awaiting_admin_approval'
    };
  }

  async function review(account, id, approve) {
    const ref = reviewRef(id);
    const saved = ownedReview(await ref.get(), account);
    checkExpiry(saved);
    if (approve && !saved.approvedAt && !saved.campaignId) {
      await checkAudience(saved);
      await db.runTransaction(async transaction => {
        const current = ownedReview(await transaction.get(ref), account);
        checkExpiry(current);
        if (!current.approvedAt && !current.campaignId) transaction.update(ref, { approvedAt: Timestamp.now() });
      });
    }
    const template = sanitizeImportedNewsletter(saved.html);
    return {
      subject: saved.subject, group: saved.group, ...saved.summary, warnings: saved.warnings,
      approved: approve || Boolean(saved.approvedAt), queued: Boolean(saved.campaignId),
      csp: CSP,
      previewHtml: renderImportedNewsletter(template, {
        firstName: 'Ola', unsubscribeUrl: unsubscribePage, browserUrl: reviewPage, preview: true
      })
    };
  }

  async function queue(account, { reviewId, expectedCount }) {
    const ref = reviewRef(reviewId);
    const saved = ownedReview(await ref.get(), account);
    if (saved.summary.count !== expectedCount) throw new HttpsError('failed-precondition', 'Bekreftet antall stemmer ikke med kontrollen.');
    if (saved.campaignId) return { campaignId: saved.campaignId, count: expectedCount, status: 'queued' };
    checkExpiry(saved);
    if (!saved.approvedAt) throw new HttpsError('failed-precondition', 'Åpne forhåndsvisningen i admin HKM og godkjenn utsendingen først.');
    const recipients = await checkAudience(saved);
    const campaign = buildImportedNewsletterCampaign(account, sanitizeImportedNewsletter(saved.html), saved.subject, { recipients });
    if (isHkdNewsletterGroup(saved.group)) campaign.audienceGroup = 'HKD Nyhetsbrev';
    const campaignRef = db.collection('newsletter_campaigns').doc(ref.id);
    return db.runTransaction(async transaction => {
      const current = ownedReview(await transaction.get(ref), account);
      if (current.campaignId) return { campaignId: current.campaignId, count: expectedCount, status: 'queued' };
      checkExpiry(current);
      if (!current.approvedAt) throw new HttpsError('failed-precondition', 'Utsendingen mangler godkjenning.');
      transaction.create(campaignRef, campaign);
      transaction.update(ref, { campaignId: campaignRef.id });
      return { campaignId: campaignRef.id, count: expectedCount, status: 'queued' };
    });
  }

  async function status(account, { reviewId }) {
    const saved = ownedReview(await reviewRef(reviewId).get(), account);
    if (!saved.campaignId) {
      checkExpiry(saved);
      return { count: saved.summary.count, status: saved.approvedAt ? 'approved' : 'awaiting_admin_approval' };
    }
    const campaign = (await db.collection('newsletter_campaigns').doc(saved.campaignId).get()).data();
    if (!campaign) throw new HttpsError('not-found', 'Fant ikke kampanjen.');
    return {
      campaignId: saved.campaignId, count: campaign.recipientCount, sentCount: campaign.sentCount ?? null,
      status: campaign.dispatchStartedAt && !campaign.dispatchCompletedAt ? 'sending' : campaign.status
    };
  }

  const id = z.string().regex(reviewIdPattern);
  const tools = {
    prepare_newsletter: {
      description: 'Kontroller HTML og finn antall aktive abonnenter med den eksakte etiketten eller segmentet. For His Kingdom Designs, bruk gruppen «HKD Nyhetsbrev». Vis emne, gruppe, antall, advarsler og lenken til forhåndsvisning. Ingen utsending.',
      schema: z.object({
        subject: z.string().trim().min(1).max(300).regex(/^[^\r\n]+$/),
        html: z.string().min(1).max(400_000),
        group: z.string().trim().min(1).max(150)
      }),
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
      handler: prepare
    },
    queue_newsletter: {
      description: 'Legg godkjent nyhetsbrev i utsendingskøen. Bruk kun etter at brukeren har sett forhåndsvisningen, godkjent i admin HKM og bedt om utsending. expectedCount er det eksakte antallet som brukeren så.',
      schema: z.object({ reviewId: id, expectedCount: z.number().int().positive() }),
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
      handler: queue
    },
    newsletter_status: {
      description: 'Hent status og registrert antall sendt for en utsending fra denne tilkoblingen.',
      schema: z.object({ reviewId: id }),
      annotations: { readOnlyHint: true, openWorldHint: false },
      handler: status
    }
  };

  function publicError(error) {
    return error instanceof HttpsError ? error.message : 'Kunne ikke behandle nyhetsbrevet. Kontroller HTML og prøv igjen.';
  }

  function buildMcpServer(account) {
    const server = new McpServer({ name: 'HKM nyhetsbrev', version: '1.0.0' });
    for (const [name, { description, schema, annotations, handler }] of Object.entries(tools)) {
      server.registerTool(name, { description, inputSchema: schema.shape, annotations }, async input => {
        try {
          const result = await handler(account, input);
          return { content: [{ type: 'text', text: JSON.stringify(result) }], structuredContent: result };
        } catch (error) {
          return { isError: true, content: [{ type: 'text', text: publicError(error) }] };
        }
      });
    }
    return server;
  }

  function gptActionSchema() {
    const paths = Object.fromEntries(Object.entries(tools).map(([name, tool]) => {
      const { $schema, ...schema } = z.toJSONSchema(tool.schema, { target: 'openapi-3.0', io: 'input' });
      return [`/actions/${name}`, { post: {
        operationId: name,
        description: tool.description,
        'x-openai-isConsequential': tool.annotations.destructiveHint === true,
        requestBody: { required: true, content: { 'application/json': { schema } } },
        responses: {
          200: { description: 'Kontroll, utsendingsstatus eller bekreftet kølegging.' },
          409: { description: 'Kontrollen er ugyldig, utløpt eller mangler godkjenning.' }
        }
      } }];
    }));
    return {
      openapi: '3.1.0',
      info: { title: 'HKM nyhetsbrev', version: '1.0.0', description: 'Kontroller og send HTML-nyhetsbrev fra admin HKM.' },
      servers: [{ url: endpoint }],
      paths,
      security: [{ hkmKey: [] }],
      components: { securitySchemes: { hkmKey: { type: 'http', scheme: 'bearer' } } }
    };
  }

  async function handleMcp(req, res) {
    res.set('Cache-Control', 'no-store');
    const path = req.path.replace(/^\/newsletterMcp(?=\/|$)/, '');
    if (req.method === 'GET' && path === '/openapi.json') return res.json(gptActionSchema());
    if (path.startsWith('/oauth/') && oauth) return oauth.handle(req, res, path);
    const deny = () => res.set('WWW-Authenticate', oauth?.challenge || 'Bearer').status(401).end();
    const token = req.get('Authorization')?.match(/^Bearer ([A-Za-z0-9_-]{43})$/i)?.[1];
    if (!token) return deny();
    let account;
    try {
      if (oauth && !path.startsWith('/actions/')) account = await oauth.accountForToken(token);
      if (!account) {
        const hash = createHash('sha256').update(token).digest('hex');
        const keys = await db.collection('newsletter_ai_access').where('hash', '==', hash).limit(1).get();
        const key = keys.docs[0];
        if (!key || key.data().expiresAt.toMillis() <= Date.now()) return deny();
        account = await requireNewsletterAdmin(key.id);
      }
    } catch {
      return res.status(403).end();
    }
    if (req.method !== 'POST') return res.set('Allow', 'POST').status(405).end();
    if (path.startsWith('/actions/')) {
      const name = path.slice('/actions/'.length);
      const action = Object.hasOwn(tools, name) ? tools[name] : null;
      if (!action) return res.status(404).end();
      const input = action.schema.safeParse(req.body);
      if (!input.success) return res.status(400).json({ error: 'Kontroller parameterne for handlingen.' });
      try {
        return res.json(await action.handler(account, input.data));
      } catch (error) {
        const statusCode = error.code === 'not-found' ? 404 : error.code === 'failed-precondition' ? 409 : 400;
        return res.status(statusCode).json({ error: publicError(error) });
      }
    }
    if (path && path !== '/') return res.status(404).end();

    const server = buildMcpServer(account);
    const transport = new StreamableHTTPServerTransport({ enableJsonResponse: true });
    res.on('close', () => { void server.close(); });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  }

  return { review, handleMcp, buildMcpServer };
}

module.exports = { createNewsletterAiService };
