/**
 * Market Bars API Route
 *
 * GET /api/market/bars?symbol=AAPL&timeframe=1m
 *
 * מחזיר נתוני נרות היסטוריים למניה מסוימת
 * מקור: IBKR (ראשון) → Yahoo Finance (fallback) → Mock (לבדיקות)
 */

import { type NextRequest, NextResponse } from "next/server";
import { getMarketDataHub } from "@/lib/server/market-data";
import {
  fetchYahooFinanceBars,
  mapTimeframeToYahooInterval,
} from "@/lib/server/market-data/yahooFinance";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get("symbol");
    const timeframe = searchParams.get("timeframe") || "1m";

    if (!symbol) {
      return NextResponse.json({ error: "Missing symbol parameter" }, { status: 400 });
    }

    console.log(`[Market Bars API] 📥 Request for ${symbol} (${timeframe})`);

    // Try IBKR first (via MarketDataHub) - only for supported timeframes
    let ibkrBars: any[] = [];
    if (timeframe === "1m") {
      const hub = getMarketDataHub();
      ibkrBars = hub.getBars(symbol.toUpperCase(), "1m" as any);
      console.log(`[Market Bars API] IBKR returned ${ibkrBars.length} bars for 1m`);
    } else {
      console.log(`[Market Bars API] ⏭️ Skipping IBKR for timeframe ${timeframe} (not supported, only 1m is supported)`);
    }

    if (ibkrBars.length > 0) {
      // Convert IBKR bars to chart format
      const candlesticks = ibkrBars.map((bar) => {
        // CRITICAL: time MUST be in SECONDS (not milliseconds)
        const timeInSeconds = Math.floor(bar.startTs / 1000);

        // Validate: if time > 10^10, it's still in milliseconds
        if (timeInSeconds > 10000000000) {
          console.error(
            `[Market Bars API] ❌ Invalid timestamp: ${timeInSeconds} (likely milliseconds)`
          );
          throw new Error(`Invalid timestamp format: ${timeInSeconds}`);
        }

        return {
          time: timeInSeconds,
          open: Number(bar.open),
          high: Number(bar.high),
          low: Number(bar.low),
          close: Number(bar.close),
        };
      });

      // Validate first candle
      if (candlesticks.length > 0) {
        const firstCandle = candlesticks[0];
        console.log(`[Market Bars API] ✅ First candle from IBKR:`, {
          time: firstCandle.time,
          timeDate: new Date(firstCandle.time * 1000).toISOString(),
          open: firstCandle.open,
          high: firstCandle.high,
          low: firstCandle.low,
          close: firstCandle.close,
        });
      }

      console.log(`[Market Bars API] ✅ Returning ${candlesticks.length} candles from IBKR`);
      return NextResponse.json(candlesticks);
    }

    // Fallback to Yahoo Finance
    console.log(`[Market Bars API] 💡 IBKR has no data, trying Yahoo Finance...`);

    let yahooBars: any[] = [];
    try {
      const { interval, range } = mapTimeframeToYahooInterval(timeframe);
      console.log(`[Market Bars API] Yahoo params: interval=${interval}, range=${range}`);
      yahooBars = await fetchYahooFinanceBars(symbol, interval, range);
      console.log(`[Market Bars API] Yahoo returned ${yahooBars.length} bars`);
    } catch (yahooError) {
      console.error(`[Market Bars API] ❌ Yahoo Finance error:`, yahooError);
      console.log(`[Market Bars API] 💡 Falling back to mock data...`);
    }

    if (yahooBars.length > 0) {
        // Convert Yahoo bars to chart format
        const candlesticks = yahooBars.map((bar) => {
          // CRITICAL: time MUST be in SECONDS (not milliseconds)
          const timeInSeconds = Math.floor(bar.timestamp / 1000);

          // Validate: if time > 10^10, it's still in milliseconds
          if (timeInSeconds > 10000000000) {
            console.error(
              `[Market Bars API] ❌ Invalid timestamp: ${timeInSeconds} (likely milliseconds)`
            );
            throw new Error(`Invalid timestamp format: ${timeInSeconds}`);
          }

          // Validate price values
          const open = Number(bar.open);
          const high = Number(bar.high);
          const low = Number(bar.low);
          const close = Number(bar.close);

          if (!isFinite(open) || !isFinite(high) || !isFinite(low) || !isFinite(close)) {
            console.error(`[Market Bars API] ❌ Invalid price values:`, { open, high, low, close });
            throw new Error(`Invalid price values`);
          }

          if (open <= 0 || high <= 0 || low <= 0 || close <= 0) {
            console.error(`[Market Bars API] ❌ Non-positive price values:`, {
              open,
              high,
              low,
              close,
            });
            throw new Error(`Non-positive price values`);
          }

          return {
            time: timeInSeconds,
            open,
            high,
            low,
            close,
          };
        });

        // Validate first and last candles
        if (candlesticks.length > 0) {
          const firstCandle = candlesticks[0];
          const lastCandle = candlesticks[candlesticks.length - 1];

          console.log(`[Market Bars API] ✅ First candle from Yahoo:`, {
            time: firstCandle.time,
            timeDate: new Date(firstCandle.time * 1000).toISOString(),
            open: firstCandle.open,
            high: firstCandle.high,
            low: firstCandle.low,
            close: firstCandle.close,
          });

          console.log(`[Market Bars API] ✅ Last candle from Yahoo:`, {
            time: lastCandle.time,
            timeDate: new Date(lastCandle.time * 1000).toISOString(),
            open: lastCandle.open,
            high: lastCandle.high,
            low: lastCandle.low,
            close: lastCandle.close,
          });
        }

        console.log(
          `[Market Bars API] ✅ Returning ${candlesticks.length} candles from Yahoo Finance`
        );
        return NextResponse.json(candlesticks);
      }

    // Last resort: Generate mock data (if Yahoo Finance returned empty or failed)
    console.log(`[Market Bars API] ⚠️ No data from IBKR or Yahoo, generating mock data...`);

    const now = Math.floor(Date.now() / 1000);
    const mockBars = [];
    let price = 150 + Math.random() * 50;

    for (let i = 99; i >= 0; i--) {
      // CRITICAL: time MUST be in SECONDS
      const time = now - i * 60;

      // Validate time is in seconds (not milliseconds)
      if (time > 10000000000) {
        console.error(`[Market Bars API] ❌ Invalid mock timestamp: ${time}`);
        throw new Error(`Invalid mock timestamp format`);
      }

      const open = price;
      const change = (Math.random() - 0.5) * 2;
      const close = Math.max(10, open + change);
      const high = Math.max(open, close) + Math.random() * 0.5;
      const low = Math.min(open, close) - Math.random() * 0.5;

      // Validate prices
      const openNum = Number(open.toFixed(2));
      const highNum = Number(high.toFixed(2));
      const lowNum = Number(low.toFixed(2));
      const closeNum = Number(close.toFixed(2));

      if (!isFinite(openNum) || !isFinite(highNum) || !isFinite(lowNum) || !isFinite(closeNum)) {
        console.error(`[Market Bars API] ❌ Invalid mock price values`);
        throw new Error(`Invalid mock price values`);
      }

      mockBars.push({
        time,
        open: openNum,
        high: highNum,
        low: lowNum,
        close: closeNum,
      });

      price = close;
    }

    // Validate first and last mock candles
    if (mockBars.length > 0) {
      const firstCandle = mockBars[0];
      const lastCandle = mockBars[mockBars.length - 1];

      console.log(`[Market Bars API] ✅ First mock candle:`, {
        time: firstCandle.time,
        timeDate: new Date(firstCandle.time * 1000).toISOString(),
        open: firstCandle.open,
        high: firstCandle.high,
        low: firstCandle.low,
        close: firstCandle.close,
      });

      console.log(`[Market Bars API] ✅ Last mock candle:`, {
        time: lastCandle.time,
        timeDate: new Date(lastCandle.time * 1000).toISOString(),
        open: lastCandle.open,
        high: lastCandle.high,
        low: lastCandle.low,
        close: lastCandle.close,
      });
    }

    console.log(`[Market Bars API] 🎭 Returning ${mockBars.length} mock candles`);
    return NextResponse.json(mockBars);
  } catch (error) {
    console.error("[Market Bars API] ❌ Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
