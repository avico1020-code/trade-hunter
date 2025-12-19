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

    // Check if IB Gateway is connected before applying circuit breaker
    // Use short timeout to prevent blocking
    let ibkrConnected = false;
    try {
      const statusController = new AbortController();
      const statusTimeoutId = setTimeout(() => statusController.abort(), 3000); // 3 second timeout
      
      const statusRes = await fetch("/api/ibkr/auth/status", { 
        cache: "no-store",
        signal: statusController.signal,
      });
      
      clearTimeout(statusTimeoutId);
      
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        ibkrConnected = statusData.connected === true;
        
        // If IB Gateway is connected, reset circuit breaker
        if (ibkrConnected) {
          if (ibkrDisabledUntil.current > 0 || ibkrFailureCount.current > 0) {
            console.log(`✅ [useRealtimeMarketData] IB Gateway connected - resetting circuit breaker for ${sym}`);
            ibkrFailureCount.current = 0;
            ibkrDisabledUntil.current = 0;
          }
        }
      }
    } catch (statusError: any) {
      // If status check fails or times out, assume not connected - but don't block
      // Just proceed with the fetch attempt (it will handle connection if needed)
      if (statusError.name !== 'AbortError') {
        console.warn(`⚠️ [useRealtimeMarketData] Failed to check IB Gateway status:`, statusError);
      }
    }

    // Circuit breaker: If IBKR failed recently AND IB Gateway is not connected, skip it for a while
    // But if IB Gateway is connected, always try IBKR first
    if (!ibkrConnected && now < ibkrDisabledUntil.current) {
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
      if (ibkrConnected) {
        console.log(`🔍 [useRealtimeMarketData] Fetching ${sym} from IBKR (IB Gateway connected)...`);
      } else {
        console.log(`🔍 [useRealtimeMarketData] Fetching ${sym} from IBKR...`);
      }
      
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
        const errorName = fetchError?.name || '';
        const errorMessage = fetchError?.message || String(fetchError) || 'Unknown error';
        
        // Handle timeout/abort errors
        if (errorName === 'AbortError' || errorMessage.includes('aborted') || errorMessage.includes('timeout')) {
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
          await fetchYahoo({ symbol: sym }).catch((err) => {
            console.error(`❌ [useRealtimeMarketData] Yahoo Finance fallback also failed for ${sym}:`, err);
          });
          return;
        } else {
          // Handle network errors (including "Failed to fetch")
          console.warn(`⚠️ [useRealtimeMarketData] IBKR network error for ${sym}:`, errorMessage);
          ibkrFailureCount.current += 1;
          ibkrLastFailureTime.current = now;
          // Fall through to Yahoo Finance fallback instead of throwing
          await fetchYahoo({ symbol: sym }).catch((err) => {
            console.error(`❌ [useRealtimeMarketData] Yahoo Finance fallback also failed for ${sym}:`, err);
          });
          return;
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

  // Check if data is stale (older than 10 seconds) or missing, and refresh it
  // NOTE: Data should come from streaming, but we check for staleness as a safety mechanism
  // In the future, this should be replaced with WebSocket or Server-Sent Events for true real-time
  useEffect(() => {
    if (!symbol) return;

    const now = Date.now();
    const STALE_THRESHOLD = 10 * 1000; // 10 seconds (reduced from 30s for faster updates)

    // If no data, fetch immediately
    if (!data) {
      fetchData(symbol);
      return;
    }

    // If data exists but is stale, refresh it
    // NOTE: This is a fallback - ideally data should update in real-time from streaming
    const dataAge = now - data.lastUpdate;
    if (dataAge > STALE_THRESHOLD) {
      console.log(`🔄 [useRealtimeMarketData] ${symbol} data is stale (${Math.floor(dataAge / 1000)}s old), refreshing from streaming...`);
      fetchData(symbol);
    }
  }, [symbol, data, fetchData]);

  // Force refresh every 10 seconds (reduced from 30s for faster updates)
  // NOTE: This polling should be replaced with WebSocket/SSE for true real-time updates
  // The streaming subscription is active, but the UI polling ensures fresh data
  useEffect(() => {
    if (!symbol) return;

    const interval = setInterval(() => {
      fetchData(symbol);
    }, 10000); // Every 10 seconds (reduced from 30s)

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

