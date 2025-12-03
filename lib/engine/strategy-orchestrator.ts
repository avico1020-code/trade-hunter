/**
 * Strategy Orchestrator
 * 
 * Centralized state management for all strategies.
 * Maintains isolated state per strategy per symbol.
 * 
 * Responsibilities:
 * - Store and retrieve strategy state
 * - Ensure isolation between strategies
 * - Support multiple strategies on same symbol
 */

import type { StrategyState, StrategyPhase } from "../strategies/strategy-state";

/**
 * State storage structure:
 * Map<strategyName, Map<symbol, StrategyState>>
 */
type StrategyStateMap = Map<string, Map<string, StrategyState>>;

export class StrategyOrchestrator {
  private stateStore: StrategyStateMap = new Map();

  /**
   * Get state for a specific strategy and symbol
   * Returns undefined if state doesn't exist
   */
  getState(strategyName: string, symbol: string): StrategyState | undefined {
    const strategyMap = this.stateStore.get(strategyName);
    if (!strategyMap) {
      return undefined;
    }
    return strategyMap.get(symbol);
  }

  /**
   * Get or create initial state for a strategy and symbol
   */
  getOrCreateState(strategyName: string, symbol: string): StrategyState {
    let strategyMap = this.stateStore.get(strategyName);
    if (!strategyMap) {
      strategyMap = new Map();
      this.stateStore.set(strategyName, strategyMap);
    }

    let state = strategyMap.get(symbol);
    if (!state) {
      state = {
        phase: "search",
        invalidated: false,
        lastUpdated: Date.now(),
      };
      strategyMap.set(symbol, state);
    }

    return state;
  }

  /**
   * Update state for a specific strategy and symbol
   * Merges partial update with existing state
   */
  updateState(
    strategyName: string,
    symbol: string,
    partialState: Partial<StrategyState>
  ): StrategyState {
    const currentState = this.getOrCreateState(strategyName, symbol);
    const updatedState: StrategyState = {
      ...currentState,
      ...partialState,
      lastUpdated: Date.now(),
    };

    const strategyMap = this.stateStore.get(strategyName);
    if (!strategyMap) {
      throw new Error(`Strategy ${strategyName} not found in orchestrator`);
    }
    strategyMap.set(symbol, updatedState);

    return updatedState;
  }

  /**
   * Reset state for a specific strategy and symbol
   * Returns to initial "search" phase
   */
  resetState(strategyName: string, symbol: string): void {
    const strategyMap = this.stateStore.get(strategyName);
    if (!strategyMap) {
      return; // Nothing to reset
    }

    strategyMap.set(symbol, {
      phase: "search",
      invalidated: false,
      lastUpdated: Date.now(),
    });
  }

  /**
   * Invalidate state for a strategy and symbol
   * Used when pattern is no longer valid
   */
  invalidateState(strategyName: string, symbol: string): void {
    this.updateState(strategyName, symbol, {
      invalidated: true,
      phase: "exit",
    });
  }

  /**
   * Clear all state for a symbol across all strategies
   * Useful when symbol is removed from universe
   */
  clearSymbolState(symbol: string): void {
    for (const strategyMap of this.stateStore.values()) {
      strategyMap.delete(symbol);
    }
  }

  /**
   * Clear all state for a strategy
   * Useful when strategy is disabled
   */
  clearStrategyState(strategyName: string): void {
    this.stateStore.delete(strategyName);
  }

  /**
   * Get all active states for a symbol (across all strategies)
   */
  getSymbolStates(symbol: string): Map<string, StrategyState> {
    const result = new Map<string, StrategyState>();
    for (const [strategyName, strategyMap] of this.stateStore.entries()) {
      const state = strategyMap.get(symbol);
      if (state) {
        result.set(strategyName, state);
      }
    }
    return result;
  }

  /**
   * Get all active states for a strategy (across all symbols)
   */
  getStrategyStates(strategyName: string): Map<string, StrategyState> {
    const strategyMap = this.stateStore.get(strategyName);
    return strategyMap ? new Map(strategyMap) : new Map();
  }

  /**
   * Check if a strategy has any active trades (phase === "active")
   */
  hasActiveTrades(strategyName: string): boolean {
    const strategyMap = this.stateStore.get(strategyName);
    if (!strategyMap) {
      return false;
    }
    for (const state of strategyMap.values()) {
      if (state.phase === "active") {
        return true;
      }
    }
    return false;
  }

  /**
   * Get count of active trades for a strategy
   */
  getActiveTradeCount(strategyName: string): number {
    const strategyMap = this.stateStore.get(strategyName);
    if (!strategyMap) {
      return 0;
    }
    let count = 0;
    for (const state of strategyMap.values()) {
      if (state.phase === "active") {
        count++;
      }
    }
    return count;
  }

  /**
   * Get all symbols with active trades for a strategy
   */
  getActiveSymbols(strategyName: string): string[] {
    const strategyMap = this.stateStore.get(strategyName);
    if (!strategyMap) {
      return [];
    }
    const symbols: string[] = [];
    for (const [symbol, state] of strategyMap.entries()) {
      if (state.phase === "active") {
        symbols.push(symbol);
      }
    }
    return symbols;
  }

  /**
   * Cleanup: Remove states that are invalidated or in exit phase for extended time
   * @param maxAgeMs - Maximum age in ms before cleanup (default: 1 hour)
   */
  cleanup(maxAgeMs: number = 60 * 60 * 1000): void {
    const now = Date.now();
    for (const [strategyName, strategyMap] of this.stateStore.entries()) {
      for (const [symbol, state] of strategyMap.entries()) {
        if (state.invalidated || state.phase === "exit") {
          const age = now - (state.lastUpdated || 0);
          if (age > maxAgeMs) {
            strategyMap.delete(symbol);
          }
        }
      }

      // Remove empty strategy maps
      if (strategyMap.size === 0) {
        this.stateStore.delete(strategyName);
      }
    }
  }

  /**
   * Get statistics for monitoring
   */
  getStats(): {
    totalStrategies: number;
    totalSymbols: number;
    activeTrades: number;
    strategyBreakdown: Record<string, { symbols: number; activeTrades: number }>;
  } {
    const strategyBreakdown: Record<string, { symbols: number; activeTrades: number }> = {};
    let totalSymbols = 0;
    let activeTrades = 0;

    for (const [strategyName, strategyMap] of this.stateStore.entries()) {
      let activeCount = 0;
      for (const state of strategyMap.values()) {
        if (state.phase === "active") {
          activeCount++;
          activeTrades++;
        }
      }
      strategyBreakdown[strategyName] = {
        symbols: strategyMap.size,
        activeTrades: activeCount,
      };
      totalSymbols += strategyMap.size;
    }

    return {
      totalStrategies: this.stateStore.size,
      totalSymbols,
      activeTrades,
      strategyBreakdown,
    };
  }
}

/**
 * Singleton instance (optional - can also be instantiated per execution engine)
 */
let defaultOrchestrator: StrategyOrchestrator | null = null;

export function getDefaultOrchestrator(): StrategyOrchestrator {
  if (!defaultOrchestrator) {
    defaultOrchestrator = new StrategyOrchestrator();
  }
  return defaultOrchestrator;
}

