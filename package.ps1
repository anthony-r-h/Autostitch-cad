param([string]$ExampleDrawing)
$ErrorActionPreference = 'Stop'
$stitchRoot = [IO.Path]::GetFullPath($PSScriptRoot)
$stitchStatus = @(& git -C $stitchRoot status --porcelain)
if ($LASTEXITCODE -ne 0) { throw 'Packaging requires the Git checkout.' }
if ($stitchStatus.Count -ne 0) { throw 'Commit or discard working-tree changes before packaging a release.' }
$stitchRelease = Join-Path $stitchRoot 'output/release'
New-Item -ItemType Directory -Path $stitchRelease -Force | Out-Null
$stitchZip = Join-Path $stitchRelease 'Autostitch-V22.zip'
$stitchFiles = @(& git -C $stitchRoot ls-files)
if ($LASTEXITCODE -ne 0) { throw 'Packaging requires the Git checkout.' }
$stitchCommit = & git -C $stitchRoot rev-parse HEAD
if ($LASTEXITCODE -ne 0) { throw 'Could not read the source revision.' }
foreach ($relative in $stitchFiles) {
  if (-not (Test-Path -LiteralPath (Join-Path $stitchRoot $relative) -PathType Leaf)) {
    throw "Tracked file is missing. Commit the cleanup before packaging: $relative"
  }
}
if ($ExampleDrawing) {
  $ExampleDrawing = (Resolve-Path -LiteralPath $ExampleDrawing).Path
  if ([IO.Path]::GetExtension($ExampleDrawing) -ne '.dwg') { throw 'The example must be a saved DWG file.' }
}
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
# Build a new archive so deleted source files cannot survive in an old staging folder.
$stitchPending = Join-Path $stitchRelease ('package-' + [Guid]::NewGuid().ToString('N') + '.zip')
$stitchArchive = [IO.Compression.ZipFile]::Open($stitchPending, [IO.Compression.ZipArchiveMode]::Create)
try {
  foreach ($relative in $stitchFiles) {
    [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($stitchArchive,
      (Join-Path $stitchRoot $relative), 'Autostitch/' + $relative.Replace('\', '/'),
      [IO.Compression.CompressionLevel]::Optimal) | Out-Null
  }
  if ($ExampleDrawing) {
    [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($stitchArchive,
      $ExampleDrawing, 'Autostitch/examples/Autostitch-practical-demo.dwg',
      [IO.Compression.CompressionLevel]::Optimal) | Out-Null
  }
  $stitchEntry = $stitchArchive.CreateEntry('Autostitch/RELEASE.txt')
  $stitchWriter = [IO.StreamWriter]::new($stitchEntry.Open())
  try { $stitchWriter.WriteLine("Source commit: $stitchCommit") }
  finally { $stitchWriter.Dispose() }
} finally { $stitchArchive.Dispose() }
# Read every entry before replacing the previous release.
$stitchArchive = [IO.Compression.ZipFile]::OpenRead($stitchPending)
try {
  foreach ($stitchEntry in $stitchArchive.Entries) {
    $stitchStream = $stitchEntry.Open()
    try { $stitchStream.CopyTo([IO.Stream]::Null) }
    finally { $stitchStream.Dispose() }
  }
  $stitchCount = $stitchArchive.Entries.Count
} finally { $stitchArchive.Dispose() }
Move-Item -LiteralPath $stitchPending -Destination $stitchZip -Force
[pscustomobject]@{ Archive = $stitchZip; Source = $stitchCommit; Files = $stitchCount }
