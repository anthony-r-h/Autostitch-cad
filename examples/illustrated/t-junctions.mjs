// Synchronized T-junction comparison and static five-arm rule illustration. No CAD writes.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { selectFit } from '../../tests/fit-oracle.mjs';
import { colorConfig, themeFor, displayElements, gifBlocks, writeSceneFiles } from './scenes.mjs';

const directory = path.dirname(fileURLToPath(import.meta.url));
const catalog = JSON.parse(fs.readFileSync(new URL('../../tests/cases.json', import.meta.url)));
const fixture = catalog.illustrations.find(item => item.id === 'ILL-JUNCTION');
const study = catalog.illustrations.find(item => item.id === 'ILL-T-JUNCTION-STUDY');
const fiveStudy = catalog.illustrations.find(item => item.id === 'ILL-FIVE-ARM-STUDY');
const p = fixture.pitch, ell = fixture.slitLength, h = ell / 2;
const alpha = fixture.leanDegrees * Math.PI / 180;
const profile = { pitch: p, slitLength: ell, leanDegrees: fixture.leanDegrees,
  slitWidth: study.inputs.width, holeDiameter: fixture.inputs.diameter, clearanceMargin: study.inputs.margin };
const armLength = study.inputs.armLength;
const timing = study.inputs.animation;
const camera = study.inputs.view;
const policies = [
  { id: 'vertex', title: 'Vertex point' },
  { id: 'half', title: 'Vertex point, half pitch' }
];
const fivePolicies = [{ id: 'half', title: 'Half pitch on every arm' }];
const theme = themeFor(process.argv[5] || undefined);
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const mul = (a, k) => a.map(v => v * k);
const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
const cross = (a, b) => a[0] * b[1] - a[1] * b[0];
const norm = a => Math.hypot(...a);
const unit = angle => [Math.cos(angle), Math.sin(angle)];
const normal = a => [-a[1], a[0]];
const radians = value => value * Math.PI / 180;
const degrees = value => value * 180 / Math.PI;
const distance = (a, b) => norm(sub(a, b));
const expectedVector = [-(p - ell * Math.cos(alpha)), ell * Math.sin(alpha)];
const epsilon = 1e-9;

function pointSegment(point, a, b) {
  const v = sub(b, a);
  const t = Math.max(0, Math.min(1, dot(sub(point, a), v) / dot(v, v)));
  return distance(point, add(a, mul(v, t)));
}

function segmentDistance(a, b, c, d) {
  const v = sub(b, a), w = sub(d, c), denominator = cross(v, w);
  if (Math.abs(denominator) > 1e-12) {
    const t = cross(sub(c, a), w) / denominator;
    const s = cross(sub(c, a), v) / denominator;
    if (t >= 0 && t <= 1 && s >= 0 && s <= 1) return 0;
  }
  return Math.min(pointSegment(a, c, d), pointSegment(b, c, d),
    pointSegment(c, a, b), pointSegment(d, a, b));
}

function fitArm(first, length = armLength) {
  const fit = selectFit({ D: length - first, p });
  assert.ok(fit, 'Remaining straight span must fit in the selected study');
  const gaps = Array.from({ length: fit.n }, (_, i) =>
    fit.k && i >= fit.i && i < fit.i + fit.k ? fit.correctedPitch : p);
  const stations = [first];
  for (const gap of gaps) stations.push(stations.at(-1) + gap);
  assert.ok(Math.abs(stations.at(-1) - length) < epsilon);
  assert.ok(gaps.every(g => g >= 0.9 * p - epsilon && g <= 1.1 * p + epsilon));
  return { ...fit, stations, gaps, residual: length - first - fit.n * p };
}

function construct(beta, policy, fiveArm = false) {
  const halfPitch = policy === 'half';
  const tilt = radians((180 - beta) / 2);
  const directions = [Math.PI - tilt, tilt, ...(fiveArm ? fiveStudy.inputs.fixedArmDegrees.map(radians) : [-Math.PI / 2])];
  const length = fiveArm ? fiveStudy.inputs.armLength : armLength;
  const names = fiveArm ? ['left', 'right', 'lower-left', 'branch', 'lower-right'] : ['left', 'right', 'branch'];
  const arms = directions.map((theta, i) => {
    const lean = alpha;
    return { name: names[i], theta, lean,
      e: unit(theta), n: normal(unit(theta)), u: unit(theta + lean) };
  });
  for (const arm of arms) {
    arm.tip = [0, 0];
    arm.first = halfPitch ? p / 2 : p;
    assert.ok(arm.first > 0 && arm.first < length);
    arm.fit = fitArm(arm.first, length);
    arm.slits = arm.fit.stations.map(station => {
      const center = mul(arm.e, station);
      return { center, a: sub(center, mul(arm.u, h)), b: add(center, mul(arm.u, h)) };
    });
    const connection = sub(arm.tip, arm.slits[0].a);
    arm.threadLength = norm(connection);
    arm.threadAngle = degrees(Math.atan2(dot(connection, arm.n), -dot(connection, arm.e)));
    if (arm.first === p / 2) {
      const target = add(mul(arm.e, expectedVector[0]), mul(arm.n, expectedVector[1]));
      assert.ok(distance(connection, mul(target, 0.5)) < epsilon);
    }
  }
  const slits = arms.flatMap(a => a.slits);
  let slitClearance = Infinity;
  for (let i = 0; i < slits.length; i++) for (let j = i + 1; j < slits.length; j++) {
    slitClearance = Math.min(slitClearance,
      segmentDistance(slits[i].a, slits[i].b, slits[j].a, slits[j].b) - profile.slitWidth);
  }
  const holeClearance = Math.min(...slits.map(slit =>
    pointSegment([0, 0], slit.a, slit.b) - (profile.slitWidth + profile.holeDiameter) / 2));
  const clearance = Math.min(holeClearance, slitClearance);
  return { beta, policy, arms, length, fiveArm, slitClearance, holeClearance, clearance,
    valid: clearance >= profile.clearanceMargin - epsilon };
}

function draw(result) {
  const { scale, origin } = result.fiveArm ? fiveStudy.inputs.view : camera;
  const project = point => [origin[0] + scale * point[0], origin[1] - scale * point[1]];
  const elements = [];
  const line = (a, b, role = 'guide', width = 1, dash = false, screen = false) => {
    elements.push({ type: 'line', a: screen ? a : project(a), b: screen ? b : project(b),
      kind: role === 'ink' ? 'thread' : role, color: role, width, dash });
  };
  const label = (point, value, role = 'text', size = 16, screen = false, kind = 'measurement') => {
    const pos = screen ? point : project(point);
    elements.push({ type: 'text', p: pos, value, color: role, size,
      kind: role === 'angle' ? 'angle-value' : kind,
      adjusted: role === 'adjustedSecondary' });
  };
  const ring = (point, radius, role) => {
    elements.push({ type: 'circle', p: project(point), radius, color: role, kind: 'hole' });
    elements.push({ type: 'circle', p: project(point), radius: radius - 1.3,
      color: 'background', kind: 'opening-interior' });
  };
  const slit = (a, b) => {
    elements.push({ type: 'line', a: project(a), b: project(b), kind: 'slit',
      color: 'construction', width: scale * profile.slitWidth, outline: true, outlineWidth: 0.8 });
  };
  for (const arm of result.arms) {
    line([0, 0], mul(arm.e, result.length), 'guide', 0.9);
    for (let i = 0; i < arm.fit.gaps.length; i++) if (Math.abs(arm.fit.gaps[i] - p) > epsilon) {
      line(arm.slits[i].center, arm.slits[i + 1].center, 'adjusted', 2);
    }
  }
  for (const arm of result.arms) for (const opening of arm.slits) slit(opening.a, opening.b);
  for (const arm of result.arms) {
    line(arm.tip, arm.slits[0].a, 'ink', 2.3);
    for (let i = 0; i + 1 < arm.slits.length; i++) line(arm.slits[i].b, arm.slits[i + 1].a, 'ink', 2.3);
  }
  ring([0, 0], profile.holeDiameter * scale / 2, 'secondary');
  const dimension = (a, b, value, offset, role = 'secondary') => {
    const v = sub(b, a), n = mul(normal(v), 1 / norm(v));
    const A = add(a, mul(n, offset)), B = add(b, mul(n, offset)), tick = mul(n, 4);
    line(A, B, role, 0.9, false, true);
    for (const end of [A, B]) line(sub(end, tick), add(end, tick), role, 0.9, false, true);
    const formatted = (Math.round(value * 100 + 1e-9) / 100).toFixed(2);
    label(add(mul(add(A, B), 0.5), mul(n, Math.sign(offset) * 11)), formatted, role, 16, true);
  };
    for (const arm of result.fiveArm ? [] : result.arms) {
      const a = project(arm.tip), b = project(arm.slits[0].a);
      const v = sub(b, a), n = mul(normal(v), 1 / norm(v));
      const outside = arm.name === 'left' ? [-1, 0] : arm.name === 'right' ? [1, -1] : [1, 0];
      const offset = dot(n, outside) >= 0 ? 27 : -27;
      dimension(a, b, arm.threadLength, offset);
      const base = [-arm.e[0], arm.e[1]], vec = sub(a, b);
      // Measure the actual visible thread against the inward guide direction.
      const measured = degrees(Math.acos(Math.max(-1, Math.min(1, dot(base, vec) / norm(vec)))));
      assert.ok(Math.abs(measured - Math.abs(arm.threadAngle)) < epsilon);
      const start = Math.atan2(base[1], base[0]), stop = Math.atan2(vec[1], vec[0]);
      let sweep = stop - start;
      while (sweep > Math.PI) sweep -= 2 * Math.PI;
      while (sweep < -Math.PI) sweep += 2 * Math.PI;
      const radius = 24;
      line(b, add(b, mul(base, 36)), 'angle', 0.8, true, true);
      let previous = add(b, mul(unit(start), radius));
      for (let i = 1; i <= 12; i++) {
        const next = add(b, mul(unit(start + sweep * i / 12), radius));
        line(previous, next, 'angle', 1.1, false, true); previous = next;
      }
      const labelOffset = arm.name === 'left' ? [-65, 55] : arm.name === 'right' ? [65, 55] : [-80, 50];
      label(add(b, labelOffset), Math.abs(arm.threadAngle).toFixed(2) + '\u00b0', 'angle', 16, true);
    }
  const choices = result.fiveArm ? fivePolicies : policies;
  const caption = `${choices.find(policy => policy.id === result.policy).title}${result.fiveArm ? '' : ` \u00b7 ${Math.round(result.beta)}\u00b0`}`;
  label([300, 145], caption, 'text', 16, true, 'solution-label');
  if (result.fiveArm) {
    label([origin[0], origin[1] - 30], 'j', 'secondary', 14, true, 'notation-junction');
    label([300, 650], 'Hole to first slit: 1.50 mm', 'secondary', 16, true, 'distance-label');
  }
  return displayElements(elements, 1, theme);
}

function sweepScenes() {
  assert.equal(timing.frameCount * timing.frameDelayCentiseconds, timing.durationSeconds * 100);
  const turnaround = timing.frameCount / 2;
  assert.ok(Number.isInteger(turnaround));
  const choices = policies, spec = study, view = camera;
  const scenes = choices.map(policy => ({
    name: policy.id, title: policy.title, source: spec.id,
    displayed: true, exportStills: spec.exportStills, threadPaths: [], frames: [],
    canvas: { width: view.width, height: view.height, background: theme.background, scale: 1, x: 0, y: 0 }
  }));
  for (let index = 0; index < timing.frameCount; index++) {
    const progress = index <= turnaround ? index / turnaround : (timing.frameCount - index) / turnaround;
    const beta = timing.startDegrees + (timing.endDegrees - timing.startDegrees) * progress;
    let expectedGuides;
    for (let policyIndex = 0; policyIndex < choices.length; policyIndex++) {
      const result = construct(beta, choices[policyIndex].id);
      assert.ok(result.valid, `${result.policy}/${beta}: clearance below the required margin`);
      const elements = draw(result);
      const guides = elements.filter(element => element.kind === 'guide');
      if (expectedGuides) assert.deepEqual(guides, expectedGuides);
      else expectedGuides = guides;
      for (const guide of guides) {
        assert.deepEqual(guide.a, view.origin);
        assert.ok(Math.abs(distance(guide.a, guide.b) / result.length - view.scale) < epsilon);
      }
      const label = elements.find(element => element.kind === 'solution-label');
      assert.ok(label.value.endsWith(`${Math.round(beta)}\u00b0`));
      assert.equal(label.fontFamily, colorConfig.typography.fontFamily);
      assert.ok(elements.filter(element => ['slit', 'hole', 'measurement'].includes(element.kind))
        .every(element => element.color === theme.secondary));
      assert.ok(elements.filter(element => element.kind === 'angle-value').every(element => element.color === theme.angle));
      scenes[policyIndex].frames.push({ elements, delay: timing.frameDelayCentiseconds,
        time: index * timing.frameDelayCentiseconds / 100, stage: 'stitch-sweep', angle: beta });
    }
  }
  for (const scene of scenes) {
    scene.final = scene.frames[turnaround].elements;
    assert.equal(scene.frames[0].angle, timing.startDegrees);
    assert.equal(scene.frames[turnaround].angle, timing.endDegrees);
    for (let index = 1; index < turnaround; index++) {
      assert.deepEqual(scene.frames[index].elements, scene.frames[timing.frameCount - index].elements);
    }
    const step = Math.abs(timing.endDegrees - timing.startDegrees) / turnaround;
    for (let index = 0; index < scene.frames.length; index++) {
      const next = scene.frames[(index + 1) % scene.frames.length];
      assert.ok(Math.abs(Math.abs(next.angle - scene.frames[index].angle) - step) < epsilon);
    }
  }
  return scenes;
}

function fiveArmScene() {
  const result = construct(fiveStudy.inputs.includedDegrees, 'half', true);
  assert.ok(result.valid, 'Five-arm half-pitch openings must pass clearance');
  assert.ok(result.arms.every(arm => arm.first === p / 2));
  const elements = draw(result), view = fiveStudy.inputs.view;
  assert.equal(elements.filter(e => e.kind === 'hole').length, 1);
  assert.equal(elements.filter(e => e.kind === 'thread' && distance(e.a, view.origin) < epsilon).length, 5);
  for (const e of elements.filter(e => e.type === 'line')) for (const point of [e.a, e.b]) {
    assert.ok(point[0] >= 12 && point[0] <= view.width - 12 && point[1] >= 12 && point[1] <= view.height - 12);
  }
  return { name: 'five-half', title: 'Five arms share one half-pitch junction', source: fiveStudy.id,
    displayed: true, threadPaths: [], frames: [], final: elements,
    canvas: { width: view.width, height: view.height, background: theme.background, scale: 1, x: 0, y: 0 } };
}

export function createScenes() {
  return [...sweepScenes(), fiveArmScene()];
}

// Store styles once and only changing coordinates/text per frame. The page
// paints every panel from one frame index in one animation callback.
function browserData(scenes) {
  const rounded = values => values.map(value => Number(value.toFixed(2)));
  return scenes.map(scene => {
    const templates = [], templateKeys = [], styleFrames = [];
    const frames = scene.frames.map(frame => {
      // Cache text and geometry styles independently of their moving positions.
      const styles = frame.elements.map(({ a, b, p, value, textBox, ...style }) => style);
      const key = JSON.stringify(styles);
      let template = templateKeys.indexOf(key);
      if (template < 0) {
        template = templates.length;
        templates.push(styles); templateKeys.push(key);
      }
      styleFrames.push(template);
      return frame.elements.map(element => {
        if (element.type === 'line') return rounded([...element.a, ...element.b]);
        if (element.type === 'circle') return rounded(element.p);
        const box = element.textBox;
        return [...rounded(element.p), element.value, ...rounded([box.x, box.y, box.width, box.height])];
      });
    });
    return { name: scene.name, title: scene.title, templates, styleFrames, frames };
  });
}

function writePage(scenes, output) {
  const data = JSON.stringify(browserData(scenes.filter(s => s.frames.length))).replaceAll('<', '\\u003c');
  const panel = scene => `<canvas width="600" height="750" aria-label="${scene.title}"><img src="${scene.name}.gif" width="600" height="750" alt="${scene.title}"></canvas>`;
  const page = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Branching junction comparisons</title><style>
  *{box-sizing:border-box}body{margin:0;padding:12px;background:${theme.background};color:${theme.text};font:16px ${colorConfig.typography.fontFamily}}h2{font-size:20px;font-weight:400}section{margin:0 auto 32px;max-width:2448px;overflow:auto}.panels{display:grid;grid-template-columns:repeat(2,minmax(280px,1fr));gap:12px}.five{max-width:600px;margin:auto}.five img{width:100%;height:auto}canvas{display:block;width:100%;height:auto;aspect-ratio:4/5}
  </style><section><h2>T junction</h2><div class="panels">${scenes.filter(s=>s.source===study.id).map(panel).join('')}</div></section><section id="five-arms"><h2>Five arms, one shared hole</h2><div class="five"><img src="five-half.png" width="600" height="750" alt="Five arms with half-pitch neighbours around one shared hole"></div></section><script>
  const panels=${data};
  const contexts=[...document.querySelectorAll('canvas')].map(canvas=>canvas.getContext('2d'));
  const duration=${timing.durationSeconds * 1000},frameCount=${timing.frameCount};
  function paint(context,panel,frame){
    context.fillStyle='${theme.background}';context.fillRect(0,0,600,750);
    panel.templates[panel.styleFrames[frame]].forEach((style,index)=>{
      const position=panel.frames[frame][index];
      if(style.type==='line'){
        context.beginPath();context.strokeStyle=style.color;context.lineWidth=style.outline?style.outlineWidth:style.width;
        context.lineCap=style.round?'round':'butt';context.setLineDash(style.dash?[4,4]:[]);
        if(style.outline){
          const dx=position[2]-position[0],dy=position[3]-position[1],length=Math.hypot(dx,dy);
          const nx=-dy/length*style.width/2,ny=dx/length*style.width/2;
          context.moveTo(position[0]+nx,position[1]+ny);context.lineTo(position[2]+nx,position[3]+ny);
          context.lineTo(position[2]-nx,position[3]-ny);context.lineTo(position[0]-nx,position[1]-ny);
          context.closePath();context.fillStyle='${theme.background}';context.fill();
        }else{context.moveTo(position[0],position[1]);context.lineTo(position[2],position[3]);}
        context.stroke();
      }else if(style.type==='circle'){
        context.beginPath();context.fillStyle=style.color;context.arc(position[0],position[1],style.radius,0,Math.PI*2);context.fill();
      }else{
        if(style.textBackground){context.fillStyle=style.textBackground;context.fillRect(position[3],position[4],position[5],position[6]);}
        context.fillStyle=style.color;context.font=style.size+'px '+style.fontFamily;
        context.textAlign='center';context.textBaseline='alphabetic';context.fillText(position[2],position[0],position[1]);
      }
    });
    context.canvas.dataset.frame=String(frame);
  }
  let start,previous=-1;
  function tick(now){
    if(start===undefined)start=now;
    const frame=Math.floor(((now-start)%duration)/duration*frameCount);
    if(frame!==previous){contexts.forEach((context,index)=>paint(context,panels[index],frame));previous=frame;}
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
  </script></html>`;
  fs.writeFileSync(path.join(output, 'index.html'), page);
}

function checkExports(scenes) {
  const assets = path.join(directory, 't-junctions');
  const page = fs.readFileSync(path.join(assets, 'index.html'), 'utf8');
  assert.ok(page.includes('id="five-arms"'));
  assert.equal((page.match(/<canvas /g) || []).length, 2);
  assert.ok(page.includes('src="five-half.png"'));
  const moving = scenes.filter(s => s.frames.length);
  const panels = JSON.parse(page.split('const panels=')[1].split(';\n  const contexts=')[0]);
  assert.deepEqual(panels, browserData(moving), 'The page must contain the current switching layouts');
  new Function(page.split('<script>')[1].split('</script>')[0]);
  assert.deepEqual(panels.map(panel => panel.name), moving.map(scene => scene.name));
  for (const panel of panels) {
    assert.equal(panel.frames.length, timing.frameCount);
    assert.equal(panel.styleFrames.length, timing.frameCount);
    assert.ok(panel.frames.every((frame, index) => frame.length === panel.templates[panel.styleFrames[index]].length));
  }
  let expectedDelays;
  for (const scene of moving) {
    const data = fs.readFileSync(path.join(assets, `${scene.name}.gif`));
    assert.equal(data.readUInt16LE(6), 600);
    assert.equal(data.readUInt16LE(8), 750);
    const blocks = gifBlocks(data).blocks;
    const delays = blocks.filter(block => block.kind === 'control').map(block => block.bytes.readUInt16LE(4));
    assert.equal(delays.length, timing.frameCount);
    assert.equal(delays.reduce((sum, value) => sum + value, 0), timing.durationSeconds * 100);
    assert.ok(delays.every(delay => delay === timing.frameDelayCentiseconds));
    if (expectedDelays) assert.deepEqual(delays, expectedDelays);
    else expectedDelays = delays;
    assert.equal(blocks.filter(block => block.kind === 'image').length, timing.frameCount);
    assert.ok(data.includes(Buffer.from('NETSCAPE2.0')));
    for (const extension of ['png', 'svg']) assert.ok(!fs.existsSync(path.join(assets, `${scene.name}.${extension}`)), `Unexpected static export: ${scene.name}.${extension}`);
  }
  const five = scenes.find(s => s.name === 'five-half');
  assert.equal(five.frames.length, 0);
  const png = fs.readFileSync(path.join(assets, 'five-half.png'));
  assert.equal(png.readUInt32BE(16), 600); assert.equal(png.readUInt32BE(20), 750);
  assert.ok(fs.readFileSync(path.join(assets, 'five-half.svg'), 'utf8').includes('<svg'));
  for (const name of ['reverse.gif', 'reverse-half.gif', 'five-vertex.gif', 'five-pair.gif', 'five-half.gif']) {
    assert.ok(!fs.existsSync(path.join(assets, name)), `Obsolete branching comparison: ${name}`);
  }
  console.log('Two synchronized ten-second T loops and one static five-arm figure validated: half-pitch geometry, fitting, clearance, framing and exports.');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const scenes = createScenes();
  const mode = process.argv[2];
  if (mode === 'check') checkExports(scenes);
  else {
    writeSceneFiles(scenes);
    if (mode === 'prepare') writePage(scenes, path.resolve(process.argv[3]));
  }
}
