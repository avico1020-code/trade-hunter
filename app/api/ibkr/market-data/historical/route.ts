import { NextResponse } from "next/server";
import { getIbkrClient } from "@/lib/ibkr/client";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get("symbol");
    const period = searchParams.get("period") || "1y";
    const bar = searchParams.get("bar") || "1d";

    if (!symbol) {
      return NextResponse.json({ error: "Symbol is required" }, { status: 400 });
    }

    console.log(`📊 [API] Fetching historical data for ${symbol} (period: ${period}, bar: ${bar})...`);

    const client = getIbkrClient();

    try {
      // Get historical data by symbol (this will automatically get conid and fetch data)
      const result = await client.getHistoricalBySymbol(symbol, period, bar);

      return NextResponse.json({
        symbol: result.symbol,
        conid: result.conid,
        period,
        bar,
        data: result.history,
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`❌ [API] Failed to fetch historical data for ${symbol}:`, errorMsg);
      
      // Check if it's an authentication/connection error
      if (errorMsg.includes("not connected") || errorMsg.includes("authenticated") || errorMsg.includes("ECONNREFUSED")) {
        return NextResponse.json(
          {
            error: "Failed to connect to IB Gateway Client Portal",
            details: errorMsg,
            suggestion: "Please ensure IB Gateway is running, fully connected, and you can access https://localhost:5000"
          },
          { status: 503 }
        );
      }
      
      // Check if symbol not found
      if (errorMsg.includes("No results found")) {
        return NextResponse.json(
          {
            error: `Symbol ${symbol} not found in IB Gateway`,
            details: errorMsg,
          },
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        {
          error: `Failed to fetch historical data for ${symbol}`,
          details: errorMsg,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error(`❌ [API] Unexpected error for ${request.url}:`, error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch historical data";
    
    return NextResponse.json(
      { 
        error: errorMessage,
        suggestion: "Please check IB Gateway is running and accessible at https://localhost:5000"
      },
      { status: 500 }
    );
  }
}
