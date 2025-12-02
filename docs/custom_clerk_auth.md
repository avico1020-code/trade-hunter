# Custom Clerk Authentication Implementation Guide

## Overview

This guide explains how to implement custom authentication pages with Clerk in a Next.js application. The pattern demonstrated here replaces Clerk's default authentication modals with beautifully designed, custom pages that can be fully styled and localized to match your application's branding.

**This implementation is applicable to:**
- Next.js 13+ with App Router
- React Server Components and Client Components
- Tailwind CSS for styling
- TypeScript applications
- Any authentication UI library (Radix UI, shadcn/ui, etc.)

## Architecture

### File Structure
```
app/
├── (auth)/                   # Auth route group (excludes layout)
│   ├── layout.tsx           # Auth-specific layout
│   ├── sign-in/
│   │   └── page.tsx         # Custom signin page
│   └── sign-up/
│       └── page.tsx         # Custom signup page
├── sso-callback/
│   └── page.tsx             # OAuth callback handler
└── layout.tsx               # Root layout with providers

src/
├── components/
│   └── providers/
│       └── providers.tsx    # Clerk + Convex provider setup
├── contexts/
│   └── auth-context.tsx     # Custom auth context (optional)
middleware.ts                # Route protection middleware

.env.local                   # Environment configuration
```

## Implementation Details

## Step-by-Step Setup Instructions

### Step 1: Install Dependencies

```bash
bun add @clerk/nextjs
# Or with npm/yarn/pnpm
npm install @clerk/nextjs
```

### Step 2: Environment Configuration

1. Create a Clerk account at [clerk.com](https://clerk.com)
2. Create a new application in the Clerk Dashboard
3. Copy your API keys to `.env.local`:

```env
# Clerk Configuration
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
CLERK_SECRET_KEY=sk_test_xxxxx
```

**Note:** No need to set custom page URLs in environment variables when using the ClerkProvider approach shown below.

### Step 3: Clerk Provider Setup

**File: `src/components/providers/providers.tsx`**

```tsx
'use client';

import React from 'react';
import { ClerkProvider } from '@clerk/nextjs';

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!}
      appearance={{
        baseTheme: undefined,  // Optional: customize theme
        signIn: { baseTheme: undefined },
        signUp: { baseTheme: undefined }
      }}
    >
      {children}
    </ClerkProvider>
  );
}
```

**Key Points:**
- No need to specify `signInUrl` or `signUpUrl` in the provider
- Routes are automatically detected from your file structure
- The `appearance` prop allows theme customization (optional)

### Step 4: Root Layout Setup

**File: `app/layout.tsx`**

```tsx
import React from 'react';
import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/providers/providers';

export const metadata: Metadata = {
  title: 'Your App Name',
  description: 'Your app description',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

### Step 5: Middleware Implementation

**File: `middleware.ts` (in root directory)**

```tsx
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// Define routes that require authentication
const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/settings(.*)',
  // Add all your protected routes here
]);

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();

  // Protect routes that require authentication
  if (isProtectedRoute(req) && !userId) {
    // Redirect to home page or sign-in page
    return NextResponse.redirect(new URL('/', req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
```

**Key Features:**
- Route protection using pattern matching
- Automatic redirect for unauthenticated users
- Optimized matcher configuration to skip static assets

### Step 6: Create Auth Route Group Layout

**File: `app/(auth)/layout.tsx`**

```tsx
'use client';

import { useAuth } from '@clerk/nextjs';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isSignedIn, isLoaded } = useAuth();

  // Show loading state while checking auth
  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  // Don't render auth pages if already signed in
  if (isSignedIn) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      {children}
    </div>
  );
}
```

**Purpose:**
- Prevents showing auth pages to logged-in users
- Provides consistent layout/styling for auth pages
- Shows loading state during auth check

### Step 7: Custom Sign-In Page

**File: `app/(auth)/sign-in/page.tsx`**

**Key Features:**
- Hebrew RTL layout (`dir="rtl"`)
- Dark gradient background: `from-gray-900 via-gray-800 to-black`
- Custom form handling with Clerk's `useSignIn` hook
- Orange gradient submit button: `from-orange-500 to-red-600`
- Google OAuth integration
- Error handling with Hebrew messages
- Loading states with spinners

**Core Implementation Pattern:**
```tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSignIn } from '@clerk/nextjs';

export default function SignInPage() {
  const router = useRouter();
  const { signIn, setActive } = useSignIn();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signIn) return;

    setIsLoading(true);
    setError('');

    try {
      const result = await signIn.create({
        identifier: email,
        password,
      });

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        router.push('/dashboard');
      }
    } catch (err: unknown) {
      const error = err as { errors?: Array<{ message?: string }> };
      setError(error.errors?.[0]?.message || 'Sign in failed');
    } finally {
      setIsLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    if (!signIn) return;

    try {
      await signIn.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: '/sso-callback',
        redirectUrlComplete: '/dashboard',
      });
    } catch (err: unknown) {
      console.error('Google signin error:', err);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-md">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          required
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          required
        />
        {error && <div className="text-red-600">{error}</div>}
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Signing in...' : 'Sign In'}
        </button>
        <button type="button" onClick={signInWithGoogle}>
          Sign in with Google
        </button>
      </form>
    </div>
  );
}
```

**Key Clerk Hooks & Methods:**
- `useSignIn()`: Main hook for sign-in functionality
- `signIn.create()`: Authenticate with email/password
- `signIn.authenticateWithRedirect()`: OAuth authentication
- `setActive({ session })`: Activate the session after successful auth

### Step 8: Custom Sign-Up Page

**File: `app/(auth)/sign-up/page.tsx`**

**Key Features:**
- Two-step process: Registration → Email verification
- Hebrew form with first name, last name, email, password
- Email verification code input with resend functionality
- Same dark theme and styling as signin
- Google OAuth integration
- State management for verification flow

**Core Implementation Pattern:**
```tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  const router = useRouter();
  const { signUp, setActive } = useSignUp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signUp) return;

    setIsLoading(true);
    setError('');

    try {
      const result = await signUp.create({
        emailAddress: email,
        password,
        firstName,
        lastName,
      });

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        router.push('/dashboard');
      } else {
        // Handle email verification if needed
        setError('Email verification required');
      }
    } catch (err: unknown) {
      const error = err as { errors?: Array<{ message?: string }> };
      setError(error.errors?.[0]?.message || 'Sign up failed');
    } finally {
      setIsLoading(false);
    }
  };

  const signUpWithGoogle = async () => {
    if (!signUp) return;

    try {
      await signUp.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: '/sso-callback',
        redirectUrlComplete: '/dashboard',
      });
    } catch (err: unknown) {
      console.error('Google signup error:', err);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-md">
        <input
          type="text"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          placeholder="First Name"
          required
        />
        <input
          type="text"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          placeholder="Last Name"
          required
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          required
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          required
        />
        {error && <div className="text-red-600">{error}</div>}
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Creating account...' : 'Sign Up'}
        </button>
        <button type="button" onClick={signUpWithGoogle}>
          Sign up with Google
        </button>
      </form>
    </div>
  );
}
```

**Key Clerk Hooks & Methods:**
- `useSignUp()`: Main hook for sign-up functionality
- `signUp.create()`: Create new user account
- `signUp.authenticateWithRedirect()`: OAuth sign-up
- `setActive({ session })`: Activate session after registration

### Step 9: OAuth Callback Handler

**File: `app/sso-callback/page.tsx`**

```tsx
'use client';

import { AuthenticateWithRedirectCallback } from '@clerk/nextjs';

export default function SSOCallback() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent mx-auto" />
        <p className="mt-4 text-gray-600">Signing in...</p>
      </div>
      <AuthenticateWithRedirectCallback />
    </div>
  );
}
```

**Purpose:**
- Handles OAuth redirects from Google, Apple, etc.
- Shows loading state during authentication
- `AuthenticateWithRedirectCallback` completes the OAuth flow

## OAuth Provider Setup in Clerk Dashboard

### Enabling OAuth Providers

1. Go to your Clerk Dashboard
2. Navigate to **User & Authentication** → **Social Connections**
3. Enable desired providers (Google, Apple, GitHub, etc.)
4. Configure OAuth credentials:
   - **Google**: Create OAuth client in Google Cloud Console
   - **Apple**: Configure Sign in with Apple in Apple Developer Portal
5. Set authorized redirect URIs (Clerk provides these)
6. Save your configuration

### OAuth Strategy Names
- Google: `oauth_google`
- Apple: `oauth_apple`
- GitHub: `oauth_github`
- Microsoft: `oauth_microsoft`
- Facebook: `oauth_facebook`

## Styling & Customization

The examples above show minimal styling. You can fully customize with:

### Using UI Libraries
```tsx
// With shadcn/ui
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

// With Material-UI
import { TextField, Button } from '@mui/material';

// With Chakra UI
import { Input, Button, Card } from '@chakra-ui/react';
```

### Tailwind CSS Patterns
- Gradients: `bg-gradient-to-r from-blue-600 to-purple-600`
- Dark mode: `dark:bg-gray-800 dark:text-white`
- Responsive: `sm:max-w-md lg:max-w-lg`
- Animations: `animate-spin`, `transition-all`

### RTL Support (for Hebrew, Arabic, etc.)
```tsx
<div dir="rtl" className="text-right">
  {/* RTL content */}
</div>
```

## Complete Authentication Flow

### 1. Unauthenticated User Access
```
User visits /dashboard
  ↓
Middleware checks authentication
  ↓
No userId found
  ↓
Redirect to / (home) or /sign-in
```

### 2. Email/Password Sign-In
```
User enters credentials
  ↓
signIn.create({ identifier, password })
  ↓
Clerk validates credentials
  ↓
If successful: setActive({ session })
  ↓
Router.push('/dashboard')
```

### 3. OAuth Sign-In (Google/Apple/etc.)
```
User clicks "Sign in with Google"
  ↓
signIn.authenticateWithRedirect()
  ↓
Redirect to Google OAuth
  ↓
User authorizes app
  ↓
Redirect to /sso-callback
  ↓
AuthenticateWithRedirectCallback processes
  ↓
Redirect to /dashboard
```

### 4. Sign-Up Flow
```
User enters details
  ↓
signUp.create({ email, password, firstName, lastName })
  ↓
Account created
  ↓
If verification needed: prepareEmailAddressVerification()
  ↓
User enters code: attemptEmailAddressVerification()
  ↓
If complete: setActive({ session })
  ↓
Router.push('/dashboard')
```

## Key Features & Benefits

### ✅ What This Pattern Provides

1. **Full Design Control**
   - Complete customization of auth UI
   - Match your brand identity
   - Use any CSS framework or UI library

2. **Localization Support**
   - Multi-language interfaces
   - RTL language support
   - Custom error messages

3. **Type Safety**
   - Full TypeScript support
   - Type-safe Clerk hooks
   - Autocomplete for auth methods

4. **Security**
   - Clerk handles authentication logic
   - Secure session management
   - Built-in CSRF protection
   - OAuth security handled automatically

5. **Developer Experience**
   - Simple, intuitive API
   - Clear separation of concerns
   - Easy to test and maintain
   - Extensible for custom flows

## Testing Your Implementation

### Functionality Tests

```bash
# Test sign-in flow
1. Navigate to /sign-in
2. Enter valid credentials
3. Verify redirect to /dashboard
4. Check session persistence (refresh page)

# Test sign-up flow
1. Navigate to /sign-up
2. Create new account
3. Verify email if required
4. Check redirect to /dashboard

# Test OAuth
1. Click "Sign in with Google"
2. Authorize in popup
3. Verify redirect via /sso-callback
4. Check landing on /dashboard

# Test protected routes
1. Sign out
2. Try accessing /dashboard
3. Verify redirect to / or /sign-in

# Test error handling
1. Enter incorrect password
2. Verify error message displays
3. Try existing email on sign-up
4. Verify appropriate error
```

### Common Issues & Solutions

**Issue: Infinite redirect loop**
- Check middleware route matchers
- Ensure auth layout doesn't redirect when already signed in
- Verify protected route patterns

**Issue: OAuth fails**
- Check Clerk Dashboard OAuth configuration
- Verify redirect URIs match
- Ensure /sso-callback page exists

**Issue: Session not persisting**
- Check `setActive()` is called after authentication
- Verify cookies are enabled
- Check for cookie domain issues in production

## Advanced Features

### Multi-Factor Authentication (MFA)

```tsx
// Enable MFA in Clerk Dashboard first
// Then check MFA status during sign-in

const handleSignIn = async () => {
  const result = await signIn.create({ identifier: email, password });

  if (result.status === 'needs_second_factor') {
    // Show MFA input UI
    const mfaResult = await signIn.attemptSecondFactor({
      strategy: 'totp',
      code: mfaCode,
    });

    if (mfaResult.status === 'complete') {
      await setActive({ session: mfaResult.createdSessionId });
    }
  }
};
```

### Email Verification Flow

```tsx
// After sign-up, if verification needed
const [pendingVerification, setPendingVerification] = useState(false);
const [code, setCode] = useState('');

const handleSignUp = async () => {
  await signUp.create({ emailAddress, password });

  await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
  setPendingVerification(true);
};

const verifyEmail = async () => {
  const result = await signUp.attemptEmailAddressVerification({ code });

  if (result.status === 'complete') {
    await setActive({ session: result.createdSessionId });
    router.push('/dashboard');
  }
};
```

### Custom Auth Context (Optional)

For additional app-specific user data:

```tsx
// src/contexts/auth-context.tsx
'use client';

import { createContext, useContext } from 'react';
import { useUser } from '@clerk/nextjs';

interface AuthContextType {
  user: UserType | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user: clerkUser, isLoaded } = useUser();

  const user = clerkUser ? {
    id: clerkUser.id,
    email: clerkUser.emailAddresses[0]?.emailAddress,
    name: clerkUser.fullName,
    // Add custom fields from metadata
    role: clerkUser.publicMetadata?.role as string,
  } : null;

  return (
    <AuthContext.Provider value={{
      user,
      isLoading: !isLoaded,
      isAuthenticated: !!user,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
```

## Production Deployment

### Environment Variables

Ensure these are set in production:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_xxxxx
CLERK_SECRET_KEY=sk_live_xxxxx
```

### Clerk Dashboard Configuration

1. **Production Instance**
   - Create production instance in Clerk Dashboard
   - Configure OAuth providers for production
   - Set production redirect URLs

2. **Allowed Origins**
   - Add your production domain
   - Configure CORS settings if needed

3. **Security Settings**
   - Enable bot protection
   - Configure rate limiting
   - Set session timeout policies

### Performance Optimization

```tsx
// Preload Clerk for faster auth
import { preloadClerk } from '@clerk/nextjs';

export default function RootLayout({ children }) {
  useEffect(() => {
    preloadClerk();
  }, []);

  return (
    <Providers>{children}</Providers>
  );
}
```

## Summary

You now have a complete custom authentication system with Clerk that provides:

✅ Full UI control and branding
✅ Email/password authentication
✅ OAuth social login (Google, Apple, etc.)
✅ Route protection with middleware
✅ Type-safe TypeScript implementation
✅ Loading and error states
✅ Production-ready security

### Next Steps

1. **Customize the UI** to match your brand
2. **Add more OAuth providers** in Clerk Dashboard
3. **Implement MFA** for enhanced security
4. **Add user profile management** pages
5. **Set up webhooks** for user events
6. **Configure organization features** if needed

### Resources

- [Clerk Documentation](https://clerk.com/docs)
- [Clerk Next.js Quickstart](https://clerk.com/docs/quickstarts/nextjs)
- [Clerk Dashboard](https://dashboard.clerk.com)
- [Clerk Discord Community](https://clerk.com/discord)

---

**This pattern works with any Next.js app using:**
- App Router (Next.js 13+)
- TypeScript or JavaScript
- Any CSS framework (Tailwind, CSS Modules, Styled Components)
- Any UI library (shadcn/ui, Material-UI, Chakra, Radix, etc.)