# Analytic illustrations of catalog S02. No CAD automation or independent stitch solver.
[CmdletBinding()]
param([string]$OutputDirectory = (Join-Path $PSScriptRoot 'assets'))
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$catalog = Get-Content (Join-Path $PSScriptRoot '../../tests/cases.json') -Raw | ConvertFrom-Json
$case = $catalog.geometry | Where-Object id -eq 'S02'
$variant = $case.variants | Where-Object pitch -eq 3
$guide = $variant.route.primitives[0]
$pitch = [double]$variant.pitch
$length = [double]$guide.b[0] - [double]$guide.a[0]
if ($guide.kind -ne 'line' -or $guide.a[1] -ne $guide.b[1] -or $length -ne 30.5 -or $variant.landmarks.Count) {
 throw 'S02 changed. Review the illustration composition before rebuilding.'
}
$count = 10
$changed = [int]$variant.expected.changedGaps
$adjusted = ($length - ($count - $changed) * $pitch) / $changed
$layouts = @(
 @{Name='pitch-spread'; Title='Spread the correction'; Start=0; Count=10; Gap=$length/10;
   Caption='Every gap changes. None retains the nominal tool spacing.'},
 @{Name='pitch-end'; Title='Adjust near the end'; Start=8; Count=2; Gap=$adjusted;
   Caption='Two gaps change. The adjustment sits at the end.'},
 @{Name='pitch-centre'; Title='Plan two central adjustments'; Start=4; Count=2; Gap=$adjusted;
   Caption='The same two adjustments, centred between the fixed ends.'}
)
$ink = '#202824'; $quiet = '#73796F'; $faint = '#B7B9AF'; $paper = '#F5F0E4'
$scale = 15.0; $slitLength = 1.5; $lean = 40 * [Math]::PI / 180
$dx = $slitLength * $scale * [Math]::Cos($lean) / 2
$dy = $slitLength * $scale * [Math]::Sin($lean) / 2
New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null
function N([double]$value) { $value.ToString('0.#########',[Globalization.CultureInfo]::InvariantCulture) }
function Label($x,$y,[string]$value,$size=14,$color=$ink,$bold=$false,$anchor='start') {
 $style = if ($bold) {[Drawing.FontStyle]::Bold} else {[Drawing.FontStyle]::Regular}
 $font = [Drawing.Font]::new('Arial',[single]$size,$style,[Drawing.GraphicsUnit]::Pixel)
 $brush = [Drawing.SolidBrush]::new([Drawing.ColorTranslator]::FromHtml($color))
 $format = [Drawing.StringFormat]::GenericTypographic.Clone()
 try {
  $format.Alignment = switch($anchor) {'middle' {[Drawing.StringAlignment]::Center} 'end' {[Drawing.StringAlignment]::Far} default {[Drawing.StringAlignment]::Near}}
  $ascent = $font.FontFamily.GetCellAscent($style) * $size / $font.FontFamily.GetEmHeight($style)
  $g.DrawString($value,$font,$brush,[Drawing.PointF]::new($x,($y-$ascent)),$format)
  $weight = if($bold){'700'}else{'400'}
  $safe = [Security.SecurityElement]::Escape($value)
  $svg.Add('<text x="'+(N $x)+'" y="'+(N $y)+'" fill="'+$color+'" font-size="'+$size+'" font-weight="'+$weight+'" text-anchor="'+$anchor+'">'+$safe+'</text>')
 } finally { $format.Dispose(); $brush.Dispose(); $font.Dispose() }
}
function Stroke($x1,$y1,$x2,$y2,$width=1,$color=$ink,$dashed=$false,$class='') {
 $pen = [Drawing.Pen]::new([Drawing.ColorTranslator]::FromHtml($color),[single]$width)
 try {
  if($dashed){$pen.DashPattern = @(3.0,3.0)}
  $g.DrawLine($pen,[single]$x1,[single]$y1,[single]$x2,[single]$y2)
  $dash = if($dashed){' stroke-dasharray="'+(N (3*$width))+' '+(N (3*$width))+'"'}else{''}
  $svg.Add('<line class="'+$class+'" x1="'+(N $x1)+'" y1="'+(N $y1)+'" x2="'+(N $x2)+'" y2="'+(N $y2)+'" stroke="'+$color+'" stroke-width="'+(N $width)+'"'+$dash+'/>')
 } finally { $pen.Dispose() }
}
function Slit($x,$y,$marked=$false,$class='slit') {
 Stroke ($x-$dx) ($y+$dy) ($x+$dx) ($y-$dy) 2.4 $ink $false $class
 if($marked){
  $nx = [Math]::Sin($lean)*4.3875; $ny = [Math]::Cos($lean)*4.3875
  foreach($sign in @(-1,1)) {
   $tx=$x+$sign*$dx; $ty=$y-$sign*$dy
   Stroke ($tx-$nx) ($ty-$ny) ($tx+$nx) ($ty+$ny) 2.4 $ink $false 'adjustment-mark'
  }
 }
}
foreach($layout in $layouts) {
 $gaps = @(for($i=0;$i -lt $count;$i++){if($i -ge $layout.Start -and $i -lt ($layout.Start+$layout.Count)){$layout.Gap}else{$pitch}})
 $stations = @(0.0); foreach($gap in $gaps){$stations += $stations[-1]+$gap}
 if([Math]::Abs($stations[-1]-$length) -gt 1e-9 -or ($gaps | Where-Object {$_ -lt .9*$pitch -or $_ -gt 1.1*$pitch})) {
  throw ('Invalid illustration spacing: '+$layout.Name)
 }
 $bitmap=[Drawing.Bitmap]::new(1800,1125); $g=[Drawing.Graphics]::FromImage($bitmap)
 $svg=[Collections.Generic.List[string]]::new()
 try {
  $g.SmoothingMode=[Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.TextRenderingHint=[Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  $g.Clear([Drawing.ColorTranslator]::FromHtml($paper)); $g.ScaleTransform(3,3)
  $svg.Add('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="375" viewBox="0 0 600 375" font-family="Arial, sans-serif" role="img" aria-labelledby="title description">')
  $svg.Add('<title id="title">'+$layout.Title+'</title><desc id="description">Analytic S02 comparison. Fixed 30.5 mm guide, nominal pitch 3 mm, eleven slits of length 1.5 mm at 40 degrees. '+$layout.Count+' adjusted gaps. '+$layout.Caption+'</desc>')
  $svg.Add('<rect width="600" height="375" fill="'+$paper+'"/>')
  Label 32 29 'ONE GUIDE / THREE PLACEMENT DECISIONS' 11 $quiet $true
  Label 32 61 $layout.Title 25 $ink $true
  Label 32 84 'Same endpoints. Same slits. Nominal pitch 3 mm.' 14 $quiet
  Stroke 60 117 517.5 117 0.8 $faint
  foreach($x in @(60,517.5)){Stroke $x 112 $x 122 1 $quiet}
  Label 288.75 109 '30.5 mm' 13 $ink $false 'middle'
  Stroke 60 168 517.5 168 1 $faint $false 'guide'
  for($i=0;$i -lt $stations.Count;$i++){
   $mark=($i -ge $layout.Start -and $i -le ($layout.Start+$layout.Count))
   Slit (60+$stations[$i]*$scale) 168 $mark
  }
  for($i=0;$i -lt $gaps.Count;$i++){
   if([Math]::Abs($gaps[$i]-$pitch) -gt 1e-9){
    Label (60+($stations[$i]+$stations[$i+1])*$scale/2) 193 ($gaps[$i].ToString('0.00',[Globalization.CultureInfo]::InvariantCulture)) 12 $ink $false 'middle'
   }
  }
  Label 60 145 'Fixed start' 11 $quiet
  Label 517.5 145 'Fixed end' 11 $quiet $false 'end'
  Stroke 32 214 568 214 0.8 $faint
  Label 36 269 ([string]$layout.Count) 40 $ink $true
  Label 36 291 'adjusted gaps' 15 $ink
  Label 36 312 ((10-$layout.Count).ToString()+' nominal / 11 openings') 12 $quiet
  # Same-scale nominal tooth array above the first four actual openings.
  Label 308 235 '3 mm tooth spacing' 12 $quiet
  Stroke 308 249 443 249 2 $quiet
  for($i=0;$i -lt 4;$i++) {
   $x=308+$i*$pitch*$scale
   Stroke $x 249 $x 260 1 $quiet
   Stroke ($x-$dx) (263+$dy) ($x+$dx) (263-$dy) 1.6 $quiet $false 'chisel-tooth'
   Stroke $x 274 $x 294 0.8 $faint $true
   Slit (308+$stations[$i]*$scale) 302 $false 'tool-comparison-slit'
  }
  Label 308 328 'First four openings, same scale' 11 $quiet
  Label 32 359 $layout.Caption 13 $ink
  $svg.Add('</svg>')
  $base=Join-Path $OutputDirectory $layout.Name
  [IO.File]::WriteAllLines(($base+'.svg'),$svg,[Text.UTF8Encoding]::new($false))
  $small=[Drawing.Bitmap]::new(600,375); $finish=[Drawing.Graphics]::FromImage($small)
  try {
   $finish.InterpolationMode=[Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
   $finish.DrawImage($bitmap,0,0,600,375)
   $small.Save(($base+'.png'),[Drawing.Imaging.ImageFormat]::Png)
  } finally {$finish.Dispose();$small.Dispose()}
  Write-Output ($layout.Name+': 600 x 375 SVG + PNG; '+$layout.Count+' adjusted gaps.')
 } finally {$g.Dispose();$bitmap.Dispose()}
}
