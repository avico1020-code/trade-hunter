/**
 * IBKR Integration Layer - Status Endpoint (v2)
 *
 * Returns connection status from the new IBKR integration layer
 */

import { NextResponse } from "next/server";
import { getIbkrConnectionManager } from "@/lib/server/ibkr/IbkrConnectionManager";

export async function GET() {
  try {
    const connectionManager = getIbkrConnectionManager();
    const status = connectionManager.getStatus();

    return NextResponse.json({
      connected: status.state === "CONNECTED",
      state: status.state,
      lastConnectTime: status.lastConnectTime,
      lastDisconnectTime: status.lastDisconnectTime,
      lastError: status.lastError,
      serverTime: status.serverTime,
      clientId: status.clientId,
      host: status.host,
      port: status.port,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[IBKR API v2] Status check failed:", errorMessage);

    return NextResponse.json(
      {
        connected: false,
        state: "ERROR",
        error: errorMessage,
      },
      { status: 200 }
    );
  }
}
