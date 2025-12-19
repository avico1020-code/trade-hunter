/**
 * Market Data Streaming API Route
 * 
 * IMPORTANT: This endpoint reads from MarketDataHub which is fed by REAL-TIME STREAMING only.
 * There is NO snapshot mode - all data comes from continuous streaming subscriptions.
 * 
 * If symbol is not subscribed, it automatically subscribes to IBKR streaming.
 * This route ensures symbols are subscribed to streaming before reading data.
 * 
 * NOTE: Despite the route name "/snapshot", this endpoint returns data from STREAMING subscriptions.
 * The name is kept for backward compatibility, but all data is real-time streaming.
 */

import { NextResponse } from "next/server";
import { getMarketDataHub } from "@/lib/server/market-data";
import { getIbkrMarketDataService } from "@/lib/server/ibkr";

export async function GET(request: Request) {
  const symbol = new URL(request.url).searchParams.get("symbol") || "";

  // Quick validation
  if (!symbol) {
    return NextResponse.json({ error: "Symbol is required" }, { status: 400 });
  }

  console.log(`[Market Data API] 📥 Request for ${symbol}`);

  try {
    const hub = getMarketDataHub();
    let tick = hub.getLastMarketTick(symbol);

    console.log(`[Market Data API] 📊 Current tick for ${symbol}:`, tick ? `$${tick.price}` : "null");

    // If no data available, try to subscribe to streaming (lazy subscription)
    if (!tick || tick.price === 0) {
      try {
        const marketDataService = getIbkrMarketDataService();
        const activeSubscriptions = marketDataService.getActiveSubscriptions();
        
        console.log(`[Market Data API] 📋 Active subscriptions:`, activeSubscriptions);
        
        // Only subscribe if not already subscribed (avoid duplicate subscriptions)
        if (!activeSubscriptions.includes(symbol.toUpperCase())) {
          console.log(`[Market Data API] 🔴 Auto-subscribing to ${symbol} for REAL-TIME STREAMING...`);
          try {
            await marketDataService.subscribeMarketData(symbol);
            console.log(`[Market Data API] ✅ Subscription initiated for ${symbol}`);
          } catch (subErr) {
            console.error(`[Market Data API] ❌ Subscription failed for ${symbol}:`, subErr);
            throw subErr;
          }
          // Wait a bit for first tick to arrive from streaming
          console.log(`[Market Data API] ⏳ Waiting 1.5s for first tick...`);
          await new Promise(resolve => setTimeout(resolve, 1500));
        } else {
          console.log(`[Market Data API] ℹ️ ${symbol} already subscribed, waiting for tick...`);
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        // Try to get tick again after subscription
        tick = hub.getLastMarketTick(symbol);
        console.log(`[Market Data API] 📊 Tick after subscription for ${symbol}:`, tick ? `$${tick.price}` : "null");
      } catch (subscribeError) {
        console.warn(`[Market Data API] ⚠️ Failed to auto-subscribe to ${symbol} for streaming:`, subscribeError);
        // Continue - we'll return 404 if still no data
      }
    }

    if (!tick || tick.price === 0) {
      console.warn(`[Market Data API] ❌ No data available for ${symbol} - returning 404`);
      return NextResponse.json(
        {
          error: `No market data available for ${symbol}`,
          suggestion: "Symbol may not be subscribed yet. Check IBKR connection and streaming subscription.",
          debug: {
            hubHasTick: !!tick,
            tickPrice: tick?.price ?? null,
          },
        },
        { status: 404 }
      );
    }

    // Convert MarketTick to the expected format (for backward compatibility)
    // Data comes from REAL-TIME STREAMING, not snapshot
    // Field IDs match IBKR field IDs: 31=last, 7295=close, 7308=volume
    const formattedSnapshot: Record<string, string> = {
      conid: "0", // Contract ID not available from MarketDataHub
      "31": String(tick.price), // Last price
      "7295": String(tick.price), // Close price (use last as fallback)
      "7308": String(tick.size || 0), // Volume
    };

    // If we have state with more info, use it
    const state = hub.getSymbolState(symbol);
    if (state?.lastTick) {
      const lt = state.lastTick;
      if (lt.close) formattedSnapshot["7295"] = String(lt.close);
      if (lt.high) formattedSnapshot["6"] = String(lt.high);
      if (lt.low) formattedSnapshot["7"] = String(lt.low);
      if (lt.open) formattedSnapshot["14"] = String(lt.open);
      if (lt.bid) formattedSnapshot["1"] = String(lt.bid);
      if (lt.ask) formattedSnapshot["2"] = String(lt.ask);
      if (lt.volume) formattedSnapshot["7308"] = String(lt.volume);
    }

    return NextResponse.json(formattedSnapshot);
  } catch (error) {
    console.error(`[Market Data API] Error for ${symbol}:`, error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch market data";

    return NextResponse.json(
      {
        error: errorMessage,
        suggestion: "Ensure MarketDataHub is initialized and streaming is active. Streaming subscription will be established automatically.",
      },
      { status: 500 }
    );
  }
}
