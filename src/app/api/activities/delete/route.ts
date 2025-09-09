import { NextRequest, NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import { initializeFirebaseAdmin } from "@/lib/server/firebaseAdmin";

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

    // Initialize Firebase Admin
    const app = await initializeFirebaseAdmin();
    const db = getFirestore(app);

    // Delete activity from Firestore
    await db.collection("farmers").doc(code).collection("activities").doc(activityId).delete();

    console.log(`[activities/delete] Deleted activity ${activityId} for farmer ${code}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[activities/delete] Error:", error);
    return NextResponse.json(
      { error: "Failed to delete activity" },
      { status: 500 }
    );
  }
}
