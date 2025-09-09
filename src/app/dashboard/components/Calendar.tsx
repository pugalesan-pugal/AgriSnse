"use client";

import { useState, useEffect, useMemo } from "react";
import { Land } from "./types";

type ActivityLog = {
  id: string;
  farmerId: string;
  landId: string;
  type: string;
  notes?: string;
  photoUrl?: string;
  createdAt: number;
  activityDate?: number; // The actual date when the activity occurred
};

type LocalActivity = {
  id: string;
  type: string;
  notes: string;
  ts: number;
  photoUrl?: string;
  landId?: string; // Track which land this activity belongs to
};

type CalendarProps = {
  lands?: Land[];
  activeLandId: string | null;
  onLandSelect: (landId: string | null) => void;
  userCode: string | null;
  localActivities?: LocalActivity[];
  onAddActivity?: (activityData: {
    type: string;
    notes: string;
    photo?: File;
    date: Date;
  }) => Promise<LocalActivity>;
  onUpdateActivity?: (activityId: string, updates: {
    type?: string;
    notes?: string;
    photo?: File;
  }) => Promise<void>;
  onDeleteActivity?: (activityId: string) => Promise<void>;
};

type CalendarView = "month" | "week";

type ActivityFormData = {
  type: string;
  notes: string;
  photo?: File;
};

export default function Calendar({ 
  lands = [], 
  activeLandId, 
  onLandSelect, 
  userCode, 
  localActivities = [],
  onAddActivity,
  onUpdateActivity,
  onDeleteActivity
}: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<CalendarView>("month");
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalDate, setModalDate] = useState<Date | null>(null);
  const [editingActivity, setEditingActivity] = useState<ActivityLog | null>(null);
  const [formData, setFormData] = useState<ActivityFormData>({
    type: "",
    notes: "",
    photo: undefined
  });
  const [saving, setSaving] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Load activities for the current month and selected land
  useEffect(() => {
    if (!userCode) return;
    loadActivities();
  }, [userCode, currentDate, activeLandId]);

  // Handle adding activity from calendar date
  const handleAddActivity = (date: Date) => {
    if (!activeLandId) {
      alert("Please select a land first");
      return;
    }
    setModalDate(date);
    setEditingActivity(null);
    setFormData({ type: "", notes: "", photo: undefined });
    setShowAddModal(true);
  };

  // Handle editing activity
  const handleEditActivity = (activity: ActivityLog) => {
    setEditingActivity(activity);
    setFormData({
      type: activity.type,
      notes: activity.notes || "",
      photo: undefined
    });
    setShowAddModal(true);
  };

  // Handle saving activity
  const handleSaveActivity = async () => {
    if (!formData.type.trim()) {
      alert("Please select an activity type");
      return;
    }

    setSaving(true);
    try {
      if (editingActivity && onUpdateActivity) {
        await onUpdateActivity(editingActivity.id, formData);
      } else if (modalDate && onAddActivity) {
        await onAddActivity({
          ...formData,
          date: modalDate
        });
      }
      setShowAddModal(false);
      setFormData({ type: "", notes: "", photo: undefined });
      setEditingActivity(null);
      setModalDate(null);
    } catch (err) {
      console.error("Failed to save activity:", err);
    } finally {
      setSaving(false);
    }
  };

  // Handle deleting activity
  const handleDeleteActivity = async (activityId: string) => {
    if (!onDeleteActivity) return;
    
    if (confirm("Are you sure you want to delete this activity?")) {
      try {
        await onDeleteActivity(activityId);
      } catch (err) {
        console.error("Failed to delete activity:", err);
      }
    }
  };

  async function loadActivities() {
    if (!userCode || !activeLandId) {
      setActivities([]);
      return;
    }
    
    setIsTransitioning(true);
    setLoading(true);
    try {
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      
      const params = new URLSearchParams({
        code: userCode,
        start: startOfMonth.toISOString(),
        end: endOfMonth.toISOString(),
        landId: activeLandId // Always filter by the selected land
      });

      const resp = await fetch(`/api/activities/get?${params}`);
      const data = await resp.json();
      if (resp.ok) {
        setActivities(data.activities || []);
      }
    } catch (err) {
      console.error("Failed to load activities:", err);
    } finally {
      setLoading(false);
      // Add a small delay for smooth transition
      setTimeout(() => setIsTransitioning(false), 300);
    }
  }

  // Get activities for a specific date (combines local and database activities)
  // Only shows activities for the currently selected land
  const getActivitiesForDate = (date: Date) => {
    const dateStr = date.toDateString();
    
    // Get database activities for the selected land only
    const dbActivities = activities.filter(activity => {
      // Use activityDate if available, otherwise fall back to createdAt
      const activityDate = activity.activityDate ? new Date(activity.activityDate) : new Date(activity.createdAt);
      return activityDate.toDateString() === dateStr && activity.landId === activeLandId;
    });
    
    // Get local activities (recently added) for the selected land only
    const localActivitiesForDate = localActivities.filter(activity => {
      const activityDate = new Date(activity.ts);
      return activityDate.toDateString() === dateStr && activity.landId === activeLandId;
    });
    
    // Convert local activities to match ActivityLog format
    const convertedLocalActivities: ActivityLog[] = localActivitiesForDate.map(local => ({
      id: local.id,
      farmerId: userCode || "",
      landId: activeLandId || "",
      type: local.type,
      notes: local.notes,
      photoUrl: local.photoUrl,
      createdAt: local.ts
    }));
    
    // Combine and remove duplicates (local activities take precedence)
    const allActivities = [...dbActivities, ...convertedLocalActivities];
    const uniqueActivities = allActivities.filter((activity, index, self) => 
      index === self.findIndex(a => a.id === activity.id)
    );
    
    return uniqueActivities;
  };

  // Get filtered activities based on search term (includes both local and database activities)
  // Only shows activities for the currently selected land
  const filteredActivities = useMemo(() => {
    // Filter database activities by selected land
    const dbActivitiesForLand = activities.filter(activity => activity.landId === activeLandId);
    
    // Convert local activities to match ActivityLog format (only for current land)
    const convertedLocalActivities: ActivityLog[] = localActivities
      .filter(local => local.landId === activeLandId) // Additional safety check
      .map(local => ({
        id: local.id,
        farmerId: userCode || "",
        landId: activeLandId || "",
        type: local.type,
        notes: local.notes,
        photoUrl: local.photoUrl,
        createdAt: local.ts
      }));
    
    const allActivities = [...dbActivitiesForLand, ...convertedLocalActivities];
    const uniqueActivities = allActivities.filter((activity, index, self) => 
      index === self.findIndex(a => a.id === activity.id)
    );
    
    let filtered = uniqueActivities;
    
    if (searchTerm) {
      filtered = filtered.filter(activity => 
        activity.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        activity.notes?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return filtered;
  }, [activities, localActivities, searchTerm, userCode, activeLandId]);

  // Calendar navigation
  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === "prev") {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
  };

  const navigateWeek = (direction: "prev" | "next") => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      const days = direction === "prev" ? -7 : 7;
      newDate.setDate(newDate.getDate() + days);
      return newDate;
    });
  };

  // Get calendar days for current view
  const getCalendarDays = () => {
    if (view === "month") {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const startDate = new Date(firstDay);
      startDate.setDate(startDate.getDate() - firstDay.getDay());
      
      const days = [];
      for (let i = 0; i < 42; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        days.push(date);
      }
      return days;
    } else {
      // Week view
      const startOfWeek = new Date(currentDate);
      startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
      
      const days = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date(startOfWeek);
        date.setDate(startOfWeek.getDate() + i);
        days.push(date);
      }
      return days;
    }
  };

  // Activity type colors
  const getActivityColor = (type: string) => {
    const colors: Record<string, string> = {
      "Sowing": "bg-green-100 text-green-800",
      "Irrigation": "bg-blue-100 text-blue-800",
      "Fertilizer": "bg-yellow-100 text-yellow-800",
      "Pesticide": "bg-purple-100 text-purple-800",
      "Pest Issue": "bg-red-100 text-red-800",
      "Harvest": "bg-orange-100 text-orange-800",
    };
    return colors[type] || "bg-gray-100 text-gray-800";
  };

  const today = new Date();
  const calendarDays = getCalendarDays();

  return (
    <div className="flex flex-col gap-4">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Farmer Calendar</h2>
          <div className="flex gap-1">
            <button
              onClick={() => setView("month")}
              className={`px-3 py-1 rounded-md text-sm ${
                view === "month" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setView("week")}
              className={`px-3 py-1 rounded-md text-sm ${
                view === "week" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"
              }`}
            >
              Week
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => view === "month" ? navigateMonth("prev") : navigateWeek("prev")}
            className="p-2 rounded-md border border-gray-300 hover:bg-gray-50"
          >
            ←
          </button>
          <span className="text-sm font-medium min-w-[120px] text-center">
            {currentDate.toLocaleDateString("en-US", { 
              month: "long", 
              year: "numeric" 
            })}
          </span>
          <button
            onClick={() => view === "month" ? navigateMonth("next") : navigateWeek("next")}
            className="p-2 rounded-md border border-gray-300 hover:bg-gray-50"
          >
            →
          </button>
        </div>
      </div>

      {/* Search Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search activities for this land..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Calendar Grid */}
      <div className={`bg-white rounded-lg border border-gray-200 overflow-hidden transition-opacity duration-300 ${
        isTransitioning ? "opacity-50" : "opacity-100"
      }`}>
        {view === "month" && (
          <>
            {/* Month view header */}
            <div className="grid grid-cols-7 bg-gray-50">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                <div key={day} className="p-3 text-center text-sm font-medium text-gray-700">
                  {day}
                </div>
              ))}
            </div>
            {/* Month view days */}
            <div className="grid grid-cols-7">
              {calendarDays.map((date, index) => {
                const isCurrentMonth = date.getMonth() === currentDate.getMonth();
                const isToday = date.toDateString() === today.toDateString();
                const dayActivities = getActivitiesForDate(date);
                
                return (
                  <div
                    key={index}
                    className={`min-h-[100px] border-r border-b border-gray-200 p-2 relative group ${
                      isCurrentMonth ? "bg-white" : "bg-gray-50"
                    } ${isToday ? "bg-blue-50" : ""} hover:bg-gray-50 cursor-pointer`}
                    onClick={() => setSelectedDate(date)}
                  >
                    <div className={`text-sm font-medium mb-1 ${
                      isCurrentMonth ? "text-gray-900" : "text-gray-400"
                    } ${isToday ? "text-blue-600" : ""}`}>
                      {date.getDate()}
                    </div>
                    
                    {/* Add activity button - shows on hover */}
                    {isCurrentMonth && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddActivity(date);
                        }}
                        className="absolute top-1 right-1 w-6 h-6 bg-blue-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center text-sm hover:bg-blue-600"
                        title="Add activity"
                      >
                        +
                      </button>
                    )}
                    
                    <div className="space-y-1">
                      {dayActivities.slice(0, 2).map(activity => (
                        <div
                          key={activity.id}
                          className={`text-xs px-2 py-1 rounded ${getActivityColor(activity.type)} truncate cursor-pointer hover:opacity-80`}
                          title={`${activity.type}: ${activity.notes || ""}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditActivity(activity);
                          }}
                        >
                          {activity.type}
                        </div>
                      ))}
                      {dayActivities.length > 2 && (
                        <div className="text-xs text-gray-500">
                          +{dayActivities.length - 2} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {view === "week" && (
          <>
            {/* Week view header */}
            <div className="grid grid-cols-7 bg-gray-50">
              {calendarDays.map((date, index) => (
                <div key={index} className="p-3 text-center">
                  <div className="text-sm font-medium text-gray-700">
                    {date.toLocaleDateString("en-US", { weekday: "short" })}
                  </div>
                  <div className={`text-lg ${
                    date.toDateString() === today.toDateString() ? "text-blue-600 font-bold" : "text-gray-900"
                  }`}>
                    {date.getDate()}
                  </div>
                </div>
              ))}
            </div>
            {/* Week view content */}
            <div className="grid grid-cols-7 min-h-[200px]">
              {calendarDays.map((date, index) => {
                const dayActivities = getActivitiesForDate(date);
                const isToday = date.toDateString() === today.toDateString();
                
                return (
                  <div
                    key={index}
                    className={`border-r border-gray-200 p-2 relative group ${isToday ? "bg-blue-50" : "bg-white"} hover:bg-gray-50 cursor-pointer`}
                    onClick={() => setSelectedDate(date)}
                  >
                    {/* Add activity button - shows on hover */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddActivity(date);
                      }}
                      className="absolute top-1 right-1 w-6 h-6 bg-blue-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center text-sm hover:bg-blue-600"
                      title="Add activity"
                    >
                      +
                    </button>
                    
                    <div className="space-y-1">
                      {dayActivities.map(activity => (
                        <div
                          key={activity.id}
                          className={`text-xs px-2 py-1 rounded ${getActivityColor(activity.type)} cursor-pointer hover:opacity-80`}
                          title={`${activity.type}: ${activity.notes || ""}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditActivity(activity);
                          }}
                        >
                          {activity.type}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Selected Date Details */}
      {selectedDate && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium">
              Activities for {selectedDate.toLocaleDateString()}
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => handleAddActivity(selectedDate)}
                className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
              >
                + Add Activity
              </button>
              <button
                onClick={() => setSelectedDate(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
          </div>
          <div className="space-y-2">
            {getActivitiesForDate(selectedDate).map(activity => (
              <div key={activity.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-1 rounded text-xs ${getActivityColor(activity.type)}`}>
                    {activity.type}
                  </span>
                  <span className="text-sm text-gray-600">
                    {lands?.find(l => l.id === activity.landId)?.name || "Current Land"}
                  </span>
                  {activity.notes && (
                    <span className="text-sm text-gray-500">{activity.notes}</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleEditActivity(activity)}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => handleDeleteActivity(activity.id)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
            {getActivitiesForDate(selectedDate).length === 0 && (
              <p className="text-gray-500 text-sm">No activities for this date</p>
            )}
          </div>
        </div>
      )}

      {loading && (
        <div className="text-center py-4 text-gray-500">
          Loading activities...
        </div>
      )}

      {/* Add/Edit Activity Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {editingActivity ? "Edit Activity" : "Add Activity"}
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={modalDate?.toISOString().split('T')[0] || ''}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Activity Type *
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select activity type</option>
                  <option value="Sowing">Sowing</option>
                  <option value="Irrigation">Irrigation</option>
                  <option value="Fertilizer">Fertilizer</option>
                  <option value="Pesticide">Pesticide</option>
                  <option value="Pest Issue">Pest Issue</option>
                  <option value="Harvest">Harvest</option>
                  <option value="Spraying">Spraying</option>
                  <option value="Pest Check">Pest Check</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Add notes about this activity..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Photo (Optional)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFormData(prev => ({ ...prev, photo: e.target.files?.[0] }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleSaveActivity}
                  disabled={saving || !formData.type.trim()}
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? "Saving..." : (editingActivity ? "Update" : "Add")} Activity
                </button>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
