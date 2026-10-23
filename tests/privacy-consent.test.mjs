import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';
const source=fs.readFileSync(new URL('../public/privacy-consent.js',import.meta.url),'utf8');
function setup({saved,path='/',blocked=false}={}){
 const dom=new JSDOM('<html lang="no"><head></head><body><main></main><footer><a data-cookie-settings-link>Cookies</a></footer></body></html>',{url:'https://hiskingdomministry.no'+path});
 const w=dom.window,d=w.document,script=d.createElement('script');
 Object.assign(script.dataset,{key:'hkm-privacy-v1',ga:'G-TEST123',media:'true',privacy:'/personvern.html'});
 Object.defineProperty(d,'currentScript',{value:script});
 if(saved)w.localStorage.setItem('hkm-privacy-v1',JSON.stringify(saved));
 const where=new URL(w.location.href);let reloads=0;where.reload=()=>reloads++;
 const storage=blocked?{getItem(){throw Error('blocked')},setItem(){throw Error('blocked')}}:w.localStorage;
 vm.runInNewContext(source,{window:w,document:d,localStorage:storage,location:where,history:w.history,navigator:w.navigator,CustomEvent:w.CustomEvent,MutationObserver:w.MutationObserver,Date,URL,Promise,setInterval(){}});
 d.dispatchEvent(new w.Event('DOMContentLoaded'));
 return{w,d,p:w.SitePrivacy,reloads:()=>reloads};
}
const tick=async()=>{await Promise.resolve();await Promise.resolve();};
test('old consent cannot authorize new category; necessary features are explained',()=>{
 const s=setup({saved:{version:1,analytics:true,marketing:false,savedAt:Date.now()}});
 assert.equal(s.p.allows('analytics'),false);assert.equal(s.p.allows('media'),false);
 assert.equal(s.d.querySelectorAll('#site-privacy-banner input').length,2);
 assert.match(s.d.querySelector('#site-privacy-banner').textContent,/Firebase.*Wix Inbox/);
 assert.equal(s.d.querySelector('script[src]'),null);s.w.close();
});
test('CMS and dynamic players remain inert before consent; allow and revoke work',async()=>{
 const s=setup();const html=s.p.protectMediaHtml('<iframe src="https://www.youtube.com/embed/example"></iframe><iframe src="https://player.vimeo.com/video/123"></iframe>');
 assert.equal(/\ssrc=/.test(html),false);s.d.querySelector('main').innerHTML=html;await tick();
 const frames=[...s.d.querySelectorAll('iframe')];assert.ok(frames.every(f=>!f.hasAttribute('src')));
 assert.equal(s.d.querySelectorAll('[data-privacy-placeholder]').length,2);
 s.p.choose(false,false,false);assert.ok(frames.every(f=>!f.hasAttribute('src')));
 s.p.choose(false,false,true);assert.ok(frames.every(f=>f.getAttribute('src')?.startsWith('https://')));
 assert.equal(s.d.querySelectorAll('[data-privacy-placeholder]').length,0);assert.equal(s.d.querySelector('script[src]'),null);
 s.p.choose(false,false,false);assert.ok(frames.every(f=>!f.hasAttribute('src')));assert.equal(s.reloads(),1);s.w.close();
});
test('portal media approval does not turn on analytics',()=>{
 const s=setup({path:'/minside/spiller.html'});s.p.choose(true,false,true);assert.equal(s.p.allows('analytics'),false);assert.equal(s.p.allows('media'),true);assert.equal(s.d.querySelector('script[src]'),null);s.w.close();
});
test('cross-tab withdrawal stops loaded media',async()=>{
 const s=setup();s.d.querySelector('main').innerHTML='<iframe data-privacy-src="https://www.youtube.com/embed/example"></iframe>';s.p.choose(false,false,true);await tick();
 s.w.localStorage.setItem('hkm-privacy-v1',JSON.stringify({version:2,analytics:false,marketing:false,media:false,savedAt:Date.now()}));
 s.w.dispatchEvent(new s.w.StorageEvent('storage',{key:'hkm-privacy-v1'}));assert.equal(s.d.querySelector('iframe').hasAttribute('src'),false);assert.equal(s.reloads(),1);s.w.close();
});
test('blocked storage fails closed and supports per-visit choices',()=>{
 const s=setup({blocked:true});assert.equal(s.p.allows('media'),false);s.p.choose(false,false,true);assert.equal(s.p.allows('media'),true);s.w.close();
});
test('payment SDK loads only on request and retries a failed load',async()=>{
 const s=setup();s.p.choose(false,false,false);assert.equal(s.d.querySelector('script[src]'),null);
 const a=s.p.loadStripe(),b=s.p.loadStripe();assert.equal(a,b);const script=s.d.querySelector('script[src]');assert.equal(script.src,'https://js.stripe.com/v3/');
 s.w.Stripe=()=>({});script.onload();assert.equal(await a,s.w.Stripe);s.w.close();
 const r=setup(),failed=r.p.loadStripe();r.d.querySelector('script[src]').onerror();await assert.rejects(failed);const next=r.p.loadStripe();r.w.Stripe=()=>({});r.d.querySelector('script[src]').onload();assert.equal(await next,r.w.Stripe);r.w.close();
});
test('opening chat is required before creating a browser identity',()=>{
 const dom=new JSDOM('<html lang="no"><head></head><body></body></html>',{url:'https://hiskingdomministry.no'}),w=dom.window;let fetches=0;
 const chat=fs.readFileSync(new URL('../js/hkm-chat-widget.js',import.meta.url),'utf8').replace('export function initHkmChatWidget','function initHkmChatWidget');
 vm.runInNewContext(chat+'\ninitHkmChatWidget();',{window:w,document:w.document,localStorage:w.localStorage,sessionStorage:w.sessionStorage,navigator:w.navigator,crypto:w.crypto,location:w.location,console,setTimeout(){},setInterval(){return 1},clearInterval(){},fetch(){fetches++;throw Error('not expected')}});
 assert.equal(w.localStorage.length,0);assert.equal(w.sessionStorage.length,0);assert.equal(fetches,0);w.document.querySelector('#hkm-chat-launcher').click();assert.ok(w.sessionStorage.getItem('hkm_chat_anon_id'));assert.equal(w.localStorage.length,0);assert.equal(fetches,0);w.close();
});
test('rejected optional consent still permits the existing card flow with unchanged request data',async()=>{
 const s=setup();s.p.choose(false,false,false);
 s.d.querySelector('main').innerHTML='<div id="stripe-checkout-container"><div id="payment-element"></div></div>';
 s.d.querySelector('#stripe-checkout-container').scrollIntoView=()=>{};
 const requests=[],mounts=[],alerts=[];
 const stripeMock={elements(options){assert.equal(options.clientSecret,'mock_secret');return{create(type){assert.equal(type,'payment');return{mount(node){mounts.push(node.id)}}}}}};
 let sdkLoads=0;s.w.SitePrivacy.loadStripe=async()=>{sdkLoads++;return()=>stripeMock};
 const checkout=fs.readFileSync(new URL('../js/stripe-checkout.js',import.meta.url),'utf8').replace(/^import .*;\n/,'');
 vm.runInNewContext(checkout,{window:s.w,document:s.d,URLSearchParams,console,setTimeout(){},alert:message=>alerts.push(message),fetch:async(url,options)=>{requests.push({url,payload:JSON.parse(options.body)});return{ok:true,json:async()=>({clientSecret:'mock_secret'})}}});
 assert.equal(sdkLoads,0);assert.equal(requests.length,0);
 await s.w.initializeStripe(250,{name:'Test',email:'checkout-test@example.com'},'card',false);
 assert.equal(sdkLoads,1);assert.equal(requests.length,1);assert.equal(requests[0].payload.amount,250);assert.equal(requests[0].payload.paymentMethodPreference,'card');assert.deepEqual(mounts,['payment-element']);assert.deepEqual(alerts,[]);s.w.close();
});
