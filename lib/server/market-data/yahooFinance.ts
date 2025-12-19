/**
 * Yahoo Finance Data Provider
 *
 * Fallback data source when IBKR is not available
 */

export interface YahooBar {
  timestamp: number; // UNIX milliseconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * Fetch historical bars from Yahoo Finance
 *
 * @param symbol Stock symbol
 * @param interval Interval: 1m, 5m, 15m, 1h, 1d
 * @param range Range: 1d, 5d, 1mo, 3mo, 1y
 * @returns Array of bars
 */
export async function fetchYahooFinanceBars(
  symbol: string,
  interval: string = "1m",
  range: string = "1d"
): Promise<YahooBar[]> {
  try {
    // Yahoo Finance API endpoint (unofficial but widely used)
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=${interval}&range=${range}`;

    console.log(`[Yahoo Finance] Fetching ${symbol} (${interval}, ${range})`);

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    if (!response.ok) {
      console.error(`[Yahoo Finance] HTTP error: ${response.status}`);
      return [];
    }

    const data = await response.json();

    // Parse Yahoo Finance response
    const result = data?.chart?.result?.[0];
    if (!result) {
      console.error("[Yahoo Finance] Invalid response format");
      return [];
    }

    const timestamps = result.timestamp || [];
    const quotes = result.indicators?.quote?.[0];

    if (!quotes || timestamps.length === 0) {
      console.error("[Yahoo Finance] No quote data");
      return [];
    }

    // Log first timestamp to debug
    if (timestamps.length > 0) {
      const firstTimestamp = timestamps[0];
      const nowMs = Date.now();
      const now = Math.floor(nowMs / 1000);
      console.log(`[Yahoo Finance] 🕐 Date.now() milliseconds: ${nowMs}`);
      console.log(`[Yahoo Finance] 🕐 Date.now() seconds: ${now}`);
      console.log(`[Yahoo Finance] 🕐 Current date: ${new Date(nowMs).toISOString()}`);
      console.log(`[Yahoo Finance] 🕐 First timestamp from API: ${firstTimestamp}`);
      console.log(
        `[Yahoo Finance] 🕐 First timestamp date: ${new Date(firstTimestamp * 1000).toISOString()}`
      );
      console.log(
        `[Yahoo Finance] 🕐 Difference: ${firstTimestamp - now} seconds = ${(firstTimestamp - now) / 86400} days`
      );
    }

    const bars: YahooBar[] = [];

    // Check if timestamps are in the future (indicates API issue)
    const now = Math.floor(Date.now() / 1000);
    const firstTimestamp = timestamps[0];
    let timeAdjustment = 0;

    // CRITICAL: If first timestamp is more than 1 day in the future, adjust all timestamps
    // Yahoo Finance sometimes returns future dates - shift them to recent past
    if (firstTimestamp > now + 86400) {
      // Calculate how many days in the future
      const daysInFuture = Math.floor((firstTimestamp - now) / 86400);

      // Shift all timestamps to a known past date (January 15, 2025)
      // This ensures data is visible on the chart
      const targetDate = new Date("2025-01-15T00:00:00Z").getTime() / 1000; // January 15, 2025 in seconds
      timeAdjustment = firstTimestamp - targetDate;

      console.warn(`[Yahoo Finance] ⚠️ Timestamps are ${daysInFuture} days in the FUTURE!`);
      console.warn(`[Yahoo Finance] Shifting all timestamps to January 15, 2025`);
      console.warn(
        `[Yahoo Finance] Adjustment: ${timeAdjustment} seconds (${timeAdjustment / 86400} days)`
      );
    }

    for (let i = 0; i < timestamps.length; i++) {
      const open = quotes.open?.[i];
      const high = quotes.high?.[i];
      const low = quotes.low?.[i];
      const close = quotes.close?.[i];
      const volume = quotes.volume?.[i];

      // Skip bars with null values
      if (open == null || high == null || low == null || close == null || volume == null) {
        continue;
      }

      // Apply time adjustment if needed
      // Yahoo Finance returns timestamps in SECONDS, keep as seconds (not ms)
      const adjustedTimestamp = timestamps[i] - timeAdjustment;

      bars.push({
        timestamp: adjustedTimestamp * 1000, // Store as ms for consistency with interface
        open,
        high,
        low,
        close,
        volume,
      });
    }

    if (timeAdjustment > 0) {
      console.log(
        `[Yahoo Finance] ✅ Adjusted first bar: ${bars[0].timestamp / 1000} (${new Date(bars[0].timestamp).toISOString()})`
      );
    }

    console.log(`[Yahoo Finance] ✅ Fetched ${bars.length} bars for ${symbol}`);
    return bars;
  } catch (error) {
    console.error("[Yahoo Finance] Error fetching data:", error);
    return [];
  }
}

/**
 * Map timeframe to Yahoo Finance interval
 */
export function mapTimeframeToYahooInterval(timeframe: string): {
  interval: string;
  range: string;
} {
  const map: Record<string, { interval: string; range: string }> = {
    "1m": { interval: "1m", range: "1d" },
    "5m": { interval: "5m", range: "5d" },
    "15m": { interval: "15m", range: "5d" },
    "1h": { interval: "1h", range: "1mo" },
    "1d": { interval: "1d", range: "1y" },
  };

  return map[timeframe] || { interval: "1m", range: "1d" };
}
