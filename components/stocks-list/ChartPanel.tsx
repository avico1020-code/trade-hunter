"use client";

/**
 * ChartPanel - Stocks List Page
 *
 * מציג גרף TradingView מקצועי עם נרות בזמן אמת
 * משולב עם רשימת המניות
 */

import { ChartPanel as TradingViewChart } from "@/components/chart/ChartPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ChartPanelProps {
  selectedStock?: {
    symbol: string;
    price: number;
    volume: number;
    changePercent: number;
  };
}

export function ChartPanel({ selectedStock }: ChartPanelProps) {
  return (
    <Card className="h-full flex flex-col overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle>גרף</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-0 overflow-hidden flex flex-col">
        {selectedStock ? (
          <div className="w-full h-full flex-1 min-h-0">
            <TradingViewChart key={selectedStock.symbol} symbol={selectedStock.symbol} />
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
