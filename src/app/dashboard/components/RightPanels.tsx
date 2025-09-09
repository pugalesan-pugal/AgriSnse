"use client";

import { useEffect, useMemo, useState } from "react";
import { useLand } from "../contexts/LandContext";

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border p-4 shadow-sm bg-gradient-to-br from-emerald-100 to-emerald-50 border-emerald-300/80">
      <div className="text-sm font-semibold mb-2 text-emerald-950 flex items-center gap-2">
        <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
        {title}
      </div>
      <div className="h-1 w-full rounded-full bg-emerald-300/70 mb-3" />
      {children}
    </div>
  );
}

export default function RightPanels() {
  const { activeLandId } = useLand();
  const [location, setLocation] = useState<string>("");
  const [weather, setWeather] = useState<string>("Loading weather...");
  const [tips, setTips] = useState<string[]>([]);
  const [kgLoading, setKgLoading] = useState<boolean>(false);
  const [kgError, setKgError] = useState<string | null>(null);
  const [userCode, setUserCode] = useState<string | null>(null);

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => setLocation(`${pos.coords.latitude.toFixed(2)}, ${pos.coords.longitude.toFixed(2)}`),
      () => setLocation("Unknown")
    );
  }, []);

  useEffect(() => {
    // TODO: Replace with real weather API call
    const t = setTimeout(() => setWeather("29°C, partly cloudy (placeholder)"), 500);
    return () => clearTimeout(t);
  }, []);

  const month = useMemo(() => new Date().toLocaleString(undefined, { month: "long" }), []);

  // Load user code for Ollama context
  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem("agrisense.user") : null;
      if (raw) setUserCode(JSON.parse(raw)?.code ?? null);
    } catch {}
  }, []);

  // Fetch Knowledge Engine tips via Ollama based on profile/land context
  useEffect(() => {
    if (!userCode || !activeLandId) {
      setTips([]);
      return;
    }
    (async () => {
      setKgLoading(true);
      setKgError(null);
      try {
        const resp = await fetch("/api/chat-ollama", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userCode,
            landId: activeLandId,
            messages: [
              {
                role: "user",
                content:
                  "Generate 3 short, land-specific knowledge tips as bullet points. Base on crop, soil, irrigation, recent activities, weather and market. Keep each under 120 chars. No preface, no numbering — just bullets.",
              },
            ],
            model: "mistral",
          }),
        });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.error || "Failed to generate tips");
        const content: string = data?.message?.content || "";
        const lines = content
          .split(/\n+/)
          .map((s: string) => s.replace(/^[-*]\s*/, "").trim())
          .filter(Boolean);
        setTips(lines.slice(0, 5));
      } catch (e) {
        setKgError(e instanceof Error ? e.message : String(e));
      } finally {
        setKgLoading(false);
      }
    })();
  }, [userCode, activeLandId]);

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <Panel title="Reminders & Alerts">
        <div className="text-xs text-emerald-700">Sample alerts</div>
        <div className="mt-2 grid gap-2">
          <div className="border rounded-lg p-3 bg-emerald-100 border-emerald-200 text-emerald-950">
            Fertilizer application due in 2 days
          </div>
          <div className="border rounded-lg p-3 bg-emerald-100 border-emerald-200 text-emerald-950">
            Paddy MSP update: check market trends
          </div>
          <div className="border rounded-lg p-3 bg-emerald-100 border-emerald-200 text-emerald-950">
            Subsidy registration closes on 30th
          </div>
        </div>
      </Panel>

      <Panel title="Knowledge Engine">
        <div className="text-sm text-emerald-900/90">Location: {location || "Detecting..."}</div>
        <div className="text-sm text-emerald-900/90">Month: {month}</div>
        <div className="mt-2 grid gap-2 text-sm">
          {kgLoading && (
            <div className="border rounded-lg p-3 text-emerald-950 bg-emerald-100 border-emerald-200">Generating tips…</div>
          )}
          {kgError && (
            <div className="border border-red-200 rounded-lg p-3 text-red-700 bg-red-50">{kgError}</div>
          )}
          {!kgLoading && !kgError && tips.length === 0 && (
            <div className="border rounded-lg p-3 text-emerald-950 bg-emerald-100 border-emerald-200">No tips yet</div>
          )}
          {tips.map((t, i) => (
            <div key={i} className="border rounded-lg p-3 bg-emerald-50 text-emerald-950 border-emerald-200 shadow-[0_1px_0_#cfead8]">{t}</div>
          ))}
        </div>
      </Panel>
    </div>
  );
}


