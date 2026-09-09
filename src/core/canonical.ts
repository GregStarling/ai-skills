import { createHash } from "node:crypto";

/** Canonical JSON accepts JSON data only; it never drops unsupported values. */
export function canonicalJson(value: unknown): string {
  const active = new Set<object>();
  const encode = (input: unknown): string => {
    if (input === null || typeof input === "boolean" || typeof input === "string") return JSON.stringify(input);
    if (typeof input === "number" && Number.isFinite(input)) return JSON.stringify(input);
    if (typeof input !== "object" || input === null) throw new TypeError("NON_JSON_VALUE: canonical data must contain only finite JSON values.");
    if (active.has(input)) throw new TypeError("CYCLIC_VALUE: canonical data cannot contain cycles.");
    active.add(input);
    try {
      if (Object.getOwnPropertySymbols(input).length > 0) throw new TypeError("NON_JSON_VALUE: symbol keys are unsupported.");
      if (Array.isArray(input)) {
        if (Object.keys(input).length !== input.length) throw new TypeError("NON_JSON_VALUE: sparse or decorated arrays are unsupported.");
        return `[${Array.from(input, encode).join(",")}]`;
      }
      if (Object.getPrototypeOf(input) !== Object.prototype && Object.getPrototypeOf(input) !== null) throw new TypeError("NON_JSON_VALUE: expected a plain object.");
      return `{${Object.keys(input).sort().map((key) => {
        const property = Object.getOwnPropertyDescriptor(input, key)!;
        if (!("value" in property)) throw new TypeError("NON_JSON_VALUE: accessors are unsupported.");
        return `${JSON.stringify(key)}:${encode(property.value)}`;
      }).join(",")}}`;
    } finally { active.delete(input); }
  };
  return encode(value);
}

export function hashBytes(value: string | Uint8Array): string {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

export function digest(value: unknown): string { return hashBytes(canonicalJson(value)); }

/** The record's own digest is excluded; every other top-level field is bound. */
export function contentDigest(value: object): string {
  if (value === null || Array.isArray(value) || (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)) throw new TypeError("NON_JSON_VALUE: record must be a plain object.");
  canonicalJson(value);
  return digest(Object.fromEntries(Object.entries(value).filter(([key]) => key !== "content_digest")));
}
