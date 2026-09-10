import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const cases = {
  tinybug: {
    task: 'Fix totalQuantity: preserve explicit zero; only null or undefined quantities default to one. Empty input returns zero. Modify quantity.mjs only.',
    files: { 'quantity.mjs': 'export const totalQuantity = items => items.reduce((sum, item) => sum + (item.quantity || 1), 0);\n' },
    checks: `const {totalQuantity}=await module('quantity.mjs'); assert.equal(totalQuantity([{quantity:0},{quantity:2},{}]),3); assert.equal(totalQuantity([{quantity:null},{quantity:undefined}]),2); assert.equal(totalQuantity([]),0);`,
  },
  mechanical: {
    task: 'Rename the exported slugify function to normalizeSlug and update its only consumer in link.mjs. Preserve behavior: trim, lowercase, replace runs of whitespace with hyphens. Remove the old export. Modify only slug.mjs and link.mjs.',
    files: {
      'slug.mjs': 'export const slugify = value => value.trim().toLowerCase().replace(/\\s+/g, "-");\n',
      'link.mjs': 'import {slugify} from "./slug.mjs";\nexport const link = name => "/items/" + slugify(name);\n',
    },
    checks: `const slug=await module('slug.mjs'); assert.equal(typeof slug.normalizeSlug,'function'); assert.equal('slugify' in slug,false); assert.equal(slug.normalizeSlug('  Two   Words '),'two-words'); const {link}=await module('link.mjs'); assert.equal(link('  A B '),'/items/a-b');`,
  },
  backend: {
    task: 'Implement paginate(items,{page=1,pageSize=10}={}) in paginate.mjs. Require positive integer page and pageSize; invalid values throw RangeError. Return {items,total,page,pageSize,totalPages}; use a new sliced items array, ceil totalPages, empty input has zero totalPages, beyond-last pages have no items. Do not mutate the input.',
    files: { 'paginate.mjs': 'export function paginate(items, options = {}) { return {items}; }\n' },
    checks: `const {paginate}=await module('paginate.mjs');const input=[1,2,3,4,5]; assert.deepEqual(paginate(input,{page:2,pageSize:2}),{items:[3,4],total:5,page:2,pageSize:2,totalPages:3}); assert.deepEqual(input,[1,2,3,4,5]); assert.equal(paginate([]).totalPages,0); assert.deepEqual(paginate(input,{page:99}).items,[]); for(const bad of [0,-1,1.5,NaN]){assert.throws(()=>paginate(input,{page:bad}),RangeError);assert.throws(()=>paginate(input,{pageSize:bad}),RangeError);} assert.notEqual(paginate(input).items,input);`,
  },
  ui: {
    task: 'Implement index.html as a responsive task-list interface using plain HTML/CSS and no external resources. Frontier specification: document title Task list, one main with h1 Task list, labeled task-title input, Add task submit button, list with two existing tasks Plan and Build, and native checkbox controls with associated labels. Use a form and semantic list. Layout must fit 320px and 1280px without horizontal overflow; use viewport metadata and responsive width constraints. Provide visible keyboard focus. No JavaScript functionality is required for this visual/semantic fixture.',
    files: { 'index.html': '<!doctype html><html><head><title>Untitled</title></head><body><div style="width:1400px">Tasks</div></body></html>\n' },
    checks: `const html=await read('index.html');assert.match(html,/<title>\\s*Task list\\s*<[/]title>/i);assert.match(html,/<meta[^>]+name=["']viewport["']/i);assert.match(html,/<main[\\s>]/i);assert.match(html,/<h1[^>]*>\\s*Task list\\s*<[/]h1>/i);assert.match(html,/<form[\\s>]/i);assert.match(html,/<label[\\s>]/i);assert.match(html,/<input[^>]+type=["']checkbox["']/i);assert.match(html,/<(?:ul|ol)[\\s>]/i);assert.match(html,/Plan/);assert.match(html,/Build/);assert.match(html,/Add task/);assert.match(html,/:focus(?:-visible)?/);assert.match(html,/(?:max-width|min\\(|clamp\\()/);assert.doesNotMatch(html,/(?:src|href)=["']https?:/i);`,
    limitation: 'Automated grade checks structure only; acceptance also requires browser inspection at 320px and 1280px, keyboard focus, labels and overflow.',
  },
  hardbug: {
    task: 'Fix createSearch(search,onResult) in search.mjs. It returns async run(query). Only the latest run may publish a result, even if an older promise resolves later. A rejection from the latest run must propagate to its caller. Stale rejected requests must resolve undefined and must not publish. Do not serialize requests or add dependencies.',
    files: { 'search.mjs': 'export function createSearch(search,onResult) { return async query => { const result=await search(query); onResult(result); return result; }; }\n' },
    checks: `const {createSearch}=await module('search.mjs'); const calls=[];const pending=new Map();const search=q=>new Promise((resolve,reject)=>pending.set(q,{resolve,reject}));const run=createSearch(search,v=>calls.push(v));const a=run('a'),b=run('b');pending.get('b').resolve('B');await b;pending.get('a').resolve('A');await a;assert.deepEqual(calls,['B']); const c=run('c'),d=run('d');pending.get('c').reject(new Error('stale'));assert.equal(await c,undefined); pending.get('d').reject(new Error('latest'));await assert.rejects(d,/latest/);assert.deepEqual(calls,['B']);`,
  },
  multicomponent: {
    task: 'Complete a small task feature across task.mjs, service.mjs and view.mjs. normalizeTask(input) trims title, rejects empty/non-string title with TypeError, requires nonempty string id, returns {id,title,done:Boolean(input.done)}. addTask(list,input) normalizes and returns a new array with the task, rejects duplicate ids with Error, leaves input list untouched. taskSummary(task) returns title plus " (done)" or " (open)" and must use normalized data. No external dependencies.',
    files: {
      'task.mjs': 'export const normalizeTask = input => input;\n',
      'service.mjs': 'export const addTask = (list,input) => [...list,input];\n',
      'view.mjs': 'export const taskSummary = task => task.title;\n',
    },
    checks: `const {normalizeTask}=await module('task.mjs');const {addTask}=await module('service.mjs');const {taskSummary}=await module('view.mjs'); assert.deepEqual(normalizeTask({id:'a',title:'  Plan ',done:0}),{id:'a',title:'Plan',done:false});assert.throws(()=>normalizeTask({id:'a',title:' '}),TypeError);assert.throws(()=>normalizeTask({id:'',title:'a'}),TypeError);const list=[];const out=addTask(list,{id:'a',title:' Work '});assert.deepEqual(out,[{id:'a',title:'Work',done:false}]);assert.deepEqual(list,[]);assert.throws(()=>addTask(out,{id:'a',title:'Again'}));assert.equal(taskSummary({id:'a',title:' Done ',done:true}),'Done (done)');assert.equal(taskSummary({id:'b',title:' Open '}),'Open (open)');`,
  },
  fullproject: {
    task: 'Build this tiny taskboard with a frontier coordinator and two or three independent workers. Settled contracts: store.mjs exports createStore() returning add(title), toggle(id), list(); add trims nonempty string title or throws TypeError, creates unique string id and done:false; toggle unknown id throws RangeError; list returns copies. view.mjs exports renderTasks(tasks): semantic <ul> with one <li> per task, escaped title text, checkbox input per task, checked attribute only for completed tasks and an associated accessible label. app.mjs imports both and exports createApp(): {add,toggle,html}; add/toggle mutate store, html renders current list. Give store and view disjoint worker ownership, integrate app after contracts settle, and frontier-verify. No server, frameworks, dependencies or external resources.',
    files: {
      'store.mjs': 'export function createStore(){ return {add(){},toggle(){},list(){return []}}; }\n',
      'view.mjs': 'export const renderTasks = tasks => "";\n',
      'app.mjs': 'export function createApp(){ return {add(){},toggle(){},html(){return ""}}; }\n',
    },
    checks: `const {createStore}=await module('store.mjs');const store=createStore();store.add('  A ');store.add('B');const tasks=store.list();assert.equal(tasks.length,2);assert.equal(tasks[0].title,'A');assert.equal(typeof tasks[0].id,'string');assert.notEqual(tasks[0].id,tasks[1].id);assert.equal(tasks[0].done,false);tasks[0].title='tampered';assert.equal(store.list()[0].title,'A');store.toggle(tasks[0].id);assert.equal(store.list()[0].done,true);assert.throws(()=>store.add(' '),TypeError);assert.throws(()=>store.toggle('missing'),RangeError); const {renderTasks}=await module('view.mjs');const html=renderTasks([{id:'a',title:'<img src=x>',done:false},{id:'b',title:'B',done:true}]);assert.match(html,/<ul[\\s>]/i);assert.equal((html.match(/<li[\\s>]/gi)||[]).length,2);assert.doesNotMatch(html,/<img/);assert.match(html,/&lt;img/);assert.equal((html.match(/type=["']checkbox["']/gi)||[]).length,2);assert.equal((html.match(/\\bchecked(?:[\\s=>])/gi)||[]).length,1);assert.match(html,/<label[\\s>]/i);const {createApp}=await module('app.mjs');const app=createApp();app.add('Plan');assert.match(app.html(),/Plan/);`,
    limitation: 'HTML string behavior is graded; native agent event traces must separately prove two or three worker decomposition and frontier integration.',
  },
};

export const caseNames = Object.keys(cases);
export async function createCase(name, directory) {
  const fixture = cases[name];
  if (!fixture) throw new Error(`Unknown portable case: ${name}`);
  const cwd = resolve(directory);
  await mkdir(cwd, { recursive: true });
  for (const [file, body] of Object.entries(fixture.files)) await writeFile(join(cwd, file), body, { flag: 'wx' });
  return { name, directory: cwd, task: fixture.task, owned_files: Object.keys(fixture.files), grading_limitations: fixture.limitation ?? null };
}

export async function gradeCase(name, directory, {behaviorOnly=false} = {}) {
  const fixture = cases[name];
  if (!fixture) throw new Error(`Unknown portable case: ${name}`);
  if (behaviorOnly && name !== 'mechanical') throw new Error('Behavior-only baseline is defined for the mechanical fixture');
  const gradingDirectory = await mkdtemp(join(tmpdir(), 'delegate-portable-grader-'));
  const cwd = resolve(directory);
  const checks = behaviorOnly ? `const {link}=await module('link.mjs');assert.equal(link('  Two   Words '),'/items/two-words');assert.equal(link('A'),'/items/a');assert.equal(link(''),'/items/');` : fixture.checks;
  const body = `import assert from 'node:assert/strict';\nimport {readFile} from 'node:fs/promises';\nconst base=${JSON.stringify(pathToFileURL(cwd + '/').href)};\nconst module=file=>import(new URL(file,base));\nconst read=file=>readFile(new URL(file,base),'utf8');\n${checks}\nconsole.log('PASS ${name}${behaviorOnly ? '-behavior' : ''}');\n`;
  const path = join(gradingDirectory, 'grade.mjs');
  await writeFile(path, body);
  const result = spawnSync(process.execPath, [path], { cwd, encoding: 'utf8', timeout: 5000 });
  return { name, passed: result.status === 0, exit_code: result.status, signal: result.signal, stdout: result.stdout, stderr: result.stderr, grader_path: path, grading_limitations: fixture.limitation ?? null };
}
