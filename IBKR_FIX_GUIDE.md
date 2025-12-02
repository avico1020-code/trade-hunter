# 🔧 מדריך תיקון בעיית חיבור IB Gateway

## ❌ הבעיה:
האפליקציה לא מתחברת ל-IB Gateway למרות שהוא פועל ומחובר.

## ✅ הפתרון:

### שלב 1: ודא ש-IB Gateway רץ ומחובר

1. פתח את **IB Gateway**
2. התחבר עם שם המשתמש והסיסמה שלך
3. ודא שהסטטוס "Interactive Brokers API Server" הוא **"connected"** (ירוק)
4. זה עובד עם **Paper Trading** ו-**Live Trading** - אין צורך בהגדרות נוספות!

### שלב 2: הפעל את Client Portal Gateway

**⚠️ חשוב**: Client Portal Gateway הוא שירות נפרד מ-IB Gateway ו-**חייב להיות רץ** כדי ש-Client Portal Web API יעבוד!

**אם אתה רואה `ERR_CONNECTION_REFUSED` ב-`localhost:5000`, זה אומר ש-Client Portal Gateway לא רץ.**

#### איך להפעיל Client Portal Gateway:

1. **מצא את תיקיית IB Gateway:**
   - בדרך כלל: `C:\Program Files\IB Gateway` או `C:\Jts`
   - או: `%APPDATA%\IB Gateway`

2. **חפש את Client Portal Gateway:**
   - חפש קובץ בשם `Client Portal Gateway.bat` או `cpwg.bat`
   - או תיקייה בשם `Client Portal Gateway`

3. **הפעל את Client Portal Gateway:**
   - לחץ כפול על הקובץ `Client Portal Gateway.bat`
   - אמור להופיע חלון של Client Portal Gateway
   - בדוק ב-Task Manager ש-process בשם "Client Portal Gateway" רץ

4. **בדוק שהפורט 5000 נגיש:**
   - פתח דפדפן וגש ל-**`https://localhost:5000`**
   - אם אתה רואה אזהרת SSL:
     - לחץ על **"Advanced"** (מתקדם)
     - לחץ על **"Proceed to localhost (unsafe)"** (המשך ל-localhost)
   - אמור להופיע דף כניסה של IB Gateway Client Portal

**📄 למדריך מפורט יותר, ראה `IBKR_CLIENT_PORTAL_SETUP.md`**

### שלב 3: רענן את האפליקציה

1. רענן את הדפדפן (http://localhost:3000)
2. המערכת תתחבר אוטומטית ל-IB Gateway דרך Client Portal Web API
3. בדוק את הלוגים בטרמינל - אמור להופיע:
   ```
   ✅ [IBKR API] Successfully connected to IB Gateway! Account type: Paper Trading
   ```
   או:
   ```
   ✅ [IBKR API] Successfully connected to IB Gateway! Account type: Live Trading
   ```

## 🐛 פתרון בעיות:

### בעיה: עדיין "Connection failed"
**פתרונות:**
1. ודא ש-IB Gateway **מחובר** (לא רק פתוח) - הסטטוס צריך להיות ירוק
2. ודא שאתה יכול לגשת ל-**https://localhost:5000** בדפדפן
3. אם אתה רואה אזהרת SSL, קבל אותה והמשך
4. אתחל את IB Gateway אם צריך

### בעיה: "Connection timeout" או "ECONNREFUSED"
**פתרונות:**
1. ודא ש-IB Gateway רץ
2. בדוק את Windows Firewall - וודא שהוא לא חוסם את פורט 5000
3. ודא שאתה מחובר לאינטרנט
4. המתן עד ש-IB Gateway מסיים להתחבר

### בעיה: Windows Firewall חוסם
**פתרונות:**
1. פתח **Windows Security** → **Firewall & network protection**
2. לחץ על **Advanced settings**
3. **Inbound Rules** → **New Rule**
4. בחר **Port** → לחץ Next
5. בחר **TCP** → הכנס פורט **5000**
6. בחר **Allow the connection**
7. שמור את הכלל

## 📝 הערות חשובות:

- **IB Gateway** משתמש ב-**Client Portal Web API** (פורט 5000), לא ב-TWS Socket API
- אין צורך בהגדרת "Enable ActiveX and Socket Clients" - זה רק ב-TWS!
- המערכת תתחבר אוטומטית לחשבון שהתחברת אליו (Paper או Live)
- IB Gateway חייב להיות **מחובר** (סטטוס ירוק), לא רק פתוח

## ✅ סימן שהכל עובד:

בלוגים אמור להופיע:
```
✅ [IBKR API] Successfully connected to IB Gateway! Account type: Paper Trading
✅ [API] Got market data for SPY: Last=$XXX.XX, Close=$XXX.XX, Volume=XXX,XXX,XXX
```

אם זה לא עובד אחרי כל הצעדים האלה, בדוק את הלוגים בטרמינל ושלוח אותם.
