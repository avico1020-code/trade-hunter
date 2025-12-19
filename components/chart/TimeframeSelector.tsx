"use client";

/**
 * TimeframeSelector Component
 *
 * בורר timeframe לגרף (1m, 5m, 15m, 1h, 1d)
 * סגנון TradingView
 */

export type Timeframe = "1m" | "5m" | "15m" | "1h" | "1d";

interface TimeframeSelectorProps {
  value: Timeframe;
  onChange: (timeframe: Timeframe) => void;
}

export function TimeframeSelector({ value, onChange }: TimeframeSelectorProps) {
  const frames: Timeframe[] = ["1m", "5m", "15m", "1h", "1d"];

  return (
    <div style={{ display: "flex", gap: 6 }}>
      {frames.map((tf) => (
        <button
          key={tf}
          onClick={() => onChange(tf)}
          style={{
            background: value === tf ? "#2962ff" : "#1e1e1e",
            color: "#d1d4dc",
            border: "none",
            padding: "4px 10px",
            borderRadius: 4,
            cursor: "pointer",
            fontSize: 13,
            fontWeight: value === tf ? 600 : 400,
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            if (value !== tf) {
              e.currentTarget.style.background = "#2a2a2a";
            }
          }}
          onMouseLeave={(e) => {
            if (value !== tf) {
              e.currentTarget.style.background = "#1e1e1e";
            }
          }}
        >
          {tf}
        </button>
      ))}
    </div>
  );
}
