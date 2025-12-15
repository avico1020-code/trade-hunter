/**
 * Market Data Bars API Route - Phase 6
 *
 * Provides access to intraday bars for a symbol from MarketDataHub
 * This is the new canonical API for bar history access
 */

import { NextResponse } from "next/server";
import type { Timeframe } from "@/lib/server/market-data";
import { getMarketDataHub } from "@/lib/server/market-data";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol") || "";
  const timeframe = (searchParams.get("timeframe") || "1m") as Timeframe;

  if (!symbol) {
    return NextResponse.json({ error: "Symbol is required" }, { status: 400 });
  }

  // Validate timeframe
  const validTimeframes: Timeframe[] = ["1s", "5s", "1m"];
  if (!validTimeframes.includes(timeframe)) {
    return NextResponse.json(
      { error: `Invalid timeframe. Must be one of: ${validTimeframes.join(", ")}` },
      { status: 400 }
    );
  }

  try {
    const hub = getMarketDataHub();
    const bars = hub.getBars(symbol, timeframe);

    return NextResponse.json({
      symbol,
      timeframe,
      bars,
      count: bars.length,
    });
  } catch (error) {
    console.error(`[Market Data Bars API] Error for ${symbol} ${timeframe}:`, error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to fetch bars",
      },
      { status: 500 }
    );
  }
}
