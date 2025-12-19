"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import { LogOut, Settings, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AppLogo } from "@/components/AppLogo";
import { AIChatPanel } from "@/components/main-screen/AIChatPanel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type StatisticsTab = "market" | "trading" | "trends";
type PerformanceRange = "daily" | "weekly" | "monthly" | "all";

const performanceRanges: Array<{ value: PerformanceRange; label: string }> = [
  { value: "daily", label: "יומי" },
  { value: "weekly", label: "שבועי" },
  { value: "monthly", label: "חודשי" },
  { value: "all", label: "הכול" },
];

const performanceSeries: Record<PerformanceRange, number[]> = {
  daily: [100, 102, 99, 104, 108, 107, 110, 112],
  weekly: [94, 97, 96, 99, 103, 104, 107, 109],
  monthly: [86, 90, 92, 96, 101, 99, 105, 111],
  all: [72, 78, 83, 91, 97, 105, 112, 125],
};

const performanceLabels: Record<PerformanceRange, string[]> = {
  daily: ["09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "13:00"],
  weekly: ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳", "א׳"],
  monthly: ["׳1", "2׳", "3׳", "4׳", "5׳", "6׳", "7׳", "8׳", "9", "10", "11", "12"],
  all: ["2018", "2019", "2020", "2021", "2022", "2023", "2024", "2025"],
};

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function SegmentedMenu({ activeTab }: { activeTab: StatisticsTab }) {
  const router = useRouter();

  const buttons: Array<{ label: string; tab: StatisticsTab; href: string }> = [
    { label: "מצב השוק", tab: "market", href: "/statistics" },
    { label: "מסחר", tab: "trading", href: "/statistics/trading" },
    { label: "מגמות", tab: "trends", href: "/statistics/trends" },
  ];

  return (
    <div className="flex justify-center">
      <div
        className="flex border border-[#2C2C2C] rounded-full overflow-hidden bg-[#111]"
        style={{ width: "264px", height: "38px" }}
      >
        {buttons.map(({ label, tab, href }, index) => (
          <Button
            key={tab}
            variant={activeTab === tab ? "default" : "outline"}
            size="sm"
            onClick={() => {
              if (activeTab !== tab) {
                router.push(href);
              }
            }}
            className={`rounded-none h-[38px] w-[88px] ${
              index !== 0 ? "border-0 border-l border-[#2C2C2C]" : ""
            } ${activeTab === tab ? "bg-[#FF6B35] text-white hover:bg-[#FF7A46]" : "text-[#B4B4B4] hover:bg-[#1F1F1F]"}`}
          >
            {label}
          </Button>
        ))}
      </div>
    </div>
  );
}

function DonutChart({ value, color, scale }: { value: number; color: string; scale: number }) {
  const radius = 50;
  const strokeWidth = 15;
  const circumference = 2 * Math.PI * radius;
  const clampedValue = Math.min(Math.max(value, 0), 100);
  const offset = circumference * (1 - clampedValue / 100);
  const size = (radius + strokeWidth) * 2;

  return (
    <svg
      width={size * scale}
      height={size * scale}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={`אחוז ביצועים ${clampedValue}%`}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="#1F1F1F"
        strokeWidth={strokeWidth}
        fill="transparent"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="transparent"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        x="50%"
        y="50%"
        dominantBaseline="middle"
        textAnchor="middle"
        fontSize={0 * scale}
        fontWeight={600}
        fill="#FFFFFF"
      >
        {clampedValue.toFixed(1)}%
      </text>
    </svg>
  );
}

export default function StatisticsTradingPage() {
  const router = useRouter();
  const headerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const { isSignedIn, user } = useUser();
  const { signOut } = useClerk();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    const DESIGN_WIDTH = 1344;
    const DESIGN_HEIGHT = 1080;
    const CHAT_WIDTH = 352;
    const PADDING_HORIZONTAL = 48 * 2;
    const PADDING_VERTICAL = 8 + 24;
    const GAP_BETWEEN = 24;

    const recalc = () => {
      if (typeof window === "undefined") {
        return;
      }
      const headerHeight = headerRef.current?.offsetHeight ?? 0;
      const availableWidth = window.innerWidth - PADDING_HORIZONTAL - CHAT_WIDTH - GAP_BETWEEN;
      const availableHeight = window.innerHeight - headerHeight - PADDING_VERTICAL;
      const widthRatio = availableWidth / DESIGN_WIDTH;
      const heightRatio = availableHeight / DESIGN_HEIGHT;
      setScale(Math.min(widthRatio, heightRatio));
    };

    recalc();
    window.addEventListener("resize", recalc);
    return () => window.removeEventListener("resize", recalc);
  }, []);

  const dashboardGap = 12 * scale;
  const dashboardPadding = 12 * scale;
  const gapPx = 12 * scale;
  const topPanels: Array<{
    title: string;
    donutData?: { value: number; color: string };
    value?: string;
  }> = [
    { title: "אחוזי הצלחה", donutData: { value: 84, color: "#33CC7A" } },
    { title: "אחוזי רווח", donutData: { value: 72, color: "#FF8C42" } },
    { title: "אחוזי כישלון", donutData: { value: 11, color: "#FF5A5F" } },
    { title: "מספר העסקאות", value: "1,284" },
  ];
  const bottomPanels: Array<{ title: string; value?: string }> = [
    { title: "העסקה הרווחית ביותר", value: "$156,320" },
    { title: "העסקה הפחות מוצלחת", value: "-$24,780" },
    { title: "אסטרטגיה מנצחת", value: "Gap Up" },
    { title: "אסטרטגיה נפוצה", value: " Reversal" },
  ];

  const strategyRanking = [
    { name: "Gap Up", change: "+12.4%" },
    { name: "Reversal", change: "+9.7%" },
    { name: "Breakout Hunter", change: "+7.2%" },
    { name: "RSI Divergence", change: "+3.5%" },
    { name: "Range Pullback", change: "-1.8%" },
    { name: "Volatility Fade", change: "-4.6%" },
  ];

  const getRankColor = (index: number, total: number) => {
    if (total <= 1) {
      return "hsl(120, 72%, 32%)";
    }
    const ratio = index / (total - 1);
    const hue = 120 - 120 * ratio;
    const lightness = 32 + 26 * ratio;
    return `hsl(${hue}, 70%, ${lightness}%)`;
  };
  const topPanelWidth = `calc((100% - ${gapPx * (topPanels.length - 1)}px) / ${topPanels.length})`;
  const leftTopPanels = topPanels.slice(0, 3);
  const rightTopPanel = topPanels[3];
  const stockRatingPanel = { title: "דירוג מניות" };
  const leftBottomPanels = bottomPanels.slice(0, 3);
  const rightBottomPanel = bottomPanels[3];
  const [performanceRange, setPerformanceRange] = useState<PerformanceRange>("daily");
  const gradientId = useId();

  const performanceStats = useMemo(() => {
    const series = performanceSeries[performanceRange];
    const minValue = Math.min(...series);
    const maxValue = Math.max(...series);
    const range = Math.max(maxValue - minValue, 1);
    const horizontalDivisor = Math.max(series.length - 1, 1);

    const chartBounds = {
      left: 10,
      right: 96,
      top: 10,
      bottom: 90,
    };
    const xSpan = chartBounds.right - chartBounds.left;
    const ySpan = chartBounds.bottom - chartBounds.top;

    const coordinates = series.map((value, index) => {
      const x = chartBounds.left + (index / horizontalDivisor) * xSpan;
      const y = chartBounds.bottom - ((value - minValue) / range) * ySpan;
      return { x, y };
    });

    const linePoints = coordinates.map(({ x, y }) => `${x},${y}`).join(" ");
    const areaPoints = `${linePoints} ${chartBounds.right},${chartBounds.bottom} ${chartBounds.left},${chartBounds.bottom}`;
    const change = ((series[series.length - 1] - series[0]) / series[0]) * 100;

    const xLabels = performanceLabels[performanceRange];
    const yTickCount = 4;
    const yTicks = Array.from({ length: yTickCount + 1 }, (_, i) => {
      const value = minValue + (range / yTickCount) * i;
      const y = chartBounds.bottom - ((value - minValue) / range) * ySpan;
      return { value, y };
    });

    return {
      linePoints,
      areaPoints,
      change,
      xLabels,
      xCoordinates: coordinates.map(({ x }) => x),
      yTicks,
      bounds: chartBounds,
      minValue,
      maxValue,
    };
  }, [performanceRange]);

  const performanceStroke = performanceStats.change >= 0 ? "#3AC27C" : "#FF6B35";
  const performanceFill =
    performanceStats.change >= 0 ? "rgba(58, 194, 124, 0.18)" : "rgba(255, 107, 53, 0.18)";
  const performanceChangeLabel = `${performanceStats.change >= 0 ? "+" : ""}${performanceStats.change.toFixed(1)}%`;
  const performanceChangeColor = performanceStats.change >= 0 ? "#3AC27C" : "#FF6B35";

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsProfileOpen(false);
      }
    };

    const updatePosition = () => {
      if (buttonRef.current && isProfileOpen) {
        const rect = buttonRef.current.getBoundingClientRect();
        const dropdownWidth = 288;
        setDropdownPosition({
          top: rect.bottom + window.scrollY + 8,
          left: rect.right + window.scrollX - dropdownWidth,
        });
      }
    };

    if (isProfileOpen) {
      updatePosition();
      window.addEventListener("scroll", updatePosition);
      window.addEventListener("resize", updatePosition);
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", updatePosition);
      window.removeEventListener("resize", updatePosition);
    };
  }, [isProfileOpen]);

  const handleSignOut = async () => {
    await signOut();
    setIsProfileOpen(false);
  };

  return (
    <div
      className="flex flex-col"
      style={{ width: "100vw", height: "100vh", overflow: "hidden", backgroundColor: "#101010" }}
      dir="rtl"
    >
      <header
        ref={headerRef}
        className="box-border"
        style={{ padding: "20px 48px 12px 48px", flexShrink: 0 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center" style={{ gap: "12px", flexDirection: "row-reverse" }}>
            <Button
              type="button"
              disabled={true}
              variant="outline"
              size="icon"
              aria-label="מקש שפה (מושבת)"
              className="rounded-full border-[#2A2A2A] bg-[#1A1A1A] text-[#6F6F6F] cursor-not-allowed h-[44px] w-[44px]"
            >
              פר
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push("/")}
              className="flex items-center gap-2"
            >
              חזור
            </Button>
            {isSignedIn && user ? (
              <>
                <Button
                  ref={buttonRef}
                  variant="ghost"
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="flex items-center gap-2 hover:bg-accent rounded-lg px-3 py-2 h-auto"
                >
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                    <User className="w-4 h-4 text-primary-foreground" />
                  </div>
                  <span className="text-sm font-medium">
                    שלום, {user.firstName || user.emailAddresses[0]?.emailAddress.split("@")[0]}
                  </span>
                </Button>

                {isProfileOpen &&
                  typeof window !== "undefined" &&
                  createPortal(
                    <div
                      ref={dropdownRef}
                      className="fixed z-[100]"
                      style={{
                        top: `${dropdownPosition.top}px`,
                        left: `${dropdownPosition.left}px`,
                      }}
                    >
                      <Card className="w-72 shadow-lg border-border max-h-[calc(100vh-120px)] overflow-y-auto">
                        <CardContent className="p-0">
                          <div className="px-4 py-4 border-b border-border bg-muted/50">
                            <p className="text-sm font-semibold text-foreground mb-1">
                              {user.firstName || user.emailAddresses[0]?.emailAddress.split("@")[0]}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {user.emailAddresses[0]?.emailAddress}
                            </p>
                          </div>

                          <div className="p-2">
                            <Button
                              variant="ghost"
                              onClick={handleSignOut}
                              className="w-full justify-start px-3 py-2 text-right hover:bg-destructive/10 text-destructive rounded-md"
                            >
                              <LogOut className="w-4 h-4 ml-2" />
                              <span className="text-sm font-medium">התנתק</span>
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </div>,
                    document.body
                  )}
              </>
            ) : (
              <>
                <Button variant="ghost" size="icon" aria-label="פרופיל">
                  <User className="h-5 w-5" />
                </Button>
                <span className="text-sm font-medium">פרופיל</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-4">
            <AppLogo />
            <Button variant="ghost" size="icon" aria-label="הגדרות">
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        </div>
        <div className="mt-[16px]" style={{ margin: "0 auto", transition: "width 0.2s ease" }}>
          <SegmentedMenu activeTab="trading" />
        </div>
      </header>

      <main
        style={{
          display: "flex",
          width: "100vw",
          direction: "ltr",
          overflow: "hidden",
          flex: 1,
          minHeight: 0,
        }}
      >
        <div
          id="main-layout"
          style={{
            display: "flex",
            width: "100%",
            height: "100%",
            minHeight: 0,
            overflow: "hidden",
            padding: "8px 48px 0 0",
            boxSizing: "border-box",
            gap: "24px",
          }}
        >
          <div
            id="dashboard-area"
            style={{
              flex: "1 1 auto",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              minHeight: 0,
            }}
          >
            <div
              style={{
                flex: "1 1 auto",
                width: "100%",
                backgroundColor: "#181818",
                borderRadius: "22px",
                border: "1px solid #242424",
                boxShadow: "0 22px 45px rgba(0,0,0,0.45)",
                boxSizing: "border-box",
                padding: `${dashboardPadding}px`,
                overflow: "hidden",
                minHeight: 0,
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "row",
                  height: "100%",
                  gap: `${dashboardGap}px`,
                  alignItems: "stretch",
                }}
              >
                <div
                  style={{
                    flex: "1 1 0",
                    background: "linear-gradient(180deg, #1E1E1E 0%, #141414 100%)",
                    border: "1px solid #2F2F2F",
                    borderRadius: "18px",
                    boxShadow: "0 14px 30px rgba(0,0,0,0.35)",
                    padding: `${16 * scale}px`,
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "flex-start",
                    flexDirection: "column",
                    gap: `${12 * scale}px`,
                    height: "100%",
                  }}
                  dir="rtl"
                >
                  <h3
                    className="text-base font-semibold text-foreground"
                    style={{ fontSize: `${Math.max(14, 16 * scale)}px` }}
                  >
                    דירוג אסטרטגיות
                  </h3>
                  <div
                    style={{
                      flex: "1 1 auto",
                      width: "100%",
                      display: "flex",
                      flexDirection: "column",
                      gap: `${8 * scale}px`,
                      overflowY: "auto",
                      paddingLeft: `${2 * scale}px`,
                    }}
                  >
                    {strategyRanking.map((strategy, index) => (
                      <div
                        key={`sidebar-${strategy.name}`}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: `${10 * scale}px ${12 * scale}px`,
                          borderRadius: `${14 * scale}px`,
                          background: getRankColor(index, strategyRanking.length),
                          color:
                            strategyRanking.length > 1 && index / (strategyRanking.length - 1) > 0.6
                              ? "#FFFFFF"
                              : "#0A0A0A",
                          fontWeight: 600,
                          boxShadow: "0 8px 18px rgba(0, 0, 0, 0.18)",
                        }}
                      >
                        <span style={{ fontSize: `${Math.max(13, 15 * scale)}px` }}>
                          {index + 1}. {strategy.name}
                        </span>
                        <span style={{ fontSize: `${Math.max(12, 14 * scale)}px` }}>
                          {strategy.change}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div
                  style={{
                    flex: "4 1 0",
                    display: "grid",
                    gridTemplateColumns: `repeat(4, minmax(0, 1fr))`,
                    gridTemplateRows: "20% auto 20%",
                    gap: `${dashboardGap}px`,
                    height: "100%",
                  }}
                  dir="rtl"
                >
                  {topPanels.map((panel, index) => (
                    <div
                      key={panel.title}
                      style={{
                        background: "linear-gradient(180deg, #1E1E1E 0%, #141414 100%)",
                        border: "1px solid #2F2F2F",
                        borderRadius: "18px",
                        boxShadow: "0 14px 30px rgba(0,0,0,0.35)",
                        padding: `${16 * scale}px`,
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "flex-start",
                        alignItems: panel.donutData ? "flex-start" : "flex-start",
                        gap: panel.donutData ? `${8 * scale}px` : undefined,
                        gridColumn: `${index + 1}`,
                        gridRow: "1",
                        minWidth: 0,
                        minHeight: 0,
                        boxSizing: "border-box",
                        position: "relative",
                      }}
                      dir="rtl"
                    >
                      <h3
                        className="text-base font-semibold text-foreground"
                        style={{
                          fontSize: `${Math.max(14, 16 * scale)}px`,
                          textAlign: "right",
                          width: "100%",
                        }}
                      >
                        {panel.title}
                      </h3>
                      {panel.donutData ? (
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "space-between",
                            width: "100%",
                            flex: "1 1 auto",
                            gap: `${12 * scale}px`,
                            minHeight: 0,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "flex-start",
                              justifyContent: "center",
                              flex: "1 1 auto",
                              color: "#FFFFFF",
                              fontSize: `${Math.max(18, 22 * scale)}px`,
                              fontWeight: 600,
                            }}
                          >
                            {panel.donutData.value.toFixed(1)}%
                          </div>
                          <div
                            style={{
                              flex: "0 0 auto",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <DonutChart
                              value={panel.donutData.value}
                              color={panel.donutData.color}
                              scale={scale}
                            />
                          </div>
                        </div>
                      ) : panel.value ? (
                        <div
                          style={{
                            flex: "1 1 auto",
                            width: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#FFFFFF",
                            fontSize: `${Math.max(20, 24 * scale)}px`,
                            fontWeight: 600,
                          }}
                        >
                          {panel.value}
                        </div>
                      ) : null}
                    </div>
                  ))}
                  <div
                    style={{
                      gridColumn: "2 / span 3",
                      gridRow: "2",
                      background: "linear-gradient(180deg, #1E1E1E 0%, #141414 100%)",
                      border: "1px solid #2F2F2F",
                      borderRadius: "18px",
                      boxShadow: "0 14px 30px rgba(0,0,0,0.35)",
                      padding: `${14 * scale}px`,
                      display: "flex",
                      flexDirection: "column",
                      gap: `${10 * scale}px`,
                      minWidth: 0,
                      minHeight: 0,
                      boxSizing: "border-box",
                    }}
                    dir="rtl"
                  >
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: `${6 * scale}px`,
                        flex: "0 0 auto",
                        minWidth: 0,
                      }}
                    >
                      <h3
                        className="text-base font-semibold text-foreground"
                        style={{ fontSize: `${Math.max(14, 16 * scale)}px` }}
                      >
                        {performanceRange === "daily"
                          ? "גרף ביצועים יומי"
                          : performanceRange === "weekly"
                            ? "גרף ביצועים שבועי"
                            : performanceRange === "monthly"
                              ? "גרף ביצועים חודשי"
                              : "גרף ביצועים כולל"}
                      </h3>
                      <span
                        style={{
                          fontSize: `${Math.max(12, 14 * scale)}px`,
                          fontWeight: 600,
                          color: performanceChangeColor,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {performanceChangeLabel}
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "row-reverse",
                        gap: `${6 * scale}px`,
                        flexWrap: "wrap",
                        alignItems: "center",
                        justifyContent: "flex-start",
                        flex: "0 0 auto",
                      }}
                    >
                      {performanceRanges.map(({ value, label }) => (
                        <Button
                          key={value}
                          size="sm"
                          variant={performanceRange === value ? "default" : "outline"}
                          onClick={() => setPerformanceRange(value)}
                          aria-pressed={performanceRange === value}
                          className={`h-9 px-3 text-xs font-semibold rounded-md transition-colors ${
                            performanceRange === value
                              ? "bg-[#FF6B35] text-white hover:bg-[#FF7A46]"
                              : "text-[#B4B4B4] border border-[#2F2F2F] bg-transparent hover:bg-[#1F1F1F]"
                          }`}
                        >
                          {label}
                        </Button>
                      ))}
                    </div>
                    <div
                      style={{
                        flex: "1 1 auto",
                        position: "relative",
                        borderRadius: "14px",
                        background:
                          "linear-gradient(180deg, rgba(30,30,30,0.7) 0%, rgba(12,12,12,0.95) 100%)",
                        padding: `${10 * scale}px`,
                        boxShadow: "inset 0 8px 24px rgba(0,0,0,0.35)",
                        overflow: "hidden",
                        minHeight: 0,
                      }}
                    >
                      <svg
                        viewBox="0 0 100 100"
                        width="100%"
                        height="100%"
                        preserveAspectRatio="none"
                        role="img"
                        aria-label={`גרף ביצועים ${performanceChangeLabel}`}
                        style={{ display: "block" }}
                      >
                        <defs>
                          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={performanceFill} stopOpacity="1" />
                            <stop offset="100%" stopColor={performanceFill} stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        <rect x="0" y="0" width="100" height="100" fill="rgba(255,255,255,0.02)" />
                        <polygon
                          points={performanceStats.areaPoints}
                          fill={`url(#${gradientId})`}
                          opacity="0.75"
                        />
                        <line
                          x1={performanceStats.bounds.left}
                          y1={performanceStats.bounds.bottom}
                          x2={performanceStats.bounds.right}
                          y2={performanceStats.bounds.bottom}
                          stroke="rgba(255,255,255,0.16)"
                          strokeWidth="0.6"
                        />
                        <line
                          x1={performanceStats.bounds.left}
                          y1={performanceStats.bounds.top}
                          x2={performanceStats.bounds.left}
                          y2={performanceStats.bounds.bottom}
                          stroke="rgba(255,255,255,0.16)"
                          strokeWidth="0.6"
                        />
                        {performanceStats.yTicks.map(({ value, y }) => (
                          <g key={`ytick-${value}`}>
                            <line
                              x1={performanceStats.bounds.left - 2}
                              y1={y}
                              x2={performanceStats.bounds.left}
                              y2={y}
                              stroke="rgba(255,255,255,0.25)"
                              strokeWidth="0.6"
                            />
                            <text
                              x={performanceStats.bounds.left - 4}
                              y={y}
                              fontSize="5"
                              fill="rgba(255,255,255,0.65)"
                              dominantBaseline="middle"
                              textAnchor="end"
                            >
                              {currencyFormatter.format(value)}
                            </text>
                          </g>
                        ))}
                        {performanceStats.xLabels.map((label, index) => (
                          <text
                            key={`xlabel-${label}-${index}`}
                            x={performanceStats.xCoordinates[index]}
                            y={performanceStats.bounds.bottom + 6}
                            fontSize="5"
                            fill="rgba(255,255,255,0.65)"
                            textAnchor="middle"
                          >
                            {label}
                          </text>
                        ))}
                        <polyline
                          points={performanceStats.linePoints}
                          fill="none"
                          stroke={performanceStroke}
                          strokeWidth="1.4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                  </div>
                  <div
                    style={{
                      gridColumn: "1",
                      gridRow: "2 / span 2",
                      display: "flex",
                      flexDirection: "column",
                      gap: `${dashboardGap}px`,
                    }}
                  >
                    <div
                      style={{
                        flex: "1 1 auto",
                        background: "linear-gradient(180deg, #1E1E1E 0%, #141414 100%)",
                        border: "1px solid #2F2F2F",
                        borderRadius: "18px",
                        boxShadow: "0 14px 30px rgba(0,0,0,0.35)",
                        padding: `${16 * scale}px`,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "stretch",
                        justifyContent: "flex-start",
                        minHeight: 0,
                        boxSizing: "border-box",
                      }}
                      dir="rtl"
                    >
                      <h3
                        className="text-base font-semibold text-foreground"
                        style={{ fontSize: `${Math.max(14, 16 * scale)}px` }}
                      >
                        {stockRatingPanel.title}
                      </h3>
                      <div style={{ flex: "1 1 auto" }} />
                    </div>
                    <div
                      style={{
                        flex: "0 0 20%",
                        background: "linear-gradient(180deg, #1E1E1E 0%, #141414 100%)",
                        border: "1px solid #2F2F2F",
                        borderRadius: "18px",
                        boxShadow: "0 14px 30px rgba(0,0,0,0.35)",
                        padding: `${16 * scale}px`,
                        display: "flex",
                        justifyContent: "flex-start",
                        alignItems: "flex-start",
                      }}
                    >
                      <h3
                        className="text-base font-semibold text-foreground"
                        style={{ fontSize: `${Math.max(14, 16 * scale)}px` }}
                      >
                        {rightBottomPanel.title}
                      </h3>
                    </div>
                  </div>
                  {leftBottomPanels.map((panel, index) => (
                    <div
                      key={panel.title}
                      style={{
                        background: "linear-gradient(180deg, #1E1E1E 0%, #141414 100%)",
                        border: "1px solid #2F2F2F",
                        borderRadius: "18px",
                        boxShadow: "0 14px 30px rgba(0,0,0,0.35)",
                        padding: `${16 * scale}px`,
                        display: "flex",
                        justifyContent: "flex-start",
                        alignItems: "flex-start",
                        gridColumn: `${index + 1}`,
                        gridRow: "3",
                      }}
                    >
                      <h3
                        className="text-base font-semibold text-foreground"
                        style={{ fontSize: `${Math.max(14, 16 * scale)}px` }}
                      >
                        {panel.title}
                      </h3>
                    </div>
                  ))}
                  {bottomPanels.map((panel, index) => (
                    <div
                      key={panel.title}
                      style={{
                        background: "linear-gradient(180deg, #1E1E1E 0%, #141414 100%)",
                        border: "1px solid #2F2F2F",
                        borderRadius: "18px",
                        boxShadow: "0 14px 30px rgba(0,0,0,0.35)",
                        padding: `${16 * scale}px`,
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        alignItems: "center",
                        textAlign: "center",
                        gridColumn: `${index + 1}`,
                        gridRow: "3",
                        gap: `${8 * scale}px`,
                      }}
                      dir="rtl"
                    >
                      <h3
                        className="text-base font-semibold text-foreground"
                        style={{ fontSize: `${Math.max(14, 16 * scale)}px` }}
                      >
                        {panel.title}
                      </h3>
                      {panel.value ? (
                        <span
                          style={{
                            fontSize: `${Math.max(18, 22 * scale)}px`,
                            fontWeight: 600,
                            color: "#FFFFFF",
                          }}
                        >
                          {panel.value}
                        </span>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <aside
            id="chat-area"
            style={{
              flex: "0 0 352px",
              width: "352px",
              height: "100%",
              overflow: "hidden",
              display: "flex",
            }}
            dir="rtl"
          >
            <div
              style={{
                width: "100%",
                padding: "24px",
                borderRadius: "22px",
                border: "1px solid #2B2B2B",
                background: "linear-gradient(180deg, #1F1F1F 0%, #111111 100%)",
                boxShadow: "0 24px 50px rgba(0,0,0,0.5)",
                boxSizing: "border-box",
              }}
            >
              <div
                className="h-full rounded-[18px]"
                style={{
                  padding: "20px",
                  backgroundColor: "#161616",
                  border: "1px solid #252525",
                  boxShadow: "inset 0 0 28px rgba(0,0,0,0.35)",
                  height: "100%",
                }}
              >
                <AIChatPanel />
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
