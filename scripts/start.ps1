# CRM Clientes - Build & Start
# Ejecutar desde la raiz del proyecto: .\scripts\start.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

Write-Host "=== Construyendo frontend ===" -ForegroundColor Cyan
Set-Location "$root\frontend"
npm run build
if ($LASTEXITCODE -ne 0) { Write-Host "Error al construir el frontend" -ForegroundColor Red; exit 1 }

Write-Host ""
Write-Host "=== Iniciando servidor ===" -ForegroundColor Cyan
Set-Location "$root\backend"
Write-Host "CRM disponible en http://localhost:3000" -ForegroundColor Green
node src/index.js
