import {describe,it,expect} from 'vitest';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {lintSkill,frontmatter,findSkills} from '../../skills/skill-audit/scripts/lint-skills.mjs';

const rules=(folder:string)=>lintSkill(folder).filter(x=>x.level==='FAIL').map(x=>x.rule).sort();
function skill(files:Record<string,string>){
 const folder=mkdtempSync(join(tmpdir(),'lint-skill-'));
 for(const [path,text] of Object.entries(files)){mkdirSync(join(folder,path,'..'),{recursive:true});writeFileSync(join(folder,path),text);}
 return folder;
}
const good='---\nname: good-skill\ndescription: Formats release notes from merged pull requests. Use when the user asks for "release notes for me".\n---\n';

describe('lint-skills',()=>{
 it('passes a well-formed skill with a conditioned reference',()=>{
  const folder=skill({'SKILL.md':`${good}\nBefore writing, read [style](references/style.md).\n`,'references/style.md':'Short.\n'});
  try{expect(rules(folder)).toEqual([]);}finally{rmSync(folder,{recursive:true,force:true});}
 });
 it('flags every structural rule',()=>{
  const long=Array.from({length:120},(_,i)=>`line ${i}`).join('\n');
  const folder=skill({
   'SKILL.md':`---\nname: Bad_claude\ndescription: Use this when you want it.\n---\n${Array.from({length:501},()=>'x').join('\n')}\nFurther reading when relevant: [a](references/a.md).\n`,
   'references/a.md':`${long}\nSee [b](b.md).\n`,'references/b.md':'Orphan.\n'});
  try{expect(rules(folder)).toEqual(['body-length','description-person','description-what','name','name','reference-depth','reference-toc','reference-unnamed','reference-when'].sort());}
  finally{rmSync(folder,{recursive:true,force:true});}
 });
 it('reads plain, quoted, folded and literal frontmatter without a YAML dependency',()=>{
  const parsed=frontmatter('---\nname: "q-skill"\ndescription: >-\n  Folds these\n  lines. Use when asked.\nmetadata:\n  type: x\nnote: |\n  a\n  b\nplain: one\n  two\n---\nBody\n');
  expect(parsed?.meta).toEqual({name:'q-skill',description:'Folds these lines. Use when asked.',note:'a\nb',plain:'one two'});
  expect(parsed?.body).toBe('Body\n');
  expect(frontmatter('No frontmatter')).toBeNull();
  // A scalar that starts on the next line, and a trailing comment on a plain value.
  expect(frontmatter('---\nname: n-skill # old name\ndescription:\n  "Solves problems. Use when asked."\n---\n')?.meta).toEqual({name:'n-skill',description:'Solves problems. Use when asked.'});
 });
 it('finds nested skill folders, flags XML tags and warns on missing exclusions',()=>{
  const root=skill({'a/SKILL.md':good,'group/b/SKILL.md':good.replace('Formats','Formats <b>bold</b>'),'group/b/references/r.md':'x'});
  try{
   expect(findSkills(root).map(path=>path.slice(root.length+1))).toEqual(['a','group/b']);
   expect(lintSkill(join(root,'group/b')).some(x=>x.message.includes('XML tag'))).toBe(true);
   expect(lintSkill(join(root,'a')).filter(x=>x.level==='WARN').map(x=>x.rule)).toEqual(['description-exclusions']);
   // skill-creator's "use this skill whenever" is a when-clause; a capitalised "My" is still first person.
   writeFileSync(join(root,'a/SKILL.md'),'---\nname: a\ndescription: My notes helper. Make sure to use this skill whenever notes come up.\n---\n');
   expect(rules(join(root,'a'))).toEqual(['description-person']);
  }finally{rmSync(root,{recursive:true,force:true});}
 });
});
