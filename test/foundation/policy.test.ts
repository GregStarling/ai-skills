import {readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
import {parsePolicy,loadPolicy,classifyRisk,policyDigest} from '../../src/governance/index.js';
const policy=()=>loadPolicy('policy/constitution.json');
describe('human policy',()=>{
 it('keeps candidate/model identities out of a bounded versioned taxonomy',()=>{
  const p=policy();expect(p.task_classes.length).toBeLessThanOrEqual(8);expect(p.task_classes).toHaveLength(2);
  for(const c of p.task_classes){expect(c.eval_bucket.fixture_ids.length).toBeGreaterThan(0);for(const id of c.eval_bucket.fixture_ids)expect(JSON.parse(readFileSync(`fixtures/policy/${id}.json`,'utf8')).synthetic).toBe(true);}
  expect(JSON.stringify(p)).not.toMatch(/model_id|candidate_id|snapshot_id/);expect(p.provenance.status).toBe('proposed');
  expect(policyDigest(p)).toMatch(/^sha256:/);
 });
 it.each(['empty-bucket','ninth-class','unknown-class','invented-score','critical-weakened'])( 'rejects %s',kind=>{
  const p=structuredClone(policy());
  if(kind==='empty-bucket')p.task_classes[0]!.eval_bucket.fixture_ids=[];
  if(kind==='ninth-class')p.task_classes=Array.from({length:9},(_,i)=>({...p.task_classes[0]!,task_class_id:`class_${i}`}));
  if(kind==='unknown-class')p.roles[0]!.task_class_ids=['unknown'];
  if(kind==='invented-score')Object.assign(p,{confidence:.95});
  if(kind==='critical-weakened')p.review.critical.fresh_context=false;
  expect(()=>parsePolicy(p)).toThrow();
 });
 it('takes max of observable pre and post risk, and refuses unknown signals',()=>{
  expect(classifyRisk({policy:policy(),taskClassId:'bounded_backend',preSignals:[],postSignals:['authentication']}).risk).toBe('high');
  expect(classifyRisk({policy:policy(),taskClassId:'bounded_backend',preSignals:['secrets'],postSignals:[]}).risk).toBe('critical');
  expect(()=>classifyRisk({policy:policy(),taskClassId:'bounded_backend',preSignals:['looks_safe'],postSignals:[]})).toThrow('unknown_risk_signal');
 });
});
