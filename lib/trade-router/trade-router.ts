/**
 * Trade Router - המנוע המרכזי
 * מנהל את כל האסטרטגיות וביצוע הטריידים
 */

import type { BaseStrategy, MarketData, Signal } from "@/lib/strategies/base-strategy";

export interface TradeRouterConfig {
  // Position Sizing
  maxPositionSize: number; // גודל מקסימלי לפוזיציה ($)
  maxConcurrentTrades: number; // מס' טריידים מקסימלי במקביל
  portfolioRiskPercent: number; // % סיכון מהתיק
  positionSizingMethod: "fixed" | "risk-based" | "kelly";

  // Trading Hours
  tradingStartTime: string; // "09:30"
  tradingEndTime: string; // "16:00"
  closeBeforeMarketClose: number; // דקות לפני סגירת השוק

  // Risk Management
  dailyLossLimit: number; // הפסד יומי מקסימלי ($)
  dailyProfitTarget: number; // יעד רווח יומי ($)
  maxDrawdown: number; // ירידה מקסימלית מהשיא (%)
  stopTradingOnLimit: boolean; // להפסיק מסחר כשמגיעים למגבלה

  // General
  enabled: boolean; // האם הנתב פעיל
  paperTrading: boolean; // מסחר סימולציה או אמיתי
}

export interface ActiveTrade {
  id: string;
  strategyName: string;
  symbol: string;
  side: "long" | "short";
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  stopLoss: number;
  takeProfit: number;
  unrealizedPnL: number;
  entryTime: number;
}

export interface TradeResult {
  success: boolean;
  message: string;
  tradeId?: string;
}

/**
 * מחלקת Trade Router - המנוע המרכזי
 */
export class TradeRouter {
  private strategies: Map<string, BaseStrategy> = new Map();
  private config: TradeRouterConfig;
  private activeTrades: Map<string, ActiveTrade> = new Map();
  private dailyStats = {
    pnl: 0,
    tradesCount: 0,
    lastReset: new Date().toDateString(),
  };

  constructor(config: TradeRouterConfig) {
    this.config = config;
  }

  /**
   * רישום אסטרטגיה חדשה
   */
  registerStrategy(strategy: BaseStrategy): void {
    if (!strategy.isEnabled()) {
      console.log(`Strategy ${strategy.getName()} is disabled, skipping registration`);
      return;
    }

    this.strategies.set(strategy.getName(), strategy);
    console.log(`✓ Strategy registered: ${strategy.getName()}`);
  }

  /**
   * הסרת אסטרטגיה
   */
  unregisterStrategy(strategyName: string): void {
    this.strategies.delete(strategyName);
    console.log(`✗ Strategy unregistered: ${strategyName}`);
  }

  /**
   * עדכון תצורת הנתב
   */
  updateConfig(newConfig: Partial<TradeRouterConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * פונקציה ראשית - מתבצעת בכל עדכון של נתוני שוק
   * @param symbol - סימול המניה
   * @param data - מערך נרות
   */
  async onMarketData(symbol: string, data: MarketData[]): Promise<void> {
    // בדיקות בסיסיות
    if (!this.config.enabled) return;
    if (!this.isWithinTradingHours()) return;
    if (!this.checkRiskLimits()) {
      console.log("⚠️  Risk limits exceeded, stopping trading");
      return;
    }

    this.resetDailyStatsIfNeeded();

    // סריקת כל אסטרטגיה
    for (const [strategyName, strategy] of this.strategies) {
      try {
        await this.analyzeStrategyForSymbol(strategyName, strategy, symbol, data);
      } catch (error) {
        console.error(`Error analyzing ${strategyName} for ${symbol}:`, error);
      }
    }
  }

  /**
   * ניתוח אסטרטגיה ספציפית למניה ספציפית
   */
  private async analyzeStrategyForSymbol(
    strategyName: string,
    strategy: BaseStrategy,
    symbol: string,
    data: MarketData[]
  ): Promise<void> {
    const tradeKey = `${symbol}-${strategyName}`;
    const activeTrade = this.activeTrades.get(tradeKey);

    if (activeTrade) {
      // יש טרייד פעיל - בדיקת תנאי יציאה
      await this.checkExitSignal(activeTrade, strategy, data);
    } else {
      // אין טרייד פעיל - חיפוש הזדמנויות כניסה
      await this.checkEntrySignal(strategyName, strategy, symbol, data);
    }
  }

  /**
   * בדיקת אות כניסה
   */
  private async checkEntrySignal(
    strategyName: string,
    strategy: BaseStrategy,
    symbol: string,
    data: MarketData[]
  ): Promise<void> {
    if (!this.canOpenNewTrade()) {
      return; // הגענו למקסימום טריידים
    }

    const signal = strategy.analyze(data);

    if (signal && signal.type === "entry") {
      console.log(`📈 Entry signal detected: ${strategyName} on ${symbol}`);
      console.log(`   Action: ${signal.action} | Confidence: ${signal.confidence}`);
      console.log(`   Reason: ${signal.reason}`);

      await this.executeTrade({
        type: "entry",
        strategyName,
        symbol,
        signal,
      });
    }
  }

  /**
   * בדיקת אות יציאה
   */
  private async checkExitSignal(
    activeTrade: ActiveTrade,
    strategy: BaseStrategy,
    data: MarketData[]
  ): Promise<void> {
    // עדכון מחיר נוכחי
    const currentPrice = data[data.length - 1].close;
    activeTrade.currentPrice = currentPrice;
    activeTrade.unrealizedPnL = this.calculatePnL(activeTrade);

    const signal = strategy.analyze(data, activeTrade.entryPrice, activeTrade.side);

    if (signal && signal.type === "exit") {
      console.log(`📉 Exit signal detected: ${activeTrade.strategyName} on ${activeTrade.symbol}`);
      console.log(`   Reason: ${signal.reason}`);
      console.log(`   P&L: $${activeTrade.unrealizedPnL.toFixed(2)}`);

      await this.executeTrade({
        type: "exit",
        strategyName: activeTrade.strategyName,
        symbol: activeTrade.symbol,
        signal,
        tradeId: activeTrade.id,
      });
    }
  }

  /**
   * ביצוע טרייד (כניסה או יציאה)
   */
  private async executeTrade(params: {
    type: "entry" | "exit";
    strategyName: string;
    symbol: string;
    signal: Signal;
    tradeId?: string;
  }): Promise<TradeResult> {
    const { type, strategyName, symbol, signal, tradeId } = params;

    if (this.config.paperTrading) {
      console.log(`🎮 PAPER TRADING: ${type.toUpperCase()}`);
    }

    if (type === "entry") {
      // פתיחת פוזיציה חדשה
      const quantity = this.calculatePositionSize(signal.price);
      const newTrade: ActiveTrade = {
        id: `${Date.now()}-${symbol}`,
        strategyName,
        symbol,
        side: signal.action as "long" | "short",
        quantity,
        entryPrice: signal.price,
        currentPrice: signal.price,
        stopLoss: signal.stopLoss || 0,
        takeProfit: signal.takeProfit || 0,
        unrealizedPnL: 0,
        entryTime: Date.now(),
      };

      const tradeKey = `${symbol}-${strategyName}`;
      this.activeTrades.set(tradeKey, newTrade);
      this.dailyStats.tradesCount++;

      console.log(`✅ Trade opened: ${symbol} ${signal.action.toUpperCase()}`);
      console.log(`   Entry: $${signal.price} | Quantity: ${quantity}`);
      console.log(`   Stop Loss: $${signal.stopLoss} | Take Profit: $${signal.takeProfit}`);

      return { success: true, message: "Trade opened", tradeId: newTrade.id };
    } else {
      // סגירת פוזיציה
      if (!tradeId) {
        return { success: false, message: "Missing trade ID" };
      }

      const tradeKey = `${symbol}-${strategyName}`;
      const trade = this.activeTrades.get(tradeKey);

      if (!trade) {
        return { success: false, message: "Trade not found" };
      }

      const pnl = this.calculatePnL({ ...trade, currentPrice: signal.price });
      this.dailyStats.pnl += pnl;

      this.activeTrades.delete(tradeKey);

      console.log(`✅ Trade closed: ${symbol}`);
      console.log(`   Exit: $${signal.price}`);
      console.log(`   P&L: $${pnl.toFixed(2)}`);
      console.log(`   Daily P&L: $${this.dailyStats.pnl.toFixed(2)}`);

      return { success: true, message: "Trade closed", tradeId };
    }
  }

  /**
   * חישוב גודל פוזיציה
   */
  private calculatePositionSize(price: number): number {
    const { maxPositionSize, positionSizingMethod } = this.config;

    switch (positionSizingMethod) {
      case "fixed":
        return Math.floor(maxPositionSize / price);
      case "risk-based":
        // TODO: חישוב מבוסס סיכון
        return Math.floor(maxPositionSize / price);
      case "kelly":
        // TODO: Kelly Criterion
        return Math.floor(maxPositionSize / price);
      default:
        return Math.floor(maxPositionSize / price);
    }
  }

  /**
   * חישוב רווח/הפסד
   */
  private calculatePnL(trade: ActiveTrade): number {
    const { side, entryPrice, currentPrice, quantity } = trade;

    if (side === "long") {
      return (currentPrice - entryPrice) * quantity;
    } else {
      // short
      return (entryPrice - currentPrice) * quantity;
    }
  }

  /**
   * בדיקה אם אפשר לפתוח טרייד נוסף
   */
  private canOpenNewTrade(): boolean {
    return this.activeTrades.size < this.config.maxConcurrentTrades;
  }

  /**
   * בדיקת שעות מסחר
   */
  private isWithinTradingHours(): boolean {
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    // בדיקה אם בטווח השעות
    const isInRange =
      currentTime >= this.config.tradingStartTime && currentTime <= this.config.tradingEndTime;

    // בדיקה אם קרוב לסגירה
    const [endHour, endMinute] = this.config.tradingEndTime.split(":").map(Number);
    const endTime = new Date();
    endTime.setHours(endHour, endMinute - this.config.closeBeforeMarketClose, 0, 0);

    const shouldClosePositions = now >= endTime;

    return isInRange && !shouldClosePositions;
  }

  /**
   * בדיקת מגבלות סיכון
   */
  private checkRiskLimits(): boolean {
    const { dailyLossLimit, dailyProfitTarget, stopTradingOnLimit } = this.config;

    // בדיקת הפסד יומי
    if (this.dailyStats.pnl <= -dailyLossLimit) {
      console.log(`🛑 Daily loss limit reached: $${this.dailyStats.pnl.toFixed(2)}`);
      if (stopTradingOnLimit) {
        this.closeAllPositions("Daily loss limit");
        return false;
      }
    }

    // בדיקת יעד רווח יומי
    if (this.dailyStats.pnl >= dailyProfitTarget) {
      console.log(`🎯 Daily profit target reached: $${this.dailyStats.pnl.toFixed(2)}`);
      if (stopTradingOnLimit) {
        this.closeAllPositions("Daily profit target");
        return false;
      }
    }

    return true;
  }

  /**
   * איפוס סטטיסטיקות יומיות
   */
  private resetDailyStatsIfNeeded(): void {
    const today = new Date().toDateString();
    if (this.dailyStats.lastReset !== today) {
      this.dailyStats = {
        pnl: 0,
        tradesCount: 0,
        lastReset: today,
      };
      console.log("📅 Daily stats reset");
    }
  }

  /**
   * סגירת כל הפוזיציות
   */
  private closeAllPositions(reason: string): void {
    console.log(`🚨 Closing all positions: ${reason}`);
    // TODO: ממש סגירה של כל הפוזיציות דרך IBKR
    this.activeTrades.clear();
  }

  /**
   * קבלת סטטיסטיקות
   */
  getStats() {
    return {
      activeStrategies: this.strategies.size,
      activeTrades: this.activeTrades.size,
      dailyPnL: this.dailyStats.pnl,
      dailyTrades: this.dailyStats.tradesCount,
      isEnabled: this.config.enabled,
    };
  }

  /**
   * קבלת כל הטריידים הפעילים
   */
  getActiveTrades(): ActiveTrade[] {
    return Array.from(this.activeTrades.values());
  }
}

/**
 * ברירות מחדל לתצורת Trade Router
 */
export const DEFAULT_TRADE_ROUTER_CONFIG: TradeRouterConfig = {
  maxPositionSize: 10000,
  maxConcurrentTrades: 3,
  portfolioRiskPercent: 2,
  positionSizingMethod: "fixed",
  tradingStartTime: "09:30",
  tradingEndTime: "16:00",
  closeBeforeMarketClose: 15,
  dailyLossLimit: 500,
  dailyProfitTarget: 1500,
  maxDrawdown: 10,
  stopTradingOnLimit: true,
  enabled: false,
  paperTrading: true,
};
