import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
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
    const model: string = body?.model ?? "mistral:latest"; // default to a tag you have
    const landContext: LandContext | null = body?.landContext ?? null;
    // Resolve Ollama host with validation; fallback to local default if env is invalid
    const envHost = process.env.OLLAMA_HOST?.trim();
    const validHost = envHost && /^https?:\/\/[^\s:]+:\d+$/i.test(envHost) ? envHost : undefined;
    const host = validHost || "http://127.0.0.1:11434";
    const userCode: string | undefined = body?.userCode;
    const landId: string | undefined = body?.landId;

    // Get comprehensive land context from Firebase
    let comprehensiveContext = null;
    if (userCode && landId) {
      try {
        await getOrInitFirebaseApp();
        const db = getFirestore();
        
        // Find farmer by code
        const farmersRef = db.collection("farmers");
        const farmerSnap = await farmersRef.where("code", "==", userCode).limit(1).get();
        if (!farmerSnap.empty) {
          const farmerDoc = farmerSnap.docs[0];
          const farmerId = farmerDoc.id;

          // Get land details
          const landDoc = await farmerDoc.ref.collection("lands").doc(landId).get();
          if (landDoc.exists) {
            const landData = landDoc.data();

            // Get farmer profile for soil type, irrigation, etc.
            const profileDoc = await farmerDoc.ref.collection("profile").doc("basic").get();
            const profileData = profileDoc.exists ? (profileDoc.data() as any) : {};

            // Get recent activities for this land (last 30 days)
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            
            let activities: any[] = [];
            try {
              const activitiesQuery = farmerDoc.ref.collection("activities")
                .where("landId", "==", landId)
                .where("activityDate", ">=", thirtyDaysAgo)
                .orderBy("activityDate", "desc")
                .limit(20);
              const activitiesSnap = await activitiesQuery.get();
              activities = activitiesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
            } catch (qerr) {
              // Fallback if composite index is missing: try a simpler query
              console.warn("[chat-ollama] activities query needs index; falling back to simpler query", qerr);
              try {
                const simpleSnap = await farmerDoc.ref.collection("activities")
                  .where("landId", "==", landId)
                  .orderBy("createdAt", "desc")
                  .limit(20)
                  .get();
                activities = simpleSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
              } catch (qerr2) {
                console.warn("[chat-ollama] fallback activities query also failed; proceeding without activities", qerr2);
                activities = [];
              }
            }

            // Get weather data from OpenWeather API
            let weatherData = null;
            const weatherApiKey = process.env.OPENWEATHER_API_KEY || "4372b31eef6b4aafe4a91ecedfd58982";
            if (landData?.location && weatherApiKey) {
              try {
                const weatherResponse = await fetch(
                  `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(landData.location)}&appid=${weatherApiKey}&units=metric`
                );
                if (weatherResponse.ok) {
                  weatherData = await weatherResponse.json();
                }
              } catch (err) {
                console.warn("Failed to fetch weather data:", err);
              }
            }

            // Get market data for the crop
            let marketData = null;
            if (landData?.crop && landData.crop !== "Empty") {
              try {
                const marketResponse = await fetch(
                  `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/market-search?crop=${encodeURIComponent(landData.crop)}&location=${encodeURIComponent(landData.location || 'Kerala')}`
                );
                if (marketResponse.ok) {
                  const marketResult = await marketResponse.json();
                  marketData = marketResult.data;
                }
              } catch (err) {
                console.warn("Failed to fetch market data:", err);
              }
            }

            comprehensiveContext = {
              land: {
                id: landId,
                name: landData?.name || "Unknown",
                location: landData?.location || "Unknown",
                size: `${landData?.sizeValue || 0} ${landData?.sizeUnit || "acres"}`,
                crop: landData?.crop || "Empty",
                soilType: profileData?.soilType || "Unknown",
                irrigation: profileData?.irrigation || "Unknown",
                coordinates: landData?.coordinates || null
              },
              profile: {
                soilType: profileData?.soilType || "Unknown",
                irrigation: profileData?.irrigation || "Unknown",
                experience: profileData?.experience || "Unknown",
                language: profileData?.language === "ml" ? "ml" : "en",
              },
              activities: activities.map(activity => ({
                type: activity.type,
                date: activity.activityDate || activity.createdAt,
                notes: activity.notes || "",
                timestamp: activity.createdAt
              })),
              weather: weatherData ? {
                temperature: weatherData.main?.temp,
                humidity: weatherData.main?.humidity,
                windSpeed: weatherData.wind?.speed,
                windDirection: weatherData.wind?.deg,
                pressure: weatherData.main?.pressure,
                description: weatherData.weather?.[0]?.description,
                icon: weatherData.weather?.[0]?.icon,
                location: weatherData.name,
                country: weatherData.sys?.country
              } : null,
              market: marketData,
              lastUpdated: new Date().toISOString()
            };
          }
        }
      } catch (err) {
        console.warn("Failed to fetch comprehensive context:", err);
      }
    }

    // Build comprehensive contextualized prompt
    let contextualizedMessages = [...messages];
    if (comprehensiveContext || landContext) {
      const lang = (comprehensiveContext as any)?.profile?.language === "ml" ? "ml" : "en";
      const languageDirective = lang === "ml"
        ? "Respond primarily in Malayalam. Use simple Malayalam; include English technical terms only when necessary."
        : "Respond in English.";
      let systemPrompt = `You are an expert agricultural advisor for Kerala, India. Provide specific, actionable advice based on the farmer's land and current conditions. ${languageDirective}

LAND DETAILS:`;

      if (comprehensiveContext) {
        systemPrompt += `
- Name: ${comprehensiveContext.land.name}
- Location: ${comprehensiveContext.land.location}
- Size: ${comprehensiveContext.land.size}
- Crop: ${comprehensiveContext.land.crop}
- Soil Type: ${comprehensiveContext.land.soilType}
- Irrigation: ${comprehensiveContext.land.irrigation}

RECENT ACTIVITIES (Last 30 days):
${comprehensiveContext.activities.length > 0 ? 
  comprehensiveContext.activities.map((activity: any) => 
    `- ${activity.type} on ${new Date(activity.date).toLocaleDateString()}: ${activity.notes || 'No notes'}`
  ).join('\n') : 
  'No recent activities recorded'}

CURRENT WEATHER CONDITIONS:
${comprehensiveContext.weather ? `
- Temperature: ${comprehensiveContext.weather.temperature}°C
- Humidity: ${comprehensiveContext.weather.humidity}%
- Wind Speed: ${comprehensiveContext.weather.windSpeed} m/s
- Wind Direction: ${comprehensiveContext.weather.windDirection}°
- Pressure: ${comprehensiveContext.weather.pressure} hPa
- Conditions: ${comprehensiveContext.weather.description}
- Location: ${comprehensiveContext.weather.location}
` : 'Weather data not available'}

MARKET INFORMATION:
${comprehensiveContext.market ? `
- Crop: ${comprehensiveContext.market.crop}
- Current Price: ${comprehensiveContext.market.currentPrice}
- Demand: ${comprehensiveContext.market.demand}
- Best Markets: ${comprehensiveContext.market.bestMarkets.join(', ')}
- Harvest Status: ${comprehensiveContext.market.harvestTime}
- Selling Suggestions: ${comprehensiveContext.market.suggestions.join(', ')}
` : 'Market data not available'}`;
      } else if (landContext) {
        systemPrompt += `
- Name: ${landContext.name}
- Location: ${landContext.location}
- Size: ${landContext.size}
- Crop: ${landContext.crop}
- Soil Type: ${landContext.soil}
- Irrigation: ${landContext.irrigation}`;
      }

      systemPrompt += `

INSTRUCTIONS:
1. Provide specific advice based on the land details, recent activities, weather, and market conditions
2. If asked about fertilizers, consider the soil type, crop, and recent activities
3. If asked about irrigation, consider current weather conditions and soil type
4. If asked about harvesting or selling, provide market-specific advice for Kerala
5. If asked about weather, explain how current conditions affect farming
6. Consider the crop lifecycle based on recent activities
7. Provide practical, actionable recommendations
8. Respond in a mix of English and Malayalam as appropriate
9. Be specific to Kerala's agricultural practices and climate
10. Use weather data to provide irrigation and pest control advice
11. Consider market conditions for harvest timing and selling decisions

Always tailor your response to this specific land and current conditions.`;

      contextualizedMessages = [
        { role: "system", content: systemPrompt },
        ...messages
      ];
    }

    console.info("[chat-ollama] incoming", {
      model,
      host,
      messagesCount: contextualizedMessages.length,
      hasComprehensiveContext: !!comprehensiveContext,
      hasLandContext: !!landContext,
      lastUser: messages.filter((m) => m.role === "user").slice(-1)[0]?.content?.slice(0, 120) ?? "",
    });

    // Soft health probe: warn but don't fail fast
    try {
      const health = await fetch(`${host}/api/tags`, { method: "GET", cache: "no-store" });
      if (!health.ok) {
        console.warn(`[chat-ollama] health check not OK at ${host}`);
      }
    } catch (e) {
      console.warn(`[chat-ollama] health check failed at ${host}:`, e);
    }

    // Post to Ollama with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000);
    let resp: Response;
    try {
      resp = await fetch(`${host}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: contextualizedMessages,
          stream: false,
          options: {
            temperature: 0.7,
            num_predict: 256,
          },
        }),
        signal: controller.signal,
        cache: "no-store",
      });
    } catch (e) {
      return NextResponse.json({ error: `Ollama request failed or timed out. Host: ${host}. Ensure server is running and try again.` }, { status: 504 });
    } finally {
      clearTimeout(timeout);
    }

    if (!resp.ok) {
      // Fallback: try /api/generate with a flattened prompt
      let prompt = "";
      for (const m of contextualizedMessages) {
        if (m.role === "system") prompt += `System: ${m.content}\n`;
        if (m.role === "user") prompt += `User: ${m.content}\n`;
        if (m.role === "assistant") prompt += `Assistant: ${m.content}\n`;
      }
      try {
        const genController = new AbortController();
        const genTimeout = setTimeout(() => genController.abort(), 120000);
        const gen = await fetch(`${host}/api/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model,
            prompt,
            stream: false,
            options: {
              temperature: 0.7,
              num_predict: 256,
            },
          }),
          signal: genController.signal,
          cache: "no-store",
        });
        clearTimeout(genTimeout);
        if (gen.ok) {
          const data = await gen.json();
          const content = data?.response ?? data?.message?.content ?? "";

          // Store chat transcript in Firestore (best-effort)
          try {
            if (userCode) {
              await getOrInitFirebaseApp();
              const db = getFirestore();
              const farmersRef = db.collection("farmers");
              const farmerSnap = await farmersRef.where("code", "==", userCode).limit(1).get();
              if (!farmerSnap.empty) {
                const farmerDoc = farmerSnap.docs[0];
                await farmerDoc.ref.collection("chats").add({
                  model,
                  landId: landId || null,
                  messages: messages,
                  assistant: content,
                  createdAt: new Date(),
                  route: "generate",
                });
              }
            }
          } catch (e) {
            console.warn("[chat-ollama] failed to persist chat (generate)", e);
          }

          return NextResponse.json({ message: { role: "assistant", content } });
        }
      } catch (e) {
        // ignore and fall through
      }
      console.error("[chat-ollama] ollama error", resp.status, resp.statusText);
      const text = await resp.text();
      return NextResponse.json({ error: `Ollama error: ${text}` }, { status: 500 });
    }

    const data = await resp.json();
    const durationMs = Date.now() - startedAt;
    const preview = data?.message?.content?.slice?.(0, 120) ?? "";
    console.info("[chat-ollama] success", { durationMs, previewLength: preview.length, preview });
    // Persist chat transcript (best-effort)
    try {
      if (userCode) {
        await getOrInitFirebaseApp();
        const db = getFirestore();
        const farmersRef = db.collection("farmers");
        const farmerSnap = await farmersRef.where("code", "==", userCode).limit(1).get();
        if (!farmerSnap.empty) {
          const farmerDoc = farmerSnap.docs[0];
          await farmerDoc.ref.collection("chats").add({
            model,
            landId: landId || null,
            messages: messages,
            assistant: data?.message?.content ?? "",
            createdAt: new Date(),
            route: "chat",
          });
        }
      }
    } catch (e) {
      console.warn("[chat-ollama] failed to persist chat (chat)", e);
    }

    // Ollama chat non-stream returns an object with message { role, content }
    return NextResponse.json({ message: data?.message ?? null });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    console.error("[chat-ollama] exception", message, err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


