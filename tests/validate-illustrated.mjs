// Inspect the emitted figures and GIF structure against their geometric claims.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { selectFit } from './fit-oracle.mjs';
import { createScenes, gifBlocks, displayElements, pitchComparisonMetrics, portraitScenes, revealGlowFrames, svg, themeFor, colorConfig } from '../examples/illustrated/scenes.mjs';
import { palettes, paletteScenes } from '../examples/illustrated/palettes.mjs';

const root = new URL('../', import.meta.url);
const catalog = JSON.parse(fs.readFileSync(new URL('tests/cases.json', root), 'utf8'));
const scenes = createScenes();
const theme=themeFor();
assert.throws(()=>themeFor('missing-theme'),/Unknown diagram theme/);
assert.throws(()=>displayElements([{type:'text',kind:'measurement',color:'missing-role'}]),/Unknown diagram colour role/);
const numberedLandmark=displayElements([{type:'text',kind:'notation-landmark',p:[100,100],value:'L12',size:12,color:'construction'}],0)[0];
assert.deepEqual(numberedLandmark.textRuns.map(run=>run.value),['l','12']);
for(const name of ['graphite','porcelain']) {
  const selected=themeFor(name);
  for(const s of scenes)for(const f of [...s.frames,{elements:s.final}]) {
    const shown=displayElements(f.elements,f.holeLightening,selected);
    shown.forEach((e,i)=>{
      const raw=f.elements[i];
      const {color,fontFamily,fontItalic,textRuns,textBackground,textBox,size,...shape}=e;
      const {color:role,size:rawSize,...originalShape}=raw;
      assert.deepEqual(shape,originalShape,'Theme must preserve diagram geometry');
      assert(/^#[0-9A-F]{6}$/i.test(color));
      if(e.type==='text') {
        const landmark=raw.value.match(/^L(\d+)$/),math=Boolean(landmark)||['notation-start','notation-end'].includes(raw.kind);
        assert.equal(size,rawSize*colorConfig.typography.sizeScale*(math?colorConfig.typography.notationSizeScale:1));
        const numeric=/^[+-]?\d+(?:\.\d+)?\u00b0?$/.test(raw.value);
        assert.equal(fontFamily,math?colorConfig.typography.notationFontFamily:numeric?colorConfig.typography.numberFontFamily:colorConfig.typography.fontFamily);
        assert.equal(Boolean(fontItalic),math);
        if(landmark) {
          assert.deepEqual(textRuns.map(r=>r.value),['l',landmark[1]]);
          assert(textRuns[0].italic&&!textRuns[1].italic);
          assert(textRuns[1].size<textRuns[0].size&&textRuns[1].y>textRuns[0].y);
        }
        assert.equal(textBackground,colorConfig.typography.background?selected.textBackground:null);
        assert(textBox.width>0&&textBox.height>0);
      }
    });
  }
}
const presented=portraitScenes(scenes);
// A reveal pulse borrows frame time; existing layouts and movement must not flash.
const glowSlit={type:'line',kind:'slit',a:[10,10],b:[20,20],color:'ink',width:2.6};
const glowInput=[{stage:'guides',delay:20,elements:[]},
  {stage:'reveal',delay:25,elements:[glowSlit]},
  {stage:'move',delay:25,elements:[{...glowSlit,a:[12,10],b:[22,20]}]},
  {stage:'reset',delay:20,elements:[]}];
const glowFrames=revealGlowFrames(glowInput);
assert.equal(glowFrames.reduce((n,f)=>n+f.delay,0),90);
assert.equal(revealGlowFrames([glowInput[1]])[0].elements[0].glow,undefined,'Initial layout must not flash');
assert(glowFrames.filter(f=>f.elements.some(e=>e.glow)).every(f=>f.stage==='reveal'&&f.delay>=2));
const glowOpacity=glowFrames.filter(f=>f.elements.some(e=>e.glow)).map(f=>f.elements[0].glow.opacity);
assert.equal(glowOpacity.length,4);
glowOpacity.forEach((opacity,i)=>assert(Math.abs(opacity-[.28,.21,.14,.07][i])<1e-9));
assert(glowFrames.filter(f=>f.stage==='move').every(f=>f.elements.every(e=>!e.glow)));
assert.deepEqual(glowFrames.findLast(f=>f.stage==='reveal').elements,[glowSlit]);
const savedGlow=colorConfig.revealGlow.enabled;
try {colorConfig.revealGlow.enabled=false;assert.equal(revealGlowFrames(glowInput),glowInput);}
finally {colorConfig.revealGlow.enabled=savedGlow;}
for(const s of presented) {
  const original=scenes.find(raw=>raw.name===s.name);
  assert.equal(s.frames.reduce((n,f)=>n+f.delay,0),original.frames.reduce((n,f)=>n+f.delay,0));
  assert(!s.final.some(e=>e.glow));
  assert(s.frames.filter(f=>['thread-reveal','reset'].includes(f.stage)).every(f=>f.elements.every(e=>!e.glow)));
  const c=s.canvas;
  assert.equal(c.width/c.height,4/5);
  for(const peer of presented.filter(p=>p.source===s.source))assert.deepEqual(peer.canvas,c,'Comparisons need one fixed camera');
  assert.equal(fs.readFileSync(new URL(`examples/illustrated/assets/${s.name}.svg`,root),'utf8'),svg(s),'Stale portrait SVG');
  for(const elements of [s.final,...s.frames.map(f=>f.elements)])for(const e of elements) {
    for(const p of e.type==='line'?[e.a,e.b]:e.type==='polygon'?e.points:[e.p]) {
      const x=p[0]*c.scale+c.x,y=p[1]*c.scale+c.y;
      assert(x>=24&&x<=576&&y>=24&&y<=726,`${s.name} clips in portrait`);
    }
  }
}
const luminance=hex=>hex.slice(1).match(/../g).map(v=>parseInt(v,16)/255)
  .map(v=>v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[0.2126,0.7152,0.0722][i],0);
assert.equal(palettes.filter(p=>p.mode==='light').length,8);
assert.equal(palettes.filter(p=>p.mode==='dark').length,8);
assert.equal(new Set(palettes.map(p=>p.background)).size,16);
for(const p of palettes)for(const role of ['ink','text','secondary','angle','adjusted','adjustedSecondary','accepted','rejected'])for(const background of ['background','textBackground']) {
  const a=luminance(p[background]),b=luminance(p[role]);
  assert((Math.max(a,b)+0.05)/(Math.min(a,b)+0.05)>=4.5,`${p.title}: ${role} needs readable contrast`);
}
// Typography switches must affect every text element without changing its anchor.
const font=colorConfig.typography,savedFont={...font};
try {
  Object.assign(font,{fontFamily:'Georgia',numberFontFamily:'Courier New',sizeScale:1.2,background:false});
  const label={type:'text',kind:'term-label',p:[100,100],value:'Guide',size:13,color:'construction'};
  const shown=displayElements([label],0)[0];
  assert.equal(shown.fontFamily,'Georgia');assert.equal(shown.size,15.6);
  assert.equal(shown.color,theme.text);assert.equal(shown.textBackground,null);assert.deepEqual(shown.p,label.p);
  for(const value of ['3.00','-0.30','27.5\u00b0'])assert.equal(displayElements([{...label,value}],0)[0].fontFamily,'Courier New');
} finally {Object.assign(font,savedFont);}
for(const s of paletteScenes()) {
  const base=new URL(`examples/illustrated/palettes/${s.name}`,root);
  assert.equal(fs.readFileSync(new URL(base.href+'.svg'),'utf8'),svg(s));
  const png=fs.readFileSync(new URL(base.href+'.png'));
  assert.equal(png.readUInt32BE(16),600);assert.equal(png.readUInt32BE(20),750);
}
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
    labels.forEach((label,i)=>{
      const gap=points[i+1]-points[i];near(+label.value,gap,.00501);
      assert.equal(Boolean(label.adjusted),Math.abs(gap-3)>1e-6);
      assert.equal(label.color,label.adjusted?'adjusted':'construction');
    });
    const highlighted=f.elements.filter(e=>e.kind==='adjusted-gap');
    const changed=points.slice(1).map((x,i)=>({a:points[i],b:x})).filter(g=>Math.abs(g.b-g.a-3)>1e-6);
    assert.equal(highlighted.length,changed.length);
    highlighted.forEach((e,i)=>{
      near(e.a[1],view.y);near(e.b[1],view.y);
      near(e.a[0],view.x+changed[i].a*view.scale);near(e.b[0],view.x+changed[i].b*view.scale);
    });
    if(points.length===6) {
      const remaining=15.3-points.at(-1),label=f.elements.find(e=>e.kind==='residual-value');
      near(+label.value,remaining,.00501);
      assert.equal(label.bold,false);assert.equal(label.size,labels[0].size);
      assert.equal(label.color,'angle');assert(/^\d+\.\d{2}$/.test(label.value));
      const indicator=f.elements.filter(e=>e.kind==='residual-dimension');assert.equal(indicator.length,1);
      assert.equal(indicator[0].color,'angle');near(indicator[0].a[1],view.y);near(indicator[0].b[1],view.y);
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
const tangentFrames=curveScene.frames.filter(f=>f.stage==='local-tangent');
assert.equal(tangentFrames.length,31);
assert.equal(tangentFrames[0].delay,200);assert.equal(tangentFrames.at(-1).delay,200);
assert(tangentFrames.slice(1,-1).every(f=>f.delay===12));
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
const landmarkView={x:(600-landmarkInput.length*landmarkInput.scale)/2,y:187.5,scale:landmarkInput.scale};
const leftFixed=landmarkInput.landmark-1.5,rightFixed=landmarkInput.landmark+1.5;
const landmark=slits('axiom-landmark',landmarkView).map(s=>s.center).sort((a,b)=>a[0]-b[0]);
assert.equal(landmark.length,14);assert(has(landmark,[leftFixed,0])&&has(landmark,[rightFixed,0]));
assert(!has(landmark,[landmarkInput.landmark,0]));near((leftFixed+rightFixed)/2,landmarkInput.landmark);
const landmarkGaps=landmark.slice(1).map((p,i)=>dist(p,landmark[i]));
bounded(landmarkGaps);
assert.equal(landmarkGaps.filter(g=>Math.abs(g-3)<1e-6).length,9);
near(landmarkGaps.reduce((sum,g)=>sum+g-3,0),1);
for(const frame of scenes.find(s=>s.name==='axiom-landmark').frames.filter(f=>!['reference','reset'].includes(f.stage))) {
  const xs=frame.elements.filter(e=>e.kind==='slit').map(e=>(e.a[0]+e.b[0])/2);
  for(const station of [0,leftFixed,rightFixed,landmarkInput.length])assert(xs.some(x=>Math.abs(x-(landmarkView.x+station*landmarkView.scale))<1e-6),'Fixed opening moved during fitting');
  if(xs.length===14) {
    const points=xs.map(x=>(x-landmarkView.x)/landmarkView.scale).sort((a,b)=>a-b),gaps=points.slice(1).map((p,i)=>p-points[i]);
    bounded(gaps);near(gaps[6],3);
    const labels=frame.elements.filter(e=>e.kind==='gap-value');
    const adjustable=gaps.filter((g,i)=>i!==6);assert.equal(labels.length,adjustable.length);
    labels.forEach((label,i)=>near(+label.value,adjustable[i],.00501));
    near(gaps.slice(0,6).reduce((a,b)=>a+b,0),leftFixed);
    near(gaps.slice(7).reduce((a,b)=>a+b,0),landmarkInput.length-rightFixed);
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
  assert.equal(real.length,6);
  assert.equal(s.final.filter(e=>e.kind==='virtual').length,2);
  const schedule=frames=>frames.map(f=>({stage:f.stage,delay:f.delay,real:f.elements.filter(e=>e.kind==='slit').length,virtual:f.elements.filter(e=>e.kind==='virtual').length}));
  assert.deepEqual(schedule(s.frames),schedule(scenes.find(s=>s.name==='axiom-corner').frames),'Corner examples must share every reveal and hold');
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

const junctionInput=catalog.illustrations.find(i=>i.id==='ILL-JUNCTION').inputs;
const junctionView=junctionInput.view,junction=circle('axiom-junction',junctionView);
near(dist(junction,[0,0]),0);
const arms=slits('axiom-junction',junctionView).map(s=>s.center);assert.equal(arms.length,12);
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
  const real=f.elements.filter(e=>e.kind==='slit');
  if(['arms','shared-hole','arms-stitch'].includes(f.stage))assert.deepEqual(real.slice(0,branchReal.length),branchReal);
  if(f.stage==='arms-stitch') {
    assert.equal(real.length,branchReal.length+3,'All three arms must gain a slit together');
    for(const [index,slit] of real.slice(-3).entries()) {
      const center=[(slit.a[0]+slit.b[0])/2,(slit.a[1]+slit.b[1])/2];
      const distance=dist(center,[junctionView.x,junctionView.y]);
      assert(distance<branchDistances[index],'Branch stitching must approach the junction');
      const end=junctionInput.arms[index],norm=Math.hypot(...end);
      near((center[0]-junctionView.x)/distance,end[0]/norm);
      near((junctionView.y-center[1])/distance,end[1]/norm);
      branchDistances[index]=distance;branchCounts[index]++;
    }
    assert(branchCounts.every(count=>count===branchCounts[0]));
  }
  assert.equal(f.elements.filter(e=>e.kind==='hole').length,['shared-hole','free-spans','planning-revision','result','thread-fade','thread-reveal'].includes(f.stage)?1:0);
  branchReal=real;
}
assert.deepEqual(branchCounts,[4,4,4]);
assert.equal(branchScene.frames.filter(f=>f.stage==='arms-stitch').length,4);
branchDistances.forEach(d=>near(d/junctionView.scale,3));
for(const f of branchScene.frames.filter(f=>['free-spans','planning-revision','result'].includes(f.stage))) {
  const real=f.elements.filter(e=>e.kind==='slit');
  for(let arm=0;arm<3;arm++) {
    const row=real.slice(arm*4,arm*4+4).map(e=>[(e.a[0]+e.b[0])/2,(e.a[1]+e.b[1])/2]);
    near(dist(row[0],[junctionView.x,junctionView.y])/junctionView.scale,12.4);
    near(dist(row.at(-1),[junctionView.x,junctionView.y])/junctionView.scale,3);
    if(f.stage==='result')for(let i=0;i<3;i++)near(dist(row[i],row[i+1])/junctionView.scale,i===0?3:3.2);
  }
}

const clearanceView={x:75,y:200,scale:35};
const clearance=slits('axiom-clearance',clearanceView);assert.equal(clearance.length,8);
const clearanceInput=catalog.illustrations.find(i=>i.id==='ILL-CLEARANCE').inputs;
for(const s of clearance){near(+s.element['stroke-width']/35,.3);assert.equal(s.element['stroke-linecap'],undefined);}
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
const rectangle=s=>{
  const normal=[-Math.sin(s.angle)*clearanceInput.width/2,Math.cos(s.angle)*clearanceInput.width/2];
  return [[s.a,1],[s.b,1],[s.b,-1],[s.a,-1]].map(([p,sign])=>p.map((v,i)=>v+sign*normal[i]));
};
const rectangleDistance=(a,b)=>Math.min(...a.flatMap((p,i)=>b.map((q,j)=>segmentDistance(p,a[(i+1)%4],q,b[(j+1)%4]))));
const rectangularClearances=clearanceRows[0].map(a=>Math.min(...clearanceRows[1].map(b=>rectangleDistance(rectangle(a),rectangle(b)))));
near(rectangularClearances[0],0);
assert(rectangularClearances[1]>0&&rectangularClearances[1]<clearanceInput.margin);
assert(rectangularClearances.slice(2).every(g=>g>clearanceInput.margin));
const clearanceSvg=readSvg('axiom-clearance');
assert.equal(clearanceSvg.elements.filter(e=>e.class==='rejected').length,4);
assert.equal(clearanceSvg.elements.filter(e=>e.class==='accepted').length,4);
const clearanceVirtuals=slits('axiom-clearance',clearanceView,'virtual'),clearanceJoint=circle('axiom-clearance',clearanceView);
clearanceVirtuals.forEach((v,i)=>{near(dist(v.b,clearanceJoint),0);near(dist(v.center,clearanceRows[i][0].center),3);});
const clearanceScene=scenes.find(s=>s.name==='axiom-clearance');
assert(clearanceScene.final.filter(e=>e.kind==='slit').every(e=>e.outline&&!e.round),'Clearance slits must use the same sharp rectangular outlines as other figures.');
assert.equal(clearanceScene.frames.length,0);
assert(!clearanceScene.final.some(e=>e.kind==='thread'));
assert.deepEqual(displayElements(clearanceScene.final),displayElements(clearanceScene.final,0),'Construction view must not fade');
const firstClearanceSlit=clearanceScene.final.findIndex(e=>e.kind==='slit');
assert(clearanceScene.final.slice(firstClearanceSlit).every(e=>!['guide','clearance-envelope'].includes(e.kind)), 'Construction must not obscure a physical overlap');

assert.equal(selectFit({D:7,p:3}),null);
const rejectedScene=scenes.find(s=>s.name==='fit-rejected');
assert.equal(rejectedScene.frames.length,0);
assert(!rejectedScene.final.some(e=>e.kind==='thread'));
const rejected=slits('fit-rejected',{x:160,y:110,scale:40});
assert.equal(rejected.length,7);
for(const [i,row] of [rejected.slice(0,3),rejected.slice(3)].entries()) {
  near(row[0].center[0],0);near(row.at(-1).center[0],7);
  assert(row.every(s=>Math.abs(s.center[1]+i*6.5)<1e-6));
  for(let j=1;j<row.length;j++)near(dist(row[j-1].center,row[j].center),7/(row.length-1));
}
assert.equal(readSvg('fit-rejected').elements.filter(e=>e.class==='rejected').length,4);
assert.deepEqual(rejectedScene.final.filter(e=>e.kind==='measurement').map(e=>e.value),['3.50','3.50','7.00','2.33','2.33','2.33']);
for(const s of [clearanceScene,rejectedScene])for(const e of s.final.filter(e=>['accepted','rejected'].includes(e.kind))) {
  assert.equal(e.color,e.kind);assert.equal(e.width,1.4);
  assert(dist(e.a,e.b)<13,'Use compact status marks');
  assert.equal(displayElements([e])[0].color,theme[e.kind]);
}
assert(7/2>3.3&&7/3<2.7);

const closure=slits('axiom-closure',{x:300,y:187.5,scale:13});
const closureInput=catalog.illustrations.find(i=>i.id==='ILL-CLOSURE').inputs;
const closureStep=2*Math.asin(3/(2*closureInput.radius));
const closureFit=selectFit({R:closureInput.radius,p:3,sweep:Math.PI-closureStep});
assert.deepEqual(closureInput.landmarksDegrees,[90,270]);
assert.equal(closure.length,20);
for(const [i,s] of closure.entries()) {
  const halfIndex=i%(closureFit.n+1),changed=halfIndex>=closureFit.i&&halfIndex<closureFit.i+closureFit.k;
  near(dist(s.center,closure[(i+1)%20].center),changed?closureFit.correctedPitch:3);
  near(Math.hypot(...s.center),closureInput.radius);
  assert(has(closure.map(s=>s.center),[-s.center[0],s.center[1]]),'Loop opening positions must mirror across the diameter');
}
assert.equal(new Set(closure.map(s=>s.center.map(x=>x.toFixed(6)).join(','))).size,20);
assert.equal(closureFit.k,3);assert(closureFit.exactCentre);
const closureScene=scenes.find(s=>s.name==='axiom-closure');
const closureHighlights=closureScene.final.filter(e=>e.kind==='adjusted-gap');
assert.equal(closureHighlights.length,2*closureFit.k*12);
for(const e of closureHighlights)for(const p of [e.a,e.b])near(Math.hypot(p[0]-300,p[1]-187.5)/13,closureInput.radius);
const closureCenter=e=>[(e.a[0]+e.b[0])/2,(e.a[1]+e.b[1])/2];
assert.equal(closureScene.final.filter(e=>e.kind==='landmark').length,1);
assert.deepEqual(closureScene.final.filter(e=>e.kind==='notation-landmark').map(e=>e.value),['L1','L2']);
const protectedLoop=closureScene.frames.find(f=>f.stage==='protected-pairs').elements.filter(e=>e.kind==='slit');
for(const [a,b] of [[19,0],[9,10]]) {
  const first=closure[a].center,last=closure[b].center;
  near(dist(first,last),3);near(first[0]+last[0],0);near(first[1],last[1]);
}
for(const f of closureScene.frames.filter(f=>['protected-pairs','planning-revision','reuse-start'].includes(f.stage))) {
  const real=f.elements.filter(e=>e.kind==='slit');
  for(const i of [0,9,10,19])assert.deepEqual(real[i],protectedLoop[i],'Landmark pairs must stay fixed during fitting');
}
const closureMismatch=closureScene.frames.find(f=>f.stage==='closure-mismatch');
const nominalLoop=closureMismatch.elements.filter(e=>e.kind==='slit').map(closureCenter);
const candidate=closureCenter(closureMismatch.elements.find(e=>e.kind==='proposal'));
for(let i=1;i<nominalLoop.length;i++)near(dist(nominalLoop[i-1],nominalLoop[i])/13,3);
near(dist(nominalLoop.at(-1),candidate)/13,3);
assert(dist(candidate,nominalLoop[0])>13,'Nominal loop must visibly miss the start.');
let previousMismatch=Infinity;
for(const f of closureScene.frames.filter(f=>['closure-mismatch','planning-revision','reuse-start'].includes(f.stage))) {
  const real=f.elements.filter(e=>e.kind==='slit').map(closureCenter);
  assert.equal(real.length,20);
  near(dist(real[0],nominalLoop[0]),0);
  const proposal=f.elements.find(e=>e.kind==='proposal');
  const mismatch=proposal?dist(closureCenter(proposal),real[0]):0;
  assert(mismatch<=previousMismatch+1e-6);
  previousMismatch=mismatch;
}
near(previousMismatch,0);
assert(!closureScene.final.some(e=>['proposal','residual-dimension','dimension','measurement'].includes(e.kind)));

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
    const onArm=v.route.primitives.findIndex((g,arm)=>{
      if(g.kind==='arc'){
        const theta=Math.atan2(slit.center[1]-g.center[1],slit.center[0]-g.center[0]);
        const expected=theta+Math.sign(g.sweep)*Math.PI/2+alpha;
        const advance=Math.sign(g.sweep)*Math.atan2(Math.sin(theta-g['start-angle']),Math.cos(theta-g['start-angle']));
        // The arc/arc illustration extends its outgoing end by less than one nominal step.
        const extension=caseId==='A04'&&arm===1?2*Math.asin(3/(2*g.radius)):0;
        return Math.abs(dist(slit.center,g.center)-g.radius)<1e-6&&Math.abs(Math.sin(slit.angle-expected))<1e-6&&advance>=-1e-6&&advance<=Math.abs(g.sweep)+extension+1e-6;
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
  const dimensions=s.final.filter(e=>e.kind==='dimension');
  assert.equal(dimensions.length,5,`${name}: corner step needs two extension lines`);
  const [bracket,,,extensionA,extensionB]=dimensions;
  const measured= name==='corner-shallow'?virtuals[1]:virtuals[0];
  const endpoints=[extensionA.a,extensionB.a];
  assert(endpoints.some(p=>dist(p,center(measured))<1e-6),`${name}: dimension must attach to the virtual centre`);
  assert(endpoints.some(p=>s.final.filter(e=>e.kind==='slit').some(e=>dist(p,center(e))<1e-6)),`${name}: dimension must attach to a real centre`);
  near(dist(...endpoints),dist(bracket.a,bracket.b));
  for(const [extension,end] of [[extensionA,bracket.a],[extensionB,bracket.b]]) {
    const dx=bracket.b[0]-bracket.a[0],dy=bracket.b[1]-bracket.a[1];
    near((end[0]-extension.a[0])*dx+(end[1]-extension.a[1])*dy,0);
    near(dist(extension.a,end)+4,dist(extension.a,extension.b));
  }
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
    const shift=arm===0?0:treatment==='bridge'?scenes.find(s=>s.name===name).bridgeShifts[0]:armLengths[1]-armLengths[0];
    near(dist(row[0].center,arm===0?[-armLengths[0]+(treatment==='bridge'?cornerInput.bridgeIncomingAdvance:0),0]:[0,-armLengths[1]+shift]),0);
    const last=armLengths[arm]-3*(count-1);
    const advance=treatment==='bridge'?cornerInput.bridgeIncomingAdvance:0;
    near(dist(row.at(-1).center,arm===0?[-last+advance,0]:[0,-last+shift]),0);
    const gaps=row.slice(1).map((e,i)=>dist(e.center,row[i].center));bounded(gaps);
    const changed=gaps.filter(g=>Math.abs(g-3)>1e-6);
    assert.equal(changed.length,0);
  }
  const vertexSlits=openings.filter(s=>dist(s.center,[0,0])<1e-6);
  assert.equal(vertexSlits.length,0);
  if(treatment==='vertex-point') {
    const virtuals=slits(name,problemView,'virtual');assert.equal(virtuals.length,2);
    virtuals.forEach((v,arm)=>{
      near(dist(v.center,arm===0?[cornerShifts[arm]/2,0]:[0,cornerShifts[arm]/2+armLengths[1]-armLengths[0]]),0);
      near(dist(v.center,openings[(arm+1)*count-1].center),3);
      assert(v.element['stroke-dasharray']);
    });
    near(Math.abs(virtuals[0].angle-virtuals[1].angle),Math.PI/2);
    near(dist(circle(name,problemView),[0,0]),0);
    assert.equal(scenes.find(s=>s.name===name).frames.length,0);
    const layout=scenes.find(s=>s.name===name),thread=layout.final.filter(e=>e.kind==='thread');
    near(dist(thread[count-1].a,thread[count-1].b),dist(thread[count].a,thread[count].b));
    const values=layout.final.filter(e=>e.kind==='thread-angle-value').map(e=>e.value);
    assert.deepEqual(values,['14.3\u00b0','14.3\u00b0']);
    near(dist(openings[count-1].center,[0,0]),dist(openings[2*count-1].center,[0,0]));
    const end=layout.final.find(e=>e.kind==='notation-end');
    near(end.p[1],problemView.y+(armLengths[0])*problemView.scale+12);
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
assert.equal(mirroredCorner.frames[0].stage,'vertical-rear-style');
assert.equal(mirroredCorner.frames[0].delay,5);
assert.equal(mirroredCorner.frames[1].stage,'mirror-vertical');
assert(!mirroredCorner.frames.some(f=>f.stage==='top-row'));
assert.equal(mirroredCorner.frames[0].elements.filter(e=>e.kind==='slit').length,2*count);
assert.equal(mirroredCorner.frames.filter(f=>f.stage==='mirror-vertical').length,30);
for(const [i,e] of mirroredSlits.entries()) {
  near(e.angle,(i<count?-40:i<2*count?-50:-45)*Math.PI/180);
  if(i<2*count) {
    const arm=Math.floor(i/count),station=armLengths[arm]-3*(i%count);
    near(dist(e.center,arm===0?[-station,0]:[0,-station]),0);
  }
  else near(dist(e.center,[0,0]),0);
}
for(const f of [...mirroredCorner.frames,{elements:mirroredCorner.final}]) {
  assert(!f.elements.some(e=>['gap-value','gap-dimension'].includes(e.kind)));
  assert.equal(f.elements.filter(e=>e.kind==='thread-length-value').length,f.elements.some(e=>e.kind==='thread')?2:0);
}
for(const arm of [0,1]) {
  const row=mirroredSlits.slice(arm*count,(arm+1)*count);
  row.slice(1).forEach((e,i)=>near(dist(row[i].center,e.center),3));
  near(dist(row.at(-1).center,[0,0]),3-cornerShifts[arm]/2);
}
assert(!mirroredCorner.final.some(e=>['hole','virtual'].includes(e.kind)));
const crossing=scenes.find(s=>s.name==='problem-corner-vertex-point');
// The incoming nominal row determines the initial, off-guide outgoing row.
const initial=cornerSolution.frames[0].elements;
assert(!initial.some(e=>e.kind==='thread'));
assert(!initial.some(e=>e.kind==='hole'));
assert.deepEqual(initial.filter(e=>e.kind==='slit').slice(0,count),crossing.final.filter(e=>e.kind==='slit').slice(0,count));
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
  near(dist(virtual[0].a,virtual[1].b),0);
  for(const slit of real.slice(count))near(centre(slit)[0],centre(virtual[1])[0]);
  if(['crossing','align-terminal-tips','shared-hole','reset'].includes(f.stage)) {
    const initialVirtual=initial.filter(e=>e.kind==='virtual'),initialReal=initial.filter(e=>e.kind==='slit');
    const dx=centre(virtual[0])[0]-centre(initialVirtual[0])[0];
    for(let i=count;i<2*count;i++) {
      near(centre(real[i])[0]-centre(initialReal[i])[0],dx);
      near(centre(real[i])[1],centre(initialReal[i])[1]);
      if(i>count)near(dist(centre(real[i]),centre(real[i-1]))/problemView.scale,3);
    }
    for(let i=0;i<count-1;i++)near(dist(centre(real[i]),centre(initialReal[i])),0);
    near(centre(real[count-1])[0]-centre(initialReal[count-1])[0],dx);
    near(dist(centre(real[count-2]),centre(real[count-1]))/problemView.scale,3+dx/problemView.scale);
  }
  for(const a of [0,1]) {
    if(a===0||['result','thread-fade','thread-reveal'].includes(f.stage))
      near(dist(centre(real[a*count]),a===0?[125,40]:[410,40+armLengths[1]*problemView.scale]),0);
    near(dist(centre(real[a*count+count-1]),centre(virtual[a]))/problemView.scale,3);
  }
  if(['shared-hole','distribute-within-arms','result','thread-fade','thread-reveal'].includes(f.stage)) {
    assert.deepEqual(virtual,cornerSolution.final.filter(e=>e.kind==='virtual'));
    assert.deepEqual(f.elements.filter(e=>e.kind==='hole'),cornerSolution.final.filter(e=>e.kind==='hole'));
    for(const i of [count-1,2*count-1])near(dist(centre(real[i]),centre(cornerSolution.final.filter(e=>e.kind==='slit')[i])),0);
  }
  assert(!f.elements.some(e=>['gap-value','gap-dimension'].includes(e.kind)));
  assert.equal(f.elements.filter(e=>e.kind==='thread-length-value').length,f.elements.some(e=>e.kind==='thread')?2:0);
}

const aligning=cornerSolution.frames.filter(f=>f.stage==='align-terminal-tips');
let previousX=centre(initial.filter(e=>e.kind==='virtual')[1])[0];
assert(previousX<problemView.x);
for(const f of aligning) {
  const x=centre(f.elements.filter(e=>e.kind==='virtual')[1])[0];
  assert(x>previousX&&x<=problemView.x+1e-6);previousX=x;
}
near(previousX,problemView.x);

const pitchDoc=fs.readFileSync(new URL('docs/PITCH_skeleton.md',root),'utf8');
for(const [,link] of pitchDoc.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g))assert(fs.existsSync(new URL(link,new URL('docs/PITCH_skeleton.md',root))),`Missing pitch figure: ${link}`);
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
  for(const e of labels){assert.equal(e.size,13);assert.equal(e.color,'angle');}
  assert(displayElements(s.final).filter(e=>e.kind==='thread-angle-value').every(e=>e.color===theme.angle));
  const wedges=s.final.filter(e=>e.kind==='angle-wedge');
  assert.equal(wedges.length,2);
  wedges.forEach(e=>{assert.equal(e.type,'polygon');assert.equal(e.color,'angle');assert(e.opacity>0&&e.opacity<1);});
  if(s.name==='problem-corner-bridge') {
    const radii=wedges.map(e=>dist(e.points[0],e.points[1]));
    near(radii[0],24);near(radii[1],12);
  }
  for(const f of s.frames) {
    const annotated=f.elements.some(e=>e.kind==='thread-angle-value');
    assert.equal(annotated,f.elements.some(e=>e.kind==='thread'));
  }
  if(s.name.startsWith('problem-corner-')) {
    if(s.name==='problem-corner-vertex-point')assert.equal(s.frames.length,0);
    const expectedThreads=s.name==='problem-corner-bridge'?adjacent.slice(0,1):adjacent;
    const lengths=s.final.filter(e=>e.kind==='thread-length-value');
    assert.deepEqual(lengths.map(e=>e.value),expectedThreads.map(e=>(dist(e.a,e.b)/problemView.scale).toFixed(2)));
    assert(!s.final.some(e=>e.kind==='gap-value'));
    assert(displayElements(s.final).filter(e=>['thread-length-value','thread-length-dimension','slit','hole','virtual'].includes(e.kind)).every(e=>e.color===theme.secondary));
    assert(readSvg(s.name).source.includes('class="thread-length-value"'));
  }
}
const balancedMirror=pitchComparisonMetrics(mirroredCorner),balancedAuto=pitchComparisonMetrics(cornerSolution);
for(const key of ['absoluteAdjustment','absoluteResidual'])near(balancedMirror[key],balancedAuto[key]);
assert.equal(balancedMirror.adjustedGaps,2);
assert.equal(balancedAuto.adjustedGaps,3);
near(balancedAuto.absoluteResidual,cornerShifts.reduce((sum,c)=>sum+c/2,0));
for(const s of comparisons) {
  for(const f of [...s.frames,{elements:s.final}])for(const e of f.elements) {
    if(e.type==='text'&&['gap-value','residual-value'].includes(e.kind)){assert.equal(e.size,13);assert.equal(e.bold,false);}
    if(e.kind==='residual-dimension'){assert.equal(e.color,'angle');assert.equal(e.width,3);}
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

const modelScene=scenes.find(s=>s.name==='model-solution');
const modelSpec=catalog.illustrations.find(i=>i.id===modelScene.source),modelView=modelSpec.inputs.view;
const {radius:modelR,springHeight:modelH,crossbarHeight:modelB,landmarkHeight:modelL}=modelSpec.inputs;
const modelSlits=slits(modelScene.name,modelView);
const modelHoles=modelScene.final.filter(e=>e.kind==='hole').map(e=>[(e.p[0]-modelView.x)/modelView.scale,(modelView.y-e.p[1])/modelView.scale]);
assert.equal(modelSlits.length,34);assert.deepEqual(modelHoles,[[-modelR,modelB],[modelR,modelB]]);
assert.equal(modelScene.final.filter(e=>e.kind==='virtual').length,0,'A has smooth joins and T junctions, not sharp two-arm corners');
assert.equal(new Set(modelSlits.map(s=>s.center.map(v=>v.toFixed(6)).join(','))).size,34,'Smooth joins must reuse their slits');
const modelRows=[[0,3],[4,6],[7,9],[9,19],[19,21],[22,24],[25,28],[29,33]];
for(const [arm,[first,last]] of modelRows.entries()) {
  const row=modelSlits.slice(first,last+1),curved=arm===3;
  const D=dist(row[0].center,row.at(-1).center),fit=curved?selectFit({p:3,R:modelR,sweep:Math.PI}):selectFit({p:3,D});
  assert(fit);assert(fit.exactCentre);assert.equal(row.length,fit.n+1);
  for(let i=0;i<row.length-1;i++)near(dist(row[i].center,row[i+1].center),i>=fit.i&&i<fit.i+fit.k?fit.correctedPitch:3);
  for(const slit of row) {
    if(curved) {
      near(dist(slit.center,[0,modelH]),modelR);
      const theta=Math.atan2(slit.center[1]-modelH,slit.center[0]);
      near(Math.sin(slit.angle-(theta-Math.PI/2+alpha)),0);
    } else {
      const tangent=Math.atan2(row.at(-1).center[1]-row[0].center[1],row.at(-1).center[0]-row[0].center[0]);
      near(Math.sin(slit.angle-tangent-alpha),0);
      near(arm<3?slit.center[0]:arm<7?slit.center[0]:slit.center[1],arm<3?-modelR:arm<7?modelR:modelB);
    }
  }
}
for(const slit of modelSlits)assert(has(modelSlits.map(s=>s.center),[-slit.center[0],slit.center[1]]),'A positions must balance across its centre');
for(const [a,b] of [[3,4],[24,25]]) {
  near(dist(modelSlits[a].center,modelSlits[b].center),3);
  near((modelSlits[a].center[1]+modelSlits[b].center[1])/2,modelL);
}
for(const [arm,indices] of [[0,[6,7,29]],[1,[21,22,33]]])for(const i of indices)near(dist(modelSlits[i].center,modelHoles[arm]),3);
near(dist(modelSlits[9].center,[-modelR,modelH]),0);near(dist(modelSlits[19].center,[modelR,modelH]),0);
const modelResidualFrame=modelScene.frames.find(f=>f.stage==='residuals');
const modelResidualValues=modelResidualFrame.elements.filter(e=>e.kind==='residual-value').map(e=>e.value);
assert.deepEqual(modelResidualValues,['0.25','0.50','0.50','-1.07','0.50','0.50','0.25','0.50']);
const modelCenter=e=>[(e.a[0]+e.b[0])/2,(e.a[1]+e.b[1])/2];
const modelInitial=modelScene.frames.find(f=>f.stage==='adjustment-start').elements.filter(e=>e.kind==='slit');
const modelFinal=modelScene.final.filter(e=>e.kind==='slit');
const modelFixed=[0,3,4,6,7,9,19,21,22,24,25,28,29,33];
let previousModelError=Infinity;
for(const f of modelScene.frames.filter(f=>['adjustment-start','planning-revision'].includes(f.stage))) {
  const row=f.elements.filter(e=>e.kind==='slit');assert.equal(row.length,34);
  for(const i of modelFixed)assert.deepEqual(row[i],modelInitial[i],'Fixed features must not move during fitting');
  assert.deepEqual(f.elements.filter(e=>e.kind==='hole'),modelScene.final.filter(e=>e.kind==='hole'));
  const error=row.reduce((sum,e,i)=>sum+dist(modelCenter(e),modelCenter(modelFinal[i])),0);
  assert(error<=previousModelError+1e-6);previousModelError=error;
  if(f.stage==='planning-revision')for(const [first,last] of modelRows)assert(row.slice(first,last+1).some((e,i)=>dist(modelCenter(e),modelCenter(modelInitial[first+i]))>0),'All spans must redistribute together');
}
near(previousModelError,0);
assert(!modelScene.final.some(e=>e.kind==='residual-dimension'));
assert(!modelScene.frames.some(f=>f.elements.some(e=>e.value==='Clearance checked'||e.kind==='accepted')));
assert.deepEqual(modelScene.final.filter(e=>e.kind==='notation-landmark').map(e=>e.value),['L1','L2']);
for(const [i,s] of modelSlits.entries()) {
  for(const hole of modelHoles)assert(pointSegmentDistance(hole,s.a,s.b)-(modelSpec.inputs.width+modelSpec.inputs.holeDiameter)/2>=modelSpec.inputs.margin);
  for(const other of modelSlits.slice(i+1))assert(segmentDistance(s.a,s.b,other.a,other.b)-modelSpec.inputs.width>=modelSpec.inputs.margin);
}
assert(dist(...modelHoles)-modelSpec.inputs.holeDiameter>=modelSpec.inputs.margin);
for(const hole of modelScene.final.filter(e=>e.kind==='hole'))assert.equal(modelScene.final.filter(e=>e.kind==='thread'&&(dist(e.a,hole.p)<1e-6||dist(e.b,hole.p)<1e-6)).length,3,'Each crossbar junction needs three thread connections');
const modelStages=new Map([
  ['guides','Mark landmarks'],['landmarks','Mark landmarks'],['fixed-features','Fixed landmark pairs'],
  ['junction-neighbours','Resolve junctions'],['junction-holes','Resolve junctions'],
  ['free-spans','Free spans'],['residuals','Redistribute residuals'],['adjustment-start','Redistribute residuals'],['planning-revision','Redistribute residuals']
]);
for(const f of modelScene.frames.filter(f=>modelStages.has(f.stage))) {
  const labels=f.elements.filter(e=>e.kind==='term-label');
  assert.equal(labels.length,1);assert.equal(labels[0].value,modelStages.get(f.stage));assert.deepEqual(labels[0].p,[300,435]);
}
const firstModelFrame=predicate=>modelScene.frames.findIndex(f=>f.elements.some(predicate));
const modelStageIndex=stage=>modelScene.frames.findIndex(f=>f.stage===stage);
for(const value of ['L1','L2'])assert.equal(firstModelFrame(e=>e.kind==='notation-landmark'&&e.value===value),modelStageIndex('landmarks'));
for(const i of [3,4,24,25])assert.equal(firstModelFrame(e=>e.kind==='slit'&&dist(modelCenter(e),modelCenter(modelFinal[i]))<1e-6),modelStageIndex('fixed-features'));
for(const i of [6,7,9,19,21,22,29,33])assert.equal(firstModelFrame(e=>e.kind==='slit'&&dist(modelCenter(e),modelCenter(modelFinal[i]))<1e-6),modelStageIndex('junction-neighbours'));
for(const hole of modelScene.final.filter(e=>e.kind==='hole'))assert.equal(firstModelFrame(e=>e.kind==='hole'&&dist(e.p,hole.p)<1e-6),modelStageIndex('junction-holes'));
assert.equal(modelScene.frames.find(f=>f.stage==='free-spans').elements.filter(e=>e.kind==='measurement').length,8);
assert.equal(modelScene.frames[0].delay,200);
assert.equal(modelScene.frames.filter(f=>f.stage==='planning-revision').reduce((sum,f)=>sum+f.delay,0),320);
assert.equal(modelScene.frames.find(f=>f.stage==='residuals').delay,240);


for(const s of scenes) {
  const entry=catalog.illustrations.find(i=>i.assets.some(a=>a.path.endsWith('/'+s.name)));
  const asset=entry.assets.find(a=>a.path.endsWith('/'+s.name)),animated=asset.animated??entry.animated;
  assert.equal(Boolean(s.frames.length),animated);
  if(animated) {
    const tempo=s.name==='model-solution'?modelSpec.inputs.durationScale:1;
    if(s.name==='problem-corner-bridge') {
      assert.equal(s.frames.length,62);
      assert.deepEqual(s.frames.filter(f=>f.delay===50).map(f=>f.stage),['short-bridge','long-bridge']);
      const holds=s.frames.filter(f=>f.delay===50);
      const midpoint=e=>[(e.a[0]+e.b[0])/2,(e.a[1]+e.b[1])/2];
      assert.deepEqual(holds[0].elements,s.final);
      assert.equal(s.frames.reduce((sum,f)=>sum+f.delay,0),528,'Bridge loop must last 5.28 seconds');
      const lengths=s.frames.map(f=>{const t=f.elements.filter(e=>e.kind==='thread')[count-1];return dist(t.a,t.b)/problemView.scale;});
      for(let i=1;i<=31;i++)assert(lengths[i]>lengths[i-1]);
      for(let i=32;i<62;i++)assert(lengths[i]<lengths[i-1]);
      assert(lengths.at(-1)-lengths[0]<.01,'Loop must return smoothly to the short hold');
      assert(s.frames.every(f=>f.delay===50||f.delay===7||f.delay===8));
      for(const [i,f] of holds.entries()) {
        const t=f.elements.filter(e=>e.kind==='thread')[count-1];
        near(dist(t.a,t.b)/problemView.scale,cornerInput.bridgeThreadLengths[i]);
      }
      for(const f of s.frames) {
        assert.equal(f.holeLightening,1);
        const row=f.elements.filter(e=>e.kind==='slit'),thread=f.elements.filter(e=>e.kind==='thread')[count-1];
        assert.deepEqual(row.slice(0,count),s.final.filter(e=>e.kind==='slit').slice(0,count));
        for(let i=count+1;i<row.length;i++)near(dist(midpoint(row[i]),midpoint(row[i-1]))/problemView.scale,3);
        const last=row[count];
        const end=f.elements.find(e=>e.kind==='notation-end');
        near(end.p[1]-midpoint(last)[1],12);
        const dx=thread.b[0]-thread.a[0],dy=thread.b[1]-thread.a[1],deg=Math.atan2(dy,dx)*180/Math.PI;
        assert.deepEqual(f.elements.filter(e=>e.kind==='thread-angle-value').map(e=>e.value),[deg,90-deg].map(a=>a.toFixed(1)+'\u00b0'));
        assert.equal(f.elements.find(e=>e.kind==='thread-length-value').value,(Math.hypot(dx,dy)/problemView.scale).toFixed(2));
        assert(displayElements(f.elements,1).filter(e=>e.kind==='slit'||e.kind==='thread-length-value').every(e=>e.color===theme.secondary));
      }
    } else {
    const threadFrames=s.frames.filter(f=>f.stage==='thread-reveal'),threadFrame=threadFrames.at(-1);
    assert.equal(threadFrames.length,1);
    threadFrames.forEach(f=>assert.equal(f.delay,400*tempo));
    assert(threadFrame,`${s.name} missing final thread reveal`);assert.equal(threadFrame.delay,400*tempo);
    assert.equal(s.frames.at(-2),threadFrame);assert.equal(s.frames.at(-1).stage,'reset');
    assert.deepEqual(threadFrame.elements,s.final);
    const fade=s.frames.filter(f=>f.stage==='thread-fade');assert.equal(fade.length,5*threadFrames.length);
    assert.equal(fade.reduce((sum,f)=>sum+f.delay,0),30*threadFrames.length*tempo);
    fade.forEach((f,i)=>{
      assert.equal(f.holeLightening,(i%5+1)/5);assert.deepEqual(f.elements,s.final);
      const shown=displayElements(f.elements,f.holeLightening),base=displayElements(f.elements,0);
      shown.forEach((e,j)=>{
        if(['slit','hole','virtual','proposal','measurement','dimension','gap-value','gap-dimension','span-label','span-dimension','thread-length-value','thread-length-dimension'].includes(e.kind)) {
          const original=base[j];
          const target=original.adjusted?theme.adjustedSecondary:theme.secondary;
          assert.equal(e.color,'#'+[1,3,5].map(k=>Math.round(parseInt(original.color.slice(k,k+2),16)+(parseInt(target.slice(k,k+2),16)-parseInt(original.color.slice(k,k+2),16))*f.holeLightening).toString(16).padStart(2,'0')).join('').toUpperCase());
          assert.deepEqual({...e,color:original.color},original);
        } else assert.deepEqual(e,base[j]);
      });
    });
    assert(displayElements(s.final).filter(e=>['slit','hole','virtual','proposal','measurement','dimension','gap-value','gap-dimension','span-label','span-dimension','thread-length-value','thread-length-dimension'].includes(e.kind)).every(e=>e.color===(e.adjusted?theme.adjustedSecondary:theme.secondary)));
    for(const f of s.frames.filter(f=>!['thread-reveal','thread-fade'].includes(f.stage)))assert(!f.elements.some(e=>e.kind==='thread'));
    }
    const openings=s.final.filter(e=>['slit','hole','proposal'].includes(e.kind)),threads=s.final.filter(e=>e.kind==='thread');
    const expected= ['axiom-closure','model-solution'].includes(s.name)?openings.length:openings.length-(s.name==='matched-guides'?2:1);
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
    const renderedFrames=presented.find(p=>p.name===s.name).frames;
    assert.equal(images.length,renderedFrames.length);assert.equal(controls.length,images.length);
    assert.deepEqual(controls.map(b=>b.bytes.readUInt16LE(4)),renderedFrames.map(f=>f.delay));
    assert(gif.includes(Buffer.from([0x21,0xff,11,...Buffer.from('NETSCAPE2.0'),3,1,0,0,0])));
    assert(new Set(images.map(b=>crypto.createHash('sha256').update(b.bytes).digest('hex'))).size>=5);
    near(gif.readUInt16LE(6),600);near(gif.readUInt16LE(8),750);
  } else {
    const gifPath=new URL(`examples/illustrated/assets/${s.name}.gif`,root);
    if(asset.staticGif) {
      assert(s.staticGif);
      const gif=fs.readFileSync(gifPath);
      assert.equal(gifBlocks(gif).blocks.filter(b=>b.kind==='image').length,1,'Static GIF must contain exactly the final still');
      assert(!gif.includes(Buffer.from('NETSCAPE2.0')),'Static GIF must not loop');
      assert.equal(gif.readUInt16LE(6),600);assert.equal(gif.readUInt16LE(8),750);
    } else assert(!fs.existsSync(gifPath),'Static figures must not retain obsolete GIFs');
    for(const leader of s.final.filter(e=>e.kind==='term-leader'))assert(leader.a[0]===leader.b[0]||leader.a[1]===leader.b[1],`${s.name} has an oblique callout`);
  }
  const png=fs.readFileSync(new URL(`examples/illustrated/assets/${s.name}.png`,root));
  assert.equal(png.readUInt32BE(16),600);assert.equal(png.readUInt32BE(20),750);
  const source=readSvg(s.name).source;
  const terms=catalog.illustrations.find(i=>i.assets.some(a=>a.path.endsWith('/'+s.name)))?.terms??[];
  const termMatches=(value,term)=>value===term||(value.startsWith(term+' ')&&/^\d+\.\d{2}$/.test(value.slice(term.length+1)));
  for(const match of source.matchAll(/<text[^>]*>([^<]+)<\/text>/g))assert(/^(?:\d+(?:\.\d+)?|L[1-9]\d*|s|e|j|ST-1(?:-A)?)$/.test(match[1])||
    (s.name.startsWith('problem-corner-')&&/^\d+\.\d\u00b0$/.test(match[1]))||terms.some(term=>termMatches(match[1],term)),'Uncatalogued text in figure');
  const labels=s.final.filter(e=>e.type==='text');
  for(const elements of [s.final,...s.frames.map(f=>f.elements)]) {
    for(const e of elements.filter(e=>e.kind==='adjustment-mark'||e.adjusted))assert.equal(e.color,'adjusted');
    for(const e of displayElements(elements).filter(e=>e.kind==='adjusted-gap'))assert.equal(e.color,theme.adjusted);
    for(const e of displayElements(elements).filter(e=>e.adjusted&&!['adjustment-mark','adjusted-gap'].includes(e.kind)))assert.equal(e.color,elements.some(v=>v.kind==='thread')?theme.adjustedSecondary:theme.adjusted);
  }
  const allLabels=[...labels,...s.frames.flatMap(f=>f.elements.filter(e=>e.type==='text'))];
  for(const term of terms)assert(allLabels.some(e=>termMatches(e.value,term)),`${s.name} missing ${term}`);
  if(s.name!=='terms-slit') {
    assert(labels.some(e=>e.kind==='notation-start'&&e.value==='s'),`${s.name} needs a start`);
    assert(s.final.filter(e=>e.kind==='direction').length>=3,`${s.name} needs a direction arrow`);
    if(s.name!=='axiom-closure')assert(labels.some(e=>e.kind==='notation-end'&&e.value==='e'),`${s.name} needs an end`);
  }
  if(s.final.some(e=>e.kind==='hole')||s.name==='axiom-smooth')assert(labels.some(e=>e.value==='j'),`${s.name} needs its junction label`);
  for(const role of ['notation-start','notation-end','notation-id'].filter(role=>s.name!=='problem-corner-bridge'||role!=='notation-end'))for(const f of s.frames)
    assert.deepEqual(f.elements.filter(e=>e.kind===role),s.final.filter(e=>e.kind===role),`${s.name} notation moved during reveal`);
  if(s.name==='matched-guides') {
    assert.deepEqual(labels.filter(e=>e.kind==='notation-id').map(e=>e.value),['ST-1','ST-1-A']);
    assert.equal(s.final.filter(e=>e.kind==='id-box').length,8);
  }
  for(const f of [...s.frames,{elements:s.final}])for(const e of f.elements) {
    for(const p of e.type==='line'?[e.a,e.b]:e.type==='polygon'?e.points:[e.p])assert(p[0]>=0&&p[0]<=600&&p[1]>=0&&p[1]<=(['model-solution','fit-rejected'].includes(s.name)?600:375),`${s.name} clips an element`);
  }
}
console.log(`Illustrations valid: ${scenes.filter(s=>s.frames.length).length} moving GIFs, ${scenes.filter(s=>!s.frames.length).length} static figures, geometry, fixed constraints, corner construction, shared openings, clearance pass/fail, loop timing and still exports.`);
