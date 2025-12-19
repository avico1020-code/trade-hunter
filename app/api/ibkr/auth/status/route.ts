import { NextResponse } from "next/server";
import { getIbkrConnectionManager } from "@/lib/server/ibkr/IbkrConnectionManager";

/**
 * Check connection to IB Gateway via TWS Socket API
 * FAST CHECK: Only checks if already connected, doesn't attempt new connection
 * Connection will be established by market-data requests when needed
 * 
 * This function checks the IbkrConnectionManager singleton (used by Phase 2 streaming).
 */
async function checkIBGatewayConnection(): Promise<{ connected: boolean; accountType?: string; error?: string; port?: number }> {
  try {
    // Get the IbkrConnectionManager singleton instance (used by streaming layer)
    const connectionManager = getIbkrConnectionManager();
    const status = connectionManager.getStatus();
    
    // Log for debugging
    console.log(`[IBKR Status Check] Checking IbkrConnectionManager on port ${status.port}, state: ${status.state}`);
    
    // Quick status check - if connected, return immediately
    if (connectionManager.isConnected()) {
      // Try to determine account type from connection manager state
      // Note: IbkrConnectionManager doesn't expose account type directly,
      // but we can infer from port (4001 = Paper, 4002 = Live)
      let accountTypeDisplay = "Unknown";
      if (status.port === 4001 || status.port === 7497) {
        accountTypeDisplay = "Paper Trading";
      } else if (status.port === 4002 || status.port === 7496) {
        accountTypeDisplay = "Live Trading";
      }
      
      console.log(`[IBKR Status Check] ✅ Connection found on port ${status.port} (${status.state})`);
      
      return {
        connected: true,
        accountType: accountTypeDisplay,
        port: status.port,
      };
    }
    
    // Not connected - but don't try to connect here (too slow!)
    // Status check should be fast - connection will happen when market data is requested
    console.log(`[IBKR Status Check] ⚠️ Connection manager exists but not connected (state: ${status.state}, port: ${status.port})`);
    if (status.lastError) {
      console.log(`[IBKR Status Check] Last error: ${status.lastError}`);
    }
    
    return {
      connected: false,
      error: status.lastError || `Not connected (state: ${status.state}). Connection will be established when market data is requested.`,
      port: status.port,
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
        message: `Connected to IB Gateway via TWS Socket API${connectionResult.accountType ? ` (${connectionResult.accountType})` : ''}${connectionResult.port ? ` on port ${connectionResult.port}` : ''}`,
        accountType: connectionResult.accountType,
        port: connectionResult.port,
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
