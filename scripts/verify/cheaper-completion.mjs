#!/usr/bin/env node
/**
 * Completion report validator for the bounded cheaper-coordination campaign.
 *
 * Report schema (cheaper_completion_report.v1):
 * {
 *   schema_version: 'cheaper_completion_report.v1', generated_at: ISO-8601,
 *   source_revision: <current 40-character git HEAD>,
 *   source_manifest: [{path: <relative source file>, sha256: 'sha256:...'}],
 *   checks: [{id: <CHECKLIST_IDS entry>, status: 'passed'|'failed'|'blocked'|'not_run',
 *     evidence: [{path: <relative file>, sha256: 'sha256:...', kind: <EVIDENCE_KIND>,
 *       behavioral_proof?: 'maintainer_assertion_not_cryptographic'}], objective?: object}],
 *   installations: [{source: {path, digest}, installed: {path, digest}, manifest: <evidence ref>}],
 *   defaults: [{host: 'codex'|'claude', path, sha256, expected_model}], limitations: string[]
 * }
 *
 * This validates report integrity and objective local facts.  A maintainer assertion
 * is deliberately not cryptographic proof of a model's behaviour; native trace and
 * independent-grade evidence are required for host pilot/live gates.
 */
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {lstat,readFile,readdir} from 'node:fs/promises';
import {dirname,relative,resolve,sep,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {homedir} from 'node:os';
import {readBudget,countNativeExecutions} from './campaign-budget.mjs';
import {executionLedger} from './trace-ledger.mjs';
import {auditTask,reviewRequirement} from '../../skills/delegate/scripts/local-learning.mjs';

export const CHECKLIST_IDS=Object.freeze([
  'AUTOMATIC-DISCOVERY','AUTOMATIC-DELEGATION','PERMISSION-HANDLING','USER-CONTROL',
  'POLICY','ROUTING','REVIEW','COMPATIBILITY','OFFLINE','CODEX-PILOT','CLAUDE-PILOT',
  'ACCOUNTING','INSTALLATION','DEFAULTS','CODEX-LIVE','CLAUDE-LIVE','ROLLBACK','PROOF','DELIVERY',
  'POLICY-ALIGNMENT','PLANNING','CRITICAL-DECISIONS','FEATURE-REVIEW','RESEARCH-PDF','HARD-BUGS',
  'AUTOMATIC-BEHAVIOR','HOST-PILOTS','INSTALLATION-DEFAULTS','LIVE-REVIEW','PROOF-DELIVERY'
]);
export const STATUSES=Object.freeze(['passed','failed','blocked','not_run']);
export const EVIDENCE_KINDS=Object.freeze(['command_output','test_output','native_trace','external_grade','installation_manifest','default_config','source_manifest','rollback_record','maintainer_assertion']);
export const REPORT_SCHEMA='cheaper_completion_report.v1';

const SHA=/^sha256:[a-f0-9]{64}$/;
const REVISION=/^[a-f0-9]{40}$/;
const assertionMarker='maintainer_assertion_not_cryptographic';
const fail=code=>{throw Error(code);};
const plain=value=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&Object.getPrototypeOf(value)===Object.prototype;
const hash=value=>`sha256:${createHash('sha256').update(value).digest('hex')}`;
export const hashBytes=hash;

function canonical(value){
  if(value===null||typeof value==='string'||typeof value==='boolean'||(typeof value==='number'&&Number.isFinite(value)))return JSON.stringify(value);
  if(Array.isArray(value))return `[${value.map(canonical).join(',')}]`;
  if(plain(value))return `{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  fail('NON_JSON_VALUE');
}
const digest=value=>hash(canonical(value));

function safePath(root,path,code){
  if(typeof path!=='string'||!path||path.includes('\\0'))fail(code);
  const absolute=resolve(root,path), rootPrefix=root.endsWith(sep)?root:root+sep;
  if(absolute!==root&&!absolute.startsWith(rootPrefix))fail(code);
  return absolute;
}
function refShape(ref,code='EVIDENCE_MALFORMED'){
  if(!plain(ref)||typeof ref.path!=='string'||!SHA.test(ref.sha256)||!EVIDENCE_KINDS.includes(ref.kind))fail(code);
  if(ref.kind==='maintainer_assertion'&&ref.behavioral_proof!==assertionMarker)fail('ASSERTION_BEHAVIOR_PROOF_MISLABELED');
  if(ref.kind!=='maintainer_assertion'&&Object.hasOwn(ref,'behavioral_proof'))fail(code);
}
async function verifyRef(root,ref,code='EVIDENCE_HASH_MISMATCH'){
  refShape(ref);
  const path=safePath(root,ref.path,'EVIDENCE_PATH_INVALID');
  let stat; try{stat=await lstat(path);}catch{fail('EVIDENCE_MISSING');}
  if(!stat.isFile()||stat.isSymbolicLink())fail('EVIDENCE_PATH_INVALID');
  if(hash(await readFile(path))!==ref.sha256)fail(code);
}
async function verifyRefs(root,refs){
  if(!Array.isArray(refs)||refs.length<1)fail('EVIDENCE_REQUIRED');
  for(const ref of refs)await verifyRef(root,ref);
}

/** Matches Delegate's folderDigest convention: canonical sorted relative file hashes, ignoring dot files. */
export async function folderDigest(directory){
  const root=resolve(directory), files={};
  async function visit(base){
    let entries; try{entries=await readdir(base,{withFileTypes:true});}catch{fail('FOLDER_MISSING');}
    for(const entry of entries.sort((a,b)=>a.name.localeCompare(b.name))){
      if(entry.name.startsWith('.'))continue;
      const path=resolve(base,entry.name), name=relative(root,path);
      if(entry.isDirectory())await visit(path);
      else if(entry.isFile()&&!entry.isSymbolicLink())files[name]=hash(await readFile(path));
      else fail('FOLDER_CONTENT_INVALID');
    }
  }
  await visit(root);
  return digest(files);
}

export async function scopedSourceManifest(root){
 const files=[];
 async function visit(path){const stat=await lstat(resolve(root,path));if(stat.isDirectory()){for(const name of (await readdir(resolve(root,path))).sort())if(!name.startsWith('.'))await visit(join(path,name));}else if(stat.isFile())files.push({path,sha256:hash(await readFile(resolve(root,path)))});else fail('SOURCE_PATH_INVALID');}
 for(const path of ['AGENTS.md','package.json','skills/delegate','scripts/verify','test/routing'])await visit(path);
 return files.sort((a,b)=>a.path.localeCompare(b.path));
}
export async function sourceDigest(root){return digest(await scopedSourceManifest(root));}
async function verifySource(root,report,currentRevision){
  if(!REVISION.test(report.source_revision)||report.source_revision!==currentRevision)fail('SOURCE_REVISION_MISMATCH');
  if(!Array.isArray(report.source_manifest)||!report.source_manifest.length)fail('SOURCE_MANIFEST_REQUIRED');
  const expected=await scopedSourceManifest(root);
  if(canonical(expected)!==canonical([...report.source_manifest].sort((a,b)=>a.path.localeCompare(b.path))))fail('SOURCE_MANIFEST_INCOMPLETE_OR_CHANGED');
  if(report.source_digest!==digest(expected))fail('SOURCE_DIGEST_MISMATCH');
  const seen=new Set();
  for(const entry of report.source_manifest){
    if(!plain(entry)||typeof entry.path!=='string'||!SHA.test(entry.sha256))fail('SOURCE_MANIFEST_MALFORMED');
    if(entry.path.startsWith('docs/')||entry.path.startsWith('artifacts/')||entry.path.startsWith('.git/'))fail('SOURCE_MANIFEST_DYNAMIC_PATH');
    if(seen.has(entry.path))fail('SOURCE_MANIFEST_DUPLICATE');
    seen.add(entry.path);
    const path=safePath(root,entry.path,'SOURCE_PATH_INVALID');
    let stat;try{stat=await lstat(path);}catch{fail('SOURCE_FILE_MISSING');}
    if(!stat.isFile()||stat.isSymbolicLink())fail('SOURCE_PATH_INVALID');
    if(hash(await readFile(path))!==entry.sha256)fail('SOURCE_FILE_CHANGED');
  }
}

function checkShape(check){
  if(!plain(check)||typeof check.id!=='string'||!STATUSES.includes(check.status)||!Array.isArray(check.evidence))fail('CHECK_MALFORMED');
  if(Object.hasOwn(check,'objective')&&!plain(check.objective))fail('CHECK_OBJECTIVE_MALFORMED');
}
function objectiveOf(check){return check.objective??{};}
function requireKind(check,kind,code){if(!check.evidence.some(ref=>ref.kind===kind))fail(code);}

async function jsonEvidence(root,ref,code){
  try{return JSON.parse(await readFile(safePath(root,ref.path,'EVIDENCE_PATH_INVALID'),'utf8'));}catch{fail(code);}
}
async function checkOffline(root,check,source){
  const objective=objectiveOf(check);
  if(!Array.isArray(objective.commands)||objective.commands.length!==4||!Number.isInteger(objective.test_count)||objective.test_count<1)fail('OFFLINE_CHECK_UNVERIFIED');
  const names=new Set();
  for(const command of objective.commands){
    if(!plain(command)||typeof command.name!=='string'||!command.name||command.exit_code!==0)fail('OFFLINE_CHECK_UNVERIFIED');
    refShape(command.evidence,'OFFLINE_CHECK_UNVERIFIED');
    if(command.evidence.kind!=='command_output'||!check.evidence.some(ref=>ref.path===command.evidence.path&&ref.sha256===command.evidence.sha256&&ref.kind==='command_output'))fail('OFFLINE_COMMAND_EVIDENCE_REQUIRED');
    const result=await jsonEvidence(root,command.evidence,'OFFLINE_COMMAND_JSON_INVALID');
    if(!plain(result)||result.exit_code!==0||result.source_digest!==source)fail('OFFLINE_COMMAND_EXIT_MISMATCH');
    names.add(command.name);
  }
  if(!names.has('test')||!names.has('typecheck')||!names.has('build')||!names.has('skills'))fail('OFFLINE_COMMANDS_REQUIRED');
  refShape(objective.test_evidence,'OFFLINE_CHECK_UNVERIFIED');
  if(objective.test_evidence.kind!=='test_output'||!check.evidence.some(ref=>ref.path===objective.test_evidence.path&&ref.sha256===objective.test_evidence.sha256&&ref.kind==='test_output'))fail('OFFLINE_TEST_EVIDENCE_REQUIRED');
  const tests=await jsonEvidence(root,objective.test_evidence,'OFFLINE_TEST_JSON_INVALID');
  if(!plain(tests)||!Number.isInteger(tests.numPassedTests)||!Number.isInteger(tests.numFailedTests)||!Number.isInteger(tests.numTotalTests)||tests.numFailedTests!==0||tests.numPassedTests<1||tests.numPassedTests!==tests.numTotalTests||tests.numPassedTests!==objective.test_count)fail('OFFLINE_TEST_COUNT_INVALID');
}
function terminalReview(text,artifact,role='reviewer',verdict='PASS'){
 const objects=String(text).match(/\{[^{}]+\}/g)??[];
 return objects.some(s=>{try{const r=JSON.parse(s);return r.role===role&&r.verdict===verdict&&r.artifact_digest===artifact;}catch{return false;}});
}
const nativeFinal=ev=>ev.filter(e=>e.type==='response_item'&&e.payload?.role==='assistant').at(-1)?.payload?.content?.map(c=>c.text??'').join('\n')??'';
export function increasedComparableCost(runs){
 const matched=runs.filter(r=>['mechanical','bug','multicomponent','planning'].includes(r.name));
 const c=matched.filter(r=>r.arm==='candidate'),b=matched.filter(r=>r.arm==='baseline');
 const comparable=r=>r.cost?.kind==='native_api_equivalent_estimate'&&Number.isFinite(r.cost.value)&&r.cost.value>=0;
 return c.length===4&&b.length===4&&matched.every(comparable)&&c.reduce((n,r)=>n+r.cost.value,0)>b.reduce((n,r)=>n+r.cost.value,0);
}
function eventsOf(bytes){try{return bytes.split('\n').filter(Boolean).map(l=>JSON.parse(l));}catch{fail('NATIVE_TRACE_INVALID');}}
async function verifyObservationEvidence(root,base,run,observation){
 if(!Array.isArray(observation.check_evidence)||!observation.check_evidence.length)fail('CHECK_EVIDENCE_REQUIRED');
 if(run.name==='planning'&&(!Array.isArray(observation.execution_evidence)||!observation.execution_evidence.length))fail('EXECUTION_EVIDENCE_REQUIRED');
 const references=[...observation.check_evidence,...(observation.execution_evidence??[]),...(observation.policy_input?.decision_evidence?[observation.policy_input.decision_evidence]:[]),...Object.values(observation.policy_input?.hard_bug_handoff??{})];
 if(!plain(run.evidence_files))fail('OBSERVATION_EVIDENCE_REQUIRED');
 for(const ref of references){
  if(!plain(ref)||typeof ref.path!=='string'||!SHA.test(ref.digest)||run.evidence_files[ref.path]!==ref.digest)fail('OBSERVATION_EVIDENCE_MISMATCH');
  const path=safePath(join(base,'evidence'),ref.path,'OBSERVATION_EVIDENCE_PATH_INVALID');
  await verifyRef(root,{path:relative(root,path),sha256:ref.digest,kind:'command_output'},'OBSERVATION_EVIDENCE_HASH_MISMATCH');
 }
}
async function nativeEvents(root,entry){
 const bytes=await readFile(safePath(root,entry.path,'EVIDENCE_PATH_INVALID'),'utf8');
 if(hash(bytes)!==entry.sha256)fail('FRONTIER_TRACE_HASH_MISMATCH');
 return eventsOf(bytes);
}
async function requireNativeRole(root,run,ev,{model,effort,role,fresh}){
 let verified=false;
 if(run.host==='codex'){
  const parent=run.native_evidence?.find(n=>n.thread_id===run.thread_id);
  if(!parent)fail('NATIVE_IDENTITY_REQUIRED');
  const parentEvents=await nativeEvents(root,parent);
  for(const child of run.native_evidence.filter(n=>n.thread_id!==run.thread_id)){
   const events=await nativeEvents(root,child),meta=events.find(e=>e.type==='session_meta')?.payload?.source?.subagent?.thread_spawn;
   const name=meta?.agent_path?.split('/').at(-1);
   const launch=parentEvents.some(e=>{const p=e.payload;if(p?.type!=='function_call'||!p.name?.endsWith('spawn_agent'))return false;try{const a=JSON.parse(p.arguments);return a.task_name===name&&(!fresh||a.fork_turns==='none')&&a.model===model&&a.reasoning_effort===effort;}catch{return false;}});
   const contexts=events.filter(e=>e.type==='turn_context');
   if(meta?.parent_thread_id===run.thread_id&&(!fresh||/^review/.test(name??''))&&launch&&contexts.length&&contexts.every(e=>e.payload?.model===model&&e.payload?.effort===effort)&&events.some(e=>e.type==='event_msg'&&e.payload?.type==='task_complete')&&terminalReview(nativeFinal(events),run.artifact.artifact_digest,role))verified=true;
  }
 }else{
  const alias=model==='claude-fable-5-1'?'fable':model==='claude-sonnet-5'?'sonnet':model;
  const launches=ev.filter(e=>e.type==='assistant'&&!e.parent_tool_use_id).flatMap(e=>e.message?.content??[]).filter(c=>c.type==='tool_use'&&['Agent','Task'].includes(c.name)&&[alias,model].includes(c.input?.model)&&(!fresh||!c.input?.resume));
  for(const l of launches){const child=ev.filter(e=>e.type==='assistant'&&e.parent_tool_use_id===l.id);const last=child.at(-1);const final=last?.message?.content?.map(c=>c.text??'').join('\n');const ended=ev.some(e=>(e.message?.content??[]).some(c=>c.type==='tool_result'&&c.tool_use_id===l.id&&!c.is_error));const effortVerified=effort===null?l.input?.effort==null:l.input?.effort===effort;if(effortVerified&&child.length&&child.every(e=>e.message?.model===model&&(e.message?.effort==null||e.message.effort===effort))&&ended&&terminalReview(final,run.artifact.artifact_digest,role))verified=true;}
 }
 if(!verified)fail(role==='decision'?'NATIVE_FRONTIER_DECISION_REQUIRED':'FRESH_NATIVE_REVIEW_REQUIRED');
}
async function rejectFrontierActivity(root,run,ev,frontier){
 const all=[...ev];for(const entry of run.native_evidence??[])all.push(...await nativeEvents(root,entry));
 for(const e of all){
  if(e.payload?.model===frontier||e.message?.model===frontier)fail('RESEARCH_PDF_FRONTIER_FORBIDDEN');
  if(e.payload?.type==='function_call'&&e.payload?.name?.endsWith('spawn_agent')){let args;try{args=JSON.parse(e.payload.arguments);}catch{fail('NATIVE_TRACE_INVALID');}if(args.model===frontier)fail('RESEARCH_PDF_FRONTIER_FORBIDDEN');}
  for(const c of e.message?.content??[])if(c.type==='tool_use'&&['Agent','Task'].includes(c.name)&&[frontier,'fable'].includes(c.input?.model))fail('RESEARCH_PDF_FRONTIER_FORBIDDEN');
 }
}

async function checkHostProof(root,check,source){
 requireKind(check,'native_trace','NATIVE_TRACE_REQUIRED');requireKind(check,'external_grade','EXTERNAL_GRADE_REQUIRED');
 const host=check.id.startsWith('CODEX')?'codex':'claude',live=check.id.endsWith('LIVE');
 const refs=objectiveOf(check).runs;
 if(!Array.isArray(refs)||refs.length!==(live?1:10))fail('HOST_RUNS_INCOMPLETE');
 const seen=new Set(),runs=[];
 for(const ref of refs){
  await verifyRef(root,ref);if(ref.kind!=='external_grade'||!check.evidence.some(r=>r.path===ref.path&&r.sha256===ref.sha256))fail('HOST_RUN_EVIDENCE_REQUIRED');
  const run=await jsonEvidence(root,ref,'HOST_RESULT_INVALID');runs.push(run);
  if(run.schema_version!=='cheaper_pilot.v1'||run.host!==host||run.source_digest!==source||run.execution?.code!==0||run.execution?.timed_out||run.provider_limit||run.accounting_uncertain||!run.instructions_unchanged||!run.skill_unchanged||!(run.after?.passed===true||run.after?.result?.passed===true))fail('HOST_RUN_FAILED');
  const key=run.name+':'+run.arm;if(seen.has(key))fail('HOST_RUN_REUSED');seen.add(key);
  const base=dirname(safePath(root,ref.path,'EVIDENCE_PATH_INVALID'));
  const raw=await readFile(join(base,'coordinator/stdout.jsonl'),'utf8');
  if(hash(raw)!=='sha256:'+run.execution.stdout_sha256)fail('NATIVE_TRACE_HASH_MISMATCH');
  const ev=eventsOf(raw);
  if(ev.some(e=>['error','turn.failed'].includes(e.type)||(e.type==='rate_limit_event'&&e.rate_limit_info?.status==='rejected')))fail('NATIVE_EXECUTION_FAILED');
  if(!ev.some(e=>host==='codex'?e.type==='turn.completed':e.type==='result'&&!e.is_error&&e.subtype==='success'))fail('NATIVE_COMPLETION_REQUIRED');
  const expected=host==='codex'?(run.arm==='candidate'?'gpt-5.6-terra':'gpt-6-astra'):(run.arm==='candidate'?'claude-sonnet-5':'claude-fable-5-1');
  if(host==='codex'){
   const native=run.native_evidence?.find(n=>n.thread_id===run.thread_id);if(!native)fail('NATIVE_IDENTITY_REQUIRED');
   const bytes=await readFile(safePath(root,native.path,'EVIDENCE_PATH_INVALID'),'utf8');if(hash(bytes)!==native.sha256)fail('NATIVE_IDENTITY_HASH_MISMATCH');
   const contexts=eventsOf(bytes).filter(e=>e.type==='turn_context');
   if(!contexts.length||contexts.some(e=>e.payload?.model!==expected))fail('NATIVE_MODEL_MISMATCH');
   if(contexts.some(e=>e.payload?.effort!==(run.arm==='candidate'?'medium':'high')))fail('NATIVE_EFFORT_MISMATCH');
  }else if(!ev.some(e=>e.type==='assistant'&&!e.is_error&&!e.is_api_error_message&&!e.parent_tool_use_id&&e.message?.model===expected))fail('NATIVE_MODEL_MISMATCH');
  if(!run.artifact||!plain(run.artifact.files))fail('ARTIFACT_BINDING_REQUIRED');
  for(const [file,value]of Object.entries(run.artifact.files))if(hash(await readFile(safePath(root,relative(root,join(base,'artifacts',file)),'ARTIFACT_PATH_INVALID')))!==value)fail('ARTIFACT_HASH_MISMATCH');
  if(digest(run.artifact.files)!==run.artifact.artifact_digest)fail('ARTIFACT_DIGEST_MISMATCH');
  if(run.arm==='candidate'){
   const observation=run.observations?.map(o=>o.data).find(o=>o.task_id===(run.task_id??run.id)&&o.schema_version==='delegate_observation.v3'&&o.acceptance==='accepted');
   if(!observation||observation.coordinator?.model!==expected||observation.artifact_digest!==run.artifact.artifact_digest||observation.checks!=='passed')fail('OBSERVATION_BINDING_REQUIRED');
   if(observation.standard_policy_acceptance===false)fail('STANDARD_POLICY_ACCEPTANCE_REQUIRED');
   if(!Array.isArray(observation.artifact_files)||canonical([...observation.artifact_files].sort())!==canonical(Object.keys(run.artifact.files).sort()))fail('OBSERVATION_ARTIFACT_FILES_MISMATCH');
   await verifyObservationEvidence(root,base,run,observation);
   const types={mechanical:['mechanical_edit'],bug:['routine_fix','hard_bug'],multicomponent:['routine_implementation','approved_execution'],planning:['planning'],research:['research','source_synthesis'],pdf:['pdf_analysis']};
   if(!types[run.name]?.includes(observation.policy_input?.work_type))fail('OBSERVATION_CLASSIFICATION_MISMATCH');
   // Binding to the protected case prevents a self-authored observation from relabelling a feature as a document.
   const work_type={mechanical:'mechanical_edit',bug:'routine_fix',multicomponent:'routine_implementation',planning:'planning',research:'research',pdf:'pdf_analysis'}[run.name];
   const assignment={mechanical:'specified_edit',bug:'implement_fix',multicomponent:'implement_feature',planning:'frontier_decision',research:'summarize_sources',pdf:'summarize_sources'}[run.name];
   const requirement=reviewRequirement({...observation.policy_input,work_type,assignment,task_id:run.task_id??run.id,user_model_override:null,...(['bug','multicomponent'].includes(run.name)?{implemented_behavior:true}:{})});
   if(!requirement||canonical(requirement)!==canonical(observation.review_requirement))fail('REVIEW_REQUIREMENT_MISMATCH');
   const frontier=host==='codex'?'gpt-6-astra':'claude-fable-5-1';
   if(['research','pdf'].includes(run.name))await rejectFrontierActivity(root,run,ev,frontier);
   if(run.name==='planning')await requireNativeRole(root,run,ev,{model:frontier,effort:host==='codex'?'high':observation.frontier?.effort,role:'decision',fresh:false});
   if(requirement.required){
    const selected=requirement.role==='frontier'?{model:frontier,effort:host==='codex'?'high':observation.frontier?.effort}:observation.cheap_reviewer;
    if(!selected?.model||selected.model===frontier&&requirement.role==='economy')fail('REVIEWER_IDENTITY_REQUIRED');
    if(observation.review?.verdict!=='PASS'||observation.review?.fresh_context!==true||observation.review?.artifact_digest!==run.artifact.artifact_digest)fail(requirement.role==='frontier'?'FRONTIER_REVIEW_REQUIRED':'ECONOMY_REVIEW_REQUIRED');
    if(observation.review.model!==selected.model||observation.review.effort!==selected.effort)fail('FRONTIER_REVIEW_IDENTITY_MISMATCH');
    await requireNativeRole(root,run,ev,{...selected,role:'reviewer',fresh:true});
   }
  }
  if(live&&(!run.prepared?.installed||run.arm!=='candidate'||run.args.includes('-m')||run.args.includes('--model')))fail('INSTALLED_SESSION_REQUIRED');
 }
 if(!live&&increasedComparableCost(runs))fail('COMPARABLE_COST_INCREASE_HOLD');
 if(!live)for(const name of ['mechanical','bug','multicomponent','planning'])for(const arm of ['candidate','baseline'])if(!seen.has(name+':'+arm))fail('HOST_RUNS_INCOMPLETE');
 if(!live)for(const name of ['research','pdf'])if(!seen.has(name+':candidate'))fail('HOST_RESEARCH_PDF_REQUIRED');
 if(!live){
  const exercises=objectiveOf(check).exercises;if(!Array.isArray(exercises)||exercises.length!==2||new Set(exercises.map(r=>r.path)).size!==2)fail('HOST_EXERCISES_REQUIRED');const kinds=new Set();
  for(const ref of exercises){
   await verifyRef(root,ref);const r=await jsonEvidence(root,ref,'HOST_EXERCISE_INVALID');if(kinds.has(r.exercise))fail('HOST_EXERCISES_REQUIRED');kinds.add(r.exercise);
   if(r.host!==host||!['simple_audit','seeded_defect'].includes(r.exercise)||r.execution?.code!==0||r.passed!==true||r.source_digest!==source)fail('HOST_EXERCISE_FAILED');
   if(!r.trace)fail('EXERCISE_TRACE_REQUIRED');const bytes=await readFile(safePath(root,r.trace.path,'EVIDENCE_PATH_INVALID'),'utf8');if(hash(bytes)!==r.trace.sha256||hash(bytes)!=='sha256:'+r.execution.stdout_sha256)fail('EXERCISE_TRACE_MISMATCH');
   const events=eventsOf(bytes);if(!events.some(e=>host==='codex'?e.type==='turn.completed':e.type==='result'&&!e.is_error&&e.subtype==='success'))fail('EXERCISE_COMPLETION_REQUIRED');
   if(!plain(r.artifact?.files)||digest(r.artifact.files)!==r.artifact.artifact_digest)fail('EXERCISE_ARTIFACT_REQUIRED');
   for(const [file,h]of Object.entries(r.artifact.files)){const path=safePath(join(dirname(resolve(root,ref.path)),'artifacts'),file,'ARTIFACT_PATH_INVALID');if(hash(await readFile(path))!==h)fail('EXERCISE_ARTIFACT_MISMATCH');}
   const model=host==='codex'?'gpt-6-astra':'claude-fable-5-1',verdict=r.exercise==='simple_audit'?'PASS':'REPAIR';let final;
   if(host==='codex'){
    const entry=r.native_evidence?.find(e=>e.thread_id===r.thread_id);if(!entry||r.native_evidence.length!==1)fail('EXERCISE_NATIVE_IDENTITY_REQUIRED');const native=await nativeEvents(root,entry),contexts=native.filter(e=>e.type==='turn_context');
    if(!contexts.length||contexts.some(e=>e.payload?.model!==model||e.payload?.effort!=='high')||!native.some(e=>e.type==='event_msg'&&e.payload?.type==='task_complete'))fail('EXERCISE_NATIVE_IDENTITY_MISMATCH');final=nativeFinal(native);
   }else{
    const assistant=events.filter(e=>e.type==='assistant'&&!e.parent_tool_use_id&&!e.is_api_error_message);if(!assistant.length||assistant.some(e=>e.message?.model!==model)||!r.args?.some((a,i)=>a==='--effort'&&r.args[i+1]==='high'))fail('EXERCISE_NATIVE_IDENTITY_MISMATCH');
    final=assistant.at(-1).message?.content?.map(c=>c.text??'').join('\n');
   }
   if(!terminalReview(final,r.artifact.artifact_digest,'reviewer',verdict)||(verdict==='REPAIR'&&!/zero/i.test(final)))fail('EXERCISE_VERDICT_REQUIRED');
  }
 }

}

async function checkAccounting(root,check){
 const ref=objectiveOf(check).budget;
 if(!ref||!check.evidence.some(r=>r.path===ref.path&&r.sha256===ref.sha256))fail('BUDGET_EVIDENCE_REQUIRED');
 await verifyRef(root,ref);const budget=await readBudget(safePath(root,ref.path,'EVIDENCE_PATH_INVALID'));
 if(budget.ceiling!==100||budget.executions<1||budget.executions>100||budget.reserved!==0||budget.halted||budget.entries.some(e=>e.status!=='completed'||e.uncertain||e.unbudgeted))fail('ACCOUNTING_INCOMPLETE');
 for(const entry of budget.entries){const evidence=check.evidence.find(r=>resolve(root,r.path)===resolve(root,entry.source));if(!evidence)fail('ACCOUNTING_SOURCE_REQUIRED');}
 return budget;
}
async function checkExecutionAccounting(root,budget,checks){
 const used=new Set();
 for(const check of checks)for(const ref of [...objectiveOf(check).runs,...(objectiveOf(check).exercises??[])]){
  const run=await jsonEvidence(root,ref,'HOST_RESULT_INVALID'),entry=budget.entries.find(e=>e.id===run.id);
  if(!entry||entry.host!==run.host||entry.status!=='completed'||used.has(entry.id))fail('HOST_EXECUTION_NOT_BUDGETED');
  used.add(entry.id);
  const directory=join(dirname(safePath(root,ref.path,'EVIDENCE_PATH_INVALID')),'coordinator');
  if(resolve(root,entry.source)!==join(directory,'summary.json'))fail('HOST_BUDGET_SOURCE_MISMATCH');
  const summary=JSON.parse(await readFile(join(directory,'summary.json'),'utf8'));
  if(canonical(summary)!==canonical(run.execution))fail('HOST_BUDGET_SUMMARY_MISMATCH');
  const raw=await readFile(join(directory,'stdout.jsonl'),'utf8');
  if(hash(raw)!=='sha256:'+summary.stdout_sha256)fail('NATIVE_TRACE_HASH_MISMATCH');
  const events=eventsOf(raw),at=summary.started_at;
  if(!Number.isFinite(Date.parse(at)))fail('ACCOUNTING_NATIVE_TIME_REQUIRED');
  // Reuse the trace counter, normalizing Claude's legacy Task tool exactly as the pilot does.
  const timed=events.map(e=>{if(run.host==='claude')for(const c of e.message?.content??[])if(c.type==='tool_use'&&c.name==='Task')c.name='Agent';return JSON.stringify({at,line:JSON.stringify(e)});}).join('\n');
  const ledger=executionLedger(run.host,timed,{});
  if(ledger.limitations.some(s=>/count may be incomplete/.test(s)))fail('HOST_EXECUTION_COUNT_UNCERTAIN');
  let nativeCount=0;
  if(run.host==='codex'){
   const count=await countNativeExecutions((run.native_evidence??[]).map(r=>({...r,path:safePath(root,r.path,'EVIDENCE_PATH_INVALID')})));
   if(count.uncertain||count.root_id!==run.thread_id||events.find(e=>e.type==='thread.started')?.thread_id!==run.thread_id)fail('HOST_EXECUTION_COUNT_UNCERTAIN');
   nativeCount=count.executions;
  }
  const expected=Math.max(nativeCount,ledger.executions,ledger.reported_execution_lower_bound??0);
  const charged=budget.execution_corrections?.find(c=>c.id===entry.id)?.executions??entry.executions;
  if(charged!==expected)fail('HOST_EXECUTION_COUNT_MISMATCH');
 }
}
async function checkRollback(root,check){
 const backups=objectiveOf(check).backups;
 if(!Array.isArray(backups)||backups.length!==2||new Set(backups.map(b=>b.host)).size!==2)fail('ROLLBACK_BACKUPS_REQUIRED');
 for(const b of backups){if(!['codex','claude'].includes(b.host)||!b.instructions||!b.skill||!b.configuration)fail('ROLLBACK_RECORD_INVALID');
  for(const ref of [b.instructions,b.skill,b.configuration]){await verifyRef(root,ref);if(!check.evidence.some(r=>r.path===ref.path&&r.sha256===ref.sha256))fail('ROLLBACK_EVIDENCE_REQUIRED');}
 }
}

function installationShape(row){
  if(!plain(row)||!plain(row.source)||!plain(row.installed)||!plain(row.manifest))fail('INSTALLATION_MALFORMED');
  for(const value of [row.source,row.installed])if(typeof value.path!=='string'||!SHA.test(value.digest))fail('INSTALLATION_MALFORMED');
  refShape(row.manifest,'INSTALLATION_MALFORMED');
  if(row.manifest.kind!=='installation_manifest')fail('INSTALLATION_MANIFEST_REQUIRED');
}
async function verifyInstallations(root,report,installationCheck,userRoot){
  if(!Array.isArray(report.installations)||report.installations.length!==2)fail('INSTALLATION_REQUIRED');
  const seenHosts=new Set();
  for(const row of report.installations){
    installationShape(row);
    if(!['codex','claude'].includes(row.host)||seenHosts.has(row.host))fail('INSTALL_HOST_REQUIRED');seenHosts.add(row.host);
    const source=resolve(root,row.source.path),installed=resolve(row.installed.path);
    if(source!==resolve(root,'skills/delegate')||installed!==resolve(userRoot,row.host==='codex'?'.agents/skills/delegate':'.claude/skills/delegate')||source===installed)fail('INSTALLATION_PATH_INVALID');
    const sourceDigest=await folderDigest(source), installedDigest=await folderDigest(installed);
    if(sourceDigest!==row.source.digest||installedDigest!==row.installed.digest||sourceDigest!==installedDigest)fail('INSTALL_FOLDER_MISMATCH');
    await verifyRef(root,row.manifest,'INSTALLATION_MANIFEST_HASH_MISMATCH');
    let manifest;try{manifest=JSON.parse(await readFile(safePath(root,row.manifest.path,'INSTALLATION_PATH_INVALID'),'utf8'));}catch{fail('INSTALLATION_MANIFEST_MALFORMED');}
    if(!plain(manifest)||manifest.schema_version!=='cheaper_installation_manifest.v1'||!plain(manifest.source_folder)||!plain(manifest.installed_folder)||manifest.source_folder.path!==row.source.path||manifest.source_folder.digest!==row.source.digest||manifest.installed_folder.path!==row.installed.path||manifest.installed_folder.digest!==row.installed.digest)fail('INSTALLATION_MANIFEST_CONTENT_MISMATCH');
    if(!installationCheck.evidence.some(ref=>ref.path===row.manifest.path&&ref.sha256===row.manifest.sha256&&ref.kind==='installation_manifest'))fail('INSTALLATION_GATE_EVIDENCE_REQUIRED');
  }

}
async function verifyDefaults(root,report,defaultsCheck,userRoot){
 if(!Array.isArray(report.defaults)||report.defaults.length!==2)fail('DEFAULT_CONFIG_REQUIRED');
 const seen=new Set();
 for(const c of report.defaults){
  if(!['codex','claude'].includes(c.host)||seen.has(c.host))fail('DEFAULT_CONFIG_DUPLICATE');seen.add(c.host);
  const path=resolve(userRoot,c.host==='codex'?'.codex/config.toml':'.claude/settings.json');
  if(c.path!==path)fail('DEFAULT_CONFIG_PATH_INVALID');
  const bytes=await readFile(path,'utf8');if(hash(bytes)!==c.sha256)fail('DEFAULT_CONFIG_HASH_MISMATCH');
  const model=c.host==='claude'?JSON.parse(bytes).model:/^model\s*=\s*["']([^"']+)["']/m.exec(bytes.split(/^\s*\[/m)[0])?.[1];
  if(model!==(c.host==='codex'?'gpt-5.6-terra':'sonnet'))fail('DEFAULT_MODEL_MISMATCH');
  const effort=c.host==='codex'?/^model_reasoning_effort\s*=\s*["']([^"']+)["']/m.exec(bytes.split(/^\s*\[/m)[0])?.[1]:null;
  if(c.host==='codex'&&effort!=='medium')fail('DEFAULT_EFFORT_MISMATCH');
  const snap=defaultsCheck.evidence.find(r=>r.kind==='default_config'&&r.host===c.host);if(!snap)fail('DEFAULT_GATE_EVIDENCE_REQUIRED');
  const saved=await jsonEvidence(root,snap,'DEFAULT_CONFIG_SNAPSHOT_INVALID');if(saved.path!==c.path||saved.sha256!==c.sha256||saved.model!==model||(c.host==='codex'&&saved.effort!==effort))fail('DEFAULT_CONFIG_SNAPSHOT_MISMATCH');
 }
}

function revisionAt(root){
  try{return execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();}catch{fail('CURRENT_REVISION_UNAVAILABLE');}
}

/** Throws a stable failure code when a report is incomplete, stale, or tampered. */
export async function validateCompletionReport(report,{root=process.cwd(),currentRevision,userRoot=homedir()}={}){
  const projectRoot=resolve(root), revision=currentRevision??revisionAt(projectRoot);
  if(!plain(report)||report.schema_version!==REPORT_SCHEMA||typeof report.generated_at!=='string'||!Number.isFinite(Date.parse(report.generated_at))||!Array.isArray(report.limitations)||!report.limitations.every(value=>typeof value==='string'))fail('REPORT_MALFORMED');
  await verifySource(projectRoot,report,revision);
  if(!Array.isArray(report.checks)||report.checks.length!==CHECKLIST_IDS.length)fail('CHECKLIST_COUNT_INVALID');
  const byId=new Map();
  for(const check of report.checks){
    checkShape(check);
    if(!CHECKLIST_IDS.includes(check.id)||byId.has(check.id))fail('CHECKLIST_IDS_INVALID');
    await verifyRefs(projectRoot,check.evidence);
    if(check.status!=='passed')fail('CHECK_NOT_PASSED');
    byId.set(check.id,check);
  }
  if(CHECKLIST_IDS.some(id=>!byId.has(id)))fail('CHECKLIST_IDS_INVALID');
  await checkOffline(projectRoot,byId.get('OFFLINE'),report.source_digest);
  const budget=await checkAccounting(projectRoot,byId.get('ACCOUNTING'));
  await checkRollback(projectRoot,byId.get('ROLLBACK'));
  for(const id of ['CODEX-PILOT','CLAUDE-PILOT','CODEX-LIVE','CLAUDE-LIVE'])await checkHostProof(projectRoot,byId.get(id),report.source_digest);
  await checkExecutionAccounting(projectRoot,budget,['CODEX-PILOT','CLAUDE-PILOT','CODEX-LIVE','CLAUDE-LIVE'].map(id=>byId.get(id)));
  await verifyInstallations(projectRoot,report,byId.get('INSTALLATION'),userRoot);
  await verifyDefaults(projectRoot,report,byId.get('DEFAULTS'),userRoot);
  return {valid:true,checks:CHECKLIST_IDS.length,source_revision:report.source_revision};
}

/** Independently validate one host's rollout gates against the current frozen source. */
export async function validateHostProof(report,{host,root=process.cwd(),currentRevision,includeLive=false}={}){
 if(!['codex','claude'].includes(host))fail('HOST_INVALID');
 root=resolve(root);await verifySource(root,report,currentRevision??revisionAt(root));
 const ids=['OFFLINE','ACCOUNTING',host.toUpperCase()+'-PILOT',...(includeLive?[host.toUpperCase()+'-LIVE']:[])];
 let budget;
 for(const id of ids){const check=report.checks?.find(c=>c.id===id);if(!check)fail('HOST_GATE_REQUIRED');checkShape(check);await verifyRefs(root,check.evidence);if(check.status!=='passed')fail('CHECK_NOT_PASSED');if(id==='OFFLINE')await checkOffline(root,check,report.source_digest);else if(id==='ACCOUNTING')budget=await checkAccounting(root,check);else await checkHostProof(root,check,report.source_digest);}
 await checkExecutionAccounting(root,budget,ids.slice(2).map(id=>report.checks.find(c=>c.id===id)));
 return {valid:true,host,source_digest:report.source_digest,live:includeLive};
}

export async function validateCompletionReportFile(reportFile,options={}){
  const absolute=resolve(reportFile);
  let report;try{report=JSON.parse(await readFile(absolute,'utf8'));}catch{fail('REPORT_JSON_INVALID');}
  return validateCompletionReport(report,{root:options.root??process.cwd(),currentRevision:options.currentRevision,userRoot:options.userRoot});
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  const reportFile=process.argv[2];
  if(!reportFile){console.error('usage: node scripts/verify/cheaper-completion.mjs <report.json>');process.exitCode=2;}
  else try{console.log(JSON.stringify(await validateCompletionReportFile(reportFile)));}catch(error){console.error(error.message);process.exitCode=1;}
}
