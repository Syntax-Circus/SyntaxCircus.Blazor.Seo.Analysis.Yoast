import http from 'node:http';
import { Worker } from 'node:worker_threads';
import { pathToFileURL } from 'node:url';

export async function createAnalysisServer({concurrency=2,deadlineMs=5000,maxBodyBytes=2_000_000,workerUrl=new URL('./worker.mjs',import.meta.url)}={}) {
 if(!Number.isInteger(concurrency)||concurrency<1||concurrency>32||!Number.isFinite(deadlineMs)||deadlineMs<1) throw new Error('Invalid service limits');
 const workers=new Set();
 const server=http.createServer(async(req,res)=>{
  const reply=(status,value)=>{if(!res.destroyed&&!res.writableEnded){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value));}};
  if(req.method==='GET'&&req.url==='/health') return reply(200,{status:'ok',active:workers.size,protocolVersion:1,engineVersion:'3.6.0'});
  if(req.method!=='POST'||req.url!=='/v1/analyze') return reply(404,{error:'Not found'});
  if(!req.headers['content-type']?.startsWith('application/json')) return reply(415,{error:'JSON required'});
  if(workers.size>=concurrency) return reply(429,{error:'Analysis capacity reached'});
  // Reserve capacity before reading the request: slow uploads cannot create an unbounded queue.
  const slot={}; workers.add(slot);
  let worker,timer,finished=false;
  const finish=async(status,value)=>{
   if(finished)return;finished=true;clearTimeout(timer);
   if(worker)await worker.terminate();
   workers.delete(slot);
   if(status)reply(status,value);
  };
  res.on('close',()=>{void finish();});
  timer=setTimeout(()=>{void finish(504,{error:'Analysis deadline exceeded'});req.resume();},deadlineMs);
  try {
   let size=0;const chunks=[];
   for await(const chunk of req){
    size+=chunk.length;
    if(size>maxBodyBytes){void finish(413,{error:'Request too large'});req.resume();return;}
    chunks.push(chunk);
   }
   if(finished)return;
   let body;
   try{body=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{await finish(400,{error:'Invalid JSON'});return;}
   const s=body.snapshot;
   const fields=['id','title','metaDescription','canonicalUrl','slug','locale','contentHtml','readabilityHtml'];
   if(body.protocolVersion!==1||!s||fields.some(x=>typeof s[x]!=='string')||!/^[A-Fa-f0-9]{64}$/.test(s.id)||
      (s.focusPhrase!==null&&s.focusPhrase!==undefined&&typeof s.focusPhrase!=='string')||
      s.contentHtml.length>500000||s.readabilityHtml.length>500000){
    await finish(400,{error:'Invalid snapshot or protocol'});return;
   }
   if(!/^en(?:[_-]|$)/i.test(s.locale)){await finish(422,{error:'English analysis only'});return;}
   worker=new Worker(workerUrl,{workerData:s,resourceLimits:{maxOldGenerationSizeMb:128,stackSizeMb:4}});
   worker.once('message',result=>{void finish(200,{protocolVersion:1,snapshotId:s.id,engineVersion:'3.6.0',assessments:result});});
   worker.once('error',()=>{void finish(500,{error:'Analysis failed'});});
   worker.once('exit',()=>{if(!finished)void finish(500,{error:'Analysis worker exited'});});
  }catch{await finish(400,{error:'Request interrupted'});}
 });
 server.requestTimeout=10000;
 server.headersTimeout=10000;
 server.on('close',()=>{for(const item of workers)workers.delete(item);});
 return server;
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href){
 const server=await createAnalysisServer({concurrency:Number(process.env.ANALYSIS_CONCURRENCY??2),deadlineMs:Number(process.env.ANALYSIS_DEADLINE_MS??5000)});
 server.listen(Number(process.env.PORT??8080),'0.0.0.0');
 const stop=()=>{server.close();server.closeAllConnections();};
 process.on('SIGTERM',stop);process.on('SIGINT',stop);
}
