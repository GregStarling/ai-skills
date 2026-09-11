import {readFileSync} from 'node:fs';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {digest} from '../../src/core/canonical.js';
import {buildProvisionalPilotRoutes} from '../../src/routing/acceptance.js';
import {compileRoutingPack} from '../../src/routing/compiler.js';
import {provisionalTreatmentSchema} from '../../src/routing/provisional.js';

const fixtures=()=>({observations:JSON.parse(readFileSync('data/routing/archive/2026-09-10/host-observations.json','utf8')),acceptance:JSON.parse(readFileSync('data/routing/archive/2026-09-10/installed-acceptance.json','utf8'))});
const route=(routes:ReturnType<typeof buildProvisionalPilotRoutes>,host:string,task:string)=>routes.find(r=>r.publicTaskClass===task&&r.workers[0]!.evidence.host===host)!;
beforeEach(()=>{vi.useFakeTimers();vi.setSystemTime(new Date('2026-09-10T04:00:00Z'));});
afterEach(()=>vi.useRealTimers());

describe('installed acceptance joins',()=>{
  it('joins actual class, host, treatment and role while keeping unsupported fallbacks explicit',()=>{
    const {observations,acceptance}=fixtures(),routes=buildProvisionalPilotRoutes(observations,acceptance);
    expect(routes).toHaveLength(14);
    expect(routes.some(r=>r.publicTaskClass==='full_project')).toBe(false);
    for(const host of ['codex','claude'])for(const task of ['mechanical_work','bounded_implementation','ui_implementation','hard_debugging','complex_implementation']){
      const r=route(routes,host,task);
      expect(r.workers.some(t=>t.evidence.task_evidence?.basis==='installed_acceptance')).toBe(true);
      expect(r.reviewers.every(t=>t.evidence.task_evidence?.basis==='installed_acceptance')).toBe(true);
      for(const t of [...r.workers,...r.reviewers]){
        const original=observations.treatments.find((o:any)=>o.candidate_id===t.candidate_id);
        expect({...t.evidence,task_evidence:undefined}).toEqual({...original.evidence,task_evidence:undefined});
        expect(t.evidence.task_evidence?.source.content_digest).toBe(digest(acceptance));
        for(const record of t.evidence.task_evidence!.records){
          const source=acceptance.cases.find((c:any)=>c.id===record.case_id);
          expect(record.record_digest).toBe(digest(source));
          expect(record.observed_at).toBe(source.original_attempt.started_at);
          expect(record.case).not.toBe('fullproject');
        }
      }
    }
    const codexBackend=route(routes,'codex','bounded_implementation');
    expect(codexBackend.workers.find(t=>t.model_id==='gpt-5.5')?.evidence.task_evidence?.basis).toBe('smoke_extrapolation');
    const claudeBackend=route(routes,'claude','bounded_implementation');
    expect(claudeBackend.workers.find(t=>t.model_id==='claude-sonnet-5')?.evidence.task_evidence?.basis).toBe('smoke_extrapolation');
    expect(route(routes,'claude','mechanical_work').workers.find(t=>t.model_id==='claude-sonnet-5')?.evidence.task_evidence?.records.map(r=>r.case)).toEqual(['mechanical']);
    for(const host of ['claude','codex'])for(const task of ['research','repo_exploration']){
      const r=route(routes,host,task);expect([...r.workers,...r.reviewers].every(t=>t.evidence.task_evidence?.basis==='smoke_extrapolation')).toBe(true);
    }
  });

  it('uses explicit run roles and matching execution digests, independently of smoke prose',()=>{
    const {observations,acceptance}=fixtures();
    for(const t of observations.treatments)t.evidence.smoke.task='A renamed human-readable description';
    const before=buildProvisionalPilotRoutes(observations,acceptance);
    expect(route(before,'codex','mechanical_work').workers.map(t=>t.effort)).toEqual(['low','low']);
    expect(route(before,'codex','mechanical_work').reviewers.map(t=>t.effort)).toEqual(['high']);
    observations.runs=observations.runs.filter((r:any)=>!(r.worker.model==='gpt-5.5'&&r.worker.configured_effort==='low'));
    expect(route(buildProvisionalPilotRoutes(observations,acceptance),'codex','mechanical_work').workers.map(t=>t.model_id)).toEqual(['gpt-5.3-codex-spark']);
  });

  it.each([
    ['failed external grading',(c:any)=>{c.external_grader_passed=false;}],
    ['failed case',(c:any)=>{c.acceptance='FAIL';}],
    ['unreviewed artifact',(c:any)=>{c.frontier.actual_artifact_inspected=false;}],
    ['missing checks',(c:any)=>{c.frontier.check_count=0;}],
    ['timeout without recovery',(c:any)=>{c.original_attempt.timed_out=true;}],
    ['wrong host',(c:any)=>{c.host='claude';}],
    ['wrong requested model',(c:any)=>{c.workers[0].requested_model='gpt-5.5';}],
    ['wrong requested effort',(c:any)=>{c.workers[0].requested_effort='high';}],
    ['wrong effective effort',(c:any)=>{c.workers[0].configured_model_effort[0].effort='high';}],
    ['contradictory served model',(c:any)=>{c.workers[0].observed_message_models=['gpt-5.5'];}],
    ['unknown frontier treatment',(c:any)=>{c.frontier.configuration[0].model='unproven-reviewer';}],
    ['future observation',(c:any)=>{c.original_attempt.started_at='2099-01-01T00:00:00Z';}],
  ])('does not grant class evidence for %s',(_name,mutate)=>{
    const {observations,acceptance}=fixtures();
    const record=acceptance.cases.find((c:any)=>c.host==='codex'&&c.case==='backend');mutate(record);
    const selected=route(buildProvisionalPilotRoutes(observations,acceptance),'codex','bounded_implementation');
    for(const t of [...selected.workers,...selected.reviewers])expect(t.evidence.task_evidence).toMatchObject({basis:'smoke_extrapolation',records:[]});
  });

  it('retains assisted UI acceptance and requires hash-matched browser provenance',()=>{
    const {observations,acceptance}=fixtures();
    const original=route(buildProvisionalPilotRoutes(observations,acceptance),'claude','ui_implementation').workers.find(t=>t.model_id.startsWith('claude-haiku'))!;
    expect(original.evidence.task_evidence?.records[0]).toMatchObject({acceptance:'PASS_WITH_HARNESS_RECOVERY',recovery:{kind:expect.any(String)},browser:{artifact_digest:expect.any(String)}});
    expect(original.evidence.task_evidence?.limitations.join(' ')).toContain('Assisted completion');
    const record=acceptance.cases.find((c:any)=>c.host==='claude'&&c.case==='ui');
    record.browser.artifact_digest='sha256:'+'0'.repeat(64);
    const routes=buildProvisionalPilotRoutes(observations,acceptance);
    expect([...route(routes,'claude','ui_implementation').workers,...route(routes,'claude','ui_implementation').reviewers].every(t=>t.evidence.task_evidence?.basis==='smoke_extrapolation')).toBe(true);
  });

  it('rejects attaching evidence to another treatment, host, class or lane',()=>{
    vi.useFakeTimers();vi.setSystemTime(new Date('2026-09-10T04:00:00Z'));
    const {observations,acceptance}=fixtures(),routes=buildProvisionalPilotRoutes(observations,acceptance),selected=route(routes,'codex','bounded_implementation');
    const worker=structuredClone(selected.workers[0]!);
    worker.evidence.task_evidence!.candidate_identity='sha256:'+'0'.repeat(64);
    expect(()=>provisionalTreatmentSchema.parse(worker)).toThrow(/exact host and treatment/);
    worker.evidence.task_evidence=selected.workers[0]!.evidence.task_evidence;
    worker.evidence.host='claude';expect(()=>provisionalTreatmentSchema.parse(worker)).toThrow(/exact host and treatment/);
    const policy=JSON.parse(readFileSync('policy/constitution.json','utf8'));
    const compile=(provisional:any)=>compileRoutingPack({mode:'production',policy,strata:[],provisional});
    const wrongClass=structuredClone(selected);wrongClass.publicTaskClass='mechanical_work';
    expect(()=>compile([wrongClass])).toThrowError(expect.objectContaining({code:'TASK_EVIDENCE_SCOPE_MISMATCH'}));
    const wrongLane=structuredClone(selected);wrongLane.workers[0]!.evidence.task_evidence!.role='reviewer';
    expect(()=>compile([wrongLane])).toThrowError(expect.objectContaining({code:'TASK_EVIDENCE_SCOPE_MISMATCH'}));
    const pack=compile(routes);
    expect(pack.routes.every(r=>[...r.workers,...r.reviewers].every(t=>t.evidence_tier==='provisional'&&t.qualification===null))).toBe(true);
    expect(pack.routes.find(r=>r.public_task_class==='bounded_implementation')?.workers[0]?.task_evidence).toBeDefined();
  });
});


describe('per-case consumer-folder provenance',()=>{
  const audit=()=>JSON.parse(readFileSync('data/routing/archive/2026-09-10/medium-smoke-audit.json','utf8'));
  const entries=(routes:ReturnType<typeof buildProvisionalPilotRoutes>)=>routes.flatMap(r=>[...r.workers,...r.reviewers]);
  const namedCases=(limitations:string[])=>new Set(limitations.flatMap(l=>[...l.matchAll(/Case (\S+) accepted/g)].map(m=>m[1]!)));
  const tinybug=['claude-tinybug-1789009415239','codex-tinybug-1789009415239'];

  it('names exactly the joined records per entry and never extrapolated ones',()=>{
    const {observations,acceptance}=fixtures(),all=entries(buildProvisionalPilotRoutes(observations,acceptance,audit()));
    expect(all.length).toBeGreaterThan(0);
    for(const t of all){
      const te=t.evidence.task_evidence!,named=namedCases(te.limitations);
      if(te.basis==='installed_acceptance')expect(named).toEqual(new Set(te.records.map(r=>r.case_id)));
      else expect(named.size).toBe(0);
      expect(te.limitations.join(' ')).not.toMatch(/\bfinal\b/i);
    }
  });

  it('marks exactly the ten records accepted on an earlier folder iteration',()=>{
    const {observations,acceptance}=fixtures(),all=entries(buildProvisionalPilotRoutes(observations,acceptance,audit()));
    const earlier=new Set<string>(),provenance=new Set<string>();
    for(const t of all)for(const l of t.evidence.task_evidence!.limitations)for(const [,id] of l.matchAll(/Case (\S+) accepted/g)){provenance.add(id!);if(l.includes('Earlier iteration'))earlier.add(id!);}
    const expected=acceptance.cases.filter((c:any)=>['backend','hardbug','mechanical','multicomponent','ui'].includes(c.case)).map((c:any)=>c.id);
    expect(expected).toHaveLength(10);expect([...earlier].sort()).toEqual([...expected].sort());
    for(const id of tinybug){expect(acceptance.cases.find((c:any)=>c.id===id)?.copied_skill_digest).toBe(acceptance.final_consumer_folder_digest);expect(provenance.has(id)).toBe(true);expect(earlier.has(id)).toBe(false);}
    const sample=all.find(t=>namedCases(t.evidence.task_evidence!.limitations).has('claude-mechanical-1789007904504'))!;
    expect(sample.evidence.task_evidence!.limitations).toContain("Case claude-mechanical-1789007904504 accepted on consumer-folder iteration a379a55d (maintainer-recorded attribution bound by record_digest); the published folder may differ. Earlier iteration than the acceptance run's last iteration 2509569e.");
  });

  it('derives attribution only from digests, ignoring the recorded match flag',()=>{
    const {observations,acceptance}=fixtures(),before=buildProvisionalPilotRoutes(observations,acceptance,audit());
    const flipped=structuredClone(acceptance);for(const c of flipped.cases)c.matches_final_skill=true;
    const after=buildProvisionalPilotRoutes(observations,flipped,audit());
    expect(after.map(r=>entries([r]).map(t=>({basis:t.evidence.task_evidence!.basis,limitations:t.evidence.task_evidence!.limitations})))).toEqual(before.map(r=>entries([r]).map(t=>({basis:t.evidence.task_evidence!.basis,limitations:t.evidence.task_evidence!.limitations}))));
  });

  it('refuses a case without its copied folder digest',()=>{
    const {observations,acceptance}=fixtures();delete acceptance.cases[0].copied_skill_digest;
    expect(()=>buildProvisionalPilotRoutes(observations,acceptance)).toThrow();
  });

  it('leaves the medium stratum untouched',()=>{
    const {observations,acceptance}=fixtures(),medium=buildProvisionalPilotRoutes(observations,acceptance,audit()).find(r=>r.risk==='medium')!;
    expect(medium.scope).toBe('claude medium pilot: Zero/nullish quantity-default fixes in local plain JavaScript only. Separate fresh artifact-only frontier verification is mandatory. Existing native smoke only; no medium installed task acceptance or governor qualification.');
    expect(medium.workers.map(w=>w.candidate_id).sort()).toEqual(['claude-claude-haiku-4-5-20251001-not_applicable','claude-claude-sonnet-5-low']);
    expect(medium.reviewers.map(w=>w.candidate_id)).toEqual(['claude-claude-opus-5-high']);
    for(const t of entries([medium]))expect(t.evidence.task_evidence!.limitations).toEqual(['Limited to the audited zero/nullish quantity-default fixes in local plain JavaScript; no broader medium-risk acceptance or capability qualification.','The reviewer ran separately in a fresh artifact-only process; served effort was not exposed. Configured effort is not runtime attestation.']);
  });
});

describe('audited medium-risk quantity smoke',()=>{
  const audit=()=>JSON.parse(readFileSync('data/routing/archive/2026-09-10/medium-smoke-audit.json','utf8'));
  it('adds only the scoped Claude medium stratum with fresh independent frontier controls',()=>{
    vi.useFakeTimers();vi.setSystemTime(new Date('2026-09-10T04:00:00Z'));
    const {observations,acceptance}=fixtures(),before=digest(observations),routes=buildProvisionalPilotRoutes(observations,acceptance,audit()),medium=routes.filter(r=>r.risk==='medium');
    expect(routes).toHaveLength(15);expect(medium).toHaveLength(1);expect(digest(observations)).toBe(before);
    expect(medium[0]).toMatchObject({publicTaskClass:'mechanical_work',requirements:{fresh_context:true}});expect(medium[0]!.scope).toContain('quantity-default');
    expect(medium[0]!.workers.map(w=>w.model_id).sort()).toEqual(['claude-haiku-4-5-20251001','claude-sonnet-5']);
    for(const candidate of [...medium[0]!.workers,...medium[0]!.reviewers])expect(candidate.evidence.task_evidence).toMatchObject({basis:'smoke_extrapolation',records:[],control_evidence:{audit_digest:digest(audit())}});
    const haiku=medium[0]!.workers.find(w=>w.model_id.startsWith('claude-haiku'))!;
    expect(haiku.evidence.task_evidence!.control_evidence!.reviews[0]!.reviewer_execution_digest).toBe(audit().reviews[1].reviewer_execution_digest);
    const pack=compileRoutingPack({mode:'production',policy:JSON.parse(readFileSync('policy/constitution.json','utf8')),strata:[],provisional:routes});
    expect(pack.routes.find(r=>r.stratum.worker_request.risk==='medium')!.review_rule).toMatchObject({required:true,different_model:true,fresh_context:true,frontier:true});
  });
  it.each([
    ['source',(a:any)=>{a.source_digest=digest('changed');}],
    ['run',(a:any)=>{a.reviews[0].run_digest=digest('changed');}],
    ['worker',(a:any)=>{a.reviews[0].worker_identity=a.reviews[0].reviewer_identity;}],
    ['reviewer',(a:any)=>{a.reviews[0].reviewer_identity=a.reviews[0].worker_identity;}],
    ['review output',(a:any)=>{a.reviews[1].reviewer_execution_digest=a.reviews[0].reviewer_execution_digest;}],
    ['artifact',(a:any)=>{a.reviews[0].artifact_digest=digest('changed');}],
    ['context',(a:any)=>{a.reviews[0].fresh_artifact_only_context=false;}],
    ['duplicate',(a:any)=>{a.reviews.push(a.reviews[0]);}],
  ])('refuses altered %s evidence',(_name,mutate)=>{
    const {observations,acceptance}=fixtures(),value=audit();mutate(value);expect(()=>buildProvisionalPilotRoutes(observations,acceptance,value)).toThrow();
  });
});


describe('installed acceptance renewal horizon',()=>{
  const entries=(routes:ReturnType<typeof buildProvisionalPilotRoutes>)=>routes.flatMap(r=>[...r.workers,...r.reviewers]);
  it('preserves the September join and demotes October records before the refresh horizon',()=>{
    const {observations,acceptance}=fixtures();
    const original=buildProvisionalPilotRoutes(observations,acceptance);
    expect(buildProvisionalPilotRoutes(observations,acceptance,undefined,{now:'2026-09-10T04:00:00Z'})).toEqual(original);
    const demoted=entries(buildProvisionalPilotRoutes(observations,acceptance,undefined,{now:'2026-10-04T00:00:00Z'}));
    expect(demoted.every(t=>t.evidence.task_evidence?.basis==='smoke_extrapolation')).toBe(true);
    expect(demoted.some(t=>t.evidence.task_evidence?.limitations.some(l=>l.includes('entry extrapolates from smoke until re-accepted')))).toBe(true);
  });
  it('uses policy age and refresh days at the exact evidence cutoff',()=>{
    const {observations,acceptance}=fixtures();
    acceptance.cases=[acceptance.cases.find((c:any)=>c.host==='codex'&&c.case==='backend')];
    const record=acceptance.cases[0],routingPack={provisional_evidence_max_age_days:12,refresh_after_days:3};
    const cutoff=Date.parse(record.original_attempt.started_at)+9*86400000;
    const records=(offset:number)=>entries(buildProvisionalPilotRoutes(observations,acceptance,undefined,{now:new Date(cutoff+offset).toISOString(),routingPack})).flatMap(t=>t.evidence.task_evidence!.records);
    expect(records(-60000).length).toBeGreaterThan(0);
    expect(records(0)).toEqual([]);expect(records(60000)).toEqual([]);
  });
});
