"use client";

import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export function TradeManagementList() {
  // Get only active (open) trades - real-time data
  const activeTrades = useQuery(api.stocksLists.getActiveTrades);

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-right p-4 font-semibold">סימבול</th>
                <th className="text-right p-4 font-semibold">מחיר כניסה</th>
                <th className="text-right p-4 font-semibold">מחיר נוכחי</th>
                <th className="text-right p-4 font-semibold">אסטרטגיה</th>
                <th className="text-right p-4 font-semibold">רווח/הפסד לא ממומש</th>
              </tr>
            </thead>
            <tbody>
              {!activeTrades || activeTrades.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground">
                    אין עסקאות פעילות כרגע
                  </td>
                </tr>
              ) : (
                activeTrades.map((trade) => (
                  <tr key={trade._id} className="border-b hover:bg-muted/50">
                    <td className="p-4 font-medium">{trade.symbol}</td>
                    <td className="p-4">${trade.entryPrice.toFixed(2)}</td>
                    <td className="p-4">${trade.currentPrice.toFixed(2)}</td>
                    <td className="p-4">{trade.strategyType}</td>
                    <td
                      className={`p-4 font-semibold ${
                        trade.unrealizedPnL >= 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {trade.unrealizedPnL >= 0 ? "+" : ""}${trade.unrealizedPnL.toFixed(2)} (
                      {trade.unrealizedPnLPercent >= 0 ? "+" : ""}
                      {trade.unrealizedPnLPercent.toFixed(2)}%)
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
