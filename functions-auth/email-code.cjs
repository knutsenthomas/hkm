'use strict';
// Innlogging med 6-sifret kode på e-post, felles for HKM-appen, Min side og HKPC-appen.
// 1. POST /send    { email, language }        -> sender en kode
// 2. POST /verify  { email, code, language }  -> { link }
// Koden lagres bare som hash (email_login_codes), gjelder i 10 minutter og tåler 5 feilforsøk.
// Når koden er riktig, lager serveren en vanlig Firebase-innloggingslenke som klienten
// bruker med signInWithEmailLink. Da er det en ordinær e-postinnlogging: tofaktor kreves
// som før, og innloggingsregelen (blockPasswordSignIn) ser den som e-postlenke.
const crypto = require('node:crypto');

const CODE_TTL_MS = 10 * 60_000;
const MAX_ATTEMPTS = 5;
const MAX_SENDS_PER_HOUR = 5;
const MAX_SENDS_PER_IP_PER_HOUR = 20;
const EMAIL_PATTERN = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;
// Lenken brukes aldri som adresse, men Firebase krever en godkjent adresse i den.
const CONTINUE_URL = 'https://www.hiskingdomministry.no/minside/login';

const ORIGINS = [
  'https://hiskingdomministry.no', 'https://www.hiskingdomministry.no', 'https://test.hiskingdomministry.no',
  'https://hkm-app-gamma.vercel.app', 'https://hkm-app-git-ny-app-thomas-knutsens-projects.vercel.app',
  'https://app.hkpc.no', 'https://hkm-community-app.vercel.app',
  'capacitor://localhost', 'https://localhost', 'http://localhost:3000', 'http://localhost:5173',
];

const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const normalize = value => (typeof value === 'string' ? value.trim().toLowerCase() : '');
const codeHash = (email, code, pepper) => sha(`${email}:${code}:${pepper}`);

const text = (english, no, en) => (english ? en : no);

function message(email, code, english, from) {
  const subject = text(english, `Din innloggingskode: ${code}`, `Your sign-in code: ${code}`);
  const intro = text(english, 'Bruk denne koden for å logge inn med HKM-kontoen din:', 'Use this code to sign in with your HKM account:');
  const note = text(english,
    'Koden gjelder i 10 minutter. Har du ikke bedt om den, kan du se bort fra denne e-posten.',
    'The code is valid for 10 minutes. If you did not ask for it, you can ignore this email.');
  return {
    from, to: email, subject,
    text: `${intro}\n\n${code}\n\n${note}\n\nHis Kingdom Ministry`,
    html: `<div style="font-family:Inter,-apple-system,Segoe UI,Helvetica,Arial,sans-serif;max-width:420px;margin:0 auto;padding:24px;color:#151a21;background:#f5f5ed">
<p style="margin:0 0 4px;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#cc712b">His Kingdom Ministry</p>
<p style="font-size:16px">${intro}</p>
<p style="font-size:32px;font-weight:700;letter-spacing:8px;margin:24px 0;color:#151a21">${code}</p>
<p style="font-size:13px;color:#555a64">${note}</p></div>`,
  };
}

class CodeError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

/** Sender en ny kode. deps: now, takeSendSlot(key, now) -> bool, saveCode(key, data), send(mail), ipAllowed(ip) */
async function sendCode({ email, language, ip }, deps) {
  const english = language === 'en';
  const address = normalize(email);
  if (!EMAIL_PATTERN.test(address) || address.length > 254) throw new CodeError(400, text(english, 'Skriv inn en gyldig e-postadresse.', 'Enter a valid email address.'));
  if (!deps.ipAllowed(ip)) throw new CodeError(429, text(english, 'For mange forsøk. Prøv igjen senere.', 'Too many attempts. Try again later.'));
  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
  const allowed = await deps.storeCode(sha(address), codeHash(address, code, deps.pepper), deps.now());
  if (!allowed) throw new CodeError(429, text(english, 'Du har bedt om for mange koder. Prøv igjen om en time.', 'Too many codes requested. Try again in an hour.'));
  await deps.send(message(address, code, english, deps.from));
  return { ok: true };
}

/** Sjekker koden og gir en engangs innloggingslenke. deps: checkCode(key, hash, now) -> 'ok'|'wrong'|'expired'|'locked', signInLink(email) */
async function verifyCode({ email, code, language }, deps) {
  const english = language === 'en';
  const wrong = text(english, 'Koden er feil eller har gått ut.', 'The code is wrong or has expired.');
  const address = normalize(email);
  const clean = typeof code === 'string' ? code.replace(/\s/g, '') : '';
  if (!EMAIL_PATTERN.test(address) || !/^\d{6}$/.test(clean)) throw new CodeError(400, wrong);
  const outcome = await deps.checkCode(sha(address), codeHash(address, clean, deps.pepper), deps.now());
  if (outcome === 'locked') throw new CodeError(429, text(english, 'For mange feil koder. Be om en ny kode.', 'Too many wrong codes. Request a new code.'));
  if (outcome !== 'ok') throw new CodeError(400, wrong);
  return { link: await deps.signInLink(address) };
}

function createHandler(deps) {
  return async (req, res) => {
    res.set('Cache-Control', 'no-store');
    const origin = req.headers.origin || '';
    if (ORIGINS.includes(origin)) {
      res.set('Access-Control-Allow-Origin', origin);
      res.set('Vary', 'Origin');
      res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.set('Access-Control-Allow-Headers', 'Content-Type');
      res.set('Access-Control-Max-Age', '600');
    }
    if (req.method === 'OPTIONS') { res.status(ORIGINS.includes(origin) ? 204 : 403).end(); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Metoden støttes ikke.' }); return; }
    const body = typeof req.body === 'object' && req.body ? req.body : {};
    const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
    try {
      if (req.path.endsWith('/send')) res.json(await sendCode({ email: body.email, language: body.language, ip: forwarded || req.ip || 'ukjent' }, deps));
      else if (req.path.endsWith('/verify')) res.json(await verifyCode({ email: body.email, code: body.code, language: body.language }, deps));
      else res.status(404).json({ error: 'Ukjent adresse.' });
    } catch (error) {
      if (error instanceof CodeError) { res.status(error.status).json({ error: error.message }); return; }
      // Logg aldri adressen, koden eller SMTP-detaljer.
      console.error('emailCode feilet:', error?.code || error?.name || 'error');
      res.status(500).json({ error: body.language === 'en' ? 'Something went wrong. Try again.' : 'Noe gikk galt. Prøv igjen.' });
    }
  };
}

const ipBuckets = new Map();
function ipAllowed(ip, now = Date.now()) {
  const bucket = ipBuckets.get(ip);
  const next = !bucket || bucket.until <= now ? { count: 1, until: now + 3_600_000 } : { count: bucket.count + 1, until: bucket.until };
  ipBuckets.set(ip, next);
  if (ipBuckets.size > 5000) for (const [k, b] of ipBuckets) if (b.until < now) ipBuckets.delete(k);
  return next.count <= MAX_SENDS_PER_IP_PER_HOUR;
}

function firestoreDeps({ auth, db }, { user, pass, pepper }) {
  const { FieldValue } = require('firebase-admin/firestore');
  const nodemailer = require('nodemailer');
  const codes = db.collection('email_login_codes');
  const transport = nodemailer.createTransport({
    host: 'smtp.gmail.com', port: 465, secure: true, connectionTimeout: 15_000, socketTimeout: 30_000, auth: { user, pass },
  });
  return {
    pepper,
    from: `"His Kingdom Ministry" <${user}>`,
    now: () => Date.now(),
    ipAllowed: ip => ipAllowed(ip),
    storeCode: (key, hash, now) => db.runTransaction(async tx => {
      const ref = codes.doc(key);
      const data = (await tx.get(ref)).data();
      const windowStart = data?.windowStart && now - data.windowStart < 3_600_000 ? data.windowStart : now;
      const sends = windowStart === data?.windowStart ? (data?.sends || 0) + 1 : 1;
      if (sends > MAX_SENDS_PER_HOUR) return false;
      tx.set(ref, { hash, expiresAt: now + CODE_TTL_MS, attempts: 0, windowStart, sends, updatedAt: FieldValue.serverTimestamp() });
      return true;
    }),
    checkCode: (key, hash, now) => db.runTransaction(async tx => {
      const ref = codes.doc(key);
      const data = (await tx.get(ref)).data();
      if (!data?.hash || !data.expiresAt || data.expiresAt < now) return 'expired';
      if ((data.attempts || 0) >= MAX_ATTEMPTS) return 'locked';
      const expected = Buffer.from(data.hash, 'hex');
      const actual = Buffer.from(hash, 'hex');
      if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) {
        tx.update(ref, { attempts: FieldValue.increment(1) });
        return 'wrong';
      }
      // Bare én bruk: koden fjernes så snart den er godtatt.
      tx.update(ref, { hash: FieldValue.delete(), expiresAt: FieldValue.delete(), attempts: 0 });
      return 'ok';
    }),
    signInLink: email => auth.generateSignInWithEmailLink(email, { url: CONTINUE_URL, handleCodeInApp: true }),
    send: async mail => {
      const result = await transport.sendMail(mail);
      if (!result.accepted?.length) throw new Error('SMTP_REJECTED');
    },
  };
}

module.exports = { sendCode, verifyCode, createHandler, firestoreDeps, CodeError, ORIGINS, MAX_ATTEMPTS };
