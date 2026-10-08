const {test}=require('node:test');const assert=require('node:assert/strict');
const {buildAccount,validateTarget}=require('./student-payment-account.cjs');
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
