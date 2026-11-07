param(
  [Parameter(Mandatory=$true)][string]$ScriptPath,
  [string]$DrawingName = 'Autostitch-native.dwg'
)
$ErrorActionPreference = 'Stop'
$stitchRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$stitchScript = (Resolve-Path -LiteralPath $ScriptPath).Path
if (-not $stitchScript.StartsWith($stitchRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
  throw 'Native test scripts must be inside this repository.'
}
$stitchTestRoot = [IO.Path]::GetFullPath((Join-Path $stitchRoot 'output/native')) + [IO.Path]::DirectorySeparatorChar
$stitchApp = [Runtime.InteropServices.Marshal]::GetActiveObject('BricscadApp.AcadApplication.22.0')
$stitchDocument = $null
foreach ($candidate in $stitchApp.Documents) {
  if ($candidate.Name -eq $DrawingName -and [IO.Path]::GetFullPath($candidate.FullName).StartsWith($stitchTestRoot, [StringComparison]::OrdinalIgnoreCase)) {
    $stitchDocument = $candidate
  }
}
if ($null -eq $stitchDocument) { throw "Open the test drawing under output/native first: $DrawingName" }
$stitchDocument.Activate()
if ($stitchDocument.GetVariable('CMDNAMES') -ne '' -or -not $stitchApp.GetAcadState().IsQuiescent) {
  throw 'The test drawing has an active command or point pick; no input was sent.'
}
$stitchLispPath = $stitchScript.Replace('\', '/').Replace('"', '\"')
$stitchDocument.SendCommand('(load "' + $stitchLispPath + '")' + "`n")
Write-Output "Executed $stitchScript in $DrawingName"
