# tars_run_verifs.ps1 -- start the repo static server, run every harness, stop the server.
# One shot (the server must live inside the same session -- ssh kills detached children).
# Usage (from repo root):  powershell -ExecutionPolicy Bypass -File scripts\tars_run_verifs.ps1

$ErrorActionPreference = "Continue"
$ROOT = Split-Path -Parent $PSScriptRoot
$NODE = Join-Path $ROOT ".runtime\node\node.exe"
if (-not (Test-Path $NODE)) { Write-Host "runtime manquant -- lancer scripts\tars_setup_runtime.ps1"; exit 2 }
$env:PLAYWRIGHT_BROWSERS_PATH = Join-Path $ROOT ".runtime\ms-playwright"

$server = Start-Process -PassThru -WindowStyle Hidden -FilePath $NODE `
  -ArgumentList "scripts\tars_serve.mjs" -WorkingDirectory $ROOT
Start-Sleep 2

$fail = 0
foreach ($h in "verif_poc_A.mjs", "verif_navigateur.mjs", "verif_variantes.mjs") {
  Write-Host "`n===== $h ====="
  & $NODE (Join-Path $ROOT "scripts\$h")
  if ($LASTEXITCODE -ne 0) { $fail = 1; Write-Host "!!! $h a echoue" }
}

Stop-Process -Id $server.Id -Force -ErrorAction SilentlyContinue
exit $fail
