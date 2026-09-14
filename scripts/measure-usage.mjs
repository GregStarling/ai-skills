#!/usr/bin/env node
/**
 * measure-usage.mjs — price Claude Code sessions from the local transcripts.
 *
 * Reads every *.jsonl under ~/.claude/projects (main sessions plus their subagents/ folders),
 * deduplicates assistant messages by message id, and prices tokens per model at the list rates in
 * usage-prices.json. Sessions are grouped by coordinator model (the model that wrote most of the
 * main-session turns) so a Sonnet-coordinated period can be compared with a Fable-coordinated one.
 *
 * The numbers are API list-price proxies, not subscription billing. Zero dependencies.
 *
 *   node scripts/measure-usage.mjs [--since 2026-09-01] [--until 2026-09-30] [--project foreman]
 *        [--root ~/.claude/projects] [--prices scripts/usage-prices.json] [--sessions 10] [--json]
 */
import {readdir,readFile} from 'node:fs/promises';
import {join,resolve,relative,sep,dirname} from 'node:path';
import {homedir} from 'node:os';
import {fileURLToPath} from 'node:url';

const USAGE=`usage: node scripts/measure-usage.mjs [--since YYYY-MM-DD] [--until YYYY-MM-DD] [--project substring]
       [--root dir] [--prices file] [--sessions N] [--json]`;
const args=parseArgs(process.argv.slice(2));
if(args.help){console.log(USAGE);process.exit(0);}
const root=resolve(expand(args.root??'~/.claude/projects'));
const pricesPath=resolve(expand(args.prices??join(dirname(fileURLToPath(import.meta.url)),'usage-prices.json')));
const prices=JSON.parse(await readFile(pricesPath,'utf8'));
const since=args.since?Date.parse(args.since):-Infinity;
const until=args.until?Date.parse(args.until)+86400000:Infinity;
const topN=Number(args.sessions??10);
const COMPONENTS=['input','output','cache_read','cache_write'];

const sessions=new Map(),seen=new Set(),unpriced=new Map();let assumedTtl=0;
for await(const file of walk(root)){
  const parts=relative(root,file).split(sep),project=parts[0];
  if(args.project&&!project.includes(args.project))continue;
  const subagentFile=parts.length>2,fileSession=subagentFile?parts[1]:parts[1].replace(/\.jsonl$/,'');
  let text;try{text=await readFile(file,'utf8');}catch{continue;}
  for(const line of text.split('\n')){
    if(!line)continue;let d;try{d=JSON.parse(line);}catch{continue;}
    if(!d||typeof d!=='object')continue;
    const ts=Date.parse(d.timestamp??'');
    if(Number.isFinite(ts)&&(ts<since||ts>=until))continue;
    const s=session(d.sessionId??fileSession,project);
    if(Number.isFinite(ts)){s.first=Math.min(s.first,ts);s.last=Math.max(s.last,ts);}
    const kind=subagentFile||d.isSidechain?'sub':'main';
    if(d.type==='user'&&kind==='main'){
      const c=d.message?.content;
      if(typeof c==='string'||(Array.isArray(c)&&c.some(b=>b?.type==='text')&&!c.some(b=>b?.type==='tool_result')))s.user_turns++;
      continue;
    }
    if(d.type!=='assistant')continue;
    const m=d.message??{};
    for(const b of Array.isArray(m.content)?m.content:[]){
      if(b?.type!=='tool_use')continue;
      if(kind==='main'){s.tools[b.name]=(s.tools[b.name]??0)+1;if(['Edit','Write','MultiEdit'].includes(b.name))s.edits++;}
      if(b.name==='Agent'||b.name==='Task'){const model=b.input?.model??'(inherit)';s.agents[model]=(s.agents[model]??0)+1;}
    }
    if(!m.id||seen.has(m.id))continue;seen.add(m.id);
    const model=m.model??'unknown',u=m.usage??{};
    s[kind].msgs++;(s.models[model]??=({main:0,sub:0}))[kind]++;
    const t=tokens(u);for(const k of COMPONENTS)s[kind].tokens[k]+=t[k];
    const c=cost(model,u,t);
    if(c===null){if(COMPONENTS.some(k=>t[k]>0)&&model!=='<synthetic>')unpriced.set(model,(unpriced.get(model)??0)+1);continue;}
    for(const k of COMPONENTS)s[kind].cost[k]+=c[k];
  }
}

const rows=[...sessions.values()].filter(s=>s.main.msgs+s.sub.msgs>0).map(finish).sort((a,b)=>b.total-a.total);
const groups=new Map();
for(const s of rows){
  const g=groups.get(s.coordinator)??groups.set(s.coordinator,{coordinator:s.coordinator,sessions:0,user_turns:0,edits:0,agents:0,main:0,sub:0,total:0,cache_read:0,output:0,tokens:blank()}).get(s.coordinator);
  g.sessions++;g.user_turns+=s.user_turns;g.edits+=s.edits;g.agents+=Object.values(s.agents).reduce((a,b)=>a+b,0);
  g.main+=s.main_cost;g.sub+=s.sub_cost;g.total+=s.total;
  g.cache_read+=s.main.cost.cache_read+s.sub.cost.cache_read;g.output+=s.main.cost.output+s.sub.cost.output;
  for(const k of COMPONENTS)g.tokens[k]+=s.main.tokens[k]+s.sub.tokens[k];
}
const byCoordinator=[...groups.values()].sort((a,b)=>b.total-a.total).map(g=>({...g,per_session:g.total/g.sessions,per_user_turn:g.user_turns?g.total/g.user_turns:null,main_share:g.total?g.main/g.total:null,sub_share:g.total?g.sub/g.total:null,cache_read_share:g.total?g.cache_read/g.total:null,output_share:g.total?g.output/g.total:null,edits_per_user_turn:g.user_turns?g.edits/g.user_turns:null,agents_per_session:g.agents/g.sessions}));

if(args.json){
  console.log(JSON.stringify({schema_version:'measure_usage.v1',generated_at:new Date().toISOString(),root,prices:pricesPath,filters:{since:args.since??null,until:args.until??null,project:args.project??null},basis:'api_list_price_proxy_not_billing',unpriced_models:Object.fromEntries(unpriced),cache_ttl_assumed_messages:assumedTtl,by_coordinator:byCoordinator,sessions:rows},null,1));
  process.exit(0);
}
const money=n=>n===null?'-':'$'+n.toFixed(2),pct=n=>n===null?'-':(n*100).toFixed(0)+'%',num=(n,d=1)=>n===null?'-':n.toFixed(d);
console.log(`Claude Code usage from ${root}${args.since||args.until?` (${args.since??'…'} to ${args.until??'…'})`:''}${args.project?` project~${args.project}`:''}`);
console.log('API list-price proxy from '+relative(process.cwd(),pricesPath)+'; not subscription billing. Sessions: '+rows.length+'.\n');
table(['coordinator','sessions','user turns','total','$/session','$/user turn','main','subagents','cache read','output','edits/turn','agents/session'],
  byCoordinator.map(g=>[g.coordinator,g.sessions,g.user_turns,money(g.total),money(g.per_session),money(g.per_user_turn),pct(g.main_share),pct(g.sub_share),pct(g.cache_read_share),pct(g.output_share),num(g.edits_per_user_turn,2),num(g.agents_per_session,1)]));
console.log(`\nTop ${Math.min(topN,rows.length)} sessions by cost`);
table(['date','project','coordinator','user turns','main','subagents','total','agents (model:count)'],
  rows.slice(0,topN).map(s=>[s.date,s.project.replace(/^-Users-[^-]+-/,'').slice(0,40),s.coordinator,s.user_turns,money(s.main_cost),money(s.sub_cost),money(s.total),Object.entries(s.agents).map(([m,c])=>m+':'+c).join(' ')||'-']));
if(unpriced.size)console.log('\nUnpriced models (add to '+relative(process.cwd(),pricesPath)+'): '+[...unpriced].map(([m,c])=>`${m} (${c} msgs)`).join(', '));
if(assumedTtl)console.log(`\n${assumedTtl} messages lacked a cache TTL breakdown; priced at the ${prices.default_cache_ttl} write rate.`);
console.log('\nCompare a Sonnet-coordinated period with a Fable-coordinated one on $/user turn and edits/turn; watch subagent share for review packets.');

function session(id,project){
  let s=sessions.get(id);
  if(!s){s={id,project,first:Infinity,last:-Infinity,user_turns:0,edits:0,tools:{},agents:{},models:{},main:{msgs:0,tokens:blank(),cost:blank()},sub:{msgs:0,tokens:blank(),cost:blank()}};sessions.set(id,s);}
  return s;
}
function finish(s){
  const coordinator=Object.entries(s.models).sort((a,b)=>b[1].main-a[1].main||b[1].sub-a[1].sub)[0]?.[0]??'unknown';
  const main_cost=sum(s.main.cost),sub_cost=sum(s.sub.cost);
  return {...s,coordinator,date:Number.isFinite(s.first)?new Date(s.first).toISOString().slice(0,10):'-',main_cost,sub_cost,total:main_cost+sub_cost};
}
function tokens(u){return {input:u.input_tokens??0,output:u.output_tokens??0,cache_read:u.cache_read_input_tokens??0,cache_write:u.cache_creation_input_tokens??0};}
function cost(model,u,t){
  const p=prices.models[prices.aliases?.[model]??model];if(!p)return null;
  const cc=u.cache_creation;let write;
  if(cc&&typeof cc==='object')write=(cc.ephemeral_5m_input_tokens??0)*p.cache_write_5m+(cc.ephemeral_1h_input_tokens??0)*p.cache_write_1h;
  else{if(t.cache_write>0)assumedTtl++;write=t.cache_write*(prices.default_cache_ttl==='5m'?p.cache_write_5m:p.cache_write_1h);}
  return {input:t.input*p.input/1e6,output:t.output*p.output/1e6,cache_read:t.cache_read*p.cache_read/1e6,cache_write:write/1e6};
}
function blank(){return {input:0,output:0,cache_read:0,cache_write:0};}
function sum(o){return Object.values(o).reduce((a,b)=>a+b,0);}
async function* walk(dir){
  let entries;try{entries=await readdir(dir,{withFileTypes:true});}catch{return;}
  for(const e of entries){
    if(e.name.startsWith('.')&&e.name!=='.'&&dir!==root)continue;
    const path=join(dir,e.name);
    if(e.isDirectory())yield* walk(path);else if(e.isFile()&&e.name.endsWith('.jsonl'))yield path;
  }
}
function table(header,body){
  const rows=[header,...body.map(r=>r.map(String))],width=header.map((_,i)=>Math.max(...rows.map(r=>r[i].length)));
  for(const [n,r] of rows.entries()){console.log(r.map((c,i)=>i===0||i===1&&header[1]==='project'||header[i]==='agents (model:count)'?c.padEnd(width[i]):c.padStart(width[i])).join('  '));if(n===0)console.log(width.map(w=>'-'.repeat(w)).join('  '));}
}
function parseArgs(argv){const out={};for(let i=0;i<argv.length;i++){const a=argv[i];if(!a.startsWith('--'))continue;const k=a.slice(2),v=argv[i+1];if(v===undefined||v.startsWith('--'))out[k]=true;else{out[k]=v;i++;}}return out;}
function expand(p){return p.startsWith('~')?join(homedir(),p.slice(1)):p;}
