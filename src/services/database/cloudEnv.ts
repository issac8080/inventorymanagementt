import { INITRA_FORCE_LOCAL_DB_KEY, isFirebaseConfigured } from './firebaseEnv';

function trimEnv(key: string): string | undefined {
  let v = import.meta.env[key] as string | undefined;
  if (v == null) return undefined;
  v = v.trim();
  if (
    (v.startsWith('"') && v.endsWith('"') && v.length >= 2) ||
    (v.startsWith("'") && v.endsWith("'") && v.length >= 2)
  ) {
    v = v.slice(1, -1).trim();
  }
  return v || undefined;
}

function isSupabaseExplicitlyDisabled(): boolean {
  const v = (import.meta.env.VITE_DISABLE_SUPABASE as string | undefined)?.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

/** Project URL: `VITE_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_URL`. */
export function getSupabaseUrl(): string | undefined {
  return trimEnv('VITE_SUPABASE_URL') ?? trimEnv('NEXT_PUBLIC_SUPABASE_URL');
}

/**
 * API key: `VITE_SUPABASE_ANON_KEY`, or `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
 * or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (Supabase “publishable” key).
 */
export function getSupabaseAnonOrPublishableKey(): string | undefined {
  return (
    trimEnv('VITE_SUPABASE_ANON_KEY') ??
    trimEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY') ??
    trimEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY')
  );
}

/** Supabase project URL + key (see supabase-schema.sql). */
export function isSupabaseConfigured(): boolean {
  if (isSupabaseExplicitlyDisabled()) return false;
  return !!(getSupabaseUrl() && getSupabaseAnonOrPublishableKey());
}

export type CloudBackendKind = 'firebase' | 'supabase';

/**
 * Which cloud stack is active. Set `VITE_CLOUD_BACKEND=supabase` to prefer Supabase when both are configured.
 * If only one is configured, that one is used.
 */
export function getActiveCloudBackend(): CloudBackendKind | null {
  const fb = isFirebaseConfigured();
  const sb = isSupabaseConfigured();
  const prefer = (import.meta.env.VITE_CLOUD_BACKEND as string | undefined)?.trim().toLowerCase();

  if (prefer === 'supabase' && sb) return 'supabase';
  if (prefer === 'firebase' && fb) return 'firebase';
  if (fb && sb) return 'firebase';
  if (fb) return 'firebase';
  if (sb) return 'supabase';
  return null;
}

export function useCloudDatabaseSync(): boolean {
  if (getActiveCloudBackend() === null) return false;
  if (typeof localStorage === 'undefined') return true;
  return localStorage.getItem(INITRA_FORCE_LOCAL_DB_KEY) !== '1';
}

export function useFirebaseCloudSync(): boolean {
  return useCloudDatabaseSync() && getActiveCloudBackend() === 'firebase';
}

export function useSupabaseCloudSync(): boolean {
  return useCloudDatabaseSync() && getActiveCloudBackend() === 'supabase';
}

/** Supabase project ref from `https://xxxx.supabase.co` */
export function getSupabaseProjectRef(): string {
  const u = getSupabaseUrl();
  if (!u) return 'local';
  try {
    const host = new URL(u).hostname;
    const m = host.match(/^([^.]+)\.supabase\.co$/i);
    return m ? m[1] : 'local';
  } catch {
    return 'local';
  }
}
