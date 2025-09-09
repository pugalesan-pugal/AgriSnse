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

    // Get profile data and normalize field names for UI compatibility
    const profileSnap = await farmerDoc.ref.collection("profile").doc("basic").get();
    const raw = profileSnap.exists ? (profileSnap.data() as any) : {};
    const profile = {
      farmerName: raw.farmerName ?? raw.name ?? "",
      // Map multiple possible keys to phone
      phone: raw.phone ?? raw.mobile ?? raw.phoneNumber ?? raw.contact ?? "",
      // Map multiple possible keys to gps/location
      gps: raw.gps ?? raw.location ?? raw.gpsCoords ?? raw.coordinates ?? "",
      landId: raw.landId ?? null,
      landSize: raw.landSize ?? raw.size ?? "",
      landUnit: raw.landUnit ?? raw.unit ?? "acre",
      // Map crop/soil/irrigation variants
      cropType: raw.cropType ?? raw.crop ?? "",
      soilType: raw.soilType ?? raw.soil ?? "",
      irrigation: raw.irrigation ?? raw.irrigationMethod ?? "",
      language: raw.language === "ml" ? "ml" : "en",
      // keep original fields too for reference
      ...raw,
    };

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