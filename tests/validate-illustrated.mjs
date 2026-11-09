// Inspect the emitted figures and GIF structure against their geometric claims.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { selectFit } from './fit-oracle.mjs';
import { createScenes, gifBlocks } from '../examples/illustrated/scenes.mjs';

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
      near(+label.value.replace('Residual ',''),remaining,.00501);
      assert.equal(label.bold,true);assert.equal(label.size,labels[0].size);
      const indicator=f.elements.filter(e=>e.kind==='residual-dimension');assert.equal(indicator.length,1);
      assert.equal(indicator[0].color,'#C62828');near(indicator[0].a[1],indicator[0].b[1]);
      near(dist(indicator[0].a,indicator[0].b)/view.scale,remaining);
      assert(!f.elements.some(e=>e.kind==='residual-extension'));
      near(points.slice(1).reduce((sum,p,i)=>sum+p-points[i],0)+remaining,15.3);
      if(f.stage==='planning-revision') {
        assert(remaining<=previousResidual+1e-9);previousResidual=remaining;
      }
    }
  }
  const residual=s.final.find(e=>e.kind==='residual-value');
  near(+residual.value.replace('Residual ',''),s.name==='pitch-problem'?.3:0);
  if(s.name!=='pitch-problem')assert.equal(s.frames.filter(f=>f.stage==='planning-revision').length,30);
}

const curve=slits('axiom-curve',{x:160,y:75,scale:23});
const arcFit=selectFit({R:10,sweep:-Math.PI/2,p:3});
assert.equal(curve.length,arcFit.n+1);
for(const s of curve) {
  near(Math.hypot(s.center[0],s.center[1]+10),10);
  const tangent=Math.atan2(s.center[1]+10,s.center[0])-Math.PI/2;
  near(s.angle,tangent+alpha);
}
const chords=curve.slice(1).map((s,i)=>dist(s.center,curve[i].center));bounded(chords);
assert.equal(chords.filter(g=>Math.abs(g-3)>1e-6).length,3);
near(curve[0].center[0],0);near(curve.at(-1).center[1],-10);

const landmark=slits('axiom-landmark',{x:60,y:187.5,scale:16}).map(s=>s.center).sort((a,b)=>a[0]-b[0]);
assert.equal(landmark.length,11);assert(has(landmark,[14.75,0])&&has(landmark,[17.75,0]));
assert(!has(landmark,[16.25,0]));near((14.75+17.75)/2,16.25);
bounded(landmark.slice(1).map((p,i)=>dist(p,landmark[i])));
for(const frame of scenes.find(s=>s.name==='axiom-landmark').frames.filter(f=>!['reference','reset'].includes(f.stage))) {
  const xs=frame.elements.filter(e=>e.kind==='slit').map(e=>(e.a[0]+e.b[0])/2);
  for(const station of [14.75,17.75])assert(xs.some(x=>Math.abs(x-(60+station*16))<1e-6),'Protected pair moved during fitting');
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
  assert.equal(f.elements.filter(e=>e.kind==='hole').length,['shared-hole','result'].includes(f.stage)?1:0);
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
    if(!['shared-hole','result'].includes(f.stage))assert(!f.elements.some(e=>e.kind==='hole'),'The shared hole appears only after both arms arrive');
    previousReal=real;previousVirtual=virtual;
  }
}

// Glossary labels must describe the existing constructions without changing them.
for(const [name,original,kinds] of [
  ['terms-layout','axiom-landmark',['slit','adjustment-mark','landmark']],
  ['terms-junction','axiom-junction',['slit','hole']]
])for(const kind of kinds)assert.deepEqual(readSvg(name).elements.filter(e=>e.class===kind),readSvg(original).elements.filter(e=>e.class===kind));
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

for(const s of scenes) {
  const entry=catalog.illustrations.find(i=>i.assets.some(a=>a.path.endsWith('/'+s.name)));
  assert.equal(Boolean(s.frames.length),entry.animated);
  if(entry.animated) {
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
  for(const match of source.matchAll(/<text[^>]*>([^<]+)<\/text>/g))assert(/^(?:\d+(?:\.\d+)?|L1|s|e|j|ST-1(?:-A)?)$/.test(match[1])||terms.some(term=>termMatches(match[1],term)),'Uncatalogued text in figure');
  const labels=s.final.filter(e=>e.type==='text');
  for(const term of terms)assert(labels.some(e=>termMatches(e.value,term)),`${s.name} missing ${term}`);
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
    for(const p of e.type==='line'?[e.a,e.b]:[e.p])assert(p[0]>=0&&p[0]<=600&&p[1]>=0&&p[1]<=375,`${s.name} clips an element`);
  }
}
console.log(`Illustrations valid: ${scenes.filter(s=>s.frames.length).length} moving GIFs, ${scenes.filter(s=>!s.frames.length).length} static figures, geometry, fixed constraints, corner construction, shared openings, clearance pass/fail, loop timing and still exports.`);
