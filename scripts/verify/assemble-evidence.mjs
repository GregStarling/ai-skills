import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {realpathSync} from 'node:fs';
import {dirname,join,relative,resolve} from 'node:path';

const hashBytes=value=>`sha256:${createHash('sha256').update(value).digest('hex')}`;
const canon=value=>{
  if(value===null||typeof value==='boolean'||typeof value==='string')return JSON.stringify(value);
  if(typeof value==='number'&&Number.isFinite(value))return JSON.stringify(value);
  if(Array.isArray(value))return `[${value.map(canon).join(',')}]`;
  if(!value||typeof value!=='object')throw Error('NON_JSON');
  return `{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${canon(value[key])}`).join(',')}}`;
};
const digest=value=>hashBytes(canon(value));
const readJson=async path=>JSON.parse(await readFile(path,'utf8'));
const cleanModel=model=>typeof model==='string'&&model&& !/^(synthetic|error|unknown|unavailable|undefined|null|none|placeholder|n\/a)$/i.test(model);

function fail(code){const error=new Error(code);error.code=code;throw error;}
function events(text){return text.split('\n').filter(Boolean).flatMap(line=>{try{return [JSON.parse(line)];}catch{return [];}});}
function messages(rows){return rows.filter(row=>row.parent_tool_use_id==null).flatMap(row=>row.message?.content??row.item?.text??[]).map(part=>typeof part==='string'?part:part?.text??'').join('\n');}
function verdict(rows){
  return rows.filter(row=>row.parent_tool_use_id==null).flatMap(row=>row.message?.content??(row.item?.text?[{text:row.item.text}]:[]))
    .map(part=>(typeof part==='string'?part:part?.text??'').trim().replace(/^\*\*(ACCEPT|REPAIR)\*\*(?=\s|$)/,'$1')).findLast(text=>/^(ACCEPT|REPAIR)\b/.test(text));
}
function toolEvents(rows){
  const results=new Map();
  for(const row of rows)for(const part of row.message?.content??[])if(part?.type==='tool_result')results.set(part.tool_use_id,part);
  return rows.flatMap(row=>{
    if(row.parent_tool_use_id!=null)return [];
    const uses=(row.message?.content??[]).filter(part=>part?.type==='tool_use').map(tool=>({id:tool.id,name:tool.name,input:tool.input,text:JSON.stringify(tool.input??{}),result:results.get(tool.id),ok:results.has(tool.id)&&results.get(tool.id)?.is_error!==true}));
    if(row.item?.type==='command_execution')uses.push({id:row.item.id,name:'Bash',input:{command:row.item.command},text:`${row.item.command}\n${row.item.aggregated_output??''}`,result:null,ok:row.item.status==='completed'&&row.item.exit_code===0});
    return uses;
  });
}
function inspectionCommand(command,cwd){
  // Native Codex wraps commands in a shell; retain the actual inner command.
  command=command.replace(/^\/bin\/(?:zsh|bash|sh)\s+-[lc]+\s+(['"])([\s\S]*)\1$/,'$2');
  // A redundant change to the captured cwd does not change path attribution.
  const cd=/^cd (?:"([^"]+)"|'([^']+)'|([^\s;]+)) && /.exec(command);
  if(cwd&&cd&&physicalPath(cd[1]??cd[2]??cd[3])===physicalPath(cwd))command=command.slice(cd[0].length);
  // This literal separator emits no artifact text. Other echo/printf remain rejected.
  return command.replaceAll(' && echo ---- && ',' && ');
}
const physicalPath=path=>{try{return realpathSync(path);}catch{return resolve(path);}};
function inspectedArtifacts(tools,artifactPaths,cwd){
  if(!cwd)return new Set();
  return new Set(tools.filter(t=>t.ok).flatMap(t=>{
    if(t.name==='Read')return artifactPaths.filter(path=>physicalPath(resolve(cwd,t.input?.file_path??''))===physicalPath(path));
    const command=inspectionCommand(t.input?.command??'',cwd);
    if(t.name!=='Bash'||/\b(?:echo|printf|cd)\s/.test(command)||/\bgit\b[^;&|]*\s-C\s/.test(command))return [];
    if(!/\b(?:cat|sed|head|tail|rg|grep|nl)\b/.test(command)&&!/\bgit\b[^\n]*\b(?:diff|show)\b/.test(command)&&!/\bnode\b[^\n]*\breadFile(?:Sync)?\b/.test(command))return [];
    const containsPath=path=>{
      const escaped=path.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
      return new RegExp(`(?:^|[\\s'"])${escaped}(?=$|[\\s'";])`).test(command);
    };
    return artifactPaths.filter(path=>containsPath(path)||containsPath(relative(cwd,path)));

  }));
}

function hasSuccessfulCheck(tools,result){
  if(result.after?.passed===true)return true;
  return tools.some(t=>t.ok&&t.name==='Bash'&&/(?:^|&&|;|\n)\s*node\s+(?:--test\s+)?quantity\.test\.mjs(?=\s|;|$)/.test(inspectionCommand(t.input?.command??'')));
}
function observedModels(rows){return [...new Set(rows.filter(row=>row.parent_tool_use_id==null&&!row.is_error&&!row.is_api_error_message&&!row.error).map(row=>row.message?.model).filter(cleanModel))];}
function modelMatches(t,model){return model===t.model_id||model===t.snapshot_id||model===t.family;}
function sameEffort(a,b){return a===b||(a==null&&b==='not_applicable')||(a==='not_applicable'&&b==null);}
function hostName(host){return host==='claude-haiku'?'claude':host==='codex-standard'?'codex':host;}
function configured(args,host){
  const modelIndex=args?.indexOf(host==='claude'?'--model':'-m')??-1;
  const model=modelIndex<0?null:args[modelIndex+1];
  const effortIndex=args?.indexOf('--effort')??-1;
  const effort=host==='claude'?(effortIndex===-1?null:args[effortIndex+1]):(args??[]).find((value,i)=>args[i-1]==='-c'&&/^model_reasoning_effort=/.test(value))?.match(/"([^"]+)"/)?.[1];
  return {model,effort:effort??null};
}

async function rawExecution(runRoot,role,summary){
  const raw=await readFile(join(runRoot,role,'stdout.jsonl'));
  if(!/^[a-f0-9]{64}$/.test(summary?.stdout_sha256??'')||hashBytes(raw)!==`sha256:${summary.stdout_sha256}`)fail('STDOUT_HASH_MISMATCH');
  const requestRaw=await readFile(join(runRoot,role,'request.json')).catch(()=>null);
  const request=requestRaw?JSON.parse(requestRaw.toString('utf8')):null;
  return {raw,rows:events(raw.toString('utf8')),digest:hashBytes(raw),request,requestDigest:requestRaw?hashBytes(requestRaw):null};
}

function treatmentByRole(treatments,host,model,effort,frontier){
  const matches=treatments.filter(t=>t.evidence?.host===host&&t.frontier===frontier&&modelMatches(t,model)&&sameEffort(effort,t.effort));
  if(matches.length!==1)fail('TREATMENT_MISMATCH');
  return matches[0];
}

function withFreshMetadata(template,metadata,run,role,execution,reviewDigest,artifactDigest){
  const [model,effort]=run.treatments[role];
  const base=treatmentByRole(template.treatments,hostName(run.host),model,effort,role==='reviewer');
  const fresh=metadata.treatments.find(t=>t.candidate_id===base.candidate_id);
  if(!fresh?.availability||!fresh?.pricing)fail('METADATA_MISMATCH');
  const observed=observedModels(execution.rows);
  if(observed.some(row=>!modelMatches(base,row)))fail('OBSERVED_MODEL_MISMATCH');
  if(!run[role]?.host_version)fail('HOST_VERSION_MISSING');
  return {...base,evidence:{...base.evidence,
    observed_at:run[role]?.started_at??run.objective?.started_at,
    host_version:run[role].host_version,
    observed_model_id:observed[0]??base.model_id,
    observed_effort:null,
    configured_effort:base.effort,
    effort_source:base.effort==='not_applicable'?'not_applicable':'requested_configuration',
    identity_source:observed.length?'runtime':'host_configuration',
    availability:fresh.availability,pricing:fresh.pricing,
    smoke:{task:role==='worker'?'tinybug: preserve zero and default only null/undefined quantities':'independently inspect the quantity artifact, execute its tests and return ACCEPT or REPAIR',
      artifact_digest:artifactDigest,execution_digest:execution.digest,review_digest:reviewDigest,accepted:true,frontier_reviewed:true},
    qualification_failure:null,
  }};
}

async function checkedSmokeRun(path){
  const run=await readJson(path),root=dirname(path);
  if(run.scope!=='tinybug: zero/nullish quantity default only')fail('SMOKE_SCOPE_MISMATCH');
  if(!['codex','codex-standard','claude','claude-haiku'].includes(run.host)||!run.treatments?.worker||!run.treatments?.reviewer||run.objective?.code!==0||run.worker?.code!==0||run.worker?.timed_out||run.reviewer?.code!==0||run.reviewer?.timed_out)fail('RUN_REJECTED');
  const artifactPath=run.artifact_path??join(root,'quantity.mjs');
  const artifact=await readFile(artifactPath);
  const artifactDigest=hashBytes(artifact);
  if(!run.artifact_before_review_digest||!run.artifact_after_review_digest||!run.artifact_sha256)fail('ARTIFACT_HASH_MISSING');
  if(artifactDigest!==`sha256:${run.artifact_sha256}`||run.artifact_before_review_digest!==artifactDigest||run.artifact_after_review_digest!==artifactDigest)fail('ARTIFACT_HASH_MISMATCH');
  const worker=await rawExecution(root,'worker',run.worker),reviewer=await rawExecution(root,'reviewer',run.reviewer);
  for(const [role,execution] of [['worker',worker],['reviewer',reviewer]]){
    const [model,effort]=run.treatments[role];
    const requestHost=hostName(run.host),seen=configured(execution.request?.args??[],requestHost);
    if(!execution.request?.started_at||execution.request.started_at!==run[role].started_at||seen.model!==model||!sameEffort(seen.effort,effort??'not_applicable'))fail('REQUEST_MISMATCH');
  }
  const reviewerTools=toolEvents(reviewer.rows);
  if(!inspectedArtifacts(reviewerTools,[resolve(run.directory??reviewer.request?.cwd,'quantity.mjs')],reviewer.request?.cwd).size||!hasSuccessfulCheck(reviewerTools,run)||!/^ACCEPT\b/.test(verdict(reviewer.rows)??''))fail('REVIEW_REJECTED');
  const workerTools=toolEvents(worker.rows);
  if(!inspectedArtifacts(workerTools,[resolve(run.directory??worker.request?.cwd,'quantity.mjs')],worker.request?.cwd).size||!hasSuccessfulCheck(workerTools,run))fail('WORKER_TRACE_REJECTED');
  return {run,artifactDigest,worker,reviewer};
}

export async function assembleSmokeEvidence({template,metadata,runs}){
  const [templateJson,metadataJson]=await Promise.all([readJson(template),readJson(metadata)]);
  if(metadataJson.treatments?.length!==6||runs.length!==4)fail('SMOKE_MATRIX_MISMATCH');
  const checked=await Promise.all(runs.map(checkedSmokeRun));
  const runKeys=new Set(checked.map(({run})=>`${run.host}:${run.treatments.worker[0]}:${run.treatments.worker[1]??'not_applicable'}`));
  if(runKeys.size!==4)fail('SMOKE_MATRIX_MISMATCH');
  if(new Set(checked.map(item=>item.reviewer.digest)).size!==4||new Set(checked.map(item=>item.reviewer.requestDigest)).size!==4)fail('REUSED_REVIEW_EXECUTION');
  const treatmentMap=new Map();
  const runRows=[];
  for(const item of checked){
    const {run,artifactDigest,worker,reviewer}=item;
    const workerTreatment=withFreshMetadata(templateJson,metadataJson,run,'worker',worker,reviewer.digest,artifactDigest);
    const reviewerTreatment=withFreshMetadata(templateJson,metadataJson,run,'reviewer',reviewer,reviewer.digest,artifactDigest);
    treatmentMap.set(workerTreatment.candidate_id,workerTreatment);
    treatmentMap.set(reviewerTreatment.candidate_id,reviewerTreatment);
    runRows.push({id:run.run_id??run.id??`${run.host}-${run.treatments.worker.join('-')}`,host:hostName(run.host),scope:run.scope,objective_passed:true,
      artifact_digest:artifactDigest,worker_stdout_digest:worker.digest,reviewer_stdout_digest:reviewer.digest,
      worker:{model:workerTreatment.model_id,configured_effort:workerTreatment.effort},
      reviewer:{model:reviewerTreatment.model_id,configured_effort:reviewerTreatment.effort,verdict:'ACCEPT'}});
  }
  const treatments=[...treatmentMap.values()];
  if(treatments.length!==6)fail('SMOKE_MATRIX_MISMATCH');
  const observations={sources:metadataJson.sources??[],treatments,runs:runRows};
  const mediumReviews=runRows.filter(row=>row.host==='claude').map(row=>{
    const worker=treatments.find(t=>t.evidence.host==='claude'&&!t.frontier&&row.worker.model===t.model_id&&row.worker.configured_effort===t.effort);
    const reviewer=treatments.find(t=>t.evidence.host==='claude'&&t.frontier&&row.reviewer.model===t.model_id&&row.reviewer.configured_effort===t.effort);
    if(!worker||!reviewer)fail('MEDIUM_AUDIT_MISMATCH');
    return {run_id:row.id,run_digest:digest(row),worker_identity:digest({provider:worker.provider,snapshot_id:worker.snapshot_id??worker.model_id,effort:worker.effort,serving:Object.fromEntries([...worker.material_serving_settings].sort().map(key=>[key,worker.serving[key]]))}),
      reviewer_identity:digest({provider:reviewer.provider,snapshot_id:reviewer.snapshot_id??reviewer.model_id,effort:reviewer.effort,serving:Object.fromEntries([...reviewer.material_serving_settings].sort().map(key=>[key,reviewer.serving[key]]))}),
      reviewer_request_digest:checked.find(item=>(item.run.run_id??item.run.id)===row.id)?.reviewer.requestDigest,reviewer_execution_digest:row.reviewer_stdout_digest,artifact_digest:row.artifact_digest,fresh_artifact_only_context:true};
  });
  return {observations,mediumAudit:{schema_version:'medium_smoke_audit.v1',source_digest:digest(observations),scope:'Zero/nullish quantity-default fixes in local plain JavaScript only.',reviews:mediumReviews}};
}

async function checkedMaintainerReview(reviewPath,resultPath,result,stdout,artifactNames){
  const review=await readJson(reviewPath);
  if(review.schema_version!=='maintainer_trace_review.v1'||review.result_digest!==hashBytes(await readFile(resultPath))||review.stdout_digest!==hashBytes(stdout)||!review.author||review.passed!==true)fail('MAINTAINER_REVIEW_REJECTED');
  if(!Array.isArray(review.inspection_tool_ids)||review.inspection_tool_ids.length<1)fail('MAINTAINER_REVIEW_REJECTED');
  const tools=toolEvents(events(stdout.toString('utf8')));
  for(const id of review.inspection_tool_ids)if(!tools.some(t=>t.id===id))fail('MAINTAINER_REVIEW_REJECTED');
  const selected=tools.filter(t=>review.inspection_tool_ids.includes(t.id));
  if(inspectedArtifacts(selected,artifactNames.map(name=>resolve(result.fixture_directory??result.directory,name)),result.directory).size!==artifactNames.length||!hasSuccessfulCheck(selected,result))fail('MAINTAINER_REVIEW_REJECTED');
  if(!review.workers?.length||!review.frontier?.configuration||!Array.isArray(review.frontier.observed_message_models))fail('MAINTAINER_REVIEW_REJECTED');
  return review;
}

async function verifiedArtifacts(root,digests){
  if(!digests||!Object.keys(digests).length)fail('ARTIFACT_HASH_MISSING');
  for(const [name,expected] of Object.entries(digests)){
    if(hashBytes(await readFile(join(root,'artifacts',name)))!==expected)fail('ARTIFACT_HASH_MISMATCH');
  }
  return Object.keys(digests);
}

async function validReceiptDigests(root,result){
  const rows=(result.receipts??[]).filter(entry=>entry?.value&&entry.error===undefined&&entry.run_binding==='matched'&&entry.value.run_id===result.run_id&&/^[a-f0-9]{64}$/.test(entry.sha256??''));
  if(!rows.length)fail('ACCEPTANCE_REJECTED');
  for(const entry of rows){
    const raw=await readFile(join(root,'receipts',entry.sha256+'.json')).catch(()=>fail('RECEIPT_BYTES_MISSING'));
    if(hashBytes(raw)!=='sha256:'+entry.sha256||digest(JSON.parse(raw))!==digest(entry.value))fail('RECEIPT_HASH_MISMATCH');
  }
  return [...new Set(rows.map(entry=>`sha256:${entry.sha256}`))];
}

export async function assembleAcceptanceEvidence({results,validatedAt,folderDigest,hostVersions}){
  const cases=[];
  for(const {resultPath,reviewPath} of results){
    const result=await readJson(resultPath),root=dirname(resultPath);
    const stdout=await readFile(join(root,'coordinator','stdout.jsonl'));
    const artifactNames=await verifiedArtifacts(root,result.artifact_digests);
    const review=await checkedMaintainerReview(reviewPath,resultPath,result,stdout,artifactNames);
    if(result.ledger?.rows.some(row=>row.role!=='coordinator'&&!row.budget_only&&!row.failed_launch&&(row.ended_at==null||['failed','killed','stopped','errored','shutdown'].includes(row.completion_status))))fail('WORKER_DELIVERY_INCOMPLETE');
    if(['blocked_provider_limit','blocked_cap','HOST_STOPPED'].includes(result.acceptance)||!['PASS','PASS_WITH_HARNESS_RECOVERY','pending_frontier_trace_review'].includes(result.acceptance)||result.execution?.code!==0||result.execution?.timed_out||result.after?.passed!==true||result.instructions_unchanged!==true)fail('ACCEPTANCE_REJECTED');
    if(result.copied_skill_folder_digest_after&&result.skill_folder_digest&&result.copied_skill_folder_digest_after!==result.skill_folder_digest)fail('ACCEPTANCE_REJECTED');
    if(review.workers.some(w=>!w.observed_written_files?.length))fail('ACCEPTANCE_REJECTED');
    const receiptDigests=await validReceiptDigests(root,result);
    cases.push({id:result.run_id??`${result.host}-${result.name}-${Date.parse(result.execution.started_at)}`,host:result.host,case:result.name,acceptance:'PASS',
      original_attempt:{started_at:result.execution.started_at,exit_code:result.execution.code,timed_out:false,duration_ms:result.execution.duration_ms??0},
      copied_skill_digest:result.copied_skill_digest??result.skill_folder_digest,worker_count:review.workers.length,workers:review.workers,
      frontier:{configuration:review.frontier.configuration,observed_message_models:review.frontier.observed_message_models,actual_artifact_inspected:true,check_count:review.inspection_tool_ids.length},
      external_grader_passed:true,artifact_digests:result.artifact_digests,receipt_count:receiptDigests.length,
      receipt_digests:receiptDigests,recovery:null,browser:review.browser??null,
      trace_digests:[hashBytes(stdout)],result_digest:hashBytes(await readFile(resultPath))});
  }
  return {schema_version:'installed_delegate_acceptance.v1',validated_at:validatedAt,final_consumer_folder_digest:folderDigest,host_versions:hostVersions,cases};
}
