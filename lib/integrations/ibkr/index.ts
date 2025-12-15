/**
 * IBKR Gateway Streaming Integration - Main Export
 *
 * Phase 2: Real-time market data streaming from IB Gateway
 * Phase 7: Added getIbkrConnection singleton function for health monitoring
 */

export { getIbkrConnection, IbkrConnection } from "./IbkrConnection";
export { IbkrMarketData } from "./IbkrMarketData";
export type * from "./types";
