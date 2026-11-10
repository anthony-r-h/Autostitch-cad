# Exercise scratch ownership, successful cleanup and retained diagnostics without CAD.
$ErrorActionPreference = 'Stop'
$repoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$scratchRoot = Join-Path $repoRoot 'output/scratch'
$testRoot = Join-Path $scratchRoot ('build-check-' + [Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $testRoot -Force | Out-Null
$sentinel = Join-Path $testRoot 'keep-sibling.txt'
Set-Content -LiteralPath $sentinel -Value 'Unrelated scratch must survive each build.'
$renderer = Join-Path $repoRoot 'examples/illustrated/build.ps1'
$moduleUri = [Uri]::new((Join-Path $repoRoot 'examples/illustrated/scenes.mjs')).AbsoluteUri
$fixture = @'
import fs from 'node:fs';
import path from 'node:path';
import {writeSceneFiles} from '@MODULE@';
const mode=process.argv[2],temporary=process.argv[4];
if(mode==='prepare') {
  fs.mkdirSync(temporary,{recursive:true});
  fs.writeFileSync(path.join(temporary,'diagnostic.txt'),'Build evidence');
}
if(mode==='@FAIL@')throw new Error('Expected lifecycle-test failure');
const elements=[{type:'line',kind:'guide',color:'guide',a:[100,100],b:[200,100],width:1}];
writeSceneFiles([{name:'probe',title:'Scratch lifecycle check',source:'test',final:elements,exportStills:@STILLS@,
  frames:[{elements,delay:10,time:0},{elements,delay:10,time:.1}]}]);
if(mode==='finish'&&'@FAIL@'==='empty')fs.writeFileSync(path.join(process.argv[3],'probe.gif'),'');
'@
$runs = @()
try {
 foreach ($case in @('success','animation-only','retained','frames','prepare','finish','empty')) {
  $scriptPath = Join-Path $testRoot ($case + '.mjs')
  $failure = if ($case -in @('prepare','finish','empty')) { $case } else { 'none' }
  $stills = if ($case -eq 'animation-only') { 'false' } else { 'true' }
  [IO.File]::WriteAllText($scriptPath,$fixture.Replace('@MODULE@',$moduleUri).Replace('@FAIL@',$failure).Replace('@STILLS@',$stills))
  $destination = Join-Path $testRoot ($case + '-assets')
  $arguments = @('-NoProfile','-ExecutionPolicy','Bypass','-File',$renderer,'-SceneScript',$scriptPath,'-OutputDirectory',$destination)
  if ($case -eq 'retained') { $arguments += '-KeepScratch' }
  if ($case -eq 'frames') { $arguments += @('-FrameTimes','0') }
  $ErrorActionPreference = 'Continue'
  try { $log = (& powershell @arguments 2>&1 | Out-String); $code = $LASTEXITCODE }
  finally { $ErrorActionPreference = 'Stop' }
  if ($log -notmatch '(?m)^Build scratch: (.+)') { throw "Missing scratch path for ${case}: $log" }
  $run = $Matches[1].Trim()
  if ((Split-Path $run -Parent) -ne $scratchRoot) { throw "Unexpected test scratch: $run" }
  $runs += $run
  $shouldFail = $case -in @('prepare','finish','empty')
  if (($code -ne 0) -ne $shouldFail) { throw "Unexpected exit code for ${case}: $log" }
  if ((Test-Path -LiteralPath $run) -ne ($case -notin @('success','animation-only'))) { throw "Wrong retention for ${case}: $log" }
  if (-not (Test-Path -LiteralPath $sentinel)) { throw 'Build removed unrelated scratch.' }
  if ($shouldFail -and ($log -notmatch 'scratch retained' -or -not (Test-Path -LiteralPath (Join-Path $run 'diagnostic.txt')))) { throw "Missing failure evidence: $log" }
  if (-not $shouldFail) {
   $extensions = if ($case -eq 'animation-only') { @('gif') } else { @('svg','png','gif') }
   foreach ($extension in $extensions) {
    if ((Get-Item -LiteralPath (Join-Path $destination "probe.$extension")).Length -eq 0) { throw "Missing published $extension" }
   }
   if ($case -eq 'animation-only') {
    foreach ($extension in @('svg','png')) {
     if (Test-Path -LiteralPath (Join-Path $destination "probe.$extension")) { throw "Unexpected static export $extension" }
    }
   }
  }
  if ($case -eq 'frames' -and -not (Test-Path -LiteralPath (Join-Path $run 'probe-0.png'))) { throw 'Requested review frame was lost.' }
 }
 if (@($runs | Select-Object -Unique).Count -ne $runs.Count) { throw 'Builds reused scratch.' }
 foreach ($target in ($runs + @($testRoot))) {
  if ((Split-Path $target -Parent) -ne $scratchRoot) { throw "Unsafe test cleanup target: $target" }
  if (Test-Path -LiteralPath $target) { Remove-Item -LiteralPath $target -Recurse -Force }
 }
 Write-Output 'Diagram build lifecycle valid: unique scratch, success cleanup, explicit retention, review frames, prepare/finish/export failures and sibling preservation.'
} catch {
 Write-Warning "Lifecycle test failed; evidence retained under $testRoot and the reported build paths."
 throw
}
