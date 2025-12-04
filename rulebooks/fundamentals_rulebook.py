# rulebooks/fundamentals_rulebook.py

"""

FUNDAMENTALS RULEBOOK



This rulebook defines scoring rules for fundamental analysis metrics:

- Valuation metrics (PE, PS, PB ratios)

- Growth metrics (EPS growth, Revenue growth)

- Profitability metrics (Profit margin, Operating margin, ROE)

- Leverage metrics (Debt-to-Equity, Interest coverage)

- Cash flow metrics (Free cash flow yield)

- Dividend metrics (Dividend yield)



Score range: [-10, +10]

Uses both MINOR and MAJOR timeframes (typically MAJOR for fundamentals).

Conditions use Python expressions evaluated with safe AST-based evaluator.

"""



from __future__ import annotations

from typing import Dict, Any



FUNDAMENTALS_RULEBOOK: Dict[str, Any] = {

    "meta": {

        "score_scale": {

            "min": -10,

            "max": 10

        },

        "signal_levels": {

            "STRONG_BULLISH": [6, 10],

            "MILD_BULLISH": [2, 5],

            "NEUTRAL": [-1, 1],

            "MILD_BEARISH": [-5, -2],

            "STRONG_BEARISH": [-10, -6]

        },

        "groups": {

            "VALUATION": {

                "base_weight": 1.1,

                "description": "Valuation metrics - PE, PS, PB ratios"

            },

            "GROWTH": {

                "base_weight": 1.0,

                "description": "Growth metrics - EPS growth, Revenue growth"

            },

            "PROFITABILITY": {

                "base_weight": 1.1,

                "description": "Profitability metrics - Margins, ROE"

            },

            "LEVERAGE": {

                "base_weight": 0.9,

                "description": "Leverage metrics - Debt-to-Equity, Interest coverage"

            },

            "CASH_FLOW": {

                "base_weight": 1.0,

                "description": "Cash flow metrics - FCF yield"

            },

            "DIVIDENDS": {

                "base_weight": 0.6,

                "description": "Dividend metrics - Dividend yield"

            }

        },
        
        # Canonical specification - Group weights:
        # VALUATION: 1.1 (19.3% of fundamentals_score)
        # GROWTH: 1.0 (17.5% of fundamentals_score)
        # PROFITABILITY: 1.1 (19.3% of fundamentals_score)
        # LEVERAGE: 0.9 (15.8% of fundamentals_score)
        # CASH_FLOW: 1.0 (17.5% of fundamentals_score)
        # DIVIDENDS: 0.6 (10.5% of fundamentals_score)
        # Total weight = 5.7
        #
        # Canonical formula:
        # fundamentals_score = (
        #     valuation_group_score * 1.1 +
        #     growth_group_score * 1.0 +
        #     profitability_group_score * 1.1 +
        #     leverage_group_score * 0.9 +
        #     cashflow_group_score * 1.0 +
        #     dividends_group_score * 0.6
        # ) / 5.7
        # fundamentals_score ∈ [-10, +10]
        #
        # Note: Fundamentals scoring provides internal weights for fundamental analysis.
        # It may be used as part of other scoring components or as a filter.
        # The fundamentals rulebook provides internal weights for valuation, growth, profitability metrics.
        
        # Refresh rules note:
        # The Fundamentals Scoring department must recompute its department score
        # ONLY when any of the financial events occurs (quarterly reports, filings, etc.).
        # Each metric has its own refresh_on conditions defined below.

        "description": "Fundamental analysis scoring rules for stock valuation and quality"

    },

    "metrics": {

        # =========================

        # VALUATION METRICS

        # =========================

        "PE_PB_VALUATION": {

            "group": "VALUATION",

            "weight": 1.0,

            "description": "Price-to-Earnings and Price-to-Book valuation ratios",
            
            # Refresh rules - when to recalculate PE/PB Valuation
            "refresh_on": [
                "Quarterly earnings release (updated EPS impacts P/E)",
                "Updated book value reported (10-Q, 10-K → impacts P/B)",
                "Major accounting adjustments affecting equity or net income",
                "Restatement of financial statements",
                "Significant market cap change caused by major corporate event"
            ],

            "timeframes": {

                "MINOR": {

                    "states": {}

                },

                "MAJOR": {

                    "states": {

                        "VERY_CHEAP": {

                            "condition": "pe_ratio is not None and pe_ratio < 12 and pb_ratio is not None and pb_ratio < 1.5",

                            "score_range": [7, 9],

                            "notes": "Very cheap valuation - PE < 12 and PB < 1.5"

                        },

                        "CHEAP": {

                            "condition": "pe_ratio is not None and 12 <= pe_ratio <= 18 and pb_ratio is not None and pb_ratio < 2.0",

                            "score_range": [4, 6],

                            "notes": "Cheap valuation - PE 12-18 and PB < 2.0"

                        },

                        "FAIR_VALUE": {

                            "condition": "pe_ratio is not None and 18 < pe_ratio <= 25 and pb_ratio is not None and 2.0 <= pb_ratio <= 3.0",

                            "score_range": [0, 2],

                            "notes": "Fair value - PE 18-25 and PB 2.0-3.0"

                        },

                        "EXPENSIVE": {

                            "condition": "pe_ratio is not None and 25 < pe_ratio <= 35 and pb_ratio is not None and pb_ratio > 3.0",

                            "score_range": [-4, -2],

                            "notes": "Expensive valuation - PE 25-35 or PB > 3.0"

                        },

                        "VERY_EXPENSIVE": {

                            "condition": "pe_ratio is not None and pe_ratio > 35",

                            "score_range": [-7, -9],

                            "notes": "Very expensive valuation - PE > 35"

                        },

                    }

                }

            }

        },

        "PS_VALUATION": {

            "group": "VALUATION",

            "weight": 0.8,

            "description": "Price-to-Sales valuation ratio",
            
            # Refresh rules - when to recalculate PS Valuation
            "refresh_on": [
                "Quarterly revenue update (Revenue affects P/S ratio)",
                "Annual filings (10-K) revising revenue metrics",
                "Major corporate event altering revenue outlook materially"
            ],

            "timeframes": {

                "MINOR": {

                    "states": {}

                },

                "MAJOR": {

                    "states": {

                        "CHEAP_PS": {

                            "condition": "ps_ratio is not None and ps_ratio < 2.0",

                            "score_range": [3, 5],

                            "notes": "Cheap PS ratio - PS < 2.0"

                        },

                        "FAIR_PS": {

                            "condition": "ps_ratio is not None and 2.0 <= ps_ratio <= 5.0",

                            "score_range": [0, 2],

                            "notes": "Fair PS ratio - PS 2.0-5.0"

                        },

                        "EXPENSIVE_PS": {

                            "condition": "ps_ratio is not None and ps_ratio > 5.0",

                            "score_range": [-3, -5],

                            "notes": "Expensive PS ratio - PS > 5.0"

                        },

                    }

                }

            }

        },

        # =========================

        # GROWTH METRICS

        # =========================

        "EPS_GROWTH": {

            "group": "GROWTH",

            "weight": 1.0,

            "description": "Earnings Per Share growth (5-year)",
            
            # Refresh rules - when to recalculate EPS Growth
            "refresh_on": [
                "Quarterly earnings release (EPS YoY/ QoQ changes)",
                "Guidance revisions impacting EPS trajectory",
                "Restatement of EPS from previous quarters"
            ],

            "timeframes": {

                "MINOR": {

                    "states": {}

                },

                "MAJOR": {

                    "states": {

                        "STRONG_GROWTH": {

                            "condition": "eps_growth_5y is not None and eps_growth_5y > 0.20",

                            "score_range": [6, 8],

                            "notes": "Strong EPS growth - > 20% annual growth"

                        },

                        "MODERATE_GROWTH": {

                            "condition": "eps_growth_5y is not None and 0.10 < eps_growth_5y <= 0.20",

                            "score_range": [3, 5],

                            "notes": "Moderate EPS growth - 10-20% annual growth"

                        },

                        "SLOW_GROWTH": {

                            "condition": "eps_growth_5y is not None and 0.0 < eps_growth_5y <= 0.10",

                            "score_range": [0, 2],

                            "notes": "Slow EPS growth - 0-10% annual growth"

                        },

                        "DECLINING": {

                            "condition": "eps_growth_5y is not None and eps_growth_5y < 0.0",

                            "score_range": [-4, -6],

                            "notes": "Declining EPS - negative growth"

                        },

                    }

                }

            }

        },

        "REVENUE_GROWTH": {

            "group": "GROWTH",

            "weight": 1.0,

            "description": "Revenue growth (Year-over-Year)",
            
            # Refresh rules - when to recalculate Revenue Growth
            "refresh_on": [
                "Quarterly revenue release",
                "Revenue guidance update (positive or negative)",
                "Restatement of revenue for prior periods"
            ],

            "timeframes": {

                "MINOR": {

                    "states": {}

                },

                "MAJOR": {

                    "states": {

                        "STRONG_REVENUE_GROWTH": {

                            "condition": "revenue_growth_yoy is not None and revenue_growth_yoy > 0.20",

                            "score_range": [5, 7],

                            "notes": "Strong revenue growth - > 20% YoY"

                        },

                        "MODERATE_REVENUE_GROWTH": {

                            "condition": "revenue_growth_yoy is not None and 0.05 < revenue_growth_yoy <= 0.20",

                            "score_range": [2, 4],

                            "notes": "Moderate revenue growth - 5-20% YoY"

                        },

                        "SLOW_REVENUE_GROWTH": {

                            "condition": "revenue_growth_yoy is not None and 0.0 < revenue_growth_yoy <= 0.05",

                            "score_range": [0, 1],

                            "notes": "Slow revenue growth - 0-5% YoY"

                        },

                        "REVENUE_DECLINE": {

                            "condition": "revenue_growth_yoy is not None and revenue_growth_yoy < 0.0",

                            "score_range": [-4, -6],

                            "notes": "Revenue decline - negative YoY growth"

                        },

                    }

                }

            }

        },

        # =========================

        # PROFITABILITY METRICS

        # =========================

        "PROFIT_MARGIN": {

            "group": "PROFITABILITY",

            "weight": 1.0,

            "description": "Profit margin percentage",
            
            # Refresh rules - when to recalculate Profit Margin
            "refresh_on": [
                "Quarterly earnings release (updated margins)",
                "New cost structure updates that impact margins materially",
                "Major restructuring event affecting profitability",
                "Annual filing updates (10-K)"
            ],

            "timeframes": {

                "MINOR": {

                    "states": {}

                },

                "MAJOR": {

                    "states": {

                        "HIGH_MARGIN": {

                            "condition": "profit_margin is not None and profit_margin > 0.20",

                            "score_range": [5, 7],

                            "notes": "High profit margin - > 20%"

                        },

                        "GOOD_MARGIN": {

                            "condition": "profit_margin is not None and 0.10 < profit_margin <= 0.20",

                            "score_range": [2, 4],

                            "notes": "Good profit margin - 10-20%"

                        },

                        "LOW_MARGIN": {

                            "condition": "profit_margin is not None and 0.0 < profit_margin <= 0.10",

                            "score_range": [-1, 1],

                            "notes": "Low profit margin - 0-10%"

                        },

                        "NEGATIVE_MARGIN": {

                            "condition": "profit_margin is not None and profit_margin < 0.0",

                            "score_range": [-5, -7],

                            "notes": "Negative profit margin - unprofitable"

                        },

                    }

                }

            }

        },

        "ROE": {

            "group": "PROFITABILITY",

            "weight": 1.1,

            "description": "Return on Equity percentage",
            
            # Refresh rules - when to recalculate ROE
            "refresh_on": [
                "Quarterly financial updates (Net Income / Equity)",
                "Changes to shareholder equity (buybacks, dilution)",
                "Annual update of ROE from audited financials"
            ],

            "timeframes": {

                "MINOR": {

                    "states": {}

                },

                "MAJOR": {

                    "states": {

                        "EXCELLENT_ROE": {

                            "condition": "roe is not None and roe > 0.20",

                            "score_range": [5, 7],

                            "notes": "Excellent ROE - > 20%"

                        },

                        "GOOD_ROE": {

                            "condition": "roe is not None and 0.15 < roe <= 0.20",

                            "score_range": [3, 5],

                            "notes": "Good ROE - 15-20%"

                        },

                        "AVERAGE_ROE": {

                            "condition": "roe is not None and 0.10 < roe <= 0.15",

                            "score_range": [0, 2],

                            "notes": "Average ROE - 10-15%"

                        },

                        "POOR_ROE": {

                            "condition": "roe is not None and roe <= 0.10",

                            "score_range": [-3, -5],

                            "notes": "Poor ROE - < 10%"

                        },

                    }

                }

            }

        },

        # =========================

        # LEVERAGE METRICS

        # =========================

        "DEBT_TO_EQUITY": {

            "group": "LEVERAGE",

            "weight": 1.0,

            "description": "Debt-to-Equity ratio",
            
            # Refresh rules - when to recalculate Debt to Equity
            "refresh_on": [
                "Quarterly balance sheet updates",
                "Debt issuance (bonds, loans, convertibles)",
                "Major debt repayment or restructuring",
                "Equity base changes (dilution/buybacks included)"
            ],

            "timeframes": {

                "MINOR": {

                    "states": {}

                },

                "MAJOR": {

                    "states": {

                        "LOW_LEVERAGE": {

                            "condition": "debt_to_equity is not None and debt_to_equity < 0.5",

                            "score_range": [2, 4],

                            "notes": "Low leverage - D/E < 0.5 (conservative capital structure)"

                        },

                        "MODERATE_LEVERAGE": {

                            "condition": "debt_to_equity is not None and 0.5 <= debt_to_equity <= 1.0",

                            "score_range": [0, 1],

                            "notes": "Moderate leverage - D/E 0.5-1.0 (reasonable)"

                        },

                        "HIGH_LEVERAGE": {

                            "condition": "debt_to_equity is not None and debt_to_equity > 1.0",

                            "score_range": [-3, -5],

                            "notes": "High leverage - D/E > 1.0 (risky capital structure)"

                        },

                    }

                }

            }

        },

        "INTEREST_COVERAGE": {

            "group": "LEVERAGE",

            "weight": 1.0,

            "description": "Interest coverage ratio",
            
            # Refresh rules - when to recalculate Interest Coverage
            "refresh_on": [
                "Quarterly earnings release (EBIT updated)",
                "Updated interest expense reported",
                "Debt refinancing affecting interest obligations"
            ],

            "timeframes": {

                "MINOR": {

                    "states": {}

                },

                "MAJOR": {

                    "states": {

                        "STRONG_COVERAGE": {

                            "condition": "interest_coverage is not None and interest_coverage > 5.0",

                            "score_range": [2, 4],

                            "notes": "Strong interest coverage - > 5x (safe debt servicing)"

                        },

                        "ADEQUATE_COVERAGE": {

                            "condition": "interest_coverage is not None and 2.0 < interest_coverage <= 5.0",

                            "score_range": [0, 1],

                            "notes": "Adequate interest coverage - 2-5x (acceptable)"

                        },

                        "WEAK_COVERAGE": {

                            "condition": "interest_coverage is not None and interest_coverage <= 2.0",

                            "score_range": [-4, -6],

                            "notes": "Weak interest coverage - < 2x (debt servicing risk)"

                        },

                    }

                }

            }

        },

        # =========================

        # CASH FLOW METRICS

        # =========================

        "FREE_CASH_FLOW_YIELD": {

            "group": "CASH_FLOW",

            "weight": 1.0,

            "description": "Free Cash Flow Yield percentage",
            
            # Refresh rules - when to recalculate Free Cash Flow Yield
            "refresh_on": [
                "Quarterly cash flow statements (operating cash flow changes)",
                "Capital expenditure updates",
                "Large one-time cash movements (asset sale/purchase)",
                "Annual audit updates"
            ],

            "timeframes": {

                "MINOR": {

                    "states": {}

                },

                "MAJOR": {

                    "states": {

                        "HIGH_FCF_YIELD": {

                            "condition": "free_cash_flow_yield is not None and free_cash_flow_yield > 0.05",

                            "score_range": [4, 6],

                            "notes": "High FCF yield - > 5% (strong cash generation)"

                        },

                        "GOOD_FCF_YIELD": {

                            "condition": "free_cash_flow_yield is not None and 0.02 < free_cash_flow_yield <= 0.05",

                            "score_range": [1, 3],

                            "notes": "Good FCF yield - 2-5% (decent cash generation)"

                        },

                        "LOW_FCF_YIELD": {

                            "condition": "free_cash_flow_yield is not None and 0.0 < free_cash_flow_yield <= 0.02",

                            "score_range": [-1, 1],

                            "notes": "Low FCF yield - 0-2% (weak cash generation)"

                        },

                        "NEGATIVE_FCF_YIELD": {

                            "condition": "free_cash_flow_yield is not None and free_cash_flow_yield < 0.0",

                            "score_range": [-4, -6],

                            "notes": "Negative FCF yield - cash burn"

                        },

                    }

                }

            }

        },

        # =========================

        # DIVIDEND METRICS

        # =========================

        "DIVIDEND_YIELD": {

            "group": "DIVIDENDS",

            "weight": 0.8,

            "description": "Dividend yield percentage",
            
            # Refresh rules - when to recalculate Dividend Yield
            "refresh_on": [
                "Dividend declaration or update",
                "Change in payout policy",
                "Ex-dividend date passing",
                "Significant share price changes affecting yield",
                "Annual dividend policy updates"
            ],

            "timeframes": {

                "MINOR": {

                    "states": {}

                },

                "MAJOR": {

                    "states": {

                        "ATTRACTIVE_YIELD": {

                            "condition": "dividend_yield is not None and dividend_yield > 0.04",

                            "score_range": [2, 4],

                            "notes": "Attractive dividend yield - > 4% (income-focused positive)"

                        },

                        "MODERATE_YIELD": {

                            "condition": "dividend_yield is not None and 0.02 < dividend_yield <= 0.04",

                            "score_range": [0, 2],

                            "notes": "Moderate dividend yield - 2-4% (acceptable)"

                        },

                        "LOW_YIELD": {

                            "condition": "dividend_yield is not None and 0.0 < dividend_yield <= 0.02",

                            "score_range": [-1, 0],

                            "notes": "Low dividend yield - 0-2% (minimal income)"

                        },

                        "NO_DIVIDEND": {

                            "condition": "dividend_yield is None or dividend_yield == 0.0",

                            "score_range": [0, 0],

                            "notes": "No dividend - neutral for growth stocks, negative for income stocks"

                        },

                    }

                }

            }

        },

    }

}

