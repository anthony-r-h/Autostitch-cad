// Annotated square preview; native geometry is retained verbatim for the animation.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadEmblem,nativeEmblemSvg,frameAt,storyboard} from './emblem.mjs';
import {themeFor,writeSceneFiles,displayElements,notationText,routeMarks} from './scenes.mjs';

const add=(a,b)=>[a[0]+b[0],a[1]+b[1]];
const mul=(a,s)=>[a[0]*s,a[1]*s];

export function createSquareEmblem(model=loadEmblem(),theme=themeFor()) {
  // Keep the existing square crop in native drawing coordinates.
  const scale=600/(465*256/600),center=[333+292.5*256/600,135.0709751266425-300.5*256/600];
  const view={x:300-center[0]*scale,y:375+center[1]*scale,scale};
  const project=p=>[view.x+p[0]*scale,view.y-p[1]*scale];
  const book={...storyboard,views:{square:{center,height:750/scale}},camera:[{at:0,view:'square'}],
    guides:[{target:'all',from:0,until:100}],commentary:[],actions:storyboard.actions.filter(a=>a.action!=='fade-openings')};
  const elements=frameAt(40,book,model,theme).elements;
  const annotations=[];
  const label=(point,value,kind)=>annotations.push({...notationText(point,value,kind),size:10});
  const line=(a,b,kind,color,width=.7)=>annotations.push({type:'line',a,b,kind,color,width});
  for(const group of model.groups) {
    for(const route of group.routes??[]) {
      const first=group.primitives[route.first],last=group.primitives[route.last];
      const tangent=p=>[Math.cos(p),-Math.sin(p)];
      const marks=routeMarks(project(first.a),project(last.b),tangent(first.angle(0)),tangent(last.angle(last.length)));
      annotations.push(...marks.filter(e=>!route.closed||e.kind!=='notation-end').map(e=>e.type==='text'?{...e,size:10}:e));
    }
    if(group.radius) {
      const incoming=new Set(group.threads.map(t=>t.to)),outgoing=new Set(group.threads.map(t=>t.from));
      for(const o of group.openings) {
        if(!incoming.has(o.id))label(add(project(o.center),[-9,-10]),'s','start');
        if(!outgoing.has(o.id))label(add(project(o.center),[9,12]),'e','end');
      }
    }
    for(const [i,landmark] of (group.landmarks??[]).entries()) {
      const p=group.primitives[landmark.primitive],at=p.point(landmark.station),angle=p.angle(landmark.station);
      const normal=[-Math.sin(angle),Math.cos(angle)];
      line(project(add(at,mul(normal,-1))),project(add(at,mul(normal,1))),'landmark','secondary',1.2);
      label(add(project(add(at,mul(normal,i===0?4:-4))),[10,0]),`L${i+1}`,'landmark');
    }
    for(const o of group.openings.filter(o=>o.type==='circle'&&o.radius<=1)) {
      label(add(project(o.center),[8,-8]),'j','junction');
      // Each corner connection is compared with its adjoining guide tangent.
      for(const thread of group.threads.filter(t=>t.from===o.id||t.to===o.id)) {
        const other=group.openings.find(n=>n.id===(thread.from===o.id?thread.to:thread.from));
        if(other?.type!=='slit')continue;
        const p=group.primitives[other.primitive],anchor=project(thread.from===o.id?thread.b:thread.a);
        const toward=project(o.center),threadAngle=Math.atan2(toward[1]-anchor[1],toward[0]-anchor[0]);
        let guideAngle=-p.angle(other.station);
        if(Math.cos(threadAngle-guideAngle)<0)guideAngle+=Math.PI;
        const delta=Math.atan2(Math.sin(threadAngle-guideAngle),Math.cos(threadAngle-guideAngle));
        const point=a=>add(anchor,[6*Math.cos(a),6*Math.sin(a)]);
        line(anchor,point(guideAngle),'angle-guide','angle',.55);
        for(let j=0;j<8;j++)line(point(guideAngle+delta*j/8),point(guideAngle+delta*(j+1)/8),'angle','angle',.85);
      }
    }
  }
  elements.push(...displayElements(annotations,0,theme));
  // Crop the shared frame's portrait origin to the square viewport.
  return {name:'emblem',title:'Autostitch emblem with construction notation',source:'ILL-EMBLEM-SQUARE',displayed:true,
    canvas:{width:600,height:600,x:0,y:-75,scale:1,background:theme.background},final:elements,frames:[]};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const native=nativeEmblemSvg();
  const scene=createSquareEmblem(loadEmblem(),themeFor(process.argv[5]||undefined));
  writeSceneFiles([scene]);
  if(process.argv[2]==='prepare') {
    const target=path.join(path.resolve(process.argv[3]),'emblem.svg');
    const rendered=fs.readFileSync(target,'utf8');
    fs.writeFileSync(target,rendered.replace('</svg>',`<metadata id="native-emblem"><![CDATA[${native}]]></metadata>\n</svg>`));
  }
}
