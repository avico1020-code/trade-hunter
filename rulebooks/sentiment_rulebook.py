# rulebooks/sentiment_rulebook.py

"""

SENTIMENT_RULEBOOK



This rulebook defines how to interpret sentiment-related inputs and convert them

into a unified score in the range [-10, +10], for both MINOR (intraday) and

MAJOR (daily / multi-day) timeframes.



Expected fields in sentiment_snapshot (numeric, typically normalized to [-1, 1]):



    news_sentiment:       float  # -1 (very negative) to +1 (very positive)

    social_sentiment:     float  # aggregated social media sentiment

    twitter_sentiment:    float

    reddit_sentiment:     float

    market_sentiment:     float  # global market / index sentiment

    stock_sentiment:      float  # overall per-stock sentiment

    volume_of_mentions:   float  # activity vs normal (e.g. ratio or z-score)

    is_trending:          bool   # whether symbol is "hot" / trending



This rulebook ONLY defines interpretation & scoring logic.

The SentimentScoringEngine is responsible for:

- evaluating conditions (via safe eval),

- aggregating scores,

- returning final_sentiment_score.

"""



from __future__ import annotations

from typing import Dict, Any



SENTIMENT_RULEBOOK: Dict[str, Any] = {

    "meta": {

        "score_scale": {

            "min": -10,

            "max": 10,

        },

        "signal_levels": {

            "STRONG_BULLISH": [6, 10],

            "MILD_BULLISH": [2, 5],

            "NEUTRAL": [-1, 1],

            "MILD_BEARISH": [-5, -2],

            "STRONG_BEARISH": [-10, -6],

        },

        # Canonical specification - Group weights:
        # SENTIMENT_INTRADAY: 1.0 (50% of sentiment_score)
        # SENTIMENT_DAILY: 1.0 (50% of sentiment_score)
        # Total weight = 2.0
        #
        # SENTIMENT_INTRADAY indicators:
        # - TICK_INDEX: weight 1.0 (35.7% of intraday group = 17.85% of sentiment)
        # - VOLUME_IMBALANCE: weight 1.0 (35.7% of intraday group = 17.85% of sentiment)
        # - OPTION_FLOW_INTRADAY: weight 0.8 (28.6% of intraday group = 14.3% of sentiment)
        #
        # SENTIMENT_DAILY indicators:
        # - VIX_SLOPE: weight 1.0 (50% of daily group = 25% of sentiment)
        # - NEWS_SENTIMENT: weight 1.0 (50% of daily group = 25% of sentiment)
        #
        # Canonical formula:
        # sentiment_score = (intraday_group_score * 1.0 + daily_group_score * 1.0) / 2.0
        # sentiment_score ∈ [-10, +10]
        #
        # Note: Sentiment scoring is typically used internally or as part of other scoring components.
        # It does not appear as a separate component in Master Scoring System.
        
        "groups": {

            "SENTIMENT_INTRADAY": {

                "base_weight": 1.0

            },

            "SENTIMENT_DAILY": {

                "base_weight": 1.0

            }

        },
        
        # Note: Sentiment scoring is typically used internally or as part of other scoring components
        # It does not appear as a separate component in Master Scoring System
        # The sentiment rulebook provides internal weights for sentiment analysis

    },



    "timeframes": {



        # =====================================================

        # MINOR: Intraday sentiment (fast, reactive, noisy)

        # =====================================================

        "MINOR": {

            "states": {



                # =========================

                # STRONG BULLISH – intraday

                # =========================

                "INTRADAY_EXTREME_BULLISH": {

                    # Strong positive stock & news sentiment, active, trending.

                    "condition": (

                        "stock_sentiment is not None and news_sentiment is not None and "

                        "stock_sentiment >= 0.7 and "

                        "news_sentiment >= 0.4 and "

                        "volume_of_mentions is not None and volume_of_mentions >= 2.0 and "

                        "is_trending is True"

                    ),

                    "raw_signal": "STRONG_BULLISH",

                    "score_range": [7, 9],

                    "notes": (

                        "Very strong intraday bullish mood around this stock. "

                        "High conviction that buyers dominate the short-term tape."

                    ),

                },



                "INTRADAY_BULLISH_STRONG_SOCIAL": {

                    # Social + Twitter/Reddit pushing hard to the upside.

                    "condition": (

                        "social_sentiment is not None and twitter_sentiment is not None and reddit_sentiment is not None and "

                        "social_sentiment >= 0.6 and "

                        "twitter_sentiment >= 0.6 and "

                        "reddit_sentiment >= 0.5 and "

                        "volume_of_mentions is not None and volume_of_mentions >= 1.5"

                    ),

                    "raw_signal": "STRONG_BULLISH",

                    "score_range": [6, 8],

                    "notes": (

                        "Strong social media hype, high activity, crowd is clearly bullish."

                    ),

                },



                "INTRADAY_MILD_BULLISH": {

                    "condition": (

                        "stock_sentiment is not None and "

                        "0.3 <= stock_sentiment < 0.7 and "

                        "volume_of_mentions is not None and volume_of_mentions >= 1.0"

                    ),

                    "raw_signal": "MILD_BULLISH",

                    "score_range": [2, 4],

                    "notes": (

                        "Moderately positive intraday sentiment, but not extreme. "

                        "Good confirmation for long setups."

                    ),

                },



                # =========================

                # NEUTRAL / LOW CONFIDENCE

                # =========================

                "INTRADAY_NEUTRAL_LOW_ACTIVITY": {

                    "condition": (

                        "stock_sentiment is not None and "

                        "-0.2 <= stock_sentiment <= 0.2 and "

                        "volume_of_mentions is not None and volume_of_mentions < 0.8"

                    ),

                    "raw_signal": "NEUTRAL",

                    "score_range": [-1, 1],

                    "notes": (

                        "Sentiment flat and low participation. "

                        "Signals from sentiment have low edge."

                    ),

                },



                "INTRADAY_CONFLICTING_SENTIMENT": {

                    # Example: news positive, social negative, or inverse.

                    "condition": (

                        "news_sentiment is not None and social_sentiment is not None and "

                        "news_sentiment * social_sentiment < -0.2"

                    ),

                    "raw_signal": "NEUTRAL",

                    "score_range": [-2, 2],

                    "notes": (

                        "Conflicting messages between news and social sentiment. "

                        "High noise; sentiment should be down-weighted for decision-making."

                    ),

                },



                # =========================

                # MILD / STRONG BEARISH

                # =========================

                "INTRADAY_EXTREME_BEARISH": {

                    "condition": (

                        "stock_sentiment is not None and news_sentiment is not None and "

                        "stock_sentiment <= -0.7 and "

                        "news_sentiment <= -0.4 and "

                        "volume_of_mentions is not None and volume_of_mentions >= 2.0 and "

                        "is_trending is True"

                    ),

                    "raw_signal": "STRONG_BEARISH",

                    "score_range": [-9, -7],

                    "notes": (

                        "Very strong intraday bearish mood; negative news plus heavy attention. "

                        "High conviction for short bias."

                    ),

                },



                "INTRADAY_BEARISH_STRONG_SOCIAL": {

                    "condition": (

                        "social_sentiment is not None and twitter_sentiment is not None and reddit_sentiment is not None and "

                        "social_sentiment <= -0.6 and "

                        "twitter_sentiment <= -0.6 and "

                        "reddit_sentiment <= -0.5 and "

                        "volume_of_mentions is not None and volume_of_mentions >= 1.5"

                    ),

                    "raw_signal": "STRONG_BEARISH",

                    "score_range": [-8, -6],

                    "notes": (

                        "Crowd is heavily negative across social platforms with high activity."

                    ),

                },



                "INTRADAY_MILD_BEARISH": {

                    "condition": (

                        "stock_sentiment is not None and "

                        "-0.7 < stock_sentiment <= -0.3 and "

                        "volume_of_mentions is not None and volume_of_mentions >= 1.0"

                    ),

                    "raw_signal": "MILD_BEARISH",

                    "score_range": [-4, -2],

                    "notes": (

                        "Moderately negative intraday sentiment, pressuring the stock to downside."

                    ),

                },



                # =========================

                # LOW_CONFIDENCE / NOISE

                # =========================

                "INTRADAY_LOW_CONFIDENCE_NOISE": {

                    "condition": (

                        "stock_sentiment is not None and "

                        "-0.2 <= stock_sentiment <= 0.2 and "

                        "volume_of_mentions is not None and volume_of_mentions >= 1.2 and "

                        "is_trending is False"

                    ),

                    "raw_signal": "NEUTRAL",

                    "score_range": [-2, 2],

                    "notes": (

                        "There is some chatter but without a clear bias; "

                        "sentiment is noisy and non-directional."

                    ),

                },

            }

        },



        # =====================================================

        # MAJOR: Daily / multi-day sentiment bias

        # =====================================================

        "MAJOR": {

            "states": {



                # =========================

                # STRONG BULLISH – multi-day

                # =========================

                "DAILY_PERSISTENT_BULLISH": {

                    "condition": (

                        "market_sentiment is not None and stock_sentiment is not None and "

                        "market_sentiment >= 0.5 and "

                        "stock_sentiment >= 0.5"

                    ),

                    "raw_signal": "STRONG_BULLISH",

                    "score_range": [6, 9],

                    "notes": (

                        "Both the overall market and this stock show persistently positive sentiment. "

                        "Supports swing-long bias."

                    ),

                },



                "DAILY_STOCK_OUTPERFORMER_SENTIMENT": {

                    "condition": (

                        "market_sentiment is not None and stock_sentiment is not None and "

                        "market_sentiment >= -0.1 and "

                        "stock_sentiment >= 0.6 and "

                        "stock_sentiment - market_sentiment >= 0.3"

                    ),

                    "raw_signal": "MILD_BULLISH",

                    "score_range": [3, 5],

                    "notes": (

                        "Stock sentiment clearly stronger than market sentiment; "

                        "name is a relative-strength favorite in sentiment space."

                    ),

                },



                # =========================

                # NEUTRAL / SIDEWAYS

                # =========================

                "DAILY_SENTIMENT_NEUTRAL": {

                    "condition": (

                        "market_sentiment is not None and stock_sentiment is not None and "

                        "-0.25 <= stock_sentiment <= 0.25 and "

                        "-0.25 <= market_sentiment <= 0.25"

                    ),

                    "raw_signal": "NEUTRAL",

                    "score_range": [-1, 1],

                    "notes": (

                        "No clear bullish or bearish bias on a daily level. "

                        "Sentiment does not provide a strong directional edge."

                    ),

                },



                # =========================

                # MILD / STRONG BEARISH – multi-day

                # =========================

                "DAILY_PERSISTENT_BEARISH": {

                    "condition": (

                        "market_sentiment is not None and stock_sentiment is not None and "

                        "market_sentiment <= -0.5 and "

                        "stock_sentiment <= -0.5"

                    ),

                    "raw_signal": "STRONG_BEARISH",

                    "score_range": [-9, -6],

                    "notes": (

                        "Sustained negative sentiment both at market and stock level. "

                        "Supports swing-short bias or avoiding long exposure."

                    ),

                },



                "DAILY_STOCK_UNDERPERFORMER_SENTIMENT": {

                    "condition": (

                        "market_sentiment is not None and stock_sentiment is not None and "

                        "market_sentiment >= -0.1 and "

                        "stock_sentiment <= -0.6 and "

                        "market_sentiment - stock_sentiment >= 0.3"

                    ),

                    "raw_signal": "MILD_BEARISH",

                    "score_range": [-5, -3],

                    "notes": (

                        "Market not very negative, but this stock is heavily disliked. "

                        "Name is a sentiment laggard and potential short candidate."

                    ),

                },



                # =========================

                # RISK-ON / RISK-OFF MODES

                # =========================

                "DAILY_RISK_ON_ENVIRONMENT": {

                    "condition": (

                        "market_sentiment is not None and "

                        "market_sentiment >= 0.4"

                    ),

                    "raw_signal": "MILD_BULLISH",

                    "score_range": [2, 4],

                    "notes": (

                        "Broader environment is risk-on; easier conditions for long setups overall."

                    ),

                },



                "DAILY_RISK_OFF_ENVIRONMENT": {

                    "condition": (

                        "market_sentiment is not None and "

                        "market_sentiment <= -0.4"

                    ),

                    "raw_signal": "MILD_BEARISH",

                    "score_range": [-4, -2],

                    "notes": (

                        "Broader environment is risk-off; "

                        "sentiment regime favors defensive posture and shorts."

                    ),

                },

            }

        }

    }

}
