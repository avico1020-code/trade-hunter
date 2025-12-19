"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { STRATEGY_DATABASE } from "@/data/strategies";

export function StrategyKit() {
  const router = useRouter();

  // מיפוי שמות אסטרטגיות ל-URLs
  const strategyRoutes: Record<string, string> = {
    "Double Top": "/strategy/manage/double-top",
    "Double Bottom": "/strategy/manage/double-bottom",
    "Gap Up": "/strategy/manage/gap-up",
    "Gap Down": "/strategy/manage/gap-down",
    Reversal: "/strategy/manage/reversal",
  };

  const handleStrategyClick = (strategyName: string) => {
    const route = strategyRoutes[strategyName];
    if (route) {
      router.push(route);
    } else {
      console.warn(`No route found for strategy: ${strategyName}`);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-center">קיט אסטרטגיות</h2>
      <div className="grid grid-cols-2 gap-3">
        {STRATEGY_DATABASE.map((strategy) => (
          <Button
            key={strategy}
            variant="outline"
            className="h-auto py-4 text-base font-medium"
            onClick={() => handleStrategyClick(strategy)}
          >
            {strategy}
          </Button>
        ))}
      </div>
    </div>
  );
}
