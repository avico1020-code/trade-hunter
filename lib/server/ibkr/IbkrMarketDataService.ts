/**
 * IBKR Integration Layer - Market Data Service
 *
 * REAL-TIME STREAMING market data ONLY - NO SNAPSHOTS SUPPORTED
 *
 * This service ONLY supports streaming mode (snapshot=false in reqMktData).
 * Snapshot mode is explicitly NOT supported and will never be used.
 *
 * Features:
 * - Maintains subscription registry with refCount
 * - Reuses subscriptions for multiple consumers
 * - Uses reqMktData with snapshot=false (ALWAYS streaming)
 * - Never uses snapshot requests - streaming only!
 */

import { getMarketDataHub } from "@/lib/server/market-data";
import { getIbkrEventBus } from "./events";
import { getIbkrConnectionManager } from "./IbkrConnectionManager";
import { getIbkrContractsService } from "./IbkrContractsService";
import type {
  IbkrContract,
  MarketDataOptions,
  MarketDataRegistry,
  MarketDataSubscription,
  MarketTick,
  MarketTickCallback,
  UnsubscribeFn,
} from "./types";

export class IbkrMarketDataService {
  private static instance: IbkrMarketDataService | null = null;
  private registry: MarketDataRegistry = new Map();
  private nextTickerId: number = 1000; // Start from 1000 to avoid conflicts
  private eventBus = getIbkrEventBus();
  private hub = getMarketDataHub();

  private constructor() {
    // Subscribe to connection state changes to handle reconnections
    this.eventBus.onConnectionStateChange((status) => {
      if (status.state === "CONNECTED") {
        // Re-subscribe to all active subscriptions after reconnection
        this.resubscribeAll();
      }
    });

    // CRITICAL: Bridge IBKR streaming ticks to MarketDataHub
    // This is the missing link that prevents real-time streaming from working!
    // Listen to all market tick events and forward them to MarketDataHub
    this.eventBus.onMarketTick((symbol, tick) => {
      // Convert IbkrMarketDataService's MarketTick to MarketDataHub's MarketTick format
      // MarketDataHub expects: { symbol, price, size?, ts }
      // IbkrMarketDataService provides: { symbol, last, bid, ask, close, volume, lastSize, timestamp, ... }

      // Use last price if available, otherwise fallback to bid/ask midpoint, then close
      const price =
        tick.last ?? (tick.bid && tick.ask ? (tick.bid + tick.ask) / 2 : null) ?? tick.close ?? 0;

      // Use lastSize if available, otherwise volume
      const size = tick.lastSize ?? tick.volume ?? 0;

      // Only forward if we have a valid price
      if (price > 0) {
        const hubTick = {
          symbol: tick.symbol,
          price,
          size,
          ts: tick.timestamp ?? Date.now(),
        };

        // Forward to MarketDataHub for bar building and real-time updates
        console.log(
          `[IbkrMarketDataService] 🔄 Forwarding tick to MarketDataHub: ${symbol} = $${price.toFixed(2)}`
        );
        this.hub.handleTick(hubTick);
      } else {
        console.warn(
          `[IbkrMarketDataService] ⚠️ Received tick for ${symbol} with invalid price (last=${tick.last}, bid=${tick.bid}, ask=${tick.ask}, close=${tick.close})`
        );
      }
    });

    console.log("[IbkrMarketDataService] ✅ Bridge initialized: IBKR streaming → MarketDataHub");
  }

  static getInstance(): IbkrMarketDataService {
    if (!IbkrMarketDataService.instance) {
      IbkrMarketDataService.instance = new IbkrMarketDataService();
    }
    return IbkrMarketDataService.instance;
  }

  /**
   * Subscribe to streaming market data for a symbol
   * ALWAYS uses reqMktData in STREAMING mode (snapshot=false)
   * Snapshot mode is NOT supported - only real-time streaming is available
   *
   * @param symbol Stock symbol
   * @param options Optional market data options (NOTE: snapshot option is ignored - always streaming)
   * @returns Promise that resolves when subscription is active and first tick received
   */
  async subscribeMarketData(symbol: string, options?: MarketDataOptions): Promise<void> {
    const symbolKey = symbol.toUpperCase();

    // Check if subscription already exists
    let subscription = this.registry.get(symbolKey);

    if (subscription) {
      // Increment refCount and return immediately
      subscription.refCount++;
      console.log(
        `[Market Data] Symbol ${symbolKey} already subscribed (refCount: ${subscription.refCount})`
      );
      return Promise.resolve();
    }

    // Need to create new subscription
    // First, resolve contract
    const contractsService = getIbkrContractsService();
    let contract: IbkrContract;

    try {
      contract = await contractsService.resolveStockContract(symbol);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      throw new Error(`Failed to resolve contract for ${symbol}: ${err.message}`);
    }

    // Ensure connection
    const connectionManager = getIbkrConnectionManager();
    await connectionManager.ensureConnected();
    const client = connectionManager.getClient();

    // Allocate ticker ID
    const tickerId = this.nextTickerId++;
    if (this.nextTickerId > 32767) {
      this.nextTickerId = 1000; // Wrap around
    }

    // Create subscription entry
    subscription = {
      symbol: symbolKey,
      contract,
      tickerId,
      lastTick: null,
      lastUpdateTime: null,
      refCount: 1,
    };

    this.registry.set(symbolKey, subscription);

    // Set up tick handlers
    this.setupTickHandlers(tickerId, symbolKey, client);

    // Subscribe to streaming data
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Market data subscription timeout for ${symbolKey} after 15 seconds`));
      }, 15000);

      let firstTickReceived = false;

      // Wait for first tick to confirm subscription is active
      const firstTickHandler = (sym: string, tick: MarketTick) => {
        if (sym === symbolKey && !firstTickReceived) {
          firstTickReceived = true;
          clearTimeout(timeout);

          console.log(`[Market Data] ✅ Subscription active for ${symbolKey}, first tick received`);

          // Remove the first-tick handler after first tick
          const unsubscribe = this.eventBus.onMarketTick(firstTickHandler);
          unsubscribe();

          resolve();
        }
      };

      // Listen for first tick
      const unsubscribeFirstTick = this.eventBus.onMarketTick(firstTickHandler);

      // Listen for IBKR errors specific to this subscription
      const errorHandler = (err: Error, code: number, reqId: number) => {
        console.log(
          `[Market Data] 🔴 IBKR ERROR received: code=${code}, reqId=${reqId}, message=${err.message}`
        );

        // Check if this error is for our ticker
        if (reqId === tickerId) {
          console.error(
            `[Market Data] ❌ Error for ${symbolKey} (tickerId=${tickerId}): ${err.message} (code: ${code})`
          );

          // Common error codes:
          // 10090 - Part of requested market data is not subscribed
          // 10091 - Market data is not supported for this contract
          // 10168 - Requested market data is not subscribed. Displaying delayed data
          // 354 - Requested market data is not subscribed

          if (code === 10090 || code === 10091 || code === 354 || code === 10168) {
            console.warn(
              `[Market Data] ⚠️ Market data subscription issue for ${symbolKey}: ${err.message}`
            );
            console.warn(
              `[Market Data] ⚠️ This usually means you need to subscribe to real-time market data in IBKR`
            );
          }
        }
      };

      // Register error handler on client
      (client as any).on("error", errorHandler);

      try {
        // Build generic tick list
        const genericTickList = options?.genericTickList || "";

        // Request STREAMING market data (ALWAYS streaming, NO snapshots)
        // CRITICAL: snapshot=false means STREAMING (real-time updates)
        // We ALWAYS use streaming mode - snapshot mode is not supported
        const SNAPSHOT_MODE = false; // ALWAYS false - streaming only!

        console.log(
          `[Market Data] 🔴 STREAMING subscription for ${symbolKey} (tickerId: ${tickerId})`
        );
        console.log(
          `[Market Data]   Contract: ${contract.symbol} (${contract.secType}) on ${contract.exchange || "SMART"}`
        );
        console.log(`[Market Data]   Contract ID: ${contract.conId || "N/A"}`);
        console.log(
          `[Market Data]   Generic tick list: "${genericTickList || "(empty - default)"}"`
        );
        console.log(`[Market Data]   Mode: STREAMING ONLY (snapshot=false)`);

        try {
          const contractForRequest = {
            conId: contract.conId,
            symbol: contract.symbol,
            secType: contract.secType,
            exchange: contract.exchange || "SMART",
            currency: contract.currency || "USD",
            primaryExchange: contract.primaryExchange,
          };

          console.log(`[Market Data] 📤 Sending reqMktData to IBKR:`);
          console.log(`[Market Data]   tickerId: ${tickerId}`);
          console.log(`[Market Data]   contract: ${JSON.stringify(contractForRequest)}`);
          console.log(`[Market Data]   genericTickList: "${genericTickList || ""}"`);
          console.log(`[Market Data]   snapshot: ${SNAPSHOT_MODE} (false=STREAMING)`);

          (client as any).reqMktData(
            tickerId,
            contractForRequest,
            genericTickList || "", // Empty string = default tick types
            SNAPSHOT_MODE, // ALWAYS false = STREAMING (real-time)
            options?.regulatorySnapshot || false
          );

          console.log(
            `[Market Data] ✅ reqMktData STREAMING call completed for ${symbolKey} - waiting for real-time ticks...`
          );
          console.log(`[Market Data] ⏳ If no ticks arrive within 15 seconds, check:`);
          console.log(`[Market Data]   1. IBKR market data subscription is active`);
          console.log(`[Market Data]   2. Market is open (9:30 AM - 4:00 PM ET)`);
          console.log(`[Market Data]   3. Contract is correct`);
        } catch (reqError) {
          console.error(`[Market Data] ❌ reqMktData STREAMING failed for ${symbolKey}:`, reqError);
          throw reqError;
        }
      } catch (error) {
        clearTimeout(timeout);
        this.registry.delete(symbolKey);
        unsubscribeFirstTick();

        const err = error instanceof Error ? error : new Error(String(error));
        reject(new Error(`Failed to subscribe to market data for ${symbolKey}: ${err.message}`));
      }
    });
  }

  /**
   * Unsubscribe from market data for a symbol
   * Only cancels subscription when refCount reaches 0
   */
  async unsubscribeMarketData(symbol: string): Promise<void> {
    const symbolKey = symbol.toUpperCase();
    const subscription = this.registry.get(symbolKey);

    if (!subscription) {
      console.warn(`[Market Data] No subscription found for ${symbolKey}`);
      return;
    }

    subscription.refCount--;

    if (subscription.refCount <= 0) {
      // Cancel subscription
      try {
        const connectionManager = getIbkrConnectionManager();
        if (connectionManager.isConnected()) {
          const client = connectionManager.getClient();
          console.log(
            `[Market Data] Cancelling subscription for ${symbolKey} (tickerId: ${subscription.tickerId})`
          );
          (client as any).cancelMktData(subscription.tickerId);
        }
      } catch (error) {
        console.error(`[Market Data] Error cancelling subscription for ${symbolKey}:`, error);
      }

      this.registry.delete(symbolKey);
      console.log(`[Market Data] Unsubscribed from ${symbolKey}`);
    } else {
      console.log(
        `[Market Data] Decremented refCount for ${symbolKey} (refCount: ${subscription.refCount})`
      );
    }
  }

  /**
   * Get the latest tick for a symbol
   * @returns Latest tick or null if not subscribed
   */
  getLatestTick(symbol: string): MarketTick | null {
    const symbolKey = symbol.toUpperCase();
    const subscription = this.registry.get(symbolKey);
    return subscription?.lastTick || null;
  }

  /**
   * Subscribe to market tick events
   * @param callback Function to call when ticks are received
   * @returns Unsubscribe function
   */
  onMarketTick(callback: MarketTickCallback): UnsubscribeFn {
    return this.eventBus.onMarketTick(callback);
  }

  /**
   * Get all active subscriptions
   */
  getActiveSubscriptions(): string[] {
    return Array.from(this.registry.keys());
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private setupTickHandlers(tickerId: number, symbolKey: string, client: any): void {
    // CRITICAL: @stoqey/ib package uses string event names like "tickPrice", "tickSize", "tickString"
    // These are the standard IBKR API event names that work with both TWS and IB Gateway
    // The event names are case-sensitive and must match exactly what the package emits

    // Use string event names directly (this is what @stoqey/ib uses)
    const EVENT_TICK_PRICE = "tickPrice";
    const EVENT_TICK_SIZE = "tickSize";
    const EVENT_TICK_STRING = "tickString";

    // Handle tickPrice updates
    const tickPriceHandler = (reqId: number, field: number, price: number) => {
      if (reqId !== tickerId) return;

      const subscription = this.registry.get(symbolKey);
      if (!subscription) return;

      // Initialize tick if needed
      if (!subscription.lastTick) {
        subscription.lastTick = {
          symbol: symbolKey,
          bid: null,
          ask: null,
          last: null,
          close: null,
          bidSize: null,
          askSize: null,
          lastSize: null,
          volume: null,
          high: null,
          low: null,
          open: null,
          timestamp: Date.now(),
        };
      }

      // Update tick based on field ID
      // Common field IDs:
      // 1 = bid, 2 = ask, 4 = last, 6 = high, 7 = low, 9 = close, 14 = open
      switch (field) {
        case 1: // BID
          subscription.lastTick.bid = price;
          break;
        case 2: // ASK
          subscription.lastTick.ask = price;
          break;
        case 4: // LAST
          subscription.lastTick.last = price;
          console.log(
            `[Market Data] 🔴 REAL-TIME TICK PRICE for ${symbolKey}: LAST=${price} (tickerId=${tickerId}, field=4)`
          );
          break;
        case 6: // HIGH
          subscription.lastTick.high = price;
          break;
        case 7: // LOW
          subscription.lastTick.low = price;
          break;
        case 9: // CLOSE
          subscription.lastTick.close = price;
          break;
        case 14: // OPEN
          subscription.lastTick.open = price;
          break;
      }

      subscription.lastTick.timestamp = Date.now();
      subscription.lastUpdateTime = Date.now();

      // Emit tick event
      this.eventBus.emitMarketTick(symbolKey, subscription.lastTick);
    };

    // Handle tickSize updates
    const tickSizeHandler = (reqId: number, field: number, size: number) => {
      if (reqId !== tickerId) return;

      const subscription = this.registry.get(symbolKey);
      if (!subscription || !subscription.lastTick) return;

      // Common field IDs for size:
      // 0 = bidSize, 3 = askSize, 5 = lastSize, 8 = volume
      switch (field) {
        case 0: // BID_SIZE
          subscription.lastTick.bidSize = size;
          break;
        case 3: // ASK_SIZE
          subscription.lastTick.askSize = size;
          break;
        case 5: // LAST_SIZE
          subscription.lastTick.lastSize = size;
          break;
        case 8: // VOLUME
          subscription.lastTick.volume = size;
          break;
      }

      subscription.lastTick.timestamp = Date.now();
      subscription.lastUpdateTime = Date.now();

      // Emit tick event
      this.eventBus.emitMarketTick(symbolKey, subscription.lastTick);
    };

    // Handle tickString updates (for additional data like volume, etc.)
    const tickStringHandler = (reqId: number, field: number, value: string) => {
      if (reqId !== tickerId) return;

      const subscription = this.registry.get(symbolKey);
      if (!subscription || !subscription.lastTick) return;

      // Field 7308 = Volume (as string)
      if (field === 7308) {
        const volume = parseFloat(value);
        if (!isNaN(volume)) {
          subscription.lastTick.volume = volume;
          subscription.lastTick.timestamp = Date.now();
          subscription.lastUpdateTime = Date.now();
          this.eventBus.emitMarketTick(symbolKey, subscription.lastTick);
        }
      }
    };

    // Register handlers - @stoqey/ib uses standard IBKR event names as strings
    // IMPORTANT: These handlers will fire on EVERY tickPrice/tickSize/tickString event
    // We filter by reqId inside the handlers to only process events for our tickerId
    client.on(EVENT_TICK_PRICE, tickPriceHandler);
    client.on(EVENT_TICK_SIZE, tickSizeHandler);
    client.on(EVENT_TICK_STRING, tickStringHandler);

    // Debug: Add a generic listener to see ALL events coming from IBKR
    const debugAllEvents = (eventName: string, ...args: any[]) => {
      if (eventName.startsWith("tick")) {
        console.log(`[Market Data DEBUG] 🔵 RAW EVENT: ${eventName}`, args.slice(0, 3));
      }
    };

    // Listen for all events to debug
    if (!client._debugListenerAdded) {
      client._debugListenerAdded = true;
      const originalEmit = client.emit.bind(client);
      client.emit = (eventName: string, ...args: any[]) => {
        if (eventName.startsWith("tick")) {
          console.log(
            `[Market Data DEBUG] 🔵 EMIT: ${eventName}`,
            JSON.stringify(args.slice(0, 3))
          );
        }
        return originalEmit(eventName, ...args);
      };
      console.log(`[Market Data DEBUG] ✅ Added debug listener to intercept ALL IBKR events`);
    }

    console.log(
      `[Market Data] ✅ Registered real-time streaming handlers for ${symbolKey} (tickerId=${tickerId})`
    );
    console.log(`[Market Data]   - Listening for: tickPrice, tickSize, tickString events`);
    console.log(
      `[Market Data]   - Client event names: ${client.eventNames ? client.eventNames().join(", ") : "N/A"}`
    );
  }

  private async resubscribeAll(): Promise<void> {
    console.log(
      `[Market Data] Re-subscribing to ${this.registry.size} symbols after reconnection...`
    );

    const symbols = Array.from(this.registry.keys());

    for (const symbol of symbols) {
      const subscription = this.registry.get(symbol);
      if (!subscription) continue;

      try {
        // Re-subscribe with same ticker ID if possible, or allocate new one
        // For simplicity, we'll just re-subscribe
        await this.subscribeMarketData(symbol);
        console.log(`[Market Data] Re-subscribed to ${symbol}`);
      } catch (error) {
        console.error(`[Market Data] Failed to re-subscribe to ${symbol}:`, error);
        // Remove failed subscription
        this.registry.delete(symbol);
      }
    }
  }
}

/**
 * Get the singleton market data service instance
 */
export function getIbkrMarketDataService(): IbkrMarketDataService {
  return IbkrMarketDataService.getInstance();
}
