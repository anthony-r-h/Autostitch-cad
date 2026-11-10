// Storyboard presentation of the committed native emblem, with analytic planning motion.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {themeFor, colorConfig, svg, writeSceneFiles, displayElements, termLabel, notationText, routeMarks, measure, text, adjustmentStyle} from './scenes.mjs';

const root = new URL('../../', import.meta.url);
const read = name => fs.readFileSync(new URL(name, root), 'utf8');
export const storyboard = JSON.parse(read('examples/illustrated/emblem.storyboard.json'));
const add = (a,b) => [a[0]+b[0],a[1]+b[1]];
const sub = (a,b) => [a[0]-b[0],a[1]-b[1]];
const mul = (a,s) => [a[0]*s,a[1]*s];
const distance = (a,b) => Math.hypot(...sub(a,b));
const mix = (a,b,t) => a+(b-a)*t;
const clamp = t => Math.max(0,Math.min(1,t));
const ease = (t,name='linear') => name==='smoothstep'?t*t*(3-2*t):t;
const rotate = (p,a) => [p[0]*Math.cos(a)-p[1]*Math.sin(a),p[0]*Math.sin(a)+p[1]*Math.cos(a)];
const tau = 2*Math.PI;

// Read only the literal stroke definitions and placement tables; never execute LISP.
function lispForms(source) {
  const tokens = source.replace(/;[^\r\n]*/g,'').match(/"(?:\\.|[^"\\])*"|[()']|[^\s()']+/g);
  let index=0;
  function form() {
    const token=tokens[index++];
    if(token==='(') {
      const values=[];
      while(tokens[index]!==')') {
        if(index>=tokens.length)throw new Error('Unclosed LISP form');
        values.push(form());
      }
      index++; return values;
    }
    if(token==="'")return ['quote',form()];
    if(token.startsWith('"'))return JSON.parse(token);
    return Number.isFinite(Number(token))?Number(token):token;
  }
  const result=[];
  while(index<tokens.length)result.push(form());
  return result;
}
function primitive(a,b,bulge=0) {
  if(!bulge) {
    const vector=sub(b,a),length=distance(a,b),angle=Math.atan2(vector[1],vector[0]);
    return {a,b,length,point:s=>add(a,mul(vector,s/length)),angle:()=>angle,
      station:p=>((p[0]-a[0])*vector[0]+(p[1]-a[1])*vector[1])/length};
  }
  const chord=sub(b,a),center=add(mul(add(a,b),.5),mul([-chord[1],chord[0]],(1-bulge*bulge)/(4*bulge)));
  const radius=distance(a,center),start=Math.atan2(a[1]-center[1],a[0]-center[0]),sweep=4*Math.atan(bulge),sign=Math.sign(sweep),length=radius*Math.abs(sweep);
  return {a,b,center,radius,length,point:s=>add(center,mul([Math.cos(start+sign*s/radius),Math.sin(start+sign*s/radius)],radius)),
    angle:s=>start+sign*s/radius+sign*Math.PI/2,
    station:p=>{
      let delta=(Math.atan2(p[1]-center[1],p[0]-center[0])-start)*sign;
      delta=((delta%tau)+tau)%tau;
      if(delta>tau-1e-6)delta=0;
      return delta*radius;
    }};
}
function guideGeometry() {
  const forms=lispForms(read('examples/emblem.lsp'));
  const definition=name=>forms.find(f=>f[0]==='defun'&&f[1]===name);
  const outline=definition('ast:show-outline'),script=definition('ast:show-script');
  const groups=[];
  const loops=definition('ast:show-square').filter(f=>Array.isArray(f)&&f[0]==='foreach');
  for(const [row,loop] of loops.entries())for(const [i,entry] of loop[2][1].entries()) {
    const letter=entry[0],id=row===0?letter:`script-${letter}-${i+1}`;
    const branch=(row===0?outline:script).find(f=>Array.isArray(f)&&f[0]==='cond').slice(1).find(f=>f[0][2]===letter);
    let strokes;
    if(row===0) {
      const set=branch[1];strokes=[];
      for(let j=1;j<set.length;j+=2)strokes.push({closed:true,points:set[j+1][1]});
    } else strokes=branch[1].slice(1).map(f=>({points:f[1][1],closed:f[2]==='T'}));
    const degrees=row===0?entry[3]:-12,angle=degrees*Math.PI/180,pivot=row===0?[entry[4],0]:[0,0],origin=[entry[1],row===0?entry[2]:-53];
    const transform=p=>add(origin,add(pivot,rotate(sub(p,pivot),angle)));
    const primitives=strokes.flatMap(stroke=>stroke.points.slice(0,stroke.closed?undefined:-1).map((p,j)=>
      primitive(transform(p),transform(stroke.points[(j+1)%stroke.points.length]),p[2]??0)));
    const landmarks=id==='A'?[1,9].map(index=>({primitive:index,station:primitives[index].length/2})):[];
    groups.push({id,primitives,landmarks,openings:[],threads:[]});
  }
  return groups;
}

export function loadEmblem() {
  const groups=guideGeometry(),source=read('examples/demos/emblem.svg');
  const pitch=lispForms(read('examples/emblem.lsp')).find(f=>f[0]==='defun'&&f[1]==='ast:emblem-settings')[3][2];
  const world=([x,y])=>[333+x*256/600,135.0709751266425-y*256/600];
  const openings=[],threads=[],decoration=[],extras=[];
  for(const match of source.matchAll(/<(line|circle)\s+([^>]+)\/>/g)) {
    const attr=Object.fromEntries([...match[2].matchAll(/([\w-]+)="([^"]*)"/g)].map(m=>[m[1],m[2]]));
    if(match[1]==='circle')openings.push({type:'circle',center:world([+attr.cx,+attr.cy]),radius:+attr.r*256/600});
    else {
      const a=world([+attr.x1,+attr.y1]),b=world([+attr.x2,+attr.y2]),width=+attr['stroke-width']*256/600;
      if(Math.abs(width-.3)<1e-5&&Math.abs(distance(a,b)-1.5)<1e-5)openings.push({type:'slit',a,b,center:mul(add(a,b),.5),width:.3});
      else if(Math.abs(width-.3)<1e-5&&Math.abs(distance(a,b)-.585)<1e-5)extras.push({a,b,width,kind:'adjustment-mark'});
      else if(Math.abs(width-.09)<1e-5&&Math.abs(distance(a,b)-1.5/7)<1e-5)extras.push({a,b,width,kind:'virtual'});
      else if(Math.abs(width-.09)<1e-5)threads.push({a,b,width});
      else if(Math.abs(width-.2)<1e-5)decoration.push({a,b});
      else throw new Error(`Unexpected emblem line width ${width}`);
    }
  }
  const dot=openings.find(o=>o.radius>1);
  if(!dot||decoration.some(l=>[l.a,l.b].some(p=>distance(p,dot.center)>dot.radius)))throw new Error('Unexpected visible reference decoration');
  const ringCenter=[461,7.07097512664247];
  for(const radius of [110,95,80])groups.push({id:`ring-${radius}`,radius,center:ringCenter,primitives:[],openings:[],threads:[]});
  for(const opening of openings) {
    let best={distance:Infinity};
    for(const group of groups) {
      if(group.radius) {
        if(opening.type==='circle')continue;
        const d=Math.abs(distance(opening.center,group.center)-group.radius);
        if(d<best.distance)best={group,distance:d};
      } else for(const [index,p] of group.primitives.entries()) {
        const station=clamp(p.station(opening.center)/p.length)*p.length,d=distance(opening.center,p.point(station));
        if(d<best.distance)best={group,distance:d,primitive:index,station};
      }
    }
    if(opening.radius>1)best={group:groups.find(g=>g.id==='script-i-3'),distance:0};
    if(opening.type==='slit'&&best.distance>.001)throw new Error(`Slit does not match recipe: ${JSON.stringify({center:opening.center,group:best.group.id,primitive:best.primitive,distance:best.distance})}`);
    Object.assign(opening,{group:best.group.id,primitive:best.primitive,station:best.station});
    best.group.openings.push(opening);
  }
  for(const group of groups) {
    group.openings.sort((a,b)=>(a.primitive??0)-(b.primitive??0)||(a.station??Math.atan2(a.center[1]-ringCenter[1],a.center[0]-ringCenter[0]))-(b.station??Math.atan2(b.center[1]-ringCenter[1],b.center[0]-ringCenter[0]))||a.center[0]-b.center[0]||a.center[1]-b.center[1]);
    group.openings.forEach((o,i)=>o.id=`${group.id}.opening.${i+1}`);
    for(const [index,p] of group.primitives.entries()) {
      p.row=group.openings.filter(o=>o.type==='slit'&&o.primitive===index);
    }
  }
  const endpoint=p=>{
    let best,d=Infinity;
    for(const o of openings)for(const tip of o.type==='slit'?[o.a,o.b]:[o.center]) {
      const next=distance(p,tip);if(next<d){best=o;d=next;}
    }
    if(d>.0001)throw new Error(`Thread endpoint has no opening: ${d}`);
    return best;
  };
  for(const thread of threads) {
    const from=endpoint(thread.a),to=endpoint(thread.b);
    if(from.group!==to.group)throw new Error(`Thread crosses named groups: ${from.group}/${to.group}`);
    Object.assign(thread,{from:from.id,to:to.id});
    groups.find(g=>g.id===from.group).threads.push(thread);
  }
  // A shared round hole splits a primitive's slit row into separately fixed spans.
  const edgeKey=(a,b)=>[a,b].sort().join('|');
  const connections=new Set(threads.map(t=>edgeKey(t.from,t.to)));
  for(const group of groups)for(const [index,p] of group.primitives.entries()) {
    p.landmark=group.landmarks.find(m=>m.primitive===index);
    p.runs=[];
    for(const [i,o] of p.row.entries()) {
      if(i===0||!connections.has(edgeKey(p.row[i-1].id,o.id))||p.landmark&&p.row[i-1].station<p.landmark.station&&o.station>p.landmark.station)p.runs.push([]);
      p.runs.at(-1).push(o);
    }
    const advance=p.radius?2*p.radius*Math.asin(pitch/(2*p.radius)):pitch;
    for(const run of p.runs)run.forEach((o,i)=>{
      o.fixed=i===0||i===run.length-1;
      o.initial=o.fixed?o.station:run[0].station+i*advance;
    });
    p.advance=advance;
  }
  for(const extra of extras) {
    const center=mul(add(extra.a,extra.b),.5);
    let nearest,d=Infinity;
    for(const opening of openings) {
      const next=Math.min(...(opening.type==='slit'?[opening.a,opening.b]:[opening.center]).map(p=>distance(p,center)));
      if(next<d){nearest=opening;d=next;}
    }
    extra.group=nearest.group;
  }
  return {groups,openings,threads,extras,pitch};
}

export function validateStoryboard(book,model) {
  if(book.version!==1||book.canvas.width!==600||book.canvas.height!==750)throw new Error('Expected storyboard v1 on a 600 by 750 canvas');
  const centiseconds=value=>Number.isFinite(value)&&Math.abs(value*100-Math.round(value*100))<1e-8;
  if(!(book.duration>0&&centiseconds(book.duration)&&book.frameStep>=.02&&centiseconds(book.frameStep)))throw new Error('Use positive duration and whole centisecond frame steps of at least .02 seconds');
  const names=new Set(model.groups.map(g=>g.id));
  const targets=new Set([...names,'lettering-rest','rings','i-dot','all']);
  if(!Array.isArray(book.guides)||book.guides.some(g=>!targets.has(g.target)||!Number.isFinite(g.from)||!Number.isFinite(g.until)||g.from<0||g.until<=g.from||g.until>book.duration))throw new Error('Invalid guide visibility interval');
  for(const [name,v] of Object.entries(book.views)) {
    if(v.target?!names.has(v.target)||!(v.padding>0)||!Number.isFinite(v.padding):!Array.isArray(v.center)||v.center.length!==2||!v.center.every(Number.isFinite)||!(v.height>0)||!Number.isFinite(v.height))throw new Error(`Invalid view ${name}`);
  }
  if(book.camera[0]?.at!==0||book.camera[0]?.duration)throw new Error('Camera must establish its initial view at time zero');
  let end=0;
  for(const c of book.camera) {
    if(!book.views[c.view]||!Number.isFinite(c.at)||c.at<end||!(c.duration===undefined||c.duration>0)||c.at+(c.duration??0)>book.duration)throw new Error('Invalid or overlapping camera move');
    if(c.easing&&!['linear','smoothstep'].includes(c.easing))throw new Error('Unknown camera easing');
    end=c.at+(c.duration??0);
  }
  const seen=new Set();
  for(const a of book.actions) {
    if(!['mark-landmarks','reveal-fixed','lay-out','adjust','stitch','punch','fade-openings'].includes(a.action)||!targets.has(a.target)||!Number.isFinite(a.at)||a.at<0||!(a.duration>0)||a.at+a.duration>book.duration)throw new Error('Invalid storyboard action');
    if((a.action==='punch')!==(a.target==='i-dot'))throw new Error('Punch targets the separate i dot');
    if((a.action==='fade-openings')!==(a.target==='all'))throw new Error('Fade openings across the whole emblem');
    if(a.glow!==undefined&&(a.action!=='stitch'||typeof a.glow!=='boolean'))throw new Error('Only Stitch accepts a boolean glow override');
    if(a.easing&&!['linear','smoothstep'].includes(a.easing))throw new Error('Unknown action easing');
    if(['adjust','reveal-fixed'].includes(a.action)&&model.groups.some(g=>matches(a.target,g.id)&&g.radius))throw new Error('Rings use nominal spacing and have no adjustment phase');
    if(a.action==='mark-landmarks'&&model.groups.some(g=>matches(a.target,g.id)&&!g.landmarks?.length))throw new Error('Mark landmarks only on groups with landmark inputs');
    for(const g of model.groups.filter(g=>matches(a.target,g.id))) {
      const key=`${g.id}/${a.action}`;
      if(seen.has(key))throw new Error(`Duplicate action ${key}`);seen.add(key);
    }
  }
  const punches=book.actions.filter(a=>a.action==='punch');
  if(punches.length!==1||book.actions.some(a=>a.action!=='punch'&&a.at+a.duration>punches[0].at))throw new Error('Punch the dot once, after all stitching');
  const fade=book.actions.find(a=>a.action==='fade-openings');
  if(!fade||book.actions.some(a=>a.action==='stitch'&&a.at+a.duration>fade.at))throw new Error('Fade openings after all stitching');
  for(const group of model.groups) {
    const actions=book.actions.filter(a=>matches(a.target,group.id));
    const layout=actions.find(a=>a.action==='lay-out'),adjust=actions.find(a=>a.action==='adjust'),stitch=actions.find(a=>a.action==='stitch'),fixed=actions.find(a=>a.action==='reveal-fixed');
    if(!layout||!stitch||stitch.at<(adjust??layout).at+(adjust??layout).duration||adjust&&adjust.at<layout.at+layout.duration||fixed&&fixed.at+fixed.duration>layout.at)throw new Error(`Invalid phase order for ${group.id}`);
    const residualDelay=layout.residualDelay??0,residualFade=layout.residualFade??0;
    if(![residualDelay,residualFade].every(v=>Number.isFinite(v)&&v>=0)||layout.at+layout.duration+residualDelay+residualFade>(adjust??stitch).at)throw new Error('Reveal residuals after layout and before redistribution');
    const landmarks=actions.find(a=>a.action==='mark-landmarks');
    if(group.landmarks?.length&&(!landmarks||landmarks.at+landmarks.duration>(fixed??layout).at))throw new Error('Set landmarks before resolving fixed openings');
  }
  if(book.commentary[0]?.at!==0||!book.commentary.every((c,i)=>['Build','Adjustment','Stitch'].includes(c.phase)&&typeof c.text==='string'&&c.text.trim()&&!c.text.includes('\n')&&c.text.length<=40&&Number.isFinite(c.at)&&c.at>=0&&c.at<=book.duration&&(!i||c.at>book.commentary[i-1].at)))throw new Error('Invalid commentary cues: use a phase and a short step label, starting at time zero');
  if(book.commentary.some(c=>c.until!==undefined&&(!Number.isFinite(c.until)||c.until<=c.at||c.until>book.duration)))throw new Error('Invalid commentary end time');
}
function matches(target,id) {
  return target==='all'||target===id||target==='rings'&&id.startsWith('ring-')||target==='lettering-rest'&&id!=='A'&&!id.startsWith('ring-');
}
function viewBounds(view,model) {
  if(!view.target)return view;
  const group=model.groups.find(g=>g.id===view.target);
  const points=group.radius?group.openings.map(o=>o.center):group.primitives.flatMap(p=>Array.from({length:41},(_,i)=>p.point(p.length*i/40)));
  const x=points.map(p=>p[0]),y=points.map(p=>p[1]);
  return {center:[(Math.min(...x)+Math.max(...x))/2,(Math.min(...y)+Math.max(...y))/2],height:Math.max(Math.max(...y)-Math.min(...y)+2*view.padding,(Math.max(...x)-Math.min(...x)+2*view.padding)*750/600)};
}
export function cameraAt(time,book,model) {
  let view=viewBounds(book.views[book.camera[0].view],model);
  for(const cue of book.camera.slice(1)) {
    if(time<cue.at)break;
    const next=viewBounds(book.views[cue.view],model),t=ease(clamp((time-cue.at)/(cue.duration??.0001)),cue.easing);
    if(t===1){view=next;continue;}
    view={center:view.center.map((v,i)=>mix(v,next.center[i],t)),height:Math.exp(mix(Math.log(view.height),Math.log(next.height),t))};
    if(t<1)break;
  }
  return view;
}

export function frameAt(time,book,model,theme=themeFor()) {
  const camera=cameraAt(time,book,model),scale=750/camera.height;
  const view={x:300-camera.center[0]*scale,y:375+camera.center[1]*scale,scale};
  const project=p=>[300+(p[0]-camera.center[0])*scale,375-(p[1]-camera.center[1])*scale];
  const elements=[];
  const line=(a,b,kind,color,width=.8,extra={})=>elements.push({type:'line',a:project(a),b:project(b),kind,color:theme[color],width,...extra});
  const progress=(action,id)=>{
    const a=book.actions.find(a=>a.action===action&&matches(a.target,id));
    return !a||time<a.at?0:ease(clamp((time-a.at)/a.duration),a.easing);
  };
  const pulse=(at)=>{
    const glow=colorConfig.revealGlow,age=time-at,duration=glow.durationCentiseconds/100;
    return glow.enabled&&age>=0&&age<duration?{glow:{color:theme.ink,width:glow.width,opacity:glow.opacity*(1-age/duration)}}:{};
  };
  for(const group of model.groups) {
    const planning=book.actions.some(a=>a.action==='adjust'&&matches(a.target,group.id));
    const fixedAction=book.actions.find(a=>a.action==='reveal-fixed'&&matches(a.target,group.id));
    const fixed=progress('reveal-fixed',group.id),build=progress('lay-out',group.id),adjust=progress('adjust',group.id),stitched=progress('stitch',group.id);
    const fading=progress('fade-openings',group.id),fade=Math.round(fading*5)/5;
    const showGuides=book.guides.some(g=>matches(g.target,group.id)&&time>=g.from&&time<g.until);
    const closeView=book.views.A&&viewBounds(book.views.A,model);
    const detail=group.id==='A'&&showGuides&&closeView&&camera.height<=closeView.height*1.000001;
    if(detail) {
      const annotation=[];
      const centerX=project(closeView.center)[0];
      for(const [i,marker] of group.landmarks.entries()) {
        if(progress('mark-landmarks',group.id)<(i+1)/group.landmarks.length)continue;
        const p=group.primitives[marker.primitive],center=p.point(marker.station),angle=p.angle(marker.station),normal=[-Math.sin(angle),Math.cos(angle)];
        line(add(center,mul(normal,-.8)),add(center,mul(normal,.8)),'landmark','ink',2,{color:blendColor(theme.ink,theme.secondary,Math.round(stitched*5)/5)});
        const label=project(add(center,mul(normal,i===0?3:-5.5)));
        annotation.push(notationText([label[0]+20,label[1]],`L${i+1}`,'landmark'));
      }
      for(const opening of group.openings.filter(o=>o.type==='circle')) {
        const p=project(opening.center);
        annotation.push(notationText([p[0]+(p[0]<centerX?-17:17),p[1]-10],'j','junction'));
      }
      for(const [i,p] of group.primitives.entries())if(i===0||distance(p.a,group.primitives[i-1].b)>.001) {
        const tangent=[Math.cos(p.angle(0)),-Math.sin(p.angle(0))];
        annotation.push(...routeMarks(project(p.a),project(p.a),tangent).filter(e=>e.kind!=='notation-end'));
      }
      elements.push(...displayElements(annotation,stitched,theme));
    }
    if(showGuides) {
      for(const p of group.primitives) {
        const count=p.radius?Math.max(12,Math.ceil(p.length/1.5)):1;
        for(let i=0;i<count;i++)line(p.point(p.length*i/count),p.point(p.length*(i+1)/count),'guide',stitched?'secondary':'guide',.65,{group:group.id});
      }
      if(group.radius)for(const thread of group.threads) {
        const a=model.openings.find(o=>o.id===thread.from).center,b=model.openings.find(o=>o.id===thread.to).center;
        const start=Math.atan2(a[1]-group.center[1],a[0]-group.center[0]);
        let delta=Math.atan2(b[1]-group.center[1],b[0]-group.center[0])-start;
        if(delta>Math.PI)delta-=tau;if(delta<-Math.PI)delta+=tau;
        const point=t=>add(group.center,mul([Math.cos(start+delta*t),Math.sin(start+delta*t)],group.radius));
        for(let i=0;i<3;i++)line(point(i/3),point((i+1)/3),'guide','guide',.65,{group:group.id});
      }
    }
    const active=group.openings.filter(o=>o.radius<=1||o.type==='slit').filter(o=>o.fixed||o.type==='circle');
    for(const [index,o] of group.openings.entries()) {
      if(o.type==='circle'&&o.radius>1) {
        const punch=book.actions.find(a=>a.action==='punch');
        if(time>=punch.at) {
          const t=clamp((time-punch.at)/punch.duration),impact=1+.65*(1-t)**3;
          elements.push({type:'circle',p:project(o.center),radius:o.radius*scale*impact,color:theme.ink,kind:'hole',id:o.id,...pulse(punch.at)});
        }
        continue;
      }
      if(fading===1)continue;
      const pinned=Boolean(fixedAction)&&(o.fixed||o.type==='circle');
      const fixedIndex=active.indexOf(o),fraction=(index+1)/group.openings.length;
      if(pinned?fixed<(fixedIndex+1)/active.length&&build<fraction:build<fraction)continue;
      const a=book.actions.find(a=>a.action===(pinned?'reveal-fixed':'lay-out')&&matches(a.target,group.id))??book.actions.find(a=>a.action==='lay-out'&&matches(a.target,group.id));
      const revealed=a.at+a.duration*(pinned?(fixedIndex+1)/active.length:fraction);
      const glow=pulse(revealed);
      const blend=Math.round(stitched*5)/5;
      const color=blendColor(blend===0?theme.ink:blend===1?theme.secondary:blendColor(theme.ink,theme.secondary,blend),theme.background,fade);
      if(o.type==='circle')elements.push({type:'circle',p:project(o.center),radius:o.radius*scale,color,kind:'hole',id:o.id,...glow});
      else {
        let start=o.a,end=o.b;
        if(planning&&!o.fixed&&adjust<1) {
          const p=group.primitives[o.primitive],station=mix(o.initial,o.station,adjust),center=p.point(station),turn=p.angle(station)-p.angle(o.station);
          start=add(center,rotate(sub(o.a,o.center),turn));end=add(center,rotate(sub(o.b,o.center),turn));
        }
        elements.push({type:'line',a:project(start),b:project(end),width:.3*scale,outline:true,outlineWidth:Math.max(.55,.075*scale),color,kind:'slit',id:o.id,...glow});
      }
    }
    if(planning&&build===1&&detail)for(const [primitiveIndex,source] of group.primitives.entries())for(const row of source.runs) {
      const p={...source,row,nominalEnd:row[0].station+(row.length-1)*source.advance};
      if(p.row.length<2)continue;
      const last=p.row.at(-1),residual=last.station-p.nominalEnd;
      const offset=primitiveIndex<8?30:-25;
      const adjusting=book.actions.find(a=>a.action==='adjust'&&matches(a.target,group.id));
      const layout=book.actions.find(a=>a.action==='lay-out'&&matches(a.target,group.id));
      const residualStart=layout.at+layout.duration+(layout.residualDelay??0);
      const residualAlpha=time<residualStart?0:clamp((time-residualStart)/Math.max(layout.residualFade??0,.0001));
      if(time<adjusting.at) {
        const start=p.row[0].station,end=last.station;
        if(!p.radius)elements.push(...displayElements(measure(p.point(start),p.point(end),(end-start).toFixed(2),view,offset),0,theme));
        else {
          const radial=p.radius+(primitiveIndex<8?1:-1)*24/scale;
          const arc=s=>add(p.center,mul(sub(p.point(s),p.center),radial/p.radius));
          for(let j=0;j<30;j++)line(arc(mix(start,end,j/30)),arc(mix(start,end,(j+1)/30)),'dimension','construction',.8);
          for(const s of [start,end]) {
            const radialUnit=mul(sub(p.point(s),p.center),1/p.radius);
            line(add(arc(s),mul(radialUnit,-4/scale)),add(arc(s),mul(radialUnit,4/scale)),'dimension','construction',.8);
          }
          const anchor=project(arc((start+end)/2));
          elements.push(...displayElements([text([anchor[0],anchor[1]-9],(end-start).toFixed(2))],0,theme));
        }
      }
      if(Math.abs(residual)>.001&&adjust<1&&stitched===0&&residualAlpha>0) {
        const residualColor=blendColor(theme.background,theme.angle,Math.round(residualAlpha*5)/5);
        const nominal=mix(p.nominalEnd,last.station,adjust);
        line(p.point(nominal),p.point(last.station),'residual','angle',2.4,{color:residualColor});
        const pos=project(p.point((nominal+last.station)/2));
        const value=(last.station-nominal).toFixed(2);
        elements.push(...displayElements([{...text([pos[0]+16,pos[1]-12],value),color:'angle',kind:'residual-value'}],0,theme).map(e=>({...e,color:residualColor})));
      }
      const dimensionBoxes=[];
      const equalGaps=new Map();
      for(let i=1;i<p.row.length;i++) {
        const value=distance(p.row[i-1].center,p.row[i].center).toFixed(2);
        if(!equalGaps.has(value))equalGaps.set(value,[]);
        equalGaps.get(value).push(i);
      }
      const measured=new Set([...equalGaps.values()].map(indices=>indices[Math.floor(indices.length/2)]));
      if(adjust>0)for(let i=1;i<p.row.length;i++) {
        const a=p.row[i-1],b=p.row[i];
        if(Math.abs(distance(a.center,b.center)-model.pitch)<.001)continue;
        const start=mix(a.initial,a.station,adjust),end=mix(b.initial,b.station,adjust),count=p.radius?8:1;
        for(let j=0;j<count;j++)line(p.point(mix(start,end,j/count)),p.point(mix(start,end,(j+1)/count)),'adjusted-gap','adjusted',1.5);
        // One representative dimension per repeated fitted gap keeps the close-up legible.
        if(!measured.has(i))continue;
        // Choose dimension lanes from the fitted layout so labels do not jump during adjustment.
        let gapOffset=offset,box;
        for(let lane=0;lane<6;lane++) {
          const fitted=displayElements(measure(a.center,b.center,distance(a.center,b.center).toFixed(2),view,gapOffset),0,theme);
          box=fitted.find(e=>e.type==='text').textBox;
          if(!dimensionBoxes.some(other=>box.x<other.x+other.width+2&&box.x+box.width+2>other.x&&box.y<other.y+other.height+2&&box.y+box.height+2>other.y))break;
          gapOffset+=Math.sign(offset)*22;
        }
        dimensionBoxes.push(box);
        elements.push(...displayElements(measure(p.point(start),p.point(end),distance(p.point(start),p.point(end)).toFixed(2),view,gapOffset).map(e=>adjustmentStyle(e)),stitched,theme));
      }
    }
    if(stitched>0) {
      const a=book.actions.find(a=>a.action==='stitch'&&matches(a.target,group.id));
      for(const thread of group.threads)line(thread.a,thread.b,'thread','ink',Math.max(.7,.14*scale),{...(a.glow===false?{}:pulse(a.at)),round:true});
    }
    for(const extra of model.extras.filter(e=>e.group===group.id)) {
      if(fading===1)continue;
      if(extra.kind==='virtual'?(!showGuides||(fixedAction?fixed<1:build<1)):(planning?adjust<1:build<1))continue;
      const role=extra.kind==='adjustment-mark'?'adjusted':stitched?'secondary':'construction';
      line(extra.a,extra.b,extra.kind,role,Math.max(.55,extra.width*scale),{color:blendColor(theme[role],theme.background,fade)});
    }
  }
  const cue=book.commentary.filter(c=>c.at<=time).at(-1);
  const commentary=cue&&(cue.until===undefined||time<cue.until)?cue:undefined;
  if(commentary) {
    elements.push(...displayElements(termLabel([300,705],commentary.text),0,theme));
  }
  return {elements,camera,commentary:commentary?.text??'',time};
}
function blendColor(a,b,t) {
  return '#'+[1,3,5].map(i=>Math.round(mix(parseInt(a.slice(i,i+2),16),parseInt(b.slice(i,i+2),16),t)).toString(16).padStart(2,'0')).join('');
}
export function createEmblemScene(book=storyboard,model=loadEmblem(),theme=themeFor()) {
  validateStoryboard(book,model);
  const frames=[];
  let previous;
  for(let i=0;i<Math.ceil(book.duration/book.frameStep);i++) {
    const time=i*book.frameStep,frame=frameAt(time,book,model,theme);
    const signature=JSON.stringify(frame.elements),delay=Math.round(Math.min(book.frameStep,book.duration-time)*100);
    if(signature===previous)frames.at(-1).delay+=delay;
    else frames.push({...frame,delay,stage:'storyboard'});
    previous=signature;
  }
  return {name:book.name,title:'Construct the emblem',source:'ILL-EMBLEM-STORYBOARD',displayed:true,
    canvas:{...book.canvas,x:0,y:0,scale:1,background:theme.background},
    final:frameAt(book.duration,book,model,theme).elements,frames};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const model=loadEmblem(),theme=themeFor(process.argv[5]||undefined),scene=createEmblemScene(storyboard,model,theme);
  writeSceneFiles([scene]);
  if(process.argv[2]==='prepare') {
    const output=path.resolve(process.argv[3]);
    const shots=[0,1,3,6.5,9,12.5,19,22.5,26.3,27].map(time=>`<figure>${svg({...scene,final:frameAt(time,storyboard,model,theme).elements})}<figcaption>${time} s</figcaption></figure>`).join('');
    fs.writeFileSync(path.join(output,'emblem-preview.html'),`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Emblem storyboard</title><style>body{margin:32px auto;padding:0 20px;max-width:1100px;background:${theme.background};color:${theme.text};font:16px ${colorConfig.typography.fontFamily},sans-serif}h1{font-size:24px;font-weight:400}main{text-align:center}img{width:600px;max-width:100%;height:auto}small{display:block;margin-top:24px;line-height:1.6}section{display:flex;flex-wrap:wrap;gap:16px}figure{margin:0;width:200px}svg{width:100%;height:auto}figcaption{padding:8px 0}</style><h1>Emblem construction</h1><main><img src="${scene.name}.gif" width="600" height="750" alt="Captioned construction: Build, Adjustment and Stitch, from an A close-up to the completed emblem"></main><h1>Storyboard frames</h1><section>${shots}</section><small>Finished geometry: committed native SVG. Guides: emblem LISP recipe. Lettering adjustment: explanatory planning motion, not a recording of solver execution or physical cutting. Native geometry regenerated and checked after save/reopen on 2026-11-10.</small></html>`);
  }
}
