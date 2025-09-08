import { NextRequest, NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import { getOrInitFirebaseApp } from "@/lib/server/firebaseAdmin";

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

    const snap = await db.collection("farmers").where("email", "==", email).where("password", "==", password).limit(1).get();
    if (snap.empty) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const doc = snap.docs[0];
    const data = doc.data();
    return NextResponse.json({ ok: true, id: doc.id, code: data.code, name: data.name, email: data.email });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[login] error", msg, err);
    return NextResponse.json({ error: msg || "Internal error" }, { status: 500 });
  }
}


