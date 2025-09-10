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

type Language = "en" | "ml";

export async function POST(req: NextRequest) {
  try {
    const startedAt = Date.now();
    const body = await req.json();
    const messages: ChatMessage[] = body?.messages ?? [];
    const model: string = body?.model ?? "mistral:latest"; // default to a tag you have
    const landContext: LandContext | null = body?.landContext ?? null;
    const language: Language = body?.language ?? "en";
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
            
            // Get recent activities for the land (simple query, no complex indexes)
            let activities: any[] = [];
            try {
              const activitiesSnap = await farmerDoc.ref
                .collection("activities")
                .orderBy("createdAt", "desc")
                .limit(100) // Get more activities to filter in memory
                .get();
              
              const allActivities = activitiesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
              
              // Filter by landId and date range in memory
              activities = allActivities.filter((activity: any) => {
                if (activity.landId !== landId) return false;
                
                const activityDate = activity.activityDate || activity.createdAt;
                let activityTime: number;
                
                if (activityDate instanceof Date) {
                  activityTime = activityDate.getTime();
                } else if (activityDate?.seconds) {
                  activityTime = activityDate.seconds * 1000;
                } else if (typeof activityDate === 'number') {
                  activityTime = activityDate;
                } else {
                  activityTime = Date.parse(activityDate) || 0;
                }
                
                return activityTime >= thirtyDaysAgo.getTime();
              });
              
              // Sort by activity date and limit to 20
              activities.sort((a: any, b: any) => {
                const getTime = (activity: any) => {
                  const date = activity.activityDate || activity.createdAt;
                  if (date instanceof Date) return date.getTime();
                  if (date?.seconds) return date.seconds * 1000;
                  if (typeof date === 'number') return date;
                  return Date.parse(date) || 0;
                };
                return getTime(b) - getTime(a);
              });
              
              activities = activities.slice(0, 20); // Limit to 20 most recent
            } catch (qerr) {
              console.warn("[chat-ollama] activities query failed; proceeding without activities", qerr);
              activities = [];
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

            // Get market data for the crop - using direct import instead of HTTP fetch
            let marketData = null;
            if (landData?.crop && landData.crop !== "Empty") {
              try {
                // Import the market search function directly instead of HTTP call
                const { searchMarketData } = await import("../../../../lib/marketSearch");
                marketData = await searchMarketData(landData.crop, landData.location || 'Kerala');
              } catch (err) {
                console.warn("Failed to fetch market data:", err);
                // Provide fallback market data
                marketData = {
                  crop: landData.crop,
                  currentPrice: "₹25-30/kg",
                  demand: "High",
                  bestMarkets: ["Kottayam", "Thrissur"],
                  harvestTime: "Ready for harvest",
                  suggestions: ["Sell at Kottayam market", "Check MSP rates"]
                };
              }
            }

            // Get government schemes data - using direct import instead of HTTP fetch
            let schemesData = null;
            try {
                const { fetchKeralaSchemes } = await import("../../../../lib/scraper/schemes");
                const schemesResult = await fetchKeralaSchemes(profileData?.language || 'en');
                schemesData = schemesResult.schemes || [];
            } catch (err) {
                console.warn("Failed to fetch schemes data:", err);
                // Provide fallback schemes data
                schemesData = [
                  {
                    title: language === "ml" ? "കാർഷിക വികസന പദ്ധതി" : "Agricultural Development Scheme",
                    description: language === "ml" ? "കാർഷികർക്ക് സാങ്കേതിക സഹായവും സബ്സിഡിയും നൽകുന്ന പദ്ധതി" : "Scheme providing technical assistance and subsidies to farmers",
                    department: "Kerala Agriculture Department",
                    category: "Development"
                  }
                ];
            }

            // Get market insights - using direct import instead of HTTP fetch
            let marketInsights = null;
            try {
                const { fetchMarketInsights } = await import("../../../../lib/marketInsights");
                const insightsResult = await fetchMarketInsights("Kerala", 10);
                marketInsights = insightsResult.data || [];
            } catch (err) {
                console.warn("Failed to fetch market insights:", err);
                // Provide fallback market insights
                marketInsights = [
                  {
                    commodity: "Paddy",
                    price: "₹28/kg",
                    market: "Kottayam",
                    state: "Kerala"
                  }
                ];
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
              schemes: schemesData,
              marketInsights: marketInsights,
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
      // Prioritize the language parameter from frontend over profile language
      const lang = language || (comprehensiveContext as any)?.profile?.language || "en";
      const languageDirective = lang === "ml"
        ? "Respond ONLY in Malayalam. Use simple Malayalam words and phrases. Include English technical terms only when absolutely necessary (like scientific names). Keep the response natural and conversational in Malayalam."
        : "Respond ONLY in English. Use clear, simple English. Avoid mixing languages.";
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
` : 'Market data not available'}

GOVERNMENT SCHEMES AVAILABLE:
${comprehensiveContext.schemes && comprehensiveContext.schemes.length > 0 ? 
  comprehensiveContext.schemes.slice(0, 5).map((scheme: any) => 
    `- ${scheme.title}: ${scheme.description.substring(0, 100)}...`
  ).join('\n') : 
  'No government schemes data available'}

MARKET INSIGHTS:
${comprehensiveContext.marketInsights && comprehensiveContext.marketInsights.length > 0 ? 
  comprehensiveContext.marketInsights.slice(0, 3).map((insight: any) => 
    `- ${insight.commodity}: ₹${insight.price}/kg at ${insight.market} (${insight.state})`
  ).join('\n') : 
  'No market insights available'}`;
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
CRITICAL: Keep responses SHORT and PRACTICAL. Farmers need quick, actionable advice, not long explanations.

1. MAXIMUM 2-3 sentences per response
2. Use bullet points or numbered lists when helpful
3. Focus on immediate, actionable steps
4. Provide specific recommendations based on land details, weather, and market conditions
5. If asked about fertilizers, give specific type and amount
6. If asked about irrigation, give specific schedule
7. If asked about harvesting/selling, give specific timing and locations
8. If asked about weather, give brief impact and action needed
9. If asked about government schemes, list 1-2 most relevant ones
10. If asked about market prices, give current price and best selling location
11. CRITICAL: Respond ONLY in the specified language (${lang === "ml" ? "Malayalam" : "English"}) - do not mix languages
12. Use simple, direct language that farmers understand
13. Avoid technical jargon - use common farming terms
14. Be specific to Kerala's conditions and practices
15. Always end with a clear next action step

RESPONSE FORMAT:
- Keep under 50 words when possible
- Use bullet points for multiple items
- Be direct and practical
- Focus on what the farmer should DO, not explanations`;

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
            num_predict: 100,
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
              num_predict: 100,
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


