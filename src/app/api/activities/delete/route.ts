import { NextRequest, NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import { getOrInitFirebaseApp } from "@/lib/server/firebaseAdmin";

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { code, activityId } = body;

    if (!code || !activityId) {
      return NextResponse.json(
        { error: "Missing required fields: code, activityId" },
        { status: 400 }
      );
    }

    await getOrInitFirebaseApp();
    const db = getFirestore();

    // Find farmer by code first
    const farmersRef = db.collection("farmers");
    const snap = await farmersRef.where("code", "==", code).limit(1).get();
    if (snap.empty) {
      return NextResponse.json({ error: "Farmer not found" }, { status: 404 });
    }

    const farmerDoc = snap.docs[0];
    const farmerId = farmerDoc.id;

    // Delete activity from Firestore
    await farmerDoc.ref.collection("activities").doc(activityId).delete();

    console.info("[activities/delete] deleted", { 
      code, 
      farmerId, 
      activityId 
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[activities/delete] Error:", error);
    return NextResponse.json(
      { error: "Failed to delete activity" },
      { status: 500 }
    );
  }
}
