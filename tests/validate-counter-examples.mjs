// Check the reconstruction and nominal wallet layout independently of rendering.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createScenes,absoluteStitchLengthDeviation} from '../examples/counter_examples/scenes.mjs';
import {gifBlocks,svg,portraitScenes,displayElements,colorConfig,themeFor} from '../examples/illustrated/scenes.mjs';

const root=new URL('../',import.meta.url),scenes=createScenes();
const near=(a,b)=>assert(Math.abs(a-b)<1e-6,`${a} != ${b}`);
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const midpoint=e=>e.type==='circle'?e.p:[(e.a[0]+e.b[0])/2,(e.a[1]+e.b[1])/2];
const world=(p,v)=>[(p[0]-v.x)/v.scale,(v.y-p[1])/v.scale];
const angle=e=>Math.atan2(e.b[1]-e.a[1],e.b[0]-e.a[0]);
const slits=s=>s.final.filter(e=>e.kind==='slit');

// Dimensions are indivisible annotations; every affected real slit keeps its I marks.
for(const s of scenes)for(const {elements} of [...s.frames,{elements:s.final}]) {
  const displayed=displayElements(elements,1),groups=new Map();
  for(const e of displayed.filter(e=>e.dimensionId)) {
    if(!groups.has(e.dimensionId))groups.set(e.dimensionId,[]);
    groups.get(e.dimensionId).push(e);
  }
  for(const group of groups.values()) {
    const values=group.filter(e=>e.dimensionPart==='value');
    assert.equal(values.length,1,`${s.name}: dimension needs one value`);
    assert(group.filter(e=>e.dimensionPart==='bracket').length>=3,`${s.name}: dimension needs its bracket and ticks`);
    assert.equal(new Set(group.map(e=>e.color)).size,1,`${s.name}: bracket and value must fade together`);
    assert(/^\d+\.\d{2}$/.test(values[0].value));
    assert(!values[0].bold);
  }
  const highlights=elements.filter(e=>e.kind==='adjusted-gap'),marks=elements.filter(e=>e.kind==='adjustment-mark');
  for(const slit of elements.filter(e=>e.kind==='slit')) {
    const affected=highlights.some(e=>distance(midpoint(slit),e.a)<1e-6||distance(midpoint(slit),e.b)<1e-6);
    const caps=marks.filter(e=>distance(midpoint(e),slit.a)<1e-6||distance(midpoint(e),slit.b)<1e-6);
    assert.equal(caps.length,affected?2:0,`${s.name}: I marks must identify the current adjusted gaps`);
  }
  assert(marks.every(e=>e.color==='adjusted'));
}

const corner=scenes[0],cv={x:360,y:85,scale:25},openings=slits(corner);
assert.equal(openings.length,7);assert(!corner.final.some(e=>['virtual','hole'].includes(e.kind)));
const rows=[openings.slice(0,3),openings.slice(3,6)],shared=openings[6];
assert.equal(corner.frames[0].stage,'top-row');
assert.deepEqual(corner.frames[0].elements.filter(e=>e.kind==='slit'),rows[0]);
const beforeMirror=corner.frames.find(f=>f.stage==='vertical-rear-style').elements.filter(e=>e.kind==='slit').slice(3);
const mirrorFrames=corner.frames.filter(f=>f.stage==='mirror-vertical');assert.equal(mirrorFrames.length,30);
for(const [i,e] of beforeMirror.entries()) {
  near(e.a[0]+rows[1][i].a[0],2*cv.x);near(e.b[0]+rows[1][i].b[0],2*cv.x);
  near(e.a[1],rows[1][i].a[1]);near(e.b[1],rows[1][i].b[1]);
}
for(const f of corner.frames)assert.deepEqual(f.elements.filter(e=>e.kind==='slit').slice(0,3),rows[0],'Top row must remain punched throughout');
for(const f of mirrorFrames) {
  const moving=f.elements.filter(e=>e.kind==='slit').slice(3);assert.equal(moving.length,3);
  moving.forEach((e,i)=>near(distance(midpoint(e),midpoint(rows[1][i])),0));
  assert(!f.elements.some(e=>e.kind==='thread'));
}
assert.deepEqual(mirrorFrames.at(-1).elements.filter(e=>e.kind==='slit').slice(3),rows[1]);
assert(corner.frames.findIndex(f=>f.stage==='diagonal-shared-slit')>corner.frames.findIndex(f=>f.stage==='vertical-front-style'));
near(distance(midpoint(shared),[360,85]),0);
near(distance(shared.a,shared.b)/cv.scale,1.5);
near(Math.abs(shared.b[0]-shared.a[0]),Math.abs(shared.b[1]-shared.a[1]));
for(const [a,row] of rows.entries())for(const [i,e] of row.entries()) {
  const c=world(midpoint(e),cv);near(c[a===0?1:0],0);near(c[a],-9+3*i);
  near(distance(e.a,e.b)/cv.scale,1.5);near(angle(e),(a===0?40:50)*Math.PI/180);
}
const threads=corner.final.filter(e=>e.kind==='thread');assert.equal(threads.length,6);
near(distance(threads[0].a,rows[0][0].b),0);
near(distance(threads[0].b,rows[0][1].a),0);
near(angle(threads[0]),angle(threads[1]));near(angle(threads[4]),angle(threads[5]));
assert(angle(threads[2])<angle(threads[1]));
assert(angle(threads[3])>angle(threads[4]));
near(angle(threads[1])-angle(threads[2]),angle(threads[3])-angle(threads[4]));
near(distance(threads[2].b,shared.a),0);near(distance(threads[3].a,shared.b),0);
assert(threads[2].width>threads[1].width&&threads[3].width>threads[4].width);

const wallet=scenes[1],wv={x:435,y:72,scale:16};
const real=slits(wallet),virtual=wallet.final.filter(e=>e.kind==='virtual'),holes=wallet.final.filter(e=>e.kind==='hole');
assert.equal(real.length,13);assert.equal(virtual.length,2);assert.equal(holes.length,7);
const [ci,co]=virtual.map(e=>world(midpoint(e),wv)),joint=world(holes.at(-1).p,wv);
near(distance(world(virtual[0].a,wv),joint),0);near(distance(world(virtual[1].b,wv),joint),0);
near(ci[1],0);near(co[0],0);
const top=real.slice(0,5),right=real.slice(5,9).toReversed(),bottom=real.slice(9);
const hLeft=world(holes[0].p,wv),hRight=world(holes[3].p,wv);
for(const [a,row] of [top,right,bottom].entries())for(const [i,e] of row.entries()) {
  const c=world(midpoint(e),wv);near(distance(e.a,e.b)/wv.scale,1.5);
  near(Math.cos(angle(e)),Math.cos([40,130,220][a]*Math.PI/180));
  near(Math.sin(angle(e)),Math.sin([40,130,220][a]*Math.PI/180));
  if(a===0)near(c[1],0);else if(a===1)near(c[0],0);else near(c[1],world(midpoint(bottom[0]),wv)[1]);
  if(i)near(distance(c,world(midpoint(row[i-1]),wv)),3);
}
near(distance(world(midpoint(top.at(-1)),wv),ci),3);
near(distance(world(midpoint(right[0]),wv),co),3);
near(distance(world(midpoint(right.at(-1)),wv),hRight),3);
near(distance(world(midpoint(bottom[0]),wv),hLeft),3);
near(distance(world(midpoint(top[0]),wv),ci),5*3);
near(distance(world(midpoint(right.at(-1)),wv),co)+distance(world(midpoint(right.at(-1)),wv),hRight),5*3);
near(distance(world(midpoint(bottom.at(-1)),wv),world(midpoint(bottom[0]),wv))+distance(world(midpoint(bottom[0]),wv),hLeft),4*3);
assert(!wallet.final.some(e=>e.kind==='adjustment-mark'));
for(const i of [0,3])for(const j of [0,1])near(distance(holes[i+j].p,holes[i+j+1].p)/wv.scale,1.5);
for(const i of [0,1,2])near(distance(holes[i].p,holes[i+3].p)/wv.scale,3);
assert.equal(wallet.frames.length,0,'Case diagram must be static');

const diagonalWallet=scenes[2],diagonalSlits=slits(diagonalWallet),diagonalHoles=diagonalWallet.final.filter(e=>e.kind==='hole');
assert.equal(diagonalWallet.frames.length,0);assert.equal(diagonalSlits.length,14);
assert(!diagonalWallet.final.some(e=>['virtual','adjustment-mark'].includes(e.kind)));
diagonalHoles.forEach((e,i)=>{
  near(e.p[0]-diagonalHoles[0].p[0],holes[i].p[0]-holes[0].p[0]);
  near(e.p[1]-diagonalHoles[0].p[1],holes[i].p[1]-holes[0].p[1]);
});
const diagonalJoint=diagonalSlits.at(-1),diagonalVertex=world(midpoint(diagonalJoint),wv);
near(distance(diagonalVertex,co),0);
near(Math.abs(diagonalJoint.b[0]-diagonalJoint.a[0]),Math.abs(diagonalJoint.b[1]-diagonalJoint.a[1]));
for(const [a,row] of [diagonalSlits.slice(0,5),diagonalSlits.slice(5,9).toReversed(),diagonalSlits.slice(9,13)].entries()) {
  for(const [i,e] of row.entries()) {
    near(distance(e.a,e.b)/wv.scale,1.5);
    if(i)near(distance(midpoint(e),midpoint(row[i-1]))/wv.scale,3);
    if(a===1)near(distance(midpoint(e),midpoint(right[i])),0);
    else if(a===0)near(world(midpoint(e),wv)[1],diagonalVertex[1]);
    else near(midpoint(e)[1],midpoint(row[0])[1]);
  }
}
near(distance(midpoint(diagonalSlits[4]),midpoint(diagonalJoint))/wv.scale,3);
near(distance(midpoint(diagonalSlits[8]),midpoint(diagonalJoint))/wv.scale,3);

for(const layout of [wallet,diagonalWallet]) {
  const openings=slits(layout),circles=layout.final.filter(e=>e.kind==='hole'),drawn=layout.final.filter(e=>e.kind==='thread');
  const connection=(a,b)=>assert(drawn.some(e=>distance(e.a,a)<1e-6&&distance(e.b,b)<1e-6),'Wrong visible thread tips');
  for(const indices of [[0,1,2,3,4],[8,7,6,5],[9,10,11,12]]) {
    for(let i=1;i<indices.length;i++)connection(openings[indices[i-1]].b,openings[indices[i]].a);
  }
  connection(openings[5].b,circles[3].p);
  connection(circles[0].p,openings[9].a);
  near(distance(midpoint(openings[5]),circles[3].p)/wv.scale,3);
  near(distance(circles[0].p,midpoint(openings[9]))/wv.scale,3);
  // The H joins must carry the same angle as the neighbouring ordinary thread.
  near(angle({a:openings[5].b,b:circles[3].p}),angle({a:openings[6].b,b:openings[5].a}));
  near(angle({a:circles[0].p,b:openings[9].a}),angle({a:openings[9].b,b:openings[10].a}));
}

const loeweReference=scenes[3],loeweSolved=scenes[4],lv={x:(600-8.1*25)/2,y:80,scale:25};
assert.equal(loeweReference.frames.length,0);assert.equal(loeweSolved.frames.length,0);
assert.deepEqual(loeweReference.final.filter(e=>e.kind==='guide'),loeweSolved.final.filter(e=>e.kind==='guide'));
const lr=slits(loeweReference),ls=slits(loeweSolved),lh=loeweSolved.final.filter(e=>e.kind==='hole'),lvirtual=loeweSolved.final.filter(e=>e.kind==='virtual');
assert.equal(lr.length,9);assert.equal(ls.length,8);assert.equal(lh.length,2);assert.equal(lvirtual.length,4);
const referenceHoles=loeweReference.final.filter(e=>e.kind==='hole');assert.equal(referenceHoles.length,1);
near(distance(world(midpoint(lr.at(-1)),lv),[0,0]),0);
near(distance(world(referenceHoles[0].p,lv),[8.1,0]),0);
const middle=loeweReference.final.filter(e=>e.kind==='thread').find(e=>distance(e.a,lr[3].b)<1e-6&&distance(e.b,lr[4].a)<1e-6);
assert(middle);near(middle.a[1],middle.b[1]);assert(middle.b[0]>middle.a[0]);
for(const [v,tip,j] of [[0,'a',0],[1,'b',0],[2,'a',1],[3,'b',1]])near(distance(lvirtual[v][tip],lh[j].p),0);
for(const [realIndex,virtualIndex] of [[2,0],[3,1],[4,2],[5,3]])near(distance(midpoint(ls[realIndex]),midpoint(lvirtual[virtualIndex]))/lv.scale,3);
for(const [i,e] of ls.entries()) {
  const c=world(midpoint(e),lv),expectedAngle=(i<3?-130:i<5?-40:50)*Math.PI/180;
  near(angle(e),expectedAngle);near(distance(e.a,e.b)/lv.scale,1.5);
  if(i<3){near(c[0],0);assert(c[1]>=-9&&c[1]<=0);}
  else if(i<5){near(c[1],0);assert(c[0]>=0&&c[0]<=8.1);}
  else{near(c[0],8.1);assert(c[1]>=-9&&c[1]<=0);}
}
for(const [i,j] of [[0,1],[1,2],[5,6],[6,7]])near(distance(midpoint(ls[i]),midpoint(ls[j]))/lv.scale,3);
const topGap=distance(midpoint(ls[3]),midpoint(ls[4]))/lv.scale;
near(topGap,8.1-6+1.5*Math.cos(40*Math.PI/180));assert(topGap>=2.7&&topGap<=3.3);
assert.equal(loeweSolved.final.filter(e=>e.kind==='adjustment-mark').length,4);

const speedyReference=scenes[5],speedySolved=scenes[6],sv={x:300,y:48,scale:11.2};
const vertices=[[-5.4,0],[5.4,0],[10.8,-16.2],[0,-25.2],[-10.8,-16.2]];
const spVirtual=speedySolved.final.filter(e=>e.kind==='virtual'),spHoles=speedySolved.final.filter(e=>e.kind==='hole');
assert.equal(slits(speedyReference).length,26);assert.equal(slits(speedySolved).length,21);
assert.equal(speedyReference.final.filter(e=>e.kind==='hole').length,0);
assert.equal(spHoles.length,5);assert.equal(spVirtual.length,10);
assert.deepEqual(speedyReference.final.filter(e=>e.kind==='guide'),speedySolved.final.filter(e=>e.kind==='guide'));
const vector=(a,b)=>[b[0]-a[0],b[1]-a[1]],unit=v=>v.map(x=>x/Math.hypot(...v));
const tangents=vertices.map((v,i)=>unit(vector(v,vertices[(i+1)%5])));
function sameLean(slit,t) {
  const u=unit(vector(world(slit.a,sv),world(slit.b,sv)));
  near(t[0]*u[0]+t[1]*u[1],Math.cos(40*Math.PI/180));
  near(t[0]*u[1]-t[1]*u[0],Math.sin(40*Math.PI/180));
}
for(const [i,v] of vertices.entries()) {
  const next=(i+1)%5,previous=(i+4)%5;
  const corner=slits(speedyReference).filter(e=>distance(world(midpoint(e),sv),v)<1e-6);assert.equal(corner.length,1);
  sameLean(corner[0],unit([tangents[previous][0]+tangents[i][0],tangents[previous][1]+tangents[i][1]]));
  near(distance(spVirtual[2*i].a,spHoles[i].p),0);near(distance(spVirtual[2*i+1].b,spHoles[i].p),0);
  sameLean(spVirtual[2*i],tangents[previous]);sameLean(spVirtual[2*i+1],tangents[i]);
  for(const layout of [speedyReference,speedySolved]) {
    const row=slits(layout).filter(e=>{
      const c=world(midpoint(e),sv);
      return pointSegment(c,v,vertices[next])<1e-6&&distance(c,v)>1e-6&&distance(c,vertices[next])>1e-6;
    }).sort((a,b)=>distance(world(midpoint(a),sv),v)-distance(world(midpoint(b),sv),v));
    row.forEach(e=>{sameLean(e,tangents[i]);near(distance(e.a,e.b)/sv.scale,1.5);});
    if(layout===speedySolved) {
      assert.equal(row.length,[3,5,4,4,5][i]);
      near(distance(midpoint(row[0]),midpoint(spVirtual[2*i+1]))/sv.scale,3);
      near(distance(midpoint(row.at(-1)),midpoint(spVirtual[2*next]))/sv.scale,3);
      const gaps=row.slice(1).map((e,j)=>distance(midpoint(e),midpoint(row[j]))/sv.scale);
      assert(gaps.every(g=>g>=2.7-1e-6&&g<=3.3+1e-6));
      assert.equal(gaps.filter(g=>Math.abs(g-3)>1e-6).length,[1,1,1,2,1][i]);
    }
  }
}
for(const layout of [speedyReference,speedySolved]) {
  assert.equal(layout.frames.length,0);
  const points=layout.final.filter(e=>['slit','hole'].includes(e.kind)),threads=layout.final.filter(e=>e.kind==='thread');
  assert.equal(threads.length,points.length);
  assert.equal(layout.final.filter(e=>e.kind==='notation-junction').length,5);
  assert.equal(layout.final.filter(e=>e.kind==='notation-start').length,1);
  assert(!layout.final.some(e=>e.kind==='notation-end'));
  const junctionLabels=layout.final.filter(e=>e.kind==='notation-junction');
  for(let i=0;i<2;i++) {
    const joint=layout===speedySolved?spHoles[i].p:[sv.x+vertices[i][0]*sv.scale,sv.y-vertices[i][1]*sv.scale];
    near(junctionLabels[i].p[0]-joint[0],i===0?-20:20);near(junctionLabels[i].p[1]-joint[1],-8);
  }
  for(const p of points) {
    const incoming=p.type==='circle'?p.p:p.a,outgoing=p.type==='circle'?p.p:p.b;
    assert.equal(threads.filter(e=>distance(e.b,incoming)<1e-6).length,1);
    assert.equal(threads.filter(e=>distance(e.a,outgoing)<1e-6).length,1);
  }
}

const fagliano=scenes[7],fv={x:300,y:265,scale:13.5},radius=24,sweep=40*Math.PI/180;
const circleOffset=radius*Math.cos(sweep),halfWidth=radius-circleOffset;
const fRows=elements=>[0,1].map(arm=>elements.filter(e=>['slit','virtual'].includes(e.kind)&&
  (e.b[1]<e.a[1]?0:1)===arm).sort((a,b)=>midpoint(b)[1]-midpoint(a)[1]));
const finalRows=fRows(fagliano.final),fHole=fagliano.final.find(e=>e.kind==='hole');
assert.equal(slits(fagliano).length,16);
assert.equal(fagliano.final.filter(e=>e.kind==='virtual').length,0);
near(distance(world(fHole.p,fv),[0,radius*Math.sin(sweep)]),0);
for(const f of fagliano.frames)assert.deepEqual(f.elements.find(e=>e.kind==='hole'),fHole);
assert.equal(fagliano.final.filter(e=>e.kind==='hole').length,1);
for(const [arm,row] of finalRows.entries()) {
  assert.equal(row.length,8);
  for(const [i,e] of row.entries()) {
    const centre=world(midpoint(e),fv),u=unit(vector(world(e.a,fv),world(e.b,fv)));
    near(distance(e.a,e.b)/fv.scale,1.5);
    if(i<3) {near(centre[0],arm===0?-halfWidth:halfWidth);near(centre[1],-6+3*i);}
    else {
      near(distance(centre,[arm===0?circleOffset:-circleOffset,0]),radius);
      assert(centre[1]>0);
      if(e.kind==='slit')assert(centre[1]<radius*Math.sin(sweep));
    }
    const t=i<3?0:Math.asin(centre[1]/radius);
    const tangent=arm===0?[Math.sin(t),Math.cos(t)]:[Math.sin(t),-Math.cos(t)];
    near(tangent[0]*u[0]+tangent[1]*u[1],Math.cos(sweep));
    near(tangent[0]*u[1]-tangent[1]*u[0],Math.sin(sweep));
  }
  const gaps=row.slice(1).map((e,i)=>distance(midpoint(e),midpoint(row[i]))/fv.scale);
  for(const i of [0,1,2])near(gaps[i],3);
  const chord=gaps[3];assert(chord>=2.7&&chord<3);
  for(const i of [4,5,6])near(gaps[i],chord);
  near(chord,2.7491356421873347);
  near(distance(midpoint(row.at(-1)),fHole.p)/fv.scale,chord);
}
for(let i=0;i<8;i++) {
  near(midpoint(finalRows[0][i])[1],midpoint(finalRows[1][i])[1]);
  near(midpoint(finalRows[0][i])[0]+midpoint(finalRows[1][i])[0],2*fv.x);
}
const firstComplete=fagliano.frames.findIndex(f=>f.stage==='arm-0-nominal');
for(const f of fagliano.frames.slice(firstComplete,-1)) {
  const rows=fRows(f.elements);
  rows.forEach((row,arm)=>assert.deepEqual(row.slice(0,3),finalRows[arm].slice(0,3),'Straight rows moved'));
  const labels=f.elements.filter(e=>e.kind==='gap-value');
  const adjustedChords=rows.filter(row=>row.length>=5)
    .map(row=>distance(midpoint(row[3]),midpoint(row[4]))/fv.scale)
    .filter(chord=>Math.abs(chord-3)>1e-6);
  assert.deepEqual(labels.map(e=>e.value),adjustedChords.map(chord=>chord.toFixed(2)),
    'Show one representative per compressed arm; omit nominal rows');
}
for(const arm of [0,1]) {
  const overrun=fagliano.frames.find(f=>f.stage===`arm-${arm}-overrun`),trial=fRows(overrun.elements)[arm];
  assert.equal(trial.length,8);
  for(let i=1;i<trial.length;i++)near(distance(midpoint(trial[i]),midpoint(trial[i-1]))/fv.scale,3);
  const trialHole=overrun.elements.find(e=>e.kind==='trial-hole');
  assert(trialHole);
  near(distance(midpoint(trial.at(-1)),trialHole.p)/fv.scale,3);
  let residual=distance(trialHole.p,fHole.p);
  const moving=fagliano.frames.filter(f=>f.stage===`arm-${arm}-compress`);assert.equal(moving.length,30);
  for(const f of moving) {
    const rows=fRows(f.elements),row=rows[arm];
    const terminal=f.elements.find(e=>e.kind==='trial-hole');
    const next=terminal?distance(terminal.p,fHole.p):0;
    assert(next<residual);residual=next;
    near(distance(midpoint(row[2]),midpoint(row[3]))/fv.scale,3);

    const chord=distance(midpoint(row[3]),midpoint(row[4]))/fv.scale;
    for(let i=5;i<=7;i++)near(distance(midpoint(row[i-1]),midpoint(row[i]))/fv.scale,chord);
    near(distance(midpoint(row[7]),terminal?terminal.p:fHole.p)/fv.scale,chord);
    if(arm===1)assert.deepEqual(rows[0],finalRows[0],'Left arm changed during right compression');
  }
  near(residual,0);
}
assert(fagliano.frames.findIndex(f=>f.stage==='arm-0-settled')<fagliano.frames.findIndex(f=>f.stage==='arm-1-nominal'));

const faglianoMirrored=scenes.find(s=>s.name==='fagliano-tip-mirrored');
assert.equal(faglianoMirrored.frames.length,0);
assert.equal(slits(faglianoMirrored).length,16);
assert.equal(faglianoMirrored.final.filter(e=>e.kind==='hole').length,1);
assert.equal(faglianoMirrored.final.filter(e=>e.kind==='virtual').length,0);
for(const kind of ['hole','guide','alignment','leather-edge','adjusted-gap','gap-value'])assert.deepEqual(
  faglianoMirrored.final.filter(e=>e.kind===kind),fagliano.final.filter(e=>e.kind===kind));
slits(faglianoMirrored).forEach((e,i)=>near(distance(midpoint(e),midpoint(slits(fagliano)[i])),0));
const reflect=p=>[2*fv.x-p[0],p[1]];
for(const kind of ['slit','thread']) {
  const elements=faglianoMirrored.final.filter(e=>e.kind===kind);
  const left=elements.filter(e=>midpoint(e)[0]<fv.x),right=elements.filter(e=>midpoint(e)[0]>fv.x);
  assert.equal(left.length,8);assert.equal(right.length,8);
  for(const e of left)assert(right.some(r=>distance(reflect(e.a),r.b)<1e-6&&distance(reflect(e.b),r.a)<1e-6),
    `${kind}: right side must reflect the left with reversed travel`);
  const originalLeft=fagliano.final.filter(e=>e.kind===kind&&midpoint(e)[0]<fv.x);
  assert.deepEqual(left,originalLeft,'Left stitching must remain unchanged');
}

const faglianoSolved=scenes[8],solvedRows=fRows(faglianoSolved.final);
assert.equal(faglianoSolved.frames.length,0);
const solvedHole=faglianoSolved.final.find(e=>e.kind==='hole');
assert(solvedHole.p[0]>fv.x);
for(const [arm,row] of solvedRows.entries())near(distance(row.at(-1)[arm===0?'a':'b'],solvedHole.p),0);
for(const kind of ['guide','alignment'])assert.deepEqual(
  faglianoSolved.final.filter(e=>e.kind===kind),fagliano.final.filter(e=>e.kind===kind));
for(const [arm,row] of solvedRows.entries()) {
  assert.equal(row.length,finalRows[arm].length+1);
  assert.deepEqual(row.slice(0,4),finalRows[arm].slice(0,4));
  const gaps=row.slice(1).map((e,i)=>distance(midpoint(e),midpoint(row[i]))/fv.scale);
  for(const i of [0,1,2,7])near(gaps[i],3);
  const free=gaps.slice(3,7),adjusted=free.filter(g=>Math.abs(g-3)>1e-6);
  assert.equal(adjusted.length,arm===0?1:4);
  adjusted.forEach(g=>{assert(g>=2.7&&g<=3.3);near(g,arm===0?2.7469979232:2.7290148486);});
  // The free span's angular residual requires this many gaps at the 10% limit.
  const residual=Math.abs(free.reduce((sum,g)=>sum+2*Math.asin(g/(2*radius)),0)-4*2*Math.asin(3/(2*radius)));
  assert.equal(Math.ceil(residual/(2*Math.asin(3/(2*radius))-2*Math.asin(2.7/(2*radius)))-1e-9),adjusted.length);
  if(arm===0){near(free[0],3);near(free[1],3);near(free[3],3);}
  for(const e of row.slice(3)) {
    const centre=world(midpoint(e),fv),u=unit(vector(world(e.a,fv),world(e.b,fv)));
    near(distance(centre,[arm===0?circleOffset:-circleOffset,0]),radius);
    if(e.kind==='slit')assert(centre[1]<radius*Math.sin(sweep));
    const t=Math.asin(centre[1]/radius),tangent=arm===0?[Math.sin(t),Math.cos(t)]:[Math.sin(t),-Math.cos(t)];
    near(tangent[0]*u[1]-tangent[1]*u[0],Math.sin(sweep));
    near(tangent[0]*u[0]+tangent[1]*u[1],Math.cos(sweep));
  }
}
assert.deepEqual(faglianoSolved.final.filter(e=>e.kind==='gap-value').map(e=>e.value),['2.75','2.73']);
assert(faglianoSolved.final.filter(e=>e.kind==='gap-value').every(e=>e.adjusted&&e.color==='adjusted'));
for(const name of ['loewe-hanger-autostitch','lv-speedy-chape-autostitch','fagliano-tip-compression','fagliano-tip-autostitch']) {
  const highlighted=scenes.find(s=>s.name===name).final.filter(e=>e.kind==='adjusted-gap');
  assert(highlighted.length>0,`${name}: adjusted gaps must appear on the guide`);
  assert(highlighted.every(e=>e.color==='adjusted'));
}

function pointSegment(p,a,b) {
  const d=[b[0]-a[0],b[1]-a[1]],t=Math.max(0,Math.min(1,((p[0]-a[0])*d[0]+(p[1]-a[1])*d[1])/(d[0]*d[0]+d[1]*d[1])));
  return distance(p,[a[0]+t*d[0],a[1]+t*d[1]]);
}
function segmentDistance(a,b,c,d) {
  const cross=(p,q,r)=>(q[0]-p[0])*(r[1]-p[1])-(q[1]-p[1])*(r[0]-p[0]);
  if(cross(a,b,c)*cross(a,b,d)<0&&cross(c,d,a)*cross(c,d,b)<0)return 0;
  return Math.min(pointSegment(a,c,d),pointSegment(b,c,d),pointSegment(c,a,b),pointSegment(d,a,b));
}
// Full-layout clearance, including the external circular decoration.
for(const [layout,v] of [[wallet,wv],[diagonalWallet,wv],[loeweReference,lv],[loeweSolved,lv],[speedyReference,sv],[speedySolved,sv],[fagliano,fv],[faglianoSolved,fv],[faglianoMirrored,fv]]) {
const axes=slits(layout).map(e=>[world(e.a,v),world(e.b,v)]),centres=layout.final.filter(e=>e.kind==='hole').map(e=>world(e.p,v));
for(const [i,[a,b]] of axes.entries()) {
  for(const [c,d] of axes.slice(i+1))assert(segmentDistance(a,b,c,d)-.3>=.2);
  for(const c of centres)assert(pointSegment(c,a,b)-.15-.25>=.2);
}
for(const [i,c] of centres.entries())for(const d of centres.slice(i+1))assert(distance(c,d)-.5>=.2);
}

// Wallet edges follow the guides at the same offset, even when a construction shifts a row.
for(const layout of [wallet,diagonalWallet]) {
  const edge=layout.final.filter(e=>e.kind==='leather-edge'),guide=layout.final.filter(e=>e.kind==='guide');
  near((guide[0].a[1]-edge[0].a[1])/wv.scale,2.2);
  near((edge[1].a[0]-guide[1].a[0])/wv.scale,2.2);
  near((edge[2].a[1]-guide[2].a[1])/wv.scale,2.2);
}
const walletCanvases=portraitScenes(scenes).filter(s=>s.name.startsWith('sellier-wallet')).map(s=>s.canvas);
near(walletCanvases[0].scale,walletCanvases[1].scale);
// Piece surfaces remain behind the stitching and fixed through every phase.
for(const [reference,solution] of [[2,1],[3,4],[5,6],[7,8]]) {
  const edge=scenes[reference].final.filter(e=>e.kind==='leather-edge');
  const fill=scenes[reference].final.filter(e=>e.kind==='leather-fill');
  assert(edge.length>0);
  assert.equal(fill.length,1);assert.equal(fill[0].color,'leather');
  assert.equal(fill[0].opacity,0,'Leather surface must show the diagram background');
  assert.deepEqual(fill[0].points,[edge[0].a,...edge.map(e=>e.b)]);
  if(reference!==2) {
    assert.deepEqual(edge,scenes[solution].final.filter(e=>e.kind==='leather-edge'));
    assert.deepEqual(fill,scenes[solution].final.filter(e=>e.kind==='leather-fill'));
  }
  for(const name of Object.keys(colorConfig.themes)) {
    const theme=themeFor(name);
    assert.notEqual(theme.leather,theme.background);
    assert.equal(displayElements(fill,0,theme)[0].color,theme.leather);
    assert.deepEqual(displayElements(fill,1,theme),displayElements(fill,0,theme),'Leather must not fade with holes');
  }
  for(const index of [reference,solution]) {
    const layout=scenes[index];
    const edge=layout.final.filter(e=>e.kind==='leather-edge'),fill=layout.final.filter(e=>e.kind==='leather-fill');
    assert.deepEqual(fill[0].points,[edge[0].a,...edge.map(e=>e.b)]);
    for(const f of [...layout.frames,{elements:layout.final}]) {
      assert.deepEqual(f.elements.filter(e=>e.kind==='leather-edge'),edge);
      assert.deepEqual(f.elements.filter(e=>e.kind==='leather-fill'),fill);
      assert.equal(f.elements[0].kind,'leather-fill','Fill must sit behind all diagram elements');
    }
    for(const segment of edge) {
      for(const slit of slits(layout))assert(segmentDistance(segment.a,segment.b,slit.a,slit.b)>2);
      for(const circle of layout.final.filter(e=>e.kind==='hole'))assert(pointSegment(circle.p,segment.a,segment.b)>circle.radius);
    }
  }
}

for(const s of scenes) {
  const base=new URL(`examples/counter_examples/assets/${s.name}`,root);
  assert.equal(fs.readFileSync(new URL(base.href+'.svg'),'utf8').replaceAll('\r\n','\n'),svg(portraitScenes(scenes).find(v=>v.name===s.name)),'Stale SVG');
  const png=fs.readFileSync(new URL(base.href+'.png'));assert.equal(png.readUInt32BE(16),600);assert.equal(png.readUInt32BE(20),750);
  if(s.frames.length) {
    const renderedFrames=portraitScenes(scenes).find(v=>v.name===s.name).frames;
    const animated=fs.readFileSync(new URL(base.href+'.animated.svg'),'utf8');
    assert.deepEqual(JSON.parse(animated.match(/<metadata id="animation-timing">([^<]+)<\/metadata>/)[1]).frameDelays,renderedFrames.map(f=>f.delay));
    if(fs.existsSync(new URL(base.href+'.gif'))) {
    const gif=fs.readFileSync(new URL(base.href+'.gif')),blocks=gifBlocks(gif).blocks;
    near(gif.readUInt16LE(6),600);near(gif.readUInt16LE(8),750);
    assert.equal(blocks.filter(b=>b.kind==='image').length,renderedFrames.length);
    assert.deepEqual(blocks.filter(b=>b.kind==='control').map(b=>b.bytes.readUInt16LE(4)),renderedFrames.map(f=>f.delay));
    assert(gif.includes(Buffer.from('NETSCAPE2.0')));
    }
    const reveal=s.frames.at(-2);assert.equal(reveal.stage,'thread-reveal');assert.equal(reveal.delay,400);assert.deepEqual(reveal.elements,s.final);
    const fade=s.frames.filter(f=>f.stage==='thread-fade');assert.equal(fade.length,5);
    assert.equal(fade.reduce((sum,f)=>sum+f.delay,0),30);
    fade.forEach((f,i)=>{assert.equal(f.holeLightening,(i+1)/5);assert.deepEqual(f.elements,s.final);});
    for(const f of s.frames.filter(f=>f!==reveal&&f.stage!=='thread-fade'))assert(!f.elements.some(e=>e.kind==='thread'));
  } else assert(!fs.existsSync(new URL(base.href+'.gif')),'Static figure must not retain a GIF');
  const tips=s.final.filter(e=>['slit','hole'].includes(e.kind)).flatMap(e=>e.type==='circle'?[e.p]:[e.a,e.b]);
  for(const e of s.final.filter(e=>e.kind==='thread'))for(const p of [e.a,e.b])assert(tips.some(t=>distance(p,t)<1e-6));
  // A face-specific slit angle is not a reason to swap the thread endpoints.
  // Check every span, including both H approaches and both corner neighbours.
  const expected=s.threadPaths.flatMap(path=>path.slice(1).map((next,i)=>({
    a:path[i].type==='circle'?path[i].p:path[i].b,b:next.type==='circle'?next.p:next.a
  })));
  const drawn=s.final.filter(e=>e.kind==='thread');assert.equal(drawn.length,expected.length);
  expected.forEach((e,i)=>{near(distance(drawn[i].a,e.a),0);near(distance(drawn[i].b,e.b),0);});
  for(const f of [...s.frames,{elements:s.final}]) {
    for(const role of ['notation-start','notation-end','notation-junction'])assert.deepEqual(f.elements.filter(e=>e.kind===role),s.final.filter(e=>e.kind===role));
    for(const e of f.elements)for(const p of e.type==='line'?[e.a,e.b]:e.type==='polygon'?e.points:[e.p])assert(p[0]>=0&&p[0]<=600&&p[1]>=0&&p[1]<=375);
  }
}
// Keep the published Loewe and Speedy thread-length totals tied to the final drawn geometry.
const exampleText=fs.readFileSync(new URL('docs/PITCH_skeleton.md',root),'utf8');
assert(!exampleText.includes('## Corner treatments'));
const metricRows=exampleText.split('\n').filter(line=>/^\| (Reference|Autostitch) \|/.test(line));
const documentOrder=[3,4,5,6];assert.equal(metricRows.length,documentOrder.length);
for(const [i,index] of documentOrder.entries()) {
  const layout=scenes[index],scale=distance(slits(layout)[0].a,slits(layout)[0].b)/1.5;
  // Obtain the nominal baseline directly from the existing straight Sellier row.
  const baseline=distance(threads[0].a,threads[0].b)/cv.scale;
  const circles=layout.final.filter(e=>e.kind==='hole').map(e=>e.p);
  const measured=layout.final.filter(e=>e.kind==='thread').filter(e=>
    !(circles.some(c=>distance(c,e.a)<1e-6)&&circles.some(c=>distance(c,e.b)<1e-6)))
    .reduce((sum,e)=>sum+Math.abs(distance(e.a,e.b)/scale-baseline),0);
  near(absoluteStitchLengthDeviation(layout),measured);
  const published=Number(metricRows[i].split('|').at(-2).trim().replaceAll('$',''));
  assert.equal(published,Number(measured.toFixed(3)),layout.name);
}
console.log('Counter-examples valid: Sellier, Loewe, Speedy and Fagliano geometry; synchronized straights, equal curve compression, thread connections, handedness, closure, clearance, exports, animation timing and published Loewe and Speedy stitch-length totals.');
