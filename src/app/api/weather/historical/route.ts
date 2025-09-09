import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const location = searchParams.get("location");
    const days = parseInt(searchParams.get("days") || "7");
    
    if (!location) {
      return NextResponse.json({ error: "Location parameter is required" }, { status: 400 });
    }

    const apiKey = process.env.OPENWEATHER_API_KEY || "4372b31eef6b4aafe4a91ecedfd58982";

    // For historical data, we need coordinates
    let lat: string, lon: string;
    
    if (/^-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?$/.test(location)) {
      [lat, lon] = location.split(",").map((s) => s.trim());
    } else {
      // Get coordinates for city name
      const geoUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(location)}&limit=1&appid=${apiKey}`;
      const geoResponse = await fetch(geoUrl);
      
      if (!geoResponse.ok) {
        throw new Error(`Geocoding API error: ${geoResponse.status}`);
      }
      
      const geoData = await geoResponse.json();
      if (!geoData || geoData.length === 0) {
        throw new Error("Location not found");
      }
      
      lat = geoData[0].lat.toString();
      lon = geoData[0].lon.toString();
    }

    // Get historical data for the past N days
    const historicalData = [];
    const currentDate = new Date();
    
    for (let i = 1; i <= days; i++) {
      const targetDate = new Date(currentDate);
      targetDate.setDate(targetDate.getDate() - i);
      const timestamp = Math.floor(targetDate.getTime() / 1000);
      
      try {
        const historicalUrl = `https://api.openweathermap.org/data/2.5/onecall/timemachine?lat=${lat}&lon=${lon}&dt=${timestamp}&appid=${apiKey}&units=metric`;
        const historicalResponse = await fetch(historicalUrl);
        
        if (historicalResponse.ok) {
          const dayData = await historicalResponse.json();
          historicalData.push({
            date: targetDate.toISOString().split('T')[0],
            temperature: dayData.current?.temp,
            humidity: dayData.current?.humidity,
            windSpeed: dayData.current?.wind_speed,
            windDirection: dayData.current?.wind_deg,
            pressure: dayData.current?.pressure,
            description: dayData.current?.weather?.[0]?.description,
            icon: dayData.current?.weather?.[0]?.icon,
            agricultural: {
              irrigation: dayData.current?.humidity > 80 ? "No irrigation needed" : 
                         dayData.current?.humidity < 40 ? "Irrigation recommended" : 
                         "Monitor soil moisture",
              pestRisk: dayData.current?.humidity > 85 ? "High pest risk" : 
                       dayData.current?.humidity < 30 ? "Low pest risk" : 
                       "Moderate pest risk"
            }
          });
        }
      } catch (err) {
        console.warn(`Failed to fetch historical data for day ${i}:`, err);
      }
    }

    // Calculate trends
    const temperatures = historicalData.map(d => d.temperature).filter(t => t !== undefined);
    const humidities = historicalData.map(d => d.humidity).filter(h => h !== undefined);
    
    const trends = {
      temperature: temperatures.length > 1 ? {
        trend: temperatures[0] > temperatures[temperatures.length - 1] ? "increasing" : "decreasing",
        average: temperatures.reduce((a, b) => a + b, 0) / temperatures.length,
        min: Math.min(...temperatures),
        max: Math.max(...temperatures)
      } : null,
      humidity: humidities.length > 1 ? {
        trend: humidities[0] > humidities[humidities.length - 1] ? "increasing" : "decreasing",
        average: humidities.reduce((a, b) => a + b, 0) / humidities.length,
        min: Math.min(...humidities),
        max: Math.max(...humidities)
      } : null
    };

    console.info("[weather-historical] fetched", { location, days: historicalData.length });

    return NextResponse.json({ 
      ok: true, 
      historical: {
        location: location,
        days: historicalData,
        trends: trends,
        lastUpdated: new Date().toISOString()
      }
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[weather-historical] error", msg, err);
    return NextResponse.json({ error: msg || "Internal error" }, { status: 500 });
  }
}
