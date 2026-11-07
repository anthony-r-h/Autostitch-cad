import {renderSvg} from './render-svg.mjs';
import {caseLabel, caseDescription, caseSummary, caseDetails} from './presentation.mjs';

const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
const idPart = value => String(value).replace(/[^A-Za-z0-9_-]/g, '_');

function diagram(result, id, width, height) {
  const plainResult = {...result, title: caseLabel(result), question: caseDescription(result), reason: caseSummary(result)};
  return renderSvg(plainResult, {width, height, showThreads: true, showVirtuals: false, showIntervals: false})
    .replace(/figure-title/g, id + '-figure-title').replace(/figure-desc/g, id + '-figure-desc');
}

function renderCase(result, pitchKey, isOpen) {
  const id = 'static-' + pitchKey + '-' + idPart(result.id);
  const flat = /^[SF]/.test(result.id) || result.id === 'J01';
  return '<details class="static-case" id="' + id + '"' + (isOpen ? ' open' : '') + '>' +
    '<summary>' + escape(result.id + ': ' + caseLabel(result)) + '</summary>' +
    '<p>' + escape(caseDescription(result)) + '</p>' +
    '<div class="static-plot static-plot-wide">' + diagram(result, id + '-wide', 800, flat ? 180 : 360) + '</div>' +
    '<div class="static-plot static-plot-narrow">' + diagram(result, id + '-narrow', 360, flat ? 180 : 280) + '</div>' +
    '<p>' + escape(caseSummary(result)) + '</p>' +
    '<details><summary>Details</summary><ul class="measurements">' +
    caseDetails(result).map(text => '<li>' + escape(text) + '</li>').join('') + '</ul></details></details>';
}

function renderPitch(suite) {
  const key = 'p' + idPart(suite.pitch), id = 'static-' + key;
  const first = suite.cases.some(result => result.id === 'R01') ? 'R01' : suite.cases[0].id;
  const cases = [...suite.cases].sort((a, b) => Number(b.id === first) - Number(a.id === first));
  return '<section class="static-pitch-section" id="' + id + '" aria-labelledby="' + id + '-title">' +
    '<h2 id="' + id + '-title">' + escape(suite.pitch) + ' mm</h2>' +
    cases.map(result => renderCase(result, key, result.id === first)).join('') + '</section>';
}

export function renderStaticLab(report) {
  if (!report || !Array.isArray(report.suites) || !report.suites.length) throw new TypeError('The static lab needs saved report.suites.');
  const suites = [...report.suites].sort((a, b) => (a.pitch === 3 ? 0 : 1) - (b.pitch === 3 ? 0 : 1) || a.pitch - b.pitch);
  if (suites.some(suite => !Array.isArray(suite.cases) || !suite.cases.length)) throw new TypeError('Every pitch suite needs saved cases.');
  const links = suites.map(suite => '<a href="#static-p' + idPart(suite.pitch) + '">' + escape(suite.pitch) + '</a>').join(' ');
  const html = '<main class="page" id="static-lab"><h1>Stitch tests</h1>' +
    '<nav class="static-pitches" id="static-pitch-choices" aria-label="Pitch in millimetres">Pitch (mm): ' + links + '</nav>' +
    '<p class="key">Teal: holes. Orange: changed spacing.</p>' + suites.map(renderPitch).join('') + '</main>';
  const css = `
#static-lab .static-pitches a { display:inline-block; margin:0 10px 0 0; color:#076b75; padding:3px 0; }
#static-lab .static-pitch-section { margin:24px 0 40px; scroll-margin-top:16px; }
#static-lab .static-pitch-section > h2 { margin:0 0 18px; padding-bottom:5px; border-bottom:1px solid #ddd; font-size:20px; font-weight:600; }
#static-lab .static-case { margin:10px 0; scroll-margin-top:14px; }
#static-lab .static-case > summary { padding:3px 0; }
#static-lab .static-case[open] { margin-bottom:24px; }
#static-lab .static-case > details { font-size:14px; }
#static-lab .static-plot-narrow { display:none; }
@media (max-width:600px) {
  #static-lab .static-plot-wide { display:none; }
  #static-lab .static-plot-narrow { display:block; }
}
`;
  return {html, css};
}
