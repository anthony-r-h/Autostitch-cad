// Isolated reconstructions for docs/counter_examples; no CAD writes.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {selectFit} from '../../tests/fit-oracle.mjs';
import {add,mul,axis,project,line,worldLine,opening,hole,measure,scene,frame,finish,
  routeMarks,notationText,finishThread,slitOutlines,writeSceneFiles} from '../illustrated/scenes.mjs';

const catalog=JSON.parse(fs.readFileSync(new URL('../../tests/cases.json',import.meta.url),'utf8'));
const input=id=>catalog.illustrations.find(i=>i.id===id).inputs;
function diagonalCorner() {
  const spec=input('ILL-SELLIER-CORNER'),p=spec.pitch;
  const angles=spec.armAxisDegrees.map(a=>a*Math.PI/180);
  const view={x:360,y:85,scale:25},length=spec.armGaps*p;
  const base=[worldLine([-length,0],[0,0],view),worldLine([0,0],[0,-length],view),
    ...routeMarks(project([-length,0],view),project([0,-length],view),[1,0],[0,1]),notationText([384,67],'j','junction')];
  const s=scene('sellier-diagonal-corner','A diagonal shared slit changes the two adjoining stitches','ILL-SELLIER-CORNER');
  const result=[...base],rows=[[],[]];
  for(const [arm,row] of rows.entries())for(let n=spec.armGaps;n>=1;n--) {
    const slit=opening(arm===0?[-n*p,0]:[0,-n*p],angles[arm],view)[0];
    row.push(slit);
  }
  result.push(...rows[0]);frame(s,[...result],100,'top-row');
  // Flip the vertical row across its guide. Horizontal foreshortening makes
  // the reflection visible; centres and the already-punched top row stay fixed.
  const mirrored=t=>rows[1].map(e=>({...e,
    a:[view.x+(e.a[0]-view.x)*(2*t-1),e.a[1]],
    b:[view.x+(e.b[0]-view.x)*(2*t-1),e.b[1]]}));
  frame(s,[...result,...mirrored(0)],100,'vertical-rear-style');
  for(let i=1;i<=30;i++) {
    const t=i/30;
    frame(s,[...result,...mirrored(t*t*(3-2*t))],8,'mirror-vertical');
  }
  result.push(...rows[1]);frame(s,[...result],90,'vertical-front-style');
  const shared=opening([0,0],spec.sharedSlitDegrees*Math.PI/180,view)[0];
  result.push(shared);frame(s,[...result],130,'diagonal-shared-slit');
  // The slit axes already encode the shown face. Connect their tips directly;
  // reversing them again would draw the opposite thread diagonal.
  s.threadPaths=[[...rows[0],shared,...rows[1].toReversed()]];
  const finished=slitOutlines(finishThread(finish(s,result)));
  // Weight only the two affected thread segments; all thread appears together.
  const emphasise=elements=>{
    let index=0;
    return elements.map(e=>e.kind==='thread'?{...e,width:[spec.armGaps-1,spec.armGaps].includes(index++)?2.6:1.8}:e);
  };
  return {...finished,final:emphasise(finished.final),frames:finished.frames.map(f=>({...f,elements:emphasise(f.elements)}))};
}

function threadAlignedStep(angle,tangent,p,h) {
  const tip=mul(axis(angle),h),thread=add(mul(tangent,p),mul(tip,-2));
  // Intersect the continuation of an ordinary thread with the pitch-radius
  // circle about the last slit centre. This keeps angle and spacing together.
  const dot=tip[0]*thread[0]+tip[1]*thread[1],length2=thread[0]**2+thread[1]**2;
  const t=(-dot+Math.sqrt(dot*dot+length2*(p*p-h*h)))/length2;
  return add(tip,mul(thread,t));
}

export function walletGeometry(diagonal=false) {
  const spec=input('ILL-SELLIER-WALLET'),p=spec.pitch,lean=-spec.leanDegrees*Math.PI/180,h=spec.slitLength/2;
  const ui=axis(lean),uo=axis(lean-Math.PI/2);
  const joint=[h*uo[0],-h*ui[1]],ci=add(joint,mul(ui,h)),co=add(joint,mul(uo,-h));
  const start=[ci[0]-spec.topSteps*p,0];
  const top=Array.from({length:spec.topSteps},(_,i)=>[start[0]+i*p,0]);
  const right=Array.from({length:spec.rightSteps-1},(_,i)=>[0,co[1]-(i+1)*p]);
  const rightAngle=diagonal?input('ILL-SELLIER-CORNER').armAxisDegrees[1]*Math.PI/180:lean-Math.PI/2;
  const rightAnchor=add(right.at(-1),threadAlignedStep(rightAngle,[0,-1],p,h));
  const across=axis(Math.PI/4),up=axis(3*Math.PI/4);
  const leftAnchor=add(rightAnchor,mul(across,-spec.hWidth));
  const decoration=[leftAnchor,rightAnchor].map(base=>[base,add(base,mul(up,spec.hHeight/2)),add(base,mul(up,spec.hHeight))]);
  const firstBottom=add(leftAnchor,threadAlignedStep(lean-Math.PI,[-1,0],p,h));
  const bottom=Array.from({length:spec.bottomSteps},(_,i)=>add(firstBottom,[-i*p,0]));
  const end=bottom.at(-1);
  return {spec,lean,joint,ci,co,start,end,rightAnchor,leftAnchor,decoration,top,right,bottom};
}

function walletScene(diagonal=false) {
  const g=walletGeometry(diagonal),view={x:435,y:45,scale:18};
  let vertex=[0,0];
  const reference=input('ILL-SELLIER-CORNER');
  if(diagonal) {
    // A real slit replaces the outgoing virtual centre; set the top row
    // nominally from that vertex.
    vertex=[0,g.co[1]];g.joint=vertex;
    g.top=g.top.map((p,i)=>[-(g.spec.topSteps-i)*g.spec.pitch,vertex[1]]);
    g.start=g.top[0];
  }
  const s=scene(diagonal?'sellier-wallet-diagonal':'sellier-wallet-autostitch',
    diagonal?'Shared diagonal corner slit with a decorative H':'Top, right and bottom stitching with a decorative H',
    diagonal?'ILL-SELLIER-WALLET-DIAGONAL':'ILL-SELLIER-WALLET');
  const circles=g.decoration.map(column=>column.map(p=>hole(p,view)));
  const base=[worldLine(g.start,vertex,view),worldLine(vertex,g.right.at(-1),view),worldLine(g.bottom[0],g.end,view),
    ...routeMarks(project(g.start,view),project(g.end,view),[1,0],[-1,0]).map(e=>diagonal&&e.kind==='notation-start'?{...e,p:add(e.p,[0,8])}:e),
    notationText(add(project(g.joint,view),[18,-12]),'j','junction'),...circles.flat()];
  const result=[...base],rows=[[],[],[]];
  for(const [a,points] of [g.top,g.right.toReversed(),g.bottom].entries()) {
    const angle=diagonal?[...reference.armAxisDegrees.map(x=>x*Math.PI/180),g.lean-Math.PI][a]:[g.lean,g.lean-Math.PI/2,g.lean-Math.PI][a];
    for(const p of points) {
      const slit=opening(p,angle,view)[0];rows[a].push(slit);result.push(slit);
    }
    if(a<2&&!diagonal) {
      const center=a===0?g.ci:g.co;
      result.push(worldLine([0,0],center,view,'extension','#C4C4C4',1,true),...opening(center,angle,view,{virtual:true}));
    }
  }
  const joint=diagonal?opening(g.joint,reference.sharedSlitDegrees*Math.PI/180,view)[0]:hole(g.joint,view);result.push(joint);
  s.threadPaths=[
    [...rows[0],joint,...rows[1].toReversed(),circles[1][0]],
    circles[1],[circles[1][1],circles[0][1]],circles[0].toReversed(),[circles[0][0],...rows[2]]
  ];
  return slitOutlines(finishThread({...s,final:result}));
}

function loeweScenes() {
  const spec=input('ILL-LOEWE-HANGER'),p=spec.pitch,h=spec.slitLength/2,a=spec.leanDegrees*Math.PI/180;
  const w=spec.width,length=spec.sideSteps*p,view={x:(600-w*25)/2,y:80,scale:25};
  const uLeft=axis(a+Math.PI/2),uTop=axis(a),uRight=axis(a-Math.PI/2);
  const leftJoint=[-h*uLeft[0],h*uTop[1]],rightJoint=[w+h*uRight[0],-h*uTop[1]];
  const virtuals=[add(leftJoint,mul(uLeft,h)),add(leftJoint,mul(uTop,-h)),add(rightJoint,mul(uTop,h)),add(rightJoint,mul(uRight,-h))];
  const topStart=add(virtuals[1],[p,0]),topEnd=add(virtuals[2],[-p,0]);
  const fit=selectFit({D:topEnd[0]-topStart[0],p});
  if(!fit||fit.n!==1)throw new Error('Loewe comparison requires one feasible top gap');
  return [false,true].map(solved=>{
    const s=scene(solved?'loewe-hanger-autostitch':'loewe-hanger-reference',
      solved?'Autostitch construction of the Loewe hanger':'Loewe hanger: slit corner, flat middle thread and round corner','ILL-LOEWE-HANGER');
    const left=Array.from({length:spec.sideSteps},(_,i)=>[0,(solved?virtuals[0][1]:0)-(spec.sideSteps-i)*p]);
    const right=Array.from({length:spec.sideSteps},(_,i)=>[w,(solved?virtuals[3][1]:0)-(i+1)*p]);
    const top=solved?[topStart,topEnd]:[[w/3,0],[2*w/3,0]];
    const result=[worldLine([0,-length],[0,0],view),worldLine([0,0],[w,0],view),worldLine([w,0],[w,-length],view),
      ...routeMarks(project(left[0],view),project(right.at(-1),view),[0,-1],[0,1]),
      notationText(add(project(solved?leftJoint:[0,0],view),[-20,-15]),'j','junction'),
      notationText(add(project(solved?rightJoint:[w,0],view),[20,-15]),'j','junction')];
    const rows=[left,top,right].map((points,arm)=>points.map((point,i)=>{
      // Mirrored top slits reproduce the flat visible middle thread; the
      // Autostitch comparison retains one signed lean throughout the route.
      const angle=arm===0?a+Math.PI/2:arm===2?a-Math.PI/2:!solved&&i===1?-a:a;
      const slit=opening(point,angle,view,{marked:solved&&arm===1&&fit.k>0});result.push(...slit);return slit[0];
    }));
    const firstJoint=solved?hole(leftJoint,view):opening([0,0],Math.PI/4,view)[0];
    const secondJoint=hole(solved?rightJoint:[w,0],view);result.push(firstJoint,secondJoint);
    if(solved)virtuals.forEach((point,i)=>result.push(
      worldLine(i<2?[0,0]:[w,0],point,view,'extension','#C4C4C4',1,true),
      ...opening(point,[a+Math.PI/2,a,a,a-Math.PI/2][i],view,{virtual:true})));
    s.threadPaths=[[...rows[0],firstJoint,...rows[1],secondJoint,...rows[2]]];
    return slitOutlines(finishThread({...s,final:result}));
  });
}

function speedyScenes() {
  const spec=input('ILL-LV-SPEEDY-CHAPE'),vertices=spec.vertices,p=spec.pitch,h=spec.slitLength/2,a=spec.leanDegrees*Math.PI/180;
  const view={x:300,y:48,scale:11.2},count=vertices.length;
  const cross=(u,v)=>u[0]*v[1]-u[1]*v[0],dot=(u,v)=>u[0]*v[0]+u[1]*v[1];
  const edges=vertices.map((v,i)=>{
    const d=add(vertices[(i+1)%count],mul(v,-1)),length=Math.hypot(...d),t=mul(d,1/length),angle=Math.atan2(t[1],t[0])+a;
    return {length,t,angle,u:axis(angle)};
  });
  const corners=vertices.map((v,i)=>{
    const incoming=edges[(i+count-1)%count],outgoing=edges[i],den=cross(incoming.t,outgoing.t);
    const offset=mul(add(incoming.u,outgoing.u),h);
    const ci=add(v,mul(incoming.t,cross(offset,outgoing.t)/den)),co=add(v,mul(outgoing.t,cross(offset,incoming.t)/den));
    const turn=Math.atan2(den,dot(incoming.t,outgoing.t));
    return {ci,co,joint:add(ci,mul(incoming.u,-h)),referenceAngle:incoming.angle+turn/2};
  });
  return [false,true].map(solved=>{
    const s=scene(solved?'lv-speedy-chape-autostitch':'lv-speedy-chape-reference',
      solved?'Autostitch construction of the Speedy handle chape':'Speedy handle chape: five slit corners without mirrored runs','ILL-LV-SPEEDY-CHAPE');
    const result=vertices.map((v,i)=>worldLine(v,vertices[(i+1)%count],view)),path=[],topRow=[];
    for(const [i,edge] of edges.entries()) {
      const next=(i+1)%count,corner=corners[i];
      const joint=solved?hole(corner.joint,view):opening(vertices[i],corner.referenceAngle,view)[0];
      result.push(joint);path.push(joint);
      if(solved) {
        for(const [point,angle] of [[corner.ci,edges[(i+count-1)%count].angle],[corner.co,edge.angle]])result.push(
          worldLine(vertices[i],point,view,'extension','#C4C4C4',1,true),...opening(point,angle,view,{virtual:true}));
        const first=add(corner.co,mul(edge.t,p)),last=add(corners[next].ci,mul(edge.t,-p));
        const D=dot(add(last,mul(first,-1)),edge.t),fit=selectFit({D,p});
        if(!fit)throw new Error(`Speedy edge ${i} cannot fit`);
        let station=0;
        for(let j=0;j<=fit.n;j++) {
          const marked=fit.k>0&&j>=fit.i&&j<=fit.i+fit.k;
          const slit=opening(add(first,mul(edge.t,station)),edge.angle,view,{marked});
          result.push(...slit);path.push(slit[0]);if(i===0)topRow.push(slit[0]);
          station+=j>=fit.i&&j<fit.i+fit.k?fit.correctedPitch:p;
        }
      } else {
        const gaps=Math.round(edge.length/p);
        for(let j=1;j<gaps;j++) {
          const slit=opening(add(vertices[i],mul(edge.t,j*edge.length/gaps)),edge.angle,view)[0];
          result.push(slit);path.push(slit);if(i===0)topRow.push(slit);
        }
      }
      const point=project(solved?corner.joint:vertices[i],view),outward=add(point,[-300,-180]);
      result.push(notationText(add(point,mul(outward,20/Math.hypot(...outward))),'j','junction'));
    }
    const start=topRow[Math.floor(topRow.length/2)],index=path.indexOf(start),ordered=[...path.slice(index),...path.slice(0,index)];
    const point=mul(add(start.a,start.b),.5);
    result.push(...routeMarks(point,point).filter(e=>e.kind!=='notation-end'));
    s.threadPaths=[[...ordered,ordered[0]]];
    return slitOutlines(finishThread({...s,final:result}));
  });
}

function faglianoScene(solved=false) {
  const spec=input(solved?'ILL-FAGLIANO-AUTOSTITCH':'ILL-FAGLIANO-TIP'),R=spec.radius,p=spec.pitch,h=spec.slitLength/2,a=spec.leanDegrees*Math.PI/180;
  const sweep=spec.sweepDegrees*Math.PI/180,c=R*Math.cos(sweep),halfWidth=R-c,step=2*Math.asin(p/(2*R));
  // Upper intersection of the incoming minus-tip and outgoing plus-tip circles.
  const jx=h*Math.sin(a)/Math.cos(sweep);
  const joint=solved?[jx,Math.sqrt((R-h*Math.sin(a))**2+(h*Math.cos(a))**2-(jx-c)**2)]:[0,R*Math.sin(sweep)];
  const virtual=solved?[Math.PI-Math.atan2(joint[1],jx-c)+Math.atan2(h*Math.cos(a),R-h*Math.sin(a)),
    Math.atan2(joint[1],jx+c)+Math.atan2(h*Math.cos(a),R+h*Math.sin(a))]:[sweep,sweep];
  const increments=virtual.map(v=>solved?(v-2*step)/(spec.curvedSlits-1):(sweep-step)/spec.curvedSlits);
  const chords=increments.map(t=>2*R*Math.sin(t/2));
  if(chords.some(g=>g<.9*p||g>=p))throw new Error('Fagliano curves require bounded compression on both arms');
  const view={x:300,y:265,scale:13.5},bottom=-(spec.straightOpenings-1)*p;
  const point=(arm,t)=>[arm===0?c-R*Math.cos(t):-c+R*Math.cos(t),R*Math.sin(t)];
  const slitAngle=(arm,t)=>arm===0?Math.PI/2-t+a:-Math.PI/2+t+a;
  const s=scene(solved?'fagliano-tip-autostitch':'fagliano-tip-compression',
    solved?'Autostitch: minimum adjusted gaps on the same strap guides':'Aligned straight runs compress equally into a vertex hole',
    solved?'ILL-FAGLIANO-AUTOSTITCH':'ILL-FAGLIANO-TIP');
  const base=[worldLine([-halfWidth,bottom],[-halfWidth,0],view),worldLine([halfWidth,0],[halfWidth,bottom],view),
    ...routeMarks(project([-halfWidth,bottom],view),project([halfWidth,bottom],view),[0,-1],[0,1]),
    notationText(add(project(joint,view),[18,-14]),'j','junction')];
  for(const arm of [0,1])for(let i=0;i<60;i++)base.push(worldLine(point(arm,sweep*i/60),point(arm,sweep*(i+1)/60),view));
  const straight=[0,1].map(arm=>Array.from({length:spec.straightOpenings},(_,i)=>
    opening([arm===0?-halfWidth:halfWidth,bottom+i*p],slitAngle(arm,0),view)[0]));
  const realCount=spec.curvedSlits;
  const nominal=Array.from({length:realCount+1},(_,i)=>(i+1)*step);
  const targets=virtual.map((v,arm)=>[...Array.from({length:realCount},(_,i)=>step+i*increments[arm]),solved?v:sweep]);
  const fits=solved?virtual.map(v=>selectFit({R,p,sweep:v-2*step})):null;
  if(solved)fits.forEach((fit,arm)=>{
    if(!fit||fit.n!==(spec.curvedSlits-1))throw new Error('Fagliano comparison requires the same opening count');
    const points=[step];
    for(let i=0;i<fit.n;i++)points.push(points.at(-1)+
      (i>=fit.i&&i<fit.i+fit.k?2*Math.asin(fit.correctedPitch/(2*R)):step));
    targets[arm]=[...points,virtual[arm]];
  });
  const draw=(angles,straightCount=spec.straightOpenings)=>{
    const result=[...base];
    for(let i=0;i<straightCount;i++) {
      const y=bottom+i*p;
      result.push(worldLine([-halfWidth,y],[halfWidth,y],view,'alignment','#D9D9D9',.7,true));
    }
    result.push(...straight.flatMap(row=>row.slice(0,straightCount)));
    for(const [arm,values] of angles.entries()) {
      if(values.at(-1)>sweep)for(let i=0;i<12;i++)result.push(worldLine(
        point(arm,sweep+(values.at(-1)-sweep)*i/12),point(arm,sweep+(values.at(-1)-sweep)*(i+1)/12),view,'extension','#C4C4C4',1,true));
      for(const [i,t] of values.entries()) {
        const terminal=i===realCount;
        // The reference ends at the vertex hole, not an A6 virtual slit.
        if(terminal&&!solved) {
          const centre=project(point(arm,t),view),anchor=project(joint,view);
          if(Math.hypot(centre[0]-anchor[0],centre[1]-anchor[1])>1e-6)result.push(
            {...hole(point(arm,t),view),kind:'trial-hole',color:'#C62828'},
            line(centre,anchor,'residual-dimension','#C62828',1.6));
          continue;
        }
        const adjusted=j=>j>=0&&j<values.length-1&&Math.abs(values[j+1]-values[j]-step)>1e-8;
        const slit=opening(point(arm,t),slitAngle(arm,t),view,{virtual:terminal,marked:!terminal&&(adjusted(i-1)||adjusted(i))});
        if(terminal) {
          const tip=arm===0?slit[0].a:slit[0].b,anchor=project(joint,view);
          if(Math.hypot(tip[0]-anchor[0],tip[1]-anchor[1])>1e-6) {
            slit[0].color='#C62828';result.push(line(tip,anchor,'residual-dimension','#C62828',1.6));
          }
        }
        result.push(...slit);
      }
      if(values.length>1) {
        const index=solved?fits[arm].i:0,gap=2*R*Math.sin((values[index+1]-values[index])/2);
        result.push(...measure(point(arm,values[index]),point(arm,values[index+1]),gap.toFixed(2),view,arm===0?44:-44).map(e=>
          ({...e,kind:e.type==='text'?'gap-value':'gap-dimension',...(e.type==='text'?{size:15,bold:true,color:'#252525'}:{})})));
      }
    }
    result.push(hole(joint,view));return result;
  };
  if(!solved) {
    frame(s,draw([[],[]],0),60,'guides');
    for(let n=1;n<=spec.straightOpenings;n++)frame(s,draw([[],[]],n),50,'aligned-straights');
    const settled=[[],[]];
    for(const arm of [0,1]) {
      for(let n=1;n<=nominal.length;n++) {
        const rows=settled.map(row=>row);rows[arm]=nominal.slice(0,n);
        frame(s,draw(rows),n===nominal.length?130:35,n===nominal.length?`arm-${arm}-overrun`:`arm-${arm}-nominal`);
      }
      for(let n=1;n<=30;n++) {
        const t=n/30,ease=t*t*(3-2*t),rows=settled.map(row=>row);
        rows[arm]=nominal.map((theta,i)=>theta+(targets[arm][i]-theta)*ease);
        frame(s,draw(rows),8,`arm-${arm}-compress`);
      }
      settled[arm]=targets[arm];frame(s,draw(settled),90,`arm-${arm}-settled`);
    }
  }
  const result=draw(targets),real=result.filter(e=>e.kind==='slit'),centre=e=>mul(add(e.a,e.b),.5);
  const left=real.filter(e=>centre(e)[0]<view.x).sort((a,b)=>centre(b)[1]-centre(a)[1]);
  const right=real.filter(e=>centre(e)[0]>view.x).sort((a,b)=>centre(a)[1]-centre(b)[1]);
  s.threadPaths=[[...left,result.find(e=>e.kind==='hole'),...right]];
  return slitOutlines(finishThread(solved?{...s,final:result}:finish(s,result)));
}

export function createScenes(){return [diagonalCorner(),walletScene(),walletScene(true),...loeweScenes(),...speedyScenes(),faglianoScene(),faglianoScene(true)];}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))writeSceneFiles(createScenes());
