// Opt-in maintainer evaluation, never routing authority. Legacy comparisons stay unchanged.
export const ordinaryWorkflow='ordinary-investigation-first';
export function validateWorkflow(workflow,host){
 if(!['evidence',ordinaryWorkflow].includes(workflow))throw Error('INVALID_COMPARISON_WORKFLOW');
 if(workflow===ordinaryWorkflow&&host!=='claude')throw Error('ORDINARY_COMPARISON_REQUIRES_CLAUDE');
}
export function ordinaryInstructions(mode){
 if(!['direct','delegated'].includes(mode))throw Error('ORDINARY_COMPARISON_REQUIRES_EXPLICIT_ARM');
 const shared='Ordinary host workflow evaluation, not evidence-qualified routing. Do not use route/lookup, qualification receipts, start/capture/finish, or pack scope exceptions. Never read external graders. Preserve the installed skill and project instructions. No child model CLI processes, recursive delegation, new agents or configuration changes. Keep all state under inherited DELEGATE_STATE_HOME. Use the same supplied verification as the other arm; run node node_modules/typescript/bin/tsc --noEmit -p tsconfig.json in the fixture directory after implementation and after any repair. Report unavailable verification honestly.';
 return shared+' '+(mode==='direct'
  ?'Complete investigation, decisions, implementation and verification entirely in the Opus coordinator. No workers, dispatch or observe calls.'
  :'Use native Agent with explicit model options: first haiku for one bounded read-only locate_behavior investigation, then sonnet for one implement_fix after Opus verifies decisive sources and accepts the diagnosis. Bind dispatch slots economy:{model:"haiku",effort:null}, standard:{model:"sonnet",effort:null}, unless effective effort is observable. Use ordinary dispatch before each assignment and observe once after its final verification, with unique task_id, mode:"delegated", truthful checks/acceptance/repairs and usage:null. Source inspection counts as passed checks for investigation. Pass five-field investigation and bounded implementation packets, no recursive skill activation. Haiku returns sources, diagnosis and unresolved decisions, not raw dumps; Opus settles decisions before Sonnet changes only owned files. Opus inspects the resulting diff and verifies integrated behavior. At most one additional Sonnet repair execution is permitted, including resume calls; count it in the implementation observation. Do not restart failed launches or substitute models to complete the experiment. Record any frontier integration or deviation explicitly; quality alone does not prove adherence. If controls are unavailable, stop. Do not spawn merely to measure usage.');
}
const finite=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0;
const matches=(model,slot)=>typeof model==='string'&&(model===slot||model.startsWith(`claude-${slot}-`));
export function completeTrace(arm){
 const ledger=arm?.ledger;
 return !!ledger&&ledger.executions>=1&&ledger.executions===ledger.rows?.length&&
  !ledger.rows.some(r=>r.unbudgeted||r.budget_only||r.failed_launch||!r.ended_at)&&
  !ledger.limitations?.some(s=>/count may be incomplete|completion is absent/.test(s))&&
  arm.execution?.code===0&&!arm.execution?.timed_out&&!/^(blocked_|harness_budget_cap)/.test(arm.acceptance??'');
}
export function ordinaryAccounting(arm){
 const unknown=reason=>({complete:false,kind:null,value:null,reason,subscription_savings_claim:false});
 if(!completeTrace(arm))return unknown('Execution or terminal accounting is incomplete.');
 // Only externally collected, attributable whole-arm telemetry may occupy this field.
 const allowance=arm.external_allowance;
 if(allowance?.metric==='subscription_allowance'&&allowance.scope==='whole_arm'&&allowance.attributable===true&&finite(allowance.value)&&allowance.unit&&!/token|second|millisecond/i.test(allowance.unit)&&allowance.source&&allowance.comparison_key)
  return {complete:true,kind:'allowance',value:allowance.value,unit:allowance.unit,comparison_key:allowance.comparison_key,source:allowance.source,subscription_savings_claim:false};
 const counters=arm.ledger.model_counters,rows=arm.ledger.rows;
 if(!counters||!Object.keys(counters).length)return unknown('No final per-model counters.');
 if(rows.some(r=>!['host_process','Agent'].includes(r.mechanism)||!r.model||!counters[r.model]))return unknown('Every execution must map to native final per-model totals; child CLI coverage is unknown.');
 const totals=Object.values(counters);
 if(totals.some(c=>!finite(c.costUSD)||c.costBasis!=='list'||c.provider!=='firstParty'))return unknown('Comparable first-party list-price estimates are unavailable.');
 // Sum each model aggregate once, never execution rows or parent-plus-child counters.
 const value=totals.reduce((sum,c)=>sum+c.costUSD,0),reported=arm.execution.client_estimated_cost_usd;
 if(!finite(reported)||Math.abs(value-reported)>Math.max(0.000001,value*0.000001))return unknown('Per-model totals do not reconcile with native final whole-session cost.');
 return {complete:true,kind:'api_equivalent_cost',unit:'USD',comparison_key:'claude-native-firstParty-list',value,source:'native final modelUsage reconciled with total_cost_usd; all traced executions mapped',subscription_savings_claim:false};
}
export function ordinaryQuality(arm){
 return completeTrace(arm)&&arm.after?.result?.passed===true&&
  ['scope','grader_integrity','behavioral_tests'].every(id=>arm.after.result.checks?.some(c=>c.check_id===id&&c.passed===true))&&
  arm.instructions_unchanged===true&&arm.skill_folder_digest===arm.copied_skill_folder_digest_after&&
  arm.maintainer_review?.passed===true&&!!arm.maintainer_review.author?.trim();
}
export function ordinaryAdherence(arm,mode){
 if(!completeTrace(arm)||!matches(arm.ledger.rows[0].model,'opus'))return false;
 const children=arm.ledger.rows.slice(1),review=arm.maintainer_review;
 if(mode==='direct')return children.length===0&&review?.workflow_adherent===true;
 return children.length>=2&&children.length<=3&&children.every(r=>r.mechanism==='Agent')&&
  matches(children[0].model,'haiku')&&children.slice(1).every(r=>matches(r.model,'sonnet'))&&
  review?.workflow_adherent===true&&review.coordinator_inspected_artifact===true&&
  review.investigation_sources_verified===true&&review.ordinary_feedback_verified===true;
}
export function ordinaryVerdict({direct,delegated}){
 const quality={direct:ordinaryQuality(direct),delegated:ordinaryQuality(delegated)};
 const adherence={direct:ordinaryAdherence(direct,'direct'),delegated:ordinaryAdherence(delegated,'delegated')};
 const accounting={direct:ordinaryAccounting(direct),delegated:ordinaryAccounting(delegated)};
 const base={qualification_authority:false,subscription_savings_claim:false,claim:null,quality,adherence,accounting};
 if(!Object.values(quality).every(Boolean)||!Object.values(adherence).every(Boolean))return {...base,verdict:'inconclusive',reason:'Both arms need quality acceptance and verified workflow adherence.'};
 if(direct.ledger.rows[0].model!==delegated.ledger.rows[0].model)return {...base,verdict:'inconclusive',reason:'Coordinator model substitution breaks the matched comparison.'};
 const a=accounting.direct,b=accounting.delegated;
 if(!a.complete||!b.complete||a.kind!==b.kind||a.unit!==b.unit||a.comparison_key!==b.comparison_key)return {...base,verdict:'inconclusive',reason:'Comparable complete whole-arm accounting is unavailable.'};
 return {...base,verdict:a.value===b.value?'tie':a.value<b.value?'direct':'delegated',claim:`${a.value===b.value?'equal':'lower'} ${a.kind==='allowance'?'attributable allowance at n=1':'API-equivalent estimate at n=1; not subscription savings'}`,delegated_change_percent:a.value===0?null:100*(b.value-a.value)/a.value};
}
