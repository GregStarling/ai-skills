import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, mkdir, readFile, writeFile, rm, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { digest, hashBytes } from '../../src/core/canonical.js';
import { prepareFixture, gradeFixture, fixturePrompt, type FixtureManifest } from '../../src/evaluation/index.js';
const execute=promisify(execFile);
let root:string, source:string,bundles:string;
const grader="import {it,expect} from 'vitest';import {add} from './add.js';it('adds both operands',()=>expect(add(2,3)).toBe(5));";
beforeAll(async()=>{
 root=await mkdtemp(join(tmpdir(),'governor-fixture-tests-'));source=join(root,'source');bundles=join(root,'bundles');
 await mkdir(join(source,'src'),{recursive:true});await mkdir(join(bundles,'test-harvest/grader'),{recursive:true});
 await writeFile(join(source,'src/add.ts'),'export const add=(a:number,b:number)=>a;');
 await writeFile(join(source,'src/add.test.ts'),grader);
 for(const file of ['package.json','package-lock.json']) await writeFile(join(source,file),await readFile(resolve(file)));
 await writeFile(join(source,'vitest.config.ts'),"import {defineConfig} from 'vitest/config';export default defineConfig({test:{include:['src/*.test.ts']}});");
 await execute('git',['init','--quiet',source]);await execute('git',['-C',source,'add','.']);
 const commit=()=>execute('git',['-C',source,'-c','user.name=Test Fixture','-c','user.email=test@localhost','-c','commit.gpgsign=false','commit','--quiet','-am','fixture']);
 await commit();const parent=(await execute('git',['-C',source,'rev-parse','HEAD'])).stdout.trim();
 await writeFile(join(source,'src/add.ts'),'export const add=(a:number,b:number)=>a+b;');await commit();const fix=(await execute('git',['-C',source,'rev-parse','HEAD'])).stdout.trim();
 const manifest:FixtureManifest={schema_version:'harvested_fixture.v1',fixture_id:'test-harvest',task_id:'test_harvest',task_class_id:'bounded_backend',parent_revision:parent,grader_revision:fix,source_repository_url:'local test repository',source_repository_status:'synthetic algorithm test only',prompt:'Repair addition.',prompt_provenance:'Synthetic unit-test task, never performance evidence.',allowed_paths:['src/add.ts'],grader_files:[{path:'src/add.test.ts',bundle_path:'grader/add.test.ts',digest:hashBytes(grader)}],required_assertions:['adds both operands'],package_lock_digest:hashBytes(await readFile(resolve('package-lock.json'))),archive_paths:['src','package.json','package-lock.json','vitest.config.ts'],harness_version:'test-v1',grader_version:'test-v1',performance_evidence:false};
 await writeFile(join(bundles,'test-harvest/manifest.json'),JSON.stringify(manifest));await writeFile(join(bundles,'test-harvest/grader/add.test.ts'),grader);
},20000);
afterAll(async()=>{await rm(root,{recursive:true,force:true});});
const prepare=()=>prepareFixture({fixtureId:'test-harvest',sourceRepository:source,workspaceRoot:join(root,'runs'),bundleRoot:bundles});
const identity=digest({synthetic_algorithm_test:true});
describe('held-out fixture grading',()=>{
 it('reconstructs buggy parent, withholds grader/history, proves fail-before/pass-after',async()=>{
  const prepared=await prepare();expect(await readFile(join(prepared.workspace,'src/add.ts'),'utf8')).not.toContain('a+b');
  await expect(access(join(prepared.workspace,'src/add.test.ts'))).rejects.toThrow();
  expect((await execute('git',['-C',prepared.workspace,'rev-list','--count','HEAD'])).stdout.trim()).toBe('1');
  expect(fixturePrompt(prepared)).toContain('Edit only: src/add.ts');
  const options={prepared,candidateIdentity:identity,dependencyDirectory:resolve('node_modules')};
  const parent=await gradeFixture(options);expect(parent.status).toBe('behavioral_failure');expect(parent.result.accepted).toBe(false);
  await writeFile(join(prepared.workspace,'src/add.ts'),'export const add=(a:number,b:number)=>a+b;');
  const fixed=await gradeFixture(options);expect(fixed.status).toBe('passed');expect(fixed.result.accepted).toBe(false);
  for(const check of fixed.result.checks)expect(hashBytes(fixed.sourceMap.get(check.evidence_digest)!)).toBe(check.evidence_digest);
 },20000);
 it('refuses grader edits even with a correct implementation',async()=>{
  const prepared=await prepare();await writeFile(join(prepared.workspace,'src/add.ts'),'export const add=(a:number,b:number)=>a+b;');
  await writeFile(join(prepared.workspace,'src/add.test.ts'),"// fake grader pass");
  const result=await gradeFixture({prepared,candidateIdentity:identity,dependencyDirectory:resolve('node_modules')});
  expect(result.status).toBe('scope_violation');expect(result.result.accepted).toBe(false);
 },20000);
 it('rejects changed immutable grader and source-workdir destination',async()=>{
  await expect(prepareFixture({fixtureId:'test-harvest',sourceRepository:source,workspaceRoot:join(source,'unsafe'),bundleRoot:bundles})).rejects.toThrow(/SOURCE_REPOSITORY/);
  const prepared=await prepare();await writeFile(join(bundles,'test-harvest/grader/add.test.ts'),'// tampered');
  await expect(gradeFixture({prepared,candidateIdentity:identity,dependencyDirectory:resolve('node_modules')})).rejects.toThrow(/GRADER_TAMPERED/);
  await writeFile(join(bundles,'test-harvest/grader/add.test.ts'),grader);
 });
});
