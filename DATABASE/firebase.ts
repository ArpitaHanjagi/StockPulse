import { readFileSync } from "fs";
import path from "path";
import { cert, getApps, initializeApp, type App, type ServiceAccount } from "firebase-admin/app";
import { getFirestore, Timestamp, type Firestore } from "firebase-admin/firestore";

declare global {
    var firestoreCache: Firestore | undefined;
}

// Credentials, in order of preference:
//   1. FIREBASE_SERVICE_ACCOUNT       — the service account JSON inline
//                                       (handy on hosts like Vercel)
//   2. FIREBASE_SERVICE_ACCOUNT_PATH  — path to the downloaded JSON key file
//   3. FIRESTORE_EMULATOR_HOST        — local emulator, no credentials needed
const loadServiceAccount = (): ServiceAccount | null => {
    const inline = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (inline) return JSON.parse(inline);

    const keyPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    if (keyPath) return JSON.parse(readFileSync(path.resolve(/* turbopackIgnore: true */ process.cwd(), keyPath), "utf8"));

    return null;
};

const initApp = (): App => {
    const existing = getApps()[0];
    if (existing) return existing;

    const serviceAccount = loadServiceAccount();
    if (serviceAccount) return initializeApp({ credential: cert(serviceAccount) });

    if (process.env.FIRESTORE_EMULATOR_HOST) {
        return initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID ?? "demo-stockpulse" });
    }

    throw new Error("Set FIREBASE_SERVICE_ACCOUNT_PATH (or FIREBASE_SERVICE_ACCOUNT) in .env");
};

// Initialised on first use rather than at import, so `next build` works
// without credentials. Cached on `global` so dev hot-reloads reuse it.
export const getDb = (): Firestore => {
    if (!global.firestoreCache) {
        const db = getFirestore(initApp());
        db.settings({ ignoreUndefinedProperties: true });
        global.firestoreCache = db;
    }
    return global.firestoreCache;
};

// Firestore returns Timestamps; the rest of the app works with Dates.
export const toDate = (value: unknown): Date | undefined => {
    if (value instanceof Timestamp) return value.toDate();
    if (value instanceof Date) return value;
    return undefined;
};

export const COLLECTIONS = {
    watchlists: "watchlists",
    alerts: "alerts",
    notifications: "notifications",
} as const;
