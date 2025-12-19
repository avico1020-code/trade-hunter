"use client";

import { Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { IndicatorsPopup } from "./IndicatorsPopup";

interface Indicator {
  id: string;
  name: string;
  value: string;
}

interface IndicatorsParamProps {
  indicators: Indicator[];
  onChange: (indicators: Indicator[]) => void;
}

export function IndicatorsParam({ indicators, onChange }: IndicatorsParamProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    const updatePosition = () => {
      if (isOpen) {
        const popupZone = document.getElementById("popup-zone");
        if (!popupZone) return;

        const popupZoneRect = popupZone.getBoundingClientRect();
        const popupWidth = 350;
        const popupHeight = 400;
        const centerLeft = (popupZoneRect.width - popupWidth) / 2;
        const centerTop = (popupZoneRect.height - popupHeight) / 2;

        setPopupPosition({
          top: centerTop,
          left: centerLeft,
        });
      }
    };

    if (isOpen) {
      updatePosition();
      window.addEventListener("scroll", updatePosition);
      window.addEventListener("resize", updatePosition);
    }

    return () => {
      window.removeEventListener("scroll", updatePosition);
      window.removeEventListener("resize", updatePosition);
    };
  }, [isOpen]);

  const handleClickOutside = (event: MouseEvent) => {
    if (
      buttonRef.current &&
      !buttonRef.current.contains(event.target as Node) &&
      !(event.target as Element).closest(".indicators-popup")
    ) {
      setIsOpen(false);
      setEditingId(null);
    }
  };

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleDelete = (id: string) => {
    onChange(indicators.filter((ind) => ind.id !== id));
  };

  const handleIndicatorClick = (indicator: Indicator) => {
    setEditingId(indicator.id);
    setIsOpen(true);
  };

  return (
    <div className="space-y-3">
      <Button
        ref={buttonRef}
        variant="outline"
        size="sm"
        onClick={() => {
          setEditingId(null);
          setIsOpen(true);
        }}
        className="w-full max-w-[200px] justify-start"
      >
        הוסף אינדיקטור
      </Button>

      {/* Display selected indicators as buttons under parameter */}
      {indicators.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          {indicators.map((indicator, index) => (
            <Button
              key={indicator.id}
              variant="outline"
              size="sm"
              onClick={() => handleIndicatorClick(indicator)}
              className="bg-[#404040] text-white hover:bg-[#505050]"
            >
              {indicator.name} ({indicator.value})
            </Button>
          ))}
          {/* Add (+) button to the left of last indicator button */}
          <Button
            variant="default"
            size="icon"
            onClick={() => {
              setEditingId(null);
              setIsOpen(true);
            }}
            className="shrink-0 bg-[#ff6b35] hover:bg-[#ff5722]"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      )}

      {isOpen &&
        typeof window !== "undefined" &&
        (() => {
          const popupZone = document.getElementById("popup-zone");
          if (!popupZone) return null;
          return createPortal(
            <div
              className="indicators-popup absolute z-[100]"
              style={{
                top: `${popupPosition.top}px`,
                left: `${popupPosition.left}px`,
              }}
            >
              <IndicatorsPopup
                indicators={indicators}
                editingIndicator={
                  editingId ? indicators.find((i) => i.id === editingId) || null : null
                }
                onSave={(updatedIndicators) => {
                  onChange(updatedIndicators);
                  setIsOpen(false);
                  setEditingId(null);
                }}
                onCancel={() => {
                  setIsOpen(false);
                  setEditingId(null);
                }}
                onDelete={handleDelete}
              />
            </div>,
            popupZone
          );
        })()}
    </div>
  );
}
