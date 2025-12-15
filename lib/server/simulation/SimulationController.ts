/**
 * Simulation Controller - Phase 8
 *
 * Replays historical or synthetic ticks into MarketDataHub for testing/debugging
 * without requiring a live IBKR connection
 */

import type { MarketTick } from "../market-data";
import { getMarketDataHub } from "../market-data";

/**
 * Simulation tick format
 * Represents a historical or synthetic market tick
 */
export interface SimulationTick {
  symbol: string;
  price: number;
  size?: number;
  ts: number; // original timestamp of the tick (unix ms)
}

/**
 * Simulation Controller
 *
 * Loads historical ticks and replays them into MarketDataHub at controlled speed
 */
export class SimulationController {
  private isRunning = false;
  private playbackSpeed: number; // 1 = real-time, >1 = faster, <1 = slower
  private ticks: SimulationTick[] = [];
  private currentIndex = 0;
  private timeoutId: NodeJS.Timeout | null = null;
  private hub = getMarketDataHub();
  private startTime: number | null = null; // When playback started (real time)
  private simulationStartTs: number | null = null; // First tick timestamp in simulation time

  constructor(opts: { playbackSpeed?: number; ticks: SimulationTick[] }) {
    this.playbackSpeed = opts.playbackSpeed ?? 1;

    // Sort ticks by timestamp to ensure chronological order
    this.ticks = [...opts.ticks].sort((a, b) => a.ts - b.ts);

    console.log(
      `[SimulationController] Initialized with ${this.ticks.length} ticks, ` +
        `playback speed: ${this.playbackSpeed}x`
    );
  }

  /**
   * Start replaying ticks into MarketDataHub
   */
  public start(): void {
    if (this.isRunning) {
      console.warn(`[SimulationController] Already running`);
      return;
    }

    if (this.ticks.length === 0) {
      console.warn(`[SimulationController] No ticks to replay`);
      return;
    }

    this.isRunning = true;
    this.currentIndex = 0;
    this.startTime = Date.now();
    this.simulationStartTs = this.ticks[0].ts;

    console.log(
      `[SimulationController] 🚀 Starting simulation replay at ${new Date().toISOString()}`
    );
    console.log(
      `[SimulationController] First tick: ${new Date(this.simulationStartTs).toISOString()}, ` +
        `Last tick: ${new Date(this.ticks[this.ticks.length - 1].ts).toISOString()}`
    );

    this.scheduleNext();
  }

  /**
   * Stop replaying ticks
   */
  public stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    console.log(
      `[SimulationController] ⏹️  Stopped simulation at index ${this.currentIndex}/${this.ticks.length}`
    );
  }

  /**
   * Step forward by N ticks in "manual" mode (sends ticks immediately without delays)
   * Useful for debugging or step-by-step replay
   *
   * @param count Number of ticks to advance (default: 1)
   */
  public step(count: number = 1): void {
    if (this.isRunning) {
      console.warn(`[SimulationController] Cannot step while running. Stop first.`);
      return;
    }

    const endIndex = Math.min(this.currentIndex + count, this.ticks.length);
    const ticksToSend = this.ticks.slice(this.currentIndex, endIndex);

    for (const tick of ticksToSend) {
      this.sendTickToHub(tick);
    }

    this.currentIndex = endIndex;

    if (this.currentIndex >= this.ticks.length) {
      console.log(`[SimulationController] ✅ Reached end of simulation data`);
    } else {
      console.log(
        `[SimulationController] Stepped forward ${ticksToSend.length} ticks ` +
          `(${this.currentIndex}/${this.ticks.length})`
      );
    }
  }

  /**
   * Get current simulation status
   */
  public getStatus() {
    return {
      isRunning: this.isRunning,
      currentIndex: this.currentIndex,
      totalTicks: this.ticks.length,
      progress: this.ticks.length > 0 ? (this.currentIndex / this.ticks.length) * 100 : 0,
      playbackSpeed: this.playbackSpeed,
      currentTick: this.currentIndex < this.ticks.length ? this.ticks[this.currentIndex] : null,
    };
  }

  /**
   * Schedule the next tick to be sent
   */
  private scheduleNext(): void {
    if (!this.isRunning || this.currentIndex >= this.ticks.length) {
      this.isRunning = false;
      console.log(
        `[SimulationController] ✅ Simulation completed! Processed ${this.currentIndex} ticks`
      );
      return;
    }

    const tick = this.ticks[this.currentIndex];
    this.sendTickToHub(tick);

    this.currentIndex++;

    // Check if we've reached the end
    if (this.currentIndex >= this.ticks.length) {
      this.isRunning = false;
      console.log(
        `[SimulationController] ✅ Simulation completed! Processed ${this.currentIndex} ticks`
      );
      return;
    }

    const nextTick = this.ticks[this.currentIndex];

    // Compute delay between ticks in "simulation time"
    // Adjust by playback speed
    const deltaOriginal = nextTick.ts - tick.ts;
    const delayMs = Math.max(1, deltaOriginal / this.playbackSpeed);

    // Schedule next tick
    this.timeoutId = setTimeout(() => {
      this.scheduleNext();
    }, delayMs);
  }

  /**
   * Send a tick to MarketDataHub
   */
  private sendTickToHub(tick: SimulationTick): void {
    const marketTick: MarketTick = {
      symbol: tick.symbol,
      price: tick.price,
      size: tick.size ?? 0,
      ts: tick.ts,
    };

    this.hub.handleTick(marketTick);
  }
}
