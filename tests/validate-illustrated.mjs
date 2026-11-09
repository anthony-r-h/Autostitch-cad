// Inspect the emitted figures and GIF structure against their geometric claims.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { selectFit } from './fit-oracle.mjs';
import { createScenes, gifBlocks, displayElements, pitchComparisonMetrics } from '../examples/illustrated/scenes.mjs';

const root = new URL('../', import.meta.url);
const catalog = JSON.parse(fs.readFileSync(new URL('tests/cases.json', root), 'utf8'));
const scenes = createScenes();
const near = (a,b,tolerance=1e-6) => assert(Math.abs(a-b)<tolerance,`${a} != ${b}`);
const dist = (a,b) => Math.hypot(a[0]-b[0],a[1]-b[1]);
const alpha = 40*Math.PI/180;
function readSvg(name) {
  const source=fs.readFileSync(new URL(`examples/illustrated/assets/${name}.svg`,root),'utf8');
  const elements=[...source.matchAll(/<(line|circle)\s+([^>]+)\/>/g)].map(match=>({type:match[1],...Object.fromEntries(
    [...match[2].matchAll(/([\w-]+)="([^"]*)"/g)].map(a=>[a[1],a[2]])
  )}));
  return {source,elements};
}
function slits(name,view,kind='slit') {
  return readSvg(name).elements.filter(e=>e.class===kind).map(e=>{
    const a=[(+e.x1-view.x)/view.scale,(view.y-e.y1)/view.scale];
    const b=[(+e.x2-view.x)/view.scale,(view.y-e.y2)/view.scale];
    near(dist(a,b),1.5);
    return {a,b,center:[(a[0]+b[0])/2,(a[1]+b[1])/2],angle:Math.atan2(b[1]-a[1],b[0]-a[0]),element:e};
  });
}
function circle(name,view) {
  const holes=readSvg(name).elements.filter(e=>e.class==='hole');assert.equal(holes.length,1);
  near(2*holes[0].r/view.scale,.5);
  return [(holes[0].cx-view.x)/view.scale,(view.y-holes[0].cy)/view.scale];
}
const has=(points,p)=>points.some(point=>dist(point,p)<1e-6);
const bounded=gaps=>assert(gaps.every(g=>g>=2.7-1e-6&&g<=3.3+1e-6));

const fit=selectFit({D:15.3,p:3}),view={x:(600-15.3*28)/2,y:187.5,scale:28};
for(const asset of catalog.illustrations.find(i=>i.id==='ILL-S02').assets) {
  const name=asset.path.split('/').at(-1);
  if(asset.policy==='unresolved') {
    const nominal=slits(name,view).map(s=>s.center);
    assert.equal(nominal.length,6);near(nominal.at(-1)[0],15);near(15.3-nominal.at(-1)[0],.3);continue;
  }
  const holes=slits(name,view);assert.equal(holes.length,6);
  holes.forEach(s=>{near(s.center[1],0);near(s.angle,alpha);});
  const points=holes.map(s=>s.center[0]);near(points[0],0);near(points.at(-1),15.3);
  const gaps=points.slice(1).map((p,i)=>p-points[i]);bounded(gaps);
  const changed=gaps.map((gap,i)=>({gap,i})).filter(g=>Math.abs(g.gap-3)>1e-6);
  assert.equal(changed.length,asset.changedGaps);assert.equal(changed[0].i,asset.firstChangedGap);
  changed.forEach(g=>near(g.gap,asset.adjustedPitch));
  assert.equal(readSvg(name).elements.filter(e=>e.class==='adjustment-mark').length,(changed.length+1)*2);
  if(asset.policy==='central'){assert.equal(changed.length,fit.k);assert.equal(changed[0].i,fit.i);near(changed[0].gap,fit.correctedPitch);}
}

for(const s of scenes.filter(s=>s.name.startsWith('pitch-'))) {
  if(s.name!=='pitch-problem') {
    assert.deepEqual(s.frames[0].elements,scenes.find(s=>s.name==='pitch-problem').frames.find(f=>f.stage==='result').elements,'Solutions must continue from the identified residual');
    assert.equal(s.frames[1].stage,'planning-revision');
    assert.deepEqual(s.frames.at(-1).elements,s.frames[0].elements);
  }
  const guide=s.final.filter(e=>e.kind==='guide');
  assert.equal(guide.length,1);near((guide[0].a[0]+guide[0].b[0])/2,300);
  let previousResidual=.3;
  for(const f of s.frames) {
    assert.deepEqual(f.elements.filter(e=>e.kind==='guide'),guide);
    assert(!f.elements.some(e=>e.kind==='proposal'));
    const slits=f.elements.filter(e=>e.kind==='slit');assert(slits.every(e=>!e.dash));
    const points=slits.map(e=>((e.a[0]+e.b[0])/2-view.x)/view.scale);
    const labels=f.elements.filter(e=>e.kind==='gap-value');
    assert.equal(labels.length,Math.max(0,points.length-1));
    labels.forEach((label,i)=>near(+label.value,points[i+1]-points[i],.00501));
    if(points.length===6) {
      const remaining=15.3-points.at(-1),label=f.elements.find(e=>e.kind==='residual-value');
      near(+label.value,remaining,.00501);
      assert.equal(label.bold,false);assert.equal(label.size,labels[0].size);
      assert.equal(label.color,'#C62828');assert(/^\d+\.\d{2}$/.test(label.value));
      const indicator=f.elements.filter(e=>e.kind==='residual-dimension');assert.equal(indicator.length,1);
      assert.equal(indicator[0].color,'#C62828');near(indicator[0].a[1],view.y);near(indicator[0].b[1],view.y);
      near(dist(indicator[0].a,indicator[0].b)/view.scale,remaining);
      assert(!f.elements.some(e=>e.kind==='residual-extension'));
      near(points.slice(1).reduce((sum,p,i)=>sum+p-points[i],0)+remaining,15.3);
      if(f.stage==='planning-revision') {
        assert(remaining<=previousResidual+1e-9);previousResidual=remaining;
      }
    }
  }
  const residual=s.final.find(e=>e.kind==='residual-value');
  near(+residual.value,s.name==='pitch-problem'?.3:0);
  if(s.name!=='pitch-problem')assert.equal(s.frames.filter(f=>f.stage==='planning-revision').length,30);
}

const curve=slits('axiom-curve',{x:160,y:75,scale:23});
const curveInput=catalog.illustrations.find(i=>i.id==='ILL-CURVE').inputs;
assert.equal(curve.length,curveInput.nominalGaps+1);
for(const s of curve) {
  near(Math.hypot(s.center[0],s.center[1]+10),10);
  const tangent=Math.atan2(s.center[1]+10,s.center[0])-Math.PI/2;
  near(s.angle,tangent+alpha);
}
const chords=curve.slice(1).map((s,i)=>dist(s.center,curve[i].center));bounded(chords);
chords.forEach(g=>near(g,3));
near(curve[0].center[0],0);
const curveScene=scenes.find(s=>s.name==='axiom-curve'),curveGuides=curveScene.final.filter(e=>e.kind==='guide');
const curveScreen=e=>[(e.a[0]+e.b[0])/2,(e.a[1]+e.b[1])/2];
const curveOpenings=curveScene.final.filter(e=>e.kind==='slit');
near(dist(curveGuides[0].a,curveScreen(curveOpenings[0])),0);
near(dist(curveGuides.at(-1).b,curveScreen(curveOpenings.at(-1))),0);
assert(!curveScene.final.some(e=>e.kind==='adjustment-mark'));
for(const f of curveScene.frames) {
  const label=f.elements.find(e=>e.kind==='tangent-label');
  assert.equal(Boolean(label),f.stage==='local-tangent');
  if(!label)continue;
  assert.equal(label.value,'Local tangent');
  const tangent=f.elements.find(e=>e.kind==='tangent'),centre=curveScreen(f.elements.find(e=>e.kind==='proposal'));
  const radial=[centre[0]-160,centre[1]-305],vector=[tangent.b[0]-tangent.a[0],tangent.b[1]-tangent.a[1]];
  near(radial[0]*vector[0]+radial[1]*vector[1],0,1e-7);
}

const landmarkInput=catalog.illustrations.find(i=>i.id==='ILL-LANDMARK').inputs;
const landmarkView={x:(600-landmarkInput.length*16)/2,y:187.5,scale:16};
const leftFixed=landmarkInput.landmark-1.5,rightFixed=landmarkInput.landmark+1.5;
const landmark=slits('axiom-landmark',landmarkView).map(s=>s.center).sort((a,b)=>a[0]-b[0]);
assert.equal(landmark.length,10);assert(has(landmark,[leftFixed,0])&&has(landmark,[rightFixed,0]));
assert(!has(landmark,[landmarkInput.landmark,0]));near((leftFixed+rightFixed)/2,landmarkInput.landmark);
bounded(landmark.slice(1).map((p,i)=>dist(p,landmark[i])));
for(const frame of scenes.find(s=>s.name==='axiom-landmark').frames.filter(f=>!['reference','reset'].includes(f.stage))) {
  const xs=frame.elements.filter(e=>e.kind==='slit').map(e=>(e.a[0]+e.b[0])/2);
  for(const station of [0,leftFixed,rightFixed,landmarkInput.length])assert(xs.some(x=>Math.abs(x-(landmarkView.x+station*16))<1e-6),'Fixed opening moved during fitting');
  if(xs.length===10) {
    const points=xs.map(x=>(x-landmarkView.x)/16).sort((a,b)=>a-b),gaps=points.slice(1).map((p,i)=>p-points[i]);
    bounded(gaps);near(gaps[4],3);
    const labels=frame.elements.filter(e=>e.kind==='gap-value');
    const adjustable=gaps.filter((g,i)=>i!==4);assert.equal(labels.length,adjustable.length);
    labels.forEach((label,i)=>near(+label.value,adjustable[i],.00501));
    near(gaps.slice(0,4).reduce((a,b)=>a+b,0),leftFixed);
    near(gaps.slice(5).reduce((a,b)=>a+b,0),landmarkInput.length-rightFixed);
    points.forEach((x,i)=>near(x+points.at(-1-i),landmarkInput.length));
  }
}
const landmarkFrames=scenes.find(s=>s.name==='axiom-landmark').frames;
assert.equal(landmarkFrames.filter(f=>f.stage==='distribute-within-spans').length,30);
for(const [start,end] of [[0,leftFixed],[rightFixed,landmarkInput.length]]) {
  const points=landmark.map(p=>p[0]).filter(x=>x>=start-1e-6&&x<=end+1e-6);
  const adjusted=points.slice(1).map((x,i)=>({a:points[i],b:x})).filter(g=>Math.abs(g.b-g.a-3)>1e-6);
  assert.equal(adjusted.length,2);adjusted.forEach(g=>near(g.b-g.a,3.25));
  near((adjusted[0].a+adjusted.at(-1).b)/2,(start+end)/2);
}

const cornerView={x:370,y:105,scale:24};
const virtuals=slits('axiom-corner',cornerView,'virtual');assert.equal(virtuals.length,2);
const J=circle('axiom-corner',cornerView);
near(dist(virtuals[0].a,J),0);near(dist(virtuals[1].b,J),0);
assert(virtuals.every(s=>s.element['stroke-dasharray']));
const corner=slits('axiom-corner',cornerView).map(s=>s.center);assert.equal(corner.length,6);
for(let i=1;i<=3;i++) {
  assert(has(corner,[virtuals[0].center[0]-3*i,0]));
  assert(has(corner,[0,virtuals[1].center[1]-3*i]));
}
for(const name of ['axiom-corner','corner-arc-line','corner-arc-arc']) {
  const s=scenes.find(s=>s.name===name),guides=s.final.filter(e=>e.kind==='guide'),real=s.final.filter(e=>e.kind==='slit');
  assert(!s.final.some(e=>e.kind==='adjustment-mark'));
  const centres=real.map(e=>[(e.a[0]+e.b[0])/2,(e.a[1]+e.b[1])/2]);
  for(const endpoint of [guides[0].a,guides.at(-1).b])assert(centres.some(c=>dist(c,endpoint)<1e-6));
}

const smooth=slits('axiom-smooth',{x:370,y:115,scale:16});
assert.equal(smooth.length,12);assert.equal(smooth.filter(s=>dist(s.center,[0,0])<1e-6).length,1);
assert.equal(readSvg('axiom-smooth').elements.filter(e=>e.class==='hole').length,0);
const straight=smooth.filter(s=>Math.abs(s.center[1])<1e-6).sort((a,b)=>a.center[0]-b.center[0]);
straight.slice(1).forEach((s,i)=>near(dist(s.center,straight[i].center),3));
const curved=smooth.filter(s=>s.center[1]<-1e-6).sort((a,b)=>b.center[1]-a.center[1]);
let previous=[0,0];for(const s of curved){near(dist(previous,s.center),3);previous=s.center;}

const junctionView={x:300,y:145,scale:23},junction=circle('axiom-junction',junctionView);
near(dist(junction,[0,0]),0);
const arms=slits('axiom-junction',junctionView).map(s=>s.center);assert.equal(arms.length,8);
for(const p of [[-3,0],[3,0],[0,-3]])assert(has(arms,p));
assert(!has(arms,junction));
const branchScene=scenes.find(s=>s.name==='axiom-junction');
const branchLabel=branchScene.final.filter(e=>e.kind==='notation-junction');
assert.equal(branchLabel.length,1);
let branchReal=[];
const branchDistances=[Infinity,Infinity,Infinity],branchCounts=[0,0,0];
for(const f of branchScene.frames) {
  assert.deepEqual(f.elements.filter(e=>e.kind==='notation-junction'),branchLabel);
  if(f.stage==='reset')continue;
  const real=f.elements.filter(e=>e.kind==='slit'),arm=f.stage.match(/^arm-(\d)-stitch$/);
  assert.deepEqual(real.slice(0,branchReal.length),branchReal);
  if(arm) {
    const index=+arm[1];assert.equal(real.length,branchReal.length+1);
    const slit=real.at(-1),center=[(slit.a[0]+slit.b[0])/2,(slit.a[1]+slit.b[1])/2];
    const distance=dist(center,[junctionView.x,junctionView.y]);
    assert(distance<branchDistances[index],'Branch stitching must approach the junction');
    branchDistances[index]=distance;branchCounts[index]++;
  }
  assert.equal(f.elements.filter(e=>e.kind==='hole').length,['shared-hole','result','thread-fade','thread-reveal'].includes(f.stage)?1:0);
  branchReal=real;
}
assert.deepEqual(branchCounts,[3,3,2]);
branchDistances.forEach(d=>near(d/junctionView.scale,3));

const clearanceView={x:75,y:200,scale:35};
const clearance=slits('axiom-clearance',clearanceView);assert.equal(clearance.length,8);
const clearanceInput=catalog.illustrations.find(i=>i.id==='ILL-CLEARANCE').inputs;
for(const s of clearance){near(+s.element['stroke-width']/35,.3);assert.equal(s.element['stroke-linecap'],'round');}
// Independently measure finite axes from the exported SVG, including intersections.
function pointSegmentDistance(p,a,b) {
  const d=[b[0]-a[0],b[1]-a[1]],t=Math.max(0,Math.min(1,((p[0]-a[0])*d[0]+(p[1]-a[1])*d[1])/(d[0]**2+d[1]**2)));
  return dist(p,[a[0]+t*d[0],a[1]+t*d[1]]);
}
function segmentDistance(a,b,c,d) {
  const cross=(p,q,r)=>(q[0]-p[0])*(r[1]-p[1])-(q[1]-p[1])*(r[0]-p[0]);
  if(cross(a,b,c)*cross(a,b,d)<0&&cross(c,d,a)*cross(c,d,b)<0)return 0;
  return Math.min(pointSegmentDistance(a,c,d),pointSegmentDistance(b,c,d),pointSegmentDistance(c,a,b),pointSegmentDistance(d,a,b));
}
const clearanceRows=[clearance.filter(s=>s.center[1]>0),clearance.filter(s=>s.center[1]<0)].map(row=>row.sort((a,b)=>a.center[0]-b.center[0]));
const halfAngle=clearanceInput.includedDegrees*Math.PI/360;
for(const [i,row] of clearanceRows.entries())for(const [n,s] of row.entries()) {
  near(s.center[1]/s.center[0],Math.tan(i===0?halfAngle:-halfAngle));
  near(s.angle,alpha+(i===0?halfAngle:-halfAngle));
  if(n)near(dist(s.center,row[n-1].center),3);
}
const edgeClearances=clearanceRows[0].map(a=>Math.min(...clearanceRows[1].map(b=>segmentDistance(a.a,a.b,b.a,b.b)))-clearanceInput.width);
edgeClearances.forEach((gap,i)=>near(gap,clearanceInput.edgeClearances[i]));
assert(edgeClearances[0]<0);assert(edgeClearances[1]>0&&edgeClearances[1]<clearanceInput.margin);
assert(edgeClearances.slice(2).every(g=>g>clearanceInput.margin));
const clearanceSvg=readSvg('axiom-clearance');
assert.equal(clearanceSvg.elements.filter(e=>e.class==='rejected').length,4);
assert.equal(clearanceSvg.elements.filter(e=>e.class==='accepted').length,4);
const clearanceVirtuals=slits('axiom-clearance',clearanceView,'virtual'),clearanceJoint=circle('axiom-clearance',clearanceView);
clearanceVirtuals.forEach((v,i)=>{near(dist(v.b,clearanceJoint),0);near(dist(v.center,clearanceRows[i][0].center),3);});
const clearanceScene=scenes.find(s=>s.name==='axiom-clearance');
let fixedSlits=[];
for(const frame of clearanceScene.frames) {
  assert.deepEqual(frame.elements.filter(e=>e.kind==='notation-junction'),clearanceScene.final.filter(e=>e.kind==='notation-junction'));
  const firstSlit=frame.elements.findIndex(e=>e.kind==='slit');
  if(firstSlit>=0)assert(frame.elements.slice(firstSlit).every(e=>!['guide','clearance-envelope'].includes(e.kind)), 'Construction must not obscure a physical overlap');
  if(frame.stage==='reset')continue;
  const current=frame.elements.filter(e=>e.kind==='slit');assert.deepEqual(current.slice(0,fixedSlits.length),fixedSlits);fixedSlits=current;
}
assert.deepEqual(clearanceScene.frames.filter(f=>['clearance-pass','clearance-fail'].includes(f.stage)).map(f=>f.stage),['clearance-pass','clearance-pass','clearance-fail','clearance-fail']);

assert.equal(selectFit({D:7,p:3}),null);
const rejected=slits('fit-rejected',{x:160,y:190,scale:40});
assert.equal(rejected.length,2);near(dist(rejected[0].center,rejected[1].center),7);
assert.equal(readSvg('fit-rejected').elements.filter(e=>e.class==='rejected').length,2);
const candidates=scenes.find(s=>s.name==='fit-rejected').frames.filter(f=>f.stage==='candidate');
assert.deepEqual(candidates.map(f=>f.elements.filter(e=>e.kind==='proposal').length),[1,2]);
assert(7/2>3.3&&7/3<2.7);

const closure=slits('axiom-closure',{x:300,y:187.5,scale:13});
assert.equal(closure.length,20);
for(const [i,s] of closure.entries()) {
  near(dist(s.center,closure[(i+1)%20].center),3);
  near(Math.hypot(...s.center),3/(2*Math.sin(Math.PI/20)));
}
assert.equal(new Set(closure.map(s=>s.center.map(x=>x.toFixed(6)).join(','))).size,20);

const matched=readSvg('matched-guides').elements.filter(e=>e.class==='slit');
assert.equal(matched.length,22);
for(let i=0;i<11;i++) {
  const a=matched[i],b=matched[i+11];
  for(const end of ['1','2']) {near(+a['x'+end]+ +b['x'+end],600);near(+b['y'+end]- +a['y'+end],145);}
}
assert.equal(readSvg('matched-guides').elements.filter(e=>e.class==='adjustment-mark').length,12);

for(const [caseId,name] of [['A03','corner-arc-line'],['A04','corner-arc-arc'],['J08','corner-shallow']]) {
  const v=catalog.geometry.find(c=>c.id===caseId).variants.find(v=>v.pitch===3);
  const view=caseId==='J08'?{x:320,y:190,scale:21}:{x:365,y:90,scale:27};
  const J=circle(name,view),virtuals=slits(name,view,'virtual'),real=slits(name,view);
  near(dist(virtuals[0].a,J),0);near(dist(virtuals[1].b,J),0);
  const groups=[[],[]];
  for(const slit of real) {
    const onArm=v.route.primitives.findIndex(g=>{
      if(g.kind==='arc'){
        const theta=Math.atan2(slit.center[1]-g.center[1],slit.center[0]-g.center[0]);
        const expected=theta+Math.sign(g.sweep)*Math.PI/2+alpha;
        const advance=Math.sign(g.sweep)*Math.atan2(Math.sin(theta-g['start-angle']),Math.cos(theta-g['start-angle']));
        return Math.abs(dist(slit.center,g.center)-g.radius)<1e-6&&Math.abs(Math.sin(slit.angle-expected))<1e-6&&advance>=-1e-6&&advance<=Math.abs(g.sweep)+1e-6;
      }
      const d=[g.b[0]-g.a[0],g.b[1]-g.a[1]],q=[slit.center[0]-g.a[0],slit.center[1]-g.a[1]];
      const station=(d[0]*q[0]+d[1]*q[1])/Math.hypot(...d);
      return Math.abs(d[0]*q[1]-d[1]*q[0])/Math.hypot(...d)<1e-6&&Math.abs(Math.sin(slit.angle-Math.atan2(d[1],d[0])-alpha))<1e-6&&station>=-1e-6&&station<=Math.hypot(...d)+1e-6;
    });
    assert(onArm>=0,`${name} slit left its arm`);groups[onArm].push(slit.center);
  }
  assert(groups.every(group=>group.length>=2));
  for(let i=0;i<2;i++) {
    groups[i].sort((a,b)=>dist(a,virtuals[i].center)-dist(b,virtuals[i].center));
    const step=dist(groups[i][0],virtuals[i].center);bounded([step]);
    if(caseId==='J08')near(step,v.expected.cornerSteps[i]);else near(step,3);
    for(let j=1;j<groups[i].length;j++)near(dist(groups[i][j-1],groups[i][j]),3);
  }
  if(caseId==='J08'){near(dist(J,v.expected.hole),0);assert.equal(readSvg(name).elements.filter(e=>e.class==='adjustment-mark').length,2);}
}

// Corner explanations must arrive through the real row before its virtual slit.
for(const name of ['axiom-corner','corner-arc-line','corner-arc-arc','corner-shallow']) {
  const s=scenes.find(s=>s.name===name),virtuals=s.final.filter(e=>e.kind==='virtual');
  const junctionLabel=s.final.filter(e=>e.kind==='notation-junction');
  assert.equal(junctionLabel.length,1);
  for(const f of s.frames)assert.deepEqual(f.elements.filter(e=>e.kind==='notation-junction'),junctionLabel,`${name}: junction notation must be visible from the start`);
  const center=e=>[(e.a[0]+e.b[0])/2,(e.a[1]+e.b[1])/2];
  let previousReal=[],previousVirtual=[];
  const lastDistance=[Infinity,Infinity];
  for(const f of s.frames.filter(f=>f.stage!=='reset')) {
    const real=f.elements.filter(e=>e.kind==='slit'),virtual=f.elements.filter(e=>e.kind==='virtual');
    assert.deepEqual(real.slice(0,previousReal.length),previousReal,`${name}: an established slit moved`);
    assert.deepEqual(virtual.slice(0,previousVirtual.length),previousVirtual,`${name}: a virtual slit slid into place`);
    const arm=f.stage.match(/^arm-(\d)-stitch$/);
    if(arm) {
      const i=+arm[1];assert.equal(real.length,previousReal.length+1);
      assert.equal(virtual.length,i,'The arm must precede its terminal virtual slit');
      const distance=dist(center(real.at(-1)),center(virtuals[i]));
      assert(distance<lastDistance[i],`${name}: stitching must approach the virtual slit`);
      lastDistance[i]=distance;
    }
    const terminal=f.stage.match(/^arm-(\d)-terminal$/);
    if(terminal) {
      const i=+terminal[1];assert(Number.isFinite(lastDistance[i]));
      assert.equal(virtual.length,i+1);assert.deepEqual(real,previousReal);
      assert.deepEqual(virtual.at(-1),virtuals[i]);
    }
    if(!['shared-hole','result','thread-fade','thread-reveal'].includes(f.stage))assert(!f.elements.some(e=>e.kind==='hole'),'The shared hole appears only after both arms arrive');
    previousReal=real;previousVirtual=virtual;
  }
}

// Glossary labels must describe the existing constructions without changing them.
for(const [name,original,kinds] of [
  ['terms-junction','axiom-junction',['slit','hole']]
])for(const kind of kinds) {
  const geometry=e=>Object.fromEntries(Object.entries(e).filter(([key])=>!['fill','stroke'].includes(key)));
  assert.deepEqual(readSvg(name).elements.filter(e=>e.class===kind).map(geometry),readSvg(original).elements.filter(e=>e.class===kind).map(geometry));
}
const glossaryLayout=slits('terms-layout',{x:60,y:187.5,scale:16}).map(s=>s.center[0]).sort((a,b)=>a-b);
const originalF02=[0,3,6,8.75,11.75,14.75,17.75,20.75,23.75,27,30];
assert.equal(glossaryLayout.length,originalF02.length);glossaryLayout.forEach((x,i)=>near(x,originalF02[i]));
const termJunction=scenes.find(s=>s.name==='terms-junction');
assert.equal(termJunction.final.filter(e=>e.type==='text'&&e.value==='Arm').length,3);
const slitDetail=readSvg('terms-slit').elements;
const profile=slits('terms-slit',{x:270,y:200,scale:110},'slit-profile')[0];
near(profile.angle,alpha);near(+profile.element['stroke-width']/110,.15);
const slitAxis=slitDetail.find(e=>e.class==='slit-axis');
for(const key of ['x1','y1','x2','y2'])near(+slitAxis[key],+profile.element[key]);
const width=slitDetail.find(e=>e.class==='width-dimension');
near(Math.hypot(width.x2-width.x1,width.y2-width.y1)/110,.15);
const lean=slitDetail.filter(e=>e.class==='lean-angle');assert.equal(lean.length,20);
for(const [i,e] of lean.entries())for(const end of [1,2]) {
  const theta=alpha*(i+end-1)/20;
  near((+e['x'+end]-270)/110,.43*Math.cos(theta));
  near((200- +e['y'+end])/110,.43*Math.sin(theta));
}

const chordView={x:300,y:380,scale:80};
const chordSlits=slits('terms-chord',chordView);
assert.equal(chordSlits.length,2);
for(const slit of chordSlits) {
  near(Math.hypot(...slit.center),3);
  near(slit.angle,Math.atan2(slit.center[1],slit.center[0])-Math.PI/2+alpha);
}
near(dist(chordSlits[0].center,chordSlits[1].center),3);
const chordElements=readSvg('terms-chord').elements;
const chord=chordElements.find(e=>e.class==='chord');
for(const [i,end] of [1,2].entries()) {
  near((+chord['x'+end]-chordView.x)/chordView.scale,chordSlits[i].center[0]);
  near((chordView.y- +chord['y'+end])/chordView.scale,chordSlits[i].center[1]);
}
const measuredArc=chordElements.filter(e=>e.class==='measured-arc');
assert.equal(measuredArc.length,40);
const arcLength=measuredArc.reduce((sum,e)=>sum+Math.hypot(e.x2-e.x1,e.y2-e.y1)/80,0);
near(arcLength,Math.PI,1e-4);assert(arcLength>3);

const cornerInput=catalog.illustrations.find(i=>i.id==='ILL-CORNER-PROBLEM').inputs;
const count=cornerInput.armIntervals;
const cornerShifts=[.75*(Math.cos(alpha)+Math.sin(alpha)),.75*(Math.cos(alpha)-Math.sin(alpha))];
const armLengths=cornerShifts.map(c=>count*3-c/2);
const problemView={x:410,y:40,scale:285/armLengths[0]};
for(const treatment of ['vertex-point','bridge']) {
  const name=`problem-corner-${treatment}`,openings=slits(name,problemView);
  assert.equal(openings.length,2*count);
  for(const arm of [0,1]) {
    const row=openings.slice(arm*count,(arm+1)*count);
    near(dist(row[0].center,arm===0?[-armLengths[0],0]:[0,-armLengths[1]]),0);
    const last=armLengths[arm]-3*(count-1);
    near(dist(row.at(-1).center,arm===0?[-last,0]:[0,-last]),0);
    const gaps=row.slice(1).map((e,i)=>dist(e.center,row[i].center));bounded(gaps);
    const changed=gaps.filter(g=>Math.abs(g-3)>1e-6);
    assert.equal(changed.length,0);
  }
  const vertexSlits=openings.filter(s=>dist(s.center,[0,0])<1e-6);
  assert.equal(vertexSlits.length,0);
  if(treatment==='vertex-point') {
    const virtuals=slits(name,problemView,'virtual');assert.equal(virtuals.length,2);
    virtuals.forEach((v,arm)=>{
      near(dist(v.center,arm===0?[cornerShifts[arm]/2,0]:[0,cornerShifts[arm]/2]),0);
      near(dist(v.center,openings[(arm+1)*count-1].center),3);
      assert(v.element['stroke-dasharray']);
    });
    near(Math.abs(virtuals[0].angle-virtuals[1].angle),Math.PI/2);
    near(dist(circle(name,problemView),[0,0]),0);
    assert.equal(scenes.find(s=>s.name===name).frames.length,0);
  }
  else assert.equal(readSvg(name).elements.filter(e=>e.class==='hole').length,0);
  if(treatment==='bridge') {
    const incoming=openings[count-1],outgoing=openings[2*count-1];
    assert(readSvg(name).elements.filter(e=>e.class==='thread').some(e=>
      dist([(+e.x1-problemView.x)/problemView.scale,(problemView.y-e.y1)/problemView.scale],incoming.b)<1e-6&&dist([(+e.x2-problemView.x)/problemView.scale,(problemView.y-e.y2)/problemView.scale],outgoing.a)<1e-6));
  }
}

const cornerSolution=scenes.find(s=>s.name==='problem-corner-autostitch');
const mirroredCorner=scenes.find(s=>s.name==='problem-corner-mirrored');
const mirroredSlits=slits(mirroredCorner.name,problemView);
assert.equal(mirroredSlits.length,2*count+1);
assert.equal(mirroredCorner.frames[0].stage,'top-row');
assert.equal(mirroredCorner.frames[0].elements.filter(e=>e.kind==='slit').length,count);
assert.equal(mirroredCorner.frames.filter(f=>f.stage==='mirror-vertical').length,30);
for(const [i,e] of mirroredSlits.entries()) {
  near(e.angle,(i<count?-40:i<2*count?-50:-45)*Math.PI/180);
  if(i<2*count) {
    const arm=Math.floor(i/count),station=armLengths[arm]-3*(i%count);
    near(dist(e.center,arm===0?[-station,0]:[0,-station]),0);
  }
  else near(dist(e.center,[0,0]),0);
}
assert.equal(mirroredCorner.final.filter(e=>e.kind==='gap-value').length,2*count);
for(const arm of [0,1]) {
  const row=mirroredSlits.slice(arm*count,(arm+1)*count);
  row.slice(1).forEach((e,i)=>near(dist(row[i].center,e.center),3));
  near(dist(row.at(-1).center,[0,0]),3-cornerShifts[arm]/2);
}
assert(!mirroredCorner.final.some(e=>['hole','virtual'].includes(e.kind)));
const crossing=scenes.find(s=>s.name==='problem-corner-vertex-point');
const constructionOnly=elements=>elements.filter(e=>!['thread','thread-angle','thread-angle-value','angle-reference','angle-wedge','angle-leader','thread-length-value','thread-length-dimension'].includes(e.kind));
assert.deepEqual(cornerSolution.frames[0].elements,constructionOnly(crossing.final));
assert.deepEqual(cornerSolution.frames.at(-1).elements,cornerSolution.frames[0].elements);
const solvedSlits=slits(cornerSolution.name,problemView),solvedVirtuals=slits(cornerSolution.name,problemView,'virtual'),solvedHole=circle(cornerSolution.name,problemView);
assert.equal(solvedSlits.length,2*count);assert.equal(solvedVirtuals.length,2);
near(dist(solvedVirtuals[0].a,solvedHole),0);near(dist(solvedVirtuals[1].b,solvedHole),0);
const rows=[solvedSlits.slice(0,count),solvedSlits.slice(count)];
for(const [a,row] of rows.entries()) {
  near(dist(row[0].center,a===0?[-armLengths[0],0]:[0,-armLengths[1]]),0);
  near(dist(row.at(-1).center,solvedVirtuals[a].center),3);
  row.forEach(s=>{near(s.center[a===0?1:0],0);near(s.angle,a===0?alpha:alpha-Math.PI/2);});
  const gaps=row.slice(1).map((s,i)=>dist(s.center,row[i].center));bounded(gaps);
  const changed=gaps.map((gap,i)=>({gap,i})).filter(g=>Math.abs(g.gap-3)>1e-6);
  assert.equal(changed.length,a===0?2:1);
  assert.equal(changed[0].i,3);
  near(changed.reduce((sum,g)=>sum+g.gap-3,0),cornerShifts[a]/2);
}
for(const [i,a] of solvedSlits.entries()) {
  assert(pointSegmentDistance(solvedHole,a.a,a.b)-.25-.15>=.2);
  for(const b of solvedSlits.slice(i+1))assert(segmentDistance(a.a,a.b,b.a,b.b)-.3>=.2);
}
const centre=e=>[(e.a[0]+e.b[0])/2,(e.a[1]+e.b[1])/2];
for(const f of cornerSolution.frames) {
  assert.deepEqual(f.elements.filter(e=>e.kind==='guide'),crossing.final.filter(e=>e.kind==='guide'));
  const real=f.elements.filter(e=>e.kind==='slit'),virtual=f.elements.filter(e=>e.kind==='virtual');
  assert.equal(real.length,2*count);assert.equal(virtual.length,2);
  for(const a of [0,1]) {
    near(dist(centre(real[a*count]),a===0?[125,40]:[410,40+armLengths[1]*problemView.scale]),0);
    near(dist(centre(real[a*count+count-1]),centre(virtual[a]))/problemView.scale,3);
  }
  if(['shared-hole','distribute-within-arms','result','thread-fade','thread-reveal'].includes(f.stage)) {
    assert.deepEqual(virtual,cornerSolution.final.filter(e=>e.kind==='virtual'));
    assert.deepEqual(f.elements.filter(e=>e.kind==='hole'),cornerSolution.final.filter(e=>e.kind==='hole'));
    for(const i of [count-1,2*count-1])near(dist(centre(real[i]),centre(cornerSolution.final.filter(e=>e.kind==='slit')[i])),0);
  }
  const values=f.elements.filter(e=>e.kind==='gap-value');
  if(values.length) {
    const initial=['crossing','reset'].includes(f.stage);
    const gapsPerArm=initial?count:count-1;
    assert.equal(values.length,2*gapsPerArm);
    values.forEach((e,i)=>{
      const arm=Math.floor(i/gapsPerArm),gap=i%gapsPerArm,k=arm*count+gap;
      const next=gap===count-1?[problemView.x,problemView.y]:centre(real[k+1]);
      near(+e.value,dist(centre(real[k]),next)/problemView.scale,.00501);
    });
  }
}

const pitchDoc=fs.readFileSync(new URL('docs/PITCH_skeleton.md',root),'utf8');
const comparisonRows=pitchDoc.split('\n').filter(line=>/^\| (Even spacing|End adjustment|Autostitch|Vertex point|Bridge|Shared diagonal slit)/.test(line));
const comparisons=scenes.filter(s=>(s.name.startsWith('pitch-')&&s.name!=='pitch-problem')||s.name.startsWith('problem-corner-'));
for(const s of comparisons.filter(s=>s.name.startsWith('problem-corner-'))) {
  const threads=s.final.filter(e=>e.kind==='thread');
  const adjacent=[threads[count-1],threads[s.name==='problem-corner-bridge'?count-1:count]];
  const expected=adjacent.map((e,arm)=>{
    const dx=e.b[0]-e.a[0],dy=e.b[1]-e.a[1];
    return (Math.acos((arm===0?dx:dy)/Math.hypot(dx,dy))*180/Math.PI).toFixed(1)+'\u00b0';
  });
  const labels=s.final.filter(e=>e.kind==='thread-angle-value');
  assert.deepEqual(labels.map(e=>e.value),expected);
  for(const e of labels){assert.equal(e.size,13);assert.equal(e.color,'#C62828');}
  assert(displayElements(s.final).filter(e=>e.kind==='thread-angle-value').every(e=>e.color==='#C62828'));
  const wedges=s.final.filter(e=>e.kind==='angle-wedge');
  assert.equal(wedges.length,2);
  wedges.forEach(e=>{assert.equal(e.type,'polygon');assert.equal(e.color,'#C62828');assert(e.opacity>0&&e.opacity<1);});
  if(s.name==='problem-corner-bridge') {
    const radii=wedges.map(e=>dist(e.points[0],e.points[1]));
    near(radii[0],24);near(radii[1],12);
  }
  for(const f of s.frames) {
    const annotated=f.elements.some(e=>e.kind==='thread-angle-value');
    assert.equal(annotated,f.elements.some(e=>e.kind==='thread'));
  }
  if(['problem-corner-vertex-point','problem-corner-bridge'].includes(s.name)) {
    assert.equal(s.frames.length,0);
    const expectedThreads=s.name==='problem-corner-bridge'?adjacent.slice(0,1):adjacent;
    const lengths=s.final.filter(e=>e.kind==='thread-length-value');
    assert.deepEqual(lengths.map(e=>e.value),expectedThreads.map(e=>(dist(e.a,e.b)/problemView.scale).toFixed(2)));
    assert(!s.final.some(e=>e.kind==='gap-value'));
    assert(displayElements(s.final).filter(e=>['thread-length-value','thread-length-dimension','slit','hole','virtual'].includes(e.kind)).every(e=>e.color==='#C4C4C4'));
    assert(readSvg(s.name).source.includes('class="thread-length-value"'));
  }
}
const balancedMirror=pitchComparisonMetrics(mirroredCorner),balancedAuto=pitchComparisonMetrics(cornerSolution);
for(const key of ['absoluteAdjustment','absoluteResidual'])near(balancedMirror[key],balancedAuto[key]);
assert.equal(balancedMirror.adjustedGaps,2);
assert.equal(balancedAuto.adjustedGaps,3);
near(balancedAuto.absoluteResidual,cornerShifts.reduce((sum,c)=>sum+c/2,0));
assert.equal(comparisonRows.length,comparisons.length);
for(const [i,s] of comparisons.entries()) {
  const values=Object.values(pitchComparisonMetrics(s)).map(v=>Number(v.toFixed(3)));
  const published=[...comparisonRows[i].matchAll(/\$([\d.]+)/g)].map(m=>Number(m[1]));
  assert.deepEqual(published,values,s.name);
  for(const f of [...s.frames,{elements:s.final}])for(const e of f.elements) {
    if(e.type==='text'&&['gap-value','residual-value'].includes(e.kind)){assert.equal(e.size,13);assert.equal(e.bold,false);}
    if(e.kind==='residual-dimension'){assert.equal(e.color,'#C62828');assert.equal(e.width,3);}
  }
}
const curvedJunction=scenes.find(s=>s.name==='axiom-junction-curved');
const junctionSpec=catalog.illustrations.find(i=>i.id===curvedJunction.source);
const {view:xView,radius:xRadius,nominalIntervals:xIntervals}=junctionSpec.inputs;
const xCentre=e=>e.type==='circle'?[(e.p[0]-xView.x)/xView.scale,(xView.y-e.p[1])/xView.scale]:
  [(e.a[0]+e.b[0]-2*xView.x)/(2*xView.scale),(2*xView.y-e.a[1]-e.b[1])/(2*xView.scale)];
const xPoint=(arm,t)=>{
  const theta=junctionSpec.inputs.directionsDegrees[arm]*Math.PI/180;
  return arm===0?[xRadius*(Math.sin(t)*Math.cos(theta)-(1-Math.cos(t))*Math.sin(theta)),
    xRadius*(Math.sin(t)*Math.sin(theta)+(1-Math.cos(t))*Math.cos(theta))]:[t*Math.cos(theta),t*Math.sin(theta)];
};
const xSlits=curvedJunction.final.filter(e=>e.kind==='slit');
assert.equal(xSlits.length,16);
assert.equal(curvedJunction.final.filter(e=>e.kind==='hole').length,1);
assert.equal(curvedJunction.frames[0].stage,'shared-hole');
assert.equal(curvedJunction.frames[0].elements.filter(e=>e.kind==='slit').length,0);
const reserved=curvedJunction.frames.find(f=>f.stage==='reserved-neighbours').elements.filter(e=>e.kind==='slit');
assert.equal(reserved.length,4);
for(let arm=0;arm<4;arm++) {
  const step=arm===0?2*Math.asin(3/(2*xRadius)):3,length=xIntervals[arm]*step;
  const points=xSlits.slice(arm*4,arm*4+4).map(xCentre);
  near(dist(points[0],xPoint(arm,length)),0);
  near(dist(xCentre(reserved[arm]),xPoint(arm,step)),0);
  const gaps=points.map((point,i)=>dist(point,points[i+1]??[0,0]));
  bounded(gaps);near(gaps.at(-1),3);
  for(const f of curvedJunction.frames) {
    assert.deepEqual(f.elements.filter(e=>e.kind==='guide'),curvedJunction.final.filter(e=>e.kind==='guide'));
    near(dist(xCentre(f.elements.find(e=>e.kind==='hole')),[0,0]),0);
    const real=f.elements.filter(e=>e.kind==='slit');
    if(real.length!==16)continue;
    near(dist(xCentre(real[arm*4]),points[0]),0);
    near(dist(xCentre(real[arm*4+3]),points[3]),0);
    if(arm===0)for(const e of real.slice(0,4))near(dist(xCentre(e),[-xRadius/Math.sqrt(2),xRadius/Math.sqrt(2)]),xRadius);
  }
}
const xWorld=xSlits.map(e=>({a:[(e.a[0]-xView.x)/xView.scale,(xView.y-e.a[1])/xView.scale],b:[(e.b[0]-xView.x)/xView.scale,(xView.y-e.b[1])/xView.scale]}));
for(const [i,e] of xWorld.entries()) {
  assert(pointSegmentDistance([0,0],e.a,e.b)-.25-.15>=.2);
  for(const other of xWorld.slice(i+1))assert(segmentDistance(e.a,e.b,other.a,other.b)-.3>=.2);
}

for(const s of scenes) {
  const entry=catalog.illustrations.find(i=>i.assets.some(a=>a.path.endsWith('/'+s.name)));
  const asset=entry.assets.find(a=>a.path.endsWith('/'+s.name)),animated=asset.animated??entry.animated;
  assert.equal(Boolean(s.frames.length),animated);
  if(animated) {
    const threadFrames=s.frames.filter(f=>f.stage==='thread-reveal'),threadFrame=threadFrames.at(-1);
    assert.equal(threadFrames.length,1);
    threadFrames.forEach(f=>assert.equal(f.delay,400));
    assert(threadFrame,`${s.name} missing final thread reveal`);assert.equal(threadFrame.delay,400);
    assert.equal(s.frames.at(-2),threadFrame);assert.equal(s.frames.at(-1).stage,'reset');
    assert.deepEqual(threadFrame.elements,s.final);
    const fade=s.frames.filter(f=>f.stage==='thread-fade');assert.equal(fade.length,5*threadFrames.length);
    assert.equal(fade.reduce((sum,f)=>sum+f.delay,0),30*threadFrames.length);
    fade.forEach((f,i)=>{
      assert.equal(f.holeLightening,(i%5+1)/5);assert.deepEqual(f.elements,s.final);
      const shown=displayElements(f.elements,f.holeLightening);
      shown.forEach((e,j)=>{
        if(['slit','hole','virtual','proposal','measurement','dimension','gap-value','gap-dimension','span-label','span-dimension'].includes(e.kind)) {
          const original=f.elements[j];
          assert.equal(e.color,'#'+[1,3,5].map(k=>Math.round(parseInt(original.color.slice(k,k+2),16)+(196-parseInt(original.color.slice(k,k+2),16))*f.holeLightening).toString(16).padStart(2,'0')).join('').toUpperCase());
          assert.deepEqual({...e,color:original.color},original);
        } else assert.deepEqual(e,f.elements[j]);
      });
    });
    assert(displayElements(s.final).filter(e=>['slit','hole','virtual','proposal','measurement','dimension','gap-value','gap-dimension','span-label','span-dimension'].includes(e.kind)).every(e=>e.color==='#C4C4C4'));
    for(const f of s.frames.filter(f=>!['thread-reveal','thread-fade'].includes(f.stage)))assert(!f.elements.some(e=>e.kind==='thread'));
    const openings=s.final.filter(e=>['slit','hole','proposal'].includes(e.kind)),threads=s.final.filter(e=>e.kind==='thread');
    const expected= s.name==='axiom-closure'?openings.length:openings.length-(s.name==='matched-guides'?2:1);
    assert.equal(threads.length,expected,`${s.name} incorrect thread count`);
    const tips=openings.flatMap(e=>e.type==='circle'?[e.p]:[e.a,e.b]);
    for(const t of threads)for(const p of [t.a,t.b])assert(tips.some(q=>dist(p,q)<1e-6),`${s.name} thread misses a real opening`);
    const rectangular=s.final.filter(e=>e.outline);
    assert(rectangular.every(e=>e.outlineWidth<threads[0].width));
    const polygons=[...readSvg(s.name).source.matchAll(/<polygon class="slit-outline" points="([^"]+)"/g)].map(m=>m[1].split(' ').map(p=>p.split(',').map(Number)));
    assert.equal(polygons.length,rectangular.length);
    polygons.forEach((points,i)=>{
      const slit=rectangular[i];assert.equal(points.length,4);
      near(dist(points[0],points[1]),dist(slit.a,slit.b));near(dist(points[1],points[2]),slit.width);
      near(dist([(points[0][0]+points[3][0])/2,(points[0][1]+points[3][1])/2],slit.a),0);
      near(dist([(points[1][0]+points[2][0])/2,(points[1][1]+points[2][1])/2],slit.b),0);
    });
    const gif=fs.readFileSync(new URL(`examples/illustrated/assets/${s.name}.gif`,root));
    // Check the encoded stream, including holds and reset; dispatch is not proof of motion.
    const blocks=gifBlocks(gif).blocks,images=blocks.filter(b=>b.kind==='image'),controls=blocks.filter(b=>b.kind==='control');
    assert.equal(images.length,s.frames.length);assert.equal(controls.length,images.length);
    assert.deepEqual(controls.map(b=>b.bytes.readUInt16LE(4)),s.frames.map(f=>f.delay));
    assert(gif.includes(Buffer.from([0x21,0xff,11,...Buffer.from('NETSCAPE2.0'),3,1,0,0,0])));
    assert(new Set(images.map(b=>crypto.createHash('sha256').update(b.bytes).digest('hex'))).size>=5);
    near(gif.readUInt16LE(6),600);near(gif.readUInt16LE(8),375);
  } else {
    assert(!fs.existsSync(new URL(`examples/illustrated/assets/${s.name}.gif`,root)),'Static figures must not retain obsolete GIFs');
    for(const leader of s.final.filter(e=>e.kind==='term-leader'))assert(leader.a[0]===leader.b[0]||leader.a[1]===leader.b[1],`${s.name} has an oblique callout`);
  }
  const png=fs.readFileSync(new URL(`examples/illustrated/assets/${s.name}.png`,root));
  assert.equal(png.readUInt32BE(16),600);assert.equal(png.readUInt32BE(20),375);
  const source=readSvg(s.name).source;
  const terms=catalog.illustrations.find(i=>i.assets.some(a=>a.path.endsWith('/'+s.name)))?.terms??[];
  const termMatches=(value,term)=>value===term||(value.startsWith(term+' ')&&/^\d+\.\d{2}$/.test(value.slice(term.length+1)));
  for(const match of source.matchAll(/<text[^>]*>([^<]+)<\/text>/g))assert(/^(?:\d+(?:\.\d+)?|L1|s|e|j|ST-1(?:-A)?)$/.test(match[1])||
    (s.name.startsWith('problem-corner-')&&/^\d+\.\d\u00b0$/.test(match[1]))||terms.some(term=>termMatches(match[1],term)),'Uncatalogued text in figure');
  const labels=s.final.filter(e=>e.type==='text');
  const allLabels=[...labels,...s.frames.flatMap(f=>f.elements.filter(e=>e.type==='text'))];
  for(const term of terms)assert(allLabels.some(e=>termMatches(e.value,term)),`${s.name} missing ${term}`);
  if(s.name!=='terms-slit') {
    assert(labels.some(e=>e.kind==='notation-start'&&e.value==='s'),`${s.name} needs a start`);
    assert(s.final.filter(e=>e.kind==='direction').length>=3,`${s.name} needs a direction arrow`);
    if(s.name!=='axiom-closure')assert(labels.some(e=>e.kind==='notation-end'&&e.value==='e'),`${s.name} needs an end`);
  }
  if(s.final.some(e=>e.kind==='hole')||s.name==='axiom-smooth')assert(labels.some(e=>e.value==='j'),`${s.name} needs its junction label`);
  for(const role of ['notation-start','notation-end','notation-id'])for(const f of s.frames)
    assert.deepEqual(f.elements.filter(e=>e.kind===role),s.final.filter(e=>e.kind===role),`${s.name} notation moved during reveal`);
  if(s.name==='matched-guides') {
    assert.deepEqual(labels.filter(e=>e.kind==='notation-id').map(e=>e.value),['ST-1','ST-1-A']);
    assert.equal(s.final.filter(e=>e.kind==='id-box').length,8);
  }
  for(const f of [...s.frames,{elements:s.final}])for(const e of f.elements) {
    for(const p of e.type==='line'?[e.a,e.b]:e.type==='polygon'?e.points:[e.p])assert(p[0]>=0&&p[0]<=600&&p[1]>=0&&p[1]<=375,`${s.name} clips an element`);
  }
}
console.log(`Illustrations valid: ${scenes.filter(s=>s.frames.length).length} moving GIFs, ${scenes.filter(s=>!s.frames.length).length} static figures, geometry, fixed constraints, corner construction, shared openings, clearance pass/fail, loop timing and still exports.`);
