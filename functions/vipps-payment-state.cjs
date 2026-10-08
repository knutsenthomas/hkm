// eCom details are ordered newest first. Only successful operations determine state.
function normalizeVippsPayment(payload) {
 const history=Array.isArray(payload.transactionLogHistory)?payload.transactionLogHistory:[];
 const success=history.filter(row=>row.operationSuccess === true);
 const latest=success[0];
 const state=({CAPTURE:'CAPTURED',RESERVE:'AUTHORIZED',CANCEL:'CANCELLED',VOID:'CANCELLED',REFUND:'REFUNDED'})[latest?.operation] || 'INITIATED';
 const summary=payload.transactionSummary || {};
 const amount=state==='AUTHORIZED' ? Number(summary.remainingAmountToCapture ?? latest?.amount ?? 0) : Number(summary.capturedAmount ?? latest?.amount ?? 0);
 return {...payload,state,amount:{value:Number.isSafeInteger(amount)&&amount>=0?amount:0,currency:'NOK'}};
}
module.exports={normalizeVippsPayment};
