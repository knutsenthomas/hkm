'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { authorize, exchange } = require('./app-sso.cjs');

const b64 = buf => Buffer.from(buf).toString('base64').replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
const pkce = () => { const verifier = b64(crypto.randomBytes(32)); return { verifier, challenge: b64(crypto.createHash('sha256').update(verifier).digest()) }; };

function deps(identity, now = 1_000_000) {
  const store = new Map();
  const d = {
    clock: now,
    now: () => d.clock,
    verifyIdToken: async token => { if (token !== 'good') throw new Error('bad'); return identity; },
    saveCode: async (k, v) => { store.set(k, v); },
    takeCode: async k => { const v = store.get(k) || null; store.delete(k); return v; },
    createCustomToken: async (uid, claims) => `token:${uid}:${JSON.stringify(claims)}`,
  };
  return d;
}
const mfaUser = { uid: 'u1', firebase: { sign_in_second_factor: 'totp' } };

test('a two-factor session gets a code that the app exchanges once', async () => {
  const d = deps(mfaUser); const { verifier, challenge } = pkce();
  const { code } = await authorize({ idToken: 'good', challenge }, d);
  assert.equal((await exchange({ code, verifier }, d)).customToken, 'token:u1:{"hkm_mfa":true}');
  await assert.rejects(exchange({ code, verifier }, d), err => err.code === 'invalid-code');
});

test('a session without a second factor gets no code', async () => {
  const d = deps({ uid: 'u1', firebase: {} });
  await assert.rejects(authorize({ idToken: 'good', challenge: pkce().challenge }, d), err => err.code === 'mfa-required');
  await assert.rejects(authorize({ idToken: 'bad', challenge: pkce().challenge }, d), err => err.code === 'invalid-session');
});

test('the code needs the right verifier and expires', async () => {
  const d = deps(mfaUser); const one = pkce(); const other = pkce();
  const { code } = await authorize({ idToken: 'good', challenge: one.challenge }, d);
  await assert.rejects(exchange({ code, verifier: other.verifier }, d), err => err.code === 'invalid-code');
  const second = await authorize({ idToken: 'good', challenge: one.challenge }, d);
  d.clock += 3 * 60_000;
  await assert.rejects(exchange({ code: second.code, verifier: one.verifier }, d), err => err.code === 'invalid-code');
});
