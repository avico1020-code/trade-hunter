import { NextResponse } from "next/server";
import { getTwsClient } from "@/lib/ibkr/twsClient.simple";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get("symbol");

    if (!symbol) {
      return NextResponse.json({ error: "Symbol is required" }, { status: 400 });
    }

    console.log(`📡 [API] Fetching market data for ${symbol} from IB Gateway via TWS Socket API...`);

    // Try to connect to IB Gateway (try multiple ports)
    const portsToTry = [4001, 4002, 7497, 7496];
    let client = null;
    let lastError: Error | null = null;

    for (const port of portsToTry) {
      try {
        // Ensure clientId is in valid range (0-32767)
        const clientId = Math.floor(Date.now() % 32767) + Math.floor(Math.random() * 100);
        client = getTwsClient({ 
          host: "127.0.0.1", 
          port, 
          clientId
        });
        
        // Connect with timeout (wait for nextValidId which confirms full connection)
        await Promise.race([
          client.connect(),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Connection timeout")), 20000)), // Increased to 20s
        ]);
        
        // Wait a bit for connection to stabilize (nextValidId already fired during connect)
        await new Promise(resolve => setTimeout(resolve, 1000)); // Small delay for stability
        
        if (client.isConnected()) {
          console.log(`[API] ✅ Connection verified for ${symbol} on port ${port}`);
          break; // Successfully connected
        }
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        console.log(`[API] ⚠️ Failed to connect to port ${port}: ${lastError.message}`);
        client = null;
        continue; // Try next port
      }
    }

    if (!client || !client.isConnected()) {
      const errorMsg = lastError?.message || "Failed to connect to IB Gateway";
      console.error(`[API] ❌ Connection failed for ${symbol}:`, errorMsg);
      return NextResponse.json(
        {
          error: "Failed to connect to IB Gateway",
          details: errorMsg,
          suggestion: "Please ensure IB Gateway (or TWS) is running, fully connected, and API is enabled in Settings → API → Settings"
        },
        { status: 503 }
      );
    }

    // Get market data snapshot (similar to Python's reqMktData)
    try {
      const snapshot = await client.getMarketDataSnapshot(symbol);

      if (!snapshot) {
        throw new Error(`No market data received for ${symbol}`);
      }

      // Convert to the expected format (field IDs as keys)
      const formattedSnapshot: Record<string, string> = {
        conid: String(snapshot.conid || "0"),
      };

      // Add all fields from the snapshot
      Object.keys(snapshot).forEach((key) => {
        if (key !== "conid" && snapshot[key as keyof typeof snapshot] !== undefined) {
          formattedSnapshot[key] = String(snapshot[key as keyof typeof snapshot]);
        }
      });

      const hasData = formattedSnapshot["31"] && formattedSnapshot["7295"] && formattedSnapshot["7308"];
      
      // Log similar to Python's tickPrice/tickSize callbacks
      console.log(`✅ [API] [REALTIME] Symbol: ${symbol}, ReqId: ${snapshot.conid}`);
      console.log(`   Type: Last Price, Price: ${formattedSnapshot["31"] || "N/A"}`);
      console.log(`   Type: Close, Price: ${formattedSnapshot["7295"] || "N/A"}`);
      console.log(`   Type: Volume, Size: ${formattedSnapshot["7308"] || "N/A"}`);
      
      if (!hasData) {
        console.warn(`⚠️ [API] ${symbol}: Incomplete data - Last: ${formattedSnapshot["31"] || "N/A"}, Close: ${formattedSnapshot["7295"] || "N/A"}, Volume: ${formattedSnapshot["7308"] || "N/A"}`);
        console.warn(`⚠️ [API] This might indicate delayed market data or subscription issues`);
      }

      return NextResponse.json(formattedSnapshot);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`❌ [API] Failed to fetch market data for ${symbol}:`, errorMsg);
      
      // Check if it's an authentication/connection error
      if (errorMsg.includes("not connected") || errorMsg.includes("authenticated") || errorMsg.includes("ECONNREFUSED")) {
        return NextResponse.json(
          {
            error: "Failed to connect to IB Gateway Client Portal",
            details: errorMsg,
            suggestion: "Please ensure IB Gateway is running, fully connected, and you can access https://localhost:5000"
          },
          { status: 503 }
        );
      }
      
      // Check if symbol not found
      if (errorMsg.includes("No results found") || errorMsg.includes("No market data")) {
        return NextResponse.json(
          {
            error: `Symbol ${symbol} not found in IB Gateway`,
            details: errorMsg,
          },
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        {
          error: `Failed to fetch market data for ${symbol}`,
          details: errorMsg,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error(`❌ [API] Unexpected error for ${request.url}:`, error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch market data";
    
    return NextResponse.json(
      { 
        error: errorMessage,
        suggestion: "Please check IB Gateway is running and accessible at https://localhost:5000"
      },
      { status: 500 }
    );
  }
}
