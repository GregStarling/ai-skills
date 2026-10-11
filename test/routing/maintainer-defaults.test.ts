import {readFileSync} from 'node:fs';
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
});
