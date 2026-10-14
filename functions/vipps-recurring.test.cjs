const { test } = require('node:test');
const assert = require('node:assert/strict');
const { agreementBody, createAgreement, reconcile, dueDate } = require('./vipps-recurring.cjs');
const { validateRecurring } = require('./recurring-payments.cjs');
const input = {gift:true,amount:100,consent:true,requestId:'12345678-1234-4234-8234-123456789012',customerDetails:{name:'Test giver',email:'test@example.com',fund:'hkpc'},returnUrl:'https://www.hkpc.no/gi-gave'};
function database(){
 const records=new Map();
 const db={collection(path){return {doc(id){const key=path+'/'+id;const ref={id,firestore:db,collection(name){return db.collection(key+'/'+name);},async get(){return {exists:records.has(key),data:()=>records.get(key),ref};},async set(data,options){records.set(key,options?.merge?{...records.get(key),...data}:data);}};return ref;},async get(){const docs=[...records.keys()].filter(key=>key.startsWith(path+'/')&&!key.slice(path.length+1).includes('/')).map(key=>{const ref=this.doc(key.slice(path.length+1));return {id:ref.id,ref,data:()=>records.get(key)};});return {docs,size:docs.length};}};},async runTransaction(fn){return fn({get:ref=>ref.get(),set:(ref,data,options)=>ref.set(data,options)});}};
 return {db,records};
}
test('gift metadata and secure management URL distinguish HKPC from HKM',()=>{
 const d=validateRecurring(input);const body=agreementBody(d,input,'a'.repeat(48));assert.equal(body.pricing.amount,10000);assert.equal(body.productName,'Fast gave til HKPC');assert.equal(body.initialCharge,undefined);assert.match(body.merchantAgreementUrl,/vipps-avtale.html/);assert.match(body.merchantRedirectUrl,/recurring_provider=vipps/);assert.throws(()=>agreementBody(d,{...input,returnUrl:'https://evil.example'},'a'.repeat(48)),/invalid-return-url/);
});
test('duplicate setup reuses agreement and rejects altered amount',async()=>{
 const {db}=database();let calls=0;const details=validateRecurring(input);const api=async()=>{calls++;return {agreementId:'agr_test',vippsConfirmationUrl:'https://api.vipps.no/approve'};};const opts={details,input,db,api,timestamp:1};await createAgreement(opts);await createAgreement(opts);assert.equal(calls,1);await assert.rejects(createAgreement({...opts,details:{...details,amount:200}}),/agreement-already-started/);
});
test('approval alone never becomes received money',async()=>{
 const {db,records}=database();const details=validateRecurring(input);const ref=db.collection('recurring_payment_agreements').doc(details.key);const record={...details,agreementId:'agr_test'};await ref.set(record);const api=async()=>({id:'agr_test',status:'ACTIVE',start:'2026-10-14T12:00:00Z',pricing:{currency:'NOK',amount:10000}});await reconcile({ref,record,db,api,timestamp:1});assert.equal([...records.keys()].filter(key=>key.startsWith('donations/')).length,0);
});
test('school plan produces ten charges, never an eleventh, and stops automatically',async()=>{
 const {db,records}=database();const schoolInput={...input,gift:false,studentName:'Elev',schoolYear:'2027'};const details=validateRecurring(schoolInput);const ref=db.collection('recurring_payment_agreements').doc(details.key);let active=true,created=0;const record={...details,agreementId:'agr_school',provider:'vipps',anchor:Date.parse('2027-01-31T12:00:00Z')};await ref.set(record);
 const api=async(path,method,body)=>{if(method==='PATCH'){active=false;return {};}if(method==='POST'){created++;return {chargeId:body.orderId};}if(path.includes('/charges/')){return {id:path.split('/').at(-1),status:'CHARGED',amount:100000,summary:{captured:100000,refunded:0}};}return {id:'agr_school',status:active?'ACTIVE':'STOPPED',start:'2027-01-29T12:00:00Z',pricing:{currency:'NOK',amount:100000}};};
 for(let cycle=0;cycle<11;cycle++){const now=Date.parse(dueDate(record.anchor,cycle));await reconcile({ref,record,db,api,timestamp:1,now,schedule:true});}
 assert.equal(created,10);assert.equal(active,false);assert.equal([...records.keys()].filter(key=>key.startsWith('donations/')).length,10);
});
test('uncaptured or failed charge does not reduce school balance or create another charge',async()=>{
 const {db,records}=database();const d=validateRecurring(input);const ref=db.collection('recurring_payment_agreements').doc(d.key);const record={...d,agreementId:'agr_test',anchor:Date.now()};await ref.set(record);await ref.collection('charges').doc('0').set({chargeId:'charge_test',amountOre:10000,cycle:0});let posts=0;const api=async(path,method)=>{if(method==='POST')posts++;return path.includes('/charges/')?{id:'charge_test',status:'FAILED',amount:10000,summary:{captured:0,refunded:0}}:{id:'agr_test',status:'ACTIVE',start:new Date().toISOString(),pricing:{currency:'NOK',amount:10000}};};await reconcile({ref,record,db,api,timestamp:1,schedule:true});assert.equal(posts,0);assert.equal([...records.keys()].filter(key=>key.startsWith('donations/')).length,0);
});
test('timed out charge creation resumes with identical idempotency and order ID',async()=>{
 const {db}=database();const details=validateRecurring(input);const ref=db.collection('recurring_payment_agreements').doc(details.key);const record={...details,agreementId:'agr_test',anchor:Date.now()};await ref.set(record);let first=true;const requests=[];const api=async(path,method,body,key)=>{if(method==='POST'){requests.push([body,key]);if(first){first=false;throw new Error('timeout');}return {chargeId:body.orderId};}return {id:'agr_test',status:'ACTIVE',start:new Date().toISOString(),pricing:{currency:'NOK',amount:10000}};};await assert.rejects(reconcile({ref,record,db,api,timestamp:1,schedule:true}),/timeout/);await reconcile({ref,record,db,api,timestamp:1,schedule:true});assert.deepEqual(requests[0],requests[1]);
});
test('month-end dates clamp without drifting subsequent months',()=>{assert.equal(dueDate(Date.parse('2027-01-31T12:00:00Z'),1),'2027-02-28');assert.equal(dueDate(Date.parse('2027-01-31T12:00:00Z'),2),'2027-03-31');});
test('monthly gifts continue beyond ten payments until the giver cancels',async()=>{
 const {db}=database();const details=validateRecurring(input);const ref=db.collection('recurring_payment_agreements').doc(details.key);const record={...details,agreementId:'agr_gift',provider:'vipps',anchor:Date.parse('2027-01-15T12:00:00Z')};await ref.set(record);let posts=0,stops=0;
 const api=async(path,method,body)=>{if(method==='PATCH'){stops++;return {};}if(method==='POST'){posts++;return {chargeId:body.orderId};}if(path.includes('/charges/'))return {id:path.split('/').at(-1),status:'CHARGED',amount:10000,summary:{captured:10000,refunded:0}};return {id:'agr_gift',status:'ACTIVE',start:'2027-01-13T12:00:00Z',pricing:{currency:'NOK',amount:10000}};};
 for(let cycle=0;cycle<13;cycle++)await reconcile({ref,record,db,api,timestamp:1,now:Date.parse(dueDate(record.anchor,cycle)),schedule:true});assert.equal(posts,13);assert.equal(stops,0);
});
test('Vipps school agreement can be linked to the authenticated student account',async()=>{
 const {db}=database();const schoolInput={...input,gift:false,studentName:'Elev',schoolYear:'2027',verifiedCentralUid:'student1'};const details=validateRecurring(schoolInput);await createAgreement({details,input:schoolInput,db,api:async()=>({agreementId:'agr_school',vippsConfirmationUrl:'https://api.vipps.no/approve'}),timestamp:1});
 const result=await require('./student-payment-account.cjs').schoolAccountService({body:{mode:'link',centralUid:'student1',year:'2027',kind:'plan',reference:details.key},db,timestamp:1});assert.equal(result.linked,true);const stored=await db.collection('recurring_payment_agreements').doc(details.key).get();assert.equal(stored.data().subscriptionId,'agr_school');
});
test('refunded Vipps charge updates the existing ledger entry without double counting',async()=>{
 const {db,records}=database();const details=validateRecurring(input);const ref=db.collection('recurring_payment_agreements').doc(details.key);const record={...details,agreementId:'agr_gift',anchor:Date.now()};await ref.set(record);await ref.collection('charges').doc('0').set({chargeId:'charge_refund',amountOre:10000,cycle:0});let refunded=false;
 const api=async path=>path.includes('/charges/')?{id:'charge_refund',amount:10000,status:refunded?'REFUNDED':'CHARGED',summary:{captured:10000,refunded:refunded?10000:0}}:{id:'agr_gift',status:'ACTIVE',start:new Date().toISOString(),pricing:{currency:'NOK',amount:10000}};
 await reconcile({ref,record,db,api,timestamp:1});refunded=true;await reconcile({ref,record,db,api,timestamp:2});const ledger=[...records.entries()].filter(([key])=>key.startsWith('donations/'));assert.equal(ledger.length,1);assert.equal(ledger[0][1].status,'refunded');assert.equal(ledger[0][1].amountNok,0);assert.equal(ledger[0][1].timestamp,1);
});
