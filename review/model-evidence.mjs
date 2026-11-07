// Review evidence only: proposed line/arc tip-locus construction, not production code.
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {makeSlit, classifySlits, mergeVirtualSlits, solveCorner} from '../geometry.mjs';

const TAU = 2 * Math.PI, EPS = 1e-8;
const h = .75, alpha = 40 * Math.PI / 180, pitch = 3;
const add = (a, b) => a.map((v, i) => v + b[i]);
const sub = (a, b) => a.map((v, i) => v - b[i]);
const mul = (a, k) => a.map(v => v * k);
const dot = (a, b) => a.reduce((sum, v, i) => sum + v * b[i], 0);
const cross = (a, b) => a[0] * b[1] - a[1] * b[0];
const rotate90 = a => [-a[1], a[0]];
const norm = a => Math.hypot(...a);
const distance = (a, b) => norm(sub(a, b));

function pointSegmentDistance(p, a, b) {
  const v = sub(b, a), fraction = Math.max(0, Math.min(1, dot(sub(p, a), v) / dot(v, v)));
  return distance(p, add(a, mul(v, fraction)));
}

export function segmentDistance(a, b) {
  if (classifySlits(a, b).kind !== 'disjoint') return 0;
  return Math.min(pointSegmentDistance(a.a, b.a, b.b), pointSegmentDistance(a.b, b.a, b.b),
    pointSegmentDistance(b.a, a.a, a.b), pointSegmentDistance(b.b, a.a, a.b));
}

// Both guides meet at the origin. Station increases in travel direction.
export function guide(radius, winding, tangentDegrees, length = radius ? radius * Math.PI / 3 : 10) {
  const theta = tangentDegrees * Math.PI / 180, tangent = [Math.cos(theta), Math.sin(theta)];
  if (!radius) return {tangent, theta, length};
  assert.ok(radius >= pitch / 2 && [1, -1].includes(winding));
  assert.ok(length > 0 && length <= TAU * radius + EPS);
  return {radius, winding, theta, tangent, length,
    centre: mul(rotate90(tangent), winding * radius), radial0: mul(rotate90(tangent), -winding)};
}

function locus(g, tipSign) {
  if (!g.radius) return {point: mul([Math.cos(g.theta - alpha), Math.sin(g.theta - alpha)], tipSign * h), tangent: g.tangent};
  const A = g.radius + tipSign * h * g.winding * Math.sin(alpha);
  const B = tipSign * h * g.winding * Math.cos(alpha);
  return {centre: g.centre, radius: Math.hypot(A, B), A, B};
}

// Isolated intersections only. Smooth/coincident cases need a separate shared-slit rule.
export function intersections(a, b) {
  if (a.point && b.point) {
    const denominator = cross(a.tangent, b.tangent);
    if (Math.abs(denominator) < EPS) return {kind: 'parallel-or-coincident', points: []};
    return {kind: 'isolated', points: [add(a.point,
      mul(a.tangent, cross(sub(b.point, a.point), b.tangent) / denominator))]};
  }
  if (a.centre && b.point) return intersections(b, a);
  if (a.point) {
    const v = sub(a.point, b.centre), projection = dot(v, a.tangent);
    const constant = dot(v, v) - b.radius ** 2, discriminant = projection ** 2 - constant;
    if (discriminant < -EPS) return {kind: 'disjoint', points: []};
    const root = Math.sqrt(Math.max(0, discriminant));
    const parameters = root <= EPS ? [-projection] : [-projection - root, -projection + root];
    return {kind: 'isolated', points: parameters.map(t => add(a.point, mul(a.tangent, t)))};
  }
  const vector = sub(b.centre, a.centre), d = norm(vector);
  if (d <= EPS) return {kind: Math.abs(a.radius - b.radius) <= EPS ? 'coincident' : 'disjoint', points: []};
  if (d > a.radius + b.radius + EPS || d < Math.abs(a.radius - b.radius) - EPS) return {kind: 'disjoint', points: []};
  const tangent = mul(vector, 1 / d), x = (a.radius ** 2 - b.radius ** 2 + d * d) / (2 * d);
  const y = Math.sqrt(Math.max(0, a.radius ** 2 - x * x)), base = add(a.centre, mul(tangent, x));
  return {kind: 'isolated', points: y <= EPS ? [base] : [-1, 1].map(sign => add(base, mul(rotate90(tangent), sign * y)))};
}

function point(g, station) {
  if (!g.radius) return mul(g.tangent, station);
  const angle = g.winding * station / g.radius;
  const radial = add(mul(g.radial0, Math.cos(angle)), mul(rotate90(g.radial0), Math.sin(angle)));
  return add(g.centre, mul(radial, g.radius));
}

function slitAt(g, station) {
  return makeSlit(point(g, station), g.theta + (g.radius ? g.winding * station / g.radius : 0));
}

function nominalStationStep(g) {
  return g.radius ? g.radius * 2 * Math.asin(pitch / (2 * g.radius)) : pitch;
}

function virtualStation(g, l, J) {
  if (!g.radius) return dot(sub(J, l.point), g.tangent);
  const v = sub(J, g.centre);
  const radial = mul(sub(mul(v, l.A), mul(rotate90(v), l.B)), 1 / l.radius ** 2);
  // Fix the principal station nearest the junction; do not add a revolution to fit.
  const angle = Math.atan2(cross(g.radial0, radial), dot(g.radial0, radial));
  if (Math.abs(Math.abs(angle) - Math.PI) <= 64 * Number.EPSILON * Math.PI) return null;
  return g.winding * g.radius * angle;
}

export function selectLocalRoot(points) {
  const ranked = points.map(J => ({J, squaredDistance: dot(J, J)}))
    .sort((a, b) => a.squaredDistance - b.squaredDistance);
  if (!ranked.length) return {roots: [], selected: null, ambiguous: false};
  const arithmeticTolerance = 64 * Number.EPSILON * Math.max(1, ...ranked.map(r => r.squaredDistance));
  const ambiguous = ranked.length > 1 && Math.abs(ranked[1].squaredDistance - ranked[0].squaredDistance) <= arithmeticTolerance;
  return {roots: ranked.map(r => r.J), selected: ambiguous ? null : ranked[0].J, ambiguous};
}

// Only the three local openings are checked here. Whole-route clearance is separate.
export function cornerCandidates(incoming, outgoing, width = 0, margin = 0) {
  const li = locus(incoming, -1), lo = locus(outgoing, 1), roots = intersections(li, lo);
  // Commit the local geometric branch before checking finite guides or clearance.
  // An inadmissible local root never permits substitution of a remote intersection.
  const selection = selectLocalRoot(roots.points);
  const di = nominalStationStep(incoming), dout = nominalStationStep(outgoing), accepted = [];
  let local = null;
  for (const J of selection.selected ? [selection.selected] : []) {
      const ci = virtualStation(incoming, li, J), co = virtualStation(outgoing, lo, J);
      local = {J, ci, co};
      if (ci === null || co === null) continue;
      if (ci < -incoming.length + di - EPS || ci > di + EPS ||
          co < -dout - EPS || co > outgoing.length - dout + EPS) continue;
      const previous = slitAt(incoming, ci - di), next = slitAt(outgoing, co + dout);
      const vi = slitAt(incoming, ci), vo = slitAt(outgoing, co);
      if (classifySlits(vi, vo).kind !== 'crossing') continue;
      const slitGap = segmentDistance(previous, next);
      const holeGap = Math.min(pointSegmentDistance(J, previous.a, previous.b), pointSegmentDistance(J, next.a, next.b));
      if (slitGap <= EPS || slitGap + EPS < width + margin || holeGap + EPS < width / 2 + .25 + margin) continue;
      const vectorIn = sub(J, previous.b), vectorOut = sub(next.a, J);
      accepted.push({J, ci, co, previous, next, slitGap, holeGap,
        tipResidual: Math.max(distance(J, vi.a), distance(J, vo.b)),
        chordResidual: Math.max(Math.abs(distance(previous.center, vi.center) - pitch), Math.abs(distance(next.center, vo.center) - pitch)),
        displayTurn: Math.atan2(cross(vectorIn, vectorOut), dot(vectorIn, vectorOut)) * 180 / Math.PI});
  }
  return {rootKind: roots.kind, rootCount: roots.points.length, roots: selection.roots,
    ambiguous: selection.ambiguous, local, accepted, chosen: accepted[0] ?? null};
}

export function runEvidence() {
  let checks = 0;
  const check = condition => {assert.ok(condition); checks++;};
  for (const turn of [90, -90]) for (const windingIn of [1, -1]) for (const windingOut of [1, -1]) {
    const result = cornerCandidates(guide(10, windingIn, 0), guide(8, windingOut, turn), .2, .2);
    check(result.accepted.length === 1);
    check(result.chosen.tipResidual < 1e-12 && result.chosen.chordResidual < 1e-12);
    const limit = cornerCandidates(guide(10000, windingIn, 0), guide(8000, windingOut, turn));
    check(distance(limit.chosen.J, solveCorner(turn, pitch).joint.hole.center) < 1e-5);
    check(Math.abs(limit.chosen.displayTurn - turn) < .03);
    console.log(JSON.stringify({case: 'arc-arc', turn, windingIn, windingOut, J: result.chosen.J, displayTurn: result.chosen.displayTurn}));
  }
  for (const turn of [90, -90]) for (const winding of [1, -1]) {
    const result = cornerCandidates(guide(10, winding, 0), guide(0, 0, turn), .2, .2);
    check(result.chosen?.tipResidual < 1e-12 && result.chosen.chordResidual < 1e-12);
    const reverseTypes = cornerCandidates(guide(0, 0, 0), guide(10, winding, turn), .2, .2);
    check(reverseTypes.chosen?.tipResidual < 1e-12 && reverseTypes.chosen.chordResidual < 1e-12);
    const limit = cornerCandidates(guide(10000, winding, 0), guide(0, 0, turn));
    check(distance(limit.chosen.J, solveCorner(turn, pitch).joint.hole.center) < 5e-6);
    check(Math.abs(limit.chosen.displayTurn - turn) < .009);
  }
  const straight = cornerCandidates(guide(0, 0, 0), guide(0, 0, 90));
  check(distance(straight.chosen.J, solveCorner(90, pitch).joint.hole.center) < EPS);
  for (const winding of [1, -1]) {
    // Tangent joins bypass the sharp-corner loci and use the explicit shared slit.
    const line = guide(0, 0, 0), arc = guide(10, winding, 0);
    check(mergeVirtualSlits(slitAt(line, 0), slitAt(arc, 0)).kind === 'slit');
  }
  check(intersections({centre: [0, 0], radius: 1}, {centre: [3, 0], radius: 1}).points.length === 0);
  check(intersections({point: [2, 0], tangent: [0, 1]}, {centre: [0, 0], radius: 1}).points.length === 0);
  check(intersections({centre: [0, 0], radius: 1}, {centre: [0, 0], radius: 1}).kind === 'coincident');
  const two = cornerCandidates(guide(10, 1, 0, TAU * 10), guide(8, 1, 90, TAU * 8), .2, .2);
  check(two.rootCount === 2 && two.accepted.length === 1);
  check(norm(two.chosen.J) < norm(two.roots[1]));
  console.log(JSON.stringify({case: 'two-geometric-roots-local-only', roots: two.roots, chosen: two.chosen.J}));
  const tied = selectLocalRoot([[1, 0], [-1, 0]]);
  check(tied.ambiguous && tied.selected === null);
  const antipodalGuide = guide(10, 1, 0), antipodalLocus = locus(antipodalGuide, -1);
  const oppositeRadial = mul(antipodalGuide.radial0, -1);
  const antipodalTip = add(antipodalGuide.centre,
    add(mul(oppositeRadial, antipodalLocus.A), mul(rotate90(oppositeRadial), antipodalLocus.B)));
  check(virtualStation(antipodalGuide, antipodalLocus, antipodalTip) === null);
  const longIncoming = guide(10, -1, 0, 44.32347102828625);
  const longOutgoing = guide(10, -1, 10, 32.60249587165397);
  const remoteFallback = cornerCandidates(longIncoming, longOutgoing, .2, .2);
  check(remoteFallback.rootCount === 2 && remoteFallback.chosen === null);
  check(distance(remoteFallback.local.J, [5.653508675550187, -1.1545404980421257]) < EPS);
  check(remoteFallback.local.ci > nominalStationStep(longIncoming));
  check(distance(remoteFallback.roots[1], [7.103617098545232, -17.72935561755014]) < EPS);
  const wrappedFallback = cornerCandidates(guide(10, -1, 0, 62.619976480340476),
    guide(10, -1, 10, 11.39841693460145), .2, .2);
  check(wrappedFallback.chosen === null);
  check(Math.abs(wrappedFallback.local.ci - 6.234607502522827) < EPS);
  check(wrappedFallback.local.ci > nominalStationStep(longIncoming));
  // Each finite arc is shorter than one revolution. Their only possible mutual
  // crossings are the two exact supporting-circle intersections.
  const guideCrossings = intersections(longIncoming, longOutgoing).points;
  check(guideCrossings.length === 2);
  const secondCrossing = guideCrossings.find(J => norm(J) > EPS);
  const circleStation = (g, J) => {
    const radial = mul(sub(J, g.centre), 1 / g.radius);
    const principal = g.winding * g.radius * Math.atan2(cross(g.radial0, radial), dot(g.radial0, radial));
    return {principal, period: TAU * g.radius};
  };
  const inCrossing = circleStation(longIncoming, secondCrossing);
  const outCrossing = circleStation(longOutgoing, secondCrossing);
  const incomingStation = inCrossing.principal > 0 ? inCrossing.principal - inCrossing.period : inCrossing.principal;
  const outgoingStation = outCrossing.principal < 0 ? outCrossing.principal + outCrossing.period : outCrossing.principal;
  check(incomingStation >= -longIncoming.length && incomingStation <= 0);
  check(outgoingStation > longOutgoing.length);
  check(distance(point(longIncoming, 0), point(longOutgoing, 0)) < EPS);
  console.log(JSON.stringify({case: 'remote-root-fallback-rejected', local: remoteFallback.local,
    rejectedRemote: remoteFallback.roots[1], chosen: remoteFallback.chosen,
    otherGuideCrossing: secondCrossing, incomingStation, outgoingStation,
    outgoingLength: longOutgoing.length, finiteRouteSelfCrosses: false}));
  console.log(JSON.stringify({case: 'same-root-revolution-fallback-rejected', local: wrappedFallback.local,
    chosen: wrappedFallback.chosen}));
  const clipped = cornerCandidates(guide(10, 1, 0, 1), guide(8, 1, 90, 1));
  check(clipped.chosen === null && clipped.rootCount === 2);
  for (const turn of [160, -160, 170, -170]) {
    const old = solveCorner(turn, pitch), gap = segmentDistance(old.previousSlit, old.nextSlit);
    check(old.status === 'resolved');
    check(cornerCandidates(guide(0, 0, 0), guide(0, 0, turn), .2, .2).chosen === null);
    console.log(JSON.stringify({case: 'clearance', turn, axisGap: gap, required: .4}));
  }
  const A03 = cornerCandidates(guide(10, 1, 0), guide(0, 0, 90)).chosen;
  console.log(JSON.stringify({case: 'A03-tip-locus', J: A03.J, I: A03.previous.center, O: A03.next.center, displayTurn: A03.displayTurn}));
  console.log(`Model review evidence: ${checks} checks passed.`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) runEvidence();
