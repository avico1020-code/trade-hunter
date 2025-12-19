"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import dynamic from "next/dynamic";
import { useState } from "react";
import { TimeframeSelector, type Timeframe } from "@/components/chart/TimeframeSelector";

const CandlestickChart = dynamic(
  () => import("@/components/chart/CandlestickChart").then((mod) => ({ default: mod.CandlestickChart })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-muted-foreground">טוען גרף...</p>
      </div>
    ),
  }
);

interface ChartPanelProps {
  selectedStock?: {
    symbol: string;
    price: number;
    volume: number;
    changePercent: number;
  };
}

export function ChartPanel({ selectedStock }: ChartPanelProps) {
  const [timeframe, setTimeframe] = useState<Timeframe>("1m");

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between gap-4 pb-3">
        <div className="flex items-center gap-3">
          <CardTitle className="mb-0">
            {selectedStock ? selectedStock.symbol : "גרף"}
          </CardTitle>
          {selectedStock && (
            <span className="text-sm text-muted-foreground">
              ${selectedStock.price.toFixed(2)}
              {selectedStock.changePercent !== 0 && (
                <span className={selectedStock.changePercent > 0 ? "text-green-500" : "text-red-500"}>
                  {" "}
                  {selectedStock.changePercent > 0 ? "+" : ""}
                  {selectedStock.changePercent.toFixed(2)}%
                </span>
              )}
            </span>
          )}
        </div>
        {selectedStock && (
          <TimeframeSelector value={timeframe} onChange={setTimeframe} />
        )}
      </CardHeader>
      <CardContent className="flex-1 p-0 overflow-hidden">
        {selectedStock ? (
          <div className="w-full h-full min-h-[400px] relative">
            <CandlestickChart symbol={selectedStock.symbol} timeframe={timeframe} />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-muted-foreground text-center">
              בחר מניה מהרשימה כדי לראות את הגרף
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
