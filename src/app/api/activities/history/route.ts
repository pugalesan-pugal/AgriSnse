import { NextRequest, NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import { getOrInitFirebaseApp } from "@/lib/server/firebaseAdmin";

export async function GET(request: NextRequest) {
  try {
    await getOrInitFirebaseApp();
    const db = getFirestore();

    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const limit = parseInt(searchParams.get("limit") || "50");
    
    if (!code) {
      return NextResponse.json({ error: "Missing farmer code" }, { status: 400 });
    }

    // Find farmer by code
    const farmersRef = db.collection("farmers");
    const snap = await farmersRef.where("code", "==", code).limit(1).get();
    if (snap.empty) {
      return NextResponse.json({ error: "Farmer not found" }, { status: 404 });
    }

    const farmerDoc = snap.docs[0];
    const farmerId = farmerDoc.id;

    // Get recent activities across all lands (simple query, no complex indexes)
    const activitiesSnap = await farmerDoc.ref
      .collection("activities")
      .orderBy("createdAt", "desc")
      .limit(Math.min(limit, 500)) // Cap at 500 for performance
      .get();
    
    let activities = activitiesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Sort by activityDate if available, otherwise by createdAt
    activities.sort((a: any, b: any) => {
      const getTime = (activity: any) => {
        const date = activity.activityDate || activity.createdAt;
        if (date instanceof Date) return date.getTime();
        if (date?.seconds) return date.seconds * 1000;
        if (typeof date === 'number') return date;
        return Date.parse(date) || 0;
      };
      
      return getTime(b) - getTime(a); // Descending order
    });

    // Group activities by land for better organization
    const activitiesByLand = activities.reduce((acc, activity) => {
      const landId = activity.landId || 'unknown';
      if (!acc[landId]) {
        acc[landId] = [];
      }
      acc[landId].push(activity);
      return acc;
    }, {} as Record<string, any[]>);

    console.info("[activities/history] retrieved", { 
      code, 
      farmerId, 
      totalCount: activities.length,
      landsCount: Object.keys(activitiesByLand).length
    });

    return NextResponse.json({ 
      ok: true, 
      code, 
      farmerId, 
      activities,
      activitiesByLand,
      totalCount: activities.length
    });
  } catch (err: any) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[activities/history] error", msg, err);
    return NextResponse.json({ 
      error: msg || "Internal error"
    }, { status: 500 });
  }
}
