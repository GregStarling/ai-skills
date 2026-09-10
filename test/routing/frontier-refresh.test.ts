import {describe,it,expect} from 'vitest';
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
