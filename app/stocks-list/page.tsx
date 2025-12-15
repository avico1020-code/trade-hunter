"use client";

import { useMutation } from "convex/react";
import { useState } from "react";
import { AIChatPanel } from "@/components/main-screen/AIChatPanel";
import { ChartPanel } from "@/components/stocks-list/ChartPanel";
import { InformationPanel } from "@/components/stocks-list/InformationPanel";
import { StocksListHeader } from "@/components/stocks-list/StocksListHeader";
import { StocksTable } from "@/components/stocks-list/StocksTable";
import { TradeManagementList } from "@/components/stocks-list/TradeManagementList";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { STRATEGY_DATABASE } from "@/data/strategies";

export default function StocksListPage() {
  const addStrategyToList = useMutation(api.stocksLists.addStrategyToList);

  const [selectedStock, setSelectedStock] = useState<
    | {
        id: Id<"listStocks">;
        symbol: string;
        price: number;
        volume: number;
        changePercent: number;
      }
    | undefined
  >();

  const handleAddStrategy = async (strategyName: string) => {
    // Map strategy display name to type
    const strategyTypeMap: Record<string, string> = {
      "דאבל טופ": "double-top",
      "דאבל בוטום": "double-bottom",
      "גאפ אפ": "gap-up",
      "גאפ דאון": "gap-down",
      רברסל: "reversal",
    };

    const strategyType =
      strategyTypeMap[strategyName] || strategyName.toLowerCase().replace(" ", "-");

    try {
      await addStrategyToList({
        strategyName,
        strategyType,
      });
    } catch (error) {
      console.error("Error adding strategy:", error);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <StocksListHeader />

      {/* Main Content Area */}
      <main className="flex-1 relative">
        {/* Center Area - Stocks List - Flexible width in middle with margins for sidebars */}
        <section className="ml-[45%] mr-[30%] px-6 py-6">
          <StocksTable
            onSelectStock={(stock) => setSelectedStock(stock)}
            selectedStockSymbol={selectedStock?.symbol}
            availableStrategies={STRATEGY_DATABASE}
            onAddStrategy={handleAddStrategy}
          />
        </section>

        {/* Right Sidebar - Fixed to right edge (Information Panel + AI Chat) */}
        <aside
          className="fixed right-0 bottom-0 w-[30%] max-w-[400px] p-6 space-y-6 overflow-y-auto border-r bg-background"
          style={{ top: "calc(64px + 1rem)" }}
        >
          <div className="h-[400px]">
            <InformationPanel selectedStockSymbol={selectedStock?.symbol} />
          </div>
          <div className="h-[500px]">
            <AIChatPanel />
          </div>
        </aside>

        {/* Left Sidebar - Fixed to left edge (Chart + Trade Management) */}
        <aside
          className="fixed left-0 bottom-0 w-[45%] max-w-[600px] p-6 space-y-6 overflow-y-auto border-l bg-background"
          style={{ top: "calc(64px + 1rem)" }}
        >
          <div className="h-[500px]">
            <ChartPanel selectedStock={selectedStock} />
          </div>
          <div>
            <TradeManagementList />
          </div>
        </aside>
      </main>
    </div>
  );
}
