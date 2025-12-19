/**
 * Simulation System - Phase 8
 *
 * Provides simulation/replay functionality for testing trading strategies
 * with historical or synthetic market data
 */

export interface SimulationTick {
  symbol: string;
  timestamp: number; // Unix timestamp in milliseconds
  price: number;
  volume: number;
  // Additional fields can be added as needed
}

export interface LoadSimulationDataOptions {
  datasetId: string;
  symbols?: string[];
}

export interface SimulationControllerOptions {
  playbackSpeed: number; // Multiplier for time (e.g., 10 = 10x faster)
  ticks: SimulationTick[];
}

/**
 * Load simulation data from a dataset
 *
 * @param options - Configuration for loading simulation data
 * @returns Promise resolving to array of simulation ticks
 */
export async function loadSimulationData(
  options: LoadSimulationDataOptions
): Promise<SimulationTick[]> {
  const { datasetId, symbols } = options;

  console.log(
    `[Simulation] Loading dataset "${datasetId}"${symbols ? ` for symbols: ${symbols.join(", ")}` : ""}`
  );

  // TODO: Implement actual data loading from:
  // - Convex database (simulation datasets table)
  // - File system (JSON/CSV files)
  // - External API
  // - Generated synthetic data

  // For now, return empty array (system will work but with no simulation data)
  // This allows the system to start without errors
  console.warn(
    `[Simulation] ⚠️ Simulation data loading not yet implemented. Returning empty dataset.`
  );

  return [];
}

/**
 * Simulation Controller - Manages playback of simulation data
 *
 * Controls the replay speed and timing of simulation ticks
 */
export class SimulationController {
  private options: SimulationControllerOptions;
  private isPlaying: boolean = false;
  private currentTickIndex: number = 0;
  private playbackInterval: NodeJS.Timeout | null = null;
  private startTime: number = 0;
  private realStartTime: number = 0;

  constructor(options: SimulationControllerOptions) {
    this.options = options;
  }

  /**
   * Start the simulation playback
   */
  start(): void {
    if (this.isPlaying) {
      console.warn(`[Simulation] Already playing, ignoring start() call`);
      return;
    }

    if (this.options.ticks.length === 0) {
      console.warn(`[Simulation] No ticks to play`);
      return;
    }

    this.isPlaying = true;
    this.currentTickIndex = 0;
    this.realStartTime = Date.now();

    // Sort ticks by timestamp if not already sorted
    const sortedTicks = [...this.options.ticks].sort(
      (a, b) => a.timestamp - b.timestamp
    );

    // Calculate first tick's relative time
    const firstTickTime = sortedTicks[0].timestamp;

    console.log(
      `[Simulation] 🎮 Starting playback: ${sortedTicks.length} ticks at ${this.options.playbackSpeed}x speed`
    );

    // Process ticks at accelerated rate
    const processNextTick = () => {
      if (this.currentTickIndex >= sortedTicks.length) {
        this.stop();
        console.log(`[Simulation] ✅ Playback complete`);
        return;
      }

      const tick = sortedTicks[this.currentTickIndex];
      const tickRelativeTime = tick.timestamp - firstTickTime;
      const realTimeElapsed = Date.now() - this.realStartTime;
      const expectedRealTime = tickRelativeTime / this.options.playbackSpeed;

      if (realTimeElapsed >= expectedRealTime) {
        // Emit tick (TODO: Connect to MarketDataHub or event system)
        this.emitTick(tick);
        this.currentTickIndex++;

        // Schedule next tick
        if (this.currentTickIndex < sortedTicks.length) {
          const nextTick = sortedTicks[this.currentTickIndex];
          const nextTickRelativeTime = nextTick.timestamp - firstTickTime;
          const nextExpectedRealTime = nextTickRelativeTime / this.options.playbackSpeed;
          const delay = Math.max(0, nextExpectedRealTime - realTimeElapsed);

          this.playbackInterval = setTimeout(processNextTick, delay);
        } else {
          this.stop();
        }
      } else {
        // Wait until it's time for the next tick
        const delay = expectedRealTime - realTimeElapsed;
        this.playbackInterval = setTimeout(processNextTick, delay);
      }
    };

    // Start processing
    processNextTick();
  }

  /**
   * Stop the simulation playback
   */
  stop(): void {
    if (!this.isPlaying) {
      return;
    }

    this.isPlaying = false;

    if (this.playbackInterval) {
      clearTimeout(this.playbackInterval);
      this.playbackInterval = null;
    }

    console.log(`[Simulation] ⏹️ Playback stopped at tick ${this.currentTickIndex}`);
  }

  /**
   * Pause the simulation (if playing)
   */
  pause(): void {
    if (this.isPlaying) {
      this.stop();
      console.log(`[Simulation] ⏸️ Playback paused`);
    }
  }

  /**
   * Resume the simulation (if paused)
   */
  resume(): void {
    if (!this.isPlaying && this.currentTickIndex < this.options.ticks.length) {
      this.start();
    }
  }

  /**
   * Step forward by a specified number of ticks (for manual control)
   */
  step(count: number = 1): void {
    if (this.options.ticks.length === 0) {
      console.warn(`[Simulation] No ticks to step through`);
      return;
    }

    const sortedTicks = [...this.options.ticks].sort(
      (a, b) => a.timestamp - b.timestamp
    );

    for (let i = 0; i < count && this.currentTickIndex < sortedTicks.length; i++) {
      const tick = sortedTicks[this.currentTickIndex];
      this.emitTick(tick);
      this.currentTickIndex++;
    }

    console.log(
      `[Simulation] ⏭️ Stepped forward ${count} tick(s). Current position: ${this.currentTickIndex}/${sortedTicks.length}`
    );
  }

  /**
   * Get current playback status
   */
  getStatus(): {
    isPlaying: boolean;
    currentTick: number;
    totalTicks: number;
    playbackSpeed: number;
  } {
    return {
      isPlaying: this.isPlaying,
      currentTick: this.currentTickIndex,
      totalTicks: this.options.ticks.length,
      playbackSpeed: this.options.playbackSpeed,
    };
  }

  /**
   * Emit a tick to the market data system
   * TODO: Connect this to MarketDataHub or event system
   */
  private emitTick(tick: SimulationTick): void {
    // TODO: Integrate with MarketDataHub to inject ticks
    // For now, just log
    if (this.currentTickIndex % 100 === 0) {
      // Log every 100th tick to avoid spam
      console.log(
        `[Simulation] Tick ${this.currentTickIndex + 1}/${this.options.ticks.length}: ${tick.symbol} @ $${tick.price.toFixed(2)}`
      );
    }
  }
}

// Singleton for simulation controller (accessible via API routes)
let simulationControllerInstance: SimulationController | null = null;

/**
 * Set the global simulation controller instance
 *
 * @param controller - The simulation controller to set
 */
export function setSimulationController(controller: SimulationController): void {
  simulationControllerInstance = controller;
  console.log(`[Simulation] Controller set globally`);
}

/**
 * Get the current simulation controller instance
 *
 * @returns The current controller, or null if not set
 */
export function getSimulationController(): SimulationController | null {
  return simulationControllerInstance;
}

