// Isolated reconstructions for docs/counter_examples; no CAD writes.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {add,mul,axis,project,worldLine,opening,hole,scene,frame,finish,
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
  frame(s,base,90,'guides');
  const result=[...base],rows=[[],[]];
  for(const [arm,row] of rows.entries())for(let n=spec.armGaps;n>=1;n--) {
    const slit=opening(arm===0?[-n*p,0]:[0,-n*p],angles[arm],view)[0];
    row.push(slit);result.push(slit);frame(s,[...result],65,`arm-${arm}-stitch`);
  }
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

export function walletGeometry() {
  const spec=input('ILL-SELLIER-WALLET'),p=spec.pitch,lean=-spec.leanDegrees*Math.PI/180,h=spec.slitLength/2;
  const ui=axis(lean),uo=axis(lean-Math.PI/2);
  const joint=[h*uo[0],-h*ui[1]],ci=add(joint,mul(ui,h)),co=add(joint,mul(uo,-h));
  // Nominal counts determine the extents. The H anchors never create residuals.
  const start=[ci[0]-spec.topSteps*p,0],rightAnchor=[0,co[1]-spec.rightSteps*p];
  const across=axis(Math.PI/4),up=axis(3*Math.PI/4);
  const leftAnchor=add(rightAnchor,mul(across,-spec.hWidth));
  const decoration=[leftAnchor,rightAnchor].map(base=>[base,add(base,mul(up,spec.hHeight/2)),add(base,mul(up,spec.hHeight))]);
  const end=add(leftAnchor,[-spec.bottomSteps*p,0]);
  const top=Array.from({length:spec.topSteps},(_,i)=>[start[0]+i*p,0]);
  const right=Array.from({length:spec.rightSteps-1},(_,i)=>[0,co[1]-(i+1)*p]);
  const bottom=Array.from({length:spec.bottomSteps},(_,i)=>add(leftAnchor,[-(i+1)*p,0]));
  return {spec,lean,joint,ci,co,start,end,rightAnchor,leftAnchor,decoration,top,right,bottom};
}

function walletScene(diagonal=false) {
  const g=walletGeometry(),view={x:435,y:45,scale:18};
  let vertex=[0,0];
  const reference=input('ILL-SELLIER-CORNER');
  if(diagonal) {
    // Keep the H and its nominal approach rows fixed. A real slit replaces the
    // outgoing virtual centre; set the top row nominally from that vertex.
    vertex=[0,g.co[1]];g.joint=vertex;
    g.top=g.top.map((p,i)=>[-(g.spec.topSteps-i)*g.spec.pitch,vertex[1]]);
    g.start=g.top[0];
  }
  const s=scene(diagonal?'sellier-wallet-diagonal':'sellier-wallet-autostitch',
    diagonal?'Shared diagonal corner slit with a decorative H':'Top, right and bottom stitching with a decorative H',
    diagonal?'ILL-SELLIER-WALLET-DIAGONAL':'ILL-SELLIER-WALLET');
  const circles=g.decoration.map(column=>column.map(p=>hole(p,view)));
  const base=[worldLine(g.start,vertex,view),worldLine(vertex,g.rightAnchor,view),worldLine(g.leftAnchor,g.end,view),
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

export function createScenes(){return [diagonalCorner(),walletScene(),walletScene(true)];}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))writeSceneFiles(createScenes());
