@echo off
echo Starting Next.js and Convex development servers...
echo.
echo Next.js will run on: http://localhost:3000
echo Convex Dev will sync functions from /convex folder
echo.
echo Press Ctrl+C to stop both servers
echo ============================================
echo.

set NEXT_TELEMETRY_DISABLED=1
set PORT=3000

:: Start Convex Dev in a new window
start "Convex Dev Server" cmd /k "cd /d %~dp0 && bunx convex dev"

:: Wait a bit for Convex to start
timeout /t 3 /nobreak >nul

:: Start Next.js Dev in current window
if exist ".\node_modules\.bin\next.cmd" (
    .\node_modules\.bin\next.cmd dev --turbopack
) else (
    npx next dev --turbopack
)



