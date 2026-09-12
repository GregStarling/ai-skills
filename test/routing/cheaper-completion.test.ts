import {createHash} from 'node:crypto';
import {mkdtemp,rm,writeFile,mkdir,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {afterEach,expect,it} from 'vitest';
const v=await import(pathToFileURL(resolve('scripts/verify/cheaper-completion.mjs')).href);
const {reviewRequirement,auditTask}=await import('../../skills/delegate/scripts/local-learning.mjs');
const roots:string[]=[];const revision='a'.repeat(40);
const hash=(x:string)=>'sha256:'+createHash('sha256').update(x).digest('hex');
async function fixture(accountingFault?:'omitted'|'host'|'source'|'count'){
 const root=await mkdtemp(join(tmpdir(),'cheaper-proof-'));roots.push(root);const userRoot=join(root,'user');
 const put=async(path:string,value:any,kind='command_output')=>{const b=typeof value==='string'?value:JSON.stringify(value);await mkdir(join(root,path,'..'),{recursive:true});await writeFile(join(root,path),b);return {path,sha256:hash(b),kind};};
 for(const path of ['AGENTS.md','package.json','skills/delegate/SKILL.md','scripts/verify/proof.mjs','test/routing/proof.test.ts'])await put(path,'fixture');
 const source_manifest=await v.scopedSourceManifest(root),source_digest=await v.sourceDigest(root);
 const generic=await put('evidence/generic.json',{exit_code:0});
 const checks=v.CHECKLIST_IDS.map((id:string)=>({id,status:'passed',evidence:[generic],objective:{}}));const get=(id:string)=>checks.find((x:any)=>x.id===id);
 const commands=[];for(const name of ['test','typecheck','build','skills'])commands.push({name,exit_code:0,evidence:await put('evidence/'+name+'.json',{exit_code:0,source_digest})});
 const tests=await put('evidence/tests.json',{numPassedTests:1,numFailedTests:0,numTotalTests:1},'test_output');get('OFFLINE').evidence=[...commands.map(c=>c.evidence),tests];get('OFFLINE').objective={commands,test_count:1,test_evidence:tests};
 const sourceFolder=await v.folderDigest(join(root,'skills/delegate'));
 const installations=[],defaults=[];
 for(const host of ['codex','claude']){
  const installed=join(userRoot,host==='codex'?'.agents/skills/delegate':'.claude/skills/delegate');await mkdir(installed,{recursive:true});await writeFile(join(installed,'SKILL.md'),'fixture');
  const source={path:'skills/delegate',digest:sourceFolder},dest={path:installed,digest:sourceFolder};
  const manifest=await put('evidence/install-'+host+'.json',{schema_version:'cheaper_installation_manifest.v1',source_folder:source,installed_folder:dest},'installation_manifest');installations.push({host,source,installed:dest,manifest});
  const path=join(userRoot,host==='codex'?'.codex/config.toml':'.claude/settings.json'),model=host==='codex'?'gpt-5.6-terra':'sonnet',bytes=host==='codex'?`model = "${model}"\nmodel_reasoning_effort = "medium"\n`:JSON.stringify({model});await mkdir(join(path,'..'),{recursive:true});await writeFile(path,bytes);
  const snap={...await put('evidence/default-'+host+'.json',{path,sha256:hash(bytes),model,effort:host==='codex'?'medium':null},'default_config'),host};defaults.push({host,path,sha256:hash(bytes)});get('DEFAULTS').evidence.push(snap);
  for(const live of [false,true]){
   const gate=get(host.toUpperCase()+'-'+(live?'LIVE':'PILOT'));gate.evidence=[];gate.objective={runs:[],exercises:[]};
   const list:Array<[string,string]>=live?[['multicomponent','candidate']]:[...['mechanical','bug','multicomponent','planning'].flatMap(n=>['candidate','baseline'].map(a=>[n,a] as [string,string])),['research','candidate'],['pdf','candidate']];
   for(const [name,arm]of list){
    const id=host+'-'+name+'-'+arm+'-'+live,base='evidence/'+id,model=host==='codex'?(arm==='candidate'?'gpt-5.6-terra':'gpt-6-astra'):(arm==='candidate'?'claude-sonnet-5':'claude-fable-5-1'),frontier=host==='codex'?'gpt-6-astra':'claude-fable-5-1';
    const doc=['research','pdf'].includes(name),childModel=doc?model:frontier,role=name==='planning'?'decision':'reviewer';
    const reviewDigest=hash(JSON.stringify({'result.txt':hash('done')})),reviewText=JSON.stringify({role,verdict:'PASS',artifact_digest:reviewDigest});
    const ev=host==='codex'?[{type:'thread.started',thread_id:'parent'},{type:'turn.completed'}]:[{type:'assistant',message:{model,content:[{type:'tool_use',name:'Agent',id:'child',input:{model:childModel,effort:doc?'medium':'high'}}]}},{type:'assistant',parent_tool_use_id:'child',message:{model:childModel,content:[{type:'text',text:reviewText}]}},{type:'user',message:{content:[{type:'tool_result',tool_use_id:'child'}]}},{type:'result',subtype:'success'}];
    const trace=await put(base+'/coordinator/stdout.jsonl',ev.map(e=>JSON.stringify(e)).join('\n'),'native_trace');
    const native=[];for(const [tid,m]of [['parent',model],['child',childModel]]){const ref=await put(base+'/'+tid+'.jsonl',[{type:'session_meta',payload:{id:tid,source:tid==='parent'?'cli':{subagent:{thread_spawn:{parent_thread_id:'parent',agent_path:'/root/'+role}}}}},{type:'event_msg',payload:{type:'task_started',turn_id:id+'-'+tid}},{type:'turn_context',payload:{model:m,effort:(tid==='parent'&&arm==='candidate')||doc?'medium':'high'}},{type:'response_item',payload:tid==='parent'?{type:'function_call',call_id:id+'-spawn',name:'collaboration.spawn_agent',arguments:JSON.stringify({task_name:role,fork_turns:'none',model:childModel,reasoning_effort:doc?'medium':'high'})}:{type:'message',role:'assistant',content:[{type:'output_text',text:reviewText}]}},{type:'event_msg',payload:{type:'task_complete'}}].map(e=>JSON.stringify(e)).join('\n'),'native_trace');native.push({thread_id:tid,model:m,path:ref.path,sha256:ref.sha256});}
    await put(base+'/artifacts/result.txt','done');const files={'result.txt':hash('done')},artifact_digest=hash(JSON.stringify(files));
    await put(base+'/evidence/checks.txt','checked');
    const check_evidence=[{path:'checks.txt',digest:hash('checked')}];
    const policy_input={task_id:id,assignment:({mechanical:'specified_edit',bug:'implement_fix',multicomponent:'implement_feature',planning:'frontier_decision',research:'summarize_sources',pdf:'summarize_sources'} as Record<string,string>)[name],work_type:({mechanical:'mechanical_edit',bug:'routine_fix',multicomponent:'routine_implementation',planning:'planning',research:'research',pdf:'pdf_analysis'} as Record<string,string>)[name],...(['bug','multicomponent'].includes(name)?{implemented_behavior:true}:{})};
    const review_requirement=reviewRequirement(policy_input);
    const run={evidence_files:{'checks.txt':hash('checked')},schema_version:'cheaper_pilot.v1',source_digest,host,name,arm,id,execution:{code:0,started_at:'2026-09-11T00:00:00Z',timed_out:false,stdout_sha256:trace.sha256.slice(7)},after:{passed:true},instructions_unchanged:true,skill_unchanged:true,native_evidence:native,thread_id:'parent',artifact:{files,artifact_digest},observations:[{data:{task_id:id,schema_version:'delegate_observation.v3',check_evidence,execution_evidence:check_evidence,artifact_files:['result.txt'],policy_input,review_requirement,cheap_reviewer:{model:childModel,effort:doc?'medium':'high'},acceptance:'accepted',coordinator:{model},checks:'passed',artifact_digest,frontier:{model:frontier,effort:'high'},review:{verdict:'PASS',model:childModel,effort:doc?'medium':'high',fresh_context:true,artifact_digest}}}],prepared:{installed:live},args:[]};
    const ref=await put(base+'/result.json',run,'external_grade');gate.objective.runs.push(ref);gate.evidence.push(ref,trace);
   }
   if(!live)for(const exercise of ['simple_audit','seeded_defect']){
    const exbase='evidence/'+host+'-'+exercise,files={'result.txt':hash('done')},artifact={files,artifact_digest:hash(JSON.stringify(files))};await put(exbase+'/artifacts/result.txt','done');
    const final=JSON.stringify({role:'reviewer',verdict:exercise==='simple_audit'?'PASS':'REPAIR',artifact_digest:artifact.artifact_digest})+(exercise==='seeded_defect'?' zero is incorrectly defaulted; preserve zero.':'');
    const events=host==='codex'?[{type:'thread.started',thread_id:'exercise'},{type:'turn.completed'}]:[{type:'assistant',message:{model:'claude-fable-5-1',content:[{type:'text',text:final}]}},{type:'result',subtype:'success'}];
    const trace=await put(exbase+'/coordinator/stdout.jsonl',events.map(e=>JSON.stringify(e)).join('\n'),'native_trace');
    const native=await put(exbase+'/native.jsonl',[{type:'session_meta',payload:{id:'exercise',source:'cli'}},{type:'event_msg',payload:{type:'task_started',turn_id:host+'-'+exercise}},{type:'turn_context',payload:{model:'gpt-6-astra',effort:'high'}},{type:'response_item',payload:{role:'assistant',content:[{text:final}]}},{type:'event_msg',payload:{type:'task_complete'}}].map(e=>JSON.stringify(e)).join('\n'),'native_trace');
    gate.objective.exercises.push(await put(exbase+'/result.json',{host,exercise,id:host+'-'+exercise,source_digest,execution:{code:0,started_at:'2026-09-11T00:00:00Z',stdout_sha256:trace.sha256.slice(7)},passed:true,artifact,trace,thread_id:'exercise',native_evidence:[{thread_id:'exercise',path:native.path,sha256:native.sha256}],args:[host==='codex'?'gpt-6-astra':'claude-fable-5-1','--effort','high'],final},'external_grade'));
   }
  }
 }
 get('INSTALLATION').evidence=installations.map(i=>i.manifest);
 const budget=await import(pathToFileURL(resolve('scripts/verify/campaign-budget.mjs')).href);
 const budgetPath=join(root,'evidence/budget.json');await budget.initializeBudget(budgetPath,{ceiling:100,authorization:'Synthetic budget fixture'});
 const sources=[generic];
 for(const gate of checks)for(const ref of [...(gate.objective.runs??[]),...(gate.objective.exercises??[])]){
  const run=JSON.parse(await readFile(join(root,ref.path),'utf8')),executions=run.exercise?1:2;
  const summary=await put(ref.path.replace('result.json','coordinator/summary.json'),run.execution);sources.push(summary);
  const fault=run.id==='codex-mechanical-candidate-false'?accountingFault:undefined;
  if(fault==='omitted')continue;
  await budget.reserveBudget(budgetPath,{id:run.id,purpose:'fixture',host:fault==='host'?'claude':run.host,worstCase:executions});
  await budget.settleBudget(budgetPath,run.id,{executions:fault==='count'?1:executions,source:join(root,fault==='source'?generic.path:summary.path)});
 }
 const br={path:'evidence/budget.json',sha256:hash(await readFile(budgetPath,'utf8')),kind:'command_output'};get('ACCOUNTING').objective={budget:br};get('ACCOUNTING').evidence=[br,...sources];
 const backups=[];for(const host of ['codex','claude']){const b={host,instructions:await put('evidence/'+host+'-rollback.txt','restore fixture','rollback_record'),skill:await put('evidence/'+host+'-skill.tar','fixture','rollback_record'),configuration:await put('evidence/'+host+'-config.json','fixture','rollback_record')};backups.push(b);get('ROLLBACK').evidence.push(b.instructions,b.skill,b.configuration);}get('ROLLBACK').objective={backups};
 return {root,userRoot,put,get,report:{schema_version:v.REPORT_SCHEMA,generated_at:'2026-09-11T00:00:00Z',source_revision:revision,source_manifest,source_digest,checks,installations,defaults,limitations:['Synthetic unit fixtures test validation mechanics only.']}};
}
afterEach(async()=>{await Promise.all(roots.splice(0).map(r=>rm(r,{recursive:true,force:true})));});
it('accepts a complete source-bound synthetic protocol fixture',async()=>{const f=await fixture();await expect(v.validateCompletionReport(f.report,{root:f.root,userRoot:f.userRoot,currentRevision:revision})).resolves.toMatchObject({valid:true,checks:v.CHECKLIST_IDS.length});});
it('rejects blockers, missing cases, zero tests, stale and incomplete source',async()=>{
 for(const [modify,error] of [
  [(f:any)=>f.get('CLAUDE-PILOT').status='blocked','CHECK_NOT_PASSED'],
  [(f:any)=>f.get('CODEX-PILOT').objective.runs.pop(),'HOST_RUNS_INCOMPLETE'],
  [(f:any)=>f.get('OFFLINE').objective.test_count=0,'OFFLINE_CHECK_UNVERIFIED'],
  [(f:any)=>f.report.source_revision='b'.repeat(40),'SOURCE_REVISION_MISMATCH'],
  [(f:any)=>f.report.source_manifest.pop(),'SOURCE_MANIFEST_INCOMPLETE_OR_CHANGED']
 ] as const){const f=await fixture();modify(f);await expect(v.validateCompletionReport(f.report,{root:f.root,userRoot:f.userRoot,currentRevision:revision})).rejects.toThrow(error);}
});
it('rejects arbitrary traces and failed grades even after their hashes are updated',async()=>{
 for(const badTrace of [true,false]){const f=await fixture();const gate=f.get('CODEX-LIVE'),ref=gate.objective.runs[0],r=JSON.parse(await readFile(join(f.root,ref.path),'utf8'));
  if(badTrace){const path=ref.path.replace('result.json','coordinator/stdout.jsonl');const trace=await f.put(path,'native trace\n','native_trace');r.execution.stdout_sha256=trace.sha256.slice(7);gate.evidence=gate.evidence.map((x:any)=>x.path===path?trace:x);}else r.after.passed=false;
  const updated=await f.put(ref.path,r,'external_grade');gate.objective.runs=[updated];gate.evidence=gate.evidence.map((x:any)=>x.path===ref.path?updated:x);
  await expect(v.validateCompletionReport(f.report,{root:f.root,userRoot:f.userRoot,currentRevision:revision})).rejects.toThrow(badTrace?'NATIVE_TRACE_INVALID':'HOST_RUN_FAILED');
 }
});
it('rejects mismatched personal install paths and nested model decoys',async()=>{
 const a=await fixture();a.report.installations[0]!.installed.path=join(a.root,'skills/delegate');await expect(v.validateCompletionReport(a.report,{root:a.root,userRoot:a.userRoot,currentRevision:revision})).rejects.toThrow('INSTALLATION_PATH_INVALID');
 const b=await fixture(),cfg=b.report.defaults[1]!,bytes=JSON.stringify({model:'fable',nested:{model:'sonnet'}});await writeFile(cfg.path,bytes);cfg.sha256=hash(bytes);await expect(v.validateCompletionReport(b.report,{root:b.root,userRoot:b.userRoot,currentRevision:revision})).rejects.toThrow('DEFAULT_MODEL_MISMATCH');
});

it('rejects missing, tampered, stale-offline and unreconciled evidence',async()=>{
 for(const scenario of ['missing','tampered','stale','accounting','rollback','source']){
  const f=await fixture();let error='';
  if(scenario==='missing'){await rm(join(f.root,'evidence/generic.json'));error='EVIDENCE_MISSING';}
  if(scenario==='tampered'){await writeFile(join(f.root,'evidence/generic.json'),'changed');error='EVIDENCE_HASH_MISMATCH';}
  if(scenario==='stale'){const gate=f.get('OFFLINE'),command=gate.objective.commands[0],ref=await f.put(command.evidence.path,{exit_code:0,source_digest:'sha256:'+'0'.repeat(64)});command.evidence=ref;gate.evidence=gate.evidence.map((r:any)=>r.path===ref.path?ref:r);error='OFFLINE_COMMAND_EXIT_MISMATCH';}
  if(scenario==='accounting'){f.get('ACCOUNTING').objective={};error='BUDGET_EVIDENCE_REQUIRED';}
  if(scenario==='rollback'){f.get('ROLLBACK').objective.backups.pop();error='ROLLBACK_BACKUPS_REQUIRED';}
  if(scenario==='source'){await writeFile(join(f.root,'skills/delegate/SKILL.md'),'new source');error='SOURCE_MANIFEST_INCOMPLETE_OR_CHANGED';}
  await expect(v.validateCompletionReport(f.report,{root:f.root,userRoot:f.userRoot,currentRevision:revision})).rejects.toThrow(error);
 }
});

it('holds comparable higher aggregate candidate cost and leaves unknown cost unknown',()=>{
 const runs=['mechanical','bug','multicomponent','planning'].flatMap(name=>['candidate','baseline'].map(arm=>({name,arm,cost:{kind:'native_api_equivalent_estimate',value:arm==='candidate'?2:1}})));
 expect(v.increasedComparableCost(runs)).toBe(true);
 runs[0]!.cost.kind='unknown';expect(v.increasedComparableCost(runs)).toBe(false);
});
it('rejects native execution masquerading as review and duplicate exercise kinds',async()=>{
 const f=await fixture();const gate=f.get('CODEX-LIVE'),ref=gate.objective.runs[0],run=JSON.parse(await readFile(join(f.root,ref.path),'utf8'));const child=run.native_evidence[1];
 let bytes=await readFile(join(f.root,child.path),'utf8');bytes=bytes.replace('reviewer','executor');await writeFile(join(f.root,child.path),bytes);child.sha256=hash(bytes);
 const changed=await f.put(ref.path,run,'external_grade');gate.objective.runs=[changed];gate.evidence=gate.evidence.map((r:any)=>r.path===ref.path?changed:r);
 await expect(v.validateCompletionReport(f.report,{root:f.root,userRoot:f.userRoot,currentRevision:revision})).rejects.toThrow('FRESH_NATIVE_REVIEW_REQUIRED');
 const g=await fixture(),pilot=g.get('CODEX-PILOT'),r=pilot.objective.exercises[1],exercise=JSON.parse(await readFile(join(g.root,r.path),'utf8'));exercise.exercise='simple_audit';exercise.final='PASS';pilot.objective.exercises[1]=await g.put(r.path,exercise,'external_grade');
 await expect(v.validateCompletionReport(g.report,{root:g.root,userRoot:g.userRoot,currentRevision:revision})).rejects.toThrow('HOST_EXERCISES_REQUIRED');
});

it('rejects wrong or missing Codex coordinator effort and saved default effort',async()=>{
 for(const effort of ['high',null]){
  const f=await fixture(),gate=f.get('CODEX-LIVE'),ref=gate.objective.runs[0],run=JSON.parse(await readFile(join(f.root,ref.path),'utf8'));
  const parent=run.native_evidence[0],events=(await readFile(join(f.root,parent.path),'utf8')).split('\n').map(s=>JSON.parse(s));
  for(const event of events)if(event.type==='turn_context')event.payload.effort=effort;
  const bytes=events.map(e=>JSON.stringify(e)).join('\n');await writeFile(join(f.root,parent.path),bytes);parent.sha256=hash(bytes);
  const changed=await f.put(ref.path,run,'external_grade');gate.objective.runs=[changed];gate.evidence=gate.evidence.map((r:any)=>r.path===ref.path?changed:r);
  await expect(v.validateCompletionReport(f.report,{root:f.root,userRoot:f.userRoot,currentRevision:revision})).rejects.toThrow('NATIVE_EFFORT_MISMATCH');
  const g=await fixture(),cfg=g.report.defaults[0]!,config='model = "gpt-5.6-terra"\n'+(effort?'model_reasoning_effort = "'+effort+'"\n':'');await writeFile(cfg.path,config);cfg.sha256=hash(config);
  await expect(v.validateCompletionReport(g.report,{root:g.root,userRoot:g.userRoot,currentRevision:revision})).rejects.toThrow('DEFAULT_EFFORT_MISMATCH');
 }
});
it('recomputes sampled mechanical audits when an observation omits or denies the audit',async()=>{
 const {auditTask}=await import('../../skills/delegate/scripts/local-learning.mjs');
 let taskId='';for(let i=0;!taskId;i++)if(auditTask('sample-'+i))taskId='sample-'+i;
 for(const audit of [false,undefined]){
  const f=await fixture(),gate=f.get('CODEX-PILOT'),ref=gate.objective.runs[0],run=JSON.parse(await readFile(join(f.root,ref.path),'utf8'));
  run.task_id=taskId;run.observations[0].data.task_id=taskId;run.observations[0].data.audit_required=audit;run.observations[0].data.policy_input.task_id=taskId;run.observations[0].data.review_requirement=reviewRequirement(run.observations[0].data.policy_input);delete run.observations[0].data.review;run.native_evidence=run.native_evidence.slice(0,1);
  const changed=await f.put(ref.path,run,'external_grade');gate.objective.runs[0]=changed;gate.evidence=gate.evidence.map((r:any)=>r.path===ref.path?changed:r);
  await expect(v.validateCompletionReport(f.report,{root:f.root,userRoot:f.userRoot,currentRevision:revision})).rejects.toThrow('FRONTIER_REVIEW_REQUIRED');
 }
});

async function changeRun(f:any,gateId:string,name:string,change:(run:any)=>Promise<void>|void){
 const gate=f.get(gateId),index=gate.objective.runs.findIndex((r:any)=>r.path.includes('-'+name+'-candidate-')),ref=gate.objective.runs[index];
 const run=JSON.parse(await readFile(join(f.root,ref.path),'utf8'));await change(run);
 const updated=await f.put(ref.path,run,'external_grade');gate.objective.runs[index]=updated;gate.evidence=gate.evidence.map((r:any)=>r.path===ref.path?updated:r);
}
it('requires frontier planning execution without requiring a second review',async()=>{
 const f=await fixture();
 for(const host of ['CODEX','CLAUDE'])await changeRun(f,host+'-PILOT','planning',run=>{delete run.observations[0].data.review;});
 await expect(v.validateCompletionReport(f.report,{root:f.root,userRoot:f.userRoot,currentRevision:revision})).resolves.toMatchObject({valid:true});
 await changeRun(f,'CODEX-PILOT','planning',run=>{run.native_evidence=run.native_evidence.slice(0,1);});
 await expect(v.validateCompletionReport(f.report,{root:f.root,userRoot:f.userRoot,currentRevision:revision})).rejects.toThrow('NATIVE_FRONTIER_DECISION_REQUIRED');
});
it('rejects relabelled implementation and fabricated review exemptions',async()=>{
 for(const relabel of [true,false]){
  const f=await fixture();await changeRun(f,'CODEX-PILOT','multicomponent',run=>{
   const o=run.observations[0].data;if(relabel)o.policy_input.work_type='pdf_analysis';else o.review_requirement={role:'none',required:false,reason:'Unnecessary'};
   delete o.review;
  });
  await expect(v.validateCompletionReport(f.report,{root:f.root,userRoot:f.userRoot,currentRevision:revision})).rejects.toThrow(relabel?'OBSERVATION_CLASSIFICATION_MISMATCH':'REVIEW_REQUIREMENT_MISMATCH');
 }
});
it('rejects frontier activity inside research or PDF analysis even with valid checks',async()=>{
 for(const name of ['research','pdf']){
  const f=await fixture();await changeRun(f,'CODEX-PILOT',name,async run=>{
   const child=run.native_evidence[1],bytes=(await readFile(join(f.root,child.path),'utf8')).replaceAll('gpt-5.6-terra','gpt-6-astra');
   await writeFile(join(f.root,child.path),bytes);child.sha256=hash(bytes);
  });
  await expect(v.validateCompletionReport(f.report,{root:f.root,userRoot:f.userRoot,currentRevision:revision})).rejects.toThrow('RESEARCH_PDF_FRONTIER_FORBIDDEN');
 }
});
it('validates one frozen host independently while the other is blocked',async()=>{
 const f=await fixture();f.get('CLAUDE-PILOT').status='blocked';
 await expect(v.validateHostProof(f.report,{host:'codex',root:f.root,currentRevision:revision,includeLive:true})).resolves.toMatchObject({valid:true,host:'codex',live:true});
 await expect(v.validateHostProof(f.report,{host:'claude',root:f.root,currentRevision:revision})).rejects.toThrow('CHECK_NOT_PASSED');
 await writeFile(join(f.root,'skills/delegate/SKILL.md'),'changed');
 await expect(v.validateHostProof(f.report,{host:'codex',root:f.root,currentRevision:revision})).rejects.toThrow('SOURCE_MANIFEST_INCOMPLETE_OR_CHANGED');
});
it('keeps original checklist IDs and requires policy-specific evidence gates',async()=>{
 expect(v.CHECKLIST_IDS).toContain('RESEARCH-PDF');expect(v.CHECKLIST_IDS).toContain('POLICY');expect(new Set(v.CHECKLIST_IDS).size).toBe(v.CHECKLIST_IDS.length);
 const f=await fixture();f.report.checks=f.report.checks.filter((c:any)=>c.id!=='RESEARCH-PDF');
 await expect(v.validateCompletionReport(f.report,{root:f.root,userRoot:f.userRoot,currentRevision:revision})).rejects.toThrow('CHECKLIST_COUNT_INVALID');
});
it('rejects missing or tampered preserved observation checks',async()=>{
 for(const missing of [true,false]){
  const f=await fixture();await changeRun(f,'CODEX-PILOT','research',async run=>{
   if(missing)run.observations[0].data.check_evidence=[];
   else await writeFile(join(f.root,'evidence',run.id,'evidence/checks.txt'),'tampered');
  });
  await expect(v.validateCompletionReport(f.report,{root:f.root,userRoot:f.userRoot,currentRevision:revision})).rejects.toThrow(missing?'CHECK_EVIDENCE_REQUIRED':'OBSERVATION_EVIDENCE_HASH_MISMATCH');
 }
});
it('accepts source work with unavailable frontier identity and uses cheap sampled reviewers',async()=>{
 const f=await fixture();
 let sampled='';for(let i=0;!sampled;i++)if(auditTask('doc-'+i))sampled='doc-'+i;
 for(const host of ['CODEX','CLAUDE'])for(const name of ['research','pdf'])await changeRun(f,host+'-PILOT',name,run=>{
  const o=run.observations[0].data;o.frontier=null;run.task_id=sampled;o.task_id=sampled;o.policy_input.task_id=sampled;o.review_requirement=reviewRequirement(o.policy_input);
  expect(o.review_requirement.role).toBe('economy');
 });
 await expect(v.validateCompletionReport(f.report,{root:f.root,userRoot:f.userRoot,currentRevision:revision})).resolves.toMatchObject({valid:true});
});

it('validates single accepted-decision refs and rejects exercise identity or verdict claims without native proof',async()=>{
 const f=await fixture(),gate=f.get('CODEX-PILOT'),ref=gate.objective.runs[0],r=JSON.parse(await readFile(join(f.root,ref.path),'utf8'));
 r.observations[0].data.policy_input.decision_evidence={path:'checks.txt',digest:hash('checked')};const updated=await f.put(ref.path,r,'external_grade');gate.objective.runs[0]=updated;gate.evidence=gate.evidence.map((x:any)=>x.path===ref.path?updated:x);
 await expect(v.validateCompletionReport(f.report,{root:f.root,userRoot:f.userRoot,currentRevision:revision})).resolves.toMatchObject({valid:true});
 const ex=gate.objective.exercises[0],value=JSON.parse(await readFile(join(f.root,ex.path),'utf8'));value.native_evidence=[];gate.objective.exercises[0]=await f.put(ex.path,value,'external_grade');
 await expect(v.validateCompletionReport(f.report,{root:f.root,userRoot:f.userRoot,currentRevision:revision})).rejects.toThrow('EXERCISE_NATIVE_IDENTITY_REQUIRED');
});
it('rejects claimed Claude child effort without native control evidence',async()=>{
 const f=await fixture(),gate=f.get('CLAUDE-LIVE'),ref=gate.objective.runs[0],r=JSON.parse(await readFile(join(f.root,ref.path),'utf8')),path=ref.path.replace('result.json','coordinator/stdout.jsonl');
 const events=(await readFile(join(f.root,path),'utf8')).split('\n').map(s=>JSON.parse(s));delete events[0].message.content[0].input.effort;
 const trace=await f.put(path,events.map(e=>JSON.stringify(e)).join('\n'),'native_trace');r.execution.stdout_sha256=trace.sha256.slice(7);const updated=await f.put(ref.path,r,'external_grade');gate.objective.runs[0]=updated;gate.evidence=gate.evidence.map((x:any)=>x.path===ref.path?updated:x.path===path?trace:x);
 await expect(v.validateCompletionReport(f.report,{root:f.root,userRoot:f.userRoot,currentRevision:revision})).rejects.toThrow('FRESH_NATIVE_REVIEW_REQUIRED');
});

it.each([['omitted','HOST_EXECUTION_NOT_BUDGETED'],['host','HOST_EXECUTION_NOT_BUDGETED'],['source','HOST_BUDGET_SOURCE_MISMATCH'],['count','HOST_EXECUTION_COUNT_MISMATCH']] as const)('rejects %s campaign accounting in full and per-host acceptance',async(fault,error)=>{
 const f=await fixture(fault);
 await expect(v.validateCompletionReport(f.report,{root:f.root,userRoot:f.userRoot,currentRevision:revision})).rejects.toThrow(error);
 await expect(v.validateHostProof(f.report,{host:'codex',root:f.root,currentRevision:revision})).rejects.toThrow(error);
});
it('counts native continuations independently of a run summary or declared ledger',async()=>{
 const f=await fixture();await changeRun(f,'CODEX-PILOT','mechanical',async run=>{
  const parent=run.native_evidence[0];
  const bytes=await readFile(join(f.root,parent.path),'utf8')+'\n'+JSON.stringify({type:'event_msg',payload:{type:'task_started',turn_id:'additional-continuation'}});
  await writeFile(join(f.root,parent.path),bytes);parent.sha256=hash(bytes);
 });
 await expect(v.validateHostProof(f.report,{host:'codex',root:f.root,currentRevision:revision})).rejects.toThrow('HOST_EXECUTION_COUNT_MISMATCH');
});
