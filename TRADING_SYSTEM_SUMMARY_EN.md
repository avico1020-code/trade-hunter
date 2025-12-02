# Algorithmic Trading Scoring System - Summary

## Overview

Built a modular **Algorithmic Trading Scoring System** in Python that supports multiple analysis categories:
- News & Sentiment
- Technical Indicators  
- Price Action Patterns
- Options Flow
- Fundamentals
- Position & Risk Management

---

## File Structure

### Rulebooks (`/rulebooks/`) - **Logic Definitions Only**

Each rulebook defines **scoring logic** (not computations) using:
- **States** - Different market/stock conditions
- **Conditions** - Python expressions evaluated with `eval()`
- **Score ranges** - [-10, +10]
- **Timeframes** - MINOR (intraday) / MAJOR (daily)

#### List of Rulebooks:

1. **`macro_rulebook.py`** - Macro economic news scoring rules
   - FED_RATE_DECISION, INFLATION_REPORT, EMPLOYMENT_REPORT, GDP/PMI, etc.

2. **`sector_macro_rulebook.py`** - Sector-specific macro news scoring
   - XLK, XLE, XLF, XLV, XLRE, XLI, XLB, XLY, XLP, XLU

3. **`news_micro_global_rulebook.py`** - Global micro-level news
   - ANALYST_RATING_CHANGE, INDEX_INCLUSION_REMOVAL, INSIDER_ACTIVITY, SHORT_INTEREST_CHANGE

4. **`news_micro_rulebook.py`** - Company-specific news
   - EARNINGS, GUIDANCE, DILUTION, BUYBACK, M&A, etc.

5. **`news_rulebook.py`** - **Unified news rulebook** (combines all 4 news rulebooks)

6. **`technical_indicator_rulebook.py`** - Technical indicators scoring
   - RSI, MACD, Moving Averages, VWAP, Volume, ATR, Bollinger Bands

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

### Scoring Engines (`/scoring/`) - **Execution Logic**

Each scoring engine **performs actual calculations** based on the corresponding rulebook:

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

---

## Architecture

### Design Principles:

1. **Separation of Concerns**
   - **Rulebooks** = Logic only (what to check, how to interpret)
   - **Scoring Engines** = Actual execution (how to calculate, how to combine)

2. **Unified Structure**
   - All rulebooks use the same base structure: `meta → timeframes → states`
   - Complex rulebooks use: `meta → groups → metrics → timeframes → states`
   - Each state includes: `condition`, `score_range`, `notes` (and sometimes `raw_signal`, `group`)

3. **Safe Eval Pattern**
   ```python
   def _safe_eval(self, condition: str, variables: Dict[str, Any]) -> bool:
       try:
           return bool(eval(condition, {"__builtins__": {}}, variables))
       except Exception:
           return False
   ```
   - **Restrictions**: No access to `__builtins__` = increased safety
   - **Support**: Only functions and fields from snapshot

4. **Timeframe Hierarchy**
   - **MINOR** = Intraday - Fast reactions, high volatility
   - **MAJOR** = Daily/multi-day - Long-term trends, general bias
   - Scoring engines combine timeframes (usually: 60% minor, 40% major)

5. **Group-Based Weighting**
   - Groups define `base_weight` (e.g., ACCOUNT_RISK = 1.2)
   - Metrics within groups can have additional `weight`
   - Final score = weighted sum of all matched states

---

## Important Notes on Code Structure

### ✅ Strengths:

1. **Full Modularity**
   - Each rulebook is independent and can be updated without affecting others
   - Scoring engines are separate and individually testable

2. **Type Safety**
   - Use of `TypedDict` in rulebooks
   - Full type hints in scoring engines
   - Dataclasses for output structures

3. **Readability**
   - Unified structure across all rulebooks
   - Detailed documentation in each state
   - Clear variable names

4. **Flexibility**
   - Conditions are Python expressions - can add complex logic
   - Groups and weights allow updating weights without code changes

### ⚠️ Potential Improvement Points:

1. **eval() Security**
   - ⚠️ Using `eval()` is always risky, even with restricted environment
   - **Recommendation**: Consider migrating to parser/custom expression evaluator in the future
   - **For now**: Restricted environment is safe enough for this use case

2. **Consistency in Condition Evaluation**
   - Some scoring engines use **eval()** (fundamentals, position_risk, options_flow, sentiment)
   - Some use **manual matching** (price_action - because conditions are simple keywords)
   - **Recommendation**: Consider unifying - either eval() for all, or manual matching for all

3. **Error Handling**
   - If condition fails - engine simply returns `False`
   - **Recommendation**: Consider logging failed conditions for debugging

4. **Performance**
   - eval() can be slow if there are many states
   - **Recommendation**: Consider caching compiled conditions or pre-filtering relevant states

5. **State Overlap**
   - Multiple states may match simultaneously
   - **Current**: Scoring engines accumulate or average all matched scores
   - **Recommendation**: Consider priority system or mutual exclusion between certain states

6. **Testing**
   - No visible test files
   - **Recommendation**: Create unit tests for each scoring engine with mock snapshots

7. **Documentation**
   - Missing detailed README explaining how to use the system
   - **Recommendation**: Add examples of using each engine

---

## Usage Examples

### Options Flow Scoring:
```python
from scoring.options_flow_scoring import OptionsFlowScoringEngine

engine = OptionsFlowScoringEngine()
snapshot = {
    "put_call_ratio": 0.5,
    "call_volume_mult": 3.5,
    "uoa_call_notional_mult": 4.0,
    "iv_change_pct": -25.0,
    "is_trending": True
}
result = engine.score(snapshot)
```

### Sentiment Scoring:
```python
from scoring.sentiment_scoring import SentimentScoringEngine

engine = SentimentScoringEngine()
snapshot = {
    "stock_sentiment": 0.7,
    "news_sentiment": 0.6,
    "twitter_sentiment": 0.8,
    "volume_of_mentions": 2.5,
    "is_trending": True
}
result = engine.score(snapshot)
```

### Position Risk Scoring:
```python
from scoring.position_risk_scoring import PositionRiskScoringEngine

engine = PositionRiskScoringEngine()
result = engine.score(account_state, position_state)
```

---

## Workflow

1. **Data Ingestion** → Provides snapshot with data (e.g., options flow, sentiment, etc.)
2. **Rulebook Loading** → Loads the corresponding rulebook
3. **State Matching** → Checks which states match according to conditions
4. **Score Calculation** → Calculates scores based on score_ranges
5. **Weighting** → Applies group weights and metric weights
6. **Aggregation** → Combines scores from MINOR/MAJOR timeframes
7. **Final Score** → Returns final weighted score + matched states

---

## Summary

**What Was Built:**
- ✅ 11 complete and detailed rulebooks
- ✅ 6 functional scoring engines
- ✅ Master scoring engine to combine all modules
- ✅ Modular and flexible architecture
- ✅ Support for safe eval() with restricted environment
- ✅ Unified and consistent structure across all files

**Status:**
- ✅ System is ready to use
- ⚠️ Recommended to add tests and detailed documentation
- ⚠️ Consider performance improvements if needed

---

**Last Updated**: 2025-01-20

