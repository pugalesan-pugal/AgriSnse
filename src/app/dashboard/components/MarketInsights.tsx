"use client";

import { useEffect, useMemo, useState } from "react";
import { useLand } from "../contexts/LandContext";
import { useLanguage } from "@/contexts/LanguageContext";

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
  const { t, language } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<RecordRow[]>([]);
  const [commodityOptions, setCommodityOptions] = useState<string[]>(COMMON_COMMODITIES);
  const [isSampleData, setIsSampleData] = useState(false);
  const [dataSource, setDataSource] = useState<string>('');
  const [warning, setWarning] = useState<string>('');
  const [timestamp, setTimestamp] = useState<string>('');


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
      setIsSampleData(data.source === 'sample');
      setDataSource(data.source || '');
      setWarning(data.warning || '');
      setTimestamp(data.timestamp || '');
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
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-50 to-white">
      {/* Header Section */}
      <div className="p-6 pb-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{t("marketInsights")}</h2>
              <p className="text-sm text-gray-600">Real-time market prices and trends</p>
            </div>
          </div>
          <div className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
            {language === "ml" ? "ഉറവിടം: data.gov.in" : "Source: data.gov.in"}
          </div>
        </div>

        {/* Filter Section */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                State
              </label>
              <select 
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white text-gray-800" 
                value={state} 
                onChange={(e) => setState(e.target.value)}
              >
                {STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                Commodity
              </label>
              <input 
                list="commodity-list" 
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 bg-white text-gray-800 placeholder-gray-500" 
                value={commodity} 
                onChange={(e) => setCommodity(e.target.value)} 
                placeholder={language === "ml" ? "തിരയാൻ ടൈപ്പ് ചെയ്യുക" : "Type to search commodity..."} 
              />
              <datalist id="commodity-list">
                {commodityOptions.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <div className="flex items-end">
              <button 
                onClick={fetchData} 
                disabled={loading}
                className="w-full px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg flex items-center justify-center gap-2 font-semibold"
              >
                {loading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    {t("loading")}...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Fetch Data
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="flex-1 px-6 pb-6">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center gap-2">
            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}

        {/* Data Source Notice */}
        {dataSource && (
          <div className={`mb-4 p-4 rounded-xl text-sm flex items-center gap-2 ${
            dataSource === 'sample' 
              ? 'bg-yellow-50 border border-yellow-200 text-yellow-700'
              : dataSource === 'agmarknet'
              ? 'bg-green-50 border border-green-200 text-green-700'
              : 'bg-blue-50 border border-blue-200 text-blue-700'
          }`}>
            <svg className={`w-5 h-5 ${
              dataSource === 'sample' ? 'text-yellow-500' : 
              dataSource === 'agmarknet' ? 'text-green-500' : 'text-blue-500'
            }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {dataSource === 'sample' ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              )}
            </svg>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <strong>Data Source:</strong> {
                  dataSource === 'sample' 
                    ? 'Sample data for demonstration purposes'
                    : dataSource === 'agmarknet'
                    ? 'Real-time data from Agmarknet (Government of India)'
                    : 'Real-time data from data.gov.in'
                }
              </div>
              {warning && (
                <div className="text-xs mt-1 text-yellow-600">
                  ⚠️ {warning}
                </div>
              )}
              {timestamp && (
                <div className="text-xs mt-1 text-gray-500">
                  Last updated: {new Date(timestamp).toLocaleString()}
                </div>
              )}
            </div>
          </div>
        )}


        {/* Data Table */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden flex flex-col" style={{ height: 'calc(100vh - 300px)', minHeight: '400px' }}>
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-blue-600 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Loading Market Data</h3>
              <p className="text-gray-500">Fetching latest market prices...</p>
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No Market Data</h3>
              <p className="text-gray-500 max-w-md">No market data available for the selected filters. Try adjusting your search criteria.</p>
            </div>
          ) : (
            <div className="h-full flex flex-col">
              {/* Table Header - Fixed */}
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 px-6 py-4 flex-shrink-0">
                <div className="grid grid-cols-6 gap-4 text-sm font-semibold text-gray-700">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    Commodity
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    </svg>
                    Market
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                    </svg>
                    Min Price
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                    Max Price
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Modal Price
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Date
                  </div>
                </div>
              </div>

              {/* Table Body - Scrollable */}
              <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                {rows.map((r, idx) => (
                  <div key={idx} className={`px-6 py-4 border-b border-gray-100 hover:bg-gray-50 transition-colors duration-200 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    <div className="grid grid-cols-6 gap-4 text-sm">
                      <div className="flex items-center">
                        <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-semibold truncate" title={`${r.commodity}${r.variety ? ` - ${r.variety}` : ""}`}>
                          {r.commodity}{r.variety ? ` - ${r.variety}` : ""}
                        </div>
                      </div>
                      <div className="flex items-center text-gray-700 truncate" title={`${r.market}, ${r.district ?? ""}`}>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          {r.market}
                        </div>
                      </div>
                      <div className="flex items-center">
                        <span className="bg-red-100 text-red-800 px-2 py-1 rounded-lg text-xs font-semibold">
                          ₹{r.min_price}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded-lg text-xs font-semibold">
                          ₹{r.max_price}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-lg text-xs font-semibold">
                          ₹{r.modal_price}
                        </span>
                      </div>
                      <div className="flex items-center text-gray-600">
                        <div className="bg-orange-100 text-orange-800 px-2 py-1 rounded-lg text-xs font-medium">
                          {r.arrival_date}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


