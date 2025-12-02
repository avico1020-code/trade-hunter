# scoring/master_scoring.py

"""

MASTER SCORING ENGINE



This module is the top-level aggregator that combines scores from all scoring modules

into a single final score per symbol in the range [-10, +10].



It does NOT:

- Talk to IBKR

- Send orders

- Fetch data

- Calculate individual module scores



It only receives already-computed scores from the scoring engines and aggregates them.

"""



from __future__ import annotations

from dataclasses import dataclass

from typing import Dict, Any, List, Tuple, Optional



# ============================================

# MASTER SCORING RESULT

# ============================================



@dataclass

class MasterScoreResult:

    """

    Result of master scoring for a single symbol.

    """

    symbol: str

    module_scores: Dict[str, float]

    final_master_score: float

    direction: str  # "LONG" | "SHORT" | "NEUTRAL"

    abs_strength: float

    used_modules: List[str]



# ============================================

# MASTER SCORING ENGINE

# ============================================



class MasterScoringEngine:

    """

    Master Scoring System



    מחלקה שמקבלת את כל הציונים מכל המחלקות (מאקרו, סקטור, חדשות,

    אינדיקטורים טכניים, אופציות, price action, strategy-context, סיכון/פוזיציות)

    ומחזירה:



    - ציון סופי לכל מניה בטווח [-10, +10]

    - כיוון טרייד מוצע: LONG / SHORT / NEUTRAL

    - חוזק מוחלט (abs score) לצורך דירוג



    חשוב:

    - לא מתחברת ל-IBKR

    - לא שולחת פקודות

    - לא מחשבת RSI וכו' — רק מקבלת את התוצאות מה-engines האחרים

    """

    

    DEFAULT_CONFIG: Dict[str, Any] = {

        "use_macro": True,

        "use_sector": True,

        "use_news": True,

        "use_technical": True,

        "use_options": True,

        "use_pattern": True,

        "use_strategy_context": True,

        "use_position_risk": True,

        # סף מינימלי כדי לקבוע כיוון (פחות מזה = נייטרלי)

        "direction_threshold": 2.0,

    }

    

    def __init__(self, config: Optional[Dict[str, Any]] = None):

        """

        Initialize the master scoring engine.

        

        Args:

            config: Optional configuration dictionary with module switches and thresholds

        """

        self.config = dict(self.DEFAULT_CONFIG)

        if config:

            self.config.update(config)

        

        # מיפוי בין שם מודול לשם המפתח של הציון שהוא מחזיר

        # כאן אנחנו מניחים שה-engines כתבו כבר את המפתחות האלו.

        self.module_score_keys: Dict[str, str] = {

            "macro": "final_macro_score",

            "sector": "final_sector_macro_score",

            "news": "final_news_score",

            "technical": "final_technical_score",

            "options": "final_options_score",

            "pattern": "final_pattern_price_score",

            "strategy_context": "final_strategy_context_score",

            "position_risk": "final_position_risk_score",

        }

        

        # רשימת השמות לפי סדר לוגי

        self.module_order: List[str] = [

            "macro",

            "sector",

            "news",

            "technical",

            "options",

            "pattern",

            "strategy_context",

            "position_risk",

        ]

    

    # ------------------------------------------------------------------

    # ציונים למניה אחת

    # ------------------------------------------------------------------

    

    def score_symbol(

        self,

        symbol: str,

        module_results: Dict[str, Dict[str, Any]],

    ) -> MasterScoreResult:

        """

        מקבל ניקודים מכל המודולים למניה אחת ומחזיר ניקוד סופי משולב.

        

        Args:

            symbol: Symbol name (e.g., "AAPL")

            module_results: Dictionary with module results, for example:

                {

                    "macro": {...},              # output from MacroScoringEngine.score(...)

                    "sector": {...},

                    "news": {...},

                    "technical": {...},

                    "options": {...},

                    "pattern": {...},

                    "strategy_context": {...},

                    "position_risk": {...}

                }

        

        Returns:

            MasterScoreResult with:

                - module_scores: { "macro": x, "news": y, ... }

                - final_master_score: float [-10,10]

                - direction: "LONG"/"SHORT"/"NEUTRAL"

                - abs_strength: abs(final_master_score)

                - used_modules: list of active modules that השתתפו בחישוב

        """

        module_scores: Dict[str, float] = {}

        used_modules: List[str] = []

        

        total = 0.0

        count = 0

        

        for module_name in self.module_order:

            if not self._is_module_enabled(module_name):

                continue

            

            result_dict = module_results.get(module_name)

            if not result_dict:

                continue

            

            score_key = self.module_score_keys.get(module_name)

            if not score_key:

                continue

            

            raw_score = result_dict.get(score_key)

            if raw_score is None:

                continue

            

            # ביטחון כפול – לוודא שנשארים בטווח [-10, 10]

            clamped = self._clamp(raw_score, -10.0, 10.0)

            

            module_scores[module_name] = clamped

            used_modules.append(module_name)

            

            total += clamped

            count += 1

        

        if count == 0:

            final_score = 0.0

        else:

            # כאן אין משקל נוסף בין המודולים — הם כבר שקללו משקל פנימי.

            final_score = total / count

        

        final_score = self._clamp(final_score, -10.0, 10.0)

        abs_strength = abs(final_score)

        direction = self._direction_from_score(final_score)

        

        return MasterScoreResult(

            symbol=symbol,

            module_scores=module_scores,

            final_master_score=final_score,

            direction=direction,

            abs_strength=abs_strength,

            used_modules=used_modules,

        )

    

    # ------------------------------------------------------------------

    # דירוג רשימת מניות

    # ------------------------------------------------------------------

    

    def rank_symbols(

        self,

        symbol_results: Dict[str, MasterScoreResult],

        min_abs_score: float = 0.0,

    ) -> List[Tuple[str, MasterScoreResult]]:

        """

        מדרג מניות לפי absolute strength (מהחזקה לחלשה).

        

        Args:

            symbol_results: Dictionary with symbol -> MasterScoreResult, for example:

                {

                    "AAPL": MasterScoreResult(...),

                    "MSFT": MasterScoreResult(...),

                    ...

                }

            min_abs_score: Minimum absolute strength threshold (default: 0.0)

        

        Returns:

            List of (symbol, MasterScoreResult) tuples, sorted descending by abs_strength

            מסנן מניות עם abs_strength < min_abs_score.

        """

        filtered: List[Tuple[str, MasterScoreResult]] = []

        

        for symbol, result in symbol_results.items():

            if result.abs_strength >= min_abs_score:

                filtered.append((symbol, result))

        

        # מיון בחוזק מוחלט מהגבוה לנמוך

        filtered.sort(key=lambda x: x[1].abs_strength, reverse=True)

        return filtered

    

    # ------------------------------------------------------------------

    # עזר: כיוון מטרייד על פי ציון

    # ------------------------------------------------------------------

    

    def _direction_from_score(self, score: float) -> str:

        """

        קובע כיוון טרייד על פי הציון הסופי.

        

        Args:

            score: Final master score

        

        Returns:

            "LONG" | "SHORT" | "NEUTRAL"

        """

        threshold = float(self.config.get("direction_threshold", 2.0))

        

        if score >= threshold:

            return "LONG"

        elif score <= -threshold:

            return "SHORT"

        else:

            return "NEUTRAL"

    

    # ------------------------------------------------------------------

    # עזר: בדיקת מודול פעיל

    # ------------------------------------------------------------------

    

    def _is_module_enabled(self, module_name: str) -> bool:

        """

        בודק אם מודול מסוים פעיל לפי ה-config.

        

        Args:

            module_name: Name of the module (e.g., "macro", "news")

        

        Returns:

            True if module is enabled, False otherwise

        """

        mapping = {

            "macro": "use_macro",

            "sector": "use_sector",

            "news": "use_news",

            "technical": "use_technical",

            "options": "use_options",

            "pattern": "use_pattern",

            "strategy_context": "use_strategy_context",

            "position_risk": "use_position_risk",

        }

        key = mapping.get(module_name)

        if key is None:

            return False

        return bool(self.config.get(key, True))

    

    # ------------------------------------------------------------------

    # עזר: clamp

    # ------------------------------------------------------------------

    

    @staticmethod

    def _clamp(value: float, low: float, high: float) -> float:

        """

        דוחס ערך לטווח [low, high].

        

        Args:

            value: Value to clamp

            low: Minimum value

            high: Maximum value

        

        Returns:

            Clamped value

        """

        return max(low, min(high, value))



# ============================================

# CONVENIENCE FUNCTIONS

# ============================================



def score_symbol_master(

    symbol: str,

    module_results: Dict[str, Dict[str, Any]],

    config: Optional[Dict[str, Any]] = None

) -> MasterScoreResult:

    """

    Convenience function to score a single symbol using master scoring.

    

    Args:

        symbol: Symbol name (e.g., "AAPL")

        module_results: Dictionary with module results

        config: Optional configuration dictionary

    

    Returns:

        MasterScoreResult

    

    Example:

        module_results = {

            "macro": {"final_macro_score": 4.5},

            "news": {"final_news_score": 2.1},

            "technical": {"final_technical_score": 5.0},

            "options": {"final_options_score": 1.5},

            "position_risk": {"final_position_risk_score": -1.0},

        }

        result = score_symbol_master("AAPL", module_results)

        print(result.final_master_score)

        print(result.direction)

    """

    engine = MasterScoringEngine(config=config)

    return engine.score_symbol(symbol, module_results)



# Export for use by other modules

__all__ = [

    "MasterScoringEngine",

    "MasterScoreResult",

    "score_symbol_master",

]
