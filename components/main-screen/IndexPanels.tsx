"use client";

import { Plus, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AddIndexModal } from "./AddIndexModal";
import { ClearCacheButton } from "./ClearCacheButton";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import type { Id } from "@/convex/_generated/dataModel";
import { IndexPanel } from "./IndexPanel";

export function IndexPanels() {
  const { user } = useUser();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Get user's saved index panels from Convex
  const savedPanels = useQuery(
    api.userIndexPanels.getUserIndexPanels,
    user ? { userId: user.id } : "skip"
  );

  const addIndexPanel = useMutation(api.userIndexPanels.addIndexPanel);
  const deleteIndexPanel = useMutation(api.userIndexPanels.deleteIndexPanel);

  // Note: Each IndexPanel component uses useRealtimeMarketData hook
  // which automatically refreshes data every 30 seconds
  // No need for manual refresh here

  const handleAddIndex = async (symbol: string) => {
    if (!user) return;

    try {
      await addIndexPanel({
        userId: user.id,
        symbol,
      });
      setIsModalOpen(false);
    } catch (error: any) {
      console.error("Error adding index:", error);
      alert(error.message || "שגיאה בהוספת המדד");
    }
  };

  const handleDeleteIndex = async (panelId: Id<"userIndexPanels">) => {
    if (!user) return;

    try {
      await deleteIndexPanel({
        userId: user.id,
        panelId,
      });
    } catch (error) {
      console.error("Error deleting index:", error);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">מדדים</h2>

      <div className="space-y-3">
        {savedPanels && savedPanels.length > 0 ? (
          savedPanels.map((panel) => (
            <IndexPanel
              key={panel._id}
              id={panel._id}
              symbol={panel.symbol}
              onDelete={() => handleDeleteIndex(panel._id)}
            />
          ))
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">אין מדדים עדיין</p>
            <p className="text-xs mt-1">לחץ על &quot;הוסף מדד&quot; להתחלה</p>
          </div>
        )}
      </div>

      <Button
        variant="orangeOutline"
        className="w-full flex items-center gap-2"
        onClick={() => setIsModalOpen(true)}
      >
        <Plus className="h-4 w-4" />
        הוסף מדד
      </Button>

      {/* Temporary button to clear cache - can be removed later */}
      <ClearCacheButton />

      <AddIndexModal open={isModalOpen} onOpenChange={setIsModalOpen} onAdd={handleAddIndex} />
    </div>
  );
}
