# Git Commands

This is how you manage your git branches and save your work.

## Initial Setup (First time only)

### Initialize git
```
git init
```

### Set your name
```bash
git config --global user.name "Your Name"
```

### Set your email
```bash
git config --global user.email "your.email@example.com"
```

### Check your config
```bash
git config --list
```

## Clone a repository
```bash
git clone "app URL"
```

## Stage all of your changes
```
git add .
```

## Commit your changes
```bash
git commit -m "enter your message here"
```

## Push to GitHub
```bash
git push origin main
```

## Pull the latest changes from GitHub (if working on another computer or branch)
```bash
git pull
```

## Reset to last commit (undo all changes, warning: this will delete all your current changes locally)
```bash
git reset --hard
```

## Reset multiple commits back (warning: this will delete those nodes permanently)
```bash
git reset --hard HEAD~[number]
```
Replace `[number]` with how many commits to go back (e.g., `HEAD~1` for 1 commit back)
