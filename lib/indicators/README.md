# 📊 Technical Indicators Library

מאגר מרכזי לכל האינדיקטורים הטכניים במערכת המסחר.

## 🎯 מטרה

**מאגר אחד, שימוש חוזר, עקביות מלאה.**

כל אסטרטגיה, מחלקה, או קומפוננט שצריך אינדיקטור טכני - ילך למאגר הזה ויקח מה שהוא צריך.

## 🚀 התקנה ושימוש בסיסי

```typescript
import * as Indicators from "@/lib/indicators";

// חישוב RSI
const closes = candles.map(c => c.close);
const rsi = Indicators.RSI(closes, 14);
console.log(`RSI(14): ${rsi}`);

// חישוב MACD
const macd = Indicators.MACD(closes, 12, 26, 9);
console.log(`MACD: ${macd.macd}, Signal: ${macd.signal}, Histogram: ${macd.histogram}`);

// חישוב ATR
const atr = Indicators.ATR(candles, 14);
console.log(`ATR(14): ${atr}`);
```

## 📚 רשימת אינדיקטורים

### 📈 Moving Averages (ממוצעים נעים)

#### **SMA - Simple Moving Average**
```typescript
const sma20 = Indicators.SMA(closes, 20);
const sma50 = Indicators.SMA(closes, 50);

// לסדרה שלמה:
const smaArray = Indicators.SMAArray(closes, 20);
```

**שימוש**: זיהוי טרנד, רמות תמיכה/התנגדות

---

#### **EMA - Exponential Moving Average**
```typescript
const ema20 = Indicators.EMA(closes, 20);
const ema50 = Indicators.EMA(closes, 50);

// לסדרה שלמה:
const emaArray = Indicators.EMAArray(closes, 20);
```

**שימוש**: זיהוי טרנד (רגיש יותר מ-SMA), בסיס ל-MACD

---

#### **WMA - Weighted Moving Average**
```typescript
const wma20 = Indicators.WMA(closes, 20);
```

**שימוש**: משקל גבוה יותר לנרות אחרונים

---

### 💪 Momentum Indicators (מומנטום)

#### **RSI - Relative Strength Index**
```typescript
const rsi = Indicators.RSI(closes, 14);

if (rsi > 70) {
  console.log("⚠️ Overbought - קנייה מוגזמת");
} else if (rsi < 30) {
  console.log("⚠️ Oversold - מכירה מוגזמת");
}

// לסדרה שלמה:
const rsiArray = Indicators.RSIArray(closes, 14);
```

**טווחים**:
- מעל 70 = Overbought (קנייה מוגזמת)
- מתחת 30 = Oversold (מכירה מוגזמת)
- 50 = נקודת ניטרליות

**שימוש**: זיהוי תנאי קיצון, דייברג'נס, סינון כניסות

---

#### **MACD - Moving Average Convergence Divergence**
```typescript
const macd = Indicators.MACD(closes, 12, 26, 9);

console.log(`MACD: ${macd.macd}`);
console.log(`Signal: ${macd.signal}`);
console.log(`Histogram: ${macd.histogram}`);

// סיגנל קנייה: MACD חוצה את Signal כלפי מעלה
if (macd.histogram > 0) {
  console.log("📈 Bullish crossover");
}

// לסדרה שלמה:
const macdArray = Indicators.MACDArray(closes, 12, 26, 9);
```

**רכיבים**:
- **MACD Line**: הפרש בין EMA מהיר לאיטי
- **Signal Line**: EMA של ה-MACD
- **Histogram**: הפרש בין MACD ל-Signal

**שימוש**: זיהוי שינויי טרנד, חיזוק סיגנלים

---

#### **Stochastic Oscillator**
```typescript
const stoch = Indicators.Stochastic(candles, 14, 3);

console.log(`%K: ${stoch.k}`);
console.log(`%D: ${stoch.d}`);

if (stoch.k > 80) {
  console.log("⚠️ Overbought");
} else if (stoch.k < 20) {
  console.log("⚠️ Oversold");
}

// לסדרה שלמה:
const stochArray = Indicators.StochasticArray(candles, 14, 3);
```

**טווחים**:
- מעל 80 = Overbought
- מתחת 20 = Oversold

**שימוש**: זיהוי קיצון יחסי, דייברג'נס

---

### 📊 Volatility Indicators (תנודתיות)

#### **ATR - Average True Range**
```typescript
const atr = Indicators.ATR(candles, 14);

// שימוש ל-Stop Loss
const stopDistance = atr * 2; // 2 ATR
const stopLoss = entryPrice - stopDistance;

// לסדרה שלמה:
const atrArray = Indicators.ATRArray(candles, 14);
```

**שימוש**: 
- קביעת Stop Loss דינמי
- מדידת volatility
- Position Sizing
- סינון תקופות שקטות מדי/תנודתיות מדי

---

#### **Bollinger Bands**
```typescript
const bb = Indicators.BollingerBands(closes, 20, 2);

console.log(`Upper Band: ${bb.upper}`);
console.log(`Middle Band (SMA): ${bb.middle}`);
console.log(`Lower Band: ${bb.lower}`);

// בדיקת מיקום מחיר
const price = closes[closes.length - 1];
if (price > bb.upper) {
  console.log("📈 Price above upper band (potential reversal)");
} else if (price < bb.lower) {
  console.log("📉 Price below lower band (potential bounce)");
}

// לסדרה שלמה:
const bbArray = Indicators.BollingerBandsArray(closes, 20, 2);
```

**רכיבים**:
- **Upper Band**: SMA + (2 × StdDev)
- **Middle Band**: SMA(20)
- **Lower Band**: SMA - (2 × StdDev)

**שימוש**: זיהוי volatility, mean reversion, breakouts

---

### 📦 Volume Indicators (ווליום)

#### **VWAP - Volume Weighted Average Price**
```typescript
// מחושב מתחילת היום (אינדקס 0)
const vwap = Indicators.VWAP(candles, 0);

const currentPrice = candles[candles.length - 1].close;
if (currentPrice > vwap) {
  console.log("📈 Price above VWAP (bullish)");
} else {
  console.log("📉 Price below VWAP (bearish)");
}
```

**שימוש**: 
- רמת תמיכה/התנגדות intraday
- Entry/Exit timing
- Fair value benchmark

---

#### **OBV - On Balance Volume**
```typescript
const obvArray = Indicators.OBVArray(candles);
const currentObv = obvArray[obvArray.length - 1];
```

**שימוש**: אישור טרנד דרך ווליום, דייברג'נס

---

#### **Average Volume**
```typescript
const avgVol = Indicators.AverageVolume(candles, 20);

const currentVol = candles[candles.length - 1].volume;
if (currentVol > avgVol * 2) {
  console.log("⚡ Abnormal volume - 2x average!");
}
```

**שימוש**: זיהוי ווליום חריג, אישור breakouts

---

### 🛠️ Utility Functions

```typescript
// אחוז שינוי
const change = Indicators.PercentChange(100, 105); // 5%

// ערך הכי גבוה/נמוך
const highest = Indicators.Highest(closes, 20);
const lowest = Indicators.Lowest(closes, 20);

// סטיית תקן
const stdDev = Indicators.StandardDeviation(closes, 20);
```

---

## ⚡ חישוב כל האינדיקטורים בבת אחת

```typescript
const allIndicators = Indicators.CalculateAllIndicators(candles);

console.log(allIndicators);
// {
//   sma9: 150.5,
//   sma20: 148.2,
//   sma50: 145.8,
//   ema20: 149.1,
//   rsi14: 65.4,
//   macd: { macd: 1.2, signal: 0.8, histogram: 0.4 },
//   atr14: 2.5,
//   bb: { upper: 152.5, middle: 148.0, lower: 143.5 },
//   vwap: 149.3,
//   ...
// }
```

**שימוש**: כאשר צריך הרבה אינדיקטורים בפעם אחת (efficient)

---

## 💡 דוגמאות שימוש מתקדמות

### דוגמה 1: אסטרטגיית Trend Following

```typescript
import * as Indicators from "@/lib/indicators";

function detectTrendFollowingEntry(candles: Candle[]) {
  const closes = candles.map(c => c.close);
  
  const sma50 = Indicators.SMA(closes, 50);
  const sma200 = Indicators.SMA(closes, 200);
  const rsi = Indicators.RSI(closes, 14);
  const macd = Indicators.MACD(closes, 12, 26, 9);
  
  // Golden Cross + RSI Confirmation + MACD Bullish
  const goldenCross = sma50 > sma200;
  const rsiOk = rsi > 40 && rsi < 70; // לא קיצון
  const macdBullish = macd.histogram > 0;
  
  if (goldenCross && rsiOk && macdBullish) {
    return {
      enter: true,
      reason: "Golden Cross + RSI OK + MACD Bullish",
      confidence: 0.85,
    };
  }
  
  return { enter: false };
}
```

---

### דוגמה 2: Stop Loss דינמי עם ATR

```typescript
function calculateDynamicStopLoss(
  candles: Candle[],
  entryPrice: number,
  direction: "LONG" | "SHORT",
  atrMultiplier: number = 2
) {
  const atr = Indicators.ATR(candles, 14);
  
  if (!atr) return null;
  
  const stopDistance = atr * atrMultiplier;
  
  if (direction === "LONG") {
    return entryPrice - stopDistance;
  } else {
    return entryPrice + stopDistance;
  }
}

// שימוש:
const stopLoss = calculateDynamicStopLoss(candles, 150, "LONG", 2);
console.log(`Stop Loss: ${stopLoss}`); // 150 - (2 × ATR)
```

---

### דוגמה 3: סינון כניסות לפי Multiple Timeframes

```typescript
function multiTimeframeConfirmation(
  candles1m: Candle[],
  candles5m: Candle[],
  candles15m: Candle[]
) {
  const closes1m = candles1m.map(c => c.close);
  const closes5m = candles5m.map(c => c.close);
  const closes15m = candles15m.map(c => c.close);
  
  const rsi1m = Indicators.RSI(closes1m, 14);
  const rsi5m = Indicators.RSI(closes5m, 14);
  const rsi15m = Indicators.RSI(closes15m, 14);
  
  // כל התקופות מראות oversold
  const allOversold = rsi1m < 35 && rsi5m < 35 && rsi15m < 35;
  
  return {
    confirmed: allOversold,
    strength: allOversold ? "STRONG" : "WEAK",
  };
}
```

---

### דוגמה 4: זיהוי Bollinger Band Squeeze

```typescript
function detectBollingerSqueeze(candles: Candle[], threshold: number = 0.02) {
  const closes = candles.map(c => c.close);
  const bb = Indicators.BollingerBands(closes, 20, 2);
  
  if (!bb) return null;
  
  // חישוב רוחב הבנדים
  const bandwidth = (bb.upper - bb.lower) / bb.middle;
  
  // Squeeze = הבנדים צרים מאוד (volatility נמוכה)
  if (bandwidth < threshold) {
    return {
      squeeze: true,
      bandwidth,
      message: "Bollinger Bands Squeeze - Breakout expected!",
    };
  }
  
  return { squeeze: false, bandwidth };
}
```

---

## 🔧 שימוש בתוך אסטרטגיות

### עדכון אסטרטגיה קיימת:

```typescript
// במקום:
function calculateSMA(values: number[], period: number) {
  // ... custom implementation
}

// השתמש במאגר:
import * as Indicators from "@/lib/indicators";

const sma = Indicators.SMA(values, period);
```

### דוגמה מלאה באסטרטגיה:

```typescript
import { IPatternStrategy } from "../scanner/trade-pattern-scanner";
import * as Indicators from "../indicators";
import type { Candle } from "./types";

export class MyCustomStrategy implements IPatternStrategy {
  name = "MY_STRATEGY";
  direction = "BOTH";
  
  detectPattern(candles: Candle[], indicators?: IndicatorSnapshot) {
    const closes = candles.map(c => c.close);
    
    // שימוש באינדיקטורים מהמאגר
    const rsi = Indicators.RSI(closes, 14);
    const macd = Indicators.MACD(closes, 12, 26, 9);
    const atr = Indicators.ATR(candles, 14);
    const bb = Indicators.BollingerBands(closes, 20, 2);
    
    // לוגיקת זיהוי תבנית...
    if (rsi < 30 && macd.histogram > 0) {
      return {
        patternFound: true,
        entryPrice: candles[candles.length - 1].close,
        stopLoss: candles[candles.length - 1].close - (atr * 2),
      };
    }
    
    return { patternFound: false };
  }
}
```

---

## 📊 אינדיקטורים אוטומטיים ב-RealTimeDataClient

כל נר חדש שמגיע מ-IBKR מחושב אוטומטית עם כל האינדיקטורים:

```typescript
// lib/runtime/trading-orchestrator.ts

subscribeCandles(symbol, (candles, indicators) => {
  // indicators כבר מכיל הכל!
  console.log(indicators.rsi14);      // 65.4
  console.log(indicators.macd);       // 1.2
  console.log(indicators.atr14);      // 2.5
  console.log(indicators.bbUpper);    // 152.5
  console.log(indicators.vwap);       // 149.3
  
  // האסטרטגיה מקבלת את זה אוטומטית
  strategy.detectPattern(candles, indicators);
});
```

---

## 🎯 Best Practices

### ✅ DO:

```typescript
// 1. השתמש במאגר למחשוב חד-פעמי
const rsi = Indicators.RSI(closes, 14);

// 2. לסדרות שלמות השתמש ב-Array functions
const rsiArray = Indicators.RSIArray(closes, 14);

// 3. בדוק null לפני שימוש
const sma = Indicators.SMA(closes, 50);
if (sma !== null) {
  console.log(`SMA(50): ${sma}`);
}

// 4. השתמש ב-CalculateAllIndicators לביצועים טובים יותר
const all = Indicators.CalculateAllIndicators(candles);
```

### ❌ DON'T:

```typescript
// 1. אל תממש אינדיקטורים בעצמך שוב
// BAD:
function mySMA(values, period) { /* custom code */ }

// GOOD:
import * as Indicators from "@/lib/indicators";
const sma = Indicators.SMA(values, period);

// 2. אל תשכח לבדוק null
// BAD:
const rsi = Indicators.RSI(closes, 14);
if (rsi > 70) { /* crash if rsi is null! */ }

// GOOD:
const rsi = Indicators.RSI(closes, 14);
if (rsi !== null && rsi > 70) { /* safe */ }
```

---

## 🧪 Testing

```typescript
import * as Indicators from "@/lib/indicators";

// יצירת נתונים לבדיקה
const testCandles: Candle[] = [
  { time: "2024-01-01", open: 100, high: 105, low: 98, close: 103, volume: 1000 },
  { time: "2024-01-02", open: 103, high: 107, low: 102, close: 106, volume: 1200 },
  // ...
];

// בדיקת RSI
const rsi = Indicators.RSI(testCandles.map(c => c.close), 14);
expect(rsi).toBeGreaterThan(0);
expect(rsi).toBeLessThan(100);

// בדיקת ATR
const atr = Indicators.ATR(testCandles, 14);
expect(atr).toBeGreaterThan(0);
```

---

## 📚 מקורות נוספים

- [TradingView Indicators](https://www.tradingview.com/scripts/technicalindicator/)
- [Investopedia - Technical Indicators](https://www.investopedia.com/terms/t/technicalindicator.asp)
- [TA-Lib Documentation](https://ta-lib.org/)

---

## 🚀 תכונות עתידיות

- [ ] Ichimoku Cloud
- [ ] Fibonacci Retracements
- [ ] Volume Profile
- [ ] Market Profile
- [ ] Custom Indicators Builder
- [ ] Indicator Backtesting Suite

---

**נוצר על ידי מערכת המסחר האלגוריתמית** 🤖

