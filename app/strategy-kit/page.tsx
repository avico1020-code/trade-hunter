"use client";

import { useState } from "react";
import { AIChatPanel } from "@/components/main-screen/AIChatPanel";
import { CreateStrategyPanel } from "@/components/strategy-kit/CreateStrategyPanel";
import { StrategyKit } from "@/components/strategy-kit/StrategyKit";
import { StrategyKitHeader } from "@/components/strategy-kit/StrategyKitHeader";

export default function StrategyKitPage() {
  const [userStrategies, setUserStrategies] = useState<string[]>([
    "אסטרטגיה 1",
    "אסטרטגיה 2",
    "אסטרטגיה 3",
  ]);

  const handleAddStrategy = () => {
    const newStrategyName = `אסטרטגיה ${userStrategies.length + 1}`;
    setUserStrategies([...userStrategies, newStrategyName]);
  };

  const handleDeleteStrategy = (index: number) => {
    setUserStrategies(userStrategies.filter((_, i) => i !== index));
  };

  const handleRenameStrategy = (index: number, newName: string) => {
    const updated = [...userStrategies];
    updated[index] = newName;
    setUserStrategies(updated);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <StrategyKitHeader />

      {/* Main Content Area */}
      <main className="flex-1 relative">
        {/* Left Sidebar - Fixed to left edge (Create Strategy) */}
        <aside
          className="fixed left-0 bottom-0 w-[35%] max-w-[500px] p-6 border-l bg-background overflow-y-auto"
          style={{ top: "calc(64px + 1rem)" }}
        >
          <CreateStrategyPanel
            strategies={userStrategies}
            onAddStrategy={handleAddStrategy}
            onDeleteStrategy={handleDeleteStrategy}
            onRenameStrategy={handleRenameStrategy}
          />
        </aside>

        {/* Center Area - Strategy Kit - Flexible width with margins for sidebars */}
        <section className="ml-[35%] mr-[30%] px-6 py-6">
          <StrategyKit />
        </section>

        {/* Right Sidebar - Fixed to right edge (AI Chat) */}
        <aside
          className="fixed right-0 bottom-0 w-[30%] max-w-[400px] p-6 border-r bg-background"
          style={{ top: "calc(64px + 1rem)" }}
        >
          <div className="h-[calc(100vh-120px)]">
            <AIChatPanel />
          </div>
        </aside>
      </main>
    </div>
  );
}
