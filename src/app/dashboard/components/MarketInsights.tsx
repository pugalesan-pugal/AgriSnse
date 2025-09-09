"use client";

import { useEffect, useMemo, useState } from "react";
import { useLand } from "../contexts/LandContext";

type RecordRow = {
  state: string;
  district?: string;
  market: string;
  commodity: string;
  variety?: string;
  arrival_date: string;
  min_price: number;
  max_price: number;
  modal_price: number;
};

const STATES = ["Kerala", "Tamil Nadu", "Karnataka", "Andhra Pradesh", "Telangana", "Maharashtra"];
const COMMON_COMMODITIES = [
  "Coconut", "Paddy", "Banana", "Pepper", "Tomato", "Onion", "Potato",
  "Wheat", "Maize", "Sugarcane", "Cotton", "Turmeric", "Cardamom",
  "Groundnut", "Mustard", "Soybean", "Sunflower", "Chilli", "Garlic",
  "Ginger", "Tea", "Coffee", "Rubber", "Arecanut", "Jute",
  "Black Gram", "Green Gram", "Red Gram", "Bajra", "Ragi"
];

export default function MarketInsights() {
  const { lands } = useLand();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<RecordRow[]>([]);
  const [commodityOptions, setCommodityOptions] = useState<string[]>(COMMON_COMMODITIES);

  // Defaults from profile/land if available via localStorage
  const defaults = useMemo(() => {
    try {
      const raw = localStorage.getItem("agrisense.user.profile");
      const prof = raw ? JSON.parse(raw) : {};
      const state = prof?.state || "Kerala";
      const crop = lands?.[0]?.crop || prof?.cropType || "Coconut";
      return { state, crop };
    } catch {
      return { state: "Kerala", crop: "Coconut" };
    }
  }, [lands]);

  const [state, setState] = useState<string>(() => localStorage.getItem("agrisense.market.state") || defaults.state);
  const [commodity, setCommodity] = useState<string>(() => localStorage.getItem("agrisense.market.commodity") || defaults.crop);

  useEffect(() => {
    localStorage.setItem("agrisense.market.state", state);
  }, [state]);
  useEffect(() => {
    localStorage.setItem("agrisense.market.commodity", commodity);
  }, [commodity]);

  async function fetchData() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ state, commodity, limit: "20" });
      const resp = await fetch(`/api/market/insights?${params.toString()}`, { cache: "no-store" });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Failed to load market data");
      setRows(data.records || []);
      localStorage.setItem("agrisense.market.cache", JSON.stringify({ ts: Date.now(), state, commodity, data: data.records }));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      try {
        const raw = localStorage.getItem("agrisense.market.cache");
        if (raw) {
          const cached = JSON.parse(raw);
          setRows(cached.data || []);
        }
      } catch {}
    } finally {
      setLoading(false);
    }
  }

  // Load commodity list dynamically for the selected state (fallback to COMMON_COMMODITIES)
  useEffect(() => {
    (async () => {
      try {
        const params = new URLSearchParams({ state, limit: "20" });
        const resp = await fetch(`/api/market/insights?${params.toString()}`, { cache: "no-store" });
        const data = await resp.json();
        if (resp.ok && Array.isArray(data.records)) {
          const unique = Array.from(new Set((data.records as RecordRow[]).map((r) => r.commodity))).filter(Boolean).sort();
          if (unique.length > 0) setCommodityOptions(unique);
        }
      } catch {
        // ignore, keep previous options
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Market Insights</h2>
        <div className="text-xs text-neutral-500">Source: data.gov.in</div>
      </div>

      <div className="max-h-[70vh] md:max-h-[75vh] overflow-y-auto pr-1">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-sm text-neutral-600">State</label>
          <select className="border border-neutral-300 rounded-lg px-3 py-2" value={state} onChange={(e) => setState(e.target.value)}>
            {STATES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm text-neutral-600">Commodity</label>
          <input list="commodity-list" className="border border-neutral-300 rounded-lg px-3 py-2" value={commodity} onChange={(e) => setCommodity(e.target.value)} placeholder="Type to search (leave empty for all)" />
          <datalist id="commodity-list">
            {commodityOptions.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
        <div className="flex items-end">
          <button onClick={fetchData} className="px-4 py-2 rounded-lg bg-neutral-900 text-white hover:bg-neutral-800 w-full sm:w-auto">Fetch</button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
      )}

      <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden">
        <div className="grid grid-cols-6 gap-0 bg-neutral-50 text-xs font-semibold text-neutral-700 px-3 py-2">
          <div>Commodity</div>
          <div>Market</div>
          <div>Min</div>
          <div>Max</div>
          <div>Modal</div>
          <div>Date</div>
        </div>
        {rows.length === 0 && (
          <div className="px-3 py-4 text-sm text-neutral-500">No data available</div>
        )}
        {rows.map((r, idx) => (
          <div key={idx} className="grid grid-cols-6 gap-0 px-3 py-2 border-t text-sm">
            <div className="truncate" title={`${r.commodity}${r.variety ? ` - ${r.variety}` : ""}`}>{r.commodity}{r.variety ? ` - ${r.variety}` : ""}</div>
            <div className="truncate" title={`${r.market}, ${r.district ?? ""}`}>{r.market}</div>
            <div>₹{r.min_price}</div>
            <div>₹{r.max_price}</div>
            <div>₹{r.modal_price}</div>
            <div>{r.arrival_date}</div>
          </div>
        ))}
      </div>

      {loading && (
        <div className="text-sm text-neutral-500">Loading...</div>
      )}
      </div>
    </div>
  );
}


