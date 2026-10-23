const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');
const source=fs.readFileSync('js/content-manager.js','utf8');
const init=source.slice(source.indexOf('    async init() {'),source.indexOf('    async handleSEO('));
(async()=>{
 for(const file of ['index.html','en/index.html','es/index.html']){
  for(const failed of [false,true]){
   const dom=new JSDOM(fs.readFileSync(file,'utf8'),{url:'https://example.com/'+file});
   let resolveDocs,requested,sequence=[];
   const context={window:dom.window,document:dom.window.document,CustomEvent:dom.window.CustomEvent,URLSearchParams,console,pageCache:{get:key=>key==='hkm_cache_hero_slides'?JSON.stringify({slides:[{title:'Outdated cached hero'}]}):null}};
   dom.window.firebaseService={isInitialized:true};
   vm.createContext(context);vm.runInContext('this.manager=({'+init+'});',context);
   Object.assign(context.manager,{pageId:'index',getContentDocs:ids=>{requested=ids;return new Promise(r=>resolveDocs=r)},setContentReady:ready=>{sequence.push('ready:'+ready);dom.window.document.body.classList.toggle('cms-content-ready',ready)},setLoading:loading=>sequence.push('loading:'+loading),cacheLocalJson:()=>{},renderHeroSlides:slides=>sequence.push('hero:'+slides[0].title),updateDOM:()=>sequence.push('page'),loadSpecializedContent:async()=>{},reportError:()=>{}});
   const pending=context.manager.init();
   assert.ok(requested.includes('hero_slides'));assert.equal(sequence.includes('ready:true'),false);
   assert.equal(sequence.some(x=>x.startsWith('hero:')),false,'stale hero must not render');
   // Even if a legacy safety timer removes the body loader, the hero stays masked.
   dom.window.document.body.classList.remove('cms-loading');
   assert.match(fs.readFileSync(file,'utf8'),/body\.page-index:not\(\.cms-content-ready\) \.hero-slider > \*/);
   resolveDocs(failed?{}:{index:{title:'Current page'},hero_slides:{slides:[{title:'Current hero'}]}});
   await pending;
   if(!failed){assert.ok(sequence.indexOf('page')<sequence.indexOf('hero:Current hero'));assert.ok(sequence.indexOf('hero:Current hero')<sequence.indexOf('ready:true'));assert.equal(context.manager._initialHeroLoaded,true)}
   assert.equal(dom.window.document.body.classList.contains('cms-content-ready'),true,'settled failure must not leave the hero hidden');
   assert.equal(sequence.includes('loading:false'),true);
   dom.window.close();
  }
 }
 console.log('Passed: current homepage hero before reveal, no stale cached hero, delayed requests and settled fallback on NO/EN/ES.');
})().catch(e=>{console.error(e);process.exitCode=1});
