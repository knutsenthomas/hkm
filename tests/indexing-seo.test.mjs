import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import handler from '../api/share-preview.js';
const encode = v => typeof v === 'string' ? {stringValue:v} : Array.isArray(v) ? {arrayValue:{values:v.map(encode)}} : {mapValue:{fields:Object.fromEntries(Object.entries(v).map(([k,v])=>[k,encode(v)]))}};
const response = (items=[],status=200)=>({ok:status===200,status,json:async()=>({fields:{items:encode(items)}})});
async function run(query, fetcher) {
 const old=global.fetch;global.fetch=fetcher;
 const res={headers:{},setHeader(k,v){this.headers[k]=v},status(n){this.code=n;return this},send(body){this.body=body;return this}};
 try{await handler({method:'GET',query,headers:{host:'www.hiskingdomministry.no','x-forwarded-proto':'http'}},res);return res;}finally{global.fetch=old;}
}
test('blog has stable canonical, visible unique content and no ID-less alternates',async()=>{
 const r=await run({type:'blog',lang:'es',id:'old-alias'},async url=>response(url.includes('collection_blog')?[{id:'stable-id',slug:'old-alias',title:'Norsk',content:'<p>Original</p>',translations:{es:{title:'Titulo',content:{blocks:[{type:'paragraph',data:{text:'<p>Contenido unico</p><script>alert(1)</script>'}}]}}}}]:[]));
 assert.equal(r.code,200);assert.match(r.body,/https:\/\/hiskingdomministry.no\/es\/blog-post\?id=stable-id/);assert.match(r.body,/id="single-post-content" style="display:block;">\s*<p>Contenido unico<\/p>/);assert.doesNotMatch(r.body,/alert\(1\)/);assert.doesNotMatch(r.body,/<link\s+rel="alternate"/);assert.match(r.body,/opacity:1/);
});
test('missing blog is real 404, not generic successful page',async()=>{const r=await run({type:'blog',id:'gone'},async()=>response());assert.equal(r.code,404);assert.match(r.body,/noindex/)});
test('upstream failure and malformed payload are 503',async()=>{for(const fetcher of [async()=>response([],503),async()=>{throw Error('offline')},async()=>({ok:true,status:200,json:async()=>{throw Error('bad JSON')}})]){const r=await run({type:'blog',id:'id'},fetcher);assert.equal(r.code,503);assert.equal(r.headers['Retry-After'],'300')}});
test('ID-less detail pages are 404 without reading content',async()=>{const r=await run({type:'blog'},async()=>{throw Error('must not fetch')});assert.equal(r.code,404)});
test('course list stays indexable; course canonical has no html extension',async()=>{const fetcher=async()=>response([{id:'one',title:'Kurs'}]);const r=await run({type:'course',id:'one'},fetcher);assert.equal(r.code,200);assert.match(r.body,/href="https:\/\/hiskingdomministry.no\/kurs\?courseId=one"/);assert.equal((await run({type:'course'},async()=>response())).code,200)});
test('missing plan is 404 and inaccessible plan is 503',async()=>{assert.equal((await run({type:'plan',id:'no'},async()=>response([],404))).code,404);assert.equal((await run({type:'plan',id:'no'},async()=>response([],403))).code,503)});
test('redirects consolidate hosts and preserve migrated product identity',()=>{const v=JSON.parse(fs.readFileSync('vercel.json','utf8'));const host=v.redirects[0];assert.equal(host.has[0].value,'www.hiskingdomministry.no');assert.equal(host.destination,'https://hiskingdomministry.no/:path*');for(const prefix of ['', '/en','/es'])assert.equal(v.redirects.find(x=>x.source===prefix+'/product-page/:slug*').destination,'https://hiskingdomdesigns.no/produkt/:slug*');assert.equal(v.redirects.find(x=>x.source==='/en/reading-plans').destination,'/en/leseplaner');});
