// Native SVG fidelity and storyboard timing; no CAD session required.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {loadEmblem,nativeEmblemSvg,storyboard,validateStoryboard,cameraAt,frameAt,createEmblemScene} from '../examples/illustrated/emblem.mjs';
import {createSquareEmblem} from '../examples/illustrated/emblem-square.mjs';
import {gifBlocks,svg,displayElements,termLabel,colorConfig} from '../examples/illustrated/scenes.mjs';

const model=loadEmblem(),book=storyboard;
validateStoryboard(book,model);
assert.equal(model.pitch,2.7);
assert.equal(model.openings.length,1077);
assert.equal(model.groups.filter(g=>g.radius).reduce((n,g)=>n+g.openings.length,0),496);
assert.equal(model.groups.find(g=>g.id==='A').openings.length,99);
assert.equal(new Set(model.openings.map(o=>o.id)).size,1077);
const byId=new Map(model.openings.map(o=>[o.id,o]));
const branches=model.openings.filter(o=>o.type==='circle').map(hole=>({hole,
  neighbours:model.threads.filter(t=>t.from===hole.id||t.to===hole.id)
    .map(t=>byId.get(t.from===hole.id?t.to:t.from))
})).filter(branch=>branch.neighbours.length>=3);
assert.deepEqual(branches.map(b=>[b.hole.group,b.neighbours.length]).sort(),
  [['script-h-6',3],['script-t-2',4],['script-t-4',4]],'The native thread graph must retain all three branching holes');
for(const {hole,neighbours} of branches) {
  assert.equal(new Set(neighbours.map(o=>o.id)).size,neighbours.length,'Every branching arm needs its own neighbour');
  for(const neighbour of neighbours) {
    assert.equal(neighbour.type,'slit');
    assert(neighbour.fixed,'Branching neighbours must stay fixed during redistribution');
    const chord=Math.hypot(...neighbour.center.map((v,i)=>v-hole.center[i]));
    assert(Math.abs(chord-model.pitch/2)<1e-5,`${hole.id}: branch chord ${chord} must be half pitch`);
  }
}
const project=(p,c)=>[300+(p[0]-c.center[0])*750/c.height,375-(p[1]-c.center[1])*750/c.height];
const almost=(a,b)=>assert(Math.abs(a-b)<1e-7,`${a} != ${b}`);
const point=(a,b)=>a.forEach((v,i)=>almost(v,b[i]));
const at=t=>frameAt(t,book,model);
const action=(target,name)=>book.actions.find(a=>a.target===target&&a.action===name);
const aAdjust=action('A','adjust'),aStitch=action('A','stitch'),restAdjust=action('lettering-rest','adjust');
const landmarks=action('A','mark-landmarks');
const landmarkCount=time=>at(time).elements.filter(e=>e.type==='text'&&/^L\d$/.test(e.value)).length;
assert.equal(at(0).commentary,'Set symmetry');
assert.equal(landmarkCount(0),0);
assert.equal(landmarkCount(landmarks.at+landmarks.duration*.75),1);
assert.equal(landmarkCount(landmarks.at+landmarks.duration),2);
assert.equal(at(action('A','reveal-fixed').at).commentary,'Resolve fixed openings');
const punch=action('i-dot','punch'),dot=model.openings.find(o=>o.radius>1);
const fade=action('all','fade-openings');
const visible=at(fade.at),fading=at(fade.at+fade.duration/2),clean=at(fade.at+fade.duration+.01);
assert(clean.elements.length===model.threads.length&&clean.elements.every(e=>e.kind==='thread'),'Only thread remains before the dot punch');
assert(fading.elements.find(e=>e.kind==='slit').color!==visible.elements.find(e=>e.kind==='slit').color,'Openings must fade before disappearing');
assert(!at(punch.at-.01).elements.some(e=>e.id===dot.id),'The dot must be the final reveal');
const impact=at(punch.at).elements.find(e=>e.id===dot.id),settled=at(punch.at+punch.duration).elements.find(e=>e.id===dot.id);
assert(impact.radius>settled.radius&&impact.glow,'The dot needs a brief impact pulse');
almost(settled.radius,dot.radius*750/cameraAt(punch.at+punch.duration,book,model).height);
assert(!book.actions.some(a=>a.action==='flash'),'No full-emblem flash');
assert(punch.at-fade.at-fade.duration<=.1,'The dot should follow the cleanup promptly');
assert(at(punch.at).elements.filter(e=>e.glow).every(e=>e.id===dot.id),'Only the dot pulses at the finish');
assert(!at(action('rings','stitch').at+.05).elements.some(e=>e.kind==='thread'&&e.glow),'No overview stitch flash');
assert(at(aStitch.at+.05).elements.some(e=>e.kind==='thread'&&e.glow),'Keep the A close-up Stitch pulse');
const layout=action('A','lay-out'),residualStart=layout.at+layout.duration+layout.residualDelay;
assert(!at(residualStart-.01).elements.some(e=>e.kind==='residual'),'Pause before showing residuals');
const emerging=at(residualStart+layout.residualFade/2).elements.find(e=>e.kind==='residual');
const shown=at(residualStart+layout.residualFade).elements.find(e=>e.kind==='residual');
assert(emerging&&shown&&emerging.color!==shown.color,'Residuals should fade in before redistribution');
const pullback=book.camera[1];
for(const cue of book.commentary) {
  const frame=at(cue.at);
  assert.deepEqual(frame.elements.filter(e=>e.kind==='term-label'),displayElements(termLabel([300,705],cue.text),0));
  assert(!frame.elements.some(e=>e.kind==='caption-background'||e.kind==='phase-caption'));
}
assert.equal(at(0).elements.filter(e=>['slit','hole','thread'].includes(e.kind)).length,0);
assert(at(0).elements.some(e=>e.kind==='guide'));
assert(at(0).elements.filter(e=>e.kind==='guide').every(e=>e.group==='A'));
for(const time of [pullback.at,pullback.at+3,book.duration]) {
  assert(!at(time).elements.some(e=>e.kind==='guide'||e.kind==='virtual'||e.type==='text'),'Guides and annotation must disappear at pullback');
}
const final=at(book.duration);
assert.equal(final.elements.filter(e=>e.kind==='slit'||e.kind==='hole').length,1);
assert(final.elements.every(e=>e.kind==='thread'||e.id===dot.id),'Final hold must contain only thread and the dot');
assert.equal(final.elements.filter(e=>e.kind==='thread').length,model.threads.length);
for(const o of model.openings) {
  const frame=o.id===dot.id?final:visible,e=frame.elements.find(e=>e.id===o.id);
  if(o.type==='slit'){point(e.a,project(o.a,frame.camera));point(e.b,project(o.b,frame.camera));}
  else {point(e.p,project(o.center,frame.camera));almost(e.radius,o.radius*750/frame.camera.height);}
}
const threadElements=final.elements.filter(e=>e.kind==='thread');
const threads=model.groups.flatMap(g=>g.threads);
threads.forEach((t,i)=>{point(threadElements[i].a,project(t.a,final.camera));point(threadElements[i].b,project(t.b,final.camera));});
const a=model.groups.find(g=>g.id==='A');
assert.equal(a.landmarks.length,2);
for(const marker of a.landmarks) {
  const p=a.primitives[marker.primitive];
  almost(marker.station,p.length/2);
  assert.equal(p.runs.length,2,'A crown landmarks split the fitting into two spans');
  // SVG coordinates are rounded to five decimal pixels by the native export renderer.
  for(const [i,o] of p.row.entries())assert(Math.abs(o.station+p.row.at(-1-i).station-p.length)<1e-5,'Crown opening stations must mirror about the apex');
  const left=p.runs[0].at(-1),right=p.runs[1][0];
  assert(left.fixed&&right.fixed,'Both landmark neighbours must remain fixed');
  assert(Math.abs(Math.hypot(...left.center.map((v,i)=>v-right.center[i]))-model.pitch)<1e-5,'Landmark gap must retain nominal pitch');
}
const before=at(aAdjust.at-.5),during=at(aAdjust.at+aAdjust.duration/2),after=at(aAdjust.at+aAdjust.duration+.5);
assert.equal(before.elements.filter(e=>e.kind==='notation-start').length,2);
assert.equal(before.elements.filter(e=>e.kind==='notation-junction').length,8);
assert.equal(before.elements.filter(e=>e.type==='text'&&/^L\d$/.test(e.value)).length,2);
assert.equal(before.elements.filter(e=>e.kind==='notation-end').length,0,'Closed contours reuse their starts');
assert(before.elements.some(e=>e.kind==='dimension'));
assert(during.elements.some(e=>e.kind==='measurement'&&e.adjusted));
let moved=0;
for(const o of a.openings.filter(o=>o.type==='slit')) {
  const first=before.elements.find(e=>e.id===o.id),middle=during.elements.find(e=>e.id===o.id),last=after.elements.find(e=>e.id===o.id);
  if(o.fixed){point(first.a,last.a);point(middle.a,last.a);}
  else if(Math.hypot(first.a[0]-last.a[0],first.a[1]-last.a[1])>.01)moved++;
}
assert(moved>10,'Adjustment must move the nominal layout');
assert.equal(after.elements.filter(e=>e.kind==='residual').length,0);
assert(before.elements.some(e=>e.kind==='residual'));
assert.equal(after.elements.filter(e=>e.kind==='thread').length,0);
assert.equal(at(aStitch.at+.1).elements.filter(e=>e.kind==='thread').length,99);
assert.equal(at(pullback.at).elements.filter(e=>e.kind==='slit'||e.kind==='hole').length,99);
assert(at(restAdjust.at).elements.filter(e=>e.kind==='slit'||e.kind==='hole').length>99);
assert(cameraAt(pullback.at+6,book,model).height>cameraAt(pullback.at,book,model).height);
assert(cameraAt(0,book,model).height<cameraAt(book.duration,book,model).height);
for(const time of [pullback.at,pullback.at+pullback.duration]) {
  const left=cameraAt(time-1e-7,book,model),right=cameraAt(time+1e-7,book,model);
  assert(Math.abs(left.height-right.height)<1e-4,'Camera jumps at a keyframe');
  assert(Math.hypot(...left.center.map((v,i)=>v-right.center[i]))<1e-4);
}
const restBefore=at(restAdjust.at-.1),restDuring=at(restAdjust.at+restAdjust.duration/2),restAfter=at(restAdjust.at+restAdjust.duration+.1);
const world=(p,c)=>[(p[0]-300)*c.height/750+c.center[0],c.center[1]-(p[1]-375)*c.height/750];
for(const group of model.groups.filter(g=>g.id!=='A'&&!g.radius)) {
  let changed=0;
  for(const o of group.openings) {
    if(o.id===dot.id)continue;
    const initial=restBefore.elements.find(e=>e.id===o.id),middle=restDuring.elements.find(e=>e.id===o.id),fitted=restAfter.elements.find(e=>e.id===o.id);
    assert(initial&&middle&&fitted);
    if(o.type==='circle') {point(world(initial.p,restBefore.camera),o.center);point(world(middle.p,restDuring.camera),o.center);continue;}
    const first=world(initial.a,restBefore.camera),mid=world(middle.a,restDuring.camera),last=world(fitted.a,restAfter.camera);
    if(o.fixed){point(first,last);point(mid,last);}
    else if(Math.hypot(first[0]-last[0],first[1]-last[1])>.001){changed++;assert(Math.hypot(mid[0]-last[0],mid[1]-last[1])>.0001);}
  }
  assert(changed>0,`${group.id} must actually redistribute, independently of camera motion`);
}
assert(model.groups.filter(g=>g.id.startsWith('script-')).some(g=>g.primitives.some(p=>p.runs.length>1)),'Branch holes must split nominal runs');
const finish=Math.max(...book.actions.map(a=>a.at+a.duration),pullback.at+pullback.duration);
assert(book.duration-finish>=12,'Hold the completed emblem for at least twelve seconds');
assert.deepEqual(at(finish+.1).elements,final.elements);
const samples=new Map([5,10.5,13,21,29].map(time=>[time,at(time)]));
for(const time of [13,5,21,10.5,29,13])assert.deepEqual(at(time),samples.get(time),'Frame evaluation depends on playback history');
const invalid=change=>{const b=structuredClone(book);change(b);assert.throws(()=>validateStoryboard(b,model));};
invalid(b=>b.actions[0].target='missing-letter');
invalid(b=>b.actions[0].action='unknown-action');
invalid(b=>b.actions.find(a=>a.target==='A'&&a.action==='stitch').at=aAdjust.at+1);
invalid(b=>b.camera.push({at:pullback.at+1,duration:2,view:'A'}));
invalid(b=>b.actions.push({...b.actions[0]}));
invalid(b=>b.actions[2].easing='random');
invalid(b=>b.duration=Infinity);
invalid(b=>b.commentary[0].phase='Unknown');
invalid(b=>b.commentary.at(-1).until=0);
invalid(b=>b.guides[0].target='missing-guide');
invalid(b=>b.actions.find(a=>a.action==='punch').at=10);
invalid(b=>b.actions.find(a=>a.action==='fade-openings').at=20);
invalid(b=>b.actions.find(a=>a.action==='mark-landmarks').at=3);
invalid(b=>b.actions.find(a=>a.target==='A'&&a.action==='lay-out').residualDelay=2);
const ringView=structuredClone(book);
ringView.views.A.target='ring-80';
validateStoryboard(ringView,model);
assert(Number.isFinite(cameraAt(8,ringView,model).height));
const skipAdjustment=structuredClone(book);
skipAdjustment.actions=skipAdjustment.actions.filter(a=>a.action!=='adjust');
validateStoryboard(skipAdjustment,model);
assert.deepEqual(frameAt(book.duration,skipAdjustment,model).elements,final.elements);
const scene=createEmblemScene(book,model);
for(const frame of scene.frames) {
  const labels=frame.elements.filter(e=>e.textBox);
  for(let i=0;i<labels.length;i++)for(let j=i+1;j<labels.length;j++) {
    const a=labels[i].textBox,b=labels[j].textBox;
    assert(!(a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y),`Emblem at ${frame.time}: ${labels[i].value} overlaps ${labels[j].value}`);
  }
  const groups=Map.groupBy(frame.elements.filter(e=>e.dimensionId),e=>e.dimensionId);
  for(const group of groups.values()) {
    const values=group.filter(e=>e.dimensionPart==='value');
    assert.equal(values.length,1,'Emblem dimension must retain its single label');
    assert(group.filter(e=>e.dimensionPart==='bracket').length>=3,'Emblem label must retain its complete bracket');
    if(frame.time>=aStitch.at+aStitch.duration)assert.equal(new Set(group.map(e=>e.color)).size,1,'Emblem bracket/value must fade together');
  }
  for(const e of frame.elements.filter(e=>e.type==='text'&&/^[+-]?\d+(?:\.\d+)?$/.test(e.value))) {
    assert.equal(e.size,colorConfig.typography.lengthSize*colorConfig.typography.sizeScale);
    assert(/^[+-]?\d+\.\d{2}$/.test(e.value));
    assert(!e.bold);
  }
}
assert.equal(fs.readFileSync(new URL('../examples/illustrated/emblem/emblem-construction.svg',import.meta.url),'utf8').replaceAll('\r\n','\n'),svg(scene),'Final SVG is stale');
assert.equal(scene.frames.reduce((n,f)=>n+f.delay,0),book.duration*100);
assert(scene.frames.every(f=>f.delay>0));
for(const frame of scene.frames)for(const e of frame.elements) {
  for(const p of e.type==='line'?[e.a,e.b]:e.type==='polygon'?e.points:[e.p])assert(p.every(Number.isFinite));
}
const gif=fs.readFileSync(new URL('../examples/illustrated/emblem/emblem-construction.gif',import.meta.url));
assert.equal(gif.readUInt16LE(6),600);assert.equal(gif.readUInt16LE(8),750);
const {blocks}=gifBlocks(gif);
assert.equal(blocks.filter(b=>b.kind==='image').length,scene.frames.length);
const delays=blocks.filter(b=>b.kind==='control').map(b=>b.bytes.readUInt16LE(4));
assert.deepEqual(delays,scene.frames.map(f=>f.delay));
assert(gif.includes(Buffer.from('NETSCAPE2.0')));
const square=createSquareEmblem(model),squareElements=square.final;
assert.equal(square.canvas.width,600);assert.equal(square.canvas.height,600);
assert.equal(squareElements.filter(e=>e.id&&['slit','hole'].includes(e.kind)).length,model.openings.length);
assert.equal(squareElements.filter(e=>e.kind==='thread').length,model.threads.length);
assert.equal(squareElements.filter(e=>e.kind==='virtual').length,model.extras.filter(e=>e.kind==='virtual').length);
for(const kind of ['guide','adjusted-gap','adjustment-mark','angle','notation-start','notation-end','notation-junction','notation-landmark']) {
  assert(squareElements.some(e=>e.kind===kind),`Square emblem needs ${kind}`);
}
assert(!squareElements.some(e=>e.dimensionId||e.kind==='residual'||e.type==='text'&&/^[-+]?\d/.test(e.value)),
  'The completed square has no dimension numbers or unresolved residuals');
const squareSvg=fs.readFileSync(new URL('../examples/demos/emblem.svg',import.meta.url),'utf8');
assert(squareSvg.includes('<metadata id="native-emblem"><![CDATA['+nativeEmblemSvg()+']]></metadata>'),
  'Preserve the original native export independently of the visible annotations');
assert.equal(squareSvg.replace(/<metadata id="native-emblem"><!\[CDATA\[[\s\S]*?\]\]><\/metadata>\r?\n/,'').replaceAll('\r\n','\n'),svg(square),'Square SVG is stale');
const squarePng=fs.readFileSync(new URL('../examples/demos/emblem.png',import.meta.url));
assert.equal(squarePng.readUInt32BE(16),600);assert.equal(squarePng.readUInt32BE(20),600);
console.log(`Emblem storyboard valid: ${model.openings.length} native openings at ${model.pitch} mm, ${model.threads.length} thread segments, ${scene.frames.length} frames, ${book.duration} seconds. Half-pitch branching, crown symmetry, fixed landmarks, lettering redistribution, thread-only finish, coordinates, camera, annotations and GIF timing checked.`);
console.log('Square emblem valid: all openings, threads and virtual slits retained; guides, blue adjustments, red angles and feature notation present; dimension numbers omitted.');
