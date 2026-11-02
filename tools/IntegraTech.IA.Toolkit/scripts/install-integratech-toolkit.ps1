[CmdletBinding(SupportsShouldProcess)]
param(
    [Parameter(Mandatory)][string]$TargetRepo,
    [ValidateSet('codex', 'claude', 'both')][string]$Provider = 'both'
)
$ErrorActionPreference = 'Stop'
if ($PSCmdlet.ShouldProcess($TargetRepo, "Instalar adaptadores $Provider")) {
    & node (Join-Path $PSScriptRoot 'toolkit.mjs') install --target $TargetRepo --provider $Provider
} else {
    & node (Join-Path $PSScriptRoot 'toolkit.mjs') install --target $TargetRepo --provider $Provider --dry-run
}
exit $LASTEXITCODE
