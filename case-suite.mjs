import * as Geo from './geometry.mjs';

export const PITCHES = [2.7, 3, 3.38, 3.85];
export const AXIOMS = [
  ['Space', 'Geometry is planar and measured in millimetres. The admitted curves are circular arcs.'],
  ['Route', 'A route has a start, direction, construction order, and an explicit open or closed state. Accepted earlier geometry stays fixed.'],
  ['Slit', 'Every ordinary slit is 1.5 mm long and leans 40° relative to its local tangent. Changing pitch does not change the slit.'],
  ['Pitch', 'Pitch is the direct distance between consecutive ordinary slit centres. Round-hole junction distances are reported separately.'],
  ['Round hole', 'Every round hole has diameter 0.5 mm.'],
  ['Constraint', 'A centred-gap landmark requires both nominal centre-to-centre pitch across it and symmetric placement along the guide. Corrections occur outside that protected gap.'],
  ['Corrections', 'Minimize the number of changed intervals subject to the current anchors, protected intervals, and construction order. There is no fixed correction-count cap. Each change is limited to ±10%; use the latest eligible intervals.'],
  ['Interior features', 'An interior landmark or junction supplies local targets and protected geometry. Solve the approach, commit the feature, then continue from its exit.'],
  ['Junction', 'Apply the prescribed construction directly. A straight continuation retains one slit; an admitted turning construction substitutes one round hole for its virtual slits.'],
  ['Thread', 'Thread is a display line between the selected slit tips and round-hole centres. It has no thickness or physical behaviour.'],
  ['Scope', 'Material boundaries, edge clearance, leather behaviour, and multi-tooth tool placement are excluded. Ordinary spacing must pass the slit-separation guard.'],
  ['Failure', 'If an admitted interval count or prescribed construction does not exist, return invalid and retain the accepted prefix. Do not search for another rule or move earlier geometry.']
];
export const HYPOTHESES = [
  'For straight corners, prescribe one fixed pair of slit tips and solve their common point directly. Reject the construction when its required neighbouring centres do not fit on the supplied finite arms.',
  'For circular arcs, place ordinary centres by chord pitch and orient each slit using its own tangent. Centre a landmark along the arc, preserving the nominal chord across it.',
  'For curved junctions, this first recipe fixes both virtual centres at the actual shared guide endpoint. It does not guarantee the display-line angle of the straight tip-aligned construction.',
  'Corrections are equal within each newly solved span and occupy its latest eligible intervals. This deterministic placement is conditional on the chosen anchors, protected intervals, and committed order.'
];

export const CASES = [
  {id:'S01',group:'Straight runs',title:'Exact straight run',kind:'straight',length:30,expected:'exact',question:'Do the two fixed endpoint centres fit at nominal pitch?'},
  {id:'S02',group:'Straight runs',title:'Minimum end corrections',kind:'straight',length:30.5,expected:'adjusted',question:'Does the smallest correction set reach the fixed end?'},
  {id:'S04',group:'Straight runs',title:'Protect the final ordinary interval',kind:'straight',length:30.3,protectedEnd:1,expected:'adjusted',question:'Does protecting the final interval move the correction to the second-last interval?'},
  {id:'F01',group:'Interior landmarks',title:'Naturally centred landmark',kind:'fixed-gap',length:30,gaps:[16.5],expected:'exact',question:'Does a compatible landmark preserve the ordinary phase on both sides?'},
  {id:'F02',group:'Interior landmarks',title:'Landmark requires local corrections',kind:'fixed-gap',length:30,gaps:[16.25],expected:'adjusted',question:'Can the approach and remainder reach their targets while the centred interval stays nominal?'},
  {id:'F03',group:'Interior landmarks',title:'Two landmarks solved in order',kind:'fixed-gap',length:45,gaps:[16.25,31.75],expected:'adjusted',question:'Do three successive spans satisfy two fixed landmarks with four corrections in total?'},
  {id:'F05',group:'Interior landmarks',title:'No fit between two landmark pairs',kind:'fixed-gap',length:30,gaps:[10,20],expected:'invalid',question:'Does an inadmissible middle span stop construction without changing the accepted first landmark?'},
  {id:'J01',group:'Junctions',title:'Straight continuation shares one slit',kind:'continuation',expected:'exact',question:'Do coincident terminal slits become one real slit on a fixed straight guide?'},
  {id:'J02',group:'Corner angles',title:'90° corner',kind:'corner',turn:90,inLength:10,outLength:10,expected:'exact',question:'Does the prescribed slit-tip construction preserve the reference corner symmetry?',exploratory:true},
  {id:'J03',group:'Corner angles',title:'135° corner',kind:'corner',turn:45,inLength:10,outLength:10,expected:'exact',question:'Does the same direct construction fit the supplied wider corner?',exploratory:true},
  {id:'J04',group:'Corner angles',title:'45° corner',kind:'corner',turn:135,inLength:10,outLength:10,expected:'exact',question:'Does the same direct construction fit the supplied tighter corner?',exploratory:true},
  {id:'J05',group:'Junctions',title:'Incoming arm is too short',kind:'corner',turn:90,inLength:1,outLength:10,expected:'invalid',question:'Does the rule reject a corner whose required incoming neighbour lies outside the one-millimetre arm?'},
  {id:'J06',group:'Junctions',title:'Ordered spans use actual corner anchors',kind:'ordered-corner',turn:90,inLength:30,outLength:30,expected:'adjusted',question:'Can a reserved corner determine both approach and exit targets while earlier geometry remains fixed?',exploratory:true},
  {id:'N01',group:'Junctions',title:'Pocket edge close to a corner',kind:'near-corner',turn:90,inLength:26,outLength:12,edgeOffset:6.5,expected:'adjusted',question:'Can the pocket-edge crossing and the nearby corner both keep their required holes?'},
  {id:'A01',group:'Curves',title:'Arc with both endpoint centres fixed',kind:'arc',radius:10,sweep:90,expected:'adjusted',question:'Can chord-pitch corrections reach the exact arc endpoint?'},
  {id:'A02',group:'Curves',title:'Arc with a protected centred interval',kind:'arc-gap',radius:10,sweep:90,gapAngle:45,expected:'adjusted',question:'Can ordered fits reach the two sides of a fixed centred chord and the fixed arc end?'},
  {id:'A03',group:'Curves',title:'Fixed-endpoint arc-to-line junction',kind:'curved-junction',second:'line',radius:10,secondRadius:10,sweep:60,turn:90,expected:'exact',question:'What display-line angle follows from keeping both virtual centres at the shared arc and line endpoint?',exploratory:true},
  {id:'A04',group:'Curves',title:'Fixed-endpoint arc-to-arc junction',kind:'curved-junction',second:'arc',radius:10,secondRadius:8,sweep:60,turn:90,expected:'exact',question:'How does the fixed shared endpoint behave when both adjoining guides are curved?',exploratory:true},
  {id:'A05',group:'Curves',title:'Straight into a curve',kind:'line-arc',length:18,radius:10,sweep:90,expected:'exact',question:'With one slit fixed at the smooth join and free outer margins, does nominal spacing continue from the line into the arc?'},
  {id:'L01',group:'Closed loops',title:'Exact closure after a committed prefix',kind:'circle',radius:3/(2*Math.sin(Math.PI/20)),builtSweep:240,expected:'exact',question:'Can the remaining tail close a twenty-opening circle without revising its committed prefix?'},
  {id:'L02',group:'Closed loops',title:'Closure corrections before a protected last chord',kind:'circle',radius:10,builtSweep:240,expected:'adjusted',question:'Can the remaining tail close while preserving the committed prefix and final nominal chord?'},
  {id:'R01',group:'Closed loops',title:'Closed rectangle',kind:'rectangle',width:31.5,height:22.5,expected:'adjusted',question:'Does the last side return to the starting corner without moving earlier holes?'}
];

const TAU = 2*Math.PI;
const EPS = 1e-6;
const add = (a,b) => [a[0]+b[0],a[1]+b[1]];
const sub = (a,b) => [a[0]-b[0],a[1]-b[1]];
const mul = (a,k) => [a[0]*k,a[1]*k];
const dot = (a,b) => a[0]*b[0]+a[1]*b[1];
const cross = (a,b) => a[0]*b[1]-a[1]*b[0];
const dist = (a,b) => Math.hypot(a[0]-b[0],a[1]-b[1]);
const rad = degrees => degrees*Math.PI/180;
const deg = radians => radians*180/Math.PI;
const fmt = (value,digits=3) => Number(value).toFixed(digits);
const nominalAngle = (radius,pitch) => 2*Math.asin(pitch/(2*radius));
const angleBetween = (a,b) => deg(Math.atan2(cross(a,b),dot(a,b)));
const options = extra => ({toleranceFraction:.1,protectedStart:0,protectedEnd:0,corrections:true,...extra});
const check = (out,name,passed) => out.checks.push({name,passed:!!passed});
const pointNear = (a,b) => dist(a,b)<EPS;
const prefixSnapshot = path => path.map(opening=>[...opening.center]);
const prefixUnchanged = (path,prefix) => prefix.every((point,index)=>pointNear(path[index].center,point));

function result(spec,pitch) {
  return {id:spec.id,title:spec.title,group:spec.group,question:spec.question,expected:spec.expected,
    exploratory:!!spec.exploratory,pitch,status:'exact',reason:'',steps:[],guides:[],slits:[],virtualSlits:[],holes:[],
    threads:[],intervals:[],markers:[],helpers:[],metrics:[],notes:[],checks:[]};
}
function markSlit(out,center,tangent,kind='regular') {
  const slit={...Geo.makeSlit(center,tangent),id:'s'+out.slits.length,kind,tangent};
  out.slits.push(slit);return slit;
}
function addInterval(out,a,b,extra={}) {
  const item={a:a.center,b:b.center,length:dist(a.center,b.center),adjusted:false,protected:false,
    junction:!!a.diameter||!!b.diameter,...extra};
  out.intervals.push(item);
  out.threads.push({a:a.diameter?a.center:a.b,b:b.diameter?b.center:b.a});
  return item;
}
function recordStep(out,label,fit,anchors={}) {
  const item={label,status:fit.status,intervalCount:fit.intervalCount??0,correctionCount:fit.correctionCount??0,
    protectedStart:fit.protectedStart??0,protectedEnd:fit.protectedEnd??0,reason:fit.reason||'',
    formula:fit.chosenFormula||fit.formula||'Fixed construction',...anchors};
  if(fit.feasibleCountRange)item.formula+='; admissible n: '+fit.feasibleCountRange.min+' to '+fit.feasibleCountRange.max;
  out.steps.push(item);return out.steps.length-1;
}
function fixedStep(out,label,count,reason,formula,anchors={},protection={}) {
  return recordStep(out,label,{status:'exact',intervalCount:count,correctionCount:0,reason,formula,...protection},anchors);
}
function reject(out,label,reason,anchors={},formula='Admissibility guard') {
  out.status='invalid';out.reason=reason;
  recordStep(out,label,{status:'invalid',reason,formula},anchors);return false;
}
function fitChecks(out,fit,label) {
  const first=fit.intervalCount-fit.protectedEnd-fit.correctionCount;
  check(out,label+': corrections use the latest eligible intervals',
    fit.adjustedIndices.length===fit.correctionCount&&fit.adjustedIndices.every((index,k)=>index===first+k&&index>=fit.protectedStart));
  check(out,label+': protected planned intervals remain nominal',fit.intervals.every((value,index)=>
    (index>=fit.protectedStart&&index<fit.intervalCount-fit.protectedEnd)||Math.abs(value-out.pitch)<EPS));
}
function appendFit(out,path,fit,label,from,to,pointAt,tangentAt,circular=false) {
  const prefix=prefixSnapshot(path);
  const stepIndex=recordStep(out,label,fit,{start:pointAt(from),target:pointAt(to)});
  if(fit.status==='invalid') {
    out.status='invalid';out.reason=label+': '+fit.reason;
    check(out,label+': the accepted prefix survives rejection',prefixUnchanged(path,prefix));return false;
  }
  check(out,label+': starts at the committed upstream anchor',pointNear(path[path.length-1].center,pointAt(from)));
  let station=from;
  const changed=new Set(fit.adjustedIndices);
  const firstInterval=out.intervals.length;
  for(let i=0;i<fit.intervalCount;i++) {
    station+=(circular?fit.angularSteps:fit.intervals)[i];
    const next=markSlit(out,pointAt(station),tangentAt(station));
    addInterval(out,path[path.length-1],next,{adjusted:changed.has(i),
      protected:i<fit.protectedStart||i>=fit.intervalCount-fit.protectedEnd,
      plannedLength:fit.intervals[i],stepIndex});
    path.push(next);
  }
  if(fit.status==='adjusted')out.status='adjusted';
  fitChecks(out,fit,label);
  check(out,label+': reaches its fixed downstream anchor',pointNear(path[path.length-1].center,pointAt(to)));
  check(out,label+': measured intervals match the direct fit',out.intervals.slice(firstInterval).every(item=>Math.abs(item.length-item.plannedLength)<EPS));
  check(out,label+': earlier openings remain fixed',prefixUnchanged(path,prefix));
  return true;
}
function appendProtectedGap(out,path,label,right,tangent,reason,formula) {
  const previous=path[path.length-1],next=markSlit(out,right,tangent);
  const stepIndex=fixedStep(out,label,1,reason,formula,{start:previous.center,target:right},{protectedEnd:1});
  addInterval(out,previous,next,{protected:true,plannedLength:out.pitch,stepIndex});path.push(next);
  check(out,label+': the reserved interval measures one pitch',Math.abs(dist(previous.center,next.center)-out.pitch)<EPS);
  return [previous,next];
}
function arcPoint(center,radius,angle) {
  return [center[0]+radius*Math.cos(angle),center[1]+radius*Math.sin(angle)];
}
function arcGuide(center,radius,start,sweep) {
  return Array.from({length:101},(_,i)=>arcPoint(center,radius,start+sweep*i/100));
}
function fixedEndpoints(out,start,end) {
  out.markers.push({point:start,label:'Start',type:'endpoint'},{point:end,label:'End',type:'endpoint'});
}

function straightCase(spec,pitch,out) {
  const pointAt=x=>[x,0],path=[markSlit(out,[0,0],0)];
  out.guides.push([[0,0],[spec.length,0]]);fixedEndpoints(out,[0,0],[spec.length,0]);
  const fit=Geo.fitSpan(spec.length,pitch,options({protectedEnd:spec.protectedEnd||0}));
  appendFit(out,path,fit,'Reach the fixed end',0,spec.length,pointAt,()=>0);
  out.reason=fit.reason;
  out.metrics.push(['Guide length',fmt(spec.length)+' mm'],['Endpoint treatment','Both centres fixed'],['Protected final intervals',String(spec.protectedEnd||0)]);
  if(spec.protectedEnd)out.notes.push('Fixture policy: the final '+spec.protectedEnd+' ordinary interval'+(spec.protectedEnd===1?' is':'s are')+' reserved before solving the span.');
}

function gapCase(spec,pitch,out) {
  const L=spec.length,direction=spec.reverse?-1:1,tangent=spec.reverse?Math.PI:0;
  const pointAt=station=>[spec.reverse?L-station:station,0];
  const ordered=spec.reverse?[...spec.gaps].reverse():spec.gaps;
  const path=[markSlit(out,pointAt(0),tangent)];
  let current=0;
  out.guides.push([[0,0],[L,0]]);fixedEndpoints(out,pointAt(0),pointAt(L));
  spec.gaps.forEach((gap,index)=>out.markers.push({point:[gap,0],label:'Gap '+(index+1),type:'constraint'}));
  out.metrics.push(['Guide length',fmt(L)+' mm'],['Traversal',direction>0?'Left to right':'Right to left'],['Endpoint treatment','Both centres fixed']);
  for(let index=0;index<ordered.length;index++) {
    const physical=ordered[index],centre=spec.reverse?L-physical:physical,left=centre-pitch/2,right=centre+pitch/2;
    const label='Reach landmark '+(index+1)+' entry';
    if(left<current-EPS||right>L+EPS) {
      reject(out,label,'The next nominal centred interval does not fit in the remaining ordered guide.',{start:pointAt(current),target:pointAt(left)});break;
    }
    const fit=Geo.fitSpan(Math.max(0,left-current),pitch,options());
    if(!appendFit(out,path,fit,label,current,left,pointAt,()=>tangent))break;
    const pair=appendProtectedGap(out,path,'Commit landmark '+(index+1),pointAt(right),tangent,
      'The landmark fixes this nominal interval; later spans cannot change it.','Entry = c - p/2; exit = c + p/2');
    const residual=(pair[0].center[0]+pair[1].center[0])/2-physical;
    check(out,'Landmark '+(index+1)+': measured neighbours centre the physical landmark',Math.abs(residual)<EPS);
    out.metrics.push(['Landmark '+(index+1)+' centring residual',fmt(residual,6)+' mm']);
    current=right;
  }
  if(out.status!=='invalid') {
    const fit=Geo.fitSpan(L-current,pitch,options());
    appendFit(out,path,fit,'Reach the fixed end',current,L,pointAt,()=>tangent);
  }
  if(out.status==='invalid')out.notes.push('Only the accepted prefix is drawn as real cuts. The failed span and all downstream features remain uncommitted.');
  else out.reason='Each span reaches its next fixed target in traversal order. Every centred interval stays nominal and earlier openings remain fixed.';
  out.notes.push('An interior landmark creates two local anchors. Correction minimization applies separately to each newly solved span with those anchors fixed.');
}

function continuationCase(spec,pitch,out) {
  out.guides.push([[-10,0],[10,0]]);
  const count=Math.floor((10+EPS)/pitch),positions=Array.from({length:2*count+1},(_,i)=>(i-count)*pitch);
  const path=positions.map(x=>markSlit(out,[x,0],0));
  out.virtualSlits=[Geo.makeSlit([0,0],0),Geo.makeSlit([0,0],0)];
  for(let i=1;i<path.length;i++)addInterval(out,path[i-1],path[i],{plannedLength:pitch});
  fixedStep(out,'Commit the shared straight phase',path.length-1,'Both terminal definitions refer to the same real slit at zero.',
    'Centres = k p inside the fixed [-10, 10] mm guide',{start:path[0].center,target:path[path.length-1].center});
  out.status='exact';out.reason='The coincident terminal slits retain one ordinary slit. All ordinary centres share the zero phase.';
  out.markers.push({point:[0,0],label:'Shared slit',type:'constraint'});
  out.metrics.push(['Guide extent','-10 to +10 mm'],['Endpoint treatment','Outer margins free'],['Real openings at the join',String(path.filter(cut=>Math.abs(cut.center[0])<EPS).length)]);
  check(out,'The shared centre contains exactly one real slit',path.filter(cut=>pointNear(cut.center,[0,0])).length===1);
  check(out,'The prescribed terminal slits coincide',Geo.classifySlits(...out.virtualSlits).kind==='coincident');
  check(out,'Ordinary centres stay inside the fixed guide',path.every(cut=>Math.abs(cut.center[0])<=10+EPS));
}

function cornerSetup(spec,pitch,out) {
  const c=Geo.solveCorner(spec.turn,pitch);
  out.guides.push([mul(c.tIn,-spec.inLength),[0,0]],[[0,0],mul(c.tOut,spec.outLength)]);
  out.virtualSlits=c.virtualSlits||[];
  out.markers.push({point:[0,0],label:'Guide corner',type:'endpoint'});
  out.metrics.push(['Guide turn',spec.turn+'°'],['Included angle',(180-Math.abs(spec.turn))+'°'],['Incoming / outgoing arm',spec.inLength+' / '+spec.outLength+' mm']);
  const fits=c.status==='resolved'&&c.joint?.kind==='hole'&&
    dot(c.previous,c.tIn)>=-spec.inLength-EPS&&dot(c.previous,c.tIn)<=EPS&&
    dot(c.next,c.tOut)>=-EPS&&dot(c.next,c.tOut)<=spec.outLength+EPS;
  if(!fits) {
    const reason=c.status!=='resolved'?c.reason:'The prescribed neighbouring ordinary centre lies outside a supplied finite guide arm.';
    reject(out,'Check the prescribed corner',reason,{start:mul(c.tIn,-spec.inLength),target:mul(c.tOut,spec.outLength)},'Required I and O must lie inside the finite arms');
    if(c.previous)out.markers.push({point:c.previous,label:'Required incoming centre',type:'comparison'});
    check(out,'An inadmissible corner emits no real cuts',out.slits.length===0&&out.holes.length===0);
    out.notes.push('The finite guide lengths stay fixed. The rule rejects this selected construction instead of extending a guide or selecting another overlap treatment.');
    return null;
  }
  return c;
}
function verifyCornerVectors(out,c,incoming,hole,outgoing) {
  const uIn=[Math.cos(c.previousSlit.angle),Math.sin(c.previousSlit.angle)];
  const uOut=[Math.cos(c.nextSlit.angle),Math.sin(c.nextSlit.angle)];
  const expectedIn=sub(mul(c.tIn,out.pitch),mul(uIn,Geo.DEFAULT_PROFILE.slitLength));
  const expectedOut=sub(mul(c.tOut,out.pitch),mul(uOut,Geo.DEFAULT_PROFILE.slitLength));
  const measuredIn=sub(hole.center,incoming.b),measuredOut=sub(outgoing.a,hole.center);
  check(out,'Incoming display vector matches p t - slitLength u',pointNear(measuredIn,expectedIn));
  check(out,'Outgoing display vector matches p t - slitLength u',pointNear(measuredOut,expectedOut));
  check(out,'The prescribed corner has equal incoming and outgoing display lengths',Math.abs(Math.hypot(...measuredIn)-Math.hypot(...measuredOut))<EPS);
  out.metrics.push(['Display-line turn',fmt(angleBetween(measuredIn,measuredOut))+'°'],['Entering / leaving display length',fmt(Math.hypot(...measuredIn))+' / '+fmt(Math.hypot(...measuredOut))+' mm']);
}
function cornerCase(spec,pitch,out) {
  const c=cornerSetup(spec,pitch,out);if(!c)return;
  fixedStep(out,'Reserve the prescribed corner',0,'The fixed slit-tip construction determines the hole and both neighbouring ordinary centres.',
    'J = Ci - (slitLength/2) ui = Co + (slitLength/2) uo',{target:c.joint.hole.center});
  const countIn=Math.floor((spec.inLength+dot(c.virtualCentres[0],c.tIn)+EPS)/pitch);
  const countOut=Math.floor((spec.outLength-dot(c.virtualCentres[1],c.tOut)+EPS)/pitch);
  const incoming=Array.from({length:countIn},(_,i)=>markSlit(out,sub(c.virtualCentres[0],mul(c.tIn,(countIn-i)*pitch)),0));
  const outgoing=Array.from({length:countOut},(_,i)=>markSlit(out,add(c.virtualCentres[1],mul(c.tOut,(i+1)*pitch)),rad(spec.turn)));
  const hole={...c.joint.hole};out.holes.push(hole);
  const path=[...incoming,hole,...outgoing];
  for(let i=1;i<path.length;i++)addInterval(out,path[i-1],path[i],{protected:!!path[i-1].diameter||!!path[i].diameter});
  fixedStep(out,'Commit the incoming ordinary phase',incoming.length-1,'Use nominal intervals up to the prescribed incoming neighbour.','Centres = Ci - k p tin',{start:incoming[0].center,target:incoming[incoming.length-1].center});
  fixedStep(out,'Commit the fixed junction',2,'These two centre distances belong to the prescribed junction, not the ordinary pitch fit.','I to J to O',{start:incoming[incoming.length-1].center,target:outgoing[0].center},{protectedEnd:2});
  fixedStep(out,'Commit the outgoing ordinary phase',outgoing.length-1,'Continue from the prescribed outgoing neighbour at nominal pitch.','Centres = Co + k p tout',{start:outgoing[0].center,target:outgoing[outgoing.length-1].center});
  out.reason='The prescribed corner fits the finite arms. Its ordinary phases retain nominal pitch and its round hole preserves the paired display vectors.';
  out.metrics.push(['Endpoint treatment','Outer margins free']);
  check(out,'Ordinary centres stay inside the finite arms',incoming.every(s=>dot(s.center,c.tIn)>=-spec.inLength-EPS&&dot(s.center,c.tIn)<=EPS)&&outgoing.every(s=>dot(s.center,c.tOut)>=-EPS&&dot(s.center,c.tOut)<=spec.outLength+EPS));
  verifyCornerVectors(out,c,incoming[incoming.length-1],hole,outgoing[0]);
  out.notes.push('The virtual terminal slits are construction geometry. They are replaced by the one real round hole.');
}
function orderedCornerCase(spec,pitch,out) {
  const c=cornerSetup(spec,pitch,out);if(!c)return;
  const begin=mul(c.tIn,-spec.inLength),end=mul(c.tOut,spec.outLength);
  fixedEndpoints(out,begin,end);
  fixedStep(out,'Reserve the downstream corner',0,'Compute the fixed round hole and the incoming I and outgoing O centres before fitting either leg.',
    'I = Ci - p tin; O = Co + p tout',{target:c.joint.hole.center});
  const path=[markSlit(out,begin,0)];
  const incomingLength=spec.inLength+dot(c.previous,c.tIn);
  const incomingPoint=s=>add(begin,mul(c.tIn,s));
  const approach=Geo.fitSpan(incomingLength,pitch,options({protectedEnd:1}));
  if(!appendFit(out,path,approach,'Fit the approach to I',0,incomingLength,incomingPoint,()=>0))return;
  const incoming=path[path.length-1],hole={...c.joint.hole},outgoing=markSlit(out,c.next,rad(spec.turn));
  out.holes.push(hole);
  const junctionStep=fixedStep(out,'Commit the reserved junction',2,'Keep I, the round hole, and O fixed. These protected junction intervals are not ordinary pitch corrections.',
    'Emit I to J to O from the reserved construction',{start:incoming.center,target:outgoing.center},{protectedEnd:2});
  addInterval(out,incoming,hole,{protected:true,stepIndex:junctionStep});
  addInterval(out,hole,outgoing,{protected:true,stepIndex:junctionStep});path.push(hole,outgoing);
  const prefix=prefixSnapshot(path);
  const outgoingLength=spec.outLength-dot(c.next,c.tOut),outgoingPoint=s=>add(c.next,mul(c.tOut,s));
  const departure=Geo.fitSpan(outgoingLength,pitch,options());
  appendFit(out,path,departure,'Fit from O to the fixed end',0,outgoingLength,outgoingPoint,()=>rad(spec.turn));
  check(out,'Solving the outgoing leg preserves the committed approach and junction',prefixUnchanged(path,prefix));
  verifyCornerVectors(out,c,incoming,hole,outgoing);
  out.metrics.push(['Endpoint treatment','Both outer centres fixed'],['Approach target I',c.previous.map(x=>fmt(x)).join(', ')+' mm'],['Outgoing anchor O',c.next.map(x=>fmt(x)).join(', ')+' mm']);
  out.notes.push('Chosen fixture policy: the final ordinary interval before I is protected. Corrections on the approach must stop before that interval.');
  out.notes.push('The protected I-to-hole and hole-to-O intervals are fixed junction geometry and are reported separately from ordinary pitch.');
  if(out.status!=='invalid')out.reason='The reserved corner supplies real downstream anchors. Both leg fits reach their fixed targets while the approach, protected ordinary interval, and junction remain unchanged.';
}

function nearCornerCase(spec,pitch,out) {
  const c=cornerSetup(spec,pitch,out);if(!c)return;
  const begin=mul(c.tIn,-spec.inLength),end=mul(c.tOut,spec.outLength);
  const centre=-spec.edgeOffset,left=centre-pitch/2,right=centre+pitch/2;
  const incomingStation=dot(c.previous,c.tIn),bridgeLength=incomingStation-right;
  const arithmeticTolerance=64*Number.EPSILON*Math.max(1,spec.inLength,pitch,spec.edgeOffset);
  const pointAt=s=>mul(c.tIn,s);
  fixedEndpoints(out,begin,end);
  out.markers.push({point:pointAt(centre),label:'Pocket edge',type:'constraint',labelOffset:[-10,-30],labelAnchor:'end'});
  out.helpers.push({a:[centre,-1.3],b:[centre,1.3]});
  out.metrics.push(['Pocket edge before the corner',fmt(spec.edgeOffset)+' mm'],['Gap exit to corner entry',fmt(bridgeLength,6)+' mm'],['Endpoint treatment','Both outer centres fixed']);
  if(left < -spec.inLength-arithmeticTolerance || right > arithmeticTolerance) {
    reject(out,'Reserve the pocket-edge crossing','The nominal centred crossing does not fit inside the incoming guide.');return;
  }
  if(bridgeLength < -arithmeticTolerance) {
    reject(out,'Reserve the crossing and corner','The pocket-edge exit lies beyond the reserved corner entry. The two features overlap in construction order.',
      {start:pointAt(right),target:c.previous},'Crossing exit must not pass corner entry');
    check(out,'Overlapping reservations emit no real cuts',out.slits.length===0&&out.holes.length===0);return;
  }
  fixedStep(out,'Reserve the crossing and corner',0,'The nominal centred gap and the corner anchors are fixed before fitting the approach.',
    'Gap = [c - p/2, c + p/2]; corner = I, J, O',{start:pointAt(left),target:c.next});
  const path=[markSlit(out,begin,0)];
  const approach=Geo.fitSpan(left+spec.inLength,pitch,options());
  if(!appendFit(out,path,approach,'Reach the pocket-edge entry',-spec.inLength,left,pointAt,()=>0))return;
  const pair=appendProtectedGap(out,path,'Cross the pocket edge',pointAt(right),0,
    'The two centres remain equally far from the edge and one nominal pitch apart.','Entry = c - p/2; exit = c + p/2');
  check(out,'Pocket-edge neighbours are centred on the fixed edge',Math.abs((pair[0].center[0]+pair[1].center[0])/2-centre)<EPS);
  const beforeCorner=prefixSnapshot(path);
  if(Math.abs(bridgeLength)<=arithmeticTolerance) {
    fixedStep(out,'Share the crossing exit and corner entry',0,'The two reservations refer to the same ordinary slit.',
      'Crossing exit = I',{start:pair[1].center,target:c.previous});
    check(out,'Coincident feature anchors retain one real slit',out.slits.filter(s=>pointNear(s.center,c.previous)).length===1);
  } else {
    const bridge=Geo.fitSpan(bridgeLength,pitch,options());
    if(!appendFit(out,path,bridge,'Reach the nearby corner entry',right,incomingStation,pointAt,()=>0))return;
  }
  const incoming=path[path.length-1],hole={...c.joint.hole},outgoing=markSlit(out,c.next,rad(spec.turn));
  out.holes.push(hole);
  const junctionStep=fixedStep(out,'Commit the reserved corner',2,'The round hole and both neighbouring slit centres remain at their prescribed positions.',
    'I to J to O',{start:incoming.center,target:outgoing.center},{protectedEnd:2});
  addInterval(out,incoming,hole,{protected:true,stepIndex:junctionStep});
  addInterval(out,hole,outgoing,{protected:true,stepIndex:junctionStep});path.push(hole,outgoing);
  check(out,'The corner preserves the accepted crossing',prefixUnchanged(path,beforeCorner));
  const departureLength=spec.outLength-dot(c.next,c.tOut),departurePoint=s=>add(c.next,mul(c.tOut,s));
  const departure=Geo.fitSpan(departureLength,pitch,options());
  appendFit(out,path,departure,'Reach the fixed outgoing end',0,departureLength,departurePoint,()=>rad(spec.turn));
  check(out,'The outgoing fit preserves the accepted crossing',prefixUnchanged(path,beforeCorner));
  verifyCornerVectors(out,c,incoming,hole,outgoing);
  if(out.status!=='invalid')out.reason='The pocket-edge gap stays nominal and centred. Each remaining span reaches the reserved corner or fixed end in order.';
}

function placeCorner(c,vertex,rotation) {
  const turn=point=>[point[0]*Math.cos(rotation)-point[1]*Math.sin(rotation),point[0]*Math.sin(rotation)+point[1]*Math.cos(rotation)];
  const point=local=>add(vertex,turn(local));
  const slit=local=>({...local,center:point(local.center),a:point(local.a),b:point(local.b),angle:local.angle+rotation});
  return {...c,tIn:turn(c.tIn),tOut:turn(c.tOut),previous:point(c.previous),next:point(c.next),
    previousSlit:slit(c.previousSlit),nextSlit:slit(c.nextSlit),virtualSlits:c.virtualSlits.map(slit),
    virtualCentres:c.virtualCentres.map(point),guideVertex:vertex,
    joint:{...c.joint,hole:{...c.joint.hole,center:point(c.joint.hole.center)}}};
}

function rectangleCase(spec,pitch,out) {
  const W=spec.width,H=spec.height,vertices=[[0,0],[W,0],[W,H],[0,H]];
  out.guides.push([...vertices,vertices[0]]);
  const local=Geo.solveCorner(90,pitch);
  if(local.status!=='resolved'||local.joint?.kind!=='hole') {
    reject(out,'Reserve the rectangle corners',local.reason||'The prescribed right-angle construction does not resolve.');return;
  }
  const corners=vertices.map((vertex,index)=>placeCorner(local,vertex,(index-1)*Math.PI/2));
  out.virtualSlits=corners.flatMap(corner=>corner.virtualSlits);
  fixedStep(out,'Reserve the four corners',0,'The starting round hole and all corner neighbours are fixed before the first side.',
    'Rotate and translate the same prescribed 90-degree construction',{target:corners[0].joint.hole.center});
  const firstHole={...corners[0].joint.hole},firstOutgoing=markSlit(out,corners[0].next,0);
  out.holes.push(firstHole);
  const path=[firstHole,firstOutgoing];
  const openingStep=fixedStep(out,'Leave the starting corner',1,'The first outgoing neighbour is part of the reserved starting corner.',
    'J0 to O0',{start:firstHole.center,target:firstOutgoing.center},{protectedEnd:1});
  addInterval(out,firstHole,firstOutgoing,{protected:true,stepIndex:openingStep});
  out.markers.push({point:firstHole.center,label:'Start / finish',type:'constraint',labelOffset:[8,-18],labelAnchor:'start'});
  out.metrics.push(['Rectangle dimensions',fmt(W)+' × '+fmt(H)+' mm'],['Traversal','Clockwise from the top-left corner'],['Corner treatment','Four prescribed round holes']);
  for(let side=0;side<4;side++) {
    const nextIndex=(side+1)%4,c=corners[nextIndex],direction=corners[side].tOut;
    const start=path[path.length-1].center,target=c.previous,length=dot(sub(target,start),direction);
    const arithmeticTolerance=64*Number.EPSILON*Math.max(1,W,H,pitch);
    if(length < -arithmeticTolerance) {
      reject(out,'Fit side '+(side+1),'The two corner reservations overlap on this side.',{start,target},'Outgoing anchor must precede the next incoming anchor');return;
    }
    const prefix=prefixSnapshot(path),pointAt=s=>add(start,mul(direction,s)),tangent=Math.atan2(direction[1],direction[0]);
    const spanLength=Math.abs(length)<=arithmeticTolerance?0:length;
    const fit=Geo.fitSpan(spanLength,pitch,options());
    if(!appendFit(out,path,fit,'Fit side '+(side+1),0,spanLength,pointAt,()=>tangent))return;
    check(out,'Side '+(side+1)+': the fit reaches the reserved corner entry',pointNear(path[path.length-1].center,target));
    const incoming=path[path.length-1];
    if(nextIndex===0) {
      const stepIndex=fixedStep(out,'Return to the starting hole',1,'Reuse the original round hole without adding another opening or changing the earlier sides.',
        'I0 to existing J0',{start:incoming.center,target:firstHole.center},{protectedEnd:1});
      addInterval(out,incoming,firstHole,{protected:true,stepIndex});
      verifyCornerVectors(out,c,incoming,firstHole,firstOutgoing);
      check(out,'Closing the final side preserves every earlier opening',prefixUnchanged(path,prefix));
    } else {
      const hole={...c.joint.hole},outgoing=markSlit(out,c.next,Math.atan2(c.tOut[1],c.tOut[0]));
      out.holes.push(hole);
      const stepIndex=fixedStep(out,'Pass corner '+(nextIndex+1),2,'Keep the reserved incoming slit, round hole, and outgoing slit fixed.',
        'I to J to O',{start:incoming.center,target:outgoing.center},{protectedEnd:2});
      addInterval(out,incoming,hole,{protected:true,stepIndex});
      addInterval(out,hole,outgoing,{protected:true,stepIndex});path.push(hole,outgoing);
      verifyCornerVectors(out,c,incoming,hole,outgoing);
    }
  }
  check(out,'The rectangle has exactly four real round holes',out.holes.length===4);
  check(out,'The final interval reuses the original starting hole',out.intervals[out.intervals.length-1].b===firstHole.center);
  check(out,'The starting hole is emitted exactly once',path.filter(opening=>pointNear(opening.center,firstHole.center)).length===1);
  check(out,'The closed rectangle has one opening per interval',path.length===out.intervals.length);
  check(out,'All rectangle openings are distinct',path.every((opening,index)=>path.slice(0,index).every(previous=>!pointNear(previous.center,opening.center))));
  check(out,'Ordinary rectangle centres lie on the supplied sides',out.slits.every(s=>
    s.center[0]>=-EPS&&s.center[0]<=W+EPS&&s.center[1]>=-EPS&&s.center[1]<=H+EPS&&
    (Math.abs(s.center[0])<EPS||Math.abs(s.center[0]-W)<EPS||Math.abs(s.center[1])<EPS||Math.abs(s.center[1]-H)<EPS)));
  out.reason='Each side reaches the next reserved corner in order. The fourth side closes at the original starting hole and preserves the earlier sides.';
}

function arcCase(spec,pitch,out) {
  const R=spec.radius,sweep=rad(spec.sweep),start=-Math.PI/2,center=[0,R];
  const pointAt=angle=>arcPoint(center,R,start+angle),tangentAt=angle=>angle;
  out.guides.push(arcGuide(center,R,start,sweep));fixedEndpoints(out,pointAt(0),pointAt(sweep));
  out.metrics.push(['Radius',fmt(R)+' mm'],['Sweep',spec.sweep+'°'],['Endpoint treatment','Both centres fixed']);
  if(pitch>2*R){reject(out,'Check the arc','The nominal chord exceeds the circle diameter.');return;}
  const path=[markSlit(out,pointAt(0),0)];
  if(spec.kind==='arc') {
    const fit=Geo.fitCircularSpan(R,sweep,pitch,options());
    appendFit(out,path,fit,'Reach the fixed arc end',0,sweep,pointAt,tangentAt,true);
    out.reason=fit.reason;
  } else {
    const angle=nominalAngle(R,pitch),mid=rad(spec.gapAngle),left=mid-angle/2,right=mid+angle/2;
    const P=pointAt(mid);out.markers.push({point:P,label:'Landmark',type:'constraint',labelOffset:[-44,14],labelAnchor:'end'});
    if(left<0||right>sweep){reject(out,'Reserve the centred chord','The nominal centred chord does not fit inside the fixed arc.');return;}
    const before=Geo.fitCircularSpan(R,left,pitch,options());
    if(!appendFit(out,path,before,'Reach the centred chord entry',0,left,pointAt,tangentAt,true))return;
    const pair=appendProtectedGap(out,path,'Commit the centred chord',pointAt(right),tangentAt(right),
      'The landmark fixes this nominal chord at equal angular offsets.','Entry = phi - A/2; exit = phi + A/2');
    const Q=mul(add(pair[0].center,pair[1].center),.5);
    const measuredAngle=point=>Math.atan2(point[1]-center[1],point[0]-center[0])-start;
    const centreResidual=(measuredAngle(pair[0].center)+measuredAngle(pair[1].center))/2-mid;
    check(out,'The measured chord endpoints centre the landmark along the arc',Math.abs(centreResidual*R)<EPS);
    out.markers.push({point:Q,label:'Chord midpoint',type:'comparison',labelOffset:[-44,40],labelAnchor:'end'});out.helpers.push({a:P,b:Q});
    out.metrics.push(['Guide centring residual',fmt(centreResidual*R,6)+' mm'],['Guide / chord midpoint separation',fmt(dist(P,Q),6)+' mm']);
    const after=Geo.fitCircularSpan(R,sweep-right,pitch,options());
    appendFit(out,path,after,'Reach the fixed arc end',right,sweep,pointAt,tangentAt,true);
    if(out.status!=='invalid')out.reason='The approach and remainder are fitted in order while the centred nominal chord and both outer endpoints stay fixed.';
    out.notes.push('Centring is measured along the arc. The straight chord midpoint lies inside the arc and is shown separately.');
    out.notes.push('The landmark lies between two real slits. There is no opening at the landmark itself. Their protected centre-to-centre spacing is one nominal pitch.');
  }
  check(out,'Every emitted ordinary centre lies on the actual circle',path.every(cut=>Math.abs(dist(cut.center,center)-R)<EPS));
}

function curvedJunctionCase(spec,pitch,out) {
  const R=spec.radius,R2=spec.secondRadius,theta=rad(spec.turn),sweep=rad(spec.sweep);
  const center1=[0,R],endAngle=-Math.PI/2,tOut=[Math.cos(theta),Math.sin(theta)];
  out.guides.push(arcGuide(center1,R,endAngle-sweep,sweep));
  const center2=mul([-tOut[1],tOut[0]],R2),start2=theta-Math.PI/2;
  out.guides.push(spec.second==='line'?[[0,0],mul(tOut,10)]:arcGuide(center2,R2,start2,sweep));
  if(pitch>2*R||(spec.second==='arc'&&pitch>2*R2)){reject(out,'Check the curved guides','Nominal pitch exceeds a guide diameter.');return;}
  const angle1=nominalAngle(R,pitch),countIn=Math.floor((sweep+EPS)/angle1);
  const incoming=Array.from({length:countIn},(_,i)=>{
    const angle=endAngle-(countIn-i)*angle1;return markSlit(out,arcPoint(center1,R,angle),angle+Math.PI/2);
  });
  let outgoing;
  if(spec.second==='line') {
    outgoing=Array.from({length:Math.floor((10+EPS)/pitch)},(_,i)=>markSlit(out,mul(tOut,(i+1)*pitch),theta));
  } else {
    const angle2=nominalAngle(R2,pitch),countOut=Math.floor((sweep+EPS)/angle2);
    outgoing=Array.from({length:countOut},(_,i)=>{
      const angle=start2+(i+1)*angle2;return markSlit(out,arcPoint(center2,R2,angle),angle+Math.PI/2);
    });
  }
  if(!incoming.length||!outgoing.length){reject(out,'Check the local neighbours','Each supplied guide must contain a neighbouring nominal-pitch centre.');return;}
  out.virtualSlits=[Geo.makeSlit([0,0],0),Geo.makeSlit([0,0],theta)];
  const merged=Geo.mergeVirtualSlits(...out.virtualSlits);
  let opening;
  if(merged.kind==='slit')opening=markSlit(out,merged.slit.center,0);
  else if(merged.kind==='hole'){opening={...merged.hole};out.holes.push(opening);}
  else {reject(out,'Check the shared opening',merged.reason);return;}
  const sharedSlit=merged.kind==='slit',openingName=sharedSlit?'slit':'hole';
  const path=[...incoming,opening,...outgoing];
  for(let i=1;i<path.length;i++)addInterval(out,path[i-1],path[i],{plannedLength:pitch,protected:path[i-1]===opening||path[i]===opening});
  fixedStep(out,'Commit the incoming arc phase',incoming.length,'Nominal chords approach the fixed shared endpoint; the outer start margin is free.',
    'A = 2 asin(p/(2R)); terminal centre = shared endpoint',{start:incoming[0].center,target:opening.center},{protectedEnd:1});
  fixedStep(out,sharedSlit?'Retain one shared-endpoint slit':'Substitute the shared-endpoint hole',0,
    sharedSlit?'The virtual slits coincide at the tangent join, so retain one canonical slit.':'The prescribed virtual slits cross at the actual shared guide endpoint.',
    'J = shared guide endpoint',{target:opening.center});
  fixedStep(out,'Commit the outgoing phase',outgoing.length,'Continue by nominal direct pitch; the outer end margin is free.',
    spec.second==='line'?'Centres = k p tout':'A2 = 2 asin(p/(2R2))',{start:opening.center,target:outgoing[outgoing.length-1].center},{protectedStart:1});
  const incomingDisplay=sub(sharedSlit?opening.a:opening.center,incoming[incoming.length-1].b);
  const outgoingDisplay=sub(outgoing[0].a,sharedSlit?opening.b:opening.center);
  out.reason='Both virtual centres stay at the actual shared endpoint. One '+(sharedSlit?'canonical slit':'round hole')+' joins the nominal chord phases, with free outer margins.';
  out.markers.push({point:[0,0],label:'Shared endpoint',type:'constraint'});
  out.metrics.push(['Junction recipe','Fixed shared endpoint'],['Guide tangent turn',spec.turn+'°'],['Display-line turn',fmt(angleBetween(incomingDisplay,outgoingDisplay))+'°'],['Endpoint treatment','Outer margins free'],['Guide radii',spec.second==='arc'?R+' / '+R2+' mm':R+' mm / straight']);
  check(out,'Incoming ordinary centres lie on the actual arc',incoming.every(s=>Math.abs(dist(s.center,center1)-R)<EPS));
  if(spec.second==='arc')check(out,'Outgoing ordinary centres lie on the actual arc',outgoing.every(s=>Math.abs(dist(s.center,center2)-R2)<EPS));
  check(out,'The shared-endpoint '+openingName+' is on both actual guides',Math.abs(dist(opening.center,center1)-R)<EPS&&(spec.second==='line'||Math.abs(dist(opening.center,center2)-R2)<EPS));
  check(out,'All measured chords, including the endpoint chords, retain nominal pitch',out.intervals.every(item=>Math.abs(item.length-pitch)<EPS));
  check(out,sharedSlit?'The prescribed virtual cuts coincide at the tangent join':'The prescribed virtual cuts meet at the shared endpoint',Geo.classifySlits(...out.virtualSlits).kind===(sharedSlit?'coincident':'crossing'));
  out.notes.push('Guide tangent turn and display-line turn are different measurements. This fixed-centre recipe does not promise the angle symmetry of the straight slit-tip recipe.');
}

function lineArcCase(spec,pitch,out) {
  const L=spec.length,R=spec.radius,sweep=rad(spec.sweep),center=[0,R],origin=[0,0];
  out.guides.push([[-L,0],origin],arcGuide(center,R,-Math.PI/2,sweep));
  out.metrics.push(['Straight length',fmt(L)+' mm'],['Arc radius',fmt(R)+' mm'],['Arc sweep',spec.sweep+'°'],['Endpoint treatment','Both outer margins free']);
  if(pitch>2*R){reject(out,'Check the arc','The nominal chord exceeds the circle diameter.');return;}
  const angle=nominalAngle(R,pitch),countIn=Math.floor(L/pitch+1e-12),countOut=Math.floor(sweep/angle+1e-12);
  if(countIn<1||countOut<1){reject(out,'Check the smooth join','Both supplied guides must contain a neighbouring nominal-pitch centre.');return;}
  out.virtualSlits=[Geo.makeSlit(origin,0),Geo.makeSlit(origin,0)];
  const merged=Geo.mergeVirtualSlits(...out.virtualSlits);
  if(merged.kind!=='slit'){reject(out,'Keep the shared slit','The two virtual slits at the smooth join must coincide.');return;}
  const incoming=Array.from({length:countIn},(_,index)=>markSlit(out,[-(countIn-index)*pitch,0],0));
  const shared=markSlit(out,merged.slit.center,0),path=[...incoming,shared];
  const incomingStep=fixedStep(out,'Reach the smooth join',countIn,'Nominal intervals end at the shared slit. The outer start margin is free.',
    'Centres = -k p on the incoming line',{start:path[0].center,target:shared.center},{protectedEnd:1});
  for(let index=1;index<path.length;index++)addInterval(out,path[index-1],path[index],{plannedLength:pitch,protected:path[index]===shared,stepIndex:incomingStep});
  fixedStep(out,'Keep one shared slit',0,'The two guides meet with the same tangent, so their coincident virtual slits remain one real slit.',
    'Shared centre = guide join; shared tangent = 0',{target:shared.center});
  const prefix=prefixSnapshot(path);
  const outgoingStep=fixedStep(out,'Continue around the arc',countOut,'Nominal chord intervals continue from the shared slit. The outer end margin is free.',
    'A = 2 asin(p/(2R)); outgoing angles = k A',{start:shared.center,target:arcPoint(center,R,-Math.PI/2+countOut*angle)},{protectedStart:1});
  for(let index=1;index<=countOut;index++) {
    const tangent=index*angle,next=markSlit(out,arcPoint(center,R,-Math.PI/2+tangent),tangent);
    addInterval(out,path[path.length-1],next,{plannedLength:pitch,protected:index===1,stepIndex:outgoingStep});path.push(next);
  }
  out.markers.push({point:origin,label:'Join',type:'constraint',labelOffset:[-18,28],labelAnchor:'end'});
  out.metrics.push(['Free start margin',fmt(L-countIn*pitch)+' mm'],['Free end margin along arc',fmt(R*(sweep-countOut*angle))+' mm']);
  check(out,'The smooth join retains exactly one real slit',out.slits.filter(s=>pointNear(s.center,origin)).length===1&&out.holes.length===0);
  check(out,'The prescribed virtual slits coincide',Geo.classifySlits(...out.virtualSlits).kind==='coincident');
  check(out,'The incoming centres lie on the actual finite line',incoming.every(s=>Math.abs(s.center[1])<EPS&&s.center[0]>=-L-EPS&&s.center[0]<0));
  check(out,'The outgoing centres lie on the actual finite arc',path.slice(incoming.length+1).every(s=>{
    const station=Math.atan2(s.center[1]-R,s.center[0])+Math.PI/2;
    return Math.abs(dist(s.center,center)-R)<EPS&&station>=-EPS&&station<=sweep+EPS;
  }));
  check(out,'All intervals through the join retain nominal pitch',out.intervals.every(interval=>Math.abs(interval.length-pitch)<EPS));
  check(out,'The arc preserves the committed incoming line and shared slit',prefixUnchanged(path,prefix));
  out.notes.push('Only the shared slit is fixed. Neither outer endpoint is required to contain a slit; leftover lengths remain as free margins.');
  out.reason='The straight line and circular arc share one slit at their smooth join. Every interval is nominal; the two outer margins are free.';
}

function circleCase(spec,pitch,out) {
  const R=spec.radius,center=[0,0],start=-Math.PI/2,pointAt=a=>arcPoint(center,R,start+a);
  out.guides.push(arcGuide(center,R,start,TAU));out.markers.push({point:pointAt(0),label:'Closure',type:'constraint'});
  if(pitch>2*R){reject(out,'Check the circle','Nominal pitch exceeds the circle diameter.');return;}
  const angle=nominalAngle(R,pitch),count=Math.floor((rad(spec.builtSweep)+1e-12)/angle),built=count*angle;
  const path=Array.from({length:count+1},(_,i)=>markSlit(out,pointAt(i*angle),i*angle));
  for(let i=1;i<path.length;i++)addInterval(out,path[i-1],path[i],{protected:true,plannedLength:pitch,stepIndex:0});
  fixedStep(out,'Commit the nominal prefix',count,'Accept all whole nominal chords before the selected construction limit. This prefix is fixed before closure.',
    'K = floor(builtSweep/A); committed advance = K A',{start:path[0].center,target:path[path.length-1].center},{protectedStart:count});
  const prefix=prefixSnapshot(path);
  out.markers.push({point:path[path.length-1].center,label:'Committed end',type:'constraint'});
  const fit=Geo.fitCircularSpan(R,TAU-built,pitch,options({protectedEnd:1}));
  const stepIndex=recordStep(out,'Fit the remaining closure span',fit,{start:path[path.length-1].center,target:path[0].center});
  out.metrics.push(['Radius',fmt(R,6)+' mm'],['Requested construction limit',spec.builtSweep+'°'],['Committed nominal intervals',String(count)],['Committed advance',fmt(deg(built))+'°'],['Closure policy','Preserve prefix and final nominal chord']);
  if(fit.status==='invalid') {
    out.status='invalid';out.reason=fit.reason;
    check(out,'An invalid closure leaves the committed prefix unchanged',prefixUnchanged(path,prefix));
    out.notes.push('The accepted prefix remains visible. No failed closure or duplicate start opening is emitted.');return;
  }
  const changed=new Set(fit.adjustedIndices),firstInterval=out.intervals.length;
  let accumulated=built;
  for(let i=0;i<fit.intervalCount;i++) {
    accumulated+=fit.angularSteps[i];
    const closing=i===fit.intervalCount-1;
    const next=closing?path[0]:markSlit(out,pointAt(accumulated),accumulated);
    addInterval(out,path[path.length-1],next,{adjusted:changed.has(i),protected:i>=fit.intervalCount-fit.protectedEnd,plannedLength:fit.intervals[i],stepIndex});
    if(!closing)path.push(next);
  }
  out.status=fit.status;out.reason='The remaining tail '+(fit.status==='exact'?'closes at nominal pitch.':'closes with the minimum permitted corrections.')+' The committed prefix and final nominal chord stay fixed.';
  fitChecks(out,fit,'Closure span');
  check(out,'Measured closure chords match the direct fit',out.intervals.slice(firstInterval).every(item=>Math.abs(item.length-item.plannedLength)<EPS));
  check(out,'The complete angular advance is one revolution',Math.abs(accumulated-TAU)<EPS);
  check(out,'The closing interval returns to the original start opening',pointNear(out.intervals[out.intervals.length-1].b,path[0].center));
  check(out,'Closed loop has one opening per interval',path.length===out.intervals.length);
  check(out,'The start opening is emitted exactly once',path.filter(cut=>pointNear(cut.center,path[0].center)).length===1);
  check(out,'Closure preserves every committed prefix centre',prefixUnchanged(path,prefix));
  check(out,'The final measured chord is protected and nominal',out.intervals[out.intervals.length-1].protected&&!out.intervals[out.intervals.length-1].adjusted&&Math.abs(out.intervals[out.intervals.length-1].length-pitch)<EPS);
  out.notes.push('The construction limit selects K whole nominal chords. Only the remaining angular span is fitted; the existing start opening is reused on closure.');
}

function summarize(out) {
  const normal=out.intervals.filter(item=>!item.junction&&!item.adjusted);
  const changed=out.intervals.filter(item=>item.adjusted);
  const protectedOrdinary=out.intervals.filter(item=>item.protected&&!item.junction);
  if(normal.length)out.metrics.push(['Largest ordinary pitch error',fmt(Math.max(...normal.map(item=>Math.abs(item.length-out.pitch))),6)+' mm']);
  out.metrics.push(['Changed ordinary intervals',String(changed.length)],['Protected ordinary intervals',String(protectedOrdinary.length)]);
  if(changed.length)out.metrics.push(['Changed lengths',changed.map(item=>fmt(item.length)).join(', ')+' mm']);
  const junction=out.intervals.filter(item=>item.junction);
  if(junction.length)out.metrics.push(['Junction centre distances',junction.map(item=>fmt(item.length)).join(', ')+' mm']);
  check(out,'Canonical slit length is fixed',out.slits.every(s=>Math.abs(dist(s.a,s.b)-Geo.DEFAULT_PROFILE.slitLength)<EPS));
  check(out,'Canonical slit lean follows each local tangent',out.slits.every(s=>Math.abs(Math.atan2(cross([Math.cos(s.tangent),Math.sin(s.tangent)],sub(s.b,s.a)),dot([Math.cos(s.tangent),Math.sin(s.tangent)],sub(s.b,s.a)))+rad(Geo.DEFAULT_PROFILE.slitAngleDeg))<EPS));
  check(out,'Round-hole diameter is fixed',out.holes.every(h=>h.diameter===Geo.DEFAULT_PROFILE.holeDiameter));
  check(out,'Nominal ordinary intervals measure the selected pitch',normal.every(item=>Math.abs(item.length-out.pitch)<EPS));
  check(out,'Corrections remain within ten percent',changed.every(item=>Math.abs(item.length-out.pitch)<=.1*out.pitch+EPS));
  check(out,'Corrections affect only eligible ordinary intervals',changed.every(item=>!item.protected&&!item.junction));
  check(out,'Protected ordinary intervals remain nominal',protectedOrdinary.every(item=>!item.adjusted&&Math.abs(item.length-out.pitch)<EPS));
  check(out,'Emitted correction count agrees with accepted construction steps',changed.length===out.steps.reduce((total,step)=>total+step.correctionCount,0));
  out.metrics.unshift(['Actual openings',String(out.slits.length+out.holes.length)]);
}

export function runCase(specOrId,pitch=3) {
  const spec=typeof specOrId==='string'?CASES.find(item=>item.id===specOrId):specOrId;
  if(!spec)throw new Error('Unknown fixture');
  const out=result(spec,pitch),spacing=Geo.validateSpacing(pitch);
  out.spacing=spacing;
  if(!spacing.valid) {
    reject(out,'Validate ordinary spacing',spacing.reason,{},'p (1 - toleranceFraction) > slitLength');
    check(out,'Invalid spacing is rejected before cuts are generated',out.slits.length===0&&out.holes.length===0);
  } else {
    check(out,'Shortest permitted ordinary spacing exceeds one slit length',spacing.minimumAllowed>spacing.minimumSpacing);
    if(spec.kind==='straight')straightCase(spec,pitch,out);
    else if(spec.kind==='fixed-gap')gapCase(spec,pitch,out);
    else if(spec.kind==='continuation')continuationCase(spec,pitch,out);
    else if(spec.kind==='corner')cornerCase(spec,pitch,out);
    else if(spec.kind==='ordered-corner')orderedCornerCase(spec,pitch,out);
    else if(spec.kind==='near-corner')nearCornerCase(spec,pitch,out);
    else if(spec.kind==='rectangle')rectangleCase(spec,pitch,out);
    else if(spec.kind==='arc'||spec.kind==='arc-gap')arcCase(spec,pitch,out);
    else if(spec.kind==='curved-junction')curvedJunctionCase(spec,pitch,out);
    else if(spec.kind==='line-arc')lineArcCase(spec,pitch,out);
    else if(spec.kind==='circle')circleCase(spec,pitch,out);
    else reject(out,'Check fixture class','No prescribed construction exists for this fixture class.');
  }
  summarize(out);
  out.referenceMatches=pitch===3?out.status===spec.expected:null;
  return out;
}
export function runAll(pitch=3) {return CASES.map(spec=>runCase(spec,pitch));}
