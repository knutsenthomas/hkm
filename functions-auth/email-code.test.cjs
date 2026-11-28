'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { sendCode, verifyCode, MAX_ATTEMPTS } = require('./email-code.cjs');

function deps() {
  const store = new Map(); const sent = [];
  const d = {
    pepper: 'p', from: 'HKM <post@x>', clock: 1_000_000, sent,
    now: () => d.clock,
    ipAllowed: () => true,
    storeCode: async (key, hash, now) => { const old = store.get(key); const sends = (old?.sends || 0) + 1; if (sends > 5) return false; store.set(key, { hash, expiresAt: now + 600_000, attempts: 0, sends }); return true; },
    checkCode: async (key, hash, now) => {
      const data = store.get(key);
      if (!data?.hash || data.expiresAt < now) return 'expired';
      if (data.attempts >= MAX_ATTEMPTS) return 'locked';
      if (data.hash !== hash) { data.attempts++; return 'wrong'; }
      delete data.hash; return 'ok';
    },
    send: async mail => { sent.push(mail); },
    signInLink: async email => `https://example.test/link?email=${email}`,
  };
  return d;
}
const codeFrom = mail => mail.text.match(/\b(\d{6})\b/)[1];

test('the emailed code gives a sign-in link once', async () => {
  const d = deps();
  await sendCode({ email: ' Ola@Example.no ', ip: '1' }, d);
  const code = codeFrom(d.sent[0]);
  assert.equal(d.sent[0].to, 'ola@example.no');
  assert.match((await verifyCode({ email: 'ola@example.no', code }, d)).link, /email=ola@example.no/);
  await assert.rejects(verifyCode({ email: 'ola@example.no', code }, d), /feil eller har gått ut/);
});

test('wrong codes lock after five tries, and codes expire', async () => {
  const d = deps();
  await sendCode({ email: 'a@b.no', ip: '1' }, d);
  const code = codeFrom(d.sent[0]);
  const wrongCode = code === '000000' ? '111111' : '000000';
  for (let i = 0; i < MAX_ATTEMPTS; i++) await assert.rejects(verifyCode({ email: 'a@b.no', code: wrongCode }, d));
  await assert.rejects(verifyCode({ email: 'a@b.no', code }, d), err => err.status === 429);
  await sendCode({ email: 'c@d.no', ip: '1' }, d);
  d.clock += 11 * 60_000;
  await assert.rejects(verifyCode({ email: 'c@d.no', code: codeFrom(d.sent[1]) }, d), err => err.status === 400);
});

test('invalid input and too many codes are refused', async () => {
  const d = deps();
  await assert.rejects(sendCode({ email: 'ikke-epost', ip: '1' }, d), err => err.status === 400);
  for (let i = 0; i < 5; i++) await sendCode({ email: 'x@y.no', ip: '1' }, d);
  await assert.rejects(sendCode({ email: 'x@y.no', ip: '1' }, d), err => err.status === 429);
  await assert.rejects(verifyCode({ email: 'x@y.no', code: '12' }, d), err => err.status === 400);
});
