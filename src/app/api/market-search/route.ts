import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const crop = searchParams.get("crop");
    const location = searchParams.get("location") || "Kerala";
    
    if (!crop) {
      return NextResponse.json({ error: "Crop parameter is required" }, { status: 400 });
    }

    // Mock market data for Kerala - in production, you'd integrate with real market APIs
    const marketData = {
      rice: {
        currentPrice: "₹28-35 per kg",
        demand: "High",
        bestMarkets: ["Kochi", "Thrissur", "Palakkad", "Kozhikode"],
        harvestTime: "October-December",
        suggestions: [
          "Contact Kerala State Civil Supplies Corporation",
          "Check with local rice mills",
          "Visit Agricultural Produce Market Committee (APMC)",
          "Consider direct sales to hotels and restaurants"
        ],
        cooperatives: ["Kerala State Cooperative Marketing Federation", "District Cooperative Banks"]
      },
      banana: {
        currentPrice: "₹25-40 per dozen",
        demand: "Very High",
        bestMarkets: ["Kochi", "Thrissur", "Kozhikode", "Kannur"],
        harvestTime: "Year-round",
        suggestions: [
          "Contact Kerala State Horticultural Products Development Corporation",
          "Check with local fruit vendors",
          "Consider export opportunities",
          "Direct sales to supermarkets"
        ],
        cooperatives: ["Kerala State Cooperative Marketing Federation"]
      },
      coconut: {
        currentPrice: "₹8-12 per piece",
        demand: "High",
        bestMarkets: ["Kochi", "Thrissur", "Kozhikode", "Kollam"],
        harvestTime: "Year-round",
        suggestions: [
          "Contact Kerala State Coconut Development Corporation",
          "Check with local coconut oil mills",
          "Direct sales to households",
          "Consider value-added products"
        ],
        cooperatives: ["Kerala State Cooperative Marketing Federation"]
      },
      pepper: {
        currentPrice: "₹450-550 per kg",
        demand: "Very High",
        bestMarkets: ["Kochi", "Kozhikode", "Kannur", "Kasaragod"],
        harvestTime: "December-March",
        suggestions: [
          "Contact Spices Board of India",
          "Check with local spice traders",
          "Consider export opportunities",
          "Direct sales to spice companies"
        ],
        cooperatives: ["Kerala State Cooperative Marketing Federation"]
      },
      cardamom: {
        currentPrice: "₹1200-1800 per kg",
        demand: "High",
        bestMarkets: ["Idukki", "Kochi", "Kozhikode"],
        harvestTime: "October-February",
        suggestions: [
          "Contact Spices Board of India",
          "Check with local spice traders",
          "Consider auction at Vandanmedu",
          "Direct sales to spice companies"
        ],
        cooperatives: ["Kerala State Cooperative Marketing Federation"]
      },
      rubber: {
        currentPrice: "₹150-180 per kg",
        demand: "Moderate",
        bestMarkets: ["Kottayam", "Pathanamthitta", "Kollam"],
        harvestTime: "Year-round",
        suggestions: [
          "Contact Rubber Board of India",
          "Check with local rubber dealers",
          "Consider cooperative societies",
          "Direct sales to rubber companies"
        ],
        cooperatives: ["Kerala State Cooperative Marketing Federation"]
      },
      tea: {
        currentPrice: "₹120-200 per kg",
        demand: "Moderate",
        bestMarkets: ["Munnar", "Kochi", "Kozhikode"],
        harvestTime: "Year-round",
        suggestions: [
          "Contact Tea Board of India",
          "Check with local tea estates",
          "Consider cooperative societies",
          "Direct sales to tea companies"
        ],
        cooperatives: ["Kerala State Cooperative Marketing Federation"]
      }
    };

    // Normalize crop aliases (avoid 404 for common synonyms)
    const alias = (crop || "").toLowerCase().trim();
    const cropAliasMap: Record<string, keyof typeof marketData> = {
      paddy: "rice",
      rice: "rice",
      coconut: "coconut",
      banana: "banana",
      pepper: "pepper",
      cardamom: "cardamom",
      rubber: "rubber",
      tea: "tea",
    };
    const mappedKey = cropAliasMap[alias];
    const cropData = mappedKey ? marketData[mappedKey] : (marketData[alias as keyof typeof marketData] as any);
    
    // If unknown crop, return a graceful generic template instead of 404
    if (!cropData) {
      const generic = {
        currentPrice: "N/A",
        demand: "Unknown",
        bestMarkets: ["Local APMC"],
        harvestTime: "Varies",
        suggestions: [
          "Check state agri portal for MSP / mandi rates",
          "Consult nearest cooperative / FPO",
          "Compare prices across nearby markets",
        ],
        cooperatives: ["Kerala State Cooperative Marketing Federation"],
      };
      return NextResponse.json({ ok: true, data: { crop, location, ...generic, lastUpdated: new Date().toISOString() } });
    }

    // Add location-specific information
    const locationInfo = {
      kochi: {
        markets: ["Ernakulam Market", "Kochi Port", "Marine Drive Market"],
        contact: "0484-2361234"
      },
      thrissur: {
        markets: ["Thrissur Market", "Punkunnam Market"],
        contact: "0487-2331234"
      },
      palakkad: {
        markets: ["Palakkad Market", "Ottapalam Market"],
        contact: "0491-2521234"
      },
      kozhikode: {
        markets: ["Kozhikode Market", "Beypore Market"],
        contact: "0495-2761234"
      }
    };

    const response = {
      crop: crop,
      location: location,
      currentPrice: cropData.currentPrice,
      demand: cropData.demand,
      bestMarkets: cropData.bestMarkets,
      harvestTime: cropData.harvestTime,
      suggestions: cropData.suggestions,
      cooperatives: cropData.cooperatives,
      locationInfo: locationInfo[location.toLowerCase() as keyof typeof locationInfo] || null,
      lastUpdated: new Date().toISOString()
    };

    console.info("[market-search] searched", { crop, location });

    return NextResponse.json({ 
      ok: true, 
      data: response 
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[market-search] error", msg, err);
    return NextResponse.json({ error: msg || "Internal error" }, { status: 500 });
  }
}
