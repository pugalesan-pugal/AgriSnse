"use client";

import { useMemo, useState } from "react";
import Sidebar from "./components/Sidebar";
import ProfilingForm from "./components/ProfilingForm";
import ChatModule from "./components/ChatModule";
import ActivityModule from "./components/ActivityModule";
import LandManagement from "./components/LandManagement";
import RightPanels from "./components/RightPanels";
import { Land } from "./components/types";

export type ModuleKey = "profiling" | "chat" | "land" | "activities";

export default function DashboardPage() {
  const [activeModule, setActiveModule] = useState<ModuleKey>("profiling");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [lands, setLands] = useState<Land[]>([]);
  const [landToEditId, setLandToEditId] = useState<string | null>(null);

  const MainContent = useMemo(() => {
    switch (activeModule) {
      case "profiling":
        return <ProfilingForm />;
      case "chat":
        return <ChatModule />;
      case "land":
        return (
          <LandManagement
            lands={lands}
            landToEditId={landToEditId}
            onUpsert={(entry, editingId) => {
              setLands((prev) => {
                if (editingId) {
                  return prev.map((l) => (l.id === editingId ? entry : l));
                }
                return [entry, ...prev];
              });
            }}
            clearEdit={() => setLandToEditId(null)}
          />
        );
      case "activities":
        return <ActivityModule />;
      default:
        return null;
    }
  }, [activeModule, lands, landToEditId]);

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
          className="w-full md:w-[58%] bg-white rounded-xl shadow-sm border border-neutral-200 p-4 md:p-6 overflow-y-auto transition-all duration-300 ease-out"
        >
          {MainContent}
        </section>

        <aside className="w-full md:w-[42%] flex flex-col gap-4 md:gap-6">
          <RightPanels />
        </aside>
      </div>
    </div>
  );
}


