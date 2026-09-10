import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  acceptanceGateDefinitionSha256,
  acceptanceGateId,
  acceptanceGateInputScope,
  acceptanceGatesForTaskId,
  acceptanceGatesFromUnknown,
  certificationProfile,
} from './contracts.js';

const SRC_ROOT = fileURLToPath(new URL('..', import.meta.url));

function sourceFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      files.push(...sourceFiles(path));
    } else if (/\.ts$/u.test(entry) && !/\.test\.ts$/u.test(entry)) {
      files.push(path);
    }
  }
  return files;
}

function commandGate(taskId: string, criterion: string) {
  return {
    id: acceptanceGateId(taskId, criterion),
    criterion,
    oracle: {
      kind: 'command',
      command: 'npm test',
      expected_stdout_line: 'FOREMAN_TESTS_OK',
      origin: 'planner_derived',
    },
  };
}

describe('acceptance gate contracts', () => {
  it('derives stable criterion identities and certification profiles', () => {
    expect(acceptanceGateId('t1', '  works   correctly ')).toBe(
      acceptanceGateId('t1', 'works correctly'),
    );
    expect(certificationProfile({ taskTier: 'quick', phaseRiskTier: 'low' })).toBe('base');
    expect(certificationProfile({ taskTier: 'quick', phaseRiskTier: 'standard' })).toBe('enhanced');
    expect(certificationProfile({ taskTier: 'complex', phaseRiskTier: 'low' })).toBe('enhanced');
  });

  it('normalizes legacy gate inputs to global and validates explicit path scope', () => {
    const criterion = 'Verification passes.';
    const legacy = acceptanceGatesFromUnknown({
      taskId: 't1',
      acceptanceCriteria: [criterion],
      value: [commandGate('t1', criterion)],
    })[0]!;
    const scoped = acceptanceGatesFromUnknown({
      taskId: 't1',
      acceptanceCriteria: [criterion],
      value: [{ ...commandGate('t1', criterion), inputs: { mode: 'paths', paths: ['src/a.ts'] } }],
    })[0]!;

    expect(acceptanceGateInputScope(legacy)).toEqual({ mode: 'global' });
    expect(acceptanceGateInputScope(scoped)).toEqual({ mode: 'paths', paths: ['src/a.ts'] });
    expect(acceptanceGateDefinitionSha256(legacy)).toBe(
      acceptanceGateDefinitionSha256({ ...legacy, inputs: { mode: 'global' } }),
    );
    expect(() =>
      acceptanceGatesFromUnknown({
        taskId: 't1',
        acceptanceCriteria: [criterion],
        value: [
          { ...commandGate('t1', criterion), inputs: { mode: 'paths', paths: ['../secret'] } },
        ],
      }),
    ).toThrow(/stay inside the repository/u);
  });

  // t774: renaming a task re-keys the gates it owns. The gate set a short-id
  // entry carries is NOT the set the phase-qualified entry carries, and every
  // renaming path has to go through this one helper so none of them can drift
  // into carrying an id over or keying off criterion text alone.
  it('re-keys a gate set onto the task it hangs on, preserving everything else', () => {
    const criterion = 'Verification passes.';
    const gates = acceptanceGatesFromUnknown({
      taskId: 't010',
      acceptanceCriteria: [criterion],
      value: [commandGate('t010', criterion)],
    });

    const rekeyed = acceptanceGatesForTaskId('PKG-X-29-t010', gates);

    expect(rekeyed.map((gate) => gate.id)).toEqual([acceptanceGateId('PKG-X-29-t010', criterion)]);
    expect(rekeyed[0]?.id).not.toBe(gates[0]?.id);
    expect(rekeyed[0]?.oracle).toEqual(gates[0]?.oracle);
    expect(rekeyed[0]?.criterion).toBe(criterion);
    // Re-keying onto the id a gate already has is the identity operation.
    expect(acceptanceGatesForTaskId('t010', gates)).toEqual(gates);
    // And the result parses as the renamed task's own gate set.
    expect(() =>
      acceptanceGatesFromUnknown({
        taskId: 'PKG-X-29-t010',
        acceptanceCriteria: [criterion],
        value: rekeyed,
      }),
    ).not.toThrow();
  });

  // t782 armor: a task's certification profile is a pure function of (task
  // tier, phase risk tier). Lane must never enter that decision — a lane is
  // planner-chosen text, so any lane-conditioned downgrade would let a plan
  // pick its own certification bar by naming a lane. The behavioral lane
  // constants exist for scheduling and dispatch only.
  describe('lane membership never reaches the certification profile', () => {
    const LANE_TOKEN = /\blanes?\b|\bLanes?\b|_LANES\b/u;
    const CERTIFICATION_TOKEN = /certification_?[Pp]rofile|CertificationProfile/u;

    it('takes only tier inputs, with no lane parameter', () => {
      const source = readFileSync(join(SRC_ROOT, 'acceptance', 'contracts.ts'), 'utf8');
      const declaration = /export function certificationProfile\([\s\S]*?\n\}/u.exec(source)?.[0];

      expect(declaration).toBeDefined();
      expect(declaration).not.toMatch(LANE_TOKEN);
      // The two inputs it does take, pinned so a third cannot arrive unnoticed.
      expect(declaration).toContain('taskTier');
      expect(declaration).toContain('phaseRiskTier');
    });

    it('has no source line that mentions a lane and a certification profile together', () => {
      const offenders: string[] = [];
      for (const path of sourceFiles(SRC_ROOT)) {
        for (const [index, line] of readFileSync(path, 'utf8').split('\n').entries()) {
          // Prose in a comment is not a code path.
          const code = line.replace(/\/\/.*$/u, '').replace(/^\s*\*.*$/u, '');
          if (LANE_TOKEN.test(code) && CERTIFICATION_TOKEN.test(code)) {
            offenders.push(`${relative(SRC_ROOT, path)}:${String(index + 1)}: ${line.trim()}`);
          }
        }
      }

      expect(offenders).toEqual([]);
    });

    // The behavioral lane constants have a fixed, reviewed set of consumers.
    // A new importer is where a lane-conditioned certification downgrade would
    // arrive, so adding one has to be a deliberate edit to this list.
    it('keeps the behavioral lane constants to their reviewed consumers', () => {
      const importers = sourceFiles(SRC_ROOT)
        .filter((path) => {
          const content = readFileSync(path, 'utf8');
          return (
            /\bMANUAL_EVIDENCE_LANES\b/u.test(content) ||
            /\bAPP_CLASS_LANES\b/u.test(content) ||
            /\bSHIPPING_CLASS_LANES\b/u.test(content)
          );
        })
        .map((path) => relative(SRC_ROOT, path).replaceAll('\\', '/'))
        .sort();

      expect(importers).toEqual([
        // run-plan: pause manual-evidence tasks for the operator.
        'commands/run-plan.ts',
        // run-task: which lanes may present fast checks as evidence.
        'commands/run-task/support.ts',
        // materializer: app-lane verification and manual-evidence dispatch.
        'engine-loop/materialize-task-graph.ts',
        // the declarations themselves.
        'policy/classifier.ts',
        // task-readiness: manual-evidence tasks are not writer-dispatchable.
        'policy/task-readiness.ts',
      ]);
    });
  });

  it('parses exactly one deterministic gate per criterion', () => {
    const criterion = 'Tests prove the behavior.';
    const gates = acceptanceGatesFromUnknown({
      taskId: 't1',
      acceptanceCriteria: [criterion],
      value: [commandGate('t1', criterion)],
    });
    expect(gates).toHaveLength(1);
    expect(acceptanceGateDefinitionSha256(gates[0]!)).toMatch(/^[a-f0-9]{64}$/u);
  });

  it('joins a planner-emitted evidence list into the single required_evidence string', () => {
    const criterion = 'A person confirms the installer window composition.';
    const gates = acceptanceGatesFromUnknown({
      taskId: 't9',
      acceptanceCriteria: [criterion],
      value: [
        {
          id: acceptanceGateId('t9', criterion),
          criterion,
          oracle: {
            kind: 'owner_decision',
            decision_prompt: 'Review the mounted DMG screenshot.',
            required_evidence: [
              'build/test-lab/latest/evidence/dmg-window.png',
              ' Confirmation of the mark-left composition ',
            ],
          },
        },
      ],
    });
    expect(gates).toHaveLength(1);
    const oracle = gates[0]!.oracle;
    if (oracle.kind !== 'owner_decision') throw new Error('expected owner_decision');
    expect(oracle.required_evidence).toBe(
      'build/test-lab/latest/evidence/dmg-window.png; Confirmation of the mark-left composition',
    );
    expect(() =>
      acceptanceGatesFromUnknown({
        taskId: 't9',
        acceptanceCriteria: [criterion],
        value: [
          {
            id: acceptanceGateId('t9', criterion),
            criterion,
            oracle: { kind: 'owner_decision', decision_prompt: 'Review.', required_evidence: [] },
          },
        ],
      }),
    ).toThrow(/required_evidence must be a non-empty string/u);
  });

  it('accepts planner alias spellings gate_id and oracle.type', () => {
    const criterion = 'Tests prove the aliased behavior.';
    const gates = acceptanceGatesFromUnknown({
      taskId: 't3',
      acceptanceCriteria: [criterion],
      value: [
        {
          gate_id: acceptanceGateId('t3', criterion),
          criterion,
          oracle: {
            type: 'command',
            command: "npm test -- focused && printf '%s\\n' 'FOREMAN_GATE_OK:t3:1'",
            expected_stdout_line: 'FOREMAN_GATE_OK:t3:1',
            origin: 'planner_derived',
          },
        },
      ],
    });
    expect(gates).toHaveLength(1);
    expect(gates[0]!.oracle.kind).toBe('command');
    expect(gates[0]!.id).toBe(acceptanceGateId('t3', criterion));
  });

  // F25 (soak attempt 21, 2026-09-04): the planner was asked to compute the gate
  // id's SHA-256 itself and did so only when it happened to run `shasum` in its
  // sandbox; the one correction turn it did not, all 18 ids were wrong and the
  // graph was rejected. The id is a pure function of (task, criterion) and the
  // criterion equality is the real binding, so the seam derives it.
  it('derives the gate id from the task and criterion, ignoring a supplied or missing id', () => {
    // The live artifact: t0_scaffold's criterion was legitimately edited by the
    // correction and the planner guessed the new hash.
    const criterion =
      'The repository ships a strict TypeScript Node/Vite scaffold with dev, build, start, and test scripts, Node engine metadata, and .gitignore coverage.';
    const guessed = {
      ...commandGate('t0_scaffold', criterion),
      id: 'gate_c8f3a1e2a18775df',
    };
    const [derived] = acceptanceGatesFromUnknown({
      taskId: 't0_scaffold',
      acceptanceCriteria: [criterion],
      value: [guessed],
    });
    expect(derived!.id).toBe(acceptanceGateId('t0_scaffold', criterion));
    expect(derived!.id).not.toBe('gate_c8f3a1e2a18775df');

    const complete = commandGate('t0_scaffold', criterion);
    const withoutId = { criterion: complete.criterion, oracle: complete.oracle };
    const [fromMissing] = acceptanceGatesFromUnknown({
      taskId: 't0_scaffold',
      acceptanceCriteria: [criterion],
      value: [withoutId],
    });
    expect(fromMissing!.id).toBe(acceptanceGateId('t0_scaffold', criterion));

    // The binding that actually matters is still enforced.
    expect(() =>
      acceptanceGatesFromUnknown({
        taskId: 't0_scaffold',
        acceptanceCriteria: [criterion],
        value: [{ ...guessed, criterion: 'A different criterion.' }],
      }),
    ).toThrow(/criterion must exactly match/u);
  });

  it('rejects partial coverage, fixed output, unsafe cwd, and incomplete imported provenance', () => {
    expect(() =>
      acceptanceGatesFromUnknown({ taskId: 't1', acceptanceCriteria: ['a'], value: [] }),
    ).toThrow(/exactly one gate/u);

    for (const patch of [
      { command: 'echo OK' },
      { cwd: '../outside' },
      { origin: 'external_promoted' },
    ]) {
      const gate = commandGate('t1', 'a');
      Object.assign(gate.oracle, patch);
      expect(() =>
        acceptanceGatesFromUnknown({ taskId: 't1', acceptanceCriteria: ['a'], value: [gate] }),
      ).toThrow();
    }
  });
});
