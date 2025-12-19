/**
 * Market Data Hub - Type Definitions
 *
 * Type definitions for the centralized market data hub
 */

/**
 * Supported timeframes for intraday bars
 */
export type Timeframe = "1s" | "5s" | "1m";

/**
 * Represents a single tick of market data
 * Used internally for bar building
 */
export interface MarketTick {
  symbol: string;
  price: number;
  size?: number;
  ts: number; // timestamp of tick (unix milliseconds)
}

/**
 * Legacy Tick interface for backward compatibility
 * Maps to MarketTick structure
 */
export interface Tick {
  symbol: string;
  timestamp: number;
  price?: number;
  [key: string]: unknown;
}

/**
 * Intraday OHLCV bar structure
 */
export interface IntradayBar {
  symbol: string;
  timeframe: Timeframe;
  startTs: number; // Unix milliseconds - start of bar interval (inclusive)
  endTs: number; // Unix milliseconds - end of bar interval (exclusive)
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * Symbol state maintained in the Market Data Hub
 */
export interface SymbolState {
  symbol: string;
  lastTick: Tick | null;
  lastUpdateTs: number | null;
  currentTradingDay?: string; // e.g. "2025-12-08" in the chosen timezone
  intradayBars: {
    "1s": IntradayBar[];
    "5s": IntradayBar[];
    "1m": IntradayBar[];
  };
  currentBars: {
    "1s"?: IntradayBar;
    "5s"?: IntradayBar;
    "1m"?: IntradayBar;
  };
}
