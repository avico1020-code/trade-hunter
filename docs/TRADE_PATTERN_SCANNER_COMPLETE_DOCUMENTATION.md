# דוח מפורט: מערכת סריקת תבניות מסחר (Trade Pattern Scanner System)

**תאריך עדכון אחרון:** דצמבר 2024  
**גרסה:** 1.0  
**סטטוס:** Production Ready

---

## 📋 תוכן עניינים

1. [סקירה כללית](#סקירה-כללית)
2. [ארכיטקטורה כללית](#ארכיטקטורה-כללית)
3. [רכיבים עיקריים](#רכיבים-עיקריים)
4. [תהליך הסריקה](#תהליך-הסריקה)
5. [תכונות מתקדמות](#תכונות-מתקדמות)
6. [אינטגרציות](#אינטגרציות)
7. [מצב נוכחי ותכנון עתידי](#מצב-נוכחי-ותכנון-עתידי)
8. [דוגמאות שימוש](#דוגמאות-שימוש)

---

## 🎯 סקירה כללית

### מטרת המערכת

**Trade Pattern Scanner** היא שכבת ביניים במערכת המסחר האלגוריתמית, המחברת בין:
- **Master Scoring System** (מערכת הניקוד) - בוחרת מניות מובילות
- **Execution Engine** (מנוע הביצוע) - מבצע את העסקאות בפועל

המערכת אחראית ל:
1. סריקת מניות בעלות ציון גבוה
2. זיהוי תבניות מסחר (Double Top, Gap Up, Breakout וכו')
3. אימות התבניות מול נתונים בזמן אמת
4. העברת התראות למנוע הביצוע

### מיקום במערכת הכוללת

```
┌─────────────────────────────────────────────────────────────┐
│                    מערכת המסחר האלגוריתמית                    │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────┐    ┌──────────────────┐    ┌──────────────┐
│ Master       │───▶│ Trade Pattern    │───▶│ Execution    │
│ Scoring      │    │ Scanner          │    │ Engine       │
│ System       │    │                  │    │              │
│              │    │                  │    │              │
│ • Technical  │    │ • Pattern        │    │ • Trade      │
│ • News       │    │   Detection      │    │   Execution  │
│ • Macro      │    │ • Real-time      │    │ • Risk Mgmt  │
│ • Sector     │    │   Scanning       │    │ • Position   │
│ • Options    │    │ • Direction      │    │   Sizing     │
│ • Micro      │    │   Filtering      │    │              │
└──────────────┘    └──────────────────┘    └──────────────┘
```

---

## 🏗️ ארכיטקטורה כללית

### עקרונות עיצוב

1. **Modular Design** - כל אסטרטגיה היא מודול עצמאי
2. **Interface-Based** - ממשק אחיד (`IPatternStrategy`) לכל האסטרטגיות
3. **Real-time Processing** - עיבוד בזמן אמת עם subscriptions
4. **Direction-Aware** - סינון אסטרטגיות לפי כיוון המסחר
5. **Anti-Spam Protection** - מניעת טריגרים כפולים

### מבנה הקבצים

```
lib/
├── scanner/
│   └── trade-pattern-scanner.ts    # מחלקת הסורק הראשית
└── strategies/
    ├── double-top.ts                # אסטרטגיית Double Top
    ├── gap-up.ts                    # אסטרטגיית Gap Up (לעתיד)
    └── breakout.ts                  # אסטרטגיית Breakout (לעתיד)
```

---

## 🔧 רכיבים עיקריים

### 1. TradePatternScanner Class

**מיקום:** `lib/scanner/trade-pattern-scanner.ts`

**תפקידים:**
- ניהול הסריקה הראשית
- קישור בין Master Scoring ל-Real-time Data
- הרצת זיהוי תבניות על כל עדכון
- ניהול Debounce ואנטי-ספאם
- סינון לפי כיוון (LONG/SHORT)

**מבנה הקלאס:**

```typescript
export class TradePatternScanner {
  private lastDetection: Record<string, number> = {}; // Anti-spam tracking
  
  constructor(
    private masterClient: MasterScoringClient,      // מקור: רשימת מניות מובילות
    private dataClient: RealTimeDataClient,         // מקור: נתונים בזמן אמת
    private strategies: IPatternStrategy[],         // רשימת אסטרטגיות
    private config: TradePatternScannerConfig,      // הגדרות הסורק
    private onPatternFound: OnPatternFoundHandler,  // callback להתראות
    private logger?: ScannerLogger                  // מערכת לוגינג
  )
}
```

### 2. IPatternStrategy Interface

**תפקיד:** ממשק אחיד לכל אסטרטגיות זיהוי תבניות

**מבנה:**

```typescript
export interface IPatternStrategy {
  name: string;              // "DOUBLE_TOP", "GAP_UP", etc.
  direction: "LONG" | "SHORT" | "BOTH";
  
  detectPattern(
    candles: Candle[],
    indicators?: IndicatorSnapshot
  ): PatternDetectionResult;
}
```

**חובה על כל אסטרטגיה:**
- לממש את הממשק במלואו
- להחזיר `patternFound: boolean`
- להגדיר כיוון מסחר (LONG/SHORT/BOTH)
- לטפל בשגיאות פנימית

### 3. RealTimeDataClient Interface

**תפקיד:** ממשק לנתונים בזמן אמת

**מבנה:**

```typescript
export interface RealTimeDataClient {
  subscribeCandles(
    symbol: string,
    onUpdate: (candles: Candle[], indicators: IndicatorSnapshot) => void
  ): void;
}
```

**דרישות:**
- חיבור ל-IBKR TWS/Gateway
- עדכונים רציפים של candles ואינדיקטורים
- ניהול subscriptions לכל מניה

### 4. MasterScoringClient Interface

**תפקיד:** ממשק למערכת הניקוד

**מבנה:**

```typescript
export interface MasterScoringClient {
  getTopSymbols(minScore: number): Promise<MasterSymbolInfo[]>;
}
```

**החזר נתונים:**

```typescript
interface MasterSymbolInfo {
  symbol: string;
  direction: "LONG" | "SHORT";
  masterScore: number;
  moduleScores: Record<string, number>; // Technical, News, Macro, etc.
}
```

---

## 🔄 תהליך הסריקה

### שלב 1: אתחול הסורק

```
1. TradePatternScanner מופעל
   ↓
2. קריאה ל-masterClient.getTopSymbols(minMasterScore)
   ↓
3. קבלת רשימת מניות מובילות (לדוגמה: 20 מניות עם ציון ≥ 6.0)
   ↓
4. סינון לפי maxSymbolsToScan (אם מוגדר)
```

### שלב 2: הרשמה לנתונים בזמן אמת

```
עבור כל מניה ברשימה:
  1. קריאה ל-dataClient.subscribeCandles(symbol, onUpdate)
  2. פתיחת subscription לנרות ואינדיקטורים
  3. שמירת MasterSymbolInfo להקשר
```

### שלב 3: עיבוד עדכונים

```
על כל עדכון נתונים חדש:
  ↓
1. אימות מבנה הנרות (validateCandles)
  ↓
2. בדיקת נר סגור (אם requireClosedCandle=true)
  ↓
3. לולאה על כל האסטרטגיות:
   ├─ בדיקת כיוון (isStrategyAllowedForSymbol)
   ├─ הרצת detectPattern()
   ├─ בדיקת Anti-spam (shouldEmit)
   └─ אם נמצא תבנית → יצירת PatternFoundEvent
```

### שלב 4: העברת התראות

```
PatternFoundEvent כולל:
  • symbol: מניה
  • strategyName: שם האסטרטגיה
  • strategyDirection: כיוון האסטרטגיה
  • patternState: מצב התבנית (entryPrice, stopLoss, metadata)
  • master: MasterSymbolInfo (ציון וכוון)
  • detectedAt: timestamp

  ↓
קריאה ל-onPatternFound(event)
  ↓
העברה ל-Execution Engine
```

### דיאגרמת זרימה מלאה

```
┌────────────────────────────────────────────────────────────┐
│                     START SCANNER                           │
└────────────────────────────────────────────────────────────┘
                          │
                          ▼
        ┌─────────────────────────────────┐
        │  getTopSymbols(minMasterScore)  │
        └─────────────────────────────────┘
                          │
                          ▼
        ┌─────────────────────────────────┐
        │   [AAPL, GOOGL, MSFT, ...]      │
        │   (רשימת מניות מדורגות)          │
        └─────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
        ▼                 ▼                 ▼
  ┌─────────┐      ┌─────────┐      ┌─────────┐
  │ AAPL    │      │ GOOGL   │      │ MSFT    │
  │ LONG    │      │ SHORT   │      │ LONG    │
  │ Score:  │      │ Score:  │      │ Score:  │
  │ 7.5     │      │ 6.8     │      │ 8.2     │
  └─────────┘      └─────────┘      └─────────┘
        │                 │                 │
        ▼                 ▼                 ▼
  ┌────────────────────────────────────────────┐
  │  subscribeCandles(symbol, onUpdate)        │
  │  (Real-time subscription לכל מניה)         │
  └────────────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
        ▼                 ▼                 ▼
  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
  │ New Candle   │  │ New Candle   │  │ New Candle   │
  │ Update       │  │ Update       │  │ Update       │
  └──────────────┘  └──────────────┘  └──────────────┘
        │                 │                 │
        ▼                 ▼                 ▼
  ┌────────────────────────────────────────────┐
  │         For Each Strategy:                 │
  │  1. Check Direction Filter                 │
  │  2. Run detectPattern()                    │
  │  3. Check Anti-spam                        │
  │  4. If found → Emit Event                  │
  └────────────────────────────────────────────┘
                          │
                          ▼
  ┌────────────────────────────────────────────┐
  │     PatternFoundEvent → Execution Engine   │
  └────────────────────────────────────────────┘
```

---

## ⚙️ תכונות מתקדמות

### 1. Direction-Aware Filtering

**מטרה:** למנוע הרצת אסטרטגיות שלא מתאימות לכיוון המסחר

**אופן פעולה:**

```typescript
// אם Master Scoring קבע LONG:
- רק אסטרטגיות LONG או BOTH ירצו
- אסטרטגיות SHORT יידלגו

// אם Master Scoring קבע SHORT:
- רק אסטרטגיות SHORT או BOTH ירצו
- אסטרטגיות LONG יידלגו
```

**יתרונות:**
- חיסכון במשאבים
- תאימות גבוהה יותר בין תבנית לכיוון
- הקטנת false positives

**הפעלה:**
```typescript
config: {
  enableDirectionFilter: true  // ברירת מחדל: false
}
```

### 2. Debounce (Anti-Spam) System

**מטרה:** למנוע טריגרים מרובים מאותה תבנית

**אופן פעולה:**

```typescript
// מפתח: "AAPL::DOUBLE_TOP"
// ערך: timestamp של זיהוי אחרון

// לפני טריגר:
1. בדיקה: האם חלפו debounceMs מילי-שניות מהטיגר האחרון?
2. אם כן → מותר לטיגר
3. אם לא → טריגר נחסם
```

**ברירת מחדל:** 2000ms (2 שניות)

**התאמה:**
```typescript
config: {
  debounceMs: 3000  // 3 שניות
}
```

### 3. Closed Candle Protection

**מטרה:** להריץ זיהוי רק על נרות סגורים (מומלץ ל-Price Action)

**אופן פעולה:**

```typescript
// בדיקת isClosed על הנר האחרון
if (requireClosedCandle && !hasClosedLastCandle(candles)) {
  return; // מדלגים על העדכון
}
```

**שימוש:**
- תבניות המבוססות על Price Action
- תבניות הדורשות אישור מלא
- מסחר שמרני יותר

**הפעלה:**
```typescript
config: {
  requireClosedCandle: true
}
```

### 4. Validation Layers

**רמות אימות:**

1. **Symbol Info Validation**
   - בדיקת מבנה MasterSymbolInfo
   - אימות symbol, direction, masterScore
   
2. **Candles Validation**
   - בדיקת מבנה נרות (OHLCV)
   - אימות ערכים תקינים
   - בדיקת לוגיקה (high ≥ low, וכו')

3. **Pattern Result Validation**
   - אימות מבנה PatternDetectionResult
   - בדיקת patternFound

**תוצאה:** מערכת יציבה יותר, פחות crashes

### 5. Historical Scanning (Backtest Mode)

**שימוש:** סריקה על נתונים היסטוריים לביצוע backtest

**מטודות:**

```typescript
// סריקה למניה אחת
scanHistorical(
  symbol: string,
  candles: Candle[],
  indicators?: IndicatorSnapshot,
  masterOverride?: Partial<MasterSymbolInfo>
): Promise<PatternFoundEvent[]>

// סריקה מרובת מניות
scanHistoricalBatch(
  batch: Array<{symbol, candles, indicators}>,
  masterOverrides?: Record<string, Partial<MasterSymbolInfo>>
): Promise<PatternFoundEvent[]>
```

**הבדלים מ-Real-time Mode:**
- ❌ לא משתמש ב-debounce
- ❌ לא משתמש ב-direction filtering
- ❌ לא דורש נר סגור
- ✅ מחזיר כל האירועים שנמצאו

---

## 🔗 אינטגרציות

### 1. אינטגרציה עם Master Scoring System

**זרימת נתונים:**

```
Python Scoring Engine
  ↓
Master Scoring Calculation
  ↓
saveSymbolScores() → Convex
  ↓
getTopRankedSymbols() → Scanner
  ↓
TradePatternScanner.start()
```

**נתונים נדרשים:**
- `symbol`: שם המניה
- `direction`: LONG/SHORT
- `masterScore`: ציון סופי
- `moduleScores`: ציוני מחלקות

### 2. אינטגרציה עם Real-time Data

**דרישות:**
- חיבור ל-IBKR TWS/Gateway
- מנוי לנתונים בזמן אמת
- עדכוני candles רציפים
- אינדיקטורים טכניים (RSI, MACD, VWAP וכו')

**עדכונים נדרשים:**
- כל נר חדש
- שינויי מחיר משמעותיים
- עדכוני ווליום

### 3. אינטגרציה עם Execution Engine

**אירוע מועבר:**

```typescript
PatternFoundEvent {
  symbol: "AAPL",
  strategyName: "DOUBLE_TOP",
  strategyDirection: "SHORT",
  patternState: {
    patternFound: true,
    entryPrice: 180.50,
    stopLoss: 185.00,
    metadata: { ... }
  },
  master: {
    symbol: "AAPL",
    direction: "SHORT",
    masterScore: 7.5,
    moduleScores: { ... }
  },
  detectedAt: "2024-12-15T10:30:00.000Z"
}
```

**תהליך ב-Execution Engine:**
1. קבלת PatternFoundEvent
2. אימות תנאי כניסה
3. חישוב גודל פוזיציה
4. בדיקת ניהול סיכון
5. ביצוע העסקה (אם כל התנאים מתקיימים)

---

## 📊 מצב נוכחי ותכנון עתידי

### ✅ מה כבר קיים

1. **TradePatternScanner Class**
   - ✅ ארכיטקטורה מלאה
   - ✅ Direction filtering
   - ✅ Debounce system
   - ✅ Closed candle protection
   - ✅ Validation layers
   - ✅ Historical scanning

2. **IPatternStrategy Interface**
   - ✅ ממשק מוגדר
   - ✅ תמיכה ב-LONG/SHORT/BOTH

3. **DoubleTopStrategy**
   - ✅ מימוש מלא
   - ✅ Adapter pattern
   - ✅ אינטגרציה עם Scanner

4. **Type Definitions**
   - ✅ כל ה-interfaces מוגדרים
   - ✅ Type safety מלא

### 🚧 מה חסר (טרם מיושם)

1. **RealTimeDataClient Implementation**
   - ❌ חיבור ל-IBKR טרם קיים
   - ❌ Subscription management
   - ❌ נתונים בזמן אמת

2. **MasterScoringClient Implementation**
   - ❌ חיבור ל-Python Scoring Engine
   - ❌ קריאה מ-Convex
   - ❌ Caching mechanism

3. **אסטרטגיות נוספות**
   - ❌ Gap Up Strategy
   - ❌ Breakout Strategy
   - ❌ Reversal Strategies

4. **Logging System**
   - ❌ יישום ScannerLogger מלא
   - ❌ לוגים מובנים
   - ❌ ניטור וביקורת

5. **Error Handling**
   - ❌ Retry logic
   - ❌ Error recovery
   - ❌ Fallback mechanisms

6. **Performance Optimization**
   - ❌ Caching של תוצאות
   - ❌ Batch processing
   - ❌ Resource management

### 📅 תכנון עתידי

#### שלב 1: חיבורים בסיסיים
- [ ] RealTimeDataClient עם IBKR
- [ ] MasterScoringClient עם Convex
- [ ] בדיקות אינטגרציה

#### שלב 2: אסטרטגיות נוספות
- [ ] Gap Up Strategy
- [ ] Breakout Strategy
- [ ] Double Bottom Strategy

#### שלב 3: שיפורי ביצועים
- [ ] Caching layer
- [ ] Optimized subscriptions
- [ ] Resource pooling

#### שלב 4: ניטור ולוגים
- [ ] Logging infrastructure
- [ ] Performance metrics
- [ ] Alert system

---

## 💡 דוגמאות שימוש

### דוגמה 1: אתחול בסיסי

```typescript
import { TradePatternScanner } from "@/lib/scanner/trade-pattern-scanner";
import { DoubleTopStrategy } from "@/lib/strategies/double-top";

// יצירת אסטרטגיה
const doubleTopStrategy = new DoubleTopStrategy(config);

// יצירת סורק
const scanner = new TradePatternScanner(
  masterClient,      // ממשק ל-Master Scoring
  dataClient,        // ממשק לנתונים בזמן אמת
  [doubleTopStrategy], // רשימת אסטרטגיות
  {
    minMasterScore: 6.0,
    maxSymbolsToScan: 20,
    enableDirectionFilter: true,
    debounceMs: 2000,
    requireClosedCandle: false
  },
  (event) => {
    // טיפול בהתראה
    console.log("Pattern found!", event);
    executionEngine.handlePatternFound(event);
  },
  logger // אופציונלי
);

// הפעלה
await scanner.start();
```

### דוגמה 2: Backtest על נתונים היסטוריים

```typescript
// הכנת נתונים
const historicalData = {
  symbol: "AAPL",
  candles: [...], // נרות היסטוריים
  indicators: {...} // אינדיקטורים
};

// סריקה היסטורית
const events = await scanner.scanHistorical(
  historicalData.symbol,
  historicalData.candles,
  historicalData.indicators,
  {
    direction: "SHORT",
    masterScore: 7.5
  }
);

// ניתוח התוצאות
events.forEach(event => {
  console.log(`Found ${event.strategyName} on ${event.symbol}`);
});
```

### דוגמה 3: Batch Backtest

```typescript
// הכנת batch
const batch = [
  { symbol: "AAPL", candles: [...], indicators: {...} },
  { symbol: "GOOGL", candles: [...], indicators: {...} },
  { symbol: "MSFT", candles: [...], indicators: {...} }
];

// Master overrides
const masterOverrides = {
  "AAPL": { direction: "SHORT", masterScore: 7.5 },
  "GOOGL": { direction: "LONG", masterScore: 8.2 }
};

// סריקה מרובת מניות
const allEvents = await scanner.scanHistoricalBatch(batch, masterOverrides);

// סינון לפי אסטרטגיה
const doubleTopEvents = allEvents.filter(e => e.strategyName === "DOUBLE_TOP");
```

---

## 📈 מדדי ביצועים

### מטריקות חשובות

1. **Detection Rate**
   - כמה תבניות מזוהות בשעה
   - יחס בין false positives ל-true positives

2. **Latency**
   - זמן מזיהוי עד התראה
   - זמן עדכון מנוי

3. **Resource Usage**
   - צריכת CPU
   - צריכת זיכרון
   - מספר subscriptions פעילים

4. **Accuracy**
   - אחוז תבניות שהובילו לעסקה
   - אחוז תבניות רווחיות

---

## 🔒 אבטחה ויציבות

### מנגנוני הגנה

1. **Input Validation**
   - אימות כל הנתונים הנכנסים
   - בדיקת מבנה נתונים

2. **Error Handling**
   - Try-catch בכל הרמות
   - Continuation על שגיאות

3. **Resource Management**
   - ניהול subscriptions
   - ניקוי resources

4. **Anti-Spam**
   - Debounce mechanism
   - Rate limiting

---

## 📚 מסמכי עזר נוספים

- `docs/TRADE_ROUTER_COMPLETE_DOCUMENTATION.md` - תיעוד מנוע הביצוע
- `docs/SCORING_SYSTEM_WEIGHTS_DOCUMENTATION.md` - תיעוד מערכת הניקוד
- `lib/scanner/trade-pattern-scanner.ts` - קוד המקור
- `lib/strategies/double-top.ts` - דוגמת אסטרטגיה

---

**סוף הדוח**

