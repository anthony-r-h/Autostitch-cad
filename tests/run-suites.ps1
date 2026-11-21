param(
  [string]$DrawingName = 'Autostitch-native.dwg',
  [ValidateRange(1, 3600)][int]$TimeoutSeconds = 180,
  [switch]$IncludeUi,
  [string[]]$Suite,
  [switch]$List
)
$ErrorActionPreference = 'Stop'
$stitchRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$stitchOutput = Join-Path $stitchRoot 'output/native'
$stitchCatalog = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'cases.json') -Raw | ConvertFrom-Json
if ($Suite) {
  foreach ($stitchId in $Suite) {
    $stitchMatch = @($stitchCatalog.suites | Where-Object { $_.id -eq $stitchId -and $_.runner -in @('suite', 'ui') })
    if ($stitchMatch.Count -ne 1) { throw "Unknown or separately driven suite '$stitchId'. Use -List for available suites." }
  }
  $stitchSelected = @($stitchCatalog.suites | Where-Object { $_.id -in $Suite })
} else {
  $stitchSelected = @($stitchCatalog.suites | Where-Object {
    $_.runner -eq 'suite' -or ($IncludeUi -and $_.runner -eq 'ui')
  })
}
if ($List) {
  $stitchCatalog.suites | Where-Object { $_.runner -in @('suite', 'ui') } | Select-Object id, title, runner
  return
}
$stitchSuites = @($stitchSelected | ForEach-Object { $_.entrypoint.ToUpperInvariant() })
$IncludeUi = @($stitchSelected | Where-Object { $_.runner -eq 'ui' }).Count -gt 0
New-Item -ItemType Directory -Path $stitchOutput -Force | Out-Null
$stitchLispRoot = $stitchRoot.Replace('\', '/').Replace('"', '\"')
$stitchRun = 'suites-' + [Guid]::NewGuid().ToString('N').Substring(0, 10)
$stitchScript = Join-Path $stitchOutput ($stitchRun + '.lsp')
$stitchReport = Join-Path $stitchOutput ($stitchRun + '.txt')
$stitchLoads = @($stitchCatalog.nativeLoads)
if ($IncludeUi) { $stitchLoads = @('AUTOSTITCH.lsp') + $stitchLoads }
$stitchLoadForms = ($stitchLoads | ForEach-Object { '"' + $_ + '"' }) -join ' '
$stitchDriver = @'
(setq ast:suite-file (open "@ROOT@/output/native/@RUN@.txt" "w"))
(setq ast:suite-load-failed nil ast:suite-failed nil ast:suite-completed 0)
(foreach ast:suite-path '(@LOADS@)
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
        (if (and (listp ast:suite-result) (assoc 'failures ast:suite-result)
                 (null (cdr (assoc 'failures ast:suite-result)))
                 (vl-some '(lambda (key) (and (numberp (cdr (assoc key ast:suite-result)))
                   (> (cdr (assoc key ast:suite-result)) 0))) '(checks count passed)))
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
$stitchDriver.Replace('@RUN@', $stitchRun).Replace('@ROOT@', $stitchLispRoot).Replace('@SUITES@', ($stitchSuites -join ' ')).Replace('@LOADS@', $stitchLoadForms) |
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
Write-Output "Report: $stitchReport"
if ($stitchResults.Count -eq 0 -or $stitchResults[-1] -ne "DONE PASS $($stitchSuites.Count)" -or
    ($stitchResults -match ' FAIL ')) {
  $stitchResults
  if ($stitchReadError) { Write-Output "Last report read error: $stitchReadError" }
  throw 'Native suite failed, could not load its files, or did not finish with a complete DONE report.'
}
foreach ($stitchSuite in $stitchSuites) {
  if (@($stitchResults -match ('^' + [regex]::Escape($stitchSuite) + ' PASS ')).Count -ne 1) {
    throw "Native suite result is missing or duplicated: $stitchSuite"
  }
}

Write-Output ("Passed suites: " + (($stitchSelected | ForEach-Object { $_.id }) -join ", "))
