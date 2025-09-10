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

export default function KnowledgeEnginePanel() {
  const { activeLandId } = useLand();
  const { t, language } = useLanguage();
  const [tips, setTips] = useState<string[]>([]);
  const [kgLoading, setKgLoading] = useState(false);
  const [kgError, setKgError] = useState<string | null>(null);
  const [location, setLocation] = useState<string>("");
  const [userCode, setUserCode] = useState<string | null>(null);

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

  // Get user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setLocation(`${latitude.toFixed(2)}, ${longitude.toFixed(2)}`);
        },
        () => setLocation(language === "ml" ? "സ്ഥാനം കണ്ടെത്താൻ കഴിഞ്ഞില്ല" : "Location not available")
      );
    } else {
      setLocation(language === "ml" ? "സ്ഥാനം പിന്തുണയ്ക്കുന്നില്ല" : "Location not supported");
    }
  }, [language]);

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
            message: `Generate 3 short, land-specific knowledge tips as bullet points. Base on crop, soil, irrigation, recent activities, weather, and market conditions for this land. Keep each tip concise (1-2 lines max). Respond in ${language === "ml" ? "Malayalam" : "English"} only.`,
          }),
        });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.error || "Failed to generate knowledge tips");
        
        // Parse tips from response
        const responseText = data.response || "";
        const tipLines = responseText
          .split('\n')
          .filter((line: string) => line.trim().startsWith('-') || line.trim().startsWith('•'))
          .map((line: string) => line.replace(/^[-•]\s*/, '').trim())
          .filter((tip: string) => tip.length > 0)
          .slice(0, 3);
        
        setTips(tipLines.length > 0 ? tipLines : [
          language === "ml" ? "ഇന്നത്തെ കാർഷിക നുറുങ്ങുകൾ ലഭിക്കുന്നു..." : "Getting today's farming tips...",
          language === "ml" ? "നിങ്ങളുടെ ഭൂമിയുടെ വിവരങ്ങൾ അപ്ഡേറ്റ് ചെയ്യുക" : "Update your land information",
          language === "ml" ? "മാർക്കറ്റ് വിലകൾ പരിശോധിക്കുക" : "Check market prices"
        ]);
      } catch (e) {
        setKgError(e instanceof Error ? e.message : String(e));
        setTips([
          language === "ml" ? "ഇന്നത്തെ കാർഷിക നുറുങ്ങുകൾ ലഭിക്കുന്നു..." : "Getting today's farming tips...",
          language === "ml" ? "നിങ്ങളുടെ ഭൂമിയുടെ വിവരങ്ങൾ അപ്ഡേറ്റ് ചെയ്യുക" : "Update your land information",
          language === "ml" ? "മാർക്കറ്റ് വിലകൾ പരിശോധിക്കുക" : "Check market prices"
        ]);
      } finally {
        setKgLoading(false);
      }
    })();
  }, [userCode, activeLandId, language]);

  return (
    <Panel title={t("knowledgeEngine")} icon="🧠" color="purple">
      <div className="space-y-4 flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-purple-300 scrollbar-track-purple-100 min-h-0">
        {/* Location & Time Info */}
        <div className="grid grid-cols-1 gap-3 flex-shrink-0">
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
              <div className="text-sm font-medium text-purple-900">{language === "ml" ? "മാസം" : "Month"}</div>
              <div className="text-xs text-purple-600">{month}</div>
            </div>
          </div>
        </div>

        {/* AI Knowledge Tips */}
        <div className="space-y-3 flex-1 min-h-0">
          <div className="flex items-center gap-2 text-sm font-medium text-purple-700 flex-shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            {language === "ml" ? "AI കാർഷിക നുറുങ്ങുകൾ" : "AI Farming Tips"}
            {kgLoading && (
              <svg className="w-4 h-4 animate-spin text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
          </div>
          
          {kgError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-center gap-3 flex-shrink-0">
              <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-xs text-red-700">{kgError}</span>
            </div>
          )}
          
          <div className="space-y-2 flex-1 overflow-y-auto min-h-0">
            {tips.map((tip, index) => (
              <div 
                key={index} 
                className="group p-3 rounded-xl bg-white/60 border border-purple-200 hover:bg-white/80 transition-all duration-200 hover:scale-[1.02]"
                style={{ animationDelay: `${index * 150}ms` }}
              >
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-purple-500 mt-2 flex-shrink-0" />
                  <div className="text-sm text-purple-900 leading-relaxed">{tip}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Panel>
  );
}
