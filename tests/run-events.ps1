param([string]$DrawingName = 'Autostitch-native.dwg', [int]$TimeoutSeconds = 45)
$ErrorActionPreference = 'Stop'
$stitchRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$stitchOutput = Join-Path $stitchRoot 'output/native'
New-Item -ItemType Directory -Path $stitchOutput -Force | Out-Null
$stitchId = [Guid]::NewGuid().ToString('N').Substring(0, 10)
$stitchPrefix = Join-Path $stitchOutput "events-$stitchId"
$stitchReport = "$stitchPrefix.txt"
$stitchHandles = "$stitchPrefix.handles"
$stitchLayer = "AST_EVENT_$stitchId"
$stitchApp = [Runtime.InteropServices.Marshal]::GetActiveObject('BricscadApp.AcadApplication.22.0')
$stitchDocument = $null
$stitchAllowed = [IO.Path]::GetFullPath($stitchOutput) + [IO.Path]::DirectorySeparatorChar
foreach ($candidate in $stitchApp.Documents) {
  if ($candidate.Name -eq $DrawingName -and [IO.Path]::GetFullPath($candidate.FullName).StartsWith($stitchAllowed, [StringComparison]::OrdinalIgnoreCase)) {
    $stitchDocument = $candidate
  }
}
if ($null -eq $stitchDocument) { throw "Open the isolated drawing under output/native first: $DrawingName" }

function ConvertTo-LispPath([string]$Path) { $Path.Replace('\', '/').Replace('"', '\"') }
function Assert-Event([bool]$Condition, [string]$Label) {
  $line = $(if ($Condition) { 'PASS ' } else { 'FAIL ' }) + $Label
  Add-Content -LiteralPath $stitchReport -Value $line
  Write-Output $line
  if (-not $Condition) { throw $Label }
}
function Wait-EventIdle {
  $deadline = [DateTime]::UtcNow.AddSeconds($TimeoutSeconds)
  do {
    Start-Sleep -Milliseconds 100
    if ($stitchDocument.GetVariable('CMDNAMES') -eq '' -and $stitchApp.GetAcadState().IsQuiescent) { return }
  } while ([DateTime]::UtcNow -lt $deadline)
  throw 'Native event test command did not finish before the timeout.'
}
function Assert-EventDocument {
  if ($stitchApp.ActiveDocument.FullName -ne $stitchDocument.FullName) { throw 'Active drawing changed; no further test input was sent.' }
  if ($stitchDocument.GetVariable('CMDNAMES') -ne '') { throw 'The test drawing has an active command; no input was sent.' }
}
function Invoke-EventCommand([string]$Text) {
  Assert-EventDocument
  $stitchDocument.SendCommand($Text + "`n")
  Wait-EventIdle
}
function Invoke-EventLisp([string]$Body, [string]$Suffix) {
  $path = "$stitchPrefix-$Suffix.lsp"
  $done = "$stitchPrefix-$Suffix.done"
  $tail = '(setq ast:event-done (open "' + (ConvertTo-LispPath $done) + '" "w"))' + "`n" + '(write-line "DONE" ast:event-done)(close ast:event-done)(princ)'
  ($Body + "`n" + $tail) | Set-Content -LiteralPath $path -Encoding UTF8
  & (Join-Path $PSScriptRoot 'run-native.ps1') -ScriptPath $path -DrawingName $DrawingName
  Wait-EventIdle
  if (-not (Test-Path -LiteralPath $done)) { throw "LISP stage did not finish: $Suffix" }
}
function Get-EventObject([string]$Handle) {
  $stitchDocument.HandleToObject($Handle)
}
function Get-EventState {
  $live = New-Object 'System.Collections.Generic.HashSet[string]'
  foreach ($entity in $stitchDocument.ModelSpace) { [void]$live.Add([string]$entity.Handle) }
  $states = foreach ($pair in $stitchPairs) {
    $guide = $null; $helper = $null
    if ($live.Contains($pair[0])) { $guide = Get-EventObject $pair[0] }
    if ($live.Contains($pair[1])) { $helper = Get-EventObject $pair[1] }
    $start = $null; $end = $null; $name = $null; $centres = @()
    if ($null -ne $guide) {
      $start = @($guide.StartPoint); $end = @($guide.EndPoint)
    }
    if ($null -ne $helper) {
      $name = $helper.Name
      foreach ($entity in $stitchDocument.Blocks.Item($name)) {
        if ($entity.ObjectName -eq 'AcDbCircle') { $centres += ,@($entity.Center) }
      }
    }
    [pscustomobject]@{ SourceExists = ($null -ne $guide); HelperExists = ($null -ne $helper); Start = $start; End = $end; Name = $name; Centres = $centres }
  }
  @($states)
}
function Test-EventPoint($Actual, [double]$X, [double]$Y) {
  ($null -ne $Actual -and $Actual.Count -eq 3 -and [Math]::Abs($Actual[0] - $X) -lt 1e-7 -and [Math]::Abs($Actual[1] - $Y) -lt 1e-7 -and [Math]::Abs($Actual[2]) -lt 1e-7)
}
function Assert-EventGeometry([string]$Label, [double]$StartX, [double]$EndX, [bool]$HelpersCurrent = $true) {
  $states = @(Get-EventState)
  for ($i = 0; $i -lt 2; $i++) {
    $state = $states[$i]; $y = 1000.0 + 20.0 * $i
    Assert-Event ($state.SourceExists -and (Test-EventPoint $state.Start $StartX $y) -and (Test-EventPoint $state.End $EndX $y)) "$Label source $($i + 1) endpoints"
    if ($HelpersCurrent) {
      $starts = @($state.Centres | Where-Object { Test-EventPoint $_ $StartX $y })
      $ends = @($state.Centres | Where-Object { Test-EventPoint $_ $EndX $y })
      Assert-Event ($state.HelperExists -and $state.Centres.Count -eq 2 -and $starts.Count -eq 1 -and $ends.Count -eq 1) "$Label helper $($i + 1) follows source exactly"
    }
  }
}

$stitchStarted = $false
try {
  $rootLisp = ConvertTo-LispPath $stitchRoot
  $setup = @'
(load "@ROOT@/AUTOSTITCH.lsp")
(setq ast:*home* "@ROOT@")
(if (not (ast:load-components)) (exit))
(load "@ROOT@/tests/autostitch-event-tests.lsp")
(setq ast:event-report "@REPORT@" ast:event-handles "@HANDLES@" ast:event-layer "@LAYER@")
(ast:event-setup)
'@
  $stitchStarted = $true
  Invoke-EventLisp ($setup.Replace('@ROOT@', $rootLisp).Replace('@REPORT@', (ConvertTo-LispPath $stitchReport)).Replace('@HANDLES@', (ConvertTo-LispPath $stitchHandles)).Replace('@LAYER@', $stitchLayer)) 'setup'
  $stitchPairs = @(Get-Content -LiteralPath $stitchHandles | ForEach-Object { ,($_ -split '\|') })
  Assert-Event ($stitchPairs.Count -eq 2) 'Captured two source/helper handle pairs'
  Assert-EventGeometry 'Initial' 1000 1060
  $selection = '(ssadd (handent "' + $stitchPairs[1][0] + '") (ssadd (handent "' + $stitchPairs[0][0] + '")))'
  $basePoint = '(trans ''(0.0 0.0 0.0) 0 1)'
  Invoke-EventCommand ("_.MOVE`n" + $selection + "`n`n_non`n" + $basePoint + "`n_non`n" + '(trans ''(5.0 0.0 0.0) 0 1)')
  Assert-EventGeometry 'MOVE' 1005 1065
  Invoke-EventCommand '_.U'
  Assert-EventGeometry 'MOVE Undo' 1000 1060
  Invoke-EventCommand 'ASTENABLEEVENTSV1'
  Assert-EventGeometry 'Event bootstrap preserves Undo state' 1000 1060
  Invoke-EventCommand '_.REDO'
  Assert-EventGeometry 'MOVE Redo' 1005 1065

  # Native crossing selection, restricted to this run's two source LINEs.
  $crossing = '(ssget "_C" (trans ''(1064.0 995.0 0.0) 0 1) (trans ''(1066.0 1025.0 0.0) 0 1) ''((0 . "LINE") (8 . "' + $stitchLayer + '")))'
  Invoke-EventCommand ("_.STRETCH`n" + $crossing + "`n`n_non`n" + $basePoint + "`n_non`n" + '(trans ''(6.0 0.0 0.0) 0 1)')
  Assert-EventGeometry 'STRETCH' 1005 1071
  Invoke-EventCommand '_.U'
  Assert-EventGeometry 'STRETCH Undo' 1005 1065
  Invoke-EventCommand '_.REDO'
  Assert-EventGeometry 'STRETCH Redo' 1005 1071

  Invoke-EventCommand ("_.ERASE`n" + $selection + "`n")
  foreach ($state in @(Get-EventState)) { Assert-Event (-not $state.SourceExists -and -not $state.HelperExists) 'ERASE removes source and its helper' }
  Invoke-EventCommand '_.U'
  Assert-EventGeometry 'ERASE Undo' 1005 1071
  Invoke-EventCommand '_.REDO'
  foreach ($state in @(Get-EventState)) { Assert-Event (-not $state.SourceExists -and -not $state.HelperExists) 'ERASE Redo removes source and its helper' }
  Invoke-EventCommand '_.U'
  Assert-EventGeometry 'Before failure' 1005 1071

  Invoke-EventLisp '(ast:event-arm-failure)' 'arm-failure'
  $beforeFailure = @(Get-EventState) | ConvertTo-Json -Depth 8 -Compress
  Invoke-EventCommand ("_.MOVE`n" + $selection + "`n`n_non`n" + $basePoint + "`n_non`n" + '(trans ''(9.0 0.0 0.0) 0 1)')
  Assert-EventGeometry 'Failed callback retains native MOVE' 1014 1080 $false
  $afterFailure = @(Get-EventState)
  foreach ($state in $afterFailure) {
    Assert-Event ($state.HelperExists -and $state.Centres.Count -eq 2) 'Failed callback retains each prior complete helper'
  }
  Invoke-EventCommand '_.U'
  Assert-EventGeometry 'Failed callback MOVE Undo' 1005 1071
  Assert-Event ((@(Get-EventState) | ConvertTo-Json -Depth 8 -Compress) -eq $beforeFailure) 'One Undo restores both complete source/helper states after failed callback'
  Invoke-EventCommand '_.REDO'
  Assert-EventGeometry 'Failed callback MOVE Redo' 1014 1080 $false
  # Reporting LOAD is deliberately after the uninterrupted edit/Undo/Redo sequence.
  Invoke-EventLisp '(ast:event-check-rollback)' 'check-rollback'
  $results = @(Get-Content -LiteralPath $stitchReport)
  if ($results -match '^FAIL ') { throw 'Native event qualification reported a failure.' }
  Write-Output "PASS Native event qualification completed. Report: $stitchReport"
} catch {
  Add-Content -LiteralPath $stitchReport -Value ('FAIL Harness: ' + $_.Exception.Message)
  throw
} finally {
  if ($stitchStarted) {
    try {
      Assert-EventDocument
      Invoke-EventLisp '(if (boundp ''ast:event-original-inject) (ast:event-cleanup))' 'cleanup'
    } catch {
      $cleanupFailure = 'Event test cleanup could not run; restore ast:cad-inject before continuing: ' + $_.Exception.Message
      Add-Content -LiteralPath $stitchReport -Value ('FAIL ' + $cleanupFailure)
      throw $cleanupFailure
    }
  }
}
