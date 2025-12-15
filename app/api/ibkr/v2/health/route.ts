/**
 * IBKR Integration Layer - Health Endpoint (v2)
 *
 * Returns health status including connection and key symbol data freshness
 */

import { NextResponse } from "next/server";
import { getIbkrConnectionManager } from "@/lib/server/ibkr/IbkrConnectionManager";
import { getIbkrMarketDataService } from "@/lib/server/ibkr/IbkrMarketDataService";

export async function GET() {
  try {
    const connectionManager = getIbkrConnectionManager();
    const status = connectionManager.getStatus();

    const health: {
      connected: boolean;
      state: string;
      connectionAge: number | null;
      keySymbols: Array<{
        symbol: string;
        lastUpdate: number | null;
        hasData: boolean;
      }>;
    } = {
      connected: status.state === "CONNECTED",
      state: status.state,
      connectionAge: status.lastConnectTime ? Date.now() - status.lastConnectTime : null,
      keySymbols: [],
    };

    // Check key symbols if connected
    if (status.state === "CONNECTED") {
      const marketDataService = getIbkrMarketDataService();
      const keySymbols = ["SPY", "QQQ", "AAPL"]; // Key symbols to check

      health.keySymbols = keySymbols.map((symbol) => {
        const tick = marketDataService.getLatestTick(symbol);
        return {
          symbol,
          lastUpdate: tick?.timestamp || null,
          hasData: tick !== null,
        };
      });
    }

    return NextResponse.json(health);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[IBKR API v2] Health check failed:", errorMessage);

    return NextResponse.json(
      {
        connected: false,
        state: "ERROR",
        error: errorMessage,
      },
      { status: 200 }
    );
  }
}
