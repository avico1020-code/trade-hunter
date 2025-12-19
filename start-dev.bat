@echo off
set NEXT_TELEMETRY_DISABLED=1
set PORT=3000

if exist ".\node_modules\.bin\next.cmd" (
    .\node_modules\.bin\next.cmd dev --turbopack
) else (
    npx next dev --turbopack
)










