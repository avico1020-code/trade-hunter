# מדריך התקנה והפעלה של IB Gateway

## חלק 1: התקנת IB Gateway

### הורדה
1. גש ל-https://www.interactivebrokers.com/en/trading/ib-api.php
2. הורד **IB Gateway** (לא TWS)
3. התקן את התוכנה

---

## חלק 2: הגדרת IB Gateway

### הפעלה ראשונה
1. פתח את IB Gateway
2. התחבר עם:
   - **Username**: שם המשתמש שלך ב-IBKR
   - **Password**: הסיסמה שלך
   - **Trading Mode**: Paper Trading (מומלץ לבדיקות)

### הגדרות API
1. לחץ על **Configure** (⚙️)
2. עבור ל-**Settings → API → Settings**
3. סמן:
   - ✅ Enable ActiveX and Socket Clients
   - ✅ Read-Only API (מומלץ!)
   - ✅ Download open orders on connection
4. הגדר:
   - **Socket port**: `4001` (Paper Trading) או `4002` (Live Trading)
   - **Master API client ID**: השאר ריק
   - **Trusted IP Addresses**: `127.0.0.1`
5. לחץ **OK** ושמור

### הפעלת Client Portal Web API
1. עבור ל-**Settings → API → Settings**
2. וודא ש-**Enable Web API** מסומן
3. הפורט אמור להיות: **5000** (ברירת מחדל)
4. סמן **Start Client Portal Gateway on startup** (אופציונלי)

---

## חלק 3: בדיקת החיבור

### בדיקה 1: Web Portal
1. פתח דפדפן
2. גש ל-https://localhost:5000
3. הדפדפן יזהיר על תעודת SSL לא מהימנה
4. לחץ **Advanced** → **Proceed to localhost (unsafe)**
5. אמורה להופיע דף כניסה של IBKR Client Portal

### בדיקה 2: אפליקציה
1. רענן את האפליקציה (http://localhost:3000)
2. לחץ על כפתור **Refresh Status**
3. אמור להופיע:
   - ✅ Authenticated: Yes
   - ✅ Connected: Yes
   - רשימת חשבונות

---

## חלק 4: פתרון בעיות נפוצות

### בעיה: ERR_CONNECTION_REFUSED
**סיבות אפשריות:**
1. IB Gateway לא פועל
2. Web API לא מופעל
3. Firewall חוסם את הפורט 5000

**פתרונות:**
1. וודא ש-IB Gateway פתוח ומחובר
2. בדוק שה-Web API מופעל בהגדרות
3. אפשר את הפורט 5000 ב-Windows Firewall

### בעיה: Authentication Failed
**סיבות אפשריות:**
1. לא התחברת ב-IB Gateway
2. התחברות פקעה

**פתרונות:**
1. התחבר מחדש ב-IB Gateway
2. רענן את דף האפליקציה

### בעיה: No Accounts Found
**סיבות אפשריות:**
1. החשבון לא מאומת
2. בעיית הרשאות API

**פתרונות:**
1. וודא שהחשבון שלך פעיל ומאושר
2. בדוק שהגדרת הרשאות API בחשבון IBKR שלך

---

## חלק 5: הגדרות Windows Firewall

אם Firewall חוסם את החיבור:

1. פתח **Windows Security** → **Firewall & network protection**
2. לחץ על **Advanced settings**
3. **Inbound Rules** → **New Rule**
4. בחר **Port** → לחץ Next
5. בחר **TCP** → הכנס פורט **5000**
6. בחר **Allow the connection**
7. שמור את הכלל

---

## חלק 6: סטטוסים וקודי שגיאה

### סטטוסים תקינים
- `authenticated: true` - התחברת בהצלחה
- `connected: true` - IB Gateway מחובר לשרתי IBKR
- `competing: false` - אין חיבור מתחרה

### קודי שגיאה נפוצים
- `401 Unauthorized` - לא מאומת, התחבר מחדש
- `500 Internal Server Error` - בעיה בשרת IBKR, נסה שוב
- `503 Service Unavailable` - IB Gateway לא זמין

---

## חלק 7: שימוש באפליקציה

לאחר חיבור מוצלח:

1. **מסך ראשי**: חלוניות מדדים יציגו נתוני זמן אמת מ-IBKR
2. **דף רשימות**: מחירי מניות בזמן אמת
3. **דף סטטיסטיקות**: נתוני שוק מעודכנים
4. **דף חדשות**: חדשות משולבות (Yahoo + Finviz + IBKR)

---

## תמיכה נוספת

- **תיעוד IBKR**: https://interactivebrokers.github.io/cpwebapi/
- **פורום IBKR**: https://www.interactivebrokers.com/forum/

