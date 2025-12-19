"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TimeframePopupProps {
  value: string;
  options: string[];
  onSelect: (value: string) => void;
}

export function TimeframePopup({ value, options, onSelect }: TimeframePopupProps) {
  return (
    <div className="bg-[#e5e5e5] rounded-lg p-4 shadow-lg border border-[#d0d0d0] w-[350px] max-w-[calc(100vw-32px)]">
      <h4 className="text-lg font-semibold mb-4 text-black">הכנס אינטרוול זמן</h4>
      <div className="grid grid-cols-4 gap-2">
        {options.map((option) => (
          <Button
            key={option}
            onClick={() => onSelect(option)}
            className={cn(
              "bg-[#404040] text-white hover:bg-[#505050]",
              value === option && "bg-[#ff6b35] hover:bg-[#ff5722]"
            )}
          >
            {option}
          </Button>
        ))}
      </div>
    </div>
  );
}
