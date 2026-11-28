'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { usesPassword, rejectPassword } = require('./index.cjs');

const event = (method, credential) => ({
  eventType: `providers/cloud.auth/eventTypes/user.beforeSignIn:${method}`,
  ...(credential ? { credential } : {}),
});

test('password sign-in and sign-up are refused', () => {
  assert.equal(usesPassword(event('password')), true);
  assert.equal(usesPassword({ eventType: 'providers/cloud.auth/eventTypes/user.beforeCreate:password' }), true);
  assert.throws(() => rejectPassword(event('password')), /passord er slått av/);
});

test('email link, Google and Apple are allowed', () => {
  for (const method of ['emailLink', 'google.com', 'apple.com']) {
    assert.equal(usesPassword(event(method)), false, method);
    assert.doesNotThrow(() => rejectPassword(event(method)));
  }
  assert.equal(usesPassword(event('emailLink', { providerId: 'password', signInMethod: 'emailLink' })), false);
});

test('events without a method are allowed', () => {
  assert.equal(usesPassword({ eventType: 'providers/cloud.auth/eventTypes/user.beforeSignIn' }), false);
});

const { resetSecondFactorHandler } = require('./index.cjs');

function deps(roles) {
  const calls = { cleared: [], logged: [] };
  return {
    calls,
    roleOf: async uid => roles[uid] || null,
    clearFactors: async uid => { calls.cleared.push(uid); },
    log: entry => calls.logged.push(entry),
  };
}
const adminAuth = (uid, mfa = true) => ({ uid, token: { firebase: mfa ? { sign_in_second_factor: 'totp' } : {} } });

test('an admin with a second-factor session resets a member', async () => {
  const d = deps({ admin1: 'admin', member1: 'medlem' });
  assert.deepEqual(await resetSecondFactorHandler({ auth: adminAuth('admin1'), data: { uid: 'member1' } }, d), { ok: true });
  assert.deepEqual(d.calls.cleared, ['member1']);
  assert.equal(d.calls.logged[0].by, 'admin1');
});

test('reset is refused without a second-factor session, for non-admins, for oneself and for admins by admins', async () => {
  const d = deps({ admin1: 'admin', admin2: 'admin', member1: 'medlem', member2: 'medlem', boss: 'superadmin' });
  const expectCode = async (request, code) => assert.rejects(resetSecondFactorHandler(request, d), err => err.code === code);
  await expectCode({ data: { uid: 'member1' } }, 'unauthenticated');
  await expectCode({ auth: adminAuth('admin1', false), data: { uid: 'member1' } }, 'permission-denied');
  await expectCode({ auth: adminAuth('member2'), data: { uid: 'member1' } }, 'permission-denied');
  await expectCode({ auth: adminAuth('admin1'), data: { uid: 'admin1' } }, 'failed-precondition');
  await expectCode({ auth: adminAuth('admin1'), data: { uid: 'admin2' } }, 'permission-denied');
  await expectCode({ auth: adminAuth('admin1'), data: { uid: '../x' } }, 'invalid-argument');
  assert.deepEqual(d.calls.cleared, []);
  await resetSecondFactorHandler({ auth: adminAuth('boss'), data: { uid: 'admin2' } }, d);
  assert.deepEqual(d.calls.cleared, ['admin2']);
});

test('completing a second factor after an email link is allowed', () => {
  const finish = { eventType: 'providers/cloud.auth/eventTypes/user.beforeSignIn:password', data: { multiFactor: { enrolledFactors: [{ uid: 'f1', factorId: 'totp' }] } } };
  assert.doesNotThrow(() => rejectPassword(finish));
});

test('a password sign-in without a second factor is still refused', () => {
  const plain = { eventType: 'providers/cloud.auth/eventTypes/user.beforeSignIn:password', data: { multiFactor: { enrolledFactors: [] } } };
  assert.throws(() => rejectPassword(plain), /passord er slått av/);
});
