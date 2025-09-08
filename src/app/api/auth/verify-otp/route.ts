import { NextRequest, NextResponse } from "next/server";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getOrInitFirebaseApp } from "@/lib/server/firebaseAdmin";
import bcrypt from "bcryptjs";

type Body = {
  name: string;
  email: string;
  password: string;
  otp: string;
};

export async function POST(request: NextRequest) {
  try {
    await getOrInitFirebaseApp();
    const db = getFirestore();
    const { name, email, password, otp } = (await request.json()) as Partial<Body>;
    if (!name || !email || !password || !otp) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }
    const normalized = email.toLowerCase().trim();

    const otpRef = db.collection("emailOtps").doc(normalized);
    const snap = await otpRef.get();
    if (!snap.exists) return NextResponse.json({ error: "No OTP requested" }, { status: 400 });
    const data = snap.data() as { otp: string; attempts: number; expiresAt: number };
    if (Date.now() > data.expiresAt) return NextResponse.json({ error: "OTP expired" }, { status: 400 });
    if (data.attempts >= 5) return NextResponse.json({ error: "Too many attempts" }, { status: 429 });
    if (String(otp) !== String(data.otp)) {
      await otpRef.set({ attempts: data.attempts + 1 }, { merge: true });
      return NextResponse.json({ error: "Invalid OTP" }, { status: 400 });
    }

    // issue sequential code and create user (similar to /api/sign-up)
    const code = await db.runTransaction(async (tx) => {
      const countersRef = db.collection("meta").doc("counters");
      const s = await tx.get(countersRef);
      const next = (s.exists && (s.data()?.userSeq as number)) ? (s.data()!.userSeq as number) + 1 : 1;
      tx.set(countersRef, { userSeq: next }, { merge: true });
      return `AS ${String(next).padStart(2, "0")}`;
    });

    const farmersRef = db.collection("farmers");
    const userDoc = farmersRef.doc();
    const passwordHash = await bcrypt.hash(password, 10);
    await userDoc.set({
      code,
      name: name.trim(),
      email: normalized,
      passwordHash,
      createdAt: FieldValue.serverTimestamp(),
      emailVerified: true,
    });
    await userDoc.collection("profile").doc("basic").set({
      name: name.trim(),
      email: normalized,
      code,
      status: "active",
      createdAt: FieldValue.serverTimestamp(),
    });

    // cleanup otp
    await otpRef.delete();

    return NextResponse.json({ ok: true, code, id: userDoc.id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}


