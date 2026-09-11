import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {digest,hashBytes} from '../../src/core/canonical.js';
import {parseRoutingPack,assertEntriesOutlivePack} from '../../src/routing/contracts.js';
import {reviewerCalibrationGate} from '../../src/routing/reviewer-calibration.js';

const read=(path:string)=>JSON.parse(readFileSync(path,'utf8'));
const renewedAfter=Date.parse('2026-09-11T00:00:00Z');

describe('September renewal publication',()=>{
 it('preserves the eight original inputs byte-identically',()=>{
  const record=read('data/routing/archive/2026-09-10/preservation.json');
  expect(record).toMatchObject({schema_version:'frontier_historical_preservation.v1',source_revision:'a7966cc',status:'preserved'});
  expect(record.files).toHaveLength(8);
  for(const file of record.files)expect(hashBytes(readFileSync(file.archived_path))).toBe(file.content_digest);
 });

 it('renews every treatment citation and binds a fresh medium review audit',()=>{
  const observations=read('data/routing/host-observations.json');
  const old=read('data/routing/archive/2026-09-10/host-observations.json');
  expect(observations.treatments).toHaveLength(6);
  for(const t of observations.treatments){
   const previous=old.treatments.find((p:any)=>p.candidate_id===t.candidate_id);
   for(const date of [t.evidence.observed_at,t.evidence.availability.checked_at,t.evidence.pricing.checked_at])expect(Date.parse(date)).toBeGreaterThanOrEqual(renewedAfter);
   expect(t.evidence.smoke.execution_digest).not.toBe(previous.evidence.smoke.execution_digest);
  }
  const audit=read('data/routing/medium-smoke-audit.json');
  expect(audit).toMatchObject({schema_version:'medium_smoke_audit.v1',source_digest:digest(observations),scope:'Zero/nullish quantity-default fixes in local plain JavaScript only.'});
  expect(audit.reviews).toHaveLength(2);
  expect(new Set(audit.reviews.map((r:any)=>r.reviewer_execution_digest)).size).toBe(2);
 });

 it('retains v3 and existing scope with no qualified entries and at least 29 days per entry',()=>{
  const pack=parseRoutingPack(read('skills/delegate/routing-pack.json'));
  expect(pack.schema_version).toBe('routing_pack.v3');
  expect(pack.routes).toHaveLength(15);
  expect(pack.routes.filter(r=>r.stratum.worker_request.risk==='medium').map(r=>r.public_task_class)).toEqual(['mechanical_work']);
  expect(pack.routes.some(r=>r.stratum.worker_request.risk==='high'||r.stratum.worker_request.risk==='critical')).toBe(false);
  for(const entry of pack.routes.flatMap(r=>[...r.workers,...r.reviewers])){
   expect(entry.evidence_tier).not.toBe('qualified');
   expect(Date.parse(entry.expires_at)).toBeGreaterThanOrEqual(Date.parse(pack.generated_at)+29*86400000);
  }
  expect(()=>assertEntriesOutlivePack(pack,24)).not.toThrow();
 });

 it('publishes only reviewed completed cases while retaining every attempted case in the index',()=>{
  const index=read('docs/evidence/delegate-renewal-2026-09-11/evidence.json');
  const acceptance=read('data/routing/archive/2026-09-11-pre-reliability/installed-acceptance.json');
  expect(index.cases).toHaveLength(14);
  expect(acceptance.cases.map((c:any)=>c.id).sort()).toEqual(index.cases.filter((c:any)=>c.verdict==='PASS').map((c:any)=>c.run_id).sort());
  for(const id of ['renewal-installed-claude-ui','renewal-installed-codex-multicomponent']){
   expect(acceptance.cases.some((c:any)=>c.id===id)).toBe(false);
   expect(index.cases.find((c:any)=>c.run_id===id).verdict).toBe('INCOMPLETE');
  }
  for(const c of acceptance.cases){
   const indexed=index.cases.find((r:any)=>r.run_id===c.id);
   expect(c.result_digest).toBe(indexed.result.digest);
   expect(c.trace_digests).toContain(indexed.trace.digest);
   expect(c.receipt_count).toBeGreaterThan(0);
  }
  expect(index.budget.reserved).toBe(0);
  expect(index.budget.executions).toBeLessThanOrEqual(index.budget.ceiling);
  expect(index.execution_index.reduce((n:number,e:any)=>n+e.executions,0)).toBe(index.budget.executions);
 });

 it('rederives each admitted reviewer calibration and restricts it to mechanical low',()=>{
  const index=read('data/routing/reviewer-calibration/admissions.json');
  const pack=parseRoutingPack(read('skills/delegate/routing-pack.json'));
  expect(index.admissions.map((a:any)=>a.host).sort()).toEqual(['claude','codex']);
  for(const row of index.admissions){
   const admission=read(`data/routing/reviewer-calibration/${row.host}.json`),report=admission.report;
   expect(digest(report)).toBe(row.report_digest);
   expect(reviewerCalibrationGate(report.manifest,report.rows,report.target).admitted).toBe(true);
   const routes=pack.routes.filter(r=>r.reviewers.some(t=>t.candidate_id===admission.treatment.candidate_id));
   expect(routes.map(r=>[r.public_task_class,r.stratum.worker_request.risk])).toEqual([['mechanical_work','low']]);
   expect(pack.routes.some(r=>r.workers.some(t=>t.candidate_id===admission.treatment.candidate_id))).toBe(false);
  }
 });
});
