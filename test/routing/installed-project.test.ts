import {mkdtemp,readFile,writeFile,mkdir,rm,realpath} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {afterEach,describe,expect,it} from 'vitest';

const harness=await import(pathToFileURL(resolve('scripts/verify/installed-delegate.mjs')).href);
const cases=await import(pathToFileURL(resolve('scripts/verify/portable-cases.mjs')).href);
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
  expect((await cases.gradeCase('mechanical',prepared.fixtureRoot,{behaviorOnly:true})).passed).toBe(true);
  expect((await cases.gradeCase('mechanical',prepared.fixtureRoot)).passed).toBe(false);
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
});
