import { z } from 'zod';
import { jsonCommand } from '../json-command.js';
import { parsePolicy, policyDigest } from '../../governance/policy.js';
import { validateRegistry } from '../../registry/index.js';
import { validateEvidenceLedger } from '../../evidence/index.js';
import { comparePaired } from '../../statistics/index.js';
import { parseTaskObservation } from '../../schema/index.js';
import { classifyRisk } from '../../governance/risk-review.js';

const evidenceInput = z.object({ ledger: z.unknown(), sources: z.record(z.string(), z.string()), observations: z.array(z.unknown()).default([]) }).strict();
const comparisonInput = z.object({
  pairs: z.array(z.object({ taskId: z.string(), cohortId: z.string(), incumbentAccepted: z.boolean(), candidateAccepted: z.boolean() }).strict()),
  options: z.object({ alpha: z.number(), nonInferiorityMargin: z.number() }).strict(),
}).strict();
const classifyInput = z.object({ policy: z.unknown(), taskClassId: z.string(), preSignals: z.array(z.string()), postSignals: z.array(z.string()) }).strict();

export const commands = [
  jsonCommand('validate-policy', 'Validate a human-owned policy file.', input => {
    const policy = parsePolicy(input);
    return { status: 'VALID', policy_version: policy.policy_version, policy_digest: policyDigest(policy) };
  }),
  jsonCommand('validate-registry', 'Verify model registry structure and content identities.', input => {
    const registry = validateRegistry(input);
    return { status: 'VALID', registry_id: registry.registry_id, records: registry.records.length, content_digest: registry.content_digest };
  }),
  jsonCommand('validate-evidence', 'Verify an evidence ledger and supplied source bytes.', input => {
    const request = evidenceInput.parse(input);
    const ledger = validateEvidenceLedger(request.ledger, new Map(Object.entries(request.sources)), request.observations.map(parseTaskObservation));
    return { status: 'VALID', records: ledger.records.length };
  }),
  jsonCommand('classify', 'Compute categorical pre/post risk from declared facts.', input => {
    const request = classifyInput.parse(input);
    return classifyRisk({ ...request, policy: parsePolicy(request.policy) });
  }),
  jsonCommand('compare', 'Compute exact paired binary statistics from raw pairs.', input => {
    const request = comparisonInput.parse(input);
    return comparePaired(request.pairs, request.options);
  }),
];
