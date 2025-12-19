/**
 * IBKR Integration Layer - Legacy Export Wrapper
 *
 * This file provides backward compatibility by re-exporting
 * the IBKR connection manager with the old function name
 */

import { getIbkrConnectionManager, IbkrConnectionManager } from "@/lib/server/ibkr";

/**
 * Legacy function name for getting IBKR connection manager
 * @deprecated Use getIbkrConnectionManager from @/lib/server/ibkr instead
 */
export function getIbkrConnection(): IbkrConnectionManager {
  return getIbkrConnectionManager();
}

/**
 * Re-export IbkrMarketData for backward compatibility
 * @deprecated Import directly from @/lib/server/ibkr instead
 */
export { IbkrMarketDataService as IbkrMarketData } from "@/lib/server/ibkr";

// Re-export all other IBKR services for convenience
export * from "@/lib/server/ibkr";

