param([string]$DrawingName = 'Autostitch-native.dwg')
$ErrorActionPreference = 'Stop'
$stitchRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$stitchOutput = Join-Path $stitchRoot 'output/native'
New-Item -ItemType Directory -Path $stitchOutput -Force | Out-Null
$stitchLispRoot = $stitchRoot.Replace('\', '/').Replace('"', '\"')
$stitchScript = Join-Path $stitchOutput 'all-suites.lsp'
$stitchReport = Join-Path $stitchOutput 'all-suites.txt'
if (Test-Path -LiteralPath $stitchReport) { Remove-Item -LiteralPath $stitchReport }
$stitchDriver = @'
(load "@ROOT@/source/autostitch-geometry.lsp")
(load "@ROOT@/source/autostitch-cad.lsp")
(load "@ROOT@/tests/autostitch-geometry-tests.lsp")
(load "@ROOT@/tests/autostitch-cad-tests.lsp")
(load "@ROOT@/tests/autostitch-host-tests.lsp")
(setq ast:suite-file (open "@ROOT@/output/native/all-suites.txt" "w"))
(foreach ast:suite-name '(ast:g-tests ast:cad-tests ast:cad-lifecycle-tests ast:cad-repair-tests ast:cad-correspondence-tests ast:cad-range-tests ast:host-tests)
  (setq ast:suite-result (vl-catch-all-apply ast:suite-name nil))
  (write-line (strcat (vl-symbol-name ast:suite-name) " "
    (if (vl-catch-all-error-p ast:suite-result)
      (strcat "FAIL " (vl-catch-all-error-message ast:suite-result))
      (strcat (if (or (cdr (assoc 'ok ast:suite-result))
                      (equal 0 (cdr (assoc 'failed ast:suite-result)))) "PASS " "FAIL ")
              (vl-prin1-to-string ast:suite-result)))) ast:suite-file))
(close ast:suite-file)
(princ)
'@
$stitchDriver.Replace('@ROOT@', $stitchLispRoot) | Set-Content -LiteralPath $stitchScript -Encoding UTF8
& (Join-Path $PSScriptRoot 'run-native.ps1') -ScriptPath $stitchScript -DrawingName $DrawingName
if (-not (Test-Path -LiteralPath $stitchReport)) { throw 'BricsCAD did not produce a suite report.' }
$stitchResults = Get-Content -LiteralPath $stitchReport
$stitchResults
if ($stitchResults.Count -ne 7 -or ($stitchResults -match ' FAIL ')) { throw 'Native suite failed or did not finish.' }
