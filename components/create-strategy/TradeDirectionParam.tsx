"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TradeDirectionParamProps {
  value: "long" | "short";
  onChange: (value: "long" | "short") => void;
}

export function TradeDirectionParam({ value, onChange }: TradeDirectionParamProps) {
  return (
    <div className="flex gap-2">
      <Button
        variant={value === "long" ? "default" : "outline"}
        onClick={() => onChange("long")}
        size="sm"
        className={cn(
          "flex-1 max-w-[120px]",
          value === "long" && "bg-[#ff6b35] text-white hover:bg-[#ff5722]"
        )}
      >
        long
      </Button>
      <Button
        variant={value === "short" ? "default" : "outline"}
        onClick={() => onChange("short")}
        size="sm"
        className={cn(
          "flex-1 max-w-[120px]",
          value === "short" && "bg-[#ff6b35] text-white hover:bg-[#ff5722]"
        )}
      >
        short
      </Button>
    </div>
  );
}
