"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLand } from "../contexts/LandContext";
import { AreaUnit, CropType, Land, unitToSqMeters } from "./types";

const cropOptions: CropType[] = ["Empty", "Paddy", "Banana", "Pepper", "Coconut", "Other"];
const unitOptions: AreaUnit[] = ["acre", "hectare", "cent", "sqft", "sqm"];

type GridSelection = {
  rows: number;
  cols: number;
  selected: Set<string>; // key: r-c
};

function key(r: number, c: number) {
  return `${r}-${c}`;
}

type Props = {
  landToEditId: string | null;
  clearEdit: () => void;
};

export default function LandManagement({ landToEditId, clearEdit }: Props) {
  const { lands, setLands, refreshLands } = useLand();
  const [draft, setDraft] = useState<Partial<Land>>({ sizeUnit: "acre", crop: "Empty" });
  const [editingId, setEditingId] = useState<string | null>(null);

  const [grid, setGrid] = useState<GridSelection>({ rows: 10, cols: 10, selected: new Set() });
  const [isDragging, setIsDragging] = useState(false);
  const dragMode = useRef<"add" | "remove">("add");

  const totalCells = grid.rows * grid.cols;
  const selectedCells = grid.selected.size;

  const draftSelectedSqm = useMemo(() => {
    if (!draft.sizeValue || !draft.sizeUnit) return 0;
    const totalSqm = draft.sizeValue * unitToSqMeters[draft.sizeUnit];
    return (selectedCells / totalCells) * totalSqm;
  }, [draft.sizeUnit, draft.sizeValue, selectedCells, totalCells]);

  function startAdd() {
    setEditingId(null);
    setDraft({ sizeUnit: "acre", crop: "Empty" });
    setGrid({ rows: 10, cols: 10, selected: new Set() });
  }

  async function saveDraft() {
    if (!draft.name || !draft.location || !draft.sizeValue || !draft.sizeUnit) return;
    
    // Get user code from localStorage
    let userCode: string | null = null;
    try {
      const raw = localStorage.getItem("agrisense.user");
      if (raw) {
        const u = JSON.parse(raw);
        userCode = u?.code ?? null;
      }
    } catch {}
    
    if (!userCode) {
      console.error("No user code found");
      return;
    }

    const entry: Land = {
      id: editingId ?? crypto.randomUUID(),
      name: draft.name,
      location: draft.location,
      sizeValue: draft.sizeValue,
      sizeUnit: draft.sizeUnit,
      gridSelectedCells: selectedCells,
      gridTotalCells: totalCells,
      crop: (draft.crop as CropType) ?? "Empty",
      createdAt: Date.now(),
    };

    // Save to Firestore via API
    try {
      const resp = await fetch("/api/land/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: userCode,
          land: entry,
          isUpdate: !!editingId
        }),
      });
      
      if (!resp.ok) {
        const data = await resp.json();
        throw new Error(data.error || "Failed to save land");
      }
      
      // Update lands in context
      setLands(prev => {
        if (editingId) {
          return prev.map(l => l.id === editingId ? entry : l);
        }
        return [entry, ...prev];
      });
      
      // Refresh from database
      await refreshLands();
      setEditingId(null);
      setDraft({ sizeUnit: draft.sizeUnit, crop: draft.crop });
      setGrid({ rows: 10, cols: 10, selected: new Set() });
      clearEdit();
    } catch (err) {
      console.error("Failed to save land:", err);
    }
  }

  function editLand(l: Land) {
    setEditingId(l.id);
    setDraft({
      name: l.name,
      location: l.location,
      sizeValue: l.sizeValue,
      sizeUnit: l.sizeUnit,
      crop: l.crop,
    });
    const sel = new Set<string>();
    const toSelect = Math.round((l.gridSelectedCells / l.gridTotalCells) * (grid.rows * grid.cols));
    // Simple reconstruction: select first N cells
    for (let r = 0; r < grid.rows; r++) {
      for (let c = 0; c < grid.cols; c++) {
        if (sel.size < toSelect) sel.add(key(r, c));
      }
    }
    setGrid((g) => ({ ...g, selected: sel }));
  }

  useEffect(() => {
    if (!landToEditId) return;
    const target = lands.find((l) => l.id === landToEditId);
    if (target) editLand(target);
  }, [landToEditId, lands]);

  function toggleCell(r: number, c: number, mode?: "add" | "remove") {
    setGrid((g) => {
      const s = new Set(g.selected);
      const k = key(r, c);
      const willAdd = mode ? mode === "add" : !s.has(k);
      if (willAdd) s.add(k);
      else s.delete(k);
      return { ...g, selected: s };
    });
  }

  function onMouseDown(r: number, c: number) {
    const k = key(r, c);
    const willAdd = !grid.selected.has(k);
    dragMode.current = willAdd ? "add" : "remove";
    setIsDragging(true);
    toggleCell(r, c, dragMode.current);
  }

  function onMouseEnter(r: number, c: number) {
    if (!isDragging) return;
    toggleCell(r, c, dragMode.current);
  }

  function onMouseUp() {
    setIsDragging(false);
  }

  return (
    <div className="flex flex-col gap-4 select-none" onMouseLeave={onMouseUp}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Land Management</h2>
        <button
          onClick={startAdd}
          className="px-3 py-2 rounded-lg border border-neutral-300 hover:bg-neutral-100"
        >
          + Add Land
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-neutral-200 p-4">
          <div className="text-sm font-semibold mb-2">Add / Edit Land</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              className="w-full border border-neutral-300 rounded-lg px-3 py-2"
              placeholder="Name / Label (e.g., North Field)"
              value={draft.name ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            />
            <div className="flex gap-2">
              <input
                className="flex-1 w-full border border-neutral-300 rounded-lg px-3 py-2"
                placeholder="Location (GPS or manual)"
                value={draft.location ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, location: e.target.value }))}
              />
              <button
                className="px-3 py-2 rounded-lg border border-neutral-300 hover:bg-neutral-100"
                onClick={() => {
                  navigator.geolocation?.getCurrentPosition(
                    (pos) =>
                      setDraft((d) => ({
                        ...d,
                        location: `${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`,
                      })),
                    () => {}
                  );
                }}
              >
                GPS
              </button>
            </div>

            <div className="flex gap-2 sm:col-span-2">
              <input
                className="flex-1 w-full border border-neutral-300 rounded-lg px-3 py-2"
                placeholder="Size"
                type="number"
                min={0}
                value={draft.sizeValue ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, sizeValue: Number(e.target.value) }))}
              />
              <select
                className="border border-neutral-300 rounded-lg px-3 py-2 w-32"
                value={draft.sizeUnit}
                onChange={(e) => setDraft((d) => ({ ...d, sizeUnit: e.target.value as AreaUnit }))}
              >
                {unitOptions.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>

            <select
              className="border border-neutral-300 rounded-lg px-3 py-2 w-full sm:col-span-2"
              value={draft.crop ?? "Empty"}
              onChange={(e) => setDraft((d) => ({ ...d, crop: e.target.value as CropType }))}
            >
              {cropOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4">
            <div className="text-sm font-medium mb-2">Mark Area</div>
            <div className="text-xs text-neutral-600 mb-2">Drag to select cells. Drag again to unselect.</div>
            <div className="inline-block border border-neutral-300 rounded-lg overflow-hidden">
              {/* grid */}
              <div className="bg-white" onMouseUp={onMouseUp}>
                {Array.from({ length: grid.rows }).map((_, r) => (
                  <div key={r} className="flex">
                    {Array.from({ length: grid.cols }).map((__, c) => {
                      const k = key(r, c);
                      const selected = grid.selected.has(k);
                      return (
                        <div
                          key={k}
                          onMouseDown={() => onMouseDown(r, c)}
                          onMouseEnter={() => onMouseEnter(r, c)}
                          className={`w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 border border-neutral-200 ${
                            selected ? "bg-emerald-200" : "bg-white"
                          }`}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-2 text-sm text-neutral-700">
              Selected area: {draftSelectedSqm.toFixed(2)} sqm
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              className="px-4 py-2 rounded-lg bg-neutral-900 text-white hover:bg-neutral-800 disabled:opacity-50"
              onClick={saveDraft}
              disabled={!draft.name || !draft.location || !draft.sizeValue}
            >
              {editingId ? "Save Changes" : "Save Land"}
            </button>
            <button
              className="px-4 py-2 rounded-lg border border-neutral-300 hover:bg-neutral-100"
              onClick={() => setGrid((g) => ({ ...g, selected: new Set() }))}
            >
              Clear Marking
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-4 h-max">
          <div className="text-sm font-semibold mb-3">My Lands</div>
          <div className="grid gap-3">
            {lands.map((l) => {
              const selectedSqm = (l.gridSelectedCells / l.gridTotalCells) * (l.sizeValue * unitToSqMeters[l.sizeUnit]);
              return (
                <button
                  key={l.id}
                  onClick={() => editLand(l)}
                  className="text-left border border-neutral-200 rounded-lg p-3 hover:bg-neutral-50 transition-colors"
                >
                  <div className="font-medium">{l.name}</div>
                  <div className="text-xs text-neutral-500">{l.location}</div>
                  <div className="text-xs text-neutral-600 mt-1">
                    Size: {l.sizeValue} {l.sizeUnit} • Crop: {l.crop}
                  </div>
                  <div className="text-xs text-neutral-600">Marked: {selectedSqm.toFixed(1)} sqm</div>
                </button>
              );
            })}
            {lands.length === 0 && (
              <div className="text-sm text-neutral-500">No lands added yet.</div>
            )}
          </div>
        </div>
      </div>

      <div className="text-xs text-neutral-500">
        Placeholders: GIS map integration, crop health monitoring feeds.
      </div>
    </div>
  );
}


