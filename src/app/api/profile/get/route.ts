import { NextRequest, NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import { getOrInitFirebaseApp } from "@/lib/server/firebaseAdmin";

export async function GET(request: NextRequest) {
  try {
    await getOrInitFirebaseApp();
    const db = getFirestore();

    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    
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

    // Get profile data
    const profileSnap = await farmerDoc.ref.collection("profile").doc("basic").get();
    const profile = profileSnap.exists ? profileSnap.data() : {};

    // Get lands data
    const landsSnap = await farmerDoc.ref.collection("lands").get();
    const lands = landsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    console.info("[profile/get] retrieved", { code, farmerId, hasProfile: profileSnap.exists, landsCount: lands.length });
    return NextResponse.json({ 
      ok: true, 
      code, 
      farmerId, 
      profile, 
      lands 
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[profile/get] error", msg, err);
    return NextResponse.json({ error: msg || "Internal error" }, { status: 500 });
  }
}