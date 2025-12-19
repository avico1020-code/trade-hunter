# 📊 הגדרת נתוני גרף - Setup Guide

## 🔄 מצב נוכחי: 3-Tier Data Source

**הגרף משתמש במקורות נתונים מרובים בסדר עדיפות:**

1. **IBKR** (Interactive Brokers) - מקור ראשי ✅
2. **Yahoo Finance** - Fallback אוטומטי ✅  
3. **Mock Data** - לבדיקות בלבד ✅

---

## ✅ איך לראות את הגרף עובד (Mock Data)

1. פתח http://localhost:3000/stocks-list
2. בחר **AAPL** (או כל מניה אחרת)
3. הגרף יופיע עם נתונים מדומים! 🎉

---

## 🔄 איך להשתמש בנתונים אמיתיים?

### שלב 1: וודא ש-MarketDataHub פועל

MarketDataHub צריך להיות מאותחל ולאסוף נתונים:

```typescript
// lib/server/market-data/index.ts או קובץ אתחול אחר

import { getMarketDataHub } from '@/lib/server/market-data';

// אתחול
const hub = getMarketDataHub();

// דוגמה: הוספת נתונים ידנית (לבדיקה)
hub.addTick('AAPL', {
  symbol: 'AAPL',
  price: 150.25,
  volume: 1000,
  timestamp: Date.now(),
});
```

### שלב 2: חיבור ל-IBKR

אם אתה רוצה נתונים אמיתיים מ-IBKR:

```typescript
// lib/server/tradingSystem.ts או קובץ אתחול

import { initTradingSystem } from '@/lib/server/tradingSystem';

// זה יתחיל את החיבור ל-IBKR ויזרים נתונים ל-MarketDataHub
await initTradingSystem();
```

### שלב 3: בדוק שיש נתונים

```bash
# בדוק ישירות דרך API
curl "http://localhost:3000/api/market/bars?symbol=AAPL&timeframe=1m"
```

אם יש נתונים, תראה:
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

---

## 🎯 פורמט נתונים נדרש

### MarketDataHub Bar Format:

```typescript
{
  startTs: number,      // UNIX timestamp במילישניות
  open: number,
  high: number,
  low: number,
  close: number,
  volume: number
}
```

### Lightweight Charts Format (מה שה-API מחזיר):

```typescript
{
  time: number,        // UNIX timestamp בשניות (!)
  open: number,
  high: number,
  low: number,
  close: number
}
```

**⚠️ שים לב:** ההמרה מ-milliseconds ל-seconds קורית ב-API route!

---

## 🔧 Debugging

### בדוק את הלוגים:

```bash
# בטרמינל שבו רץ Next.js
[Market Bars API] Hub returned X bars for AAPL
[Market Bars API] ✅ Returning X candles for AAPL
```

אם רואה:
```
[Market Bars API] ⚠️ No bars found for AAPL
[Market Bars API] 💡 Generating mock data for testing...
```

זה אומר שאין נתונים אמיתיים - הגרף ישתמש ב-mock data.

### בדוק את MarketDataHub:

```typescript
import { getMarketDataHub } from '@/lib/server/market-data';

const hub = getMarketDataHub();
const bars = hub.getBars('AAPL', '1m');

console.log(`Found ${bars.length} bars for AAPL`);
```

---

## 📝 צ'קליסט

- [ ] MarketDataHub מאותחל?
- [ ] IBKR מחובר? (אם רוצים נתונים אמיתיים)
- [ ] יש נתונים עבור הסימבול? (בדוק עם `getBars`)
- [ ] הפורמט נכון? (startTs במילישניות)
- [ ] ה-API route מחזיר נתונים? (בדוק עם curl)

---

## 🎭 מעבר מ-Mock Data לנתונים אמיתיים

כשתהיה מוכן לעבור לנתונים אמיתיים:

1. ✅ הכן את MarketDataHub עם נתונים אמיתיים
2. ✅ בדוק שיש לפחות 20-30 נרות
3. ✅ הסר את קוד ה-Mock Data (אופציונלי)
4. ✅ הגרף יעבור אוטומטית לנתונים אמיתיים!

---

## 💡 טיפים

### טיפ 1: Mock Data לבדיקות
השאר את Mock Data - זה מועיל לבדיקות ולפיתוח!

### טיפ 2: בדוק תחילה עם Symbol פשוט
התחל עם מניה פופולרית כמו AAPL או MSFT.

### טיפ 3: Timeframe
וודא שיש נתונים ל-timeframe שבחרת (1m/5m/15m/1h/1d).

---

## 🚀 סטטוס

| מה | סטטוס |
|-----|--------|
| **גרף עובד** | ✅ |
| **Mock Data** | ✅ פועל |
| **API Routes** | ✅ מוכנים |
| **נתונים אמיתיים** | ⏳ תלוי ב-MarketDataHub |
| **Real-time Updates** | ✅ מוכן (SSE) |

---

**הגרף מוכן לשימוש עם Mock Data! 🎉**

כשתרצה להוסיף נתונים אמיתיים, פשוט הכן את MarketDataHub והגרף יעבור אוטומטית!

