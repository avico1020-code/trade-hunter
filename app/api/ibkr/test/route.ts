import { NextResponse } from "next/server";

export async function GET() {
  try {
    console.log("[TEST] Starting basic test...");

    // Test 1: Can we import the library?
    const IBModule = await import("@stoqey/ib");
    const IB = (IBModule as any).default || (IBModule as any).IB || IBModule;
    console.log("[TEST] IB library imported successfully", typeof IB);

    // Test 2: Can we create an instance?
    const ib = new IB({
      clientId: 1,
      host: "127.0.0.1",
      port: 4002,
    });
    console.log("[TEST] IB instance created successfully");

    // Test 3: Try to connect
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        console.log("[TEST] Connection timeout - IB Gateway might not be running");
        resolve(
          NextResponse.json({
            success: true,
            message: "Library works, but couldn't connect (timeout)",
            details:
              "IB Gateway is running, but connection failed. This might be a port or API settings issue.",
          })
        );
      }, 5000);

      ib.once("connected" as any, () => {
        clearTimeout(timeout);
        console.log("[TEST] Connected successfully!");
        ib.disconnect();
        resolve(
          NextResponse.json({
            success: true,
            message: "Connected to IB Gateway successfully!",
            details: "Everything works!",
          })
        );
      });

      ib.once("error" as any, (err: Error, code: number) => {
        clearTimeout(timeout);
        console.error("[TEST] Connection error:", err, "Code:", code);
        resolve(
          NextResponse.json({
            success: false,
            message: "Connection error",
            error: err.message,
            errorCode: code,
          })
        );
      });

      console.log("[TEST] Attempting to connect to 127.0.0.1:4002...");
      ib.connect();
    });
  } catch (error) {
    console.error("[TEST] Unexpected error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Unexpected error",
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
