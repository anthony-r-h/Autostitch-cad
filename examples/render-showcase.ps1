param([string]$InputPath, [string]$OutputFolder)
$ErrorActionPreference='Stop'
$stitchRoot=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
if(-not $InputPath){$InputPath=Join-Path $stitchRoot 'output/native/showcase.jsonl'}
if(-not $OutputFolder){$OutputFolder=$PSScriptRoot}
$shapes=@(Get-Content -LiteralPath $InputPath | ForEach-Object { ,($_ | ConvertFrom-Json) })
Add-Type -AssemblyName System.Drawing
$views=@(
 @{Name='autostitch-round';Bounds=@(-8,-12,315,52);Width=1600;Height=320;Paper='#FAF8F0'},
 @{Name='autostitch-angular';Bounds=@(-8,-102,315,-38);Width=1600;Height=320;Paper='#FAF8F0'},
 @{Name='autostitch-square';Bounds=@(354,-103,558,101);Width=600;Height=600;Paper='#F3DA49'}
)
function Number([double]$value){$value.ToString('0.#####',[Globalization.CultureInfo]::InvariantCulture)}
foreach($view in $views){
 $xmin,$ymin,$xmax,$ymax=$view.Bounds
 $scale=[Math]::Min($view.Width/($xmax-$xmin),$view.Height/($ymax-$ymin))
 $cx=($xmin+$xmax)/2;$cy=($ymin+$ymax)/2
 $svg=[Collections.Generic.List[string]]::new()
 $svg.Add('<svg xmlns="http://www.w3.org/2000/svg" width="'+$view.Width+'" height="'+$view.Height+'" viewBox="0 0 '+$view.Width+' '+$view.Height+'">')
 $svg.Add('<title>Autostitch — actual generated stitch layout</title>')
 $svg.Add('<rect width="100%" height="100%" fill="'+$view.Paper+'"/>')
 $bitmap=[Drawing.Bitmap]::new(($view.Width*3),($view.Height*3))
 $graphics=[Drawing.Graphics]::FromImage($bitmap)
 $graphics.SmoothingMode=[Drawing.Drawing2D.SmoothingMode]::AntiAlias
 $graphics.Clear([Drawing.ColorTranslator]::FromHtml($view.Paper))
 $graphics.ScaleTransform(3,3)
 $ink=[Drawing.ColorTranslator]::FromHtml('#171917')
 $brush=[Drawing.SolidBrush]::new($ink)
 foreach($shape in $shapes){
  if($shape[1] -notin @('AUTOSTITCH','AUTOSTITCH_STITCHES','SHOWCASE_PATTERN')){continue}
  $x=[double]$shape[2];$y=[double]$shape[3]
  if($x -lt $xmin -or $x -gt $xmax -or $y -lt $ymin -or $y -gt $ymax){continue}
  $px=($x-$cx)*$scale+$view.Width/2;$py=($cy-$y)*$scale+$view.Height/2
  if($shape[0] -eq 'ring'){
   $radius=[double]$shape[4]*$scale; $width=[double]$shape[5]*$scale
   $svg.Add('<circle cx="'+(Number $px)+'" cy="'+(Number $py)+'" r="'+(Number $radius)+'" fill="none" stroke="#171917" stroke-width="'+(Number $width)+'"/>')
   $pen=[Drawing.Pen]::new($ink,[single]$width)
   $graphics.DrawEllipse($pen,[single]($px-$radius),[single]($py-$radius),[single](2*$radius),[single](2*$radius));$pen.Dispose()
  } elseif($shape[0] -eq 'circle'){
   $radius=[double]$shape[4]*$scale
   $svg.Add('<circle cx="'+(Number $px)+'" cy="'+(Number $py)+'" r="'+(Number $radius)+'" fill="#171917"/>')
   $graphics.FillEllipse($brush,[single]($px-$radius),[single]($py-$radius),[single](2*$radius),[single](2*$radius))
  } else {
   $qx=([double]$shape[4]-$cx)*$scale+$view.Width/2;$qy=($cy-[double]$shape[5])*$scale+$view.Height/2
   $width=[double]$shape[6]*$scale
   $svg.Add('<line x1="'+(Number $px)+'" y1="'+(Number $py)+'" x2="'+(Number $qx)+'" y2="'+(Number $qy)+'" stroke="#171917" stroke-width="'+(Number $width)+'" stroke-linecap="round"/>')
   $pen=[Drawing.Pen]::new($ink,[single]$width);$pen.StartCap=[Drawing.Drawing2D.LineCap]::Round;$pen.EndCap=[Drawing.Drawing2D.LineCap]::Round
   $graphics.DrawLine($pen,[single]$px,[single]$py,[single]$qx,[single]$qy);$pen.Dispose()
  }
 }
 $svg.Add('</svg>')
 [IO.File]::WriteAllLines((Join-Path $OutputFolder ($view.Name+'.svg')),$svg,[Text.UTF8Encoding]::new($false))
 $small=[Drawing.Bitmap]::new([int]$view.Width,[int]$view.Height)
 $finish=[Drawing.Graphics]::FromImage($small);$finish.InterpolationMode=[Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
 $finish.DrawImage($bitmap,0,0,[int]$view.Width,[int]$view.Height)
 $small.Save((Join-Path $OutputFolder ($view.Name+'.png')),[Drawing.Imaging.ImageFormat]::Png)
 $finish.Dispose();$small.Dispose();$brush.Dispose();$graphics.Dispose();$bitmap.Dispose()
 Write-Output ($view.Name+' exported at '+$view.Width+' x '+$view.Height)
}
