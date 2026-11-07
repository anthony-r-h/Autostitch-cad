const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const neat=n=>Number(n.toFixed(2)).toString();

export function renderSvg(result,opts={}) {
  const width=Math.max(280,opts.width||900),height=opts.height||Math.max(250,Math.min(460,width*.58));
  const showThreads=opts.showThreads!==false,showVirtuals=opts.showVirtuals!==false,showIntervals=!!opts.showIntervals;
  const points=[];
  for(const guide of result.guides)points.push(...guide);
  for(const s of [...result.slits,...result.virtualSlits])points.push(s.a,s.b);
  for(const h of result.holes)points.push([h.center[0]-.25,h.center[1]-.25],[h.center[0]+.25,h.center[1]+.25]);
  for(const m of result.markers)points.push(m.point);
  if(!points.length)points.push([0,0],[1,1]);
  const minX=Math.min(...points.map(p=>p[0])),maxX=Math.max(...points.map(p=>p[0]));
  const minY=Math.min(...points.map(p=>p[1])),maxY=Math.max(...points.map(p=>p[1]));
  const pad=width<450?38:48;
  const drawingHeight=height-24;
  const scale=Math.min((width-2*pad)/Math.max(2,maxX-minX),(drawingHeight-2*pad)/Math.max(2,maxY-minY));
  const centre=[(minX+maxX)/2,(minY+maxY)/2];
  const project=p=>[(p[0]-centre[0])*scale+width/2,(p[1]-centre[1])*scale+drawingHeight/2];
  const tags=[];
  const line=(a,b,cls,more='')=>{const A=project(a),B=project(b);tags.push(`<line x1="${A[0]}" y1="${A[1]}" x2="${B[0]}" y2="${B[1]}" class="${cls}" ${more}/>`);};
  const text=(x,y,value,cls='label',anchor='middle')=>tags.push(`<text x="${x}" y="${y}" class="${cls}" text-anchor="${anchor}">${esc(value)}</text>`);
  for(const guide of result.guides)tags.push(`<polyline points="${guide.map(p=>project(p).join(',')).join(' ')}" class="guide"/>`);
  for(const h of result.helpers)line(h.a,h.b,'helper');
  if(showThreads)for(const t of result.threads)line(t.a,t.b,'thread');
  for(const d of result.intervals.filter(d=>d.protected&&!d.junction))line(d.a,d.b,'protected');
  for(const d of result.intervals.filter(d=>d.adjusted))line(d.a,d.b,'adjustment');
  if(showVirtuals)for(const s of result.virtualSlits)line(s.a,s.b,'virtual');
  if(showIntervals) {
    for(const [i,d] of result.intervals.entries()) {
      const A=project(d.a),B=project(d.b),dx=B[0]-A[0],dy=B[1]-A[1],n=Math.hypot(dx,dy)||1;
      const offset=15+(n<35&&i%2?14:0);
      const x=(A[0]+B[0])/2+dy/n*offset,y=(A[1]+B[1])/2-dx/n*offset;
      text(x,y,(d.junction?'J ':'')+neat(d.length),d.adjusted?'dimension changed':'dimension');
    }
  } else {
    for(const [i,d] of result.intervals.filter(x=>x.adjusted).entries()) {
      const A=project(d.a),B=project(d.b),dx=B[0]-A[0],dy=B[1]-A[1],n=Math.hypot(dx,dy)||1;
      const offset=17+(n<40&&i%2?14:0);
      text((A[0]+B[0])/2+dy/n*offset,(A[1]+B[1])/2-dx/n*offset,neat(d.length),'dimension changed');
    }
  }
  result.markers.forEach((m,i)=>{
    const P=project(m.point),kind=m.type||'endpoint';
    if(kind==='constraint')tags.push(`<path d="M ${P[0]} ${P[1]-5} l 5 5 l -5 5 l -5 -5 Z" class="constraint"/>`);
    else if(kind==='comparison')tags.push(`<circle cx="${P[0]}" cy="${P[1]}" r="3" class="comparison"/>`);
    else tags.push(`<circle cx="${P[0]}" cy="${P[1]}" r="2.2" class="point"/>`);
    let dy=-20,dx=0,anchor='middle';
    if(kind==='comparison'){dy=25;dx=7;anchor='start';}
    if(kind==='constraint'&&result.markers.some(x=>x.type==='comparison')){dx=-7;anchor='end';}
    if(kind==='virtual')dy=i%2===0?-23:26;
    if(m.label==='Start'){anchor='start';dx=0;dy=25;}
    if(m.label==='End'){anchor='end';dx=0;dy=25;}
    if(m.label==='Closure')dy=25;
    const customOffset=Array.isArray(m.labelOffset)&&m.labelOffset.length===2;
    if(customOffset){dx=m.labelOffset[0];dy=m.labelOffset[1];}
    if(m.labelAnchor)anchor=m.labelAnchor;
    const x=Math.max(8,Math.min(width-8,P[0]+dx));
    if(customOffset||kind==='comparison'||(kind==='constraint'&&result.markers.some(x=>x.type==='comparison')))
      tags.push(`<line x1="${P[0]}" y1="${P[1]}" x2="${x}" y2="${P[1]+dy+(dy>0?-11:4)}" class="helper"/>`);
    text(x,P[1]+dy,m.label,'label',anchor);
  });
  // Real cuts stay visible even if an annotation passes over them.
  for(const s of result.slits)line(s.a,s.b,'slit');
  for(const h of result.holes){const C=project(h.center);tags.push(`<circle cx="${C[0]}" cy="${C[1]}" r="${h.diameter/2*scale}" class="hole"/>`);}
  const barMm=scale>60?1:5,barPx=barMm*scale;
  if(barPx<width*.45){const x=width-pad-barPx,y=height-15;tags.push(`<line x1="${x}" y1="${y}" x2="${x+barPx}" y2="${y}" class="scale"/>`);text(x+barPx/2,y-7,barMm+' mm','small');}
  text(12,height-10,'All dimensions in mm','small','start');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="figure-title figure-desc">
  <title id="figure-title">${esc(result.id+' '+result.title)}</title>
  <desc id="figure-desc">${esc(result.question+' Outcome: '+result.status+'. '+result.reason)}</desc>
  <style>
  svg{background:#ffffff;font-family:Arial,sans-serif;color:#24313b}
  .guide{fill:none;stroke:#bdc6ce;stroke-width:1}
  .helper{stroke:#98a2aa;stroke-width:1;stroke-dasharray:2 3}
  .thread{stroke:#5c6670;stroke-width:1.2;fill:none}
  .slit{stroke:#087d87;stroke-width:2.2;stroke-linecap:round}
  .virtual{stroke:#647b8e;stroke-width:1.6;stroke-dasharray:4 3;fill:none;opacity:.9}
  .hole{fill:#ffffff;stroke:#087d87;stroke-width:1.7}
  .adjustment{stroke:#b56812;stroke-width:1.6;stroke-dasharray:4 3}
  .protected{stroke:#477aa3;stroke-width:1.5;stroke-dasharray:1 4}
  .constraint{fill:#ffffff;stroke:#8a4ea7;stroke-width:1.5}
  .comparison{fill:#8a4ea7}
  .point{fill:#70808d}
  .label{font-size:12px;fill:#24313b;paint-order:stroke;stroke:#ffffff;stroke-width:4;stroke-linejoin:round}
  .dimension{font-size:11px;fill:#425467;paint-order:stroke;stroke:#ffffff;stroke-width:4;stroke-linejoin:round}
  .changed{fill:#9b5407}
  .small{font-size:11px;fill:#64717b}
  .scale{stroke:#64717b;stroke-width:1.2}
  </style>
  <rect x="0" y="0" width="${width}" height="${height}" fill="#ffffff"/>
  ${tags.join('\n')}
  </svg>`;
}
