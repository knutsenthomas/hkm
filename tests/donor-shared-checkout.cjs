const fs=require('node:fs'), vm=require('node:vm'), assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');
const dom=new JSDOM(fs.readFileSync(process.argv[2] || 'donasjoner.html','utf8'),{url:'https://example.com/donasjoner'});
const {document,Event}=dom.window;
const ctx={document,window:dom.window,console,setTimeout:fn=>{fn();return 1;},queueMicrotask:fn=>fn(),URL,URLSearchParams,navigator:{clipboard:{writeText:async()=>{}}},fetch:()=>{throw new Error('No network in UI test');}};
vm.createContext(ctx);vm.runInContext(fs.readFileSync('js/vipps-recurring.js','utf8'),ctx);
for(const frequency of ['monthly','once']) for(const method of ['vipps','stripe','paypal','bank']) {
 const choice=document.querySelector(`[name="frequency"][value="${frequency}"]`);choice.checked=true;
 vm.runInContext(`openAgreementModal('${method}')`,ctx);
 const modal=document.getElementById('vipps-recurring-modal');
 assert.ok(modal.classList.contains('hkm-gift-checkout'));
 assert.equal(modal.getAttribute('role'),'dialog');
 assert.match(modal.querySelector('.hkm-gift-summary').textContent,/250 kr/);
 assert.equal(modal.querySelector('input[type="checkbox"]').required,frequency==='monthly'&&method!=='bank');
 assert.equal(modal.querySelector('#hkm-donor-email').disabled,method==='bank');
 assert.match(modal.querySelector('#hkm-gift-title').textContent,frequency==='monthly'?/månedlige/:/Din gave/);
 modal.querySelector('#hkm-modal-close-btn').click();assert.equal(document.getElementById('vipps-recurring-modal'),null);
}
console.log('Passed: common checkout shell, summary, fields, consent and bank mode for all eight combinations; no payment requests.');
(async()=>{
 document.querySelector('[name="frequency"][value="once"]').checked=true;
 for(const method of ['stripe','paypal','vipps']) {
  let request;
  dom.window.initializeStripe=async(...args)=>{request={method:'stripe',args};};
  dom.window.initPayPalDonation=options=>{request={method:'paypal',options};};
  dom.window.startVippsPayment=async(...args)=>{request={method:'vipps',args};};
  vm.runInContext(`openAgreementModal('${method}')`,ctx);
  const modal=document.getElementById('vipps-recurring-modal');
  for(const [id,value] of Object.entries({name:'Test Person',email:'test@example.com',phone:'12345678',address:'Testveien 1',zip:'1234',city:'Oslo'})) modal.querySelector('#hkm-donor-'+id).value=value;
  modal.querySelector('form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(request?.method,method);
  if(method==='stripe') {assert.equal(request.args[0],250);assert.equal(request.args[3],false);}
  if(method==='paypal') assert.equal(request.options.details.customerDetails.email,'test@example.com');
  if(method==='vipps') assert.equal(request.args[1].email,'test@example.com');
  modal.querySelector('#hkm-modal-close-btn').click();
 }
 console.log('Passed: one-time card, PayPal and Vipps routing through the same form with mocked providers.');
})().catch(error=>{console.error(error);process.exitCode=1;});
