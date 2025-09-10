"use client";

import { useMemo, useState, useEffect } from "react";
import { LandProvider, useLand } from "./contexts/LandContext";
import Sidebar from "./components/Sidebar";
import ProfilingForm from "./components/ProfilingForm";
import ChatModule from "./components/ChatModule";
import ActivityModule from "./components/ActivityModule";
import LandManagement from "./components/LandManagement";
import RightPanels from "./components/RightPanels";
import MarketInsights from "./components/MarketInsights";
import ActiveLandDisplay from "./components/ActiveLandDisplay";
import { Land } from "./components/types";
import AlertsModule from "./components/AlertsModule";
import SchemesModule from "./components/SchemesModule";
import LanguageSelector from "@/components/LanguageSelector";

export type ModuleKey = "profiling" | "chat" | "land" | "activities" | "market" | "alerts" | "schemes";

function DashboardContent() {
  const [activeModule, setActiveModule] = useState<ModuleKey>("profiling");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isRightCollapsed, setIsRightCollapsed] = useState<boolean>(false);
  const [landToEditId, setLandToEditId] = useState<string | null>(null);
  const { lands, activeLandId, setActiveLandId, refreshLands } = useLand();

  const MainContent = useMemo(() => {
    switch (activeModule) {
      case "profiling":
        return (
          <ProfilingForm 
            onNavigateToLandManagement={() => setActiveModule("land")}
          />
        );
      case "chat":
        return <ChatModule />;
      case "land":
        return (
          <LandManagement
            landToEditId={landToEditId}
            clearEdit={() => setLandToEditId(null)}
          />
        );
      case "activities":
        return <ActivityModule />;
      case "market":
        return <MarketInsights />;
      case "alerts":
        return <AlertsModule />;
      case "schemes":
        return <SchemesModule />;
      default:
        return null;
    }
  }, [activeModule, lands, landToEditId, activeLandId]);

  return (
    <div className="h-screen w-full bg-neutral-50 text-neutral-900 flex overflow-hidden">
      <Sidebar
        active={activeModule}
        onSelect={setActiveModule}
        collapsed={isSidebarCollapsed}
        onToggle={() => setIsSidebarCollapsed((v) => !v)}
      />

      <div className={`flex-1 flex flex-col md:flex-row gap-4 md:gap-6 p-4 md:p-6 transition-all duration-500 ease-out h-full overflow-hidden ${
        isSidebarCollapsed ? "ml-0" : ""
      }`}>
        {/* Language Selector */}
        <div className="absolute top-4 right-4 z-20">
          <LanguageSelector size="sm" showLabel={true} />
        </div>
        
        {/* Main Content Section */}
        <section
          className={`${
            isRightCollapsed 
              ? "w-full md:flex-1" 
              : "w-full md:flex-1 lg:w-[60%] xl:w-[65%]"
          } rounded-xl shadow-sm border border-emerald-200 p-0 transition-all duration-500 ease-out bg-gradient-to-br from-emerald-50 to-white hover:from-emerald-100 hover:to-emerald-50 animate-fade-up hover-lift flex flex-col h-full overflow-hidden`}
        >
          <div className="p-4 md:p-6 flex-shrink-0">
            <ActiveLandDisplay />
          </div>
          <div className="flex-1 min-h-0 overflow-hidden">
            {MainContent}
          </div>
        </section>

        {/* Right Panel */}
        <aside className={`${
          isRightCollapsed 
            ? "md:w-[28px]" 
            : "w-full md:w-[40%] lg:w-[35%] xl:w-[30%]"
        } relative transition-all duration-500 ease-out h-full overflow-hidden`}>
          {/* Toggle handle */}
          <button
            aria-label={isRightCollapsed ? "Expand right panel" : "Collapse right panel"}
            onClick={() => setIsRightCollapsed((v) => !v)}
            className={`absolute top-4 -left-3 z-10 h-10 w-6 rounded-r-md border ${isRightCollapsed ? "bg-emerald-700 border-emerald-600 text-white" : "bg-emerald-600 border-emerald-500 text-white"} shadow-sm hover:brightness-110 animate-slide-in-right animate-pulse-soft`}
            title={isRightCollapsed ? "Show Reminders & Knowledge" : "Hide Reminders & Knowledge"}
          >
            {isRightCollapsed ? "←" : "→"}
          </button>

          {!isRightCollapsed && (
            <div className="flex flex-col gap-4 md:gap-6 bg-gradient-to-b from-emerald-800/20 via-emerald-700/10 to-emerald-600/20 rounded-xl p-2 animate-slide-in-right hover-lift h-full overflow-y-auto scrollbar-thin scrollbar-thumb-emerald-300 scrollbar-track-emerald-100">
              <RightPanels />
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <LandProvider>
      <DashboardContent />
    </LandProvider>
  );
}


