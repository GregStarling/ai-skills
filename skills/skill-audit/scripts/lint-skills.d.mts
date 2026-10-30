export interface LintFinding{level:'FAIL'|'WARN';rule:string;message:string}
export function frontmatter(source:string):{meta:Record<string,string>;body:string}|null;
export function findSkills(path:string,depth?:number):string[];
export function lintSkill(folder:string):LintFinding[];
export function lintSkills(root:string):{skill:string;findings:LintFinding[]}[];
