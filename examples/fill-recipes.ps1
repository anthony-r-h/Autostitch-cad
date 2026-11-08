# Guide recipes shared by the artwork studies and fill fixtures. No CAD writes.
function Get-AstFillPaths([string]$Kind, [hashtable]$Config) {
    $paths=[Collections.Generic.List[object]]::new()
    if($Kind -in @('hatch','quilt','flow','spiral')) {
        if(-not $Config.ContainsKey('spacing') -or $Config.spacing -le 0){throw 'Fill spacing must be positive.'}
    }
    if($Kind -in @('hatch','quilt','flow')) {
        $xmin,$ymin,$xmax,$ymax=$Config.bounds
        if($xmax -le $xmin -or $ymax -le $ymin){throw 'Fill bounds must have positive width and height.'}
    }
    switch($Kind) {
        {$_ -in @('hatch','quilt')} {
            $angles=if($Kind -eq 'quilt'){@($Config.angle,-$Config.angle)}else{@($Config.angle)}
            if($Kind -eq 'quilt' -and [Math]::Abs([Math]::Sin(2*$Config.angle*[Math]::PI/180)) -lt 1e-8){throw 'Quilt directions must cross.'}
            foreach($angle in $angles) {
                $a=$angle*[Math]::PI/180;$nx=-[Math]::Sin($a);$ny=[Math]::Cos($a)
                $values=@(($nx*$xmin+$ny*$ymin),($nx*$xmax+$ny*$ymin),($nx*$xmin+$ny*$ymax),($nx*$xmax+$ny*$ymax))
                $extent=$values | Measure-Object -Minimum -Maximum
                $phase=if($Config.ContainsKey('offset')){[double]$Config.offset}else{0.0}
                $first=[Math]::Floor(($extent.Minimum-$phase)/$Config.spacing)
                $last=[Math]::Ceiling(($extent.Maximum-$phase)/$Config.spacing)
                for($row=$first;$row -le $last;$row++) {
                    $offset=$phase+$row*$Config.spacing
                    $points=[Collections.Generic.List[object]]::new()
                    # Sampling is for clipping artwork, not a curve-fit tolerance.
                    for($i=0;$i -le 650;$i++) {
                        if([Math]::Abs($ny) -ge [Math]::Abs($nx)) {
                            $x=$xmin+($xmax-$xmin)*$i/650;$y=($offset-$nx*$x)/$ny
                        } else {
                            $y=$ymin+($ymax-$ymin)*$i/650;$x=($offset-$ny*$y)/$nx
                        }
                        $points.Add(@([double]$x,[double]$y))
                    }
                    $paths.Add($points.ToArray())
                }
            }
        }
        'flow' {
            if($Config.wavelength -le 0 -or $Config.phaseLength -le 0){throw 'Flow wavelength and phase length must be positive.'}
            for($row=$ymin;$row -le $ymax;$row+=$Config.spacing) {
                $points=[Collections.Generic.List[object]]::new()
                for($i=0;$i -le 750;$i++) {
                    $x=$xmin+($xmax-$xmin)*$i/750
                    $y=$row+$Config.amplitude*[Math]::Sin(2*[Math]::PI*$x/$Config.wavelength+$row/$Config.phaseLength)
                    $points.Add(@([double]$x,[double]$y))
                }
                $paths.Add($points.ToArray())
            }
        }
        'spiral' {
            if($Config.innerRadius -le 0 -or $Config.halfTurns -lt 1 -or $Config.halfTurns -ne [int]$Config.halfTurns){throw 'Spiral needs a positive inner radius and a whole number of half-turns.'}
            $points=[Collections.Generic.List[object]]::new()
            for($turn=0;$turn -lt $Config.halfTurns;$turn++) {
                $radius=$Config.innerRadius+$turn*$Config.spacing/2
                $cx=$Config.center[0]+($turn%2)*$Config.spacing/2
                $cy=$Config.center[1];$start=($turn%2)*[Math]::PI
                $steps=[int][Math]::Ceiling([Math]::PI*$radius/0.25)
                for($i=$(if($turn){1}else{0});$i -le $steps;$i++) {
                    $a=$start+[Math]::PI*$i/$steps
                    $points.Add(@(($cx+$radius*[Math]::Cos($a)),($cy+$radius*[Math]::Sin($a))))
                }
            }
            $paths.Add($points.ToArray())
        }
        'maze' {
            if($Config.order -lt 1 -or $Config.order -gt 5 -or $Config.order -ne [int]$Config.order -or $Config.cellSize -le 0){throw 'Maze needs order 1 to 5 and a positive cell size.'}
            # Deterministic quarter-turn meander. Each grid site is visited once.
            $n=[int][Math]::Pow(2,$Config.order)
            $points=[Collections.Generic.List[object]]::new()
            for($index=0;$index -lt $n*$n;$index++) {
                $x=0;$y=0;$remaining=$index
                for($size=1;$size -lt $n;$size*=2) {
                    $rx=1 -band [int][Math]::Floor($remaining/2)
                    $ry=1 -band ($remaining -bxor $rx)
                    if($ry -eq 0) {
                        if($rx -eq 1){$x=$size-1-$x;$y=$size-1-$y}
                        $swap=$x;$x=$y;$y=$swap
                    }
                    $x+=$size*$rx;$y+=$size*$ry
                    $remaining=[int][Math]::Floor($remaining/4)
                }
                $points.Add(@(($Config.origin[0]+$x*$Config.cellSize),($Config.origin[1]+$y*$Config.cellSize)))
            }
            $paths.Add($points.ToArray())
        }
        default { throw "Unknown fill recipe: $Kind" }
    }
    return ,$paths.ToArray()
}

function Get-AstClippedFillPaths($Paths, [scriptblock]$Inside, [double]$MinimumLength = 5.0) {
    if($MinimumLength -lt 0){throw 'Minimum fragment length cannot be negative.'}
    $answer=[Collections.Generic.List[object]]::new()
    foreach($path in $Paths) {
        $run=[Collections.Generic.List[object]]::new();$length=0.0
        # Sample sparse straight legs too, so exclusions are sampled along maze legs.
        $sampled=[Collections.Generic.List[object]]::new()
        $sampled.Add($path[0])
        for($i=1;$i -lt $path.Count;$i++) {
            $a=$path[$i-1];$b=$path[$i];$dx=$b[0]-$a[0];$dy=$b[1]-$a[1]
            $distance=[Math]::Sqrt($dx*$dx+$dy*$dy)
            if($distance -le 0.5){$sampled.Add($b)}
            else {
                $steps=[Math]::Ceiling($distance/0.25)
                for($j=1;$j -le $steps;$j++) {$sampled.Add(@(($a[0]+$dx*$j/$steps),($a[1]+$dy*$j/$steps)))}
            }
        }
        foreach($p in $sampled) {
            if(& $Inside $p[0] $p[1]) {
                if($run.Count){$last=$run[$run.Count-1];$length += [Math]::Sqrt([Math]::Pow($p[0]-$last[0],2)+[Math]::Pow($p[1]-$last[1],2))}
                $run.Add($p)
            } else {
                if($run.Count -gt 1 -and $length -ge $MinimumLength){$answer.Add($run.ToArray())}
                $run.Clear();$length=0.0
            }
        }
        if($run.Count -gt 1 -and $length -ge $MinimumLength){$answer.Add($run.ToArray())}
    }
    return ,$answer.ToArray()
}
