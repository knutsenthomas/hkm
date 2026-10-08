const test=require('node:test'),assert=require('node:assert/strict');const {normalizeVippsPayment}=require('./vipps-payment-state.cjs');
test('newest reserve wins over older initiate and uses the actual reserved amount',()=>{
 const result=normalizeVippsPayment({transactionLogHistory:[{operation:'RESERVE',operationSuccess:true,amount:1000},{operation:'INITIATE',operationSuccess:true,amount:1000}],transactionSummary:{remainingAmountToCapture:1000,capturedAmount:0}});assert.equal(result.state,'AUTHORIZED');assert.equal(result.amount.value,1000);
});
test('capture and cancellation win over earlier reserve; failed operations do not change state',()=>{
 const rows=[{operation:'CAPTURE',operationSuccess:false,amount:0},{operation:'CAPTURE',operationSuccess:true,amount:1000},{operation:'RESERVE',operationSuccess:true,amount:1000},{operation:'INITIATE',operationSuccess:true}];assert.equal(normalizeVippsPayment({transactionLogHistory:rows}).state,'CAPTURED');assert.equal(normalizeVippsPayment({transactionLogHistory:[{operation:'VOID',operationSuccess:true},...rows]}).state,'CANCELLED');assert.equal(normalizeVippsPayment({}).state,'INITIATED');
});
