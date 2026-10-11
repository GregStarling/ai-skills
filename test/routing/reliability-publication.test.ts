import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {describe,it,expect} from 'vitest';
import {hashBytes} from '../../src/core/canonical.js';
const read=(p:string)=>JSON.parse(readFileSync(p,'utf8'));
const index=read('docs/evidence/delegate-reliability-followup-2026-09-11/evidence.json');
const archived='data/routing/archive/2026-09-11-pre-reliability';
// The October renewal archived these canonical inputs and replaced the pack; resolve the September copies.
const moved=new Map<string,string>(read('data/routing/archive/2026-09-11/preservation.json').files.map((f:any)=>[f.original_path,f.archived_path]));
const located=(path:string)=>moved.get(path)??path;
const acceptance=read(located('data/routing/installed-acceptance.json'));

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
  for(const id of index.original_failed_case_ids)expect(acceptance.cases.some((c:any)=>c.id===id)).toBe(false);
  expect(index.cases[0].browser.image_read_tool_ids).toHaveLength(2);
  expect(index.cases[0].browser.viewports.map((v:any)=>v.width)).toEqual([320,1280]);
  expect(index.cases[1].worker_count).toBe(2);
  expect(index.cases[2].native_sessions).toHaveLength(2);
 });
 it('retained routing scope and preserves all other evidence inputs',()=>{
  // The published pack has since been renewed; the index records its own before/after scope.
  expect(index.route_scope_before).toHaveLength(15);expect(index.route_scope_after).toEqual(index.route_scope_before);
  for(const file of index.preserved_files.filter((r:any)=>!r.path.startsWith('artifacts/')))expect(hashBytes(readFileSync(located(file.path)))).toBe(file.digest);
  expect(hashBytes(readFileSync(located('data/routing/installed-acceptance.json')))).toBe(index.current.acceptance.digest);
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
