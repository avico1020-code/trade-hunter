# Web App Commands

**Tech Stack:** Next.js 15 + React 19 + Clerk Auth + Convex Database + Tailwind CSS

> **Note:** This project uses **bun** instead of npm. Replace `npm` with `bun` in all commands.

## Install the dependencies needed to run the app
```bash
bun install
```

## 🚀 Development - Start Both Servers (RECOMMENDED)
```bash
bun run dev:full
```
**This starts BOTH Next.js AND Convex Dev servers together.**
- Next.js: `http://localhost:3000`
- Convex: Syncs functions automatically

**Alternative methods:**
```bash
# Windows BAT script
start-dev-full.bat

# PowerShell script
.\start-dev-full.ps1
```

## Development - Next.js Only (NOT RECOMMENDED)
```bash
bun dev
```
⚠️ **Warning:** Without Convex Dev running, backend functions won't work!

## Sync Convex Database (Run in Separate Terminal)
```bash
bun run convex
# or
bunx convex dev
```
Updates database with functions in `/convex` folder. **Must be running** for backend to work.

## Build for Production
```bash
bun build
```

## Run Production Build
```bash
bun start
```

## Code Quality Commands

### Lint Code (Check for linting issues only)
```bash
bun lint
```

### Format Code (Auto-format code)
```bash
bun format
```

### Check Code (Lint + Format check)
```bash
bun check
```

### Fix Issues (Auto-fix linting and formatting)
```bash
bun check:fix
```

## Common Issues

**Port already in use?**
- Stop other apps using port 3000, or the dev command will suggest an alternative port

**Environment variables missing?**
- Copy `.env.local` and add your Clerk and Convex keys
