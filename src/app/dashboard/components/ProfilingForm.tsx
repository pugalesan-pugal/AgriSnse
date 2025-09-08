"use client";

import { useState } from "react";

type ProfileForm = {
  farmerName: string;
  phone: string;
  gps: string;
  landSize: string;
  cropType: string;
  soilType: string;
  irrigation: string;
};

export default function ProfilingForm() {
  const [form, setForm] = useState<ProfileForm>({
    farmerName: "",
    phone: "",
    gps: "",
    landSize: "",
    cropType: "",
    soilType: "",
    irrigation: "",
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function handleChange<K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      // TODO: Replace with actual API call to save profile
      await new Promise((r) => setTimeout(r, 600));
      setMessage("Saved profile (placeholder)");
    } catch (err) {
      setMessage("Failed to save profile");
    } finally {
      setSaving(false);
    }
  }

  async function captureGPS() {
    if (!navigator.geolocation) {
      setMessage("Geolocation not supported");
      return;
    }
    setMessage(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = `${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`;
        handleChange("gps", coords);
      },
      () => setMessage("Unable to fetch GPS")
    );
  }

  // Read minimal session for code display
  let code: string | null = null;
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem("agrisense.user");
      if (raw) {
        const u = JSON.parse(raw);
        code = u?.code ?? null;
      }
    } catch {}
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Farmer & Farm Profiling</h2>
        {code && (
          <div className="px-3 py-1 rounded-full text-sm border border-neutral-300 bg-neutral-50">Code: <span className="font-semibold">{code}</span></div>
        )}
      </div>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm text-neutral-600">Farmer Name</label>
          <input
            className="border border-neutral-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-800"
            value={form.farmerName}
            onChange={(e) => handleChange("farmerName", e.target.value)}
            required
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm text-neutral-600">Phone</label>
          <input
            className="border border-neutral-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-800"
            value={form.phone}
            onChange={(e) => handleChange("phone", e.target.value)}
            required
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm text-neutral-600">GPS</label>
          <div className="flex gap-2">
            <input
              className="flex-1 border border-neutral-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-800"
              value={form.gps}
              onChange={(e) => handleChange("gps", e.target.value)}
              placeholder="lat, lng"
            />
            <button
              type="button"
              onClick={captureGPS}
              className="px-3 py-2 rounded-lg border border-neutral-300 hover:bg-neutral-100"
            >
              Use GPS
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm text-neutral-600">Land Size (acres)</label>
          <input
            className="border border-neutral-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-800"
            value={form.landSize}
            onChange={(e) => handleChange("landSize", e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm text-neutral-600">Crop Type</label>
          <input
            className="border border-neutral-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-800"
            value={form.cropType}
            onChange={(e) => handleChange("cropType", e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm text-neutral-600">Soil Type</label>
          <input
            className="border border-neutral-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-800"
            value={form.soilType}
            onChange={(e) => handleChange("soilType", e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm text-neutral-600">Irrigation Methods</label>
          <input
            className="border border-neutral-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-800"
            value={form.irrigation}
            onChange={(e) => handleChange("irrigation", e.target.value)}
          />
        </div>

        <div className="sm:col-span-2 flex items-center gap-3 mt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-neutral-900 text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Profile"}
          </button>
          {message && <span className="text-sm text-neutral-600">{message}</span>}
        </div>
      </form>
    </div>
  );
}


