import { NextRequest, NextResponse } from "next/server";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getOrInitFirebaseApp } from "@/lib/server/firebaseAdmin";
import { sendOtpMail } from "@/lib/server/mailer";

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function POST(request: NextRequest) {
  try {
    await getOrInitFirebaseApp();
    const db = getFirestore();
    const { email } = await request.json();
    const normalized = String(email || "").toLowerCase().trim();
    if (!normalized) return NextResponse.json({ error: "Email required" }, { status: 400 });

    const otp = generateOtp();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    const docRef = db.collection("emailOtps").doc(normalized);
    await docRef.set({ otp, attempts: 0, expiresAt, createdAt: FieldValue.serverTimestamp() });

    const messageId = await sendOtpMail(normalized, otp);
    return NextResponse.json({ ok: true, messageId });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}


