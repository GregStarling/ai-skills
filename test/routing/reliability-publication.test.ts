import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {describe,it,expect} from 'vitest';
import {digest,hashBytes} from '../../src/core/canonical.js';
import {parseRoutingPack,assertEntriesOutlivePack} from '../../src/routing/contracts.js';
const read=(p:string)=>JSON.parse(readFileSync(p,'utf8'));
const index=read('docs/evidence/delegate-reliability-followup-2026-09-11/evidence.json');
const archived='data/routing/archive/2026-09-11-pre-reliability';
const acceptance=read('data/routing/installed-acceptance.json');
const pack=parseRoutingPack(read('skills/delegate/routing-pack.json'));
const scope=(p:any)=>p.routes.map((r:any)=>({public_task_class:r.public_task_class,stratum:r.stratum,review_rule:r.review_rule,workers:r.workers.map((e:any)=>e.candidate_identity).sort(),reviewers:r.reviewers.map((e:any)=>e.candidate_identity).sort()})).sort((a:any,b:any)=>JSON.stringify(a.stratum).localeCompare(JSON.stringify(b.stratum)));

describe('reliability follow-up publication',()=>{
 it('archives the previous acceptance bytes and preserves its eleven records verbatim',()=>{
  const preservation=read(archived+'/preservation.json'),bytes=readFileSync(archived+'/installed-acceptance.json'),old=JSON.parse(bytes.toString());
  expect(hashBytes(bytes)).toBe(preservation.content_digest);
  expect(createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex')).toBe(preservation.git_blob);
  expect(old.cases).toHaveLength(11);expect(acceptance.cases).toHaveLength(14);
  expect(acceptance.cases.slice(0,11)).toEqual(old.cases);
  expect(acceptance.host_versions).toEqual(old.host_versions);
  expect(new Set(acceptance.cases.map((c:any)=>c.id)).size).toBe(14);
 });
 it('binds three fresh passing records and excludes every original failure',()=>{
  expect(index.cases.map((c:any)=>c.run_id)).toEqual(['reliability-claude-ui','reliability-claude-fullproject','reliability-codex-multicomponent']);
  expect(acceptance.cases.slice(11).map((c:any)=>c.id)).toEqual(index.cases.map((c:any)=>c.run_id));
  for(const row of index.cases){
   const c=acceptance.cases.find((c:any)=>c.id===row.run_id);
   expect(c).toMatchObject({acceptance:'PASS',external_grader_passed:true,result_digest:row.result.digest,copied_skill_digest:index.freeze.skill_folder_digest,recovery:null});
   expect(c.trace_digests).toContain(row.trace.digest);expect(c.receipt_digests).toEqual(row.receipt_digests);expect(c.artifact_digests).toEqual(row.artifact_digests);expect(c.receipt_count).toBeGreaterThan(0);
   expect(row.verdict).toBe('PASS');expect(row.failed_launches).toBe(0);expect(row.attempts).toHaveLength(row.executions);
  }
  const bindings=pack.routes.flatMap(r=>[...r.workers,...r.reviewers].flatMap(t=>t.task_evidence?.records??[]));
  for(const id of ['reliability-claude-ui','reliability-codex-multicomponent']){
   const c=acceptance.cases.find((c:any)=>c.id===id),rows=bindings.filter(r=>r.case_id===id);expect(rows.length).toBeGreaterThan(0);expect(rows.every(r=>r.record_digest===digest(c))).toBe(true);
  }
  for(const id of index.original_failed_case_ids){expect(acceptance.cases.some((c:any)=>c.id===id)).toBe(false);expect(bindings.some(r=>r.case_id===id)).toBe(false);}
  expect(index.cases[0].browser.image_read_tool_ids).toHaveLength(2);
  expect(index.cases[0].browser.viewports.map((v:any)=>v.width)).toEqual([320,1280]);
  expect(index.cases[1].worker_count).toBe(2);expect(bindings.some(r=>r.case_id==='reliability-claude-fullproject')).toBe(false);
  expect(index.cases[2].native_sessions).toHaveLength(2);
 });
 it('retains routing and admissions scope and preserves all other evidence inputs',()=>{
  expect(pack.routes).toHaveLength(15);expect(scope(pack)).toEqual(index.route_scope_before);expect(scope(pack)).toEqual(index.route_scope_after);
  expect(pack.routes.filter(r=>r.stratum.worker_request.risk==='medium').map(r=>r.public_task_class)).toEqual(['mechanical_work']);
  expect(pack.routes.some(r=>r.public_task_class==='full_project')).toBe(false);
  expect(pack.routes.flatMap(r=>[...r.workers,...r.reviewers]).every(e=>e.evidence_tier==='provisional')).toBe(true);
  for(const file of index.preserved_files.filter((r:any)=>!r.path.startsWith('artifacts/')))expect(hashBytes(readFileSync(file.path))).toBe(file.digest);
  expect(()=>assertEntriesOutlivePack(pack,24)).not.toThrow();expect(pack.content_digest).toBe(index.current.pack_content_digest);
  expect(hashBytes(readFileSync('data/routing/installed-acceptance.json'))).toBe(index.current.acceptance.digest);
 });
 it('keeps follow-up and cumulative execution counts bounded and reconciled',()=>{
  expect(index.budget.ceiling).toBe(17);expect(index.budget.reserved).toBe(0);expect(index.budget.halted).toBe(false);
  expect(index.execution_index.reduce((n:number,e:any)=>n+e.executions,0)).toBe(index.budget.executions);
  expect(index.cumulative_executions).toBe(101+index.budget.executions);expect(index.cumulative_executions).toBeLessThanOrEqual(118);
  expect(index.remaining_followup_executions).toBe(17-index.budget.executions);
  expect(index.cases.reduce((n:number,c:any)=>n+c.executions,0)).toBe(7);
  const originals=read('docs/evidence/delegate-renewal-2026-09-11/evidence.json');expect(originals.budget.executions).toBe(101);
 });
});
