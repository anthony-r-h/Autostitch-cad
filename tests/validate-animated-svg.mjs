// Match the vector animation exports to the independently encoded GIF timing.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gifBlocks} from '../examples/illustrated/scenes.mjs';

const root=new URL('../',import.meta.url);
const directories=['examples/illustrated/assets/','examples/illustrated/t-junctions/',
  'examples/illustrated/emblem/','examples/counter_examples/assets/'];
let count=0,frames=0;
for(const directory of directories)for(const name of fs.readdirSync(new URL(directory,root)).filter(name=>name.endsWith('.gif'))){
  const gif=fs.readFileSync(new URL(directory+name,root)),blocks=gifBlocks(gif).blocks;
  const svgPath=new URL(directory+name.replace(/\.gif$/,'.animated.svg'),root);
  const images=blocks.filter(block=>block.kind==='image');
  if(images.length<2){assert(!fs.existsSync(svgPath),`Static GIF has an animated SVG: ${name}`);continue;}
  const svg=fs.readFileSync(svgPath,'utf8');
  assert(svg.includes('viewBox="0 0 600 750"'));
  assert(!/<(?:script|image|foreignObject)\b|\bon\w+=|\b(?:href|xlink:href)=/i.test(svg),'Expected self-contained vector animation');
  assert(!/NaN|Infinity|undefined/.test(svg),`Invalid value: ${name}`);
  const timing=JSON.parse(svg.match(/<metadata id="animation-timing">([^<]+)<\/metadata>/)[1]);
  const delays=blocks.filter(block=>block.kind==='control').map(block=>block.bytes.readUInt16LE(4));
  assert.deepEqual(timing.frameDelays,delays,`SVG/GIF timing differs: ${name}`);
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
  count++;frames+=images.length;
}
const pitch=fs.readFileSync(new URL('docs/PITCH_authored.md',root),'utf8');
const embeds=[...pitch.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)].map(match=>match[1]);
assert(!embeds.some(src=>src.endsWith('.gif')),'Authored pitch still embeds GIFs');
for(const src of embeds.filter(src=>src.endsWith('.animated.svg')))assert(fs.existsSync(new URL(src,new URL('docs/PITCH_authored.md',root))),`Missing pitch animation: ${src}`);
console.log(`Animated SVGs valid: ${count} files, ${frames} frames, exact GIF delays, looping tracks, static exclusions and authored pitch references.`);
