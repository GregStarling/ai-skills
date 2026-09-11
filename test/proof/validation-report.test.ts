import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const { writeValidationReport } = await import(pathToFileURL(resolve("scripts/verify/validation-report.mjs")).href);
const report = { schema_version: "v5_validation.v1", generated_at: "2026-09-10T18:30:00.123Z", status: "passed", routes: [{ task_class: "mechanical_work" }] };

let directory: string;
beforeAll(async () => { directory = await mkdtemp(join(tmpdir(), "governor-validation-report-test-")); });
afterAll(async () => { await rm(directory, { recursive: true, force: true }); });

describe("v5 validation report", () => {
  it("names the file by generated_at, creates the directory, and never overwrites", async () => {
    const target = join(directory, "reports");
    const path = writeValidationReport(report, target);
    expect(path).toBe(join(target, "20260910T183000Z-v5.json"));
    const bytes = await readFile(path, "utf8");
    expect(JSON.parse(bytes)).toEqual(report);
    let error: unknown;
    try { writeValidationReport({ ...report, status: "tampered" }, target); } catch (caught) { error = caught; }
    expect(error).toMatchObject({ code: "EEXIST" });
    expect(await readFile(path, "utf8")).toBe(bytes);
    expect(await readdir(target)).toEqual(["20260910T183000Z-v5.json"]);
  });

  it("rejects a generated_at that cannot name a file", () => {
    expect(() => writeValidationReport({ generated_at: "today" }, join(directory, "invalid"))).toThrow(/INVALID_GENERATED_AT/);
  });

  it("keeps routing code off the report directory and the v5 script off data/routing", async () => {
    const sources = (await readdir("src", { recursive: true })).filter((name) => name.endsWith(".ts")).map((name) => join("src", name));
    expect(sources.length).toBeGreaterThan(0);
    for (const file of [...sources, "scripts/refresh-routing-pack.mjs"]) expect(await readFile(file, "utf8"), file).not.toContain("v5-validation/");
    expect(await readFile("scripts/verify/v5.mjs", "utf8")).not.toContain("data/routing/v5-validation.json");
  });
});
