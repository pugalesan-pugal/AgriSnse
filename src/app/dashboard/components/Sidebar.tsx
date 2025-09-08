"use client";

import { ModuleKey } from "../page";

type Props = {
  active: ModuleKey;
  onSelect: (k: ModuleKey) => void;
  collapsed: boolean;
  onToggle: () => void;
  lands?: { id: string; name: string; location: string; crop: string }[];
  onPickLand?: (id: string) => void;
};

const btnBase =
  "flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm md:text-base transition-colors";

export default function Sidebar({ active, onSelect, collapsed, onToggle, lands = [], onPickLand }: Props) {
  return (
    <nav
      className={`h-screen sticky top-0 bg-white border-r border-neutral-200 p-3 md:p-4 flex flex-col gap-3 transition-all duration-300 ease-out ${
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
          className="p-2 rounded-md hover:bg-neutral-100 border border-neutral-200"
        >
          {collapsed ? "→" : "←"}
        </button>
      </div>

      <div className="mt-2 flex-1 flex flex-col gap-2">
        <button
          className={`${btnBase} ${
            active === "profiling" ? "bg-neutral-900 text-white" : "hover:bg-neutral-100"
          }`}
          onClick={() => onSelect("profiling")}
        >
          <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          <span className={`${collapsed ? "hidden" : "block"}`}>Farmer & Farm Profiling</span>
        </button>

        <button
          className={`${btnBase} ${
            active === "chat" ? "bg-neutral-900 text-white" : "hover:bg-neutral-100"
          }`}
          onClick={() => onSelect("chat")}
        >
          <span className="inline-flex h-2 w-2 rounded-full bg-sky-500" />
          <span className={`${collapsed ? "hidden" : "block"}`}>Conversational Interface</span>
        </button>

        <button
          className={`${btnBase} ${
            active === "land" ? "bg-neutral-900 text-white" : "hover:bg-neutral-100"
          }`}
          onClick={() => onSelect("land")}
        >
          <span className="inline-flex h-2 w-2 rounded-full bg-lime-600" />
          <span className={`${collapsed ? "hidden" : "block"}`}>Land Management</span>
        </button>

        {lands.length > 0 && (
          <div className={`mt-1 ${collapsed ? "space-y-1" : "space-y-2"}`}>
            {lands.slice(0, 6).map((l) => (
              <button
                key={l.id}
                onClick={() => onPickLand && onPickLand(l.id)}
                title={`${l.name} • ${l.location}`}
                className={`${
                  collapsed
                    ? "w-full px-2 py-1 rounded-md hover:bg-neutral-100 text-xs text-left"
                    : "w-full px-3 py-2 rounded-md hover:bg-neutral-100 text-left border border-neutral-200"
                }`}
              >
                {collapsed ? (
                  <div className="truncate">{l.name.slice(0, 2)}</div>
                ) : (
                  <div className="">
                    <div className="text-sm font-medium truncate">{l.name}</div>
                    <div className="text-xs text-neutral-500 truncate">{l.location}</div>
                    <div className="text-xs text-neutral-600">{l.crop}</div>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}

        <button
          className={`${btnBase} ${
            active === "activities" ? "bg-neutral-900 text-white" : "hover:bg-neutral-100"
          }`}
          onClick={() => onSelect("activities")}
        >
          <span className="inline-flex h-2 w-2 rounded-full bg-amber-500" />
          <span className={`${collapsed ? "hidden" : "block"}`}>Activity Tracking</span>
        </button>
      </div>

      <div className={`text-xs text-neutral-500 ${collapsed ? "hidden" : "block"}`}>
        v1.0
      </div>
    </nav>
  );
}


