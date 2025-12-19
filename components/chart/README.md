# 📊 TradingView-Style Candlestick Chart

גרף נרות מקצועי בסגנון TradingView עם עדכונים בזמן אמת.

## 🎯 תכונות

- ✅ **גרף נרות (Candlestick)** בסגנון TradingView
- ✅ **ערכת נושא כהה** - Look & Feel זהה ל-TradingView
- ✅ **בורר Timeframe** - 1m / 5m / 15m / 1h / 1d
- ✅ **Zoom & Pan** - זום וגלילה חלקה
- ✅ **Crosshair** - צלב מעקב אינטראקטיבי
- ✅ **Real-Time Updates** - עדכוני נרות בזמן אמת דרך SSE
- ✅ **Responsive** - מתאים לכל גודל מסך

---

## 📦 קומפוננטות

### 1. **ChartPanel** - רכיב עטיפה מלא
```tsx
import { ChartPanel } from "@/components/chart/ChartPanel";

<ChartPanel symbol="AAPL" />
```

### 2. **CandlestickChart** - הגרף עצמו
```tsx
import { CandlestickChart } from "@/components/chart/CandlestickChart";

<CandlestickChart symbol="AAPL" timeframe="1m" />
```

### 3. **TimeframeSelector** - בורר timeframe
```tsx
import { TimeframeSelector } from "@/components/chart/TimeframeSelector";

<TimeframeSelector 
  value={timeframe} 
  onChange={setTimeframe} 
/>
```

---

## 🚀 שימוש

### דוגמה בסיסית:

```tsx
'use client';

import { ChartPanel } from "@/components/chart/ChartPanel";

export default function TradingPage() {
  return (
    <div className="h-screen p-4">
      <ChartPanel symbol="AAPL" />
    </div>
  );
}
```

### דוגמה עם State:

```tsx
'use client';

import { useState } from 'react';
import { CandlestickChart } from "@/components/chart/CandlestickChart";
import { TimeframeSelector } from "@/components/chart/TimeframeSelector";

export default function TradingPage() {
  const [symbol, setSymbol] = useState('AAPL');
  const [timeframe, setTimeframe] = useState<'1m' | '5m' | '15m' | '1h' | '1d'>('1m');

  return (
    <div className="p-4 space-y-4">
      <div className="flex gap-4">
        <select value={symbol} onChange={(e) => setSymbol(e.target.value)}>
          <option value="AAPL">Apple</option>
          <option value="MSFT">Microsoft</option>
          <option value="GOOGL">Google</option>
        </select>
        <TimeframeSelector value={timeframe} onChange={setTimeframe} />
      </div>
      
      <CandlestickChart symbol={symbol} timeframe={timeframe} />
    </div>
  );
}
```

---

## 🔌 API Endpoints

הגרף משתמש בשני endpoints:

### 1. **Initial Data** - GET /api/market/bars
```bash
GET /api/market/bars?symbol=AAPL&timeframe=1m
```

**Response:**
```json
[
  {
    "time": 1700000000,
    "open": 150.0,
    "high": 152.5,
    "low": 149.8,
    "close": 151.2
  }
]
```

**⚠️ חשוב:** `time` חייב להיות ב-**UNIX seconds** (לא milliseconds)!

### 2. **Real-Time Updates** - GET /api/market/stream (SSE)
```bash
GET /api/market/stream?symbol=AAPL&timeframe=1m
```

**SSE Messages:**
```
data: {"time":1700000060,"open":151.2,"high":151.5,"low":151.0,"close":151.3}

data: {"time":1700000060,"open":151.2,"high":151.6,"low":151.0,"close":151.4}
```

**התנהגות:**
- אם `time` של נר זהה לנר קיים → עדכון הנר הקיים
- אם `time` של נר שונה → יצירת נר חדש

---

## 🏗️ ארכיטקטורה

```
┌─────────────────────┐
│   ChartPanel        │  ← רכיב עטיפה (Header + Selector + Chart)
│                     │
│  ┌───────────────┐  │
│  │ Timeframe     │  │  ← בחירת timeframe (1m/5m/15m/1h/1d)
│  │ Selector      │  │
│  └───────────────┘  │
│                     │
│  ┌───────────────┐  │
│  │ Candlestick   │  │  ← הגרף עצמו
│  │ Chart         │  │
│  │               │  │
│  │  [TradingView]│  │  ← lightweight-charts library
│  │               │  │
│  └───────────────┘  │
└─────────────────────┘

          ↓ ↑
    ┌──────────────┐
    │  API Routes  │
    ├──────────────┤
    │ /bars  (GET) │  ← Initial data
    │ /stream (SSE)│  ← Real-time updates
    └──────────────┘
          ↓ ↑
    ┌──────────────┐
    │ MarketDataHub│  ← Backend data source
    └──────────────┘
```

---

## 🎨 סטיילינג

### ערכת צבעים (TradingView-like):

```typescript
{
  // Background
  background: '#0f0f0f',       // רקע כהה
  textColor: '#d1d4dc',         // טקסט אפור בהיר
  
  // Grid
  gridColor: '#1f1f1f',         // קווי רשת כהים
  
  // Candles
  upColor: '#26a69a',           // נר עולה (ירוק)
  downColor: '#ef5350',         // נר יורד (אדום)
  
  // Crosshair
  crosshairColor: '#758696',    // צלב אפור
  
  // Timeframe selector
  selectedBg: '#2962ff',        // כחול בהיר (נבחר)
  unselectedBg: '#1e1e1e',      // כהה (לא נבחר)
}
```

### התאמה אישית:

```tsx
// בקובץ CandlestickChart.tsx
const chart = createChart(container, {
  // שנה צבעים כאן
  layout: {
    background: { color: '#000000' },  // רקע שחור
    textColor: '#ffffff',              // טקסט לבן
  },
});

const series = chart.addCandlestickSeries({
  upColor: '#00ff00',       // ירוק בהיר
  downColor: '#ff0000',     // אדום בהיר
});
```

---

## 🔧 Troubleshooting

### בעיה: הגרף לא מופיע

**פתרון:**
1. בדוק שהתקנת `lightweight-charts`:
   ```bash
   bun add lightweight-charts
   ```
2. בדוק שה-API routes פועלים:
   ```bash
   curl http://localhost:3000/api/market/bars?symbol=AAPL&timeframe=1m
   ```

### בעיה: שגיאת UNIX timestamp

**פתרון:**
וודא ש-`time` ב-**שניות** ולא במילישניות:
```typescript
// ✅ נכון
{ time: 1700000000 }  // UNIX seconds

// ❌ שגוי
{ time: 1700000000000 }  // UNIX milliseconds
```

### בעיה: SSE לא עובד

**פתרון:**
1. בדוק שה-endpoint `/api/market/stream` נגיש
2. בדוק ב-Network tab של DevTools שה-connection פתוח
3. וודא ש-MarketDataHub שולח אירועי `onBarClose`

### בעיה: הגרף לא מתעדכן בזמן אמת

**פתרון:**
1. בדוק שה-SSE connection פתוח (ב-Console)
2. וודא שה-`time` של הנרות עולה
3. בדוק שה-`series.update()` נקרא:
   ```typescript
   seriesRef.current?.update(candle);  // ✅
   ```

---

## 📚 תיעוד נוסף

- [TradingView Lightweight Charts Docs](https://tradingview.github.io/lightweight-charts/)
- [Server-Sent Events (SSE)](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
- [Next.js Route Handlers](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)

---

## 🎯 דוגמאות נוספות

### שילוב עם אינדיקטורים:

```tsx
'use client';

import { CandlestickChart } from "@/components/chart/CandlestickChart";
import * as Indicators from "@/lib/indicators";

export function ChartWithIndicators({ symbol }: { symbol: string }) {
  // כאן תוכל להוסיף אינדיקטורים כמו RSI, MACD וכו'
  
  return (
    <div className="space-y-4">
      <CandlestickChart symbol={symbol} timeframe="1m" />
      
      <div className="grid grid-cols-3 gap-4">
        <div>RSI: {/* RSI indicator */}</div>
        <div>MACD: {/* MACD indicator */}</div>
        <div>ATR: {/* ATR indicator */}</div>
      </div>
    </div>
  );
}
```

---

**נוצר בתאריך:** {{ now }}  
**גרסה:** 1.0.0  
**ספרייה:** lightweight-charts v4.2.0 (stable API)

