[CmdletBinding()]
param(
    [ValidateSet('toolkit', 'discovery', 'design', 'business')][string]$Phase = 'toolkit',
    [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../../..')).Path
)
$ErrorActionPreference = 'Stop'
& node (Join-Path $PSScriptRoot 'toolkit.mjs') precheck --repo $RepoRoot --phase $Phase
exit $LASTEXITCODE
