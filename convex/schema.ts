import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    fullName: v.optional(v.string()),
    role: v.union(v.literal("admin"), v.literal("user")),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_email", ["email"])
    .index("by_role", ["role"]),

  // Trading Strategies
  strategies: defineTable({
    userId: v.string(),
    type: v.string(), // "double-top", "double-bottom", "gap-up", etc.
    name: v.string(), // Display name
    enabled: v.boolean(),

    // Pattern Recognition Configuration
    patternConfig: v.object({
      candlesBetweenPeaks: v.optional(v.number()),
      priceDeviation: v.optional(v.number()),
      volumeConfirmation: v.optional(v.boolean()),
      minPatternHeight: v.optional(v.number()),
      // Generic field for strategy-specific params
      customParams: v.optional(v.any()),
    }),

    // Entry Conditions
    entryConfig: v.object({
      confirmationCandles: v.optional(v.number()),
      volumeThreshold: v.optional(v.number()),
      priceLevel: v.optional(v.string()), // "market", "limit"
      customParams: v.optional(v.any()),
    }),

    // Exit Conditions
    exitConfig: v.object({
      takeProfitPercent: v.optional(v.number()),
      stopLossPercent: v.optional(v.number()),
      trailingStop: v.optional(v.boolean()),
      trailingStopPercent: v.optional(v.number()),
      timeBasedExit: v.optional(v.number()), // minutes
      customParams: v.optional(v.any()),
    }),

    // Stop Configuration
    stopConfig: v.object({
      stopLossType: v.optional(v.string()), // "fixed", "atr", "support"
      stopLossValue: v.optional(v.number()),
      takeProfitType: v.optional(v.string()),
      takeProfitValue: v.optional(v.number()),
      customParams: v.optional(v.any()),
    }),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_type", ["userId", "type"])
    .index("by_enabled", ["enabled"]),

  // Trade Router Configuration
  tradeRouterConfig: defineTable({
    userId: v.string(),

    // Position Sizing
    maxPositionSize: v.number(),
    maxConcurrentTrades: v.number(),
    portfolioRiskPercent: v.number(),
    positionSizingMethod: v.string(), // "fixed", "risk-based", "kelly"

    // Trading Hours
    tradingStartTime: v.string(), // "09:30"
    tradingEndTime: v.string(), // "16:00"
    closeBeforeMarketClose: v.number(), // minutes

    // Risk Management
    dailyLossLimit: v.number(),
    dailyProfitTarget: v.number(),
    maxDrawdown: v.number(),
    stopTradingOnLimit: v.boolean(),

    // IBKR Configuration
    paperTrading: v.boolean(),
    accountId: v.optional(v.string()),

    // General
    enabled: v.boolean(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  // Active Trades
  activeTrades: defineTable({
    userId: v.string(),
    strategyId: v.id("strategies"),
    strategyType: v.string(),

    symbol: v.string(),
    side: v.string(), // "long", "short"
    quantity: v.number(),

    entryPrice: v.number(),
    currentPrice: v.number(),
    entryTime: v.number(),

    stopLoss: v.number(),
    takeProfit: v.number(),

    unrealizedPnL: v.number(),
    unrealizedPnLPercent: v.number(),

    status: v.string(), // "open", "pending", "closing"
    orderId: v.optional(v.string()), // IBKR order ID
  })
    .index("by_user", ["userId"])
    .index("by_strategy", ["strategyId"])
    .index("by_status", ["status"])
    .index("by_symbol", ["symbol"]),

  // Trade History
  tradeHistory: defineTable({
    userId: v.string(),
    strategyId: v.id("strategies"),
    strategyType: v.string(),

    symbol: v.string(),
    side: v.string(),
    quantity: v.number(),

    entryPrice: v.number(),
    exitPrice: v.number(),
    entryTime: v.number(),
    exitTime: v.number(),

    realizedPnL: v.number(),
    realizedPnLPercent: v.number(),

    exitReason: v.string(), // "take-profit", "stop-loss", "time-based", "manual"
    commission: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_strategy", ["strategyId"])
    .index("by_symbol", ["symbol"])
    .index("by_exit_time", ["exitTime"]),

  // Double Top Strategy Configurations
  doubleTopStrategies: defineTable({
    userId: v.string(),
    name: v.string(),
    timeInterval: v.string(),
    indicators: v.array(
      v.object({
        id: v.string(),
        name: v.union(v.string(), v.null()),
        value: v.string(),
      })
    ),
    config: v.object({
      // זיהוי דפוס
      minDropPct: v.number(),
      maxDropPct: v.number(),
      minBarsBetweenPeaks: v.number(),
      peakDiffAbsPct: v.number(),
      volumeDowntrendBetweenPeaks: v.boolean(),
      patternConfirmRedBars: v.number(),
      // התראה מוקדמת
      earlyHeadsUpEnabled: v.boolean(),
      earlyHeadsUpRiseBars: v.number(),
      // כניסה ראשונה
      entry1ConfirmBars: v.number(),
      entry1UsesSameConfirmation: v.boolean(),
      // יציאה ראשונה
      abnormalVolMultiplier: v.number(),
      abnormalVolWindowMode: v.union(v.literal("fromFirstRed"), v.literal("fixed")),
      abnormalVolFixedWindow: v.number(),
      // כניסה שנייה
      entry2Enabled: v.boolean(),
      entry2ConfirmBelowMA: v.number(),
      maKind: v.literal("sma"),
      maWindows: v.array(v.number()),
      // יציאה שנייה
      exit2OnTouchMA: v.boolean(),
      // סטופים
      stop1_initial_atSecondPeakHigh: v.boolean(),
      stop1_trailing_byResistances: v.boolean(),
      stop2_initial_atFailedMAHigh: v.boolean(),
      stop2_trailing_byResistances: v.boolean(),
    }),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_created_at", ["createdAt"]),

  // Stocks Lists (User's watchlists)
  stocksLists: defineTable({
    userId: v.string(),
    name: v.string(), // "My Main List", "Tech Stocks", etc.
    isActive: v.boolean(), // Which list is currently active
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_active", ["userId", "isActive"]),

  // Stocks in a list
  listStocks: defineTable({
    listId: v.id("stocksLists"),
    symbol: v.string(), // "AAPL", "GOOGL", etc.
    addedAt: v.number(),
  })
    .index("by_list", ["listId"])
    .index("by_symbol", ["symbol"])
    .index("by_list_and_symbol", ["listId", "symbol"]),

  // Active strategies for a list
  listStrategies: defineTable({
    listId: v.id("stocksLists"),
    strategyName: v.string(), // "דאבל טופ", "גאפ אפ", etc.
    strategyType: v.string(), // "double-top", "gap-up", etc.
    isActive: v.boolean(),
    addedAt: v.number(),
  })
    .index("by_list", ["listId"])
    .index("by_list_and_active", ["listId", "isActive"])
    .index("by_list_and_type", ["listId", "strategyType"]),

  // Yahoo Finance Cache - Stock Quotes (TTL: 24 hours)
  yahooQuotes: defineTable({
    symbol: v.string(),
    price: v.number(),
    change: v.number(),
    changePercent: v.number(),
    volume: v.number(),
    timestamp: v.number(),
    expiresAt: v.number(), // Unix timestamp for expiration
  })
    .index("by_symbol", ["symbol"])
    .index("by_expires", ["expiresAt"]),

  // Yahoo Finance Cache - News Articles (TTL: 24 hours)
  yahooNews: defineTable({
    symbol: v.string(), // "general" for market news
    title: v.string(),
    source: v.string(),
    url: v.string(),
    publishedAt: v.number(),
    expiresAt: v.number(),
  })
    .index("by_symbol", ["symbol"])
    .index("by_expires", ["expiresAt"])
    .index("by_symbol_and_time", ["symbol", "publishedAt"]),

  // Yahoo Finance Cache - Historical Data for Charts (TTL: 24 hours)
  yahooHistorical: defineTable({
    symbol: v.string(),
    chartData: v.array(v.number()), // Array of prices for sparkline
    timestamp: v.number(),
    expiresAt: v.number(),
  })
    .index("by_symbol", ["symbol"])
    .index("by_expires", ["expiresAt"]),

  // User Index Panels (Main Screen)
  userIndexPanels: defineTable({
    userId: v.string(),
    symbol: v.string(),
    order: v.number(), // Display order
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_order", ["userId", "order"]),

  // Finviz News Cache (TTL: 24 hours)
  finvizNews: defineTable({
    symbol: v.string(), // "general" for market news
    title: v.string(),
    source: v.string(),
    url: v.string(),
    publishedAt: v.number(),
    expiresAt: v.number(),
  })
    .index("by_symbol", ["symbol"])
    .index("by_expires", ["expiresAt"])
    .index("by_symbol_and_time", ["symbol", "publishedAt"]),

  // Real-time Market Data Cache (TTL: 1 minute)
  marketDataCache: defineTable({
    symbol: v.string(),
    price: v.number(),
    change: v.number(),
    changePercent: v.number(),
    volume: v.number(),
    source: v.string(), // "ibkr" or "yahoo"
    lastUpdate: v.number(),
    expiresAt: v.number(), // 1 minute TTL
  })
    .index("by_symbol", ["symbol"])
    .index("by_expires", ["expiresAt"]),

  // IBKR Rate Limiting - Track API calls to prevent exceeding limits
  ibkrRateLimits: defineTable({
    endpoint: v.string(), // "marketData", "historicalData", etc.
    timestamp: v.number(), // When the call was made
    userId: v.optional(v.string()), // Optional: track per user
  })
    .index("by_endpoint_and_time", ["endpoint", "timestamp"])
    .index("by_user_and_endpoint", ["userId", "endpoint"]),

  // IBKR Market Data Cache (TTL: 5 minutes for real-time data)
  ibkrMarketData: defineTable({
    symbol: v.string(),
    price: v.number(),
    change: v.number(),
    changePercent: v.number(),
    volume: v.number(),
    bid: v.number(),
    ask: v.number(),
    high: v.number(),
    low: v.number(),
    open: v.number(),
    close: v.number(),
    timestamp: v.number(),
    expiresAt: v.number(), // Cache for 5 minutes
  })
    .index("by_symbol", ["symbol"])
    .index("by_expires", ["expiresAt"]),

  // IBKR Historical Data Cache (TTL: 1 hour)
  ibkrHistoricalData: defineTable({
    symbol: v.string(),
    chartData: v.array(v.number()),
    timestamp: v.number(),
    expiresAt: v.number(),
  })
    .index("by_symbol", ["symbol"])
    .index("by_expires", ["expiresAt"]),

  // Symbol Scoring System - Stores department scores and Master Score
  symbolScores: defineTable({
    symbol: v.string(), // "AAPL", "GOOGL", etc.

    // Department Scores (כל מחלקה עם הציון שלה)
    technicalScore: v.number(), // Technical Indicators Score [-10, +10]
    newsScore: v.number(), // News Scoring [-10, +10]
    macroScore: v.number(), // Macro Scoring [-10, +10]
    sectorScore: v.number(), // Sector Scoring [-10, +10]
    optionsFlowScore: v.number(), // Options Flow [-10, +10]
    microCompanyScore: v.number(), // Micro Company [-10, +10]

    // Master Score (הציון הסופי המשוקלל)
    masterScore: v.number(), // Unbounded (יכול להיות מעבר ל-10)
    direction: v.union(v.literal("LONG"), v.literal("SHORT"), v.literal("NEUTRAL")),

    // Component Breakdown (פירוט מפורט מכל מחלקה)
    // זה יכול לכלול breakdown פנימי של כל מחלקה (אינדיקטורים, קבוצות וכו')
    componentBreakdown: v.optional(v.any()),

    // Metadata
    lastUpdated: v.number(), // Unix timestamp
    refreshTrigger: v.optional(v.string()), // איזו מחלקה גרמה לרענון (TECHNICAL, NEWS, etc.)
    refreshReason: v.optional(v.string()), // סיבה ספציפית (למשל "Earnings release", "VIX spike")
  })
    .index("by_symbol", ["symbol"])
    .index("by_master_score", ["masterScore"])
    .index("by_direction", ["direction"])
    .index("by_last_updated", ["lastUpdated"])
    .index("by_symbol_and_updated", ["symbol", "lastUpdated"]),

  // Intraday Bars - Real-time market data bars (Phase 4)
  // Retention: Last 3 trading days only
  intradayBars: defineTable({
    symbol: v.string(), // "AAPL", "MSFT", etc.
    timeframe: v.string(), // "1s" | "5s" | "1m"
    tradingDay: v.string(), // "2025-12-08" in market timezone (New York)
    startTs: v.number(), // Bar start timestamp (Unix milliseconds, inclusive)
    endTs: v.number(), // Bar end timestamp (Unix milliseconds, exclusive)
    open: v.number(),
    high: v.number(),
    low: v.number(),
    close: v.number(),
    volume: v.number(),
    createdAt: v.number(), // When bar was saved (for diagnostics/TTL)
  })
    .index("by_symbol_timeframe_day", ["symbol", "timeframe", "tradingDay"])
    .index("by_trading_day", ["tradingDay"])
    .index("by_symbol_and_timeframe", ["symbol", "timeframe"])
    .index("by_symbol_timeframe_start", ["symbol", "timeframe", "startTs"]),
});
