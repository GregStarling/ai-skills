import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {digest,hashBytes} from '../../src/core/canonical.js';
import {candidateIdentity,parseCandidate,parseRuntimeReport} from '../../src/schema/index.js';
import {captureIdentityEnvironment,deriveIdentityAssurance} from '../../src/runtime/identity-assurance.js';
import {encodeSources} from '../../src/evidence/sources.js';
import {frontierTargetsSchema,requireFrontierRefresh,requireFrontierTargetPolicy,type FrontierIdentityEvidence,type FrontierReviewEvidence} from '../../src/routing/frontier-refresh.js';

// Deterministic contract fixtures only; never persisted as production evidence.
const now='2026-11-23T01:00:00Z',later='2026-11-23T01:01:00Z',checked='2026-11-23T00:59:00Z';
const policy=readFileSync('skills/delegate/SKILL.md','utf8');
const source={url:'https://developers.openai.com/codex/models',checked_at:checked,content_digest:hashBytes('official capture fixture'),claim:'Official model metadata'};
function native(host:'codex'|'claude',started_at=now,cwd=`/fixture/${host}`,output='REPAIR: use ?? instead of ||',substitute=false,unavailable=false,prompt='diagnostic fixture prompt'){
  const provider=host==='codex'?'openai':'anthropic',model_id=host==='codex'?'gpt-6.1-sol':'claude-opus-5-5';
  const candidate=parseCandidate({schema_version:'candidate.v1',candidate_id:`fixture_${host}`,provider,model_id,snapshot_id:model_id,effort:'high',serving:{fallback:'disabled',tool_use:'host_tools',json_schema:false},material_serving_settings:['fallback','tool_use','json_schema'],provenance:{registry_id:'fixture',model_record_id:'fixture',registry_content_digest:hashBytes('fixture')}});
  const command={executable:host,cwd,args:host==='codex'?['exec','--ignore-user-config','-m',model_id,'-c','model_reasoning_effort="high"']:['-p','--model',model_id,'--effort','high','--setting-sources','','--tools','Read,Bash']};
  const version=host==='codex'?'codex-cli 0.162.1':'2.1.296 (Claude Code)';
  const stdout=unavailable?JSON.stringify({type:'error',message:'model_not_found: no access'}):host==='codex'?[{type:'item.completed',item:{type:'agent_message',text:output}},...(substitute?[{type:'session_meta',payload:{model:'gpt-6-astra'}}]:[]),{type:'turn.completed'}].map(event=>JSON.stringify(event)).join('\n'):[{type:'assistant',message:{model:substitute?'claude-fable-5-1':model_id,content:[{type:'text',text:output}]}},{type:'result',subtype:'success',result:output}].map(event=>JSON.stringify(event)).join('\n');
  const request=JSON.stringify({schema_version:'native_execution_request.v1',execution_environment:host==='codex'?'codex':'claude_code',candidate_identity:candidateIdentity(candidate),command,prompt_digest:hashBytes(prompt),environment:captureIdentityEnvironment({})});
  const process=JSON.stringify({schema_version:'native_execution_process.v1',request_digest:hashBytes(request),started_at,completed_at:started_at,exit_code:unavailable?1:0,signal:null,timed_out:false,spawn_error:null,stdout_digest:hashBytes(stdout),stderr_digest:hashBytes('')});
  const report=parseRuntimeReport({schema_version:'runtime_report.v1',report_id:`fixture_${host}`,provider,execution_environment:host==='codex'?'codex':'claude_code',candidate_id:candidate.candidate_id,started_at,completed_at:started_at,command,status:unavailable?'failed':'completed',exit_code:unavailable?1:0,signal:null,timeout_ms:90000,stdout_digest:hashBytes(stdout),stderr_digest:hashBytes(''),observed_identity:{source:'unknown'},native_evidence:{request_digest:hashBytes(request),process_digest:hashBytes(process),version_digest:hashBytes(version)}});
  const humanRequest=JSON.stringify({binary:host,args:command.args,cwd,prompt,started_at});
  const sources=new Map([request,process,stdout,'',version,prompt,humanRequest].map(bytes=>[hashBytes(bytes),bytes]));
  const assurance=deriveIdentityAssurance({candidate,report,sources,executionEnvironment:host==='codex'?'codex':'claude_code'});
  const evidence={schema_version:'frontier_identity_evidence.v1' as const,candidate,report,sources:encodeSources(sources),assurance};
  const {diagnostics,...identity_assurance}=assurance;
  return {evidence,stdout,humanRequest,version,probe:{provider,host,model_id,effort:'high',host_version:version,attempted:true,attempted_at:started_at,availability:unavailable?'unavailable':'available',reason:'Actual diagnostic fixture capture',invocation:'native_cli',native_agent_status:'not_probed',configured_model:model_id,configured_effort:'high',observed_models:identity_assurance.model.assurance==='runtime_attested'?[identity_assurance.model.value]:[],observed_effort:identity_assurance.effort.assurance==='runtime_attested'?identity_assurance.effort.value:null,identity_assurance,identity_evidence_digest:digest(evidence),exit_code:unavailable?1:0,timed_out:false,stdout_digest:hashBytes(stdout),stderr_digest:hashBytes(''),evaluation:{status:unavailable?'not_run':'passed',review_digest:unavailable?null:'',note:'Independent diagnostic review'}}};
}
function fixture(){
  const captures=[native('codex'),native('claude')];
  const targets:any={schema_version:'frontier_targets.v2',discovered_at:checked,model_policy:{path:'skills/delegate/SKILL.md',content_digest:hashBytes(policy)},targets:captures.map(c=>({provider:c.probe.provider,host:c.probe.host,model_id:c.probe.model_id,effort:'high',source:{...source,url:c.probe.host==='claude'?'https://platform.claude.com/docs/en/models/overview':source.url}}))};
  targets.vendor_frontiers=targets.targets.map((target:any)=>({...target,model_id:target.host==='codex'?'gpt-6.2-astra':target.model_id,selection:target.host==='codex'?'excluded':'selected',reason:'Current primary frontier policy governs ordinary diagnostics',selected_target:{model_id:target.model_id,effort:target.effort}}));
  const files=captures.flatMap(c=>[
    {path:`${c.probe.host}/quantity.mjs`,bytes:'export const quantity = q => q || 1;'},
    {path:`${c.probe.host}/quantity.test.mjs`,bytes:'assert.equal(quantity(0),0);'},
    {path:`${c.probe.host}/stdout.jsonl`,bytes:c.stdout},
    {path:`${c.probe.host}/request.json`,bytes:c.humanRequest},
  ].map(f=>({...f,source:`/capture/${f.path}`,content_digest:hashBytes(f.bytes)})));
  const manifest=files.map(({bytes,...file})=>file);
  const reviewPrompt=`Review input manifest ${digest(manifest)}\nReview the captures.`;
  const reviewCapture=native('claude',later,'/fixture/independent-review','CODEX: PASS.\nCLAUDE: PASS.',false,false,reviewPrompt);
  const review={schema_version:'frontier_probe_review.v1',reviewed_at:later,reviewer:{host:'claude',host_version:reviewCapture.version,configured_model:'claude-opus-5-5',configured_effort:'high',observed_models:['claude-opus-5-5'],observed_effort:null,fresh_process:true},input_manifest_digest:digest(manifest),request_digest:hashBytes(reviewCapture.humanRequest),stdout_digest:hashBytes(reviewCapture.stdout),stderr_digest:hashBytes(''),exit_code:0,timed_out:false,output:'CODEX: PASS.\nCLAUDE: PASS.',probes:captures.map(c=>({host:c.probe.host,probe_trace_digest:hashBytes(c.stdout),diagnosis_digest:hashBytes('REPAIR: use ?? instead of ||'),fixture_digest:digest(manifest.filter(f=>f.path.startsWith(c.probe.host+'/quantity'))),status:'passed'})),qualification_authority:false};
  const envelope={schema_version:'frontier_review_evidence.v1' as const,review,identity_evidence:reviewCapture.evidence,files},reviewDigest=digest(envelope);
  for(const capture of captures)capture.probe.evaluation.review_digest=reviewDigest;
  const probes:any={schema_version:'frontier_probes.v2',targets_digest:digest(targets),probes:captures.map(c=>c.probe)};
  const evidence:FrontierIdentityEvidence=Object.fromEntries(captures.map(c=>[digest(c.evidence),c.evidence]));
  const reviews:FrontierReviewEvidence={[reviewDigest]:envelope};
  return {targets,probes,evidence,reviews,check(){return requireFrontierRefresh(targets,probes,later,7,evidence,policy,reviews);}};
}
describe('policy scoped frontier refresh',()=>{
  it('evaluates permitted exact targets while excluding a newer vendor frontier without claiming its probe',()=>{
    const f=fixture();expect(()=>f.check()).not.toThrow();
    expect(f.probes.probes.some((p:any)=>p.model_id==='gpt-6.2-astra')).toBe(false);
  });
  it('binds complete discovery, policy bytes and explicit vendor selection',()=>{
    const f=fixture();f.targets.vendor_frontiers[0].reason='altered';expect(()=>f.check()).toThrow('FRONTIER_TARGETS_CHANGED');
    const g=fixture();expect(()=>requireFrontierRefresh(g.targets,g.probes,later,7,g.evidence,policy+'changed',g.reviews)).toThrow('FRONTIER_MODEL_POLICY_MISSING_OR_CHANGED');
    const h=fixture();h.targets.vendor_frontiers[0].selection='selected';expect(()=>frontierTargetsSchema.parse(h.targets)).toThrow('Vendor selection');
  });
  it('rejects historical target files for a new live probe',()=>{
    const {targets}=fixture();
    const historical=frontierTargetsSchema.parse({schema_version:'frontier_targets.v1',discovered_at:checked,targets:targets.targets});
    expect(()=>requireFrontierTargetPolicy(historical,policy)).toThrow('FRONTIER_POLICY_SCOPED_TARGETS_REQUIRED');
  });
  it('rejects forbidden substitutions even after recomputing the target digest',()=>{
    const f=fixture();f.targets.targets[0].model_id='gpt-6.2-astra';f.targets.vendor_frontiers[0].selection='selected';f.targets.vendor_frontiers[0].selected_target.model_id='gpt-6.2-astra';f.probes.targets_digest=digest(f.targets);
    expect(()=>f.check()).toThrow('FRONTIER_TARGET_NOT_POLICY_PERMITTED');
  });
  it('requires modern identity and rejects incomplete reports and old/future vendor metadata',()=>{
    const f=fixture();f.probes.schema_version='frontier_probes.v1';expect(()=>f.check()).toThrow('FRONTIER_MODERN_PROBE_REQUIRED');
    const g=fixture();g.probes.probes.pop();expect(()=>g.check()).toThrow('FRONTIER_PROBE_MISSING');
    const h=fixture();h.targets.vendor_frontiers[0].source.checked_at='2026-11-01T00:00:00Z';h.probes.targets_digest=digest(h.targets);expect(()=>h.check()).toThrow('FRONTIER_DISCOVERY_STALE');
    const i=fixture();i.targets.vendor_frontiers[0].source.checked_at=later;i.probes.targets_digest=digest(i.targets);expect(()=>i.check()).toThrow('FRONTIER_DISCOVERY_STALE');
    const j=fixture();delete j.probes.probes[0].identity_evidence_digest;expect(()=>j.check()).toThrow('FRONTIER_IDENTITY_EVIDENCE_REQUIRED');
  });
  it('refuses self written verdicts, changed manifests and reviewer substitutions',()=>{
    const f=fixture();expect(()=>requireFrontierRefresh(f.targets,f.probes,later,7,f.evidence,policy)).toThrow('FRONTIER_REVIEW_EVIDENCE_MISSING');
    const g=fixture(),envelope:any=Object.values(g.reviews)[0];envelope.files[0].bytes+='changed';const changed=digest(envelope);g.reviews[changed]=envelope;g.probes.probes.forEach((p:any)=>p.evaluation.review_digest=changed);expect(()=>g.check()).toThrow('FRONTIER_REVIEW_SOURCE_MISSING');
    const h=fixture(),e:any=Object.values(h.reviews)[0];e.review.reviewer.configured_model='claude-fable-5-1';const key=digest(e);h.reviews[key]=e;h.probes.probes.forEach((p:any)=>p.evaluation.review_digest=key);expect(()=>h.check()).toThrow('FRONTIER_REVIEW_IDENTITY_MISMATCH');
  });
  it('rejects changed fixture bytes even when all editable manifest and envelope digests are recomputed',()=>{
    const f=fixture(),envelope=Object.values(f.reviews)[0]!;
    const changed=envelope.files.find(file=>file.path==='codex/quantity.mjs')!;
    changed.bytes='export const quantity = () => 42;';changed.content_digest=hashBytes(changed.bytes);
    const manifest=envelope.files.map(({bytes,...file})=>file),review=envelope.review as {input_manifest_digest:string;probes:Array<{host:string;fixture_digest:string}>};
    review.input_manifest_digest=digest(manifest);
    review.probes.find(row=>row.host==='codex')!.fixture_digest=digest(manifest.filter(file=>file.path.startsWith('codex/quantity')));
    const key=digest(envelope);f.reviews[key]=envelope;for(const row of f.probes.probes)row.evaluation.review_digest=key;
    expect(()=>f.check()).toThrow('FRONTIER_REVIEW_MANIFEST_NOT_IN_NATIVE_REQUEST');
  });
  it('retains genuine native unavailability without substituting another attempted vendor model',()=>{
    const f=fixture(),capture=native('codex',now,'/fixture/codex','',false,true);
    f.evidence[digest(capture.evidence)]=capture.evidence;f.probes.probes[0]=capture.probe;
    expect(()=>f.check()).not.toThrow();
    delete f.evidence[digest(capture.evidence)];expect(()=>f.check()).toThrow('FRONTIER_IDENTITY_EVIDENCE_MISSING');
  });
  it('cannot bypass actual independent review by relabeling a completed available execution unavailable',()=>{
    const f=fixture();f.probes.probes[0].availability='unavailable';f.probes.probes[0].evaluation={status:'not_run',review_digest:null,note:'claimed unavailable'};
    expect(()=>f.check()).toThrow('FRONTIER_AVAILABILITY_CONFLICT');
  });
  it('rejects unindicated observed model substitution from actual raw trace',()=>{
    const f=fixture(),capture=native('claude',now,'/fixture/claude','REPAIR: use ?? instead of ||',true);f.evidence[digest(capture.evidence)]=capture.evidence;f.probes.probes[1]={...capture.probe,evaluation:f.probes.probes[1].evaluation};expect(()=>f.check()).toThrow('FRONTIER_IDENTITY_CONTRADICTION');
  });
});
