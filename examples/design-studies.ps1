param([string]$OutputFolder = (Join-Path $PSScriptRoot 'studies'), [switch]$FillSamples)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
. (Join-Path $PSScriptRoot 'fill-recipes.ps1')
New-Item -ItemType Directory -Force -Path $OutputFolder | Out-Null
$ink = '#202824'
$paper = '#F5F0E4'
$script:shapes = [Collections.Generic.List[object]]::new()

function Point([double]$x, [double]$y) { ,@($x, $y) }
function Add-Linework($points, [bool]$closed = $false, [double]$weight = 0.3, [string]$role = 'GUIDES') {
    if ($points.Count -lt 2) { return }
    $script:shapes.Add(@{ Points = @($points); Closed = $closed; Weight = $weight; Role = $role })
}
function Add-Run($points, [double]$weight) {
    $length=0.0
    for($i=1;$i -lt $points.Count;$i++) {
        $dx=$points[$i][0]-$points[$i-1][0];$dy=$points[$i][1]-$points[$i-1][1]
        $length += [Math]::Sqrt($dx*$dx+$dy*$dy)
    }
    # Omit tiny shading fragments rather than imply useful stitch runs there.
    if($length -ge 5.0){Add-Linework $points $false $weight}
}
function Add-Clipped($curve, $inside, [double]$from, [double]$to, [int]$steps = 800, [double]$weight = 0.3) {
    # Sub-millimetre samples locate draft trim boundaries. These are artwork,
    # not a claim that the fragmented curves already satisfy the stitch solver.
    $run = [Collections.Generic.List[object]]::new()
    for ($i = 0; $i -le $steps; $i++) {
        $p = & $curve ($from + ($to - $from) * $i / $steps)
        if (& $inside $p[0] $p[1]) { $run.Add($p) }
        elseif ($run.Count) {
            if ($run.Count -gt 1) { Add-Run $run.ToArray() $weight }
            $run.Clear()
        }
    }
    if ($run.Count -gt 1) { Add-Run $run.ToArray() $weight }
}
function Add-Frame([double]$width, [double]$height, [double]$inset, [double]$radius, [double]$weight = 0.45) {
    $points = [Collections.Generic.List[object]]::new()
    $centres = @(@(($width-$inset-$radius),($inset+$radius),-90),
                 @(($width-$inset-$radius),($height-$inset-$radius),0),
                 @(($inset+$radius),($height-$inset-$radius),90),
                 @(($inset+$radius),($inset+$radius),180))
    foreach ($c in $centres) {
        for ($i=0; $i -le 24; $i++) {
            $a = ($c[2] + 90*$i/24)*[Math]::PI/180
            $points.Add(@(($c[0]+$radius*[Math]::Cos($a)),($c[1]+$radius*[Math]::Sin($a))))
        }
    }
    Add-Linework $points.ToArray() $true $weight
}
function In-Panel([double]$x,[double]$y) {
    if ($x -lt 13 -or $x -gt 227 -or $y -lt 13 -or $y -gt 227) { return $false }
    $dx=[Math]::Max([Math]::Abs($x-120)-92,0)
    $dy=[Math]::Max([Math]::Abs($y-120)-92,0)
    return ($dx*$dx+$dy*$dy -le 225)
}
function Number([double]$v) { $v.ToString('0.####',[Globalization.CultureInfo]::InvariantCulture) }
function Save-Study([string]$name,[string]$title,[double]$width,[double]$height,[int]$pixels) {
    $scale=$pixels/$width; $pixelHeight=[int][Math]::Round($height*$scale)
    $svg=[Collections.Generic.List[string]]::new()
    $svg.Add('<svg xmlns="http://www.w3.org/2000/svg" width="'+$pixels+'" height="'+$pixelHeight+'" viewBox="0 0 '+$width+' '+$height+'">')
    $svg.Add('<title>'+[Security.SecurityElement]::Escape($title)+' — unstitched artwork study</title>')
    $svg.Add('<rect width="100%" height="100%" fill="'+$paper+'"/>')
    $svg.Add('<g fill="none" stroke="'+$ink+'" stroke-linecap="round" stroke-linejoin="round">')
    $dxf=[Collections.Generic.List[string]]::new()
    # BricsCAD requires named layers and model-space ownership in this modern DXF.
    foreach($v in @('0','SECTION','2','HEADER','9','$ACADVER','1','AC1024','9','$INSUNITS','70','4','0','ENDSEC',
        '0','SECTION','2','CLASSES','0','ENDSEC','0','SECTION','2','TABLES',
        '0','TABLE','2','LTYPE','5','2','100','AcDbSymbolTable','70','1',
        '0','LTYPE','5','3','330','2','100','AcDbSymbolTableRecord','100','AcDbLinetypeTableRecord','2','Continuous','70','0','3','Solid line','72','65','73','0','40','0','0','ENDTAB',
        '0','TABLE','2','LAYER','5','4','100','AcDbSymbolTable','70','3')){$dxf.Add($v)}
    $layerHandle=5
    foreach($layer in @('0','STUDY_GUIDES','STUDY_LETTER_BOUNDARY')) {
        foreach($v in @('0','LAYER','5',$layerHandle.ToString('X'),'330','4','100','AcDbSymbolTableRecord','100','AcDbLayerTableRecord','2',$layer,'70','0','62','7','6','Continuous')){$dxf.Add($v)}
        $layerHandle++
    }
    foreach($v in @('0','ENDTAB','0','TABLE','2','BLOCK_RECORD','5','1','100','AcDbSymbolTable','70','2')){$dxf.Add($v)}
    foreach($space in @(@('*Model_Space','1F','20','21'),@('*Paper_Space','1E','22','23'))) {
        foreach($v in @('0','BLOCK_RECORD','5',$space[1],'330','1','100','AcDbSymbolTableRecord','100','AcDbBlockTableRecord','2',$space[0],'70','0')){$dxf.Add($v)}
    }
    foreach($v in @('0','ENDTAB','0','ENDSEC','0','SECTION','2','BLOCKS')){$dxf.Add($v)}
    foreach($space in @(@('*Model_Space','1F','20','21'),@('*Paper_Space','1E','22','23'))) {
        foreach($v in @('0','BLOCK','5',$space[2],'330',$space[1],'100','AcDbEntity','8','0','100','AcDbBlockBegin','2',$space[0],'70','0','10','0','20','0','30','0','3',$space[0],'1','',
            '0','ENDBLK','5',$space[3],'330',$space[1],'100','AcDbEntity','8','0','100','AcDbBlockEnd')){$dxf.Add($v)}
    }
    foreach($v in @('0','ENDSEC','0','SECTION','2','ENTITIES')){$dxf.Add($v)}
    $entityHandle=256
    $bitmap=[Drawing.Bitmap]::new($pixels*2,$pixelHeight*2)
    $g=[Drawing.Graphics]::FromImage($bitmap)
    $g.SmoothingMode=[Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.Clear([Drawing.ColorTranslator]::FromHtml($paper))
    $g.ScaleTransform([single]($scale*2),[single]($scale*2))
    foreach($shape in $script:shapes) {
        $coords=($shape.Points | ForEach-Object { (Number $_[0])+','+(Number $_[1]) }) -join ' '
        $element=if($shape.Closed){'polygon'}else{'polyline'}
        $svg.Add('<'+$element+' data-role="'+$shape.Role+'" points="'+$coords+'" stroke-width="'+(Number $shape.Weight)+'"/>')
        $points=[Drawing.PointF[]]@($shape.Points | ForEach-Object {[Drawing.PointF]::new([single]$_[0],[single]$_[1])})
        $pen=[Drawing.Pen]::new([Drawing.ColorTranslator]::FromHtml($ink),[single]$shape.Weight)
        $pen.LineJoin=[Drawing.Drawing2D.LineJoin]::Round
        if($shape.Closed){$g.DrawPolygon($pen,$points)}else{$g.DrawLines($pen,$points)}
        $pen.Dispose()
        foreach($v in @('0','LWPOLYLINE','5',$entityHandle.ToString('X'),'330','1F','100','AcDbEntity','8',('STUDY_'+$shape.Role),'100','AcDbPolyline','90',([string]$shape.Points.Count),'70',([string][int]$shape.Closed))){$dxf.Add($v)}
        $entityHandle++
        foreach($p in $shape.Points){foreach($v in @('10',(Number $p[0]),'20',(Number ($height-$p[1])))){$dxf.Add($v)}}
    }
    $svg.Add('</g></svg>')
    foreach($v in @('0','ENDSEC','0','SECTION','2','OBJECTS','0','DICTIONARY','5','C','330','0','100','AcDbDictionary','281','1','0','ENDSEC','0','EOF')){$dxf.Add($v)}
    [IO.File]::WriteAllLines((Join-Path $OutputFolder ($name+'.svg')),$svg,[Text.UTF8Encoding]::new($false))
    [IO.File]::WriteAllLines((Join-Path $OutputFolder ($name+'.dxf')),$dxf,[Text.UTF8Encoding]::new($false))
    $small=[Drawing.Bitmap]::new($pixels,$pixelHeight)
    $finish=[Drawing.Graphics]::FromImage($small)
    $finish.InterpolationMode=[Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $finish.DrawImage($bitmap,0,0,$pixels,$pixelHeight)
    $small.Save((Join-Path $OutputFolder ($name+'.png')),[Drawing.Imaging.ImageFormat]::Png)
    $finish.Dispose();$small.Dispose();$g.Dispose();$bitmap.Dispose()
    Write-Output ($name+': '+$script:shapes.Count+' paths; '+$pixels+' x '+$pixelHeight)
    $script:shapes.Clear()
}

function Add-RecipeFill([string]$Kind,[hashtable]$Config,[scriptblock]$Mask,[double]$Weight = 0.3) {
    $paths=Get-AstFillPaths $Kind $Config
    foreach($path in (Get-AstClippedFillPaths $paths $Mask 5.0)) { Add-Linework $path $false $Weight }
}

function Save-Sheet([string]$name,$items,[int]$tileWidth,[int]$tileHeight,[int]$columns = $items.Count) {
    $margin=36;$heading=52;$width=$columns*$tileWidth+($columns+1)*$margin
    $height=[int][Math]::Ceiling($items.Count/$columns)*($tileHeight+$heading+$margin)+$margin
    $bitmap=[Drawing.Bitmap]::new($width,$height);$g=[Drawing.Graphics]::FromImage($bitmap)
    $g.Clear([Drawing.ColorTranslator]::FromHtml($paper))
    $g.TextRenderingHint=[Drawing.Text.TextRenderingHint]::AntiAliasGridFit
    $font=[Drawing.Font]::new('Arial',18,[Drawing.FontStyle]::Bold)
    $brush=[Drawing.SolidBrush]::new([Drawing.ColorTranslator]::FromHtml($ink))
    for($i=0;$i -lt $items.Count;$i++) {
        $x=$margin+($i%$columns)*($tileWidth+$margin)
        $y=$margin+[int][Math]::Floor($i/$columns)*($tileHeight+$heading+$margin)
        $g.DrawString($items[$i][1],$font,$brush,[single]$x,[single]$y)
        $image=[Drawing.Image]::FromFile((Join-Path $OutputFolder ($items[$i][0]+'.png')))
        $g.DrawImage($image,$x,($y+$heading),$tileWidth,$tileHeight);$image.Dispose()
    }
    $bitmap.Save((Join-Path $OutputFolder ($name+'.png')),[Drawing.Imaging.ImageFormat]::Png)
    $brush.Dispose();$font.Dispose();$g.Dispose();$bitmap.Dispose()
}
if($FillSamples) {
    $catalog=Get-Content -Raw -Encoding UTF8 (Join-Path $PSScriptRoot '../tests/cases.json') | ConvertFrom-Json
    $items=@()
    foreach($recipe in $catalog.fillRecipes) {
        $config=@{}; foreach($property in $recipe.parameters.PSObject.Properties){$config[$property.Name]=$property.Value}
        Add-RecipeFill $recipe.kind $config {param($x,$y) $x -ge 8 -and $x -le 88 -and $y -ge 8 -and $y -le 88} 0.35
        Save-Study $recipe.previewName $recipe.title 96 96 480
        $items+=,@($recipe.previewName,$recipe.title.ToUpperInvariant())
    }
    Save-Sheet 'fill-library' $items 400 400 3
    return
}

# A: diamond quilting follows the waist of a sculpted centre panel.
Add-Frame 240 240 8 18
Add-Frame 240 240 13 15 0.25
function Waist([double]$y) { 47+25*[Math]::Pow([Math]::Sin([Math]::PI*$y/240),2) }
$central={param($x,$y) (In-Panel $x $y) -and $x -ge (Waist $y) -and $x -le (240-(Waist $y))}
Add-RecipeFill 'quilt' @{bounds=@(13,13,227,227);angle=45.0;spacing=(26/[Math]::Sqrt(2));offset=(-240/[Math]::Sqrt(2))} $central 0.34
foreach($side in @(0,1)) {
    foreach($offset in @(0,4,16,28,40)) {
        Add-Clipped {param($y) $x=(Waist $y)-$offset; if($side){$x=240-$x}; Point $x $y} {param($x,$y) In-Panel $x $y} 13 227 500 $(if($offset -le 4){0.42}else{0.30})
    }
}
Save-Study 'quilt-a-bolster' 'A / Bolster' 240 240 720

# B: an S-shaped channel interrupts a diagonal quilt field.
Add-Frame 240 240 8 18
Add-Frame 240 240 13 15 0.25
function Sweep([double]$x) { 120-56*[Math]::Sin(($x-120)*[Math]::PI/190) }
$field={param($x,$y) (In-Panel $x $y) -and [Math]::Abs($y-(Sweep $x)) -ge 22}
Add-RecipeFill 'quilt' @{bounds=@(13,13,227,227);angle=([Math]::Atan(0.8)*180/[Math]::PI);spacing=(24/[Math]::Sqrt(1.64))} $field 0.32
foreach($offset in @(-22,-18,-6,6,18,22)) {
    Add-Clipped {param($x) Point $x ((Sweep $x)+$offset)} {param($x,$y) In-Panel $x $y} 13 227 600 $(if([Math]::Abs($offset) -ge 18){0.4}else{0.3})
}
Save-Study 'quilt-b-sweep' 'B / Sweep' 240 240 720

# C: straight ribs cross sweeping arcs, opening from a quiet lower corner.
Add-Frame 240 240 8 18
Add-Frame 240 240 13 15 0.25
foreach($radius in @(36,58,80,102,124,146,168,190,212,234,256,278)) {
    foreach($dr in @(0,3.0)) {
        Add-Clipped {param($a) Point (22+($radius+$dr)*[Math]::Cos($a)) (218-($radius+$dr)*[Math]::Sin($a))} {param($x,$y) In-Panel $x $y} -0.5 2.1 800 0.3
    }
}
foreach($angle in @(11,26,41,56,71)) {
    $radians=$angle*[Math]::PI/180
    Add-Clipped {param($r) Point (22+$r*[Math]::Cos($radians)) (218-$r*[Math]::Sin($radians))} {param($x,$y) In-Panel $x $y} 39.5 310 700 0.4
}
Save-Study 'quilt-c-fan' 'C / Fan' 240 240 720

function Add-Word([Drawing.Drawing2D.GraphicsPath]$all,[string]$text,[string]$font,[double]$x,[double]$y,[double]$w,[double]$h) {
    $family=[Drawing.FontFamily]::new($font)
    $path=[Drawing.Drawing2D.GraphicsPath]::new()
    $path.AddString($text,$family,[int][Drawing.FontStyle]::Regular,100,[Drawing.PointF]::new(0,0),[Drawing.StringFormat]::GenericTypographic)
    $box=$path.GetBounds()
    $transform=[Drawing.Drawing2D.Matrix]::new([single]($w/$box.Width),0,0,[single]($h/$box.Height),[single]($x-$box.X*$w/$box.Width),[single]($y-$box.Y*$h/$box.Height))
    $path.Transform($transform);$all.AddPath($path,$false)
    $transform.Dispose();$path.Dispose();$family.Dispose()
}
function Add-Outline([Drawing.Drawing2D.GraphicsPath]$path) {
    $flat=$path.Clone();$flat.Flatten($null,0.12)
    $run=[Collections.Generic.List[object]]::new()
    for($i=0;$i -lt $flat.PointCount;$i++) {
        $point=$flat.PathPoints[$i];$kind=$flat.PathTypes[$i]
        if(($kind -band 7) -eq 0 -and $run.Count){Add-Linework $run.ToArray() $false 0.35 'LETTER_BOUNDARY';$run.Clear()}
        $run.Add(@([double]$point.X,[double]$point.Y))
        if($kind -band 128){Add-Linework $run.ToArray() $true 0.35 'LETTER_BOUNDARY';$run.Clear()}
    }
    if($run.Count){Add-Linework $run.ToArray() $false 0.35 'LETTER_BOUNDARY'}
    $flat.Dispose()
}
foreach($variant in @('a','b')) {
    $letters=[Drawing.Drawing2D.GraphicsPath]::new([Drawing.Drawing2D.FillMode]::Alternate)
    if($variant -eq 'a') {
        $font='Cooper Black'
        Add-Word $letters 'Can' $font 30 43 140 57
        Add-Word $letters 'You' $font 22 126 156 58
        Add-Word $letters 'Really' $font 17 215 166 54
    } else {
        $font='Rockwell Extra Bold'
        Add-Word $letters 'Can' $font 27 39 146 61
        Add-Word $letters 'You' $font 22 124 156 61
        Add-Word $letters 'Really' $font 17 214 166 57
    }
    $exclusion=[Drawing.Region]::new($letters)
    $halo=$letters.Clone();$haloPen=[Drawing.Pen]::new([Drawing.Color]::Black,4.0)
    $halo.Widen($haloPen);$exclusion.Union($halo)
    $mask={param($x,$y) $x -ge 13 -and $x -le 187 -and $y -ge 15 -and $y -le 305 -and -not $exclusion.IsVisible([single]$x,[single]$y)}
    Add-Frame 200 320 7 12 0.55
    Add-Frame 200 320 11 9 0.25
    if($variant -eq 'a') {
        Add-RecipeFill 'flow' @{bounds=@(13,13,187,308);spacing=2.8;amplitude=4.5;wavelength=217.5;phaseLength=70.0} $mask 0.4
    } else {
        for($row=-18;$row -le 326;$row+=3.2) {
            Add-Clipped {param($x) Point $x ($row+0.28*[Math]::Abs($x-100))} $mask 13 187 750 0.4
        }
    }
    Add-Outline $letters
    $letters.Dispose();$exclusion.Dispose();$halo.Dispose();$haloPen.Dispose()
    $title=if($variant -eq 'a'){'D / Velvet letterpress'}else{'E / Motor club'}
    Save-Study ('banner-'+$variant) $title 200 320 600
}

Save-Sheet 'quilting-options' @(@('quilt-a-bolster','A / BOLSTER'),@('quilt-b-sweep','B / SWEEP'),@('quilt-c-fan','C / FAN')) 600 600
Save-Sheet 'banner-options' @(@('banner-a','D / VELVET LETTERPRESS'),@('banner-b','E / MOTOR CLUB')) 500 800
