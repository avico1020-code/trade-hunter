/**
 * StrategyState - Formal interface for strategy state management
 *
 * This ensures:
 * - consistent trade management across all strategies
 * - predictable execution flow
 * - safer handling of multi-strategy engines
 *
 * State is maintained PER STRATEGY PER SYMBOL.
 * Each strategy instance maintains its own state map: Map<symbol, StrategyState>
 */

export type StrategyPhase =
  | "search" // Pattern not yet detected, scanning...
  | "entry1" // Pattern found, waiting for first entry conditions
  | "entry2" // First entry executed or skipped, waiting for second entry
  | "active" // Position is open, managing trade
  | "exit"; // Exit signal triggered, closing position

export interface StrategyState {
  /**
   * Current phase of the strategy for this symbol
   */
  phase: StrategyPhase;

  /**
   * First entry price (if executed)
   */
  entry1Price?: number;

  /**
   * Second entry price (if executed)
   */
  entry2Price?: number;

  /**
   * Current stop loss level
   */
  stopLoss?: number;

  /**
   * Whether this strategy instance has been invalidated
   * (pattern no longer valid, should stop managing this symbol)
   */
  invalidated?: boolean;

  /**
   * Strategy-specific custom fields
   * Each strategy can store pattern-specific data here
   *
   * Examples:
   * - DoubleTop: { firstPeakIdx, secondPeakIdx, troughIdx, neckline }
   * - GapFill: { gapLevel, fillTarget }
   * - Breakout: { breakoutLevel, volumeConfirmation }
   */
  custom?: Record<string, any>;

  /**
   * Timestamp when state was last updated
   */
  lastUpdated?: number;
}

/**
 * Helper function to create initial state
 */
export function createInitialStrategyState(): StrategyState {
  return {
    phase: "search",
    invalidated: false,
    lastUpdated: Date.now(),
  };
}

/**
 * Helper function to validate state transition
 */
export function isValidPhaseTransition(current: StrategyPhase, next: StrategyPhase): boolean {
  // Define valid transitions
  const validTransitions: Record<StrategyPhase, StrategyPhase[]> = {
    search: ["search", "entry1", "invalidated" as StrategyPhase],
    entry1: ["entry1", "entry2", "active", "invalidated" as StrategyPhase],
    entry2: ["entry2", "active", "invalidated" as StrategyPhase],
    active: ["active", "exit", "invalidated" as StrategyPhase],
    exit: ["exit", "search"], // After exit, can start searching again
  };

  return validTransitions[current]?.includes(next) ?? false;
}
