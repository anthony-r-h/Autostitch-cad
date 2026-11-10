// Compare presentation colours on one unchanged corner construction.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createScenes,portraitScenes,writeSceneFiles,colorConfig} from './scenes.mjs';

export const palettes=Object.values(colorConfig.themes);

export function paletteScenes() {
  const scenes=createScenes();
  return palettes.map(theme=>{
    const source=portraitScenes(scenes,theme).find(s=>s.name==='problem-corner-vertex-point');
    return {...source,name:'palette-'+theme.id,title:theme.id+' / '+theme.title,frames:[],staticGif:false};
  });
}

function gallery(output) {
  const chrome=colorConfig.gallery;
  const sections=['light','dark'].map(mode=>`<section><h2>${mode==='light'?'Light':'Dark'} backgrounds</h2><div class="grid">${palettes.filter(p=>p.mode===mode).map(p=>`<article><a href="palette-${p.id}.svg"><img src="palette-${p.id}.svg" alt="${p.title}: the same corner, two equal 14.3 degree angles" width="600" height="750"></a><h3>${p.id} / ${p.title}</h3><div class="swatches">${['background','ink','secondary','guide','angle','adjusted'].map(role=>`<span title="${role}: ${p[role]}"><i style="background:${p[role]}"></i>${role}</span>`).join('')}</div></article>`).join('')}</div></section>`).join('');
  fs.writeFileSync(path.join(output,'index.html'),`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Autostitch / colour studies</title><style>body{margin:0;background:${chrome.background};color:${chrome.ink};font:15px "${colorConfig.typography.fontFamily}",sans-serif}main{max-width:1440px;margin:auto;padding:32px}h1{font-size:28px;margin:0 0 12px}h2{font-size:19px;margin:36px 0 16px}h3{font-size:15px;margin:12px 0}p{line-height:1.5}.grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:28px 20px}img{display:block;width:100%;height:auto}a:focus-visible{outline:3px solid ${chrome.focus}}.swatches{display:flex;flex-wrap:wrap;gap:6px 10px;font-size:11px}.swatches span{display:flex;align-items:center;gap:4px}i{width:12px;height:12px;display:inline-block;border:1px solid ${chrome.border}} @media(max-width:800px){.grid{grid-template-columns:repeat(2,minmax(0,1fr))}main{padding:16px}}@media(max-width:420px){.grid{grid-template-columns:1fr}}</style><main><h1>Autostitch / colour studies</h1><p>One corner. Sixteen palettes. Click a figure to inspect it at full size.<br>Thread stays prominent; slit holes and measurements remain readable. Warm accents mark angles; cool accents mark adjusted gaps.</p>${sections}</main></html>`);
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  writeSceneFiles(paletteScenes());
  if(process.argv[2]==='prepare')gallery(path.resolve(process.argv[3]));
}
