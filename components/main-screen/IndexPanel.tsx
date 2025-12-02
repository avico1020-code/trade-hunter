"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRealtimeMarketData } from "@/lib/hooks/useRealtimeMarketData";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEffect, useState } from "react";
import type { Id } from "@/convex/_generated/dataModel";

interface MiniSparklineProps {
  data: number[];
  color: string;
}

function MiniSparkline({ data, color }: MiniSparklineProps) {
  if (!data || data.length === 0) {
    return <div className="w-full h-full rounded-lg bg-muted/30" />;
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * 100;
      const y = 100 - ((value - min) / range) * 100;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

interface IndexPanelProps {
  id: Id<"userIndexPanels">;
  symbol: string;
  onDelete: () => void;
}

export function IndexPanel({ id, symbol, onDelete }: IndexPanelProps) {
  const { price, changePercent, source, isLoading } = useRealtimeMarketData(symbol);
  const fetchHistorical = useAction(api.yahooFinance.fetchHistoricalData);
  const [historicalData, setHistoricalData] = useState<number[]>([]);

  const isPositive = changePercent >= 0;
  const sparklineColor = isPositive ? "#10b981" : "#ef4444";

  // Fetch historical data from Yahoo Finance for sparkline
  useEffect(() => {
    if (symbol && price > 0 && historicalData.length === 0) {
      // Only fetch once when price becomes available
      let cancelled = false;
      
      fetchHistorical({ symbol, period: "1y" })
        .then((result) => {
          if (cancelled) return;
          
          if (result && result.chartData && result.chartData.length > 0) {
            setHistoricalData(result.chartData);
            console.log(`📊 [IndexPanel] Loaded ${result.chartData.length} historical points for ${symbol} (Yahoo Finance)`);
          }
        })
        .catch((error) => {
          if (cancelled) return;
          
          // Handle Convex connection errors gracefully
          const errorMessage = error instanceof Error ? error.message : String(error);
          if (errorMessage.includes("Connection lost") || errorMessage.includes("Connection closed")) {
            console.warn(`⚠️ [IndexPanel] Convex connection lost for ${symbol} historical data - will retry later`);
            // Don't show error to user, just log it
          } else {
            console.error(`❌ [IndexPanel] Error fetching historical data for ${symbol}:`, error);
          }
        });
      
      return () => {
        cancelled = true;
      };
    }
  }, [symbol, price, fetchHistorical, historicalData.length]);

  return (
    <Card key={id}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{symbol}</CardTitle>
            {source && (
              <span
                className={`text-xs font-medium ${
                  source === "ibkr"
                    ? "text-green-500"
                    : "text-blue-500"
                }`}
              >
                {source === "ibkr" ? "📡 IBKR Real-time" : "📰 Yahoo Finance"}
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onDelete}
            aria-label={`מחק ${symbol}`}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground text-sm">מחיר</span>
            <span
              className={`font-semibold text-lg ${
                isPositive ? "text-green-600" : "text-red-600"
              }`}
            >
              {isLoading ? "..." : price > 0 ? `$${price.toFixed(2)}` : "N/A"}
            </span>
          </div>

          {/* Sparkline Chart */}
          <div className="w-full h-12">
            {isLoading || historicalData.length === 0 ? (
              <div className="w-full h-full rounded-lg bg-muted/30 animate-pulse" />
            ) : (
              <MiniSparkline data={historicalData} color={sparklineColor} />
            )}
          </div>

          <div className="flex justify-between items-center">
            <span className="text-muted-foreground text-sm">שינוי</span>
            <span
              className={`font-semibold ${isPositive ? "text-green-600" : "text-red-600"}`}
            >
              {isLoading
                ? "..."
                : price > 0
                  ? `${isPositive ? "+" : ""}${changePercent.toFixed(2)}%`
                  : "N/A"}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

