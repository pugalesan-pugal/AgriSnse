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
    const tagsData = await tagsResp.json();
    const models: string[] = (tagsData?.models || []).map((m: any) => m?.name).filter(Boolean);
    console.info("[ollama/health] ok", { count: models.length });
    return NextResponse.json({ ok: true, host, models });
  } catch (err: any) {
    console.error("[ollama/health] exception", err?.message, err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Unknown error" },
      { status: 500 }
    );
  }
}


