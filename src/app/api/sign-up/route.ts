import { NextRequest, NextResponse } from "next/server";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getOrInitFirebaseApp } from "@/lib/server/firebaseAdmin";
import bcrypt from "bcryptjs";

type SignUpBody = {
  name: string;
  email: string;
  password: string;
};

export async function POST(request: NextRequest) {
  try {
    await getOrInitFirebaseApp();
    const db = getFirestore();

    const body = (await request.json()) as Partial<SignUpBody>;
    const { name, email, password } = body;
    if (!name || !email || !password) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Normalize email
    const emailLower = email.toLowerCase().trim();

    // Use a transaction to issue a sequential code: AS 01, AS 02, ...
    const countersRef = db.collection("meta").doc("counters");
    const code = await db.runTransaction(async (tx) => {
      const snap = await tx.get(countersRef);
      const next = (snap.exists && (snap.data()?.userSeq as number)) ? (snap.data()!.userSeq as number) + 1 : 1;
      tx.set(countersRef, { userSeq: next }, { merge: true });
      const padded = String(next).padStart(2, "0");
      return `AS ${padded}`;
    });

    // Store all farmer records under a single top-level collection
    const farmersRef = db.collection("farmers");
    const userDoc = farmersRef.doc();

    const passwordHash = await bcrypt.hash(password, 10);
    await userDoc.set({
      code,
      name: name.trim(),
      email: emailLower,
      passwordHash,
      createdAt: FieldValue.serverTimestamp(),
    });

    // Optional: create a structured subcollection for future data (profiles, activities, etc.)
    await userDoc.collection("profile").doc("basic").set({
      name: name.trim(),
      email: emailLower,
      code,
      status: "active",
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ ok: true, code, id: userDoc.id, collection: "farmers" });
  } catch (err) {
    console.error("sign-up error", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}


