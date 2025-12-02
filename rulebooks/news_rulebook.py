# rulebooks/news_rulebook.py

"""

NEWS RULEBOOK - Master Aggregated Rulebook



This file imports and combines all four news rulebook modules into a single unified NEWS_RULEBOOK.

It does NOT create new logic - it only merges the existing rulebooks.



The unified NEWS_RULEBOOK contains:

- MARKET_MACRO: Market Macro news types (FED_RATE_DECISION, INFLATION_REPORT, etc.)

- SECTOR_MACRO: Sector-specific macro rules (XLK, XLE, XLF, etc.)

- MICRO_GLOBAL: Micro Global news types (ANALYST_RATING_CHANGE, INDEX_INCLUSION_REMOVAL, etc.)

- MICRO_COMPANY: Micro company-specific news types (EARNINGS, GUIDANCE_ONLY, DILUTION, etc.)



This unified rulebook is used by the Master Scoring System's NewsScoringComponent.

The structure allows:

- Structured access: NEWS_RULEBOOK["MARKET_MACRO"]

- Flat lookup for NewsScoringComponent: NEWS_RULEBOOK["_flat_map"].get(news_type)

"""



from __future__ import annotations

from typing import Dict, Any, Literal



# ============================================

# IMPORTS - Pulling each sub-rulebook

# ============================================



from rulebooks.macro_rulebook import MARKET_MACRO_RULEBOOK

from rulebooks.sector_macro_rulebook import SECTOR_MACRO_RULEBOOK

from rulebooks.news_micro_global_rulebook import NEWS_MICRO_GLOBAL_RULEBOOK

from rulebooks.news_micro_rulebook import NEWS_MICRO_RULEBOOK



# ============================================

# MAIN AGGREGATED RULEBOOK

# ============================================



# Build flat lookup map first (contains all news types as direct keys)

_flat_map: Dict[str, Any] = {}

_flat_map.update(MARKET_MACRO_RULEBOOK.get("news_types", {}))  # FED_RATE_DECISION, INFLATION_REPORT, etc.

_flat_map.update(SECTOR_MACRO_RULEBOOK.get("sectors", {}))      # XLK, XLE, XLF, etc.

_flat_map.update(NEWS_MICRO_GLOBAL_RULEBOOK.get("news_types", {}))  # ANALYST_RATING_CHANGE, etc.

_flat_map.update(NEWS_MICRO_RULEBOOK.get("types", {}))          # EARNINGS, GUIDANCE_ONLY, etc.



# Main aggregated rulebook with structured categories

NEWS_RULEBOOK: Dict[str, Any] = {

    "meta": {
        "master_scoring_weight": 0.22,  # Weight in Master Scoring System (w_news from scoring_system.py)
        "description": "Unified News Rulebook combining Market Macro, Sector Macro, Micro Global, and Micro Company news types",
        
        # Canonical specification - Category Base Weights:
        # MARKET_MACRO: 1.2 (newses that affect entire market = highest impact)
        # SECTOR_MACRO: 1.0 (newses that affect entire sector)
        # MICRO_GLOBAL: 0.8 (industry/global level newses)
        # MICRO_COMPANY: 1.1 (company-specific newses - very high)
        # 
        # Scoring formula:
        # news_item_score = base_score * direction_multiplier (+1 for LONG, -1 for SHORT) 
        #                   * impact_level (Low=0.5, Medium=1.0, High=1.5) 
        #                   * category_base_weight
        # news_score = clamp(sum(all_news_scores), -10, +10)
        # Final contribution to Master Score = news_score * 0.22
        
        "category_base_weights": {
            "MARKET_MACRO": 1.2,
            "SECTOR_MACRO": 1.0,
            "MICRO_GLOBAL": 0.8,
            "MICRO_COMPANY": 1.1
        },
        
        # Refresh rules note:
        # The News Scoring department must recompute its department score
        # whenever ANY news event triggers a refresh for its category.
        # Each category has its own refresh_on conditions defined below.
        
        "refresh_rules": {
            "MARKET_MACRO": {
                "refresh_on": [
                    "Release of macroeconomic reports (CPI, PPI, NFP, GDP)",
                    "FED rate decision (FOMC), minutes release, Chairman speech",
                    "Major geopolitical escalation or de-escalation",
                    "Systemic market shock (bank failure, commodity shock, crisis event)",
                    "Volatility spike caused by macro event (VIX surge)",
                    "Unexpected macro catalyst affecting all indices"
                ]
            },
            "SECTOR_MACRO": {
                "refresh_on": [
                    "Sector-wide rating upgrade/downgrade (analysts, ratings agencies)",
                    "Industry-specific regulation changes (tech, energy, banks, healthcare, etc.)",
                    "Commodities news impacting sector fundamentals (oil, gas, metals)",
                    "Sector earnings season trends",
                    "Major industry report released",
                    "Fund flow documented shift into/out of the sector"
                ]
            },
            "MICRO_GLOBAL": {
                "refresh_on": [
                    "Industry-level M&A news (mergers/acquisitions between competitors)",
                    "Supply-chain disruption or improvement for the entire industry",
                    "Price changes in key industry resources (inputs, materials)",
                    "Regulatory changes impacting a specific industry group",
                    "Industry-wide legal or economic developments",
                    "Major technological breakthrough affecting multiple companies"
                ]
            },
            "MICRO_COMPANY": {
                "refresh_on": [
                    # Earnings / Financials
                    "Earnings report release (beat/miss)",
                    "Guidance update or preannouncement",
                    "Revenue warning or profit warning",
                    "Unexpected financial filing or 8-K event",
                    # Corporate actions
                    "Dilution event detected (ATM, secondary offering, convertible notes)",
                    "Buyback announcement or expansion",
                    "Insider transactions beyond threshold (buy/sell activity)",
                    "M&A directly involving the company",
                    # Management
                    "CEO/CFO replacement",
                    "Executive resignation or unexpected departure",
                    "Board restructuring announcement",
                    # Legal / Compliance
                    "New lawsuit filed against the company",
                    "SEC investigation or regulatory action",
                    "Major compliance violation or audit issue",
                    # Operational news
                    "Product launch success/failure",
                    "Partnership announcement",
                    "Supply chain issue for the company specifically",
                    "Short report release (Hindenburg-style event)",
                    # Sentiment / Analyst
                    "Analyst upgrade/downgrade",
                    "Price target change beyond threshold"
                ]
            }
        }
    },
    
    "MARKET_MACRO": MARKET_MACRO_RULEBOOK,      # Fed, CPI, NFP, GDP, etc.

    "SECTOR_MACRO": SECTOR_MACRO_RULEBOOK,      # Sector-specific macro (XLK, XLE, ...)

    "MICRO_GLOBAL": NEWS_MICRO_GLOBAL_RULEBOOK,  # Analyst ratings, insider activity, index inclusion

    "MICRO_COMPANY": NEWS_MICRO_RULEBOOK,        # Earnings, dilution, guidance, M&A, legal, cyber

    "_flat_map": _flat_map,  # Flat lookup map for NewsScoringComponent compatibility

}



# Also add flat_map entries directly to NEWS_RULEBOOK for direct access

# This allows NewsScoringComponent to use: rulebook.get(news_type)

NEWS_RULEBOOK.update(_flat_map)



# ============================================

# HELPER FUNCTION

# ============================================



def get_news_type_rule(news_type: str) -> Dict[str, Any] | None:

    """

    Helper function to get a news type rule from any category.

    

    Usage:

        rule = get_news_type_rule("FED_RATE_DECISION")

        rule = get_news_type_rule("EARNINGS")

        rule = get_news_type_rule("XLK")

    """

    return _flat_map.get(news_type)



# ============================================

# TYPE DEFINITIONS (optional, but recommended)

# ============================================



NewsScope = Literal["MARKET_MACRO", "SECTOR_MACRO", "MICRO_GLOBAL", "MICRO_COMPANY"]



# Export for use by Master Scoring System

__all__ = ["NEWS_RULEBOOK", "NewsScope", "get_news_type_rule"]
