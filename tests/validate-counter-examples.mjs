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
near(distance(midpoint(shared),[360,85]),0);
near(distance(shared.a,shared.b)/cv.scale,1.5);
near(Math.abs(shared.b[0]-shared.a[0]),Math.abs(shared.b[1]-shared.a[1]));
for(const [a,row] of rows.entries())for(const [i,e] of row.entries()) {
  const c=world(midpoint(e),cv);near(c[a===0?1:0],0);near(c[a],-9+3*i);
  near(distance(e.a,e.b)/cv.scale,1.5);near(angle(e),(a===0?40:50)*Math.PI/180);
}
const threads=corner.final.filter(e=>e.kind==='thread');assert.equal(threads.length,6);
near(angle(threads[0]),angle(threads[1]));near(angle(threads[4]),angle(threads[5]));
assert(Math.abs(angle(threads[2])-angle(threads[1]))>10*Math.PI/180);
assert(Math.abs(angle(threads[3])-angle(threads[4]))>10*Math.PI/180);
near(angle(threads[1])-angle(threads[2]),angle(threads[3])-angle(threads[4]));
near(distance(threads[2].b,shared.b),0);near(distance(threads[3].a,shared.a),0);
assert(threads[2].width>threads[1].width&&threads[3].width>threads[4].width);

const wallet=scenes[1],wv={x:470,y:48,scale:7.2};
const real=slits(wallet),virtual=wallet.final.filter(e=>e.kind==='virtual'),holes=wallet.final.filter(e=>e.kind==='hole');
assert.equal(real.length,42);assert.equal(virtual.length,2);assert.equal(holes.length,7);
const [ci,co]=virtual.map(e=>world(midpoint(e),wv)),joint=world(holes.at(-1).p,wv);
near(distance(world(virtual[0].a,wv),joint),0);near(distance(world(virtual[1].b,wv),joint),0);
near(ci[1],0);near(co[0],0);
const top=real.slice(0,16),right=real.slice(16,27).toReversed(),bottom=real.slice(27);
const hLeft=world(holes[0].p,wv),hRight=world(holes[3].p,wv);
for(const [a,row] of [top,right,bottom].entries())for(const [i,e] of row.entries()) {
  const c=world(midpoint(e),wv);near(distance(e.a,e.b)/wv.scale,1.5);
  near(Math.cos(angle(e)),Math.cos([40,130,220][a]*Math.PI/180));
  near(Math.sin(angle(e)),Math.sin([40,130,220][a]*Math.PI/180));
  if(a===0)near(c[1],0);else if(a===1)near(c[0],0);else near(c[1],hLeft[1]);
  if(i)near(distance(c,world(midpoint(row[i-1]),wv)),3);
}
near(distance(world(midpoint(top.at(-1)),wv),ci),3);
near(distance(world(midpoint(right[0]),wv),co),3);
near(distance(world(midpoint(right.at(-1)),wv),hRight),3);
near(distance(world(midpoint(bottom[0]),wv),hLeft),3);
near(distance(world(midpoint(top[0]),wv),ci),16*3);
near(distance(hRight,co),12*3);near(distance(world(midpoint(bottom.at(-1)),wv),hLeft),15*3);
assert(!wallet.final.some(e=>e.kind==='adjustment-mark'));
for(const i of [0,3])for(const j of [0,1])near(distance(holes[i+j].p,holes[i+j+1].p)/wv.scale,3);
for(const i of [0,1,2])near(distance(holes[i].p,holes[i+3].p)/wv.scale,3);
for(const f of wallet.frames)assert.deepEqual(f.elements.filter(e=>e.kind==='hole').slice(0,6),holes.slice(0,6),'H anchors must stay fixed');

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
const axes=real.map(e=>[world(e.a,wv),world(e.b,wv)]),centres=holes.map(e=>world(e.p,wv));
for(const [i,[a,b]] of axes.entries()) {
  for(const [c,d] of axes.slice(i+1))assert(segmentDistance(a,b,c,d)-.3>=.2);
  for(const c of centres)assert(pointSegment(c,a,b)-.15-.25>=.2);
}
for(const [i,c] of centres.entries())for(const d of centres.slice(i+1))assert(distance(c,d)-.5>=.2);

for(const s of scenes) {
  const base=new URL(`examples/counter_examples/assets/${s.name}`,root);
  assert.equal(fs.readFileSync(new URL(base.href+'.svg'),'utf8'),svg(s),'Stale SVG');
  const gif=fs.readFileSync(new URL(base.href+'.gif')),blocks=gifBlocks(gif).blocks;
  near(gif.readUInt16LE(6),600);near(gif.readUInt16LE(8),375);
  assert.equal(blocks.filter(b=>b.kind==='image').length,s.frames.length);
  assert.deepEqual(blocks.filter(b=>b.kind==='control').map(b=>b.bytes.readUInt16LE(4)),s.frames.map(f=>f.delay));
  assert(gif.includes(Buffer.from('NETSCAPE2.0')));
  const png=fs.readFileSync(new URL(base.href+'.png'));assert.equal(png.readUInt32BE(16),600);assert.equal(png.readUInt32BE(20),375);
  const reveal=s.frames.at(-2);assert.equal(reveal.stage,'thread-reveal');assert.equal(reveal.delay,200);assert.deepEqual(reveal.elements,s.final);
  for(const f of s.frames.filter(f=>f!==reveal))assert(!f.elements.some(e=>e.kind==='thread'));
  const tips=s.final.filter(e=>['slit','hole'].includes(e.kind)).flatMap(e=>e.type==='circle'?[e.p]:[e.a,e.b]);
  for(const e of s.final.filter(e=>e.kind==='thread'))for(const p of [e.a,e.b])assert(tips.some(t=>distance(p,t)<1e-6));
  for(const f of s.frames) {
    for(const role of ['notation-start','notation-end','notation-junction'])assert.deepEqual(f.elements.filter(e=>e.kind===role),s.final.filter(e=>e.kind===role));
    for(const e of f.elements)for(const p of e.type==='line'?[e.a,e.b]:[e.p])assert(p[0]>=0&&p[0]<=600&&p[1]>=0&&p[1]<=375);
  }
}
console.log('Counter-examples valid: inferred corner connections and angle changes; nominal wallet rows, fixed H, clearance, exported geometry and animation timing.');
