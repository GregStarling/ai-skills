import {readFileSync} from 'node:fs';
import {describe,it,expect,vi,afterEach} from 'vitest';
import {contentDigest,digest,hashBytes} from '../../src/core/canonical.js';
import {candidateIdentity,parseRuntimeReport} from '../../src/schema/index.js';
import {compileRoutingPack,parseRoutingPack,resolveRouting,RoutingError,type RoutingPack} from '../../src/routing/index.js';

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
function host(pack:RoutingPack,candidates=pack.routes[0]!.workers){return {treatments:candidates.map(c=>({provider:c.provider,model_id:c.model_id,snapshot_id:c.snapshot_id,effort:c.effort,serving:c.serving})),tools:['terminal'],capabilities:['terminal'],context_window_tokens:100000,supports_fresh_context:true};}
afterEach(()=>vi.useRealTimers());

describe('portable routing pack',()=>{
  it('compiles existing fixture evidence only as an explicit simulation and keeps all missing classes honest',()=>{
    const worker=fixture(),pack=compileRoutingPack({mode:'simulation_test',generatedAt:worker.now,policy:worker.policy,strata:[{publicTaskClass:'bounded_implementation',workerSelection:worker,reviewerSelection:reviewer(worker)}]});
    expect(pack.mode).toBe('simulation_test');expect(pack.routes[0]!.workers.map(x=>x.candidate_id)).toEqual(['candidate_alpha','candidate_beta']);expect(pack.routes[0]!.reviewers.map(x=>x.candidate_id)).toEqual(['candidate_beta']);
    expect(pack.missing_routes).toHaveLength(7);expect(()=>resolveRouting(pack,{publicTaskClass:'bounded_implementation',stratumDigest:pack.routes[0]!.stratum_digest,now:worker.now,host:host(pack)})).toThrowError(expect.objectContaining({code:'PACK_NOT_PRODUCTION'}));
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
    expect(pack.routes).toEqual([]);expect(pack.missing_routes).toHaveLength(8);expect(parseRoutingPack(pack)).toEqual(pack);
  });
});
