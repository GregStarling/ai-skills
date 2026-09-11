import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { cp, lstat, mkdir, mkdtemp, readFile, readdir, readlink, rm, symlink } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { z } from 'zod';
import { canonicalJson, digest, hashBytes } from '../core/canonical.js';
import { parseGraderResult, type GraderResult } from '../schema/index.js';
import { runProcess } from '../runtime/process.js';

const execute = promisify(execFile);
const pathSchema = z.string().min(1).refine(p => !isAbsolute(p) && !p.split('/').includes('..') && !p.includes('\\') && !p.includes('\0'));
const sha = z.string().regex(/^sha256:[a-f0-9]{64}$/);
const manifestSchema = z.object({
  schema_version: z.literal('harvested_fixture.v1'), fixture_id: z.string().regex(/^[a-z0-9-]+$/), task_id: z.string().regex(/^[a-z][a-z0-9_]+$/),
  task_class_id: z.enum(['bounded_backend','hard_debugging']), parent_revision: z.string().regex(/^[a-f0-9]{40}$/), grader_revision: z.string().regex(/^[a-f0-9]{40}$/),
  source_repository_url: z.string(), source_repository_status: z.string(), prompt: z.string().min(1), prompt_provenance: z.string().min(1),
  allowed_paths: z.array(pathSchema).nonempty(), grader_files: z.array(z.object({path:pathSchema,bundle_path:pathSchema,digest:sha}).strict()).nonempty(),
  required_assertions: z.array(z.string().min(1)).nonempty(), package_lock_digest: sha, archive_paths: z.array(pathSchema).nonempty(),
  harness_version: z.string(), grader_version: z.string(), performance_evidence: z.literal(false),
}).strict();
export type FixtureManifest = z.infer<typeof manifestSchema>;
export type FileSnapshot = Record<string, {digest:string; mode:number; type:'file'|'symlink'}>;
export interface PreparedFixture { manifest:FixtureManifest; fixtureDigest:string; sourceRepository:string; bundleDirectory:string; directory:string; workspace:string; baseline:FileSnapshot; }
export interface FixtureGrade { result:GraderResult; sourceMap:Map<string,string|Uint8Array>; reportPath:string; report:unknown; status:'passed'|'behavioral_failure'|'setup_failure'|'scope_violation'; changedPaths:string[]; }

export async function snapshot(directory:string):Promise<FileSnapshot> {
  const files:FileSnapshot = {};
  async function visit(path:string):Promise<void> {
    for (const name of (await readdir(path)).sort()) {
      if (path === directory && (name === '.git' || name === 'node_modules')) continue;
      const absolute=join(path,name), local=relative(directory,absolute), info=await lstat(absolute);
      if (info.isSymbolicLink()) files[local]={digest:hashBytes(await readlink(absolute)),mode:info.mode&0o777,type:'symlink'};
      else if (info.isDirectory()) await visit(absolute);
      else if (info.isFile()) files[local]={digest:hashBytes(await readFile(absolute)),mode:info.mode&0o777,type:'file'};
      else throw new Error(`UNSUPPORTED_FIXTURE_FILE: ${local}`);
    }
  }
  await visit(directory); return files;
}
async function archive(source:string,revision:string,paths:string[],directory:string):Promise<void> {
  await mkdir(directory,{recursive:true});
  const tar=join(dirname(directory),`archive-${revision}.tar`);
  await execute('git',['-C',source,'archive','--format=tar',`--output=${tar}`,revision,'--',...paths],{maxBuffer:1024*1024});
  await execute('tar',['-xf',tar,'-C',directory]); await rm(tar);
}
async function checkedManifest(fixtureId:string,bundleRoot:string):Promise<{manifest:FixtureManifest;bundleDirectory:string}> {
  if (!/^[a-z0-9-]+$/.test(fixtureId)) throw new Error('INVALID_FIXTURE_ID');
  const bundleDirectory=resolve(bundleRoot,fixtureId);
  const manifest=manifestSchema.parse(JSON.parse(await readFile(join(bundleDirectory,'manifest.json'),'utf8')));
  if (manifest.fixture_id!==fixtureId) throw new Error('FIXTURE_ID_MISMATCH');
  for (const file of manifest.grader_files) if (hashBytes(await readFile(join(bundleDirectory,file.bundle_path)))!==file.digest) throw new Error('IMMUTABLE_GRADER_TAMPERED');
  return {manifest,bundleDirectory};
}
export async function prepareFixture(options:{fixtureId:string;sourceRepository:string;workspaceRoot:string;bundleRoot?:string}):Promise<PreparedFixture> {
  const {manifest,bundleDirectory}=await checkedManifest(options.fixtureId,options.bundleRoot??resolve('fixtures/harvested'));
  const sourceRepository=resolve(options.sourceRepository), root=resolve(options.workspaceRoot);
  if (root===sourceRepository || root.startsWith(sourceRepository+'/')) throw new Error('FIXTURE_MUST_NOT_MUTATE_SOURCE_REPOSITORY');
  await mkdir(root,{recursive:true});
  const directory=await mkdtemp(join(root,`${manifest.fixture_id}-`)), workspace=join(directory,'candidate');
  await archive(sourceRepository,manifest.parent_revision,manifest.archive_paths,workspace);
  if (hashBytes(await readFile(join(workspace,'package-lock.json')))!==manifest.package_lock_digest) throw new Error('FIXTURE_LOCK_MISMATCH');
  // Candidate receives source only, without tests, repository history, agent
  // instructions, fixed grader or known solution. Grading happens elsewhere.
  for (const path of Object.keys(await snapshot(workspace))) if (/\.(test|spec)\.[cm]?[jt]sx?$/.test(path) || /(^|\/)(AGENTS|CLAUDE)\.md$/.test(path)) await rm(join(workspace,path));
  const baseline=await snapshot(workspace);
  await execute('git',['init','--quiet',workspace]);
  await execute('git',['-C',workspace,'add','.']);
  await execute('git',['-C',workspace,'-c','user.name=Fixture Baseline','-c','user.email=fixture@localhost','-c','commit.gpgsign=false','commit','--quiet','-m','Pinned historical fixture baseline']);
  return {manifest,fixtureDigest:digest(manifest),sourceRepository,bundleDirectory,directory,workspace,baseline};
}

export function fixturePrompt(prepared:PreparedFixture):string {
  return `${prepared.manifest.prompt}\n\nEdit only: ${prepared.manifest.allowed_paths.join(', ')}. Do not install dependencies, edit configuration or create files. Tests are held out and run by an independent evaluator after your change. Do not read outside this workspace or search Git history. Explain the implemented fix briefly.\nPrompt provenance: ${prepared.manifest.prompt_provenance}`;
}

export async function gradeFixture(options:{prepared:PreparedFixture;candidateIdentity:string;dependencyDirectory?:string;timeoutMs?:number}):Promise<FixtureGrade> {
  const {prepared}=options, {manifest}=prepared;
  if (digest(manifest)!==prepared.fixtureDigest) throw new Error('FIXTURE_MANIFEST_CHANGED');
  await checkedManifest(manifest.fixture_id,dirname(prepared.bundleDirectory));
  const after=await snapshot(prepared.workspace);
  const changedPaths=[...new Set([...Object.keys(prepared.baseline),...Object.keys(after)])].filter(path=>canonicalJson(prepared.baseline[path]??null)!==canonicalJson(after[path]??null)).sort();
  const scopePassed=changedPaths.every(path=>manifest.allowed_paths.includes(path) && after[path]?.type==='file');
  const sourceMap=new Map<string,string|Uint8Array>();
  const capture=(value:unknown):string=>{const bytes=canonicalJson(value);const key=hashBytes(bytes);sourceMap.set(key,bytes);return key;};
  capture(manifest);capture(after);
  const scopeDigest=capture({changed_paths:changedPaths,allowed_paths:manifest.allowed_paths,before:prepared.baseline,after});
  const evaluator=await mkdtemp(join(prepared.directory,'evaluator-'));
  await archive(prepared.sourceRepository,manifest.parent_revision,manifest.archive_paths,evaluator);
  for (const path of manifest.allowed_paths) {
    if (after[path]?.type==='file') await cp(join(prepared.workspace,path),join(evaluator,path));
    else await rm(join(evaluator,path),{force:true});
  }
  for (const file of manifest.grader_files) await cp(join(prepared.bundleDirectory,file.bundle_path),join(evaluator,file.path));
  if (options.dependencyDirectory) {
    const dependencies=resolve(options.dependencyDirectory);
    if (hashBytes(await readFile(join(dirname(dependencies),'package-lock.json')))!==manifest.package_lock_digest) throw new Error('GRADER_DEPENDENCY_LOCK_MISMATCH');
    await symlink(dependencies,join(evaluator,'node_modules'),'dir');
  } else {
    await execute('npm',['ci','--ignore-scripts','--no-audit','--no-fund'],{cwd:evaluator,timeout:180000,maxBuffer:4*1024*1024});
  }
  const reportPath=join(evaluator,'grader-result.json');
  const args=[join(evaluator,'node_modules/vitest/vitest.mjs'),'run',...manifest.grader_files.map(file=>file.path),'--reporter=json',`--outputFile=${reportPath}`];
  const invocation=await runProcess({executable:process.execPath,args,cwd:evaluator,timeoutMs:options.timeoutMs??30000,outputDirectory:join(evaluator,'grading-receipt'),maxOutputBytes:8*1024*1024});
  const exitCode=invocation.exit_code;
  const invocationDigest=capture({...invocation,command:process.execPath,args,cwd:evaluator,stdout:await readFile(invocation.stdout_path,'utf8'),stderr:await readFile(invocation.stderr_path,'utf8')});
  let report:unknown=null;
  try { report=JSON.parse(await readFile(reportPath,'utf8')); } catch { /* Setup failure is distinct from a reproduced behavioral failure. */ }
  const parsed=z.object({success:z.boolean(),numTotalTests:z.number().int().positive(),numPassedTests:z.number().int().nonnegative(),numFailedTests:z.number().int().nonnegative(),numPendingTests:z.number().int().nonnegative(),testResults:z.array(z.object({assertionResults:z.array(z.object({title:z.string(),fullName:z.string(),status:z.string()}))}))}).safeParse(report);
  const assertions=parsed.success?parsed.data.testResults.flatMap(test=>test.assertionResults):[];
  const targetsPresent=manifest.required_assertions.every(name=>assertions.some(test=>test.title===name||test.fullName.endsWith(name)));
  const behavioralPassed=parsed.success && exitCode===0 && invocation.cleanup==='complete' && !invocation.timed_out && !invocation.output_limited && parsed.data.success && parsed.data.numTotalTests===parsed.data.numPassedTests && parsed.data.numFailedTests===0 && parsed.data.numPendingTests===0 && targetsPresent && assertions.every(test=>test.status==='passed');
  const integrityPassed=(await Promise.all(manifest.grader_files.map(async file=>hashBytes(await readFile(join(evaluator,file.path)))===file.digest))).every(Boolean);
  const checks=[{check_id:'scope',passed:scopePassed,evidence_digest:scopeDigest},{check_id:'grader_integrity',passed:integrityPassed,evidence_digest:capture({files:manifest.grader_files,intact:integrityPassed})},{check_id:'behavioral_tests',passed:behavioralPassed,evidence_digest:capture({report,invocation_digest:invocationDigest})}];
  const passed=checks.every(check=>check.passed);
  const result=parseGraderResult({schema_version:'grader_result.v1',task_id:manifest.task_id,fixture_digest:prepared.fixtureDigest,candidate_identity:options.candidateIdentity,artifact_digest:digest(after),passed,accepted:false,checks});
  capture(result);
  return {result,sourceMap,reportPath,report,status:!scopePassed?'scope_violation':passed?'passed':targetsPresent?'behavioral_failure':'setup_failure',changedPaths};
}

export * from './runner.js';
