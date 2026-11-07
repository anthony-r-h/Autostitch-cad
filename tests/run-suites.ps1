param(
  [string]$DrawingName = 'Autostitch-native.dwg',
  [ValidateRange(1, 3600)][int]$TimeoutSeconds = 180
)
$ErrorActionPreference = 'Stop'
$stitchRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$stitchOutput = Join-Path $stitchRoot 'output/native'
New-Item -ItemType Directory -Path $stitchOutput -Force | Out-Null
$stitchLispRoot = $stitchRoot.Replace('\', '/').Replace('"', '\"')
$stitchScript = Join-Path $stitchOutput 'all-suites.lsp'
$stitchReport = Join-Path $stitchOutput 'all-suites.txt'
$stitchSuites = @(
  'AST:G-TESTS', 'AST:N-TESTS', 'AST:CAD-TESTS', 'AST:CAD-LIFECYCLE-TESTS',
  'AST:CAD-REPAIR-TESTS', 'AST:CAD-CORRESPONDENCE-TESTS', 'AST:CAD-RANGE-TESTS',
  'AST:CAD-CONNECTED-TESTS', 'AST:CAD-MISSING-TESTS', 'AST:MARKER-TESTS', 'AST:HOST-TESTS',
  'AST:DISPLAY-TESTS'
)
if (Test-Path -LiteralPath $stitchReport) { Remove-Item -LiteralPath $stitchReport }
$stitchDriver = @'
(setq ast:suite-file (open "@ROOT@/output/native/all-suites.txt" "w"))
(setq ast:suite-load-failed nil ast:suite-failed nil ast:suite-completed 0)
(foreach ast:suite-path '("source/autostitch-geometry.lsp" "source/autostitch-network.lsp"
    "source/autostitch-cad.lsp" "source/autostitch-markers.lsp"
    "tests/autostitch-geometry-tests.lsp" "tests/autostitch-network-tests.lsp"
    "tests/autostitch-cad-tests.lsp" "tests/autostitch-connected-tests.lsp"
    "tests/autostitch-marker-tests.lsp" "tests/autostitch-host-tests.lsp"
    "tests/autostitch-display-tests.lsp")
  (setq ast:suite-result (vl-catch-all-apply 'load (list (strcat "@ROOT@/" ast:suite-path))))
  (if (vl-catch-all-error-p ast:suite-result)
    (progn
      (setq ast:suite-load-failed T)
      (write-line (strcat "LOAD FAIL " ast:suite-path " " (vl-catch-all-error-message ast:suite-result)) ast:suite-file))
    (write-line (strcat "LOAD PASS " ast:suite-path) ast:suite-file)))
(if (not ast:suite-load-failed)
  (foreach ast:suite-name '(@SUITES@)
    (setq ast:*cad-fail-stage* nil ast:suite-result (vl-catch-all-apply ast:suite-name nil)
          ast:suite-completed (1+ ast:suite-completed) ast:suite-pass nil)
    (if (vl-catch-all-error-p ast:suite-result)
      (setq ast:suite-detail (vl-catch-all-error-message ast:suite-result))
      (progn
        (setq ast:suite-detail (vl-prin1-to-string ast:suite-result))
        (if (and (listp ast:suite-result) (null (cdr (assoc 'failures ast:suite-result))))
          (setq ast:suite-pass
            (if (assoc 'ok ast:suite-result) (eq T (cdr (assoc 'ok ast:suite-result)))
              (and (numberp (cdr (assoc 'failed ast:suite-result)))
                   (= 0 (cdr (assoc 'failed ast:suite-result)))))))))
    (if (not ast:suite-pass) (setq ast:suite-failed T))
    (write-line (strcat (vl-symbol-name ast:suite-name) (if ast:suite-pass " PASS " " FAIL ")
                       ast:suite-detail) ast:suite-file)))
(setq ast:*cad-fail-stage* nil)
(write-line (strcat "DONE " (if (or ast:suite-load-failed ast:suite-failed) "FAIL " "PASS ")
                   (itoa ast:suite-completed)) ast:suite-file)
(close ast:suite-file)
(princ)
'@
$stitchDriver.Replace('@ROOT@', $stitchLispRoot).Replace('@SUITES@', ($stitchSuites -join ' ')) |
  Set-Content -LiteralPath $stitchScript -Encoding UTF8
& (Join-Path $PSScriptRoot 'run-native.ps1') -ScriptPath $stitchScript -DrawingName $DrawingName
$stitchDeadline = [DateTime]::UtcNow.AddSeconds($TimeoutSeconds)
$stitchResults = @()
$stitchReadError = $null
do {
  if (Test-Path -LiteralPath $stitchReport) {
    try { $stitchResults = @(Get-Content -LiteralPath $stitchReport -ErrorAction Stop) }
    catch [System.IO.IOException] { $stitchReadError = $_.Exception.Message }
  }
  if ($stitchResults -match '^DONE (PASS|FAIL) \d+$') { break }
  Start-Sleep -Milliseconds 200
} while ([DateTime]::UtcNow -lt $stitchDeadline)
$stitchResults
if ($stitchResults.Count -eq 0 -or $stitchResults[-1] -ne "DONE PASS $($stitchSuites.Count)" -or
    ($stitchResults -match ' FAIL ')) {
  if ($stitchReadError) { Write-Output "Last report read error: $stitchReadError" }
  throw 'Native suite failed, could not load its files, or did not finish with a complete DONE report.'
}
foreach ($stitchSuite in $stitchSuites) {
  if (@($stitchResults -match ('^' + [regex]::Escape($stitchSuite) + ' PASS ')).Count -ne 1) {
    throw "Native suite result is missing or duplicated: $stitchSuite"
  }
}
