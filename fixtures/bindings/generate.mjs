// Explicitly synthetic policy examples, never native performance evidence.
import {readFileSync,writeFileSync} from 'node:fs';
import {parseModelRegistry,parseCandidate,parseConstraintSet,parseTaskObservation,candidateIdentity} from '../../dist/schema/index.js';
import {digest,contentDigest,hashBytes} from '../../dist/core/canonical.js';
import {parseSelectionInput,createBinding} from '../../dist/governance/index.js';
const now='2026-09-09T00:00:00.000Z';
const zero='sha256:'+ '0'.repeat(64);
const policy=JSON.parse(readFileSync('policy/simulation-v1.json','utf8'));
const registry=parseModelRegistry({schema_version:'model_registry.v1',registry_id:'fixture_registry',content_digest:zero,retrieved_at:now,records:['alpha','beta'].map((name,i)=>({schema_version:'model_record.v1',record_id:'record_'+name,provider:'synthetic',model_id:'fixture-'+name,snapshot_id:'fixture-'+name,family:'family_'+name,capabilities:['terminal','local_execution'],frontier:i===1,lifecycle:'available',content_digest:zero,aliases:[name],supported_efforts:['low','high'],supported_serving_settings:{fallback:['disabled'],tool_use:['host_tools'],json_schema:[true]},material_serving_settings:['fallback','tool_use','json_schema'],context_window_tokens:100000,pinning:{verified:true,immutable_snapshot:true,source:'synthetic_fixture',retrieved_at:now,evidence_digest:zero}}))});
for(const r of registry.records)r.content_digest=contentDigest(r);
registry.content_digest=contentDigest(registry);
const candidates=registry.records.map((r,i)=>parseCandidate({schema_version:'candidate.v1',candidate_id:i?'candidate_beta':'candidate_alpha',provider:r.provider,model_id:r.model_id,snapshot_id:r.snapshot_id,effort:'low',serving:{fallback:'disabled',tool_use:'host_tools',json_schema:true},material_serving_settings:r.material_serving_settings,provenance:{registry_id:registry.registry_id,model_record_id:r.record_id,registry_content_digest:registry.content_digest}}));
const constraints=parseConstraintSet({schema_version:'constraint_set.v1',constraint_id:'fixture_constraints',version:1,allowed_tools:['terminal'],required_tools:['terminal'],forbidden_paths:[],requires_fresh_context:false,requires_local_execution:false});
function selection(taskClass='bounded_backend'){
 const sources={};const add=s=>{const d=hashBytes(s);sources[d]=s;return d};
 const observations=candidates.flatMap((candidate,ci)=>Array.from({length:20},(_,i)=>{
  const row=parseTaskObservation({schema_version:'task_observation.v1',observation_id:`observation_${ci}_${i}`,content_digest:zero,lane:'synthetic_policy_test',candidate:{candidate_id:candidate.candidate_id,candidate_identity:candidateIdentity(candidate)},task_id:`fixture_task_${i}`,fixture_digest:add(`synthetic task ${i}`),cohort_id:'fixture_cohort',role_id:'implementer',task_class_id:taskClass,risk:'low',constraints_digest:digest(constraints),suite_id:taskClass,suite_version:1,harness_version:'1',grader_version:'1',measured_at:now,passed:true,accepted:true,latency_ms:100,attempts:[{attempt_id:`attempt_${ci}_${i}`,kind:'worker',cost_usd:ci?.03:.01,cost_source:'measured',latency_ms:100}],provenance:{source:'synthetic_fixture',source_digest:add(`synthetic result ${ci}/${i}`),artifact_digest:add(`synthetic artifact ${ci}/${i}`),runtime_receipt_digest:null}});row.content_digest=contentDigest(row);return row;
 }));
 return {policy,registry,candidates,observations,request:{role_id:'implementer',task_class_id:taskClass,risk:'low',cohort_id:'fixture_cohort',constraints_digest:digest(constraints),constraints},mode:'simulation',now,sources,runtimeReports:{}};
}
const baseline=selection();
const envelope=s=>({binding:createBinding(parseSelectionInput(s)),selection:s});
const manifest={schema_version:'binding_fixture_manifest.v1',synthetic:true,valid:[],invalid:[]};
const write=(name,value,expected)=>{const file=`fixtures/bindings/${name}.json`;writeFileSync(file,JSON.stringify(value,null,2)+'\n');(expected?manifest.invalid:manifest.valid).push({file,...(expected?{expected_rule_id:expected}:{})});};
write('valid-initial-backend',envelope(baseline));write('valid-initial-debugging',envelope(selection('hard_debugging')));write('valid-retained-incumbent',envelope({...baseline,incumbentCandidateId:'candidate_beta'}));
const bad=[
 ['policy-digest',e=>{e.binding.policy_digest=zero;e.binding.decision.policy_digest=zero},'binding_policy_mismatch'],
 ['schema-digest',e=>e.binding.schema_digest=zero,'binding_schema_digest_mismatch'],
 ['evidence-digest',e=>{e.binding.evidence_digest=zero;e.binding.decision.evidence_digest=zero},'binding_recomputation_mismatch'],
 ['candidate-set-digest',e=>{e.binding.candidate_set_digest=zero;e.binding.decision.candidate_set_digest=zero},'binding_recomputation_mismatch'],
 ['false-selected-candidate',e=>{e.binding.candidate=e.selection.candidates[1];e.binding.decision.selected_candidate_id=e.binding.candidate.candidate_id},'binding_recomputation_mismatch'],
 ['invented-rules',e=>e.binding.decision.rule_ids=['invented_rule'],'binding_recomputation_mismatch'],
 ['production-simulation',e=>e.selection.mode='production','binding_mode_mismatch'],
 ['hard-expiry',e=>e.selection.now='2026-09-13T00:00:00.000Z','binding_expired'],
 ['future',e=>e.selection.now='2026-09-08T00:00:00.000Z','binding_from_future'],
 ['wrong-role',e=>e.binding.role_id='researcher','binding_request_mismatch'],
 ['extended-expiry',e=>e.binding.hard_expiry_at='2026-10-01T00:00:00.000Z','binding_recomputation_mismatch'],
 ['tampered-observation',e=>e.selection.observations[0].accepted=false,'binding_recomputation_mismatch'],
 ];
for(const [name,mutate,rule]of bad){const e=structuredClone(envelope(baseline));mutate(e);write('invalid-'+name,e,rule);}
writeFileSync('fixtures/bindings/manifest.json',JSON.stringify(manifest,null,2)+'\n');
