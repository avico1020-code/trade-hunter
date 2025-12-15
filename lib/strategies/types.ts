/**
 * Shared types for strategies
 * This file contains types shared between scanner and strategies
 * to avoid circular dependencies
 */

// Basic candle structure
export interface Candle {
  time: string; // ISO or timestamp as string
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  isClosed?: boolean; // Optional: whether candle is closed
}

// Entry signal from strategy
export interface EntrySignal {
  enter: boolean;
  leg: 1 | 2; // First entry / second entry
  price?: number; // Suggested entry price (usually current close)
  refIndices?: number[]; // Relevant indices (for logging)
  meta?: Record<string, any>;
}

// Exit signal from strategy
export interface ExitSignal {
  exit: boolean;
  leg: 1 | 2;
  reason?: string;
  price?: number;
}

// Stop levels from strategy
export interface StopLevels {
  initial: number;
  trailing?: number; // Latest trailing target (if exists)
}
