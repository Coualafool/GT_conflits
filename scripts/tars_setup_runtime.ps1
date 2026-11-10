# tars_setup_runtime.ps1 — one-time (idempotent) runtime setup INSIDE the repo folder.
# Everything lands in <repo>\.runtime (portable node + playwright browser cache) and
# <repo>\node_modules (playwright). No folders outside the repo, nothing on C:.
# Usage (PowerShell, from the repo root):  powershell -ExecutionPolicy Bypass -File scripts\tars_setup_runtime.ps1

$ErrorActionPreference = "Stop"
$ROOT = Split-Path -Parent $PSScriptRoot
$RT   = Join-Path $ROOT ".runtime"
$NODE = Join-Path $RT "node\node.exe"
$PWBROWSERS = Join-Path $RT "ms-playwright"

# 1) Portable Node (only if absent)
if (-not (Test-Path $NODE)) {
  Write-Host "[setup] downloading portable Node 22.14.0 -> $RT\node"
  New-Item -ItemType Directory -Force -Path $RT | Out-Null
  $zip = Join-Path $RT "node.zip"
  Invoke-WebRequest -Uri "https://nodejs.org/dist/v22.14.0/node-v22.14.0-win-x64.zip" -OutFile $zip
  Expand-Archive $zip -DestinationPath $RT -Force
  Move-Item (Join-Path $RT "node-v22.14.0-win-x64") (Join-Path $RT "node") -Force
  Remove-Item $zip -Force
}
Write-Host "[setup] node: $(& $NODE --version)"

# 2) Playwright browser cache INSIDE the repo (copy the existing system cache once, if present;
#    otherwise the npm postinstall below downloads it here via PLAYWRIGHT_BROWSERS_PATH).
if (-not (Test-Path $PWBROWSERS)) {
  $sysCache = Join-Path $env:LOCALAPPDATA "ms-playwright"
  if (Test-Path $sysCache) {
    Write-Host "[setup] copying browser cache -> $PWBROWSERS"
    robocopy $sysCache $PWBROWSERS /E /NFL /NDL /NJH /NJS | Out-Null
    if ($LASTEXITCODE -gt 7) { throw "robocopy failed ($LASTEXITCODE)" }
    $global:LASTEXITCODE = 0
  }
}
$env:PLAYWRIGHT_BROWSERS_PATH = $PWBROWSERS
Write-Host "[setup] PLAYWRIGHT_BROWSERS_PATH = $PWBROWSERS"

# 3) playwright in the repo's own node_modules (pinned by package.json; skips browser
#    download because the cache above already satisfies the pinned version)
$env:PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = "1"
if (-not (Test-Path (Join-Path $ROOT "node_modules\playwright\package.json"))) {
  Write-Host "[setup] npm install (playwright) into $ROOT\node_modules"
  Push-Location $ROOT
  try { & (Join-Path $RT "node\npm.cmd") install --no-audit --no-fund }
  finally { Pop-Location }
}
Write-Host "[setup] OK — run: $NODE scripts\tars_serve.mjs   puis   $NODE scripts\verif_poc_A.mjs"
