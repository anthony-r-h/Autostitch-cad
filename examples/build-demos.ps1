param([switch]$Publish)
$ErrorActionPreference = 'Stop'
$demoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$buildFolder = Join-Path $demoRoot ('output/native/demo-build-' + [Guid]::NewGuid().ToString('N').Substring(0,8))
New-Item -ItemType Directory -Path $buildFolder | Out-Null
$app = [Runtime.InteropServices.Marshal]::GetActiveObject('BricscadApp.AcadApplication.22.0')
if ($null -eq $app) { throw 'Open BricsCAD V22 before building demos.' }

function Assert-Idle {
    if ($app.Documents.Count -gt 0 -and
        ($null -eq $app.ActiveDocument -or -not $app.GetAcadState().IsQuiescent -or $app.ActiveDocument.GetVariable('CMDNAMES') -ne '' -or
         $app.ActiveDocument.GetVariable('CMDACTIVE') -ne 0)) {
        throw 'BricsCAD has an active command or point pick. No input was sent.'
    }
}
function Lisp-String([string]$value) { '"' + $value.Replace('\','/').Replace('"','\"') + '"' }
function Read-Dxf([string]$path) {
    $lines = [IO.File]::ReadAllLines($path)
    $start = -1; $end = -1
    for ($i=0; $i -lt $lines.Length-3; $i+=2) {
        if ($lines[$i] -eq '2' -and $lines[$i+1] -eq 'ENTITIES') { $start=$i+2; break }
    }
    if ($start -lt 0) { throw "No ENTITIES section: $path" }
    for ($i=$start; $i -lt $lines.Length-1; $i+=2) {
        if ($lines[$i] -eq '0' -and $lines[$i+1] -eq 'ENDSEC') { $end=$i; break }
    }
    if ($end -lt 0) { throw "Unclosed ENTITIES section: $path" }
    @{ Header=$lines[0..($start-1)]; Entities=$lines[$start..($end-1)]; Footer=$lines[$end..($lines.Length-1)] }
}

# Reuse the exported guides exactly, translating the three quilting options only.
$quiltLines = [Collections.Generic.List[string]]::new()
$entityHandle=256; $quiltCount=0; $offset=0
foreach ($name in @('quilt-a-bolster','quilt-b-sweep','quilt-c-fan')) {
    $dxf=Read-Dxf (Join-Path $PSScriptRoot ('studies/'+$name+'.dxf'))
    if ($offset -eq 0) { $quiltLines.AddRange([string[]]$dxf.Header) }
    for ($i=0; $i -lt $dxf.Entities.Length; $i+=2) {
        $code=$dxf.Entities[$i]; $value=$dxf.Entities[$i+1]
        if ($code -eq '0') {
            if ($value -ne 'LWPOLYLINE') { throw "Unexpected quilt entity: $value" }
            $quiltCount++
        }
        if ($code -eq '5') { $value=$entityHandle.ToString('X'); $entityHandle++ }
        if ($code -eq '10') {
            $value=([double]::Parse($value,[Globalization.CultureInfo]::InvariantCulture)+$offset).ToString('0.####',[Globalization.CultureInfo]::InvariantCulture)
        }
        $quiltLines.Add($code);$quiltLines.Add($value)
    }
    $offset+=270
}
$quiltLines.AddRange([string[]]$dxf.Footer)
[IO.File]::WriteAllLines((Join-Path $buildFolder 'quilting-source.dxf'),$quiltLines,[Text.UTF8Encoding]::new($false))
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'studies/banner-a.dxf') -Destination (Join-Path $buildFolder 'can-you-really-source.dxf')
$bannerCount=(@(Read-Dxf (Join-Path $buildFolder 'can-you-really-source.dxf')).Entities | Where-Object { $_ -eq 'LWPOLYLINE' }).Count

function Build-Drawing([string]$name,[string]$source,[string]$body) {
    Assert-Idle
    if ($source) { $document=$app.Documents.Open((Join-Path $buildFolder $source)) }
    else { $document=$app.Documents.Add() }
    if ($null -eq $document) { throw "BricsCAD could not open the source for $name." }
    $target=Join-Path $buildFolder ($name+'.dwg')
    # A document opened from DXF otherwise retains its DXF save type.
    $document.SaveAs($target,64) # ac2018_dwg
    $report=Join-Path $buildFolder ($name+'.txt')
    $driver=Join-Path $buildFolder ($name+'.lsp')
    $lisp = @"
(load $(Lisp-String (Join-Path $demoRoot 'AUTOSTITCH.lsp')))
(ast:load-components)
(setq demo:report (open $(Lisp-String $report) "w"))
(setq demo:result (vl-catch-all-apply '(lambda ()
  (ast:cad-require (= (strcase (vl-string-translate (chr 92) "/" (strcat (getvar "DWGPREFIX") (getvar "DWGNAME")))) (strcase $(Lisp-String $target))) "Unexpected build drawing.")
  (setvar "INSUNITS" 4)
  $body
  (setvar "UCSICON" 0)
  (vl-cmdf "_.QSAVE")
  (write-line (strcat "UNITS " (itoa (getvar "INSUNITS"))) demo:report)
  (write-line "DONE" demo:report)) nil))
(if (vl-catch-all-error-p demo:result)
  (write-line (strcat "FAIL " (vl-catch-all-error-message demo:result) " " (if ast:*cad-error* ast:*cad-error* "")) demo:report))
(close demo:report)(princ)
"@
    [IO.File]::WriteAllText($driver,$lisp,[Text.UTF8Encoding]::new($false))
    Assert-Idle
    $document.SendCommand('(load '+(Lisp-String $driver)+')'+"`n")
    $deadline=[DateTime]::UtcNow.AddMinutes(3)
    do {
        Start-Sleep -Milliseconds 250
        $evidence=if(Test-Path -LiteralPath $report){[IO.File]::ReadAllText($report)}else{''}
    } until ($evidence -match '(?m)^(DONE|FAIL)' -or [DateTime]::UtcNow -gt $deadline)
    if ($evidence -notmatch '(?m)^DONE' -or $evidence -match '(?m)^FAIL') {
        throw "Build did not complete for $name. Report: $report`n$evidence"
    }
    Write-Output "$name built: $target"
    Write-Output $evidence.Trim()
}

$emblemBody=@'
  (load (strcat ast:*home* "/examples/showcase.lsp"))
  (c:ASTSHOWCASEARTMORE)
  (setq demo:guides (ssget "_X" '((0 . "LWPOLYLINE") (8 . "SHOWCASE_GUIDES"))) demo:i 0 demo:landmarks 0)
  (repeat (sslength demo:guides)
    (setq demo:landmarks (+ demo:landmarks (length (ast:cad-get 'landmarks (ast:cad-read (ssname demo:guides demo:i))))) demo:i (1+ demo:i)))
  (ast:cad-require (and (= 15 (sslength demo:guides)) (= 21 demo:landmarks)) "Unexpected emblem guide or landmark count.")
  (write-line "GUIDES 15; LANDMARKS 21; UNSTITCHED" demo:report)
  (vl-cmdf "_.-LAYER" "_OFF" "AUTOSTITCH_UI" "")
  (vl-cmdf "_.ZOOM" "_W" '(333.0 -120.9290248733575) '(589.0 135.0709751266425))
  (vl-cmdf "_.-VIEW" "_Save" "EMBLEM")
'@
Build-Drawing 'emblem' '' $emblemBody
$quiltBody=@"
  (ast:cad-require (= $quiltCount (sslength (ssget "_X" '((0 . "LWPOLYLINE") (8 . "STUDY_GUIDES"))))) "Unexpected quilting guide count.")
  (foreach demo:view '(("A-BOLSTER" 0.0) ("B-SWEEP" 270.0) ("C-FAN" 540.0))
    (entmakex (list '(0 . "TEXT") '(8 . "0") (cons 10 (list (+ 8.0 (cadr demo:view)) 250.0 0.0)) '(40 . 5.0) (cons 1 (car demo:view))))
    (vl-cmdf "_.ZOOM" "_W" (list (cadr demo:view) 0.0) (list (+ 240.0 (cadr demo:view)) 260.0))
    (vl-cmdf "_.-VIEW" "_Save" (car demo:view)))
  (vl-cmdf "_.ZOOM" "_E")
  (vl-cmdf "_.-VIEW" "_Save" "ALL")
  (write-line "GUIDES $quiltCount; VIEWS A-BOLSTER B-SWEEP C-FAN; UNSTITCHED" demo:report)
"@
Build-Drawing 'quilting' 'quilting-source.dxf' $quiltBody
$bannerBody=@"
  (ast:cad-require (= $bannerCount (sslength (ssget "_X" '((0 . "LWPOLYLINE"))))) "Unexpected banner path count.")
  (vl-cmdf "_.ZOOM" "_E")
  (vl-cmdf "_.-VIEW" "_Save" "VELVET")
  (write-line "PATHS $bannerCount; VELVET; UNSTITCHED" demo:report)
"@
Build-Drawing 'can-you-really' 'can-you-really-source.dxf' $bannerBody

if ($Publish) {
    $destination=Join-Path $PSScriptRoot 'demos'
    New-Item -ItemType Directory -Force -Path $destination | Out-Null
    foreach ($document in $app.Documents) {
        if ($document.FullName -and [IO.Path]::GetFullPath($document.FullName).StartsWith($destination+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)) {
            throw 'A canonical demo is open in BricsCAD. Close it before publishing; no canonical files were replaced.'
        }
    }
    foreach ($name in @('emblem','quilting','can-you-really')) {
        Copy-Item -LiteralPath (Join-Path $buildFolder ($name+'.dwg')) -Destination (Join-Path $destination ($name+'.dwg'))
    }
    Write-Output 'Published examples/demos/emblem.dwg, quilting.dwg and can-you-really.dwg.'
}
Write-Output "Build reports: $buildFolder"
