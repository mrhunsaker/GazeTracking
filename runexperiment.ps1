<#
.SYNOPSIS
  Windows PowerShell wrapper for the GazeTracking experiment runner.

  Mirrors the basic behavior of runexperiment.sh: runs optional sanity check
  and unit tests using Node.js if available. Designed for local Windows use.
#>

param(
    [int]$Port = 8888,
    [switch]$Open,
    [switch]$Help
)

if ($Help) {
    Write-Host "Usage: .\runexperiment.ps1 [-Port <port>] [-Open] [-Help]"
    exit 0
}

$ErrorActionPreference = 'Stop'

$RootDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$ExpDir = Join-Path $RootDir "StudentFolders\Experiment"

Write-Host "[runexperiment.ps1] Root: $RootDir"

function NodeAvailable {
    return (Get-Command node -ErrorAction SilentlyContinue) -ne $null
}

if (NodeAvailable) {
    Write-Host "[runexperiment.ps1] Running sanity check (node)..."
    $sanity = Join-Path $ExpDir "sanity_check_shapes.js"
    if (Test-Path $sanity) {
        node $sanity
    } else {
        Write-Host "[runexperiment.ps1] Sanity-check script not found at $sanity; skipping."
    }
} else {
    Write-Host "[runexperiment.ps1] node not found; skipping sanity check. Install Node.js to run checks."
}

if (NodeAvailable) {
    $unit = Join-Path $RootDir "tests\run_unit_tests.js"
    if (Test-Path $unit) {
        Write-Host "[runexperiment.ps1] Running unit tests..."
        node $unit
    } else {
        Write-Host "[runexperiment.ps1] No unit tests script found at tests/run_unit_tests.js"
    }
}

Write-Host "[runexperiment.ps1] Done. To start the experiment UI, you can run the bundled Node HTTPS server which serves static files and the API."
Write-Host "Example (from project root): npm install ; npm run serve-with-api-https"
Write-Host "If you prefer http-server with certs: npm install -g http-server ; npx http-server -S -C .\cert.pem -K .\key.pem -p $Port StudentFolders/Experiment/Experiment"
