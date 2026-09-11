import {readFile,writeFile,mkdir,mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {parseArgs} from 'node:util';
import {executeBudgetedFrontier} from './verify/budgeted-frontier.mjs';

// Maintainer-only probes. Output remains staged until independent evidence review.
export async function probeFrontiers({budgetFile,targetsPath='data/routing/frontier-targets.json',outputDirectory=null}={}){
if(!budgetFile)throw Error('APPROVED_BUDGET_REQUIRED');
const {frontierTargetsSchema,frontierProbesSchema}=await import('../dist/routing/frontier-refresh.js');
const {digest,hashBytes}=await import('../dist/core/canonical.js');
const root=resolve(import.meta.dirname,'..');
const targets=frontierTargetsSchema.parse(JSON.parse(await readFile(resolve(targetsPath),'utf8')));
const artifactRoot=outputDirectory??join(root,'artifacts/frontier-probes',String(Date.now()));
await mkdir(dirname(artifactRoot),{recursive:true});await mkdir(artifactRoot);
const errorMessage=value=>{
  if(typeof value==='string'){try{return errorMessage(JSON.parse(value));}catch{return value;}}
  return value?.message?errorMessage(value.message):value?.error?errorMessage(value.error):JSON.stringify(value);
};
const identityEvidence={};
const probes=[];
for(const target of targets.targets){
  const directory=await mkdtemp(join(tmpdir(),`frontier-probe-${target.host}-`));
  await writeFile(join(directory,'quantity.mjs'),'export const totalQuantity = items => items.reduce((n, item) => n + (item.quantity || 1), 0);\n');
  await writeFile(join(directory,'quantity.test.mjs'),"import assert from 'node:assert/strict';\nimport {totalQuantity} from './quantity.mjs';\nassert.equal(totalQuantity([{quantity:0},{quantity:2}]),2);\n");
  const prompt='Read quantity.mjs and run node quantity.test.mjs. Independently diagnose any defect against: preserve explicit zero; default only null/undefined quantities to one. Do not edit files or invoke subagents. Return REPAIR with the cause and precise minimal fix if needed, otherwise ACCEPT. This is a bounded model-availability and diagnostic evaluation, not a request to install anything.';
  const destination=join(artifactRoot,target.host);
  const fixtureBefore=Object.fromEntries(await Promise.all(['quantity.mjs','quantity.test.mjs'].map(async name=>[name,hashBytes(await readFile(join(directory,name)))])));
  const {summary:result,request,stdout,stderr:rawStderr,assurance,evidence,host_version}=await executeBudgetedFrontier({budgetFile,id:`renewal-frontier-probe-${target.host}`,purpose:'renewal_frontier_probe',target,directory,prompt,destination});
  identityEvidence[digest(evidence)]=evidence;
  const {diagnostics,...identity_assurance}=assurance;
  for(const name of ['quantity.mjs','quantity.test.mjs']){const bytes=await readFile(join(directory,name));if(hashBytes(bytes)!==fixtureBefore[name])throw Error('PROBE_FIXTURE_MUTATED');await writeFile(join(destination,name),bytes);}
  await writeFile(join(destination,'fixture-manifest.json'),JSON.stringify({before:fixtureBefore,after:fixtureBefore,unchanged:true},null,2)+'\n');
  const events=stdout.split('\n').flatMap(line=>{try{return [JSON.parse(line)];}catch{return [];}});
  const stderr=rawStderr.trim();
  const errorText=[...new Set(events.filter(e=>e.type==='error'||e.type==='turn.failed'||e.is_error).map(e=>errorMessage(e.message??e.result??e.error??e)))].join('\n');
  const incompatible=/requires a newer version|does not support this model|not supported|model_not_found|not have access/i.test(errorText);
  const completed=result.code===0&&!result.timed_out&&!errorText&&events.some(e=>e.type==='turn.completed'||e.type==='result');
  const availability=completed?'available':incompatible?'unavailable':'unknown';
  const reason=completed?'Native CLI completed; diagnostic output needs maintainer review before routing refresh.':incompatible?errorText:result.timed_out?'Native CLI probe timed out; model availability is undetermined.':`Native CLI did not complete; availability is undetermined. ${[errorText,stderr].filter(Boolean).join('\n').slice(0,1000)}`;
  probes.push({provider:target.provider,host:target.host,model_id:target.model_id,effort:target.effort,host_version,attempted:true,attempted_at:request.started_at,availability,reason,invocation:'native_cli',native_agent_status:'not_probed',configured_model:target.model_id,configured_effort:target.effort,observed_models:identity_assurance.model.assurance==='runtime_attested'?[identity_assurance.model.value]:[],observed_effort:identity_assurance.effort.assurance==='runtime_attested'?identity_assurance.effort.value:null,identity_assurance,identity_evidence_digest:digest(evidence),exit_code:result.code,timed_out:result.timed_out,stdout_digest:`sha256:${result.stdout_sha256}`,stderr_digest:`sha256:${result.stderr_sha256}`,evaluation:{status:completed?'pending_review':'not_run',review_digest:null,note:completed?'Review actual source/test execution and diagnosis; record passed/failed with review digest. This alone never qualifies a route.':'Current frontier could not be evaluated through this CLI invocation; retain eligible evidenced reviewers and report this reason.'}});
}
const report=frontierProbesSchema.parse({schema_version:'frontier_probes.v2',targets_digest:digest(targets),probes});
await writeFile(join(artifactRoot,'identity-evidence.json'),JSON.stringify(identityEvidence,null,2)+'\n');
await writeFile(join(artifactRoot,'report.json'),JSON.stringify(report,null,2)+'\n');
return {artifactRoot,report,identityEvidence};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const {values}=parseArgs({options:{budget:{type:'string'},targets:{type:'string'},output:{type:'string'}}});
 const result=await probeFrontiers({budgetFile:values.budget,targetsPath:values.targets,outputDirectory:values.output});
 console.log(JSON.stringify({artifactRoot:result.artifactRoot,probes:result.report.probes}));
}
