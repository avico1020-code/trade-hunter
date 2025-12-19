# 🔧 מדריך הפעלת Client Portal Web API ב-IB Gateway

## ⚠️ בעיה: `ERR_CONNECTION_REFUSED` ב-`localhost:5000`

אם אתה רואה שגיאה זו, זה אומר ש-**Client Portal Web API** לא רץ על פורט 5000.

## ✅ פתרון: הפעלת Client Portal Gateway

**חשוב**: Client Portal Gateway הוא שירות נפרד מ-IB Gateway. הוא צריך להיות רץ כדי ש-Client Portal Web API יעבוד.

### שיטה 1: הפעלה דרך IB Gateway (אם קיימת אפשרות)

1. פתח את **IB Gateway**
2. לחץ על **Configure** (⚙️)
3. עבור ל-**Settings → API → Settings**
4. חפש אפשרות כמו:
   - **"Enable Client Portal Web API"**
   - **"Start Client Portal Gateway"**
   - **"Web API Port"**
5. אם קיימת אפשרות, סמן אותה והגדר פורט **5000**
6. לחץ **OK** ושמור
7. אתחל את IB Gateway

### שיטה 2: הפעלה ידנית של Client Portal Gateway

אם אין אפשרות ב-IB Gateway, צריך להפעיל את Client Portal Gateway בנפרד:

1. **מצא את תיקיית IB Gateway:**
   - בדרך כלל: `C:\Program Files\IB Gateway` או `C:\Jts`
   - או: `%APPDATA%\IB Gateway`

2. **חפש את Client Portal Gateway:**
   - חפש קובץ בשם `Client Portal Gateway.bat` או `cpwg.bat`
   - או תיקייה בשם `Client Portal Gateway`

3. **הפעל את Client Portal Gateway:**
   - לחץ כפול על הקובץ `Client Portal Gateway.bat`
   - או פתח Command Prompt והרץ:
     ```cmd
     cd "C:\Program Files\IB Gateway"
     Client Portal Gateway.bat
     ```

4. **ודא שהוא רץ:**
   - אמור להופיע חלון של Client Portal Gateway
   - בדוק ב-Task Manager ש-proccess בשם "Client Portal Gateway" רץ
   - נסה לגשת ל-`https://localhost:5000` בדפדפן

### שיטה 3: הורדה והתקנה נפרדת (אם לא קיים)

אם Client Portal Gateway לא קיים ב-IB Gateway שלך:

1. גש ל-https://www.interactivebrokers.com/en/index.php?f=16457
2. הורד את **Client Portal Gateway** (CPGW)
3. התקן אותו
4. הפעל אותו לפני שתפעיל את IB Gateway
5. ודא שהוא רץ על פורט 5000

## 🔍 בדיקה שהכל עובד

1. **ודא ש-IB Gateway רץ ומחובר:**
   - פתח IB Gateway
   - התחבר עם שם המשתמש והסיסמה
   - ודא שהסטטוס "Interactive Brokers API Server" הוא **"connected"** (ירוק)

2. **ודא ש-Client Portal Gateway רץ:**
   - פתח Task Manager (Ctrl+Shift+Esc)
   - חפש process בשם "Client Portal Gateway" או "cpwg"
   - אם לא קיים, הוא לא רץ - הפעל אותו לפי השיטות למעלה

3. **בדוק שהפורט 5000 נגיש:**
   - פתח דפדפן
   - גש ל-**`https://localhost:5000`**
   - אם אתה רואה אזהרת SSL:
     - לחץ על **"Advanced"** (מתקדם)
     - לחץ על **"Proceed to localhost (unsafe)"** (המשך ל-localhost)
   - אמור להופיע דף כניסה של IB Gateway Client Portal

4. **אם עדיין לא עובד:**
   - בדוק את Windows Firewall - וודא שהוא לא חוסם את פורט 5000
   - בדוק את Task Manager - ודא ש-Client Portal Gateway רץ
   - נסה לאתחל את IB Gateway ואת Client Portal Gateway

## 📝 הערות חשובות

- **Client Portal Gateway** ו-**IB Gateway** הם שני שירותים נפרדים
- Client Portal Gateway צריך להיות רץ כדי ש-Client Portal Web API יעבוד
- IB Gateway עצמו לא מפעיל את Client Portal Gateway אוטומטית (בחלק מהגרסאות)
- הפורט ברירת מחדל הוא **5000**

## 🆘 אם עדיין לא עובד

אם אחרי כל הצעדים האלה זה עדיין לא עובד:

1. בדוק את הגרסה של IB Gateway - אולי צריך עדכון
2. בדוק את התיעוד הרשמי של IBKR: https://interactivebrokers.github.io/cpwebapi/
3. נסה להריץ Client Portal Gateway כשירות Windows
4. בדוק ב-IB Gateway אם יש אפשרות להפעיל את Client Portal Gateway אוטומטית

---

**אחרי ש-Client Portal Gateway רץ ו-`https://localhost:5000` עובד בדפדפן:**
1. רענן את האפליקציה (http://localhost:3000)
2. המערכת תתחבר אוטומטית ל-IB Gateway דרך Client Portal Web API
3. בדוק את הלוגים בטרמינל - אמור להופיע חיבור מוצלח

