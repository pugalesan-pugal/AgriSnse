"use client";

import { useEffect, useMemo, useState } from "react";
import { useLand } from "../contexts/LandContext";

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
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phone, setPhone] = useState<string>(() => localStorage.getItem("agrisense.alerts.phone") || "");

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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Reminders & Alerts</h2>
        <div className="text-xs text-neutral-500">Linked to land: {landContext.name || "(none)"}</div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-sm text-neutral-600">Phone number</label>
          <input className="border border-neutral-300 rounded-lg px-3 py-2" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91XXXXXXXXXX" />
        </div>
        <div className="flex items-end">
          <button onClick={loadAlerts} className="px-4 py-2 rounded-lg bg-neutral-900 text-white hover:bg-neutral-800 w-full sm:w-auto">Refresh Alerts</button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
      )}

      <div className="flex flex-col gap-3">
        {alerts.length === 0 && !loading && (
          <div className="px-3 py-4 text-sm text-neutral-500">No alerts right now</div>
        )}

        {alerts.map((a) => (
          <div key={a.id} className="border border-neutral-200 rounded-lg p-3 bg-white">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-sm font-semibold capitalize">{a.type} - {a.title}</div>
                <div className="text-sm text-neutral-700 mt-1 whitespace-pre-wrap">{a.message}</div>
                <div className="text-[11px] text-neutral-400 mt-1">{new Date(a.createdAt).toLocaleString()}</div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => sendSms(a)} className="px-2 py-1 text-xs rounded bg-sky-600 text-white hover:bg-sky-500">Send via SMS</button>
                <button onClick={() => { markSnoozed(a.id, 60); setAlerts((prev) => prev.filter((x) => x.id !== a.id)); }} className="px-2 py-1 text-xs rounded bg-amber-500 text-white hover:bg-amber-400">Snooze</button>
                <button onClick={() => { markDismissed(a.id); setAlerts((prev) => prev.filter((x) => x.id !== a.id)); }} className="px-2 py-1 text-xs rounded bg-neutral-200 hover:bg-neutral-300">Dismiss</button>
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="text-sm text-neutral-500">Loading...</div>
        )}
      </div>
    </div>
  );
}


