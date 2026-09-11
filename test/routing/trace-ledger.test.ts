import {describe,it,expect} from 'vitest';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
const {executionLedger}=await import(pathToFileURL(resolve('scripts/verify/trace-ledger.mjs')).href);
const {classifyTrial}=await import(pathToFileURL(resolve('scripts/verify/installed-delegate.mjs')).href);
const excerpt=(name:string)=>readFile(resolve(`test/fixtures/traces/${name}.timed.jsonl`),'utf8');
const at=(n:number)=>new Date(Date.UTC(2026,8,10)+n*1000).toISOString();
const timed=(events:any[])=>events.map((event,i)=>JSON.stringify({at:at(i),line:JSON.stringify(event)})).join('\n');
const use=(id:string,name:string,input:any)=>({type:'assistant',message:{model:'claude-opus-5',content:[{type:'tool_use',id,name,input}]}});
const done=(id:string,extra={})=>({type:'user',message:{content:[{type:'tool_result',tool_use_id:id,...extra}]}});
describe('trace-derived execution ledger',()=>{
 it('binds the real Claude alias to its usage key and does not sum counters',async()=>{
  const ledger=executionLedger('claude',await excerpt('claude-mechanical'));
  expect(ledger.executions).toBe(2);
  expect(ledger.rows.map((r:any)=>r.model)).toEqual(['claude-opus-5','claude-haiku-4-5-20251001']);
  expect(ledger.rows[1].usage.costBasis).toBe('list');expect(ledger.rows[1].ended_at).not.toBeNull();
  expect(ledger.rows[0].usage_scope).toBe('model_total');
  expect(ledger).not.toHaveProperty('total_tokens');
 });
 it('reads real helper calls and leaves Codex child identity and usage unknown without bound receipts',async()=>{
  expect(executionLedger('claude',await excerpt('claude-helpers')).helper_calls.map((c:any)=>c.command)).toEqual(['start','capture']);
  const text=await excerpt('codex-mechanical'),ledger=executionLedger('codex',text);
  expect(ledger.rows).toHaveLength(2);expect(ledger.rows[1].usage).toBeNull();expect(ledger.rows[1].model).toBeNull();
  expect(ledger.rows[0].usage_scope).toBe('thread_total_child_inclusion_unknown');
  const receipt={run_binding:'matched',value:{attempts:[{thread_id:ledger.rows[1].receiver_thread_ids[0],configured:{model:'gpt-5.3-codex-spark'},role:'worker'}]}};
  expect(executionLedger('codex',text,{receipts:[receipt]}).rows[1].model_source).toBe('receipt_configured');
  expect(executionLedger('codex',text,{receipts:[{...receipt,run_binding:'mismatch'}]}).rows[1].model).toBeNull();
  const unique={run_binding:'matched',value:{attempts:[{role:'worker',configured:{model:'gpt-5.3-codex-spark'}}]}};
  expect(executionLedger('codex',text,{receipts:[unique,unique]}).rows[1].model_source).toBe('receipt_configured');
  const stdout=(await excerpt('codex-blocked')).trim().split('\n').map(l=>JSON.parse(l).line).join('\n');
  expect(classifyTrial({host:'codex',stdout})).toBe('blocked_provider_limit');
 });
 it('counts failed child CLI launches and labels mechanical rework after inspection',()=>{
  const ledger=executionLedger('claude',timed([use('a','Agent',{model:'haiku'}),done('a'),use('read','Read',{file_path:'/trial/allowed.ts'}),use('b','Agent',{model:'haiku'}),done('b'),use('cli','Bash',{command:'codex exec -m gpt-5.5 task'}),done('cli',{is_error:true}),use('route','Read',{file_path:'/trial/routing-pack.json'})]),{fixtureRoot:'/trial',allowedPaths:['allowed.ts']});
  expect(ledger.executions).toBe(4);expect(ledger.failed_launches).toBe(1);expect(ledger.rework_heuristic).toBe(2);expect(ledger.routing_reads).toHaveLength(1);
  const failed=executionLedger('claude',timed([use('cli','Bash',{command:'claude -p task'}),done('cli',{content:'Exit code: 127'})]));
  expect(failed.failed_launches).toBe(1);
 });
 it.each(['claude','codex'])('splits %s process duration at the first finish/record call',host=>{
  const command='node /skill/scripts/local-learning.mjs finish /trial/finish-input.json';
  const middle=host==='claude'?use('finish','Bash',{command}):{type:'item.started',item:{id:'finish',type:'command_execution',command}};
  const ledger=executionLedger(host,timed([{type:'start'},middle,{type:'end'}]),{startedAt:at(0),endedAt:at(4)});
  expect(ledger.task_wall_clock_ms).toBe(1000);expect(ledger.helper_tail_ms).toBe(3000);expect(ledger.task_wall_clock_ms+ledger.helper_tail_ms).toBe(ledger.duration_ms);
 });
 it('does not duplicate model aggregate usage on repeated child rows or count nested tool echoes',()=>{
  const ledger=executionLedger('claude',timed([use('a','Agent',{model:'haiku'}),done('a'),use('b','Agent',{model:'haiku'}),{...use('a','Agent',{model:'haiku'}),parent_tool_use_id:'a'},{type:'result',modelUsage:{'claude-haiku-4-5-20251001':{outputTokens:123,costBasis:'list'}}}]));
  expect(ledger.executions).toBe(3);expect(ledger.rows.slice(1).every((r:any)=>r.usage===null)).toBe(true);
 });
 it('counts distinct nested launches and flags interrupted Codex spawns as incomplete',()=>{
  expect(executionLedger('claude',timed([use('a','Agent',{}),{...use('nested','Agent',{}),parent_tool_use_id:'a'}])).executions).toBe(3);
  const interrupted=executionLedger('codex',timed([{type:'item.started',item:{id:'spawn',type:'collab_tool_call',tool:'spawn_agent'}}]));
  expect(interrupted.limitations.join(' ')).toContain('count may be incomplete');
 });
 it('stamps split UTF-8 stdout without changing any original bytes or digest',async()=>{
  const {execute}=await import(pathToFileURL(resolve('scripts/verify/host-evidence.mjs')).href);
  const directory=await mkdtemp(join(tmpdir(),'trace-stamp-'));
  try{
   const raw=Buffer.from('first\r\n{"text":"é"}\nlast');
   const script=`const b=Buffer.from(${JSON.stringify(raw.toString('base64'))},'base64');process.stdout.write(b.subarray(0,17));setTimeout(()=>process.stdout.write(b.subarray(17)),10);`;
   const result=await execute(process.execPath,['-e',script],directory,'',join(directory,'execution'));
   expect(await readFile(join(directory,'execution/stdout.jsonl'))).toEqual(raw);
   expect(result.stdout_sha256).toBe(createHash('sha256').update(raw).digest('hex'));
   const stamps=(await readFile(join(directory,'execution/stdout.timed.jsonl'),'utf8')).trim().split('\n').map(l=>JSON.parse(l));
   expect(stamps.map(s=>s.line)).toEqual(['first\r','{"text":"é"}','last']);
   expect(stamps.every(s=>Number.isFinite(Date.parse(s.at)))).toBe(true);
  }finally{await rm(directory,{recursive:true,force:true});}
 });
});

it('waits for background completion instead of treating a launch acknowledgement as completion',()=>{
 const ack={...done('worker'),tool_use_result:{backgroundTaskId:'task-1'}};
 const events=[use('worker','Bash',{command:'claude -p --model claude-haiku-4-5-20251001'}),ack,use('inspect','Read',{file_path:'/fixture/quantity.mjs'}),use('repair','Bash',{command:'claude -p --model claude-haiku-4-5-20251001'}),{type:'system',subtype:'task_updated',task_id:'task-1',patch:{status:'completed'}},{...done('repair'),tool_use_result:{backgroundTaskId:'task-2'}},{type:'system',subtype:'task_notification',task_id:'task-2',tool_use_id:'repair',status:'stopped'}];
 const ledger=executionLedger('claude',timed(events),{fixtureRoot:'/fixture',allowedPaths:['quantity.mjs'],startedAt:at(0),endedAt:at(7)});
 expect(ledger.executions).toBe(3);expect(ledger.rework_heuristic).toBe(0);
 expect(ledger.rows[1]).toMatchObject({ended_at:at(4),completion_status:'completed',background_task_id:'task-1'});
 expect(ledger.rows[2]).toMatchObject({ended_at:at(6),completion_status:'stopped'});
});

it('charges extra matched receipt attempts when rejected launches have no exported host event',()=>{
 const at='2026-09-11T00:00:00.000Z';
 const lines=[{type:'item.completed',item:{id:'spawn',type:'collab_tool_call',tool:'spawn_agent',receiver_thread_ids:['worker'],status:'completed'}},{type:'turn.completed',usage:{input_tokens:1}}].map(e=>JSON.stringify({at,line:JSON.stringify(e)})).join('\n');
 const receipt={run_binding:'matched',value:{run_id:'run',attempts:[{attempt_id:'coordinator',role:'coordinator',outcome:'accepted'},{attempt_id:'failed-worker',role:'worker',outcome:'failed'},{attempt_id:'fallback',role:'worker',outcome:'accepted'}]}};
 const ledger=executionLedger('codex',lines,{receipts:[receipt,receipt],startedAt:at,endedAt:at});
 expect(ledger.executions).toBe(3);expect(ledger.failed_launches).toBe(1);
 expect(ledger.rows.at(-1)).toMatchObject({mechanism:'receipt_reported_attempt',budget_only:true,model:null,model_source:'agent_asserted_receipt'});
 expect(executionLedger('codex',lines,{receipts:[{...receipt,run_binding:'mismatch'}],startedAt:at,endedAt:at}).executions).toBe(2);
});

it('counts locally declared helper aliases and finds the legacy record boundary',()=>{
 const command='H=/trial/scripts/local-learning.mjs; node $H record input.json; node "${H}" advise followup.json';
 const ledger=executionLedger('claude',timed([{type:'start'},use('legacy','Bash',{command}),{type:'end'}]),{startedAt:at(0),endedAt:at(4)});
 expect(ledger.helper_calls.map((c:any)=>c.command)).toEqual(['record','advise']);
 expect(ledger.task_wall_clock_ms).toBe(1000);expect(ledger.helper_tail_ms).toBe(3000);
});
