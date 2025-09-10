"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLand } from "../contexts/LandContext";
import { AreaUnit, CropType, Land, unitToSqMeters } from "./types";
import { useLanguage } from "@/contexts/LanguageContext";

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
  const { t, language } = useLanguage();
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
    <div className="h-full w-full flex flex-col bg-gradient-to-br from-slate-50 to-white overflow-hidden" onMouseLeave={onMouseUp}>
      {/* Header Section */}
      <div className="flex-shrink-0 p-6 pb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">{t("landManagement")}</h2>
              <p className="text-sm text-gray-600">Manage your farming lands and plots</p>
            </div>
          </div>
          <button
            onClick={startAdd}
            className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white font-semibold rounded-xl hover:from-emerald-600 hover:to-green-700 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Land
          </button>
        </div>
      </div>

      {/* Content Section */}
      <div className="flex-1 px-6 pb-6 overflow-y-auto">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Form Section */}
          <div className="xl:col-span-2">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
              {/* Form Header */}
              <div className="bg-gradient-to-r from-emerald-50 to-green-50 px-6 py-4 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">
                      {editingId ? "Edit Land" : "Add New Land"}
                    </h3>
                    <p className="text-sm text-gray-600">Enter land details and mark the area</p>
                  </div>
                </div>
              </div>

              {/* Form Content */}
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      Land Name
                    </label>
                    <input
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200"
                      placeholder="e.g., North Field, Main Plot"
                      value={draft.name ?? ""}
                      onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Location
                    </label>
                    <div className="flex gap-2">
                      <input
                        className="flex-1 border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200"
                        placeholder="GPS coordinates or address"
                        value={draft.location ?? ""}
                        onChange={(e) => setDraft((d) => ({ ...d, location: e.target.value }))}
                      />
                      <button
                        className="px-4 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-all duration-200 flex items-center gap-2 shadow-md hover:shadow-lg"
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
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        GPS
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                      </svg>
                      Land Size
                    </label>
                    <div className="flex gap-2">
                      <input
                        className="flex-1 border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200"
                        placeholder="Size"
                        type="number"
                        min={0}
                        value={draft.sizeValue ?? ""}
                        onChange={(e) => setDraft((d) => ({ ...d, sizeValue: Number(e.target.value) }))}
                      />
                      <select
                        className="border border-gray-300 rounded-xl px-4 py-3 w-32 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200"
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
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                      Crop Type
                    </label>
                    <select
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200"
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
                </div>

                {/* Area Marking Section */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-gray-800">Mark Land Area</h4>
                        <p className="text-sm text-gray-600">Drag to select cells representing your land area</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-800">
                        Selected: {draftSelectedSqm.toFixed(2)} sqm
                      </div>
                      <div className="text-xs text-gray-500">
                        {selectedCells} of {totalCells} cells
                      </div>
                    </div>
                  </div>

                  <div className="inline-block border-2 border-gray-300 rounded-xl overflow-hidden shadow-sm">
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
                                className={`w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 border border-gray-200 cursor-pointer transition-all duration-150 ${
                                  selected 
                                    ? "bg-gradient-to-br from-emerald-400 to-green-500 shadow-md scale-105" 
                                    : "bg-white hover:bg-emerald-50 hover:scale-105"
                                }`}
                              />
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 flex gap-3">
                    <button
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all duration-200 flex items-center gap-2"
                      onClick={() => setGrid((g) => ({ ...g, selected: new Set() }))}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Clear Selection
                    </button>
                    <div className="flex-1"></div>
                    <button
                      className="px-6 py-2 bg-gradient-to-r from-emerald-500 to-green-600 text-white font-semibold rounded-lg hover:from-emerald-600 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2"
                      onClick={saveDraft}
                      disabled={!draft.name || !draft.location || !draft.sizeValue}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {editingId ? "Update Land" : "Save Land"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Lands List Section */}
          <div className="xl:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
              {/* List Header */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">{t("myLands")}</h3>
                    <p className="text-sm text-gray-600">{lands.length} land{lands.length !== 1 ? 's' : ''} registered</p>
                  </div>
                </div>
              </div>

              {/* Lands List */}
              <div className="p-6">
                <div className="space-y-4">
                  {lands.map((l) => {
                    const selectedSqm = (l.gridSelectedCells / l.gridTotalCells) * (l.sizeValue * unitToSqMeters[l.sizeUnit]);
                    return (
                      <div
                        key={l.id}
                        onClick={() => editLand(l)}
                        className="group cursor-pointer border border-gray-200 rounded-xl p-4 hover:border-emerald-300 hover:shadow-md transition-all duration-200 bg-white hover:bg-gradient-to-r hover:from-emerald-50 hover:to-green-50"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-emerald-100 to-green-100 rounded-lg flex items-center justify-center">
                              <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z" />
                              </svg>
                            </div>
                            <div>
                              <h4 className="font-semibold text-gray-800 group-hover:text-emerald-700 transition-colors">
                                {l.name}
                              </h4>
                              <p className="text-sm text-gray-500 flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                {l.location}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-gray-500">Marked Area</div>
                            <div className="text-sm font-semibold text-emerald-600">
                              {selectedSqm.toFixed(1)} sqm
                            </div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                            </svg>
                            <span className="text-gray-600">
                              {l.sizeValue} {l.sizeUnit}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                            <span className="text-gray-600">{l.crop}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  
                  {lands.length === 0 && (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-700 mb-2">No Lands Added</h3>
                      <p className="text-sm text-gray-500 mb-4">Start by adding your first land plot</p>
                      <button
                        onClick={startAdd}
                        className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-all duration-200"
                      >
                        Add Your First Land
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


