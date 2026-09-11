import {mkdir,mkdtemp,readFile,writeFile} from 'node:fs/promises';
import {join,resolve,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {parseArgs} from 'node:util';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';

const root=resolve(import.meta.dirname,'..');
const readJson=async path=>JSON.parse(await readFile(path,'utf8'));
const dist=async()=>({
 ...(await import('../dist/routing/reviewer-calibration.js')),
 ...(await import('../dist/core/canonical.js')),
});

async function reserve(ledgerFile, entry) {
 let ledger;
 try{ledger=await readJson(ledgerFile);}
 catch(error){
  if(error.code!=='ENOENT')throw error;
  ledger={schema_version:'reviewer_calibration_ledger.v1',calibration_limit:8,executions:[],qualification_authority:false};
  await writeFile(ledgerFile,JSON.stringify(ledger,null,2)+'\n',{flag:'wx'});
 }
 if(ledger.schema_version!=='reviewer_calibration_ledger.v1'||ledger.calibration_limit!==8||!Array.isArray(ledger.executions))throw Error('INVALID_CALIBRATION_LEDGER');
 if(ledger.executions.filter(row=>row.group==='calibration').length>=ledger.calibration_limit)throw Error('CALIBRATION_BUDGET_EXHAUSTED');
 if(ledger.executions.some(row=>row.id===entry.id))throw Error('EXECUTION_ALREADY_RESERVED');
 ledger.executions.push({...entry,group:'calibration',started_at:new Date().toISOString()});
 await writeFile(ledgerFile,JSON.stringify(ledger,null,2)+'\n');
}
export async function evaluateCalibration(manifestFile, outputDirectory, ledgerFile, {budgetFile,onlyHost=null,targetsPath=join(root,'data/routing/frontier-targets.json'),executeBudgeted=null,helpers=null}={}){
 if(!budgetFile)throw Error('APPROVED_BUDGET_REQUIRED');
 const {parseCalibrationManifest,calibrationPrompt,reviewerCalibrationGate,hashBytes,digest}=helpers??await dist();
 const execute=executeBudgeted??(await import('./verify/budgeted-frontier.mjs')).executeBudgetedFrontier;
 const manifestBytes=await readFile(manifestFile,'utf8'),manifest=parseCalibrationManifest(JSON.parse(manifestBytes));
 const fixtureRoot=dirname(resolve(manifestFile)),root=resolve(import.meta.dirname,'..');
 const targets=(await readJson(resolve(targetsPath))).targets.filter(target=>!onlyHost||target.host===onlyHost);
 if(!targets.length)throw Error('Unknown calibration host');
 // A new directory is mandatory: failed runs cannot be overwritten by a later pass.
 await mkdir(outputDirectory,{recursive:false});
 const checks=await readFile(join(fixtureRoot,manifest.checks_file),'utf8'),reports=[];
 const readFiles=async directory=>Object.fromEntries(await Promise.all(['quantity.mjs','quantity.test.mjs'].map(async file=>[file,await readFile(join(directory,file),'utf8')])));
 for(const target of targets){
  const rows=[],hostRoot=join(outputDirectory,target.host);await mkdir(hostRoot);
  for(const fixture of manifest.cases){
   const directory=await mkdtemp(join(tmpdir(),`reviewer-calibration-${target.host}-${fixture.id}-`));
   const destination=join(hostRoot,fixture.id);await mkdir(destination);
   const original=await readFile(join(fixtureRoot,fixture.artifact_file),'utf8');
   await writeFile(join(directory,'quantity.mjs'),original);await writeFile(join(directory,'quantity.test.mjs'),checks);
   let worker=null;
   if(fixture.id==='positive'){
    const workerTarget=target.host==='claude'
     ?{host:'claude',provider:'anthropic',model_id:'claude-haiku-4-5-20251001',effort:'not_applicable'}
     :{host:'codex',provider:'openai',model_id:'gpt-5.5',effort:'low'};
    const id=`${target.host}-calibration-worker`;
    await reserve(ledgerFile,{id,host:target.host,role:'worker',model:workerTarget.model_id,effort:workerTarget.effort,destination:join(destination,'worker')});
    worker=await execute({budgetFile,id,purpose:'reviewer_calibration_worker',target:workerTarget,directory,destination:join(destination,'worker'),write:true,timeoutMs:240000,
     prompt:`Fix quantity.mjs only. Requirement: ${manifest.requirements} Read and run quantity.test.mjs, preserve it unchanged, and verify your correction. Do not install anything, use subagents, or modify other files. Return a concise result and actual check results.`});
   }
   const filesBefore=await readFiles(directory);
   // The objective oracle is independent of the reviewer's claimed verdict.
   const objective=spawnSync(process.execPath,['quantity.test.mjs'],{cwd:directory,encoding:'utf8',timeout:15000});
   const prompt=calibrationPrompt(manifest);
   const id=`${target.host}-calibration-${fixture.id}`;
   await reserve(ledgerFile,{id,host:target.host,role:'reviewer',model:target.model_id,effort:target.effort,destination:join(destination,'reviewer')});
   const reviewer=await execute({budgetFile,id,purpose:'reviewer_calibration_review',target,directory,prompt,destination:join(destination,'reviewer')});
   const row={case_id:fixture.id,directory,reviewer_host_version:reviewer.host_version,worker_host_version:worker?.host_version??null,initial_artifact_digest:hashBytes(original),files_before:filesBefore,files_after:await readFiles(directory),
    objective:{exit_code:objective.status,signal:objective.signal,stdout:objective.stdout,stderr:objective.stderr},
    reviewer_evidence:reviewer.evidence,...(worker?{worker_evidence:worker.evidence}:{})};
   // Test replacement by the positive worker is also a failed calibration capture.
   if(filesBefore['quantity.test.mjs']!==checks)row.files_before['quantity.test.mjs']=checks;
   rows.push(row);await writeFile(join(destination,'case.json'),JSON.stringify(row,null,2)+'\n');
  }
  const gate=reviewerCalibrationGate(manifest,rows,target);
  const report={host:target.host,target,manifest,manifest_digest:hashBytes(manifestBytes),rows,gate,qualification_authority:false};
  reports.push(report);await writeFile(join(hostRoot,'report.json'),JSON.stringify(report,null,2)+'\n');
  if(gate.admitted)await writeFile(join(hostRoot,'admissible-positive.json'),JSON.stringify({target,scope:manifest.scope,positive:rows.find(row=>row.case_id==='positive'),calibration_report_digest:digest(report),qualification_authority:false},null,2)+'\n');
 }
 await writeFile(join(outputDirectory,'report.json'),JSON.stringify({reports,qualification_authority:false},null,2)+'\n');
 console.log(JSON.stringify({outputDirectory,hosts:reports.map(report=>({host:report.host,...report.gate}))}));
 return reports;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const {values}=parseArgs({options:{manifest:{type:'string'},output:{type:'string'},ledger:{type:'string'},budget:{type:'string'},targets:{type:'string'},host:{type:'string'}}});
 if(!values.manifest||!values.output||!values.ledger||!values.budget)throw Error('--manifest, --output, --ledger and --budget are required');
 await evaluateCalibration(resolve(values.manifest),resolve(values.output),resolve(values.ledger),{budgetFile:resolve(values.budget),onlyHost:values.host??null,targetsPath:values.targets?resolve(values.targets):undefined});
}
