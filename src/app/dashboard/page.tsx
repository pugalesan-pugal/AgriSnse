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

export type ModuleKey = "profiling" | "chat" | "land" | "activities" | "market" | "alerts";

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
      default:
        return null;
    }
  }, [activeModule, lands, landToEditId, activeLandId]);

  return (
    <div className="min-h-screen w-full bg-neutral-50 text-neutral-900 flex overflow-hidden">
      <Sidebar
        active={activeModule}
        onSelect={setActiveModule}
        collapsed={isSidebarCollapsed}
        onToggle={() => setIsSidebarCollapsed((v) => !v)}
        lands={lands}
        onPickLand={(id) => {
          setActiveModule("land");
          setLandToEditId(id);
        }}
      />

      <div className="flex-1 flex flex-col md:flex-row gap-4 md:gap-6 p-4 md:p-6 transition-all duration-300 ease-out">
        <section
          className={`${isRightCollapsed ? "w-full md:flex-1" : "w-full md:w-[58%]"} rounded-xl shadow-sm border border-emerald-200 p-4 md:p-6 overflow-y-auto transition-all duration-500 ease-out bg-gradient-to-br from-emerald-50 to-white hover:from-emerald-100 hover:to-emerald-50 animate-fade-up hover-lift`}
        >
          <ActiveLandDisplay />
          {MainContent}
        </section>

        <aside className={`${isRightCollapsed ? "md:w-[28px]" : "w-full md:w-[42%]"} relative transition-all duration-500 ease-out`}>
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
            <div className="flex flex-col gap-4 md:gap-6 bg-gradient-to-b from-emerald-800/20 via-emerald-700/10 to-emerald-600/20 rounded-xl p-2 animate-slide-in-right hover-lift">
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


