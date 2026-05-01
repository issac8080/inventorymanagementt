import { normalizeLoginId, isValidNewLoginId, isReservedLoginId } from './builtinAccounts';
import { getFirebaseConfig } from '../database/firebaseEnv';
import { getSupabaseProjectRef, useSupabaseCloudSync } from '../database/cloudEnv';
import { loginKeyToAuthEmail } from './authEmail';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type AuthEmailBackend = 'firebase' | 'supabase';

export function isValidEmailFormat(s: string): boolean {
  return s.length <= 254 && EMAIL_RE.test(s);
}

export type ContactKind = 'email' | 'phone' | 'username';

export interface ParsedContact {
  kind: ContactKind;
  /** Normalized key stored in Firestore `loginKey` / local `loginId` (email lowercased, phone digits only, username normalized). */
  loginKey: string;
  /** Address passed to Firebase / Supabase email-password auth. */
  authEmail: string;
}

function getProjectIdForSynthetic(): string {
  try {
    return String(getFirebaseConfig().projectId ?? 'app').replace(/[^a-z0-9-]/gi, '');
  } catch {
    return 'local';
  }
}

function syntheticPhoneAuthEmail(digits: string, backend: AuthEmailBackend): string {
  if (backend === 'supabase') {
    const ref = getSupabaseProjectRef();
    return `initra.phone.${digits}@${ref}.initra.local`;
  }
  const pid = getProjectIdForSynthetic();
  return `initra.phone.${digits}@${pid}.firebaseapp.com`;
}

function defaultAuthBackend(): AuthEmailBackend {
  return useSupabaseCloudSync() ? 'supabase' : 'firebase';
}

/**
 * Maps user input to a stable login key and auth email (Firebase or Supabase).
 * - Contains `@` → treat as email (real address).
 * - All digits (10–15) with no letters → phone → synthetic email (distinct from legacy username mapping).
 * - Otherwise → legacy username → synthetic `user@project.firebaseapp.com` style.
 */
export function parseContactForAuth(raw: string, authBackend: AuthEmailBackend = defaultAuthBackend()): ParsedContact {
  const t = raw.trim();
  if (!t) {
    throw new Error('Please enter your email, phone number, or username');
  }

  if (t.includes('@')) {
    const email = t.toLowerCase();
    if (!isValidEmailFormat(email)) {
      throw new Error('Please enter a valid email address');
    }
    return { kind: 'email', loginKey: email, authEmail: email };
  }

  const hasLetter = /[a-zA-Z]/.test(t);
  const digits = t.replace(/\D/g, '');
  if (!hasLetter && digits.length >= 10 && digits.length <= 15) {
    return {
      kind: 'phone',
      loginKey: digits,
      authEmail: syntheticPhoneAuthEmail(digits, authBackend),
    };
  }

  const key = normalizeLoginId(t);
  if (!key) {
    throw new Error('Please enter your email, phone number, or username');
  }
  return {
    kind: 'username',
    loginKey: key,
    authEmail: loginKeyToAuthEmail(key),
  };
}

export function assertValidSignupContact(raw: string): ParsedContact {
  const parsed = parseContactForAuth(raw);  if (parsed.kind === 'email') {
    return parsed;
  }
  if (parsed.kind === 'phone') {
    return parsed;
  }
  if (!isValidNewLoginId(parsed.loginKey)) {
    throw new Error('Username must be 2–32 characters: letters, numbers, . _ -');
  }
  if (isReservedLoginId(parsed.loginKey)) {
    throw new Error('That username is reserved.');
  }
  return parsed;
}

export function isUserNotFoundAuthError(error: unknown): boolean {
  const code =
    typeof error === 'object' && error != null && 'code' in error
      ? String((error as { code: unknown }).code)
      : '';
  const msg =
    typeof error === 'object' && error != null && 'message' in error
      ? String((error as { message: unknown }).message).toLowerCase()
      : '';
  return (
    code === 'auth/user-not-found' ||
    msg.includes('user-not-found') ||
    msg.includes('there is no user record')
  );
}
