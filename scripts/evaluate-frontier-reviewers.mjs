import {mkdir,mkdtemp,readFile,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {hashBytes,digest} from '../dist/core/canonical.js';
import {executeFrontier} from './verify/frontier-host.mjs';

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
