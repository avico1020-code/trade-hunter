# 🚀 הגדרת Convex - מדריך מהיר

## ⚡ הפעלה ראשונית (פעם אחת)

1. **פתח טרמינל חדש**:
   ```bash
   cd C:\Users\avico\OneDrive\Desktop\web-template\web-template
   ```

2. **הפעל Convex Dev**:
   ```bash
   bunx convex dev
   ```

3. **עקוב אחר ההוראות**:
   - תתבקש להתחבר לחשבון Convex (נפתח דפדפן)
   - לחץ "Authorize" בדפדפן
   - בחר "Create a new project"
   - תן שם לפרויקט (לדוגמה: `web-template`)
   - המתן עד שתראה: `✓ Convex functions ready`

4. **רענן את הדפדפן** ב-`http://localhost:3000`

---

## ✅ השגיאה תיפתר!

לאחר הפעלת Convex Dev, הקובץ `.env.local` יתעדכן אוטומטית עם:
- `NEXT_PUBLIC_CONVEX_URL` - כתובת ה-Backend
- `CONVEX_DEPLOYMENT` - מזהה הפריסה

---

## 🔄 הפעלה יומיומית

כל פעם שאתה עובד על הפרויקט, השתמש ב:

```bash
bun run dev:full
```

זה מפעיל את Next.js **וגם** Convex יחד.

או הפעל בחלון נפרד:
```bash
# חלון 1: Next.js
bun run dev

# חלון 2: Convex
bun run convex
```

---

## 🆘 פתרון בעיות

### השגיאה עדיין קיימת?
1. וודא ש-Convex Dev רץ (צריך לראות "Watching for file changes")
2. רענן את הדפדפן (Ctrl+R או F5)
3. בדוק שיש קובץ `.env.local` עם `NEXT_PUBLIC_CONVEX_URL`

### "Cannot prompt for input in non-interactive terminals"?
- הפעל את `bunx convex dev` **ישירות בטרמינל**, לא דרך סקריפט

### "You don't have access to the selected project"?
- התנתק מ-Convex: `bunx convex logout`
- התחבר מחדש: `bunx convex dev`

---

## 📝 מה זה Convex?

Convex הוא Backend-as-a-Service שמספק:
- **Database** - אחסון נתונים (אסטרטגיות, טרייידים)
- **Functions** - API Backend (queries, mutations)
- **Real-time** - עדכונים מיידיים
- **Auth** - אימות משתמשים (משולב עם Clerk)

---

**עכשיו הדף אמור לעבוד!** 🎉



