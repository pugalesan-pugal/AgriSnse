import "server-only";
import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

let app: App | null = null;
export type AdminInitInfo = { source: "env" | "json"; projectId: string; clientEmail?: string; filePath?: string } | null;
let adminInitInfo: AdminInitInfo = null;

export function getOrInitFirebaseApp() {
  if (app) return app;
  if (getApps().length) {
    app = getApps()[0]!;
    if (!adminInitInfo) {
      const envProjectId = process.env.FIREBASE_PROJECT_ID;
      const envClientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      if (envProjectId && envClientEmail) {
        adminInitInfo = { source: "env", projectId: envProjectId, clientEmail: envClientEmail };
      } else {
        try {
          const candidatePaths = [
            process.env.FIREBASE_CREDENTIALS_PATH,
            join(process.cwd(), "agrisense-471508-efdec6b26340.json"),
            join(process.cwd(), "agrisense-fd58c-firebase-adminsdk-fbsvc-c75ce13780.json"),
            join(process.cwd(), "agrisense-eb88e-firebase-adminsdk-fbsvc-964328214f.json"),
          ].filter(Boolean) as string[];
          let filePath: string | undefined;
          for (const p of candidatePaths) {
            if (existsSync(p)) { filePath = p; break; }
          }
          if (!filePath) throw new Error("no local JSON found");
          const raw = readFileSync(filePath, "utf8");
          const svc = JSON.parse(raw);
          adminInitInfo = { source: "json", projectId: svc.project_id, clientEmail: svc.client_email, filePath };
        } catch {
          adminInitInfo = { source: "json", projectId: "unknown" };
        }
      }
    }
    return app;
  }

  // Prefer env vars; fallback to bundled JSON file path if present
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (projectId && clientEmail && privateKey) {
    app = initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
    });
    adminInitInfo = { source: "env", projectId, clientEmail };
    return app;
  }

  // As a convenience for local dev, attempt to read a JSON in project root if envs are not provided
  const candidatePaths = [
    process.env.FIREBASE_CREDENTIALS_PATH,
    join(process.cwd(), "agrisense-471508-efdec6b26340.json"),
    join(process.cwd(), "agrisense-fd58c-firebase-adminsdk-fbsvc-c75ce13780.json"),
    join(process.cwd(), "agrisense-eb88e-firebase-adminsdk-fbsvc-964328214f.json"),
  ].filter(Boolean) as string[];
  try {
    let filePath: string | undefined;
    for (const p of candidatePaths) {
      if (existsSync(p)) { filePath = p; break; }
    }
    if (!filePath) throw new Error("no local JSON found");
    const raw = readFileSync(filePath, "utf8");
    const serviceAccount = JSON.parse(raw);
    app = initializeApp({ credential: cert(serviceAccount) });
    adminInitInfo = { source: "json", projectId: serviceAccount.project_id, clientEmail: serviceAccount.client_email, filePath };
    return app;
  } catch {
    throw new Error("Firebase Admin credentials not found. Set env vars or keep the service account JSON in project root.");
  }
}

export function getAdminInitInfo(): AdminInitInfo {
  return adminInitInfo;
}


