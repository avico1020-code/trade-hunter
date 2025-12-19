import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";

/**
 * API Route: Check scores for stocks in the user's list
 *
 * This route:
 * 1. Gets all stocks from the user's active list
 * 2. Checks if scores exist for each stock
 * 3. Returns the scores or indicates if they don't exist
 */
export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get Clerk token for Convex authentication
    const { getToken } = await auth();
    const token = await getToken({ template: "convex" });

    if (!token) {
      return NextResponse.json({ error: "Failed to get authentication token" }, { status: 401 });
    }

    console.log(`[Scoring API] Checking scores for user: ${userId}`);

    // Create Convex client with authentication token
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!convexUrl) {
      throw new Error("NEXT_PUBLIC_CONVEX_URL is not set");
    }

    const convex = new ConvexHttpClient(convexUrl);
    convex.setAuth(token);

    // Get stocks from user's active list using action (for server-side access)
    const listStocks = await convex.action(api.stocksLists.getListStocksAction, {
      userId,
    });

    console.log(`[Scoring API] Found ${listStocks?.length || 0} stocks in list:`, listStocks);

    if (!listStocks || listStocks.length === 0) {
      return NextResponse.json({
        message: "אין מניות ברשימה",
        stocks: [],
        scores: {},
        debug: {
          userId,
          hasList: listStocks !== null,
          stockCount: listStocks?.length || 0,
          hasToken: !!token,
        },
      });
    }

    // Extract symbols
    const symbols = listStocks.map((stock) => stock.symbol);

    // Get scores for all symbols using query with authentication
    const scores = await convex.query(api.symbolScores.getMultipleSymbolScores, {
      symbols,
    });

    // Create a map of symbol -> score
    const scoresMap: Record<string, any> = {};
    scores.forEach((score) => {
      scoresMap[score.symbol] = {
        masterScore: score.masterScore,
        direction: score.direction,
        technicalScore: score.technicalScore,
        newsScore: score.newsScore,
        macroScore: score.macroScore,
        sectorScore: score.sectorScore,
        optionsFlowScore: score.optionsFlowScore,
        microCompanyScore: score.microCompanyScore,
        lastUpdated: score.lastUpdated,
        refreshTrigger: score.refreshTrigger,
      };
    });

    // Prepare response
    const result = {
      message: `נמצאו ${listStocks.length} מניות ברשימה`,
      stocks: listStocks.map((stock) => ({
        symbol: stock.symbol,
        hasScore: scoresMap[stock.symbol] !== undefined,
      })),
      scores: scoresMap,
      summary: {
        totalStocks: listStocks.length,
        stocksWithScores: Object.keys(scoresMap).length,
        stocksWithoutScores: listStocks.length - Object.keys(scoresMap).length,
      },
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("[Scoring API] Error checking scores:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to check scores";

    return NextResponse.json(
      {
        error: errorMessage,
        suggestion: "Check Convex connection and ensure stocks list is accessible.",
      },
      { status: 500 }
    );
  }
}
