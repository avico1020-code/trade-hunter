# Trading Router System - Complete Summary

## Overview

We have built a comprehensive **Algorithmic Trading Router System** that consists of three main layers:

1. **Scoring System** (Python) - Analyzes and ranks stocks
2. **Pattern Scanner** (TypeScript) - Detects technical patterns on top-ranked stocks
3. **Execution Engine** (TypeScript - to be built) - Executes trades via IBKR API

---

## Layer 1: Scoring System (Python)

### Purpose
The scoring system analyzes stocks across multiple categories and produces a ranked list of the best trading opportunities.

### Architecture

#### Rulebooks (`/rulebooks/`)
Pure logic definitions that specify **how to interpret** market data and assign scores. Each rulebook defines:
- **States** - Different market/stock conditions
- **Conditions** - Python boolean expressions evaluated with safe `eval()`
- **Score ranges** - [-10, +10] normalized scores
- **Timeframes** - MINOR (intraday) / MAJOR (daily)

#### Scoring Engines (`/scoring/`)
Execution logic that performs actual calculations based on rulebooks:
- Loads rulebooks
- Evaluates conditions using safe `eval()` with restricted environment
- Calculates scores based on score ranges
- Applies group weights and metric weights
- Combines MINOR/MAJOR timeframes
- Returns final weighted scores

### Complete List of Rulebooks

1. **`macro_rulebook.py`** - Market macro economic news scoring
   - FED_RATE_DECISION, INFLATION_REPORT, EMPLOYMENT_REPORT, GDP/PMI, etc.
   - Structure: `timeframes → MINOR/MAJOR → states`

2. **`sector_macro_rulebook.py`** - Sector-specific macro news scoring
   - XLK, XLE, XLF, XLV, XLRE, XLI, XLB, XLY, XLP, XLU
   - Structure: `sectors → {sector_name} → condition, score_range`

3. **`news_micro_global_rulebook.py`** - Global micro-level news
   - ANALYST_RATING_CHANGE, INDEX_INCLUSION_REMOVAL, INSIDER_ACTIVITY, SHORT_INTEREST_CHANGE

4. **`news_micro_rulebook.py`** - Company-specific news
   - EARNINGS, GUIDANCE, DILUTION, BUYBACK, M&A, etc.

5. **`news_rulebook.py`** - **Unified news rulebook** (combines all 4 news rulebooks)

6. **`technical_indicator_rulebook.py`** - Technical indicators scoring
   - RSI, MACD, Moving Averages, VWAP, Volume, ATR, Bollinger Bands
   - Uses `eval()` for condition evaluation

7. **`price_action_rulebook.py`** - Price action patterns
   - Market Structure, Reversal Patterns, Continuation Patterns, Level Reactions, Gaps, Candles

8. **`options_flow_rulebook.py`** ⭐ **Recently Updated**
   - Structure: `meta → groups → timeframes → MINOR → states`
   - 6 groups: PUT_CALL_IMBALANCE, UOA, OPEN_INTEREST, IV, SKEW, GAMMA
   - **Python expressions** in conditions (supports eval())
   - Fields: `call_volume_mult`, `put_volume_mult`, `uoa_call_notional_mult`, `iv_change_pct`, `gamma_exposure`, etc.

9. **`sentiment_rulebook.py`** ⭐ **Recently Updated**
   - Structure: `timeframes → MINOR/MAJOR → states`
   - **Python expressions** in conditions
   - MINOR: 9 states (INTRADAY_EXTREME_BULLISH, INTRADAY_MILD_BULLISH, etc.)
   - MAJOR: 7 states (DAILY_PERSISTENT_BULLISH, DAILY_RISK_ON_ENVIRONMENT, etc.)
   - Fields: `stock_sentiment`, `news_sentiment`, `twitter_sentiment`, `volume_of_mentions`, `is_trending`

10. **`fundamentals_rulebook.py`** - Fundamental analysis scoring
    - Structure: `meta → groups → metrics → timeframes → MINOR/MAJOR → states`
    - 6 groups: VALUATION, GROWTH, PROFITABILITY, LEVERAGE, CASH_FLOW, DIVIDENDS
    - 11 metrics with **Python expressions** in conditions

11. **`position_risk_rulebook.py`** ⭐ **Recently Updated**
    - Structure: `meta → groups → metrics → timeframes → MINOR/MAJOR → states`
    - 3 groups: ACCOUNT_RISK, POSITION_RISK, EXPOSURE_RISK
    - 7 metrics: DAILY_DRAWDOWN, CAPITAL_USAGE, RISK_PER_TRADE, POSITION_PERFORMANCE_STRESS, SYMBOL_EXPOSURE, SECTOR_EXPOSURE, CORRELATED_EXPOSURE, OPEN_POSITIONS_COUNT
    - **Python expressions** in conditions
    - Fields: `daily_pl_pct`, `capital_usage_pct`, `position_risk_pct`, `rr_multiple_live`, `symbol_exposure_pct`, etc.

12. **`scoring_system.py`** - Core system with data structures and base classes

### Complete List of Scoring Engines

1. **`options_flow_scoring.py`** ⭐ **Recently Updated**
   - Class: `OptionsFlowScoringEngine`
   - Uses **safe eval()** for condition evaluation
   - Supports groups and weights
   - Accumulates scores (not average)
   - Output: `minor_score`, `final_options_flow_score`, `matched_states`, `state_details`

2. **`sentiment_scoring.py`** ⭐ **Recently Updated**
   - Class: `SentimentScoringEngine`
   - Uses **safe eval()** for condition evaluation
   - Supports MINOR and MAJOR timeframes
   - Combines scores: `0.6 * minor + 0.4 * major`
   - Module weight: `0.80`

3. **`fundamentals_scoring.py`**
   - Class: `FundamentalsScoringEngine`
   - Structure: `metrics → groups → timeframes → states`
   - Uses **safe eval()** for condition evaluation

4. **`position_risk_scoring.py`**
   - Class: `PositionRiskScoringEngine`
   - Structure: `metrics → groups → timeframes → states`
   - Uses **safe eval()** for condition evaluation

5. **`price_action_scoring.py`**
   - Class: `PriceActionScoringEngine`
   - Uses **manual logic matching** (not eval) because conditions are simple keywords

6. **`master_scoring.py`** - Main engine
   - Class: `MasterScoringEngine`
   - Combines scores from all modules
   - Output: `symbol`, `module_scores`, `final_master_score`, `direction`, `abs_strength`, `used_modules`

### Scoring System Workflow

1. **Input**: Market data (news, indicators, options flow, sentiment, fundamentals, position risk)
2. **Processing**: Each scoring engine evaluates its category using rulebooks
3. **Aggregation**: Master Scoring Engine combines all category scores
4. **Output**: Ranked list of stocks with:
   - `final_master_score` (combined weighted score)
   - `direction` (LONG/SHORT/NEUTRAL)
   - `abs_strength` (absolute value of score)
   - `module_scores` (breakdown by category)

---

## Layer 2: Trade Pattern Scanner (TypeScript)

### Purpose
The pattern scanner detects technical trading patterns **only on top-ranked stocks** from the Master Scoring Engine. It does NOT execute trades - it only detects patterns and sends signals to the Execution Engine.

### Architecture

#### File Structure
```
/lib/
  /scanner/
    trade-pattern-scanner.ts    # Main scanner class
  /strategies/
    /double-top/
      double-top.ts              # Double Top strategy (implements IPatternStrategy)
    /breakout/
      breakout.ts                # (to be added)
    /gap-fill/
      gap-fill.ts                # (to be added)
    ...
```

#### Key Components

1. **`TradePatternScanner` Class** (`lib/scanner/trade-pattern-scanner.ts`)
   - Main scanner that orchestrates pattern detection
   - Subscribes to real-time market data
   - Runs pattern detection on each update
   - Filters by direction, closed candles, debounce
   - Emits `PatternFoundEvent` to Execution Engine

2. **`IPatternStrategy` Interface**
   ```typescript
   interface IPatternStrategy {
     name: string;
     direction: "LONG" | "SHORT" | "BOTH";
     detectPattern(candles: Candle[], indicators?: IndicatorSnapshot): PatternDetectionResult;
   }
   ```

3. **Strategy Implementations**
   - **`DoubleTopStrategy`** ⭐ **Recently Updated**
     - Implements `IPatternStrategy`
     - `name = "DOUBLE_TOP"`
     - `direction = "SHORT"` (short-only pattern)
     - `detectPattern()` method calls internal `detectPatternInternal()`
     - Original detection logic unchanged

### Scanner Workflow

1. **Input**: Top-ranked symbols from Master Scoring Engine (with `masterScore >= threshold`)
2. **Subscription**: Scanner subscribes to real-time market data for each symbol
3. **Pattern Detection**: On each update:
   - Checks if last candle is closed (if `requireClosedCandle = true`)
   - Filters strategies by direction (if `enableDirectionFilter = true`)
   - Runs `detectPattern()` on each strategy
   - Checks debounce protection
4. **Output**: `PatternFoundEvent` sent to Execution Engine via callback:
   ```typescript
   {
     symbol: string,
     strategyName: string,
     strategyDirection: "LONG" | "SHORT" | "BOTH",
     patternState: PatternDetectionResult,
     master: {
       masterScore: number,
       direction: "LONG" | "SHORT"
     },
     detectedAt: string (ISO timestamp)
   }
   ```

### Scanner Features

- **Direction Filtering**: Only runs strategies that match Master's direction
- **Closed Candle Filtering**: Optional - only detects on closed candles
- **Debounce Protection**: Prevents duplicate signals (default: 2000ms)
- **Real-time Updates**: Subscribes to live market data via `RealTimeDataClient`
- **Multiple Strategies**: Can run multiple strategies simultaneously
- **Error Handling**: Logs errors and continues scanning

### Interfaces & Types

- **`MasterSymbolInfo`**: Symbol info from Master Scoring
- **`IndicatorSnapshot`**: Technical indicators state
- **`PatternDetectionResult`**: Pattern detection result from strategy
- **`PatternFoundEvent`**: Event sent to Execution Engine
- **`OnPatternFoundHandler`**: Callback function type
- **`RealTimeDataClient`**: Abstraction for real-time data (IBKR)
- **`MasterScoringClient`**: Abstraction for Master Scoring (Python)
- **`TradePatternScannerConfig`**: Scanner configuration

---

## Layer 3: Execution Engine (TypeScript - To Be Built)

### Purpose
The execution engine receives `PatternFoundEvent` signals from the Pattern Scanner and executes actual trades via IBKR API.

### Planned Responsibilities
- Trade entry logic
- Position sizing based on account risk %
- Stop-loss placement
- Take-profit management
- Risk checks before execution
- IBKR order routing
- Position management

### What It Will NOT Do
- Pattern detection (handled by Scanner)
- Stock ranking (handled by Scoring System)

---

## System Flow (Complete)

```
1. Market Data Ingestion
   ↓
2. Python Scoring System
   ├─ News Scoring
   ├─ Technical Indicators Scoring
   ├─ Options Flow Scoring
   ├─ Sentiment Scoring
   ├─ Fundamentals Scoring
   ├─ Position Risk Scoring
   └─ Master Scoring Engine (combines all)
   ↓
3. Top-Ranked Symbols List
   (symbols with masterScore >= threshold)
   ↓
4. Trade Pattern Scanner (TypeScript)
   ├─ Subscribes to real-time data for each symbol
   ├─ Runs pattern detection strategies
   ├─ Filters by direction, closed candles, debounce
   └─ Emits PatternFoundEvent
   ↓
5. Execution Engine (TypeScript - to be built)
   ├─ Receives PatternFoundEvent
   ├─ Performs risk checks
   ├─ Calculates position sizing
   ├─ Places orders via IBKR API
   └─ Manages positions
```

---

## Key Design Principles

### 1. Separation of Concerns
- **Scoring System** = Analysis & Ranking
- **Pattern Scanner** = Pattern Detection Only
- **Execution Engine** = Trade Execution Only

### 2. Modularity
- Each component is independent and testable
- Strategies can be added/removed without affecting others
- Rulebooks can be updated independently

### 3. Type Safety
- Full TypeScript types throughout
- Interfaces for all major components
- Type-safe data structures

### 4. Safe Evaluation
- Python expressions evaluated with restricted `eval()`
- No access to `__builtins__` for security
- Error handling for failed conditions

### 5. Real-time Processing
- Event-driven architecture
- Callback-based communication (no queues/WebSockets)
- Debounce protection for anti-spam

---

## File Structure Summary

```
/rulebooks/                    # Python rulebooks (logic definitions)
  ├── macro_rulebook.py
  ├── sector_macro_rulebook.py
  ├── news_micro_global_rulebook.py
  ├── news_micro_rulebook.py
  ├── news_rulebook.py
  ├── technical_indicator_rulebook.py
  ├── price_action_rulebook.py
  ├── options_flow_rulebook.py
  ├── sentiment_rulebook.py
  ├── fundamentals_rulebook.py
  ├── position_risk_rulebook.py
  └── scoring_system.py

/scoring/                      # Python scoring engines (execution)
  ├── options_flow_scoring.py
  ├── sentiment_scoring.py
  ├── fundamentals_scoring.py
  ├── position_risk_scoring.py
  ├── price_action_scoring.py
  └── master_scoring.py

/lib/                          # TypeScript trading system
  /scanner/
    └── trade-pattern-scanner.ts
  /strategies/
    └── double-top.ts
  /execution/                  # (to be built)
    └── execution-engine.ts
```

---

## Current Status

### ✅ Completed
- **Scoring System**: 11 rulebooks + 6 scoring engines + Master engine
- **Pattern Scanner**: Complete implementation with interfaces
- **Double Top Strategy**: Fully implements IPatternStrategy

### 🚧 In Progress
- **Execution Engine**: Architecture defined, implementation pending

### 📋 Future Additions
- Additional strategies (Double Bottom, Breakout, Gap Fill, etc.)
- Real-time data client implementation (IBKR connection)
- Master scoring client implementation (Python integration)
- Execution engine implementation
- Risk management layer
- Position sizing logic
- Exit logic

---

## Integration Points

### Python ↔ TypeScript
- Master Scoring (Python) → Pattern Scanner (TypeScript)
  - Via `MasterScoringClient` interface
  - Returns `MasterSymbolInfo[]` with scores and directions

### TypeScript ↔ IBKR
- Pattern Scanner → Real-time Data
  - Via `RealTimeDataClient` interface
  - Subscribes to candles and indicators

### TypeScript → Execution
- Pattern Scanner → Execution Engine
  - Via `OnPatternFoundHandler` callback
  - Sends `PatternFoundEvent` immediately

---

## Technical Notes

### Safe Eval Pattern
```python
def _safe_eval(self, condition: str, variables: Dict[str, Any]) -> bool:
    try:
        return bool(eval(condition, {"__builtins__": {}}, variables))
    except Exception:
        return False
```

### Pattern Detection Result
```typescript
interface PatternDetectionResult {
  patternFound: boolean;
  confidence?: number;        // 0–1 normalized confidence
  reason?: string;            // Why pattern was found
  strength?: number;          // 0–10 scale
  metadata?: any;             // Strategy-specific data
  [key: string]: any;         // Additional fields
}
```

### Scanner Configuration
```typescript
interface TradePatternScannerConfig {
  minMasterScore: number;           // Default: 6.0
  maxSymbolsToScan?: number;         // Optional limit
  requireClosedCandle?: boolean;     // Only closed candles
  debounceMs?: number;               // Default: 2000ms
  enableDirectionFilter?: boolean;    // Filter by direction
}
```

---

## Summary

We have built a **complete 3-layer algorithmic trading system**:

1. **Scoring Layer** (Python) - Analyzes and ranks stocks across 11 categories
2. **Pattern Detection Layer** (TypeScript) - Detects technical patterns on top stocks
3. **Execution Layer** (TypeScript) - Will execute trades via IBKR

The system is **modular**, **type-safe**, and **ready for production** once the Execution Engine is implemented.

**Last Updated**: 2025-01-20

