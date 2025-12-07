import { NextResponse } from "next/server";
import { getTwsClient } from "@/lib/ibkr/twsClient.simple";

export async function GET(request: Request) {
  const startTime = Date.now();
  const symbol = new URL(request.url).searchParams.get("symbol") || "";

  // Quick validation
  if (!symbol) {
    return NextResponse.json({ error: "Symbol is required" }, { status: 400 });
  }

  console.log(`\n========== [API] REQUEST START: ${symbol} ==========`);
  console.log(`[API] Time: ${new Date().toISOString()}`);
  console.log(`[API] URL: ${request.url}`);
  
  try {
    // Get singleton client - always uses same instance
    console.log(`[API] Step 1: Getting TWS client singleton...`);
    
    let client;
    try {
      // Use default port 4001 (Paper Trading) - singleton will handle reuse
      client = getTwsClient({ port: 4001 });
      console.log(`[API] Step 2: ✅ Client singleton obtained`);
      console.log(`[API]    Client ID: ${client.getClientId()}`);
      console.log(`[API]    Connected: ${client.isConnected()}`);
    } catch (clientErr) {
      const clientErrorMsg = clientErr instanceof Error ? clientErr.message : String(clientErr);
      console.error(`[API] ❌ Failed to get TWS client:`, clientErrorMsg);
      console.error(`[API]    Stack:`, clientErr instanceof Error ? clientErr.stack : 'N/A');
      return NextResponse.json(
        {
          error: "Failed to initialize IB Gateway client",
          details: clientErrorMsg,
          suggestion: "Check if @stoqey/ib package is installed correctly (bun install)"
        },
        { status: 500 }
      );
    }
    
    // Ensure connection
    if (!client.isConnected()) {
      console.log(`[API] Step 3: Not connected, attempting connection...`);
      try {
        // Simple connection with timeout
        console.log(`[API]    Calling client.connect()...`);
        const connectPromise = client.connect();
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error("Connection timeout after 20 seconds")), 20000)
        );
        
        await Promise.race([connectPromise, timeoutPromise]);
        console.log(`[API] Step 4: ✅ Connection promise resolved`);
        
        // Check if actually connected
        if (!client.isConnected()) {
          console.error(`[API] ⚠️  Connection promise resolved but isConnected() = false`);
          throw new Error("Connection promise resolved but client not connected");
        }
        
        console.log(`[API] Step 5: ✅ Connection confirmed! isConnected() = true`);
      } catch (connectErr) {
        const errorMsg = connectErr instanceof Error ? connectErr.message : String(connectErr);
        console.error(`[API] ❌ Connection error:`, errorMsg);
        console.error(`[API]    Error type: ${connectErr instanceof Error ? connectErr.constructor.name : typeof connectErr}`);
        console.error(`[API]    Stack:`, connectErr instanceof Error ? connectErr.stack : 'N/A');
        
        // Return detailed error
        return NextResponse.json(
          {
            error: "Failed to connect to IB Gateway",
            details: errorMsg,
            suggestion: "Make sure IB Gateway is running, fully connected, and API is enabled (Settings → API → Settings → Enable ActiveX and Socket Clients)"
          },
          { status: 503 }
        );
      }
    } else {
      console.log(`[API] Step 3: ✅ Already connected, reusing existing connection`);
    }

    // Get market data snapshot
    console.log(`[API] Step 6: Fetching market data for ${symbol}...`);

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
