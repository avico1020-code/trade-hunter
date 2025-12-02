import { NextRequest, NextResponse } from "next/server";
import { getMultipleMarketData } from "@/lib/ibkr/tws-client";

export async function POST(req: NextRequest) {
  try {
    const { symbols } = await req.json();

    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      return NextResponse.json({ error: "Symbols array is required" }, { status: 400 });
    }

    const data = await getMultipleMarketData(symbols);

    return NextResponse.json(data);
  } catch (error) {
    console.error("Batch market data error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to get batch market data",
      },
      { status: 500 }
    );
  }
}

