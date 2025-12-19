# Interactive Brokers API Integration

## 📋 סקירה כללית

אינטגרציה מלאה של **Interactive Brokers Client Portal API** דרך **IB Gateway** לאפליקציית Next.js.

---

## 🔧 דרישות מוקדמות

### 1. IB Gateway
- **הורד והתקן**: [IB Gateway](https://www.interactivebrokers.com/en/index.php?f=16457)
- **גרסה מומלצת**: Latest Stable
- **פורט**: `5000` (ברירת מחדל)

### 2. הגדרת IB Gateway

1. **הפעל את IB Gateway**
2. **התחבר עם פרטי החשבון שלך**
3. **אמת שהשרת רץ**: גש ל-[https://localhost:5000](https://localhost:5000)
4. **קבל אישור אבטחה**: דפדפן יציג אזהרת SSL (זה תקין - זה self-signed certificate)

---

## 📁 מבנה הקבצים

```
lib/
├── types/ibkr.ts              # TypeScript types for IBKR API
├── ibkr/
│   ├── client.ts              # IBKR API Client (server-side)
│   └── hooks.ts               # React hooks for IBKR data
│
app/api/ibkr/
├── auth/status/route.ts       # Authentication status endpoint
├── portfolio/accounts/route.ts # Portfolio accounts endpoint
├── market-data/snapshot/route.ts # Market data snapshot endpoint
└── stream/route.ts            # WebSocket streaming endpoint
│
components/ibkr/
└── IbkrConnectionStatus.tsx   # Connection status component
```

---

## 🚀 שימוש

### 1. בדיקת חיבור

```tsx
import { IbkrConnectionStatus } from "@/components/ibkr/IbkrConnectionStatus";

export default function Page() {
  return (
    <div>
      <IbkrConnectionStatus />
    </div>
  );
}
```

### 2. שימוש ב-React Hooks

#### בדיקת סטטוס אימות

```tsx
import { useIbkrAuthStatus } from "@/lib/ibkr/hooks";

export function MyComponent() {
  const { status, isLoading, error, refetch } = useIbkrAuthStatus();

  if (isLoading) return <div>בודק חיבור...</div>;
  if (error) return <div>שגיאה: {error}</div>;

  return (
    <div>
      <p>מחובר: {status?.authenticated ? "כן" : "לא"}</p>
      <p>פעיל: {status?.connected ? "כן" : "לא"}</p>
      <button onClick={refetch}>רענן</button>
    </div>
  );
}
```

#### קבלת רשימת חשבונות

```tsx
import { useIbkrAccounts } from "@/lib/ibkr/hooks";

export function AccountsList() {
  const { accounts, isLoading, error } = useIbkrAccounts();

  if (isLoading) return <div>טוען...</div>;
  if (error) return <div>שגיאה: {error}</div>;

  return (
    <ul>
      {accounts.map((account) => (
        <li key={account.id}>
          {account.displayName} - {account.accountId}
        </li>
      ))}
    </ul>
  );
}
```

#### קבלת מחיר מניה (Snapshot)

```tsx
import { useIbkrMarketData } from "@/lib/ibkr/hooks";

export function StockPrice({ symbol }: { symbol: string }) {
  const { data, isLoading, error, refetch } = useIbkrMarketData(symbol);

  if (isLoading) return <div>טוען מחיר...</div>;
  if (error) return <div>שגיאה: {error}</div>;

  const lastPrice = data?.["31"]; // Field 31 = Last Price
  const bid = data?.["84"]; // Field 84 = Bid
  const ask = data?.["86"]; // Field 86 = Ask

  return (
    <div>
      <h3>{symbol}</h3>
      <p>מחיר אחרון: ${lastPrice}</p>
      <p>Bid: ${bid}</p>
      <p>Ask: ${ask}</p>
      <button onClick={refetch}>רענן</button>
    </div>
  );
}
```

#### נתונים בזמן אמת (WebSocket Streaming)

```tsx
import { useIbkrStreamMarketData } from "@/lib/ibkr/hooks";
import { IBKR_FIELDS } from "@/lib/types/ibkr";

export function RealTimePrice({ conid }: { conid: number }) {
  const { data, isConnected, error } = useIbkrStreamMarketData(
    [conid],
    [IBKR_FIELDS.LAST_PRICE, IBKR_FIELDS.BID, IBKR_FIELDS.ASK]
  );

  const snapshot = data.get(conid);

  if (error) return <div>שגיאה: {error}</div>;
  if (!isConnected) return <div>מתחבר...</div>;

  return (
    <div>
      <p>מחיר: ${snapshot?.["31"]}</p>
      <p>סטטוס: {isConnected ? "🟢 מחובר" : "🔴 מנותק"}</p>
    </div>
  );
}
```

### 3. שימוש ישיר ב-API Client (Server-Side)

```typescript
import { getIbkrClient } from "@/lib/ibkr/client";

export async function getServerSideProps() {
  const client = getIbkrClient();

  try {
    // Check auth
    const status = await client.getAuthStatus();

    // Get accounts
    const accounts = await client.getPortfolioAccounts();

    // Get market data for AAPL
    const aapl = await client.getMarketDataBySymbol("AAPL");

    // Get historical data
    const history = await client.getHistoricalBySymbol("TSLA", "1m", "1d");

    return { props: { status, accounts, aapl, history } };
  } catch (error) {
    return { props: { error: error.message } };
  }
}
```

---

## 📊 שדות נתוני שוק (Market Data Fields)

השתמש ב-`IBKR_FIELDS` לגישה לשדות:

```typescript
import { IBKR_FIELDS } from "@/lib/types/ibkr";

// Common fields
IBKR_FIELDS.LAST_PRICE    // "31" - Last Price
IBKR_FIELDS.BID           // "84" - Bid Price
IBKR_FIELDS.ASK           // "86" - Ask Price
IBKR_FIELDS.HIGH          // "87" - Day High
IBKR_FIELDS.LOW           // "88" - Day Low
IBKR_FIELDS.VOLUME        // "7308" - Volume
IBKR_FIELDS.CLOSE         // "7295" - Previous Close
IBKR_FIELDS.OPEN          // "7296" - Open Price
IBKR_FIELDS.CHANGE        // "82" - Change
IBKR_FIELDS.CHANGE_PERCENT // "83" - Change %
```

---

## 📈 פקודות קנייה/מכירה (Orders)

### הזמנת פקודה

```typescript
import { getIbkrClient } from "@/lib/ibkr/client";

const client = getIbkrClient();

// Market Order - Buy 100 shares of AAPL
const order = {
  conid: 265598, // AAPL conid
  orderType: "MKT" as const,
  side: "BUY" as const,
  quantity: 100,
  tif: "DAY" as const,
};

const result = await client.placeOrder("DU1234567", order);
console.log("Order placed:", result);
```

### ביטול פקודה

```typescript
await client.cancelOrder("DU1234567", "12345");
```

### צפייה בפקודות פתוחות

```typescript
const openOrders = await client.getOpenOrders();
console.log("Open orders:", openOrders);
```

---

## 🔍 חיפוש מניות וקבלת Contract ID

```typescript
const client = getIbkrClient();

// Search for stock
const results = await client.searchStocks("AAPL");
console.log("Search results:", results);

// Get conid directly
const conid = await client.getConidForStock("TSLA");
console.log("TSLA conid:", conid); // e.g., 76792991
```

---

## 🌐 WebSocket Streaming

### צד שרת (Next.js API Route)

הקוד כבר מוכן ב-`app/api/ibkr/stream/route.ts`.

### צד לקוח (React Hook)

```tsx
import { useIbkrStreamMarketData } from "@/lib/ibkr/hooks";

export function StreamingComponent() {
  const conids = [265598, 76792991]; // AAPL, TSLA
  const { data, isConnected, error } = useIbkrStreamMarketData(conids);

  return (
    <div>
      <p>סטטוס: {isConnected ? "מחובר" : "מנותק"}</p>
      {Array.from(data.entries()).map(([conid, snapshot]) => (
        <div key={conid}>
          <p>Conid: {conid}</p>
          <p>מחיר: ${snapshot["31"]}</p>
        </div>
      ))}
    </div>
  );
}
```

---

## 🛡️ אבטחה

### SSL Self-Signed Certificate

IB Gateway משתמש ב-self-signed certificate ב-localhost. הקוד מטפל בזה באופן אוטומטי:

```typescript
// In lib/ibkr/client.ts
agent: new (require("https").Agent)({ rejectUnauthorized: false })
```

**⚠️ חשוב**: זה בטוח רק ל-localhost. אל תשתמש ב-`rejectUnauthorized: false` ב-production!

### Environment Variables

אם אתה רוצה להגדיר URL מותאם אישית:

```env
# .env.local
IBKR_GATEWAY_URL=https://localhost:5000/v1/api
```

---

## 🐛 פתרון בעיות

### שגיאה: "IB Gateway is not connected"

**פתרון**:
1. ודא ש-IB Gateway רץ
2. התחבר עם פרטי החשבון
3. בדוק ש-[https://localhost:5000](https://localhost:5000) נגיש

### שגיאה: SSL Certificate Error

**פתרון**:
- זה תקין! IB Gateway משתמש ב-self-signed certificate
- הקוד כבר מטפל בזה

### שגיאה: "Cannot find module 'https'"

**פתרון**:
- זה אומר שהקוד רץ ב-client במקום ב-server
- השתמש ב-API Routes או ב-Server Components

### WebSocket לא מתחבר

**פתרון**:
1. ודא ש-Next.js dev server רץ
2. בדוק ש-IB Gateway מחובר
3. בדוק console logs לשגיאות

---

## 📚 תיעוד נוסף

- [Interactive Brokers Client Portal API](https://www.interactivebrokers.com/api/doc.html)
- [IB Gateway Download](https://www.interactivebrokers.com/en/index.php?f=16457)
- [IBKR API Reference](https://interactivebrokers.github.io/cpwebapi/)

---

## ✅ Checklist

- [ ] IB Gateway מותקן
- [ ] IB Gateway רץ על `localhost:5000`
- [ ] מחובר עם פרטי חשבון
- [ ] אישור אבטחה SSL נתקבל בדפדפן
- [ ] בדיקת חיבור עם `IbkrConnectionStatus`
- [ ] חשבונות מוצגים בהצלחה
- [ ] נתוני שוק נטענים
- [ ] WebSocket streaming עובד (אופציונלי)

---

**הכל מוכן! אתה יכול להתחיל להשתמש ב-IBKR API באפליקציה שלך! 🚀**

