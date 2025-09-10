"use client";

import { useEffect, useMemo, useState } from "react";
import { useLand } from "../contexts/LandContext";
import { useLanguage } from "@/contexts/LanguageContext";

function Panel({ title, children, icon, color = "emerald" }: { 
  title: string; 
  children: React.ReactNode; 
  icon?: string;
  color?: "emerald" | "blue" | "purple" | "amber" | "rose";
}) {
  const colorClasses = {
    emerald: "from-emerald-50 to-emerald-100 border-emerald-200 text-emerald-900",
    blue: "from-blue-50 to-blue-100 border-blue-200 text-blue-900",
    purple: "from-purple-50 to-purple-100 border-purple-200 text-purple-900",
    amber: "from-amber-50 to-amber-100 border-amber-200 text-amber-900",
    rose: "from-rose-50 to-rose-100 border-rose-200 text-rose-900"
  };
  
  const iconColorClasses = {
    emerald: "bg-emerald-500 text-emerald-100",
    blue: "bg-blue-500 text-blue-100",
    purple: "bg-purple-500 text-purple-100",
    amber: "bg-amber-500 text-amber-100",
    rose: "bg-rose-500 text-rose-100"
  };

  return (
    <div className={`rounded-2xl border p-6 shadow-lg bg-gradient-to-br ${colorClasses[color]} hover:shadow-xl transition-all duration-300 hover:scale-[1.02]`}>
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconColorClasses[color]} shadow-md`}>
          {icon ? (
            <span className="text-lg">{icon}</span>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
        </div>
        <div>
          <h3 className="text-lg font-bold">{title}</h3>
          <div className="w-12 h-1 rounded-full bg-gradient-to-r from-current to-transparent opacity-60" />
        </div>
      </div>
      <div className="space-y-3">
        {children}
      </div>
    </div>
  );
}

export default function RightPanels() {
  const { activeLandId } = useLand();
  const { t, language } = useLanguage();
  const [location, setLocation] = useState<string>("");
  const [weather, setWeather] = useState<string>("");
  const [tips, setTips] = useState<string[]>([]);
  const [kgLoading, setKgLoading] = useState<boolean>(false);
  const [kgError, setKgError] = useState<string | null>(null);
  const [userCode, setUserCode] = useState<string | null>(null);
  
  // Alerts and reminders state
  const [alerts, setAlerts] = useState<Array<{
    id: string;
    type: string;
    title: string;
    message: string;
    priority: 'high' | 'medium' | 'low';
    dueDate?: string;
  }>>([]);
  const [alertsLoading, setAlertsLoading] = useState<boolean>(false);
  const [alertsError, setAlertsError] = useState<string | null>(null);

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => setLocation(`${pos.coords.latitude.toFixed(2)}, ${pos.coords.longitude.toFixed(2)}`),
      () => setLocation(language === "ml" ? "അജ്ഞാതം" : "Unknown")
    );
  }, [language]);

  useEffect(() => {
    // TODO: Replace with real weather API call
    const weatherText = language === "ml" 
      ? "29°C, ഭാഗികമായി മേഘാവൃതം" 
      : "29°C, partly cloudy";
    const t = setTimeout(() => setWeather(weatherText), 500);
    return () => clearTimeout(t);
  }, [language]);

  const month = useMemo(() => {
    const locale = language === "ml" ? "ml-IN" : "en-US";
    return new Date().toLocaleString(locale, { month: "long" });
  }, [language]);

  // Load user code for Ollama context
  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem("agrisense.user") : null;
      if (raw) setUserCode(JSON.parse(raw)?.code ?? null);
    } catch {}
  }, []);

  // Fetch Knowledge Engine tips via Ollama based on profile/land context
  useEffect(() => {
    if (!userCode || !activeLandId) {
      setTips([]);
      return;
    }
    (async () => {
      setKgLoading(true);
      setKgError(null);
      try {
        const resp = await fetch("/api/chat-ollama", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userCode,
            landId: activeLandId,
            language,
            messages: [
              {
                role: "user",
                content: language === "ml" 
                  ? "കേരളത്തിലെ കാർഷിക സാഹചര്യത്തിന് അനുയോജ്യമായ 3 ഹ്രസ്വ, ഭൂമി-നിർദ്ദിഷ്ട അറിവ് ടിപ്പുകൾ ബുള്ളറ്റ് പോയിന്റുകളായി സൃഷ്ടിക്കുക. വിള, മണ്ണ്, ജലസേചനം, സമീപകാല പ്രവർത്തനങ്ങൾ, കാലാവസ്ഥ, മാർക്കറ്റ് എന്നിവയെ അടിസ്ഥാനമാക്കി. ഓരോന്നും 120 അക്ഷരങ്ങൾക്ക് കീഴിൽ. മുൻവിവരണമോ നമ്പറിംഗോ ഇല്ല — വെറും ബുള്ളറ്റുകൾ."
                  : "Generate 3 short, land-specific knowledge tips as bullet points. Base on crop, soil, irrigation, recent activities, weather and market. Keep each under 120 chars. No preface, no numbering — just bullets.",
              },
            ],
            model: "mistral",
          }),
        });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.error || "Failed to generate tips");
        const content: string = data?.message?.content || "";
        const lines = content
          .split(/\n+/)
          .map((s: string) => s.replace(/^[-*]\s*/, "").trim())
          .filter(Boolean);
        setTips(lines.slice(0, 5));
      } catch (e) {
        setKgError(e instanceof Error ? e.message : String(e));
      } finally {
        setKgLoading(false);
      }
    })();
  }, [userCode, activeLandId, language]);

  // Fetch dynamic alerts and reminders via Ollama
  useEffect(() => {
    if (!userCode || !activeLandId) {
      setAlerts([]);
      return;
    }
    (async () => {
      setAlertsLoading(true);
      setAlertsError(null);
      try {
        const resp = await fetch("/api/chat-ollama", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userCode,
            landId: activeLandId,
            language,
            messages: [
              {
                role: "user",
                content: `Generate 3-4 personalized farming reminders and alerts for the current land. Consider:
- Crop calendar and seasonal activities
- Weather conditions and forecasts
- Market opportunities and price alerts
- Government schemes and deadlines
- Soil health and fertilizer schedules
- Pest and disease prevention

Format each alert as: [TYPE] TITLE: MESSAGE (PRIORITY: high/medium/low, DUE: date if applicable)
Types: fertilizer, weather, market, government, health, maintenance
Keep messages concise and actionable. Base on real farming needs for ${language === "ml" ? "Kerala" : "Kerala"} context.`,
              },
            ],
            model: "mistral",
          }),
        });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.error || "Failed to generate alerts");
        const content: string = data?.message?.content || "";
        
        // Parse the generated alerts
        const alertLines = content
          .split(/\n+/)
          .map((s: string) => s.trim())
          .filter(Boolean)
          .filter(line => line.includes('[') && line.includes(']'));
        
        const parsedAlerts = alertLines.slice(0, 4).map((line, index) => {
          // Extract type, title, message, priority, and due date
          const typeMatch = line.match(/\[([^\]]+)\]/);
          const priorityMatch = line.match(/PRIORITY:\s*(high|medium|low)/i);
          const dueMatch = line.match(/DUE:\s*([^)]+)/i);
          
          const type = typeMatch ? typeMatch[1].toLowerCase() : 'info';
          const priority = priorityMatch ? priorityMatch[1].toLowerCase() as 'high' | 'medium' | 'low' : 'medium';
          const dueDate = dueMatch ? dueMatch[1].trim() : undefined;
          
          // Extract title and message
          const colonIndex = line.indexOf(':');
          if (colonIndex === -1) {
            return {
              id: `alert-${Date.now()}-${index}`,
              type,
              title: line.replace(/\[([^\]]+)\]\s*/, '').trim(),
              message: '',
              priority,
              dueDate
            };
          }
          
          const title = line.substring(0, colonIndex).replace(/\[([^\]]+)\]\s*/, '').trim();
          const message = line.substring(colonIndex + 1).replace(/PRIORITY:\s*(high|medium|low)/i, '').replace(/DUE:\s*[^)]+/i, '').trim();
          
          return {
            id: `alert-${Date.now()}-${index}`,
            type,
            title,
            message,
            priority,
            dueDate
          };
        });
        
        setAlerts(parsedAlerts);
      } catch (e) {
        setAlertsError(e instanceof Error ? e.message : String(e));
        // Fallback to basic alerts if Ollama fails
        setAlerts([
          {
            id: 'fallback-1',
            type: 'fertilizer',
            title: language === 'ml' ? 'വള പ്രയോഗം' : 'Fertilizer Application',
            message: language === 'ml' ? '2 ദിവസത്തിനുള്ളിൽ വളം പ്രയോഗിക്കേണ്ടതാണ്' : 'Due in 2 days',
            priority: 'high',
            dueDate: '2 days'
          },
          {
            id: 'fallback-2',
            type: 'market',
            title: language === 'ml' ? 'മാർക്കറ്റ് വില അപ്ഡേറ്റ്' : 'Market Price Update',
            message: language === 'ml' ? 'പാഡി MSP ട്രെൻഡുകൾ ലഭ്യമാണ്' : 'Paddy MSP trends available',
            priority: 'medium'
          }
        ]);
      } finally {
        setAlertsLoading(false);
      }
    })();
  }, [userCode, activeLandId, language]);

  return (
    <div className="flex flex-col gap-6">
      {/* Reminders & Alerts Panel */}
      <Panel title="Reminders & Alerts" icon="🔔" color="rose">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-rose-700">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {language === "ml" ? "AI സൃഷ്ടിച്ച അലേർട്ടുകൾ" : "AI-Generated Alerts"}
          </div>
          
          {alertsLoading && (
            <div className="p-4 rounded-xl bg-white/60 border border-rose-200 flex items-center gap-3">
              <svg className="w-5 h-5 text-rose-600 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="text-sm text-rose-700">{language === "ml" ? "അലേർട്ടുകൾ സൃഷ്ടിക്കുന്നു..." : "Generating alerts..."}</span>
            </div>
          )}
          
          {alertsError && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-center gap-3">
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm text-red-700">{alertsError}</span>
            </div>
          )}
          
          {!alertsLoading && !alertsError && alerts.length === 0 && (
            <div className="p-4 rounded-xl bg-white/60 border border-rose-200 text-center">
              <svg className="w-8 h-8 text-rose-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm text-rose-600">{language === "ml" ? "ഇതുവരെ അലേർട്ടുകൾ ഇല്ല" : "No alerts yet"}</span>
            </div>
          )}
          
          <div className="space-y-2">
            {alerts.map((alert, index) => {
              const getPriorityColor = (priority: string) => {
                switch (priority) {
                  case 'high': return 'bg-red-500';
                  case 'medium': return 'bg-amber-500';
                  case 'low': return 'bg-blue-500';
                  default: return 'bg-gray-500';
                }
              };
              
              const getTypeIcon = (type: string) => {
                switch (type) {
                  case 'fertilizer': return '🌱';
                  case 'weather': return '🌤️';
                  case 'market': return '📈';
                  case 'government': return '🏛️';
                  case 'health': return '🏥';
                  case 'maintenance': return '🔧';
                  default: return 'ℹ️';
                }
              };
              
              return (
                <div 
                  key={alert.id} 
                  className="group p-4 rounded-xl bg-white/60 border border-rose-200 hover:bg-white/80 transition-all duration-200 hover:scale-[1.02]"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${getPriorityColor(alert.priority)} mt-2 ${alert.priority === 'high' ? 'animate-pulse' : ''}`} />
                      <span className="text-lg">{getTypeIcon(alert.type)}</span>
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-rose-900">{alert.title}</div>
                      <div className="text-xs text-rose-600 mt-1">{alert.message}</div>
                      {alert.dueDate && (
                        <div className="text-xs text-rose-500 mt-1">
                          {language === "ml" ? "കാലാവധി:" : "Due:"} {alert.dueDate}
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-rose-500 font-medium capitalize">
                      {alert.priority} {language === "ml" ? "പ്രാധാന്യം" : "Priority"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Panel>

      {/* Knowledge Engine Panel */}
      <Panel title={t("knowledgeEngine")} icon="🧠" color="purple">
        <div className="space-y-4">
          {/* Location & Time Info */}
          <div className="grid grid-cols-1 gap-3">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/60 border border-purple-200">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <div>
                <div className="text-sm font-medium text-purple-900">{t("location")}</div>
                <div className="text-xs text-purple-600">{location || (language === "ml" ? "കണ്ടെത്തുന്നു..." : "Detecting...")}</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/60 border border-purple-200">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <div>
                <div className="text-sm font-medium text-purple-900">{t("month")}</div>
                <div className="text-xs text-purple-600">{month}</div>
              </div>
            </div>
          </div>

          {/* AI Tips Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium text-purple-700">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                {language === "ml" ? "AI സൃഷ്ടിച്ച ഇൻസൈറ്റുകൾ" : "AI-Powered Insights"}
              </div>
              <button
                onClick={() => {
                  if (!userCode || !activeLandId) return;
                  setKgLoading(true);
                  setKgError(null);
                  (async () => {
                    try {
                      const resp = await fetch("/api/chat-ollama", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          userCode,
                          landId: activeLandId,
                          language,
                          messages: [
                            {
                              role: "user",
                              content: language === "ml" 
                                ? "കേരളത്തിലെ കാർഷിക സാഹചര്യത്തിന് അനുയോജ്യമായ 3 ഹ്രസ്വ, ഭൂമി-നിർദ്ദിഷ്ട അറിവ് ടിപ്പുകൾ ബുള്ളറ്റ് പോയിന്റുകളായി സൃഷ്ടിക്കുക. വിള, മണ്ണ്, ജലസേചനം, സമീപകാല പ്രവർത്തനങ്ങൾ, കാലാവസ്ഥ, മാർക്കറ്റ് എന്നിവയെ അടിസ്ഥാനമാക്കി. ഓരോന്നും 120 അക്ഷരങ്ങൾക്ക് കീഴിൽ. മുൻവിവരണമോ നമ്പറിംഗോ ഇല്ല — വെറും ബുള്ളറ്റുകൾ."
                                : "Generate 3 short, land-specific knowledge tips as bullet points. Base on crop, soil, irrigation, recent activities, weather and market. Keep each under 120 chars. No preface, no numbering — just bullets.",
                            },
                          ],
                          model: "mistral",
                        }),
                      });
                      const data = await resp.json();
                      if (!resp.ok) throw new Error(data.error || "Failed to generate tips");
                      const content: string = data?.message?.content || "";
                      const lines = content
                        .split(/\n+/)
                        .map((s: string) => s.replace(/^[-*]\s*/, "").trim())
                        .filter(Boolean);
                      setTips(lines.slice(0, 5));
                    } catch (e) {
                      setKgError(e instanceof Error ? e.message : String(e));
                    } finally {
                      setKgLoading(false);
                    }
                  })();
                }}
                disabled={kgLoading}
                className="p-2 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                title={language === "ml" ? "ടിപ്പുകൾ പുതുക്കുക" : "Refresh tips"}
              >
                <svg className={`w-4 h-4 ${kgLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
            
            {kgLoading && (
              <div className="p-4 rounded-xl bg-white/60 border border-purple-200 flex items-center gap-3">
                <svg className="w-5 h-5 text-purple-600 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="text-sm text-purple-700">{language === "ml" ? "ടിപ്പുകൾ സൃഷ്ടിക്കുന്നു..." : "Generating tips..."}</span>
              </div>
            )}
            
            {kgError && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-center gap-3">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm text-red-700">{kgError}</span>
              </div>
            )}
            
            {!kgLoading && !kgError && tips.length === 0 && (
              <div className="p-4 rounded-xl bg-white/60 border border-purple-200 text-center">
                <svg className="w-8 h-8 text-purple-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <span className="text-sm text-purple-600">{language === "ml" ? "ഇതുവരെ ടിപ്പുകൾ ഇല്ല" : "No tips yet"}</span>
              </div>
            )}
            
            {tips.map((tip, i) => (
              <div key={i} className="group p-4 rounded-xl bg-white/60 border border-purple-200 hover:bg-white/80 transition-all duration-200 hover:scale-[1.01]">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-purple-500 mt-2 flex-shrink-0" />
                  <div className="text-sm text-purple-900 leading-relaxed">{tip}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Panel>
    </div>
  );
}


