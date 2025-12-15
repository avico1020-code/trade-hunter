/**
 * IBKR Integration Layer - Account Service
 *
 * Manages account information and updates
 * - Account summary (net liquidation, cash, buying power, margin)
 * - Account updates subscription
 */

import { getIbkrConnectionManager } from "./IbkrConnectionManager";
import type { AccountSummary } from "./types";

export class IbkrAccountService {
  private static instance: IbkrAccountService | null = null;
  private accountSummaryCache: Map<string, AccountSummary> = new Map(); // keyed by accountId
  private subscribedAccounts: Set<string> = new Set();

  private constructor() {}

  static getInstance(): IbkrAccountService {
    if (!IbkrAccountService.instance) {
      IbkrAccountService.instance = new IbkrAccountService();
    }
    return IbkrAccountService.instance;
  }

  /**
   * Get account summary for an account
   * @param accountId Account ID (empty string = all accounts)
   * @returns Account summary
   */
  async getAccountSummary(accountId: string = ""): Promise<AccountSummary> {
    const connectionManager = getIbkrConnectionManager();
    await connectionManager.ensureConnected();
    const client = connectionManager.getClient();

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(
          new Error(`Account summary timeout for ${accountId || "all accounts"} after 10 seconds`)
        );
      }, 10000);

      const summary: Partial<AccountSummary> = {
        accountId: accountId || "ALL",
        netLiquidation: null,
        totalCashValue: null,
        buyingPower: null,
        grossPositionValue: null,
        realizedPnL: null,
        unrealizedPnL: null,
        availableFunds: null,
        excessLiquidity: null,
        marginUsed: null,
      };

      let fieldsReceived = 0;
      const requiredFields = [
        "NetLiquidation",
        "TotalCashValue",
        "BuyingPower",
        "GrossPositionValue",
        "RealizedPnL",
        "UnrealizedPnL",
        "AvailableFunds",
        "ExcessLiquidity",
      ];

      const onAccountSummary = (
        reqId: number,
        account: string,
        tag: string,
        value: string,
        currency: string
      ) => {
        if (account !== accountId && accountId !== "") return;

        // Map IBKR tags to our summary fields
        switch (tag) {
          case "NetLiquidation":
            summary.netLiquidation = parseFloat(value);
            fieldsReceived++;
            break;
          case "TotalCashValue":
            summary.totalCashValue = parseFloat(value);
            fieldsReceived++;
            break;
          case "BuyingPower":
            summary.buyingPower = parseFloat(value);
            fieldsReceived++;
            break;
          case "GrossPositionValue":
            summary.grossPositionValue = parseFloat(value);
            fieldsReceived++;
            break;
          case "RealizedPnL":
            summary.realizedPnL = parseFloat(value);
            fieldsReceived++;
            break;
          case "UnrealizedPnL":
            summary.unrealizedPnL = parseFloat(value);
            fieldsReceived++;
            break;
          case "AvailableFunds":
            summary.availableFunds = parseFloat(value);
            fieldsReceived++;
            break;
          case "ExcessLiquidity":
            summary.excessLiquidity = parseFloat(value);
            fieldsReceived++;
            break;
        }

        // Calculate margin used if we have the data
        if (summary.netLiquidation !== null && summary.availableFunds !== null) {
          summary.marginUsed = summary.netLiquidation - summary.availableFunds;
        }
      };

      const onAccountSummaryEnd = (reqId: number) => {
        clearTimeout(timeout);
        (client as any).removeListener("accountSummary", onAccountSummary);
        (client as any).removeListener("accountSummaryEnd", onAccountSummaryEnd);
        (client as any).removeListener("error", onError);

        if (fieldsReceived === 0) {
          reject(new Error(`No account summary data received for ${accountId || "all accounts"}`));
          return;
        }

        const finalSummary = summary as AccountSummary;
        this.accountSummaryCache.set(accountId || "ALL", finalSummary);

        console.log(
          `[Account Service] ✅ Received account summary for ${accountId || "all accounts"}`
        );
        resolve(finalSummary);
      };

      const onError = (err: Error, code: number) => {
        if (code === 321 || code === 200 || err.message.includes("account")) {
          clearTimeout(timeout);
          (client as any).removeListener("accountSummary", onAccountSummary);
          (client as any).removeListener("accountSummaryEnd", onAccountSummaryEnd);
          (client as any).removeListener("error", onError);

          reject(new Error(`Failed to get account summary: ${err.message} (code: ${code})`));
        }
      };

      // Set up listeners
      (client as any).once("accountSummary", onAccountSummary);
      (client as any).once("accountSummaryEnd", onAccountSummaryEnd);
      (client as any).once("error", onError);

      try {
        // Build tags string from required fields
        const tags = requiredFields.join(",");
        console.log(
          `[Account Service] Requesting account summary for ${accountId || "all accounts"} with tags: ${tags}`
        );
        // reqAccountSummary(reqId, group, tags, accountId)
        (client as any).reqAccountSummary(0, "All", tags, accountId);
      } catch (error) {
        clearTimeout(timeout);
        (client as any).removeListener("accountSummary", onAccountSummary);
        (client as any).removeListener("accountSummaryEnd", onAccountSummaryEnd);
        (client as any).removeListener("error", onError);

        const err = error instanceof Error ? error : new Error(String(error));
        reject(new Error(`Failed to request account summary: ${err.message}`));
      }
    });
  }

  /**
   * Subscribe to account updates
   * @param accountId Account ID (empty string = all accounts)
   */
  async subscribeAccountUpdates(accountId: string = ""): Promise<void> {
    if (this.subscribedAccounts.has(accountId || "ALL")) {
      console.log(`[Account Service] Already subscribed to ${accountId || "all accounts"}`);
      return;
    }

    const connectionManager = getIbkrConnectionManager();
    await connectionManager.ensureConnected();
    const client = connectionManager.getClient();

    try {
      console.log(
        `[Account Service] Subscribing to account updates for ${accountId || "all accounts"}...`
      );
      (client as any).reqAccountUpdates(true, accountId); // true = subscribe
      this.subscribedAccounts.add(accountId || "ALL");

      // Set up account value handler
      client.on(
        "accountValue",
        (key: string, val: string, currency: string, accountName: string) => {
          // Update cache when account values change
          if (accountId === "" || accountName === accountId) {
            // Trigger cache refresh
            this.accountSummaryCache.delete(accountId || "ALL");
          }
        }
      );
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      throw new Error(`Failed to subscribe to account updates: ${err.message}`);
    }
  }

  /**
   * Unsubscribe from account updates
   * @param accountId Account ID (empty string = all accounts)
   */
  unsubscribeAccountUpdates(accountId: string = ""): void {
    if (!this.subscribedAccounts.has(accountId || "ALL")) {
      return;
    }

    const connectionManager = getIbkrConnectionManager();
    if (!connectionManager.isConnected()) {
      return;
    }

    try {
      const client = connectionManager.getClient();
      console.log(
        `[Account Service] Unsubscribing from account updates for ${accountId || "all accounts"}...`
      );
      (client as any).reqAccountUpdates(false, accountId); // false = unsubscribe
      this.subscribedAccounts.delete(accountId || "ALL");
    } catch (error) {
      console.error(`[Account Service] Error unsubscribing from account updates:`, error);
    }
  }

  /**
   * Get cached account summary
   */
  getCachedAccountSummary(accountId: string = ""): AccountSummary | null {
    return this.accountSummaryCache.get(accountId || "ALL") || null;
  }
}

/**
 * Get the singleton account service instance
 */
export function getIbkrAccountService(): IbkrAccountService {
  return IbkrAccountService.getInstance();
}
