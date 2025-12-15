/**
 * IBKR Integration Layer - Orders Service
 *
 * Manages order placement, cancellation, and tracking
 * - Place orders (MKT, LMT, STP, etc.)
 * - Cancel orders
 * - Track order status and executions
 * - Event-based order updates
 */

import { getIbkrEventBus } from "./events";
import { getIbkrConnectionManager } from "./IbkrConnectionManager";
import { getIbkrContractsService } from "./IbkrContractsService";
import type {
  IbkrContract,
  Order,
  OrderSide,
  OrderStatus,
  OrderType,
  OrderUpdateCallback,
  PlacedOrderResult,
  PlaceOrderParams,
  TimeInForce,
  UnsubscribeFn,
} from "./types";

interface IBOrder {
  orderId: number;
  clientId: number;
  permId: number;
  action: string; // "BUY" | "SELL"
  totalQuantity: number;
  orderType: string; // "MKT" | "LMT" | "STP" | etc.
  lmtPrice?: number;
  auxPrice?: number;
  timeInForce: string;
  [key: string]: unknown;
}

interface IBOrderStatus {
  orderId: number;
  status: string;
  filled: number;
  remaining: number;
  avgFillPrice: number;
  permId: number;
  parentId: number;
  lastFillPrice: number;
  clientId: number;
  whyHeld: string;
  [key: string]: unknown;
}

export class IbkrOrdersService {
  private static instance: IbkrOrdersService | null = null;
  private orders: Map<number, Order> = new Map(); // keyed by orderId
  private eventBus = getIbkrEventBus();

  private constructor() {
    this.setupOrderHandlers();
  }

  static getInstance(): IbkrOrdersService {
    if (!IbkrOrdersService.instance) {
      IbkrOrdersService.instance = new IbkrOrdersService();
    }
    return IbkrOrdersService.instance;
  }

  /**
   * Place an order
   * @param params Order parameters
   * @returns Placed order result with orderId and initial status
   */
  async placeOrder(params: PlaceOrderParams): Promise<PlacedOrderResult> {
    const connectionManager = getIbkrConnectionManager();
    await connectionManager.ensureConnected();
    const client = connectionManager.getClient();

    // Resolve contract if not provided
    let contract: IbkrContract;
    if (params.contract) {
      contract = params.contract;
    } else {
      const contractsService = getIbkrContractsService();
      contract = await contractsService.resolveStockContract(params.symbol);
    }

    // Get next valid order ID
    const orderId = connectionManager.getNextValidOrderId();

    // Build IB order object
    const ibOrder: IBOrder = {
      orderId,
      clientId: connectionManager.getStatus().clientId,
      action: params.side,
      totalQuantity: params.quantity,
      orderType: params.orderType,
      timeInForce: params.timeInForce || "DAY",
    };

    // Add order-type specific parameters
    if (
      params.orderType === "LMT" ||
      params.orderType === "STP_LMT" ||
      params.orderType === "TRAIL_LIMIT"
    ) {
      if (params.limitPrice === undefined) {
        throw new Error(`Limit price is required for ${params.orderType} orders`);
      }
      ibOrder.lmtPrice = params.limitPrice;
    }

    if (params.orderType === "STP" || params.orderType === "STP_LMT") {
      if (params.stopPrice === undefined) {
        throw new Error(`Stop price is required for ${params.orderType} orders`);
      }
      ibOrder.auxPrice = params.stopPrice;
    }

    if (params.orderType === "TRAIL" || params.orderType === "TRAIL_LIMIT") {
      if (params.trailAmount !== undefined) {
        ibOrder.trailingPercent = params.trailAmount;
      } else if (params.trailPercent !== undefined) {
        ibOrder.trailingPercent = params.trailPercent;
      }
    }

    // Create order object for tracking
    const order: Order = {
      orderId,
      symbol: params.symbol,
      contract,
      side: params.side,
      quantity: params.quantity,
      filled: 0,
      remaining: params.quantity,
      orderType: params.orderType,
      limitPrice: params.limitPrice,
      stopPrice: params.stopPrice,
      status: "PendingSubmit",
      submitTime: Date.now(),
    };

    // Store order
    this.orders.set(orderId, order);

    try {
      console.log(
        `[Orders Service] Placing order ${orderId}: ${params.side} ${params.quantity} ${params.symbol} @ ${params.orderType}`
      );

      (client as any).placeOrder(
        orderId,
        {
          conId: contract.conId,
          symbol: contract.symbol,
          secType: contract.secType,
          exchange: contract.exchange,
          currency: contract.currency,
          primaryExchange: contract.primaryExchange,
        },
        ibOrder
      );

      // Order is placed, status will be updated via callbacks
      return {
        orderId,
        status: "PendingSubmit",
      };
    } catch (error) {
      // Remove order from tracking if placement failed
      this.orders.delete(orderId);
      const err = error instanceof Error ? error : new Error(String(error));
      throw new Error(`Failed to place order: ${err.message}`);
    }
  }

  /**
   * Cancel an order
   * @param orderId Order ID to cancel
   */
  async cancelOrder(orderId: number): Promise<void> {
    const connectionManager = getIbkrConnectionManager();
    if (!connectionManager.isConnected()) {
      throw new Error("Not connected to IB Gateway");
    }

    const order = this.orders.get(orderId);
    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    const client = connectionManager.getClient();

    try {
      console.log(`[Orders Service] Cancelling order ${orderId}...`);
      (client as any).cancelOrder(orderId);

      // Status will be updated to "Cancelled" via orderStatus callback
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      throw new Error(`Failed to cancel order ${orderId}: ${err.message}`);
    }
  }

  /**
   * Get open orders
   * @returns Array of open orders
   */
  async getOpenOrders(): Promise<Order[]> {
    const connectionManager = getIbkrConnectionManager();
    await connectionManager.ensureConnected();
    const client = connectionManager.getClient();

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Get open orders timeout after 10 seconds"));
      }, 10000);

      const openOrders: Order[] = [];
      let requestCompleted = false;

      const onOpenOrder = (orderId: number, contract: any, order: IBOrder) => {
        if (requestCompleted) return;

        const ibkrContract: IbkrContract = {
          conId: contract.conId,
          symbol: contract.symbol,
          secType: contract.secType,
          exchange: contract.exchange,
          currency: contract.currency,
          primaryExchange: contract.primaryExchange,
          localSymbol: contract.localSymbol,
        };

        const orderStatus = this.orders.get(orderId)?.status || "Submitted";
        const filled = this.orders.get(orderId)?.filled || 0;

        const trackedOrder: Order = {
          orderId,
          symbol: contract.symbol,
          contract: ibkrContract,
          side: order.action as OrderSide,
          quantity: order.totalQuantity,
          filled,
          remaining: order.totalQuantity - filled,
          orderType: order.orderType as OrderType,
          limitPrice: order.lmtPrice,
          stopPrice: order.auxPrice,
          status: orderStatus as OrderStatus,
          submitTime: this.orders.get(orderId)?.submitTime,
          fillTime: this.orders.get(orderId)?.fillTime,
          avgFillPrice: this.orders.get(orderId)?.avgFillPrice,
        };

        // Update or add to orders map
        this.orders.set(orderId, trackedOrder);
        openOrders.push(trackedOrder);
      };

      const onOpenOrderEnd = () => {
        if (requestCompleted) return;
        requestCompleted = true;

        clearTimeout(timeout);
        (client as any).removeListener("openOrder", onOpenOrder);
        (client as any).removeListener("openOrderEnd", onOpenOrderEnd);
        (client as any).removeListener("error", onError);

        // Filter to only open orders (not filled or cancelled)
        const stillOpen = openOrders.filter(
          (o) => o.status !== "Filled" && o.status !== "Cancelled" && o.status !== "ApiCancelled"
        );

        console.log(`[Orders Service] ✅ Received ${stillOpen.length} open orders`);
        resolve(stillOpen);
      };

      const onError = (err: Error, code: number) => {
        if (code === 200 || err.message.includes("order")) {
          clearTimeout(timeout);
          (client as any).removeListener("openOrder", onOpenOrder);
          (client as any).removeListener("openOrderEnd", onOpenOrderEnd);
          (client as any).removeListener("error", onError);

          reject(new Error(`Failed to get open orders: ${err.message} (code: ${code})`));
        }
      };

      // Set up listeners
      (client as any).once("openOrder", onOpenOrder);
      (client as any).once("openOrderEnd", onOpenOrderEnd);
      (client as any).once("error", onError);

      try {
        console.log(`[Orders Service] Requesting open orders...`);
        (client as any).reqOpenOrders();
      } catch (error) {
        clearTimeout(timeout);
        (client as any).removeListener("openOrder", onOpenOrder);
        (client as any).removeListener("openOrderEnd", onOpenOrderEnd);
        (client as any).removeListener("error", onError);

        const err = error instanceof Error ? error : new Error(String(error));
        reject(new Error(`Failed to request open orders: ${err.message}`));
      }
    });
  }

  /**
   * Subscribe to order updates
   * @param callback Function to call when orders are updated
   * @returns Unsubscribe function
   */
  onOrderUpdate(callback: OrderUpdateCallback): UnsubscribeFn {
    return this.eventBus.onOrderUpdate(callback);
  }

  /**
   * Get order by ID
   */
  getOrder(orderId: number): Order | null {
    return this.orders.get(orderId) || null;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private setupOrderHandlers(): void {
    // This will be called when connection is established
    // We set up handlers that persist for the lifetime of the connection
    const connectionManager = getIbkrConnectionManager();

    // Subscribe to connection state changes
    this.eventBus.onConnectionStateChange((status) => {
      if (status.state === "CONNECTED") {
        // Set up order handlers when connected
        this.attachOrderHandlers();
      }
    });

    // If already connected, attach handlers immediately
    if (connectionManager.isConnected()) {
      this.attachOrderHandlers();
    }
  }

  private attachOrderHandlers(): void {
    const connectionManager = getIbkrConnectionManager();
    if (!connectionManager.isConnected()) {
      return;
    }

    const client = connectionManager.getClient();

    // Handle order status updates
    client.on("orderStatus", (orderStatus: IBOrderStatus) => {
      const orderId = orderStatus.orderId;
      const existingOrder = this.orders.get(orderId);

      if (!existingOrder) {
        // Order not in our tracking, might be from previous session
        return;
      }

      // Map IBKR status to our OrderStatus type
      let status: OrderStatus = "Submitted";
      switch (orderStatus.status) {
        case "PreSubmitted":
          status = "PreSubmitted";
          break;
        case "Submitted":
          status = "Submitted";
          break;
        case "Filled":
          status = "Filled";
          break;
        case "Cancelled":
          status = "Cancelled";
          break;
        case "ApiCancelled":
          status = "ApiCancelled";
          break;
        case "PendingCancel":
          status = "PendingCancel";
          break;
        case "PendingSubmit":
          status = "PendingSubmit";
          break;
      }

      // Update order
      const updatedOrder: Order = {
        ...existingOrder,
        status,
        filled: orderStatus.filled,
        remaining: orderStatus.remaining,
        avgFillPrice:
          orderStatus.avgFillPrice > 0 ? orderStatus.avgFillPrice : existingOrder.avgFillPrice,
      };

      if (status === "Filled" && existingOrder.status !== "Filled") {
        updatedOrder.fillTime = Date.now();
      }

      this.orders.set(orderId, updatedOrder);

      // Emit order update event
      this.eventBus.emitOrderUpdate(updatedOrder);

      console.log(
        `[Orders Service] Order ${orderId} status: ${status}, Filled: ${orderStatus.filled}/${existingOrder.quantity}`
      );
    });

    // Handle execution details
    client.on("execDetails", (reqId: number, contract: any, execution: any) => {
      const orderId = execution.orderId;
      const existingOrder = this.orders.get(orderId);

      if (!existingOrder) {
        return;
      }

      // Update fill information
      const updatedOrder: Order = {
        ...existingOrder,
        filled: existingOrder.filled + execution.shares,
        remaining: existingOrder.quantity - (existingOrder.filled + execution.shares),
      };

      this.orders.set(orderId, updatedOrder);
      this.eventBus.emitOrderUpdate(updatedOrder);

      console.log(
        `[Orders Service] Order ${orderId} execution: ${execution.shares} shares @ ${execution.price}`
      );
    });
  }
}

/**
 * Get the singleton orders service instance
 */
export function getIbkrOrdersService(): IbkrOrdersService {
  return IbkrOrdersService.getInstance();
}
