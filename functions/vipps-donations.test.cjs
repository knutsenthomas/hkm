const test = require('node:test');
const assert = require('node:assert/strict');
const { createApi, findOwner, paymentRecord, importPayment, sync, linkOwnDonations } = require('./vipps-donations.cjs');
const Timestamp = { fromDate: d => d.toISOString(), now: () => 'now' };
const payment = { transactionReference: 'tx-1', recipientHandle: 'NO:98843', currency: 'NOK', amount: '50001', capturedAt: '2026-10-30T10:00:00.1234567Z', payer: { name: 'Test', phoneNumber: '4799999999' }, externalReference: 'hkpc' };
const missing = async () => { throw Object.assign(new Error(), { code: 'auth/user-not-found' }); };
const auth = { getUserByPhoneNumber: missing, getUserByEmail: missing };
function database() {
  const records = new Map();
  function ref(path) {
    return { path, id: path.split('/').at(-1),
      get: async () => ({ exists: records.has(path), data: () => records.get(path) }),
      set: async (data, options) => records.set(path, options?.merge ? { ...records.get(path), ...data } : data),
    };
  }
  const db = { records, collection: name => ({
    doc: id => ref(`${name}/${id}`),
    where: (field, op, value) => ({ get: async () => ({ docs: [...records].filter(([key, data]) => key.startsWith(`${name}/`) && data[field] === value).map(([key]) => ({ id: key.split('/')[1], data: () => records.get(key) })) }) }),
  }), runTransaction: async fn => fn({ get: r => r.get(), set: (r,d,o) => r.set(d,o), update: (r,d) => r.set(d,{merge:true}) }) };
  return db;
}
test('merchant auth uses Basic form auth and never a subscription key', async () => {
  const calls = [];
  const api = await createApi({ clientId: 'id', clientSecret: 'secret', fetchImpl: async (url, options) => {
    calls.push({url,options}); return {ok:true,json:async()=> calls.length === 1 ? {access_token:'token'} : {payments:[]}};
  } });
  await api('/donations/v1/reports/payments');
  assert.equal(calls[0].options.body, 'grant_type=client_credentials');
  assert.equal(calls[0].options.headers.Authorization, `Basic ${Buffer.from('id:secret').toString('base64')}`);
  assert.equal(calls[1].options.headers.Authorization, 'Bearer token');
  assert.equal(calls[0].options.headers['Ocp-Apim-Subscription-Key'], undefined);
});
test('unverified profile email and conflicting verified identities never assign a gift', async () => {
  assert.equal(await findOwner({...auth,getUserByEmail:async()=>({uid:'a',emailVerified:false})},{email:'a@example.org',emailVerified:true}),null);
  assert.equal(await findOwner({...auth,getUserByPhoneNumber:async()=>({uid:'a'}),getUserByEmail:async()=>({uid:'b',emailVerified:true})},{phoneNumber:'4799999999',email:'b@example.org',emailVerified:true}),null);
  assert.equal(await findOwner({...auth,getUserByPhoneNumber:async()=>({uid:'a'})},payment.payer),'a');
});
test('amount is converted from øre; source and timestamp validation fail closed', () => {
  assert.equal(paymentRecord(payment,'time','hkpc').data.amountNok,500.01);
  for (const changes of [{amount:'NaN'},{amount:'1.5'},{amount:'-1'},{currency:'EUR'},{capturedAt:'invalid'},{transactionReference:''}]) {
    assert.throws(()=>paymentRecord({...payment,...changes},'time','hkpc'));
  }
});
test('retry creates one gift, keeps verified ownership and protects donor contact details', async () => {
  const db = database();
  const args = {db,auth:{...auth,getUserByPhoneNumber:async()=>({uid:'owner'})},api:async()=>{},payment,Timestamp,funds:{hkpc:'hkpc'}};
  const id = await importPayment(args);
  await importPayment({...args,auth});
  const gifts = [...db.records].filter(([key])=>key.startsWith('donations/'));
  assert.equal(gifts.length,1);
  assert.equal(db.records.get(`donations/${id}`).userId,'owner');
  assert.equal(db.records.get(`donations/${id}`).fund,'hkpc');
  assert.equal(db.records.get(`donations/${id}`).donorEmail,undefined);
  assert.equal(db.records.get(`donations/${id}`).donorPhone,undefined);
});
test('inclusive pagination preserves provider precision and saves cursor only after completion', async () => {
  const db = database(); let calls = 0; const paths = [];
  const result = await sync({db,auth,Timestamp,now:new Date('2026-10-30T11:00:00Z'),api:async path=>{paths.push(path); calls++; return {payments:calls<=2?[payment]:[]};}});
  assert.equal(result.imported,1);
  assert.equal(new URL(`https://api.vipps.no${paths[1]}`).searchParams.get('from'),payment.capturedAt);
  assert.equal(new URL(`https://api.vipps.no${paths[0]}`).searchParams.get('recipientHandles'),'NO:98843');
  assert.equal(db.records.get('integration_state/vipps_donations').cursor,'2026-10-30T11:00:00.000Z');
  const broken = database();
  await assert.rejects(sync({db:broken,auth,Timestamp,maxPages:1,api:async()=>({payments:[payment]})}));
  assert.equal(broken.records.has('integration_state/vipps_donations'),false);
});
test('later verified sign-in links unassigned gifts but never reassigns ownership', async () => {
  const db=database();
  const id=await importPayment({db,auth,api:async()=>{},payment,Timestamp,funds:{}});
  const user={uid:'a',phoneNumber:'+4799999999'};
  const verifiedAuth={...auth,getUserByPhoneNumber:async()=>user};
  await linkOwnDonations({db,auth:verifiedAuth,user});
  assert.equal(db.records.get(`donations/${id}`).userId,'a');
  await linkOwnDonations({db,auth:{...auth,getUserByPhoneNumber:async()=>({uid:'b'})},user:{...user,uid:'b'}});
  assert.equal(db.records.get(`donations/${id}`).userId,'a');
});
