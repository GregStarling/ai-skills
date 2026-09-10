import { spawn } from "node:child_process";
import { mkdirSync, openSync, closeSync, readFileSync, writeSync } from "node:fs";
import { join } from "node:path";
import { hashBytes } from "../core/canonical.js";

export type ProcessInput = { executable: string; args: readonly string[]; cwd: string; timeoutMs: number; outputDirectory: string; stdin?: string; env?: NodeJS.ProcessEnv; maxOutputBytes?: number };
export type ProcessResult = { started_at: string; completed_at: string; exit_code: number | null; signal: string | null; timed_out: boolean; output_limited: boolean; spawn_error: string | null; stdout_path: string; stderr_path: string; stdout_digest: string; stderr_digest: string; cleanup: "complete" | "failed" };
/** Real process execution with no shell and bounded group cleanup; no model mocks. */
export async function runProcess(input: ProcessInput): Promise<ProcessResult> {
  if (!Number.isSafeInteger(input.timeoutMs) || input.timeoutMs <= 0 || input.timeoutMs > 3_600_000) throw new Error("INVALID_PROCESS_TIMEOUT");
  const limit = input.maxOutputBytes ?? 32 * 1024 * 1024;
  if (!Number.isSafeInteger(limit) || limit <= 0) throw new Error("INVALID_OUTPUT_LIMIT");
  mkdirSync(input.outputDirectory, { recursive: true });
  const stdoutPath = join(input.outputDirectory, "stdout.jsonl"); const stderrPath = join(input.outputDirectory, "stderr.log");
  const stdoutFd = openSync(stdoutPath, "wx");
  let stderrFd: number;
  try { stderrFd = openSync(stderrPath, "wx"); } catch (error) { closeSync(stdoutFd); throw error; }
  const started = new Date().toISOString();
  let timedOut = false, outputLimited = false, outputBytes = 0, cleanup: "complete" | "failed" = "complete";
  let spawnError: string | null = null;
  let child: ReturnType<typeof spawn>;
  try { child = spawn(input.executable, [...input.args], { cwd: input.cwd, env: input.env ?? process.env, detached: process.platform !== "win32", stdio: ["pipe", "pipe", "pipe"], shell: false }); }
  catch (error) { closeSync(stdoutFd); closeSync(stderrFd); throw error; }
  let killTimer: NodeJS.Timeout | undefined;
  const kill = (signal: NodeJS.Signals) => {
    if (child.pid === undefined) return;
    try { if (process.platform === "win32") child.kill(signal); else process.kill(-child.pid, signal); }
    catch (error) { if (!(error instanceof Error && "code" in error && error.code === "ESRCH")) cleanup = "failed"; }
  };
  const stop = () => { kill("SIGTERM"); killTimer ??= setTimeout(() => kill("SIGKILL"), 250); };
  const timer = setTimeout(() => { timedOut = true; stop(); }, input.timeoutMs);
  for (const [stream, fd] of [[child.stdout, stdoutFd], [child.stderr, stderrFd]] as const) stream?.on("data", (chunk: Buffer) => {
    const remaining = Math.max(0, limit - outputBytes); outputBytes += chunk.byteLength;
    if (remaining > 0) writeSync(fd, chunk.subarray(0, remaining));
    if (outputBytes > limit) { outputLimited = true; stop(); }
  });
  const result = await new Promise<{ code: number | null; signal: string | null }>((resolve) => {
    child.on("error", (error) => { spawnError = error.message; });
    child.on("close", (code, signal) => resolve({ code, signal }));
    child.stdin?.on("error", () => { /* an early child exit is captured by close */ });
    child.stdin?.end(input.stdin ?? "");
  });
  clearTimeout(timer);
  // The leader can exit before grandchildren. Always terminate its remaining group.
  kill("SIGKILL");
  if (killTimer) clearTimeout(killTimer);
  closeSync(stdoutFd); closeSync(stderrFd);
  return { started_at: started, completed_at: new Date().toISOString(), exit_code: result.code, signal: result.signal, timed_out: timedOut, output_limited: outputLimited, spawn_error: spawnError, stdout_path: stdoutPath, stderr_path: stderrPath, stdout_digest: hashBytes(readFileSync(stdoutPath)), stderr_digest: hashBytes(readFileSync(stderrPath)), cleanup };
}
