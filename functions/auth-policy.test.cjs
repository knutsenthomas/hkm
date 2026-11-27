'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { usesPassword, rejectPassword } = require('./auth-policy.cjs');

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
