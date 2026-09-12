import {it,expect} from 'vitest';
import {writeFile,rm,readFile} from 'node:fs/promises';
import {join} from 'node:path';
// @ts-expect-error Maintainer-only executable module.
import {preparePilot,gradePilot,launchArgs,pilotPrompt} from '../../scripts/verify/cheaper-pilot.mjs';
it('permits local completion evidence in the bug user prompt without widening deliverable scope',()=>{
 const task='Edit only: src/fix.ts. Do not install dependencies, edit configuration or create files. Tests are held out.';
 const p={pilot_name:'bug',pilot_arm:'candidate',directory:'/workspace',fixtureRoot:'/workspace/source',task:{task}};
 const prompt=pilotPrompt(p,'stable-task',3);
 expect(prompt).toContain('Edit only: src/fix.ts.');
 expect(prompt).toContain('Do not install dependencies, edit configuration or create deliverable files.');
 expect(prompt).toContain('Local check and completion evidence may be created only in the designated session evidence directory outside the deliverable tree.');
 expect(prompt).not.toMatch(/delegate|subagent|frontier/i);
 expect(p.task.task).toBe(task);
 expect(()=>pilotPrompt({...p,task:{task:'Changed restriction'}},'stable-task',3)).toThrow('BUG_PROMPT_RESTRICTION_CHANGED');
});
it('isolates planning evidence and rejects the archived answer',async()=>{
 const p=await preparePilot('codex','planning','candidate');
 try{
  expect(p.task.task).not.toMatch(/delegate|subagent|frontier/i);
  expect(pilotPrompt(p,'stable-task',3)).not.toMatch(/delegate|subagent|frontier/i);
  expect(pilotPrompt(p,'stable-task',3)).toContain('Task identifier: stable-task.');
  expect(await readFile(join(p.directory,'AGENTS.md'),'utf8')).toContain(p.skillPath+'/SKILL.md');
  const session=JSON.parse(await readFile(join(p.directory,'.delegate/session.json'),'utf8'));expect(session.cwd).toBe(p.directory);expect(session.artifact_files).toEqual(['decision.json']);
  expect((await gradePilot(p)).passed).toBe(false);
  const answer={expected_total:3,authoritative_source:'current-policy.md',rejected_source:'archived-proposal.md',cause:'Truthiness defaults incorrectly replace explicit zero.',implementation_plan:['Use shared normalization once','Remove consumer defaults'],checks:['zero preserved','null defaults','absent defaults','all consumer totals agree']};
  await writeFile(join(p.fixtureRoot,'decision.json'),JSON.stringify(answer));
  expect((await gradePilot(p)).passed).toBe(true);
  await writeFile(join(p.fixtureRoot,'decision.json'),JSON.stringify({...answer,authoritative_source:'current-policy.md: signed policy',rejected_source:'archived-proposal.md: never adopted'}));
  expect((await gradePilot(p)).passed).toBe(true);
  await writeFile(join(p.fixtureRoot,'decision.json'),JSON.stringify({...answer,expected_total:4}));
  expect((await gradePilot(p)).passed).toBe(false);
 }finally{await rm(p.directory,{recursive:true,force:true});}
});
it('fresh installed sessions omit model and effort overrides; reviews stay explicit',()=>{
 for(const host of ['claude','codex']){
  const args=launchArgs(host,'candidate','/tmp/fixture',{installed:true});
  expect(args).not.toContain('--model');expect(args).not.toContain('-m');
  const review=launchArgs(host,'candidate','/tmp/fixture',{installed:true,review:true});
  expect(review).toContain(host==='codex'?'gpt-6-astra':'claude-fable-5-1');
 }
});
it('does not mistake quoted source for quota errors and counts continuations',async()=>{
 const {providerLimited,pilotLedger}=await import(new URL('../../scripts/verify/cheaper-pilot.mjs',import.meta.url).href);
 expect(providerLimited([{type:'item.completed',item:{type:'command_execution',aggregated_output:"return gap('HOST_LIMIT_REACHED')"}}])).toBe(false);
 expect(providerLimited([{type:'rate_limit_event',rate_limit_info:{status:'rejected'}}])).toBe(true);
 const at='2026-09-11T00:00:00Z';
 const event={type:'item.completed',item:{id:'resume1',type:'collab_tool_call',tool:'send_input',receiver_thread_ids:['child']}};
 const ledger=pilotLedger('codex',JSON.stringify({at,line:JSON.stringify(event)}),{startedAt:at,endedAt:at});
 expect(ledger.executions).toBe(2);
});
it('corrects only demonstrated false provider stops without rewriting the original entry',async()=>{
 const {initializeBudget,reserveBudget,settleBudget,correctFalseProviderLimit,readBudget}=await import(new URL('../../scripts/verify/campaign-budget.mjs',import.meta.url).href);
 const {mkdtemp,mkdir}=await import('node:fs/promises');const {tmpdir}=await import('node:os');const root=await mkdtemp(join(tmpdir(),'budget-correction-'));
 try{
  const p=join(root,'budget.json');await initializeBudget(p,{ceiling:2,authorization:'fixture'});await mkdir(join(root,'run'));
  await writeFile(join(root,'run','summary.json'),JSON.stringify({code:0,timed_out:false}));await writeFile(join(root,'run','stdout.jsonl'),JSON.stringify({type:'turn.completed'})+'\n');
  await reserveBudget(p,{id:'one',purpose:'test',host:'codex',worstCase:1});await settleBudget(p,'one',{executions:1,source:join(root,'run','summary.json'),providerLimit:true});
  await correctFalseProviderLimit(p,'one');const b=await readBudget(p);expect(b.stopped_hosts).toEqual([]);expect(b.entries[0].providerLimit).toBe(true);expect(b.executions).toBe(1);
  await writeFile(join(root,'run','stdout.jsonl'),JSON.stringify({type:'turn.failed'})+'\n');await expect(readBudget(p)).rejects.toThrow('BUDGET_TAMPERED');
 }finally{await rm(root,{recursive:true,force:true});}
});

it('snapshots resumed native threads once while retaining every execution in the ledger',async()=>{
 const {nativeThreadIds}=await import(new URL('../../scripts/verify/cheaper-pilot.mjs',import.meta.url).href);
 expect(nativeThreadIds('parent',{rows:[{receiver_thread_ids:['child']},{receiver_thread_ids:['child']},{receiver_thread_ids:['other']}]})).toEqual(['parent','child','other']);
});
it('reconciles hidden native launches and deduplicates inherited turn history',async()=>{
 const {countNativeExecutions}=await import(new URL('../../scripts/verify/campaign-budget.mjs',import.meta.url).href);
 const {mkdtemp}=await import('node:fs/promises');const {tmpdir}=await import('node:os');const {createHash}=await import('node:crypto');const root=await mkdtemp(join(tmpdir(),'native-count-'));
 try{
  const put=async(name:string,events:any[])=>{const bytes=events.map(e=>JSON.stringify(e)).join('\n'),path=join(root,name);await writeFile(path,bytes);return {path,sha256:'sha256:'+createHash('sha256').update(bytes).digest('hex')};};
  const turn=(turn_id:string)=>({type:'event_msg',payload:{type:'task_started',turn_id}}),launch={type:'response_item',payload:{type:'function_call',name:'spawn_agent',call_id:'launch1'}};
  const parent=await put('parent.jsonl',[{type:'session_meta',payload:{id:'parent',source:'exec'}},turn('turn1'),launch]);
  const child=await put('child.jsonl',[{type:'session_meta',payload:{id:'child',source:{subagent:{thread_spawn:{parent_thread_id:'parent'}}}}},turn('turn1'),launch,turn('turn2'),turn('turn3')]);
  expect(await countNativeExecutions([parent,child])).toEqual({executions:3,root_id:'parent',uncertain:false});
  expect((await countNativeExecutions([parent])).uncertain).toBe(true);
  await writeFile(child.path,'tampered');await expect(countNativeExecutions([parent,child])).rejects.toThrow('NATIVE_TRACE_TAMPERED');
 }finally{await rm(root,{recursive:true,force:true});}
});

it('checks research and actual PDF outputs without requiring frontier',async()=>{
 for(const name of ['research','pdf']){const p=await preparePilot('codex',name,'candidate');try{
  expect(pilotPrompt(p,'stable-task',1)).not.toMatch(/delegate|subagent|frontier/i);
  expect((await gradePilot(p)).passed).toBe(false);
  const good=name==='research'?{authoritative_source:'current-policy.md',superseded_source:'archived-proposal.md',zero_is_valid:true,default_quantity:1,unresolved_facts:[]}:{vendor:'Northwind Supplies',invoice_id:'INV-204',subtotal:120,credit:20,total_due:100,currency:'USD',source_page:1};
  if(name==='pdf')expect((await readFile(join(p.fixtureRoot,'invoice.pdf'),'utf8')).startsWith('%PDF-1.4')).toBe(true);
  await writeFile(join(p.fixtureRoot,p.task.owned_files[0]),JSON.stringify(good));expect((await gradePilot(p)).passed).toBe(true);
  if(name==='research'){
   expect(p.task.task).toContain('exact bare filenames, with no explanatory text');
   for(const field of ['authoritative_source','superseded_source'] as const){
    for(const value of ['wrong-source.md',`${good[field]} — explanatory text`]){
     await writeFile(join(p.fixtureRoot,'findings.json'),JSON.stringify({...good,[field]:value}));
     expect((await gradePilot(p)).passed).toBe(false);
    }
   }
  }
  await writeFile(join(p.fixtureRoot,p.task.owned_files[0]),JSON.stringify({...good,total_due:120,zero_is_valid:false}));expect((await gradePilot(p)).passed).toBe(false);
 }finally{await rm(p.directory,{recursive:true,force:true});}}
});
it('amends an approved budget without resetting history or accepting a tampered ceiling',async()=>{
 const {initializeBudget,reserveBudget,settleBudget,amendBudget,readBudget}=await import(new URL('../../scripts/verify/campaign-budget.mjs',import.meta.url).href);
 const {mkdtemp}=await import('node:fs/promises');const {tmpdir}=await import('node:os');const root=await mkdtemp(join(tmpdir(),'budget-amendment-'));
 try{const p=join(root,'budget.json');await initializeBudget(p,{ceiling:50,authorization:'initial'});const original=await readFile(p+'.approval.json','utf8');
 await reserveBudget(p,{id:'original',purpose:'test',host:'codex',worstCase:1});await settleBudget(p,'original',{executions:1,source:'fixture'});
 await amendBudget(p,{ceiling:100,authorization:'User added 50'});const b=await readBudget(p);expect(b.ceiling).toBe(100);expect(b.executions).toBe(1);expect(b.entries).toHaveLength(1);expect(await readFile(p+'.approval.json','utf8')).toBe(original);
 await writeFile(p,JSON.stringify({...b,ceiling:101}));await expect(readBudget(p)).rejects.toThrow('BUDGET_TAMPERED');
 }finally{await rm(root,{recursive:true,force:true});}
});

it('keeps harvested deliverable paths relative to the session workspace for preserved evidence',async()=>{
 const {pilotArtifactFiles}=await import(new URL('../../scripts/verify/cheaper-pilot.mjs',import.meta.url).href);
 expect(pilotArtifactFiles({directory:'/workspace',fixtureRoot:'/workspace/fixture/candidate',task:{owned_files:['src/fix.ts']}})).toEqual(['fixture/candidate/src/fix.ts']);
});
