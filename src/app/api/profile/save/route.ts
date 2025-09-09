import { NextRequest, NextResponse } from "next/server";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getOrInitFirebaseApp } from "@/lib/server/firebaseAdmin";

type ProfileData = {
  code: string;
  farmerName: string;
  phone: string;
  gps: string;
  landId: string | null;
  landSize: string;
  landUnit: string;
  cropType: string;
  soilType: string;
  irrigation: string;
};

export async function POST(request: NextRequest) {
  try {
    await getOrInitFirebaseApp();
    const db = getFirestore();

    const body = (await request.json()) as Partial<ProfileData>;
    const { code, farmerName, phone, gps, landId, landSize, landUnit, cropType, soilType, irrigation } = body;
    
    if (!code || !farmerName || !phone) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Find farmer by code
    const farmersRef = db.collection("farmers");
    const snap = await farmersRef.where("code", "==", code).limit(1).get();
    if (snap.empty) {
      return NextResponse.json({ error: "Farmer not found" }, { status: 404 });
    }

    const farmerDoc = snap.docs[0];
    const farmerId = farmerDoc.id;

    // Update farmer basic info
    await farmerDoc.ref.update({
      name: farmerName.trim(),
      phone: phone.trim(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Store/update profile in subcollection
    const profileData = {
      farmerName: farmerName.trim(),
      phone: phone.trim(),
      gps: gps?.trim() || "",
      landId: landId || null,
      landSize: landSize?.trim() || "",
      landUnit: landUnit || "acre",
      cropType: cropType?.trim() || "",
      soilType: soilType?.trim() || "",
      irrigation: irrigation?.trim() || "",
      updatedAt: FieldValue.serverTimestamp(),
    };

    await farmerDoc.ref.collection("profile").doc("basic").set(profileData, { merge: true });

    console.info("[profile/save] updated", { code, farmerId, profileData });
    return NextResponse.json({ ok: true, code, farmerId });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[profile/save] error", msg, err);
    return NextResponse.json({ error: msg || "Internal error" }, { status: 500 });
  }
}