"use client";

import { Edit, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface CreateStrategyPanelProps {
  strategies: string[];
  onAddStrategy: () => void;
  onDeleteStrategy: (index: number) => void;
  onRenameStrategy: (index: number, newName: string) => void;
}

export function CreateStrategyPanel({
  strategies,
  onAddStrategy,
  onDeleteStrategy,
  onRenameStrategy,
}: CreateStrategyPanelProps) {
  const router = useRouter();
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");

  const handleStrategyClick = (strategyName: string) => {
    // Navigate to strategy creation screen
    router.push(`/strategy/create?name=${encodeURIComponent(strategyName)}`);
  };

  const handleEditClick = (index: number, currentName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingIndex(index);
    setEditValue(currentName);
  };

  const handleSaveEdit = (index: number) => {
    if (editValue.trim()) {
      onRenameStrategy(index, editValue.trim());
    }
    setEditingIndex(null);
    setEditValue("");
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditValue("");
  };

  const handleDeleteClick = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`האם אתה בטוח שברצונך למחוק את "${strategies[index]}"?`)) {
      onDeleteStrategy(index);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-center">צור אסטרטגיה</h2>
      <div className="flex flex-col gap-3">
        {/* Strategies grid */}
        <div className="grid grid-cols-2 gap-3">
          {strategies.map((strategy, index) => (
            <div key={index} className="relative group">
              {editingIndex === index ? (
                <div className="flex gap-2">
                  <Input
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleSaveEdit(index);
                      } else if (e.key === "Escape") {
                        handleCancelEdit();
                      }
                    }}
                    className="flex-1"
                    autoFocus={true}
                  />
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleSaveEdit(index)}
                    className="shrink-0"
                  >
                    שמור
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancelEdit}
                    className="shrink-0"
                  >
                    ביטול
                  </Button>
                </div>
              ) : (
                <>
                  <Button
                    variant="outline"
                    className="w-full h-auto py-4 text-base font-medium pr-12"
                    onClick={() => handleStrategyClick(strategy)}
                  >
                    {strategy}
                  </Button>
                  <div className="absolute left-2 top-1/2 -translate-y-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => handleEditClick(index, strategy, e)}
                      aria-label={`שנה שם ${strategy}`}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={(e) => handleDeleteClick(index, e)}
                      aria-label={`מחק ${strategy}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
        {/* Add button - positioned below strategies, aligned to the left */}
        <div className="flex items-center gap-2">
          <Button
            variant="default"
            size="icon"
            className="h-12 w-12 rounded-full shrink-0"
            onClick={onAddStrategy}
            aria-label="הוסף אסטרטגיה"
          >
            <Plus className="h-6 w-6" />
          </Button>
          <span className="text-sm text-muted-foreground">הוסף אסטרטגיה</span>
        </div>
      </div>
    </div>
  );
}
