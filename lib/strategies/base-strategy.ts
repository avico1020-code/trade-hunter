/**
 * Base Strategy Class
 * כל אסטרטגיה חייבת לרשת מהמחלקה הזו ולממש את הפונקציות המופשטות
 */

export interface MarketData {
  symbol: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Signal {
  type: "entry" | "exit";
  action: "long" | "short" | "close";
  confidence: number; // 0-1
  reason: string;
  price: number;
  stopLoss?: number;
  takeProfit?: number;
}

export interface StrategyConfig {
  enabled: boolean;
  patternConfig: Record<string, any>;
  entryConfig: Record<string, any>;
  exitConfig: Record<string, any>;
  stopConfig: Record<string, any>;
}

/**
 * מחלקת אב לכל האסטרטגיות
 */
export abstract class BaseStrategy {
  protected config: StrategyConfig;
  protected name: string;

  constructor(name: string, config: StrategyConfig) {
    this.name = name;
    this.config = config;
  }

  /**
   * זיהוי תבנית - כל אסטרטגיה מממשת את הלוגיקה שלה
   * @param data - מערך נרות (candlesticks)
   * @returns true אם התבנית זוהתה
   */
  abstract detectPattern(data: MarketData[]): boolean;

  /**
   * בדיקת תנאי כניסה
   * @param data - מערך נרות
   * @returns Signal אם יש אות כניסה, null אחרת
   */
  abstract checkEntryConditions(data: MarketData[]): Signal | null;

  /**
   * בדיקת תנאי יציאה
   * @param data - מערך נרות
   * @param entryPrice - מחיר הכניסה
   * @param side - כיוון העסקה
   * @returns Signal אם יש אות יציאה, null אחרת
   */
  abstract checkExitConditions(
    data: MarketData[],
    entryPrice: number,
    side: "long" | "short"
  ): Signal | null;

  /**
   * חישוב Stop Loss ו-Take Profit
   * @param entryPrice - מחיר הכניסה
   * @param side - כיוון העסקה
   * @returns אובייקט עם stopLoss ו-takeProfit
   */
  abstract calculateStops(
    entryPrice: number,
    side: "long" | "short"
  ): { stopLoss: number; takeProfit: number };

  /**
   * פונקציה ראשית לניתוח - משתמשת בכל הפונקציות האחרות
   * @param data - מערך נרות
   * @param entryPrice - מחיר כניסה (אם יש פוזיציה פתוחה)
   * @param side - כיוון העסקה (אם יש פוזיציה פתוחה)
   * @returns Signal אם יש אות, null אחרת
   */
  analyze(data: MarketData[], entryPrice?: number, side?: "long" | "short"): Signal | null {
    // אם יש פוזיציה פתוחה, בדוק תנאי יציאה
    if (entryPrice !== undefined && side !== undefined) {
      return this.checkExitConditions(data, entryPrice, side);
    }

    // אחרת, חפש הזדמנויות כניסה
    if (this.detectPattern(data)) {
      return this.checkEntryConditions(data);
    }

    return null;
  }

  /**
   * בדיקה אם האסטרטגיה פעילה
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * קבלת שם האסטרטגיה
   */
  getName(): string {
    return this.name;
  }

  /**
   * עדכון תצורה
   */
  updateConfig(newConfig: Partial<StrategyConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * פונקציות עזר - זמינות לכל האסטרטגיות
   */

  /**
   * חישוב ממוצע נע פשוט (SMA)
   */
  protected calculateSMA(data: MarketData[], period: number): number {
    if (data.length < period) return 0;
    const slice = data.slice(-period);
    const sum = slice.reduce((acc, candle) => acc + candle.close, 0);
    return sum / period;
  }

  /**
   * חישוב ATR (Average True Range)
   */
  protected calculateATR(data: MarketData[], period: number): number {
    if (data.length < period + 1) return 0;

    const trueRanges: number[] = [];
    for (let i = 1; i < data.length; i++) {
      const high = data[i].high;
      const low = data[i].low;
      const prevClose = data[i - 1].close;

      const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
      trueRanges.push(tr);
    }

    const recentTRs = trueRanges.slice(-period);
    return recentTRs.reduce((sum, tr) => sum + tr, 0) / period;
  }

  /**
   * מציאת שיאים מקומיים
   */
  protected findPeaks(
    data: MarketData[],
    lookback = 2
  ): Array<{ index: number; price: number; timestamp: number }> {
    const peaks: Array<{ index: number; price: number; timestamp: number }> = [];

    for (let i = lookback; i < data.length - lookback; i++) {
      let isPeak = true;

      // בדיקה שהנקודה גבוהה מכל הנקודות סביבה
      for (let j = i - lookback; j <= i + lookback; j++) {
        if (j !== i && data[j].high >= data[i].high) {
          isPeak = false;
          break;
        }
      }

      if (isPeak) {
        peaks.push({
          index: i,
          price: data[i].high,
          timestamp: data[i].timestamp,
        });
      }
    }

    return peaks;
  }

  /**
   * מציאת שפלים מקומיים
   */
  protected findTroughs(
    data: MarketData[],
    lookback = 2
  ): Array<{ index: number; price: number; timestamp: number }> {
    const troughs: Array<{ index: number; price: number; timestamp: number }> = [];

    for (let i = lookback; i < data.length - lookback; i++) {
      let isTrough = true;

      // בדיקה שהנקודה נמוכה מכל הנקודות סביבה
      for (let j = i - lookback; j <= i + lookback; j++) {
        if (j !== i && data[j].low <= data[i].low) {
          isTrough = false;
          break;
        }
      }

      if (isTrough) {
        troughs.push({
          index: i,
          price: data[i].low,
          timestamp: data[i].timestamp,
        });
      }
    }

    return troughs;
  }

  /**
   * חישוב ממוצע נפח
   */
  protected calculateAverageVolume(data: MarketData[], period: number): number {
    if (data.length < period) return 0;
    const slice = data.slice(-period);
    const sum = slice.reduce((acc, candle) => acc + candle.volume, 0);
    return sum / period;
  }
}
