import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {renderStaticLab} from './render-static.mjs';

const root=path.dirname(fileURLToPath(import.meta.url));
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const withoutExports=s=>s.replace(/^export\s+(?=(?:const|let|var|function|class)\b)/gm,'');
const geoExports=['DEFAULT_PROFILE','makeSlit','classifySlits','mergeVirtualSlits','validateSpacing','fitSpan','fitCircularSpan','solveCorner'];
const labExports=['PITCHES','AXIOMS','HYPOTHESES','CASES','runCase','runAll'];
const geometry=withoutExports(read('geometry.mjs'));
const cases=withoutExports(read('case-suite.mjs').replace(/^import \* as Geo from '\.\/geometry\.mjs';\s*/m,''));
const renderer=withoutExports(read('render-svg.mjs'));
const presentation=withoutExports(read('presentation.mjs'));
const presentationExports=['caseLabel','caseDescription','caseSummary','caseDetails','caseGroup'];
const fullReport=JSON.parse(read('results.json'));
const {suites,...report}=fullReport;
const staticView=renderStaticLab(fullReport);
const script=[
  'const Geo = (() => {\n'+geometry+'\nreturn {'+geoExports.join(',')+'};\n})();',
  'const Lab = (() => {\n'+cases+'\nreturn {'+labExports.join(',')+'};\n})();',
  'const Render = (() => {\n'+renderer+'\nreturn {renderSvg};\n})();',
  'const Presentation = (() => {\n'+presentation+'\nreturn {'+presentationExports.join(',')+'};\n})();',
  'const REPORT = '+JSON.stringify(report).replace(/</g,'\\u003c')+';',
  read('viewer.js')
].join('\n\n');
new vm.Script(script,{filename:'embedded-viewer.js'});
const template=read('viewer-template.html');
if(template.split('<!-- EMBED_SCRIPT -->').length!==2)throw new Error('Expected exactly one script placeholder.');
if(/<\/script/i.test(script))throw new Error('Unexpected closing script tag in embedded source.');
const bootstrap=`<script>
(function () {
  function showSavedResults(event) {
    var saved = document.getElementById('static-lab');
    var app = document.getElementById('app');
    if (saved) saved.hidden = false;
    if (app) app.hidden = true;
    var notice = document.getElementById('startup-error');
    if (!notice && saved) {
      notice = document.createElement('p');
      notice.id = 'startup-error';
      notice.className = 'startup-notice';
      saved.insertBefore(notice, saved.firstChild);
    }
    if (notice) notice.textContent = 'Interactive controls could not start. The saved results below remain available.';
  }
  window.addEventListener('error', showSavedResults);
  window.addEventListener('unhandledrejection', showSavedResults);
})();
</script>`;
const html=template
  .replace('<!-- STATIC_STYLES -->',()=>'<style>\n[hidden]{display:none !important}\n.startup-notice{padding:12px;border:1px solid #ead4af;background:#fff3df}\n'+staticView.css+'\n</style>')
  .replace('<!-- STATIC_VIEW -->',()=>staticView.html)
  .replace('<!-- EMBED_SCRIPT -->',()=>bootstrap+'\n<script>\n'+script+'\n</script>');
fs.writeFileSync(path.join(root,'stitch-geometry-lab.html'),html);
console.log('Built stitch-geometry-lab.html ('+Buffer.byteLength(html)+' bytes).');
