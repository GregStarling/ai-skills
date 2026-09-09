import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { contentDigest } from "../../src/core/canonical.js";
import { createProofReport, executeProofCheck, verifyProofReport, type ExecuteProofCheckOptions, type ExecutedProofCheck } from "../../src/proof/index.js";

let directory: string;
beforeAll(async () => { directory = await mkdtemp(join(tmpdir(), "governor-proof-test-")); });
afterAll(async () => { await rm(directory, { recursive: true, force: true }); });
function options(source: string, extra: Partial<ExecuteProofCheckOptions> = {}): ExecuteProofCheckOptions {
  return { checkId: "real_check", mode: "offline", command: process.execPath, args: ["-e", source], cwd: directory, artifactDirectory: directory, timeoutMs: 3000, coverage: ["AC-043"], evidenceKind: "synthetic", ...extra };
}
const reportFor = async (check: ExecutedProofCheck) => createProofReport({ id: "proof_test", mode: check.mode, checks: [check] });

describe("execution proof", () => {
  it("runs commands and objective graders, reloads reports, and binds actual artifact bytes", async () => {
    const path = join(directory, "product.txt");
    const check = await executeProofCheck(options(`require('node:fs').writeFileSync(${JSON.stringify(path)},'expected');console.log('ran')`, {
      artifacts: [path], grader: { command: process.execPath, args: ["-e", `if(require('node:fs').readFileSync(${JSON.stringify(path)},'utf8')!=='expected')process.exit(1)`] },
    }));
    const report = await reportFor(check);
    expect(await verifyProofReport(JSON.parse(JSON.stringify(report)), { requiredCoverage: ["AC-043"] })).toMatchObject({ valid: true, passed: true, coverage: ["AC-043"] });
    await writeFile(path, "tampered");
    await expect(verifyProofReport(report)).rejects.toThrow(/TAMPERED/);
  });

  it("rejects fabricated/empty checks and unknown statuses", async () => {
    await expect(createProofReport({ id: "proof_test", mode: "offline", checks: [] })).rejects.toThrow(/EXECUTED/);
    await expect(createProofReport({ id: "proof_test", mode: "offline", checks: [{ status: "passed" } as ExecutedProofCheck] })).rejects.toThrow(/EXECUTED/);
    const report = await reportFor(await executeProofCheck(options("console.log('real')")));
    const unknown = JSON.parse(JSON.stringify(report));
    unknown.checks[0].status = "skipped";
    unknown.content_digest = contentDigest(unknown);
    await expect(verifyProofReport(unknown)).rejects.toThrow();
  });

  it("cannot relabel a failed invocation as a pass even after rehashing the report", async () => {
    const report = await reportFor(await executeProofCheck(options("console.error('failure');process.exit(7)")));
    expect(await verifyProofReport(report)).toMatchObject({ valid: true, passed: false, coverage: [] });
    await expect(verifyProofReport(report, { requiredCoverage: ["AC-043"] })).rejects.toThrow(/MISSING_COVERAGE/);
    report.checks[0]!.status = "passed";
    report.summary.checks[0]!.status = "passed";
    report.content_digest = contentDigest(report);
    await expect(verifyProofReport(report)).rejects.toThrow(/MISMATCH/);
  });

  it("retains failed grader and timeout results as failures", async () => {
    const grader = await executeProofCheck(options("console.log('worker accepted')", { grader: { command: process.execPath, args: ["-e", "process.exit(1)"] } }));
    expect(grader.status).toBe("failed");
    const timeout = await executeProofCheck(options("setInterval(()=>{},1000)", { timeoutMs: 50 }));
    expect(timeout.status).toBe("failed");
    const report = await reportFor(timeout);
    expect(await verifyProofReport(report)).toMatchObject({ passed: false });
  });

  it("requires executed nonempty unskipped test counts and rejects stale grader reports", async () => {
    const path = join(directory, "tests.json");
    const counts = { success: true, numTotalTests: 2, numPassedTests: 1, numFailedTests: 0, numPendingTests: 1 };
    const check = await executeProofCheck(options(`require('node:fs').writeFileSync(${JSON.stringify(path)},${JSON.stringify(JSON.stringify(counts))})`, { testReport: path }));
    expect(check.status).toBe("failed");
    await expect(executeProofCheck(options("process.exit(0)", { testReport: path }))).rejects.toThrow(/MUST_BE_NEW/);
    const empty = join(directory, "empty-tests.json");
    await expect(executeProofCheck(options(`require('node:fs').writeFileSync(${JSON.stringify(empty)},${JSON.stringify(JSON.stringify({ ...counts, numTotalTests: 0, numPassedTests: 0, numPendingTests: 0 }))})`, { testReport: empty }))).rejects.toThrow();
  });

  it("accepts observed live insufficient evidence without counting it as passed coverage", async () => {
    const check = await executeProofCheck(options(`console.log(JSON.stringify({status:'insufficient_evidence',reason:'No production-qualified candidate'}))`, { mode: "live", evidenceKind: "runtime", operationalResult: true, coverage: ["AC-044"] }));
    expect(await verifyProofReport(await reportFor(check))).toMatchObject({ valid: true, passed: false, blocked: ["real_check"], coverage: [] });
    await expect(executeProofCheck(options(`console.log(JSON.stringify({status:'passed',reason:'trust me'}))`, { mode: "live", evidenceKind: "runtime", operationalResult: true }))).rejects.toThrow();
    await expect(executeProofCheck(options("process.exit(0)", { mode: "live" }))).rejects.toThrow(/RUNTIME/);
  });

  it("rejects missing retained stdout and mismatched mode", async () => {
    const check = await executeProofCheck(options("console.log('observed')"));
    await expect(createProofReport({ id: "proof_test", mode: "live", checks: [check] })).rejects.toThrow(/MODE/);
    const report = await reportFor(check);
    const invocation = JSON.parse(await readFile(check.invocation.path, "utf8"));
    await rm(invocation.stdout.path);
    await expect(verifyProofReport(report)).rejects.toThrow(/ENOENT/);
  });
});
