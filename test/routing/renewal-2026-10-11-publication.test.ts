import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {digest,hashBytes} from '../../src/core/canonical.js';
import {parseRoutingPack,assertEntriesOutlivePack} from '../../src/routing/contracts.js';
import {requireFrontierRefresh} from '../../src/routing/frontier-refresh.js';
import {reviewerCalibrationGate} from '../../src/routing/reviewer-calibration.js';

const read=(path:string)=>JSON.parse(readFileSync(path,'utf8'));
const renewedAfter=Date.parse('2026-10-11T00:00:00Z');
const index=read('docs/evidence/delegate-renewal-2026-10-11/evidence.json');
const pack=parseRoutingPack(read('skills/delegate/routing-pack.json'));
const observations=read('data/routing/host-observations.json');
const legacy=/claude-opus-5"|claude-sonnet-5"|claude-haiku-4-5|gpt-5\.5|"gpt-6-sol"/;

describe('2026-10-11 model-currency renewal publication',()=>{
 it('archives the nine October inputs byte-identically before replacing them',()=>{
  const record=read('data/routing/archive/2026-10-09/preservation.json');
  expect(record).toMatchObject({schema_version:'frontier_historical_preservation.v1',source_revision:'f8166d2',status:'preserved'});
  expect(record.files).toHaveLength(9);
  for(const file of record.files)expect(hashBytes(readFileSync(file.archived_path))).toBe(file.content_digest);
  expect(hashBytes(readFileSync('data/routing/archive/2026-10-09/preservation.json'))).toBe(index.archive.digest);
 });

 it('re-observes every treatment on the current Claude 5.5 and GPT-6.1 Sol lineup',()=>{
  const old=read('data/routing/archive/2026-10-09/host-observations.json');
  const models=(host:string)=>observations.treatments.filter((t:any)=>t.evidence.host===host).map((t:any)=>`${t.model_id}/${t.effort}`).sort();
  expect(models('codex')).toEqual(['gpt-6-astra/high','gpt-6-luna/low','gpt-6.1-sol/low']);
  expect(models('claude')).toEqual(['claude-haiku-5-5/not_applicable','claude-opus-5-5/high','claude-sonnet-5-5/low']);
  expect(JSON.stringify(observations.treatments.map((t:any)=>[t.model_id,t.evidence.observed_model_id]))).not.toMatch(legacy);
  for(const t of observations.treatments){
   for(const date of [t.evidence.observed_at,t.evidence.availability.checked_at,t.evidence.pricing.checked_at])expect(Date.parse(date)).toBeGreaterThanOrEqual(renewedAfter);
   expect(old.treatments.some((p:any)=>p.evidence.smoke.execution_digest===t.evidence.smoke.execution_digest)).toBe(false);
  }
  const haiku=observations.treatments.find((t:any)=>t.model_id==='claude-haiku-5-5');
  expect(haiku.evidence.control_limitations.some((s:string)=>s.startsWith('Haiku 5.5 supports adaptive-thinking effort'))).toBe(true);
  expect(observations.treatments.filter((t:any)=>t.frontier).map((t:any)=>t.candidate_id).sort()).toEqual(['claude-claude-opus-5-5-high','codex-gpt-6-astra-high']);
  const audit=read('data/routing/medium-smoke-audit.json');
  expect(audit).toMatchObject({schema_version:'medium_smoke_audit.v1',source_digest:digest(observations),scope:'Zero/nullish quantity-default fixes in local plain JavaScript only.'});
  expect(new Set(audit.reviews.map((r:any)=>r.reviewer_execution_digest)).size).toBe(2);
 });

 it('binds a fresh reviewed probe of each current frontier',()=>{
  const targets=read('data/routing/frontier-targets.json'),probes=read('data/routing/frontier-probes.json'),evidence=read('data/routing/frontier-identity-evidence.json');
  expect(targets.targets.map((t:any)=>t.model_id).sort()).toEqual(['claude-fable-5-1','gpt-6-astra']);
  expect(Date.parse(targets.discovered_at)).toBeGreaterThanOrEqual(renewedAfter);
  const reviews=read('data/routing/frontier-probe-reviews.json').reviews;
  expect(reviews).toHaveLength(1);expect(digest(reviews[0].bound)).toBe(reviews[0].bound_digest);
  expect(reviews[0].review_artifact.reviewer).toMatchObject({configured_model:'claude-opus-5-5',observed_models:['claude-opus-5-5']});
  for(const probe of probes.probes)expect(probe.evaluation).toMatchObject({status:'passed',review_digest:reviews[0].bound_digest});
  const now=new Date(Math.max(...probes.probes.map((p:any)=>Date.parse(p.attempted_at)))+1000).toISOString();
  expect(()=>requireFrontierRefresh(targets,probes,now,7,evidence)).not.toThrow();
 });

 it('admits only the recalibrated Fable reviewer, restricted to mechanical low',()=>{
  const admissions=read('data/routing/reviewer-calibration/admissions.json').admissions;
  expect(admissions.map((a:any)=>a.host)).toEqual(['claude']);
  const admission=read('data/routing/reviewer-calibration/claude.json');
  expect(digest(admission.report)).toBe(admissions[0].report_digest);
  expect(reviewerCalibrationGate(admission.report.manifest,admission.report.rows,admission.report.target).admitted).toBe(true);
  expect(Date.parse(admission.treatment.evidence.observed_at)).toBeGreaterThanOrEqual(renewedAfter);
  const routes=pack.routes.filter(r=>r.reviewers.some(t=>t.candidate_id===admission.treatment.candidate_id));
  expect(routes.map(r=>[r.public_task_class,r.stratum.worker_request.risk])).toEqual([['mechanical_work','low']]);
  expect(pack.routes.some(r=>r.workers.some(t=>t.candidate_id===admission.treatment.candidate_id))).toBe(false);
 });

 it('routes only current models and outlives the previous pack',()=>{
  expect(Object.values(pack.treatments).map(t=>`${t.model_id}/${t.effort}`).sort()).toEqual(['claude-fable-5-1/high','claude-haiku-5-5/not_applicable','claude-opus-5-5/high','claude-sonnet-5-5/low','gpt-6-astra/high','gpt-6-luna/low','gpt-6.1-sol/low']);
  expect(pack.routes).toHaveLength(15);
  expect(pack.routes.filter(r=>r.stratum.worker_request.risk==='medium').map(r=>r.public_task_class)).toEqual(['mechanical_work']);
  expect(pack.routes.some(r=>r.public_task_class==='full_project')).toBe(false);
  const entries=pack.routes.flatMap(r=>[...r.workers,...r.reviewers]);
  expect(entries.every(e=>e.evidence_tier==='provisional')).toBe(true);
  for(const e of entries)expect(Date.parse(e.expires_at)).toBeGreaterThanOrEqual(Date.parse(pack.generated_at)+29*86400000);
  expect(Date.parse(pack.expires_at)).toBeGreaterThan(Date.parse('2026-11-09T00:25:04.355Z'));
  expect(()=>assertEntriesOutlivePack(pack,24)).not.toThrow();
 });

 it('publishes only maintainer-reviewed passing cases and reconciles the bounded budget',()=>{
  const acceptance=read('data/routing/installed-acceptance.json');
  expect(index.cases).toHaveLength(14);
  expect(acceptance.cases.map((c:any)=>c.id).sort()).toEqual([...index.accepted_case_ids].sort());
  for(const c of acceptance.cases){
   const row=index.cases.find((r:any)=>r.run_id===c.id);
   expect(row.verdict).toBe('PASS');expect(c.result_digest).toBe(row.result.digest);expect(c.trace_digests).toContain(row.trace.digest);
   expect(c.copied_skill_digest).toBe(index.folder_freeze.skill_folder_digest);expect(c.receipt_count).toBeGreaterThan(0);
  }
  expect(acceptance.host_versions).toEqual({claude:'2.1.296 (Claude Code)',codex:'codex-cli 0.162.1'});
  expect(index.budget.ceiling).toBe(62);expect(index.budget.reserved).toBe(0);expect(index.budget.halted).toBe(false);
  expect(index.budget.executions).toBeLessThanOrEqual(index.budget.ceiling);
  expect(index.execution_index.reduce((n:number,e:any)=>n+e.executions,0)).toBe(index.budget.executions);
 });
});
