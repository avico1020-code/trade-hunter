"use client";

import { useEffect, useRef, useState } from "react";
import type { IbkrMarketDataSnapshot } from "@/lib/types/ibkr";

interface MarketDataResult {
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  isLoading: boolean;
  error: string | null;
  source: "ibkr" | "yahoo" | null;
}

/**
 * Hook for real-time market data streaming from IBKR
 * Falls back to Yahoo Finance if IBKR is unavailable
 */
export function useMarketData(symbol: string | null): MarketDataResult {
  const [data, setData] = useState<MarketDataResult>({
    price: 0,
    change: 0,
    changePercent: 0,
    volume: 0,
    isLoading: true,
    error: null,
    source: null,
  });

  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!symbol) {
      setData({
        price: 0,
        change: 0,
        changePercent: 0,
        volume: 0,
        isLoading: false,
        error: null,
        source: null,
      });
      return;
    }

    setData((prev) => ({ ...prev, isLoading: true, error: null }));

    // Connect to SSE endpoint for real-time updates
    const eventSource = new EventSource(`/api/ibkr/market-data/stream?symbol=${symbol}`);
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const snapshot: IbkrMarketDataSnapshot = JSON.parse(event.data);

        // Parse IBKR data
        const lastPrice = parseFloat(snapshot["31"] || "0");
        const closePrice = parseFloat(snapshot["7295"] || "0");
        const volume = parseFloat(snapshot["7308"] || "0");

        const change = lastPrice - closePrice;
        const changePercent = closePrice > 0 ? (change / closePrice) * 100 : 0;

        setData({
          price: lastPrice,
          change,
          changePercent,
          volume,
          isLoading: false,
          error: null,
          source: "ibkr",
        });

        console.log(
          `✅ [useMarketData] ${symbol}: $${lastPrice.toFixed(2)} (${changePercent >= 0 ? "+" : ""}${changePercent.toFixed(2)}%)`
        );
      } catch (error) {
        console.error(`❌ [useMarketData] Error parsing data for ${symbol}:`, error);
      }
    };

    eventSource.onerror = () => {
      console.warn(
        `⚠️ [useMarketData] Stream error for ${symbol}, falling back to Yahoo Finance...`
      );
      eventSource.close();

      // Fallback to Yahoo Finance
      fetchYahooFinanceData(symbol);
    };

    return () => {
      eventSource.close();
    };
  }, [symbol]);

  // Fallback to Yahoo Finance
  const fetchYahooFinanceData = async (sym: string) => {
    try {
      const response = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${sym}?interval=1d&range=1d`
      );
      const json = await response.json();
      const quote = json.chart?.result?.[0];

      if (quote) {
        const meta = quote.meta;
        const currentPrice = meta.regularMarketPrice || 0;
        const previousClose = meta.chartPreviousClose || meta.previousClose || 0;
        const change = currentPrice - previousClose;
        const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;
        const volume = meta.regularMarketVolume || 0;

        setData({
          price: currentPrice,
          change,
          changePercent,
          volume,
          isLoading: false,
          error: null,
          source: "yahoo",
        });

        console.log(
          `📰 [useMarketData] ${sym}: $${currentPrice.toFixed(2)} (${changePercent >= 0 ? "+" : ""}${changePercent.toFixed(2)}%) - Yahoo Finance`
        );
      }
    } catch (error) {
      console.error(`❌ [useMarketData] Yahoo Finance error for ${sym}:`, error);
      setData((prev) => ({
        ...prev,
        isLoading: false,
        error: "Failed to fetch market data",
      }));
    }
  };

  return data;
}
