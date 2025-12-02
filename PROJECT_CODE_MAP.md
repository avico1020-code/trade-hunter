# 🗺️ מפת הקוד המלאה - Trading Router Application

## 📁 מבנה הפרויקט

### 🌐 Frontend - Next.js Pages (`/app/`)

#### Main Pages:
- **`app/page.tsx`** - דף בית ראשי
- **`app/layout.tsx`** - Root layout עם RTL support
- **`app/globals.css`** - Global styles

#### Authentication Pages:
- **`app/(auth)/sign-in/page.tsx`** - דף התחברות
- **`app/(auth)/sign-up/page.tsx`** - דף הרשמה
- **`app/(auth)/layout.tsx`** - Layout למודי Auth

#### Trading Pages:
- **`app/trade-router/page.tsx`** - דף נתב המסחר
- **`app/stocks-list/page.tsx`** - רשימת מניות
- **`app/statistics/page.tsx`** - דף סטטיסטיקות
- **`app/statistics/trading/page.tsx`** - סטטיסטיקות מסחר
- **`app/news/page.tsx`** - דף חדשות

#### Strategy Pages:
- **`app/strategy-kit/page.tsx`** - כלי יצירת אסטרטגיות
- **`app/strategy/create/page.tsx`** - יצירת אסטרטגיה
- **`app/strategy/double-top/page.tsx`** - אסטרטגיית Double Top
- **`app/strategy/double-bottom/page.tsx`** - אסטרטגיית Double Bottom
- **`app/strategy/gap-up/page.tsx`** - אסטרטגיית Gap Up
- **`app/strategy/gap-down/page.tsx`** - אסטרטגיית Gap Down
- **`app/strategy/reversal/page.tsx`** - אסטרטגיית Reversal
- **`app/strategy/manage/double-top/page.tsx`** - ניהול Double Top
- **`app/strategy/manage/double-bottom/page.tsx`** - ניהול Double Bottom
- **`app/strategy/manage/gap-up/page.tsx`** - ניהול Gap Up
- **`app/strategy/manage/gap-down/page.tsx`** - ניהול Gap Down
- **`app/strategy/manage/reversal/page.tsx`** - ניהול Reversal

#### Other Pages:
- **`app/page1/page.tsx`**, **`app/page2/page.tsx`**, **`app/page3/page.tsx`** - דפים נוספים
- **`app/sso-callback/page.tsx`** - OAuth callback handler

### 🔌 API Routes (`/app/api/`)

#### IBKR API:
- **`app/api/ibkr/**`** - Interactive Brokers API routes
  - Connection handling
  - Market data endpoints
  - Order management

#### Chat API:
- **`app/api/chat/**`** - Chat/AI endpoints

### 🧩 Components (`/components/`)

#### Main Screen Components:
- **`components/main-screen/HeaderBar.tsx`** - Header bar ראשי
- **`components/main-screen/IndexPanels.tsx`** - פאנלים של אינדקסים
- **`components/main-screen/IndexPanel.tsx`** - פאנל אינדקס בודד
- **`components/main-screen/ListsGrid.tsx`** - רשת רשימות
- **`components/main-screen/AIChatPanel.tsx`** - פאנל צ'אט AI
- **`components/main-screen/AccountStatusPanel.tsx`** - סטטוס חשבון
- **`components/main-screen/AddIndexModal.tsx`** - מודל הוספת אינדקס
- **`components/main-screen/ClearCacheButton.tsx`** - כפתור ניקוי cache

#### Stocks List Components:
- **`components/stocks-list/StocksListHeader.tsx`** - Header לרשימת מניות
- **`components/stocks-list/StocksTable.tsx`** - טבלת מניות
- **`components/stocks-list/ChartPanel.tsx`** - פאנל גרפים
- **`components/stocks-list/InformationPanel.tsx`** - פאנל מידע
- **`components/stocks-list/TradeManagementList.tsx`** - רשימת ניהול מסחר

#### Strategy Components:
- **`components/strategy-kit/StrategyKit.tsx`** - רכיב ערכת אסטרטגיות
- **`components/strategy-kit/StrategyKitHeader.tsx`** - Header ערכת אסטרטגיות
- **`components/strategy-kit/CreateStrategyPanel.tsx`** - פאנל יצירת אסטרטגיה
- **`components/create-strategy/CreateStrategyHeader.tsx`** - Header יצירת אסטרטגיה
- **`components/create-strategy/CreateStrategyParams.tsx`** - פרמטרים ליצירת אסטרטגיה
- **`components/create-strategy/IndicatorsParam.tsx`** - פרמטר אינדיקטורים
- **`components/create-strategy/IndicatorsPopup.tsx`** - Popup אינדיקטורים
- **`components/create-strategy/StopParam.tsx`** - פרמטר stop loss
- **`components/create-strategy/TimeframeParam.tsx`** - פרמטר timeframe
- **`components/create-strategy/TimeframePopup.tsx`** - Popup timeframe
- **`components/create-strategy/TradeDirectionParam.tsx`** - פרמטר כיוון מסחר
- **`components/create-strategy/TriggerParam.tsx`** - פרמטר trigger
- **`components/create-strategy/TriggerPopup.tsx`** - Popup trigger

#### IBKR Components:
- **`components/ibkr/IbkrConnectionStatus.tsx`** - סטטוס חיבור IBKR
- **`components/ibkr/IbkrStatusIndicator.tsx`** - אינדיקטור סטטוס IBKR

#### News Components:
- **`components/news/ClearFinvizCacheButton.tsx`** - ניקוי cache Finviz

#### UI Components (ShadCN):
- **`components/ui/button.tsx`** - כפתור
- **`components/ui/input.tsx`** - Input field
- **`components/ui/card.tsx`** - Card component
- **`components/ui/dialog.tsx`** - Dialog/Modal
- **`components/ui/dropdown-menu.tsx`** - Dropdown menu
- **`components/ui/label.tsx`** - Label
- **`components/ui/switch.tsx`** - Switch toggle
- **`components/ui/badge.tsx`** - Badge
- **`components/ui/toaster.tsx`** - Toast notifications

#### Other Components:
- **`components/Navbar.tsx`** - Navigation bar
- **`components/AppLogo.tsx`** - Logo component
- **`components/SignInModal.tsx`** - Modal התחברות
- **`components/providers/providers.tsx`** - Providers (Clerk + Convex)

### 🔧 Library Code (`/lib/`)

#### Trading System:
- **`lib/scanner/trade-pattern-scanner.ts`** ⭐ - Trade Pattern Scanner
- **`lib/strategies/double-top.ts`** ⭐ - Double Top Strategy (implements IPatternStrategy)
- **`lib/strategies/base-strategy.ts`** - Base strategy class
- **`lib/trade-router/trade-router.ts`** - Trade router logic

#### IBKR Integration:
- **`lib/ibkr/client.ts`** - IBKR client
- **`lib/ibkr/tws-client.ts`** - TWS client
- **`lib/ibkr/twsClient.ts`** - TWS client (alternative)
- **`lib/ibkr/twsClient.simple.ts`** - Simple TWS client
- **`lib/ibkr/marketDataManager.ts`** - Market data manager
- **`lib/ibkr/hooks.ts`** - IBKR hooks

#### Hooks:
- **`lib/hooks/useMarketData.ts`** - Hook לנתוני שוק
- **`lib/hooks/useRealtimeMarketData.ts`** - Hook לנתוני שוק בזמן אמת

#### Types:
- **`lib/types/ibkr.ts`** - IBKR types
- **`lib/types/yahoo.ts`** - Yahoo Finance types

#### Utils:
- **`lib/utils.ts`** - Utility functions

### 🐍 Python Scoring System (`/rulebooks/` & `/scoring/`)

#### Rulebooks (Logic Definitions):
- **`rulebooks/scoring_system.py`** - Core system with data structures
- **`rulebooks/macro_rulebook.py`** - Macro economic news rules
- **`rulebooks/sector_macro_rulebook.py`** - Sector-specific macro news rules
- **`rulebooks/news_micro_global_rulebook.py`** - Global micro news rules
- **`rulebooks/news_micro_rulebook.py`** - Company-specific news rules
- **`rulebooks/news_rulebook.py`** - Unified news rulebook
- **`rulebooks/technical_indicator_rulebook.py`** - Technical indicators rules
- **`rulebooks/price_action_rulebook.py`** - Price action patterns rules
- **`rulebooks/options_flow_rulebook.py`** ⭐ - Options flow rules
- **`rulebooks/sentiment_rulebook.py`** ⭐ - Sentiment rules
- **`rulebooks/fundamentals_rulebook.py`** - Fundamentals rules
- **`rulebooks/position_risk_rulebook.py`** ⭐ - Position & risk rules
- **`rulebooks/README.md`** - Rulebooks documentation

#### Scoring Engines (Execution):
- **`scoring/options_flow_scoring.py`** ⭐ - Options flow scoring engine
- **`scoring/sentiment_scoring.py`** ⭐ - Sentiment scoring engine
- **`scoring/fundamentals_scoring.py`** - Fundamentals scoring engine
- **`scoring/position_risk_scoring.py`** - Position risk scoring engine
- **`scoring/price_action_scoring.py`** - Price action scoring engine
- **`scoring/master_scoring.py`** - Master scoring engine (combines all)

### 🗄️ Backend - Convex (`/convex/`)

#### Schema:
- **`convex/schema.ts`** - Database schema definitions

#### Auth:
- **`convex/auth.config.ts`** - Authentication configuration

#### Market Data:
- **`convex/marketData.ts`** - Market data queries/mutations
- **`convex/yahooFinance.ts`** - Yahoo Finance integration
- **`convex/yahooFinanceQueries.ts`** - Yahoo Finance queries
- **`convex/finvizNews.ts`** - Finviz news integration
- **`convex/combinedNews.ts`** - Combined news aggregation

#### Trading:
- **`convex/tradeRouter.ts`** - Trade router backend
- **`convex/trades.ts`** - Trades management
- **`convex/ibkrTWS.ts`** - IBKR TWS integration
- **`convex/ibkrCache.ts`** - IBKR data caching

#### Strategies:
- **`convex/strategies.ts`** - Strategies management
- **`convex/doubleTopStrategies.ts`** - Double Top strategies

#### Lists & Users:
- **`convex/stocksLists.ts`** - Stock lists management
- **`convex/stocksListsQueries.ts`** - Stock lists queries
- **`convex/userIndexPanels.ts`** - User index panels
- **`convex/users.ts`** - Users management

#### Cache Management:
- **`convex/clearYahooCache.ts`** - Clear Yahoo cache action
- **`convex/clearFinvizCacheAction.ts`** - Clear Finviz cache action

### 📝 Documentation Files

#### Trading System:
- **`TRADING_ROUTER_COMPLETE_SUMMARY.md`** ⭐ - Complete trading router summary
- **`TRADING_ROUTER_SUMMARY.md`** - Trading router summary
- **`TRADING_SYSTEM_SUMMARY.md`** - Trading system summary (Hebrew)
- **`TRADING_SYSTEM_SUMMARY_EN.md`** - Trading system summary (English)
- **`PROJECT_CODE_MAP.md`** ⭐ - This file (code map)

#### Setup Guides:
- **`README.md`** - Main README
- **`README-FIRST.md`** - First read guide
- **`SETUP_GUIDE.md`** - Setup guide
- **`START-SERVER.md`** - Server startup guide
- **`CONVEX-SETUP-QUICK.md`** - Quick Convex setup

#### IBKR Guides:
- **`IBKR_SETUP_GUIDE.md`** - IBKR setup guide
- **`IBKR_INTEGRATION.md`** - IBKR integration guide
- **`IBKR_FIX_GUIDE.md`** - IBKR troubleshooting
- **`IBKR_CLIENT_PORTAL_SETUP.md`** - Client Portal setup

#### Other Docs:
- **`AGENTS.md`** - AI assistant configuration
- **`CHATBOT_SETUP.md`** - Chatbot setup
- **`docs/COMMANDS.md`** - Command reference
- **`docs/CONVEX_SETUP_GUIDE.md`** - Detailed Convex setup
- **`docs/custom_clerk_auth.md`** - Custom Clerk auth guide
- **`docs/GIT_COMMANDS.md`** - Git commands reference

### ⚙️ Configuration Files

- **`package.json`** - Dependencies and scripts
- **`tsconfig.json`** - TypeScript configuration
- **`next.config.ts`** - Next.js configuration
- **`biome.json`** - Biome linter/formatter config
- **`components.json`** - ShadCN components config
- **`postcss.config.mjs`** - PostCSS configuration
- **`middleware.ts`** - Next.js middleware (auth protection)

### 🚀 Scripts

- **`start-dev.bat`** - Start dev server (Windows)
- **`start-dev.ps1`** - Start dev server (PowerShell)
- **`start-dev-full.bat`** - Start full dev (Next.js + Convex)
- **`start-dev-full.ps1`** - Start full dev (PowerShell)

### 📊 Data Files

- **`data/strategies.ts`** - Strategy data definitions

---

## 🔍 איך לראות את הקוד?

### דרך 1: ב-Cursor/VS Code
1. פתח את **File Explorer** בצד השמאלי
2. לחץ על תיקיות כדי לפתוח/לסגור
3. לחץ על קבצים כדי לראות את הקוד

### דרך 2: Command Palette
- לחץ `Ctrl+Shift+P` (Windows) או `Cmd+Shift+P` (Mac)
- הקלד: `File: Open File` או `Go to File`
- חפש קבצים לפי שם

### דרך 3: Terminal Commands

#### לראות כל הקבצים ב-Tree:
```bash
# Windows PowerShell
tree /F /A

# או להשתמש ב-Git (אם מותקן)
git ls-tree -r --name-only HEAD
```

#### לראות קבצים ספציפיים:
```bash
# כל הקבצים TypeScript
Get-ChildItem -Recurse -Filter *.ts

# כל הקבצים Python
Get-ChildItem -Recurse -Filter *.py

# כל הקבצים React (TSX)
Get-ChildItem -Recurse -Filter *.tsx
```

### דרך 4: Search in Files
- לחץ `Ctrl+Shift+F` (Windows) או `Cmd+Shift+F` (Mac)
- חפש מילות מפתח בקוד

---

## 🎯 קבצים מרכזיים להתחלה

### Trading Router System:
1. **`lib/scanner/trade-pattern-scanner.ts`** - Pattern Scanner
2. **`lib/strategies/double-top.ts`** - Double Top Strategy
3. **`scoring/master_scoring.py`** - Master Scoring Engine
4. **`rulebooks/position_risk_rulebook.py`** - Risk Rules

### Frontend:
1. **`app/trade-router/page.tsx`** - Trade Router UI
2. **`app/stocks-list/page.tsx`** - Stocks List UI
3. **`components/main-screen/HeaderBar.tsx`** - Main Header

### Backend:
1. **`convex/tradeRouter.ts`** - Trade Router Backend
2. **`convex/marketData.ts`** - Market Data Backend

---

## 📚 קבצי תיעוד מומלצים

1. **`TRADING_ROUTER_COMPLETE_SUMMARY.md`** - הסיכום המלא של כל המערכת
2. **`TRADING_SYSTEM_SUMMARY_EN.md`** - סיכום באנגלית (ל-ChatGPT)
3. **`PROJECT_CODE_MAP.md`** - מפה זו (כל הקבצים)
4. **`README.md`** - README ראשי

---

**תאריך עדכון**: 2025-01-20

