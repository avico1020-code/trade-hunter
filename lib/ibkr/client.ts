// Interactive Brokers Client Portal API Client
// This runs on Next.js server (API Routes) to communicate with IB Gateway

import type {
  IbkrAccount,
  IbkrAuthStatus,
  IbkrClientConfig,
  IbkrHistoricalData,
  IbkrMarketDataSnapshot,
  IbkrOpenOrder,
  IbkrOrder,
  IbkrOrderResponse,
  IbkrPortfolioSummary,
  IbkrPosition,
  IbkrStockSearchResult,
} from "@/lib/types/ibkr";

export class IbkrClient {
  private baseUrl: string;
  private timeout: number;

  constructor(config: IbkrClientConfig = {}) {
    this.baseUrl = (config.baseUrl || "https://localhost:5000/v1/api").replace(/\/$/, "");
    this.timeout = config.timeout || 30000;
  }

  /**
   * Internal method to make HTTP requests to IB Gateway
   * Note: This bypasses SSL verification for localhost self-signed certificates
   */
  private async request<T>(
    method: string,
    path: string,
    options: {
      query?: Record<string, any>;
      body?: any;
    } = {}
  ): Promise<T> {
    const url = new URL(this.baseUrl + path);

    // Add query parameters
    if (options.query) {
      Object.entries(options.query).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    try {
      // For Node.js server-side, we need to use node:https with self-signed certificate support
      // For browser/client-side, regular fetch works (user accepts SSL warning in browser)
      let response: Response;

      console.log(`[IBKR Client] Making ${method} request to: ${url.toString()}`);

      if (typeof window === "undefined") {
        // Server-side: Use Node.js https module to bypass SSL verification
        const https = require("node:https");
        const http = require("node:http");

        const urlObj = new URL(url.toString());
        const protocol = urlObj.protocol === "https:" ? https : http;

        console.log(
          `[IBKR Client] Server-side request to ${urlObj.hostname}:${urlObj.port || (urlObj.protocol === "https:" ? 443 : 80)}`
        );

        // Create a custom fetch-like function for Node.js
        response = await new Promise<Response>((resolve, reject) => {
          const requestOptions: any = {
            hostname: urlObj.hostname,
            port: urlObj.port || (urlObj.protocol === "https:" ? 443 : 80),
            path: urlObj.pathname + urlObj.search,
            method,
            headers: {
              "Content-Type": "application/json",
              "User-Agent": "IBKR-Client/1.0",
            },
            rejectUnauthorized: false, // Bypass SSL certificate verification for localhost
          };

          const req = protocol.request(requestOptions, (res: any) => {
            let data = "";
            res.on("data", (chunk: Buffer | string) => {
              data += chunk.toString();
            });
            res.on("end", () => {
              console.log(`[IBKR Client] Response status: ${res.statusCode} ${res.statusMessage}`);
              console.log(`[IBKR Client] Response body length: ${data.length} bytes`);

              // Create a Response-like object
              resolve({
                ok: res.statusCode >= 200 && res.statusCode < 300,
                status: res.statusCode || 0,
                statusText: res.statusMessage || "",
                text: async () => data,
                json: async () => {
                  try {
                    return JSON.parse(data);
                  } catch (e) {
                    console.error(`[IBKR Client] Failed to parse JSON: ${data.substring(0, 200)}`);
                    throw new Error(`Invalid JSON response: ${data.substring(0, 100)}`);
                  }
                },
                headers: new Headers(res.headers as Record<string, string>),
              } as Response);
            });
          });

          req.on("error", (err: Error) => {
            console.error(`[IBKR Client] Request error:`, err);
            reject(err);
          });

          req.setTimeout(30000, () => {
            req.destroy();
            reject(new Error(`Request timeout after 30 seconds to ${url.toString()}`));
          });

          if (options.body) {
            req.write(JSON.stringify(options.body));
          }

          req.end();
        });
      } else {
        // Client-side: Use regular fetch
        console.log(`[IBKR Client] Client-side fetch request`);
        response = await fetch(url.toString(), {
          method,
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "IBKR-Client/1.0",
          },
          body: options.body ? JSON.stringify(options.body) : undefined,
        });
      }

      const text = await response.text();
      console.log(
        `[IBKR Client] Response OK: ${response.ok}, Status: ${response.status}, Body: ${text.substring(0, 200)}`
      );

      if (!response.ok) {
        const errorMsg = `IBKR API Error ${response.status}: ${text.substring(0, 500)}`;
        console.error(`[IBKR Client] ${errorMsg}`);
        throw new Error(errorMsg);
      }

      // Try to parse as JSON, return text if fails
      try {
        return JSON.parse(text) as T;
      } catch (e) {
        console.warn(`[IBKR Client] Response is not JSON, returning as text`);
        return text as T;
      }
    } catch (error) {
      // Get error message - handle various error types
      let errorMessage = "";
      if (error instanceof Error) {
        errorMessage = error.message || error.toString() || "Unknown error";
      } else if (typeof error === "string") {
        errorMessage = error;
      } else {
        errorMessage = JSON.stringify(error) || "Unknown error";
      }

      // Log the full error object for debugging
      console.error(`[IBKR Client] Request failed to ${url.toString()}:`, error);
      console.error(`[IBKR Client] Error message: "${errorMessage}"`);
      console.error(
        `[IBKR Client] Error type: ${error instanceof Error ? error.constructor.name : typeof error}`
      );

      const fullError = `IBKR Request failed to ${url.toString()}: ${errorMessage || "Unknown error (see logs for details)"}`;

      // Check for common errors and provide helpful messages
      if (errorMessage.includes("ECONNREFUSED") || errorMessage.includes("connect ECONNREFUSED")) {
        throw new Error(
          `Cannot connect to IB Gateway at ${url.toString()}. Please ensure IB Gateway is running and accessible at https://localhost:5000`
        );
      } else if (
        errorMessage.includes("ETIMEDOUT") ||
        errorMessage.includes("timeout") ||
        errorMessage.includes("TIMEDOUT")
      ) {
        throw new Error(
          `Connection timeout to IB Gateway. Please ensure IB Gateway is running and responsive`
        );
      } else if (
        errorMessage.includes("CERT") ||
        errorMessage.includes("SSL") ||
        errorMessage.includes("certificate")
      ) {
        throw new Error(
          `SSL certificate error. This should not happen with rejectUnauthorized: false`
        );
      } else if (errorMessage.includes("ENOTFOUND") || errorMessage.includes("getaddrinfo")) {
        throw new Error(
          `Host not found: ${url.hostname}. Please check your IB Gateway configuration`
        );
      }

      throw new Error(fullError);
    }
  }

  // ============================================
  // AUTHENTICATION & CONNECTION
  // ============================================

  /**
   * Check authentication status with IB Gateway
   */
  async getAuthStatus(): Promise<IbkrAuthStatus> {
    return this.request<IbkrAuthStatus>("GET", "/iserver/auth/status");
  }

  /**
   * Keep the session alive
   */
  async keepAlive(): Promise<void> {
    try {
      await this.request("GET", "/sso/validate");
    } catch (error) {
      console.warn("Keep alive (sso/validate) failed:", error);
    }

    try {
      await this.request("POST", "/iserver/reauthenticate");
    } catch (error) {
      console.warn("Keep alive (reauthenticate) failed:", error);
    }
  }

  /**
   * Ensure IB Gateway is connected and authenticated
   * Throws an error if not connected
   * This is similar to the Python code's connection check after nextValidId
   */
  async ensureAuthenticated(): Promise<IbkrAuthStatus> {
    try {
      const status = await this.getAuthStatus();

      if (!status.authenticated || !status.connected) {
        console.error("[IBKR Client] ❌ Not authenticated or not connected");
        console.error(
          `[IBKR Client] Authenticated: ${status.authenticated}, Connected: ${status.connected}`
        );
        throw new Error(
          "IB Gateway is not connected. Please ensure IB Gateway is running and you are logged in at https://localhost:5000"
        );
      }

      console.log("[IBKR Client] ✅ Authenticated and connected successfully");
      return status;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error("[IBKR Client] ❌ Authentication check failed:", errorMsg);
      throw error;
    }
  }

  // ============================================
  // ACCOUNTS & PORTFOLIO
  // ============================================

  /**
   * Get list of portfolio accounts
   */
  async getPortfolioAccounts(): Promise<IbkrAccount[]> {
    await this.ensureAuthenticated();
    return this.request<IbkrAccount[]>("GET", "/portfolio/accounts");
  }

  /**
   * Detect account type (Paper Trading vs Live Trading)
   * Based on account ID prefix: DU = Paper Trading
   * @returns "PAPER" | "LIVE" | "UNKNOWN"
   */
  async detectAccountType(): Promise<"PAPER" | "LIVE" | "UNKNOWN"> {
    try {
      const accounts = await this.getPortfolioAccounts();

      if (accounts.length === 0) {
        console.warn("[IBKR Client] No accounts found");
        return "UNKNOWN";
      }

      // Check first account (usually the active one)
      const firstAccount = accounts[0];

      // Method 1: Check account ID prefix (DU = Paper Trading)
      if (firstAccount.accountId?.startsWith("DU")) {
        console.log(
          `[IBKR Client] ✅ Account detected: PAPER (Account ID: ${firstAccount.accountId})`
        );
        return "PAPER";
      }

      // Method 2: Check tradingType field
      if (firstAccount.tradingType) {
        const tradingTypeLower = firstAccount.tradingType.toLowerCase();
        if (tradingTypeLower.includes("paper") || tradingTypeLower.includes("demo")) {
          console.log(
            `[IBKR Client] ✅ Account detected: PAPER (Trading Type: ${firstAccount.tradingType})`
          );
          return "PAPER";
        }
        if (tradingTypeLower.includes("live") || tradingTypeLower.includes("production")) {
          console.log(
            `[IBKR Client] ✅ Account detected: LIVE (Trading Type: ${firstAccount.tradingType})`
          );
          return "LIVE";
        }
      }

      // Method 3: Check account type field
      if (firstAccount.type) {
        const typeLower = firstAccount.type.toLowerCase();
        if (typeLower.includes("paper") || typeLower.includes("demo")) {
          console.log(`[IBKR Client] ✅ Account detected: PAPER (Type: ${firstAccount.type})`);
          return "PAPER";
        }
        if (typeLower.includes("live") || typeLower.includes("production")) {
          console.log(`[IBKR Client] ✅ Account detected: LIVE (Type: ${firstAccount.type})`);
          return "LIVE";
        }
      }

      // Method 4: Check account alias/display name
      if (firstAccount.accountAlias || firstAccount.displayName) {
        const aliasLower = (
          firstAccount.accountAlias ||
          firstAccount.displayName ||
          ""
        ).toLowerCase();
        if (
          aliasLower.includes("paper") ||
          aliasLower.includes("demo") ||
          aliasLower.includes("test")
        ) {
          console.log(
            `[IBKR Client] ✅ Account detected: PAPER (Alias: ${firstAccount.accountAlias || firstAccount.displayName})`
          );
          return "PAPER";
        }
      }

      // Default: Assume LIVE if not clearly Paper
      console.log(
        `[IBKR Client] ⚠️ Account type unclear, defaulting to LIVE (Account ID: ${firstAccount.accountId})`
      );
      return "LIVE";
    } catch (error) {
      console.error("[IBKR Client] ❌ Failed to detect account type:", error);
      return "UNKNOWN";
    }
  }

  /**
   * Get account overview/summary
   */
  async getAccountSummary(accountId: string): Promise<IbkrPortfolioSummary> {
    await this.ensureAuthenticated();
    return this.request<IbkrPortfolioSummary>("GET", `/portfolio/${accountId}/summary`);
  }

  /**
   * Get positions for an account
   */
  async getPositions(accountId: string): Promise<IbkrPosition[]> {
    await this.ensureAuthenticated();
    return this.request<IbkrPosition[]>("GET", `/portfolio/${accountId}/positions/0`);
  }

  // ============================================
  // STOCK SEARCH & CONTRACT ID (CONID)
  // ============================================

  /**
   * Search for stocks by symbol
   */
  async searchStocks(symbol: string): Promise<IbkrStockSearchResult[]> {
    await this.ensureAuthenticated();
    return this.request<IbkrStockSearchResult[]>("GET", "/trsv/stocks", {
      query: { symbols: symbol },
    });
  }

  /**
   * Get Contract ID (conid) for a stock symbol
   */
  async getConidForStock(symbol: string): Promise<number> {
    const results = await this.searchStocks(symbol);

    if (results.length === 0) {
      throw new Error(`No results found for symbol: ${symbol}`);
    }

    const first = results[0];

    // Try direct conid
    if (first.conid) {
      return first.conid;
    }

    // Try contracts array
    if (first.contracts && first.contracts.length > 0) {
      return first.contracts[0].conid;
    }

    throw new Error(`Could not find conid for symbol: ${symbol}`);
  }

  // ============================================
  // MARKET DATA - SNAPSHOT
  // ============================================

  /**
   * Get market data snapshot for a contract ID (conid)
   * @param conid - Contract ID
   * @param fields - Array of field IDs or comma-separated string
   */
  async getMarketDataSnapshot(
    conid: number,
    fields?: string | string[]
  ): Promise<IbkrMarketDataSnapshot[]> {
    await this.ensureAuthenticated();

    const fieldString = Array.isArray(fields) ? fields.join(",") : fields;

    return this.request<IbkrMarketDataSnapshot[]>("GET", "/iserver/marketdata/snapshot", {
      query: {
        conids: String(conid),
        fields: fieldString,
      },
    });
  }

  /**
   * Get market data snapshot by stock symbol
   */
  async getMarketDataBySymbol(
    symbol: string,
    fields?: string | string[]
  ): Promise<{ symbol: string; conid: number; data: IbkrMarketDataSnapshot[] }> {
    const conid = await this.getConidForStock(symbol);
    const data = await this.getMarketDataSnapshot(conid, fields);

    return { symbol, conid, data };
  }

  // ============================================
  // MARKET DATA - HISTORICAL
  // ============================================

  /**
   * Get historical market data for a contract ID
   * @param conid - Contract ID
   * @param period - Time period (1d, 1w, 1m, 1y, etc.)
   * @param bar - Bar size (1min, 5min, 1h, 1d, etc.)
   */
  async getHistoricalData(
    conid: number,
    period: string = "1y",
    bar: string = "1d"
  ): Promise<IbkrHistoricalData> {
    await this.ensureAuthenticated();

    return this.request<IbkrHistoricalData>("GET", "/iserver/marketdata/history", {
      query: {
        conid: String(conid),
        period,
        bar,
      },
    });
  }

  /**
   * Get historical data by stock symbol
   */
  async getHistoricalBySymbol(
    symbol: string,
    period: string = "1y",
    bar: string = "1d"
  ): Promise<{ symbol: string; conid: number; history: IbkrHistoricalData }> {
    const conid = await this.getConidForStock(symbol);
    const history = await this.getHistoricalData(conid, period, bar);

    return { symbol, conid, history };
  }

  // ============================================
  // ORDERS
  // ============================================

  /**
   * Place an order
   */
  async placeOrder(accountId: string, order: IbkrOrder): Promise<IbkrOrderResponse[]> {
    await this.ensureAuthenticated();

    return this.request<IbkrOrderResponse[]>("POST", `/iserver/account/${accountId}/orders`, {
      body: { orders: [order] },
    });
  }

  /**
   * Cancel an order
   */
  async cancelOrder(accountId: string, orderId: string): Promise<any> {
    await this.ensureAuthenticated();

    return this.request("DELETE", `/iserver/account/${accountId}/order/${orderId}`);
  }

  /**
   * Get open orders
   */
  async getOpenOrders(): Promise<IbkrOpenOrder[]> {
    await this.ensureAuthenticated();

    return this.request<IbkrOpenOrder[]>("GET", "/iserver/account/orders");
  }

  /**
   * Get live orders for a specific account
   */
  async getLiveOrders(accountId: string): Promise<IbkrOpenOrder[]> {
    await this.ensureAuthenticated();

    return this.request<IbkrOpenOrder[]>("GET", `/iserver/account/${accountId}/orders`);
  }
}

// Singleton instance
let ibkrClientInstance: IbkrClient | null = null;

/**
 * Get IBKR client instance (singleton)
 */
export function getIbkrClient(config?: IbkrClientConfig): IbkrClient {
  if (!ibkrClientInstance) {
    ibkrClientInstance = new IbkrClient(config);
  }
  return ibkrClientInstance;
}
