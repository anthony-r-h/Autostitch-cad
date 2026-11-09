# Generate embedded diagrams and looping animations. No CAD session or packages.
[CmdletBinding()]
param(
 [string]$OutputDirectory = (Join-Path $PSScriptRoot 'assets'),
 [string]$SceneScript = (Join-Path $PSScriptRoot 'scenes.mjs')
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing,PresentationCore,WindowsBase
$OutputDirectory = [IO.Path]::GetFullPath($OutputDirectory)
$SceneScript = [IO.Path]::GetFullPath($SceneScript)
$temporary = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot ('../../output/'+(Split-Path (Split-Path $SceneScript -Parent) -Leaf))))
& node $SceneScript prepare $OutputDirectory $temporary
if ($LASTEXITCODE -ne 0) { throw 'Scene construction failed.' }
$scenes = Get-Content (Join-Path $temporary 'scenes.json') -Raw | ConvertFrom-Json

function Draw-Frame($elements) {
 $large=[Drawing.Bitmap]::new(1200,750)
 $g=[Drawing.Graphics]::FromImage($large)
 $small=[Drawing.Bitmap]::new(600,375)
 try {
  $g.Clear([Drawing.Color]::White)
  $g.ScaleTransform(2,2)
  $g.SmoothingMode=[Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.TextRenderingHint=[Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  foreach($element in $elements) {
   $color=[Drawing.ColorTranslator]::FromHtml($element.color)
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
       $g.FillPolygon([Drawing.Brushes]::White,$points)
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
    'circle' {
     $brush=[Drawing.SolidBrush]::new($color)
     try {$g.FillEllipse($brush,[single]($element.p[0]-$element.radius),[single]($element.p[1]-$element.radius),[single](2*$element.radius),[single](2*$element.radius))}
     finally {$brush.Dispose()}
    }
    'text' {
     $fontStyle=if($element.bold){[Drawing.FontStyle]::Bold}else{[Drawing.FontStyle]::Regular}
     $font=[Drawing.Font]::new('Arial',[single]$element.size,$fontStyle,[Drawing.GraphicsUnit]::Pixel)
     $brush=[Drawing.SolidBrush]::new($color)
     $format=[Drawing.StringFormat]::GenericTypographic.Clone()
     try {
      $format.Alignment=[Drawing.StringAlignment]::Center
      $ascent=$font.FontFamily.GetCellAscent($fontStyle)*$element.size/$font.FontFamily.GetEmHeight($fontStyle)
      $g.DrawString($element.value,$font,$brush,[Drawing.PointF]::new($element.p[0],($element.p[1]-$ascent)),$format)
     } finally {$format.Dispose();$brush.Dispose();$font.Dispose()}
    }
    default {throw ('Unknown diagram element: '+$element.type)}
   }
  }
  $finish=[Drawing.Graphics]::FromImage($small)
  try {
   $finish.InterpolationMode=[Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
   $finish.DrawImage($large,0,0,600,375)
  } finally {$finish.Dispose()}
  return $small
 } catch {$small.Dispose();throw}
 finally {$g.Dispose();$large.Dispose()}
}
foreach($scene in $scenes) {
 $still=Draw-Frame $scene.final
 try {$still.Save((Join-Path $OutputDirectory ($scene.name+'.png')),[Drawing.Imaging.ImageFormat]::Png)}
 finally {$still.Dispose()}
 if($scene.frames.Count -eq 0) {
  Write-Output ($scene.name+': static SVG/PNG.')
  continue
 }
 $encoder=[Windows.Media.Imaging.GifBitmapEncoder]::new()
 foreach($frame in $scene.frames) {
  $bitmap=Draw-Frame $frame.elements
  $stream=[IO.MemoryStream]::new()
  try {
   $bitmap.Save($stream,[Drawing.Imaging.ImageFormat]::Png)
   $stream.Position=0
   $image=[Windows.Media.Imaging.BitmapImage]::new()
   $image.BeginInit()
   $image.CacheOption=[Windows.Media.Imaging.BitmapCacheOption]::OnLoad
   $image.StreamSource=$stream
   $image.EndInit()
   $image.Freeze()
   $encoder.Frames.Add([Windows.Media.Imaging.BitmapFrame]::Create($image))
  } finally {$stream.Dispose();$bitmap.Dispose()}
 }
 $file=[IO.File]::Create((Join-Path $temporary ($scene.name+'.gif')))
 try {$encoder.Save($file)} finally {$file.Dispose()}
 Write-Output ($scene.name+': '+$scene.frames.Count+' frames; SVG/PNG final state.')
 $encoder=$null
 [GC]::Collect()
}
& node $SceneScript finish $OutputDirectory $temporary
if ($LASTEXITCODE -ne 0) { throw 'Animation timing export failed.' }
Write-Output 'Looping GIFs written with explicit reveal timing and result holds.'
