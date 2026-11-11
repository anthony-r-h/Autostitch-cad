# Generate embedded diagrams and looping animations. MP4 export requires FFmpeg with libx264.
[CmdletBinding()]
param(
 [string]$OutputDirectory = (Join-Path $PSScriptRoot 'assets'),
 [string]$SceneScript = (Join-Path $PSScriptRoot 'scenes.mjs'),
 [string]$Theme,
 [string]$FfmpegPath = 'ffmpeg',
 [double[]]$FrameTimes = @(),
 [switch]$KeepScratch,
 [switch]$ContactSheet
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing,PresentationCore,WindowsBase
if(-not ('AutostitchDiagramPixels' -as [type])) {
 Add-Type -TypeDefinition @'
using System.Collections.Generic;
public static class AutostitchDiagramPixels {
 public static byte[] Index(byte[] bgra, int[] palette) {
  var lookup = new Dictionary<int, byte>();
  for (int i = 0; i < palette.Length; i++) lookup[palette[i]] = (byte)i;
  var indexed = new byte[bgra.Length / 4];
  for (int i = 0; i < indexed.Length; i++) {
   int b = bgra[i*4], g = bgra[i*4+1], r = bgra[i*4+2];
   int key = (r<<16) | (g<<8) | b;
   byte index;
   if (!lookup.TryGetValue(key, out index)) {
    int best = int.MaxValue;
    for (int j = 0; j < palette.Length; j++) {
     int dr = r-(palette[j]>>16), dg = g-((palette[j]>>8)&255), db = b-(palette[j]&255);
     int distance = 2*dr*dr + 4*dg*dg + db*db;
     if (distance < best) { best = distance; index = (byte)j; }
    }
    lookup[key] = index;
   }
   indexed[i] = index;
  }
  return indexed;
 }
}
'@
}
$OutputDirectory = [IO.Path]::GetFullPath($OutputDirectory)
$SceneScript = [IO.Path]::GetFullPath($SceneScript)
$scratchRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../output/scratch'))
$buildName = (Split-Path (Split-Path $SceneScript -Parent) -Leaf) + '-' + [IO.Path]::GetFileNameWithoutExtension($SceneScript)
$temporary = Join-Path $scratchRoot ($buildName + '-' + [Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $temporary -Force | Out-Null
Write-Output "Build scratch: $temporary"
try {
& node $SceneScript prepare $OutputDirectory $temporary $Theme
if ($LASTEXITCODE -ne 0) { throw 'Scene construction failed.' }
$scenes = Get-Content (Join-Path $temporary 'scenes.json') -Raw -Encoding UTF8 | ConvertFrom-Json

function Draw-Frame($elements,$canvas,$videoFramePath) {
 $supersampling=if($null -ne $canvas.supersampling){[int]$canvas.supersampling}else{2}
 $large=[Drawing.Bitmap]::new(($canvas.width*$supersampling),($canvas.height*$supersampling))
 $g=[Drawing.Graphics]::FromImage($large)
 $small=[Drawing.Bitmap]::new($canvas.width,$canvas.height)
 try {
  $background=[Drawing.SolidBrush]::new([Drawing.ColorTranslator]::FromHtml($canvas.background))
  $g.Clear($background.Color)
  $g.ScaleTransform($supersampling,$supersampling)
  $g.TranslateTransform([single]$canvas.x,[single]$canvas.y)
  $g.ScaleTransform([single]$canvas.scale,[single]$canvas.scale)
  $g.SmoothingMode=[Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.TextRenderingHint=[Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  foreach($element in $elements) {
   $color=[Drawing.ColorTranslator]::FromHtml($element.color)
   if($element.glow) {
    $glowColor=[Drawing.ColorTranslator]::FromHtml($element.glow.color)
    foreach($layer in @(@{width=1;alpha=0.45},@{width=0.55;alpha=0.75})) {
     $pen=[Drawing.Pen]::new([Drawing.Color]::FromArgb([int](255*$element.glow.opacity*$layer.alpha),$glowColor),[single]($element.glow.width*$layer.width/$canvas.scale))
     try {
      if($element.type -eq 'line'){$g.DrawLine($pen,[single]$element.a[0],[single]$element.a[1],[single]$element.b[0],[single]$element.b[1])}
      elseif($element.type -eq 'circle'){$g.DrawEllipse($pen,[single]($element.p[0]-$element.radius),[single]($element.p[1]-$element.radius),[single](2*$element.radius),[single](2*$element.radius))}
     } finally {$pen.Dispose()}
    }
   }
   switch($element.type) {
    'line' {
     if($element.outline) {
      $dx=$element.b[0]-$element.a[0];$dy=$element.b[1]-$element.a[1]
      $length=[Math]::Sqrt($dx*$dx+$dy*$dy)
      $nx=-$dy/$length*$element.width/2;$ny=$dx/$length*$element.width/2
      $points=[Drawing.PointF[]]@(
       [Drawing.PointF]::new($element.a[0]+$nx,$element.a[1]+$ny),
       [Drawing.PointF]::new($element.b[0]+$nx,$element.b[1]+$ny),
       [Drawing.PointF]::new($element.b[0]-$nx,$element.b[1]-$ny),
       [Drawing.PointF]::new($element.a[0]-$nx,$element.a[1]-$ny))
      $border=[Drawing.Pen]::new($color,[single]$element.outlineWidth)
      try {
       if($element.dash){$border.DashPattern=@([single](4/$element.outlineWidth),[single](4/$element.outlineWidth))}
       $g.FillPolygon($background,$points)
       $g.DrawPolygon($border,$points)
      } finally {$border.Dispose()}
      break
     }
     $pen=[Drawing.Pen]::new($color,[single]$element.width)
     try {
      if($element.dash){$pen.DashPattern=@([single](4/$element.width),[single](4/$element.width))}
      if($element.round){$pen.StartCap=[Drawing.Drawing2D.LineCap]::Round;$pen.EndCap=[Drawing.Drawing2D.LineCap]::Round}
      $g.DrawLine($pen,[single]$element.a[0],[single]$element.a[1],[single]$element.b[0],[single]$element.b[1])
     } finally {$pen.Dispose()}
    }
    'polygon' {
     $points=[Drawing.PointF[]]@($element.points | ForEach-Object {[Drawing.PointF]::new($_[0],$_[1])})
     $opacity=if($null -ne $element.opacity){$element.opacity}else{1}
     $brush=[Drawing.SolidBrush]::new([Drawing.Color]::FromArgb([int](255*$opacity),$color))
     try {$g.FillPolygon($brush,$points)} finally {$brush.Dispose()}
    }
    'circle' {
     $brush=[Drawing.SolidBrush]::new($color)
     try {$g.FillEllipse($brush,[single]($element.p[0]-$element.radius),[single]($element.p[1]-$element.radius),[single](2*$element.radius),[single](2*$element.radius))}
     finally {$brush.Dispose()}
    }
    'text' {
     if($element.textBackground) {
      $labelBrush=[Drawing.SolidBrush]::new([Drawing.ColorTranslator]::FromHtml($element.textBackground))
      $box=$element.textBox
      try {$g.FillRectangle($labelBrush,[single]$box.x,[single]$box.y,[single]$box.width,[single]$box.height)}
      finally {$labelBrush.Dispose()}
     }
     $brush=[Drawing.SolidBrush]::new($color)
     $format=[Drawing.StringFormat]::GenericTypographic.Clone()
     try {
      $format.Alignment=[Drawing.StringAlignment]::Center
      $runs=if($element.textRuns){$element.textRuns}else{@([pscustomobject]@{value=$element.value;x=$element.p[0];y=$element.p[1];size=$element.size;italic=$element.fontItalic})}
      foreach($run in $runs) {
       $fontStyle=if($element.bold){[Drawing.FontStyle]::Bold}else{[Drawing.FontStyle]::Regular}
       if($run.italic){$fontStyle=$fontStyle -bor [Drawing.FontStyle]::Italic}
       $font=[Drawing.Font]::new($element.fontFamily,[single]$run.size,$fontStyle,[Drawing.GraphicsUnit]::Pixel)
       try {
        $ascent=$font.FontFamily.GetCellAscent($fontStyle)*$run.size/$font.FontFamily.GetEmHeight($fontStyle)
        $g.DrawString($run.value,$font,$brush,[Drawing.PointF]::new($run.x,($run.y-$ascent)),$format)
       } finally {$font.Dispose()}
      }
     } finally {$format.Dispose();$brush.Dispose()}
    }
    default {throw ('Unknown diagram element: '+$element.type)}
   }
  }
  # Preserve the original full-colour drawing before GIF downsampling and palette conversion.
  if ($videoFramePath) { $large.Save($videoFramePath,[Drawing.Imaging.ImageFormat]::Png) }
  $finish=[Drawing.Graphics]::FromImage($small)
  try {
   $finish.InterpolationMode=[Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
   $finish.DrawImage($large,0,0,$canvas.width,$canvas.height)
  } finally {$finish.Dispose()}
  return $small
 } catch {$small.Dispose();throw}
 finally {if($background){$background.Dispose()};$g.Dispose();$large.Dispose()}
}
function New-GifPalette($scene) {
 $unique=[ordered]@{}
 $unique[$scene.canvas.background]=$true
 foreach($elements in @($scene.final)+@($scene.frames | ForEach-Object {$_.elements})) {
  foreach($element in $elements) {
   $unique[$element.color]=$true
   if($element.textBackground){$unique[$element.textBackground]=$true}
  }
 }
 $colors=[Collections.Generic.List[Windows.Media.Color]]::new()
 foreach($hex in $unique.Keys){$colors.Add([Windows.Media.ColorConverter]::ConvertFromString($hex))}
 if($colors.Count -gt 256){throw 'The scene needs more than 256 GIF colours.'}
 # Preserve exact role colours, then spend the remaining entries on antialiased edges.
 $background=$colors[0];$baseColors=$colors.ToArray()
 foreach($fraction in @(0.5,0.25,0.75,0.125,0.375,0.625,0.875)) {
  foreach($color in $baseColors) {
   $blend=[Windows.Media.Color]::FromRgb(
    [byte]($background.R+($color.R-$background.R)*$fraction),
    [byte]($background.G+($color.G-$background.G)*$fraction),
    [byte]($background.B+($color.B-$background.B)*$fraction))
   if($colors.Count -lt 256 -and -not $colors.Contains($blend)){$colors.Add($blend)}
  }
 }
 return [Windows.Media.Imaging.BitmapPalette]::new($colors)
}
function New-GifFrame($image,$palette) {
 # WPF's indexed converter dithers even flat label backgrounds. Map colours directly.
 $source=[Windows.Media.Imaging.FormatConvertedBitmap]::new($image,[Windows.Media.PixelFormats]::Bgra32,$null,0)
 $pixels=[byte[]]::new($source.PixelWidth*$source.PixelHeight*4)
 $source.CopyPixels($pixels,$source.PixelWidth*4,0)
 $rgb=[int[]]@($palette.Colors | ForEach-Object {([int]$_.R -shl 16) -bor ([int]$_.G -shl 8) -bor [int]$_.B})
 $indices=[AutostitchDiagramPixels]::Index($pixels,$rgb)
 $indexed=[Windows.Media.Imaging.BitmapSource]::Create($source.PixelWidth,$source.PixelHeight,96,96,
  [Windows.Media.PixelFormats]::Indexed8,$palette,$indices,$source.PixelWidth)
 return [Windows.Media.Imaging.BitmapFrame]::Create($indexed)
}
foreach($scene in $scenes) {
 if($scene.exportStills -eq $false -and ($scene.staticGif -or $scene.frames.Count -eq 0)) { throw 'Disabling still exports requires an animation.' }
 $palette=if($scene.staticGif -or $scene.frames.Count){New-GifPalette $scene}else{$null}
 if($scene.exportStills -ne $false) {
 $still=Draw-Frame $scene.final $scene.canvas
 try {
  $still.Save((Join-Path $OutputDirectory ($scene.name+'.png')),[Drawing.Imaging.ImageFormat]::Png)
  # Preserve existing embed paths when an animation becomes a static figure.
  if($scene.staticGif){
   $encoder=[Windows.Media.Imaging.GifBitmapEncoder]::new()
   $uri=[Uri]::new((Join-Path $OutputDirectory ($scene.name+'.png')))
   $image=[Windows.Media.Imaging.BitmapFrame]::Create($uri,[Windows.Media.Imaging.BitmapCreateOptions]::PreservePixelFormat,[Windows.Media.Imaging.BitmapCacheOption]::OnLoad)
   $encoder.Frames.Add((New-GifFrame $image $palette))
   $file=[IO.File]::Create((Join-Path $OutputDirectory ($scene.name+'.gif')))
   try {$encoder.Save($file)} finally {$file.Dispose()}
  }
 }
 finally {$still.Dispose()}
 }
 if($scene.frames.Count -eq 0) {
  Write-Output ($scene.name+': static SVG/PNG.')
  continue
 }
 $encoder=[Windows.Media.Imaging.GifBitmapEncoder]::new()
 $frameIndex=0
 foreach($frame in $scene.frames) {
  $videoFramePath=if($scene.frames.Count -gt 1){Join-Path $temporary ($scene.name+'-video-'+$frameIndex+'.png')}else{$null}
  $bitmap=Draw-Frame $frame.elements $scene.canvas $videoFramePath
  $frameIndex++
  $stream=[IO.MemoryStream]::new()
  try {
   foreach($time in $FrameTimes) {
    if($null -ne $frame.time -and $time -ge $frame.time -and $time -lt ($frame.time+$frame.delay/100.0)) {
     $bitmap.Save((Join-Path $temporary ($scene.name+'-'+$time.ToString('0.##',[Globalization.CultureInfo]::InvariantCulture)+'.png')),[Drawing.Imaging.ImageFormat]::Png)
    }
   }
   $bitmap.Save($stream,[Drawing.Imaging.ImageFormat]::Png)
   $stream.Position=0
   $image=[Windows.Media.Imaging.BitmapImage]::new()
   $image.BeginInit()
   $image.CacheOption=[Windows.Media.Imaging.BitmapCacheOption]::OnLoad
   $image.StreamSource=$stream
   $image.EndInit()
   $image.Freeze()
   $encoder.Frames.Add((New-GifFrame $image $palette))
  } finally {$stream.Dispose();$bitmap.Dispose()}
 }
 $file=[IO.File]::Create((Join-Path $temporary ($scene.name+'.gif')))
 try {$encoder.Save($file)} finally {$file.Dispose()}
 $stillMessage=if($scene.exportStills -eq $false){'GIF/MP4 only.'}else{'SVG/PNG final state.'}
 Write-Output ($scene.name+': '+$scene.frames.Count+' frames; '+$stillMessage)
 $encoder=$null
 [GC]::Collect()
}
& node $SceneScript finish $OutputDirectory $temporary $Theme
if ($LASTEXITCODE -ne 0) { throw 'Animation timing export failed.' }
if (@($scenes | Where-Object { $_.frames.Count -gt 1 }).Count) {
 & (Join-Path $PSScriptRoot 'export-mp4.ps1') -ScenePath (Join-Path $temporary 'scenes.json') -OutputDirectory $OutputDirectory -ScratchDirectory $temporary -FfmpegPath $FfmpegPath
}
Write-Output 'GIFs and matching MP4s written with explicit reveal timing and result holds.'
if($ContactSheet) {
 $chrome=(Get-Content (Join-Path $PSScriptRoot 'colors.json') -Raw | ConvertFrom-Json).gallery
 $sheet=[Drawing.Bitmap]::new(1280,1720)
 $g=[Drawing.Graphics]::FromImage($sheet)
 $fontFamily=(Get-Content (Join-Path $PSScriptRoot 'colors.json') -Raw | ConvertFrom-Json).typography.fontFamily
 $font=[Drawing.Font]::new($fontFamily,18,[Drawing.FontStyle]::Regular,[Drawing.GraphicsUnit]::Pixel)
 $heading=[Drawing.Font]::new($fontFamily,24,[Drawing.FontStyle]::Bold,[Drawing.GraphicsUnit]::Pixel)
 $brush=[Drawing.SolidBrush]::new([Drawing.ColorTranslator]::FromHtml($chrome.ink))
 try {
  $g.Clear([Drawing.ColorTranslator]::FromHtml($chrome.background))
  $g.InterpolationMode=[Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.TextRenderingHint=[Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  $g.DrawString('AUTOSTITCH / COLOUR STUDIES',$heading,$brush,28,18)
  for($index=0;$index -lt $scenes.Count;$index++) {
   $row=[Math]::Floor($index/4);$x=28+($index%4)*312;$y=62+$row*410
   $picture=[Drawing.Image]::FromFile((Join-Path $OutputDirectory ($scenes[$index].name+'.png')))
   try {$g.DrawImage($picture,[single]$x,[single]$y,[single]288,[single]360)} finally {$picture.Dispose()}
   $g.DrawString($scenes[$index].title,$font,$brush,[single]$x,[single]($y+371))
  }
  $sheet.Save((Join-Path $OutputDirectory 'contact-sheet.png'),[Drawing.Imaging.ImageFormat]::Png)
 } finally {$brush.Dispose();$heading.Dispose();$font.Dispose();$g.Dispose();$sheet.Dispose()}
}
foreach ($scene in $scenes) {
 $extensions = @(if($scene.exportStills -ne $false){'.svg'; '.png'})
 if ($scene.staticGif -or $scene.frames.Count) { $extensions += '.gif' }
 if ($scene.frames.Count -gt 1) { $extensions += '.mp4' }
 foreach ($extension in $extensions) {
  $asset = Get-Item -LiteralPath (Join-Path $OutputDirectory ($scene.name + $extension)) -ErrorAction Stop
  if ($asset.Length -eq 0) { throw "Empty diagram export: $($asset.FullName)" }
 }
}
if ($KeepScratch -or $FrameTimes.Count -gt 0) {
 Write-Output "Kept build scratch for review: $temporary"
} else {
 $target = Get-Item -LiteralPath $temporary -ErrorAction Stop
 if ($target.Parent.FullName -ne $scratchRoot) { throw "Unexpected scratch cleanup target: $temporary" }
 if (@($target) + @(Get-ChildItem -LiteralPath $temporary -Recurse -Force) | Where-Object { $_.Attributes -band [IO.FileAttributes]::ReparsePoint }) {
  throw "Refusing to clean scratch containing a filesystem link: $temporary"
 }
 Remove-Item -LiteralPath $target.FullName -Recurse -Force -ErrorAction Stop
 Write-Output 'Build scratch removed.'
}
} catch {
 Write-Warning "Build failed; scratch retained at $temporary"
 throw
}
