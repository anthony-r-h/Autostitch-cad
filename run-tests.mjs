import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {runCoreTests} from './test-core.mjs';
import {runAll,PITCHES} from './case-suite.mjs';

const root=path.dirname(fileURLToPath(import.meta.url));
const core=runCoreTests();
const suites=PITCHES.map(pitch=>({pitch,cases:runAll(pitch)}));
const reference=suites.find(s=>s.pitch===3).cases;
const referenceChecks=reference.map(c=>({id:c.id,name:c.title,expected:c.expected,observed:c.status,passed:c.referenceMatches}));
const invariantChecks=suites.flatMap(s=>s.cases.flatMap(c=>c.checks.map(check=>({pitch:s.pitch,caseId:c.id,...check}))));
const failed=[...core.tests.filter(x=>!x.passed),...referenceChecks.filter(x=>!x.passed),...invariantChecks.filter(x=>!x.passed)];
const report={
  model:'Ordered closed-form construction; fixed 1.5 mm slit at 40 degrees; 0.5 mm round hole; minimal protected-span corrections; selectable chord pitch',
  referencePitch:3,
  core,
  referenceChecks,
  invariants:{passed:invariantChecks.filter(x=>x.passed).length,failed:invariantChecks.filter(x=>!x.passed).length,checks:invariantChecks},
  summary:{corePassed:core.passed,coreFailed:core.failed,referencePassed:referenceChecks.filter(x=>x.passed).length,referenceTotal:referenceChecks.length,pitchCount:PITCHES.length,fixtureRuns:suites.reduce((n,s)=>n+s.cases.length,0),failed:failed.length},
  suites
};
fs.writeFileSync(path.join(root,'results.json'),JSON.stringify(report,null,2)+'\n');
console.log(`Core: ${core.passed} passed, ${core.failed} failed`);
console.log(`Reference fixtures: ${report.summary.referencePassed}/${referenceChecks.length} matched`);
console.log(`Geometry invariants: ${report.invariants.passed} passed, ${report.invariants.failed} failed across ${report.summary.fixtureRuns} fixture runs`);
if(failed.length){console.error(JSON.stringify(failed,null,2));process.exitCode=1;}
