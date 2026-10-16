// Release preparation: retain exact dependency artifacts, source metadata and notices.
// Source artifacts are distributed alongside the container; npm tarballs alone may contain only built code.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const root=path.resolve(import.meta.dirname,'..'),service=path.join(root,'service'),out=path.join(service,'source');
await fs.mkdir(out,{recursive:true});
const lock=JSON.parse(await fs.readFile(path.join(service,'package-lock.json'),'utf8'));
const inventory=[];
for(const [relative,entry] of Object.entries(lock.packages)){
 if(!relative)continue;
 const dir=path.join(service,relative),pkg=JSON.parse(await fs.readFile(path.join(dir,'package.json'),'utf8'));
 const name=pkg.name.replaceAll('/','-').replaceAll('@','');
 const licenses=(await fs.readdir(dir)).filter(x=>/^(licen[cs]e|copying|notice)/i.test(x));
 for(const file of licenses)await fs.copyFile(path.join(dir,file),path.join(out,name+'-'+pkg.version+'-'+file));
 inventory.push({name:pkg.name,version:pkg.version,license:pkg.license,repository:pkg.repository,resolved:entry.resolved,integrity:entry.integrity,notices:licenses});
}
await fs.writeFile(path.join(out,'dependency-inventory.json'),JSON.stringify(inventory,null,2)+'\n');
await fs.writeFile(path.join(root,'docs/dependency-inventory.json'),JSON.stringify(inventory,null,2)+'\n');
await fs.cp(path.join(service,'notices'),path.join(out,'upstream-notices'),{recursive:true});
for(const file of ['package.json','package-lock.json','server.mjs','worker.mjs','Dockerfile','LICENSE'])await fs.copyFile(path.join(service,file),path.join(out,file));
console.log(JSON.stringify({dependencies:inventory.length,out}));
