const completed = new Set(['completed', 'succeeded', 'captured']);
const visible = cause => cause?.id && cause.active !== false && !['draft','archived','completed','cancelled'].includes(cause.status);
function summarizeCauseDonations(records) {
    const donors = new Set();
    let collectedOre = 0, donationCount = 0, anonymousDonationCount = 0;
    for (const {id, ...record} of records) {
        if (!completed.has(String(record.status || '').toLowerCase())) continue;
        const explicit = record.amountNok ?? record.amountNOK ?? record.totalNok;
        if (explicit == null && record.currency && String(record.currency).toUpperCase() !== 'NOK') continue;
        const amount = explicit != null ? Number(explicit) : record.amountOre != null || record.amountCents != null ? Number(record.amountOre ?? record.amountCents) / 100 : Number(record.amount || 0) / (record.paymentIntentId && !record.transactionId ? 100 : 1);
        if (!Number.isFinite(amount) || amount <= 0) continue;
        collectedOre += Math.round(amount * 100); donationCount++;
        const email = String(record.donorEmail || record.email || '').trim().toLowerCase();
        const identity = email.includes('@') ? `email:${email}` : record.userId ? `user:${record.userId}` : record.subscriptionId || record.vippsAgreementId ? `agreement:${record.subscriptionId || record.vippsAgreementId}` : null;
        if (identity) donors.add(identity); else anonymousDonationCount++;
    }
    // Anonymous gifts cannot reliably be attributed to unique people.
    return {collected:collectedOre / 100, donorCount:donors.size, donationCount, anonymousDonationCount};
}
async function refreshCauseActivity(db, funds = null) {
    const causesRef = db.collection('content').doc('collection_causes');
    const activityRef = db.collection('content').doc('cause_activity');
    return db.runTransaction(async transaction => {
        const causesDoc = await transaction.get(causesRef);
        const activityDoc = await transaction.get(activityRef);
        const causes = (causesDoc.data()?.items || []).filter(visible);
        const campaigns = {...(activityDoc.data()?.campaigns || {})};
        const ids = new Set(causes.map(cause => cause.id));
        Object.keys(campaigns).forEach(id => { if (!ids.has(id)) delete campaigns[id]; });
        for (const cause of causes) {
            if (funds && !funds.some(fund => fund === cause.id || fund === cause.title)) continue;
            const aliases = [...new Set([cause.id, cause.title].filter(Boolean))];
            const snapshot = await transaction.get(db.collection('donations').where('fund','in',aliases));
            campaigns[cause.id] = summarizeCauseDonations(snapshot.docs.map(doc => ({...doc.data(),id:doc.id})));
        }
        transaction.set(activityRef, {campaigns, updatedAt:new Date().toISOString()});
        return campaigns;
    });
}
module.exports = {summarizeCauseDonations, refreshCauseActivity};
