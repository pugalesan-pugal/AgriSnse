import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const location = searchParams.get("location");
    
    if (!location) {
      return NextResponse.json({ error: "Location parameter is required" }, { status: 400 });
    }

    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Weather API key not configured" }, { status: 500 });
    }

    // Get current weather
    const weatherResponse = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(location)}&appid=${apiKey}&units=metric`
    );

    if (!weatherResponse.ok) {
      throw new Error(`Weather API error: ${weatherResponse.status}`);
    }

    const weatherData = await weatherResponse.json();

    // Get 5-day forecast
    const forecastResponse = await fetch(
      `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(location)}&appid=${apiKey}&units=metric`
    );

    let forecastData = null;
    if (forecastResponse.ok) {
      forecastData = await forecastResponse.json();
    }

    // Process weather data for agricultural context
    const processedWeather = {
      current: {
        temperature: weatherData.main?.temp,
        humidity: weatherData.main?.humidity,
        windSpeed: weatherData.wind?.speed,
        windDirection: weatherData.wind?.deg,
        pressure: weatherData.main?.pressure,
        description: weatherData.weather?.[0]?.description,
        icon: weatherData.weather?.[0]?.icon,
        location: weatherData.name,
        country: weatherData.sys?.country
      },
      forecast: forecastData ? {
        daily: forecastData.list?.slice(0, 5).map((item: any) => ({
          date: item.dt_txt,
          temperature: item.main?.temp,
          humidity: item.main?.humidity,
          windSpeed: item.wind?.speed,
          description: item.weather?.[0]?.description,
          icon: item.weather?.[0]?.icon
        }))
      } : null,
      agricultural: {
        // Agricultural insights based on weather
        irrigation: weatherData.main?.humidity > 80 ? "No irrigation needed - high humidity" : 
                   weatherData.main?.humidity < 40 ? "Irrigation recommended - low humidity" : 
                   "Monitor soil moisture",
        pestRisk: weatherData.main?.humidity > 85 ? "High pest risk - high humidity" : 
                 weatherData.main?.humidity < 30 ? "Low pest risk - low humidity" : 
                 "Moderate pest risk",
        harvest: weatherData.weather?.[0]?.main === "Rain" ? "Avoid harvesting - rainy conditions" : 
                weatherData.wind?.speed > 10 ? "Be cautious with harvesting - windy conditions" : 
                "Good conditions for harvesting",
        planting: weatherData.weather?.[0]?.main === "Rain" ? "Good time for planting - moist conditions" : 
                 weatherData.main?.temp < 15 ? "Wait for warmer weather for planting" : 
                 "Suitable conditions for planting"
      },
      lastUpdated: new Date().toISOString()
    };

    console.info("[weather] fetched", { location, temperature: weatherData.main?.temp });

    return NextResponse.json({ 
      ok: true, 
      weather: processedWeather 
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[weather] error", msg, err);
    return NextResponse.json({ error: msg || "Internal error" }, { status: 500 });
  }
}
