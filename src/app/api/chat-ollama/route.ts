import { NextRequest, NextResponse } from "next/server";

// Minimal server route that proxies to an Ollama server.
// Configure OLLAMA_HOST in environment or default to localhost.

type ChatMessage = { role: "user" | "assistant" | "system"; content: string };

export async function POST(req: NextRequest) {
  try {
    const startedAt = Date.now();
    const body = await req.json();
    const messages: ChatMessage[] = body?.messages ?? [];
    const model: string = body?.model ?? "mistral"; // e.g., mistral or mistral:7b-instruct
    const host = process.env.OLLAMA_HOST || "http://localhost:11434";

    console.info("[chat-ollama] incoming", {
      model,
      host,
      messagesCount: messages.length,
      lastUser:
        messages.filter((m) => m.role === "user").slice(-1)[0]?.content?.slice(0, 120) ?? "",
    });

    const resp = await fetch(`${host}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages,
        stream: false,
        options: {
          temperature: 0.7,
        },
      }),
    });

    if (!resp.ok) {
      console.error("[chat-ollama] ollama error", resp.status, resp.statusText);
      const text = await resp.text();
      return NextResponse.json({ error: `Ollama error: ${text}` }, { status: 500 });
    }

    const data = await resp.json();
    const durationMs = Date.now() - startedAt;
    const preview = data?.message?.content?.slice?.(0, 120) ?? "";
    console.info("[chat-ollama] success", { durationMs, previewLength: preview.length, preview });
    // Ollama chat non-stream returns an object with message { role, content }
    return NextResponse.json({ message: data?.message ?? null });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    console.error("[chat-ollama] exception", message, err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


