const { createHash } = require('node:crypto');
const { validatePlan } = require('./school-payment-plan.cjs');
const fail = (message, status = 400) => Object.assign(new Error(message), { status });
function returnUrl(value) {
  const url = new URL(value);
  if (!['https://hkpc.no', 'https://www.hkpc.no', 'https://hiskingdomministry.no', 'https://www.hiskingdomministry.no', 'http://localhost:3014'].includes(url.origin)) throw fail('invalid-return-url');
  url.search = ''; url.hash = '';
  return url;
}
function validateRecurring(input) {
  if (input.gift !== true) return { ...validatePlan(input), amount: 1000, cycles: 10, gift: false };
  const name = String(input.customerDetails?.name || '').trim();
  const email = String(input.customerDetails?.email || '').trim().toLowerCase();
  const amount = Number(input.amount);
  const requestId = String(input.requestId || '');
  if (!name || name.length > 120 || email.length > 254 || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email) || !Number.isFinite(amount) || amount < 1 || amount > 100000 || Math.abs(amount * 100 - Math.round(amount * 100)) > 0.000001 || !/^[a-f0-9-]{36}$/i.test(requestId) || input.consent !== true) throw fail('invalid-recurring-gift');
  const fund = input.customerDetails?.fund === 'hkpc' ? 'hkpc' : 'general';
  const key = createHash('sha256').update(`gift|${requestId}`).digest('hex');
  const metadata = { donor_plan: 'monthly_gift', plan_key: key, customer_name: name, customer_email: email, fund, type: 'Fast giver', message: String(input.customerDetails?.message || '').slice(0, 500) };
  return { name, email, amount, requestId, key, metadata, cycles: 0, gift: true };
}
function paypalPlan(details, productId) {
  return {
    product_id: productId, name: details.gift ? 'Fast gave til His Kingdom Ministry' : 'HKPC – 10 månedlige skoleterminer', status: 'ACTIVE',
    billing_cycles: [{ frequency: { interval_unit: 'MONTH', interval_count: 1 }, tenure_type: 'REGULAR', sequence: 1, total_cycles: details.cycles, pricing_scheme: { fixed_price: { value: details.amount.toFixed(2), currency_code: 'NOK' } } }],
    payment_preferences: { auto_bill_outstanding: true, payment_failure_threshold: 3 },
  };
}
async function createStripeGift({ details, stripe, db, timestamp }) {
  const ref = db.collection('recurring_payment_agreements').doc(details.key);
  const record = await db.runTransaction(async tx => {
    const snap = await tx.get(ref);
    if (snap.exists) {
      const data = snap.data();
      if (data.email !== details.email || data.name !== details.name || data.amount !== details.amount || data.fund !== details.metadata.fund) throw fail('agreement-already-started', 409);
      return data;
    }
    const data = { provider: 'stripe', requestId: details.requestId, email: details.email, name: details.name, amount: details.amount, fund: details.metadata.fund, status: 'creating', timestamp };
    tx.set(ref, data); return data;
  });
  let subscription;
  if (record.subscriptionId) subscription = await stripe.subscriptions.retrieve(record.subscriptionId, { expand: ['latest_invoice.payment_intent'] });
  else {
    const customer = await stripe.customers.create({ name: details.name, email: details.email }, { idempotencyKey: `gift-customer-${details.requestId}` });
    const price = await stripe.prices.create({ unit_amount: Math.round(details.amount * 100), currency: 'nok', recurring: { interval: 'month' }, product_data: { name: 'Fast gave til His Kingdom Ministry' } }, { idempotencyKey: `gift-price-${details.requestId}` });
    subscription = await stripe.subscriptions.create({ customer: customer.id, items: [{ price: price.id }], payment_behavior: 'default_incomplete', payment_settings: { payment_method_types: ['card'], save_default_payment_method: 'on_subscription' }, metadata: details.metadata, expand: ['latest_invoice.payment_intent'] }, { idempotencyKey: `gift-sub-${details.requestId}` });
    await ref.set({ subscriptionId: subscription.id }, { merge: true });
  }
  if (subscription.status !== 'incomplete') throw fail('agreement-already-started', 409);
  const intent = subscription.latest_invoice?.payment_intent;
  if (!intent?.client_secret) throw fail('agreement-not-payable', 409);
  await stripe.paymentIntents.update(intent.id, { metadata: { ...details.metadata, subscription_id: subscription.id }, receipt_email: details.email });
  await ref.set({ status: 'pending' }, { merge: true });
  return { clientSecret: intent.client_secret, subscriptionId: subscription.id };
}
async function createPayPalAgreement({ details, input, db, api, productId, timestamp }) {
  const url = returnUrl(input.returnUrl);
  const ref = db.collection('recurring_payment_agreements').doc(details.key);
  const record = await db.runTransaction(async tx => {
    const snap = await tx.get(ref);
    if (snap.exists) {
      const data = snap.data();
      if (data.provider !== 'paypal' || data.requestId !== details.requestId || data.name !== details.name || data.amount !== details.amount || data.email !== details.email) throw fail('agreement-already-started', 409);
      return data;
    }
    const data = { provider: 'paypal', requestId: details.requestId, name: details.name, email: details.email, amount: details.amount, metadata: details.metadata, cycles: details.cycles, status: 'creating', timestamp };
    tx.set(ref, data); return data;
  });
  let planId = record.planId;
  if (!planId) {
    const plan = await api('/v1/billing/plans', 'POST', paypalPlan(details, productId), `plan-${details.requestId}`);
    planId = plan.id; await ref.set({ planId }, { merge: true });
  }
  url.searchParams.set('recurring_provider', 'paypal'); url.searchParams.set('agreement_key', details.key); url.searchParams.set('request_id', details.requestId);
  const cancel = new URL(url); cancel.searchParams.set('cancelled', '1');
  const subscription = record.subscriptionId ? await api(`/v1/billing/subscriptions/${record.subscriptionId}`, 'GET') : await api('/v1/billing/subscriptions', 'POST', {
    plan_id: planId, custom_id: details.key, subscriber: { email_address: details.email },
    application_context: { brand_name: 'His Kingdom Ministry', shipping_preference: 'NO_SHIPPING', user_action: 'SUBSCRIBE_NOW', return_url: url.href, cancel_url: cancel.href },
  }, `sub-${details.requestId}`);
  if (subscription.status !== 'APPROVAL_PENDING') throw fail('agreement-already-started', 409);
  const redirectUrl = subscription.links?.find(link => link.rel === 'approve')?.href;
  if (!redirectUrl) throw fail('missing-paypal-approval', 502);
  await ref.set({ subscriptionId: subscription.id, status: 'pending' }, { merge: true });
  return { redirectUrl, subscriptionId: subscription.id };
}
async function reconcilePayPalAgreement({ ref, record, api, timestamp, now = new Date() }) {
  const subscription = await api(`/v1/billing/subscriptions/${record.subscriptionId}`, 'GET');
  if (subscription.plan_id !== record.planId || subscription.custom_id !== ref.id) throw fail('agreement-mismatch', 409);
  // Agreement approval is not evidence that any money was paid.
  await ref.set({ status: subscription.status.toLowerCase(), checkedAt: timestamp }, { merge: true });
  const since = record.lastCheckedAt ? new Date(record.lastCheckedAt - 86400000) : record.timestamp?.toDate?.() || new Date(now.getTime() - 31 * 86400000);
  const end = new Date(now.getTime() + 1000).toISOString();
  const transactions = await api(`/v1/billing/subscriptions/${record.subscriptionId}/transactions?start_time=${encodeURIComponent(since.toISOString())}&end_time=${encodeURIComponent(end)}`, 'GET');
  for (const transaction of transactions.transactions || []) {
    if (transaction.status !== 'COMPLETED') continue;
    const gross = transaction.amount_with_breakdown?.gross_amount;
    if (gross?.currency_code !== 'NOK' || Number(gross.value) !== record.amount) throw fail('unexpected-recurring-payment', 409);
    await ref.firestore.collection('donations').doc(transaction.id).set({ transactionId: transaction.id, subscriptionId: record.subscriptionId, amount: Number(gross.value), amountNok: Number(gross.value), currency: 'NOK', status: 'completed', method: 'paypal_subscription', donorName: record.name, donorEmail: record.email, fund: record.metadata.fund, type: record.metadata.type, courseId: record.metadata.course_id || null, courseTitle: record.metadata.course_title || null, message: record.metadata.message, timestamp, completedAt: timestamp, paidAt: transaction.time }, { merge: true });
  }
  await ref.set({ lastCheckedAt: now.getTime() }, { merge: true });
  return { status: subscription.status, paid: (transactions.transactions || []).some(tx => tx.status === 'COMPLETED') };
}
module.exports = { validateRecurring, paypalPlan, returnUrl, createStripeGift, createPayPalAgreement, reconcilePayPalAgreement };
