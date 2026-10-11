import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
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
  // The leader writes the child PID only after both processes ignore SIGTERM, so the PID is the readiness signal.
  const script = "process.on('SIGTERM',()=>{});const{spawn}=require('node:child_process');const c=spawn(process.execPath,['-e','process.on(\"SIGTERM\",()=>{});process.stdout.write(\"ready\");setInterval(()=>{},1000)'],{stdio:['ignore','pipe','ignore']});c.stdout.once('data',()=>process.stdout.write(String(c.pid)));setInterval(()=>{},1000)";
  // Node startup on a loaded runner is unbounded, so hold runProcess's timeout clock until both processes are ready.
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  let output: Awaited<ReturnType<typeof runProcess>>;
  try {
    const outputDirectory = directory(), stdoutPath = join(outputDirectory, "stdout.jsonl");
    const run = runProcess({ executable: process.execPath, args: ["-e", script], cwd: process.cwd(), timeoutMs: 150, outputDirectory });
    while (readFileSync(stdoutPath, "utf8") === "") await sleep(10);
    vi.advanceTimersByTime(150); // timeout: SIGTERM to the group, which both processes ignore
    await sleep(100); // real time for SIGTERM to land; a leader that did not ignore it would exit with SIGTERM
    vi.advanceTimersByTime(250); // escalation: SIGKILL to the group
    vi.useRealTimers(); // before close handling, whose group settling polls on real timers
    output = await run;
  } finally { vi.useRealTimers(); }
  expect(output.timed_out).toBe(true); expect(output.signal).toBe("SIGKILL"); expect(output.cleanup).toBe("complete");
  const pid = Number(readFileSync(output.stdout_path, "utf8")); expect(pid).toBeGreaterThan(0);
  // A killed child can linger while exiting or as a reparented zombie until reaped, which is slow under load, but it
  // cannot execute further work. A surviving child keeps this loop polling until the test times out.
  const exists = () => { try { process.kill(pid, 0); return true; } catch { return false; } };
  while (exists()) await sleep(10);
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
