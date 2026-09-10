import {afterEach,expect,it} from 'vitest';
import {mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createBinding,parseSelectionInput,select} from '../../src/governance/index.js';
import {renderCodex,writeRendered,verifyRendered,readNativeConfiguration} from '../../src/adapters/index.js';
import {canonicalJson,contentDigest,digest,hashBytes} from '../../src/core/canonical.js';
import {parseEvidenceRecord,type TaskObservation} from '../../src/schema/index.js';
import {Ledger} from '../../src/ledger/index.js';
import {validateEvidenceLedger} from '../../src/evidence/index.js';
const roots:string[]=[];afterEach(()=>{for(const root of roots.splice(0))rmSync(root,{recursive:true,force:true});});
const fixture=()=>JSON.parse(readFileSync('fixtures/bindings/valid-initial-backend.json','utf8'));

it('AC-022 AC-023: changed Codex binding changes native identity and invalid versions/drift never replace it',()=>{
 const raw=fixture(),selection=parseSelectionInput(raw.selection);
 const input={binding:raw.binding,selection,mode:'adapter-test' as const,runtimeVersion:'0.142.5',outputSchema:{type:'object'}};
 const first=renderCodex(input),beta=selection.candidates[1]!;
 const changedSelection={...selection,candidates:[beta],observations:selection.observations.filter(row=>row.candidate.candidate_id===beta.candidate_id)};
 const second=renderCodex({...input,binding:createBinding(changedSelection),selection:changedSelection});
 expect(first.manifest.binding_digest).not.toBe(second.manifest.binding_digest);expect(first.files[first.manifest.native_config_path]).not.toBe(second.files[second.manifest.native_config_path]);
 const root=mkdtempSync(join(tmpdir(),'governor-codex-contract-'));roots.push(root);writeRendered(root,first);
 expect(readNativeConfiguration(root,first).model).toBe(raw.binding.candidate.model_id);
 expect(()=>renderCodex({...input,runtimeVersion:'0.0.0'})).toThrow(/VERSION/);
 writeFileSync(join(root,first.manifest.native_config_path),'model = "unbound"');expect(()=>verifyRendered(root,first)).toThrow(/DRIFT/);
});

it('AC-030: exact nineteen percent accepted-task cost increase fails declared fifteen percent ceiling despite measured superiority',()=>{
 const input=parseSelectionInput(fixture().selection),observations:TaskObservation[]=[],sources=new Map(input.sources);
 for(let candidate=0;candidate<2;candidate++)for(let task=0;task<600;task++){
  const row=structuredClone(input.observations[candidate*20+task%20]!);row.observation_id=`boundary_${candidate}_${task}`;row.task_id=`boundary_task_${task}`;
  const bytes=`synthetic independent boundary task ${task}`;row.fixture_digest=hashBytes(bytes);sources.set(row.fixture_digest,bytes);
  row.passed=candidate===1||task%10!==0;row.accepted=row.passed;row.attempts[0]!.attempt_id=`boundary_attempt_${candidate}_${task}`;
  row.attempts[0]!.cost_usd=candidate===0?.009:.0119;row.content_digest=contentDigest(row);observations.push(row);
 }
 expect(input.policy.promotion.maximum_cost_increase).toBe(.15);
 const expensive=select({...input,observations,sources,incumbentCandidateId:'candidate_alpha'});expect(expensive.decision.outcome).toBe('RETAIN');
 const costs=expensive.qualifications.map(q=>q.metrics.cost_per_accepted_task_usd!);expect(costs[1]!/costs[0]!-1).toBeCloseTo(.19,12);
 for(const row of observations.filter(row=>row.candidate.candidate_id==='candidate_beta')){row.attempts[0]!.cost_usd=.0114;row.content_digest=contentDigest(row);}
 expect(select({...input,observations,sources,incumbentCandidateId:'candidate_alpha'}).decision.outcome).toBe('PROMOTE');
});

it('AC-034: benchmark methodology revisions remain separate immutable observations; incomplete metadata and marketing-only qualification fail',async()=>{
 const input=parseSelectionInput(fixture().selection),candidate=input.observations[0]!.candidate;
 const directory=mkdtempSync(join(tmpdir(),'governor-benchmark-history-'));roots.push(directory);const ledger=new Ledger(directory),sources=new Map<string,string>();
 const policyBefore=readFileSync('policy/constitution.json','utf8');
 const revisions=['method_a','method_b'].map((method,index)=>{
  const source=canonicalJson({purpose:'synthetic algorithm test only',method,value:index+1});sources.set(hashBytes(source),source);
  const row={schema_version:'evidence_record.v1',evidence_id:`benchmark_${method}`,content_digest:'',evidence_type:'external_benchmark',lane:'synthetic_policy_test',candidate,source_name:'fixture_source',benchmark_name:'fixture_benchmark',benchmark_version:`version_${index+1}`,dataset_version:`dataset_${index+1}`,methodology_version:method,metric:{metric_name:'accuracy',value:index+1,scale:'declared synthetic test points',higher_is_better:true},measured_at:input.now,retrieved_at:input.now,source_url:`https://example.test/${method}`,source_digest:hashBytes(source)};
  row.content_digest=contentDigest(row);return parseEvidenceRecord(row);
 });
 for(const row of revisions)await ledger.append({id:row.evidence_id,provenance:{source:'synthetic benchmark history test',observed_at:input.now,methodology:row.evidence_type==='external_benchmark'?row.methodology_version:'invalid'},payload:row});
 expect(await ledger.list()).toHaveLength(2);expect((await ledger.get(revisions[0]!.evidence_id))?.payload).toEqual(revisions[0]);
 const body={schema_version:'evidence_ledger.v1',ledger_id:'benchmark_history',content_digest:'',created_at:input.now,records:revisions};body.content_digest=contentDigest(body);expect(validateEvidenceLedger(body,sources).records).toHaveLength(2);
 const incomplete={...revisions[0],methodology_version:undefined};expect(()=>parseEvidenceRecord(incomplete)).toThrow();
 expect(select({...input,observations:[]}).selected).toBeNull();
 expect(readFileSync('policy/constitution.json','utf8')).toBe(policyBefore);
 expect(digest(revisions[0])).not.toBe(digest(revisions[1]));
});
