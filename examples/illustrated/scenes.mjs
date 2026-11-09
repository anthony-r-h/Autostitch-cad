// Geometry and reveal sequences for figures embedded in the pitch.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { selectFit } from '../../tests/fit-oracle.mjs';

const root = new URL('../../', import.meta.url);
const catalog = JSON.parse(fs.readFileSync(new URL('tests/cases.json', root), 'utf8'));
const alpha = 40 * Math.PI / 180;
const ink = '#252525', guideInk = '#C4C4C4', construction = '#8B8B8B';
const variant = id => catalog.geometry.find(item => item.id === id).variants.find(item => item.pitch === 3);
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const mul = (a, s) => a.map(x => x * s);
const axis = angle => [Math.cos(angle), Math.sin(angle)];
const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => t * t * (3 - 2 * t);
const project = (p, view) => [view.x + p[0] * view.scale, view.y - p[1] * view.scale];
const line = (a, b, kind = 'guide', color = guideInk, width = 1, dash = false) => ({type:'line', a, b, kind, color, width, dash});
const text = (p, value) => ({type:'text', p, value, size:13, color:construction, kind:'measurement'});
function worldLine(a, b, view, kind, color, width, dash) { return line(project(a, view), project(b, view), kind, color, width, dash); }
function opening(center, angle, view, {virtual = false, proposed = false, marked = false} = {}) {
  const direction = axis(angle), half = mul(direction, .75);
  const a = add(center, mul(half, -1)), b = add(center, half);
  const result = [worldLine(a, b, view, virtual ? 'virtual' : proposed ? 'proposal' : 'slit', virtual || proposed ? construction : ink, virtual ? 1.5 : 2.6, virtual || proposed)];
  if (marked) {
    const normal = mul(axis(angle + Math.PI / 2), .2925);
    for (const tip of [a,b]) result.push(worldLine(add(tip, mul(normal,-1)), add(tip,normal), view, 'adjustment-mark', ink, 2.6));
  }
  return result;
}
const hole = (center, view) => ({type:'circle', p:project(center,view), radius:.25*view.scale, color:ink, kind:'hole'});
function measure(a,b,value,view,offset=34) {
  const A=project(a,view),B=project(b,view);
  const dx=B[0]-A[0],dy=B[1]-A[1],norm=Math.hypot(dx,dy);
  const normal=[dy/norm*offset,-dx/norm*offset];
  const C=add(A,normal),D=add(B,normal),tick=[normal[0]/offset*4,normal[1]/offset*4];
  return [line(C,D,'dimension',construction,.8),line(add(C,mul(tick,-1)),add(C,tick),'dimension',construction,.8),line(add(D,mul(tick,-1)),add(D,tick),'dimension',construction,.8),text(add(mul(add(C,D),.5),[0,-9]),value)];
}
function straightBase(length, view) {
  const result=[worldLine([0,0],[length,0],view)];
  for(const station of [0,length]) {
    const p=project([station,0],view);
    result.push(line([p[0],p[1]-22],[p[0],p[1]+22],'fixed-end',construction,.8));
  }
  return result;
}
function stations(fit,p=3) {
  const result=[0];
  for(let i=0;i<fit.n;i++)result.push(result.at(-1)+(i>=fit.i&&i<fit.i+fit.k?fit.correctedPitch:p));
  return result;
}
function scene(name,title,source) { return {name,title,source,frames:[]}; }
function frame(scene,elements,delay=30,stage='reveal') { scene.frames.push({elements,delay,stage}); }
function finish(scene,elements) {
  scene.final=elements;
  frame(scene,elements,240,'result');
  // A brief empty guide makes the loop's reset distinct from a planning revision.
  frame(scene,scene.frames[0].elements,70,'reset');
  return scene;
}

function pitchScenes() {
  const {length}=catalog.illustrations.find(i=>i.id==='ILL-S02').inputs;
  const view={x:60,y:187.5,scale:28};
  const base=straightBase(length,view);
  const nominal=Array.from({length:6},(_,i)=>i*3);
  const nominalDrawing=(count=6)=>nominal.slice(0,count).flatMap(x=>opening([x,0],alpha,view,{proposed:true}));
  const remainder=[...base,...nominalDrawing(),...opening([18,0],alpha,view,{proposed:true}),...measure([15,0],[length,0],'0.3',view,-45)];
  const problem=scene('pitch-problem','Nominal pitch leaves a remainder','ILL-S02');
  frame(problem,base,75,'guide');
  for(let i=1;i<=6;i++) frame(problem,[...base,...nominalDrawing(i),...(i>1?measure([0,0],[3,0],'3',view):[])],45);
  finish(problem,remainder);
  const fits=[
    {name:'pitch-spread',title:'Naive: distribute evenly',points:Array.from({length:6},(_,i)=>i*length/5),start:0,count:5,gap:length/5},
    {name:'pitch-end',title:'Good enough: adjust near the end',points:[0,3,6,9,12,length],start:4,count:1,gap:3.3},
    {name:'pitch-centre',title:'Autostitch: plan a central adjustment',points:stations(selectFit({D:length,p:3})),start:2,count:1,gap:3.3}
  ];
  const scenes=[problem];
  for(const fit of fits) {
    const s=scene(fit.name,fit.title,'ILL-S02');
    frame(s,base,75,'guide');
    const draw=(points,proposed=false)=>points.flatMap((x,i)=>opening([x,0],alpha,view,{proposed,marked:!proposed&&i>=fit.start&&i<=fit.start+fit.count}));
    if(fit.name==='pitch-centre') {
      const fixed=[...base,...opening([0,0],alpha,view),...opening([length,0],alpha,view)];
      frame(s,fixed,80,'fixed-ends');
      const reserved=[...fixed,...fit.points.slice(2,4).flatMap(x=>opening([x,0],alpha,view,{marked:true})),...measure([fit.points[2],0],[fit.points[3],0],'3.30',view,-40)];
      frame(s,reserved,100,'planned-adjustment');
      let accumulated=[...reserved];
      for(const i of [1,4]){accumulated.push(...opening([fit.points[i],0],alpha,view));frame(s,[...accumulated],60);}
    } else {
      for(let i=1;i<=6;i++)frame(s,[...base,...nominalDrawing(i)],45);
      frame(s,remainder,130,'mismatch');
      for(let i=1;i<=24;i++) {
        const t=ease(i/24),moving=nominal.map((x,j)=>lerp(x,fit.points[j],t));
        frame(s,[...base,...draw(moving,true)],5,'planning-revision');
      }
    }
    const end=[...base,...draw(fit.points),...measure([fit.points[fit.start],0],[fit.points[fit.start+1],0],fit.gap.toFixed(2),view,-40)];
    if(fit.count<5)end.push(...measure([0,0],[3,0],'3',view));
    finish(s,end);scenes.push(s);
  }
  return scenes;
}

function landmarkScene() {
  const v=variant('F02'),length=v.route.primitives[0].b[0],reference=v.landmarks[0].station;
  const view={x:60,y:187.5,scale:16},left=reference-1.5,right=reference+1.5;
  const base=straightBase(length,view),p=project([reference,0],view);
  base.push(line([p[0],p[1]-55],[p[0],p[1]+55],'landmark',ink,1.4),text([p[0],p[1]-67],'L1'));
  const s=scene('axiom-landmark','A landmark reserves a nominal pair','F02');
  frame(s,base,90,'reference');
  const pair=[...opening([left,0],alpha,view),...opening([right,0],alpha,view),...measure([left,0],[right,0],'3',view,-78)];
  frame(s,[...base,...pair],150,'protected-pair');
  const leftFit=selectFit({D:left,p:3}),rightFit=selectFit({D:length-right,p:3});
  const leftPoints=stations(leftFit),rightPoints=stations(rightFit).map(x=>x+right);
  let result=[...base,...pair];
  for(const [points,fit,skip] of [[leftPoints,leftFit,left],[rightPoints,rightFit,right]]) {
    for(const [i,x] of points.entries()) {
      if(Math.abs(x-skip)<1e-9)continue;
      result.push(...opening([x,0],alpha,view,{marked:i>=fit.i&&i<=fit.i+fit.k}));
      frame(s,[...result],27);
    }
  }
  return finish(s,result);
}

function curveScene() {
  const g=variant('A01').route.primitives[0],view={x:160,y:75,scale:23};
  const fit=selectFit({R:g.radius,sweep:g.sweep,p:3});
  const point=theta=>add(g.center,mul(axis(theta),g.radius));
  const theta=g['start-angle'],sign=Math.sign(g.sweep),angles=[theta];
  for(let i=0;i<fit.n;i++) {
    const gap=i>=fit.i&&i<fit.i+fit.k?fit.correctedPitch:3;
    angles.push(angles.at(-1)+sign*2*Math.asin(gap/(2*g.radius)));
  }
  const base=[];
  for(let i=0;i<80;i++)base.push(worldLine(point(theta+g.sweep*i/80),point(theta+g.sweep*(i+1)/80),view));
  const s=scene('axiom-curve','Fixed slit profile; pitch measured as a chord','A01');
  frame(s,base,70,'guide');
  // One proposed slit travels along the guide without changing its profile.
  for(let i=0;i<=30;i++) {
    const angle=theta+g.sweep*ease(i/30),center=point(angle),tangent=angle+sign*Math.PI/2;
    const direction=mul(axis(tangent),2.2);
    frame(s,[...base,worldLine(add(center,mul(direction,-1)),add(center,direction),view,'tangent',construction,1,true),...opening(center,tangent+alpha,view,{proposed:true})],6,'local-tangent');
  }
  let result=[...base];
  for(const [i,angle] of angles.entries()) {
    result.push(...opening(point(angle),angle+sign*Math.PI/2+alpha,view,{marked:i>=fit.i&&i<=fit.i+fit.k}));
    frame(s,[...result],35);
  }
  result.push(...measure(point(angles[0]),point(angles[1]),'3',view,34));
  return finish(s,result);
}

function approachCorner(s,base,arms,joint,view) {
  frame(s,base,90,'arms');
  const result=[...base];
  // Each arm arrives at its terminal virtual slit through its real row.
  // Reveal the other arm the same way before identifying their shared hole.
  for(const [i,arm] of arms.entries()) {
    for(const slit of arm.real) {
      result.push(...opening(slit.center,slit.angle,view,{marked:slit.marked}));
      frame(s,[...result],70,`arm-${i}-stitch`);
    }
    result.push(...opening(arm.virtual.center,arm.virtual.angle,view,{virtual:true}));
    frame(s,[...result],150,`arm-${i}-terminal`);
  }
  frame(s,[...result],100,'tips-meet');
  result.push(hole(joint,view));frame(s,[...result],170,'shared-hole');
  return result;
}
function cornerScene() {
  const v=variant('J02'),view={x:370,y:105,scale:24},h=.75;
  const ui=axis(alpha),uo=axis(alpha-Math.PI/2);
  const J=[h*uo[0],-h*ui[1]],ci=add(J,mul(ui,h)),co=add(J,mul(uo,-h));
  const start=[-10+v.settings.start,0],end=[0,-(v.settings.end-10)];
  const base=[worldLine(start,[0,0],view),worldLine([0,0],end,view),worldLine([0,0],ci,view,'extension',guideInk,1,true),worldLine([0,0],co,view,'extension',guideInk,1,true)];
  const s=scene('axiom-corner','Virtual slit tips locate one corner hole','J02');
  const arms=[
    {real:[3,2,1].map(i=>({center:[ci[0]-i*3,0],angle:alpha})),virtual:{center:ci,angle:alpha}},
    {real:[3,2,1].map(i=>({center:[0,co[1]-i*3],angle:alpha-Math.PI/2})),virtual:{center:co,angle:alpha-Math.PI/2}}
  ];
  const result=approachCorner(s,base,arms,J,view);
  result.push(...measure([ci[0]-3,0],ci,'3',view,36));
  return finish(s,result);
}

function junctionScene() {
  const input=catalog.illustrations.find(item=>item.id==='ILL-JUNCTION').inputs;
  const view={x:300,y:145,scale:23},center=input.junction;
  const arms=input.arms.map(end=>({end,angle:end[1]<0?alpha-Math.PI/2:alpha}));
  const base=arms.map(arm=>worldLine(center,arm.end,view));
  const s=scene('axiom-junction','Three arms share one round hole','A9');
  frame(s,base,100,'arms');
  const result=[...base];
  for(const [index,arm] of arms.entries()) {
    const distance=Math.hypot(...arm.end);
    for(let i=Math.floor(distance/3);i>=1;i--) {
      result.push(...opening(mul(arm.end,i*3/distance),arm.angle,view));
      frame(s,[...result],i===1?140:70,`arm-${index}-stitch`);
    }
  }
  result.push(hole(center,view));frame(s,[...result],170,'shared-hole');
  result.push(...measure(center,[3,0],'3',view,40));
  return finish(s,result);
}

function smoothScene() {
  const v=variant('A05'),arc=v.route.primitives[1],view={x:370,y:115,scale:16};
  const sweep=-(v.settings.end-18)/arc.radius,theta=arc['start-angle'];
  const point=angle=>add(arc.center,mul(axis(angle),arc.radius));
  const base=[worldLine([-18,0],[0,0],view)];
  for(let i=0;i<60;i++)base.push(worldLine(point(theta+sweep*i/60),point(theta+sweep*(i+1)/60),view));
  const s=scene('axiom-smooth','A smooth join reuses one slit','A05');
  frame(s,base,90,'guides');
  let result=[...base,...opening([0,0],alpha,view)];
  frame(s,[...result,worldLine([-3,0],[3,0],view,'tangent',construction,1,true)],130,'shared-slit');
  for(let x=-18;x<0;x+=3){result.push(...opening([x,0],alpha,view));frame(s,[...result],25);}
  const step=2*Math.asin(3/(2*arc.radius)),count=Math.round(-sweep/step);
  for(let i=1;i<=count;i++) {
    const angle=theta-i*step;
    result.push(...opening(point(angle),angle-Math.PI/2+alpha,view));frame(s,[...result],35);
  }
  result.push(...measure([0,0],point(theta-step),'3',view,35));
  return finish(s,result);
}

function clearanceScene() {
  const input=catalog.illustrations.find(item=>item.id==='ILL-CLEARANCE').inputs;
  const view={x:75,y:200,scale:35},half=input.includedDegrees*Math.PI/360,h=.75;
  const directions=[axis(half),axis(-half)];
  const virtualStations=[-h*Math.cos(alpha)+h*Math.sin(alpha)*Math.tan(half),-h*Math.cos(alpha)-h*Math.sin(alpha)*Math.tan(half)];
  const joint=[0,h*Math.sin(alpha)/Math.cos(half)];
  const centre=(arm,step)=>mul(directions[arm],virtualStations[arm]+step);
  const base=directions.flatMap((d,i)=>[worldLine([0,0],centre(i,12),view),worldLine([0,0],centre(i,0),view,'extension',guideInk,1,true)]);
  const s=scene('axiom-clearance','Clearance fails near an acute junction and passes farther away','A10');
  frame(s,base,90,'guides');
  const envelopes=[],profiles=[],checks=[];
  const drawing=()=>[...envelopes,...base,...profiles,...checks];
  for(let n=input.steps.length-1;n>=0;n--) {
    for(let arm=0;arm<2;arm++) {
      const point=centre(arm,input.steps[n]),u=mul(axis(alpha+(arm===0?half:-half)),h);
      const a=add(point,mul(u,-1)),b=add(point,u);
      envelopes.push({...worldLine(a,b,view,'clearance-envelope','#E3E3E3',(input.width+input.margin)*view.scale),round:true});
      profiles.push({...worldLine(a,b,view,'slit',ink,input.width*view.scale),round:true});
    }
    frame(s,drawing(),90,'approach-junction');
    const x=(project(centre(0,input.steps[n]),view)[0]+project(centre(1,input.steps[n]),view)[0])/2;
    const p=[x,275],gap=input.edgeClearances[n],valid=gap>=input.margin;
    if(valid)checks.push(line(add(p,[-5,0]),add(p,[-1,4]),'accepted',ink,1.4),line(add(p,[-1,4]),add(p,[6,-5]),'accepted',ink,1.4));
    else checks.push(line(add(p,[-4,-4]),add(p,[4,4]),'rejected',ink,1.4),line(add(p,[-4,4]),add(p,[4,-4]),'rejected',ink,1.4));
    checks.push(text([x,303],gap<0?'Overlap':gap.toFixed(2)));
    frame(s,drawing(),150,valid?'clearance-pass':'clearance-fail');
  }
  const virtuals=directions.flatMap((d,i)=>opening(centre(i,0),alpha+(i===0?half:-half),view,{virtual:true}));
  return finish(s,[...drawing(),...virtuals,hole(joint,view)]);
}

function noFitScene() {
  const input=catalog.illustrations.find(i=>i.id==='ILL-NOFIT').inputs;
  const view={x:160,y:190,scale:40},base=straightBase(input.length,view);
  const fixed=[...base,...opening([0,0],alpha,view),...opening([input.length,0],alpha,view)];
  const s=scene('fit-rejected','No gap count fits the permitted spacing','A5, A7');
  frame(s,base,80,'guide');frame(s,fixed,100,'fixed-ends');
  const reject=[line([240,130],[360,250],'rejected',ink,12),line([240,250],[360,130],'rejected',ink,12)];
  for(const count of [2,3]) {
    const gap=input.length/count;
    const proposed=Array.from({length:count-1},(_,i)=>opening([(i+1)*gap,0],alpha,view,{proposed:true})).flat();
    const candidate=[...fixed,...proposed,...measure([0,0],[gap,0],gap.toFixed(2),view,-45)];
    frame(s,candidate,160,'candidate');frame(s,[...candidate,...reject],90,'outside-bounds');
    frame(s,fixed,50,'withdraw-proposal');
  }
  return finish(s,[...fixed,...reject,...measure([0,0],[input.length,0],'7',view,65)]);
}

function closureScene() {
  const input=catalog.illustrations.find(i=>i.id==='ILL-CLOSURE').inputs;
  const radius=3/(2*Math.sin(Math.PI/input.count)),view={x:300,y:187.5,scale:13};
  const point=angle=>mul(axis(angle),radius),start=Math.PI/2,step=2*Math.PI/input.count;
  const base=[];
  for(let i=0;i<120;i++)base.push(worldLine(point(start-i*2*Math.PI/120),point(start-(i+1)*2*Math.PI/120),view));
  const s=scene('axiom-closure','Close the loop without duplicating the start','A8');
  frame(s,base,75,'guide');
  let result=[...base,...opening(point(start),alpha,view)];
  frame(s,result,100,'reserved-start');
  for(let i=1;i<input.count;i++) {
    result.push(...opening(point(start-i*step),alpha-i*step,view));
    frame(s,[...result],i<4?35:18,'around-loop');
  }
  frame(s,[...result,...opening(point(start),alpha,view,{proposed:true})],100,'reuse-start');
  return finish(s,[...result,...measure(point(start-(input.count-1)*step),point(start),'3',view,-30)]);
}

function matchedScene() {
  const length=variant('S02').route.primitives[0].b[0],view={x:60,y:115,scale:14.5};
  const points=stations(selectFit({D:length,p:3}));
  const reflected=p=>[600-p[0],p[1]+145];
  const reflect=e=>e.type==='line'?{...e,a:reflected(e.a),b:reflected(e.b)}:{...e,p:reflected(e.p)};
  const guide=straightBase(length,view),base=[...guide,...guide.map(reflect)];
  const s=scene('matched-guides','One solved layout, one reflected copy','S02');
  frame(s,base,90,'guides');
  const source=points.flatMap((x,i)=>opening([x,0],alpha,view,{marked:i>=4&&i<=6}));
  let result=[...base,...source];frame(s,result,160,'source-solved');
  for(const [i,x] of points.entries()) {
    const copy=opening([x,0],alpha,view,{marked:i>=4&&i<=6}).map(reflect);
    result.push(...copy);
    const p=project([x,0],view);
    frame(s,[...result,line(p,reflected(p),'correspondence',guideInk,.8,true)],35,'copy-correspondence');
  }
  return finish(s,result);
}

// Analytic tip-locus construction for the illustrated line/circle pairs.
// This illustrates A6; the production solver remains in autostitch-geometry.lsp.
const wrap=angle=>Math.atan2(Math.sin(angle),Math.cos(angle));
const primitiveLength=g=>g.kind==='line'?Math.hypot(g.b[0]-g.a[0],g.b[1]-g.a[1]):g.radius*Math.abs(g.sweep);
function primitivePoint(g,station) {
  if(g.kind==='line')return add(g.a,mul([g.b[0]-g.a[0],g.b[1]-g.a[1]],station/primitiveLength(g)));
  return add(g.center,mul(axis(g['start-angle']+Math.sign(g.sweep)*station/g.radius),g.radius));
}
function primitiveAxis(g,station) {
  return g.kind==='line'?Math.atan2(g.b[1]-g.a[1],g.b[0]-g.a[0])+alpha:g['start-angle']+Math.sign(g.sweep)*(station/g.radius+Math.PI/2)+alpha;
}
function locus(g,tip) {
  if(g.kind==='line')return {kind:'line',origin:add(g.a,mul(axis(primitiveAxis(g,0)),tip*.75)),direction:axis(primitiveAxis(g,0)-alpha)};
  const a=g.radius-tip*.75*Math.sign(g.sweep)*Math.sin(alpha),b=tip*.75*Math.sign(g.sweep)*Math.cos(alpha);
  return {kind:'circle',center:g.center,radius:Math.hypot(a,b),phase:Math.atan2(b,a)};
}
function intersections(a,b) {
  if(a.kind==='circle'&&b.kind==='line')return intersections(b,a);
  if(a.kind==='line'&&b.kind==='circle') {
    const delta=[a.origin[0]-b.center[0],a.origin[1]-b.center[1]],dot=delta[0]*a.direction[0]+delta[1]*a.direction[1];
    const discriminant=dot*dot-delta[0]**2-delta[1]**2+b.radius**2;
    if(discriminant<0)throw new Error('Illustrated loci do not meet');
    return [-1,1].map(sign=>add(a.origin,mul(a.direction,-dot+sign*Math.sqrt(discriminant))));
  }
  if(a.kind!=='circle'||b.kind!=='circle')throw new Error('This figure requires at least one curved arm');
  const delta=[b.center[0]-a.center[0],b.center[1]-a.center[1]],distance=Math.hypot(...delta),direction=mul(delta,1/distance);
  const along=(a.radius**2-b.radius**2+distance**2)/(2*distance),heightSquared=a.radius**2-along**2;
  if(heightSquared<0)throw new Error('Illustrated circles do not meet');
  const foot=add(a.center,mul(direction,along)),normal=[-direction[1],direction[0]];
  return [-1,1].map(sign=>add(foot,mul(normal,sign*Math.sqrt(heightSquared))));
}
function virtualStation(g,tipLocus,joint,reference) {
  if(g.kind==='line')return (joint[0]-tipLocus.origin[0])*tipLocus.direction[0]+(joint[1]-tipLocus.origin[1])*tipLocus.direction[1];
  const theta=Math.atan2(joint[1]-g.center[1],joint[0]-g.center[0])-tipLocus.phase;
  const referenceAngle=g['start-angle']+Math.sign(g.sweep)*reference/g.radius;
  return reference+Math.sign(g.sweep)*g.radius*wrap(theta-referenceAngle);
}
const advance=(g,chord)=>g.kind==='line'?chord:2*g.radius*Math.asin(chord/(2*g.radius));
export function illustratedCorner(caseId) {
  const primitives=variant(caseId).route.primitives,[incoming,outgoing]=primitives;
  const lengths=primitives.map(primitiveLength),loci=[locus(incoming,-1),locus(outgoing,1)],vertex=primitivePoint(incoming,lengths[0]);
  const roots=intersections(...loci).sort((a,b)=>Math.hypot(a[0]-vertex[0],a[1]-vertex[1])-Math.hypot(b[0]-vertex[0],b[1]-vertex[1]));
  const joint=roots[0],virtual=[virtualStation(incoming,loci[0],joint,lengths[0]),virtualStation(outgoing,loci[1],joint,0)];
  const steps=primitives.map((g,i)=>{
    const low=Math.max(advance(g,2.7),i===0?virtual[i]-lengths[i]:-virtual[i]);
    const high=Math.min(advance(g,3.3),i===0?virtual[i]:lengths[i]-virtual[i]);
    if(low>high)throw new Error('No permitted illustrated corner step');
    return Math.max(low,Math.min(high,advance(g,3)));
  });
  const stations=primitives.map((g,i)=>{
    const result=[];
    for(let n=0;n<3;n++) {
      const station=virtual[i]+(i===0?-1:1)*(steps[i]+n*advance(g,3));
      if(station>=-1e-8&&station<=lengths[i]+1e-8)result.push(station);
    }
    return result;
  });
  return {primitives,virtual,steps,stations,joint};
}
function curvedCornerScene(caseId,name,title) {
  const model=illustratedCorner(caseId),{primitives,virtual,steps,stations,joint}=model;
  const view=caseId==='J08'?{x:320,y:190,scale:21}:{x:365,y:90,scale:27};
  const base=[];
  for(const [i,g] of primitives.entries()) {
    const low=i===0?stations[i].at(-1):0,high=i===0?primitiveLength(g):stations[i].at(-1);
    for(let n=0;n<60;n++)base.push(worldLine(primitivePoint(g,lerp(low,high,n/60)),primitivePoint(g,lerp(low,high,(n+1)/60)),view));
    const endpoint=i===0?primitiveLength(g):0;
    if(virtual[i]<0||virtual[i]>primitiveLength(g))for(let n=0;n<20;n++)
      base.push(worldLine(primitivePoint(g,lerp(endpoint,virtual[i],n/20)),primitivePoint(g,lerp(endpoint,virtual[i],(n+1)/20)),view,'extension',guideInk,1,true));
  }
  const s=scene(name,title,caseId);
  const arms=primitives.map((g,i)=>({
    real:stations[i].map((station,n)=>({center:primitivePoint(g,station),angle:primitiveAxis(g,station),marked:n===0&&Math.abs(steps[i]-advance(g,3))>1e-8})).reverse(),
    virtual:{center:primitivePoint(g,virtual[i]),angle:primitiveAxis(g,virtual[i])}
  }));
  const result=approachCorner(s,base,arms,joint,view);
  const selected=caseId==='J08'?1:0,g=primitives[selected],a=primitivePoint(g,virtual[selected]),b=primitivePoint(g,stations[selected][0]);
  const gap=Math.hypot(a[0]-b[0],a[1]-b[1]);
  result.push(...measure(a,b,gap.toFixed(2),view,caseId==='J08'?-50:35));
  return finish(s,result);
}

function termLabel(point,value,target) {
  const label={...text(point,value),kind:'term-label',color:ink};
  if(!target)return [label];
  const start=[point[0],point[1]+(target[1]>point[1]?8:-16)];
  return [line(start,target,'term-leader',construction,.8),label];
}
function termsLayoutScene() {
  const original=landmarkScene(),view={x:60,y:187.5,scale:16};
  const s=scene('terms-layout','Guide, gaps, landmark and free span','F02');
  let result=original.final.filter(e=>['guide','fixed-end'].includes(e.kind));
  result.push(...termLabel([510,310],'Guide',[515,187.5]));frame(s,[...result],140,'guide-term');
  result.push(...original.final.filter(e=>['slit','adjustment-mark'].includes(e.kind)),...termLabel([455,94],'Slit',[401,180]));
  frame(s,[...result],160,'slit-term');
  result.push(...measure([0,0],[3,0],'p',view,-68),...termLabel([84,284],'Nominal gap'));
  frame(s,[...result],160,'nominal-term');
  result.push(...measure([6,0],[8.75,0],'g',view,-68),...termLabel([178,284],'Adjusted gap'));
  frame(s,[...result],160,'adjusted-term');
  result.push(...original.final.filter(e=>['landmark','dimension','measurement'].includes(e.kind)),
    ...termLabel([395,66],'Landmark',[320,133]),...termLabel([320,294],'Protected gap'));
  frame(s,[...result],180,'landmark-term');
  result.push(...measure([0,0],[14.75,0],'Free span',view,83));
  return finish(s,result);
}
function termsSlitScene() {
  const input=catalog.illustrations.find(i=>i.id==='ILL-TERMS-SLIT').inputs;
  const view={x:270,y:200,scale:110},direction=axis(alpha),normal=axis(alpha+Math.PI/2);
  const a=mul(direction,-input.length/2),b=mul(direction,input.length/2);
  const tangent=[line([70,200],[520,200],'tangent',guideInk,1),...termLabel([472,222],'Tangent')];
  const profile={...worldLine(a,b,view,'slit-profile',ink,input.width*view.scale),round:true};
  const s=scene('terms-slit','Slit axis, length, width and lean','A2');
  let result=[...tangent,profile,...termLabel([104,183],'Slit',[228,237])];frame(s,[...result],140,'profile-term');
  result.push(worldLine(a,b,view,'slit-axis','#FFFFFF',1,true),...termLabel([161,316],'Axis',[253,214]));
  frame(s,[...result],150,'axis-term');
  const lengthDimension=measure(a,b,'',view,55).filter(e=>e.type!=='text');
  result.push(...lengthDimension,...termLabel([177,116],'Length',[235,158]));frame(s,[...result],160,'length-term');
  const center=mul(direction,1.05),halfWidth=mul(normal,input.width/2);
  const wa=add(center,mul(halfWidth,-1)),wb=add(center,halfWidth);
  const A=project(wa,view),B=project(wb,view),tick=[direction[0]*4,-direction[1]*4];
  result.push(line(A,B,'width-dimension',construction,.8),line(add(A,mul(tick,-1)),add(A,tick),'width-dimension',construction,.8),
    line(add(B,mul(tick,-1)),add(B,tick),'width-dimension',construction,.8),
    worldLine(add(b,mul(halfWidth,-1)),wa,view,'width-extension',guideInk,.8),worldLine(add(b,halfWidth),wb,view,'width-extension',guideInk,.8),
    ...termLabel([427,81],'Width',project(center,view)));
  frame(s,[...result],170,'width-term');
  for(let i=0;i<20;i++)result.push(worldLine(mul(axis(alpha*i/20),.43),mul(axis(alpha*(i+1)/20),.43),view,'lean-angle',construction,1));
  result.push(...termLabel([387,157],'Lean',project(mul(axis(alpha/2),.43),view)));
  return finish(s,result);
}
function termsJunctionScene() {
  const original=junctionScene(),s=scene('terms-junction','Junction, round hole and arms','A9');
  let result=original.final.filter(e=>['guide','hole','slit'].includes(e.kind));
  frame(s,[...result],100,'junction-layout');
  result.push(...termLabel([300,71],'Junction / round hole',[300,134]));frame(s,[...result],160,'junction-term');
  for(const [label,target] of [[[142,237],[186,145]],[[464,237],[417,145]],[[385,310],[300,250]]]) {
    result.push(...termLabel(label,'Arm',target));frame(s,[...result],110,'arm-term');
  }
  return finish(s,result);
}
function termsChordScene() {
  const input=catalog.illustrations.find(i=>i.id==='ILL-TERMS-CHORD').inputs;
  const view={x:300,y:380,scale:80},half=Math.asin(input.pitch/(2*input.radius));
  const point=t=>mul(axis(t),input.radius),start=Math.PI/2+half,end=Math.PI/2-half;
  const a=point(start),b=point(end),guide=[];
  for(let i=0;i<40;i++)guide.push(worldLine(point(lerp(start,end,i/40)),point(lerp(start,end,(i+1)/40)),view));
  const s=scene('terms-chord','Chord length and arc length between the same slit centres','A3');
  let result=[...guide];frame(s,[...result],100,'guide');
  result.push(...opening(a,start-Math.PI/2+alpha,view),...opening(b,end-Math.PI/2+alpha,view));
  frame(s,[...result],100,'centres');
  result.push(...guide.map(e=>({...e,kind:'measured-arc',color:construction,width:1.5,dash:true})),
    ...termLabel([300,75],'Arc length',[300,137]),text([350,119],(2*input.radius*half).toFixed(2)));
  frame(s,[...result],180,'arc-length');
  result.push(worldLine(a,b,view,'chord',ink,1));frame(s,[...result],110,'chord');
  result.push(...termLabel([300,227],'Chord length',[300,176]),text([350,197],input.pitch.toFixed(2)));
  return finish(s,result);
}

const notationText=(p,value,role)=>({...text(p,value),size:12,kind:`notation-${role}`});
function directionMark(point,tangent) {
  const normal=[tangent[1],-tangent[0]],tip=add(point,mul(tangent,30)),back=add(tip,mul(tangent,-6));
  return [line(add(point,mul(tangent,18)),tip,'direction',construction,1.1),
    line(tip,add(back,mul(normal,3.5)),'direction',construction,1.1),
    line(tip,add(back,mul(normal,-3.5)),'direction',construction,1.1)];
}
function startMark(point,tangent) {
  const normal=[tangent[1],-tangent[0]];
  return [notationText(add(point,add(mul(tangent,-12),mul(normal,17))),'s','start'),...directionMark(point,tangent)];
}
function endMark(point,tangent) {
  return notationText(add(point,add(mul(tangent,12),mul([tangent[1],-tangent[0]],17))),'e','end');
}
function routeMarks(start,end,incoming=[1,0],outgoing=incoming) {
  return [...startMark(start,incoming),endMark(end,outgoing)];
}
function idTag(point,value) {
  const half=(value.length*6+12)/2,low=add(point,[-half,-12]),high=add(point,[half,4]);
  return [line(low,[high[0],low[1]],'id-box',construction,.7),line([high[0],low[1]],high,'id-box',construction,.7),
    line(high,[low[0],high[1]],'id-box',construction,.7),line([low[0],high[1]],low,'id-box',construction,.7),
    {...notationText(point,value,'id'),size:10}];
}
function screenTangent(g,station) {
  const angle=primitiveAxis(g,station)-alpha;return [Math.cos(angle),-Math.sin(angle)];
}
function annotateScene(s) {
  let marks=[];
  if(s.name.startsWith('pitch-')) {
    marks=routeMarks([60,187.5],[60+28*catalog.illustrations.find(i=>i.id==='ILL-S02').inputs.length,187.5]);
    marks=marks.map(e=>e.kind==='notation-end'?{...e,p:add(e.p,[0,-10])}:e);
  }
  else if(['axiom-landmark','terms-layout'].includes(s.name))marks=routeMarks([60,187.5],[540,187.5]);
  else if(s.name==='fit-rejected')marks=routeMarks([160,190],[440,190]);
  else if(s.name==='axiom-clearance') {
    const ends=s.final.filter(e=>e.kind==='slit').slice(0,2).map(e=>mul(add(e.a,e.b),.5));
    const half=catalog.illustrations.find(i=>i.id==='ILL-CLEARANCE').inputs.includedDegrees*Math.PI/360;
    marks=[notationText(add(ends[0],[25,-28]),'s','start'),notationText(add(ends[1],[16,25]),'e','end'),...directionMark(ends[0],[-Math.cos(half),Math.sin(half)])];
  }
  else if(s.name==='axiom-curve')marks=routeMarks([160,75],[390,305],[1,0],[0,1]);
  else if(s.name==='terms-chord') {
    const input=catalog.illustrations.find(i=>i.id==='ILL-TERMS-CHORD').inputs;
    const half=Math.asin(input.pitch/(2*input.radius)),y=380-80*input.radius*Math.cos(half);
    marks=routeMarks([300-40*input.pitch,y],[300+40*input.pitch,y],[Math.cos(half),-Math.sin(half)],[Math.cos(half),Math.sin(half)]);
  }
  else if(s.name==='axiom-corner') {
    const v=variant('J02');marks=routeMarks([370+(-10+v.settings.start)*24,105],[370,105+(v.settings.end-10)*24],[1,0],[0,1]);
  } else if(s.name==='axiom-smooth') {
    const v=variant('A05'),g=v.route.primitives[1],station=v.settings.end-18;
    marks=[...routeMarks([82,115],project(primitivePoint(g,station),{x:370,y:115,scale:16}),[1,0],screenTangent(g,station)),notationText([384,97],'j','junction')];
  } else if(['axiom-junction','terms-junction'].includes(s.name)) {
    marks=[...routeMarks([93,145],[507,145]),endMark([300,283],[0,1]),...directionMark([300,145],[0,1])];
  } else if(s.name==='axiom-closure') {
    const count=catalog.illustrations.find(i=>i.id==='ILL-CLOSURE').inputs.count;
    marks=startMark([300,187.5-13*3/(2*Math.sin(Math.PI/count))],[1,0]);
  } else if(s.name==='matched-guides') {
    marks=[...routeMarks([60,115],[502.25,115]),...routeMarks([540,260],[97.75,260],[-1,0]),
      ...idTag([60,150],'ST-1'),...idTag([540,225],'ST-1-A')];
  } else if(s.name.startsWith('corner-')) {
    const id={'corner-arc-line':'A03','corner-arc-arc':'A04','corner-shallow':'J08'}[s.name];
    const model=illustratedCorner(id),view=id==='J08'?{x:320,y:190,scale:21}:{x:365,y:90,scale:27};
    const [incoming,outgoing]=model.primitives,a=model.stations[0].at(-1),b=model.stations[1].at(-1);
    marks=routeMarks(project(primitivePoint(incoming,a),view),project(primitivePoint(outgoing,b),view),screenTangent(incoming,a),screenTangent(outgoing,b));
  }
  const persistentJunction=['axiom-corner','axiom-junction','axiom-clearance'].includes(s.name)||s.name.startsWith('corner-');
  const annotate=elements=>[...elements,...marks,...(persistentJunction?s.final:elements).filter(e=>e.kind==='hole').map(e=>
    notationText(add(e.p,['axiom-junction','terms-junction'].includes(s.name)?[16,-14]:[18,18]),'j','junction'))];
  return {...s,final:annotate(s.final),frames:s.frames.map(f=>({...f,elements:annotate(f.elements)}))};
}

export function createScenes() {
  return [...pitchScenes(),curveScene(),landmarkScene(),cornerScene(),smoothScene(),junctionScene(),clearanceScene(),
    noFitScene(),closureScene(),matchedScene(),
    curvedCornerScene('A03','corner-arc-line','A curved and straight arm share one corner hole'),
    curvedCornerScene('A04','corner-arc-arc','Two curved arms share one corner hole'),
    curvedCornerScene('J08','corner-shallow','A shallow curved corner can need an adjusted corner step'),
    termsLayoutScene(),termsSlitScene(),termsJunctionScene(),termsChordScene()].map(annotateScene);
}

const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const n=value=>Number(value.toFixed(9));
export function svg(scene) {
  const elements=scene.final.map(e=>{
    if(e.type==='line')return `<line class="${e.kind}" x1="${n(e.a[0])}" y1="${n(e.a[1])}" x2="${n(e.b[0])}" y2="${n(e.b[1])}" stroke="${e.color}" stroke-width="${e.width}"${e.dash?' stroke-dasharray="4 4"':''}${e.round?' stroke-linecap="round"':''}/>`;
    if(e.type==='circle')return `<circle class="${e.kind}" cx="${n(e.p[0])}" cy="${n(e.p[1])}" r="${n(e.radius)}" fill="${e.color}"/>`;
    return `<text class="${e.kind}" x="${n(e.p[0])}" y="${n(e.p[1])}" text-anchor="middle" font-family="Arial,sans-serif" font-size="${e.size}" fill="${e.color}">${escape(e.value)}</text>`;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="375" viewBox="0 0 600 375" role="img" aria-labelledby="title description"><title id="title">${escape(scene.title)}</title><desc id="description">Analytic illustration of ${scene.source}. Final state of the accompanying animation.</desc>\n${elements.join('\n')}\n</svg>\n`;
}

// GIF89a blocks: https://www.w3.org/Graphics/GIF/spec-gif89a.txt
// Windows encodes the images; set explicit frame timing and the loop extension here.
export function gifBlocks(data) {
  if(data.subarray(0,3).toString()!=='GIF')throw new Error('Expected GIF');
  let offset=13+((data[10]&128)?3*(2**((data[10]&7)+1)):0);
  const header=data.subarray(0,offset),blocks=[];
  const subblocks=()=>{while(data[offset]){offset+=1+data[offset];if(offset>=data.length)throw new Error('Truncated GIF');}offset++;};
  while(offset<data.length) {
    const start=offset,kind=data[offset++];
    if(kind===0x3b){blocks.push({kind:'end',bytes:data.subarray(start,offset)});break;}
    if(kind===0x21){const label=data[offset++];subblocks();blocks.push({kind:label===0xf9?'control':'extension',bytes:data.subarray(start,offset)});}
    else if(kind===0x2c){const packed=data[offset+8];offset+=9;if(packed&128)offset+=3*2**((packed&7)+1);offset++;subblocks();blocks.push({kind:'image',bytes:data.subarray(start,offset)});}
    else throw new Error(`Unexpected GIF block ${kind}`);
  }
  return {header,blocks};
}
function finalizeGif(raw,scene) {
  const {header,blocks}=gifBlocks(raw);
  const output=[header,Buffer.from([0x21,0xff,11,...Buffer.from('NETSCAPE2.0'),3,1,0,0,0])];
  let index=0;
  for(const block of blocks) {
    if(block.kind==='control')continue;
    if(block.kind==='image') {
      const delay=scene.frames[index++]?.delay;if(!delay)throw new Error('GIF frame mismatch');
      output.push(Buffer.from([0x21,0xf9,4,4,delay&255,delay>>8,0,0]));
    }
    output.push(block.bytes);
  }
  if(index!==scene.frames.length)throw new Error('Missing GIF frames');
  return Buffer.concat(output);
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const mode=process.argv[2],output=path.resolve(process.argv[3]),temporary=path.resolve(process.argv[4]);
  const scenes=createScenes();fs.mkdirSync(output,{recursive:true});fs.mkdirSync(temporary,{recursive:true});
  if(mode==='prepare') {
    fs.writeFileSync(path.join(temporary,'scenes.json'),JSON.stringify(scenes));
    for(const scene of scenes)fs.writeFileSync(path.join(output,scene.name+'.svg'),svg(scene));
  } else if(mode==='finish') {
    for(const scene of scenes)fs.writeFileSync(path.join(output,scene.name+'.gif'),finalizeGif(fs.readFileSync(path.join(temporary,scene.name+'.gif')),scene));
  } else throw new Error('Use prepare or finish');
}
