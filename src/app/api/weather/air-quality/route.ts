import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const location = searchParams.get("location");
    
    if (!location) {
      return NextResponse.json({ error: "Location parameter is required" }, { status: 400 });
    }

    const apiKey = process.env.OPENWEATHER_API_KEY || "4372b31eef6b4aafe4a91ecedfd58982";

    // Get coordinates for the location
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

    // Get air quality data
    const airQualityUrl = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${apiKey}`;
    const airQualityResponse = await fetch(airQualityUrl);

    if (!airQualityResponse.ok) {
      throw new Error(`Air quality API error: ${airQualityResponse.status}`);
    }

    const airQualityData = await airQualityResponse.json();

    // Get air quality forecast (5 days)
    const airQualityForecastUrl = `https://api.openweathermap.org/data/2.5/air_pollution/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}`;
    const airQualityForecastResponse = await fetch(airQualityForecastUrl);

    let forecastData = null;
    if (airQualityForecastResponse.ok) {
      forecastData = await airQualityForecastResponse.json();
    }

    // Process air quality data for agricultural context
    const current = airQualityData.list?.[0];
    const aqi = current?.main?.aqi || 1;
    
    const processedAirQuality = {
      location: location,
      current: {
        aqi: aqi,
        aqiDescription: getAQIDescription(aqi),
        co: current?.components?.co,
        no: current?.components?.no,
        no2: current?.components?.no2,
        o3: current?.components?.o3,
        so2: current?.components?.so2,
        pm2_5: current?.components?.pm2_5,
        pm10: current?.components?.pm10,
        nh3: current?.components?.nh3,
        timestamp: new Date(current?.dt * 1000).toISOString()
      },
      forecast: forecastData ? {
        daily: forecastData.list?.slice(0, 5).map((item: any) => ({
          date: new Date(item.dt * 1000).toISOString().split('T')[0],
          aqi: item.main?.aqi,
          aqiDescription: getAQIDescription(item.main?.aqi),
          pm2_5: item.components?.pm2_5,
          pm10: item.components?.pm10,
          agricultural: getAgriculturalAirQualityImpact(item.main?.aqi, item.components)
        }))
      } : null,
      agricultural: {
        impact: getAgriculturalAirQualityImpact(aqi, current?.components),
        recommendations: getAgriculturalAirQualityRecommendations(aqi, current?.components)
      },
      lastUpdated: new Date().toISOString()
    };

    console.info("[weather-air-quality] fetched", { location, aqi });

    return NextResponse.json({ 
      ok: true, 
      airQuality: processedAirQuality 
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[weather-air-quality] error", msg, err);
    return NextResponse.json({ error: msg || "Internal error" }, { status: 500 });
  }
}

function getAQIDescription(aqi: number): string {
  switch (aqi) {
    case 1: return "Good";
    case 2: return "Fair";
    case 3: return "Moderate";
    case 4: return "Poor";
    case 5: return "Very Poor";
    default: return "Unknown";
  }
}

function getAgriculturalAirQualityImpact(aqi: number, components: any): string {
  if (aqi >= 4) {
    return "Poor air quality may affect crop growth and photosynthesis. Monitor plant health closely.";
  } else if (aqi >= 3) {
    return "Moderate air quality may have minor effects on sensitive crops.";
  } else {
    return "Good air quality conditions for crop growth.";
  }
}

function getAgriculturalAirQualityRecommendations(aqi: number, components: any): string[] {
  const recommendations: string[] = [];
  
  if (aqi >= 4) {
    recommendations.push("Consider reducing outdoor activities during peak pollution hours");
    recommendations.push("Monitor crops for signs of stress or damage");
    recommendations.push("Increase irrigation to help plants cope with air pollution stress");
    recommendations.push("Consider using air filtration in greenhouses if available");
  } else if (aqi >= 3) {
    recommendations.push("Monitor sensitive crops for any signs of stress");
    recommendations.push("Maintain optimal growing conditions to help plants cope");
  } else {
    recommendations.push("Good conditions for outdoor farming activities");
    recommendations.push("Continue normal agricultural practices");
  }
  
  return recommendations;
}
