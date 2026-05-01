import { initializeApp, getApp, getApps, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAuth, type Auth } from 'firebase/auth';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { getAnalytics, isSupported, type Analytics } from 'firebase/analytics';
import { getFirebaseConfig, isFirebaseConfigured } from './firebaseEnv';

let firestore: Firestore | undefined;
let analytics: Analytics | null = null;

const PROVISIONING_APP_NAME = 'InitraProvisioning';

export function getFirebaseApp(): FirebaseApp {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase is not configured');
  }
  const existingDefault = getApps().find((a) => a.name === '[DEFAULT]');
  if (existingDefault) return existingDefault;
  const app = initializeApp(getFirebaseConfig());
  if (typeof window !== 'undefined') {
    void isSupported().then((ok) => {
      if (ok) {
        try {
          analytics = getAnalytics(app);
        } catch {
          analytics = null;
        }
      }
    });
  }
  return app;
}

/** Secondary Firebase app so admins can create Email/Password users without signing out. */
export function getProvisioningFirebaseApp(): FirebaseApp {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase is not configured');
  }
  try {
    return getApp(PROVISIONING_APP_NAME);
  } catch {
    return initializeApp(getFirebaseConfig(), PROVISIONING_APP_NAME);
  }
}

export function getFirebaseAuth(): Auth {
  return getAuth(getFirebaseApp());
}

export function getProvisioningAuth(): Auth {
  return getAuth(getProvisioningFirebaseApp());
}

export function getFirebaseStorage(): FirebaseStorage {
  return getStorage(getFirebaseApp());
}

export function getFirestoreDb(): Firestore {
  if (!firestore) {
    firestore = getFirestore(getFirebaseApp());
  }
  return firestore;
}

export function getFirebaseAnalytics(): Analytics | null {
  return analytics;
}
