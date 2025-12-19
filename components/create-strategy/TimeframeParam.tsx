"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { TimeframePopup } from "./TimeframePopup";

interface TimeframeParamProps {
  value: string;
  onChange: (value: string) => void;
}

const timeframeOptions = ["1m", "5m", "15m", "30m", "60m", "daily", "weekly", "monthly"];

export function TimeframeParam({ value, onChange }: TimeframeParamProps) {
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
        const popupWidth = 350;
        const popupHeight = 200; // Approximate height
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
      !(event.target as Element).closest(".timeframe-popup")
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

  return (
    <>
      <Button
        ref={buttonRef}
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full max-w-[200px] justify-start"
      >
        {value || "בחר אינטרוול זמן"}
      </Button>

      {isOpen &&
        typeof window !== "undefined" &&
        (() => {
          const popupZone = document.getElementById("popup-zone");
          if (!popupZone) return null;
          return createPortal(
            <div
              className="timeframe-popup absolute z-[100]"
              style={{
                top: `${popupPosition.top}px`,
                left: `${popupPosition.left}px`,
              }}
            >
              <TimeframePopup
                value={value}
                options={timeframeOptions}
                onSelect={(selectedValue) => {
                  onChange(selectedValue);
                  setIsOpen(false);
                }}
              />
            </div>,
            popupZone
          );
        })()}
    </>
  );
}
