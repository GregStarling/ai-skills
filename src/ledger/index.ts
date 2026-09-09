import { mkdir, open, link, unlink, readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { canonicalJson, digest } from "../core/canonical.js";

const observationTime = z.iso.datetime({ offset: true });

export interface LedgerProvenance {
  source: string;
  observed_at: string;
  methodology: string;
  [key: string]: unknown;
}

export interface LedgerInput<T = unknown> {
  id: string;
  provenance: LedgerProvenance;
  payload: T;
}

export interface LedgerRecord<T = unknown> extends LedgerInput<T> {
  schema_version: "governor-ledger.v1";
  content_digest: string;
}

function fileName(id: string): string { return `${digest(id).slice(7)}.json`; }
function code(error: unknown): string | undefined {
  return error instanceof Error && "code" in error ? String(error.code) : undefined;
}

function validateInput(value: LedgerInput): void {
  if (!value || typeof value.id !== "string" || !value.id.trim() || !value.provenance ||
      typeof value.provenance.source !== "string" || !value.provenance.source.trim() ||
      typeof value.provenance.methodology !== "string" || !value.provenance.methodology.trim() ||
      !observationTime.safeParse(value.provenance.observed_at).success ||
      !("payload" in value)) throw new Error("Ledger input requires id, payload and explicit source, methodology, observation time");
  canonicalJson(value);
}

function verify<T>(value: unknown, expectedId?: string): LedgerRecord<T> {
  if (!value || typeof value !== "object") throw new Error("Malformed ledger record");
  const record = value as LedgerRecord<T>;
  validateInput(record);
  const { content_digest, ...body } = record;
  if (record.schema_version !== "governor-ledger.v1" || content_digest !== digest(body) || (expectedId !== undefined && record.id !== expectedId)) {
    throw new Error("Ledger integrity check failed");
  }
  return record;
}

/** Append-only atomic files: hard-link publication cannot replace an existing
 * record and coordinates independent processes without a lock or stale-lock TTL.
 * A crash leaves only an ignored .tmp file or a complete published record.
 * Each acknowledged append fsyncs its file and directory before returning.
 * ponytail: directory scan is linear; add an index only when ledger size warrants it.
 */
export class Ledger {
  constructor(readonly directory: string) {}

  async get<T = unknown>(id: string): Promise<LedgerRecord<T> | null> {
    try { return verify<T>(JSON.parse(await readFile(join(this.directory, fileName(id)), "utf8")), id); }
    catch (error) { if (code(error) === "ENOENT") return null; throw error; }
  }

  async append<T>(input: LedgerInput<T>): Promise<{ inserted: boolean; record: LedgerRecord<T> }> {
    validateInput(input);
    // Round-trip freezes the caller's mutable data before the first await.
    const body = JSON.parse(canonicalJson({ schema_version: "governor-ledger.v1", id: input.id, provenance: input.provenance, payload: input.payload })) as Omit<LedgerRecord<T>, "content_digest">;
    const record: LedgerRecord<T> = { ...body, content_digest: digest(body) };
    await mkdir(this.directory, { recursive: true });
    const temporary = join(this.directory, `.${randomUUID()}.tmp`);
    const handle = await open(temporary, "wx", 0o600);
    try {
      await handle.writeFile(canonicalJson(record) + "\n");
      await handle.sync();
    } finally { await handle.close(); }
    try {
      try { await link(temporary, join(this.directory, fileName(record.id))); }
      catch (error) {
        if (code(error) !== "EEXIST") throw error;
        const existing = await this.get<T>(record.id);
        if (!existing || canonicalJson(existing) !== canonicalJson(record)) throw new Error(`Ledger id conflict: ${record.id}`);
        await this.syncDirectory();
        return { inserted: false, record: existing };
      }
      await this.syncDirectory();
      return { inserted: true, record };
    } finally { await unlink(temporary).catch((error: unknown) => { if (code(error) !== "ENOENT") throw error; }); }
  }

  private async syncDirectory(): Promise<void> {
    const directory = await open(this.directory, "r");
    try { await directory.sync(); } finally { await directory.close(); }
  }

  async list<T = unknown>(): Promise<LedgerRecord<T>[]> {
    let names: string[];
    try { names = await readdir(this.directory); }
    catch (error) { if (code(error) === "ENOENT") return []; throw error; }
    const records: LedgerRecord<T>[] = [];
    for (const name of names.sort()) {
      if (!name.endsWith(".json")) continue;
      const record = verify<T>(JSON.parse(await readFile(join(this.directory, name), "utf8")));
      if (name !== fileName(record.id)) throw new Error("Ledger filename integrity check failed");
      records.push(record);
    }
    return records;
  }
}
