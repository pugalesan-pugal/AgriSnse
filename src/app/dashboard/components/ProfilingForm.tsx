"use client";

import { useEffect, useMemo, useState } from "react";
import { useLand } from "../contexts/LandContext";
import { Land } from "./types";
import { useLanguage } from "@/contexts/LanguageContext";

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
  const { t, language } = useLanguage();
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

  const keralaCrops = useMemo(() => [
    { value: "paddy", label: t("paddy") },
    { value: "banana", label: t("banana") },
    { value: "pepper", label: t("pepper") },
    { value: "coconut", label: t("coconut") },
    { value: "tapioca", label: "Tapioca" },
    { value: "vegetables", label: t("vegetables") }
  ], [t, language]);
  const soilTypes = useMemo(() => [
    { value: "laterite", label: "Laterite" },
    { value: "alluvial", label: "Alluvial" },
    { value: "red loam", label: "Red Loam" },
    { value: "clay", label: t("clay") }
  ], [t, language]);
  const irrigationMethods = useMemo(() => [
    { value: "drip", label: t("drip") },
    { value: "sprinkler", label: t("sprinkler") },
    { value: "canal", label: "Canal" },
    { value: "rainfed", label: t("rainfed") }
  ], [t, language]);

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
      () => setMessage(language === "ml" ? "GPS ലഭിക്കാൻ കഴിയില്ല" : "Unable to fetch GPS")
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
    <div className="flex flex-col gap-6 lg:gap-8 max-w-full lg:max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{t("farmerProfiling")}</h2>
            <p className="text-sm text-gray-600">Manage your farming profile and land details</p>
          </div>
        </div>
        {userCode && (
          <div className="px-4 py-2 rounded-full text-sm border border-emerald-200 bg-emerald-50 text-emerald-700 font-medium">
            {language === "ml" ? "കോഡ്:" : "Code:"} <span className="font-bold">{userCode}</span>
          </div>
        )}
      </div>
      
      <div className="max-h-[70vh] md:max-h-[75vh] overflow-y-auto pr-1 scroll-smooth">
      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-8">
        {/* Farmer Info */}
        <div className="rounded-3xl border border-emerald-200 shadow-lg p-8 flex flex-col gap-6 bg-gradient-to-br from-emerald-50 via-white to-emerald-50/30 hover:shadow-xl transition-all duration-300">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-emerald-900">{t("farmerInfo")}</h3>
              <p className="text-sm text-emerald-700">Personal details and contact information</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                {t("name")}
              </label>
              <input 
                disabled={!isEditing} 
                className="w-full border border-gray-300 rounded-xl px-3 lg:px-4 py-2 lg:py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 disabled:bg-gray-50 transition-all duration-200 text-sm lg:text-base" 
                value={form.farmerName} 
                onChange={(e) => handleChange("farmerName", e.target.value)} 
                required 
                placeholder="Enter your full name"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                {t("phone")}
              </label>
              <input 
                disabled={!isEditing} 
                className="w-full border border-gray-300 rounded-xl px-3 lg:px-4 py-2 lg:py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 disabled:bg-gray-50 transition-all duration-200 text-sm lg:text-base" 
                value={form.phone} 
                onChange={(e) => handleChange("phone", e.target.value)} 
                required 
                placeholder="Enter your phone number"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              GPS Location
            </label>
            <div className="flex gap-3">
              <input 
                disabled={!isEditing} 
                className="flex-1 border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 disabled:bg-gray-50 transition-all duration-200" 
                value={form.gps} 
                onChange={(e) => handleChange("gps", e.target.value)} 
                placeholder={language === "ml" ? "അക്ഷാംശം, രേഖാംശം" : "Latitude, Longitude"} 
              />
              <button 
                type="button" 
                disabled={!isEditing} 
                onClick={captureGPS} 
                className="px-6 py-3 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 transition-all duration-200 flex items-center gap-2 font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {language === "ml" ? "GPS ഉപയോഗിക്കുക" : "Use GPS"}
              </button>
            </div>
          </div>
        </div>

         {/* Land Selection */}
         <div className="rounded-3xl border border-blue-200 shadow-lg p-8 flex flex-col gap-6 bg-gradient-to-br from-blue-50 via-white to-blue-50/30 hover:shadow-xl transition-all duration-300">
           <div className="flex items-center justify-between">
             <div className="flex items-center gap-3">
               <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                 <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                 </svg>
               </div>
               <div>
                 <h3 className="text-lg font-bold text-blue-900">Active Land</h3>
                 <p className="text-sm text-blue-700">Select the land for personalized advisory</p>
               </div>
             </div>
             <div className="flex items-center gap-3">
               {activeLandId && (
                 <div className="px-3 py-1 rounded-full text-xs bg-green-100 text-green-700 font-medium flex items-center gap-1">
                   <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                     <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                   </svg>
                   Currently Selected
                 </div>
               )}
               <button
                 onClick={handleAddLandClick}
                 className="px-4 py-2 rounded-xl text-sm bg-blue-100 text-blue-700 hover:bg-blue-200 transition-all duration-200 flex items-center gap-2 font-medium"
               >
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                 </svg>
                 Add Land
               </button>
             </div>
           </div>
           
           <div className="space-y-3">
             <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
               <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
               </svg>
               Select Land for Advisory
             </label>
             <select 
               className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/60 transition-all duration-200 bg-white" 
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
             <div className="p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl border border-green-200">
               <div className="flex items-center gap-2 mb-2">
                 <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                 </svg>
                 <span className="text-sm font-semibold text-green-800">Land Details</span>
               </div>
               <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                 <div className="flex items-center gap-2">
                   <span className="text-gray-600">Size:</span>
                   <span className="font-medium text-gray-900">{form.landSize} {form.landUnit}</span>
                 </div>
                 <div className="flex items-center gap-2">
                   <span className="text-gray-600">Crop:</span>
                   <span className="font-medium text-gray-900">{form.cropType || 'Not set'}</span>
                 </div>
                 <div className="flex items-center gap-2">
                   <span className="text-gray-600">Soil:</span>
                   <span className="font-medium text-gray-900">{form.soilType || 'Not set'}</span>
                 </div>
               </div>
             </div>
           )}
         </div>

        {/* Agronomy */}
        <div className="rounded-3xl border border-purple-200 shadow-lg p-8 flex flex-col gap-6 bg-gradient-to-br from-purple-50 via-white to-purple-50/30 hover:shadow-xl transition-all duration-300">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-purple-900">Agronomy Settings</h3>
              <p className="text-sm text-purple-700">Crop preferences and farming methods</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
            <div className="space-y-3">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                </svg>
                Preferred Language
              </label>
              <select 
                disabled={!isEditing} 
                className="w-full border border-gray-300 rounded-xl px-3 lg:px-4 py-2 lg:py-3 focus:outline-none focus:ring-2 focus:ring-purple-500/60 disabled:bg-gray-50 transition-all duration-200 text-sm lg:text-base" 
                value={form.language} 
                onChange={(e) => handleChange("language", e.target.value as "en" | "ml") }
              >
                <option value="en">English</option>
                <option value="ml">Malayalam</option>
              </select>
            </div>
            
            <div className="space-y-3">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                Crop Type
              </label>
              <select 
                className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500/60 transition-all duration-200" 
                value={keralaCrops.find(c => c.value === form.cropType.toLowerCase())?.value || ""} 
                onChange={(e) => handleChange("cropType", e.target.value)}
              >
                <option value="">— {language === "ml" ? "വിള തിരഞ്ഞെടുക്കുക" : "Select a crop"} —</option>
                {keralaCrops.map((c) => (<option key={c.value} value={c.value}>{c.label}</option>))}
              </select>
              {!showCustomCrop ? (
                <button type="button" className="text-sm text-purple-600 hover:text-purple-800 font-medium flex items-center gap-1" onClick={() => setShowCustomCrop(true)}>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  {language === "ml" ? "വിള ചേർക്കുക" : "Add Crop"}
                </button>
              ) : (
                <input 
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500/60 transition-all duration-200" 
                  placeholder={language === "ml" ? "കസ്റ്റം വിള ടൈപ്പ് ചെയ്യുക" : "Type custom crop"} 
                  value={form.cropType} 
                  onChange={(e) => handleChange("cropType", e.target.value)} 
                />
              )}
            </div>
            
            <div className="space-y-3">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
                Soil Type
              </label>
              <select 
                className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500/60 transition-all duration-200" 
                value={soilTypes.find(s => s.value === form.soilType.toLowerCase())?.value || ""} 
                onChange={(e) => handleChange("soilType", e.target.value)}
              >
                <option value="">— {language === "ml" ? "മണ്ണിന്റെ തരം തിരഞ്ഞെടുക്കുക" : "Select a soil type"} —</option>
                {soilTypes.map((s) => (<option key={s.value} value={s.value}>{s.label}</option>))}
              </select>
              {!showCustomSoil ? (
                <button type="button" className="text-sm text-purple-600 hover:text-purple-800 font-medium flex items-center gap-1" onClick={() => setShowCustomSoil(true)}>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  {language === "ml" ? "മണ്ണ് തരം ചേർക്കുക" : "Add Soil Type"}
                </button>
              ) : (
                <input 
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500/60 transition-all duration-200" 
                  placeholder={language === "ml" ? "കസ്റ്റം മണ്ണ് ടൈപ്പ് ചെയ്യുക" : "Type custom soil"} 
                  value={form.soilType} 
                  onChange={(e) => handleChange("soilType", e.target.value)} 
                />
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
            <div className="space-y-3">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
                Irrigation Methods
              </label>
              <select 
                className="w-full border border-gray-300 rounded-xl px-3 lg:px-4 py-2 lg:py-3 focus:outline-none focus:ring-2 focus:ring-purple-500/60 transition-all duration-200 text-sm lg:text-base" 
                value={irrigationMethods.find(m => m.value === form.irrigation.toLowerCase())?.value || ""} 
                onChange={(e) => handleChange("irrigation", e.target.value)}
              >
                <option value="">— {language === "ml" ? "രീതി തിരഞ്ഞെടുക്കുക" : "Select method"} —</option>
                {irrigationMethods.map((m) => (<option key={m.value} value={m.value}>{m.label}</option>))}
              </select>
              {!showCustomIrr ? (
                <button type="button" className="text-sm text-purple-600 hover:text-purple-800 font-medium flex items-center gap-1" onClick={() => setShowCustomIrr(true)}>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  {language === "ml" ? "ജലസേചന രീതി ചേർക്കുക" : "Add Irrigation Method"}
                </button>
              ) : (
                <input 
                  className="w-full border border-gray-300 rounded-xl px-3 lg:px-4 py-2 lg:py-3 focus:outline-none focus:ring-2 focus:ring-purple-500/60 transition-all duration-200 text-sm lg:text-base" 
                  placeholder={language === "ml" ? "കസ്റ്റം ജലസേചനം ടൈപ്പ് ചെയ്യുക" : "Type custom irrigation"} 
                  value={form.irrigation} 
                  onChange={(e) => handleChange("irrigation", e.target.value)} 
                />
              )}
            </div>
          </div>
        </div>

         {/* Action Buttons */}
         <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 lg:p-6 bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl border border-gray-200">
           <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 lg:gap-4">
             {!isEditing ? (
               <button 
                 type="button" 
                 onClick={() => setIsEditing(true)} 
                 className="px-4 lg:px-6 py-2 lg:py-3 rounded-xl border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 flex items-center gap-2 font-medium shadow-sm text-sm lg:text-base"
               >
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                 </svg>
                 {t("edit")} Profile
               </button>
             ) : (
               <div className="flex items-center gap-3">
                 <button 
                   type="submit" 
                   disabled={saving} 
                   className="px-4 lg:px-6 py-2 lg:py-3 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-all duration-200 flex items-center gap-2 font-medium shadow-lg text-sm lg:text-base"
                 >
                   {saving ? (
                     <>
                       <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                       </svg>
                       {t("loading")}...
                     </>
                   ) : (
                     <>
                       <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                       </svg>
                       {t("save")} Profile
                     </>
                   )}
                 </button>
                 <button 
                   type="button" 
                   onClick={() => { if (initialForm) setForm(initialForm); setIsEditing(false); }} 
                   className="px-4 lg:px-6 py-2 lg:py-3 rounded-xl border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 flex items-center gap-2 font-medium shadow-sm text-sm lg:text-base"
                 >
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                   </svg>
                   {t("cancel")}
                 </button>
               </div>
             )}
           </div>
           
           {message && (
             <div className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
               message.includes('updated') || message.includes('saved') 
                 ? 'bg-green-100 text-green-700 border border-green-200' 
                 : 'bg-red-100 text-red-700 border border-red-200'
             }`}>
               {message.includes('updated') || message.includes('saved') ? (
                 <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                   <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                 </svg>
               ) : (
                 <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                   <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                 </svg>
               )}
               {message}
             </div>
           )}
         </div>
       </form>
      </div>

       {/* Add Land Confirmation Modal */}
       {showAddLandConfirm && (
         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
           <div className="bg-white rounded-xl p-6 max-w-md mx-4">
             <h3 className="text-lg font-semibold mb-3">{t("addNewLand")}</h3>
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
                 {t("cancel")}
               </button>
             </div>
           </div>
         </div>
       )}
     </div>
   );
 }


