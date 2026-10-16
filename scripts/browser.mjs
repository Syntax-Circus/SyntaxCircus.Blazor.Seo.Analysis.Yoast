import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1100,height:850}});
const page=await context.newPage(),errors=[],requests=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('request',r=>requests.push(r.url()));
const base=process.env.SAMPLE_URL??'http://127.0.0.1:5090';
const results=[];
const check=(name,condition)=>{assert.ok(condition,name);results.push(name);};
const analyze=async()=>{
 await page.getByRole('button',{name:'Analyze',exact:true}).click();
 await page.getByRole('status').filter({hasText:'Analysis complete'}).waitFor({timeout:30000});
};
try {
 const anonymous=await context.request.post(base+'/api/analysis',{data:{contentHtml:'<h1>A</h1>'}});
 check('anonymous API rejected',anonymous.status()===401||anonymous.status()===302);
 await page.goto(base+'/login');
 await page.getByLabel('Sample access key').fill(process.env.SAMPLE_ACCESS_KEY??'local-qualification-only');
 await Promise.all([page.waitForURL(base+'/'),page.getByRole('button',{name:'Sign in'}).click()]);
 for(const mode of ['server','wasm']){
  await page.goto(base+'/'+mode);
  await page.getByRole('button',{name:'Analyze',exact:true}).waitFor();
  // An initial click can precede interactive hydration; wait for framework startup.
  await page.waitForTimeout(mode==='wasm'?1500:500);
  await analyze();
  check(mode+': real Yoast advice',/yoast: Passive voice/.test(await page.locator('#findings').innerText()));
  check(mode+': complete companion coverage',/yoast: Complete/.test(await page.locator('#coverage').innerText()));
  await page.getByLabel('Article HTML').fill('<h1>Puppy care</h1><p>We feed the puppies. Next, our helper washes the bedding. Finally, the owner checks the records.</p>');
  await analyze();
  check(mode+': active rewrite clears passive finding',!(/Passive voice/.test(await page.locator('#findings').innerText())));
  await page.getByRole('button',{name:'Analyze',exact:true}).click();
  await page.getByLabel('Article HTML').fill('<h1>Changed</h1><p>New draft.</p><img>');
  await page.waitForTimeout(400);
  check(mode+': editing invalidates pending result',/Changed/.test(await page.getByRole('status').innerText()));
  await page.setViewportSize({width:375,height:812});
  check(mode+': narrow viewport fits',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:'artifacts/'+mode+'.png',fullPage:true});
  await page.setViewportSize({width:1100,height:850});
 }
 check('WASM actually downloaded client assembly',requests.some(x=>/BlazorClient.*\.wasm/.test(x)));
 check('no Yoast client assembly or script delivered',!requests.some(x=>/yoast/i.test(x)));
 execFileSync('docker',['compose','stop','-t','1','yoast'],{windowsHide:true,stdio:'pipe'});
 for(const mode of ['server','wasm']){
  await page.goto(base+'/'+mode);await page.waitForTimeout(mode==='wasm'?1500:500);
  await page.getByLabel('Article HTML').fill('<h1>Puppy care</h1><p>We feed puppies.</p><img>');
  await analyze();
  check(mode+': outage retains core findings',/core: An image/.test(await page.locator('#findings').innerText()));
  check(mode+': outage coverage explicit',/yoast: Unavailable/.test(await page.locator('#coverage').innerText()));
 }
 check('no browser errors',errors.length===0);
 await fs.writeFile('artifacts/browser.json',JSON.stringify({checks:results.length,results,errors,requests},null,2));
 console.log(JSON.stringify({checks:results.length,errors}));
} finally {
 execFileSync('docker',['compose','start','yoast'],{windowsHide:true,stdio:'pipe'});
 await browser.close();
}
