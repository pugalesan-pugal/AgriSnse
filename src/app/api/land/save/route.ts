import { NextRequest, NextResponse } from "next/server";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getOrInitFirebaseApp } from "@/lib/server/firebaseAdmin";

type LandData = {
  id: string;
  name: string;
  location: string;
  sizeValue: number;
  sizeUnit: string;
  gridSelectedCells: number;
  gridTotalCells: number;
  crop: string;
  createdAt: number;
};

type SaveLandRequest = {
  code: string;
  land: LandData;
  isUpdate: boolean;
};

export async function POST(request: NextRequest) {
  try {
    await getOrInitFirebaseApp();
    const db = getFirestore();

    const body = (await request.json()) as SaveLandRequest;
    const { code, land, isUpdate } = body;
    
    if (!code || !land) {
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

    // Prepare land data for Firestore
    const landData = {
      name: land.name.trim(),
      location: land.location.trim(),
      sizeValue: land.sizeValue,
      sizeUnit: land.sizeUnit,
      gridSelectedCells: land.gridSelectedCells,
      gridTotalCells: land.gridTotalCells,
      crop: land.crop,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (isUpdate) {
      // Update existing land
      await farmerDoc.ref.collection("lands").doc(land.id).update(landData);
    } else {
      // Create new land
      await farmerDoc.ref.collection("lands").doc(land.id).set(landData);
    }

    console.info("[land/save] saved", { code, farmerId, landId: land.id, isUpdate });
    return NextResponse.json({ ok: true, code, farmerId, landId: land.id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[land/save] error", msg, err);
    return NextResponse.json({ error: msg || "Internal error" }, { status: 500 });
  }
}
