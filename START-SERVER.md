# 🚀 איך להפעיל את השרתים

## ⚡ הפעלה מהירה (מומלץ)

הפעל את **שני השרתים** (Next.js + Convex) יחד:

### אופציה 1: עם Bun
```bash
bun run dev:full
```

### אופציה 2: עם סקריפט BAT (Windows)
```bash
start-dev-full.bat
```

### אופציה 3: עם PowerShell
```powershell
.\start-dev-full.ps1
```

---

## 📋 מה קורה כשמפעילים את השרתים?

1. **Next.js Dev Server** - פועל על `http://localhost:3000`
   - עורך את הקבצים → השינויים מתעדכנים מיידית
   - Turbopack מאיץ את הבנייה

2. **Convex Dev Server** - מסנכרן פונקציות Backend
   - סורק את תיקיית `/convex`
   - מעדכן את `convex/_generated/api`
   - מחבר את ה-Frontend ל-Backend

---

## 🔧 הפעלה נפרדת (למתקדמים)

### הפעלת Next.js בלבד
```bash
bun run dev
```
או
```bash
start-dev.bat
```

### הפעלת Convex בלבד
```bash
bun run convex
```
או
```bash
bunx convex dev
```

---

## ⚠️ בעיות נפוצות

### 🚨 "Could not find public function for 'strategies:getStrategyByType'"

**הסיבה:** שרת Convex Dev לא רץ

**פתרון:**
1. סגור את כל השרתים (Ctrl+C)
2. הפעל מחדש עם `bun run dev:full` או `start-dev-full.bat`
3. המתן עד שתראה "Convex functions ready"
4. רענן את הדפדפן

### 🔌 "Port 3000 already in use"

**פתרון:**
```powershell
# Windows PowerShell
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process
```

או הרג את התהליך ידנית ב-Task Manager.

### 🔄 "Module not found" שגיאות

**פתרון:**
```bash
# התקן תלויות מחדש
bun install

# הפעל את שני השרתים
bun run dev:full
```

---

## 📂 מבנה הפרויקט

```
web-template/
├── app/                    # Next.js App Router (Frontend)
├── convex/                 # Convex Functions (Backend)
│   ├── strategies.ts       # ניהול אסטרטגיות
│   ├── users.ts           # ניהול משתמשים
│   └── _generated/        # קבצים שנוצרו אוטומטית
├── components/            # קומפוננטים לשימוש חוזר
├── start-dev-full.bat     # הפעל את שני השרתים (Windows)
├── start-dev-full.ps1     # הפעל את שני השרתים (PowerShell)
└── package.json           # סקריפטים
```

---

## 🎯 סקריפטים זמינים

| פקודה | תיאור |
|-------|-------|
| `bun run dev:full` | ✅ הפעל את שני השרתים יחד (מומלץ) |
| `bun run dev` | Next.js בלבד |
| `bun run convex` | Convex בלבד |
| `bun run build` | בניית Production |
| `bun run start` | הפעלת Production build |
| `bun run check:fix` | תיקון אוטומטי של קוד |
| `bun run type-check` | בדיקת TypeScript |

---

## 💡 טיפים

1. **תמיד הפעל את שני השרתים** - ללא Convex, הפונקציות לא יהיו זמינות
2. **עקוב אחרי הלוגים** - שים לב להודעות בטרמינל
3. **רענן את הדפדפן** - אחרי שינויים ב-Convex
4. **שמור קבצים** - Next.js מזהה שינויים אוטומטית

---

## 🆘 עזרה נוספת

- **תיעוד Convex**: `docs/CONVEX_SETUP_GUIDE.md`
- **פקודות כלליות**: `docs/COMMANDS.md`
- **הגדרות Git**: `docs/GIT_COMMANDS.md`

---

**✨ מוכן לעבוד!** פתח את `http://localhost:3000` בדפדפן שלך.
