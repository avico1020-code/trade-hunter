# PowerShell script to read the last N lines from server logs
param(
    [int]$Lines = 100
)

$logFile = "logs/server.log"

if (Test-Path $logFile) {
    Write-Host "Reading last $Lines lines from $logFile..." -ForegroundColor Green
    Write-Host "=" * 80 -ForegroundColor Gray
    Get-Content $logFile -Tail $Lines
} else {
    Write-Host "Log file not found: $logFile" -ForegroundColor Red
    Write-Host "Make sure to run 'bun run dev:log' first" -ForegroundColor Yellow
}

