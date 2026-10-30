#!/usr/bin/env node
// Measures which skill Claude Code invokes first for each test prompt, with only the skill sets you choose
// installed. Each session runs `claude -p` in a throwaway project with a stripped environment: no API key,
// user settings, personal skills, plugins, MCP servers or global CLAUDE.md, so usage comes from the Claude
// Code login and results are not contaminated by the auditor's own setup.
// Usage: node trigger-eval.mjs <plan.json> [--dry-run]
// Plan: {"sets":{"before":"<folder of skill folders>","after":"<folder>"},
//        "cases":[{"id":"focus","prompt":"...","expect":"focus"}],   expect null = no skill should fire
//        "runs":3,"model":"opus","concurrency":4,"budget_usd":1,"timeout_s":300,"fixture":"<project folder>"}
// Paths are relative to the plan file. A session stops at the first Skill call. Results are rewritten to
// <plan>.results.json after every session, so an interrupted run keeps what finished. Errored and timed-out
// sessions are listed but not scored.
// Exit 0 when every session was scored, 1 when stopped early or any session errored, 2 for a bad plan or missing claude.
import {spawn,execFileSync} from 'node:child_process';
import {cpSync,existsSync,mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {basename,dirname,join,resolve} from 'node:path';
import {findSkills} from './lint-skills.mjs';

const [planPath,flag]=process.argv.slice(2);
const fail=(message)=>{console.log(`TRIGGER EVAL UNAVAILABLE | reason=${message}`);process.exit(2);};
if(!planPath)fail('pass a plan file');
let plan;try{plan=JSON.parse(readFileSync(planPath,'utf8'));}catch(error){fail(`cannot read plan: ${error.message}`);}
const base=dirname(resolve(planPath)),at=(path)=>resolve(base,path);
for(const path of [...Object.values(plan.sets??{}),...(plan.fixture?[plan.fixture]:[])])if(!existsSync(at(path)))fail(`missing folder ${at(path)}`);
const sets=Object.entries(plan.sets??{}).map(([label,path])=>({label,skills:findSkills(at(path),1)}));
const cases=plan.cases??[];
if(!sets.length||sets.some((set)=>!set.skills.length))fail('every entry in "sets" must be a folder containing skill folders');
if(!cases.length||cases.some((c)=>!c.id||!c.prompt||c.expect===undefined))fail('every case needs id, prompt and expect (a skill name or null)');
const runs=plan.runs??3,model=plan.model??'opus',concurrency=plan.concurrency??4,total=sets.length*cases.length*runs;

console.log(`TRIGGER EVAL${flag==='--dry-run'?' PLAN':''} | sets=${sets.map((s)=>s.label).join(',')} | cases=${cases.length} | runs=${runs} | sessions=${total} | model=${model}`);
for(const set of sets)console.log(`set ${set.label}: ${set.skills.map((s)=>basename(s)).join(' ')}`);
if(flag==='--dry-run')process.exit(0);
try{execFileSync('claude',['--version'],{stdio:'ignore'});}catch{fail('claude CLI not found; trigger tests need Claude Code');}

// Only these variables reach the session. Without ANTHROPIC_API_KEY, claude uses the subscription login.
const env=Object.fromEntries(['HOME','PATH','USER','SHELL','TMPDIR'].filter((k)=>process.env[k]).map((k)=>[k,process.env[k]]));
const tools='Read,Edit,Write,Bash,Glob,Grep,Skill';
// Read only from failed sessions, so a model answer that mentions rate limits is never mistaken for one.
const LIMIT=/usage limit|hit your (\w+ )?limit|limit (reached|will reset)|resets? (at )?\d|rate.?limit|\b429\b|overloaded|quota/i,AUTH=/not logged in|run \/login|authenticat|invalid api key/i;
const out=resolve(base,`${basename(planPath,'.json')}.results.json`),results=[],active=new Map();
const save=()=>writeFileSync(out,`${JSON.stringify(results,null,1)}\n`);
const scored=(r)=>r.status==='skill'||r.status==='none';
let stopped=null;

function session(set,c,n){
 let dir;
 try{
  dir=mkdtempSync(join(tmpdir(),'trigger-eval-'));
  if(plan.fixture)cpSync(at(plan.fixture),dir,{recursive:true});else writeFileSync(join(dir,'README.md'),'# Project\n');
  try{execFileSync('git',['init','-q'],{cwd:dir});}catch{}
  for(const skill of set.skills)cpSync(skill,join(dir,'.claude/skills',basename(skill)),{recursive:true,dereference:true});
 }catch(error){if(dir)rmSync(dir,{recursive:true,force:true});return Promise.resolve({set:set.label,case:c.id,run:n,expect:c.expect,skill:null,status:'error',detail:`setup: ${error.message}`});}
 const args=['-p','--model',model,'--output-format','stream-json','--verbose','--no-session-persistence','--setting-sources','project',
  '--strict-mcp-config','--mcp-config','{"mcpServers":{}}','--permission-mode','dontAsk','--tools',tools,'--allowedTools',tools,
  '--disallowedTools','Bash(gh:*)','Bash(git push:*)','Bash(npm publish:*)','Bash(curl:*)','--max-budget-usd',String(plan.budget_usd??1),c.prompt];
 return new Promise((done)=>{
  const child=spawn('claude',args,{cwd:dir,env});active.set(child,dir);
  let buffer='',stderr='',skill=null,result=null,timedOut=false;
  // SIGTERM first; SIGKILL if the process ignores it.
  const stop=()=>{child.kill('SIGTERM');setTimeout(()=>child.kill('SIGKILL'),10000).unref();};
  const timer=setTimeout(()=>{timedOut=true;stop();},(plan.timeout_s??300)*1000);
  child.stdout.on('data',(data)=>{
   buffer+=data;let newline;
   while((newline=buffer.indexOf('\n'))>=0){
    const line=buffer.slice(0,newline);buffer=buffer.slice(newline+1);
    let event;try{event=JSON.parse(line);}catch{continue;}
    if(event.type==='result')result=event;
    const call=event.type==='assistant'&&event.message?.content?.find((part)=>part.type==='tool_use'&&part.name==='Skill');
    if(call&&!skill){skill=String(call.input?.skill??'').replace(/^[^:]+:/,'');stop();}
   }
  });
  child.stderr.on('data',(data)=>{stderr+=data;});
  child.on('close',(code)=>{
   clearTimeout(timer);active.delete(child);rmSync(dir,{recursive:true,force:true});
   // A session without a Skill call counts as "none" only if it ended cleanly: exit 0 and a non-error result.
   const text=String(result?.result??''),failed=code!==0||!result||result.is_error,hostText=`${text} ${stderr}`;
   const status=skill?'skill':timedOut?'timeout':!failed?'none'
    :LIMIT.test(hostText)?'limited':AUTH.test(hostText)?'auth':'error';
   if(status==='limited')stopped='usage limit';if(status==='auth')stopped='claude is not logged in';
   done({set:set.label,case:c.id,run:n,expect:c.expect,skill,status,hit:scored({status})?skill===(c.expect??null):null,
    detail:scored({status})?undefined:(text||stderr).trim().slice(0,200)});
  });
 });
}

const interrupt=(signal)=>{
 for(const [child,dir] of active){child.kill('SIGKILL');rmSync(dir,{recursive:true,force:true});}
 save();console.log(`TRIGGER EVAL PARTIAL | stopped=${signal} | sessions=${results.length}/${total} | results=${out}`);process.exit(1);
};
process.on('SIGINT',()=>interrupt('SIGINT'));process.on('SIGTERM',()=>interrupt('SIGTERM'));

const jobs=sets.flatMap((set)=>cases.flatMap((c)=>Array.from({length:runs},(_,i)=>()=>session(set,c,i+1))));
await Promise.all(Array.from({length:Math.min(concurrency,jobs.length)},async()=>{
 while(jobs.length&&!stopped){const r=await jobs.shift()();results.push(r);save();}
}));

const score=(rows)=>`${rows.filter((r)=>r.hit).length}/${rows.filter(scored).length}`;
for(const c of cases)console.log(`case ${c.id} expect=${c.expect??'none'} | ${sets.map((set)=>{
 const rows=results.filter((r)=>r.set===set.label&&r.case===c.id);
 return `${set.label} ${score(rows)} (${rows.map((r)=>r.skill??r.status).join(', ')})`;}).join(' | ')}`);
const unscored=results.filter((r)=>!scored(r)).length,complete=!stopped&&!unscored&&results.length===total;
console.log(`${complete?'TRIGGER EVAL DONE':`TRIGGER EVAL PARTIAL | stopped=${stopped??'none'} | unscored=${unscored} | sessions=${results.length}/${total}`} | ${sets.map((set)=>`${set.label} ${score(results.filter((r)=>r.set===set.label))}`).join(' | ')} | results=${out}`);
process.exitCode=complete?0:1;
