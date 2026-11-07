param([string]$Studio = 'C:/Program Files (x86)/OpenDCL Studio/OpenDCL Studio.exe')
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
Write-Output "Built $stitchOutput"
