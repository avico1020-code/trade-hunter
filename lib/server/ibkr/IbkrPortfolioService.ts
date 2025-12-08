/**
 * IBKR Integration Layer - Portfolio Service
 * 
 * Manages portfolio positions and P&L
 * - Open positions
 * - Realized/unrealized P&L
 * - Position updates
 */

import { getIbkrConnectionManager } from "./IbkrConnectionManager";
import { getIbkrContractsService } from "./IbkrContractsService";
import type { Position, IbkrContract } from "./types";

export class IbkrPortfolioService {
  private static instance: IbkrPortfolioService | null = null;
  private positionsCache: Map<string, Position> = new Map(); // keyed by accountId:symbol
  private subscribedAccounts: Set<string> = new Set();

  private constructor() {}

  static getInstance(): IbkrPortfolioService {
    if (!IbkrPortfolioService.instance) {
      IbkrPortfolioService.instance = new IbkrPortfolioService();
    }
    return IbkrPortfolioService.instance;
  }

  /**
   * Get open positions for an account
   * @param accountId Account ID (empty string = all accounts)
   * @returns Array of positions
   */
  async getOpenPositions(accountId: string = ""): Promise<Position[]> {
    const connectionManager = getIbkrConnectionManager();
    await connectionManager.ensureConnected();
    const client = connectionManager.getClient();

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Get positions timeout for ${accountId || "all accounts"} after 10 seconds`));
      }, 10000);

      const positions: Position[] = [];
      const positionMap = new Map<string, Position>(); // keyed by accountId:conId

      const onPosition = (
        account: string,
        contract: any,
        position: number,
        avgCost: number
      ) => {
        if (accountId !== "" && account !== accountId) return;

        const key = `${account}:${contract.conId || contract.symbol}`;
        
        const ibkrContract: IbkrContract = {
          conId: contract.conId,
          symbol: contract.symbol,
          secType: contract.secType,
          exchange: contract.exchange,
          currency: contract.currency,
          primaryExchange: contract.primaryExchange,
          localSymbol: contract.localSymbol,
        };

        positionMap.set(key, {
          accountId: account,
          symbol: contract.symbol,
          contract: ibkrContract,
          position,
          avgCost,
          marketPrice: null,
          marketValue: null,
          realizedPnL: null,
          unrealizedPnL: null,
        });
      };

      const onPositionEnd = () => {
        clearTimeout(timeout);
        (client as any).removeListener("position", onPosition);
        (client as any).removeListener("positionEnd", onPositionEnd);
        (client as any).removeListener("error", onError);

        // Convert map to array
        positions.push(...Array.from(positionMap.values()));

        // Update cache
        positions.forEach((pos) => {
          const cacheKey = `${pos.accountId}:${pos.symbol}`;
          this.positionsCache.set(cacheKey, pos);
        });

        console.log(`[Portfolio Service] ✅ Received ${positions.length} positions for ${accountId || "all accounts"}`);
        resolve(positions);
      };

      const onError = (err: Error, code: number) => {
        if (code === 200 || err.message.includes("position") || err.message.includes("portfolio")) {
          clearTimeout(timeout);
          (client as any).removeListener("position", onPosition);
          (client as any).removeListener("positionEnd", onPositionEnd);
          (client as any).removeListener("error", onError);

          reject(new Error(`Failed to get positions: ${err.message} (code: ${code})`));
        }
      };

      // Set up listeners
      (client as any).once("position", onPosition);
      (client as any).once("positionEnd", onPositionEnd);
      (client as any).once("error", onError);

      try {
        console.log(`[Portfolio Service] Requesting positions for ${accountId || "all accounts"}...`);
        (client as any).reqPositions(accountId);
      } catch (error) {
        clearTimeout(timeout);
        (client as any).removeListener("position", onPosition);
        (client as any).removeListener("positionEnd", onPositionEnd);
        (client as any).removeListener("error", onError);

        const err = error instanceof Error ? error : new Error(String(error));
        reject(new Error(`Failed to request positions: ${err.message}`));
      }
    });
  }

  /**
   * Subscribe to position updates
   * @param accountId Account ID (empty string = all accounts)
   */
  async subscribePositions(accountId: string = ""): Promise<void> {
    if (this.subscribedAccounts.has(accountId || "ALL")) {
      console.log(`[Portfolio Service] Already subscribed to positions for ${accountId || "all accounts"}`);
      return;
    }

    const connectionManager = getIbkrConnectionManager();
    await connectionManager.ensureConnected();
    const client = connectionManager.getClient();

    try {
      console.log(`[Portfolio Service] Subscribing to position updates for ${accountId || "all accounts"}...`);
      (client as any).reqPositions(accountId);
      this.subscribedAccounts.add(accountId || "ALL");

      // Set up position update handler
      client.on("position", (account: string, contract: any, position: number, avgCost: number) => {
        if (accountId === "" || account === accountId) {
          const key = `${account}:${contract.symbol}`;
          
          const ibkrContract: IbkrContract = {
            conId: contract.conId,
            symbol: contract.symbol,
            secType: contract.secType,
            exchange: contract.exchange,
            currency: contract.currency,
            primaryExchange: contract.primaryExchange,
            localSymbol: contract.localSymbol,
          };

          const pos: Position = {
            accountId: account,
            symbol: contract.symbol,
            contract: ibkrContract,
            position,
            avgCost,
            marketPrice: null,
            marketValue: null,
            realizedPnL: null,
            unrealizedPnL: null,
          };

          this.positionsCache.set(key, pos);
        }
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      throw new Error(`Failed to subscribe to positions: ${err.message}`);
    }
  }

  /**
   * Get P&L for a position
   * @param accountId Account ID
   * @param contract Contract or symbol
   * @returns Realized and unrealized P&L
   */
  async getPnL(accountId: string, contractOrSymbol: IbkrContract | string): Promise<{
    realizedPnL: number | null;
    unrealizedPnL: number | null;
  }> {
    const connectionManager = getIbkrConnectionManager();
    await connectionManager.ensureConnected();
    const client = connectionManager.getClient();

    let contract: IbkrContract;
    if (typeof contractOrSymbol === "string") {
      const contractsService = getIbkrContractsService();
      contract = await contractsService.resolveStockContract(contractOrSymbol);
    } else {
      contract = contractOrSymbol;
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Get P&L timeout for ${contract.symbol} after 10 seconds`));
      }, 10000);

      let realizedPnL: number | null = null;
      let unrealizedPnL: number | null = null;

      const onPnL = (reqId: number, dailyPnL: number, unrealizedPnL: number, realizedPnL: number) => {
        clearTimeout(timeout);
        (client as any).removeListener("pnl", onPnL);
        (client as any).removeListener("pnlSingle", onPnL);
        (client as any).removeListener("error", onError);

        console.log(`[Portfolio Service] ✅ Received P&L for ${contract.symbol}: Realized=${realizedPnL}, Unrealized=${unrealizedPnL}`);
        resolve({ realizedPnL, unrealizedPnL });
      };

      const onPnLSingle = (
        reqId: number,
        pos: number,
        dailyPnL: number,
        unrealizedPnL: number,
        realizedPnL: number,
        value: number
      ) => {
        clearTimeout(timeout);
        (client as any).removeListener("pnl", onPnL);
        (client as any).removeListener("pnlSingle", onPnLSingle);
        (client as any).removeListener("error", onError);

        console.log(`[Portfolio Service] ✅ Received P&L for ${contract.symbol}: Realized=${realizedPnL}, Unrealized=${unrealizedPnL}`);
        resolve({ realizedPnL, unrealizedPnL });
      };

      const onError = (err: Error, code: number) => {
        if (code === 200 || err.message.includes("pnl") || err.message.includes("P&L")) {
          clearTimeout(timeout);
          (client as any).removeListener("pnl", onPnL);
          (client as any).removeListener("pnlSingle", onPnLSingle);
          (client as any).removeListener("error", onError);

          reject(new Error(`Failed to get P&L: ${err.message} (code: ${code})`));
        }
      };

      // Set up listeners
      (client as any).once("pnlSingle", onPnLSingle);
      (client as any).once("error", onError);

      try {
        const reqId = Math.floor(Math.random() * 10000) + 5000;
        console.log(`[Portfolio Service] Requesting P&L for ${contract.symbol}...`);
        (client as any).reqPnLSingle(
          reqId,
          accountId,
          "", // modelCode (empty = default)
          {
            conId: contract.conId,
            symbol: contract.symbol,
            secType: contract.secType,
            exchange: contract.exchange,
            currency: contract.currency,
          }
        );
      } catch (error) {
        clearTimeout(timeout);
        (client as any).removeListener("pnlSingle", onPnLSingle);
        (client as any).removeListener("error", onError);

        const err = error instanceof Error ? error : new Error(String(error));
        reject(new Error(`Failed to request P&L: ${err.message}`));
      }
    });
  }

  /**
   * Get cached positions
   */
  getCachedPositions(accountId: string = ""): Position[] {
    const positions: Position[] = [];
    for (const [key, position] of this.positionsCache.entries()) {
      if (accountId === "" || position.accountId === accountId) {
        positions.push(position);
      }
    }
    return positions;
  }
}

/**
 * Get the singleton portfolio service instance
 */
export function getIbkrPortfolioService(): IbkrPortfolioService {
  return IbkrPortfolioService.getInstance();
}

