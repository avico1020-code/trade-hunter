/**
 * IBKR Integration Layer - Contracts Service
 *
 * Resolves symbols to IBKR contracts with caching
 * Used by all other services that need contract details
 */

import { getIbkrConnectionManager } from "./IbkrConnectionManager";
import type { IbkrContract } from "./types";

interface ContractDetails {
  conId: number;
  symbol: string;
  secType: string;
  exchange: string;
  currency: string;
  primaryExchange?: string;
  localSymbol?: string;
  [key: string]: unknown;
}

export class IbkrContractsService {
  private static instance: IbkrContractsService | null = null;
  private contractCache: Map<string, IbkrContract> = new Map();

  private constructor() {}

  static getInstance(): IbkrContractsService {
    if (!IbkrContractsService.instance) {
      IbkrContractsService.instance = new IbkrContractsService();
    }
    return IbkrContractsService.instance;
  }

  /**
   * Resolve a stock symbol to an IBKR contract
   * Uses SMART routing for US stocks (most reliable)
   *
   * @param symbol Stock symbol (e.g., "AAPL", "MSFT")
   * @param forceRefresh If true, bypass cache and fetch fresh data
   * @returns IBKR contract object
   * @throws Error if contract cannot be resolved
   */
  async resolveStockContract(symbol: string, forceRefresh: boolean = false): Promise<IbkrContract> {
    const cacheKey = symbol.toUpperCase();

    // Check cache first
    if (!forceRefresh && this.contractCache.has(cacheKey)) {
      const cached = this.contractCache.get(cacheKey);
      if (cached) {
        console.log(`[Contracts Service] Using cached contract for ${symbol}`);
        return cached;
      }
    }

    const connectionManager = getIbkrConnectionManager();
    await connectionManager.ensureConnected();
    const client = connectionManager.getClient();

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Contract resolution timeout for ${symbol} after 10 seconds`));
      }, 10000);

      let contractResolved = false;

      // Set up contract details handler
      const onContractDetails = (reqId: number, contractDetails: ContractDetails) => {
        if (contractResolved) return;

        clearTimeout(timeout);
        contractResolved = true;

        // Remove listeners
        (client as any).removeListener("contractDetails", onContractDetails);
        (client as any).removeListener("contractDetailsEnd", onContractDetailsEnd);
        (client as any).removeListener("error", onError);

        const contract: IbkrContract = {
          conId: contractDetails.conId,
          symbol: contractDetails.symbol,
          secType: contractDetails.secType,
          exchange: contractDetails.exchange,
          currency: contractDetails.currency,
          primaryExchange: contractDetails.primaryExchange,
          localSymbol: contractDetails.localSymbol,
        };

        // Cache the contract
        this.contractCache.set(cacheKey, contract);

        console.log(`[Contracts Service] ✅ Resolved contract for ${symbol}:`, contract);
        resolve(contract);
      };

      const onContractDetailsEnd = (reqId: number) => {
        if (!contractResolved) {
          clearTimeout(timeout);
          contractResolved = true;

          // Remove listeners
          (client as any).removeListener("contractDetails", onContractDetails);
          (client as any).removeListener("contractDetailsEnd", onContractDetailsEnd);
          (client as any).removeListener("error", onError);

          reject(new Error(`No contract details received for ${symbol}`));
        }
      };

      const onError = (err: Error, code: number) => {
        if (contractResolved) return;

        // Only handle errors relevant to this request
        if (code === 200 || code === 162 || err.message.includes("contract")) {
          clearTimeout(timeout);
          contractResolved = true;

          // Remove listeners
          (client as any).removeListener("contractDetails", onContractDetails);
          (client as any).removeListener("contractDetailsEnd", onContractDetailsEnd);
          (client as any).removeListener("error", onError);

          reject(
            new Error(`Failed to resolve contract for ${symbol}: ${err.message} (code: ${code})`)
          );
        }
      };

      // Set up listeners
      (client as any).once("contractDetails", onContractDetails);
      (client as any).once("contractDetailsEnd", onContractDetailsEnd);
      (client as any).once("error", onError);

      try {
        // Request contract details using SMART exchange for US stocks
        // SMART automatically routes to the best exchange
        const contractRequest = {
          symbol: symbol.toUpperCase(),
          secType: "STK", // Stock
          exchange: "SMART", // Use SMART routing for best execution
          currency: "USD", // Default to USD, can be extended later
        };

        console.log(`[Contracts Service] Requesting contract details for ${symbol}...`);
        (client as any).reqContractDetails(0, contractRequest); // reqId = 0 for this request
      } catch (error) {
        clearTimeout(timeout);
        contractResolved = true;

        // Remove listeners
        (client as any).removeListener("contractDetails", onContractDetails);
        (client as any).removeListener("contractDetailsEnd", onContractDetailsEnd);
        (client as any).removeListener("error", onError);

        const err = error instanceof Error ? error : new Error(String(error));
        reject(new Error(`Failed to request contract details for ${symbol}: ${err.message}`));
      }
    });
  }

  /**
   * Clear the contract cache
   */
  clearCache(): void {
    this.contractCache.clear();
    console.log(`[Contracts Service] Contract cache cleared`);
  }

  /**
   * Get a cached contract (returns null if not cached)
   */
  getCachedContract(symbol: string): IbkrContract | null {
    return this.contractCache.get(symbol.toUpperCase()) || null;
  }
}

/**
 * Get the singleton contracts service instance
 */
export function getIbkrContractsService(): IbkrContractsService {
  return IbkrContractsService.getInstance();
}
