# Trading Rulebooks

This directory contains Python modules that define scoring logic for the algorithmic trading system.

## Overview

This directory includes:
- **Core Scoring System** (`scoring_system.py`) - Complete system skeleton with data structures, scoring components, and master engine
- **Rulebook Modules** - Individual rulebooks that define scoring logic per category (to be added)

## Core System

### `scoring_system.py`
The complete system skeleton containing:
- **Data Structures (Input)**: `IndicatorSnapshot`, `NewsItem`, `OptionsFlowSnapshot`, `MicroCompanySnapshot`, `MacroSnapshot`, `SectorSnapshot`, `SymbolState`, `UniverseState`
- **Data Structures (Output)**: `ComponentScore`, `SymbolScoreResult`
- **Base Class**: `BaseScoringComponent` - Base for all scoring components
- **Scoring Components**:
  - `NewsScoringComponent` - News sentiment scoring
  - `TechnicalIndicatorsComponent` - Technical indicators scoring
  - `MacroScoringComponent` - Macro economic indicators scoring
  - `SectorScoringComponent` - Sector-specific scoring
  - `OptionsFlowScoringComponent` - Options flow analysis
  - `MicroCompanyScoringComponent` - Company-level scoring
  - `RegimeConsistencyComponent` - Regime consistency checking
- **Master Engine**: `MasterScoringEngine` - Combines all components and produces ranked results
- **Initialization**: `build_default_master_engine()` - Factory function to create master engine

## Rulebook Modules (To Be Added)

Each rulebook module defines:
- **States, conditions, levels, thresholds, keywords**
- **Scoring ranges** (-10 to +10)
- **Surprise factors**
- **Sector sensitivity multipliers**
- **Timeframes** (MINOR = intraday, MAJOR = daily)
- **Context adjustments**

### Rulebooks:

#### News Rulebooks (COMPLETE):
- ✅ `macro_rulebook.py` - Macro economic indicators scoring rules (FED, CPI, NFP, GDP, VIX, etc.)
- ✅ `sector_macro_rulebook.py` - Sector-specific scoring rules (XLK, XLE, XLF, XLV, XLRE, XLI, XLB, XLY, XLP, XLU)
- ✅ `news_micro_global_rulebook.py` - Company-level global news scoring rules (ANALYST_RATING_CHANGE, INDEX_INCLUSION_REMOVAL, INSIDER_ACTIVITY, SHORT_INTEREST_CHANGE)
- ✅ `news_micro_rulebook.py` - Company-specific news scoring rules (EARNINGS, GUIDANCE_ONLY, DILUTION, BUYBACK, MANAGEMENT_CHANGE, LEGAL_REGULATORY, CYBER_DATA_RECALL, M_AND_A, PRODUCT_LAUNCH_PIPELINE, SUPPLY_CHAIN_CONTRACTS, DIVIDEND_CHANGE)
- ✅ `news_rulebook.py` - **Unified News Rulebook** - Combines all four news rulebooks into a single NEWS_RULEBOOK object

#### Technical Indicator Rulebooks:
- ✅ `technical_indicator_rulebook.py` - Technical indicators scoring rules (RSI, MACD, MOVING_AVERAGES, VWAP, VOLUME, ATR, BOLLINGER, PRICE_ACTION)
- ✅ `price_action_rulebook.py` - Price action patterns scoring rules (STRUCTURE, REVERSAL, CONTINUATION, LEVEL_REACTION, GAPS, CANDLES)

#### Options Flow Rulebooks (to be added):
- `options_rulebook.py` - Options flow analysis rules (to be added)

## Important Notes

- **Pure logic definitions** - Rulebooks only define interpretation logic, not computational formulas
- **No IBKR connection** - Rulebooks are logic-only; IBKR integration happens later
- **Integration with Next.js** - Will be done via API routes or separate Python service (TBD)

## Development Flow

1. ChatGPT provides code for each rulebook module individually
2. Each rulebook specifies file location in header: `# file: rulebooks/<module_name>_rulebook.py`
3. Files are created/updated at the exact path specified
4. No other files are modified unless explicitly instructed

## Usage Example

```python
from rulebooks.scoring_system import (
    MasterScoringEngine,
    build_default_master_engine,
    UniverseState,
    SymbolState,
    MacroSnapshot,
)

# Import rulebooks (to be added)
# from rulebooks.news_rulebook import NEWS_RULEBOOK
# from rulebooks.technical_rulebook import TECHNICAL_INDICATOR_RULEBOOK

# Build master engine
# master = build_default_master_engine(NEWS_RULEBOOK, TECHNICAL_INDICATOR_RULEBOOK)

# Score universe
# results = master.score_universe(universe_state)

# Results are sorted by absolute score (strongest first)
# Each result contains: symbol, total_score, direction (LONG/SHORT/NEUTRAL), components breakdown

