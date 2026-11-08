$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot '../examples/fill-recipes.ps1')
$catalog=Get-Content -Raw -Encoding UTF8 (Join-Path $PSScriptRoot 'cases.json') | ConvertFrom-Json
function Check([bool]$condition,[string]$message){if(-not $condition){throw $message}}
foreach($recipe in $catalog.fillRecipes) {
    $config=@{};foreach($p in $recipe.parameters.PSObject.Properties){$config[$p.Name]=$p.Value}
    $paths=Get-AstFillPaths $recipe.kind $config
    Check ($paths.Count -gt 0) ($recipe.id+': no paths')
    foreach($path in $paths){
        Check ($path.Count -ge 2) ($recipe.id+': empty path')
        foreach($point in $path){foreach($v in $point){Check (-not [double]::IsNaN($v) -and -not [double]::IsInfinity($v)) ($recipe.id+': nonfinite coordinate')}}
    }
    if($recipe.kind -eq 'maze') {
        $points=$paths[0];$seen=@{}
        Check ($points.Count -eq [Math]::Pow(4,$config.order)) 'Maze must visit every grid site.'
        for($i=0;$i -lt $points.Count;$i++) {
            $key=$points[$i] -join ',';Check (-not $seen.ContainsKey($key)) 'Maze revisits a grid site.';$seen[$key]=$true
            if($i){$dx=[Math]::Abs($points[$i][0]-$points[$i-1][0]);$dy=[Math]::Abs($points[$i][1]-$points[$i-1][1]);Check ((($dx -eq 0) -or ($dy -eq 0)) -and [Math]::Abs($dx+$dy-$config.cellSize) -lt 1e-8) 'Maze has a diagonal or nonadjacent step.'}
        }
    }
    if($recipe.kind -eq 'spiral') {
        Check ($paths.Count -eq 1) 'Spiral must be continuous.'
        $points=$paths[0]
        for($i=1;$i -lt $points.Count;$i++) {
            $distance=[Math]::Sqrt([Math]::Pow($points[$i][0]-$points[$i-1][0],2)+[Math]::Pow($points[$i][1]-$points[$i-1][1],2))
            Check ($distance -gt 0 -and $distance -le 0.251) 'Spiral has a jump or duplicate at an arc join.'
        }
    }
    if($recipe.kind -eq 'hatch') {
        $angle=$config.angle*[Math]::PI/180;$offsets=@()
        foreach($path in $paths) {
            $values=@($path | ForEach-Object {-[Math]::Sin($angle)*$_[0]+[Math]::Cos($angle)*$_[1]})
            $extent=$values | Measure-Object -Minimum -Maximum
            Check (($extent.Maximum-$extent.Minimum) -lt 1e-8) 'Hatch is not straight at its configured angle.'
            $offsets+= $values[0]
        }
        for($i=1;$i -lt $offsets.Count;$i++){Check ([Math]::Abs($offsets[$i]-$offsets[$i-1]-$config.spacing) -lt 1e-8) 'Hatch spacing changed.'}
    }
    if($recipe.kind -eq 'quilt') {
        $positive=@($paths | Where-Object {$_[-1][1] -gt $_[0][1]})
        $negative=@($paths | Where-Object {$_[-1][1] -lt $_[0][1]})
        Check ($positive.Count -gt 1 -and $negative.Count -gt 1) 'Quilt lost a hatch family.'
        $line=$positive[[int][Math]::Floor($positive.Count/2)]
        $p=$line[0];$r=@(($line[-1][0]-$p[0]),($line[-1][1]-$p[1]));$hits=@()
        foreach($other in $negative) {
            $q=$other[0];$s=@(($other[-1][0]-$q[0]),($other[-1][1]-$q[1]))
            $t=(($q[0]-$p[0])*$s[1]-($q[1]-$p[1])*$s[0])/($r[0]*$s[1]-$r[1]*$s[0])
            if($t -ge 0 -and $t -le 1){$hits+= $t*[Math]::Sqrt($r[0]*$r[0]+$r[1]*$r[1])}
        }
        $hits=@($hits | Sort-Object);Check ($hits.Count -ge 2) 'Quilt has no repeated crossings.'
        for($i=1;$i -lt $hits.Count;$i++){Check ([Math]::Abs($hits[$i]-$hits[$i-1]-$recipe.checks.crossingStep) -lt 1e-8) 'Quilt crossing step differs from its fixture.'}
    }
    Write-Output ($recipe.id+': guide geometry checked')
}
# A sparse segment crossing an exclusion must split, including a reversed path.
foreach($angle in @(0.0,89.0,90.0,135.0)) {
    $paths=Get-AstFillPaths 'hatch' @{bounds=@(0,0,30,20);angle=$angle;spacing=4.0;offset=1.0}
    Check ($paths.Count -gt 1) 'Rotated hatch lost its lanes.'
    foreach($path in $paths){
        $a=$path[0];$b=$path[$path.Count-1]
        $distance=[Math]::Sqrt([Math]::Pow($b[0]-$a[0],2)+[Math]::Pow($b[1]-$a[1],2))
        Check ($distance -le 43.0) 'Near-vertical hatch generated an unbounded guide.'
    }
}
foreach($line in @(@(@(0.0,0.0),@(30.0,0.0)),@(@(30.0,0.0),@(0.0,0.0)))) {
    $parts=Get-AstClippedFillPaths @(,$line) {param($x,$y) $x -lt 10 -or $x -gt 20} 5.0
    Check ($parts.Count -eq 2) 'Clipping bridged an exclusion or lost a valid fragment.'
    foreach($part in $parts){$xs=$part | ForEach-Object {$_[0]};$range=$xs | Measure-Object -Minimum -Maximum;Check ($range.Maximum -lt 10 -or $range.Minimum -gt 20) 'A path crosses the excluded region.'}
}
$short=Get-AstClippedFillPaths @(,@(@(0.0,0.0),@(4.0,0.0))) {param($x,$y) $true} 5.0
Check ($short.Count -eq 0) 'Short-fragment cleanup failed.'
foreach($kind in @('hatch','quilt','flow','spiral')) {
    $rejected=$false;try{Get-AstFillPaths $kind @{spacing=0} | Out-Null}catch{$rejected=$true}
    Check $rejected ($kind+': zero spacing was accepted')
}
Write-Output 'Clipping, direction, short fragments and invalid spacing checked. Stitch fitting is not part of this guide check.'
