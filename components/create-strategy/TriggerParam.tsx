"use client";

import { Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { TriggerPopup } from "./TriggerPopup";

interface Indicator {
  id: string;
  name: string;
  value: string;
}

interface TriggerParamProps {
  type: "entry" | "exit";
  value: any;
  indicators: Indicator[];
  onChange: (value: any) => void;
}

export function TriggerParam({ type, value, indicators, onChange }: TriggerParamProps) {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    const updatePosition = () => {
      if (isOpen) {
        // Center popup in the left 35% zone
        const popupZone = document.getElementById("popup-zone");
        if (!popupZone) return;

        const popupZoneRect = popupZone.getBoundingClientRect();
        const popupWidth = 500;
        const popupHeight = 600; // Approximate height
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
      !(event.target as Element).closest(".trigger-popup")
    ) {
      setIsOpen(false);
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

  const hasValue =
    value &&
    (value.indicators?.length > 0 || value.volume || value.price || value.news !== undefined);

  return (
    <>
      <div className="flex gap-2">
        <Button
          ref={buttonRef}
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className="flex-1 max-w-[200px] justify-start"
        >
          {hasValue ? "טריגר מוגדר" : "הגדר טריגר"}
        </Button>
        <Button variant="default" size="icon" onClick={() => setIsOpen(true)} className="shrink-0">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {isOpen &&
        typeof window !== "undefined" &&
        (() => {
          const popupZone = document.getElementById("popup-zone");
          if (!popupZone) return null;
          return createPortal(
            <div
              className="trigger-popup absolute z-[100]"
              style={{
                top: `${popupPosition.top}px`,
                left: `${popupPosition.left}px`,
              }}
            >
              <TriggerPopup
                type={type}
                value={value}
                indicators={indicators}
                onChange={(newValue) => {
                  onChange(newValue);
                  setIsOpen(false);
                }}
                onCancel={() => setIsOpen(false)}
              />
            </div>,
            popupZone
          );
        })()}
    </>
  );
}
