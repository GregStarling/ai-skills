import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it, vi } from "vitest";
import { runInNewContext } from 'node:vm';
import { runProcess } from "../../src/runtime/process.js";
import { hashBytes } from "../../src/core/canonical.js";
const directories: string[] = [];
afterEach(() => { for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true }); });
const directory = () => { const path = mkdtempSync(join(tmpdir(), "governor-process-")); directories.push(path); return path; };
it("runs real argv/stdin without shell expansion and preserves stdout/stderr digests", async () => {
  const output = await runProcess({ executable: process.execPath, args: ["-e", "process.stdout.write(process.argv[1]);process.stdin.pipe(process.stdout);process.stderr.write('err')", "$(touch NEVER)"], stdin: " exact stdin", cwd: process.cwd(), timeoutMs: 2000, outputDirectory: directory() });
  expect(output).toMatchObject({ exit_code: 0, timed_out: false, cleanup: "complete" });
  expect(readFileSync(output.stdout_path, "utf8")).toBe("$(touch NEVER) exact stdin"); expect(output.stdout_digest).toBe(hashBytes("$(touch NEVER) exact stdin")); expect(output.stderr_digest).toBe(hashBytes("err"));
});
it("terminates an ignoring process and its inherited-group child on timeout", async () => {
  const script = "const{spawn}=require('node:child_process');const c=spawn(process.execPath,['-e','process.on(\"SIGTERM\",()=>{});setInterval(()=>{},1000)'],{stdio:'ignore'});process.stdout.write(String(c.pid));process.on('SIGTERM',()=>{});setInterval(()=>{},1000)";
  const output = await runProcess({ executable: process.execPath, args: ["-e", script], cwd: process.cwd(), timeoutMs: 150, outputDirectory: directory() });
  expect(output.timed_out).toBe(true); expect(output.cleanup).toBe("complete");
  const pid = Number(readFileSync(output.stdout_path, "utf8")); expect(pid).toBeGreaterThan(0);
  // A killed child can briefly be a reparented zombie; it cannot execute further work.
  let alive = false; try { process.kill(pid, 0); alive = true; } catch { /* absent */ }
  if (alive) await new Promise((resolve) => setTimeout(resolve, 100));
  expect(() => process.kill(pid, 0)).toThrow();
});
it("retains failure evidence and caps output rather than hanging or allocating indefinitely", async () => {
  const failed = await runProcess({ executable: "governor-nonexistent-executable", args: [], cwd: process.cwd(), timeoutMs: 1000, outputDirectory: directory() });
  expect(failed.spawn_error).toContain("ENOENT");
  const bounded = await runProcess({ executable: process.execPath, args: ["-e", "setInterval(()=>process.stdout.write('x'.repeat(4096)),1)"], cwd: process.cwd(), timeoutMs: 2000, outputDirectory: directory(), maxOutputBytes: 100 });
  expect(bounded.output_limited).toBe(true); expect(readFileSync(bounded.stdout_path).length).toBe(100);
});
it('recognizes already-reaped process groups across JavaScript contexts',async()=>{
  const error=runInNewContext('Object.assign(new Error("group is gone"),{code:"ESRCH"})');
  expect(error instanceof Error).toBe(false);
  const kill=vi.spyOn(process,'kill').mockImplementation(()=>{throw error;});
  try{
    const output=await runProcess({executable:process.execPath,args:['-e','process.stdout.write("done")'],cwd:process.cwd(),timeoutMs:2000,outputDirectory:directory()});
    expect(output).toMatchObject({exit_code:0,cleanup:'complete'});
  }finally{kill.mockRestore();}
});
it('waits for exiting process-group members that report EPERM before declaring cleanup complete',async()=>{
  const real=process.kill.bind(process);let eperm=2;
  const kill=vi.spyOn(process,'kill').mockImplementation(((pid:number,signal?:string|number)=>{
    if(pid<0){if(eperm-->0)throw Object.assign(new Error('exiting'),{code:'EPERM'});throw Object.assign(new Error('gone'),{code:'ESRCH'});}
    return real(pid,signal);
  }) as typeof process.kill);
  try{
    const output=await runProcess({executable:process.execPath,args:['-e','process.stdout.write("done")'],cwd:process.cwd(),timeoutMs:2000,outputDirectory:directory()});
    expect(output).toMatchObject({exit_code:0,cleanup:'complete'});expect(eperm).toBeLessThan(0);
  }finally{kill.mockRestore();}
});
it('still reports failed cleanup when a process group never settles',async()=>{
  const kill=vi.spyOn(process,'kill').mockImplementation((()=>{throw Object.assign(new Error('denied'),{code:'EPERM'});}) as typeof process.kill);
  try{
    const output=await runProcess({executable:process.execPath,args:['-e','process.stdout.write("done")'],cwd:process.cwd(),timeoutMs:2000,outputDirectory:directory()});
    expect(output.cleanup).toBe('failed');
  }finally{kill.mockRestore();}
});
