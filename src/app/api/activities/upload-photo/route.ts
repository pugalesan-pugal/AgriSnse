import { NextRequest, NextResponse } from "next/server";
import { getOrInitFirebaseApp } from "@/lib/server/firebaseAdmin";

export async function POST(request: NextRequest) {
  try {
    await getOrInitFirebaseApp();
    
    const formData = await request.formData();
    const file = formData.get("photo") as File;
    const code = formData.get("code") as string;
    
    if (!file || !code) {
      return NextResponse.json(
        { error: "Missing file or farmer code" },
        { status: 400 }
      );
    }

    // For now, we'll just return a placeholder URL
    // In production, you would upload to Firebase Storage or similar
    const fileName = `activity_${Date.now()}_${file.name}`;
    const photoUrl = `/uploads/${fileName}`;

    console.info("[activities/upload-photo] uploaded", { 
      code, 
      fileName,
      size: file.size,
      type: file.type
    });

    return NextResponse.json({ 
      ok: true, 
      photoUrl,
      fileName
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[activities/upload-photo] error", msg, err);
    return NextResponse.json({ error: msg || "Internal error" }, { status: 500 });
  }
}
