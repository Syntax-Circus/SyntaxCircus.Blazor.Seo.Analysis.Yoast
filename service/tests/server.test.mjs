import test from 'node:test';
import assert from 'node:assert/strict';
import { createAnalysisServer } from '../server.mjs';

const snapshot = {id:'a'.repeat(64),title:'Puppy care',metaDescription:'Learn about puppy care.',canonicalUrl:'https://example.test/care',slug:'care',focusPhrase:null,locale:'en_US',contentHtml:'<h1>Puppy care</h1><p>The puppies were fed by the breeder. The bedding was washed by the helper. The records were checked by the owner.</p>',readabilityHtml:'<p>The puppies were fed by the breeder. The bedding was washed by the helper. The records were checked by the owner.</p>'};
async function host(t, options) {
 const server = await createAnalysisServer(options);
 await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
 t.after(() => new Promise(resolve => server.close(resolve)));
 return 'http://127.0.0.1:' + server.address().port;
}
const send = (url, value) => fetch(url+'/v1/analyze', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(value)});
test('real Yoast runs off-thread and returns versioned snapshot results', async t => {
 const url=await host(t);
 const response=await send(url,{protocolVersion:1,snapshot});
 assert.equal(response.status,200);
 const result=await response.json();
 assert.equal(result.snapshotId,snapshot.id);
 assert.equal(result.engineVersion,'3.6.0');
 assert.equal(result.protocolVersion,1);
 assert.ok(result.assessments.some(x=>x.id==='passiveVoice' && x.score<9));
 assert.ok(result.assessments.every(x=>typeof x.message==='string'));
});
test('health and invalid protocol or oversized bodies are explicit',async t=>{
 const url=await host(t,{maxBodyBytes:4000});
 assert.equal((await fetch(url+'/health')).status,200);
 assert.equal((await send(url,{protocolVersion:99,snapshot})).status,400);
 assert.equal((await send(url,{protocolVersion:1,snapshot:{...snapshot,locale:'fr_FR'}})).status,422);
 assert.equal((await send(url,{protocolVersion:1,snapshot:{...snapshot,contentHtml:'x'.repeat(5000)}})).status,413);
 assert.equal((await send(url,{protocolVersion:1,snapshot:{...snapshot,title:42}})).status,400);
});
test('bounded concurrency and deadlines release worker capacity', async t=>{
 const url=await host(t,{concurrency:1,deadlineMs:120,workerUrl:new URL('./slow-worker.mjs',import.meta.url)});
 const pending=send(url,{protocolVersion:1,snapshot});
 await new Promise(r=>setTimeout(r,40));
 assert.equal((await send(url,{protocolVersion:1,snapshot})).status,429);
 assert.equal((await pending).status,504);
 assert.equal((await send(url,{protocolVersion:1,snapshot})).status,504);
});
test('client disconnect terminates work and releases capacity',async t=>{
 const url=await host(t,{concurrency:1,deadlineMs:3000,workerUrl:new URL('./slow-worker.mjs',import.meta.url)});
 const controller=new AbortController();
 const pending=fetch(url+'/v1/analyze',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({protocolVersion:1,snapshot}),signal:controller.signal}).catch(()=>{});
 await new Promise(r=>setTimeout(r,100)); controller.abort(); await pending;
 await new Promise(r=>setTimeout(r,100));
 const response=await fetch(url+'/health'); assert.equal((await response.json()).active,0);
});
