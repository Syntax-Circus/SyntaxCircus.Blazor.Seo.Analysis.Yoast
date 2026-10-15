import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const root=path.resolve(import.meta.dirname,'..'),out=path.join(root,'artifacts/corresponding-source');
if(execFileSync('git',['status','--porcelain'],{cwd:root,encoding:'utf8',windowsHide:true}).trim())
 throw new Error('Corresponding source requires a clean committed checkout.');
await fs.mkdir(out,{recursive:true});
const sources=JSON.parse(await fs.readFile(path.join(import.meta.dirname,'upstream-sources.json'),'utf8'));
const lock=JSON.parse(await fs.readFile(path.join(root,'service/package-lock.json'),'utf8'));
const records=[];
async function download(url,file,integrity){
 const destination=path.join(out,file);
 let data;
 try{data=await fs.readFile(destination);}catch{
  const response=await fetch(url,{signal:AbortSignal.timeout(120000)});
  if(!response.ok)throw new Error('Source download failed: '+url);
  data=Buffer.from(await response.arrayBuffer());
  if(integrity){
   const [algorithm,digest]=integrity.split('-');
   if(createHash(algorithm).update(data).digest('base64')!==digest)throw new Error('Integrity mismatch: '+file);
  }
  await fs.writeFile(destination,data);
 }
 if(integrity){const [algorithm,digest]=integrity.split('-');if(createHash(algorithm).update(data).digest('base64')!==digest)throw new Error('Cached integrity mismatch');}
 records.push({url,file,sha256:createHash('sha256').update(data).digest('hex')});
}
for(const [relative,entry]of Object.entries(lock.packages)){
 if(!relative)continue;
 const pkg=JSON.parse(await fs.readFile(path.join(root,'service',relative,'package.json'),'utf8'));
 await download(entry.resolved,pkg.name.replaceAll('/','-').replaceAll('@','')+'-'+pkg.version+'.tgz',entry.integrity);
}
for(const source of sources)await download('https://codeload.github.com/'+source.repository+'/tar.gz/'+source.commit,source.repository.replace('/','-')+'-'+source.commit+'.tar.gz');
await fs.writeFile(path.join(out,'sources.json'),JSON.stringify({sources,artifacts:records},null,2));
await fs.cp(path.join(root,'service/source'),path.join(out,'notices-and-service'),{recursive:true});
await fs.copyFile(path.join(root,'docs/LICENSING.md'),path.join(out,'BUILD-AND-LICENSING.md'));
// Include all tracked application/build sources at the exact release revision.
execFileSync('git',['archive','HEAD','--format=tar','--output='+path.join(out,'integration-source.tar')],{cwd:root,windowsHide:true});
execFileSync('tar',['-czf',path.join(root,'artifacts/corresponding-source.tar.gz'),'-C',path.dirname(out),path.basename(out)],{windowsHide:true});
console.log(JSON.stringify({sourceArtifacts:records.length,bytes:(await fs.stat(path.join(root,'artifacts/corresponding-source.tar.gz'))).size}));
