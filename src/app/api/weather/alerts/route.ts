import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const location = searchParams.get("location");
    
    if (!location) {
      return NextResponse.json({ error: "Location parameter is required" }, { status: 400 });
    }

    const apiKey = process.env.OPENWEATHER_API_KEY || "4372b31eef6b4aafe4a91ecedfd58982";

    // Support both "City" and "lat, lng" inputs
    let alertsUrl = ``;
    if (/^-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?$/.test(location)) {
      const [lat, lon] = location.split(",").map((s) => s.trim());
      alertsUrl = `https://api.openweathermap.org/data/2.5/onecall?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&exclude=minutely,hourly,daily`;
    } else {
      // For city names, we need to get coordinates first
      const geoUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(location)}&limit=1&appid=${apiKey}`;
      const geoResponse = await fetch(geoUrl);
      
      if (!geoResponse.ok) {
        throw new Error(`Geocoding API error: ${geoResponse.status}`);
      }
      
      const geoData = await geoResponse.json();
      if (!geoData || geoData.length === 0) {
        throw new Error("Location not found");
      }
      
      const { lat, lon } = geoData[0];
      alertsUrl = `https://api.openweathermap.org/data/2.5/onecall?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&exclude=minutely,hourly,daily`;
    }

    const alertsResponse = await fetch(alertsUrl);

    if (!alertsResponse.ok) {
      throw new Error(`Weather alerts API error: ${alertsResponse.status}`);
    }

    const alertsData = await alertsResponse.json();

    // Process weather alerts for agricultural context
    const processedAlerts = {
      location: alertsData.timezone,
      current: {
        temperature: alertsData.current?.temp,
        feelsLike: alertsData.current?.feels_like,
        humidity: alertsData.current?.humidity,
        windSpeed: alertsData.current?.wind_speed,
        windDirection: alertsData.current?.wind_deg,
        pressure: alertsData.current?.pressure,
        visibility: alertsData.current?.visibility,
        uvIndex: alertsData.current?.uvi,
        description: alertsData.current?.weather?.[0]?.description,
        icon: alertsData.current?.weather?.[0]?.icon
      },
      alerts: alertsData.alerts?.map((alert: any) => ({
        id: alert.event,
        title: alert.event,
        description: alert.description,
        severity: alert.tags?.[0] || "moderate",
        start: new Date(alert.start * 1000).toISOString(),
        end: new Date(alert.end * 1000).toISOString(),
        agricultural: {
          impact: getAgriculturalImpact(alert.event, alert.description),
          recommendations: getAgriculturalRecommendations(alert.event, alert.description)
        }
      })) || [],
      agricultural: {
        irrigation: alertsData.current?.humidity > 80 ? "No irrigation needed - high humidity" : 
                   alertsData.current?.humidity < 40 ? "Irrigation recommended - low humidity" : 
                   "Monitor soil moisture",
        pestRisk: alertsData.current?.humidity > 85 ? "High pest risk - high humidity" : 
                 alertsData.current?.humidity < 30 ? "Low pest risk - low humidity" : 
                 "Moderate pest risk",
        harvest: alertsData.current?.weather?.[0]?.main === "Rain" ? "Avoid harvesting - rainy conditions" : 
                alertsData.current?.wind_speed > 10 ? "Be cautious with harvesting - windy conditions" : 
                "Good conditions for harvesting",
        planting: alertsData.current?.weather?.[0]?.main === "Rain" ? "Good time for planting - moist conditions" : 
                 alertsData.current?.temp < 15 ? "Wait for warmer weather for planting" : 
                 "Suitable conditions for planting"
      },
      lastUpdated: new Date().toISOString()
    };

    console.info("[weather-alerts] fetched", { location, alertsCount: processedAlerts.alerts.length });

    return NextResponse.json({ 
      ok: true, 
      weather: processedAlerts 
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[weather-alerts] error", msg, err);
    return NextResponse.json({ error: msg || "Internal error" }, { status: 500 });
  }
}

function getAgriculturalImpact(event: string, description: string): string {
  const eventLower = event.toLowerCase();
  const descLower = description.toLowerCase();
  
  if (eventLower.includes("rain") || eventLower.includes("storm")) {
    return "Heavy rainfall may cause waterlogging and soil erosion. Monitor drainage systems.";
  } else if (eventLower.includes("heat") || eventLower.includes("temperature")) {
    return "High temperatures may stress crops and increase irrigation needs.";
  } else if (eventLower.includes("wind") || eventLower.includes("gale")) {
    return "Strong winds may damage crops and affect pollination.";
  } else if (eventLower.includes("frost") || eventLower.includes("freeze")) {
    return "Frost may damage sensitive crops and young plants.";
  } else if (eventLower.includes("drought") || eventLower.includes("dry")) {
    return "Dry conditions may require increased irrigation and water management.";
  }
  
  return "Monitor weather conditions and adjust farming practices accordingly.";
}

function getAgriculturalRecommendations(event: string, description: string): string[] {
  const eventLower = event.toLowerCase();
  const recommendations: string[] = [];
  
  if (eventLower.includes("rain") || eventLower.includes("storm")) {
    recommendations.push("Check and clear drainage systems");
    recommendations.push("Postpone field work if conditions are unsafe");
    recommendations.push("Monitor for waterlogging in low-lying areas");
  } else if (eventLower.includes("heat") || eventLower.includes("temperature")) {
    recommendations.push("Increase irrigation frequency");
    recommendations.push("Provide shade for sensitive crops");
    recommendations.push("Water early morning or late evening");
  } else if (eventLower.includes("wind") || eventLower.includes("gale")) {
    recommendations.push("Secure or harvest vulnerable crops");
    recommendations.push("Postpone spraying operations");
    recommendations.push("Check for crop damage after the event");
  } else if (eventLower.includes("frost") || eventLower.includes("freeze")) {
    recommendations.push("Cover sensitive crops with protective material");
    recommendations.push("Consider irrigation to protect from frost");
    recommendations.push("Delay planting of frost-sensitive crops");
  } else if (eventLower.includes("drought") || eventLower.includes("dry")) {
    recommendations.push("Implement water conservation measures");
    recommendations.push("Consider drought-resistant crop varieties");
    recommendations.push("Optimize irrigation scheduling");
  }
  
  if (recommendations.length === 0) {
    recommendations.push("Monitor weather conditions closely");
    recommendations.push("Adjust farming practices as needed");
  }
  
  return recommendations;
}
