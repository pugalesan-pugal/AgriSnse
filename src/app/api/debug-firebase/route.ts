import { NextResponse } from "next/server";
import { getOrInitFirebaseApp, getAdminInitInfo } from "@/lib/server/firebaseAdmin";

export async function GET() {
  try {
    await getOrInitFirebaseApp();
    const info = getAdminInitInfo();
    return NextResponse.json({ ok: true, info });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}


