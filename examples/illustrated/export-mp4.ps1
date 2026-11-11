# Encode the original full-colour drawing frames; looping belongs to the player.
[CmdletBinding()]
param(
 [Parameter(Mandatory)][string]$ScenePath,
 [Parameter(Mandatory)][string]$OutputDirectory,
 [Parameter(Mandatory)][string]$ScratchDirectory,
 [string]$FfmpegPath = 'ffmpeg'
)
$ErrorActionPreference = 'Stop'
$ffmpeg = Get-Command $FfmpegPath -CommandType Application -ErrorAction SilentlyContinue
if (-not $ffmpeg) { throw 'FFmpeg is required for MP4 exports. Put ffmpeg on PATH or pass -FfmpegPath with its executable path.' }
$scratch = (Get-Item -LiteralPath $ScratchDirectory -ErrorAction Stop).FullName
$scenes = Get-Content -LiteralPath $ScenePath -Raw -Encoding UTF8 | ConvertFrom-Json
foreach ($scene in $scenes | Where-Object { $_.frames.Count -gt 1 }) {
 $manifest = Join-Path $scratch ($scene.name + '.ffconcat')
 $entries = [Collections.Generic.List[string]]::new()
 $entries.Add('ffconcat version 1.0')
 for ($index = 0; $index -lt $scene.frames.Count; $index++) {
  $frameName = $scene.name + '-video-' + $index + '.png'
  if (-not (Test-Path -LiteralPath (Join-Path $scratch $frameName))) { throw "Missing video frame: $frameName" }
  $delay = [int]$scene.frames[$index].delay
  if ($delay -le 0) { throw "Invalid video frame delay in $($scene.name)" }
  $entries.Add("file '$frameName'")
  $entries.Add('option framerate 100')
  $entries.Add('duration ' + ($delay/100.0).ToString('0.00',[Globalization.CultureInfo]::InvariantCulture))
 }
 [IO.File]::WriteAllLines($manifest,$entries,[Text.UTF8Encoding]::new($false))
 # PNG packets have no final hold. Set its duration explicitly without adding a duplicate frame.
 $finalHold = ($scene.frames[-1].delay/100.0).ToString('0.00',[Globalization.CultureInfo]::InvariantCulture)
 $packetTiming = 'setts=duration=if(eq(N\,' + ($scene.frames.Count-1) + ')\,' + $finalHold + '/TB\,DURATION)'
 $temporary = Join-Path $scratch ($scene.name + '-' + [Guid]::NewGuid().ToString('N') + '.mp4')
 $log = $temporary + '.log'
 # GIF timestamps use hundredths of a second. Preserve variable delays and final holds.
 # Disable B-frame reordering so the final packet is the final displayed frame.
 $arguments = @('-hide_banner','-loglevel','error','-nostdin','-f','concat','-safe','0','-i',$manifest,
  '-an','-c:v','libx264','-preset','slow','-tune','animation','-crf','12',
  '-vf','scale=iw:ih:out_color_matrix=bt709','-pix_fmt','yuv420p',
  '-colorspace','bt709','-color_primaries','bt709','-color_trc','bt709','-color_range','tv',
  '-fps_mode','vfr','-enc_time_base','1:100','-bf','0','-bsf:v',$packetTiming,'-movflags','+faststart',$temporary)
 & $ffmpeg.Source @arguments 2> $log
 if ($LASTEXITCODE -ne 0) { throw "MP4 encoding failed for $($scene.name). See $log" }
 if (-not (Test-Path -LiteralPath $temporary) -or (Get-Item -LiteralPath $temporary).Length -eq 0) {
  throw "MP4 encoding produced no output for $($scene.name). See $log"
 }
 $destination = Join-Path $OutputDirectory ($scene.name + '.mp4')
 Move-Item -LiteralPath $temporary -Destination $destination -Force
 Write-Output "MP4 written: $destination"
}
