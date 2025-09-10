"use client";

import AlertsPanel from "./AlertsPanel";
import KnowledgeEnginePanel from "./KnowledgeEnginePanel";

export default function RightPanels() {
  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Reminders & Alerts Panel */}
      <div className="flex-1 min-h-0">
        <AlertsPanel />
      </div>

      {/* Knowledge Engine Panel */}
      <div className="flex-1 min-h-0">
        <KnowledgeEnginePanel />
      </div>
    </div>
  );
}