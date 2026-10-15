const assert = require('node:assert/strict');
const {instrumentNewsletter, prepareTracking, trackingHandler} = require('../functions/newsletter-tracking.cjs');
const token = 'a'.repeat(48);
const html = '<body><a href="https://example.com/shop?a=1&amp;b=2">Shop</a><a href="https://example.com/shop?a=1&amp;b=2">Again</a><a href="mailto:test@example.com">Mail</a><a href="https://hiskingdomministry.no/avmeld.html?email=x">Leave</a></body>';
const result = instrumentNewsletter(html, token);
assert.deepEqual(result.links, ['https://example.com/shop?a=1&b=2']);
assert.equal((result.html.match(/k=click/g)||[]).length, 2);
assert.match(result.html, /k=open/); assert.match(result.html, /href="mailto:/); assert.match(result.html, /href="https:\/\/hiskingdomministry.no\/avmeld/);
const records = new Map();
const ref = path => ({ path, async set(data) { records.set(path,data); }, async get() { return snapshot(path); } });
const snapshot = path => ({exists:records.has(path),data:()=>records.get(path)});
const db = {collection:name=>({doc:id=>ref(name+'/'+id)}), async runTransaction(fn) {
    await fn({get:async r=>snapshot(r.path), update(r, fields) { const data=records.get(r.path); for (const [key,value] of Object.entries(fields)) {const parts=key.split('.');let object=data;for(const part of parts.slice(0,-1))object=object[part]??={};const last=parts.at(-1);object[last]=value?.increment ? (object[last]||0)+value.increment : value;}}});
}};
function response() { return {code:200,headers:{},set(k,v){this.headers[k]=v;return this;},status(code){this.code=code;return this;},end(){return this;},send(body){this.body=body;return this;},redirect(code,url){this.code=code;this.url=url;return this;}}; }
(async()=>{
    const prepared = await prepareTracking(db,'campaign',html);
    const [path,data] = [...records][0];const generatedToken=path.split('/')[1];
    assert.equal(generatedToken.length,48);assert.match(prepared,/k=open/);assert.equal(JSON.stringify(data).includes('email'),false);
    records.set('newsletter_campaigns/campaign',{trackingEnabled:true});
    const handle=trackingHandler(db, amount=>({increment:amount}));
    const request=(k,extra={})=>({method:'GET',query:{t:generatedToken,k,...extra}});
    let res=response();await handle(request('open'),res);assert.equal(res.headers['Content-Type'],'image/gif');
    await handle(request('open'),response());assert.equal(records.get('newsletter_campaigns/campaign').engagement.uniqueOpens,1);
    res=response();await handle(request('click',{l:'0'}),res);assert.equal(res.url,'https://example.com/shop?a=1&b=2');
    await handle(request('click',{l:'0'}),response());assert.equal(records.get('newsletter_campaigns/campaign').engagement.uniqueClicks,1);
    assert.equal(Object.values(records.get('newsletter_campaigns/campaign').engagement.links)[0].uniqueClicks,1);
    res=response();await handle(request('click',{l:'99'}),res);assert.equal(res.code,404);
    res=response();await handle({method:'GET',query:{t:'bad',k:'open'}},res);assert.equal(res.code,404);
    data.expiresAt=0;res=response();await handle(request('click',{l:'0'}),res);assert.equal(res.code,302);
    assert.equal(records.get('newsletter_campaigns/campaign').engagement.uniqueClicks,1);
    data.opened=false;await handle({method:'HEAD',query:{t:generatedToken,k:'open'}},response());assert.equal(data.opened,false);
    console.log('Passed: link rewriting, unsubscribe exclusions, opaque tokens, pixel, unique counts, redirects, invalid requests, expiry and HEAD.');
})().catch(error=>{console.error(error);process.exitCode=1;});
