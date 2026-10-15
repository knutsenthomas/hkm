const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('admin/index.html','utf8');
const source=fs.readFileSync('admin/js/skolebetalinger.js','utf8').replace(/^import .*;\n/gm,'').replace('export async function','async function');
(async()=>{
 const dom=new JSDOM(html,{url:'https://example.com/admin/index.html#school-payments'}),document=dom.window.document;
 assert.ok(document.querySelector('.sidebar [data-section="school-payments"]'));
 const root=document.querySelector('#school-payments-section .school-finance');assert.ok(root);
 assert.match(fs.readFileSync('admin/skolebetalinger.html','utf8'),/location.replace\('\/admin\/index.html'/);
 const user={uid:'admin',getIdToken:async()=> 'test-token'};let authCallback,requests=0,subscriptions=0;
 const auth=()=>({currentUser:user,onAuthStateChanged:callback=>{authCallback=callback;subscriptions++;}});
 const context={console,document,WeakSet,Map,Intl,Date,AbortController,firebaseService:{tryAutoInit:()=>true,waitForInitialization:async()=>true},firebase:{auth},fetch:async(url,options)=>{requests++;assert.equal(options.headers.Authorization,'Bearer test-token');return {ok:true,json:async()=>({accounts:[{centralUid:'student',name:'Test Student',email:'test@example.com',paid:100,remaining:900,registrationPaid:50,agreements:[]}],plans:[],payments:[]})};}};
 vm.createContext(context);vm.runInContext(source,context);await context.mountSchoolPayments(root);await authCallback(user);
 assert.match(root.querySelector('#school-finance-students').textContent,/Test Student/);
 assert.equal(root.querySelector('#school-finance-finance-content').hidden,false);
 await context.mountSchoolPayments(root);assert.equal(subscriptions,1);
 root.querySelector('#school-finance-search').value='no match';root.querySelector('#school-finance-search').dispatchEvent(new dom.window.Event('input'));
 assert.match(root.querySelector('#school-finance-students').textContent,/Ingen registreringer/);
 await authCallback(null);assert.equal(root.querySelector('#school-finance-finance-content').hidden,true);assert.equal(root.querySelector('#school-finance-finance-login').hidden,false);
 assert.equal(requests,1);
 console.log('Passed: shared sidebar route, old URL redirect, scoped controls, authorized fetch, filtering and sign-out privacy.');
})().catch(error=>{console.error(error);process.exitCode=1;});
// Exercise the actual shared navigation listener with the dynamically rendered gift tab.
{
 const navDom=new JSDOM(html,{url:'https://example.com/admin/index.html#causes',runScripts:'outside-only'});
 const navDoc=navDom.window.document;
 const adminSource=fs.readFileSync('admin/js/admin.js','utf8');
 const anchor=adminSource.match(/<a class="automation-tab" data-section="school-payments"[^>]*>Skolebetalinger<\/a>/)?.[0];assert.ok(anchor);
 navDoc.querySelector('#causes-section').insertAdjacentHTML('beforeend',anchor);
 const start=html.indexOf('<script>',html.indexOf('<!-- Core Dashboard Logic'))+8;
 const script=html.slice(start,html.indexOf('</script>',start));
 let switched;
 navDom.window.adminManager={onSectionSwitch:id=>{switched=id;}};
 navDom.window.eval(script);navDoc.dispatchEvent(new navDom.window.Event('DOMContentLoaded'));
 const event=new navDom.window.MouseEvent('click',{bubbles:true,cancelable:true});
 navDoc.querySelector('#causes-section .automation-tab[data-section="school-payments"]').dispatchEvent(event);
 assert.equal(event.defaultPrevented,true);assert.equal(switched,'school-payments');
 assert.equal(navDom.window.location.hash,'#school-payments');assert.equal(navDoc.querySelector('#school-payments-section').classList.contains('active'),true);
 assert.equal(navDoc.querySelector('#causes-section').classList.contains('active'),false);
 console.log('Passed: clicking school payments from Gifts opens the correct admin section without a document navigation.');
 navDom.window.close();
}
