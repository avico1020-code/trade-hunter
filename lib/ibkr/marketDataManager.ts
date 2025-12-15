// Global Market Data Manager - Manages real-time subscriptions

import type { IbkrMarketDataSnapshot } from "@/lib/types/ibkr";
import { getTwsClient } from "./twsClient.simple";

interface Subscription {
  symbol: string;
  reqId: number;
  listeners: Set<(data: IbkrMarketDataSnapshot) => void>;
  lastData?: IbkrMarketDataSnapshot;
}

class MarketDataManager {
  private subscriptions = new Map<string, Subscription>();
  private nextReqId = 1000;
  private client = getTwsClient();
  private isConnecting = false;
  private isConnected = false;

  /**
   * Subscribe to real-time market data for a symbol
   */
  async subscribe(
    symbol: string,
    callback: (data: IbkrMarketDataSnapshot) => void
  ): Promise<() => void> {
    // Check if already subscribed
    let subscription = this.subscriptions.get(symbol);

    if (!subscription) {
      // Create new subscription
      const reqId = this.nextReqId++;
      subscription = {
        symbol,
        reqId,
        listeners: new Set(),
      };
      this.subscriptions.set(symbol, subscription);

      // Connect to IBKR if needed
      if (!this.isConnected && !this.isConnecting) {
        await this.connect();
      }

      // Start streaming for this symbol
      if (this.isConnected) {
        await this.startStreaming(symbol, reqId);
      }
    }

    // Add listener
    subscription.listeners.add(callback);

    // Send last known data immediately
    if (subscription.lastData) {
      callback(subscription.lastData);
    }

    // Return unsubscribe function
    return () => {
      const sub = this.subscriptions.get(symbol);
      if (sub) {
        sub.listeners.delete(callback);

        // If no more listeners, cancel the subscription
        if (sub.listeners.size === 0) {
          this.cancelStreaming(symbol, sub.reqId);
          this.subscriptions.delete(symbol);
        }
      }
    };
  }

  /**
   * Connect to IBKR Gateway
   */
  private async connect(): Promise<void> {
    if (this.isConnected || this.isConnecting) return;

    this.isConnecting = true;
    try {
      await this.client.connect();
      this.isConnected = true;
      console.log("✅ [Market Data Manager] Connected to IBKR");
    } catch (error) {
      console.error("❌ [Market Data Manager] Connection failed:", error);
      this.isConnected = false;
    } finally {
      this.isConnecting = false;
    }
  }

  /**
   * Start streaming market data for a symbol
   */
  private async startStreaming(symbol: string, reqId: number): Promise<void> {
    try {
      // Subscribe to real-time updates using the TWS client
      // This will trigger callbacks for every price update
      await this.client.subscribeMarketData(symbol, reqId, (data: IbkrMarketDataSnapshot) => {
        const subscription = this.subscriptions.get(symbol);
        if (subscription) {
          subscription.lastData = data;

          // Notify all listeners
          subscription.listeners.forEach((callback) => {
            callback(data);
          });
        }
      });

      console.log(`📡 [Market Data Manager] Streaming started for ${symbol}`);
    } catch (error) {
      console.error(`❌ [Market Data Manager] Failed to stream ${symbol}:`, error);
    }
  }

  /**
   * Cancel streaming for a symbol
   */
  private cancelStreaming(symbol: string, reqId: number): void {
    try {
      this.client.cancelMarketData(reqId);
      console.log(`🛑 [Market Data Manager] Streaming stopped for ${symbol}`);
    } catch (error) {
      console.error(`❌ [Market Data Manager] Failed to cancel ${symbol}:`, error);
    }
  }

  /**
   * Get connection status
   */
  isMarketDataConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Get all active subscriptions
   */
  getActiveSubscriptions(): string[] {
    return Array.from(this.subscriptions.keys());
  }
}

// Export singleton instance
export const marketDataManager = new MarketDataManager();
