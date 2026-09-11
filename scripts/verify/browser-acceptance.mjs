import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {parseArgs} from 'node:util';
const hash=bytes=>'sha256:'+createHash('sha256').update(bytes).digest('hex');

/** Local rendered evidence; acceptance still requires a frontier image review. */
export async function captureBrowserAcceptance(artifactPath,outputDirectory){
 const artifact=resolve(artifactPath),destination=resolve(outputDirectory),bytes=await readFile(artifact);
 const dependency=resolve('artifacts/direct-vs-delegated/deps-b962c1ac/node_modules/playwright/index.mjs');
 const {chromium}=await import(pathToFileURL(dependency).href);
 await mkdir(destination,{recursive:false});
 await writeFile(join(destination,'index.html'),bytes,{flag:'wx'});
 const browser=await chromium.launch({headless:true}),viewports=[];
 try{
  const page=await browser.newPage();
  await page.route('**/*',route=>route.request().url().startsWith('file:')?route.continue():route.abort());
  for(const width of [320,1280]){
   await page.setViewportSize({width,height:900});await page.goto(pathToFileURL(join(destination,'index.html')).href);
   await page.keyboard.press('Tab');
   const checks=await page.evaluate(()=>{
    const main=document.querySelector('main'),inputs=[...document.querySelectorAll('input')],active=document.activeElement;
    const style=active instanceof HTMLElement?getComputedStyle(active):null;
    return {title:document.title==='Task list',heading:main?.querySelector('h1')?.textContent?.trim()==='Task list',single_main:document.querySelectorAll('main').length===1,form:!!main?.querySelector('form'),task_input:inputs.some(i=>i.type!=='checkbox'&&i.labels?.length),checkbox_labels:inputs.filter(i=>i.type==='checkbox').length>=2&&inputs.filter(i=>i.type==='checkbox').every(i=>i.labels?.length),tasks:['Plan','Build'].every(t=>[...document.querySelectorAll('li')].some(li=>li.textContent?.includes(t))),submit:[...document.querySelectorAll('button')].some(b=>b.type==='submit'&&b.textContent?.trim()==='Add task'),no_horizontal_overflow:document.documentElement.scrollWidth<=innerWidth&&document.body.scrollWidth<=innerWidth,keyboard_focus:!!style&&active!==document.body&&((style.outlineStyle!=='none'&&parseFloat(style.outlineWidth)>0)||style.boxShadow!=='none')};
   });
   const screenshot=`${width}.png`;await page.screenshot({path:join(destination,screenshot),fullPage:true});
   viewports.push({width,height:900,checks,screenshot:{path:screenshot,digest:hash(await readFile(join(destination,screenshot)))}});
  }
 }finally{await browser.close();}
 const unchanged=bytes.equals(await readFile(artifact));
 const result={schema_version:'browser_acceptance_capture.v1',artifact_path:artifact,artifact_digest:hash(bytes),unchanged,auto_grade_passed:unchanged&&viewports.every(v=>Object.values(v.checks).every(Boolean)),viewports,script_digest:hash(await readFile(new URL(import.meta.url))),dependency,qualification_authority:false,limitation:'DOM checks and screenshots require a separate frontier review; this capture alone is not acceptance.'};
 await writeFile(join(destination,'browser-checks.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});return result;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const {values}=parseArgs({options:{artifact:{type:'string'},output:{type:'string'}}});
 if(!values.artifact||!values.output)throw Error('--artifact and --output required');
 console.log(JSON.stringify(await captureBrowserAcceptance(values.artifact,values.output)));
}
