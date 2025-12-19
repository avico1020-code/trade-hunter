/**
 * System Health API Route - Phase 7
 * 
 * Returns a comprehensive health status snapshot of the market data system
 * including IBKR connection, MarketDataHub metrics, backfill status, and persistence status
 */

import { NextResponse } from "next/server";
import { getMarketDataHub } from "@/lib/server/market-data";
import { getBackfillStatus } from "@/lib/server/market-data/backfillIntraday";
import { getIbkrConnectionManager } from "@/lib/server/ibkr";

export async function GET() {
  try {
    const hub = getMarketDataHub();
    const backfillStatus = getBackfillStatus();

    // Get IBKR connection status (may not exist if not initialized)
    let ibkrStatus = null;
    try {
      const connectionManager = getIbkrConnectionManager();
      ibkrStatus = connectionManager.getStatus();
    } catch (err) {
      // IBKR connection may not be initialized yet
      console.warn(`[Health API] IBKR connection not available:`, err);
    }

    // Get MarketDataHub status
    const hubStatus = hub.getSystemStatusSnapshot();

    // Determine overall health
    // Simple heuristics: system is healthy if:
    // 1. IBKR is connected (if initialized)
    // 2. Backfill has run
    // 3. Last tick is recent (within last 5 minutes, or null if no ticks yet)
    const now = Date.now();
    const FIVE_MINUTES_MS = 5 * 60 * 1000;
    const lastTickAge = hubStatus.lastGlobalTickTs ? now - hubStatus.lastGlobalTickTs : null;
    const isRecentTicks = lastTickAge === null || lastTickAge < FIVE_MINUTES_MS;

    let ok = true;
    const warnings: string[] = [];

    if (ibkrStatus && ibkrStatus.state !== "CONNECTED") {
      ok = false;
      warnings.push(`IBKR is not connected (state: ${ibkrStatus.state})`);
    }

    if (!backfillStatus.hasRun) {
      warnings.push("Backfill has not run yet");
    }

    if (lastTickAge !== null && lastTickAge > FIVE_MINUTES_MS) {
      warnings.push(`Last tick was ${Math.floor(lastTickAge / 60000)} minutes ago (may be stale)`);
    }

    if (ibkrStatus?.lastError) {
      warnings.push(
        `Last IBKR error: ${ibkrStatus.lastError} ` +
        `at ${ibkrStatus.lastDisconnectTime ? new Date(ibkrStatus.lastDisconnectTime).toISOString() : "unknown time"}`
      );
    }

    if (backfillStatus.lastError) {
      warnings.push(
        `Backfill error: ${backfillStatus.lastError.message} ` +
        `at ${new Date(backfillStatus.lastError.ts).toISOString()}`
      );
    }

    const health = {
      ok,
      timestamp: new Date().toISOString(),
      ibkr: ibkrStatus || {
        state: "DISCONNECTED",
        lastConnectTime: null,
        lastDisconnectTime: null,
        lastError: null,
        serverTime: null,
        clientId: 0,
        host: "",
        port: 0,
        note: "IBKR connection not initialized",
      },
      marketDataHub: {
        systemStartTs: hubStatus.systemStartTs,
        systemStartTime: new Date(hubStatus.systemStartTs).toISOString(),
        lastGlobalTickTs: hubStatus.lastGlobalTickTs,
        lastGlobalTickTime: hubStatus.lastGlobalTickTs
          ? new Date(hubStatus.lastGlobalTickTs).toISOString()
          : null,
        lastGlobalBarCloseTs: hubStatus.lastGlobalBarCloseTs,
        lastGlobalBarCloseTime: hubStatus.lastGlobalBarCloseTs
          ? new Date(hubStatus.lastGlobalBarCloseTs).toISOString()
          : null,
        symbols: hubStatus.symbols,
        symbolCount: hubStatus.symbols.length,
        lastTickTsPerSymbol: hubStatus.lastTickTsPerSymbol,
        lastBarCloseTsPerSymbol: hubStatus.lastBarCloseTsPerSymbol,
      },
      backfill: {
        hasRun: backfillStatus.hasRun,
        lastRunTs: backfillStatus.lastRunTs,
        lastRunTime: backfillStatus.lastRunTs
          ? new Date(backfillStatus.lastRunTs).toISOString()
          : null,
        symbolsLoaded: backfillStatus.symbolsLoaded,
        barsLoaded: backfillStatus.barsLoaded,
        lastError: backfillStatus.lastError
          ? {
              message: backfillStatus.lastError.message,
              ts: backfillStatus.lastError.ts,
              time: new Date(backfillStatus.lastError.ts).toISOString(),
            }
          : null,
      },
      warnings: warnings.length > 0 ? warnings : undefined,
    };

    return NextResponse.json(health, { status: ok ? 200 : 503 });
  } catch (error) {
    console.error(`[Health API] Error generating health status:`, error);
    return NextResponse.json(
      {
        ok: false,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Failed to generate health status",
      },
      { status: 500 }
    );
  }
}

