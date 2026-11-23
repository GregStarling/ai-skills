import {readFileSync} from 'node:fs';
import {describe, expect, it} from 'vitest';
import {hashBytes} from '../../src/core/canonical.js';
import {assertEntriesOutlivePack, parseRoutingPack} from '../../src/routing/contracts.js';
import {requireFrontierRefresh} from '../../src/routing/frontier-refresh.js';

const read = (file: string) => JSON.parse(readFileSync(file, 'utf8'));
const routing = (name: string) => read(`data/routing/${name}.json`);
const pack = parseRoutingPack(read('skills/delegate/routing-pack.json'));
const index = read('docs/evidence/delegate-renewal-2026-11-23/evidence.json');

describe('November 2026 Delegate renewal', () => {
  it('preserves the October release and the evidence that supported it', () => {
    const archive = routing('archive/2026-10-11/preservation');
    expect(archive.source_revision).toBe('83d34e7df65c9d9c6528364a63ce5b8dfef60aa6');
    expect(archive.files).toHaveLength(10);
    for (const file of archive.files) {
      expect(hashBytes(readFileSync(file.archived_path))).toBe(file.content_digest);
    }
    expect(routing('archive/2026-10-11/routing-pack').content_digest)
      .toBe('sha256:37377985353aaa510aa7ebd65593e1f2fe254d4f50c5d8106333d5b3b09efa1d');
  });

  it('binds the two vendor discoveries to genuine reviews of the permitted targets', () => {
    const targets = routing('frontier-targets');
    expect(targets.vendor_frontiers.map((t: {model_id: string}) => t.model_id).sort())
      .toEqual(['claude-fable-5-2', 'gpt-6.2-astra']);
    expect(targets.targets.map((t: {model_id: string}) => t.model_id).sort())
      .toEqual(['claude-opus-5-5', 'gpt-6.1-sol']);
    const report = routing('frontier-probes');
    expect(report.probes.map((p: {evaluation: {status: string}}) => p.evaluation.status))
      .toEqual(['passed', 'passed']);
    const policy = readFileSync(targets.model_policy.path);
    expect(() => requireFrontierRefresh(targets, report, pack.generated_at, 7,
      routing('frontier-identity-evidence'), policy, routing('frontier-probe-reviews').evidence)).not.toThrow();
  });

  it('publishes the six freshly observed treatments within their evidence lifetimes', () => {
    const roster = Object.values(pack.treatments).map(t => `${t.model_id}/${t.effort}`).sort();
    expect(roster).toEqual(['claude-haiku-5-5/not_applicable', 'claude-opus-5-5/high',
      'claude-sonnet-5-5/low', 'gpt-6-luna/low', 'gpt-6.1-sol/high', 'gpt-6.1-sol/low']);
    expect(routing('reviewer-calibration/admissions').admissions).toEqual([]);
    const observed = routing('host-observations');
    expect(observed.runs).toHaveLength(4);
    for (const t of observed.treatments) {
      for (const date of [t.evidence.observed_at, t.evidence.availability.checked_at, t.evidence.pricing.checked_at]) {
        expect(Date.parse(date)).toBeGreaterThanOrEqual(Date.parse('2026-11-23T00:00:00Z'));
      }
    }
    expect(pack.routes).toHaveLength(15);
    expect(pack.routes.flatMap(r => [...r.workers, ...r.reviewers]).every(t => t.evidence_tier === 'provisional')).toBe(true);
    expect(() => assertEntriesOutlivePack(pack, 24)).not.toThrow();
    expect(index.published.content_digest).toBe(pack.content_digest);
  });

  it('accounts for all installed cases and admits only trace-reviewed passes', () => {
    const names = ['tinybug', 'mechanical', 'backend', 'ui', 'hardbug', 'multicomponent', 'fullproject'];
    const expected = ['claude', 'codex'].flatMap(host => names.map(name => `${host}/${name}`)).sort();
    expect(index.cases.map((c: {host: string; case: string}) => `${c.host}/${c.case}`).sort()).toEqual(expected);
    const acceptance = routing('installed-acceptance');
    const accepted = index.cases.filter((c: {verdict: string}) => c.verdict === 'PASS');
    expect(accepted).toHaveLength(14);
    expect(acceptance.cases.map((c: {id: string}) => c.id).sort())
      .toEqual(accepted.map((c: {run_id: string}) => c.run_id).sort());
    for (const c of acceptance.cases) {
      const row = accepted.find((item: {run_id: string}) => item.run_id === c.id);
      expect(c.copied_skill_digest).toBe(index.folder_freeze.skill_folder_digest);
      expect(row.result.digest).toBe(c.result_digest);
      expect(c.trace_digests).toContain(row.trace.digest);
      expect(c.receipt_count).toBeGreaterThan(0);
      expect(row.external_grader_passed).toBe(true);
      if (c.case === 'ui') {
        expect(c.browser.viewports.map((v: {width: number}) => v.width).sort((a: number, b: number) => a - b))
          .toEqual([320, 1280]);
      }
    }
    const original = 'renewal-2026-11-23-installed-codex-multicomponent';
    expect(index.excluded_attempts).toContainEqual(expect.objectContaining({
      run_id: original, verdict: 'REJECTED', original_grader_passed: true,
      supplemental_grader_passed: false, replacement_run_id: original + '-retry1',
    }));
    expect(acceptance.cases.some((c: {id: string}) => c.id === original)).toBe(false);
    expect(index.budget).toMatchObject({ceiling: 62, reserved: 0, halted: false});
    expect(index.execution_index.reduce((n: number, e: {executions: number}) => n + e.executions, 0))
      .toBe(index.budget.executions);
    expect(index.budget.executions).toBeLessThanOrEqual(index.budget.ceiling);
  });
});
