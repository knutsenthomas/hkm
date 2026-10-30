const test = require('node:test');
const assert = require('node:assert/strict');
const { ledgerRecord, sync, saveOrder, linkOwnOrders } = require('./store-order-sync.cjs');
const Timestamp={now:()=>1,fromDate:date=>date.toISOString()};
const order={_id:'order-1',number:'10001',_createdDate:'2020-01-01T00:00:00Z',currency:'NOK',priceSummary:{total:{amount:'500.00'}},paymentStatus:'PAID',status:'APPROVED',buyerInfo:{email:'buyer@example.org'}};
const auth={getUserByEmail:async()=>({uid:'buyer',emailVerified:true})};
function database() {
  const records = new Map();
  function ref(path) {
    return { id: path.split('/').at(-1),
      get: async () => ({ exists: records.has(path), data: () => records.get(path) }),
      set: async (data, options) => records.set(path, options?.merge ? { ...records.get(path), ...data } : data),
    };
  }
  return { records, collection: name => ({
    doc: id => ref(`${name}/${id}`),
    where: (field, op, value) => ({ get: async () => ({ docs: [...records].filter(([key, data]) => key.startsWith(`${name}/`) && data[field] === value).map(([key]) => ({ id: key.split('/')[1] })) }) }),
  }), runTransaction: async fn => fn({ get: r => r.get(), set: (r,d,o) => r.set(d,o), update: (r,d) => r.set(d,{merge:true}) }) };
}
test('old orders remain archived, and replay/refund updates one purchase',async()=>{
 const db=database();
 await saveOrder({db,auth,order,Timestamp});
 await saveOrder({db,auth,order:{...order,paymentStatus:'PARTIALLY_REFUNDED',balanceSummary:{paid:{amount:'500'},refunded:{amount:'200'}}},Timestamp});
 assert.equal(db.records.size,2);
 const record=db.records.get('donations/wix-order-order-1');
 assert.equal(record.amountNok,300);assert.equal(record.refundedAmount,200);assert.equal(record.userId,'buyer');assert.equal(record.donorEmail,undefined);
 assert.equal(db.records.get('wix_order_imports/order-1').order._createdDate,order._createdDate);
});
test('full refund, unpaid and cancellation are retained with accurate statuses',()=>{
 assert.equal(ledgerRecord({...order,paymentStatus:'FULLY_REFUNDED',balanceSummary:{paid:{amount:'500'},refunded:{amount:'500'}}},Timestamp).amount,0);
 assert.equal(ledgerRecord({...order,paymentStatus:'NOT_PAID'},Timestamp).status,'pending');
 assert.equal(ledgerRecord({...order,status:'CANCELED'},Timestamp).status,'cancelled');
 assert.throws(()=>ledgerRecord({...order,priceSummary:{total:{amount:'NaN'}}},Timestamp));
});
test('budget resumes older pages rather than truncating history at 100 orders',async()=>{
 const db=database(),pages=[];
 const api=async page=>{pages.push(page);return page.lane==='all'&&!page.cursor?{orders:[order],nextCursor:'older'}:{orders:[],nextCursor:null};};
 assert.equal((await sync({db,auth,Timestamp,api,pageBudget:1})).complete,false);
 assert.equal(db.records.get('integration_state/wix_store_orders').cursor,'older');
 assert.equal((await sync({db,auth,Timestamp,api,pageBudget:5})).complete,true);
 assert.deepEqual(pages[1],{lane:'all',cursor:'older'});
 assert.ok(db.records.has('wix_order_imports/order-1'));
});
test('failed page never advances durable cursor or deletes archived orders',async()=>{
 const db=database();await saveOrder({db,auth,order,Timestamp});
 await assert.rejects(sync({db,auth,Timestamp,api:async()=>{throw Error('upstream-down')}}));
 assert.equal(db.records.has('integration_state/wix_store_orders'),false);assert.ok(db.records.has('wix_order_imports/order-1'));
});
test('only verified customer accounts get purchase ownership',async()=>{
 const db=database();await saveOrder({db,auth:{getUserByEmail:async()=>({uid:'buyer',emailVerified:false})},order,Timestamp});
 assert.equal(db.records.get('donations/wix-order-order-1').userId,null);
 await linkOwnOrders({db,user:{uid:'buyer',emailVerified:true,email:'buyer@example.org'}});
 assert.equal(db.records.get('donations/wix-order-order-1').userId,'buyer');
 await linkOwnOrders({db,user:{uid:'other',emailVerified:true,email:'buyer@example.org'}});
 assert.equal(db.records.get('donations/wix-order-order-1').userId,'buyer');
});
