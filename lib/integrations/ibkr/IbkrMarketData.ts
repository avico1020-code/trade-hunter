/**
 * IBKR Gateway Streaming Market Data - Phase 2
 *
 * Symbol subscription manager that forwards real-time ticks to MarketDataHub
 * - Manages subscriptions per symbol (only one subscription per symbol)
 * - Forwards all tick events to MarketDataHub
 * - Handles re-subscription after reconnects
 * - No snapshots, no polling, streaming only
 */

import type { Tick } from "@/lib/server/market-data";
import { getMarketDataHub } from "@/lib/server/market-data";
import type { IbkrConnection } from "./IbkrConnection";

interface Subscription {
  symbol: string;
  tickerId: number;
  contract: {
    symbol: string;
    secType: string;
    exchange: string;
    currency: string;
  };
}

export class IbkrMarketData {
  private connection: IbkrConnection;
  private subscriptions: Map<string, Subscription> = new Map(); // keyed by symbol (uppercase)
  private nextTickerId: number = 1000; // Start from 1000 to avoid conflicts
  private hub = getMarketDataHub();
  private reconnectHandler: (() => void) | null = null;

  constructor(connection: IbkrConnection) {
    this.connection = connection;
    this.setupReconnectionHandling();
  }

  /**
   * Subscribe to streaming market data for a symbol
   * Only creates subscription if symbol is not already subscribed
   *
   * @param symbol Stock symbol (e.g., "AAPL", "MSFT")
   * @returns Promise that resolves when subscription is active
   */
  async subscribeSymbol(symbol: string): Promise<void> {
    const symbolKey = symbol.toUpperCase();

    // Check if already subscribed
    if (this.subscriptions.has(symbolKey)) {
      console.log(`[IbkrMarketData] Symbol ${symbolKey} is already subscribed`);
      return;
    }

    // Ensure connection
    if (!this.connection.isConnected()) {
      await this.connection.connect();
    }

    const client = this.connection.getClient();

    // Allocate ticker ID
    const tickerId = this.nextTickerId++;
    if (this.nextTickerId > 32767) {
      this.nextTickerId = 1000; // Wrap around
    }

    // Create contract for US stock
    const contract = {
      symbol: symbolKey,
      secType: "STK",
      exchange: "SMART", // SMART routing for best execution
      currency: "USD",
    };

    // Store subscription
    const subscription: Subscription = {
      symbol: symbolKey,
      tickerId,
      contract,
    };
    this.subscriptions.set(symbolKey, subscription);

    // Mark for resubscription
    this.connection.markSymbolSubscribed(symbolKey);

    // Set up tick handlers for this symbol
    this.setupTickHandlers(tickerId, symbolKey, client);

    // Request streaming market data (NOT snapshot)
    try {
      console.log(
        `[IbkrMarketData] Subscribing to streaming data for ${symbolKey} (tickerId: ${tickerId})`
      );

      // reqMktData(tickerId, contract, genericTickList, snapshot, regulatorySnapshot, mktDataOptions)
      // snapshot = false → streaming mode
      (client as any).reqMktData(tickerId, contract, "", false, false, null);
    } catch (error) {
      // Remove subscription on error
      this.subscriptions.delete(symbolKey);
      this.connection.unmarkSymbolSubscribed(symbolKey);

      const err = error instanceof Error ? error : new Error(String(error));
      throw new Error(`Failed to subscribe to ${symbolKey}: ${err.message}`);
    }
  }

  /**
   * Unsubscribe from market data for a symbol
   *
   * @param symbol Stock symbol
   */
  unsubscribeSymbol(symbol: string): void {
    const symbolKey = symbol.toUpperCase();
    const subscription = this.subscriptions.get(symbolKey);

    if (!subscription) {
      console.warn(`[IbkrMarketData] Symbol ${symbolKey} is not subscribed`);
      return;
    }

    // Cancel subscription if connected
    if (this.connection.isConnected()) {
      try {
        const client = this.connection.getClient();
        console.log(
          `[IbkrMarketData] Cancelling subscription for ${symbolKey} (tickerId: ${subscription.tickerId})`
        );
        (client as any).cancelMktData(subscription.tickerId);
      } catch (error) {
        console.error(`[IbkrMarketData] Error cancelling subscription for ${symbolKey}:`, error);
      }
    }

    // Remove from registry
    this.subscriptions.delete(symbolKey);
    this.connection.unmarkSymbolSubscribed(symbolKey);
    console.log(`[IbkrMarketData] Unsubscribed from ${symbolKey}`);
  }

  /**
   * Get list of subscribed symbols
   */
  getSubscribedSymbols(): string[] {
    return Array.from(this.subscriptions.keys());
  }

  /**
   * Check if a symbol is subscribed
   */
  isSubscribed(symbol: string): boolean {
    return this.subscriptions.has(symbol.toUpperCase());
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private setupTickHandlers(tickerId: number, symbol: string, client: any): void {
    // tickPrice event
    client.on("tickPrice", (reqId: number, field: number, price: number) => {
      if (reqId !== tickerId) return;

      // Build tick data
      const tick: Tick = {
        symbol,
        timestamp: Date.now(),
        price: price,
        [`field_${field}`]: price,
      };

      // Common field IDs: 1=bid, 2=ask, 4=last, 6=high, 7=low, 9=close, 14=open
      switch (field) {
        case 1: // BID
          tick.bid = price;
          break;
        case 2: // ASK
          tick.ask = price;
          break;
        case 4: // LAST
          tick.last = price;
          tick.price = price; // Use last as primary price
          break;
        case 6: // HIGH
          tick.high = price;
          break;
        case 7: // LOW
          tick.low = price;
          break;
        case 9: // CLOSE
          tick.close = price;
          break;
        case 14: // OPEN
          tick.open = price;
          break;
      }

      // Forward to MarketDataHub
      this.hub.setLastTick(symbol, tick);
    });

    // tickSize event
    client.on("tickSize", (reqId: number, field: number, size: number) => {
      if (reqId !== tickerId) return;

      // Get current tick or create new one
      const currentTick = this.hub.getLastTick(symbol);
      const tick: Tick = currentTick
        ? { ...currentTick, timestamp: Date.now() }
        : {
            symbol,
            timestamp: Date.now(),
          };

      // Common field IDs for size: 0=bidSize, 3=askSize, 5=lastSize, 8=volume
      switch (field) {
        case 0: // BID_SIZE
          tick.bidSize = size;
          break;
        case 3: // ASK_SIZE
          tick.askSize = size;
          break;
        case 5: // LAST_SIZE
          tick.lastSize = size;
          break;
        case 8: // VOLUME
          tick.volume = size;
          break;
      }

      // Forward to MarketDataHub
      this.hub.setLastTick(symbol, tick);
    });

    // tickString event
    client.on("tickString", (reqId: number, field: number, value: string) => {
      if (reqId !== tickerId) return;

      // Get current tick or create new one
      const currentTick = this.hub.getLastTick(symbol);
      const tick: Tick = currentTick
        ? { ...currentTick, timestamp: Date.now() }
        : {
            symbol,
            timestamp: Date.now(),
          };

      // Field 7308 = Volume (as string)
      if (field === 7308) {
        const volume = parseFloat(value);
        if (!isNaN(volume)) {
          tick.volume = volume;
        }
      }

      // Store as string field
      tick[`field_${field}`] = value;

      // Forward to MarketDataHub
      this.hub.setLastTick(symbol, tick);
    });

    // tickGeneric event
    client.on("tickGeneric", (reqId: number, field: number, value: number) => {
      if (reqId !== tickerId) return;

      // Get current tick or create new one
      const currentTick = this.hub.getLastTick(symbol);
      const tick: Tick = currentTick
        ? { ...currentTick, timestamp: Date.now() }
        : {
            symbol,
            timestamp: Date.now(),
          };

      // Store generic field
      tick[`field_${field}`] = value;

      // Forward to MarketDataHub
      this.hub.setLastTick(symbol, tick);
    });

    // tickByTickAllLast event (if available)
    client.on(
      "tickByTickAllLast",
      (reqId: number, tickType: number, time: number, price: number, size: number) => {
        if (reqId !== tickerId) return;

        const currentTick = this.hub.getLastTick(symbol);
        const tick: Tick = currentTick
          ? { ...currentTick, timestamp: Date.now() }
          : {
              symbol,
              timestamp: Date.now(),
            };

        tick.last = price;
        tick.price = price;
        tick.lastSize = size;
        tick.lastTime = time;

        // Forward to MarketDataHub
        this.hub.setLastTick(symbol, tick);
      }
    );
  }

  private setupReconnectionHandling(): void {
    // Listen for connection state changes
    this.reconnectHandler = () => {
      const status = this.connection.getStatus();
      if (status.state === "CONNECTED") {
        // Re-subscribe to all previously subscribed symbols
        this.resubscribeAll();
      }
    };

    this.connection.onStateChange((status) => {
      if (status.state === "CONNECTED" && this.reconnectHandler) {
        this.reconnectHandler();
      }
    });
  }

  private async resubscribeAll(): Promise<void> {
    const symbols = this.connection.getSubscribedSymbols();

    if (symbols.length === 0) {
      return;
    }

    console.log(
      `[IbkrMarketData] Re-subscribing to ${symbols.length} symbols after reconnection...`
    );

    // Clear current subscriptions (they're invalid after reconnect)
    this.subscriptions.clear();

    // Re-subscribe to each symbol
    for (const symbol of symbols) {
      try {
        await this.subscribeSymbol(symbol);
        console.log(`[IbkrMarketData] Re-subscribed to ${symbol}`);
      } catch (error) {
        console.error(`[IbkrMarketData] Failed to re-subscribe to ${symbol}:`, error);
        this.connection.unmarkSymbolSubscribed(symbol);
      }
    }
  }
}
