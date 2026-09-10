import {readFileSync} from 'node:fs';
import {afterEach,describe,expect,it,vi} from 'vitest';
import {digest} from '../../src/core/canonical.js';
import {buildProvisionalPilotRoutes} from '../../src/routing/acceptance.js';
import {compileRoutingPack} from '../../src/routing/compiler.js';
import {provisionalTreatmentSchema} from '../../src/routing/provisional.js';

const fixtures=()=>({observations:JSON.parse(readFileSync('data/routing/host-observations.json','utf8')),acceptance:JSON.parse(readFileSync('data/routing/installed-acceptance.json','utf8'))});
const route=(routes:ReturnType<typeof buildProvisionalPilotRoutes>,host:string,task:string)=>routes.find(r=>r.publicTaskClass===task&&r.workers[0]!.evidence.host===host)!;
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
    expect(pack.routes.find(r=>r.public_task_class==='bounded_implementation')?.workers[0]?.provisional?.task_evidence).toBeDefined();
  });
});
