/**
 * Small, dependency-free geometric model for the stitch laboratory.
 * Lengths are millimetres. Angles are radians except solveCorner(turnDeg).
 * Coordinates follow an SVG screen: x right, y down. A positive turn is clockwise.
 * This is a geometric hypothesis, not a leather deformation or tooling model.
 */
export const DEFAULT_PROFILE = Object.freeze({
  slitLength: 1.5,
  slitAngleDeg: 40,
  holeDiameter: 0.5,
});

const TAU = Math.PI * 2;
const EPS = 1e-9;
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const scale = (a, k) => [a[0] * k, a[1] * k];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
const cross = (a, b) => a[0] * b[1] - a[1] * b[0];
const norm = a => Math.hypot(...a);
const distance = (a, b) => norm(sub(a, b));
const finitePoint = p => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite);

function requireProfile(profile) {
  if (!profile || !Number.isFinite(profile.slitLength) || profile.slitLength <= 0 ||
      !Number.isFinite(profile.slitAngleDeg) || !Number.isFinite(profile.holeDiameter) || profile.holeDiameter <= 0) {
    throw new RangeError('Profile needs a positive slitLength and holeDiameter, and a finite slitAngleDeg.');
  }
}

/** Make a finite slit about its centre, at tangentAngleRadians minus the fixed lean. */
export function makeSlit(center, tangentAngleRadians, profile = DEFAULT_PROFILE) {
  requireProfile(profile);
  if (!finitePoint(center) || !Number.isFinite(tangentAngleRadians)) {
    throw new TypeError('A finite [x,y] centre and finite tangent angle are required.');
  }
  const angle = tangentAngleRadians - profile.slitAngleDeg * Math.PI / 180;
  const halfVector = [Math.cos(angle) * profile.slitLength / 2, Math.sin(angle) * profile.slitLength / 2];
  return {center: [...center], a: sub(center, halfVector), b: add(center, halfVector), angle};
}

/**
 * Classify two finite slit segments. Endpoint order does not affect coincidence.
 * A collinear endpoint touch is partial-overlap, not a crossing of distinct axes.
 * tol is a small coordinate tolerance; no intersection of extended axes is accepted.
 */
export function classifySlits(s1, s2, tol = 1e-7) {
  if (![s1?.a, s1?.b, s2?.a, s2?.b].every(finitePoint) || !(tol >= 0) || !Number.isFinite(tol)) {
    throw new TypeError('Two finite segments and a nonnegative finite tolerance are required.');
  }
  const {a, b} = s1;
  const {a: c, b: d} = s2;
  const r = sub(b, a), s = sub(d, c);
  const lr = norm(r), ls = norm(s);
  if (lr <= tol || ls <= tol) throw new RangeError('Slits must have nonzero finite length.');
  if ((distance(a, c) <= tol && distance(b, d) <= tol) ||
      (distance(a, d) <= tol && distance(b, c) <= tol)) return {kind: 'coincident'};
  const denominator = cross(r, s);
  const q = sub(c, a);
  if (Math.abs(denominator) <= tol * Math.max(lr, ls)) {
    if (Math.abs(cross(q, r)) / lr > tol) return {kind: 'disjoint'};
    const cAlong = dot(q, r) / lr;
    const dAlong = dot(sub(d, a), r) / lr;
    const low = Math.max(0, Math.min(cAlong, dAlong));
    const high = Math.min(lr, Math.max(cAlong, dAlong));
    if (high < low - tol) return {kind: 'disjoint'};
    const result = {kind: 'partial-overlap'};
    if (Math.abs(high - low) <= tol) result.point = add(a, scale(r, (low + high) / (2 * lr)));
    return result;
  }
  const t = cross(q, s) / denominator;
  const u = cross(q, r) / denominator;
  if (t < -tol / lr || t > 1 + tol / lr || u < -tol / ls || u > 1 + tol / ls) return {kind: 'disjoint'};
  return {kind: 'crossing', point: add(a, scale(r, Math.max(0, Math.min(1, t))))};
}

/** Coincidence keeps a slit. A finite non-collinear crossing becomes one round hole. */
export function mergeVirtualSlits(s1, s2, profile = DEFAULT_PROFILE, tol = 1e-7) {
  requireProfile(profile);
  const classification = classifySlits(s1, s2, tol);
  if (classification.kind === 'coincident') {
    return {kind: 'slit', slit: s1, classification, reason: 'The finite virtual slits coincide, so keep one slit.'};
  }
  if (classification.kind === 'crossing') {
    return {kind: 'hole', hole: {center: [...classification.point], diameter: profile.holeDiameter}, classification,
      reason: 'The finite virtual slit axes meet, so replace them with one round hole.'};
  }
  return {kind: 'unresolved', classification,
    reason: classification.kind === 'partial-overlap'
      ? 'Partial collinear overlap does not identify one canonical slit or one unique crossing hole.'
      : 'The finite virtual slits do not meet. Extending their axes is not a valid substitute.'};
}

function readOptions(options = {}) {
  const result = {
    toleranceFraction: 0.1,
    protectedStart: 0,
    protectedEnd: 0,
    ...options,
    corrections: options.corrections ?? (options.policy !== 'strict'),
  };
  if (!Number.isFinite(result.toleranceFraction) || result.toleranceFraction < 0 || result.toleranceFraction >= 1) {
    throw new RangeError('toleranceFraction must be at least zero and less than one.');
  }
  if (!Number.isSafeInteger(result.protectedStart) || result.protectedStart < 0 ||
      !Number.isSafeInteger(result.protectedEnd) || result.protectedEnd < 0) {
    throw new RangeError('protectedStart and protectedEnd must be nonnegative safe integers.');
  }
  if (typeof result.corrections !== 'boolean') throw new TypeError('corrections must be a boolean.');
  return result;
}

// These tolerances absorb floating-point arithmetic error at exact boundaries.
// They do not introduce a manufacturing tolerance or an additional pitch allowance.
const arithmeticTolerance = (...values) => 64 * Number.EPSILON * Math.max(Number.MIN_VALUE, ...values.map(Math.abs));
const integerTolerance = value => arithmeticTolerance(1, value);
const ceilNear = value => Math.ceil(value - integerTolerance(value));
const floorNear = value => Math.floor(value + integerTolerance(value));
const nearestInteger = value => {
  const low = Math.floor(value);
  return value - low > 0.5 + integerTolerance(value) ? low + 1 : low;
};
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const isZeroResidual = (residual, total, nominalTotal) =>
  Math.abs(residual) <= arithmeticTolerance(total, nominalTotal);

function invalid(reason, extra = {}) {
  return {
    status: 'invalid', intervals: [], adjustedIndices: [], intervalCount: 0,
    correctionCount: 0, residual: null, feasibleCountRange: null, reason, ...extra,
  };
}

function protectionMetadata(options) {
  return {protectedStart: options.protectedStart, protectedEnd: options.protectedEnd};
}

/**
 * Sufficient ordinary-slit separation guard, independent of slit orientation.
 * minimumSpacing is the excluded centre-separation threshold: one slit length.
 * minimumAllowed is the smallest pitch the chosen correction tolerance permits.
 * Equality is rejected because two finite slits can touch at that separation.
 */
export function validateSpacing(pitch, profile = DEFAULT_PROFILE, toleranceFraction = 0.1) {
  requireProfile(profile);
  if (!Number.isFinite(pitch) || pitch <= 0) throw new RangeError('pitch must be positive and finite.');
  if (!Number.isFinite(toleranceFraction) || toleranceFraction < 0 || toleranceFraction >= 1) {
    throw new RangeError('toleranceFraction must be at least zero and less than one.');
  }
  const minimumSpacing = profile.slitLength;
  const minimumAllowed = pitch * (1 - toleranceFraction);
  const valid = minimumAllowed > minimumSpacing;
  return {valid, minimumSpacing, minimumAllowed,
    reason: valid
      ? 'Even the smallest permitted ordinary pitch exceeds one slit length, so adjacent ordinary slits cannot overlap in any orientation.'
      : 'The smallest permitted ordinary pitch must exceed one slit length; this sufficient separation rule excludes touching and partial overlap.'};
}

/**
 * Fit a straight distance by a closed-form interval count and correction count.
 * All protected prefix/suffix intervals remain nominal. The last k eligible
 * intervals absorb equal corrections. There is no correction-count cap.
 * The nearest admissible integer count minimizes the required corrections;
 * equal-distance count ties use the smaller count.
 */
export function fitSpan(length, pitch, options = {}) {
  if (!Number.isFinite(length) || length < 0 || !Number.isFinite(pitch) || pitch <= 0) {
    throw new RangeError('Use a nonnegative finite length and a positive finite pitch.');
  }
  const opts = readOptions(options);
  const metadata = {...protectionMetadata(opts), residualUnit: 'mm', chosenFormula: 'nearest-admissible-straight-count'};
  const protectedCount = opts.protectedStart + opts.protectedEnd;
  if (length === 0) {
    if (protectedCount > 0) return invalid('A zero span cannot contain protected intervals.', metadata);
    return {status: 'exact', intervals: [], adjustedIndices: [], intervalCount: 0, correctionCount: 0,
      residual: 0, feasibleCountRange: {min: 0, max: 0}, maxFractionDeviation: 0,
      ...metadata, reason: 'Zero distance has no intervals.'};
  }
  const idealCount = length / pitch;
  const fraction = opts.corrections ? opts.toleranceFraction : 0;
  const low = Math.max(1, protectedCount, ceilNear((idealCount + fraction * protectedCount) / (1 + fraction)));
  const high = floorNear((idealCount - fraction * protectedCount) / (1 - fraction));
  const feasibleCountRange = {min: low, max: high};
  if (!Number.isSafeInteger(low) || !Number.isSafeInteger(high) || low > high) {
    return invalid(fraction === 0
      ? 'The distance has no exact nominal-pitch fit satisfying the protected intervals; corrections are disabled.'
      : 'No integer interval count can span this distance within the pitch tolerance while preserving the protected intervals.',
    {...metadata, feasibleCountRange});
  }
  const count = clamp(nearestInteger(idealCount), low, high);
  const rawResidual = length - count * pitch;
  const residual = isZeroResidual(rawResidual, length, count * pitch) ? 0 : rawResidual;
  const changed = residual === 0 ? 0 : ceilNear(Math.abs(residual) / (fraction * pitch));
  const available = count - protectedCount;
  if (!Number.isSafeInteger(changed) || changed > available || changed < 0) {
    return invalid('The required correction count exceeds the eligible intervals.', {...metadata, feasibleCountRange});
  }
  const delta = changed === 0 ? 0 : residual / changed;
  const firstAdjusted = count - opts.protectedEnd - changed;
  const lastAdjusted = count - opts.protectedEnd;
  const intervals = Array.from({length: count}, (_, index) =>
    index >= firstAdjusted && index < lastAdjusted ? pitch + delta : pitch);
  const adjustedIndices = Array.from({length: changed}, (_, index) => firstAdjusted + index);
  return {
    status: changed === 0 ? 'exact' : 'adjusted', intervals, adjustedIndices,
    intervalCount: count, correctionCount: changed, residual, feasibleCountRange,
    maxFractionDeviation: Math.abs(delta) / pitch, correctionDelta: delta, ...metadata,
    reason: changed === 0
      ? `${count} nominal intervals fit the requested distance exactly.`
      : `${changed} latest eligible interval${changed === 1 ? '' : 's'} changed by ${(100 * delta / pitch).toFixed(3)}%; protected intervals remain nominal.`,
  };
}

/**
 * Fit a circular arc using direct centre-to-centre chord pitch.
 * Ordinary chords have angle A = 2 asin(p / (2R)); all steps use the minor branch.
 * For x = sweep/A, m = floor(x), and f = x-m, choose m when
 * f <= extensionCapacity/(extensionCapacity + contractionCapacity), otherwise m+1.
 * Below x, the required correction capacity falls monotonically as count rises;
 * above x it rises monotonically. This weighted threshold selects the lower of
 * those two requirements directly. Clamping to the admissible count interval
 * preserves that minimum. Rounding its capacity up gives the minimum integer k.
 * Equal raw-capacity ties use the smaller count. No count search is performed.
 * Corrections occupy the latest eligible intervals, before any protected suffix.
 */
export function fitCircularSpan(radius, sweepRadians, pitch, options = {}) {
  if (!Number.isFinite(radius) || radius <= 0 || !Number.isFinite(sweepRadians) ||
      Math.abs(sweepRadians) > TAU + EPS || !Number.isFinite(pitch) || pitch <= 0) {
    throw new RangeError('Use a positive finite radius/pitch and a finite sweep of at most one revolution.');
  }
  const opts = readOptions(options);
  const metadata = {...protectionMetadata(opts), residualUnit: 'radians', chosenFormula: 'weighted-nearest-admissible-circular-count'};
  const protectedCount = opts.protectedStart + opts.protectedEnd;
  const sweep = Math.abs(sweepRadians), sign = sweepRadians < 0 ? -1 : 1;
  if (sweep === 0) {
    if (protectedCount > 0) return invalid('A zero sweep cannot contain protected intervals.', {...metadata, angularSteps: []});
    return {status: 'exact', intervals: [], adjustedIndices: [], angularSteps: [], intervalCount: 0,
      correctionCount: 0, residual: 0, feasibleCountRange: {min: 0, max: 0}, maxFractionDeviation: 0,
      ...metadata, reason: 'Zero sweep has no intervals.'};
  }
  if (pitch > 2 * radius) {
    return invalid('Nominal pitch exceeds the circle diameter, so a nominal chord cannot exist.', {...metadata, angularSteps: []});
  }
  const nominalAngle = 2 * Math.asin(Math.min(1, pitch / (2 * radius)));
  const fraction = opts.corrections ? opts.toleranceFraction : 0;
  const minAngle = 2 * Math.asin(Math.min(1, pitch * (1 - fraction) / (2 * radius)));
  const maxAngle = 2 * Math.asin(Math.min(1, pitch * (1 + fraction) / (2 * radius)));
  const idealCount = sweep / nominalAngle;
  const low = Math.max(1, protectedCount,
    ceilNear((sweep + protectedCount * (maxAngle - nominalAngle)) / maxAngle));
  const high = floorNear((sweep - protectedCount * (nominalAngle - minAngle)) / minAngle);
  const feasibleCountRange = {min: low, max: high};
  const extra = {...metadata, feasibleCountRange, nominalAngle, minAngle, maxAngle};
  if (!Number.isSafeInteger(low) || !Number.isSafeInteger(high) || low > high) {
    return invalid(fraction === 0
      ? 'The sweep has no exact nominal-chord fit satisfying the protected intervals; corrections are disabled.'
      : 'No integer chord count can fit this sweep within the pitch tolerance while preserving the protected intervals.',
    {...extra, angularSteps: []});
  }
  const exactCount = nearestInteger(idealCount);
  const exactResidual = sweep - exactCount * nominalAngle;
  if (exactCount >= low && exactCount <= high && isZeroResidual(exactResidual, sweep, exactCount * nominalAngle)) {
    return {status: 'exact', intervals: Array(exactCount).fill(pitch), adjustedIndices: [],
      angularSteps: Array(exactCount).fill(sign * nominalAngle), intervalCount: exactCount, correctionCount: 0,
      residual: 0, maxFractionDeviation: 0, ...extra,
      reason: `${exactCount} nominal chords fit the requested sweep exactly.`};
  }
  const extensionCapacity = maxAngle - nominalAngle;
  const contractionCapacity = nominalAngle - minAngle;
  const combinedCapacity = extensionCapacity + contractionCapacity;
  if (combinedCapacity <= 0) {
    return invalid('No nonzero chord correction is permitted.', {...extra, angularSteps: []});
  }
  const countThreshold = extensionCapacity / combinedCapacity;
  const lowerCount = Math.floor(idealCount);
  const fractionOfCount = idealCount - lowerCount;
  const preferredCount = fractionOfCount <= countThreshold + integerTolerance(idealCount) ? lowerCount : lowerCount + 1;
  const count = clamp(preferredCount, low, high);
  const rawResidual = sweep - count * nominalAngle;
  const residual = isZeroResidual(rawResidual, sweep, count * nominalAngle) ? 0 : rawResidual;
  const capacity = residual > 0 ? extensionCapacity : contractionCapacity;
  const changed = residual === 0 ? 0 : capacity > 0 ? ceilNear(Math.abs(residual) / capacity) : Infinity;
  if (!Number.isSafeInteger(changed) || changed > count - protectedCount || changed < 0) {
    return invalid('The required chord correction count exceeds the eligible intervals.', {...extra, countThreshold, angularSteps: []});
  }
  const adjustedAngle = changed === 0 ? nominalAngle : nominalAngle + residual / changed;
  const angleTolerance = arithmeticTolerance(nominalAngle, minAngle, maxAngle);
  if (adjustedAngle < minAngle - angleTolerance || adjustedAngle > maxAngle + angleTolerance ||
      adjustedAngle <= 0 || adjustedAngle > Math.PI + angleTolerance) {
    return invalid('The corrected chord angle falls outside its admissible range.', {...extra, countThreshold, angularSteps: []});
  }
  const chord = changed === 0 ? pitch : 2 * radius * Math.sin(adjustedAngle / 2);
  const firstAdjusted = count - opts.protectedEnd - changed;
  const lastAdjusted = count - opts.protectedEnd;
  const intervals = Array.from({length: count}, (_, index) =>
    index >= firstAdjusted && index < lastAdjusted ? chord : pitch);
  const angularSteps = Array.from({length: count}, (_, index) => sign *
    (index >= firstAdjusted && index < lastAdjusted ? adjustedAngle : nominalAngle));
  const adjustedIndices = Array.from({length: changed}, (_, index) => firstAdjusted + index);
  return {status: changed === 0 ? 'exact' : 'adjusted', intervals, adjustedIndices, angularSteps,
    intervalCount: count, correctionCount: changed, residual,
    maxFractionDeviation: Math.abs(chord - pitch) / pitch, correctionDelta: chord - pitch,
    adjustedAngle, countThreshold, preferredCount, ...extra,
    reason: `${changed} latest eligible chord${changed === 1 ? '' : 's'} changed by ${(100 * (chord - pitch) / pitch).toFixed(3)}%; protected chords remain nominal.`};
}

/**
 * Candidate corner using one fixed slit-tip convention, no thread thickness.
 * G = [0,0]. Incoming guide tangent is [1,0]. Outgoing guide rotates by turnDeg.
 * Let u be the slit unit axis and a = slitLength/2. Solve J = Ci-a*ui = Co+a*uo,
 * with virtual centres Ci and Co on their respective supporting guide lines.
 * The nearest ordinary centres are Ci-p*tIn and Co+p*tOut.
 * previous/next are centre coordinates. previousSlit/nextSlit provide their geometry.
 * joint is the merge result (slit, round hole, or unresolved).
 * onArms checks only whether nearest centres lie on the actual incoming/outgoing rays.
 * It is not material, border, or tool clearance.
 */
export function solveCorner(turnDeg, pitch, profile = DEFAULT_PROFILE) {
  requireProfile(profile);
  if (!Number.isFinite(turnDeg) || Math.abs(turnDeg) > 180 || !Number.isFinite(pitch) || pitch <= 0) {
    throw new RangeError('turnDeg must be within [-180,180] and pitch must be positive.');
  }
  const theta = turnDeg * Math.PI / 180;
  const tIn = [1, 0], tOut = [Math.cos(theta), Math.sin(theta)];
  if (Math.abs(Math.abs(turnDeg) - 180) <= 1e-8) {
    return {status: 'unresolved', joint: null, virtualSlits: [], previous: null, next: null,
      tIn, tOut, onArms: false, reason: 'An exact reversal is outside this corner model; it needs a different path or a deliberate treatment.'};
  }
  if (Math.abs(turnDeg) <= 1e-8) {
    const slit = makeSlit([0, 0], 0, profile);
    const virtualSlits = [slit, makeSlit([0, 0], 0, profile)];
    const previous = [-pitch, 0], next = [pitch, 0];
    return {status: 'resolved', joint: mergeVirtualSlits(...virtualSlits, profile), virtualSlits, previous, next,
      previousSlit: makeSlit(previous, 0, profile), nextSlit: makeSlit(next, 0, profile), tIn, tOut, onArms: true,
      virtualCentres: [[0, 0], [0, 0]], guideVertex: [0, 0], reason: 'A straight continuation keeps a single canonical slit at the shared centre.'};
  }
  const lean = -profile.slitAngleDeg * Math.PI / 180;
  const half = profile.slitLength / 2;
  const uIn = [Math.cos(lean), Math.sin(lean)];
  const uOut = [Math.cos(theta + lean), Math.sin(theta + lean)];
  const b = half * Math.sin(lean);
  const point = [-b / Math.tan(theta / 2), -b];
  const ci = add(point, scale(uIn, half));
  const co = sub(point, scale(uOut, half));
  // Remove residual floating noise normal to the supporting guides.
  ci[1] = 0;
  const coOnGuide = scale(tOut, dot(co, tOut));
  const previous = sub(ci, scale(tIn, pitch));
  const next = add(coOnGuide, scale(tOut, pitch));
  const virtualSlits = [makeSlit(ci, 0, profile), makeSlit(coOnGuide, theta, profile)];
  const joint = mergeVirtualSlits(...virtualSlits, profile);
  const onArms = dot(previous, tIn) <= 1e-7 && dot(next, tOut) >= -1e-7;
  const resolved = onArms && joint.kind !== 'unresolved';
  return {status: resolved ? 'resolved' : 'unresolved', joint, virtualSlits, previous, next,
    previousSlit: makeSlit(previous, 0, profile), nextSlit: makeSlit(next, theta, profile),
    tIn, tOut, onArms, virtualCentres: [ci, coOnGuide], guideVertex: [0, 0],
    reason: !onArms
      ? 'The slit-tip candidate puts a neighbouring ordinary centre beyond its guide arm. This corner needs another treatment.'
      : joint.kind === 'unresolved' ? joint.reason
      : 'The fixed slit-tip construction gives one finite crossing and preserves the same schematic thread vector on both runs.'};
}
