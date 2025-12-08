/**
 * IBKR Integration Layer - Event Bus
 * 
 * Event emitter for streaming data distribution
 */

import { EventEmitter } from "events";
import type {
  MarketTick,
  MarketTickCallback,
  Order,
  OrderUpdateCallback,
  ConnectionStatus,
  ConnectionStateCallback,
  UnsubscribeFn,
} from "./types";

/**
 * Central event bus for IBKR data streams
 * 
 * This allows multiple consumers to subscribe to the same data stream
 * without creating duplicate subscriptions to IBKR
 */
export class IbkrEventBus extends EventEmitter {
  private static instance: IbkrEventBus | null = null;

  static getInstance(): IbkrEventBus {
    if (!IbkrEventBus.instance) {
      IbkrEventBus.instance = new IbkrEventBus();
    }
    return IbkrEventBus.instance;
  }

  // ============================================================================
  // Market Data Events
  // ============================================================================

  /**
   * Subscribe to market tick updates for a symbol
   * @param callback Function to call when a tick is received
   * @returns Unsubscribe function
   */
  onMarketTick(callback: MarketTickCallback): UnsubscribeFn {
    this.on("marketTick", (symbol: string, tick: MarketTick) => {
      callback(symbol, tick);
    });

    return () => {
      this.removeListener("marketTick", callback as (...args: unknown[]) => void);
    };
  }

  /**
   * Emit a market tick event (internal use by services)
   */
  emitMarketTick(symbol: string, tick: MarketTick): void {
    this.emit("marketTick", symbol, tick);
  }

  // ============================================================================
  // Order Events
  // ============================================================================

  /**
   * Subscribe to order updates
   * @param callback Function to call when an order is updated
   * @returns Unsubscribe function
   */
  onOrderUpdate(callback: OrderUpdateCallback): UnsubscribeFn {
    this.on("orderUpdate", (order: Order) => {
      callback(order);
    });

    return () => {
      this.removeListener("orderUpdate", callback as (...args: unknown[]) => void);
    };
  }

  /**
   * Emit an order update event (internal use by services)
   */
  emitOrderUpdate(order: Order): void {
    this.emit("orderUpdate", order);
  }

  // ============================================================================
  // Connection State Events
  // ============================================================================

  /**
   * Subscribe to connection state changes
   * @param callback Function to call when connection state changes
   * @returns Unsubscribe function
   */
  onConnectionStateChange(callback: ConnectionStateCallback): UnsubscribeFn {
    this.on("connectionStateChange", (status: ConnectionStatus) => {
      callback(status);
    });

    return () => {
      this.removeListener("connectionStateChange", callback as (...args: unknown[]) => void);
    };
  }

  /**
   * Emit a connection state change event (internal use by connection manager)
   */
  emitConnectionStateChange(status: ConnectionStatus): void {
    this.emit("connectionStateChange", status);
  }

  // ============================================================================
  // Cleanup
  // ============================================================================

  /**
   * Remove all listeners (use with caution)
   */
  removeAllListeners(): void {
    super.removeAllListeners();
  }
}

/**
 * Get the singleton event bus instance
 */
export function getIbkrEventBus(): IbkrEventBus {
  return IbkrEventBus.getInstance();
}

