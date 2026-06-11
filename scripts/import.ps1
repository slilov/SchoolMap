# import.ps1 — Изтегля актуални данни от Sofiaplan API
# Използване: .\scripts\import.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$dataDir = Join-Path $root "data"

$schoolsUrl   = "https://api.sofiaplan.bg/datasets/166"
$districtsUrl = "https://api.sofiaplan.bg/datasets/350"

Write-Host "=== Sofiaplan Data Import ===" -ForegroundColor Cyan
Write-Host ""

# Schools
Write-Host "Изтегляне на училища от $schoolsUrl ..." -ForegroundColor Yellow
Invoke-WebRequest -Uri $schoolsUrl -OutFile (Join-Path $dataDir "schools.json") -UseBasicParsing
$schoolsSize = (Get-Item (Join-Path $dataDir "schools.json")).Length
$schoolsData = Get-Content (Join-Path $dataDir "schools.json") -Raw -Encoding UTF8 | ConvertFrom-Json
Write-Host "  -> $($schoolsData.features.Count) училища ($([math]::Round($schoolsSize/1024)) KB)" -ForegroundColor Green

# Districts
Write-Host "Изтегляне на райони от $districtsUrl ..." -ForegroundColor Yellow
$response = Invoke-WebRequest -Uri $districtsUrl -UseBasicParsing -TimeoutSec 120
$response.Content | Out-File -FilePath (Join-Path $dataDir "districts.json") -Encoding UTF8
$districtsSize = (Get-Item (Join-Path $dataDir "districts.json")).Length
$districtsData = Get-Content (Join-Path $dataDir "districts.json") -Raw -Encoding UTF8 | ConvertFrom-Json
Write-Host "  -> $($districtsData.features.Count) района ($([math]::Round($districtsSize/1024)) KB)" -ForegroundColor Green

Write-Host ""
Write-Host "Импортът завърши успешно!" -ForegroundColor Cyan
Write-Host "Изпълни .\scripts\build.ps1 за да генерираш js/data.js" -ForegroundColor Gray
