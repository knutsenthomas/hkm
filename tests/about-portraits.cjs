const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');
const source=fs.readFileSync('js/content-manager.js','utf8');
const method=source.slice(source.indexOf('    updateDOM(data,'),source.indexOf('    applyGlobalSettings(data)'));
for(const file of ['om-oss.html','en/about.html','es/sobre-nosotros.html']){
 const dom=new JSDOM(fs.readFileSync(file,'utf8'),{url:'https://example.com/'+file});
 const context={window:dom.window,document:dom.window.document,CustomEvent:dom.window.CustomEvent,console};
 vm.createContext(context);vm.runInContext('this.manager=({pageId:"om-oss",getValueByPath(obj,path){return path.split(".").reduce((v,k)=>v?.[k],obj)},'+method+'});',context);
 for(const prefix of ['','./','../']){
  context.manager.updateDOM({team:{hilde:{image:prefix+'img/Hilde%20Karin%20Knutsen.jpg'},thomas:{image:prefix+'img/Thomas.jpeg'}}});
  for(const img of dom.window.document.querySelectorAll('img[data-content-key^="team."]')){
   assert.equal(new URL(img.src).pathname.startsWith('/img/'),true,file+' '+img.src);
   assert.ok(fs.existsSync('.'+decodeURIComponent(new URL(img.src).pathname)));
  }
 }
 const thomas=dom.window.document.querySelector('[data-content-key="team.thomas.image"]');
 context.manager.updateDOM({team:{thomas:{image:'https://example.com/unavailable.jpg'}}});
 thomas.dispatchEvent(new dom.window.Event('error'));
 assert.equal(thomas.getAttribute('src'),'/img/Thomas.jpeg');
 context.manager.updateDOM({team:{thomas:{image:''}}});assert.equal(thomas.getAttribute('src'),'/img/Thomas.jpeg');
 dom.window.close();
}
console.log('Passed: NO/EN/ES portraits, CMS root-relative paths and unavailable/empty image fallback.');
