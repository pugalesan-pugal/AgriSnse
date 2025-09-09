import { NextRequest, NextResponse } from "next/server";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getOrInitFirebaseApp, getAdminInitInfo } from "@/lib/server/firebaseAdmin";

type SignUpBody = {
  name: string;
  email: string;
  password: string;
};

export async function POST(request: NextRequest) {
  try {
    const startedAt = Date.now();
    await getOrInitFirebaseApp();
    const db = getFirestore();

    const body = (await request.json()) as Partial<SignUpBody>;
    const { name, email, password } = body;
    console.info("[sign-up] incoming", { name, email });
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

    await userDoc.set({
      code,
      name: name.trim(),
      email: emailLower,
      password, // NOTE: store hashed in real systems. Kept plain per request not to create auth now.
      createdAt: FieldValue.serverTimestamp(),
    });

    // Create initial profile structure
    await userDoc.collection("profile").doc("basic").set({
      farmerName: name.trim(),
      phone: "",
      gps: "",
      landId: null,
      landSize: "",
      landUnit: "acre",
      cropType: "",
      soilType: "",
      irrigation: "",
      status: "active",
      createdAt: FieldValue.serverTimestamp(),
    });

    const durationMs = Date.now() - startedAt;
    console.info("[sign-up] stored", { id: userDoc.id, code, durationMs });
    return NextResponse.json({ ok: true, code, id: userDoc.id, collection: "farmers" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const code = (err as Record<string, unknown>)?.code as string | undefined;
    const details = (err as Record<string, unknown>)?.details as string | undefined;
    const project = getAdminInitInfo()?.projectId;
    console.error("[sign-up] error", { message, code, details, project });
    return NextResponse.json({ error: message || "Internal error", code, details, project }, { status: 500 });
  }
}


