import assert from 'node:assert/strict';
import {readFileSync,existsSync,mkdtempSync,cpSync,readdirSync,lstatSync,rmSync} from 'node:fs';
import {resolve,join,dirname,relative,isAbsolute} from 'node:path';
import {tmpdir} from 'node:os';
import {parse} from 'yaml';
const root=resolve(import.meta.dirname,'../..');
for(const name of ['delegate','refresh-models']){
 const source=readFileSync(resolve(root,'skills',name,'SKILL.md'),'utf8'),match=/^---\n([\s\S]+?)\n---\n/.exec(source);assert.ok(match);
 const metadata=parse(match[1]);assert.deepEqual(Object.keys(metadata).sort(),['description','name']);assert.equal(metadata.name,name);assert.ok(metadata.description.length>30);assert.ok(!/TODO|\[INSERT|\[TODO/.test(source));
}
for(const path of ['.claude/skills','.codex/skills','.agents/skills'])assert.equal(existsSync(resolve(root,path)),false,'Library source must stay inert in this checkout.');
// Copy only the consumer directory, so a link cannot accidentally depend on the maintainer checkout.
const temporary=mkdtempSync(join(tmpdir(),'delegate-package-')),copy=join(temporary,'delegate');
const files=[];
try{
 cpSync(resolve(root,'skills/delegate'),copy,{recursive:true});
 function inspect(directory){for(const name of readdirSync(directory)){
  const path=join(directory,name),stat=lstatSync(path);assert.equal(stat.isSymbolicLink(),false,'Consumer pack cannot depend on external symlinks');
  if(stat.isDirectory()){inspect(path);continue;}assert.ok(stat.isFile());files.push(relative(copy,path));
  if(!path.endsWith('.md'))continue;
  for(const match of readFileSync(path,'utf8').matchAll(/\[[^\]]*\]\(([^)]+)\)/g)){
   const target=match[1];if(/^(https?:|#)/.test(target))continue;
   const linked=resolve(dirname(path),target.split('#')[0]),inside=relative(copy,linked);
   assert.ok(inside!== '..'&&!inside.startsWith('../')&&!isAbsolute(inside),`External consumer dependency: ${target}`);assert.ok(existsSync(linked),`Missing copied reference: ${target}`);
  }
 }}inspect(copy);
 const pack=JSON.parse(readFileSync(join(copy,'routing-pack.json'),'utf8'));assert.equal(pack.schema_version,'routing_pack.v1');assert.equal(pack.mode,'production');
 console.log(JSON.stringify({schema_version:'portable_skills_check.v1',status:'passed',skills:['delegate','refresh-models'],inert:true,copied_consumer_files:files.sort(),scope:'source_structure_and_reference_closure_only',behavioral_validation_required:true}));
}finally{rmSync(temporary,{recursive:true,force:true});}
