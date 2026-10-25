const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {JSDOM}=require('jsdom');
const source=fs.readFileSync('js/newsletter-signup.js','utf8').replace("import './newsletter-signup.css';",'').replace('export function','function');
function setup(path='/',dismissed=false) {
 const dom=new JSDOM('<footer class="footer"><div class="footer-bottom"></div></footer>',{url:'https://hiskingdomministry.no'+path,pretendToBeVisual:true});
 dom.window.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};
 dom.window.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');this.dispatchEvent(new dom.window.Event('close'));};
 if(dismissed)dom.window.localStorage.setItem('hkm_newsletter_dismissed_at',String(Date.now()));
 const timers=[],writes=[];let fail=false;
 dom.window.firebaseService={isInitialized:true,subscribeNewsletter:async(email,options)=>{if(fail)throw new Error('offline');writes.push({email,options});}};
 const context={window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage,setTimeout:fn=>timers.push(fn),Date,console};
 vm.createContext(context);vm.runInContext(source+';globalThis.mount=mountNewsletterSignup;',context);
 return {dom,timers,writes,mount:context.mount,fail:()=>fail=true};
}
(async()=>{
 const fixture=setup('/en');fixture.mount('en');fixture.mount('en');
 const document=fixture.dom.window.document;
 assert.equal(document.querySelectorAll('dialog').length,1);assert.equal(fixture.timers.length,1);
 fixture.timers[0]();const dialog=document.querySelector('dialog');assert.equal(dialog.open,true);
 const form=dialog.querySelector('form');form.elements.email.value='person@example.com';
 await form.onsubmit({preventDefault(){}});assert.equal(fixture.writes.length,0,'Consent is required');
 assert.equal(form.elements.subscriberName.required,false);form.elements.subscriberName.value='  Jane Doe  ';
 form.elements.consent.checked=true;await form.onsubmit({preventDefault(){}});
 assert.equal(fixture.writes.length,1);assert.equal(fixture.writes[0].options.name,'Jane Doe');assert.equal(fixture.writes[0].options.language,'en');assert.equal(fixture.writes[0].options.source,'website_popup');
 assert.equal(form.hidden,true);assert.equal(fixture.dom.window.localStorage.getItem('hkm_newsletter_subscribed'),'1');
 assert.match(dialog.querySelector('[role=status]').textContent,/saved/);
 dialog.querySelector('.hkm-newsletter-close').click();assert.equal(dialog.open,false);
 const recent=setup('/',true);recent.mount('no');assert.equal(recent.timers.length,0);
 recent.dom.window.document.querySelector('.hkm-open-newsletter').click();assert.equal(recent.dom.window.document.querySelector('dialog').open,true);
 const other=setup('/donasjoner');other.mount('no');assert.equal(other.timers.length,0);
 other.fail();const otherForm=other.dom.window.document.querySelector('form');otherForm.elements.email.value='person@example.com';otherForm.elements.consent.checked=true;
 await otherForm.onsubmit({preventDefault(){}});assert.equal(otherForm.hidden,false);assert.match(other.dom.window.document.querySelector('[role=status]').textContent,/ikke lagres/);
 assert.equal(other.dom.window.localStorage.getItem('hkm_newsletter_subscribed'),null);
 // Verify the storage adapter writes the same language marker used by campaign dispatch.
 const serviceSource=fs.readFileSync('js/firebase-service.js','utf8');
 const method=serviceSource.slice(serviceSource.indexOf('    async subscribeNewsletter('),serviceSource.indexOf('    connectToGoogle()'));
 let saved;
 const context={document:fixture.dom.window.document,firebase:{firestore:{FieldValue:{serverTimestamp:()=> 'server-time'}}}};
 vm.createContext(context);vm.runInContext('globalThis.service={isInitialized:true,db:{collection:name=>({add:async data=>{globalThis.saved={name,data};}})},'+method+'};',context);
 await context.service.subscribeNewsletter(' PERSON@Example.com ',{name:'  Jane Doe  ',language:'en',source:'website_popup'});
 assert.equal(context.saved.data.name,'Jane Doe');assert.equal(context.saved.data.email,'person@example.com');assert.equal(context.saved.data.tags[0],'engelsk');assert.equal(context.saved.name,'newsletter_subscriptions');
 await context.service.subscribeNewsletter('noname@example.com');assert.equal('name' in context.saved.data,false);
 await assert.rejects(context.service.subscribeNewsletter('invalid'));
 console.log('Passed: popup timing, reopen/dismiss, consent, English routing metadata, successful/failed submissions and normalized Firestore writes. No real subscriptions or emails created.');
})().catch(error=>{console.error(error);process.exitCode=1;});
