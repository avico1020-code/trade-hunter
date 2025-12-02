"use client";

import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEffect, useRef, useCallback } from "react";

interface MarketDataResult {
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  source: "ibkr" | "yahoo" | null;
  isLoading: boolean;
  lastUpdate: number | null;
}

/**
 * Hook for real-time market data with smart caching
 * - Reads from Convex cache (instant!)
 * - Fetches from IBKR via Next.js API route (client-side)
 * - Falls back to Yahoo Finance if IBKR fails
 * - Auto-refreshes every 30 seconds
 */
export function useRealtimeMarketData(symbol: string | null): MarketDataResult {
  const data = useQuery(
    api.marketData.getMarketData,
    symbol ? { symbol } : "skip"
  );

  const storeFromClient = useAction(api.marketData.storeMarketDataFromClient);
  const fetchYahoo = useAction(api.marketData.fetchAndCacheMarketData);
  const lastFetchTime = useRef<number>(0);
  const ibkrFailureCount = useRef<number>(0);
  const ibkrLastFailureTime = useRef<number>(0);
  const ibkrDisabledUntil = useRef<number>(0); // Timestamp when to re-enable IBKR attempts

  // Fetch data from IBKR (client-side) or Yahoo Finance (fallback)
  const fetchData = useCallback(async (sym: string) => {
    const now = Date.now();
    if (now - lastFetchTime.current < 5000) return; // Debounce: max once per 5 seconds
    lastFetchTime.current = now;

    // Circuit breaker: If IBKR failed recently, skip it for a while
    if (now < ibkrDisabledUntil.current) {
      const minutesLeft = Math.ceil((ibkrDisabledUntil.current - now) / 60000);
      console.log(`⏸️ [useRealtimeMarketData] IBKR disabled for ${sym} (${minutesLeft}m remaining) - using Yahoo Finance directly`);
      try {
        await fetchYahoo({ symbol: sym });
      } catch (error) {
        console.error(`❌ [useRealtimeMarketData] Yahoo Finance failed for ${sym}:`, error);
      }
      return;
    }

    try {
      // Try IBKR first (via Next.js API route - client-side only!)
      console.log(`🔍 [useRealtimeMarketData] Fetching ${sym} from IBKR...`);
      
      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 seconds timeout
      
      let ibkrRes: Response;
      try {
        ibkrRes = await fetch(`/api/ibkr/market-data/snapshot?symbol=${sym}`, {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError' || fetchError.message?.includes('aborted')) {
          console.warn(`⚠️ [useRealtimeMarketData] IBKR request timeout for ${sym} - falling back to Yahoo Finance`);
          ibkrFailureCount.current += 1;
          ibkrLastFailureTime.current = now;
          // Disable IBKR for 5 minutes after 3 failures, or 10 minutes after 5+ failures
          if (ibkrFailureCount.current >= 5) {
            ibkrDisabledUntil.current = now + 10 * 60 * 1000; // 10 minutes
            console.warn(`🚫 [useRealtimeMarketData] IBKR disabled for 10 minutes after ${ibkrFailureCount.current} failures`);
          } else if (ibkrFailureCount.current >= 3) {
            ibkrDisabledUntil.current = now + 5 * 60 * 1000; // 5 minutes
            console.warn(`🚫 [useRealtimeMarketData] IBKR disabled for 5 minutes after ${ibkrFailureCount.current} failures`);
          }
          // Don't throw - fall through to Yahoo Finance fallback
          await fetchYahoo({ symbol: sym }).catch(console.error);
          return;
        } else {
          console.warn(`⚠️ [useRealtimeMarketData] IBKR fetch failed for ${sym}:`, fetchError.message || String(fetchError));
          ibkrFailureCount.current += 1;
          ibkrLastFailureTime.current = now;
          // Fall through to Yahoo Finance fallback
          throw fetchError;
        }
      }

      if (ibkrRes.ok) {
        // Success! Reset failure counter
        ibkrFailureCount.current = 0;
        ibkrDisabledUntil.current = 0;
        const snapshot = await ibkrRes.json().catch((jsonError) => {
          console.error(`❌ [useRealtimeMarketData] Failed to parse JSON for ${sym}:`, jsonError);
          throw new Error("Invalid JSON response from IBKR");
        });
        
        const lastPrice = parseFloat(snapshot["31"] || "0");
        const closePrice = parseFloat(snapshot["7295"] || "0");
        const volume = parseFloat(snapshot["7308"] || "0");

        if (lastPrice > 0 && closePrice > 0) {
          const change = lastPrice - closePrice;
          const changePercent = (change / closePrice) * 100;

          // Store in Convex cache
          await storeFromClient({
            symbol: sym,
            price: lastPrice,
            change,
            changePercent,
            volume,
            source: "ibkr",
          });

          console.log(`✅ [useRealtimeMarketData] IBKR SUCCESS for ${sym}: $${lastPrice.toFixed(2)} (${changePercent >= 0 ? "+" : ""}${changePercent.toFixed(2)}%)`);
          return;
        } else {
          console.warn(`⚠️ [useRealtimeMarketData] IBKR returned invalid data for ${sym} (price: ${lastPrice}, close: ${closePrice})`);
        }
      } else {
        const errorText = await ibkrRes.text().catch(() => "");
        console.warn(`⚠️ [useRealtimeMarketData] IBKR HTTP ${ibkrRes.status} for ${sym}: ${errorText.substring(0, 100)}`);
        
        // Increment failure counter for 503 errors (service unavailable)
        if (ibkrRes.status === 503) {
          ibkrFailureCount.current += 1;
          ibkrLastFailureTime.current = now;
          // Disable IBKR for 5 minutes after 3 failures, or 10 minutes after 5+ failures
          if (ibkrFailureCount.current >= 5) {
            ibkrDisabledUntil.current = now + 10 * 60 * 1000; // 10 minutes
            console.warn(`🚫 [useRealtimeMarketData] IBKR disabled for 10 minutes after ${ibkrFailureCount.current} consecutive failures`);
          } else if (ibkrFailureCount.current >= 3) {
            ibkrDisabledUntil.current = now + 5 * 60 * 1000; // 5 minutes
            console.warn(`🚫 [useRealtimeMarketData] IBKR disabled for 5 minutes after ${ibkrFailureCount.current} consecutive failures`);
          }
        }
      }

      // Fallback to Yahoo Finance (via Convex Action)
      console.warn(`⚠️ [useRealtimeMarketData] IBKR FAILED for ${sym}, falling back to Yahoo Finance...`);
      await fetchYahoo({ symbol: sym });
    } catch (error) {
      console.error(`❌ [useRealtimeMarketData] Error fetching ${sym}:`, error);
      // Try Yahoo Finance as last resort
      try {
        await fetchYahoo({ symbol: sym });
      } catch (yahooError) {
        console.error(`❌ [useRealtimeMarketData] Yahoo Finance also failed for ${sym}:`, yahooError);
      }
    }
  }, [storeFromClient, fetchYahoo]);

  // Check if data is stale (older than 30 seconds) or missing, and refresh it
  useEffect(() => {
    if (!symbol) return;

    const now = Date.now();
    const STALE_THRESHOLD = 30 * 1000; // 30 seconds

    // If no data, fetch immediately
    if (!data) {
      fetchData(symbol);
      return;
    }

    // If data exists but is stale, refresh it
    const dataAge = now - data.lastUpdate;
    if (dataAge > STALE_THRESHOLD) {
      console.log(`🔄 [useRealtimeMarketData] ${symbol} data is stale (${Math.floor(dataAge / 1000)}s old), refreshing...`);
      fetchData(symbol);
    }
  }, [symbol, data, fetchData]);

  // Force refresh every 30 seconds
  useEffect(() => {
    if (!symbol) return;

    const interval = setInterval(() => {
      fetchData(symbol);
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [symbol, fetchData]);

  if (!symbol) {
    return {
      price: 0,
      change: 0,
      changePercent: 0,
      volume: 0,
      source: null,
      isLoading: false,
      lastUpdate: null,
    };
  }

  if (!data) {
    return {
      price: 0,
      change: 0,
      changePercent: 0,
      volume: 0,
      source: null,
      isLoading: true,
      lastUpdate: null,
    };
  }

  return {
    price: data.price,
    change: data.change,
    changePercent: data.changePercent,
    volume: data.volume,
    source: data.source as "ibkr" | "yahoo",
    isLoading: false,
    lastUpdate: data.lastUpdate,
  };
}

