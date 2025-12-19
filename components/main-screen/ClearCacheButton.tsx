"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { useState } from "react";

export function ClearCacheButton() {
  const clearCache = useMutation(api.clearYahooCache.clearAllYahooCache);
  const [isClearing, setIsClearing] = useState(false);

  const handleClearCache = async () => {
    if (!confirm("האם אתה בטוח שברצונך לנקות את כל נתוני ה-cache?")) {
      return;
    }

    setIsClearing(true);
    try {
      const result = await clearCache();
      alert(
        `Cache נוקה בהצלחה!\n` +
          `נמחקו: ${result.deletedQuotes} מחירים, ${result.deletedNews} חדשות, ${result.deletedHistorical} גרפים`
      );
      // Reload page to fetch fresh data
      window.location.reload();
    } catch (error) {
      console.error("Error clearing cache:", error);
      alert("שגיאה בניקוי ה-cache");
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClearCache}
      disabled={isClearing}
      className="w-full flex items-center gap-2"
    >
      <Trash2 className="h-4 w-4" />
      {isClearing ? "מנקה..." : "נקה Cache (זמני)"}
    </Button>
  );
}

