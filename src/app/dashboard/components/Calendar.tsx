"use client";

import { useState, useEffect, useMemo } from "react";
import { Land } from "./types";
import { useLanguage } from "@/contexts/LanguageContext";

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
  const { t, language } = useLanguage();
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
      // Parse activity date with improved handling
      let activityDate: Date;
      
      try {
        if (activity.activityDate) {
          if ((activity.activityDate as any) instanceof Date) {
            activityDate = activity.activityDate as unknown as Date;
          } else if (typeof activity.activityDate === 'object' && activity.activityDate !== null) {
            // Firebase Timestamp object
            const timestamp = activity.activityDate as any;
            if (timestamp.seconds) {
              activityDate = new Date(timestamp.seconds * 1000);
            } else if (timestamp._seconds) {
              activityDate = new Date(timestamp._seconds * 1000);
            } else {
              activityDate = new Date(activity.activityDate as any);
            }
          } else if (typeof activity.activityDate === 'string') {
            activityDate = new Date(activity.activityDate);
          } else if (typeof activity.activityDate === 'number') {
            activityDate = new Date(activity.activityDate);
          } else {
            activityDate = new Date(activity.activityDate as any);
          }
        } else if (activity.createdAt) {
          if ((activity.createdAt as any) instanceof Date) {
            activityDate = activity.createdAt as unknown as Date;
          } else if (typeof activity.createdAt === 'object' && activity.createdAt !== null) {
            // Firebase Timestamp object
            const timestamp = activity.createdAt as any;
            if (timestamp.seconds) {
              activityDate = new Date(timestamp.seconds * 1000);
            } else if (timestamp._seconds) {
              activityDate = new Date(timestamp._seconds * 1000);
            } else {
              activityDate = new Date(activity.createdAt as any);
            }
          } else if (typeof activity.createdAt === 'string') {
            activityDate = new Date(activity.createdAt);
          } else if (typeof activity.createdAt === 'number') {
            activityDate = new Date(activity.createdAt);
          } else {
            activityDate = new Date(activity.createdAt as any);
          }
        } else {
          return false;
        }
        
        // Validate the parsed date
        if (isNaN(activityDate.getTime())) {
          console.warn(`[Calendar] Invalid date for activity ${activity.id}:`, activity.activityDate || activity.createdAt);
          return false;
        }
      } catch (error) {
        console.error(`[Calendar] Error parsing date for activity ${activity.id}:`, error);
        return false;
      }
      
      const matchesDate = activityDate.toDateString() === dateStr;
      const matchesLand = activity.landId === activeLandId;
      
      
      return matchesDate && matchesLand;
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
      "Spraying": "bg-purple-100 text-purple-800",
      "Pest Check": "bg-red-100 text-red-800",
      "Reminders": "bg-indigo-100 text-indigo-800 border border-indigo-200",
    };
    return colors[type] || "bg-gray-100 text-gray-800";
  };

  const today = new Date();
  const calendarDays = getCalendarDays();

  return (
    <div className="flex flex-col gap-4 motion-safe:transition-all motion-safe:duration-300">
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
      <div className={`bg-white rounded-lg border border-gray-200 overflow-hidden motion-safe:transition-opacity duration-300 ${
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
                    className={`min-h-[100px] border-r border-b border-gray-200 p-2 relative group motion-safe:transition-colors ${
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
                        className="absolute top-1 right-1 w-6 h-6 bg-blue-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center text-sm hover:bg-blue-600 active:scale-95"
                        title="Add activity"
                      >
                        +
                      </button>
                    )}
                    
                    <div className="space-y-1">
                      {dayActivities.slice(0, 2).map(activity => (
                        <div
                          key={activity.id}
                          className={`text-xs px-2 py-1 rounded ${getActivityColor(activity.type)} truncate cursor-pointer hover:opacity-80 motion-safe:transition-opacity`}
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
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Activities for {selectedDate.toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {getActivitiesForDate(selectedDate).length} activity{getActivitiesForDate(selectedDate).length !== 1 ? 'ies' : ''} recorded
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleAddActivity(selectedDate)}
                className="px-4 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Activity
              </button>
              <button
                onClick={() => setSelectedDate(null)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          
          <div className="space-y-3">
            {getActivitiesForDate(selectedDate).map(activity => {
              // Improved date parsing for Firebase timestamps
              let activityDate: Date;
              try {
                if (activity.activityDate) {
                  if (typeof activity.activityDate === 'object' && activity.activityDate !== null) {
                    // Firebase Timestamp object
                    const timestamp = activity.activityDate as any;
                    if (timestamp.seconds) {
                      activityDate = new Date(timestamp.seconds * 1000);
                    } else if (timestamp._seconds) {
                      activityDate = new Date(timestamp._seconds * 1000);
                    } else {
                      activityDate = new Date(activity.activityDate as any);
                    }
                  } else if (typeof activity.activityDate === 'number') {
                    activityDate = new Date(activity.activityDate);
                  } else {
                    activityDate = new Date(activity.activityDate);
                  }
                } else if (activity.createdAt) {
                  if (typeof activity.createdAt === 'object' && activity.createdAt !== null) {
                    // Firebase Timestamp object
                    const timestamp = activity.createdAt as any;
                    if (timestamp.seconds) {
                      activityDate = new Date(timestamp.seconds * 1000);
                    } else if (timestamp._seconds) {
                      activityDate = new Date(timestamp._seconds * 1000);
                    } else {
                      activityDate = new Date(activity.createdAt as any);
                    }
                  } else if (typeof activity.createdAt === 'number') {
                    activityDate = new Date(activity.createdAt);
                  } else {
                    activityDate = new Date(activity.createdAt);
                  }
                } else {
                  activityDate = new Date(); // fallback to current date
                }
                
                // Validate the date
                if (isNaN(activityDate.getTime())) {
                  activityDate = new Date(); // fallback to current date
                }
              } catch (error) {
                console.error('Date parsing error:', error);
                activityDate = new Date(); // fallback to current date
              }
              
              return (
                <div key={activity.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-gradient-to-r from-gray-50 to-white">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getActivityColor(activity.type)}`}>
                          {activity.type}
                        </span>
                        <span className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded">
                          {lands?.find(l => l.id === activity.landId)?.name || "Current Land"}
                        </span>
                        <span className="text-xs text-gray-500">
                          {activityDate.toLocaleTimeString('en-US', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </span>
                      </div>
                      
                      {activity.notes && (
                        <div className="mb-3">
                          <p className="text-sm text-gray-700 leading-relaxed">{activity.notes}</p>
                        </div>
                      )}
                      
                      {activity.photoUrl && (
                        <div className="mb-3">
                          <img 
                            src={activity.photoUrl} 
                            alt="Activity photo" 
                            className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                          />
                        </div>
                      )}
                      
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>ID: {activity.id.slice(0, 8)}...</span>
                        <span>Created: {activityDate.toLocaleDateString()}</span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 ml-4">
                      <button 
                        onClick={() => handleEditActivity(activity)}
                        className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors flex items-center gap-1"
                        title="Edit activity"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit
                      </button>
                      <button 
                        onClick={() => handleDeleteActivity(activity.id)}
                        className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors flex items-center gap-1"
                        title="Delete activity"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {getActivitiesForDate(selectedDate).length === 0 && (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <p className="text-gray-500 text-sm mb-2">No activities recorded for this date</p>
                <p className="text-gray-400 text-xs">Click "Add Activity" to log farming activities</p>
              </div>
            )}
          </div>
        </div>
      )}

      {loading && (
        <div className="text-center py-4 text-gray-500">
          {t("loading")}...
        </div>
      )}

      {/* Add/Edit Activity Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {editingActivity ? t("edit") + " " + t("addActivity") : t("addActivity")}
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
                  {t("activityType")} *
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
                  <option value="Reminders">Reminders</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("description")}
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
                  {language === "ml" ? "ഫോട്ടോ (ഓപ്ഷണൽ)" : "Photo (Optional)"}
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
                  {t("cancel")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
