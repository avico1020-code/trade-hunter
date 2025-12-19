"use client";

import { AIChatPanel } from "@/components/main-screen/AIChatPanel";
import { StrategyKitHeader } from "@/components/strategy-kit/StrategyKitHeader";

export default function DoubleBottomPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <StrategyKitHeader title="כפול תחתון" />

      {/* Main Content Area */}
      <main className="flex-1 relative">
        {/* Main content - with margin for fixed right sidebar */}
        <section className="mr-[30%] px-6 py-6">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold mb-6">כפול תחתון</h1>
            <p className="text-muted-foreground">תוכן אסטרטגיית כפול תחתון יוצג כאן.</p>
          </div>
        </section>

        {/* Right Sidebar - Fixed to right edge (AI Chat) - 30% width */}
        <aside
          className="fixed right-0 bottom-0 w-[30%] p-6 overflow-y-auto border-r bg-background"
          style={{ top: "calc(64px + 1rem)" }}
        >
          <AIChatPanel />
        </aside>
      </main>
    </div>
  );
}
