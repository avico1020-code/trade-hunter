"use client";

import { Button } from "@/components/ui/button";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Trash2 } from "lucide-react";
import { useState } from "react";

/**
 * Temporary component to clear Finviz cache
 * DELETE THIS FILE AFTER USE
 */
export function ClearFinvizCacheButton() {
  const [isClearing, setIsClearing] = useState(false);
  const clearCache = useAction(api.clearFinvizCacheAction.clearFinvizCacheNow);

  const handleClear = async () => {
    if (window.confirm("האם לנקות את ה-cache של Finviz? (זה יאלץ את המערכת למשוך חדשות חדשות)")) {
      setIsClearing(true);
      try {
        const result = await clearCache();
        alert(`נוקה בהצלחה! נמחקו ${result.deleted} חדשות ישנות מ-Finviz. רענן את הדף.`);
        window.location.reload();
      } catch (error) {
        console.error("Error clearing Finviz cache:", error);
        alert("שגיאה בניקוי ה-cache");
      } finally {
        setIsClearing(false);
      }
    }
  };

  return (
    <Button
      variant="destructive"
      size="sm"
      onClick={handleClear}
      disabled={isClearing}
      className="fixed bottom-4 left-4 z-50"
    >
      <Trash2 className="h-4 w-4 ml-2" />
      {isClearing ? "מנקה..." : "נקה Cache של Finviz"}
    </Button>
  );
}

