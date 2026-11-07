(function () {
  'use strict';

  const byId = id => document.getElementById(id);
  const escape = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  const state = { pitch: 3, selectedId: Lab.CASES.some(item => item.id === 'R01') ? 'R01' : Lab.CASES[0].id, result: null, svg: '' };

  function drawPlot() {
    if (!state.result) return;
    const width = Math.max(280, Math.round(byId('plot').getBoundingClientRect().width));
    const flat = /^[SF]/.test(state.selectedId) || state.selectedId === 'J01';
    const result = {
      ...state.result,
      title: Presentation.caseLabel(state.result),
      question: Presentation.caseDescription(state.result),
      reason: Presentation.caseSummary(state.result)
    };
    state.svg = Render.renderSvg(result, {
      width,
      height: flat ? 180 : Math.max(250, Math.min(360, width * 0.75)),
      showThreads: byId('show-threads').checked,
      showVirtuals: byId('show-virtuals').checked,
      showIntervals: byId('show-intervals').checked
    });
    byId('plot').innerHTML = state.svg;
  }

  function renderSelected() {
    state.result = Lab.runCase(state.selectedId, state.pitch);
    byId('case-description').textContent = Presentation.caseDescription(state.result);
    byId('case-result').textContent = Presentation.caseSummary(state.result);
    byId('case-measurements').innerHTML = Presentation.caseDetails(state.result).map(text => '<li>' + escape(text) + '</li>').join('');
    drawPlot();
  }

  byId('pitch-select').innerHTML = Lab.PITCHES.map(pitch => '<option value="' + pitch + '">' + pitch + '</option>').join('');
  byId('pitch-select').value = String(state.pitch);
  const groups = [...new Set(Lab.CASES.map(Presentation.caseGroup))];
  byId('case-select').innerHTML = groups.map(group => '<optgroup label="' + escape(group) + '">' +
    Lab.CASES.filter(item => Presentation.caseGroup(item) === group).map(item => '<option value="' + escape(item.id) + '">' +
      escape(item.id + ': ' + Presentation.caseLabel(item)) + '</option>').join('') + '</optgroup>').join('');
  byId('case-select').value = state.selectedId;
  byId('pitch-select').addEventListener('change', () => {
    state.pitch = Number(byId('pitch-select').value);
    renderSelected();
  });
  byId('case-select').addEventListener('change', () => {
    state.selectedId = byId('case-select').value;
    renderSelected();
  });
  for (const id of ['show-threads', 'show-virtuals', 'show-intervals']) byId(id).addEventListener('change', drawPlot);
  byId('export-svg').addEventListener('click', () => {
    if (!state.svg) return;
    const url = URL.createObjectURL(new Blob([state.svg], { type: 'image/svg+xml;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'stitch-' + state.selectedId.toLowerCase() + '-' + String(state.pitch).replace('.', '_') + 'mm.svg';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  renderSelected();
  byId('app').hidden = false;
  drawPlot();
  byId('static-lab').hidden = true;

  let redrawPending = false;
  let lastWidth = byId('plot').getBoundingClientRect().width;
  function scheduleResize() {
    const width = byId('plot').getBoundingClientRect().width;
    if (Math.abs(width - lastWidth) < 1 || redrawPending) return;
    lastWidth = width;
    redrawPending = true;
    requestAnimationFrame(() => { redrawPending = false; drawPlot(); });
  }
  if (typeof ResizeObserver === 'function') new ResizeObserver(scheduleResize).observe(byId('plot'));
  else window.addEventListener('resize', scheduleResize);
})();
