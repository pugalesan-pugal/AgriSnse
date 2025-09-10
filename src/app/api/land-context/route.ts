import { NextRequest, NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import { getOrInitFirebaseApp } from "@/lib/server/firebaseAdmin";

export async function GET(request: NextRequest) {
  try {
    await getOrInitFirebaseApp();
    const db = getFirestore();

    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const landId = searchParams.get("landId");
    
    if (!code || !landId) {
      return NextResponse.json({ error: "Missing farmer code or land ID" }, { status: 400 });
    }

    // Find farmer by code
    const farmersRef = db.collection("farmers");
    const snap = await farmersRef.where("code", "==", code).limit(1).get();
    if (snap.empty) {
      return NextResponse.json({ error: "Farmer not found" }, { status: 404 });
    }

    const farmerDoc = snap.docs[0];
    const farmerId = farmerDoc.id;

    // Get land details
    const landDoc = await farmerDoc.ref.collection("lands").doc(landId).get();
    if (!landDoc.exists) {
      return NextResponse.json({ error: "Land not found" }, { status: 404 });
    }
    const landData = landDoc.data();

    // Get farmer profile for soil type, irrigation, etc.
    const profileDoc = await farmerDoc.ref.collection("profile").doc("basic").get();
    const profileData = profileDoc.exists ? profileDoc.data() : {};

    // Get recent activities for this land (last 30 days) - simple query approach
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // Get all activities and filter in memory (no complex indexes required)
    const activitiesSnap = await farmerDoc.ref
      .collection("activities")
      .orderBy("createdAt", "desc")
      .limit(100) // Get more to filter in memory
      .get();
    
    const allActivities = activitiesSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Filter by landId and date range in memory
    const activities = allActivities.filter((activity: any) => {
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
    }).slice(0, 20); // Limit to 20 most recent

    // Get weather data (we'll call OpenWeather API)
    let weatherData = null;
    if (landData?.location) {
      try {
        // Extract coordinates from location if available
        // For now, we'll use a placeholder - in production, you'd parse the location
        const weatherApiKey = process.env.OPENWEATHER_API_KEY || "4372b31eef6b4aafe4a91ecedfd58982";
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

    // Get market data for the crop (placeholder for now)
    let marketData = null;
    if (landData?.crop && landData.crop !== "Empty") {
      try {
        // In production, you'd call a market API here
        marketData = {
          crop: landData.crop,
          currentPrice: "₹45-55 per kg", // Placeholder
          demand: "High",
          bestMarkets: ["Kochi", "Thrissur", "Palakkad"],
          harvestTime: "Ready for harvest",
          suggestions: ["Contact local cooperatives", "Check online marketplaces"]
        };
      } catch (err) {
        console.warn("Failed to fetch market data:", err);
      }
    }

    const contextData = {
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
        experience: profileData?.experience || "Unknown"
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
        description: weatherData.weather?.[0]?.description,
        location: weatherData.name
      } : null,
      market: marketData,
      lastUpdated: new Date().toISOString()
    };

    console.info("[land-context] generated context", { 
      code, 
      landId, 
      activitiesCount: activities.length,
      hasWeather: !!weatherData,
      hasMarket: !!marketData
    });

    return NextResponse.json({ 
      ok: true, 
      context: contextData 
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[land-context] error", msg, err);
    return NextResponse.json({ error: msg || "Internal error" }, { status: 500 });
  }
}
