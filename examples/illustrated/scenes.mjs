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
  if(/^-?\d+(\.\d+)?$/.test(value))value=Number(value).toFixed(2);
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
  // Return to the opening state so each loop repeats only this scene's explanation.
  frame(scene,scene.frames[0].elements,70,'reset');
  return scene;
}

function pitchScenes() {
  const {length,openings}=catalog.illustrations.find(i=>i.id==='ILL-S02').inputs;
  const view={x:(600-length*28)/2,y:187.5,scale:28};
  const base=straightBase(length,view),nominal=Array.from({length:openings},(_,i)=>i*3);
  const draw=points=>{
    const gaps=points.slice(1).map((x,i)=>x-points[i]);
    const changed=gaps.map(g=>Math.abs(g-3)>1e-6);
    const elements=[...base,...points.flatMap((x,i)=>opening([x,0],alpha,view,{marked:changed[i-1]||changed[i]}))];
    for(const [i,gap] of gaps.entries()) {
      elements.push(...measure([points[i],0],[points[i+1],0],gap.toFixed(2),view,-64).map(e=>
        e.type==='text'?{...e,kind:'gap-value',color:changed[i]?ink:construction,size:15}:{...e,kind:'gap-dimension'}));
    }
    if(points.length===openings) {
      const last=project([points.at(-1),0],view)[0],end=project([length,0],view)[0];
      const remaining=Math.max(0,length-points.at(-1));
      elements.push(
        line([last,view.y],[end,view.y],'residual-dimension','#C62828',3),
        {...text([(last+end)/2,view.y+55],remaining.toFixed(2)),kind:'residual-value',color:'#C62828',size:13,bold:false});
    }
    return elements;
  };
  const reveal=s=>{
    frame(s,base,75,'guide');
    for(let i=1;i<=openings;i++)frame(s,draw(nominal.slice(0,i)),45,'nominal-row');
  };
  const problem=scene('pitch-problem','Nominal row (unfitted)','ILL-S02');
  reveal(problem);finish(problem,draw(nominal));
  const fits=[
    {name:'pitch-spread',title:'Even spacing',points:Array.from({length:openings},(_,i)=>i*length/(openings-1))},
    {name:'pitch-end',title:'End adjustment',points:[0,3,6,9,12,length]},
    {name:'pitch-autostitch',title:'Autostitch',points:stations(selectFit({D:length,p:3}))}
  ];
  const scenes=[problem];
  for(const fit of fits) {
    const s=scene(fit.name,fit.title,'ILL-S02');
    frame(s,draw(nominal),100,'mismatch');
    for(let i=1;i<=30;i++) {
      const t=ease(i/30),moving=nominal.map((x,j)=>lerp(x,fit.points[j],t));
      frame(s,draw(moving),8,'planning-revision');
    }
    finish(s,draw(fit.points));scenes.push(s);
  }
  return scenes;
}

export function diagonalCornerScene(spec,{name,source,view,notation=true,startWithRows=false}) {
  const p=spec.pitch;
  const angles=spec.armAxisDegrees.map(a=>a*Math.PI/180);
  const lengths=spec.armLengths??[spec.armGaps*p,spec.armGaps*p];
  const positions=spec.rowStations??lengths.map(length=>Array.from({length:spec.armGaps},(_,i)=>length-i*p));
  const base=[worldLine([-lengths[0],0],[0,0],view),worldLine([0,0],[0,-lengths[1]],view),
    ...(notation?[...routeMarks(project([-lengths[0],0],view),project([0,-lengths[1]],view),[1,0],[0,1]),notationText([384,67],'j','junction')]:[])];
  const s=scene(name,'Shared diagonal slit with mirrored lean',source);
  const result=[...base],rows=[[],[]];
  for(const [arm,row] of rows.entries())for(const [i,station] of positions[arm].entries()) {
    const adjusted=j=>j>=0&&j<positions[arm].length&&Math.abs(positions[arm][j]-(positions[arm][j+1]??0)-p)>1e-6;
    row.push(...opening(arm===0?[-station,0]:[0,-station],angles[arm],view,{marked:adjusted(i-1)||adjusted(i)}));
  }
  result.push(...rows[0]);
  if(!startWithRows)frame(s,[...result],100,'top-row');
  // Flip the vertical row across its guide. Horizontal foreshortening makes
  // the reflection visible; centres and the already-punched top row stay fixed.
  const mirrored=t=>rows[1].map(e=>({...e,
    a:[view.x+(e.a[0]-view.x)*(2*t-1),e.a[1]],
    b:[view.x+(e.b[0]-view.x)*(2*t-1),e.b[1]]}));
  frame(s,[...result,...mirrored(0)],startWithRows?5:100,'vertical-rear-style');
  for(let i=1;i<=30;i++) {
    const t=i/30;
    frame(s,[...result,...mirrored(t*t*(3-2*t))],8,'mirror-vertical');
  }
  result.push(...rows[1]);frame(s,[...result],90,'vertical-front-style');
  const sharedElements=opening([0,0],spec.sharedSlitDegrees*Math.PI/180,view,{marked:positions.some(row=>Math.abs(row.at(-1)-p)>1e-6)});
  const shared=sharedElements[0];
  result.push(...sharedElements);frame(s,[...result],130,'diagonal-shared-slit');
  // The slit axes already encode the shown face. Connect their tips directly;
  // reversing them again would draw the opposite thread diagonal.
  s.threadPaths=[[...rows[0].filter(e=>e.kind==='slit'),shared,...rows[1].filter(e=>e.kind==='slit').toReversed()]];
  s.emphasisedThreads=[spec.armGaps-1,spec.armGaps];
  return finish(s,result);
}

function cornerProblemScenes() {
  const input=catalog.illustrations.find(i=>i.id==='ILL-CORNER-PROBLEM').inputs;
  const h=.75,ui=axis(alpha),uo=axis(alpha-Math.PI/2);
  const joint=[h*uo[0],-h*ui[1]],ci=add(joint,mul(ui,h)),co=add(joint,mul(uo,-h));
  // Halfway between the vertex and A6 phases gives equal and opposite
  // residuals on identical guides, rather than favouring either construction.
  const lengths=[ci[0],co[1]].map(c=>input.armIntervals*3-c/2);
  const view={x:410,y:40,scale:285/lengths[0]},base=[worldLine([-lengths[0],0],[0,0],view),worldLine([0,0],[0,-lengths[1]],view)];
  const referenceRows=lengths.map(length=>Array.from({length:input.armIntervals},(_,i)=>length-i*3));
  const referenceVirtuals=lengths.map((length,arm)=>arm===0?[input.armIntervals*3-length,0]:[0,input.armIntervals*3-length]);
  const comparisons=['vertex-point','bridge'].map(treatment=>{
    const s=scene(`problem-corner-${treatment}`,treatment==='vertex-point'?'Vertex point':'Bridge','ILL-CORNER-PROBLEM');
    const result=[...base];
    const incoming=[],outgoing=[];
    for(const [i,row] of [incoming,outgoing].entries()) {
      for(const [j,station] of referenceRows[i].entries()) {
        const slit=opening(i===0?[-station,0]:[0,-station],i===0?alpha:alpha-Math.PI/2,view,
          {marked:treatment==='vertex-point'&&j===input.armIntervals-1});
        row.push(slit[0]);result.push(...slit);
      }
      if(treatment==='vertex-point') {
        const slit=opening(referenceVirtuals[i],i===0?alpha:alpha-Math.PI/2,view,{virtual:true});
        result.push(...slit);
      }
    }
    const vertex=hole([0,0],view);
    if(treatment==='vertex-point')result.push(vertex);
    s.threadPaths=[[...incoming,...(treatment==='vertex-point'?[vertex]:[]),...outgoing.toReversed()]];
    return finish(s,result);
  });
  const s=scene('problem-corner-autostitch','Autostitch','ILL-CORNER-PROBLEM');
  // Continue the established crossing, without replaying the approaching rows.
  frame(s,comparisons[0].final,100,'crossing');
  const fits=[ci[0],co[1]].map((c,arm)=>selectFit({D:lengths[arm]+c-3,p:3}));
  if(fits.some(f=>!f||f.n!==input.armIntervals-1))throw new Error('Corner comparison needs equal-count feasible arm fits');
  const targets=[stations(fits[0]).map(x=>lengths[0]-x),stations(fits[1]).map(x=>3-co[1]+x).toReversed()];
  const anchored=[ci[0],co[1]].map((c,arm)=>referenceRows[arm].map((x,i)=>i===input.armIntervals-1?3-c:x));
  const draw=(rows,virtuals,showHole)=>{
    const elements=[...base];
    virtuals.forEach(c=>{if(Math.hypot(...c)>1e-9)elements.push(worldLine([0,0],c,view,'extension',guideInk,1,true));});
    for(const [arm,points] of rows.entries()) {
      const position=x=>arm===0?[-x,0]:[0,-x],gaps=points.slice(1).map((x,i)=>points[i]-x);
      const changed=gaps.map(g=>Math.abs(g-3)>1e-6);
      points.forEach((x,i)=>elements.push(...opening(position(x),arm===0?alpha:alpha-Math.PI/2,view,{marked:changed[i-1]||changed[i]})));
      elements.push(...opening(virtuals[arm],arm===0?alpha:alpha-Math.PI/2,view,{virtual:true}));
    }
    if(showHole)elements.push(hole(joint,view));
    return elements;
  };
  for(let i=1;i<=30;i++) {
    const t=ease(i/30),rows=anchored.map((row,arm)=>row.map((x,j)=>lerp(referenceRows[arm][j],x,t)));
    const virtuals=[ci,co].map((target,arm)=>target.map((x,j)=>lerp(referenceVirtuals[arm][j],x,t)));
    frame(s,draw(rows,virtuals,false),8,'align-terminal-tips');
  }
  frame(s,draw(anchored,[ci,co],true),130,'shared-hole');
  for(let i=1;i<=30;i++) {
    const t=ease(i/30),rows=anchored.map((row,a)=>row.map((x,j)=>lerp(x,targets[a][j],t)));
    frame(s,draw(rows,[ci,co],true),8,'distribute-within-arms');
  }
  const result=draw(targets,[ci,co],true),slits=result.filter(e=>e.kind==='slit');
  s.threadPaths=[[...slits.slice(0,input.armIntervals),result.find(e=>e.kind==='hole'),...slits.slice(input.armIntervals).toReversed()]];
  const diagonalInput=catalog.illustrations.find(i=>i.id===input.diagonalCase).inputs;
  // The diagonal treatment keeps ordinary rows nominal; only the final
  // gap from each row into the fixed vertex slit absorbs its residual.
  const mirrored=diagonalCornerScene({...diagonalInput,pitch:3,armGaps:input.armIntervals,armLengths:lengths},
    {name:'problem-corner-mirrored',source:'ILL-CORNER-PROBLEM',view,notation:false,startWithRows:true});
  return [...comparisons,mirrored,finish(s,result)];
}

function landmarkScene(layout) {
  const v=variant('F02'),length=layout?.length??v.route.primitives[0].b[0],reference=layout?.landmark??v.landmarks[0].station;
  const view={x:(600-length*16)/2,y:187.5,scale:16},left=reference-1.5,right=reference+1.5;
  const base=straightBase(length,view),p=project([reference,0],view);
  base.push(line([p[0],p[1]-55],[p[0],p[1]+55],'landmark',ink,1.4),text([p[0],p[1]-67],'L1'));
  const s=scene('axiom-landmark','Fixed landmark pair; bounded adjustments within each free span',layout?'ILL-LANDMARK':'F02');
  frame(s,base,90,'reference');
  const protectedDimension=measure([left,0],[right,0],'3',view,-78);
  const fixed=[...base,...[0,left,right,length].flatMap(x=>opening([x,0],alpha,view)),...protectedDimension];
  frame(s,fixed,150,'protected-pair');
  const spans=[[0,left],[right,length]].flatMap(([a,b])=>measure([a,0],[b,0],'Free span',view,83).map(e=>
    ({...e,kind:e.type==='text'?'span-label':'span-dimension'})));
  const leftPoints=stations(selectFit({D:left,p:3})),rightPoints=stations(selectFit({D:length-right,p:3})).map(x=>x+right);
  const target=[...leftPoints,...rightPoints];
  const initialLeft=layout?layout.initialGaps.reduce((points,gap)=>[...points,points.at(-1)+gap],[0]):null;
  const initial=layout?[...initialLeft,...initialLeft.toReversed().map(x=>length-x)]:[
    ...leftPoints.map((x,i)=>i===leftPoints.length-1?left:i*3),
    ...rightPoints.map((x,i)=>i===rightPoints.length-1?length:right+i*3)];
  const draw=points=>{
    const gaps=points.slice(1).map((x,i)=>x-points[i]),changed=gaps.map(g=>Math.abs(g-3)>1e-6);
    const result=[...base,...spans,...protectedDimension,...points.flatMap((x,i)=>opening([x,0],alpha,view,{marked:changed[i-1]||changed[i]}))];
    for(const [i,gap] of gaps.entries()) {
      if(i===leftPoints.length-1)continue;
      result.push(...measure([points[i],0],[points[i+1],0],gap.toFixed(2),view,-78).map(e=>
        ({...e,kind:e.type==='text'?'gap-value':'gap-dimension',color:changed[i]?ink:construction})));
    }
    return result;
  };
  frame(s,[...fixed,...spans],100,'free-spans');
  frame(s,draw(initial),180,'end-adjustments');
  for(let i=1;i<=30;i++) {
    const t=ease(i/30);
    frame(s,draw(initial.map((x,j)=>lerp(x,target[j],t))),8,'distribute-within-spans');
  }
  return finish(s,draw(target));
}

function curveScene() {
  const input=catalog.illustrations.find(i=>i.id==='ILL-CURVE').inputs;
  const original=variant('A01').route.primitives[0],step=2*Math.asin(3/(2*original.radius));
  const g={...original,sweep:Math.sign(original.sweep)*input.nominalGaps*step},view={x:160,y:75,scale:23};
  const point=theta=>add(g.center,mul(axis(theta),g.radius));
  const theta=g['start-angle'],sign=Math.sign(g.sweep),angles=Array.from({length:input.nominalGaps+1},(_,i)=>theta+sign*i*step);
  const base=[];
  for(let i=0;i<80;i++)base.push(worldLine(point(theta+g.sweep*i/80),point(theta+g.sweep*(i+1)/80),view));
  const s=scene('axiom-curve','Fixed slit profile; pitch measured as a chord','A01');
  frame(s,base,70,'guide');
  // One proposed slit travels along the guide without changing its profile.
  for(let i=0;i<=30;i++) {
    const angle=theta+g.sweep*ease(i/30),center=point(angle),tangent=angle+sign*Math.PI/2;
    const direction=mul(axis(tangent),2.2);
    const label=add(project(center,view),[55*Math.cos(angle),-55*Math.sin(angle)]);
    frame(s,[...base,worldLine(add(center,mul(direction,-1)),add(center,direction),view,'tangent',ink,1,true),
      {...text(label,'Local tangent'),kind:'tangent-label',color:ink},...opening(center,tangent+alpha,view,{proposed:true})],6,'local-tangent');
  }
  let result=[...base];
  for(const [i,angle] of angles.entries()) {
    result.push(...opening(point(angle),angle+sign*Math.PI/2+alpha,view));
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
  const view={x:370,y:105,scale:24},h=.75;
  const ui=axis(alpha),uo=axis(alpha-Math.PI/2);
  const J=[h*uo[0],-h*ui[1]],ci=add(J,mul(ui,h)),co=add(J,mul(uo,-h));
  const start=[ci[0]-9,0],end=[0,co[1]-9];
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

function curvedJunctionScene() {
  const spec=catalog.illustrations.find(i=>i.id==='ILL-JUNCTION-COMPARISON');
  const {radius:R,intervals,view}=spec.inputs,p=spec.pitch;
  const arms=spec.inputs.directionsDegrees.map((degrees,i)=>{
    const theta=degrees*Math.PI/180,curved=i===0;
    const advance=q=>curved?2*Math.asin(q/(2*R)):q;
    const step=advance(p),length=spec.inputs.nominalIntervals[i]*step;
    const point=t=>curved?add(mul(axis(theta),R*Math.sin(t)),mul(axis(theta+Math.PI/2),R*(1-Math.cos(t)))):mul(axis(theta),t);
    return {theta,curved,advance,step,length,point,tangent:t=>theta+(curved?t:0)};
  });
  const nominal=arms.map(a=>Array.from({length:intervals},(_,j)=>a.length-j*a.step));
  const guides=arms.flatMap(a=>Array.from({length:a.curved?40:1},(_,j)=>
    worldLine(a.point(a.length*j/(a.curved?40:1)),a.point(a.length*(j+1)/(a.curved?40:1)),view)));
  const marks=[notationText([view.x+20,view.y-4],'j','junction')];
  for(const i of [0,1]) {
    const start=project(arms[i].point(arms[i].length),view),end=project(arms[i+2].point(arms[i+2].length),view);
    const from=axis(arms[i].tangent(arms[i].length)+Math.PI),to=axis(arms[i+2].tangent(arms[i+2].length));
    marks.push(...routeMarks(start,end,[from[0],-from[1]],[to[0],-to[1]]));
  }
  const auto=arms.map(a=>{
    const fit=selectFit(a.curved?{p,R,sweep:a.length-a.step}:{p,D:a.length-a.step});
    if(!fit||fit.n!==intervals-1)throw new Error('X-junction fixture needs four intervals per arm');
    const row=[a.step];
    for(let j=0;j<fit.n;j++)row.push(row.at(-1)+a.advance(j>=fit.i&&j<fit.i+fit.k?fit.correctedPitch:p));
    return row.toReversed();
  });
  const base=[...guides,...marks],joint=hole([0,0],view);
  const draw=rows=>{
    const elements=[...base,joint],openings=[];
    for(const [i,a] of arms.entries()) {
      const points=rows[i].map(a.point),all=[...points,[0,0]];
      const changed=points.map((point,j)=>Math.abs(Math.hypot(...add(point,mul(all[j+1],-1)))-p)>1e-6);
      const row=[];
      for(const [j,t] of rows[i].entries()) {
        const slit=opening(points[j],a.tangent(t)+(i<2?Math.PI:0)+alpha,view,{marked:changed[j-1]||changed[j]});
        elements.push(...slit);row.push(slit[0]);
      }
      openings.push(row);
    }
    return {elements,paths:[0,1].map(i=>[...openings[i],joint,...openings[i+2].toReversed()])};
  };
  const s=scene('axiom-junction-curved','Autostitch X junction with a curved arm',spec.id);
  frame(s,[...base,joint],70,'shared-hole');
  const neighbours=arms.flatMap((a,i)=>opening(a.point(a.step),a.tangent(a.step)+(i<2?Math.PI:0)+alpha,view));
  frame(s,[...base,joint,...neighbours],100,'reserved-neighbours');
  const anchored=nominal.map((row,i)=>row.map((t,j)=>j===intervals-1?arms[i].step:t));
  frame(s,draw(anchored).elements,65,'free-spans');
  for(let j=1;j<=16;j++) {
    const t=ease(j/16),rows=auto.map((row,i)=>row.map((x,k)=>lerp(anchored[i][k],x,t)));
    frame(s,draw(rows).elements,6,'fit-arms');
  }
  const final=draw(auto);
  s.threadPaths=final.paths;
  return slitOutlines(finishThread(finish(s,final.elements)));
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
  let lastCandidate;
  for(const count of [2,3]) {
    const gap=input.length/count;
    const proposed=Array.from({length:count-1},(_,i)=>opening([(i+1)*gap,0],alpha,view,{proposed:true})).flat();
    const candidate=[...fixed,...proposed,...measure([0,0],[gap,0],gap.toFixed(2),view,-45)];
    lastCandidate=candidate;
    frame(s,candidate,160,'candidate');frame(s,[...candidate,...reject],90,'outside-bounds');
    frame(s,fixed,50,'withdraw-proposal');
  }
  return finish(s,[...lastCandidate,...reject,...measure([0,0],[input.length,0],'7',view,65)]);
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

function termLabel(point,value,target,leaderStart) {
  const label={...text(point,value),kind:'term-label',color:ink};
  if(!target)return [label];
  const start=leaderStart??[point[0],point[1]+(target[1]>point[1]?8:-16)];
  return [line(start,target,'term-leader',construction,.8),label];
}
function termsLayoutScene() {
  const original=landmarkScene(),view={x:60,y:187.5,scale:16};
  const s=scene('terms-layout','Guide, gaps, landmark and free span','F02');
  const result=original.final.filter(e=>['guide','fixed-end'].includes(e.kind));
  result.push(...termLabel([510,66],'Guide',[510,187.5]));
  result.push(...original.final.filter(e=>['slit','adjustment-mark'].includes(e.kind)),...termLabel([401,66],'Slit',[401,180]));
  result.push(...measure([0,0],[3,0],'p',view,-78),...termLabel([84,294],'Nominal gap'));
  result.push(...measure([6,0],[8.75,0],'g',view,-78),...termLabel([178,294],'Adjusted gap'));
  result.push(...original.final.filter(e=>['landmark','dimension','measurement'].includes(e.kind)),
    ...termLabel([320,66],'Landmark',[320,105]),...termLabel([320,294],'Protected gap'));
  result.push(...measure([0,0],[14.75,0],'Free span',view,83));
  return {...s,final:result};
}
function termsSlitScene() {
  const input=catalog.illustrations.find(i=>i.id==='ILL-TERMS-SLIT').inputs;
  const view={x:270,y:200,scale:110},direction=axis(alpha),normal=axis(alpha+Math.PI/2);
  const a=mul(direction,-input.length/2),b=mul(direction,input.length/2);
  const tangent=[line([70,200],[520,200],'tangent',guideInk,1),...termLabel([472,222],'Tangent')];
  const profile={...worldLine(a,b,view,'slit-profile',ink,input.width*view.scale),round:true};
  const s=scene('terms-slit','Slit axis, length, width and lean','A2');
  const result=[...tangent,profile,...termLabel([210,310],'Slit',[210,257])];
  result.push(worldLine(a,b,view,'slit-axis','#FFFFFF',1,true),...termLabel([270,310],'Axis',[270,200]));
  const lengthDimension=measure(a,b,'',view,55).filter(e=>e.type!=='text');
  result.push(...lengthDimension,...termLabel([235,91],'Length',[235,158]));
  const center=mul(direction,1.05),halfWidth=mul(normal,input.width/2);
  const wa=add(center,mul(halfWidth,-1)),wb=add(center,halfWidth);
  const A=project(wa,view),B=project(wb,view),tick=[direction[0]*4,-direction[1]*4];
  result.push(line(A,B,'width-dimension',construction,.8),line(add(A,mul(tick,-1)),add(A,tick),'width-dimension',construction,.8),
    line(add(B,mul(tick,-1)),add(B,tick),'width-dimension',construction,.8),
    worldLine(add(b,mul(halfWidth,-1)),wa,view,'width-extension',guideInk,.8),worldLine(add(b,halfWidth),wb,view,'width-extension',guideInk,.8),
    ...termLabel([project(center,view)[0],91],'Width',project(center,view)));
  for(let i=0;i<20;i++)result.push(worldLine(mul(axis(alpha*i/20),.43),mul(axis(alpha*(i+1)/20),.43),view,'lean-angle',construction,1));
  const leanPoint=project(mul(axis(alpha/2),.43),view);
  result.push(...termLabel([430,leanPoint[1]+4],'Lean',leanPoint,[400,leanPoint[1]]));
  return {...s,final:result};
}
function termsJunctionScene() {
  const original=junctionScene(),s=scene('terms-junction','Junction, round hole and arms','A9');
  const result=original.final.filter(e=>['guide','hole','slit'].includes(e.kind));
  result.push(...termLabel([300,71],'Junction / round hole',[300,134]));
  for(const x of [185,415])result.push(...termLabel([x,220],'Arm',[x,145]));
  result.push(...termLabel([400,264],'Arm',[300,260],[370,260]));
  return {...s,final:result};
}
function termsChordScene() {
  const input=catalog.illustrations.find(i=>i.id==='ILL-TERMS-CHORD').inputs;
  const view={x:300,y:380,scale:80},half=Math.asin(input.pitch/(2*input.radius));
  const point=t=>mul(axis(t),input.radius),start=Math.PI/2+half,end=Math.PI/2-half;
  const a=point(start),b=point(end),guide=[];
  for(let i=0;i<40;i++)guide.push(worldLine(point(lerp(start,end,i/40)),point(lerp(start,end,(i+1)/40)),view));
  const s=scene('terms-chord','Chord length and arc length between the same slit centres','A3');
  const result=[...guide];
  result.push(...opening(a,start-Math.PI/2+alpha,view),...opening(b,end-Math.PI/2+alpha,view));
  result.push(...guide.map(e=>({...e,kind:'measured-arc',color:construction,width:1.5,dash:true})),
    ...termLabel([300,75],'Arc length',[300,137],[300,105]),text([300,95],(2*input.radius*half).toFixed(2)));
  result.push(worldLine(a,b,view,'chord',ink,1));
  result.push(...termLabel([300,242],'Chord length',[300,176]),text([300,262],input.pitch.toFixed(2)));
  return {...s,final:result};
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
    const halfLength=14*catalog.illustrations.find(i=>i.id==='ILL-S02').inputs.length;
    marks=routeMarks([300-halfLength,187.5],[300+halfLength,187.5]);
    marks=marks.map(e=>e.kind==='notation-end'?{...e,p:add(e.p,[0,-10])}:e);
  }
  else if(s.name.startsWith('problem-corner-')) {
    const guides=s.final.filter(e=>e.kind==='guide');
    marks=[...routeMarks(guides[0].a,guides[1].b,[1,0],[0,1]),notationText(add(guides[0].b,[24,-18]),'j','junction')];
  }
  else if(['axiom-landmark','terms-layout'].includes(s.name)) {
    const guide=s.final.find(e=>e.kind==='guide');marks=routeMarks(guide.a,guide.b);
  }
  else if(s.name==='fit-rejected')marks=routeMarks([160,190],[440,190]);
  else if(s.name==='axiom-clearance') {
    const ends=s.final.filter(e=>e.kind==='slit').slice(0,2).map(e=>mul(add(e.a,e.b),.5));
    const half=catalog.illustrations.find(i=>i.id==='ILL-CLEARANCE').inputs.includedDegrees*Math.PI/360;
    marks=[notationText(add(ends[0],[25,-28]),'s','start'),notationText(add(ends[1],[16,25]),'e','end'),...directionMark(ends[0],[-Math.cos(half),Math.sin(half)])];
  }
  else if(s.name==='axiom-curve') {
    const guides=s.final.filter(e=>e.kind==='guide'),last=guides.at(-1),direction=add(last.b,mul(last.a,-1));
    marks=routeMarks(guides[0].a,last.b,[1,0],mul(direction,1/Math.hypot(...direction)));
  }
  else if(s.name==='terms-chord') {
    const input=catalog.illustrations.find(i=>i.id==='ILL-TERMS-CHORD').inputs;
    const half=Math.asin(input.pitch/(2*input.radius)),y=380-80*input.radius*Math.cos(half);
    marks=routeMarks([300-40*input.pitch,y],[300+40*input.pitch,y],[Math.cos(half),-Math.sin(half)],[Math.cos(half),Math.sin(half)]);
  }
  else if(s.name==='axiom-corner') {
    const guides=s.final.filter(e=>e.kind==='guide');marks=routeMarks(guides[0].a,guides[1].b,[1,0],[0,1]);
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
  const annotate=elements=>[...elements,...marks,...(persistentJunction?s.final:elements).filter(e=>e.kind==='hole'&&!s.name.startsWith('problem-corner-')).map(e=>
    notationText(add(e.p,['axiom-junction','terms-junction'].includes(s.name)?[16,-14]:[18,18]),'j','junction'))];
  return {...s,final:annotate(s.final),frames:s.frames.map(f=>({...f,elements:annotate(f.elements)}))};
}

const openingCentre=e=>e.type==='circle'?e.p:mul(add(e.a,e.b),.5);
// Match ast:cad-write-thread: outgoing (+) slit tip to incoming (-) tip;
// round holes use their centre. Paths are explicit, never nearest-neighbour guesses.
function threadPaths(s) {
  if(s.threadPaths)return s.threadPaths;
  const slits=s.final.filter(e=>e.kind==='slit'),joint=s.final.find(e=>e.kind==='hole');
  const x=e=>openingCentre(e)[0],y=e=>openingCentre(e)[1];
  if(s.name.startsWith('pitch-')||s.name==='axiom-landmark')return [[...slits].sort((a,b)=>x(a)-x(b))];
  if(s.name==='axiom-curve')return [slits];
  if(s.name==='axiom-closure')return [[...slits,slits[0]]];
  if(s.name==='matched-guides')return [slits.slice(0,slits.length/2),slits.slice(slits.length/2)];
  if(s.name==='axiom-smooth')return [[...slits.filter(e=>Math.abs(y(e)-115)<1e-6).sort((a,b)=>x(a)-x(b)),...slits.filter(e=>Math.abs(y(e)-115)>=1e-6)]];
  if(s.name==='axiom-corner'||s.name.startsWith('corner-')) {
    const firstCount=s.frames.find(f=>f.stage==='arm-0-terminal').elements.filter(e=>e.kind==='slit').length;
    return [[...slits.slice(0,firstCount),joint,...slits.slice(firstCount).toReversed()]];
  }
  if(s.name==='axiom-junction')return [
    [...slits.filter(e=>x(e)<300-1e-6).sort((a,b)=>x(a)-x(b)),joint,...slits.filter(e=>x(e)>300+1e-6).sort((a,b)=>x(a)-x(b))],
    [joint,...slits.filter(e=>Math.abs(x(e)-300)<1e-6).sort((a,b)=>y(a)-y(b))]
  ];
  if(s.name==='axiom-clearance')return [[
    ...slits.filter(e=>y(e)<200).sort((a,b)=>x(b)-x(a)).map(e=>({...e,a:e.b,b:e.a})),joint,
    ...slits.filter(e=>y(e)>200).sort((a,b)=>x(a)-x(b))
  ]];
  if(s.name==='fit-rejected')return [s.final.filter(e=>['slit','proposal'].includes(e.kind)).sort((a,b)=>x(a)-x(b))];
  throw new Error(`Thread path missing for ${s.name}`);
}
function bridgeComparison(s) {
  const profile=catalog.illustrations.find(i=>i.id===s.source),count=profile.inputs.armIntervals;
  const slits=s.final.filter(e=>e.kind==='slit'),incoming=slits.slice(0,count),outgoing=slits.slice(count);
  const scale=Math.hypot(...add(incoming[0].b,mul(incoming[0].a,-1)))/profile.slitLength;
  const from=incoming.at(-1).b,to=outgoing.at(-1).a,dx=to[0]-from[0],dy=to[1]-from[1];
  const shifts=profile.inputs.bridgeThreadLengths.map(length=>dy-Math.sqrt((length*scale)**2-dx*dx));
  const draw=shift=>{
    const row=outgoing.map(e=>({...e,a:add(e.a,[0,-shift]),b:add(e.b,[0,-shift])}));
    const path=[...incoming,...row.toReversed()];
    const threads=path.slice(1).map((next,i)=>line(path[i].b,next.a,'thread',ink,1.8));
    const base=s.final.filter(e=>e.kind!=='slit').map(e=>e.kind==='notation-end'?{...e,p:add(e.p,[0,-shift])}:e);
    return {elements:[...base,...incoming,...row,...threads,...cornerThreadAngles(s,threads),...cornerThreadLengths(s,threads)],path};
  };
  const first=draw(shifts[0]),frames=[];
  for(const [a,b,stage] of [[0,1,'short-bridge'],[1,0,'long-bridge']]) {
    frames.push({elements:draw(shifts[a]).elements,delay:400,stage,holeLightening:1});
    for(let i=1;i<=30;i++)frames.push({elements:draw(lerp(shifts[a],shifts[b],ease(i/30))).elements,
      delay:5,stage:'compare-bridge',holeLightening:1});
  }
  return {...s,final:first.elements,frames,threadPaths:[first.path],bridgeShifts:shifts.map(v=>v/scale)};
}

function balancedVertex(s) {
  const count=catalog.illustrations.find(i=>i.id===s.source).inputs.armIntervals;
  const slits=s.final.filter(e=>e.kind==='slit'),joint=s.final.find(e=>e.kind==='hole');
  const incoming=openingCentre(slits[count-1]),outgoing=openingCentre(slits.at(-1));
  // Equal distances from this right-angle vertex balance both thread lengths
  // and angles. Translate the complete outgoing run, including its virtual slit.
  const shift=(outgoing[1]-joint.p[1])-(joint.p[0]-incoming[0]);
  const first=s.final.indexOf(slits[count]),last=s.final.indexOf(joint);
  const result=s.final.map((e,i)=>i>=first&&i<last?{...e,a:add(e.a,[0,-shift]),b:add(e.b,[0,-shift])}:
    e.kind==='notation-end'?{...e,p:add(e.p,[0,-shift])}:e);
  const placed=result.filter(e=>e.kind==='slit');
  return {...s,final:result,threadPaths:[[...placed.slice(0,count),joint,...placed.slice(count).toReversed()]]};
}

function finishThread(s) {
  if(s.name==='problem-corner-bridge')return bridgeComparison(s);
  if(s.name==='problem-corner-vertex-point')s=balancedVertex(s);
  if(!s.frames.length&&!s.threadPaths)return s;
  const paths=threadPaths(s),threads=paths.flatMap(path=>path.slice(1).map((next,i)=>
    line(path[i].type==='circle'?path[i].p:path[i].b,next.type==='circle'?next.p:next.a,'thread',ink,s.emphasisedThreads?.includes(i)?2.6:1.8)));
  const index=s.final.findIndex(e=>['slit','hole','proposal'].includes(e.kind));
  const angles=s.name.startsWith('problem-corner-')?cornerThreadAngles(s,threads):[];
  const staticResult=s.name==='problem-corner-vertex-point';
  const lengths=s.name.startsWith('problem-corner-')?cornerThreadLengths(s,threads):[];
  const result=[...s.final.slice(0,index),...threads,...s.final.slice(index),...angles,...lengths];
  const frames=s.frames.flatMap(f=>f.stage==='result'?[
    {...f,delay:80},
    ...Array.from({length:5},(_,i)=>({elements:result,delay:6,stage:'thread-fade',holeLightening:(i+1)/5})),
    {elements:result,delay:400,stage:'thread-reveal'}
  ]:[f]);
  return {...s,final:result,frames:staticResult?[]:frames,staticGif:staticResult};
}
function cornerThreadLengths(s,threads) {
  const spec=catalog.illustrations.find(i=>i.id===s.source),count=spec.inputs.armIntervals;
  const slit=s.final.find(e=>e.kind==='slit'),scale=Math.hypot(slit.b[0]-slit.a[0],slit.b[1]-slit.a[1])/spec.slitLength;
  const adjacent=s.name==='problem-corner-bridge'?[threads[count-1]]:[threads[count-1],threads[count]];
  return adjacent.flatMap((thread,arm)=>{
    const value=(Math.hypot(thread.b[0]-thread.a[0],thread.b[1]-thread.a[1])/scale).toFixed(2);
    const dimensions=measure([thread.a[0],-thread.a[1]],[thread.b[0],-thread.b[1]],value,{x:0,y:0,scale:1},arm===0?-36:38).map(e=>
      ({...e,kind:e.type==='text'?'thread-length-value':'thread-length-dimension',color:ink,
        ...(arm===1&&e.type==='text'?{p:add(e.p,[20,9])}:{})}));
    // Keep the incoming dimension clear of the outgoing row at the diagonal slit.
    return s.name==='problem-corner-mirrored'&&arm===0?dimensions.map(e=>e.type==='line'?
      {...e,a:add(e.a,[-45,0]),b:add(e.b,[-45,0])}:{...e,p:add(e.p,[-45,0])}):dimensions;
  });
}
function cornerThreadAngles(s,threads) {
  const count=catalog.illustrations.find(i=>i.id===s.source).inputs.armIntervals;
  const entering=threads[count-1],leaving=threads[s.name==='problem-corner-bridge'?count-1:count];
  return [entering,leaving].flatMap((thread,arm)=>{
    const tangent=arm===0?[1,0]:[0,1];
    const vector=[thread.b[0]-thread.a[0],thread.b[1]-thread.a[1]];
    const turn=Math.atan2(tangent[0]*vector[1]-tangent[1]*vector[0],tangent[0]*vector[0]+tangent[1]*vector[1]);
    const degrees=Math.abs(turn)*180/Math.PI;
    // Bridge measures one thread against both arms; stagger the radii so
    // the adjacent sectors do not read as one right-angle wedge.
    const origin=thread.a,start=arm*Math.PI/2,radius=s.name==='problem-corner-bridge'?(arm===0?24:12):18;
    const points=Array.from({length:17},(_,i)=>add(origin,mul(axis(start+turn*i/16),radius)));
    const label=arm===0?[380,16]:[525,70];
    const anchor=add(origin,mul(axis(start+turn/2),radius));
    return [
      {type:'polygon',points:[origin,...points],p:origin,kind:'angle-wedge',color:'#C62828',opacity:.22},
      line(origin,add(origin,mul(tangent,28)),'angle-reference','#C62828',.8,true),
      ...points.slice(1).map((p,i)=>line(points[i],p,'thread-angle','#C62828',1)),
      line(arm===0?add(label,[0,4]):add(label,[-28,-4]),anchor,'angle-leader','#C62828',.8),
      {...text(label,`${degrees.toFixed(1)}\u00b0`),kind:'thread-angle-value',color:'#C62828',size:13}
    ];
  });
}
function slitOutlines(s) {
  const style=elements=>elements.map(e=>{
    if(e.type==='text'&&['measurement','gap-value','residual-value'].includes(e.kind))return {...e,size:13,bold:false};
    if(['slit','proposal'].includes(e.kind))return {...e,color:construction,outline:!e.round,outlineWidth:.8};
    if(e.kind==='adjustment-mark')return {...e,color:construction,width:.8};
    return e;
  });
  return {...s,final:style(s.final),frames:s.frames.map(f=>({...f,elements:style(f.elements)}))};
}
function rectanglePoints(e) {
  const d=[e.b[0]-e.a[0],e.b[1]-e.a[1]],length=Math.hypot(...d),normal=[-d[1]/length*e.width/2,d[0]/length*e.width/2];
  return [add(e.a,normal),add(e.b,normal),add(e.b,mul(normal,-1)),add(e.a,mul(normal,-1))];
}

export function createScenes() {
  return [...pitchScenes(),...cornerProblemScenes(),curveScene(),landmarkScene(catalog.illustrations.find(i=>i.id==='ILL-LANDMARK').inputs),cornerScene(),smoothScene(),junctionScene(),clearanceScene(),
    noFitScene(),closureScene(),matchedScene(),
    curvedCornerScene('A03','corner-arc-line','A curved and straight arm share one corner hole'),
    curvedCornerScene('A04','corner-arc-arc','Two curved arms share one corner hole'),
    curvedCornerScene('J08','corner-shallow','A shallow curved corner can need an adjusted corner step'),
    termsLayoutScene(),termsSlitScene(),termsJunctionScene(),termsChordScene()].map(annotateScene).map(finishThread).map(slitOutlines).concat(curvedJunctionScene());
}

const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const n=value=>Number(value.toFixed(9));
export function absoluteStitchLengthDeviation(s) {
  const profile=catalog.illustrations.find(item=>item.id===s.source);
  const {pitch:p,slitLength:ell,leanDegrees}=profile;
  const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
  const slit=s.final.find(e=>e.kind==='slit'),scale=distance(slit.a,slit.b)/ell;
  const baseline=Math.sqrt(p*p+ell*ell-2*p*ell*Math.cos(leanDegrees*Math.PI/180));
  let total=0;
  for(const path of threadPaths(s))for(let i=1;i<path.length;i++) {
    const a=path[i-1],b=path[i];
    // Exclude the H's internal decoration, but retain its two approaches.
    if(a.type==='circle'&&b.type==='circle')continue;
    const from=a.type==='circle'?a.p:a.b,to=b.type==='circle'?b.p:b.a;
    total+=Math.abs(distance(from,to)/scale-baseline);
  }
  return total;
}

export function pitchComparisonMetrics(s) {
  if(!s.name.startsWith('pitch-')&&!s.name.startsWith('problem-corner-'))throw new Error('Not a pitch comparison');
  const profile=catalog.illustrations.find(item=>item.id===s.source),p=profile.pitch;
  const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
  const slit=s.final.find(e=>e.kind==='slit'),scale=distance(slit.a,slit.b)/profile.slitLength;
  const changes=threadPaths(s).flatMap(path=>path.slice(1).flatMap((b,i)=>{
    const a=path[i];
    // A6 uses virtual-to-real corner steps (nominal in this comparison),
    // not the drawn distances from the real slits to the round hole.
    if(s.name==='problem-corner-autostitch'&&(a.type==='circle'||b.type==='circle'))return [];
    const change=distance(openingCentre(a),openingCentre(b))/scale-p;
    return Math.abs(change)>1e-6?[change]:[];
  }));
  const absoluteAdjustment=changes.reduce((sum,g)=>sum+Math.abs(g),0);
  return {adjustedGaps:changes.length,absoluteAdjustment,
    absoluteResidual:s.name.startsWith('pitch-')?profile.inputs.length-(profile.inputs.openings-1)*p:absoluteAdjustment,
    stitchLengthDeviation:absoluteStitchLengthDeviation(s)};
}

export function displayElements(elements,amount=elements.some(e=>e.kind==='thread')?1:0) {
  if(!amount)return elements;
  return elements.map(e=>{
    if(!['slit','proposal','hole','virtual','measurement','dimension','gap-value','gap-dimension','span-label','span-dimension','thread-length-value','thread-length-dimension'].includes(e.kind))return e;
    const color='#'+[1,3,5].map(i=>Math.round(lerp(parseInt(e.color.slice(i,i+2),16),196,amount)).toString(16).padStart(2,'0')).join('').toUpperCase();
    return {...e,color};
  });
}
export function svg(scene) {
  const elements=displayElements(scene.final).map(e=>{
    if(e.type==='line') {
      const axisLine=`<line class="${e.kind}" x1="${n(e.a[0])}" y1="${n(e.a[1])}" x2="${n(e.b[0])}" y2="${n(e.b[1])}" stroke="${e.outline?'#FFFFFF':e.color}" stroke-width="${e.width}"${e.dash?' stroke-dasharray="4 4"':''}${e.round?' stroke-linecap="round"':''}/>`;
      if(!e.outline)return axisLine;
      return axisLine+`<polygon class="slit-outline" points="${rectanglePoints(e).map(p=>p.map(n).join(',')).join(' ')}" fill="#FFFFFF" stroke="${e.color}" stroke-width="${e.outlineWidth}"${e.dash?' stroke-dasharray="4 4"':''}/>`;
    }
    if(e.type==='circle')return `<circle class="${e.kind}" cx="${n(e.p[0])}" cy="${n(e.p[1])}" r="${n(e.radius)}" fill="${e.color}"/>`;
    if(e.type==='polygon')return `<polygon class="${e.kind}" points="${e.points.map(p=>p.map(n).join(',')).join(' ')}" fill="${e.color}" fill-opacity="${e.opacity??1}"/>`;
    return `<text class="${e.kind}" x="${n(e.p[0])}" y="${n(e.p[1])}" text-anchor="middle" font-family="Arial,sans-serif" font-size="${e.size}"${e.bold?' font-weight="bold"':''} fill="${e.color}">${escape(e.value)}</text>`;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="375" viewBox="0 0 600 375" role="img" aria-labelledby="title description"><title id="title">${escape(scene.title)}</title><desc id="description">Analytic illustration of ${scene.source}. ${scene.frames.length?'Final state of the accompanying animation.':scene.threadPaths?'Static stitch diagram.':'Static terminology figure.'}</desc>\n${elements.join('\n')}\n</svg>\n`;
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
export function writeSceneFiles(scenes) {
  const mode=process.argv[2],output=path.resolve(process.argv[3]),temporary=path.resolve(process.argv[4]);
  fs.mkdirSync(output,{recursive:true});fs.mkdirSync(temporary,{recursive:true});
  if(mode==='prepare') {
    const displayed=scenes.map(s=>({...s,final:displayElements(s.final),frames:s.frames.map(f=>
      ({...f,elements:displayElements(f.elements,f.holeLightening)}))}));
    fs.writeFileSync(path.join(temporary,'scenes.json'),JSON.stringify(displayed));
    for(const scene of scenes)fs.writeFileSync(path.join(output,scene.name+'.svg'),svg(scene));
  } else if(mode==='finish') {
    for(const scene of scenes.filter(s=>s.frames.length))fs.writeFileSync(path.join(output,scene.name+'.gif'),finalizeGif(fs.readFileSync(path.join(temporary,scene.name+'.gif')),scene));
  } else throw new Error('Use prepare or finish');
}
export {add,mul,axis,project,line,text,worldLine,opening,hole,measure,scene,frame,finish,routeMarks,notationText,finishThread,slitOutlines};
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))writeSceneFiles(createScenes());
