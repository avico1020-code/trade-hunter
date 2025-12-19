# 🎯 סיכום מערכת Algorithmic Trading Scoring System

## 📋 סקירה כללית

נבנתה מערכת דירוג (Scoring System) מודולרית למסחר אלגוריתמי בפייתון, התומכת במגוון קטגוריות ניתוח:
- News & Sentiment (חדשות וסנטימנט)
- Technical Indicators (אינדיקטורים טכניים)
- Price Action (תבניות מחיר)
- Options Flow (זרימת אופציות)
- Fundamentals (פונדמנטליים)
- Position & Risk Management (ניהול סיכונים)

---

## 📁 מבנה הקבצים

### 📚 Rulebooks (`/rulebooks/`)

כל rulebook מגדיר **לוגיקת ניקוד בלבד** (לא חישובים בפועל), באמצעות:
- **States** - מצבים שונים של השוק/המניה
- **Conditions** - תנאים ב-Python expressions להערכה עם `eval()`
- **Score ranges** - טווחי ציונים מ-10 עד +10
- **Timeframes** - MINOR (תוך-יומי) / MAJOR (יומי)

#### רשימת Rulebooks:

1. **`macro_rulebook.py`** - חוקי ניקוד לחדשות מאקרו-כלכליות
   - FED_RATE_DECISION, INFLATION_REPORT, EMPLOYMENT_REPORT, GDP/PMI, וכו'
   - מבנה: `timeframes → MINOR/MAJOR → states → condition, score_range`

2. **`sector_macro_rulebook.py`** - חוקי ניקוד לחדשות מאקרו ברמת סקטור
   - XLK, XLE, XLF, XLV, XLRE, XLI, XLB, XLY, XLP, XLU
   - מבנה: `sectors → {sector_name} → condition, score_range, time_weights`

3. **`news_micro_global_rulebook.py`** - חוקי ניקוד לחדשות מיקרו גלובליות
   - ANALYST_RATING_CHANGE, INDEX_INCLUSION_REMOVAL, INSIDER_ACTIVITY, SHORT_INTEREST_CHANGE

4. **`news_micro_rulebook.py`** - חוקי ניקוד לחדשות מיקרו ספציפיות לחברה
   - EARNINGS, GUIDANCE, DILUTION, BUYBACK, M&A, וכו'

5. **`news_rulebook.py`** - **איחוד של כל חוקי החדשות**
   - איחוד של 4 ה-rulebooks הנ"ל לספר חוקים אחד
   - מבנה: `timeframes → MINOR/MAJOR → states` (flat structure)

6. **`technical_indicator_rulebook.py`** - חוקי ניקוד לאינדיקטורים טכניים
   - RSI, MACD, Moving Averages, VWAP, Volume, ATR, Bollinger Bands
   - מבנה: `timeframes → MINOR/MAJOR → states → condition, score_range`
   - משתמש ב-`eval()` להערכת conditions

7. **`price_action_rulebook.py`** - חוקי ניקוד לתבניות מחיר
   - Market Structure, Reversal Patterns, Continuation Patterns, Level Reactions, Gaps, Candles
   - מבנה: `timeframes → MINOR/MAJOR → states → condition, score_range`

8. **`options_flow_rulebook.py`** - חוקי ניקוד לזרימת אופציות ⭐ **עודכן לאחרונה**
   - PUT/CALL imbalance, UOA (Unusual Options Activity), Open Interest, IV movement, Skew, Gamma
   - מבנה: `meta → groups → timeframes → MINOR → states`
   - 6 groups: PUT_CALL_IMBALANCE, UOA, OPEN_INTEREST, IV, SKEW, GAMMA
   - **Python expressions** ב-conditions (תומך ב-eval())
   - שדות: `call_volume_mult`, `put_volume_mult`, `uoa_call_notional_mult`, `iv_change_pct`, `gamma_exposure`, וכו'

9. **`sentiment_rulebook.py`** - חוקי ניקוד לסנטימנט ⭐ **עודכן לאחרונה**
   - News sentiment, Social sentiment, Twitter/Reddit, Market sentiment
   - מבנה: `timeframes → MINOR/MAJOR → states`
   - **Python expressions** ב-conditions
   - MINOR: 9 states (INTRADAY_EXTREME_BULLISH, INTRADAY_MILD_BULLISH, וכו')
   - MAJOR: 7 states (DAILY_PERSISTENT_BULLISH, DAILY_RISK_ON_ENVIRONMENT, וכו')
   - שדות: `stock_sentiment`, `news_sentiment`, `twitter_sentiment`, `volume_of_mentions`, `is_trending`

10. **`fundamentals_rulebook.py`** - חוקי ניקוד לפונדמנטליים
    - מבנה: `meta → groups → metrics → timeframes → MINOR/MAJOR → states`
    - 6 groups: VALUATION, GROWTH, PROFITABILITY, LEVERAGE, CASH_FLOW, DIVIDENDS
    - 11 metrics: PE_PB_VALUATION, PS_VALUATION, EPS_GROWTH, REVENUE_GROWTH, וכו'
    - **Python expressions** ב-conditions

11. **`position_risk_rulebook.py`** - חוקי ניקוד לניהול סיכונים ⭐ **עודכן לאחרונה**
    - מבנה: `meta → groups → metrics → timeframes → MINOR/MAJOR → states`
    - 3 groups: ACCOUNT_RISK, POSITION_RISK, EXPOSURE_RISK
    - 7 metrics: DAILY_DRAWDOWN, CAPITAL_USAGE, RISK_PER_TRADE, POSITION_PERFORMANCE_STRESS, SYMBOL_EXPOSURE, SECTOR_EXPOSURE, CORRELATED_EXPOSURE, OPEN_POSITIONS_COUNT
    - **Python expressions** ב-conditions
    - שדות: `daily_pl_pct`, `capital_usage_pct`, `position_risk_pct`, `rr_multiple_live`, `symbol_exposure_pct`, וכו'

12. **`scoring_system.py`** - המערכת המרכזית (Core System)
    - Data structures: `IndicatorSnapshot`, `NewsItem`, `OptionsFlowSnapshot`, `SymbolState`, `UniverseState`
    - Base class: `BaseScoringComponent`
    - Scoring components: News, Technical, Macro, Sector, Options Flow, Micro Company, Regime Consistency
    - Master engine: `MasterScoringEngine`

### ⚙️ Scoring Engines (`/scoring/`)

כל scoring engine **מבצע את החישובים בפועל** על בסיס ה-rulebook המתאים:

1. **`options_flow_scoring.py`** ⭐ **עודכן לאחרונה**
   - Class: `OptionsFlowScoringEngine`
   - Dataclass: `OptionsFlowScoreResult`
   - משתמש ב-**safe eval()** להערכת conditions
   - תומך ב-groups ו-weights
   - מצטבר scores (לא ממוצע)
   - Output: `minor_score`, `final_options_flow_score`, `matched_states`, `state_details`

2. **`sentiment_scoring.py`** ⭐ **עודכן לאחרונה**
   - Class: `SentimentScoringEngine`
   - משתמש ב-**safe eval()** להערכת conditions
   - תומך ב-MINOR ו-MAJOR timeframes
   - משלב scores: `0.6 * minor + 0.4 * major`
   - Module weight: `0.80`
   - Output: `minor_score`, `major_score`, `final_sentiment_score`, `matched_states`, `state_details`

3. **`fundamentals_scoring.py`**
   - Class: `FundamentalsScoringEngine`
   - מבנה: `metrics → groups → timeframes → states`
   - משתמש ב-**safe eval()** להערכת conditions
   - משלב scores לפי משקלי groups ו-metrics
   - Output: `minor_score`, `major_score`, `final_fundamentals_score`, `metric_scores`, `matched_states`

4. **`position_risk_scoring.py`**
   - Class: `PositionRiskScoringEngine`
   - מבנה: `metrics → groups → timeframes → states`
   - משתמש ב-**safe eval()** להערכת conditions
   - Output: `minor_score`, `major_score`, `final_position_risk_score`, `metric_scores`, `matched_states`

5. **`price_action_scoring.py`**
   - Class: `PriceActionScoringEngine`
   - משתמש ב-**manual logic matching** (לא eval) כי conditions הם keywords פשוטים

6. **`master_scoring.py`** - המנוע הראשי
   - Class: `MasterScoringEngine`
   - Dataclass: `MasterScoreResult`
   - משלב scores מכל ה-modules
   - Output: `symbol`, `module_scores`, `final_master_score`, `direction`, `abs_strength`, `used_modules`

---

## 🏗️ ארכיטקטורה

### עקרונות עיצוב:

1. **Separation of Concerns** (הפרדת אחריות)
   - **Rulebooks** = לוגיקה בלבד (מה לבדוק, איך לפרש)
   - **Scoring Engines** = ביצוע בפועל (איך לחשב, איך לשלב)

2. **Unified Structure** (מבנה אחיד)
   - כל rulebook משתמש באותו מבנה בסיסי: `meta → timeframes → states`
   - Rulebooks מורכבים יותר משתמשים ב: `meta → groups → metrics → timeframes → states`
   - כל state כולל: `condition`, `score_range`, `notes` (ולעיתים `raw_signal`, `group`)

3. **Safe Eval Pattern** (דפוס eval בטוח)
   ```python
   def _safe_eval(self, condition: str, variables: Dict[str, Any]) -> bool:
       try:
           return bool(eval(condition, {"__builtins__": {}}, variables))
       except Exception:
           return False
   ```
   - **מגבלות**: אין גישה ל-`__builtins__` = בטיחות מוגברת
   - **תמיכה**: רק ב-functions ובשדות מה-snapshot

4. **Timeframe Hierarchy** (היררכיית timeframes)
   - **MINOR** = תוך-יומי (intraday) - תגובות מהירות, תנודתיות גבוהה
   - **MAJOR** = יומי/רב-יומי - מגמות ארוכות טווח, bias כללי
   - Scoring engines משלבים בין timeframes (לרוב: 60% minor, 40% major)

5. **Group-Based Weighting** (שקילות לפי groups)
   - Groups מגדירים `base_weight` (למשל: ACCOUNT_RISK = 1.2)
   - Metrics בתוך groups יכולים לקבל `weight` נוסף
   - Final score = weighted sum של כל ה-matched states

---

## ⚠️ הערות חשובות על מבנה הקוד

### ✅ נקודות חוזק:

1. **מודולריות מלאה**
   - כל rulebook עצמאי וניתן לעדכון ללא השפעה על אחרים
   - Scoring engines ממוקמים בנפרד וניתנים לבדיקה בודדת

2. **Type Safety**
   - שימוש ב-`TypedDict` ב-rulebooks
   - Type hints מלאים ב-scoring engines
   - Dataclasses ל-output structures

3. **קריאות**
   - מבנה אחיד בכל ה-rulebooks
   - Documentation מפורט בכל state
   - שמות משתנים ברורים

4. **גמישות**
   - Conditions הם Python expressions - ניתן להוסיף לוגיקה מורכבת
   - Groups ו-weights מאפשרים עדכון משקלים ללא שינוי קוד

### ⚠️ נקודות לשיפור פוטנציאליות:

1. **eval() Security** (אבטחה)
   - ⚠️ שימוש ב-`eval()` תמיד מסוכן, גם עם restricted environment
   - **המלצה**: בעתיד לשקול מעבר ל-parser/custom expression evaluator
   - **לעת עתה**: ה-restricted environment מספיק בטוח למקרה שימוש זה

2. **Consistency in Condition Evaluation**
   - חלק מה-scoring engines משתמשים ב-**eval()** (fundamentals, position_risk, options_flow, sentiment)
   - חלק משתמשים ב-**manual matching** (price_action - כי conditions הם keywords פשוטים)
   - **המלצה**: לשקול איחוד לאחד - או eval() לכל, או manual matching לכל

3. **Error Handling** (טיפול בשגיאות)
   - אם condition נכשל - ה-engine פשוט מחזיר `False`
   - **המלצה**: לשקול logging של conditions שנכשלו לניפוי באגים

4. **Performance** (ביצועים)
   - eval() יכול להיות איטי אם יש הרבה states
   - **המלצה**: לשקול caching של compiled conditions או pre-filtering של states רלוונטיים

5. **State Overlap** (חפיפה בין states)
   - ייתכן שכמה states יתאימו בו-זמנית
   - **נוכחי**: Scoring engines מצטברים או ממוצעים את כל ה-matched scores
   - **המלצה**: לשקול priority system או mutual exclusion בין states מסוימים

6. **Testing** (בדיקות)
   - אין test files נראים לעין
   - **המלצה**: ליצור unit tests לכל scoring engine עם mock snapshots

7. **Documentation** (תיעוד)
   - חסר README מפורט שמסביר איך להשתמש במערכת
   - **המלצה**: להוסיף examples של שימוש בכל engine

---

## 📊 דוגמאות שימוש

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
# Returns: {minor_score, final_options_flow_score, matched_states, state_details}
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
# Returns: {minor_score, major_score, final_sentiment_score, matched_states, state_details}
```

### Position Risk Scoring:
```python
from scoring.position_risk_scoring import PositionRiskScoringEngine

engine = PositionRiskScoringEngine()
snapshot = {
    "daily_pl_pct": -2.0,
    "capital_usage_pct": 0.8,
    "max_capital_pct": 0.5,
    "position_risk_pct": 0.03,
    "max_risk_per_trade_pct": 0.02,
    "has_open_position": True
}
result = engine.score(account_state, position_state)
# Returns: {minor_score, major_score, final_position_risk_score, metric_scores, matched_states}
```

---

## 🔄 זרימת העבודה

1. **Data Ingestion** → מספק snapshot עם נתונים (למשל: options flow, sentiment, וכו')
2. **Rulebook Loading** → טוען את ה-rulebook המתאים
3. **State Matching** → בודק אילו states מתאימים לפי conditions
4. **Score Calculation** → מחשב scores לפי score_ranges
5. **Weighting** → מיישם group weights ו-metric weights
6. **Aggregation** → משלב scores מ-MINOR/MAJOR timeframes
7. **Final Score** → מחזיר final weighted score + matched states

---

## 📈 סיכום

**מה נבנה:**
- ✅ 11 rulebooks מלאים ומפורטים
- ✅ 6 scoring engines פונקציונליים
- ✅ Master scoring engine לאיחוד כל ה-modules
- ✅ ארכיטקטורה מודולרית וגמישה
- ✅ תמיכה ב-safe eval() עם restricted environment
- ✅ מבנה אחיד ועקבי בכל הקבצים

**סטטוס:**
- ✅ המערכת מוכנה לשימוש
- ⚠️ מומלץ להוסיף tests ו-documentation מפורטת
- ⚠️ לשקול שיפורי ביצועים אם יש צורך

---

**תאריך עדכון אחרון**: 2025-01-20

