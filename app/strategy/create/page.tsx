"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { CreateStrategyHeader } from "@/components/create-strategy/CreateStrategyHeader";
import { CreateStrategyParams } from "@/components/create-strategy/CreateStrategyParams";
import { AIChatPanel } from "@/components/main-screen/AIChatPanel";

function CreateStrategyContent() {
  const searchParams = useSearchParams();
  const strategyName = searchParams.get("name") || "אסטרטגיה חדשה";

  const [strategyData, setStrategyData] = useState({
    tradeDirection: "long" as "long" | "short",
    timeframe: "",
    indicators: [] as Array<{ id: string; name: string; value: string }>,
    entryTrigger: null as any,
    exitTrigger: null as any,
    stop: { value: "", type: "$" as "$" | "%" },
  });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <CreateStrategyHeader />

      {/* Main Content Area */}
      <main className="flex-1 relative overflow-hidden" style={{ height: "calc(100vh - 64px)" }}>
        {/* Center Area - Parameters Column - Flexible width with margins for fixed sidebars */}
        <section className="ml-[45%] mr-[30%] px-4 py-6 overflow-y-auto">
          <CreateStrategyParams
            strategyData={strategyData}
            onUpdateStrategyData={setStrategyData}
          />
        </section>

        {/* Right Sidebar - Fixed to right edge (AI Chat) */}
        <aside
          className="fixed right-0 bottom-0 w-[30%] max-w-[400px] p-6 border-r bg-background overflow-y-auto"
          style={{ top: "calc(64px + 1rem)" }}
        >
          <div className="h-[calc(100vh-120px)]">
            <AIChatPanel />
          </div>
        </aside>

        {/* Left Sidebar - Fixed to left edge (Popup Display Zone) */}
        <aside
          className="fixed left-0 bottom-0 w-[45%] max-w-[600px] overflow-hidden bg-background"
          style={{ top: "calc(64px + 1rem)" }}
          id="popup-zone"
        ></aside>
      </main>
    </div>
  );
}

export default function CreateStrategyPage() {
  return (
    <Suspense fallback={<div>טוען...</div>}>
      <CreateStrategyContent />
    </Suspense>
  );
}
