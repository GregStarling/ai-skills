import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync, unlinkSync, realpathSync, openSync, fsyncSync, closeSync } from 'node:fs';
import { dirname, join, resolve, relative } from 'node:path';
import { homedir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { canonicalJson,contentDigest,digest } from '../core/canonical.js';
import { parseSelectionInput,select,createBinding,validateBinding,loadPolicy,type SelectionInput } from '../governance/index.js';
import { renderClaude,renderCodex,writeRendered,verifyRendered,runtimeVersions,type RenderedAdapter } from '../adapters/index.js';
import { discover,discoveryRequestSchema } from '../discovery/index.js';
import {workerResultSchema,reviewResultSchema} from '../delegation/contracts.js';
import { Ledger } from '../ledger/index.js';
import {executeEvaluation,prepareFixture,type EvaluationResult} from '../evaluation/index.js';
import {candidateIdentity,parseRuntimeReport} from '../schema/index.js';
import {validateObservation} from '../evidence/index.js';
import {bindCandidate} from '../registry/index.js';
import {sourcesSchema,encodeSources,decodeSources} from '../evidence/sources.js';
import {validateReceiptEvidence} from '../ledger/receipts.js';

const sha=z.string().regex(/^sha256:[a-f0-9]{64}$/);
const evaluationRequestSchema=z.object({evaluationId:z.string().regex(/^[a-zA-Z0-9_-]{1,96}$/),candidateId:z.string().min(1),fixtureId:z.string().regex(/^[a-z0-9-]+$/),sourceRepository:z.string().min(1),workspaceRoot:z.string().min(1),timeoutMs:z.number().int().positive().max(3600000),dependencyDirectory:z.string().optional(),bundleRoot:z.string().optional()}).strict();
export const refreshRequestSchema=z.object({selection:z.unknown(),mode:z.enum(['production','adapter-test']),directory:z.string().min(1),policyFile:z.string().optional(),incumbent:z.object({binding:z.unknown(),selection:z.unknown()}).strict().optional(),discovery:discoveryRequestSchema.optional(),evaluationLedgers:z.array(z.object({directory:z.string().min(1),recordIds:z.array(z.string().min(1)).nonempty()}).strict()).optional(),evaluations:z.array(evaluationRequestSchema).optional(),trigger:z.string().min(1)}).strict().superRefine((request,ctx)=>{if(new Set(request.evaluations?.map(item=>item.evaluationId)).size!==(request.evaluations?.length??0))ctx.addIssue({code:'custom',path:['evaluations'],message:'Duplicate explicit evaluation ID'});});
const evaluationEnvelopeSchema=z.object({schema_version:z.literal('evaluation_ledger_entry.v1'),purpose:z.enum(['qualification_evaluation','production_usage']),observation:z.unknown(),sources:sourcesSchema,runtimeReports:z.record(sha,z.unknown()),operationalLimits:z.array(z.string()),request_digest:sha.optional()}).strict();
/** Lossless raw envelope for the append-only Ledger; it grants no qualification. */
export function evaluationLedgerEnvelope(result:EvaluationResult){return evaluationEnvelopeSchema.parse({schema_version:'evaluation_ledger_entry.v1',purpose:result.purpose,observation:result.observation,sources:encodeSources(result.sourceMap),runtimeReports:Object.fromEntries(result.runtimeReports),operationalLimits:result.operationalLimits});}
function selectionJson(input:SelectionInput){return {...input,sources:encodeSources(input.sources??new Map()),runtimeReports:Object.fromEntries(input.runtimeReports??new Map())};}
function parseRefreshSelection(value:unknown,overrides:Parameters<typeof parseSelectionInput>[1]={}):SelectionInput{
 const raw=z.object({sources:sourcesSchema.optional()}).passthrough().parse(value);const sources=decodeSources(raw.sources??{});
 const parsed=parseSelectionInput({...raw,sources:Object.fromEntries([...sources].filter((entry):entry is [string,string]=>typeof entry[1]==='string'))},overrides);return {...parsed,sources};
}
function ingestEnvelope(raw:unknown,selection:SelectionInput){
 const isReceipt=z.object({schema_version:z.literal('delegate_receipt_evidence.v1')}).passthrough().safeParse(raw).success;
 const envelope=evaluationEnvelopeSchema.parse(isReceipt?validateReceiptEvidence(raw,selection.policy).envelope:raw),sources=decodeSources(envelope.sources),runtimeReports=new Map(Object.entries(envelope.runtimeReports));
 if(envelope.purpose==='production_usage'&&!isReceipt)throw Error('PRODUCTION_USAGE_REQUIRES_VALIDATED_RECEIPT');
 for(const [key,value]of runtimeReports){parseRuntimeReport(value);if(digest(value)!==key)throw new Error('EVALUATION_RECEIPT_DIGEST_MISMATCH');}
 const observation=validateObservation(envelope.observation,{sources,runtimeReports});
 const candidate=selection.candidates.find(item=>item.candidate_id===observation.candidate.candidate_id);
 if(!candidate||candidateIdentity(candidate)!==observation.candidate.candidate_identity)throw new Error('EVALUATION_CANDIDATE_MISMATCH');
 if(selection.mode==='production'&&(observation.lane!=='production'||candidate.provider==='synthetic'))throw new Error('SYNTHETIC_EVALUATION_IN_PRODUCTION');
 for(const reference of [observation.fixture_digest,observation.provenance.artifact_digest,observation.provenance.source_digest])if(!sources.has(reference))throw new Error('EVALUATION_SOURCE_UNRESOLVED');
 if(observation.lane==='production'){
  const receipt=parseRuntimeReport(runtimeReports.get(observation.provenance.runtime_receipt_digest!));
  for(const reference of [receipt.stdout_digest,receipt.stderr_digest])if(reference===undefined||!sources.has(reference))throw new Error('EVALUATION_STREAM_UNRESOLVED');
 }
 const existing=selection.observations.find(item=>item.observation_id===observation.observation_id);
 if(existing&&canonicalJson(existing)!==canonicalJson(observation))throw new Error('EVALUATION_OBSERVATION_CONFLICT');
 const mergedSources=new Map(selection.sources),mergedReports=new Map(selection.runtimeReports);
 for(const [key,value]of sources)mergedSources.set(key,value);for(const [key,value]of runtimeReports)mergedReports.set(key,value);
 return {selection:{...selection,observations:existing?selection.observations:[...selection.observations,observation],sources:mergedSources,runtimeReports:mergedReports},observation_id:observation.observation_id,operationalLimits:envelope.operationalLimits};
}
async function collectEvaluations(request:z.infer<typeof refreshRequestSchema>,initial:SelectionInput,root:string){
 let selection=initial;const records: {directory:string;record_id:string;content_digest:string;status:string;operationalLimits:string[]}[]=[];
 for(const source of request.evaluationLedgers??[])for(const id of [...new Set(source.recordIds)]){
  const record=await new Ledger(source.directory).get(id);if(!record)throw new Error(`EVALUATION_LEDGER_RECORD_MISSING: ${id}`);
  const ingested=ingestEnvelope(record.payload,selection);selection=ingested.selection;records.push({directory:source.directory,record_id:id,content_digest:record.content_digest,status:'ingested',operationalLimits:ingested.operationalLimits});
 }
 if(request.evaluations?.length&&request.mode!=='production')throw new Error('LIVE_EVALUATION_REQUIRES_EXPLICIT_PRODUCTION_REQUEST');
 // Validate the complete explicit request set before any native invocation.
 for(const item of request.evaluations??[]){const candidate=selection.candidates.find(value=>value.candidate_id===item.candidateId);if(!candidate)throw new Error('EVALUATION_CANDIDATE_MISSING');bindCandidate(candidate,selection.registry,{allowConfigurationPinning:selection.policy.policy_version>=5&&['low','medium'].includes(selection.request.risk)&&['claude_code','codex'].includes(selection.request.execution_environment??'')});if(candidate.provider==='synthetic')throw new Error('REAL_EVALUATION_REQUIRES_NATIVE_PROVIDER');}
 for(const item of request.evaluations??[]){
  const candidate=selection.candidates.find(value=>value.candidate_id===item.candidateId)!;
  const directory=join(root,'evaluations'),ledger=new Ledger(directory),id=`evaluation_${item.evaluationId}`;
  const requestDigest=digest({request:item,candidate,task_class_id:selection.request.task_class_id,cohort_id:selection.request.cohort_id,role_id:selection.request.role_id,risk:selection.request.risk,constraints_digest:selection.request.constraints_digest});
  const previous=await ledger.get(id);let record=previous;
  if(previous){if(z.object({request_digest:sha}).passthrough().parse(previous.payload).request_digest!==requestDigest)throw new Error('EVALUATION_ID_CONFLICT');}
  else{
   mkdirSync(directory,{recursive:true});const claim=join(directory,`.evaluation-${item.evaluationId}.lock`),claimFd=openSync(claim,'wx',0o600);
   try {
   let payload:unknown;
   try{
    const prepared=await prepareFixture({fixtureId:item.fixtureId,sourceRepository:item.sourceRepository,workspaceRoot:item.workspaceRoot,...(item.bundleRoot===undefined?{}:{bundleRoot:item.bundleRoot})});
    if(prepared.manifest.task_class_id!==selection.request.task_class_id)throw new Error('EVALUATION_TASK_CLASS_MISMATCH');
    const evaluation=await executeEvaluation({prepared,candidate,timeoutMs:item.timeoutMs,outputDirectory:join(directory,'runs',item.evaluationId),cohortId:selection.request.cohort_id,roleId:selection.request.role_id,risk:selection.request.risk,constraintsDigest:selection.request.constraints_digest,...(item.dependencyDirectory===undefined?{}:{dependencyDirectory:item.dependencyDirectory})});
    payload={...evaluationLedgerEnvelope(evaluation),request_digest:requestDigest};
   }catch(error){payload={schema_version:'evaluation_failure.v1',request_digest:requestDigest,candidate_id:candidate.candidate_id,cost_usd:null,error:error instanceof Error?error.message:String(error)};}
   record=(await ledger.append({id,provenance:{source:'explicit refresh evaluation request',observed_at:new Date().toISOString(),methodology:'bounded_native_evaluation.v1'},payload})).record;
   }finally{closeSync(claimFd);unlinkSync(claim);}
  }
  const failure=z.object({schema_version:z.literal('evaluation_failure.v1'),error:z.string()}).passthrough().safeParse(record!.payload);
  if(failure.success){records.push({directory,record_id:id,content_digest:record!.content_digest,status:'blocked',operationalLimits:[failure.data.error,'COST_UNKNOWN']});continue;}
  const ingested=ingestEnvelope(record!.payload,selection);selection=ingested.selection;records.push({directory,record_id:id,content_digest:record!.content_digest,status:previous?'reused':'executed',operationalLimits:ingested.operationalLimits});
 }
 return {selection,records};
}
function safeRoot(path:string):string{
 const absolute=resolve(path);let existing=absolute;while(!existsSync(existing)){const next=dirname(existing);if(next===existing)throw new Error('REFRESH_ROOT_INVALID');existing=next;}
 const target=resolve(realpathSync(existing),relative(existing,absolute));const home=homedir();
 if(target===home||['.codex','.claude','.agents'].some(p=>target===join(home,p)||target.startsWith(join(home,p)+'/')))throw new Error('REFRESH_GLOBAL_INSTALL_REFUSED');
 return target;
}
function readJson(path:string):unknown{return JSON.parse(readFileSync(path,'utf8'));}
function active(root:string):{generation:string;proposal_digest:string}|null{return existsSync(join(root,'active.json'))?z.object({generation:z.string().regex(/^generation_[a-f0-9]{32}$/),proposal_digest:z.string()}).strict().parse(readJson(join(root,'active.json'))):null;}
function atomicJson(path:string,value:unknown){const temporary=`${path}.${randomUUID()}.tmp`;const fd=openSync(temporary,'wx',0o600);try{writeFileSync(fd,canonicalJson(value)+'\n');fsyncSync(fd);}finally{closeSync(fd);}renameSync(temporary,path);const directory=openSync(dirname(path),'r');try{fsyncSync(directory);}finally{closeSync(directory);}}
function render(binding:unknown,selection:SelectionInput,mode:'production'|'adapter-test'):RenderedAdapter{
 const computed=createBinding(selection),candidate=computed.candidate;
 const structured=candidate.serving.json_schema?{outputSchema:z.toJSONSchema(computed.role_id==='reviewer'?reviewResultSchema:workerResultSchema)}:{};
 if(candidate.provider==='anthropic')return renderClaude({binding,selection,mode,runtimeVersion:runtimeVersions.anthropic,...structured});
 if(candidate.provider==='openai'||mode==='adapter-test'&&candidate.provider==='synthetic')return renderCodex({binding,selection,mode,runtimeVersion:runtimeVersions.openai,...structured});
 throw new Error('REFRESH_PROVIDER_UNSUPPORTED');
}
export async function proposeRefresh(value:unknown){
 const request=refreshRequestSchema.parse(value),root=safeRoot(request.directory);mkdirSync(root,{recursive:true});
 let selection=parseRefreshSelection(request.selection,{mode:request.mode==='production'?'production':'simulation',...(request.mode==='production'?{now:new Date().toISOString()}: {})});
 if(request.mode==='production')selection.policy=loadPolicy(request.policyFile??resolve('policy/constitution.json'));
 const discovered=request.discovery?await discover(request.discovery):null;
 const evaluations=await collectEvaluations(request,selection,root);selection=evaluations.selection;
 if(request.mode==='production'){selection.now=new Date().toISOString();selection.policy=loadPolicy(request.policyFile??resolve('policy/constitution.json'));}
 const current=active(root);let input=selection;let incumbentStatus:string|null=null;
 let incumbent=request.incumbent;
 if(current){
  const stored=z.object({content_digest:z.string(),binding:z.unknown(),selection:z.unknown()}).passthrough().parse(readJson(join(root,current.generation,'proposal.json')));
  if(contentDigest(stored)!==current.proposal_digest||stored.content_digest!==current.proposal_digest)throw new Error('REFRESH_ACTIVE_TAMPERED');
  if(incumbent&&digest(incumbent.binding)!==digest(stored.binding))throw new Error('REFRESH_INCUMBENT_MISMATCH');
  incumbent={binding:stored.binding,selection:stored.selection};
 }
 if(incumbent){
  const old=parseRefreshSelection(incumbent.selection,{mode:selection.mode,now:selection.now});old.policy=selection.policy;
  const validity=validateBinding(incumbent.binding,old);incumbentStatus=validity.status;
  if(validity.ok){const b=z.object({candidate:z.object({candidate_id:z.string()})}).parse(incumbent.binding);input={...selection,incumbentCandidateId:b.candidate.candidate_id};}
  else {const {incumbentCandidateId:_ignored,...repair}=selection;input=repair;}
 }
 let result=select(input);
 if(input.incumbentCandidateId!==undefined&&result.decision.rule_ids.some(rule=>['incumbent_not_qualified','incumbent_capability_not_qualified','incumbent_economically_ineligible'].includes(rule))){const {incumbentCandidateId:_invalid,...repair}=input;input=repair;result=select(input);incumbentStatus='INVALID';}
 const missing_evaluations=result.qualifications.filter(q=>q.status!=='QUALIFIED').map(q=>({candidate_id:q.candidate_id,status:q.status,diagnostics:q.diagnostics,observed_tasks:q.metrics.tasks,required_tasks:input.policy.qualification.minimum_tasks}));
 const incumbentIdentity=incumbent?z.object({candidate:z.object({candidate_id:z.string()})}).safeParse(incumbent.binding):null;
 const incumbentId=incumbentIdentity?.success?incumbentIdentity.data.candidate.candidate_id:null;
 const observedCosts=result.qualifications.map(q=>({candidate_id:q.candidate_id,status:q.status,accepted:q.metrics.accepted,tasks:q.metrics.tasks,cost_per_accepted_task_usd:q.metrics.cost_per_accepted_task_usd,total_cost_usd:q.metrics.total_cost_usd}));
 const economics=input.policy.policy_version>=4?result.economics:observedCosts;
 const diff={role_id:input.request.role_id,task_class_id:input.request.task_class_id,risk:input.request.risk,trigger:request.trigger,incumbent_candidate_id:incumbentId,proposed_candidate_id:result.selected?.candidate_id??null,decision_outcome:result.decision.outcome,rule_ids:result.decision.rule_ids,evidence_refs:result.decision.evidence_refs,economics};
 const economicSummary=input.policy.policy_version>=4?`API-equivalent proxy (not subscription billing): ${result.economics.map(e=>`${e.candidate_id}=${e.value_usd===null?'unknown task cost':e.value_usd.toFixed(6)+' USD/accepted task'} (${e.evidence_level})`).join('; ')}`:`Historical cost per accepted task: ${observedCosts.map(q=>`${q.candidate_id}=${q.cost_per_accepted_task_usd===null?'unknown':q.cost_per_accepted_task_usd.toFixed(6)} USD (${q.status})`).join('; ')}`;
 const summary=`${diff.role_id}/${diff.task_class_id}: ${incumbentId??'unassigned'} → ${diff.proposed_candidate_id??'none'}; decision ${diff.decision_outcome}. Trigger: ${request.trigger}. Rules: ${diff.rule_ids.join(', ')}. ${economicSummary}. Evidence: ${diff.evidence_refs.length} raw observations.`;
 const base={schema_version:'refresh_staging.v1',mode:request.mode,trigger:request.trigger,base_active_digest:current?.proposal_digest??null,diff,summary,incumbent_status:incumbentStatus,decision:result.decision,qualifications:result.qualifications.map(({observations:_rows,...q})=>q),missing_evaluations,discovery:discovered,evaluation_records:evaluations.records,selection:selectionJson(input)};
 if(!result.selected||result.decision.outcome==='RETAIN'&&incumbentStatus!=='STALE')return {...base,outcome:result.selected?'HOLD':result.decision.outcome,staged:false,reason:result.selected?'Eligible incumbent retained; no active assignment changed.':'No candidate has sufficient admissible evidence.'};
 try{
  const binding=createBinding(input),rendered=render(binding,input,request.mode);
  // The compiler can prove output syntax while production execution remains unsupported.
  if(request.mode==='production'&&rendered.manifest.provider_fallback_control==='unverified'&&binding.candidate.material_serving_settings.includes('fallback'))return {...base,outcome:'ESCALATION_REQUIRED',staged:false,reason:'Required provider fallback control is unverified; activation refused.'};
  const body={...base,binding,rendered,outcome:result.decision.outcome,staged:true,content_digest:''};body.content_digest=contentDigest(body);
  const generation=`generation_${body.content_digest.slice(7,39)}`,directory=join(root,generation);mkdirSync(directory,{recursive:true});
  writeRendered(join(directory,'rendered'),rendered);
  const path=join(directory,'proposal.json');if(existsSync(path)){if(canonicalJson(readJson(path))!==canonicalJson(body))throw new Error('REFRESH_GENERATION_CONFLICT');}else atomicJson(path,body);
  await new Ledger(join(root,'history')).append({id:generation,provenance:{source:request.trigger,observed_at:input.now,methodology:'validated_refresh.v1'},payload:{proposal_digest:body.content_digest,outcome:body.outcome}});
  return {...body,generation,proposal_path:path};
 }catch(error){return {...base,outcome:'ESCALATION_REQUIRED',staged:false,reason:error instanceof Error?error.message:String(error)};}
}
export async function applyRefresh(value:unknown){
 const request=z.object({directory:z.string(),generation:z.string().regex(/^generation_[a-f0-9]{32}$/),mode:z.enum(['production','adapter-test']),policyFile:z.string().optional()}).strict().parse(value),root=safeRoot(request.directory);
 const directory=join(root,request.generation),raw=readJson(join(directory,'proposal.json'));
 const proposal=z.object({schema_version:z.literal('refresh_staging.v1'),mode:z.enum(['production','adapter-test']),staged:z.literal(true),content_digest:z.string(),base_active_digest:z.string().nullable(),selection:z.unknown(),binding:z.unknown(),rendered:z.unknown()}).passthrough().parse(raw);
 if(contentDigest(proposal)!==proposal.content_digest||request.generation!==`generation_${proposal.content_digest.slice(7,39)}`)throw new Error('REFRESH_PROPOSAL_TAMPERED');
 if(proposal.mode!==request.mode)throw new Error('REFRESH_MODE_MISMATCH');
 const selection=parseRefreshSelection(proposal.selection,{mode:request.mode==='production'?'production':'simulation',...(request.mode==='production'?{now:new Date().toISOString()}: {})});
 if(request.mode==='production')selection.policy=loadPolicy(request.policyFile??resolve('policy/constitution.json'));
 const validity=validateBinding(proposal.binding,selection);if(validity.status!=='VALID')throw new Error('REFRESH_BINDING_INVALID');
 const rendered=render(proposal.binding,selection,request.mode);if(canonicalJson(rendered)!==canonicalJson(proposal.rendered))throw new Error('REFRESH_RENDER_RECOMPUTATION_MISMATCH');verifyRendered(join(directory,'rendered'),rendered);
 if(request.mode==='production'&&rendered.manifest.provider_fallback_control==='unverified')throw new Error('REFRESH_RUNTIME_CONTROL_UNVERIFIED');
 if(active(root)?.proposal_digest===proposal.content_digest)return {status:'already_applied',generation:request.generation,mode:request.mode};
 const lock=join(root,'.apply.lock');const fd=openSync(lock,'wx',0o600);try{
  writeFileSync(fd,canonicalJson({pid:process.pid,generation:request.generation}));
  if((active(root)?.proposal_digest??null)!==proposal.base_active_digest)throw new Error('REFRESH_ACTIVE_CHANGED');
  await new Ledger(join(root,'history')).append({id:`apply_${request.generation}`,provenance:{source:'explicit local apply',observed_at:selection.now,methodology:'atomic_activation.v1'},payload:{action:'activation_intent',generation:request.generation,proposal_digest:proposal.content_digest,mode:request.mode}});
  atomicJson(join(root,'active.json'),{generation:request.generation,proposal_digest:proposal.content_digest});
  return {status:'applied',generation:request.generation,mode:request.mode};
 }finally{closeSync(fd);unlinkSync(lock);}
}
