// Review comparison, not production geometry. Run with node review/junction-comparison.mjs.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {makeSlit} from '../geometry.mjs';
import {cornerCandidates, guide, segmentDistance} from './model-evidence.mjs';

const p = 3, h = .75, alpha = 40 * Math.PI / 180;
const add = (a,b) => a.map((v,i) => v+b[i]);
const sub = (a,b) => a.map((v,i) => v-b[i]);
const mul = (a,k) => a.map(v => v*k);
const dot = (a,b) => a.reduce((s,v,i) => s+v*b[i],0);
const cross = (a,b) => a[0]*b[1]-a[1]*b[0];
const dist = (a,b) => Math.hypot(...sub(a,b));
const rot = (a,t) => [a[0]*Math.cos(t)-a[1]*Math.sin(t),a[0]*Math.sin(t)+a[1]*Math.cos(t)];
const deg = v => v*180/Math.PI;
const near = (a,b) => assert.ok(Math.abs(a-b)<1e-9, `${a} != ${b}`);
const step = g => g.radius ? 2*g.radius*Math.asin(p/(2*g.radius)) : p;
function point(g,s) { return g.radius ? add(g.centre,mul(rot(g.radial0,g.winding*s/g.radius),g.radius)) : mul(g.tangent,s); }
function slit(g,s) { return makeSlit(point(g,s),g.theta+(g.radius ? g.winding*s/g.radius : 0)); }
function pointSegmentDistance(q,s) {
  const v=sub(s.b,s.a), t=Math.max(0,Math.min(1,dot(sub(q,s.a),v)/dot(v,v)));
  return dist(q,add(s.a,mul(v,t)));
}
function nodeCorner(incoming,outgoing) {
  return {J:[0,0],ci:0,co:0,previous:slit(incoming,-step(incoming)),next:slit(outgoing,step(outgoing))};
}
function cornerModel(incoming,outgoing,recipe) {
  const c=recipe==='A' ? cornerCandidates(incoming,outgoing).chosen : nodeCorner(incoming,outgoing);
  if(!c) return {incoming,outgoing,rejected:true};
  const before=[3,2,1].map(k=>slit(incoming,c.ci-k*step(incoming)));
  const after=[1,2,3].map(k=>slit(outgoing,c.co+k*step(outgoing)));
  const path=[...before,{center:c.J},...after];
  const threads=path.slice(1).map((o,i)=>[path[i].b||path[i].center,o.a||o.center]);
  const vIn=sub(c.J,c.previous.b),vOut=sub(c.next.a,c.J);
  const ordinaryIn=sub(before[2].a,before[1].b),ordinaryOut=sub(after[1].a,after[0].b);
  const bend=(u,v)=>deg(Math.atan2(cross(u,v),dot(u,v)));
  return {incoming,outgoing,c,slits:[...before,...after],threads,
    metrics:{hole:c.J,centreGaps:[dist(c.J,c.previous.center),dist(c.J,c.next.center)],
      displayLengths:[Math.hypot(...vIn),Math.hypot(...vOut)],displayTurn:bend(vIn,vOut),
      approachKink:bend(ordinaryIn,vIn),departureKink:bend(vOut,ordinaryOut),
      slitAxisClearance:segmentDistance(c.previous,c.next),
      holeAxisClearance:Math.min(pointSegmentDistance(c.J,c.previous),pointSegmentDistance(c.J,c.next))}};
}
function branchModel(angles) {
  const arms=angles.map(a=>guide(0,0,a,12));
  const slits=arms.flatMap(g=>[1,2,3].map(k=>slit(g,k*p)));
  const threads=arms.flatMap(g=>{const ss=[1,2,3].map(k=>slit(g,k*p));return [[[0,0],ss[0].a],[ss[0].b,ss[1].a],[ss[1].b,ss[2].a]];});
  return {arms,slits,threads,c:{J:[0,0]}};
}

// Independent closed-form straight-locus calculation checks the imported reference.
for(const turn of [30,90,150]) {
  const theta=turn*Math.PI/180,u0=[Math.cos(alpha),-Math.sin(alpha)],u1=rot(u0,theta);
  const rhs=mul(add(u0,u1),h), co=-rhs[1]/Math.sin(theta),ci=rhs[0]+co*Math.cos(theta);
  const expected=sub([ci,0],mul(u0,h));
  const actual=cornerModel(guide(0,0,0),guide(0,0,turn),'A');
  near(dist(expected,actual.c.J),0);
  near(actual.metrics.approachKink,0);near(actual.metrics.departureKink,0);
  const reverse=cornerCandidates(guide(0,0,turn+180),guide(0,0,180)).chosen;
  near(dist(reverse.J,actual.c.J),0);
  near(dist(reverse.previous.center,actual.c.next.center),0);
  for(const rotation of [-35,47]) {
    const transformed=cornerCandidates(guide(0,0,rotation),guide(0,0,turn+rotation)).chosen;
    near(dist(transformed.J,rot(actual.c.J,rotation*Math.PI/180)),0);
  }
  const b=cornerModel(guide(0,0,0),guide(0,0,turn),'B');
  b.metrics.centreGaps.forEach(v=>near(v,p));near(b.metrics.displayTurn,turn);
}
// B is rigid-motion invariant. Reversing an arm reverses the slit axis, not its physical cut.
for(const rotation of [-1.4,.3,2.1]) {
  const offset=[8,-6],g=guide(0,0,0),s=slit(g,p),center=add(rot(s.center,rotation),offset);
  const transformed=makeSlit(center,rotation),reversed=makeSlit(center,rotation+Math.PI);
  near(dist(transformed.a,add(rot(s.a,rotation),offset)),0);
  near(dist(transformed.a,reversed.b),0);
}
for(const winding of [-1,1]) {
  const g=guide(10,winding,37),s=slit(g,step(g));near(dist(s.center,[0,0]),p);
  near(dist(s.center,g.centre),10);
}
const shortTip=cornerCandidates(guide(0,0,0),guide(0,0,5));
assert.equal(shortTip.chosen,null);
const shallowNode=cornerModel(guide(0,0,0),guide(0,0,5),'B');
assert.ok(shallowNode.metrics.slitAxisClearance>.4&&shallowNode.metrics.holeAxisClearance>.55);
const tightNode=cornerModel(guide(0,0,0),guide(0,0,179),'B');
assert.ok(tightNode.metrics.slitAxisClearance<.4);

const rows=[
  ...[90,30,150].map(turn=>({name:`Straight ${turn} deg turn (${180-turn} deg included)`,
    a:cornerModel(guide(0,0,0),guide(0,0,turn),'A'),b:cornerModel(guide(0,0,0),guide(0,0,turn),'B')})),
  {name:'R10 incoming arc to line, 90 deg tangent turn',a:cornerModel(guide(10,1,0),guide(0,0,90),'A'),b:cornerModel(guide(10,1,0),guide(0,0,90),'B')},
  {name:'T: three explicitly connected arms',a:branchModel([0,90,180]),b:branchModel([0,90,180])},
  {name:'X: four explicitly connected arms',a:branchModel([0,90,180,270]),b:branchModel([0,90,180,270])}
];
const round=n=>Number(n.toFixed(4));
const metrics=rows.slice(0,4).map(r=>({name:r.name,A:r.a.metrics,B:r.b.metrics}));
fs.writeFileSync(new URL('./junction-comparison.json',import.meta.url),JSON.stringify(metrics,(_,v)=>typeof v==='number'?round(v):v,2)+'\n');
const line=(a,b,color,width=.07,dash='')=>`<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${color}" stroke-width="${width}" ${dash?`stroke-dasharray="${dash}"`:''}/>`;
function panel(model,x,y,label) {
  let graphics='';
  if(model.arms) for(const g of model.arms) graphics+=line([0,0],point(g,10),'#cad1d6',.07,'.3 .2');
  else for(const [g,direction] of [[model.incoming,-1],[model.outgoing,1]]) {
    const pts=Array.from({length:41},(_,i)=>point(g,direction*i*10/40));
    graphics+=`<polyline points="${pts.map(p=>p.join(',')).join(' ')}" fill="none" stroke="#cad1d6" stroke-width=".07" stroke-dasharray=".3 .2"/>`;
  }
  graphics+=line([-.25,0],[.25,0],'#8a939c',.06)+line([0,-.25],[0,.25],'#8a939c',.06);
  for(const t of model.threads||[]) graphics+=line(...t,'#676c71',.07);
  for(const s of model.slits||[]) graphics+=line(s.a,s.b,'#13796d',.18);
  if(model.c) graphics+=`<circle cx="${model.c.J[0]}" cy="${model.c.J[1]}" r=".25" fill="white" stroke="#bd472f" stroke-width=".08"/>`;
  const m=model.metrics;
  const captions=m?[`Hole (${m.hole.map(v=>v.toFixed(3)).join(', ')}) mm; centre gaps ${m.centreGaps.map(v=>v.toFixed(3)).join(' / ')}`,
    `Adjacent displayed thread ${m.displayLengths.map(v=>v.toFixed(3)).join(' / ')} mm; turn ${m.displayTurn.toFixed(2)} deg`,
    `Kink into/out of local junction: ${m.approachKink.toFixed(2)} / ${m.departureKink.toFixed(2)} deg`]:['Both candidates use one declared shared round hole and nominal first gaps.','Thread links show local incidences, not a sewing itinerary.'];
  return `<g transform="translate(${x},${y})"><text x="14" y="20" font-size="15" font-weight="bold">${label}</text><g transform="translate(250,125) scale(11)">${graphics}</g>${captions.map((t,i)=>`<text x="14" y="${245+i*18}" font-size="12">${t}</text>`).join('')}</g>`;
}
const body=rows.map((r,i)=>`<text x="20" y="${113+i*330}" font-size="16" font-weight="bold">${r.name}</text>${panel(r.a,8,120+i*330,'A: retain tip-locus at two-arm corners')}${panel(r.b,598,120+i*330,'B: round at guide node for every sharp join')}`).join('');
fs.writeFileSync(new URL('./junction-comparison.svg',import.meta.url),`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="2120" viewBox="0 0 1200 2120"><rect width="1200" height="2120" fill="white"/><g font-family="Arial,sans-serif" fill="#24313b"><text x="20" y="32" font-size="24" font-weight="bold">Shared-hole recipes: appearance and physical placement</text><text x="20" y="58" font-size="14">Pitch 3 mm; slit 1.5 mm at 40 deg; round diameter .5 mm. Same scale in all panels.</text><text x="20" y="80" font-size="13">Teal cuts, red round hole, grey schematic tip-to-tip/centre thread; dashed guides. No physical thread simulation.</text>${body}<text x="20" y="2110" font-size="13">Geometry comparison only. Native adapter must classify arms identically whether source entities are joined or separate.</text></g></svg>\n`);
console.log('Junction comparison assertions passed; wrote review/junction-comparison.svg and .json');
console.log(JSON.stringify(metrics,(_,v)=>typeof v==='number'?round(v):v,2));
