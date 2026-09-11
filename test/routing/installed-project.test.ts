import {mkdtemp,readFile,writeFile,mkdir,rm,realpath,symlink,readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {afterEach,describe,expect,it} from 'vitest';

const harness=await import(pathToFileURL(resolve('scripts/verify/installed-delegate.mjs')).href);
const cases=await import(pathToFileURL(resolve('scripts/verify/portable-cases.mjs')).href);
const {folderDigest}=await import(pathToFileURL(resolve('skills/delegate/scripts/local-learning.mjs')).href);
const temporary:string[]=[];
async function project(){
 const directory=await mkdtemp(join(tmpdir(),'delegate-existing-project-'));temporary.push(directory);
 await writeFile(join(directory,'AGENTS.md'),'Read CLAUDE.md.\n');
 await writeFile(join(directory,'CLAUDE.md'),'Implementation workers may edit assigned files. Preserve this instruction.\n');
 return directory;
}
afterEach(async()=>{await Promise.all(temporary.splice(0).map(p=>rm(p,{recursive:true,force:true})));});
describe('installed Delegate in an existing isolated project',()=>{
 it.each(['claude','codex'])('preserves real instructions and copies the whole skill for %s',async host=>{
  const directory=await project(),names=['AGENTS.md','CLAUDE.md'];
  const before=await Promise.all(names.map(name=>readFile(join(directory,name),'utf8')));
  const prepared=await harness.prepareInstalledTrial(host,'mechanical',{projectRoot:directory});
  expect(await Promise.all(names.map(name=>readFile(join(directory,name),'utf8')))).toEqual(before);
  expect(prepared.fixtureRoot).toBe(join(await realpath(directory),'.delegate/fixtures/mechanical'));
  expect(await harness.folderDigests(prepared.skillPath)).toEqual(await harness.folderDigests(resolve('skills/delegate')));
  expect(prepared.skill_folder_digest).toBe(await folderDigest(resolve('skills/delegate')));
  expect(prepared.skill_folder_digest).toMatch(/^sha256:/);
  expect((await cases.gradeCase('mechanical',prepared.fixtureRoot,{behaviorOnly:true})).passed).toBe(true);
  expect((await cases.gradeCase('mechanical',prepared.fixtureRoot)).passed).toBe(false);
 });
 it.each(['claude','codex'])('canonicalizes disposable roots beneath an explicit symlink for %s',async host=>{
  const parent=await project(),actual=join(parent,'actual'),alias=join(parent,'alias');
  await mkdir(actual);await symlink(actual,alias,'dir');
  const prepared=await harness.prepareInstalledTrial(host,'mechanical',{temporaryDirectory:alias});
  expect(prepared.directory).toBe(await realpath(prepared.directory));
  expect(prepared.directory.startsWith(await realpath(actual))).toBe(true);
  expect(await harness.folderDigests(prepared.skillPath)).toEqual(await harness.folderDigests(resolve('skills/delegate')));
 });
 it.each(['auto','direct','delegated'])('writes the requested %s execution contract without coercing all modes to workers',async mode=>{
  const parent=await project();
  const prepared=await harness.prepareInstalledTrial('codex','tinybug',{temporaryDirectory:parent,mode});
  const instructions=await readFile(join(prepared.directory,'AGENTS.md'),'utf8');
  expect(instructions).toContain(harness.trialModeInstructions(mode));
  expect(prepared.mode).toBe(mode);
  if(mode==='direct')expect(instructions).toContain('do not spawn workers');
  if(mode==='auto')expect(instructions).toContain('Do not spawn a worker merely');
 });
 it('rejects unsupported execution modes before creating a fixture',async()=>{
  const parent=await project(),before=await readdir(parent);
  await expect(harness.prepareInstalledTrial('codex','tinybug',{temporaryDirectory:parent,mode:'guess'})).rejects.toThrow('Unknown execution mode');
  expect(await readdir(parent)).toEqual(before);
 });
 it('rejects invalid run identity and conflicting direct exercises without launching models',async()=>{
  await expect(harness.installedTrial('codex','tinybug',{runId:'../stale'})).rejects.toThrow('Invalid trial run ID');
  await expect(harness.installedTrial('codex','tinybug',{mode:'direct',exercise:'repair'})).rejects.toThrow('conflicts');
 });
 it('refuses reusing an existing evidence directory before any model launch',async()=>{
  const directory=await project(),output=await project();
  await writeFile(join(output,'baseline.json'),'original baseline');
  await expect(harness.installedTrial('codex','tinybug',{projectRoot:directory,outputDirectory:output,runId:'new-run'})).rejects.toMatchObject({code:'EEXIST'});
  expect(await readFile(join(output,'baseline.json'),'utf8')).toBe('original baseline');
 });
 it('harvests canonical receipts and labels stale run IDs without reading event envelopes',async()=>{
  const directory=await project(),state=join(directory,'.delegate/state'),projectId='a'.repeat(64);
  const rawDirectory=join(state,projectId,'codex/receipts'),eventDirectory=join(state,projectId,'codex/events'),legacyDirectory=join(directory,'.delegate/runs');
  await Promise.all([rawDirectory,eventDirectory,legacyDirectory].map(p=>mkdir(p,{recursive:true})));
  const current={schema_version:'delegate_receipt.v2',run_id:'current'};
  await writeFile(join(rawDirectory,'current.json'),JSON.stringify(current));
  await writeFile(join(rawDirectory,'stale.json'),JSON.stringify({...current,run_id:'older'}));
  await writeFile(join(eventDirectory,'envelope.json'),JSON.stringify({kind:'receipt',data:current}));
  await writeFile(join(legacyDirectory,'legacy.json'),JSON.stringify({schema_version:'delegate_receipt.v1'}));
  await writeFile(join(legacyDirectory,'capture-input.json'),JSON.stringify({run_id:'current',command:['node','--version']}));
  await writeFile(join(legacyDirectory,'research.json'),JSON.stringify({sources:[],claims:[]}));
  const receipts=await harness.harvestTrialReceipts(directory,state,'codex','current');
  expect(receipts).toHaveLength(3);
  expect(receipts.find((r:any)=>r.file.endsWith('current.json')).run_binding).toBe('matched');
  expect(receipts.find((r:any)=>r.file.endsWith('stale.json')).run_binding).toBe('mismatch');
  expect(receipts.find((r:any)=>r.file.endsWith('legacy.json')).run_binding).toBe('unbound');
  expect(receipts.every((r:any)=>r.sha256.length===64)).toBe(true);
  expect(receipts.some((r:any)=>r.value.kind==='receipt')).toBe(false);
  expect(await harness.harvestTrialReceipts(directory,state,'claude','current')).toHaveLength(1);
 });
 it('grades research structure separately from source and trace acceptance',async()=>{
  const parent=await project();
  const prepared=await harness.prepareInstalledTrial('claude','research',{temporaryDirectory:parent,mode:'delegated'});
  expect((await harness.gradeInstalledCase('research',prepared.fixtureRoot)).passed).toBe(false);
  const sources=['https://nodejs.org/api/fs.html','https://nodejs.org/api/os.html'].map(url=>({url,retrieved_at:'2026-09-10T12:00:00Z'}));
  const report={sources,claims:Array.from({length:4},(_,i)=>({claim:`Claim ${i}`,source_url:sources[i%2]!.url,evidence:'source passage'})),contradictions:[],unresolved_questions:[],recommendation:'Apply the verified defaults.'};
  await writeFile(join(prepared.fixtureRoot,'research.json'),JSON.stringify(report));
  const grade=await harness.gradeInstalledCase('research',prepared.fixtureRoot);
  expect(grade.passed).toBe(true);
  expect(grade.grading_limitations).toContain('independent source');
  report.claims[0]!.source_url='https://example.com/unsupported';
  await writeFile(join(prepared.fixtureRoot,'research.json'),JSON.stringify(report));
  expect((await harness.gradeInstalledCase('research',prepared.fixtureRoot)).passed).toBe(false);
  expect(await readFile(join(prepared.directory,'CLAUDE.md'),'utf8')).toContain('evaluation-only extension');
 });
 it('refuses an existing fixture before overwriting its files',async()=>{
  const directory=await project(),fixture=join(directory,'.delegate/fixtures/mechanical');
  await mkdir(fixture,{recursive:true});await writeFile(join(fixture,'slug.mjs'),'existing work');
  await expect(harness.prepareInstalledTrial('codex','mechanical',{projectRoot:directory})).rejects.toThrow('Refusing existing trial path');
  expect(await readFile(join(fixture,'slug.mjs'),'utf8')).toBe('existing work');
 });
 it('refuses fixture paths outside the supplied project',async()=>{
  const directory=await project();
  await expect(harness.prepareInstalledTrial('codex','mechanical',{projectRoot:directory,fixtureDirectory:'../elsewhere'})).rejects.toThrow('inside the isolated project');
 });
 it('does not replace an already installed project skill',async()=>{
  const directory=await project(),skill=join(directory,'.claude/skills/delegate');
  await mkdir(skill,{recursive:true});await writeFile(join(skill,'SKILL.md'),'existing skill');
  await expect(harness.prepareInstalledTrial('claude','mechanical',{projectRoot:directory})).rejects.toThrow('Refusing existing trial path');
  expect(await readFile(join(skill,'SKILL.md'),'utf8')).toBe('existing skill');
 });
 it.each([['codex','.agents'],['claude','.claude'],['codex','.delegate']])('refuses a %s %s symlink escaping the disposable project',async(host,name)=>{
  const directory=await project(),outside=await project();
  const before=await readdir(outside);
  await symlink(outside,join(directory,name),'dir');
  await expect(harness.prepareInstalledTrial(host,'mechanical',{projectRoot:directory})).rejects.toThrow('escapes isolated project');
  expect(await readdir(outside)).toEqual(before);
 });
});

describe('offline matched harness contracts',()=>{
 it.each(['claude','codex'])('dry run for %s preserves flags and does not probe the host',async host=>{
  const parent=await project();
  const trial=await harness.installedTrial(host,'tinybug',{projectRoot:parent,outputDirectory:join(parent,'evidence'),mode:'direct',dryRun:true,timeoutMs:600000});
  expect(trial.manifest.host_version).toBeNull();expect(trial.manifest.thread_id).toBeNull();
  expect(trial.manifest.instruction_variant).toBe('current');
  expect(trial.prompt).toContain('finish-input.json');expect(trial.prompt).not.toContain('reminder-repeat-result.json');
  expect(trial.prompt).not.toContain('For trace-bound renewal acceptance');
  if(host==='claude')expect(trial.args.slice(-3)).toEqual(['--max-budget-usd','12','--forward-subagent-text']);
  else expect(trial.args).toEqual(['exec','--ignore-user-config','--ignore-rules','--skip-git-repo-check','-C',trial.prepared.directory,'-s','workspace-write','-m','gpt-5.5','-c','model_reasoning_effort="high"','--json','-']);
 });
 it('binds renewal inspection to each owned artifact in an offline plan',async()=>{
  const parent=await project();
  const trial=await harness.installedTrial('codex','tinybug',{projectRoot:parent,outputDirectory:join(parent,'evidence'),dryRun:true,traceBoundInspection:true});
  expect(trial.prompt).toContain(`after the final edit inspect each owned artifact individually: ${join(trial.prepared.fixtureRoot,'quantity.mjs')}`);
  expect(trial.prompt).toContain('Inspect all final bytes before finish');
 });
 it('classifies provider messages, progress and budget exhaustion without treating grader timestamps as progress',()=>{
  const classify=(events:any[],extra={})=>harness.classifyTrial({host:'codex',stdout:events.map(e=>JSON.stringify(e)).join('\n'),fixtureRoot:'/trial/candidate',...extra});
  expect(classify([{type:'error',message:'You have hit your usage limit'}])).toBe('blocked_provider_limit');
  expect(classify([{type:'turn.failed',error:{message:'Service unavailable'}}])).toBe('blocked_provider_error');
  expect(classify([{type:'error',message:'rate limit'},{item:{type:'file_change'}}])).toBe('pending_frontier_trace_review');
  expect(classify([{type:'result',subtype:'error_max_budget_usd',is_error:true}],{host:'claude'})).toBe('harness_budget_cap');
  expect(classify([{type:'error',message:'rate limit'}],{before:{status:'behavioral_failure',reportPath:'a'},after:{status:'behavioral_failure',reportPath:'b'}})).toBe('blocked_provider_limit');
  expect(classify([{type:'assistant',message:{content:[{name:'Edit',input:{file_path:'/other/file'}}]}},{type:'error',message:'rate limit'}],{host:'claude'})).toBe('blocked_provider_limit');
 });
 it('selects helper commands from the copied source',()=>{
  expect(harness.helperInstructions("if(command==='start'){} if(command==='record'){}")).toEqual({helper_commands:['record','start'],instruction_variant:'legacy'});
  expect(harness.helperInstructions('if (command === "finish") {}').instruction_variant).toBe('current');
 });
});

// This integration uses only the already prepared dependency clone; CI has neither source nor dist.
const {existsSync}=await import('node:fs');
const deps=resolve('artifacts/direct-vs-delegated/deps-b962c1ac/node_modules');
it.skipIf(!existsSync(resolve('dist/evaluation/index.js'))||!existsSync('/Users/gregpro/foreman/.git')||!existsSync(deps))('prepares equal harvested baselines and isolates dependencies offline',async()=>{
 const harvested={fixtureId:'foreman-t920-derived-gate-id',sourceRepository:'/Users/gregpro/foreman',dependencyDirectory:deps};
 const parent=await project();
 const a=await harness.prepareInstalledTrial('codex',harvested.fixtureId,{harvested,temporaryDirectory:parent,mode:'direct'});
 const b=await harness.prepareInstalledTrial('codex',harvested.fixtureId,{harvested,temporaryDirectory:parent,mode:'delegated'});
 expect(a.starting_artifact_digest).toBe(b.starting_artifact_digest);
 const {lstat}=await import('node:fs/promises');
 expect((await lstat(join(a.directory,'node_modules'))).isSymbolicLink()).toBe(false);
 await writeFile(join(a.directory,'node_modules/m3-isolation-marker'),'local');
 expect(existsSync(join(deps,'m3-isolation-marker'))).toBe(false);
 expect(existsSync(join(a.fixtureRoot,'AGENTS.md'))).toBe(false);
 expect(existsSync(join(a.fixtureRoot,'.delegate'))).toBe(false);
 const trial=await harness.installedTrial('codex',harvested.fixtureId,{harvested,preparedTrial:a,mode:'direct',dryRun:true,outputDirectory:join(parent,'evidence')});
 const baseline=JSON.parse(await readFile(join(trial.destination,'baseline.json'),'utf8'));
 expect(baseline.before.status).toBe('behavioral_failure');
 expect(baseline.before.result.checks.find((c:any)=>c.check_id==='scope').passed).toBe(true);
 expect(trial.prompt).toContain('Evaluation-only scope exception: treat the bounded_implementation');
 expect(trial.prompt).toContain('node node_modules/typescript/bin/tsc --noEmit -p tsconfig.json');
 expect(trial.prompt).toContain('Do not run npm install or modify node_modules');
 const start=JSON.parse(await readFile(join(trial.manifest.evaluation_directory,'start-input.json'),'utf8'));
 expect(start.scope).toBe('harvested-'+harvested.fixtureId);expect(start.task_class).toBe('bounded_implementation');
 await expect(harness.prepareInstalledTrial('codex',harvested.fixtureId,{temporaryDirectory:parent,harvested:{...harvested,dependencyDirectory:'/Users/gregpro/foreman/node_modules'}})).rejects.toThrow('FIXTURE_DEPENDENCIES_INSIDE_SOURCE');
},120000);
