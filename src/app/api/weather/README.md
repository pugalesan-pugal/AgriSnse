# Weather API Endpoints

This directory contains comprehensive weather API endpoints using OpenWeather API with the key `4372b31eef6b4aafe4a91ecedfd58982`.

## Available Endpoints

### 1. Main Weather Endpoint
**GET** `/api/weather?location={location}`

Returns current weather + 5-day forecast with agricultural insights.

**Parameters:**
- `location` (required): City name or "lat, lng" coordinates

**Example:**
```
GET /api/weather?location=Kochi
GET /api/weather?location=12.87,80.22
```

### 2. Current Weather Only
**GET** `/api/weather/current?location={location}`

Returns only current weather conditions with agricultural recommendations.

**Parameters:**
- `location` (required): City name or "lat, lng" coordinates

**Example:**
```
GET /api/weather/current?location=Thrissur
```

### 3. Weather Forecast
**GET** `/api/weather/forecast?location={location}&days={days}`

Returns weather forecast for specified number of days.

**Parameters:**
- `location` (required): City name or "lat, lng" coordinates
- `days` (optional): Number of days (default: 5, max: 5)

**Example:**
```
GET /api/weather/forecast?location=Palakkad&days=3
```

### 4. Weather Alerts
**GET** `/api/weather/alerts?location={location}`

Returns weather alerts, warnings, and severe weather conditions.

**Parameters:**
- `location` (required): City name or "lat, lng" coordinates

**Example:**
```
GET /api/weather/alerts?location=Kozhikode
```

### 5. Historical Weather
**GET** `/api/weather/historical?location={location}&days={days}`

Returns historical weather data for the past N days.

**Parameters:**
- `location` (required): City name or "lat, lng" coordinates
- `days` (optional): Number of past days (default: 7)

**Example:**
```
GET /api/weather/historical?location=Kannur&days=10
```

### 6. Air Quality
**GET** `/api/weather/air-quality?location={location}`

Returns current air quality data and forecast.

**Parameters:**
- `location` (required): City name or "lat, lng" coordinates

**Example:**
```
GET /api/weather/air-quality?location=Kollam
```

## Response Format

All endpoints return JSON with the following structure:

```json
{
  "ok": true,
  "weather": {
    "current": {
      "temperature": 28.5,
      "humidity": 75,
      "windSpeed": 3.2,
      "description": "partly cloudy",
      "icon": "02d"
    },
    "agricultural": {
      "irrigation": "Monitor soil moisture",
      "pestRisk": "Moderate pest risk",
      "harvest": "Good conditions for harvesting",
      "planting": "Suitable conditions for planting"
    },
    "lastUpdated": "2024-01-15T10:30:00.000Z"
  }
}
```

## Agricultural Insights

Each endpoint provides agricultural recommendations based on weather conditions:

- **Irrigation**: Recommendations based on humidity levels
- **Pest Risk**: Assessment based on humidity and temperature
- **Harvest**: Conditions for harvesting activities
- **Planting**: Suitability for planting operations

## Error Handling

All endpoints return appropriate HTTP status codes:
- `200`: Success
- `400`: Bad request (missing parameters)
- `500`: Internal server error

Error response format:
```json
{
  "error": "Error message description"
}
```

## Usage in AgriSense

These weather endpoints are integrated throughout the AgriSense application:

1. **Dashboard**: Current weather display in right sidebar
2. **Alerts Module**: Weather-based alerts and notifications
3. **Chat Module**: Weather context for AI responses
4. **Land Context**: Weather data for specific land parcels
5. **Activity Tracking**: Weather conditions for farm activities

## API Key

The OpenWeather API key `4372b31eef6b4aafe4a91ecedfd58982` is hardcoded in all endpoints with fallback to environment variable `OPENWEATHER_API_KEY`.
