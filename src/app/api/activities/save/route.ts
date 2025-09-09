import { NextRequest, NextResponse } from "next/server";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getOrInitFirebaseApp } from "@/lib/server/firebaseAdmin";

type ActivityData = {
  code: string;
  landId: string;
  type: string;
  notes?: string;
  photoUrl?: string;
  createdAt: number;
  activityId?: string; // For updates
};

export async function POST(request: NextRequest) {
  try {
    await getOrInitFirebaseApp();
    const db = getFirestore();

    const body = (await request.json()) as Partial<ActivityData>;
    const { code, landId, type, notes, photoUrl, createdAt, activityId } = body;
    
    if (!code || !type) {
      return NextResponse.json({ error: "Missing required fields: code, type" }, { status: 400 });
    }

    // Validate activity type
    const validActivityTypes = [
      "Sowing", "Irrigation", "Fertilizer", "Pesticide", "Pest Issue", 
      "Harvest", "Spraying", "Pest Check"
    ];
    
    if (!validActivityTypes.includes(type)) {
      return NextResponse.json({ 
        error: `Invalid activity type. Must be one of: ${validActivityTypes.join(", ")}` 
      }, { status: 400 });
    }

    // Find farmer by code
    const farmersRef = db.collection("farmers");
    const snap = await farmersRef.where("code", "==", code).limit(1).get();
    if (snap.empty) {
      return NextResponse.json({ error: "Farmer not found" }, { status: 404 });
    }

    const farmerDoc = snap.docs[0];
    const farmerId = farmerDoc.id;

    // Validate and prepare activity date
    let activityDate: Date;
    if (createdAt) {
      activityDate = new Date(createdAt);
      // Check if the date is valid and not in the future
      if (isNaN(activityDate.getTime())) {
        return NextResponse.json({ error: "Invalid activity date" }, { status: 400 });
      }
      if (activityDate > new Date()) {
        return NextResponse.json({ error: "Activity date cannot be in the future" }, { status: 400 });
      }
    } else {
      activityDate = new Date();
    }

    // Prepare activity data for Firestore
    const activityData = {
      farmerId,
      landId: landId || "",
      type: type.trim(),
      notes: notes?.trim() || "",
      photoUrl: photoUrl || "",
      createdAt: FieldValue.serverTimestamp(),
      // Store the actual date when the activity occurred (not when it was saved)
      activityDate: activityDate,
    };

    let resultActivityId: string;

    if (activityId) {
      // Update existing activity
      await farmerDoc.ref.collection("activities").doc(activityId).update(activityData);
      resultActivityId = activityId;
      console.info("[activities/save] updated", { 
        code, 
        farmerId, 
        landId, 
        activityId,
        type 
      });
    } else {
      // Create new activity
      const activityRef = await farmerDoc.ref.collection("activities").add(activityData);
      resultActivityId = activityRef.id;
      console.info("[activities/save] created", { 
        code, 
        farmerId, 
        landId, 
        activityId: resultActivityId,
        type 
      });
    }

    return NextResponse.json({ 
      ok: true, 
      code, 
      farmerId, 
      landId,
      activityId: resultActivityId 
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[activities/save] error", msg, err);
    return NextResponse.json({ error: msg || "Internal error" }, { status: 500 });
  }
}
