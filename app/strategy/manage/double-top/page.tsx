"use client";

import { useMutation, useQuery } from "convex/react";
import { Save, X } from "lucide-react";
import { useState, useEffect } from "react";
import { AIChatPanel } from "@/components/main-screen/AIChatPanel";
import { StrategyKitHeader } from "@/components/strategy-kit/StrategyKitHeader";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/convex/_generated/api";
import { useToast } from "@/hooks/use-toast";

export default function DoubleTopStrategyPage() {
  const { toast } = useToast();
  const saveStrategyMutation = useMutation(api.doubleTopStrategies.saveStrategy);
  const existingStrategy = useQuery(api.doubleTopStrategies.getUserStrategy);

  // General Terms
  const [timeInterval, setTimeInterval] = useState<string | null>(null);
  const [indicators, setIndicators] = useState<
    Array<{ id: string; name: string | null; value: string; isSelecting: boolean }>
  >([]);

  // Pattern Recognition
  const [candlesBetweenHighs, setCandlesBetweenHighs] = useState("");
  const [decreasePercentage, setDecreasePercentage] = useState("");
  const [maxDecreasePercentage, setMaxDecreasePercentage] = useState("");
  const [differencePercentage, setDifferencePercentage] = useState("");
  const [confirmationCandles, setConfirmationCandles] = useState("");
  const [volumeDowntrend, setVolumeDowntrend] = useState<boolean | null>(null);
  const [earlyHeadsUpEnabled, setEarlyHeadsUpEnabled] = useState<boolean | null>(null);
  const [earlyHeadsUpRiseBars, setEarlyHeadsUpRiseBars] = useState("");

  // Entry 1
  const [firstEntryConfirmationCandles, setFirstEntryConfirmationCandles] = useState("");
  const [entry1UsesSameConfirmation, setEntry1UsesSameConfirmation] = useState<boolean | null>(
    null
  );

  // Exit 1
  const [abnormalVolumePercentage, setAbnormalVolumePercentage] = useState("");
  const [abnormalVolWindowMode, setAbnormalVolWindowMode] = useState<
    "fromFirstRed" | "fixed" | null
  >(null);
  const [candlesBackToCompare, setCandlesBackToCompare] = useState("");

  // Entry 2
  const [shouldMakeSecondEntry, setShouldMakeSecondEntry] = useState<boolean | null>(null);
  const [secondEntryConfirmationCandles, setSecondEntryConfirmationCandles] = useState("");
  const [maWindows, setMaWindows] = useState<number[]>([9, 20, 50]);
  const [customMaWindow, setCustomMaWindow] = useState("");

  // Exit 2
  const [exit2OnTouchMA, setExit2OnTouchMA] = useState<boolean | null>(null);

  // Stops
  const [stop1InitialAtPeak, setStop1InitialAtPeak] = useState<boolean | null>(null);
  const [stop1Trailing, setStop1Trailing] = useState<boolean | null>(null);
  const [stop2InitialAtMA, setStop2InitialAtMA] = useState<boolean | null>(null);
  const [stop2Trailing, setStop2Trailing] = useState<boolean | null>(null);

  const [isSaving, setIsSaving] = useState(false);

  // Load existing strategy data when it's available
  useEffect(() => {
    if (existingStrategy) {
      // General Terms
      setTimeInterval(existingStrategy.timeInterval);
      setIndicators(existingStrategy.indicators.map(ind => ({ ...ind, isSelecting: false })));

      // Pattern Recognition
      setCandlesBetweenHighs(existingStrategy.config.minBarsBetweenPeaks.toString());
      setDecreasePercentage(existingStrategy.config.minDropPct.toString());
      setMaxDecreasePercentage(existingStrategy.config.maxDropPct.toString());
      setDifferencePercentage(existingStrategy.config.peakDiffAbsPct.toString());
      setConfirmationCandles(existingStrategy.config.patternConfirmRedBars.toString());
      setVolumeDowntrend(existingStrategy.config.volumeDowntrendBetweenPeaks);
      setEarlyHeadsUpEnabled(existingStrategy.config.earlyHeadsUpEnabled);
      setEarlyHeadsUpRiseBars(existingStrategy.config.earlyHeadsUpRiseBars.toString());

      // Entry 1
      setFirstEntryConfirmationCandles(existingStrategy.config.entry1ConfirmBars.toString());
      setEntry1UsesSameConfirmation(existingStrategy.config.entry1UsesSameConfirmation);

      // Exit 1
      setAbnormalVolumePercentage(existingStrategy.config.abnormalVolMultiplier.toString());
      setAbnormalVolWindowMode(existingStrategy.config.abnormalVolWindowMode);
      setCandlesBackToCompare(existingStrategy.config.abnormalVolFixedWindow.toString());

      // Entry 2
      setShouldMakeSecondEntry(existingStrategy.config.entry2Enabled);
      setSecondEntryConfirmationCandles(existingStrategy.config.entry2ConfirmBelowMA.toString());
      setMaWindows(existingStrategy.config.maWindows);

      // Exit 2
      setExit2OnTouchMA(existingStrategy.config.exit2OnTouchMA);

      // Stops
      setStop1InitialAtPeak(existingStrategy.config.stop1_initial_atSecondPeakHigh);
      setStop1Trailing(existingStrategy.config.stop1_trailing_byResistances);
      setStop2InitialAtMA(existingStrategy.config.stop2_initial_atFailedMAHigh);
      setStop2Trailing(existingStrategy.config.stop2_trailing_byResistances);
    }
  }, [existingStrategy]);

  // Available indicators list
  const availableIndicators = [
    "RSI",
    "MACD",
    "Stochastic",
    "Bollinger Bands",
    "Moving Average",
    "SMA",
    "EMA",
    "Volume",
    "ADX",
    "CCI",
    "Williams %R",
    "OBV",
  ];

  const handleAddIndicator = () => {
    setIndicators([
      ...indicators,
      { id: Date.now().toString(), name: null, value: "", isSelecting: true },
    ]);
  };

  const handleSelectIndicator = (indicatorId: string, indicatorName: string) => {
    setIndicators(
      indicators.map((ind) =>
        ind.id === indicatorId ? { ...ind, name: indicatorName, isSelecting: false } : ind
      )
    );
  };

  const handleAddAnotherIndicator = () => {
    setIndicators([
      ...indicators,
      { id: Date.now().toString(), name: null, value: "", isSelecting: true },
    ]);
  };

  const handleIndicatorValueChange = (indicatorId: string, value: string) => {
    setIndicators(indicators.map((ind) => (ind.id === indicatorId ? { ...ind, value } : ind)));
  };

  const handleDeleteIndicator = (indicatorId: string) => {
    setIndicators(indicators.filter((ind) => ind.id !== indicatorId));
  };

  const handleAddMaWindow = () => {
    const value = Number(customMaWindow);
    if (value && value > 0 && !maWindows.includes(value)) {
      setMaWindows([...maWindows, value].sort((a, b) => a - b));
      setCustomMaWindow("");
    }
  };

  const handleRemoveMaWindow = (value: number) => {
    setMaWindows(maWindows.filter((w) => w !== value));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);

      // Validation
      if (!timeInterval) {
        toast({
          title: "שגיאה",
          description: "נא לבחור מרווח זמן",
          variant: "destructive",
        });
        return;
      }

      // Prepare config object with all user values
      const config = {
        // Pattern Recognition
        minBarsBetweenPeaks: Number(candlesBetweenHighs) || 8,
        minDropPct: Number(decreasePercentage) || 3,
        maxDropPct: Number(maxDecreasePercentage) || 15,
        peakDiffAbsPct: Number(differencePercentage) || 1.5,
        patternConfirmRedBars: Number(confirmationCandles) || 2,
        volumeDowntrendBetweenPeaks: volumeDowntrend ?? true,
        earlyHeadsUpEnabled: earlyHeadsUpEnabled ?? false,
        earlyHeadsUpRiseBars: Number(earlyHeadsUpRiseBars) || 2,

        // Entry 1
        entry1ConfirmBars: Number(firstEntryConfirmationCandles) || 2,
        entry1UsesSameConfirmation: entry1UsesSameConfirmation ?? true,

        // Exit 1
        abnormalVolMultiplier: Number(abnormalVolumePercentage) || 2.0,
        abnormalVolWindowMode: (abnormalVolWindowMode || "fixed") as "fixed" | "fromFirstRed",
        abnormalVolFixedWindow: Number(candlesBackToCompare) || 20,

        // Entry 2
        entry2Enabled: shouldMakeSecondEntry ?? true,
        entry2ConfirmBelowMA: Number(secondEntryConfirmationCandles) || 2,
        maKind: "sma" as const,
        maWindows: maWindows.length > 0 ? maWindows : [9, 20, 50],

        // Exit 2
        exit2OnTouchMA: exit2OnTouchMA ?? true,

        // Stops
        stop1_initial_atSecondPeakHigh: stop1InitialAtPeak ?? true,
        stop1_trailing_byResistances: stop1Trailing ?? true,
        stop2_initial_atFailedMAHigh: stop2InitialAtMA ?? true,
        stop2_trailing_byResistances: stop2Trailing ?? true,
      };

      // Prepare indicators (filter out incomplete ones)
      const completeIndicators = indicators
        .filter((ind) => ind.name && !ind.isSelecting)
        .map(({ isSelecting, ...ind }) => ind);

      const strategyData = {
        name: "אסטרטגיית דאבל טופ",
        timeInterval,
        indicators: completeIndicators,
        config,
      };

      // Save to Convex
      await saveStrategyMutation(strategyData);

      toast({
        title: "הצלחה! ✅",
        description: "האסטרטגיה נשמרה בהצלחה במסד הנתונים",
        duration: 3000, // 3 seconds
      });
    } catch (error) {
      console.error("Error saving strategy:", error);
      toast({
        title: "שגיאה בשמירה",
        description: error instanceof Error ? error.message : "אירעה שגיאה לא צפויה",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <StrategyKitHeader title="דאבל טופ" backHref="/strategy-kit" />

      {/* Main Content Area */}
      <main className="flex-1 relative">
        {/* Main content - with margin for fixed right sidebar */}
        <section className="mr-[30%] px-6 py-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Content */}
              <div>
              {/* General Terms Section */}
              <div className="mb-8">
                <h1 className="text-3xl font-bold mb-4">תנאים כלליים</h1>

                <div className="space-y-6 mt-6">
                  {/* Time Interval */}
                  <div className="space-y-2">
                    <Label>מרווח זמן</Label>
                    <div className="flex gap-3 flex-wrap">
                      {["Minute", "5 Minutes", "15 Minutes", "30 Minutes", "Hour"].map(
                        (interval) => (
                          <Button
                            key={interval}
                            type="button"
                            variant={timeInterval === interval ? "default" : "outline"}
                            onClick={() => setTimeInterval(interval)}
                          >
                            {interval === "Minute"
                              ? "דקה"
                              : interval === "5 Minutes"
                                ? "5 דקות"
                                : interval === "15 Minutes"
                                  ? "15 דקות"
                                  : interval === "30 Minutes"
                                    ? "30 דקות"
                                    : "שעה"}
                          </Button>
                        )
                      )}
                    </div>
                  </div>

                  {/* Add Indicators */}
                  <div className="space-y-2">
                    <Label>הוסף אינדיקטורים</Label>
                    <div className="space-y-3">
                      {indicators.length === 0 ? (
                        <Button type="button" variant="outline" onClick={handleAddIndicator}>
                          הוסף אינדיקטור
                        </Button>
                      ) : (
                        indicators.map((indicator) => (
                          <div key={indicator.id} className="flex items-center gap-3">
                            {indicator.name && (
                              <Button
                                type="button"
                                variant="default"
                                size="sm"
                                onClick={handleAddAnotherIndicator}
                              >
                                הוסף
                              </Button>
                            )}
                            {indicator.isSelecting ? (
                              <div className="flex items-center gap-3 flex-1">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild={true}>
                                    <Button variant="outline" className="flex-1 max-w-md">
                                      הוסף אינדיקטור
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent>
                                    {availableIndicators.map((ind) => (
                                      <DropdownMenuItem
                                        key={ind}
                                        onClick={() => handleSelectIndicator(indicator.id, ind)}
                                      >
                                        {ind}
                                      </DropdownMenuItem>
                                    ))}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteIndicator(indicator.id)}
                                  aria-label="מחק אינדיקטור"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
              </div>
                            ) : (
                              <div className="flex items-center gap-3 flex-1 max-w-md">
                                <Button type="button" variant="outline" className="flex-1">
                                  {indicator.name}
                                </Button>
                                <Input
                                  type="number"
                                  value={indicator.value}
                                  onChange={(e) =>
                                    handleIndicatorValueChange(indicator.id, e.target.value)
                                  }
                                  placeholder="ערך"
                                  className="w-24"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteIndicator(indicator.id)}
                                  aria-label="מחק אינדיקטור"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
              </div>
            </div>

              {/* Pattern Recognition Section */}
              <h1 className="text-3xl font-bold mb-6">זיהוי דפוס</h1>

              {/* Pattern Recognition Fields */}
              <div className="space-y-6 mt-6">
                {/* Field 1: Number of candles between highs */}
                <div className="space-y-2">
                  <Label htmlFor="candles-between-highs">מספר נרות בין השיאים</Label>
                  <Input
                    id="candles-between-highs"
                    type="number"
                    value={candlesBetweenHighs}
                    onChange={(e) => setCandlesBetweenHighs(e.target.value)}
                    placeholder="הזן ערך מספרי"
                    className="max-w-md"
                  />
                </div>

                {/* Field 2: Percentage of decrease between high 1 and low */}
                <div className="space-y-2">
                  <Label htmlFor="decrease-percentage">אחוז הירידה בין שיא 1 לשפל</Label>
                  <Input
                    id="decrease-percentage"
                    type="number"
                    value={decreasePercentage}
                    onChange={(e) => setDecreasePercentage(e.target.value)}
                    placeholder="הזן ערך מספרי"
                    className="max-w-md"
                  />
                </div>

                {/* Field 3: Percentage of difference between high 1 and high 2 */}
                <div className="space-y-2">
                  <Label htmlFor="difference-percentage">אחוז ההבדל בין שיא 1 לשיא 2</Label>
                  <Input
                    id="difference-percentage"
                    type="number"
                    value={differencePercentage}
                    onChange={(e) => setDifferencePercentage(e.target.value)}
                    placeholder="הזן ערך מספרי"
                    className="max-w-md"
                  />
                </div>

                {/* Field 4: Number of confirmation candles */}
                <div className="space-y-2">
                  <Label htmlFor="confirmation-candles">מספר נרות אישור</Label>
                  <Input
                    id="confirmation-candles"
                    type="number"
                    value={confirmationCandles}
                    onChange={(e) => setConfirmationCandles(e.target.value)}
                    placeholder="הזן ערך מספרי"
                    className="max-w-md"
                  />
                </div>

                {/* Field 5: Max drop percentage */}
                <div className="space-y-2">
                  <Label htmlFor="max-decrease-percentage">אחוז ירידה מקסימלי בין השיאים</Label>
                  <Input
                    id="max-decrease-percentage"
                    type="number"
                    value={maxDecreasePercentage}
                    onChange={(e) => setMaxDecreasePercentage(e.target.value)}
                    placeholder="הזן ערך מספרי"
                    className="max-w-md"
                  />
                </div>

                {/* Field 6: Volume downtrend between peaks */}
                <div className="space-y-2">
                  <Label>האם לדרוש ווליום יורד בין השיאים?</Label>
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant={volumeDowntrend === true ? "default" : "outline"}
                      onClick={() => setVolumeDowntrend(true)}
                      className="max-w-md"
                    >
                      כן
                    </Button>
                    <Button
                      type="button"
                      variant={volumeDowntrend === false ? "default" : "outline"}
                      onClick={() => setVolumeDowntrend(false)}
                      className="max-w-md"
                    >
                      לא
                    </Button>
                  </div>
                </div>

                {/* Field 7: Early heads up enabled */}
                <div className="space-y-2">
                  <Label>האם להפעיל התראה מוקדמת?</Label>
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant={earlyHeadsUpEnabled === true ? "default" : "outline"}
                      onClick={() => setEarlyHeadsUpEnabled(true)}
                      className="max-w-md"
                    >
                      כן
                    </Button>
                    <Button
                      type="button"
                      variant={earlyHeadsUpEnabled === false ? "default" : "outline"}
                      onClick={() => setEarlyHeadsUpEnabled(false)}
                      className="max-w-md"
                    >
                      לא
                    </Button>
                  </div>
                </div>

                {/* Field 8: Early heads up rise bars (conditional) */}
                {earlyHeadsUpEnabled && (
                  <div className="space-y-2">
                    <Label htmlFor="early-heads-up-rise-bars">מספר נרות עליה להתראה מוקדמת</Label>
                    <Input
                      id="early-heads-up-rise-bars"
                      type="number"
                      value={earlyHeadsUpRiseBars}
                      onChange={(e) => setEarlyHeadsUpRiseBars(e.target.value)}
                      placeholder="הזן ערך מספרי"
                      className="max-w-md"
                    />
                  </div>
                )}
                </div>

              {/* Entry Requirements Section */}
              <div className="mt-8">
                <h1 className="text-3xl font-bold mb-4">תנאי כניסה</h1>
                <h3 className="text-xl font-medium mb-6">כניסה ראשונה</h3>

                {/* First Entry Fields */}
                <div className="space-y-6">
                  {/* Number of confirmation candles */}
                  <div className="space-y-2">
                    <Label htmlFor="first-entry-confirmation-candles">מספר נרות אישור</Label>
                  <Input
                      id="first-entry-confirmation-candles"
                    type="number"
                      value={firstEntryConfirmationCandles}
                      onChange={(e) => setFirstEntryConfirmationCandles(e.target.value)}
                      placeholder="הזן ערך מספרי"
                      className="max-w-md"
                    />
                  </div>

                  {/* Use same confirmation */}
                  <div className="space-y-2">
                    <Label>האם להשתמש באותם נרות אישור של התבנית?</Label>
                    <div className="flex gap-3">
                      <Button
                        type="button"
                        variant={entry1UsesSameConfirmation === true ? "default" : "outline"}
                        onClick={() => setEntry1UsesSameConfirmation(true)}
                        className="max-w-md"
                      >
                        כן
                      </Button>
                      <Button
                        type="button"
                        variant={entry1UsesSameConfirmation === false ? "default" : "outline"}
                        onClick={() => setEntry1UsesSameConfirmation(false)}
                        className="max-w-md"
                      >
                        לא
                      </Button>
                    </div>
                  </div>

                  {/* Should make second entry */}
                  <div className="space-y-2">
                    <Label>האם לבצע כניסה שנייה?</Label>
                    <div className="flex gap-3">
                      <Button
                        type="button"
                        variant={shouldMakeSecondEntry === true ? "default" : "outline"}
                        onClick={() => setShouldMakeSecondEntry(true)}
                        className="max-w-md"
                      >
                        כן
                      </Button>
                      <Button
                        type="button"
                        variant={shouldMakeSecondEntry === false ? "default" : "outline"}
                        onClick={() => setShouldMakeSecondEntry(false)}
                        className="max-w-md"
                      >
                        לא
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Second Entry */}
                <h3 className="text-xl font-medium mb-6 mt-8">כניסה שנייה</h3>

                {/* Second Entry Fields */}
                <div className="space-y-6">
                  {/* Number of confirmation candles */}
                  <div className="space-y-2">
                    <Label htmlFor="second-entry-confirmation-candles">
                      מספר נרות אישור מתחת ל-MA
                  </Label>
                  <Input
                      id="second-entry-confirmation-candles"
                    type="number"
                      value={secondEntryConfirmationCandles}
                      onChange={(e) => setSecondEntryConfirmationCandles(e.target.value)}
                      placeholder="הזן ערך מספרי"
                      className="max-w-md"
                    />
                  </div>

                  {/* MA Windows */}
                  <div className="space-y-2">
                    <Label>ממוצעים נעים (MA) לבדיקה</Label>
                    <div className="space-y-3">
                      {/* Current MA values */}
                      <div className="flex flex-wrap gap-2">
                        {maWindows.map((window) => (
                          <div
                            key={window}
                            className="flex items-center gap-2 bg-secondary px-3 py-1 rounded-md"
                          >
                            <span>MA {window}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5"
                              onClick={() => handleRemoveMaWindow(window)}
                              aria-label={`מחק MA ${window}`}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                </div>

                      {/* Add new MA */}
                      <div className="flex items-center gap-2 max-w-md">
                  <Input
                    type="number"
                          value={customMaWindow}
                          onChange={(e) => setCustomMaWindow(e.target.value)}
                          placeholder="הוסף MA חדש"
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          onClick={handleAddMaWindow}
                          disabled={!customMaWindow}
                        >
                          הוסף
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
                </div>

              {/* Exit Conditions Section */}
              <div className="mt-8">
                <h1 className="text-3xl font-bold mb-4">תנאי יציאה</h1>
                <h3 className="text-xl font-medium mb-6">יציאה ראשונה</h3>

                {/* First Entry Exit Fields */}
                <div className="space-y-6">
                  {/* Abnormal Volume Percentage */}
                  <div className="space-y-2">
                    <Label htmlFor="abnormal-volume-percentage">פי כמה מהממוצע ייחשב חריג</Label>
                  <Input
                      id="abnormal-volume-percentage"
                    type="number"
                      value={abnormalVolumePercentage}
                      onChange={(e) => setAbnormalVolumePercentage(e.target.value)}
                      placeholder="למשל: 2.0"
                      className="max-w-md"
                    />
                </div>

                  {/* Abnormal Volume Window Mode */}
                  <div className="space-y-2">
                    <Label>שיטת חישוב חלון הנפח</Label>
                    <div className="flex gap-3">
                      <Button
                        type="button"
                        variant={abnormalVolWindowMode === "fixed" ? "default" : "outline"}
                        onClick={() => setAbnormalVolWindowMode("fixed")}
                        className="max-w-md"
                      >
                        חלון קבוע
                      </Button>
                      <Button
                        type="button"
                        variant={abnormalVolWindowMode === "fromFirstRed" ? "default" : "outline"}
                        onClick={() => setAbnormalVolWindowMode("fromFirstRed")}
                        className="max-w-md"
                      >
                        מהנר האדום הראשון
                      </Button>
                    </div>
                </div>

                  {/* Number of candles back to compare (only for fixed mode) */}
                  {abnormalVolWindowMode === "fixed" && (
                    <div className="space-y-2">
                      <Label htmlFor="candles-back-to-compare">מספר נרות אחורה להשוואת נפח</Label>
                    <Input
                        id="candles-back-to-compare"
                      type="number"
                        value={candlesBackToCompare}
                        onChange={(e) => setCandlesBackToCompare(e.target.value)}
                        placeholder="הזן ערך מספרי"
                        className="max-w-md"
                      />
                  </div>
                )}
                </div>

                {/* Second Exit */}
                <h3 className="text-xl font-medium mb-6 mt-8">יציאה שנייה</h3>

                {/* Second Exit Fields */}
                <div className="space-y-6">
                  {/* Exit on MA touch */}
                  <div className="space-y-2">
                    <Label>האם לצאת כשנוגעים ב-MA מלמטה?</Label>
                    <div className="flex gap-3">
                      <Button
                        type="button"
                        variant={exit2OnTouchMA === true ? "default" : "outline"}
                        onClick={() => setExit2OnTouchMA(true)}
                        className="max-w-md"
                      >
                        כן
                      </Button>
                      <Button
                        type="button"
                        variant={exit2OnTouchMA === false ? "default" : "outline"}
                        onClick={() => setExit2OnTouchMA(false)}
                        className="max-w-md"
                      >
                        לא
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stops Section */}
              <div className="mt-8">
                <h1 className="text-3xl font-bold mb-4">סטופים</h1>
                <h3 className="text-xl font-medium mb-6">סטופ לכניסה ראשונה</h3>

                {/* Stop 1 Fields */}
                <div className="space-y-6">
                  {/* Stop 1 initial at peak */}
                  <div className="space-y-2">
                    <Label>האם הסטופ הראשוני בגובה השיא השני?</Label>
                    <div className="flex gap-3">
                      <Button
                        type="button"
                        variant={stop1InitialAtPeak === true ? "default" : "outline"}
                        onClick={() => setStop1InitialAtPeak(true)}
                        className="max-w-md"
                      >
                        כן
                      </Button>
                      <Button
                        type="button"
                        variant={stop1InitialAtPeak === false ? "default" : "outline"}
                        onClick={() => setStop1InitialAtPeak(false)}
                        className="max-w-md"
                      >
                        לא
                      </Button>
                    </div>
                  </div>

                  {/* Stop 1 trailing */}
                  <div className="space-y-2">
                    <Label>האם הסטופ נגרר מדרגות (לפי lower-highs)?</Label>
                    <div className="flex gap-3">
                      <Button
                        type="button"
                        variant={stop1Trailing === true ? "default" : "outline"}
                        onClick={() => setStop1Trailing(true)}
                        className="max-w-md"
                      >
                        כן
                      </Button>
                      <Button
                        type="button"
                        variant={stop1Trailing === false ? "default" : "outline"}
                        onClick={() => setStop1Trailing(false)}
                        className="max-w-md"
                      >
                        לא
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Stop 2 */}
                <h3 className="text-xl font-medium mb-6 mt-8">סטופ לכניסה שנייה</h3>

                {/* Stop 2 Fields */}
                <div className="space-y-6">
                  {/* Stop 2 initial at MA fail */}
                  <div className="space-y-2">
                    <Label>האם הסטופ הראשוני בגובה נר הכשל על ה-MA?</Label>
                    <div className="flex gap-3">
                      <Button
                        type="button"
                        variant={stop2InitialAtMA === true ? "default" : "outline"}
                        onClick={() => setStop2InitialAtMA(true)}
                        className="max-w-md"
                      >
                        כן
                      </Button>
                      <Button
                        type="button"
                        variant={stop2InitialAtMA === false ? "default" : "outline"}
                        onClick={() => setStop2InitialAtMA(false)}
                        className="max-w-md"
                      >
                        לא
                      </Button>
                    </div>
                </div>

                  {/* Stop 2 trailing */}
                  <div className="space-y-2">
                    <Label>האם הסטופ נגרר מדרגות?</Label>
                    <div className="flex gap-3">
                      <Button
                        type="button"
                        variant={stop2Trailing === true ? "default" : "outline"}
                        onClick={() => setStop2Trailing(true)}
                        className="max-w-md"
                      >
                        כן
                      </Button>
                      <Button
                        type="button"
                        variant={stop2Trailing === false ? "default" : "outline"}
                        onClick={() => setStop2Trailing(false)}
                        className="max-w-md"
                      >
                        לא
                      </Button>
                    </div>
                  </div>
                </div>
                  </div>

              {/* Save Button */}
              <div className="mt-8 flex justify-end">
                  <Button
                  onClick={handleSave}
                    disabled={isSaving}
                  size="lg"
                  className="flex items-center gap-2"
                >
                  <Save className="h-5 w-5" />
                  {isSaving ? "שומר..." : "שמור אסטרטגיה"}
                  </Button>
                </div>
            </div>
          </div>
        </section>

        {/* Right Sidebar - Fixed to right edge (AI Chat) - 30% width */}
        <aside
          className="fixed right-0 bottom-0 w-[30%] p-6 overflow-y-auto border-r bg-background"
          style={{ top: "calc(64px + 1rem)" }}
        >
            <AIChatPanel />
        </aside>
      </main>
    </div>
  );
}
