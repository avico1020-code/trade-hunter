/**
 * IBKR TWS Historical Data API Route
 * 
 * NOTE: This route is for LONG-TERM historical data (days, weeks, months, years).
 * This is NOT real-time intraday data and does NOT use MarketDataHub.
 * 
 * For real-time intraday bars, use /api/market-data/bars (which uses MarketDataHub).
 * For current quotes, use /api/market-data/tick (which uses MarketDataHub).
 */

import { NextRequest, NextResponse } from "next/server";
import { getHistoricalData } from "@/lib/ibkr/tws-client";

export async function GET(req: NextRequest) {
  try {
    const symbol = req.nextUrl.searchParams.get("symbol");
    const duration = req.nextUrl.searchParams.get("duration") || "1 M";
    const barSize = req.nextUrl.searchParams.get("barSize") || "1 day";

    if (!symbol) {
      return NextResponse.json({ error: "Symbol is required" }, { status: 400 });
    }

    const data = await getHistoricalData(symbol, duration, barSize);

    return NextResponse.json({ symbol, chartData: data });
  } catch (error) {
    console.error("Historical data error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to get historical data",
      },
      { status: 500 }
    );
  }
}

