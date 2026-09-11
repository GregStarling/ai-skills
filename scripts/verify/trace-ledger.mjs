import {createHash} from 'node:crypto';
import {resolve} from 'node:path';

const digest=value=>'sha256:'+createHash('sha256').update(value).digest('hex');
const array=value=>Array.isArray(value)?value:[];
const failed=value=>value?.is_error===true||(typeof value?.exit_code==='number'&&value.exit_code!==0)||value?.status==='failed';
const childCli=/(?:^|&&|\|\||[;\n|])\s*(?:exec\s+)?(claude\s+(?:-p|--print)|codex\s+exec)\b/g;
const helper=/local-learning\.mjs["']?\s+(start|lookup|capture|finish|record|advise|status|correct|reset|disable)\b/g;

/** Receive-time accounting. Counters are reported per scope, never added across executions. */
export function executionLedger(host,timedJsonlText,{fixtureRoot='',allowedPaths=[],receipts=[],startedAt,endedAt}={}){
 if(!['claude','codex'].includes(host))throw Error('UNKNOWN_TRACE_HOST');
 const limitations=[],events=[];
 const matchedReceipts=[...new Map(receipts.filter(r=>r.run_binding==='matched').map(r=>[JSON.stringify(r.value),r.value])).values()];
 const receiptAttempts=[...new Map(matchedReceipts.flatMap(r=>array(r?.attempts).map(a=>[`${r.run_id}:${a.attempt_id}`,a]))).values()];
 for(const line of timedJsonlText.split('\n').filter(Boolean)){
  try{const envelope=JSON.parse(line),event=JSON.parse(envelope.line);if(!Number.isFinite(Date.parse(envelope.at)))throw Error();events.push({event,at:envelope.at,position:events.length});}
  catch{limitations.push('Malformed or untimed trace line omitted; execution count may be incomplete.');}
 }
 const first=startedAt??events[0]?.at??null,last=endedAt??events.at(-1)?.at??null;
 const rows=[{index:0,role:'coordinator',mechanism:'host_process',model:null,model_source:'unknown',started_at:first,ended_at:last,failed_launch:false,usage:null,counter_kind:'host_reported_counter'}];
 const tasks=new Map(),tools=new Map(),items=new Map(),seen=new Set(),reads=[],routing_reads=[],helper_calls=[];
 let boundary=null,result=null;
 const add=(row,position)=>{const value={index:rows.length,role:'worker',model:null,model_source:'unknown',ended_at:null,failed_launch:false,usage:null,counter_kind:'host_reported_counter',...row,_position:position,_endPosition:null};rows.push(value);return value;};
 function command(command,id,at,position,coordinator=true){
  if(typeof command!=='string')return;
  let helperCommand=command;
  for(const match of command.matchAll(/\b([A-Za-z_][A-Za-z0-9_]*)=([\"']?)([^\s;&|\"']*local-learning\.mjs)\2/g)){
   helperCommand=helperCommand.replace(new RegExp('\\$'+match[1]+'\\b|\\$\\{'+match[1]+'\\}','g'),()=>match[3]);
  }
  for(const match of helperCommand.matchAll(helper)){helper_calls.push({id,command:match[1],at});if(coordinator&&boundary===null&&['finish','record'].includes(match[1]))boundary=at;}
  if(coordinator&&allowedPaths.some(path=>command.includes(path)))reads.push(position);
  for(const match of command.matchAll(childCli)){
   const model=/(?:--model|-m)\s+["']?([\w.-]+)/.exec(command)?.[1]??null;
   const row=add({id,mechanism:'child_cli',model,model_source:model?'launch_configured':'unknown',started_at:at,command_digest:digest(command)},position);
   tools.set(id,[...(tools.get(id)??[]),row]);
  }
 }
 for(const {event:e,at,position} of events){
  if(e.type==='system'&&e.subtype==='init'&&typeof e.model==='string'&&rows[0].model===null){rows[0].model=e.model;rows[0].model_source='host_configured';}
  if(e.type==='assistant'&&!e.parent_tool_use_id&&!e.is_error&&!e.is_api_error_message&&typeof e.message?.model==='string'){rows[0].model=e.message.model;rows[0].model_source='host_reported';}
  if(e.type==='result')result=e;
  if(e.type==='turn.completed'){rows[0].usage=e.usage??null;rows[0].usage_scope='thread_total_child_inclusion_unknown';}
  if(host==='claude'){
   if(e.type==='system'&&e.subtype==='task_started'&&e.tool_use_id)tasks.set(e.task_id,e.tool_use_id);
   if(e.type==='system'&&['task_updated','task_notification'].includes(e.subtype)){
    const status=e.status??e.patch?.status,id=e.tool_use_id??tasks.get(e.task_id);
    if(['completed','failed','killed','stopped'].includes(status))for(const row of tools.get(id)??[]){row.ended_at=at;row._endPosition=position;row.completion_status=status;}
   }
   for(const c of array(e.message?.content)){
    if(c.type==='tool_use'&&e.type==='assistant'&&!seen.has(c.id)){
     seen.add(c.id);
     if(c.name==='Agent'){
      const row=add({id:c.id,mechanism:'Agent',model:c.input?.model??null,model_source:c.input?.model?'launch_configured':'unknown',started_at:at,prompt_digest:digest(c.input?.prompt??'')},position);tools.set(c.id,[row]);
     }
     if(c.name==='Bash')command(c.input?.command,c.id,at,position,!e.parent_tool_use_id);
     if(c.name==='Read'&&!e.parent_tool_use_id){
      const path=c.input?.file_path??'';
      if(/(?:^|\/)(routing-pack\.json|pack-format\.md)$/.test(path))routing_reads.push({id:c.id,path,at});
      if(allowedPaths.some(p=>path===p||resolve(fixtureRoot,p)===resolve(fixtureRoot,path)))reads.push(position);
     }
    }
    if(c.type==='tool_result')for(const row of tools.get(c.tool_use_id)??[]){if(e.tool_use_result?.backgroundTaskId){tasks.set(e.tool_use_result.backgroundTaskId,c.tool_use_id);row.background_task_id=e.tool_use_result.backgroundTaskId;continue;}row.ended_at=at;row._endPosition=position;row.failed_launch=failed(c)||failed(e.tool_use_result)||/Exit code:?\s*[1-9]\d*/i.test(typeof c.content==='string'?c.content:'');}
   }
  }else{
   const item=e.item;if(!item)continue;
   if(e.type==='item.started')items.set(item.id,{at,position,spawn:item.type==='collab_tool_call'&&item.tool==='spawn_agent'});
   if(item.type==='command_execution'&&['item.started','item.completed'].includes(e.type)&&!seen.has(item.id)){seen.add(item.id);command(item.command,item.id,at,position);}
   if(e.type==='item.completed'&&item.type==='command_execution')for(const row of tools.get(item.id)??[]){row.ended_at=at;row._endPosition=position;row.failed_launch=failed(item);}
   if(e.type==='item.completed'&&item.type==='collab_tool_call'&&item.tool==='spawn_agent'&&!seen.has(item.id)){
    seen.add(item.id);const start=items.get(item.id)??{at,position};
    const ids=array(item.receiver_thread_ids);
    const row=add({id:item.id,mechanism:'spawn_agent',started_at:start.at,receiver_thread_ids:ids,prompt_digest:digest(item.prompt??''),failed_launch:failed(item)||!ids.length,usage_scope:'thread_total_child_inclusion_unknown'},start.position);
    // Prefer an explicit launch/thread binding; a unique run-level match is handled below.
    const attempts=receiptAttempts;
    const matches=attempts.filter(a=>a.tool_call_id===item.id||ids.includes(a.thread_id)||ids.includes(a.session_id));
    if(matches.length===1&&matches[0].configured?.model){row.model=matches[0].configured.model;row.model_source='receipt_configured';row.role=matches[0].role==='reviewer'?'reviewer':'worker';row.receipt_role=matches[0].role??null;}
    if(row.failed_launch){row.ended_at=at;row._endPosition=position;}
   }
   if(e.type==='item.completed'&&item.type==='collab_tool_call')for(const row of rows.slice(1)){
    if(row.receiver_thread_ids?.some(id=>['completed','errored','shutdown'].includes(item.agents_states?.[id]?.status))){row.ended_at=at;row._endPosition=position;}
   }
  }
 }
 const children=rows.filter(row=>row.mechanism==='spawn_agent');
 const childAttempts=receiptAttempts.filter(a=>a.role!=='coordinator');
 if(host==='codex'&&children.length===1&&children[0].model===null&&childAttempts.length===1&&childAttempts[0].configured?.model){
  const row=children[0],attempt=childAttempts[0];row.model=attempt.configured.model;row.model_source='receipt_configured';row.receipt_binding='single_child_and_single_attempt_in_matched_run';row.role=attempt.role==='reviewer'?'reviewer':'worker';row.receipt_role=attempt.role;
 }
 // Receipts cannot establish served identity, but their extra attempts must consume
 // budget even when a host rejects a launch before exporting a tool event.
 const missingAttempts=Math.max(0,childAttempts.length-(rows.length-1));
 if(missingAttempts){
  const failedAttempts=childAttempts.filter(a=>a.outcome==='failed');
  const unobservedFailures=Math.max(0,failedAttempts.length-rows.filter(r=>r.failed_launch).length);
  for(let i=0;i<missingAttempts;i++)add({mechanism:'receipt_reported_attempt',budget_only:true,model:null,model_source:'agent_asserted_receipt',started_at:null,ended_at:null,failed_launch:i<unobservedFailures},events.length);
  limitations.push(`Charged ${missingAttempts} additional matched-receipt attempts absent from host tool events; agent-asserted budget evidence, not runtime identity.`);
 }
 if([...items].some(([id,item])=>item.spawn&&!seen.has(id)))limitations.push('Interrupted spawn event: execution count may be incomplete.');
 if(host==='claude'&&result?.subagent_stats?.spawned>rows.filter(row=>row.mechanism==='Agent').length)limitations.push('Host reports additional subagents: execution count may be incomplete.');
 if(host==='claude'&&result?.modelUsage){
  const usage=result.modelUsage;
  for(const row of rows){
   const candidates=Object.keys(usage).filter(key=>key===row.model||usage[key].canonicalModel===row.model||(row.model&&!row.model.startsWith('claude-')&&key.startsWith(`claude-${row.model}-`)));
   if(candidates.length===1){row.model=candidates[0];if(row.model_source==='launch_configured')row.model_source='launch_configured_usage_key';}
  }
  for(const row of rows){
   if(row.model&&usage[row.model]){
    row.usage_scope='model_total';
    if(rows.filter(r=>r.model===row.model).length===1){row.usage=usage[row.model];row.costBasis=usage[row.model].costBasis??null;}
    else limitations.push(`Model ${row.model} counters cover multiple executions; per-execution usage is unavailable.`);
   }
  }
 }else if(host==='claude')rows[0].usage=result?.usage??null;
 if(host==='codex')limitations.push('Codex child usage is unavailable; coordinator thread-total child inclusion is unknown. No counters are summed.');
 // ponytail: trace ordering is only a rework heuristic; maintainer artifact review decides quality.
 const rework=rows.slice(1).filter(row=>rows.slice(1).some(prior=>prior.role===row.role&&prior._endPosition!==null&&prior._endPosition<row._position&&reads.some(p=>p>prior._endPosition&&p<row._position))).length;
 const reportedExecutionLowerBound=host==='claude'&&Number.isSafeInteger(result?.subagent_stats?.spawned)?Math.max(rows.length,1+result.subagent_stats.spawned+rows.filter(row=>row.mechanism==='child_cli').length):rows.length;
 const duration=first&&last?Math.max(0,Date.parse(last)-Date.parse(first)):null;
 const task=duration===null?null:boundary?Math.max(0,Math.min(duration,Date.parse(boundary)-Date.parse(first))):duration;
 if(!startedAt||!endedAt)limitations.push('Time bounds use excerpt receive times; full process start/end were not supplied.');
 if(rows.some(row=>!row.budget_only&&row.ended_at===null))limitations.push('At least one child completion is absent from this trace.');
 return {rows:rows.map(({_position,_endPosition,...row})=>row),executions:rows.length,reported_execution_lower_bound:reportedExecutionLowerBound,failed_launches:rows.filter(r=>r.failed_launch).length,rework_heuristic:rework,receipt_repair_attempts:receiptAttempts.filter(a=>a.role==='repair').length,routing_reads,helper_calls,task_wall_clock_ms:task,helper_tail_ms:duration===null?null:duration-task,duration_ms:duration,model_counters:result?.modelUsage??null,limitations:[...new Set(limitations)]};
}
