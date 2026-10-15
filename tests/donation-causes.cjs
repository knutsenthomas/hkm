const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');
const {validateRecurring}=require('../functions/recurring-payments.cjs');
const source=fs.readFileSync('js/donation-causes.js','utf8').replace(/^import .*;\n/,'').replace('export function','function');
const fixture={items:[{id:'skoleprosjekt',title:'Skoleprosjekt',description:'Støtt barn og skole',collected:1500,goal:10000,active:true},{id:'hidden',title:'Hidden',active:false}]};
(async()=>{
 for(const query of ['','?aksjon=skoleprosjekt','?aksjon=hidden']) {
  const dom=new JSDOM(fs.readFileSync('donasjoner.html','utf8'),{url:'https://example.com/donasjoner'+query});
  const context={console,document:dom.window.document,location:dom.window.location,URLSearchParams,Event:dom.window.Event,firebaseService:{getPageContent:async()=>fixture}};
  vm.createContext(context);vm.runInContext(source,context);await new Promise(resolve=>setImmediate(resolve));
  const document=dom.window.document;
  assert.equal(document.querySelectorAll('#donor-gift-fund option[value="skoleprosjekt"]').length,1);
  assert.equal(document.querySelector('#donor-gift-fund option[value="hidden"]'),null);
  if(!query) { assert.equal(document.querySelectorAll('.donor-campaign-card').length,1);assert.match(document.querySelector('.donor-campaign-card a').href,/aksjon=skoleprosjekt/); }
  else if(query.includes('skoleprosjekt')) { assert.equal(document.title,'Skoleprosjekt | His Kingdom Ministry');assert.equal(document.querySelector('#donor-gift-fund').value,'skoleprosjekt');assert.equal(document.querySelector('progress').value,1500); }
  else assert.match(document.querySelector('.donor-cause-notice').textContent,/ikke tilgjengelig/);
 }
 const result=validateRecurring({gift:true,amount:250,requestId:'12345678-1234-1234-1234-123456789abc',consent:true,customerDetails:{name:'Test Person',email:'test@example.com',fund:'skoleprosjekt'}});
 assert.equal(result.metadata.fund,'skoleprosjekt');
 const adminSource=fs.readFileSync('admin/js/admin.js','utf8');
 const markup=adminSource.slice(adminSource.indexOf('<dialog id="cause-form-modal"'),adminSource.indexOf('<!-- Manual In-Kind Modal -->'));
 const dom=new JSDOM(markup);dom.window.document.querySelector('dialog').close=()=>{};
 let saved;
 const context={document:dom.window.document,Date,console,firebaseService:{getPageContent:async()=>({items:[]}),savePageContent:async(id,data)=>{saved={id,data};}}};
 vm.createContext(context);
 const method=adminSource.slice(adminSource.indexOf('    async saveCause()'),adminSource.indexOf('    editCause(index)'));
 vm.runInContext('this.manager={'+method+",generateSlug:()=> 'ny-aksjon',loadCauses:async()=>{},showToast:()=>{}};",context);
 context.document.querySelector('#cause-title').value='Ny aksjon';context.document.querySelector('#cause-form-modal').dataset.editId='';
 await context.manager.saveCause();assert.equal(saved.data.items[0].active,true);assert.equal(saved.data.items[0].id,'ny-aksjon');
 saved=null;context.document.querySelector('#cause-goal').value='-10';await context.manager.saveCause();assert.equal(saved,null);
 console.log('Passed: creation/validation, public active list, dedicated campaign view, hidden campaigns and recurring fund preservation.');
})().catch(error=>{console.error(error);process.exitCode=1;});
