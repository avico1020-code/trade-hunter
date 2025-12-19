# הוראות העלאה ל-GitHub

## שלב 1: יצירת Repository ב-GitHub
1. היכנס ל-https://github.com
2. לחץ על "+" → "New repository"
3. מלא:
   - **Repository name**: `web-template` (או שם אחר)
   - **Description**: "Next.js web template with Clerk auth and Convex backend"
   - בחר **Public** או **Private**
   - **אל תסמן** "Initialize with README"
4. לחץ "Create repository"

## שלב 2: הוספת Remote והעלאה

### אם יצרת repository עם HTTPS:
```bash
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git branch -M main
git push -u origin main
```

### אם יצרת repository עם SSH:
```bash
git remote add origin git@github.com:YOUR_USERNAME/YOUR_REPO_NAME.git
git branch -M main
git push -u origin main
```

## הערות חשובות:
- החלף `YOUR_USERNAME` בשם המשתמש שלך ב-GitHub
- החלף `YOUR_REPO_NAME` בשם ה-repository שיצרת
- אם תתבקש להזין credentials, השתמש ב-Personal Access Token (לא סיסמה)

## יצירת Personal Access Token (אם נדרש):
1. GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate new token (classic)
3. בחר scopes: `repo` (full control)
4. העתק את ה-token והשתמש בו כסיסמה

