/**
 * IBKR Integration Layer - Type Definitions
 * 
 * Shared types and interfaces for all IBKR services
 */

// ============================================================================
// Connection Types
// ============================================================================

export type ConnectionState = "DISCONNECTED" | "CONNECTING" | "CONNECTED" | "ERROR";

export interface ConnectionStatus {
  state: ConnectionState;
  lastConnectTime: number | null;
  lastDisconnectTime: number | null;
  lastError: string | null;
  serverTime: string | null;
  clientId: number;
  host: string;
  port: number;
}

export interface ConnectionConfig {
  host: string;
  port: number;
  clientId: number;
}

// ============================================================================
// Contract Types
// ============================================================================

export interface IbkrContract {
  conId?: number;
  symbol: string;
  secType: string; // "STK", "OPT", "FUT", etc.
  exchange: string;
  currency: string;
  primaryExchange?: string;
  localSymbol?: string;
}

// ============================================================================
// Market Data Types
// ============================================================================

export interface MarketTick {
  symbol: string;
  bid: number | null;
  ask: number | null;
  last: number | null;
  close: number | null;
  bidSize: number | null;
  askSize: number | null;
  lastSize: number | null;
  volume: number | null;
  high: number | null;
  low: number | null;
  open: number | null;
  timestamp: number;
}

export interface MarketDataSubscription {
  symbol: string;
  contract: IbkrContract;
  tickerId: number;
  lastTick: MarketTick | null;
  lastUpdateTime: number | null;
  refCount: number; // How many consumers subscribe to this symbol
}

export type MarketDataRegistry = Map<string, MarketDataSubscription>;

export interface MarketDataOptions {
  /** Generic tick list, comma-separated (e.g., "233,236,258") */
  genericTickList?: string;
  /** Snapshot subscription (one-time, not streaming) */
  snapshot?: boolean;
  /** Market data type: 1=live, 2=frozen, 3=delayed, 4=delayed-frozen */
  regulatorySnapshot?: boolean;
}

// ============================================================================
// Historical Data Types
// ============================================================================

export interface HistoricalBar {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface HistoricalDataParams {
  symbol: string;
  contract?: IbkrContract;
  durationStr: string; // e.g. "15 D", "1 Y", "2 W"
  barSize: string; // e.g. "5 mins", "1 hour", "1 day"
  whatToShow: string; // e.g. "TRADES", "MIDPOINT", "BID", "ASK"
  useRth?: boolean; // Use regular trading hours only
}

export type HistoricalDataCacheKey = string; // symbol + durationStr + barSize + whatToShow + useRth

export interface HistoricalDataCacheEntry {
  bars: HistoricalBar[];
  timestamp: number; // When cached
  expiry: number; // When cache expires
}

// ============================================================================
// Account Types
// ============================================================================

export interface AccountSummary {
  accountId: string;
  netLiquidation: number | null;
  totalCashValue: number | null;
  buyingPower: number | null;
  grossPositionValue: number | null;
  realizedPnL: number | null;
  unrealizedPnL: number | null;
  availableFunds: number | null;
  excessLiquidity: number | null;
  marginUsed: number | null;
}

// ============================================================================
// Portfolio Types
// ============================================================================

export interface Position {
  accountId: string;
  symbol: string;
  contract: IbkrContract;
  position: number; // Positive = long, negative = short
  avgCost: number;
  marketPrice: number | null;
  marketValue: number | null;
  realizedPnL: number | null;
  unrealizedPnL: number | null;
}

// ============================================================================
// Order Types
// ============================================================================

export type OrderSide = "BUY" | "SELL";
export type OrderType = "MKT" | "LMT" | "STP" | "STP_LMT" | "TRAIL" | "TRAIL_LIMIT";
export type TimeInForce = "DAY" | "GTC" | "IOC" | "FOK";
export type OrderStatus = 
  | "PendingSubmit" 
  | "PendingCancel" 
  | "PreSubmitted" 
  | "Submitted" 
  | "ApiCancelled"
  | "Cancelled" 
  | "Filled" 
  | "Inactive"
  | "PartiallyFilled"
  | "Rejected";

export interface PlaceOrderParams {
  symbol: string;
  contract?: IbkrContract;
  side: OrderSide;
  quantity: number;
  orderType: OrderType;
  limitPrice?: number; // Required for LMT orders
  stopPrice?: number; // Required for STP orders
  timeInForce?: TimeInForce;
  trailAmount?: number; // For TRAIL orders
  trailPercent?: number; // For TRAIL_LIMIT orders
}

export interface PlacedOrderResult {
  orderId: number;
  status: OrderStatus;
}

export interface Order {
  orderId: number;
  symbol: string;
  contract: IbkrContract;
  side: OrderSide;
  quantity: number;
  filled: number;
  remaining: number;
  orderType: OrderType;
  limitPrice?: number;
  stopPrice?: number;
  status: OrderStatus;
  avgFillPrice?: number;
  submitTime?: number;
  fillTime?: number;
}

// ============================================================================
// News Types
// ============================================================================

export interface NewsProvider {
  code: string;
  name: string;
}

export interface NewsHeadline {
  articleId: string;
  headline: string;
  providerCode: string;
  providerName: string;
  timestamp: number;
  relatedSymbols: string[];
}

export interface NewsArticle {
  articleId: string;
  headline: string;
  providerCode: string;
  providerName: string;
  timestamp: number;
  body: string;
}

export interface HistoricalNewsParams {
  symbol: string;
  startTime: Date;
  endTime: Date;
  limit?: number;
}

// ============================================================================
// Error Types
// ============================================================================

export class IbkrError extends Error {
  constructor(
    message: string,
    public code?: number,
    public cause?: Error
  ) {
    super(message);
    this.name = "IbkrError";
  }
}

export class IbkrConnectionError extends IbkrError {
  constructor(message: string, code?: number, cause?: Error) {
    super(message, code, cause);
    this.name = "IbkrConnectionError";
  }
}

export class IbkrSubscriptionError extends IbkrError {
  constructor(message: string, code?: number, cause?: Error) {
    super(message, code, cause);
    this.name = "IbkrSubscriptionError";
  }
}

// ============================================================================
// Event Types
// ============================================================================

export type UnsubscribeFn = () => void;

export interface MarketTickCallback {
  (symbol: string, tick: MarketTick): void;
}

export interface OrderUpdateCallback {
  (order: Order): void;
}

export interface ConnectionStateCallback {
  (status: ConnectionStatus): void;
}

