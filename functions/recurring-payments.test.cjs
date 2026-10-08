const { test } = require('node:test');
const assert = require('node:assert/strict');
const { addMonths, validatePlan, createSchoolPaymentPlan, schoolMetadataForIntent } = require('./school-payment-plan.cjs');
const { validateRecurring, paypalPlan, returnUrl, reconcilePayPalAgreement } = require('./recurring-payments.cjs');
const input = { studentName: 'Student Example', schoolYear: '2027', requestId: '6d91f023-8db2-4dfc-84db-74ee9ee25ba8', consent: true, customerDetails: { name: 'Payer Example', email: 'payer@example.com' } };
const timestamp = value => Date.parse(value) / 1000;
test('school instalments are fixed regardless of supplied price or count', () => {
 const data = validateRecurring({ ...input, amount: 1, cycles: 99 });
 assert.equal(data.amount, 1000); assert.equal(data.cycles, 10);
 assert.equal(data.metadata.type, 'Kurs'); assert.equal(data.metadata.fund, 'hkpc');
 assert.throws(() => validatePlan({ ...input, consent: false }));
});
test('calendar cap preserves time and clamps month ends and leap years', () => {
 assert.equal(addMonths(timestamp('2027-01-31T12:30:00Z'), 1), timestamp('2027-02-28T12:30:00Z'));
 assert.equal(addMonths(timestamp('2028-01-31T12:30:00Z'), 1), timestamp('2028-02-29T12:30:00Z'));
 assert.equal(addMonths(timestamp('2027-01-31T12:30:00Z'), 10), timestamp('2027-11-30T12:30:00Z'));
});
test('PayPal school plan stops after ten cycles; gift has no fixed end', () => {
 const school = paypalPlan(validateRecurring(input), 'prod');
 assert.equal(school.billing_cycles[0].total_cycles, 10);
 assert.deepEqual(school.billing_cycles[0].pricing_scheme.fixed_price, { value: '1000.00', currency_code: 'NOK' });
 const gift = paypalPlan(validateRecurring({ ...input, gift: true, amount: 250 }), 'prod');
 assert.equal(gift.billing_cycles[0].total_cycles, 0);
 assert.throws(() => validateRecurring({ ...input, gift: true, amount: .001 }));
 assert.throws(() => returnUrl('https://attacker.example/'));
 assert.equal(returnUrl('https://hkpc.no/betaling?bad=1').href, 'https://hkpc.no/betaling');
});
function fakeDb() {
 const records = new Map();
 const db = { collection: collection => ({ doc: id => ({ id, firestore: db, set: async (data, options) => records.set(`${collection}/${id}`, { ...(options?.merge ? records.get(`${collection}/${id}`) : {}), ...data }), get: async () => ({ exists: records.has(`${collection}/${id}`), data: () => records.get(`${collection}/${id}`) }) }) }), runTransaction: async fn => fn({ get: ref => ref.get(), set: (ref, data) => ref.set(data) }) };
 return { db, records };
}
test('school setup uses a fresh customer and cannot create an eleventh renewal or duplicate plan', async () => {
 const { db } = fakeDb(); let created = 0; let firstIntentMetadata;
 const subscription = { id: 'sub1', status: 'incomplete', billing_cycle_anchor: timestamp('2027-01-31T12:30:00Z'), latest_invoice: { payment_intent: { id: 'pi1', status: 'requires_payment_method', client_secret: 'test-secret' } } };
 const stripe = { customers: { create: async () => ({ id: 'fresh-customer' }) }, prices: { create: async body => { assert.equal(body.unit_amount, 100000); return { id: 'price1' }; } }, subscriptions: { create: async body => { created++; assert.equal(body.customer, 'fresh-customer'); assert.equal(body.payment_behavior, 'default_incomplete'); assert.equal(body.cancel_at, timestamp('2027-11-30T12:30:00Z')); return subscription; }, retrieve: async () => subscription, update: async (id, body) => assert.equal(body.cancel_at, timestamp('2027-11-30T12:30:00Z')) }, paymentIntents: { update: async (id, body) => { firstIntentMetadata = body.metadata; } } };
 const options = { input, stripe, db, now: () => subscription.billing_cycle_anchor };
 assert.equal((await createSchoolPaymentPlan(options)).totalAmount, 10000);
 await createSchoolPaymentPlan(options); assert.equal(created, 1);
 assert.equal(firstIntentMetadata.subscription_id, 'sub1');
 await assert.rejects(createSchoolPaymentPlan({ ...options, input: { ...input, requestId: '11111111-1111-4111-8111-111111111111' } }), /school-plan-exists/);
 subscription.status = 'active'; await assert.rejects(createSchoolPaymentPlan(options), /school-plan-exists/);
});
test('monthly Stripe renewals inherit school or gift classification', async () => {
 const stripe = { invoices: { retrieve: async () => ({ subscription: 'sub1' }) }, subscriptions: { retrieve: async () => ({ id: 'sub1', metadata: { school_plan: 'hkpc_10_months', type: 'Kurs', fund: 'hkpc' } }) } };
 const metadata = await schoolMetadataForIntent(stripe, { invoice: 'invoice1', metadata: {} });
 assert.equal(metadata.type, 'Kurs'); assert.equal(metadata.subscription_id, 'sub1');
 assert.equal(await schoolMetadataForIntent(stripe, { metadata: {} }), null);
});
test('PayPal approval is not recorded as payment; only verified completed transactions are', async () => {
 const { db, records } = fakeDb(); const ref = db.collection('recurring_payment_agreements').doc('key');
 const record = { subscriptionId: 'sub1', planId: 'plan1', name: 'Payer', email: 'payer@example.com', amount: 1000, metadata: { type: 'Kurs', fund: 'hkpc' } };
 let txs = [];
 const api = async path => path.includes('/transactions?') ? { transactions: txs } : { status: 'ACTIVE', custom_id: 'key', plan_id: 'plan1' };
 const options = { ref, record, api, timestamp: 'now', now: new Date('2027-01-01T00:00:00Z') };
 assert.equal((await reconcilePayPalAgreement(options)).paid, false);
 assert.equal(records.has('donations/sub1'), false);
 txs = [{ id: 'payment1', status: 'COMPLETED', time: '2027-01-01', amount_with_breakdown: { gross_amount: { value: '1000.00', currency_code: 'NOK' } } }];
 await reconcilePayPalAgreement(options); await reconcilePayPalAgreement(options);
 assert.equal(records.get('donations/payment1').type, 'Kurs');
 assert.equal([...records.keys()].filter(key => key.startsWith('donations/')).length, 1);
 txs[0].amount_with_breakdown.gross_amount.value = '1';
 await assert.rejects(reconcilePayPalAgreement(options), /unexpected-recurring-payment/);
});
