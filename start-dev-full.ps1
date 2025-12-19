# Start both Next.js and Convex development servers
Write-Host "Starting Next.js and Convex development servers..." -ForegroundColor Green
Write-Host ""
Write-Host "Next.js will run on: http://localhost:3000" -ForegroundColor Cyan
Write-Host "Convex Dev will sync functions from /convex folder" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop both servers" -ForegroundColor Yellow
Write-Host "============================================" -ForegroundColor Yellow
Write-Host ""

$env:NEXT_TELEMETRY_DISABLED = "1"
$env:PORT = "3000"

# Start Convex Dev in background
$convexJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    & bunx convex dev
}

# Wait a bit for Convex to start
Start-Sleep -Seconds 3

# Start Next.js Dev
try {
    if (Test-Path ".\node_modules\.bin\next.cmd") {
        & .\node_modules\.bin\next.cmd dev --turbopack
    } else {
        & npx next dev --turbopack
    }
} finally {
    # Stop Convex when Next.js stops
    Write-Host "`nStopping Convex Dev..." -ForegroundColor Yellow
    Stop-Job -Job $convexJob
    Remove-Job -Job $convexJob
}



