import {readFile,writeFile,mkdir,mkdtemp} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {frontierTargetsSchema,frontierProbesSchema} from '../dist/routing/frontier-refresh.js';
import {digest} from '../dist/core/canonical.js';
import {execute} from './verify/host-evidence.mjs';

// Maintainer-only, authenticated native CLI probes. Success requires human evaluation review.
const root=resolve(import.meta.dirname,'..');
const targets=frontierTargetsSchema.parse(JSON.parse(await readFile(join(root,'data/routing/frontier-targets.json'),'utf8')));
const artifactRoot=join(root,'artifacts/frontier-probes',String(Date.now()));
await mkdir(artifactRoot,{recursive:true});
const errorMessage=value=>{
  if(typeof value==='string'){try{return errorMessage(JSON.parse(value));}catch{return value;}}
  return value?.message?errorMessage(value.message):value?.error?errorMessage(value.error):JSON.stringify(value);
};
const probes=await Promise.all(targets.targets.map(async target=>{
  const directory=await mkdtemp(join(tmpdir(),`frontier-probe-${target.host}-`));
  await writeFile(join(directory,'quantity.mjs'),'export const totalQuantity = items => items.reduce((n, item) => n + (item.quantity || 1), 0);\n');
  await writeFile(join(directory,'quantity.test.mjs'),"import assert from 'node:assert/strict';\nimport {totalQuantity} from './quantity.mjs';\nassert.equal(totalQuantity([{quantity:0},{quantity:2}]),2);\n");
  const version=spawnSync(target.host,['--version'],{encoding:'utf8',timeout:15000});
  const versionError=version.status===0?'':String(version.error??version.stderr??'Version command failed').trim();
  const prompt='Read quantity.mjs and run node quantity.test.mjs. Independently diagnose any defect against: preserve explicit zero; default only null/undefined quantities to one. Do not edit files or invoke subagents. Return REPAIR with the cause and precise minimal fix if needed, otherwise ACCEPT. This is a bounded model-availability and diagnostic evaluation, not a request to install anything.';
  const args=target.host==='codex'
    ? ['exec','--ignore-user-config','--ignore-rules','--ephemeral','--skip-git-repo-check','-C',directory,'-s','read-only','-m',target.model_id,'-c',`model_reasoning_effort="${target.effort}"`,'--json','-']
    : ['-p','--model',target.model_id,'--effort',target.effort,'--output-format','stream-json','--verbose','--no-session-persistence','--setting-sources','','--strict-mcp-config','--mcp-config','{"mcpServers":{}}','--permission-mode','dontAsk','--tools','Read,Bash','--allowedTools','Read,Bash(node quantity.test.mjs)','--max-budget-usd','2'];
  const destination=join(artifactRoot,target.host);
  const result=await execute(target.host,args,directory,prompt,destination,90000);
  const request=JSON.parse(await readFile(join(destination,'request.json'),'utf8'));
  const events=(await readFile(join(destination,'stdout.jsonl'),'utf8')).split('\n').flatMap(line=>{try{return [JSON.parse(line)];}catch{return [];}});
  const stderr=(await readFile(join(destination,'stderr.log'),'utf8')).trim();
  const errorText=[...new Set(events.filter(e=>e.type==='error'||e.type==='turn.failed'||e.is_error).map(e=>errorMessage(e.message??e.result??e.error??e)))].join('\n');
  const incompatible=/requires a newer version|does not support this model|not supported|model_not_found|not have access/i.test(errorText);
  const completed=result.code===0&&!result.timed_out&&!errorText&&events.some(e=>e.type==='turn.completed'||e.type==='result');
  const availability=completed?'available':incompatible?'unavailable':'unknown';
  const reason=completed?'Native CLI completed; diagnostic output needs maintainer review before routing refresh.':incompatible?errorText.slice(0,1200):result.timed_out?'Native CLI probe timed out; model availability is undetermined.':`Native CLI did not complete; availability is undetermined. ${[versionError,errorText,stderr].filter(Boolean).join('\n').slice(0,1000)}`;
  return {provider:target.provider,host:target.host,model_id:target.model_id,effort:target.effort,host_version:version.stdout?.trim()||'unknown (version command failed)',attempted:true,attempted_at:request.started_at,availability,reason,invocation:'native_cli',native_agent_status:'not_probed',observed_models:result.observed_models,observed_effort:null,exit_code:result.code,timed_out:result.timed_out,stdout_digest:`sha256:${result.stdout_sha256}`,stderr_digest:`sha256:${result.stderr_sha256}`,evaluation:{status:completed?'pending_review':'not_run',review_digest:null,note:completed?'Review actual source/test execution and diagnosis; record passed/failed with review digest. This alone never qualifies a route.':'Current frontier could not be evaluated through this CLI invocation; retain eligible evidenced reviewers and report this reason.'}};
}));
const report=frontierProbesSchema.parse({schema_version:'frontier_probes.v1',targets_digest:digest(targets),probes});
await writeFile(join(artifactRoot,'report.json'),JSON.stringify(report,null,2)+'\n');
await writeFile(join(root,'data/routing/frontier-probes.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({artifactRoot,probes:probes.map(p=>({host:p.host,model:p.model_id,availability:p.availability,reason:p.reason,evaluation:p.evaluation.status}))}));
