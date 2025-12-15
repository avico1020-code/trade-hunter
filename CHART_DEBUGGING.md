# 🔍 Debugging Guide - Chart Not Showing Candles

## 🎯 הבעיה

הגרף מוצג אבל הנרות לא מופיעים.

---

## 📊 שלבי בדיקה

### 1. בדוק את הלוגים בקונסול הדפדפן (F12)

**צפוי לראות:**

```
[CandlestickChart] ✅ Chart is ready, loading data for AAPL...
[CandlestickChart] Loading bars for AAPL (1m)
[CandlestickChart] Loaded X bars
[CandlestickChart] Sample bar: { time: 1700000000, open: 150.25, ... }
[CandlestickChart] Valid bars: X / X
[CandlestickChart] Setting X bars to chart...
[CandlestickChart] ✅ Data set successfully
[CandlestickChart] Fitting content...
[CandlestickChart] ✅ Chart updated and fitted!
```

**אם רואה:**
```
[CandlestickChart] Loaded 0 bars
```
→ הבעיה: API לא מחזיר נתונים

**אם רואה:**
```
[CandlestickChart] ⏳ Waiting for chart to be ready...
```
→ הבעיה: הגרף לא מוכן

**אם רואה:**
```
[CandlestickChart] ❌ Error setting data: ...
```
→ הבעיה: פורמט נתונים לא נכון

---

### 2. בדוק את הלוגים בטרמינל (Next.js Server)

**צפוי לראות:**

```
[Market Bars API] 📥 Request for AAPL (1m)
[Market Bars API] IBKR returned 0 bars
[Market Bars API] 💡 IBKR has no data, trying Yahoo Finance...
[Yahoo Finance] Fetching AAPL (1m, 1d)
[Yahoo Finance] ✅ Fetched X bars for AAPL
[Market Bars API] ✅ Returning X candles from Yahoo Finance
```

**או:**

```
[Market Bars API] ⚠️ No data from IBKR or Yahoo, generating mock data...
[Market Bars API] 🎭 Returning 100 mock candles
```

---

### 3. בדוק ישירות את ה-API

**פתח בדפדפן:**
```
http://localhost:3000/api/market/bars?symbol=AAPL&timeframe=1m
```

**צפוי לראות JSON:**
```json
[
  {
    "time": 1700000000,
    "open": 150.25,
    "high": 151.5,
    "low": 149.8,
    "close": 150.9
  },
  ...
]
```

**אם רואה:**
```json
[]
```
→ הבעיה: API לא מחזיר נתונים

**אם רואה שגיאה:**
```json
{ "error": "..." }
```
→ הבעיה: שגיאה ב-API

---

## 🔧 פתרונות נפוצים

### פתרון 1: Yahoo Finance לא עובד

**סימנים:**
- `[Yahoo Finance] HTTP error: 403` או `429`
- `[Yahoo Finance] Error fetching data: ...`

**פתרון:**
Yahoo Finance API לפעמים חוסם requests. זה נורמלי - המערכת תעבור אוטומטית ל-Mock Data.

**איך לבדוק:**
1. בדוק את הלוגים בטרמינל
2. אם רואה `[Market Bars API] 🎭 Returning 100 mock candles` → זה עובד!
3. הגרף אמור להציג 100 נרות מדומים

---

### פתרון 2: הגרף לא מוכן

**סימנים:**
- `[CandlestickChart] ⏳ Waiting for chart to be ready...`
- הגרף ריק לחלוטין

**פתרון:**
1. רענן את הדפדפן (Ctrl+Shift+R)
2. בדוק שאין שגיאות JavaScript
3. בדוק שהקומפוננט `CandlestickChart` נטען

---

### פתרון 3: פורמט נתונים לא נכון

**סימנים:**
- `[CandlestickChart] ❌ Error setting data: ...`
- `[CandlestickChart] Invalid bar: ...`

**פתרון:**
הנתונים חייבים להיות בפורמט:
```typescript
{
  time: number,    // UNIX timestamp in SECONDS
  open: number,
  high: number,
  low: number,
  close: number
}
```

**איך לבדוק:**
1. פתח את הקונסול
2. בדוק את `[CandlestickChart] Sample bar:`
3. וודא ש-`time` הוא מספר (לא string)

---

### פתרון 4: Container לא מוכן

**סימנים:**
- הגרף לא מוצג בכלל
- שגיאת `containerRef.current is null`

**פתרון:**
1. בדוק ש-`containerRef` מחובר ל-DOM
2. בדוק שאין שגיאות CSS (height: 0, display: none)
3. בדוק שהקומפוננט `ChartPanel` נטען

---

## 🧪 בדיקה ידנית

### שלב 1: בדוק שהגרף נטען

```javascript
// בקונסול הדפדפן
document.querySelector('[data-chart-container]')
// צריך להחזיר element
```

### שלב 2: בדוק שהנתונים מגיעים

```javascript
// בקונסול הדפדפן
fetch('/api/market/bars?symbol=AAPL&timeframe=1m')
  .then(r => r.json())
  .then(data => {
    console.log('Bars:', data.length);
    console.log('Sample:', data[0]);
  });
```

### שלב 3: בדוק שהגרף מוכן

```javascript
// בקונסול הדפדפן
// צריך לראות:
// [CandlestickChart] ✅ Chart is ready, loading data for AAPL...
```

---

## 📋 Checklist

- [ ] הגרף מוצג (לא ריק לחלוטין)
- [ ] אין שגיאות בקונסול
- [ ] API מחזיר נתונים (`/api/market/bars`)
- [ ] הלוגים מראים "Loaded X bars"
- [ ] הלוגים מראים "Data set successfully"
- [ ] הלוגים מראים "Chart updated and fitted!"

---

## 🚨 אם כלום לא עובד

1. **רענן את הדפדפן** - Ctrl+Shift+R (hard refresh)
2. **נקה את ה-cache** - DevTools → Application → Clear storage
3. **בדוק את הלוגים** - העתק את כל הלוגים מהקונסול
4. **בדוק את ה-API** - פתח ישירות ב-browser
5. **בדוק את ה-network tab** - האם ה-API request מצליח?

---

## 📞 מה לשלוח כשמבקשים עזרה

1. **לוגים מהקונסול** (F12 → Console)
2. **לוגים מהטרמינל** (Next.js server)
3. **תגובת ה-API** (Network tab → `/api/market/bars`)
4. **תמונה של המסך** (איך הגרף נראה)
5. **איזה מניה ניסית** (AAPL, MSFT, etc.)

---

## ✅ Success Case - איך זה אמור להיראות

**בקונסול:**
```
[CandlestickChart] ✅ Chart is ready, loading data for AAPL...
[CandlestickChart] Loading bars for AAPL (1m)
[CandlestickChart] Loaded 100 bars
[CandlestickChart] Sample bar: { time: 1700000000, open: 150.25, high: 151.5, low: 149.8, close: 150.9 }
[CandlestickChart] Valid bars: 100 / 100
[CandlestickChart] Setting 100 bars to chart...
[CandlestickChart] ✅ Data set successfully
[CandlestickChart] Fitting content...
[CandlestickChart] ✅ Chart updated and fitted!
```

**בטרמינל:**
```
[Market Bars API] 📥 Request for AAPL (1m)
[Market Bars API] IBKR returned 0 bars
[Market Bars API] 💡 IBKR has no data, trying Yahoo Finance...
[Yahoo Finance] Fetching AAPL (1m, 1d)
[Yahoo Finance] ✅ Fetched 95 bars for AAPL
[Market Bars API] ✅ Returning 95 candles from Yahoo Finance
```

**בגרף:**
- ✅ נרות מוצגים
- ✅ ציר Y מציג מחירים
- ✅ ציר X מציג זמן
- ✅ Zoom/Pan עובד

---

**אם עדיין לא עובד, העתק את כל הלוגים ושלוח! 🔍**

