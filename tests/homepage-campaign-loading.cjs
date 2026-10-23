const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');const source=fs.readFileSync('js/content-manager.js','utf8');
const method=source.slice(source.indexOf('    async loadSpecializedContent() {'),source.indexOf('    async loadAndRenderLatestDesigns()'));
(async()=>{
 for(const file of ['index.html','en/index.html','es/index.html']){
  const dom=new JSDOM(fs.readFileSync(file,'utf8'));let resolveEvents,rendered,reads=0,timers=[];
  const context={window:dom.window,document:dom.window.document,console,setTimeout:fn=>timers.push(fn)};
  dom.window.firebaseService={_isSpeedTestingAgent:()=>true};
  vm.createContext(context);vm.runInContext('this.manager=({'+method+'});',context);
  const campaign={id:'school',title:'School campaign'};
  Object.assign(context.manager,{pageId:'index',_initialHeroLoaded:true,loadCauses:async()=>{reads++;return [campaign]},renderCauses:items=>rendered=items,reportError:()=>{},loadEvents:()=>new Promise(r=>resolveEvents=r),renderEvents:()=>{},enableHeroAnimations:()=>{},getContentDoc:()=>new Promise(()=>{})});
  const pending=context.manager.loadSpecializedContent();await new Promise(r=>setImmediate(r));
  assert.equal(rendered[0],campaign,'campaign must render even while events remain pending');assert.equal(reads,1);
  resolveEvents([]);await pending;
  dom.window.dispatchEvent(new dom.window.Event('load'));
  for(const fn of timers)fn();
  await new Promise(r=>setImmediate(r));assert.equal(reads,1,'deferred content must not fetch campaigns again');assert.equal(rendered[0],campaign);
  dom.window.close();
 }
 console.log('Passed: homepage campaigns render independently of slow events, observers and deferred collections on NO/EN/ES.');
})().catch(e=>{console.error(e);process.exitCode=1});
