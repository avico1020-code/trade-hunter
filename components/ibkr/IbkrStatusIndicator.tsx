"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

export function IbkrStatusIndicator() {
  const [status, setStatus] = useState<"checking" | "connected" | "disconnected">("checking");

  useEffect(() => {
    const checkStatus = async () => {
      try {
        // Add timeout to prevent hanging
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        try {
          const res = await fetch("/api/ibkr/auth/status", {
            cache: "no-store", // Always fetch fresh status
            signal: controller.signal, // Add abort signal for timeout
          });
          
          clearTimeout(timeoutId);
          
          if (res.ok) {
            const data = await res.json();
            const isConnected = data.connected === true;
            setStatus(isConnected ? "connected" : "disconnected");
            
            // Log for debugging
            if (!isConnected && data.error) {
              console.warn("[IbkrStatusIndicator] Connection check failed:", data.error);
            }
          } else {
            console.warn("[IbkrStatusIndicator] Status check returned non-OK:", res.status);
            setStatus("disconnected");
          }
        } catch (fetchError: any) {
          clearTimeout(timeoutId);
          
          // Check if it's an abort/timeout error
          if (fetchError.name === 'AbortError' || fetchError.message?.includes('aborted')) {
            console.warn("[IbkrStatusIndicator] Status check timeout - assuming disconnected");
            setStatus("disconnected");
            return;
          }
          
          // For other fetch errors (network, CORS, etc.), just set disconnected
          // Don't log as error since it might be temporary (server restarting, etc.)
          if (fetchError.message?.includes('Failed to fetch') || fetchError.message?.includes('NetworkError')) {
            console.warn("[IbkrStatusIndicator] Network error checking status - will retry:", fetchError.message);
            setStatus("disconnected");
            return;
          }
          
          // Re-throw unexpected errors
          throw fetchError;
        }
      } catch (error) {
        // Only log unexpected errors (not network/timeout errors which we handle above)
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (!errorMessage.includes('aborted') && !errorMessage.includes('Failed to fetch')) {
          console.error("[IbkrStatusIndicator] Unexpected error checking status:", error);
        }
        setStatus("disconnected");
      }
    };

    // Check immediately
    checkStatus();
    // Then check every 10 seconds (more frequent for better UX)
    const interval = setInterval(checkStatus, 10000);

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

