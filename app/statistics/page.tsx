"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppLogo } from "@/components/AppLogo";
import { AIChatPanel } from "@/components/main-screen/AIChatPanel";
import { Button } from "@/components/ui/button";
import { useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRealtimeMarketData } from "@/lib/hooks/useRealtimeMarketData";

// Symbols for each category
const LEADING_INDEX_SYMBOLS = ["SPY", "QQQ", "IWM"];
const DIGITAL_CURRENCY_SYMBOLS = ["BTC-USD", "ETH-USD", "SOL-USD"];
const CURRENCY_SYMBOLS = {
  dollar: "USDILS=X",
  euro: "EURILS=X",
  yen: "JPYILS=X",
  rupee: "INRILS=X",
};

const sectors = [
  {
    name: "טכנולוגיה",
    symbol: "XLK",
    change: "-1.36%",
    value: "60.56",
    history: [64, 62, 63, 61, 59, 58, 60, 59, 58, 57],
  },
  {
    name: "בריאות",
    symbol: "XLV",
    change: "+1.27%",
    value: "24.13",
    history: [22, 23, 23.5, 24, 24.5, 25, 25.5, 25, 24.8, 24.6],
  },
  {
    name: "פיננסים",
    symbol: "XLF",
    change: "+5.32%",
    value: "142.96",
    history: [134, 135, 136, 138, 139, 140, 144, 145, 143, 142.96],
  },
  {
    name: "נדל״ן",
    symbol: "XLRE",
    change: "-1.12%",
    value: "154.35",
    history: [160, 158, 157, 156, 155, 154.5, 154.3, 154, 153.8, 154.35],
  },
  {
    name: "אנרגיה",
    symbol: "XLE",
    change: "+0.56%",
    value: "26.78",
    history: [24, 24.8, 25, 25.2, 25.5, 26, 26.3, 26.5, 26.6, 26.78],
  },
  {
    name: "תעשייה",
    symbol: "XLI",
    change: "+2.36%",
    value: "56.47",
    history: [50, 51, 52, 53, 54, 54.5, 55, 55.5, 56, 56.47],
  },
  {
    name: "שירותים",
    symbol: "XLU",
    change: "+7.53%",
    value: "251.36",
    history: [220, 223, 225, 227, 229, 232, 236, 241, 247, 251.36],
  },
  {
    name: "מוצרי מותרות",
    symbol: "XLY",
    change: "-0.63%",
    value: "47.58",
    history: [52, 51, 50.5, 50, 49.5, 49, 48.5, 48, 47.8, 47.58],
  },
  {
    name: "חומרי גלם",
    symbol: "XLB",
    change: "+4.84%",
    value: "63.26",
    history: [58, 58.5, 59, 60, 60.5, 61, 62, 62.5, 63, 63.26],
  },
  {
    name: "מוצרים חיוניים",
    symbol: "XLP",
    change: "+8.93%",
    value: "87.95",
    history: [75, 76, 77, 78, 79, 80, 82, 84, 86, 87.95],
  },
];

function parseChange(change: string) {
  const numeric = Number(change.replace("%", "").replace("+", ""));
  return Number.isNaN(numeric) ? 0 : numeric;
}

interface SparklineProps {
  data: number[];
  color: string;
  width?: number;
  height?: number;
}

function Sparkline({ data, color, width = 160, height = 24 }: SparklineProps) {
  if (data.length === 0) {
    return null;
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = width / Math.max(data.length - 1, 1);

  const points = data
    .map((value, index) => {
      const x = index * step;
      const normalized = (value - min) / range;
      const y = height - normalized * height;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ display: "block" }}
    >
      <polyline
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
        points={points}
      />
    </svg>
  );
}

const heatmapBlocks = [
  { label: "AAPL", value: "-0.48%", color: "#B64949", colSpan: 3, rowSpan: 3 },
  { label: "MSFT", value: "-0.06%", color: "#53595D", colSpan: 2, rowSpan: 3 },
  { label: "NVDA", value: "+0.04%", color: "#4DAF60", colSpan: 2, rowSpan: 3 },
  { label: "TSLA", value: "-3.68%", color: "#D63D39", colSpan: 2, rowSpan: 2 },
  { label: "AMZN", value: "+0.56%", color: "#4AA65D", colSpan: 2, rowSpan: 2 },
  { label: "GOOG", value: "-1.98%", color: "#C13C3C", colSpan: 3, rowSpan: 3 },
  { label: "META", value: "+0.45%", color: "#4AB05F", colSpan: 2, rowSpan: 2 },
  { label: "JPM", value: "+0.27%", color: "#46A65A", colSpan: 2, rowSpan: 2 },
  { label: "BRK-B", value: "+1.20%", color: "#5CC468", colSpan: 2, rowSpan: 2 },
  { label: "UNH", value: "-0.73%", color: "#B94141", colSpan: 2, rowSpan: 2 },
  { label: "PG", value: "+0.59%", color: "#47AC5E", colSpan: 2, rowSpan: 2 },
  { label: "WMT", value: "+0.16%", color: "#4AB164", colSpan: 2, rowSpan: 2 },
  { label: "NFLX", value: "+0.36%", color: "#49B065", colSpan: 1, rowSpan: 2 },
  { label: "INTC", value: "-1.73%", color: "#BE3F3F", colSpan: 1, rowSpan: 2 },
  { label: "COST", value: "-0.22%", color: "#A04444", colSpan: 2, rowSpan: 2 },
  { label: "PEP", value: "+0.26%", color: "#46AB63", colSpan: 1, rowSpan: 2 },
  { label: "KO", value: "-0.12%", color: "#A74B4B", colSpan: 1, rowSpan: 2 },
  { label: "XOM", value: "+0.31%", color: "#4CB168", colSpan: 2, rowSpan: 2 },
  { label: "XLY", value: "-0.63%", color: "#C04646", colSpan: 2, rowSpan: 2 },
  { label: "XLE", value: "+0.56%", color: "#4BB067", colSpan: 2, rowSpan: 2 },
  { label: "XLU", value: "+7.53%", color: "#68D77A", colSpan: 2, rowSpan: 2 },
  { label: "XLV", value: "+1.27%", color: "#5ACA6D", colSpan: 2, rowSpan: 2 },
  { label: "XLP", value: "+8.93%", color: "#73E182", colSpan: 2, rowSpan: 2 },
  { label: "XLB", value: "+4.84%", color: "#62D079", colSpan: 2, rowSpan: 2 },
];

interface ScaleProps {
  scale: number;
}

interface LeadingIndexData {
  symbol: string;
  change: string;
  price: string;
  chartData?: number[];
}

interface DigitalCurrencyData {
  symbol: string;
  change: string;
  price: string;
  chartData?: number[];
}

interface SectorData {
  name: string;
  symbol: string;
  change: string;
  value: string;
  history: number[];
}

type StatisticsTab = "market" | "trading" | "trends";

function SegmentedMenu({ activeTab }: { activeTab: StatisticsTab }) {
  const router = useRouter();

  const buttons: Array<{ label: string; tab: StatisticsTab; href: string }> = [
    { label: "מצב השוק", tab: "market", href: "/statistics" },
    { label: "מסחר", tab: "trading", href: "/statistics/trading" },
    { label: "מגמות", tab: "trends", href: "/statistics/trends" },
  ];

  return (
    <div className="flex justify-center">
      <div
        className="flex border border-[#2C2C2C] rounded-full overflow-hidden bg-[#111]"
        style={{ width: "264px", height: "38px" }}
      >
        {buttons.map(({ label, tab, href }, index) => (
          <Button
            key={tab}
            variant={activeTab === tab ? "default" : "outline"}
            size="sm"
            onClick={() => {
              if (activeTab !== tab) {
                router.push(href);
              }
            }}
            className={`rounded-none h-[38px] w-[88px] ${
              index !== 0 ? "border-0 border-l border-[#2C2C2C]" : ""
            } ${activeTab === tab ? "bg-[#FF6B35] text-white hover:bg-[#FF7A46]" : "text-[#B4B4B4] hover:bg-[#1F1F1F]"}`}
          >
            {label}
          </Button>
        ))}
      </div>
    </div>
  );
}

function LeadingIndexesRow({
  scale,
  data,
}: ScaleProps & { data: LeadingIndexData[] }) {
  const cardHeight = 140 * scale;
  const gap = 12 * scale;
  const boxHeight = 52 * scale;
  const padding = 16 * scale;
  const titleSize = Math.max(12, 16 * scale);
  const priceSize = Math.max(11, 14 * scale);
  const changeSize = Math.max(11, 14 * scale);

  return (
    <div
      className="flex"
      style={{
        width: "100%",
        gap: `${gap}px`,
        filter: "drop-shadow(0 18px 36px rgba(0,0,0,0.45))",
      }}
    >
      {data.map((item) => {
        const isPositive = !item.change.startsWith("-");
        const sparklineColor = isPositive ? "#2ECC71" : "#E74C3C";
        const chartData = item.chartData || [];

        return (
          <div
            key={item.symbol}
            style={{
              flex: "1 1 0",
              minWidth: 0,
              height: `${cardHeight}px`,
              background: "linear-gradient(180deg, #262626 0%, #171717 100%)",
              borderRadius: "18px",
              border: "1px solid #2B2B2B",
              padding: `${padding}px`,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              overflow: "hidden",
            }}
          >
            <div className="flex items-center justify-between">
              <span style={{ color: "#F5F5F5", fontWeight: 600, fontSize: `${titleSize}px` }}>
                {item.symbol}
              </span>
              <span style={{ color: "#959595", fontSize: `${priceSize}px` }}>{item.price}</span>
            </div>
            
            {/* Sparkline Chart */}
            <div
              style={{
                height: `${boxHeight}px`,
                borderRadius: "14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
              }}
            >
              {chartData.length > 0 ? (
                <Sparkline
                  data={chartData}
                  color={sparklineColor}
                  width={Math.floor(boxHeight * 2.5)}
                  height={Math.floor(boxHeight * 0.8)}
                />
              ) : (
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    borderRadius: "14px",
                    background:
                      "linear-gradient(180deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.02) 100%)",
                    border: "1px solid rgba(255,255,255,0.05)",
                  }}
                />
              )}
            </div>
            
            <div
              style={{
                color: sparklineColor,
                fontWeight: 600,
                fontSize: `${changeSize}px`,
              }}
            >
              {item.change}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DigitalCurrenciesRow({
  scale,
  data,
}: ScaleProps & { data: DigitalCurrencyData[] }) {
  const containerHeight = 130 * scale;
  const gap = 12 * scale;
  const cardHeight = 130 * scale;
  const padding = 12 * scale;
  const innerHeight = 36 * scale;
  const textSize = Math.max(10, 12 * scale);

  return (
    <div
      className="flex"
      style={{
        width: "100%",
        height: `${containerHeight}px`,
        gap: `${gap}px`,
        justifyContent: "space-between",
        overflow: "hidden",
      }}
    >
      {data.map((currency) => {
        const isPositive = !currency.change.startsWith("-");
        const sparklineColor = isPositive ? "#2ECC71" : "#E74C3C";
        const chartData = currency.chartData || [];

        return (
          <div
            key={currency.symbol}
            style={{
              flex: "1 1 0",
              minWidth: 0,
              height: `${cardHeight}px`,
              borderRadius: "14px",
              border: "1px solid #303030",
              background: "linear-gradient(180deg, #2B2B2B 0%, #1A1A1A 100%)",
              boxShadow: "0 12px 24px rgba(0,0,0,0.35)",
              padding: `${padding}px`,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              overflow: "hidden",
            }}
          >
            <div className="flex items-center justify-between text-xs text-[#A7A7A7]">
              <span style={{ fontSize: `${textSize}px` }}>{currency.symbol}</span>
              <span style={{ fontSize: `${textSize}px` }}>{currency.price}</span>
            </div>
            
            {/* Sparkline Chart */}
            <div
              style={{
                width: "100%",
                height: `${innerHeight}px`,
                borderRadius: "10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
              }}
            >
              {chartData.length > 0 ? (
                <Sparkline
                  data={chartData}
                  color={sparklineColor}
                  width={Math.floor(innerHeight * 3)}
                  height={Math.floor(innerHeight * 0.7)}
                />
              ) : (
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    borderRadius: "10px",
                    background:
                      "linear-gradient(180deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.05) 100%)",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                />
              )}
            </div>
            
            <div
              className="text-xs font-semibold"
              style={{ color: sparklineColor }}
            >
              {currency.change}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ShekelCard({
  scale,
  rates,
}: ScaleProps & { rates: { dollar: string; euro: string; yen: string; rupee: string } }) {
  const height = 70 * scale;
  const paddingX = 16 * scale;
  const fontSize = Math.max(12, 14 * scale);

  return (
    <div
      style={{
        width: "100%",
        height: `${height}px`,
        borderRadius: "12px",
        border: "1px solid #303030",
        background: "linear-gradient(180deg, #252525 0%, #181818 100%)",
        boxShadow: "0 10px 20px rgba(0,0,0,0.3)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: `0 ${paddingX}px`,
        fontSize: `${fontSize}px`,
        color: "#F0F0F0",
        overflow: "hidden",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <span style={{ fontSize: "0.7em", color: "#959595" }}>דולר</span>
        <span>{rates.dollar}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <span style={{ fontSize: "0.7em", color: "#959595" }}>יורו</span>
        <span>{rates.euro}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <span style={{ fontSize: "0.7em", color: "#959595" }}>יין</span>
        <span>{rates.yen}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <span style={{ fontSize: "0.7em", color: "#959595" }}>רופי</span>
        <span>{rates.rupee}</span>
      </div>
    </div>
  );
}

function HeatmapCard({ scale }: ScaleProps) {
  const padding = 16 * scale;
  const gap = 6 * scale;
  const rowHeight = 48 * scale;

  return (
    <div
      style={{
        width: "100%",
        flex: "1 1 auto",
        minHeight: 0,
        borderRadius: "20px",
        border: "1px solid #2E2E2E",
        background: "linear-gradient(180deg, #1F1F1F 0%, #131313 100%)",
        boxShadow: "0 22px 42px rgba(0,0,0,0.5)",
        padding: `${padding}px`,
        overflow: "hidden",
      }}
    >
      <div
        className="grid"
        style={{
          height: "100%",
          gridTemplateColumns: "repeat(12, 1fr)",
          gridAutoRows: `${rowHeight}px`,
          gap: `${gap}px`,
        }}
      >
        {heatmapBlocks.map((block, idx) => (
          <div
            key={`${block.label}-${idx}`}
            style={{
              gridColumn: `span ${block.colSpan}`,
              gridRow: `span ${block.rowSpan}`,
              borderRadius: "10px",
              border: "1px solid rgba(0,0,0,0.35)",
              background: block.color,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              color: "#F8F8F8",
              fontWeight: 600,
              fontSize: "12px",
              boxShadow: "inset 0 0 18px rgba(0,0,0,0.3)",
            }}
          >
            <span>{block.label}</span>
            <span style={{ fontSize: "10px", fontWeight: 400 }}>{block.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SectorsPanel({ scale, data }: ScaleProps & { data: SectorData[] }) {
  const paddingVertical = 20 * scale;
  const paddingHorizontal = 28 * scale;
  const titleMargin = 12 * scale;
  const rowHeight = Math.max(32, 40 * scale);
  const sparkWidth = 160 * scale;
  const sparkHeight = 24 * scale;
  const nameWidth = 190 * scale;
  const symbolWidth = 70 * scale;
  const valueLabelWidth = 90 * scale;
  const valueWidth = 110 * scale;
  const changeWidth = 80 * scale;
  const sparkCellWidth = 200 * scale;
  const sparkPadding = Math.max(4, 8 * scale);

  return (
    <div
      style={{
        flex: "1 1 0",
        minWidth: 0,
        height: "100%",
        borderRadius: "20px",
        border: "1px solid #2E2E2E",
        background: "linear-gradient(180deg, #1E1E1E 0%, #141414 100%)",
        boxShadow: "0 20px 40px rgba(0,0,0,0.45)",
        padding: `${paddingVertical}px ${paddingHorizontal}px`,
        boxSizing: "border-box",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          fontSize: `${Math.max(14, 16 * scale)}px`,
          fontWeight: 600,
          color: "#F1F1F1",
          marginBottom: `${titleMargin}px`,
        }}
      >
        סקטורים
      </div>
      <div style={{ flex: "1 1 auto", overflowY: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11.5px" }}>
          <tbody>
            {data.map((sector) => {
              const numericChange = parseChange(sector.change);
              const sparkColor = numericChange >= 0 ? "#2ECC71" : "#E74C3C";
              return (
                <tr
                  key={sector.symbol}
                  style={{
                    height: `${rowHeight}px`,
                    borderBottom: "1px solid #2A2A2A",
                  }}
                >
                  <td style={{ width: `${nameWidth}px`, color: "#F5F5F5", fontWeight: 500 }}>
                    {sector.name}
                  </td>
                  <td style={{ width: `${symbolWidth}px`, color: "#8E8E8E" }}>({sector.symbol})</td>
                  <td style={{ width: `${valueLabelWidth}px`, color: "#8E8E8E" }}>ערך</td>
                  <td style={{ width: `${valueWidth}px`, color: "#E0E0E0" }}>{sector.value}</td>
                  <td
                    style={{
                      width: `${changeWidth}px`,
                      fontWeight: 600,
                      color: numericChange >= 0 ? "#2ECC71" : "#E74C3C",
                    }}
                  >
                    {sector.change}
                  </td>
                  <td
                    style={{
                      width: `${sparkCellWidth}px`,
                      paddingInlineStart: `${sparkPadding}px`,
                    }}
                  >
                    <Sparkline
                      data={sector.history}
                      color={sparkColor}
                      height={sparkHeight}
                      width={sparkWidth}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function StatisticsPage() {
  const router = useRouter();
  const headerRef = useRef<HTMLDivElement>(null);
  const dashboardRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  // Yahoo Finance for historical data (charts only - IBKR doesn't provide this)
  const fetchYahooHistorical = useAction(api.yahooFinance.fetchHistoricalData);

  // Get market data from Convex cache (smart caching system)
  // Each hook automatically refreshes data every 30 seconds
  const spyData = useRealtimeMarketData("SPY");
  const qqqData = useRealtimeMarketData("QQQ");
  const iwmData = useRealtimeMarketData("IWM");
  
  const btcData = useRealtimeMarketData("BTC-USD");
  const ethData = useRealtimeMarketData("ETH-USD");
  const solData = useRealtimeMarketData("SOL-USD");

  // State for chart data (from Yahoo Finance)
  const [leadingIndexesCharts, setLeadingIndexesCharts] = useState<Record<string, number[]>>({});
  const [digitalCurrenciesCharts, setDigitalCurrenciesCharts] = useState<Record<string, number[]>>({});
  const [sectorsCharts, setSectorsCharts] = useState<Record<string, number[]>>({});
  
  const [currencyRates, setCurrencyRates] = useState({
    dollar: "0.00",
    euro: "0.00",
    yen: "0.00",
    rupee: "0.00",
  });

  // Load historical charts from Yahoo Finance (one-time load per symbol)
  // Note: Price data is automatically refreshed by useRealtimeMarketData hooks above
  useEffect(() => {
    const loadCharts = async () => {
      for (const symbol of LEADING_INDEX_SYMBOLS) {
        try {
          const historical = await fetchYahooHistorical({ symbol, period: "1y" });
          if (historical && historical.chartData && historical.chartData.length > 0) {
            setLeadingIndexesCharts((prev) => ({
              ...prev,
              [symbol]: historical.chartData,
            }));
          }
        } catch (error) {
          console.error(`Error loading chart for ${symbol}:`, error);
        }
      }
    };
    loadCharts();
  }, [fetchYahooHistorical]);

  // Load digital currencies charts from Yahoo Finance
  // Note: Price data is automatically refreshed by useRealtimeMarketData hooks above
  useEffect(() => {
    const loadCharts = async () => {
      for (const symbol of DIGITAL_CURRENCY_SYMBOLS) {
        try {
          const historical = await fetchYahooHistorical({ symbol, period: "1y" });
          if (historical && historical.chartData && historical.chartData.length > 0) {
            const displaySymbol = symbol.replace("-USD", "");
            setDigitalCurrenciesCharts((prev) => ({
              ...prev,
              [displaySymbol]: historical.chartData,
            }));
          }
        } catch (error) {
          console.error(`Error loading chart for ${symbol}:`, error);
        }
      }
    };
    loadCharts();
  }, [fetchYahooHistorical]);

  // Get sectors market data from Convex cache
  // Each sector will be refreshed via useRealtimeMarketData hooks
  // For now, we'll use the query for immediate data, but each sector will auto-refresh
  const sectorSymbols = sectors.map((s) => s.symbol);
  const sectorsMarketData = useQuery(api.marketData.getMultipleMarketData, {
    symbols: sectorSymbols,
  });

  // Refresh sectors data (client-side fetch to IBKR, then store in Convex)
  const storeSectorData = useAction(api.marketData.storeMarketDataFromClient);
  const fetchSectorYahoo = useAction(api.marketData.fetchAndCacheMarketData);

  useEffect(() => {
    if (!sectorSymbols || sectorSymbols.length === 0) return;

    const fetchSectorData = async (sym: string) => {
      try {
        // Try IBKR first with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 seconds timeout
        
        let ibkrRes: Response;
        try {
          ibkrRes = await fetch(`/api/ibkr/market-data/snapshot?symbol=${sym}`, {
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
        } catch (fetchError: any) {
          clearTimeout(timeoutId);
          if (fetchError.name === 'AbortError' || fetchError.message?.includes('aborted')) {
            console.warn(`⚠️ [Statistics] IBKR request timeout for ${sym} - falling back to Yahoo Finance`);
            // Don't throw - fall through to Yahoo Finance fallback
            await fetchSectorYahoo({ symbol: sym }).catch(console.error);
            return;
          } else {
            console.warn(`⚠️ [Statistics] IBKR fetch failed for ${sym}:`, fetchError.message || String(fetchError));
            // Fall through to Yahoo Finance fallback
            throw fetchError;
          }
        }
        
        if (ibkrRes.ok) {
          const snapshot = await ibkrRes.json().catch((jsonError) => {
            console.error(`❌ [Statistics] Failed to parse JSON for ${sym}:`, jsonError);
            throw new Error("Invalid JSON response from IBKR");
          });
          
          const lastPrice = parseFloat(snapshot["31"] || "0");
          const closePrice = parseFloat(snapshot["7295"] || "0");
          const volume = parseFloat(snapshot["7308"] || "0");

          if (lastPrice > 0 && closePrice > 0) {
            const change = lastPrice - closePrice;
            const changePercent = (change / closePrice) * 100;

            await storeSectorData({
              symbol: sym,
              price: lastPrice,
              change,
              changePercent,
              volume,
              source: "ibkr",
            });
            return;
          } else {
            console.warn(`⚠️ [Statistics] IBKR returned invalid data for ${sym} (price: ${lastPrice}, close: ${closePrice})`);
          }
        } else {
          const errorText = await ibkrRes.text().catch(() => "");
          console.warn(`⚠️ [Statistics] IBKR HTTP ${ibkrRes.status} for ${sym}: ${errorText.substring(0, 100)}`);
        }

        // Fallback to Yahoo Finance
        await fetchSectorYahoo({ symbol: sym });
      } catch (error) {
        console.error(`Error fetching sector data for ${sym}:`, error);
        try {
          await fetchSectorYahoo({ symbol: sym });
        } catch (yahooError) {
          console.error(`Yahoo Finance also failed for ${sym}:`, yahooError);
        }
      }
    };

    // Initial fetch
    sectorSymbols.forEach((sym) => {
      fetchSectorData(sym).catch(console.error);
    });

    // Refresh every 30 seconds
    const interval = setInterval(() => {
      sectorSymbols.forEach((sym) => {
        fetchSectorData(sym).catch(console.error);
      });
    }, 30000);

    return () => clearInterval(interval);
  }, [sectorSymbols.join(","), storeSectorData, fetchSectorYahoo]);

  // Load sectors charts from Yahoo Finance
  useEffect(() => {
    const loadCharts = async () => {
      for (const sector of sectors) {
        try {
          const historical = await fetchYahooHistorical({ symbol: sector.symbol, period: "1y" });
          if (historical && historical.chartData && historical.chartData.length > 0) {
            setSectorsCharts((prev) => ({
              ...prev,
              [sector.symbol]: historical.chartData,
            }));
          }
        } catch (error) {
          console.error(`Error loading chart for ${sector.symbol}:`, error);
        }
      }
    };
    loadCharts();
  }, [fetchYahooHistorical, sectors.map((s) => s.symbol).join(",")]);

  // Fetch currency rates (ILS exchange rates) from IBKR
  useEffect(() => {
    const fetchCurrencies = async () => {
      try {
        const [dollarRes, euroRes, yenRes, rupeeRes] = await Promise.all([
          fetch(`/api/ibkr/market-data/snapshot?symbol=${CURRENCY_SYMBOLS.dollar}`),
          fetch(`/api/ibkr/market-data/snapshot?symbol=${CURRENCY_SYMBOLS.euro}`),
          fetch(`/api/ibkr/market-data/snapshot?symbol=${CURRENCY_SYMBOLS.yen}`),
          fetch(`/api/ibkr/market-data/snapshot?symbol=${CURRENCY_SYMBOLS.rupee}`),
        ]);

        if (dollarRes.ok && euroRes.ok && yenRes.ok && rupeeRes.ok) {
          const [dollarSnapshot, euroSnapshot, yenSnapshot, rupeeSnapshot] = await Promise.all([
            dollarRes.json(),
            euroRes.json(),
            yenRes.json(),
            rupeeRes.json(),
          ]);

          setCurrencyRates({
            dollar: parseFloat(dollarSnapshot["31"] || "0").toFixed(2),
            euro: parseFloat(euroSnapshot["31"] || "0").toFixed(2),
            yen: parseFloat(yenSnapshot["31"] || "0").toFixed(4),
            rupee: parseFloat(rupeeSnapshot["31"] || "0").toFixed(4),
          });
        }
      } catch (error) {
        console.error("Error fetching currency rates:", error);
      }
    };

    fetchCurrencies();
    const interval = setInterval(fetchCurrencies, 5 * 60 * 1000); // 5 minutes
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const DESIGN_WIDTH = 1344;
    const DESIGN_HEIGHT = 1080;

    const recalc = () => {
      if (typeof window === "undefined" || !dashboardRef.current) {
        return;
      }
      const headerHeight = headerRef.current?.offsetHeight ?? 0;
      const dashboardRect = dashboardRef.current.getBoundingClientRect();

      // Calculate available space within the dashboard container
      const containerPadding = 24; // padding inside the dashboard wrapper
      const availableWidth = dashboardRect.width - containerPadding;
      const availableHeight = dashboardRect.height - containerPadding;

      const widthRatio = availableWidth / DESIGN_WIDTH;
      const heightRatio = availableHeight / DESIGN_HEIGHT;
      setScale(Math.min(widthRatio, heightRatio, 1.2)); // cap at 1.2x
    };

    // Use setTimeout to ensure DOM is ready
    const timeoutId = setTimeout(recalc, 100);
    window.addEventListener("resize", recalc);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("resize", recalc);
    };
  }, []);

  const dashboardWidth = useMemo(() => 1344 * scale, [scale]);
  const dashboardGap = 12 * scale;
  const dashboardPadding = 12 * scale;

  // Build leading indexes array from hooks data
  const leadingIndexes = useMemo(() => {
    return [
      {
        symbol: "SPY",
        price: spyData.price > 0 ? `$${spyData.price.toFixed(2)}` : "0.00",
        change: spyData.changePercent !== 0 
          ? `${spyData.changePercent >= 0 ? "+" : ""}${spyData.changePercent.toFixed(2)}%`
          : "0.00%",
        chartData: leadingIndexesCharts["SPY"] || [],
      },
      {
        symbol: "QQQ",
        price: qqqData.price > 0 ? `$${qqqData.price.toFixed(2)}` : "0.00",
        change: qqqData.changePercent !== 0
          ? `${qqqData.changePercent >= 0 ? "+" : ""}${qqqData.changePercent.toFixed(2)}%`
          : "0.00%",
        chartData: leadingIndexesCharts["QQQ"] || [],
      },
      {
        symbol: "IWM",
        price: iwmData.price > 0 ? `$${iwmData.price.toFixed(2)}` : "0.00",
        change: iwmData.changePercent !== 0
          ? `${iwmData.changePercent >= 0 ? "+" : ""}${iwmData.changePercent.toFixed(2)}%`
          : "0.00%",
        chartData: leadingIndexesCharts["IWM"] || [],
      },
    ];
  }, [spyData, qqqData, iwmData, leadingIndexesCharts]);

  // Build digital currencies array from hooks data
  const digitalCurrencies = useMemo(() => {
    return [
      {
        symbol: "BTC",
        price: btcData.price > 0
          ? btcData.price.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })
          : "0",
        change: btcData.changePercent !== 0
          ? `${btcData.changePercent >= 0 ? "+" : ""}${btcData.changePercent.toFixed(2)}%`
          : "0.00%",
        chartData: digitalCurrenciesCharts["BTC"] || [],
      },
      {
        symbol: "ETH",
        price: ethData.price > 0
          ? ethData.price.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })
          : "0",
        change: ethData.changePercent !== 0
          ? `${ethData.changePercent >= 0 ? "+" : ""}${ethData.changePercent.toFixed(2)}%`
          : "0.00%",
        chartData: digitalCurrenciesCharts["ETH"] || [],
      },
      {
        symbol: "SOL",
        price: solData.price > 0
          ? solData.price.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })
          : "0",
        change: solData.changePercent !== 0
          ? `${solData.changePercent >= 0 ? "+" : ""}${solData.changePercent.toFixed(2)}%`
          : "0.00%",
        chartData: digitalCurrenciesCharts["SOL"] || [],
      },
    ];
  }, [btcData, ethData, solData, digitalCurrenciesCharts]);

  // Build sectors array from hooks data
  const sectorsData = useMemo(() => {
    if (!sectorsMarketData) return sectors;
    
    return sectors.map((sector) => {
      const marketData = sectorsMarketData[sector.symbol];
      const chartData = sectorsCharts[sector.symbol] || sector.history;
      
      if (marketData) {
        return {
          ...sector,
          value: marketData.price.toFixed(2),
          change: `${marketData.changePercent >= 0 ? "+" : ""}${marketData.changePercent.toFixed(2)}%`,
          history: chartData,
        };
      }
      
      return {
        ...sector,
        history: chartData,
      };
    });
  }, [sectorsMarketData, sectorsCharts, sectors]);

  return (
    <div
      className="flex flex-col"
      style={{ width: "100vw", height: "100vh", overflow: "hidden", backgroundColor: "#101010" }}
      dir="rtl"
    >
      <header
        ref={headerRef}
        className="box-border"
        style={{ padding: "20px 48px 12px 48px", flexShrink: 0 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center" style={{ gap: "12px", flexDirection: "row-reverse" }}>
            <Button
              type="button"
              disabled={true}
              variant="outline"
              size="icon"
              aria-label="מקש שפה (מושבת)"
              className="rounded-full border-[#2A2A2A] bg-[#1A1A1A] text-[#6F6F6F] cursor-not-allowed h-[44px] w-[44px]"
            >
              פר
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-[36px] rounded-full border-[#2E2E2E] bg-[#171717] px-[20px] text-[#F5F5F5] hover:bg-[#232323]"
              onClick={() => router.push("/")}
            >
              חזור
            </Button>
          </div>
          <div className="flex items-center" style={{ gap: "16px" }}>
            <AppLogo />
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full border border-[#2E2E2E] bg-[#171717] text-[#F5F5F5] hover:bg-[#232323]"
            >
              ⚙️
            </Button>
          </div>
        </div>
        <div className="mt-[16px] flex justify-center">
          <SegmentedMenu activeTab="market" />
        </div>
      </header>

      <main
        style={{
          display: "flex",
          width: "100vw",
          direction: "ltr",
          overflow: "hidden",
          flex: 1,
          minHeight: 0,
        }}
      >
        <div
          id="main-layout"
          style={{
            display: "flex",
            width: "100%",
            height: "100%",
            minHeight: 0,
            overflow: "hidden",
            padding: "8px 48px 0 48px",
            boxSizing: "border-box",
            gap: "24px",
          }}
        >
          <div
            ref={dashboardRef}
            id="dashboard-area"
            style={{
              flex: "1 1 auto",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              minHeight: 0,
              minWidth: 0,
            }}
          >
            <div
              className="flex flex-col"
              style={{
                flex: "1 1 auto",
                width: "100%",
                height: "100%",
                gap: `${dashboardGap}px`,
                padding: `${dashboardPadding}px`,
                backgroundColor: "#181818",
                borderRadius: "22px",
                border: "1px solid #242424",
                boxShadow: "0 22px 45px rgba(0,0,0,0.45)",
                boxSizing: "border-box",
                overflow: "hidden",
                minHeight: 0,
                minWidth: 0,
              }}
              dir="rtl"
            >
              <LeadingIndexesRow scale={scale} data={leadingIndexes} />
              <div
                className="flex"
                style={{
                  gap: `${dashboardGap}px`,
                  height: "100%",
                  overflow: "hidden",
                  minHeight: 0,
                  alignItems: "stretch",
                }}
              >
                <SectorsPanel scale={scale} data={sectorsData} />
                <div
                  className="flex flex-col"
                  style={{
                    flex: "1 1 0",
                    minWidth: 0,
                    gap: `${dashboardGap}px`,
                    overflow: "hidden",
                    height: "100%",
                    alignSelf: "stretch",
                  }}
                >
                  <DigitalCurrenciesRow scale={scale} data={digitalCurrencies} />
                  <ShekelCard scale={scale} rates={currencyRates} />
                  <HeatmapCard scale={scale} />
                </div>
              </div>
            </div>
          </div>

          <aside
            id="chat-area"
            style={{
              flex: "0 0 352px",
              width: "352px",
              height: "100%",
              overflow: "hidden",
              display: "flex",
            }}
            dir="rtl"
          >
            <div
              style={{
                width: "100%",
                padding: "24px",
                borderRadius: "22px",
                border: "1px solid #2B2B2B",
                background: "linear-gradient(180deg, #1F1F1F 0%, #111111 100%)",
                boxShadow: "0 24px 50px rgba(0,0,0,0.5)",
                boxSizing: "border-box",
              }}
            >
              <div
                className="h-full rounded-[18px]"
                style={{
                  padding: "20px",
                  backgroundColor: "#161616",
                  border: "1px solid #252525",
                  boxShadow: "inset 0 0 28px rgba(0,0,0,0.35)",
                  height: "100%",
                }}
              >
                <AIChatPanel />
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
