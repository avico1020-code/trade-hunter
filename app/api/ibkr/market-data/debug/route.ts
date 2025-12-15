/**
 * Market Data Debug API Route
 *
 * Provides diagnostic information about IBKR market data subscriptions
 * and streaming status for troubleshooting.
 */

import { NextResponse } from "next/server";
import { getIbkrMarketDataService } from "@/lib/server/ibkr";
import { getIbkrConnectionManager } from "@/lib/server/ibkr/IbkrConnectionManager";
import { getMarketDataHub } from "@/lib/server/market-data";

export async function GET() {
  try {
    // Get all components
    const hub = getMarketDataHub();
    const marketDataService = getIbkrMarketDataService();
    const connectionManager = getIbkrConnectionManager();

    // Connection status
    const connectionStatus = connectionManager.getStatus();
    const isConnected = connectionManager.isConnected();

    // Active subscriptions
    const activeSubscriptions = marketDataService.getActiveSubscriptions();

    // Get tick data for each subscription
    const tickData: Record<string, any> = {};
    for (const symbol of activeSubscriptions) {
      const tick = hub.getLastMarketTick(symbol);
      const serviceTick = marketDataService.getLatestTick(symbol);
      tickData[symbol] = {
        hubTick: tick
          ? {
              price: tick.price,
              size: tick.size,
              ts: tick.ts,
              age: tick.ts ? `${((Date.now() - tick.ts) / 1000).toFixed(1)}s ago` : "N/A",
            }
          : null,
        serviceTick: serviceTick
          ? {
              last: serviceTick.last,
              bid: serviceTick.bid,
              ask: serviceTick.ask,
              close: serviceTick.close,
              timestamp: serviceTick.timestamp,
              age: serviceTick.timestamp
                ? `${((Date.now() - serviceTick.timestamp) / 1000).toFixed(1)}s ago`
                : "N/A",
            }
          : null,
      };
    }

    // Test subscription for SPY if not already subscribed
    let testResult = null;
    const testSymbol = "SPY";
    if (!activeSubscriptions.includes(testSymbol)) {
      try {
        console.log("[Market Data Debug] Testing subscription for SPY...");
        await marketDataService.subscribeMarketData(testSymbol);
        testResult = "SPY subscription initiated - check logs for tick events";
      } catch (testErr) {
        testResult = `SPY subscription failed: ${testErr instanceof Error ? testErr.message : String(testErr)}`;
      }
    } else {
      testResult = "SPY already subscribed";
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      connection: {
        state: connectionStatus.state,
        port: connectionStatus.port,
        isConnected,
        lastError: connectionStatus.lastError,
      },
      subscriptions: {
        count: activeSubscriptions.length,
        symbols: activeSubscriptions,
      },
      tickData,
      testResult,
      diagnostics: {
        hint1: "If tickData shows null for serviceTick, IBKR is not sending tick events",
        hint2: "Check IBKR market data subscription permissions in your account",
        hint3: "Verify IB Gateway API settings: Enable ActiveX and Socket Clients",
        hint4: "Look for 🔴 IBKR ERROR logs in terminal for specific error codes",
      },
    });
  } catch (error) {
    console.error("[Market Data Debug] Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Debug failed",
      },
      { status: 500 }
    );
  }
}
