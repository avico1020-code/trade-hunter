# Trading System - Issues & Improvements Needed

## 🔴 Critical Issues (Must Fix Before Production)

### 1. **Error Handling in Execution Engine**

**Problem:**
- `executeOrder()` has no try-catch - if IBKR call fails, entire `onPatternEvent()` fails
- No error recovery mechanism
- Failed orders don't log properly

**Location:** `lib/execution/execution-engine.ts:353-381`

**Fix Needed:**
```typescript
private async executeOrder(setup: TradeSetup): Promise<OrderExecutionResult | null> {
  if (setup.quantity <= 0) return null;

  try {
    if (this.config.mode === "LIVE") {
      if (!this.ibkrClient) {
        console.error("[ExecutionEngine] LIVE mode but no IBKR client defined");
        return null;
      }

      const side: "BUY" | "SELL" = setup.direction === "LONG" ? "BUY" : "SELL";

      const res = await this.ibkrClient.placeMarketOrder(
        setup.symbol,
        setup.quantity,
        side
      );
      return res;
    }

    // DEMO / BACKTEST
    return {
      orderId: undefined,
      avgFillPrice: setup.entryPrice,
      filledQuantity: setup.quantity,
    };
  } catch (error) {
    console.error("[ExecutionEngine] Order execution failed", {
      symbol: setup.symbol,
      quantity: setup.quantity,
      direction: setup.direction,
      error: error instanceof Error ? error.message : String(error),
    });
    return null; // Fail gracefully
  }
}
```

### 2. **Memory Leak - setInterval Not Cleaned**

**Problem:**
- `setInterval` in orchestrator never cleared
- If system stops, timer keeps running
- Memory leak potential

**Location:** `lib/runtime/trading-orchestrator.ts:271`

**Fix Needed:**
```typescript
async function start() {
  console.log("[TradingSystem] starting scanner...");
  await scanner.start();
  console.log("[TradingSystem] scanner started");

  // Store interval ID for cleanup
  const intervalId = setInterval(() => {
    execEngine.forceExitAllIfTime();
  }, 60_000);

  return {
    start,
    stop: () => {
      clearInterval(intervalId);
      // Add cleanup for scanner subscriptions
    },
    getOpenPositions,
    getTradeHistory,
    execEngine,
    scanner,
  };
}
```

### 3. **Race Condition - Unsynchronized Position Access**

**Problem:**
- `openPositions` array accessed without synchronization
- Multiple price updates could modify array simultaneously
- Potential data corruption

**Location:** `lib/execution/execution-engine.ts:168-236`

**Fix Needed:**
```typescript
export class ExecutionEngine {
  private openPositions: OpenPosition[] = [];
  private positionsLock = false; // Simple lock mechanism

  private async withLock<T>(fn: () => T): Promise<T> {
    while (this.positionsLock) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    this.positionsLock = true;
    try {
      return fn();
    } finally {
      this.positionsLock = false;
    }
  }

  // Use in all methods that modify openPositions
  async onPatternEvent(event: PatternFoundEvent): Promise<void> {
    return this.withLock(() => {
      // ... existing logic
    });
  }
}
```

### 4. **Price Validation Missing**

**Problem:**
- No validation for `lastPrice` (could be NaN, Infinity, negative, zero)
- Invalid prices can corrupt position calculations
- No validation for `entryPrice` / `stopLoss` from pattern

**Location:** `lib/execution/execution-engine.ts:243-261`

**Fix Needed:**
```typescript
onMarketPriceUpdate(symbol: string, lastPrice: number): void {
  // Validate price
  if (!isFinite(lastPrice) || lastPrice <= 0) {
    console.warn("[ExecutionEngine] Invalid price update", { symbol, lastPrice });
    return;
  }

  const pos = this.findPositionBySymbol(symbol);
  if (!pos) return;

  pos.lastPrice = lastPrice;
  // ... rest of logic
}
```

### 5. **Reallocation Logic Bug**

**Problem:**
- `tryRelocation()` doesn't check `relocationThresholdR` config
- Only checks if position is profitable, not if it meets R threshold
- Logic doesn't match the intended behavior

**Location:** `lib/execution/execution-engine.ts:412-445`

**Fix Needed:**
```typescript
private tryRelocation(newSetup: TradeSetup): boolean {
  if (this.openPositions.length === 0) return false;

  let candidate: OpenPosition | null = null;

  for (const pos of this.openPositions) {
    const price = newSetup.entryPrice; // Use new setup's entry price for comparison
    if (!price) continue;

    // Calculate current R-multiple for existing position
    const currentPnL = pos.direction === "LONG"
      ? (pos.lastPrice - pos.entryPrice) * pos.quantity
      : (pos.entryPrice - pos.lastPrice) * pos.quantity;
    
    const currentR = pos.riskDollars > 0 
      ? currentPnL / pos.riskDollars 
      : 0;

    // Only consider positions that meet R threshold
    if (currentR >= this.config.relocationThresholdR) {
      const profitable =
        pos.direction === "LONG"
          ? pos.lastPrice > pos.entryPrice
          : pos.lastPrice < pos.entryPrice;

      if (!profitable) continue;

      if (!candidate || pos.masterScore < candidate.masterScore) {
        candidate = pos;
      }
    }
  }

  if (!candidate) {
    return false;
  }

  this.closePosition(
    candidate,
    candidate.lastPrice || candidate.entryPrice,
    "relocation"
  );

  return true;
}
```

---

## ⚠️ Important Issues (Should Fix Soon)

### 6. **Missing Input Validation**

**Problem:**
- No validation of `ExecutionEngineConfig` values
- Invalid config could cause runtime errors
- No validation of `PatternFoundEvent` structure

**Location:** `lib/execution/execution-engine.ts:172-176`

**Fix Needed:**
```typescript
constructor(
  private config: ExecutionEngineConfig,
  private ibkrClient: IBKRClient | null,
  private strategyMap: Map<string, IPatternStrategy>
) {
  this.validateConfig();
}

private validateConfig(): void {
  if (this.config.totalAccountValue <= 0) {
    throw new Error("totalAccountValue must be positive");
  }
  if (this.config.maxExposurePct <= 0 || this.config.maxExposurePct > 100) {
    throw new Error("maxExposurePct must be between 0 and 100");
  }
  if (this.config.maxConcurrentTrades <= 0) {
    throw new Error("maxConcurrentTrades must be positive");
  }
  if (this.config.riskPerTradePct <= 0 || this.config.riskPerTradePct > 100) {
    throw new Error("riskPerTradePct must be between 0 and 100");
  }
  if (!/^\d{2}:\d{2}$/.test(this.config.latestEntryTime)) {
    throw new Error("latestEntryTime must be in HH:MM format");
  }
  if (!/^\d{2}:\d{2}$/.test(this.config.forceExitTime)) {
    throw new Error("forceExitTime must be in HH:MM format");
  }
}
```

### 7. **Time Zone Issues**

**Problem:**
- `getTimeHHMM()` uses local time, not market time
- Could cause issues with market hours detection
- No timezone awareness

**Location:** `lib/execution/execution-engine.ts:507-512`

**Fix Needed:**
```typescript
private getTimeHHMM(): string {
  // Use market time (EST/EDT for US markets)
  // TODO: Implement proper timezone handling
  const now = new Date();
  // Convert to EST/EDT (or user-configurable timezone)
  const marketTime = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const hh = String(marketTime.getHours()).padStart(2, "0");
  const mm = String(marketTime.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}
```

### 8. **Missing Stop Loss Update Logic**

**Problem:**
- No trailing stop implementation
- Stop loss never updated after entry
- Missing R-based trailing stops (mentioned in TODO but not implemented)

**Location:** `lib/execution/execution-engine.ts:256-260`

**Fix Needed:**
```typescript
onMarketPriceUpdate(symbol: string, lastPrice: number): void {
  // ... existing validation and price update ...

  // Update trailing stop if profitable
  this.updateTrailingStop(pos);

  // Check stop loss
  this.checkStopLossExit(pos);
}

private updateTrailingStop(pos: OpenPosition): void {
  if (pos.riskPerShare <= 0) return;

  // Calculate current R-multiple
  const currentPnL = pos.direction === "LONG"
    ? (pos.lastPrice - pos.entryPrice) * pos.quantity
    : (pos.entryPrice - pos.lastPrice) * pos.quantity;
  
  const currentR = currentPnL / pos.riskDollars;

  // Example: Trail stop at 2R profit
  if (currentR >= 2.0) {
    const trailDistance = pos.riskPerShare * 1.5; // Trail at 1.5R from best price
    
    if (pos.direction === "LONG") {
      const newStop = pos.bestPrice - trailDistance;
      if (newStop > pos.stopLoss) {
        pos.stopLoss = newStop;
      }
    } else {
      const newStop = pos.bestPrice + trailDistance;
      if (newStop < pos.stopLoss) {
        pos.stopLoss = newStop;
      }
    }
  }
}
```

### 9. **No Strategy-Specific Exit Logic**

**Problem:**
- Execution Engine doesn't use strategy's `exitFirst()`, `exitSecond()` methods
- Only checks stop-loss, not strategy-defined exits
- `strategyMap` passed but never used for exits

**Location:** `lib/execution/execution-engine.ts:243-261`

**Fix Needed:**
```typescript
onMarketPriceUpdate(symbol: string, lastPrice: number, candles?: Candle[], indicators?: IndicatorSnapshot): void {
  // ... existing logic ...

  // Check strategy-specific exits if candles provided
  if (candles && indicators) {
    const strategy = this.strategyMap.get(pos.strategyName);
    if (strategy) {
      // Use strategy's exit logic (future implementation)
      // For now, strategy exits handled separately
    }
  }

  this.checkStopLossExit(pos);
}
```

### 10. **Force Exit Uses Wrong Price**

**Problem:**
- `forceExitAllIfTime()` uses `pos.lastPrice || pos.entryPrice`
- If `lastPrice` not updated recently, could use stale price
- Should use current market price from price feed

**Location:** `lib/execution/execution-engine.ts:266-274`

**Fix Needed:**
```typescript
async forceExitAllIfTime(currentPriceMap?: Record<string, number>): void {
  const nowHHMM = this.getTimeHHMM();
  if (nowHHMM < this.config.forceExitTime) return;

  for (const pos of [...this.openPositions]) {
    // Use current price from map, fallback to lastPrice, then entryPrice
    const exitPrice = currentPriceMap?.[pos.symbol] 
      ?? pos.lastPrice 
      ?? pos.entryPrice;
    
    this.closePosition(pos, exitPrice, "force-close-end-of-day");
  }
}
```

---

## 💡 Enhancements & Missing Features

### 11. **No Position Persistence**

**Problem:**
- Positions only in memory
- If system crashes, positions lost
- No recovery mechanism

**Solution Needed:**
- Add database/persistent storage for positions
- Load positions on startup
- Periodic position saves

### 12. **No Order Status Tracking**

**Problem:**
- No tracking of pending orders
- No handling of partial fills
- No order cancellation logic

**Solution Needed:**
- Track order lifecycle (pending → filled → rejected)
- Handle partial fills
- Implement order cancellation

### 13. **Missing Risk Limits**

**Problem:**
- No daily loss limit
- No max drawdown protection
- No per-strategy risk limits

**Solution Needed:**
```typescript
export interface ExecutionEngineConfig {
  // ... existing fields ...
  dailyLossLimit?: number;      // Max daily loss in $
  maxDrawdownPct?: number;      // Max drawdown from peak
  maxLossPerStrategy?: number;  // Max loss per strategy per day
}
```

### 14. **No Performance Metrics**

**Problem:**
- No calculation of win rate
- No average R-multiple tracking
- No Sharpe ratio or other metrics

**Solution Needed:**
```typescript
getPerformanceMetrics(): {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  averageR: number;
  totalPnL: number;
  sharpeRatio: number; // TODO: Implement
}
```

### 15. **No Error Recovery for IBKR Disconnections**

**Problem:**
- If IBKR disconnects, system doesn't retry
- No reconnection logic
- Lost positions not detected

**Solution Needed:**
- Implement connection monitoring
- Auto-reconnect logic
- Position reconciliation on reconnect

### 16. **Price Update Frequency Unknown**

**Problem:**
- `onMarketPriceUpdate()` called manually
- No automatic price feed integration
- Could miss price updates

**Solution Needed:**
- Integrate with IBKR real-time price feed
- Automatic price updates via orchestrator
- Handle missing price updates gracefully

### 17. **No Position Size Limits Per Symbol**

**Problem:**
- Could open huge positions on single symbol
- No sector exposure limits
- No correlation limits

**Solution Needed:**
```typescript
export interface ExecutionEngineConfig {
  // ... existing fields ...
  maxPositionSizePerSymbol?: number;  // Max $ per symbol
  maxSectorExposurePct?: number;      // Max % in single sector
}
```

### 18. **Orchestrator Missing Error Handling**

**Problem:**
- `start()` function has no try-catch
- Scanner errors not caught
- No error reporting

**Solution Needed:**
```typescript
async function start() {
  try {
    console.log("[TradingSystem] starting scanner...");
    await scanner.start();
    console.log("[TradingSystem] scanner started");
    // ... rest
  } catch (error) {
    console.error("[TradingSystem] Failed to start", error);
    throw error;
  }
}
```

### 19. **No Circuit Breaker**

**Problem:**
- If too many failed orders, keeps trying
- No pause mechanism after failures
- Could drain account with repeated failures

**Solution Needed:**
- Implement circuit breaker pattern
- Pause trading after N consecutive failures
- Alert mechanism

### 20. **Missing Validation in Pattern Scanner**

**Problem:**
- No validation of `MasterSymbolInfo` structure
- No validation of candle data format
- Invalid data could crash pattern detection

**Solution Needed:**
- Add input validation in `subscribeSymbol()`
- Validate candle structure
- Handle malformed data gracefully

---

## 📋 Summary Priority List

### Immediate (Before Live Trading):
1. ✅ Add try-catch to `executeOrder()`
2. ✅ Fix memory leak in `setInterval`
3. ✅ Add price validation
4. ✅ Fix reallocation logic bug
5. ✅ Add config validation

### Important (Before Extended Testing):
6. ✅ Add trailing stops
7. ✅ Fix timezone handling
8. ✅ Add position persistence
9. ✅ Add error recovery for IBKR
10. ✅ Add risk limits (daily loss, drawdown)

### Nice to Have (Future Enhancements):
11. ✅ Add performance metrics
12. ✅ Add strategy-specific exits
13. ✅ Add position size limits per symbol
14. ✅ Add circuit breaker
15. ✅ Add order status tracking

---

**Document Version**: 1.0  
**Created**: 2025-01-20  
**Status**: Needs Implementation

