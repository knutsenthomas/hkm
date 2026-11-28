'use strict';
// HKM accounts sign in without passwords: an email link, Google or Apple.
// Firebase keeps passwords and email links under one provider, so the provider
// stays enabled and these blocking functions refuse the password method itself.
const { beforeUserCreated, beforeUserSignedIn, HttpsError } = require('firebase-functions/v2/identity');
const { onCall, onRequest } = require('firebase-functions/v2/https');
const { createHandler: createAppSsoHandler, firestoreDeps: appSsoDeps } = require('./app-sso.cjs');

const PASSWORD_MESSAGE = 'Innlogging med passord er slått av. Bruk kode på e-post, Google eller Apple.';

/** True when Firebase reports the email/password method (not an email link). */
function usesPassword(event) {
  const method = event?.credential?.signInMethod || String(event?.eventType || '').split(':').pop();
  return method === 'password';
}

/** True when the account has a second factor, so this event completes a sign-in that already passed its first step. */
function completesSecondFactor(event) {
  return (event?.data?.multiFactor?.enrolledFactors || []).length > 0;
}

// Firebase checks the first step (link, Google, Apple or password) before it asks for the
// code, and checks again when the code is accepted. The second check reports the email
// provider as "password" even after an email link, so it must not be refused: a real
// password sign-in was already stopped at the first step.
function rejectPassword(event) {
  if (usesPassword(event) && !completesSecondFactor(event)) throw new HttpsError('permission-denied', PASSWORD_MESSAGE);
}

const blockPasswordSignUp = beforeUserCreated({ region: 'us-central1', maxInstances: 10 }, rejectPassword);
const blockPasswordSignIn = beforeUserSignedIn({ region: 'us-central1', maxInstances: 10 }, rejectPassword);

const ADMIN_ROLES = ['admin', 'superadmin'];

/**
 * Removes every second factor from an account, for a member who lost their phone.
 * The member sets up a new factor at their next sign-in. Only an administrator who
 * signed in with a second factor can do this, and only a superadmin can reset another admin.
 */
async function resetSecondFactorHandler({ auth, data }, deps) {
  if (!auth) throw new HttpsError('unauthenticated', 'Logg inn først.');
  if (!auth.token?.firebase?.sign_in_second_factor) throw new HttpsError('permission-denied', 'Logg inn med tofaktor først.');
  const uid = typeof data?.uid === 'string' ? data.uid.trim() : '';
  if (!/^[A-Za-z0-9]{1,128}$/.test(uid)) throw new HttpsError('invalid-argument', 'Ugyldig bruker.');
  if (uid === auth.uid) throw new HttpsError('failed-precondition', 'Du kan ikke nullstille din egen tofaktor. Be en annen administrator.');
  const [callerRole, targetRole] = await Promise.all([deps.roleOf(auth.uid), deps.roleOf(uid)]);
  if (!ADMIN_ROLES.includes(callerRole)) throw new HttpsError('permission-denied', 'Krever administratortilgang.');
  if (ADMIN_ROLES.includes(targetRole) && callerRole !== 'superadmin') {
    throw new HttpsError('permission-denied', 'Bare en superadmin kan nullstille tofaktor for en administrator.');
  }
  await deps.clearFactors(uid);
  deps.log({ action: 'reset-second-factor', by: auth.uid, target: uid });
  return { ok: true };
}

// firebase-admin 14 har ikke lenger admin.apps/admin.auth(); bruk de modulære inngangene.
function adminServices() {
  const { getApps, initializeApp } = require('firebase-admin/app');
  const app = getApps()[0] || initializeApp();
  return {
    auth: require('firebase-admin/auth').getAuth(app),
    db: require('firebase-admin/firestore').getFirestore(app),
  };
}

function adminDeps() {
  const { auth, db } = adminServices();
  return {
    roleOf: async uid => (await db.collection('users').doc(uid).get()).get('role') || null,
    clearFactors: async uid => {
      await auth.updateUser(uid, { multiFactor: { enrolledFactors: null } });
      await auth.revokeRefreshTokens(uid);
    },
    log: entry => console.log(JSON.stringify(entry)),
  };
}

const resetSecondFactor = onCall({ region: 'us-central1', maxInstances: 5 }, request => resetSecondFactorHandler(request, adminDeps()));

// Innlogging i HKM-appen via Min side (se app-sso.cjs).
let appSsoHandler;
const appSso = onRequest({ region: 'us-central1', maxInstances: 3, concurrency: 20, timeoutSeconds: 20, invoker: 'public' }, (req, res) => {
  if (!appSsoHandler) {
    appSsoHandler = createAppSsoHandler(appSsoDeps(adminServices()));
  }
  return appSsoHandler(req, res);
});

// E-postkoden ligger i communitySso (hkp-community-app/functions-sso), felles for alle HKM-apper.

module.exports = {
  appSso,
  usesPassword, completesSecondFactor, rejectPassword, blockPasswordSignUp, blockPasswordSignIn, PASSWORD_MESSAGE,
  resetSecondFactorHandler, resetSecondFactor,
};
