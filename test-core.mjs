import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import {
  DEFAULT_PROFILE,
  makeSlit,
  classifySlits,
  mergeVirtualSlits,
  validateSpacing,
  fitSpan,
  fitCircularSpan,
  solveCorner,
} from './geometry.mjs';
import {CASES,PITCHES,runCase} from './case-suite.mjs';

// These are numerical examples and geometric invariants. Invalid candidate
// guards are internal checks, not normal stitch-intersection scenarios.
const EPS = 1e-8;
const TAU = 2 * Math.PI;
const rad = degrees => degrees * Math.PI / 180;
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const scale = (a, k) => [a[0] * k, a[1] * k];
const length = a => Math.hypot(a[0], a[1]);
const rotate = (a, theta) => [
  a[0] * Math.cos(theta) - a[1] * Math.sin(theta),
  a[0] * Math.sin(theta) + a[1] * Math.cos(theta),
];
const sum = xs => xs.reduce((a, b) => a + b, 0);

function near(actual, expected, message = '') {
  assert.ok(Number.isFinite(actual), `${message}: expected a finite number, received ${actual}`);
  assert.ok(Math.abs(actual - expected) <= EPS * Math.max(1, Math.abs(expected)),
    `${message}: expected ${expected}, received ${actual}`);
}

function pointNear(actual, expected, message = '') {
  assert.ok(Array.isArray(actual) && actual.length === 2, `${message}: expected a 2D point`);
  near(actual[0], expected[0], `${message} x`);
  near(actual[1], expected[1], `${message} y`);
}

function segment(a, b) {
  return { a, b, center: scale(add(a, b), .5), angle: Math.atan2(b[1] - a[1], b[0] - a[0]) };
}

function checkIntervals(result, pitch, expectedCount, expectedAdjustedIndices, protection = {}) {
  const { protectedStart = 0, protectedEnd = 0 } = protection;
  assert.equal(result.status, expectedAdjustedIndices.length ? 'adjusted' : 'exact');
  assert.equal(result.intervalCount, expectedCount);
  assert.equal(result.intervals.length, expectedCount);
  assert.equal(result.correctionCount, expectedAdjustedIndices.length);
  assert.deepEqual(result.adjustedIndices, expectedAdjustedIndices);
  assert.equal(result.protectedStart, protectedStart);
  assert.equal(result.protectedEnd, protectedEnd);
  assert.ok(result.feasibleCountRange.min <= expectedCount && expectedCount <= result.feasibleCountRange.max,
    'chosen count belongs to the admissible range');
  const marked = new Set(result.adjustedIndices);
  assert.equal(marked.size, result.adjustedIndices.length, 'correction indices are unique');
  result.intervals.forEach((interval, index) => {
    assert.ok(Number.isFinite(interval) && interval > 0, 'finite positive intervals');
    assert.ok(interval >= pitch * .9 - EPS && interval <= pitch * 1.1 + EPS, '10 percent bound');
    if (!marked.has(index)) assert.equal(interval, pitch, `ordinary interval ${index} is exactly nominal`);
    else {
      assert.ok(Math.abs(interval - pitch) > EPS, 'a marked interval must differ');
      assert.ok(index >= protectedStart && index < expectedCount - protectedEnd,
        'correction is outside the protected prefix and suffix');
    }
    if (index < protectedStart || index >= expectedCount - protectedEnd) {
      assert.equal(interval, pitch, `protected interval ${index} is exactly nominal`);
    }
  });
  const measuredDeviation = Math.max(0, ...result.intervals.map(interval => Math.abs(interval - pitch) / pitch));
  near(result.maxFractionDeviation, measuredDeviation, 'reported pitch deviation');
}

function checkSpanResult(result, requestedLength, pitch, expectedCount, expectedAdjustedIndices, protection = {}) {
  checkIntervals(result, pitch, expectedCount, expectedAdjustedIndices, protection);
  near(sum(result.intervals), requestedLength, 'span reaches its downstream anchor');
  near(result.residual, requestedLength - expectedCount * pitch, 'straight residual');
}

function pointsFromSteps(radius, steps) {
  let angle = 0;
  const points = [[radius, 0]];
  for (const step of steps) {
    angle += step;
    points.push([radius * Math.cos(angle), radius * Math.sin(angle)]);
  }
  return points;
}

function checkCircularResult(result, radius, sweep, pitch, expectedCount, expectedAdjustedIndices, protection = {}) {
  checkIntervals(result, pitch, expectedCount, expectedAdjustedIndices, protection);
  assert.equal(result.angularSteps.length, expectedCount);
  near(sum(result.angularSteps), sweep, 'angular steps reach the downstream anchor');
  const points = pointsFromSteps(radius, result.angularSteps);
  const sign = sweep < 0 ? -1 : 1;
  result.angularSteps.forEach((step, index) => {
    assert.ok(sign * step > 0 && Math.abs(step) <= Math.PI + EPS, 'ordered minor-arc steps');
    const measuredChord = length(sub(points[index + 1], points[index]));
    near(measuredChord, result.intervals[index], `measured chord ${index}`);
    near(2 * radius * Math.sin(Math.abs(step) / 2), measuredChord, `chord relation ${index}`);
  });
  pointNear(points.at(-1), [radius * Math.cos(sweep), radius * Math.sin(sweep)], 'arc endpoint');
  return points;
}

// Test-only reference oracle for a small adversarial fixture. It enumerates
// admissible counts and correction counts, independently of production rounding.
// No runtime solver or fixture generator imports this oracle.
function circularCountOracle(radius, sweep, pitch, protectedCount = 0) {
  const angle = chord => 2 * Math.asin(Math.min(1, chord / (2 * radius)));
  const nominal = angle(pitch), lower = angle(.9 * pitch), upper = angle(1.1 * pitch);
  const target = Math.abs(sweep);
  const countLimit = 12;
  assert.ok(countLimit * lower > target, 'test oracle covers every feasible interval count');
  const feasible = [];
  for (let count = Math.max(1, protectedCount); count <= countLimit; count++) {
    for (let corrected = 0; corrected <= count - protectedCount; corrected++) {
      const minimumSweep = (count - corrected) * nominal + corrected * lower;
      const maximumSweep = (count - corrected) * nominal + corrected * upper;
      if (minimumSweep <= target + EPS && target <= maximumSweep + EPS) {
        feasible.push({ count, corrected });
        break;
      }
    }
  }
  return feasible;
}

export function runCoreTests() {
  const tests = [];
  const test = (name, fn) => {
    try {
      fn();
      tests.push({ name, passed: true });
    } catch (error) {
      tests.push({ name, passed: false, error: error instanceof Error ? error.message : String(error) });
    }
  };

  test('Pitch changes preserve the fixed 1.5 mm slit, 40 degree lean, and 0.5 mm hole', () => {
    near(DEFAULT_PROFILE.slitLength, 1.5);
    near(DEFAULT_PROFILE.slitAngleDeg, 40);
    near(DEFAULT_PROFILE.holeDiameter, .5);
    const tangent = rad(23);
    const reference = makeSlit([0, 0], tangent);
    const vector = sub(reference.b, reference.a);
    near(length(vector), 1.5);
    near(reference.angle, tangent - rad(40), 'slit angle relative to tangent');
    for (const pitch of [2.7, 3, 3.38, 3.85]) {
      const centre = scale([Math.cos(tangent), Math.sin(tangent)], pitch);
      const shifted = makeSlit(centre, tangent);
      pointNear(sub(shifted.a, centre), reference.a);
      pointNear(sub(shifted.b, centre), reference.b);
      near(solveCorner(90, pitch).joint.hole.diameter, .5, 'pitch-independent corner diameter');
    }
  });

  test('The spacing guard uses the shortest permitted pitch and rejects slit contact', () => {
    const valid = validateSpacing(2.7);
    assert.equal(valid.valid, true);
    near(valid.minimumAllowed, 2.43);
    near(valid.minimumSpacing, 1.5);
    assert.ok(valid.minimumAllowed > valid.minimumSpacing);
    const invalid = validateSpacing(1.5);
    assert.equal(invalid.valid, false);
    near(invalid.minimumAllowed, 1.35);
    assert.equal(validateSpacing(1.5, DEFAULT_PROFILE, 0).valid, false, 'equality is excluded');
    for (const pitch of [2.7, 3, 3.38, 3.85]) assert.equal(validateSpacing(pitch).valid, true);
  });

  test('Coincident finite slits keep one slit, including reversed endpoint order', () => {
    const s = segment([-1, 0], [1, 0]);
    const reversed = segment([1, 0], [-1, 0]);
    assert.equal(classifySlits(s, reversed).kind, 'coincident');
    assert.equal(mergeVirtualSlits(s, reversed).kind, 'slit');
  });

  test('A normal transverse finite crossing becomes one 0.5 mm round hole', () => {
    const s1 = segment([-1, 0], [1, 0]);
    const s2 = segment([0, -1], [0, 1]);
    const classification = classifySlits(s1, s2);
    assert.equal(classification.kind, 'crossing');
    pointNear(classification.point, [0, 0]);
    const joint = mergeVirtualSlits(s1, s2);
    assert.equal(joint.kind, 'hole');
    pointNear(joint.hole.center, [0, 0]);
    near(joint.hole.diameter, .5);
  });

  test('Non-collinear slit-tip contact is a finite crossing', () => {
    const s = segment([-1, 0], [1, 0]);
    for (const x of [1, 1 - 1e-5]) {
      const other = segment([x, 0], [x, 1]);
      assert.equal(classifySlits(s, other).kind, 'crossing');
      const joint = mergeVirtualSlits(s, other);
      assert.equal(joint.kind, 'hole');
      pointNear(joint.hole.center, [x, 0]);
    }
  });

  test('Internal invalid-candidate guard rejects disjoint finite cuts and separated parallel cuts', () => {
    const s = segment([-1, 0], [1, 0]);
    for (const other of [segment([2, 1], [2, 2]), segment([-1, 1], [1, 1])]) {
      assert.equal(classifySlits(s, other).kind, 'disjoint');
      assert.equal(mergeVirtualSlits(s, other).kind, 'unresolved');
    }
  });

  test('Internal invalid-candidate guard rejects partial collinear overlap and collinear contact', () => {
    const s = segment([-1, 0], [1, 0]);
    for (const other of [segment([0, 0], [2, 0]), segment([1, 0], [3, 0])]) {
      assert.equal(classifySlits(s, other).kind, 'partial-overlap');
      assert.equal(mergeVirtualSlits(s, other).kind, 'unresolved');
    }
  });

  test('Finite slit classification is invariant under rigid rotation and translation', () => {
    const transformPoint = point => add(rotate(point, rad(37)), [17.3, -8.2]);
    const transformSegment = s => segment(transformPoint(s.a), transformPoint(s.b));
    const cases = [
      [segment([-1, 0], [1, 0]), segment([0, -1], [0, 1]), 'crossing'],
      [segment([-1, 0], [1, 0]), segment([1, 0], [-1, 0]), 'coincident'],
      [segment([-1, 0], [1, 0]), segment([0, 0], [2, 0]), 'partial-overlap'],
      [segment([-1, 0], [1, 0]), segment([2, 1], [2, 2]), 'disjoint'],
    ];
    for (const [s1, s2, expected] of cases) {
      const result = classifySlits(transformSegment(s1), transformSegment(s2));
      assert.equal(result.kind, expected);
      if (expected === 'crossing') pointNear(result.point, transformPoint([0, 0]));
    }
  });

  test('A 30 mm straight span has ten nominal intervals with corrections disabled', () => {
    const protection = { protectedStart: 2, protectedEnd: 3 };
    const result = fitSpan(30, 3, { ...protection, corrections: false });
    checkSpanResult(result, 30, 3, 10, [], protection);
  });

  test('Straight residuals of either sign use the minimum two latest eligible corrections', () => {
    for (const [span, correctedPitch] of [[30.5, 3.25], [29.5, 2.75]]) {
      const result = fitSpan(span, 3);
      checkSpanResult(result, span, 3, 10, [8, 9]);
      near(result.intervals[8], correctedPitch);
      near(result.intervals[9], correctedPitch);
      assert.ok(Math.abs(span - 30) > .3, 'one allowed correction cannot absorb the residual');
    }
  });

  test('The 10 percent boundary permits three 3.3 mm intervals in a 30.9 mm span', () => {
    const result = fitSpan(30.9, 3);
    checkSpanResult(result, 30.9, 3, 10, [7, 8, 9]);
    for (const index of result.adjustedIndices) near(result.intervals[index], 3.3);
  });

  test('A 31 mm span uses four corrections with no fixed correction-count cap', () => {
    const result = fitSpan(31, 3);
    checkSpanResult(result, 31, 3, 10, [6, 7, 8, 9]);
    for (const index of result.adjustedIndices) near(result.intervals[index], 3.25);
    assert.ok(3 * .3 < 1, 'three allowed corrections cannot absorb the residual');
  });

  test('A protected terminal interval moves the 30.3 mm correction to the second-last interval', () => {
    const protection = { protectedEnd: 1 };
    const result = fitSpan(30.3, 3, protection);
    checkSpanResult(result, 30.3, 3, 10, [8], protection);
    near(result.intervals[8], 3.3);
    assert.equal(result.intervals[9], 3);
  });

  test('Protected start and end intervals constrain both count and latest eligible placement', () => {
    const protection = { protectedStart: 2, protectedEnd: 2 };
    checkSpanResult(fitSpan(31, 3, protection), 31, 3, 10, [4, 5, 6, 7], protection);
    const restrictive = { protectedStart: 3, protectedEnd: 3 };
    const result = fitSpan(31.5, 3, restrictive);
    checkSpanResult(result, 31.5, 3, 11, [3, 4, 5, 6, 7], restrictive);
    assert.deepEqual(result.feasibleCountRange, { min: 11, max: 11 });
    for (const index of result.adjustedIndices) near(result.intervals[index], 2.7);
    const blocked = fitSpan(31, 3, { protectedStart: 3, protectedEnd: 4 });
    assert.equal(blocked.status, 'invalid');
    assert.ok(blocked.feasibleCountRange.min > blocked.feasibleCountRange.max);
  });

  test('A 7 mm span has no admissible count, and disabled corrections reject a residual', () => {
    const tooShort = fitSpan(7, 3);
    assert.equal(tooShort.status, 'invalid');
    assert.deepEqual(tooShort.feasibleCountRange, { min: 3, max: 2 });
    assert.deepEqual(tooShort.intervals, []);
    assert.equal(fitSpan(30.5, 3, { corrections: false }).status, 'invalid');
  });

  test('Both arc directions preserve nominal chord pitch rather than nominal arc length', () => {
    const radius = 10, pitch = 3;
    const nominalAngle = 2 * Math.asin(pitch / (2 * radius));
    for (const sign of [1, -1]) {
      const sweep = sign * 6 * nominalAngle;
      const result = fitCircularSpan(radius, sweep, pitch, { corrections: false });
      checkCircularResult(result, radius, sweep, pitch, 6, []);
    }
    assert.ok(Math.abs(radius * nominalAngle - pitch) > .01, 'fixture distinguishes chord and arc length');
  });

  test('An exact circle closes with twenty unique holes and no extra start hole', () => {
    const radius = 3 / (2 * Math.sin(Math.PI / 20));
    const result = fitCircularSpan(radius, TAU, 3, { corrections: false });
    const points = checkCircularResult(result, radius, TAU, 3, 20, []);
    pointNear(points.at(-1), points[0], 'closing interval returns to the start');
    const uniqueHoles = points.slice(0, -1);
    assert.equal(uniqueHoles.length, 20);
    for (let i = 0; i < uniqueHoles.length; i++) {
      for (let j = i + 1; j < uniqueHoles.length; j++) {
        assert.ok(length(sub(uniqueHoles[i], uniqueHoles[j])) > EPS, 'every retained hole is distinct');
      }
    }
  });

  test('Tangent arc-to-line and arc-to-arc joins keep one shared slit and nominal spacing', () => {
    for (const id of ['A03', 'A04']) {
      const spec = CASES.find(item => item.id === id);
      for (const pitch of PITCHES) {
        const result = runCase({ ...spec, turn: 0 }, pitch);
        assert.equal(result.status, 'exact', `${id} at ${pitch}: tangent join fits`);
        assert.equal(result.holes.length, 0, 'a tangent join does not introduce a round hole');
        const shared = result.slits.filter(slit => length(slit.center) <= EPS);
        assert.equal(shared.length, 1, 'the shared endpoint contains exactly one real slit');
        near(length(sub(shared[0].b, shared[0].a)), DEFAULT_PROFILE.slitLength, 'shared slit stays canonical');
        for (const interval of result.intervals) near(interval.length, pitch, 'measured interval remains nominal');
        const adjacent = result.intervals.filter(interval => length(interval.a) <= EPS || length(interval.b) <= EPS);
        assert.equal(adjacent.length, 2, 'the shared slit joins both phases');
        assert.ok(adjacent.every(interval => interval.protected && !interval.junction), 'both adjacent ordinary intervals are protected');
        assert.ok(result.checks.every(check => check.passed), result.checks.filter(check => !check.passed).map(check => check.name).join('; '));
      }
    }
  });

  test('A 10 mm circle uses 21 chords and moves corrections before its protected closing chord', () => {
    assert.equal(fitCircularSpan(10, TAU, 3, { corrections: false }).status, 'invalid');
    const protection = { protectedEnd: 1 };
    const result = fitCircularSpan(10, TAU, 3, protection);
    checkCircularResult(result, 10, TAU, 3, 21, [18, 19], protection);
    assert.equal(result.intervals[20], 3);
  });

  test('Circular weighted rounding achieves the independent minimum correction count', () => {
    const pitch = 3, radius = pitch / (2 * .898);
    const nominalAngle = 2 * Math.asin(pitch / (2 * radius));
    const sweep = 2.532 * nominalAngle;
    const oracle = circularCountOracle(radius, sweep, pitch);
    assert.deepEqual(oracle, [{ count: 2, corrected: 2 }, { count: 3, corrected: 3 }]);
    const result = fitCircularSpan(radius, sweep, pitch);
    checkCircularResult(result, radius, sweep, pitch, 2, [0, 1]);
    assert.equal(result.correctionCount, Math.min(...oracle.map(candidate => candidate.corrected)));
    assert.equal(Math.round(sweep / nominalAngle), 3, 'ordinary rounding would choose the worse count');
  });

  test('Circular corrections preserve both protected ends and mirror under reversed travel', () => {
    const radius = 10, pitch = 3;
    const nominalAngle = 2 * Math.asin(pitch / (2 * radius));
    const sweep = 6 * nominalAngle + .04;
    const protection = { protectedStart: 1, protectedEnd: 2 };
    const forward = fitCircularSpan(radius, sweep, pitch, protection);
    const reverse = fitCircularSpan(radius, -sweep, pitch, protection);
    const positivePoints = checkCircularResult(forward, radius, sweep, pitch, 6, [2, 3], protection);
    const negativePoints = checkCircularResult(reverse, radius, -sweep, pitch, 6, [2, 3], protection);
    assert.deepEqual(forward.intervals, reverse.intervals);
    positivePoints.forEach((point, index) => pointNear(negativePoints[index], [point[0], -point[1]]));
  });

  test('Closing after thirteen committed nominal intervals fits only the remaining sweep', () => {
    const radius = 10, pitch = 3;
    const nominalAngle = 2 * Math.asin(pitch / (2 * radius));
    const committedSteps = Object.freeze(Array(13).fill(nominalAngle));
    const committedChords = Object.freeze(Array(13).fill(pitch));
    const committedPoints = pointsFromSteps(radius, committedSteps);
    const snapshot = committedPoints.map(point => [...point]);
    const remainingSweep = TAU - sum(committedSteps);
    const protection = { protectedEnd: 1 };
    const remaining = fitCircularSpan(radius, remainingSweep, pitch, protection);
    checkCircularResult(remaining, radius, remainingSweep, pitch, 8, [5, 6], protection);
    const allSteps = [...committedSteps, ...remaining.angularSteps];
    const allChords = [...committedChords, ...remaining.intervals];
    const allPoints = pointsFromSteps(radius, allSteps);
    assert.deepEqual(allSteps.slice(0, 13), committedSteps, 'committed angular advances remain unchanged');
    assert.deepEqual(allChords.slice(0, 13), committedChords, 'committed pitches remain unchanged');
    assert.deepEqual(allPoints.slice(0, snapshot.length), snapshot, 'committed hole centres remain unchanged');
    assert.deepEqual(remaining.adjustedIndices.map(index => index + 13), [18, 19]);
    assert.equal(allChords.length, 21);
    assert.equal(allChords.at(-1), pitch);
    near(sum(allSteps), TAU);
    pointNear(allPoints.at(-1), allPoints[0], 'remaining span closes at the existing first hole');
  });

  test('Circle diameter limits reject impossible nominal chords and permit the minor semicircle', () => {
    assert.equal(fitCircularSpan(1.49, Math.PI, 3).status, 'invalid');
    const exact = fitCircularSpan(1.5, Math.PI, 3, { corrections: false });
    checkCircularResult(exact, 1.5, Math.PI, 3, 1, []);
    const shortened = fitCircularSpan(1.5, .9 * Math.PI, 3);
    checkCircularResult(shortened, 1.5, .9 * Math.PI, 3, 1, [0]);
    assert.ok(shortened.intervals[0] < 3, 'a diameter chord can only be shortened');
  });

  test('Signed 45, 90, and 135 degree corners preserve the ordinary schematic thread vector', () => {
    const pitch = 3, half = .75;
    const uIn = [Math.cos(rad(-40)), Math.sin(rad(-40))];
    const nominalIn = sub([pitch, 0], scale(uIn, 2 * half));
    for (const degrees of [-135, -90, -45, 45, 90, 135]) {
      const theta = rad(degrees);
      const result = solveCorner(degrees, pitch);
      assert.equal(result.status, 'resolved');
      assert.equal(result.onArms, true);
      assert.equal(result.joint.kind, 'hole');
      near(result.joint.hole.diameter, .5);
      const joint = result.joint.hole.center;
      pointNear(joint, result.virtualSlits[0].a, 'incoming virtual slit tip');
      pointNear(joint, result.virtualSlits[1].b, 'outgoing virtual slit tip');
      const actualIn = sub(joint, result.previousSlit.b);
      const actualOut = sub(result.nextSlit.a, joint);
      pointNear(actualIn, nominalIn, 'incoming nominal thread vector');
      pointNear(actualOut, rotate(nominalIn, theta), 'outgoing nominal thread vector');
      near(length(actualIn), length(actualOut), 'equal schematic thread length');
      pointNear(rotate(actualIn, theta), actualOut, 'same thread angle relative to each arm');
      if (Math.abs(degrees) === 90) {
        const offset = half * Math.sin(rad(40));
        pointNear(joint, [Math.sign(degrees) * offset, offset], 'right-angle intersection');
      }
    }
  });

  test('The corner arm requirement follows from slit geometry and pitch, with no arbitrary angle cutoff', () => {
    const half = DEFAULT_PROFILE.slitLength / 2;
    const lean = rad(DEFAULT_PROFILE.slitAngleDeg);
    for (const pitch of [2.7, 3, 3.85]) {
      const minimumTurn = 2 * Math.atan(half * Math.sin(lean) / (pitch - half * Math.cos(lean)));
      const boundaryDegrees = minimumTurn * 180 / Math.PI;
      for (const sign of [1, -1]) {
        const insufficient = solveCorner(sign * (boundaryDegrees - .001), pitch);
        const sufficient = solveCorner(sign * (boundaryDegrees + .001), pitch);
        assert.equal(insufficient.status, 'unresolved');
        assert.equal(insufficient.onArms, false);
        assert.equal(sufficient.status, 'resolved');
        assert.equal(sufficient.onArms, true);
      }
    }
  });

  test('A straight continuation keeps one slit and an exact reversal has no corner solution', () => {
    const straight = solveCorner(0, 3);
    assert.equal(straight.status, 'resolved');
    assert.equal(straight.joint.kind, 'slit');
    pointNear(straight.joint.slit.center, [0, 0]);
    pointNear(straight.previous, [-3, 0]);
    pointNear(straight.next, [3, 0]);
    for (const degrees of [180, -180]) {
      const reversal = solveCorner(degrees, 3);
      assert.equal(reversal.status, 'unresolved');
      assert.equal(reversal.joint, null);
      assert.equal(reversal.onArms, false);
    }
  });

  test('A fixed rectangle closes through four reserved corners without duplicating its first opening', () => {
    const pitch = 3, width = 31.5, height = 22.5;
    const half = .75, c = half * Math.cos(rad(40)), s = half * Math.sin(rad(40));
    const result = runCase('R01', pitch);
    assert.equal(result.status, 'adjusted');
    assert.equal(result.holes.length, 4);
    assert.equal(result.slits.length, 34);
    assert.equal(result.intervals.length, 38);
    assert.equal(result.threads.length, result.intervals.length);
    assert.equal(result.intervals.filter(item => item.adjusted).length, 8);

    const expectedJoints = [[s, -s], [width + s, s], [width - s, height + s], [-s, height - s]];
    const samePoint = (a, b) => length(sub(a, b)) < EPS;
    const cuts = [...result.slits, ...result.holes];
    for (let i = 0; i < cuts.length; i++) {
      for (let j = i + 1; j < cuts.length; j++) {
        assert.ok(!samePoint(cuts[i].center, cuts[j].center), 'every real opening is unique');
      }
    }
    assert.equal(cuts.length, result.intervals.length, 'one opening per interval in the closed path');
    pointNear(result.intervals[0].a, expectedJoints[0], 'start at the reserved top-left hole');
    pointNear(result.intervals.at(-1).b, expectedJoints[0], 'close at the same top-left hole');
    result.intervals.forEach((interval, i) => {
      pointNear(interval.b, result.intervals[(i + 1) % result.intervals.length].a, 'ordered closed path');
      near(interval.length, length(sub(interval.b, interval.a)), 'reported distance is measured geometry');
      if (!interval.junction) {
        near(interval.length, interval.adjusted ? 2.824533332339233 : pitch,
          'each side uses its two minimum corrections');
      }
    });

    const ordinaryThread = [pitch - 2 * c, 2 * s];
    expectedJoints.forEach((joint, i) => {
      const matches = result.holes.filter(hole => samePoint(hole.center, joint));
      assert.equal(matches.length, 1, `one round hole at corner ${i + 1}`);
      near(matches[0].diameter, .5);
      const incomingIndex = result.intervals.findIndex(interval => samePoint(interval.b, joint));
      const outgoingIndex = result.intervals.findIndex(interval => samePoint(interval.a, joint));
      assert.ok(incomingIndex >= 0 && outgoingIndex >= 0, 'both corner connections exist');
      assert.equal(result.intervals[incomingIndex].junction, true);
      assert.equal(result.intervals[outgoingIndex].junction, true);
      const incoming = result.threads[incomingIndex], outgoing = result.threads[outgoingIndex];
      pointNear(sub(incoming.b, incoming.a), rotate(ordinaryThread, (i - 1) * Math.PI / 2),
        'corner entry preserves the nominal thread vector');
      pointNear(sub(outgoing.b, outgoing.a), rotate(ordinaryThread, i * Math.PI / 2),
        'corner exit preserves the nominal thread vector');
    });
  });

  test('A pocket edge before a corner keeps its nominal centred gap and its committed approach', () => {
    const pitch = 3, c = .75 * Math.cos(rad(40)), s = .75 * Math.sin(rad(40));
    const result = runCase('N01', pitch);
    assert.equal(result.status, 'adjusted');
    assert.equal(result.holes.length, 1);
    assert.equal(result.intervals.length, 13);
    assert.equal(result.intervals.filter(item => item.adjusted).length, 2);
    const expectedApproach = [-26, -23, -20, -17, -14, -11, -8, -5, c + s - pitch];
    expectedApproach.forEach((x, i) => pointNear(result.slits[i].center, [x, 0], 'fixed ordered approach'));
    pointNear(result.holes[0].center, [s, s], 'reserved corner hole');

    const edgeGap = result.intervals.find(interval => Math.abs(interval.a[0] + 8) < EPS);
    assert.ok(edgeGap, 'the edge has real slits on both sides');
    pointNear(edgeGap.a, [-8, 0]);
    pointNear(edgeGap.b, [-5, 0]);
    pointNear(scale(add(edgeGap.a, edgeGap.b), .5), [-6.5, 0], 'edge is the midpoint');
    near(edgeGap.length, pitch, 'edge gap is nominal');
    assert.equal(edgeGap.protected, true);
    assert.equal(edgeGap.adjusted, false);

    const bridge = result.intervals.find(interval => Math.abs(interval.a[0] + 5) < EPS);
    pointNear(bridge.b, [c + s - pitch, 0], 'the next anchor is fixed by the corner');
    near(bridge.length, 3.056624039604138, 'one direct correction fits between the two reservations');
    assert.equal(bridge.adjusted, true);
    pointNear(result.slits[9].center, [0, pitch + s - c], 'outgoing corner anchor');
    pointNear(result.slits.at(-1).center, [0, 12], 'outgoing fixed end');
    near(result.intervals.at(-1).length, 3.092442625074329, 'only the remaining outgoing residual changes');
    near(result.intervals.at(-2).length, pitch);
    near(result.intervals.at(-3).length, pitch);
  });

  test('Touching feature reservations share their slit, while overlapping reservations reject cleanly', () => {
    const pitch = 3, c = .75 * Math.cos(rad(40)), s = .75 * Math.sin(rad(40));
    const spec = CASES.find(item => item.id === 'N01');
    assert.ok(spec, 'nearby-feature fixture exists');
    const sharedAnchor = [c + s - pitch, 0];
    const sharedOffset = pitch / 2 - sharedAnchor[0];
    const touching = runCase({ ...spec, edgeOffset: sharedOffset }, pitch);
    assert.equal(touching.status, 'adjusted');
    assert.equal(touching.slits.filter(slit => length(sub(slit.center, sharedAnchor)) < EPS).length, 1,
      'the pocket exit and incoming corner slit are the same physical cut');
    const gap = touching.intervals.find(interval =>
      length(sub(interval.a, [sharedAnchor[0] - pitch, 0])) < EPS &&
      length(sub(interval.b, sharedAnchor)) < EPS);
    assert.ok(gap, 'the centred edge gap ends at the shared slit');
    near(gap.length, pitch);
    assert.equal(gap.adjusted, false);
    assert.ok(touching.intervals.every(interval => interval.length > EPS), 'no zero-length filler interval');
    const overlap = runCase({ ...spec, edgeOffset: sharedOffset - .001 }, pitch);
    assert.equal(overlap.status, 'invalid');
    assert.equal(overlap.holes.length, 0, 'the rejected downstream corner is not cut');
    assert.ok(overlap.intervals.every(interval => !interval.junction && interval.length >= .9 * pitch - EPS),
      'no tiny replacement gap is invented to cross overlapping reservations');
    overlap.slits.forEach(slit => near(slit.center[1], 0, 'retained cuts stay on the accepted approach'));
    if (overlap.slits.length) pointNear(overlap.slits[0].center, [-26, 0], 'retained start stays fixed');
  });

  test('A line flows into its circular arc through one shared slit with actual nominal chord spacing', () => {
    const radius = 10, guideLength = 18, sweep = Math.PI / 2;
    for (const pitch of PITCHES) {
      const result = runCase('A05', pitch);
      assert.equal(result.status, 'exact');
      assert.equal(result.holes.length, 0, 'a smooth join has no round hole');
      const angularPitch = 2 * Math.asin(pitch / (2 * radius));
      const lineCount = Math.floor(guideLength / pitch + EPS);
      const arcCount = Math.floor(sweep / angularPitch + EPS);
      const expected = [];
      for (let i = -lineCount; i <= 0; i++) expected.push({ center: [i * pitch, 0], tangent: 0 });
      for (let i = 1; i <= arcCount; i++) {
        const theta = i * angularPitch;
        expected.push({ center: [radius * Math.sin(theta), radius * (1 - Math.cos(theta))], tangent: theta });
      }
      assert.equal(result.slits.length, expected.length);
      assert.equal(result.intervals.length, expected.length - 1);
      assert.equal(result.slits.filter(slit => length(slit.center) < EPS).length, 1, 'one slit at the smooth join');
      expected.forEach((opening, i) => {
        const slit = result.slits[i];
        pointNear(slit.center, opening.center, 'fixed line and circle coordinates in construction order');
        pointNear(sub(slit.b, slit.a), [1.5 * Math.cos(opening.tangent - rad(40)),
          1.5 * Math.sin(opening.tangent - rad(40))], 'fixed slit relative to the actual tangent');
        if (i > lineCount) near(length(sub(slit.center, [0, radius])), radius, 'centre lies on the circle');
      });
      result.intervals.forEach((interval, i) => {
        pointNear(interval.a, expected[i].center);
        pointNear(interval.b, expected[i + 1].center);
        near(length(sub(interval.b, interval.a)), pitch, 'physical centre distance, including the smooth join');
        assert.equal(interval.adjusted, false);
        assert.equal(interval.junction, false);
      });
      const startMargin = guideLength - lineCount * pitch;
      assert.ok(startMargin >= -EPS && startMargin < pitch, 'only a free outer line margin remains');
      assert.ok(arcCount * angularPitch <= sweep + EPS && (arcCount + 1) * angularPitch > sweep,
        'the last nominal arc step fits and the next would pass the free end');
      pointNear(result.slits[lineCount + 1].center,
        [pitch * Math.sqrt(1 - (pitch / (2 * radius)) ** 2), pitch * pitch / (2 * radius)],
        'first curved centre follows the chord formula directly');
    }
  });

  const passed = tests.filter(testResult => testResult.passed).length;
  return { passed, failed: tests.length - passed, tests };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = runCoreTests();
  console.log(`Geometry checks: ${result.passed} passed, ${result.failed} failed (${result.tests.length} cases).`);
  for (const test of result.tests.filter(testResult => !testResult.passed)) console.error(`FAIL ${test.name}\n  ${test.error}`);
  if (result.failed) process.exitCode = 1;
}
