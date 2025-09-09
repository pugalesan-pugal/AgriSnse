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

    // Build query for activities - order by activityDate if available, otherwise createdAt
    let query = farmerDoc.ref.collection("activities").orderBy("activityDate", "desc");

    // Add date range filter if provided - filter by activityDate (when the activity actually happened)
    if (start && end) {
      const startDate = new Date(start);
      const endDate = new Date(end);
      query = query.where("activityDate", ">=", startDate).where("activityDate", "<=", endDate);
    }

    // Add land filter if provided
    if (landId) {
      query = query.where("landId", "==", landId);
    }

    const activitiesSnap = await query.get();
    const activities = activitiesSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    console.info("[activities/get] retrieved", { 
      code, 
      farmerId, 
      count: activities.length,
      landId: landId || "all",
      dateRange: start && end ? `${start} to ${end}` : "all"
    });

    return NextResponse.json({ 
      ok: true, 
      code, 
      farmerId, 
      activities 
    });
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
