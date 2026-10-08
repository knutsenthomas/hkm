const crypto = require('node:crypto');
const { schoolAccountService } = require('./student-payment-account.cjs');
async function schoolCheckout({body,db,timestamp}) {
 if (!/^20\d{2}$/.test(body.year || '') || !/^[A-Za-z0-9_-]{1,128}$/.test(body.centralUid || '')) throw new Error('invalid-request');
 const result = await schoolAccountService({body:{mode:'read',centralUid:body.centralUid},db,timestamp,getAgreement:async()=>({status:'pending'})});
 const account=result.accounts.find(a=>a.year===body.year);
 if (account?.paid || account?.agreements.length) throw new Error('existing-school-payment');
 const remaining=Math.max(0,1000-(account?.registrationPaid || 0));
 const quote=crypto.randomBytes(32).toString('hex');
 await db.collection('_school_checkout').doc(quote).set({centralUid:body.centralUid,year:body.year,name:body.name,email:body.email,registrationRemaining:body.includeRegistration===true ? remaining : 0,expiresAt:Date.now()+30*60*1000});
 return {url:`https://hkpc.no/betaling?school_checkout=${quote}`};
}
async function readSchoolCheckout(db,quote) {
 if (!/^[a-f0-9]{64}$/.test(quote || '')) throw Object.assign(new Error('school-login-required'),{status:401});
 const snap=await db.collection('_school_checkout').doc(quote).get();
 if (!snap.exists || snap.data().expiresAt<Date.now()) throw Object.assign(new Error('school-checkout-expired'),{status:401});
 return snap.data();
}
async function confirmSchoolAllocation(db,quote) {
 const result=await schoolAccountService({body:{mode:'read',centralUid:quote.centralUid},db,getAgreement:async()=>({status:'pending'})});
 const account=result.accounts.find(a=>a.year===quote.year);
 const remaining=Math.max(0,1000-(account?.registrationPaid || 0));
 if (quote.registrationRemaining > remaining) throw Object.assign(new Error('registration-status-changed'),{status:409});
}
module.exports={schoolCheckout,readSchoolCheckout,confirmSchoolAllocation};
