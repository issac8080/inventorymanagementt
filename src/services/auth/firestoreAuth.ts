import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  setDoc,
  where,
} from 'firebase/firestore';
import { getFirestoreDb, getProvisioningAuth, getFirebaseAuth } from '../database/firebase';
import { assertValidSignupContact, type ParsedContact } from './identifierAuth';

const APP_USERS = 'app_users';

export interface FirestoreAppUser {
  id: string;
  mobile: string;
  password: string;
  username?: string;
  created_at: string;
  isAdmin?: boolean;
}

function mapAppUserDoc(docId: string, data: Record<string, unknown>): FirestoreAppUser {
  const login =
    (data.loginKey as string | undefined) ??
    (data.mobile as string | undefined) ??
    '';
  return {
    id: docId,
    mobile: login,
    password: '',
    username: (data.username as string | undefined) || login,
    created_at: (data.created_at as string) || new Date().toISOString(),
    isAdmin: data.isAdmin === true,
  };
}

export async function firestoreSignupUser(
  loginId: string,
  password: string,
  displayUsername?: string,
  options?: { isAdmin?: boolean; /** When true, create Auth user on the default app so Firestore rules see `request.auth` before `setDoc` (self-service signup). Admins use provisioning app so their session is unchanged. */ createOnDefaultAuth?: boolean }
): Promise<FirestoreAppUser> {
  const parsed: ParsedContact = assertValidSignupContact(loginId);
  const key = parsed.loginKey;
  const db = getFirestoreDb();
  const useDefaultAuth = options?.createOnDefaultAuth === true;
  const auth = useDefaultAuth ? getFirebaseAuth() : getProvisioningAuth();
  const email = parsed.authEmail;

  if (!useDefaultAuth) {
    const existingEmail = await getDocs(
      query(collection(db, APP_USERS), where('loginKey', '==', key), limit(1))
    );
    if (!existingEmail.empty) {
      throw new Error(`This email or phone is already registered.`);
    }

    const legacySnap = await getDocs(
      query(collection(db, APP_USERS), where('mobile', '==', key), limit(1))
    );
    if (!legacySnap.empty) {
      throw new Error(`This email or phone is already registered.`);
    }
  }

  let cred;
  try {
    cred = await createUserWithEmailAndPassword(auth, email, password);
  } finally {
    if (!useDefaultAuth) {
      await signOut(auth).catch(() => {});
    }
  }

  const created_at = new Date().toISOString();
  await setDoc(doc(db, APP_USERS, cred.user.uid), {
    loginKey: key,
    contactKind: parsed.kind,
    username: displayUsername || key,
    created_at,
    isAdmin: options?.isAdmin === true,
  });

  return {
    id: cred.user.uid,
    mobile: key,
    password: '',
    username: displayUsername || key,
    created_at,
    isAdmin: options?.isAdmin === true,
  };
}

export async function firestoreGetAllUsers(): Promise<FirestoreAppUser[]> {
  const db = getFirestoreDb();
  const snap = await getDocs(collection(db, APP_USERS));
  const list = snap.docs.map((d) => mapAppUserDoc(d.id, d.data() as Record<string, unknown>));
  return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function firestoreCreateUser(
  loginId: string,
  password: string,
  displayUsername?: string
): Promise<FirestoreAppUser> {
  return firestoreSignupUser(loginId, password, displayUsername, { isAdmin: false, createOnDefaultAuth: false });
}

export async function firestoreDeleteUser(userId: string): Promise<void> {
  await deleteDoc(doc(getFirestoreDb(), APP_USERS, userId));
}

export async function firestoreGetUserProfile(uid: string): Promise<FirestoreAppUser | null> {
  const d = await getDoc(doc(getFirestoreDb(), APP_USERS, uid));
  if (!d.exists()) return null;
  return mapAppUserDoc(d.id, d.data() as Record<string, unknown>);
}
