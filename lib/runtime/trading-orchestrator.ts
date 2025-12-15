// lib/runtime/trading-orchestrator.ts

// אורקסטרטור: מחבר בין המאסטר סקורינג, סורק התבניות, מנוע הביצוע ו-IBKR.

// כאן אין לוגיקה "חכמה" חדשה – רק חיבור של כל החלקים יחד.

// ========= Imports =========

import {
  ExecutionEngine,
  type ExecutionEngineConfig,
  type ExecutionMode,
  type IBKRClient,
  type OrderExecutionResult,
} from "../execution/execution-engine";
import {
  type IndicatorSnapshot,
  type IPatternStrategy,
  type MasterScoringClient,
  type MasterSymbolInfo,
  type PatternFoundEvent,
  type RealTimeDataClient,
  type ScannerLogger,
  TradePatternScanner,
  type TradePatternScannerConfig,
} from "../scanner/trade-pattern-scanner";
import {
  type Candle,
  type DoubleTopConfig,
  DoubleTopPatternStrategy,
  DoubleTopStrategy,
} from "../strategies/double-top";
import {
  LiquiditySweepBreakoutPatternStrategy,
  LiquiditySweepBreakoutStrategy,
} from "../strategies/liquidity-sweep-breakout";

// ========= מימושי ברירת מחדל (דאמיים / שלד למימוש אמיתי) =========

// 1) MasterScoringClient – איך המערכת ב־TS מקבלת את רשימת המניות עם ניקוד גבוה

// כרגע זה שלד בלבד, אתה תממש קריאה אמיתית ל־Python / API שלך.

class HttpMasterScoringClient implements MasterScoringClient {
  constructor(private endpoint: string) {}

  async getTopSymbols(minScore: number): Promise<MasterSymbolInfo[]> {
    try {
      const endpoint = this.endpoint.replace(/\/$/, "");
      const url = `${endpoint}/top-symbols?minScore=${encodeURIComponent(minScore)}`;

      const res = await fetch(url, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        console.error("[HttpMasterScoringClient] Failed to fetch top symbols", {
          status: res.status,
          statusText: res.statusText,
        });
        return [];
      }

      const data = await res.json();

      const rawSymbols: any[] = Array.isArray(data) ? data : (data.symbols ?? []);

      const symbols: MasterSymbolInfo[] = rawSymbols
        .map((item) => ({
          symbol: String(item.symbol),
          direction: item.direction === "SHORT" ? "SHORT" : "LONG",
          masterScore: Number(item.masterScore ?? 0),
          moduleScores: item.moduleScores ?? {},
        }))
        .filter((s) => s.masterScore >= minScore);

      return symbols;
    } catch (err) {
      console.error("[HttpMasterScoringClient] Error in getTopSymbols()", err);
      return [];
    }
  }
}

// 2) RealTimeDataClient – חיבור לנתונים בזמן אמת (Candle + אינדיקטורים)
// Phase 6: Uses MarketDataHub as the single source of truth

import type { IntradayBar } from "@/lib/server/market-data";
import { getMarketDataHub } from "@/lib/server/market-data";

class IbkrRealTimeDataClient implements RealTimeDataClient {
  private hub = getMarketDataHub();
  private unsubscribeHandlers = new Map<string, () => void>();

  subscribeCandles(
    symbol: string,
    onUpdate: (candles: Candle[], indicators: IndicatorSnapshot) => void
  ): () => void {
    const symbolKey = symbol.toUpperCase();
    const key = `${symbolKey}`;

    // Clean up any existing subscription
    const existingUnsubscribe = this.unsubscribeHandlers.get(key);
    if (existingUnsubscribe) {
      existingUnsubscribe();
    }

    console.log(
      `[IbkrRealTimeDataClient] Subscribing to candles for ${symbolKey} via MarketDataHub`
    );

    // Convert IntradayBar[] to Candle[] format
    const convertBarsToCandles = (bars: IntradayBar[]): Candle[] => {
      return bars.map((bar) => ({
        time: new Date(bar.startTs).toISOString(),
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
        volume: bar.volume,
      }));
    };

    // Calculate indicators from candles using the centralized library
    const calculateIndicators = (candles: Candle[]): IndicatorSnapshot => {
      if (!candles || candles.length === 0) return {};

      // Import indicators dynamically to avoid circular dependencies
      const Indicators = require("@/lib/indicators").default;

      try {
        const result = Indicators.CalculateAllIndicators(candles);

        if (!result) return {};

        // Return flat indicator snapshot for easy access
        return {
          // Moving Averages
          sma9: result.sma9,
          sma20: result.sma20,
          sma50: result.sma50,
          sma200: result.sma200,
          ema9: result.ema9,
          ema20: result.ema20,
          ema50: result.ema50,

          // Momentum
          rsi14: result.rsi14,
          macd: result.macd?.macd,
          macdSignal: result.macd?.signal,
          macdHistogram: result.macd?.histogram,
          stochasticK: result.stochastic?.k,
          stochasticD: result.stochastic?.d,

          // Volatility
          atr14: result.atr14,
          bbUpper: result.bb?.upper,
          bbMiddle: result.bb?.middle,
          bbLower: result.bb?.lower,

          // Volume
          vwap: result.vwap,
          avgVolume20: result.avgVolume20,

          // Utility
          highest20: result.highest20,
          lowest20: result.lowest20,
        };
      } catch (error) {
        console.error(
          `[IbkrRealTimeDataClient] Failed to calculate indicators for ${symbolKey}:`,
          error
        );
        return {};
      }
    };

    // Initial load: Get current bars (1m timeframe for strategy use)
    const initialBars = this.hub.getBars(symbolKey, "1m");
    if (initialBars.length > 0) {
      const candles = convertBarsToCandles(initialBars);
      const indicators = calculateIndicators(candles);
      onUpdate(candles, indicators);
    }

    // Subscribe to bar-close events for this symbol (1m timeframe)
    const unsubscribe = this.hub.onBarClose(symbolKey, "1m", (bar: IntradayBar) => {
      // Get all bars up to now (including the newly closed bar)
      const allBars = this.hub.getBars(symbolKey, "1m");
      const candles = convertBarsToCandles(allBars);
      const indicators = calculateIndicators(candles);
      onUpdate(candles, indicators);
    });

    // Store unsubscribe handler
    this.unsubscribeHandlers.set(key, unsubscribe);

    // Return unsubscribe function
    return () => {
      unsubscribe();
      this.unsubscribeHandlers.delete(key);
      console.log(`[IbkrRealTimeDataClient] Unsubscribed from ${symbolKey}`);
    };
  }
}

// 3) IBKRClient – ביצוע פקודות מרקט דרך IBKR

// כאן אתה תממש שימוש אמיתי ב־API של IBKR.

class SimpleIbkrClient implements IBKRClient {
  private connected = true;
  private lastConnectedAt = new Date().toISOString();
  private lastError: string | undefined;

  async placeMarketOrder(
    symbol: string,
    quantity: number,
    side: "BUY" | "SELL"
  ): Promise<OrderExecutionResult> {
    // TODO: לממש קריאה אמיתית ל־IB API (placeOrder)

    // Simulate connection check
    if (!this.connected) {
      throw new Error("IBKR client not connected");
    }

    console.log(
      "[SimpleIbkrClient] placeMarketOrder:",
      { symbol, quantity, side },
      "(TODO: implement real order send)"
    );

    // Demo: מחזיר תוצאה מדומה
    return {
      orderId: `DEMO-${Date.now()}`,
      avgFillPrice: 100, // TODO: מחיר אמיתי מה-API
      filledQuantity: quantity,
    };
  }

  isConnected(): boolean {
    return this.connected;
  }

  async reconnect(): Promise<void> {
    // TODO: Implement actual reconnection logic
    console.log("[SimpleIbkrClient] Reconnecting...");
    this.connected = true;
    this.lastConnectedAt = new Date().toISOString();
    this.lastError = undefined;
  }

  getConnectionStatus() {
    return {
      connected: this.connected,
      lastConnectedAt: this.lastConnectedAt,
      lastError: this.lastError,
    };
  }
}

// 4) Logger בסיסי לסורק

class ConsoleScannerLogger implements ScannerLogger {
  info(message: string, meta?: any): void {
    console.log("[Scanner][INFO]", message, meta ?? "");
  }

  warn(message: string, meta?: any): void {
    console.warn("[Scanner][WARN]", message, meta ?? "");
  }

  error(message: string, meta?: any): void {
    console.error("[Scanner][ERROR]", message, meta ?? "");
  }
}

// ========= קונפיגים לדוגמה (אתה יכול לשנות חופשי) =========

function createDefaultDoubleTopConfig(): DoubleTopConfig {
  return {
    // זיהוי
    minDropPct: 2.0,
    maxDropPct: 12.0,
    minBarsBetweenPeaks: 8,
    peakDiffAbsPct: 1.0,
    volumeDowntrendBetweenPeaks: true,
    patternConfirmRedBars: 2,

    // התראה מוקדמת
    earlyHeadsUpEnabled: true,
    earlyHeadsUpRiseBars: 2,

    // כניסה ראשונה
    entry1ConfirmBars: 2,
    entry1UsesSameConfirmation: true,

    // יציאה ראשונה (ווליום חריג)
    abnormalVolMultiplier: 2.0,
    abnormalVolWindowMode: "fromFirstRed",
    abnormalVolFixedWindow: 10,

    // כניסה שניה
    entry2Enabled: false,
    entry2ConfirmBelowMA: 2,
    maKind: "sma",
    maWindows: [9, 20, 50],

    // יציאה שניה
    exit2OnTouchMA: false,

    // סטופים
    stop1_initial_atSecondPeakHigh: true,
    stop1_trailing_byResistances: true,
    stop2_initial_atFailedMAHigh: true,
    stop2_trailing_byResistances: true,
  };
}

function createDefaultScannerConfig(): TradePatternScannerConfig {
  return {
    minMasterScore: 6.0,
    maxSymbolsToScan: 20,
    requireClosedCandle: true,
    debounceMs: 2000,
    enableDirectionFilter: true,
  };
}

function createDefaultExecutionConfig(): ExecutionEngineConfig {
  return {
    totalAccountValue: 10000, // למשל 10,000$
    maxExposurePct: 95, // 95% מהחשבון מותר למסחר
    maxConcurrentTrades: 2, // עד 2 עסקאות במקביל
    riskPerTradePct: 1, // 1% מהחשבון סיכון לטרייד אחד (Risk per Trade)

    mode: "DEMO" satisfies ExecutionMode,

    latestEntryTime: "16:25", // אחרי זה לא פותחים עסקאות חדשות
    forceExitTime: "16:28", // אחרי זה סוגרים הכל

    relocationThresholdR: 2, // אם טרייד קיים נמצא מעל 2R אפשר להחליפו בטרייד חדש

    // Risk Limits (Optional - uncomment to enable)
    // dailyLossLimit: 500,        // מקסימום 500$ הפסד יומי
    // maxDrawdownPct: 10,         // מקסימום 10% drawdown מהשיא
    // maxPositionSizePerSymbol: 5000, // מקסימום 5,000$ למניה אחת

    // Circuit Breaker (Optional - uncomment to enable)
    // circuitBreakerEnabled: true,
    // circuitBreakerFailureThreshold: 5,  // 5 כשלונות רצופים
    // circuitBreakerCooldownMs: 60_000,  // 1 דקה cooldown
  };
}

// ========= פונקציית אתחול — מחברת הכל יחד =========

export function createTradingSystem() {
  // 1) יצירת לקוחות (Clients)
  const masterScoringEndpoint = process.env.MASTER_SCORING_ENDPOINT ?? "http://localhost:8000";

  const masterClient = new HttpMasterScoringClient(masterScoringEndpoint);
  const dataClient = new IbkrRealTimeDataClient();
  const ibkrClient = new SimpleIbkrClient();
  const logger = new ConsoleScannerLogger();

  // 2) יצירת אסטרטגיות
  const doubleTopCfg = createDefaultDoubleTopConfig();
  const doubleTopImpl = new DoubleTopStrategy(doubleTopCfg);
  const doubleTopStrategy = new DoubleTopPatternStrategy(doubleTopImpl);

  // Liquidity Sweep Breakout Strategy
  const liquiditySweepBreakoutImpl = new LiquiditySweepBreakoutStrategy();
  const liquiditySweepBreakoutStrategy = new LiquiditySweepBreakoutPatternStrategy(
    liquiditySweepBreakoutImpl
  );

  const strategies: IPatternStrategy[] = [
    doubleTopStrategy,
    liquiditySweepBreakoutStrategy,
    // כאן בהמשך תוסיף אסטרטגיות נוספות:
    // new GapUpPatternStrategy(...),
    // new DoubleBottomPatternStrategy(...),
  ];

  // 3) מפת אסטרטגיות לפי שם — למנוע הביצוע
  const strategyMap = new Map<string, IPatternStrategy>();
  for (const s of strategies) {
    strategyMap.set(s.name, s);
  }

  // 4) יצירת Strategy Orchestrator
  const orchestrator = new StrategyOrchestrator();

  // 5) קונפיגים
  const scannerConfig = createDefaultScannerConfig();
  const executionConfig = createDefaultExecutionConfig();

  // 6) יצירת מנוע ביצוע (עם orchestrator)
  const execEngine = new ExecutionEngine(executionConfig, ibkrClient, strategyMap, orchestrator);

  // 7) יצירת סורק תבניות
  const scanner = new TradePatternScanner(
    masterClient,
    dataClient,
    strategies,
    scannerConfig,
    // callback – מה קורה כשזוהתה תבנית
    // Scanner now passes candles and indicators directly
    (event: PatternFoundEvent, candles: Candle[], indicators?: IndicatorSnapshot) => {
      execEngine
        .onPatternEvent(event, candles, indicators)
        .catch((err) => console.error("[ExecutionEngine] onPatternEvent error:", err));
    },
    logger
  );

  // 7) פונקציות עזר לניהול המערכת מבחוץ
  let forceExitIntervalId: NodeJS.Timeout | null = null;

  async function start() {
    try {
      console.log("[TradingSystem] starting scanner...");
      await scanner.start();
      console.log("[TradingSystem] scanner started");

      // טיימר לסגירה כפויה בסוף היום (כל דקה)
      forceExitIntervalId = setInterval(async () => {
        try {
          await execEngine.forceExitAllIfTime();
        } catch (error) {
          console.error("[TradingSystem] Force exit failed", error);
        }
      }, 60_000);
    } catch (error) {
      console.error("[TradingSystem] Failed to start", error);
      throw error;
    }
  }

  function stop() {
    if (forceExitIntervalId) {
      clearInterval(forceExitIntervalId);
      forceExitIntervalId = null;
      console.log("[TradingSystem] Force exit timer cleared");
    }
    // Stop scanner and cleanup subscriptions
    scanner.stop();
    console.log("[TradingSystem] Scanner stopped and subscriptions cleaned up");
  }

  function getOpenPositions() {
    return execEngine.getOpenPositions();
  }

  function getTradeHistory() {
    return execEngine.getClosedTrades();
  }

  return {
    start,
    stop,
    getOpenPositions,
    getTradeHistory,
    execEngine,
    scanner,
  };
}

// ========= דוגמת שימוש (אופציונלית) =========

// אם זה קובץ שמורץ ישירות (Node), אפשר להפעיל:
//
// (async () => {
//   const system = createTradingSystem();
//   await system.start();
// })();
//
// אם זה פרויקט Next.js / Node אחר – תייבא את createTradingSystem
// ותפעיל אותו מתוך server-side / worker / process נפרד.
