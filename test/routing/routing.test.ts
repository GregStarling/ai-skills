import {readFileSync} from 'node:fs';
import {describe,it,expect,vi,afterEach} from 'vitest';
import {contentDigest,digest,hashBytes} from '../../src/core/canonical.js';
import {candidateIdentity,parseRuntimeReport} from '../../src/schema/index.js';
import {provisionalIdentity,type ProvisionalTreatmentInput} from '../../src/routing/provisional.js';
import {compileRoutingPack,parseRoutingPack,expandRoutingPack,resolveRouting,type RoutingPack} from '../../src/routing/index.js';

const fixture=()=>JSON.parse(readFileSync('fixtures/bindings/valid-initial-backend.json','utf8')).selection;
function reviewer(worker:any){const value=structuredClone(worker);value.request.role_id='reviewer';value.candidates=value.candidates.filter((candidate:any)=>candidate.candidate_id==='candidate_beta');value.observations=value.observations.filter((row:any)=>row.candidate.candidate_id==='candidate_beta');for(const row of value.observations){row.role_id='reviewer';row.content_digest=contentDigest(row);}delete value.incumbentCandidateId;return value;}
function production(){
  const value=fixture(),sources=value.sources as Record<string,string>,reports:Record<string,unknown>={};
  const add=(text:string)=>{const key=hashBytes(text);sources[key]=text;return key;};
  for(const record of value.registry.records){record.provider='openai';record.pinning.source='registry_metadata';record.content_digest=contentDigest(record);}
  value.registry.content_digest=contentDigest(value.registry);
  for(const candidate of value.candidates){candidate.provider='openai';candidate.provenance.registry_content_digest=value.registry.content_digest;}
  for(const row of value.observations){
    const candidate=value.candidates.find((c:any)=>c.candidate_id===row.candidate.candidate_id);row.lane='production';row.candidate.candidate_identity=candidateIdentity(candidate);
    const receipt=parseRuntimeReport({schema_version:'runtime_report.v1',report_id:`report_${row.observation_id}`,provider:'openai',candidate_id:candidate.candidate_id,started_at:value.now,completed_at:value.now,command:{executable:'routing-test',args:[],cwd:'/tmp'},status:'completed',exit_code:0,signal:null,timeout_ms:1000,stdout_digest:add(`stdout ${row.observation_id}`),stderr_digest:add(''),observed_identity:{source:'provider_receipt',model_id:candidate.snapshot_id,effort:candidate.effort}});
    const receiptDigest=digest(receipt);reports[receiptDigest]=receipt;
    const check=add(`check ${row.observation_id}`),grade=JSON.stringify({schema_version:'grader_result.v1',task_id:row.task_id,fixture_digest:row.fixture_digest,candidate_identity:row.candidate.candidate_identity,artifact_digest:row.provenance.artifact_digest,passed:true,accepted:true,checks:[{check_id:'routing_check',passed:true,evidence_digest:check}]});
    row.provenance={...row.provenance,source:'native_runtime',source_digest:add(grade),runtime_receipt_digest:receiptDigest};row.content_digest=contentDigest(row);
  }
  value.runtimeReports=reports;return value;
}
function compileProduction(worker=production()){
  const review=reviewer(worker);return compileRoutingPack({mode:'production',policy:worker.policy,strata:[{publicTaskClass:'bounded_implementation',workerSelection:worker,reviewerSelection:review}]});
}
function host(pack:RoutingPack,candidates=pack.routes[0]!.workers){return {treatments:candidates.map(reference=>{const c=pack.treatments[reference.candidate_identity]!;return {provider:c.provider,model_id:c.model_id,snapshot_id:c.snapshot_id,effort:c.effort,serving:c.serving};}),tools:['terminal'],capabilities:['terminal'],context_window_tokens:100000,supports_fresh_context:true};}
afterEach(()=>vi.useRealTimers());

describe('portable routing pack',()=>{
  it('compiles existing fixture evidence only as an explicit simulation and keeps all missing classes honest',()=>{
    const worker=fixture(),pack=compileRoutingPack({mode:'simulation_test',generatedAt:worker.now,policy:worker.policy,strata:[{publicTaskClass:'bounded_implementation',workerSelection:worker,reviewerSelection:reviewer(worker)}]});
    expect(pack.mode).toBe('simulation_test');expect(pack.routes[0]!.workers.map(x=>x.candidate_id)).toEqual(['candidate_alpha','candidate_beta']);expect(pack.routes[0]!.reviewers.map(x=>x.candidate_id)).toEqual(['candidate_beta']);
    expect(pack.missing_routes).toHaveLength(6);expect(()=>resolveRouting(pack,{publicTaskClass:'bounded_implementation',stratumDigest:pack.routes[0]!.stratum_digest,now:worker.now,host:host(pack)})).toThrowError(expect.objectContaining({code:'PACK_NOT_PRODUCTION'}));
  });

  it('does not turn synthetic fixture evidence into production authority',()=>{
    vi.useFakeTimers();vi.setSystemTime(new Date('2026-09-09T00:00:00Z'));const worker=fixture();const pack=compileRoutingPack({mode:'production',policy:worker.policy,strata:[{publicTaskClass:'bounded_implementation',workerSelection:worker,reviewerSelection:reviewer(worker)}]});
    expect(pack.routes[0]!.workers).toEqual([]);expect(pack.routes[0]!.reviewers).toEqual([]);expect(pack.missing_routes).toContainEqual({public_task_class:'bounded_implementation',reason:'no_qualified_worker'});
    expect(pack.exclusions.every(x=>x.rule_ids.includes('synthetic_candidate_in_production'))).toBe(true);
  });

  it('intersects exact host treatments, advances after failures, and requires a frontier verifier',()=>{
    vi.useFakeTimers();vi.setSystemTime(new Date('2026-09-09T00:00:00Z'));const pack=compileProduction(),route=pack.routes[0]!,available=host(pack,[...route.workers,...route.reviewers]);
    const base={publicTaskClass:'bounded_implementation' as const,stratumDigest:route.stratum_digest,now:'2026-09-09T01:00:00Z',host:available};
    expect(resolveRouting(pack,base)).toMatchObject({worker:{candidate_id:'candidate_alpha'},reviewer:{candidate_id:'candidate_beta'},stale:false});
    expect(resolveRouting(pack,{...base,failedCandidateIds:['candidate_alpha']})).toMatchObject({worker:{candidate_id:'candidate_beta'},reviewer:{candidate_id:'candidate_beta'}});
    expect(()=>resolveRouting(pack,{...base,host:host(pack,[route.workers[0]!] )})).toThrowError(expect.objectContaining({code:'NO_ELIGIBLE_FRONTIER_REVIEWER'}));
    expect(()=>resolveRouting(pack,{...base,host:{...available,capabilities:[]}})).toThrowError(expect.objectContaining({code:'HOST_CAPABILITIES_INSUFFICIENT'}));
  });

  it('rejects future, expired, wrong-stratum and rehashed internal tampering',()=>{
    vi.useFakeTimers();vi.setSystemTime(new Date('2026-09-09T00:00:00Z'));const pack=compileProduction(),route=pack.routes[0]!,available=host(pack,[...route.workers,...route.reviewers]);
    const request={publicTaskClass:'bounded_implementation' as const,stratumDigest:route.stratum_digest,now:'2026-09-08T23:00:00Z',host:available};
    expect(()=>resolveRouting(pack,request)).toThrowError(expect.objectContaining({code:'PACK_NOT_YET_VALID'}));
    expect(()=>resolveRouting(pack,{...request,now:pack.expires_at})).toThrowError(expect.objectContaining({code:'PACK_EXPIRED'}));
    expect(()=>resolveRouting(pack,{...request,now:'2026-09-09T01:00:00Z',stratumDigest:digest('wrong')})).toThrowError(expect.objectContaining({code:'STRATUM_MISMATCH'}));
    const altered=structuredClone(pack);altered.routes[0]!.workers[0]!.candidate_identity=digest('invented');altered.content_digest=contentDigest(altered);
    expect(()=>parseRoutingPack(altered)).toThrowError(expect.objectContaining({code:'PACK_MALFORMED'}));
  });

  it('preserves a retained incumbent ahead of a cheaper qualified challenger and supports multiple exact strata per class',()=>{
    vi.useFakeTimers();vi.setSystemTime(new Date('2026-09-09T00:00:00Z'));const worker=production();worker.incumbentCandidateId='candidate_beta';const review=reviewer(worker);review.incumbentCandidateId='candidate_beta';
    const second=structuredClone(worker);second.request.risk='medium';for(const row of second.observations){row.risk='medium';row.content_digest=contentDigest(row);}const secondReview=reviewer(second);
    const pack=compileRoutingPack({mode:'production',policy:worker.policy,strata:[{publicTaskClass:'bounded_implementation',workerSelection:worker,reviewerSelection:review},{publicTaskClass:'bounded_implementation',workerSelection:second,reviewerSelection:secondReview}]});
    expect(pack.routes).toHaveLength(2);const low=pack.routes.find(r=>r.stratum.worker_request.risk==='low')!;expect(low.workers[0]!.candidate_id).toBe('candidate_beta');expect(low.reviewers[0]!.candidate_id).toBe('candidate_beta');expect(new Set(pack.routes.map(r=>r.stratum_digest)).size).toBe(2);
  });

  it('allows an empty compiler-generated production pack',()=>{
    vi.useFakeTimers();vi.setSystemTime(new Date('2026-09-09T00:00:00Z'));const policy=fixture().policy,pack=compileRoutingPack({mode:'production',policy,strata:[]});
    expect(pack.routes).toEqual([]);expect(pack.missing_routes).toHaveLength(7);expect(parseRoutingPack(pack)).toEqual(pack);
  });
});

const currentPolicy=()=>JSON.parse(readFileSync('policy/constitution.json','utf8'));
function provisionalCandidate(id:string,frontier=false,observed_at='2026-09-09T00:00:00Z'){
  return {candidate_id:id,provider:'openai' as const,model_id:id,snapshot_id:null,effort:'not_applicable',serving:{fallback:'disabled' as const,tool_use:'host_tools' as const,json_schema:false},material_serving_settings:['fallback','tool_use'] as ('fallback'|'tool_use')[],family:id,frontier,capabilities:['terminal'],context_window_tokens:null,evidence:{observed_at,host:'codex' as const,host_version:'fixture-only',observed_model_id:id,observed_effort:'not_applicable',identity_source:'host_configuration' as const,control_limitations:['Model alias and configured effort; no immutable server snapshot proof.'],availability:{url:'https://developers.openai.com/codex/models',checked_at:observed_at},pricing:{url:'https://developers.openai.com/codex/pricing',checked_at:observed_at,input_usd_per_million:null,output_usd_per_million:null,unknown_reason:'Subscription billing is not measured dollar cost.'},smoke:{task:'Test fixture only; not actual provider qualification.',artifact_digest:digest('artifact'),execution_digest:digest('execution'),review_digest:digest('review'),accepted:true as const,frontier_reviewed:true as const},qualification_failure:null}};
}
function provisionalRoute(){return {publicTaskClass:'mechanical_work' as const,scope:'A bounded rename in a small JavaScript fixture with existing tests.',risk:'low' as const,requirements:{tools:['terminal'],capabilities:['terminal'],context_window_tokens:0,fresh_context:false},workers:[provisionalCandidate('cheap_alias')],reviewers:[provisionalCandidate('frontier_alias',true)]};}
function provisionalPack(){return compileRoutingPack({mode:'production',policy:currentPolicy(),strata:[],provisional:[provisionalRoute()]});}

describe('installable routing authority',()=>{
  it('requires frontier policy at all risks without changing qualification thresholds or binding lifetime',async()=>{
    const {parsePolicy}=await import('../../src/governance/policy.js');const policy=currentPolicy();
    expect(Object.values(policy.review).every((rule:any)=>rule.required&&rule.frontier)).toBe(true);expect(policy.qualification.minimum_tasks).toBe(20);expect(policy.binding.hard_expiry_hours).toBe(72);
    policy.review.medium.frontier=false;expect(()=>parsePolicy(policy)).toThrow('delegate requires frontier verification');
  });
  it('dispatches admitted provisional host aliases with unknown costs and mandatory frontier review',()=>{
    vi.useFakeTimers();vi.setSystemTime(new Date('2026-09-10T00:00:00Z'));const pack=provisionalPack(),route=pack.routes[0]!;
    expect(pack.routing_modes.full_project).toBe('decompose');expect(pack.missing_routes.some(r=>r.public_task_class==='full_project')).toBe(false);
    expect(route.ranking_basis.workers).toBe('task_evidence_then_prices_or_maintainer_order');expect(route.worker_decision.outcome).toBe('HOLD');
    const input={publicTaskClass:'mechanical_work' as const,stratumDigest:route.stratum_digest,now:'2026-09-10T01:00:00Z',host:{...host(pack,[...route.workers,...route.reviewers]),host:'codex' as const}};
    expect(resolveRouting(pack,input)).toMatchObject({worker:{evidence_tier:'provisional',effort:'not_applicable'},reviewer:{frontier:true,evidence_tier:'provisional'}});
    expect(()=>resolveRouting(pack,{...input,host:{...input.host,host:'claude'}})).toThrowError(expect.objectContaining({code:'NO_ELIGIBLE_WORKER'}));
    expect(()=>resolveRouting(pack,{...input,publicTaskClass:'full_project'})).toThrowError(expect.objectContaining({code:'DECOMPOSITION_REQUIRED'}));
  });
  it('keeps pack lifetime separate from treatment evidence, skips expired treatments and marks weekly staleness',()=>{
    vi.useFakeTimers();vi.setSystemTime(new Date('2026-09-10T00:00:00Z'));const entry=provisionalRoute();entry.workers=[provisionalCandidate('old',false,'2026-08-15T00:00:00Z'),provisionalCandidate('fresh')];
    const pack=compileRoutingPack({mode:'production',policy:currentPolicy(),strata:[],provisional:[entry]}),route=pack.routes[0]!;
    expect(pack.refresh_after).toBe('2026-09-17T00:00:00.000Z');expect(pack.expires_at).toBe('2026-10-10T00:00:00.000Z');expect(route.workers[0]!.expires_at).toBe('2026-09-14T00:00:00.000Z');
    const request={publicTaskClass:'mechanical_work' as const,stratumDigest:route.stratum_digest,now:'2026-09-18T00:00:00Z',host:{...host(pack,[...route.workers,...route.reviewers]),host:'codex' as const}};
    expect(resolveRouting(pack,request)).toMatchObject({worker:{candidate_id:'fresh'},stale:true});
  });
  it('rejects future publication, future evidence, observed identity mismatch and failed qualification relabeling',async()=>{
    vi.useFakeTimers();vi.setSystemTime(new Date('2026-09-10T00:00:00Z'));const {validateRoutingPackPublication}=await import('../../src/routing/index.js');
    const pack=provisionalPack();expect(()=>validateRoutingPackPublication(pack,'2026-09-09T23:00:00Z')).toThrowError(expect.objectContaining({code:'PACK_NOT_YET_VALID'}));expect(validateRoutingPackPublication(pack)).toEqual(pack);
    const compile=(entry:any)=>compileRoutingPack({mode:'production',policy:currentPolicy(),strata:[],provisional:[entry]});
    const future=provisionalRoute();future.workers[0]!.evidence.observed_at='2026-09-11T00:00:00Z';expect(()=>compile(future)).toThrowError(expect.objectContaining({code:'PROVISIONAL_EVIDENCE_FUTURE'}));
    const mismatched=provisionalRoute();mismatched.workers[0]!.evidence.observed_effort='high';expect(()=>compile(mismatched)).toThrow('observed treatment identity');
    const failed:any=provisionalRoute();failed.workers[0].evidence.qualification_failure='failed security check';expect(()=>compile(failed)).toThrow();
    const project={...provisionalRoute(),publicTaskClass:'full_project'};expect(()=>compile(project)).toThrowError(expect.objectContaining({code:'FULL_PROJECT_REQUIRES_DECOMPOSITION'}));
  });
  it('prefers available qualified treatments over provisional fallbacks without promoting bootstrap evidence',()=>{
    vi.useFakeTimers();vi.setSystemTime(new Date('2026-09-09T00:00:00Z'));const worker=production(),original=compileProduction(worker),governed=original.routes[0]!;
    const extra={...provisionalRoute(),publicTaskClass:'bounded_implementation' as const,requirements:governed.requirements,qualifiedStratumDigest:governed.stratum_digest};
    const pack=compileRoutingPack({mode:'production',policy:worker.policy,strata:[{publicTaskClass:'bounded_implementation',workerSelection:worker,reviewerSelection:reviewer(worker)}],provisional:[extra]}),route=pack.routes[0]!;
    const input={publicTaskClass:'bounded_implementation' as const,stratumDigest:route.stratum_digest,now:'2026-09-09T01:00:00Z',host:{...host(pack,[...route.workers,...route.reviewers]),host:'codex' as const}};
    expect(resolveRouting(pack,input).worker.evidence_tier).toBe('qualified');expect(resolveRouting(pack,{...input,failedCandidateIds:['candidate_alpha','candidate_beta']})).toMatchObject({worker:{evidence_tier:'provisional'},reviewer:{evidence_tier:'provisional'}});
  });
});

it('keeps requested effort reproducible when served effort is not observable',()=>{
  vi.useFakeTimers();vi.setSystemTime(new Date('2026-09-10T00:00:00Z'));
  const entry:any=provisionalRoute();entry.workers[0].effort='low';entry.workers[0].evidence.observed_effort=null;entry.workers[0].evidence.configured_effort='low';entry.workers[0].evidence.effort_source='requested_configuration';
  const pack=compileRoutingPack({mode:'production',policy:currentPolicy(),strata:[],provisional:[entry]});
  expect(pack.treatments[pack.routes[0]!.workers[0]!.candidate_identity]).toMatchObject({effort:'low',provisional:{observed_effort:null,configured_effort:'low',effort_source:'requested_configuration'}});
  entry.workers[0].evidence.control_limitations=[];expect(()=>compileRoutingPack({mode:'production',policy:currentPolicy(),strata:[],provisional:[entry]})).toThrow('unobserved effort requires');
});

function bootstrapGovernedCandidate(worker:any,candidateId:string){
  const candidate=worker.candidates.find((c:any)=>c.candidate_id===candidateId),record=worker.registry.records.find((r:any)=>r.record_id===candidate.provenance.model_record_id);
  const smoke:any=provisionalCandidate(candidateId,record.frontier===true);
  Object.assign(smoke,{provider:candidate.provider,model_id:candidate.model_id,snapshot_id:candidate.snapshot_id,effort:candidate.effort,serving:candidate.serving,material_serving_settings:candidate.material_serving_settings,family:record.family,capabilities:record.capabilities,context_window_tokens:record.context_window_tokens});
  Object.assign(smoke.evidence,{observed_model_id:candidate.snapshot_id,observed_effort:candidate.effort,identity_source:'runtime'});return smoke;
}
it('admits missing-evidence HOLD as provisional without crossing reviewer-lane exclusions',()=>{
  vi.useFakeTimers();vi.setSystemTime(new Date('2026-09-09T00:00:00Z'));const worker=production();
  const review=structuredClone(worker);review.request.role_id='reviewer';for(const row of review.observations){row.role_id='reviewer';row.content_digest=contentDigest(row);}
  worker.observations=worker.observations.filter((row:any)=>row.candidate.candidate_id!=='candidate_alpha');
  const strata=[{publicTaskClass:'bounded_implementation' as const,workerSelection:worker,reviewerSelection:review}],base=compileRoutingPack({mode:'production',policy:worker.policy,strata}),route=base.routes[0]!;
  expect(base.exclusions).toContainEqual(expect.objectContaining({candidate_id:'candidate_alpha',lane:'worker',status:'HOLD',rule_ids:expect.arrayContaining(['insufficient_tasks'])}));
  expect(base.exclusions).toContainEqual(expect.objectContaining({candidate_id:'candidate_alpha',lane:'reviewer',status:'EXCLUDED',rule_ids:['frontier_reviewer_required']}));
  const provisional={...provisionalRoute(),publicTaskClass:'bounded_implementation' as const,requirements:route.requirements,qualifiedStratumDigest:route.stratum_digest,workers:[bootstrapGovernedCandidate(worker,'candidate_alpha')]};
  const pack=compileRoutingPack({mode:'production',policy:worker.policy,strata,provisional:[provisional]});
  expect(pack.routes[0]!.workers).toContainEqual(expect.objectContaining({candidate_id:'candidate_alpha',evidence_tier:'provisional'}));
});
it('still rejects provisional relabeling of actual failures in the same stratum and lane',()=>{
  vi.useFakeTimers();vi.setSystemTime(new Date('2026-09-09T00:00:00Z'));const worker=production();worker.policy.qualification.maximum_cost_per_accepted_task_usd=0;
  const strata=[{publicTaskClass:'bounded_implementation' as const,workerSelection:worker,reviewerSelection:reviewer(worker)}],base=compileRoutingPack({mode:'production',policy:worker.policy,strata}),route=base.routes[0]!;
  expect(base.exclusions).toContainEqual(expect.objectContaining({candidate_id:'candidate_alpha',lane:'worker',status:'REJECT',rule_ids:expect.arrayContaining(['absolute_cost_ceiling'])}));
  const provisional={...provisionalRoute(),publicTaskClass:'bounded_implementation' as const,requirements:route.requirements,qualifiedStratumDigest:route.stratum_digest,workers:[bootstrapGovernedCandidate(worker,'candidate_alpha')]};
  expect(()=>compileRoutingPack({mode:'production',policy:worker.policy,strata,provisional:[provisional]})).toThrowError(expect.objectContaining({code:'FAILED_QUALIFICATION_CANNOT_BE_RELABELED'}));
});

it('selects frontier eligibility before reviewer cost ranking and retains eligible incumbents',()=>{
  const worker=fixture(),review=structuredClone(worker);review.request.role_id='reviewer';for(const row of review.observations){row.role_id='reviewer';row.content_digest=contentDigest(row);}
  const compile=(reviewerSelection:any)=>compileRoutingPack({mode:'simulation_test',generatedAt:worker.now,policy:worker.policy,strata:[{publicTaskClass:'bounded_implementation',workerSelection:worker,reviewerSelection}]});
  const initial=compile(review);expect(initial.routes[0]!.reviewer_decision).toMatchObject({outcome:'SELECT',selected_candidate_id:'candidate_beta'});expect(initial.routes[0]!.reviewers.map(r=>r.candidate_id)).toEqual(['candidate_beta']);
  const excluded=compile({...review,eligibleCandidateIds:['candidate_alpha']});expect(excluded.routes[0]!.reviewers).toEqual([]);
  review.incumbentCandidateId='candidate_beta';expect(compile(review).routes[0]!.reviewer_decision).toMatchObject({outcome:'RETAIN',selected_candidate_id:'candidate_beta'});
  review.incumbentCandidateId='candidate_alpha';const invalidIncumbent=compile(review);expect(invalidIncumbent.routes[0]!.reviewer_decision.outcome).toBe('ESCALATION_REQUIRED');expect(invalidIncumbent.routes[0]!.reviewers).toEqual([]);
});

it('enforces provider constraints on provisional admission and runtime intersection',()=>{
  vi.useFakeTimers();vi.setSystemTime(new Date('2026-09-09T00:00:00Z'));const worker=production();
  worker.request.constraints.requires_provider='openai';worker.request.constraints_digest=digest(worker.request.constraints);for(const row of worker.observations){row.constraints_digest=worker.request.constraints_digest;row.content_digest=contentDigest(row);}
  const strata=[{publicTaskClass:'bounded_implementation' as const,workerSelection:worker,reviewerSelection:reviewer(worker)}],base=compileRoutingPack({mode:'production',policy:worker.policy,strata}),route=base.routes[0]!;
  const extra:any={...provisionalRoute(),publicTaskClass:'bounded_implementation',requirements:route.requirements,qualifiedStratumDigest:route.stratum_digest};extra.workers[0].provider='anthropic';
  expect(()=>compileRoutingPack({mode:'production',policy:worker.policy,strata,provisional:[extra]})).toThrowError(expect.objectContaining({code:'PROVISIONAL_PROVIDER_CONSTRAINT'}));
  extra.workers[0].provider='openai';const pack=compileRoutingPack({mode:'production',policy:worker.policy,strata,provisional:[extra]});
  const constrained=pack.routes[0]!;for(const request of [constrained.stratum.worker_request,constrained.stratum.reviewer_request]){request.constraints.requires_provider='anthropic';request.constraints_digest=digest(request.constraints);}constrained.stratum_digest=digest(constrained.stratum);pack.content_digest=contentDigest(pack);
  expect(()=>resolveRouting(pack,{publicTaskClass:'bounded_implementation',stratumDigest:constrained.stratum_digest,now:'2026-09-09T01:00:00Z',host:{...host(pack,[...constrained.workers,...constrained.reviewers]),host:'codex'}})).toThrowError(expect.objectContaining({code:'NO_ELIGIBLE_WORKER'}));
});

it('requires frontier diagnosis and planning modes before hard-debugging and complex workers',()=>{
  vi.useFakeTimers();vi.setSystemTime(new Date('2026-09-09T00:00:00Z'));
  const pack=compileRoutingPack({mode:'production',policy:currentPolicy(),strata:[]});
  expect(pack.routing_modes).toMatchObject({hard_debugging:'frontier_diagnose_then_delegate',complex_implementation:'frontier_plan_then_delegate',bounded_implementation:'direct'});
  for(const [taskClass,oldMode] of [['hard_debugging','coherent_worker'],['complex_implementation','direct']] as const){
    const obsolete={...pack,routing_modes:{...pack.routing_modes,[taskClass]:oldMode}};obsolete.content_digest=contentDigest(obsolete);
    expect(()=>parseRoutingPack(obsolete)).toThrowError(expect.objectContaining({code:'PACK_MALFORMED'}));
  }
});


function rankedCandidate(id:string,role:'worker'|'reviewer',accepted:boolean,inputPrice:number|null,outputPrice:number|null,taskClass:'mechanical_work'|'bounded_implementation'='mechanical_work'):ProvisionalTreatmentInput{
  const candidate:ProvisionalTreatmentInput=provisionalCandidate(id,role==='reviewer');
  candidate.provider='anthropic';candidate.evidence.host='claude';
  candidate.evidence.availability.url='https://platform.claude.com/docs/en/models/overview';
  Object.assign(candidate.evidence.pricing,{url:'https://platform.claude.com/docs/en/about-claude/pricing',input_usd_per_million:inputPrice,output_usd_per_million:outputPrice,unknown_reason:inputPrice===null||outputPrice===null?'Unknown test fixture cost':null});
  candidate.evidence.task_evidence={public_task_class:taskClass,role,basis:accepted?'installed_acceptance':'smoke_extrapolation',host:'claude',candidate_identity:provisionalIdentity(candidate),source:{path:'data/routing/installed-acceptance.json',content_digest:digest('test acceptance source'),digest_encoding:'canonical_json_sha256'},records:accepted?[{case_id:`case_${id}`,case:taskClass==='mechanical_work'?'mechanical':'backend',record_digest:digest(id),observed_at:candidate.evidence.observed_at,host_version:'test-only',acceptance:'PASS',artifact_digests:{'fixture.mjs':digest('artifact')},trace_digests:[digest('trace')],receipt_digests:[digest('receipt')],recovery:null,browser:null}]:[],limitations:['Algorithm fixture only; not real model evaluation or qualification.']};
  return candidate;
}
function rankedPack(){
  return compileRoutingPack({mode:'production',policy:currentPolicy(),strata:[],provisional:[{...provisionalRoute(),workers:[rankedCandidate('haiku_smoke','worker',false,1,5),rankedCandidate('sonnet_accepted','worker',true,2,10)],reviewers:[rankedCandidate('frontier_smoke','reviewer',false,1,5),rankedCandidate('frontier_accepted','reviewer',true,5,25)]}]});
}
describe('provisional evidence before economics',()=>{
  it('places accepted Sonnet ahead of cheaper smoke Haiku and applies the same preference to reviewers and old packs',()=>{
    vi.useFakeTimers();vi.setSystemTime(new Date('2026-09-10T00:00:00Z'));const pack=rankedPack(),route=pack.routes[0]!;
    expect(route.workers.map(r=>r.candidate_id)).toEqual(['sonnet_accepted','haiku_smoke']);
    expect(route.reviewers.map(r=>r.candidate_id)).toEqual(['frontier_accepted','frontier_smoke']);
    expect(route.provisional_ranking_basis).toEqual({workers:'task_evidence_then_advertised_token_prices',reviewers:'task_evidence_then_advertised_token_prices'});
    // A formerly valid pack may still carry price-first order and old metadata.
    route.workers.reverse();route.reviewers.reverse();route.ranking_basis={workers:'advertised_token_prices',reviewers:'advertised_token_prices'};route.provisional_ranking_basis={workers:'advertised_token_prices',reviewers:'advertised_token_prices'};pack.content_digest=contentDigest(pack);
    const request={publicTaskClass:'mechanical_work' as const,stratumDigest:route.stratum_digest,now:'2026-09-10T01:00:00Z',host:{...host(pack,[...route.workers,...route.reviewers]),host:'claude' as const}};
    expect(resolveRouting(pack,request)).toMatchObject({worker:{candidate_id:'sonnet_accepted'},reviewer:{candidate_id:'frontier_accepted'},ranking_basis:{worker:'task_evidence_then_advertised_token_prices'}});
    expect(resolveRouting(pack,{...request,failedCandidateIds:['sonnet_accepted','frontier_accepted']})).toMatchObject({worker:{candidate_id:'haiku_smoke'},reviewer:{candidate_id:'frontier_smoke'}});
    const available=[...route.workers,...route.reviewers].filter(r=>r.candidate_id.endsWith('_smoke'));
    expect(resolveRouting(pack,{...request,host:{...host(pack,available),host:'claude'}})).toMatchObject({worker:{candidate_id:'haiku_smoke'},reviewer:{candidate_id:'frontier_smoke'}});
    for(const candidate of [...route.workers,...route.reviewers].filter(r=>r.candidate_id.endsWith('_accepted')))candidate.expires_at='2026-09-10T00:30:00Z';pack.content_digest=contentDigest(pack);
    expect(resolveRouting(pack,request)).toMatchObject({worker:{candidate_id:'haiku_smoke'},reviewer:{candidate_id:'frontier_smoke'}});
  });
  it.each(['unknown','crossing'] as const)('preserves maintainer order within each evidence level for %s prices',kind=>{
    vi.useFakeTimers();vi.setSystemTime(new Date('2026-09-10T00:00:00Z'));
    const rows=(role:'worker'|'reviewer')=>[rankedCandidate(`${role}_smoke_z`,role,false,kind==='unknown'?null:10,1),rankedCandidate(`${role}_accepted_z`,role,true,kind==='unknown'?null:20,2),rankedCandidate(`${role}_smoke_a`,role,false,1,10),rankedCandidate(`${role}_accepted_a`,role,true,2,20)];
    const pack=compileRoutingPack({mode:'production',policy:currentPolicy(),strata:[],provisional:[{...provisionalRoute(),workers:rows('worker'),reviewers:rows('reviewer')}]}),route=pack.routes[0]!;
    for(const [role,candidates] of [['worker',route.workers],['reviewer',route.reviewers]] as const)expect(candidates.map(c=>c.candidate_id)).toEqual([`${role}_accepted_z`,`${role}_accepted_a`,`${role}_smoke_z`,`${role}_smoke_a`]);
    expect(route.provisional_ranking_basis).toEqual({workers:'task_evidence_then_prices_or_maintainer_order',reviewers:'task_evidence_then_prices_or_maintainer_order'});
  });
  it('uses comparable prices within each evidence level only',()=>{
    vi.useFakeTimers();vi.setSystemTime(new Date('2026-09-10T00:00:00Z'));
    const rows=(role:'worker'|'reviewer')=>[rankedCandidate(`${role}_smoke_z`,role,false,10,50),rankedCandidate(`${role}_accepted_z`,role,true,20,100),rankedCandidate(`${role}_smoke_a`,role,false,1,5),rankedCandidate(`${role}_accepted_a`,role,true,2,10)];
    const pack=compileRoutingPack({mode:'production',policy:currentPolicy(),strata:[],provisional:[{...provisionalRoute(),workers:rows('worker'),reviewers:rows('reviewer')}]}),route=pack.routes[0]!;
    for(const [role,candidates] of [['worker',route.workers],['reviewer',route.reviewers]] as const)expect(candidates.map(c=>c.candidate_id)).toEqual([`${role}_accepted_a`,`${role}_accepted_z`,`${role}_smoke_a`,`${role}_smoke_z`]);
  });
  it('retains qualified incumbents ahead of accepted provisional fallbacks',()=>{
    vi.useFakeTimers();vi.setSystemTime(new Date('2026-09-09T00:00:00Z'));const worker=production();worker.incumbentCandidateId='candidate_beta';const base=compileProduction(worker),governed=base.routes[0]!;
    const extra={...provisionalRoute(),publicTaskClass:'bounded_implementation' as const,requirements:governed.requirements,qualifiedStratumDigest:governed.stratum_digest,workers:[rankedCandidate('accepted_worker','worker',true,0,0,'bounded_implementation')],reviewers:[rankedCandidate('accepted_reviewer','reviewer',true,0,0,'bounded_implementation')]};
    const pack=compileRoutingPack({mode:'production',policy:worker.policy,strata:[{publicTaskClass:'bounded_implementation',workerSelection:worker,reviewerSelection:reviewer(worker)}],provisional:[extra]}),route=pack.routes[0]!;
    expect(route.worker_decision.outcome).toBe('RETAIN');expect(route.workers.map(c=>c.candidate_id)).toEqual(['candidate_beta','candidate_alpha','accepted_worker']);
    const request={publicTaskClass:'bounded_implementation' as const,stratumDigest:route.stratum_digest,now:'2026-09-09T01:00:00Z',host:{...host(pack,[...route.workers,...route.reviewers]),host:'claude' as const}};
    expect(resolveRouting(pack,request)).toMatchObject({worker:{candidate_id:'candidate_beta',evidence_tier:'qualified'},reviewer:{candidate_id:'candidate_beta',evidence_tier:'qualified'}});
  });
});


describe('factored routing_pack.v3 wire format',()=>{
  it('stores shared metadata once while preserving route-specific evidence and resolution',()=>{
    vi.useFakeTimers();vi.setSystemTime(new Date('2026-09-10T00:00:00Z'));
    const first=provisionalRoute(),second={...provisionalRoute(),publicTaskClass:'repo_exploration' as const};
    const pack=compileRoutingPack({mode:'production',policy:currentPolicy(),strata:[],provisional:[first,second]});
    expect(pack.schema_version).toBe('routing_pack.v3');expect(Object.keys(pack.treatments)).toHaveLength(2);
    expect(pack.routes.flatMap(r=>[...r.workers,...r.reviewers])).toHaveLength(4);
    expect(pack.routes[0]!.workers[0]).not.toHaveProperty('model_id');
    const expanded=expandRoutingPack(JSON.parse(JSON.stringify(pack)));
    for(const route of expanded.routes){
      expect(route.workers[0]).toMatchObject({candidate_id:'cheap_alias',model_id:'cheap_alias',provisional:{host:'codex'}});
      const wireRoute=pack.routes.find(r=>r.stratum_digest===route.stratum_digest)!;
      expect(resolveRouting(pack,{publicTaskClass:route.public_task_class,stratumDigest:route.stratum_digest,now:'2026-09-10T01:00:00Z',host:{...host(pack,[...wireRoute.workers,...wireRoute.reviewers]),host:'codex'}}).worker).toEqual(route.workers[0]);
    }
    const installed=rankedPack();expect(installed.routes[0]!.workers[0]!.task_evidence?.basis).toBe('installed_acceptance');
    expect(Object.values(installed.treatments).every(t=>!t.provisional||!Object.hasOwn(t.provisional,'task_evidence'))).toBe(true);
    expect(Buffer.byteLength(JSON.stringify(pack))).toBeLessThan(Buffer.byteLength(JSON.stringify(expanded)));
  });
  it('rejects unresolved or altered treatment identities, metadata tampering, conflicts and old versions',()=>{
    vi.useFakeTimers();vi.setSystemTime(new Date('2026-09-10T00:00:00Z'));const pack=provisionalPack(),identity=pack.routes[0]!.workers[0]!.candidate_identity;
    const missing=structuredClone(pack);delete missing.treatments[identity];missing.content_digest=contentDigest(missing);expect(()=>parseRoutingPack(missing)).toThrow(/unresolved treatment reference/);
    const altered=structuredClone(pack);altered.treatments[identity]!.effort='high';altered.content_digest=contentDigest(altered);expect(()=>parseRoutingPack(altered)).toThrow(/candidate identity mismatch/);
    const changed=structuredClone(pack);changed.treatments[identity]!.family='changed';expect(()=>parseRoutingPack(changed)).toThrowError(expect.objectContaining({code:'PACK_TAMPERED'}));
    const conflict={...provisionalRoute(),publicTaskClass:'repo_exploration' as const};conflict.workers[0]!.evidence.control_limitations.push('A contradictory shared claim');
    expect(()=>compileRoutingPack({mode:'production',policy:currentPolicy(),strata:[],provisional:[provisionalRoute(),conflict]})).toThrowError(expect.objectContaining({code:'TREATMENT_METADATA_CONFLICT'}));
    expect(()=>parseRoutingPack({...pack,schema_version:'routing_pack.v2'})).toThrowError(expect.objectContaining({code:'PACK_VERSION_UNSUPPORTED'}));
  });
});


function subscriptionProduction(){
  const worker=production();worker.policy.policy_version=4;worker.policy.economics=currentPolicy().economics;worker.policy.review=currentPolicy().review;delete worker.policy.qualification.maximum_cost_per_accepted_task_usd;
  worker.request.execution_environment='codex';
  for(const row of worker.observations){
    const old=worker.runtimeReports[row.provenance.runtime_receipt_digest],report={...old,execution_environment:'codex'};
    const key=digest(report);worker.runtimeReports[key]=report;delete worker.runtimeReports[row.provenance.runtime_receipt_digest];row.provenance.runtime_receipt_digest=key;
    for(const attempt of row.attempts){attempt.cost_usd=null;attempt.cost_source='unknown';}row.content_digest=contentDigest(row);
  }
  worker.economics={schema_version:'economic_evidence.v1',pricing:[],tasks:[],maintainer_order:['candidate_beta','candidate_alpha']};return worker;
}
describe('v4 capability and native-host economics',()=>{
  it('routes qualified subscription evidence with unknown dollars in declared order and binds the native host',()=>{
    vi.useFakeTimers();vi.setSystemTime(new Date('2026-09-09T00:00:00Z'));const worker=subscriptionProduction(),review=structuredClone(worker);review.request.role_id='reviewer';
    for(const row of review.observations){row.role_id='reviewer';row.content_digest=contentDigest(row);}
    const pack=compileRoutingPack({mode:'production',policy:worker.policy,strata:[{publicTaskClass:'bounded_implementation',workerSelection:worker,reviewerSelection:review}]}),route=pack.routes[0]!;
    expect(route.workers.map(c=>c.candidate_id)).toEqual(['candidate_beta','candidate_alpha']);expect(route.ranking_basis.workers).toBe('maintainer_order');
    expect(route.workers[0]).toMatchObject({evidence_tier:'qualified',qualification:{metrics:{cost_per_accepted_task_usd:null,total_cost_usd:null}},economics:{evidence_level:'UNKNOWN',value_usd:null}});
    expect(route.reviewers.map(c=>c.candidate_id)).toEqual(['candidate_beta']);
    const input={publicTaskClass:'bounded_implementation' as const,stratumDigest:route.stratum_digest,now:'2026-09-09T01:00:00Z',host:{...host(pack,[...route.workers,...route.reviewers]),host:'codex' as const}};
    expect(resolveRouting(pack,input)).toMatchObject({worker:{candidate_id:'candidate_beta'},ranking_basis:{worker:'maintainer_order'}});
    expect(()=>resolveRouting(pack,{...input,host:{...input.host,host:'claude'}})).toThrowError(expect.objectContaining({code:'NO_ELIGIBLE_WORKER'}));
    worker.request.execution_environment='api';review.request.execution_environment='api';
    expect(()=>compileRoutingPack({mode:'production',policy:worker.policy,strata:[{publicTaskClass:'bounded_implementation',workerSelection:worker,reviewerSelection:review}]})).toThrowError(expect.objectContaining({code:'PORTABLE_NATIVE_EXECUTION_REQUIRED'}));
  });
  it('does not restore economically excluded capability-qualified candidates to fallback ladders',()=>{
    vi.useFakeTimers();vi.setSystemTime(new Date('2026-09-09T00:00:00Z'));const worker=subscriptionProduction();worker.request.max_cost_usd=1;
    const review=structuredClone(worker);review.request.role_id='reviewer';for(const row of review.observations){row.role_id='reviewer';row.content_digest=contentDigest(row);}
    const pack=compileRoutingPack({mode:'production',policy:worker.policy,strata:[{publicTaskClass:'bounded_implementation',workerSelection:worker,reviewerSelection:review}]});
    expect(pack.routes[0]!.workers).toEqual([]);expect(pack.routes[0]!.worker_decision.rule_ids).toContain('no_economically_eligible_candidate');
    expect(pack.exclusions).toEqual(expect.arrayContaining([expect.objectContaining({lane:'worker',status:'EXCLUDED',rule_ids:['economic_explicit_ceiling_unverified']})]));
  });
});


it('does not let unmeasured provisional fallback bypass an explicit task dollar ceiling',()=>{
  vi.useFakeTimers();vi.setSystemTime(new Date('2026-09-09T00:00:00Z'));const worker=production();worker.request.max_cost_usd=1;
  const strata=[{publicTaskClass:'bounded_implementation' as const,workerSelection:worker,reviewerSelection:reviewer(worker)}],base=compileRoutingPack({mode:'production',policy:worker.policy,strata}),route=base.routes[0]!;
  const extra={...provisionalRoute(),publicTaskClass:'bounded_implementation' as const,requirements:route.requirements,qualifiedStratumDigest:route.stratum_digest};
  expect(()=>compileRoutingPack({mode:'production',policy:worker.policy,strata,provisional:[extra]})).toThrowError(expect.objectContaining({code:'PROVISIONAL_EXPLICIT_COST_CEILING_UNVERIFIED'}));
  const pack=provisionalPack(),provisional=pack.routes[0]!;
  for(const request of [provisional.stratum.worker_request,provisional.stratum.reviewer_request])request.max_cost_usd=1;
  provisional.stratum_digest=digest(provisional.stratum);pack.content_digest=contentDigest(pack);
  expect(()=>resolveRouting(pack,{publicTaskClass:'mechanical_work',stratumDigest:provisional.stratum_digest,now:'2026-09-09T01:00:00Z',host:{...host(pack,[...provisional.workers,...provisional.reviewers]),host:'codex'}})).toThrowError(expect.objectContaining({code:'NO_ELIGIBLE_WORKER'}));
  // Schema-defined null means no explicit dollar ceiling, not a zero budget.
  for(const request of [provisional.stratum.worker_request,provisional.stratum.reviewer_request]){delete request.max_cost_usd;request.constraints.max_cost_usd=null;request.constraints_digest=digest(request.constraints);}
  provisional.stratum_digest=digest(provisional.stratum);pack.content_digest=contentDigest(pack);
  expect(resolveRouting(pack,{publicTaskClass:'mechanical_work',stratumDigest:provisional.stratum_digest,now:'2026-09-09T01:00:00Z',host:{...host(pack,[...provisional.workers,...provisional.reviewers]),host:'codex'}}).worker.evidence_tier).toBe('provisional');
});

describe('local routing preferences preserve governed boundaries',()=>{
 function localFixture(){
  vi.useFakeTimers();vi.setSystemTime(new Date('2026-09-10T00:00:00Z'));
  const entry=provisionalRoute();entry.workers=[provisionalCandidate('baseline'),provisionalCandidate('preferred')];
  const pack=compileRoutingPack({mode:'production',policy:currentPolicy(),strata:[],provisional:[entry]}),route=pack.routes[0]!;
  const input={publicTaskClass:'mechanical_work' as const,stratumDigest:route.stratum_digest,now:'2026-09-10T01:00:00Z',host:{...host(pack,[...route.workers,...route.reviewers]),host:'codex' as const}};
  const preference={pack_content_digest:pack.content_digest,stratum_digest:route.stratum_digest,host:'codex' as const,preferred_worker_identity:route.workers[1]!.candidate_identity};
  return {pack,route,input,preference};
 }
 it('changes only the worker within an available provisional evidence group',()=>{
  const {pack,input,preference}=localFixture(),before=structuredClone(pack),baseline=resolveRouting(pack,input),preferred=resolveRouting(pack,{...input,localPreferences:preference});
  expect(baseline.worker.candidate_id).toBe('baseline');expect(preferred.worker.candidate_id).toBe('preferred');
  expect(preferred.reviewer).toEqual(baseline.reviewer);expect(preferred.route).toEqual(baseline.route);
  expect(preferred.ranking_basis.worker).toBe('local_preference_within_task_evidence');expect(pack).toEqual(before);
 });
 it.each(['pack','stratum','host','unavailable','failed','effort','identity'] as const)('ignores %s advice and returns the exact baseline result',kind=>{
  const {pack,input,preference}=localFixture();
  if(kind==='pack')preference.pack_content_digest=digest('other pack');
  if(kind==='stratum')preference.stratum_digest=digest('other stratum');
  if(kind==='host')Object.assign(preference,{host:'claude'});
  if(kind==='unavailable')input.host.treatments=input.host.treatments.filter(t=>t.model_id!=='preferred');
  if(kind==='effort')input.host.treatments.find(t=>t.model_id==='preferred')!.effort='high';
  if(kind==='identity')preference.preferred_worker_identity=digest('invented');
  const request={...input,...(kind==='failed'?{failedCandidateIds:['preferred']}:{})};
  expect(resolveRouting(pack,{...request,localPreferences:preference})).toEqual(resolveRouting(pack,request));
 });
 it('cannot revive an expired preferred candidate',()=>{
  const {input}=localFixture(),entry=provisionalRoute();entry.workers=[provisionalCandidate('baseline'),provisionalCandidate('old',false,'2026-08-15T00:00:00Z')];
  const pack=compileRoutingPack({mode:'production',policy:currentPolicy(),strata:[],provisional:[entry]}),route=pack.routes[0]!;
  const request={...input,stratumDigest:route.stratum_digest,now:'2026-09-18T00:00:00Z',host:{...host(pack,[...route.workers,...route.reviewers]),host:'codex' as const}};
  expect(resolveRouting(pack,{...request,localPreferences:{pack_content_digest:pack.content_digest,stratum_digest:route.stratum_digest,host:'codex',preferred_worker_identity:route.workers[1]!.candidate_identity}})).toEqual(resolveRouting(pack,request));
 });
 it('does not replace a qualified incumbent',()=>{
  vi.useFakeTimers();vi.setSystemTime(new Date('2026-09-09T00:00:00Z'));
  const pack=compileProduction(),route=pack.routes[0]!,input={publicTaskClass:'bounded_implementation' as const,stratumDigest:route.stratum_digest,now:'2026-09-09T01:00:00Z',host:{...host(pack,[...route.workers,...route.reviewers]),host:'codex' as const}};
  expect(resolveRouting(pack,{...input,localPreferences:{pack_content_digest:pack.content_digest,stratum_digest:route.stratum_digest,host:'codex',preferred_worker_identity:route.workers[1]!.candidate_identity}})).toEqual(resolveRouting(pack,input));
 });
 it('cannot cross installed-acceptance and smoke-extrapolation task evidence',()=>{
  const pack=parseRoutingPack(JSON.parse(readFileSync('skills/delegate/routing-pack.json','utf8'))),route=pack.routes.find(r=>r.public_task_class==='mechanical_work'&&r.workers.some(w=>w.task_evidence?.host==='codex'))!;
  const input={publicTaskClass:'mechanical_work' as const,stratumDigest:route.stratum_digest,now:pack.generated_at,host:{...host(pack,[...route.workers,...route.reviewers]),host:'codex' as const}},baseline=resolveRouting(pack,input);
  const extrapolated=route.workers.find(w=>w.task_evidence?.basis==='smoke_extrapolation')!;
  expect(baseline.worker.provisional?.task_evidence?.basis).toBe('installed_acceptance');
  expect(resolveRouting(pack,{...input,localPreferences:{pack_content_digest:pack.content_digest,stratum_digest:route.stratum_digest,host:'codex',preferred_worker_identity:extrapolated.candidate_identity}})).toEqual(baseline);
 });
 it('does not switch reviewers to accommodate a preferred worker',()=>{
  localFixture();const policy=currentPolicy();policy.review.low.different_model=true;
  const entry=provisionalRoute();entry.workers=[provisionalCandidate('baseline'),provisionalCandidate('frontier_alias',true)];entry.reviewers=[provisionalCandidate('frontier_alias',true),provisionalCandidate('second_frontier',true)];
  const pack=compileRoutingPack({mode:'production',policy,strata:[],provisional:[entry]}),route=pack.routes[0]!;
  const input={publicTaskClass:'mechanical_work' as const,stratumDigest:route.stratum_digest,now:pack.generated_at,host:{...host(pack,[...route.workers,...route.reviewers]),host:'codex' as const}},baseline=resolveRouting(pack,input);
  expect(baseline.reviewer.candidate_id).toBe('frontier_alias');
  expect(resolveRouting(pack,{...input,localPreferences:{pack_content_digest:pack.content_digest,stratum_digest:route.stratum_digest,host:'codex',preferred_worker_identity:route.workers[1]!.candidate_identity}})).toEqual(baseline);
 });
});
