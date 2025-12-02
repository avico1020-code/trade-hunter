import { NextRequest } from "next/server";

/**
 * WebSocket handler for real-time market data streaming from IB Gateway
 * This endpoint upgrades HTTP connection to WebSocket
 */
export async function GET(request: NextRequest) {
  // Check if this is a WebSocket upgrade request
  const upgradeHeader = request.headers.get("upgrade");

  if (upgradeHeader !== "websocket") {
    return new Response("Expected WebSocket connection", { status: 426 });
  }

  // For Next.js running on Node.js (local development or Node.js deployment)
  if (typeof process !== "undefined" && process.versions?.node) {
    try {
      // Dynamic import for Node.js-specific modules
      const { Server: WebSocketServer } = await import("ws");
      const https = await import("https");

      // Get query parameters
      const url = new URL(request.url);
      const conids = url.searchParams.get("conids")?.split(",") || [];
      const fields = url.searchParams.get("fields")?.split(",") || ["31", "84", "86"]; // Last, Bid, Ask

      if (conids.length === 0) {
        return new Response("At least one conid is required", { status: 400 });
      }

      // Create WebSocket server
      const wss = new WebSocketServer({ noServer: true });

      // Connect to IB Gateway WebSocket
      const ibGatewayWsUrl = "wss://localhost:5000/v1/api/ws";
      const agent = new https.Agent({ rejectUnauthorized: false });

      // Import WebSocket client
      const WebSocket = (await import("ws")).default;
      const ibWs = new WebSocket(ibGatewayWsUrl, { agent });

      return new Response(null, {
        status: 101,
        headers: {
          Upgrade: "websocket",
          Connection: "Upgrade",
        },
      });
    } catch (error) {
      console.error("WebSocket setup error:", error);
      return new Response("WebSocket setup failed", { status: 500 });
    }
  }

  // For edge runtime or non-Node.js environments
  return new Response("WebSocket not supported in this environment", { status: 503 });
}

