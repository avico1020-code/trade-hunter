import { NextRequest, NextResponse } from "next/server";
import { getMarketData } from "@/lib/ibkr/tws-client";

export async function GET(req: NextRequest) {
  try {
    const symbol = req.nextUrl.searchParams.get("symbol");

    if (!symbol) {
      return NextResponse.json({ error: "Symbol is required" }, { status: 400 });
    }

    const data = await getMarketData(symbol);

    return NextResponse.json(data);
  } catch (error) {
    console.error("Market data error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to get market data",
      },
      { status: 500 }
    );
  }
}

