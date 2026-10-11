import {readFileSync,readdirSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

const read=(path:string)=>JSON.parse(readFileSync(path,'utf8'));
// Scripts the routing-pack renewal flow runs; their model defaults must name current evidence.
const scripts=['scripts/verify/host-evidence.mjs','scripts/verify/installed-delegate.mjs','scripts/verify/completion-campaign.mjs','scripts/verify/direct-vs-delegated.mjs','scripts/evaluate-frontier-reviewers.mjs','scripts/review-frontier-probes.mjs','scripts/verify/assemble-evidence.mjs'];

describe('maintainer model defaults',()=>{
 it('name only models with current host observations, admissions or frontier targets',()=>{
  const current=new Set([
   ...read('data/routing/host-observations.json').treatments.map((t:any)=>t.model_id),
   read('data/routing/reviewer-calibration/claude.json').treatment.model_id,
   ...read('data/routing/frontier-targets.json').targets.map((t:any)=>t.model_id),
  ]);
  const used=scripts.flatMap(path=>[...readFileSync(path,'utf8').matchAll(/'(claude-[a-z]+-\d[a-z0-9-]*|gpt-\d[a-z0-9.-]*)'/g)].map(m=>({path,model:m[1]})));
  expect(used.length).toBeGreaterThan(0);
  expect(used.filter(u=>!current.has(u.model))).toEqual([]);
 });
 it('lets consumer guidance name only routed models or the documented GPT-6.1 Sol fallback',()=>{
  const routed=new Set(Object.values(read('skills/delegate/routing-pack.json').treatments).map((t:any)=>t.model_id));
  const skill=readFileSync('skills/delegate/SKILL.md','utf8');
  const fallback=skill.match(/Where GPT-6\.1 Sol is not enabled for the account, coordinate on `(gpt-[^`]+)`/)?.[1];
  expect(fallback).toBe('gpt-6-sol');
  const docs=(readdirSync('skills/delegate',{recursive:true}) as string[]).filter(p=>p.endsWith('.md'));
  const named=docs.flatMap(path=>[...readFileSync(`skills/delegate/${path}`,'utf8').matchAll(/(claude-[a-z]+-\d[a-z0-9-]*|gpt-\d[a-z0-9.-]*)/g)].map(m=>({path,model:m[1]})));
  expect(named.length).toBeGreaterThan(0);
  expect(named.filter(n=>!routed.has(n.model)&&n.model!==fallback)).toEqual([]);
 });
});
