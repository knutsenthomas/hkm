const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');
const {validateRecurring}=require('../functions/recurring-payments.cjs');
const source=fs.readFileSync('js/donation-causes.js','utf8').replace(/^import .*;\n/gm,'').replaceAll('export function','function');
const fixture={items:[{id:'skoleprosjekt',title:'Skoleprosjekt',description:'Støtt barn og skole',collected:1500,goal:10000,active:true,infoUrl:'https://example.com/more'},{id:'hidden',title:'Hidden',active:false}]};
(async()=>{
 for(const query of ['','?aksjon=skoleprosjekt','?aksjon=hidden']) {
  const dom=new JSDOM(fs.readFileSync('donasjoner.html','utf8'),{url:'https://example.com/donasjoner'+query});
  const context={console,document:dom.window.document,location:dom.window.location,URL,URLSearchParams,Event:dom.window.Event,firebaseService:{invalidatePageContentCache:()=>{},getPageContent:async()=>fixture}};
  vm.createContext(context);vm.runInContext(source,context);await new Promise(resolve=>setImmediate(resolve));
  const document=dom.window.document;
  assert.equal(document.querySelectorAll('#donor-gift-fund option[value="skoleprosjekt"]').length,1);
  assert.equal(document.querySelector('#donor-gift-fund option[value="hidden"]'),null);
  if(!query) { assert.equal(document.querySelectorAll('.donor-campaign-card').length,1);assert.match(document.querySelector('.donor-campaign-card a.btn').href,/aksjon=skoleprosjekt/); }
  else if(query.includes('skoleprosjekt')) { assert.equal(document.title,'Skoleprosjekt | His Kingdom Ministry');assert.equal(document.querySelector('.donor-photo-hero-copy > p').hidden,true);assert.equal(document.querySelector('#donor-intro-title').hidden,true);assert.equal(document.querySelector('.donor-welcome-lead').textContent,'Støtt barn og skole');assert.equal(document.querySelector('#donor-gift-fund').value,'skoleprosjekt');assert.equal(document.querySelector('progress').value,1500);assert.equal(document.querySelector('.donor-cause-more').href,'https://example.com/more'); }
  else assert.match(document.querySelector('.donor-cause-notice').textContent,/ikke tilgjengelig/);
 }
 for (const [path,lang] of [['en/donations.html','en'],['es/donaciones.html','es']]) {
  const dom=new JSDOM(fs.readFileSync(path,'utf8'),{url:'https://example.com/'+path+'?aksjon=skoleprosjekt'});
  const localized={items:[{...fixture.items[0],translations:{[lang]:{title:'Translated title',description:'Translated description',heroIntro:'A short introduction'}},giving:{amountMode:'fixed',amounts:[750],frequency:'once'}}]};
  const context={console,document:dom.window.document,location:dom.window.location,URL,URLSearchParams,Event:dom.window.Event,firebaseService:{invalidatePageContentCache:()=>{},getPageContent:async()=>localized}};
  vm.createContext(context);vm.runInContext(source,context);await new Promise(resolve=>setImmediate(resolve));
  assert.equal(context.document.querySelector('#donor-welcome-title').textContent,'Translated title');
  assert.equal(context.document.querySelector('.donor-photo-hero-copy > p').textContent,'A short introduction');
  assert.equal(context.document.querySelector('.donor-photo-hero-copy > p').hidden,false);
  assert.equal(context.document.querySelector('#donor-gift-amount').value,'750');
  assert.equal(context.document.querySelector('#donor-gift-amount').readOnly,true);
  assert.equal(context.document.querySelector('[name=frequency][value=monthly]').disabled,true);
 }
 const result=validateRecurring({gift:true,amount:250,requestId:'12345678-1234-1234-1234-123456789abc',consent:true,customerDetails:{name:'Test Person',email:'test@example.com',fund:'skoleprosjekt'}});
 assert.equal(result.metadata.fund,'skoleprosjekt');
 const adminSource=fs.readFileSync('admin/js/admin.js','utf8');
 const markup=adminSource.slice(adminSource.indexOf('<dialog id="cause-form-modal"'),adminSource.indexOf('<!-- Manual In-Kind Modal -->'));
 const dom=new JSDOM(markup);dom.window.document.querySelector('dialog').close=()=>{};
 let saved;
 const context={document:dom.window.document,Date,URL,console,firebaseService:{invalidatePageContentCache:()=>{},getPageContent:async()=>({items:[]}),savePageContent:async(id,data)=>{saved={id,data};}}};
 vm.createContext(context);
 const method=adminSource.slice(adminSource.indexOf('    toggleCauseGivingFields()'),adminSource.indexOf('    editCause(index)'));
 vm.runInContext('this.manager=new (class {'+method+"})();Object.assign(this.manager,{_translateTextChunk:async(text,lang)=>lang+':'+text,generateSlug:()=> 'ny-aksjon',loadCauses:async()=>{},showToast:()=>{}});",context);
 context.document.querySelector('#cause-title').value='Ny aksjon';context.document.querySelector('#cause-hero-intro').value='Kort intro';context.document.querySelector('#cause-info-url').value='https://example.com/info';context.document.querySelector('#cause-form-modal').dataset.editId='';
 await context.manager.saveCause();assert.equal(saved.data.items[0].active,true);assert.equal(saved.data.items[0].id,'ny-aksjon');
 assert.equal(saved.data.items[0].infoUrl,'https://example.com/info');
 assert.equal(saved.data.items[0].translations.en.title,'en:Ny aksjon');assert.equal(saved.data.items[0].heroIntro,'Kort intro');assert.equal(saved.data.items[0].translations.es.heroIntro,'es:Kort intro');
 await context.manager.saveCause(true);assert.equal(saved.data.items[0].status,'draft');assert.equal(saved.data.items[0].active,false);
 context.document.querySelector('#cause-amount-mode').value='fixed';context.document.querySelector('#cause-fixed-amount').value='750';
 await context.manager.saveCause();assert.equal(saved.data.items[0].giving.amounts[0],750);
 context.firebaseService.uploadImage=async()=> 'https://example.com/image.jpg';
 await context.manager.uploadCauseImage({name:'photo.jpg',type:'image/jpeg',size:100});assert.equal(context.document.querySelector('#cause-image').value,'https://example.com/image.jpg');
 assert.equal(context.document.querySelector('#cause-image-preview').hidden,false);
 context.document.querySelector('#cause-info-url').value='javascript:alert(1)';saved=null;await context.manager.saveCause();assert.equal(saved,null);
 context.document.querySelector('#cause-info-url').value='';
 context.manager._translateTextChunk=async()=>{throw Error('Unavailable');};
 await context.manager.saveCause(true);assert.equal(saved.data.items[0].translationStatus,'pending');assert.equal(saved.data.items[0].active,false);
 await context.manager.saveCause();assert.equal(saved.data.items[0].translationStatus,'pending');assert.equal(saved.data.items[0].active,true);
 assert.equal(saved.data.items[0].image,'https://example.com/image.jpg');
 saved=null;context.document.querySelector('#cause-goal').value='-10';await context.manager.saveCause();assert.equal(saved,null);
 console.log('Passed: creation/validation, public active list, dedicated campaign view, hidden campaigns and recurring fund preservation.');
})().catch(error=>{console.error(error);process.exitCode=1;});
