// Small review sheet using the existing renderer; not a second viewer.
import fs from 'node:fs';
import {runCase} from '../case-suite.mjs';
import {makeSlit} from '../geometry.mjs';
import {renderSvg} from '../render-svg.mjs';
import {cornerCandidates, guide} from './model-evidence.mjs';

function connect(result, path, changed = new Set()) {
  result.intervals = [];
  result.threads = [];
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1], b = path[i];
    result.intervals.push({a: a.center, b: b.center,
      length: Math.hypot(b.center[0] - a.center[0], b.center[1] - a.center[1]),
      adjusted: changed.has(i - 1), junction: !!(a.diameter || b.diameter)});
    result.threads.push({a: a.b || a.center, b: b.a || b.center});
  }
}

const oldStraight = runCase('S02');
const centred = structuredClone(oldStraight);
const gaps = [3, 3, 3, 3, 3.25, 3.25, 3, 3, 3, 3];
let station = 0;
centred.slits = [makeSlit([0, 0], 0)];
for (const gap of gaps) {
  station += gap;
  centred.slits.push(makeSlit([station, 0], 0));
}
connect(centred, centred.slits, new Set([4, 5]));
centred.title = 'Centred corrections';
centred.reason = 'Same two changed gaps, four nominal gaps beside each endpoint.';

const oldArc = runCase('A03');
const newArc = structuredClone(oldArc);
const junction = cornerCandidates(guide(10, 1, 0), guide(0, 0, 90)).chosen;
const arcStep = 20 * Math.asin(3 / 20);
const incoming = [3, 2, 1].map(k => {
  const angle = (junction.ci - k * arcStep) / 10;
  return makeSlit([10 * Math.sin(angle), 10 - 10 * Math.cos(angle)], angle);
});
const outgoing = [1, 2, 3].map(k => makeSlit([0, junction.co + 3 * k], Math.PI / 2));
const hole = {center: junction.J, diameter: .5};
newArc.slits = [...incoming, ...outgoing];
newArc.holes = [hole];
newArc.virtualSlits = [];
newArc.markers = [{point: [0, 0], label: 'Guide junction', type: 'endpoint'}];
newArc.title = 'Local tip-locus junction';
newArc.reason = 'Each arm preserves its ordinary tip-to-tip display vector.';
connect(newArc, [...incoming, hole, ...outgoing]);

const panels = [
  [oldStraight, 'Baseline: end corrections', '30.5 mm / pitch 3 mm / two changed gaps'],
  [centred, 'Decision: centred corrections', 'Same count and gap sizes; changes moved away from features'],
  [oldArc, 'Baseline A03: hole at guide junction', '90-degree guide turn; display 97.202 degrees; outer ends free'],
  [newArc, 'Decision: local slit-tip construction', '90-degree guide turn; display 92.704 degrees; outer ends free'],
];
const parts = panels.map(([result, title, subtitle], index) => {
  const x = 16 + (index % 2) * 600, y = 100 + Math.floor(index / 2) * 350;
  const svg = renderSvg(result, {width: 570, height: 285, showVirtuals: false});
  return `<g transform="translate(${x},${y})"><text x="8" y="0" font-size="18" font-weight="bold">${title}</text><text x="8" y="24" font-size="13">${subtitle}</text><g transform="translate(0,35)">${svg}</g></g>`;
});
const sheet = `<svg xmlns="http://www.w3.org/2000/svg" width="1230" height="840" viewBox="0 0 1230 840"><rect width="1230" height="840" fill="white"/><g font-family="Arial,sans-serif" fill="#24313b"><text x="24" y="34" font-size="24" font-weight="bold">Autostitch design decisions</text><text x="24" y="58" font-size="14">Geometric comparisons only. Panels scale independently; tool/material qualification remains open.</text>${parts.join('\n')}<text x="24" y="824" font-size="13">Teal: real openings. Grey: guide and schematic thread. Orange: corrected gaps. Original laboratory behavior is unchanged.</text></g></svg>`;
fs.writeFileSync(new URL('./design-comparison.svg', import.meta.url), sheet + '\n');
console.log('Rendered review/design-comparison.svg');
