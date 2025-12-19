// Yahoo Finance Types for the application

export interface QuoteData {
  symbol: string;
  regularMarketPrice: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
  regularMarketVolume: number;
  regularMarketTime: number;
}

export interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: number;
}

export interface NewsArticle {
  uuid: string;
  title: string;
  publisher: string;
  link: string;
  providerPublishTime: number;
  type: string;
  relatedTickers?: string[];
}

export interface StockNews {
  symbol: string;
  title: string;
  source: string;
  url: string;
  publishedAt: number;
}

export interface MarketData {
  symbol: string;
  price: number;
  changePercent: number;
  chartData: number[];
}

export interface CachedQuote extends StockQuote {
  expiresAt: number;
}

export interface CachedNews extends StockNews {
  expiresAt: number;
}

// Currency exchange rates (for Shekel conversions)
export interface CurrencyRate {
  symbol: string; // "USD=X", "EURUSD=X", etc.
  rate: number;
  timestamp: number;
}

// Historical data for charts
export interface ChartPoint {
  timestamp: number;
  price: number;
}

export interface HistoricalData {
  symbol: string;
  data: ChartPoint[];
  expiresAt: number;
}

