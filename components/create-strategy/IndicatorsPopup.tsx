"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Indicator {
  id: string;
  name: string;
  value: string;
}

interface IndicatorsPopupProps {
  indicators: Indicator[];
  editingIndicator: Indicator | null;
  onSave: (indicators: Indicator[]) => void;
  onCancel: () => void;
  onDelete: (id: string) => void;
}

export function IndicatorsPopup({
  indicators,
  editingIndicator,
  onSave,
  onCancel,
  onDelete,
}: IndicatorsPopupProps) {
  const [name, setName] = useState(editingIndicator?.name || "");
  const [value, setValue] = useState(editingIndicator?.value || "");
  const [showValueField, setShowValueField] = useState(false);

  useEffect(() => {
    if (editingIndicator) {
      setName(editingIndicator.name);
      setValue(editingIndicator.value);
      setShowValueField(true);
    } else {
      setName("");
      setValue("");
      setShowValueField(false);
    }
  }, [editingIndicator]);

  const handleNameChange = (newName: string) => {
    setName(newName);
    if (newName.trim()) {
      setShowValueField(true);
    }
  };

  const handleAdd = () => {
    if (name.trim() && value.trim()) {
      const newIndicator: Indicator = {
        id: editingIndicator?.id || Date.now().toString(),
        name: name.trim(),
        value: value.trim(),
      };

      if (editingIndicator) {
        // Update existing
        const updated = indicators.map((ind) =>
          ind.id === editingIndicator.id ? newIndicator : ind
        );
        onSave(updated);
      } else {
        // Add new
        onSave([...indicators, newIndicator]);
      }

      // Reset form
      setName("");
      setValue("");
      setShowValueField(false);
    }
  };

  return (
    <div className="bg-[#e5e5e5] rounded-lg p-4 shadow-lg border border-[#d0d0d0] w-[350px] max-w-[calc(100vw-32px)]">
      <h4 className="text-lg font-semibold mb-4 text-black">הכנס אינדיקטורים</h4>

      <div className="space-y-4">
        <div>
          <Label htmlFor="indicator-name" className="text-black mb-2 block">
            הוסף אינדיקטור
          </Label>
          <Input
            id="indicator-name"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="שם האינדיקטור"
            className="bg-white text-black border-[#404040]"
          />
        </div>

        {showValueField && (
          <div>
            <Label htmlFor="indicator-value" className="text-black mb-2 block">
              הכנס ערך
            </Label>
            <Input
              id="indicator-value"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="ערך מספרי"
              className="bg-white text-black border-[#404040]"
            />
          </div>
        )}

        {/* List of indicators inside popup */}
        {indicators.length > 0 && (
          <div>
            <Label className="text-black mb-2 block">אינדיקטורים שנוספו:</Label>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {indicators.map((ind) => (
                <div
                  key={ind.id}
                  className="flex items-center justify-between p-2 bg-white rounded-lg"
                >
                  <span className="text-black text-sm">
                    {ind.name} ({ind.value})
                  </span>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setName(ind.name);
                        setValue(ind.value);
                        setShowValueField(true);
                      }}
                      className="text-xs h-6 px-2"
                    >
                      ערוך
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(ind.id)}
                      className="text-xs h-6 px-2 text-destructive"
                    >
                      מחק
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-2 border-t border-[#d0d0d0]">
          <Button
            variant="default"
            onClick={handleAdd}
            disabled={!name.trim() || !value.trim()}
            className="flex-1 bg-[#ff6b35] hover:bg-[#ff5722] disabled:opacity-50"
          >
            {editingIndicator ? "עדכן" : "הוסף"}
          </Button>
          <Button
            variant="default"
            onClick={() => {
              onSave(indicators);
            }}
            className="flex-1 bg-[#ff6b35] hover:bg-[#ff5722]"
          >
            סיום
          </Button>
        </div>
      </div>
    </div>
  );
}
