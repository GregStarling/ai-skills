import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mkdtemp, mkdir, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { Ledger } from "../../src/ledger/index.js";

const execute = promisify(execFile);
const provenance = { source: "test-process", observed_at: "2026-09-09T00:00:00.000Z", methodology: "isolated algorithm test, never production model evidence" };
let temporary: string;
let compiled: string;
beforeAll(async () => {
  temporary = await mkdtemp(join(tmpdir(), "governor-ledger-test-"));
  compiled = join(temporary, "compiled");
  await execute(process.execPath, [resolve("node_modules/typescript/bin/tsc"), "--ignoreConfig", "src/ledger/index.ts", "--outDir", compiled, "--rootDir", "src", "--target", "ES2022", "--module", "NodeNext", "--types", "node", "--skipLibCheck"]);
  await writeFile(join(compiled, "package.json"), '{"type":"module"}');
  await symlink(resolve("node_modules"), join(compiled, "node_modules"), "dir");
}, 20000);
afterAll(async () => { if (temporary) await rm(temporary, { recursive: true, force: true }); });

describe("atomic append-only ledger", () => {
  it("persists evidence/provenance, makes identical appends idempotent, rejects conflicts", async () => {
    const ledger = new Ledger(join(temporary, "basic"));
    const input = { id: "../../hostile/path", provenance, payload: { accepted: false, cost_usd: null, content_digest: "raw-record-digest" } };
    expect((await ledger.append(input)).inserted).toBe(true);
    expect((await ledger.append(input)).inserted).toBe(false);
    await expect(ledger.append({ ...input, payload: { ...input.payload, accepted: true } })).rejects.toThrow(/conflict/);
    expect((await ledger.get(input.id))?.payload).toEqual(input.payload);
    expect(await ledger.list()).toHaveLength(1);
    expect(await ledger.get("missing")).toBeNull();
  });

  it("detects changed payload and incorrect filename; ignores interrupted private writes", async () => {
    const directory = join(temporary, "integrity");
    const ledger = new Ledger(directory);
    await ledger.append({ id: "a", provenance, payload: { amount: 1 } });
    await writeFile(join(directory, ".interrupted.tmp"), '{"broken":');
    expect(await ledger.list()).toHaveLength(1);
    const name = (await readdir(directory)).find((entry) => entry.endsWith(".json"))!;
    const record = JSON.parse(await readFile(join(directory, name), "utf8")) as { payload: { amount: number } };
    record.payload.amount = 2;
    await writeFile(join(directory, name), JSON.stringify(record));
    await expect(ledger.get("a")).rejects.toThrow(/integrity/);
    await expect(ledger.list()).rejects.toThrow(/integrity/);
    const wrong = join(temporary, "wrong-name");
    await mkdir(wrong);
    const good = await new Ledger(join(temporary, "good")).append({ id: "a", provenance, payload: {} });
    await writeFile(join(wrong, "wrong.json"), JSON.stringify(good.record));
    await expect(new Ledger(wrong).list()).rejects.toThrow(/filename/);
  });

  it("serializes competing independent processes without losing records", async () => {
    const directory = join(temporary, "concurrent");
    const moduleUrl = pathToFileURL(join(compiled, "ledger/index.js")).href;
    const results = await Promise.all(Array.from({ length: 8 }, async (_, i) => {
      const source = `import {Ledger} from ${JSON.stringify(moduleUrl)}; const ledger=new Ledger(${JSON.stringify(directory)}); const p=${JSON.stringify(provenance)}; const result=await ledger.append({id:'shared',provenance:p,payload:{value:1}}); await ledger.append({id:${JSON.stringify(`unique-${i}`)},provenance:p,payload:{value:${i}}}); process.stdout.write(JSON.stringify(result.inserted));`;
      return execute(process.execPath, ["--input-type=module", "-e", source]);
    }));
    expect(results.filter((result) => result.stdout === "true")).toHaveLength(1);
    expect(await new Ledger(directory).list()).toHaveLength(9);
    expect((await readdir(directory)).some((name) => name.endsWith(".tmp"))).toBe(false);
  });

  it("rejects missing provenance and unsupported numeric data", async () => {
    const ledger = new Ledger(join(temporary, "invalid"));
    await expect(ledger.append({ id: "x", provenance: { ...provenance, source: "" }, payload: {} })).rejects.toThrow(/provenance|source/);
    await expect(ledger.append({ id: "x", provenance, payload: { cost: NaN } })).rejects.toThrow(/JSON/);
    await expect(ledger.append({ id: "x", provenance: { ...provenance, observed_at: "2026-02-31T00:00:00Z" }, payload: {} })).rejects.toThrow(/observation time/);
    expect(await ledger.list()).toEqual([]);
  });
});
