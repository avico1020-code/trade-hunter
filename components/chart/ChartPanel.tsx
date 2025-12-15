"use client";

/**
 * ChartPanel Component
 *
 * פאנל גרף מלא עם:
 * - כותרת סימבול
 * - בורר timeframe
 * - גרף נרות
 *
 * סגנון TradingView כהה
 */

import { useState } from "react";
import { CandlestickChart } from "./CandlestickChart";
import { type Timeframe, TimeframeSelector } from "./TimeframeSelector";

interface ChartPanelProps {
  symbol: string;
}

export function ChartPanel({ symbol }: ChartPanelProps) {
  const [timeframe, setTimeframe] = useState<Timeframe>("1m");

  return (
    <div
      style={{
        background: "#0f0f0f",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        padding: 12,
        borderRadius: 8,
        border: "1px solid #1f1f1f",
      }}
    >
      {/* Header: Symbol + Timeframe selector */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          marginBottom: 8,
          paddingBottom: 8,
          borderBottom: "1px solid #1f1f1f",
          flexShrink: 0,
        }}
      >
        <h2
          style={{
            color: "#d1d4dc",
            marginRight: 16,
            fontSize: 18,
            fontWeight: 600,
            margin: 0,
          }}
        >
          {symbol}
        </h2>
        <TimeframeSelector value={timeframe} onChange={setTimeframe} />
      </div>

      {/* Chart - takes remaining space */}
      <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
        <CandlestickChart symbol={symbol} timeframe={timeframe} />
      </div>
    </div>
  );
}
