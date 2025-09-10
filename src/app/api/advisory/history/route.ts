import { NextRequest, NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import { getOrInitFirebaseApp } from "@/lib/server/firebaseAdmin";

export async function GET(request: NextRequest) {
  try {
    await getOrInitFirebaseApp();
    const db = getFirestore();

    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const landId = searchParams.get("landId");
    const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 500);

    if (!code) {
      return NextResponse.json({ error: "Missing farmer code" }, { status: 400 });
    }

    const farmersRef = db.collection("farmers");
    const snap = await farmersRef.where("code", "==", code).limit(1).get();
    if (snap.empty) {
      return NextResponse.json({ error: "Farmer not found" }, { status: 404 });
    }
    const farmerDoc = snap.docs[0];

    let advisories: any[] = [];
    if (landId) {
      const advSnap = await farmerDoc.ref
        .collection("lands").doc(landId)
        .collection("advisories")
        .orderBy("timestamp", "desc")
        .limit(limit)
        .get();
      advisories = advSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } else {
      // fetch across all lands
      const landsSnap = await farmerDoc.ref.collection("lands").get();
      for (const land of landsSnap.docs) {
        const advSnap = await land.ref
          .collection("advisories")
          .orderBy("timestamp", "desc")
          .limit(limit)
          .get();
        advisories.push(...advSnap.docs.map(doc => ({ id: doc.id, landId: land.id, ...doc.data() })));
      }
      // sort globally
      advisories.sort((a, b) => {
        const ta = a.timestamp?.seconds ? a.timestamp.seconds * 1000 : a.timestamp || a.createdAt || 0;
        const tb = b.timestamp?.seconds ? b.timestamp.seconds * 1000 : b.timestamp || b.createdAt || 0;
        return tb - ta;
      });
      advisories = advisories.slice(0, limit);
    }

    return NextResponse.json({ ok: true, advisories });
  } catch (err: any) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[advisory/history] error", msg, err);
    return NextResponse.json({ error: msg || "Internal error" }, { status: 500 });
  }
}



