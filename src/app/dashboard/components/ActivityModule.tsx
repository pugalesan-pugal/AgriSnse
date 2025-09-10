"use client";

import { useState, useEffect } from "react";
import { useLand } from "../contexts/LandContext";
import { Land } from "./types";
import Calendar from "./Calendar";
import { useLanguage } from "@/contexts/LanguageContext";

type Activity = {
  id: string;
  type: string;
  notes: string;
  ts: number; // epoch ms
  photoUrl?: string;
  landId?: string; // Track which land this activity belongs to
};

export default function ActivityModule() {
  const { lands = [], activeLandId } = useLand();
  const { t, language } = useLanguage();
  const [items, setItems] = useState<Activity[]>([]);
  const [userCode, setUserCode] = useState<string | null>(null);
  const [allActivities, setAllActivities] = useState<any[]>([]);
  const [showAllActivities, setShowAllActivities] = useState(false);

  // Clear local activities when switching lands
  useEffect(() => {
    console.log(`[ActivityModule] Clearing activities for land switch to: ${activeLandId}`);
    setItems([]);
  }, [activeLandId]);

  // Load user code
  useEffect(() => {
    try {
      const raw = localStorage.getItem("agrisense.user");
      if (raw) {
        const user = JSON.parse(raw);
        setUserCode(user?.code ?? null);
      }
    } catch {}
  }, []);

  // Load all activities for history view
  const loadAllActivities = async () => {
    if (!userCode) return;
    
    try {
      const resp = await fetch(`/api/activities/history?code=${userCode}&limit=100`);
      const data = await resp.json();
      if (resp.ok) {
        setAllActivities(data.activities || []);
      }
    } catch (err) {
      console.error("Failed to load all activities:", err);
    }
  };

  // Load all activities when user code is available
  useEffect(() => {
    if (userCode) {
      loadAllActivities();
    }
  }, [userCode]);

  // Function to add activity (called from Calendar component)
  const addActivity = async (activityData: {
    type: string;
    notes: string;
    photo?: File;
    date: Date;
  }) => {
    if (!userCode || !activeLandId) {
      alert("Please select a land first");
      return;
    }
    
    try {
      // Upload photo if provided
      let photoUrl: string | undefined = undefined;
      if (activityData.photo) {
        const photoFormData = new FormData();
        photoFormData.append("photo", activityData.photo);
        photoFormData.append("code", userCode);
        
        const photoResp = await fetch("/api/activities/upload-photo", {
          method: "POST",
          body: photoFormData,
        });
        
        if (photoResp.ok) {
          const photoResult = await photoResp.json();
          photoUrl = photoResult.photoUrl;
        } else {
          console.warn("Failed to upload photo, continuing without it");
        }
      }

      // Save to Firestore first to get the proper ID
      const resp = await fetch("/api/activities/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: userCode,
          landId: activeLandId,
          type: activityData.type,
          notes: activityData.notes,
          photoUrl: photoUrl,
          createdAt: activityData.date.getTime() // Store the actual activity date
        }),
      });

      if (!resp.ok) {
        const data = await resp.json();
        throw new Error(data.error || "Failed to save activity");
      }

      const result = await resp.json();
      
      // Create local entry with the ID from the server
      const entry: Activity = {
        id: result.activityId,
        type: activityData.type || "Activity",
        notes: activityData.notes,
        ts: activityData.date.getTime(),
        photoUrl,
        landId: activeLandId, // Track which land this activity belongs to
      };

      setItems((prev) => [entry, ...prev]);
      console.log(`[ActivityModule] Added activity for land ${activeLandId}:`, entry);
      return entry;
    } catch (err) {
      console.error("Failed to save activity:", err);
      alert("Failed to save activity");
      throw err;
    }
  };

  // Function to update activity (called from Calendar component)
  const updateActivity = async (activityId: string, updates: {
    type?: string;
    notes?: string;
    photo?: File;
  }) => {
    if (!userCode) return;
    
    try {
      let photoUrl: string | undefined = undefined;
      if (updates.photo) {
        const photoFormData = new FormData();
        photoFormData.append("photo", updates.photo);
        photoFormData.append("code", userCode);
        
        const photoResp = await fetch("/api/activities/upload-photo", {
          method: "POST",
          body: photoFormData,
        });
        
        if (photoResp.ok) {
          const photoResult = await photoResp.json();
          photoUrl = photoResult.photoUrl;
        } else {
          console.warn("Failed to upload photo, continuing without it");
        }
      }

      // Update in Firestore
      const resp = await fetch("/api/activities/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: userCode,
          activityId,
          type: updates.type,
          notes: updates.notes,
          photoUrl: photoUrl,
        }),
      });

      if (!resp.ok) {
        const data = await resp.json();
        throw new Error(data.error || "Failed to update activity");
      }

      // Update local state
      setItems((prev) => prev.map(item => 
        item.id === activityId 
          ? { 
              ...item, 
              type: updates.type || item.type,
              notes: updates.notes || item.notes,
              photoUrl: photoUrl || item.photoUrl
            }
          : item
      ));
    } catch (err) {
      console.error("Failed to update activity:", err);
      alert("Failed to update activity");
      throw err;
    }
  };

  // Function to delete activity (called from Calendar component)
  const deleteActivity = async (activityId: string) => {
    if (!userCode) return;
    
    try {
      const resp = await fetch("/api/activities/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: userCode,
          activityId,
        }),
      });

      if (!resp.ok) {
        const data = await resp.json();
        throw new Error(data.error || "Failed to delete activity");
      }

      // Update local state
      setItems((prev) => prev.filter(item => item.id !== activityId));
    } catch (err) {
      console.error("Failed to delete activity:", err);
      alert("Failed to delete activity");
      throw err;
    }
  };

  // Get active land details
  const activeLand = lands.find(land => land.id === activeLandId);

  // Filter local activities to only show activities for the current land
  const filteredLocalActivities = items.filter(activity => activity.landId === activeLandId);
  
  // Debug logging
  useEffect(() => {
    console.log(`[ActivityModule] Land: ${activeLandId}, Total activities: ${items.length}, Filtered: ${filteredLocalActivities.length}`);
  }, [activeLandId, items.length, filteredLocalActivities.length]);

  return (
    <div className="h-screen w-full flex flex-col bg-gradient-to-br from-slate-50 to-white overflow-hidden">
      {/* Header Section */}
      <div className="flex-shrink-0 p-6 pb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">{t("activityTracking")}</h2>
              <p className="text-sm text-gray-600">Track and manage your farming activities</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAllActivities(!showAllActivities)}
              className={`px-4 py-2 rounded-xl font-medium transition-all duration-200 flex items-center gap-2 ${
                showAllActivities 
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg hover:shadow-xl' 
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 shadow-sm hover:shadow-md'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {showAllActivities ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                )}
              </svg>
              {showAllActivities ? 'Show Calendar' : 'Show All Activities'}
            </button>
            <div className="text-sm text-gray-500 bg-gray-100 px-3 py-2 rounded-lg">
              Click on any date to add activities
            </div>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="flex-1 px-6 pb-6 overflow-y-auto">
        {/* Land Information Card */}
        {activeLand ? (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6 mb-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-blue-800 mb-1">
                  Currently Viewing: {activeLand.name}
                </h3>
                <div className="flex items-center gap-4 text-sm text-blue-600">
                  <div className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                    {activeLand.sizeValue} {activeLand.sizeUnit}
                  </div>
                  <div className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    {activeLand.crop}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-blue-500 mb-1">Activity Calendar</div>
                <div className="text-sm font-semibold text-blue-800">
                  {filteredLocalActivities.length} activities
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-2xl p-6 mb-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl flex items-center justify-center shadow-md">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-orange-800 mb-1">
                  No Land Selected
                </h3>
                <p className="text-sm text-orange-600">
                  Please select a land to view its activity calendar
                </p>
              </div>
            </div>
          </div>
        )}

        {/* No Lands Warning */}
        {(!lands || lands.length === 0) && (
          <div className="bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-2xl p-6 mb-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-pink-600 rounded-xl flex items-center justify-center shadow-md">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-red-800 mb-1">
                  No Lands Available
                </h3>
                <p className="text-sm text-red-600">
                  Please add a land in the Land Management section first
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        {showAllActivities ? (
          <div className="space-y-6">
            {/* History Header */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-md">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-green-800 mb-1">All Activity History</h3>
                  <p className="text-sm text-green-600">
                    Showing all activities across all your lands ({allActivities.length} total)
                  </p>
                </div>
              </div>
            </div>
            
            {/* Activities List */}
            {allActivities.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">No Activities Found</h3>
                <p className="text-sm text-gray-500 mb-4">Start by adding activities to your lands</p>
                <button
                  onClick={() => setShowAllActivities(false)}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all duration-200"
                >
                  Go to Calendar
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {allActivities.map((activity, index) => {
                  const land = lands.find(l => l.id === activity.landId);
                  const activityDate = activity.activityDate ? 
                    new Date(activity.activityDate.seconds ? activity.activityDate.seconds * 1000 : activity.activityDate) :
                    new Date(activity.createdAt?.seconds ? activity.createdAt.seconds * 1000 : activity.createdAt);
                  
                  return (
                    <div 
                      key={activity.id} 
                      className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-200 group"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0">
                          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">
                              {activity.type}
                            </h4>
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {activityDate.toLocaleDateString()}
                            </span>
                          </div>
                          {activity.notes && (
                            <p className="text-sm text-gray-700 mb-3 leading-relaxed">{activity.notes}</p>
                          )}
                          <div className="flex items-center gap-6 text-sm">
                            <div className="flex items-center gap-2 text-gray-600">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z" />
                              </svg>
                              <span className="font-medium">{land?.name || 'Unknown Land'}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-600">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                              </svg>
                              <span>{land?.crop || 'Unknown Crop'}</span>
                            </div>
                            {activity.photoUrl && (
                              <div className="flex items-center gap-2 text-blue-600">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <span className="font-medium">Photo attached</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          activeLandId && (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
              <Calendar 
                lands={lands}
                activeLandId={activeLandId}
                onLandSelect={() => {}} // Land selection is handled by global context
                userCode={userCode}
                localActivities={filteredLocalActivities}
                onAddActivity={addActivity}
                onUpdateActivity={updateActivity}
                onDeleteActivity={deleteActivity}
              />
            </div>
          )
        )}
      </div>
    </div>
  );
}


