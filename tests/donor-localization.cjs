const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');
const pages=[['index.html','/','no'],['en/index.html','/en','en'],['es/index.html','/es','es'],['donasjoner.html','/donasjoner','no'],['en/donations.html','/en/donations','en'],['es/donaciones.html','/es/donaciones','es']];
for(const[file,path,lang]of pages){
 const dom=new JSDOM(fs.readFileSync(file,'utf8'),{url:'https://example.com'+path});const{document,Event}=dom.window;
 assert.equal(document.querySelectorAll('#donor-gift-form').length,1,file);
 if(file.endsWith('index.html')){assert.ok(document.querySelector('script[src$="js/home-giving.js"]'),file);assert.ok(document.querySelector('link[href$="css/home-giving.css"]'),file)}
 const ctx={document,window:dom.window,location:dom.window.location,console,URL,URLSearchParams,Event,navigator:{clipboard:{writeText:async()=>{}}},setTimeout:fn=>{fn();return 1},queueMicrotask:fn=>fn(),fetch:()=>{throw Error('No payment requests in localization test')}};
 vm.createContext(ctx);vm.runInContext(fs.readFileSync('js/donor-page.js','utf8'),ctx);vm.runInContext(fs.readFileSync('js/vipps-recurring.js','utf8'),ctx);
 for(const frequency of ['monthly','once'])for(const method of ['vipps','stripe','paypal','bank']){
  const form=document.getElementById('donor-gift-form');form.querySelector(`[name=frequency][value=${frequency}]`).checked=true;
  const payment=form.querySelector(`[name=gift-payment][value=${method}]`);payment.checked=true;payment.dispatchEvent(new Event('change'));
  vm.runInContext(`openAgreementModal('${method}')`,ctx);const modal=document.getElementById('vipps-recurring-modal');assert.ok(modal,file);
  assert.match(modal.querySelector('.hkm-gift-summary').textContent,/250/);
  if(lang!=='no'){
   assert.doesNotMatch(modal.textContent,/måned|Gavebeløp|Kopier|Endre|nettbank|Kontonummer|Fortsett/,file+' '+method+' '+frequency);
   assert.equal(modal.querySelector('#hkm-modal-close-btn').getAttribute('aria-label'),lang==='en'?'Close':'Cerrar');
   assert.equal(modal.querySelector('.hkm-gift-edit').textContent,lang==='en'?'Edit':'Cambiar');
   if(frequency==='monthly')assert.match(modal.querySelector('.hkm-gift-summary strong').textContent,lang==='en'?/month/:/mes/);
   assert.doesNotMatch(document.getElementById('donor-bank-instructions').textContent,/Opprett|Overfør|nettbank/);
  }
  modal.querySelector('#hkm-modal-close-btn').click();
 }
}
console.log('Passed: homepage and donation pages in Norwegian, English and Spanish; 48 frequency/provider combinations, clean-language roots and localized bank/checkout controls.');
