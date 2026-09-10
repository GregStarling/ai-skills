import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {digest} from '../../src/core/canonical.js';
import {requireFrontierRefresh} from '../../src/routing/frontier-refresh.js';

const now='2026-09-10T12:00:00Z',sha=`sha256:${'a'.repeat(64)}`;
function fixture(){
  const targets={schema_version:'frontier_targets.v1',discovered_at:now,targets:[{provider:'openai',host:'codex',model_id:'current-openai',effort:'high',source:{url:'https://developers.openai.com/api/docs/models',checked_at:now,content_digest:sha,claim:'Current provider frontier'}},{provider:'anthropic',host:'claude',model_id:'current-anthropic',effort:'high',source:{url:'https://platform.claude.com/docs/en/models/overview',checked_at:now,content_digest:sha,claim:'Current provider frontier'}}]};
  const probes={schema_version:'frontier_probes.v1',targets_digest:digest(targets),probes:targets.targets.map(t=>({provider:t.provider,host:t.host,model_id:t.model_id,effort:t.effort,host_version:'test',attempted:true,attempted_at:now,availability:'unavailable',reason:'Observed CLI version rejection',invocation:'native_cli',native_agent_status:'not_probed',observed_models:[],observed_effort:null,exit_code:1,timed_out:false,stdout_digest:sha,stderr_digest:sha,evaluation:{status:'not_run',review_digest:null as string|null,note:'Retain evidenced reviewer'}}))};
  return {targets,probes};
}
describe('frontier refresh publication preflight',()=>{
  it('requires current discovery plus a matching actual probe for both hosts',()=>{
    const {targets,probes}=fixture();expect(()=>requireFrontierRefresh(targets,probes,now)).not.toThrow();
    expect(()=>requireFrontierRefresh(targets,{...probes,probes:probes.probes.slice(1)},now)).toThrow('FRONTIER_PROBE_MISSING');
    expect(()=>requireFrontierRefresh(targets,probes,'2026-09-18T12:00:00Z')).toThrow('FRONTIER_DISCOVERY_STALE');
    expect(()=>requireFrontierRefresh(targets,probes,'2026-09-09T12:00:00Z')).toThrow('FRONTIER_DISCOVERY_STALE_OR_FUTURE');
    const changed=structuredClone(targets);changed.targets[0]!.model_id='newer-frontier';expect(()=>requireFrontierRefresh(changed,probes,now)).toThrow('FRONTIER_TARGETS_CHANGED');
  });
  it('does not treat an available-model greeting as an evaluated frontier',()=>{
    const {targets,probes}=fixture(),p=probes.probes[0]!;p.availability='available';p.exit_code=0;p.evaluation.status='pending_review';
    expect(()=>requireFrontierRefresh(targets,probes,now)).toThrow('FRONTIER_EVALUATION_REQUIRED');
    p.evaluation.status='passed';p.evaluation.review_digest=sha;expect(()=>requireFrontierRefresh(targets,probes,now)).not.toThrow();
    p.availability='unavailable';expect(()=>requireFrontierRefresh(targets,probes,now)).toThrow('FRONTIER_UNAVAILABLE_EVALUATION_CONFLICT');
  });
});


// Checked-in real captures exercise publication proof without any provider calls.
function nativeFixture(){
  const read=(path:string)=>JSON.parse(readFileSync(path,'utf8'));
  const targets=read('data/routing/frontier-targets.json'),probes=read('data/routing/frontier-probes.json'),evidence=read('data/routing/frontier-identity-evidence.json');
  const now=new Date(Math.max(...probes.probes.map((p:any)=>Date.parse(p.attempted_at)))+1000).toISOString();
  for(const probe of probes.probes){probe.evaluation.status='passed';probe.evaluation.review_digest=sha;}
  return {targets,probes,evidence,now};
}
describe('native frontier identity publication proof',()=>{
  it('rederives different Claude and Codex assurance from actual source bytes',()=>{
    const {targets,probes,evidence,now}=nativeFixture();
    expect(()=>requireFrontierRefresh(targets,probes,now,7,evidence)).not.toThrow();
    expect(probes.probes.find((p:any)=>p.host==='claude').identity_assurance.overall).toBe('PARTIALLY_RUNTIME_ATTESTED');
    expect(probes.probes.find((p:any)=>p.host==='codex').identity_assurance.overall).toBe('CONFIGURATION_ATTESTED');
  });
  it('refuses a writable assurance label, unavailable proof and mutated native sources',()=>{
    const {targets,probes,evidence,now}=nativeFixture();
    const codex=probes.probes.find((p:any)=>p.host==='codex');
    codex.identity_assurance.model.assurance='runtime_attested';
    codex.identity_assurance.overall='PARTIALLY_RUNTIME_ATTESTED';
    expect(()=>requireFrontierRefresh(targets,probes,now,7,evidence)).toThrow('FRONTIER_IDENTITY_ASSURANCE_NOT_DERIVED');
    const fresh=nativeFixture();
    expect(()=>requireFrontierRefresh(fresh.targets,fresh.probes,fresh.now)).toThrow('FRONTIER_IDENTITY_EVIDENCE_MISSING_OR_CHANGED');
    const entry=fresh.evidence[fresh.probes.probes[0].identity_evidence_digest];
    entry.report.command.args.push('--model','different');
    expect(()=>requireFrontierRefresh(fresh.targets,fresh.probes,fresh.now,7,fresh.evidence)).toThrow('FRONTIER_IDENTITY_EVIDENCE_MISSING_OR_CHANGED');
  });
  it('keeps configured values separate from observed telemetry and requires raw host version',()=>{
    const {targets,probes,evidence,now}=nativeFixture();
    const codex=probes.probes.find((p:any)=>p.host==='codex');
    codex.observed_models=[codex.configured_model];
    expect(()=>requireFrontierRefresh(targets,probes,now,7,evidence)).toThrow('FRONTIER_OBSERVED_IDENTITY_MISMATCH');
    codex.observed_models=[];const actualVersion=codex.host_version;codex.host_version='codex-cli 999.0.0';
    expect(()=>requireFrontierRefresh(targets,probes,now,7,evidence)).toThrow('FRONTIER_HOST_VERSION_MISMATCH');
    codex.host_version=actualVersion;delete codex.identity_assurance;
    expect(()=>requireFrontierRefresh(targets,probes,now,7,evidence)).toThrow('FRONTIER_IDENTITY_EVIDENCE_REQUIRED');
  });
});
