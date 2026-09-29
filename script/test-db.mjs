import { readFileSync } from 'fs';
import path from 'path';
import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Checks that the Firebase service account works and Firestore is reachable
// by writing, reading and deleting one throwaway document.
async function main() {
    const inline = process.env.FIREBASE_SERVICE_ACCOUNT;
    const keyPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    const emulator = process.env.FIRESTORE_EMULATOR_HOST;

    let app;
    let label;
    if (inline || keyPath) {
        const account = JSON.parse(inline ?? readFileSync(path.resolve(keyPath), 'utf8'));
        app = initializeApp({ credential: cert(account) });
        label = `project="${account.project_id}"`;
    } else if (emulator) {
        app = initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID ?? 'demo-stockpulse' });
        label = `emulator=${emulator}`;
    } else {
        console.error('ERROR: set FIREBASE_SERVICE_ACCOUNT_PATH (or FIREBASE_SERVICE_ACCOUNT) in .env');
        process.exit(1);
    }

    try {
        const startedAt = Date.now();
        const ref = getFirestore(app).collection('_healthcheck').doc('ping');
        await ref.set({ at: new Date() });
        await ref.get();
        await ref.delete();

        console.log(`OK: Connected to Firestore [${label}, time=${Date.now() - startedAt}ms]`);
        process.exit(0);
    } catch (err) {
        console.error('ERROR: Firestore connection failed');
        console.error(err);
        process.exit(1);
    }
}

main();
