/**
 * Market Data Tick API Route - Phase 6
 * 
 * Provides access to the most recent tick for a symbol from MarketDataHub
 * This is the new canonical API for market data access
 */

import { NextResponse } from "next/server";
import { getMarketDataHub } from "@/lib/server/market-data";

export async function GET(request: Request) {
  const symbol = new URL(request.url).searchParams.get("symbol") || "";

  if (!symbol) {
    return NextResponse.json({ error: "Symbol is required" }, { status: 400 });
  }

  try {
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

    return NextResponse.json({
      symbol: tick.symbol,
      price: tick.price,
      size: tick.size || 0,
      ts: tick.ts,
    });
  } catch (error) {
    console.error(`[Market Data Tick API] Error for ${symbol}:`, error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to fetch market data",
      },
      { status: 500 }
    );
  }
}

