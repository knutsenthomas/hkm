const {test}=require('node:test');const assert=require('node:assert/strict');
const {buildAccount,validateTarget,schoolAccountService}=require('./student-payment-account.cjs');
const payment={id:'pi1',transactionId:'pi1',amountNok:1000,status:'completed',fund:'hkpc',type:'Kurs',courseId:'hkpc-monthly'};
test('only confirmed school payments count; gifts and pending charges never settle tuition',()=>{
 const account=buildAccount('2027',[payment,payment,{...payment,id:'pi2',status:'pending'},{...payment,id:'pi3',type:'Gave'},{...payment,id:'pi4',courseId:'hkpc-registration'},{...payment,id:'pi5',fund:'general'}],[]);
 assert.equal(account.paid,1000);assert.equal(account.remaining,9000);assert.equal(account.registrationPaid,1000);assert.equal(account.payments.length,2);
});
test('balance is never negative and multiple years stay separate',()=>{
 assert.equal(buildAccount('2027',[{...payment,amountNok:11000}],[]).remaining,0);
 assert.equal(buildAccount('2026',[],[]).paid,0);
});
test('arbitrary references cannot escape the expected document path',()=>{
 validateTarget({centralUid:'user_1',year:'2027',kind:'plan',reference:'abc123'});
 assert.throws(()=>validateTarget({centralUid:'user_1',year:'2027',kind:'payment',reference:'../donations/other'}));
});

function database(records) {
 const snapshot=(id,data)=>({id,exists:!!data,data:()=>data});
 return {collection(name){const filters=[];let cap=Infinity;const query={where(field,op,value){filters.push([field,value]);return query;},limit(value){cap=value;return query;},async get(){const docs=Object.entries(records[name]||{}).filter(([,data])=>filters.every(([field,value])=>data[field]===value)).slice(0,cap).map(([id,data])=>snapshot(id,data));return {docs,size:docs.length};},doc(id){return {get:async()=>snapshot(id,records[name]?.[id])};}};return query;}};
}
test('admin overview separates linked balances from unlinked and pending transactions',async()=>{
 const db=database({school_payment_student_links:{link:{centralUid:'student1',year:'2027',paymentIds:['paid'],planKeys:[]}},donations:{paid:{...payment,schoolYear:'2027'},pending:{...payment,status:'pending',schoolYear:'2027'},gift:{...payment,type:'Gave'},other:{...payment,schoolYear:'2026'},unknown:{...payment,schoolYear:undefined}},school_payment_plans:{plan:{schoolYear:'2027',provider:'stripe',studentName:'Student',name:'Parent',email:'parent@example.test'}}});
 const result=await schoolAccountService({body:{mode:'admin',year:'2027'},db,getAgreement:async()=>({}),timestamp:0});
 assert.equal(result.accounts.length,1);assert.equal(result.accounts[0].paid,1000);assert.equal(result.accounts[0].remaining,9000);
 assert.equal(result.payments.find(item=>item.reference==='paid').studentUid,'student1');assert.equal(result.payments.find(item=>item.reference==='pending').studentUid,null);
 assert.equal(result.payments.some(item=>['gift','other'].includes(item.reference)),false);
 assert.equal(result.plans[0].reference,'plan');assert.equal(result.plans[0].studentUid,null);assert.equal(result.limited,false);
});
test('admin overview requires a valid school year',async()=>{
 await assert.rejects(()=>schoolAccountService({body:{mode:'admin',year:'all'}}),/invalid-request/);
});

test('combined monthly payments allocate only tuition to the tuition balance',()=>{
 const result=buildAccount('2027',[{id:'combined',status:'completed',fund:'hkpc',type:'Kurs',amountNok:1100,courseId:'hkpc-monthly',registrationAmount:100}],[]);
 assert.equal(result.paid,1000);assert.equal(result.registrationPaid,100);assert.equal(result.remaining,9000);
});
