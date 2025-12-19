import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getIbkrAccountService } from "@/lib/server/ibkr";

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    console.log("[IBKR Account API] 📥 Request for account summary");
    
    const accountService = getIbkrAccountService();
    console.log("[IBKR Account API] ✅ Account service obtained");
    
    // Empty accountId = all accounts (single-account setup)
    console.log("[IBKR Account API] 🔄 Requesting account summary from IBKR...");
    const summary = await accountService.getAccountSummary("");
    console.log("[IBKR Account API] ✅ Account summary received:", {
      netLiquidation: summary.netLiquidation,
      totalCashValue: summary.totalCashValue,
      realizedPnL: summary.realizedPnL,
      unrealizedPnL: summary.unrealizedPnL,
    });

    const netLiquidation = summary.netLiquidation ?? null;
    const totalCashValue = summary.totalCashValue ?? null;

    const realized = summary.realizedPnL ?? 0;
    const unrealized = summary.unrealizedPnL ?? 0;
    const totalPnL = realized + unrealized;

    const base = netLiquidation ?? totalCashValue ?? 0;
    const pnlPercent = base !== 0 ? (totalPnL / base) * 100 : 0;

    return NextResponse.json({
      netLiquidation,
      totalCashValue,
      totalPnL,
      pnlPercent,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const stack = error instanceof Error ? error.stack : undefined;
    console.error("[IBKR Account API] ❌ Failed to get account summary:", {
      message,
      stack,
      error: String(error),
    });

    return NextResponse.json(
      {
        error: "Failed to load IBKR account status",
        details: message,
      },
      { status: 500 }
    );
  }
}


