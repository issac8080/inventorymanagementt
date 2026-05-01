import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { isFirebaseConfigured, INITRA_FORCE_LOCAL_DB_KEY } from '../database/firebaseEnv';
import { getActiveCloudBackend, isSupabaseConfigured, useCloudDatabaseSync } from '../database/cloudEnv';
import { getFirebaseAuth } from '../database/firebase';
import { getSupabaseBrowserClient } from '../database/supabaseClient';
import * as firestoreAuth from './firestoreAuth';
import * as supabaseAuth from './supabaseAuth';
import { loginKeyToAuthEmail } from './authEmail';
import type { AppUser } from '@/types/appUser';
import {
  BUILTIN_ADMIN_LOGIN,
  BUILTIN_ADMIN_PASSWORD,
  BUILTIN_USER_LOGIN,
  BUILTIN_USER_PASSWORD,
  normalizeLoginId,
} from './builtinAccounts';
import {
  addLocalManagedUser,
  deleteLocalManagedUser,
  findLocalManagedLogin,
  getLocalManagedUsers,
} from './localManagedUsers';
import { assertValidSignupContact, isUserNotFoundAuthError, parseContactForAuth } from './identifierAuth';
import { extractErrorMessage } from '@/utils/errorHandler';
import { getFirestoreUserMessage } from '@/utils/firebaseFirestoreErrors';
import toast from 'react-hot-toast';

export type User = AppUser;

async function firebaseSignInWithLegacyFallback(login: string, password: string) {
  const auth = getFirebaseAuth();
  const parsed = parseContactForAuth(login, 'firebase');
  try {
    return await signInWithEmailAndPassword(auth, parsed.authEmail, password);
  } catch (firstErr) {
    if (!isUserNotFoundAuthError(firstErr)) {
      throw firstErr;
    }
    const legacyEmail = loginKeyToAuthEmail(normalizeLoginId(login.trim()));
    if (legacyEmail !== parsed.authEmail) {
      return await signInWithEmailAndPassword(auth, legacyEmail, password);
    }
    throw firstErr;
  }
}
function authErrorToast(error: unknown, fallback: string): void {
  const firestoreMsg = getFirestoreUserMessage(error);
  if (firestoreMsg) {
    toast.error(firestoreMsg);
    return;
  }
  toast.error(extractErrorMessage(error) || fallback);
}

/** Synthetic user when using the app on this device only (no login). */
export const LOCAL_OFFLINE_USER: User = {
  id: '00000000-0000-4000-8000-000000000001',
  mobile: 'local-device',
  password: '',
  username: 'This device',
  created_at: new Date().toISOString(),
};

const BUILTIN_ADMIN_ROW: User = {
  id: 'builtin-admin',
  mobile: BUILTIN_ADMIN_LOGIN,
  password: '',
  username: 'Administrator (built-in)',
  created_at: new Date(0).toISOString(),
};

const BUILTIN_USER_ROW: User = {
  id: 'builtin-issac',
  mobile: BUILTIN_USER_LOGIN,
  password: '',
  username: 'Issac (built-in)',
  created_at: new Date(0).toISOString(),
};

export const simpleAuth = {
  continueAsLocalDevice(): void {
    if (isFirebaseConfigured()) {
      void signOut(getFirebaseAuth()).catch(() => {});
    }
    if (isSupabaseConfigured()) {
      void getSupabaseBrowserClient()
        .auth.signOut()
        .catch(() => {});
    }
    localStorage.setItem(INITRA_FORCE_LOCAL_DB_KEY, '1');
    this.saveUser(LOCAL_OFFLINE_USER, false);
    toast.success('Using inventory saved on this device.');
  },

  /** Firebase or Supabase session listener (call once from `App`). */
  initCloudAuthSync(onSessionChange: () => void): () => void {
    const backend = getActiveCloudBackend();
    if (backend === 'firebase') {
      return this.initFirebaseAuthSync(onSessionChange);
    }
    if (backend === 'supabase') {
      return supabaseAuth.supabaseInitAuthSync((payload) => {
        if (!payload) {
          const cur = simpleAuth.getCurrentUser();
          if (cur && cur.id !== LOCAL_OFFLINE_USER.id) {
            localStorage.removeItem('currentUser');
            localStorage.removeItem('isAdmin');
          }
        } else {
          localStorage.removeItem(INITRA_FORCE_LOCAL_DB_KEY);
          simpleAuth.saveUser(payload.user, payload.isAdmin);
        }
        onSessionChange();
      });
    }
    return () => {};
  },

  /**
   * Keeps localStorage in sync when Firebase Auth restores a session (page reload).
   */
  initFirebaseAuthSync(onSessionChange: () => void): () => void {
    if (!isFirebaseConfigured()) {
      return () => {};
    }
    const auth = getFirebaseAuth();
    return onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (!firebaseUser) {
          const cur = simpleAuth.getCurrentUser();
          if (cur && cur.id !== LOCAL_OFFLINE_USER.id) {
            localStorage.removeItem('currentUser');
            localStorage.removeItem('isAdmin');
          }
          onSessionChange();
          return;
        }

        const profile = await firestoreAuth.firestoreGetUserProfile(firebaseUser.uid);
        const mobile = profile?.mobile ?? '';
        if (!mobile) {
          await signOut(auth).catch(() => {});
          localStorage.removeItem('currentUser');
          localStorage.removeItem('isAdmin');
          toast.error('Cloud account is missing a profile. Ask an admin to fix app_users in Firebase.');
          onSessionChange();
          return;
        }

        const isAdmin = profile?.isAdmin === true;
        localStorage.removeItem(INITRA_FORCE_LOCAL_DB_KEY);
        simpleAuth.saveUser(
          {
            id: firebaseUser.uid,
            mobile,
            password: '',
            username: profile?.username,
            created_at: profile?.created_at ?? new Date().toISOString(),
            isAdmin,
          },
          isAdmin
        );
        onSessionChange();
      } catch (e) {
        console.error('Firebase auth sync error:', e);
        onSessionChange();
      }
    });
  },

  async login(
    login: string,
    password: string
  ): Promise<{ error: Error | null; user: User | null; isAdmin: boolean }> {
    try {
      if (!login.trim() || !password) {
        throw new Error('Please enter your email or phone and password');
      }

      const lid = normalizeLoginId(login);

      if (!useCloudDatabaseSync()) {
        if (lid === BUILTIN_ADMIN_LOGIN && password === BUILTIN_ADMIN_PASSWORD) {
          const adminUser: User = {
            id: 'admin',
            mobile: BUILTIN_ADMIN_LOGIN,
            password: '',
            username: 'Administrator',
            created_at: new Date().toISOString(),
          };
          toast.success('Signed in as admin');
          return { error: null, user: adminUser, isAdmin: true };
        }

        if (lid === BUILTIN_USER_LOGIN && password === BUILTIN_USER_PASSWORD) {
          const u: User = {
            id: 'user-issac',
            mobile: BUILTIN_USER_LOGIN,
            password: '',
            username: 'Issac',
            created_at: new Date().toISOString(),
          };
          toast.success('Signed in');
          return { error: null, user: u, isAdmin: false };
        }

        const local = findLocalManagedLogin(login, password);
        if (local) {
          toast.success('Signed in');
          return { error: null, user: local, isAdmin: false };
        }

        throw new Error('Invalid email, phone, or password');
      }

      if (getActiveCloudBackend() === 'supabase') {
        const parsed = parseContactForAuth(login);
        const sb = getSupabaseBrowserClient();
        const { data, error } = await sb.auth.signInWithPassword({
          email: parsed.authEmail,
          password,
        });
        if (error) throw error;
        if (!data.user?.id) throw new Error('Sign-in failed');
        const profile = await supabaseAuth.supabaseFetchProfile(data.user.id);
        const mobile = profile?.mobile ?? '';
        if (!profile || !mobile) {
          await sb.auth.signOut().catch(() => {});
          throw new Error('Account is missing a profile row. Run supabase-schema.sql in your Supabase project.');
        }
        const isAdmin = profile.isAdmin === true;
        localStorage.removeItem(INITRA_FORCE_LOCAL_DB_KEY);
        const user: User = {
          id: data.user.id,
          mobile,
          password: '',
          username: profile.username,
          created_at: profile.created_at,
          isAdmin,
        };
        toast.success(isAdmin ? 'Signed in as admin' : 'Signed in');
        return { error: null, user, isAdmin };
      }

      const cred = await firebaseSignInWithLegacyFallback(login, password);
      const profile = await firestoreAuth.firestoreGetUserProfile(cred.user.uid);
      const mobile = profile?.mobile ?? '';
      if (!profile || !mobile) {
        await signOut(getFirebaseAuth()).catch(() => {});
        throw new Error(
          'Account exists but has no profile document. An admin must create app_users/{yourUid} in Firestore.'
        );
      }

      const isAdmin = profile.isAdmin === true;
      localStorage.removeItem(INITRA_FORCE_LOCAL_DB_KEY);
      const user: User = {
        id: cred.user.uid,
        mobile,
        password: '',
        username: profile.username,
        created_at: profile.created_at,
        isAdmin,
      };
      toast.success(isAdmin ? 'Signed in as admin' : 'Signed in');
      return { error: null, user, isAdmin };
    } catch (error: unknown) {
      console.error('Login error:', error);
      authErrorToast(error, 'Invalid email, phone, or password.');
      return { error: error as Error, user: null, isAdmin: false };
    }
  },

  async signup(
    login: string,
    password: string,
    confirmPassword: string,
    displayName?: string
  ): Promise<{ error: Error | null; user: User | null; isAdmin: boolean }> {
    try {
      if (!login.trim()) {
        throw new Error('Please enter your email or phone number');
      }
      if (!password) {
        throw new Error('Please choose a password');
      }
      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }
      if (password !== confirmPassword) {
        throw new Error('Passwords do not match');
      }

      const label = (displayName ?? '').trim();

      if (!useCloudDatabaseSync()) {
        const user = addLocalManagedUser(login, password, label);
        toast.success('Account created — you are signed in');
        return { error: null, user, isAdmin: false };
      }

      if (getActiveCloudBackend() === 'supabase') {
        const parsed = assertValidSignupContact(login);
        const sb = getSupabaseBrowserClient();
        const { data, error } = await sb.auth.signUp({
          email: parsed.authEmail,
          password,
          options: {
            data: {
              login_key: parsed.loginKey,
              username: label || parsed.loginKey,
            },
          },
        });
        if (error) throw error;
        if (!data.session?.user) {
          throw new Error(
            'Confirm your email if Supabase requires it (Authentication → Providers → Email), or disable “Confirm email”.'
          );
        }
        const profile = await supabaseAuth.supabaseFetchProfile(data.session.user.id);
        const mobile = profile?.mobile ?? '';
        if (!profile || !mobile) {
          await sb.auth.signOut().catch(() => {});
          throw new Error('Profile was not created. Add the SQL trigger from supabase-schema.sql in Supabase.');
        }
        const isAdmin = profile.isAdmin === true;
        localStorage.removeItem(INITRA_FORCE_LOCAL_DB_KEY);
        const user: User = {
          id: data.session.user.id,
          mobile,
          password: '',
          username: profile.username,
          created_at: profile.created_at,
          isAdmin,
        };
        toast.success('Account created — you are signed in');
        return { error: null, user, isAdmin };
      }

      await firestoreAuth.firestoreSignupUser(login, password, label || undefined, {
        isAdmin: false,
        createOnDefaultAuth: true,
      });
      const auth = getFirebaseAuth();
      const cred = auth.currentUser;
      if (!cred) {
        throw new Error('Could not establish session after sign-up. Try signing in.');
      }
      const profile = await firestoreAuth.firestoreGetUserProfile(cred.user.uid);
      const mobile = profile?.mobile ?? '';
      if (!profile || !mobile) {
        await signOut(getFirebaseAuth()).catch(() => {});
        throw new Error('Account was created but profile is missing. Contact an administrator.');
      }
      const isAdmin = profile.isAdmin === true;
      localStorage.removeItem(INITRA_FORCE_LOCAL_DB_KEY);
      const user: User = {
        id: cred.user.uid,
        mobile,
        password: '',
        username: profile.username,
        created_at: profile.created_at,
        isAdmin,
      };
      toast.success('Account created — you are signed in');
      return { error: null, user, isAdmin };
    } catch (error: unknown) {
      console.error('Signup error:', error);
      authErrorToast(error, 'Could not create account.');
      return { error: error as Error, user: null, isAdmin: false };
    }
  },
  async getAllUsers(): Promise<User[]> {
    try {
      if (!this.isCurrentUserAdmin()) {
        throw new Error('Unauthorized: Admin access required');
      }

      if (!useCloudDatabaseSync()) {
        return [BUILTIN_ADMIN_ROW, BUILTIN_USER_ROW, ...getLocalManagedUsers()];
      }

      if (getActiveCloudBackend() === 'supabase') {
        try {
          return await supabaseAuth.supabaseListProfiles();
        } catch (err) {
          console.error('getAllUsers supabase:', err);
          authErrorToast(err, 'Could not load users from Supabase');
          return [];
        }
      }

      const out: User[] = [];
      try {
        const fs = await firestoreAuth.firestoreGetAllUsers();
        const seen = new Set(out.map((u) => u.mobile));
        for (const row of fs) {
          if (!seen.has(row.mobile)) {
            seen.add(row.mobile);
            out.push({
              id: row.id,
              mobile: row.mobile,
              password: '',
              username: row.username,
              created_at: row.created_at,
              isAdmin: row.isAdmin,
            });
          }
        }
      } catch (err) {
        console.error('getAllUsers firestore:', err);
        authErrorToast(err, 'Could not load users from cloud');
      }

      return out;
    } catch (error: unknown) {
      console.error('Get all users error:', error);
      if (
        error instanceof Error &&
        error.message &&
        !error.message.includes('Unauthorized')
      ) {
        authErrorToast(error, 'Failed to load users');
      }
      return [];
    }
  },

  logout(): void {
    if (isFirebaseConfigured()) {
      void signOut(getFirebaseAuth()).catch(() => {});
    }
    if (isSupabaseConfigured()) {
      void getSupabaseBrowserClient()
        .auth.signOut()
        .catch(() => {});
    }
    localStorage.removeItem('currentUser');
    localStorage.removeItem('isAdmin');
    toast.success('Signed out');
  },

  getCurrentUser(): User | null {
    const userStr = localStorage.getItem('currentUser');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr) as User;
    } catch {
      return null;
    }
  },

  isCurrentUserAdmin(): boolean {
    return localStorage.getItem('isAdmin') === 'true';
  },

  saveUser(user: User, isAdmin: boolean = false): void {
    localStorage.setItem('currentUser', JSON.stringify(user));
    localStorage.setItem('isAdmin', isAdmin.toString());
  },

  async createUser(
    loginId: string,
    password: string,
    displayUsername?: string
  ): Promise<{ error: Error | null; user: User | null }> {
    try {
      if (!this.isCurrentUserAdmin()) {
        throw new Error('Unauthorized: Admin access required');
      }

      assertValidSignupContact(loginId);

      if (!password) {
        throw new Error('Password is required');
      }
      if (useCloudDatabaseSync()) {
        if (password.length < 6) {
          throw new Error('Cloud accounts require a password of at least 6 characters.');
        }
      } else if (password.length < 3) {
        throw new Error('Password must be at least 3 characters');
      }

      if (getActiveCloudBackend() === 'supabase') {
        throw new Error(
          'Supabase: create users in the Dashboard → Authentication → Users, then add matching rows in public.profiles (see supabase-schema.sql).'
        );
      }

      if (getActiveCloudBackend() === 'firebase') {
        try {
          const created = await firestoreAuth.firestoreCreateUser(
            loginId.trim(),
            password,
            displayUsername?.trim() || undefined
          );
          toast.success('User created — share their email or phone and password');
          const user: User = {
            id: created.id,
            mobile: created.mobile,
            password: '',
            username: created.username,
            created_at: created.created_at,
            isAdmin: created.isAdmin,
          };
          return { error: null, user };
        } catch (err: unknown) {
          if (
            err instanceof Error &&
            (err.message.includes('already') || err.message.includes('registered'))
          ) {
            throw new Error(err.message);
          }
          throw err;
        }
      }

      const user = addLocalManagedUser(
        loginId.trim(),
        password,
        displayUsername?.trim() || ''
      );
      toast.success('User saved in this browser — share their sign-in details');
      return { error: null, user };
    } catch (error: unknown) {
      console.error('Create user error:', error);
      authErrorToast(error, 'Failed to create user');
      return { error: error as Error, user: null };
    }
  },
  async deleteUser(userId: string): Promise<{ error: Error | null; success: boolean }> {
    try {
      if (!this.isCurrentUserAdmin()) {
        throw new Error('Unauthorized: Admin access required');
      }

      if (!userId) {
        throw new Error('User ID is required');
      }

      if (userId === 'builtin-admin' || userId === 'builtin-issac' || userId === 'admin' || userId === 'user-issac') {
        throw new Error('Cannot delete built-in accounts');
      }

      const localRows = getLocalManagedUsers();
      if (localRows.some((u) => u.id === userId)) {
        deleteLocalManagedUser(userId);
        toast.success('User removed');
        return { error: null, success: true };
      }

      if (!useCloudDatabaseSync()) {
        throw new Error('User not found or only stored in cloud');
      }

      if (getActiveCloudBackend() === 'supabase') {
        await supabaseAuth.supabaseDeleteProfileRow(userId);
        toast.success('Profile removed. Delete the user under Supabase → Authentication if they should lose sign-in.');
        return { error: null, success: true };
      }

      await firestoreAuth.firestoreDeleteUser(userId);
      toast.success('User removed from directory. Delete the sign-in from Firebase Authentication if needed.');
      return { error: null, success: true };
    } catch (error: unknown) {
      console.error('Delete user error:', error);
      authErrorToast(error, 'Failed to delete user');
      return { error: error as Error, success: false };
    }
  },
};
