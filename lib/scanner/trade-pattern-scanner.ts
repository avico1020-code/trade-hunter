// lib/scanner/trade-pattern-scanner.ts

import type { Candle } from "../strategies/types";

// ============ 1) סוגי נתונים כלליים ============

// מידע שמגיע מהמאסטר סקורינג על כל מניה
export interface MasterSymbolInfo {
  symbol: string;
  direction: "LONG" | "SHORT";
  masterScore: number; // הציון הסופי של המניה
  moduleScores: Record<string, number>; // ציון לכל מודול (RSI, Volume, Macro וכו')
}

// צילום מצב אינדיקטורים טכניים (RSI, MACD, VWAP וכו')
export interface IndicatorSnapshot {
  [key: string]: number | undefined | boolean;
}

// תוצאה של זיהוי תבנית מצד האסטרטגיה (detectPattern)
export interface PatternDetectionResult {
  patternFound: boolean;
  // האם הזיהוי מבוסס על נר סגור (לא חובה, אבל עוזר לדיבוג)
  basedOnClosedCandle?: boolean;
  // אפשר להוסיף פה כל דבר שהאסטרטגיה מחזירה (אינדקסים, neckline, סיבה וכו')
  [key: string]: any;
}

// מה נשלח למערך המסחר ברגע שזוהתה תבנית
export interface PatternFoundEvent {
  symbol: string;
  strategyName: string;
  strategyDirection: "LONG" | "SHORT" | "BOTH";
  patternState: PatternDetectionResult;
  master: MasterSymbolInfo; // מידע מהמאסטר (masterScore + direction וכו')
  detectedAt: string; // timestamp ISO
}

// פונקציה שהמערך הסוחר מספק – מה לעשות כשיש זיהוי תבנית
// Receives event, candles, and indicators for execution engine
export type OnPatternFoundHandler = (
  event: PatternFoundEvent,
  candles: Candle[],
  indicators?: IndicatorSnapshot
) => void;

// לוגינג בסיסי (אופציונלי)
export interface ScannerLogger {
  info(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  error(message: string, meta?: any): void;
}

// ============ 2) ממשקי חיבור ל־IBKR ולמאסטר ============

// מקור נתונים בזמן אמת (מחיר, ווליום, אינדיקטורים טכניים)
export interface RealTimeDataClient {
  /**
   * התחברות לנתונים בזמן אמת עבור מניה ספציפית.
   * אתה תממש את זה כך שזה ידבר עם IBKR (TWS / Gateway).
   *
   * @param symbol המניה
   * @param onUpdate נקרא בכל עדכון (למשל כל נר חדש / שינוי ב־Candle)
   * @returns Function to unsubscribe/cleanup
   */
  subscribeCandles(
    symbol: string,
    onUpdate: (candles: Candle[], indicators: IndicatorSnapshot) => void
  ): () => void; // Return unsubscribe function
}

// מקור מידע למאסטר – איך מקבלים את רשימת המניות הטובות למסחר
export interface MasterScoringClient {
  /**
   * מחזיר רשימת מניות עם הציון שלהן, מדורגות לפי החוזק.
   * מתבצע בצד שלך (פייתון) – כאן רק הממשק.
   */
  getTopSymbols(minScore: number): Promise<MasterSymbolInfo[]>;
}

// ============ 3) ממשק אחיד לכל אסטרטגיית זיהוי תבנית ============

import type { StrategyState } from "../strategies/strategy-state";
import type { EntrySignal, ExitSignal, StopLevels } from "../strategies/types";

export interface IPatternStrategy {
  name: string; // "DOUBLE_TOP", "BREAKOUT" וכו'
  /**
   * באיזה כיוון האסטרטגיה יודעת לסחור.
   * LONG – אסטרטגיה ללונג בלבד
   * SHORT – אסטרטגיה לשורט בלבד
   * BOTH – אפשר לשני הכיוונים
   */
  direction: "LONG" | "SHORT" | "BOTH";

  /**
   * זיהוי התבנית (חלק "זיהוי" של האסטרטגיה).
   * משמש רק את הסורק - לא מבצע כניסה/יציאה.
   * רק אומר האם התבנית קיימת ומה מצבה.
   */
  detectPattern(
    candles: Candle[],
    indicators?: IndicatorSnapshot
  ): PatternDetectionResult;

  /**
   * Entry First - בדיקת תנאי כניסה ראשונה
   * משמש את Execution Engine
   */
  entryFirst(
    candles: Candle[],
    patternState: PatternDetectionResult,
    currentState?: StrategyState
  ): EntrySignal;

  /**
   * Entry Second - בדיקת תנאי כניסה שניה
   * משמש את Execution Engine
   */
  entrySecond(
    candles: Candle[],
    patternState: PatternDetectionResult,
    currentState?: StrategyState
  ): EntrySignal;

  /**
   * Exit First - בדיקת תנאי יציאה ראשונה
   * משמש את Execution Engine
   */
  exitFirst(
    candles: Candle[],
    patternState: PatternDetectionResult,
    currentState: StrategyState
  ): ExitSignal;

  /**
   * Exit Second - בדיקת תנאי יציאה שניה
   * משמש את Execution Engine
   */
  exitSecond(
    candles: Candle[],
    patternState: PatternDetectionResult,
    currentState: StrategyState
  ): ExitSignal;

  /**
   * Stop Levels for Entry 1
   * משמש את Execution Engine לחישוב סטופים לכניסה ראשונה
   */
  stopsForEntry1(
    candles: Candle[],
    patternState: PatternDetectionResult,
    currentState?: StrategyState
  ): StopLevels | null;

  /**
   * Stop Levels for Entry 2
   * משמש את Execution Engine לחישוב סטופים לכניסה שניה
   */
  stopsForEntry2(
    candles: Candle[],
    patternState: PatternDetectionResult,
    currentState?: StrategyState
  ): StopLevels | null;
}

// ============ 4) קונפיג של סורק המסחר ============

export interface TradePatternScannerConfig {
  /** סף מינימלי למסחר (למשל 6.0) */
  minMasterScore: number;

  /** כמה מניות מקסימום לסרוק (למשל 20) */
  maxSymbolsToScan?: number;

  /** האם לסרוק רק על נרות סגורים (מומלץ לתבניות Price Action) */
  requireClosedCandle?: boolean;

  /**
   * אנטי־ספאם: כמה מילי־שניות לפחות בין טריגר לטריגר
   * לאותה מניה ולאותה אסטרטגיה.
   * למשל 1500–3000ms.
   */
  debounceMs?: number;

  /**
   * האם לסנן אסטרטגיות לפי כיוון הדירקטשן מהמאסטר.
   * אם true:
   *  - מניה עם direction="LONG" → ירוצו רק אסטרטגיות LONG/BOTH
   *  - מניה עם direction="SHORT" → ירוצו רק אסטרטגיות SHORT/BOTH
   */
  enableDirectionFilter?: boolean;

  /** מצב פעולה: realtime (ברירת מחדל) או backtest */
  mode?: "realtime" | "backtest";
}

// ============ 5) מחלקת סורק המסחר ============

export class TradePatternScanner {
  // map עבור אנטי־ספאם: "AAPL-DOUBLE_TOP" → timestamp
  private lastDetection: Record<string, number> = {};

  // Dynamic universe management: track active subscriptions
  private activeSubscriptions = new Map<string, () => void>();
  private subscribedSymbols = new Set<string>();

  constructor(
    private masterClient: MasterScoringClient,
    private dataClient: RealTimeDataClient,
    private strategies: IPatternStrategy[],
    private config: TradePatternScannerConfig,
    private onPatternFound: OnPatternFoundHandler,
    private logger?: ScannerLogger
  ) {}

  private logInfo(msg: string, meta?: any) {
    this.logger?.info?.(msg, meta);
  }

  private logWarn(msg: string, meta?: any) {
    this.logger?.warn?.(msg, meta);
  }

  private logError(msg: string, meta?: any) {
    this.logger?.error?.(msg, meta);
  }

  /**
   * בדיקת אנטי־ספאם: האם מותר להוציא טריגר חדש עכשיו
   * לאותה מניה ולאותה אסטרטגיה.
   */
  private shouldEmit(symbol: string, strategyName: string): boolean {
    const key = `${symbol}::${strategyName}`;
    const now = Date.now();
    const debounceMs = this.config.debounceMs ?? 2000; // ברירת מחדל: 2 שניות

    const last = this.lastDetection[key];
    if (last == null || now - last > debounceMs) {
      this.lastDetection[key] = now;
      return true;
    }
    return false;
  }

  /**
   * האם אסטרטגיה מתאימה לכיוון שהמאסטר קבע.
   * אם enableDirectionFilter=false → תמיד true.
   */
  private isStrategyAllowedForSymbol(
    symbolInfo: MasterSymbolInfo,
    strategy: IPatternStrategy
  ): boolean {
    if (!this.config.enableDirectionFilter) return true;

    if (strategy.direction === "BOTH") return true;
    if (symbolInfo.direction === "LONG" && strategy.direction === "LONG")
      return true;
    if (symbolInfo.direction === "SHORT" && strategy.direction === "SHORT")
      return true;

    this.logInfo("[TradePatternScanner] strategy filtered by direction", {
      symbol: symbolInfo.symbol,
      masterDirection: symbolInfo.direction,
      strategy: strategy.name,
      strategyDirection: strategy.direction,
    });

    return false;
  }

  /**
   * בדיקה אם יש לנו נר סגור אחרון (אם המשתמש דרש requireClosedCandle).
   * מניח של־Candle יכול להיות שדה isClosed:boolean (אם אין – אפשר להתאים).
   */
  private hasClosedLastCandle(candles: Candle[]): boolean {
    if (!candles || !Array.isArray(candles) || candles.length === 0) {
      return false;
    }
    const last = candles[candles.length - 1] as any;
    
    // Validate candle structure
    if (!last || typeof last !== "object") {
      return false;
    }
    
    // אם אין isClosed, נחזיר true כדי לא לחסום
    if (typeof last.isClosed === "boolean") {
      return last.isClosed;
    }
    return true;
  }

  /**
   * Validates candle array structure
   */
  private validateCandles(candles: Candle[]): boolean {
    if (!candles || !Array.isArray(candles) || candles.length === 0) {
      return false;
    }
    
    for (const candle of candles) {
      if (!candle || typeof candle !== "object") return false;
      
      // Check required fields
      const required = ["time", "open", "high", "low", "close", "volume"];
      for (const field of required) {
        if (!(field in candle)) return false;
        if (typeof candle[field as keyof Candle] !== "number") return false;
        if (!isFinite(candle[field as keyof Candle] as number)) return false;
      }
      
      // Validate OHLC logic
      if (candle.high < candle.low) return false;
      if (candle.close > candle.high || candle.close < candle.low) return false;
      if (candle.open > candle.high || candle.open < candle.low) return false;
      if (candle.volume < 0) return false;
    }
    
    return true;
  }

  /**
   * נקודת הפעלה ראשית של הסורק.
   * 1. לוקח מהמייסטר את המניות עם הציון הכי גבוה
   * 2. נרשם לעדכוני נתונים בזמן אמת לכל מניה
   * 3. על כל עדכון – מריץ זיהוי תבנית
   */
  async start(): Promise<void> {
    try {
      const all = await this.masterClient.getTopSymbols(
        this.config.minMasterScore
      );

      if (!all || all.length === 0) {
        this.logInfo(
          "[TradePatternScanner] no symbols passed the minMasterScore threshold",
          { minScore: this.config.minMasterScore }
        );
        return;
      }

      const max = this.config.maxSymbolsToScan ?? all.length;
      const symbolsToScan = all.slice(0, max);

      this.logInfo("[TradePatternScanner] starting scanner", {
        totalCandidates: all.length,
        scanning: symbolsToScan.length,
        minScore: this.config.minMasterScore,
      });

      // Update dynamic universe
      await this.updateSymbolUniverse(symbolsToScan);
    } catch (err) {
      this.logError("[TradePatternScanner] start() failed", { error: err });
      throw err;
    }
  }

  /**
   * Update symbol universe dynamically
   * - Unsubscribes from symbols that left TOP N
   * - Subscribes to new symbols that entered TOP N
   * Called whenever Master Scoring updates the TOP N list
   */
  async updateSymbolUniverse(newTopN: MasterSymbolInfo[]): Promise<void> {
    const currentSymbols = new Set(this.subscribedSymbols);
    const newSymbols = new Set(newTopN.map((s) => s.symbol));

    // Unsubscribe from symbols that left TOP N
    for (const symbol of currentSymbols) {
      if (!newSymbols.has(symbol)) {
        this.unsubscribeSymbol(symbol);
        this.logInfo("[TradePatternScanner] Unsubscribed from symbol (left TOP N)", {
          symbol,
        });
      }
    }

    // Subscribe to new symbols that entered TOP N
    for (const info of newTopN) {
      if (!currentSymbols.has(info.symbol)) {
        if (!this.validateSymbolInfo(info)) {
          this.logWarn(
            "[TradePatternScanner] Invalid symbol info, skipping",
            {
              symbol: info?.symbol,
              info,
            }
          );
          continue;
        }
        this.subscribeSymbol(info);
        this.logInfo("[TradePatternScanner] Subscribed to symbol (entered TOP N)", {
          symbol: info.symbol,
          masterScore: info.masterScore,
          direction: info.direction,
        });
      }
    }
  }

  /**
   * Unsubscribe from a symbol and cleanup
   */
  private unsubscribeSymbol(symbol: string): void {
    const unsubscribe = this.activeSubscriptions.get(symbol);
    if (unsubscribe) {
      unsubscribe();
      this.activeSubscriptions.delete(symbol);
    }
    this.subscribedSymbols.delete(symbol);

    // Clean debounce map for this symbol
    for (const key of Object.keys(this.lastDetection)) {
      if (key.startsWith(`${symbol}::`)) {
        delete this.lastDetection[key];
      }
    }
  }

  /**
   * Stop scanner and cleanup all subscriptions
   */
  stop(): void {
    this.logInfo("[TradePatternScanner] Stopping scanner, cleaning up subscriptions");

    // Unsubscribe from all symbols
    for (const symbol of Array.from(this.subscribedSymbols)) {
      this.unsubscribeSymbol(symbol);
    }

    // Clear debounce map
    this.lastDetection = {};
    this.subscribedSymbols.clear();
    this.activeSubscriptions.clear();

    this.logInfo("[TradePatternScanner] Scanner stopped");
  }

  /**
   * Validates MasterSymbolInfo structure before processing
   */
  private validateSymbolInfo(info: MasterSymbolInfo): boolean {
    if (!info || typeof info !== "object") return false;
    if (!info.symbol || typeof info.symbol !== "string" || info.symbol.trim() === "") {
      return false;
    }
    if (!["LONG", "SHORT"].includes(info.direction)) {
      return false;
    }
    if (typeof info.masterScore !== "number" || !isFinite(info.masterScore)) {
      return false;
    }
    if (!info.moduleScores || typeof info.moduleScores !== "object") {
      return false;
    }
    return true;
  }

  /**
   * רישום לנתונים בזמן אמת למניה אחת, והרצת זיהוי תבניות על כל עדכון.
   */
  private subscribeSymbol(info: MasterSymbolInfo): void {
    const { symbol } = info;

    // Don't subscribe if already subscribed
    if (this.subscribedSymbols.has(symbol)) {
      return;
    }

    this.logInfo("[TradePatternScanner] subscribing to symbol", {
      symbol,
      masterDirection: info.direction,
      masterScore: info.masterScore,
    });

    // Subscribe and store unsubscribe function
    const unsubscribe = this.dataClient.subscribeCandles(symbol, (candles, indicators) => {
      // Validate candles structure
      if (!this.validateCandles(candles)) {
        this.logWarn("[TradePatternScanner] Invalid candles received", {
          symbol,
          candlesLength: candles?.length,
        });
        return;
      }

      // אם המשתמש דרש נרות סגורים – נוודא שהנר האחרון סגור
      if (
        this.config.requireClosedCandle &&
        !this.hasClosedLastCandle(candles)
      ) {
        return;
      }

      // מעבר על כל האסטרטגיות – על חלק "זיהוי התבנית"
      for (const strat of this.strategies) {
        // אם הכיוון של האסטרטגיה לא מתאים לכיוון שהמאסטר קבע – מדלגים
        if (!this.isStrategyAllowedForSymbol(info, strat)) {
          continue;
        }

          // Set context for strategies that need master info (e.g., LiquiditySweepBreakout)
          if ("setContextForSymbol" in strat && typeof strat.setContextForSymbol === "function") {
            (strat as any).setContextForSymbol(symbol, info, (this.config as any).timeframe || "5m");
          }

        let patternState: PatternDetectionResult;

        try {
          patternState = strat.detectPattern(candles, indicators);
        } catch (err) {
          this.logError("[TradePatternScanner] detectPattern() error", {
            symbol,
            strategy: strat.name,
            error: err,
          });
          continue;
        }

        if (!patternState?.patternFound) {
          continue; // אין תבנית → ממשיכים הלאה
        }

        if (!this.shouldEmit(symbol, strat.name)) {
          // טריגר נוסף הגיע מהר מדי – אנטי־ספאם
          continue;
        }

        const event: PatternFoundEvent = {
          symbol,
          strategyName: strat.name,
          strategyDirection: strat.direction,
          patternState: {
            ...patternState,

            // הוספות חשובות למנוע הביצוע:

            entryPrice: patternState.entryPrice ?? undefined,
            stopLoss: patternState.stopLoss ?? undefined,

            metadata: {
              secondPeakHigh: patternState.secondPeakHigh,
              firstPeakIdx: patternState.firstPeakIdx,
              secondPeakIdx: patternState.secondPeakIdx,
              troughIdx: patternState.troughIdx,
              neckline: patternState.neckline,
              confirmCount: patternState.confirmCount,
              earlyHeadsUp: patternState.earlyHeadsUp,
            },
          },

          master: info,
          detectedAt: new Date().toISOString(),
        };

        this.logInfo("[TradePatternScanner] pattern detected", {
          symbol,
          strategy: strat.name,
          strategyDirection: strat.direction,
          masterDirection: info.direction,
          masterScore: info.masterScore,
        });

        // Pass event along with candles and indicators to execution engine
        this.onPatternFound(event, candles, indicators);
      }
    });

    // Store subscription and mark as subscribed
    this.activeSubscriptions.set(symbol, unsubscribe);
    this.subscribedSymbols.add(symbol);
  }

  /**
   * BACKTEST / EOD SIMULATION MODE
   *
   * Runs pattern detection on historical candle data WITHOUT using realtime subscriptions.
   * This method:
   * - does NOT use debounce
   * - does NOT use direction filtering
   * - does NOT require closed candles
   * - does NOT use minMasterScore filtering
   * - does NOT use subscribeCandles()
   *
   * Returns all detected events for a given symbol.
   */
  async scanHistorical(
    symbol: string,
    candles: Candle[],
    indicators?: IndicatorSnapshot,
    masterOverride?: Partial<MasterSymbolInfo>
  ): Promise<PatternFoundEvent[]> {
    // Validate inputs
    if (!symbol || typeof symbol !== "string" || symbol.trim() === "") {
      this.logWarn("[TradePatternScanner.scanHistorical] Invalid symbol", { symbol });
      return [];
    }

    if (!this.validateCandles(candles)) {
      this.logWarn("[TradePatternScanner.scanHistorical] Invalid candles", {
        symbol,
        candlesLength: candles?.length,
      });
      return [];
    }

    const events: PatternFoundEvent[] = [];

    const master: MasterSymbolInfo = {
      symbol,
      direction: masterOverride?.direction ?? "LONG",
      masterScore: masterOverride?.masterScore ?? 0,
      moduleScores: masterOverride?.moduleScores ?? {},
    };

    // Validate master info
    if (!this.validateSymbolInfo(master)) {
      this.logWarn("[TradePatternScanner.scanHistorical] Invalid master info", { symbol, master });
      return [];
    }

    for (const strat of this.strategies) {
      let patternState: PatternDetectionResult;

      try {
        patternState = strat.detectPattern(candles, indicators);
      } catch (err) {
        this.logError("[TradePatternScanner.scanHistorical] detectPattern() error", {
          symbol,
          strategy: strat.name,
          error: err,
        });
        continue;
      }

      if (!patternState?.patternFound) continue;

      const event: PatternFoundEvent = {
        symbol,
        strategyName: strat.name,
        strategyDirection: strat.direction,
        patternState,
        master,
        detectedAt: new Date().toISOString(),
      };

      events.push(event);
    }

    return events;
  }

  /**
   * Runs backtest on multiple symbols.
   * Useful for full-day performance evaluation.
   */
  async scanHistoricalBatch(
    batch: {
      symbol: string;
      candles: Candle[];
      indicators?: IndicatorSnapshot;
    }[],
    masterOverrides?: Record<string, Partial<MasterSymbolInfo>>
  ): Promise<PatternFoundEvent[]> {
    // Validate batch input
    if (!batch || !Array.isArray(batch) || batch.length === 0) {
      this.logWarn("[TradePatternScanner.scanHistoricalBatch] Invalid batch", {
        batchLength: batch?.length,
      });
      return [];
    }

    const results: PatternFoundEvent[] = [];

    for (const item of batch) {
      try {
        // Validate batch item
        if (!item || !item.symbol || !item.candles) {
          this.logWarn("[TradePatternScanner.scanHistoricalBatch] Invalid batch item", {
            item,
          });
          continue;
        }

        const master = masterOverrides?.[item.symbol];
        const r = await this.scanHistorical(
          item.symbol,
          item.candles,
          item.indicators,
          master
        );
        results.push(...r);
      } catch (error) {
        this.logError("[TradePatternScanner.scanHistoricalBatch] Error processing item", {
          symbol: item?.symbol,
          error: error instanceof Error ? error.message : String(error),
        });
        // Continue with next item instead of failing entire batch
        continue;
      }
    }

    return results;
  }
}

