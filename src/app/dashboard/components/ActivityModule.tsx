"use client";

import { useState, useEffect } from "react";
import { useLand } from "../contexts/LandContext";
import { Land } from "./types";
import Calendar from "./Calendar";

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
  const [items, setItems] = useState<Activity[]>([]);
  const [userCode, setUserCode] = useState<string | null>(null);

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
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Activity Tracking</h2>
        <div className="text-sm text-gray-600">
          Click on any date to add activities
        </div>
      </div>

      <div className="max-h-[70vh] md:max-h-[75vh] overflow-y-auto pr-1">
      {/* Land-specific calendar header */}
      {activeLand ? (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-3 w-3 rounded-full bg-blue-500" />
            <span className="text-sm font-semibold text-blue-800">
              Currently Viewing: {activeLand.name} Calendar
            </span>
            <span className="text-xs text-blue-600">
              ({activeLand.sizeValue} {activeLand.sizeUnit}, {activeLand.crop})
            </span>
          </div>
        </div>
      ) : (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-3 w-3 rounded-full bg-orange-500" />
            <span className="text-sm font-semibold text-orange-800">
              Please select a land to view its activity calendar.
            </span>
          </div>
        </div>
      )}

      {(!lands || lands.length === 0) && (
        <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="text-sm text-orange-800">
            <strong>No lands available.</strong> Please add a land in the Land Management section first.
          </div>
        </div>
      )}

      {activeLandId && (
        <div className="transition-all duration-300 ease-in-out">
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
      )}
      </div>
    </div>
  );
}


