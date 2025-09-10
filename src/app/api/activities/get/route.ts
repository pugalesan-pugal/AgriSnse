import { NextRequest, NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import { getOrInitFirebaseApp } from "@/lib/server/firebaseAdmin";

export async function GET(request: NextRequest) {
  try {
    await getOrInitFirebaseApp();
    const db = getFirestore();

    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const start = searchParams.get("start");
    const end = searchParams.get("end");
    const landId = searchParams.get("landId");
    
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

    // Use simple query that doesn't require composite indexes
    let activities: any[] = [];
    
    // Get all activities for the farmer (simple query, no complex filters)
    const activitiesSnap = await farmerDoc.ref
      .collection("activities")
      .orderBy("createdAt", "desc")
      .limit(500) // Reasonable limit to avoid performance issues
      .get();
    
    const allActivities = activitiesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Apply filters in memory (more reliable than complex Firestore queries)
    activities = allActivities.filter((activity: any) => {
      // Filter by landId if specified
      if (landId && activity.landId !== landId) {
        return false;
      }
      
      // Filter by date range if specified
      if (start && end) {
        const activityDate = activity.activityDate || activity.createdAt;
        let activityTime: number;
        
        if (activityDate instanceof Date) {
          activityTime = activityDate.getTime();
        } else if (activityDate?.seconds) {
          activityTime = activityDate.seconds * 1000;
        } else if (typeof activityDate === 'number') {
          activityTime = activityDate;
        } else {
          activityTime = Date.parse(activityDate) || 0;
        }
        
        const startMs = new Date(start).getTime();
        const endMs = new Date(end).getTime();
        
        if (activityTime < startMs || activityTime > endMs) {
          return false;
        }
      }
      
      return true;
    });
    
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

    console.info("[activities/get] retrieved", { 
      code, 
      farmerId, 
      count: activities.length,
      landId: landId || "all",
      dateRange: start && end ? `${start} to ${end}` : "all"
    });

    return NextResponse.json({ ok: true, code, farmerId, activities });
  } catch (err: any) {
    const msg = err instanceof Error ? err.message : String(err);
    // Firestore composite index hint surfacing
    const needsIndex = typeof msg === "string" && msg.includes("The query requires an index");
    let indexLink: string | undefined = undefined;
    if (needsIndex) {
      // Firestore SDK usually includes a console link in the message; try to extract it
      const match = msg.match(/https:\/\/console\.firebase\.google\.com\S+/);
      indexLink = match ? match[0] : undefined;
    }
    console.error("[activities/get] error", msg, err);
    return NextResponse.json({ 
      error: msg || "Internal error",
      requiresIndex: needsIndex || undefined,
      createIndexUrl: indexLink
    }, { status: 500 });
  }
}
