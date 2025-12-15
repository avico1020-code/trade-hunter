/**
 * IBKR TWS Market Data Batch API Route - Phase 6
 *
 * DEPRECATED: This endpoint now reads from MarketDataHub instead of directly from IBKR TWS client.
 * All market data consumers should use MarketDataHub as the single source of truth.
 *
 * This route is kept for backward compatibility with existing clients.
 */

import { type NextRequest, NextResponse } from "next/server";
import { getMarketDataHub } from "@/lib/server/market-data";

export async function POST(req: NextRequest) {
  try {
    const { symbols } = await req.json();

    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      return NextResponse.json({ error: "Symbols array is required" }, { status: 400 });
    }

    // Use MarketDataHub instead of direct TWS client
    const hub = getMarketDataHub();
    const results: Record<string, any> = {};

    for (const symbol of symbols) {
      const tick = hub.getLastMarketTick(symbol);
      if (tick && tick.price > 0) {
        results[symbol] = {
          symbol: tick.symbol,
          price: tick.price,
          size: tick.size || 0,
          timestamp: tick.ts,
        };
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error("[IBKR TWS Batch Market Data API] Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to get batch market data",
        suggestion: "Ensure MarketDataHub is initialized and streaming is active",
      },
      { status: 500 }
    );
  }
}
