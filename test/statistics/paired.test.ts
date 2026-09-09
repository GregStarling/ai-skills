import { describe, expect, it } from "vitest";
import { comparePaired, type BinaryPair } from "../../src/statistics/index.js";

const options = { alpha: 0.05, nonInferiorityMargin: 0.01 };
function pairs(wins: number, losses: number, ties = 0): BinaryPair[] {
  return Array.from({ length: wins + losses + ties }, (_, i) => ({
    taskId: `task-${i}`, cohortId: "same-pinned-harness", candidateAccepted: i < wins || i >= wins + losses, incumbentAccepted: i >= wins,
  }));
}

describe("paired exact inference", () => {
  // Independent integer/rational McNemar oracle; never model evidence.
  it.each([[0, 0, 1], [1, 0, 1], [5, 0, 0.0625], [10, 0, 0.001953125], [7, 3, 0.34375], [20, 20, 1], [30, 10, 0.0022214337732293643], [100, 50, 0.00005447533103392586]])("matches rational vector %i/%i", (wins, losses, p) => {
    expect(comparePaired(pairs(wins, losses, 1), options).mcnemarP).toBeCloseTo(p, 12);
    expect(comparePaired(pairs(losses, wins, 1), options).mcnemarP).toBeCloseTo(p, 12);
  });

  it.each([1, 25, 100, 400, 1000])("matches analytic zero-discordance interval for n=%i", (n) => {
    const result = comparePaired(pairs(0, 0, n), options);
    // Four simultaneous one-sided tails: alpha/4. Exact closed-form CP limit.
    const bound = 1 - Math.pow(options.alpha / 4, 1 / n);
    expect(result.interval?.lower).toBeCloseTo(-bound, 13);
    expect(result.interval?.upper).toBeCloseTo(bound, 13);
    expect(result.nonInferior).toBe(bound <= options.nonInferiorityMargin);
    expect(result.interval?.upper).toBeGreaterThan(0);
  });

  it("distinguishes empty, insufficient, and supported comparisons", () => {
    expect(comparePaired([], options)).toMatchObject({ status: "insufficient", qualityDelta: null, interval: null, mcnemarP: null });
    expect(comparePaired(pairs(0, 0, 1), options).status).toBe("insufficient");
    expect(comparePaired(pairs(0, 0, 1000), options).status).toBe("sufficient");
    const win = comparePaired(pairs(100, 0), options);
    expect(win.interval!.lower).toBeGreaterThan(0.9);
    expect(comparePaired(pairs(0, 100), options).interval!.upper).toBeLessThan(-0.9);
  });

  it("is symmetric and contains observed delta with bounded endpoints", () => {
    for (let wins = 0; wins <= 8; wins++) for (let losses = 0; losses <= 8; losses++) {
      const a = comparePaired(pairs(wins, losses, 2), options);
      const b = comparePaired(pairs(losses, wins, 2), options);
      expect(a.interval!.lower).toBeCloseTo(-b.interval!.upper, 12);
      expect(a.interval!.lower).toBeLessThanOrEqual(a.qualityDelta!);
      expect(a.interval!.upper).toBeGreaterThanOrEqual(a.qualityDelta!);
      expect(a.interval!.lower).toBeGreaterThanOrEqual(-1);
      expect(a.interval!.upper).toBeLessThanOrEqual(1);
    }
  });

  it("rejects duplicate tasks, mixed cohorts, non-binary results and invalid declared thresholds", () => {
    const row = pairs(1, 0)[0]!;
    expect(() => comparePaired([row, row], options)).toThrow(/Duplicate/);
    expect(() => comparePaired([row, { ...row, taskId: "other", cohortId: "different" }], options)).toThrow(/cohort/);
    expect(() => comparePaired([{ ...row, candidateAccepted: NaN } as unknown as BinaryPair], options)).toThrow(/Malformed/);
    for (const alpha of [NaN, Infinity, 0, 1, -1]) expect(() => comparePaired([row], { ...options, alpha })).toThrow();
    for (const nonInferiorityMargin of [NaN, Infinity, -1, 2]) expect(() => comparePaired([row], { ...options, nonInferiorityMargin })).toThrow();
  });
});
