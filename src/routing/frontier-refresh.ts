import {z} from 'zod';
import {digest,hashBytes} from '../core/canonical.js';
import {candidateIdentity,identityAssuranceSchema,parseCandidate,parseRuntimeReport} from '../schema/index.js';
import {decodeSources} from '../evidence/sources.js';
import {nativeExecutionRequestSchema,nativeExecutionProcessSchema,deriveIdentityAssurance} from '../runtime/identity-assurance.js';
import {parseNativeTelemetry} from '../runtime/telemetry.js';

const id=z.string().min(1),iso=z.string().datetime({offset:true}),hash=z.string().regex(/^sha256:[a-f0-9]{64}$/);
const targetSchema=z.object({provider:z.enum(['openai','anthropic']),host:z.enum(['codex','claude']),model_id:id,effort:id,source:z.object({url:z.string().url(),checked_at:iso,content_digest:hash,claim:id}).strict()}).strict().superRefine((t,ctx)=>{
  const url=new URL(t.source.url),domains=t.provider==='openai'?['openai.com','chatgpt.com']:['anthropic.com','claude.com'];
  if(url.protocol!=='https:'||!domains.some(d=>url.hostname===d||url.hostname.endsWith(`.${d}`)))ctx.addIssue({code:'custom',message:'Official provider source required'});
  if(t.host!==(t.provider==='openai'?'codex':'claude'))ctx.addIssue({code:'custom',message:'Provider/host mismatch'});
});
const v1TargetsSchema=z.object({schema_version:z.literal('frontier_targets.v1'),discovered_at:iso,targets:z.array(targetSchema).length(2)}).strict();
const v2TargetsSchema=z.object({
  schema_version:z.literal('frontier_targets.v2'),discovered_at:iso,targets:z.array(targetSchema).length(2),
  model_policy:z.object({path:z.literal('skills/delegate/SKILL.md'),content_digest:hash}).strict(),
  vendor_frontiers:z.array(targetSchema.safeExtend({selection:z.enum(['selected','excluded']),reason:id,selected_target:z.object({model_id:id,effort:id}).strict()})).length(2),
}).strict();
export const frontierTargetsSchema=z.union([v1TargetsSchema,v2TargetsSchema]).superRefine((x,ctx)=>{
  if(new Set(x.targets.map(t=>t.host)).size!==2)ctx.addIssue({code:'custom',message:'One current frontier per host required'});
  if(x.schema_version==='frontier_targets.v2'){
    if(new Set(x.vendor_frontiers.map(t=>t.host)).size!==2)ctx.addIssue({code:'custom',message:'One vendor frontier per host required'});
    for(const vendor of x.vendor_frontiers){
      const target=x.targets.find(t=>t.host===vendor.host);
      if(!target||target.provider!==vendor.provider||target.model_id!==vendor.selected_target.model_id||target.effort!==vendor.selected_target.effort||
        (vendor.selection==='selected')!==(vendor.model_id===target.model_id&&vendor.effort===target.effort))ctx.addIssue({code:'custom',message:'Vendor selection must explicitly bind the exact diagnostic target'});
    }
  }
});
export const frontierProbesSchema=z.object({schema_version:z.enum(['frontier_probes.v1','frontier_probes.v2']),targets_digest:hash,probes:z.array(z.object({provider:z.enum(['openai','anthropic']),host:z.enum(['codex','claude']),model_id:id,effort:id,host_version:id,attempted:z.literal(true),attempted_at:iso,availability:z.enum(['available','unavailable','unknown']),reason:id,invocation:z.literal('native_cli'),native_agent_status:z.enum(['not_probed','not_selectable','available']),configured_model:id.optional(),configured_effort:id.optional(),observed_models:z.array(id),observed_effort:id.nullable(),identity_assurance:identityAssuranceSchema.optional(),identity_evidence_digest:hash.optional(),exit_code:z.number().int().nullable(),timed_out:z.boolean(),stdout_digest:hash,stderr_digest:hash,evaluation:z.object({status:z.enum(['not_run','pending_review','passed','failed']),review_digest:hash.nullable(),note:id}).strict()}).strict())}).strict();
export type FrontierIdentityEvidence=Record<string,{schema_version:'frontier_identity_evidence.v1';candidate:unknown;report:unknown;sources:unknown;assurance?:unknown}>;
type IdentityEntry=FrontierIdentityEvidence[string];
export type FrontierReviewEvidence=Record<string,{schema_version:'frontier_review_evidence.v1';review:unknown;identity_evidence:IdentityEntry;files:Array<{path:string;source:string;content_digest:string;bytes:string}>}>;
const reviewProbeSchema=z.object({host:z.enum(['claude','codex']),probe_trace_digest:hash,diagnosis_digest:hash,fixture_digest:hash,status:z.enum(['passed','failed'])}).strict();
const reviewSchema=z.object({schema_version:z.literal('frontier_probe_review.v1'),reviewed_at:iso,
  reviewer:z.object({host:z.enum(['claude','codex']),host_version:id,configured_model:id,configured_effort:id,observed_models:z.array(id),observed_effort:id.nullable(),fresh_process:z.literal(true)}).strict(),
  input_manifest_digest:hash,request_digest:hash,stdout_digest:hash,stderr_digest:hash,exit_code:z.literal(0),timed_out:z.literal(false),output:id,
  probes:z.array(reviewProbeSchema),qualification_authority:z.literal(false),
}).strict();

/** Current ordinary diagnostic permission comes from the portable Roles table,
 * independently supplied by the caller, never from vendor metadata or a pack. */
export function requireFrontierTargetPolicy(targets:FrontierTargets,currentPolicyBytes?:string|Uint8Array){
  if(targets.schema_version!=='frontier_targets.v2')throw Error('FRONTIER_POLICY_SCOPED_TARGETS_REQUIRED');
  if(currentPolicyBytes===undefined||hashBytes(currentPolicyBytes)!==targets.model_policy.content_digest)throw Error('FRONTIER_MODEL_POLICY_MISSING_OR_CHANGED');
  const text=typeof currentPolicyBytes==='string'?currentPolicyBytes:new TextDecoder().decode(currentPolicyBytes);
  const row=text.split('\n').find(line=>line.startsWith('| Primary frontier:'))?.split('|');
  const claude=row?.[2]?.match(/`opus` \(Opus (\d+(?:\.\d+)+)\)/);
  const codex=row?.[3]?.match(/`(gpt-[a-z0-9.-]+)`, high reasoning/);
  if(!claude||!codex)throw Error('FRONTIER_MODEL_POLICY_UNSUPPORTED');
  const permitted={claude:`claude-opus-${claude[1]!.replaceAll('.','-')}`,codex:codex[1]};
  for(const target of targets.targets)if(target.model_id!==permitted[target.host]||target.effort!=='high')throw Error('FRONTIER_TARGET_NOT_POLICY_PERMITTED');
}
export type FrontierTargets=z.infer<typeof frontierTargetsSchema>;
export type FrontierProbes=z.infer<typeof frontierProbesSchema>;

export function requireCurrentFrontierDiscovery(targets:FrontierTargets,now=new Date().toISOString(),maxAgeDays=7){
  const current=Date.parse(iso.parse(now));
  if(!Number.isFinite(maxAgeDays)||maxAgeDays<=0)throw Error('INVALID_FRONTIER_REFRESH_AGE');
  const fresh=(date:string)=>Date.parse(date)<=current&&current-Date.parse(date)<=maxAgeDays*86400000;
  if(!fresh(targets.discovered_at)||[...targets.targets,...(targets.schema_version==='frontier_targets.v2'?targets.vendor_frontiers:[])].some(t=>!fresh(t.source.checked_at)||targets.schema_version==='frontier_targets.v2'&&Date.parse(t.source.checked_at)>Date.parse(targets.discovered_at)))throw Error('FRONTIER_DISCOVERY_STALE_OR_FUTURE');
}

/** Publication preflight, not model qualification. Discovery remains a maintainer judgment. */
export function requireFrontierRefresh(targetsValue:unknown,probesValue:unknown,now=new Date().toISOString(),maxAgeDays=7,identityEvidence:FrontierIdentityEvidence={},currentPolicyBytes?:string|Uint8Array,reviewEvidence:FrontierReviewEvidence={}){
  const targets=frontierTargetsSchema.parse(targetsValue),probes=frontierProbesSchema.parse(probesValue);
  if(targets.schema_version==='frontier_targets.v2')requireFrontierTargetPolicy(targets,currentPolicyBytes);
  if(targets.schema_version==='frontier_targets.v2'&&probes.schema_version!=='frontier_probes.v2')throw Error('FRONTIER_MODERN_PROBE_REQUIRED');
  requireCurrentFrontierDiscovery(targets,now,maxAgeDays);
  const current=Date.parse(iso.parse(now));
  const fresh=(date:string)=>Date.parse(date)<=current&&current-Date.parse(date)<=maxAgeDays*86400000;
  if(probes.targets_digest!==digest(targets))throw Error('FRONTIER_TARGETS_CHANGED');
  if(probes.probes.length!==targets.targets.length)throw Error('FRONTIER_PROBE_MISSING_OR_DUPLICATE');
  for(const target of targets.targets){
    const rows=probes.probes.filter(p=>p.host===target.host&&p.provider===target.provider&&p.model_id===target.model_id&&p.effort===target.effort);
    if(rows.length!==1)throw Error('FRONTIER_PROBE_MISSING_OR_DUPLICATE');
    const probe=rows[0]!;
    if(!fresh(probe.attempted_at)||Date.parse(probe.attempted_at)<Math.max(Date.parse(target.source.checked_at),targets.schema_version==='frontier_targets.v2'?Date.parse(targets.discovered_at):0))throw Error('FRONTIER_PROBE_STALE_OR_FUTURE');
    if(probes.schema_version==='frontier_probes.v2'||probe.identity_assurance!==undefined||probe.identity_evidence_digest!==undefined){
      if(!probe.identity_assurance||!probe.identity_evidence_digest||probe.configured_model!==target.model_id||probe.configured_effort!==target.effort)throw Error('FRONTIER_IDENTITY_EVIDENCE_REQUIRED');
      const evidence=identityEvidence[probe.identity_evidence_digest];
      if(!evidence||digest(evidence)!==probe.identity_evidence_digest)throw Error('FRONTIER_IDENTITY_EVIDENCE_MISSING_OR_CHANGED');
      const candidate=parseCandidate(evidence.candidate),report=parseRuntimeReport(evidence.report);
      if(evidence.schema_version!=='frontier_identity_evidence.v1'||candidate.provider!==target.provider||candidate.model_id!==target.model_id||candidate.effort!==target.effort||report.stdout_digest!==probe.stdout_digest||report.stderr_digest!==probe.stderr_digest||report.started_at!==probe.attempted_at||report.exit_code!==probe.exit_code||report.execution_environment!==(target.host==='claude'?'claude_code':'codex'))throw Error('FRONTIER_IDENTITY_EVIDENCE_MISMATCH');
      const sources=decodeSources(evidence.sources),version=report.native_evidence?sources.get(report.native_evidence.version_digest):undefined;
      if(version===undefined||new TextDecoder().decode(typeof version==='string'?new TextEncoder().encode(version):version).trim()!==probe.host_version)throw Error('FRONTIER_HOST_VERSION_MISMATCH');
      const {diagnostics,...derived}=deriveIdentityAssurance({candidate,report,sources,executionEnvironment:target.host==='claude'?'claude_code':'codex'});
      if(digest(derived)!==digest(probe.identity_assurance))throw Error('FRONTIER_IDENTITY_ASSURANCE_NOT_DERIVED');
      if(targets.schema_version==='frontier_targets.v2'&&diagnostics.some(d=>d.hard))throw Error('FRONTIER_IDENTITY_CONTRADICTION');
      if(targets.schema_version==='frontier_targets.v2'&&report.native_evidence){
        const request=nativeExecutionRequestSchema.parse(JSON.parse(sourceText(sources,report.native_evidence.request_digest)));
        const process=nativeExecutionProcessSchema.parse(JSON.parse(sourceText(sources,report.native_evidence.process_digest)));
        sourceText(sources,report.stdout_digest);sourceText(sources,report.stderr_digest);sourceText(sources,report.native_evidence.version_digest);
        const values=(flags:string[])=>request.command.args.flatMap((arg,i)=>flags.includes(arg)?[request.command.args[i+1]??'']:flags.some(flag=>arg.startsWith(`${flag}=`))?[arg.slice(arg.indexOf('=')+1)]:[]);
        const efforts=target.host==='claude'?values(['--effort']):values(['-c','--config']).filter(value=>/^model_reasoning_effort\s*=/.test(value)).map(value=>JSON.parse(value.slice(value.indexOf('=')+1)));
        if(digest(values(['-m','--model']))!==digest([target.model_id])||digest(efforts)!==digest([target.effort])||candidate.snapshot_id!==target.model_id||!fresh(report.completed_at)||Date.parse(report.completed_at)<Date.parse(report.started_at))throw Error('FRONTIER_IDENTITY_EVIDENCE_MISMATCH');
        if(request.candidate_identity!==candidateIdentity(candidate)||digest(request.command)!==digest(report.command)||request.execution_environment!==report.execution_environment||
          process.request_digest!==report.native_evidence.request_digest||process.started_at!==report.started_at||process.completed_at!==report.completed_at||process.stdout_digest!==report.stdout_digest||process.stderr_digest!==report.stderr_digest||process.exit_code!==report.exit_code||process.signal!==report.signal||process.timed_out!==probe.timed_out)throw Error('FRONTIER_IDENTITY_EVIDENCE_MISMATCH');
      }
      if(targets.schema_version==='frontier_targets.v2'&&probe.availability!=='available'&&report.status==='completed'&&derived.overall!=='UNVERIFIED'&&!diagnostics.length)throw Error('FRONTIER_AVAILABILITY_CONFLICT');
      if(probe.availability==='available'&&(derived.overall==='UNVERIFIED'||diagnostics.length||report.status!=='completed'))throw Error('FRONTIER_IDENTITY_ASSURANCE_INSUFFICIENT');
      const observed=derived.model.assurance==='runtime_attested'?[derived.model.value]:[];
      const observedEffort=derived.effort.assurance==='runtime_attested'?derived.effort.value:null;
      if(digest(observed)!==digest(probe.observed_models)||observedEffort!==probe.observed_effort)throw Error('FRONTIER_OBSERVED_IDENTITY_MISMATCH');
    }

    if(probe.availability==='available'){
      if(probe.exit_code!==0||probe.timed_out||!['passed','failed'].includes(probe.evaluation.status)||probe.evaluation.review_digest===null)throw Error('FRONTIER_EVALUATION_REQUIRED');
      if(targets.schema_version==='frontier_targets.v2')requireIndependentReview(targets,probe,identityEvidence,reviewEvidence,fresh);
    }else if(probe.evaluation.status!=='not_run'||probe.evaluation.review_digest!==null)throw Error('FRONTIER_UNAVAILABLE_EVALUATION_CONFLICT');
  }
  return {targets,probes};
}

const sourceText=(sources:ReadonlyMap<string,string|Uint8Array>,key:string)=>{
  const bytes=sources.get(key);if(bytes===undefined||hashBytes(bytes)!==key)throw Error('FRONTIER_REVIEW_SOURCE_MISSING_OR_CHANGED');
  return typeof bytes==='string'?bytes:new TextDecoder().decode(bytes);
};

function requireIndependentReview(targets:FrontierTargets,probe:FrontierProbes['probes'][number],identityEvidence:FrontierIdentityEvidence,reviews:FrontierReviewEvidence,fresh:(date:string)=>boolean){
  const envelope=reviews[probe.evaluation.review_digest!];
  if(!envelope||digest(envelope)!==probe.evaluation.review_digest||envelope.schema_version!=='frontier_review_evidence.v1')throw Error('FRONTIER_REVIEW_EVIDENCE_MISSING_OR_CHANGED');
  const review=reviewSchema.parse(envelope.review),entry=envelope.identity_evidence;
  const candidate=parseCandidate(entry.candidate),report=parseRuntimeReport(entry.report),sources=decodeSources(entry.sources);
  const target=targets.targets.find(t=>t.host===review.reviewer.host);
  if(!target||entry.schema_version!=='frontier_identity_evidence.v1'||candidate.provider!==target.provider||candidate.model_id!==target.model_id||candidate.effort!==target.effort||
    review.reviewer.configured_model!==target.model_id||review.reviewer.configured_effort!==target.effort)throw Error('FRONTIER_REVIEW_IDENTITY_MISMATCH');
  const assurance=deriveIdentityAssurance({candidate,report,sources,executionEnvironment:target.host==='claude'?'claude_code':'codex'});
  if(assurance.overall==='UNVERIFIED'||assurance.diagnostics.length||report.status!=='completed'||report.exit_code!==0||report.stdout_digest!==review.stdout_digest||report.stderr_digest!==review.stderr_digest||
    !report.native_evidence||sourceText(sources,report.native_evidence.version_digest).trim()!==review.reviewer.host_version)throw Error('FRONTIER_REVIEW_IDENTITY_INSUFFICIENT');
  const reviewed=parseRuntimeReport(identityEvidence[probe.identity_evidence_digest!]!.report);
  if(!fresh(review.reviewed_at)||!fresh(report.started_at)||Date.parse(report.started_at)<Date.parse(reviewed.completed_at)||Date.parse(review.reviewed_at)<Date.parse(report.completed_at)||
    report.command.cwd===reviewed.command.cwd||report.native_evidence.request_digest===reviewed.native_evidence?.request_digest)throw Error('FRONTIER_REVIEW_NOT_INDEPENDENT_OR_FRESH');
  const telemetry=parseNativeTelemetry(candidate.provider as 'anthropic'|'openai',sourceText(sources,report.stdout_digest),candidate.model_id);
  if(digest(review.reviewer.observed_models)!==digest(telemetry.observed_model_ids)||review.reviewer.observed_effort!==(telemetry.observed_efforts[0]??null))throw Error('FRONTIER_REVIEW_OBSERVED_IDENTITY_MISMATCH');
  if(telemetry.result_text!==review.output)throw Error('FRONTIER_REVIEW_OUTPUT_MISMATCH');
  const files=envelope.files.map(({bytes,...file})=>{if(hashBytes(bytes)!==file.content_digest)throw Error('FRONTIER_REVIEW_SOURCE_MISSING_OR_CHANGED');return file;});
  if(new Set(files.map(f=>f.path)).size!==files.length||digest(files)!==review.input_manifest_digest)throw Error('FRONTIER_REVIEW_MANIFEST_MISMATCH');
  // The review request itself must bind its prompt and fresh workspace, and the
  // manifest must contain the exact original request, trace and diagnostic fixture.
  const rawRequest=envelope.files.find(f=>f.path===`${probe.host}/request.json`);
  const trace=envelope.files.find(f=>f.path===`${probe.host}/stdout.jsonl`);
  const fixtures=files.filter(f=>f.path===`${probe.host}/quantity.mjs`||f.path===`${probe.host}/quantity.test.mjs`);
  const nativeRequest=JSON.parse(sourceText(sources,report.native_evidence.request_digest));
  const reviewRequest=JSON.parse(sourceText(sources,review.request_digest));
  if(typeof reviewRequest.prompt!=='string'||reviewRequest.prompt.split('\n',1)[0]!==`Review input manifest ${review.input_manifest_digest}`)throw Error('FRONTIER_REVIEW_MANIFEST_NOT_IN_NATIVE_REQUEST');
  if(reviewRequest.cwd!==report.command.cwd||reviewRequest.started_at!==report.started_at||digest(reviewRequest.args)!==digest(report.command.args)||hashBytes(reviewRequest.prompt)!==nativeRequest.prompt_digest)throw Error('FRONTIER_REVIEW_REQUEST_MISMATCH');
  const probeRequest=rawRequest?JSON.parse(rawRequest.bytes):null;
  const probeNativeRequest=JSON.parse(sourceText(decodeSources(identityEvidence[probe.identity_evidence_digest!]!.sources),reviewed.native_evidence!.request_digest));
  if(!probeRequest||hashBytes(probeRequest.prompt)!==probeNativeRequest.prompt_digest||probeRequest.cwd!==reviewed.command.cwd||probeRequest.started_at!==probe.attempted_at||digest(probeRequest.args)!==digest(reviewed.command.args)||!trace||trace.content_digest!==probe.stdout_digest||fixtures.length!==2)throw Error('FRONTIER_REVIEW_PROBE_BINDING_MISMATCH');
  const rows=review.probes.filter(row=>row.host===probe.host),row=rows[0];
  const diagnosis=parseNativeTelemetry(probe.provider,trace.bytes,probe.model_id).result_text??'';
  if(rows.length!==1||!row||row.probe_trace_digest!==probe.stdout_digest||row.diagnosis_digest!==hashBytes(diagnosis)||row.fixture_digest!==digest(fixtures)||row.status!==probe.evaluation.status||row.status!==(new RegExp(`(?:^|\\n)(?:\\*\\*)?${probe.host.toUpperCase()}: PASS(?:\\*\\*)?(?:\\s|[.:—-]|$)`).test(review.output)?'passed':'failed'))throw Error('FRONTIER_REVIEW_PROBE_BINDING_MISMATCH');
}
