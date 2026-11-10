# Generate embedded diagrams and looping animations. No CAD session or packages.
[CmdletBinding()]
param(
 [string]$OutputDirectory = (Join-Path $PSScriptRoot 'assets'),
 [string]$SceneScript = (Join-Path $PSScriptRoot 'scenes.mjs'),
 [switch]$ContactSheet
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing,PresentationCore,WindowsBase
$OutputDirectory = [IO.Path]::GetFullPath($OutputDirectory)
$SceneScript = [IO.Path]::GetFullPath($SceneScript)
$temporary = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot ('../../output/'+(Split-Path (Split-Path $SceneScript -Parent) -Leaf))))
& node $SceneScript prepare $OutputDirectory $temporary
if ($LASTEXITCODE -ne 0) { throw 'Scene construction failed.' }
$scenes = Get-Content (Join-Path $temporary 'scenes.json') -Raw -Encoding UTF8 | ConvertFrom-Json

function Draw-Frame($elements,$canvas) {
 $large=[Drawing.Bitmap]::new(($canvas.width*2),($canvas.height*2))
 $g=[Drawing.Graphics]::FromImage($large)
 $small=[Drawing.Bitmap]::new($canvas.width,$canvas.height)
 try {
  $background=[Drawing.SolidBrush]::new([Drawing.ColorTranslator]::FromHtml($canvas.background))
  $g.Clear($background.Color)
  $g.ScaleTransform(2,2)
  $g.TranslateTransform([single]$canvas.x,[single]$canvas.y)
  $g.ScaleTransform([single]$canvas.scale,[single]$canvas.scale)
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
   $finish.DrawImage($large,0,0,$canvas.width,$canvas.height)
  } finally {$finish.Dispose()}
  return $small
 } catch {$small.Dispose();throw}
 finally {if($background){$background.Dispose()};$g.Dispose();$large.Dispose()}
}
foreach($scene in $scenes) {
 $still=Draw-Frame $scene.final $scene.canvas
 try {
  $still.Save((Join-Path $OutputDirectory ($scene.name+'.png')),[Drawing.Imaging.ImageFormat]::Png)
  # Preserve existing embed paths when an animation becomes a static figure.
  if($scene.staticGif){
   $encoder=[Windows.Media.Imaging.GifBitmapEncoder]::new()
   $uri=[Uri]::new((Join-Path $OutputDirectory ($scene.name+'.png')))
   $encoder.Frames.Add([Windows.Media.Imaging.BitmapFrame]::Create($uri,[Windows.Media.Imaging.BitmapCreateOptions]::PreservePixelFormat,[Windows.Media.Imaging.BitmapCacheOption]::OnLoad))
   $file=[IO.File]::Create((Join-Path $OutputDirectory ($scene.name+'.gif')))
   try {$encoder.Save($file)} finally {$file.Dispose()}
  }
 }
 finally {$still.Dispose()}
 if($scene.frames.Count -eq 0) {
  Write-Output ($scene.name+': static SVG/PNG.')
  continue
 }
 $encoder=[Windows.Media.Imaging.GifBitmapEncoder]::new()
 foreach($frame in $scene.frames) {
  $bitmap=Draw-Frame $frame.elements $scene.canvas
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
if($ContactSheet) {
 $sheet=[Drawing.Bitmap]::new(1280,1720)
 $g=[Drawing.Graphics]::FromImage($sheet)
 $font=[Drawing.Font]::new('Arial',18,[Drawing.FontStyle]::Regular,[Drawing.GraphicsUnit]::Pixel)
 $heading=[Drawing.Font]::new('Arial',24,[Drawing.FontStyle]::Bold,[Drawing.GraphicsUnit]::Pixel)
 $brush=[Drawing.SolidBrush]::new([Drawing.ColorTranslator]::FromHtml('#292B30'))
 try {
  $g.Clear([Drawing.ColorTranslator]::FromHtml('#E4E2DE'))
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
