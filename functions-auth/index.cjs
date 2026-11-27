'use strict';
// HKM accounts sign in without passwords: an email link, Google or Apple.
// Firebase keeps passwords and email links under one provider, so the provider
// stays enabled and these blocking functions refuse the password method itself.
const { beforeUserCreated, beforeUserSignedIn, HttpsError } = require('firebase-functions/v2/identity');

const PASSWORD_MESSAGE = 'Innlogging med passord er slått av. Bruk innloggingslenke på e-post, Google eller Apple.';

/** True when Firebase reports the email/password method (not an email link). */
function usesPassword(event) {
  const method = event?.credential?.signInMethod || String(event?.eventType || '').split(':').pop();
  return method === 'password';
}

function rejectPassword(event) {
  if (usesPassword(event)) throw new HttpsError('permission-denied', PASSWORD_MESSAGE);
}

const blockPasswordSignUp = beforeUserCreated({ region: 'us-central1', maxInstances: 10 }, rejectPassword);
const blockPasswordSignIn = beforeUserSignedIn({ region: 'us-central1', maxInstances: 10 }, rejectPassword);

module.exports = { usesPassword, rejectPassword, blockPasswordSignUp, blockPasswordSignIn, PASSWORD_MESSAGE };
