import { NextRequest, NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import { getOrInitFirebaseApp } from "@/lib/server/firebaseAdmin";

// Minimal server route that proxies to an Ollama server.
// Configure OLLAMA_HOST in environment or default to localhost.

type ChatMessage = { role: "user" | "assistant" | "system"; content: string };
type LandContext = {
  name: string;
  location: string;
  size: string;
  crop: string;
  soil: string;
  irrigation: string;
};

export async function POST(req: NextRequest) {
  try {
    const startedAt = Date.now();
    const body = await req.json();
    const messages: ChatMessage[] = body?.messages ?? [];
    const model: string = body?.model ?? "mistral"; // e.g., mistral or mistral:7b-instruct
    const landContext: LandContext | null = body?.landContext ?? null;
    const host = process.env.OLLAMA_HOST || "http://localhost:11434";
    const userCode: string | undefined = body?.userCode;
    const landId: string | undefined = body?.landId;

    // Build contextualized prompt
    let contextualizedMessages = [...messages];
    if (landContext) {
      const systemPrompt = `You are an agricultural advisor for Kerala, India. The farmer is asking about their specific land:

LAND DETAILS:
- Name: ${landContext.name}
- Location: ${landContext.location}
- Size: ${landContext.size}
- Crop: ${landContext.crop}
- Soil Type: ${landContext.soil}
- Irrigation: ${landContext.irrigation}

Provide specific, actionable advice based on these land details. Consider Kerala's climate, soil conditions, and agricultural practices. If the farmer asks about irrigation, pest control, or crop management, tailor your response to their specific crop type and soil conditions.

Respond in a mix of English and Malayalam as appropriate. Be practical and specific to their situation.`;

      contextualizedMessages = [
        { role: "system", content: systemPrompt },
        ...messages
      ];
    }

    console.info("[chat-ollama] incoming", {
      model,
      host,
      messagesCount: contextualizedMessages.length,
      hasLandContext: !!landContext,
      lastUser:
        messages.filter((m) => m.role === "user").slice(-1)[0]?.content?.slice(0, 120) ?? "",
    });

    // Build dynamic context: profile + weather
    let profileSnippet = "";
    try {
      if (userCode) {
        await getOrInitFirebaseApp();
        const db = getFirestore();
        const farmerSnap = await db.collection("farmers").where("code", "==", userCode).limit(1).get();
        if (!farmerSnap.empty) {
          const farmerRef = farmerSnap.docs[0].ref;
          const prof = await farmerRef.collection("profile").doc("basic").get();
          const p = prof.exists ? (prof.data() as { gps?: string; cropType?: string; soilType?: string; irrigation?: string }) : {};
          let landInfo: { name?: string; sizeValue?: number; sizeUnit?: string } | null = null;
          if (landId) {
            const landDoc = await farmerRef.collection("lands").doc(landId).get();
            if (landDoc.exists) landInfo = landDoc.data() as { name?: string; sizeValue?: number; sizeUnit?: string };
          }
          // Weather by GPS if available
          let weather: { weather?: { description?: string }[]; main?: { temp?: number; humidity?: number } } | null = null;
          try {
            const coords = (p?.gps || "").split(",").map((s: string)=>s.trim());
            if (coords.length===2 && process.env.OPENWEATHER_API_KEY) {
              const w = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${coords[0]}&lon=${coords[1]}&appid=${process.env.OPENWEATHER_API_KEY}&units=metric`);
              if (w.ok) weather = await w.json();
            }
          } catch {}
          profileSnippet = `Farmer profile:\n- code: ${userCode}\n- crop: ${p?.cropType ?? "unknown"}\n- soil: ${p?.soilType ?? "unknown"}\n- irrigation: ${p?.irrigation ?? "unknown"}\nSelected land: ${landInfo ? JSON.stringify({ name: landInfo.name, sizeValue: landInfo.sizeValue, sizeUnit: landInfo.sizeUnit }) : "not selected"}\nWeather: ${weather ? `${weather.weather?.[0]?.description}, temp ${weather.main?.temp}C, humidity ${weather.main?.humidity}%` : "unknown"}`;
        }
      }
    } catch {}

    const systemPreamble: ChatMessage[] = profileSnippet
      ? [{ role: "system", content: `Use this context to tailor agronomy advice. Be practical and region-aware.\n${profileSnippet}` }]
      : [];

    const resp = await fetch(`${host}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: contextualizedMessages,
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


