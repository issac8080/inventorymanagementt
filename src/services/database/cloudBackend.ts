import { isFirebaseConfigured } from './firebaseEnv';
import { getActiveCloudBackend, isSupabaseConfigured } from './cloudEnv';

/** True when Firebase or Supabase env is present (before device-only override). */
export function isCloudDatabaseConfigured(): boolean {
  return isFirebaseConfigured() || isSupabaseConfigured();
}

export { getActiveCloudBackend } from './cloudEnv';
