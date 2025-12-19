"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Indicator {
  id: string;
  name: string;
  value: string;
}

interface TriggerPopupProps {
  type: "entry" | "exit";
  value: any;
  indicators: Indicator[];
  onChange: (value: any) => void;
  onCancel: () => void;
}

export function TriggerPopup({ type, value, indicators, onChange, onCancel }: TriggerPopupProps) {
  const [triggerData, setTriggerData] = useState({
    indicatorRules: value?.indicatorRules || [],
    volume: value?.volume || {
      trigger: "",
      barsOperator: "",
      barsValue: "",
      changeOperator: "",
      changeValue: "",
    },
    price: value?.price || {
      vsPreviousClose: { operator: "", value: "" },
      crossingRules: [],
    },
    news: value?.news ?? false,
  });

  const operatorButtons = ["חוצה מעל", "חוצה מתחת", "מעל ערך", "מתחת ערך", "בין- ל-"];

  const handleSave = () => {
    onChange(triggerData);
  };

  // Indicator Rules
  const addIndicatorRule = () => {
    setTriggerData({
      ...triggerData,
      indicatorRules: [
        ...triggerData.indicatorRules,
        {
          indicator1: "",
          operator: "",
          indicator2: "",
          value: "",
          value2: "",
        },
      ],
    });
  };

  const updateIndicatorRule = (index: number, field: string, val: string) => {
    const updated = [...triggerData.indicatorRules];
    updated[index] = { ...updated[index], [field]: val };
    setTriggerData({ ...triggerData, indicatorRules: updated });
  };

  const removeIndicatorRule = (index: number) => {
    setTriggerData({
      ...triggerData,
      indicatorRules: triggerData.indicatorRules.filter((_, i) => i !== index),
    });
  };

  // Price Crossing Rules
  const addPriceCrossingRule = () => {
    setTriggerData({
      ...triggerData,
      price: {
        ...triggerData.price,
        crossingRules: [...triggerData.price.crossingRules, { indicator: "", direction: "" }],
      },
    });
  };

  const updatePriceCrossingRule = (index: number, field: string, val: string) => {
    const updated = [...triggerData.price.crossingRules];
    updated[index] = { ...updated[index], [field]: val };
    setTriggerData({
      ...triggerData,
      price: { ...triggerData.price, crossingRules: updated },
    });
  };

  const removePriceCrossingRule = (index: number) => {
    setTriggerData({
      ...triggerData,
      price: {
        ...triggerData.price,
        crossingRules: triggerData.price.crossingRules.filter((_, i) => i !== index),
      },
    });
  };

  return (
    <div className="bg-[#e5e5e5] rounded-lg p-4 shadow-lg border border-[#d0d0d0] w-[500px] max-w-[calc(100vw-32px)] max-h-[80vh] overflow-y-auto">
      <h4 className="text-lg font-semibold mb-4 text-black">
        טריגר {type === "entry" ? "כניסה" : "יציאה"}
      </h4>

      <div className="space-y-6">
        {/* Category 1 - Indicators */}
        <div>
          <h5 className="text-base font-semibold mb-3 text-black">מתנדים</h5>
          <div className="space-y-3">
            {/* All indicators from Parameter 3 as buttons (column layout) */}
            {indicators.length > 0 && (
              <div className="flex flex-col gap-2">
                {indicators.map((ind) => (
                  <Button
                    key={ind.id}
                    variant="outline"
                    size="sm"
                    className="w-full justify-start bg-[#404040] text-white hover:bg-[#505050]"
                  >
                    {ind.name} ({ind.value})
                  </Button>
                ))}
              </div>
            )}

            {/* Operator buttons */}
            <div className="flex flex-wrap gap-1.5">
              {operatorButtons.map((op) => (
                <Button
                  key={op}
                  variant="outline"
                  size="sm"
                  className="bg-[#404040] text-white hover:bg-[#505050] text-xs px-2 py-1 h-auto"
                >
                  {op}
                </Button>
              ))}
            </div>

            {/* Indicator Rules */}
            {triggerData.indicatorRules.map((rule, index) => {
              const isCrossOperator = rule.operator === "חוצה מעל" || rule.operator === "חוצה מתחת";
              const isBetween = rule.operator === "בין- ל-";

              return (
                <div key={index} className="p-3 bg-white rounded-lg space-y-2">
                  <div className="flex gap-2">
                    <select
                      value={rule.indicator1 || ""}
                      onChange={(e) => updateIndicatorRule(index, "indicator1", e.target.value)}
                      className="flex-1 px-3 py-2 border border-[#404040] rounded-lg bg-white text-black text-sm"
                    >
                      <option value="">בחר אינדיקטור</option>
                      {indicators.map((ind) => (
                        <option key={ind.id} value={ind.name}>
                          {ind.name}
                        </option>
                      ))}
                    </select>
                    <select
                      value={rule.operator || ""}
                      onChange={(e) => updateIndicatorRule(index, "operator", e.target.value)}
                      className="flex-1 px-3 py-2 border border-[#404040] rounded-lg bg-white text-black text-sm"
                    >
                      <option value="">בחר אופרטור</option>
                      {operatorButtons.map((op) => (
                        <option key={op} value={op}>
                          {op}
                        </option>
                      ))}
                    </select>
                  </div>

                  {isCrossOperator && (
                    <select
                      value={rule.indicator2 || ""}
                      onChange={(e) => updateIndicatorRule(index, "indicator2", e.target.value)}
                      className="w-full px-3 py-2 border border-[#404040] rounded-lg bg-white text-black text-sm"
                    >
                      <option value="">בחר אינדיקטור להשוואה</option>
                      {indicators.map((ind) => (
                        <option key={ind.id} value={ind.name}>
                          {ind.name}
                        </option>
                      ))}
                    </select>
                  )}

                  {!isCrossOperator && (
                    <div className="flex gap-2">
                      {isBetween ? (
                        <>
                          <Input
                            value={rule.value || ""}
                            onChange={(e) => updateIndicatorRule(index, "value", e.target.value)}
                            placeholder="מ-"
                            className="flex-1 bg-white text-black border-[#404040] text-sm"
                          />
                          <Input
                            value={rule.value2 || ""}
                            onChange={(e) => updateIndicatorRule(index, "value2", e.target.value)}
                            placeholder="עד"
                            className="flex-1 bg-white text-black border-[#404040] text-sm"
                          />
                        </>
                      ) : (
                        <Input
                          value={rule.value || ""}
                          onChange={(e) => updateIndicatorRule(index, "value", e.target.value)}
                          placeholder="ערך"
                          className="flex-1 bg-white text-black border-[#404040] text-sm"
                        />
                      )}
                    </div>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeIndicatorRule(index)}
                    className="text-destructive text-xs"
                  >
                    מחק כלל
                  </Button>
                </div>
              );
            })}

            <Button
              variant="outline"
              onClick={addIndicatorRule}
              className="w-full flex items-center gap-2 bg-[#404040] text-white hover:bg-[#505050]"
            >
              <Plus className="h-4 w-4" />
              הוסף כלל אינדיקטור
            </Button>
          </div>
        </div>

        {/* Category 2 - Volume */}
        <div>
          <h5 className="text-base font-semibold mb-3 text-black">ווליום</h5>
          <div className="space-y-4">
            {/* Trigger */}
            <div>
              <Label className="text-black mb-2 block text-sm">טריגר:</Label>
              <div className="flex gap-1.5">
                <Button
                  variant={triggerData.volume.trigger === "increasing" ? "default" : "outline"}
                  size="sm"
                  onClick={() =>
                    setTriggerData({
                      ...triggerData,
                      volume: { ...triggerData.volume, trigger: "increasing" },
                    })
                  }
                  className={
                    triggerData.volume.trigger === "increasing"
                      ? "bg-[#ff6b35] text-white hover:bg-[#ff5722]"
                      : "bg-[#404040] text-white hover:bg-[#505050]"
                  }
                >
                  ווליום עולה
                </Button>
                <Button
                  variant={triggerData.volume.trigger === "decreasing" ? "default" : "outline"}
                  size="sm"
                  onClick={() =>
                    setTriggerData({
                      ...triggerData,
                      volume: { ...triggerData.volume, trigger: "decreasing" },
                    })
                  }
                  className={
                    triggerData.volume.trigger === "decreasing"
                      ? "bg-[#ff6b35] text-white hover:bg-[#ff5722]"
                      : "bg-[#404040] text-white hover:bg-[#505050]"
                  }
                >
                  ווליום יורד
                </Button>
                <Button
                  variant={triggerData.volume.trigger === "unusual" ? "default" : "outline"}
                  size="sm"
                  onClick={() =>
                    setTriggerData({
                      ...triggerData,
                      volume: { ...triggerData.volume, trigger: "unusual" },
                    })
                  }
                  className={
                    triggerData.volume.trigger === "unusual"
                      ? "bg-[#ff6b35] text-white hover:bg-[#ff5722]"
                      : "bg-[#404040] text-white hover:bg-[#505050]"
                  }
                >
                  ווליום חריג
                </Button>
              </div>
            </div>

            {/* Number of Bars */}
            <div>
              <Label className="text-black mb-2 block text-sm">מספר ברים:</Label>
              <div className="flex gap-1.5">
                {["גדול מ-", "קטן מ-", "בין- ל-"].map((op) => (
                  <Button
                    key={op}
                    variant={triggerData.volume.barsOperator === op ? "default" : "outline"}
                    size="sm"
                    onClick={() =>
                      setTriggerData({
                        ...triggerData,
                        volume: { ...triggerData.volume, barsOperator: op },
                      })
                    }
                    className={
                      triggerData.volume.barsOperator === op
                        ? "bg-[#ff6b35] text-white hover:bg-[#ff5722]"
                        : "bg-[#404040] text-white hover:bg-[#505050]"
                    }
                  >
                    {op}
                  </Button>
                ))}
              </div>
              {triggerData.volume.barsOperator && (
                <Input
                  value={triggerData.volume.barsValue || ""}
                  onChange={(e) =>
                    setTriggerData({
                      ...triggerData,
                      volume: { ...triggerData.volume, barsValue: e.target.value },
                    })
                  }
                  placeholder="ערך"
                  className="mt-2 bg-white text-black border-[#404040] text-sm"
                />
              )}
            </div>

            {/* Volume Change Amount */}
            <div>
              <Label className="text-black mb-2 block text-sm">גודל השינוי (%):</Label>
              <div className="flex gap-1.5">
                {["גדול מ-", "קטן מ-", "בין- ל-"].map((op) => (
                  <Button
                    key={op}
                    variant={triggerData.volume.changeOperator === op ? "default" : "outline"}
                    size="sm"
                    onClick={() =>
                      setTriggerData({
                        ...triggerData,
                        volume: { ...triggerData.volume, changeOperator: op },
                      })
                    }
                    className={
                      triggerData.volume.changeOperator === op
                        ? "bg-[#ff6b35] text-white hover:bg-[#ff5722]"
                        : "bg-[#404040] text-white hover:bg-[#505050]"
                    }
                  >
                    {op}
                  </Button>
                ))}
              </div>
              {triggerData.volume.changeOperator && (
                <Input
                  value={triggerData.volume.changeValue || ""}
                  onChange={(e) =>
                    setTriggerData({
                      ...triggerData,
                      volume: { ...triggerData.volume, changeValue: e.target.value },
                    })
                  }
                  placeholder="ערך"
                  className="mt-2 bg-white text-black border-[#404040] text-sm"
                />
              )}
            </div>
          </div>
        </div>

        {/* Category 3 - Price */}
        <div>
          <h5 className="text-base font-semibold mb-3 text-black">מחיר</h5>
          <div className="space-y-4">
            {/* Price vs Previous Close */}
            <div>
              <Label className="text-black mb-2 block text-sm">מחיר מול סגירה יום קודם:</Label>
              <div className="flex gap-1.5 mb-2">
                {["גדול מ-", "קטן מ-", "בין- ל-"].map((op) => (
                  <Button
                    key={op}
                    variant={
                      triggerData.price.vsPreviousClose.operator === op ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() =>
                      setTriggerData({
                        ...triggerData,
                        price: {
                          ...triggerData.price,
                          vsPreviousClose: { ...triggerData.price.vsPreviousClose, operator: op },
                        },
                      })
                    }
                    className={
                      triggerData.price.vsPreviousClose.operator === op
                        ? "bg-[#ff6b35] text-white hover:bg-[#ff5722]"
                        : "bg-[#404040] text-white hover:bg-[#505050]"
                    }
                  >
                    {op}
                  </Button>
                ))}
              </div>
              {triggerData.price.vsPreviousClose.operator && (
                <Input
                  value={triggerData.price.vsPreviousClose.value || ""}
                  onChange={(e) =>
                    setTriggerData({
                      ...triggerData,
                      price: {
                        ...triggerData.price,
                        vsPreviousClose: {
                          ...triggerData.price.vsPreviousClose,
                          value: e.target.value,
                        },
                      },
                    })
                  }
                  placeholder="ערך"
                  className="bg-white text-black border-[#404040] text-sm"
                />
              )}
            </div>

            {/* Price Crossing */}
            <div>
              <Label className="text-black mb-2 block text-sm">מחיר חוצה:</Label>
              {triggerData.price.crossingRules.map((rule, index) => (
                <div key={index} className="mb-3 p-3 bg-white rounded-lg space-y-2">
                  <select
                    value={rule.indicator || ""}
                    onChange={(e) => updatePriceCrossingRule(index, "indicator", e.target.value)}
                    className="w-full px-3 py-2 border border-[#404040] rounded-lg bg-white text-black text-sm"
                  >
                    <option value="">בחר אינדיקטור</option>
                    {indicators.map((ind) => (
                      <option key={ind.id} value={ind.name}>
                        {ind.name}
                      </option>
                    ))}
                  </select>
                  <div className="flex gap-1.5">
                    <Button
                      variant={rule.direction === "above" ? "default" : "outline"}
                      size="sm"
                      onClick={() => updatePriceCrossingRule(index, "direction", "above")}
                      className={
                        rule.direction === "above"
                          ? "flex-1 bg-[#ff6b35] text-white hover:bg-[#ff5722]"
                          : "flex-1 bg-[#404040] text-white hover:bg-[#505050]"
                      }
                    >
                      חוצה מעל
                    </Button>
                    <Button
                      variant={rule.direction === "below" ? "default" : "outline"}
                      size="sm"
                      onClick={() => updatePriceCrossingRule(index, "direction", "below")}
                      className={
                        rule.direction === "below"
                          ? "flex-1 bg-[#ff6b35] text-white hover:bg-[#ff5722]"
                          : "flex-1 bg-[#404040] text-white hover:bg-[#505050]"
                      }
                    >
                      חוצה מתחת
                    </Button>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removePriceCrossingRule(index)}
                    className="text-destructive text-xs"
                  >
                    מחק כלל
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                onClick={addPriceCrossingRule}
                className="w-full flex items-center gap-2 bg-[#404040] text-white hover:bg-[#505050]"
              >
                <Plus className="h-4 w-4" />
                הוסף אינדיקטור
              </Button>
            </div>
          </div>
        </div>

        {/* Category 4 - News */}
        <div>
          <h5 className="text-base font-semibold mb-3 text-black">חדשות</h5>
          <div>
            <Label className="text-black mb-2 block text-sm">שילוב חדשות תומכות במגמה:</Label>
            <div className="flex gap-2">
              <Button
                variant={triggerData.news ? "default" : "outline"}
                onClick={() => setTriggerData({ ...triggerData, news: true })}
                className={
                  triggerData.news
                    ? "bg-[#ff6b35] text-white hover:bg-[#ff5722]"
                    : "bg-[#404040] text-white hover:bg-[#505050]"
                }
              >
                הפעל
              </Button>
              <Button
                variant={!triggerData.news ? "default" : "outline"}
                onClick={() => setTriggerData({ ...triggerData, news: false })}
                className={
                  !triggerData.news
                    ? "bg-[#ff6b35] text-white hover:bg-[#ff5722]"
                    : "bg-[#404040] text-white hover:bg-[#505050]"
                }
              >
                כבה
              </Button>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4 border-t border-[#d0d0d0]">
          <Button
            variant="default"
            onClick={handleSave}
            className="flex-1 bg-[#ff6b35] hover:bg-[#ff5722]"
          >
            שמור
          </Button>
          <Button variant="outline" onClick={onCancel} className="flex-1">
            ביטול
          </Button>
        </div>
      </div>
    </div>
  );
}
