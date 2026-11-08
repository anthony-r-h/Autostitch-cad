[CmdletBinding(DefaultParameterSetName='Drawing')]
param(
 [Parameter(Mandatory=$true,ParameterSetName='Drawing')][string]$InputPath,
 [Parameter(Mandatory=$true,ParameterSetName='Drawing')][string]$OutputBase,
 [Parameter(Mandatory=$true,ParameterSetName='Drawing')][double[]]$Bounds,
 [Parameter(ParameterSetName='Drawing')][int]$Width=600,
 [Parameter(ParameterSetName='Drawing')][int]$Height=600,
 [Parameter(Mandatory=$true,ParameterSetName='Library')][switch]$FillLibrary
)
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
if($FillLibrary){
 $samples=@(
  @('quilt','Diamond quilt','67.88 x 67.88 mm'),
  @('circles','Concentric circles','66 x 66 mm; 6 mm spacing'),
  @('flow','Flow','35.38 x 74.89 mm'),
  @('maze','Branching maze','36 x 30 mm; 3 mm corridors')
 )
 $canvas=[Drawing.Bitmap]::new(960,1110)
 $graphics=[Drawing.Graphics]::FromImage($canvas)
 $title=[Drawing.Font]::new('Arial',22,[Drawing.FontStyle]::Bold,[Drawing.GraphicsUnit]::Pixel)
 $caption=[Drawing.Font]::new('Arial',17,[Drawing.FontStyle]::Regular,[Drawing.GraphicsUnit]::Pixel)
 $brush=[Drawing.SolidBrush]::new([Drawing.ColorTranslator]::FromHtml('#202824'))
 try {
  $graphics.Clear([Drawing.ColorTranslator]::FromHtml('#F5F0E4'))
  $graphics.InterpolationMode=[Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.TextRenderingHint=[Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  for($i=0;$i -lt $samples.Count;$i++){
   $sample=$samples[$i];$x=($i%2)*480;$y=[Math]::Floor($i/2)*540
   $graphics.DrawString($sample[1],$title,$brush,[single]($x+30),[single]($y+25))
   $graphics.DrawString($sample[2],$caption,$brush,[single]($x+30),[single]($y+57))
   $picture=[Drawing.Image]::FromFile((Join-Path $PSScriptRoot ('fills/fill-'+$sample[0]+'.png')))
   try {$graphics.DrawImage($picture,[single]($x+30),[single]($y+90),[single]420,[single]420)}
   finally {$picture.Dispose()}
  }
  $graphics.DrawString('Pitch 3 mm | Slits 1.5 mm | Each sample shown at its own scale.',$caption,$brush,[single]30,[single]1075)
  $path=Join-Path $PSScriptRoot 'fills/fill-library.png'
  $canvas.Save($path,[Drawing.Imaging.ImageFormat]::Png)
  Write-Output "$path exported at 960 x 1110."
 } finally {$brush.Dispose();$caption.Dispose();$title.Dispose();$graphics.Dispose();$canvas.Dispose()}
 return
}
if($Bounds.Count -ne 4 -or $Bounds[2] -le $Bounds[0] -or $Bounds[3] -le $Bounds[1]){throw 'Bounds must be xmin,ymin,xmax,ymax.'}
$xmin,$ymin,$xmax,$ymax=$Bounds
$scale=[Math]::Min($Width/($xmax-$xmin),$Height/($ymax-$ymin))
$cx=($xmin+$xmax)/2;$cy=($ymin+$ymax)/2
$bitmap=[Drawing.Bitmap]::new($Width*3,$Height*3)
$g=[Drawing.Graphics]::FromImage($bitmap)
$g.SmoothingMode=[Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.Clear([Drawing.ColorTranslator]::FromHtml('#F5F0E4'));$g.ScaleTransform(3,3)
$ink=[Drawing.ColorTranslator]::FromHtml('#202824');$brush=[Drawing.SolidBrush]::new($ink)
$svg=[Collections.Generic.List[string]]::new()
$svg.Add('<svg xmlns="http://www.w3.org/2000/svg" width="'+$Width+'" height="'+$Height+'" viewBox="0 0 '+$Width+' '+$Height+'">')
$svg.Add('<title>Actual Autostitch output</title><rect width="100%" height="100%" fill="#F5F0E4"/>')
function Number([double]$v){$v.ToString('0.#####',[Globalization.CultureInfo]::InvariantCulture)}
foreach($line in [IO.File]::ReadLines((Resolve-Path $InputPath))) {
 $s=$line | ConvertFrom-Json
 $x=[double]$s[2];$y=[double]$s[3]
 $px=($x-$cx)*$scale+$Width/2;$py=($cy-$y)*$scale+$Height/2
 if($s[0] -eq 'circle'){
  $r=[double]$s[4]*$scale
  if($px+$r -lt 0 -or $px-$r -gt $Width -or $py+$r -lt 0 -or $py-$r -gt $Height){continue}
  $svg.Add('<circle cx="'+(Number $px)+'" cy="'+(Number $py)+'" r="'+(Number $r)+'" fill="#202824"/>')
  $g.FillEllipse($brush,[single]($px-$r),[single]($py-$r),[single](2*$r),[single](2*$r))
 }else{
  $qx=([double]$s[4]-$cx)*$scale+$Width/2;$qy=($cy-[double]$s[5])*$scale+$Height/2
  if([Math]::Max($px,$qx) -lt 0 -or [Math]::Min($px,$qx) -gt $Width -or [Math]::Max($py,$qy) -lt 0 -or [Math]::Min($py,$qy) -gt $Height){continue}
  $w=[double]$s[6]*$scale
  $svg.Add('<line x1="'+(Number $px)+'" y1="'+(Number $py)+'" x2="'+(Number $qx)+'" y2="'+(Number $qy)+'" stroke="#202824" stroke-width="'+(Number $w)+'" stroke-linecap="round"/>')
  $pen=[Drawing.Pen]::new($ink,[single]$w);$pen.StartCap=[Drawing.Drawing2D.LineCap]::Round;$pen.EndCap=[Drawing.Drawing2D.LineCap]::Round
  $g.DrawLine($pen,[single]$px,[single]$py,[single]$qx,[single]$qy);$pen.Dispose()
 }
}
$svg.Add('</svg>')
$parent=Split-Path $OutputBase -Parent;if($parent){New-Item -ItemType Directory -Force -Path $parent | Out-Null}
[IO.File]::WriteAllLines(($OutputBase+'.svg'),$svg,[Text.UTF8Encoding]::new($false))
$small=[Drawing.Bitmap]::new($Width,$Height);$finish=[Drawing.Graphics]::FromImage($small)
$finish.InterpolationMode=[Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$finish.DrawImage($bitmap,0,0,$Width,$Height);$small.Save(($OutputBase+'.png'),[Drawing.Imaging.ImageFormat]::Png)
$finish.Dispose();$small.Dispose();$brush.Dispose();$g.Dispose();$bitmap.Dispose()
Write-Output "$OutputBase exported at $Width x $Height; $scale pixels/mm."
