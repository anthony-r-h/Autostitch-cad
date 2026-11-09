// Check the reconstruction and nominal wallet layout independently of rendering.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createScenes} from '../examples/counter_examples/scenes.mjs';
import {gifBlocks,svg} from '../examples/illustrated/scenes.mjs';

const root=new URL('../',import.meta.url),scenes=createScenes();
const near=(a,b)=>assert(Math.abs(a-b)<1e-6,`${a} != ${b}`);
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const midpoint=e=>e.type==='circle'?e.p:[(e.a[0]+e.b[0])/2,(e.a[1]+e.b[1])/2];
const world=(p,v)=>[(p[0]-v.x)/v.scale,(v.y-p[1])/v.scale];
const angle=e=>Math.atan2(e.b[1]-e.a[1],e.b[0]-e.a[0]);
const slits=s=>s.final.filter(e=>e.kind==='slit');

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

const wallet=scenes[1],wv={x:435,y:45,scale:18};
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
  for(const p of points) {
    const incoming=p.type==='circle'?p.p:p.a,outgoing=p.type==='circle'?p.p:p.b;
    assert.equal(threads.filter(e=>distance(e.b,incoming)<1e-6).length,1);
    assert.equal(threads.filter(e=>distance(e.a,outgoing)<1e-6).length,1);
  }
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
for(const [layout,v] of [[wallet,wv],[diagonalWallet,wv],[loeweReference,lv],[loeweSolved,lv],[speedyReference,sv],[speedySolved,sv]]) {
const axes=slits(layout).map(e=>[world(e.a,v),world(e.b,v)]),centres=layout.final.filter(e=>e.kind==='hole').map(e=>world(e.p,v));
for(const [i,[a,b]] of axes.entries()) {
  for(const [c,d] of axes.slice(i+1))assert(segmentDistance(a,b,c,d)-.3>=.2);
  for(const c of centres)assert(pointSegment(c,a,b)-.15-.25>=.2);
}
for(const [i,c] of centres.entries())for(const d of centres.slice(i+1))assert(distance(c,d)-.5>=.2);
}

for(const s of scenes) {
  const base=new URL(`examples/counter_examples/assets/${s.name}`,root);
  assert.equal(fs.readFileSync(new URL(base.href+'.svg'),'utf8'),svg(s),'Stale SVG');
  const png=fs.readFileSync(new URL(base.href+'.png'));assert.equal(png.readUInt32BE(16),600);assert.equal(png.readUInt32BE(20),375);
  if(s.frames.length) {
    const gif=fs.readFileSync(new URL(base.href+'.gif')),blocks=gifBlocks(gif).blocks;
    near(gif.readUInt16LE(6),600);near(gif.readUInt16LE(8),375);
    assert.equal(blocks.filter(b=>b.kind==='image').length,s.frames.length);
    assert.deepEqual(blocks.filter(b=>b.kind==='control').map(b=>b.bytes.readUInt16LE(4)),s.frames.map(f=>f.delay));
    assert(gif.includes(Buffer.from('NETSCAPE2.0')));
    const reveal=s.frames.at(-2);assert.equal(reveal.stage,'thread-reveal');assert.equal(reveal.delay,200);assert.deepEqual(reveal.elements,s.final);
    for(const f of s.frames.filter(f=>f!==reveal))assert(!f.elements.some(e=>e.kind==='thread'));
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
    for(const e of f.elements)for(const p of e.type==='line'?[e.a,e.b]:[e.p])assert(p[0]>=0&&p[0]<=600&&p[1]>=0&&p[1]<=375);
  }
}
console.log('Counter-examples valid: Sellier, Loewe and Speedy geometry; thread connections, handedness, closure, clearance, exports and animation timing.');
