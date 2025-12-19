/**
 * Market Stream API Route (SSE - Server-Sent Events)
 *
 * GET /api/market/stream?symbol=AAPL&timeframe=1m
 *
 * משדר עדכוני נרות בזמן אמת דרך SSE
 * מקור: MarketDataHub
 */

import type { NextRequest } from "next/server";
import { getMarketDataHub } from "@/lib/server/market-data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");
  const timeframe = searchParams.get("timeframe") || "1m";

  if (!symbol) {
    return new Response("Missing symbol parameter", { status: 400 });
  }

  console.log(`[Market Stream API] Client connected for ${symbol} (${timeframe})`);

  // Create SSE stream
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const symbolKey = symbol.toUpperCase();
      const hub = getMarketDataHub();

      // Send initial connection message
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: "connected", symbol: symbolKey })}\n\n`)
      );

      // Subscribe to bar-close events from MarketDataHub
      console.log(`[Market Stream API] 🔌 Setting up SSE listener for ${symbolKey}`);

      // Don't send "connected" message - it's not valid candle data

      const unsubscribe = hub.onBarClose(symbolKey, timeframe as any, (bar) => {
        try {
          // Validate bar data
          if (!bar || typeof bar.startTs !== "number") {
            console.warn(`[Market Stream API] ⚠️ Invalid bar data:`, bar);
            return;
          }

          console.log(`[Market Stream API] 📊 Received bar from hub:`, bar);

          // Convert to TradingView Lightweight Charts format
          // IMPORTANT: time must be in SECONDS (not milliseconds)
          const timeInSeconds = Math.floor(bar.startTs / 1000);

          const candle = {
            time: timeInSeconds,
            open: bar.open,
            high: bar.high,
            low: bar.low,
            close: bar.close,
          };

          console.log(`[Market Stream API] 📤 Sending candle:`, candle);

          // Send as SSE message
          const message = `data: ${JSON.stringify(candle)}\n\n`;
          controller.enqueue(encoder.encode(message));

          console.log(`[Market Stream API] ✅ Sent candle for ${symbolKey}`);
        } catch (error) {
          console.error("[Market Stream API] ❌ Error sending candle:", error);
        }
      });

      console.log(
        `[Market Stream API] 💡 Note: SSE will only send data when new bars close in real-time`
      );

      // Handle client disconnect
      request.signal.addEventListener("abort", () => {
        console.log(`[Market Stream API] Client disconnected from ${symbolKey}`);
        unsubscribe();
        controller.close();
      });

      // Send periodic heartbeat to keep connection alive
      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": heartbeat\n\n"));
        } catch (error) {
          clearInterval(heartbeatInterval);
        }
      }, 30000); // Every 30 seconds

      // Cleanup on stream close
      const cleanup = () => {
        clearInterval(heartbeatInterval);
        unsubscribe();
      };

      request.signal.addEventListener("abort", cleanup);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
