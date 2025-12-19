/**
 * IBKR Integration Layer - Historical Data Service
 *
 * Efficient historical data with caching and pacing protection
 * - In-memory cache keyed by symbol + duration + barSize + whatToShow + useRth
 * - Queues requests and limits concurrent calls
 * - Honors IBKR pacing limits
 */

import { getIbkrConnectionManager } from "./IbkrConnectionManager";
import { getIbkrContractsService } from "./IbkrContractsService";
import type {
  HistoricalBar,
  HistoricalDataCacheEntry,
  HistoricalDataCacheKey,
  HistoricalDataParams,
  IbkrContract,
} from "./types";

interface PendingRequest {
  resolve: (bars: HistoricalBar[]) => void;
  reject: (error: Error) => void;
  params: HistoricalDataParams;
}

export class IbkrHistoricalDataService {
  private static instance: IbkrHistoricalDataService | null = null;
  private cache: Map<HistoricalDataCacheKey, HistoricalDataCacheEntry> = new Map();
  private requestQueue: PendingRequest[] = [];
  private processingRequest: boolean = false;
  private nextReqId: number = 5000; // Start from 5000 to avoid conflicts with market data
  private activeRequests: Map<number, PendingRequest> = new Map();

  // Pacing limits: IBKR allows max 50 requests per 10 seconds
  private readonly MAX_CONCURRENT_REQUESTS = 1; // Process one at a time to avoid pacing violations
  private readonly MIN_REQUEST_INTERVAL = 200; // 200ms between requests (5 requests/second max)
  private lastRequestTime: number = 0;

  private constructor() {}

  static getInstance(): IbkrHistoricalDataService {
    if (!IbkrHistoricalDataService.instance) {
      IbkrHistoricalDataService.instance = new IbkrHistoricalDataService();
    }
    return IbkrHistoricalDataService.instance;
  }

  /**
   * Get historical data with caching and pacing protection
   *
   * @param params Historical data parameters
   * @param forceRefresh If true, bypass cache
   * @returns Array of historical bars
   */
  async getHistoricalData(
    params: HistoricalDataParams,
    forceRefresh: boolean = false
  ): Promise<HistoricalBar[]> {
    // Generate cache key
    const cacheKey = this.generateCacheKey(params);

    // Check cache first
    if (!forceRefresh) {
      const cached = this.cache.get(cacheKey);
      if (cached && cached.expiry > Date.now()) {
        console.log(
          `[Historical Data] Using cached data for ${params.symbol} (${params.durationStr}, ${params.barSize})`
        );
        return cached.bars;
      }
    }

    // Resolve contract if not provided
    let contract: IbkrContract;
    if (params.contract) {
      contract = params.contract;
    } else {
      const contractsService = getIbkrContractsService();
      contract = await contractsService.resolveStockContract(params.symbol);
    }

    // Ensure connection
    const connectionManager = getIbkrConnectionManager();
    await connectionManager.ensureConnected();

    // Queue request
    return new Promise((resolve, reject) => {
      this.requestQueue.push({
        resolve,
        reject,
        params: { ...params, contract },
      });

      // Process queue
      this.processQueue();
    });
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
    console.log(`[Historical Data] Cache cleared`);
  }

  /**
   * Clear cache for a specific symbol
   */
  clearCacheForSymbol(symbol: string): void {
    const keysToDelete: HistoricalDataCacheKey[] = [];
    for (const key of this.cache.keys()) {
      if (key.startsWith(symbol.toUpperCase() + "|")) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach((key) => this.cache.delete(key));
    console.log(`[Historical Data] Cleared cache for ${symbol} (${keysToDelete.length} entries)`);
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private generateCacheKey(params: HistoricalDataParams): HistoricalDataCacheKey {
    const useRth = params.useRth !== undefined ? params.useRth.toString() : "true";
    return `${params.symbol.toUpperCase()}|${params.durationStr}|${params.barSize}|${params.whatToShow}|${useRth}`;
  }

  private async processQueue(): Promise<void> {
    if (this.processingRequest || this.requestQueue.length === 0) {
      return;
    }

    this.processingRequest = true;

    while (this.requestQueue.length > 0 || this.activeRequests.size > 0) {
      // Check if we can process next request (pacing limit)
      const timeSinceLastRequest = Date.now() - this.lastRequestTime;
      if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
        await new Promise((resolve) =>
          setTimeout(resolve, this.MIN_REQUEST_INTERVAL - timeSinceLastRequest)
        );
      }

      // Process next request if queue has items and we're under concurrent limit
      if (this.requestQueue.length > 0 && this.activeRequests.size < this.MAX_CONCURRENT_REQUESTS) {
        const request = this.requestQueue.shift()!;
        this.executeRequest(request);
      }

      // If we have active requests, wait a bit before checking again
      if (this.activeRequests.size > 0) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    }

    this.processingRequest = false;
  }

  private async executeRequest(request: PendingRequest): Promise<void> {
    const reqId = this.nextReqId++;
    if (this.nextReqId > 32767) {
      this.nextReqId = 5000; // Wrap around
    }

    this.activeRequests.set(reqId, request);
    this.lastRequestTime = Date.now();

    const connectionManager = getIbkrConnectionManager();
    const client = connectionManager.getClient();

    const cacheKey = this.generateCacheKey(request.params);
    const contract = request.params.contract!;

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        this.activeRequests.delete(reqId);
        request.reject(
          new Error(`Historical data request timeout for ${request.params.symbol} after 30 seconds`)
        );
        resolve();
        this.processQueue(); // Continue processing queue
      }, 30000);

      const bars: HistoricalBar[] = [];
      let requestCompleted = false;

      // Handle historical data response
      const onHistoricalData = (
        id: number,
        time: string,
        open: number,
        high: number,
        low: number,
        close: number,
        volume: number
      ) => {
        if (id !== reqId || requestCompleted) return;

        // Parse timestamp (IBKR format: "20231207  15:30:00" or Unix timestamp)
        let timestamp: number;
        if (time.includes("finished")) {
          // End of data marker
          return;
        } else if (time.includes(" ")) {
          // IBKR format: "20231207  15:30:00"
          const [datePart, timePart] = time.split("  ");
          const year = parseInt(datePart.substring(0, 4), 10);
          const month = parseInt(datePart.substring(4, 6), 10) - 1;
          const day = parseInt(datePart.substring(6, 8), 10);
          const [hour, minute, second] = timePart.split(":").map((s) => parseInt(s, 10));
          timestamp = new Date(year, month, day, hour, minute, second).getTime();
        } else {
          // Unix timestamp
          timestamp = parseInt(time, 10) * 1000;
        }

        bars.push({
          timestamp,
          open,
          high,
          low,
          close,
          volume,
        });
      };

      // Handle end of historical data
      const onHistoricalDataEnd = (id: number, startDateStr: string, endDateStr: string) => {
        if (id !== reqId || requestCompleted) return;

        requestCompleted = true;
        clearTimeout(timeout);
        this.activeRequests.delete(reqId);

        // Remove listeners
        (client as any).removeListener("historicalData", onHistoricalData);
        (client as any).removeListener("historicalDataEnd", onHistoricalDataEnd);
        (client as any).removeListener("error", onError);

        // Sort bars by timestamp (oldest first)
        bars.sort((a, b) => a.timestamp - b.timestamp);

        // Cache the result (expire after 5 minutes for intraday, 1 hour for daily)
        const isDaily = request.params.barSize.includes("day");
        const expiry = Date.now() + (isDaily ? 60 * 60 * 1000 : 5 * 60 * 1000);

        this.cache.set(cacheKey, {
          bars,
          timestamp: Date.now(),
          expiry,
        });

        console.log(
          `[Historical Data] ✅ Received ${bars.length} bars for ${request.params.symbol} (${request.params.durationStr}, ${request.params.barSize})`
        );

        request.resolve(bars);
        resolve();
        this.processQueue(); // Continue processing queue
      };

      // Handle errors
      const onError = (err: Error, code: number) => {
        if (requestCompleted) return;

        // Only handle errors relevant to this request
        if (code === 162 || err.message.includes("historical") || err.message.includes("data")) {
          requestCompleted = true;
          clearTimeout(timeout);
          this.activeRequests.delete(reqId);

          // Remove listeners
          (client as any).removeListener("historicalData", onHistoricalData);
          (client as any).removeListener("historicalDataEnd", onHistoricalDataEnd);
          (client as any).removeListener("error", onError);

          const error = new Error(
            `Failed to get historical data for ${request.params.symbol}: ${err.message} (code: ${code})`
          );
          request.reject(error);
          resolve();
          this.processQueue(); // Continue processing queue
        }
      };

      // Set up listeners
      (client as any).once("historicalData", onHistoricalData);
      (client as any).once("historicalDataEnd", onHistoricalDataEnd);
      (client as any).once("error", onError);

      try {
        console.log(
          `[Historical Data] Requesting data for ${request.params.symbol} (${request.params.durationStr}, ${request.params.barSize})...`
        );

        (client as any).reqHistoricalData(
          reqId,
          {
            conId: contract.conId,
            symbol: contract.symbol,
            secType: contract.secType,
            exchange: contract.exchange,
            currency: contract.currency,
            primaryExchange: contract.primaryExchange,
          },
          "", // endDateTime (empty = current time)
          request.params.durationStr,
          request.params.barSize,
          request.params.whatToShow,
          request.params.useRth ? 1 : 0, // 1 = RTH only, 0 = all hours
          1, // formatDate = 1 (Unix timestamp)
          false // keepUpToDate = false (historical data, not streaming)
        );
      } catch (error) {
        requestCompleted = true;
        clearTimeout(timeout);
        this.activeRequests.delete(reqId);

        // Remove listeners
        (client as any).removeListener("historicalData", onHistoricalData);
        (client as any).removeListener("historicalDataEnd", onHistoricalDataEnd);
        (client as any).removeListener("error", onError);

        const err = error instanceof Error ? error : new Error(String(error));
        request.reject(
          new Error(
            `Failed to request historical data for ${request.params.symbol}: ${err.message}`
          )
        );
        resolve();
        this.processQueue(); // Continue processing queue
      }
    });
  }
}

/**
 * Get the singleton historical data service instance
 */
export function getIbkrHistoricalDataService(): IbkrHistoricalDataService {
  return IbkrHistoricalDataService.getInstance();
}
