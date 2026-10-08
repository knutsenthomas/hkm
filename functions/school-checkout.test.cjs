const test=require('node:test'),assert=require('node:assert/strict');
const {schoolCheckout,readSchoolCheckout,confirmSchoolAllocation}=require('./school-checkout.cjs');
function storage(paid=0) {
 const quotes=new Map();
 const payment={status:'completed',fund:'hkpc',type:'Kurs',amountNok:paid,courseId:'hkpc-registration'};
 return {quotes,collection(name){return {
 where(){return {async get(){return {docs:paid?[{data:()=>({year:'2027',paymentIds:['fee']})}]:[]};}};},
 doc(id){return {async get(){return name==='_school_checkout'?{exists:quotes.has(id),data:()=>quotes.get(id)}:{exists:true,data:()=>payment};},async set(value){quotes.set(id,value);}}}
 };}};
}
test('checkout subtracts recorded registration fees and returns a short-lived unguessable link',async()=>{
 const db=storage(1000),body={year:'2027',centralUid:'student1',name:'Student',email:'student@example.com',includeRegistration:true};
 const result=await schoolCheckout({body,db});const quote=new URL(result.url).searchParams.get('school_checkout');
 assert.match(quote,/^[a-f0-9]{64}$/);const details=await readSchoolCheckout(db,quote);assert.equal(details.registrationRemaining,0);assert.equal(details.centralUid,'student1');
 const unpaid=storage();await schoolCheckout({body,db:unpaid});assert.equal([...unpaid.quotes.values()][0].registrationRemaining,1000);
});
test('expired or missing checkout cannot create an agreement; a fee paid after quote creation invalidates its allocation',async()=>{
 const db=storage(1000),token='a'.repeat(64);db.quotes.set(token,{expiresAt:Date.now()-1});
 await assert.rejects(readSchoolCheckout(db,token),/expired/);await assert.rejects(readSchoolCheckout(db,''),/login-required/);
 await assert.rejects(confirmSchoolAllocation(db,{centralUid:'student1',year:'2027',registrationRemaining:1000}),/status-changed/);
});
