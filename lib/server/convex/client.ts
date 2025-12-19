/**
 * Server-side Convex Client Helper
 *
 * Provides a singleton Convex client for server-side usage
 * Used for calling Convex mutations/queries from Next.js server-side code
 */

import { ConvexHttpClient } from "convex/browser";

let clientInstance: ConvexHttpClient | null = null;

/**
 * Get or create the singleton Convex HTTP client for server-side usage
 */
export function getConvexServerClient(): ConvexHttpClient {
  if (!clientInstance) {
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

    if (!convexUrl) {
      throw new Error(
        "NEXT_PUBLIC_CONVEX_URL environment variable is not set. " +
          "Convex client cannot be initialized."
      );
    }

    clientInstance = new ConvexHttpClient(convexUrl);
    console.log(`[Convex Server Client] ✅ Initialized Convex HTTP client`);
  }

  return clientInstance;
}
