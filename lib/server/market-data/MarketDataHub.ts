/**
 * Market Data Hub - Phase 6 (Single Source of Truth)
 *
 * Centralized in-memory singleton for market data management.
 * This is the single source of truth for all market data in the system.
 *
 * Phase 6: All modules MUST use MarketDataHub for real-time market data.
 * No direct IBKR, HTTP, or Convex access for live data.
 *
 * Architecture:
 * - Phase 1: Infrastructure (symbol registry, tick events)
 * - Phase 2: IBKR streaming layer feeds ticks
 * - Phase 3: Intraday bar building (1s, 5s, 1m)
 * - Phase 4: Convex persistence for bars
 * - Phase 5: Backfill from Convex on startup
 * - Phase 6: All consumers route through MarketDataHub
 */

import { EventEmitter } from "events";
import type { IntradayBar, MarketTick, SymbolState, Tick, Timeframe } from "./types";

/**
 * Centralized Market Data Hub
 *
 * Singleton that maintains:
 * - Symbol registry (Map<string, SymbolState>)
 * - Event emitter for tick events
 * - Public API for symbol state management
 */
export class MarketDataHub extends EventEmitter {
  private static instance: MarketDataHub | null = null;
  private symbolRegistry: Map<string, SymbolState> = new Map();

  // Phase 7: Metrics tracking
  private systemStartTs: number;
  private lastGlobalTickTs: number | null = null;
  private lastGlobalBarCloseTs: number | null = null;
  private lastTickTsPerSymbol: Map<string, number> = new Map();
  private lastBarCloseTsPerSymbol: Map<string, number> = new Map();

  private constructor() {
    super();
    // Set max listeners to a high value to support many subscribers
    this.setMaxListeners(1000);

    // Phase 7: Initialize metrics
    this.systemStartTs = Date.now();
    console.log(`[MarketDataHub] 🚀 Initialized at ${new Date(this.systemStartTs).toISOString()}`);
  }

  /**
   * Get the singleton instance of MarketDataHub
   */
  static getInstance(): MarketDataHub {
    if (!MarketDataHub.instance) {
      MarketDataHub.instance = new MarketDataHub();
    }
    return MarketDataHub.instance;
  }

  /**
   * Ensure a symbol exists in the registry
   * Creates the symbol state if it doesn't exist
   *
   * @param symbol Stock symbol (e.g., "AAPL", "MSFT")
   * @returns The symbol's state object
   */
  ensureSymbol(symbol: string): SymbolState {
    const symbolKey = symbol.toUpperCase();

    if (!this.symbolRegistry.has(symbolKey)) {
      const newState: SymbolState = {
        symbol: symbolKey,
        lastTick: null,
        lastUpdateTs: null,
        currentTradingDay: undefined,
        intradayBars: {
          "1s": [],
          "5s": [],
          "1m": [],
        },
        currentBars: {
          "1s": undefined,
          "5s": undefined,
          "1m": undefined,
        },
      };

      this.symbolRegistry.set(symbolKey, newState);
      console.log(`[MarketDataHub] Registered new symbol: ${symbolKey}`);
    }

    return this.symbolRegistry.get(symbolKey)!;
  }

  /**
   * Update the last tick for a symbol
   * Updates lastTick and lastUpdateTs, builds bars, and emits events
   *
   * @param symbol Stock symbol
   * @param tick Tick data (generic structure)
   */
  setLastTick(symbol: string, tick: Tick): void {
    const symbolKey = symbol.toUpperCase();
    const state = this.ensureSymbol(symbolKey);

    // Convert Tick to MarketTick format for bar building
    const marketTick: MarketTick = {
      symbol: symbolKey,
      price: tick.price ?? 0,
      size: (tick.volume as number) || (tick.lastSize as number) || 0,
      ts: tick.timestamp || Date.now(),
    };

    // Update state
    state.lastTick = tick;
    state.lastUpdateTs = marketTick.ts;

    // Phase 7: Update metrics
    this.lastGlobalTickTs = marketTick.ts;
    this.lastTickTsPerSymbol.set(symbolKey, marketTick.ts);

    // Build bars from tick
    this.updateBarsFromTick(marketTick);

    // Emit tick event
    // Event name: "tick:<SYMBOL>" for symbol-specific listeners
    this.emit(`tick:${symbolKey}`, tick);

    // Also emit generic "tick" event with symbol and tick
    this.emit("tick", symbolKey, tick);
  }

  /**
   * Handle incoming tick (alias for setLastTick for clarity)
   * This is the main entry point from the streaming layer
   *
   * @param tick Market tick data
   */
  handleTick(tick: MarketTick): void {
    this.setLastTick(tick.symbol, {
      symbol: tick.symbol,
      timestamp: tick.ts,
      price: tick.price,
      volume: tick.size,
    });
  }

  /**
   * Get the most recent tick for a symbol
   *
   * @param symbol Stock symbol
   * @returns The last tick, or null if no tick exists
   */
  getLastTick(symbol: string): Tick | null {
    const symbolKey = symbol.toUpperCase();
    const state = this.symbolRegistry.get(symbolKey);
    return state?.lastTick || null;
  }

  /**
   * Get the most recent market tick for a symbol (typed as MarketTick)
   *
   * @param symbol Stock symbol
   * @returns MarketTick with price, size, ts, or null if no tick exists
   */
  getLastMarketTick(symbol: string): MarketTick | null {
    const symbolKey = symbol.toUpperCase();
    const state = this.symbolRegistry.get(symbolKey);
    const tick = state?.lastTick;

    if (!tick) {
      return null;
    }

    // Convert Tick to MarketTick format
    return {
      symbol: symbolKey,
      price: tick.price ?? 0,
      size: (tick.volume as number) || (tick.lastSize as number) || 0,
      ts: tick.timestamp || Date.now(),
    };
  }

  /**
   * Get the full symbol state
   *
   * @param symbol Stock symbol
   * @returns The symbol state, or null if symbol doesn't exist
   */
  getSymbolState(symbol: string): SymbolState | null {
    const symbolKey = symbol.toUpperCase();
    return this.symbolRegistry.get(symbolKey) || null;
  }

  /**
   * Register a listener for real-time tick events for a specific symbol
   *
   * @param symbol Stock symbol to listen for (null = all symbols)
   * @param handler Callback function that receives the tick
   * @returns Unsubscribe function to remove the listener
   */
  onTick(symbol: string | null, handler: (tick: Tick) => void): () => void {
    if (symbol === null) {
      // Subscribe to all ticks
      return this.onAnyTick((_symbol, tick) => handler(tick));
    }
    const symbolKey = symbol.toUpperCase();
    const eventName = `tick:${symbolKey}`;

    // Ensure symbol exists
    this.ensureSymbol(symbolKey);

    // Add listener
    this.on(eventName, handler);

    // Return unsubscribe function
    return () => {
      this.off(eventName, handler);
    };
  }

  /**
   * Register a listener for all tick events (all symbols)
   *
   * @param handler Callback function that receives (symbol, tick)
   * @returns Unsubscribe function to remove the listener
   */
  onAnyTick(handler: (symbol: string, tick: Tick) => void): () => void {
    this.on("tick", handler);

    return () => {
      this.off("tick", handler);
    };
  }

  /**
   * Get intraday bars for a symbol and timeframe
   *
   * @param symbol Stock symbol
   * @param timeframe Bar timeframe ("1s", "5s", "1m")
   * @returns Array of intraday bars for the current trading day
   */
  getBars(symbol: string, timeframe: Timeframe): IntradayBar[] {
    const symbolKey = symbol.toUpperCase();
    const state = this.symbolRegistry.get(symbolKey);

    if (!state) {
      return [];
    }

    return state.intradayBars[timeframe] || [];
  }

  /**
   * Register a listener for bar-close events
   *
   * @param symbol Stock symbol (null = all symbols)
   * @param timeframe Bar timeframe (null = all timeframes)
   * @param handler Callback function that receives the closed bar
   * @returns Unsubscribe function to remove the listener
   */
  onBarClose(
    symbol: string | null,
    timeframe: Timeframe | null,
    handler: (bar: IntradayBar) => void
  ): () => void {
    if (symbol === null && timeframe === null) {
      // Subscribe to all bar closes
      this.on("barClose", handler);
      return () => {
        this.off("barClose", handler);
      };
    }

    if (symbol === null) {
      // Subscribe to all symbols for specific timeframe
      const eventName = `barClose:*:${timeframe}`;
      this.on(eventName, handler);
      return () => {
        this.off(eventName, handler);
      };
    }

    if (timeframe === null) {
      // Subscribe to all timeframes for specific symbol
      const symbolKey = symbol.toUpperCase();
      const eventName = `barClose:${symbolKey}:*`;
      this.on(eventName, handler);
      return () => {
        this.off(eventName, handler);
      };
    }

    // Subscribe to specific symbol and timeframe
    const symbolKey = symbol.toUpperCase();
    const eventName = `barClose:${symbolKey}:${timeframe}`;
    this.on(eventName, handler);

    return () => {
      this.off(eventName, handler);
    };
  }

  /**
   * Get all registered symbols
   *
   * @returns Array of symbol strings
   */
  getAllSymbols(): string[] {
    return Array.from(this.symbolRegistry.keys());
  }

  /**
   * Get system status snapshot (Phase 7)
   * Returns current metrics and state of the MarketDataHub
   *
   * @returns Snapshot of hub status and metrics
   */
  getSystemStatusSnapshot() {
    return {
      systemStartTs: this.systemStartTs,
      lastGlobalTickTs: this.lastGlobalTickTs ?? null,
      lastGlobalBarCloseTs: this.lastGlobalBarCloseTs ?? null,
      symbols: Array.from(this.symbolRegistry.keys()),
      lastTickTsPerSymbol: Object.fromEntries(this.lastTickTsPerSymbol.entries()),
      lastBarCloseTsPerSymbol: Object.fromEntries(this.lastBarCloseTsPerSymbol.entries()),
    };
  }

  /**
   * Reset MarketDataHub for testing (Phase 9)
   * Clears all state and metrics to allow clean test runs
   *
   * @internal For testing purposes only
   */
  resetForTests(): void {
    // Clear symbol registry
    this.symbolRegistry.clear();

    // Reset metrics
    this.systemStartTs = Date.now();
    this.lastGlobalTickTs = null;
    this.lastGlobalBarCloseTs = null;
    this.lastTickTsPerSymbol.clear();
    this.lastBarCloseTsPerSymbol.clear();

    // Remove all event listeners
    this.removeAllListeners();

    console.log(`[MarketDataHub] Reset for tests`);
  }

  /**
   * Check if a symbol is registered
   *
   * @param symbol Stock symbol
   * @returns true if symbol is registered
   */
  hasSymbol(symbol: string): boolean {
    const symbolKey = symbol.toUpperCase();
    return this.symbolRegistry.has(symbolKey);
  }

  /**
   * Remove a symbol from the registry
   * Use with caution - typically symbols should persist
   *
   * @param symbol Stock symbol to remove
   */
  removeSymbol(symbol: string): void {
    const symbolKey = symbol.toUpperCase();
    if (this.symbolRegistry.has(symbolKey)) {
      // Remove all listeners for this symbol
      this.removeAllListeners(`tick:${symbolKey}`);
      this.symbolRegistry.delete(symbolKey);
      console.log(`[MarketDataHub] Removed symbol: ${symbolKey}`);
    }
  }

  /**
   * Get the total number of registered symbols
   *
   * @returns Number of symbols
   */
  getSymbolCount(): number {
    return this.symbolRegistry.size;
  }

  /**
   * Clear all symbols (use with caution - typically for testing only)
   */
  clearAll(): void {
    // Remove all listeners
    this.removeAllListeners();
    this.symbolRegistry.clear();
    console.log(`[MarketDataHub] Cleared all symbols and listeners`);
  }

  /**
   * Get intraday bars for a symbol and timeframe
   *
   * @param symbol Stock symbol
   * @param timeframe Bar timeframe (1s, 5s, 1m)
   * @returns Array of intraday bars for the current trading day
   */
  getBars(symbol: string, timeframe: Timeframe): IntradayBar[] {
    const symbolKey = symbol.toUpperCase();
    const state = this.symbolRegistry.get(symbolKey);
    if (!state) {
      return [];
    }
    return state.intradayBars[timeframe] ?? [];
  }

  /**
   * Subscribe to bar close events
   *
   * @param symbol Stock symbol (null = all symbols)
   * @param timeframe Bar timeframe (null = all timeframes)
   * @param handler Callback function that receives the closed bar
   * @returns Unsubscribe function
   */
  onBarClose(
    symbol: string | null,
    timeframe: Timeframe | null,
    handler: (bar: IntradayBar) => void
  ): () => void {
    if (symbol === null && timeframe === null) {
      // Subscribe to all bar close events
      this.on("barClose", handler);
      return () => {
        this.off("barClose", handler);
      };
    } else if (symbol === null) {
      // Subscribe to all symbols for specific timeframe
      const eventName = `barClose:*:${timeframe}`;
      this.on(eventName, handler);
      return () => {
        this.off(eventName, handler);
      };
    } else if (timeframe === null) {
      // Subscribe to all timeframes for specific symbol
      const symbolKey = symbol.toUpperCase();
      const eventName = `barClose:${symbolKey}:*`;
      this.on(eventName, handler);
      return () => {
        this.off(eventName, handler);
      };
    } else {
      // Subscribe to specific symbol and timeframe
      const symbolKey = symbol.toUpperCase();
      const eventName = `barClose:${symbolKey}:${timeframe}`;
      this.on(eventName, handler);
      return () => {
        this.off(eventName, handler);
      };
    }
  }

  // ============================================================================
  // Private Methods - Bar Building Logic
  // ============================================================================

  /**
   * Load a historical bar into MarketDataHub without emitting events
   * Used for backfilling bars from Convex on server startup
   *
   * @param bar Historical intraday bar to load
   */
  public loadHistoricalBar(bar: IntradayBar): void {
    const symbolKey = bar.symbol.toUpperCase();
    const state = this.ensureSymbol(symbolKey);

    // Ensure trading day is set correctly for this symbol
    const tradingDay = this.getTradingDayForTs(bar.startTs);
    if (!state.currentTradingDay) {
      state.currentTradingDay = tradingDay;
    }

    // Only load bars for the current trading day
    // If this bar is for a different day, skip it
    if (state.currentTradingDay !== tradingDay) {
      console.warn(
        `[MarketDataHub] Skipping historical bar for ${symbolKey} - trading day mismatch: ` +
          `bar day=${tradingDay}, current=${state.currentTradingDay}`
      );
      return;
    }

    // Ensure the timeframe array exists
    if (!state.intradayBars[bar.timeframe]) {
      state.intradayBars[bar.timeframe] = [];
    }

    // Check if bar already exists (avoid duplicates)
    const existingBar = state.intradayBars[bar.timeframe].find(
      (b) => b.startTs === bar.startTs && b.endTs === bar.endTs
    );

    if (existingBar) {
      // Bar already loaded, skip
      return;
    }

    // Add bar to the array
    state.intradayBars[bar.timeframe].push(bar);

    // Sort bars by startTs to ensure chronological order
    state.intradayBars[bar.timeframe].sort((a, b) => a.startTs - b.startTs);

    // Do NOT:
    // - emit bar-close events
    // - touch currentBars[] (these will be built from live ticks)
    // - recalculate anything
  }

  /**
   * Get trading day string for a timestamp (public method for external use)
   * Uses New York timezone (EST/EDT) for trading day calculation
   *
   * @param ts Unix timestamp in milliseconds
   * @returns Trading day string in format "YYYY-MM-DD"
   */
  public getTradingDayForTs(ts: number): string {
    return this.getTradingDayForTsInternal(ts);
  }

  /**
   * Get trading day string for a timestamp
   * Uses New York timezone (EST/EDT) for trading day calculation
   *
   * @param ts Unix timestamp in milliseconds
   * @returns Trading day string in format "YYYY-MM-DD"
   */
  private getTradingDayForTsInternal(ts: number): string {
    // Convert to New York time (EST/EDT)
    // US stock market trading day is based on Eastern Time
    const date = new Date(ts);
    const nyDate = new Date(date.toLocaleString("en-US", { timeZone: "America/New_York" }));

    const year = nyDate.getFullYear();
    const month = String(nyDate.getMonth() + 1).padStart(2, "0");
    const day = String(nyDate.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  /**
   * Calculate the start timestamp of a bar bucket for a given timeframe
   *
   * @param ts Unix timestamp in milliseconds
   * @param timeframe Bar timeframe
   * @returns Start timestamp of the bar bucket (inclusive)
   */
  private getBarBucketStart(ts: number, timeframe: Timeframe): number {
    switch (timeframe) {
      case "1s":
        // Round down to nearest second
        return Math.floor(ts / 1000) * 1000;
      case "5s":
        // Round down to nearest 5 seconds
        return Math.floor(ts / (5 * 1000)) * (5 * 1000);
      case "1m":
        // Round down to nearest minute
        return Math.floor(ts / (60 * 1000)) * (60 * 1000);
      default:
        return ts;
    }
  }

  /**
   * Calculate the end timestamp of a bar bucket (exclusive)
   *
   * @param bucketStart Start timestamp of the bar bucket
   * @param timeframe Bar timeframe
   * @returns End timestamp of the bar bucket (exclusive)
   */
  private getBarBucketEnd(bucketStart: number, timeframe: Timeframe): number {
    switch (timeframe) {
      case "1s":
        return bucketStart + 1000;
      case "5s":
        return bucketStart + 5 * 1000;
      case "1m":
        return bucketStart + 60 * 1000;
      default:
        return bucketStart + 1000;
    }
  }

  /**
   * Core bar building logic - converts ticks into OHLCV bars
   *
   * @param tick Market tick data
   */
  private updateBarsFromTick(tick: MarketTick): void {
    const symbolKey = tick.symbol.toUpperCase();
    const state = this.ensureSymbol(symbolKey);

    // Get trading day for this tick
    const tradingDay = this.getTradingDayForTsInternal(tick.ts);

    // Check if we need to reset bars for a new trading day
    if (!state.currentTradingDay || state.currentTradingDay !== tradingDay) {
      // New trading day detected - clear all bars
      const previousDay = state.currentTradingDay;
      console.log(
        `[MarketDataHub] New trading day detected for ${symbolKey}: ${tradingDay} (was: ${previousDay || "none"})`
      );

      // Clear all intraday bars
      state.intradayBars["1s"] = [];
      state.intradayBars["5s"] = [];
      state.intradayBars["1m"] = [];

      // Clear all current bars
      state.currentBars["1s"] = undefined;
      state.currentBars["5s"] = undefined;
      state.currentBars["1m"] = undefined;

      // Update trading day
      state.currentTradingDay = tradingDay;

      // Trigger cleanup of old bars in Convex (fire-and-forget, non-blocking)
      // Only trigger once per new day - this will keep only the last 3 days
      if (previousDay) {
        // Import cleanup function dynamically to avoid circular dependencies
        import("./persistence")
          .then((module) => {
            module.cleanupOldIntradayBars().catch((err) => {
              console.error(`[MarketDataHub] Failed to trigger cleanup:`, err);
            });
          })
          .catch((err) => {
            console.error(`[MarketDataHub] Failed to import persistence module:`, err);
          });
      }
    }

    // Process each timeframe
    const timeframes: Timeframe[] = ["1s", "5s", "1m"];

    for (const timeframe of timeframes) {
      const bucketStart = this.getBarBucketStart(tick.ts, timeframe);
      const bucketEnd = this.getBarBucketEnd(bucketStart, timeframe);

      let currentBar = state.currentBars[timeframe];

      // Check if tick is outside the current bar interval
      if (!currentBar || tick.ts < currentBar.startTs || tick.ts >= currentBar.endTs) {
        // Close existing bar if it exists
        if (currentBar) {
          // Push closed bar to intradayBars
          state.intradayBars[timeframe].push(currentBar);

          // Emit bar close event
          this.emitBarClose(currentBar);
        }

        // Create new bar
        currentBar = {
          symbol: symbolKey,
          timeframe,
          startTs: bucketStart,
          endTs: bucketEnd,
          open: tick.price,
          high: tick.price,
          low: tick.price,
          close: tick.price,
          volume: tick.size || 0,
        };

        state.currentBars[timeframe] = currentBar;
      } else {
        // Update existing bar with tick data
        currentBar.high = Math.max(currentBar.high, tick.price);
        currentBar.low = Math.min(currentBar.low, tick.price);
        currentBar.close = tick.price;
        currentBar.volume += tick.size || 0;
      }
    }
  }

  /**
   * Emit bar close event for a completed bar
   *
   * @param bar Completed intraday bar
   */
  private emitBarClose(bar: IntradayBar): void {
    // Phase 7: Update metrics
    this.lastGlobalBarCloseTs = bar.endTs;
    this.lastBarCloseTsPerSymbol.set(bar.symbol, bar.endTs);

    // Emit specific event: "barClose:SYMBOL:TIMEFRAME"
    const specificEvent = `barClose:${bar.symbol}:${bar.timeframe}`;
    this.emit(specificEvent, bar);

    // Emit wildcard events for subscribers that listen to all symbols or all timeframes
    this.emit(`barClose:${bar.symbol}:*`, bar);
    this.emit(`barClose:*:${bar.timeframe}`, bar);

    // Emit generic bar close event
    this.emit("barClose", bar);
  }
}

/**
 * Get the singleton MarketDataHub instance
 *
 * @returns The MarketDataHub singleton
 */
export function getMarketDataHub(): MarketDataHub {
  return MarketDataHub.getInstance();
}

/**
 * Export the singleton instance directly as a default export
 * This allows: import { MarketDataHub, getMarketDataHub } from "..."
 * Usage: const hub = getMarketDataHub(); or const hub = MarketDataHub.getInstance();
 */
