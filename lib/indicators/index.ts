/**
 * Technical Indicators Library
 * 
 * מאגר מרכזי לכל האינדיקטורים הטכניים
 * כל אסטרטגיה יכולה להשתמש באינדיקטורים מכאן
 * 
 * @module indicators
 */

import type { Candle } from "../strategies/types";

// ============================================================================
// Types
// ============================================================================

export interface IndicatorResult {
  value: number;
  timestamp?: string;
}

export interface MACDResult {
  macd: number;
  signal: number;
  histogram: number;
}

export interface BollingerBandsResult {
  upper: number;
  middle: number;
  lower: number;
}

export interface StochasticResult {
  k: number;
  d: number;
}

// ============================================================================
// Moving Averages
// ============================================================================

/**
 * SMA - Simple Moving Average
 * ממוצע נע פשוט
 * 
 * @param values - מערך ערכים (בדרך כלל מחירי סגירה)
 * @param period - תקופה (כמה נרות אחורה)
 * @returns ממוצע נע פשוט, או null אם אין מספיק נתונים
 * 
 * @example
 * const closes = candles.map(c => c.close);
 * const sma20 = SMA(closes, 20);
 */
export function SMA(values: number[], period: number): number | null {
  if (!values || values.length < period || period <= 0) {
    return null;
  }

  let sum = 0;
  for (let i = values.length - period; i < values.length; i++) {
    sum += values[i];
  }

  return sum / period;
}

/**
 * SMA Array - Simple Moving Average for entire series
 * מחשב SMA לכל נקודה במערך
 * 
 * @returns מערך של SMA values (NaN עבור נקודות ללא מספיק היסטוריה)
 */
export function SMAArray(values: number[], period: number): number[] {
  const result: number[] = new Array(values.length).fill(NaN);

  if (!values || values.length < period || period <= 0) {
    return result;
  }

  // First SMA
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += values[i];
  }
  result[period - 1] = sum / period;

  // Rolling SMA
  for (let i = period; i < values.length; i++) {
    sum = sum - values[i - period] + values[i];
    result[i] = sum / period;
  }

  return result;
}

/**
 * EMA - Exponential Moving Average
 * ממוצע נע מעריכי (נותן משקל יותר גבוה לנרות אחרונים)
 * 
 * @param values - מערך ערכים
 * @param period - תקופה
 * @returns EMA האחרון, או null אם אין מספיק נתונים
 */
export function EMA(values: number[], period: number): number | null {
  if (!values || values.length < period || period <= 0) {
    return null;
  }

  const array = EMAArray(values, period);
  return array[array.length - 1];
}

/**
 * EMA Array - Exponential Moving Average for entire series
 */
export function EMAArray(values: number[], period: number): number[] {
  const result: number[] = new Array(values.length).fill(NaN);

  if (!values || values.length < period || period <= 0) {
    return result;
  }

  // First EMA = SMA
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += values[i];
  }
  let prevEma = sum / period;
  result[period - 1] = prevEma;

  // Calculate multiplier (smoothing factor)
  const k = 2 / (period + 1);

  // Calculate EMA for remaining values
  for (let i = period; i < values.length; i++) {
    const ema = values[i] * k + prevEma * (1 - k);
    result[i] = ema;
    prevEma = ema;
  }

  return result;
}

/**
 * WMA - Weighted Moving Average
 * ממוצע נע משוקלל (נרות אחרונים מקבלים משקל גבוה יותר באופן ליניארי)
 */
export function WMA(values: number[], period: number): number | null {
  if (!values || values.length < period || period <= 0) {
    return null;
  }

  let sum = 0;
  let weightSum = 0;

  for (let i = 0; i < period; i++) {
    const weight = i + 1;
    const index = values.length - period + i;
    sum += values[index] * weight;
    weightSum += weight;
  }

  return sum / weightSum;
}

// ============================================================================
// Momentum Indicators
// ============================================================================

/**
 * RSI - Relative Strength Index
 * אינדיקטור מומנטום (0-100)
 * מעל 70 = Overbought (קנייה מוגזמת)
 * מתחת 30 = Oversold (מכירה מוגזמת)
 * 
 * @param values - מחירי סגירה
 * @param period - תקופה (בדרך כלל 14)
 * @returns RSI value בין 0 ל-100
 * 
 * @example
 * const rsi = RSI(closes, 14);
 * if (rsi > 70) console.log("Overbought");
 * if (rsi < 30) console.log("Oversold");
 */
export function RSI(values: number[], period: number = 14): number | null {
  if (!values || values.length < period + 1) {
    return null;
  }

  const array = RSIArray(values, period);
  return array[array.length - 1];
}

/**
 * RSI Array - RSI for entire series
 */
export function RSIArray(values: number[], period: number = 14): number[] {
  const result: number[] = new Array(values.length).fill(NaN);

  if (!values || values.length < period + 1) {
    return result;
  }

  // Calculate price changes
  const changes: number[] = [];
  for (let i = 1; i < values.length; i++) {
    changes.push(values[i] - values[i - 1]);
  }

  // First average gain/loss (SMA)
  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 0; i < period; i++) {
    if (changes[i] >= 0) {
      avgGain += changes[i];
    } else {
      avgLoss += Math.abs(changes[i]);
    }
  }

  avgGain /= period;
  avgLoss /= period;

  // First RSI
  if (avgLoss === 0) {
    result[period] = 100;
  } else {
    const rs = avgGain / avgLoss;
    result[period] = 100 - 100 / (1 + rs);
  }

  // Subsequent RSI values (using smoothing)
  for (let i = period; i < changes.length; i++) {
    const change = changes[i];
    const gain = change >= 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    if (avgLoss === 0) {
      result[i + 1] = 100;
    } else {
      const rs = avgGain / avgLoss;
      result[i + 1] = 100 - 100 / (1 + rs);
    }
  }

  return result;
}

/**
 * MACD - Moving Average Convergence Divergence
 * אינדיקטור מומנטום המבוסס על הפרש בין שני ממוצעים נעים
 * 
 * @param values - מחירי סגירה
 * @param fastPeriod - תקופה מהירה (בדרך כלל 12)
 * @param slowPeriod - תקופה איטית (בדרך כלל 26)
 * @param signalPeriod - תקופה לקו האות (בדרך כלל 9)
 * @returns אובייקט עם MACD, Signal, Histogram
 * 
 * @example
 * const macd = MACD(closes, 12, 26, 9);
 * if (macd.histogram > 0) console.log("Bullish");
 */
export function MACD(
  values: number[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): MACDResult | null {
  if (!values || values.length < slowPeriod + signalPeriod) {
    return null;
  }

  const array = MACDArray(values, fastPeriod, slowPeriod, signalPeriod);
  return array[array.length - 1];
}

/**
 * MACD Array - MACD for entire series
 */
export function MACDArray(
  values: number[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): MACDResult[] {
  const result: MACDResult[] = [];

  if (!values || values.length < slowPeriod + signalPeriod) {
    return result;
  }

  // Calculate EMAs
  const fastEma = EMAArray(values, fastPeriod);
  const slowEma = EMAArray(values, slowPeriod);

  // Calculate MACD line
  const macdLine: number[] = [];
  for (let i = 0; i < values.length; i++) {
    if (!isNaN(fastEma[i]) && !isNaN(slowEma[i])) {
      macdLine.push(fastEma[i] - slowEma[i]);
    } else {
      macdLine.push(NaN);
    }
  }

  // Calculate signal line (EMA of MACD)
  const signalLine = EMAArray(
    macdLine.filter((v) => !isNaN(v)),
    signalPeriod
  );

  // Combine results
  let signalIndex = 0;
  for (let i = 0; i < values.length; i++) {
    const macd = macdLine[i];
    const signal =
      !isNaN(macd) && signalIndex < signalLine.length
        ? signalLine[signalIndex++]
        : NaN;
    const histogram = !isNaN(macd) && !isNaN(signal) ? macd - signal : NaN;

    result.push({ macd, signal, histogram });
  }

  return result;
}

/**
 * Stochastic Oscillator
 * אינדיקטור מומנטום המשווה מחיר סגירה לטווח המחירים בתקופה
 * 
 * @param candles - מערך נרות
 * @param kPeriod - תקופה ל-%K (בדרך כלל 14)
 * @param dPeriod - תקופה ל-%D (בדרך כלל 3)
 * @returns אובייקט עם %K ו-%D
 */
export function Stochastic(
  candles: Candle[],
  kPeriod: number = 14,
  dPeriod: number = 3
): StochasticResult | null {
  if (!candles || candles.length < kPeriod + dPeriod) {
    return null;
  }

  const array = StochasticArray(candles, kPeriod, dPeriod);
  return array[array.length - 1];
}

/**
 * Stochastic Array
 */
export function StochasticArray(
  candles: Candle[],
  kPeriod: number = 14,
  dPeriod: number = 3
): StochasticResult[] {
  const result: StochasticResult[] = [];

  if (!candles || candles.length < kPeriod + dPeriod) {
    return result;
  }

  const kValues: number[] = [];

  // Calculate %K for each period
  for (let i = kPeriod - 1; i < candles.length; i++) {
    let highest = -Infinity;
    let lowest = Infinity;

    // Find highest high and lowest low in period
    for (let j = i - kPeriod + 1; j <= i; j++) {
      highest = Math.max(highest, candles[j].high);
      lowest = Math.min(lowest, candles[j].low);
    }

    const close = candles[i].close;
    const k = ((close - lowest) / (highest - lowest)) * 100;
    kValues.push(k);
  }

  // Calculate %D (SMA of %K)
  for (let i = 0; i < kValues.length; i++) {
    if (i < dPeriod - 1) {
      result.push({ k: kValues[i], d: NaN });
    } else {
      let sum = 0;
      for (let j = i - dPeriod + 1; j <= i; j++) {
        sum += kValues[j];
      }
      const d = sum / dPeriod;
      result.push({ k: kValues[i], d });
    }
  }

  return result;
}

// ============================================================================
// Volatility Indicators
// ============================================================================

/**
 * ATR - Average True Range
 * מודד תנודתיות (ממוצע של טווח התנועה האמיתי)
 * 
 * @param candles - מערך נרות
 * @param period - תקופה (בדרך כלל 14)
 * @returns ATR value
 * 
 * @example
 * const atr = ATR(candles, 14);
 * const stopLoss = entryPrice - (atr * 2); // Stop 2 ATR מתחת
 */
export function ATR(candles: Candle[], period: number = 14): number | null {
  if (!candles || candles.length < period + 1) {
    return null;
  }

  const array = ATRArray(candles, period);
  return array[array.length - 1];
}

/**
 * ATR Array
 */
export function ATRArray(candles: Candle[], period: number = 14): number[] {
  const result: number[] = new Array(candles.length).fill(NaN);

  if (!candles || candles.length < period + 1) {
    return result;
  }

  // Calculate True Range for each candle
  const tr: number[] = [NaN]; // First candle has no TR

  for (let i = 1; i < candles.length; i++) {
    const high = candles[i].high;
    const low = candles[i].low;
    const prevClose = candles[i - 1].close;

    const tr1 = high - low; // Current range
    const tr2 = Math.abs(high - prevClose); // Gap up
    const tr3 = Math.abs(low - prevClose); // Gap down

    tr.push(Math.max(tr1, tr2, tr3));
  }

  // First ATR = Simple average of first 'period' TRs
  let sum = 0;
  for (let i = 1; i <= period; i++) {
    sum += tr[i];
  }
  let prevAtr = sum / period;
  result[period] = prevAtr;

  // Subsequent ATRs using smoothing (Wilder's method)
  const alpha = 1 / period;
  for (let i = period + 1; i < candles.length; i++) {
    const currentAtr = alpha * tr[i] + (1 - alpha) * prevAtr;
    result[i] = currentAtr;
    prevAtr = currentAtr;
  }

  return result;
}

/**
 * Bollinger Bands
 * מעטפת סטטיסטית סביב המחיר (SMA ± סטיית תקן)
 * 
 * @param values - מחירי סגירה
 * @param period - תקופה (בדרך כלל 20)
 * @param stdDev - כמה סטיות תקן (בדרך כלל 2)
 * @returns אובייקט עם Upper, Middle, Lower bands
 * 
 * @example
 * const bb = BollingerBands(closes, 20, 2);
 * if (price > bb.upper) console.log("Price above upper band");
 */
export function BollingerBands(
  values: number[],
  period: number = 20,
  stdDev: number = 2
): BollingerBandsResult | null {
  if (!values || values.length < period) {
    return null;
  }

  const array = BollingerBandsArray(values, period, stdDev);
  return array[array.length - 1];
}

/**
 * Bollinger Bands Array
 */
export function BollingerBandsArray(
  values: number[],
  period: number = 20,
  stdDev: number = 2
): BollingerBandsResult[] {
  const result: BollingerBandsResult[] = [];

  if (!values || values.length < period) {
    return result;
  }

  const smaArray = SMAArray(values, period);

  for (let i = 0; i < values.length; i++) {
    if (isNaN(smaArray[i])) {
      result.push({ upper: NaN, middle: NaN, lower: NaN });
      continue;
    }

    // Calculate standard deviation for the period
    const middle = smaArray[i];
    let sumSquares = 0;

    for (let j = i - period + 1; j <= i; j++) {
      const diff = values[j] - middle;
      sumSquares += diff * diff;
    }

    const variance = sumSquares / period;
    const sd = Math.sqrt(variance);

    const upper = middle + stdDev * sd;
    const lower = middle - stdDev * sd;

    result.push({ upper, middle, lower });
  }

  return result;
}

// ============================================================================
// Volume Indicators
// ============================================================================

/**
 * VWAP - Volume Weighted Average Price
 * ממוצע מחיר משוקלל בווליום (חשוב לאינטרה-דיי)
 * 
 * @param candles - מערך נרות
 * @param startIndex - אינדקס התחלה (בדרך כלל תחילת היום)
 * @returns VWAP value
 * 
 * @example
 * const vwap = VWAP(candles, 0); // מתחילת היום
 * if (price > vwap) console.log("Price above VWAP");
 */
export function VWAP(candles: Candle[], startIndex: number = 0): number | null {
  if (!candles || candles.length === 0 || startIndex < 0) {
    return null;
  }

  let cumulativeVolumePrice = 0;
  let cumulativeVolume = 0;

  for (let i = startIndex; i < candles.length; i++) {
    const typicalPrice = (candles[i].high + candles[i].low + candles[i].close) / 3;
    const volume = candles[i].volume;

    cumulativeVolumePrice += typicalPrice * volume;
    cumulativeVolume += volume;
  }

  if (cumulativeVolume === 0) {
    return null;
  }

  return cumulativeVolumePrice / cumulativeVolume;
}

/**
 * OBV - On Balance Volume
 * אינדיקטור ווליום מצטבר
 * 
 * @param candles - מערך נרות
 * @returns מערך של OBV values
 */
export function OBVArray(candles: Candle[]): number[] {
  const result: number[] = [];

  if (!candles || candles.length === 0) {
    return result;
  }

  let obv = 0;
  result.push(obv);

  for (let i = 1; i < candles.length; i++) {
    if (candles[i].close > candles[i - 1].close) {
      obv += candles[i].volume;
    } else if (candles[i].close < candles[i - 1].close) {
      obv -= candles[i].volume;
    }
    // If close is equal, OBV stays the same
    result.push(obv);
  }

  return result;
}

/**
 * Average Volume
 * ממוצע ווליום לתקופה
 * 
 * @param candles - מערך נרות
 * @param period - תקופה
 * @returns ממוצע ווליום
 */
export function AverageVolume(candles: Candle[], period: number): number | null {
  if (!candles || candles.length < period || period <= 0) {
    return null;
  }

  let sum = 0;
  for (let i = candles.length - period; i < candles.length; i++) {
    sum += candles[i].volume;
  }

  return sum / period;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Calculate percentage change
 * חישוב שינוי באחוזים
 */
export function PercentChange(from: number, to: number): number {
  if (from === 0) return 0;
  return ((to - from) / from) * 100;
}

/**
 * Find highest value in array
 */
export function Highest(values: number[], period: number): number | null {
  if (!values || values.length < period || period <= 0) {
    return null;
  }

  let max = -Infinity;
  for (let i = values.length - period; i < values.length; i++) {
    max = Math.max(max, values[i]);
  }

  return max === -Infinity ? null : max;
}

/**
 * Find lowest value in array
 */
export function Lowest(values: number[], period: number): number | null {
  if (!values || values.length < period || period <= 0) {
    return null;
  }

  let min = Infinity;
  for (let i = values.length - period; i < values.length; i++) {
    min = Math.min(min, values[i]);
  }

  return min === Infinity ? null : min;
}

/**
 * Standard Deviation
 * סטיית תקן
 */
export function StandardDeviation(values: number[], period: number): number | null {
  if (!values || values.length < period || period <= 0) {
    return null;
  }

  const sma = SMA(values, period);
  if (sma === null) return null;

  let sumSquares = 0;
  for (let i = values.length - period; i < values.length; i++) {
    const diff = values[i] - sma;
    sumSquares += diff * diff;
  }

  const variance = sumSquares / period;
  return Math.sqrt(variance);
}

// ============================================================================
// Batch Calculation Helper
// ============================================================================

/**
 * Calculate all common indicators at once for efficiency
 * מחשב את כל האינדיקטורים הנפוצים בבת אחת
 * 
 * @param candles - מערך נרות
 * @returns אובייקט עם כל האינדיקטורים
 * 
 * @example
 * const indicators = CalculateAllIndicators(candles);
 * console.log(indicators.rsi14, indicators.macd, indicators.bb);
 */
export function CalculateAllIndicators(candles: Candle[]) {
  if (!candles || candles.length === 0) {
    return null;
  }

  const closes = candles.map((c) => c.close);
  const highs = candles.map((c) => c.high);
  const lows = candles.map((c) => c.low);

  return {
    // Moving Averages
    sma9: SMA(closes, 9),
    sma20: SMA(closes, 20),
    sma50: SMA(closes, 50),
    sma200: SMA(closes, 200),
    ema9: EMA(closes, 9),
    ema20: EMA(closes, 20),
    ema50: EMA(closes, 50),

    // Momentum
    rsi14: RSI(closes, 14),
    macd: MACD(closes, 12, 26, 9),
    stochastic: Stochastic(candles, 14, 3),

    // Volatility
    atr14: ATR(candles, 14),
    bb: BollingerBands(closes, 20, 2),

    // Volume
    vwap: VWAP(candles, 0),
    avgVolume20: AverageVolume(candles, 20),

    // Utility
    highest20: Highest(closes, 20),
    lowest20: Lowest(closes, 20),
  };
}

// ============================================================================
// Export all
// ============================================================================

export default {
  // Moving Averages
  SMA,
  SMAArray,
  EMA,
  EMAArray,
  WMA,

  // Momentum
  RSI,
  RSIArray,
  MACD,
  MACDArray,
  Stochastic,
  StochasticArray,

  // Volatility
  ATR,
  ATRArray,
  BollingerBands,
  BollingerBandsArray,

  // Volume
  VWAP,
  OBVArray,
  AverageVolume,

  // Utility
  PercentChange,
  Highest,
  Lowest,
  StandardDeviation,

  // Batch
  CalculateAllIndicators,
};

