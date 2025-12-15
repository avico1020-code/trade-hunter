// Interactive Brokers TWS Socket API Client
// Using @stoqey/ib library for reliable connection to TWS/IB Gateway

// Note: @stoqey/ib uses CommonJS exports, need to import carefully in Node.js environment
import type {
  IbkrAccount,
  IbkrHistoricalBar,
  IbkrMarketDataSnapshot,
  IbkrPosition,
} from "@/lib/types/ibkr";

// Lazy load IB library (only on server-side)
function getIBLib() {
  if (typeof window !== "undefined") {
    throw new Error("IB library can only be used on the server");
  }
  const ib = require("@stoqey/ib");
  return {
    IB: ib.IB || ib.default?.IB || ib.default || ib,
    EventName: ib.EventName,
    ErrorCode: ib.ErrorCode,
    SecType: ib.SecType,
    BarSizeSetting: ib.BarSizeSetting,
    WhatToShow: ib.WhatToShow,
    OrderAction: ib.OrderAction,
    OrderType: ib.OrderType,
  };
}

// TWS Connection Configuration
interface TwsConfig {
  host?: string;
  port?: number;
  clientId?: number;
}

// Market Data Subscription
interface MarketDataSubscription {
  reqId: number;
  symbol: string;
  callback: (data: IbkrMarketDataSnapshot) => void;
}

export class TwsClient {
  private ib: any;
  private connected: boolean = false;
  private connecting: boolean = false;
  private subscriptions: Map<number, MarketDataSubscription> = new Map();
  private nextReqId: number = 1000;
  private config: Required<TwsConfig>;
  private ibLib: ReturnType<typeof getIBLib>;

  constructor(config: TwsConfig = {}) {
    this.config = {
      host: config.host || "127.0.0.1",
      port: config.port || 4002, // Port from IB Gateway API Settings
      clientId: config.clientId || 1,
    };

    // Load IB library
    this.ibLib = getIBLib();

    this.ib = new this.ibLib.IB({
      clientId: this.config.clientId,
      host: this.config.host,
      port: this.config.port,
    });

    this.setupEventHandlers();
  }

  /**
   * Setup event handlers for IB connection
   */
  private setupEventHandlers(): void {
    const { EventName, ErrorCode } = this.ibLib;

    // Connection events
    this.ib.on(EventName.connected, () => {
      console.log("✅ Connected to IB Gateway");
      this.connected = true;
      this.connecting = false;
    });

    this.ib.on(EventName.disconnected, () => {
      console.log("❌ Disconnected from IB Gateway");
      this.connected = false;
      this.connecting = false;
    });

    this.ib.on(EventName.error, (err: Error, code: number, reqId: number) => {
      console.error(`IB Gateway Error [${code}] (reqId: ${reqId}):`, err.message);

      // Handle specific errors
      if (code === ErrorCode.CONNECT_FAIL) {
        this.connected = false;
        this.connecting = false;
      }

      // Handle market data errors (remove subscription if failed)
      if (reqId && this.subscriptions.has(reqId)) {
        console.warn(`Removing failed subscription for reqId ${reqId}`);
        this.subscriptions.delete(reqId);
      }
    });

    // Market data events (real-time quotes)
    this.ib.on(EventName.tickPrice, (reqId: number, field: number, price: number, attrib: any) => {
      const subscription = this.subscriptions.get(reqId);
      if (subscription) {
        this.updateSubscriptionData(reqId, field, price);
      }
    });

    this.ib.on(EventName.tickSize, (reqId: number, field: number, size: number) => {
      const subscription = this.subscriptions.get(reqId);
      if (subscription) {
        this.updateSubscriptionData(reqId, field, size);
      }
    });
  }

  /**
   * Update market data for a subscription
   */
  private updateSubscriptionData(reqId: number, field: number, value: number): void {
    const subscription = this.subscriptions.get(reqId);
    if (!subscription) return;

    // Field mappings (TWS field IDs)
    // 1 = Bid, 2 = Ask, 4 = Last, 6 = High, 7 = Low, 9 = Close
    // 0 = Bid Size, 3 = Ask Size, 5 = Last Size, 8 = Volume

    const data: Partial<IbkrMarketDataSnapshot> = subscription.callback as any;

    switch (field) {
      case 1:
        (data as any)["84"] = value.toString(); // Bid
        break;
      case 2:
        (data as any)["86"] = value.toString(); // Ask
        break;
      case 4:
        (data as any)["31"] = value.toString(); // Last Price
        break;
      case 6:
        (data as any)["87"] = value.toString(); // High
        break;
      case 7:
        (data as any)["88"] = value.toString(); // Low
        break;
      case 9:
        (data as any)["7295"] = value.toString(); // Close
        break;
      case 8:
        (data as any)["7308"] = value.toString(); // Volume
        break;
    }
  }

  /**
   * Connect to TWS/IB Gateway
   */
  async connect(): Promise<void> {
    if (this.connected) {
      return;
    }

    if (this.connecting) {
      // Wait for connection to complete
      return new Promise((resolve, reject) => {
        const checkInterval = setInterval(() => {
          if (this.connected) {
            clearInterval(checkInterval);
            resolve();
          } else if (!this.connecting) {
            clearInterval(checkInterval);
            reject(new Error("Connection failed"));
          }
        }, 100);

        // Timeout after 10 seconds
        setTimeout(() => {
          clearInterval(checkInterval);
          if (!this.connected) {
            reject(new Error("Connection timeout"));
          }
        }, 10000);
      });
    }

    this.connecting = true;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.connecting = false;
        reject(new Error("Connection timeout - Is TWS/IB Gateway running?"));
      }, 10000);

      const connectedHandler = () => {
        clearTimeout(timeout);
        this.ib.removeListener(EventName.connected, connectedHandler);
        this.ib.removeListener(EventName.error, errorHandler);
        resolve();
      };

      const errorHandler = (err: Error, code: ErrorCode) => {
        if (code === ErrorCode.CONNECT_FAIL) {
          clearTimeout(timeout);
          this.ib.removeListener(EventName.connected, connectedHandler);
          this.ib.removeListener(EventName.error, errorHandler);
          reject(new Error("Failed to connect to TWS/IB Gateway. Please ensure it's running."));
        }
      };

      this.ib.once(EventName.connected, connectedHandler);
      this.ib.on(EventName.error, errorHandler);

      this.ib.connect();
    });
  }

  /**
   * Disconnect from TWS/IB Gateway
   */
  disconnect(): void {
    if (this.connected) {
      this.ib.disconnect();
      this.connected = false;
    }
  }

  /**
   * Ensure connection is active
   */
  private async ensureConnected(): Promise<void> {
    if (!this.connected) {
      await this.connect();
    }
  }

  /**
   * Create a stock contract
   */
  private createStockContract(symbol: string, exchange: string = "SMART"): any {
    const { SecType } = this.ibLib;
    return {
      symbol: symbol.toUpperCase(),
      secType: SecType.STK,
      exchange,
      currency: "USD",
    };
  }

  /**
   * Get Contract ID (conid) for a stock symbol
   */
  async getContractDetails(symbol: string): Promise<any> {
    await this.ensureConnected();

    return new Promise((resolve, reject) => {
      const reqId = this.nextReqId++;
      const contract = this.createStockContract(symbol);

      const timeout = setTimeout(() => {
        this.ib.removeAllListeners(EventName.contractDetails);
        this.ib.removeAllListeners(EventName.contractDetailsEnd);
        reject(new Error(`Timeout getting contract details for ${symbol}`));
      }, 5000);

      let details: any = null;

      this.ib.once(EventName.contractDetails, (id: number, contractData: any) => {
        if (id === reqId) {
          details = contractData;
        }
      });

      this.ib.once(EventName.contractDetailsEnd, (id: number) => {
        if (id === reqId) {
          clearTimeout(timeout);
          if (details) {
            resolve(details);
          } else {
            reject(new Error(`No contract details found for ${symbol}`));
          }
        }
      });

      this.ib.reqContractDetails(reqId, contract);
    });
  }

  /**
   * Get market data snapshot for a symbol
   */
  async getMarketDataSnapshot(symbol: string): Promise<IbkrMarketDataSnapshot> {
    await this.ensureConnected();

    return new Promise((resolve, reject) => {
      const reqId = this.nextReqId++;
      const contract = this.createStockContract(symbol);

      const timeout = setTimeout(() => {
        this.ib.cancelMktData(reqId);
        reject(new Error(`Timeout getting market data for ${symbol}`));
      }, 10000);

      const data: Partial<IbkrMarketDataSnapshot> = {
        conid: 0,
      };

      let lastUpdate = Date.now();

      const tickHandler = (id: number) => {
        if (id === reqId) {
          lastUpdate = Date.now();
        }
      };

      this.ib.on(EventName.tickPrice, (id: number, field: number, price: number) => {
        if (id === reqId) {
          tickHandler(id);
          switch (field) {
            case 1:
              data["84"] = price.toString();
              break; // Bid
            case 2:
              data["86"] = price.toString();
              break; // Ask
            case 4:
              data["31"] = price.toString();
              break; // Last
            case 6:
              data["87"] = price.toString();
              break; // High
            case 7:
              data["88"] = price.toString();
              break; // Low
            case 9:
              data["7295"] = price.toString();
              break; // Close
          }
        }
      });

      this.ib.on(EventName.tickSize, (id: number, field: number, size: number) => {
        if (id === reqId) {
          tickHandler(id);
          if (field === 8) {
            data["7308"] = size.toString(); // Volume
          }
        }
      });

      // Wait for data to stabilize (no updates for 1 second)
      const checkInterval = setInterval(() => {
        if (Date.now() - lastUpdate > 1000) {
          clearInterval(checkInterval);
          clearTimeout(timeout);
          this.ib.cancelMktData(reqId);
          resolve(data as IbkrMarketDataSnapshot);
        }
      }, 200);

      this.ib.reqMktData(reqId, contract, "", false, false);
    });
  }

  /**
   * Subscribe to real-time market data
   */
  subscribeMarketData(symbol: string, callback: (data: IbkrMarketDataSnapshot) => void): number {
    const reqId = this.nextReqId++;
    const contract = this.createStockContract(symbol);

    this.subscriptions.set(reqId, {
      reqId,
      symbol,
      callback,
    });

    this.ensureConnected().then(() => {
      this.ib.reqMktData(reqId, contract, "", false, false);
    });

    return reqId;
  }

  /**
   * Unsubscribe from market data
   */
  unsubscribeMarketData(reqId: number): void {
    if (this.subscriptions.has(reqId)) {
      this.ib.cancelMktData(reqId);
      this.subscriptions.delete(reqId);
    }
  }

  /**
   * Get historical data for charts
   */
  async getHistoricalData(
    symbol: string,
    duration: string = "1 Y",
    barSize: BarSizeSetting = BarSizeSetting.ONE_DAY
  ): Promise<IbkrHistoricalBar[]> {
    await this.ensureConnected();

    return new Promise((resolve, reject) => {
      const reqId = this.nextReqId++;
      const contract = this.createStockContract(symbol);

      const timeout = setTimeout(() => {
        reject(new Error(`Timeout getting historical data for ${symbol}`));
      }, 15000);

      const bars: IbkrHistoricalBar[] = [];

      this.ib.once(
        EventName.historicalData,
        (
          id: number,
          date: string,
          open: number,
          high: number,
          low: number,
          close: number,
          volume: number
        ) => {
          if (id === reqId) {
            bars.push({
              t: new Date(date).getTime(),
              o: open,
              h: high,
              l: low,
              c: close,
              v: volume,
            });
          }
        }
      );

      this.ib.once(EventName.historicalDataEnd, (id: number) => {
        if (id === reqId) {
          clearTimeout(timeout);
          resolve(bars);
        }
      });

      const endDateTime = ""; // Empty string = current time
      this.ib.reqHistoricalData(
        reqId,
        contract,
        endDateTime,
        duration,
        barSize,
        WhatToShow.TRADES,
        1, // Regular trading hours only
        1, // Date format: 1 = yyyyMMdd HH:mm:ss
        false,
        []
      );
    });
  }

  /**
   * Get account list
   */
  async getAccounts(): Promise<string[]> {
    await this.ensureConnected();

    return new Promise((resolve) => {
      const accounts: string[] = [];

      this.ib.once(EventName.managedAccounts, (accountsList: string) => {
        const accountArray = accountsList.split(",").filter((a) => a.trim());
        resolve(accountArray);
      });

      this.ib.reqManagedAccts();
    });
  }

  /**
   * Get positions for an account
   */
  async getPositions(): Promise<IbkrPosition[]> {
    await this.ensureConnected();

    return new Promise((resolve, reject) => {
      const positions: IbkrPosition[] = [];

      const timeout = setTimeout(() => {
        reject(new Error("Timeout getting positions"));
      }, 10000);

      this.ib.on(
        EventName.position,
        (account: string, contract: Contract, pos: number, avgCost: number) => {
          positions.push({
            acctId: account,
            conid: 0, // TWS doesn't provide conid directly
            contractDesc: `${contract.symbol} ${contract.secType}`,
            position: pos,
            mktPrice: 0,
            mktValue: 0,
            currency: contract.currency || "USD",
            avgCost: avgCost,
            avgPrice: avgCost,
            realizedPnl: 0,
            unrealizedPnl: 0,
            exchs: null,
            expiry: null,
            putOrCall: null,
            multiplier: 1,
            strike: 0,
            exerciseStyle: null,
            conExchMap: [],
            assetClass: contract.secType || "STK",
            undConid: 0,
          });
        }
      );

      this.ib.once(EventName.positionEnd, () => {
        clearTimeout(timeout);
        resolve(positions);
      });

      this.ib.reqPositions();
    });
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected;
  }
}

// Singleton instance
let twsClientInstance: TwsClient | null = null;

/**
 * Get TWS client instance (singleton)
 */
export function getTwsClient(config?: TwsConfig): TwsClient {
  if (!twsClientInstance) {
    twsClientInstance = new TwsClient(config);
  }
  return twsClientInstance;
}
