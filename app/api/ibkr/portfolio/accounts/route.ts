import { NextResponse } from "next/server";
import { getIbkrClient } from "@/lib/ibkr/client";

export async function GET() {
  try {
    console.log(`📋 [API] Fetching portfolio accounts from IB Gateway Client Portal...`);

    const client = getIbkrClient();

    try {
      const accounts = await client.getPortfolioAccounts();

      // Map to expected format
      const formattedAccounts = accounts.map((account) => ({
        id: account.accountId || account.id,
        accountId: account.accountId || account.id,
        accountVan: account.accountVan,
        accountTitle: account.accountTitle,
        displayName: account.displayName || account.accountTitle || account.accountId,
        accountAlias: account.accountAlias,
        accountStatus: account.accountStatus,
        currency: account.currency,
        type: account.type,
        tradingType: account.tradingType,
        faclient: account.faclient,
        clearingStatus: account.clearingStatus,
        covestor: account.covestor,
        parent: account.parent,
        desc: account.desc,
      }));

      console.log(`✅ [API] Found ${formattedAccounts.length} account(s)`);

      return NextResponse.json(formattedAccounts);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`❌ [API] Failed to fetch portfolio accounts:`, errorMsg);
      
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
      
      return NextResponse.json(
        {
          error: "Failed to fetch portfolio accounts",
          details: errorMsg,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error(`❌ [API] Unexpected error:`, error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch portfolio accounts";
    
    return NextResponse.json(
      { 
        error: errorMessage,
        suggestion: "Please check IB Gateway is running and accessible at https://localhost:5000"
      },
      { status: 500 }
    );
  }
}
