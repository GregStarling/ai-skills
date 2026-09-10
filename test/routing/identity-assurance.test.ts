import {afterEach,expect,it,vi} from 'vitest';
import {nativeV5} from '../helpers/v5.js';
import {contentDigest,digest} from '../../src/core/canonical.js';
import {createBinding,validateBinding} from '../../src/governance/index.js';
import {compileRoutingPack,parseRoutingPack,resolveRouting} from '../../src/routing/index.js';

afterEach(()=>vi.useRealTimers());
function authority(){
 const fixture=nativeV5(),{input}=fixture;
 input.economics={schema_version:'economic_evidence.v1',pricing:[],tasks:[],maintainer_order:input.candidates.map(c=>c.candidate_id)};
 const reviewer=structuredClone(input);reviewer.request.role_id='reviewer';
 reviewer.observations=reviewer.observations.map(row=>({...row,role_id:'reviewer',content_digest:''}));
 for(const row of reviewer.observations)row.content_digest=contentDigest(row);
 const wire=(value:typeof input)=>({...value,sources:Object.fromEntries(value.sources!),runtimeReports:Object.fromEntries(value.runtimeReports!)});
 vi.useFakeTimers();vi.setSystemTime(new Date(input.now));
 const pack=compileRoutingPack({mode:'production',policy:input.policy,strata:[{publicTaskClass:'bounded_implementation',workerSelection:wire(input),reviewerSelection:wire(reviewer)}]});
 return {...fixture,pack};
}
it('binds derived configuration assurance, and rejects a caller-upgraded binding',()=>{
 const {input}=authority(),binding=createBinding(input);
 expect(binding.identity_assurance?.overall).toBe('CONFIGURATION_ATTESTED');
 expect(validateBinding(binding,input).ok).toBe(true);
 binding.identity_assurance!.overall='RUNTIME_ATTESTED';binding.identity_assurance!.model.assurance='runtime_attested';binding.identity_assurance!.effort.assurance='runtime_attested';
 expect(validateBinding(binding,input).ok).toBe(false);
});
it('compiles compact assurance from actual derivation and refuses mismatched rehashed route claims',()=>{
 const {pack}=authority();
 expect(pack.routes[0]!.workers).toHaveLength(2);
 expect(pack.routes[0]!.workers[0]!.qualification?.identity_assurance?.overall).toBe('CONFIGURATION_ATTESTED');
 const changed=structuredClone(pack);const q=changed.routes[0]!.workers[0]!.qualification!;
 q.identity_assurance!.execution_environment='api';
 q.qualification_digest=digest({candidate_identity:changed.routes[0]!.workers[0]!.candidate_identity,metrics:q.metrics,evidence_digest:q.evidence_digest,identity_assurance:q.identity_assurance});changed.content_digest=contentDigest(changed);
 expect(()=>parseRoutingPack(changed)).toThrow();
});
it('current availability and stronger contradictions override historical configuration assurance',()=>{
 const {input,pack}=authority(),route=pack.routes[0]!;
 const host={host:'codex' as const,treatments:input.candidates.map(c=>({provider:c.provider,model_id:c.model_id,snapshot_id:c.snapshot_id,effort:c.effort,serving:c.serving})),tools:['terminal'],capabilities:['terminal'],context_window_tokens:100000,supports_fresh_context:true};
 const request={publicTaskClass:'bounded_implementation' as const,stratumDigest:route.stratum_digest,now:input.now,host};
 expect(resolveRouting(pack,request).worker.candidate_id).toBe('candidate_alpha');
 for(const mutation of [{observed_model_id:'gpt-5.6-luna'},{observed_effort:'low'},{substitution_observed:true}]){
   expect(resolveRouting(pack,{...request,host:{...host,treatments:host.treatments.map((t,i)=>i===0?{...t,...mutation}:t)}}).worker.candidate_id).toBe('candidate_beta');
 }
 expect(()=>resolveRouting(pack,{...request,host:{...host,treatments:host.treatments.map(t=>({...t,effort:'low'}))}})).toThrow();
});
