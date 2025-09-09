import { NextRequest, NextResponse } from "next/server";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getOrInitFirebaseApp } from "@/lib/server/firebaseAdmin";

type AdvisoryLog = {
  code: string;
  landId: string;
  question: string;
  answer: string;
  timestamp: number;
};

export async function POST(request: NextRequest) {
  try {
    await getOrInitFirebaseApp();
    const db = getFirestore();

    const body = (await request.json()) as Partial<AdvisoryLog>;
    const { code, landId, question, answer, timestamp } = body;
    
    if (!code || !landId || !question || !answer) {
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

    // Log advisory to the specific land
    const advisoryData = {
      question: question.trim(),
      answer: answer.trim(),
      timestamp: FieldValue.serverTimestamp(),
      createdAt: timestamp || Date.now(),
    };

    await farmerDoc.ref.collection("lands").doc(landId).collection("advisories").add(advisoryData);

    console.info("[advisory/log] saved", { code, farmerId, landId, questionLength: question.length });
    return NextResponse.json({ ok: true, code, farmerId, landId });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[advisory/log] error", msg, err);
    return NextResponse.json({ error: msg || "Internal error" }, { status: 500 });
  }
}
