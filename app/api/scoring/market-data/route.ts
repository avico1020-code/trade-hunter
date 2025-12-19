import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import { getConvexServerClient } from "@/lib/server/convex/client";

/**
 * API Route: Get market data for scoring system
 *
 * This route provides access to market data from Convex for the Python scoring system.
 * It works with both Yahoo Finance (temporary) and IBKR (future) data sources.
 *
 * The scoring system doesn't need to know the source - it just gets OHLCV data.
 * When IBKR is fully connected, data will automatically come from IBKR instead of Yahoo.
 */
export async function GET(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get("symbol");
    const startTime = searchParams.get("startTime");
    const endTime = searchParams.get("endTime");
    const limit = searchParams.get("limit");
    const source = searchParams.get("source") as "yahoo" | "ibkr" | null;

    // If symbol is provided, get data for that symbol
    if (symbol) {
      const convex = getConvexServerClient();

      // If startTime/endTime provided, get historical data
      if (startTime || endTime) {
        const history = await convex.query(api.marketData.getMarketDataHistory, {
          symbol,
          startTime: startTime ? parseInt(startTime, 10) : undefined,
          endTime: endTime ? parseInt(endTime, 10) : undefined,
          limit: limit ? parseInt(limit, 10) : undefined,
          source: source || undefined,
        });

        return NextResponse.json({
          symbol: symbol.toUpperCase(),
          data: history,
          count: history.length,
        });
      }

      // Otherwise, get latest data
      const latest = await convex.query(api.marketData.getLatestMarketData, {
        symbol,
        source: source || undefined,
      });

      if (!latest) {
        return NextResponse.json(
          {
            error: `No market data found for symbol ${symbol}`,
            suggestion: "Data may not be available yet. Check if symbol is being tracked.",
          },
          { status: 404 }
        );
      }

      return NextResponse.json({
        symbol: symbol.toUpperCase(),
        data: latest,
      });
    }

    // If no symbol, return error
    return NextResponse.json({ error: "Symbol parameter is required" }, { status: 400 });
  } catch (error) {
    console.error("[Scoring API] Error fetching market data:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch market data";

    return NextResponse.json(
      {
        error: errorMessage,
        suggestion: "Check Convex connection and ensure market data is being collected.",
      },
      { status: 500 }
    );
  }
}

/**
 * POST: Get market data for multiple symbols (batch request)
 * This is more efficient for scoring multiple symbols at once
 */
export async function POST(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { symbols, source } = body as {
      symbols: string[];
      source?: "yahoo" | "ibkr";
    };

    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      return NextResponse.json({ error: "symbols array is required" }, { status: 400 });
    }

    const convex = getConvexServerClient();
    const results = await convex.query(api.marketData.getMultipleLatestMarketData, {
      symbols,
      source: source || undefined,
    });

    return NextResponse.json({
      data: results,
      count: Object.keys(results).length,
    });
  } catch (error) {
    console.error("[Scoring API] Error fetching multiple market data:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch market data";

    return NextResponse.json(
      {
        error: errorMessage,
        suggestion: "Check Convex connection and ensure market data is being collected.",
      },
      { status: 500 }
    );
  }
}
