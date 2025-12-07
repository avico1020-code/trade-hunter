import { NextResponse } from "next/server";
import { getTwsClient } from "@/lib/ibkr/twsClient.simple";

/**
 * Check connection to IB Gateway via TWS Socket API
 * FAST CHECK: Only checks if already connected, doesn't attempt new connection
 * Connection will be established by market-data requests when needed
 */
async function checkIBGatewayConnection(): Promise<{ connected: boolean; accountType?: string; error?: string }> {
  try {
    // Fast check: only check if already connected, don't try to connect
    // Connection will be established by market-data requests when needed
    const defaultPort = 4001; // Paper Trading (most common)
    const client = getTwsClient({ host: "127.0.0.1", port: defaultPort });
    
    // Quick status check - if connected, return immediately
    if (client.isConnected()) {
      const accountType = client.getAccountType();
      const config = client.getConfig();
      const accountTypeDisplay = accountType === "PAPER" ? "Paper Trading" : accountType === "LIVE" ? "Live Trading" : "Unknown";
      
      return {
        connected: true,
        accountType: accountTypeDisplay,
      };
    }
    
    // Not connected - but don't try to connect here (too slow!)
    // Status check should be fast - connection will happen when market data is requested
    return {
      connected: false,
      error: "Not connected (connection will be established when needed)",
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[IBKR API] ❌ Connection check failed: ${errorMsg}`);
    
    return {
      connected: false,
      error: errorMsg,
    };
  }
}

export async function GET() {
  try {
    // Quick status check - don't log too much (fast check)
    // Check connection to TWS Socket API (status only, no connection attempt)
    const connectionResult = await checkIBGatewayConnection();
    
    if (connectionResult.connected) {
      return NextResponse.json({
        authenticated: true,
        connected: true,
        message: `Connected to IB Gateway via TWS Socket API${connectionResult.accountType ? ` (${connectionResult.accountType})` : ''}`,
        accountType: connectionResult.accountType,
        apiType: "TWS Socket API",
        ports: "4001 (Paper) / 4002 (Live) for IB Gateway, 7497 (Paper) / 7496 (Live) for TWS",
      });
    } else {
      // Connection failed
      const suggestion = "🔍 **STEPS TO FIX:**\n\n" +
        "**1. Verify IB Gateway/TWS is Running:**\n" +
        "   • Open IB Gateway (or TWS)\n" +
        "   • Log in with your account (Paper Trading or Live Trading)\n" +
        "   • Wait until connection is complete\n" +
        "   • Check 'Connection Status' section\n" +
        "   • 'Interactive Brokers API Server' should be green with 'connected'\n\n" +
        "**2. Enable API Access:**\n" +
        "   • Go to Settings → API → Settings\n" +
        "   • Check 'Enable ActiveX and Socket Clients'\n" +
        "   • Set Socket port: 4001 (Paper) or 4002 (Live) for IB Gateway\n" +
        "   • Or 7497 (Paper) / 7496 (Live) for TWS\n" +
        "   • Click OK and restart IB Gateway/TWS\n\n" +
        "**3. Check Windows Firewall:**\n" +
        "   • Make sure Windows Firewall is not blocking the Socket ports\n" +
        "   • Add IB Gateway/TWS to allowed applications if needed";
      
      return NextResponse.json(
        {
          authenticated: false,
          connected: false,
          message: "Not connected to IB Gateway (connection will be established when market data is requested)",
          error: connectionResult.error || "Not connected",
          suggestion: suggestion,
          apiType: "TWS Socket API",
          ports: "4001 (Paper) / 4002 (Live) for IB Gateway, 7497 (Paper) / 7496 (Live) for TWS",
        },
        { status: 200 }
      );
    }

  } catch (error) {
    console.error("[IBKR API] ❌ Unexpected error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to check connection status",
        authenticated: false,
        connected: false,
        apiType: "TWS Socket API",
      },
      { status: 200 }
    );
  }
}
