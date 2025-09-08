import { NextRequest, NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import { getOrInitFirebaseApp } from "@/lib/server/firebaseAdmin";
import bcrypt from "bcryptjs";

type LoginBody = {
  email: string;
  password: string;
};

export async function POST(request: NextRequest) {
  try {
    await getOrInitFirebaseApp();
    const db = getFirestore();
    const body = (await request.json()) as Partial<LoginBody>;
    const email = body.email?.toLowerCase().trim();
    const password = body.password;
    if (!email || !password) {
      return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
    }

    // Prefer secure password verification if hash exists; otherwise fallback for legacy plain password
    const snap = await db.collection("farmers").where("email", "==", email).limit(1).get();
    if (snap.empty) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const doc = snap.docs[0];
    const data = doc.data() as { password?: string; passwordHash?: string; code?: string; name?: string; email?: string };
    let valid = false;
    if (data.passwordHash) {
      valid = await bcrypt.compare(password!, data.passwordHash);
    } else if (data.password) {
      valid = data.password === password;
    }
    if (!valid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    return NextResponse.json({ ok: true, id: doc.id, code: data.code, name: data.name, email: data.email });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[login] error", msg, err);
    return NextResponse.json({ error: msg || "Internal error" }, { status: 500 });
  }
}


