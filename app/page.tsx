import { AccountStatusPanel } from "@/components/main-screen/AccountStatusPanel";
import { AIChatPanel } from "@/components/main-screen/AIChatPanel";
import { HeaderBar } from "@/components/main-screen/HeaderBar";
import { IndexPanels } from "@/components/main-screen/IndexPanels";
import { ListsGrid } from "@/components/main-screen/ListsGrid";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header Bar */}
      <HeaderBar />

      {/* Main Content Area */}
      <main className="flex-1 relative">
        {/* Center Area - Lists - Flexible width with margins for fixed sidebars */}
        {/* Maintain same distance from chat: original gap-6 (24px) + sidebar width */}
        {/* Right sidebar: w-[352px] (original col-span-3 size) + gap-6 = 24px margin */}
        {/* Left sidebar: w-[352px] (original col-span-3 size) + gap-6 = 24px margin */}
        <section className="ml-[376px] mr-[376px] px-6 py-6">
          <ListsGrid />
        </section>

        {/* Right Sidebar - Fixed to right edge (Account Status + AI Chat) */}
        {/* Original size: col-span-3 in 12-column grid with container (max-width 1280px) */}
        {/* Container: 1280px - 48px (p-6 padding) = 1232px inner width */}
        {/* Grid: 1232px - 48px (gap-6 between columns) = 1184px available */}
        {/* col-span-3: 1184px / 12 * 3 = 296px + gap adjustments ≈ 352px actual width */}
        <aside
          className="fixed right-0 bottom-0 w-[352px] p-6 space-y-6 overflow-y-auto border-r bg-background"
          style={{ top: "calc(64px + 1rem)" }}
        >
          <div className="h-[400px]">
            <AccountStatusPanel />
          </div>
          <div className="h-[500px]">
            <AIChatPanel />
          </div>
        </aside>

        {/* Left Sidebar - Fixed to left edge (Market Indices) */}
        {/* Same size as right sidebar to maintain original proportions */}
        <aside
          className="fixed left-0 bottom-0 w-[352px] p-6 overflow-y-auto border-l bg-background"
          style={{ top: "calc(64px + 1rem)" }}
        >
          <IndexPanels />
        </aside>
      </main>
    </div>
  );
}
