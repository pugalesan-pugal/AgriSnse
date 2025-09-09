"use client";

import { useLand } from "../contexts/LandContext";
import { useState } from "react";

export default function ActiveLandDisplay() {
  const { activeLand, lands, setActiveLandId, isLoading } = useLand();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
        <div className="text-sm text-blue-800">Loading lands...</div>
      </div>
    );
  }

  if (!activeLand) {
    return (
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
        <div className="text-sm text-orange-800">
          <strong>No land selected.</strong> Please select a land to continue with activities and advisories.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="text-sm font-medium text-green-800">
            Currently Active Land
          </div>
          <div className="text-sm text-green-700">
            {activeLand.name} – {activeLand.size} {activeLand.unit}
            {activeLand.cropType && ` • ${activeLand.cropType}`}
          </div>
        </div>
        
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors"
          >
            Change Land
          </button>
          
          {isDropdownOpen && (
            <div className="absolute right-0 top-full mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
              <div className="p-2">
                <div className="text-xs font-medium text-gray-500 mb-2">Select a land:</div>
                {lands.map(land => (
                  <button
                    key={land.id}
                    onClick={() => {
                      setActiveLandId(land.id);
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                      land.id === activeLand.id
                        ? "bg-green-100 text-green-800"
                        : "hover:bg-gray-100 text-gray-700"
                    }`}
                  >
                    <div className="font-medium">{land.name}</div>
                    <div className="text-xs text-gray-500">
                      {land.size} {land.unit}
                      {land.cropType && ` • ${land.cropType}`}
                    </div>
                  </button>
                ))}
                {lands.length === 0 && (
                  <div className="px-3 py-2 text-sm text-gray-500">
                    No lands available. Add a land in Land Management.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
