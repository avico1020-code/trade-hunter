@echo off
REM Read last 100 lines from server log file
set LOGFILE=logs\server.log

if exist %LOGFILE% (
    echo Reading last 100 lines from %LOGFILE%...
    echo ================================================================================
    powershell -Command "Get-Content %LOGFILE% -Tail 100"
) else (
    echo Log file not found: %LOGFILE%
    echo Make sure to run 'bun run dev:log' first
    pause
)

