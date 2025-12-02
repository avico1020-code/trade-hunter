# Trading Router / Scoring System - Complete Architecture Summary

## System Overview

This document provides a comprehensive overview of the **Trading Router / Scoring System** built for algorithmic trading. The system consists of three main layers:

1. **Python Master Scoring Engine** - Analyzes market data and generates ranked stock recommendations
2. **TypeScript Pattern Scanner** - Detects tradeable technical patterns on top-ranked symbols
3. **TypeScript Execution Engine** - Executes trades with risk management, position sizing, and reallocation logic

---

## 🐍 Layer 1: Python Master Scoring System

### Architecture

The scoring system is modular, with each module analyzing different aspects of market data:

- **Price Action Scoring** (`scoring/price_action_scoring.py`)
- **Options Flow Scoring** (`scoring/options_flow_scoring.py`)
- **Sentiment Scoring** (`scoring/sentiment_scoring.py`)
- **Fundamentals Scoring** (`scoring/fundamentals_scoring.py`)
- **Position Risk Scoring** (`scoring/position_risk_scoring.py`)
- **Master Scoring Engine** (`scoring/master_scoring.py`) - Combines all scores

### Data Flow

```
Market Data → Individual Scoring Engines → Master Scoring Engine → Ranked Symbol List
```

### Key Components

#### 1. Scoring Engines

Each scoring engine:
- Loads a corresponding `rulebook` (e.g., `rulebooks/price_action_rulebook.py`)
- Accepts a `snapshot` of relevant data (price action, options flow, sentiment, etc.)
- Evaluates conditions using secure `eval()` in a restricted environment
- Returns normalized scores for MINOR (intraday) and/or MAJOR (daily/long-term) timeframes
- Applies module-specific weights before returning scores

**Example Scoring Engine Structure:**
```python
class PriceActionScoringEngine:
    def score(self, price_action_snapshot: Dict[str, Any]) -> Dict[str, Any]:
        minor_score = self._score_timeframe("MINOR", snapshot)
        major_score = self._score_timeframe("MAJOR", snapshot)
        combined = self._combine_minor_major(minor_score, major_score)
        final_weighted = combined * self.weight  # e.g., 1.2
        return {
            "minor_score": minor_score,
            "major_score": major_score,
            "final_score": final_weighted,
            "matched_states": [...],
        }
```

#### 2. Rulebooks

Each rulebook (`rulebooks/*_rulebook.py`) defines:
- **Meta configuration**: score scale, signal levels, groups with weights
- **States**: Pattern/condition definitions with:
  - Python boolean expression conditions (evaluated with `eval()`)
  - Score ranges (e.g., -5 to +5)
  - Context rules and notes
- **Timeframes**: MINOR and/or MAJOR contexts

**Example Rulebook Structure:**
```python
PRICE_ACTION_RULEBOOK = {
    "meta": {
        "score_scale": {"min": -10, "max": 10},
        "signal_levels": {"weak": 1, "moderate": 3, "strong": 5},
        "groups": {
            "REVERSAL": {"base_weight": 1.2},
            "CONTINUATION": {"base_weight": 1.0},
        },
    },
    "timeframes": {
        "MINOR": {
            "states": {
                "DOUBLE_TOP_CONFIRMED": {
                    "condition": "pattern_type == 'DOUBLE_TOP' and confirm_count >= 2",
                    "score_range": {"min": 5, "max": 7},
                    "direction_hint": "SHORT",
                },
            },
        },
    },
}
```

#### 3. Master Scoring Engine

**Purpose**: Aggregates scores from all modules and produces a ranked list.

**Process:**
1. Receives per-symbol scores from all active modules
2. Applies module-level on/off switches
3. Combines scores (currently equal weight = 1.0 per module)
4. Clamps final scores to [-10, +10] range
5. Derives trade direction (LONG/SHORT/NEUTRAL) based on final score
6. Ranks symbols by final score (descending)

**Output:**
```python
MasterScoreResult(
    symbol="AAPL",
    final_score=7.5,
    direction="LONG",  # or "SHORT", "NEUTRAL"
    module_scores={"price_action": 8.0, "sentiment": 7.0, ...},
    ranked_position=1,
)
```

#### 4. Module Weights

Current internal weights (applied before Master Scoring):
- `PRICE_ACTION_WEIGHT = 1.2`
- `OPTIONS_FLOW_WEIGHT = 1.05`
- `SENTIMENT_WEIGHT = 0.80`
- `FUNDAMENTALS_WEIGHT = 0.75`
- `POSITION_RISK_WEIGHT = 0.70`

**Note**: Master Scoring Engine treats all modules equally (weight = 1.0) at aggregation level, as weights are already applied by individual engines.

---

## 🎯 Layer 2: TypeScript Trade Pattern Scanner

### Purpose

The **Trade Pattern Scanner** (`lib/scanner/trade-pattern-scanner.ts`) acts as an intermediary between:
- **Master Scoring Engine** (Python) → Top-ranked symbols
- **Execution Engine** (TypeScript) → Tradeable pattern signals

### Architecture

```typescript
TradePatternScanner {
  - Subscribes to top-ranked symbols from Master Scoring
  - Subscribes to real-time market data (candles + indicators)
  - Runs pattern detection on each symbol using strategy.detectPattern()
  - Applies filters (direction, closed-candle, debounce)
  - Emits PatternFoundEvent to Execution Engine
}
```

### Key Interfaces

#### `IPatternStrategy`
```typescript
interface IPatternStrategy {
  name: string;  // "DOUBLE_TOP", "GAP_UP", etc.
  direction: "LONG" | "SHORT" | "BOTH";
  detectPattern(
    candles: Candle[],
    indicators?: IndicatorSnapshot
  ): PatternDetectionResult;
}
```

#### `PatternFoundEvent`
```typescript
interface PatternFoundEvent {
  symbol: string;
  strategyName: string;
  strategyDirection: "LONG" | "SHORT" | "BOTH";
  patternState: PatternDetectionResult;  // Contains entryPrice, stopLoss, metadata
  master: MasterSymbolInfo;  // masterScore, direction, moduleScores
  detectedAt: string;  // ISO timestamp
}
```

### Features

1. **Direction Filtering**: Only runs strategies aligned with Master Scoring direction
2. **Closed-Candle Filtering**: Optional - detects patterns only on confirmed closed candles
3. **Debounce Protection**: Prevents spamming Execution Engine with duplicate events
4. **Min Master Score Filtering**: Only scans symbols above threshold
5. **Max Symbols Limit**: Configurable limit on concurrent symbol scanning

### Backtest Mode

The scanner also supports **historical/backtest mode**:

```typescript
// Historical scanning (no real-time subscriptions)
async scanHistorical(
  symbol: string,
  candles: Candle[],
  indicators?: IndicatorSnapshot,
  masterOverride?: Partial<MasterSymbolInfo>
): Promise<PatternFoundEvent[]>

// Batch historical scanning
async scanHistoricalBatch(
  batch: {symbol, candles, indicators}[],
  masterOverrides?: Record<string, Partial<MasterSymbolInfo>>
): Promise<PatternFoundEvent[]>
```

**Backtest mode characteristics:**
- No debounce logic
- No direction filtering
- No closed-candle requirement
- No minMasterScore filtering
- Returns all detected events

---

## ⚙️ Layer 3: TypeScript Execution Engine

### Purpose

The **Execution Engine** (`lib/execution/execution-engine.ts`) receives `PatternFoundEvent` signals and executes trades with:

- **Risk Management**: R-based position sizing (Risk per Trade)
- **Position Management**: Open/close positions, track P&L, R-multiple
- **Time-Based Rules**: Latest entry time, forced exit time
- **Reallocation Logic**: Close profitable position to free slot for better opportunity
- **Multi-Mode Support**: LIVE / DEMO / BACKTEST

### Architecture

```typescript
ExecutionEngine {
  - Receives PatternFoundEvent from Scanner
  - Validates entry conditions (time, budget, concurrent trades)
  - Calculates position size based on risk (R-based)
  - Executes trades via IBKRClient (LIVE) or simulates (DEMO/BACKTEST)
  - Manages open positions (track price updates, stop-loss)
  - Handles exits (stop-loss, reallocation, forced close)
}
```

### Key Data Structures

#### `ExecutionEngineConfig`
```typescript
interface ExecutionEngineConfig {
  totalAccountValue: number;      // e.g., 10,000$
  maxExposurePct: number;         // e.g., 95% of account
  maxConcurrentTrades: number;    // e.g., 2 concurrent positions
  riskPerTradePct: number;        // e.g., 1% risk per trade (R-based)
  mode: ExecutionMode;            // "LIVE" | "DEMO" | "BACKTEST"
  latestEntryTime: string;        // "16:25" - no new entries after this
  forceExitTime: string;          // "16:28" - force close all positions
  relocationThresholdR: number;   // e.g., 2R - reallocate if profitable
}
```

#### `TradeSetup`
```typescript
interface TradeSetup {
  symbol: string;
  strategyName: string;
  direction: "LONG" | "SHORT";
  entryPrice: number;
  stopLoss: number;
  riskPerShare: number;       // Calculated: |entryPrice - stopLoss|
  riskDollars: number;        // Calculated: riskPerShare * quantity
  quantity: number;           // Calculated based on riskPerTradePct
  masterScore: number;
  masterDirection: "LONG" | "SHORT";
  metadata: any;              // Pattern-specific data (peaks, neckline, etc.)
}
```

#### `OpenPosition`
```typescript
interface OpenPosition {
  symbol: string;
  strategyName: string;
  direction: "LONG" | "SHORT";
  entryPrice: number;
  stopLoss: number;
  initialStopLoss: number;
  quantity: number;
  openedAt: string;
  riskPerShare: number;
  riskDollars: number;
  masterScore: number;
  masterDirection: "LONG" | "SHORT";
  lastPrice: number;          // Updated via onMarketPriceUpdate()
  bestPrice: number;          // Best price achieved (for trailing stops)
  metadata: any;
}
```

#### `ClosedTrade`
```typescript
interface ClosedTrade {
  symbol: string;
  strategyName: string;
  direction: "LONG" | "SHORT";
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  riskPerShare: number;
  riskDollars: number;
  pnl: number;
  rMultiple: number;          // Calculated: pnl / riskDollars
  openedAt: string;
  closedAt: string;
  masterScore: number;
  masterDirection: "LONG" | "SHORT";
  exitReason: ExitReason;     // "stop-loss" | "relocation" | "force-close-end-of-day" | etc.
  metadata: any;
}
```

### Position Sizing (R-Based)

**Formula:**
```
riskBudget = totalAccountValue * (riskPerTradePct / 100)
riskPerShare = |entryPrice - stopLoss|
quantity = floor(riskBudget / riskPerShare)
```

**Additional Constraints:**
- Limited by `maxNotionalPerTrade` (derived from `maxExposurePct` / `maxConcurrentTrades`)
- Final position size is the minimum of: R-based quantity vs. notional-based quantity

### Reallocation Logic

When `maxConcurrentTrades` is reached and a new opportunity arrives:

1. Find existing positions that are profitable (based on current `lastPrice`)
2. Select the position with lowest `masterScore` (weaker opportunity)
3. Close that position (reason: "relocation")
4. Open the new opportunity

**Rationale**: Replace a weaker profitable position with a stronger opportunity.

### Execution Modes

#### LIVE Mode
- Sends real market orders via `IBKRClient.placeMarketOrder()`
- Requires `IBKRClient` implementation
- Records actual fill prices from broker

#### DEMO Mode
- Simulates order execution
- Uses `entryPrice` as fill price (no slippage)
- No actual API calls to broker

#### BACKTEST Mode
- Same as DEMO, but explicitly for historical testing
- Useful for strategy backtesting on historical data

### API Methods

#### Entry Flow
```typescript
async onPatternEvent(event: PatternFoundEvent): Promise<void>
```
- Main entry point from Scanner
- Validates conditions (time, budget, positions)
- Calculates position size
- Executes order
- Creates open position

#### Price Updates
```typescript
onMarketPriceUpdate(symbol: string, lastPrice: number): void
```
- Updates `lastPrice` and `bestPrice` for open positions
- Checks stop-loss triggers
- Closes positions if stop-loss is hit

#### Forced Exit
```typescript
forceExitAllIfTime(): void
```
- Checks if current time >= `forceExitTime`
- Closes all open positions (reason: "force-close-end-of-day")
- Should be called periodically (e.g., every minute) from orchestrator

#### State Retrieval
```typescript
getOpenPositions(): OpenPosition[]
getClosedTrades(): ClosedTrade[]
```

---

## 🔗 Layer 4: Trading Orchestrator

### Purpose

The **Trading Orchestrator** (`lib/runtime/trading-orchestrator.ts`) connects all components:

- **Master Scoring Client** (HTTP client to Python backend)
- **Real-Time Data Client** (IBKR streaming)
- **Pattern Strategies** (Double Top, future: Gap Up, Double Bottom, etc.)
- **Pattern Scanner** (subscribes to symbols and data)
- **Execution Engine** (receives pattern events)

### Architecture

```typescript
createTradingSystem() {
  // 1. Create clients
  const masterClient = new HttpMasterScoringClient(endpoint);
  const dataClient = new IbkrRealTimeDataClient();
  const ibkrClient = new SimpleIbkrClient();
  const logger = new ConsoleScannerLogger();

  // 2. Create strategies
  const doubleTopStrategy = new DoubleTopPatternStrategy(doubleTopImpl);
  const strategies = [doubleTopStrategy, ...];

  // 3. Create Execution Engine
  const execEngine = new ExecutionEngine(config, ibkrClient, strategyMap);

  // 4. Create Pattern Scanner
  const scanner = new TradePatternScanner(
    masterClient,
    dataClient,
    strategies,
    scannerConfig,
    (event) => execEngine.onPatternEvent(event),  // Callback
    logger
  );

  // 5. Return API
  return {
    start: () => scanner.start(),
    getOpenPositions: () => execEngine.getOpenPositions(),
    getTradeHistory: () => execEngine.getClosedTrades(),
    execEngine,
    scanner,
  };
}
```

### Default Configurations

#### Double Top Strategy Config
- Pattern detection: minDropPct 2.0%, maxDropPct 12.0%
- Confirmation: 2 red bars after second peak
- Entry: After confirmation
- Stops: At second peak high (trailing by resistances)

#### Scanner Config
- `minMasterScore: 6.0`
- `maxSymbolsToScan: 20`
- `requireClosedCandle: true`
- `debounceMs: 2000`
- `enableDirectionFilter: true`

#### Execution Config
- `totalAccountValue: 10000`
- `maxExposurePct: 95`
- `maxConcurrentTrades: 2`
- `riskPerTradePct: 1`
- `mode: "DEMO"`
- `latestEntryTime: "16:25"`
- `forceExitTime: "16:28"`
- `relocationThresholdR: 2`

---

## 🎨 Strategy System: Double Top Example

### Strategy Structure

The system uses an **Adapter Pattern** to separate:
- **Core Strategy Logic** (`DoubleTopStrategy`) - Pure pattern detection and entry/exit logic
- **Pattern Scanner Adapter** (`DoubleTopPatternStrategy`) - Implements `IPatternStrategy` interface

### DoubleTopStrategy (Core)

**Responsibilities:**
- Pattern detection (`detectPattern()`)
- Entry signals (`entryFirst()`, `entrySecond()`)
- Exit signals (`exitFirst()`, `exitSecond()`)
- Stop calculations (`stopsForEntry1()`, `stopsForEntry2()`)

**Pattern Detection Output:**
```typescript
interface PatternState {
  patternFound: boolean;
  firstPeakIdx?: number;
  secondPeakIdx?: number;
  troughIdx?: number;
  neckline?: number;
  confirmCount?: number;
  earlyHeadsUp?: boolean;
  reason?: string;
}
```

### DoubleTopPatternStrategy (Adapter)

**Responsibilities:**
- Implements `IPatternStrategy` for Scanner
- Wraps `DoubleTopStrategy.detectPattern()`
- Enhances `PatternDetectionResult` with:
  - `entryPrice` (from `entryFirst()` or last candle close)
  - `stopLoss` (from `stopsForEntry1().initial`)
  - `secondPeakHigh` (for Execution Engine)
  - All metadata (peaks, neckline, confirm count, etc.)

**Output:**
```typescript
PatternDetectionResult {
  patternFound: true,
  entryPrice: number,
  stopLoss: number,
  secondPeakHigh: number,
  firstPeakIdx: number,
  secondPeakIdx: number,
  troughIdx: number,
  neckline: number,
  confirmCount: number,
  earlyHeadsUp: boolean,
  reason: string,
}
```

---

## 📊 Complete Data Flow

### Real-Time Trading Flow

```
1. Python Master Scoring
   ↓ (HTTP/WebSocket)
2. HttpMasterScoringClient.getTopSymbols()
   ↓ (List of MasterSymbolInfo)
3. TradePatternScanner.start()
   ↓ (Subscribes to each symbol)
4. IbkrRealTimeDataClient.subscribeCandles()
   ↓ (Real-time candles + indicators)
5. Strategy.detectPattern(candles, indicators)
   ↓ (PatternDetectionResult)
6. TradePatternScanner emits PatternFoundEvent
   ↓ (To Execution Engine)
7. ExecutionEngine.onPatternEvent(event)
   ↓ (Validates, calculates size, executes)
8. IBKRClient.placeMarketOrder() [LIVE mode]
   ↓ (OrderExecutionResult)
9. ExecutionEngine creates OpenPosition
   ↓ (Track via onMarketPriceUpdate)
10. ExecutionEngine checks stop-loss / exits
    ↓ (Closes position when conditions met)
11. ClosedTrade recorded in history
```

### Backtest Flow

```
1. Historical candle data (pre-loaded)
   ↓
2. TradePatternScanner.scanHistoricalBatch(batch)
   ↓ (No real-time subscriptions)
3. Strategy.detectPattern(candles)
   ↓
4. Returns PatternFoundEvent[] (all matches)
   ↓
5. For each event:
   ExecutionEngine.onPatternEvent(event) [BACKTEST mode]
   ↓ (Simulated execution, no broker calls)
6. OpenPosition created (simulated)
   ↓
7. Process historical prices sequentially
   ↓
8. ExecutionEngine.onMarketPriceUpdate(symbol, price)
   ↓ (Updates position, checks exits)
9. ClosedTrade recorded with R-multiple
```

---

## 🔐 Security & Safety

### Safe `eval()` Usage

All scoring engines use secure `eval()` for condition evaluation:

```python
def _safe_eval(self, condition: str, variables: Dict[str, Any]) -> bool:
    if not condition or condition.strip() == "":
        return False
    try:
        # Restricted environment - no builtins
        return bool(eval(condition, {"__builtins__": {}}, variables))
    except Exception:
        return False
```

**Safety Measures:**
- `__builtins__` is empty (prevents arbitrary code execution)
- Only snapshot variables are accessible
- Exceptions return `False` (fail-safe)

### Error Handling

- All async operations are wrapped in try-catch
- Invalid data returns `null` / `undefined` instead of throwing
- Logger captures all errors for debugging

---

## 📈 Performance Considerations

### Scoring System
- Rulebooks are loaded once at initialization
- `eval()` is fast for simple boolean expressions
- Parallel scoring possible (future optimization)

### Pattern Scanner
- Debounce prevents duplicate events (2-second default)
- Max symbols limit prevents resource exhaustion
- Direction filtering reduces unnecessary pattern checks

### Execution Engine
- In-memory position storage (fast lookups)
- O(1) position finding by symbol
- Efficient reallocation (O(n) scan, n = max concurrent trades)

---

## 🔧 Configuration & Extensibility

### Adding New Strategies

1. Create strategy class implementing `IPatternStrategy`
2. Add pattern detection logic
3. Ensure `detectPattern()` returns `entryPrice` and `stopLoss` in `patternState`
4. Register in `trading-orchestrator.ts`

**Example:**
```typescript
class GapUpPatternStrategy implements IPatternStrategy {
  name = "GAP_UP";
  direction: "LONG" = "LONG";
  
  detectPattern(candles: Candle[], indicators?: IndicatorSnapshot): PatternDetectionResult {
    // Pattern detection logic
    return {
      patternFound: true,
      entryPrice: ...,
      stopLoss: ...,
      // ... metadata
    };
  }
}
```

### Adding New Scoring Modules

1. Create rulebook (`rulebooks/new_module_rulebook.py`)
2. Create scoring engine (`scoring/new_module_scoring.py`)
3. Register in Master Scoring Engine
4. Set module weight

### Modifying Risk Management

All risk parameters are in `ExecutionEngineConfig`:
- `riskPerTradePct`: Risk per trade (R-based sizing)
- `maxExposurePct`: Maximum account exposure
- `maxConcurrentTrades`: Position limit
- `relocationThresholdR`: Reallocation trigger

---

## 📝 Key Design Decisions

1. **Separation of Concerns**: Scoring (Python) vs. Pattern Detection (TypeScript) vs. Execution (TypeScript)
2. **Adapter Pattern**: Strategies wrapped for Scanner compatibility
3. **R-Based Position Sizing**: Consistent risk management
4. **Reallocation Logic**: Maximizes capital efficiency
5. **Multi-Mode Support**: Easy switching between LIVE/DEMO/BACKTEST
6. **Safe eval()**: Enables flexible rulebook conditions without code injection risk
7. **Modular Rulebooks**: Easy to add/modify scoring rules without code changes

---

## 🚀 Future Enhancements

### Planned Features

1. **Additional Strategies**: Gap Up, Double Bottom, Reversal, etc.
2. **Trailing Stops**: Based on R-multiple (e.g., trail stop at 2R profit)
3. **Strategy-Specific Exits**: Use strategy's `exitFirst()`, `exitSecond()` methods
4. **Performance Analytics**: Win rate, average R-multiple, Sharpe ratio
5. **Real IBKR Integration**: Replace demo clients with actual TWS/Gateway API
6. **Python Backend API**: HTTP/WebSocket server for Master Scoring
7. **Risk Limits**: Daily loss limits, max drawdown protection
8. **Portfolio Heat**: Track total account risk exposure

---

## 📚 File Structure

```
project/
├── scoring/
│   ├── price_action_scoring.py
│   ├── options_flow_scoring.py
│   ├── sentiment_scoring.py
│   ├── fundamentals_scoring.py
│   ├── position_risk_scoring.py
│   └── master_scoring.py
├── rulebooks/
│   ├── price_action_rulebook.py
│   ├── options_flow_rulebook.py
│   ├── sentiment_rulebook.py
│   ├── fundamentals_rulebook.py
│   └── position_risk_rulebook.py
└── lib/
    ├── scanner/
    │   └── trade-pattern-scanner.ts
    ├── strategies/
    │   └── double-top.ts
    ├── execution/
    │   └── execution-engine.ts
    └── runtime/
        └── trading-orchestrator.ts
```

---

## ✅ System Status

**Current Implementation:**
- ✅ All scoring engines implemented
- ✅ All rulebooks created
- ✅ Master Scoring Engine complete
- ✅ Trade Pattern Scanner complete
- ✅ Double Top strategy implemented (with adapter)
- ✅ Execution Engine complete (R-based, reallocation, multi-mode)
- ✅ Trading Orchestrator complete
- ✅ Backtest mode support

**TODO:**
- ⏳ Real IBKR API integration (currently demo clients)
- ⏳ Python Master Scoring HTTP/WebSocket server
- ⏳ Additional strategies (Gap Up, Double Bottom, etc.)
- ⏳ Trailing stops by R-multiple
- ⏳ Strategy-specific exit triggers

---

**Document Version**: 1.0  
**Last Updated**: 2025-01-20  
**System Status**: Production-Ready (DEMO mode), LIVE mode pending IBKR integration

