// lib/marketSearch.ts
export async function searchMarketData(crop: string, location: string) {
  // This function provides market data for a specific crop and location
  // In a real implementation, this would query a database or external API
  
  const marketData = {
    crop: crop,
    currentPrice: getCropPrice(crop),
    demand: getCropDemand(crop),
    bestMarkets: getBestMarkets(location),
    harvestTime: getHarvestTime(crop),
    suggestions: getSellingSuggestions(crop, location)
  };
  
  return marketData;
}

function getCropPrice(crop: string): string {
  const prices: Record<string, string> = {
    'Paddy': '₹28-32/kg',
    'Rice': '₹28-32/kg',
    'Coconut': '₹15-20/piece',
    'Banana': '₹25-35/kg',
    'Rubber': '₹180-200/kg',
    'Pepper': '₹450-500/kg',
    'Cardamom': '₹1200-1400/kg',
    'Ginger': '₹80-100/kg',
    'Turmeric': '₹60-80/kg',
    'Cashew': '₹200-250/kg'
  };
  
  return prices[crop] || '₹25-30/kg';
}

function getCropDemand(crop: string): string {
  const demands: Record<string, string> = {
    'Paddy': 'High',
    'Rice': 'High',
    'Coconut': 'Medium',
    'Banana': 'High',
    'Rubber': 'Medium',
    'Pepper': 'High',
    'Cardamom': 'Medium',
    'Ginger': 'High',
    'Turmeric': 'High',
    'Cashew': 'Medium'
  };
  
  return demands[crop] || 'Medium';
}

function getBestMarkets(location: string): string[] {
  const markets: Record<string, string[]> = {
    'Kottayam': ['Kottayam Market', 'Thrissur Market', 'Kochi Market'],
    'Thrissur': ['Thrissur Market', 'Kochi Market', 'Kottayam Market'],
    'Kochi': ['Kochi Market', 'Thrissur Market', 'Kottayam Market'],
    'Thiruvananthapuram': ['Thiruvananthapuram Market', 'Kochi Market', 'Kottayam Market'],
    'Kozhikode': ['Kozhikode Market', 'Kochi Market', 'Thrissur Market']
  };
  
  return markets[location] || ['Kottayam Market', 'Thrissur Market', 'Kochi Market'];
}

function getHarvestTime(crop: string): string {
  const harvestTimes: Record<string, string> = {
    'Paddy': 'Ready for harvest in 2-3 weeks',
    'Rice': 'Ready for harvest in 2-3 weeks',
    'Coconut': 'Year-round harvesting',
    'Banana': 'Ready for harvest in 1-2 months',
    'Rubber': 'Ready for tapping',
    'Pepper': 'Ready for harvest in 1 month',
    'Cardamom': 'Ready for harvest in 2-3 weeks',
    'Ginger': 'Ready for harvest in 1-2 months',
    'Turmeric': 'Ready for harvest in 1-2 months',
    'Cashew': 'Ready for harvest in 2-3 months'
  };
  
  return harvestTimes[crop] || 'Check harvest timing';
}

function getSellingSuggestions(crop: string, location: string): string[] {
  const suggestions: Record<string, string[]> = {
    'Paddy': ['Sell at Kottayam market', 'Check MSP rates', 'Consider storage'],
    'Rice': ['Sell at Kottayam market', 'Check MSP rates', 'Consider storage'],
    'Coconut': ['Sell at local market', 'Check wholesale rates', 'Consider processing'],
    'Banana': ['Sell fresh at market', 'Check transport costs', 'Consider ripening'],
    'Rubber': ['Sell to rubber board', 'Check international rates', 'Consider processing'],
    'Pepper': ['Sell at spice market', 'Check export rates', 'Consider storage'],
    'Cardamom': ['Sell at spice market', 'Check export rates', 'Consider processing'],
    'Ginger': ['Sell at vegetable market', 'Check processing rates', 'Consider storage'],
    'Turmeric': ['Sell at spice market', 'Check processing rates', 'Consider storage'],
    'Cashew': ['Sell at cashew market', 'Check processing rates', 'Consider export']
  };
  
  return suggestions[crop] || ['Sell at local market', 'Check market rates', 'Consider storage'];
}
