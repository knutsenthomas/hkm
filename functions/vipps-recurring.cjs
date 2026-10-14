const { createHash, randomBytes } = require('node:crypto');
const { returnUrl } = require('./recurring-payments.cjs');
const { addMonths } = require('./school-payment-plan.cjs');
const fail = (message, status = 400) => Object.assign(new Error(message), { status });
const MSN = '1174856';
const hash = value => createHash('sha256').update(value).digest('hex');
function agreementBody(details, input, token) {
  const redirect = returnUrl(input.returnUrl);
  redirect.searchParams.set('agreement_key', details.key);
  redirect.searchParams.set('request_id', details.requestId);
  redirect.searchParams.set('recurring_provider', 'vipps');
  if (input.language === 'en') redirect.searchParams.set('lang', 'en');
  const manage = new URL('https://www.hiskingdomministry.no/vipps-avtale.html');
  if (input.language === 'en') manage.searchParams.set('lang', 'en');
  manage.searchParams.set('key', details.key); manage.searchParams.set('token', token);
  return {
    pricing: { type: 'LEGACY', amount: Math.round(details.amount * 100), currency: 'NOK' },
    interval: { unit: 'MONTH', count: 1 },
    productName: details.gift ? (details.metadata.fund === 'hkpc' ? 'Fast gave til HKPC' : 'Fast gave til His Kingdom Ministry') : `HKPC ${details.year} – 10 skoleterminer`,
    productDescription: details.gift ? 'Månedlig gave frem til avtalen avsluttes. Første trekk tidligst to dager etter godkjenning.' : `10 månedlige trekk à ${details.amount} kr. Første trekk tidligst to dager etter godkjenning.`,
    merchantRedirectUrl: redirect.href, merchantAgreementUrl: manage.href,
  };
}
async function createAgreement({ details, input, db, api, timestamp }) {
  // Validate URLs before reserving a school plan or contacting the payment provider.
  const manageToken = randomBytes(24).toString('hex');
  const payload = agreementBody(details, input, manageToken);
  const ref = db.collection('recurring_payment_agreements').doc(details.key);
  const record = await db.runTransaction(async tx => {
    const snap = await tx.get(ref);
    let plan;
    if (!details.gift) plan = await tx.get(db.collection('school_payment_plans').doc(details.key));
    if (snap.exists) {
      const old = snap.data();
      if (old.provider !== 'vipps' || old.requestId !== details.requestId || old.amount !== details.amount || old.metadata?.fund !== details.metadata.fund) throw fail('agreement-already-started', 409);
      if (!['creating', 'pending'].includes(old.status)) throw fail('agreement-already-started', 409);
      return old;
    }
    if (plan?.exists) throw fail('school-plan-exists', 409);
    const next = { ...details, provider: 'vipps', msn: MSN, status: 'creating', timestamp, manageTokenHash: hash(manageToken), agreementPayload: payload, chargeCount: 0 };
    tx.set(ref, next);
    if (!details.gift) tx.set(db.collection('school_payment_plans').doc(details.key), { ...next, schoolYear: details.year, reference: details.metadata.reference, total: details.amount * 10, instalments: 10 });
    return next;
  });
  if (record.agreementId && record.redirectUrl) return { redirectUrl: record.redirectUrl, agreementId: record.agreementId };
  // The stable UUID makes a timed-out API call safe to retry without a second agreement.
  const result = await api('/agreements', 'POST', record.agreementPayload, details.requestId);
  if (!/^agr_[a-zA-Z0-9_-]+$/.test(result.agreementId || '')) throw fail('invalid-vipps-agreement', 502);
  const url = new URL(result.vippsConfirmationUrl);
  if (url.protocol !== 'https:' || !/(^|\.)vipps\.no$|(^|\.)vippsmobilepay\.com$/.test(url.hostname)) throw fail('invalid-vipps-redirect', 502);
  await ref.set({ agreementId: result.agreementId, subscriptionId: result.agreementId, redirectUrl: url.href, status: 'pending' }, { merge: true });
  if (!details.gift) await db.collection('school_payment_plans').doc(details.key).set({ agreementId: result.agreementId, subscriptionId: result.agreementId, schoolYear: details.year, status: 'pending' }, { merge: true });
  return { redirectUrl: url.href, agreementId: result.agreementId };
}
function dueDate(anchor, cycle) { return new Date(addMonths(Math.floor(anchor / 1000), cycle) * 1000).toISOString().slice(0, 10); }
async function reconcile({ ref, record, db, api, timestamp, now = Date.now(), schedule = false }) {
  const agreement = await api(`/agreements/${encodeURIComponent(record.agreementId)}`, 'GET');
  if (agreement.id !== record.agreementId || agreement.pricing?.currency !== 'NOK' || agreement.pricing?.amount !== Math.round(record.amount * 100)) throw fail('unexpected-vipps-agreement', 409);
  const status = String(agreement.status || '');
  const anchor = record.anchor || (Date.parse(agreement.start) + 2 * 86400000);
  if (status === 'ACTIVE' && !Number.isFinite(anchor)) throw fail('missing-vipps-start', 502);
  await ref.set({ status: record.status === 'completed' && status === 'STOPPED' ? 'completed' : status.toLowerCase(), lastCheckedAt: now, ...(status === 'ACTIVE' ? { anchor } : {}) }, { merge: true });
  if (!record.gift) await db.collection('school_payment_plans').doc(ref.id).set({ schoolYear: record.year, subscriptionId: record.agreementId, status: record.status === 'completed' && status === 'STOPPED' ? 'completed' : status.toLowerCase(), agreementId: record.agreementId }, { merge: true });
  const charges = await ref.collection('charges').get();
  let allPaid = charges.size > 0;
  for (const chargeDoc of charges.docs) {
    const saved = chargeDoc.data();
    if (!saved.chargeId) { allPaid = false; continue; }
    const charge = await api(`/agreements/${encodeURIComponent(record.agreementId)}/charges/${encodeURIComponent(saved.chargeId)}`, 'GET');
    if (charge.id !== saved.chargeId || charge.amount !== saved.amountOre) throw fail('unexpected-vipps-charge', 409);
    await chargeDoc.ref.set({ status: charge.status, checkedAt: now }, { merge: true });
    const refunded = Number(charge.summary?.refunded || 0);
    if (!['CHARGED','REFUNDED'].includes(charge.status) || charge.summary?.captured !== saved.amountOre || !Number.isInteger(refunded) || refunded < 0 || refunded > saved.amountOre) { allPaid = false; continue; }
    const netOre = saved.amountOre - refunded;
    if (refunded) allPaid = false;
    const transactionId = `vipps-${MSN}-${saved.chargeId}`;
    const ledger = db.collection('donations').doc(transactionId);
    await db.runTransaction(async tx => {
      const previous = await tx.get(ledger);
      if (previous.exists && previous.data().amountNok === netOre / 100 && previous.data().status === (netOre ? 'completed' : 'refunded')) return;
      tx.set(ledger, { transactionId, subscriptionId: record.agreementId, agreementKey: ref.id, amount: netOre / 100, amountNok: netOre / 100, originalAmount: saved.amountOre / 100, refundedAmount: refunded / 100, currency: 'NOK', status: netOre ? 'completed' : 'refunded', method: 'vipps_recurring', donorName: record.name, donorEmail: record.email, userId: record.centralUid || null, fund: record.metadata.fund, type: record.metadata.type, courseId: record.metadata.course_id || null, courseTitle: record.metadata.course_title || null, schoolYear: record.year || null, registrationAmount: Number(record.metadata.registration_per_month || 0), message: record.metadata.message || '', timestamp: previous.exists ? previous.data().timestamp : timestamp, completedAt: previous.exists ? previous.data().completedAt : timestamp });
    });
  }
  if (status !== 'ACTIVE' || !schedule) return { status, paid: allPaid };
  const incomplete = charges.docs.find(doc => !doc.data().chargeId);
  if (!record.gift && charges.size >= 10 && !incomplete) {
    if (allPaid) { await api(`/agreements/${encodeURIComponent(record.agreementId)}`, 'PATCH', { status: 'STOPPED' }, hash(`stop:${ref.id}`).slice(0, 36)); await ref.set({ status: 'completed' }, { merge: true }); await db.collection('school_payment_plans').doc(ref.id).set({ status: 'completed' }, { merge: true }); }
    return { status: allPaid ? 'COMPLETED' : 'ACTIVE', paid: allPaid };
  }
  // Never stack unpaid monthly charges, catch up several months at once, or exceed ten school charges.
  if (charges.size && !allPaid && !incomplete) return { status, paid: false };
  const next = incomplete ? incomplete.data().cycle : charges.size;
  const originalDue = dueDate(anchor, next);
  const minimumDue = new Date(now + 2 * 86400000).toISOString().slice(0, 10);
  const due = originalDue < minimumDue ? minimumDue : originalDue;
  if (!incomplete && Date.parse(due) > now + 30 * 86400000) return { status, paid: allPaid };
  const chargeRef = ref.collection('charges').doc(String(next));
  const planned = await db.runTransaction(async tx => {
    const snap = await tx.get(chargeRef);
    if (snap.exists) return snap.data();
    const fresh = await tx.get(ref);
    if (fresh.data().status !== 'active') throw fail('agreement-not-active', 409);
    const data = { cycle: next, amountOre: Math.round(record.amount * 100), due, orderId: `hkm-${ref.id.slice(0, 24)}-${next}`, status: 'creating' };
    tx.set(chargeRef, data); return data;
  });
  if (!planned.chargeId) {
    const response = await api(`/agreements/${encodeURIComponent(record.agreementId)}/charges`, 'POST', { amount: planned.amountOre, due: planned.due, transactionType: 'DIRECT_CAPTURE', retryDays: 3, orderId: planned.orderId, description: record.gift ? 'Månedlig gave' : `Skoletermin ${next + 1} av 10` }, hash(`${ref.id}:${next}`).slice(0, 36));
    if (response.chargeId !== planned.orderId) throw fail('invalid-vipps-charge', 502);
    await chargeRef.set({ chargeId: response.chargeId, status: 'PENDING' }, { merge: true });
  }
  return { status, paid: allPaid };
}
module.exports = { MSN, agreementBody, createAgreement, reconcile, dueDate, hash };
