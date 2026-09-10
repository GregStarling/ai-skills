import {readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
import {parsePolicy,loadPolicy,classifyRisk,policyDigest} from '../../src/governance/index.js';
import {hashBytes} from '../../src/core/canonical.js';
const policy=()=>loadPolicy('policy/constitution.json');
describe('human policy',()=>{
 it('keeps candidate/model identities out of a bounded versioned taxonomy',()=>{
  const p=policy();expect(p.task_classes.length).toBeLessThanOrEqual(8);expect(p.task_classes).toHaveLength(2);
  for(const c of p.task_classes){expect(c.eval_bucket.fixture_ids.length).toBeGreaterThan(0);for(const id of c.eval_bucket.fixture_ids){const folder=id.replaceAll('_','-');const manifest=JSON.parse(readFileSync(`fixtures/harvested/${folder}/manifest.json`,'utf8'));expect(manifest.task_class_id).toBe(c.task_class_id);expect(manifest.performance_evidence).toBe(false);expect(manifest.harness_version).toBe(c.eval_bucket.harness_version);}}
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
 it('preserves exact v4 bytes and every empirical, review and economic threshold under v5',()=>{
  expect(hashBytes(readFileSync('policy/constitution-v4.json'))).toBe('sha256:2f2ba7be3d18392f1dc3f97015d8e8c21ed24bd242e1bbe03e614cb5eebaa051');
  const old=loadPolicy('policy/constitution-v4.json'),current=policy();
  expect(old.policy_version).toBe(4);expect(current.policy_version).toBe(5);
  for(const key of ['roles','task_classes','risk_signals','review','qualification','economics','promotion','shadow','binding','routing_pack'] as const)expect(current[key]).toEqual(old[key]);
  expect(current.identity_assurance!.minimum_by_risk).toEqual({low:'CONFIGURATION_ATTESTED',medium:'CONFIGURATION_ATTESTED',high:'RUNTIME_ATTESTED',critical:'RUNTIME_ATTESTED'});
 });
 it.each(['missing-v5-assurance','historical-relabel','unverified-floor','high-weakened','critical-weakened'])('rejects invalid identity risk policy: %s',kind=>{
  const p=structuredClone(policy());
  if(kind==='missing-v5-assurance')delete p.identity_assurance;
  if(kind==='historical-relabel')p.policy_version=4;
  if(kind==='unverified-floor')Object.assign(p.identity_assurance!.minimum_by_risk,{low:'UNVERIFIED'});
  if(kind==='high-weakened')p.identity_assurance!.minimum_by_risk.high='CONFIGURATION_ATTESTED';
  if(kind==='critical-weakened')p.identity_assurance!.minimum_by_risk.critical='PARTIALLY_RUNTIME_ATTESTED';
  expect(()=>parsePolicy(p)).toThrow();
 });
});
