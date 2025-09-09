import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type GenerateBody = {
  landId: string | null;
  crop: string;
  location: string;
  state: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as GenerateBody;
    const { landId, crop, location, state } = body;

    const alerts: Array<{ id: string; type: string; title: string; message: string; landId: string | null; createdAt: string }> = [];

    // Weather alert for tomorrow
    try {
      const weatherBase = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
      const weatherResp = await fetch(`${weatherBase}/api/weather?location=${encodeURIComponent(location || state || "Kerala")}`);
      if (weatherResp.ok) {
        const weatherData = await weatherResp.json();
        const tomorrow = weatherData?.weather?.forecast?.daily?.[1];
        const desc = tomorrow?.description || "Check tomorrow's forecast";
        const wMsg = `Tomorrow's weather in ${location || state}: ${desc}. Temp: ${tomorrow?.temperature ?? "-"}°C. Plan irrigation and field work accordingly.`;
        alerts.push({ id: `weather-${Date.now()}`, type: "weather", title: "Weather alert for tomorrow", message: wMsg, landId, createdAt: new Date().toISOString() });
      }
    } catch {}

    // Market insights alert (data.gov.in resource)
    try {
      const base = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
      const params = new URLSearchParams({ state, commodity: crop, limit: "20" });
      const marketResp = await fetch(`${base}/api/market/insights?${params.toString()}`, { cache: "no-store" });
      if (marketResp.ok) {
        const market = await marketResp.json();
        const first = market?.records?.[0];
        if (first) {
          const snippet = `${first.commodity} at ${first.market}: modal ₹${first.modal_price}`;
          alerts.push({ id: `market-${Date.now()}`, type: "market", title: "Market insight", message: snippet, landId, createdAt: new Date().toISOString() });
        }
      }
    } catch {}

    // Government update (placeholder)
    alerts.push({ id: `gov-${Date.now()}`, type: "government", title: "Govt. update", message: "Subsidy registration closes on 30th. Apply on the Agri portal.", landId, createdAt: new Date().toISOString() });

    // Fertilizer schedule (example)
    alerts.push({ id: `fert-${Date.now()}`, type: "fertilizer", title: "Fertilizer schedule", message: "Fertilizer application due in 2 days based on your crop calendar.", landId, createdAt: new Date().toISOString() });

    // Use Ollama to enrich messages
    try {
      const host = process.env.OLLAMA_HOST || "http://127.0.0.1:1143";
      const model = process.env.OLLAMA_MODEL || "mistral";
      const combined = alerts.map((a) => `- [${a.type}] ${a.title}: ${a.message}`).join("\n");
      const prompt = `Generate short, clear farmer-friendly alert messages for Kerala context. Keep each under 140 chars and add actionable suggestion.\n${combined}`;
      const health = await fetch(`${host}/api/tags`, { method: "GET", cache: "no-store" });
      if (health.ok) {
        const gen = await fetch(`${host}/api/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model, prompt, stream: false, options: { temperature: 0.7, num_predict: 256 } }),
        });
        if (gen.ok) {
          const data = await gen.json();
          const content: string = data?.response ?? data?.message?.content ?? "";
          const lines = content.split(/\n+/).map((s: string) => s.replace(/^[-*]\s*/, "").trim()).filter(Boolean);
          for (let i = 0; i < Math.min(lines.length, alerts.length); i++) {
            alerts[i].message = lines[i];
          }
        }
      }
    } catch {}

    return NextResponse.json({ ok: true, alerts });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}


