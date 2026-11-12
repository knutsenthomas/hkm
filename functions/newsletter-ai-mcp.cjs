const { createHash } = require('node:crypto');
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StreamableHTTPServerTransport } = require('@modelcontextprotocol/sdk/server/streamableHttp.js');
const { z } = require('zod');
const { CSP, sanitizeImportedNewsletter, renderImportedNewsletter } = require('./newsletter-html.cjs');
const { isHkdNewsletterGroup, loadNewsletterAudience, audienceSummary, audienceFingerprint } = require('./newsletter-ai-review.cjs');

const reviewPage = 'https://www.hiskingdomministry.no/admin/admin-nyhetsbrev.html';
const reviewIdPattern = /^[A-Za-z0-9]{20}$/;

function createNewsletterAiService({ db, Timestamp, HttpsError, requireNewsletterAdmin, buildImportedNewsletterCampaign, unsubscribePage, endpoint, oauth, sendReviewTest }) {
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

  function buildReviewedCampaign(account, saved, recipients) {
    const template = sanitizeImportedNewsletter(saved.html);
    const campaign = buildImportedNewsletterCampaign(account, template, saved.subject, { recipients });
    if (saved.summary.englishCount && (!saved.subjectEn || !saved.htmlEn)) {
      throw new HttpsError('failed-precondition', `Gruppen har ${saved.summary.englishCount} engelske mottakere. Legg ved engelsk emne og oversatt HTML.`);
    }
    if (saved.htmlEn) {
      campaign.subjectEn = saved.subjectEn;
      campaign.htmlBodyEn = saved.htmlEn;
    }
    if (Buffer.byteLength(JSON.stringify(campaign), 'utf8') > 380_000) {
      throw new HttpsError('invalid-argument', 'De to HTML-versjonene og mottakerlisten er for store for én utsending.');
    }
    if (isHkdNewsletterGroup(saved.group)) campaign.audienceGroup = 'HKD Nyhetsbrev';
    return campaign;
  }

  async function prepare(account, { subject, html, group, subjectEn, htmlEn }) {
    if (Boolean(subjectEn) !== Boolean(htmlEn)) {
      throw new HttpsError('invalid-argument', 'Legg ved både engelsk emne og engelsk HTML.');
    }
    const template = sanitizeImportedNewsletter(html);
    const englishTemplate = htmlEn ? sanitizeImportedNewsletter(htmlEn) : null;
    const recipients = await loadNewsletterAudience(db, group);
    const summary = audienceSummary(recipients);
    const draft = { subject, group, html: template.html, summary };
    if (englishTemplate) {
      draft.subjectEn = subjectEn;
      draft.htmlEn = englishTemplate.html;
    }
    buildReviewedCampaign(account, draft, recipients);
    const expiresAt = Timestamp.fromMillis(Date.now() + 30 * 60_000);
    const ref = db.collection('newsletter_ai_reviews').doc();
    const warnings = [...new Set([...template.warnings, ...(englishTemplate?.warnings || [])])];
    await ref.create({
      ...draft, owner: account.uid, warnings, fingerprint: audienceFingerprint(recipients), expiresAt
    });
    return {
      reviewId: ref.id, subject, group, ...(subjectEn ? { subjectEn } : {}), ...summary, warnings,
      previewUrl: `${reviewPage}?aiReview=${ref.id}`, expiresAt: expiresAt.toDate().toISOString(),
      status: 'awaiting_admin_approval'
    };
  }

  async function review(account, id, approve) {
    const ref = reviewRef(id);
    const saved = ownedReview(await ref.get(), account);
    checkExpiry(saved);
    if (approve && !saved.approvedAt && !saved.campaignId) {
      const recipients = await checkAudience(saved);
      buildReviewedCampaign(account, saved, recipients);
      await db.runTransaction(async transaction => {
        const current = ownedReview(await transaction.get(ref), account);
        checkExpiry(current);
        if (!current.approvedAt && !current.campaignId) transaction.update(ref, { approvedAt: Timestamp.now() });
      });
    }
    const preview = (html, language) => renderImportedNewsletter(sanitizeImportedNewsletter(html), {
      firstName: 'Ola', unsubscribeUrl: unsubscribePage, browserUrl: reviewPage, preview: true, language
    });
    return {
      subject: saved.subject, group: saved.group, ...saved.summary, warnings: saved.warnings,
      approved: approve || Boolean(saved.approvedAt), queued: Boolean(saved.campaignId),
      csp: CSP, previewHtml: preview(saved.html, 'no'),
      ...(saved.htmlEn ? { subjectEn: saved.subjectEn, previewHtmlEn: preview(saved.htmlEn, 'en') } : {})
    };
  }

  async function testReview(account, { reviewId, email: address, language } = {}) {
    const email = typeof address === 'string' ? address.trim().toLowerCase() : '';
    if (email.length > 254 || !/^[^\s@<>,;:"()\\]+@[^\s@<>,;:"()\\]+\.[^\s@<>,;:"()\\]+$/.test(email)) {
      throw new HttpsError('invalid-argument', 'Skriv inn én gyldig e-postadresse.');
    }
    if (!['no', 'en'].includes(language)) throw new HttpsError('invalid-argument', 'Velg norsk eller engelsk.');
    const saved = ownedReview(await reviewRef(reviewId).get(), account);
    checkExpiry(saved);
    const html = language === 'en' ? saved.htmlEn : saved.html;
    const subject = language === 'en' ? saved.subjectEn : saved.subject;
    if (!html || !subject) throw new HttpsError('failed-precondition', 'Denne språkversjonen er ikke tilgjengelig.');
    await sendReviewTest({ email, language, subject, template: sanitizeImportedNewsletter(html) });
    return { email, language };
  }

  async function queue(account, { reviewId, expectedCount }) {
    const ref = reviewRef(reviewId);
    const saved = ownedReview(await ref.get(), account);
    if (saved.summary.count !== expectedCount) throw new HttpsError('failed-precondition', 'Bekreftet antall stemmer ikke med kontrollen.');
    if (saved.campaignId) return { campaignId: saved.campaignId, count: expectedCount, status: 'queued' };
    checkExpiry(saved);
    if (!saved.approvedAt) throw new HttpsError('failed-precondition', 'Åpne forhåndsvisningen i admin HKM og godkjenn utsendingen først.');
    const recipients = await checkAudience(saved);
    const campaign = buildReviewedCampaign(account, saved, recipients);
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
  const subjectField = z.string().trim().min(1).max(300).regex(/^[^\r\n]+$/);
  const htmlField = z.string().min(1).max(400_000);
  const tools = {
    prepare_newsletter: {
      description: 'Kontroller HTML og finn antall aktive abonnenter med den eksakte etiketten eller segmentet. For His Kingdom Designs, bruk gruppen «HKD Nyhetsbrev». Oversett emnet og hele HTML-innholdet til engelsk for engelske mottakere, og behold flettefeltene. Vis emne, gruppe, antall, advarsler og lenken til forhåndsvisning. Ingen utsending.',
      schema: z.object({
        subject: subjectField,
        html: htmlField,
        subjectEn: subjectField.optional().describe('Engelsk emne, påkrevd ved engelske mottakere.'),
        htmlEn: htmlField.optional().describe('Engelsk oversettelse av hele HTML-brevet, påkrevd ved engelske mottakere.'),
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

  return { review, testReview, handleMcp, buildMcpServer };
}

module.exports = { createNewsletterAiService };
