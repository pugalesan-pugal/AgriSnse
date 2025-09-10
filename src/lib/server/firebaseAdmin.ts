import "server-only";
import { initializeApp, getApps, cert, App } from "firebase-admin/app";

let app: App | null = null;
export type AdminInitInfo = { source: "env" | "json" | "hardcoded"; projectId: string; clientEmail?: string; filePath?: string } | null;
let adminInitInfo: AdminInitInfo = null;

export function getOrInitFirebaseApp() {
  if (app) return app;
  if (getApps().length) {
    app = getApps()[0]!;
    return app;
  }

  // Hardcoded Firebase credentials for AgriSense project
  const hardcodedCredentials = {
    projectId: "agrisense-471508",
    clientEmail: "agrisense-service@agrisense-471508.iam.gserviceaccount.com",
    privateKey: "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQC+9fCsHmwnR8Dq\nxQGqgFFsNHC0sf3vL8pXBdHjYFIz1WptEaVtaqV+igtphN7atyu0CdH4z0c0JVTP\nroox6rHUKFhkWmXJT2lC99sKLp3uBgRu/N0RYIZlcAzHZ2SxGBzW0ehTJDm72vUH\nl+0tt7S2yoP2iFgtwRq9DvlcXR3h8orvQIXBwvg0ByaQrzWrI/1/3O2ExYS6urnU\nYL1fEBQPXbLy2Gj/lPpG7E94zA9t0AxwUjXfXT1e0Ish+O8EqQgMy4LvUGJDGAbJ\n/DphJqkix4uenNn9beQptZ0pqG7zL1hHFjAABp149zEXRNOaV5neJ5aPNybDpTrZ\nnZCLChWBAgMBAAECggEAG5vsthXtRn3wqIDfTXV2pZGsvJNXcYjpVPekcZ7Fg8pW\ntCTu/rOCm0RTg2gQiHLJ63fYAdnbePCaIy91ujiCiXgOf5k09OF5sz2pT6mPGpDd\nfJEsAo0qy+kNZUR6TG3TYu5qYUrwMKGRomLBifCbkioUNkVe6mPsUmqjJvWCPTPX\nPszWBu7EeC61il4qIAcqE+tew30nr/0rm4tfK7B6uwMvKJ3aA/5NMNNAch80dA6v\n6ZhTRFXRWekWJKqZ9XEmeqPC7q2nYM4aabH5yN0p3JAYSF2Ymjq9szUBFmPvIWMM\nd+YIRGuKcykM8c6/rdiSX4E0vuf69kzHI/IWdO6zGQKBgQDuyNFfLUpis+0pC2oJ\ncCEMCM6185+4upkF58z2UCUrpv5g5NFAIEG4sy2etSca8lqFvjUWXjhPkR4xcxI3\n5jY2VBhs2pwtv7Nb7si4jyGEWT+RO/XG5OlP+yW/gGdo5a8cEH7XiW7SbEY6PCnu\nMpzGGjpMpsTorqo91KI6yd9PCwKBgQDMunO0DMkcwq1HgGEGBcUpCa9+QfPWM0L7\nNorzVp0RaoAB0XIGHS/QLmGW/Qn8KDt5rwb/26174xCRZmbxCxeOYakejXA6Px/9\n8xeaYjbIRMSsLykXv1wbxnQVekm33UdgUa9sNbhVs9poBKFZYmQ9OL54NoZ5Inpr\nCIPRDY81IwKBgDXfdO1mSHwQYBd8jcXnWG1gp1KBzq1c3B1q+OExn9FDcezmcxdm\nr60+L7K46EO6HhZCnbOYOlgpQ4igj6Gw/NYxDvmwMMBZmdvJ+ds537P+dssLnh3r\nk4AKB7A3Bh2yhFlul0+FoE01RHrrDALDxH8ld7XHgnGExsAAc0GUPh+VAoGAMm9I\na7WuocAv0eqFfGdVf9ub+R2kRUORn7N7HaFbxluXN1tynKD6E24pqnmhyRXcOQju\nT3+9yERS4473kzApWHEkqZssZ5z/c588VFMXrdSLIuPnWqtQtKL6HARpPrtrhwX4\nkk7Vn39UMcXaPdvoV9Cv04uTKypcQBvz5T9S5UMCgYByriJjBZwViGZN6lCpmZYi\nL99NsF6crXrHj6YCkSjtB553sfWKP2+duG1/Tp13SkC/vPWWfdygoHOMycORd465\nNQRizwYdv66nhwfWnL8yT6/457t0NZzjLgxop2JF/gk4l8JpZpLWovNPhU+SqNEH\ndzXUqA66EIx91mgOdHiWQA==\n-----END PRIVATE KEY-----\n"
  };

  try {
    app = initializeApp({
      credential: cert({
        projectId: hardcodedCredentials.projectId,
        clientEmail: hardcodedCredentials.clientEmail,
        privateKey: hardcodedCredentials.privateKey,
      }),
    });
    adminInitInfo = { 
      source: "hardcoded", 
      projectId: hardcodedCredentials.projectId, 
      clientEmail: hardcodedCredentials.clientEmail 
    };
    return app;
  } catch (err) {
    console.error("Failed to initialize Firebase with hardcoded credentials:", err);
    throw new Error("Firebase initialization failed with hardcoded credentials");
  }

}

export function getAdminInitInfo(): AdminInitInfo {
  return adminInitInfo;
}


