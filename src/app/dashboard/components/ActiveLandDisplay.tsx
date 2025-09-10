"use client";

import { useLand } from "../contexts/LandContext";
import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function ActiveLandDisplay() {
  const { activeLand, lands, setActiveLandId, isLoading } = useLand();
  const { t, language } = useLanguage();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-blue-500 rounded flex items-center justify-center">
            <svg className="w-3 h-3 text-white animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <div className="text-xs font-medium text-blue-800">
            {t("loading")} {language === "ml" ? "ഭൂമികൾ" : "lands"}...
          </div>
        </div> 
      </div>
    );
  }

  if (!activeLand) {
    return (
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-orange-500 rounded flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div className="text-xs font-medium text-orange-800">
            {language === "ml" ? "ഭൂമി തിരഞ്ഞെടുത്തിട്ടില്ല." : "No land selected."}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1">
          <div className="w-6 h-6 bg-green-500 rounded flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-green-800">
                {activeLand.name}
              </span>
              <div className="px-1.5 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full flex items-center gap-1">
                <svg className="w-2 h-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Active
              </div>
            </div>
            <div className="text-xs text-green-600 flex items-center gap-2">
              <span>{activeLand.sizeValue} {activeLand.sizeUnit}</span>
              {activeLand.crop && <span>• {activeLand.crop}</span>}
            </div>
          </div>
        </div>
        
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="px-2 py-1 text-xs bg-white text-green-700 border border-green-200 rounded hover:bg-green-50 hover:border-green-300 transition-all duration-200 flex items-center gap-1"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
            </svg>
            Change
          </button>
          
          {isDropdownOpen && (
            <div className="absolute right-0 top-full mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-20 overflow-hidden">
              <div className="p-2">
                <div className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
                  <svg className="w-3 h-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  Select a land:
                </div>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {lands.map(land => (
                    <button
                      key={land.id}
                      onClick={() => {
                        setActiveLandId(land.id);
                        setIsDropdownOpen(false);
                      }}
                      className={`w-full text-left p-2 rounded text-xs transition-all duration-200 ${
                        land.id === activeLand.id
                          ? "bg-green-100 text-green-800 border border-green-200"
                          : "hover:bg-gray-50 text-gray-700 border border-transparent hover:border-gray-200"
                      }`}
                    >
                      <div className="font-medium">{land.name}</div>
                      <div className="text-xs text-gray-500">
                        {land.sizeValue} {land.sizeUnit}{land.crop && ` • ${land.crop}`}
                      </div>
                    </button>
                  ))}
                  {lands.length === 0 && (
                    <div className="p-2 text-xs text-gray-500 text-center">
                      No lands available. Add a land in Land Management.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
