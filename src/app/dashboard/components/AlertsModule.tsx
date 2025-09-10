"use client";

import { useEffect, useMemo, useState } from "react";
import { useLand } from "../contexts/LandContext";
import { useLanguage } from "@/contexts/LanguageContext";

type AlertItem = {
  id: string;
  type: "fertilizer" | "government" | "market" | "weather" | "info";
  title: string;
  message: string;
  landId: string | null;
  createdAt: string;
};

export default function AlertsModule() {
  const { activeLand, activeLandId } = useLand();
  const { t, language } = useLanguage();
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phone, setPhone] = useState<string>(() => localStorage.getItem("agrisense.alerts.phone") || "");
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Toast auto-dismiss
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const landContext = useMemo(() => {
    return {
      id: activeLandId || null,
      name: activeLand?.name || "",
      location: activeLand?.location || "Kerala",
      crop: activeLand?.crop && activeLand?.crop !== "Empty" ? activeLand.crop : "Coconut",
      state: (activeLand?.location || "Kerala").split(",").slice(-1)[0].trim() || "Kerala",
    };
  }, [activeLand, activeLandId]);

  useEffect(() => {
    if (phone) localStorage.setItem("agrisense.alerts.phone", phone);
  }, [phone]);

  function getSuppressKey(kind: "dismissed" | "snoozed") {
    return `agrisense.alerts.${kind}.${landContext.id || "none"}`;
  }

  function isSuppressed(id: string) {
    try {
      const dRaw = localStorage.getItem(getSuppressKey("dismissed"));
      const sRaw = localStorage.getItem(getSuppressKey("snoozed"));
      const dismissed: string[] = dRaw ? JSON.parse(dRaw) : [];
      const snoozed: Record<string, number> = sRaw ? JSON.parse(sRaw) : {};
      if (dismissed.includes(id)) return true;
      const until = snoozed[id];
      if (until && Date.now() < until) return true;
      return false;
    } catch {
      return false;
    }
  }

  function markDismissed(id: string) {
    try {
      const key = getSuppressKey("dismissed");
      const raw = localStorage.getItem(key);
      const list: string[] = raw ? JSON.parse(raw) : [];
      if (!list.includes(id)) list.push(id);
      localStorage.setItem(key, JSON.stringify(list));
    } catch {}
  }

  function markSnoozed(id: string, minutes: number) {
    try {
      const key = getSuppressKey("snoozed");
      const raw = localStorage.getItem(key);
      const map: Record<string, number> = raw ? JSON.parse(raw) : {};
      map[id] = Date.now() + minutes * 60 * 1000;
      localStorage.setItem(key, JSON.stringify(map));
    } catch {}
  }

  async function loadAlerts() {
    if (!landContext) return;
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch(`/api/alerts/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          landId: landContext.id,
          crop: landContext.crop,
          language,
          location: landContext.location,
          state: landContext.state,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Failed to load alerts");
      const all: AlertItem[] = (data.alerts || []).filter((a: AlertItem) => !isSuppressed(a.id));
      setAlerts(all);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAlerts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [landContext.id]);

  async function sendSms(item: AlertItem) {
    if (!phone) {
      window.alert("Enter a phone number first");
      return;
    }
    try {
      const resp = await fetch("/api/alerts/sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: phone, body: `${item.title}: ${item.message}` }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "SMS failed");
      console.info("SMS sent", data.sid || data.ok);
      window.alert("SMS sent");
    } catch (e) {
      window.alert(e instanceof Error ? e.message : String(e));
    }
  }

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'fertilizer':
        return (
          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'government':
        return (
          <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        );
      case 'market':
        return (
          <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        );
      case 'weather':
        return (
          <svg className="w-5 h-5 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'fertilizer':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'government':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'market':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'weather':
        return 'bg-cyan-50 border-cyan-200 text-cyan-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  return (
    <div className="h-full w-full flex flex-col bg-gradient-to-br from-slate-50 to-white overflow-hidden">
      {/* Header Section - Fixed */}
      <div className="flex-shrink-0 p-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-rose-500 to-pink-600 rounded-xl flex items-center justify-center shadow-md">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4.828 7l2.586 2.586a2 2 0 002.828 0L12.828 7H4.828zM4.828 17l2.586-2.586a2 2 0 012.828 0L12.828 17H4.828z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-800">{t("remindersAlerts")}</h2>
              <p className="text-xs text-gray-600">Farming insights</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500">Land: {landContext.name || "(none)"}</div>
          </div>
        </div>

        {/* Controls Section - Fixed */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-700 flex items-center gap-1">
                <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                Phone
              </label>
              <input 
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-rose-500 focus:border-rose-500 transition-all duration-200 bg-white text-gray-800" 
                value={phone} 
                onChange={(e) => setPhone(e.target.value)} 
                placeholder="+91XXXXXXXXXX" 
              />
            </div>
            <div className="flex items-end">
              <button 
                onClick={loadAlerts} 
                className="w-full md:w-auto px-4 py-2 bg-gradient-to-r from-rose-500 to-pink-600 text-white text-sm font-medium rounded-lg hover:from-rose-600 hover:to-pink-700 transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center gap-1"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {t("refreshAlerts")}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content Section - Scrollable */}
      <div className="flex-1 px-4 pb-4 overflow-y-auto min-h-0">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center gap-2">
            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}

        {/* Alerts Container */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex-1 flex flex-col min-h-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-8">
              <div className="w-12 h-12 bg-rose-100 rounded-xl flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-rose-600 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-gray-700 mb-1">Loading Alerts</h3>
              <p className="text-sm text-gray-500">Fetching reminders...</p>
            </div>
          ) : alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-8">
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-gray-700 mb-1">No Alerts</h3>
              <p className="text-sm text-gray-500">All caught up!</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
              <div className="p-4 space-y-3">
                {alerts.map((a, index) => (
                  <div 
                    key={a.id} 
                    className={`border rounded-xl p-4 bg-white shadow-sm hover:shadow-md transition-all duration-300 hover:scale-[1.01] ${getAlertColor(a.type)}`}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">
                        {getAlertIcon(a.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-white/50 text-gray-700">
                            {a.type.toUpperCase()}
                          </span>
                          <h3 className="text-sm font-semibold text-gray-800 truncate">{a.title}</h3>
                        </div>
                        <p className="text-sm text-gray-700 mb-2 whitespace-pre-wrap leading-relaxed line-clamp-3">{a.message}</p>
                        <div className="text-xs text-gray-500 flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {new Date(a.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <button 
                        onClick={() => sendSms(a)} 
                        className="px-3 py-1.5 bg-sky-500 text-white text-xs font-medium rounded-md hover:bg-sky-600 transition-all duration-200 flex items-center gap-1.5 shadow-sm hover:shadow-md"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        SMS
                      </button>
                      <button 
                        onClick={() => { markSnoozed(a.id, 60); setAlerts((prev) => prev.filter((x) => x.id !== a.id)); }} 
                        className="px-3 py-1.5 bg-amber-500 text-white text-xs font-medium rounded-md hover:bg-amber-600 transition-all duration-200 flex items-center gap-1.5 shadow-sm hover:shadow-md"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Snooze
                      </button>
                      <button 
                        onClick={() => { markDismissed(a.id); setAlerts((prev) => prev.filter((x) => x.id !== a.id)); }} 
                        className="px-3 py-1.5 bg-gray-500 text-white text-xs font-medium rounded-md hover:bg-gray-600 transition-all duration-200 flex items-center gap-1.5 shadow-sm hover:shadow-md"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Dismiss
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            const codeRaw = localStorage.getItem("agrisense.user");
                            const code = codeRaw ? JSON.parse(codeRaw)?.code : null;
                            const landId = a.landId || activeLandId;
                            if (!code || !landId) {
                              alert("Please select a land and ensure you're logged in.");
                              return;
                            }
                            const resp = await fetch("/api/activities/save", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                code,
                                landId,
                                type: "Reminders",
                                notes: `Reminder: ${a.title} - ${a.message}`.slice(0, 500),
                                createdAt: Date.now(),
                              }),
                            });
                            if (!resp.ok) {
                              const data = await resp.json();
                              throw new Error(data.error || "Failed to add reminder");
                            }
                            setToast({ message: "Added to calendar as a reminder", type: 'success' });
                          } catch (e) {
                            setToast({ message: e instanceof Error ? e.message : String(e), type: 'error' });
                          }
                        }}
                        className="px-3 py-1.5 bg-emerald-500 text-white text-xs font-medium rounded-md hover:bg-emerald-600 transition-all duration-200 flex items-center gap-1.5 shadow-sm hover:shadow-md"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Calendar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Toast notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg shadow-lg text-white animate-slide-in-right flex items-center gap-2 text-sm ${
          toast.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'
        }`}>
          {toast.type === 'success' ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          {toast.message}
        </div>
      )}
    </div>
  );
}


