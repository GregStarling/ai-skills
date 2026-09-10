import {mkdtemp,mkdir,writeFile,readFile,rename,rm,symlink,chmod} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {afterEach,describe,it,expect} from 'vitest';
import {loadPolicy} from '../../src/governance/index.js';
import {snapshotWorkspace,inspectChanges,parseWorkOrder,safePath,matchesPath} from '../../src/delegation/scope.js';
const roots:string[]=[];afterEach(async()=>{await Promise.all(roots.splice(0).map(root=>rm(root,{recursive:true,force:true})));});
const order=()=>parseWorkOrder({schema_version:'work_order.v1',task_id:'scope_case',goal:'Fix a bounded file',role_id:'implementer',task_class_id:'bounded_backend',allowed_paths:['src/**'],forbidden_paths:['src/forbidden/**'],acceptance_criteria:['Objective test passes'],checks:[{check_id:'test',executable:process.execPath,args:['-e','process.exit(0)'],timeout_ms:1000}],pre_signals:[],protected_paths:[],risk_constraints:['No public API changes'],escalation_conditions:['Unexpected scope'],max_attempts:2,timeout_ms:1000,return_format:'worker_result.v1'});
async function fixture(){const root=await mkdtemp(join(tmpdir(),'governor-scope-'));roots.push(root);await mkdir(join(root,'src/forbidden'),{recursive:true});await writeFile(join(root,'src/good.txt'),'before');await writeFile(join(root,'src/forbidden/secret.bin'),Buffer.from([0,1,2]));execFileSync('git',['init','-q',root]);execFileSync('git',['-C',root,'add','.']);execFileSync('git',['-C',root,'-c','user.name=Test','-c','user.email=test@example.invalid','commit','-qm','base']);return root;}
const policy=loadPolicy('policy/constitution.json');
describe('actual scope inspection',()=>{
 it.each(['../outside','/absolute','src/../outside','src//file','src\\file','src/./file'])('rejects traversal/ambiguous path %s',path=>expect(()=>safePath(path)).toThrow());
 it('matches directory boundaries and refuses underspecified orders',()=>{expect(matchesPath('src-extra/file','src/**')).toBe(false);expect(()=>parseWorkOrder({...order(),goal:''})).toThrow();expect(()=>parseWorkOrder({...order(),allowed_paths:['**']})).toThrow();});
 it('counts both rename ends, deletion, untracked binary, executable mode and staged content',async()=>{
  const root=await fixture();const before=await snapshotWorkspace(root);
  await rename(join(root,'src/good.txt'),join(root,'src/forbidden/renamed\nfile.txt'));
  await rm(join(root,'src/forbidden/secret.bin'));await writeFile(join(root,'untracked.bin'),Buffer.from([255,0,3]));
  await writeFile(join(root,'src/script'),'run');await chmod(join(root,'src/script'),0o755);execFileSync('git',['-C',root,'add','.']);
  const result=inspectChanges(before,await snapshotWorkspace(root),order(),policy);
  expect(result.paths).toEqual(['src/forbidden/renamed\nfile.txt','src/forbidden/secret.bin','src/good.txt','src/script','untracked.bin']);expect(result.violations).toContain('outside_allowed_scope: untracked.bin');expect(result.violations.filter(v=>v.startsWith('forbidden_change:'))).toHaveLength(2);
 });
 it('detects index-only content and preserves unrelated dirty baseline',async()=>{
  const root=await fixture();await writeFile(join(root,'notes'),'pre-existing dirty');const before=await snapshotWorkspace(root);
  await writeFile(join(root,'src/good.txt'),'staged');execFileSync('git',['-C',root,'add','src/good.txt']);await writeFile(join(root,'src/good.txt'),'before');
  expect(inspectChanges(before,await snapshotWorkspace(root),order(),policy).paths).toEqual(['src/good.txt']);
 });
 it('detects mode-only and Git control changes',async()=>{
  const root=await fixture();const before=await snapshotWorkspace(root);await chmod(join(root,'src/good.txt'),0o755);execFileSync('git',['-C',root,'config','test.changed','yes']);
  const result=inspectChanges(before,await snapshotWorkspace(root),order(),policy);expect(result.paths).toEqual(['src/good.txt']);expect(result.violations).toContain('git_control_changed');
 });
 it('rejects escaping symlinks and forbids resolved targets outside scope',async()=>{
  const root=await fixture();const before=await snapshotWorkspace(root);await symlink('../notes',join(root,'src/link'));await writeFile(join(root,'notes'),'unchanged');
  expect(inspectChanges(before,await snapshotWorkspace(root),order(),policy).violations).toContain('symlink_target_outside_scope: src/link');
  await rm(join(root,'src/link'));await symlink('../../outside-sentinel',join(root,'src/link'));await expect(snapshotWorkspace(root)).rejects.toThrow('symlink_escape');
 });
 it('allows bounded ordinary links and detects retargeting',async()=>{
  const root=await fixture();await symlink('good.txt',join(root,'src/link'));const before=await snapshotWorkspace(root);await rm(join(root,'src/link'));await symlink('forbidden/secret.bin',join(root,'src/link'));
  expect(inspectChanges(before,await snapshotWorkspace(root),order(),policy).violations).toContain('symlink_target_outside_scope: src/link');
 });
 it('raises post-change risk from protected actual paths and never lowers pre-risk',async()=>{
  const root=await fixture();const before=await snapshotWorkspace(root);await mkdir(join(root,'src/auth'));await writeFile(join(root,'src/auth/token.ts'),'actual edit');
  expect(inspectChanges(before,await snapshotWorkspace(root),order(),policy).risk.risk).toBe('high');
  expect(inspectChanges(before,await snapshotWorkspace(root),{...order(),pre_signals:['secrets']},policy).risk.risk).toBe('critical');
  expect(await readFile(join(root,'src/good.txt'),'utf8')).toBe('before');
 });
});
