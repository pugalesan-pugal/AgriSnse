"use client";

import { useEffect, useMemo, useState } from "react";
import { useLand } from "../contexts/LandContext";
import { Land } from "./types";

type ProfileForm = {
  farmerName: string;
  phone: string;
  gps: string;
  landId: string | null; // selected land id
  landSize: string; // display only
  landUnit: string; // acre/hectare/cent/sqft
  cropType: string;
  soilType: string;
  irrigation: string;
  language: "en" | "ml";
};

type Props = {
  onNavigateToLandManagement: () => void;
};

export default function ProfilingForm({ onNavigateToLandManagement }: Props) {
  const { lands, activeLandId, setActiveLandId } = useLand();
  const [form, setForm] = useState<ProfileForm>({
    farmerName: "",
    phone: "",
    gps: "",
    landId: null,
    landSize: "",
    landUnit: "acre",
    cropType: "",
    soilType: "",
    irrigation: "",
    language: "en",
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [initialForm, setInitialForm] = useState<ProfileForm | null>(null);

  const keralaCrops = useMemo(() => ["paddy", "banana", "pepper", "coconut", "tapioca", "vegetables"], []);
  const soilTypes = useMemo(() => ["laterite", "alluvial", "red loam", "clay"], []);
  const irrigationMethods = useMemo(() => ["drip", "sprinkler", "canal", "rainfed"], []);

  // UI state for compact, less-congested inputs
  const [showCustomCrop, setShowCustomCrop] = useState(false);
  const [showCustomSoil, setShowCustomSoil] = useState(false);
  const [showCustomIrr, setShowCustomIrr] = useState(false);
  const [showAddLandConfirm, setShowAddLandConfirm] = useState(false);

  function handleChange<K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  // Hydration-safe user code
  const [userCode, setUserCode] = useState<string | null>(null);
  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem("agrisense.user") : null;
      if (raw) setUserCode(JSON.parse(raw)?.code ?? null);
    } catch {}
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const code = userCode;
      if (!code) {
        setMessage("Missing user code. Please sign in again.");
        setSaving(false);
        return;
      }
      const resp = await fetch("/api/profile/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          farmerName: form.farmerName,
          phone: form.phone,
          gps: form.gps,
          landId: form.landId,
          landSize: form.landSize,
          landUnit: form.landUnit,
          cropType: form.cropType,
          soilType: form.soilType,
          irrigation: form.irrigation,
          language: form.language,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Failed to save");
      setMessage("Profile updated");
      setIsEditing(false);
      setInitialForm(form);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save profile";
      setMessage(msg);
    } finally {
      setSaving(false);
    }
  }

  // Load existing profile
  useEffect(() => {
    const code = userCode;
    if (!code) return;
    (async () => {
      try {
        const r = await fetch(`/api/profile/get?code=${encodeURIComponent(code)}`);
        const d = await r.json();
        if (r.ok) {
          const p = d?.profile || {};
          setForm((f) => ({
            ...f,
            farmerName: p.farmerName ?? f.farmerName,
            phone: p.phone ?? f.phone,
            gps: p.gps ?? f.gps,
            landId: p.landId ?? f.landId,
            landSize: p.landSize ?? f.landSize,
            landUnit: p.landUnit ?? f.landUnit,
            cropType: p.cropType ?? f.cropType,
            soilType: p.soilType ?? f.soilType,
            irrigation: p.irrigation ?? f.irrigation,
            language: p.language === "ml" ? "ml" : "en",
          }));
          setInitialForm({
            farmerName: p.farmerName ?? "",
            phone: p.phone ?? "",
            gps: p.gps ?? "",
            landId: p.landId ?? null,
            landSize: p.landSize ?? "",
            landUnit: p.landUnit ?? "acre",
            cropType: p.cropType ?? "",
            soilType: p.soilType ?? "",
            irrigation: p.irrigation ?? "",
            language: p.language === "ml" ? "ml" : "en",
          });
          setIsEditing(false);
        }
      } catch {}
    })();
  }, [userCode]);

  // When a land is selected, auto-fill its size and sync with active land
  useEffect(() => {
    if (!form.landId) return;
    const l = lands.find((x) => x.id === form.landId);
    if (l && l.sizeValue && l.sizeUnit) {
      setForm((f) => ({ ...f, landSize: String(l.sizeValue), landUnit: l.sizeUnit! }));
    }
  }, [form.landId, lands]);

  // Sync form landId with activeLandId when it changes externally (one-way sync)
  useEffect(() => {
    if (activeLandId && activeLandId !== form.landId) {
      setForm((f) => ({ ...f, landId: activeLandId }));
    }
  }, [activeLandId]); // Only depend on activeLandId to avoid circular updates

  // Handle land selection from dropdown
  const handleLandSelection = (landId: string | null) => {
    handleChange("landId", landId);
    // Update global active land state
    setActiveLandId(landId);
  };

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

  function handleAddLandClick() {
    setShowAddLandConfirm(true);
  }

  function handleConfirmAddLand() {
    setShowAddLandConfirm(false);
    onNavigateToLandManagement();
  }

  function handleCancelAddLand() {
    setShowAddLandConfirm(false);
  }

  // Hydration-safe code display comes from userCode state

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Farmer & Farm Profiling</h2>
        {userCode && (
          <div className="px-3 py-1 rounded-full text-sm border border-neutral-300 bg-neutral-50">Code: <span className="font-semibold">{userCode}</span></div>
        )}
      </div>
      <div className="max-h-[70vh] md:max-h-[75vh] overflow-y-auto pr-1">
      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6">
        {/* Farmer Info */}
        <div className="rounded-2xl border border-emerald-200 shadow-sm p-6 flex flex-col gap-4 bg-gradient-to-br from-emerald-50 to-white animate-fade-up hover-lift">
          <div className="text-sm font-semibold text-emerald-900 flex items-center gap-2"><span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />Farmer Info</div>
          <div className="h-px w-full bg-emerald-200/70" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm text-neutral-600">Farmer Name</label>
              <input disabled={!isEditing} className="border border-neutral-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 disabled:bg-neutral-100" value={form.farmerName} onChange={(e) => handleChange("farmerName", e.target.value)} required />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm text-neutral-600">Phone</label>
              <input disabled={!isEditing} className="border border-neutral-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 disabled:bg-neutral-100" value={form.phone} onChange={(e) => handleChange("phone", e.target.value)} required />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm text-neutral-600">GPS</label>
            <div className="flex gap-2">
              <input disabled={!isEditing} className="min-w-[220px] flex-1 border border-neutral-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 disabled:bg-neutral-100" value={form.gps} onChange={(e) => handleChange("gps", e.target.value)} placeholder="lat, lng" />
              <button type="button" disabled={!isEditing} onClick={captureGPS} className="px-3 py-2 rounded-xl border border-neutral-300 hover:bg-neutral-50 disabled:opacity-50">Use GPS</button>
            </div>
          </div>
        </div>

         {/* Land Selection */}
         <div className="rounded-2xl border border-emerald-200 shadow-sm p-6 flex flex-col gap-4 bg-gradient-to-br from-emerald-50 to-white animate-fade-up hover-lift">
           <div className="flex items-center justify-between">
             <div className="text-sm font-semibold text-emerald-900 flex items-center gap-2"><span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />Active Land</div>
             <div className="flex items-center gap-2">
               {activeLandId && (
                 <div className="px-2 py-1 rounded-md text-xs bg-emerald-100 text-emerald-700">
                   Currently Selected
                 </div>
               )}
               <button
                 onClick={handleAddLandClick}
                 className="px-3 py-1 rounded-md text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
               >
                 + Add Land
               </button>
             </div>
           </div>
           <div className="flex flex-col gap-2">
             <label className="text-sm text-neutral-600">Select Land for Advisory</label>
             <select 
               className="border border-neutral-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/60" 
               value={form.landId ?? ""} 
               onChange={(e) => {
                 const landId = e.target.value || null;
                 handleLandSelection(landId);
               }}
             >
               <option value="">— Choose from My Lands —</option>
               {lands.map((l) => (
                 <option key={l.id} value={l.id}>
                   {l.name} ({l.sizeValue} {l.sizeUnit}, {l.crop})
                 </option>
               ))}
             </select>
           </div>
           {form.landId && (
             <div className="p-3 bg-neutral-50 rounded-lg">
               <div className="text-sm text-neutral-600">Land Details:</div>
               <div className="text-sm">
                 Size: {form.landSize} {form.landUnit} • 
                 Crop: {form.cropType || 'Not set'} • 
                 Soil: {form.soilType || 'Not set'}
               </div>
             </div>
           )}
         </div>

        {/* Agronomy */}
        <div className="rounded-2xl border border-emerald-200 shadow-sm p-6 flex flex-col gap-4 bg-gradient-to-br from-emerald-50 to-white animate-fade-up hover-lift">
          <div className="text-sm font-semibold text-emerald-900 flex items-center gap-2"><span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />Agronomy</div>
          <div className="h-px w-full bg-emerald-200/70" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="flex flex-col gap-2">
              <label className="text-sm text-neutral-600">Preferred Language</label>
              <select disabled={!isEditing} className="border border-neutral-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 disabled:bg-neutral-100" value={form.language} onChange={(e) => handleChange("language", e.target.value as "en" | "ml") }>
                <option value="en">English</option>
                <option value="ml">Malayalam</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm text-neutral-600">Crop Type</label>
              <select className="border border-neutral-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/60" value={keralaCrops.includes(form.cropType.toLowerCase()) ? form.cropType.toLowerCase() : ""} onChange={(e) => handleChange("cropType", e.target.value)}>
                <option value="">— Select a crop —</option>
                {keralaCrops.map((c) => (<option key={c} value={c}>{c}</option>))}
              </select>
              {!showCustomCrop ? (
                <button type="button" className="self-start text-sm underline text-emerald-700" onClick={() => setShowCustomCrop(true)}>+ Add Crop</button>
              ) : (
                <input className="border border-neutral-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/60" placeholder="Type custom crop" value={form.cropType} onChange={(e) => handleChange("cropType", e.target.value)} />
              )}
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm text-neutral-600">Soil Type</label>
              <select className="border border-neutral-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/60" value={soilTypes.includes(form.soilType.toLowerCase()) ? form.soilType.toLowerCase() : ""} onChange={(e) => handleChange("soilType", e.target.value)}>
                <option value="">— Select a soil type —</option>
                {soilTypes.map((s) => (<option key={s} value={s}>{s}</option>))}
              </select>
              {!showCustomSoil ? (
                <button type="button" className="self-start text-sm underline text-emerald-700" onClick={() => setShowCustomSoil(true)}>+ Add Soil Type</button>
              ) : (
                <input className="border border-neutral-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/60" placeholder="Type custom soil" value={form.soilType} onChange={(e) => handleChange("soilType", e.target.value)} />
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="flex flex-col gap-2">
              <label className="text-sm text-neutral-600">Irrigation Methods</label>
              <select className="border border-neutral-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/60" value={irrigationMethods.includes(form.irrigation.toLowerCase()) ? form.irrigation.toLowerCase() : ""} onChange={(e) => handleChange("irrigation", e.target.value)}>
                <option value="">— Select method —</option>
                {irrigationMethods.map((m) => (<option key={m} value={m}>{m}</option>))}
              </select>
              {!showCustomIrr ? (
                <button type="button" className="self-start text-sm underline text-emerald-700" onClick={() => setShowCustomIrr(true)}>+ Add Irrigation Method</button>
              ) : (
                <input className="border border-neutral-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/60" placeholder="Type custom irrigation" value={form.irrigation} onChange={(e) => handleChange("irrigation", e.target.value)} />
              )}
            </div>
          </div>
        </div>

         <div className="flex items-center gap-3">
           {!isEditing ? (
             <button type="button" onClick={() => setIsEditing(true)} className="px-5 py-2.5 rounded-xl border border-neutral-300 hover:bg-neutral-50">Edit Profile</button>
           ) : (
             <>
               <button type="submit" disabled={saving} className="px-5 py-2.5 rounded-xl bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-50">{saving ? "Saving..." : "Update Profile"}</button>
               <button type="button" onClick={() => { if (initialForm) setForm(initialForm); setIsEditing(false); }} className="px-5 py-2.5 rounded-xl border border-neutral-300 hover:bg-neutral-50">Cancel</button>
             </>
           )}
           {message && <span className="text-sm text-neutral-600">{message}</span>}
         </div>
       </form>
      </div>

       {/* Add Land Confirmation Modal */}
       {showAddLandConfirm && (
         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
           <div className="bg-white rounded-xl p-6 max-w-md mx-4">
             <h3 className="text-lg font-semibold mb-3">Add New Land</h3>
             <p className="text-sm text-neutral-600 mb-4">
               You'll be redirected to the Land Management section to add a new land. 
               After adding the land, you can return here to select it for advisory.
             </p>
             <div className="flex gap-3">
               <button
                 onClick={handleConfirmAddLand}
                 className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
               >
                 Go to Land Management
               </button>
               <button
                 onClick={handleCancelAddLand}
                 className="px-4 py-2 bg-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-400 transition-colors"
               >
                 Cancel
               </button>
             </div>
           </div>
         </div>
       )}
     </div>
   );
 }


