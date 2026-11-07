param(
  [string]$ApplicationDirectory = (Split-Path $PSScriptRoot -Parent)
)

$ErrorActionPreference = 'Stop'
$ApplicationDirectory = (Resolve-Path -LiteralPath $ApplicationDirectory).Path
foreach ($file in @('AUTOSTITCH.lsp', 'AUTOSTITCH.odcl', 'Autostitch.Events.dll', 'AUTOSTITCH.bmp')) {
  if (-not (Test-Path -LiteralPath (Join-Path $ApplicationDirectory $file) -PathType Leaf)) {
    throw "Missing application file: $file"
  }
}
$cad = [Runtime.InteropServices.Marshal]::GetActiveObject('BricscadApp.AcadApplication.22.0')
if (-not $cad.GetAcadState().IsQuiescent -or
    $cad.ActiveDocument.GetVariable('CMDNAMES') -ne '' -or
    $cad.ActiveDocument.GetVariable('CMDACTIVE') -ne 0) {
  throw 'Finish the current BricsCAD command or point pick, then run the ribbon installer again.'
}
$group = $cad.MenuGroups.Item(0)
$cuiPath = $group.MenuFileName
$xml = New-Object System.Xml.XmlDocument
$xml.PreserveWhitespace = $true
$xml.Load($cuiPath)
if (-not $xml.SelectSingleNode("//RibbonPanelSource[@UID='rp2DAnnotations']/RibbonRow")) {
  throw 'The current main CUI has no Home / Annotations ribbon panel.'
}

$backup = Join-Path $ApplicationDirectory ('output/ribbon-backups/' + (Get-Date -Format 'yyyyMMdd-HHmmss-fff'))
New-Item -ItemType Directory -Path $backup -Force | Out-Null
Copy-Item -LiteralPath $cuiPath -Destination (Join-Path $backup 'before-save.cui')
# Preserve current in-memory customizations before adding our button.
$group.Save(0)
Copy-Item -LiteralPath $cuiPath -Destination (Join-Path $backup 'before-ribbon.cui')
$xml.Load($cuiPath)
$menuGroup = $xml.SelectSingleNode('/CustSection/MenuGroup')
$row = $xml.SelectSingleNode("//RibbonPanelSource[@UID='rp2DAnnotations']/RibbonRow")
if (-not $menuGroup -or -not $row) { throw 'The saved CUI has no Home / Annotations ribbon panel.' }
$macroId = 'AUTOSTITCH_OPEN'
$toolbox = $xml.SelectSingleNode("/CustSection/MenuGroup/MacroGroup[@Name='Autostitch']")
if (-not $toolbox) {
  $toolbox = $xml.CreateElement('MacroGroup')
  $toolbox.SetAttribute('Name', 'Autostitch')
  [void]$menuGroup.InsertBefore($toolbox, $menuGroup.SelectSingleNode('MacroGroup'))
}
foreach ($existing in @($xml.SelectNodes("//MenuMacro[@UID='$macroId']"))) {
  [void]$existing.ParentNode.RemoveChild($existing)
}
$menuMacro = $xml.CreateElement('MenuMacro')
$menuMacro.SetAttribute('UID', $macroId)
$macro = $xml.CreateElement('Macro')
$appLispPath = $ApplicationDirectory.Replace('\', '/').Replace('"', '\"')
$command = '^C^C(progn (setq ast:*home* "' + $appLispPath + '") (if (not c:AUTOSTITCH) (load (strcat ast:*home* "/AUTOSTITCH.lsp"))) (c:AUTOSTITCH));'
foreach ($entry in @(@('Name', 'Autostitch'), @('Command', $command), @('HelpString', 'Open Autostitch to lay out and edit stitching'))) {
  $node = $xml.CreateElement($entry[0])
  $node.InnerText = $entry[1]
  [void]$macro.AppendChild($node)
}
$image = $xml.CreateElement('Image')
$image.SetAttribute('ID', (Join-Path $ApplicationDirectory 'AUTOSTITCH.bmp'))
[void]$macro.AppendChild($image)
[void]$menuMacro.AppendChild($macro)
[void]$toolbox.AppendChild($menuMacro)
foreach ($existing in @($xml.SelectNodes("//RibbonCommandButton[@MenuMacroID='$macroId']"))) {
  [void]$existing.ParentNode.RemoveChild($existing)
}
$button = $xml.CreateElement('RibbonCommandButton')
$button.SetAttribute('MenuMacroID', $macroId)
$button.SetAttribute('Text', 'Autostitch')
$button.SetAttribute('ButtonStyle', 'LargeWithText')
$csvButton = $row.SelectSingleNode("RibbonCommandButton[@MenuMacroID='CSVLABEL_OPEN']")
if ($csvButton) { [void]$row.InsertAfter($button, $csvButton) }
else { [void]$row.AppendChild($button) }
$candidate = Join-Path $backup 'installed.cui'
$xml.Save($candidate)
$check = New-Object System.Xml.XmlDocument
$check.Load($candidate)
if ($check.SelectNodes("//RibbonCommandButton[@MenuMacroID='$macroId']").Count -ne 1 -or
    $check.SelectNodes("//MenuMacro[@UID='$macroId']").Count -ne 1) {
  throw 'Expected exactly one Autostitch ribbon button and command.'
}
Copy-Item -LiteralPath $candidate -Destination $cuiPath -Force
$menu = $cuiPath.Replace('\', '/').Replace('"', '\"')
# Restore FILEDIA even if MENU fails; no drawing contents are changed.
$reload = '((lambda (/ result old-filedia) (setq old-filedia (getvar "FILEDIA")) (setvar "FILEDIA" 0) (setq result (vl-catch-all-apply ''vl-cmdf (list "_.MENU" "' + $menu + '"))) (setvar "FILEDIA" old-filedia) (if (vl-catch-all-error-p result) (princ (vl-catch-all-error-message result))) (princ)))'
$cad.ActiveDocument.SendCommand($reload + [char]10)
Write-Output "Installed Autostitch in Home / Annotations; ribbon reload requested. Backup: $backup"
