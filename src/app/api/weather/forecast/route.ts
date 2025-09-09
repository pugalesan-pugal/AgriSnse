import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const location = searchParams.get("location");
    const days = parseInt(searchParams.get("days") || "5");
    
    if (!location) {
      return NextResponse.json({ error: "Location parameter is required" }, { status: 400 });
    }

    const apiKey = process.env.OPENWEATHER_API_KEY || "4372b31eef6b4aafe4a91ecedfd58982";

    // Support both "City" and "lat, lng" inputs
    let forecastUrl = ``;
    if (/^-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?$/.test(location)) {
      const [lat, lon] = location.split(",").map((s) => s.trim());
      forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;
    } else {
      forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(location)}&appid=${apiKey}&units=metric`;
    }

    const forecastResponse = await fetch(forecastUrl);

    if (!forecastResponse.ok) {
      throw new Error(`Weather API error: ${forecastResponse.status}`);
    }

    const forecastData = await forecastResponse.json();

    // Process forecast data - group by day and get daily summaries
    const dailyForecasts: any[] = [];
    const groupedByDay = new Map<string, any[]>();

    forecastData.list?.forEach((item: any) => {
      const date = new Date(item.dt * 1000).toDateString();
      if (!groupedByDay.has(date)) {
        groupedByDay.set(date, []);
      }
      const dayItems = groupedByDay.get(date);
      if (dayItems) {
        dayItems.push(item);
      }
    });

    // Create daily summaries
    groupedByDay.forEach((dayItems, date) => {
      const temps = dayItems.map((item: any) => item.main.temp);
      const humidities = dayItems.map((item: any) => item.main.humidity);
      const windSpeeds = dayItems.map((item: any) => item.wind.speed);
      
      const dailySummary = {
        date: date,
        minTemp: Math.min(...temps),
        maxTemp: Math.max(...temps),
        avgTemp: temps.reduce((a: number, b: number) => a + b, 0) / temps.length,
        avgHumidity: humidities.reduce((a: number, b: number) => a + b, 0) / humidities.length,
        avgWindSpeed: windSpeeds.reduce((a: number, b: number) => a + b, 0) / windSpeeds.length,
        description: dayItems[Math.floor(dayItems.length / 2)].weather[0].description,
        icon: dayItems[Math.floor(dayItems.length / 2)].weather[0].icon,
        precipitation: dayItems.reduce((sum: number, item: any) => sum + (item.rain?.["3h"] || 0), 0),
        agricultural: {
          irrigation: humidities.reduce((a: number, b: number) => a + b, 0) / humidities.length > 80 ? "No irrigation needed" : 
                     humidities.reduce((a: number, b: number) => a + b, 0) / humidities.length < 40 ? "Irrigation recommended" : 
                     "Monitor soil moisture",
          pestRisk: humidities.reduce((a: number, b: number) => a + b, 0) / humidities.length > 85 ? "High pest risk" : 
                   humidities.reduce((a: number, b: number) => a + b, 0) / humidities.length < 30 ? "Low pest risk" : 
                   "Moderate pest risk",
          harvest: dayItems.some((item: any) => item.weather[0].main === "Rain") ? "Avoid harvesting - rainy conditions" : 
                  windSpeeds.reduce((a: number, b: number) => a + b, 0) / windSpeeds.length > 10 ? "Be cautious with harvesting - windy conditions" : 
                  "Good conditions for harvesting"
        }
      };
      
      dailyForecasts.push(dailySummary);
    });

    // Limit to requested number of days
    const limitedForecasts = dailyForecasts.slice(0, days);

    console.info("[weather-forecast] fetched", { location, days: limitedForecasts.length });

    return NextResponse.json({ 
      ok: true, 
      forecast: {
        location: forecastData.city?.name,
        country: forecastData.city?.country,
        daily: limitedForecasts,
        lastUpdated: new Date().toISOString()
      }
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[weather-forecast] error", msg, err);
    return NextResponse.json({ error: msg || "Internal error" }, { status: 500 });
  }
}
