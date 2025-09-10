"use client";

import { ModuleKey } from "../page";
import { useLanguage } from "@/contexts/LanguageContext";

type Props = {
  active: ModuleKey;
  onSelect: (k: ModuleKey) => void;
  collapsed: boolean;
  onToggle: () => void;
};

const menuItems = [
  { key: "profiling" as ModuleKey, icon: "👤", color: "amber", label: "farmerProfiling" },
  { key: "chat" as ModuleKey, icon: "💬", color: "sky", label: "chat" },
  { key: "land" as ModuleKey, icon: "🌾", color: "lime", label: "landManagement" },
  { key: "activities" as ModuleKey, icon: "📅", color: "amber", label: "activityTracking" },
  { key: "market" as ModuleKey, icon: "📈", color: "emerald", label: "marketInsights" },
  { key: "schemes" as ModuleKey, icon: "🏛️", color: "blue", label: "governmentSchemes" },
  { key: "alerts" as ModuleKey, icon: "🔔", color: "rose", label: "remindersAlerts" },
];

export default function Sidebar({ active, onSelect, collapsed, onToggle }: Props) {
  const { t, language } = useLanguage();
  return (
    <nav
      className={`h-screen sticky top-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white shadow-2xl border-r border-slate-700/50 flex flex-col transition-all duration-500 ease-out ${
        collapsed ? "w-[80px]" : "w-[280px]"
      }`}
    >
      {/* Header */}
      <div className={`border-b border-slate-700/50 ${collapsed ? "p-3" : "p-6"}`}>
        <div className={`flex items-center ${collapsed ? "justify-center" : "justify-between"}`}>
          {!collapsed && (
            <div className="flex items-center gap-3 transition-all duration-300">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Krishi Sakhi</h1>
                <p className="text-xs text-slate-400">AI Farming Assistant</p>
              </div>
            </div>
          )}
          
          {collapsed && (
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
          )}
          
        <button
          aria-label="Toggle sidebar"
            onClick={() => {
              console.log('Toggle button clicked, current collapsed state:', collapsed);
              onToggle();
            }}
            className={`rounded-xl bg-slate-700/50 hover:bg-slate-600/70 border border-slate-500/50 hover:border-slate-400/70 transition-all duration-200 hover:scale-110 shadow-lg ${
              collapsed ? "p-2" : "p-3"
            }`}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <svg className={`w-6 h-6 transition-transform duration-300 ${collapsed ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
        </button>
        </div>
      </div>


      {/* Navigation Menu */}
      <div className={`flex-1 py-6 space-y-3 ${collapsed ? "px-2" : "px-4"} overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800`}>
        {menuItems.map((item, index) => {
          const isActive = active === item.key;
          const colorClasses = {
            amber: "bg-amber-500 text-amber-100",
            sky: "bg-sky-500 text-sky-100", 
            lime: "bg-lime-500 text-lime-100",
            emerald: "bg-emerald-500 text-emerald-100",
            blue: "bg-blue-500 text-blue-100",
            rose: "bg-rose-500 text-rose-100"
          };
          
          return (
        <button
              key={item.key}
              onClick={() => onSelect(item.key)}
              className={`group relative w-full flex items-center ${
                collapsed 
                  ? "justify-center px-2 py-3" 
                  : "gap-4 px-4 py-3"
              } rounded-xl transition-all duration-300 hover:scale-[1.02] ${
                isActive 
                  ? `${colorClasses[item.color as keyof typeof colorClasses]} shadow-lg shadow-${item.color}-500/25` 
                  : "hover:bg-slate-700/50 text-slate-300 hover:text-white"
              }`}
              style={{ animationDelay: `${index * 100}ms` }}
              title={collapsed ? t(item.label) : undefined}
            >
              {/* Icon */}
              <div className={`${
                collapsed ? "w-12 h-12" : "w-10 h-10"
              } rounded-lg flex items-center justify-center text-lg transition-all duration-300 ${
                isActive 
                  ? "bg-white/20 scale-110" 
                  : "bg-slate-700/50 group-hover:bg-slate-600/50"
              }`}>
                {item.icon}
              </div>
              
              {/* Label */}
              <span className={`font-medium transition-all duration-300 ${
                collapsed ? "opacity-0 scale-0 w-0" : "opacity-100 scale-100"
              }`}>
                {t(item.label)}
              </span>
              
              {/* Active indicator */}
              {isActive && (
                <div className={`absolute ${
                  collapsed ? "right-1 top-1" : "right-2"
                } w-2 h-2 bg-white rounded-full animate-pulse`} />
              )}
              
              {/* Hover effect */}
              <div className={`absolute inset-0 rounded-xl transition-opacity duration-300 ${
                isActive ? "opacity-0" : "opacity-0 group-hover:opacity-100"
              } bg-gradient-to-r from-white/5 to-transparent`} />
        </button>
          );
        })}
      </div>

      {/* Footer */}
      <div className={`border-t border-slate-700/50 ${collapsed ? "p-2" : "p-4"}`}>
        {!collapsed && (
          <button
            onClick={() => {
              try {
                localStorage.removeItem("agrisense.user");
                localStorage.removeItem("agrisense.activeLandId");
                localStorage.removeItem("agrisense.market.state");
                localStorage.removeItem("agrisense.market.commodity");
                localStorage.removeItem("agrisense.market.cache");
              } catch {}
              window.location.href = "/login";
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800 transition-all duration-200 hover:scale-[1.02] shadow-lg"
            aria-label="Logout"
            title="Logout"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="font-medium">{t("logout")}</span>
          </button>
        )}
        
        {collapsed && (
          <button
            onClick={() => {
              try {
                localStorage.removeItem("agrisense.user");
                localStorage.removeItem("agrisense.activeLandId");
                localStorage.removeItem("agrisense.market.state");
                localStorage.removeItem("agrisense.market.commodity");
                localStorage.removeItem("agrisense.market.cache");
              } catch {}
              window.location.href = "/login";
            }}
            className="w-full p-3 rounded-xl bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800 transition-all duration-200 hover:scale-105 shadow-lg flex items-center justify-center"
            aria-label="Logout"
            title="Logout"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        )}
        
        <div className={`mt-4 text-center transition-all duration-300 ${collapsed ? "opacity-0 scale-0" : "opacity-100 scale-100"}`}>
          <div className="text-xs text-slate-400 font-medium">Krishi Sakhi v1.0</div>
          <div className="text-xs text-slate-500 mt-1">AI-Powered Farming Assistant</div>
        </div>
      </div>
    </nav>
  );
}


