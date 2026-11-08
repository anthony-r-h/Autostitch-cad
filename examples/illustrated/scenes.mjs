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
  const length=variant('S02').route.primitives[0].b[0];
  const view={x:60,y:187.5,scale:14.5};
  const base=straightBase(length,view);
  const nominal=Array.from({length:11},(_,i)=>i*3);
  const nominalDrawing=(count=11)=>nominal.slice(0,count).flatMap(x=>opening([x,0],alpha,view,{proposed:true}));
  const remainder=[...base,...nominalDrawing(),...opening([33,0],alpha,view,{proposed:true}),...measure([30,0],[30.5,0],'0.5',view,-45)];
  const problem=scene('pitch-problem','Nominal pitch leaves a remainder','S02');
  frame(problem,base,75,'guide');
  for(let i=1;i<=11;i++) frame(problem,[...base,...nominalDrawing(i),...(i>1?measure([0,0],[3,0],'3',view):[])],i<4?35:20);
  finish(problem,remainder);
  const fits=[
    {name:'pitch-spread',title:'Naive: distribute evenly',points:Array.from({length:11},(_,i)=>i*length/10),start:0,count:10,gap:length/10},
    {name:'pitch-end',title:'Good enough: adjust near the end',points:[0,3,6,9,12,15,18,21,24,27.25,30.5],start:8,count:2,gap:3.25},
    {name:'pitch-centre',title:'Autostitch: plan a central adjustment',points:stations(selectFit({D:length,p:3})),start:4,count:2,gap:3.25}
  ];
  const scenes=[problem];
  for(const fit of fits) {
    const s=scene(fit.name,fit.title,'S02');
    frame(s,base,75,'guide');
    const draw=(points,proposed=false)=>points.flatMap((x,i)=>opening([x,0],alpha,view,{proposed,marked:!proposed&&i>=fit.start&&i<=fit.start+fit.count}));
    if(fit.name==='pitch-centre') {
      const fixed=[...base,...opening([0,0],alpha,view),...opening([length,0],alpha,view)];
      frame(s,fixed,80,'fixed-ends');
      const reserved=[...fixed,...fit.points.slice(4,7).flatMap(x=>opening([x,0],alpha,view,{marked:true})),...measure([fit.points[4],0],[fit.points[5],0],'3.25',view,-40)];
      frame(s,reserved,100,'planned-adjustment');
      let accumulated=[...reserved];
      for(const i of [1,2,3,7,8,9]){accumulated.push(...opening([fit.points[i],0],alpha,view));frame(s,[...accumulated],30);}
    } else {
      for(let i=1;i<=11;i++)frame(s,[...base,...nominalDrawing(i)],i<4?30:18);
      frame(s,remainder,130,'mismatch');
      for(let i=1;i<=24;i++) {
        const t=ease(i/24),moving=nominal.map((x,j)=>lerp(x,fit.points[j],t));
        frame(s,[...base,...draw(moving,true)],5,'planning-revision');
      }
    }
    const end=[...base,...draw(fit.points),...measure([fit.points[fit.start],0],[fit.points[fit.start+1],0],fit.gap.toFixed(2),view,-40)];
    if(fit.count<10)end.push(...measure([0,0],[3,0],'3',view));
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

function cornerScene() {
  const v=variant('J02'),view={x:370,y:105,scale:24},h=.75;
  const ui=axis(alpha),uo=axis(alpha-Math.PI/2);
  const J=[h*uo[0],-h*ui[1]],ci=add(J,mul(ui,h)),co=add(J,mul(uo,-h));
  const start=[-10+v.settings.start,0],end=[0,-(v.settings.end-10)];
  const base=[worldLine(start,[0,0],view),worldLine([0,0],end,view),worldLine([0,0],ci,view,'extension',guideInk,1,true),worldLine([0,0],co,view,'extension',guideInk,1,true)];
  const s=scene('axiom-corner','Virtual slit tips locate one corner hole','J02');
  frame(s,base,90,'arms');
  for(let i=0;i<=24;i++) {
    const t=ease(i/24);
    frame(s,[...base,...opening([ci[0]-2*(1-t),0],alpha,view,{virtual:true}),...opening([0,co[1]-2*(1-t)],alpha-Math.PI/2,view,{virtual:true})],5,'tip-construction');
  }
  const virtuals=[...opening(ci,alpha,view,{virtual:true}),...opening(co,alpha-Math.PI/2,view,{virtual:true})];
  let result=[...base,...virtuals];frame(s,result,100,'tips-meet');
  result=[...result,hole(J,view)];frame(s,result,100,'shared-hole');
  for(let i=1;i<=3;i++) {
    result.push(...opening([ci[0]-i*3,0],alpha,view),...opening([0,co[1]-i*3],alpha-Math.PI/2,view));
    frame(s,[...result],40,'real-neighbours');
  }
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
  let result=[...base,hole(center,view)];frame(s,result,110,'shared-hole');
  for(let i=1;i<=3;i++) {
    for(const arm of arms) {
      const distance=Math.hypot(...arm.end);if(i*3>distance)continue;
      result.push(...opening(mul(arm.end,i*3/distance),arm.angle,view));
    }
    frame(s,[...result],i===1?140:50,'nominal-neighbours');
  }
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
  const view={x:120,y:220,scale:40},s=scene('axiom-clearance','Nominal rows still need clearance','A10');
  const row=(y,halo=false)=>{
    const result=[worldLine([0,y],[9,y],view)];
    for(const x of input.stations) {
      const half=mul(axis(alpha),.75),a=add([x,y],mul(half,-1)),b=add([x,y],half);
      if(halo)result.push({...worldLine(a,b,view,'clearance-envelope','#E3E3E3',(input.width+input.margin)*view.scale),round:true});
      result.push({...worldLine(a,b,view,'slit',ink,input.width*view.scale),round:true});
    }
    return result;
  };
  // Draw all clearance envelopes behind all physical profiles. A later halo
  // must not erase an earlier slit and make an overlap look separated.
  const pair=separation=>{
    const all=[...row(0,true),...row(separation,true)];
    return [...all.filter(e=>e.kind==='clearance-envelope'),...all.filter(e=>e.kind==='guide'),...all.filter(e=>e.kind==='slit')];
  };
  frame(s,[worldLine([0,0],[9,0],view)],70,'guide');
  frame(s,row(0),100,'nominal-row');
  frame(s,pair(input.startSeparation),130,'separate-rows');
  let result;
  for(let i=1;i<=30;i++) {
    result=pair(lerp(input.startSeparation,input.endSeparation,ease(i/30)));
    frame(s,result,6,'clearance-check');
  }
  // Cross marks denote rejection; the final overlapping positions are not output.
  for(const x of input.stations) {
    const p=project([x,-1.4],view);
    result.push(line(add(p,[-4,-4]),add(p,[4,4]),'rejected',construction,1.3),line(add(p,[-4,4]),add(p,[4,-4]),'rejected',construction,1.3));
  }
  result.push(...measure([0,0],[3,0],'3',view,-80));
  return finish(s,result);
}

export function createScenes() { return [...pitchScenes(),curveScene(),landmarkScene(),cornerScene(),smoothScene(),junctionScene(),clearanceScene()]; }

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
