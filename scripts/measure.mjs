import fs from 'node:fs/promises';
import {performance} from 'node:perf_hooks';
const input=JSON.parse(await fs.readFile('fixtures/owned-inputs.json','utf8'))[20];
const snapshot={...input,id:'A'.repeat(64),readabilityHtml:input.contentHtml};
const body=JSON.stringify({protocolVersion:1,snapshot});
const requests=[];
for(let i=0;i<11;i++){
 const start=performance.now();
 const response=await fetch('http://127.0.0.1:5088/v1/analyze',{method:'POST',headers:{'content-type':'application/json'},body});
 if(!response.ok)throw new Error('Benchmark failed: '+response.status);
 const text=await response.text();
 requests.push({milliseconds:performance.now()-start,responseBytes:Buffer.byteLength(text)});
}
const sorted=requests.slice(1).map(x=>x.milliseconds).sort((a,b)=>a-b);
const result={method:'Sequential HTTP requests after service restart; fresh worker per request, not a warm worker pool. Single owned writing fixture; no concurrent-load or production SLO claim.',requestBytes:Buffer.byteLength(body),firstRequestMs:requests[0].milliseconds,subsequentMedianMs:(sorted[4]+sorted[5])/2,subsequentMinMs:sorted[0],subsequentMaxMs:sorted.at(-1),requests};
await fs.writeFile('artifacts/latency.json',JSON.stringify(result,null,2));
console.log(JSON.stringify(result));
