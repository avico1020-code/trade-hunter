/**
 * Next.js Instrumentation Hook
 *
 * This file is automatically executed on server startup
 * Used to initialize server-side services like MarketDataHub persistence
 * Phase 8: Also initializes trading system (live or simulation mode)
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Initialize MarketDataHub persistence layer and backfill
    // This runs once when the Next.js server starts
    const { initializeMarketDataPersistence } = await import(
      "@/lib/server/market-data/persistence"
    );

    await initializeMarketDataPersistence();
    console.log(`[Server Startup] ✅ MarketDataHub persistence and backfill initialized`);

    // Phase 8: Initialize trading system (live or simulation mode)
    const { initTradingSystem } = await import("@/lib/server/tradingSystem");
    await initTradingSystem();
  }
}
