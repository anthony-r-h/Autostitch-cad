// Match vector animation exports to the authored scene timing.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gifBlocks,createScenes,portraitScenes} from '../examples/illustrated/scenes.mjs';
import {createScenes as junctionScenes} from '../examples/illustrated/t-junctions.mjs';
import {createScenes as counterScenes} from '../examples/counter_examples/scenes.mjs';
import {createEmblemScene} from '../examples/illustrated/emblem.mjs';
import {animatedSvg} from '../examples/illustrated/animated-svg.mjs';

// Independently read the emitted groups and SMIL tracks for a small reorder case.
function lineFrames(source,times) {
  const root={attributes:{},children:[],animations:[]},stack=[root];
  for(const match of source.matchAll(/<(\/?)(g|line|animate|animateTransform)\b([^>]*?)(\/?)>/g)) {
    const [,close,tag,body,selfClosing]=match;
    if(close){stack.pop();continue;}
    const attributes=Object.fromEntries([...body.matchAll(/([\w-]+)="([^"]*)"/g)].map(m=>[m[1],m[2]]));
    const parent=stack.at(-1);
    if(tag==='animate'||tag==='animateTransform'){parent.animations.push(attributes);continue;}
    const node={tag,attributes,children:[],animations:[]};
    parent.children.push(node);
    if(!selfClosing)stack.push(node);
  }
  return times.map(time=>{
    const lines=[];
    const visit=(node,inherited={})=>{
      const attributes={...inherited,...node.attributes};
      for(const track of node.animations) {
        const keys=track.keyTimes.split(';').map(Number),values=track.values.split(';');
        const fraction=time/parseFloat(track.dur);
        attributes[track.attributeName]=values[keys.findLastIndex(key=>key<=fraction)];
      }
      if(node.tag==='line'&&attributes.visibility!=='hidden')lines.push([attributes.x1,attributes.stroke,attributes['stroke-width']]);
      for(const child of node.children)visit(child,attributes);
    };
    visit(root);
    return lines;
  });
}
const mark=id=>({id,type:'line',kind:'guide',a:[id,0],b:[id,10],width:1,color:'#fff'});
const order=[[1,2],[3,1,2],[2,3,1],[1,2]];
const fixture={title:'Track identity and painter order',source:'BUILD-ANIMATED-SVG',
  canvas:{width:600,height:750,x:0,y:0,scale:1,background:'#000'},
  frames:order.map((ids,index)=>({delay:25,elements:ids.map(id=>({...mark(id),width:index+1}))}))};
const emitted=animatedSvg(fixture);
assert.deepEqual(lineFrames(emitted,[.125,.375,.625,.875]),
  order.map((ids,index)=>ids.map(id=>[String(id),'#fff',String(index+1)])),
  'Inserted, removed and reordered shapes must preserve visible order and inherited styling');
assert(!emitted.includes('attributeName="x1"'),'Stable shapes should not acquire coordinate animation');
console.log('SVG optimization valid: stable geometry, insertions, removals, painter order and inherited styling.');

const root=new URL('../',import.meta.url);
const groups=[['examples/illustrated/assets/',portraitScenes(createScenes())],
  ['examples/illustrated/t-junctions/',junctionScenes()],['examples/illustrated/emblem/',[createEmblemScene()]],
  ['examples/counter_examples/assets/',portraitScenes(counterScenes())]];
let count=0,frames=0;
for(const [directory,scenes] of groups)for(const scene of scenes){
  const name=scene.name,svgPath=new URL(directory+name+'.animated.svg',root);
  if(scene.frames.length<2){assert(!fs.existsSync(svgPath),`Static figure has an animated SVG: ${name}`);continue;}
  const svg=fs.readFileSync(svgPath,'utf8');
  assert(svg.includes('viewBox="0 0 600 750"'));
  assert(!/<(?:script|image|foreignObject)\b|\bon\w+=|\b(?:href|xlink:href)=/i.test(svg),'Expected self-contained vector animation');
  assert(!/NaN|Infinity|undefined/.test(svg),`Invalid value: ${name}`);
  const timing=JSON.parse(svg.match(/<metadata id="animation-timing">([^<]+)<\/metadata>/)[1]);
  const delays=scene.frames.map(frame=>frame.delay);
  assert.deepEqual(timing.frameDelays,delays,`SVG/scene timing differs: ${name}`);
  const gifPath=new URL(directory+name+'.gif',root);
  if(fs.existsSync(gifPath)) {
    const blocks=gifBlocks(fs.readFileSync(gifPath)).blocks;
    assert.equal(blocks.filter(block=>block.kind==='image').length,delays.length);
    assert.deepEqual(blocks.filter(block=>block.kind==='control').map(block=>block.bytes.readUInt16LE(4)),delays);
  }
  assert.equal(timing.durationCentiseconds,delays.reduce((sum,delay)=>sum+delay,0));
  const animations=[...svg.matchAll(/<(animate(?:Transform)?) ([^>]+)\/>/g)];
  assert(animations.length,`Missing animation: ${name}`);
  for(const match of animations){
    const attributes=Object.fromEntries([...match[2].matchAll(/([\w-]+)="([^"]*)"/g)].map(m=>[m[1],m[2]]));
    const times=attributes.keyTimes.split(';').map(Number),values=attributes.values.split(';');
    assert.equal(times.length,values.length);assert.equal(times[0],0);assert.equal(times.at(-1),1);
    assert(times.every((time,index)=>Number.isFinite(time)&&(!index||time>times[index-1])),`Invalid SMIL times: ${name}`);
    assert.equal(attributes.dur,`${timing.durationCentiseconds/100}s`);
    assert.equal(attributes.repeatCount,'indefinite');assert.equal(attributes.calcMode,'discrete');
  }
  count++;frames+=scene.frames.length;
}
const pitch=fs.readFileSync(new URL('docs/PITCH_authored.md',root),'utf8');
const embeds=[...pitch.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)].map(match=>match[1]);
assert(!embeds.some(src=>src.endsWith('.gif')),'Authored pitch still embeds GIFs');
for(const src of embeds.filter(src=>src.endsWith('.animated.svg')))assert(fs.existsSync(new URL(src,new URL('docs/PITCH_authored.md',root))),`Missing pitch animation: ${src}`);
console.log(`Animated SVGs valid: ${count} files, ${frames} frames, authored delays, looping tracks, static exclusions and authored pitch references.`);
