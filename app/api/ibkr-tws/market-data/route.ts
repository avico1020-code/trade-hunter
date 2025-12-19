/**
 * IBKR TWS Market Data API Route - Phase 6
 * 
 * DEPRECATED: This endpoint now reads from MarketDataHub instead of directly from IBKR TWS client.
 * All market data consumers should use MarketDataHub as the single source of truth.
 * 
 * This route is kept for backward compatibility with existing clients.
 * New code should use MarketDataHub directly on the server-side or use /api/market-data/tick
 */

import { NextRequest, NextResponse } from "next/server";
import { getMarketDataHub } from "@/lib/server/market-data";

export async function GET(req: NextRequest) {
  try {
    const symbol = req.nextUrl.searchParams.get("symbol");

    if (!symbol) {
      return NextResponse.json({ error: "Symbol is required" }, { status: 400 });
    }

    // Use MarketDataHub instead of direct TWS client
    const hub = getMarketDataHub();
    const tick = hub.getLastMarketTick(symbol);

    if (!tick || tick.price === 0) {
      return NextResponse.json(
        {
          error: `No market data available for ${symbol}`,
          suggestion: "Symbol may not be subscribed yet. Ensure streaming is active.",
        },
        { status: 404 }
      );
    }

    // Return data in a format similar to the old TWS client response
    return NextResponse.json({
      symbol: tick.symbol,
      price: tick.price,
      size: tick.size || 0,
      timestamp: tick.ts,
    });
  } catch (error) {
    console.error("[IBKR TWS Market Data API] Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to get market data",
        suggestion: "Ensure MarketDataHub is initialized and streaming is active",
      },
      { status: 500 }
    );
  }
}

