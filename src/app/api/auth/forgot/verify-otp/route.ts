import { NextRequest, NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import { getOrInitFirebaseApp } from "@/lib/server/firebaseAdmin";
import bcrypt from "bcryptjs";

type Body = { email: string; otp: string; newPassword: string };

export async function POST(request: NextRequest) {
  try {
    await getOrInitFirebaseApp();
    const db = getFirestore();
    const { email, otp, newPassword } = (await request.json()) as Partial<Body>;
    if (!email || !otp || !newPassword) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
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

    const userSnap = await db.collection("farmers").where("email", "==", normalized).limit(1).get();
    if (userSnap.empty) return NextResponse.json({ error: "Account not found" }, { status: 404 });
    const userDoc = userSnap.docs[0].ref;
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await userDoc.set({ passwordHash }, { merge: true });
    await otpRef.delete();
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}


