# Exercise scratch ownership, successful cleanup and retained diagnostics without CAD.
param(
 [string]$FfmpegPath = 'ffmpeg',
 [string]$FfprobePath = 'ffprobe'
)
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
  staticGif:@STATIC@,frames:@FRAMES@}]);
if(mode==='finish'&&'@FAIL@'==='empty')fs.writeFileSync(path.join(process.argv[3],'probe.gif'),'');
'@
$runs = @()
$gifCheck = @'
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gifBlocks} from '@MODULE@';
const gif=fs.readFileSync(process.argv[1]),blocks=gifBlocks(gif).blocks;
const isStatic=process.argv[2]==='True';
assert.equal(blocks.filter(b=>b.kind==='image').length,isStatic?1:3);
if(!isStatic)assert.deepEqual(blocks.filter(b=>b.kind==='control').map(b=>b.bytes.readUInt16LE(4)),[10,30,70]);
assert.equal(gif.includes(Buffer.from('NETSCAPE2.0')),!isStatic);
'@
$gifCheck = $gifCheck.Replace('@MODULE@',$moduleUri)
try {
 foreach ($case in @('default','default-static','svg-only','gif-only','mp4-only','success','animation-only','static','retained','frames','prepare','finish','empty','encoder')) {
  $scriptPath = Join-Path $testRoot ($case + '.mjs')
  $failure = if ($case -in @('prepare','finish','empty')) { $case } else { 'none' }
  $stills = if ($case -in @('animation-only','svg-only')) { 'false' } else { 'true' }
  $isStatic = $case -in @('static','default-static')
  $static = if ($isStatic) { 'true' } else { 'false' }
  $frames = if ($isStatic) { '[]' } else { '[{elements,delay:10,time:0},{elements,delay:30,time:.1},{elements,delay:70,time:.4}]' }
  [IO.File]::WriteAllText($scriptPath,$fixture.Replace('@MODULE@',$moduleUri).Replace('@FAIL@',$failure).Replace('@STILLS@',$stills).Replace('@STATIC@',$static).Replace('@FRAMES@',$frames))
  $destination = Join-Path $testRoot ($case + '-assets')
  $arguments = @('-NoProfile','-ExecutionPolicy','Bypass','-File',$renderer,'-SceneScript',$scriptPath,'-OutputDirectory',$destination)
  $exportGif = $case -notin @('default','default-static','svg-only','mp4-only','frames')
  $exportMp4 = $case -notin @('default','default-static','svg-only','gif-only','frames')
  if ($exportGif) { $arguments += '-Gif' }
  if ($exportMp4) { $arguments += '-Mp4' }
  $encoder = if ($case -eq 'encoder' -or -not $exportMp4) { Join-Path $testRoot 'missing-ffmpeg.exe' } else { $FfmpegPath }
  $arguments += @('-FfmpegPath',$encoder)
  if ($case -eq 'encoder') {
   New-Item -ItemType Directory -Path $destination | Out-Null
   Set-Content -LiteralPath (Join-Path $destination 'probe.mp4') -Value 'Existing output must survive encoding failure.'
  }
  if ($case -eq 'retained') { $arguments += '-KeepScratch' }
  if ($case -eq 'frames') { $arguments += @('-FrameTimes','0') }
  $ErrorActionPreference = 'Continue'
  try { $log = (& powershell @arguments 2>&1 | Out-String); $code = $LASTEXITCODE }
  finally { $ErrorActionPreference = 'Stop' }
  if ($log -notmatch '(?m)^Build scratch: (.+)') { throw "Missing scratch path for ${case}: $log" }
  $run = $Matches[1].Trim()
  if ((Split-Path $run -Parent) -ne $scratchRoot) { throw "Unexpected test scratch: $run" }
  $runs += $run
  $shouldFail = $case -in @('prepare','finish','empty','encoder')
  if (($code -ne 0) -ne $shouldFail) { throw "Unexpected exit code for ${case}: $log" }
  if ((Test-Path -LiteralPath $run) -ne ($case -notin @('default','default-static','svg-only','gif-only','mp4-only','success','animation-only','static'))) { throw "Wrong retention for ${case}: $log" }
  if (-not (Test-Path -LiteralPath $sentinel)) { throw 'Build removed unrelated scratch.' }
  if ($shouldFail -and ($log -notmatch 'scratch retained' -or -not (Test-Path -LiteralPath (Join-Path $run 'diagnostic.txt')))) { throw "Missing failure evidence: $log" }
  if (-not $shouldFail) {
   $extensions = @(if ($case -notin @('animation-only','svg-only')) { 'svg'; 'png' })
   if (-not $isStatic) { $extensions += 'animated.svg' }
   if ($exportGif) { $extensions += 'gif' }
   if ($exportMp4 -and -not $isStatic) { $extensions += 'mp4' }
   foreach ($extension in $extensions) {
    if ((Get-Item -LiteralPath (Join-Path $destination "probe.$extension")).Length -eq 0) { throw "Missing published $extension" }
   }
   $mp4 = Join-Path $destination 'probe.mp4'
   $gif = Join-Path $destination 'probe.gif'
   if ($exportGif) {
    & node --input-type=module -e $gifCheck $gif $isStatic
    if ($LASTEXITCODE -ne 0) { throw 'GIF frame timing or loop validation failed.' }
   } elseif (Test-Path -LiteralPath $gif) { throw 'Unrequested GIF was exported.' }
   if ($case -eq 'frames' -and -not (Test-Path -LiteralPath (Join-Path $run 'probe-0.png'))) { throw 'Requested review frame was lost.' }
   if ($isStatic) {
    if (Test-Path -LiteralPath $mp4) { throw 'Static GIF must not produce an MP4.' }
    if (Test-Path -LiteralPath (Join-Path $destination 'probe.animated.svg')) { throw 'Static figure must not produce an animated SVG.' }
    continue
   }
   if (-not $exportMp4) {
    if (Test-Path -LiteralPath $mp4) { throw 'Unrequested MP4 was exported.' }
    if ($case -eq 'svg-only') {
     foreach ($extension in @('svg','png')) {
      if (Test-Path -LiteralPath (Join-Path $destination "probe.$extension")) { throw "Unexpected static export $extension" }
     }
    }
    continue
   }
   $metadata = & $FfprobePath -v error -show_entries stream=codec_name,pix_fmt,width,height,nb_frames,duration -of json $mp4
   if ($LASTEXITCODE -ne 0) { throw "MP4 probe failed: $mp4" }
   $streams = @(($metadata | ConvertFrom-Json).streams)
   if ($streams.Count -ne 1 -or $streams[0].codec_name -ne 'h264' -or $streams[0].pix_fmt -ne 'yuv420p' -or $streams[0].width -ne 1200 -or $streams[0].height -ne 1500) {
    throw "Unexpected MP4 format: $metadata"
   }
   $frameCount = 3
   if ([int]$streams[0].nb_frames -ne $frameCount) { throw "MP4 frame count differs: $metadata" }
   if ($case -ne 'static') {
    $duration = [double]::Parse($streams[0].duration,[Globalization.CultureInfo]::InvariantCulture)
    if ([Math]::Abs($duration - 1.1) -gt 0.011) { throw "MP4 lost variable delays or final hold: $metadata" }
    $timing = & $FfprobePath -v error -show_entries frame=best_effort_timestamp_time -of json $mp4
    if ($LASTEXITCODE -ne 0) { throw "MP4 frame probe failed: $mp4" }
    $times = @(($timing | ConvertFrom-Json).frames)
    for ($i = 0; $i -lt 3; $i++) {
     $time = [double]::Parse($times[$i].best_effort_timestamp_time,[Globalization.CultureInfo]::InvariantCulture)
     if ([Math]::Abs($time - @(0,0.1,0.4)[$i]) -gt 0.001) { throw "MP4 frame timing differs: $timing" }
    }
   }
   & $FfmpegPath -hide_banner -loglevel error -xerror -i $mp4 -f null -
   if ($LASTEXITCODE -ne 0) { throw "MP4 decode failed: $mp4" }
   if ($case -eq 'animation-only') {
    foreach ($extension in @('svg','png')) {
     if (Test-Path -LiteralPath (Join-Path $destination "probe.$extension")) { throw "Unexpected static export $extension" }
    }
   }
  }
  if ($case -eq 'encoder' -and (Get-Content -LiteralPath (Join-Path $destination 'probe.mp4') -Raw).Trim() -ne 'Existing output must survive encoding failure.') {
   throw 'Encoding failure replaced existing output.'
  }
  if ($case -eq 'frames' -and -not (Test-Path -LiteralPath (Join-Path $run 'probe-0.png'))) { throw 'Requested review frame was lost.' }
 }
 if (@($runs | Select-Object -Unique).Count -ne $runs.Count) { throw 'Builds reused scratch.' }
 foreach ($target in ($runs + @($testRoot))) {
  if ((Split-Path $target -Parent) -ne $scratchRoot) { throw "Unsafe test cleanup target: $target" }
  if (Test-Path -LiteralPath $target) { Remove-Item -LiteralPath $target -Recurse -Force }
 }
 Write-Output 'Diagram build lifecycle valid: SVG/PNG defaults, independent optional GIF/MP4 exports, GIF timing, 2x H.264 video, frame timing and holds, static exclusions, decoding, scratch cleanup and failure preservation.'
} catch {
 Write-Warning "Lifecycle test failed; evidence retained under $testRoot and the reported build paths."
 throw
}
