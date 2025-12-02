import { NextResponse } from "next/server";
import { getTwsClient } from "@/lib/ibkr/twsClient.simple";

/**
 * Check connection to IB Gateway via TWS Socket API
 * This works with both Paper Trading and Live Trading accounts
 * Auto-detects account type (DU prefix = Paper Trading)
 */
async function checkIBGatewayConnection(): Promise<{ connected: boolean; accountType?: string; error?: string }> {
  try {
    console.log(`[IBKR API] 🔄 Checking connection to IB Gateway via TWS Socket API...`);
    
    // Try Paper Trading port first (4001 for IB Gateway, 7497 for TWS)
    // Then try Live Trading port (4002 for IB Gateway, 7496 for TWS)
    const portsToTry = [
      { port: 4001, type: "Paper Trading (IB Gateway)" },
      { port: 4002, type: "Live Trading (IB Gateway)" },
      { port: 7497, type: "Paper Trading (TWS)" },
      { port: 7496, type: "Live Trading (TWS)" },
    ];
    
    let lastError: Error | null = null;
    
    for (const { port, type } of portsToTry) {
      let client = null;
      try {
        console.log(`[IBKR API] 🔌 Trying to connect to ${type} on port ${port}...`);
        // Ensure clientId is in valid range (0-32767)
        const clientId = Math.floor(Date.now() % 32767) + Math.floor(Math.random() * 100);
        client = getTwsClient({ host: "127.0.0.1", port, clientId });
        
        // Connect with timeout (wait for nextValidId which confirms full connection)
        await Promise.race([
          client.connect(),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Connection timeout")), 20000)), // Increased to 20s
        ]);
        
        // Wait a bit for account updates to process (nextValidId already fired during connect)
        await new Promise(resolve => setTimeout(resolve, 3000)); // Increased to 3s for account detection
        
        // Check if connected
        if (client.isConnected()) {
          const accountType = client.getAccountType();
          const accountTypeDisplay = accountType === "PAPER" ? "Paper Trading" : accountType === "LIVE" ? "Live Trading" : "Unknown";
          
          console.log(`[IBKR API] ✅ Successfully connected to IB Gateway!`);
          console.log(`   📍 Connection: 127.0.0.1:${port} (${type})`);
          console.log(`   📊 Account Type: ${accountTypeDisplay}`);
          
          // IMPORTANT: Don't disconnect here - keep connection alive!
          // Return client info but don't cleanup
          return {
            connected: true,
            accountType: accountTypeDisplay,
          };
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        lastError = err instanceof Error ? err : new Error(String(err));
        console.log(`[IBKR API] ⚠️ Failed to connect to port ${port}: ${errorMsg}`);
        
        // Clean up failed connection attempt
        if (client) {
          try {
            client.disconnect();
          } catch (e) {
            // Ignore disconnect errors
          }
        }
        // Continue to next port
        continue;
      }
      
      // If we got here, connection succeeded - stop trying other ports
      break;
    }
    
    // All ports failed
    return {
      connected: false,
      error: lastError?.message || "Failed to connect to any IB Gateway port",
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
    console.log("[IBKR API] 🔍 Starting connection check to IB Gateway via TWS Socket API...");
    console.log("[IBKR API] 💡 Using TWS Socket API (ports 4001/4002 for IB Gateway, 7497/7496 for TWS)");
    console.log("[IBKR API] 💡 This provides full support for:");
    console.log("   • Real-time streaming market data");
    console.log("   • Historical data");
    console.log("   • Account portfolio data");
    console.log("   • Full order execution (market/limit/stop/bracket)");
    console.log("[IBKR API] 💡 Please ensure:");
    console.log("   1. IB Gateway (or TWS) is running");
    console.log("   2. IB Gateway is fully connected (not just started)");
    console.log("   3. API is enabled in Settings → API → Settings");
    console.log("   4. 'Enable ActiveX and Socket Clients' is checked");
    
    // Check connection to TWS Socket API
    const connectionResult = await checkIBGatewayConnection();
    
    if (connectionResult.connected) {
      console.log("[IBKR API] ✅ Connection successful!");
      console.log(`[IBKR API] 📍 Account type: ${connectionResult.accountType || 'Unknown'}`);
      
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
      console.error("[IBKR API] ❌ Failed to connect to IB Gateway");
      console.error("[IBKR API] 🔍 Troubleshooting:");
      console.error("   1. Check if IB Gateway (or TWS) is running");
      console.error("   2. Check if IB Gateway shows 'Interactive Brokers API Server' status as 'connected' (green)");
      console.error("   3. Verify API is enabled in Settings → API → Settings");
      console.error("   4. Make sure 'Enable ActiveX and Socket Clients' is checked");
      console.error("   5. Check that Socket port is set correctly (4001 for Paper, 4002 for Live)");
      
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
          message: "Failed to connect to IB Gateway via TWS Socket API",
          error: connectionResult.error || "Connection failed",
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
