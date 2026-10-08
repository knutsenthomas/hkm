const test = require('node:test');
const assert = require('node:assert/strict');
const {validatePlan} = require('./school-payment-plan.cjs');

test('verified registration allocation increases the fixed plan without trusting a requested amount',()=>{
 const input={customerDetails:{name:'Student',email:'student@example.com'},studentName:'Student',schoolYear:'2027',requestId:'12345678-1234-1234-1234-123456789012',consent:true,amount:1,verifiedCentralUid:'student1',verifiedRegistrationRemaining:1000};
 const full=validatePlan(input);assert.equal(full.amount,1100);assert.equal(full.metadata.registration_per_month,'100');
 const paid=validatePlan({...input,verifiedRegistrationRemaining:0});assert.equal(paid.amount,1000);assert.equal(full.key,paid.key);
 assert.throws(()=>validatePlan({...input,verifiedRegistrationRemaining:1001}));
});
