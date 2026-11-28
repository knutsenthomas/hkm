'use strict';
// Innlogging i HKM-appen via Min side, på samme måte som Community.
// 1. Min side (hiskingdomministry.no/minside/app) er logget inn med tofaktor og kaller
//    /authorize med brukerens ID-token og en PKCE-utfordring. Den får en engangskode.
// 2. Appen mottar koden i adressen og kaller /exchange med koden og sin hemmelige
//    verifier. Den får en innloggingsnøkkel (custom token) for samme HKM-konto.
// Koden gjelder i 2 minutter, kan bare brukes én gang og er verdiløs uten verifier.
const crypto = require('node:crypto');

const CODE_TTL_MS = 2 * 60_000;
const OPAQUE = /^[A-Za-z0-9_-]{43}$/;

// Sider som kan be om en kode (Min side), og apper som kan veksle den inn.
const SITE_ORIGINS = ['https://hiskingdomministry.no', 'https://www.hiskingdomministry.no', 'https://test.hiskingdomministry.no'];
const APP_ORIGINS = [
  'https://hkm-app-gamma.vercel.app',
  'https://hkm-app-git-ny-app-thomas-knutsens-projects.vercel.app',
  'capacitor://localhost',
  'https://localhost',
];

const base64url = buffer => Buffer.from(buffer).toString('base64').replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
const sha256 = value => crypto.createHash('sha256').update(value).digest();
const codeKey = code => base64url(sha256('hkm-app-sso:' + code));

class SsoError extends Error {
  constructor(status, code) { super(code); this.status = status; this.code = code; }
}

/** Min side: gir en engangskode til en økt som er fullført med tofaktor. */
async function authorize({ idToken, challenge }, deps) {
  if (!OPAQUE.test(challenge || '')) throw new SsoError(400, 'invalid-request');
  if (!idToken) throw new SsoError(401, 'invalid-session');
  const identity = await deps.verifyIdToken(idToken).catch(() => null);
  if (!identity) throw new SsoError(401, 'invalid-session');
  if (!identity.firebase?.sign_in_second_factor) throw new SsoError(403, 'mfa-required');
  const code = base64url(crypto.randomBytes(32));
  await deps.saveCode(codeKey(code), { uid: identity.uid, challenge, expiresAt: deps.now() + CODE_TTL_MS });
  return { code };
}

/** Appen: veksler kode + verifier inn i en innloggingsnøkkel. */
async function exchange({ code, verifier }, deps) {
  if (!OPAQUE.test(code || '') || !OPAQUE.test(verifier || '')) throw new SsoError(400, 'invalid-request');
  const saved = await deps.takeCode(codeKey(code)); // henter og sletter i én transaksjon
  if (!saved || saved.expiresAt < deps.now()) throw new SsoError(400, 'invalid-code');
  const expected = Buffer.from(saved.challenge);
  const actual = Buffer.from(base64url(sha256(verifier)));
  if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) throw new SsoError(400, 'invalid-code');
  // hkm_mfa forteller appen at kontoen logget inn med tofaktor på Min side.
  const customToken = await deps.createCustomToken(saved.uid, { hkm_mfa: true });
  return { customToken };
}

function allowCors(req, res) {
  const origin = req.headers.origin || '';
  const path = req.path || '';
  const allowed = path.endsWith('/authorize') ? SITE_ORIGINS : path.endsWith('/exchange') ? APP_ORIGINS : [];
  if (allowed.includes(origin)) {
    res.set('Access-Control-Allow-Origin', origin);
    res.set('Vary', 'Origin');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    res.set('Access-Control-Max-Age', '600');
  }
  return allowed.includes(origin);
}

function createHandler(deps) {
  return async (req, res) => {
    res.set('Cache-Control', 'no-store');
    const corsOk = allowCors(req, res);
    if (req.method === 'OPTIONS') { res.status(corsOk ? 204 : 403).end(); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'method-not-allowed' }); return; }
    try {
      const body = typeof req.body === 'object' && req.body ? req.body : {};
      if (req.path.endsWith('/authorize')) {
        const idToken = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
        res.json(await authorize({ idToken, challenge: body.challenge }, deps));
      } else if (req.path.endsWith('/exchange')) {
        res.json(await exchange({ code: body.code, verifier: body.verifier }, deps));
      } else {
        res.status(404).json({ error: 'not-found' });
      }
    } catch (error) {
      if (error instanceof SsoError) { res.status(error.status).json({ error: error.code }); return; }
      console.error('appSso feilet:', error);
      res.status(500).json({ error: 'server-error' });
    }
  };
}

function firestoreDeps({ auth, db }) {
  const codes = db.collection('app_sso_codes');
  return {
    now: () => Date.now(),
    verifyIdToken: token => auth.verifyIdToken(token, true),
    saveCode: (key, value) => codes.doc(key).set(value),
    takeCode: key => db.runTransaction(async tx => {
      const ref = codes.doc(key);
      const snap = await tx.get(ref);
      if (!snap.exists) return null;
      tx.delete(ref);
      return snap.data();
    }),
    createCustomToken: (uid, claims) => auth.createCustomToken(uid, claims),
  };
}

module.exports = { authorize, exchange, createHandler, firestoreDeps, SsoError, codeKey, SITE_ORIGINS, APP_ORIGINS };
