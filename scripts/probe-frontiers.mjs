import {readFile,writeFile,mkdir,mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {frontierTargetsSchema,frontierProbesSchema} from '../dist/routing/frontier-refresh.js';
import {digest,hashBytes} from '../dist/core/canonical.js';
import {executeFrontier} from './verify/frontier-host.mjs';

// Maintainer-only, authenticated native CLI probes. Success requires independent evidence review.
const root=resolve(import.meta.dirname,'..');
const targets=frontierTargetsSchema.parse(JSON.parse(await readFile(join(root,'data/routing/frontier-targets.json'),'utf8')));
const artifactRoot=join(root,'artifacts/frontier-probes',String(Date.now()));
await mkdir(artifactRoot,{recursive:true});
const errorMessage=value=>{
  if(typeof value==='string'){try{return errorMessage(JSON.parse(value));}catch{return value;}}
  return value?.message?errorMessage(value.message):value?.error?errorMessage(value.error):JSON.stringify(value);
};
const identityEvidence={};
const probes=await Promise.all(targets.targets.map(async target=>{
  const directory=await mkdtemp(join(tmpdir(),`frontier-probe-${target.host}-`));
  await writeFile(join(directory,'quantity.mjs'),'export const totalQuantity = items => items.reduce((n, item) => n + (item.quantity || 1), 0);\n');
  await writeFile(join(directory,'quantity.test.mjs'),"import assert from 'node:assert/strict';\nimport {totalQuantity} from './quantity.mjs';\nassert.equal(totalQuantity([{quantity:0},{quantity:2}]),2);\n");
  const prompt='Read quantity.mjs and run node quantity.test.mjs. Independently diagnose any defect against: preserve explicit zero; default only null/undefined quantities to one. Do not edit files or invoke subagents. Return REPAIR with the cause and precise minimal fix if needed, otherwise ACCEPT. This is a bounded model-availability and diagnostic evaluation, not a request to install anything.';
  const destination=join(artifactRoot,target.host);
  const fixtureBefore=Object.fromEntries(await Promise.all(['quantity.mjs','quantity.test.mjs'].map(async name=>[name,hashBytes(await readFile(join(directory,name)))])));
  const {summary:result,request,stdout,stderr:rawStderr,assurance,evidence,host_version}=await executeFrontier({target,directory,prompt,destination});
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
  return {provider:target.provider,host:target.host,model_id:target.model_id,effort:target.effort,host_version,attempted:true,attempted_at:request.started_at,availability,reason,invocation:'native_cli',native_agent_status:'not_probed',configured_model:target.model_id,configured_effort:target.effort,observed_models:identity_assurance.model.assurance==='runtime_attested'?[identity_assurance.model.value]:[],observed_effort:identity_assurance.effort.assurance==='runtime_attested'?identity_assurance.effort.value:null,identity_assurance,identity_evidence_digest:digest(evidence),exit_code:result.code,timed_out:result.timed_out,stdout_digest:`sha256:${result.stdout_sha256}`,stderr_digest:`sha256:${result.stderr_sha256}`,evaluation:{status:completed?'pending_review':'not_run',review_digest:null,note:completed?'Review actual source/test execution and diagnosis; record passed/failed with review digest. This alone never qualifies a route.':'Current frontier could not be evaluated through this CLI invocation; retain eligible evidenced reviewers and report this reason.'}};
}));
const report=frontierProbesSchema.parse({schema_version:'frontier_probes.v2',targets_digest:digest(targets),probes});
await writeFile(join(artifactRoot,'identity-evidence.json'),JSON.stringify(identityEvidence,null,2)+'\n');
await writeFile(join(root,'data/routing/frontier-identity-evidence.json'),JSON.stringify(identityEvidence,null,2)+'\n');
await writeFile(join(artifactRoot,'report.json'),JSON.stringify(report,null,2)+'\n');
await writeFile(join(root,'data/routing/frontier-probes.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({artifactRoot,probes:probes.map(p=>({host:p.host,model:p.model_id,availability:p.availability,reason:p.reason,evaluation:p.evaluation.status,identity_assurance:p.identity_assurance}))}));
