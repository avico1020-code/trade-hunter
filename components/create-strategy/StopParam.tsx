"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface StopParamProps {
  value: { value: string; type: "$" | "%" };
  onChange: (value: { value: string; type: "$" | "%" }) => void;
}

export function StopParam({ value, onChange }: StopParamProps) {
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Button
          variant={value.type === "$" ? "default" : "outline"}
          size="sm"
          onClick={() => onChange({ ...value, type: "$" })}
          className={cn(value.type === "$" && "bg-[#ff6b35] text-white hover:bg-[#ff5722]")}
        >
          $
        </Button>
        <Button
          variant={value.type === "%" ? "default" : "outline"}
          size="sm"
          onClick={() => onChange({ ...value, type: "%" })}
          className={cn(value.type === "%" && "bg-[#ff6b35] text-white hover:bg-[#ff5722]")}
        >
          %
        </Button>
      </div>
      <Input
        value={value.value}
        onChange={(e) => onChange({ ...value, value: e.target.value })}
        placeholder="הכנס ערך סטופ"
        className="w-full"
      />
    </div>
  );
}
