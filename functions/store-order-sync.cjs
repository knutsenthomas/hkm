'use strict';
const SOURCE = 'https://hiskingdomdesigns.no/api/wix-orders-sync';
const lanes = ['all', 'PENDING', 'REJECTED'];
const normalizedEmail = value => String(value || '').trim().toLowerCase();
const money = value => {
  if (value == null) return null;
  const result = Number(value);
  if (!Number.isFinite(result) || result < 0) throw new Error('invalid-order-amount');
  return Math.round(result * 100) / 100;
};

async function sourceApi(fetchImpl = fetch) {
  const url = `http://metadata/computeMetadata/v1/instance/service-accounts/default/identity?audience=${encodeURIComponent(SOURCE)}&format=full`;
  const identity = await fetchImpl(url, { headers: { 'Metadata-Flavor': 'Google' }, signal: AbortSignal.timeout(10000) });
  if (!identity.ok) throw new Error('store-sync-identity-unavailable');
  const token = await identity.text();
  return async page => {
    const reply = await fetchImpl(SOURCE, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(page), signal: AbortSignal.timeout(30000), redirect: 'error' });
    if (!reply.ok) throw new Error(`store-source-http-${reply.status}`);
    const data = await reply.json();
    if (!data.success || !Array.isArray(data.orders) || !(data.nextCursor == null || typeof data.nextCursor === 'string')) throw new Error('store-source-invalid');
    return data;
  };
}

function ledgerRecord(order, Timestamp) {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(order._id || '') || !Number.isFinite(Date.parse(order._createdDate))) throw new Error('invalid-store-order');
  const original = money(order.priceSummary?.total?.amount);
  if (original == null || !/^[A-Z]{3}$/.test(order.currency || '')) throw new Error('invalid-store-order');
  const refunded = money(order.balanceSummary?.refunded?.amount) ?? 0;
  const paid = money(order.balanceSummary?.paid?.amount) ?? (order.paymentStatus === 'PAID' ? original : 0);
  const net = Math.max(0, Math.round((paid - refunded) * 100) / 100);
  const canceled = order.status === 'CANCELED';
  const fullyRefunded = order.paymentStatus === 'FULLY_REFUNDED' || (paid > 0 && refunded >= paid);
  const status = fullyRefunded ? 'refunded' : canceled ? 'cancelled' : net > 0 ? 'completed' : 'pending';
  return {
    transactionId: order._id, wixOrderId: order._id, wixOrderNumber: order.number || '',
    source: 'wix_store', type: 'butikk', method: 'wix', currency: order.currency,
    amount: net, ...(order.currency === 'NOK' ? { amountNok: net } : {}),
    originalAmount: original, refundedAmount: refunded, status,
    paymentStatus: order.paymentStatus || 'UNKNOWN', fulfillmentStatus: order.fulfillmentStatus || '',
    donorName: [order.billingInfo?.contactDetails?.firstName, order.billingInfo?.contactDetails?.lastName].filter(Boolean).join(' '),
    timestamp: Timestamp.fromDate(new Date(order.purchasedDate || order._createdDate)),
    productName: (order.lineItems || []).map(i=>i.productName?.original || '').filter(Boolean).join(', '),
    quantity: (order.lineItems || []).reduce((n,i)=>n+(Number(i.quantity)||0),0),
  };
}

async function ownerForEmail(auth, email) {
  if (!email) return null;
  try { const user = await auth.getUserByEmail(email); return !user.disabled && user.emailVerified ? user.uid : null; }
  catch (error) { if (error.code === 'auth/user-not-found') return null; throw error; }
}

async function saveOrder({ db, auth, order, Timestamp }) {
  const record = ledgerRecord(order, Timestamp);
  const buyerEmail = normalizedEmail(order.buyerInfo?.email);
  const uid = await ownerForEmail(auth, buyerEmail);
  const archiveRef = db.collection('wix_order_imports').doc(order._id);
  const giftRef = db.collection('donations').doc(`wix-order-${order._id}`);
  await db.runTransaction(async tx => {
    const old = await tx.get(giftRef);
    if (old.exists && old.data().source !== 'wix_store') throw new Error('order-source-conflict');
    // No TTL and no deletion on age, cancellation or absence from a future page.
    tx.set(archiveRef, { order, buyerEmail, updatedAt: Timestamp.now() });
    tx.set(giftRef, { ...record, userId: old.data()?.userId || uid, syncedAt: Timestamp.now() });
  });
}

async function sync({ db, auth, api, Timestamp, pageBudget = 20 }) {
  const ref = db.collection('integration_state').doc('wix_store_orders');
  const state = (await ref.get()).data() || {};
  let laneIndex = Number.isInteger(state.laneIndex) ? state.laneIndex : 0;
  let cursor = state.cursor || '';
  if (!lanes[laneIndex]) throw new Error('invalid-store-sync-state');
  let processed = 0;
  const cursors = new Set();
  for (let page = 0; page < pageBudget; page++) {
    let result;
    try { result = await api({ lane: lanes[laneIndex], cursor }); }
    catch (error) {
      // Wix cursors can expire. Restart this lane next time; keep all saved orders.
      if (cursor && error.message === 'store-source-http-502') await ref.set({ cursor: '' }, { merge: true });
      throw error;
    }
    if (!Array.isArray(result.orders)) throw new Error('invalid-store-page');
    if (result.nextCursor && (result.nextCursor === cursor || cursors.has(result.nextCursor))) throw new Error('store-pagination-stalled');
    for (const order of result.orders) { await saveOrder({ db, auth, order, Timestamp }); processed++; }
    cursor = result.nextCursor || '';
    if (cursor) cursors.add(cursor);
    else laneIndex++;
    const complete = laneIndex === lanes.length;
    await ref.set({ laneIndex: complete ? 0 : laneIndex, cursor: complete ? '' : cursor, lastPageAt: Timestamp.now(), ...(complete ? { lastFullSyncAt: Timestamp.now() } : {}) }, { merge: true });
    if (complete) return { processed, complete: true };
  }
  // Budget only bounds one run; the next run resumes at the saved cursor.
  return { processed, complete: false };
}

async function linkOwnOrders({ db, user }) {
  if (!user.emailVerified || user.disabled || !user.email) return;
  const rows = await db.collection('wix_order_imports').where('buyerEmail', '==', normalizedEmail(user.email)).get();
  for (const row of rows.docs) {
    const ref = db.collection('donations').doc(`wix-order-${row.id}`);
    await db.runTransaction(async tx => {
      const gift = await tx.get(ref);
      if (gift.exists && gift.data().source === 'wix_store' && !gift.data().userId) tx.update(ref, { userId: user.uid });
    });
  }
}
module.exports = { sourceApi, ledgerRecord, saveOrder, sync, linkOwnOrders };
