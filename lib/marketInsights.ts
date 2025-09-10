// lib/marketInsights.ts
export async function fetchMarketInsights(state: string = "Kerala", limit: number = 10) {
  // This function provides market insights data
  // In a real implementation, this would query a database or external API
  
  const insights = [
    {
      commodity: "Paddy",
      price: "₹28/kg",
      market: "Kottayam",
      state: "Kerala",
      trend: "Stable",
      change: "+2%"
    },
    {
      commodity: "Coconut",
      price: "₹18/piece",
      market: "Thrissur",
      state: "Kerala",
      trend: "Rising",
      change: "+5%"
    },
    {
      commodity: "Banana",
      price: "₹30/kg",
      market: "Kochi",
      state: "Kerala",
      trend: "Stable",
      change: "0%"
    },
    {
      commodity: "Rubber",
      price: "₹190/kg",
      market: "Kottayam",
      state: "Kerala",
      trend: "Rising",
      change: "+3%"
    },
    {
      commodity: "Pepper",
      price: "₹480/kg",
      market: "Kochi",
      state: "Kerala",
      trend: "Falling",
      change: "-2%"
    },
    {
      commodity: "Cardamom",
      price: "₹1300/kg",
      market: "Idukki",
      state: "Kerala",
      trend: "Rising",
      change: "+8%"
    },
    {
      commodity: "Ginger",
      price: "₹90/kg",
      market: "Wayanad",
      state: "Kerala",
      trend: "Stable",
      change: "+1%"
    },
    {
      commodity: "Turmeric",
      price: "₹70/kg",
      market: "Thrissur",
      state: "Kerala",
      trend: "Rising",
      change: "+4%"
    },
    {
      commodity: "Cashew",
      price: "₹220/kg",
      market: "Kollam",
      state: "Kerala",
      trend: "Stable",
      change: "+1%"
    },
    {
      commodity: "Tapioca",
      price: "₹15/kg",
      market: "Thiruvananthapuram",
      state: "Kerala",
      trend: "Stable",
      change: "0%"
    }
  ];
  
  // Filter by state if provided
  const filteredInsights = state ? insights.filter(insight => insight.state === state) : insights;
  
  // Limit results
  const limitedInsights = filteredInsights.slice(0, limit);
  
  return {
    data: limitedInsights,
    totalCount: filteredInsights.length,
    state: state,
    generatedAt: new Date().toISOString()
  };
}
