// Validate test discovery and reusable inputs without opening BricsCAD.
import assert from 'node:assert/strict';
import fs from 'node:fs';
const root=new URL('../',import.meta.url);
const catalog=JSON.parse(fs.readFileSync(new URL('./cases.json',import.meta.url),'utf8'));
const ids=new Set();
const sourceCache=new Map();
function id(value){assert.equal(typeof value,'string');assert(!ids.has(value),`Duplicate ID ${value}`);ids.add(value);}
function source(file){if(!sourceCache.has(file))sourceCache.set(file,fs.readFileSync(new URL(file,root),'utf8'));return sourceCache.get(file);}
function symbol(file,name){assert(source(file).includes(`(defun ${name} `),`Missing ${file}: ${name}`);}
function point(value){assert(Array.isArray(value)&&value.length===2&&value.every(Number.isFinite),'Expected finite XY point');}
assert.equal(catalog.version,1);
for(const c of catalog.geometry){
  id(c.id);assert(c.title&&c.description&&c.notes);
  assert.equal(c.variants.length,catalog.pitches.length);
  for(const pitch of catalog.pitches){
    const variants=c.variants.filter(v=>v.pitch===pitch);assert.equal(variants.length,1,`${c.id}/${pitch}`);
    const v=variants[0];assert.equal(v.settings.pitch,pitch);assert(v.route.primitives.length);
    for(const g of v.route.primitives){
      assert(['line','arc'].includes(g.kind));
      if(g.kind==='line'){point(g.a);point(g.b);assert.notDeepEqual(g.a,g.b);}
      else{point(g.center);assert(g.radius>0&&Number.isFinite(g.radius));assert(Number.isFinite(g.sweep)&&g.sweep!==0);assert(Number.isFinite(g['start-angle']));}
    }
    for(const m of v.landmarks){assert(Number.isInteger(m.primitive)&&m.primitive>=0&&m.primitive<v.route.primitives.length);assert(Number.isFinite(m.station)&&m.station>=0);}
    assert.equal(typeof v.expected.feasible,'boolean');
    assert(Number.isInteger(v.expected.changedGaps)&&v.expected.changedGaps>=0);
    assert(Number.isInteger(v.expected.roundHoles)&&v.expected.roundHoles>=0);
    if(c.kind==='curved-junction')assert.equal(typeof v.expected.fixedRangeFeasible,'boolean');
  }
}
for(const file of catalog.nativeLoads)source(file);
for(const illustration of catalog.illustrations||[]){
  id(illustration.id);source(illustration.source);
  if(illustration.case)assert(catalog.geometry.some(c=>c.id===illustration.case&&c.variants.some(v=>v.pitch===illustration.pitch)));
  else assert(illustration.axioms?.length&&illustration.inputs);
  assert(illustration.status&&illustration.assets.length);
  for(const asset of illustration.assets){
    const animated=asset.animated??illustration.animated;
    if(illustration.exportStills===false)assert(animated,'Disabling still exports requires an animation');
    const extensions=illustration.exportStills===false?['gif']:(animated||asset.staticGif)?['svg','png','gif']:['svg','png'];
    for(const extension of extensions)assert(fs.existsSync(new URL(`${asset.path}.${extension}`,root)),`Missing illustration ${asset.path}.${extension}`);
  }
}
for(const suite of catalog.suites){
  id(suite.id);assert(suite.setup&&suite.recipe&&suite.expected);
  assert(['suite','ui','events'].includes(suite.runner));symbol(suite.source,suite.entrypoint);
  for(const check of suite.checks){
    id(check.id);assert(check.expected);symbol(suite.source,check.sourceSymbol);
    if(!check.labelExpression)assert(source(suite.source).includes(JSON.stringify(check.expected)),`Stale assertion ${check.id}: ${check.expected}`);
  }
  for(const matrix of suite.matrices||[]){id(matrix.id);symbol(suite.source,matrix.sourceSymbol);assert(matrix.expected);}
  for(const scenario of suite.scenarios||[]){id(scenario.id);assert(scenario.action&&scenario.expected);assert(source(suite.driver).includes(`'${scenario.title}'`),`Stale scenario ${scenario.id}`);}
}
for(const fixture of catalog.visualFixtures||[]){
  id(fixture.id);assert(fixture.description&&fixture.expected&&fixture.coverage.length);
  for(const file of [fixture.drawing,fixture.source,...fixture.exports])assert(fs.existsSync(new URL(file,root)),`Missing visual fixture asset ${file}`);
  for(const view of fixture.views){assert(view.name&&view.description);}
  for(const check of fixture.nativeChecks||[]){symbol(check.source,check.entrypoint);assert(check.expected);}
}
for(const recipe of catalog.fillRecipes||[]){
  id(recipe.id);assert(recipe.title&&recipe.notes&&recipe.expected&&recipe.parameters);
  assert(['circles','maze','quilt','flow'].includes(recipe.kind));source(recipe.source);
  for(const file of recipe.exports)assert(fs.existsSync(new URL(file,root)),`Missing fill preview ${file}`);
  if(recipe.drawing){assert(fs.existsSync(new URL(recipe.drawing,root)),`Missing fill drawing ${recipe.drawing}`);assert(recipe.view);}
}
if(catalog.fillChecks){source(catalog.fillChecks.source);assert(catalog.fillChecks.command&&catalog.fillChecks.coverage.length);}
if(catalog.buildChecks){id(catalog.buildChecks.id);source(catalog.buildChecks.source);assert(catalog.buildChecks.command&&catalog.buildChecks.expected&&catalog.buildChecks.coverage.length);}
id(catalog.oracle.id);source(catalog.oracle.source);source(catalog.oracle.nativeSource);
assert(catalog.oracle.expected&&catalog.oracle.native.lengths.length&&catalog.oracle.exhaustive.lengthCount>0);
console.log(`Catalog valid: ${catalog.geometry.length} geometry recipes, ${catalog.geometry.reduce((n,c)=>n+c.variants.length,0)} pitch variants, ${catalog.suites.length} suites, ${ids.size} stable IDs.`);
if(process.argv.includes('--list')){
  for(const c of catalog.geometry)console.log(`${c.id}: ${c.title}`);
  for(const suite of catalog.suites)console.log(`${suite.id}: ${suite.title} (${suite.entrypoint})`);
}
