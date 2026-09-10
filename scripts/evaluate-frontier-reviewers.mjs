import {mkdir,mkdtemp,readFile,writeFile} from 'node:fs/promises';
import {join,resolve,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {parseArgs} from 'node:util';
import {parseCalibrationManifest,calibrationPrompt,reviewerCalibrationGate} from '../dist/routing/reviewer-calibration.js';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {hashBytes,digest} from '../dist/core/canonical.js';
import {executeFrontier} from './verify/frontier-host.mjs';

async function legacyEvaluation(){
// Exact existing quantity-default artifact only. Successful reviews do not qualify a model.
const root=resolve(import.meta.dirname,'..');
const targets=JSON.parse(await readFile(join(root,'data/routing/frontier-targets.json'),'utf8')).targets;
const artifactRoot=join(root,'artifacts/frontier-reviewer-evaluations',String(Date.now()));
await mkdir(artifactRoot,{recursive:true});
const rows=await Promise.all(targets.map(async target=>{
 const workerRun=target.host==='claude'?'claude-haiku-1789006119985':'codex-1789006044123';
 const originalRoot=join(root,'artifacts/portable-host-evidence',workerRun);
 const originalBytes=await readFile(join(originalRoot,'result.json'));
 const original=JSON.parse(originalBytes);
 const directory=await mkdtemp(join(tmpdir(),`frontier-reviewer-${target.host}-`));
 const code=await readFile(join(original.directory,'quantity.mjs'));
 const tests=await readFile(join(original.directory,'quantity.test.mjs'));
 if(hashBytes(code)!=='sha256:'+original.artifact_sha256||code.toString()!==original.artifact)throw Error('ORIGINAL_WORKER_ARTIFACT_CHANGED');
 await writeFile(join(directory,'quantity.mjs'),code);
 await writeFile(join(directory,'quantity.test.mjs'),tests);
 const objective=spawnSync(process.execPath,['quantity.test.mjs'],{cwd:directory,encoding:'utf8',timeout:15000});
 const destination=join(artifactRoot,target.host);
 const prompt='Independently review quantity.mjs against this requirement: sum supplied quantities, preserve explicit zero, default only null/undefined quantities to one, empty input gives zero. Read actual code and tests, run node quantity.test.mjs. Do not edit any file or use subagents. Return ACCEPT if correct or REPAIR with a concrete defect. This is a fresh artifact-only review process; no worker report is supplied.';
 const result=await executeFrontier({target,directory,prompt,destination});
 await writeFile(join(destination,'quantity.mjs'),code);
 await writeFile(join(destination,'quantity.test.mjs'),tests);
 await writeFile(join(destination,'objective.json'),JSON.stringify({executable:process.execPath,args:['quantity.test.mjs'],exit_code:objective.status,stdout:objective.stdout,stderr:objective.stderr},null,2)+'\n');
 const unchanged=hashBytes(await readFile(join(directory,'quantity.mjs')))===hashBytes(code)&&hashBytes(await readFile(join(directory,'quantity.test.mjs')))===hashBytes(tests);
 const accepted=objective.status===0&&unchanged&&result.summary.code===0&&!result.summary.timed_out&&!result.telemetry.provider_error&&/^(?:\*\*)?ACCEPT(?:\*\*)?(?:\s|[.:—-]|$)/i.test(result.telemetry.result_text??'')&&result.assurance.overall!=='UNVERIFIED';
 return {host:target.host,observed_at:result.request.started_at,host_version:result.host_version,scope:'Zero/nullish quantity-default fixes in local plain JavaScript only.',original_worker_run:workerRun,original_result_digest:hashBytes(originalBytes),original_worker_stdout_digest:hashBytes(await readFile(join(originalRoot,'worker/stdout.jsonl'))),artifact_digest:hashBytes(code),test_digest:hashBytes(tests),objective_digest:hashBytes(await readFile(join(destination,'objective.json'))),fresh_artifact_only_context:true,unchanged,accepted,output:result.telemetry.result_text,identity_evidence_digest:digest(result.evidence),identity_evidence:result.evidence,request_digest:hashBytes(await readFile(join(destination,'request.json'))),stdout_digest:hashBytes(result.stdout),qualification_authority:false};
}));
const report={schema_version:'frontier_reviewer_evaluations.v1',evaluated_at:new Date().toISOString(),scope:'Zero/nullish quantity-default fixes in local plain JavaScript only.',rows,qualification_authority:false};
await writeFile(join(artifactRoot,'report.json'),JSON.stringify(report,null,2)+'\n');
await writeFile(join(root,'data/routing/frontier-reviewer-evaluations.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({artifactRoot,rows:rows.map(row=>({host:row.host,accepted:row.accepted,identity_assurance:row.identity_evidence.assurance.overall,output:row.output}))}));

}

async function reserve(ledgerFile, entry) {
 const ledger=JSON.parse(await readFile(ledgerFile,'utf8'));
 if(ledger.executions.filter(row=>row.group==='calibration').length>=ledger.calibration_limit)throw Error('CALIBRATION_BUDGET_EXHAUSTED');
 if(ledger.executions.some(row=>row.id===entry.id))throw Error('EXECUTION_ALREADY_RESERVED');
 ledger.executions.push({...entry,group:'calibration',started_at:new Date().toISOString()});
 await writeFile(ledgerFile,JSON.stringify(ledger,null,2)+'\n');
}
export async function evaluateCalibration(manifestFile, outputDirectory, ledgerFile, onlyHost=null){
 const manifestBytes=await readFile(manifestFile,'utf8'),manifest=parseCalibrationManifest(JSON.parse(manifestBytes));
 const fixtureRoot=dirname(resolve(manifestFile)),root=resolve(import.meta.dirname,'..');
 const targets=JSON.parse(await readFile(join(root,'data/routing/frontier-targets.json'),'utf8')).targets.filter(target=>!onlyHost||target.host===onlyHost);
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
    await reserve(ledgerFile,{id:`${target.host}-calibration-worker`,host:target.host,role:'worker',model:workerTarget.model_id,effort:workerTarget.effort,destination:join(destination,'worker')});
    worker=await executeFrontier({target:workerTarget,directory,destination:join(destination,'worker'),write:true,timeoutMs:240000,
     prompt:`Fix quantity.mjs only. Requirement: ${manifest.requirements} Read and run quantity.test.mjs, preserve it unchanged, and verify your correction. Do not install anything, use subagents, or modify other files. Return a concise result and actual check results.`});
   }
   const filesBefore=await readFiles(directory);
   // The objective oracle is independent of the reviewer's claimed verdict.
   const objective=spawnSync(process.execPath,['quantity.test.mjs'],{cwd:directory,encoding:'utf8',timeout:15000});
   const prompt=calibrationPrompt(manifest);
   await reserve(ledgerFile,{id:`${target.host}-calibration-${fixture.id}`,host:target.host,role:'reviewer',model:target.model_id,effort:target.effort,destination:join(destination,'reviewer')});
   const reviewer=await executeFrontier({target,directory,prompt,destination:join(destination,'reviewer')});
   const row={case_id:fixture.id,directory,initial_artifact_digest:hashBytes(original),files_before:filesBefore,files_after:await readFiles(directory),
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
 const {values}=parseArgs({options:{manifest:{type:'string'},output:{type:'string'},ledger:{type:'string'},host:{type:'string'}}});
 if(values.manifest){
  if(!values.output||!values.ledger)throw Error('--manifest requires --output and --ledger');
  await evaluateCalibration(resolve(values.manifest),resolve(values.output),resolve(values.ledger),values.host??null);
 }else await legacyEvaluation();
}
