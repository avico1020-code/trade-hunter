/**
 * Trading System Configuration - Phase 8
 * 
 * Defines runtime configuration for the trading system, including mode selection
 * (live vs simulation)
 */

export type TradingMode = "live" | "simulation";

/**
 * Get the current trading mode from environment variable
 * 
 * @returns "simulation" if TRADING_MODE=simulation, otherwise "live"
 */
export function getTradingMode(): TradingMode {
  const mode = process.env.TRADING_MODE;
  if (mode === "simulation") {
    return "simulation";
  }
  return "live";
}

/**
 * Check if the system is running in simulation mode
 * 
 * @returns true if mode is "simulation"
 */
export function isSimulationMode(): boolean {
  return getTradingMode() === "simulation";
}

