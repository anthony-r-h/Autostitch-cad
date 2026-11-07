import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {CASES,PITCHES} from './case-suite.mjs';

const root=fileURLToPath(new URL('.',import.meta.url));
const html=fs.readFileSync(root+'/stitch-geometry-lab.html','utf8');
const source=[...html.matchAll(/<script>\s*([\s\S]*?)<\/script>/g)].map(match=>match[1]).join('\n');
assert.ok(source,'Embedded source exists');
const withoutScripts=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
const savedMain=withoutScripts.match(/<main\b[^>]*\bid="static-lab"[^>]*>/)?.[0];
assert.ok(savedMain&&!/\bhidden\b/.test(savedMain),'Saved view is visible without script execution');
assert.equal([...withoutScripts.matchAll(/<details class="static-case"/g)].length,CASES.length*PITCHES.length,'Every case and pitch has saved content');
for(const pitch of PITCHES){
  const id='static-p'+String(pitch).replace(/[^A-Za-z0-9_-]/g,'_');
  assert.ok(withoutScripts.includes('href="#'+id+'"'),'Pitch has a native link: '+pitch);
  assert.ok(withoutScripts.includes('id="'+id+'"'),'Pitch link resolves: '+pitch);
}
const staticIds=[...withoutScripts.matchAll(/\bid="([^"]+)"/g)].map(match=>match[1]);
assert.equal(new Set(staticIds).size,staticIds.length,'Saved HTML has no duplicate IDs');
let width=840;
class Element {
  constructor(id=''){this.id=id;this.attrs={};this.dataset={};this.listeners={};this.children=[];this.value='';this.checked=false;this.textContent='';this.hidden=false;this.open=false;this._html='';}
  set innerHTML(value){
    this._html=value;
    this.children=[...value.matchAll(/<option\b[^>]*value="([^"]+)"[^>]*>/g)].map(m=>{const x=new Element();x.value=m[1];return x;});
    if(this.id==='pitch-select'||this.id==='case-select'){
      const selected=value.match(/<option\b[^>]*value="([^"]+)"[^>]*\bselected\b/);
      this.value=selected?selected[1]:(this.children[0]?.value||'');
    }
  }
  get innerHTML(){return this._html;}
  addEventListener(name,fn){this.listeners[name]=fn;}
  setAttribute(name,value){this.attrs[name]=value;}
  querySelectorAll(){return this.children;}
  getBoundingClientRect(){return {width};}
  closest(){return this;}
  appendChild(x){this.children.push(x);}
  insertBefore(x){this.children.unshift(x);if(x.id)elements.set(x.id,x);}
  focus(){}
  scrollIntoView(){}
  click(){}
  remove(){}
}
const elements=new Map([...html.matchAll(/id="([^"]+)"/g)].map(m=>[m[1],new Element(m[1])]));
for(const match of withoutScripts.matchAll(/<(?:input|main|details)\b[^>]*\bid="([^"]+)"[^>]*>/g)){
  const element=elements.get(match[1]);
  element.checked=/\bchecked\b/.test(match[0]);
  element.hidden=/\bhidden\b/.test(match[0]);
  element.open=/\bopen\b/.test(match[0]);
}
const get=id=>{assert.ok(elements.has(id),'Known element '+id);return elements.get(id);};
const document={getElementById:id=>elements.get(id)||null,createElement:()=>new Element(),body:new Element('body')};
const windowListeners={};
const context=vm.createContext({document,window:{addEventListener:(name,fn)=>{windowListeners[name]=fn;},setTimeout:fn=>fn()},ResizeObserver:class {observe(){}},requestAnimationFrame:fn=>fn(),URL:{createObjectURL:()=> 'blob:test',revokeObjectURL(){}},Blob,console});
vm.runInContext('Array.prototype.at = undefined;',context);
vm.runInContext(source,context,{filename:'embedded-viewer.js'});
assert.equal(get('app').hidden,false,'Interactive app becomes visible after successful initialization');
assert.equal(get('static-lab').hidden,true,'Saved results stay available until initialization succeeds');
assert.equal(get('show-threads').checked,true,'Thread starts visible');
assert.equal(get('show-virtuals').checked,false,'Virtual slits start hidden');
assert.equal(get('show-intervals').checked,false,'All dimensions start hidden');
assert.equal(get('drawing-options').open,false,'Drawing options start closed');
assert.equal(get('case-details').open,false,'Measurements start closed');
const pitches=vm.runInContext('Lab.PITCHES',context);
const ids=vm.runInContext('Lab.CASES.map(x=>x.id)',context);
assert.equal(get('pitch-select').children.length,pitches.length,'Pitch menu is populated');
assert.equal(get('case-select').children.length,ids.length,'Example menu is populated');
let runs=0;
for(const pitch of pitches){
  get('pitch-select').value=String(pitch);
  get('pitch-select').listeners.change();
  for(const id of ids){
    get('case-select').value=id;
    get('case-select').listeners.change();
    assert.ok(get('plot').innerHTML.startsWith('<svg'));
    assert.ok(get('plot').innerHTML.includes('<title id="figure-title">'+id+' '),'Drawing matches '+id);
    assert.ok(!/NaN|Infinity|undefined/.test(get('plot').innerHTML));
    assert.ok(get('case-description').textContent.length>0,'Physical description exists for '+id);
    assert.ok(get('case-result').textContent.length>0,'Result exists for '+id);
    assert.ok(get('case-measurements').innerHTML.length>0,'Measurements exist for '+id);
    runs++;
  }
}
get('case-select').value='J02';get('case-select').listeners.change();
get('show-virtuals').checked=true;get('show-virtuals').listeners.change();
assert.ok(get('plot').innerHTML.includes('class="virtual"'),'Virtual slit toggle reveals corner construction');
get('show-threads').checked=false;get('show-threads').listeners.change();
assert.ok(!get('plot').innerHTML.includes('class="thread"'));
get('show-virtuals').checked=false;get('show-virtuals').listeners.change();
assert.ok(!get('plot').innerHTML.includes('class="virtual"'));
width=320;get('show-intervals').checked=true;get('show-intervals').listeners.change();
assert.ok(get('plot').innerHTML.includes('width="320"'));
get('export-svg').listeners.click();
assert.ok(!/<aside\b|grid-template-columns|class="(?:badge|sidebar)\b/.test(withoutScripts),'Viewer has no sidebar, column grid, or badges');
windowListeners.error({message:'Simulated startup failure'});
assert.equal(get('app').hidden,true,'A startup failure hides the unfinished interactive view');
assert.equal(get('static-lab').hidden,false,'A startup failure restores the saved results');
assert.ok(get('startup-error').textContent.includes('saved results'),'A startup failure has a visible explanation');
console.log('Viewer checks passed: '+runs+' saved layouts without scripts; '+runs+' selections without Array.at; populated menus, quiet defaults, drawing controls, export, and error recovery.');
