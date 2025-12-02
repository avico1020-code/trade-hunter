import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const ASSISTANT_ID = "asst_woLUSxRW2An5n5abQYsP7wwR";

export async function POST(req: Request) {
  try {
    // Check if API key is configured
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API key is not configured. Please add OPENAI_API_KEY to .env.local" },
        { status: 500 }
      );
    }

    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { threadId, message } = body;

    // Debug logging
    console.log("Received request body:", { threadId, message, fullBody: body });

    if (!threadId || !message) {
      return NextResponse.json(
        {
          error: "threadId and message are required",
          received: { threadId, message },
        },
        { status: 400 }
      );
    }

    // Save threadId to a const to prevent scope issues
    const thread_id = String(threadId);

    // Add the user message to the thread
    await openai.beta.threads.messages.create(thread_id, {
      role: "user",
      content: message,
    });

    // Run the assistant and wait for completion
    console.log("Creating and running assistant with thread_id:", thread_id);

    const run = await openai.beta.threads.runs.createAndPoll(thread_id, {
      assistant_id: ASSISTANT_ID,
    });

    console.log("Run completed with status:", run.status);

    // Check if run was successful
    if (run.status !== "completed") {
      throw new Error(`Run ${run.status}: ${run.last_error?.message || "Unknown error"}`);
    }

    // Get the messages
    const messages = await openai.beta.threads.messages.list(thread_id);

    // Get the last assistant message
    const lastMessage = messages.data.find((msg) => msg.role === "assistant");

    if (!lastMessage) {
      throw new Error("No assistant response found");
    }

    // Extract text content
    const textContent = lastMessage.content.find((content) => content.type === "text");
    const responseText = textContent && textContent.type === "text" ? textContent.text.value : "";

    return NextResponse.json({
      response: responseText,
      messageId: lastMessage.id,
    });
  } catch (error) {
    console.error("Error processing message:", error);
    return NextResponse.json(
      {
        error: "Failed to process message",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
