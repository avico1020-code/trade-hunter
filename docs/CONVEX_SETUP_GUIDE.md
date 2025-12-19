# Convex Database Setup Guide

## Overview

This guide explains how to integrate Convex as a real-time database backend in a Next.js application. Convex provides real-time data synchronization, serverless functions, and seamless authentication integration.

**This implementation is applicable to:**
- Next.js 13+ with App Router
- React Server Components and Client Components
- TypeScript applications
- Integration with Clerk, Auth0, or other auth providers

---

## Step-by-Step Setup Instructions

### Step 1: Install Convex

```bash
bun add convex
# Or with npm/yarn/pnpm
npm install convex
```

### Step 2: Initialize Convex

```bash
bunx convex dev
# Or with npx
npx convex dev
```

This will:
1. Create a `convex/` directory in your project
2. Generate `convex.json` configuration
3. Create a Convex deployment
4. Set up environment variables

### Step 3: Environment Configuration

Add to your `.env.local`:

```env
# Convex Configuration
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
CONVEX_DEPLOYMENT=your-deployment-name
```

### Step 4: Define Your Database Schema

**File: `convex/schema.ts`**

```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    fullName: v.optional(v.string()),
    role: v.union(v.literal("admin"), v.literal("user")),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_email", ["email"])
    .index("by_role", ["role"]),

  // Add more tables as needed
  items: defineTable({
    userId: v.id("users"),
    title: v.string(),
    description: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("in_progress"),
      v.literal("completed")
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_status", ["status"])
    .index("by_created_at", ["createdAt"]),
});
```

**Key Schema Concepts:**
- **Tables**: Defined with `defineTable()`
- **Fields**: Use `v.string()`, `v.number()`, `v.boolean()`, etc.
- **Optional Fields**: Use `v.optional()`
- **Relationships**: Use `v.id("tableName")` for foreign keys
- **Indexes**: Speed up queries with `.index(name, [fields])`
- **Unions**: Use `v.union()` for enum-like fields

### Step 5: Convex Provider Setup

**File: `src/components/providers/providers.tsx`**

```tsx
'use client';

import React from 'react';
import { ClerkProvider, useAuth } from '@clerk/nextjs';
import { ConvexReactClient } from 'convex/react';
import { ConvexProviderWithClerk } from 'convex/react-clerk';

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

interface ProvidersProps {
  children: React.ReactNode;
}

function ConvexClientProvider({ children }: { children: React.ReactNode }) {
  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      {children}
    </ConvexProviderWithClerk>
  );
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ClerkProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!}>
      <ConvexClientProvider>
        {children}
      </ConvexClientProvider>
    </ClerkProvider>
  );
}
```

**For other auth providers:**

```tsx
// With custom auth
import { ConvexProvider } from 'convex/react';

export function Providers({ children }: ProvidersProps) {
  return (
    <ConvexProvider client={convex}>
      {children}
    </ConvexProvider>
  );
}
```

### Step 6: Configure Convex Auth (Optional - for Clerk)

**File: `convex/auth.config.ts`**

```typescript
export default {
  providers: [
    {
      domain: "https://your-clerk-domain.clerk.accounts.dev",
      applicationID: "convex",
    },
  ],
};
```

### Step 7: Create Convex Functions

#### Queries (Read Data)

**File: `convex/users.ts`**

```typescript
import { query } from "./_generated/server";
import { v } from "convex/values";

// Get current authenticated user
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    return user;
  },
});

// Get user by ID
export const getById = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return await ctx.db.get(userId);
  },
});

// List all active users
export const listActive = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("users")
      .withIndex("by_role")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
  },
});
```

#### Mutations (Write Data)

**File: `convex/users.ts`** (continued)

```typescript
import { mutation } from "./_generated/server";

// Create or update user from auth
export const createOrUpdateUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const now = Date.now();
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    const userData = {
      email: identity.email || "",
      fullName: identity.name || identity.nickname || "User",
      role: "user" as const,
      isActive: true,
      updatedAt: now,
    };

    if (existing) {
      await ctx.db.patch(existing._id, userData);
      return existing._id;
    }

    return await ctx.db.insert("users", {
      clerkId: identity.subject,
      ...userData,
      createdAt: now,
    });
  },
});

// Update user profile
export const updateProfile = mutation({
  args: {
    userId: v.id("users"),
    fullName: v.optional(v.string()),
  },
  handler: async (ctx, { userId, fullName }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    await ctx.db.patch(userId, {
      fullName,
      updatedAt: Date.now(),
    });

    return userId;
  },
});

// Delete user
export const remove = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    await ctx.db.delete(userId);
  },
});
```

### Step 8: Using Convex in React Components

#### Client Components (useQuery, useMutation)

```tsx
'use client';

import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';

export function UserProfile() {
  // Query: Read data
  const currentUser = useQuery(api.users.getCurrentUser);

  // Mutation: Write data
  const updateProfile = useMutation(api.users.updateProfile);

  const handleUpdate = async () => {
    if (!currentUser?._id) return;

    await updateProfile({
      userId: currentUser._id,
      fullName: "New Name",
    });
  };

  if (currentUser === undefined) {
    return <div>Loading...</div>;
  }

  if (currentUser === null) {
    return <div>Not authenticated</div>;
  }

  return (
    <div>
      <h1>{currentUser.fullName}</h1>
      <p>{currentUser.email}</p>
      <button onClick={handleUpdate}>Update Profile</button>
    </div>
  );
}
```

#### Server Components (fetchQuery, fetchMutation)

```tsx
import { fetchQuery, fetchMutation } from 'convex/nextjs';
import { api } from '@/convex/_generated/api';
import { auth } from '@clerk/nextjs/server';

export default async function ServerUserProfile() {
  // Get auth in Server Component
  const { userId } = await auth();

  if (!userId) {
    return <div>Not authenticated</div>;
  }

  // Fetch data in Server Component
  const user = await fetchQuery(api.users.getCurrentUser);

  return (
    <div>
      <h1>{user?.fullName}</h1>
      <p>{user?.email}</p>
    </div>
  );
}
```

### Step 9: Advanced Query Patterns

#### Searching and Filtering

```typescript
// convex/items.ts
export const search = query({
  args: {
    searchTerm: v.string(),
    status: v.optional(v.union(v.literal("pending"), v.literal("completed"))),
  },
  handler: async (ctx, { searchTerm, status }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) return [];

    let query = ctx.db.query("items").withIndex("by_user", (q) => q.eq("userId", user._id));

    const items = await query.collect();

    // Filter in JavaScript (for complex conditions)
    return items.filter((item) => {
      const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = !status || item.status === status;
      return matchesSearch && matchesStatus;
    });
  },
});
```

#### Pagination

```typescript
export const listPaginated = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, { paginationOpts }) => {
    return await ctx.db
      .query("items")
      .withIndex("by_created_at")
      .order("desc")
      .paginate(paginationOpts);
  },
});
```

#### Relationships and Joins

```typescript
export const getItemWithUser = query({
  args: { itemId: v.id("items") },
  handler: async (ctx, { itemId }) => {
    const item = await ctx.db.get(itemId);
    if (!item) return null;

    const user = await ctx.db.get(item.userId);

    return {
      ...item,
      user,
    };
  },
});
```

---

## Data Access Patterns

### 1. User-Scoped Data

```typescript
// Always scope queries to the current user
export const listMyItems = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) return [];

    return await ctx.db
      .query("items")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
  },
});
```

### 2. Admin Access

```typescript
export const listAllUsers = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user || user.role !== "admin") {
      throw new Error("Admin access required");
    }

    return await ctx.db.query("users").collect();
  },
});
```

### 3. Optimistic Updates

```tsx
'use client';

import { useOptimisticMutation } from '@/hooks/useOptimisticMutation';

export function ItemList() {
  const items = useQuery(api.items.list);
  const updateItem = useMutation(api.items.update);

  const handleToggle = async (itemId: Id<"items">, currentStatus: string) => {
    const newStatus = currentStatus === "completed" ? "pending" : "completed";

    // Optimistically update UI before server confirms
    await updateItem({
      itemId,
      status: newStatus,
    });
  };

  return (
    <div>
      {items?.map((item) => (
        <div key={item._id}>
          <input
            type="checkbox"
            checked={item.status === "completed"}
            onChange={() => handleToggle(item._id, item.status)}
          />
          {item.title}
        </div>
      ))}
    </div>
  );
}
```

---

## React Hooks Patterns

### Custom Hook for Data Management

```tsx
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';

export function useItems() {
  const items = useQuery(api.items.list);
  const createItem = useMutation(api.items.create);
  const updateItem = useMutation(api.items.update);
  const deleteItem = useMutation(api.items.remove);

  const addItem = async (title: string) => {
    await createItem({ title, status: "pending" });
  };

  const toggleItem = async (itemId: Id<"items">, currentStatus: string) => {
    const newStatus = currentStatus === "completed" ? "pending" : "completed";
    await updateItem({ itemId, status: newStatus });
  };

  return {
    items,
    addItem,
    toggleItem,
    deleteItem,
    isLoading: items === undefined,
  };
}
```

### Conditional Queries with "skip"

```tsx
export function UserProfile({ userId }: { userId?: Id<"users"> }) {
  // Only run query if userId is provided
  const user = useQuery(
    api.users.getById,
    userId ? { userId } : "skip"
  );

  if (user === undefined) {
    return <div>Loading...</div>;
  }

  if (user === null || !userId) {
    return <div>User not found</div>;
  }

  return <div>{user.fullName}</div>;
}
```

---

## Database Operations

### Creating Records

```typescript
// Simple insert
await ctx.db.insert("users", {
  clerkId: "user_123",
  email: "user@example.com",
  fullName: "John Doe",
  role: "user",
  isActive: true,
  createdAt: Date.now(),
  updatedAt: Date.now(),
});
```

### Reading Records

```typescript
// Get by ID
const user = await ctx.db.get(userId);

// Query with index
const users = await ctx.db
  .query("users")
  .withIndex("by_role", (q) => q.eq("role", "admin"))
  .collect();

// Get unique record
const user = await ctx.db
  .query("users")
  .withIndex("by_email", (q) => q.eq("email", "user@example.com"))
  .unique();

// Get first record
const firstUser = await ctx.db
  .query("users")
  .withIndex("by_created_at")
  .first();
```

### Updating Records

```typescript
// Patch specific fields
await ctx.db.patch(userId, {
  fullName: "Jane Doe",
  updatedAt: Date.now(),
});

// Replace entire record
await ctx.db.replace(userId, {
  clerkId: "user_123",
  email: "newemail@example.com",
  fullName: "Jane Doe",
  role: "admin",
  isActive: true,
  createdAt: existingUser.createdAt,
  updatedAt: Date.now(),
});
```

### Deleting Records

```typescript
await ctx.db.delete(userId);
```

---

## Error Handling

### In Convex Functions

```typescript
export const dangerousOperation = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    if (user.role !== "admin") {
      throw new Error("Insufficient permissions");
    }

    // Perform operation
  },
});
```

### In React Components

```tsx
export function ItemActions() {
  const deleteItem = useMutation(api.items.remove);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async (itemId: Id<"items">) => {
    try {
      setError(null);
      await deleteItem({ itemId });
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  return (
    <div>
      {error && <div className="text-red-600">{error}</div>}
      <button onClick={() => handleDelete(itemId)}>Delete</button>
    </div>
  );
}
```

---

## Performance Best Practices

### 1. Use Indexes Wisely

```typescript
// Good: Query with index
const items = await ctx.db
  .query("items")
  .withIndex("by_user", (q) => q.eq("userId", userId))
  .collect();

// Bad: Full table scan with filter
const items = await ctx.db
  .query("items")
  .filter((q) => q.eq(q.field("userId"), userId))
  .collect();
```

### 2. Limit Data Fetching

```typescript
// Get only what you need
const items = await ctx.db
  .query("items")
  .withIndex("by_created_at")
  .order("desc")
  .take(10); // Only get 10 items
```

### 3. Batch Operations

```typescript
// Good: Batch related data in one query
export const getDashboard = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) return null;

    const [items, recentActivity] = await Promise.all([
      ctx.db.query("items").withIndex("by_user", (q) => q.eq("userId", user._id)).collect(),
      ctx.db.query("activity").withIndex("by_user", (q) => q.eq("userId", user._id)).take(5),
    ]);

    return { user, items, recentActivity };
  },
});
```

### 4. Debounce Search

```tsx
import { useDebounce } from '@/hooks/useDebounce';

export function SearchComponent() {
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 300);

  const results = useQuery(
    api.items.search,
    debouncedSearch.length > 2 ? { searchTerm: debouncedSearch } : "skip"
  );

  return (
    <input
      value={searchInput}
      onChange={(e) => setSearchInput(e.target.value)}
      placeholder="Search..."
    />
  );
}
```

---

## Production Deployment

### Environment Variables

Ensure these are set in production:

```env
NEXT_PUBLIC_CONVEX_URL=https://your-production.convex.cloud
CONVEX_DEPLOYMENT=prod:your-deployment
```

### Deploy to Production

```bash
# Deploy Convex functions
bunx convex deploy

# Or with npx
npx convex deploy
```

### Production Checklist

- [ ] Set production environment variables
- [ ] Deploy Convex functions
- [ ] Configure auth provider for production
- [ ] Set up monitoring in Convex Dashboard
- [ ] Test authentication flow
- [ ] Verify data access permissions
- [ ] Check query performance

---

## Monitoring & Debugging

### Convex Dashboard

Access at [dashboard.convex.dev](https://dashboard.convex.dev):

- **Functions**: View all queries and mutations
- **Logs**: Real-time function logs
- **Data**: Browse database tables
- **Performance**: Monitor query performance
- **Deployment**: Manage deployments

### Local Development

```bash
# Start dev server
bunx convex dev

# View logs
bunx convex logs

# Run data migrations
bunx convex run migrations:migrate
```

### Debug Queries

```typescript
// Add console logs in Convex functions
export const debugQuery = query({
  args: {},
  handler: async (ctx) => {
    console.log("Query started");

    const items = await ctx.db.query("items").collect();
    console.log("Items fetched:", items.length);

    return items;
  },
});
```

---

## Common Issues & Solutions

### Issue: "ConvexError: Not authenticated"

**Solution:** Ensure auth provider is configured correctly

```tsx
// Check ClerkProvider wraps ConvexProvider
<ClerkProvider>
  <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
    {children}
  </ConvexProviderWithClerk>
</ClerkProvider>
```

### Issue: Query returns undefined indefinitely

**Solution:** Use "skip" for conditional queries

```tsx
// Good
const data = useQuery(api.items.get, userId ? { userId } : "skip");

// Bad
const data = useQuery(api.items.get, { userId }); // if userId is undefined
```

### Issue: "Cannot read property of null"

**Solution:** Handle loading and null states

```tsx
const user = useQuery(api.users.getCurrentUser);

if (user === undefined) return <div>Loading...</div>;
if (user === null) return <div>Not found</div>;

return <div>{user.fullName}</div>;
```

---

## Summary

You now have a complete Convex database integration that provides:

✅ Real-time data synchronization
✅ Type-safe database operations
✅ Authentication integration
✅ Serverless backend functions
✅ Optimistic UI updates
✅ Production-ready deployment

### Next Steps

1. **Define your schema** based on your app's data model
2. **Create queries and mutations** for your business logic
3. **Integrate with React components** using hooks
4. **Add indexes** for query performance
5. **Test authentication flow** end-to-end
6. **Deploy to production** when ready

### Resources

- [Convex Documentation](https://docs.convex.dev)
- [Convex Dashboard](https://dashboard.convex.dev)
- [Convex Discord Community](https://convex.dev/community)
- [Next.js + Convex Examples](https://github.com/get-convex/convex-backend)

---

**This pattern works with any Next.js app using:**
- App Router (Next.js 13+)
- TypeScript or JavaScript
- Any auth provider (Clerk, Auth0, NextAuth, etc.)
- Any UI framework or library
