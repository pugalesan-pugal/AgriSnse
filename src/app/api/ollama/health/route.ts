import { NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest) {
  try {
    const host = process.env.OLLAMA_HOST || "http://localhost:11434";
    console.info("[ollama/health] checking host", host);
    const tagsResp = await fetch(`${host}/api/tags`, { cache: "no-store" });
    if (!tagsResp.ok) {
      console.error("[ollama/health] tags failed", tagsResp.status, tagsResp.statusText);
      const text = await tagsResp.text();
      return NextResponse.json(
        { ok: false, host, error: `Ollama /api/tags failed: ${text}` },
        { status: 500 }
      );
    }
    const tagsData = (await tagsResp.json()) as { models?: Array<{ name?: string }> };
    const models: string[] = (tagsData?.models || [])
      .map((m) => m?.name)
      .filter((n): n is string => Boolean(n));
    console.info("[ollama/health] ok", { count: models.length });
    return NextResponse.json({ ok: true, host, models });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[ollama/health] exception", message, err);
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}


