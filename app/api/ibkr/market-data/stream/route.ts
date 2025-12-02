import { NextRequest } from "next/server";
import { marketDataManager } from "@/lib/ibkr/marketDataManager";

/**
 * Server-Sent Events (SSE) endpoint for real-time market data streaming
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");

  if (!symbol) {
    return new Response("Missing symbol parameter", { status: 400 });
  }

  // Create a readable stream for SSE
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      // Function to send SSE message
      const sendMessage = (data: any) => {
        const message = `data: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(message));
      };

      try {
        console.log(`📡 [SSE] Starting stream for ${symbol}`);

        // Subscribe to market data
        const unsubscribe = await marketDataManager.subscribe(symbol, (snapshot) => {
          sendMessage(snapshot);
        });

        // Keep-alive ping every 30 seconds
        const keepAliveInterval = setInterval(() => {
          sendMessage({ type: "ping", timestamp: Date.now() });
        }, 30000);

        // Cleanup on client disconnect
        request.signal.addEventListener("abort", () => {
          console.log(`🛑 [SSE] Client disconnected from ${symbol}`);
          clearInterval(keepAliveInterval);
          unsubscribe();
          controller.close();
        });
      } catch (error) {
        console.error(`❌ [SSE] Error streaming ${symbol}:`, error);
        sendMessage({ type: "error", message: String(error) });
        controller.close();
      }
    },
  });

  // Return SSE response
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

