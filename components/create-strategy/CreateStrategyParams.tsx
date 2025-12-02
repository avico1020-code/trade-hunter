"use client";

import { IndicatorsParam } from "./IndicatorsParam";
import { StopParam } from "./StopParam";
import { TimeframeParam } from "./TimeframeParam";
import { TradeDirectionParam } from "./TradeDirectionParam";
import { TriggerParam } from "./TriggerParam";

interface StrategyData {
  tradeDirection: "long" | "short";
  timeframe: string;
  indicators: Array<{ id: string; name: string; value: string }>;
  entryTrigger: any;
  exitTrigger: any;
  stop: { value: string; type: "$" | "%" };
}

interface CreateStrategyParamsProps {
  strategyData: StrategyData;
  onUpdateStrategyData: (data: StrategyData) => void;
}

export function CreateStrategyParams({
  strategyData,
  onUpdateStrategyData,
}: CreateStrategyParamsProps) {
  const updateField = <K extends keyof StrategyData>(field: K, value: StrategyData[K]) => {
    onUpdateStrategyData({ ...strategyData, [field]: value });
  };

  return (
    <div className="space-y-4">
      {/* Trade Direction */}
      <div>
        <h3 className="text-base font-semibold mb-2">כיוון טרייד</h3>
        <TradeDirectionParam
          value={strategyData.tradeDirection}
          onChange={(value) => updateField("tradeDirection", value)}
        />
      </div>

      {/* Timeframe */}
      <div>
        <h3 className="text-base font-semibold mb-2">הכנס אינטרוול זמן</h3>
        <TimeframeParam
          value={strategyData.timeframe}
          onChange={(value) => updateField("timeframe", value)}
        />
      </div>

      {/* Indicators */}
      <div>
        <h3 className="text-base font-semibold mb-2">הכנס אינדיקטורים</h3>
        <IndicatorsParam
          indicators={strategyData.indicators}
          onChange={(indicators) => updateField("indicators", indicators)}
        />
      </div>

      {/* Entry Trigger */}
      <div>
        <h3 className="text-base font-semibold mb-2">טריגר כניסה</h3>
        <TriggerParam
          type="entry"
          value={strategyData.entryTrigger}
          indicators={strategyData.indicators}
          onChange={(value) => updateField("entryTrigger", value)}
        />
      </div>

      {/* Exit Trigger */}
      <div>
        <h3 className="text-base font-semibold mb-2">טריגר יציאה</h3>
        <TriggerParam
          type="exit"
          value={strategyData.exitTrigger}
          indicators={strategyData.indicators}
          onChange={(value) => updateField("exitTrigger", value)}
        />
      </div>

      {/* Stop */}
      <div>
        <h3 className="text-base font-semibold mb-2">סטופ</h3>
        <StopParam value={strategyData.stop} onChange={(value) => updateField("stop", value)} />
      </div>
    </div>
  );
}
