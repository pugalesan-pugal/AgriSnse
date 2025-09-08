"use client";

import { useEffect, useMemo, useState } from "react";

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-4">
      <div className="text-sm font-semibold mb-2">{title}</div>
      {children}
    </div>
  );
}

export default function RightPanels() {
  const [location, setLocation] = useState<string>("");
  const [weather, setWeather] = useState<string>("Loading weather...");

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

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <Panel title="Personalized Advisory">
        <div className="text-sm text-neutral-600">Weather now: {weather}</div>
        <ul className="mt-2 list-disc list-inside text-sm">
          <li>Consider irrigation in early morning to reduce evaporation.</li>
          <li>Monitor for leafhopper; apply neem-based spray if needed.</li>
          <li>Check govt advisories for subsidy windows.</li>
        </ul>
      </Panel>

      <Panel title="Reminders & Alerts">
        <div className="text-xs text-neutral-500">Sample alerts</div>
        <div className="mt-2 grid gap-2">
          <div className="border border-neutral-200 rounded-lg p-3">
            Fertilizer application due in 2 days
          </div>
          <div className="border border-neutral-200 rounded-lg p-3">
            Paddy MSP update: check market trends
          </div>
          <div className="border border-neutral-200 rounded-lg p-3">
            Subsidy registration closes on 30th
          </div>
        </div>
      </Panel>

      <Panel title="Knowledge Engine">
        <div className="text-sm text-neutral-600">Location: {location || "Detecting..."}</div>
        <div className="text-sm text-neutral-600">Month: {month}</div>
        <div className="mt-2 grid gap-2 text-sm">
          <div className="border border-neutral-200 rounded-lg p-3">
            Crop calendar: transplanting window ideal this week.
          </div>
          <div className="border border-neutral-200 rounded-lg p-3">
            Pest watch: Brown planthopper reported in nearby districts.
          </div>
          <div className="border border-neutral-200 rounded-lg p-3">
            Best practice: Mulching helps retain soil moisture during heat.
          </div>
        </div>
      </Panel>
    </div>
  );
}


