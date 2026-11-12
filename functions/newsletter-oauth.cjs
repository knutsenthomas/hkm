const { createHash, randomBytes } = require('node:crypto');

const ISSUER = 'https://hiskingdomministry.no';
const SCOPE = 'newsletter';
const CALLBACKS = [
  'https://claude.ai/api/mcp/auth_callback',
  'https://claude.com/api/mcp/auth_callback'
];
const CLIENT = 'hkm-claude';
const ACCESS_SECONDS = 3600;
const REFRESH_MS = 90 * 86400_000;
const digest = value => createHash('sha256').update(value).digest('base64url');
const randomToken = () => randomBytes(32).toString('base64url');
const tokenPattern = /^[A-Za-z0-9_-]{43}$/;
const requestPattern = /^[A-Za-z0-9]{20}$/;
const verifierPattern = /^[A-Za-z0-9._~-]{43,128}$/;

function createNewsletterOAuth({ db, Timestamp, HttpsError, endpoint, requireNewsletterAdmin }) {
  const requests = db.collection('newsletter_oauth_requests');
  const grants = db.collection('newsletter_oauth_grants');
  const tokens = db.collection('newsletter_oauth_tokens');
  const protectedMetadata = `${endpoint}/oauth/resource`;
  const challenge = `Bearer resource_metadata="${protectedMetadata}", scope="${SCOPE}"`;
  const validResource = value => value === undefined || value === endpoint;
  const nowPlus = ms => Timestamp.fromMillis(Date.now() + ms);
  const active = record => record?.expiresAt?.toMillis() > Date.now();

  function tokenRef(value) {
    return tokens.doc(digest(value));
  }

  function issue(transaction, { uid, generation }) {
    const access = randomToken();
    const refresh = randomToken();
    transaction.create(tokenRef(access), { kind: 'access', uid, generation, expiresAt: nowPlus(ACCESS_SECONDS * 1000) });
    transaction.create(tokenRef(refresh), { kind: 'refresh', uid, generation, expiresAt: nowPlus(REFRESH_MS) });
    return { access_token: access, token_type: 'Bearer', expires_in: ACCESS_SECONDS, refresh_token: refresh, scope: SCOPE };
  }

  async function consent(account, requestId, decision) {
    if (typeof requestId !== 'string' || !requestPattern.test(requestId)) throw new HttpsError('invalid-argument', 'Ugyldig Claude-tilkobling.');
    const ref = requests.doc(requestId);
    if (!decision) {
      const request = (await ref.get()).data();
      if (!active(request) || request.used) throw new HttpsError('failed-precondition', 'Tilkoblingsforsøket har utløpt. Start på nytt i Claude.');
      return { client: 'Claude', email: account.email };
    }
    return db.runTransaction(async transaction => {
      const request = (await transaction.get(ref)).data();
      if (!active(request) || request.used) throw new HttpsError('failed-precondition', 'Tilkoblingsforsøket har utløpt. Start på nytt i Claude.');
      const redirect = new URL(request.redirect);
      redirect.searchParams.set('state', request.state);
      transaction.update(ref, { used: true });
      if (decision === 'deny') {
        redirect.searchParams.set('error', 'access_denied');
      } else {
        const code = randomToken();
        const generation = randomToken();
        transaction.set(grants.doc(account.uid), { generation, expiresAt: nowPlus(120_000), connected: false });
        transaction.create(tokenRef(code), {
          kind: 'code', uid: account.uid, generation, redirect: request.redirect,
          pkce: request.pkce, expiresAt: nowPlus(120_000)
        });
        redirect.searchParams.set('code', code);
      }
      return { redirect: redirect.toString() };
    });
  }

  async function accountForToken(value) {
    if (!tokenPattern.test(value || '')) return null;
    const token = (await tokenRef(value).get()).data();
    if (token?.kind !== 'access' || !active(token)) return null;
    const grant = (await grants.doc(token.uid).get()).data();
    if (grant?.generation !== token.generation || !active(grant)) return null;
    return requireNewsletterAdmin(token.uid);
  }

  async function connection(account, revoke) {
    const ref = grants.doc(account.uid);
    if (revoke) {
      await ref.delete();
      return { connected: false };
    }
    const grant = (await ref.get()).data();
    return { connected: grant?.connected === true && active(grant) };
  }

  async function handle(req, res, path) {
    res.set('Cache-Control', 'no-store');
    const body = req.body || {};
    const query = req.query || {};
    const error = (code, status = 400) => res.status(status).json({ error: code });
    if (req.method === 'GET' && path === '/oauth/resource') {
      return res.json({ resource: endpoint, authorization_servers: [ISSUER], scopes_supported: [SCOPE], bearer_methods_supported: ['header'] });
    }
    if (req.method === 'GET' && path === '/oauth/metadata') {
      return res.json({
        issuer: ISSUER,
        authorization_endpoint: `${endpoint}/oauth/authorize`,
        token_endpoint: `${endpoint}/oauth/token`,
        registration_endpoint: `${endpoint}/oauth/register`,
        scopes_supported: [SCOPE],
        response_types_supported: ['code'],
        grant_types_supported: ['authorization_code', 'refresh_token'],
        code_challenge_methods_supported: ['S256'],
        token_endpoint_auth_methods_supported: ['none']
      });
    }
    if (req.method === 'POST' && path === '/oauth/register') {
      const redirects = body.redirect_uris;
      if (!Array.isArray(redirects) || !redirects.length || redirects.some(uri => !CALLBACKS.includes(uri))) {
        return error('invalid_redirect_uri');
      }
      if (body.token_endpoint_auth_method && body.token_endpoint_auth_method !== 'none') return error('invalid_client_metadata');
      // Claude uses a single public client. PKCE binds each code to its own attempt.
      return res.status(201).json({
        client_id: CLIENT, client_name: 'Claude', redirect_uris: redirects,
        token_endpoint_auth_method: 'none', response_types: ['code'],
        grant_types: ['authorization_code', 'refresh_token'], scope: SCOPE
      });
    }
    if (req.method === 'GET' && path === '/oauth/authorize') {
      if (query.client_id !== CLIENT || !CALLBACKS.includes(query.redirect_uri)) return error('invalid_client');
      if (query.response_type !== 'code' || query.code_challenge_method !== 'S256' ||
          typeof query.code_challenge !== 'string' || !tokenPattern.test(query.code_challenge) ||
          typeof query.state !== 'string' || !query.state || query.state.length > 2048 ||
          !validResource(query.resource)) return error('invalid_request');
      if (query.scope !== undefined && query.scope !== '' && query.scope !== SCOPE) return error('invalid_scope');
      const ref = requests.doc();
      await ref.create({ redirect: query.redirect_uri, pkce: query.code_challenge, state: query.state, expiresAt: nowPlus(10 * 60_000) });
      return res.redirect(303, `${ISSUER}/admin/admin-nyhetsbrev?aiOAuth=${ref.id}`);
    }
    if (req.method === 'POST' && path === '/oauth/token') {
      if (body.client_id !== CLIENT) return error('invalid_client', 401);
      if (!validResource(body.resource)) return error('invalid_target');
      const codeGrant = body.grant_type === 'authorization_code';
      if (!codeGrant && body.grant_type !== 'refresh_token') return error('unsupported_grant_type');
      if (!codeGrant && body.scope !== undefined && body.scope !== '' && body.scope !== SCOPE) return error('invalid_scope');
      const value = codeGrant ? body.code : body.refresh_token;
      if (typeof value !== 'string' || !tokenPattern.test(value)) return error('invalid_grant');
      const ref = tokenRef(value);
      const record = (await ref.get()).data();
      if (!record || !active(record)) return error('invalid_grant');
      try { await requireNewsletterAdmin(record.uid); } catch { return error('invalid_grant'); }
      const result = await db.runTransaction(async transaction => {
        const token = (await transaction.get(ref)).data();
        if (!active(token)) return null;
        const grantRef = grants.doc(token.uid);
        const grant = (await transaction.get(grantRef)).data();
        if (codeGrant) {
          if (token.kind !== 'code' || grant?.generation !== token.generation || !active(grant) ||
              token.redirect !== body.redirect_uri ||
              typeof body.code_verifier !== 'string' || !verifierPattern.test(body.code_verifier) ||
              digest(body.code_verifier) !== token.pkce) return null;
          transaction.update(grantRef, { expiresAt: nowPlus(REFRESH_MS), connected: true });
          transaction.delete(ref);
          return issue(transaction, token);
        }
        if (token.kind !== 'refresh' || grant?.generation !== token.generation || !active(grant)) return null;
        transaction.delete(ref);
        transaction.update(grantRef, { expiresAt: nowPlus(REFRESH_MS) });
        return issue(transaction, token);
      });
      return result ? res.json(result) : error('invalid_grant');
    }
    return res.status(404).end();
  }

  return { challenge, handle, accountForToken, consent, connection };
}

module.exports = { createNewsletterOAuth };
