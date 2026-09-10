import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {z} from 'zod';
import {Ledger} from './index.js';
import {digest,hashBytes} from '../core/canonical.js';
import {publicTaskClassSchema} from '../routing/contracts.js';
import {parseSelectionInput,evaluateReview,qualify,policyDigest,parsePolicy,type SelectionInput,type ReviewProof} from '../governance/index.js';
import {candidateIdentity,parseRuntimeReport,executionEnvironmentSchema} from '../schema/index.js';
import {validateObservations} from '../evidence/index.js';
import {decodeSources,encodeSources} from '../evidence/sources.js';
import {deriveIdentityAssurance,identityAssuranceMeetsMinimum} from '../runtime/identity-assurance.js';

const id=z.string().min(1),sha=z.string().regex(/^sha256:[a-f0-9]{64}$/),iso=z.string().datetime({offset:true});
const contextSchema=z.object({source:id,observed_at:iso,origin:z.enum(['production_usage','qualification_evaluation']),public_task_class:publicTaskClassSchema,task_id:id,baseline_digest:sha.optional(),execution_environment:executionEnvironmentSchema.optional()}).strict();
const captureSchema=z.object({schema_version:z.literal('delegate_receipt_capture.v1'),context:contextSchema,receipt_text:id,receipt_digest:sha}).strict();
const reviewSchema=z.object({selection:z.unknown(),reviewerCandidateId:id,packageDigest:sha,implementerSessionId:id,proof:z.object({outcome:z.enum(['accepted','rejected','escalated']),artifact_digest:sha,package_digest:sha,runtime_receipt_digest:sha.nullable(),session_id:id.nullable(),parent_session_id:id.nullable(),context_kind:z.enum(['new','resumed','forked','unknown']),inherited_context_digest:sha.nullable()}).strict()}).strict();
const evidenceSchema=z.object({selection:z.unknown(),observationId:id,attemptReceipts:z.record(id,sha),review:reviewSchema.optional()}).strict();
const assessedSchema=z.object({schema_version:z.literal('delegate_receipt_evidence.v1'),capture:captureSchema,evidence:evidenceSchema}).strict();
const receiptSchema=z.object({schema_version:z.literal('delegate_receipt.v1')}).catchall(z.unknown());
type Capture=z.infer<typeof captureSchema>;

function receipt(capture:Capture){
 if(hashBytes(capture.receipt_text)!==capture.receipt_digest)throw Error('RECEIPT_DIGEST_MISMATCH');
 const raw=receiptSchema.parse(JSON.parse(capture.receipt_text));
 const task=z.object({public_task_class:id.optional(),task_id:id.optional()}).passthrough().safeParse(raw['task']);
 const taskClass=raw['task_class']??(task.success?task.data.public_task_class:undefined),taskId=raw['task_id']??(task.success?task.data.task_id:undefined);
 if(taskClass!==undefined&&taskClass!==capture.context.public_task_class)throw Error('RECEIPT_CLASS_CONFLICT');
 if(taskId!==undefined&&taskId!==capture.context.task_id)throw Error('RECEIPT_TASK_CONFLICT');
 return raw;
}
function selection(value:unknown,now:string):SelectionInput{
 const raw=z.object({sources:z.unknown().optional()}).passthrough().parse(value),sources=decodeSources(raw.sources??{});
 return {...parseSelectionInput({...raw,sources:{}},{mode:'production',now}),sources};
}
function requireSources(report:ReturnType<typeof parseRuntimeReport>,sources:ReadonlyMap<string,string|Uint8Array>){
 for(const key of ['stdout_digest','stderr_digest'] as const){const hash=report[key];if(!hash||!sources.has(hash)||hashBytes(sources.get(hash)!)!==hash)throw Error('RECEIPT_STREAM_UNRESOLVED');}
}

/** Archive first. Model-written timestamps/outcomes never grant qualification. */
export async function captureReceipt(input:{directory:string;receiptFile:string;context:unknown}){
 const context=contextSchema.parse(input.context);
 if(Date.parse(context.observed_at)>Date.now())throw Error('RECEIPT_OBSERVATION_FUTURE');
 const receipt_text=await readFile(input.receiptFile,'utf8');
 const capture=captureSchema.parse({schema_version:'delegate_receipt_capture.v1',context,receipt_text,receipt_digest:hashBytes(receipt_text)});receipt(capture);
 const directory=join(input.directory,context.public_task_class),recordId=`receipt_${capture.receipt_digest.slice(7)}`;
 const result=await new Ledger(directory).append({id:recordId,provenance:{source:context.source,observed_at:context.observed_at,methodology:'delegate_receipt_capture.v1'},payload:capture});
 return {status:'PENDING_EVIDENCE',directory,recordId,inserted:result.inserted,receipt_digest:capture.receipt_digest,qualification_authority:false};
}

/** Revalidate on ingestion AND refresh; a ledger checksum is not review authority. */
export function validateReceiptEvidence(value:unknown,currentPolicy?:unknown){
 const payload=assessedSchema.parse(value),{capture,evidence}=payload,raw=receipt(capture),now=capture.context.observed_at;
 if(Date.parse(now)>Date.now())throw Error('RECEIPT_OBSERVATION_FUTURE');
 const input=selection(evidence.selection,now),row=input.observations.find(o=>o.observation_id===evidence.observationId);
 if(currentPolicy!==undefined&&policyDigest(input.policy)!==policyDigest(parsePolicy(currentPolicy)))throw Error('RECEIPT_ASSESSMENT_POLICY_CHANGED');
 if(input.policy.policy_version>=4){
  const environment=capture.context.execution_environment;
  if(!environment||environment==='unknown'||environment!==input.request.execution_environment)throw Error('RECEIPT_EXECUTION_ENVIRONMENT_UNRESOLVED');
  if(raw['execution_environment']!==undefined&&raw['execution_environment']!==environment)throw Error('RECEIPT_EXECUTION_ENVIRONMENT_CONFLICT');
 }
 if(!row)throw Error('RECEIPT_OBSERVATION_MISSING');
 const [observation]=validateObservations([row],{registry:input.registry,candidates:input.candidates,mode:'production',allowConfigurationPinning:input.policy.policy_version>=5&&['low','medium'].includes(input.request.risk)&&['claude_code','codex'].includes(input.request.execution_environment??''),sources:input.sources!,runtimeReports:input.runtimeReports??new Map()});
 if(!observation)throw Error('RECEIPT_OBSERVATION_MISSING');
 if(observation.accepted&&!evidence.review)throw Error('RECEIPT_INDEPENDENT_REVIEW_REQUIRED');
 const candidate=input.candidates.find(c=>c.candidate_id===observation.candidate.candidate_id)!;
 const baseline=capture.context.baseline_digest??raw['starting_artifact_digest'];
 if(baseline!==observation.fixture_digest||(raw['starting_artifact_digest']!==undefined&&raw['starting_artifact_digest']!==baseline))throw Error('RECEIPT_BASELINE_UNRESOLVED');
 const publicClass=observation.task_class_id==='bounded_backend'?'bounded_implementation':observation.task_class_id;
 if(publicClass!==capture.context.public_task_class||observation.task_id!==capture.context.task_id||observation.measured_at!==now)throw Error('RECEIPT_OBSERVATION_CONTEXT_MISMATCH');
 for(const key of ['role_id','task_class_id','risk','cohort_id','constraints_digest'] as const)if(observation[key]!==input.request[key])throw Error('RECEIPT_OBSERVATION_STRATUM_MISMATCH');
 const attempts=z.array(z.object({candidate_id:id.optional(),candidate_identity:sha.optional(),role:id.optional(),kind:id.optional()}).passthrough()).parse(raw['attempts']);
 const roleKind=(role:string|undefined)=>['worker','implementer','rework'].includes(role??'')?'worker':['review','reviewer','verifier','frontier_verifier'].includes(role??'')?'review':null;
 if(attempts.some(a=>!roleKind(a.role??a.kind)||!a.candidate_id))throw Error('RECEIPT_ATTEMPT_ROLE_UNRESOLVED');
 const workers=attempts.filter(a=>['worker','implementer','rework'].includes(a.role??a.kind??''));
 if(!workers.length||workers.some(a=>a.candidate_id!==candidate.candidate_id||(a.candidate_identity&&a.candidate_identity!==candidateIdentity(candidate))))throw Error('RECEIPT_WORKER_ATTRIBUTION_UNRESOLVED');
 if(observation.attempts.filter(a=>a.kind==='worker'||a.kind==='rework').length<workers.length)throw Error('RECEIPT_ATTEMPTS_OMITTED');
 const expected=observation.attempts.map(a=>a.attempt_id).sort();
 if(digest(Object.keys(evidence.attemptReceipts).sort())!==digest(expected)||new Set(Object.values(evidence.attemptReceipts)).size!==expected.length)throw Error('RECEIPT_ATTEMPT_LINEAGE_MISMATCH');
 const sources=new Map(input.sources),runtimeReports=new Map(input.runtimeReports);
 let reviewInput:SelectionInput|undefined;
 if(evidence.review){
  reviewInput=selection(evidence.review.selection,now);
  if(policyDigest(reviewInput.policy)!==policyDigest(input.policy)||reviewInput.registry.content_digest!==input.registry.content_digest)throw Error('RECEIPT_REVIEW_POLICY_MISMATCH');
  if(digest({...reviewInput.request,role_id:''})!==digest({...input.request,role_id:''}))throw Error('RECEIPT_REVIEW_STRATUM_MISMATCH');
  for(const [key,bytes] of reviewInput.sources!)sources.set(key,bytes);
  for(const [key,report] of reviewInput.runtimeReports!)runtimeReports.set(key,report);
 }
 const identityAssurances:Record<string,ReturnType<typeof deriveIdentityAssurance>>={};
 const capturedCounts=new Map<string,number>();let first=Infinity,last=-Infinity;
 for(const attempt of observation.attempts){
  const reportDigest=evidence.attemptReceipts[attempt.attempt_id]!,reportValue=runtimeReports.get(reportDigest);
  if(!reportValue||digest(reportValue)!==reportDigest)throw Error('RECEIPT_ATTEMPT_UNRESOLVED');
  const report=parseRuntimeReport(reportValue);requireSources(report,sources);
  if(input.policy.policy_version>=4&&report.execution_environment!==capture.context.execution_environment)throw Error('RECEIPT_ATTEMPT_ENVIRONMENT_MISMATCH');
  if(report.provider==='synthetic'||Date.parse(report.completed_at)>Date.parse(now))throw Error('RECEIPT_ATTEMPT_INVALID');
  if(attempt.kind!=='review'&&(report.candidate_id!==candidate.candidate_id||report.provider!==candidate.provider))throw Error('RECEIPT_ATTEMPT_IDENTITY_MISMATCH');
  if(input.policy.policy_version>=5){
   const actualCandidate=attempt.kind==='review'?(reviewInput?.candidates??input.candidates).find(c=>c.candidate_id===report.candidate_id):candidate;
   if(!actualCandidate)throw Error('RECEIPT_ATTEMPT_IDENTITY_UNRESOLVED');
   const assurance=deriveIdentityAssurance({candidate:actualCandidate,report,sources,executionEnvironment:capture.context.execution_environment!});
   identityAssurances[attempt.attempt_id]=assurance;
   // Contradictions cannot be downgraded to missing telemetry. Unknown failed
   // attempts remain observable, but never create qualification authority.
   if(assurance.diagnostics.some(item=>item.hard))throw Error(`RECEIPT_ATTEMPT_IDENTITY_MISMATCH: ${assurance.diagnostics.filter(item=>item.hard).map(item=>item.rule_id).join(',')}`);
  }else if(attempt.kind!=='review'&&(report.observed_identity.model_id!==undefined&&report.observed_identity.model_id!==candidate.snapshot_id||report.observed_identity.effort!==undefined&&report.observed_identity.effort!==candidate.effort))throw Error('RECEIPT_ATTEMPT_IDENTITY_MISMATCH');
  if(attempt.cost_usd!==(report.usage?.cost_usd??null))throw Error('RECEIPT_ATTEMPT_COST_MISMATCH');
  const start=Date.parse(report.started_at),end=Date.parse(report.completed_at);first=Math.min(first,start);last=Math.max(last,end);
  if(attempt.latency_ms!==null&&attempt.latency_ms<end-start)throw Error('RECEIPT_ATTEMPT_LATENCY_UNDERSTATED');
  const key=`${attempt.kind==='review'?'review':'worker'}:${report.candidate_id}`;capturedCounts.set(key,(capturedCounts.get(key)??0)+1);
 }
 if(observation.latency_ms!==null&&observation.latency_ms<last-first)throw Error('RECEIPT_TASK_LATENCY_UNDERSTATED');
 for(const attempt of attempts){const key=`${roleKind(attempt.role??attempt.kind)}:${attempt.candidate_id}`,count=capturedCounts.get(key)??0;if(count<1)throw Error('RECEIPT_ATTEMPTS_OMITTED');capturedCounts.set(key,count-1);}
 if(!Object.values(evidence.attemptReceipts).includes(observation.provenance.runtime_receipt_digest!))throw Error('RECEIPT_PRIMARY_RUNTIME_MISSING');
 if(observation.accepted){
  const review=evidence.review;
  if(!review||!reviewInput)throw Error('RECEIPT_INDEPENDENT_REVIEW_REQUIRED');
  const reviewer=reviewInput.candidates.find(c=>c.candidate_id===review.reviewerCandidateId);
  const reviewReportValue=runtimeReports.get(review.proof.runtime_receipt_digest??''),reviewReport=reviewReportValue?parseRuntimeReport(reviewReportValue):null;
  if(!reviewer||!reviewReport||digest(reviewReportValue)!==review.proof.runtime_receipt_digest||reviewReport.status!=='completed'||reviewReport.exit_code!==0||reviewReport.signal!==null||reviewReport.candidate_id!==reviewer.candidate_id||reviewReport.provider!==reviewer.provider)throw Error('RECEIPT_REVIEW_RUNTIME_INVALID');
  requireSources(reviewReport,sources);
  if(input.policy.policy_version>=5){
   const assurance=deriveIdentityAssurance({candidate:reviewer,report:reviewReport,sources,executionEnvironment:capture.context.execution_environment!});
   if(assurance.diagnostics.some(item=>item.hard)||!identityAssuranceMeetsMinimum(assurance.overall,input.policy.identity_assurance!.minimum_by_risk[observation.risk]))throw Error('RECEIPT_REVIEW_IDENTITY_ASSURANCE_INSUFFICIENT');
  }else if(reviewReport.observed_identity.source==='unknown'||reviewReport.observed_identity.model_id!==reviewer.snapshot_id||reviewReport.observed_identity.effort!==reviewer.effort)throw Error('RECEIPT_REVIEW_RUNTIME_INVALID');
  if(!observation.attempts.some(a=>a.kind==='review'&&evidence.attemptReceipts[a.attempt_id]===review.proof.runtime_receipt_digest))throw Error('RECEIPT_REVIEW_COST_OMITTED');
  if(!sources.has(review.packageDigest)||hashBytes(sources.get(review.packageDigest)!)!==review.packageDigest)throw Error('RECEIPT_REVIEW_PACKAGE_UNRESOLVED');
  const verdict=evaluateReview({policy:input.policy,registry:input.registry,implementer:candidate,reviewer,risk:observation.risk,artifactDigest:observation.provenance.artifact_digest,packageDigest:review.packageDigest,implementerSessionId:review.implementerSessionId,proof:review.proof as ReviewProof,reviewerQualification:{...reviewInput,candidate:reviewer}});
  if(!verdict.ok)throw Error(`RECEIPT_REVIEW_REJECTED: ${verdict.diagnostics.map(d=>d.rule_id).join(',')}`);
 }
 const qualification=qualify({...input,observations:[observation],candidate});
 return {payload,qualification,identity_assurances:identityAssurances, envelope:{schema_version:'evaluation_ledger_entry.v1' as const,purpose:capture.context.origin,observation,sources:encodeSources(sources),runtimeReports:Object.fromEntries(runtimeReports),operationalLimits:['Imported receipt evidence is not automatic qualification.',...qualification.diagnostics.map(d=>d.rule_id)]}};
}

export async function assessReceipt(input:{directory:string;recordId:string;evidence:unknown}){
 const ledger=new Ledger(input.directory),record=await ledger.get(input.recordId);
 if(!record)throw Error('RECEIPT_CAPTURE_MISSING');
 const result=validateReceiptEvidence({schema_version:'delegate_receipt_evidence.v1',capture:captureSchema.parse(record.payload),evidence:input.evidence});
 const recordId=`evidence_${digest(result.payload).slice(7)}`;
 const appended=await ledger.append({id:recordId,provenance:{...record.provenance,methodology:'delegate_receipt_evidence.v1',receipt_record_id:record.id},payload:result.payload});
 return {status:'VALIDATED_OBSERVATION',recordId,directory:input.directory,inserted:appended.inserted,qualification:result.qualification.status,diagnostics:result.qualification.diagnostics,identity_assurances:result.identity_assurances,refresh_input:{evaluationLedgers:[{directory:input.directory,recordIds:[recordId]}]}};
}
