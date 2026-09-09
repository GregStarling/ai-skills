export interface BinaryPair {
  taskId: string;
  cohortId: string;
  incumbentAccepted: boolean;
  candidateAccepted: boolean;
}

export interface PairedComparisonOptions {
  alpha: number;
  nonInferiorityMargin: number;
}

export interface PairedComparison {
  status: "sufficient" | "insufficient";
  sampleSize: number;
  counts: { bothAccepted: number; candidateOnly: number; incumbentOnly: number; bothRejected: number };
  qualityDelta: number | null;
  interval: { lower: number; upper: number; confidence: number; method: string } | null;
  mcnemarP: number | null;
  nonInferior: boolean;
}

// Exact binomial probabilities, evaluated in log space to avoid overflowing
// factorials. This is an exact-test calculation, not an asymptotic approximation.
function cdf(n: number, k: number, p: number, factorial: readonly number[]): number {
  if (k < 0) return 0;
  if (k >= n || p === 0) return 1;
  if (p === 1) return 0;
  const terms: number[] = [];
  let largest = -Infinity;
  for (let i = 0; i <= k; i++) {
    const term = factorial[n]! - factorial[i]! - factorial[n - i]! + i * Math.log(p) + (n - i) * Math.log1p(-p);
    terms.push(term);
    largest = Math.max(largest, term);
  }
  return Math.min(1, Math.exp(largest) * terms.reduce((sum, term) => sum + Math.exp(term - largest), 0));
}

function lowerBound(n: number, successes: number, tail: number, factorial: readonly number[]): number {
  if (successes === 0) return 0;
  if (successes === n) return Math.exp(Math.log(tail) / n);
  let low = 0;
  let high = 1;
  for (let iteration = 0; iteration < 60; iteration++) {
    const mid = (low + high) / 2;
    // P_p(X >= successes) rises with p. Invert its exact binomial tail.
    if (cdf(n, n - successes, 1 - mid, factorial) < tail) low = mid;
    else high = mid;
  }
  return low;
}

/**
 * Compare independent same-task pairs from one declared compatible cohort.
 * Callers must verify task/harness/treatment identity before constructing pairs.
 *
 * McNemar: min(1, 2 P[Binomial(discordant, 1/2) <= min(wins, losses)]).
 * Delta CI: exact Clopper–Pearson bounds for the two marginal discordance
 * probabilities, with alpha/4 in each of four tails. Bonferroni guarantees
 * simultaneous coverage >= 1-alpha despite dependence between the indicators.
 * Subtract loss bounds from win bounds. Conservative, no bootstrap/min-N rule.
 */
export function comparePaired(pairs: readonly BinaryPair[], options: PairedComparisonOptions): PairedComparison {
  if (!Number.isFinite(options.alpha) || options.alpha <= 0 || options.alpha >= 1 ||
      !Number.isFinite(options.nonInferiorityMargin) || options.nonInferiorityMargin < 0 || options.nonInferiorityMargin > 1) {
    throw new Error("Paired comparison requires explicit alpha in (0,1) and margin in [0,1]");
  }
  if (!Array.isArray(pairs)) throw new Error("Pairs must be an array");
  const seen = new Set<string>();
  const counts = { bothAccepted: 0, candidateOnly: 0, incumbentOnly: 0, bothRejected: 0 };
  let cohort: string | undefined;
  for (const pair of pairs) {
    if (!pair || typeof pair.taskId !== "string" || !pair.taskId.trim() || typeof pair.cohortId !== "string" || !pair.cohortId.trim() ||
        typeof pair.incumbentAccepted !== "boolean" || typeof pair.candidateAccepted !== "boolean") throw new Error("Malformed binary pair");
    if (seen.has(pair.taskId)) throw new Error(`Duplicate paired task: ${pair.taskId}`);
    if (cohort !== undefined && cohort !== pair.cohortId) throw new Error("Mismatched paired cohort");
    cohort = pair.cohortId;
    seen.add(pair.taskId);
    if (pair.candidateAccepted && pair.incumbentAccepted) counts.bothAccepted++;
    else if (pair.candidateAccepted) counts.candidateOnly++;
    else if (pair.incumbentAccepted) counts.incumbentOnly++;
    else counts.bothRejected++;
  }
  const n = pairs.length;
  if (n === 0) return { status: "insufficient", sampleSize: 0, counts, qualityDelta: null, interval: null, mcnemarP: null, nonInferior: false };
  const factorial = [0];
  for (let i = 1; i <= n; i++) factorial.push(factorial[i - 1]! + Math.log(i));
  const tail = options.alpha / 4;
  const bounds = (k: number): [number, number] => [lowerBound(n, k, tail, factorial), 1 - lowerBound(n, n - k, tail, factorial)];
  const [winLow, winHigh] = bounds(counts.candidateOnly);
  const [lossLow, lossHigh] = bounds(counts.incumbentOnly);
  const interval = { lower: winLow - lossHigh, upper: winHigh - lossLow, confidence: 1 - options.alpha, method: "bonferroni-clopper-pearson-discordance" };
  const nonInferior = interval.lower >= -options.nonInferiorityMargin;
  const discordant = counts.candidateOnly + counts.incumbentOnly;
  return {
    status: nonInferior ? "sufficient" : "insufficient", sampleSize: n, counts,
    qualityDelta: (counts.candidateOnly - counts.incumbentOnly) / n, interval,
    mcnemarP: Math.min(1, 2 * cdf(discordant, Math.min(counts.candidateOnly, counts.incumbentOnly), 0.5, factorial)), nonInferior,
  };
}
