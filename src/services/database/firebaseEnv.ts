import type { FirebaseOptions } from 'firebase/app';

function trimEnv(key: string): string | undefined {
  let v = import.meta.env[key] as string | undefined;
  if (v == null) return undefined;
  v = v.trim();
  // Strip common .env wrapping quotes: KEY="value" or KEY='value'
  if (
    (v.startsWith('"') && v.endsWith('"') && v.length >= 2) ||
    (v.startsWith("'") && v.endsWith("'") && v.length >= 2)
  ) {
    v = v.slice(1, -1).trim();
  }
  return v || undefined;
}

/**
 * Set `VITE_DISABLE_FIREBASE=true` to force **local-only** mode (IndexedDB) even if Firebase vars exist.
 */
function isFirebaseExplicitlyDisabled(): boolean {
  const v = (import.meta.env.VITE_DISABLE_FIREBASE as string | undefined)?.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

/**
 * Firebase Firestore is the cloud backend when these are set (see .env.example).
 */
export function isFirebaseConfigured(): boolean {
  if (isFirebaseExplicitlyDisabled()) return false;
  const apiKey = trimEnv('VITE_FIREBASE_API_KEY');
  const projectId = trimEnv('VITE_FIREBASE_PROJECT_ID');
  const appId = trimEnv('VITE_FIREBASE_APP_ID');
  return !!(apiKey && projectId && appId);
}

/** Set when the user chooses “this device only” while Firebase env vars exist. */
export const INITRA_FORCE_LOCAL_DB_KEY = 'initraForceLocalDb';

export function getFirebaseConfig(): FirebaseOptions {
  const apiKey = trimEnv('VITE_FIREBASE_API_KEY');
  const authDomain = trimEnv('VITE_FIREBASE_AUTH_DOMAIN');
  const projectId = trimEnv('VITE_FIREBASE_PROJECT_ID');
  const storageBucket = trimEnv('VITE_FIREBASE_STORAGE_BUCKET');
  const messagingSenderId = trimEnv('VITE_FIREBASE_MESSAGING_SENDER_ID');
  const appId = trimEnv('VITE_FIREBASE_APP_ID');
  const measurementId = trimEnv('VITE_FIREBASE_MEASUREMENT_ID');

  if (!apiKey || !projectId || !appId) {
    throw new Error('Firebase configuration is incomplete');
  }

  return {
    apiKey,
    authDomain: authDomain || `${projectId}.firebaseapp.com`,
    projectId,
    storageBucket: storageBucket || `${projectId}.appspot.com`,
    messagingSenderId: messagingSenderId || '',
    appId,
    ...(measurementId ? { measurementId } : {}),
  };
}
