import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {digest,hashBytes} from '../../src/core/canonical.js';
import {requireFrontierRefresh} from '../../src/routing/frontier-refresh.js';
import {reviewerCalibrationGate} from '../../src/routing/reviewer-calibration.js';

const read=(path:string)=>JSON.parse(readFileSync(path,'utf8'));
// The 2026-10-11 renewal archived these canonical inputs and replaced the pack; resolve the October copies.
const moved=new Map<string,string>(read('data/routing/archive/2026-10-09/preservation.json').files.map((f:any)=>[f.original_path,f.archived_path]));
const located=(path:string)=>moved.get(path)??path;
const renewedAfter=Date.parse('2026-10-09T00:00:00Z');
const index=read('docs/evidence/delegate-renewal-2026-10-09/evidence.json');
const observations=read(located('data/routing/host-observations.json'));

describe('October 2026 renewal publication',()=>{
 it('archives the ten September inputs byte-identically before replacing them',()=>{
  const record=read('data/routing/archive/2026-09-11/preservation.json');
  expect(record).toMatchObject({schema_version:'frontier_historical_preservation.v1',source_revision:'fc1f985',status:'preserved'});
  expect(record.files).toHaveLength(10);
  for(const file of record.files)expect(hashBytes(readFileSync(file.archived_path))).toBe(file.content_digest);
  expect(hashBytes(readFileSync('data/routing/archive/2026-09-11/preservation.json'))).toBe(index.archive.digest);
 });

 it('replaces retired Codex treatments and renews every citation with fresh smoke executions',()=>{
  const old=read('data/routing/archive/2026-09-11/host-observations.json');
  expect(observations.treatments).toHaveLength(6);
  const models=(host:string,source:any)=>source.treatments.filter((t:any)=>t.evidence.host===host).map((t:any)=>`${t.model_id}/${t.effort}`).sort();
  expect(models('codex',observations)).toEqual(['gpt-6-astra/high','gpt-6-luna/low','gpt-6-sol/low']);
  expect(models('claude',observations)).toEqual(models('claude',old));
  expect(JSON.stringify(observations)).not.toMatch(/gpt-5\.5|codex-spark/);
  for(const t of observations.treatments){
   for(const date of [t.evidence.observed_at,t.evidence.availability.checked_at,t.evidence.pricing.checked_at])expect(Date.parse(date)).toBeGreaterThanOrEqual(renewedAfter);
   expect(old.treatments.some((p:any)=>p.evidence.smoke.execution_digest===t.evidence.smoke.execution_digest)).toBe(false);
  }
  expect(observations.treatments.filter((t:any)=>t.frontier).map((t:any)=>t.candidate_id).sort()).toEqual(['claude-claude-opus-5-high','codex-gpt-6-astra-high']);
  const audit=read(located('data/routing/medium-smoke-audit.json'));
  expect(audit).toMatchObject({schema_version:'medium_smoke_audit.v1',source_digest:digest(observations),scope:'Zero/nullish quantity-default fixes in local plain JavaScript only.'});
  expect(new Set(audit.reviews.map((r:any)=>r.reviewer_execution_digest)).size).toBe(2);
 });

 it('binds a fresh reviewed probe of each current frontier',()=>{
  const targets=read(located('data/routing/frontier-targets.json')),probes=read(located('data/routing/frontier-probes.json')),evidence=read(located('data/routing/frontier-identity-evidence.json'));
  expect(targets.targets.map((t:any)=>t.model_id).sort()).toEqual(['claude-fable-5-1','gpt-6-astra']);
  const reviews=read(located('data/routing/frontier-probe-reviews.json')).reviews;
  expect(reviews).toHaveLength(1);expect(digest(reviews[0].bound)).toBe(reviews[0].bound_digest);
  for(const probe of probes.probes)expect(probe.evaluation).toMatchObject({status:'passed',review_digest:reviews[0].bound_digest});
  const now=new Date(Math.max(...probes.probes.map((p:any)=>Date.parse(p.attempted_at)))+1000).toISOString();
  expect(()=>requireFrontierRefresh(targets,probes,now,7,evidence)).not.toThrow();
 });

 it('admits only the recalibrated Fable reviewer, restricted to mechanical low',()=>{
  const admissions=read(located('data/routing/reviewer-calibration/admissions.json')).admissions;
  expect(admissions.map((a:any)=>a.host)).toEqual(['claude']);
  const admission=read(located('data/routing/reviewer-calibration/claude.json'));
  expect(digest(admission.report)).toBe(admissions[0].report_digest);
  expect(reviewerCalibrationGate(admission.report.manifest,admission.report.rows,admission.report.target).admitted).toBe(true);
  expect(Date.parse(admission.treatment.evidence.observed_at)).toBeGreaterThanOrEqual(renewedAfter);
  expect(admission).toMatchObject({role:'reviewer',public_task_classes:['mechanical_work'],risk:'low'});
 });

 it('publishes only maintainer-reviewed passing cases and reconciles the bounded budget',()=>{
  const acceptance=read(located('data/routing/installed-acceptance.json'));
  expect(index.cases).toHaveLength(14);
  expect(acceptance.cases.map((c:any)=>c.id).sort()).toEqual([...index.accepted_case_ids].sort());
  for(const c of acceptance.cases){
   const row=index.cases.find((r:any)=>r.run_id===c.id);
   expect(row.verdict).toBe('PASS');expect(c.result_digest).toBe(row.result.digest);expect(c.trace_digests).toContain(row.trace.digest);
   expect(c.copied_skill_digest).toBe(index.folder_freeze.skill_folder_digest);expect(c.receipt_count).toBeGreaterThan(0);
  }
  expect(acceptance.host_versions).toEqual({claude:'2.1.292 (Claude Code)',codex:'codex-cli 0.156.1'});
  expect(index.budget.ceiling).toBe(62);expect(index.budget.reserved).toBe(0);expect(index.budget.halted).toBe(false);
  expect(index.budget.executions).toBeLessThanOrEqual(index.budget.ceiling);
  expect(index.execution_index.reduce((n:number,e:any)=>n+e.executions,0)).toBe(index.budget.executions);
 });
});
