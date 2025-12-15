// lib/strategies/double-top.ts

// אסטרטגיית דאבל-טופ + Adapter שמממש IPatternStrategy

// מבוסס על הקוד המקורי שלך, עם עטיפה שמתאימה לסורק ולמנוע הביצוע.

import {
  IndicatorSnapshot,
  IPatternStrategy,
  PatternDetectionResult,
} from "../scanner/trade-pattern-scanner";
import type { Candle, EntrySignal, ExitSignal, StopLevels } from "./types";

export type MAKind = "sma";

export interface DoubleTopConfig {
  // ---------- זיהוי ----------
  minDropPct: number; // עומק ירידה מינימלי בין השיא הראשון לשפל שביניהם (%)
  maxDropPct: number; // עומק ירידה מקסימלי (כדי לא לזהות דאבל-טופ "מרוסק")
  minBarsBetweenPeaks: number; // מינימום נרות בין שיא1 לשיא2 (למשל 8+)
  peakDiffAbsPct: number; // סטייה מוחלטת מותרת בין השיאים (± אחוז)
  volumeDowntrendBetweenPeaks: boolean; // האם לדרוש ווליום יורד בין השיאים
  patternConfirmRedBars: number; // מספר נרות אדומים (סגירה<פתיחה) לאישור התבנית אחרי השיא השני

  // התראה מוקדמת
  earlyHeadsUpEnabled: boolean; // במגמת עלייה אחרי השפל, שני נרות עליה ואז התראה
  earlyHeadsUpRiseBars: number; // כמה נרות עליה לפני התראה (בד"כ 2)

  // ---------- כניסה ראשונה ----------
  entry1ConfirmBars: number; // כמה נרות אישור לכניסה (יכול להיות שווה ל-patternConfirmRedBars)
  entry1UsesSameConfirmation: boolean; // אם true: הכניסה נשענת על אותו נר אישור של התבנית (לא נר נוסף)

  // ---------- יציאה ראשונה (ווליום חריג) ----------
  abnormalVolMultiplier: number; // פי N מהממוצע ייחשב חריג (למשל 2.0)
  abnormalVolWindowMode: "fromFirstRed" | "fixed";
  abnormalVolFixedWindow: number; // רלוונטי רק אם windowMode='fixed'

  // ---------- כניסה שניה ----------
  entry2Enabled: boolean;
  entry2ConfirmBelowMA: number; // כמה נרות סגירה מתחת ל-MA אחרי "כשל על ה-MA" (בד"כ 2)
  maKind: MAKind; // כרגע 'sma'
  maWindows: number[]; // מערך ממוצעים נעים (למשל [9,20,50])

  // ---------- יציאה שניה ----------
  exit2OnTouchMA: boolean; // יציאה כשנוגעים ב-MA מלמטה אחרי הירידה השניה

  // ---------- סטופים ----------
  // כניסה1
  stop1_initial_atSecondPeakHigh: boolean; // סטופ ראשון: High של השיא השני
  stop1_trailing_byResistances: boolean; // סטופ נגרר "מדרגות" לפי lower-highs שנשברים
  // כניסה2
  stop2_initial_atFailedMAHigh: boolean; // סטופ ראשון: High של נר הכשל על ה-MA
  stop2_trailing_byResistances: boolean; // אותו עיקרון נגרר כמו כניסה1
}

export interface PatternState {
  patternFound: boolean;
  firstPeakIdx?: number;
  secondPeakIdx?: number;
  troughIdx?: number;
  neckline?: number;
  earlyHeadsUp?: boolean; // הופעלה התראה מוקדמת (לפני השיא השני)
  confirmCount?: number; // כמה נרות אישור אדומים התקבלו
  reason?: string;
}

// Types moved to lib/strategies/types.ts to avoid circular imports

// =========================
// DoubleTopStrategy – אסטרטגיה "טהורה"
// =========================

export class DoubleTopStrategy {
  constructor(private cfg: DoubleTopConfig) {}

  // =========================
  // 1) זיהוי תבנית דאבל-טופ
  // =========================
  detectPattern(data: Candle[]): PatternState {
    const n = data.length;
    if (n < Math.max(this.cfg.minBarsBetweenPeaks + 3, 20)) {
      return { patternFound: false, reason: "not-enough-data" };
    }

    const peaks = this.findPeaks(data);
    if (peaks.length < 2) return { patternFound: false, reason: "no-two-peaks" };
    const [p1, p2] = peaks.slice(-2);

    const barsBetween = p2.idx - p1.idx;
    if (barsBetween < this.cfg.minBarsBetweenPeaks) {
      return { patternFound: false, reason: "bars-between-too-small" };
    }

    // השפל בין השיאים (neckline candidate)
    const trough = this.findTroughBetween(data, p1.idx, p2.idx);
    if (!trough) return { patternFound: false, reason: "no-trough-between-peaks" };

    const dropPct = pct(p1.price - trough.low, p1.price);
    if (dropPct < this.cfg.minDropPct || dropPct > this.cfg.maxDropPct) {
      return { patternFound: false, reason: "drop-out-of-range" };
    }

    // סטייה בין השיאים (מוחלטת, ±)
    const peakDiffPct = pct(Math.abs(p2.price - p1.price), p1.price);
    if (peakDiffPct > this.cfg.peakDiffAbsPct) {
      return { patternFound: false, reason: "peaks-diff-too-large" };
    }

    // מגמת ווליום יורדת בין השיאים (רשות)
    if (this.cfg.volumeDowntrendBetweenPeaks) {
      const vol1 = avgVolume(data, Math.max(p1.idx - 2, 0), p1.idx + 1);
      const vol2 = avgVolume(data, Math.max(p2.idx - 2, 0), p2.idx + 1);
      if (!(vol1 > vol2)) {
        return { patternFound: false, reason: "volume-not-decreasing" };
      }
    }

    // התראה מוקדמת: אחרי השפל, אם קיימים X נרות עולים ולפחות קרבה לשיא1
    let earlyHeadsUp = false;
    if (this.cfg.earlyHeadsUpEnabled) {
      const upOk =
        this.countConsecutiveRisingBarsFrom(trough.idx + 1, data) >= this.cfg.earlyHeadsUpRiseBars;
      if (upOk) {
        const last = data[n - 1].close;
        const mid = trough.low + (p1.price - trough.low) * 0.5;
        if (last >= mid) earlyHeadsUp = true;
      }
    }

    // אישור תבנית דורש נרות אדומים אחרי השיא השני
    const redCount = this.countConsecutiveRedBarsFrom(p2.idx + 1, data);

    return {
      patternFound: redCount >= this.cfg.patternConfirmRedBars,
      firstPeakIdx: p1.idx,
      secondPeakIdx: p2.idx,
      troughIdx: trough.idx,
      neckline: trough.low,
      confirmCount: redCount,
      earlyHeadsUp,
      reason: redCount >= this.cfg.patternConfirmRedBars ? "pattern-confirmed" : "awaiting-confirm",
    };
  }

  // ======================================
  // 2) טריגר כניסה ראשונה (לאחר אישור התבנית)
  // ======================================
  entryFirst(data: Candle[], st: PatternState): EntrySignal {
    if (!st.patternFound || st.secondPeakIdx == null) return { enter: false, leg: 1 };

    const afterSecond = data.slice(st.secondPeakIdx + 1);
    if (afterSecond.length === 0) return { enter: false, leg: 1 };

    const need = this.cfg.entry1UsesSameConfirmation
      ? Math.max(this.cfg.patternConfirmRedBars, 1)
      : Math.max(this.cfg.entry1ConfirmBars, 1);

    const reds = this.countConsecutiveRedBarsFrom(st.secondPeakIdx + 1, data);
    if (reds < need) return { enter: false, leg: 1 };

    const c = data[data.length - 1];
    return { enter: true, leg: 1, price: c.close, refIndices: [st.secondPeakIdx] };
  }

  // =========================================
  // 3) טריגר יציאה ראשונה – ווליום חריג בירידה
  // =========================================
  exitFirst(data: Candle[], st: PatternState, firstRedIdxAfterP2: number | null): ExitSignal {
    if (!st.patternFound) return { exit: false, leg: 1 };

    const last = data[data.length - 1];
    const volNow = last.volume;
    const windowAvg =
      this.cfg.abnormalVolWindowMode === "fromFirstRed" && firstRedIdxAfterP2 !== null
        ? avgVolume(data, firstRedIdxAfterP2, data.length)
        : avgVolume(data, Math.max(0, data.length - this.cfg.abnormalVolFixedWindow), data.length);

    if (windowAvg <= 0) return { exit: false, leg: 1 };

    if (volNow >= windowAvg * this.cfg.abnormalVolMultiplier) {
      return { exit: true, leg: 1, reason: "abnormal-volume", price: last.close };
    }
    return { exit: false, leg: 1 };
  }

  // ======================================
  // 4) טריגר כניסה שניה – "כשל על ממוצע נע"
  // ======================================
  entrySecond(data: Candle[], st: PatternState): EntrySignal {
    if (!this.cfg.entry2Enabled || !st.patternFound) return { enter: false, leg: 2 };
    const c = data[data.length - 1];

    for (const w of this.cfg.maWindows) {
      const ma = sma(
        data.map((d) => d.close),
        w
      );
      if (ma == null) continue;

      const prev = data[data.length - 2];
      if (!prev) continue;

      const failedIdx = data.length - 1;
      const failed = c.high >= ma && c.close < ma;
      if (!failed) continue;

      const need = Math.max(this.cfg.entry2ConfirmBelowMA, 1);
      let ok = true;
      for (let i = data.length - need; i < data.length; i++) {
        if (i < 0 || data[i].close >= smaAt(data, w, i)) {
          ok = false;
          break;
        }
      }
      if (!ok) continue;

      return {
        enter: true,
        leg: 2,
        price: c.close,
        meta: { failedMAWindow: w, failedIdx },
      };
    }
    return { enter: false, leg: 2 };
  }

  // ======================================
  // 5) טריגר יציאה שניה – נגיעה ב-MA מלמטה
  // ======================================
  exitSecond(data: Candle[]): ExitSignal {
    if (!this.cfg.exit2OnTouchMA) return { exit: false, leg: 2 };
    const c = data[data.length - 1];
    for (const w of this.cfg.maWindows) {
      const ma = sma(
        data.map((d) => d.close),
        w
      );
      if (ma == null) continue;
      if (c.low <= ma && c.close <= ma) {
        return { exit: true, leg: 2, reason: `touch-ma-${w}`, price: c.close };
      }
    }
    return { exit: false, leg: 2 };
  }

  // =========================
  // 6) סטופים (חישוב והצעה)
  // =========================

  stopsForEntry1(data: Candle[], st: PatternState): StopLevels | null {
    if (st.secondPeakIdx == null) return null;
    const initial = this.cfg.stop1_initial_atSecondPeakHigh
      ? data[st.secondPeakIdx].high
      : data[st.secondPeakIdx].high;

    const trailing = this.cfg.stop1_trailing_byResistances
      ? this.lastBrokenLowerHighStop(data, st.secondPeakIdx)
      : undefined;

    return { initial, trailing };
  }

  stopsForEntry2(data: Candle[], failedMAIdx: number | null): StopLevels | null {
    const last = data[data.length - 1];
    const init =
      this.cfg.stop2_initial_atFailedMAHigh && failedMAIdx != null
        ? data[failedMAIdx].high
        : last.high;

    const trailing = this.cfg.stop2_trailing_byResistances
      ? this.lastBrokenLowerHighStop(data, failedMAIdx ?? data.length - 1)
      : undefined;

    return { initial: init, trailing };
  }

  // =========================
  // פונקציות עזר פנימיות
  // =========================

  private findPeaks(data: Candle[]): Array<{ idx: number; price: number }> {
    const out: Array<{ idx: number; price: number }> = [];
    for (let i = 1; i < data.length - 1; i++) {
      if (data[i].high > data[i - 1].high && data[i].high > data[i + 1].high) {
        out.push({ idx: i, price: data[i].high });
      }
    }
    return out;
  }

  private findTroughBetween(
    data: Candle[],
    i1: number,
    i2: number
  ): { idx: number; low: number } | null {
    if (i2 <= i1 + 1) return null;
    let low = Number.POSITIVE_INFINITY;
    let idx = -1;
    for (let i = i1 + 1; i < i2; i++) {
      if (data[i].low < low) {
        low = data[i].low;
        idx = i;
      }
    }
    return idx === -1 ? null : { idx, low };
  }

  private countConsecutiveRedBarsFrom(start: number, data: Candle[]): number {
    let c = 0;
    for (let i = start; i < data.length; i++) {
      if (data[i].close < data[i].open) c++;
      else break;
    }
    return c;
  }

  private countConsecutiveRisingBarsFrom(start: number, data: Candle[]): number {
    let c = 0;
    for (let i = start; i < data.length; i++) {
      const prev = data[i - 1];
      if (!prev) break;
      if (data[i].close > prev.close) c++;
      else break;
    }
    return c;
  }

  private lastBrokenLowerHighStop(data: Candle[], refIdx: number): number | undefined {
    let lastLH: { idx: number; price: number } | null = null;
    for (let i = refIdx + 1; i < data.length - 1; i++) {
      const isLH = data[i].high < data[i - 1].high && data[i].high > data[i + 1].high;
      if (isLH) lastLH = { idx: i, price: data[i].high };
    }
    return lastLH?.price;
  }
}

// =========================
// עזרי חישוב קטנים
// =========================

function pct(a: number, b: number): number {
  return (a / b) * 100;
}

function avgVolume(data: Candle[], from: number, to: number): number {
  const s = Math.max(from, 0);
  const e = Math.min(to, data.length);
  if (e - s <= 0) return 0;
  let sum = 0;
  for (let i = s; i < e; i++) sum += data[i].volume;
  return sum / (e - s);
}

// Import centralized indicators library
import * as Indicators from "../indicators";

function sma(values: number[], w: number): number | null {
  // Use centralized SMA calculation
  return Indicators.SMA(values, w);
}

function smaAt(data: Candle[], w: number, i: number): number {
  if (i + 1 < w) return Number.POSITIVE_INFINITY;

  // Extract closes up to index i
  const closes = data.slice(0, i + 1).map((c) => c.close);
  const result = Indicators.SMA(closes, w);

  return result ?? Number.POSITIVE_INFINITY;
}

// =========================
// Adapter: DoubleTopPatternStrategy
// מממש IPatternStrategy עבור הסורק + מנוע הביצוע
// =========================

import type {
  IndicatorSnapshot,
  IPatternStrategy,
  PatternDetectionResult,
} from "../scanner/trade-pattern-scanner";
import type { StrategyState } from "./strategy-state";

export class DoubleTopPatternStrategy implements IPatternStrategy {
  name = "DOUBLE_TOP";
  direction: "LONG" | "SHORT" | "BOTH" = "SHORT";

  constructor(private impl: DoubleTopStrategy) {}

  /**
   * זיהוי תבנית - משמש רק את הסורק
   * לא מחשב entry/exit - רק בודק אם התבנית קיימת
   */
  detectPattern(candles: Candle[], indicators?: IndicatorSnapshot): PatternDetectionResult {
    const base: PatternState = this.impl.detectPattern(candles);

    if (!base.patternFound) {
      return {
        patternFound: false,
        reason: base.reason,
        basedOnClosedCandle: true,
        ...base,
      };
    }

    // Store pattern data in result for use by execution engine
    const secondPeakHigh =
      base.secondPeakIdx != null ? candles[base.secondPeakIdx].high : undefined;

    const out: PatternDetectionResult = {
      patternFound: true,
      reason: base.reason,
      basedOnClosedCandle: true,

      // Pattern structure data
      firstPeakIdx: base.firstPeakIdx,
      secondPeakIdx: base.secondPeakIdx,
      troughIdx: base.troughIdx,
      neckline: base.neckline,
      confirmCount: base.confirmCount,
      earlyHeadsUp: base.earlyHeadsUp,
      secondPeakHigh,
    };

    return out;
  }

  /**
   * Entry First - בודק תנאי כניסה ראשונה
   * נקרא על ידי Execution Engine
   */
  entryFirst(
    candles: Candle[],
    patternState: PatternDetectionResult,
    currentState?: StrategyState
  ): EntrySignal {
    // Convert PatternDetectionResult to PatternState for internal logic
    const basePatternState: PatternState = {
      patternFound: patternState.patternFound,
      firstPeakIdx: patternState.firstPeakIdx,
      secondPeakIdx: patternState.secondPeakIdx,
      troughIdx: patternState.troughIdx,
      neckline: patternState.neckline,
      confirmCount: patternState.confirmCount,
      earlyHeadsUp: patternState.earlyHeadsUp,
      reason: patternState.reason,
    };

    return this.impl.entryFirst(candles, basePatternState);
  }

  /**
   * Entry Second - בודק תנאי כניסה שניה
   * נקרא על ידי Execution Engine
   */
  entrySecond(
    candles: Candle[],
    patternState: PatternDetectionResult,
    currentState?: StrategyState
  ): EntrySignal {
    const basePatternState: PatternState = {
      patternFound: patternState.patternFound,
      firstPeakIdx: patternState.firstPeakIdx,
      secondPeakIdx: patternState.secondPeakIdx,
      troughIdx: patternState.troughIdx,
      neckline: patternState.neckline,
      confirmCount: patternState.confirmCount,
      earlyHeadsUp: patternState.earlyHeadsUp,
      reason: patternState.reason,
    };

    // Find first red bar after second peak for exitFirst logic
    const firstRedIdxAfterP2 =
      basePatternState.secondPeakIdx != null
        ? this.findFirstRedBarAfter(candles, basePatternState.secondPeakIdx)
        : null;

    return this.impl.entrySecond(candles, basePatternState);
  }

  /**
   * Exit First - בודק תנאי יציאה ראשונה
   * נקרא על ידי Execution Engine
   */
  exitFirst(
    candles: Candle[],
    patternState: PatternDetectionResult,
    currentState: StrategyState
  ): ExitSignal {
    const basePatternState: PatternState = {
      patternFound: patternState.patternFound,
      firstPeakIdx: patternState.firstPeakIdx,
      secondPeakIdx: patternState.secondPeakIdx,
      troughIdx: patternState.troughIdx,
      neckline: patternState.neckline,
      confirmCount: patternState.confirmCount,
      earlyHeadsUp: patternState.earlyHeadsUp,
      reason: patternState.reason,
    };

    const firstRedIdxAfterP2 =
      basePatternState.secondPeakIdx != null
        ? this.findFirstRedBarAfter(candles, basePatternState.secondPeakIdx)
        : null;

    return this.impl.exitFirst(candles, basePatternState, firstRedIdxAfterP2);
  }

  /**
   * Exit Second - בודק תנאי יציאה שניה
   * נקרא על ידי Execution Engine
   */
  exitSecond(
    candles: Candle[],
    patternState: PatternDetectionResult,
    currentState: StrategyState
  ): ExitSignal {
    return this.impl.exitSecond(candles);
  }

  /**
   * Stop Levels for Entry 1
   * נקרא על ידי Execution Engine
   */
  stopsForEntry1(
    candles: Candle[],
    patternState: PatternDetectionResult,
    currentState?: StrategyState
  ): StopLevels | null {
    const basePatternState: PatternState = {
      patternFound: patternState.patternFound,
      firstPeakIdx: patternState.firstPeakIdx,
      secondPeakIdx: patternState.secondPeakIdx,
      troughIdx: patternState.troughIdx,
      neckline: patternState.neckline,
      confirmCount: patternState.confirmCount,
      earlyHeadsUp: patternState.earlyHeadsUp,
      reason: patternState.reason,
    };

    return this.impl.stopsForEntry1(candles, basePatternState);
  }

  /**
   * Stop Levels for Entry 2
   * נקרא על ידי Execution Engine
   */
  stopsForEntry2(
    candles: Candle[],
    patternState: PatternDetectionResult,
    currentState?: StrategyState
  ): StopLevels | null {
    // Extract failedMAIdx from currentState.custom if available
    const failedMAIdx =
      currentState?.custom?.failedMAIdx != null
        ? (currentState.custom.failedMAIdx as number)
        : null;

    return this.impl.stopsForEntry2(candles, failedMAIdx);
  }

  /**
   * Helper: Find first red bar after index
   */
  private findFirstRedBarAfter(candles: Candle[], startIdx: number): number | null {
    for (let i = startIdx + 1; i < candles.length; i++) {
      if (candles[i].close < candles[i].open) {
        return i;
      }
    }
    return null;
  }
}
