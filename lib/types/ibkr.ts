// Interactive Brokers Client Portal API Types

// Authentication & Connection
export interface IbkrAuthStatus {
  authenticated: boolean;
  connected: boolean;
  competing: boolean;
  message?: string;
  MAC?: string;
  serverInfo?: {
    serverName: string;
    serverVersion: string;
  };
}

// Account & Portfolio
export interface IbkrAccount {
  id: string;
  accountId: string;
  accountVan: string;
  accountTitle: string;
  displayName: string;
  accountAlias: string | null;
  accountStatus: number;
  currency: string;
  type: string;
  tradingType: string;
  faclient: boolean;
  clearingStatus: string;
  covestor: boolean;
  parent: any;
  desc: string;
}

export interface IbkrPosition {
  acctId: string;
  conid: number;
  contractDesc: string;
  position: number;
  mktPrice: number;
  mktValue: number;
  currency: string;
  avgCost: number;
  avgPrice: number;
  realizedPnl: number;
  unrealizedPnl: number;
  exchs: string | null;
  expiry: string | null;
  putOrCall: string | null;
  multiplier: number;
  strike: number;
  exerciseStyle: string | null;
  conExchMap: string[];
  assetClass: string;
  undConid: number;
}

export interface IbkrPortfolioSummary {
  accountcode: {
    amount: number;
    currency: string;
    isNull: boolean;
    timestamp: number;
    value: string;
    severity: number;
  };
  availablefunds?: {
    amount: number;
    currency: string;
    isNull: boolean;
    timestamp: number;
    value: string;
    severity: number;
  };
  netliquidation?: {
    amount: number;
    currency: string;
    isNull: boolean;
    timestamp: number;
    value: string;
    severity: number;
  };
  // Add more fields as needed
}

// Market Data
export interface IbkrStockSearchResult {
  symbol: string;
  conid: number;
  companyHeader: string;
  companyName: string;
  contracts: IbkrContract[];
}

export interface IbkrContract {
  conid: number;
  exchange: string;
  isUS: boolean;
}

export interface IbkrMarketDataSnapshot {
  conid: number;
  conidEx?: string;
  "31"?: string; // Last Price
  "84"?: string; // Bid Price
  "86"?: string; // Ask Price
  "87"?: string; // High
  "88"?: string; // Low
  "7295"?: string; // Close
  "7296"?: string; // Open
  "7308"?: string; // Volume
  "7633"?: string; // Market Cap
  "7644"?: string; // Div Amount
  "7674"?: string; // EPS
  "7675"?: string; // P/E Ratio
  "7741"?: string; // 52 Week High
  "7742"?: string; // 52 Week Low
  _updated?: number;
  server_id?: string;
}

// Market Data Fields Reference
export const IBKR_FIELDS = {
  LAST_PRICE: "31",
  SYMBOL: "55",
  BID: "84",
  ASK: "86",
  HIGH: "87",
  LOW: "88",
  VOLUME: "7308",
  CLOSE: "7295",
  OPEN: "7296",
  CHANGE: "82",
  CHANGE_PERCENT: "83",
  MARKET_CAP: "7633",
  PE_RATIO: "7675",
  DIV_AMOUNT: "7644",
  WEEK_52_HIGH: "7741",
  WEEK_52_LOW: "7742",
} as const;

// Historical Data
export interface IbkrHistoricalData {
  serverId: string;
  symbol: string;
  text: string;
  priceFactor: number;
  startTime: string;
  high: string;
  low: string;
  timePeriod: string;
  barLength: number;
  mdAvailability: string;
  mktDataDelay: number;
  outsideRth: boolean;
  tradingDayDuration: number;
  volumeFactor: number;
  priceDisplayRule: number;
  priceDisplayValue: string;
  chartAnnotations: any | null;
  direction: number;
  negativeCapable: boolean;
  messageVersion: number;
  data: IbkrHistoricalBar[];
  points: number;
  travelTime: number;
}

export interface IbkrHistoricalBar {
  t: number; // timestamp
  o: number; // open
  h: number; // high
  l: number; // low
  c: number; // close
  v: number; // volume
}

// Orders
export interface IbkrOrder {
  conid: number;
  orderType: "MKT" | "LMT" | "STP" | "STP_LIMIT";
  side: "BUY" | "SELL";
  quantity: number;
  price?: number;
  tif?: "DAY" | "GTC" | "IOC" | "GTD";
  outsideRth?: boolean;
}

export interface IbkrOrderResponse {
  order_id: string;
  local_order_id: string;
  order_status: string;
  encrypt_message: string;
}

export interface IbkrOpenOrder {
  acct: string;
  conid: number;
  orderId: number;
  cashCcy: string;
  sizeAndFills: string;
  orderDesc: string;
  description1: string;
  ticker: string;
  secType: string;
  listingExchange: string;
  remainingQuantity: number;
  filledQuantity: number;
  totalSize: number;
  companyName: string;
  status: string;
  order_ccp_status: string;
  avgPrice: string;
  origOrderType: string;
  supportsTaxOpt: string;
  lastExecutionTime: string;
  orderType: string;
  order_ref: string;
  side: string;
  timeInForce: string;
  price?: number;
  bgColor: string;
  fgColor: string;
}

// WebSocket Stream Data
export interface IbkrStreamMessage {
  topic: string;
  conid?: number;
  args?: any;
  [key: string]: any;
}

// Error Response
export interface IbkrError {
  error: string;
  statusCode?: number;
}

// Client Configuration
export interface IbkrClientConfig {
  baseUrl?: string;
  timeout?: number;
}

