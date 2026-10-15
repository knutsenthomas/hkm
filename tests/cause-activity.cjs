const assert=require('node:assert/strict');
const {summarizeCauseDonations}=require('../functions/cause-activity.cjs');
const result=summarizeCauseDonations([
 {id:'1',status:'completed',amountNok:250,donorEmail:' A@example.com '},
 {id:'2',status:'captured',amountOre:10000,donorEmail:'a@example.com'},
 {id:'3',status:'pending',amountNok:999,donorEmail:'b@example.com'},
 {id:'4',status:'refunded',amountNok:500,donorEmail:'b@example.com'},
 {id:'5',status:'succeeded',amountNok:25,userId:'u2'},
 {id:'6',status:'completed',amount:20,currency:'USD'},
 {id:'7',status:'completed',amountNok:10},
 {id:'8',status:'completed',amountNok:NaN}
]);
assert.deepEqual(result,{collected:385,donorCount:2,donationCount:4,anonymousDonationCount:1});
assert.deepEqual(summarizeCauseDonations([]),{collected:0,donorCount:0,donationCount:0,anonymousDonationCount:0});
assert.equal(JSON.stringify(result).includes('@'),false);
console.log('Passed: completed gifts, repeat donors, anonymous gifts, currency, pending/refunded exclusions and public aggregates.');
const {refreshCauseActivity}=require('../functions/cause-activity.cjs');
(async()=>{
 let records=[{id:'gift1',fund:'school',status:'completed',amountNok:100,donorEmail:'a@example.com'}];
 let publicData={campaigns:{hidden:{collected:50}}};
 const causes={items:[{id:'school',title:'School',active:true},{id:'hidden',status:'draft',active:true}]};
 const db={collection:name=>({doc:id=>({path:name+'/'+id}),where:(key,op,aliases)=>({aliases})}),runTransaction:async callback=>callback({
  get:async ref=>ref.path==='content/collection_causes'?{data:()=>causes}:ref.path==='content/cause_activity'?{data:()=>publicData}:{docs:records.filter(r=>ref.aliases.includes(r.fund)).map(r=>({id:r.id,data:()=>r}))},
  set:(ref,value)=>{publicData=value;}
 })};
 await refreshCauseActivity(db);assert.equal(publicData.campaigns.school.donorCount,1);assert.equal(publicData.campaigns.hidden,undefined);
 records=[];await refreshCauseActivity(db,['school']);assert.equal(publicData.campaigns.school.collected,0);assert.equal(publicData.campaigns.school.donorCount,0);
 assert.equal(JSON.stringify(publicData).includes('@'),false);
 console.log('Passed: aggregation refresh, deleted gifts, draft privacy and public output.');
})().catch(error=>{console.error(error);process.exitCode=1;});
