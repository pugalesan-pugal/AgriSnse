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
    let currentUrl = ``;
    if (/^-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?$/.test(location)) {
      const [lat, lon] = location.split(",").map((s) => s.trim());
      currentUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;
    } else {
      currentUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(location)}&appid=${apiKey}&units=metric`;
    }

    const weatherResponse = await fetch(currentUrl);

    if (!weatherResponse.ok) {
      throw new Error(`Weather API error: ${weatherResponse.status}`);
    }

    const weatherData = await weatherResponse.json();

    // Process current weather data for agricultural context
    const processedWeather = {
      current: {
        temperature: weatherData.main?.temp,
        feelsLike: weatherData.main?.feels_like,
        humidity: weatherData.main?.humidity,
        windSpeed: weatherData.wind?.speed,
        windDirection: weatherData.wind?.deg,
        pressure: weatherData.main?.pressure,
        visibility: weatherData.visibility,
        uvIndex: weatherData.uvi,
        description: weatherData.weather?.[0]?.description,
        icon: weatherData.weather?.[0]?.icon,
        location: weatherData.name,
        country: weatherData.sys?.country,
        sunrise: weatherData.sys?.sunrise,
        sunset: weatherData.sys?.sunset
      },
      agricultural: {
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

    console.info("[weather-current] fetched", { location, temperature: weatherData.main?.temp });

    return NextResponse.json({ 
      ok: true, 
      weather: processedWeather 
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[weather-current] error", msg, err);
    return NextResponse.json({ error: msg || "Internal error" }, { status: 500 });
  }
}
