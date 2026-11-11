// Discrete SMIL tracks retain the authored frames and holds without a script or raster images.
const number=value=>String(Number(value.toFixed(6)));
const escape=value=>String(value).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');

function cameraFor(frame) {
  if(!frame.camera)return {scale:1,x:0,y:0};
  const scale=750/frame.camera.height;
  return {scale,x:300-frame.camera.center[0]*scale,y:375+frame.camera.center[1]*scale};
}

function primitives(element,camera,canvas) {
  const background=canvas.background;
  const point=p=>[(p[0]-camera.x)/camera.scale,(p[1]-camera.y)/camera.scale];
  const length=value=>number(value/camera.scale);
  const result=[];
  const add=(part,tag,attributes,text='')=>result.push({part,tag,attributes,text});
  const lineAttributes=()=>{
    const a=point(element.a),b=point(element.b);
    return {x1:number(a[0]),y1:number(a[1]),x2:number(b[0]),y2:number(b[1])};
  };
  const circleAttributes=()=>{
    const p=point(element.p);
    return {cx:number(p[0]),cy:number(p[1]),r:length(element.radius)};
  };
  if(element.glow)for(const [index,[width,alpha]] of [[1,.45],[.55,.75]].entries()) {
    const attributes={fill:'none',stroke:element.glow.color,'stroke-width':length(element.glow.width*width/canvas.scale),opacity:number(element.glow.opacity*alpha)};
    if(element.type==='line')add(index,'line',{...lineAttributes(),...attributes});
    else if(element.type==='circle')add(index,'circle',{...circleAttributes(),...attributes});
  }
  if(element.type==='line') {
    if(element.outline) {
      const dx=element.b[0]-element.a[0],dy=element.b[1]-element.a[1],size=Math.hypot(dx,dy);
      if(!size)return result;
      const nx=-dy/size*element.width/2,ny=dx/size*element.width/2;
      const points=[[element.a[0]+nx,element.a[1]+ny],[element.b[0]+nx,element.b[1]+ny],
        [element.b[0]-nx,element.b[1]-ny],[element.a[0]-nx,element.a[1]-ny]];
      add(10,'polygon',{points:points.map(p=>point(p).map(number).join(',')).join(' '),fill:background,
        stroke:element.color,'stroke-width':length(element.outlineWidth),'stroke-dasharray':element.dash?`${length(4)} ${length(4)}`:'none'});
    } else add(10,'line',{...lineAttributes(),stroke:element.color,'stroke-width':length(element.width),
      'stroke-linecap':element.round?'round':'butt','stroke-dasharray':element.dash?`${length(4)} ${length(4)}`:'none'});
  } else if(element.type==='circle')add(10,'circle',{...circleAttributes(),fill:element.color});
  else if(element.type==='polygon')add(10,'polygon',{points:element.points.map(p=>point(p).map(number).join(',')).join(' '),fill:element.color,opacity:number(element.opacity??1)});
  else if(element.type==='text') {
    if(element.textBackground) {
      const box=element.textBox,p=point([box.x,box.y]);
      add(10,'rect',{x:number(p[0]),y:number(p[1]),width:length(box.width),height:length(box.height),fill:element.textBackground});
    }
    const runs=element.textRuns??[{value:element.value,x:element.p[0],y:element.p[1],size:element.size,italic:element.fontItalic}];
    for(const [index,run] of runs.entries()) {
      const p=point([run.x,run.y]);
      add(11+index,'text',{x:number(p[0]),y:number(p[1]),fill:element.color,'font-size':length(run.size),
        'font-family':element.fontFamily,'font-style':run.italic?'italic':'normal','font-weight':element.bold?'bold':'normal','text-anchor':'middle'},run.value);
    }
  } else throw new Error(`Unsupported animated SVG element: ${element.type}`);
  return result;
}

function animation(attribute,values,times,duration,transform=false) {
  const changes=[{time:0,value:values[0]}];
  for(let i=1;i<values.length;i++)if(values[i]!==values[i-1])changes.push({time:times[i],value:values[i]});
  if(changes.length===1)return '';
  changes.push({time:1,value:values.at(-1)});
  const name=transform?'animateTransform':'animate';
  const target=transform?`attributeName="transform" type="${attribute}"`:`attributeName="${attribute}"`;
  return `<${name} ${target} calcMode="discrete" dur="${number(duration)}s" repeatCount="indefinite" keyTimes="${changes.map(change=>number(change.time)).join(';')}" values="${changes.map(change=>escape(change.value)).join(';')}"/>`;
}

function elementTracks(frames) {
  let ordered=[];
  const latest=new Map();
  frames.forEach((frame,frameIndex)=>{
    const positions=new Map(ordered.map((track,index)=>[track,index])),occurrences=new Map();
    const entries=frame.elements.map(element=>{
      const identity=JSON.stringify([element.type,element.kind,element.group,element.id]);
      const occurrence=occurrences.get(identity)??0;
      occurrences.set(identity,occurrence+1);
      const key=identity+':'+occurrence;
      return {key,element,track:latest.get(key)};
    });
    // Reuse the longest ordered sequence. Reordered shapes get a new track so
    // their painter order stays correct even when earlier shapes disappear.
    const tails=[],previous=[];
    entries.forEach((entry,index)=>{
      if(!entry.track)return;
      const position=positions.get(entry.track);
      let low=0,high=tails.length;
      while(low<high){const middle=(low+high)>>1;if(positions.get(entries[tails[middle]].track)<position)low=middle+1;else high=middle;}
      previous[index]=low?tails[low-1]:-1;
      tails[low]=index;
    });
    const retained=new Set();
    for(let index=tails.at(-1);index!==undefined&&index!==-1;index=previous[index])retained.add(index);
    const merged=[];
    let cursor=0;
    entries.forEach((entry,index)=>{
      let track;
      if(retained.has(index)) {
        const position=positions.get(entry.track);
        while(cursor<=position)merged.push(ordered[cursor++]);
        track=entry.track;
      } else {
        track={frames:new Map()};
        merged.push(track);
      }
      track.frames.set(frameIndex,entry.element);
      latest.set(entry.key,track);
    });
    ordered=merged.concat(ordered.slice(cursor));
  });
  return ordered;
}

// Share inherited properties only between adjacent shapes. Opacity stays on each
// shape because group opacity would change the compositing of overlapping marks.
function shapeMarkup(shapes,names=['stroke-width','stroke','fill','stroke-linecap','stroke-dasharray','visibility','font-family','font-size','font-style','font-weight','text-anchor']) {
  let best,savings=0;
  for(const name of names) {
    let saved=0,previous,count=0;
    for(const shape of shapes) {
      const signature=shape.properties.get(name);
      if(signature&&signature===previous)count++;
      else {
        if(count>1)saved+=(count-1)*previous.length-7;
        previous=signature;count=signature?1:0;
      }
    }
    if(count>1)saved+=(count-1)*previous.length-7;
    if(saved>savings){best=name;savings=saved;}
  }
  if(!best)return shapes.map(shape=>{
    const attributes=[],animations=[];
    for(const property of shape.properties.values()) {const [attribute,animation]=JSON.parse(property);attributes.push(attribute);animations.push(animation);}
    return `<${shape.tag} ${attributes.join(' ')}>${escape(shape.text)}${animations.join('')}</${shape.tag}>`;
  }).join('\n');
  const remaining=names.filter(name=>name!==best),groups=[];
  for(let start=0;start<shapes.length;) {
    const signature=shapes[start].properties.get(best);
    let end=start+1;
    while(end<shapes.length&&shapes[end].properties.get(best)===signature)end++;
    const group=shapes.slice(start,end);
    if(signature&&group.length>1) {
      const [attribute,animation]=JSON.parse(signature);
      for(const shape of group)shape.properties.delete(best);
      groups.push(`<g ${attribute}>${animation}\n${shapeMarkup(group,remaining)}\n</g>`);
    } else groups.push(shapeMarkup(group,remaining));
    start=end;
  }
  return groups.join('\n');
}

export function animatedSvg(scene) {
  if(scene.frames.length<2||!scene.frames.every(frame=>Number.isInteger(frame.delay)&&frame.delay>0))throw new Error('Expected an animated scene with positive frame delays');
  const {canvas}=scene;
  const duration=scene.frames.reduce((sum,frame)=>sum+frame.delay,0),times=[];
  let elapsed=0;
  for(const frame of scene.frames){times.push(elapsed/duration);elapsed+=frame.delay;}
  const cameras=scene.frames.map(cameraFor),slots=[];
  for(const elementTrack of elementTracks(scene.frames)) {
    const slot=new Map();
    for(const [frameIndex,element] of elementTrack.frames)for(const primitive of primitives(element,cameras[frameIndex],canvas)) {
      const key=JSON.stringify([primitive.part,primitive.tag,primitive.text]);
      if(!slot.has(key))slot.set(key,{...primitive,frames:new Map()});
      slot.get(key).frames.set(frameIndex,primitive.attributes);
    }
    slots.push(slot);
  }
  const shapes=[];
  for(const slot of slots)for(const track of [...slot.values()].sort((a,b)=>a.part-b.part)) {
    const first=track.frames.values().next().value;
    const visibility=scene.frames.map((_,index)=>track.frames.has(index)?'visible':'hidden');
    const attributes={...first,visibility:visibility[0]};
    const animations={visibility:animation('visibility',visibility,times,duration/100)};
    for(const name of Object.keys(first)) {
      let current=first[name];
      const values=scene.frames.map((_,index)=>{if(track.frames.has(index))current=track.frames.get(index)[name];return current;});
      animations[name]=animation(name,values,times,duration/100);
    }
    shapes.push({tag:track.tag,text:track.text,properties:new Map(Object.entries(attributes).map(([name,value])=>[name,JSON.stringify([`${name}="${escape(value)}"`,animations[name]])]))});
  }
  const translations=cameras.map(camera=>`${number(canvas.x+camera.x*canvas.scale)} ${number(canvas.y+camera.y*canvas.scale)}`),scales=cameras.map(camera=>number(camera.scale*canvas.scale));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}" viewBox="0 0 ${canvas.width} ${canvas.height}" role="img" aria-labelledby="title description">
<title id="title">${escape(scene.title)}</title><desc id="description">Animated analytic illustration of ${escape(scene.source)}. ${number(duration/100)} second loop.</desc>
<metadata id="animation-timing">${JSON.stringify({frameDelays:scene.frames.map(frame=>frame.delay),durationCentiseconds:duration})}</metadata>
<rect width="${canvas.width}" height="${canvas.height}" fill="${canvas.background}"/>
<g transform="translate(${translations[0]})">${animation('translate',translations,times,duration/100,true)}
<g transform="scale(${scales[0]})">${animation('scale',scales,times,duration/100,true)}
${shapeMarkup(shapes)}
</g></g></svg>\n`;
}
