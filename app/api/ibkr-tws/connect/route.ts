import { NextResponse } from "next/server";
import { connectToIB, isIBConnected } from "@/lib/ibkr/tws-client";

export async function GET() {
  try {
    if (isIBConnected()) {
      return NextResponse.json({ connected: true, message: "Already connected" });
    }

    await connectToIB();

    return NextResponse.json({ connected: true, message: "Connected successfully" });
  } catch (error) {
    console.error("Connection error:", error);
    return NextResponse.json(
      {
        connected: false,
        error: error instanceof Error ? error.message : "Connection failed",
      },
      { status: 500 }
    );
  }
}

