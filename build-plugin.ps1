param(
  [string]$Studio = 'C:/Program Files (x86)/OpenDCL Studio/OpenDCL Studio.exe',
  [string]$BricsCAD = 'C:/Program Files/Bricsys/BricsCAD V22 en_US'
)
$ErrorActionPreference = 'Stop'
$stitchRoot = $PSScriptRoot
$stitchSource = Join-Path $stitchRoot 'source/AUTOSTITCH.odcl.json'
$stitchOutput = Join-Path $stitchRoot 'AUTOSTITCH.odcl'
if (-not (Test-Path -LiteralPath $Studio)) { throw "OpenDCL Studio was not found: $Studio" }
if (-not (Test-Path -LiteralPath $stitchSource)) { throw "Palette source was not found: $stitchSource" }
$stitchBuild = Start-Process -FilePath $Studio -ArgumentList @(('"' + $stitchSource + '"'), '/out', ('"' + $stitchOutput + '"')) -WindowStyle Hidden -Wait -PassThru
if ($stitchBuild.ExitCode -ne 0) { throw "OpenDCL conversion failed with exit code $($stitchBuild.ExitCode)." }
if (-not (Test-Path -LiteralPath $stitchOutput)) { throw 'OpenDCL conversion did not produce AUTOSTITCH.odcl.' }
if ((Get-Item -LiteralPath $stitchOutput).Length -eq 0) { throw 'OpenDCL conversion produced an empty file.' }
$stitchCompiler = Join-Path $env:WINDIR 'Microsoft.NET/Framework64/v4.0.30319/csc.exe'
$stitchEvents = Join-Path $stitchRoot 'Autostitch.Events.dll'
$stitchEventSource = Join-Path $stitchRoot 'source/Autostitch.Events.cs'
$stitchBrx = Join-Path $BricsCAD 'BrxMgd.dll'
$stitchTeigha = Join-Path $BricsCAD 'TD_Mgd.dll'
foreach ($stitchRequired in @($stitchCompiler, $stitchBrx, $stitchTeigha)) {
  if (-not (Test-Path -LiteralPath $stitchRequired)) { throw "Event bridge build requires $stitchRequired" }
}
& $stitchCompiler /nologo /target:library "/out:$stitchEvents" "/reference:$stitchBrx" "/reference:$stitchTeigha" $stitchEventSource
if ($LASTEXITCODE -ne 0) { throw "Event bridge compilation failed with exit code $LASTEXITCODE." }
Write-Output "Built $stitchOutput"
Write-Output "Built $stitchEvents"
