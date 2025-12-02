from __future__ import annotations

from dataclasses import dataclass, field

from typing import Dict, Any, List, Optional, Tuple

import math

import time





# ==============================

# 1. DATA STRUCTURES – INPUT

# ==============================



@dataclass

class IndicatorSnapshot:

    """מצב אינדיקטורים למניה אחת בטיימפריים אחד."""

    timeframe: str  # "MINOR" / "MAJOR"

    rsi: Optional[float] = None

    macd: Optional[float] = None

    macd_signal: Optional[float] = None

    macd_histogram: Optional[float] = None

    sma9: Optional[float] = None

    sma20: Optional[float] = None

    sma50: Optional[float] = None

    sma150: Optional[float] = None

    sma200: Optional[float] = None

    vwap: Optional[float] = None

    atr: Optional[float] = None

    upper_band: Optional[float] = None

    lower_band: Optional[float] = None

    bandwidth: Optional[float] = None

    price: Optional[float] = None

    volume: Optional[float] = None

    avg_volume_same_period: Optional[float] = None

    intraday_ATR: Optional[float] = None

    # אפשר להוסיף כאן עוד ערכים לפי הצורך





@dataclass

class NewsItem:

    symbol: Optional[str]  # None = חדשות מאקרו / שוק

    sector: Optional[str]  # למשל "XLK"

    scope: str             # MARKET_MACRO / STOCK_MICRO / STOCK_MICRO_GLOBAL / SECTOR_MACRO

    news_type: str         # למשל FED_RATE_DECISION, EARNINGS וכו'

    surprise_level: Optional[str] = None  # HUGE_POSITIVE / MILD_NEGATIVE וכו'

    raw_text: str = ""

    timestamp: float = field(default_factory=time.time)

    extra: Dict[str, Any] = field(default_factory=dict)





@dataclass

class OptionsFlowSnapshot:

    symbol: str

    put_call_ratio: Optional[float] = None

    call_volume_multiple: Optional[float] = None  # כמה מעל הממוצע

    put_volume_multiple: Optional[float] = None

    unusual_activity: bool = False

    uoa_direction: Optional[str] = None  # "CALL" / "PUT"

    iv_change_pct: Optional[float] = None

    skew_type: Optional[str] = None      # "PUT_SKEW" / "CALL_SKEW"

    gamma_regime: Optional[str] = None   # "POSITIVE" / "NEGATIVE"

    extra: Dict[str, Any] = field(default_factory=dict)





@dataclass

class MicroCompanySnapshot:

    symbol: str

    last_earnings_surprise: Optional[float] = None  # אחוז מעל\מתחת צפי

    guidance_delta: Optional[float] = None          # שינוי בהנחיות

    had_dilution: bool = False

    had_buyback: bool = False

    management_event: Optional[str] = None  # "CEO_RESIGN", "NEW_CEO" וכו'

    legal_risk_level: Optional[str] = None  # "HIGH" / "MEDIUM" / "LOW"

    mna_role: Optional[str] = None          # "TARGET" / "ACQUIRER" / None

    extra: Dict[str, Any] = field(default_factory=dict)





@dataclass

class MacroSnapshot:

    """מצב שוק כללי (מאקרו) – מהמחלקה של Market Macro."""

    spy_daily_regime_score: float = 0.0     # למשל -10 עד +10

    spy_intraday_regime_score: float = 0.0

    vix_score: float = 0.0

    fear_greed_score: float = 0.0

    macro_news_score: float = 0.0          # חדשות מאקרו מצטברות (Fed, CPI, NFP וכו')

    extra: Dict[str, Any] = field(default_factory=dict)





@dataclass

class SectorSnapshot:

    sector: str        # XLK, XLE, XLF וכו'

    sector_score_daily: float  # -10 עד +10

    sector_score_intraday: float

    extra: Dict[str, Any] = field(default_factory=dict)





@dataclass

class SymbolState:

    """כל המידע למניה אחת שנדרש לכל המחלקות."""

    symbol: str

    sector: Optional[str] = None           # XLK וכו'

    price: Optional[float] = None

    indicators_minor: Optional[IndicatorSnapshot] = None

    indicators_major: Optional[IndicatorSnapshot] = None

    news_items: List[NewsItem] = field(default_factory=list)

    options_flow: Optional[OptionsFlowSnapshot] = None

    micro_company: Optional[MicroCompanySnapshot] = None





@dataclass

class UniverseState:

    """מצב של כל היקום – כל המניות + שוק + סקטורים."""

    symbols: Dict[str, SymbolState]

    macro: MacroSnapshot

    sectors: Dict[str, SectorSnapshot]

    # חדשות שוק/סקטור – לא רק ספציפי למניה

    global_news: List[NewsItem] = field(default_factory=list)





# ==============================

# 2. DATA STRUCTURES – OUTPUT

# ==============================



@dataclass

class ComponentScore:

    component_name: str

    raw_score: float        # -10..+10 לפני משקל

    weight: float           # משקל במאסטר

    weighted_score: float   # raw_score * weight

    details: Dict[str, Any] = field(default_factory=dict)





@dataclass

class SymbolScoreResult:

    symbol: str

    total_score: float              # סכום כל ה-weighted_score

    direction: str                  # "LONG" / "SHORT" / "NEUTRAL"

    components: List[ComponentScore]

    extra: Dict[str, Any] = field(default_factory=dict)





# ==============================

# 3. BASE CLASS FOR COMPONENTS

# ==============================



class BaseScoringComponent:

    """

    בסיס לכל המחלקות: חדשות, אינדיקטורים, מאקרו, סקטור וכו'.

    כל מחלקה תחזיר ציון אחד למניה אחת: -10..+10.

    """



    def __init__(self, name: str, weight: float):

        self.name = name

        self.weight = weight



    def score_symbol(

        self,

        symbol_state: SymbolState,

        universe_state: UniverseState

    ) -> ComponentScore:

        """

        מחזיר ציון בודד למניה אחת, כולל משקל.

        """

        raw_score, details = self._compute_raw_score(symbol_state, universe_state)

        # נוודא טווח בטוח

        raw_score_clamped = max(-10.0, min(10.0, raw_score))

        weighted = raw_score_clamped * self.weight

        return ComponentScore(

            component_name=self.name,

            raw_score=raw_score_clamped,

            weight=self.weight,

            weighted_score=weighted,

            details=details

        )



    def _compute_raw_score(

        self,

        symbol_state: SymbolState,

        universe_state: UniverseState

    ) -> Tuple[float, Dict[str, Any]]:

        """

        מימוש לכל מחלקה ספציפית. צריך להחזיר:

        - raw_score בטווח בערך -10..+10

        - details עם פירוט (אופציונלי)

        """

        raise NotImplementedError





# ==============================

# 4. NEWS SCORING COMPONENT

# ==============================



class NewsScoringComponent(BaseScoringComponent):

    """

    מחלקת חדשות – משתמשת ב-NEWS_RULEBOOK שהגדרת קודם.

    כאן אנחנו מניחים שיש:

        NEWS_RULEBOOK: dict

    עם כל ה-NEWS_TYPE, surprise levels וכו'.

    """



    def __init__(self, weight: float, rulebook: Dict[str, Any]):

        super().__init__(name="NEWS", weight=weight)

        self.rulebook = rulebook



    def _compute_raw_score(

        self,

        symbol_state: SymbolState,

        universe_state: UniverseState

    ) -> Tuple[float, Dict[str, Any]]:

        # 1. חדשות שוק/מאקרו

        # 2. חדשות סקטור

        # 3. חדשות ספציפיות למניה

        # 4. מיזוג לפי RULEBOOK



        total_score = 0.0

        count = 0

        contributions = []



        # מניה ללא חדשות מקבלת ציון חלש אבל לא 0 (כמו שסיכמנו)

        base_no_news_bias = 0.0



        # חדשות גלובליות (שוק / מאקרו / סקטור)

        for item in universe_state.global_news:

            score = self._score_single_news_item(item, symbol_state)

            if score is not None:

                total_score += score

                count += 1

                contributions.append(

                    {"scope": item.scope, "type": item.news_type, "score": score}

                )



        # חדשות ספציפיות למניה

        for item in symbol_state.news_items:

            score = self._score_single_news_item(item, symbol_state)

            if score is not None:

                total_score += score

                count += 1

                contributions.append(

                    {"scope": item.scope, "type": item.news_type, "score": score}

                )



        if count == 0:

            # אין חדשות – ציון חלש סביב 0

            total_score = base_no_news_bias

            count = 1



        avg_score = total_score / count

        # לוודא טווח (-10..+10)

        avg_score = max(-10.0, min(10.0, avg_score))



        details = {

            "avg_news_score": avg_score,

            "items_contributed": contributions,

        }

        return avg_score, details



    def _score_single_news_item(

        self,

        item: NewsItem,

        symbol_state: SymbolState

    ) -> Optional[float]:

        """

        ניקוד לידיעה יחידה לפי ה-RULEBOOK:

        - news_type

        - surprise_level

        - sector_sensitivity וכו'.

        """

        news_type = item.news_type

        rule = self.rulebook.get(news_type)

        if not rule:

            return None



        base_impact = rule.get("base_impact", 0)

        scoring_config = rule.get("scoring", {})

        surprise = item.surprise_level or "INLINE"



        # אפשר לחדד לפי הטווחים שהגדרת (HUGE_POSITIVE וכו')

        surprise_cfg = scoring_config.get(surprise)

        if not surprise_cfg:

            # אם אין הגדרה – נלך על 0

            return 0.0



        # surprise_cfg יכול להיות [min,max] או מספר קבוע – נבחר מרכז הטווח

        if isinstance(surprise_cfg, (list, tuple)) and len(surprise_cfg) == 2:

            low, high = surprise_cfg

            value = (low + high) / 2.0

        else:

            value = float(surprise_cfg)



        # התאמת סקטור אם רלוונטי

        sector_mult = 1.0

        sector = symbol_state.sector

        sector_sensitivity_map = self.rulebook.get("SECTOR_SENSITIVITY", {})

        if sector and sector in sector_sensitivity_map:

            sector_mult = sector_sensitivity_map[sector]



        return value * sector_mult





# ==============================

# 5. TECHNICAL INDICATOR COMPONENT

# ==============================



class TechnicalIndicatorsComponent(BaseScoringComponent):

    """

    מחלקת אינדיקטורים – משתמשת ב-TECHNICAL_INDICATOR_RULEBOOK שהגדרת.

    היא מקבלת:

        - indicators_minor

        - indicators_major

    וניקוד לכל indicator לפי STATES ו-score_range.

    """



    def __init__(self, weight: float, rulebook: Dict[str, Any]):

        super().__init__(name="TECHNICAL", weight=weight)

        self.rulebook = rulebook

        self.meta = rulebook.get("meta", {})

        self.indicator_defs = rulebook.get("indicators", {})



    def _compute_raw_score(

        self,

        symbol_state: SymbolState,

        universe_state: UniverseState

    ) -> Tuple[float, Dict[str, Any]]:

        if symbol_state.indicators_minor is None and symbol_state.indicators_major is None:

            return 0.0, {"reason": "no_indicator_data"}



        components = []

        total_score = 0.0

        total_weight = 0.0



        # נעבור על כל אינדיקטור שמוגדר ב-rulebook

        for name, cfg in self.indicator_defs.items():

            base_impact = cfg.get("base_impact", 5)

            group = cfg.get("group", "MOMENTUM")



            indicator_score_minor, detail_minor = self._score_indicator_timeframe(

                name, cfg, symbol_state, symbol_state.indicators_minor, timeframe="MINOR"

            )

            indicator_score_major, detail_major = self._score_indicator_timeframe(

                name, cfg, symbol_state, symbol_state.indicators_major, timeframe="MAJOR"

            )



            # אפשר לעשות משקל 60% ל-MINOR, 40% ל-MAJOR למשל

            combined = 0.0

            w_minor, w_major = 0.6, 0.4

            if indicator_score_minor is not None:

                combined += indicator_score_minor * w_minor

            if indicator_score_major is not None:

                combined += indicator_score_major * w_major



            # ננרמל לפי base_impact (אם נרצה) – פה נשאיר כמו שהוא

            components.append({

                "indicator": name,

                "group": group,

                "minor_score": indicator_score_minor,

                "major_score": indicator_score_major,

                "combined": combined,

                "detail_minor": detail_minor,

                "detail_major": detail_major,

            })



            total_score += combined * base_impact

            total_weight += abs(base_impact)



        if total_weight == 0:

            final_score = 0.0

        else:

            final_score = total_score / total_weight



        # לוודא טווח

        final_score = max(-10.0, min(10.0, final_score))



        details = {

            "indicators_breakdown": components,

            "final_technical_score": final_score,

        }

        return final_score, details



    def _score_indicator_timeframe(

        self,

        name: str,

        cfg: Dict[str, Any],

        symbol_state: SymbolState,

        snapshot: Optional[IndicatorSnapshot],

        timeframe: str

    ) -> Tuple[Optional[float], Dict[str, Any]]:

        if snapshot is None:

            return None, {"reason": f"no_{timeframe}_data"}



        tf_cfg = cfg.get("timeframes", {}).get(timeframe)

        if not tf_cfg:

            return None, {"reason": f"no_{timeframe}_config"}



        states = tf_cfg.get("states", {})

        context_rules = tf_cfg.get("context_rules", [])



        matched_states = []

        raw_scores = []



        for state_name, state_cfg in states.items():

            condition_str = state_cfg.get("condition", "")

            score_range = state_cfg.get("score_range", [-1, 1])



            if self._evaluate_condition(condition_str, snapshot, symbol_state):

                # ניקח את המרכז של score_range

                if isinstance(score_range, (list, tuple)) and len(score_range) == 2:

                    low, high = score_range

                    s = (low + high) / 2.0

                else:

                    s = float(score_range)

                raw_scores.append(s)

                matched_states.append({"state": state_name, "score": s})



        if not raw_scores:

            return 0.0, {"matched_states": [], "reason": "no_state_matched"}



        base_score = sum(raw_scores) / len(raw_scores)



        # TODO: להוסיף כאן יישום context_rules אם תרצה

        # כרגע נשאיר כמו שהוא

        return base_score, {"matched_states": matched_states, "base_score": base_score}



    def _evaluate_condition(

        self,

        condition: str,

        snapshot: IndicatorSnapshot,

        symbol_state: SymbolState

    ) -> bool:

        """

        כאן תהיה הלוגיקה שתתרגם "rsi >= 70" וכדומה.

        כרגע נעשה מימוש בסיסי מאוד עם eval מוגבל.

        ב-Cursor תוכל לשפר את זה ללוגיקה בטוחה יותר.

        """

        # מילון משתנים זמין ל-eval

        env = {

            "rsi": snapshot.rsi,

            "macd": snapshot.macd,

            "signal": snapshot.macd_signal,

            "histogram": snapshot.macd_histogram,

            "sma9": snapshot.sma9,

            "sma20": snapshot.sma20,

            "sma50": snapshot.sma50,

            "sma150": snapshot.sma150,

            "sma200": snapshot.sma200,

            "vwap": snapshot.vwap,

            "atr": snapshot.atr,

            "upper_band": snapshot.upper_band,

            "lower_band": snapshot.lower_band,

            "bandwidth": snapshot.bandwidth,

            "price": snapshot.price or symbol_state.price,

            "current_volume": snapshot.volume,

            "avg_volume_same_period": snapshot.avg_volume_same_period,

            "intraday_ATR": snapshot.intraday_ATR,

            "abs": abs,

            "math": math,

        }



        cond = condition.strip()

        if not cond:

            return False



        # תנאים מורכבים כמו "price: lower low AND rsi: higher low" – צריך לוגיקה נפרדת.

        # פה נשאיר אותם לפיתוח בהמשך ונחזיר False עבורם.

        if "AND" in cond or ":" in cond:

            return False



        try:

            return bool(eval(cond, {"__builtins__": {}}, env))

        except Exception:

            return False





# ==============================

# 6. MACRO SCORING COMPONENT

# ==============================



class MacroScoringComponent(BaseScoringComponent):

    """

    מחלקת מאקרו – משתמשת ב-MacroSnapshot:

    - SPY daily / intraday regime

    - VIX

    - Fear & Greed

    - Macro news score

    """



    def __init__(self, weight: float):

        super().__init__(name="MACRO", weight=weight)



    def _compute_raw_score(

        self,

        symbol_state: SymbolState,

        universe_state: UniverseState

    ) -> Tuple[float, Dict[str, Any]]:

        macro = universe_state.macro



        # משקלים פנימיים למאקרו

        w_spy_daily = 0.35

        w_spy_intraday = 0.25

        w_vix = 0.2

        w_fear_greed = 0.1

        w_macro_news = 0.1



        score = (

            macro.spy_daily_regime_score * w_spy_daily +

            macro.spy_intraday_regime_score * w_spy_intraday +

            macro.vix_score * w_vix +

            macro.fear_greed_score * w_fear_greed +

            macro.macro_news_score * w_macro_news

        )



        # לוודא טווח

        score = max(-10.0, min(10.0, score))



        details = {

            "spy_daily_regime_score": macro.spy_daily_regime_score,

            "spy_intraday_regime_score": macro.spy_intraday_regime_score,

            "vix_score": macro.vix_score,

            "fear_greed_score": macro.fear_greed_score,

            "macro_news_score": macro.macro_news_score,

            "combined_macro_score": score,

        }

        return score, details





# ==============================

# 7. SECTOR SCORING COMPONENT

# ==============================



class SectorScoringComponent(BaseScoringComponent):

    """

    מחלקת סקטור – מה שקבענו ב-Sector Macro:

    - sector_score_daily

    - sector_score_intraday

    """



    def __init__(self, weight: float):

        super().__init__(name="SECTOR", weight=weight)



    def _compute_raw_score(

        self,

        symbol_state: SymbolState,

        universe_state: UniverseState

    ) -> Tuple[float, Dict[str, Any]]:

        sector = symbol_state.sector

        if not sector or sector not in universe_state.sectors:

            return 0.0, {"reason": "no_sector_data"}



        sector_snap = universe_state.sectors[sector]

        w_daily, w_intraday = 0.5, 0.5

        score = sector_snap.sector_score_daily * w_daily + sector_snap.sector_score_intraday * w_intraday

        score = max(-10.0, min(10.0, score))



        details = {

            "sector": sector,

            "daily": sector_snap.sector_score_daily,

            "intraday": sector_snap.sector_score_intraday,

            "combined_sector_score": score,

        }

        return score, details





# ==============================

# 8. OPTIONS FLOW COMPONENT

# ==============================



class OptionsFlowScoringComponent(BaseScoringComponent):

    """

    מחלקת אופציות – משתמשת ב-OptionsFlowSnapshot:

    - put/call ratio

    - unusual activity

    - IV movement

    - skew

    - gamma regime

    """



    def __init__(self, weight: float):

        super().__init__(name="OPTIONS_FLOW", weight=weight)



    def _compute_raw_score(

        self,

        symbol_state: SymbolState,

        universe_state: UniverseState

    ) -> Tuple[float, Dict[str, Any]]:

        of = symbol_state.options_flow

        if of is None:

            return 0.0, {"reason": "no_options_flow_data"}



        score = 0.0

        parts = []



        # put/call ratio

        if of.put_call_ratio is not None:

            if of.put_call_ratio < 0.6:

                s = +4.0  # call-heavy

                parts.append(("put_call_ratio_bullish", s))

                score += s

            elif of.put_call_ratio > 2.0:

                s = -4.0

                parts.append(("put_call_ratio_bearish", s))

                score += s



        # unusual activity

        if of.unusual_activity and of.uoa_direction:

            if of.uoa_direction.upper() == "CALL":

                s = +5.0

                parts.append(("uoa_call", s))

                score += s

            elif of.uoa_direction.upper() == "PUT":

                s = -5.0

                parts.append(("uoa_put", s))

                score += s



        # IV movement

        if of.iv_change_pct is not None:

            if of.iv_change_pct > 20:

                s = -3.0

                parts.append(("iv_spike", s))

                score += s

            elif of.iv_change_pct < -15:

                s = +2.0

                parts.append(("iv_crush", s))

                score += s



        # gamma regime

        if of.gamma_regime == "POSITIVE":

            s = +1.5

            parts.append(("gamma_positive", s))

            score += s

        elif of.gamma_regime == "NEGATIVE":

            s = -2.0

            parts.append(("gamma_negative", s))

            score += s



        # נוודא טווח

        score = max(-10.0, min(10.0, score))



        details = {

            "components": parts,

            "options_flow_score": score,

        }

        return score, details





# ==============================

# 9. MICRO COMPANY COMPONENT

# ==============================



class MicroCompanyScoringComponent(BaseScoringComponent):

    """

    מחלקת מיקרו-חברה:

    - earnings

    - guidance

    - dilution

    - buyback

    - management_change

    - legal/regulatory

    - M&A

    Canonical Specification Weights:
    - EARNINGS_SURPRISE: positive +5.0, negative -6.0
    - GUIDANCE_DELTA: positive +3.0, negative -4.0
    - DILUTION: -7.0 (fixed)
    - BUYBACK: +4.0 (fixed)
    - MANAGEMENT_EVENT: positive +5.0, negative -5.0
    - LEGAL_RISK: high -8.0, medium -4.0
    
    Formula: micro_raw_score = sum(all_event_scores)
             micro_score = clamp(micro_raw_score, -10, +10)
             Final contribution to Master Score = micro_score * 0.12
    
    Refresh Rules:
    The Micro Company Scoring department must recompute its department score
    whenever ANY of the event types is detected.
    
    Refresh triggers:
    - EARNINGS_SURPRISE: Quarterly earnings report release, preliminary announcement,
                         pre-earnings guidance update, unexpected release, major revision
    - GUIDANCE_DELTA: Forward EPS/revenue guidance update, profit warning,
                      management revising future outlook, upward/downward guidance revision
    - DILUTION_EVENT: ATM offering, secondary offering filing, convertible notes,
                      shelf registration, SEC filing indicating share count increase
    - BUYBACK: New buyback announcement, expansion of existing buyback,
               special share repurchase authorization, unexpected suspension
    - MANAGEMENT_EVENT: CEO/CFO/COO appointment, executive resignation,
                        board restructuring, termination of key leadership,
                        public announcement of management scandal
    - LEGAL_RISK: New lawsuit filed, class action announced, SEC investigation,
                  DOJ/regulatory body involvement, compliance failure/audit irregularity,
                  settlement or dismissal of major legal case
    - OPERATIONAL_NEWS: Major product launch, product recall/failure,
                        supply chain disruption, partnership agreement/termination,
                        unexpected shutdown of operations
    - ANALYST_ACTIONS: Analyst upgrade/downgrade, price target change beyond threshold,
                       initiation of coverage by major analyst, short report released
    """



    # Refresh rules for Micro Company Scoring
    REFRESH_RULES = {
        "EARNINGS_SURPRISE": {
            "refresh_on": [
                "Quarterly earnings report release",
                "Preliminary earnings announcement",
                "Pre-earnings guidance update",
                "Unexpected earnings release or moved earnings date",
                "Major revision by the company before the official report"
            ]
        },
        "GUIDANCE_DELTA": {
            "refresh_on": [
                "Forward EPS or revenue guidance update",
                "Profit warning or revenue warning",
                "Management revising future outlook (8-K filing)",
                "Upward guidance revision (positive delta)",
                "Downward guidance revision (negative delta)"
            ]
        },
        "DILUTION_EVENT": {
            "refresh_on": [
                "ATM offering announcement",
                "Secondary offering filing",
                "Convertible notes issuance",
                "Shelf registration update",
                "Any SEC filing indicating share count increase (8-K, S-3, S-1)"
            ]
        },
        "BUYBACK": {
            "refresh_on": [
                "New buyback program announcement",
                "Expansion of existing buyback program",
                "Special share repurchase authorization",
                "Unexpected suspension of buyback program"
            ]
        },
        "MANAGEMENT_EVENT": {
            "refresh_on": [
                "CEO/CFO/COO appointment",
                "Executive resignation",
                "Board restructuring or high-level executive hire",
                "Termination of key leadership under abnormal conditions",
                "Public announcement of management scandal"
            ]
        },
        "LEGAL_RISK": {
            "refresh_on": [
                "New lawsuit filed",
                "Class action announced",
                "SEC investigation",
                "DOJ or regulatory body involvement",
                "Major compliance failure or audit irregularity",
                "Settlement or dismissal of major legal case"
            ]
        },
        "OPERATIONAL_NEWS": {
            "refresh_on": [
                "Major product launch",
                "Product recall or failure",
                "Supply chain disruption specific to company",
                "Major partnership agreement",
                "Termination of key partnership",
                "Unexpected shutdown of operations"
            ]
        },
        "ANALYST_ACTIONS": {
            "refresh_on": [
                "Analyst upgrade/downgrade",
                "Price target change beyond defined threshold",
                "Initiation of coverage by a major analyst",
                "Short report released (Hindenburg-style)"
            ]
        }
    }

    def __init__(self, weight: float):

        super().__init__(name="MICRO_COMPANY", weight=weight)



    def _compute_raw_score(

        self,

        symbol_state: SymbolState,

        universe_state: UniverseState

    ) -> Tuple[float, Dict[str, Any]]:

        mc = symbol_state.micro_company

        if mc is None:

            return 0.0, {"reason": "no_micro_company_data"}



        score = 0.0

        parts = []



        # earnings surprise (canonical: positive +5.0, negative -6.0)
        if mc.last_earnings_surprise is not None:
            # Canonical specification: EPS beat + Revenue beat → +5, EPS miss + Revenue miss → -6
            if mc.last_earnings_surprise > 5:
                s = +5.0  # Canonical weight for strong positive
            elif mc.last_earnings_surprise > 0:
                s = +2.0  # Moderate positive
            elif mc.last_earnings_surprise < -5:
                s = -6.0  # Canonical weight for strong negative
            else:
                s = -2.0  # Moderate negative
            score += s
            parts.append(("earnings_surprise", s))

        # guidance (canonical: positive +3.0, negative -4.0)
        if mc.guidance_delta is not None:
            if mc.guidance_delta > 0:
                s = +3.0  # Canonical weight
            elif mc.guidance_delta < 0:
                s = -4.0  # Canonical weight
            else:
                s = 0.0
            score += s
            parts.append(("guidance", s))

        # dilution (canonical: -7.0 fixed)
        if mc.had_dilution:
            s = -7.0  # Canonical weight (fixed)
            score += s
            parts.append(("dilution", s))

        # buyback (canonical: +4.0 fixed)
        if mc.had_buyback:
            s = +4.0  # Canonical weight (fixed)
            score += s
            parts.append(("buyback", s))

        # management (canonical: positive +5.0, negative -5.0)
        if mc.management_event == "CEO_RESIGN":
            s = -5.0  # Canonical weight
            score += s
            parts.append(("management_ceo_resign", s))
        elif mc.management_event == "NEW_RESPECTED_CEO":
            s = +5.0  # Canonical weight
            parts.append(("management_new_ceo", s))
            score += s

        # legal/regulatory (canonical: high -8.0, medium -4.0)
        if mc.legal_risk_level == "HIGH":
            s = -8.0  # Canonical weight
            score += s
            parts.append(("legal_high", s))
        elif mc.legal_risk_level == "MEDIUM":
            s = -4.0  # Canonical weight
            score += s
            parts.append(("legal_medium", s))



        # M&A

        if mc.mna_role == "TARGET":

            s = +7.0

            score += s

            parts.append(("mna_target", s))

        elif mc.mna_role == "ACQUIRER_BAD_DEAL":

            s = -4.0

            score += s

            parts.append(("mna_acquirer_bad", s))



        score = max(-10.0, min(10.0, score))

        details = {"components": parts, "micro_company_score": score}

        return score, details





# ==============================

# 10. REGIME / CONFLICT COMPONENT (אופציונלי)

# ==============================



class RegimeConsistencyComponent(BaseScoringComponent):

    """

    מחלקת "קונפליקט" – בודקת אם יש סנכרון בין:

    - MACRO

    - SECTOR

    - TECHNICAL

    - NEWS

    וכו'.

    כאן נעשה משהו פשוט:

      אם מחלקות רבות סותרות אחת את השנייה → מורידים קצת ציון (פחות ודאות).

    """



    def __init__(self, weight: float = 0.05):

        super().__init__(name="REGIME_CONSISTENCY", weight=weight)



    def _compute_raw_score(

        self,

        symbol_state: SymbolState,

        universe_state: UniverseState

    ) -> Tuple[float, Dict[str, Any]]:

        # כאן אין לנו את ציוני המחלקות האחרות – זה בעצם צריך לעבוד אחרי שהמאסטר אסף הכל.

        # לכן, במחלקת המאסטר אפשר לקרוא לפונקציה הזו עם breakdown ולהוסיף ציון.

        # כרגע נחזיר 0 ונשאיר hook.

        return 0.0, {"reason": "computed_at_master_level"}





# ==============================

# 11. MASTER SCORING ENGINE

# ==============================



class MasterScoringEngine:

    """

    מאסטר סקורינג:

    - מחזיק את כל המחלקות (NEWS, TECHNICAL, MACRO, SECTOR, OPTIONS, MICRO_COMPANY, REGIME וכו')

    - מקבל UniverseState

    - מחזיר:

        • רשימת SymbolScoreResult

        • ממוינת מהחזקה לחלשה לפי ערך מוחלט |score|

    Refresh Rules:
    The Master Scoring system recalculates the total score for a symbol based on
    department-level refresh triggers. Each department has its own refresh conditions.
    
    Master Scoring recalculation is triggered when:
    - Any department triggers refresh
    - User manually requests symbol scoring update
    - Symbol enters the scanner list
    - Symbol transitions from WATCHLIST → ACTIVE_TRADING
    - Symbol transitions from ACTIVE_TRADING → HOLD / EXIT
    - Pre-market routine start
    - Post-market routine summary generation
    
    Dependency Rules:
    - Master Scoring ONLY recalculates values for departments that refreshed
    - If multiple departments refresh in the same cycle → batch update once
    - Master Scoring uses LAST-KNOWN values of departments not refreshed in the cycle
    - Always prefer MOST RECENT score for each department
    """

    # Refresh rules for Master Scoring - when each department triggers refresh
    REFRESH_RULES = {
        "TECHNICAL": {
            "refresh_on": [
                "Arrival of a new intraday candle (1m / 5m / 15m depending on strategy)",
                "Price or indicator cross events (RSI → levels, MACD cross, SMA alignment changes)",
                "VWAP deviation threshold crossed",
                "Volume surge relative to statistical baseline",
                "ATR expansion or contraction beyond defined thresholds",
                "New Price Action structure formed (HH/HL, LH/LL, Range breakout)",
                "New candlestick pattern detection (engulfing, hammer, etc.)",
                "Gap formation or gap fill event"
            ],
            "effect": "Recalculate Technical_Score immediately"
        },
        "NEWS": {
            "refresh_on": [
                "Any macro news event triggered",
                "Any sector macro news event triggered",
                "Any micro-global event triggered",
                "Any company-specific news detected",
                "Major sentiment swing based on real-time news feed"
            ],
            "effect": "Recalculate News_Score immediately"
        },
        "MACRO": {
            "refresh_on": [
                "Daily close of SPY / QQQ / DIA / IWM",
                "VIX daily update or >5% intraday spike",
                "Bond yields update (10Y, 5Y, 2Y curve shift)",
                "Currency index (DXY) crosses key levels",
                "Macro event risk entering forecast window (FED, CPI, PPI)",
                "Breadth indicators update at daily close"
            ],
            "effect": "Recalculate Macro_Score once per day, or on event"
        },
        "SECTOR": {
            "refresh_on": [
                "Daily close of relevant sector ETF (XLK, XLF, XLY, XLE, etc.)",
                "Sector-level news release",
                "Large sector rotation detected (ETF volume spike)",
                "Sector-relative strength changes vs SPY/QQQ",
                "Sector momentum indicator update (MACD/RSI daily)"
            ],
            "effect": "Recalculate Sector_Score once per day, or on event"
        },
        "OPTIONS_FLOW": {
            "refresh_on": [
                "New unusual options activity (UOA) detected",
                "Large sweeps/blocks crossing thresholds",
                "Shift in Put/Call imbalance",
                "Open Interest updated at daily OCC cycle",
                "IV spike or crush > threshold",
                "Dealer Gamma positioning change"
            ],
            "effect": "Recalculate Options_Flow_Score immediately"
        },
        "MICRO_COMPANY": {
            "refresh_on": [
                "New earnings report released",
                "Guidance changed (up or down)",
                "Dilution event detected (ATM, secondary, etc.)",
                "Buyback announcement",
                "Executive changes",
                "Legal/regulatory filing detected",
                "Operational update (product launch, failure, partnership)",
                "Analyst rating changes"
            ],
            "effect": "Recalculate Micro_Company_Score immediately"
        }
    }
    
    # Master recalculation triggers
    MASTER_RECALC_TRIGGERS = [
        "Any department triggers refresh",
        "User manually requests symbol scoring update",
        "Symbol enters the scanner list",
        "Symbol transitions from WATCHLIST → ACTIVE_TRADING",
        "Symbol transitions from ACTIVE_TRADING → HOLD / EXIT",
        "Pre-market routine start",
        "Post-market routine summary generation"
    ]
    
    # Dependency rules for Master Scoring
    DEPENDENCY_RULES = [
        "Master Scoring ONLY recalculates values for departments that refreshed",
        "If multiple departments refresh in the same cycle → batch update once",
        "Master Scoring uses LAST-KNOWN values of departments not refreshed in the cycle",
        "Always prefer MOST RECENT score for each department"
    ]
    
    # Master Score calculation formula (canonical)
    MASTER_SCORE_FORMULA = """
        Master_Score =
            (Technical_Score × 0.26) +
            (News_Score × 0.22) +
            (Macro_Score × 0.14) +
            (Sector_Score × 0.14) +
            (Options_Flow_Score × 0.12) +
            (Micro_Company_Score × 0.12)
        
        Output:
        - Master Score absolute value for ranking
        - Positive/Negative indicates long/short bias
    """



    def __init__(

        self,

        news_component: NewsScoringComponent,

        technical_component: TechnicalIndicatorsComponent,

        macro_component: MacroScoringComponent,

        sector_component: SectorScoringComponent,

        options_component: OptionsFlowScoringComponent,

        micro_company_component: MicroCompanyScoringComponent,

        # אפשר להוסיף עוד (Regime, Conflict וכו')

        extra_components: Optional[List[BaseScoringComponent]] = None,

    ):

        self.news = news_component

        self.technical = technical_component

        self.macro = macro_component

        self.sector = sector_component

        self.options = options_component

        self.micro = micro_company_component

        self.extra_components = extra_components or []



        # לשימוש פנימי

        self._all_components: List[BaseScoringComponent] = [

            self.news,

            self.technical,

            self.macro,

            self.sector,

            self.options,

            self.micro,

            *self.extra_components,

        ]



    def score_universe(self, universe: UniverseState) -> List[SymbolScoreResult]:

        """

        מחשב ציון לכל מניה, מחזיר רשימה ממוינת:

        - קודם לפי |total_score| מהגבוה לנמוך

        - שדה direction = "LONG" אם ציון חיובי, "SHORT" אם שלילי, "NEUTRAL" אם קרוב ל-0

        הנוסחה הקנונית (לפי MASTER_SCORING_SPECIFICATION.md):

        master_score = (
            (technical_score * 0.26) +
            (news_score * 0.22) +
            (macro_score * 0.14) +
            (sector_score * 0.14) +
            (options_flow_score * 0.12) +
            (micro_company_score * 0.12)
        )

        כל component כבר מחזיר weighted_score = raw_score * weight,
        אז הסכום נותן את ה-master_score בצורה נכונה.

        התוצאה אינה מוגבלת לטווח - הערך המוחלט מציין את רמת ה-conviction.
        """

        results: List[SymbolScoreResult] = []



        for symbol, state in universe.symbols.items():

            component_scores: List[ComponentScore] = []



            for component in self._all_components:

                cs = component.score_symbol(state, universe)

                component_scores.append(cs)



            # חישוב master_score לפי הנוסחה הקנונית
            # כל component.weighted_score כבר מכיל raw_score * weight
            total = sum(c.weighted_score for c in component_scores)



            # קביעת כיוון לפי הסימן של master_score (לפי המפרט הקנוני)
            if total > 0.5:

                direction = "LONG"

            elif total < -0.5:

                direction = "SHORT"

            else:

                direction = "NEUTRAL"



            result = SymbolScoreResult(

                symbol=symbol,

                total_score=total,

                direction=direction,

                components=component_scores,

                extra={},

            )

            results.append(result)



        # מיין לפי הערך המוחלט של הציון (החזק ← חלש)

        results.sort(key=lambda r: abs(r.total_score), reverse=True)

        return results





# ==============================

# 12. EXAMPLE: INITIALIZATION

# ==============================



# כאן אתה מייבא או מדביק את ה-RULEBOOKים שלך:

# from news_rulebook import NEWS_RULEBOOK

# from technical_rulebook import TECHNICAL_INDICATOR_RULEBOOK



def build_default_master_engine(

    NEWS_RULEBOOK: Dict[str, Any],

    TECHNICAL_INDICATOR_RULEBOOK: Dict[str, Any]

) -> MasterScoringEngine:

    """

    פונקציה נוחה לבנות את המאסטר עם המשקלים שסיכמנו.

    המשקלים כאן קבועים (קונפיגורציה):

    לפי המפרט הקנוני של Master Scoring System (MASTER_SCORING_SPECIFICATION.md):

    MASTER_WEIGHTS = {
        TECHNICAL:     0.26,
        NEWS:          0.22,
        MACRO:         0.14,
        SECTOR:        0.14,
        OPTIONS_FLOW:  0.12,
        MICRO_COMPANY: 0.12
    }

    Total = 1.00 (100%)

    הנוסחה הסופית:
    master_score = (
        (technical_score * 0.26) +
        (news_score * 0.22) +
        (macro_score * 0.14) +
        (sector_score * 0.14) +
        (options_flow_score * 0.12) +
        (micro_company_score * 0.12)
    )

    המשקלים האלה הם קנוניים ולא ניתן לשנות אותם ללא הוראה מפורשת.
    """



    # משקלים קנוניים לפי המפרט (MASTER_SCORING_SPECIFICATION.md):

    w_news = 0.22      # NEWS: 0.22

    w_technical = 0.26  # TECHNICAL: 0.26

    w_macro = 0.14     # MACRO: 0.14

    w_sector = 0.14    # SECTOR: 0.14

    w_options = 0.12   # OPTIONS_FLOW: 0.12

    w_micro = 0.12     # MICRO_COMPANY: 0.12

    # משקלים אלו הם קנוניים - אין לשנות ללא הוראה מפורשת



    news_comp = NewsScoringComponent(weight=w_news, rulebook=NEWS_RULEBOOK)

    technical_comp = TechnicalIndicatorsComponent(

        weight=w_technical,

        rulebook=TECHNICAL_INDICATOR_RULEBOOK

    )

    macro_comp = MacroScoringComponent(weight=w_macro)

    sector_comp = SectorScoringComponent(weight=w_sector)

    options_comp = OptionsFlowScoringComponent(weight=w_options)

    micro_comp = MicroCompanyScoringComponent(weight=w_micro)



    master = MasterScoringEngine(

        news_component=news_comp,

        technical_component=technical_comp,

        macro_component=macro_comp,

        sector_component=sector_comp,

        options_component=options_comp,

        micro_company_component=micro_comp,

        extra_components=[]

    )

    return master

