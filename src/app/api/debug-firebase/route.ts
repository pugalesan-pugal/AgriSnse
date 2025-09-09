import { NextResponse } from "next/server";
import { getOrInitFirebaseApp, getAdminInitInfo } from "@/lib/server/firebaseAdmin";
import { existsSync } from "fs";
import { join } from "path";

export async function GET() {
  try {
    const cwd = process.cwd();
    const candidates = [
      process.env.FIREBASE_CREDENTIALS_PATH,
      process.env.GOOGLE_APPLICATION_CREDENTIALS,
      join(cwd, "agrisense-471508-efdec6b26340.json"),
      join(cwd, "agrisense-fd58c-firebase-adminsdk-fbsvc-c75ce13780.json"),
      join(cwd, "agrisense-471508-bfdb1ef7ff9c.json"),
      join(cwd, "firebase-admin.local.json"),
    ].filter(Boolean) as string[];
    const filesProbe = candidates.map(p => ({ path: p, exists: existsSync(p) }));

    await getOrInitFirebaseApp();
    const info = getAdminInitInfo();
    return NextResponse.json({ ok: true, info, cwd, filesProbe, env: {
      FIREBASE_PROJECT_ID: !!process.env.FIREBASE_PROJECT_ID,
      FIREBASE_CLIENT_EMAIL: !!process.env.FIREBASE_CLIENT_EMAIL,
      FIREBASE_PRIVATE_KEY: !!process.env.FIREBASE_PRIVATE_KEY,
      FIREBASE_CREDENTIALS_PATH: process.env.FIREBASE_CREDENTIALS_PATH || null,
      GOOGLE_APPLICATION_CREDENTIALS: process.env.GOOGLE_APPLICATION_CREDENTIALS || null,
    }});
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const cwd = process.cwd();
    const candidates = [
      process.env.FIREBASE_CREDENTIALS_PATH,
      process.env.GOOGLE_APPLICATION_CREDENTIALS,
      join(cwd, "agrisense-471508-efdec6b26340.json"),
      join(cwd, "agrisense-fd58c-firebase-adminsdk-fbsvc-c75ce13780.json"),
      join(cwd, "agrisense-471508-bfdb1ef7ff9c.json"),
      join(cwd, "firebase-admin.local.json"),
    ].filter(Boolean) as string[];
    const filesProbe = candidates.map(p => ({ path: p, exists: existsSync(p) }));
    return NextResponse.json({ ok: false, error: msg, cwd, filesProbe }, { status: 500 });
  }
}


