// lib/execution/execution-engine.ts

// מנוע ביצוע מתקדם:

// - ניהול פוזיציות מלא

// - LIVE / DEMO / BACKTEST

// - חישוב סיכון לפי R (Risk per trade)

// - מגבלת אחוז חשיפה מהחשבון + מספר עסקאות במקביל

// - מגבלת זמן כניסה + סגירה כפויה בסוף היום

// - מקום לרילוקציה (החלפת עסקה קיימת בעסקה חדשה)

//

// שים לב: המימוש הזה לא נוגע בלוגיקת האסטרטגיות,

// אלא רק משתמש בנתונים שמגיעים מה-PatternFoundEvent.

import {
  PatternFoundEvent,
  IndicatorSnapshot,
  MasterSymbolInfo,
  IPatternStrategy,
} from "../scanner/trade-pattern-scanner";
import { Candle } from "../strategies/double-top";

export type ExecutionMode = "LIVE" | "DEMO" | "BACKTEST";
export type TradeDirection = "LONG" | "SHORT";

export type ExitReason =
  | "stop-loss"
  | "strategy-exit"
  | "relocation"
  | "force-close-end-of-day"
  | "manual";

// תוצאה של שליחת פקודת מרקט לברוקר
export interface OrderExecutionResult {
  orderId?: string;
  avgFillPrice: number;
  filledQuantity: number;
}

// Order status tracking
export type OrderStatus = "PENDING" | "FILLED" | "PARTIALLY_FILLED" | "REJECTED" | "CANCELLED";

export interface OrderStatusInfo {
  orderId: string;
  symbol: string;
  side: "BUY" | "SELL";
  quantity: number;
  filledQuantity: number;
  status: OrderStatus;
  avgFillPrice?: number;
  createdAt: string;
  updatedAt: string;
  error?: string;
}

// ממשק כללי ללקוח IBKR (או ברוקר אחר בעתיד)
export interface IBKRClient {
  placeMarketOrder(
    symbol: string,
    quantity: number,
    side: "BUY" | "SELL"
  ): Promise<OrderExecutionResult>;
}

// קונפיג למנוע הביצוע
export interface ExecutionEngineConfig {
  // גודל חשבון (כולל)
  totalAccountValue: number; // למשל 10,000$

  // אחוז מהחשבון שמותר למסחר (שארית תשאר לאלגוריתם / ביטחון)
  maxExposurePct: number; // למשל 95%

  // כמה עסקאות מותר להחזיק במקביל
  maxConcurrentTrades: number; // למשל 1, 2, 3...

  // כמה אחוז מהחשבון מסכנים בטרייד אחד (Risk per Trade)
  riskPerTradePct: number; // למשל 1% מהחשבון

  // מצב הרצה
  mode: ExecutionMode;

  // זמן אחרון לכניסה לעסקאות (בשעות:דקות "HH:MM" – זמן הבורסה)
  latestEntryTime: string;

  // זמן שבו כל העסקאות נסגרות בכפיה
  forceExitTime: string;

  // רילוקציה: אם טרייד קיים נמצא מעל X R אפשר להחליפו בטרייד חדש
  relocationThresholdR: number; // למשל 2R

  // Risk Limits (Optional - for additional protection)
  dailyLossLimit?: number; // מקסימום הפסד יומי בדולרים (למשל 500$)
  maxDrawdownPct?: number; // מקסימום drawdown מאז השיא באחוזים (למשל 10%)
  maxPositionSizePerSymbol?: number; // מקסימום חשיפה למניה אחת בדולרים (למשל 5,000$)

  // Circuit Breaker (Optional)
  circuitBreakerEnabled?: boolean; // האם להפעיל circuit breaker
  circuitBreakerFailureThreshold?: number; // כמה כשלונות רצופים לפני עצירה (למשל 5)
  circuitBreakerCooldownMs?: number; // כמה זמן לחכות לפני ניסיון מחדש (למשל 60,000ms = 1 דקה)
}

// הגדרת סטאפ של טרייד – מה שהמנוע "מתכנן" לפי הסיגנל
export interface TradeSetup {
  symbol: string;
  strategyName: string;
  direction: TradeDirection;

  entryPrice: number;
  stopLoss: number;

  // סיכון ליחידה (Entry - Stop)
  riskPerShare: number;

  // כמה דולר סיכון מעוניינים לקחת
  riskDollars: number;

  // כמות מניות
  quantity: number;

  // מידע נוסף מהאסטרטגיה ומהמאסטר
  masterScore: number;
  masterDirection: TradeDirection;
  metadata: any;

  createdAt: string; // ISO
}

// פוזיציה פתוחה
export interface OpenPosition {
  symbol: string;
  strategyName: string;
  direction: TradeDirection;

  entryPrice: number;
  stopLoss: number;
  initialStopLoss: number;

  quantity: number;
  openedAt: string;

  // סיכון ליחידה / דולר
  riskPerShare: number;
  riskDollars: number;

  // מידע מהמאסטר
  masterScore: number;
  masterDirection: TradeDirection;

  // מעקב אחרי המחיר
  lastPrice: number;
  bestPrice: number; // המחיר הכי טוב שהיה (לצורך חישוב R וכו')

  // מטא־דאטה מהאסטרטגיה (neckline, peaks וכו')
  metadata: any;
}

// עסקה סגורה (היסטוריה)
export interface ClosedTrade {
  symbol: string;
  strategyName: string;
  direction: TradeDirection;

  entryPrice: number;
  exitPrice: number;
  quantity: number;

  riskPerShare: number;
  riskDollars: number;

  pnl: number;
  rMultiple: number;

  openedAt: string;
  closedAt: string;

  masterScore: number;
  masterDirection: TradeDirection;

  exitReason: ExitReason;
  metadata: any;
}

// =========================
// ExecutionEngine
// =========================

export class ExecutionEngine {
  private openPositions: OpenPosition[] = [];
  private closedTrades: ClosedTrade[] = [];
  private processingLock = false; // Simple lock for position modifications

  // Risk tracking
  private dailyPnL = 0;
  private dailyResetDate = new Date().toDateString();
  private accountPeak = 0; // Highest account value reached
  private consecutiveFailures = 0; // For circuit breaker
  private circuitBreakerOpen = false;
  private circuitBreakerOpenUntil: number | null = null; // Timestamp when circuit breaker closes

  constructor(
    private config: ExecutionEngineConfig,
    private ibkrClient: IBKRClient | null,
    private strategyMap: Map<string, IPatternStrategy> // לשימוש עתידי כשנרצה יציאות לפי אסטרטגיה
  ) {
    this.validateConfig();
    this.accountPeak = config.totalAccountValue; // Initialize peak to current value
  }

  /**
   * Executes a function with lock protection to prevent race conditions
   * on position array modifications.
   */
  private async withLock<T>(fn: () => Promise<T> | T): Promise<T> {
    // Wait for lock to be released
    while (this.processingLock) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    this.processingLock = true;
    try {
      const result = await fn();
      return result;
    } finally {
      this.processingLock = false;
    }
  }

  private validateConfig(): void {
    if (this.config.totalAccountValue <= 0) {
      throw new Error("ExecutionEngineConfig: totalAccountValue must be positive");
    }
    if (this.config.maxExposurePct <= 0 || this.config.maxExposurePct > 100) {
      throw new Error("ExecutionEngineConfig: maxExposurePct must be between 0 and 100");
    }
    if (this.config.maxConcurrentTrades <= 0) {
      throw new Error("ExecutionEngineConfig: maxConcurrentTrades must be positive");
    }
    if (this.config.riskPerTradePct <= 0 || this.config.riskPerTradePct > 100) {
      throw new Error("ExecutionEngineConfig: riskPerTradePct must be between 0 and 100");
    }
    if (!/^\d{2}:\d{2}$/.test(this.config.latestEntryTime)) {
      throw new Error("ExecutionEngineConfig: latestEntryTime must be in HH:MM format");
    }
    if (!/^\d{2}:\d{2}$/.test(this.config.forceExitTime)) {
      throw new Error("ExecutionEngineConfig: forceExitTime must be in HH:MM format");
    }
    if (this.config.relocationThresholdR < 0) {
      throw new Error("ExecutionEngineConfig: relocationThresholdR must be non-negative");
    }
    if (this.config.mode === "LIVE" && !this.ibkrClient) {
      throw new Error("ExecutionEngineConfig: LIVE mode requires IBKR client");
    }
    if (this.config.dailyLossLimit !== undefined && this.config.dailyLossLimit < 0) {
      throw new Error("ExecutionEngineConfig: dailyLossLimit must be non-negative");
    }
    if (this.config.maxDrawdownPct !== undefined && (this.config.maxDrawdownPct < 0 || this.config.maxDrawdownPct > 100)) {
      throw new Error("ExecutionEngineConfig: maxDrawdownPct must be between 0 and 100");
    }
    if (this.config.maxPositionSizePerSymbol !== undefined && this.config.maxPositionSizePerSymbol <= 0) {
      throw new Error("ExecutionEngineConfig: maxPositionSizePerSymbol must be positive");
    }
    if (this.config.circuitBreakerEnabled && this.config.circuitBreakerFailureThreshold !== undefined) {
      if (this.config.circuitBreakerFailureThreshold <= 0) {
        throw new Error("ExecutionEngineConfig: circuitBreakerFailureThreshold must be positive");
      }
    }
  }

  // -------------------------------------------------
  // 1) נקודת כניסה ראשית – סיגנל מהסורק
  // -------------------------------------------------
  async onPatternEvent(event: PatternFoundEvent): Promise<void> {
    // Wrap in try-catch for error handling
    try {
      return await this.withLock(async () => {
        // 0. Check circuit breaker
        if (this.isCircuitBreakerOpen()) {
          return;
        }

        // 0.1. Reset daily PnL if new day
        this.resetDailyPnLIfNeeded();

        // 0.2. Check risk limits
        if (!this.checkRiskLimits()) {
          return;
        }

        const nowHHMM = this.getTimeHHMM();

        // 1. לא פותחים עסקאות חדשות אחרי זמן הכניסה האחרון
        if (nowHHMM > this.config.latestEntryTime) {
          return;
        }

        // 2. אם כבר יש פוזיציה על הסימול הזה – כרגע לא מוסיפים עוד אחת
        if (this.findPositionBySymbol(event.symbol)) {
          return;
        }

        // 3. נוודא שיש לנו מחיר כניסה וסטופ מהאסטרטגיה
        const entryPrice = event.patternState.entryPrice;
        const stopLoss = event.patternState.stopLoss;

        // Validate entry price and stop loss exist
        if (entryPrice == null || stopLoss == null) {
          // בלי Entry ו-Stop אי אפשר לנהל סיכון → מדלגים
          return;
        }

        // Validate entry price is valid number
        if (!isFinite(entryPrice) || entryPrice <= 0) {
          console.warn("[ExecutionEngine] Invalid entryPrice in pattern event", {
            symbol: event.symbol,
            entryPrice,
          });
          return;
        }

        // Validate stop loss is valid number
        if (!isFinite(stopLoss) || stopLoss <= 0) {
          console.warn("[ExecutionEngine] Invalid stopLoss in pattern event", {
            symbol: event.symbol,
            stopLoss,
          });
          return;
        }

        // 4. דיירקשן טרייד
        const direction = this.resolveDirection(event);
        if (!direction) {
          return;
        }

        // Validate stop loss is in correct direction (above entry for SHORT, below for LONG)
        if (direction === "LONG" && stopLoss >= entryPrice) {
          console.warn("[ExecutionEngine] Invalid stop loss for LONG position", {
            symbol: event.symbol,
            entryPrice,
            stopLoss,
          });
          return;
        }
        if (direction === "SHORT" && stopLoss <= entryPrice) {
          console.warn("[ExecutionEngine] Invalid stop loss for SHORT position", {
            symbol: event.symbol,
            entryPrice,
            stopLoss,
          });
          return;
        }

        // 5. בניית TradeSetup (כולל חישוב סיכון ומיידע מהמאסטר)
        const setup = this.buildTradeSetupFromPattern(event, entryPrice, stopLoss, direction);

        // Validate setup
        if (setup.riskPerShare <= 0 || setup.quantity <= 0) {
          console.warn("[ExecutionEngine] Invalid setup calculated", {
            symbol: event.symbol,
            riskPerShare: setup.riskPerShare,
            quantity: setup.quantity,
          });
          return;
        }

        // Validate setup price values
        if (!isFinite(setup.entryPrice) || setup.entryPrice <= 0) {
          console.warn("[ExecutionEngine] Invalid entryPrice in setup", {
            symbol: event.symbol,
            entryPrice: setup.entryPrice,
          });
          return;
        }

        // Note: setup uses stopLoss, not stopPrice
        if (!isFinite(setup.stopLoss) || setup.stopLoss <= 0) {
          console.warn("[ExecutionEngine] Invalid stopLoss in setup", {
            symbol: event.symbol,
            stopLoss: setup.stopLoss,
          });
          return;
        }

        // 6. מגבלת עסקאות במקביל:
        if (this.openPositions.length >= this.config.maxConcurrentTrades) {
          const reallocated = this.tryRelocation(setup);
          if (!reallocated) {
            // לא סגרנו עסקה קיימת → אין מקום → מדלגים
            return;
          }
        }

        // 7. מגבלת חשיפה כוללת
        if (!this.canOpenNotional(setup)) {
          return;
        }

        // 7.1. Check position size limit per symbol
        if (this.config.maxPositionSizePerSymbol) {
          const notional = setup.quantity * setup.entryPrice;
          if (notional > this.config.maxPositionSizePerSymbol) {
            console.warn("[ExecutionEngine] Position size exceeds per-symbol limit", {
              symbol: event.symbol,
              notional,
              limit: this.config.maxPositionSizePerSymbol,
            });
            return;
          }
        }

        // 8. ביצוע פקודת מרקט (LIVE/DEMO/BACKTEST)
        const executed = await this.executeOrder(setup);

        if (!executed) {
          // Track failure for circuit breaker
          this.recordOrderFailure();
          return;
        }

        // Reset failure counter on success
        this.consecutiveFailures = 0;

        // 9. פתיחת פוזיציה בפועל
        this.openPositions.push(this.createOpenPosition(setup, executed.avgFillPrice));
      });
    } catch (error) {
      console.error("[ExecutionEngine] onPatternEvent failed", {
        symbol: event.symbol,
        strategy: event.strategyName,
        error: error instanceof Error ? error.message : String(error),
      });
      // Don't throw - fail gracefully
    }
  }

  // -------------------------------------------------
  // 2) פונקציה שמקבלת עדכוני שוק (מחיר אחרון)
  //    אפשר לקרוא לה מתוך זרימת הנתונים (candles) באורקסטרטור
  // -------------------------------------------------
  async onMarketPriceUpdate(symbol: string, lastPrice: number): Promise<void> {
    // Validate price - prevent NaN, Infinity, negative, or zero prices
    if (!isFinite(lastPrice) || lastPrice <= 0) {
      console.warn("[ExecutionEngine] Invalid price update ignored", {
        symbol,
        lastPrice,
      });
      return;
    }

    // Use lock for position updates
    await this.withLock(async () => {
      const pos = this.findPositionBySymbol(symbol);
      if (!pos) return;

      pos.lastPrice = lastPrice;

      // עידכון bestPrice לפי כיוון
      if (pos.direction === "LONG") {
        pos.bestPrice = Math.max(pos.bestPrice, lastPrice);
      } else {
        pos.bestPrice = Math.min(pos.bestPrice, lastPrice);
      }

      // Update trailing stop if profitable
      this.updateTrailingStop(pos);

      // לוגיקת סטופ לוס
      this.checkStopLossExit(pos);
    });
  }

  /**
   * Enhanced version that accepts candles for strategy-specific exit evaluation
   * This is a future enhancement - for now, use onMarketPriceUpdate()
   */
  async onMarketPriceUpdateWithCandles(
    symbol: string,
    lastPrice: number,
    candles?: Candle[],
    indicators?: IndicatorSnapshot
  ): Promise<void> {
    // Validate price
    if (!isFinite(lastPrice) || lastPrice <= 0) {
      console.warn("[ExecutionEngine] Invalid price update ignored", {
        symbol,
        lastPrice,
      });
      return;
    }

    await this.withLock(async () => {
      const pos = this.findPositionBySymbol(symbol);
      if (!pos) return;

      pos.lastPrice = lastPrice;

      // Update bestPrice
      if (pos.direction === "LONG") {
        pos.bestPrice = Math.max(pos.bestPrice, lastPrice);
      } else {
        pos.bestPrice = Math.min(pos.bestPrice, lastPrice);
      }

      // Update trailing stop
      this.updateTrailingStop(pos);

      // Check strategy-specific exits if candles provided
      if (candles && indicators) {
        const strategy = this.strategyMap.get(pos.strategyName);
        if (strategy) {
          // Future: Use strategy.exitFirst() / exitSecond() methods
          // For now, this is a placeholder for future implementation
          // const exitSignal = strategy.evaluateExit(candles, indicators, pos);
          // if (exitSignal.exit) {
          //   this.closePosition(pos, exitSignal.price || lastPrice, "strategy-exit");
          //   return;
          // }
        }
      }

      // Check stop-loss
      this.checkStopLossExit(pos);
    });
  }

  /**
   * Updates trailing stop based on R-multiple profit.
   * Example: Trail stop at 1.5R when position reaches 2R profit.
   */
  private updateTrailingStop(pos: OpenPosition): void {
    if (pos.riskDollars <= 0 || pos.riskPerShare <= 0) return;

    // Calculate current R-multiple
    const currentPnL =
      pos.direction === "LONG"
        ? (pos.lastPrice - pos.entryPrice) * pos.quantity
        : (pos.entryPrice - pos.lastPrice) * pos.quantity;

    const currentR = currentPnL / pos.riskDollars;

    // Trail stop when position reaches 2R profit
    // Trail distance: 1.5R from best price
    if (currentR >= 2.0) {
      const trailDistance = pos.riskPerShare * 1.5;

      if (pos.direction === "LONG") {
        const newStop = pos.bestPrice - trailDistance;
        // Only move stop up (reduce risk)
        if (newStop > pos.stopLoss && newStop < pos.entryPrice) {
          pos.stopLoss = newStop;
        }
      } else {
        // SHORT
        const newStop = pos.bestPrice + trailDistance;
        // Only move stop down (reduce risk)
        if (newStop < pos.stopLoss && newStop > pos.entryPrice) {
          pos.stopLoss = newStop;
        }
      }
    }
  }

  // -------------------------------------------------
  // 3) סגירה כפויה בסוף היום – לקרוא כל דקה מהאורקסטרטור
  // -------------------------------------------------
  async forceExitAllIfTime(currentPriceMap?: Record<string, number>): Promise<void> {
    const nowHHMM = this.getTimeHHMM();
    if (nowHHMM < this.config.forceExitTime) return;

    // Use lock for force exit
    await this.withLock(async () => {
      // סוגרים את כל הפוזיציות הפתוחות
      for (const pos of [...this.openPositions]) {
        // Use current price from map, fallback to lastPrice, then entryPrice
        const exitPrice =
          currentPriceMap?.[pos.symbol] ?? pos.lastPrice ?? pos.entryPrice;

        // Validate exit price
        if (!isFinite(exitPrice) || exitPrice <= 0) {
          console.warn("[ExecutionEngine] Invalid exit price, using entry price", {
            symbol: pos.symbol,
            exitPrice,
          });
          this.closePosition(pos, pos.entryPrice, "force-close-end-of-day");
        } else {
          this.closePosition(pos, exitPrice, "force-close-end-of-day");
        }
      }
    });
  }

  // -------------------------------------------------
  // ====== לוגיקה פנימית ======
  // -------------------------------------------------

  private resolveDirection(event: PatternFoundEvent): TradeDirection | null {
    const stratDir = event.strategyDirection;
    const masterDir = event.master.direction as TradeDirection;

    if (stratDir === "BOTH") {
      return masterDir;
    }

    if (stratDir === masterDir) {
      return stratDir;
    }

    // במקרה שיהיה אי התאמה – נעדיף לא לסחור
    return null;
  }

  private buildTradeSetupFromPattern(
    event: PatternFoundEvent,
    entryPrice: number,
    stopLoss: number,
    direction: TradeDirection
  ): TradeSetup {
    const distance = Math.abs(entryPrice - stopLoss);
    const riskPerShare = distance;

    const riskBudgetTotal =
      this.config.totalAccountValue * (this.config.riskPerTradePct / 100);

    let quantity =
      riskPerShare > 0 ? Math.floor(riskBudgetTotal / riskPerShare) : 0;

    // הגבלה לפי חשיפה ממוצעת לכל טרייד (אם רוצים להימנע מטרייד ענק אחד)
    const maxNotionalTotal =
      this.config.totalAccountValue * (this.config.maxExposurePct / 100);
    const maxNotionalPerTrade =
      maxNotionalTotal / this.config.maxConcurrentTrades;

    const notional = quantity * entryPrice;
    if (notional > maxNotionalPerTrade && entryPrice > 0) {
      quantity = Math.floor(maxNotionalPerTrade / entryPrice);
    }

    const riskDollars = quantity * riskPerShare;

    return {
      symbol: event.symbol,
      strategyName: event.strategyName,
      direction,
      entryPrice,
      stopLoss,
      riskPerShare,
      riskDollars,
      quantity,
      masterScore: event.master.masterScore,
      masterDirection: event.master.direction as TradeDirection,
      metadata: event.patternState.metadata ?? {},
      createdAt: event.detectedAt,
    };
  }

  private canOpenNotional(setup: TradeSetup): boolean {
    const maxNotionalTotal =
      this.config.totalAccountValue * (this.config.maxExposurePct / 100);

    const currentNotional = this.openPositions.reduce((sum, pos) => {
      return sum + pos.quantity * pos.entryPrice;
    }, 0);

    const newNotional = setup.quantity * setup.entryPrice;

    return currentNotional + newNotional <= maxNotionalTotal;
  }

  private async executeOrder(
    setup: TradeSetup
  ): Promise<OrderExecutionResult | null> {
    if (setup.quantity <= 0) return null;

    try {
      if (this.config.mode === "LIVE") {
        if (!this.ibkrClient) {
          console.error("[ExecutionEngine] LIVE mode but no IBKR client defined");
          return null;
        }

        const side: "BUY" | "SELL" =
          setup.direction === "LONG" ? "BUY" : "SELL";

        // Check IBKR connection status
        if (this.ibkrClient.isConnected && !this.ibkrClient.isConnected()) {
          console.warn("[ExecutionEngine] IBKR client not connected, attempting reconnect...");
          if (this.ibkrClient.reconnect) {
            try {
              await this.ibkrClient.reconnect();
              console.log("[ExecutionEngine] IBKR reconnected successfully");
            } catch (error) {
              console.error("[ExecutionEngine] IBKR reconnection failed", error);
              return null;
            }
          } else {
            console.error("[ExecutionEngine] IBKR client not connected and no reconnect method available");
            return null;
          }
        }

        // Create pending order record
        const orderId = `ORDER-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const pendingOrder: OrderStatusInfo = {
          orderId,
          symbol: setup.symbol,
          side,
          quantity: setup.quantity,
          filledQuantity: 0,
          status: "PENDING",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        this.pendingOrders.set(orderId, pendingOrder);

        try {
        const res = await this.ibkrClient.placeMarketOrder(
          setup.symbol,
          setup.quantity,
          side
        );

        // Update order status
        pendingOrder.status = res.filledQuantity === setup.quantity ? "FILLED" : "PARTIALLY_FILLED";
        pendingOrder.filledQuantity = res.filledQuantity;
        pendingOrder.avgFillPrice = res.avgFillPrice;
        pendingOrder.updatedAt = new Date().toISOString();
        if (res.orderId) {
          pendingOrder.orderId = res.orderId;
          this.pendingOrders.delete(orderId);
          this.pendingOrders.set(res.orderId, pendingOrder);
        }

        // Move to history
        this.orderHistory.push({ ...pendingOrder });
        if (pendingOrder.status === "FILLED" || pendingOrder.status === "PARTIALLY_FILLED") {
          this.pendingOrders.delete(pendingOrder.orderId);
        }

        return res;
      } catch (error) {
        // Update order status to rejected
        pendingOrder.status = "REJECTED";
        pendingOrder.error = error instanceof Error ? error.message : String(error);
        pendingOrder.updatedAt = new Date().toISOString();
        this.orderHistory.push({ ...pendingOrder });
        this.pendingOrders.delete(orderId);
        throw error; // Re-throw to be caught by outer try-catch
      }
      }

      // DEMO / BACKTEST – נחשב כאילו קיבלנו Fill במחיר הכניסה
      return {
        orderId: undefined,
        avgFillPrice: setup.entryPrice,
        filledQuantity: setup.quantity,
      };
    } catch (error) {
      console.error("[ExecutionEngine] Order execution failed", {
        symbol: setup.symbol,
        quantity: setup.quantity,
        direction: setup.direction,
        mode: this.config.mode,
        error: error instanceof Error ? error.message : String(error),
      });
      return null; // Fail gracefully - don't crash the system
    }
  }

  private createOpenPosition(
    setup: TradeSetup,
    fillPrice: number
  ): OpenPosition {
    const now = new Date().toISOString();

    return {
      symbol: setup.symbol,
      strategyName: setup.strategyName,
      direction: setup.direction,
      entryPrice: fillPrice,
      stopLoss: setup.stopLoss,
      initialStopLoss: setup.stopLoss,
      quantity: setup.quantity,
      openedAt: now,
      riskPerShare: setup.riskPerShare,
      riskDollars: setup.riskDollars,
      masterScore: setup.masterScore,
      masterDirection: setup.masterDirection,
      lastPrice: fillPrice,
      bestPrice: fillPrice,
      metadata: setup.metadata,
    };
  }

  // -------------------------------------------------
  // רילוקציה – כשמלא מספר העסקאות המקסימלי
  // -------------------------------------------------

  private tryRelocation(newSetup: TradeSetup): boolean {
    if (this.openPositions.length === 0) return false;
    if (this.config.relocationThresholdR <= 0) return false; // Reallocation disabled

    let candidate: OpenPosition | null = null;

    for (const pos of this.openPositions) {
      // Calculate current R-multiple for existing position
      const currentPnL =
        pos.direction === "LONG"
          ? (pos.lastPrice - pos.entryPrice) * pos.quantity
          : (pos.entryPrice - pos.lastPrice) * pos.quantity;

      const currentR =
        pos.riskDollars > 0 ? currentPnL / pos.riskDollars : 0;

      // Only consider positions that meet R threshold
      if (currentR < this.config.relocationThresholdR) continue;

      // Position must be profitable
      const profitable =
        pos.direction === "LONG"
          ? pos.lastPrice > pos.entryPrice
          : pos.lastPrice < pos.entryPrice;

      if (!profitable) continue;

      // Select position with lowest masterScore (weaker opportunity)
      if (!candidate || pos.masterScore < candidate.masterScore) {
        candidate = pos;
      }
    }

    if (!candidate) {
      // No position meets the relocation criteria
      return false;
    }

    this.closePosition(
      candidate,
      candidate.lastPrice || candidate.entryPrice,
      "relocation"
    );

    return true;
  }

  // -------------------------------------------------
  // יציאה לפי סטופ לוס
  // -------------------------------------------------

  private checkStopLossExit(pos: OpenPosition): void {
    const price = pos.lastPrice;
    if (!price) return;

    if (pos.direction === "LONG" && price <= pos.stopLoss) {
      this.closePosition(pos, price, "stop-loss");
    } else if (pos.direction === "SHORT" && price >= pos.stopLoss) {
      this.closePosition(pos, price, "stop-loss");
    }
  }

  private closePosition(
    pos: OpenPosition,
    exitPrice: number,
    reason: ExitReason
  ): void {
    // Validate exit price
    if (!isFinite(exitPrice) || exitPrice <= 0) {
      console.warn("[ExecutionEngine] Invalid exit price in closePosition", {
        symbol: pos.symbol,
        exitPrice,
      });
      return;
    }

    const idx = this.openPositions.indexOf(pos);
    if (idx === -1) return;

    const pnl =
      pos.direction === "LONG"
        ? (exitPrice - pos.entryPrice) * pos.quantity
        : (pos.entryPrice - exitPrice) * pos.quantity;

    const rMultiple =
      pos.riskPerShare > 0 ? pnl / (pos.riskPerShare * pos.quantity) : 0;

    const closed: ClosedTrade = {
      symbol: pos.symbol,
      strategyName: pos.strategyName,
      direction: pos.direction,
      entryPrice: pos.entryPrice,
      exitPrice,
      quantity: pos.quantity,
      riskPerShare: pos.riskPerShare,
      riskDollars: pos.riskDollars,
      pnl,
      rMultiple,
      openedAt: pos.openedAt,
      closedAt: new Date().toISOString(),
      masterScore: pos.masterScore,
      masterDirection: pos.masterDirection,
      exitReason: reason,
      metadata: pos.metadata,
    };

    this.closedTrades.push(closed);
    this.openPositions.splice(idx, 1);

    // Update daily PnL
    this.dailyPnL += pnl;

    // Update account peak
    const currentAccountValue = this.config.totalAccountValue + this.dailyPnL;
    if (currentAccountValue > this.accountPeak) {
      this.accountPeak = currentAccountValue;
    }
  }

  // -------------------------------------------------
  // עזרי זמן + עזרי מציאת פוזיציה
  // -------------------------------------------------

  private getTimeHHMM(): string {
    // Use market time (EST/EDT for US markets)
    // TODO: Make timezone configurable via config
    try {
      const now = new Date();
      // Convert to EST/EDT (America/New_York timezone)
      const marketTime = new Date(
        now.toLocaleString("en-US", { timeZone: "America/New_York" })
      );
      const hh = String(marketTime.getHours()).padStart(2, "0");
      const mm = String(marketTime.getMinutes()).padStart(2, "0");
      return `${hh}:${mm}`;
    } catch (error) {
      // Fallback to local time if timezone conversion fails
      console.warn("[ExecutionEngine] Timezone conversion failed, using local time", error);
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, "0");
      const mm = String(now.getMinutes()).padStart(2, "0");
      return `${hh}:${mm}`;
    }
  }

  private findPositionBySymbol(symbol: string): OpenPosition | undefined {
    return this.openPositions.find((p) => p.symbol === symbol);
  }

  // -------------------------------------------------
  // API חיצוני – לשליפת מצב
  // -------------------------------------------------

  getOpenPositions(): OpenPosition[] {
    // Return copy to prevent external modification
    return [...this.openPositions];
  }

  getClosedTrades(): ClosedTrade[] {
    // Return copy to prevent external modification
    return [...this.closedTrades];
  }

  /**
   * Get performance metrics summary
   */
  getPerformanceMetrics(): {
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    winRate: number;
    totalPnL: number;
    averageR: number;
    largestWin: number;
    largestLoss: number;
  } {
    const trades = this.closedTrades;
    const totalTrades = trades.length;
    const winningTrades = trades.filter((t) => t.pnl > 0).length;
    const losingTrades = trades.filter((t) => t.pnl < 0).length;
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
    const totalPnL = trades.reduce((sum, t) => sum + t.pnl, 0);
    const averageR =
      trades.length > 0
        ? trades.reduce((sum, t) => sum + t.rMultiple, 0) / trades.length
        : 0;
    const largestWin = Math.max(...trades.map((t) => t.pnl), 0);
    const largestLoss = Math.min(...trades.map((t) => t.pnl), 0);

    return {
      totalTrades,
      winningTrades,
      losingTrades,
      winRate,
      totalPnL,
      averageR,
      largestWin,
      largestLoss,
    };
  }

  /**
   * Get current account exposure (total notional value of open positions)
   */
  getCurrentExposure(): number {
    return this.openPositions.reduce((sum, pos) => {
      return sum + pos.quantity * pos.entryPrice;
    }, 0);
  }

  /**
   * Get current exposure as percentage of account value
   */
  getCurrentExposurePct(): number {
    if (this.config.totalAccountValue <= 0) return 0;
    const exposure = this.getCurrentExposure();
    return (exposure / this.config.totalAccountValue) * 100;
  }

  /**
   * Get current account value (initial + daily PnL)
   */
  getCurrentAccountValue(): number {
    return this.config.totalAccountValue + this.dailyPnL;
  }

  /**
   * Get current drawdown percentage from peak
   */
  getCurrentDrawdownPct(): number {
    if (this.accountPeak <= 0) return 0;
    const current = this.getCurrentAccountValue();
    const drawdown = this.accountPeak - current;
    return (drawdown / this.accountPeak) * 100;
  }

  /**
   * Get daily PnL
   */
  getDailyPnL(): number {
    return this.dailyPnL;
  }

  /**
   * Check if circuit breaker is open
   */
  isCircuitBreakerOpen(): boolean {
    if (!this.config.circuitBreakerEnabled) return false;

    // Check if cooldown period has passed
    if (this.circuitBreakerOpenUntil && Date.now() < this.circuitBreakerOpenUntil) {
      return true;
    }

    // Reset if cooldown passed
    if (this.circuitBreakerOpenUntil && Date.now() >= this.circuitBreakerOpenUntil) {
      this.circuitBreakerOpen = false;
      this.circuitBreakerOpenUntil = null;
      this.consecutiveFailures = 0;
      console.log("[ExecutionEngine] Circuit breaker reset - resuming trading");
    }

    return this.circuitBreakerOpen;
  }

  // -------------------------------------------------
  // Risk Management & Circuit Breaker
  // -------------------------------------------------

  private resetDailyPnLIfNeeded(): void {
    const today = new Date().toDateString();
    if (this.dailyResetDate !== today) {
      this.dailyPnL = 0;
      this.dailyResetDate = today;
      console.log("[ExecutionEngine] Daily PnL reset for new day");
    }
  }

  private checkRiskLimits(): boolean {
    // Check daily loss limit
    if (this.config.dailyLossLimit !== undefined) {
      if (this.dailyPnL <= -this.config.dailyLossLimit) {
        console.warn("[ExecutionEngine] Daily loss limit reached", {
          dailyPnL: this.dailyPnL,
          limit: this.config.dailyLossLimit,
        });
        return false;
      }
    }

    // Check max drawdown
    if (this.config.maxDrawdownPct !== undefined) {
      const drawdownPct = this.getCurrentDrawdownPct();
      if (drawdownPct >= this.config.maxDrawdownPct) {
        console.warn("[ExecutionEngine] Max drawdown reached", {
          drawdownPct,
          limit: this.config.maxDrawdownPct,
          accountPeak: this.accountPeak,
          currentValue: this.getCurrentAccountValue(),
        });
        return false;
      }
    }

    return true;
  }

  private recordOrderFailure(): void {
    if (!this.config.circuitBreakerEnabled) return;

    this.consecutiveFailures++;

    const threshold = this.config.circuitBreakerFailureThreshold ?? 5;
    if (this.consecutiveFailures >= threshold) {
      this.circuitBreakerOpen = true;
      const cooldownMs = this.config.circuitBreakerCooldownMs ?? 60_000; // Default 1 minute
      this.circuitBreakerOpenUntil = Date.now() + cooldownMs;

      console.error("[ExecutionEngine] Circuit breaker opened", {
        consecutiveFailures: this.consecutiveFailures,
        threshold,
        cooldownMs,
        openUntil: new Date(this.circuitBreakerOpenUntil).toISOString(),
      });
    }
  }

  /**
   * Get pending orders
   */
  getPendingOrders(): OrderStatusInfo[] {
    return Array.from(this.pendingOrders.values());
  }

  /**
   * Get order history
   */
  getOrderHistory(): OrderStatusInfo[] {
    return [...this.orderHistory];
  }

  /**
   * Get order by ID
   */
  getOrderById(orderId: string): OrderStatusInfo | undefined {
    return this.pendingOrders.get(orderId) ?? this.orderHistory.find((o) => o.orderId === orderId);
  }
}
