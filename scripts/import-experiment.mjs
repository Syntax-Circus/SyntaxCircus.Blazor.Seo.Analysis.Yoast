// Optional: read retained experiment artifacts without copying public article bodies into tracked fixtures.
import fs from 'node:fs/promises';
const source=JSON.parse(await fs.readFile(process.argv[2],'utf8'));
const inputs=source.documents.map(x=>({contentHtml:x.contentHtml,title:x.seoTitle??x.title,metaDescription:x.metaDescription??'',canonicalUrl:x.canonicalUrl??'',slug:x.slug??'',focusPhrase:x.focusKeyphrase||null,locale:x.locale??'en_US',purpose:x.profile==='article'?1:0}));
await fs.mkdir('artifacts',{recursive:true});
await fs.writeFile('artifacts/experiment-inputs.json',JSON.stringify(inputs));
console.log(JSON.stringify({documents:inputs.length}));
