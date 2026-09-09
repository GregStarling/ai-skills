import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { isAbsolute, join, resolve } from "node:path";
import { z } from "zod";
import { canonicalJson, contentDigest, hashBytes } from "../core/canonical.js";
import { proofReportSchema } from "../schema/shared.js";

const artifactSchema = z.object({ path: z.string().refine(isAbsolute), digest: z.string().regex(/^sha256:[a-f0-9]{64}$/) }).strict();
const statusSchema = z.enum(["passed", "failed", "blocked", "insufficient_evidence"]);
const invocationSchema = z.object({
  command: z.string().min(1), args: z.array(z.string()), cwd: z.string().refine(isAbsolute),
  started_at: z.iso.datetime({ offset: true }), completed_at: z.iso.datetime({ offset: true }),
  exit_code: z.number().int().nullable(), signal: z.string().nullable(), error: z.string().nullable(),
  timed_out: z.boolean(), output_limit_exceeded: z.boolean(), stdout: artifactSchema, stderr: artifactSchema,
}).strict();
const detailSchema = z.object({
  check_id: z.string().regex(/^[a-z][a-z0-9_:-]{1,95}$/), mode: z.enum(["offline", "live"]),
  evidence_kind: z.enum(["synthetic", "harvested", "runtime"]), coverage: z.array(z.string().min(1)),
  invocation: artifactSchema, grader: artifactSchema.optional(), test_report: artifactSchema.optional(),
  artifacts: z.array(artifactSchema), status: statusSchema,
  operational_result: z.object({ status: z.enum(["blocked", "insufficient_evidence"]), reason: z.string().min(1), evidence: artifactSchema }).strict().optional(),
}).strict();
const executionReportSchema = z.object({
  schema_version: z.literal("execution_proof.v1"), mode: z.enum(["offline", "live"]),
  summary: proofReportSchema, checks: z.array(detailSchema).nonempty(), content_digest: z.string(),
}).strict();
type Artifact = z.infer<typeof artifactSchema>;
type Invocation = z.infer<typeof invocationSchema>;
export type ExecutedProofCheck = z.infer<typeof detailSchema>;
export type ExecutionProofReport = z.infer<typeof executionReportSchema>;
export interface ExecuteProofCheckOptions {
  checkId: string; mode: "offline" | "live"; command: string; args: string[]; cwd: string;
  artifactDirectory: string; timeoutMs: number; maxOutputBytes?: number;
  coverage: string[]; evidenceKind: "synthetic" | "harvested" | "runtime";
  artifacts?: string[]; grader?: { command: string; args: string[] }; testReport?: string;
  /** Parse actual command stdout as strict {status,reason}. Never a pass override. */
  operationalResult?: boolean;
}

const mintedChecks = new WeakSet<object>();
async function artifact(path: string): Promise<Artifact> { const absolute = resolve(path); return { path: absolute, digest: hashBytes(await readFile(absolute)) }; }
async function bytes(ref: Artifact): Promise<Buffer> {
  const data = await readFile(ref.path);
  if (hashBytes(data) !== ref.digest) throw new Error(`PROOF_ARTIFACT_TAMPERED: ${ref.path}`);
  return data;
}
async function capture(command: string, args: string[], options: ExecuteProofCheckOptions, directory: string): Promise<Artifact> {
  await mkdir(directory, { recursive: true });
  const started_at = new Date().toISOString();
  const output: Buffer[] = [], errors: Buffer[] = [];
  let outputSize = 0, timed_out = false, output_limit_exceeded = false, error: string | null = null;
  const max = options.maxOutputBytes ?? 8 * 1024 * 1024;
  const child = spawn(command, args, { cwd: resolve(options.cwd), shell: false, detached: process.platform !== "win32", stdio: ["ignore", "pipe", "pipe"] });
  const kill = () => { try { if (process.platform !== "win32" && child.pid) process.kill(-child.pid, "SIGKILL"); else child.kill("SIGKILL"); } catch { /* Already exited. */ } };
  const timer = setTimeout(() => { timed_out = true; kill(); }, options.timeoutMs);
  const collect = (target: Buffer[], data: Buffer) => {
    outputSize += data.length;
    if (outputSize > max) { output_limit_exceeded = true; kill(); } else target.push(data);
  };
  child.stdout.on("data", (data: Buffer) => collect(output, data));
  child.stderr.on("data", (data: Buffer) => collect(errors, data));
  child.on("error", (failure) => { error = failure.message; });
  const result = await new Promise<{ exit_code: number | null; signal: string | null }>((done) => child.on("close", (exit_code, signal) => done({ exit_code, signal })));
  clearTimeout(timer);
  const stdoutPath = join(directory, "stdout.txt"), stderrPath = join(directory, "stderr.txt");
  await writeFile(stdoutPath, Buffer.concat(output));
  await writeFile(stderrPath, Buffer.concat(errors));
  const invocation: Invocation = { command, args, cwd: resolve(options.cwd), started_at, completed_at: new Date().toISOString(), ...result, error, timed_out, output_limit_exceeded, stdout: await artifact(stdoutPath), stderr: await artifact(stderrPath) };
  const path = join(directory, "invocation.json");
  await writeFile(path, canonicalJson(invocation) + "\n");
  return artifact(path);
}

async function readInvocation(ref: Artifact): Promise<Invocation> {
  const invocation = invocationSchema.parse(JSON.parse((await bytes(ref)).toString()));
  if (Date.parse(invocation.completed_at) < Date.parse(invocation.started_at)) throw new Error("PROOF_INVALID_CHRONOLOGY");
  await Promise.all([bytes(invocation.stdout), bytes(invocation.stderr)]);
  return invocation;
}
function succeeded(invocation: Invocation): boolean {
  return invocation.exit_code === 0 && invocation.signal === null && invocation.error === null && !invocation.timed_out && !invocation.output_limit_exceeded;
}
async function resultFor(check: ExecutedProofCheck): Promise<{ status: ExecutedProofCheck["status"]; invocation: Invocation }> {
  const invocation = await readInvocation(check.invocation);
  const grader = check.grader ? await readInvocation(check.grader) : undefined;
  let passed = succeeded(invocation) && (!grader || succeeded(grader));
  for (const ref of check.artifacts) await bytes(ref);
  if (check.test_report) {
    // Vitest/Jest JSON has objective executed/failed/skipped counts. `success:true`
    // by itself is insufficient, and zero or skipped tests cannot count as passes.
    const counts = z.object({ numTotalTests: z.number().int().positive(), numPassedTests: z.number().int().nonnegative(), numFailedTests: z.number().int().nonnegative(), numPendingTests: z.number().int().nonnegative(), numTodoTests: z.number().int().nonnegative().optional(), success: z.boolean() }).parse(JSON.parse((await bytes(check.test_report)).toString()));
    passed = passed && counts.success && counts.numPassedTests === counts.numTotalTests && counts.numFailedTests === 0 && counts.numPendingTests === 0 && (counts.numTodoTests ?? 0) === 0;
  }
  if (check.operational_result) {
    if (check.mode !== "live" || check.evidence_kind !== "runtime") throw new Error("PROOF_OPERATIONAL_RESULT_REQUIRES_LIVE_RUNTIME");
    if (canonicalJson(check.operational_result.evidence) !== canonicalJson(invocation.stdout)) throw new Error("PROOF_OPERATIONAL_RESULT_NOT_OBSERVED_STDOUT");
    const observed = z.object({ status: z.enum(["blocked", "insufficient_evidence"]), reason: z.string().min(1) }).strict().parse(JSON.parse((await bytes(check.operational_result.evidence)).toString()));
    if (observed.status !== check.operational_result.status || observed.reason !== check.operational_result.reason) throw new Error("PROOF_OPERATIONAL_RESULT_MISMATCH");
    // An objective grader failure or timeout is still a failed check, never HOLD.
    if (grader && !succeeded(grader) || invocation.timed_out || invocation.output_limit_exceeded || invocation.signal) return { status: "failed", invocation };
    return { status: observed.status, invocation };
  }
  return { status: passed ? "passed" : "failed", invocation };
}

export async function executeProofCheck(options: ExecuteProofCheckOptions): Promise<ExecutedProofCheck> {
  if (!Number.isInteger(options.timeoutMs) || options.timeoutMs <= 0 || !Number.isSafeInteger(options.maxOutputBytes ?? 1) || (options.maxOutputBytes ?? 1) <= 0) throw new Error("PROOF_INVALID_EXECUTION_LIMITS");
  if (options.mode === "live" && options.evidenceKind !== "runtime") throw new Error("PROOF_LIVE_REQUIRES_RUNTIME_EVIDENCE");
  // Validate identifiers before making paths or launching anything.
  detailSchema.shape.check_id.parse(options.checkId);
  if (options.testReport) {
    const exists = await stat(options.testReport).then(() => true, (error: unknown) => {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") return false;
      throw error;
    });
    if (exists) throw new Error("PROOF_TEST_REPORT_MUST_BE_NEW");
  }
  const directory = resolve(options.artifactDirectory, `${options.checkId}-${randomUUID()}`);
  const invocation = await capture(options.command, options.args, options, join(directory, "command"));
  const check: ExecutedProofCheck = {
    check_id: options.checkId, mode: options.mode, evidence_kind: options.evidenceKind,
    coverage: options.coverage, invocation, artifacts: await Promise.all((options.artifacts ?? []).map(artifact)), status: "failed",
  };
  if (options.grader) check.grader = await capture(options.grader.command, options.grader.args, options, join(directory, "grader"));
  if (options.testReport) check.test_report = await artifact(options.testReport);
  if (options.operationalResult) {
    const evidence = (await readInvocation(invocation)).stdout;
    const observed = z.object({ status: z.enum(["blocked", "insufficient_evidence"]), reason: z.string().min(1) }).strict().parse(JSON.parse((await bytes(evidence)).toString()));
    check.operational_result = { ...observed, evidence };
  }
  check.status = (await resultFor(check)).status;
  const parsed = detailSchema.parse(check);
  mintedChecks.add(parsed);
  return parsed;
}

export async function createProofReport(options: { id: string; mode: "offline" | "live"; checks: ExecutedProofCheck[] }): Promise<ExecutionProofReport> {
  if (!options.checks.length || options.checks.some((check) => !mintedChecks.has(check))) throw new Error("PROOF_REQUIRES_EXECUTED_CHECKS");
  const checks = options.checks.map((check) => detailSchema.parse(check));
  const summaryChecks = [];
  const allDigests = new Set<string>();
  for (const check of checks) {
    if (check.mode !== options.mode) throw new Error("PROOF_MODE_MISMATCH");
    const result = await resultFor(check);
    if (check.status !== result.status) throw new Error("PROOF_STATUS_MISMATCH");
    const { invocation } = result;
    for (const ref of [check.invocation, check.grader, check.test_report, check.operational_result?.evidence, invocation.stdout, invocation.stderr, ...check.artifacts]) if (ref) allDigests.add(ref.digest);
    summaryChecks.push({ check_id: check.check_id, command: canonicalJson([invocation.command, ...invocation.args]), started_at: invocation.started_at, completed_at: invocation.completed_at, status: check.status, stdout_digest: invocation.stdout.digest, stderr_digest: invocation.stderr.digest });
  }
  const report = {
    schema_version: "execution_proof.v1" as const, mode: options.mode,
    summary: proofReportSchema.parse({ schema_version: "proof_report.v1", proof_report_id: options.id, generated_at: new Date().toISOString(), artifact_digests: [...allDigests].sort(), checks: summaryChecks }),
    checks, content_digest: "",
  };
  report.content_digest = contentDigest(report);
  await verifyProofReport(report);
  return report;
}

/** Verifies retained evidence and internal consistency, not nonrepudiable OS
 * attestation. A party able to replace all local bytes can fabricate a history. */
export async function verifyProofReport(input: unknown, options: { requiredCoverage?: string[] } = {}): Promise<{ valid: true; passed: boolean; coverage: string[]; blocked: string[] }> {
  const report = executionReportSchema.parse(input);
  if (contentDigest(report) !== report.content_digest) throw new Error("PROOF_REPORT_TAMPERED");
  const coverage = new Set<string>(), digests = new Set<string>();
  if (report.checks.length !== report.summary.checks.length) throw new Error("PROOF_CHECK_COUNT_MISMATCH");
  for (const [index, check] of report.checks.entries()) {
    if (check.mode !== report.mode || report.mode === "live" && check.evidence_kind !== "runtime") throw new Error("PROOF_MODE_MISMATCH");
    const { status, invocation } = await resultFor(check);
    const summary = report.summary.checks[index]!;
    if (check.status !== status || summary.status !== status || summary.check_id !== check.check_id || summary.command !== canonicalJson([invocation.command, ...invocation.args]) || summary.started_at !== invocation.started_at || summary.completed_at !== invocation.completed_at || summary.stdout_digest !== invocation.stdout.digest || summary.stderr_digest !== invocation.stderr.digest) throw new Error("PROOF_STATUS_OR_INVOCATION_MISMATCH");
    for (const ref of [check.invocation, check.grader, check.test_report, check.operational_result?.evidence, invocation.stdout, invocation.stderr, ...check.artifacts]) if (ref) digests.add(ref.digest);
    if (status === "passed") check.coverage.forEach((id) => coverage.add(id));
  }
  if (canonicalJson([...digests].sort()) !== canonicalJson([...report.summary.artifact_digests].sort())) throw new Error("PROOF_ARTIFACT_MANIFEST_MISMATCH");
  for (const id of options.requiredCoverage ?? []) if (!coverage.has(id)) throw new Error(`PROOF_MISSING_COVERAGE: ${id}`);
  return { valid: true, passed: report.checks.every((check) => check.status === "passed"), coverage: [...coverage].sort(), blocked: report.checks.filter((check) => check.status === "blocked" || check.status === "insufficient_evidence").map((check) => check.check_id) };
}
