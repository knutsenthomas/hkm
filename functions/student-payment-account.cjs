function confirmedPayments(rows) {
  return rows.filter(row => row.status === 'completed' && row.fund === 'hkpc' && ['Kurs', 'Course'].includes(row.type) && Number.isFinite(Number(row.amountNok ?? row.amount)) && Number(row.amountNok ?? row.amount) > 0);
}
function buildAccount(year, rows, agreements) {
  const unique = new Map(confirmedPayments(rows).map(row => [row.id, row]));
  const payments = [...unique.values()].map(row => ({ id: row.id, amount: Number(row.amountNok ?? row.amount), registration: row.courseId === 'hkpc-registration', date: row.paidAt || row.completedAt?.toDate?.().toISOString() || row.timestamp?.toDate?.().toISOString() || null, method: row.method || '', reference: row.transactionId || row.id }));
  const paid = payments.filter(row => !row.registration).reduce((sum, row) => sum + row.amount, 0);
  return { year, tuition: 10000, paid, remaining: Math.max(0, 10000 - paid), registrationPaid: payments.filter(row => row.registration).reduce((sum, row) => sum + row.amount, 0), registrationTotal: 1000, payments: payments.sort((a,b) => (b.date || '').localeCompare(a.date || '')), agreements };
}
function validateTarget(body) {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(body.centralUid || '') || !/^20\d{2}$/.test(body.year || '')) throw new Error('invalid-student');
  if (!['plan', 'payment'].includes(body.kind) || typeof body.reference !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(body.reference)) throw new Error('invalid-reference');
}
async function schoolAccountService({ body, db, getAgreement, timestamp }) {
  if (body.mode === 'link') {
    validateTarget(body);
    const source = await db.collection(body.kind === 'plan' ? 'school_payment_plans' : 'donations').doc(body.reference).get();
    if (!source.exists || (body.kind === 'payment' && !confirmedPayments([{ id: source.id, ...source.data() }]).length) || (body.kind === 'plan' && source.data().schoolYear !== body.year)) throw new Error('school-payment-not-found');
    const owner = db.collection('_school_payment_owners').doc(`${body.kind}_${body.reference}`);
    const link = db.collection('school_payment_student_links').doc(`${body.centralUid}_${body.year}`);
    await db.runTransaction(async tx => {
      const [current, existing] = await Promise.all([tx.get(owner), tx.get(link)]);
      if (current.exists && (current.data().centralUid !== body.centralUid || current.data().year !== body.year)) throw new Error('payment-already-linked');
      const key = body.kind === 'plan' ? 'planKeys' : 'paymentIds';
      tx.set(owner, { centralUid: body.centralUid, year: body.year, linkedAt: timestamp });
      tx.set(link, { centralUid: body.centralUid, year: body.year, [key]: [...new Set([...(existing.data()?.[key] || []), body.reference])], updatedAt: timestamp }, { merge: true });
    });
    return { linked: true };
  }
  if (body.mode !== 'read' || !/^[A-Za-z0-9_-]{1,128}$/.test(body.centralUid || '')) throw new Error('invalid-request');
  const links = await db.collection('school_payment_student_links').where('centralUid', '==', body.centralUid).get();
  const accounts = [];
  for (const link of links.docs) {
    const data = link.data(), rows = [], agreements = [];
    for (const id of data.paymentIds || []) { const payment = await db.collection('donations').doc(id).get(); if (payment.exists) rows.push({ id, ...payment.data() }); }
    for (const key of data.planKeys || []) {
      const [plan, paypal] = await Promise.all([db.collection('school_payment_plans').doc(key).get(), db.collection('recurring_payment_agreements').doc(key).get()]);
      if (!plan.exists) continue;
      const details = { ...plan.data(), ...(paypal.exists ? paypal.data() : {}) };
      if (!details.subscriptionId) { agreements.push({ status: 'pending', provider: details.provider, nextDate: null, nextAmount: null }); continue; }
      const payments = await db.collection('donations').where('subscriptionId', '==', details.subscriptionId).get();
      payments.docs.forEach(payment => rows.push({ id: payment.id, ...payment.data() }));
      // Fetch actual provider status rather than infer future dates from the calendar.
      try { agreements.push(await getAgreement(details)); }
      catch { agreements.push({ provider: details.provider, status: 'unavailable', nextDate: null, nextAmount: null }); }
    }
    accounts.push(buildAccount(data.year, rows, agreements));
  }
  return { accounts: accounts.sort((a,b) => b.year.localeCompare(a.year)) };
}
module.exports = { confirmedPayments, buildAccount, validateTarget, schoolAccountService };
