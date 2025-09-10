import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log("Alerts API received:", { userCode: body.userCode, landId: body.landId, language: body.language });
    
    const { userCode, landId, language = "en" } = body;

    if (!landId) {
      console.log("Missing required field:", { landId });
      return NextResponse.json({ error: "Missing landId" }, { status: 400 });
    }

    // Generate dynamic alerts based on current context
    const alerts = generateDynamicAlerts(language);

    return NextResponse.json({ 
      alerts,
      timestamp: new Date().toISOString(),
      source: "dynamic-generation"
    });

  } catch (error: any) {
    console.error("Error generating alerts:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function generateDynamicAlerts(language: string) {
  const now = new Date();
  const alerts = [];
  
  // Define alert templates with variety
  const alertTemplates = [
    {
      type: "fertilizer",
      titles: {
        en: ["Fertilizer Application Due", "NPK Application Required", "Soil Nutrition Check"],
        ml: ["വള പ്രയോഗം", "NPK വളം", "മണ്ണ് പോഷകാഹാരം"]
      },
      messages: {
        en: [
          "Apply NPK 20-20-20 fertilizer in 2-3 days for optimal growth",
          "Time for second round of fertilizer application based on crop calendar",
          "Check soil pH and apply lime if needed before next fertilizer"
        ],
        ml: [
          "ഉയർന്ന വളർച്ചയ്ക്ക് 2-3 ദിവസത്തിനുള്ളിൽ NPK 20-20-20 വളം പ്രയോഗിക്കുക",
          "ക്രോപ്പ് കലണ്ടറിനെ അടിസ്ഥാനമാക്കി രണ്ടാം റൗണ്ട് വളം പ്രയോഗിക്കാനുള്ള സമയം",
          "അടുത്ത വളം പ്രയോഗിക്കുന്നതിന് മുമ്പ് മണ്ണിന്റെ pH പരിശോധിച്ച് ആവശ്യമെങ്കിൽ ചുണ്ണാമ്പ് പ്രയോഗിക്കുക"
        ]
      },
      priorities: ["high", "medium", "low"]
    },
    {
      type: "irrigation",
      titles: {
        en: ["Water Level Check", "Irrigation Schedule", "Drip System Maintenance"],
        ml: ["ജലനിരപ്പ് പരിശോധന", "ജലസേചന ഷെഡ്യൂൾ", "ഡ്രിപ്പ് സിസ്റ്റം പരിപാലനം"]
      },
      messages: {
        en: [
          "Check soil moisture levels - irrigation may be needed in 1-2 days",
          "Clean drip irrigation filters and check for blockages",
          "Adjust irrigation timing based on weather forecast"
        ],
        ml: [
          "മണ്ണിന്റെ ഈർപ്പം പരിശോധിക്കുക - 1-2 ദിവസത്തിനുള്ളിൽ ജലസേചനം ആവശ്യമായി വരാം",
          "ഡ്രിപ്പ് ജലസേചന ഫിൽട്ടറുകൾ വൃത്തിയാക്കുകയും തടസ്സങ്ങൾ പരിശോധിക്കുകയും ചെയ്യുക",
          "കാലാവസ്ഥാ പ്രവചനത്തെ അടിസ്ഥാനമാക്കി ജലസേചന സമയം ക്രമീകരിക്കുക"
        ]
      },
      priorities: ["medium", "high", "low"]
    },
    {
      type: "pest",
      titles: {
        en: ["Pest Control Alert", "Neem Spray Required", "Disease Prevention"],
        ml: ["കീടനിയന്ത്രണ അലേർട്ട്", "വേപ്പ് സ്പ്രേ ആവശ്യം", "രോഗ പ്രതിരോധം"]
      },
      messages: {
        en: [
          "Apply neem oil spray to prevent aphid infestation - weather conditions are favorable",
          "Check for early signs of fungal diseases after recent rains",
          "Install yellow sticky traps for monitoring pest population"
        ],
        ml: [
          "ആഫിഡ് ബാധ തടയാൻ വേപ്പ് എണ്ണ സ്പ്രേ പ്രയോഗിക്കുക - കാലാവസ്ഥാ സാഹചര്യങ്ങൾ അനുകൂലമാണ്",
          "സമീപകാല മഴയ്ക്ക് ശേഷം ഫംഗസ് രോഗങ്ങളുടെ ആദ്യ ലക്ഷണങ്ങൾ പരിശോധിക്കുക",
          "കീട ജനസംഖ്യ നിരീക്ഷിക്കാൻ മഞ്ഞ കുറ്റി ട്രാപ്പുകൾ ഇൻസ്റ്റാൾ ചെയ്യുക"
        ]
      },
      priorities: ["high", "medium", "high"]
    },
    {
      type: "harvest",
      titles: {
        en: ["Harvest Preparation", "Harvest Timing Alert", "Post-Harvest Planning"],
        ml: ["വിളവെടുപ്പ് തയ്യാറാക്കൽ", "വിളവെടുപ്പ് സമയ അലേർട്ട്", "വിളവെടുപ്പിന് ശേഷം ആസൂത്രണം"]
      },
      messages: {
        en: [
          "Prepare harvesting tools and containers - harvest window opens in 5-7 days",
          "Check crop maturity indicators before final harvest decision",
          "Arrange storage facilities and transportation for harvested produce"
        ],
        ml: [
          "വിളവെടുപ്പ് ഉപകരണങ്ങളും കണ്ടെയ്നറുകളും തയ്യാറാക്കുക - 5-7 ദിവസത്തിനുള്ളിൽ വിളവെടുപ്പ് വിൻഡോ തുറക്കും",
          "അവസാന വിളവെടുപ്പ് തീരുമാനത്തിന് മുമ്പ് ക്രോപ്പ് പക്വത സൂചകങ്ങൾ പരിശോധിക്കുക",
          "വിളവെടുത്ത ഉൽപ്പന്നങ്ങൾക്കായി സംഭരണ സൗകര്യങ്ങളും ഗതാഗതവും ക്രമീകരിക്കുക"
        ]
      },
      priorities: ["medium", "high", "low"]
    },
    {
      type: "market",
      titles: {
        en: ["Price Alert", "Market Opportunity", "Selling Window"],
        ml: ["വില അലേർട്ട്", "വിപണി അവസരം", "വിൽപ്പന വിൻഡോ"]
      },
      messages: {
        en: [
          "Rice prices increased by 12% at Kottayam market - consider selling",
          "Pepper prices showing upward trend - monitor for best selling time",
          "Coconut prices stable - good time for bulk selling if ready"
        ],
        ml: [
          "കോട്ടയം വിപണിയിൽ അരി വില 12% വർദ്ധിച്ചു - വിൽപ്പന പരിഗണിക്കുക",
          "കുരുമുളക് വില ഉയർന്നുവരുന്ന പ്രവണത കാണിക്കുന്നു - മികച്ച വിൽപ്പന സമയത്തിനായി നിരീക്ഷിക്കുക",
          "തെങ്ങ് വില സ്ഥിരമാണ് - തയ്യാറാണെങ്കിൽ ബൾക്ക് വിൽപ്പനയ്ക്ക് നല്ല സമയം"
        ]
      },
      priorities: ["high", "medium", "low"]
    },
    {
      type: "government",
      titles: {
        en: ["Scheme Deadline", "Subsidy Application", "Government Update"],
        ml: ["സ്കീം ഡെഡ്ലൈൻ", "സബ്സിഡി അപേക്ഷ", "സർക്കാർ അപ്ഡേറ്റ്"]
      },
      messages: {
        en: [
          "PM-KISAN scheme registration closes on 30th - apply on Agri portal",
          "Soil Health Card renewal due - submit documents by month-end",
          "Crop insurance premium payment deadline approaching"
        ],
        ml: [
          "PM-KISAN സ്കീം രജിസ്ട്രേഷൻ 30ന് അവസാനിക്കും - Agri പോർട്ടലിൽ അപേക്ഷിക്കുക",
          "മണ്ണ് ആരോഗ്യ കാർഡ് പുനരാരംഭിക്കൽ അവസാനിച്ചു - മാസാവസാനത്തോടെ രേഖകൾ സമർപ്പിക്കുക",
          "ക്രോപ്പ് ഇൻഷുറൻസ് പ്രീമിയം പേയ്മെന്റ് ഡെഡ്ലൈൻ അടുത്തുവരുന്നു"
        ]
      },
      priorities: ["high", "medium", "high"]
    }
  ];

  // Generate 4-5 random alerts
  const numAlerts = Math.floor(Math.random() * 2) + 4; // 4-5 alerts
  const usedTypes = new Set();
  
  for (let i = 0; i < numAlerts; i++) {
    let template;
    let attempts = 0;
    
    // Try to get a unique type, but allow repeats if we've used all types
    do {
      template = alertTemplates[Math.floor(Math.random() * alertTemplates.length)];
      attempts++;
    } while (usedTypes.has(template.type) && attempts < 10);
    
    usedTypes.add(template.type);
    
    const titleIndex = Math.floor(Math.random() * template.titles[language].length);
    const messageIndex = Math.floor(Math.random() * template.messages[language].length);
    const priorityIndex = Math.floor(Math.random() * template.priorities.length);
    
    const title = template.titles[language][titleIndex];
    const message = template.messages[language][messageIndex];
    const priority = template.priorities[priorityIndex] as 'high' | 'medium' | 'low';
    
    // Generate due date
    const daysFromNow = Math.floor(Math.random() * 7) + 1; // 1-7 days
    const dueDate = new Date(now.getTime() + daysFromNow * 24 * 60 * 60 * 1000);
    
    alerts.push({
      id: `alert-${Date.now()}-${i}`,
      type: template.type,
      title,
      message,
      priority,
      dueDate: dueDate.toLocaleDateString(language === "ml" ? "ml-IN" : "en-IN"),
      timestamp: now.toISOString()
    });
  }
  
  return alerts;
}