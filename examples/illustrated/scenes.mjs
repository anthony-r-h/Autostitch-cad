// Geometry and reveal sequences for figures embedded in the pitch.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { selectFit } from '../../tests/fit-oracle.mjs';

const root = new URL('../../', import.meta.url);
const catalog = JSON.parse(fs.readFileSync(new URL('tests/cases.json', root), 'utf8'));
export const colorConfig=JSON.parse(fs.readFileSync(new URL('colors.json',import.meta.url),'utf8'));
export function themeFor(name=colorConfig.documentationTheme) {
  const theme=colorConfig.themes[name];
  if(!theme)throw new Error(`Unknown diagram theme: ${name}`);
  for(const role of ['background','ink','construction','secondary','guide','angle','adjusted','adjustedSecondary','accepted','rejected','edge','alignment','text','textBackground']) {
    if(!/^#[0-9A-F]{6}$/i.test(theme[role]))throw new Error(`Theme ${name} needs a hex colour for ${role}`);
  }
  return theme;
}
const alpha = 40 * Math.PI / 180;
const ink = 'ink', guideInk = 'guide', construction = 'construction';
const adjustmentInk = 'adjusted';
const adjustmentStyle = (element,adjusted=true) => adjusted?{...element,adjusted:true,color:adjustmentInk}:element;
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
function highlightGap(points,view) {
  return points.slice(1).map((point,i)=>adjustmentStyle(worldLine(points[i],point,view,'adjusted-gap',adjustmentInk,2.2)));
}
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
function measure(a,b,value,view,offset=34,extensions=false) {
  if(/^-?\d+(\.\d+)?$/.test(value))value=Number(value).toFixed(2);
  const A=project(a,view),B=project(b,view);
  const dx=B[0]-A[0],dy=B[1]-A[1],norm=Math.hypot(dx,dy);
  const normal=[dy/norm*offset,-dx/norm*offset];
  const C=add(A,normal),D=add(B,normal),tick=[normal[0]/offset*4,normal[1]/offset*4];
  const result=[line(C,D,'dimension',construction,.8),line(add(C,mul(tick,-1)),add(C,tick),'dimension',construction,.8),line(add(D,mul(tick,-1)),add(D,tick),'dimension',construction,.8),text(add(mul(add(C,D),.5),[0,-9]),value)];
  if(extensions)for(const [origin,end] of [[A,C],[B,D]])result.push(line(origin,add(end,mul(normal,4/Math.abs(offset))),'dimension',construction,.6));
  return result;
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
    const highlights=gaps.flatMap((gap,i)=>changed[i]?highlightGap([[points[i],0],[points[i+1],0]],view):[]);
    const elements=[...base,...highlights,...points.flatMap((x,i)=>opening([x,0],alpha,view,{marked:changed[i-1]||changed[i]}))];
    for(const [i,gap] of gaps.entries()) {
      elements.push(...measure([points[i],0],[points[i+1],0],gap.toFixed(2),view,-64).map(e=>
        adjustmentStyle(e.type==='text'?{...e,kind:'gap-value',size:15}:{...e,kind:'gap-dimension'},changed[i])));
    }
    if(points.length===openings) {
      const last=project([points.at(-1),0],view)[0],end=project([length,0],view)[0];
      const remaining=Math.max(0,length-points.at(-1));
      elements.push(
        line([last,view.y],[end,view.y],'residual-dimension','angle',3),
        {...text([(last+end)/2,view.y+55],remaining.toFixed(2)),kind:'residual-value',color:'angle',size:13,bold:false});
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
    if(adjusted(i))row.push(...highlightGap([station,positions[arm][i+1]??0].map(t=>arm===0?[-t,0]:[0,-t]),view));
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
  const fits=[ci[0],co[1]].map((c,arm)=>selectFit({D:lengths[arm]+c-3,p:3}));
  if(fits.some(f=>!f||f.n!==input.armIntervals-1))throw new Error('Corner comparison needs equal-count feasible arm fits');
  const targets=[stations(fits[0]).map(x=>lengths[0]-x),stations(fits[1]).map(x=>3-co[1]+x).toReversed()];
  const anchored=[
    referenceRows[0].map((x,i)=>i===input.armIntervals-1?3-ci[0]:x),
    referenceRows[1].map(x=>x-(co[1]-referenceVirtuals[1][1]))
  ];
  const draw=(rows,virtuals,showHole)=>{
    const elements=[...base];
    virtuals.forEach(c=>{if(Math.hypot(...c)>1e-9)elements.push(worldLine([0,0],c,view,'extension',guideInk,1,true));});
    for(const [arm,points] of rows.entries()) {
      const position=x=>arm===0?[-x,0]:[virtuals[1][0],-x],gaps=points.slice(1).map((x,i)=>points[i]-x);
      const changed=gaps.map(g=>Math.abs(g-3)>1e-6);
      changed.forEach((yes,i)=>{if(yes)elements.push(...highlightGap([position(points[i]),position(points[i+1])],view));});
      points.forEach((x,i)=>elements.push(...opening(position(x),arm===0?alpha:alpha-Math.PI/2,view,{marked:changed[i-1]||changed[i]})));
      elements.push(...opening(virtuals[arm],arm===0?alpha:alpha-Math.PI/2,view,{virtual:true}));
    }
    if(showHole)elements.push(hole(joint,view));
    return elements;
  };
  const align=t=>{
    const incoming=[lerp(referenceVirtuals[0][0],ci[0],t),0];
    // The incoming lower tip carries the outgoing virtual slit and its row.
    // Sliding the incoming neighbour brings the entire outgoing row onto its guide.
    const tip=add(incoming,mul(ui,-h)),outgoing=add(tip,mul(uo,-h));
    const rows=[anchored[0].map((x,i)=>lerp(referenceRows[0][i],x,t)),anchored[1]];
    return draw(rows,[incoming,outgoing],false);
  };
  frame(s,align(0),100,'crossing');
  for(let i=1;i<=30;i++)frame(s,align(ease(i/30)),8,'align-terminal-tips');
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
  const scale=layout?.scale??16;
  const view={x:(600-length*scale)/2,y:187.5,scale},left=reference-1.5,right=reference+1.5;
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
    const highlights=gaps.flatMap((gap,i)=>changed[i]?highlightGap([[points[i],0],[points[i+1],0]],view):[]);
    const result=[...base,...spans,...protectedDimension,...highlights,...points.flatMap((x,i)=>opening([x,0],alpha,view,{marked:changed[i-1]||changed[i]}))];
    for(const [i,gap] of gaps.entries()) {
      if(i===leftPoints.length-1)continue;
      result.push(...measure([points[i],0],[points[i+1],0],gap.toFixed(2),view,-78).map(e=>
        adjustmentStyle({...e,kind:e.type==='text'?'gap-value':'gap-dimension'},changed[i])));
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
      {...text(label,'Local tangent'),kind:'tangent-label',color:ink},...opening(center,tangent+alpha,view,{proposed:true})],
      i===0||i===30?input.tangentHoldCentiseconds:input.tangentFrameCentiseconds,'local-tangent');
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
  result.push(...measure([ci[0]-3,0],ci,'3',view,36,true));
  return finish(s,result);
}

function modelSolutionScene() {
  const spec=catalog.illustrations.find(item=>item.id==='ILL-MODEL-SOLUTION');
  const {view,spanLength:D,arcRadii,durationScale}=spec.inputs,p=spec.pitch,h=spec.slitLength/2;
  const ui=axis(alpha),uo=axis(alpha-Math.PI/2);
  const joint=[h*uo[0],-h*ui[1]],ci=add(joint,mul(ui,h)),co=add(joint,mul(uo,-h));
  const near=[ci[0]-p,0],start=[near[0]-2*D-p,0],stem=[0,co[1]-p-D],branch=add(stem,[0,-p]);
  const left=[start[0]+D,0],right=[left[0]+p,0],landmark=(left[0]+right[0])/2;
  const straight=(a,b,angle,offset)=>({a,b,angle:()=>angle,advance:q=>q,offset,
    point:t=>add(a,mul(add(b,mul(a,-1)),t/D)),fit:selectFit({D,p})});
  const spans=[straight(start,left,alpha,36),straight(right,near,alpha,36),
    straight([0,co[1]-p],stem,alpha-Math.PI/2,44)];
  const arcs=arcRadii.map((R,i)=>{
    const sign=i===0?-1:1,step=2*Math.asin(p/(2*R)),sweep=D/R;
    const point=theta=>add(branch,[sign*R*Math.sin(theta),R*(Math.cos(theta)-1)]);
    return {R,sign,step,sweep,point,end:i===0?2*step+2*sweep:step+sweep,
      angle:theta=>(i===0?Math.PI+theta:-theta)+alpha};
  });
  for(const [arm,arc] of arcs.entries())for(const origin of arm===0?[arc.step,2*arc.step+arc.sweep]:[arc.step]) {
    spans.push({a:arc.point(origin),b:arc.point(origin+arc.sweep),arc,origin,offset:arm===0?36:-36,
      point:t=>arc.point(origin+t/arc.R),angle:t=>arc.angle(origin+t/arc.R),
      advance:q=>2*arc.R*Math.asin(q/(2*arc.R)),fit:selectFit({p,R:arc.R,sweep:arc.sweep})});
  }
  for(const span of spans) {
    if(!span.fit)throw new Error('Model illustration has no span fit.');
    span.fitted=[0];
    for(let i=0;i<span.fit.n;i++)span.fitted.push(span.fitted.at(-1)+span.advance(
      i>=span.fit.i&&i<span.fit.i+span.fit.k?span.fit.correctedPitch:p));
    span.initial=span.fitted.map((_,i)=>i===span.fit.n?D:i*span.advance(p));
  }
  const arc=arcs[0],landmarkAngle=arc.step+arc.sweep+arc.step/2;
  const landmarkPoint=arc.point(landmarkAngle),normal=[-Math.sin(landmarkAngle),Math.cos(landmarkAngle)];
  const base=[worldLine(start,[0,0],view),worldLine([0,0],branch,view),
    worldLine([0,0],ci,view,'extension',guideInk,1,true),worldLine([0,0],co,view,'extension',guideInk,1,true),
    ...arcs.flatMap(a=>Array.from({length:40},(_,i)=>worldLine(a.point(a.end*i/40),a.point(a.end*(i+1)/40),view))),
    ...routeMarks(project(start,view),project(arcs[0].point(arcs[0].end),view),[1,0],[-Math.cos(arcs[0].end),Math.sin(arcs[0].end)]),
    notationText(add(project(arcs[1].point(arcs[1].end),view),[12,15]),'e','end'),
    notationText(add(project(joint,view),[20,12]),'j','junction'),
    notationText(add(project(branch,view),[0,-23]),'j','junction')];
  const s=scene('model-solution','Fix landmarks and junctions, then fit the free spans',spec.id);
  const step=label=>termLabel([170,210],label);
  frame(s,[...base,...step('Mark landmarks')],100,'guides');
  base.push(worldLine([landmark,-.8],[landmark,.8],view,'landmark',ink,2),
    notationText(add(project([landmark,0],view),[0,27]),'L1','landmark'),
    worldLine(add(landmarkPoint,mul(normal,-.8)),add(landmarkPoint,mul(normal,.8)),view,'landmark',ink,2),
    notationText(add(project(landmarkPoint,view),[-25,-12]),'L2','landmark'));
  frame(s,[...base,...step('Mark landmarks')],140,'landmarks');
  const fixed=[...base,...[start,left,right].flatMap(c=>opening(c,alpha,view)),
    ...opening(spans[3].b,spans[3].angle(D),view),...opening(spans[4].a,spans[4].angle(0),view),
    ...[4,5].flatMap(i=>opening(spans[i].b,spans[i].angle(D),view))];
  frame(s,[...fixed,...step('Fixed landmark pairs')],140,'fixed-features');
  fixed.push(...opening(near,alpha,view),...opening(spans[2].a,alpha-Math.PI/2,view),
    ...opening(stem,alpha-Math.PI/2,view),
    ...[3,5].flatMap(i=>opening(spans[i].a,spans[i].angle(0),view)));
  frame(s,[...fixed,...step('Junctions')],60,'junction-neighbours');
  fixed.push(...opening(ci,alpha,view,{virtual:true}),...opening(co,alpha-Math.PI/2,view,{virtual:true}));
  frame(s,[...fixed,...step('Junctions')],80,'junction-virtuals');
  fixed.push(hole(joint,view),hole(branch,view));
  frame(s,[...fixed,...step('Junctions')],140,'junction-holes');
  const spanDimensions=spans.flatMap((span,i)=>{
    if(!span.arc)return measure(span.a,span.b,D.toFixed(2),view,i===2?65:-55).map(e=>
      e.type==='text'&&i===2?{...e,p:add(e.p,[23,9])}:e);
    // A curved free span is measured along its arc, not by its endpoint chord.
    const {arc,origin}=span,radius=arc.R+48/view.scale;
    const point=theta=>add(add(branch,[0,-arc.R]),[arc.sign*radius*Math.sin(theta),radius*Math.cos(theta)]);
    const elements=Array.from({length:20},(_,j)=>worldLine(point(origin+arc.sweep*j/20),point(origin+arc.sweep*(j+1)/20),view,'dimension',construction,.8));
    for(const theta of [origin,origin+arc.sweep]) {
      const n=[arc.sign*Math.sin(theta),Math.cos(theta)],c=point(theta);
      elements.push(worldLine(add(c,mul(n,-4/view.scale)),add(c,mul(n,4/view.scale)),view,'dimension',construction,.8));
    }
    elements.push(text(add(project(point(origin+arc.sweep/2),view),[arc.sign*8,-12]),D.toFixed(2)));
    return elements;
  });
  frame(s,[...fixed,...spanDimensions,...step('Free spans')],160,'free-spans');
  const cornerHole=hole(joint,view),branchHole=hole(branch,view);
  const fixedConstruction=[...base,...opening(ci,alpha,view,{virtual:true}),...opening(co,alpha-Math.PI/2,view,{virtual:true}),cornerHole,branchHole];
  const draw=(t,residual=false)=>{
    const elements=[...fixedConstruction],paths=[];
    for(const [arm,span] of spans.entries()) {
      const row=span.initial.map((v,i)=>lerp(v,span.fitted[i],t)),points=row.map(span.point);
      const changed=row.slice(1).map((v,i)=>Math.abs(v-row[i]-span.advance(p))>1e-6),path=[];
      changed.forEach((yes,i)=>{if(yes)elements.push(...highlightGap(
        Array.from({length:span.arc?13:2},(_,j)=>span.point(lerp(row[i],row[i+1],j/(span.arc?12:1)))),view));});
      for(const [i,c] of points.entries()) {
        const slit=opening(c,span.angle(row[i]),view,{marked:changed[i-1]||changed[i]});
        elements.push(...slit);path.push(slit[0]);
      }
      paths.push(path);
      if(residual) {
        const nominal=span.fit.n*span.advance(p),label=add(project(span.point((nominal+D)/2),view),arm===2?[30,4]:[0,-25]);
        const points=Array.from({length:span.arc?13:2},(_,i)=>span.point(lerp(nominal,D,i/(span.arc?12:1))));
        elements.push(...points.slice(1).map((b,i)=>worldLine(points[i],b,view,'residual-dimension','angle',3)),
          {...text(label,(D-nominal).toFixed(2)),kind:'residual-value',color:'angle'});
      } else for(let i=0;i<changed.length;i++)if(changed[i])elements.push(...measure(
        points[i],points[i+1],Math.hypot(...add(points[i+1],mul(points[i],-1))).toFixed(2),view,span.offset).map(e=>
          adjustmentStyle(arm===2&&e.type==='text'?{...e,p:add(e.p,[22,9])}:e)));
    }
    return {elements,paths:[[...paths[0],...paths[1],cornerHole,...paths[2],branchHole,...paths[5]],
      [branchHole,...paths[3],...paths[4]]]};
  };
  frame(s,[...draw(0,true).elements,...step('Redistribute')],180,'residuals');
  frame(s,[...draw(0).elements,...step('Redistribute')],80,'adjustment-start');
  for(let i=1;i<=30;i++)frame(s,[...draw(ease(i/30)).elements,...step('Redistribute')],8,'planning-revision');
  const final=draw(1);
  s.threadPaths=final.paths;
  const result=slitOutlines(finishThread(finish(s,final.elements)));
  result.frames=result.frames.map(f=>({...f,delay:f.delay*durationScale}));
  return result;
}

function junctionScene() {
  const input=catalog.illustrations.find(item=>item.id==='ILL-JUNCTION').inputs;
  const {view}=input,center=input.junction;
  const arms=input.arms.map(end=>{
    const distance=Math.hypot(...end),fit=selectFit({D:distance-3,p:3});
    if(!fit)throw new Error('T-junction illustration has no fit.');
    const fitted=stations(fit).map(s=>distance-s);
    const initial=fitted.map((s,i)=>i===fit.n?3:distance-i*3);
    return {end,distance,initial,fitted,angle:end[1]<0?alpha-Math.PI/2:alpha};
  });
  const base=arms.map(arm=>worldLine(center,arm.end,view));
  const drawArm=(arm,row,annotated=false)=>{
    const points=row.map(s=>mul(arm.end,s/arm.distance));
    const changed=row.slice(1).map((s,i)=>Math.abs(row[i]-s-3)>1e-6);
    const elements=[...changed.flatMap((yes,i)=>annotated&&yes?highlightGap([points[i],points[i+1]],view):[]),
      ...points.flatMap((point,i)=>opening(point,arm.angle,view,{marked:annotated&&(changed[i-1]||changed[i])}))];
    if(annotated)for(let i=0;i<changed.length;i++)if(changed[i])elements.push(...measure(
      points[i],points[i+1],(row[i]-row[i+1]).toFixed(2),view,arm.end[0]<0?32:-38).map(e=>
        adjustmentStyle(arm.end[0]===0&&e.type==='text'?{...e,p:add(e.p,[22,9])}:e)));
    return elements;
  };
  const s=scene('axiom-junction','Three arms share one round hole','A9');
  frame(s,base,100,'arms');
  const result=[...base];
  const revealSteps=Math.max(...arms.map(arm=>arm.initial.length));
  for(let i=0;i<revealSteps;i++) {
    for(const arm of arms) {
      const station=arm.initial[i];
      if(station===undefined)continue;
      result.push(...opening(mul(arm.end,station/arm.distance),arm.angle,view));
    }
    frame(s,[...result],i===revealSteps-1?140:70,'arms-stitch');
  }
  result.push(hole(center,view));frame(s,[...result],170,'shared-hole');
  const draw=t=>[...base,hole(center,view),...arms.flatMap(arm=>drawArm(arm,arm.initial.map((v,i)=>lerp(v,arm.fitted[i],t)),true))];
  frame(s,draw(0),120,'free-spans');
  for(let i=1;i<=30;i++)frame(s,draw(ease(i/30)),8,'planning-revision');
  return finish(s,draw(1));
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
      changed.forEach((yes,j)=>{if(yes)elements.push(...highlightGap(Array.from({length:13},(_,n)=>a.point(lerp(rows[i][j],rows[i][j+1]??0,n/12))),view));});
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

function statusMark(p,valid) {
  const kind=valid?'accepted':'rejected';
  const segments=valid?[[[-5,0],[-1,4]],[[-1,4],[6,-5]]]:[[[-4,-4],[4,4]],[[-4,4],[4,-4]]];
  return segments.map(([a,b])=>line(add(p,a),add(p,b),kind,kind,1.4));
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
  const profiles=[],checks=[];
  const drawing=()=>[...base,...profiles,...checks];
  for(let n=input.steps.length-1;n>=0;n--) {
    for(let arm=0;arm<2;arm++) {
      const point=centre(arm,input.steps[n]),u=mul(axis(alpha+(arm===0?half:-half)),h);
      const a=add(point,mul(u,-1)),b=add(point,u);
      profiles.push(worldLine(a,b,view,'slit',ink,input.width*view.scale));
    }
    const x=(project(centre(0,input.steps[n]),view)[0]+project(centre(1,input.steps[n]),view)[0])/2;
    const p=[x,275],gap=input.edgeClearances[n],valid=gap>=input.margin;
    checks.push(...statusMark(p,valid));
    checks.push(text([x,303],gap<0?'Overlap':gap.toFixed(2)));
  }
  const virtuals=directions.flatMap((d,i)=>opening(centre(i,0),alpha+(i===0?half:-half),view,{virtual:true}));
  return {...s,final:[...drawing(),...virtuals,hole(joint,view)],staticGif:true};
}

function noFitScene() {
  const spec=catalog.illustrations.find(i=>i.id==='ILL-NOFIT'),input=spec.inputs;
  const s=scene('fit-rejected','No gap count fits the permitted spacing','A5, A7');
  const result=[...termLabel([300,18],`Pitch ${spec.pitch.toFixed(2)} mm`)];
  for(const [row,count] of [2,3].entries()) {
    const view={x:160,y:110+160*row,scale:40},gap=input.length/count;
    result.push(...straightBase(input.length,view),...routeMarks(project([0,0],view),project([input.length,0],view)));
    for(let i=0;i<=count;i++)result.push(...opening([i*gap,0],alpha,view));
    for(let i=0;i<count;i++)result.push(...measure([i*gap,0],[(i+1)*gap,0],gap.toFixed(2),view,-45));
    if(row===0)result.push(...measure([0,0],[input.length,0],input.length.toFixed(2),view,60));
    const reason=row===0?`Too long: maximum ${input.maximumGap.toFixed(2)} mm`:`Too short: minimum ${input.minimumGap.toFixed(2)} mm`;
    result.push(...statusMark([170,view.y+76],false),...termLabel([310,view.y+80],reason));
  }
  return {...s,final:result,staticGif:true};
}

function closureScene() {
  const input=catalog.illustrations.find(i=>i.id==='ILL-CLOSURE').inputs;
  const {radius,count,landmarksDegrees}=input,view={x:300,y:187.5,scale:13};
  const step=2*Math.asin(3/(2*radius)),diameter=landmarksDegrees[0]*Math.PI/180;
  const point=angle=>mul(axis(angle),radius),start=diameter-step/2;
  // Each diameter intersection is midway through a protected nominal gap.
  const fit=selectFit({R:radius,p:3,sweep:Math.PI-step});
  if(!fit||2*(fit.n+1)!==count||!fit.exactCentre)throw new Error('Closed-loop illustration needs symmetric semicircle fits.');
  const half=[0];
  for(let i=0;i<fit.n;i++) {
    const changed=i>=fit.i&&i<fit.i+fit.k;
    half.push(half.at(-1)+2*Math.asin((changed?fit.correctedPitch:3)/(2*radius)));
  }
  const target=[...half,...half.map(a=>a+Math.PI)],nominal=target.map((a,i)=>i*step);
  const halfNominal=half.map((a,i)=>i===fit.n?Math.PI-step:i*step);
  const anchored=[...halfNominal,...halfNominal.map(a=>a+Math.PI)];
  const base=[];
  for(let i=0;i<120;i++)base.push(worldLine(point(start-i*2*Math.PI/120),point(start-(i+1)*2*Math.PI/120),view));
  base.push(worldLine(mul(axis(diameter),radius+.8),mul(axis(diameter),-radius-.8),view,'landmark',construction,1.4));
  for(let i=0;i<2;i++)base.push(notationText(add(project(point(diameter-i*Math.PI),view),[-23,i===0?-12:23]),`L${i+1}`,'landmark'));
  const s=scene('axiom-closure','Close the loop without duplicating the start','A8');
  frame(s,base,75,'guide');
  let result=[...base,...opening(point(start),alpha-step/2,view)];
  frame(s,result,100,'reserved-start');
  for(let i=1;i<count;i++) {
    result.push(...opening(point(start-i*step),alpha-step/2-i*step,view));
    frame(s,[...result],i<4?35:18,'around-loop');
  }
  const draw=angles=>{
    const elements=[...base];
    const changed=angles.slice(1).map((a,i)=>Math.abs(2*radius*Math.sin((a-angles[i])/2)-3)>1e-6);
    for(let i=0;i<count-1;i++)if(changed[i])
      elements.push(...highlightGap(Array.from({length:13},(_,n)=>point(start-lerp(angles[i],angles[i+1],n/12))),view));
    for(let i=0;i<count;i++) {
      const angle=angles[i];
      elements.push(...opening(point(start-angle),alpha-step/2-angle,view,{marked:changed[i-1]||changed[i]}));
    }
    const residual=(a,b)=>{
      if(b-a<1e-8)return;
      for(let i=0;i<12;i++)elements.push(worldLine(
        point(start-lerp(a,b,i/12)),point(start-lerp(a,b,(i+1)/12)),
        view,'residual-dimension','angle',3));
    };
    const terminal=angles.at(-1)+step;
    if(2*Math.PI-terminal>1e-8) {
      elements.push(...opening(point(start-terminal),alpha-step/2-terminal,view,{proposed:true}));
      residual(terminal,2*Math.PI);
    }
    for(const end of [fit.n,count-1])residual(angles[end-1]+step,angles[end]);
    return elements;
  };
  frame(s,draw(nominal),150,'closure-mismatch');
  for(let i=1;i<=20;i++)frame(s,draw(nominal.map((a,j)=>lerp(a,anchored[j],ease(i/20)))),8,'reserve-landmarks');
  frame(s,draw(anchored),140,'protected-pairs');
  for(let i=1;i<=30;i++)frame(s,draw(anchored.map((a,j)=>lerp(a,target[j],ease(i/30)))),8,'planning-revision');
  frame(s,draw(target),100,'reuse-start');
  return finish(s,draw(target));
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
  const highlights=points.slice(1).flatMap((x,i)=>Math.abs(x-points[i]-3)>1e-6?highlightGap([[points[i],0],[x,0]],view):[]);
  let result=[...base,...highlights,...source];frame(s,result,160,'source-solved');
  for(const [i,x] of points.entries()) {
    const copy=opening([x,0],alpha,view,{marked:i>=4&&i<=6}).map(reflect);
    if(i>0&&Math.abs(x-points[i-1]-3)>1e-6)result.push(...highlightGap([[points[i-1],0],[x,0]],view).map(reflect));
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
  const primitives=variant(caseId).route.primitives.map(g=>({...g})),[incoming,outgoing]=primitives;
  const lengths=primitives.map(primitiveLength),loci=[locus(incoming,-1),locus(outgoing,1)],vertex=primitivePoint(incoming,lengths[0]);
  const roots=intersections(...loci).sort((a,b)=>Math.hypot(a[0]-vertex[0],a[1]-vertex[1])-Math.hypot(b[0]-vertex[0],b[1]-vertex[1]));
  const joint=roots[0],virtual=[virtualStation(incoming,loci[0],joint,lengths[0]),virtualStation(outgoing,loci[1],joint,0)];
  const steps=primitives.map((g,i)=>{
    const low=Math.max(advance(g,2.7),i===0?virtual[i]-lengths[i]:-virtual[i]);
    const high=Math.min(advance(g,3.3),i===0?virtual[i]:lengths[i]-virtual[i]);
    if(low>high)throw new Error('No permitted illustrated corner step');
    return Math.max(low,Math.min(high,advance(g,3)));
  });
  if(caseId==='A04') {
    const count=catalog.illustrations.find(i=>i.id==='ILL-ARC-ARC').inputs.outgoingNominalSlits;
    // Extend only the illustrated outer end; keep its circle and corner construction fixed.
    lengths[1]=Math.max(lengths[1],virtual[1]+steps[1]+(count-1)*advance(outgoing,3));
    outgoing.sweep=Math.sign(outgoing.sweep)*lengths[1]/outgoing.radius;
  }
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
  if(Math.abs(gap-3)>1e-6)result.unshift(...highlightGap(Array.from({length:13},(_,n)=>primitivePoint(g,lerp(virtual[selected],stations[selected][0],n/12))),view));
  result.push(...measure(a,b,gap.toFixed(2),view,caseId==='J08'?-50:-35,true).map(e=>adjustmentStyle(e,Math.abs(gap-3)>1e-6)));
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
  result.push(...original.final.filter(e=>['slit','adjustment-mark','adjusted-gap'].includes(e.kind)),...termLabel([401,66],'Slit',[401,180]));
  result.push(...measure([0,0],[3,0],'p',view,-78),...termLabel([84,294],'Nominal gap'));
  result.push(...measure([6,0],[8.75,0],'g',view,-78).map(e=>adjustmentStyle(e)),...termLabel([178,294],'Adjusted gap'));
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
  result.push(worldLine(a,b,view,'slit-axis','background',1,true),...termLabel([270,310],'Axis',[270,200]));
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
  const {view}=catalog.illustrations.find(item=>item.id==='ILL-JUNCTION').inputs;
  result.push(...termLabel([300,view.y-60],'Junction / round hole',[300,view.y-11]));
  for(const x of [185,415])result.push(...termLabel([x,220],'Arm',[x,view.y]));
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
    const {arms,junction,view}=catalog.illustrations.find(item=>item.id==='ILL-JUNCTION').inputs;
    marks=[...routeMarks(project(arms[0],view),project(arms[1],view)),endMark(project(arms[2],view),[0,1]),...directionMark(project(junction,view),[0,1])];
  } else if(s.name==='axiom-closure') {
    const {radius,landmarksDegrees}=catalog.illustrations.find(i=>i.id==='ILL-CLOSURE').inputs;
    const start=landmarksDegrees[0]*Math.PI/180-Math.asin(3/(2*radius));
    marks=startMark(project(mul(axis(start),radius),{x:300,y:187.5,scale:13}),[Math.sin(start),Math.cos(start)]);
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
  throw new Error(`Thread path missing for ${s.name}`);
}
function bridgeComparison(s) {
  const profile=catalog.illustrations.find(i=>i.id===s.source),count=profile.inputs.armIntervals;
  const slits=s.final.filter(e=>e.kind==='slit'),outgoing=slits.slice(count);
  const scale=Math.hypot(...add(slits[0].b,mul(slits[0].a,-1)))/profile.slitLength;
  const advance=profile.inputs.bridgeIncomingAdvance*scale;
  const incoming=slits.slice(0,count).map(e=>({...e,a:add(e.a,[advance,0]),b:add(e.b,[advance,0])}));
  const from=incoming.at(-1).b,to=outgoing.at(-1).a,dx=to[0]-from[0],dy=to[1]-from[1];
  const shiftFor=length=>{
    if(length*scale<Math.abs(dx))throw new Error('Bridge length is shorter than its horizontal separation.');
    return dy-Math.sqrt((length*scale)**2-dx*dx);
  };
  const shifts=profile.inputs.bridgeThreadLengths.map(shiftFor);
  const draw=shift=>{
    const row=outgoing.map(e=>({...e,a:add(e.a,[0,-shift]),b:add(e.b,[0,-shift])}));
    const path=[...incoming,...row.toReversed()];
    const threads=path.slice(1).map((next,i)=>line(path[i].b,next.a,'thread',ink,1.8));
    const base=s.final.filter(e=>e.kind!=='slit').map(e=>{
      if(e.kind==='notation-end')return {...e,p:add(e.p,[0,-shift])};
      if(e.kind==='notation-start')return {...e,p:add(e.p,[advance,0])};
      if(e.kind==='direction')return {...e,a:add(e.a,[advance,0]),b:add(e.b,[advance,0])};
      return e;
    });
    return {elements:[...base,...incoming,...row,...threads,...cornerThreadAngles(s,threads),...cornerThreadLengths(s,threads)],path};
  };
  const first=draw(shifts[0]),frames=[];
  for(const [a,b,stage] of [[0,1,'short-bridge'],[1,0,'long-bridge']]) {
    frames.push({elements:draw(shifts[a]).elements,delay:profile.inputs.bridgeHoldCentiseconds,stage,holeLightening:1});
    // Endpoint holds belong to the next leg, including the GIF loop boundary.
    for(let i=1;i<=30;i++)frames.push({elements:draw(shiftFor(lerp(profile.inputs.bridgeThreadLengths[a],profile.inputs.bridgeThreadLengths[b],ease(i/31)))).elements,
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
  for(const slit of [placed[count-1],placed.at(-1)])result.unshift(...highlightGap(
    [openingCentre(slit),joint.p].map(p=>[p[0],-p[1]]),{x:0,y:0,scale:1}));
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
    // Put the bridge value below its bracket so the long position clears the incoming thread.
    if(s.name==='problem-corner-bridge')return dimensions.map(e=>e.type==='text'?{...e,p:add(e.p,[0,18])}:e);
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
      {type:'polygon',points:[origin,...points],p:origin,kind:'angle-wedge',color:'angle',opacity:.22},
      line(origin,add(origin,mul(tangent,28)),'angle-reference','angle',.8,true),
      ...points.slice(1).map((p,i)=>line(points[i],p,'thread-angle','angle',1)),
      line(arm===0?add(label,[0,4]):add(label,[-28,-4]),anchor,'angle-leader','angle',.8),
      {...text(label,`${degrees.toFixed(1)}\u00b0`),kind:'thread-angle-value',color:'angle',size:13}
    ];
  });
}
function slitOutlines(s) {
  const style=elements=>elements.map(e=>{
    if(e.type==='text'&&['measurement','gap-value','residual-value'].includes(e.kind))return {...e,size:13,bold:false};
    if(['slit','proposal'].includes(e.kind))return {...e,color:construction,outline:!e.round,outlineWidth:.8};
    if(e.kind==='adjustment-mark')return adjustmentStyle({...e,width:.8});
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
    termsLayoutScene(),termsSlitScene(),termsJunctionScene(),termsChordScene()].map(annotateScene).map(finishThread).map(slitOutlines).concat(curvedJunctionScene(),modelSolutionScene());
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

export function displayElements(elements,amount=elements.some(e=>e.kind==='thread')?1:0,theme=themeFor()) {
  return elements.map(e=>{
    if(!/^#[0-9A-F]{6}$/i.test(theme[e.color]))throw new Error(`Unknown diagram colour role: ${e.color} (${e.kind})`);
    const start=theme[e.type==='text'&&!['angle','adjusted'].includes(e.color)?'text':e.color];
    let shown={...e,color:start};
    if(e.type==='text') {
      const font=colorConfig.typography,landmark=e.value.match(/^L(\d+)$/);
      const math=Boolean(landmark)||['notation-start','notation-end'].includes(e.kind);
      const numeric=/^[+-]?\d+(?:\.\d+)?\u00b0?$/.test(e.value);
      const size=e.size*font.sizeScale*(math?font.notationSizeScale:1);
      // Conservative em boxes keep labels clear in both renderers, without a font dependency.
      const width=e.value.length*size*.65+2*font.paddingX,height=size*(landmark?1.4:1.15)+2*font.paddingY;
      shown={...shown,size,fontFamily:math?font.notationFontFamily:numeric?font.numberFontFamily:font.fontFamily,textBackground:font.background?theme.textBackground:null,
        textBox:{x:e.p[0]-width/2,y:e.p[1]-size*.92-font.paddingY,width,height}};
      if(math)shown.fontItalic=true;
      if(landmark) {
        const baseWidth=size*.36,subWidth=landmark[1].length*size*.7*.55,left=e.p[0]-(baseWidth+subWidth)/2;
        shown.textRuns=[
          {value:'l',x:left+baseWidth/2,y:e.p[1],size,italic:true},
          {value:landmark[1],x:left+baseWidth+subWidth/2,y:e.p[1]+size*.25,size:size*.7,italic:false}
        ];
      }
    }
    if(!amount||!['slit','proposal','hole','virtual','measurement','dimension','gap-value','gap-dimension','span-label','span-dimension','thread-length-value','thread-length-dimension'].includes(e.kind))return shown;
    const target=e.adjusted?theme.adjustedSecondary:theme.secondary;
    const color='#'+[1,3,5].map(i=>Math.round(lerp(parseInt(start.slice(i,i+2),16),parseInt(target.slice(i,i+2),16),amount)).toString(16).padStart(2,'0')).join('').toUpperCase();
    return {...shown,color};
  });
}
// Presentation only: keep model coordinates and a common camera across comparisons.
export function portraitScenes(scenes,theme=themeFor()) {
  const bounds=new Map();
  for(const s of scenes) {
    const box=bounds.get(s.source)??[Infinity,Infinity,-Infinity,-Infinity];
    for(const elements of [s.final,...s.frames.map(f=>f.elements)])for(const e of elements) {
      const points=e.type==='line'?[e.a,e.b]:e.type==='polygon'?e.points:[e.p];
      const math=e.type==='text'&&(/^L\d+$/.test(e.value)||['notation-start','notation-end'].includes(e.kind));
      const pad=e.type==='text'?Math.max(e.size,e.value.length*e.size*.325)*colorConfig.typography.sizeScale*(math?colorConfig.typography.notationSizeScale:1)+Math.max(colorConfig.typography.paddingX,colorConfig.typography.paddingY):(e.radius??e.width??0);
      for(const p of points){box[0]=Math.min(box[0],p[0]-pad);box[1]=Math.min(box[1],p[1]-pad);box[2]=Math.max(box[2],p[0]+pad);box[3]=Math.max(box[3],p[1]+pad);}
    }
    bounds.set(s.source,box);
  }
  return scenes.map(s=>{
    const b=bounds.get(s.source),scale=Math.min(1.55,528/(b[2]-b[0]),654/(b[3]-b[1]));
    return {...s,canvas:{width:600,height:750,background:theme.background,scale,x:300-scale*(b[0]+b[2])/2,y:375-scale*(b[1]+b[3])/2},
      displayed:true,final:displayElements(s.final,undefined,theme),frames:s.frames.map(f=>({...f,elements:displayElements(f.elements,f.holeLightening,theme)}))};
  });
}
export function svg(scene) {
  const canvas=scene.canvas??{width:600,height:750,background:themeFor().background,scale:1,x:0,y:187.5};
  const elements=(scene.displayed?scene.final:displayElements(scene.final)).map(e=>{
    if(e.type==='line') {
      const axisLine=`<line class="${e.kind}" x1="${n(e.a[0])}" y1="${n(e.a[1])}" x2="${n(e.b[0])}" y2="${n(e.b[1])}" stroke="${e.outline?canvas.background:e.color}" stroke-width="${e.width}"${e.dash?' stroke-dasharray="4 4"':''}${e.round?' stroke-linecap="round"':''}/>`;
      if(!e.outline)return axisLine;
      return axisLine+`<polygon class="slit-outline" points="${rectanglePoints(e).map(p=>p.map(n).join(',')).join(' ')}" fill="${canvas.background}" stroke="${e.color}" stroke-width="${e.outlineWidth}"${e.dash?' stroke-dasharray="4 4"':''}/>`;
    }
    if(e.type==='circle')return `<circle class="${e.kind}" cx="${n(e.p[0])}" cy="${n(e.p[1])}" r="${n(e.radius)}" fill="${e.color}"/>`;
    if(e.type==='polygon')return `<polygon class="${e.kind}" points="${e.points.map(p=>p.map(n).join(',')).join(' ')}" fill="${e.color}" fill-opacity="${e.opacity??1}"/>`;
    const box=e.textBox;
    const background=e.textBackground?`<rect class="label-background" x="${n(box.x)}" y="${n(box.y)}" width="${n(box.width)}" height="${n(box.height)}" fill="${e.textBackground}"/>`:'';
    const content=e.textRuns?e.textRuns.map(run=>`<tspan x="${n(run.x)}" y="${n(run.y)}" font-size="${n(run.size)}" font-style="${run.italic?'italic':'normal'}">${escape(run.value)}</tspan>`).join(''):escape(e.value);
    return background+`<text class="${e.kind}" x="${n(e.p[0])}" y="${n(e.p[1])}" text-anchor="middle" font-family="${escape(e.fontFamily)}" font-size="${e.size}"${e.fontItalic?' font-style="italic"':''}${e.bold?' font-weight="bold"':''} fill="${e.color}">${content}</text>`;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}" viewBox="0 0 ${canvas.width} ${canvas.height}" role="img" aria-labelledby="title description"><title id="title">${escape(scene.title)}</title><desc id="description">Analytic illustration of ${scene.source}. ${scene.frames.length?'Final state of the accompanying animation.':scene.threadPaths?'Static stitch diagram.':'Static terminology figure.'}</desc>\n<rect width="100%" height="100%" fill="${canvas.background}"/>\n<g transform="translate(${canvas.x} ${canvas.y}) scale(${canvas.scale})">\n${elements.join('\n')}\n</g>\n</svg>\n`;
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
    const displayed=scenes.every(s=>s.canvas)?scenes:portraitScenes(scenes,themeFor(process.argv[5]||undefined));
    fs.writeFileSync(path.join(temporary,'scenes.json'),JSON.stringify(displayed));
    for(const scene of displayed)fs.writeFileSync(path.join(output,scene.name+'.svg'),svg(scene));
  } else if(mode==='finish') {
    for(const scene of scenes.filter(s=>s.frames.length))fs.writeFileSync(path.join(output,scene.name+'.gif'),finalizeGif(fs.readFileSync(path.join(temporary,scene.name+'.gif')),scene));
  } else throw new Error('Use prepare or finish');
}
export {add,mul,axis,project,line,text,worldLine,opening,hole,measure,scene,frame,finish,routeMarks,notationText,finishThread,slitOutlines,adjustmentStyle,highlightGap};
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))writeSceneFiles(createScenes());
