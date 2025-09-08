import { NextRequest, NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import { getOrInitFirebaseApp } from "@/lib/server/firebaseAdmin";

export async function POST(request: NextRequest) {
  try {
    await getOrInitFirebaseApp();
    const db = getFirestore();
    const { email } = await request.json();
    const normalized = String(email || "").toLowerCase().trim();
    if (!normalized) return NextResponse.json({ error: "Email required" }, { status: 400 });
    const snap = await db.collection("farmers").where("email", "==", normalized).limit(1).get();
    return NextResponse.json({ ok: true, exists: !snap.empty });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}


