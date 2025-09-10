"use client";

import { useEffect, useState } from "react";
import { useLand } from "../contexts/LandContext";
import { useLanguage } from "@/contexts/LanguageContext";

interface Alert {
  id: string;
  title: string;
  message: string;
  type: string;
  priority: 'high' | 'medium' | 'low';
  dueDate?: string;
}

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
    <div className={`rounded-2xl border p-6 shadow-lg bg-gradient-to-br ${colorClasses[color]} hover:shadow-xl transition-all duration-300 hover:scale-[1.02] h-full flex flex-col`}>
      <div className="flex items-center gap-3 mb-4 flex-shrink-0">
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
      <div className="space-y-3 flex-1 min-h-0 flex flex-col">
        {children}
      </div>
    </div>
  );
}

export default function AlertsPanel() {
  const { activeLandId } = useLand();
  const { language } = useLanguage();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [alertsError, setAlertsError] = useState<string | null>(null);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);
  const [userCode, setUserCode] = useState<string | null>(null);

  // Load user code for Ollama context
  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem("agrisense.user") : null;
      if (raw) setUserCode(JSON.parse(raw)?.code ?? null);
    } catch {}
  }, []);

  // Fetch alerts via dedicated API
  useEffect(() => {
    if (!activeLandId) {
      setAlerts([]);
      return;
    }
    (async () => {
      setAlertsLoading(true);
      setAlertsError(null);
      try {
        console.log("Sending alerts request:", { userCode, landId: activeLandId, language });
        const resp = await fetch("/api/alerts/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userCode,
            landId: activeLandId,
            language,
          }),
        });
        let data;
        try {
          data = await resp.json();
        } catch (jsonError) {
          console.error("Failed to parse JSON response:", jsonError);
          const text = await resp.text();
          console.error("Response text:", text);
          throw new Error("Invalid response format from alerts API");
        }
        if (!resp.ok) {
          console.error("Alerts API error:", data);
          throw new Error(data.error || "Failed to generate alerts");
        }
        
        setAlerts(data.alerts || []);
        setLastRefreshTime(new Date());
      } catch (e) {
        setAlertsError(e instanceof Error ? e.message : String(e));
      } finally {
        setAlertsLoading(false);
      }
    })();
  }, [activeLandId, language]);

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
      case 'irrigation': return '💧';
      case 'harvest': return '🌾';
      case 'pest': return '🐛';
      case 'equipment': return '⚙️';
      case 'soil': return '🌍';
      case 'water': return '💦';
      default: return 'ℹ️';
    }
  };

  return (
    <Panel title="Reminders & Alerts" icon="🔔" color="rose">
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2 text-sm font-medium text-rose-700">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {language === "ml" ? "AI സൃഷ്ടിച്ച അലേർട്ടുകൾ" : "AI-Generated Alerts"}
          {lastRefreshTime && (
            <span className="text-xs text-rose-500 ml-2">
              ({language === "ml" ? "അവസാനം പുതുക്കിയത്:" : "Last updated:"} {lastRefreshTime.toLocaleTimeString()})
            </span>
          )}
        </div>
        <button
          onClick={() => {
            if (!activeLandId) return;
            setAlertsLoading(true);
            setAlertsError(null);
            (async () => {
              try {
                console.log("Sending refresh alerts request:", { userCode, landId: activeLandId, language });
                const resp = await fetch("/api/alerts/generate", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    userCode,
                    landId: activeLandId,
                    language,
                  }),
                });
                let data;
                try {
                  data = await resp.json();
                } catch (jsonError) {
                  console.error("Failed to parse JSON response:", jsonError);
                  const text = await resp.text();
                  console.error("Response text:", text);
                  throw new Error("Invalid response format from alerts API");
                }
                if (!resp.ok) {
                  console.error("Refresh alerts API error:", data);
                  throw new Error(data.error || "Failed to generate alerts");
                }
                
                setAlerts(data.alerts || []);
                setLastRefreshTime(new Date());
              } catch (e) {
                setAlertsError(e instanceof Error ? e.message : String(e));
              } finally {
                setAlertsLoading(false);
              }
            })();
          }}
          disabled={alertsLoading}
          className="p-2 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          title={language === "ml" ? "അലേർട്ടുകൾ പുതുക്കുക" : "Refresh alerts"}
        >
          <svg className={`w-4 h-4 ${alertsLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>
      
      {alertsLoading && (
        <div className="p-4 rounded-xl bg-white/60 border border-rose-200 flex items-center gap-3 flex-shrink-0">
          <svg className="w-5 h-5 text-rose-600 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span className="text-sm text-rose-700">{language === "ml" ? "അലേർട്ടുകൾ സൃഷ്ടിക്കുന്നു..." : "Generating alerts..."}</span>
        </div>
      )}
      
      {alertsError && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-center gap-3 flex-shrink-0">
          <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm text-red-700">{alertsError}</span>
        </div>
      )}
      
      {!alertsLoading && !alertsError && alerts.length === 0 && (
        <div className="p-4 rounded-xl bg-white/60 border border-rose-200 text-center flex-shrink-0">
          <svg className="w-8 h-8 text-rose-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm text-rose-600">
            {language === "ml" ? "AI അലേർട്ടുകൾ ലഭിക്കാൻ റിഫ്രഷ് ബട്ടൺ ക്ലിക്ക് ചെയ്യുക" : "Click refresh button to get AI alerts"}
          </span>
        </div>
      )}
      
      <div className="space-y-2 flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-rose-300 scrollbar-track-rose-100 min-h-0">
        {alerts.map((alert, index) => (
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
        ))}
      </div>
    </Panel>
  );
}
