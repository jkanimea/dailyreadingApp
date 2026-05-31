param(
  [switch]$BackendOnly,
  [switch]$FrontendOnly
)

$root = $PSScriptRoot
$backendPath = Join-Path $root "backend\EncounterDaily.API"
$frontendPath = Join-Path $root "frontend"

if (-not $FrontendOnly) {
  Write-Host ">>> Starting backend API on http://localhost:5000 ..." -ForegroundColor Green
  Start-Process powershell -ArgumentList "-NoExit", "-Command", "dotnet run --project '$backendPath' --urls 'http://0.0.0.0:5000'"
  Start-Sleep 5
}

if (-not $BackendOnly) {
  Write-Host ">>> Starting frontend on https://localhost:4200 ..." -ForegroundColor Green
  Set-Location $frontendPath
  npx ionic serve --ssl --host 0.0.0.0 --port 4200
}

if ($BackendOnly) {
  Write-Host "Backend started in a separate window. Close it to stop." -ForegroundColor Yellow
}
