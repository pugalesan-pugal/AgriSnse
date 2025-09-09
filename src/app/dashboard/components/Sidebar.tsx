"use client";

import { ModuleKey } from "../page";

type Props = {
  active: ModuleKey;
  onSelect: (k: ModuleKey) => void;
  collapsed: boolean;
  onToggle: () => void;
};

const btnBase =
  "flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm md:text-base transition-colors";

export default function Sidebar({ active, onSelect, collapsed, onToggle }: Props) {
  return (
    <nav
      className={`h-screen sticky top-0 bg-gradient-to-b from-emerald-800 via-emerald-700 to-emerald-600 text-white p-3 md:p-4 flex flex-col gap-3 transition-all duration-300 ease-out ${
        collapsed ? "w-[70px]" : "w-[240px]"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className={`font-semibold tracking-tight ${collapsed ? "hidden" : "block"}`}>
          AgriSense
        </span>
        <button
          aria-label="Toggle sidebar"
          onClick={onToggle}
          className="p-2 rounded-md hover:bg-emerald-600/40 border border-emerald-400/30"
        >
          {collapsed ? "→" : "←"}
        </button>
      </div>

      <div className="mt-2 flex-1 flex flex-col gap-2">
        <button
          className={`${btnBase} ${
            active === "profiling" ? "bg-emerald-950/60 text-white" : "hover:bg-emerald-700/40"
          }`}
          onClick={() => onSelect("profiling")}
        >
          <span className="inline-flex h-2 w-2 rounded-full bg-amber-300" />
          <span className={`${collapsed ? "hidden" : "block"}`}>Farmer & Farm Profiling</span>
        </button>

        <button
          className={`${btnBase} ${
            active === "chat" ? "bg-emerald-950/60 text-white" : "hover:bg-emerald-700/40"
          }`}
          onClick={() => onSelect("chat")}
        >
          <span className="inline-flex h-2 w-2 rounded-full bg-sky-300" />
          <span className={`${collapsed ? "hidden" : "block"}`}>Conversational Interface</span>
        </button>

        <button
          className={`${btnBase} ${
            active === "land" ? "bg-emerald-950/60 text-white" : "hover:bg-emerald-700/40"
          }`}
          onClick={() => onSelect("land")}
        >
          <span className="inline-flex h-2 w-2 rounded-full bg-lime-300" />
          <span className={`${collapsed ? "hidden" : "block"}`}>Land Management</span>
        </button>

        <button
          className={`${btnBase} ${
            active === "activities" ? "bg-emerald-950/60 text-white" : "hover:bg-emerald-700/40"
          }`}
          onClick={() => onSelect("activities")}
        >
          <span className="inline-flex h-2 w-2 rounded-full bg-amber-300" />
          <span className={`${collapsed ? "hidden" : "block"}`}>Activity Tracking</span>
        </button>

        <button
          className={`${btnBase} ${
            active === "market" ? "bg-emerald-950/60 text-white" : "hover:bg-emerald-700/40"
          }`}
          onClick={() => onSelect("market")}
        >
          <span className="inline-flex h-2 w-2 rounded-full bg-emerald-300" />
          <span className={`${collapsed ? "hidden" : "block"}`}>Market Insights</span>
        </button>

        <button
          className={`${btnBase} ${
            active === "alerts" ? "bg-emerald-950/60 text-white" : "hover:bg-emerald-700/40"
          }`}
          onClick={() => onSelect("alerts")}
        >
          <span className="inline-flex h-2 w-2 rounded-full bg-rose-300" />
          <span className={`${collapsed ? "hidden" : "block"}`}>Reminders & Alerts</span>
        </button>
      </div>

      <div className={`mt-auto flex flex-col gap-2 ${collapsed ? "items-center" : "items-stretch"}`}>
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
            className="w-full px-3 py-2 rounded-lg bg-neutral-900 text-white hover:bg-neutral-800 transition-colors"
            aria-label="Logout"
            title="Logout"
          >
            Logout
          </button>
        )}
        <div className={`text-xs ${collapsed ? "hidden" : "block"}`}>
          <span className="opacity-80">v1.0</span>
        </div>
      </div>
    </nav>
  );
}


