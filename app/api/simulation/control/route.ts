/**
 * Simulation Control API Route - Phase 8
 * 
 * Optional API endpoint to control simulation playback
 * (start, stop, step forward)
 */

import { NextRequest, NextResponse } from "next/server";
import { getSimulationController } from "@/lib/server/simulation";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const cmd = body.command;

    const controller = getSimulationController();

    if (!controller) {
      return NextResponse.json(
        { ok: false, error: "Simulation not initialized or not in simulation mode" },
        { status: 400 }
      );
    }

    switch (cmd) {
      case "start":
        controller.start();
        return NextResponse.json({ ok: true, message: "Simulation started" });

      case "stop":
        controller.stop();
        return NextResponse.json({ ok: true, message: "Simulation stopped" });

      case "step": {
        const count = body.count ?? 1;
        controller.step(count);
        return NextResponse.json({
          ok: true,
          message: `Stepped forward ${count} tick(s)`,
        });
      }

      case "status": {
        const status = controller.getStatus();
        return NextResponse.json({ ok: true, status });
      }

      default:
        return NextResponse.json(
          { ok: false, error: `Unknown command: ${cmd}. Use: start, stop, step, status` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error(`[Simulation Control API] Error:`, error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to process command",
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to retrieve simulation status
 */
export async function GET() {
  try {
    const controller = getSimulationController();

    if (!controller) {
      return NextResponse.json(
        {
          ok: false,
          mode: "live",
          message: "Simulation not initialized. System is in live mode.",
        },
        { status: 200 }
      );
    }

    const status = controller.getStatus();
    return NextResponse.json({
      ok: true,
      mode: "simulation",
      status,
    });
  } catch (error) {
    console.error(`[Simulation Control API] Error:`, error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to get status",
      },
      { status: 500 }
    );
  }
}

