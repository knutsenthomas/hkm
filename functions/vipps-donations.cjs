'use strict';

// Donations uses merchant-level credentials, NOT the ePayment/Recurring keys.
const { createHash } = require('node:crypto');
const hash = value => createHash('sha256').update(value).digest('hex');
const phone = value => {
  const digits = String(value || '').replace(/[ +()-]/g, '');
  return /^[1-9]\d{7,14}$/.test(digits) ? `+${digits}` : null;
};
const email = value => String(value || '').trim().toLowerCase();

async function createApi({ clientId, clientSecret, fetchImpl = fetch }) {
  async function json(url, options) {
    const response = await fetchImpl(`https://api.vipps.no${url}`, {
      ...options, signal: AbortSignal.timeout(20000), redirect: 'error',
    });
    // Never include response bodies or request headers in errors/logs.
    if (!response.ok) throw new Error(`vipps-donations-http-${response.status}`);
    return response.json();
  }
  const token = await json('/miami/v1/token', {
    method: 'POST', headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
      'Vipps-System-Name': 'hiskingdomministry', 'Vipps-System-Version': '1.0.0',
    }, body: 'grant_type=client_credentials',
  });
  if (!token.access_token) throw new Error('vipps-donations-token-missing');
  return path => json(path, { headers: { Authorization: `Bearer ${token.access_token}` } });
}

async function findOwner(auth, payer = {}) {
  const candidates = new Set();
  async function lookup(method, value) {
    try {
      const user = await auth[method](value);
      if (!user.disabled && (method !== 'getUserByEmail' || user.emailVerified)) candidates.add(user.uid);
    } catch (error) { if (error.code !== 'auth/user-not-found') throw error; }
  }
  if (phone(payer.phoneNumber)) await lookup('getUserByPhoneNumber', phone(payer.phoneNumber));
  if (payer.emailVerified === true && email(payer.email)) await lookup('getUserByEmail', email(payer.email));
  // Conflicting verified identities must be reviewed, never guessed.
  return candidates.size === 1 ? [...candidates][0] : null;
}

function paymentRecord(payment, timestamp, fund) {
  const ore = Number(payment.amount);
  if (!payment.transactionReference || !payment.recipientHandle || payment.currency !== 'NOK' ||
      !Number.isSafeInteger(ore) || ore <= 0 || !Number.isFinite(Date.parse(payment.capturedAt))) {
    throw new Error('vipps-donations-invalid-payment');
  }
  const id = `vipps-donation-${hash(`${payment.recipientHandle}:${payment.transactionReference}`)}`;
  return { id, data: {
    transactionId: payment.transactionReference, provider: 'vipps_donations', method: 'vipps',
    amount: ore / 100, amountNok: ore / 100, currency: 'NOK', status: 'completed', type: 'Gave',
    fund, subscriptionId: payment.agreementId || null,
    donorName: String(payment.payer?.name || ''), timestamp,
    completedAt: timestamp, paidAt: payment.capturedAt,
    externalReference: String(payment.externalReference || ''),
  } };
}

async function importPayment({ db, auth, api, payment, Timestamp, funds }) {
  if (payment.recipientHandle !== 'NO:98843') throw new Error('vipps-donations-unexpected-recipient');
  // Only explicitly mapped campaign references change the accounting purpose.
  const fund = funds[payment.externalReference] || 'general';
  const record = paymentRecord(payment, Timestamp.fromDate(new Date(payment.capturedAt)), fund);
  let payer = payment.payer || {};
  if (payment.agreementId) {
    const agreement = await api(`/donations/v1/agreements/${encodeURIComponent(payment.agreementId)}`);
    if (agreement.id !== payment.agreementId || agreement.recipientHandle !== payment.recipientHandle) {
      throw new Error('vipps-donations-agreement-mismatch');
    }
    payer = { ...payer, ...agreement.payer };
  }
  const owner = await findOwner(auth, payer);
  const ref = db.collection('donations').doc(record.id);
  const privateRef = db.collection('vipps_donation_imports').doc(record.id);
  await db.runTransaction(async tx => {
    const previous = await tx.get(ref);
    if (previous.exists && previous.data().provider !== 'vipps_donations') throw new Error('donation-source-conflict');
    if (!previous.exists) tx.set(ref, { ...record.data, userId: owner });
    else if (!previous.data().userId && owner) tx.update(ref, { userId: owner });
    // No e-mail in public ledger: legacy email-based read rules must not expose these gifts.
    tx.set(privateRef, {
      donorPhone: phone(payer.phoneNumber), verifiedEmail: payer.emailVerified === true ? email(payer.email) : null,
      recipientHandle: payment.recipientHandle, agreementId: payment.agreementId || null,
      capturedAt: payment.capturedAt, updatedAt: Timestamp.now(),
    });
  });
  return record.id;
}

async function sync({ db, auth, api, Timestamp, now = new Date(), maxPages = 100 }) {
  const stateRef = db.collection('integration_state').doc('vipps_donations');
  const state = (await stateRef.get()).data() || {};
  // Overlap catches late records; stable transaction IDs make retries idempotent.
  let from = new Date(Math.max(Date.parse(state.cursor || '2026-10-01T00:00:00Z') - 86400000, 0)).toISOString();
  const to = now.toISOString();
  const funds = { hkm: 'general', hkpc: 'hkpc', ...(state.campaignFunds || {}) };
  const seen = new Set();
  let imported = 0;
  for (let page = 0; page < maxPages; page++) {
    const query = new URLSearchParams({ from, to, recipientHandles: 'NO:98843' });
    const result = await api(`/donations/v1/reports/payments?${query}`);
    if (!Array.isArray(result.payments)) throw new Error('vipps-donations-invalid-report');
    let fresh = 0, latest = from;
    for (const payment of result.payments) {
      const key = `${payment.recipientHandle}:${payment.transactionReference}`;
      if (seen.has(key)) continue;
      if (Date.parse(payment.capturedAt) < Date.parse(from) || Date.parse(payment.capturedAt) > Date.parse(to)) {
        throw new Error('vipps-donations-payment-outside-window');
      }
      // Comparing epoch milliseconds loses sub-millisecond precision. Keep the original timestamp.
      if (Date.parse(payment.capturedAt) >= Date.parse(latest)) latest = payment.capturedAt;
      await importPayment({ db, auth, api, payment, Timestamp, funds });
      seen.add(key); fresh++; imported++;
    }
    if (!fresh) {
      await stateRef.set({ cursor: to, lastSuccessAt: Timestamp.now(), lastImported: imported }, { merge: true });
      return { imported };
    }
    from = latest;
  }
  // Never advance the durable cursor past an incomplete import.
  throw new Error('vipps-donations-page-limit');
}

async function linkOwnDonations({ db, auth, user }) {
  if (user.disabled) throw new Error('account-disabled');
  const queries = [];
  if (phone(user.phoneNumber)) queries.push(db.collection('vipps_donation_imports').where('donorPhone', '==', phone(user.phoneNumber)).get());
  if (user.emailVerified && user.email) queries.push(db.collection('vipps_donation_imports').where('verifiedEmail', '==', email(user.email)).get());
  const records = new Map();
  for (const snap of await Promise.all(queries)) for (const doc of snap.docs) records.set(doc.id, doc);
  let linked = 0;
  for (const [id, source] of records) {
    const identity = source.data();
    const owner = await findOwner(auth, { phoneNumber: identity.donorPhone, email: identity.verifiedEmail, emailVerified: !!identity.verifiedEmail });
    if (owner !== user.uid) continue;
    await db.runTransaction(async tx => {
      const ref = db.collection('donations').doc(id), gift = await tx.get(ref);
      if (gift.exists && gift.data().provider === 'vipps_donations' && !gift.data().userId) {
        tx.update(ref, { userId: user.uid }); linked++;
      }
    });
  }
  return { linked };
}

module.exports = { createApi, findOwner, paymentRecord, importPayment, sync, linkOwnDonations, phone };
