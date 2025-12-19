# Architecture Confirmation & Implementation Plan

## ✅ CONFIRMED UNDERSTANDING

I fully understand the architecture. All future code changes will follow this exact model.

---

## 📋 CURRENT CODE STATUS vs REQUIRED ARCHITECTURE

### ✅ What is CORRECT in current code:

1. **Scanner separation**
   - `TradePatternScanner` only calls `detectPattern()`
   - Scanner does NOT manage trades ✅
   - Location: `lib/scanner/trade-pattern-scanner.ts:345-415`

2. **Strategy interface**
   - `IPatternStrategy` interface exists ✅
   - `detectPattern()` method defined ✅
   - Location: `lib/scanner/trade-pattern-scanner.ts:77-95`

3. **Execution engine separation**
   - `ExecutionEngine.onPatternEvent()` receives PatternFoundEvent ✅
   - Execution engine handles entry/exit logic ✅
   - Location: `lib/execution/execution-engine.ts:279-441`

4. **Utilities layer**
   - `candle-patterns.ts` exists as shared library ✅
   - `support-resistance.ts` exists ✅
   - `stop-levels.ts` exists ✅
   - Location: `lib/strategies/candle-patterns.ts`, `support-resistance.ts`, `stop-levels.ts`

---

### ❌ What is MISSING or INCORRECT:

1. **Strategy State Management - CRITICAL**
   - ❌ No `StrategyState` interface (JUST ADDED in `lib/strategies/strategy-state.ts`)
   - ❌ Strategies don't maintain state per symbol
   - ❌ No state isolation between strategies
   - **Required**: Each strategy needs `Map<symbol, StrategyState>`

2. **IPatternStrategy interface - INCOMPLETE**
   - ✅ Has `detectPattern()` ✅
   - ❌ Missing: `entryFirst()`, `entrySecond()` methods
   - ❌ Missing: `exitFirst()`, `exitSecond()` methods
   - ❌ Missing: `stopsForEntry1()`, `stopsForEntry2()` methods
   - **Location**: `lib/scanner/trade-pattern-scanner.ts:77-95`
   - **Action**: Extend interface to include all strategy lifecycle methods

3. **Scanner dynamic universe - NOT IMPLEMENTED**
   - ❌ Scanner doesn't dynamically subscribe/unsubscribe when symbols enter/leave TOP N
   - ❌ No mechanism to update symbol universe in real-time
   - **Location**: `lib/scanner/trade-pattern-scanner.ts:255-293`
   - **Action**: Add dynamic subscription management

4. **Execution engine strategy methods - MISSING**
   - ❌ Execution engine doesn't call `strategy.entryFirst()`
   - ❌ Execution engine doesn't call `strategy.exitFirst()`
   - ❌ Execution engine uses patternState directly instead of strategy methods
   - **Location**: `lib/execution/execution-engine.ts:279-441`
   - **Action**: Execution engine must call strategy methods, not use patternState directly

5. **MasterScoringClient - STUB ONLY**
   - ❌ Returns empty array
   - ❌ No HTTP implementation
   - **Location**: `lib/runtime/trading-orchestrator.ts:48-63`
   - **Action**: Implement real HTTP client

6. **RealTimeDataClient - STUB ONLY**
   - ❌ No IBKR streaming
   - ❌ No unsubscribe mechanism
   - **Location**: `lib/runtime/trading-orchestrator.ts:69-99`
   - **Action**: Implement real streaming + cleanup

7. **Multiple strategies per symbol - PARTIAL**
   - ✅ Multiple strategies can detect patterns ✅
   - ❌ No state isolation (strategies share nothing, but state not implemented)
   - ✅ Execution engine allows one trade per strategy+symbol ✅
   - **Location**: `lib/execution/execution-engine.ts:304`

8. **MasterScore usage - CORRECT**
   - ✅ MasterScore only used as filter (minMasterScore threshold) ✅
   - ✅ MasterScore NOT used in entry/exit logic ✅
   - **Location**: `lib/scanner/trade-pattern-scanner.ts:257-259`

---

## 🔧 REQUIRED IMPLEMENTATION CHANGES

### Priority 1: Strategy State Management

**File**: `lib/strategies/strategy-state.ts` ✅ CREATED

**Changes needed**:

1. **Extend IPatternStrategy interface**
   ```typescript
   // lib/scanner/trade-pattern-scanner.ts
   export interface IPatternStrategy {
     name: string;
     direction: "LONG" | "SHORT" | "BOTH";
     
     // Scanner uses this
     detectPattern(candles: Candle[], indicators?: IndicatorSnapshot): PatternDetectionResult;
     
     // Execution engine uses these - ADD THESE:
     getState(symbol: string): StrategyState | undefined;
     setState(symbol: string, state: StrategyState): void;
     clearState(symbol: string): void;
     
     entryFirst(candles: Candle[], patternState: PatternDetectionResult): EntrySignal;
     entrySecond(candles: Candle[], patternState: PatternDetectionResult): EntrySignal;
     exitFirst(candles: Candle[], patternState: PatternDetectionResult, currentState: StrategyState): ExitSignal;
     exitSecond(candles: Candle[], patternState: PatternDetectionResult, currentState: StrategyState): ExitSignal;
     stopsForEntry1(candles: Candle[], patternState: PatternDetectionResult): StopLevels;
     stopsForEntry2(candles: Candle[], patternState: PatternDetectionResult): StopLevels;
   }
   ```

2. **Update DoubleTopStrategy to implement state management**
   ```typescript
   // lib/strategies/double-top.ts
   export class DoubleTopPatternStrategy implements IPatternStrategy {
     private stateMap = new Map<string, StrategyState>();
     
     getState(symbol: string): StrategyState | undefined {
       return this.stateMap.get(symbol);
     }
     
     setState(symbol: string, state: StrategyState): void {
       this.stateMap.set(symbol, { ...state, lastUpdated: Date.now() });
     }
     
     clearState(symbol: string): void {
       this.stateMap.delete(symbol);
     }
     
     // ... rest of methods
   }
   ```

### Priority 2: Execution Engine Strategy Integration

**File**: `lib/execution/execution-engine.ts`

**Changes needed**:

1. **Execution engine must call strategy methods, not use patternState directly**
   ```typescript
   // Current (WRONG):
   const entryPrice = event.patternState.entryPrice;  // ❌
   const stopLoss = event.patternState.stopLoss;      // ❌
   
   // Required (CORRECT):
   const strategy = this.strategyMap.get(event.strategyName);
   const currentState = strategy?.getState(event.symbol);
   const entrySignal = strategy?.entryFirst(candles, event.patternState);
   const stops = strategy?.stopsForEntry1(candles, event.patternState);
   ```

2. **Execution engine must maintain strategy state**
   ```typescript
   // After entry:
   const newState: StrategyState = {
     phase: "active",
     entry1Price: executed.avgFillPrice,
     stopLoss: stops.initial,
     custom: { /* pattern-specific data */ }
   };
   strategy.setState(event.symbol, newState);
   
   // On exit:
   strategy.setState(event.symbol, { phase: "exit", ...currentState });
   ```

### Priority 3: Scanner Dynamic Universe

**File**: `lib/scanner/trade-pattern-scanner.ts`

**Changes needed**:

1. **Track active subscriptions**
   ```typescript
   private activeSubscriptions = new Map<string, () => void>();
   
   async updateSymbolUniverse(newTopN: MasterSymbolInfo[]): Promise<void> {
     const currentSymbols = new Set(this.activeSubscriptions.keys());
     const newSymbols = new Set(newTopN.map(s => s.symbol));
     
     // Unsubscribe from symbols that left TOP N
     for (const symbol of currentSymbols) {
       if (!newSymbols.has(symbol)) {
         const unsubscribe = this.activeSubscriptions.get(symbol);
         unsubscribe?.();
         this.activeSubscriptions.delete(symbol);
       }
     }
     
     // Subscribe to new symbols
     for (const info of newTopN) {
       if (!currentSymbols.has(info.symbol)) {
         this.subscribeSymbol(info);
       }
     }
   }
   ```

2. **RealTimeDataClient must return unsubscribe function**
   ```typescript
   // lib/scanner/trade-pattern-scanner.ts
   export interface RealTimeDataClient {
     subscribeCandles(
       symbol: string,
       onUpdate: (candles: Candle[], indicators: IndicatorSnapshot) => void
     ): () => void; // Return unsubscribe function
   }
   ```

---

## 📐 ARCHITECTURE FLOW DIAGRAM

```
┌─────────────────────────────────────────────────────────────┐
│ 1. MASTER SCORING (Python - Continuous Loop)               │
│    ├─ News Module → score                                   │
│    ├─ Technical Module → score                              │
│    ├─ Macro Module → score                                  │
│    └─ Aggregate → masterScore + direction                   │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌────────────────────────┴────────────────────────────────────┐
│ 2. SCANNER INPUT = TOP N (Dynamic Universe)                │
│    - Symbol enters TOP N → start scanning                  │
│    - Symbol leaves TOP N → stop scanning                   │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌────────────────────────┴────────────────────────────────────┐
│ 3. PATTERN SCANNER                                          │
│    For each symbol in TOP N:                               │
│      For each strategy:                                    │
│        if (strategy.detectPattern(candles))                │
│          emit PatternFoundEvent(symbol, strategy, state)   │
│                                                             │
│    Uses: utilities (candle patterns, S/R)                  │
│    Does NOT: manage trades, entry/exit, orders            │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌────────────────────────┴────────────────────────────────────┐
│ 4. EXECUTION ENGINE                                         │
│    Receives PatternFoundEvent:                             │
│      1. Get strategy state: strategy.getState(symbol)      │
│      2. Check entry: strategy.entryFirst(candles, state)   │
│      3. Calculate stops: strategy.stopsForEntry1(...)      │
│      4. Place order via IBKR                               │
│      5. Update state: strategy.setState(symbol, newState)  │
│                                                             │
│    On price update:                                         │
│      1. Get strategy state                                 │
│      2. Check exit: strategy.exitFirst(candles, state)     │
│      3. If exit → close position                           │
│      4. Update state                                       │
│                                                             │
│    Uses: utilities (candle patterns, S/R)                  │
│    Enforces: max capital %, hours, forced close            │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌────────────────────────┴────────────────────────────────────┐
│ 5. STRATEGY STATE (Per Strategy Per Symbol)                │
│    DoubleTop:                                              │
│      "AAPL" → { phase: "active", entry1Price: 150, ... }  │
│      "MSFT" → { phase: "entry1", ... }                    │
│                                                             │
│    GapFill:                                                │
│      "AAPL" → { phase: "search", ... }                    │
│      "GOOGL" → { phase: "active", ... }                   │
└─────────────────────────────────────────────────────────────┘
```

---

## ✅ CONFIRMATION CHECKLIST

- [x] Master Scoring is ONLY a filter (doesn't affect entry/exit)
- [x] Scanner ONLY detects patterns (doesn't manage trades)
- [x] Execution Engine is a state machine (manages trades)
- [x] Strategies must maintain state per symbol
- [x] Multiple strategies can run on same symbol independently
- [x] Utilities is shared library (not decision engine)
- [x] MasterScore never overrides strategy logic
- [x] StrategyState interface required (CREATED)
- [ ] IPatternStrategy extended with lifecycle methods (TODO)
- [ ] Execution engine calls strategy methods (TODO)
- [ ] Scanner dynamic universe management (TODO)
- [ ] MasterScoringClient implementation (TODO)
- [ ] RealTimeDataClient implementation (TODO)

---

## 🎯 NEXT STEPS

1. ✅ Create StrategyState interface
2. ⏭️ Extend IPatternStrategy interface
3. ⏭️ Implement state management in DoubleTopStrategy
4. ⏭️ Update ExecutionEngine to call strategy methods
5. ⏭️ Add dynamic universe management to Scanner
6. ⏭️ Implement MasterScoringClient
7. ⏭️ Implement RealTimeDataClient

---

**All future code will follow this architecture exactly.**

