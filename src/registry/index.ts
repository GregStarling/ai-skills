import { contentDigest, canonicalJson } from "../core/canonical.js";
import { parseModelRegistry, validateCandidateAgainstRegistry, SharedSchemaValidationError, type Candidate, type ModelRegistry } from "../schema/index.js";

export function validateRegistry(input: unknown): ModelRegistry {
  const registry = parseModelRegistry(input);
  for (const [index, record] of registry.records.entries()) {
    if (contentDigest(record) !== record.content_digest) throw new SharedSchemaValidationError("model_registry", [{ code: "RECORD_DIGEST_MISMATCH", path: ["records", index, "content_digest"], message: "Model record content does not match its immutable digest." }]);
  }
  if (contentDigest(registry) !== registry.content_digest) throw new SharedSchemaValidationError("model_registry", [{ code: "REGISTRY_DIGEST_MISMATCH", path: ["content_digest"], message: "Registry contents do not match their cited digest." }]);
  // Return the exact hashed representation; implicit parser defaults must be
  // published by producers before a record receives immutable authority.
  if (canonicalJson(input) !== canonicalJson(registry)) throw new SharedSchemaValidationError("model_registry", [{ code: "NONCANONICAL_REGISTRY", path: [], message: "Publish the complete parsed registry representation before hashing it." }]);
  return registry;
}

export function bindCandidate(input: unknown, registry: ModelRegistry): Candidate {
  return validateCandidateAgainstRegistry(input, validateRegistry(registry));
}
