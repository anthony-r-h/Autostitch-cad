// Standalone review evidence. Does not change production fits or generated results.
// Run from repository root: node review/correction-evidence.mjs
import assert from 'node:assert/strict';
import {fitSpan, fitCircularSpan} from '../geometry.mjs';

const EPS = 1e-9;
const near = (a, b) => Math.abs(a - b) <= EPS;
const ceil = x => Math.ceil(x - 1e-11);
const floor = x => Math.floor(x + 1e-11);
const clamp = (x, low, high) => Math.min(high, Math.max(low, x));

function parameters(spec) {
  const {p, start = 0, end = 0} = spec;
  if (spec.R && p > 2 * spec.R) return null;
  const A = spec.R ? 2 * Math.asin(p / (2 * spec.R)) : p;
  const min = spec.R ? 2 * Math.asin(.9 * p / (2 * spec.R)) : .9 * p;
  const max = spec.R ? 2 * Math.asin(Math.min(1, 1.1 * p / (2 * spec.R))) : 1.1 * p;
  const total = spec.R ? Math.abs(spec.sweep) : spec.D;
  return {A, min, max, total, start, end, p, R: spec.R,
    e: max - A, c: A - min};
}

function candidate(v, n, k, i) {
  const residual = v.total - n * v.A;
  const adjusted = k ? v.A + residual / k : v.A;
  const chord = v.R ? 2 * v.R * Math.sin(adjusted / 2) : adjusted;
  return {n, k, i: k ? i : null,
    exactCentre: !k || 2 * i + k === n,
    deviation: Math.abs(chord / v.p - 1),
    centreError: k ? Math.abs(i - (n - k) / 2) : 0,
    correctedPitch: k ? chord : null};
}

function better(a, b) {
  if (!b) return true;
  if (a.k !== b.k) return a.k < b.k;
  if (a.exactCentre !== b.exactCentre) return a.exactCentre;
  if (!near(a.deviation, b.deviation)) return a.deviation < b.deviation;
  if (a.n !== b.n) return a.n < b.n;
  if (!near(a.centreError, b.centreError)) return a.centreError < b.centreError;
  return a.i > b.i;
}

function minimumK(v, n) {
  const r = v.total - n * v.A;
  if (near(r, 0)) return 0;
  const capacity = r > 0 ? v.e : v.c;
  return capacity > 0 ? ceil(Math.abs(r) / capacity) : Infinity;
}

function proposed(spec) {
  const v = parameters(spec);
  if (!v) return null;
  const q = v.start + v.end;
  const low = Math.max(1, q, ceil((v.total + q * v.e) / v.max));
  const high = floor((v.total - q * v.c) / v.min);
  if (low > high) return null;
  const ideal = v.total / v.A;
  // For the fixed 10% limit, the nearest admissible count on each side
  // supplies the global minimum; all tied counts are recovered below.
  const K = Math.min(...[floor(ideal), ceil(ideal)]
    .map(n => minimumK(v, clamp(n, low, high))));
  if (!Number.isFinite(K)) return null;
  let a = Math.max(low, ceil((v.total - K * v.e) / v.A));
  let b = Math.min(high, floor((v.total + K * v.c) / v.A));
  if (a > b) return null;
  let step = 1;
  if (K > 0) {
    let symmetricLow = Math.max(a, K + 2 * Math.max(v.start, v.end));
    if ((symmetricLow - K) % 2 !== 0) symmetricLow++;
    const symmetricHigh = b - ((b - K) % 2 !== 0 ? 1 : 0);
    if (symmetricLow <= symmetricHigh) {
      a = symmetricLow; b = symmetricHigh; step = 2;
    }
  }
  const below = a + step * floor((ideal - a) / step);
  const counts = new Set([clamp(below, a, b), clamp(below + step, a, b)]);
  let best = null;
  for (const n of counts) {
    if (K > n - q) continue;
    const i = clamp(Math.floor((n - K) / 2 + .5), v.start, n - v.end - K);
    const next = candidate(v, n, K, i);
    if (better(next, best)) best = next;
  }
  return best;
}

function oracle(spec) {
  const v = parameters(spec);
  if (!v) return null;
  let best = null;
  // Deliberately no proposed feasible-range, K-range, parity selection, or
  // rounding formula: enumerate counts, correction counts, and block starts.
  for (let n = 1; n <= Math.ceil(v.total / v.min) + 1; n++) {
    if (n < v.start + v.end) continue;
    for (let k = 0; k <= n - v.start - v.end; k++) {
      const residual = v.total - n * v.A;
      if (!k && !near(residual, 0)) continue;
      if (k && near(residual, 0)) continue;
      const changed = k ? v.A + residual / k : v.A;
      if (changed < v.min - EPS || changed > v.max + EPS) continue;
      for (let i = v.start; i <= n - v.end - k; i++) {
        const next = candidate(v, n, k, i);
        if (better(next, best)) best = next;
      }
      // Higher k at this n cannot improve the first ranking criterion.
      break;
    }
  }
  return best;
}

let checks = 0;
function verify(spec) {
  const actual = proposed(spec), expected = oracle(spec);
  assert.equal(Boolean(actual), Boolean(expected), JSON.stringify(spec));
  if (actual) {
    for (const key of ['n', 'k', 'i', 'exactCentre']) {
      assert.equal(actual[key], expected[key], `${JSON.stringify(spec)}: ${key}`);
    }
    assert.ok(near(actual.deviation, expected.deviation));
  }
  checks++;
  return actual;
}

const examples = [
  {D: 31.5, p: 3}, {D: 30.3, p: 3}, {D: 6.3, p: 3, end: 1},
  {D: 30.5, p: 3}, {D: 31, p: 3},
  {R: 10, sweep: Math.PI / 2, p: 3},
  {R: 10, sweep: 2 * Math.PI, p: 3, end: 1},
];
for (const spec of examples) {
  const selected = verify(spec);
  const options = {protectedStart: spec.start ?? 0, protectedEnd: spec.end ?? 0};
  const baseline = spec.R ? fitCircularSpan(spec.R, spec.sweep, spec.p, options)
    : fitSpan(spec.D, spec.p, options);
  console.log(JSON.stringify({spec, baseline: {n: baseline.intervalCount,
    k: baseline.correctionCount, indices: baseline.adjustedIndices}, proposed: selected}));
}
const protections = [[0, 0], [0, 1], [1, 0], [1, 1], [0, 3], [2, 1]];
for (const p of [2.7, 3, 3.38, 3.85]) {
  for (let units = 1; units <= 300; units++) {
    for (const [start, end] of protections) verify({D: units * .3, p, start, end});
  }
  for (const R of [1.35, 1.5, 2, 3, 10, 30]) {
    for (const sweep of [.1, .5, 1, Math.PI / 2, Math.PI, 1.5 * Math.PI, 2 * Math.PI]) {
      for (const [start, end] of protections) verify({R, sweep, p, start, end});
    }
  }
}
console.log(`Proposed correction selection: ${checks} cases matched exhaustive count/block oracle.`);
