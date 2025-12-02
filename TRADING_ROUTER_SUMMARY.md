# סיכום מערכת נתב המסחר (Trading Router/Scoring System)

## מטרת המערכת

בנינו מערכת ניקוד וניתוח אוטומטית למסחר במניות. המערכת כוללת:

1. **Rulebooks** - ספרי חוקים שמגדירים לוגיקת ניקוד לפי קטגוריות
2. **Scoring Engines** - מנועי ניקוד שמעבדים נתונים ומחזירים ציונים
3. **Master Scoring Engine** - מנוע ראשי שמשלב את כל הציונים לניקוד סופי

## המבנה הכללי

```
rulebooks/                    # ספרי חוקים (Logic Definitions)
├── macro_rulebook.py
├── sector_macro_rulebook.py
├── news_micro_global_rulebook.py
├── news_micro_rulebook.py
├── news_rulebook.py          # Unified news rulebook
├── technical_indicator_rulebook.py
├── price_action_rulebook.py
├── scoring_system.py         # Core data structures & base classes
└── README.md

scoring/                      # מנועי ניקוד (Scoring Engines)
├── price_action_scoring.py
├── options_flow_scoring.py
├── sentiment_scoring.py
├── fundamentals_scoring.py
├── position_risk_scoring.py
└── master_scoring.py         # Master Scoring Engine
```

## 1. RULEBOOKS (ספרי חוקים)

### 1.1 מבנה כללי של Rulebook

כל rulebook הוא dictionary Python עם המבנה הבא:

```python
RULEBOOK = {
    "meta": {
        "score_scale": {"min": -10, "max": 10},
        "signal_levels": {...},
        "groups": {...}
    },
    "patterns" | "news_types" | "metrics": {
        "PATTERN_NAME": {
            "base_impact": int,
            "timeframes": {
                "MINOR": {
                    "states": {
                        "STATE_NAME": {
                            "condition": "string expression",
                            "score_range": [min, max],
                            ...
                        }
                    }
                },
                "MAJOR": {...}
            }
        }
    }
}
```

### 1.2 Rulebooks שנוצרו

#### News Rulebooks:
- **`macro_rulebook.py`** - `MARKET_MACRO_RULEBOOK`
  - חדשות מאקרו ברמת השוק כולו
  - FED_RATE_DECISION, INFLATION_REPORT, EMPLOYMENT_REPORT, GDP/PMI, CONSUMER_ACTIVITY, GOVERNMENT_POLICY, GEOPOLITICAL_RISK, VIX_INDEX, FEAR_AND_GREED
  - טווח ציונים: [-10, +10]
  - משקלי זמן (intraday vs daily context)

- **`sector_macro_rulebook.py`** - `SECTOR_MACRO_RULEBOOK`
  - חדשות מאקרו ברמת סקטור
  - סקטורים: XLK, XLE, XLF, XLV, XLRE, XLI, XLB, XLY, XLP, XLU
  - sensitivity_multiplier לכל סקטור

- **`news_micro_global_rulebook.py`** - `NEWS_MICRO_GLOBAL_RULEBOOK`
  - חדשות ברמת החברה שלא תלויות סקטור
  - ANALYST_RATING_CHANGE, INDEX_INCLUSION_REMOVAL, INSIDER_ACTIVITY, SHORT_INTEREST_CHANGE

- **`news_micro_rulebook.py`** - `NEWS_MICRO_RULEBOOK`
  - חדשות ספציפיות לחברה
  - EARNINGS, GUIDANCE_ONLY, DILUTION, BUYBACK, MANAGEMENT_CHANGE, LEGAL_REGULATORY, M_AND_A, PRODUCT_LAUNCH, וכו'
  - sector_adjustments - מכפילי רגישות לפי סקטור

- **`news_rulebook.py`** - `NEWS_RULEBOOK`
  - Unified rulebook שמשלב את כל 4 ה-news rulebooks
  - מספק `_flat_map` ו-`get()` method לגישה ישירה

#### Technical Rulebooks:
- **`technical_indicator_rulebook.py`** - `TECHNICAL_INDICATOR_RULEBOOK`
  - אינדיקטורים טכניים: RSI, MACD, MOVING_AVERAGES, VWAP, VOLUME, ATR, BOLLINGER
  - conditions משתמשים ב-`eval()` (יש הערה לשיפור עתידי)
  - תומך ב-MINOR ו-MAJOR timeframes

- **`price_action_rulebook.py`** - `PRICE_ACTION_RULEBOOK`
  - תבניות price action: STRUCTURE, REVERSAL, CONTINUATION, LEVEL_REACTION, GAPS, CANDLES
  - base_impact לכל pattern
  - תומך ב-MINOR ו-MAJOR timeframes

#### Rulebooks שעדיין לא נוצרו (Placeholders):
- **`options_flow_rulebook.py`** - `OPTIONS_FLOW_RULEBOOK`
- **`sentiment_rulebook.py`** - `SENTIMENT_RULEBOOK`
- **`fundamentals_rulebook.py`** - `FUNDAMENTALS_RULEBOOK`
- **`position_risk_rulebook.py`** - `POSITION_RISK_RULEBOOK`

### 1.3 Core System

**`scoring_system.py`** - מכיל:
- Data structures (Input):
  - `IndicatorSnapshot`, `NewsItem`, `OptionsFlowSnapshot`, `MicroCompanySnapshot`, `MacroSnapshot`, `SectorSnapshot`, `SymbolState`, `UniverseState`
- Data structures (Output):
  - `ComponentScore`, `SymbolScoreResult`
- Base class:
  - `BaseScoringComponent` - בסיס לכל מחלקות הניקוד
- Scoring components:
  - `NewsScoringComponent`, `TechnicalIndicatorsComponent`, `MacroScoringComponent`, `SectorScoringComponent`, `OptionsFlowScoringComponent`, `MicroCompanyScoringComponent`, `RegimeConsistencyComponent`
- Master engine:
  - `MasterScoringEngine` (גרסה ישנה - יש גרסה חדשה ב-`scoring/master_scoring.py`)

## 2. SCORING ENGINES (מנועי ניקוד)

### 2.1 מבנה כללי של Scoring Engine

כל engine יורש מ-`BaseScoringComponent` או עובד באופן עצמאי עם מבנה דומה:

```python
class XxxScoringEngine:
    def __init__(self, rulebook=None):
        self.rulebook = rulebook or XXX_RULEBOOK
        self.weight = X.XX  # Module weight
    
    def score(self, snapshot: Dict[str, Any]) -> Dict[str, Any]:
        # Processes snapshot according to rulebook
        # Returns: {
        #     "minor_score": float,
        #     "major_score": float,
        #     "final_xxx_score": float,  # weighted
        #     "matched_states": List[str],
        #     ...
        # }
```

### 2.2 Scoring Engines שנוצרו

#### 2.2.1 Price Action Scoring
**קובץ:** `scoring/price_action_scoring.py`
**מחלקה:** `PriceActionScoringEngine`

- **Input:** `pattern_data: Dict[str, Any]` (structure, breakout, gaps, candles, וכו')
- **Output:** `{"minor_score", "major_score", "final_price_action_score", "matched_states"}`
- **Weight:** 1.2
- **מבנה:** מחפש states ב-`rulebook["patterns"]` -> `timeframes` -> `states`
- **Condition matching:** Logic matching ידני (no eval) - תומך ב-STRUCTURE, BREAKOUTS, GAPS, CANDLES, TRAPS

#### 2.2.2 Options Flow Scoring
**קובץ:** `scoring/options_flow_scoring.py`
**מחלקה:** `OptionsFlowScoringEngine`

- **Input:** `options_snapshot: Dict[str, Any]` (put_call_ratio, uoa, iv_change, gamma_position, וכו')
- **Output:** `{"minor_score", "final_options_flow_score", "matched_states"}` (רק MINOR timeframe)
- **Weight:** 1.05
- **מבנה:** מחפש states ב-`rulebook["timeframes"]["MINOR"]["states"]`
- **Condition matching:** Logic matching ידני - תומך ב-PUT/CALL IMBALANCE, UOA, OI, IV, SKEW, GAMMA

#### 2.2.3 Sentiment Scoring
**קובץ:** `scoring/sentiment_scoring.py`
**מחלקה:** `SentimentScoringEngine`

- **Input:** `sentiment_snapshot: Dict[str, Any]` (news_sentiment, social_sentiment, twitter_sentiment, reddit_sentiment, market_sentiment, stock_sentiment, volume_of_mentions, trending)
- **Output:** `{"minor_score", "major_score", "final_sentiment_score", "matched_states"}`
- **Weight:** 0.80
- **מבנה:** מחפש states ב-`rulebook["timeframes"]["MINOR|MAJOR"]["states"]`
- **Condition matching:** Logic matching ידני - תומך ב-STRONG_BULLISH, MILD_BULLISH, NEUTRAL, BEARISH, LOW_CONFIDENCE

#### 2.2.4 Fundamentals Scoring
**קובץ:** `scoring/fundamentals_scoring.py`
**מחלקה:** `FundamentalsScoringEngine`

- **Input:** `fundamentals_snapshot: Dict[str, Any]` (pe_ratio, ps_ratio, pb_ratio, eps_growth_5y, revenue_growth_yoy, profit_margin, roe, debt_to_equity, וכו')
- **Output:** `{"minor_score", "major_score", "final_fundamentals_score", "metric_scores", "matched_states"}`
- **Weight:** 0.75
- **מבנה:** מחפש states ב-`rulebook["metrics"]` -> `timeframes` -> `states`
- **Condition matching:** משתמש ב-`eval()` בצורה בטוחה (restricted environment)
- **מבנה מיוחד:** משתמש ב-groups עם base_weights, ו-metrics עם weights

#### 2.2.5 Position & Risk Scoring
**קובץ:** `scoring/position_risk_scoring.py`
**מחלקה:** `PositionRiskScoringEngine`

- **Input:** `account_state: Dict[str, Any]` + `position_state: Optional[Dict[str, Any]]`
- **Output:** `{"minor_score", "major_score", "final_position_risk_score", "metric_scores", "matched_states"}`
- **Weight:** 0.70
- **מבנה:** מחפש states ב-`rulebook["metrics"]` -> `timeframes` -> `states`
- **Condition matching:** משתמש ב-`eval()` בצורה בטוחה
- **Derived fields:** מחשב `daily_pl_abs`, `daily_pl_pct`, `capital_usage_pct`
- **מבנה מיוחד:** משתמש ב-groups עם base_weights, ו-metrics עם weights

## 3. MASTER SCORING ENGINE

### 3.1 מבנה
**קובץ:** `scoring/master_scoring.py`
**מחלקה:** `MasterScoringEngine`

### 3.2 תפקיד
- משלב את כל הציונים מהמודולים השונים למניקוד סופי אחד
- קובע direction (LONG/SHORT/NEUTRAL) לפי sign של הניקוד
- מספק רשימה מדורגת של מניות מהחזקה לחלשה

### 3.3 מבנה Input

```python
module_results = {
    "macro": {"final_macro_score": float, ...},
    "sector": {"final_sector_macro_score": float, ...},
    "news": {"final_news_score": float, ...},
    "technical": {"final_technical_score": float, ...},
    "options": {"final_options_score": float, ...},
    "pattern": {"final_pattern_price_score": float, ...},
    "strategy_context": {"final_strategy_context_score": float, ...},
    "position_risk": {"final_position_risk_score": float, ...}
}
```

### 3.4 Config

```python
config = {
    "use_macro": True,
    "use_sector": True,
    "use_news": True,
    "use_technical": True,
    "use_options": True,
    "use_pattern": True,
    "use_strategy_context": True,
    "use_position_risk": True,
    "direction_threshold": 2.0  # LONG if > 2.0, SHORT if < -2.0
}
```

### 3.5 Output

```python
@dataclass
class MasterScoreResult:
    symbol: str
    module_scores: Dict[str, float]  # { "macro": 4.5, "news": 2.1, ... }
    final_master_score: float  # [-10, 10]
    direction: str  # "LONG" | "SHORT" | "NEUTRAL"
    abs_strength: float  # abs(final_master_score)
    used_modules: List[str]  # ["macro", "news", ...]
```

### 3.6 לוגיקה

1. עובר על כל המודולים בסדר לוגי (`module_order`)
2. בודק אם מודול פעיל (`_is_module_enabled`)
3. מחלץ את הציון הסופי מהתוצאה (`module_score_keys`)
4. דוחס כל ניקוד ל-[-10, 10]
5. מחשב ממוצע פשוט (כל המשקלות כבר בתוך המודולים)
6. קובע direction לפי `direction_threshold`
7. מחזיר `MasterScoreResult`

### 3.7 Functions

- `score_symbol(symbol, module_results)` - ניקוד למניה אחת
- `rank_symbols(symbol_results, min_abs_score=0.0)` - דירוג מניות לפי absolute strength

## 4. עקרונות חשובים

### 4.1 Separation of Concerns
- **Rulebooks** = Logic definitions only (אין חישובים, אין חיבורי API)
- **Scoring Engines** = Pure scoring logic (אין חיבורי IBKR, אין שליחת פקודות)
- **Master Engine** = Aggregation only (רק משלב תוצאות קיימות)

### 4.2 Timeframes
- **MINOR** = Intraday timeframe (1m, 5m)
- **MAJOR** = Daily timeframe (daily, weekly)

### 4.3 Score Ranges
- כל הציונים בטווח [-10, +10]
- ציונים חיוביים = Bullish/Long bias
- ציונים שליליים = Bearish/Short bias

### 4.4 Module Weights
- כל module יש weight פנימי (1.2, 1.05, 0.80, 0.75, 0.70)
- ה-Master Engine מחשב ממוצע פשוט (weights כבר מיושמים)

### 4.5 Safe Eval
- חלק מה-engines משתמשים ב-`eval()` בצורה בטוחה
- Restricted environment: `{"__builtins__": {}}`
- רק משתנים מ-snapshot נגישים

## 5. מה צריך לבדוק

### 5.1 מבנה Rulebooks
- [ ] כל rulebook עוקב אחר המבנה הנכון
- [ ] כל state יש `condition` ו-`score_range`
- [ ] Conditions תקינים ו-valid Python expressions

### 5.2 Scoring Engines
- [ ] כל engine טוען את ה-rulebook הנכון
- [ ] כל engine מחזיר את המבנה הנכון (`final_xxx_score`)
- [ ] Condition matching עובד נכון
- [ ] Weights מיושמים נכון

### 5.3 Master Scoring
- [ ] Module mapping נכון (`module_score_keys`)
- [ ] Module order נכון (`module_order`)
- [ ] Clamping עובד נכון
- [ ] Direction determination עובד נכון
- [ ] Ranking עובד נכון

### 5.4 Integration
- [ ] כל ה-modules יכולים לעבוד יחד
- [ ] Master engine יכול לקבל תוצאות מכל ה-modules
- [ ] אין circular dependencies

### 5.5 Type Safety
- [ ] Type hints נכונים
- [ ] Optional types מסומנים נכון
- [ ] Dataclasses מוגדרים נכון

## 6. דוגמת שימוש מלא

```python
from scoring.master_scoring import MasterScoringEngine
from scoring.price_action_scoring import PriceActionScoringEngine
from scoring.options_flow_scoring import OptionsFlowScoringEngine
from scoring.sentiment_scoring import SentimentScoringEngine
from scoring.fundamentals_scoring import FundamentalsScoringEngine
from scoring.position_risk_scoring import PositionRiskScoringEngine

# Initialize engines
price_action_engine = PriceActionScoringEngine()
options_engine = OptionsFlowScoringEngine()
sentiment_engine = SentimentScoringEngine()
fundamentals_engine = FundamentalsScoringEngine()
position_risk_engine = PositionRiskScoringEngine()

# Prepare data for symbol "AAPL"
price_action_data = {...}
options_data = {...}
sentiment_data = {...}
fundamentals_data = {...}
account_state = {...}
position_state = {...}

# Score each module
module_results = {
    "pattern": price_action_engine.score(price_action_data),
    "options": options_engine.score(options_data),
    "sentiment": sentiment_engine.score(sentiment_data),
    "fundamentals": fundamentals_engine.score(fundamentals_data),
    "position_risk": position_risk_engine.score(account_state, position_state),
}

# Master scoring
master_engine = MasterScoringEngine()
result = master_engine.score_symbol("AAPL", module_results)

print(f"Symbol: {result.symbol}")
print(f"Final Score: {result.final_master_score}")
print(f"Direction: {result.direction}")
print(f"Strength: {result.abs_strength}")
```

## 7. הערות חשובות

1. **אין חיבורי IBKR** - המערכת לא מתחברת ל-IBKR, לא שולחת פקודות, לא מביאה נתונים
2. **Pure Logic** - רק לוגיקת ניקוד וניתוח
3. **Rulebooks לא מחושבים** - רק מגדירים conditions ו-score ranges
4. **Scoring Engines** - מעבדים נתונים לפי rulebooks
5. **Master Engine** - משלב תוצאות קיימות

## 8. מה חסר (להמשך)

1. יצירת rulebooks החסרים:
   - `options_flow_rulebook.py`
   - `sentiment_rulebook.py`
   - `fundamentals_rulebook.py`
   - `position_risk_rulebook.py`

2. אינטגרציה עם IBKR (בשלב מאוחר יותר)

3. Execution Engine (בשלב מאוחר יותר)

4. Testing ובדיקות

---

**בבקשה בדוק:**
1. האם המבנה נכון?
2. האם יש בעיות בלוגיקה?
3. האם יש missing pieces?
4. האם ה-integration נכון?
5. האם יש bugs או שגיאות?

