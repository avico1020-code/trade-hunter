/**
 * IBKR Integration Layer - Market Data Service
 * 
 * Real-time streaming market data ONLY (NO snapshots)
 * - Maintains subscription registry with refCount
 * - Reuses subscriptions for multiple consumers
 * - Uses reqMktData for streaming
 * - Never uses snapshot requests for real-time flow
 */

import { getIbkrConnectionManager } from "./IbkrConnectionManager";
import { getIbkrContractsService } from "./IbkrContractsService";
import { getIbkrEventBus } from "./events";
import type {
  MarketTick,
  MarketDataSubscription,
  MarketDataRegistry,
  MarketDataOptions,
  IbkrContract,
  UnsubscribeFn,
  MarketTickCallback,
} from "./types";

export class IbkrMarketDataService {
  private static instance: IbkrMarketDataService | null = null;
  private registry: MarketDataRegistry = new Map();
  private nextTickerId: number = 1000; // Start from 1000 to avoid conflicts
  private eventBus = getIbkrEventBus();

  private constructor() {
    // Subscribe to connection state changes to handle reconnections
    this.eventBus.onConnectionStateChange((status) => {
      if (status.state === "CONNECTED") {
        // Re-subscribe to all active subscriptions after reconnection
        this.resubscribeAll();
      }
    });
  }

  static getInstance(): IbkrMarketDataService {
    if (!IbkrMarketDataService.instance) {
      IbkrMarketDataService.instance = new IbkrMarketDataService();
    }
    return IbkrMarketDataService.instance;
  }

  /**
   * Subscribe to streaming market data for a symbol
   * Uses reqMktData (streaming) - NEVER uses snapshots
   * 
   * @param symbol Stock symbol
   * @param options Optional market data options
   * @returns Promise that resolves when subscription is active and first tick received
   */
  async subscribeMarketData(
    symbol: string,
    options?: MarketDataOptions
  ): Promise<void> {
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

      try {
        // Build generic tick list
        const genericTickList = options?.genericTickList || "";

        // Request streaming market data (NOT snapshot)
        console.log(`[Market Data] Subscribing to streaming data for ${symbolKey} (tickerId: ${tickerId})`);
        (client as any).reqMktData(
          tickerId,
          {
            conId: contract.conId,
            symbol: contract.symbol,
            secType: contract.secType,
            exchange: contract.exchange,
            currency: contract.currency,
            primaryExchange: contract.primaryExchange,
          },
          genericTickList,
          options?.snapshot || false, // false = streaming (default), true = snapshot (one-time)
          options?.regulatorySnapshot || false
        );
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
          console.log(`[Market Data] Cancelling subscription for ${symbolKey} (tickerId: ${subscription.tickerId})`);
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

  private setupTickHandlers(
    tickerId: number,
    symbolKey: string,
    client: any
  ): void {
    // Handle tickPrice updates
    client.on("tickPrice", (reqId: number, field: number, price: number) => {
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
    });

    // Handle tickSize updates
    client.on("tickSize", (reqId: number, field: number, size: number) => {
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
    });

    // Handle tickString updates (for additional data like volume, etc.)
    client.on("tickString", (reqId: number, field: number, value: string) => {
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
    });
  }

  private async resubscribeAll(): Promise<void> {
    console.log(`[Market Data] Re-subscribing to ${this.registry.size} symbols after reconnection...`);
    
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

