import assert from 'node:assert/strict';
import {mkdirSync,readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {digest,hashBytes} from '../../dist/core/canonical.js';
import {expandRoutingPack,validateRoutingPackPublication} from '../../dist/routing/index.js';
import {requireFrontierRefresh} from '../../dist/routing/frontier-refresh.js';

// Deterministic release proof; native probes/reviews are captured separately.
const read=path=>JSON.parse(readFileSync(path,'utf8'));
const output='artifacts/v5-validation';mkdirSync(output,{recursive:true});
const cli=(name,input,tag,success=true)=>{
  const path=join(output,`${tag}.request.json`);writeFileSync(path,JSON.stringify(input));
  const run=spawnSync(process.execPath,['dist/cli/index.js',name,'--input',path],{encoding:'utf8',timeout:30000,maxBuffer:4*1024*1024});
  writeFileSync(join(output,`${tag}.stdout.json`),run.stdout??'');writeFileSync(join(output,`${tag}.stderr.log`),run.stderr??'');
  assert.equal(run.status===0,success,`${tag}: ${run.stderr||run.stdout}`);return JSON.parse(run.stdout);
};
const wire=validateRoutingPackPublication(read('skills/delegate/routing-pack.json')),pack=expandRoutingPack(wire);
assert.equal(pack.policy_version,5);cli('validate-routing-pack',wire,'publication');
const probes=requireFrontierRefresh(read('data/routing/frontier-targets.json'),read('data/routing/frontier-probes.json'),new Date().toISOString(),7,read('data/routing/frontier-identity-evidence.json')).probes;
const routes=pack.routes.map((route,index)=>{
  const all=[...route.workers,...route.reviewers];const host=all[0].provisional?.host??(route.stratum.worker_request.execution_environment==='claude_code'?'claude':'codex');
  const request={publicTaskClass:route.public_task_class,stratumDigest:route.stratum_digest,now:new Date().toISOString(),host:{host,treatments:all.map(({provider,model_id,snapshot_id,effort,serving})=>({provider,model_id,snapshot_id,effort,serving})),tools:route.requirements.tools,capabilities:route.requirements.capabilities,context_window_tokens:Math.max(route.requirements.context_window_tokens,1000000),supports_fresh_context:true}};
  const selected=cli('resolve-routing',{pack:wire,request},`route-${index}`);
  const fallbackRequest={...request,failedCandidateIds:[selected.worker.candidate_id]};
  const hasFallback=route.workers.some(candidate=>candidate.candidate_id!==selected.worker.candidate_id);
  const fallback=cli('resolve-routing',{pack:wire,request:fallbackRequest},`fallback-${index}`,hasFallback);
  if(hasFallback)assert.notEqual(fallback.worker.candidate_id,selected.worker.candidate_id);
  if(route.stratum.worker_request.risk==='medium')cli('resolve-routing',{pack:wire,request:{...request,host:{...request.host,supports_fresh_context:false}}},`medium-fresh-denial-${index}`,false);
  return {task_class:route.public_task_class,stratum_digest:route.stratum_digest,worker:selected.worker.candidate_id,reviewer:selected.reviewer.candidate_id,fallback:hasFallback?fallback.worker.candidate_id:'correctly_refused'};
});
cli('validate-routing-pack',{...wire,schema_version:'routing_pack.v2'},'old-pack-denial',false);
const policy4=read('policy/constitution-v4.json'),policy5=read('policy/constitution.json');
const retained=policy=>Object.fromEntries(Object.entries(policy).filter(([key])=>!['policy_version','provenance','identity_assurance'].includes(key)));
assert.deepEqual(retained(policy4),retained(policy5));
const files=(directory,prefix='')=>readdirSync(directory,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?files(join(directory,entry.name),`${prefix}${entry.name}/`):[{path:`${prefix}${entry.name}`,content_digest:hashBytes(readFileSync(join(directory,entry.name)))}]);
const folder=files('skills/delegate').sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
const report={schema_version:'v5_validation.v1',generated_at:new Date().toISOString(),status:'passed',policy_v4_digest:hashBytes(readFileSync('policy/constitution-v4.json')),non_identity_policy_fields_unchanged:true,pack_digest:wire.content_digest,pack_bytes:readFileSync('skills/delegate/routing-pack.json').length,delegate_folder_digest:digest(folder),delegate_files:folder,route_count:routes.length,qualified_routes:pack.routes.filter(r=>r.workers.some(w=>w.evidence_tier==='qualified')).length,provisional_routes:pack.routes.filter(r=>r.workers.some(w=>w.evidence_tier==='provisional')).length,frontiers:probes.probes.map(p=>({host:p.host,host_version:p.host_version,model:p.model_id,effort:p.effort,identity_assurance:p.identity_assurance,evaluation:p.evaluation})),routes,checks:['built_cli_publication','all_route_resolution','failed_worker_fallback','medium_fresh_context_denial','old_pack_refusal','frontier_identity_rederivation','policy_threshold_preservation'],scope:'CLI/structural proof. Native host identity and diagnostic review have separate authentic capture records; this does not claim real task qualification or new installed-folder acceptance.'};
writeFileSync('data/routing/v5-validation.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,routes:routes.length,pack_digest:wire.content_digest,delegate_folder_digest:report.delegate_folder_digest}));
