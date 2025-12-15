import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const lines = parseInt(url.searchParams.get("lines") || "50", 10);
  const filter = url.searchParams.get("filter") || "";

  const logFile = join(process.cwd(), "logs", "server.log");

  try {
    if (!existsSync(logFile)) {
      return NextResponse.json(
        {
          error: "Log file not found",
          message: "Please run 'bun run dev:log' to enable log file capture",
          logFile,
        },
        { status: 404 }
      );
    }

    // Read the entire file and get last N lines
    const content = await readFile(logFile, "utf-8");
    const allLines = content.split("\n");
    let lastLines = allLines.slice(-Math.min(lines, allLines.length));

    // Apply filter if provided
    if (filter) {
      lastLines = lastLines.filter(
        (line) =>
          line.includes(filter) ||
          line.includes("[API]") ||
          line.includes("[TWS Client]") ||
          line.includes("IB Gateway") ||
          line.includes("IBKR")
      );
    }

    return NextResponse.json({
      success: true,
      totalLines: allLines.length,
      returnedLines: lastLines.length,
      filter: filter || "none",
      logs: lastLines,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        error: "Failed to read log file",
        details: errorMsg,
      },
      { status: 500 }
    );
  }
}
