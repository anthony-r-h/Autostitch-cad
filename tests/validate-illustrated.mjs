// Check the drawn SVG geometry, not just the generator's captions.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { selectFit } from './fit-oracle.mjs';

const root = new URL('../', import.meta.url);
const catalog = JSON.parse(fs.readFileSync(new URL('tests/cases.json', root), 'utf8'));
const spec = catalog.illustrations.find(item => item.id === 'ILL-S02');
const variant = catalog.geometry.find(item => item.id === spec.case).variants.find(item => item.pitch === spec.pitch);
const primitive = variant.route.primitives[0];
const length = Math.hypot(primitive.b[0] - primitive.a[0], primitive.b[1] - primitive.a[1]);
const fit = selectFit({ D: length, p: spec.pitch });
const near = (actual, expected) => assert(Math.abs(actual - expected) < 1e-6, `${actual} != ${expected}`);
let checked = 0;
for (const asset of spec.assets) {
  const svg = fs.readFileSync(new URL(`${asset.path}.svg`, root), 'utf8');
  const lines = [...svg.matchAll(/<line\s+([^>]+)\/>/g)].map(match => Object.fromEntries(
    [...match[1].matchAll(/([\w-]+)="([^"]*)"/g)].map(attribute => [attribute[1], attribute[2]])
  ));
  const guide = lines.find(line => line.class === 'guide');
  const scale = (Number(guide.x2) - Number(guide.x1)) / length;
  const slits = lines.filter(line => line.class === 'slit');
  assert.equal(slits.length, fit.n + 1);
  const centres = slits.map(slit => {
    const dx = Number(slit.x2) - Number(slit.x1);
    const dy = Number(slit.y2) - Number(slit.y1);
    near(Math.hypot(dx, dy) / scale, spec.slitLength);
    near(Math.atan2(-dy, dx) * 180 / Math.PI, spec.leanDegrees);
    near((Number(slit.y1) + Number(slit.y2)) / 2, Number(guide.y1));
    return ((Number(slit.x1) + Number(slit.x2)) / 2 - Number(guide.x1)) / scale;
  });
  near(centres[0], 0);
  near(centres.at(-1), length);
  const gaps = centres.slice(1).map((station, i) => station - centres[i]);
  const changed = gaps.map((gap, index) => ({ gap, index })).filter(item => Math.abs(item.gap - spec.pitch) > 1e-6);
  assert(gaps.every(gap => gap >= .9 * spec.pitch && gap <= 1.1 * spec.pitch));
  assert.equal(changed.length, asset.changedGaps);
  assert.equal(changed[0].index, asset.firstChangedGap);
  assert(changed.every((item, i) => item.index === asset.firstChangedGap + i));
  changed.forEach(item => near(item.gap, asset.adjustedPitch));
  assert.equal(lines.filter(line => line.class === 'adjustment-mark').length, (changed.length + 1) * 2);
  const overlay = lines.filter(line => line.class === 'tool-comparison-slit');
  assert.equal(overlay.length, 4);
  const overlayX = overlay.map(line => (Number(line.x1) + Number(line.x2)) / 2);
  overlayX.forEach((x, i) => near((x - overlayX[0]) / scale, centres[i]));
  const teeth = lines.filter(line => line.class === 'chisel-tooth');
  assert.equal(teeth.length, 4);
  teeth.forEach((tooth, i) => {
    const x = (Number(tooth.x1) + Number(tooth.x2)) / 2;
    near((x - overlayX[0]) / scale, i * spec.pitch);
    near(Math.hypot(Number(tooth.x2) - Number(tooth.x1), Number(tooth.y2) - Number(tooth.y1)) / scale, spec.slitLength);
  });
  if (asset.policy === 'central') {
    assert.equal(changed.length, fit.k);
    assert.equal(changed[0].index, fit.i);
    near(changed[0].gap, fit.correctedPitch);
    near(centres[fit.i], length - centres[fit.i + fit.k]);
  }
  const png = fs.readFileSync(new URL(`${asset.path}.png`, root));
  assert.equal(png.subarray(1, 4).toString(), 'PNG');
  assert.equal(png.readUInt32BE(16), 600);
  assert.equal(png.readUInt32BE(20), 375);
  assert(svg.includes('viewBox="0 0 600 375"'));
  checked++;
}
console.log(`Illustrations valid: ${checked} SVG layouts, gap bounds, slit geometry, marks, tool comparisons and PNG sizes; central fit agrees with the independent selector.`);
