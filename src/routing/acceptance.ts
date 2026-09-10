import {z} from 'zod';
import {digest} from '../core/canonical.js';
import {acceptanceTaskClasses,provisionalIdentity,provisionalTreatmentSchema,taskEvidenceSchema,type ProvisionalTreatmentInput} from './provisional.js';
import type {ProvisionalRouteInput} from './compiler.js';

const id=z.string().min(1),hash=z.string().regex(/^sha256:[a-f0-9]{64}$/),iso=z.string().datetime({offset:true});
const host=z.enum(['codex','claude']);
const controls=z.object({model:id,effort:id}).passthrough();
const workerSchema=z.object({requested_model:id.nullable(),requested_effort:id.nullable(),configured_model_effort:z.array(controls).nullable(),observed_message_models:z.array(id),observed_written_files:z.array(id)}).passthrough();
const recoverySchema=z.object({kind:id,external_grader_passed:z.boolean(),receipt_count:z.number().int().nonnegative(),limitations:z.array(id),trace_digests:z.array(hash)}).passthrough();
const browserSchema=z.object({verdict:id,artifact_digest:hash,current_artifact_matches:z.boolean(),reviewer:id,viewports:z.array(z.object({width:z.number().positive(),height:z.number().positive()})),checks:z.array(id)}).passthrough();
const caseSchema=z.object({
  id,host,case:z.enum(['tinybug','mechanical','backend','ui','hardbug','multicomponent','fullproject']),acceptance:id,
  original_attempt:z.object({started_at:iso,exit_code:z.number().int().nullable(),timed_out:z.boolean()}).passthrough(),
  worker_count:z.number().int().nonnegative(),workers:z.array(workerSchema),
  frontier:z.object({configuration:z.union([z.array(controls),z.object({requested_model:id,requested_effort:id}).passthrough()]),observed_message_models:z.array(id),actual_artifact_inspected:z.boolean(),check_count:z.number().int().nonnegative()}).passthrough(),
  external_grader_passed:z.boolean(),artifact_digests:z.record(id,hash),receipt_count:z.number().int().nonnegative(),receipt_digests:z.array(hash),
  recovery:recoverySchema.nullable(),browser:browserSchema.nullable(),trace_digests:z.array(hash),
}).passthrough();
const acceptanceSchema=z.object({schema_version:z.literal('installed_delegate_acceptance.v1'),validated_at:iso,host_versions:z.object({codex:id,claude:id}),cases:z.array(caseSchema)}).passthrough();
const runRole=z.object({model:id,configured_effort:id}).passthrough();
const observationsSchema=z.object({treatments:z.array(provisionalTreatmentSchema),runs:z.array(z.object({
  host,objective_passed:z.boolean(),worker_stdout_digest:hash,reviewer_stdout_digest:hash,
  worker:runRole,reviewer:runRole.extend({verdict:id}),
}).passthrough())}).passthrough();
type AcceptedCase=z.infer<typeof caseSchema>;
type Role='worker'|'reviewer';

const scopes={
  repo_exploration:'Read and explain a small local JavaScript/HTML codebase with file evidence.',
  mechanical_work:'Specified local JavaScript API renames, nullish-default fixes and equivalent mechanical changes.',
  bounded_implementation:'Contained local JavaScript functions with settled interfaces and executable checks.',
  ui_implementation:'Small plain HTML/CSS interfaces with a frontier-provided specification and rendered acceptance.',
  hard_debugging:'Local JavaScript logic and asynchronous ordering bugs with a deterministic reproduction.',
  complex_implementation:'Small multi-file JavaScript features with settled contracts and integration checks.',
  research:'Analysis of supplied local source files or supplied facts with frontier verification; no web-research evaluation.',
} as const;

function accepted(record:AcceptedCase):boolean{
  if(!['PASS','PASS_WITH_HARNESS_RECOVERY'].includes(record.acceptance)||!record.external_grader_passed||!record.frontier.actual_artifact_inspected||record.worker_count!==record.workers.length||record.worker_count!==1||!record.trace_digests.length||!record.receipt_digests.length||record.receipt_count<1||!Object.keys(record.artifact_digests).length)return false;
  if(record.acceptance==='PASS'&&(record.original_attempt.timed_out||record.original_attempt.exit_code!==0||record.recovery))return false;
  if(record.acceptance==='PASS_WITH_HARNESS_RECOVERY'&&(!record.recovery?.external_grader_passed||record.recovery.receipt_count<1||!record.recovery.trace_digests.length))return false;
  if(record.case==='ui')return record.browser?.verdict==='PASS'&&record.browser.current_artifact_matches&&Object.values(record.artifact_digests).includes(record.browser.artifact_digest)&&record.browser.viewports.length>0&&record.browser.checks.length>0;
  return record.frontier.check_count>0;
}

function matches(t:ProvisionalTreatmentInput,requestedModel:string|null,requestedEffort:string|null,configured:z.infer<typeof controls>[]|null,observed:string[]):boolean{
  const models=new Set([t.model_id,...(t.snapshot_id?[t.snapshot_id]:[])]);
  if(observed.length&&observed.some(model=>!models.has(model)))return false;
  if(configured?.length){
    return configured.every(c=>models.has(c.model)&&c.effort===t.effort)&&(!requestedModel||models.has(requestedModel))&&(!requestedEffort||requestedEffort===t.effort);
  }
  // A native alias is admissible only when the returned canonical model matches.
  if(!observed.length&&(!requestedModel||!models.has(requestedModel)))return false;
  if(requestedModel&&!models.has(requestedModel)&&!(observed.length&&t.provider==='anthropic'&&requestedModel===t.family))return false;
  return requestedEffort===t.effort||(requestedEffort===null&&t.effort==='not_applicable'&&t.evidence.effort_source==='not_applicable');
}

function roleMatches(t:ProvisionalTreatmentInput,record:AcceptedCase,role:Role):boolean{
  if(record.host!==t.evidence.host)return false;
  if(role==='worker')return record.workers.some(w=>matches(t,w.requested_model,w.requested_effort,w.configured_model_effort,w.observed_message_models));
  if(!t.frontier)return false;
  const config=record.frontier.configuration;
  return Array.isArray(config)?matches(t,null,null,config,record.frontier.observed_message_models):matches(t,config.requested_model,config.requested_effort,null,record.frontier.observed_message_models);
}

/** Join audited installed cases to exact existing treatments; this grants no governor qualification. */
export function buildProvisionalPilotRoutes(observationInput:unknown,acceptanceInput:unknown):ProvisionalRouteInput[]{
  const observations=observationsSchema.parse(observationInput),acceptance=acceptanceSchema.parse(acceptanceInput);
  if(new Set(acceptance.cases.map(c=>c.id)).size!==acceptance.cases.length)throw new Error('Duplicate installed acceptance case id');
  const rawCases=(acceptanceInput as {cases:unknown[]}).cases;
  const recordDigests=new Map(acceptance.cases.map((record,index)=>[record.id,digest(rawCases[index])]));
  const source={path:'data/routing/installed-acceptance.json' as const,content_digest:digest(acceptanceInput),digest_encoding:'canonical_json_sha256' as const};
  const roles=(t:ProvisionalTreatmentInput,role:Role)=>observations.runs.some(run=>run.host===t.evidence.host&&run.objective_passed&&run.reviewer.verdict==='ACCEPT'&&run[role].model===t.model_id&&run[role].configured_effort===t.effort&&t.evidence.smoke.execution_digest===(role==='worker'?run.worker_stdout_digest:run.reviewer_stdout_digest))&&(role!=='reviewer'||t.frontier);
  const admittedWorkers=observations.treatments.filter(t=>roles(t,'worker')),admittedReviewers=observations.treatments.filter(t=>roles(t,'reviewer'));
  const routes:ProvisionalRouteInput[]=[];
  for(const currentHost of ['codex','claude'] as const){
    const candidates=observations.treatments.filter(t=>t.evidence.host===currentHost);
    for(const [publicTaskClass,scope] of Object.entries(scopes) as [keyof typeof scopes,string][]){
      const enrich=(t:ProvisionalTreatmentInput,role:Role):ProvisionalTreatmentInput=>{
        const records=acceptance.cases.filter(record=>record.case!=='fullproject'&&acceptanceTaskClasses[record.case]===publicTaskClass&&Date.parse(record.original_attempt.started_at)<=Date.parse(acceptance.validated_at)&&accepted(record)&&admittedWorkers.some(worker=>roleMatches(worker,record,'worker'))&&admittedReviewers.some(reviewer=>roleMatches(reviewer,record,'reviewer'))&&roleMatches(t,record,role));
        const task_evidence=taskEvidenceSchema.parse({public_task_class:publicTaskClass,role,host:currentHost,candidate_identity:provisionalIdentity(t),basis:records.length?'installed_acceptance':'smoke_extrapolation',source,
          records:records.map(record=>({case_id:record.id,case:record.case,record_digest:recordDigests.get(record.id),observed_at:record.original_attempt.started_at,host_version:acceptance.host_versions[record.host],acceptance:record.acceptance,artifact_digests:record.artifact_digests,trace_digests:record.trace_digests,receipt_digests:record.receipt_digests,recovery:record.recovery?{kind:record.recovery.kind,limitations:record.recovery.limitations,trace_digests:record.recovery.trace_digests}:null,browser:record.browser?{artifact_digest:record.browser.artifact_digest,reviewer:record.browser.reviewer,viewports:record.browser.viewports,checks:record.browser.checks}:null})),
          limitations:records.length?['Only the referenced accepted cases support this exact host, model, effort and role; broader task fit remains provisional, not governor qualification.',...records.flatMap(record=>record.recovery?.limitations??[])]:['No matching installed acceptance case exists for this class, host, model, effort and role. This entry extrapolates from its original smoke and official metadata.'],
        });
        return {...t,evidence:{...t.evidence,task_evidence}};
      };
      const workers=candidates.filter(t=>roles(t,'worker')).map(t=>enrich(t,'worker')),reviewers=candidates.filter(t=>roles(t,'reviewer')).map(t=>enrich(t,'reviewer'));
      if(!workers.length||!reviewers.length)continue;
      routes.push({publicTaskClass,scope:`${currentHost} pilot: ${scope} Each treatment identifies matching installed acceptance or explicit smoke extrapolation. Neither tier is governor qualification.`,risk:'low',requirements:{tools:['terminal'],capabilities:['terminal'],context_window_tokens:0,fresh_context:false},workers,reviewers});
    }
  }
  return routes;
}
