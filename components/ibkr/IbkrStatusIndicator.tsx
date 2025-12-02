"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

export function IbkrStatusIndicator() {
  const [status, setStatus] = useState<"checking" | "connected" | "disconnected">("checking");

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch("/api/ibkr/auth/status");
        if (res.ok) {
          const data = await res.json();
          setStatus(data.connected ? "connected" : "disconnected");
        } else {
          setStatus("disconnected");
        }
      } catch {
        setStatus("disconnected");
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  if (status === "checking") {
    return (
      <Badge variant="outline" className="flex items-center gap-1">
        <Loader2 className="h-3 w-3 animate-spin" />
        בודק חיבור...
      </Badge>
    );
  }

  if (status === "connected") {
    return (
      <Badge variant="default" className="bg-green-600 hover:bg-green-700">
        <span className="inline-block h-2 w-2 rounded-full bg-white animate-pulse mr-1" />
        IB Gateway מחובר
      </Badge>
    );
  }

  return (
    <Badge variant="destructive">
      <span className="inline-block h-2 w-2 rounded-full bg-white mr-1" />
      IB Gateway מנותק
    </Badge>
  );
}

