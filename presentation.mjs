const labels = {
  S01: 'Straight line', S02: 'Straight line with end adjustments', S04: 'Keep the last gap unchanged',
  F01: 'Centred crossing', F02: 'Shifted crossing', F03: 'Two crossings', F05: 'Short space between crossings',
  J01: 'Straight join', J02: '90° corner', J03: '135° corner', J04: '45° corner',
  J05: 'Corner with a short side', J06: 'Corner with fixed ends',
  A01: 'Curve with fixed ends', A02: 'Curve with a centred crossing',
  A03: 'Curve to line at a corner', A04: 'Two curves at a corner', A05: 'Straight into a curve',
  L01: 'Circle', L02: 'Circle with closing adjustments', R01: 'Rectangle', N01: 'Crossing near a corner'
};

const descriptions = {
  S01: 'A straight line with a hole at each end.',
  S02: 'Keep the end holes fixed and adjust the fewest gaps.',
  S04: 'The final gap stays at the selected pitch.',
  F01: 'Keep the crossing halfway between two holes, one pitch apart.',
  F02: 'Shift the crossing while keeping the two end holes fixed.',
  F03: 'Place two centred crossings on the same line.',
  F05: 'Fit the holes in the short space between two fixed crossings.',
  J01: 'Continue through a straight join with one shared slit.',
  J02: 'One round hole joins the two sides.',
  J03: 'One round hole joins the two sides.',
  J04: 'One round hole joins the two sides.',
  J05: 'The short side must have room for the hole before the corner.',
  J06: 'Keep the two end holes fixed and fit the corner between them.',
  A01: 'Keep a hole at each end of the curve.',
  A02: 'The crossing stays centred in one unchanged gap on the curve.',
  A03: 'A curve meets a straight line at a right-angle corner.',
  A04: 'Two curves meet at a right-angle corner.',
  A05: 'A slit sits at the smooth join. The ends may stop short of the guide.',
  L01: 'Close the circle at the starting hole.',
  L02: 'Keep the placed holes fixed and adjust the closing section.',
  R01: 'Go around all four sides and return to the first hole.',
  N01: 'Cross a pocket edge shortly before turning the corner.'
};

const number = (value, digits = 3) => String(Number(Number(value).toFixed(digits)));
const compact = value => String(value).replace(/-?\d+\.\d+/g, value => number(value));
const metric = (result, name) => (result.metrics || []).find(item => item[0] === name)?.[1];

export function caseLabel(result) { return labels[result.id] || result.title; }
export function caseDescription(result) { return descriptions[result.id] || caseLabel(result) + '.'; }

export function caseGroup(result) {
  if (['J02', 'J03', 'J04'].includes(result.id)) return 'Corner angles';
  if (result.id === 'N01' || result.id.startsWith('F')) return 'Crossings';
  if (result.id === 'R01' || result.id.startsWith('L')) return 'Closed shapes';
  if (result.id.startsWith('S')) return 'Straight lines';
  if (result.id.startsWith('J')) return 'Corners and joins';
  if (result.id.startsWith('A')) return 'Curves';
  return 'Other';
}

function invalidSummary(result) {
  let explanation;
  if (/separation|slit.*spacing/i.test(result.reason || '')) {
    explanation = 'The selected pitch leaves too little space between slits.';
  } else if (result.id === 'J05') {
    explanation = 'The short side has no room for the hole before the corner.';
  } else if (result.id === 'N01') {
    explanation = 'The centred crossing and the corner do not fit in the available space.';
  } else if (result.id.startsWith('F') || result.id === 'A02') {
    explanation = 'The fixed holes and centred crossing cannot fit within the 10% spacing limit.';
  } else if (result.id.startsWith('L') || result.id === 'R01') {
    explanation = 'The remaining gap cannot close within the 10% spacing limit.';
  } else if (result.id.startsWith('J')) {
    explanation = 'The holes beside the corner do not fit on the two sides.';
  } else {
    explanation = 'The fixed end holes cannot fit within the 10% spacing limit.';
  }
  return explanation;
}

export function caseSummary(result) {
  if (result.status === 'invalid') return invalidSummary(result);
  if (result.status === 'unsupported') return 'This shape is not covered yet.';
  const openingCount = (result.slits?.length || 0) + (result.holes?.length || 0);
  const changes = (result.intervals || []).filter(item => item.adjusted);
  const lengths = [...new Set(changes.map(item => number(item.length)))].sort((a, b) => Number(a) - Number(b));
  let text = openingCount + (openingCount === 1 ? ' hole. ' : ' holes. ');
  if (!changes.length) text += 'Slit spacing unchanged.';
  else if (lengths.length === 1) text += changes.length + (changes.length === 1 ? ' changed gap at ' : ' changed gaps at ') + lengths[0] + ' mm.';
  else if (lengths.length === 2) text += changes.length + ' changed gaps: ' + lengths.join(' and ') + ' mm.';
  else text += changes.length + ' changed gaps, from ' + lengths[0] + ' to ' + lengths[lengths.length - 1] + ' mm.';
  if (['A03', 'A04'].includes(result.id)) {
    text += ' Corner rule to review.';
    const turn = parseFloat(metric(result, 'Display-line turn'));
    if (Number.isFinite(turn)) text += ' Thread turn: ' + number(turn, 1) + '°.';
  }
  return text;
}

export function caseDetails(result) {
  const names = {
    'Guide length': 'Length', 'Guide extent': 'Line extent', 'Radius': 'Radius', 'Sweep': 'Arc angle',
    'Incoming / outgoing arm': 'Side lengths', 'Included angle': 'Corner angle', 'Guide radii': 'Radii',
    'Guide tangent turn': 'Corner angle', 'Junction centre distances': 'Gaps beside the round hole',
    'Rectangle width': 'Width', 'Rectangle height': 'Height', 'Rectangle dimensions': 'Size', 'Width': 'Width', 'Height': 'Height',
    'Straight length': 'Straight length', 'Line length': 'Straight length', 'Arc radius': 'Radius',
    'Arc sweep': 'Arc angle', 'Crossing distance from corner': 'Crossing to corner',
    'Pocket edge distance from corner': 'Pocket edge to corner', 'Pocket edge before the corner': 'Pocket edge to corner',
    'Free start margin': 'Gap before the first hole', 'Free end margin along arc': 'Curve left after the last hole'
  };
  const details = (result.metrics || []).filter(([name]) => names[name]).map(([name, value]) => {
    const simpleValue = name === 'Junction centre distances'
      ? [...new Set(String(value).replace(/\s*mm$/, '').split(',').map(item => compact(item.trim())))].join(', ') + ' mm'
      : compact(value);
    return names[name] + ': ' + simpleValue;
  });
  details.push('Slits: 1.5 mm, 40°');
  if (result.holes?.length) details.push('Round holes: 0.5 mm');
  return [...new Set(details)];
}
