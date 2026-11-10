// Compare presentation colours on one unchanged corner construction.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createScenes,portraitScenes,writeSceneFiles} from './scenes.mjs';

// Background, thread/text, secondary text/holes, guides, angles, adjusted gaps.
export const palettes=[
  ['01','Porcelain','light','#FAFAF7','#252A31','#6D7076','#91969B','#B32F3C','#2166AC'],
  ['02','Ivory & ink','light','#F6F0E3','#253349','#6E685A','#979182','#A13732','#356B8E'],
  ['03','Glacier','light','#EDF5FA','#16394E','#5B6D7C','#859BAA','#B12E48','#145D9A'],
  ['04','Sage paper','light','#EDF3E9','#253D31','#5E705D','#899B86','#A33636','#286B88'],
  ['05','Rose quartz','light','#FAEFF0','#4B2D42','#7F6773','#AA909B','#A92142','#3B6297'],
  ['06','Lilac mist','light','#F1EEFA','#352D52','#6F6682','#9A91B0','#AF3046','#315DB5'],
  ['07','Linen','light','#F3E9DB','#49372B','#786758','#A18D7B','#AC3828','#286E82'],
  ['08','Mint porcelain','light','#E8F5F2','#163D3E','#57736F','#81A29B','#AC3548','#235EB0'],
  ['09','Midnight blue','dark','#111D31','#E9F1FF','#91A6C3','#637994','#FF8D88','#71B6FF'],
  ['10','Graphite','dark','#202225','#F5F3ED','#A6A9AE','#797E87','#FF968C','#83BDFC'],
  ['11','Bottle green','dark','#132D28','#E7F4E7','#9BBDB0','#668F82','#FFA08E','#80C8F0'],
  ['12','Aubergine','dark','#302036','#F8EAF6','#BAA0BC','#8B6F90','#FF9DAA','#9FC0FF'],
  ['13','Oxblood','dark','#361E25','#FAEEE3','#C0A0A1','#946D75','#FFAD87','#8CC8EE'],
  ['14','Deep petrol','dark','#103039','#E5F6F5','#97BAC1','#638D98','#FFA396','#84C2FF'],
  ['15','Espresso','dark','#2F2823','#F9F0DC','#B9AB94','#8D806C','#FFAB8B','#94C7EA'],
  ['16','Indigo','dark','#23223D','#F1EFFF','#B0A9CE','#8078A5','#FFA0AA','#8DBBFF']
].map(([id,title,mode,background,ink,secondary,guide,angle,adjusted])=>({id,title,mode,background,ink,secondary,guide,angle,adjusted}));

export function paletteScenes() {
  const source=portraitScenes(createScenes()).find(s=>s.name==='problem-corner-vertex-point');
  return palettes.map(p=>({...source,name:'palette-'+p.id,title:p.id+' / '+p.title,frames:[],staticGif:false,
    canvas:{...source.canvas,background:p.background},final:source.final.map(e=>{
      let color=p.secondary;
      if(e.kind==='thread')color=p.ink;
      else if(e.color.toUpperCase()==='#C62828')color=p.angle;
      else if(e.kind==='adjusted-gap'||e.kind==='adjustment-mark')color=p.adjusted;
      else if(e.kind==='guide'||e.kind==='direction')color=p.guide;
      return {...e,color};
    })}));
}

function gallery(output) {
  const sections=['light','dark'].map(mode=>`<section><h2>${mode==='light'?'Light':'Dark'} backgrounds</h2><div class="grid">${palettes.filter(p=>p.mode===mode).map(p=>`<article><a href="palette-${p.id}.svg"><img src="palette-${p.id}.svg" alt="${p.title}: the same corner, two equal 14.3 degree angles" width="600" height="750"></a><h3>${p.id} / ${p.title}</h3><div class="swatches">${['background','ink','secondary','guide','angle','adjusted'].map(role=>`<span title="${role}: ${p[role]}"><i style="background:${p[role]}"></i>${role}</span>`).join('')}</div></article>`).join('')}</div></section>`).join('');
  fs.writeFileSync(path.join(output,'index.html'),`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Autostitch / colour studies</title><style>body{margin:0;background:#e4e2de;color:#292b30;font:15px Arial,sans-serif}main{max-width:1440px;margin:auto;padding:32px}h1{font-size:28px;margin:0 0 12px}h2{font-size:19px;margin:36px 0 16px}h3{font-size:15px;margin:12px 0}p{line-height:1.5}.grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:28px 20px}img{display:block;width:100%;height:auto}a:focus-visible{outline:3px solid #2166ac}.swatches{display:flex;flex-wrap:wrap;gap:6px 10px;font-size:11px}.swatches span{display:flex;align-items:center;gap:4px}i{width:12px;height:12px;display:inline-block;border:1px solid #777} @media(max-width:800px){.grid{grid-template-columns:repeat(2,minmax(0,1fr))}main{padding:16px}}@media(max-width:420px){.grid{grid-template-columns:1fr}}</style><main><h1>Autostitch / colour studies</h1><p>One corner. Sixteen palettes. Click a figure to inspect it at full size.<br>Thread stays prominent; slit holes and measurements remain readable. Warm accents mark angles; cool accents mark adjusted gaps.</p>${sections}</main></html>`);
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  writeSceneFiles(paletteScenes());
  if(process.argv[2]==='prepare')gallery(path.resolve(process.argv[3]));
}
