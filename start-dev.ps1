# PowerShell script to start Next.js dev server
$env:NEXT_TELEMETRY_DISABLED = "1"
$env:PORT = "3000"

# Try to use node_modules/.bin/next first
if (Test-Path ".\node_modules\.bin\next.cmd") {
    & ".\node_modules\.bin\next.cmd" "dev" "--turbopack"
} elseif (Test-Path ".\node_modules\.bin\next") {
    & "C:\Program Files\nodejs\node.exe" ".\node_modules\.bin\next" "dev" "--turbopack"
} else {
    # Fallback to npx
    & "C:\Program Files\nodejs\npx.cmd" "next" "dev" "--turbopack"
}










