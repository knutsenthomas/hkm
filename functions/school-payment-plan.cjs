const crypto = require('node:crypto');
const MONTHLY_ORE = 100000;
const INSTALMENTS = 10;

function addMonths(timestamp, months) {
  const anchor = new Date(timestamp * 1000);
  const month = anchor.getUTCMonth() + months;
  const lastDay = new Date(Date.UTC(anchor.getUTCFullYear(), month + 1, 0)).getUTCDate();
  return Math.floor(Date.UTC(anchor.getUTCFullYear(), month, Math.min(anchor.getUTCDate(), lastDay), anchor.getUTCHours(), anchor.getUTCMinutes(), anchor.getUTCSeconds()) / 1000);
}
function validatePlan(input = {}) {
  const customer = input.customerDetails || {};
  const name = String(customer.name || '').trim();
  const email = String(customer.email || '').trim().toLowerCase();
  const studentName = String(input.studentName || '').trim();
  const year = String(input.schoolYear || '');
  const requestId = String(input.requestId || '');
  if (!name || name.length > 120 || !studentName || studentName.length > 120 || email.length > 254 || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email) || !/^20\d{2}$/.test(year) || !/^[a-f0-9-]{36}$/i.test(requestId) || input.consent !== true) {
    throw Object.assign(new Error('invalid-school-plan'), { status: 400 });
  }
  const reference = String(input.reference || '').trim().slice(0, 120);
  const key = crypto.createHash('sha256').update(input.verifiedCentralUid ? `${year}|${input.verifiedCentralUid}` : `${year}|${email}|${studentName.toLowerCase()}`).digest('hex');
  const registrationPerMonth = input.verifiedRegistrationRemaining === undefined ? 0 : Number(input.verifiedRegistrationRemaining) / INSTALMENTS;
  if (!Number.isFinite(registrationPerMonth) || registrationPerMonth < 0 || registrationPerMonth > 100) throw Object.assign(new Error('invalid-school-plan'), {status:400});
  const amount = 1000 + registrationPerMonth;
  if (Math.abs(amount * 100 - Math.round(amount * 100)) > 0.000001) throw Object.assign(new Error('registration-allocation-needs-review'), {status:409});
  const metadata = {
    registration_per_month: String(registrationPerMonth), school_plan: 'hkpc_10_months', plan_key: key, instalments: String(INSTALMENTS), school_year: year,
    student_name: studentName, customer_name: name, customer_email: email, reference,
    fund: 'hkpc', type: 'Kurs', course_id: 'hkpc-monthly', course_title: `HKPC ${year} – 10 månedlige terminer`,
    message: `Skolebetaling HKPC ${year}\nElev: ${studentName}${reference ? `\nReferanse: ${reference}` : ''}`,
  };
  return { name, email, studentName, year, requestId, key, metadata, amount, centralUid: input.verifiedCentralUid || null };
}

async function createSchoolPaymentPlan({ input, stripe, db, now = () => Math.floor(Date.now() / 1000) }) {
  const details = validatePlan(input);
  const ref = db.collection('school_payment_plans').doc(details.key);
  const plan = await db.runTransaction(async tx => {
    const snap = await tx.get(ref);
    if (snap.exists) {
      const current = snap.data();
      // Only the browser that started the setup can resume an unpaid attempt.
      if (current.provider !== 'stripe' || current.requestId !== details.requestId || current.name !== details.name || current.reference !== details.metadata.reference || current.amount !== details.amount) throw Object.assign(new Error('school-plan-exists'), { status: 409 });
      return current;
    }
    const data = { provider: 'stripe', requestId: details.requestId, name: details.name, email: details.email, studentName: details.studentName, schoolYear: details.year, reference: details.metadata.reference, startedAt: now(), status: 'creating', amount: details.amount, total: details.amount * INSTALMENTS, instalments: INSTALMENTS };
    tx.set(ref, data);
    return data;
  });
  let subscription;
  if (plan.subscriptionId) {
    subscription = await stripe.subscriptions.retrieve(plan.subscriptionId, { expand: ['latest_invoice.payment_intent'] });
    if (subscription.status !== 'incomplete') throw Object.assign(new Error('school-plan-exists'), { status: 409 });
  } else {
    // A new customer cannot be charged using a card stored for an unrelated gift.
    const customer = await stripe.customers.create({ name: details.name, email: details.email }, { idempotencyKey: `hkpc-customer-${details.requestId}` });
    const price = await stripe.prices.create({ unit_amount: Math.round(details.amount * 100), currency: 'nok', recurring: { interval: 'month' }, product_data: { name: `HKPC – ${details.amount} kr per måned i 10 måneder` } }, { idempotencyKey: `hkpc-price-${details.requestId}` });
    subscription = await stripe.subscriptions.create({
      customer: customer.id, items: [{ price: price.id, quantity: 1 }],
      collection_method: 'charge_automatically', payment_behavior: 'default_incomplete',
      payment_settings: { payment_method_types: ['card'], save_default_payment_method: 'on_subscription' },
      // The cap exists from the first API call, even if a later operation fails.
      cancel_at: addMonths(plan.startedAt, INSTALMENTS), proration_behavior: 'none',
      metadata: details.metadata, expand: ['latest_invoice.payment_intent'],
    }, { idempotencyKey: `hkpc-subscription-${details.requestId}` });
    await ref.set({ subscriptionId: subscription.id }, { merge: true });
  }
  // Use Stripe's actual anchor, including month-end/leap-year rules. No 11th renewal.
  const cancelAt = addMonths(subscription.billing_cycle_anchor, INSTALMENTS);
  await stripe.subscriptions.update(subscription.id, { cancel_at: cancelAt, proration_behavior: 'none' });
  const intent = subscription.latest_invoice?.payment_intent;
  if (!intent?.client_secret || !['requires_payment_method', 'requires_confirmation', 'requires_action'].includes(intent.status)) throw Object.assign(new Error('school-plan-not-payable'), { status: 409 });
  await stripe.paymentIntents.update(intent.id, { metadata: { ...details.metadata, subscription_id: subscription.id }, receipt_email: details.email });
  await ref.set({ status: 'pending', cancelAt, subscriptionId: subscription.id }, { merge: true });
  await db.collection('donations').doc(intent.id).set({
    transactionId: intent.id, subscriptionId: subscription.id, amount: details.amount, amountNok: details.amount, amountOre: Math.round(details.amount * 100), registrationAmount: details.amount - 1000,
    currency: 'nok', method: 'stripe_subscription', status: 'pending',
    donorName: details.name, donorEmail: details.email, type: 'Kurs', fund: 'hkpc',
    message: details.metadata.message, courseId: 'hkpc-monthly', courseTitle: details.metadata.course_title,
  }, { merge: true });
  return { clientSecret: intent.client_secret, subscriptionId: subscription.id, instalments: INSTALMENTS, monthlyAmount: details.amount, totalAmount: details.amount * INSTALMENTS, cancelAt };
}

async function schoolMetadataForIntent(stripe, intent) {
  if (intent.metadata?.school_plan === 'hkpc_10_months' || intent.metadata?.donor_plan === 'monthly_gift') return intent.metadata;
  if (!intent.invoice) return null;
  const invoice = typeof intent.invoice === 'string' ? await stripe.invoices.retrieve(intent.invoice) : intent.invoice;
  if (!invoice.subscription) return null;
  const subscription = typeof invoice.subscription === 'string' ? await stripe.subscriptions.retrieve(invoice.subscription) : invoice.subscription;
  return subscription.metadata?.school_plan === 'hkpc_10_months' || subscription.metadata?.donor_plan === 'monthly_gift' ? { ...subscription.metadata, subscription_id: subscription.id } : null;
}
module.exports = { addMonths, validatePlan, createSchoolPaymentPlan, schoolMetadataForIntent };
