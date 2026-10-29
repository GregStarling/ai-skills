export interface LintFinding{level:'FAIL'|'WARN';rule:string;message:string}
export function lintSkill(folder:string):LintFinding[];
export function lintSkills(root:string):{skill:string;findings:LintFinding[]}[];
