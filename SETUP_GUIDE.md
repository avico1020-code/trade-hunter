# Quick Setup Guide

This template is ready to use - you just need to connect your Clerk authentication and Convex database. Follow these 3 simple steps:

---

## Step 1: Get Your Clerk Keys

1. Go to [https://dashboard.clerk.com](https://dashboard.clerk.com)
2. Click **"Create application"** (or select existing app)
3. Copy your keys from the **API Keys** section:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (starts with `pk_test_` or `pk_live_`)
   - `CLERK_SECRET_KEY` (starts with `sk_test_` or `sk_live_`)
4. Open `.env.local` file in your project
5. Replace the placeholder keys:
   ```env
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
   CLERK_SECRET_KEY=sk_test_xxxxx
   ```

---

## Step 2: Get Your Convex Keys

1. In your terminal, run:
   ```bash
   bunx convex dev
   ```
2. Follow the prompts:
   - Press **Enter** to log in to Convex
   - Your browser will open - click **"Authorize"**
   - Choose **"Create a new project"** or select existing
   - Choose a project name
3. Convex will automatically update your `.env.local` with:
   ```env
   NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
   CONVEX_DEPLOYMENT=dev:your-deployment-name
   ```

---

## Step 3: Connect Clerk to Convex (JWT Template)

**This is the most important step - it connects your authentication to your database.**

1. Go back to [https://dashboard.clerk.com](https://dashboard.clerk.com)
2. Select your application
3. In the left sidebar, find **"JWT Templates"** (under Configure)
4. Click **"New template"**
5. Select **"Convex"** from the template list
6. Clerk will auto-fill everything:
   - **Name**: `convex`
   - **Issuer**: `https://your-app-name.clerk.accounts.dev`
   - **Audience**: `convex`
7. Click **"Apply Changes"** or **"Save"**

**That's it!** Your authentication is now connected to your database.

---

## Step 4: Test It

1. Start your development server:
   ```bash
   bun run dev
   ```
2. Open [http://localhost:3000](http://localhost:3000)
3. Click **"Sign In"** or **"Sign Up"**
4. Create an account or log in
5. You should see your user menu in the navbar

---

## Troubleshooting

### "Failed to authenticate" error
- Make sure you completed **Step 3** (JWT Template)
- Sign out completely and sign back in
- Clear your browser cache: Press `Cmd + Shift + R` (Mac) or `Ctrl + Shift + R` (Windows)

### "Convex not found" error
- Make sure `bunx convex dev` is running in your terminal
- Check that `.env.local` has the correct `NEXT_PUBLIC_CONVEX_URL`

### OAuth (Google, Apple, etc.) not working
- Go to Clerk Dashboard → **User & Authentication** → **Social Connections**
- Enable the providers you want (Google, Apple, etc.)
- Follow Clerk's setup instructions for each provider

---

## Quick Reference

**Where to find things:**
- Clerk Dashboard: [https://dashboard.clerk.com](https://dashboard.clerk.com)
- Convex Dashboard: [https://dashboard.convex.dev](https://dashboard.convex.dev)
- Your `.env.local` file: in the root of your project

**Need help?**
- Clerk Docs: [https://clerk.com/docs](https://clerk.com/docs)
- Convex Docs: [https://docs.convex.dev](https://docs.convex.dev)

---

**You're all set!** The template handles everything else automatically.
