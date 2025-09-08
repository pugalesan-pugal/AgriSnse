import { NextRequest, NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import { getOrInitFirebaseApp } from "@/lib/server/firebaseAdmin";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    await getOrInitFirebaseApp();
    const db = getFirestore();
    const { email, password } = await request.json();
    const normalized = String(email || "").toLowerCase().trim();
    if (!normalized || !password) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    const snap = await db.collection("farmers").where("email", "==", normalized).limit(1).get();
    if (snap.empty) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    const doc = snap.docs[0];
    const data = doc.data() as { passwordHash?: string; emailVerified?: boolean };
    const ok = data.passwordHash ? await bcrypt.compare(password, data.passwordHash) : false;
    if (!ok) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    if (data.emailVerified === false) return NextResponse.json({ error: "Email not verified" }, { status: 403 });

    return NextResponse.json({ ok: true, id: doc.id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}


