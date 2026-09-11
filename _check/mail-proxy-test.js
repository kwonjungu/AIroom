const assert = require('node:assert/strict');
const { createMailProxy } = require('../lib/mail-proxy');
const { requestMail } = require('../lib/mail-transport');
const proxy = createMailProxy((...args) => global.fetch(...args));
const realFetch = global.fetch;
async function request(method, url, body) {
 const result = { headers: {}, statusCode: 200 };
 const res = {set(k,v){result.headers[k]=v;return this},status(v){result.statusCode=v;return this},json(v){result.body=v;return this},send(v){result.body=v;return this},end(){return this}};
 await proxy({method,url,body,headers:{authorization:'Bearer test','x-mail-key':'private'}},res);
 return result;
}
(async()=>{
 let calls=0;
 global.fetch=async(url,opts)=>{calls++;assert.equal(url.origin,'https://api.mail.tm');assert.equal(opts.headers['x-mail-key'],undefined);assert.equal(opts.redirect,'error');return new Response('{"token":"ok"}',{status:200,headers:{'content-type':'application/json'}})};
 assert.equal((await request('POST','/token',{address:'test',password:'test'})).statusCode,200);
 for(const path of ['//evil.test','/../token','/accounts/id','/messages/x/../../token','/domains?page=oops'])assert.equal((await request('GET',path)).statusCode,400);
 assert.equal(calls,1);
 global.fetch=async(u,o)=>{assert.equal(o.headers['Content-Type'],'application/merge-patch+json');assert.deepEqual(JSON.parse(o.body),{seen:true});return new Response(null,{status:204})};
 assert.equal((await request('PATCH','/messages/abc',{seen:true})).statusCode,204);
 global.fetch=async()=>new Response('denied',{status:401});
 assert.equal((await request('POST','/token',{})).statusCode,401);
 global.fetch=async()=>new Response('',{status:429});
 assert.equal((await request('GET','/messages')).statusCode,429);
 global.fetch=async()=>new Response('bad gateway',{status:502});
 assert.ok((await request('GET','/domains')).body.error);
 global.fetch=async()=>{throw new DOMException('timeout','TimeoutError')};
 assert.equal((await request('GET','/domains')).statusCode,504);
 global.fetch=async()=>new Response(new Uint8Array([0,255,128]),{headers:{'content-type':'application/octet-stream'}});
 assert.deepEqual((await request('GET','/messages/abc/attachment/xyz')).body,Buffer.from([0,255,128]));
 global.fetch=requestMail;
 const live=await request('GET','/domains?page=1');
 assert.equal(live.statusCode,200,JSON.stringify(live.body));
 const data=JSON.parse(live.body); assert.ok((data['hydra:member'] || data.member || data).length);
 console.log('Mail proxy checks passed, including live upstream domains.');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>{global.fetch=realFetch});
