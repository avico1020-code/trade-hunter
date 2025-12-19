/**
 * Trading System Initialization - Phase 8
 *
 * Main entry point for initializing the trading system in either live or simulation mode
 */

import { getIbkrConnection, IbkrMarketData } from "@/lib/integrations/ibkr";
import { runIntradayBackfillForToday } from "./market-data/backfillIntraday";
import { loadSimulationData, SimulationController, setSimulationController } from "./simulation";
import { getTradingMode, isSimulationMode } from "./tradingConfig";

let tradingSystemInitialized = false;

/**
 * Initialize the trading system based on the configured mode
 *
 * In "live" mode: starts IBKR streaming connection
 * In "simulation" mode: loads simulation data and starts replay
 *
 * This should be called once on server startup
 */
export async function initTradingSystem(): Promise<void> {
  if (tradingSystemInitialized) {
    console.log(`[Trading System] Already initialized, skipping...`);
    return;
  }

  tradingSystemInitialized = true;

  const mode = getTradingMode();
  console.log(`[Trading System] 🚀 Initializing trading system in "${mode}" mode...`);

  // Always run backfill so strategies have history (for "today") if relevant
  // This is safe in simulation mode too - it will just load empty data if no bars exist
  console.log(`[Trading System] Running intraday backfill...`);
  await runIntradayBackfillForToday();

  if (mode === "live") {
    await startLiveMode();
  } else if (mode === "simulation") {
    await startSimulationMode();
  } else {
    console.warn(`[Trading System] ⚠️ Unknown mode "${mode}", defaulting to live mode`);
    await startLiveMode();
  }

  console.log(`[Trading System] ✅ Trading system initialized in "${mode}" mode`);
}

/**
 * Start the system in live mode with IBKR streaming
 */
async function startLiveMode(): Promise<void> {
  console.log(`[Trading System] 🔴 Starting LIVE mode with IBKR streaming...`);

  try {
    // Get IBKR connection singleton
    const connection = getIbkrConnection();

    // Attempt to connect (but don't block - connection can happen asynchronously)
    connection.connect().catch((err) => {
      console.error(`[Trading System] ❌ Failed to connect IBKR in live mode:`, err);
      // Don't throw - the connection can retry later
    });

    // Note: Symbol subscriptions will be handled by IbkrMarketData when needed
    // The connection is now ready to accept subscriptions via API routes or other triggers
    console.log(`[Trading System] ✅ IBKR connection initiated (async)`);
  } catch (err) {
    console.error(`[Trading System] ❌ Error starting live mode:`, err);
    // Don't throw - allow system to continue even if IBKR fails
  }
}

/**
 * Start the system in simulation mode with historical/synthetic data replay
 */
async function startSimulationMode(): Promise<void> {
  console.log(`[Trading System] 🎮 Starting SIMULATION mode...`);

  try {
    // Load simulation data
    const datasetId = process.env.SIMULATION_DATASET_ID ?? "default";
    const playbackSpeed = Number(process.env.SIMULATION_SPEED ?? "10"); // Default 10x faster

    console.log(
      `[Trading System] Loading simulation dataset: "${datasetId}", speed: ${playbackSpeed}x`
    );

    const ticks = await loadSimulationData({
      datasetId,
      symbols: process.env.SIMULATION_SYMBOLS
        ? process.env.SIMULATION_SYMBOLS.split(",").map((s) => s.trim())
        : undefined,
    });

    if (ticks.length === 0) {
      console.warn(
        `[Trading System] ⚠️ No simulation ticks loaded. System will run with empty data.`
      );
      return;
    }

    // Create and start simulation controller
    const controller = new SimulationController({
      playbackSpeed,
      ticks,
    });

    // Store controller in singleton for API access
    setSimulationController(controller);

    // Start replay
    controller.start();

    console.log(
      `[Trading System] ✅ Simulation started with ${ticks.length} ticks at ${playbackSpeed}x speed`
    );
  } catch (err) {
    console.error(`[Trading System] ❌ Error starting simulation mode:`, err);
    // Don't throw - allow system to continue even if simulation setup fails
  }
}

/**
 * Check if trading system is initialized
 */
export function isTradingSystemInitialized(): boolean {
  return tradingSystemInitialized;
}
