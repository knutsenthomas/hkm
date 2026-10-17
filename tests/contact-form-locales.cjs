const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
(async()=>{
 for(const file of ['kontakt.html','en/contact.html','es/contacto.html']){
  const dom=new JSDOM(fs.readFileSync(file,'utf8'),{runScripts:'outside-only'});
  const w=dom.window,d=w.document; let calls=[];
  w.HTMLElement.prototype.scrollIntoView=()=>{};
  w.fetch=async(url,options)=>{calls.push({url,options});return {}};
  w.eval(fs.readFileSync('js/contact-form.js','utf8'));
  const form=d.getElementById('contact-form');
  form.dispatchEvent(new w.Event('submit',{cancelable:true}));
  assert.equal(calls.length,0);assert.ok(d.getElementById('name').classList.contains('field-error'));
  assert.equal(d.getElementById('phone').required,false);
  for(const [id,value]of Object.entries({name:'Test',email:'test@example.com',subject:'Test subject',message:'Mock submission'}))d.getElementById(id).value=value;
  form.dispatchEvent(new w.Event('submit',{cancelable:true}));
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(calls.length,1);
  const params=new URLSearchParams(calls[0].options.body);
  assert.equal(params.get('entry.933613981'),'test@example.com');assert.equal(params.has('entry.1400512221'),false);
  assert.equal(d.getElementById('name').value,'');
  assert.match(d.getElementById('contact-status').textContent,file.startsWith('en/')?/Thank you/:file.startsWith('es/')?/Gracias/:/Takk/);
  dom.window.close();
 }
 console.log('Contact validation and mocked optional-phone submission passed for NO/EN/ES.');
})().catch(e=>{console.error(e);process.exitCode=1});
