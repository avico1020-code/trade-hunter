# MASTER SCORING SYSTEM — Full Canonical Specification

# Based on the complete scoring architecture and the detailed department specifications

# =====================================================
# 🧠 PURPOSE OF THE MASTER SCORING SYSTEM
# =====================================================

The Master Scoring System combines all scoring departments into a single
normalized score that ranks stocks from strongest to weakest.

This score determines:

- Long candidates (positive direction)

- Short candidates (negative direction)

- Priority level in the trade queue

- Entry filtering and routing decisions

The final score range is unbounded numerically,
but the sign determines the direction:

- Positive Master Score = Long Bias

- Negative Master Score = Short Bias

Magnitude = conviction level.

# =====================================================
# 🏛️ DEPARTMENTS INCLUDED IN MASTER SCORING
# =====================================================

Only the following departments contribute directly to Master Scoring:

1. Technical Indicators     (26%)

2. News Scoring             (22%)

3. Macro Scoring            (14%)

4. Sector Scoring           (14%)

5. Options Flow             (12%)

6. Micro Company Scoring    (12%)

These weights are canonical and cannot be changed unless explicitly instructed.

# =====================================================
# 📍 DEPARTMENT MASTER WEIGHTS
# =====================================================

MASTER_WEIGHTS = {

    TECHNICAL:     0.26,

    NEWS:          0.22,

    MACRO:         0.14,

    SECTOR:        0.14,

    OPTIONS_FLOW:  0.12,

    MICRO_COMPANY: 0.12

}

Total = 1.00 (100%)

# =====================================================
# 📍 DEPARTMENT INPUT REQUIREMENTS
# =====================================================

Each scoring department must return a normalized score in the range:

    [-10, +10]

Departments that inherently produce raw sums must clamp the result
before entering the Master layer.

These scores serve as the inputs:

technical_score      ∈ [-10, +10]

news_score           ∈ [-10, +10]

macro_score          ∈ [-10, +10]

sector_score         ∈ [-10, +10]

options_flow_score   ∈ [-10, +10]

micro_company_score  ∈ [-10, +10]

# =====================================================
# 📍 MASTER FORMULA
# =====================================================

master_score =

(

    (technical_score      * 0.26) +

    (news_score           * 0.22) +

    (macro_score          * 0.14) +

    (sector_score         * 0.14) +

    (options_flow_score   * 0.12) +

    (micro_company_score  * 0.12)

)

# =====================================================
# 📍 NORMALIZATION RULES
# =====================================================

The Master Score is NOT clamped to any range.

The magnitude of the score expresses conviction:

    |master_score| > 5   = Strong trend conviction

    |master_score| 3–5   = Medium conviction

    |master_score| < 3   = Weak signal

# =====================================================
# 📍 OUTPUT STRUCTURE (Returned Object)
# =====================================================

The Master Scoring Engine must output a structured object:

MasterScore = {

    score: float,                 // Final numerical score

    direction: "LONG" | "SHORT",  // Determined by sign

    components: {

        technical:     technical_score,

        news:          news_score,

        macro:         macro_score,

        sector:        sector_score,

        options_flow:  options_flow_score,

        micro_company: micro_company_score

    },

    weighted_components: {

        technical:     technical_score * 0.26,

        news:          news_score * 0.22,

        macro:         macro_score * 0.14,

        sector:        sector_score * 0.14,

        options_flow:  options_flow_score * 0.12,

        micro_company: micro_company_score * 0.12

    }

}

This is the canonical output format.

# =====================================================
# 📍 INTERPRETATION LAYER
# =====================================================

direction =

    if master_score > 0 → LONG

    if master_score < 0 → SHORT

priority =

    if |master_score| ≥ 7  → Tier 1 (High Priority)

    if |master_score| ≥ 4  → Tier 2

    if |master_score| ≥ 2  → Tier 3

    else                  → Ignore (Low conviction)

# =====================================================
# 📍 EXECUTION ENGINE COMPATIBILITY
# =====================================================

The Master Score does NOT consider risk constraints.

It sends direction + conviction to the Execution Engine.

Execution Engine will:

- apply Position Risk modifiers

- limit position size based on risk

- validate exposure constraints

- determine entry eligibility

# =====================================================
# 📍 STRICT IMPLEMENTATION RULES (CRITICAL)
# =====================================================

Cursor must enforce the following:

1. Department weights must remain EXACT:

   0.26 / 0.22 / 0.14 / 0.14 / 0.12 / 0.12

2. No department may be added or removed.

3. Do not re-normalize department scores inside the Master layer.

4. Department names MUST match exactly:

   TECHNICAL, NEWS, MACRO, SECTOR, OPTIONS_FLOW, MICRO_COMPANY

5. The Master Scoring module must not read raw indicators.

   It reads only final department scores.

6. Intermediate weighted values must be exposed in the final object,

   because the Front-End and Router need them.

7. The formula is immutable unless explicitly updated.

# =====================================================
# 📍 FINAL REMARK
# =====================================================

This is the single source of truth for the scoring engine.

All logic inside the trade router, execution engine, UI, and filtering systems
must reference this exact Master Scoring specification.

